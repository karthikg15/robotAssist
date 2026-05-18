from fastapi import APIRouter, HTTPException, status
from typing import List
from app.database import db
from app.models import Patient, PatientCreate, PatientUpdate

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.get("/", response_model=List[Patient], summary="Get all patients")
async def get_patients():
    """Retrieve all patient records currently monitored in the system."""
    return db.get_patients()

@router.get("/{patient_id}", response_model=Patient, summary="Get a patient by ID")
async def get_patient(patient_id: str):
    """Retrieve details, vitals, and assignments of a patient by their patientId."""
    patient = db.get_patient(patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found"
        )
    return patient

@router.post("/", response_model=Patient, status_code=status.HTTP_201_CREATED, summary="Create a new patient")
async def create_patient(patient: PatientCreate):
    """Register a new patient to be monitored by the medical robots."""
    if db.get_patient(patient.patientId):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Patient with ID '{patient.patientId}' already exists"
        )
    
    # Verify doctor exists if doctorId provided
    if patient.assignedStaff.doctorId and not db.get_doctor(patient.assignedStaff.doctorId):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Assigned Doctor ID '{patient.assignedStaff.doctorId}' does not exist"
        )
    
    # Verify nurse exists if nurseId provided
    if patient.assignedStaff.nurseId and not db.get_nurse(patient.assignedStaff.nurseId):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Assigned Nurse ID '{patient.assignedStaff.nurseId}' does not exist"
        )

    new_patient = db.add_patient(patient.model_dump())
    
    # Update doctor's assignedPatients list if doctor assigned
    if patient.assignedStaff.doctorId:
        doc = db.get_doctor(patient.assignedStaff.doctorId)
        if doc and patient.patientId not in doc.get("assignedPatients", []):
            assigned = list(doc.get("assignedPatients", [])) + [patient.patientId]
            db.update_doctor(patient.assignedStaff.doctorId, {"assignedPatients": assigned})

    # Update nurse's assignedPatients list if nurse assigned
    if patient.assignedStaff.nurseId:
        nurse = db.get_nurse(patient.assignedStaff.nurseId)
        if nurse and patient.patientId not in nurse.get("assignedPatients", []):
            assigned = list(nurse.get("assignedPatients", [])) + [patient.patientId]
            db.update_nurse(patient.assignedStaff.nurseId, {"assignedPatients": assigned})

    return new_patient

@router.put("/{patient_id}", response_model=Patient, summary="Update an existing patient")
async def update_patient(patient_id: str, patient_update: PatientUpdate):
    """Partially or fully update vitals, staff assignment, status, and details of a patient."""
    existing = db.get_patient(patient_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found"
        )
    
    update_data = patient_update.model_dump(exclude_unset=True)
    
    # Verify doctor/nurse exist if updated
    if "assignedStaff" in update_data:
        doc_id = update_data["assignedStaff"].get("doctorId")
        nurse_id = update_data["assignedStaff"].get("nurseId")
        if doc_id and not db.get_doctor(doc_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Doctor ID '{doc_id}' does not exist"
            )
        if nurse_id and not db.get_nurse(nurse_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Nurse ID '{nurse_id}' does not exist"
            )

    updated_patient = db.update_patient(patient_id, update_data)
    return updated_patient

@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a patient")
async def delete_patient(patient_id: str):
    """Remove a patient's record from the system and clean up staff assignments."""
    existing = db.get_patient(patient_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found"
        )
    
    # Remove from doctor assignments
    doc_id = existing.get("assignedStaff", {}).get("doctorId")
    if doc_id:
        doc = db.get_doctor(doc_id)
        if doc:
            assigned = [p for p in doc.get("assignedPatients", []) if p != patient_id]
            db.update_doctor(doc_id, {"assignedPatients": assigned})

    # Remove from nurse assignments
    nurse_id = existing.get("assignedStaff", {}).get("nurseId")
    if nurse_id:
        nurse = db.get_nurse(nurse_id)
        if nurse:
            assigned = [p for p in nurse.get("assignedPatients", []) if p != patient_id]
            db.update_nurse(nurse_id, {"assignedPatients": assigned})

    db.delete_patient(patient_id)
    return None
