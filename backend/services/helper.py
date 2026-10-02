import re
from typing import Any
from backend.model.job_pydantic import ResumeStructure


MONTHS_MAP = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "september": 9, "sept": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}


def parse_date_part(text: str, is_end: bool = False) -> tuple[int, int]:
    """Extracts (year, month) from a date substring.
    If 'present' / 'current' / 'now', returns (9999, 12).
    If year is present but month is omitted:
        - returns month 12 if is_end=True
        - returns month 1 if is_end=False
    """
    if not text:
        return (0, 0)
    lower = text.lower().strip()
    if any(k in lower for k in ["present", "current", "now", "ongoing", "active"]):
        return (9999, 12)

    year_match = re.search(r"\b(19\d\d|20\d\d)\b", text)
    year = int(year_match.group(1)) if year_match else 0

    month = 0
    for name, m_num in MONTHS_MAP.items():
        if re.search(r"\b" + name + r"\b", lower):
            month = m_num
            break
    else:
        slash_match = re.search(r"\b(0?[1-9]|1[0-2])[/-](?:19\d\d|20\d\d)\b", text)
        if slash_match:
            month = int(slash_match.group(1))

    if month == 0 and year > 0:
        month = 12 if is_end else 1

    return (year, month)


def get_duration_sort_key(duration_str: str | None) -> tuple[int, int, int, int]:
    """Returns a comparison key (end_year, end_month, start_year, start_month) for reverse chronological sorting.
    Higher values represent more recent dates (e.g. Present -> 9999, 12).
    """
    if not duration_str or not isinstance(duration_str, str):
        return (0, 0, 0, 0)

    parts = re.split(r"\s*(?:[-–—]|(?:\bto\b))\s*", duration_str.strip(), flags=re.IGNORECASE)
    if len(parts) >= 2:
        start = parse_date_part(parts[0], is_end=False)
        end = parse_date_part(parts[1], is_end=True)
    elif len(parts) == 1:
        start = parse_date_part(parts[0], is_end=False)
        end = parse_date_part(parts[0], is_end=True)
    else:
        return (0, 0, 0, 0)

    return (end[0], end[1], start[0], start[1])


def get_entry_date_sort_key(entry: Any) -> tuple[int, int, int, int]:
    """Extracts date/duration from any resume entry (experience, project, leadership, education, certification)."""
    if isinstance(entry, dict):
        duration = entry.get("duration") or entry.get("date")
    else:
        duration = getattr(entry, "duration", None) or getattr(entry, "date", None)
    return get_duration_sort_key(duration)


def insert_entry_in_reverse_chronological_order(section_list: list, new_entry: Any) -> None:
    """Inserts new_entry into section_list in reverse chronological order (newest first).
    If the new entry has no parseable date, it is appended to the end.
    """
    new_key = get_entry_date_sort_key(new_entry)

    if new_key == (0, 0, 0, 0):
        section_list.append(new_entry)
        return

    insert_idx = len(section_list)
    for idx, existing in enumerate(section_list):
        existing_key = get_entry_date_sort_key(existing)
        if new_key > existing_key:
            insert_idx = idx
            break

    section_list.insert(insert_idx, new_entry)


def sort_section_in_reverse_chronological_order(section_list: list) -> None:
    """Sorts section entries in-place in reverse chronological order (newest first).
    Stable sort preserves relative ordering for entries with identical or empty dates.
    """
    section_list.sort(key=get_entry_date_sort_key, reverse=True)


def get_next_sentence_id(resume: ResumeStructure) -> int:
    max_id = 0

    for section_name in type(resume).model_fields:
        section = getattr(resume, section_name)

        if section is None:
            continue

        # List-based sections
        if isinstance(section, list):
            for entry in section:
                # Direct sentence_ids, e.g. Education/Certification
                for sentence_id in getattr(entry, "sentence_ids", []):
                    max_id = max(max_id, sentence_id)

                # Bullet-based sections, e.g. Experience/Leadership/Projects
                for bullet in getattr(entry, "bullets", []):
                    if bullet.sentence_id is not None:
                        max_id = max(max_id, bullet.sentence_id)

        # Non-list sections, e.g. Skills
        else:
            for sentence_id in getattr(section, "sentence_ids", []):
                max_id = max(max_id, sentence_id)

    return max_id + 1

def get_next_entry_id(resume: ResumeStructure) -> int:
    max_id = 0

    for section_name in type(resume).model_fields:
        section = getattr(resume, section_name)

        if not isinstance(section, list):
            continue

        for entry in section:
            eid = getattr(entry, "entry_id", None)
            if eid is not None:
                max_id = max(max_id, eid)

    return max_id + 1

def assign_entry_ids(resume: ResumeStructure) -> ResumeStructure:
    next_id = 0

    for section_name in type(resume).model_fields:
        section = getattr(resume, section_name)

        if not isinstance(section, list):
            continue

        for entry in section:
            entry.entry_id = next_id
            next_id += 1

    return resume