
from fastapi import HTTPException, Request

from backend.model.job_pydantic import ResumeBullet, ResumeExperience, ResumeLeadership, ResumeProject
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


async def apply_tailored_bullets(session_id: str, topic_id: str, request: Request):
    config = {
        "configurable": {
            "thread_id": session_id
        }
    }

    graph_with_memory = request.app.state.graph_with_memory

    snapshot = await graph_with_memory.aget_state(config)
    state = snapshot.values

    resume_to_edit = state["resume_to_edit"]

    for tailored_matched in state["tailor_analysis"].tailor_matched_list:
        if tailored_matched.topic_id == topic_id:
            resume_reference = tailored_matched.resume_reference
            section = getattr(resume_to_edit, resume_reference.type)
            entries = next(entry for entry in section if resume_reference.entry_id == entry.entry_id)


            for decision in tailored_matched.decisions:
                if decision.action == "MODIFY":

                    for bullet in entries.bullets:
                        if bullet.sentence_id == decision.new_bullet.sentence_id:
                            bullet.text = decision.new_bullet.text

                elif decision.action == "ADD":
                    entries.bullets.append(ResumeBullet(text=decision.new_bullet.text, sentence_id="ADD"))
                    # will need to generate new sentence ID

    for tailored_unmatched in state["tailor_analysis"].tailor_unmatched_list:
        if tailored_unmatched.topic_id == topic_id:
            section = getattr(resume_to_edit, tailored_unmatched.type)

            bullets = [
                decision.new_bullet
                for decision in tailored_unmatched.decisions
                if decision.new_bullet is not None
            ]

            if tailored_unmatched.type == "leadership":
                section.append(ResumeLeadership(entry_id="ADD", title=tailored_unmatched.leadership_title, position=tailored_unmatched.leadership_position, bullets=bullets))
            elif tailored_unmatched.type == "work_experience":
                section.append(ResumeExperience(entry_id="ADD", company=tailored_unmatched.company_name, job_title=tailored_unmatched.job_title, location=tailored_unmatched.job_location, duration=tailored_unmatched.duration, bullets=bullets, technologies=tailored_unmatched.skills))
            elif tailored_unmatched.type == "projects":
                section.append(ResumeProject(entry_id="ADD", project_name=tailored_unmatched.project_name, bullets=bullets, technologies=tailored_unmatched.skills))
    await graph_with_memory.aupdate_state(
        config,
        {"resume_to_edit": state["resume_to_edit"]}
    )

    return {
        "status": "updated",
        "resume_to_edit": resume_to_edit
    }







