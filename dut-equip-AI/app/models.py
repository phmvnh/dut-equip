"""SQLAlchemy ORM mappings.

5 entity từ schema backend Spring Boot — chỉ đọc (không INSERT/UPDATE).
AiPrediction là bảng do AI service tạo và quản lý — read/write.
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, BigInteger, SmallInteger, String, Text, DateTime, Date,
    Boolean, ForeignKey, JSON, Enum, Numeric,
)
from sqlalchemy.orm import relationship

from app.db import Base


class Building(Base):
    __tablename__ = "buildings"
    id = Column(BigInteger, primary_key=True)
    name = Column(String(50), nullable=False)
    environment_stability = Column(String(20), nullable=False)


class EquipType(Base):
    __tablename__ = "equip_types"
    id = Column(BigInteger, primary_key=True)
    name = Column(String(100), nullable=False)


class Equipment(Base):
    __tablename__ = "equipments"
    id = Column(BigInteger, primary_key=True)
    code = Column(String(50), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    equip_type_id = Column(BigInteger, ForeignKey("equip_types.id"))
    building_id = Column(BigInteger, ForeignKey("buildings.id"))
    status = Column(String(20))
    specifications = Column(Text)
    description = Column(Text)
    purchase_price = Column(Numeric(15, 2))
    warranty_until = Column(Date)
    hidden = Column(Boolean, default=False)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

    equip_type = relationship("EquipType", lazy="joined")
    building = relationship("Building", lazy="joined")


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"
    id = Column(BigInteger, primary_key=True)
    code = Column(String(6))
    equipment_id = Column(BigInteger, ForeignKey("equipments.id"))
    technician_name = Column(String(255))
    start_date = Column(Date)
    end_date = Column(Date)
    description = Column(Text)
    cost = Column(Numeric(15, 2))
    status = Column(String(20))
    created_at = Column(DateTime)
    updated_at = Column(DateTime)


class BorrowRequest(Base):
    __tablename__ = "borrow_requests"
    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger)
    equipment_id = Column(BigInteger, ForeignKey("equipments.id"))
    borrow_date_time = Column(DateTime)
    return_date_time = Column(DateTime)
    actual_return_date_time = Column(DateTime)
    status = Column(String(20))
    damage_reported = Column(Boolean, default=False)
    damage_severity = Column(String(20))
    damage_reported_at = Column(DateTime)  # dùng để gắn nhãn thực tế (Phần 3)
    created_at = Column(DateTime)


class AiPrediction(Base):
    __tablename__ = "ai_predictions"
    equipment_id = Column(BigInteger, ForeignKey("equipments.id"), primary_key=True)
    risk_level = Column(Enum("HIGH", "MEDIUM", "LOW", name="risk_level"), nullable=False)
    risk_score = Column(SmallInteger, nullable=False)
    days_to_maintenance = Column(SmallInteger)
    will_fail_in_7d = Column(Boolean, default=False, nullable=False)
    reason = Column(Text, nullable=False)
    weather_snapshot = Column(JSON, nullable=False)
    context_snapshot = Column(JSON, nullable=False)
    generated_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class AiPredictionHistory(Base):
    """Lịch sử append-only: mỗi lần sinh dự đoán MỚI (luật-LOW hoặc LLM) là 1 dòng.
    Giữ provenance + snapshot để truy vết và gắn nhãn thực tế về sau."""
    __tablename__ = "ai_prediction_history"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    run_id = Column(String(32), nullable=False, index=True)
    equipment_id = Column(BigInteger, nullable=False, index=True)
    generated_at = Column(DateTime, nullable=False)

    risk_level = Column(String(10), nullable=False)
    risk_score = Column(SmallInteger, nullable=False)
    days_to_maintenance = Column(SmallInteger)
    will_fail_in_7d = Column(Boolean, nullable=False, default=False)
    reason = Column(Text)

    # provenance
    source = Column(String(16), nullable=False)        # RULE_LOW | LLM
    model_used = Column(String(40))                    # gemini-2.5-flash / -lite (NULL nếu RULE_LOW)
    prompt_version = Column(String(20))
    code_version = Column(String(20))
    temperature = Column(Numeric(3, 2))

    weather_snapshot = Column(JSON)
    context_snapshot = Column(JSON)

    # nhãn thực tế (điền sau bởi labeler — Phần 3)
    outcome_label = Column(SmallInteger)               # 1 = có sự kiện bảo trì/hỏng, 0 = không
    outcome_event_type = Column(String(32))            # MAINTENANCE | DAMAGE_REPORT | NONE
    outcome_observed_at = Column(DateTime)
    labeled_at = Column(DateTime)


class AiJob(Base):
    """Trạng thái mỗi lượt phân tích — để theo dõi, retry/resume, cảnh báo."""
    __tablename__ = "ai_jobs"
    run_id = Column(String(32), primary_key=True)
    started_at = Column(DateTime, nullable=False)
    finished_at = Column(DateTime)
    status = Column(String(12), nullable=False)        # RUNNING | DONE | PARTIAL | FAILED
    trigger_source = Column(String(12))                # MANUAL | CRON
    full_sweep = Column(Boolean, default=False)
    n_total = Column(Integer, default=0)
    n_llm = Column(Integer, default=0)
    n_llm_calls = Column(Integer, default=0)
    n_rule_low = Column(Integer, default=0)
    n_skipped = Column(Integer, default=0)
    n_failed = Column(Integer, default=0)
    n_chunks = Column(Integer, default=0)
    n_chunks_failed = Column(Integer, default=0)
    error_rate = Column(Numeric(4, 3), default=0)
    error_message = Column(Text)
