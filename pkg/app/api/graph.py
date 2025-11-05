from fastapi import APIRouter, HTTPException
from pkg.gpt4v import USER_SESSIONS, session_for

router = APIRouter()

from fastapi import APIRouter
from pkg.memory_kg import LocalFileAdapter, MemoryKG, graph_to_json

router = APIRouter()

@router.get("/api/graph/{profile_name}")
async def get_graph(profile_name: str):
    """Return the current knowledge graph for a given profile."""
    adapter = LocalFileAdapter(profile_name=profile_name)
    memory = MemoryKG(adapter, profile_name=profile_name)
    G = memory.G
    graph_data = graph_to_json(G)
    return graph_data