import asyncio
import os
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

os.environ["OPENAI_API_KEY"] = "test-key"

from langchain_core.messages import AIMessage, HumanMessage
from agent.model import Evidence, EvidenceWithDetails, InterviewDetails, InterviewPlan, InvestigateOutput
from agent.nodes.human_decision import human_investigate_chat
from agent.nodes.interview import investigate_candidate
from agent.graph_service import resume_tailoring_session


class MockInterrupt:
    def __init__(self, value):
        self.value = value


class TestInterviewControl(unittest.IsolatedAsyncioTestCase):
    def test_investigate_output_schema_omits_need_more_info(self):
        """Ensure need_more_info has SkipJsonSchema and is omitted from LLM JSON schema."""
        schema = InvestigateOutput.model_json_schema()
        self.assertNotIn("need_more_info", schema.get("properties", {}))
        self.assertNotIn("need_more_info", schema.get("required", []))

    def test_human_investigate_chat_with_dict_payload(self):
        """Test human_investigate_chat with new structured action payload."""
        state = {
            "investigation_messages": [AIMessage(content="What was your role in project X?")],
        }

        # Case 1: action = "chat" with message
        with patch("agent.nodes.human_decision.interrupt", return_value={"action": "chat", "message": "I was lead dev"}):
            res = human_investigate_chat(state)
            self.assertEqual(res["human_investigate_action"], "chat")
            self.assertEqual(len(res["investigation_messages"]), 1)
            self.assertIsInstance(res["investigation_messages"][0], HumanMessage)
            self.assertEqual(res["investigation_messages"][0].content, "I was lead dev")

        # Case 2: action = "conclude" with message
        with patch("agent.nodes.human_decision.interrupt", return_value={"action": "conclude", "message": "Final notes"}):
            res = human_investigate_chat(state)
            self.assertEqual(res["human_investigate_action"], "conclude")
            self.assertEqual(res["investigation_messages"][0].content, "Final notes")

        # Case 3: action = "skip" with empty message
        with patch("agent.nodes.human_decision.interrupt", return_value={"action": "skip", "message": ""}):
            res = human_investigate_chat(state)
            self.assertEqual(res["human_investigate_action"], "skip")
            self.assertNotIn("investigation_messages", res)

    def test_human_investigate_chat_with_legacy_string_payload(self):
        """Test human_investigate_chat backward compatibility with string payload."""
        state = {
            "investigation_messages": [AIMessage(content="What was your role?")],
        }

        with patch("agent.nodes.human_decision.interrupt", return_value="Here is my answer"):
            res = human_investigate_chat(state)
            self.assertEqual(res["human_investigate_action"], "chat")
            self.assertEqual(res["investigation_messages"][0].content, "Here is my answer")

    async def test_investigate_candidate_skip(self):
        """Test investigate_candidate action='skip' bypasses LLM and completes topic."""
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
        }

        with patch("agent.nodes.interview.ChatOpenAI") as mock_openai:
            res = await investigate_candidate(state)
            # OpenAI should NOT be instantiated or invoked on skip
            mock_openai.assert_not_called()

        self.assertFalse(res["need_more_info"])
        self.assertEqual(res["completed_topic_ids"], ["topic-1"])
        self.assertIn("skipped", res["investigation_messages"][0].content.lower())

    async def test_investigate_candidate_conclude(self):
        """Test investigate_candidate action='conclude' synthesizes evidence and sets need_more_info=False."""
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
        self.assertEqual(res["evidence_with_details"][0].topic_id, "topic-2")
        self.assertEqual(res["evidence_with_details"][0].evidence.project_name, "Acme Cloud Platform")
        self.assertIn("synthesized", res["investigation_messages"][0].content)

    async def test_investigate_candidate_chat(self):
        """Test investigate_candidate action='chat' asks next question and sets need_more_info=True."""
        topic = InterviewDetails(
            topic_id="topic-3",
            topic="Database Optimization",
            priority="Medium",
            reason="Important",
            objective="Evaluate query indexing",
            job_requirement="PostgreSQL optimization",
            relevant_experience=["Postgres DB"],
            relevant_experience_from_resume=None,
            evidence_gap="Indexing strategy unknown",
        )
        state = {
            "topic_id_selection": "topic-3",
            "interview_plan": InterviewPlan(interview_plan=[topic]),
            "investigation_messages": [HumanMessage(content="Optimized slow SQL queries")],
            "evidence_with_details": [],
            "resume_data": None,
            "human_investigate_action": "chat",
        }

        mock_output = InvestigateOutput(
            evidence=None,
            user_message="Which indexing strategies did you apply to PostgreSQL?",
        )

        with patch("agent.nodes.interview.ChatOpenAI") as mock_openai_cls:
            mock_llm = MagicMock()
            mock_structured = MagicMock()
            mock_structured.ainvoke = AsyncMock(return_value=mock_output)
            mock_llm.with_structured_output.return_value = mock_structured
            mock_openai_cls.return_value = mock_llm

            res = await investigate_candidate(state)

        self.assertTrue(res["need_more_info"])
        self.assertNotIn("completed_topic_ids", res)
        self.assertEqual(res["investigation_messages"][0].content, "Which indexing strategies did you apply to PostgreSQL?")

    async def test_resume_tailoring_session_dispatches_action_dict(self):
        """Test that resume_tailoring_session wraps action into Command(resume=...) for human_investigate_chat."""
        mock_graph = MagicMock()
        mock_graph.aget_state = AsyncMock(return_value=MagicMock(next=["human_investigate_chat"]))
        mock_graph.ainvoke = AsyncMock(return_value={"__interrupt__": [MockInterrupt({"type": "investigation_chat", "message": "Next q"})]})

        mock_request = MagicMock()
        mock_request.app.state.graph_with_memory = mock_graph

        with patch("services.helper.session_lock"):
            res = await resume_tailoring_session(
                session_id="test-session",
                user_message="I handled deployment",
                action="conclude",
                request=mock_request,
            )

        mock_graph.ainvoke.assert_called_once()
        cmd = mock_graph.ainvoke.call_args[0][0]
        self.assertEqual(cmd.resume, {"action": "conclude", "message": "I handled deployment"})
