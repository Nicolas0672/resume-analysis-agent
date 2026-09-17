from backend.agent.model import EvidenceMappingResult, EvidenceWithDetails, Feedback, Feedbacks, RegeneratedBullets, RegeneratedBulletsList, ResumeReference, TailorAnalysis, TailorMatchList, TailorMatched, TailorUnmatched, TailorUnmatchedList
from backend.agent.state import AgentState
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI


async def evidence_mapper(state: AgentState):

    evidence_list = state["evidence_with_details"]
    resume_experience = state["resume_data"].work_experience
    resume_projects = state["resume_data"].projects
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

    model = ChatOpenAI(model="gpt-4o")
    llm_structured = model.with_structured_output(EvidenceMappingResult)
    response = await llm_structured.ainvoke(prompt.format_messages(
        resume_experience=resume_experience, resume_projects=resume_projects, evidence_list=evidence_list,
        resume_leadership=resume_leadership
        ))

    return {
        "evidence_mapping": response
    }


async def tailor_resume_bullet_points(state: AgentState):

    evidence_mapping = state.get("evidence_mapping")

    matched = []
    unmatched = []

    for current in evidence_mapping.evidence_mappings:
        entry_id = current.resume_reference.entry_id
        type = current.resume_reference.type

        entries = getattr(state["resume_data"], type, [])
        entry = next(
            (e for e in entries if e.entry_id == entry_id),
            None
        )

        if current.mapping_status == "MATCHED":
            matched.append({
                "evidence_with_details": current.evidence_with_details,
                "resume_entry": entry,
                "resume_reference": ResumeReference(type=type, entry_id=entry_id),
                "topic_id": current.evidence_with_details.topic_id
            })

        if current.mapping_status == "UNMATCHED":
            unmatched.append({
                "evidence_with_details": current.evidence_with_details,
                "resume_entry": entry,
                "resume_reference": ResumeReference(type=type, entry_id=entry_id),
                "topic_id": current.evidence_with_details.topic_id
            })           


    matched_prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            """
    You are a resume tailoring agent.

    Your job is to improve an existing resume experience using verified evidence
    that belongs to that exact experience.
    You are allowed to change or add multiple bullet points from the resume entry.

    For each mapped experience, decide whether to KEEP, MODIFY, or ADD.

    Rules:
    - KEEP if the existing bullets already represent the experience well. Do not
    change wording just to add keywords.
    - MODIFY if verified evidence can materially improve relevance, specificity,
    technical depth, ownership, impact, or clarity.
    - ADD only when important verified evidence cannot be adequately represented
    by modifying an existing bullet.
    - Preserve the original scope and meaning of the experience.
    - Use only evidence mapped to this exact resume entry.
    - Never use evidence from another experience, even if the technology or skill
    is similar.
    - Never invent skills, metrics, responsibilities, or outcomes.
    - Job keywords should improve alignment only when they accurately describe the
    candidate's experience.
    - Prefer a strong existing bullet over an unnecessary rewrite.
    - When modifying or adding new bullet point, always prioritize using the XYZ format if enough details is present such as metrics/impact: accomplished X, as measured by Y, by doing Z
    - For every matched candidate, return the resume_reference exactly as provided
    in the input. It is an identifier, not a value to generate.

    Do not modify, infer, normalize, or create a new resume_reference.
    Copy the input resume_reference exactly.
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

    The provided evidence describes a legitimate candidate experience that is not
    currently represented on the resume. Your job is to create a new resume
    experience or project entry from that evidence.

    You are allowed to add multiple bullet points backed by evidence from candidate to align with
    job requirement

    Rules:
    - This is an ADD operation.
    - Use the company/project name, role, ownership, technologies, scope, metrics,
    and impact provided in the evidence.
    - Create only the number of bullets necessary to represent the experience well.
    - Prioritize the strongest details relevant to the job.
    - Do not invent or infer skills, metrics, responsibilities, or outcomes.
    - Do not borrow evidence from other resume experiences.
    - Do not exaggerate the candidate's role or ownership.
    - Use job requirements to determine what is most relevant, but never force
    keywords that are not supported by the evidence.
    - Keep the bullets concise, specific, and achievement-oriented.
    - Prioritize using the XYZ format, accomplished X, as measured by Y, by doing Z, if enough details is present such as metrics/impact.
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
    model = ChatOpenAI(model="gpt-4o")
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

    if unmatched:
        unmatched_result = await llm_unmatched_structured.ainvoke(
            new_experience_prompt.format_messages(
                unmatched=unmatched
            )
        )

    tailor_analysis = TailorAnalysis(
        tailor_matched_list=matched_result.tailor_matched if matched_result else [],
        tailor_unmatched_list=unmatched_result.tailor_unmatched  if unmatched_result else [],
    )
    return {
        "tailor_analysis": tailor_analysis
    }

async def critique_tailored_bullet_points(state: AgentState):

    model = ChatOpenAI(model="gpt-4o")
    llm_structured = model.with_structured_output(Feedbacks)
    feedbacks = []

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
    """ 
