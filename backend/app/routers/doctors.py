from fastapi import APIRouter, HTTPException, status
from typing import List
from app.database import db
from app.models import Doctor, DoctorCreate, DoctorUpdate

router = APIRouter(prefix="/doctors", tags=["Doctors"])

@router.get("/", response_model=List[Doctor], summary="Get all doctors")
async def get_doctors():
    """Retrieve all doctor records currently registered in the system."""
    return db.get_doctors()

@router.get("/{doctor_id}", response_model=Doctor, summary="Get a doctor by ID")
async def get_doctor(doctor_id: str):
    """Retrieve a single doctor's details by their doctorId."""
    doctor = db.get_doctor(doctor_id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor with ID '{doctor_id}' not found"
        )
    return doctor

@router.post("/", response_model=Doctor, status_code=status.HTTP_201_CREATED, summary="Create a new doctor")
async def create_doctor(doctor: DoctorCreate):
    """Create a new doctor record in the database."""
    # Check if ID already exists
    if db.get_doctor(doctor.doctorId):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Doctor with ID '{doctor.doctorId}' already exists"
        )
    
    new_doc = db.add_doctor(doctor.model_dump())
    return new_doc

@router.put("/{doctor_id}", response_model=Doctor, summary="Update an existing doctor")
async def update_doctor(doctor_id: str, doctor_update: DoctorUpdate):
    """Partially or fully update details of an existing doctor."""
    existing = db.get_doctor(doctor_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor with ID '{doctor_id}' not found"
        )
    
    # Filter out None values to allow partial updates
    update_data = doctor_update.model_dump(exclude_unset=True)
    updated_doc = db.update_doctor(doctor_id, update_data)
    return updated_doc

@router.delete("/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a doctor")
async def delete_doctor(doctor_id: str):
    """Remove a doctor's record from the system."""
    success = db.delete_doctor(doctor_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor with ID '{doctor_id}' not found"
        )
    return None
