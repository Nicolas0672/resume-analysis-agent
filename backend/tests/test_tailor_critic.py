import pytest
from unittest.mock import AsyncMock, patch

from agent.model import (
    BulletFeedback,
    Evidence,
    EvidenceMapping,
    EvidenceMappingResult,
    EvidenceWithDetails,
    Feedback,
    Feedbacks,
    ResumeReference,
    TailorAnalysis,
    TailorDecisionMatched,
    TailorMatched,
)
from agent.nodes.tailor_agent import (
    critique_tailored_bullet_points,
    format_evidence_for_critic,
    get_consolidated_evidence_by_topic,
    merge_evidences,
    regenerate_bullets,
)
from agent.router import route_critic_decision
from model.resume_schema import ResumeBullet


def test_merge_evidences_deduplication_and_aggregation():
    e1 = Evidence(
        experience_type="project",
        project_name="StudySync — Campus Study Group Platform",
        technologies=["Azure Virtual Machine"],
        ownership=["Hosted StudySync using Azure Virtual Machine"],
        scope=["Cloud hosting"],
        candidate_statements=["yea i used azure virtual machine to host this"],
    )
    e2 = Evidence(
        experience_type="project",
        project_name="StudySync — Campus Study Group Platform",
        technologies=["Azure Virtual Machine", ".NET", "React"],
        scope=["Supported about 50-100 students"],
        candidate_statements=["i think they were about 50-100 students that we support"],
    )
    e3 = Evidence(
        experience_type="project",
        project_name="StudySync — Campus Study Group Platform",
        technologies=["Claude Code"],
        metrics=["60% increase in development speed"],
        impact=["Accelerated development by 60%"],
        candidate_statements=["i used claude code to help plan and speed up tasks"],
    )

    merged = merge_evidences([e1, e2, e3])

    assert merged is not None
    assert merged.experience_type == "project"
    assert merged.project_name == "StudySync — Campus Study Group Platform"
    # Technologies deduplicated while preserving order
    assert merged.technologies == ["Azure Virtual Machine", ".NET", "React", "Claude Code"]
    # Scope aggregated
    assert merged.scope == ["Cloud hosting", "Supported about 50-100 students"]
    # Metrics and impact preserved
    assert merged.metrics == ["60% increase in development speed"]
    assert merged.impact == ["Accelerated development by 60%"]
    # Statements aggregated
    assert len(merged.candidate_statements) == 3
    assert "yea i used azure virtual machine to host this" in merged.candidate_statements
    assert "i think they were about 50-100 students that we support" in merged.candidate_statements


def test_get_consolidated_evidence_by_topic():
    ref_studysync = ResumeReference(type="projects", entry_id=4)

    ev1 = EvidenceWithDetails(
        evidence=Evidence(
            experience_type="project",
            project_name="StudySync",
            technologies=["Azure VM"],
        ),
        job_requirement="Azure",
        topic_id="topic-1",
    )
    ev2 = EvidenceWithDetails(
        evidence=Evidence(
            experience_type="project",
            project_name="StudySync",
            scope=["50-100 students"],
        ),
        job_requirement=".NET",
        topic_id="topic-2",
    )
    ev_unmatched = EvidenceWithDetails(
        evidence=Evidence(
            experience_type="work_experience",
            company="Startup Inc",
            job_title="Intern",
        ),
        job_requirement="FastAPI",
        topic_id="topic-3",
    )

    state = {
        "evidence_mapping": EvidenceMappingResult(
            evidence_mappings=[
                EvidenceMapping(
                    evidence_with_details=ev1,
                    resume_reference=ref_studysync,
                    mapping_status="MATCHED",
                ),
                EvidenceMapping(
                    evidence_with_details=ev2,
                    resume_reference=ref_studysync,
                    mapping_status="MATCHED",
                ),
                EvidenceMapping(
                    evidence_with_details=ev_unmatched,
                    resume_reference=None,
                    mapping_status="UNMATCHED",
                ),
            ]
        )
    }

    consolidated = get_consolidated_evidence_by_topic(state)

    # Both topic-1 and topic-2 share the same project and get merged evidence
    assert consolidated["topic-1"].technologies == ["Azure VM"]
    assert consolidated["topic-1"].scope == ["50-100 students"]
    assert consolidated["topic-2"].technologies == ["Azure VM"]
    assert consolidated["topic-2"].scope == ["50-100 students"]

    # Unmatched topic gets its own standalone evidence
    assert consolidated["topic-3"].company == "Startup Inc"


