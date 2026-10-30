from fastapi import APIRouter, Depends

from api.auth import get_current_user
from repository.resume_repository import get_user_sessions

router = APIRouter()


@router.get("/sessions")
async def list_my_sessions(current_user: dict = Depends(get_current_user)):
    """Retrieve all previous tailoring sessions owned by the authenticated user."""
    return {
        "success": True,
        "sessions": await get_user_sessions(user_id=current_user["id"]),
    }
