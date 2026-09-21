# Frontend UX & Architecture Specification
## Resume Analysis & Tailoring Platform: Executive Co-Author Workspace

Comprehensive frontend architecture, interaction design specification, and API integration contract for the **Resume Analysis Agent** client application.

---

## 1. Core Design Philosophy: The Executive Co-Author Workspace

The application adheres to a foundational UX principle: **A Premium Document Workspace Augmented by an Evidence-Based Investigation Agent**.

Rather than trapping the candidate in a generic AI chatbot or overwhelming them with AI SaaS hype and constant glowing animations, the platform feels like a calm, high-precision document studio where an intelligent agent acts as an investigative journalist and executive editor:

```mermaid
graph LR
    P1[Phase 1: Ingestion & Verification] -->|Begin Investigation| P2[Phase 2: Evidence Gathering]
    P2 -->|Proceed to Tailoring| P3[Phase 3: Co-Author Review & Live Canvas]
    P3 -->|All Proposals Decided| P3_5[Phase 3.5: ATS Optimization (Roadmap Slot)]
    P3_5 -->|Proceed| P4[Phase 4: Side-by-Side Compare & Export]
```

### 1.1 Aesthetic & Visual Principles
* **Restrained Executive Palette (Zinc & Emerald)**:
  * **Neutral Foundation**: Deep zinc background (`zinc-950` in dark mode, `zinc-100/zinc-50` in light mode) with crisp monochrome typography (Inter / Geist).
  * **Intentional Emerald Accent**: Emerald is reserved *strictly* for agent activity (investigation progress), verified evidence (facts, metrics), applied enhancements, and primary confirm actions. No gratuitous rainbow gradients or perpetual glows.
  * **Transient Micro-Animations**: When the agent applies or saves modifications, a soft, subtle emerald/cyan pulse (~2.5 seconds) spotlights the exact document insertion, then gently settles into clean, print-ready document typography.
* **Spatial Hierarchy**:
  * **Phase 1**: Centered Ingestion ──> Split Verification Dashboard (Structured Job Card vs Candidate Fit).
  * **Phase 2**: 2-Column Shell ──> Persistent Evidence Locker (Left 35%) + Guided Interview Workspace (Right 65%).
  * **Phase 3**: Dual-Pane Studio ──> Tactile Paper Canvas (Left 55%) + Editorial Co-Author Inspector (Right 45%).
  * **Phase 4**: Synchronized Comparison ──> Side-by-Side Comparison (Original `resume_data` vs Tailored `resume_to_edit`) + Print-to-PDF Toolbar.

---

## 2. Phase-by-Phase Interaction Specifications

### Phase 1: Context & Setup

#### 1.1 Ingestion State
* **Inputs**:
  * Drag-and-drop file uploader for Microsoft Word (`.docx`) resumes.
  * Target Job Input with dual modes:
    * **Mode A (Default)**: Job URL field supporting LinkedIn, Indeed, and Workday (`myworkdayjobs.com`).
    * **Mode B (Fallback / Manual)**: Plaintext Job Description textarea.
* **Resilience & Fallback Flow**:
  * If the candidate submits a URL but the backend scraper encounters anti-bot defenses or extracts insufficient text (<200 characters), `/tailor/upload` returns:
    ```json
    {
      "success": false,
      "requires_job_description": true,
      "error": "Could not extract sufficient job details from linkedin. Please paste the job description instead.",
      "session_id": "..."
    }
    ```
  * The UI smoothly unfolds the Mode B textarea, displays an informative amber banner with the error message, retains the uploaded `.docx` file and `session_id`, and allows the candidate to paste the job text and retry with zero lost progress.
* **Progressive Milestones**: Multi-step progress indicator during initial ingestion:
  * `✓ Ingesting & structuring resume (ResumeStructure)`
  * `✓ Validating target job requirements (JobDetails)`
  * `✓ Evaluating candidate alignment & identifying gaps (CandidateAnalysis)`

