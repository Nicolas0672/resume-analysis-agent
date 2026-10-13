from io import BytesIO
import unittest
import zipfile
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.auth import get_current_user
from api.resume import router as resume_router

app = FastAPI()
app.include_router(resume_router)

# Override auth dependency for unit tests
app.dependency_overrides[get_current_user] = lambda: {
    "id": "test-user-123",
    "email": "test@example.com",
}

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


class TestUploadSecurity(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_upload_rejects_file_over_10mb(self):
        # Create a dummy payload larger than 10MB (e.g. 10.5 MB)
        oversized_data = b"x" * (10 * 1024 * 1024 + 500 * 1024)
        files = {
            "file": ("oversized.docx", oversized_data, DOCX_MIME)
        }
        data = {"job_description": "We are seeking a senior python engineer with 5+ years experience."}

        response = self.client.post("/api/upload", files=files, data=data)

        self.assertEqual(response.status_code, 413)
        self.assertIn("10MB limit", response.json()["detail"])

    def test_upload_rejects_non_docx_content_type(self):
        files = {
            "file": ("resume.pdf", b"%PDF-1.4 ...", "application/pdf")
        }
        data = {"job_description": "We are seeking a senior python engineer."}

        response = self.client.post("/api/upload", files=files, data=data)

        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid file type", response.json()["detail"])

    def test_upload_rejects_corrupted_zip_archive(self):
        # Proper MIME type but corrupt bytes that cannot be parsed as a zip
        files = {
            "file": ("corrupt.docx", b"PK\x03\x04corrupted-archive-data", DOCX_MIME)
        }
        data = {"job_description": "We are seeking a senior python engineer."}

        response = self.client.post("/api/upload", files=files, data=data)

        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid or corrupt DOCX archive", response.json()["detail"])

    def test_upload_rejects_zip_bomb_uncompressed_expansion(self):
        # Create a zip archive that compresses 55MB of zeros into ~55KB
        buf = BytesIO()
        with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("word/document.xml", b"\x00" * (55 * 1024 * 1024))

        files = {
            "file": ("zipbomb.docx", buf.getvalue(), DOCX_MIME)
        }
        data = {"job_description": "We are seeking a senior python engineer."}

        response = self.client.post("/api/upload", files=files, data=data)

        # Should be caught by uncompressed size (>50MB) limit
        self.assertEqual(response.status_code, 413)
        self.assertIn("uncompressed size limits", response.json()["detail"])

    def test_upload_rejects_zip_bomb_extreme_compression_ratio(self):
        # Create a zip archive under 50MB uncompressed (e.g. 20MB) with extreme compression ratio (>100:1)
        buf = BytesIO()
        with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("word/document.xml", b"\x00" * (20 * 1024 * 1024))

        files = {
            "file": ("ratio_bomb.docx", buf.getvalue(), DOCX_MIME)
        }
        data = {"job_description": "We are seeking a senior python engineer."}

        response = self.client.post("/api/upload", files=files, data=data)

        self.assertEqual(response.status_code, 400)
        self.assertIn("compression ratio too high", response.json()["detail"])

    @patch("api.resume.process_resume_analysis", new_callable=AsyncMock)
    @patch("api.resume.create_user_session", new_callable=AsyncMock)
    @patch("api.resume.initialize_tailoring_session", new_callable=AsyncMock)
    def test_upload_accepts_valid_docx_under_10mb(
        self, mock_init, mock_create_sess, mock_analysis
    ):
        mock_analysis.return_value = {
            "success": True,
            "requires_job_description": False,
            "structured_resume": {"name": "Jane Doe"},
            "job_details": {"job_title": "Software Engineer", "job_company": "Acme"},
        }
        mock_init.return_value = {"greeting": "Hello"}

        # Valid small DOCX archive
        buf = BytesIO()
        with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("[Content_Types].xml", b'<?xml version="1.0"?><Types></Types>')
            zf.writestr("word/document.xml", b'<?xml version="1.0"?><document>Valid content</document>')

        files = {
            "file": ("valid.docx", buf.getvalue(), DOCX_MIME)
        }
        data = {"job_description": "We are seeking a senior python engineer."}

        response = self.client.post("/api/upload", files=files, data=data)

        self.assertEqual(response.status_code, 200)
        json_data = response.json()
        self.assertTrue(json_data["success"])
        self.assertEqual(json_data["resume_data"], {"name": "Jane Doe"})


if __name__ == "__main__":
    unittest.main()
