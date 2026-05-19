import os

from fastapi import FastAPI, HTTPException

from Modules.AnalService import analyze_video
from Modules.RenderService import render_video
from Models.work import (
    AnalyzeRequest,
    AnalyzeResponse,
    RenderRequest,
    RenderResponse,
    AsyncJobResponse,
    JobStatusResponse,
)
from tasks import enqueue_analyze_job, enqueue_render_job, get_job_status_payload

app = FastAPI(title="yourfactory AI API")


def log_ai(message: str, payload: dict | None = None):
    print(f"[AI main] {message}", payload or {}, flush=True)


@app.get("/")
def healthcheck():
    log_ai("healthcheck requested")
    return {"message": "yourfactory AI API is running"}


@app.get("/health/async")
def async_healthcheck():
    payload = {
        "message": "yourfactory AI async queue is available",
        "redis_url": os.getenv("REDIS_URL", "redis://redis:6379/0"),
        "broker_url": os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0"),
    }
    log_ai("async healthcheck requested", payload)
    return payload


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest):
    log_ai("sync analyze requested", {"work_id": payload.work_id, "sourceVideoPath": payload.sourceVideoPath})
    result = analyze_video(payload.work_id, payload.sourceVideoPath)
    log_ai("sync analyze completed", {"work_id": payload.work_id, "scriptCount": len(result.get("editedScript", []))})
    return result


@app.post("/analyze/async", response_model=AsyncJobResponse)
def analyze_async(payload: AnalyzeRequest):
    log_ai("async analyze requested", {"work_id": payload.work_id, "sourceVideoPath": payload.sourceVideoPath})
    job = enqueue_analyze_job(payload.work_id, payload.sourceVideoPath)
    log_ai("async analyze queued", job.model_dump())
    return job


@app.post("/render", response_model=RenderResponse)
def render(payload: RenderRequest):
    log_ai("sync render requested", {"work_id": payload.work_id, "subtitleKeys": list(payload.subtitle_data.model_dump().keys())})
    render_result = render_video(
        work_id=payload.work_id,
        subtitle_data=payload.subtitle_data
    )
    log_ai("sync render completed", {"work_id": payload.work_id, "outputVideoUrl": render_result.get("outputVideoUrl")})
    return render_result


@app.post("/render/async", response_model=AsyncJobResponse)
def render_async(payload: RenderRequest):
    subtitle_payload = payload.subtitle_data.model_dump()
    log_ai("async render requested", {"work_id": payload.work_id, "subtitleKeys": list(subtitle_payload.keys())})
    job = enqueue_render_job(payload.work_id, subtitle_payload)
    log_ai("async render queued", job.model_dump())
    return job


@app.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str):
    log_ai("job status requested", {"job_id": job_id})
    payload = get_job_status_payload(job_id)
    if not payload:
        log_ai("job status missing", {"job_id": job_id})
        raise HTTPException(status_code=404, detail="Job not found")
    log_ai("job status returned", {"job_id": job_id, "status": payload.get("status"), "jobType": payload.get("jobType")})
    return payload


