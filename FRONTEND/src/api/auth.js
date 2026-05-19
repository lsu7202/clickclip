import client from './client';

/**
 * 회원가입
 * @param {Object} credentials - 회원가입 정보
 * @param {string} credentials.email - 이메일
 * @param {string} credentials.password - 비밀번호
 * @param {string} credentials.name - 사용자명
 * @param {string} [credentials.phone] - 휴대폰번호
 * @param {string} [credentials.birthDate] - 생년월일 (YYYYMMDD)
 * @returns {Promise<Object>} 회원가입 응답
 */
export const register = async (credentials) => {
  try {
    const { data } = await client.post('/auth/register', credentials);
    // 토큰 저장
    if (data.data?.token) {
      localStorage.setItem('authToken', data.data.token);
    }
    return data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * 로그인
 * @param {Object} credentials - 로그인 정보
 * @param {string} credentials.email - 이메일
 * @param {string} credentials.password - 비밀번호
 * @returns {Promise<Object>} 로그인 응답 및 사용자 정보
 */
export const login = async (credentials) => {
  try {
    const { data } = await client.post('/auth/login', credentials);
    // 토큰 저장
    if (data.data?.token) {
      localStorage.setItem('authToken', data.data.token);
    }
    return data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * 로그아웃
 * @returns {Promise<Object>} 로그아웃 응답
 */
export const logout = async () => {
  try {
    const { data } = await client.post('/auth/logout');
    // 토큰 삭제
    localStorage.removeItem('authToken');
    return data;
  } catch (error) {
    // 로그아웃 실패해도 토큰은 삭제
    localStorage.removeItem('authToken');
    throw error.response?.data || error;
  }
};

/**
 * 현재 세션 조회 (사용자 정보 + 권한 + 크레딧)
 * @returns {Promise<Object>} 세션 정보
 */
export const getSession = async () => {
  try {
    const { data } = await client.get('/auth/me');
    return data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * 로컬스토리지에서 저장된 토큰 조회
 * @returns {string|null} 토큰 또는 null
 */
export const getToken = () => {
  return localStorage.getItem('authToken');
};

/**
 * 로컬스토리지에서 토큰 제거
 */
export const clearToken = () => {
  localStorage.removeItem('authToken');
};

/**
 * 토큰 존재 여부 확인
 * @returns {boolean} 토큰 존재 여부
 */
export const isAuthenticated = () => {
  return !!getToken();
};