#### 1.2 Split Verification Dashboard
Once ingestion and candidate analysis complete, the view transitions into a 2-column verification dashboard:
* **Left Column: Structured Job Card**:
  * Displays parsed [`JobDetails`](file:///D:/Documents/resume-agent/backend/model/job_pydantic.py#L7-L30) (`job_title`, `job_company`, `job_location`, core responsibilities, key requirements tags).
  * Candidate immediately verifies that the scraper or validator captured the correct job posting.
* **Right Column: Candidate Fit Assessment**:
  * Fit Rating Badge (`Strong Match`, `Good Match`, or `Weak Match`).
  * AI Executive Insight (`candidate_analysis.user_message`).
  * Confirmed Strengths (green badges with evidence) vs. Flagged Evidence Gaps (amber badges with gap reasons).
* **Primary Actions**:
  * `Begin Evidence Gathering (N Gaps Identified) →` (Resumes LangGraph with `user_message: "need_more_info"`).
  * `Skip to Tailoring` (Secondary button, resumes LangGraph with `user_message: "tailor"`).
  * `Finish Review` (Tertiary button, calls `user_message: "done"`).

---

### Phase 2: Evidence Gathering (LangGraph HITL Interview)

#### 2.1 Persistent Context Area (Left Panel ~35%)
* **Topic-Anchored Evidence Tracker**:
  * Displays the prioritized investigation topics from [`InterviewPlan`](file:///D:/Documents/resume-agent/backend/agent/model.py#L89-L91).
  * Sorted by priority: `High` (coral/red badge), `Medium` (amber badge), `Low` (blue badge).
  * Each topic card displays:
    * Topic title (e.g., *"Distributed Systems & Kafka"*)
    * Underlying Job Requirement backlink in muted text
    * Status: `In Progress` (active spinner), `Needs Evidence` (selectable card), or `Evidence Secured` (green checkmark).
* **Accumulated Evidence Locker**:
  * Real-time display of facts gathered across all completed topics ([`evidence_with_details`](file:///D:/Documents/resume-agent/backend/agent/state.py#L33)).
  * Shows verified facts: `technologies`, `ownership`, `metrics`, `scope`, `impact`.
* **Satisfied Base Match (Bottom Accordion)**:
  * Collapsed count: `Confirmed Strengths (N) ▼`.
  * Expands to show skills already verified from the baseline resume.
* **Full Job Description Drawer**:
  * Reference button (`View full job listing ↗`) opening an on-demand slide-over drawer.

#### 2.2 Active Workspace (Right Panel ~65%)
* **Topic Selection State**:
  * Displays unprobed topic cards alongside a prominent `Proceed to Tailoring →` button (`id: "end"`).
* **Active Probe State**:
  * The backend executes [`reset_investigation`](file:///D:/Documents/resume-agent/backend/agent/nodes/interview.py#L11-L17) before each topic, resetting thread messages while preserving the cumulative evidence bank.
  * Contextual header displaying the active topic, target job requirement, and investigation objective.
  * Conversational message thread showing the agent's targeted probe (strictly one question at a time).
  * Response composer equipped with:
    * **Guidance Chips**: Subtle suggestions (e.g., *“💡 Tips: State your personal ownership, tools used, and throughput metrics”*).
    * **Fast-Forward Button**: `I lack this experience` (pre-fills composer with *"I do not have verifiable experience with this requirement, let's move on."*).
    * `Submit Answer`: Primary button sending candidate response text via `POST /tailor/chat`.
* **Topic Completed State ("Evidence Secured" Card)**:
  * When the agent returns `need_more_info == False`, an inline success card displays the extracted facts (`technologies`, `ownership`, `metrics`, `impact`).
  * The topic transitions to `✓ Evidence Secured`, and the workspace returns to topic selection or direct tailoring.

---

### Phase 3: Resume Tailoring & Proposal Review

#### 3.1 Transition Synthesis Screen
Generating verified bullet proposals, running factuality critique, and executing self-correction takes ~5–12 seconds. A progressive synthesis screen provides visual assurance:
* `✓ Synthesizing verified evidence from interview`
* `✓ Mapping evidence provenance to resume entries`
* `✓ Formulating XYZ bullet enhancements (Accomplished X, as measured by Y, by doing Z)`
* `✓ Running Factuality Critic to eliminate hallucinations`
* `✓ Finalizing verified proposals...`
* *Reassurance Callout*: "Every recommendation is strictly anchored to verified evidence. You have final approval over every single modification."

#### 3.2 Synchronized Dual-Pane Layout

```
┌───────────────────────────────────────────────┬───────────────────────────────────────────────┐
│ LEFT PANE (55%): TACTILE PAPER CANVAS          │ RIGHT PANE (45%): EDITORIAL DEBRIEF INSPECTOR │
│                                               │                                               │
│  ┌─────────────────────────────────────────┐  │  [ Topic Tabs: Kafka (3) | Leadership (1) ]   │
│  │ A4/Letter Paper Sheet                   │  │                                               │
│  │ (Subtle drop shadow & realistic margins)│  │  ┌─────────────────────────────────────────┐  │
│  │                                         │  │  │ Topic: Kafka & Event Streaming          │  │
│  │ Jane Doe                                │  │  │ Target: Distributed Systems Reqt        │  │
│  │                                         │  │  │                                         │  │
│  │ WORK EXPERIENCE                         │  │  │ Ground-Truth Evidence Factsheet:        │  │
│  │ Senior Software Engineer                │  │  │ [50K msgs/sec] [Kafka] [Python]         │  │
│  │ • Bullet 1 text...  [ ✏️ | 🗑️ ]         │  │  │                                         │  │
│  │ • ✨ Enhanced XYZ Bullet...             │  │  │ Factuality Seal: ✓ 100% Critic Verified │  │
│  │   (Soft emerald pulse on insertion)     │  │  │                                         │  │
│  │                                         │  │  │ Proposed Bullet 1:                      │  │
│  │                                         │  │  │ [- Old text strikethrough -]            │  │
│  │                                         │  │  │ [+ New XYZ text with bold metrics +]    │  │
│  │                                         │  │  │ [ ✏️ Edit wording ]                     │  │
│  │                                         │  │  │                                         │  │
│  │                                         │  │  │ [ ✨ Apply Topic to Resume ]            │  │
│  └─────────────────────────────────────────┘  │  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

#### 3.3 Left Pane (55%): Tactile Paper Canvas (Live Working Resume)
* **Visual Styling**:
  * Rendered as an A4/Letter proportioned sheet with subtle drop-shadow (`shadow-md`), crisp typography (Inter / Geist font), and authentic document margins.
  * Live representation of [`resume_to_edit`](file:///D:/Documents/resume-agent/backend/agent/state.py#L13).
* **Notion-Style In-Place Hover Actions**:
  * **Bullet Level**: Hovering over any bullet reveals subtle quick-action icons `[ ✏️ Edit | 🗑️ Delete ]` in the margin:
    * Clicking **Edit** seamlessly turns the bullet into an active in-place text area. Pressing `Enter` or blurring commits the revision via [`POST /tailor/edit-resume-bullets`](file:///D:/Documents/resume-agent/backend/api/resume.py#L107-L112).
    * Clicking **Delete** removes the bullet via [`POST /tailor/delete-bullet`](file:///D:/Documents/resume-agent/backend/api/resume.py#L100-L105).
  * **Entry Level**: Hovering over an experience or project header reveals a subtle `[ 🗑️ Delete Entry ]` button that prompts and deletes the entire role/project via [`POST /tailor/delete-entry`](file:///D:/Documents/resume-agent/backend/api/resume.py#L114-L119).
* **Agent Spotlight & Insertion Pulse**:
  * When a topic's enhancements are applied, the document smoothly auto-scrolls to center the modified entry.
  * Newly inserted or modified bullets pulse with a soft agentic glow (`emerald-500/20` border and soft wash) tagged with a temporary *"✨ Agent Updated"* chip that fades after ~2.5 seconds into clean document typography.

#### 3.4 Right Pane (45%): Editorial Co-Author Inspector
* **Topic Switcher Header**:
  * Filter pills: `[ All Topics (N) | Pending (N) | Applied (N) ]` enabling candidates to quickly filter out already integrated topics or inspect verified evidence.
  * Pill tabs representing each investigated topic (e.g., `[ Kafka & Streaming ] [ Team Leadership ]`).
  * Status badges on each pill: `Pending Review` (amber dot) or `✓ Applied` (emerald check badge).
* **Debrief Inspection Card**:
  * **Target Requirement**: The specific job requirement probed during the interview.
  * **Factsheet Tags**: Pills showing the verified facts extracted by the agent (*"50K msgs/sec scale"*, *"Kafka brokers"*, *"35% latency drop"*).
  * **Factuality Critic Audit Seal**:
    * Clean, prominent badge: *"✓ 100% Fact-Checked by Critic (0 Hallucinations)"* derived from [`Feedbacks`](file:///D:/Documents/resume-agent/backend/agent/model.py#L234-L236).
  * **Proposed Bullets Diff**:
    * **Matched Modifications**: Original bullet rendered in muted red strikethrough; proposed XYZ bullet rendered with bold additions highlighting metrics and technologies.
    * **Unmatched New Roles/Projects**: Displays proposed company name, title, duration, technologies, and new achievement bullets.
    * **Inline Tweak**: Each proposal card features a `[ ✏️ Edit wording ]` button. Clicking it expands a textarea to customize the proposal before application, persisted via [`POST /tailor/custom-tailoring`](file:///D:/Documents/resume-agent/backend/api/resume.py#L77-L86).
* **Topic Apply Action & Idempotency**:
  * Primary button: `✨ Apply Topic to Resume`.
  * Calls [`POST /tailor/apply-tailoring`](file:///D:/Documents/resume-agent/backend/api/resume.py#L67-L75).
  * **Auto-Advance**: Upon successful application, the inspector automatically advances to the next pending topic for seamless co-authoring.
  * **Locked State**: Once applied, the button permanently transitions to a disabled `✓ Applied to Resume` badge. The "Re-Apply" button is removed to prevent duplicate bullet/entry accumulation.
  * **Persistence**: `applied_tailored_topic_ids` is stored in checkpointer state and rehydrated upon page reload (`F5`).

---

### Phase 3.5: ATS Optimization Stage (Planned Roadmap Slot)
* **Status**: Reserved slot/stub.
* **Flow**: Once all proposals are reviewed in Phase 3, the user can advance through ATS optimization to evaluate keyword density and formatting score before final export.

---

### Phase 4: Final Comparison & Export

#### 4.1 Soft Gate Transition
* If the user clicks `Finish Review & Compare` while some topics remain unapplied, a gentle confirmation dialog appears:
  > *"You have 1 unapplied topic ('Team Leadership'). Would you like to apply it before finishing, or proceed with your current draft?"*
  > `[ Apply & Finish ]` `[ Proceed As-Is ]` `[ Keep Reviewing ]`

#### 4.2 Completion Milestone Banner
* Upon entering Phase 4, an executive milestone banner appears:
  > *"Agent Tailoring Complete • N Topics Applied • 100% Verified Evidence • 0 Hallucinations"*

#### 4.3 Side-by-Side Synchronized Document Comparison
* **Dual Paper Sheets**:
  * **Left Sheet**: Original Uploaded Resume ([`resume_data`](file:///D:/Documents/resume-agent/backend/agent/state.py#L12), untouched ground-truth baseline).
  * **Right Sheet**: Final Tailored Resume ([`resume_to_edit`](file:///D:/Documents/resume-agent/backend/agent/state.py#L13), containing all applied enhancements and human edits).
  * **Synchronized Scrolling**: Scrolling either sheet keeps the other aligned section-by-section.
* **Toolbar & Controls**:
  * **Toggle Highlights**: `[ Highlight Enhancements: ON / OFF ]`. When OFF, renders in clean, print-ready typography. When ON, highlights additions in soft emerald.
  * `Print / Save as PDF`: Immediate browser print-to-PDF stylesheet with clean pagination, typography, and zero UI artifacts.
  * `Download DOCX`: Secondary action with a "Coming Soon" toast until backend DOCX generation is completed.
  * `← Back to Editor`: Returns to Phase 3 to tweak any bullet.

---

## 3. Dual-State Architecture & State Synchronization

The system maintains a strict separation between original baseline facts and the mutable working draft:

| State Field | Source | Mutability | Purpose |
| :--- | :--- | :--- | :--- |
| `resume_data` | Uploaded DOCX parsing | **Immutable** | Ground-truth reference for factuality critiques and Phase 4 comparison left pane. |
| `resume_to_edit` | Initialized with `resume_data` | **Mutable** | Working resume document updated by tailoring applications and manual user edits. |
| `tailor_analysis` | Agent synthesis | **Mutable** | Proposals bank; individual bullets can be customized via `custom-tailoring`. |

### 3.1 Backend State Synchronization Contract
All mutation endpoints directly return the updated state objects in their JSON response, ensuring zero race conditions and instant UI re-rendering:

* `POST /tailor/apply-tailoring` ──> Returns `{ "status": "updated", "resume_to_edit": ResumeStructure }`
* `POST /tailor/custom-tailoring` ──> Returns `{ "status": "updated", "tailor_analysis": TailorAnalysis }`
* `POST /tailor/edit-resume-bullets` ──> Returns `{ "status": "edited", "resume_to_edit": ResumeStructure }`
* `POST /tailor/delete-bullet` ──> Returns `{ "status": "deleted", "resume_to_edit": ResumeStructure }`
* `POST /tailor/delete-entry` ──> Returns `{ "status": "deleted", "resume_to_edit": ResumeStructure }`

---

## 4. Architecture & Frontend Directory Structure

The Next.js frontend in `frontend/` is structured as follows:

```
frontend/
├── app/
│   ├── layout.tsx                      # Root layout with fonts & theme provider
│   ├── page.tsx                        # Main page rendering the active phase
│   └── globals.css                     # Tailwind CSS & print-to-PDF stylesheets
├── components/
│   ├── header.tsx                      # Job title badge, session ID, reset action
│   ├── phase-setup/
│   │   ├── dropzone.tsx                # DOCX upload & job URL/description inputs
│   │   └── split-verification.tsx      # JobDetails card vs CandidateAnalysis fit
│   ├── phase-interview/
│   │   └── interview-workspace.tsx     # Evidence tracker sidebar + probe chat
│   ├── phase-tailor/
│   │   ├── tailoring-workspace.tsx     # Dual-pane container & topic coordinator
│   │   ├── tactile-paper-canvas.tsx    # Left pane: A4 document sheet with hover tools
│   │   └── editorial-debrief.tsx       # Right pane: Topic debrief cards & diffs
│   └── phase-compare/
│       └── final-comparison.tsx        # Side-by-side comparison & print toolbar
├── hooks/
│   ├── use-tailoring-session.ts        # LangGraph state store & API orchestrator
│   └── use-rotating-phrase.ts          # Synthesis animation phrases
└── lib/
    ├── api-client.ts                   # Typed HTTP client for all /tailor endpoints
    ├── types.ts                        # TypeScript interfaces matching backend schemas
    └── utils.ts                        # Styling and className helpers
```

---

## 5. Complete API Client & TypeScript Interfaces

### 5.1 API Client Functions (`frontend/lib/api-client.ts`)

```typescript
// Initial Ingestion
export async function uploadResume(file: File, jobLink?: string, jobDescription?: string): Promise<UploadResponse>;

// LangGraph HITL Resumption
export async function sendChatMessage(sessionId: string, userMessage: string): Promise<ChatResponse>;

// State Rehydration
export async function getSessionState(sessionId: string): Promise<SessionStateResponse>;

// State Modification Endpoints
export async function applyTailoring(sessionId: string, topicId: string): Promise<ApplyTailoringResponse>;
export async function customTailoring(sessionId: string, topicId: string, sentenceId: number, newText: string): Promise<CustomTailoringResponse>;
export async function editResumeBullet(sessionId: string, sentenceId: number, newText: string): Promise<EditBulletResponse>;
export async function deleteBullet(sessionId: string, sentenceId: number): Promise<DeleteBulletResponse>;
export async function deleteEntry(sessionId: string, entryId: number): Promise<DeleteEntryResponse>;
```

### 5.2 TypeScript Data Schemas (`frontend/lib/types.ts`)

```typescript
export interface ResumeBullet {
  text: string;
  sentence_id: number;
}

export interface ResumeExperience {
  entry_id?: number | null;
  company?: string | null;
  job_title?: string | null;
  location?: string | null;
  duration?: string | null;
  technologies?: string[] | null;
  bullets: ResumeBullet[];
}

export interface ResumeLeadership {
  entry_id?: number | null;
  title: string;
  position?: string | null;
  bullets: ResumeBullet[];
}

export interface ResumeEducation {
  entry_id?: number | null;
  institution?: string | null;
  degree?: string | null;
  field_of_study?: string | null;
  location?: string | null;
  duration?: string | null;
  gpa?: string | null;
  coursework?: string[] | null;
  sentence_ids: number[];
}

export interface ResumeProject {
  entry_id?: number | null;
  project_name?: string | null;
  technologies?: string[] | null;
  bullets: ResumeBullet[];
}

export interface ResumeCertification {
  entry_id?: number | null;
  name: string;
  date?: string | null;
  sentence_ids: number[];
}

export interface ResumeSkills {
  programming_languages?: string[];
  frameworks?: string[];
  libraries?: string[];
  databases?: string[];
  cloud?: string[];
  tools?: string[];
  other?: string[];
  sentence_ids: number[];
}

export interface ResumeStructure {
  name?: string | null;
  contact?: string | null;
  leadership: ResumeLeadership[];
  work_experience: ResumeExperience[];
  education: ResumeEducation[];
  projects: ResumeProject[];
  certifications: ResumeCertification[];
  skills?: ResumeSkills | null;
}

export interface TailorDecisionMatched {
  action: "KEEP" | "MODIFY" | "ADD";
  old_bullet?: ResumeBullet | null;
  new_bullet?: ResumeBullet | null;
  reasoning: string;
  evidence: string[];
}

export interface TailorMatched {
  decisions: TailorDecisionMatched[];
  resume_reference: {
    type: "projects" | "work_experience" | "leadership";
    entry_id: number;
  };
  topic_id: string;
}

export interface TailorDecisionUnmatched {
  action: "ADD";
  new_bullet: ResumeBullet;
  reasoning: string;
  evidence: string[];
}

export interface TailorUnmatched {
  decisions: TailorDecisionUnmatched[];
  type: "leadership" | "work_experience" | "projects";
  company_name?: string | null;
  duration?: string | null;
  job_location?: string | null;
  job_title?: string | null;
  skills?: string[] | null;
  project_name?: string | null;
  topic_id: string;
  leadership_position?: string | null;
  leadership_title?: string | null;
}

export interface TailorAnalysis {
  tailor_matched_list: TailorMatched[];
  tailor_unmatched_list: TailorUnmatched[];
}

export interface BulletFeedback {
  valid: boolean;
  suggestions: string;
  sentence_id: number;
}

export interface Feedback {
  bullet_feedbacks: BulletFeedback[];
  topic_id: string;
}

export interface Feedbacks {
  feedbacks: Feedback[];
}

// API Response Types
export interface ApplyTailoringResponse {
  status: "updated" | "not_found";
  resume_to_edit?: ResumeStructure;
}

export interface CustomTailoringResponse {
  status: "updated" | "not_found";
  tailor_analysis?: TailorAnalysis;
}

export interface EditBulletResponse {
  status: "edited" | "not_found";
  resume_to_edit?: ResumeStructure;
}

export interface DeleteBulletResponse {
  status: "deleted" | "not_found";
  resume_to_edit?: ResumeStructure;
}

export interface DeleteEntryResponse {
  status: "deleted" | "not_found";
  resume_to_edit?: ResumeStructure;
}
```

---

## 6. Verification & Usability Testing Checklist

* [ ] **Upload Resilience**: Verify DOCX upload with live URL; verify graceful fallback to pasted text when scraping is blocked.
* [ ] **Interview Topic Isolation**: Verify that switching interview topics wipes previous question messages while accumulating the persistent evidence bank.
* [ ] **Debrief Inspection**: Verify topic tab navigation and display of factsheet metrics, critic audit seal, and proposed before/after diffs.
* [ ] **Topic Tailoring Apply**: Verify that clicking `Apply Topic to Resume` triggers `POST /tailor/apply-tailoring`, updates `resume_to_edit`, and triggers smooth scroll + emerald pulse on the live paper canvas.
* [ ] **In-Place Live Resume Editing**: Verify hovering over bullets in the live canvas reveals edit/delete icons and blur/Enter commits `POST /tailor/edit-resume-bullets`.
* [ ] **In-Place Bullet Deletion**: Verify deleting a bullet removes it from the sheet and updates state via `POST /tailor/delete-bullet`.
* [ ] **Entry Deletion**: Verify deleting a whole role/project entry updates state via `POST /tailor/delete-entry`.
* [ ] **Soft Gate on Phase 4**: Verify that attempting to exit Phase 3 with unapplied topics triggers the confirmation modal.
* [ ] **Synchronized Comparison & Print**: Verify that Phase 4 side-by-side view renders original (`resume_data`) vs tailored (`resume_to_edit`) with synchronized scrolling and zero print-to-PDF layout distortion.
