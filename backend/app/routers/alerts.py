from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from app.database import db
from app.models import Alert

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("/", response_model=List[Alert], summary="Get all alerts")
async def get_alerts(resolved: Optional[bool] = None):
    """Retrieve list of all alerts. Filter by 'resolved' query parameter if desired."""
    alerts = db.get_alerts()
    if resolved is not None:
        alerts = [a for a in alerts if a["resolved"] == resolved]
    return alerts

@router.post("/{alert_id}/resolve", response_model=Alert, summary="Resolve an active alert")
async def resolve_alert(alert_id: str):
    """Mark an emergency/vital alert as resolved by a medical professional."""
    alert = db.get_alert(alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID '{alert_id}' not found"
        )
    
    updated_alert = db.resolve_alert(alert_id)
    
    # Check if patient has other active alerts. If none, reset patient's emergency state
    patient_id = updated_alert["patientId"]
    all_alerts = db.get_alerts()
    active_patient_alerts = [
        a for a in all_alerts 
        if a["patientId"] == patient_id and not a["resolved"] and a["alertId"] != alert_id
    ]
    
    if not active_patient_alerts:
        db.update_patient(patient_id, {"status": {"emergency": False, "condition": "Stable"}})
        
    return updated_alert

@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an alert record")
async def delete_alert(alert_id: str):
    """Delete an alert record from the history."""
    success = db.delete_alert(alert_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID '{alert_id}' not found"
        )
    return None
