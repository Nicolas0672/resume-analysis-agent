from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from api.auth import get_current_user, verify_session_ownership
from model.resume_schema import ResumeStructure
from services.docx_exporter import generate_docx
from services.pdf_exporter import generate_pdf

router = APIRouter(prefix="/export")


@router.get("/pdf")
async def export_resume_pdf(
    session_id: str,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    """Exports the working tailored resume (resume_to_edit) as an ATS-compliant vector PDF."""
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    await verify_session_ownership(session_id=session_id, user_id=current_user["id"])

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


@router.get("/docx")
async def export_resume_docx(
    session_id: str,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    """Exports the working tailored resume (resume_to_edit) as a structured Word DOCX document."""
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    await verify_session_ownership(session_id=session_id, user_id=current_user["id"])

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
