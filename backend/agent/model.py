from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class CandidateAnalysis(BaseModel):
    score: Literal["weak match", "good match", "strong match"] = Field(description=
"""
Overall fit based on ALL job requirements. Be strict and evidence-based. Strong experience in a few areas does not compensate for multiple missing hard requirements.
""")
    relevant_experience: Optional[str] = Field(description="Relevant experience from candidate's profile that closely matches the job description. If no relevant experience is found, this field will be None")
    strengths: Optional[list[str]] = Field(description="Confirmed matches, including technical skills, tools, platforms, domain knowledge, experience, education, coursework, and relevant soft skills when explicitly supported.")
    gaps: Optional[list[str]] = Field(description=
"""
Identify only meaningful deficiencies in the candidate's qualifications, skills, experience, or background relative to the job requirements. Do not identify gaps related to work authorization, citizenship, availability, timing, eligibility, or semester-remaining requirements, as these criteria should be assumed satisfied.
relevant_experience: Relevant experience from candidate_profile_data ONLY. Return null if none is relevant.
Do not include redundant, overlapping, or substantially similar gaps. Each gap should represent a distinct meaningful deficiency.
If no gaps are found, return empty list.
""")
    user_message: str = Field(description="A message to the user providing insights on the candidate's resume and relevant experience.")

class InterviewDetails(BaseModel):
    topic_id: str = Field(description="Unique identifier for topic")
    priority: Literal["Low", "Medium", "High"]
    relevant_experience: list[str]
    topic: str
    reason: str
    objective: str
    job_requirement: str = Field(description="The job requirements listed for this skill")

class InterviewPlan(BaseModel):
    interview_plan: List[InterviewDetails]

class Evidence(BaseModel):
    experience_found: Optional[str]
    technologies: list[str]
    ownership: Optional[str]
    scope: Optional[str]
    metrics: Optional[str]
    impact: Optional[str]

class InvestigateOutput(BaseModel):
    need_more_info: bool = Field(description="If more context is needed to investigate candidate experience, return True, else False")
    user_message: str = Field(description="Message to the user asking for more details/clarification or letting them know they've provided enough context")
    evidence: Evidence | None

class InterviewDetailsWithEvidence(BaseModel):
    evidence: Evidence | None 
    interview_details: InterviewDetails | None




