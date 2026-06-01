from Models.api import AnalyzeAPIResponse
import os
import ffmpeg
from google import genai
from google.genai import types

INSTRUCTION = """
    originalScript 분석 -> originalScript 각색 -> editedScript 생성 (각색 쪼개기)

    originalScript 분석:
    * Speech To Text
    Speech To Text 작업입니다. 영상의 음성 정보를 분석하여 100% 일치하는 Text로 반환합니다. 출력구조에 맞게 originalScript 에 넣습니다.

    originalScript 각색:
    * 각색한 부분 및 전 문장은 originalScript 와 결론적 의미가 일치, * originalScript의 기승전결 및 말투를 파악후 모방
    originalScript 을 각색합니다. 각색한 각 문장과 문장을 합친 전체 스크립트는 originalScript와 결론적인 의미가 일치합니다. 또한 originalScript의 말투, 문장의 기승전결 전개 방식을 똑같이 따라합니다.
    예를 들어 originalScript가 "이게 뭐하는 물건인지 짐작 가시나요? 어떤 일본인이 세상에 없는 제품을 만들겠다 결심하고..." 이면 각색한 문장은 위 결론적 의미 규칙을 지키기 위해
    "이게 도대체 어떤 물건 같아보이나요? 웬 일본인이 세상에 없는 물건을 발명하기로 마음먹고..." 처럼 각색 할 수 있다. 또한 각색한 문장은 originalScript와 글자수가 거의 일치한다.

    editedScript 생성:
    * 의미 단위로 쪼개기 * 최대 글자수는 공백 포함 15글자
    스크립트를 한국어 의미 단위를 기준으로 한번 쪼개고, 쪼갠 것이 글자수 제한(15)을 넘지 않도록 다시 적절히 쪼개서 editedScript출력구조에 맞게 반환해. 의미 단위로 쪼갰는데 15글자를 넘으면 그 문장을 다시 쪼개라는 뜻.
    한국어 의미 단위란 주어, 목적어, 서술어를 뜻한다.
    예를 들어, "이게 뭐하는 물건인지 짐작 가시나요?" 라는 문장을 쪼갠다면, "이게 뭐하는 물건인지" "짐작 가시나요?" 로 쪼갠다.
    또다른 예로 "어떤 일본인이 세상에 없는 제품을 만들겠다 결심하고 일본스러운 마우스를 발명했는데요" 라는 문장을 쪼갠다면, "어떤 일본인이" "세상에 없는 제품을" "만들겠다 결심하고" "일본스러운 마우스를" "발명했는데요" 로 쪼갠다.
    출력 구조에서 각 딕셔너리의 idx는 쪼개진 문장의 번호를, text는 그 문장을 의미한다.
"""


def analyze_video(work_id: str, sourceVideoPath: str) -> dict:
    print(f"[AI AnalService] analyze_video start work_id={work_id} sourceVideoPath={sourceVideoPath}", flush=True)

    response = analyzeAPI(sourceVideoPath)
    print(f"[AI AnalService] analyzeAPI response keys={list(response.keys()) if isinstance(response, dict) else type(response)}", flush=True)

    result = {
        "work_id": work_id,
        "originalScript": response['originalScript'],
        "editedScript": response['editedScript']
    }
    print(f"[AI AnalService] analyze_video done work_id={work_id} editedCount={len(result['editedScript'])}", flush=True)
    return result


import time
import os
# 필요한 모듈 임포트 확인 (예: genai, types 등)

def analyzeAPI(sourceVideoPath: str) -> AnalyzeAPIResponse:
    print(f"[AI AnalService] analyzeAPI called sourceVideoPath={sourceVideoPath}", flush=True)

    encode_video_for_gemini(sourceVideoPath, sourceVideoPath)

    api_key = os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)

    # 1. 파일 업로드
    myfile = client.files.upload(file=sourceVideoPath)
    print(f"[AI AnalService] File uploaded. Name: {myfile.name}. Waiting for processing...", flush=True)

    # 2. 파일 상태가 ACTIVE가 될 때까지 대기
    # (새로운 SDK에서는 파일의 최신 상태를 가져오기 위해 client.files.get()을 사용합니다)
    while myfile.state.name == "PROCESSING":
        print(".", end="", flush=True)
        time.sleep(5)  # 5초 간격으로 확인 (비디오 크기에 따라 조절)
        myfile = client.files.get(name=myfile.name)

    if myfile.state.name == "FAILED":
        print(myfile)
        raise ValueError(f"File processing failed on Gemini server. File name: {myfile.name} {myfile.error}")

    print(f"\n[AI AnalService] File is now ACTIVE. Proceeding to content generation.", flush=True)

    prompt = "출력구조와 가이드에 맞게 originalScript 분석 -> originalScript 각색 -> editedScript 생성 (각색 쪼개기) 작업 진행해줘. 반환 언어 : korean"

    # 3. 콘텐츠 생성 요청
    response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt, myfile],
            config=types.GenerateContentConfig(
                system_instruction=INSTRUCTION,
                response_mime_type="application/json",
                response_schema=AnalyzeAPIResponse
            )
        )
    
    data = AnalyzeAPIResponse.model_validate_json(response.text)
    client.files.delete(name=myfile.name)
     
    return data.model_dump()

def encode_video_for_gemini(input_path, output_path):
    """
    Gemini API 호환을 위해 비디오를 H.264 / AAC 포맷으로 재인코딩합니다.
    """
    try:
        print(f"변환 시작: {input_path} -> {output_path}")
        
        # ffmpeg 명령어 조립 및 실행
        (
            ffmpeg
            .input(input_path)
            .output(
                output_path, 
                vcodec='libx264',   # 영상 코덱을 H.264로 강제
                acodec='aac',       # 음성 코덱을 AAC로 강제
                pix_fmt='yuv420p',  # 대부분의 기기와 웹에서 지원하는 픽셀 포맷
                vprofile='high',    # 호환성 높은 프로필
                level='4.2'
            )
            .overwrite_output()     # 이미 출력 파일이 있다면 덮어쓰기
            .run(capture_stdout=True, capture_stderr=True) # 로그 캡처
        )
        print("변환 완료 성공!")
        return True
        
    except ffmpeg.Error as e:
        # 에러 발생 시 ffmpeg이 남긴 상세 로그 출력 (원인 분석용)
        print("FFmpeg 에러 발생!")
        print(e.stderr.decode('utf-8'))
        return False

    