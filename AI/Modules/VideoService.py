import os
import base64
import tempfile
import subprocess

def create_video_with_subtitles(subtitle_data, video_output, font_path='Fonts/NanumSquareRoundB.ttf'):
    meta = subtitle_data.metadata
    layout = subtitle_data.globalSubtitleLayout
    scripts = subtitle_data.editedScript
    inverse = subtitle_data.inverse
    boxColor = subtitle_data.boxColor
    subtitleColor = subtitle_data.subtitleColor
    
    # 👈 프론트엔드에서 넘어온 bgmPreset 추출
    bgm_preset = getattr(subtitle_data, 'bgmPreset', 0)

    print(subtitle_data)

    box_y = layout.y
    box_h = layout.height
    meta_w = meta.width
    video_input = subtitle_data.sourceVideoPath

    MAX_FONT_SIZE = 70
    font_size = min(int(box_h * 0.6), MAX_FONT_SIZE)
    
    # 1. 오디오 바이트 처리 (Base64 decode -> 임시 파일 저장)
    try:
        audio_data = base64.b64decode(subtitle_data.audioBytes)
    except Exception:
        audio_data = subtitle_data.audioBytes

    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_audio:
        tmp_audio.write(audio_data)
        temp_audio_path = tmp_audio.name

    # 2. 비디오 필터(vf) 구성
    filter_complex_vf = []

    if inverse:
        filter_complex_vf.append("hflip")
    
    # 배경 검은색 박스 (자막 영역)
    filter_complex_vf.append(
        f"drawtext=x=0:y={box_y}:box=1:boxcolor={boxColor}@1:"
        f"boxw={meta_w}:boxh={box_h}:text=''"
    )

    # 자막 오버레이 필터 생성
    prev_time = 0.0
    for item in scripts:
        text = item.text
        end_time = item.endTimeSec
        
        clean_text = text.replace("'", "\\'").replace(":", "\\:").replace(",", "\\,")
        
        drawtext = (
            f"drawtext=fontfile='{font_path}':text='{clean_text}':"
            f"fontcolor={subtitleColor}:fontsize={font_size}:"
            f"x=(w-text_w)/2:y={box_y}+(({box_h}-th)/2):"
            f"enable='between(t,{prev_time},{end_time})'"
        )
        filter_complex_vf.append(drawtext)
        prev_time = end_time

    vf_str = ",".join(filter_complex_vf)

    # 3. FFmpeg 명령어 및 입력 세팅
    # 기본 입력: 반복 영상(0), 내레이션 오디오(1)
    command = [
        'ffmpeg',
        '-y',
        '-stream_loop', '-1',    # 영상 무한 반복
        '-i', video_input,       # [Input 0] 비디오
        '-i', temp_audio_path,   # [Input 1] 내레이션 오디오
    ]

    bgm_path = None
    if bgm_preset and str(bgm_preset).strip() != '0':
        bgm_filename = str(bgm_preset).strip()
        
        if not bgm_filename.lower().endswith('.mp3'):
            bgm_filename += '.mp3'
            
        bgm_path = os.path.join('bgm', bgm_filename)

    # BGM이 유효하고 실제 파일이 존재하는 경우 오디오 합성 필터(filter_complex) 구성
    if bgm_path and os.path.exists(bgm_path):
        print(f"[AI VideoService] BGM detected and verified: {bgm_path}", flush=True)
        
        # 🟢 [수정] BGM 루프(-stream_loop -1)를 제거하고 일방적으로 입력 받아옴
        command.extend(['-i', bgm_path]) # [Input 2] BGM 비디오/오디오
        
        # amix의 duration=first와 명령어 맨 뒤의 -shortest가 결합하여 
        # 최종 영상 길이에 맞춰서 BGM을 자동으로 칼같이 잘라줍니다.
        filter_complex_str = (
            f"[1:a]volume=2.0[v_nar];"
            f"[2:a]volume=0.3[v_bgm];"
            f"[v_nar][v_bgm]amix=inputs=2:duration=first:dropout_transition=0[a_out]"
        )
        
        command.extend([
            '-filter_complex', filter_complex_str,
            '-vf', vf_str,
            '-map', '0:v',
            '-map', '[a_out]'
        ])
    else:
        # BGM이 없을 경우이거나 파일이 지정된 경로에 없을 때 (기존 오리지널 로직 유지)
        print(f"[AI VideoService] No BGM or BGM file missing (path attempted: {bgm_path}). Processing narration only.", flush=True)
        command.extend([
            '-vf', vf_str,
            '-map', '0:v',           
            '-map', '1:a'
        ])

    # 공통 출력 인코딩 옵션 추가
    command.extend([
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-shortest',             # 내레이션 오디오가 끝날 때 반복 영상과 BGM을 함께 강제 종료
        video_output
    ])

    print(f"[AI VideoService] ffmpeg starting command={' '.join(command)}", flush=True)
    
    try:
        process = subprocess.run(command, check=True, capture_output=True, text=True)
        print(f"[AI VideoService] ffmpeg completed video_output={video_output}", flush=True)
    except subprocess.CalledProcessError as e:
        print(f"[AI VideoService] ffmpeg failed error={e} stderr={e.stderr}", flush=True)
        raise RuntimeError(f"FFmpeg 작업 실패: {e.stderr}")
    finally:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

    return video_output