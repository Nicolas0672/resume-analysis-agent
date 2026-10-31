from fastapi import HTTPException
from langchain_openai import ChatOpenAI

from agent.model import (
    ALLOWED_KEYS_PER_TYPE,
    EvidenceWithDetails,
    InvestigateOutput,
    SCOPED_INVESTIGATE_OUTPUT_MAP,
)
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
        "is_sufficient": False,
        "suggested_experience_tab": None,
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
            "is_sufficient": True,
            "suggested_experience_tab": None,
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
        reset_schema = SCOPED_INVESTIGATE_OUTPUT_MAP.get(active_metadata.get("experience_type"), InvestigateOutput)
        llm_structured = model.with_structured_output(reset_schema)
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
            "is_sufficient": bool(getattr(response, "is_sufficient", False)),
            "suggested_experience_tab": getattr(response, "suggested_experience_tab", None),
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
        update_schema = SCOPED_INVESTIGATE_OUTPUT_MAP.get(active_metadata.get("experience_type"), InvestigateOutput)
        llm_structured = model.with_structured_output(update_schema)
        response = await llm_structured.ainvoke(update_prompt.format_messages(
            active_experience_metadata=active_metadata,
            job_requirement=selected.job_requirement,
            objective=selected.objective,
            conversation_history=conversation_history,
        ))
        return {
            "investigation_messages": [AIMessage(content=response.user_message)],
            "need_more_info": True,
            "is_sufficient": bool(getattr(response, "is_sufficient", False)),
            "suggested_experience_tab": getattr(response, "suggested_experience_tab", None),
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
2. Extract all truthful, verified evidence discovered during the conversation into the Evidence schema (including experience_type, company, job_title, project_name, leadership details, actions, ownership, tools/technologies, metrics, scale, and impact).
3. Ensure experience_type, company, job_title, project_name, leadership_title, and duration reflect the established metadata.
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
            if active_metadata.get("experience_type"):
                response.evidence.experience_type = active_metadata.get("experience_type")
            if active_metadata.get("company") and not response.evidence.company:
                response.evidence.company = active_metadata.get("company")
            if active_metadata.get("job_title") and not response.evidence.job_title:
                response.evidence.job_title = active_metadata.get("job_title")
            if active_metadata.get("project_name") and not response.evidence.project_name:
                response.evidence.project_name = active_metadata.get("project_name")
            if active_metadata.get("leadership_title") and not response.evidence.leadership_title:
                response.evidence.leadership_title = active_metadata.get("leadership_title")
            if active_metadata.get("position") and not response.evidence.leadership_position:
                response.evidence.leadership_position = active_metadata.get("position")
            if active_metadata.get("other_title") and not response.evidence.other_title:
                response.evidence.other_title = active_metadata.get("other_title")
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
            "is_sufficient": True,
            "suggested_experience_tab": None,
        }

    # Case 5: Human sent an answer to continue the conversation
    active_type = active_metadata.get("experience_type")
    output_schema = SCOPED_INVESTIGATE_OUTPUT_MAP.get(active_type, InvestigateOutput)

    if active_type:
        type_display = active_type.replace("_", " ").title()
        entity_name = (
            active_metadata.get("company")
            or active_metadata.get("project_name")
            or active_metadata.get("leadership_title")
            or active_metadata.get("other_title")
            or f"this {type_display}"
        )
        scoping_instructions = f"""
### Current Active Experience Scope:
- Category: {type_display}
- Entity: "{entity_name}"
- Only explore evidence belonging strictly to this {type_display}.
- Populate `experience_metadata` ONLY with identity fields relevant to this {type_display}.
"""
    else:
        scoping_instructions = """
### Initial Experience Detection:
- The experience category for this requirement has not been determined yet.
- From the candidate's response, determine whether this experience is best categorized as 'work_experience', 'project', 'leadership', or 'other', and set experience_type accordingly in experience_metadata.
- Once determined, focus exclusively on that single experience, investigating how they demonstrated {objective} within it.
"""

    prompt = ChatPromptTemplate.from_messages([
("system",
f"""
You are an expert technical interviewer and resume strategist. Your single mission is to guide the candidate to uncover high-impact evidence for strong, compelling resume bullet points tailored to the target job requirement.

### INVESTIGATION TARGET (NORTH STAR):
- TOPIC: {{topic}}
- OBJECTIVE: {{objective}}
- JOB REQUIREMENT: {{job_requirement}}

Current active experience metadata: {{active_experience_metadata}}
Established evidence bank: {{evidence_with_details}}

### PRIMARY DIRECTIVE — OBJECTIVE-ANCHORED PROBING (NON-NEGOTIABLE):
Every single question you ask MUST actively probe and gather evidence for THIS SPECIFIC OBJECTIVE: "{{objective}}".
- NEVER fall back to generic software interrogation like "What technical challenge did you work on? What was your role, and what technologies or tools did you use?".
- ALWAYS evaluate the 4 pillars (Problem, Action, Trade-offs, Impact) THROUGH THE LENS OF "{{objective}}".
- When the candidate establishes or returns to an experience (e.g. an internship or project), frame your next question around how they demonstrated "{{objective}}" in that setting.

### THE BRIDGE-BACK TECHNIQUE (PREVENTING UNRELATED RABBIT HOLES):
- When the candidate answers with technical specifics, implementation mechanics, or architecture:
  1. In ONE brief, natural phrase, acknowledge their technical work.
  2. IMMEDIATELY bridge it back to the objective: "{{objective}}".
- Example: If the objective is "Cross-Functional Communication / Collaboration" and the candidate says "I built a vector retrieval pipeline using LangChain and FastAPI":
  - BAD: "Could you share a specific technical challenge or project you worked on there? What technologies did you use?" (Completely loses the objective!)
  - BAD: "What embedding model and chunk size did you configure in LangChain?" (Rabbit hole!)
  - GOOD: "You engineered that retrieval pipeline—how did you coordinate with product managers or frontend engineers to align on API contracts and communicate latency trade-offs?"
- Example: If the objective is "System Scalability" and the candidate talks about team meetings:
  - GOOD: "Glad you aligned with the team—what architectural decisions or load-testing strategies did you implement to ensure the system scaled under high user concurrency?"

### The 4 Pillars of Resume Evidence (Applied to {{objective}}):
Every strong resume bullet point needs a balance of:
1. PROBLEM & CONTEXT: What was the specific obstacle, scale, or context relating to {{objective}}?
2. CONCRETE ACTIONS & OWNERSHIP: What specific methods, decisions, or processes did the candidate personally lead or implement to achieve {{objective}}?
3. TRADE-OFFS & CRITICAL THINKING: Why this approach over alternatives? What friction, conflict, or technical bottleneck did they navigate regarding {{objective}}?
4. MEASURABLE IMPACT & OUTCOMES: What was the quantifiable result or benefit (e.g. latency cut, alignment speed, metrics, performance, adoption) achieved for {{objective}}?

### How to Guide the Candidate (Gap-Driven Interviewing):
- Look at the `conversation_history`, `active_experience_metadata`, and `relevant_experience_from_resume`.
- Identify what is ALREADY ESTABLISHED vs WHAT IS STILL MISSING to craft stellar resume bullets for {{objective}}.
- Actively guide the candidate toward the missing pillar (especially Measurable Impact, Scale, or Critical Trade-offs).
- If the candidate answers with high-level theory, prompt for concrete specifics.
- If the candidate answers with low-level implementation, lift them up to the impact, trade-offs, and outcomes.

### Conversational Guardrails:
1. BREADTH OVER TRIVIA (NO TUNNEL VISION):
   - NEVER drill down into routine boilerplate code, standard libraries, or trivial setup details.
   - Once a choice is explained, do NOT keep asking "how did you implement that". Instead, PIVOT to Trade-offs or Measurable Impact relating to {{objective}}.
2. NATURAL & ENGAGING DIALOGUE (NO ROBOTIC ECHOES):
   - NEVER start questions with formulaic, repetitive echoes like "You've mentioned...", "You described...", or "You've shared...".
   - Speak naturally like a senior engineering leader: direct, curious, and collaborative.
3. IDENTITY GAPS:
   - If core identity details (such as Company Name / Job Title for Work Experience, or Project Name / Role for Project) are still unknown, ask for those details early while anchoring to {{objective}}.
4. ONE QUESTION AT A TIME:
   - Ask EXACTLY ONE thoughtful, high-leverage question at a time.

### TURN DECISION MATRIX (4 MUTUALLY EXCLUSIVE STATES):
For every candidate turn, identify which ONE of the following 4 states applies and adhere strictly to its rules:

STATE 1: TARGET EVIDENCE SUFFICIENT (Evidence Cleared)
- WHEN: The candidate has provided concrete, verifiable details (problem context, specific actions/ownership, and measurable outcomes or critical trade-offs) for "{{objective}}" within this active experience.
- SCHEMA ASSIGNMENT:
  - `is_sufficient = True`
  - `suggested_experience_tab = None`
- USER MESSAGE: Warmly and concisely summarize the strong evidence gathered for "{{objective}}". Inform the candidate they have great material and can click "Wrap Up & Save Evidence" whenever ready. DO NOT ask any more questions. DO NOT end with a question mark.

STATE 2: SKILL GAINED ELSEWHERE / TAB REDIRECTION (Experience Mismatch)
- WHEN: The candidate mentions or indicates that the probed skill / requirement was gained or applied in a DIFFERENT experience, role, or category (e.g., "I developed REST APIs through my internship", "I did this in a personal project, not at work", "I gained that in a student club").
- SCHEMA ASSIGNMENT:
  - `is_sufficient = False` (MANDATORY: Evidence for this requirement is NOT yet gathered under its proper experience. Concluding now would cause the skill to be dropped downstream.)
  - `suggested_experience_tab = <category>` (Set to "work_experience" for jobs/internships, "project" for personal/class projects, "leadership" for clubs/activities, or "other").
- USER MESSAGE:
  1. Warmly acknowledge where they gained it (e.g., their internship or project).
  2. Explain that to capture that experience accurately for this requirement, they should switch to that tab on the right.
  3. Explicitly instruct them to click that tab (e.g. "Since your REST API experience was through your internship rather than this project, please switch over to the **Work Experience** tab on the right so we can capture your internship details.").
  4. DO NOT summarize to conclude. DO NOT invite them to click "Wrap Up & Save Evidence". DO NOT confirm as proceed.
  5. Leave `experience_metadata` as null or empty for any fields that belong to the other category so the active form is not corrupted.

STATE 3: NO EXPERIENCE WITH THIS SKILL / GAP (Dead End)
- WHEN: The candidate explicitly confirms they have NO experience with this tool/skill anywhere across their background (e.g. "No, I haven't worked with REST APIs", "I don't have experience with cloud storage").
- SCHEMA ASSIGNMENT:
  - `is_sufficient = False` (MANDATORY: Do NOT fake evidence completion.)
  - `suggested_experience_tab = None`
- USER MESSAGE: Respectfully and reassuringly acknowledge what they stated. DO NOT interrogate why they haven't used it or push them to learn it. Explain that it's completely okay, and inform them they can click "Skip Topic" below to proceed, or let you know if they'd like to highlight another aspect of their work. DO NOT invite wrap-up or claim target evidence was cleared.

STATE 4: IN PROGRESS / PROBING
- WHEN: The candidate is describing work within the active experience, but key pillars (problem context, specific methods/actions, trade-offs, or measurable impact) are still missing for "{{objective}}".
- SCHEMA ASSIGNMENT:
  - `is_sufficient = False`
  - `suggested_experience_tab = None`
- USER MESSAGE: Apply the Bridge-Back technique and ask EXACTLY ONE thoughtful, high-leverage question actively probing for the missing pillar anchored to "{{objective}}".

{scoping_instructions}
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
    llm_structured = model.with_structured_output(output_schema)
    response = await llm_structured.ainvoke(prompt.format_messages(
        active_experience_metadata=active_metadata,
        topic=selected.topic, reason=selected.reason, relevant_experience=selected.relevant_experience,
        objective=selected.objective, job_requirement=selected.job_requirement, conversation_history=conversation_history, relevant_experience_from_resume=relevant_experience_from_resume,
        evidence_with_details=evidence_with_details
    ))

    # Merge newly detected metadata into active_metadata with strict whitelist sanitization
    merged_metadata = dict(active_metadata) if active_metadata else {}
    # Only merge metadata if NOT redirecting to another tab, to avoid polluting active form
    if response.experience_metadata and not response.suggested_experience_tab:
        new_data = response.experience_metadata.model_dump(exclude_none=True)
        # If experience_type is already locked, prevent LLM from changing it mid-investigation
        if merged_metadata.get("experience_type"):
            new_data.pop("experience_type", None)
            current_type = merged_metadata["experience_type"]
        else:
            current_type = new_data.get("experience_type") or "work_experience"
            new_data["experience_type"] = current_type

        # Whitelist filter: discard any keys that do not belong to current_type
        allowed_keys = ALLOWED_KEYS_PER_TYPE.get(current_type, set())
        sanitized_data = {k: v for k, v in new_data.items() if k in allowed_keys}
        merged_metadata.update(sanitized_data)

    return {
        "investigation_messages": [AIMessage(content=response.user_message)],
        "need_more_info": True,
        "is_sufficient": bool(getattr(response, "is_sufficient", False)),
        "suggested_experience_tab": getattr(response, "suggested_experience_tab", None),
        "active_experience_metadata": merged_metadata or None,
    }
    



