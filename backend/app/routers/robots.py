from fastapi import APIRouter, HTTPException, status
from typing import List
from app.database import db
from app.models import Robot, RobotCreate, RobotUpdate

router = APIRouter(prefix="/robots", tags=["Robots"])

@router.get("/", response_model=List[Robot], summary="Get all robots")
async def get_robots():
    """Retrieve all IRIS medical monitoring robots and their telemetry data."""
    return db.get_robots()

@router.get("/{robot_id}", response_model=Robot, summary="Get a robot by ID")
async def get_robot(robot_id: str):
    """Retrieve details, battery, room, and coordinates of an IRIS robot by robotId."""
    robot = db.get_robot(robot_id)
    if not robot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Robot with ID '{robot_id}' not found"
        )
    return robot

@router.post("/", response_model=Robot, status_code=status.HTTP_201_CREATED, summary="Create a new robot")
async def create_robot(robot: RobotCreate):
    """Register a new IRIS robot in the fleet."""
    if db.get_robot(robot.robotId):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Robot with ID '{robot.robotId}' already exists"
        )
    
    # Check if patient exists if patientId is assigned
    if robot.patientId and not db.get_patient(robot.patientId):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Patient ID '{robot.patientId}' does not exist"
        )

    new_robot = db.add_robot(robot.model_dump())
    return new_robot

@router.put("/{robot_id}", response_model=Robot, summary="Update a robot's telemetry or configuration")
async def update_robot(robot_id: str, robot_update: RobotUpdate):
    """Partially or fully update details like battery level, status, room, coordinates, or patient assignment."""
    existing = db.get_robot(robot_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Robot with ID '{robot_id}' not found"
        )
    
    update_data = robot_update.model_dump(exclude_unset=True)
    
    if "patientId" in update_data and update_data["patientId"]:
        if not db.get_patient(update_data["patientId"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Patient ID '{update_data['patientId']}' does not exist"
            )

    updated_robot = db.update_robot(robot_id, update_data)
    return updated_robot

@router.delete("/{robot_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a robot")
async def delete_robot(robot_id: str):
    """Remove a robot from the active fleet list."""
    success = db.delete_robot(robot_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Robot with ID '{robot_id}' not found"
        )
    return None
