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
    priotize: Literal["Low", "Medium", "High"]
    relevant_experience: list[str]
    topic: str
    reason: str
    objective: str

class InterviewPlan(BaseModel):
    interview_plan: List[InterviewDetails]


