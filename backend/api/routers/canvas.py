from fastapi import APIRouter, Depends, HTTPException, Request

from api.auth import get_current_user, verify_session_ownership
from model.resume_schema import (
    AddBulletRequest,
    AddEntryRequest,
    DeleteBulletRequest,
    DeleteEntryRequest,
    EditBulletRequest,
    EditEntryRequest,
    EditSkillsRequest,
    SyncResumeRequest,
)
from services.canvas_service import (
    add_bullet,
    add_entry,
    delete_bullet,
    delete_entry,
    edit_bullet,
    edit_entry,
    edit_skills,
    sync_resume,
)

router = APIRouter(prefix="/canvas")


@router.post("/delete-bullet")
async def delete_bullet_endpoint(
    payload: DeleteBulletRequest,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if not payload.session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    await verify_session_ownership(session_id=payload.session_id, user_id=current_user["id"])

    state = await delete_bullet(
        session_id=payload.session_id,
        sentence_id=payload.sentence_id,
        request=request,
    )
    return state


@router.post("/edit-bullet")
async def edit_bullet_endpoint(
    payload: EditBulletRequest,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if not payload.session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    await verify_session_ownership(session_id=payload.session_id, user_id=current_user["id"])

    state = await edit_bullet(
        session_id=payload.session_id,
        sentence_id=payload.sentence_id,
        new_text=payload.new_text,
        request=request,
    )
    return state


@router.post("/delete-entry")
async def delete_entry_endpoint(
    payload: DeleteEntryRequest,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if not payload.session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    await verify_session_ownership(session_id=payload.session_id, user_id=current_user["id"])

    state = await delete_entry(
        session_id=payload.session_id,
        entry_id=payload.entry_id,
        request=request,
    )
    return state


@router.post("/edit-entry")
async def edit_entry_endpoint(
    payload: EditEntryRequest,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if not payload.session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    await verify_session_ownership(session_id=payload.session_id, user_id=current_user["id"])

    patch_dict = payload.model_dump(exclude={"session_id", "entry_id"}, exclude_none=True)
    state = await edit_entry(
        session_id=payload.session_id,
        entry_id=payload.entry_id,
        patch_data=patch_dict,
        request=request,
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

    await verify_session_ownership(session_id=payload.session_id, user_id=current_user["id"])

    state = await add_bullet(
        session_id=payload.session_id,
        entry_id=payload.entry_id,
        text=payload.text,
        request=request,
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

    await verify_session_ownership(session_id=payload.session_id, user_id=current_user["id"])

    state = await add_entry(
        session_id=payload.session_id,
        section_type=payload.section_type,
        entry_data=payload.entry,
        request=request,
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

    await verify_session_ownership(session_id=payload.session_id, user_id=current_user["id"])

    state = await edit_skills(
        session_id=payload.session_id,
        skills=payload.skills,
        request=request,
    )
    return state


@router.post("/sync-resume")
async def sync_resume_endpoint(
    payload: SyncResumeRequest,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if not payload.session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    await verify_session_ownership(session_id=payload.session_id, user_id=current_user["id"])

    state = await sync_resume(
        session_id=payload.session_id,
        resume_to_edit=payload.resume_to_edit,
        request=request,
    )
    return state
