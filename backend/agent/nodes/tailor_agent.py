from backend.agent.model import EvidenceMappingResult, FeedbackOnTailoredBullets, TailoredBullets
from backend.agent.state import AgentState
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI


async def evidence_mapper(state: AgentState):

    evidence_list = state["evidence_with_details"]
    resume_experience = state["resume_data"].work_experience
    resume_projects = state["resume_data"].projects

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

    Map each evidence item to the appropriate resume entry and related bullet(s).
    """
        )
    ])

    model = ChatOpenAI(model="gpt-4o")
    llm_structured = model.with_structured_output(EvidenceMappingResult)
    response = await llm_structured.ainvoke(prompt.format_messages(resume_experience=resume_experience, resume_projects=resume_projects, evidence_list=evidence_list))

    return {
        "evidence_mapping": response
    }


async def tailor_resume_bullet_points(state: AgentState):
    feedback_on_tailored_bullets = state.get(
        "feedback_on_tailored_bullets",
        "No feedback provided"
    )

    evidence_mapping = state.get("evidence_mapping")

    matched = []
    unmatched = []

    for current in evidence_mapping:
        entry_id = current.resume_reference.entry_id
        type = current.resume_reference.type

        entries = getattr(state["resume_data"], type)
        entry = next(
            (e for e in entries if e.entry_id == entry_id),
            None
        )

        if current.mapping_status == "MATCHED":
            matched.append({
                "evidence_with_details": current.evidence_with_details,
                "resume_entry": entry
            })

        if current.mapping_status == "UNMATCHED":
            unmatched.append({
                "evidence_with_details": current.evidence_with_details,
                "resume_entry": entry
            })           


    matched_prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            """
    You are a resume tailoring agent.

    Your job is to improve an existing resume experience using verified evidence
    that belongs to that exact experience.

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
    llm_matched_structured = 
    return {
        "tailored_bullets": response
    }





async def critique_tailored_bullet_points(state: AgentState):
    tailored_bullets = state["tailored_bullets"]
    interview_details_with_evidence = state["interview_details_with_evidence"]

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
    """ You are a resume factuality critic. Your primary job is to detect hallucinations in tailored resume bullets. For every `new_bullet`, verify that EVERY factual claim is supported by the candidate's available evidence. 
    ### Rules - The candidate evidence and old bullet points are the source of truth. 
    # - `supporting_evidence` is a useful reference but must itself be validated against the available candidate evidence. 
    # - The job description/job requirements are NOT evidence of the candidate's experience. 
    # - Do not accept claims simply because they are plausible, common for the role, or relevant to the job. Be especially strict about: 
    # 1. **Metrics** — Every percentage, number, dollar amount, performance improvement, scale, team size, etc. must be explicitly supported. Never accept invented or estimated metrics. 
    # 2. **Technologies** — Only approve technologies, tools, frameworks, or languages supported by the candidate evidence. 
    # 3. **Ownership** — Do not turn "contributed to" or "worked on" into "led", "owned", "architected", or similar stronger claims without evidence. 
    # 4. **Scope** — Do not expand the size, responsibility, or scale of the candidate's work beyond the evidence. 
    # 5. **Impact** — Business, customer, technical, or performance outcomes must be supported by evidence. 
    # 6. **Experience** — Do not introduce projects, responsibilities, achievements, or skills that are not supported. Reasonable paraphrasing is acceptable as long as it does not materially change the factual meaning. 
    # Your role is fact-checking, not editing. 
    """), 
        ("human", "Here are the tailored bullets: {tailored_bullets} and here are the interview details with evidence: {interview_details_with_evidence}.")
    ])
    model = ChatOpenAI(model="gpt-4o")
    llm_structured = model.with_structured_output(FeedbackOnTailoredBullets)
    response = await llm_structured.ainvoke(prompt.format_messages(tailored_bullets=tailored_bullets, interview_details_with_evidence=interview_details_with_evidence))

    return {
        "feedback_on_tailored_bullets": response
    }

