import requests
import json
import base64
import os
import base64
import re

def create_Audio_with_subtitles(subtitle_data):
    """
    도커 환경변수에서 ElevenLabs API Key를 가져와 오디오를 생성하고,
    각 자막 아이템의 정확한 endTimeSec를 계산합니다.
    """
    # 1. 도커 환경변수에서 API Key 가져오기
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise ValueError("환경변수 'ELEVENLABS_API_KEY'가 설정되지 않았습니다.")
    

    # 2. 전체 스크립트 병합
    scripts = ""
    for idx, data in enumerate(subtitle_data.editedScript):
        # 마침표 제거한 텍스트 생성
        cleaned_text = clean_text(data.text)
        
        # 딕셔너리가 아닌 객체이므로 .text로 직접 대입 (오타 변수명도 수정)
        subtitle_data.editedScript[idx].text = cleaned_text
        
        # 전체 스크립트 병합
        scripts += ' ' + cleaned_text
        
    voiceId = subtitle_data.voicePreset
    voiceSpeed = subtitle_data.voiceSpeed
    print("속도#########")
    print(voiceSpeed)
    
    # API 호출 (환경변수에서 가져온 키 전달)
    audio_bytes, alignment = generate_speech_with_timestamps(voiceId, voiceSpeed, scripts, api_key)

    if not audio_bytes or not alignment:
        print("오디오 생성 실패")
        return subtitle_data

    # Pydantic 스키마(str)에 맞게 base64 인코딩 문자열로 변환하여 바인딩
    subtitle_data.audioBytes = base64.b64encode(audio_bytes).decode('utf-8')
    
    # 3. Alignment 데이터를 기반으로 자막 타임스탬프 매칭
    chars = alignment.get("characters", [])
    end_times = alignment.get("character_end_times_seconds", [])
    
    char_index = 0
    total_alignment_chars = len(chars)

    for item in subtitle_data.editedScript:
        target_text = item.text
        last_match_time = 0.0
        
        for target_char in target_text:
            if char_index >= total_alignment_chars:
                break
                
            if chars[char_index] == target_char:
                last_match_time = end_times[char_index]
                char_index += 1
            else:
                # 공백이나 특수문자로 인한 불일치 해결을 위한 예외 처리 루프
                while char_index < total_alignment_chars and chars[char_index] != target_char:
                    char_index += 1
                if char_index < total_alignment_chars:
                    last_match_time = end_times[char_index]
                    char_index += 1

        # 해당 자막 섹션의 최종 종료 시간 기록
        item.endTimeSec = last_match_time

    return subtitle_data


def generate_speech_with_timestamps(voice_id, voice_speed, text, api_key):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps"
    
    headers = {
        "Content-Type": "application/json",
        "xi-api-key": api_key
    }
    
    data = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "language_code": "ko",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "speed": voice_speed
        }
    }

    response = requests.post(url, json=data, headers=headers)

    if response.status_code == 200:
        response_dict = response.json()
        
        # 오디오 데이터 (base64 인코딩됨)
        audio_bytes = base64.b64decode(response_dict["audio_base64"])
        
        # 발화 타이밍 정보 (alignment)
        alignment = response_dict["alignment"]
        
        return audio_bytes, alignment
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return None, None

def clean_text(text):
    if not text:
        return ""
    # 한글, 영어, 숫자, 공백(스페이스)만 남기고 나머지 모든 특수문자/기호 제거
    # [^ ...] 은 대괄호 안의 문자가 아닌 것들을 뜻합니다.
    cleaned = re.sub(r"[^가-힣a-zA-Z0-9\s]", "", text)
    
    # 양끝 공백 제거 및 연속된 공백은 하나로 축소
    cleaned = " ".join(cleaned.split())
    return cleaned