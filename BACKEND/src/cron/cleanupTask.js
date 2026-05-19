const cron = require('node-cron');
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const cleanupOldWorks = async () => {
  console.log(`[${new Date().toLocaleString()}] 7일 경과 작업 및 파일 정리 시작...`);
  
  try {
    // 1. 7일 이상 지난 작업 중 파일 경로가 있는 데이터 조회 및 삭제
    // updatedAt이 현재로부터 7일 이전인 데이터를 삭제하고 정보를 반환받음
    const deleteQuery = `
      DELETE FROM works 
      WHERE updatedAt < CURRENT_DATE - INTERVAL '7 days'
      RETURNING outputVideoUrl, sourceVideoPath;
    `;
    
    const result = await db.query(deleteQuery);
    
    if (result.rowCount > 0) {
      console.log(`${result.rowCount}개의 작업 레코드가 삭제되었습니다. 파일 제거를 시작합니다.`);
      
      result.rows.forEach(row => {
        // 제거해야 할 파일 경로 리스트 (결과 영상 및 소스 영상)
        const filesToDelete = [row.outputvideourl, row.sourcevideopath];
        
        filesToDelete.forEach(filePath => {
          if (filePath) {
            // DB의 경로가 절대 경로(/app/media/...)일 경우 그대로 사용
            // 만약 상대 경로라면 path.join 등으로 가공 필요
            if (fs.existsSync(filePath)) {
              try {
                fs.unlinkSync(filePath);
                console.log(`파일 삭제 완료: ${filePath}`);
              } catch (err) {
                console.error(`파일 삭제 실패 (${filePath}):`, err.message);
              }
            }
          }
        });
      });
    } else {
      console.log('정리할 오래된 작업이 없습니다.');
    }
  } catch (err) {
    console.error('작업 정리 스케줄러 오류:', err);
  }
};

// 매일 새벽 3시에 실행 (사용자 접속이 적은 시간)
cron.schedule('0 3 * * *', cleanupOldWorks, {
  scheduled: true,
  timezone: "Asia/Seoul"
});

module.exports = { cleanupOldWorks };