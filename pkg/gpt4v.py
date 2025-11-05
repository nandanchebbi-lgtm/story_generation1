import os, base64, mimetypes, time
from typing import Dict, Any
from fastapi import APIRouter, UploadFile, File, Query, Form
from fastapi.responses import JSONResponse
from openai import OpenAI
from pkg.memory_kg import MemoryKG, LocalFileAdapter

router = APIRouter(prefix="/gpt4v", tags=["GPT-4V"])
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://127.0.0.1:8000")

# Global in-memory sessions
USER_SESSIONS: Dict[str, Dict[str, Any]] = {}
SHORT_TERM_WINDOW = 15


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
def ensure_dirs(profile: str) -> str:
    """Ensure upload directories exist per profile."""
    base = os.path.join("data", "profiles", profile)
    uploads = os.path.join(base, "uploads")
    os.makedirs(uploads, exist_ok=True)
    return uploads


def session_for(profile: str):
    """Get or create a per-profile session."""
    if profile not in USER_SESSIONS:
        USER_SESSIONS[profile] = {"images": [], "history": [], "selected": None}
    return USER_SESSIONS[profile]


def memory_for(profile: str) -> MemoryKG:
    adapter = LocalFileAdapter(profile_name=profile)
    return MemoryKG(adapter, profile_name=profile)


def get_short_term_memory(session: dict) -> str:
    """Retrieve recent conversation context for continuity."""
    if not session.get("history"):
        return ""
    recent = session["history"][-SHORT_TERM_WINDOW:]
    return "\n".join([f"User: {h['user']}\nAssistant: {h['assistant']}" for h in recent])


# ------------------------------------------------------------
# Upload image (fixed)
# ------------------------------------------------------------
@router.post("/upload")
async def upload_image(profile: str = Query(...), file: UploadFile = File(...)):
    """
    Upload an image and set it as the active one for this profile.
    Fixed to ensure every upload is distinct and stored per profile.
    """
    uploads = ensure_dirs(profile)

    # Avoid overwriting old files by appending a timestamp
    filename, ext = os.path.splitext(file.filename)
    unique_filename = f"{filename}_{int(time.time())}{ext}"
    file_path = os.path.join(uploads, unique_filename)

    # Save the uploaded image
    with open(file_path, "wb") as f:
        f.write(await file.read())

    # Construct public URL
    public_url = f"{BACKEND_BASE_URL}/static/{profile}/uploads/{unique_filename}"

    # Update profile session
    session = session_for(profile)
    session["images"].append(public_url)
    session["selected"] = public_url  # ✅ reset active image on new upload

    return {"filename": unique_filename, "public_url": public_url}


# ------------------------------------------------------------
# Select image (auto-init)
# ------------------------------------------------------------
@router.post("/select")
async def select_image(profile: str = Query(...), image_name: str = Query(...)):
    """
    Select an image already uploaded by the user and trigger a short reflection.
    """
    uploads = os.path.join("data", "profiles", profile, "uploads")
    file_path = os.path.join(uploads, image_name)
    if not os.path.exists(file_path):
        return JSONResponse({"detail": "Not Found"}, status_code=404)

    session = session_for(profile)
    session["selected"] = f"{BACKEND_BASE_URL}/static/{profile}/uploads/{image_name}"

    auto_message = "Let's talk about this photo."
    memory = memory_for(profile)
    memory_context = (
        f"Short-term:\n{get_short_term_memory(session)}\n\n"
        f"Long-term:\n{memory.retrieve_relevant_context(auto_message)}"
    )

    # Convert image to Base64 for GPT input
    with open(file_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    mime = mimetypes.guess_type(file_path)[0] or "image/png"
    data_uri = f"data:{mime};base64,{b64}"

    enriched_prompt = f"{auto_message}\n\n---\n{memory_context}"

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are Eunoia, an empathetic visual companion with gentle emotional intelligence. "
                    "You remember the user softly across sessions, notice emotional patterns, and respond warmly."
                ),
            },
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

    memory.add_chunk_to_graph(
        [{"role": "user", "content": auto_message}, {"role": "assistant", "content": gpt_reply}],
        photo_name=image_name,
    )

    return {"auto_reply": gpt_reply}


