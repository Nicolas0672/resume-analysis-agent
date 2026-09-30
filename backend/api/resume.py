import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Depends
from pydantic import HttpUrl

from backend.agent.graph_service import get_session_state, initialize_tailoring_session, resume_tailoring_session
from backend.services.resume_service import (
    apply_tailored_bullets,
    delete_bullet,
    delete_entry,
    edit_resume_bullets,
    edit_tailored_bullets,
    process_resume_analysis,
)
from backend.api.auth import get_current_user, verify_session_ownership
from backend.repository.resume_repository import create_user_session, get_user_sessions

router = APIRouter(prefix="/tailor")


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    job_link: HttpUrl | None = Form(None),
    job_description: str | None = Form(None),
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if file.content_type != "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        raise HTTPException(
            status_code=400, detail="Invalid file type. Please upload a DOCX file."
        )

    if not job_link and not job_description:
        raise HTTPException(
            status_code=400, detail="Please provide either a job URL or a job description."
        )

    session_id = str(uuid.uuid4())

    file_bytes = await file.read()
    resume_data = await process_resume_analysis(
        file_bytes=file_bytes, job_url=str(job_link) if job_link else None, job_description=job_description
    )

    if not resume_data["success"]:
        return {
            "success": False,
            "requires_job_description": resume_data["requires_job_description"],
            "error": resume_data["error"],
            "session_id": session_id,
        }

    # Bind session ownership to the authenticated user in Supabase Postgres
    job_details = resume_data.get("job_details") or {}
    job_title = job_details.get("job_title") if isinstance(job_details, dict) else getattr(job_details, "job_title", None)
    job_company = job_details.get("job_company") if isinstance(job_details, dict) else getattr(job_details, "job_company", None)

    create_user_session(
        session_id=session_id,
        user_id=current_user["id"],
        job_title=job_title,
        job_company=job_company,
    )

    ai_response = await initialize_tailoring_session(
        session_id=session_id,
        parsed_resume=resume_data["structured_resume"],
        job_details=resume_data["job_details"],
        candidate_profile_data=None,
        request=request,
    )

    return {
        "success": True,
        "session_id": session_id,
        "ai_response": ai_response,
        "requires_job_description": resume_data["requires_job_description"],
        "job_details": resume_data["job_details"],
        "resume_data": resume_data["structured_resume"],
    }


@router.post("/chat")
async def chat(
    session_id: str = Form(...),
    user_message: str = Form(...),
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")
    if not user_message:
        raise HTTPException(status_code=400, detail="User message is required")

    # Authorize session ownership before touching LangGraph checkpointer
    verify_session_ownership(session_id=session_id, user_id=current_user["id"])

    response = await resume_tailoring_session(
        session_id=session_id, user_message=user_message, request=request
    )

    return {
        "message": "Message processed successfully",
        "ai_response": response,
    }


@router.post("/apply-tailoring")
async def apply_tailoring(
    session_id: str = Form(...),
    topic_id: str = Form(...),
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    verify_session_ownership(session_id=session_id, user_id=current_user["id"])

    result = await apply_tailored_bullets(
        session_id=session_id, topic_id=topic_id, request=request
    )
    return result


@router.post("/custom-tailoring")
async def custom_tailoring(
    session_id: str = Form(...),
    topic_id: str = Form(...),
    sentence_id: int = Form(...),
    new_text: str = Form(...),
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    verify_session_ownership(session_id=session_id, user_id=current_user["id"])

    result = await edit_tailored_bullets(
        session_id=session_id,
        topic_id=topic_id,
        request=request,
        sentence_id=sentence_id,
        new_text=new_text,
    )
    return result


@router.get("/session/{session_id}")
async def get_session(
    session_id: str,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    verify_session_ownership(session_id=session_id, user_id=current_user["id"])

    state = await get_session_state(session_id=session_id, request=request)

    return {
        "message": "Session state retrieved successfully",
        "state": state,
    }


@router.post("/delete-bullet")
async def delete_bullets(
    session_id: str = Form(...),
    sentence_id: int = Form(...),
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    verify_session_ownership(session_id=session_id, user_id=current_user["id"])

    state = await delete_bullet(sentence_id=sentence_id, session_id=session_id, request=request)
    return state


@router.post("/edit-resume-bullets")
async def edit_resume_bullet(
    session_id: str = Form(...),
    new_text: str = Form(...),
    sentence_id: int = Form(...),
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    verify_session_ownership(session_id=session_id, user_id=current_user["id"])

    state = await edit_resume_bullets(
        sentence_id=sentence_id, session_id=session_id, request=request, new_text=new_text
    )
    return state


@router.post("/delete-entry")
async def delete_entries(
    session_id: str = Form(...),
    entry_id: int = Form(...),
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    verify_session_ownership(session_id=session_id, user_id=current_user["id"])

    state = await delete_entry(entry_id=entry_id, session_id=session_id, request=request)
    return state


@router.get("/sessions")
async def list_my_sessions(current_user: dict = Depends(get_current_user)):
    """Retrieve all previous tailoring sessions owned by the authenticated user."""
    return {
        "success": True,
        "sessions": get_user_sessions(user_id=current_user["id"]),
    }
