from langchain_openai import ChatOpenAI

from backend.agent.model import InterviewDetailsWithEvidence, InvestigateOutput
from backend.agent.state import AgentState
from langchain_core.prompts import ChatPromptTemplate

async def investigate_candidate(state: AgentState):
    topic_id = state["topic_id_selection"]
    conversation_history = state["investigation_messages"] if len(state["investigation_messages"]) > 0 else "No previous conversation available as of current"

    selected = next(
        item
        for item in state.get("interview_plan").interview_plan
        if item.topic_id == topic_id
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system",     
"""
Your task is to investigate the current topic until the investigation
objective can be answered with sufficient evidence. If determined that the candidate
does not have enough required experience to confidently answer the objective, return a message to the user that more experience is needed

Before asking another question, determine whether you already have
enough information about:
- what the candidate actually did
- their personal ownership
- relevant technical context
- scope
- outcomes/metrics when applicable

Do not ask for information that has already been established.
Ask exactly one question at a time.

If the objective has been sufficiently satisfied, stop investigating.
"""),
    ("human", 
     """conversation history: {conversation_history}, topic: {topic}, reasoning for investigation: {reason}, any relevant experience: {relevant_experience}
        objective: {objective} and job requirement for context: {job_requirement}
     """)
    ])

    model = ChatOpenAI(model="gpt-4o")
    llm_structured = model.with_structured_output(InvestigateOutput)
    response = await llm_structured.ainvoke(prompt.format_messages(
        topic=selected.topic, reason=selected.reason, relevant_experience=selected.relevant_experience,
        objective=selected.objective, job_requirement=selected.job_requirement, conversation_history=conversation_history
        ))
    
    if response.need_more_info == False:
        updated_details = InterviewDetailsWithEvidence(
            interview_details=selected, evidence=response.evidence
        )
        return {
            "investigation_messages": response.user_message,
            "need_more_info": response.need_more_info,
            "interview_details_with_evidence": updated_details,
            "completed_topic_ids": topic_id
        }


    return {
        "investigation_messages": response.user_message,
        "need_more_info": response.need_more_info,
    }
    



