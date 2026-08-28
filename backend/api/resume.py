import uuid

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import HttpUrl
from backend.agent.graph import initialize_tailoring_session
from backend.services.resume_analysis_service import process_resume_analysis

router = APIRouter(prefix="/resumes")

@router.post("/upload")
async def upload_resume(file: UploadFile = File(...), job_link: HttpUrl = Form(...)):
    if file.content_type != "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a DOCX file.")

    if not job_link:
        raise HTTPException(status_code=400, detail="Only HTTP and HTTPS URLs are allowed")
    
    session_id = str(uuid.uuid4())
    
    file_bytes = await file.read()
    resume_data = await process_resume_analysis(file_bytes, str(job_link))

    await initialize_tailoring_session(
        session_id=session_id,
        parsed_resume=resume_data["parsed_resume"],
        job_details=resume_data["job_details"]
    )

    return {
        "message": "Resume processed successfully",
        "session_id": session_id
    }

# Validation of router