@pytest.mark.anyio
async def test_critique_tailored_bullet_points_early_exit_on_keep_only():
    """When all decisions are KEEP, no LLM call is made and empty feedbacks are returned immediately."""
    state = {
        "tailor_analysis": TailorAnalysis(
            tailor_matched_list=[
                TailorMatched(
                    decisions=[
                        TailorDecisionMatched(
                            action="KEEP",
                            old_bullet=ResumeBullet(text="Existing bullet.", sentence_id=1),
                            new_bullet=None,
                            reasoning="Already good.",
                            evidence=["Azure"],
                        )
                    ],
                    resume_reference=ResumeReference(type="projects", entry_id=4),
                    topic_id="topic-1",
                )
            ],
            tailor_unmatched_list=[],
        ),
        "evidence_mapping": EvidenceMappingResult(evidence_mappings=[]),
        "iteration_loop": 0,
    }

    with patch("agent.nodes.tailor_agent.ChatOpenAI") as mock_chat:
        result = await critique_tailored_bullet_points(state)
        # Verify LLM was NOT invoked
        mock_chat.assert_not_called()

    assert result["feedbacks"].feedbacks == []
    assert result["iteration_loop"] == 1


@pytest.mark.anyio
async def test_critique_tailored_bullet_points_single_batch_call():
    """Verify that multiple topics with modified bullets execute in ONE single batch call."""
    ref_studysync = ResumeReference(type="projects", entry_id=4)
    ev1 = EvidenceWithDetails(
        evidence=Evidence(
            experience_type="project",
            project_name="StudySync",
            technologies=["Azure Virtual Machine"],
        ),
        job_requirement="Azure",
        topic_id="topic-1",
    )
    ev2 = EvidenceWithDetails(
        evidence=Evidence(
            experience_type="project",
            project_name="StudySync",
            scope=["Supported about 50-100 students"],
        ),
        job_requirement="Scale",
        topic_id="topic-2",
    )

    state = {
        "tailor_analysis": TailorAnalysis(
            tailor_matched_list=[
                TailorMatched(
                    decisions=[
                        TailorDecisionMatched(
                            action="MODIFY",
                            old_bullet=ResumeBullet(text="Hosted online.", sentence_id=17),
                            new_bullet=ResumeBullet(
                                text="Hosted StudySync using Azure Virtual Machine, supporting 50-100 students.",
                                sentence_id=17,
                            ),
                            reasoning="Enriched with hosting and scale.",
                            evidence=["Azure VM", "50-100 students"],
                        )
                    ],
                    resume_reference=ref_studysync,
                    topic_id="topic-1",
                ),
                TailorMatched(
                    decisions=[
                        TailorDecisionMatched(
                            action="ADD",
                            old_bullet=None,
                            new_bullet=ResumeBullet(
                                text="Integrated automated tests.",
                                sentence_id=18,
                            ),
                            reasoning="Added testing.",
                            evidence=["Testing"],
                        )
                    ],
                    resume_reference=ref_studysync,
                    topic_id="topic-2",
                ),
            ],
            tailor_unmatched_list=[],
        ),
        "evidence_mapping": EvidenceMappingResult(
            evidence_mappings=[
                EvidenceMapping(
                    evidence_with_details=ev1,
                    resume_reference=ref_studysync,
                    mapping_status="MATCHED",
                ),
                EvidenceMapping(
                    evidence_with_details=ev2,
                    resume_reference=ref_studysync,
                    mapping_status="MATCHED",
                ),
            ]
        ),
        "iteration_loop": 0,
    }

    mock_response = Feedbacks(
        feedbacks=[
            Feedback(
                topic_id="topic-1",
                bullet_feedbacks=[
                    BulletFeedback(valid=True, suggestions="No factual correction required.", sentence_id=17)
                ],
            ),
            Feedback(
                topic_id="topic-2",
                bullet_feedbacks=[
                    BulletFeedback(valid=True, suggestions="No factual correction required.", sentence_id=18)
                ],
            ),
        ]
    )

    with patch("agent.nodes.tailor_agent.ChatOpenAI") as mock_chat_cls:
        mock_instance = mock_chat_cls.return_value
        mock_structured = AsyncMock()
        mock_structured.ainvoke.return_value = mock_response
        mock_instance.with_structured_output.return_value = mock_structured

        result = await critique_tailored_bullet_points(state)

        # EXACTLY ONE call made!
        assert mock_structured.ainvoke.call_count == 1
        call_args = mock_structured.ainvoke.call_args[0][0]
        # The prompt input should contain both topic-1 and topic-2 in a single list
        input_data = call_args[1].content
        assert "topic-1" in input_data
        assert "topic-2" in input_data

    assert len(result["feedbacks"].feedbacks) == 2
    assert result["feedbacks"].feedbacks[0].topic_id == "topic-1"
    assert result["feedbacks"].feedbacks[1].topic_id == "topic-2"
    assert result["iteration_loop"] == 1


