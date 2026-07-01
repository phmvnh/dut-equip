"""Thời tiết Đà Nẵng cho AI, cache 1 giờ.

Gộp 3 nguồn:
- OpenWeather: thời tiết hiện tại + dự báo 7 ngày tới + mật độ bụi (Air Pollution).
- Open-Meteo (free, không cần key): lịch sử 7 ngày & 30 ngày qua.
Mỗi nguồn lỗi độc lập — hỏng 1 nguồn vẫn trả phần còn lại.
"""
from datetime import datetime, timedelta
import httpx
import logging

from app.config import settings

log = logging.getLogger(__name__)

_cache: dict = {"data": None, "expires_at": datetime.min}

_EMPTY_PERIOD = {"temp_avg": None, "humidity_avg": None, "rain_total_mm": None}


def _summarize_forecast(items: list[dict]) -> dict:
    # OpenWeather forecast trả về mốc mỗi 3 giờ → 56 mốc = 56×3 = 168 giờ = 7 ngày.
    next_7d = items[:56]
    if not next_7d:
        return {**_EMPTY_PERIOD, "condition_summary": "unknown"}

    temps = [it["main"]["temp"] for it in next_7d if "main" in it]
    hums = [it["main"]["humidity"] for it in next_7d if "main" in it]
    rains = [it.get("rain", {}).get("3h", 0) for it in next_7d]
    conditions = [it["weather"][0]["main"] for it in next_7d if it.get("weather")]
    most_common = max(set(conditions), key=conditions.count) if conditions else "unknown"

    return {
        "temp_avg": round(sum(temps) / len(temps), 1) if temps else None,
        "humidity_avg": round(sum(hums) / len(hums), 1) if hums else None,
        "rain_total_mm": round(sum(rains), 1),
        "condition_summary": most_common,
    }


def _fetch_openweather() -> dict:
    """Hiện tại + dự báo 7 ngày tới từ OpenWeather."""
    if not settings.OPENWEATHER_API_KEY:
        log.warning("OPENWEATHER_API_KEY trống — bỏ qua forecast/current")
        return {"forecast_7d": {**_EMPTY_PERIOD, "condition_summary": "unknown"}, "current": {}}

    with httpx.Client(timeout=10) as client:
        current_r = client.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"q": settings.OPENWEATHER_CITY, "units": "metric", "appid": settings.OPENWEATHER_API_KEY},
        )
        current_r.raise_for_status()
        current = current_r.json()

        forecast_r = client.get(
            "https://api.openweathermap.org/data/2.5/forecast",
            params={"q": settings.OPENWEATHER_CITY, "units": "metric", "appid": settings.OPENWEATHER_API_KEY},
        )
        forecast_r.raise_for_status()
        forecast = forecast_r.json()

    return {
        "forecast_7d": _summarize_forecast(forecast.get("list", [])),
        "current": {
            "temp": current.get("main", {}).get("temp"),
            "humidity": current.get("main", {}).get("humidity"),
            "condition": (current.get("weather") or [{}])[0].get("main", "unknown"),
        },
    }


_AQI_LABEL = {1: "Tốt", 2: "Khá", 3: "Trung bình", 4: "Kém", 5: "Rất kém"}


def _fetch_openweather_dust() -> dict:
    """Mật độ bụi hiện tại từ OpenWeather Air Pollution API."""
    if not settings.OPENWEATHER_API_KEY:
        return {"dust": {"pm2_5": None, "pm10": None, "aqi": None, "aqi_label": "unknown"}}

    with httpx.Client(timeout=10) as client:
        r = client.get(
            "https://api.openweathermap.org/data/2.5/air_pollution",
            params={"lat": settings.WEATHER_LAT, "lon": settings.WEATHER_LON, "appid": settings.OPENWEATHER_API_KEY},
        )
        r.raise_for_status()
        item = (r.json().get("list") or [{}])[0]

    comp = item.get("components", {})
    aqi = item.get("main", {}).get("aqi")
    return {"dust": {
        "pm2_5": comp.get("pm2_5"),
        "pm10": comp.get("pm10"),
        "aqi": aqi,
        "aqi_label": _AQI_LABEL.get(aqi, "unknown"),
    }}


def _agg_avg(values: list, hours: int) -> float | None:
    # Lấy `hours` phần tử cuối (mới nhất) vì Open-Meteo trả theo thứ tự thời gian tăng dần.
    sub = [v for v in values[-hours:] if v is not None]
    return round(sum(sub) / len(sub), 1) if sub else None


