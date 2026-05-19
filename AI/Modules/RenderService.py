from Models.work import RenderResponse
from Modules.AudioService import create_Audio_with_subtitles
from Modules.VideoService import create_video_with_subtitles
import os

SHARED_VOLUME_PATH = "/app/media"

def render_video(work_id: str, subtitle_data: dict) -> RenderResponse:
    print(f"[AI VideoService] render_video start work_id={work_id}", flush=True)
    output_filename = f"output_{work_id}.mp4"
    video_output_path = os.path.join(SHARED_VOLUME_PATH, output_filename)
    print(f"[AI VideoService] output path resolved work_id={work_id} video_output_path={video_output_path}", flush=True)

    subtitle_data = create_Audio_with_subtitles(subtitle_data)
    print(f"[AI VideoService] subtitle timeline prepared work_id={work_id}", flush=True)
    
    create_video_with_subtitles(subtitle_data, video_output_path)

    result = {
        "work_id": work_id,
        "outputVideoUrl": f"/media/{output_filename}",
        "status": "Done"
    }
    print(f"[AI VideoService] render_video done work_id={work_id} outputVideoUrl={result['outputVideoUrl']}", flush=True)
    return result