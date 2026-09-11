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
    relevant_experience: list[str] = Field(description="Relevant experience from candidate profile data. Do not mesh experience together that are from different sections")
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
    experience_found: Optional[list[str]]
    technologies: Optional[list[str]]
    ownership: Optional[list[str]]
    scope: Optional[list[str]]
    metrics: Optional[list[str]]
    impact: Optional[list[str]]
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


class TailorMatched(BaseModel):
    next_action: Literal["KEEP", "MODIFY", "ADD"]
    old_bullet_points: Optional[list[ResumeBullet]]
    new_bullet_points: Optional[list[ResumeBullet]]
    reasoning: str
    evidence: list[str]
    resume_reference: ResumeReference = Field(
        description=(
            "Copy the resume_reference from the input exactly. "
            "This is an immutable identifier. Never modify or generate it."
        )
    )
    topic_id: str = Field(description="Copy the topic_id from the input exactly. Do not modify or generate new one")

class TailorUnmatched(BaseModel):
    next_action: Literal["ADD"] 
    new_bullet_points: list[ResumeBullet] = Field(description="New bulletpoint points, utilizing XYZ format, accomplished X, as measured by Y, by doing Z, if enough details is present such as metrics/impact. Ensure bullet points created are aligned with job requirement. Do not invent metrics or details if not present")
    company_name: Optional[str] = Field("Company name if experience learned from work. Otherwise return None")
    duration: Optional[str] = Field("Duration of work experience if provided. Example: Dec 2024 - Present")
    job_location: Optional[str]
    job_title: Optional[str] = Field("Job title at company if experienced learned from work. Otherwise return None")
    skills: Optional[list[str]] = Field("List of technologies or skills that was used from the experience")
    project_name: Optional[str] = Field("Project name where experience was learned. Return None if experience was learned from work")
    reasoning: str
    evidence: list[str] = Field(description="Supporting evidence backed up by real data")
    topic_id: str = Field(description="Copy the topic_id from the input exactly. Do not modify or generate new one")

class TailorMatchList(BaseModel):
    tailor_matched: List[TailorMatched]

class TailorUnmatchedList(BaseModel):
    tailor_unmatched: List[TailorUnmatched]

class TailorAnalysis(BaseModel):
    tailor_matched_list: list[TailorMatched] = []
    tailor_unmatched_list: list[TailorUnmatched] = []

class Feedback(BaseModel):
    valid: bool = Field(
        description="Whether the proposed bullet is factually supported by the candidate's evidence."
    )

    suggestions: str = Field(
        description="If invalid, identify the specific claim that is unsupported or missing evidence, state that the claim must be removed or corrected, and explain which evidence limitation makes it inaccurate. If valid, state that no factual correction is required."
    )

    topic_id: str = Field(
        description="The topic ID associated with the evidence used to evaluate this bullet."
    )

class RegeneratedBullets(BaseModel):
    topic_id: str
    new_bullet_points: list[ResumeBullet] = Field(description="New bulletpoint points, utilizing XYZ format, accomplished X, as measured by Y, by doing Z, if enough details is present such as metrics/impact. Ensure bullet points created are aligned with job requirement. Do not invent metrics or details if not present")
    reasoning: str

class Feedbacks(BaseModel):
    feedbacks: List[Feedback]

class RegeneratedBulletsList(BaseModel):
    regenerated_bullet_list: List[RegeneratedBullets]

















