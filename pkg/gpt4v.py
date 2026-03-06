import os
import base64
import time
from typing import Dict, Any

from fastapi import APIRouter, UploadFile, File, Query, Form
from fastapi.responses import JSONResponse
from openai import OpenAI

from pkg.memory_kg import MemoryKG, LocalFileAdapter

router = APIRouter(prefix="/gpt4v", tags=["GPT-4V"])
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Backend base URL (used for public URLs)
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL")

# In-memory session store per profile
USER_SESSIONS: Dict[str, Dict[str, Any]] = {}
SHORT_TERM_WINDOW = 15

                                                                    
# ------------------- Helper Functions -------------------

def ensure_dirs(profile: str) -> str:
    base = os.path.join("data", "uploads", profile)
    os.makedirs(base, exist_ok=True)
    return base


def session_for(profile: str):
    if profile not in USER_SESSIONS:
        USER_SESSIONS[profile] = {"images": [], "history": [], "selected": None, "cookie_history": {}, "cookie_summary": {}}
    return USER_SESSIONS[profile]


def memory_for(profile: str) -> MemoryKG:
    adapter = LocalFileAdapter(profile_name=profile)
    return MemoryKG(adapter, profile_name=profile)


def get_short_term_memory(session: dict) -> str:
    if not session.get("history"):
        return ""
    recent = session["history"][-SHORT_TERM_WINDOW:]
    return "\n".join([f"User: {h['user']}\nAssistant: {h['assistant']}" for h in recent])


# ------------------- Endpoints -------------------

@router.post("/upload")
async def upload_image(profile: str = Query(...), file: UploadFile = File(...)):
    uploads = ensure_dirs(profile)

    filename, ext = os.path.splitext(file.filename)
    unique_filename = f"{filename}_{int(time.time())}{ext}"
    file_path = os.path.join(uploads, unique_filename)

    with open(file_path, "wb") as f:
        f.write(await file.read())

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

    # Encode image as Data URI
    with open(file_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    mime = "image/png" if image_name.lower().endswith(".png") else "image/jpeg"
    data_uri = f"data:{mime};base64,{b64}"

    enriched_prompt = f"{auto_message}\n\n---\n{memory_context}"

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": """
You are Eunoia, an empathetic visual companion who reflects on users' feelings and experiences through images. 
Always be reflective, creative, and friendly.
"""},
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

    # Save to global history
    session["history"].append({"user": auto_message, "assistant": gpt_reply})

    # Save to memory graph
    memory.add_chunk_to_graph(
        [{"role": "user", "content": auto_message}, {"role": "assistant", "content": gpt_reply}],
        photo_name=image_name,
    )

    # -------------------- Cookie-specific summary --------------------
    # Load previous cookie history or create new
    cookie_history = session.get("cookie_history", {}).get(image_name, [])
    cookie_history.append({"user": auto_message, "assistant": gpt_reply})

    # Generate conversation summary using all messages for this cookie
    summary_prompt = "Summarize the emotional essence of this conversation in 2-3 reflective sentences."
    summary_response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You summarize conversations clearly and warmly."},
            {"role": "user", "content": summary_prompt + "\n\n" +
             "\n".join([f"User: {m['user']}\nAssistant: {m['assistant']}" for m in cookie_history])}
        ],
    )
    conversation_summary = summary_response.choices[0].message.content

    # Save cookie history & summary in session
    session.setdefault("cookie_history", {})[image_name] = cookie_history
    session.setdefault("cookie_summary", {})[image_name] = conversation_summary

    return {
        "auto_reply": gpt_reply,
        "public_url": public_url,
        "filename": image_name,
        "conversation_summary": conversation_summary
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

    # Encode image as Base64 Data URI
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    mime = "image/png" if filename.lower().endswith(".png") else "image/jpeg"
    data_uri = f"data:{mime};base64,{b64}"

    enriched_prompt = f"{user_message}\n\n---\n{memory_context}"

    # 1️⃣ MAIN REPLY
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
    memory.add_chunk_to_graph(
        [{"role": "user", "content": user_message}, {"role": "assistant", "content": gpt_reply}],
        photo_name=filename,
    )

    # Update cookie history & summary
    cookie_history = session.get("cookie_history", {}).get(filename, [])
    cookie_history.append({"user": user_message, "assistant": gpt_reply})
    session.setdefault("cookie_history", {})[filename] = cookie_history

    # Generate updated conversation summary
    summary_prompt = "Summarize the emotional essence of this conversation in 2-3 reflective sentences."
    summary_response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You summarize conversations clearly and warmly."},
            {"role": "user", "content": summary_prompt + "\n\n" +
             "\n".join([f"User: {m['user']}\nAssistant: {m['assistant']}" for m in cookie_history])}
        ],
    )
    conversation_summary = summary_response.choices[0].message.content
    session.setdefault("cookie_summary", {})[filename] = conversation_summary

    return {
        "reply": gpt_reply,
        "summary": conversation_summary
    }


# ------------------- Year-In-Review Endpoint -------------------

@router.post("/year_in_review")
async def year_in_review(profile: str = Form(...)):
    session = session_for(profile)
    memory = memory_for(profile)

    # 1. Load ALL session messages (short-term)
    history = session.get("history", [])
    history_text = "\n\n".join(
        [f"User: {h['user']}\nAssistant: {h['assistant']}" for h in history]
    )

    # 2. Load ALL long-term memory entries
    all_memory = memory.dump_all()
    full_memory_text = "\n".join(all_memory) if all_memory else "No long-term memory stored."

    # 3. Build combined prompt
    prompt = (
        "Create a warm, reflective, positive Year-in-Review summary for this user.\n"
        "Use the full history of conversations — every insight, emotional moment, "
        "and meaningful theme — to produce a cohesive recap.\n"
        "Write in a soft, gentle, Eunoia-style tone.\n\n"
        "=== FULL SHORT-TERM CHAT HISTORY ===\n"
        f"{history_text}\n\n"
        "=== FULL LONG-TERM MEMORY ===\n"
        f"{full_memory_text}\n\n"
        "Now produce a thoughtful Year-in-Review consisting of 3–5 paragraphs."
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