from fastapi import APIRouter, Depends, HTTPException, Request

from api.auth import get_current_user, verify_session_ownership
from model.resume_schema import ApplyTailoringRequest, EditProposalBulletRequest
from services.tailoring_service import (
    apply_tailored_topic,
    edit_tailored_proposal_bullet,
)

router = APIRouter(prefix="/tailor")


@router.post("/apply-topic")
async def apply_topic_endpoint(
    payload: ApplyTailoringRequest,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    if not payload.session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    await verify_session_ownership(session_id=payload.session_id, user_id=current_user["id"])

    result = await apply_tailored_topic(
        session_id=payload.session_id,
        topic_id=payload.topic_id,
        request=request,
    )
    return result


@router.post("/edit-proposal-bullet")
async def edit_proposal_bullet_endpoint(
    payload: EditProposalBulletRequest,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    """Allows candidate to tweak or customize the wording of a proposed tailored bullet
    in tailor_analysis before applying it to the working resume.
    """
    if not payload.session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")

    await verify_session_ownership(session_id=payload.session_id, user_id=current_user["id"])

    result = await edit_tailored_proposal_bullet(
        session_id=payload.session_id,
        topic_id=payload.topic_id,
        sentence_id=payload.sentence_id,
        new_text=payload.new_text,
        request=request,
    )
    return result
