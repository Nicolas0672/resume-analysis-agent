
from fastapi import HTTPException, Request

from backend.agent.model import TailorMatched
from backend.model.job_pydantic import ResumeBullet, ResumeExperience, ResumeLeadership, ResumeProject
from backend.services.helper import get_next_entry_id, get_next_sentence_id
from backend.services.resume_pre_llm import structure_resume_data, validate_job_details
from backend.services.job_fetcher import fetch_job_details
from backend.services.document_parser import open_docx, parse_docx, parse_resume


async def process_resume_analysis(
    file_bytes: bytes,
    job_url: str | None = None,
    job_description: str | None = None,
):
    parsed_resume = parse_resume(file_bytes)

    if job_description:
        job_details = job_description

    elif job_url:
        try:
            job_details = await fetch_job_details(job_url=job_url)
        except ValueError as e:
            return {
                "success": False,
                "requires_job_description": True,
                "error": str(e),
                "structured_resume": None,
                "job_details": None,
            }

    else:
        return {
            "success": False,
            "requires_job_description": True,
            "error": "Please provide a job URL or paste the job description.",
            "structured_resume": None,
            "job_details": None,
        }

    validated_job_details = await validate_job_details(
        job_details=job_details
    )

    structured_resume = await structure_resume_data(
        resume_data=parsed_resume
    )

    if not validated_job_details.is_valid:
        raise HTTPException(
            status_code=400,
            detail="Invalid job details",
        )

    return {
        "success": True,
        "requires_job_description": False,
        "structured_resume": structured_resume,
        "job_details": validated_job_details,
    }

async def delete_bullet(
    session_id: str,
    request: Request,
    sentence_id: int,
):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    snapshot = await graph_with_memory.aget_state(config)
    resume_to_edit = snapshot.values["resume_to_edit"]

    for section in type(resume_to_edit).model_fields:
        value = getattr(resume_to_edit, section)

        if not isinstance(value, list):
            continue

        for entry in value:
            bullets = getattr(entry, "bullets", None)

            if not bullets:
                continue

            for bullet in bullets:
                if bullet.sentence_id == sentence_id:
                    entry.bullets.remove(bullet)

                    await graph_with_memory.aupdate_state(
                        config,
                        {"resume_to_edit": resume_to_edit}
                    )

                    return {"status": "deleted"}

    return {"status": "not_found"}

# currently this deletes the right entry but more.
async def delete_entry(
    session_id: str,
    request: Request,
    entry_id: int,
):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    snapshot = await graph_with_memory.aget_state(config)
    resume_to_edit = snapshot.values["resume_to_edit"]

    for section in type(resume_to_edit).model_fields:
        value = getattr(resume_to_edit, section)

        if not isinstance(value, list):
            continue

        for entry in value:
            if entry.entry_id is not None and entry.entry_id == entry_id:
                print("found")
                print(entry_id)
                print(entry)
                value.remove(entry)
                await graph_with_memory.aupdate_state(
                    config,
                    {"resume_to_edit": resume_to_edit}
                )
                return {"status": "deleted"}

    return {"status": "not_found"}


