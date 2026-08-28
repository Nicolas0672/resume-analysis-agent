from typing import Annotated, Literal, Sequence, TypedDict

from langgraph.graph import add_messages
from langchain_core.messages import BaseMessage

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    resume_data: dict
    job_details: dict
    score: Literal["weak match", "good match", "strong match"]
