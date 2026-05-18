from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime

# ----------------- COMMON MODELS -----------------

class Timestamps(BaseModel):
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    lastUpdated: Optional[str] = None

# ----------------- DOCTOR MODELS -----------------

class DoctorPersonalInfo(BaseModel):
    name: str
    age: int
    gender: str

class DoctorProfessionalInfo(BaseModel):
    field: str
    experienceYears: int

class DoctorStatus(BaseModel):
    availability: str  # e.g., "On Duty", "Off Duty", "On Call"

class DoctorBase(BaseModel):
    personalInfo: DoctorPersonalInfo
    professionalInfo: DoctorProfessionalInfo
    status: DoctorStatus
    assignedPatients: List[str] = []
    username: Optional[str] = None
    password: Optional[str] = None

class DoctorCreate(DoctorBase):
    doctorId: str

class DoctorUpdate(BaseModel):
    personalInfo: Optional[DoctorPersonalInfo] = None
    professionalInfo: Optional[DoctorProfessionalInfo] = None
    status: Optional[DoctorStatus] = None
    assignedPatients: Optional[List[str]] = None
    username: Optional[str] = None
    password: Optional[str] = None

class Doctor(DoctorBase):
    doctorId: str
    timestamps: Timestamps

# ----------------- NURSE MODELS -----------------

class NursePersonalInfo(BaseModel):
    name: str
    age: int
    gender: str

class NurseStatus(BaseModel):
    availability: str  # e.g., "On Duty", "Off Duty", "On Call"

class NurseBase(BaseModel):
    personalInfo: NursePersonalInfo
    status: NurseStatus
    assignedPatients: List[str] = []
    username: Optional[str] = None
    password: Optional[str] = None

class NurseCreate(NurseBase):
    nurseId: str

class NurseUpdate(BaseModel):
    personalInfo: Optional[NursePersonalInfo] = None
    status: Optional[NurseStatus] = None
    assignedPatients: Optional[List[str]] = None
    username: Optional[str] = None
    password: Optional[str] = None

class Nurse(NurseBase):
    nurseId: str
    timestamps: Timestamps

# ----------------- PATIENT MODELS -----------------

class PatientPersonalInfo(BaseModel):
    name: str
    age: int
    gender: str
    roomNumber: str

class BloodPressure(BaseModel):
    systolic: int
    diastolic: int

class PatientVitals(BaseModel):
    heartRate: int
    temperature: float
    bloodPressure: BloodPressure
    spo2: int
    oxygenSaturation: int
    respirationRate: int = 16

class PatientSensors(BaseModel):
    irSensor: int
    ultrasonicSensor: int

class PatientEmotion(BaseModel):
    current: str
    confidence: int

class PatientStatus(BaseModel):
    condition: str  # e.g., "Stable", "Critical", "Under Observation"
    emergency: bool = False
    fallDetected: bool = False

class PatientAssignedStaff(BaseModel):
    doctorId: Optional[str] = None
    nurseId: Optional[str] = None

class PatientBase(BaseModel):
    personalInfo: PatientPersonalInfo
    vitals: PatientVitals
    sensors: PatientSensors
    emotion: PatientEmotion
    status: PatientStatus
    assignedStaff: PatientAssignedStaff

class PatientCreate(PatientBase):
    patientId: str

class PatientUpdate(BaseModel):
    personalInfo: Optional[PatientPersonalInfo] = None
    vitals: Optional[PatientVitals] = None
    sensors: Optional[PatientSensors] = None
    emotion: Optional[PatientEmotion] = None
    status: Optional[PatientStatus] = None
    assignedStaff: Optional[PatientAssignedStaff] = None

class Patient(PatientBase):
    patientId: str
    timestamps: Timestamps

# ----------------- ROBOT MODELS -----------------

class RobotCoordinates(BaseModel):
    x: float
    y: float

class RobotBase(BaseModel):
    name: str
    roomNumber: str
    patientId: Optional[str] = None
    status: str  # e.g., "Online", "Scanning", "Docked", "Offline"
    battery: int
    coordinates: RobotCoordinates

class RobotCreate(RobotBase):
    robotId: str

class RobotUpdate(BaseModel):
    name: Optional[str] = None
    roomNumber: Optional[str] = None
    patientId: Optional[str] = None
    status: Optional[str] = None
    battery: Optional[int] = None
    coordinates: Optional[RobotCoordinates] = None

class Robot(RobotBase):
    robotId: str

# ----------------- ALERT MODELS -----------------

class AlertVitals(BaseModel):
    heartRate: Optional[int] = None
    temperature: Optional[float] = None
    spo2: Optional[int] = None
    respirationRate: Optional[int] = None

class Alert(BaseModel):
    alertId: str
    patientId: str
    patientName: str
    type: str
    severity: str  # "Low", "Medium", "High", "Critical"
    vitals: AlertVitals
    resolved: bool = False
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
