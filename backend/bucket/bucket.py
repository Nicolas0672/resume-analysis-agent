"""Cloud Object Storage Service (Stub).

Reserved for future multi-tenant document blob persistence (AWS S3 / Cloudflare R2 / Supabase Storage).
Will provide presigned upload URLs and immutable storage for candidate raw PDF/DOCX uploads.
"""

from typing import Optional
import os
import uuid
import boto3
from botocore.exceptions import ClientError
import re

class BucketStorageService:
    """Interface for managing cloud object storage buckets."""

    def __init__(self, bucket_name: Optional[str] = None):
        self.bucket_name = os.getenv("AWS_S3_BUCKET_NAME") or bucket_name
        self.region = os.getenv("AWS_REGION")

        if not self.bucket_name:
            raise ValueError("Bucket name must be provided either as an argument or via AWS_S3_BUCKET_NAME environment variable.")

        self.s3_client = boto3.client(
            "s3",
            region_name=self.region,
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        )

    async def upload_file(self, destination_path: str, file_bytes: bytes, content_type: str) -> str:
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=destination_path,
                Body=file_bytes,
                ContentType=content_type,
            )
        except ClientError as e:
            raise ValueError(f"Error uploading file to S3: {e}")
        return destination_path

    async def get_download_url(self, file_path: str, expires_in_seconds: int = 3600) -> str:
        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": file_path, "ResponseContentDisposition": "inline"},
                ExpiresIn=expires_in_seconds,
            )
        except ClientError as e:
            raise ValueError(f"Error generating download URL for S3 object: {e}")
        return url

    async def delete_file(self, file_path: str) -> None:
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=file_path)
        except ClientError as e:
            raise ValueError(f"Error deleting file from S3: {e}")

    @staticmethod
    def build_resume_s3_key(session_id: str, user_id: str, original_filename: str) -> str:

        # Clean original filename to avoid unsafe characters
        safe_filename = re.sub(r"[^a-zA-Z0-9._-]", "_", original_filename)

        # 2. Return the structured key with a UUID prefix to prevent collisions
        return f"resumes/{user_id}/{session_id}/{uuid.uuid4().hex[:8]}_{safe_filename}"

