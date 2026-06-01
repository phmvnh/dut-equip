from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PredictionItem(BaseModel):
    equipment_id: int
    equipment_code: str
    equipment_name: str
    equip_type_name: str
    building_name: str
    risk_level: str
    risk_score: int
    days_to_maintenance: Optional[int] = None
    will_fail_in_7d: bool
    reason: str
    last_maintenance_text: str
    generated_at: datetime


class RunResponse(BaseModel):
    status: str
    message: str


class HealthResponse(BaseModel):
    status: str
