from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import HttpUrl
from backend.services.resume_analysis_service import process_resume_analysis

router = APIRouter(prefix="/resumes")

@router.post("/upload")
async def upload_resume(file: UploadFile = File(...), job_link: HttpUrl = Form(...)):
    if file.content_type != "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a DOCX file.")

    if not job_link:
        raise HTTPException(status_code=400, detail="Only HTTP and HTTPS URLs are allowed")
    
    file_bytes = await file.read()
    resume_data = await process_resume_analysis(file_bytes, str(job_link))

    return {
        "message": "Resume processed successfully",
        "data": resume_data,
    }

# Validation of router