import uuid

from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from pydantic import HttpUrl
from backend.agent.graph import initialize_tailoring_session, resume_tailoring_session, get_session_state
from backend.services.resume_analysis_service import process_resume_analysis

router = APIRouter(prefix="/tailor")

@router.post("/upload")
async def upload_resume(file: UploadFile = File(...), job_link: HttpUrl = Form(...), request: Request = None):
    if file.content_type != "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a DOCX file.")

    if not job_link:
        raise HTTPException(status_code=400, detail="Only HTTP and HTTPS URLs are allowed")
    
    session_id = str(uuid.uuid4())
    
    file_bytes = await file.read()
    resume_data = await process_resume_analysis(file_bytes, str(job_link))

    ai_response =await initialize_tailoring_session(
        session_id=session_id,
        parsed_resume=resume_data["structured_resume"],
        job_details=resume_data["job_details"],
        candidate_profile_data=None,
        request=request
    )

    return {
        "message": "Resume processed successfully",
        "session_id": session_id,
        "ai_response": ai_response
    }

@router.post("/chat")
async def chat(session_id: str = Form(...), user_message: str = Form(...), request: Request = None):
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    if not user_message:
        raise HTTPException(status_code=400, detail="User message is required")

    response = await resume_tailoring_session(session_id=session_id, user_message=user_message, request=request)

    return {
        "message": "Message processed successfully",
        "ai_response": response
    }

@router.get("/session/{session_id}")
async def get_session(session_id: str, request: Request = None):
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    state = await get_session_state(session_id=session_id, request=request)

    return {
        "message": "Session state retrieved successfully",
        "state": state
    }
