import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DB_FILE = BASE_DIR / "data" / "db.json"

# Create data directory if it doesn't exist
os.makedirs(DB_FILE.parent, exist_ok=True)

# CORS
ALLOWED_ORIGINS = [
    "http://localhost:5173",  # React default
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "*",                      # Allow all for development flexibility
]

# Simulation Configuration
SIMULATION_INTERVAL = 3.0  # seconds between vitals updates
