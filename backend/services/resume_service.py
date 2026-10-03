
from fastapi import HTTPException, Request

from model.job_pydantic import (
    ResumeBullet,
    ResumeCertification,
    ResumeEducation,
    ResumeExperience,
    ResumeLeadership,
    ResumeProject,
    ResumeSkills,
    ResumeStructure,
)
from services.helper import (
    get_next_entry_id,
    get_next_sentence_id,
    insert_entry_in_reverse_chronological_order,
    sort_section_in_reverse_chronological_order,
)
from services.resume_pre_llm import structure_resume_data, validate_job_details
from services.job_fetcher import fetch_job_details
from services.document_parser import open_docx, parse_docx, parse_resume

MAX_JOB_DESCRIPTION_LENGTH = 15000

async def process_resume_analysis(
    file_bytes: bytes,
    job_url: str | None = None,
    job_description: str | None = None,
):
    parsed_resume = parse_resume(file_bytes)

    if job_description:
        if len(job_description) > MAX_JOB_DESCRIPTION_LENGTH:
            return {
                "success": False,
                "requires_job_description": True,
                "error": "The pasted job description is too large. Please paste a shorter job description.",
                "structured_resume": None,
                "job_details": None,
            }

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
                    entry.bullets = [b for b in entry.bullets if b.sentence_id != sentence_id]

                    await graph_with_memory.aupdate_state(
                        config,
                        {"resume_to_edit": resume_to_edit}
                    )

                    return {
                        "status": "deleted",
                        "resume_to_edit": resume_to_edit
                    }

    return {"status": "not_found"}


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

        matching_entries = [e for e in value if getattr(e, "entry_id", None) == entry_id]
        if matching_entries:
            setattr(resume_to_edit, section, [e for e in value if getattr(e, "entry_id", None) != entry_id])
            await graph_with_memory.aupdate_state(
                config,
                {"resume_to_edit": resume_to_edit}
            )
            return {
                "status": "deleted",
                "resume_to_edit": resume_to_edit
            }

    return {"status": "not_found"}


