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
