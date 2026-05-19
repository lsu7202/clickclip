const db = require('../config/db');

class UserCredit {
  // 사용자 크레딧 조회
  static async findByUserId(userId) {
    const result = await db.query(
      'SELECT * FROM user_credits WHERE userid = $1',
      [userId]
    );
    return result.rows[0];
  }

  // 크레딧 추가 (결제 승인 시)
  static async addCredits(userId, amount) {
    const result = await db.query(
      `UPDATE user_credits
       SET remainingCredits = remainingCredits + $2,
           updatedAt = NOW()
       WHERE userid = $1
       RETURNING remainingCredits, totalUsedCredits`,
      [userId, amount]
    );
    return result.rows[0];
  }

  // 크레딧 차감
  static async consumeCredits(userId, amount) {
    const result = await db.query(
      `SELECT consume_credits($1, $2) as result`,
      [userId, amount]
    );

    const row = result.rows[0];
    return {
      success: row.result.success,
      remainingCredits: row.result.remainingCredits,
      message: row.result.message,
    };
  }

  // 크레딧 상세 조회
  static async getDetails(userId) {
    const result = await db.query(
      `SELECT remainingCredits, totalUsedCredits 
       FROM user_credits 
       WHERE userid = $1`,
      [userId]
    );
    return result.rows[0] || {
      remainingCredits: 0,
      totalUsedCredits: 0,
    };
  }

  // 렌더링 가능 여부 확인
  static async hasEnoughCredits(userId, requiredCredits) {
    const result = await db.query(
      'SELECT remainingcredits FROM user_credits WHERE userid = $1',
      [userId]
    );
    if (!result.rows[0]) return false;
    return result.rows[0].remainingcredits >= requiredCredits;
  }

  static async calculateFeatureCredits(featureKey) {
    try {
      const queryText = 'SELECT creditsperunit FROM credit_rules WHERE featurekey = $1';
      // 매개변수 [featureKey]를 반드시 전달해야 합니다.
      const result = await db.query(queryText, [featureKey]);

      // 데이터가 없는 경우 null 반환 (false보다 명확함)
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].creditsperunit;
    } catch (error) {
      // 로깅 및 에러 전파
      console.error('DB 조회 중 오류 발생:', error);
      throw new Error('크레딧 정보를 가져오는 데 실패했습니다.');
    }
  }
}

module.exports = UserCredit;
