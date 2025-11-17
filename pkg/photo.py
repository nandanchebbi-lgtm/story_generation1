# photo.py (apply this entire file or patch into yours)
import os
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Depends, Query
from fastapi.responses import JSONResponse
from PIL import Image, ImageDraw
from pkg.app.core.auth import get_current_user

router = APIRouter()

# -----------------------------
# Configuration
# -----------------------------
HOST_IP = os.getenv("HOST_IP", "192.168.0.196")  # LAN IP for full URLs
BASE_DIR = Path("/app/data")
PROFILES_DIR = BASE_DIR / "profiles"   # kept for legacy if you need it
UPLOADS_DIR = BASE_DIR / "uploads"     # canonical uploads root

PROFILES_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# -----------------------------
# Dummy face detector (placeholder)
# -----------------------------
class MTCNN:
    def __init__(self, *args, **kwargs):
        pass

    def detect(self, image):
        return None, None

mtcnn = MTCNN(keep_all=True)

# -----------------------------
# In-memory user sessions
# -----------------------------
USER_SESSIONS = {}

def init_user_session(user_id: str, profile: str):
    key = f"{user_id}_{profile}"
    if key not in USER_SESSIONS:
        # *** Store uploads under UPLOADS_DIR/user_id/profile/uploads ***
        profile_dir = UPLOADS_DIR / user_id / profile
        upload_dir = profile_dir / "uploads"
        processed_dir = profile_dir / "processed"

        os.makedirs(upload_dir, exist_ok=True)
        os.makedirs(processed_dir, exist_ok=True)

        USER_SESSIONS[key] = {
            "profile_dir": str(profile_dir),
            "upload_dir": str(upload_dir),
            "processed_dir": str(processed_dir),
            "selected_image": None,
        }
        print(f"[DEBUG] New user session created: {key}")

    return USER_SESSIONS[key]

def sanitize_filename(filename: str) -> str:
    return filename.replace(" ", "_")

def draw_faces(image_path: str, processed_dir: str) -> str:
    """Simulated face detection — saves image without EXIF to avoid embedded thumbnail references."""
    image = Image.open(image_path).convert("RGB")
    boxes, probs = mtcnn.detect(image)
    draw = ImageDraw.Draw(image)

    if boxes is not None:
        for i, (box, prob) in enumerate(zip(boxes, probs)):
            draw.rectangle(box.tolist(), outline="red", width=3)
            draw.text((box[0], box[1] - 10), f"Face {i + 1} ({prob:.2f})", fill="red")

    processed_path = os.path.join(processed_dir, os.path.basename(image_path))

    # create a new image and copy pixels to avoid saving original EXIF / thumbnail
    image_without_exif = Image.new(image.mode, image.size)
    image_without_exif.putdata(list(image.getdata()))
    # Save as JPEG (or preserve extension if desired)
    image_without_exif.save(processed_path, format="JPEG", quality=90)

    return processed_path

# =============================================================
# Helper: generate full public URL (canonical: user/profile/filename)
# =============================================================
def build_public_url(user_id: str, profile: str, filename: str) -> str:
    return f"http://{HOST_IP}:8000/uploads/{user_id}/{profile}/{filename}"

# =============================================================
# UPLOAD IMAGE
# =============================================================
@router.post("/upload")
async def upload_photos(
    file: UploadFile = File(...),
    profile: str = Query(...),
    current_user: str = Depends(get_current_user),
):
    session = init_user_session(current_user, profile)
    upload_dir = session["upload_dir"]
    processed_dir = session["processed_dir"]

    safe_filename = sanitize_filename(file.filename)
    file_path = os.path.join(upload_dir, safe_filename)

    # Save original
    with open(file_path, "wb") as f:
        f.write(await file.read())

    # Process (draw faces)
    processed_path = draw_faces(file_path, processed_dir)
    session["selected_image"] = processed_path

    public_url = build_public_url(current_user, profile, safe_filename)

    return JSONResponse({
        "filename": safe_filename,
        "uploaded_path": file_path,
        "processed_path": processed_path,
        "public_url": public_url,
        "local_path": processed_path,
    })

# =============================================================
# LIST IMAGES
# =============================================================
@router.get("/list")
async def list_uploaded(
    profile: str = Query(...),
    current_user: str = Depends(get_current_user),
):
    session = init_user_session(current_user, profile)
    upload_dir = session["upload_dir"]
    processed_dir = session["processed_dir"]

    uploaded_files = sorted(os.listdir(upload_dir))
    uploaded_images = []

    for fname in uploaded_files:
        safe_fname = sanitize_filename(fname)

        uploaded_images.append({
            "filename": safe_fname,
            "uploaded_path": os.path.join(upload_dir, safe_fname),
            "processed_path": os.path.join(processed_dir, safe_fname),
            "public_url": build_public_url(current_user, profile, safe_fname),
            "local_path": os.path.join(processed_dir, safe_fname),
        })

    # Selected image
    selected_image_path = session.get("selected_image")
    selected_image = None

    if selected_image_path and os.path.exists(selected_image_path):
        fname = os.path.basename(selected_image_path)
        safe_fname = sanitize_filename(fname)
        selected_image = {
            "filename": safe_fname,
            "uploaded_path": os.path.join(upload_dir, safe_fname),
            "processed_path": os.path.join(processed_dir, safe_fname),
            "public_url": build_public_url(current_user, profile, safe_fname),
            "local_path": selected_image_path,
        }

    return JSONResponse({
        "uploaded_images": uploaded_images,
        "selected_image": selected_image,
    })

# =============================================================
# SELECT IMAGE
# =============================================================
@router.post("/select")
async def select_image(
    image_name: str,
    profile: str = Query(...),
    current_user: str = Depends(get_current_user),
):
    session = init_user_session(current_user, profile)
    upload_dir = session["upload_dir"]
    processed_dir = session["processed_dir"]

    safe_name = sanitize_filename(image_name)
    image_path = os.path.join(upload_dir, safe_name)

    if not os.path.exists(image_path):
        return JSONResponse({"error": "Image not found"}, status_code=404)

    processed_path = draw_faces(image_path, processed_dir)
    session["selected_image"] = processed_path

    public_url = build_public_url(current_user, profile, safe_name)

    return JSONResponse({
        "selected_image": {
            "filename": safe_name,
            "uploaded_path": image_path,
            "processed_path": processed_path,
            "public_url": public_url,
            "local_path": processed_path,
        },
        "public_url": public_url,
    })