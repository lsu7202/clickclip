from pydantic import BaseModel, Field
from typing import List

class EditedScriptItem(BaseModel):
    idx: int
    text: str

class AnalyzeAPIResponse(BaseModel):
    originalScript: str
    editedScript: List[EditedScriptItem]