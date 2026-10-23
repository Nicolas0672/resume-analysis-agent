# Product Requirements Document (PRD) — Resume Analysis & Tailoring Agent

## 1. Product Overview

### 1.1 Problem Statement
Job applicants spend countless hours repeatedly prompting generic AI tools to analyze and tailor resumes to specific job postings. 

Current AI resume services focus on speed and volume (the "Shotgun" approach). They generate superficial customizations, hallucinate metrics, and invent unverified experiences to artificially inflate ATS scores. When candidates reach technical interviews, these fabricated claims quickly fall apart under questioning.

### 1.2 Product Vision ("The Sniper Approach")
The **Resume Analysis & Tailoring Agent** provides an interactive, evidence-grounded AI co-author workflow. Rather than blindly rewriting documents or inventing facts, the agent:
1. Conducts an evidence-based gap analysis against job requirements.
2. Formulates a targeted interview plan to probe identified gaps.
3. Executes a conversational Human-in-the-Loop (HITL) technical interview to surface unarticulated, genuine candidate experience.
4. Validates all proposed improvements through an automated, adversarial factuality critic loop to eliminate hallucinations.
5. Formats verified experience using Google XYZ syntax (*Accomplished [X], as measured by [Y], by doing [Z]*).
6. Allows real-time interactive canvas editing and high-fidelity export to ATS-compliant vector PDF and Word DOCX.

---

## 2. Target Persona & Use Cases

* **Primary Persona**: Software engineers, technical candidates, and students applying for competitive roles at top-tier companies where every bullet point must be defensible under intense technical interview scrutiny.
* **Core Pain Point**: Candidates possess real, valuable experience (from course projects, internships, hackathons, or self-directed learning) that is either unmentioned or poorly articulated on their resume.
* **Value Proposition**: 100% truthful, defensible resume enhancements with zero AI hallucinations.

---

## 3. Product Scope & Feature Demarcation

### 3.1 Implemented Capabilities (Current System)

| Feature | Description | Implementation Status |
| :--- | :--- | :--- |
| **DOCX Resume Ingestion** | Ingests Word `.docx` documents, traversing paragraphs and tables with XML zip-bomb defense and 10MB ceilings. | **Implemented** |
| **Job Requirement Ingestion** | Scrapes job postings from LinkedIn, Indeed, and Workday with graceful zero-loss fallback to direct text paste. | **Implemented** |
| **Pydantic Schema Structuring** | Parses raw resume text into typed schemas (`ResumeStructure`) with globally unique sequential entry/sentence IDs. | **Implemented** |
| **Evidence-Based Gap Analysis** | Categorizes qualifications into `missing`, `partial`, `unclear`, or `transferable` using GPT-4o. | **Implemented** |
| **HITL Interview Planner** | Generates prioritized investigation topics targeting specific gap objectives. | **Implemented** |
| **Context-Isolated Investigation** | Conducts single-question probes; wipes topic chat history via `RemoveMessage` while accumulating an immutable global evidence bank. | **Implemented** |
| **Single-Entity Disambiguation** | Enforces scoped schemas (`WorkExperienceMetadata`, `ProjectMetadata`, etc.) to prevent cross-type data contamination. | **Implemented** |
| **Adversarial Critic Loop** | Dedicated auditor (`temperature=0`) that evaluates proposed bullets against candidate evidence, auto-triggering regeneration on unverified claims. | **Implemented** |
| **Live Interactive Canvas** | Dual-pane workspace (original immutable ground truth vs. working draft `resume_to_edit`) with in-place bullet and entry editing. | **Implemented** |
| **Concurrency Protection** | In-memory reference-counted session locking (`session_lock`) preventing Read-Modify-Write lost update race conditions on the live canvas. | **Implemented** |
| **Database Persistence** | Asynchronous connection pool (`psycopg_pool.AsyncConnectionPool`) with Supabase PostgreSQL and LangGraph `AsyncPostgresSaver`. | **Implemented** |
| **Document Export Engine** | Generates ATS-optimized vector PDF (`reportlab`) and styled Word DOCX (`python-docx`). | **Implemented** |

### 3.2 Non-Goals & Out-of-Scope

* **Fully Autonomous Job Application Submission**: The agent does not auto-apply or submit applications without human review and consent.
* **Keyword Stuffing / Synthetic Fabrication**: The agent strictly refuses to invent metrics, tools, or responsibilities that the candidate did not verify.
* **Generic Cover Letter Generation**: Out of scope for this pipeline.

### 3.3 Planned Roadmap

* **ATS Keyword Optimizer Node**: Final downstream post-processing stage optimizing approved bullets for algorithmic parsing without altering facts.
* **Candidate History RAG Vault (`pgvector`)**: Semantic vector store indexing historical coursework, past projects, and prior roles across multiple years.
* **Tiered Model Routing**: Offload deterministic parsing and mapping to faster, lower-cost models (`gpt-4o-mini`) while reserving flagship models for interview probing and XYZ synthesis.

---

## 4. End-to-End User Flow

1. **Ingest**: Candidate uploads their DOCX resume and enters a job posting URL (LinkedIn, Indeed, Workday) or pastes the description.
2. **Review Fit**: Candidate inspects the initial gap analysis (score, strengths, verified gaps) and selects an action (`done`, `need_more_info`, or `tailor`).
3. **Investigate**: If `need_more_info`, the interview agent presents prioritized topic cards. The candidate selects a gap and engages in a targeted, conversational interview.
4. **Disambiguate**: The live evidence form tracks the specific entity (company name, project title, dates, role) in real time with backend required-field validation.
5. **Audit & Synthesize**: When the candidate concludes or skips topics, the system maps evidence, drafts XYZ bullets, and passes them through the adversarial critic loop.
6. **Co-Author & Edit**: Candidate reviews verified proposals, customizes proposed text, applies updates per topic, or directly modifies the working canvas in-place.
7. **Export**: Candidate downloads their ATS-ready tailored resume in vector PDF or Microsoft Word DOCX format.

---

## 5. Technical Acceptance Criteria

* **Reliability & Idempotency**:
  * Applying the same tailored topic multiple times is idempotent (`status: "already_applied"`).
  * Rapid concurrent edits to the live canvas never produce lost updates.
* **Factual Grounding**:
  * 0% fabricated metrics or technologies in final tailored bullet points.
  * Every proposed claim must trace back to candidate interview statements or verified resume ground truth.
* **Security & Defense**:
  * Uploads exceeding 10MB or compressed files with expansion ratios >100:1 are rejected immediately.
  * Multi-tenant data isolation enforced via Supabase JWT cryptographic validation (`ES256`/`HS256`) and database ownership verification.
* **Performance**:
  * Database authorization checks execute in under 2ms via connection pooling.
  * Token streaming perceived Time-to-First-Token (TTFT) under 500ms via Server-Sent Events (SSE).