async def update_resume_entry(
    session_id: str,
    request: Request,
    entry_id: int,
    patch_data: dict,
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
            if getattr(entry, "entry_id", None) == entry_id:
                for field_name, field_value in patch_data.items():
                    if (
                        field_value is not None
                        and hasattr(entry, field_name)
                        and field_name not in ("entry_id", "bullets", "sentence_ids")
                    ):
                        setattr(entry, field_name, field_value)

                # If duration or date was updated, maintain reverse chronological order
                if "duration" in patch_data or "date" in patch_data:
                    sort_section_in_reverse_chronological_order(value)

                await graph_with_memory.aupdate_state(
                    config,
                    {"resume_to_edit": resume_to_edit}
                )

                return {
                    "status": "updated",
                    "resume_to_edit": resume_to_edit,
                }

    return {"status": "not_found"}


async def add_resume_bullet(
    session_id: str,
    request: Request,
    entry_id: int,
    text: str,
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
            if getattr(entry, "entry_id", None) == entry_id:
                bullets = getattr(entry, "bullets", None)
                if bullets is None or not isinstance(bullets, list):
                    continue

                next_sentence_id = get_next_sentence_id(resume=resume_to_edit)
                new_bullet = ResumeBullet(
                    text=text,
                    sentence_id=next_sentence_id,
                )
                entry.bullets.append(new_bullet)

                await graph_with_memory.aupdate_state(
                    config,
                    {"resume_to_edit": resume_to_edit}
                )

                return {
                    "status": "added",
                    "bullet": new_bullet,
                    "resume_to_edit": resume_to_edit,
                }

    return {"status": "not_found"}


async def edit_resume_skills(
    session_id: str,
    request: Request,
    skills: ResumeSkills,
):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    snapshot = await graph_with_memory.aget_state(config)
    resume_to_edit = snapshot.values["resume_to_edit"]

    resume_to_edit.skills = skills

    await graph_with_memory.aupdate_state(
        config,
        {"resume_to_edit": resume_to_edit}
    )

    return {
        "status": "updated",
        "resume_to_edit": resume_to_edit,
    }


async def update_full_resume(
    session_id: str,
    request: Request,
    resume_to_edit: ResumeStructure,
):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    await graph_with_memory.aupdate_state(
        config,
        {"resume_to_edit": resume_to_edit}
    )

    return {
        "status": "updated",
        "resume_to_edit": resume_to_edit,
    }



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
    applied_ids = state.get("applied_tailored_topic_ids") or []

    if topic_id in applied_ids:
        return {
            "status": "already_applied",
            "resume_to_edit": resume_to_edit,
            "applied_tailored_topic_ids": applied_ids,
        }

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
            new_leadership = ResumeLeadership(
                entry_id=entry_id,
                title=tailored_unmatched.leadership_title,
                position=tailored_unmatched.leadership_position,
                bullets=bullets,
                duration=tailored_unmatched.duration,
                location=tailored_unmatched.job_location,
            )
            insert_entry_in_reverse_chronological_order(section, new_leadership)

        elif section_type == "work_experience":
            new_experience = ResumeExperience(
                entry_id=entry_id,
                company=tailored_unmatched.company_name,
                job_title=tailored_unmatched.job_title,
                location=tailored_unmatched.job_location,
                duration=tailored_unmatched.duration,
                bullets=bullets,
                technologies=tailored_unmatched.skills,
            )
            insert_entry_in_reverse_chronological_order(section, new_experience)

        elif section_type == "projects":
            new_project = ResumeProject(
                entry_id=entry_id,
                project_name=tailored_unmatched.project_name,
                bullets=bullets,
                technologies=tailored_unmatched.skills,
                duration=tailored_unmatched.duration,
                location=tailored_unmatched.job_location,
            )
            insert_entry_in_reverse_chronological_order(section, new_project)

        break

    if not found:
        return {
            "status": "not_found"
        }

    # Both paths mutate the same resume, so save once.
    await graph_with_memory.aupdate_state(
        config,
        {"resume_to_edit": resume_to_edit, "applied_tailored_topic_ids": [topic_id]},
    )

    return {
        "status": "updated",
        "resume_to_edit": resume_to_edit,
        "applied_tailored_topic_ids": list(dict.fromkeys(applied_ids + [topic_id])),
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

                    return {
                        "status": "edited",
                        "resume_to_edit": resume_to_edit,
                        }

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
                    return {
                        "status": "updated",
                        "tailor_analysis": tailored_analysis
                        }
    return {
        "status": "not_found"
    }


async def add_resume_entry(
    session_id: str,
    request: Request,
    section_type: str,
    entry_data: dict,
):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    snapshot = await graph_with_memory.aget_state(config)
    resume_to_edit = snapshot.values["resume_to_edit"]

    if not hasattr(resume_to_edit, section_type):
        return {"status": "invalid_section"}

    section = getattr(resume_to_edit, section_type)
    if not isinstance(section, list):
        return {"status": "invalid_section"}

    model_map = {
        "work_experience": ResumeExperience,
        "education": ResumeEducation,
        "projects": ResumeProject,
        "leadership": ResumeLeadership,
        "certifications": ResumeCertification,
    }
    target_cls = model_map.get(section_type)
    if not target_cls:
        return {"status": "invalid_section"}

    entry_id = get_next_entry_id(resume=resume_to_edit)
    entry_dict = {**entry_data, "entry_id": entry_id}

    if "bullets" in entry_dict and isinstance(entry_dict["bullets"], list):
        next_sid = get_next_sentence_id(resume=resume_to_edit)
        formatted_bullets = []
        for b in entry_dict["bullets"]:
            if isinstance(b, dict):
                formatted_bullets.append(
                    ResumeBullet(
                        text=b.get("text", ""),
                        sentence_id=b.get("sentence_id") or next_sid,
                    )
                )
                next_sid += 1
            elif isinstance(b, str):
                formatted_bullets.append(
                    ResumeBullet(text=b, sentence_id=next_sid)
                )
                next_sid += 1
        entry_dict["bullets"] = formatted_bullets

    new_entry = target_cls(**entry_dict)
    insert_entry_in_reverse_chronological_order(section, new_entry)

    await graph_with_memory.aupdate_state(
        config,
        {"resume_to_edit": resume_to_edit}
    )

    return {
        "status": "added",
        "entry": new_entry,
        "resume_to_edit": resume_to_edit,
    }

            

            






