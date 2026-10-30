from model.resume_schema import ResumeStructure


def get_next_sentence_id(resume: ResumeStructure) -> int:
    """Finds the maximum sentence_id currently in use across all resume sections
    and returns max_id + 1 to guarantee sequential, collision-free allocation.
    """
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
    """Finds the maximum entry_id across all list sections in resume_to_edit
    and returns max_id + 1.
    """
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
    """Assigns sequential, globally unique integer entry_ids across all list sections."""
    next_id = 0

    for section_name in type(resume).model_fields:
        section = getattr(resume, section_name)

        if not isinstance(section, list):
            continue

        for entry in section:
            entry.entry_id = next_id
            next_id += 1

    return resume