async def apply_tailored_bullets(
    session_id: str,
    topic_id: str,
    request: Request,
):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    snapshot = await graph_with_memory.aget_state(config)
    state = snapshot.values

    resume_to_edit = state["resume_to_edit"]
    tailor_analysis = state["tailor_analysis"]

    found = False

    # Apply matched tailoring
    for tailored_matched in tailor_analysis.tailor_matched_list:
        if tailored_matched.topic_id != topic_id:
            continue

        found = True

        resume_reference = tailored_matched.resume_reference
        section = getattr(resume_to_edit, resume_reference.type)

        entry = next(
            (
                entry
                for entry in section
                if int(resume_reference.entry_id) == entry.entry_id
            ),
            None,
        )

        if entry is None:
            raise ValueError(
                f"Resume entry not found: {resume_reference.entry_id}"
            )

        for decision in tailored_matched.decisions:
            if decision.action == "MODIFY":
                for bullet in entry.bullets:
                    if bullet.sentence_id == decision.new_bullet.sentence_id:
                        bullet.text = decision.new_bullet.text
                        break

            elif decision.action == "ADD":
                next_sentence_id = get_next_sentence_id(resume=resume_to_edit)

                decision.new_bullet.sentence_id = next_sentence_id

                entry.bullets.append(
                    ResumeBullet(
                        text=decision.new_bullet.text,
                        sentence_id=next_sentence_id,
                    )
                )

        break

    # Apply unmatched tailoring
    for tailored_unmatched in tailor_analysis.tailor_unmatched_list:
        if tailored_unmatched.topic_id != topic_id:
            continue

        found = True

        section_type = tailored_unmatched.type
        section = getattr(resume_to_edit, section_type)

        bullets = [
            decision.new_bullet
            for decision in tailored_unmatched.decisions
            if decision.new_bullet is not None
        ]
        next_sentence_id = get_next_sentence_id(resume=resume_to_edit)

        for bullet in bullets:
            bullet.sentence_id = next_sentence_id
            next_sentence_id += 1

        entry_id = get_next_entry_id(resume=resume_to_edit)

        if section_type == "leadership":
            section.append(
                ResumeLeadership(
                    entry_id=entry_id,
                    title=tailored_unmatched.leadership_title,
                    position=tailored_unmatched.leadership_position,
                    bullets=bullets,
                )
            )

        elif section_type == "work_experience":
            section.append(
                ResumeExperience(
                    entry_id=entry_id,
                    company=tailored_unmatched.company_name,
                    job_title=tailored_unmatched.job_title,
                    location=tailored_unmatched.job_location,
                    duration=tailored_unmatched.duration,
                    bullets=bullets,
                    technologies=tailored_unmatched.skills,
                )
            )

        elif section_type == "projects":
            section.append(
                ResumeProject(
                    entry_id=entry_id,
                    project_name=tailored_unmatched.project_name,
                    bullets=bullets,
                    technologies=tailored_unmatched.skills,
                )
            )

        break

    if not found:
        return {
            "status": "not_found"
        }

    # Both paths mutate the same resume, so save once.
    await graph_with_memory.aupdate_state(
        config,
        {"resume_to_edit": resume_to_edit},
    )

    return {
        "status": "updated",
        "resume_to_edit": resume_to_edit,
    }


async def edit_resume_bullets(session_id: str, request: Request, sentence_id: int, new_text: str):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    snapshot = await graph_with_memory.aget_state(config)
    state = snapshot.values

    resume_to_edit = state["resume_to_edit"]

    for section in type(resume_to_edit).model_fields:
        value = getattr(resume_to_edit, section)

        if not isinstance(value, list):
            continue

        for entry in value:
            bullets = getattr(entry, "bullets", None)

            if not bullets:
                continue

            for bullet in bullets:
                if bullet.sentence_id == sentence_id:
                    bullet.text = new_text

                    await graph_with_memory.aupdate_state(
                        config,
                        {"resume_to_edit": resume_to_edit}
                    )

                    return {"status": "edited"}

    return {"status": "not_found"}

async def edit_tailored_bullets(session_id: str, topic_id: str, request: Request, sentence_id: int, new_text: str):

    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    snapshot = await graph_with_memory.aget_state(config)
    state = snapshot.values

    tailored_analysis = state["tailor_analysis"]

    all_tailored = (
        tailored_analysis.tailor_matched_list
        + tailored_analysis.tailor_unmatched_list
    )
    
    for tailored in all_tailored:
        if tailored.topic_id == topic_id:
            for decision in tailored.decisions:
                if decision.new_bullet is not None and decision.new_bullet.sentence_id == sentence_id:
                    decision.new_bullet.text = new_text
                    await graph_with_memory.aupdate_state(
                        config,
                        {"tailor_analysis": tailored_analysis}
                    )
                    return {"status": "updated"}
    return {
        "status": "not_found"
    }
            

            






