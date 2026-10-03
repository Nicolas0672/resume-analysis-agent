# Resume Analysis Agent

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://resume-analysis-agent-ten.vercel.app)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.2-orange?style=for-the-badge&logo=langchain&logoColor=white)](https://langchain-ai.github.io/langgraph/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://supabase.com)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)

> An evidence-based, Human-in-the-Loop (HITL) agent that interviews candidates on missing job requirements, extracts quantifiable metrics, and generates verified, hallucination-free resume enhancements.

---

## 🎯 The Motivation: "Instead of Changing Words, We Enrich Facts"

Job seekers spend hours repeatedly prompting generic AI tools to tailor resumes for individual postings, only to receive generic rewordings or unverified buzzwords. Naive AI resume tools claim to "boost ATS scores" with a single click, but they operate by blindly swapping synonyms or outright fabricating accomplishments. When a candidate reaches a technical interview, unsupported claims collapse under scrutiny.

This project was built out of firsthand frustration with that cycle:
* **The Problem**: Conventional AI tools prioritize speed over context. They mask real skill gaps instead of solving them, leaving candidates with resumes they cannot defend.
* **The Solution**: An investigative co-author workflow. Rather than guessing, the agent conducts a targeted technical interview on identified gaps, extracts concrete evidence (ownership, tools, metrics, impact), validates every claim through an automated factuality critic, and maps verified facts back to the resume using Google XYZ syntax (*Accomplished [X], as measured by [Y], by doing [Z]*).

### Naive AI Wrappers vs. Resume Analysis Agent

| Feature | Naive AI Resume Builders | Resume Analysis Agent |
| :--- | :--- | :--- |
| **Generation Strategy** | Blind LLM rewrite based on shallow text matching | **Human-in-the-Loop (HITL)** targeted interview |
| **Factual Integrity** | High hallucination rate; fabricates metrics and skills | **Automated Factuality Critic** rejects unverified claims |
| **Candidate Context** | Constrained to whatever was in the original draft | **Actively probes for unmentioned real-world experience** |
| **Achievement Syntax** | Passive or generic bullet point rephrasing | **Google XYZ Syntax** (*Accomplished X, measured by Y, doing Z*) |
| **State Management** | Ephemeral, stateless chat requests | **PostgreSQL LangGraph checkpointer** with persistent state |
| **User Control** | All-or-nothing "accept generated resume" | **Dual-state tactile canvas** with in-place human editing |

---

## 🔄 End-to-End Workflow

```
[ Ingest & Parse ] ──> [ Gap Analysis ] ──> [ HITL Interview ] ──> [ Critic & Verify ] ──> [ Co-Author & Export ]
   DOCX + Job URL        Identify Missing      Probe Gaps for        Eliminate            Live Notion-Style
   or Text Fallback      Competencies          Verifiable Facts      Hallucinations       Canvas & Vector PDF
```

1. **Context Ingestion & Schema Parsing**: Parses uploaded `.docx` resumes into a validated Pydantic model (`ResumeStructure`). Ingests job postings via URL scrapers (LinkedIn, Indeed, Workday) with a zero-loss fallback to direct text paste.
2. **Evidence-Based Gap Analysis**: Compares candidate background against verified job requirements, surfacing quantifiable strengths and concrete experience gaps.
3. **Conversational HITL Investigation**: Formulates a prioritized interview plan. For each targeted gap, the agent asks strictly one focused question at a time, extracting metrics, tools, and project scope while maintaining a clean conversational context per topic.
4. **Factuality Critic & Self-Correction Loop**: Maps gathered evidence back to resume entries (`evidence_mapper`). A dedicated adversarial critic node evaluates proposed bullets against the candidate's verified evidence bank, rejecting any unsupported claim and cycling through a regeneration loop until 100% verified.
5. **Interactive Co-Author Canvas & Export**: A synchronized dual-pane workspace rendering the immutable original resume alongside a live, mutable working copy. Candidates can tweak proposals, edit or delete bullets in-place, and export to ATS-optimized vector PDF or DOCX.

