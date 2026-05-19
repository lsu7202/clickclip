import json
import os
from typing import Any

from redis import Redis


REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")


def get_redis_client() -> Redis:
    return Redis.from_url(REDIS_URL, decode_responses=True)


def set_job_payload(job_id: str, payload: dict[str, Any], ttl_seconds: int = 86400) -> None:
    client = get_redis_client()
    client.setex(f"job:status:{job_id}", ttl_seconds, json.dumps(payload, ensure_ascii=False))


def get_job_payload(job_id: str) -> dict[str, Any] | None:
    client = get_redis_client()
    raw = client.get(f"job:status:{job_id}")
    if not raw:
        return None
    return json.loads(raw)