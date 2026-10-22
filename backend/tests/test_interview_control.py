import asyncio
import os
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

os.environ["OPENAI_API_KEY"] = "test-key"

from fastapi import HTTPException
from langchain_core.messages import AIMessage, HumanMessage
from agent.model import (
    ALLOWED_KEYS_PER_TYPE,
    Evidence,
    EvidenceWithDetails,
    ExperienceMetadata,
    InterviewDetails,
    InterviewPlan,
    InvestigateOutput,
    LeadershipMetadata,
    OtherMetadata,
    ProjectMetadata,
    ResumeBullet,
    ResumeReference,
    TailorDecisionUnmatched,
    TailorUnmatched,
    TailorUnmatchedList,
    EvidenceMapping,
    EvidenceMappingResult,
    WorkExperienceMetadata,
    WorkInvestigateOutput,
)
from agent.nodes.human_decision import human_after_interview_planner, human_investigate_chat
from agent.nodes.interview import investigate_candidate, reset_investigation, validate_experience_metadata
from agent.nodes.tailor_agent import tailor_resume_bullet_points
from agent.graph_service import resume_tailoring_session
from model.job_pydantic import ResumeExperience, ResumeStructure


class MockInterrupt:
    def __init__(self, value):
        self.value = value


class TestInterviewControl(unittest.IsolatedAsyncioTestCase):
    def test_investigate_output_schema_omits_need_more_info(self):
        """Ensure need_more_info has SkipJsonSchema and is omitted from LLM JSON schema."""
        schema = InvestigateOutput.model_json_schema()
        self.assertNotIn("need_more_info", schema.get("properties", {}))
        self.assertNotIn("need_more_info", schema.get("required", []))
        self.assertIn("experience_metadata", schema.get("properties", {}))
        self.assertIn("is_sufficient", schema.get("properties", {}))

    def test_investigate_output_models_include_is_sufficient(self):
        """Ensure is_sufficient is present in the JSON schema across all specialized investigate output models."""
        from agent.model import ProjectInvestigateOutput, LeadershipInvestigateOutput, OtherInvestigateOutput
        for cls in [InvestigateOutput, WorkInvestigateOutput, ProjectInvestigateOutput, LeadershipInvestigateOutput, OtherInvestigateOutput]:
            schema = cls.model_json_schema()
            self.assertIn("is_sufficient", schema.get("properties", {}))

    def test_normalize_graph_response_preserves_is_sufficient(self):
        """Ensure normalize_graph_response preserves is_sufficient in the normalized interrupt dict."""
        from agent.graph_service import normalize_graph_response
        mock_result = {
            "__interrupt__": [
                MockInterrupt({
                    "type": "investigation_chat",
                    "message": "Wrap up summary",
                    "options": [],
                    "experience_metadata": {"company": "Acme"},
                    "is_sufficient": True,
                })
            ]
        }
        normalized = normalize_graph_response(mock_result)
        self.assertIn("interrupt", normalized)
        self.assertTrue(normalized["interrupt"].get("is_sufficient"))

    def test_validate_experience_metadata(self):
        """Test required and optional field validation across all experience types."""
        # Missing type
        valid, err = validate_experience_metadata(None)
        self.assertFalse(valid)
        valid, err = validate_experience_metadata({})
        self.assertFalse(valid)

        # Work Experience: needs company and job_title
        valid, err = validate_experience_metadata({"experience_type": "work_experience", "company": "Stripe"})
        self.assertFalse(valid)
        self.assertIn("Job Title", err)
        valid, err = validate_experience_metadata({"experience_type": "work_experience", "company": "Stripe", "job_title": "SWE"})
        self.assertTrue(valid)

        # Project: needs project_name (role is optional)
        valid, err = validate_experience_metadata({"experience_type": "project"})
        self.assertFalse(valid)
        self.assertIn("Project Name", err)
        valid, err = validate_experience_metadata({"experience_type": "project", "project_name": "App"})
        self.assertTrue(valid)
        valid, err = validate_experience_metadata({"experience_type": "project", "project_name": "App", "role": "Creator"})
        self.assertTrue(valid)

        # Leadership: needs leadership_title and position
        valid, err = validate_experience_metadata({"experience_type": "leadership", "leadership_title": "Club"})
        self.assertFalse(valid)
        self.assertIn("Position", err)
        valid, err = validate_experience_metadata({"experience_type": "leadership", "leadership_title": "Club", "position": "President"})
        self.assertTrue(valid)

        # Other: needs other_title
        valid, err = validate_experience_metadata({"experience_type": "other"})
        self.assertFalse(valid)
        self.assertIn("Title", err)
        valid, err = validate_experience_metadata({"experience_type": "other", "other_title": "Open Source Contributor"})
        self.assertTrue(valid)

    def test_reset_investigation_clears_action_and_metadata(self):
        """Ensure reset_investigation clears messages, resets action to chat, and clears metadata."""
        state = {
            "investigation_messages": [AIMessage(content="q1", id="m1")],
            "human_investigate_action": "skip",
            "active_experience_metadata": {"company": "OldCorp"},
        }
        res = reset_investigation(state)
        self.assertEqual(res["human_investigate_action"], "chat")
        self.assertIsNone(res["active_experience_metadata"])
        self.assertEqual(len(res["investigation_messages"]), 1)

    def test_human_after_interview_planner_smart_prepopulation(self):
        """Ensure human_after_interview_planner pre-populates active_experience_metadata if resume entry is linked."""
        topic = InterviewDetails(
            topic_id="topic-work",
            topic="Payments",
            priority="High",
            reason="Core",
            objective="Evaluate payment gateways",
            job_requirement="Stripe API",
            relevant_experience=["Stripe work"],
            relevant_experience_from_resume=[ResumeReference(type="work_experience", entry_id=42)],
            evidence_gap="Details missing",
        )
        exp_entry = ResumeExperience(
            entry_id=42,
            company="Stripe",
            job_title="Staff Engineer",
            duration="2021 - 2024",
            location="Remote",
        )
        state = {
            "interview_plan": InterviewPlan(interview_plan=[topic]),
            "completed_topic_ids": [],
            "resume_data": ResumeStructure(work_experience=[exp_entry]),
        }

        with patch("agent.nodes.human_decision.interrupt", return_value="topic-work"):
            res = human_after_interview_planner(state)
            self.assertEqual(res["topic_id_selection"], "topic-work")
            self.assertEqual(res["human_investigate_action"], "chat")
            self.assertIsNotNone(res["active_experience_metadata"])
            self.assertEqual(res["active_experience_metadata"]["company"], "Stripe")
            self.assertEqual(res["active_experience_metadata"]["job_title"], "Staff Engineer")

    def test_human_investigate_chat_with_form_data(self):
        """Test human_investigate_chat extracts action, message, and form_data."""
        state = {
            "investigation_messages": [AIMessage(content="What was your role in project X?")],
            "active_experience_metadata": None,
        }

        payload = {
            "action": "form_update",
            "message": "Updated role",
            "form_data": {"experience_type": "project", "project_name": "Apollo", "role": "Lead"},
        }
        with patch("agent.nodes.human_decision.interrupt", return_value=payload):
            res = human_investigate_chat(state)
            self.assertEqual(res["human_investigate_action"], "form_update")
            self.assertEqual(res["active_experience_metadata"]["project_name"], "Apollo")
            self.assertEqual(res["investigation_messages"][0].content, "Updated role")

    async def test_investigate_candidate_skip(self):
        """Test investigate_candidate action='skip' bypasses LLM, completes topic, and resets metadata."""
        topic = InterviewDetails(
            topic_id="topic-1",
            topic="Distributed Systems",
            priority="High",
            reason="Core skill",
            objective="Assess Kafka and clustering",
            job_requirement="Kafka clustering experience",
            relevant_experience=["Built data pipelines"],
            relevant_experience_from_resume=None,
            evidence_gap="Kafka clustering specifics unknown",
        )
        state = {
            "topic_id_selection": "topic-1",
            "interview_plan": InterviewPlan(interview_plan=[topic]),
            "investigation_messages": [],
            "evidence_with_details": [],
            "resume_data": None,
            "human_investigate_action": "skip",
            "active_experience_metadata": {"company": "Test"},
        }

        with patch("agent.nodes.interview.ChatOpenAI") as mock_openai:
            res = await investigate_candidate(state)
            mock_openai.assert_not_called()

        self.assertFalse(res["need_more_info"])
        self.assertEqual(res["completed_topic_ids"], ["topic-1"])
        self.assertIsNone(res["active_experience_metadata"])
        self.assertIn("skipped", res["investigation_messages"][0].content.lower())

    async def test_investigate_candidate_conclude_enforces_validation(self):
        """Test investigate_candidate action='conclude' raises HTTPException if required fields are missing."""
        topic = InterviewDetails(
            topic_id="topic-2",
            topic="Cloud Architecture",
            priority="High",
            reason="Essential",
            objective="Evaluate AWS ECS experience",
            job_requirement="AWS ECS and Docker",
            relevant_experience=["Docker containers"],
            relevant_experience_from_resume=None,
            evidence_gap="AWS ECS details missing",
        )
        state_invalid = {
            "topic_id_selection": "topic-2",
            "interview_plan": InterviewPlan(interview_plan=[topic]),
            "investigation_messages": [],
            "evidence_with_details": [],
            "resume_data": None,
            "human_investigate_action": "conclude",
            "active_experience_metadata": {"experience_type": "work_experience", "company": "Acme"}, # missing job_title
        }

        with self.assertRaises(HTTPException) as ctx:
            await investigate_candidate(state_invalid)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Job Title", ctx.exception.detail)

    async def test_investigate_candidate_conclude_success(self):
        """Test investigate_candidate action='conclude' synthesizes evidence and backfills metadata."""
        topic = InterviewDetails(
            topic_id="topic-2",
            topic="Cloud Architecture",
            priority="High",
            reason="Essential",
            objective="Evaluate AWS ECS experience",
            job_requirement="AWS ECS and Docker",
            relevant_experience=["Docker containers"],
            relevant_experience_from_resume=None,
            evidence_gap="AWS ECS details missing",
        )
        state = {
            "topic_id_selection": "topic-2",
            "interview_plan": InterviewPlan(interview_plan=[topic]),
            "investigation_messages": [HumanMessage(content="Built ECS clusters managing 50 microservices")],
            "evidence_with_details": [],
            "resume_data": None,
            "human_investigate_action": "conclude",
            "active_experience_metadata": {
                "experience_type": "project",
                "project_name": "Acme Cloud Platform",
                "role": "Lead Architect",
            },
        }

        mock_evidence = Evidence(
            project_name="Acme Cloud Platform",
            experience_found=["Architected and deployed ECS clusters"],
            technologies=["AWS ECS", "Docker"],
            scope=["Managed 50 microservices"],
        )
        mock_output = InvestigateOutput(
            evidence=mock_evidence,
            user_message="Great, your ECS experience has been synthesized and recorded.",
        )

        with patch("agent.nodes.interview.ChatOpenAI") as mock_openai_cls:
            mock_llm = MagicMock()
            mock_structured = MagicMock()
            mock_structured.ainvoke = AsyncMock(return_value=mock_output)
            mock_llm.with_structured_output.return_value = mock_structured
            mock_openai_cls.return_value = mock_llm

            res = await investigate_candidate(state)

        self.assertFalse(res["need_more_info"])
        self.assertEqual(res["completed_topic_ids"], ["topic-2"])
        self.assertEqual(len(res["evidence_with_details"]), 1)
        self.assertEqual(res["evidence_with_details"][0].evidence.project_name, "Acme Cloud Platform")
        self.assertIsNone(res["active_experience_metadata"])

    async def test_investigate_candidate_reset_topic(self):
        """Test investigate_candidate action='reset_topic' clears messages and generates fresh question."""
        topic = InterviewDetails(
            topic_id="topic-3",
            topic="Database",
            priority="Medium",
            reason="Important",
            objective="Evaluate Postgres",
            job_requirement="PostgreSQL",
            relevant_experience=["Postgres"],
            relevant_experience_from_resume=None,
            evidence_gap="Details missing",
        )
        old_msg = HumanMessage(content="Old message from previous type", id="msg_1")
        state = {
            "topic_id_selection": "topic-3",
            "interview_plan": InterviewPlan(interview_plan=[topic]),
            "investigation_messages": [old_msg],
            "evidence_with_details": [],
            "resume_data": None,
            "human_investigate_action": "reset_topic",
            "active_experience_metadata": {"experience_type": "project"},
        }

        mock_output = InvestigateOutput(
            user_message="Tell me about a project where you used PostgreSQL.",
        )

        with patch("agent.nodes.interview.ChatOpenAI") as mock_openai_cls:
            mock_llm = MagicMock()
            mock_structured = MagicMock()
            mock_structured.ainvoke = AsyncMock(return_value=mock_output)
            mock_llm.with_structured_output.return_value = mock_structured
            mock_openai_cls.return_value = mock_llm

            res = await investigate_candidate(state)

        self.assertTrue(res["need_more_info"])
        self.assertEqual(res["active_experience_metadata"]["experience_type"], "project")
        # Ensure RemoveMessage was returned for old message
        msg_types = [type(m) for m in res["investigation_messages"]]
        self.assertIn(AIMessage, msg_types)

    async def test_resume_tailoring_session_dispatches_action_dict_with_form_data(self):
        """Test that resume_tailoring_session wraps action and form_data into Command(resume=...)."""
        mock_graph = MagicMock()
        mock_graph.aget_state = AsyncMock(return_value=MagicMock(next=["human_investigate_chat"]))
        mock_graph.ainvoke = AsyncMock(return_value={"__interrupt__": [MockInterrupt({"type": "investigation_chat", "message": "Next q"})]})

        mock_request = MagicMock()
        mock_request.app.state.graph_with_memory = mock_graph

        with patch("services.helper.session_lock"):
            res = await resume_tailoring_session(
                session_id="test-session",
                user_message="I handled deployment",
                action="form_update",
                form_data={"company": "Uber"},
                request=mock_request,
            )

        mock_graph.ainvoke.assert_called_once()
        cmd = mock_graph.ainvoke.call_args[0][0]
        self.assertEqual(cmd.resume, {"action": "form_update", "message": "I handled deployment", "form_data": {"company": "Uber"}})

    def test_scoped_metadata_schemas_exclude_foreign_fields(self):
        """Ensure Work schema excludes project/leadership fields, and Project schema excludes company/leadership fields."""
        work_props = WorkExperienceMetadata.model_json_schema().get("properties", {})
        self.assertIn("company", work_props)
        self.assertIn("job_title", work_props)
        self.assertNotIn("project_name", work_props)
        self.assertNotIn("leadership_title", work_props)

        project_props = ProjectMetadata.model_json_schema().get("properties", {})
        self.assertIn("project_name", project_props)
        self.assertIn("role", project_props)
        self.assertNotIn("company", project_props)
        self.assertNotIn("leadership_title", project_props)

        leadership_props = LeadershipMetadata.model_json_schema().get("properties", {})
        self.assertIn("leadership_title", leadership_props)
        self.assertIn("position", leadership_props)
        self.assertNotIn("company", leadership_props)
        self.assertNotIn("project_name", leadership_props)

    async def test_investigate_candidate_chat_with_locked_type_applies_whitelist(self):
        """Ensure when experience_type is locked to work_experience, LLM only updates work fields and strips foreign keys."""
        topic = InterviewDetails(
            topic_id="topic-work-1",
            topic="Backend Architecture",
            priority="High",
            reason="Core requirement",
            objective="Evaluate distributed systems work",
            job_requirement="Microservices and Kubernetes",
            relevant_experience=["Kubernetes at Work"],
            relevant_experience_from_resume=None,
            evidence_gap="Metrics unknown",
        )
        state = {
            "topic_id_selection": "topic-work-1",
            "interview_plan": InterviewPlan(interview_plan=[topic]),
            "investigation_messages": [HumanMessage(content="At Netflix, I migrated 20 services to K8s.")],
            "evidence_with_details": [],
            "resume_data": None,
            "human_investigate_action": "chat",
            "active_experience_metadata": {
                "experience_type": "work_experience",
                "company": "Netflix",
            },
        }

        # Mock LLM returning WorkInvestigateOutput with job_title
        mock_output = WorkInvestigateOutput(
            user_message="How did you handle rollback strategies during the migration?",
            experience_metadata=WorkExperienceMetadata(
                company="Netflix",
                job_title="Senior Platform Engineer",
                duration="2022 - 2024",
            ),
        )

        with patch("agent.nodes.interview.ChatOpenAI") as mock_openai_cls:
            mock_llm = MagicMock()
            mock_structured = MagicMock()
            mock_structured.ainvoke = AsyncMock(return_value=mock_output)
            mock_llm.with_structured_output.return_value = mock_structured
            mock_openai_cls.return_value = mock_llm

            res = await investigate_candidate(state)

        self.assertTrue(res["need_more_info"])
        metadata = res["active_experience_metadata"]
        self.assertEqual(metadata["experience_type"], "work_experience")
        self.assertEqual(metadata["company"], "Netflix")
        self.assertEqual(metadata["job_title"], "Senior Platform Engineer")
        self.assertEqual(metadata["duration"], "2022 - 2024")
        self.assertNotIn("project_name", metadata)
        self.assertNotIn("leadership_title", metadata)

    async def test_investigate_candidate_chat_turn1_auto_classification(self):
        """Ensure on Turn 1 when experience_type is None, LLM detects experience_type and locks it."""
        topic = InterviewDetails(
            topic_id="topic-turn1",
            topic="Open Source",
            priority="Medium",
            reason="Bonus",
            objective="Assess open source projects",
            job_requirement="Rust open source contributions",
            relevant_experience=[],
            relevant_experience_from_resume=None,
            evidence_gap="Everything unknown",
        )
        state = {
            "topic_id_selection": "topic-turn1",
            "interview_plan": InterviewPlan(interview_plan=[topic]),
            "investigation_messages": [HumanMessage(content="I created a Rust open-source library called FastQueue.")],
            "evidence_with_details": [],
            "resume_data": None,
            "human_investigate_action": "chat",
            "active_experience_metadata": None,
        }

        mock_output = InvestigateOutput(
            user_message="What was your architectural approach in FastQueue?",
            experience_metadata=ExperienceMetadata(
                experience_type="project",
                project_name="FastQueue",
                role="Creator & Maintainer",
            ),
        )

        with patch("agent.nodes.interview.ChatOpenAI") as mock_openai_cls:
            mock_llm = MagicMock()
            mock_structured = MagicMock()
            mock_structured.ainvoke = AsyncMock(return_value=mock_output)
            mock_llm.with_structured_output.return_value = mock_structured
            mock_openai_cls.return_value = mock_llm

            res = await investigate_candidate(state)

        self.assertTrue(res["need_more_info"])
        metadata = res["active_experience_metadata"]
        self.assertEqual(metadata["experience_type"], "project")
        self.assertEqual(metadata["project_name"], "FastQueue")
        self.assertEqual(metadata["role"], "Creator & Maintainer")
        # Ensure work fields were not leaked
        self.assertNotIn("company", metadata)
        self.assertNotIn("job_title", metadata)

    async def test_investigate_candidate_chat_category_pivot_redirection(self):
        """Ensure when candidate corrects that experience is from leadership, agent directs them to switch tabs."""
        topic = InterviewDetails(
            topic_id="topic-pivot-1",
            topic="Communication & Leadership",
            priority="High",
            reason="Core requirement",
            objective="Assess cross-functional leadership",
            job_requirement="Cross-functional collaboration and leadership",
            relevant_experience=["Microsoft"],
            relevant_experience_from_resume=None,
            evidence_gap="Specifics missing",
        )
        state = {
            "topic_id_selection": "topic-pivot-1",
            "interview_plan": InterviewPlan(interview_plan=[topic]),
            "investigation_messages": [HumanMessage(content="actually it was from leadership experience. i confused")],
            "evidence_with_details": [],
            "resume_data": None,
            "human_investigate_action": "chat",
            "active_experience_metadata": {
                "experience_type": "work_experience",
                "company": "Microsoft",
            },
        }

        mock_output = WorkInvestigateOutput(
            user_message="Got it, thanks for clarifying! Since this section is currently set up for Work Experience, please switch over to the Leadership tab on the right so we can capture your leadership experience accurately.",
            experience_metadata=WorkExperienceMetadata(
                company="Microsoft",
            ),
        )

        with patch("agent.nodes.interview.ChatOpenAI") as mock_openai_cls:
            mock_llm = MagicMock()
            mock_structured = MagicMock()
            mock_structured.ainvoke = AsyncMock(return_value=mock_output)
            mock_llm.with_structured_output.return_value = mock_structured
            mock_openai_cls.return_value = mock_llm

            res = await investigate_candidate(state)

        self.assertTrue(res["need_more_info"])
        self.assertIn("Leadership tab", res["investigation_messages"][0].content)
        # Ensure active_experience_metadata did not get polluted
        self.assertEqual(res["active_experience_metadata"]["experience_type"], "work_experience")
        self.assertNotIn("leadership_title", res["active_experience_metadata"])

    async def test_investigate_candidate_prompt_contains_objective_as_north_star(self):
        """Ensure system prompt formats the objective as the North Star with Bridge-Back technique instructions."""
        topic = InterviewDetails(
            topic_id="topic-comm-1",
            topic="Cross-Functional Communication",
            priority="High",
            reason="Core soft skill",
            objective="Evaluate cross-team alignment and communication trade-offs",
            job_requirement="Strong cross-functional collaboration and stakeholder alignment",
            relevant_experience=["Microsoft Internship"],
            relevant_experience_from_resume=None,
            evidence_gap="Specific cross-team coordination details missing",
        )
        state = {
            "topic_id_selection": "topic-comm-1",
            "interview_plan": InterviewPlan(interview_plan=[topic]),
            "investigation_messages": [HumanMessage(content="wait i think i got it from my internship at microsoft")],
            "evidence_with_details": [],
            "resume_data": None,
            "human_investigate_action": "chat",
            "active_experience_metadata": {
                "experience_type": "work_experience",
                "company": "Microsoft",
            },
        }

        mock_output = WorkInvestigateOutput(
            user_message="At Microsoft, what was a specific project where you had to collaborate with different teams or departments, and how did you communicate technical constraints?",
            experience_metadata=WorkExperienceMetadata(
                company="Microsoft",
            ),
        )

        with patch("agent.nodes.interview.ChatOpenAI") as mock_openai_cls:
            mock_llm = MagicMock()
            mock_structured = MagicMock()
            mock_structured.ainvoke = AsyncMock(return_value=mock_output)
            mock_llm.with_structured_output.return_value = mock_structured
            mock_openai_cls.return_value = mock_llm

            res = await investigate_candidate(state)

            # Inspect the prompt that was passed to the LLM
            call_args = mock_structured.ainvoke.call_args[0][0]
            system_prompt_content = call_args[0].content

            # Verify Primary Directive and North Star were formatted into system prompt
            self.assertIn("INVESTIGATION TARGET (NORTH STAR)", system_prompt_content)
            self.assertIn("PRIMARY DIRECTIVE — OBJECTIVE-ANCHORED PROBING", system_prompt_content)
            self.assertIn("Evaluate cross-team alignment and communication trade-offs", system_prompt_content)
            self.assertIn("THE BRIDGE-BACK TECHNIQUE", system_prompt_content)

        self.assertTrue(res["need_more_info"])
        self.assertIn("collaborate", res["investigation_messages"][0].content)
        self.assertEqual(res["active_experience_metadata"]["company"], "Microsoft")

    async def test_investigate_candidate_conclude_work_experience_stamps_provenance(self):
        """Test investigate_candidate action='conclude' stamps experience_type and identity fields."""
        topic = InterviewDetails(
            topic_id="topic-msft",
            topic="Cross-Functional Collaboration",
            priority="High",
            reason="Core soft skill",
            objective="Evaluate cross-team coordination",
            job_requirement="Cross-functional collaboration",
            relevant_experience=["Microsoft Internship"],
            relevant_experience_from_resume=None,
            evidence_gap="Specific coordination details missing",
        )
        state = {
            "topic_id_selection": "topic-msft",
            "interview_plan": InterviewPlan(interview_plan=[topic]),
            "investigation_messages": [HumanMessage(content="Collaborated with PM and UX teams on telemetry tools")],
            "evidence_with_details": [],
            "resume_data": None,
            "human_investigate_action": "conclude",
            "active_experience_metadata": {
                "experience_type": "work_experience",
                "company": "Microsoft",
                "job_title": "SWE Intern",
                "duration": "Summer 2024",
                "location": "Redmond, WA",
            },
        }

        # Mock LLM output which might omit experience_type or extract an internal project name
        mock_evidence = Evidence(
            project_name="Telemetry Aggregator",
            experience_found=["Coordinated API contracts across 3 teams"],
            technologies=["TypeScript", "gRPC"],
        )
        mock_output = InvestigateOutput(
            evidence=mock_evidence,
            user_message="Concluded investigation of Microsoft internship.",
        )

        with patch("agent.nodes.interview.ChatOpenAI") as mock_openai_cls:
            mock_llm = MagicMock()
            mock_structured = MagicMock()
            mock_structured.ainvoke = AsyncMock(return_value=mock_output)
            mock_llm.with_structured_output.return_value = mock_structured
            mock_openai_cls.return_value = mock_llm

            res = await investigate_candidate(state)

        evidence = res["evidence_with_details"][0].evidence
        self.assertEqual(evidence.experience_type, "work_experience")
        self.assertEqual(evidence.company, "Microsoft")
        self.assertEqual(evidence.job_title, "SWE Intern")
        self.assertEqual(evidence.duration, "Summer 2024")
        self.assertEqual(evidence.job_location, "Redmond, WA")

    async def test_tailor_unmatched_provenance_lock_work_experience(self):
        """Test tailor_resume_bullet_points enforces type='work_experience' and company/job_title even if LLM guessed project."""
        evidence = Evidence(
            experience_type="work_experience",
            company="Microsoft",
            job_title="SWE Intern",
            project_name="Telemetry Aggregator",
            duration="Summer 2024",
            job_location="Redmond, WA",
            experience_found=["Engineered cross-team data bridge"],
        )
        ev_details = EvidenceWithDetails(
            job_requirement="Cross-functional collaboration",
            topic_id="topic-msft",
            evidence=evidence,
        )
        mapping = EvidenceMapping(
            evidence_with_details=ev_details,
            resume_reference=None,
            mapping_status="UNMATCHED",
            reasoning="Not in current resume",
        )
        state = {
            "evidence_mapping": EvidenceMappingResult(evidence_mappings=[mapping]),
        }

        # Simulate LLM erroneously outputting type='projects' because it saw project_name="Telemetry Aggregator"
        llm_erroneous_unmatched = TailorUnmatchedList(
            tailor_unmatched=[
                TailorUnmatched(
                    decisions=[
                        TailorDecisionUnmatched(
                            action="ADD",
                            new_bullet=ResumeBullet(text="Built cross-team bridge", sentence_id=1),
                            reasoning="Supports requirement",
                            evidence=["Engineered cross-team data bridge"],
                        )
                    ],
                    type="projects",  # Erroneous LLM output!
                    project_name="Telemetry Aggregator",
                    company_name=None,
                    job_title=None,
                    topic_id="topic-msft",
                )
            ]
        )

        with patch("agent.nodes.tailor_agent.ChatOpenAI") as mock_openai_cls:
            mock_llm = MagicMock()
            mock_unmatched_structured = MagicMock()
            mock_unmatched_structured.ainvoke = AsyncMock(return_value=llm_erroneous_unmatched)
            mock_matched_structured = MagicMock()

            def mock_with_structured(schema):
                if schema == TailorUnmatchedList:
                    return mock_unmatched_structured
                return mock_matched_structured

            mock_llm.with_structured_output.side_effect = mock_with_structured
            mock_openai_cls.return_value = mock_llm

            res = await tailor_resume_bullet_points(state)

        tailored = res["tailor_analysis"].tailor_unmatched_list[0]
        # Provenance lock must have overridden LLM's 'projects' drift back to 'work_experience'
        self.assertEqual(tailored.type, "work_experience")
        self.assertEqual(tailored.company_name, "Microsoft")
        self.assertEqual(tailored.job_title, "SWE Intern")
        self.assertEqual(tailored.duration, "Summer 2024")
        self.assertEqual(tailored.job_location, "Redmond, WA")
        self.assertIsNone(tailored.project_name)

    async def test_tailor_unmatched_provenance_lock_leadership(self):
        """Test tailor_resume_bullet_points enforces type='leadership' and title/position even if LLM guessed project."""
        evidence = Evidence(
            experience_type="leadership",
            leadership_title="ACM Student Chapter",
            leadership_position="President",
            duration="2023 - 2024",
            experience_found=["Led 50-member technical society"],
        )
        ev_details = EvidenceWithDetails(
            job_requirement="Leadership and mentoring",
            topic_id="topic-acm",
            evidence=evidence,
        )
        mapping = EvidenceMapping(
            evidence_with_details=ev_details,
            resume_reference=None,
            mapping_status="UNMATCHED",
            reasoning="Not in current resume",
        )
        state = {
            "evidence_mapping": EvidenceMappingResult(evidence_mappings=[mapping]),
        }

        llm_erroneous_unmatched = TailorUnmatchedList(
            tailor_unmatched=[
                TailorUnmatched(
                    decisions=[
                        TailorDecisionUnmatched(
                            action="ADD",
                            new_bullet=ResumeBullet(text="Directed organization operations", sentence_id=2),
                            reasoning="Mentoring demonstrated",
                            evidence=["Led 50-member technical society"],
                        )
                    ],
                    type="projects",
                    project_name="ACM Chapter",
                    topic_id="topic-acm",
                )
            ]
        )

        with patch("agent.nodes.tailor_agent.ChatOpenAI") as mock_openai_cls:
            mock_llm = MagicMock()
            mock_unmatched_structured = MagicMock()
            mock_unmatched_structured.ainvoke = AsyncMock(return_value=llm_erroneous_unmatched)
            mock_matched_structured = MagicMock()

            def mock_with_structured(schema):
                if schema == TailorUnmatchedList:
                    return mock_unmatched_structured
                return mock_matched_structured

            mock_llm.with_structured_output.side_effect = mock_with_structured
            mock_openai_cls.return_value = mock_llm

            res = await tailor_resume_bullet_points(state)

        tailored = res["tailor_analysis"].tailor_unmatched_list[0]
        self.assertEqual(tailored.type, "leadership")
        self.assertEqual(tailored.leadership_title, "ACM Student Chapter")
        self.assertEqual(tailored.leadership_position, "President")
        self.assertEqual(tailored.duration, "2023 - 2024")
        self.assertIsNone(tailored.project_name)
