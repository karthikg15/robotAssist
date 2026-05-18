import json
import threading
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.config import DB_FILE

class JSONDatabase:
    def __init__(self):
        self.lock = threading.Lock()
        self._initialize_db()

    def _initialize_db(self):
        """Ensure db file exists and has structural keys."""
        with self.lock:
            if not DB_FILE.exists():
                initial_structure = {
                    "doctors": [],
                    "nurses": [],
                    "patients": [],
                    "robots": [],
                    "alerts": []
                }
                with open(DB_FILE, "w") as f:
                    json.dump(initial_structure, f, indent=2)

    def load_data(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load all data from JSON db in a thread-safe manner."""
        with self.lock:
            try:
                with open(DB_FILE, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                # Fallback structure
                return {
                    "doctors": [],
                    "nurses": [],
                    "patients": [],
                    "robots": [],
                    "alerts": []
                }

    def save_data(self, data: Dict[str, Any]):
        """Save all data back to JSON db in a thread-safe manner."""
        with self.lock:
            with open(DB_FILE, "w") as f:
                json.dump(data, f, indent=2)

    # ---------------- DOCTOR CRUD ----------------
    def get_doctors(self) -> List[Dict[str, Any]]:
        return self.load_data().get("doctors", [])

    def get_doctor(self, doctor_id: str) -> Optional[Dict[str, Any]]:
        doctors = self.get_doctors()
        for doc in doctors:
            if doc["doctorId"] == doctor_id:
                return doc
        return None

    def add_doctor(self, doctor_data: Dict[str, Any]) -> Dict[str, Any]:
        data = self.load_data()
        # Set createdAt timestamp if not present
        if "timestamps" not in doctor_data:
            doctor_data["timestamps"] = {"createdAt": datetime.utcnow().isoformat() + "Z"}
        data["doctors"].append(doctor_data)
        self.save_data(data)
        return doctor_data

    def update_doctor(self, doctor_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        data = self.load_data()
        for doc in data["doctors"]:
            if doc["doctorId"] == doctor_id:
                # Merge updates recursively
                for key, val in update_data.items():
                    if isinstance(val, dict) and key in doc and isinstance(doc[key], dict):
                        doc[key].update(val)
                    else:
                        doc[key] = val
                # Update timestamp
                if "timestamps" not in doc:
                    doc["timestamps"] = {}
                doc["timestamps"]["lastUpdated"] = datetime.utcnow().isoformat() + "Z"
                self.save_data(data)
                return doc
        return None

    def delete_doctor(self, doctor_id: str) -> bool:
        data = self.load_data()
        initial_len = len(data["doctors"])
        data["doctors"] = [doc for doc in data["doctors"] if doc["doctorId"] != doctor_id]
        if len(data["doctors"]) < initial_len:
            self.save_data(data)
            return True
        return False

    # ---------------- NURSE CRUD ----------------
    def get_nurses(self) -> List[Dict[str, Any]]:
        return self.load_data().get("nurses", [])

    def get_nurse(self, nurse_id: str) -> Optional[Dict[str, Any]]:
        nurses = self.get_nurses()
        for nurse in nurses:
            if nurse["nurseId"] == nurse_id:
                return nurse
        return None

    def add_nurse(self, nurse_data: Dict[str, Any]) -> Dict[str, Any]:
        data = self.load_data()
        if "timestamps" not in nurse_data:
            nurse_data["timestamps"] = {"createdAt": datetime.utcnow().isoformat() + "Z"}
        data["nurses"].append(nurse_data)
        self.save_data(data)
        return nurse_data

    def update_nurse(self, nurse_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        data = self.load_data()
        for nurse in data["nurses"]:
            if nurse["nurseId"] == nurse_id:
                for key, val in update_data.items():
                    if isinstance(val, dict) and key in nurse and isinstance(nurse[key], dict):
                        nurse[key].update(val)
                    else:
                        nurse[key] = val
                if "timestamps" not in nurse:
                    nurse["timestamps"] = {}
                nurse["timestamps"]["lastUpdated"] = datetime.utcnow().isoformat() + "Z"
                self.save_data(data)
                return nurse
        return None

    def delete_nurse(self, nurse_id: str) -> bool:
        data = self.load_data()
        initial_len = len(data["nurses"])
        data["nurses"] = [n for n in data["nurses"] if n["nurseId"] != nurse_id]
        if len(data["nurses"]) < initial_len:
            self.save_data(data)
            return True
        return False

    # ---------------- PATIENT CRUD ----------------
    def get_patients(self) -> List[Dict[str, Any]]:
        return self.load_data().get("patients", [])

    def get_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        patients = self.get_patients()
        for patient in patients:
            if patient["patientId"] == patient_id:
                return patient
        return None

    def add_patient(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        data = self.load_data()
        if "timestamps" not in patient_data:
            patient_data["timestamps"] = {"createdAt": datetime.utcnow().isoformat() + "Z"}
        data["patients"].append(patient_data)
        self.save_data(data)
        return patient_data

    def update_patient(self, patient_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        data = self.load_data()
        for patient in data["patients"]:
            if patient["patientId"] == patient_id:
                for key, val in update_data.items():
                    if isinstance(val, dict) and key in patient and isinstance(patient[key], dict):
                        # Nested merge for nested dictionaries
                        for sub_key, sub_val in val.items():
                            if isinstance(sub_val, dict) and sub_key in patient[key] and isinstance(patient[key][sub_key], dict):
                                patient[key][sub_key].update(sub_val)
                            else:
                                patient[key][sub_key] = sub_val
                    else:
                        patient[key] = val
                if "timestamps" not in patient:
                    patient["timestamps"] = {}
                patient["timestamps"]["lastUpdated"] = datetime.utcnow().isoformat() + "Z"
                self.save_data(data)
                return patient
        return None

    def delete_patient(self, patient_id: str) -> bool:
        data = self.load_data()
        initial_len = len(data["patients"])
        data["patients"] = [p for p in data["patients"] if p["patientId"] != patient_id]
        if len(data["patients"]) < initial_len:
            self.save_data(data)
            return True
        return False

    # ---------------- ROBOT CRUD ----------------
    def get_robots(self) -> List[Dict[str, Any]]:
        return self.load_data().get("robots", [])

    def get_robot(self, robot_id: str) -> Optional[Dict[str, Any]]:
        robots = self.get_robots()
        for robot in robots:
            if robot["robotId"] == robot_id:
                return robot
        return None

    def add_robot(self, robot_data: Dict[str, Any]) -> Dict[str, Any]:
        data = self.load_data()
        data["robots"].append(robot_data)
        self.save_data(data)
        return robot_data

    def update_robot(self, robot_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        data = self.load_data()
        for robot in data["robots"]:
            if robot["robotId"] == robot_id:
                for key, val in update_data.items():
                    if isinstance(val, dict) and key in robot and isinstance(robot[key], dict):
                        robot[key].update(val)
                    else:
                        robot[key] = val
                self.save_data(data)
                return robot
        return None

    def delete_robot(self, robot_id: str) -> bool:
        data = self.load_data()
        initial_len = len(data["robots"])
        data["robots"] = [r for r in data["robots"] if r["robotId"] != robot_id]
        if len(data["robots"]) < initial_len:
            self.save_data(data)
            return True
        return False

    # ---------------- ALERT CRUD ----------------
    def get_alerts(self) -> List[Dict[str, Any]]:
        return self.load_data().get("alerts", [])

    def get_alert(self, alert_id: str) -> Optional[Dict[str, Any]]:
        alerts = self.get_alerts()
        for alert in alerts:
            if alert["alertId"] == alert_id:
                return alert
        return None

    def add_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        data = self.load_data()
        # Assign automatic alert ID if not present
        if "alertId" not in alert_data:
            next_num = len(data.get("alerts", [])) + 501
            alert_data["alertId"] = f"A{next_num}"
        if "timestamp" not in alert_data:
            alert_data["timestamp"] = datetime.utcnow().isoformat() + "Z"
        data["alerts"].append(alert_data)
        self.save_data(data)
        return alert_data

    def resolve_alert(self, alert_id: str) -> Optional[Dict[str, Any]]:
        data = self.load_data()
        for alert in data["alerts"]:
            if alert["alertId"] == alert_id:
                alert["resolved"] = True
                self.save_data(data)
                return alert
        return None

    def delete_alert(self, alert_id: str) -> bool:
        data = self.load_data()
        initial_len = len(data["alerts"])
        data["alerts"] = [a for a in data["alerts"] if a["alertId"] != alert_id]
        if len(data["alerts"]) < initial_len:
            self.save_data(data)
            return True
        return False

# Global database instance
db = JSONDatabase()
