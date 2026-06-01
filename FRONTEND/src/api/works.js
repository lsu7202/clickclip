import client from './client';

/**
 * 작업 목록 조회
 * @param {Object} options - 조회 옵션
 * @param {string} [options.status] - 작업 상태 필터 (NEW, IN_PROGRESS, RENDERING, DONE, FAILED)
 * @param {number} [options.limit] - 조회할 항목 수 (기본값: 50)
 * @param {number} [options.offset] - 페이지 오프셋 (기본값: 0)
 * @returns {Promise<Object>} 작업 목록
 */
export const getWorks = async (options = {}) => {
  try {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);

    const { data } = await client.get(
      `/works?${params.toString()}`
    );
    
    return data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * 특정 작업 조회
 * @param {string} workId - 작업 ID
 * @returns {Promise<Object>} 작업 상세 정보
 */
export const getWork = async (workId) => {
  try {
    const { data } = await client.get(`/works/${workId}`);
    return data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * 작업 삭제
 * @param {string} workId - 작업 ID
 * @returns {Promise<Object>} 삭제 결과
 */
export const deleteWork = async (workId) => {
  try {
    const { data } = await client.delete(`/works/${workId}`);
    return data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * 새 작업 생성
 * @param {Object} work - 작업 정보
 * @param {string} work.title - 작업 제목
 * @param {string} work.originalScript - 원본 스크립트
 * @returns {Promise<Object>} 생성된 작업 정보
 */
export const createWork = async (work) => {
  try {
    const { data } = await client.post('/works', work);
    return data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * 작업 임시 저장 (Draft)
 * @param {string} workId - 작업 ID
 * @param {Object} updates - 수정할 정보
 * @param {JSON} [updates.editedScript] - 수정된 스크립트
 * @param {string} [updates.voicePreset] - 음성 프리셋
 * @param {string} [updates.sourceVideoName] - 원본 영상 파일명
 * @param {number} [updates.durationSec] - 영상 길이 (초)
 * @returns {Promise<Object>} 저장된 작업 정보
 */
export const saveDraft = async (workId, updates) => {
  try {
    const { data } = await client.post(`/works/${workId}/draft`, updates);
    return data;
  } catch (error) {
    throw error.response?.data || error;
  }
};


/**
 * 분석 시작 (AI 서버에 분석 트리거)
 * @param {string} workId - 작업 고유 ID
 * @param {string} sourceVideoPath - 분석할 영상의 경로
 * @returns {Promise<object>} - originalScript, editedScript 등을 포함한 결과
 */
export const startAnalyze = async (workId, sourceVideoPath) => {
  try {
    // 설정된 client를 사용하여 POST 요청
    // baseURL이 /api까지 포함되어 있다면 경로는 아래와 같습니다.
    const response = await client.post(`/works/${workId}/analyze`, {
      sourceVideoPath: sourceVideoPath,
    });

    // 백엔드에서 res.status(200).json({ success: true, ... })으로 보낸 데이터 반환
    return response.data;
  } catch (error) {
    // 에러 발생 시 상세 메시지 로깅
    console.error(
      'Analysis API Error:',
      error.response?.data?.message || error.message
    );
    throw error;
  }
};

/**
 * 렌더링 시작
 * @param {string} workId - 작업 ID
 * @returns {Promise<Object>} 렌더링 시작 응답
 */
export const startRendering = async (workId, rect, videoDim, voicePreset, voiceSpeed, subtitleColor, boxColor, bgmPreset) => {
  try {
    const { data } = await client.post(`/works/${workId}/render`, {rect, videoDim, voicePreset, voiceSpeed, subtitleColor, boxColor, bgmPreset}, { timeout: 300000 });
    
    return data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * 다운로드 URL 조회
 * @param {string} workId - 작업 ID
 * @returns {Promise<Object>} 다운로드 URL 정보
 */
export const getDownloadUrl = async (workId) => {
  try {
    const { data } = await client.get(`/works/${workId}/download`);
    return data?.data?.downloadUrl || data?.data?.downloadurl || data?.downloadUrl || null;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * 소스 영상 업로드 (공유 볼륨 저장)
 * @param {string} workId - 작업 ID
 * @param {File} file - 업로드할 영상 파일
 * @returns {Promise<Object>} 업로드 결과 및 저장된 경로
 */
export const uploadWorkVideo = async (workId, file) => {
  try {
    const formData = new FormData();
    formData.append('video', file);

    const { data } = await client.post(`/works/${workId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
/**
 * 비동기 Job 상태 조회 (한 번만)
 * @param {string} workId - 작업 ID
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} 작업 상태 정보 { jobId, status, progress, message, result, error }
 */
export const getJobStatus = async (workId, jobId) => {
  try {
    const { data } = await client.get(`/works/${workId}/jobs/${jobId}`);
    return data?.data || data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * 비동기 Job이 완료될 때까지 폴링
 * @param {string} workId - 작업 ID
 * @param {string} jobId - Job ID
 * @param {number} maxWaitTime - 최대 대기 시간 (밀리초, 기본값 1시간)
 * @param {number} pollInterval - 폴링 간격 (밀리초, 기본값 2초)
 * @param {Function} onProgress - 진행 상태 콜백 { progress, status, message }
 * @returns {Promise<Object>} 완료된 Job 상태
 */
export const waitForJobCompletion = async (
  workId,
  jobId,
  maxWaitTime = 3600000,
  pollInterval = 2000,
  onProgress = null
) => {
  const startTime = Date.now();

  while (true) {
    try {
      const jobStatus = await getJobStatus(workId, jobId);
      const jobState = jobStatus?.job || jobStatus;

      // 진행 상태 콜백 호출
      // normalize incoming status values to canonical set: PENDING, RUNNING, DONE, FAILED
      const rawStatus = (jobState.status || jobState.state || '').toString();
      const s = rawStatus.toUpperCase();
      let normalized = 'PENDING';
      if (s === 'SUCCEEDED' || s === 'COMPLETED' || s === 'DONE' || s === 'SUCCESS') normalized = 'DONE';
      else if (s === 'STARTED' || s === 'RUNNING' || s === 'IN_PROGRESS') normalized = 'RUNNING';
      else if (s === 'FAILED' || s === 'FAIL') normalized = 'FAILED';
      else if (s === 'PENDING' || s === 'QUEUED' || s === 'WAITING') normalized = 'PENDING';

      const progressPayload = {
        progress: jobState.progress || jobState.percent || 0,
        status: normalized,
        message: jobState.message || jobState.log || null,
      };

      if (onProgress) onProgress(progressPayload);

      // 작업 완료
      if (normalized === 'DONE') return jobStatus;

      // 작업 실패
      if (normalized === 'FAILED') {
        throw new Error(jobState.error || jobState.message || 'Job failed');
      }

      // 타임아웃 체크
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Job polling timeout');
      }

      // 다음 폴링까지 대기
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.error('[waitForJobCompletion] Error:', error);
      throw error;
    }
  }
};

/**
 * 분석 시작 (비동기 + 자동 폴링)
 * @param {string} workId - 작업 ID
 * @param {string} sourceVideoPath - 분석할 영상 경로
 * @param {Function} onProgress - 진행 상태 콜백
 * @returns {Promise<Object>} 완료된 분석 결과
 */
export const startAnalyzeAndWait = async (workId, sourceVideoPath, onProgress = null) => {
  try {
    // 1. 분석 요청 (202 Accepted 응답, jobId 포함)
    const response = await client.post(`/works/${workId}/analyze`, {
      sourceVideoPath: sourceVideoPath,
    });

    const { jobId } = response.data.data;
    if (!jobId) {
      throw new Error('No jobId in analyze response');
    }

    // 2. Job이 완료될 때까지 폴링
    const result = await waitForJobCompletion(workId, jobId, 3600000, 2000, onProgress);
    console.log(result)
    return result;
  } catch (error) {
    console.error('[startAnalyzeAndWait] Error:', error);
    throw error;
  }
};

/**
 * 렌더링 시작 (비동기 + 자동 폴링)
 * @param {string} workId - 작업 ID
 * @param {Object} rect - 렌더링 영역 { x, y, width, height }
 * @param {Object} videoDim - 영상 치수 { width, height }
 * @param {int} voiceSpeed
 * @param {string} subtitleColor
 * @param {string} boxColor
 * @param {boolean} inverse
 * @param {string} bgmPreset
 * @param {Function} onProgress - 진행 상태 콜백
 * @returns {Promise<Object>} 완료된 렌더링 결과
 */
export const startRenderingAndWait = async (workId, rect, videoDim, voicePreset, voiceSpeed, subtitleColor, boxColor,  inverse, bgmPreset, onProgress = null) => {
  try {
    // 1. 렌더링 요청 (202 Accepted 응답, jobId 포함)
    const response = await client.post(`/works/${workId}/render`, { rect, videoDim, voicePreset, voiceSpeed, subtitleColor, boxColor, inverse ,bgmPreset}, { timeout: 300000 });

    const { jobId } = response.data.data;
    if (!jobId) {
      throw new Error('No jobId in render response');
    }

    // 2. Job이 완료될 때까지 폴링
    const result = await waitForJobCompletion(workId, jobId, 3600000, 2000, onProgress);
    return result;
  } catch (error) {
    console.error('[startRenderingAndWait] Error:', error);
    throw error;
  }
};
