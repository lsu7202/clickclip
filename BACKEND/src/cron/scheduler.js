const cron = require('node-cron');
const db = require('../config/db');

/**
 * 자정 및 서버 시작 시 실행: 
 * remainingDays만 업데이트하면 트리거가 알아서 status를 변경함
 */
const syncSubscriptionData = async () => {
  console.log(`[${new Date().toISOString()}] 구독 남은 기간 동기화 시작...`);
  try {
    // 트리거(BEFORE UPDATE)를 발동시키기 위해 remainingDays를 현재 날짜 기준으로 계산하여 업데이트
    const query = `
      UPDATE user_permissions 
      SET 
        remainingDays = GREATEST(0, endDate - CURRENT_DATE),
        updatedAt = NOW()
      WHERE endDate IS NOT NULL; -- endDate가 있는 모든 유저 대상
    `;
    
    const result = await db.query(query);
    console.log(`동기화 완료: ${result.rowCount}건의 데이터가 최신 날짜로 갱신되었습니다.`);
  } catch (err) {
    console.error('구독 동기화 중 오류 발생:', err);
  }
};

cron.schedule('0 0 * * *', syncSubscriptionData, {
  scheduled: true,
  timezone: "Asia/Seoul"
});

module.exports = { syncSubscriptionData };