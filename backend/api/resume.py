import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Depends
from fastapi.responses import StreamingResponse
from pydantic import HttpUrl

from agent.graph_service import get_session_state, initialize_tailoring_session, resume_tailoring_session
from model.job_pydantic import (
    AddBulletRequest,
    AddEntryRequest,
    EditEntryRequest,
    EditSkillsRequest,
    ResumeStructure,
    UpdateResumeRequest,
)
from services.docx_exporter import generate_docx
from services.pdf_exporter import generate_pdf
from services.resume_service import (
    add_resume_bullet,
    add_resume_entry,
    apply_tailored_bullets,
    delete_bullet,
    delete_entry,
    edit_resume_bullets,
    edit_resume_skills,
    edit_tailored_bullets,
    process_resume_analysis,
    update_full_resume,
    update_resume_entry,
)
from api.auth import get_current_user, verify_session_ownership
from repository.resume_repository import create_user_session, get_user_sessions

router = APIRouter(prefix="api/tailor")


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


@router.post("/edit-entry")
async def edit_entry_endpoint(
    payload: EditEntryRequest,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if not payload.session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    verify_session_ownership(session_id=payload.session_id, user_id=current_user["id"])

    patch_dict = payload.model_dump(exclude={"session_id", "entry_id"}, exclude_none=True)
    state = await update_resume_entry(
        session_id=payload.session_id,
        request=request,
        entry_id=payload.entry_id,
        patch_data=patch_dict,
    )
    return state


@router.post("/add-bullet")
async def add_bullet_endpoint(
    payload: AddBulletRequest,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if not payload.session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    verify_session_ownership(session_id=payload.session_id, user_id=current_user["id"])

    state = await add_resume_bullet(
        session_id=payload.session_id,
        request=request,
        entry_id=payload.entry_id,
        text=payload.text,
    )
    return state


@router.post("/add-entry")
async def add_entry_endpoint(
    payload: AddEntryRequest,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if not payload.session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    verify_session_ownership(session_id=payload.session_id, user_id=current_user["id"])

    state = await add_resume_entry(
        session_id=payload.session_id,
        request=request,
        section_type=payload.section_type,
        entry_data=payload.entry,
    )
    if state.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Session not found")
    if state.get("status") == "invalid_section":
        raise HTTPException(status_code=400, detail="Invalid section type")
    return state



@router.post("/edit-skills")
async def edit_skills_endpoint(
    payload: EditSkillsRequest,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if not payload.session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    verify_session_ownership(session_id=payload.session_id, user_id=current_user["id"])

    state = await edit_resume_skills(
        session_id=payload.session_id,
        request=request,
        skills=payload.skills,
    )
    return state


@router.post("/update-resume")
async def update_resume_endpoint(
    payload: UpdateResumeRequest,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if not payload.session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    verify_session_ownership(session_id=payload.session_id, user_id=current_user["id"])

    state = await update_full_resume(
        session_id=payload.session_id,
        request=request,
        resume_to_edit=payload.resume_to_edit,
    )
    return state



@router.get("/sessions")
async def list_my_sessions(current_user: dict = Depends(get_current_user)):
    """Retrieve all previous tailoring sessions owned by the authenticated user."""
    return {
        "success": True,
        "sessions": get_user_sessions(user_id=current_user["id"]),
    }


@router.get("/export/pdf")
async def export_resume_pdf(
    session_id: str,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    """Exports the working tailored resume (resume_to_edit) as an ATS-compliant vector PDF."""
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    verify_session_ownership(session_id=session_id, user_id=current_user["id"])

    config = {"configurable": {"thread_id": session_id}}
    graph_with_memory = request.app.state.graph_with_memory
    snapshot = await graph_with_memory.aget_state(config)

    if not snapshot or not snapshot.values:
        raise HTTPException(status_code=404, detail="Session not found or empty")

    resume_data = snapshot.values.get("resume_to_edit") or snapshot.values.get("resume_data")
    if not resume_data:
        raise HTTPException(status_code=404, detail="No resume data found for this session")

    if isinstance(resume_data, dict):
        resume_structure = ResumeStructure.model_validate(resume_data)
    else:
        resume_structure = resume_data

    pdf_buffer = generate_pdf(resume_structure)
    candidate_name = (resume_structure.name or "Resume").replace(" ", "_").strip()
    filename = f"{candidate_name}_Tailored_Resume.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.get("/export/docx")
async def export_resume_docx(
    session_id: str,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    """Exports the working tailored resume (resume_to_edit) as a structured Word DOCX document."""
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    verify_session_ownership(session_id=session_id, user_id=current_user["id"])

    config = {"configurable": {"thread_id": session_id}}
    graph_with_memory = request.app.state.graph_with_memory
    snapshot = await graph_with_memory.aget_state(config)

    if not snapshot or not snapshot.values:
        raise HTTPException(status_code=404, detail="Session not found or empty")

    resume_data = snapshot.values.get("resume_to_edit") or snapshot.values.get("resume_data")
    if not resume_data:
        raise HTTPException(status_code=404, detail="No resume data found for this session")

    if isinstance(resume_data, dict):
        resume_structure = ResumeStructure.model_validate(resume_data)
    else:
        resume_structure = resume_data

    docx_buffer = generate_docx(resume_structure)
    candidate_name = (resume_structure.name or "Resume").replace(" ", "_").strip()
    filename = f"{candidate_name}_Tailored_Resume.docx"

    return StreamingResponse(
        docx_buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
