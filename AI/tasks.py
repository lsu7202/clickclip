import os
from uuid import uuid4

from celery import Celery

from Models.work import AsyncJobResponse, SubtitleData
from Modules.AnalService import analyze_video
from Modules.RenderService import render_video
from core.redis_client import get_job_payload, set_job_payload


def log_task(message: str, payload: dict | None = None):
    print(f"[AI task] {message}", payload or {}, flush=True)


BROKER_URL = os.getenv("CELERY_BROKER_URL", os.getenv("REDIS_URL", "redis://redis:6379/0"))
RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", os.getenv("REDIS_URL", "redis://redis:6379/0"))

celery_app = Celery(
    "yourfactory_ai",
    broker=BROKER_URL,
    backend=RESULT_BACKEND,
)

celery_app.conf.update(
    task_track_started=True,
    result_expires=86400,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)


def _store_job(job_id: str, work_id: str, job_type: str, status: str, progress: int = 0, message: str | None = None, result: dict | None = None, error: str | None = None) -> dict:
    payload = {
        "jobId": job_id,
        "work_id": work_id,
        "jobType": job_type,
        "status": status,
        "progress": progress,
        "message": message,
        "result": result,
        "error": error,
    }
    set_job_payload(job_id, payload)
    log_task('job state updated', payload)
    return payload


@celery_app.task(name="yourfactory_ai.analyze")
def analyze_job(work_id: str, source_video_path: str, job_id: str | None = None):
    job_id = job_id or f"job_analyze_{uuid4().hex}"
    log_task('analyze job started', {"job_id": job_id, "work_id": work_id, "source_video_path": source_video_path})
    _store_job(job_id, work_id, "analyze", "RUNNING", progress=10, message="analysis started")
    try:
        result = analyze_video(work_id, source_video_path)
        log_task('analyze job completed', {"job_id": job_id, "work_id": work_id, "scriptCount": len(result.get('editedScript', []))})
        _store_job(job_id, work_id, "analyze", "SUCCEEDED", progress=100, message="analysis completed", result=result)
        return result
    except Exception as exc:
        log_task('analyze job failed', {"job_id": job_id, "work_id": work_id, "error": str(exc)})
        _store_job(job_id, work_id, "analyze", "FAILED", progress=100, message="analysis failed", error=str(exc))
        raise


@celery_app.task(name="yourfactory_ai.render")
def render_job(work_id: str, subtitle_data: dict, job_id: str | None = None):
    job_id = job_id or f"job_render_{uuid4().hex}"
    log_task('render job started', {"job_id": job_id, "work_id": work_id, "subtitleKeys": list(subtitle_data.keys())})
    _store_job(job_id, work_id, "render", "RUNNING", progress=10, message="render started")
    try:
        subtitle_model = SubtitleData.model_validate(subtitle_data)
        result = render_video(work_id=work_id, subtitle_data=subtitle_model)
        log_task('render job completed', {"job_id": job_id, "work_id": work_id, "outputVideoUrl": result.get('outputVideoUrl')})
        _store_job(job_id, work_id, "render", "SUCCEEDED", progress=100, message="render completed", result=result)
        return result
    except Exception as exc:
        log_task('render job failed', {"job_id": job_id, "work_id": work_id, "error": str(exc)})
        _store_job(job_id, work_id, "render", "FAILED", progress=100, message="render failed", error=str(exc))
        raise


def enqueue_analyze_job(work_id: str, source_video_path: str) -> AsyncJobResponse:
    job_id = f"job_analyze_{uuid4().hex}"
    log_task('analyze job queued', {"job_id": job_id, "work_id": work_id, "source_video_path": source_video_path})
    _store_job(job_id, work_id, "analyze", "PENDING", progress=0, message="queued")
    analyze_job.apply_async(args=[work_id, source_video_path, job_id])
    return AsyncJobResponse(jobId=job_id, work_id=work_id, jobType="analyze", status="PENDING")


def enqueue_render_job(work_id: str, subtitle_data: dict) -> AsyncJobResponse:
    job_id = f"job_render_{uuid4().hex}"
    log_task('render job queued', {"job_id": job_id, "work_id": work_id, "subtitleKeys": list(subtitle_data.keys())})
    _store_job(job_id, work_id, "render", "PENDING", progress=0, message="queued")
    render_job.apply_async(args=[work_id, subtitle_data, job_id])
    return AsyncJobResponse(jobId=job_id, work_id=work_id, jobType="render", status="PENDING")


def get_job_status_payload(job_id: str):
    payload = get_job_payload(job_id)
    log_task('job payload read', {"job_id": job_id, "found": bool(payload), "status": payload.get('status') if payload else None})
    if not payload:
        return None
    return payload