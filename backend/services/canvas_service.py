from fastapi import Request

from core.concurrency import session_lock
from model.resume_schema import (
    ResumeBullet,
    ResumeCertification,
    ResumeEducation,
    ResumeExperience,
    ResumeLeadership,
    ResumeProject,
    ResumeSkills,
    ResumeStructure,
)
from services.date_sorter import (
    insert_entry_in_reverse_chronological_order,
    sort_section_in_reverse_chronological_order,
)
from services.id_generator import get_next_entry_id, get_next_sentence_id


async def delete_bullet(
    session_id: str,
    sentence_id: int,
    request: Request = None,
):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    async with session_lock(session_id):
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
    entry_id: int,
    request: Request = None,
):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    async with session_lock(session_id):
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


async def edit_entry(
    session_id: str,
    entry_id: int,
    patch_data: dict,
    request: Request = None,
):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    async with session_lock(session_id):
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


async def add_bullet(
    session_id: str,
    entry_id: int,
    text: str,
    request: Request = None,
):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    async with session_lock(session_id):
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


async def edit_bullet(
    session_id: str,
    sentence_id: int,
    new_text: str,
    request: Request = None,
):
    """Updates the text of a single bullet point on the working resume canvas."""
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    async with session_lock(session_id):
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


async def edit_skills(
    session_id: str,
    skills: ResumeSkills,
    request: Request = None,
):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    async with session_lock(session_id):
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


async def sync_resume(
    session_id: str,
    resume_to_edit: ResumeStructure,
    request: Request = None,
):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    async with session_lock(session_id):
        await graph_with_memory.aupdate_state(
            config,
            {"resume_to_edit": resume_to_edit}
        )

        return {
            "status": "updated",
            "resume_to_edit": resume_to_edit,
        }


async def add_entry(
    session_id: str,
    section_type: str,
    entry_data: dict,
    request: Request = None,
):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    async with session_lock(session_id):
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
