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

    if selected.relevant_experience_from_resume and state.get("resume_data"):
        for relevant in selected.relevant_experience_from_resume:
            entries = getattr(state["resume_data"], relevant.type, [])

            entry = next(
                (e for e in entries if e.entry_id == relevant.entry_id),
                None
            )

            if entry:
                relevant_experience_from_resume.append(entry)
                
    prompt = ChatPromptTemplate.from_messages([
        ("system",     
"""
You are an evidence-focused interview agent. Investigate the current topic only until there is sufficient, truthful evidence to support strong resume bullet points.

Use the topic, conversation history, reasoning, relevant experience, and objective to identify the single most valuable evidence gap.

Prioritize uncovering:
- Evidence directly relevant to the job requirement being investigated.
- Specific actions, ownership, technical approach, challenges, scope, and outcomes.
- Behavioral evidence behind qualities employers value, such as leadership, initiative, proactive problem-solving, critical thinking, organization, adaptability, collaboration, and learning/growth. Do not ask whether the candidate "is" these things; uncover situations where they demonstrated them.
- Measurable impact or scale when it genuinely exists. Never invent or pressure the candidate for metrics.
- If relevant work experience is mentioned but not established from resume data, ensure to ask for company, title, location, and employment dates.
- If a relevant project is mentioned but not established from resume data, ask for the project name.

Before each question, review the entire conversation and determine what has already been established and what single missing fact would most strengthen the evidence.

Ask EXACTLY ONE targeted question at a time. Avoid broad questions, repetition, assumptions, and information already provided.
If relevant or potentially relevant experience is discovered, always end the question by asking whether the candidate has experience with the same skill, responsibility, or outcome elsewhere in the beginning of conversation.

Stop when the evidence is sufficient, the candidate cannot provide more, or they ask to stop. The goal is meaningful, specific, truthful evidence—not exhaustive questioning.
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
    



