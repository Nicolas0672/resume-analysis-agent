from typing import Optional
from agent.model import Evidence, EvidenceMappingResult, EvidenceWithDetails, Feedback, Feedbacks, RegeneratedBullets, RegeneratedBulletsList, ResumeReference, TailorAnalysis, TailorMatchList, TailorMatched, TailorUnmatched, TailorUnmatchedList
from agent.state import AgentState
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI


async def evidence_mapper(state: AgentState):

    evidence_list = [evidence for evidence in state.get("evidence_with_details", []) if evidence.evidence is not None]
    resume_experience = state["resume_data"].work_experience if state["resume_data"].work_experience else "No work experience available"
    resume_projects = state["resume_data"].projects if state["resume_data"].projects else "No available project experience"
    resume_leadership = state["resume_data"].leadership if state["resume_data"].leadership else "No available leadership experience"

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            """
    You are an evidence mapping agent.

    Your job is to map each piece of interview evidence to the exact resume
    experience or project it belongs to, and identify any existing bullet it
    supports.

    ### Rules
    - Preserve evidence provenance. Evidence must only be mapped to the
    experience/project it actually came from.
    - Use the experience/project name, company, job title, and context provided
    in the evidence to match it to the structured resume.
    - Do not map evidence to another experience simply because they share a
    technology or skill.
    - Do not rewrite, modify, or create resume bullets.
    - Evidence may support an existing bullet, belong to an entry without
    supporting a specific bullet, or remain unmatched.
    - If you cannot confidently determine the correct entry, return UNMATCHED and the exact Evidence object used.
    - Do not invent, infer, or embellish evidence.

    The downstream tailoring agent will decide whether the evidence warrants
    Your only responsibility is accurate provenance.
    """
        ),
        (
            "human",
            """
    Interview evidence:
    {evidence_list}

    Resume experience:
    {resume_experience}

    Resume projects:
    {resume_projects}

    Resume leadership:
    {resume_leadership}

    Map each evidence item to the appropriate resume entry and related bullet(s).
    """
        )
    ])

    model = ChatOpenAI(
        model="gpt-4o",
        temperature=0
    )

    if evidence_list:
        llm_structured = model.with_structured_output(EvidenceMappingResult)
        response = await llm_structured.ainvoke(
            prompt.format_messages(
                resume_experience=resume_experience,
                resume_projects=resume_projects,
                evidence_list=evidence_list,
                resume_leadership=resume_leadership,
            )
        )
    else:
        response = EvidenceMappingResult(evidence_mappings=[])

    return {
        "evidence_mapping": response
    }

