from fastapi import APIRouter, HTTPException, Body
from typing import List
import os
import json

router = APIRouter()

# -------------------------------
# ✅ Flexible, production-safe paths
# -------------------------------
# DATA_DIR is injected by Docker/Railway: /app/data
# Locally defaults to ./data
BASE_DATA_DIR = os.getenv("DATA_DIR", "data")

# Profiles live inside /data/profiles
DATA_DIR = os.path.join(BASE_DATA_DIR, "profiles")
os.makedirs(DATA_DIR, exist_ok=True)

# profiles.json lives at /data/profiles/profiles.json
PROFILES_FILE = os.path.join(DATA_DIR, "profiles.json")


# -------------------------------
# ✅ Helpers
# -------------------------------
def load_profiles() -> List[str]:
    """Load profiles from JSON file (create if missing)."""
    if not os.path.exists(PROFILES_FILE):
        with open(PROFILES_FILE, "w") as f:
            json.dump([], f)
        return []
    with open(PROFILES_FILE, "r") as f:
        return json.load(f)


def save_profiles(profiles: List[str]):
    """Save profiles to the JSON file."""
    with open(PROFILES_FILE, "w") as f:
        json.dump(profiles, f, indent=2)


# -------------------------------
# ✅ Routes
# -------------------------------

# 1. List all profiles
@router.get("/list")
def list_profiles() -> List[dict]:
    """Return a list of all profiles."""
    profiles = load_profiles()
    return [{"name": p} for p in profiles]


# 2. Create new profile
@router.post("/create")
def create_profile(name: str = Body(..., embed=True)):
    """
    Create a new profile.
    POST body JSON example:
    { "name": "demo" }
    """
    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Profile name cannot be empty")

    profiles = load_profiles()
    if name in profiles:
        raise HTTPException(status_code=400, detail="Profile already exists")

    profiles.append(name)
    save_profiles(profiles)

    # Create folder for this profile
    profile_dir = os.path.join(DATA_DIR, name)
    os.makedirs(profile_dir, exist_ok=True)

    return {"name": name, "message": f"Profile '{name}' created successfully"}


# 3. Delete profile
@router.delete("/delete")
def delete_profile(name: str = Body(..., embed=True)):
    """
    Delete an existing profile.
    POST body JSON example:
    { "name": "demo" }
    """
    profiles = load_profiles()
    if name not in profiles:
        raise HTTPException(status_code=404, detail="Profile not found")

    profiles.remove(name)
    save_profiles(profiles)

    # Delete folder + files
    profile_dir = os.path.join(DATA_DIR, name)
    if os.path.exists(profile_dir):
        for root, dirs, files in os.walk(profile_dir, topdown=False):
            for file in files:
                os.remove(os.path.join(root, file))
            for d in dirs:
                os.rmdir(os.path.join(root, d))
        os.rmdir(profile_dir)

    return {"message": f"Profile '{name}' deleted successfully"}


# 4. Select profile
@router.post("/select")
def select_profile(name: str = Body(..., embed=True)):
    """
    Select a profile.
    POST body JSON example:
    { "name": "demo" }
    """
    profiles = load_profiles()
    if name not in profiles:
        raise HTTPException(status_code=404, detail="Profile not found")

    return {"name": name, "message": f"Profile '{name}' selected"}