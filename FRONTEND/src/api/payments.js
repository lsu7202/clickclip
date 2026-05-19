import client from './client';

/**
 * 구독 요금제 조회
 * @returns {Promise<Object>} 요금제 목록
 */
export const getPlans = async () => {
  try {
    const { data } = await client.get('/payments/plans');
    return data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * 결제 요청 생성
 * @param {Object} payment - 결제 정보
 * @param {string} payment.gradeName - 요금제명 (Basic, Pro, Premium)
 * @returns {Promise<Object>} 결제 생성 응답
 */
export const createPayment = async (payment) => {
  try {
    const { data } = await client.post('/payments', payment);
    
    return data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * 결제 상태 조회
 * @param {string} paymentId - 결제 ID
 * @returns {Promise<Object>} 결제 정보
 */
export const getPayment = async (paymentId) => {
  try {
    const { data } = await client.get(`/payments/${paymentId}`);
    return data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * 관리자: 전체 결제 요청 목록 조회
 * @returns {Promise<Object>} 모든 사용자의 결제 내역 리스트 (items)
 */
export const getAllPayments = async () => {
  try {
    const { data } = await client.get('/payments/payment/list');
    return data;
    console.log(data)
  } catch (error) {
    throw error.response?.data || error;
  }
};


export const approvePayment = async (paymentId, adminKey) => {
  try {
    // 1. 자기 자신이 아니라, axios 인스턴스(client)를 호출해야 합니다.
    // 2. 변수명도 id가 아니라 paymentId로 맞춰야 합니다.
    const { data } = await client.post(`/payments/${paymentId}/approve`, { adminKey });
    
    return data;
  } catch (err) {
    // 서버에서 보낸 에러 메시지 추출
    const errorMessage = err.response?.data?.message || "알 수 없는 오류";
    console.error("상세 에러 내용:", err.response?.data || err); 
    
    alert(`승인 실패: ${errorMessage}`);
    throw err.response?.data || err;
  }
};
