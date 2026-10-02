import io
import re
import xml.sax.saxutils as saxutils
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from backend.model.job_pydantic import (
    ResumeEducation,
    ResumeExperience,
    ResumeLeadership,
    ResumeProject,
    ResumeSkills,
    ResumeStructure,
)

# Color constants matching web preview styling
COLOR_PRIMARY = colors.HexColor("#111827")  # Dark zinc
COLOR_MUTED = colors.HexColor("#6B7280")    # Muted zinc
COLOR_BORDER = colors.HexColor("#CCCCCC")   # Light border line

# Printable dimensions: 8.5" x 11.0" with 0.5" (36pt) margins
PAGE_WIDTH = 612.0
PAGE_HEIGHT = 792.0
MARGIN = 36.0
USABLE_WIDTH = PAGE_WIDTH - (2 * MARGIN)    # 540.0 pt
USABLE_HEIGHT = PAGE_HEIGHT - (2 * MARGIN)  # 720.0 pt


def _escape(text: Optional[str]) -> str:
    """Safely escapes text for ReportLab XML paragraph processing."""
    if not text:
        return ""
    return saxutils.escape(str(text).strip())


def _clean_bullet_text(text: Optional[str]) -> str:
    """Strips accidental leading bullet or dash symbols and safely XML-escapes text."""
    if not text:
        return ""
    stripped = re.sub(r"^[\s\-•*·–—]+\s*", "", str(text).strip())
    return _escape(stripped)


def _extract_active_skill_entries(skills: Optional[ResumeSkills]) -> list[tuple[str, list[str]]]:
    """Extracts non-empty skills categories matching the web preview."""
    if not skills:
        return []

    category_map = [
        ("programming_languages", "Languages"),
        ("frameworks", "Frameworks"),
        ("libraries", "Libraries"),
        ("databases", "Databases"),
        ("cloud", "Cloud / DevOps"),
        ("tools", "Developer Tools"),
        ("other", "Other"),
    ]

    entries = []
    for attr, label in category_map:
        items = getattr(skills, attr, None)
        if isinstance(items, list):
            filtered = [str(x).strip() for x in items if str(x).strip()]
            if filtered:
                entries.append((label, filtered))
    return entries


