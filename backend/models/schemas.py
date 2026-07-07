# Pydantic models for request/response data
# these make sure the data is the right shape

from pydantic import BaseModel
from typing import Optional


class MachineOut(BaseModel):
    id: int
    name: str
    machine_type: str
    status: str
    created_at: str


class JobCreate(BaseModel):
    machine_id: int
    job_name: str
    material: Optional[str] = None
    estimated_duration: Optional[int] = None  # in minutes


class JobOut(BaseModel):
    id: int
    machine_id: int
    job_name: str
    material: Optional[str]
    estimated_duration: Optional[int]
    status: str
    created_at: str
    completed_at: Optional[str]


# this is what the frontend sends when it wants us to check an image
class FrameAnalysis(BaseModel):
    job_id: int
    image: str  # base64 encoded image from the camera


class FrameOut(BaseModel):
    id: int
    job_id: int
    status: str
    confidence: Optional[float]
    observation: Optional[str]
    probable_cause: Optional[str]
    recommended_action: Optional[str]
    severity: Optional[str]
    created_at: str


class IncidentOut(BaseModel):
    id: int
    job_id: int
    title: str
    description: Optional[str]
    root_cause: Optional[str]
    severity: Optional[str]
    resolved: int
    created_at: str