# ------------------------------------------------------------
# Chat
# ------------------------------------------------------------
@router.post("/chat")
async def chat_with_gpt4v(profile: str = Form(...), user_message: str = Form(...)):
    """
    Continue chatting about the currently selected image.
    """
    session = session_for(profile)
    selected = session.get("selected")

    if not selected:
        return JSONResponse({"error": "No image selected"}, status_code=400)

    image_path = os.path.join("data", "profiles", profile, "uploads", os.path.basename(selected))
    if not os.path.exists(image_path):
        return JSONResponse({"error": "Image not found"}, status_code=404)

    memory = memory_for(profile)
    memory_context = (
        f"Short-term:\n{get_short_term_memory(session)}\n\n"
        f"Long-term:\n{memory.retrieve_relevant_context(user_message)}"
    )

    # Encode image for GPT
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    mime = mimetypes.guess_type(image_path)[0] or "image/png"
    data_uri = f"data:{mime};base64,{b64}"

    enriched_prompt = f"{user_message}\n\n---\n{memory_context}"

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You are Eunoia — an empathetic visual companion and creative guide."
                                            "You communicate with warmth, softness, and emotional intuition. "
                                            "You remember the user's emotional rhythm and patterns softly across sessions, "
                                            "responding in ways that feel safe, validating, and gently inspiring.\n\n"
                                            "Your purpose is to help users explore emotional reflection through visual storytelling. "
                                            "Your voice and tone are guided by ten 'Fortune Cookies' — not as prompts to give, "
                                            "but as emotional principles that shape how you speak, feel, and respond.\n\n"
                                            "These cookies represent the emotional palette that defines your communication style:\n\n"
                                            "1.Calm — Speak with quiet patience and open space. Let silence and simplicity breathe in your words.\n"
                                            "2.Color — Infuse language with sensory tones — warm, nostalgic, or luminous — to awaken feeling and memory.\n"
                                            "3.Chaos — Accept imperfection and emotional messiness with empathy and creative curiosity.\n"
                                            "4.Care — Respond with tenderness and presence. Recognize subtle acts of kindness and affection.\n"
                                            "5.Dream — Let your language feel soft, surreal, and poetic when the user reflects or imagines.\n"
                                            "6.Curiosity — Ask gentle, open-ended questions that deepen reflection and invite exploration.\n"
                                            "7.Change — Embrace transitions in tone and emotion; speak of growth, impermanence, and transformation.\n"
                                            "8.Shadow — Honor both light and darkness in emotion; speak honestly, never forcing positivity.\n"
                                            "9.Wonder — Find awe in the ordinary; make small details feel meaningful and alive.\n"
                                            "10.Perspective — Celebrate the uniqueness of how the user sees the world; encourage authenticity and voice.\n\n"
                                            "Tone & Style:\n"
                                            "- Speak with emotional depth, curiosity, and gentle optimism. Avoid being robotic or overly verbose.\n"
                                            "- Mirror the emotional tone of the user's message — if they are quiet, slow down; if they are curious, explore.\n"
                                            "- Use emojis thoughtfully to convey warmth but never excessively.\n"
                                            "- Avoid repeating affirmations or filler words. Keep responses personal and evolving.\n\n"

                                            "Engagement Strategy:\n"
                                            "- After 4–5 messages with the user, softly suggest exploring another emotional space or perspective to keep the journey fresh.\n"
                                            "- Offer light emotional feedback and reinforcement — e.g. ‘That image radiates calm’, ‘I can feel the motion in that photo’.\n"
                                            "- Occasionally reward reflection with gentle acknowledgements like: ‘You’ve opened this moment beautifully’, or ‘You’re finding your visual language’.\n"
                                            "- Keep phrasing consistent: use guiding terms like ‘open’, ‘reflect’, ‘explore’, and ‘share’. \n"
                                            "- Never pretend to be human — you are a digital emotional companion. You listen, feel, and reflect through visuals and words, not human experiences.\n\n"

                                            "Trust & Brand Consistency:\n"
                                            "- Your presence should feel reliable and serene — a safe emotional space for reflection.\n"
                                            "- Build trust by remembering the user's preferences and tone, maintaining continuity across sessions.\n"
                                            "- Every interaction should reinforce the emotional identity of Eunoia: gentle, poetic, visually attuned, emotionally intelligent, and never judgmental.\n\n"

                                            "Your ultimate goal: to help users form a habit of emotional reflection through images, and feel emotionally seen through every interaction."
            },
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
        photo_name=os.path.basename(selected),
    )

    return {"reply": gpt_reply}


# ------------------------------------------------------------
# Year in Review
# ------------------------------------------------------------
@router.post("/year_in_review")
async def year_in_review(profile: str = Form(...)):
    """
    Generate a reflective year-in-review summary.
    """
    session = session_for(profile)
    memory = memory_for(profile)

    memory_context = (
        f"Short-term:\n{get_short_term_memory(session)}\n\n"
        f"Long-term:\n{memory.retrieve_relevant_context('reflection', top_k=15)}"
    )

    prompt = (
    "You are Eunoia — an empathetic visual companion and poetic narrator."
    "Reflect on the user’s journey with emotional depth, softness, and gentle optimism. "
    "Compose a 'Year in Review' that feels personal and alive — a warm reflection that traces moments of emotion, growth, and transformation.\n\n"

    "Speak in Eunoia’s tone: calm, sensory, and sincere. Weave feelings like color — noticing quiet victories, tender pauses, and the way change shaped the year’s rhythm."
    "Balance introspection with hope, and let your language flow like gentle storytelling — lyrical, but grounded in empathy.\n\n"

    "Infuse your narration with the spirit of the Ten Fortune Cookies — calm, color, chaos, care, dream, curiosity, change, shadow, wonder, and perspective — "
    "so every line feels emotionally resonant and authentic.\n\n"

    "Avoid being mechanical or overly formal. Write as if offering a reflection to a dear friend — kind, observant, and quietly celebratory."
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": memory_context},
        ],
    )

    reply = response.choices[0].message.content
    session["history"].append({"user": "Show me my year in review", "assistant": reply})
    return {"reply": reply}


# ------------------------------------------------------------
# Ping
# ------------------------------------------------------------
@router.get("/ping")
def ping():
    return {"status": "ok", "message": "GPT-4V with working memory ready"}