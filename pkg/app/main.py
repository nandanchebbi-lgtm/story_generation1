import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Routers
from pkg.profiles import router as profiles_router
from pkg.photo import router as photo_router
from pkg.agent import router as agent_router
from pkg.app.chat import router as chat_router
from pkg.app.api import graph
from pkg.gpt4v import router as gpt4v_router

# -------------------------------------------------
# App setup
# -------------------------------------------------
app = FastAPI(title="Mindlink API")

# -------------------------------------------------
# LAN IP SUPPORT
# -------------------------------------------------
HOST_IP = os.getenv("HOST_IP", "192.168.0.196")

# Allow frontend served from:
# - localhost
# - LAN IP
# - Vite ports (3000 / 5173)
frontend_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    f"http://{HOST_IP}:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    f"http://{HOST_IP}:5173",
    f"http://{HOST_IP}",
    f"http://{HOST_IP}:80",
]

# -------------------------------------------------
# CORS CONFIGURATION
# -------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# -------------------------------------------------
# STATIC FILES LOCATIONS
# -------------------------------------------------
if Path("/app").exists():        # inside Docker
    DATA_DIR = Path("/app/data")
else:                            # local development
    ROOT_DIR = Path(__file__).resolve().parents[2]
    DATA_DIR = ROOT_DIR / "data"

UPLOADS_DIR = DATA_DIR / "uploads"
PROFILES_DIR = DATA_DIR / "profiles"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
PROFILES_DIR.mkdir(parents=True, exist_ok=True)

# Serve static folders (these MUST match nginx paths)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/profiles", StaticFiles(directory=str(PROFILES_DIR)), name="profiles")

# -------------------------------------------------
# Routers
# -------------------------------------------------
app.include_router(profiles_router, prefix="/api/profiles", tags=["Profiles"])
app.include_router(photo_router, prefix="/api/photo", tags=["Photo"])
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])
app.include_router(agent_router, prefix="/api/agent", tags=["Agent"])
app.include_router(graph.router, prefix="/api/graph", tags=["Graph"])
app.include_router(gpt4v_router, prefix="/api", tags=["GPT-4V"])

# -------------------------------------------------
# Root & Health
# -------------------------------------------------
@app.get("/")
def root():
    return {
        "status": "Mindlink API running ✅",
        "uploads_dir": str(UPLOADS_DIR),
        "profiles_dir": str(PROFILES_DIR),
        "allowed_frontend_origins": frontend_origins,
    }

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# -------------------------------------------------
# Startup log
# -------------------------------------------------
@app.on_event("startup")
def startup_event():
    print("✅ Mindlink API started and ready!")
    print(f"📁 Serving /uploads → {UPLOADS_DIR}")
    print(f"📁 Serving /profiles → {PROFILES_DIR}")
    print(f"🌐 Allowed frontend origins: {frontend_origins}")