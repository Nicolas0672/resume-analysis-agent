import asyncio
import unittest
from model.job_pydantic import (
    ResumeBullet,
    ResumeCertification,
    ResumeEducation,
    ResumeExperience,
    ResumeLeadership,
    ResumeProject,
    ResumeSkills,
    ResumeStructure,
)
from agent.model import (
    TailorAnalysis,
    TailorUnmatched,
    TailorDecisionUnmatched,
)
from services.helper import (
    assign_entry_ids,
    get_duration_sort_key,
    get_next_entry_id,
    get_next_sentence_id,
    insert_entry_in_reverse_chronological_order,
)
from services.resume_service import (
    add_resume_bullet,
    add_resume_entry,
    apply_tailored_bullets,
    delete_bullet,
    delete_entry,
    edit_resume_bullets,
    edit_resume_skills,
    update_full_resume,
    update_resume_entry,
)


class MockSnapshot:
    def __init__(self, values):
        self.values = values


class MockGraph:
    def __init__(self, state_dict):
        self.state_dict = state_dict

    async def aget_state(self, config):
        return MockSnapshot(self.state_dict)

    async def aupdate_state(self, config, update_dict):
        self.state_dict.update(update_dict)


class MockAppState:
    def __init__(self, state_dict):
        self.graph_with_memory = MockGraph(state_dict)


class MockApp:
    def __init__(self, state_dict):
        self.state = MockAppState(state_dict)


class MockRequest:
    def __init__(self, state_dict):
        self.app = MockApp(state_dict)