---

## 🏗️ Architecture & Agentic System Design

The system runs an asynchronous **FastAPI** backend orchestrating a stateful **LangGraph** engine backed by **Supabase PostgreSQL** for distributed session persistence.

```mermaid
flowchart TD
    Start([Upload Resume & Job]) --> Ingest[Document Parser & Job Fetcher]
    Ingest --> Analyze[analyze_candidate]
    Analyze --> HumanReview{human_after_analysis\nInterrupt}
    
    HumanReview -->|"tailor"| EvidenceMap[evidence_mapper]
    HumanReview -->|"done"| EndSession([End Session])
    HumanReview -->|"need_more_info"| Planner[interview_planner]
    
    Planner --> TopicSelect{human_after_interview_planner\nInterrupt}
    TopicSelect -->|"end"| EvidenceMap
    TopicSelect -->|select topic_id| ResetCtx[reset_investigation\nClear Topic Messages]
    
    ResetCtx --> Investigate[investigate_candidate\nProbe Gap for Metrics]
    Investigate --> NeedMore{need_more_info?}
    NeedMore -->|Yes| ChatInterrupt{human_investigate_chat\nInterrupt}
    ChatInterrupt -->|Candidate Answer| Investigate
    NeedMore -->|No: Evidence Secured| TopicSelect
    
    EvidenceMap --> Tailor[tailor_resume_bullet_points\nXYZ Syntax Generation]
    Tailor --> Critic[critique_tailored_bullet_points\nAdversarial Factuality Check]
    Critic --> FactCheck{All Bullets Valid?}
    FactCheck -->|No| Regen[regenerate_bullets\nSelf-Correction Loop]
    Regen --> Critic
    FactCheck -->|Yes| Ready([Proposals Ready for Human Review])

    subgraph Persistence Layer
        Checkpointer[(Supabase PostgreSQL\nAsyncPostgresSaver)]
    end
    HumanReview -.-> Checkpointer
    TopicSelect -.-> Checkpointer
    ChatInterrupt -.-> Checkpointer
```

### Key Engineering Decisions

* **Stateful Interrupts & Asynchronous Resumption**: Uses LangGraph `interrupt()` primitives to pause execution during human review and conversational probes. Sessions survive client reloads and network drops via distributed checkpointing in `AsyncPostgresSaver`.
* **Adversarial Factuality Critic**: Generated enhancements do not bypass directly to the user. A critic node verifies proposed metrics, technologies, and responsibilities against accumulated evidence, ensuring 0% hallucinated claims.
* **Dual-State Immutability Model**: The original parsed resume (`resume_data`) is preserved as immutable ground truth. All tailoring updates and manual user edits operate on a separate working draft (`resume_to_edit`), enabling side-by-side diffing and zero data destruction.
* **Topic Context Isolation with Global Evidence Accumulation**: To prevent context window bloat and prompt drift, `reset_investigation` emits `RemoveMessage` to reset chat history between interview topics, while appending verified facts to a global, append-only `evidence_with_details` bank.
* **Scraping Resilience & Zero-Loss Fallback**: If third-party job boards trigger anti-bot challenges or return insufficient text (<200 characters), the backend cleanly falls back to manual job description entry without losing the uploaded resume or session state.

