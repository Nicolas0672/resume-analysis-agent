from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class CandidateAnalysis(BaseModel):
    score: Literal["weak match", "good match", "strong match"] = Field(description="The score of the candidate's resume against the job description.")
    relevant_experience: Optional[str] = Field(description="Relevant experience from candidate's profile that closely matches the job description. If no relevant experience is found, this field will be None")
    strengths: list[str] = Field(description="List of strengths found in the candidate's profile.")
    gaps: list[str] = Field(description="List of gaps found in the candidate's profile.")
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