class TestResumeMutations(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.resume = ResumeStructure(
            name="Jane Doe",
            contact="jane@example.com",
            work_experience=[
                ResumeExperience(
                    entry_id=0,
                    company="Acme Corp",
                    job_title="Software Engineer",
                    duration="2021 - 2023",
                    location="San Francisco, CA",
                    technologies=["Python", "FastAPI"],
                    bullets=[
                        ResumeBullet(text="Built microservices.", sentence_id=1),
                        ResumeBullet(text="Improved latency by 20%.", sentence_id=2),
                    ],
                ),
                ResumeExperience(
                    entry_id=1,
                    company="Beta Inc",
                    job_title="Junior Developer",
                    duration="2019 - 2021",
                    location="Remote",
                    technologies=["JavaScript"],
                    bullets=[
                        ResumeBullet(text="Maintained frontend dashboards.", sentence_id=3),
                    ],
                ),
            ],
            education=[
                ResumeEducation(
                    entry_id=2,
                    institution="State University",
                    degree="B.S.",
                    field_of_study="Computer Science",
                    duration="2015 - 2019",
                    location="Cityville",
                    gpa="3.7",
                    coursework=["Algorithms", "Operating Systems"],
                    sentence_ids=[4],
                )
            ],
            projects=[
                ResumeProject(
                    entry_id=3,
                    project_name="Portfolio Site",
                    role="Sole Creator",
                    technologies=["React", "Tailwind"],
                    duration="2022",
                    bullets=[
                        ResumeBullet(text="Designed responsive layout.", sentence_id=5),
                    ],
                )
            ],
            leadership=[
                ResumeLeadership(
                    entry_id=4,
                    title="Hackathon Organizer",
                    position="Lead Coordinator",
                    duration="2018",
                    bullets=[
                        ResumeBullet(text="Hosted 500+ participants.", sentence_id=6),
                    ],
                )
            ],
            certifications=[
                ResumeCertification(
                    entry_id=5,
                    name="AWS Cloud Practitioner",
                    date="2023",
                    sentence_ids=[7],
                )
            ],
            skills=ResumeSkills(
                programming_languages=["Python", "Go"],
                frameworks=["FastAPI"],
                tools=["Docker", "Git"],
            ),
        )

        self.state = {
            "resume_to_edit": self.resume,
        }
        self.request = MockRequest(self.state)

    async def test_update_resume_entry_work_experience(self):
        res = await update_resume_entry(
            session_id="test_session",
            request=self.request,
            entry_id=0,
            patch_data={
                "job_title": "Senior Staff Engineer",
                "company": "Acme Global",
                "duration": "2021 - Present",
            },
        )
        self.assertEqual(res["status"], "updated")
        updated_resume = res["resume_to_edit"]
        exp = updated_resume.work_experience[0]
        self.assertEqual(exp.job_title, "Senior Staff Engineer")
        self.assertEqual(exp.company, "Acme Global")
        self.assertEqual(exp.duration, "2021 - Present")
        # Ensure bullets and non-patched fields remain intact
        self.assertEqual(len(exp.bullets), 2)
        self.assertEqual(exp.location, "San Francisco, CA")

    async def test_update_resume_entry_education(self):
        res = await update_resume_entry(
            session_id="test_session",
            request=self.request,
            entry_id=2,
            patch_data={
                "institution": "MIT",
                "degree": "M.S.",
                "gpa": "4.0",
                "coursework": ["Machine Learning", "Distributed Systems"],
            },
        )
        self.assertEqual(res["status"], "updated")
        edu = res["resume_to_edit"].education[0]
        self.assertEqual(edu.institution, "MIT")
        self.assertEqual(edu.degree, "M.S.")
        self.assertEqual(edu.gpa, "4.0")
        self.assertEqual(edu.coursework, ["Machine Learning", "Distributed Systems"])

    async def test_add_resume_bullet(self):
        res = await add_resume_bullet(
            session_id="test_session",
            request=self.request,
            entry_id=0,
            text="Spearheaded migration to cloud infrastructure.",
        )
        self.assertEqual(res["status"], "added")
        new_bullet = res["bullet"]
        self.assertEqual(new_bullet.text, "Spearheaded migration to cloud infrastructure.")
        self.assertGreater(new_bullet.sentence_id, 7)
        self.assertEqual(len(res["resume_to_edit"].work_experience[0].bullets), 3)

    async def test_update_resume_entry_project(self):
        res = await update_resume_entry(
            session_id="test_session",
            request=self.request,
            entry_id=3,
            patch_data={
                "project_name": "Fullstack Cloud Platform",
                "role": "Lead Architect",
                "technologies": ["Next.js", "FastAPI", "Terraform"],
            },
        )
        self.assertEqual(res["status"], "updated")
        proj = res["resume_to_edit"].projects[0]
        self.assertEqual(proj.project_name, "Fullstack Cloud Platform")
        self.assertEqual(proj.role, "Lead Architect")
        self.assertEqual(proj.technologies, ["Next.js", "FastAPI", "Terraform"])

    async def test_update_resume_entry_leadership(self):
        res = await update_resume_entry(
            session_id="test_session",
            request=self.request,
            entry_id=4,
            patch_data={
                "title": "National Hackathon VP",
                "position": "Director of Logistics",
            },
        )
        self.assertEqual(res["status"], "updated")
        lead = res["resume_to_edit"].leadership[0]
        self.assertEqual(lead.title, "National Hackathon VP")
        self.assertEqual(lead.position, "Director of Logistics")

    async def test_update_resume_entry_certification(self):
        res = await update_resume_entry(
            session_id="test_session",
            request=self.request,
            entry_id=5,
            patch_data={
                "name": "AWS Certified Solutions Architect - Professional",
                "date": "2024",
            },
        )
        self.assertEqual(res["status"], "updated")
        cert = res["resume_to_edit"].certifications[0]
        self.assertEqual(cert.name, "AWS Certified Solutions Architect - Professional")
        self.assertEqual(cert.date, "2024")

    async def test_update_full_resume(self):
        mutated_resume = self.resume.model_copy(deep=True)
        mutated_resume.name = "Johnathan Doe"
        res = await update_full_resume(
            session_id="test_session",
            request=self.request,
            resume_to_edit=mutated_resume,
        )
        self.assertEqual(res["status"], "updated")
        self.assertEqual(res["resume_to_edit"].name, "Johnathan Doe")

    async def test_delete_entry_isolation(self):
        # Delete entry_id=0 (Acme Corp)
        res = await delete_entry(
            session_id="test_session",
            request=self.request,
            entry_id=0,
        )
        self.assertEqual(res["status"], "deleted")
        remaining_exps = res["resume_to_edit"].work_experience
        self.assertEqual(len(remaining_exps), 1)
        self.assertEqual(remaining_exps[0].entry_id, 1)
        self.assertEqual(remaining_exps[0].company, "Beta Inc")

        # Other sections must remain untouched
        self.assertEqual(len(res["resume_to_edit"].education), 1)
        self.assertEqual(len(res["resume_to_edit"].projects), 1)

    async def test_delete_bullet_isolation(self):
        # Delete bullet sentence_id=1
        res = await delete_bullet(
            session_id="test_session",
            request=self.request,
            sentence_id=1,
        )
        self.assertEqual(res["status"], "deleted")
        bullets = res["resume_to_edit"].work_experience[0].bullets
        self.assertEqual(len(bullets), 1)
        self.assertEqual(bullets[0].sentence_id, 2)

    def test_get_next_entry_id_with_none(self):
        self.resume.work_experience.append(
            ResumeExperience(entry_id=None, company="Test", bullets=[])
        )
        next_id = get_next_entry_id(self.resume)
        self.assertEqual(next_id, 6)

    def test_insert_entry_reverse_chronological(self):
        exps = [
            ResumeExperience(entry_id=0, company="Mid", duration="2021 - 2023", bullets=[]),
            ResumeExperience(entry_id=1, company="Old", duration="2019 - 2021", bullets=[]),
        ]
        # Newest: 2024 - Present -> should insert at index 0
        newest = ResumeExperience(entry_id=2, company="Newest", duration="2024 - Present", bullets=[])
        insert_entry_in_reverse_chronological_order(exps, newest)
        self.assertEqual(exps[0].company, "Newest")
        self.assertEqual(len(exps), 3)

        # In-between: 2020 - 2022 -> should insert between Mid (2021-2023) and Old (2019-2021)
        between = ResumeExperience(entry_id=3, company="Between", duration="2020 - 2022", bullets=[])
        insert_entry_in_reverse_chronological_order(exps, between)
        self.assertEqual(exps[2].company, "Between")

        # Oldest: 2016 - 2018 -> should insert at end
        oldest = ResumeExperience(entry_id=4, company="Oldest", duration="2016 - 2018", bullets=[])
        insert_entry_in_reverse_chronological_order(exps, oldest)
        self.assertEqual(exps[-1].company, "Oldest")

        # Undated: None -> should append at end
        undated = ResumeExperience(entry_id=5, company="Undated", duration=None, bullets=[])
        insert_entry_in_reverse_chronological_order(exps, undated)
        self.assertEqual(exps[-1].company, "Undated")

    async def test_add_resume_entry_reverse_chronological(self):
        # Existing work_experience: Acme (2021-2023) and Beta (2019-2021)
        res = await add_resume_entry(
            session_id="test_session",
            request=self.request,
            section_type="work_experience",
            entry_data={
                "company": "Gamma Tech",
                "job_title": "Lead Architect",
                "duration": "2023 - Present",
                "location": "Remote",
                "bullets": [{"text": "Spearheaded platform migration."}],
            },
        )
        self.assertEqual(res["status"], "added")
        exps = res["resume_to_edit"].work_experience
        self.assertEqual(len(exps), 3)
        # Gamma Tech is 2023 - Present, so it must land at index 0
        self.assertEqual(exps[0].company, "Gamma Tech")
        self.assertEqual(exps[1].company, "Acme Corp")
        self.assertEqual(exps[2].company, "Beta Inc")

    async def test_update_resume_entry_resorts_when_duration_changes(self):
        # Beta Inc is entry_id=1, currently at index 1 with duration="2019 - 2021"
        res = await update_resume_entry(
            session_id="test_session",
            request=self.request,
            entry_id=1,
            patch_data={"duration": "2024 - Present"},
        )
        self.assertEqual(res["status"], "updated")
        exps = res["resume_to_edit"].work_experience
        # Beta Inc now has 2024 - Present, so it should have moved to index 0
        self.assertEqual(exps[0].company, "Beta Inc")
        self.assertEqual(exps[1].company, "Acme Corp")

    async def test_apply_tailoring_unmatched_reverse_chronological(self):
        # Setup tailor_analysis with an unmatched proposal
        tailor_analysis = TailorAnalysis(
            tailor_matched_list=[],
            tailor_unmatched_list=[
                TailorUnmatched(
                    decisions=[
                        TailorDecisionUnmatched(
                            action="ADD",
                            new_bullet=ResumeBullet(text="Engineered real-time telemetry.", sentence_id=99),
                            reasoning="Candidate verified extensive streaming experience.",
                            evidence=["Built high-throughput event broker"],
                        )
                    ],
                    type="work_experience",
                    company_name="Delta Systems",
                    job_title="Staff Engineer",
                    job_location="San Jose, CA",
                    duration="2024 - Present",
                    skills=["Kafka", "Go"],
                    project_name=None,
                    topic_id="topic-streaming",
                    leadership_position=None,
                    leadership_title=None,
                )
            ],
        )
        self.state["tailor_analysis"] = tailor_analysis

        res = await apply_tailored_bullets(
            session_id="test_session",
            topic_id="topic-streaming",
            request=self.request,
        )
        self.assertEqual(res["status"], "updated")
        exps = res["resume_to_edit"].work_experience
        self.assertEqual(len(exps), 3)
        # Delta Systems (2024 - Present) must land at index 0 of work_experience!
        self.assertEqual(exps[0].company, "Delta Systems")
        self.assertEqual(exps[1].company, "Acme Corp")
        self.assertEqual(exps[2].company, "Beta Inc")


if __name__ == "__main__":
    unittest.main()