> For the comprehensive architectural specification, node logic, and data schemas, see [ARCHITECTURE.md](file:///D:/Documents/resume-agent/ARCHITECTURE.md). For frontend interaction design, see [FRONTEND.md](file:///D:/Documents/resume-agent/FRONTEND.md).

---

## 🚀 Current Implementation vs. Scaling Roadmap

We approach system design intentionally: **every component is introduced to solve a specific bottleneck at scale**.

```
[ Current Implementation ]                      [ Planned Scaling Roadmap ]
├── FastAPI + AsyncPostgresSaver                ├── Vector DB & Semantic RAG (pgvector)
├── LangGraph HITL State Machine                ├── Async Job Scraping Queue (Celery/Redis)
├── Multi-Node Factuality Critic                ├── Multi-Version Baseline Resume Locker
└── Next.js 16 Executive Canvas Studio          └── Quantified Gap-Closure Analytics
```

| Area | Current Implementation | Production Scaling Roadmap | The "Why" Behind the Upgrade |
| :--- | :--- | :--- | :--- |
| **Agent Checkpointing** | **Supabase PostgreSQL** (`AsyncPostgresSaver` via `psycopg3`) | Redis cache + PostgreSQL connection pooling | Migrated from SQLite to enable multi-worker horizontal scaling and persistent thread recovery across server restarts. |
| **Candidate History** | Ingests uploaded DOCX into working state | **Vector Database / RAG** (`pgvector`) | As a candidate's repository of projects, metrics, and past roles grows, RAG prevents exceeding context limits while retrieving relevant past accomplishments. |
| **Job Ingestion** | Synchronous scraping via `trafilatura` + `httpx` with manual fallback | Distributed background task queue (Celery / Redis) | Decouples scraping latency and anti-bot retries from the user-facing HTTP request cycle. |
| **Export Engine** | Vector PDF (`reportlab`) & DOCX (`python-docx`) | Headless document rendering service | Guarantees pixel-perfect ATS layout fidelity across varying document templates and typography standards. |

---

## 💻 Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Backend & API** | [Python 3.12](https://python.org), [FastAPI](https://fastapi.tiangolo.com), [Pydantic v2](https://docs.pydantic.dev), [Uvicorn](https://www.uvicorn.org) |
| **Agent & LLM Orchestration** | [LangGraph](https://langchain-ai.github.io/langgraph/), [LangChain](https://python.langchain.com/), [OpenAI GPT-4o](https://platform.openai.com) |
| **Persistence & Database** | [Supabase PostgreSQL](https://supabase.com), `AsyncPostgresSaver`, `psycopg3` |
| **Document Processing & Export** | `python-docx` (DOCX parsing/generation), `reportlab` (vector PDF export), `trafilatura` (job scraping) |
| **Frontend UI & Workspace** | [Next.js 16](https://nextjs.org) (App Router), [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com), [Lucide Icons](https://lucide.dev) |
| **Deployment & Observability** | [Vercel](https://vercel.com) (Frontend), [LangSmith](https://smith.langchain.com) (Agent tracing & debugging) |

---

## ⚡ Quickstart & Local Setup

### Prerequisites
* Python 3.12+
* Node.js 18+ & npm
* OpenAI API Key
* Supabase PostgreSQL database URL (or local PostgreSQL)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/resume-agent.git
cd resume-agent
```

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
# Alternatively, if using uv:
# uv pip install -r pyproject.toml

# Configure environment variables
cp .env.example .env
```

Ensure your `.env` contains:
```ini
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=postgresql://user:password@host:port/dbname
```

Start the FastAPI backend server:
```bash
uvicorn main:app --reload --port 8000
```
*API documentation will be accessible at `http://localhost:8000/docs`.*

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
*Open [http://localhost:3000](http://localhost:3000) to access the Executive Co-Author Workspace.*

---

## 📚 Deep Dive Documentation

* [ARCHITECTURE.md](file:///D:/Documents/resume-agent/ARCHITECTURE.md) — Comprehensive technical architecture, state schema specifications, routing logic, and complete API endpoint contracts.
* [FRONTEND.md](file:///D:/Documents/resume-agent/FRONTEND.md) — Detailed UX design specifications, component hierarchy, phase transitions, and tactile canvas interaction designs.
* [PRD.md](file:///D:/Documents/resume-agent/PRD.md) — Product requirements document, acceptance criteria, and non-goals.
