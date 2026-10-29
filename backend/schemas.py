from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# ------------------------------------------------------------------------------
# Auth Schemas
# ------------------------------------------------------------------------------
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=2)
    role: str = Field(default="CITIZEN", pattern="^(CITIZEN|STAFF|ADMIN)$")
    department_id: Optional[int] = None
    phone: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserProfile(BaseModel):
    user_id: int
    email: str
    full_name: str
    role: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    phone: Optional[str] = None

# ------------------------------------------------------------------------------
# Citizen Report Schemas
# ------------------------------------------------------------------------------
class ReportCreate(BaseModel):
    category: str = Field(pattern="^(POTHOLE|STREETLIGHT|FOOTPATH|DRAINAGE|WATER_LEAK|TRAFFIC_SIGNAL)$")
    severity: str = Field(pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    description: str = Field(min_length=10)
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    address_text: str = Field(min_length=3)
    photo_url: Optional[str] = None
    asset_id: Optional[int] = None

class ReportResponse(BaseModel):
    report_id: int
    tracking_code: str
    user_id: int
    case_id: int
    category: str
    severity: str
    description: str
    photo_url: Optional[str]
    latitude: float
    longitude: float
    address_text: str
    status: str
    upvotes_count: int
    created_at: datetime
    citizen_name: Optional[str] = None
    case_number: Optional[str] = None

# ------------------------------------------------------------------------------
# Repair Case Schemas
# ------------------------------------------------------------------------------
class CaseAssign(BaseModel):
    department_id: int
    notes: Optional[str] = None

class CaseStatusUpdate(BaseModel):
    status: str = Field(pattern="^(OPEN|ASSIGNED|IN_PROGRESS|REPAIR_COMPLETED|VERIFIED_CLOSED|REOPENED)$")
    notes: Optional[str] = None

class DuplicateMergeRequest(BaseModel):
    secondary_case_id: int
    notes: Optional[str] = None

class DuplicateCandidate(BaseModel):
    case_id: int
    case_number: str
    title: str
    category: str
    severity: str
    status: str
    latitude: float
    longitude: float
    distance_meters: float
    text_similarity_score: float
    duplicate_confidence_pct: float
    reasons: List[str]

# ------------------------------------------------------------------------------
# Work Order Schemas
# ------------------------------------------------------------------------------
class WorkOrderCreate(BaseModel):
    case_id: int
    department_id: int
    assigned_team_leader: str
    contractor_name: Optional[str] = None
    estimated_cost: float = Field(ge=0.0)
    target_completion_date: datetime
    materials_used: Optional[str] = None
    work_notes: Optional[str] = None

class WorkOrderUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(SCHEDULED|CREW_DISPATCHED|IN_PROGRESS|WORK_COMPLETED|CANCELLED)$")
    actual_cost: Optional[float] = Field(None, ge=0.0)
    materials_used: Optional[str] = None
    work_notes: Optional[str] = None

# ------------------------------------------------------------------------------
# Inspection Schemas
# ------------------------------------------------------------------------------
class InspectionCreate(BaseModel):
    case_id: int
    work_order_id: int
    before_photo_url: str
    after_photo_url: Optional[str] = None
    quality_rating: int = Field(ge=1, le=5)
    durability_assessment: str = Field(pattern="^(POOR|SATISFACTORY|GOOD|EXCELLENT)$")
    inspection_notes: str
    passed_verification: bool

class CaseClosureApproval(BaseModel):
    approved: bool
    review_notes: str

# ------------------------------------------------------------------------------
# Benchmark Schemas
# ------------------------------------------------------------------------------
class BenchmarkRequest(BaseModel):
    query_type: str = Field(default="CATEGORY_STATUS", pattern="^(CATEGORY_STATUS|ASSET_HISTORY|COST_AGGREGATION)$")
    limit: int = Field(default=500, ge=10, le=5000)
