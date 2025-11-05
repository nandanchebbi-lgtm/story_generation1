# pkg/profiles.py
from fastapi import APIRouter, HTTPException
from typing import List
import os
import json

router = APIRouter()

DATA_DIR = "data/profiles"
os.makedirs(DATA_DIR, exist_ok=True)

PROFILES_FILE = os.path.join(DATA_DIR, "profiles.json")


def load_profiles():
    """Load profiles from a local JSON file."""
    if not os.path.exists(PROFILES_FILE):
        with open(PROFILES_FILE, "w") as f:
            json.dump([], f)
        return []
    with open(PROFILES_FILE, "r") as f:
        return json.load(f)


def save_profiles(profiles):
    """Save profiles back to the JSON file."""
    with open(PROFILES_FILE, "w") as f:
        json.dump(profiles, f, indent=2)


# ✅ 1. List all profiles
@router.get("/list")
def list_profiles() -> List[dict]:
    profiles = load_profiles()
    return [{"name": p} for p in profiles]


# ✅ 2. Create a new profile
@router.post("/create")
def create_profile(name: str):
    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Profile name cannot be empty")

    profiles = load_profiles()
    if name in profiles:
        raise HTTPException(status_code=400, detail="Profile already exists")

    profiles.append(name)
    save_profiles(profiles)

    # Create individual folder for the new profile
    profile_dir = os.path.join(DATA_DIR, name)
    os.makedirs(profile_dir, exist_ok=True)

    return {"name": name, "message": f"Profile '{name}' created successfully"}


# ✅ 3. Delete a profile
@router.delete("/delete")
def delete_profile(name: str):
    profiles = load_profiles()
    if name not in profiles:
        raise HTTPException(status_code=404, detail="Profile not found")

    profiles.remove(name)
    save_profiles(profiles)

    profile_dir = os.path.join(DATA_DIR, name)
    if os.path.exists(profile_dir):
        for root, dirs, files in os.walk(profile_dir, topdown=False):
            for file in files:
                os.remove(os.path.join(root, file))
            for dir in dirs:
                os.rmdir(os.path.join(root, dir))
        os.rmdir(profile_dir)

    return {"message": f"Profile '{name}' deleted successfully"}


# ✅ 4. Select profile
@router.post("/select")
def select_profile(name: str):
    profiles = load_profiles()
    if name not in profiles:
        raise HTTPException(status_code=404, detail="Profile not found")

    return {"name": name, "message": f"Profile '{name}' selected"}