@pytest.mark.anyio
async def test_regenerate_bullets_early_exit_when_no_invalid_feedbacks():
    """When all feedbacks are valid, regenerate_bullets returns state immediately without calling LLM."""
    state = {
        "tailor_analysis": TailorAnalysis(
            tailor_matched_list=[],
            tailor_unmatched_list=[],
        ),
        "feedbacks": Feedbacks(
            feedbacks=[
                Feedback(
                    topic_id="topic-1",
                    bullet_feedbacks=[
                        BulletFeedback(valid=True, suggestions="Valid.", sentence_id=17)
                    ],
                )
            ]
        ),
        "evidence_mapping": EvidenceMappingResult(evidence_mappings=[]),
    }

    with patch("agent.nodes.tailor_agent.ChatOpenAI") as mock_chat:
        result = await regenerate_bullets(state)
        mock_chat.assert_not_called()

    assert result == state


def test_route_critic_decision():
    """Verify router routes to 'done' when all bullets are valid and 'regenerate' when invalid."""
    # 1. All valid -> done
    state_valid = {
        "iteration_loop": 1,
        "feedbacks": Feedbacks(
            feedbacks=[
                Feedback(
                    topic_id="topic-1",
                    bullet_feedbacks=[
                        BulletFeedback(valid=True, suggestions="No correction required.", sentence_id=17)
                    ],
                )
            ]
        ),
    }
    assert route_critic_decision(state_valid) == "done"

    # 2. Invalid bullet and iteration_loop < 4 -> regenerate
    state_invalid = {
        "iteration_loop": 1,
        "feedbacks": Feedbacks(
            feedbacks=[
                Feedback(
                    topic_id="topic-1",
                    bullet_feedbacks=[
                        BulletFeedback(valid=False, suggestions="Unsupported user count.", sentence_id=17)
                    ],
                )
            ]
        ),
    }
    assert route_critic_decision(state_invalid) == "regenerate"

    # 3. Invalid bullet but iteration_loop == 4 -> done (loop limit guard)
    state_limit = {
        "iteration_loop": 4,
        "feedbacks": Feedbacks(
            feedbacks=[
                Feedback(
                    topic_id="topic-1",
                    bullet_feedbacks=[
                        BulletFeedback(valid=False, suggestions="Unsupported user count.", sentence_id=17)
                    ],
                )
            ]
        ),
    }
    assert route_critic_decision(state_limit) == "done"


def test_tailor_decision_matched_consolidation_tracking():
    """Verify that TailorDecisionMatched supports consolidated_with_topic_id for cross-topic consolidation."""
    decision = TailorDecisionMatched(
        action="KEEP",
        old_bullet=ResumeBullet(text="Hosted the application in the cloud.", sentence_id=17),
        new_bullet=None,
        reasoning="Consolidated into Topic 1 cloud hosting bullet.",
        evidence=["Azure VM"],
        consolidated_with_topic_id="1",
    )
    dumped = decision.model_dump()
    assert dumped["action"] == "KEEP"
    assert dumped["consolidated_with_topic_id"] == "1"

    # Schema contains the field and description
    schema = TailorDecisionMatched.model_json_schema()
    assert "consolidated_with_topic_id" in schema["properties"]
    assert "consolidate" in schema["properties"]["consolidated_with_topic_id"]["description"].lower()
