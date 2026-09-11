# Frontend UX & Architecture Specification
## Resume Analysis & Tailoring Platform

Comprehensive frontend architecture, interaction design specification, and API integration contract for the **Resume Analysis Agent** client application.

---

## 1. Core Design Philosophy: The Adaptive Shell

The application adheres to a foundational UX principle: **Persistent Context + Phase-Specific Active Workspace**.

Rather than forcing every interaction into a generic chatbot or rigid document viewer, the interface dynamically reconfigures its spatial hierarchy to match the candidate's cognitive task across progressive phases:

```mermaid
graph LR
    P1[Phase 1: Setup & Verification] -->|Begin Investigation| P2[Phase 2: Evidence Gathering]
    P2 -->|Proceed to Tailoring| P3[Phase 3: Proposal Review]
    P3 -->|All Proposals Decided| P3_5[Phase 3.5: ATS Optimization (Slot/Stub)]
    P3_5 -->|Proceed| P4[Phase 4: Final Compare & Export]
```

```
Phase 1: Centered Ingestion  ──> Split Verification Dashboard (Structured Job Card vs Candidate Fit)
Phase 2: 2-Column Shell     ──> Persistent Evidence Tracker (Left 35%) + Guided Interview Workspace (Right 65%)
Phase 3: Dual-Pane Review    ──> Live Structured Resume with Spotlight (Left 55%) + Proposal Decision Inspector (Right 45%)
Phase 3.5: ATS Optimization ──> Keyword Alignment & Formatting Review (Slot reserved for future backend node)
Phase 4: Dual-Pane Compare   ──> Synchronized Side-by-Side (Original vs Tailored) + Print-to-PDF / Export Bar
```

---

## 2. Phase-by-Phase Interaction Specifications

### Phase 1: Context & Setup

#### 1.1 Ingestion State
- **Inputs**:
  - Drag-and-drop file uploader for Microsoft Word (`.docx`) resumes.
  - Target Job Input with dual modes:
    - **Mode A (Default)**: Job URL field supporting LinkedIn, Indeed, and Workday (`myworkdayjobs.com`).
    - **Mode B (Fallback / Manual)**: Plaintext Job Description textarea.
- **Resilience & Fallback Flow**:
  - If the candidate submits a URL but the backend scraper fails or extracts insufficient text (<200 characters), `/tailor/upload` returns:
    ```json
    {
      "success": false,
      "requires_job_description": true,
      "error": "Could not extract sufficient job details from linkedin. Please paste the job description instead.",
      "session_id": "..."
    }
    ```
  - The UI smoothly unfolds the Mode B textarea, displays an informative banner with the error message, retains the uploaded `.docx` file and `session_id`, and allows the candidate to paste the job text and retry with zero lost progress.
- **Progressive Milestones**: Multi-step progress indicator during initial ingestion:
  - `✓ Ingesting & structuring resume (ResumeStructure)`
  - `✓ Validating target job requirements (JobDetails)`
  - `✓ Evaluating candidate alignment & identifying gaps (CandidateAnalysis)`

