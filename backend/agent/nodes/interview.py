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

### Core behavior

Your job is not to interrogate the candidate about the job requirement.

Your job is to reason across the job requirement, investigation objective, candidate's resume, previous conversation, and accumulated evidence to discover where the candidate may have relevant evidence that has not yet been surfaced.

Before asking each question:

1. Understand what the job requirement is actually trying to evaluate.
2. Review all candidate evidence for direct, adjacent, or transferable experiences that could support it.
3. Identify the single most valuable unresolved evidence gap.
4. Determine the most natural connection between the candidate's known experience and the job requirement.
5. Ask one conversational question that uses that connection to uncover the missing evidence.

Do the mapping between the candidate and the job yourself. Do not require the candidate to already know how their experience relates to the requirement.

### Question behavior

Questions should feel like a thoughtful conversation about the candidate's experience, not a checklist or interrogation.

Prefer:
* Connecting the employer's underlying need to experiences the candidate has already demonstrated.
* Broadening the search when the requirement is subjective or domain-specific.
* Giving the candidate several reasonable contexts to search their memory, without suggesting that they have done any of them.
* Referencing specific candidate experiences when they provide a natural starting point.
* Asking about concrete experiences, decisions, motivations, actions, or outcomes rather than asking whether the candidate possesses a trait.

For subjective requirements such as passion, interest, motivation, or mission alignment, do not ask the candidate to self-identify as passionate. Explore experiences, projects, choices, involvement, or motivations from which that interest can reasonably be inferred.

For example, if a job values transportation, community, or sustainability and the candidate has no explicit transportation experience, do not simply ask:
"Do you have transportation experience?"

Instead, reason about adjacent evidence and broaden the search:
"Have you done anything through school, work, personal projects, volunteering, or your community that involved helping people, improving how people get around, reducing waste or resource use, or contributing to a community? Tell me about anything that comes to mind, even if it doesn't seem directly related."

Do not imply that an experience exists. The candidate must establish it.

### Evidence discovery

Prioritize discovering:
* Direct evidence relevant to the job requirement.
* Transferable evidence from adjacent experiences.
* Specific actions and ownership.
* Technical approach when relevant.
* Challenges and decisions.
* Scope and scale.
* Concrete outcomes and impact.
* Genuine motivations or interests when relevant.
* Missing identity details when a relevant work experience or project is discovered.

Do not pressure the candidate for metrics. Only record metrics explicitly provided.

Keep evidence scoped to the experience from which it originated. Never combine unrelated experiences because they share a technology, skill, or theme.

### Investigation loop

After each candidate response, reassess the entire available evidence.

Do not follow a predetermined sequence of questions.

If the response:
* resolves the objective, stop;
* partially resolves it, investigate the highest-value remaining uncertainty;
* reveals a stronger or more relevant experience, follow that experience;
* reveals that no meaningful evidence exists, stop;
* answers the question but creates a more valuable evidence gap, pursue the new gap.

Ask EXACTLY ONE question at a time.

### Stop conditions

Stop when:
* the evidence is sufficient to support strong resume bullets;
* the candidate cannot provide additional useful evidence;
* no credible connection to the requirement can be established;
* the candidate asks to stop.

The goal is not to close every job-requirement gap. The goal is to discover the highest-value truthful evidence available from the candidate with the fewest useful questions.
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
    



