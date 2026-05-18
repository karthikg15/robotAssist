from fastapi import APIRouter, HTTPException, status
from typing import List
from app.database import db
from app.models import Nurse, NurseCreate, NurseUpdate

router = APIRouter(prefix="/nurses", tags=["Nurses"])

@router.get("/", response_model=List[Nurse], summary="Get all nurses")
async def get_nurses():
    """Retrieve all nurse records currently registered in the system."""
    return db.get_nurses()

@router.get("/{nurse_id}", response_model=Nurse, summary="Get a nurse by ID")
async def get_nurse(nurse_id: str):
    """Retrieve a single nurse's details by their nurseId."""
    nurse = db.get_nurse(nurse_id)
    if not nurse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nurse with ID '{nurse_id}' not found"
        )
    return nurse

@router.post("/", response_model=Nurse, status_code=status.HTTP_201_CREATED, summary="Create a new nurse")
async def create_nurse(nurse: NurseCreate):
    """Create a new nurse record in the database."""
    if db.get_nurse(nurse.nurseId):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nurse with ID '{nurse.nurseId}' already exists"
        )
    
    new_nurse = db.add_nurse(nurse.model_dump())
    return new_nurse

@router.put("/{nurse_id}", response_model=Nurse, summary="Update an existing nurse")
async def update_nurse(nurse_id: str, nurse_update: NurseUpdate):
    """Partially or fully update details of an existing nurse."""
    existing = db.get_nurse(nurse_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nurse with ID '{nurse_id}' not found"
        )
    
    update_data = nurse_update.model_dump(exclude_unset=True)
    updated_nurse = db.update_nurse(nurse_id, update_data)
    return updated_nurse

@router.delete("/{nurse_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a nurse")
async def delete_nurse(nurse_id: str):
    """Remove a nurse's record from the system."""
    success = db.delete_nurse(nurse_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nurse with ID '{nurse_id}' not found"
        )
    return None
