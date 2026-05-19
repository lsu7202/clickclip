import subprocess
import os
import base64
import tempfile
import json

import os
import base64
import tempfile
import subprocess

def create_video_with_subtitles(subtitle_data, video_output, font_path='Fonts/NanumSquareRoundB.ttf'):
    meta = subtitle_data.metadata
    layout = subtitle_data.globalSubtitleLayout
    scripts = subtitle_data.editedScript

    box_y = layout.y
    box_h = layout.height
    meta_w = meta.width
    video_input = subtitle_data.sourceVideoPath

    MAX_FONT_SIZE = 70  # 원하시는 최대 폰트 크기를 지정하세요
    font_size = min(int(box_h * 0.6), MAX_FONT_SIZE)
    
    # 1. 오디오 바이트 처리 (Base64 decode -> 임시 파일 저장)
    try:
        audio_data = base64.b64decode(subtitle_data.audioBytes)
    except Exception:
        audio_data = subtitle_data.audioBytes

    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_audio:
        tmp_audio.write(audio_data)
        temp_audio_path = tmp_audio.name

    filter_complex = []
    
    # 배경 검은색 박스 (자막 영역)
    filter_complex.append(
        f"drawtext=x=0:y={box_y}:box=1:boxcolor=black@1:"
        f"boxw={meta_w}:boxh={box_h}:text=''"
    )

    # 2. 자막 오버레이 필터 생성
    prev_time = 0.0
    for item in scripts:
        text = item.text
        end_time = item.endTimeSec
        
        # FFmpeg 특수문자 이스케이프 처리
        clean_text = text.replace("'", "\\'").replace(":", "\\:").replace(",", "\\,")
        
        drawtext = (
            f"drawtext=fontfile='{font_path}':text='{clean_text}':"
            f"fontcolor=yellow:fontsize={font_size}:"
            f"x=(w-text_w)/2:y={box_y}+(({box_h}-th)/2):"
            f"enable='between(t,{prev_time},{end_time})'"
        )
        filter_complex.append(drawtext)
        prev_time = end_time

    filter_str = ",".join(filter_complex)

    # 3. FFmpeg 명령어 구성
    # -stream_loop -1: 입력 영상을 무한 반복하도록 설정 (반드시 -i video_input 앞에 위치해야 합니다)
    # -shortest: 영상이 무한 반복되므로, 두 번째 입력인 오디오가 끝나면 인코딩도 자동으로 종료됩니다.
    command = [
        'ffmpeg',
        '-y',
        '-stream_loop', '-1',    # [수정] 영상을 무한 반복 처리
        '-i', video_input,       # 첫 번째 입력 (index 0)
        '-i', temp_audio_path,   # 두 번째 입력 (index 1)
        '-vf', filter_str,
        '-map', '0:v',           
        '-map', '1:a',           
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-shortest',             # [중요] 오디오가 끝나면 반복하던 영상도 여기서 끊깁니다.
        video_output
    ]

    print(f"[AI VideoService] ffmpeg starting video_input={video_input} audio_input={temp_audio_path}", flush=True)
    
    try:
        # 실행
        process = subprocess.run(command, check=True, capture_output=True, text=True)
        print(f"[AI VideoService] ffmpeg completed video_output={video_output}", flush=True)
    except subprocess.CalledProcessError as e:
        print(f"[AI VideoService] ffmpeg failed error={e} stderr={e.stderr}", flush=True)
        raise RuntimeError(f"FFmpeg 작업 실패: {e.stderr}")
    finally:
        # 임시 파일 삭제
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

    return video_output
