import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from app.config import ALLOWED_ORIGINS
from app.database import db
from app.routers import doctors, nurses, patients, robots, alerts
from app.services.simulator import run_simulation, manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown events."""
    # Startup: Start vitals & telemetry simulation task
    task = asyncio.create_task(run_simulation())
    app.state.simulation_task = task
    yield
    # Shutdown: Cancel the simulation task and wait
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

# Create FastAPI app with custom metadata
app = FastAPI(
    title="IRIS Patient Monitor & Fleet Management API",
    description="FastAPI Backend for real-time patient monitoring via IRIS medical robots. Simulates and tracks vitals (heart rate, body temp, respiration rate, spo2) and robot coordinates.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from pydantic import BaseModel
from fastapi.responses import JSONResponse

class LoginRequest(BaseModel):
    username: str
    password: str

# Include CRUD API Routers under /api
app.include_router(doctors.router, prefix="/api")
app.include_router(nurses.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(robots.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")

@app.post("/api/login", tags=["Authentication"])
async def login(req: LoginRequest):
    """Secure login endpoint for medical professionals (admin, doctor, nurse) to access the telemetry dashboard."""
    username = req.username.strip().lower()
    password = req.password

    # 1. System Admin check
    if username == "admin" and password == "admin123":
        return {
            "id": "admin",
            "name": "System Administrator",
            "role": "admin",
            "username": "admin"
        }

    # 2. Doctor check
    doctors_list = db.get_doctors()
    for doc in doctors_list:
        db_username = doc.get("username", "").strip().lower()
        if not db_username:
            # Fallback for mock/sample doctors to match their last name (e.g. Elena Rostova -> rostova)
            db_username = doc.get("personalInfo", {}).get("name", "").split()[-1].lower()
        
        db_password = doc.get("password", "password123")
        
        if db_username == username and db_password == password:
            return {
                "id": doc["doctorId"],
                "name": doc["personalInfo"]["name"],
                "role": "doctor",
                "username": db_username
            }

    # 3. Nurse check
    nurses_list = db.get_nurses()
    for nurse in nurses_list:
        db_username = nurse.get("username", "").strip().lower()
        if not db_username:
            # Fallback for mock/sample nurses to match their first name (e.g. Alice Johnson -> alice)
            db_username = nurse.get("personalInfo", {}).get("name", "").split()[0].lower()
            
        db_password = nurse.get("password", "password123")
        
        if db_username == username and db_password == password:
            return {
                "id": nurse["nurseId"],
                "name": nurse["personalInfo"]["name"],
                "role": "nurse",
                "username": db_username
            }

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": "Invalid username or password"}
    )


@app.get("/", tags=["General"])
async def root():
    """Welcome and overview of system dashboard counts."""
    doctors_list = db.get_doctors()
    nurses_list = db.get_nurses()
    patients_list = db.get_patients()
    robots_list = db.get_robots()
    alerts_list = db.get_alerts()
    
    active_alerts_count = sum(1 for a in alerts_list if not a["resolved"])
    emergency_patients = sum(1 for p in patients_list if p.get("status", {}).get("emergency", False))

    return {
        "status": "Online",
        "service": "IRIS Medical Robot Dashboard Backend",
        "summary": {
            "totalDoctors": len(doctors_list),
            "totalNurses": len(nurses_list),
            "totalPatients": len(patients_list),
            "emergencyPatients": emergency_patients,
            "totalRobots": len(robots_list),
            "totalAlerts": len(alerts_list),
            "activeAlerts": active_alerts_count
        },
        "documentation": "/docs"
    }

@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time patient telemetry and robot tracking.
    Clients receive updates automatically every time vitals fluctuate.
    """
    await manager.connect(websocket)
    
    # Send initial state immediately upon connection
    initial_payload = {
        "type": "INITIAL_STATE",
        "data": {
            "patients": db.get_patients(),
            "robots": db.get_robots(),
            "alerts": db.get_alerts()
        }
    }
    await websocket.send_json(initial_payload)
    
    try:
        while True:
            # Keep connection alive; accept messages if client sends any
            data = await websocket.receive_text()
            # We can handle custom incoming commands here if needed
            await websocket.send_json({
                "type": "ACK",
                "message": f"Received command: {data}"
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        manager.disconnect(websocket)
