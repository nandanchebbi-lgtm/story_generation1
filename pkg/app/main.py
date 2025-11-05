# pkg/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pkg.profiles import router as profiles_router
from pkg.photo import router as photo_router
from pkg.agent import router as agent_router
from pkg.app.chat import router as chat_router
from pkg.app.api import graph
from pkg.gpt4v import router as gpt4v_router

app = FastAPI(title="Mindlink API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://mindlink.vercel.app"], #"http://127.0.0.1:5173"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(profiles_router, prefix="/api/profiles", tags=["Profiles"])
app.include_router(photo_router, prefix="/api/photo", tags=["Photo"])
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])
app.include_router(agent_router, prefix="/api/agent", tags=["Agent"])
app.include_router(graph.router, prefix="/api/graph", tags=["Graph"])
app.include_router(gpt4v_router, prefix="/api", tags=["GPT-4V"])

# Static files
os.makedirs("data/profiles", exist_ok=True)
app.mount("/static", StaticFiles(directory="data/profiles"), name="static")

@app.get("/")
def root():
    return {"status": "Mindlink API running"}

@app.on_event("startup")
def startup_event():
    print("Mindlink API started and ready!")
    print("Serving static files from /static")