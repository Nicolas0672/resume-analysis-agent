# Resume Analysis & Tailoring Agent — Backend Architecture & System Design

## 1. Executive Summary & Product Alignment

The **Resume Analysis & Tailoring Agent** is designed to address a critical flaw in current AI resume tools: automated tools tend to prioritize speed over context, generating superficial customizations and hallucinating unverified claims that collapse under technical interview scrutiny.

Based on [PRD.md](file:///D:/Documents/resume-agent/PRD.md), the system implements an interactive, evidence-grounded AI workflow. Rather than blindly rewriting resumes, the agent:
1. Ingests the candidate's resume (DOCX with table & zip-bomb protection) and a target job listing (via LinkedIn, Indeed, Workday URL scraping, or direct job description text paste).
2. Parses paragraphs and tables, structuring the resume into a typed, validated data schema ([`ResumeStructure`](file:///D:/Documents/resume-agent/backend/model/resume_schema.py#L97-L106)).
3. Performs an evidence-based gap analysis strictly anchored to verifiable experience.
4. Formulates a targeted investigation plan to probe identified gaps.
5. Executes a conversational Human-in-the-Loop (HITL) interview to extract concrete metrics, scope, ownership, and technologies from the candidate, resetting topic-specific chat history per session (`RemoveMessage`) while accumulating an immutable evidence bank.
6. Enforces Single-Entity Experience Disambiguation through scoped category schemas (`WorkExperienceMetadata`, `ProjectMetadata`, `LeadershipMetadata`, `OtherMetadata`) with required field validation.
7. Maps verified evidence back to specific resume experiences and projects ([`evidence_mapper`](file:///D:/Documents/resume-agent/backend/agent/nodes/tailor_agent.py#L8-L82)).
8. Proposes justified resume bullet point improvements (KEEP, MODIFY, ADD) formatted with Google XYZ syntax (*Accomplished [X], as measured by [Y], by doing [Z]*).
9. Validates proposed bullets through an automated adversarial factuality critic ([`critique_tailored_bullet_points`](file:///D:/Documents/resume-agent/backend/agent/nodes/tailor_agent.py)) and iterative self-correction loop ([`regenerate_bullets`](file:///D:/Documents/resume-agent/backend/agent/nodes/tailor_agent.py)) to eliminate hallucinations.
10. Provides interactive state modification endpoints enabling the candidate to preview, customize proposed bullets, apply tailoring updates per topic into an editable resume working copy ([`resume_to_edit`](file:///D:/Documents/resume-agent/backend/agent/state.py#L13)), and directly edit or delete bullets and entries.
11. Protects canvas mutations from Read-Modify-Write (RMW) race conditions via in-memory reference-counted session locking ([`session_lock`](file:///D:/Documents/resume-agent/backend/core/concurrency.py)).
12. Manages persistent state in Supabase PostgreSQL using connection pooling ([`AsyncConnectionPool`](file:///D:/Documents/resume-agent/backend/repository/resume_repository.py)) and LangGraph checkpointing ([`AsyncPostgresSaver`](file:///D:/Documents/resume-agent/backend/main.py)).
13. Generates high-fidelity ATS-compliant vector PDF ([`pdf_exporter.py`](file:///D:/Documents/resume-agent/backend/services/pdf_exporter.py)) and Microsoft Word DOCX ([`docx_exporter.py`](file:///D:/Documents/resume-agent/backend/services/docx_exporter.py)) documents.

### Scope Demarcation (Implementation Status)

| Feature / Capability | Status in Current Implementation | PRD Alignment |
| :--- | :--- | :--- |
| **DOCX Resume Ingestion & Parsing** | Implemented (`python-docx` traversing paragraphs & tables with zip-bomb protection) | Current System |
| **Job URL Ingestion & Scraping** | Implemented (`trafilatura` + `httpx` for LinkedIn, Indeed, Workday) | Current System |
| **Direct Job Description Paste Fallback** | Implemented (Direct text input + scraping error fallback) | Current System |
| **LLM Job Description Validation** | Implemented (Structured extraction via GPT-4o in `resume_pre_llm.py`) | Current System |
| **Candidate Gap & Fit Analysis** | Implemented (`CandidateAnalysis` structured prompt in `analysis.py`) | Current System |
| **Interactive Interview Planning & Chat**| Implemented (LangGraph state machine + `interrupt` loops) | Current System |
| **Topic Context Resetting & Evidence Bank** | Implemented (`reset_investigation` via `RemoveMessage` + `evidence_with_details` bank) | Current System |
| **Single-Entity Disambiguation** | Implemented (4 scoped schemas + required-field validation + tab redirection) | Current System |
| **Evidence Provenance Mapping** | Implemented (`evidence_mapper` node in `tailor_agent.py`) | Tailoring Pipeline |
| **Resume Bullet Point Tailoring** | Implemented (`tailor_resume_bullet_points` in `tailor_agent.py`) | Tailoring Pipeline |
| **Adversarial Factuality Critic** | Implemented (`critique_tailored_bullet_points` at `temperature=0`) | Tailoring Pipeline |
| **Self-Correction & Regeneration Loop** | Implemented (`regenerate_bullets` node in `tailor_agent.py`) | Tailoring Pipeline |
| **Interactive Canvas State Mutations** | Implemented (`services/canvas_service.py` with reverse-chronological insertion) | Canvas Engine |
| **Pessimistic Concurrency Locking** | Implemented (`core/concurrency.py` reference-counted `asyncio.Lock`) | Concurrency Layer |
| **Database Connection Pooling** | Implemented (`repository/resume_repository.py` with `AsyncConnectionPool`) | Data Layer |
| **SSE Token & Status Streaming** | Implemented (`POST /api/chat/stream` with `text/event-stream` and thinking phases) | Real-Time Engine |
| **High-Fidelity DOCX Export** | Implemented (`python-docx` reconstruction in `services/docx_exporter.py`) | Export Engine |
| **ATS Vector PDF Export** | Implemented (`reportlab` vector generation in `services/pdf_exporter.py`) | Export Engine |
| **ATS Optimization Agent** | Planned Final Step (Runs after human approval to optimize for ATS algorithms) | Planned Roadmap |
| **Semantic Candidate Vault (RAG)**| Planned (`pgvector` on Supabase to index historical projects across college career) | Planned Roadmap |
| **Direct Application Submission** | Explicitly Excluded | Non-goal |

---

## 2. High-Level Modular Architecture Overview

The backend is built as an asynchronous Python service using **FastAPI** for HTTP routing, organized into modular domain routers, a specialized service layer, a centralized concurrency core, a data repository with connection pooling, and a stateful **LangGraph** engine backed by **Supabase PostgreSQL** (`AsyncPostgresSaver`).

```mermaid
graph TD
    User([Candidate / Frontend Client]) -->|POST /api/upload| R_Ingest[api/routers/ingestion.py]
    User -->|POST /api/chat\nPOST /api/chat/stream| R_Interview[api/routers/interview.py]
    User -->|GET /api/session/{id}| R_Interview
    User -->|POST /api/apply-tailoring\nPOST /api/edit-entry\nPOST /api/add-bullet...| R_Canvas[api/routers/canvas.py]
    User -->|GET /api/sessions| R_Sessions[api/routers/sessions.py]
    User -->|GET /api/export/pdf\nGET /api/export/docx| R_Export[api/routers/export.py]

    subgraph API_Gateway [API Gateway: api/resume.py]
        R_Ingest
        R_Interview
        R_Canvas
        R_Sessions
        R_Export
    end

    subgraph Core_Layer [Core & Concurrency Layer]
        SessionLock[Reference-Counted Session Lock\n(core/concurrency.py)]
    end

    subgraph Service_Layer [Service Layer]
        DocParser[Document Parser\n(services/document_parser.py)]
        JobFetcher[Job Fetcher\n(services/job_fetcher.py)]
        AnalysisService[Analysis Service\n(services/analysis_service.py)]
        CanvasService[Canvas Service\n(services/canvas_service.py)]
        TailoringService[Tailoring Service\n(services/tailoring_service.py)]
        DateSorter[Date Sorter & Insertion\n(services/date_sorter.py)]
        IdGenerator[ID Allocator\n(services/id_generator.py)]
        PdfExporter[PDF Exporter\n(services/pdf_exporter.py)]
        DocxExporter[DOCX Exporter\n(services/docx_exporter.py)]
    end

    subgraph Data_Layer [Data Access Layer]
        Repo[Resume Repository\n(repository/resume_repository.py)]
        DbPool[(AsyncConnectionPool\nmin=2, max=10)]
        Postgres[(Supabase PostgreSQL)]
    end

    subgraph LangGraph_Runtime [LangGraph Orchestration Runtime]
        GraphService[Graph Service & Streaming\n(agent/graph_service.py)]
        GraphEngine[StateGraph Engine\n(agent/graph.py)]
        Checkpointer[(AsyncPostgresSaver\ncheckpoints table)]
        
        subgraph Graph_Nodes [Agent State Graph]
            AnalyzeNode[analyze_candidate]
            HumanAnalysis[human_after_analysis\n(interrupt)]
            PlannerNode[interview_planner]
            HumanPlanner[human_after_interview_planner\n(interrupt)]
            ResetInvestigate[reset_investigation]
            InvestigateNode[investigate_candidate]
            HumanChat[human_investigate_chat\n(interrupt)]
            EvidenceMapperNode[evidence_mapper]
            TailorNode[tailor_resume_bullet_points]
            CritiqueNode[critique_tailored_bullet_points]
            RegenerateNode[regenerate_bullets]
        end
    end

    R_Ingest --> AnalysisService
    AnalysisService --> DocParser
    AnalysisService --> JobFetcher
    R_Canvas --> CanvasService
    R_Canvas --> TailoringService
    CanvasService --> SessionLock
    TailoringService --> SessionLock
    CanvasService --> DateSorter
    CanvasService --> IdGenerator
    TailoringService --> DateSorter
    TailoringService --> IdGenerator
    R_Export --> PdfExporter
    R_Export --> DocxExporter

    R_Ingest --> GraphService
    R_Interview --> GraphService
    CanvasService -->|aupdate_state| GraphEngine
    TailoringService -->|aupdate_state| GraphEngine

    GraphService --> GraphEngine
    GraphEngine <--> Checkpointer
    Checkpointer <--> Postgres
    Repo <--> DbPool
    DbPool <--> Postgres
```

---

## 3. End-to-End Data Flow

The system operates across four primary interaction phases: Ingestion & Fit Analysis, Conversational Investigation with Context Reset, Provenance Mapping & Tailoring Verification, and Interactive State Modification & Tailoring Application.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client / Frontend UI
    participant API as FastAPI Router (/api)
    participant Svc as Service Layer
    participant Lock as Concurrency Lock (core/concurrency)
    participant Graph as LangGraph Engine
    participant DB as Supabase Postgres (AsyncPostgresSaver)
    participant LLM as OpenAI (GPT-4o)

    Note over User, LLM: Phase 1: Ingestion & Initial Fit Analysis
    User->>API: POST /api/upload (DOCX file, job_link OR job_description)
    API->>Svc: process_resume_analysis(file_bytes, job_url, job_description)
    alt Scraper Error / Insufficient Text (<200 chars)
        Svc-->>API: {success: false, requires_job_description: true, error: "..."}
        API-->>User: 200 OK: Prompt user to paste job description
    else Valid Content
        Svc->>Svc: parse_resume(file_bytes) -> sentences & tables
        Svc->>LLM: validate_job_details(job_text) -> JobDetails
        Svc->>LLM: structure_resume_data(sentences) -> ResumeStructure (with entry_ids assigned)
        Svc-->>API: {success: true, structured_resume, job_details}
        API->>Graph: initialize_tailoring_session(session_id, resume_data, job_details)
        Graph->>LLM: analyze_candidate(resume, job_details)
        LLM-->>Graph: CandidateAnalysis (fit score, strengths, gaps)
        Graph->>Graph: human_after_analysis (triggers interrupt)
        Graph->>DB: Save thread checkpoint (thread_id=session_id)
        Graph-->>API: Raw interrupt snapshot (__interrupt__)
        API-->>User: 200 OK: session_id, job_details, candidate review options ("done", "need_more_info", "tailor")
    end

    Note over User, LLM: Phase 2: Conversational Investigation Loop
    User->>API: POST /api/chat (session_id, user_message="need_more_info")
    API->>Graph: resume_tailoring_session(session_id, Command(resume="need_more_info"))
    Graph->>DB: Load thread checkpoint
    Graph->>Graph: router_after_analysis -> routes to interview_planner
    Graph->>LLM: interview_agent(job_details, candidate_analysis, resume_data)
    LLM-->>Graph: InterviewPlan (targeted gap topics)
    Graph->>Graph: human_after_interview_planner (triggers interrupt)
    Graph->>DB: Save thread checkpoint
    Graph-->>API: Normalized response (interrupt: {type="investigation_selection", options})
    API-->>User: 200 OK: options to select topic_id or "end"

    User->>API: POST /api/chat (session_id, user_message=selected_topic_id)
    API->>Graph: resume_tailoring_session(session_id, Command(resume=topic_id))
    Graph->>Graph: route_investigation_or_tailoring -> reset_investigation
    Graph->>Graph: reset_investigation (wipes previous topic messages via RemoveMessage)
    Graph->>Graph: transitions to investigate_candidate
    
    loop Investigation Chat & Live Evidence Form
        alt SSE Streaming Request
            User->>API: POST /api/chat/stream (session_id, user_message, form_data)
            API-->>User: SSE: data: {"type": "thinking_stage", "stage": "analyzing"}
        end
        Graph->>LLM: investigate_candidate (ONE question; scoped schema e.g. WorkExperienceMetadata)
        LLM-->>Graph: ScopedInvestigateOutput (need_more_info, user_message, experience_metadata, evidence)
        alt need_more_info == True
            Graph->>Graph: human_investigate_chat (triggers interrupt)
            Graph->>DB: Save thread checkpoint
            Graph-->>API: Normalized response (interrupt: {type="investigation_chat", message, experience_metadata})
            API-->>User: 200 OK / SSE stream: question prompt + form update
            User->>API: POST /api/chat (session_id, user_message=candidate_answer)
            API->>Graph: resume_tailoring_session (resume=answer)
            Graph->>Graph: returns to investigate_candidate
        else need_more_info == False (Sufficient Evidence Gathered or Concluded)
            Graph->>Graph: Append evidence to evidence_with_details
            Graph->>Graph: Append topic_id to completed_topic_ids
            Graph->>Graph: router_to_stop_investigation -> human_after_interview_planner
            Graph-->>API: Normalized response with remaining topics or "end"
            API-->>User: 200 OK: updated topic list
        end
    end

    Note over User, LLM: Phase 3: Resume Tailoring & Adversarial Factuality Verification
    User->>API: POST /api/chat (session_id, user_message="end" OR "tailor")
    API->>Graph: resume_tailoring_session(session_id, Command(resume="end"))
    Graph->>Graph: routes to evidence_mapper
    Graph->>LLM: evidence_mapper(evidence_with_details, resume_data)
    LLM-->>Graph: EvidenceMappingResult (MATCHED vs UNMATCHED provenance)
    Graph->>LLM: tailor_resume_bullet_points(evidence_mapping, resume_data)
    LLM-->>Graph: TailorAnalysis (tailor_matched_list + tailor_unmatched_list)
    
    loop Adversarial Factuality Verification Loop
        Graph->>LLM: critique_tailored_bullet_points(proposals, evidence_with_details) [temperature=0]
        LLM-->>Graph: Feedbacks (list of {bullet_feedbacks, topic_id})
        alt Any feedback item has invalid bullet
            Graph->>Graph: router_to_generate -> regenerate_bullets
            Graph->>LLM: regenerate_bullets (rewrites unsupported claims using critic suggestions)
            LLM-->>Graph: RegeneratedBulletsList (updates proposals)
            Graph->>Graph: returns to critique_tailored_bullet_points
        else All feedbacks valid (or max iterations reached)
            Graph->>Graph: router_to_generate -> END
        end
    end
    Graph->>DB: Save final state checkpoint
    Graph-->>API: Normalized response (stage="completed", result={...tailor_analysis, feedbacks})
    API-->>User: 200 OK: Verified tailored bullet points & new experience proposals

    Note over User, DB: Phase 4: Interactive State Synchronization Under Session Lock
    opt Apply Tailored Topic to Working Resume
        User->>API: POST /api/apply-tailoring (session_id, topic_id)
        API->>Lock: async with session_lock(session_id):
        Lock->>DB: Read state (resume_to_edit, tailor_analysis)
        Lock->>Svc: Apply MATCHED bullets (MODIFY/ADD) or UNMATCHED in reverse chronological order
        Lock->>DB: aupdate_state({"resume_to_edit": resume_to_edit})
        Lock-->>API: {status: "updated", resume_to_edit}
        API-->>User: 200 OK: Working resume updated
    end
    opt In-Place Canvas Bullet & Entry Editing
        User->>API: POST /api/edit-entry (session_id, entry_id, patch_data)
        API->>Lock: async with session_lock(session_id):
        Lock->>DB: Read state -> Update sparse fields -> sort reverse-chronologically if duration changed
        Lock->>DB: aupdate_state({"resume_to_edit": resume_to_edit})
        API-->>User: 200 OK: {status: "updated"}
    end
    opt Document Export
        User->>API: GET /api/export/pdf?session_id=...
        API->>Svc: generate_pdf(resume_to_edit)
        Svc-->>User: 200 OK: Binary vector PDF attachment
    end
```

---

## 4. LangGraph State Machine Specification

### 4.1 State Schema ([`AgentState`](file:///D:/Documents/resume-agent/backend/agent/state.py))

| Field | Type | Reducer | Description |
| :--- | :--- | :--- | :--- |
| `messages` | `Sequence[BaseMessage]` | `add_messages` | Global conversation/agent messages. |
| `resume_data` | `ResumeStructure` | None (overwrite) | Baseline structured resume extracted from uploaded DOCX. Immutable ground truth. |
| `resume_to_edit` | `ResumeStructure` | None (overwrite) | Mutable working copy accumulating applied tailoring changes and canvas edits. |
| `job_details` | `JobDetails` | None (overwrite) | Validated job details model. |
| `candidate_analysis` | `CandidateAnalysis` | None (overwrite) | Gap, strength, and match score assessment. |
| `candidate_profile_data`| `Optional[dict]` | None (overwrite) | Extended profile background. |
| `human_next_action` | `Optional[str]` | None (overwrite) | Selection from `candidate_review` interrupt (`"done"`, `"need_more_info"`, `"tailor"`). |
| `score` | `Literal["weak match", "good match", "strong match"]` | None | Candidate match score. |
| `relevant_experience` | `str` | None | High-level summary of relevant background. |
| `strengths` | `list[str]` | None | Identified candidate strengths. |
| `gaps` | `list[str]` | None | Identified candidate qualification gaps. |
| `interview_plan` | `InterviewPlan` | None (overwrite) | Targeted gap investigation topics model. |
| `topic_id_selection` | `str` | None (overwrite) | Currently active investigation topic identifier. |
| `need_more_info` | `bool` | None (overwrite) | Flag controlling the conversational probe loop. |
| `completed_topic_ids` | `Annotated[list[str], add]` | `operator.add` | Accumulator list of finished topic IDs. |
| `applied_tailored_topic_ids`| `Annotated[list[str], add]` | `operator.add` | Accumulator list of topic IDs applied to `resume_to_edit`. |
| `proceed_to_tailor_resume`| `bool` | None (overwrite) | Flag signalling transition to resume tailoring. |
| `investigation_messages`| `Sequence[BaseMessage]` | `add_messages` | Topic-scoped conversation messages (cleared by `reset_investigation`). |
| `evidence_with_details` | `Annotated[list[EvidenceWithDetails], add]` | `operator.add` | Accumulated evidence records across all interview topics. |
| `human_investigate_action`| `Optional[str]` | None (overwrite) | Candidate action during interview (`"chat"`, `"form_update"`, `"conclude"`, `"skip"`). |
| `evidence_mapping` | `EvidenceMappingResult` | None (overwrite) | Provenance mapping of evidence to resume entries. |
| `tailor_analysis` | `TailorAnalysis` | None (overwrite) | Proposals: `tailor_matched_list` (modifications) + `tailor_unmatched_list` (new entries). |
| `feedbacks` | `Feedbacks` | None (overwrite) | Factuality critic results with per-bullet validation flags. |
| `iteration_loop` | `int` | None (overwrite) | Counter tracking critic regeneration cycles (max 4). |
| `active_experience_metadata`| `Optional[dict]` | None (overwrite) | Live structured identity fields (Company, Title, Dates, Location) streaming to form. |
| `is_sufficient` | `Optional[bool]` | None (overwrite) | Flag indicating if sufficient context was gathered for the active topic. |

---

## 5. API Contracts & Endpoint Reference

All endpoints are hosted under prefix `/api` and authenticate via Supabase JWT Bearer tokens.

### 5.1 Ingestion Router ([`api/routers/ingestion.py`](file:///D:/Documents/resume-agent/backend/api/routers/ingestion.py))

* **`POST /api/upload`**:
  * **Payload**: `multipart/form-data` (`file: UploadFile`, `job_link: Optional[str]`, `job_description: Optional[str]`).
  * **Security Guards**:
    * 10MB file size ceiling (`HTTP 413`).
    * Uncompressed ZIP extraction limit 50MB (`HTTP 413`).
    * Compression ratio limit >100:1 defense against ZIP bombs (`HTTP 400`).
    * MIME check: DOCX only (`HTTP 400`).
  * **Behavior**: Parses paragraphs and tables, extracts job requirements, initializes PostgreSQL session checkpoints (`thread_id=session_id`), and binds session ownership to `current_user["id"]`.

### 5.2 Interview Router ([`api/routers/interview.py`](file:///D:/Documents/resume-agent/backend/api/routers/interview.py))

* **`POST /api/chat`**:
  * **Payload**: `session_id: str`, `user_message: str`, `action: Optional[str]`, `form_data: Optional[str]`.
  * **Behavior**: Resumes paused LangGraph execution via `Command(resume=...)`. Supports conversational turns, form edits, skips, and conclusions.
* **`POST /api/chat/stream`**:
  * **Payload**: Same as `/chat`.
  * **Response**: `text/event-stream` Server-Sent Events (SSE). Streams `thinking_stage` frames (`analyzing`, `evaluating`, `synthesizing`), individual token chunks (`{"type": "token", "content": "..."}`), and final `done` payloads.
* **`POST /api/reset-topic-chat`**:
  * **Payload**: `session_id: str`, `new_experience_type: Optional[str]`.
  * **Behavior**: Wipes intermediate topic messages via `RemoveMessage` and begins a fresh inquiry for a switched category (e.g. pivoting from Work Experience to a personal Project).
* **`GET /api/session/{session_id}`**:
  * **Behavior**: Retrieves current state snapshot (`resume_to_edit`, `candidate_analysis`, `interview_plan`, `tailor_analysis`) directly from `graph_with_memory.aget_state()`.

### 5.3 Canvas Router ([`api/routers/canvas.py`](file:///D:/Documents/resume-agent/backend/api/routers/canvas.py))

All canvas mutations run inside `async with session_lock(session_id):` to prevent Read-Modify-Write race conditions.

* **`POST /api/apply-tailoring`**: Merges proposals for `topic_id` into `resume_to_edit`. Idempotent (`status: "already_applied"` if repeated). Inserts new entries in reverse chronological order.
* **`POST /api/custom-tailoring`**: Edits proposal bullet text in `tailor_analysis` prior to application.
* **`POST /api/delete-bullet`**: Non-mutating list comprehension removal of a bullet by `sentence_id`.
* **`POST /api/delete-entry`**: Non-mutating list comprehension removal of an entry by `entry_id`.
* **`POST /api/edit-resume-bullets`**: Updates bullet text in `resume_to_edit` by `sentence_id`.
* **`POST /api/edit-entry`**: Polymorphic JSON endpoint (`EditEntryRequest`) updating sparse fields (company, title, dates, GPA, coursework, etc.) by `entry_id`.
* **`POST /api/add-bullet`**: Appends bullet with auto-sequenced `sentence_id` via `get_next_sentence_id`.
* **`POST /api/add-entry`**: Inserts a new entry into `work_experience`, `projects`, `leadership`, `education`, or `certifications` in reverse chronological order based on duration parsing.
* **`POST /api/edit-skills`**: Replaces technical skills categorized lists in `resume_to_edit.skills`.
* **`POST /api/update-resume`**: Full document state synchronization payload (`UpdateResumeRequest`).

### 5.4 Export & Sessions Routers

* **`GET /api/sessions`** ([`api/routers/sessions.py`](file:///D:/Documents/resume-agent/backend/api/routers/sessions.py)): Lists all historical sessions belonging to `current_user["id"]`.
* **`GET /api/export/pdf`** ([`api/routers/export.py`](file:///D:/Documents/resume-agent/backend/api/routers/export.py)): Streams ATS-compliant vector PDF binary with strict 0.5-inch margins and two-column tabular layout.
* **`GET /api/export/docx`** ([`api/routers/export.py`](file:///D:/Documents/resume-agent/backend/api/routers/export.py)): Streams ATS Microsoft Word `.docx` binary with native `List Bullet` paragraph styling.

---

## 6. Systems Engineering Deep Dives

### 6.1 Concurrency Control & The "Lost Update" Anomaly ([`core/concurrency.py`](file:///D:/Documents/resume-agent/backend/core/concurrency.py))

* **The Problem**: FastAPI runs an asynchronous event loop on a single main OS thread. When two rapid requests arrive (e.g. student rapidly edits Bullet 1 and deletes Bullet 2), both execute `await aget_state()`, fetching the same initial snapshot ($V_0$). When both coroutines complete and write back via `aupdate_state()`, the second request overwrites the first, silently erasing the first update.
* **The Solution**: An in-memory, reference-counted session lock:
  ```python
  @asynccontextmanager
  async def session_lock(session_id: str):
      if session_id not in session_locks:
          session_locks[session_id] = [asyncio.Lock(), 0]
      entry = session_locks[session_id]
      entry[1] += 1
      lock = entry[0]
      await lock.acquire()
      try:
          yield
      finally:
          lock.release()
          entry[1] -= 1
          if entry[1] == 0:
              session_locks.pop(session_id, None)
  ```
* **Critical Rule**: `aget_state` must be called *inside* the locked context so the coroutine reads the fresh state committed by any preceding request.

### 6.2 Database Connection Pooling ([`repository/resume_repository.py`](file:///D:/Documents/resume-agent/backend/repository/resume_repository.py))

* **The Problem**: Initially, every request called synchronous `psycopg.connect()`. In an async FastAPI server, synchronous network handshakes block the Python event loop thread, converting async concurrency into serialized blocking I/O and exhausting Supabase connection slots under load.
* **The Solution**: `psycopg_pool.AsyncConnectionPool` initialized during FastAPI lifespan:
  ```python
  _pool = AsyncConnectionPool(DATABASE_URL, min_size=2, max_size=10, open=False)
  await _pool.open()
  ```
  Queries borrow pre-authenticated, warm connections via `async with pool.connection() as conn:`, reducing authorization latency from ~200ms to under 2ms.

### 6.3 TCP Sockets & Server-Sent Events (SSE) Streaming ([`agent/graph_service.py`](file:///D:/Documents/resume-agent/backend/agent/graph_service.py))

* **The Wire Protocol**: Uses standard HTTP/1.1 or HTTP/2 over an open TCP socket with headers:
  ```http
  Content-Type: text/event-stream
  Cache-Control: no-cache
  Connection: keep-alive
  X-Accel-Buffering: no
  ```
* **Deterministic Teardown**: As soon as generation completes, the async generator exits, prompting Uvicorn to send a `TCP FIN` packet and close the socket immediately, avoiding zombie connection leaks.
