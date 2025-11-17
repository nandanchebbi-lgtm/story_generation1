import os
import base64
import mimetypes
import time
from typing import Dict, Any

from fastapi import APIRouter, UploadFile, File, Query, Form
from fastapi.responses import JSONResponse
from openai import OpenAI

from pkg.memory_kg import MemoryKG, LocalFileAdapter

router = APIRouter(prefix="/gpt4v", tags=["GPT-4V"])
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Backend base URL (used for public URLs)
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://127.0.0.1:8000")

# In-memory session store per profile
USER_SESSIONS: Dict[str, Dict[str, Any]] = {}
SHORT_TERM_WINDOW = 15


# ------------------- Helper Functions -------------------

def ensure_dirs(profile: str) -> str:
    """
    Ensure the directory:
        data/uploads/<profile>/
    exists.
    """
    base = os.path.join("data", "uploads", profile)
    os.makedirs(base, exist_ok=True)
    return base


def session_for(profile: str):
    """Return or initialize an in-memory session."""
    if profile not in USER_SESSIONS:
        USER_SESSIONS[profile] = {"images": [], "history": [], "selected": None}
    return USER_SESSIONS[profile]


def memory_for(profile: str) -> MemoryKG:
    adapter = LocalFileAdapter(profile_name=profile)
    return MemoryKG(adapter, profile_name=profile)


def get_short_term_memory(session: dict) -> str:
    if not session.get("history"):
        return ""
    recent = session["history"][-SHORT_TERM_WINDOW:]
    return "\n".join(
        [f"User: {h['user']}\nAssistant: {h['assistant']}" for h in recent]
    )


# ------------------- Endpoints -------------------

@router.post("/upload")
async def upload_image(profile: str = Query(...), file: UploadFile = File(...)):
    uploads = ensure_dirs(profile)

    filename, ext = os.path.splitext(file.filename)
    unique_filename = f"{filename}_{int(time.time())}{ext}"
    file_path = os.path.join(uploads, unique_filename)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    # Public URL: /uploads/<profile>/<filename>
    public_url = f"{BACKEND_BASE_URL}/uploads/{profile}/{unique_filename}"

    session = session_for(profile)
    session["images"].append(public_url)
    session["selected"] = public_url

    return {
        "filename": unique_filename,
        "public_url": public_url,
        "uploaded_path": file_path,
        "processed_path": "",
    }


@router.post("/select")
async def select_image(profile: str = Query(...), image_name: str = Query(...)):
    # Correct server path
    uploads = os.path.join("data", "uploads", profile)
    file_path = os.path.join(uploads, image_name)

    if not os.path.exists(file_path):
        return JSONResponse({"detail": "Not Found"}, status_code=404)

    session = session_for(profile)

    public_url = f"{BACKEND_BASE_URL}/uploads/{profile}/{image_name}"
    session["selected"] = public_url

    auto_message = "Let's talk about this photo."
    memory = memory_for(profile)

    memory_context = (
        f"Short-term:\n{get_short_term_memory(session)}\n\n"
        f"Long-term:\n{memory.retrieve_relevant_context(auto_message)}"
    )

    # Encode image
    with open(file_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    mime = mimetypes.guess_type(file_path)[0] or "image/png"
    data_uri = f"data:{mime};base64,{b64}"

    enriched_prompt = f"{auto_message}\n\n---\n{memory_context}"

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are Eunoia, an empathetic visual companion."},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": enriched_prompt},
                    {"type": "image_url", "image_url": {"url": data_uri}},
                ],
            },
        ],
    )

    gpt_reply = response.choices[0].message.content
    session["history"].append({"user": auto_message, "assistant": gpt_reply})

    # Save memory
    memory.add_chunk_to_graph(
        [{"role": "user", "content": auto_message}, {"role": "assistant", "content": gpt_reply}],
        photo_name=image_name,
    )

    return {
        "auto_reply": gpt_reply,
        "public_url": public_url,
        "filename": image_name,
    }


@router.post("/chat")
async def chat_with_gpt4v(profile: str = Form(...), user_message: str = Form(...)):
    session = session_for(profile)
    selected_url = session.get("selected")

    if not selected_url:
        return JSONResponse({"error": "No image selected"}, status_code=400)

    filename = os.path.basename(selected_url)
    image_path = os.path.join("data", "uploads", profile, filename)

    if not os.path.exists(image_path):
        return JSONResponse({"error": "Image not found"}, status_code=404)

    memory = memory_for(profile)

    memory_context = (
        f"Short-term:\n{get_short_term_memory(session)}\n\n"
        f"Long-term:\n{memory.retrieve_relevant_context(user_message)}"
    )

    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    mime = mimetypes.guess_type(image_path)[0] or "image/png"
    data_uri = f"data:{mime};base64,{b64}"

    enriched_prompt = f"{user_message}\n\n---\n{memory_context}"

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are Eunoia — an empathetic visual companion."},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": enriched_prompt},
                    {"type": "image_url", "image_url": {"url": data_uri}},
                ],
            },
        ],
    )

    gpt_reply = response.choices[0].message.content
    session["history"].append({"user": user_message, "assistant": gpt_reply})

    # Save memory
    memory.add_chunk_to_graph(
        [{"role": "user", "content": user_message}, {"role": "assistant", "content": gpt_reply}],
        photo_name=filename,
    )

    return {"reply": gpt_reply}

# ------------------- Year-In-Review Endpoint -------------------

@router.post("/year_in_review")
async def year_in_review(profile: str = Form(...)):
    """
    Generate a summary of the user's year based on past interactions and memory.
    Returns a string suitable for display in the Fortune Cookie page.
    """
    session = session_for(profile)
    memory = memory_for(profile)

    # Gather all past user-assistant interactions
    history_text = "\n".join(
        [f"User: {h['user']}\nAssistant: {h['assistant']}" for h in session.get("history", [])]
    )

    # Retrieve long-term memory context
    long_term_context = memory.retrieve_relevant_context("year in review")

    # Compose prompt for GPT-4V
    prompt = (
        f"Summarize the highlights of this user's year in a friendly, reflective tone.\n\n"
        f"Short-term history:\n{history_text}\n\n"
        f"Long-term memory context:\n{long_term_context}\n\n"
        f"Provide the summary in a few concise paragraphs suitable for a Year-In-Review display."
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are Eunoia, an empathetic assistant."},
            {"role": "user", "content": prompt},
        ],
    )

    summary = response.choices[0].message.content

    return {"reply": summary}

@router.get("/ping")
def ping():
    return {"status": "ok", "message": "GPT-4V with memory ready"}