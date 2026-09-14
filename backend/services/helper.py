def get_next_sentence_id(bullets):
    if not bullets:
        return 0
    return max(b.sentence_id for b in bullets) + 1

def get_next_entry_id(entries):
    if not entries:
        return 0
    return max(b.entry_id for b in entries) + 1