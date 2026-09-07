from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from backend.model.job_pydantic import ResumeBullet

# EXPAND field to provide more context based on resume data
class CandidateAnalysis(BaseModel):
    score: Literal["weak match", "good match", "strong match"] = Field(description=
"""
Overall fit based on ALL job requirements. Be strict and evidence-based. Strong experience in a few areas does not compensate for multiple missing hard requirements.
""")
    relevant_experience: Optional[str] = Field(description="Relevant experience from candidate's profile that closely matches the job description. If no relevant experience is found, this field will be None")
    strengths: Optional[list[str]] = Field(description="Confirmed matches, including technical skills, tools, platforms, domain knowledge, experience, education, coursework, and relevant soft skills when explicitly supported.")
    gaps: Optional[list[str]] = Field(description=
"""
Identify meaningful evidence gaps in the candidate's qualifications, skills, experience, or background relative to the job requirements.
A gap should also identify cases where the candidate has relevant experience, but important evidence is missing or unclear. For example: "Candidate worked on Project A, which is relevant to X requirement, but their specific contribution/impact/metrics are unclear."
Focus on missing or unclear responsibilities, technical details, scope, impact, outcomes, metrics, or relevance.
Do not identify gaps related to work authorization, citizenship, availability, timing, eligibility, or semester-remaining requirements.
Do not include redundant or overlapping gaps. Each gap must represent a distinct deficiency.
If no meaningful gaps are found, return an empty list.
""")
    user_message: str = Field(description="A message to the user providing insights on the candidate's resume and relevant experience.")


class ResumeReference(BaseModel):
    type: Literal["projects", "work_experience", "leadership"]
    entry_id: str = Field(
    description="The entry_id of the resume entry being referenced."
        )

class InterviewDetails(BaseModel):
    topic_id: str = Field(description="Unique identifier for topic")
    priority: Literal["Low", "Medium", "High"]
    relevant_experience: list[str]
    relevant_experience_from_resume: Optional[list[ResumeReference]] = Field(
        description=(
            "References to the complete resume entries relevant to this topic. "
            "The reference identifies the entry by type and entry_id. If none found, return None"
        )
    )    
    topic: str
    reason: str
    objective: str
    job_requirement: str = Field(description="The job requirements listed for this skill")

class InterviewPlan(BaseModel):
    interview_plan: List[InterviewDetails]

class Evidence(BaseModel):
    project_name: Optional[str]
    experience_found: Optional[str]
    technologies: Optional[list[str]]
    ownership: Optional[str]
    scope: Optional[str]
    metrics: Optional[str]
    impact: Optional[str]
    company: Optional[str]
    job_title: Optional[str]
    job_location: Optional[str]
    duration: Optional[str]

class InvestigateOutput(BaseModel):
    need_more_info: bool = Field(description="If more context is needed to investigate candidate experience, return True, else False")
    user_message: str = Field(description="Message to the user asking for more details/clarification or letting them know they've provided enough context")
    evidence: Evidence | None

class EvidenceWithDetails(BaseModel):
    evidence: Evidence | None = Field(description="Evidence found in the candidate's resume or profile data that supports their experience and qualifications for the job requirements. If no evidence is found, this field will be None")
    job_requirement: str
    topic_id: str

class EvidenceMapping(BaseModel):
    evidence_with_details: EvidenceWithDetails 
    resume_reference: ResumeReference
    mapping_status: Literal["MATCHED", "UNMATCHED"] = Field(description="If bullet points are found that match evidence, return MATCH else return UNMATCHED")
    reasoning: Optional[str] = None

class EvidenceMappingResult(BaseModel):
    evidence_mappings: List[EvidenceMapping]

class TailorAnalysis(BaseModel):
    next_action: Literal["KEEP", "MODIFY", "ADD"] 
    old_bullet_points: Optional[list[ResumeBullet]]
    new_bullet_points: list[ResumeBullet]
    reasoning: str
    evidence: str = Field(description="Supporting evidence backed up by real data")

















