import asyncio
import random
import logging
from datetime import datetime
from typing import List, Optional
from fastapi import WebSocket
from app.database import db
from app.config import SIMULATION_INTERVAL

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SimulatorService")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New WebSocket client connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Active connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        
        # Gather dead connections to remove
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Error broadcasting to client: {e}")
                dead_connections.append(connection)
        
        for dead in dead_connections:
            self.disconnect(dead)

# Instantiate the global WebSocket connection manager
manager = ConnectionManager()

# Background task reference
simulator_task = None

async def run_simulation():
    """Periodic task to update patient vitals, check alert status, and simulate robot movements."""
    logger.info("Vitals & Robot simulation background worker started.")
    
    while True:
        try:
            # 1. SIMULATE PATIENT VITALS
            patients = db.get_patients()
            updated_patients = []
            
            for p in patients:
                p_id = p["patientId"]
                vitals = p["vitals"]
                status = p["status"]
                
                # Check for active emergency
                is_emergency = status.get("emergency", False)
                fall_detected = status.get("fallDetected", False)
                
                # If stable, small probability to trigger an emergency/alert
                # 2% chance of emergency event if patient is currently stable
                if not is_emergency and random.random() < 0.02:
                    is_emergency = True
                    status["emergency"] = True
                    status["condition"] = "Critical"
                    
                    # Decide on random critical condition
                    event_type = random.choice(["Cardiac Distress", "High Fever", "Hypoxia", "Fall Detected"])
                    if event_type == "Cardiac Distress":
                        vitals["heartRate"] = random.choice([random.randint(40, 48), random.randint(115, 130)])
                    elif event_type == "High Fever":
                        vitals["temperature"] = round(random.uniform(38.8, 40.2), 1)
                    elif event_type == "Hypoxia":
                        vitals["spo2"] = random.randint(85, 91)
                        vitals["oxygenSaturation"] = vitals["spo2"] - random.randint(0, 2)
                    elif event_type == "Fall Detected":
                        status["fallDetected"] = True
                        fall_detected = True
                        
                    logger.info(f"Simulating Critical Event: {event_type} for patient {p_id}")
                
                # Fluctuate vitals
                if is_emergency:
                    # Erratic vitals
                    if fall_detected:
                        # Fall doesn't necessarily change vitals catastrophically immediately, but adds anxiety
                        vitals["heartRate"] = clamp(vitals["heartRate"] + random.choice([-1, 1, 2]), 85, 110)
                        p["emotion"]["current"] = "Anxious"
                    else:
                        # Heartrate or temperature erratic
                        vitals["heartRate"] = clamp(vitals["heartRate"] + random.randint(-4, 4), 35, 140)
                        vitals["temperature"] = clamp(round(vitals["temperature"] + random.uniform(-0.2, 0.2), 1), 35.0, 41.0)
                        vitals["spo2"] = clamp(vitals["spo2"] + random.randint(-2, 1), 80, 94)
                        vitals["oxygenSaturation"] = clamp(vitals["spo2"] - random.randint(0, 2), 80, 94)
                        vitals["respirationRate"] = clamp(vitals["respirationRate"] + random.randint(-2, 2), 8, 30)
                        p["emotion"]["current"] = random.choice(["Anxious", "Distressed"])
                else:
                    # Healthy fluctuations
                    vitals["heartRate"] = clamp(vitals["heartRate"] + random.choice([-1, 0, 1]), 60, 95)
                    vitals["temperature"] = clamp(round(vitals["temperature"] + random.uniform(-0.05, 0.05), 1), 36.2, 37.4)
                    vitals["spo2"] = clamp(vitals["spo2"] + random.choice([-1, 0, 1]), 96, 100)
                    vitals["oxygenSaturation"] = clamp(vitals["spo2"] - random.choice([0, 1]), 95, 100)
                    vitals["respirationRate"] = clamp(vitals["respirationRate"] + random.choice([-1, 0, 1]), 12, 18)
                    p["emotion"]["current"] = random.choice(["Calm", "Happy", "Resting"])
                
                # Emotional confidence
                p["emotion"]["confidence"] = clamp(p["emotion"]["confidence"] + random.choice([-2, -1, 1, 2]), 70, 98)
                
                # Update sensors
                p["sensors"]["irSensor"] = clamp(p["sensors"]["irSensor"] + random.choice([-2, -1, 1, 2]), 20, 80)
                p["sensors"]["ultrasonicSensor"] = clamp(p["sensors"]["ultrasonicSensor"] + random.choice([-5, -2, 2, 5]), 50, 200)
                
                # Check for vital violations and generate alerts
                alert_type = check_vitals_limits(vitals, status)
                if alert_type:
                    # Set patient to emergency state
                    status["emergency"] = True
                    status["condition"] = "Critical"
                    
                    # Generate alert if not already active
                    existing_alerts = db.get_alerts()
                    has_active = any(a for a in existing_alerts if a["patientId"] == p_id and not a["resolved"])
                    
                    if not has_active:
                        alert_data = {
                            "patientId": p_id,
                            "patientName": p["personalInfo"]["name"],
                            "type": alert_type,
                            "severity": "High" if alert_type != "Patient Fall" else "Critical",
                            "vitals": {
                                "heartRate": vitals["heartRate"],
                                "temperature": vitals["temperature"],
                                "spo2": vitals["spo2"],
                                "respirationRate": vitals["respirationRate"]
                            },
                            "resolved": False
                        }
                        db.add_alert(alert_data)
                        logger.info(f"ALERT CREATED: {alert_type} for patient {p['personalInfo']['name']} ({p_id})")
                
                # Update DB record
                db.update_patient(p_id, {
                    "vitals": vitals,
                    "sensors": p["sensors"],
                    "emotion": p["emotion"],
                    "status": status
                })
                updated_patients.append(db.get_patient(p_id))

            # 2. SIMULATE ROBOT TELEMETRY
            robots = db.get_robots()
            updated_robots = []
            
            for r in robots:
                r_id = r["robotId"]
                coords = r["coordinates"]
                battery = r["battery"]
                r_status = r["status"]
                
                # Battery drain/charge
                if r_status == "Docked":
                    # Charge
                    battery = clamp(battery + 5, 0, 100)
                    if battery == 100:
                        r_status = "Online"
                else:
                    # Drain slightly
                    if random.random() < 0.2:  # 20% chance to drain 1% each tick
                        battery = clamp(battery - 1, 0, 100)
                        if battery < 15:
                            r_status = "Docked"  # auto dock for recharge
                            r["roomNumber"] = "Dock-Station-A"
                            coords["x"] = 80.0
                            coords["y"] = 20.0
                
                # Coordinate movement (fluctuate x, y)
                if r_status != "Docked" and r_status != "Offline":
                    # Slow walks around the hospital
                    coords["x"] = round(clamp(coords["x"] + random.uniform(-1.5, 1.5), 5.0, 95.0), 1)
                    coords["y"] = round(clamp(coords["y"] + random.uniform(-1.5, 1.5), 5.0, 95.0), 1)
                    
                    # 5% chance of status scan
                    if random.random() < 0.05:
                        r_status = random.choice(["Online", "Scanning"])
                
                db.update_robot(r_id, {
                    "battery": battery,
                    "status": r_status,
                    "coordinates": coords,
                    "roomNumber": r["roomNumber"]
                })
                updated_robots.append(db.get_robot(r_id))

            # 3. BROADCAST VIA WEBSOCKETS
            broadcast_payload = {
                "type": "TELEMETRY_UPDATE",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "data": {
                    "patients": updated_patients,
                    "robots": updated_robots,
                    "alerts": db.get_alerts()
                }
            }
            await manager.broadcast(broadcast_payload)
            
        except Exception as e:
            logger.error(f"Error in simulation loop: {e}", exc_info=True)
            
        await asyncio.sleep(SIMULATION_INTERVAL)

def clamp(val, min_val, max_val):
    return max(min_val, min(val, max_val))

def check_vitals_limits(vitals: dict, status: dict) -> Optional[str]:
    """Helper to check if patient vitals or status warrant an emergency alert."""
    if status.get("fallDetected", False):
        return "Patient Fall"
        
    hr = vitals.get("heartRate", 80)
    temp = vitals.get("temperature", 37.0)
    spo2 = vitals.get("spo2", 98)
    resp = vitals.get("respirationRate", 16)
    
    reasons = []
    if hr > 110:
        reasons.append("Tachycardia")
    elif hr < 50:
        reasons.append("Bradycardia")
        
    if temp > 38.3:
        reasons.append("High Fever")
    elif temp < 35.2:
        reasons.append("Hypothermia")
        
    if spo2 < 93:
        reasons.append("Hypoxia")
        
    if resp > 24:
        reasons.append("Tachypnea")
    elif resp < 10:
        reasons.append("Bradypnea")
        
    if reasons:
        return " & ".join(reasons)
        
    return None
