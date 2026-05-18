from fastapi import APIRouter, HTTPException, status
from typing import List
from app.database import db
from app.models import Patient, PatientCreate, PatientUpdate
from app.services.simulator import manager

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

@router.post("/telemetry", status_code=status.HTTP_200_OK, summary="Ingest telemetry from AWS IoT Core")
async def update_patient_telemetry(payload: dict):
    """
    Ingests sensor data (vitals and sensors) from AWS IoT Core Rule Action.
    Updates the local db.json thread-safely and broadcasts live updates to all connected web clients.
    """
    patient_id = payload.get("patientId")
    if not patient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload must include a valid 'patientId'"
        )

    existing = db.get_patient(patient_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found in registry"
        )

    # Prepare update fields
    update_data = {}
    
    # 1. Update vitals if present in payload
    if "vitals" in payload:
        vitals_payload = payload["vitals"]
        current_vitals = existing.get("vitals", {})
        updated_vitals = {**current_vitals, **vitals_payload}
        
        # Handle bloodPressure nesting specifically
        if "bloodPressure" in vitals_payload:
            current_bp = current_vitals.get("bloodPressure", {})
            updated_bp = {**current_bp, **vitals_payload["bloodPressure"]}
            updated_vitals["bloodPressure"] = updated_bp
            
        update_data["vitals"] = updated_vitals

    # 2. Update sensors if present in payload
    if "sensors" in payload:
        sensors_payload = payload["sensors"]
        current_sensors = existing.get("sensors", {})
        updated_sensors = {**current_sensors, **sensors_payload}
        update_data["sensors"] = updated_sensors

    # If nothing to update, return early
    if not update_data:
        return existing

    # Update patient record in database
    updated_patient = db.update_patient(patient_id, update_data)

    # Broadcast updated patients list, robots, and alerts instantly over standard WebSockets!
    await manager.broadcast({
        "type": "TELEMETRY_UPDATE",
        "data": {
            "patients": db.get_patients(),
            "robots": db.get_robots(),
            "alerts": db.get_alerts()
        }
    })

    return updated_patient
