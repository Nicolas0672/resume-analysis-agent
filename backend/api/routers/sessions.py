from fastapi import APIRouter, Depends, Request

from api.auth import get_current_user
from repository.resume_repository import get_user_sessions
from services.session_service import delete_session_service

router = APIRouter()


@router.get("/sessions")
async def list_my_sessions(current_user: dict = Depends(get_current_user)):
    """Retrieve all previous tailoring sessions owned by the authenticated user."""
    return {
        "success": True,
        "sessions": await get_user_sessions(user_id=current_user["id"]),
    }

@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(session_id: str, current_user: dict = Depends(get_current_user), request: Request = None):
    """Delete a session owned by the authenticated user. Returns a 204 on success"""
    res = await delete_session_service(session_id=session_id, user_id=current_user["id"], request=request)

    return res