async def tailor_resume_bullet_points(state: AgentState):

    evidence_mapping = state.get("evidence_mapping")

    matched = []
    matched_topic_id = []
    unmatched = []
    unmatched_topic_id = []

    for current in evidence_mapping.evidence_mappings:

        if current.evidence_with_details.evidence is None:
            continue

        # If the evidence is matched to a specific resume entry, we retrieve that entry from the resume data using the provided reference. We then store the matched evidence along with the corresponding resume entry and topic_id for further processing.
        if current.mapping_status == "MATCHED":
            entry_id = current.resume_reference.entry_id
            type = current.resume_reference.type

            entries = getattr(state["resume_data"], type, [])
            entry = next(
                (e for e in entries if e.entry_id == entry_id),
                None
            )
            matched.append({
                "evidence_with_details": current.evidence_with_details,
                "resume_entry": entry,
                "resume_reference": ResumeReference(type=type, entry_id=entry_id),
                "topic_id": current.evidence_with_details.topic_id
            })
            matched_topic_id.append(current.evidence_with_details.topic_id)

        if current.mapping_status == "UNMATCHED":
            unmatched.append({
                "evidence_with_details": current.evidence_with_details,
                "topic_id": current.evidence_with_details.topic_id
            })    
            unmatched_topic_id.append(current.evidence_with_details.topic_id)


    matched_prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            """
You are a resume tailoring agent.

Your job is to improve an existing resume experience using verified evidence that belongs to that exact experience.

You are allowed to change or add multiple bullet points from the resume entry.

For each mapped experience, decide whether to KEEP, MODIFY, or ADD.

Each input contains a topic_id and resume_reference. These are immutable identifiers. You MUST copy them exactly into your output. Do not alter or create them.

Rules
KEEP if the existing bullets already represent the experience well. Do not change wording just to add keywords.
MODIFY if verified evidence can materially improve relevance, specificity, technical depth, ownership, impact, or clarity.
ADD only when important verified evidence cannot be adequately represented by modifying an existing bullet.
Preserve the original scope and meaning of the experience.
Use only evidence mapped to this exact resume entry.
Never use evidence from another experience.
Never invent skills, metrics, responsibilities, ownership, or outcomes.
Use the job requirement to determine what to emphasize, but use the verified evidence/conversation history to determine what the candidate actually did.
The job requirement must never upgrade or expand the candidate's experience. For example, "experience with microservices using gRPC" cannot become "developed microservices architecture using gRPC" unless development/architecture work is explicitly supported.
Do not infer benefits such as scalability, performance, reliability, or efficiency unless explicitly supported.
Job keywords should improve alignment only when they accurately describe the verified experience.
Prefer a strong existing bullet over an unnecessary rewrite.
When modifying or adding a bullet, prioritize XYZ format when sufficient evidence exists for accomplishment, metric/impact, and method. Do not invent missing details.
For every matched candidate, return resume_reference exactly as provided.

MULTI-TOPIC COHESION & ANTI-DUPLICATION (CRITICAL):
- Non-Overlapping Responsibilities: Every proposed bullet on a resume entry must represent a distinct functional pillar (e.g. core product, backend APIs, frontend UI, cloud hosting/infrastructure, AI tooling).
- NEVER produce two bullets on the same resume entry that describe the same functional responsibility (e.g., do NOT have one bullet for "Hosted on Azure VM" and a second bullet for "Deployed on Azure VM running Ubuntu").
- Single Consolidated Bullet: When multiple topics provide evidence about the same underlying responsibility, CONDENSE all details into ONE single modified bullet rather than creating an extra ADD bullet.
- Metric Placement: User scale or adoption metrics (e.g. 50 active users, 10 study groups) measure the application or backend APIs. Attach these metrics to the core application or backend API bullet when possible.
- Consolidation Tracking: If this topic's evidence was consolidated into another topic's bullet on this entry, set action to "KEEP" and set consolidated_with_topic_id to that topic's ID. Explain the consolidation in reasoning.
    """
        ),
        (
            "human",
            """
    Input: {matched}

    Evaluate the existing bullets and produce only justified proposals.
    """
        )
    ])

    new_experience_prompt = ChatPromptTemplate.from_messages([
        (
            "system",
    """
    You are a resume tailoring agent.

    The provided evidence describes a legitimate candidate experience that is not currently represented on the resume. Your job is to create a new resume experience or project entry from that evidence and tailor it to the job requirement.

    Each input contains a topic_id.

    The topic_id is immutable. Copy it exactly into the output. Do not alter or create IDs.

    Rules
    This is an ADD operation.
    Create the bullet when the experience is relevant to the job requirement.
    Use the job requirement to determine what aspect of the experience to emphasize, but use the conversation history/evidence to determine exactly what the candidate did.
    Never let the job requirement add or upgrade facts that are not explicitly supported by the conversation history.
    Do not infer ownership, design, development, implementation, leadership, scope, metrics, impact, or outcomes.
    For example, if the conversation only establishes "experience with microservices using gRPC," do not write "developed microservices architecture using gRPC."
    Preserve the candidate's actual level of involvement. "Experience with" must remain experience with unless stronger involvement is explicitly established.
    Do not invent benefits such as scalability, performance, reliability, or efficiency.
    Use only evidence from the provided candidate context. Do not borrow evidence from other experiences.
    Create only the number of bullets necessary to represent the relevant experience well.
    Use XYZ format when the evidence explicitly provides the accomplishment, metric/impact, and method. Otherwise, write a concise factual bullet.
    Keep bullets concise, specific, achievement-oriented, and ATS-friendly without forcing unsupported keywords.

    Classification and Section Rules:
    - If the evidence has experience_type="work_experience" or has company/job_title:
      You MUST set type = "work_experience".
      Even if the candidate worked on a named project or internal tool during their job/internship, it is STILL work experience, NOT a standalone project.
      Set company_name = company, job_title = job_title. Set project_name = None.
    - If the evidence has experience_type="leadership" or has leadership_title/leadership_position:
      You MUST set type = "leadership".
      Set leadership_title = leadership_title, leadership_position = leadership_position. Set company_name = None and project_name = None.
    - If the evidence has experience_type="project" or is an independent/academic project:
      You MUST set type = "projects".
      Set project_name = project_name. Set company_name = None and job_title = None.
    """
        ),
        (
            "human",
            """
    input: {unmatched}

    Create the strongest truthful resume entry supported by this evidence.
    """
        )
    ])
    model = ChatOpenAI(
        model="gpt-4o",
        temperature=0
    )
    llm_matched_structured = model.with_structured_output(TailorMatchList)
    llm_unmatched_structured = model.with_structured_output(TailorUnmatchedList)

    matched_result = None
    unmatched_result = None

    if matched:
        matched_result = await llm_matched_structured.ainvoke(
            matched_prompt.format_messages(
                matched=matched
            )
        )
        if matched_result:
            for matched_item in matched_result.tailor_matched:
                if matched_item.topic_id not in matched_topic_id:
                    raise ValueError(
                        f"Invalid topic_id returned by LLM: {matched_item.topic_id}"
                    )

    if unmatched:
        unmatched_result = await llm_unmatched_structured.ainvoke(
            new_experience_prompt.format_messages(
                unmatched=unmatched
            )
        )
        if unmatched_result:
            orig_ev_map = {
                item["topic_id"]: item["evidence_with_details"].evidence
                for item in unmatched
                if item.get("evidence_with_details") and item["evidence_with_details"].evidence
            }

            for unmatched_item in unmatched_result.tailor_unmatched:
                if unmatched_item.topic_id not in unmatched_topic_id:
                    raise ValueError(
                        f"Invalid topic_id returned by LLM: {unmatched_item.topic_id}"
                    )

                # Deterministic Provenance Lock: Enforce section type and identity fields from verified evidence
                orig_ev = orig_ev_map.get(unmatched_item.topic_id)
                if orig_ev:
                    if orig_ev.experience_type == "work_experience" or (orig_ev.company and orig_ev.job_title):
                        unmatched_item.type = "work_experience"
                        unmatched_item.company_name = unmatched_item.company_name or orig_ev.company
                        unmatched_item.job_title = unmatched_item.job_title or orig_ev.job_title
                        unmatched_item.duration = unmatched_item.duration or orig_ev.duration
                        unmatched_item.job_location = unmatched_item.job_location or orig_ev.job_location
                        unmatched_item.project_name = None
                    elif orig_ev.experience_type == "leadership" or (orig_ev.leadership_title and orig_ev.leadership_position):
                        unmatched_item.type = "leadership"
                        unmatched_item.leadership_title = unmatched_item.leadership_title or orig_ev.leadership_title
                        unmatched_item.leadership_position = unmatched_item.leadership_position or orig_ev.leadership_position
                        unmatched_item.duration = unmatched_item.duration or orig_ev.duration
                        unmatched_item.job_location = unmatched_item.job_location or orig_ev.job_location
                        unmatched_item.company_name = None
                        unmatched_item.job_title = None
                        unmatched_item.project_name = None
                    elif orig_ev.experience_type == "project" or orig_ev.project_name:
                        unmatched_item.type = "projects"
                        unmatched_item.project_name = unmatched_item.project_name or orig_ev.project_name
                        unmatched_item.duration = unmatched_item.duration or orig_ev.duration
                        unmatched_item.job_location = unmatched_item.job_location or orig_ev.job_location
                        unmatched_item.company_name = None
                        unmatched_item.job_title = None

    tailor_analysis = TailorAnalysis(
        tailor_matched_list=matched_result.tailor_matched if matched_result else [],
        tailor_unmatched_list=unmatched_result.tailor_unmatched  if unmatched_result else [],
    )
    return {
        "tailor_analysis": tailor_analysis
    }

