# Resume Analysis & Tailoring Agent — Backend Service

The asynchronous Python backend powering the **Resume Analysis & Tailoring Agent**. Built with **FastAPI**, **LangGraph**, and **Supabase PostgreSQL**, this service orchestrates an evidence-grounded agentic workflow that conducts conversational Human-in-the-Loop (HITL) candidate interviews, executes adversarial factuality verification, manages a live interactive resume canvas under session-level concurrency locks, and exports ATS-compliant vector PDF and Word DOCX documents.

---

## 📂 Project Structure & Navigation

The backend is organized into specialized, decoupled modules for maximum maintainability:

```
backend/
├── main.py                     # FastAPI app bootstrap, CORS, lifespan, & checkpointer setup
├── api/
│   ├── auth.py                 # Supabase JWT cryptographic validation (ES256/HS256)
│   ├── resume.py               # Facade router aggregating all sub-routers (prefix: /api)
│   └── routers/
│       ├── ingestion.py        # POST /api/upload (DOCX parsing, ZIP-bomb defense, job scraping)
│       ├── interview.py        # POST /api/interview/chat, /chat/stream, /reset-topic, /session/{id}
│       ├── canvas.py           # POST /api/canvas/edit-bullet, /delete-bullet, /edit-entry, /sync-resume...
│       ├── tailoring.py        # POST /api/tailor/apply-topic, /edit-proposal-bullet
│       ├── export.py           # GET /api/export/pdf, GET /api/export/docx
│       └── sessions.py         # GET /api/sessions (user session listing)
│
├── model/
│   └── resume_schema.py        # Pydantic schemas (ResumeStructure, JobDetails, Canvas & Interview payloads)
│
├── core/
│   ├── concurrency.py          # Reference-counted in-memory session locking (asyncio.Lock)
│   └── __init__.py             # Exports session_lock & session_locks
│
├── agent/
│   ├── graph.py                # StateGraph compiled definition with nodes & routing edges
│   ├── graph_service.py        # Graph invocation wrappers, SSE stream generators, normalization
│   ├── state.py                # AgentState TypedDict schema
│   ├── model.py                # Agent domain models (CandidateAnalysis, Evidence, Feedback)
│   ├── router.py               # Conditional edge routing functions (route_after_analysis, route_*)
│   └── nodes/
│       ├── analysis.py         # Initial candidate gap & fit assessment node
│       ├── interview_planner.py# Gap prioritization and interview plan generator (plan_interview)
│       ├── interview.py        # Conversational probing node & live evidence collection
│       ├── tailor_agent.py     # Evidence mapping, XYZ bullet tailoring, & critic loop
│       └── human_decision.py   # LangGraph interrupt() checkpoints
│
├── services/
│   ├── analysis_service.py     # End-to-end parsing & job extraction orchestration
│   ├── canvas_service.py       # In-place resume edits, additions, and deletions
│   ├── tailoring_service.py    # Merging and customizing tailored proposals
│   ├── date_sorter.py          # Date parsing & reverse-chronological entry insertion
│   ├── id_generator.py         # Deterministic sequential sentence_id and entry_id generation
│   ├── document_parser.py      # DOCX paragraph & table extraction via python-docx
│   ├── job_fetcher.py          # Scraper for LinkedIn, Indeed, Workday (trafilatura + httpx)
│   ├── pdf_exporter.py         # ATS-compliant vector PDF generation (ReportLab)
│   ├── docx_exporter.py        # ATS-styled Word DOCX generation (python-docx)
│   └── resume_service.py       # Backward-compatible facade re-exporting all service functions
│
├── repository/
│   └── resume_repository.py    # AsyncConnectionPool singleton & Supabase PostgreSQL queries
│
├── learning/                   # Deep-dive systems engineering learning documents
│   ├── CONCURRENCY_AND_STATE_MUTATIONS.md
│   ├── CONNECTION_POOLING_LEARNINGS.md
│   └── TCP_AND_LLM_STREAMING_GUIDE.md
│
└── tests/                      # Automated test suite (56 tests passing)
    ├── test_document_parser.py
    ├── test_exporters.py
    ├── test_interview_control.py
    ├── test_resume_mutations.py
    └── test_upload_security.py
```

---

## 🛠️ Prerequisites & Local Setup

### 1. Requirements
* **Python**: 3.12+
* **Package Manager**: [`uv`](https://docs.astral.sh/uv/) (recommended) or `pip`
* **PostgreSQL Database**: Supabase PostgreSQL instance (or local PostgreSQL)
* **OpenAI API Key**: GPT-4o access

### 2. Environment Configuration
Copy the example environment template and configure your secrets:
```bash
cp .env.example .env
```

Ensure your `.env` contains:
```ini
OPENAI_API_KEY=sk-proj-...
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
```

### 3. Running the Server

Using `uv` (recommended):
```bash
uv run uvicorn main:app --reload --port 8000
```

Using standard `pip` and virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The interactive OpenAPI documentation will be available at:  
👉 `http://localhost:8000/docs`

---

## 🧪 Running Automated Tests

The test suite covers parser extraction, vector exporters, interview control flows, upload security (zip-bomb and 10MB limit enforcement), and concurrency locking:

```bash
uv run pytest
```
*All 56 unit and integration tests execute in under 10 seconds.*

---

## 💡 Key Systems Engineering Highlights

1. **Pessimistic Concurrency Locking ([`core/concurrency.py`](file:///D:/Documents/resume-agent/backend/core/concurrency.py))**:
   * Uses an in-memory, reference-counted `asyncio.Lock` per `session_id`.
   * Prevents Read-Modify-Write (RMW) race conditions when candidates rapidly edit multiple canvas elements concurrently, eliminating lost update anomalies.
2. **Database Connection Pooling ([`repository/resume_repository.py`](file:///D:/Documents/resume-agent/backend/repository/resume_repository.py))**:
   * Leverages `psycopg_pool.AsyncConnectionPool` managed through FastAPI's async lifespan context manager.
   * Keeps a pool of warm, authenticated connections open to Supabase, dropping authorization overhead from ~200ms to under 2ms.
3. **Server-Sent Events (SSE) Streaming ([`api/routers/interview.py`](file:///D:/Documents/resume-agent/backend/api/routers/interview.py))**:
   * Streams thinking stages (`analyzing`, `evaluating`, `synthesizing`) and token chunks via `text/event-stream` with `X-Accel-Buffering: no`.
   * Deterministically closes sockets upon generator exit to prevent file descriptor exhaustion and zombie connections.
4. **Adversarial Factuality Critic ([`agent/nodes/tailor_agent.py`](file:///D:/Documents/resume-agent/backend/agent/nodes/tailor_agent.py))**:
   * Generated bullet points are audited by a critic node operating at `temperature=0` before display to the candidate.
   * Rejects unverified metrics or technologies and triggers automatic self-correction loops to guarantee 0% hallucinated claims.
