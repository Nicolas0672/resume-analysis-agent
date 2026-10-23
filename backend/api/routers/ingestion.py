import sys
import uuid
import zipfile
from io import BytesIO
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from pydantic import HttpUrl

from agent.graph_service import initialize_tailoring_session
from api.auth import get_current_user
from repository.resume_repository import create_user_session
from services.analysis_service import prepare_resume_and_job_inputs

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_UNCOMPRESSED_SIZE = 50 * 1024 * 1024  # 50 MB
MAX_COMPRESSION_RATIO = 100  # 100:1
CHUNK_SIZE = 1024 * 1024  # 1 MB


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

    # Immediate pre-read file size check
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="File size exceeds the 10MB limit. Please upload a smaller DOCX file.",
        )

    session_id = str(uuid.uuid4())

    # Safe chunked read ceiling to prevent memory exhaustion on chunked or unreported payload sizes
    file_bytes_acc = bytearray()
    while chunk := await file.read(CHUNK_SIZE):
        file_bytes_acc.extend(chunk)
        if len(file_bytes_acc) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail="File size exceeds the 10MB limit. Please upload a smaller DOCX file.",
            )
    file_bytes = bytes(file_bytes_acc)

    # Validate ZIP structure and defend against ZIP bombs / excessive XML expansion
    try:
        with zipfile.ZipFile(BytesIO(file_bytes)) as zf:
            total_uncompressed = sum(info.file_size for info in zf.infolist())
            if total_uncompressed > MAX_UNCOMPRESSED_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail="DOCX contents exceed safe uncompressed size limits.",
                )
            if len(file_bytes) > 0 and (total_uncompressed / len(file_bytes)) > MAX_COMPRESSION_RATIO:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Suspicious compressed file detected (compression ratio too high).",
                )
    except zipfile.BadZipFile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupt DOCX archive.",
        )

    resume_data = await prepare_resume_and_job_inputs(
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

    await create_user_session(
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
