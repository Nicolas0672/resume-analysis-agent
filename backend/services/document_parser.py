from importlib.metadata import PackageNotFoundError
from io import BytesIO

from docx import Document

def open_docx(file_bytes: bytes) -> Document:
    try:
        return Document(BytesIO(file_bytes))
    except PackageNotFoundError:
        raise ValueError("Invalid DOCX file")

def parse_docx(doc):
    paragraphs = []

    for index, paragraph in enumerate(doc.paragraphs):
        if not paragraph.text.strip():
            continue

        paragraphs.append({
            "id": f"{index}",
            "text": paragraph.text,
        })
    return paragraphs

def parse_resume(file_bytes: bytes):
    doc = open_docx(file_bytes)
    return parse_docx(doc)



