from fastapi import Request

from core.concurrency import session_lock
from model.resume_schema import (
    ResumeBullet,
    ResumeExperience,
    ResumeLeadership,
    ResumeProject,
)
from services.date_sorter import insert_entry_in_reverse_chronological_order
from services.id_generator import get_next_entry_id, get_next_sentence_id


async def apply_tailored_topic(
    session_id: str,
    topic_id: str,
    request: Request = None,
):
    """Applies all tailored proposals (modifications & new reverse-chronological entries)
    for a given topic_id to the candidate's working resume (resume_to_edit).
    Enforces idempotency: reapplying a topic will not duplicate entries.
    """
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
        tailor_analysis = state["tailor_analysis"]
        applied_ids = state.get("applied_tailored_topic_ids") or []

        if topic_id in applied_ids:
            return {
                "status": "already_applied",
                "resume_to_edit": resume_to_edit,
                "applied_tailored_topic_ids": applied_ids,
            }

        found = False

        # Apply matched tailoring (updates or adds bullets to existing experience/project/leadership)
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

        # Apply unmatched tailoring (inserts brand new experience/project/leadership entries)
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

        # Persist updated resume_to_edit state under lock
        await graph_with_memory.aupdate_state(
            config,
            {"resume_to_edit": resume_to_edit, "applied_tailored_topic_ids": [topic_id]},
        )

        return {
            "status": "updated",
            "resume_to_edit": resume_to_edit,
            "applied_tailored_topic_ids": list(dict.fromkeys(applied_ids + [topic_id])),
        }


async def edit_tailored_proposal_bullet(
    session_id: str,
    topic_id: str,
    sentence_id: int,
    new_text: str,
    request: Request = None,
):
    """Edits the text of an individual proposed bullet point in tailor_analysis
    prior to application to the resume.
    """
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    async with session_lock(session_id):
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
