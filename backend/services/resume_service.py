"""Specialized service aggregations for resume processing."""

from services.analysis_service import (
    MAX_JOB_DESCRIPTION_LENGTH,
    prepare_resume_and_job_inputs,
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
from services.tailoring_service import (
    apply_tailored_topic,
    edit_tailored_proposal_bullet,
)

__all__ = [
    "MAX_JOB_DESCRIPTION_LENGTH",
    "prepare_resume_and_job_inputs",
    "delete_bullet",
    "delete_entry",
    "edit_entry",
    "add_bullet",
    "edit_skills",
    "sync_resume",
    "edit_bullet",
    "add_entry",
    "apply_tailored_topic",
    "edit_tailored_proposal_bullet",
]
