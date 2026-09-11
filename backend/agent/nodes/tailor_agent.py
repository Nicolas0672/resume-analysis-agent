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

# we will output a pydantic containing a list of [valid, suggestions, topic_id]
# using a seperate node to regenerate, we will get invalid states and search tailor_matched/unmatched by topic_id
# and feed in suggestions
# we do not need an outside bool field to check if overall list is invalid.
# python syntax allows us to check if all is valid through foreach
# if any invalid, regenerate node would pick apart valid + invalid. pass invalid to llm only
async def critique_tailored_bullet_points(state: AgentState):
    tailor_analysis = state["tailor_analysis"]
    
    evidence_by_topic_id = {
        evidence.evidence_with_details.topic_id: evidence.evidence_with_details
        for evidence in state["evidence_mapping"].evidence_mappings
    }

    all_tailor_matched = tailor_analysis.tailor_matched_list
    all_tailor_unmatched = tailor_analysis.tailor_unmatched_list 

    matched = []
    unmatched = []

    for tailor_matched in all_tailor_matched:
        old_bullet_point = tailor_matched.old_bullet_points
        new_bullet_point = tailor_matched.new_bullet_points
        reasoning = tailor_matched.reasoning
        evidence = evidence_by_topic_id[tailor_matched.topic_id]

        res = {
            "old_bullet_point": old_bullet_point,
            "new_bullet_point": new_bullet_point,
            "reasoning": reasoning,
            "evidence_context": format_evidence_for_critic(evidence=evidence),
            "topic_id": evidence.topic_id
        }
        matched.append(res)

    for tailor_unmatched in all_tailor_unmatched:
        new_bullet_point = tailor_unmatched.new_bullet_points
        reasoning = tailor_unmatched.reasoning
        evidence = evidence_by_topic_id[tailor_unmatched.topic_id]

        res = {
            "new_bullet_point": new_bullet_point,
            "reasoning": reasoning,
            "evidence_context": format_evidence_for_critic(evidence=evidence),
            "topic_id": evidence.topic_id
        }

        unmatched.append(res)    

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
    """ 
You are a resume factuality critic. Your only responsibility is to determine whether each proposed bullet is factually supported by the candidate's evidence.

Rules
Candidate evidence is the source of truth. Job requirements are never evidence.
Verify every factual claim in new_bullet; a single unsupported claim should fail the bullet.
Be strict about:
Metrics: numbers, percentages, scale, performance improvements, etc. must be explicitly supported.
Technologies: tools, frameworks, languages, and techniques must be supported by evidence.
Ownership: do not upgrade contribution into leadership, ownership, architecture, or responsibility without evidence.
Scope: do not expand the project's size, complexity, responsibility, or reach.
Impact: outcomes must be explicitly supported.
Experience: do not introduce projects, responsibilities, achievements, or skills that are not evidenced.
Reasonable paraphrasing is allowed when it preserves the original factual meaning.
Evidence from another candidate experience cannot be used to support this bullet.
Do not judge writing quality, wording, ATS optimization, relevance, or whether the bullet is better written. Your job is fact-checking only.

For each proposed bullet, determine whether it is factually supported. If not, identify the specific unsupported claim and why the evidence does not support it.
    """), 
        ("human", "Here are the Existing experience proposals: {matched} and here are the New experience proposals: {unmatched}")
    ])
    model = ChatOpenAI(model="gpt-4o")
    llm_structured = model.with_structured_output(Feedbacks)
    response = await llm_structured.ainvoke(prompt.format_messages(matched=matched, unmatched=unmatched))

    return {
        "feedbacks": response
    }

async def regenerate_bullets(state: AgentState):
    evidence_by_topic_id = {
        evidence.evidence_with_details.topic_id: evidence.evidence_with_details
        for evidence in state["evidence_mapping"].evidence_mappings
    }

    feedbacks = state["feedbacks"].feedbacks

    invalid = [feedback for feedback in feedbacks if feedback.valid is False]

    feedback_by_topic_id = {
        feedback.topic_id: feedback
        for feedback in invalid
    }

    feedback_with_evidence = []

    for tailor_matched in state["tailor_analysis"].tailor_matched_list:
        topic_id = tailor_matched.topic_id

        if topic_id in feedback_by_topic_id:
            feedback = feedback_by_topic_id[topic_id]
            evidence = evidence_by_topic_id[topic_id]
            old_bullets = tailor_matched.old_bullet_points
            new_bullets = tailor_matched.new_bullet_points

            feedback_with_evidence.append({
                "evidence": evidence,
                "feedback": feedback,
                "old_bullets": old_bullets,
                "new_bullets": new_bullets,
                "topic_id": topic_id
            })

    for tailor_unmatched in state["tailor_analysis"].tailor_unmatched_list:
        topic_id = tailor_unmatched.topic_id

        if topic_id in feedback_by_topic_id:
            feedback = feedback_by_topic_id[topic_id]
            evidence = evidence_by_topic_id[topic_id]
            new_bullets = tailor_unmatched.new_bullet_points

            feedback_with_evidence.append({
                "evidence": evidence,
                "feedback": feedback,
                "new_bullets": new_bullets,
                "topic_id": topic_id
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
                proposal.new_bullet_points = regenerated.new_bullet_points
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
""".strip()