def merge_evidences(evidences: list[Evidence]) -> Optional[Evidence]:
    """Merges multiple Evidence objects belonging to the same experience into a unified Evidence record."""
    valid_evidences = [e for e in evidences if e is not None]
    if not valid_evidences:
        return None
    if len(valid_evidences) == 1:
        return valid_evidences[0]

    first = valid_evidences[0]
    exp_type = next((e.experience_type for e in valid_evidences if e.experience_type), first.experience_type)
    company = next((e.company for e in valid_evidences if e.company), None)
    job_title = next((e.job_title for e in valid_evidences if e.job_title), None)
    project_name = next((e.project_name for e in valid_evidences if e.project_name), None)
    leadership_title = next((e.leadership_title for e in valid_evidences if e.leadership_title), None)
    leadership_position = next((e.leadership_position for e in valid_evidences if e.leadership_position), None)
    other_title = next((e.other_title for e in valid_evidences if e.other_title), None)
    job_location = next((e.job_location for e in valid_evidences if e.job_location), None)
    duration = next((e.duration for e in valid_evidences if e.duration), None)

    def merge_lists(getter):
        merged = []
        for ev in valid_evidences:
            items = getter(ev)
            if items:
                for item in items:
                    if item and item not in merged:
                        merged.append(item)
        return merged if merged else None

    return Evidence(
        experience_type=exp_type,
        company=company,
        job_title=job_title,
        project_name=project_name,
        leadership_title=leadership_title,
        leadership_position=leadership_position,
        other_title=other_title,
        job_location=job_location,
        duration=duration,
        experience_found=merge_lists(lambda e: e.experience_found),
        technologies=merge_lists(lambda e: e.technologies),
        ownership=merge_lists(lambda e: e.ownership),
        scope=merge_lists(lambda e: e.scope),
        metrics=merge_lists(lambda e: e.metrics),
        impact=merge_lists(lambda e: e.impact),
        motivation=merge_lists(lambda e: e.motivation),
        candidate_statements=merge_lists(lambda e: e.candidate_statements),
    )


