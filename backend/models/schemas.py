# Pydantic models for request/response data
# these make sure the data is the right shape (lowkey pydantic is goated fr fr)
# ngl this took me way too long to understand

from pydantic import BaseModel
from typing import Optional


class MachineOut(BaseModel):
    """what a machine looks like when we send it back - like an ID card for printers"""

    id: int
    name: str
    machine_type: str
    status: str
    created_at: str


class JobCreate(BaseModel):
    """what the frontend sends when starting a new print job"""

    machine_id: int
    job_name: str
    material: Optional[str] = None  # idk maybe they dont wanna specify lol
    estimated_duration: Optional[int] = None  # in minutes (always wrong tbh)


class JobOut(BaseModel):
    """what a job looks like when we send it back - has all the deets"""

    id: int
    machine_id: int
    job_name: str
    material: Optional[str]
    estimated_duration: Optional[int]
    status: str
    created_at: str
    completed_at: Optional[str]  # null if its still running (like my thought process)


# this is what the frontend sends when it wants us to check an image
class FrameAnalysis(BaseModel):
    """the AI is gonna analyze this bad boy - fingers crossed lol"""

    job_id: int
    image: str  # base64 encoded image from the camera (very long string btw)


class FrameOut(BaseModel):
    """this is what the AI sends back btw - the result of its brain power"""

    id: int
    job_id: int
    status: str
    confidence: Optional[float]  # how sure the AI is (0 = "idk lol", 1 = "yeet")
    observation: Optional[str]  # what the AI saw in the pic
    probable_cause: Optional[str]  # why it thinks somethin is wrong
    recommended_action: Optional[str]  # what u should do (probably "stop the printer")
    severity: Optional[str]  # low, medium, high (like hot sauce levels)
    created_at: str


class IncidentOut(BaseModel):
    """when stuff breaks, we make one of these - the postmortem b4 the postmortem"""

    id: int
    job_id: int
    title: str
    description: Optional[str]
    root_cause: Optional[str]
    severity: Optional[str]
    resolved: int  # 0 = still broken, 1 = we pretend its fine lol
    created_at: str