def _agg_sum(values: list, hours: int) -> float | None:
    sub = [v for v in values[-hours:] if v is not None]
    return round(sum(sub), 1) if sub else None


def _fetch_openmeteo_history() -> dict:
    """Lịch sử 7 & 30 ngày qua từ Open-Meteo (1 call, giờ-theo-giờ)."""
    with httpx.Client(timeout=15) as client:
        r = client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": settings.WEATHER_LAT,
                "longitude": settings.WEATHER_LON,
                "hourly": "temperature_2m,relative_humidity_2m,precipitation",
                "past_days": 30,
                "forecast_days": 1,
                "timezone": "Asia/Ho_Chi_Minh",
            },
        )
        r.raise_for_status()
        hourly = r.json().get("hourly", {})

    temps = hourly.get("temperature_2m", [])
    hums = hourly.get("relative_humidity_2m", [])
    rains = hourly.get("precipitation", [])

    return {
        "past_7d": {
            "temp_avg": _agg_avg(temps, 168),
            "humidity_avg": _agg_avg(hums, 168),
            "rain_total_mm": _agg_sum(rains, 168),
        },
        "past_30d": {
            "temp_avg": _agg_avg(temps, 720),
            "humidity_avg": _agg_avg(hums, 720),
            "rain_total_mm": _agg_sum(rains, 720),
        },
    }


_hourly_cache: dict = {"data": None, "expires_at": datetime.min}


def get_hourly_series() -> dict:
    """Chuỗi thời tiết THEO GIỜ của Đà Nẵng (~90 ngày gần nhất) để tính
    'phơi nhiễm môi trường khi sử dụng' — ghép từng lượt mượn với thời tiết tại
    đúng giờ mượn. Trả dict: {"times": [datetime...], "humidity": [...],
    "temp": [...], "precip": [...]}. Cache 1 giờ. Lỗi → trả chuỗi rỗng."""
    global _hourly_cache
    now = datetime.utcnow()
    if _hourly_cache["data"] is not None and now < _hourly_cache["expires_at"]:
        return _hourly_cache["data"]

    empty = {"times": [], "humidity": [], "temp": [], "precip": []}
    try:
        with httpx.Client(timeout=15) as client:
            r = client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": settings.WEATHER_LAT,
                    "longitude": settings.WEATHER_LON,
                    "hourly": "temperature_2m,relative_humidity_2m,precipitation",
                    # 90 ngày khớp với AI_HISTORY_DAYS tối đa của data_collector
                    # để luôn có dữ liệu giờ cho mọi lượt mượn trong cửa sổ thống kê.
                    "past_days": 90,
                    "forecast_days": 1,
                    "timezone": "Asia/Ho_Chi_Minh",
                },
            )
            r.raise_for_status()
            hourly = r.json().get("hourly", {})

        raw_times = hourly.get("time", []) or []
        times: list[datetime] = []
        for t in raw_times:
            try:
                times.append(datetime.fromisoformat(t))
            except (ValueError, TypeError):
                times.append(None)

        data = {
            "times": times,
            "humidity": hourly.get("relative_humidity_2m", []) or [],
            "temp": hourly.get("temperature_2m", []) or [],
            "precip": hourly.get("precipitation", []) or [],
        }
    except Exception as e:
        log.error("Open-Meteo hourly series lỗi: %s — bỏ qua phơi nhiễm theo giờ", e)
        data = empty

    _hourly_cache = {"data": data, "expires_at": now + timedelta(hours=1)}
    return data


def get_danang_weather() -> dict:
    global _cache
    now = datetime.utcnow()
    if _cache["data"] is not None and now < _cache["expires_at"]:
        return _cache["data"]

    result: dict = {
        "forecast_7d": {**_EMPTY_PERIOD, "condition_summary": "unknown"},
        "current": {},
        "past_7d": dict(_EMPTY_PERIOD),
        "past_30d": dict(_EMPTY_PERIOD),
        "dust": {"pm2_5": None, "pm10": None, "aqi": None, "aqi_label": "unknown"},
    }

    for name, fetch, keys in (
        ("OpenWeather forecast", _fetch_openweather, ("forecast_7d", "current")),
        ("OpenWeather dust", _fetch_openweather_dust, ("dust",)),
        ("Open-Meteo history", _fetch_openmeteo_history, ("past_7d", "past_30d")),
    ):
        try:
            part = fetch()
            for k in keys:
                if k in part:
                    result[k] = part[k]
        except Exception as e:
            log.error("%s lỗi: %s — giữ giá trị rỗng cho phần này", name, e)

    _cache = {"data": result, "expires_at": now + timedelta(hours=1)}
    return result
