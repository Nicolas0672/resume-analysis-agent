from fastapi import HTTPException
from langchain_openai import ChatOpenAI

from agent.model import EvidenceWithDetails, InvestigateOutput
from agent.state import AgentState
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import AIMessage, RemoveMessage
from langchain_google_genai import ChatGoogleGenerativeAI


def validate_experience_metadata(metadata: dict | None) -> tuple[bool, str]:
    if not metadata or not metadata.get("experience_type"):
        return False, "Please select an experience type (Work Experience, Project, Leadership, or Other) and fill in the required fields before saving evidence."
    
    exp_type = metadata.get("experience_type")
    if exp_type == "work_experience":
        if not metadata.get("company") or not str(metadata.get("company")).strip():
            return False, "Company Name is required for Work Experience."
        if not metadata.get("job_title") or not str(metadata.get("job_title")).strip():
            return False, "Job Title is required for Work Experience."
    elif exp_type == "project":
        if not metadata.get("project_name") or not str(metadata.get("project_name")).strip():
            return False, "Project Name is required for Project Experience."
        if not metadata.get("role") or not str(metadata.get("role")).strip():
            return False, "Your Role is required for Project Experience."
    elif exp_type == "leadership":
        if not metadata.get("leadership_title") or not str(metadata.get("leadership_title")).strip():
            return False, "Organization / Activity Title is required for Leadership."
        if not metadata.get("position") or not str(metadata.get("position")).strip():
            return False, "Position is required for Leadership."
    elif exp_type == "other":
        if not metadata.get("other_title") or not str(metadata.get("other_title")).strip():
            return False, "Experience Title is required for Other Experience."
    return True, ""


