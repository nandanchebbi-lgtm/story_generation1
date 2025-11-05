# src/pkg/photo.py
import os
from fastapi import APIRouter, UploadFile, File, Depends, Query
from fastapi.responses import JSONResponse
from PIL import Image, ImageDraw
from pkg.app.core.auth import get_current_user
from typing import Optional

router = APIRouter()


# Dummy face detector (placeholder)
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
        profile_dir = os.path.join("data", "profiles", user_id, profile)
        upload_dir = os.path.join(profile_dir, "uploads")
        processed_dir = os.path.join(profile_dir, "processed")

        os.makedirs(upload_dir, exist_ok=True)
        os.makedirs(processed_dir, exist_ok=True)

        USER_SESSIONS[key] = {
            "profile_dir": profile_dir,
            "upload_dir": upload_dir,
            "processed_dir": processed_dir,
            "selected_image": None,
        }
        print(f"[DEBUG] New user session: {key}")

    return USER_SESSIONS[key]


def draw_faces(image_path: str, processed_dir: str) -> str:
    """Simulate face detection by drawing boxes (placeholder)."""
    image = Image.open(image_path).convert("RGB")
    boxes, probs = mtcnn.detect(image)
    draw = ImageDraw.Draw(image)

    if boxes is not None:
        for i, (box, prob) in enumerate(zip(boxes, probs)):
            draw.rectangle(box.tolist(), outline="red", width=3)
            draw.text((box[0], box[1] - 10), f"Face {i + 1} ({prob:.2f})", fill="red")

    processed_path = os.path.join(processed_dir, os.path.basename(image_path))
    image.save(processed_path)
    return processed_path


# -----------------------------
# Upload Endpoint
# -----------------------------
@router.post("/upload")
async def upload_photos(
    file: UploadFile = File(...),
    profile: str = Query(...),
    current_user: str = Depends(get_current_user),
):
    session = init_user_session(current_user, profile)
    upload_dir = session["upload_dir"]
    processed_dir = session["processed_dir"]

    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())

    processed_path = draw_faces(file_path, processed_dir)
    session["selected_image"] = processed_path

    public_url = f"http://127.0.0.1:8000/static/{current_user}/{profile}/processed/{file.filename}"
    return JSONResponse(
        {
            "filename": file.filename,
            "uploaded_path": file_path,
            "processed_path": processed_path,
            "public_url": public_url,
            "local_path": processed_path,  # ✅ Added
        }
    )


# -----------------------------
# List Images Endpoint
# -----------------------------
@router.get("/list")
async def list_uploaded(
    profile: str = Query(...),
    current_user: str = Depends(get_current_user),
):
    session = init_user_session(current_user, profile)
    upload_dir = session["upload_dir"]
    processed_dir = session["processed_dir"]

    uploaded_files = sorted(os.listdir(upload_dir))
    uploaded_images = [
        {
            "filename": fname,
            "uploaded_path": os.path.join(upload_dir, fname),
            "processed_path": os.path.join(processed_dir, fname),
            "public_url": f"http://127.0.0.1:8000/static/{current_user}/{profile}/processed/{fname}",
            "local_path": os.path.join(processed_dir, fname),  # ✅ Added
        }
        for fname in uploaded_files
    ]

    selected_image_path = session.get("selected_image")
    selected_image = None
    if selected_image_path and os.path.exists(selected_image_path):
        fname = os.path.basename(selected_image_path)
        selected_image = {
            "filename": fname,
            "uploaded_path": os.path.join(upload_dir, fname),
            "processed_path": os.path.join(processed_dir, fname),
            "public_url": f"http://127.0.0.1:8000/static/{current_user}/{profile}/processed/{fname}",
            "local_path": os.path.join(processed_dir, fname),  # ✅ Added
        }

    return JSONResponse(
        {"uploaded_images": uploaded_images, "selected_image": selected_image}
    )


# -----------------------------
# Select Image Endpoint
# -----------------------------
@router.post("/select")
async def select_image(
    image_name: str,
    profile: str = Query(...),
    current_user: str = Depends(get_current_user),
):
    session = init_user_session(current_user, profile)
    upload_dir = session["upload_dir"]
    processed_dir = session["processed_dir"]

    image_path = os.path.join(upload_dir, image_name)
    if not os.path.exists(image_path):
        return JSONResponse({"error": "Image not found"}, status_code=404)

    processed_path = draw_faces(image_path, processed_dir)
    session["selected_image"] = processed_path
    public_url = f"http://127.0.0.1:8000/static/{current_user}/{profile}/processed/{image_name}"

    return JSONResponse(
        {
            "selected_image": {
                "filename": image_name,
                "uploaded_path": image_path,
                "processed_path": processed_path,
                "public_url": public_url,
                "local_path": processed_path,  # ✅ Added
            },
            "public_url": public_url,
        }
    )