def get_consolidated_evidence_by_topic(state: AgentState) -> dict[str, Optional[Evidence]]:
    """Groups evidence by resume reference for matched experiences so the critic and regenerator
    see all verified candidate statements and facts across topics for that project/job.
    """
    evidence_mapping = state.get("evidence_mapping")
    if not evidence_mapping or not evidence_mapping.evidence_mappings:
        return {}

    evidence_mappings = evidence_mapping.evidence_mappings

    # Group evidence by matched resume_reference
    matched_evidences_by_ref: dict[tuple[str, int], list[Evidence]] = {}
    topic_to_ref: dict[str, tuple[str, int]] = {}

    for mapping in evidence_mappings:
        topic_id = mapping.evidence_with_details.topic_id
        if mapping.mapping_status == "MATCHED" and mapping.resume_reference:
            ref_key = (mapping.resume_reference.type, mapping.resume_reference.entry_id)
            topic_to_ref[topic_id] = ref_key
            if mapping.evidence_with_details.evidence:
                matched_evidences_by_ref.setdefault(ref_key, []).append(
                    mapping.evidence_with_details.evidence
                )

    # Build consolidated evidence map per topic_id
    consolidated_by_topic: dict[str, Optional[Evidence]] = {}
    for mapping in evidence_mappings:
        topic_id = mapping.evidence_with_details.topic_id
        if topic_id in topic_to_ref:
            ref_key = topic_to_ref[topic_id]
            ev_list = matched_evidences_by_ref.get(ref_key, [])
            consolidated_by_topic[topic_id] = merge_evidences(ev_list) if ev_list else mapping.evidence_with_details.evidence
        else:
            consolidated_by_topic[topic_id] = mapping.evidence_with_details.evidence

    return consolidated_by_topic


