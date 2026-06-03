from functools import lru_cache
from typing import Any, Protocol

from app.core.config import settings


class ObjectStorageError(Exception):
    pass


class ObjectStorage(Protocol):
    def put_bytes(self, key: str, content: bytes, content_type: str) -> None: ...

    def get_bytes(self, key: str) -> bytes: ...

    def delete_object(self, key: str) -> None: ...


class S3ObjectStorage:
    def __init__(self, client: Any, bucket: str) -> None:
        self._client = client
        self._bucket = bucket

    def put_bytes(self, key: str, content: bytes, content_type: str) -> None:
        try:
            self._client.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=content,
                ContentType=content_type,
            )
        except Exception as exc:
            raise ObjectStorageError(f"Failed to put object: {key}") from exc

    def get_bytes(self, key: str) -> bytes:
        try:
            response = self._client.get_object(Bucket=self._bucket, Key=key)
            return response["Body"].read()
        except Exception as exc:
            raise ObjectStorageError(f"Failed to get object: {key}") from exc

    def delete_object(self, key: str) -> None:
        try:
            self._client.delete_object(Bucket=self._bucket, Key=key)
        except Exception as exc:
            raise ObjectStorageError(f"Failed to delete object: {key}") from exc


@lru_cache(maxsize=1)
def get_object_storage() -> ObjectStorage:
    import boto3

    client = boto3.client(
        "s3",
        endpoint_url=settings.object_storage_endpoint_url,
        aws_access_key_id=settings.object_storage_access_key,
        aws_secret_access_key=settings.object_storage_secret_key,
        region_name=settings.object_storage_region,
        use_ssl=settings.object_storage_secure,
    )
    return S3ObjectStorage(client=client, bucket=settings.object_storage_bucket)