def generate_pdf(resume: ResumeStructure) -> io.BytesIO:
    """Generates an ATS-compliant, high-fidelity vector PDF matching the preview layout.

    Layout Specifications:
    - Page Setup: US Letter (8.5" x 11.0") with 0.5" margins on all four sides.
    - Standard ATS Typography: Helvetica / Helvetica-Bold (18pt Name, 9.5pt Contact, 10.5pt Section Headings, 9.5pt Body).
    - Section Sequence: Header -> Education -> Work Experience -> Projects -> Leadership -> Skills.
    - Two-column alignment for entry headers (Title/Institution on left, Date/Location on right).
    - Underline border rule beneath each uppercase section heading.
    - Native bullet points with compact ATS spacing.
    """
    buffer = io.BytesIO()
    doc = BaseDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
    )
    frame = Frame(
        MARGIN,
        MARGIN,
        USABLE_WIDTH,
        USABLE_HEIGHT,
        id="normal",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    doc.addPageTemplates(
        [
            PageTemplate(id="First", frames=frame, pagesize=letter),
            PageTemplate(id="Later", frames=frame, pagesize=letter),
        ]
    )

    styles = getSampleStyleSheet()

    # Custom paragraph styles
    name_style = ParagraphStyle(
        "CandidateName",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=21,
        alignment=TA_CENTER,
        textColor=COLOR_PRIMARY,
        spaceAfter=2,
    )

    contact_style = ParagraphStyle(
        "CandidateContact",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=12,
        alignment=TA_CENTER,
        textColor=COLOR_MUTED,
        spaceAfter=4,
    )

    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=13,
        alignment=TA_LEFT,
        leftIndent=0,
        textColor=COLOR_PRIMARY,
        spaceBefore=6,
        spaceAfter=2,
    )

    title_left_style = ParagraphStyle(
        "TitleLeft",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12.5,
        alignment=TA_LEFT,
        leftIndent=0,
        textColor=COLOR_PRIMARY,
    )

    date_right_style = ParagraphStyle(
        "DateRight",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=12.5,
        alignment=TA_RIGHT,
        rightIndent=0,
        textColor=COLOR_MUTED,
    )

    sub_left_style = ParagraphStyle(
        "SubLeft",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=12,
        alignment=TA_LEFT,
        leftIndent=0,
        textColor=COLOR_PRIMARY,
    )

    sub_right_style = ParagraphStyle(
        "SubRight",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=12,
        alignment=TA_RIGHT,
        rightIndent=0,
        textColor=COLOR_MUTED,
    )

    meta_left_style = ParagraphStyle(
        "MetaLeft",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=11.5,
        alignment=TA_LEFT,
        leftIndent=0,
        textColor=COLOR_MUTED,
        spaceAfter=2,
    )

    bullet_style = ParagraphStyle(
        "ResumeBullet",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=12,
        leftIndent=14,
        bulletIndent=2,
        alignment=TA_LEFT,
        textColor=COLOR_PRIMARY,
        spaceBefore=0,
        spaceAfter=1.5,
    )

    skills_style = ParagraphStyle(
        "SkillsEntry",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=12.5,
        alignment=TA_LEFT,
        leftIndent=0,
        textColor=COLOR_PRIMARY,
        spaceBefore=1,
        spaceAfter=1.5,
    )

    story = []

    # 1. Header: Candidate Name
    candidate_name = (resume.name or "Candidate Name").strip()
    story.append(Paragraph(_escape(candidate_name).upper(), name_style))

    # 2. Header: Contact Line
    if resume.contact:
        contact_str = resume.contact.strip()
        if contact_str:
            story.append(Paragraph(_escape(contact_str), contact_style))

    def add_section_header(title: str):
        story.append(Paragraph(_escape(title).upper(), heading_style))
        story.append(
            HRFlowable(
                width="100%",
                thickness=0.75,
                color=COLOR_BORDER,
                spaceBefore=1,
                spaceAfter=3,
                hAlign="LEFT",
            )
        )

    def create_two_col_table(left_para, right_para, bottom_padding=1):
        tbl = Table([[left_para, right_para]], colWidths=[385.0, 155.0], hAlign="LEFT")
        tbl.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), bottom_padding),
                ]
            )
        )
        return tbl

    # 3. Education Section (At top, matching web preview)
    if resume.education and len(resume.education) > 0:
        add_section_header("Education")
        for edu in resume.education:
            inst_text = _escape(edu.institution or "Institution")
            date_loc = _escape(edu.duration or edu.location or "")
            story.append(
                create_two_col_table(
                    Paragraph(inst_text, title_left_style),
                    Paragraph(date_loc, date_right_style),
                    bottom_padding=1,
                )
            )

            degree_parts = []
            if edu.degree:
                degree_parts.append(_escape(edu.degree))
            if edu.field_of_study:
                degree_parts.append(f"in {_escape(edu.field_of_study)}")
            degree_str = " ".join(degree_parts) or "Degree"
            gpa_str = f"GPA: {_escape(edu.gpa)}" if edu.gpa else ""

            story.append(
                create_two_col_table(
                    Paragraph(degree_str, sub_left_style),
                    Paragraph(gpa_str, sub_right_style),
                    bottom_padding=1 if edu.coursework else 2,
                )
            )

            if edu.coursework and len(edu.coursework) > 0:
                clean_courses = [_escape(c) for c in edu.coursework if str(c).strip()]
                if clean_courses:
                    course_text = f"Coursework: {', '.join(clean_courses)}"
                    story.append(Paragraph(course_text, meta_left_style))

    # 4. Work Experience Section
    if resume.work_experience and len(resume.work_experience) > 0:
        add_section_header("Work Experience")
        for exp in resume.work_experience:
            title_text = _escape(exp.job_title or "Position Title")
            duration_text = _escape(exp.duration or "")
            story.append(
                create_two_col_table(
                    Paragraph(title_text, title_left_style),
                    Paragraph(duration_text, date_right_style),
                    bottom_padding=1,
                )
            )

            comp_parts = []
            if exp.company:
                comp_parts.append(_escape(exp.company))
            if exp.location:
                comp_parts.append(f"• {_escape(exp.location)}")
            comp_str = " ".join(comp_parts) if comp_parts else ""

            if comp_str:
                story.append(Paragraph(comp_str, meta_left_style))

            for bullet in exp.bullets:
                clean_bullet = _clean_bullet_text(bullet.text)
                if clean_bullet:
                    story.append(Paragraph(clean_bullet, bullet_style, bulletText="\u2022"))

    # 5. Projects Section
    if resume.projects and len(resume.projects) > 0:
        add_section_header("Projects")
        for proj in resume.projects:
            proj_title = _escape(proj.project_name or "Project Name")
            proj_dur = _escape(proj.duration or "")
            story.append(
                create_two_col_table(
                    Paragraph(proj_title, title_left_style),
                    Paragraph(proj_dur, date_right_style),
                    bottom_padding=1,
                )
            )

            if proj.technologies and len(proj.technologies) > 0:
                clean_tech = [_escape(t) for t in proj.technologies if str(t).strip()]
                if clean_tech:
                    story.append(
                        Paragraph(f"Technologies: {', '.join(clean_tech)}", meta_left_style)
                    )

            for bullet in proj.bullets:
                clean_bullet = _clean_bullet_text(bullet.text)
                if clean_bullet:
                    story.append(Paragraph(clean_bullet, bullet_style, bulletText="\u2022"))

    # 6. Leadership & Extracurriculars Section
    if resume.leadership and len(resume.leadership) > 0:
        add_section_header("Leadership & Extracurriculars")
        for lead in resume.leadership:
            lead_title = _escape(lead.title or "Organization / Activity")
            lead_pos = _escape(lead.position or lead.duration or "")
            story.append(
                create_two_col_table(
                    Paragraph(lead_title, title_left_style),
                    Paragraph(lead_pos, date_right_style),
                    bottom_padding=1,
                )
            )

            for bullet in lead.bullets:
                clean_bullet = _clean_bullet_text(bullet.text)
                if clean_bullet:
                    story.append(Paragraph(clean_bullet, bullet_style, bulletText="\u2022"))

    # 7. Technical Skills Section
    skill_entries = _extract_active_skill_entries(resume.skills)
    if skill_entries:
        add_section_header("Technical Skills")
        for label, items in skill_entries:
            clean_items = [_escape(i) for i in items if str(i).strip()]
            if clean_items:
                line_html = f"<b>{_escape(label)}:</b> {', '.join(clean_items)}"
                story.append(Paragraph(line_html, skills_style))

    doc.build(story)
    buffer.seek(0)
    return buffer