def format_evidence_for_critic(evidence: Evidence | EvidenceWithDetails | None) -> str:
    if evidence is None:
        e = None
    elif isinstance(evidence, EvidenceWithDetails):
        e = evidence.evidence
    else:
        e = evidence

    def safe(value):
        if value is None:
            return "Not provided"
        if isinstance(value, list):
            return "\n".join(f"- {item}" for item in value) if value else "Not provided"
        return str(value)

    return f"""

EXPERIENCE:
Type: {safe(e.experience_type) if e else "Not provided"}
Company: {safe(e.company) if e else "Not provided"}
Job Title: {safe(e.job_title) if e else "Not provided"}
Project: {safe(e.project_name) if e else "Not provided"}
Leadership Organization: {safe(e.leadership_title) if e else "Not provided"}
Leadership Position: {safe(e.leadership_position) if e else "Not provided"}
Location: {safe(e.job_location) if e else "Not provided"}
Duration: {safe(e.duration) if e else "Not provided"}

DIRECT EVIDENCE:
{safe(e.experience_found) if e else "Not provided"}

TECHNOLOGIES:
{safe(e.technologies) if e else "Not provided"}

OWNERSHIP:
{safe(e.ownership) if e else "Not provided"}

SCOPE:
{safe(e.scope) if e else "Not provided"}

METRICS:
{safe(e.metrics) if e else "Not provided"}

IMPACT:
{safe(e.impact) if e else "Not provided"}

Candidate Statement:
{safe(e.candidate_statements) if e else "Not provided"}
""".strip()


async def critique_tailored_bullet_points(state: AgentState):
    tailor_analysis = state.get("tailor_analysis")
    all_tailor_matched = tailor_analysis.tailor_matched_list if tailor_analysis else []
    all_tailor_unmatched = tailor_analysis.tailor_unmatched_list if tailor_analysis else []

    # 1. Early-exit guard: Check if there are any ADD or MODIFY bullets across all topics
    has_bullets_to_critique = any(
        decision.action in ["ADD", "MODIFY"] and decision.new_bullet
        for tailor_result in (all_tailor_matched + all_tailor_unmatched)
        for decision in tailor_result.decisions
    )

    if not has_bullets_to_critique:
        return {
            "feedbacks": Feedbacks(feedbacks=[]),
            "iteration_loop": state.get("iteration_loop", 0) + 1,
        }

    consolidated_evidence_map = get_consolidated_evidence_by_topic(state)

    # 2. Build single batch payload of topics with bullets to critique
    all_bullets_with_evidence = []
    for tailor_result in all_tailor_matched + all_tailor_unmatched:
        bullets = []
        for decision in tailor_result.decisions:
            if decision.action in ["ADD", "MODIFY"] and decision.new_bullet:
                bullets.append({
                    "sentence_id": decision.new_bullet.sentence_id,
                    "new_bullet_point": decision.new_bullet.text,
                })

        if not bullets:
            continue

        evidence = consolidated_evidence_map.get(tailor_result.topic_id)
        all_bullets_with_evidence.append({
            "all_bullets": bullets,
            "evidence_context": format_evidence_for_critic(evidence),
            "topic_id": tailor_result.topic_id,
        })

    if not all_bullets_with_evidence:
        return {
            "feedbacks": Feedbacks(feedbacks=[]),
            "iteration_loop": state.get("iteration_loop", 0) + 1,
        }

    model = ChatOpenAI(
        model="gpt-4o",
        temperature=0,
    )
    llm_structured = model.with_structured_output(Feedbacks)

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            """ 
You are a resume factuality critic.

Determine whether each proposed bullet contains any factual claim that is not
supported by the candidate evidence.

The candidate evidence is the source of truth. Ignore the job requirement.

Each input item contains a topic_id.
The topic_id is an immutable identifier. You MUST copy it exactly into your output. Do not alter or create IDs.

For each bullet:
- Verify every factual claim against the entire evidence context.
- Reasonable paraphrasing and synthesis are allowed.
- Evidence can be distributed across the evidence context.
- Do not require the evidence to use the exact wording of the bullet.
- Be strict about fabricated metrics, technologies, ownership, scope, impact,
  projects, responsibilities, or achievements.
- If every factual claim is supported, mark the bullet valid.
- If any factual claim is unsupported, mark it invalid and identify that claim.

Do not judge writing quality, relevance, ATS optimization, or wording.

The question is simply:
"Could the candidate truthfully say this based on the evidence provided?
"""), 
        ("human", "Here are the input: {input}")
    ])

    response = await llm_structured.ainvoke(prompt.format_messages(input=all_bullets_with_evidence))

    # Defensive fallback: if single topic feedback returned without topic_id populated
    for fb in response.feedbacks:
        if not fb.topic_id and len(all_bullets_with_evidence) == 1:
            fb.topic_id = all_bullets_with_evidence[0]["topic_id"]

    return {
        "feedbacks": response,
        "iteration_loop": state.get("iteration_loop", 0) + 1,
    }