def reset_investigation(state: AgentState):
    return {
        "investigation_messages": [
            RemoveMessage(id=message.id)
            for message in state["investigation_messages"]
        ],
        "human_investigate_action": "chat",
        "active_experience_metadata": None,
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

Once determined that the candidate has provided sufficient evidence, mention that Candidate should click on "Wrap Up And Save Evidence" to concluyde the investigation.
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

### Question behavior

Ask EXACTLY ONE question at a time. The candidate controls when to conclude or skip the investigation. Your role during active chat is to ask one thoughtful, conversational question to explore relevant evidence that has not yet been surfaced.
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

    active_metadata = state.get("active_experience_metadata") or {}
    action = state.get("human_investigate_action", "chat")

    # Case 1: Human explicitly skipped this topic
    if action == "skip":
        return {
            "investigation_messages": [
                AIMessage(content="Understood. We've skipped this topic and won't include it in tailoring.")
            ],
            "need_more_info": False,
            "completed_topic_ids": [topic_id],
            "active_experience_metadata": None,
        }

    # Case 2: Human reset topic to switch experience type
    if action == "reset_topic":
        reset_prompt = ChatPromptTemplate.from_messages([
            ("system",
"""You are an evidence-focused interview agent. The candidate has decided to explore a new experience for this job requirement.
Job requirement: {job_requirement}
New experience metadata: {active_experience_metadata}

Start fresh by asking EXACTLY ONE friendly, conversational opening question to learn about this experience (e.g. what the project/role was and what their primary contribution was regarding this requirement).
Do not reference past conversation or past experiences.
"""),
            ("human", "Topic: {topic}. Objective: {objective}. What is your opening question?")
        ])
        model = ChatOpenAI(model="gpt-4o", temperature=0)
        llm_structured = model.with_structured_output(InvestigateOutput)
        response = await llm_structured.ainvoke(reset_prompt.format_messages(
            job_requirement=selected.job_requirement,
            active_experience_metadata=active_metadata,
            topic=selected.topic,
            objective=selected.objective,
        ))
        remove_ops = [RemoveMessage(id=m.id) for m in state.get("investigation_messages", []) if hasattr(m, "id")]
        return {
            "investigation_messages": [
                *remove_ops,
                AIMessage(content=response.user_message),
            ],
            "need_more_info": True,
            "active_experience_metadata": active_metadata,
        }

    # Case 3: Human updated form fields directly
    if action == "form_update":
        update_prompt = ChatPromptTemplate.from_messages([
            ("system",
"""You are an evidence-focused interview agent. The candidate just directly updated or verified their experience metadata in the form.
Current verified metadata: {active_experience_metadata}
Job requirement: {job_requirement}
Objective: {objective}
Conversation history: {conversation_history}

Your task:
1. Briefly and warmly acknowledge the updated details in 1 sentence.
2. Ask the single next high-value probing question regarding concrete actions, ownership, technical methods, or impact needed for this requirement.
Ask EXACTLY ONE question.
"""),
            ("human", "Candidate updated form details. Please acknowledge and ask the next question.")
        ])
        model = ChatOpenAI(model="gpt-4o", temperature=0)
        llm_structured = model.with_structured_output(InvestigateOutput)
        response = await llm_structured.ainvoke(update_prompt.format_messages(
            active_experience_metadata=active_metadata,
            job_requirement=selected.job_requirement,
            objective=selected.objective,
            conversation_history=conversation_history,
        ))
        return {
            "investigation_messages": [AIMessage(content=response.user_message)],
            "need_more_info": True,
            "active_experience_metadata": active_metadata,
        }

    # Case 4: Human explicitly concluded / wrapped up this topic
    if action == "conclude":
        # Enforce required metadata validation before finalizing evidence
        is_valid, err_msg = validate_experience_metadata(active_metadata)
        if not is_valid:
            raise HTTPException(status_code=400, detail=err_msg)

        conclude_system_prompt = """
You are an evidence synthesis agent. The candidate has concluded this investigation topic.

The established experience metadata is: {active_experience_metadata}

Your task is to:
1. Thoroughly review the conversation history and all candidate statements for this topic.
2. Extract all truthful, verified evidence discovered during the conversation into the Evidence schema (including company/project name, actions, ownership, tools/technologies, metrics, scale, and impact).
3. Ensure company, job_title, project_name, and duration reflect the established metadata.
4. If no relevant evidence was found or the candidate lacked experience, set evidence to None.
5. Provide a warm, concise user_message summarizing what was established and confirming that this topic is concluded.
DO NOT ask any questions. Do not ask for more information.
"""
        conclude_prompt = ChatPromptTemplate.from_messages([
            ("system", conclude_system_prompt),
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

        model = ChatOpenAI(
            model="gpt-4o",
            temperature=0
        )
        llm_structured = model.with_structured_output(InvestigateOutput)
        response = await llm_structured.ainvoke(conclude_prompt.format_messages(
            active_experience_metadata=active_metadata,
            topic=selected.topic, reason=selected.reason, relevant_experience=selected.relevant_experience,
            objective=selected.objective, job_requirement=selected.job_requirement, conversation_history=conversation_history, relevant_experience_from_resume=relevant_experience_from_resume,
            evidence_with_details=evidence_with_details
        ))

        # Backfill metadata into evidence if LLM omitted specific identity fields
        if response.evidence:
            if active_metadata.get("company") and not response.evidence.company:
                response.evidence.company = active_metadata.get("company")
            if active_metadata.get("job_title") and not response.evidence.job_title:
                response.evidence.job_title = active_metadata.get("job_title")
            if active_metadata.get("project_name") and not response.evidence.project_name:
                response.evidence.project_name = active_metadata.get("project_name")
            if active_metadata.get("duration") and not response.evidence.duration:
                response.evidence.duration = active_metadata.get("duration")
            if active_metadata.get("location") and not response.evidence.job_location:
                response.evidence.job_location = active_metadata.get("location")

        updated_details = EvidenceWithDetails(
            job_requirement=selected.job_requirement, topic_id=selected.topic_id, evidence=response.evidence
        )
        return {
            "investigation_messages": [AIMessage(content=response.user_message)],
            "need_more_info": False,
            "evidence_with_details": [updated_details],
            "completed_topic_ids": [topic_id],
            "active_experience_metadata": None,
        }

    # Case 5: Human sent an answer to continue the conversation
    prompt = ChatPromptTemplate.from_messages([
("system",
"""
You are an evidence-focused interview agent. Investigate the current topic only until there is sufficient, truthful evidence to support strong resume bullet points.

The candidate's `evidence_with_details` is an accumulated evidence bank from previous investigations. Treat it as established candidate knowledge.
Current active experience metadata: {active_experience_metadata}

### Core rules & Guardrails:
1. SINGLE EXPERIENCE FOCUS: Only explore ONE experience entity per topic (one job, one project, etc.).
2. DISAMBIGUATION: If the candidate mentions more than one distinct experience in their answer (e.g. both a job at Uber AND a personal project), DO NOT combine them. Pick the single experience that best addresses the requirement, populate experience_metadata with that experience, and explicitly instruct the candidate to focus on that single experience.
3. IDENTITY GAPS: If the experience type is known but required fields (such as Company Name or Job Title for Work Experience, or Project Name or Role for Project) are unknown, prioritize asking for those identity details in your next question.
4. METADATA EXTRACTION: Populate `experience_metadata` with any newly established identity details (company, role, title, dates, location).
5. ONE QUESTION: Ask EXACTLY ONE thoughtful, conversational question at a time.
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

    model = ChatOpenAI(
        model="gpt-4o",
        temperature=0
    )
    llm_structured = model.with_structured_output(InvestigateOutput)
    response = await llm_structured.ainvoke(prompt.format_messages(
        active_experience_metadata=active_metadata,
        topic=selected.topic, reason=selected.reason, relevant_experience=selected.relevant_experience,
        objective=selected.objective, job_requirement=selected.job_requirement, conversation_history=conversation_history, relevant_experience_from_resume=relevant_experience_from_resume,
        evidence_with_details=evidence_with_details
    ))

    # Merge newly detected metadata into active_metadata
    merged_metadata = dict(active_metadata) if active_metadata else {}
    if response.experience_metadata:
        new_data = response.experience_metadata.model_dump(exclude_none=True)
        # If experience_type is already locked, prevent LLM from changing it mid-investigation
        if merged_metadata.get("experience_type"):
            new_data.pop("experience_type", None)
        merged_metadata.update(new_data)

    return {
        "investigation_messages": [AIMessage(content=response.user_message)],
        "need_more_info": True,
        "active_experience_metadata": merged_metadata or None,
    }
    



