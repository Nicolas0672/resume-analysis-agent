"""Cloud Object Storage Service (Stub).

Reserved for future multi-tenant document blob persistence (AWS S3 / Cloudflare R2 / Supabase Storage).
Will provide presigned upload URLs and immutable storage for candidate raw PDF/DOCX uploads.
"""

from typing import Optional


class BucketStorageService:
    """Interface for managing cloud object storage buckets."""

    def __init__(self, bucket_name: Optional[str] = None):
        self.bucket_name = bucket_name

    async def upload_file(self, destination_path: str, file_bytes: bytes) -> str:
        raise NotImplementedError("Cloud object storage integration planned for next phase.")

    async def get_download_url(self, file_path: str, expires_in_seconds: int = 3600) -> str:
        raise NotImplementedError("Cloud object storage integration planned for next phase.")