#### 1.2 Split Verification Dashboard
Once ingestion and candidate analysis complete, the view transitions into a 2-column verification dashboard:
- **Left Column: Structured Job Card**:
  - Displays parsed [`JobDetails`](file:///D:/Documents/resume-agent/backend/model/job_pydantic.py#L6-L30) (`job_title`, `job_company`, `job_location`, core responsibilities, key requirements tags).
  - Eliminates guesswork: Candidate immediately verifies that the scraper or validator captured the correct job posting.
- **Right Column: Candidate Fit Assessment**:
  - Fit Rating Badge (`Strong Match`, `Good Match`, or `Weak Match`).
  - AI Executive Insight (`candidate_analysis.user_message`).
  - Confirmed Strengths (green badges) vs. Flagged Evidence Gaps (amber badges).
- **Primary Actions**:
  - `Begin Evidence Gathering (N Gaps Identified) →` (Resumes LangGraph with `user_message: "need_more_info"`).
  - `Skip to Tailoring` (Secondary button, resumes LangGraph with `user_message: "tailor"`).
  - `Finish Review` (Tertiary button, calls `user_message: "done"`).

---

### Phase 2: Evidence Gathering (LangGraph HITL Interview)

#### 2.1 Persistent Context Area (Left Panel ~35%)
- **Topic-Anchored Evidence Tracker**:
  - Displays the prioritized investigation topics from [`InterviewPlan`](file:///D:/Documents/resume-agent/backend/agent/model.py#L48-L49).
  - Sorted by priority: `High` (coral/red badge), `Medium` (amber badge), `Low` (blue badge).
  - Each topic card displays:
    - Topic title (e.g., *"Distributed Systems & Kafka"*)
    - Underlying Job Requirement backlink in muted text
    - Status: `In Progress` (active spinner), `Needs Evidence` (selectable card), or `Evidence Secured` (green checkmark).
- **Accumulated Evidence Locker**:
  - Real-time display of evidence gathered from completed topics ([`evidence_with_details`](file:///D:/Documents/resume-agent/backend/agent/state.py#L32)).
  - Shows verified facts: `technologies`, `ownership`, `metrics`, `scope`, `impact`.
- **Satisfied Base Match (Bottom Accordion)**:
  - Collapsed count: `Confirmed Strengths (N) ▼`.
  - Expands to show skills already verified from the baseline resume so the sidebar remains clean.
- **Full Job Description Drawer**:
  - Reference button (`View full job listing ↗`) opening an on-demand slide-over drawer.

#### 2.2 Active Workspace (Right Panel ~65%)
- **Topic Selection State**:
  - Displays unprobed topic cards from `options` alongside a prominent `Proceed to Tailoring →` button (`id: "end"`).
- **Active Probe State**:
  - Note: The backend executes [`reset_investigation`](file:///D:/Documents/resume-agent/backend/agent/nodes/interview.py#L11-L17) before each topic, resetting thread messages while preserving the cumulative evidence bank.
  - Contextual header displaying the active topic, target job requirement, and investigation objective.
  - Conversational message thread showing the agent's targeted probe (strictly one question at a time).
  - Response composer box equipped with:
    - **Guidance Chips**: Subtle suggestions (e.g., *“💡 Tips: State your personal ownership, tools used, and throughput metrics”*).
    - **Action Buttons**:
      - `I lack this experience`: Pre-fills the composer textarea with *"I do not have verifiable experience with this requirement, let's move on."* allowing the user to tweak or add context before submitting.
      - `Submit Answer`: Primary button sending candidate response text via `POST /tailor/chat`.
- **Topic Completed State ("Evidence Secured" Card)**:
  - When the agent returns `need_more_info == False`, an inline success card displays the extracted facts (`technologies`, `ownership`, `metrics`, `impact`).
  - The left sidebar topic transitions to `✓ Evidence Secured`, and the workspace returns to topic selection or direct tailoring.

---

### Phase 3: Resume Tailoring & Proposal Review

#### 3.1 Transition Synthesis Screen
Generating verified bullet proposals, running factuality critique, and executing self-correction takes ~5–12 seconds. A progressive synthesis screen provides visual assurance:
- `✓ Synthesizing verified evidence from interview`
- `✓ Mapping evidence provenance to resume entries`
- `✓ Formulating XYZ bullet enhancements (Accomplished X, as measured by Y, by doing Z)`
- `✓ Running Factuality Critic to eliminate hallucinations`
- `✓ Finalizing verified proposals...`
- *Reassurance Callout*: "Every recommendation is strictly anchored to verified evidence. You have final approval over every single modification."

#### 3.2 Synchronized Dual-Pane Layout
- **Left Pane (55%): Live Resume Document with Active Spotlight**:
  - Clean, formatted document view rendering the candidate's [`ResumeStructure`](file:///D:/Documents/resume-agent/backend/model/job_pydantic.py#L95-L103).
  - **Zero Clutter Principle**: Only the *currently inspected proposal* receives an accent highlight wash and callout border. Surrounding text remains natural and readable.
  - **Margin Pips**: Tiny dots in the document margin indicate where other pending proposals exist.
  - **Auto-Scroll Sync**: When switching proposals in the inspector, the document smoothly scrolls to center the active bullet or section.
- **Right Pane (45%): Proposal Decision Inspector**:
  - **Header & Progress**: `Proposal N of Total • [Section / Role Name]` with stepper navigation (`< Previous`, `Next >`) and jump-to dropdown.
  - **Proposal Type A: Existing Experience Modification ([`TailorMatched`](file:///D:/Documents/resume-agent/backend/agent/model.py#L84-L97))**:
    - `Action Type`: Badge indicating `KEEP`, `MODIFY`, or `ADD`.
    - `Word-Level Diff`:
      - Original bullet rendered with subtle red strikethrough styling.
      - Proposed bullet rendered with bold green additions highlighting technical keywords and metrics.
    - `Reasoning`: AI explanation of why the change improves job alignment.
    - `Evidence Provenance`: Badges displaying verified interview facts used (e.g., *"Kafka pipeline, 50K msgs/sec"*).
    - `Factuality Seal`: *"✓ Fact-Checked & Verified by Critic"* (from [`feedbacks`](file:///D:/Documents/resume-agent/backend/agent/model.py#L139-L141)).
  - **Proposal Type B: New Experience Entry ([`TailorUnmatched`](file:///D:/Documents/resume-agent/backend/agent/model.py#L98-L110))**:
    - Discovered during interview (e.g. unlisted job or project).
    - Displays proposed company name, job title, duration, location, and newly created XYZ bullet points.
    - When accepted, automatically prepends the new entry to the top of the corresponding section (Work Experience or Projects) following reverse-chronological convention.
  - **Decision Actions**:
    - `Reject`: Discards proposal, leaves original text intact, flags bullet with subtle `Kept Original` indicator.
    - `Accept & Apply`: Mutates the bullet or prepends the section on the live resume preview with a subtle green pulse, flags with `✓ Accepted`.
    - `Edit wording`: Toggles an inline text editor directly inside the Decision Inspector card on the right, allowing the candidate to modify the proposed text and click `Apply Custom Bullet`.

---

### Phase 3.5: ATS Optimization Stage (Planned Roadmap Slot)

- **Status in Initial Build**: Reserved slot/stub.
- **Flow**: Once all proposals are accepted/rejected in Phase 3, the user advances directly to Phase 4 (Final Review & Export), leaving an explicit hook/button state for the upcoming ATS Optimization node.
- **Planned Functionality**: Pass approved resume to ATS agent to evaluate keyword density, formatting score, and keyword placement before final export.

---

### Phase 4: Final Review & Export

#### 4.1 Side-by-Side Synchronized Comparison
- **Dual Document Pane**:
  - **Left**: Original Uploaded Resume.
  - **Right**: Final Tailored & Verified Resume.
  - **Synchronized Scrolling**: Scrolling either document keeps the other perfectly aligned section-by-section.
- **Inspection Controls**:
  - **Highlight Changes Toggle**: `[Highlight Changes: ON / OFF]`. When OFF, renders the tailored resume in clean, print-ready typography. When ON, highlights accepted modifications.
  - **Enhancement Summary Banner**: *"N bullets enhanced with verified metrics, N new experiences added • 100% human-verified & fact-checked."*
- **Export Actions**:
  - `Print / Save as PDF`: Immediate browser print-to-PDF stylesheet with clean pagination, typography, and zero UI artifacts.
  - `Download DOCX`: Secondary action showing a "Coming Soon" toast until the backend DOCX generation endpoint is implemented.

---

## 3. Session Rehydration & Navigation

1. **Auto-Rehydration**:
   - Every active session is identified by a UUID stored in both `localStorage` and URL parameters (`?session_id=...`).
   - On page load or refresh, if `session_id` is present, the app automatically calls `GET /tailor/session/{session_id}` and restores the exact phase, active topic, and accepted proposals.
2. **Session Reset**:
   - The top navigation bar includes a permanent `Start New Session` button that clears `localStorage` and navigates to a clean Phase 1 upload state.

---

## 4. Architecture & Frontend Directory Structure

The Next.js application will live in a dedicated `frontend/` directory, keeping the codebase cleanly decoupled from `backend/`:

```
resume-agent/
├── backend/                        # FastAPI backend
├── frontend/                       # Next.js frontend
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── app/
│   │   ├── (workspace)/
│   │   │   ├── page.tsx            # Main adaptive shell page
│   │   │   ├── layout.tsx          # Workspace layout & providers
│   │   │   └── components/
│   │   │       ├── header.tsx      # Target job banner & session reset
│   │   │       ├── phase-setup/    # Phase 1: Ingestion & Verification cards
│   │   │       ├── phase-interview/# Phase 2: Evidence tracker & probe chat
│   │   │       ├── phase-tailor/   # Phase 3: Resume spotlight & proposal inspector
│   │   │       └── phase-compare/  # Phase 4: Side-by-side diff & print toolbar
│   │   ├── hooks/
│   │   │   └── use-tailoring-session.ts # LangGraph state & API orchestrator
│   │   └── lib/
│   │       ├── api-client.ts       # Typed fetch client for /tailor endpoints
│   │       └── types.ts            # TypeScript definitions matching backend schemas
├── ARCHITECTURE.md
├── PRD.md
└── FRONTEND.md
```

---

## 5. API Integration Contract

The frontend communicates with the backend via HTTP (`http://localhost:8000`) with CORS enabled for `http://localhost:3000`.

### 5.1 Ingestion: `POST /tailor/upload`

- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: Binary DOCX file.
  - `job_link`: Optional HttpUrl string.
  - `job_description`: Optional plaintext string.
- **Response Format**:
  ```typescript
  // Successful Ingestion
  interface UploadSuccessResponse {
    success: true;
    session_id: string;
    requires_job_description: false;
    ai_response: {
      __interrupt__: Array<{
        value: {
          type: "candidate_review";
          message: string;
          options: Array<{ id: "done" | "need_more_info" | "tailor"; label: string }>;
        };
      }>;
      candidate_analysis: CandidateAnalysis;
    };
  }

  // Scraper Error / Fallback Needed
  interface UploadFallbackResponse {
    success: false;
    session_id: string;
    requires_job_description: true;
    error: string;
  }
  ```

### 5.2 Chat / Resume: `POST /tailor/chat`

- **Content-Type**: `application/x-www-form-urlencoded` or `multipart/form-data`
- **Form Fields**:
  - `session_id`: UUID string.
  - `user_message`: Response string.
- **Response Format**:
  ```typescript
  // When Interrupted (Awaiting human input)
  interface ChatInterruptResponse {
    message: string;
    ai_response: {
      interrupt: {
        type: "candidate_review" | "investigation_selection" | "investigation_chat";
        message: string;
        options: Array<{
          id: string;
          topic?: string;
          priority?: "High" | "Medium" | "Low";
          reason?: string;
          objective?: string;
          label?: string;
        }>;
      };
    };
  }

  // When Completed (Tailoring & Factuality Verification Complete)
  interface ChatCompletedResponse {
    message: string;
    ai_response: {
      stage: "completed";
      result: {
        resume_data: ResumeStructure;
        job_details: JobDetails;
        candidate_analysis: CandidateAnalysis;
        interview_plan: InterviewPlan;
        completed_topic_ids: string[];
        evidence_with_details: EvidenceWithDetails[];
        evidence_mapping: EvidenceMappingResult;
        tailor_analysis: {
          tailor_matched_list: TailorMatched[];
          tailor_unmatched_list: TailorUnmatched[];
        };
        feedbacks: {
          feedbacks: Feedback[];
        };
      };
    };
  }
  ```

### 5.3 Session Recovery: `GET /tailor/session/{session_id}`

- **Parameters**: `session_id` in path.
- **Response**: Returns normalized snapshot identical to `ChatCompletedResponse` or `ChatInterruptResponse` to allow seamless state rehydration upon page reload.
