const db = require('../config/db');

class UserPermission {
  // 사용자 권한 조회
  static async findByUserId(userId) {
    const result = await db.query(
      'SELECT * FROM user_permissions WHERE userid = $1',
      [userId]
    );
    return result.rows[0];
  }

  // 권한 상태 확인 (렌더링 가능 여부)
  static async canRender(userId) {
    const result = await db.query(
      `SELECT * FROM can_render_work($1)`,
      [userId]
    );
    
    const row = result.rows[0];
    if (!row) {
      return { allowed: false, reason: '사용자 권한 정보를 찾을 수 없습니다.' };
    }
   
    return {
      allowed: row.allowed, // PostgreSQL의 boolean 't'는 true로 자동 변환됩니다.
      reason: row.reason,
    };
  }

  // 권한 업데이트 (결제 승인 시)
  static async update(userId, gradeName, startDate, endDate) {
    const result = await db.query(
      `UPDATE user_permissions
       SET status = 'Active', gradeName = $2, startDate = $3, endDate = $4
       WHERE userid = $1
       RETURNING *`,
      [userId, gradeName, startDate, endDate]
    );
    return result.rows[0];
  }

  // 권한 만료 처리 (크론 작업)
  static async expireExpiredPermissions() {
    const result = await db.query(
      `UPDATE user_permissions
       SET status = 'Expired', updatedAt = NOW()
       WHERE status = 'Active' AND endDate < CURRENT_DATE
       RETURNING userId`
    );
    return result.rows;
  }

  // 권한 조회 (상세)
  static async getDetails(userId) {
    const result = await db.query(
      `SELECT status, gradeName, startDate, endDate, remainingDays 
       FROM user_permissions 
       WHERE userid = $1`,
      [userId]
    );
    return result.rows[0] || {
      status: 'Pending',
      gradeName: null,
      startDate: null,
      endDate: null,
      remainingDays: 0,
    };
  }
}

module.exports = UserPermission;