async def regenerate_bullets(state: AgentState):
    feedbacks_obj = state.get("feedbacks")
    feedbacks = feedbacks_obj.feedbacks if feedbacks_obj else []

    feedback_by_topic_id = {
        feedback.topic_id: feedback
        for feedback in feedbacks
        if feedback.topic_id is not None
    }

    consolidated_evidence_map = get_consolidated_evidence_by_topic(state)

    feedback_with_evidence = []
    all_topic_id = []

    for tailor in (
        state["tailor_analysis"].tailor_matched_list
        + state["tailor_analysis"].tailor_unmatched_list
    ):
        feedback = feedback_by_topic_id.get(tailor.topic_id)
        all_topic_id.append(tailor.topic_id)

        if not feedback:
            continue

        evidence = consolidated_evidence_map.get(tailor.topic_id)

        for decision in tailor.decisions:
            if decision.action in ["ADD", "MODIFY"] and decision.new_bullet:
                bullet_feedback = next(
                    (
                        bf
                        for bf in feedback.bullet_feedbacks
                        if (
                            bf.sentence_id == decision.new_bullet.sentence_id
                            or (
                                decision.old_bullet is not None
                                and bf.sentence_id == decision.old_bullet.sentence_id
                            )
                        )
                    ),
                    None,
                )

                if not bullet_feedback or bullet_feedback.valid:
                    continue

                feedback_with_evidence.append({
                    "old_bullet": decision.old_bullet,
                    "new_bullet": decision.new_bullet,
                    "feedback": bullet_feedback,
                    "evidence": format_evidence_for_critic(evidence),
                    "topic_id": tailor.topic_id,
                })

    if not feedback_with_evidence:
        return state

    prompt = ChatPromptTemplate.from_messages([
        ("system", 
"""
You are a resume bullet correction agent.

A factuality critic found issues with the proposed bullets below.

Each input contains a topic_id.

The topic_id is an immutable identifier.
You MUST copy it exactly into your output.
Do not alter it.
Do not create new IDs.

For each proposal:
- Review the original bullet(s) if present, candidate evidence, and critic feedback.
- Correct only the unsupported factual claims identified by the critic.
- Preserve all factual claims that are supported.
- Do not introduce new claims, technologies, metrics, responsibilities, scope, or impact.
- Do not use evidence outside the provided evidence.
- Optimize for clarity, conciseness, and XYZ format if enough details is present such as metrics/impact: accomplished X, as measured by Y, by doing Z
- Also optimize for ATS readability and keyword alignment, but never at the expense of factual accuracy.
- Return the corrected bullet points for each topic.
"""), ("human", "Here is the feedback with evidence {feedback_with_evidence}")
    ])
    model = ChatOpenAI(
        model="gpt-4o",
        temperature=0
    )
    llm_structured = model.with_structured_output(RegeneratedBulletsList)

    res = await llm_structured.ainvoke(prompt.format_messages(feedback_with_evidence=feedback_with_evidence))

    all_tailored = (
        state["tailor_analysis"].tailor_matched_list
        + state["tailor_analysis"].tailor_unmatched_list
    )

    for regenerated in res.regenerated_bullet_list:
        if regenerated.topic_id not in all_topic_id:
            raise ValueError(
                f"Invalid topic_id returned by LLM: {regenerated.topic_id}"
            )
        for proposal in all_tailored:
            if proposal.topic_id == regenerated.topic_id:
                for new in regenerated.new_bullet_points:
                    sent_id = new.sentence_id
                    text = new.text
                    for decision in proposal.decisions:
                        if decision.action in ["ADD", "MODIFY"] and decision.new_bullet and decision.new_bullet.sentence_id == sent_id:
                            decision.new_bullet.text = text

    return state