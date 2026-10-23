from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from agent.graph_service import (
    clear_active_topic_investigation,
    get_session_state,
    resume_tailoring_session,
    resume_tailoring_session_stream,
)
from api.auth import get_current_user, verify_session_ownership
from model.resume_schema import ChatRequest, ResetTopicRequest

router = APIRouter(prefix="/interview")


@router.post("/chat")
async def chat_interaction(
    payload: ChatRequest,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    """Processes interactive human responses during candidate investigation.
    Handles decision interrupts (done/need_more_info/tailor), topic selections,
    conversational answers, live form edits, skips, and topic conclusions.
    """
    if not payload.session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")
    if not payload.user_message and not payload.action and not payload.form_data:
        raise HTTPException(status_code=400, detail="User message, action, or form data is required")

    # Authorize session ownership before touching LangGraph checkpointer
    await verify_session_ownership(session_id=payload.session_id, user_id=current_user["id"])

    response = await resume_tailoring_session(
        session_id=payload.session_id,
        user_message=payload.user_message,
        action=payload.action,
        form_data=payload.form_data,
        request=request,
    )

    return {
        "message": "Message processed successfully",
        "ai_response": response,
    }


@router.post("/chat/stream")
async def stream_chat_interaction(
    payload: ChatRequest,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    """Streams candidate investigation feedback via Server-Sent Events (SSE).
    Emits thinking stages (analyzing, evaluating, synthesizing) followed by
    word/token chunks and the final structured payload.
    """
    if not payload.session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")
    if not payload.user_message and not payload.action and not payload.form_data:
        raise HTTPException(status_code=400, detail="User message, action, or form data is required")

    await verify_session_ownership(session_id=payload.session_id, user_id=current_user["id"])

    async def event_generator():
        async for chunk in resume_tailoring_session_stream(
            session_id=payload.session_id,
            user_message=payload.user_message,
            action=payload.action,
            form_data=payload.form_data,
            request=request,
        ):
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/reset-topic")
async def reset_topic(
    payload: ResetTopicRequest,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    """Wipes topic-scoped message history using RemoveMessage and initiates
    a fresh inquiry when a candidate pivots to a different experience type.
    """
    if not payload.session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    await verify_session_ownership(session_id=payload.session_id, user_id=current_user["id"])

    response = await clear_active_topic_investigation(
        session_id=payload.session_id,
        new_experience_type=payload.new_experience_type,
        request=request,
    )

    return {
        "message": "Topic chat reset successfully",
        "ai_response": response,
    }


@router.get("/session/{session_id}")
async def get_session(
    session_id: str,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    """Retrieves the current state snapshot for a tailoring session thread."""
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    await verify_session_ownership(session_id=session_id, user_id=current_user["id"])

    state = await get_session_state(session_id=session_id, request=request)

    return {
        "message": "Session state retrieved successfully",
        "state": state,
    }
