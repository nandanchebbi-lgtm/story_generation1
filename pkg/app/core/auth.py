# pkg/app/core/auth.py
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
import jwt

# OAuth2 scheme (used if you implement real tokens later)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- Dummy version for testing ---
def get_current_user(dummy_user: Optional[str] = "demo_user"):
    """
    Returns a fixed username for testing purposes.
    All endpoints using this dependency will act as 'demo_user'.
    """
    return dummy_user

# --- Optional JWT version (future use) ---
async def get_current_user_jwt(token: str = Depends(oauth2_scheme)):
    """
    Decodes JWT token and returns the user ID.
    Replace 'SECRET_KEY' with your actual secret.
    """
    try:
        payload = jwt.decode(token, "SECRET_KEY", algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")