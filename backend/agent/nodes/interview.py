from langchain_openai import ChatOpenAI

from backend.agent.model import EvidenceWithDetails, InvestigateOutput
from backend.agent.state import AgentState
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import AIMessage

async def investigate_candidate(state: AgentState):
    topic_id = state["topic_id_selection"]
    conversation_history = state["investigation_messages"] if len(state["investigation_messages"]) > 0 else "No previous conversation available as of current"

    selected = next(
        item
        for item in state.get("interview_plan").interview_plan
        if item.topic_id == topic_id
    )

    relevant_experience_from_resume = []

    for relevant in selected.relevant_experience_from_resume:
        entries = getattr(state["resume_data"], relevant.type)

        entry = next(
            (e for e in entries if e.entry_id == relevant.entry_id),
            None
        )

        if entry:
            relevant_experience_from_resume.append(entry)


    prompt = ChatPromptTemplate.from_messages([
        ("system",     
"""
Your task is to investigate the current topic until the investigation objective has sufficient evidence.

Use the provided topic, reasoning, relevant experience, and objective to determine what information is missing.

The goal is to uncover genuine, concrete evidence that can later support strong resume bullet points. Prioritize the candidate's specific actions, ownership, technical approach, scope, challenges, outcomes, impact, and measurable results when available.
If the candidate mentions gaining relevant experience through work and is not specified from resume data, ensure to ask for the company, job title, job location and duration of employment from start to end or present if still employed.
If the candidate mentions gaining relevant experience through a project and is not specified from resume data, ensure to ask for the project name.

Before asking each question:

* Review the entire conversation history.
* Identify what has already been established.
* Identify the specific evidence gap.
* Determine what missing information would most strengthen the evidence.

Ask exactly ONE question at a time.

Ask targeted questions that encourage specific, factual answers rather than broad descriptions. When relevant, probe for measurable impact, scale, outcomes, or metrics.

Never assume, invent, or pressure the candidate to provide metrics or outcomes that do not exist.

Do not ask for information that has already been established or repeatedly rephrase the same question.

If the gap has been sufficiently addressed and there is enough evidence to support strong resume content, stop investigating.

If the candidate cannot answer further or asks to end the investigation, stop asking questions and use the evidence already provided.

The goal is to uncover meaningful, specific, and truthful evidence that can later be translated into strong resume content, not to exhaustively investigate the candidate.
"""),
    ("human", 
     """conversation history: {conversation_history}, 
        topic: {topic}, 
        reasoning for investigation: {reason}, 
        any relevant experience: {relevant_experience}
        objective: {objective}  
        job requirement for context: {job_requirement}
        relevant experience from resume: {relevant_experience_from_resume}
     """)
    ])

    model = ChatOpenAI(model="gpt-4o")
    llm_structured = model.with_structured_output(InvestigateOutput)
    response = await llm_structured.ainvoke(prompt.format_messages(
        topic=selected.topic, reason=selected.reason, relevant_experience=selected.relevant_experience,
        objective=selected.objective, job_requirement=selected.job_requirement, conversation_history=conversation_history, relevant_experience_from_resume=relevant_experience_from_resume
        ))
    
    if response.need_more_info == False:
        updated_details = EvidenceWithDetails(
            job_requirement=selected.job_requirement, topic_id=selected.topic_id, evidence=response.evidence
        )
        return {
            "investigation_messages": [AIMessage(content=response.user_message)],
            "need_more_info": response.need_more_info,
            "evidence_with_details": [updated_details],
            "completed_topic_ids": [topic_id]
        }


    return {
        "investigation_messages": [AIMessage(content=response.user_message)],
        "need_more_info": response.need_more_info,
    }
    



