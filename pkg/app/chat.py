from fastapi import APIRouter

router = APIRouter()

@router.get("/chat/test")
def test_chat():
    return {"message": "Chat module is working!"}