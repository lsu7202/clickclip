from pydantic import BaseModel, Field
from typing import List


class AnalyzeRequest(BaseModel):
    work_id: str
    sourceVideoPath: str = Field(..., description="업로드된 영상의 접근 URL 또는 식별자")

class EditedScriptItem(BaseModel):
    idx: int
    text: str
    endTimeSec: float = 0.0

class MetaData(BaseModel):
    width: int
    height: int

class GloblaSubtitleLayout(BaseModel):
    y: int
    height: int

class SubtitleData(BaseModel):
    sourceVideoPath : str
    voicePreset: str
    audioBytes: str = ""
    metadata : MetaData
    globalSubtitleLayout: GloblaSubtitleLayout
    editedScript: List[EditedScriptItem]

class RenderRequest(BaseModel):
    work_id:str
    subtitle_data: SubtitleData

class AnalyzeResponse(BaseModel):
    work_id: str
    originalScript:str
    editedScript: List[EditedScriptItem]

class RenderResponse(BaseModel):
    work_id: str
    outputVideoUrl: str
    status: str


class AsyncJobResponse(BaseModel):
    jobId: str
    work_id: str
    jobType: str
    status: str


class JobStatusResponse(BaseModel):
    jobId: str
    work_id: str
    jobType: str
    status: str
    progress: int = 0
    message: str | None = None
    result: dict | None = None
    error: str | None = None
