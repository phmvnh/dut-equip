from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "qltbc_draft"
    DB_USER: str = "root"
    DB_PASSWORD: str = ""

    GEMINI_API_KEY: str = ""
    # Model ưu tiên; khi hết quota (429) sẽ tự chuyển sang model dự phòng kế tiếp.
    GEMINI_MODEL: str = "gemini-2.5-flash"
    # Danh sách model dự phòng, phân tách bằng dấu phẩy, dùng theo thứ tự khi model trên cạn quota.
    GEMINI_FALLBACK_MODELS: str = "gemini-2.5-flash-lite"
    # Giới hạn request/phút free tier. Đặt thấp hơn ngưỡng để có biên an toàn.
    GEMINI_RPM: int = 14

    OPENWEATHER_API_KEY: str = ""
    OPENWEATHER_CITY: str = "Da Nang,VN"
    # Toạ độ Đà Nẵng — dùng cho OpenWeather Air Pollution (bụi) và Open-Meteo (lịch sử)
    WEATHER_LAT: float = 16.0544
    WEATHER_LON: float = 108.2022

    AI_SERVICE_HOST: str = "0.0.0.0"
    AI_SERVICE_PORT: int = 8000
    AI_CRON_HOUR: int = 7
    AI_HISTORY_DAYS: int = 90

    ALLOWED_ORIGINS: str = "http://localhost:8080"

    @property
    def db_url(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
        )

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def gemini_models(self) -> list[str]:
        """Model ưu tiên + dự phòng, đã loại trùng và giữ thứ tự."""
        names = [self.GEMINI_MODEL.strip()]
        names += [m.strip() for m in self.GEMINI_FALLBACK_MODELS.split(",")]
        seen: set[str] = set()
        ordered: list[str] = []
        for n in names:
            if n and n not in seen:
                seen.add(n)
                ordered.append(n)
        return ordered


settings = Settings()
