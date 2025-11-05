import os
import json
import base64
import uuid
import networkx as nx
from fastapi import APIRouter, UploadFile, File, Header
from fastapi.responses import JSONResponse
from typing import Optional
from pkg.memory_kg import MemoryKG, LocalFileAdapter
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

router = APIRouter(prefix="/gpt4v", tags=["GPT-4V"])
USER_AGENT_STATES = {}

# ---------------- Utility ----------------
def init_agent_state(user_id: str):
    if user_id not in USER_AGENT_STATES:
        USER_AGENT_STATES[user_id] = {
            "image_path": None,
            "messages": [],
            "knowledge_graph": nx.DiGraph(),
        }
        print(f"[AGENT] Initialized new state for {user_id}")
    return USER_AGENT_STATES[user_id]

def get_memory(user_id: str):
    adapter = LocalFileAdapter(profile_name=user_id)
    return MemoryKG(adapter=adapter, profile_name=user_id)

def save_upload_file(uploaded_file: UploadFile) -> str:
    save_dir = os.path.join("static", "uploads")
    os.makedirs(save_dir, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}_{uploaded_file.filename}"
    file_path = os.path.join(save_dir, unique_name)
    with open(file_path, "wb") as f:
        f.write(uploaded_file.file.read())
    uploaded_file.file.close()
    print(f"[AGENT] Image saved at {file_path}")
    return file_path

def encode_image_to_base64(image_path: str) -> tuple[str, str]:
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")
    ext = os.path.splitext(image_path)[-1].lower()
    mime_type = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }.get(ext, "image/jpeg")
    with open(image_path, "rb") as img_file:
        encoded = base64.b64encode(img_file.read()).decode("utf-8")
    return encoded, mime_type

# ---------------- Core ----------------
def upload_node(state, uploaded_file: Optional[UploadFile] = None):
    if uploaded_file:
        file_path = save_upload_file(uploaded_file)
        state["image_path"] = file_path
    return state

def chat_node(state):
    if not state.get("image_path"):
        print("[AGENT] No image found for GPT-4-Vision.")
        return state

    image_base64, mime_type = encode_image_to_base64(state["image_path"])

    human_msg = HumanMessage(
        content=[
            {"type": "text", "text": "Please describe and interpret this image thoughtfully."},
            {"type": "image_url", "image_url": f"data:{mime_type};base64,{image_base64}"},
        ]
    )

    sys_msg = SystemMessage(
        content="You are a thoughtful assistant that provides deep and kind insights about uploaded images."
    )

    llm = ChatOpenAI(model="gpt-4o", temperature=0.3)
    prev_msgs = state.get("messages", [])
    response = llm.invoke([sys_msg] + prev_msgs + [human_msg])

    state["messages"].append(human_msg)
    state["messages"].append(response)
    print(f"[AGENT] GPT-4-Vision processed image successfully for {state['image_path']}")
    return state

def update_graph_node(state, user_id: str):
    G = nx.DiGraph()
    for i, msg in enumerate(state["messages"]):
        role = "user" if isinstance(msg, HumanMessage) else "assistant" if isinstance(msg, AIMessage) else "system"
        node_id = f"{role}_{i}"
        G.add_node(node_id, label=str(msg.content))
        if i > 0:
            prev_role = "user" if isinstance(state["messages"][i - 1], HumanMessage) else "assistant"
            G.add_edge(f"{prev_role}_{i - 1}", node_id, label="next")
    state["knowledge_graph"] = G

    os.makedirs("data/conversations", exist_ok=True)
    conv_path = os.path.join("data/conversations", f"{user_id}_conversation.json")
    conv = [{"role": msg.type, "content": msg.content} for msg in state["messages"]]
    with open(conv_path, "w", encoding="utf-8") as f:
        json.dump(conv, f, indent=2, ensure_ascii=False)

    memory = get_memory(user_id)
    memory.add_chunk_to_graph(conv, photo_name=state.get("image_path"))
    print(f"[AGENT] Knowledge graph updated for {user_id}")
    return state

# ---------------- Routes ----------------
@router.post("/upload")
async def upload_image(file: UploadFile = File(...), x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        return JSONResponse({"error": "Missing x-user-id header"}, status_code=400)
    state = init_agent_state(x_user_id)
    state = upload_node(state, uploaded_file=file)
    return {"image_path": state["image_path"], "message": "Image uploaded successfully."}

@router.post("/chat")
async def chat(x_user_id: str = Header(...)):
    state = init_agent_state(x_user_id)
    if not state.get("image_path"):
        return JSONResponse({"error": "No image selected"}, status_code=400)
    state = chat_node(state)
    state = update_graph_node(state, x_user_id)
    return {
        "messages": [
            msg.content if isinstance(msg.content, str) else str(msg.content)
            for msg in state["messages"]
        ]
    }