You are a resume factuality critic.

Determine whether each proposed bullet contains any factual claim that is not
supported by the candidate evidence.

The candidate evidence is the source of truth. Ignore the job requirement.

For each bullet:
- Verify every factual claim against the entire evidence.
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

    tailor_analysis = state["tailor_analysis"]
    
    evidence_by_topic_id = {
        evidence.evidence_with_details.topic_id: evidence.evidence_with_details
        for evidence in state["evidence_mapping"].evidence_mappings
    }

    all_tailor_matched = tailor_analysis.tailor_matched_list
    all_tailor_unmatched = tailor_analysis.tailor_unmatched_list 
    all_bullets_with_evidence = []

    for tailor_result in all_tailor_matched + all_tailor_unmatched:
        all_bullets = []

        for decision in tailor_result.decisions:
            bullet = {
                "new_bullet_point": decision.new_bullet,
            }

            if decision.old_bullet is not None:
                bullet["old_bullet_point"] = decision.old_bullet

            all_bullets.append(bullet)

        evidence = evidence_by_topic_id[tailor_result.topic_id]

        all_bullets_with_evidence.append({
            "all_bullets": all_bullets,
            "evidence_context": format_evidence_for_critic(evidence),
            "topic_id": evidence.topic_id,
        })

        response = await llm_structured.ainvoke(prompt.format_messages(input=all_bullets_with_evidence))
        feedbacks.extend(response.feedbacks)
        

    return {
        "feedbacks": feedbacks
    }

async def regenerate_bullets(state: AgentState):
    evidence_by_topic_id = {
        evidence.evidence_with_details.topic_id: evidence.evidence_with_details
        for evidence in state["evidence_mapping"].evidence_mappings
    }

    feedbacks = state["feedbacks"].feedbacks

    feedback_by_topic_id = {
        feedback.topic_id: feedback
        for feedback in feedbacks
    }

    feedback_with_evidence = []

    for tailor in (
        state["tailor_analysis"].tailor_matched_list
        + state["tailor_analysis"].tailor_unmatched_list
    ):
        feedback = feedback_by_topic_id.get(tailor.topic_id)

        if not feedback:
            continue

        evidence = evidence_by_topic_id[tailor.topic_id]

        for decision in tailor.decisions:
            bullet_feedback = next(
                (
                    bf
                    for bf in feedback.bullet_feedbacks
                    if bf.sentence_id == decision.new_bullet.sentence_id or bf.sentence_id == decision.old_bullet.sentence_id
                ),
                None,
            )

            if not bullet_feedback or bullet_feedback.valid:
                continue

            feedback_with_evidence.append({
                "old_bullet": decision.old_bullet,
                "new_bullet": decision.new_bullet,
                "feedback": bullet_feedback,
                "evidence": evidence,
            })

    prompt = ChatPromptTemplate.from_messages([
        ("system", 
"""
You are a resume bullet correction agent.

A factuality critic found issues with the proposed bullets below.

For each proposal:
- Review the original bullet(s) if present, candidate evidence, and critic feedback.
- Correct only the unsupported factual claims identified by the critic.
- Preserve all factual claims that are supported.
- Do not introduce new claims, technologies, metrics, responsibilities, scope, or impact.
- Do not use evidence outside the provided evidence.
- Do not optimize wording or ATS alignment. Your only goal is factual correctness.
- Return the corrected bullet points for each topic.
"""), ("human", "Here is the feedback with evidence {feedback_with_evidence}")
    ])
    llm = ChatOpenAI(model="gpt-4o")
    llm_structured = llm.with_structured_output(RegeneratedBulletsList)

    res = await llm_structured.ainvoke(prompt.format_messages(feedback_with_evidence=feedback_with_evidence))

    all_tailored = (
        state["tailor_analysis"].tailor_matched_list
        + state["tailor_analysis"].tailor_unmatched_list
    )

    for regenerated in res.regenerated_bullet_list:
        for proposal in all_tailored:
            if proposal.topic_id == regenerated.topic_id:
                proposal.new_bullet = regenerated.new_bullet
                break

    return state


def format_evidence_for_critic(evidence: EvidenceWithDetails) -> str:
    e = evidence.evidence

    def safe(value):
        if value is None:
            return "Not provided"
        if isinstance(value, list):
            return "\n".join(f"- {item}" for item in value) if value else "Not provided"
        return str(value)

    return f"""
JOB REQUIREMENT:
{safe(evidence.job_requirement)}

EXPERIENCE:
Company: {safe(e.company)}
Job Title: {safe(e.job_title)}
Project: {safe(e.project_name)}
Location: {safe(e.job_location)}
Duration: {safe(e.duration)}

DIRECT EVIDENCE:
{safe(e.experience_found)}

TECHNOLOGIES:
{safe(e.technologies)}

OWNERSHIP:
{safe(e.ownership)}

SCOPE:
{safe(e.scope)}

METRICS:
{safe(e.metrics)}

IMPACT:
{safe(e.impact)}

Candidate Statement:
{safe(e.candidate_statements)}
""".strip()
