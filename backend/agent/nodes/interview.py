from langchain_openai import ChatOpenAI

from backend.agent.model import EvidenceWithDetails, InvestigateOutput
from backend.agent.state import AgentState
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import AIMessage, RemoveMessage

# investigation messages need to be cleared for a new topic id run
# evidence with details should be passed in to continue convo for other topics if related

def reset_investigation(state: AgentState):
    return {
        "investigation_messages": [
            RemoveMessage(id=message.id)
            for message in state["investigation_messages"]
        ]
    }

async def investigate_candidate(state: AgentState):
    topic_id = state["topic_id_selection"]
    conversation_history = state["investigation_messages"] if len(state["investigation_messages"]) > 0 else "No previous conversation available as of current"
    evidence_with_details = state.get("evidence_with_details", "No evidence available from candidate")

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

The candidate's `evidence_with_details` is an accumulated evidence bank from previous investigations. Treat it as established candidate knowledge and use it alongside the current conversation to determine what is already known and what evidence is still missing.

### Investigation approach

* Use the current topic, objective, job requirement, relevant resume experience, conversation history, and accumulated evidence to identify the **single highest-value missing fact**.
* Do not treat the current topic as an isolated investigation. Evidence discovered during previous topics may answer, partially answer, or provide context for the current investigation.
* Never ask for information that is already established in the accumulated evidence unless clarification is necessary.
* If existing evidence reveals a relevant experience, skill, responsibility, technology, or outcome that can strengthen the current investigation, explore that evidence rather than starting from scratch.
* Keep evidence scoped to the experience it came from. Do not combine unrelated experiences simply because they share a skill or technology.

Prioritize uncovering:

* Evidence directly relevant to the job requirement.
* Specific actions, ownership, technical approach, challenges, scope, and outcomes.
* Behavioral evidence demonstrated through concrete situations, such as leadership, initiative, problem-solving, critical thinking, organization, adaptability, collaboration, and learning.
* Measurable impact or scale when it genuinely exists. Never invent or pressure the candidate for metrics.
* Missing identity details when a relevant work experience or project is discovered:

  * Work: company, title, location, and employment dates.
  * Project: project name.

### Questioning

Before each question, review:

1. The entire current conversation.
2. All accumulated `evidence_with_details`.
3. The current topic and its objective.

Then determine the **single missing fact that would provide the most valuable additional evidence**.

Ask EXACTLY ONE targeted question at a time. Avoid broad questions, repetition, assumptions, and information already established.

If relevant or potentially relevant experience is discovered, end the question by asking whether the candidate has demonstrated the same skill, responsibility, or outcome elsewhere, but only when that additional experience could provide useful evidence.

### Stop conditions

Stop when:

* The evidence is sufficient to support strong resume bullets.
* The candidate cannot provide additional evidence.
* The candidate asks to stop.

The goal is to build a high-quality, truthful evidence bank over the course of the investigation—not to exhaustively question the candidate or fully close every job-requirement gap.
"""),
    ("human", 
     """conversation history: {conversation_history}, 
        topic: {topic}, 
        reasoning for investigation: {reason}, 
        any relevant experience: {relevant_experience}
        objective: {objective}  
        job requirement for context: {job_requirement}
        relevant experience from resume: {relevant_experience_from_resume}
        evidence_with_details: {evidence_with_details}
     """)
    ])

    model = ChatOpenAI(model="gpt-4o")
    llm_structured = model.with_structured_output(InvestigateOutput)
    response = await llm_structured.ainvoke(prompt.format_messages(
        topic=selected.topic, reason=selected.reason, relevant_experience=selected.relevant_experience,
        objective=selected.objective, job_requirement=selected.job_requirement, conversation_history=conversation_history, relevant_experience_from_resume=relevant_experience_from_resume,
        evidence_with_details=evidence_with_details
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
    



