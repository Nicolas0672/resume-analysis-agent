import asyncio
import os
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

os.environ["OPENAI_API_KEY"] = "test-key"

from fastapi import HTTPException
from langchain_core.messages import AIMessage, HumanMessage
from agent.model import (
    Evidence,
    EvidenceWithDetails,
    ExperienceMetadata,
    InterviewDetails,
    InterviewPlan,
    InvestigateOutput,
    ResumeReference,
)
from agent.nodes.human_decision import human_after_interview_planner, human_investigate_chat
from agent.nodes.interview import investigate_candidate, reset_investigation, validate_experience_metadata
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

        # Project: needs project_name and role
        valid, err = validate_experience_metadata({"experience_type": "project", "project_name": "App"})
        self.assertFalse(valid)
        self.assertIn("Role", err)
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
