const db = require('../config/db');
const crypto = require('crypto');

class User {
  // 사용자 생성 (회원가입)
  static async create(email, passwordHash, name, phone, birthDate) {
    const userId = `u_${crypto.randomBytes(10).toString('hex')}`;
    const result = await db.query(
      `INSERT INTO users (userId, email, passwordHash, name, phone, birthDate)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING userId, email, passwordHash, name, phone, birthDate, createdAt`,
      [userId, email, passwordHash, name, phone, birthDate]
    );
    return result.rows[0];
  }

  // 이메일로 조회
  static async findByEmail(email) {
    const result = await db.query(
      'SELECT userId, email, passwordHash, name, phone, birthDate, createdAt, updatedAt FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  // userId로 조회
  static async findById(userId) {
    const result = await db.query(
      'SELECT userId, email, name, phone, birthDate, createdAt, updatedAt FROM users WHERE userId = $1',
      [userId]
    );
    return result.rows[0];
  }

  // 휴대폰 중복 확인
  static async findByPhone(phone) {
    const result = await db.query(
      'SELECT userId FROM users WHERE phone = $1',
      [phone]
    );
    return result.rows[0];
  }

  // 사용자 정보 업데이트
  static async update(userId, updates) {
    const { name, phone, birthDate } = updates;
    const result = await db.query(
      `UPDATE users 
       SET name = COALESCE($2, name),
           phone = COALESCE($3, phone),
           birthDate = COALESCE($4, birthDate),
           updatedAt = NOW()
       WHERE userId = $1
       RETURNING userId, email, name, phone, birthDate`,
      [userId, name, phone, birthDate]
    );
    return result.rows[0];
  }

  // 비밀번호 업데이트
  static async updatePassword(userId, newPasswordHash) {
    await db.query(
      'UPDATE users SET passwordHash = $2, updatedAt = NOW() WHERE userId = $1',
      [userId, newPasswordHash]
    );
  }

  // 사용자 삭제 (및 연관 데이터 자동 삭제)
  static async delete(userId) {
    await db.query('DELETE FROM users WHERE userId = $1', [userId]);
  }

  // 세션 데이터 조회 (권한 + 크레딧 포함)
  static async getSession(userId) {
    const result = await db.query(
      `SELECT 
        u.userId, u.email, u.name, u.phone, u.birthDate,
        up.status as permissionStatus, up.gradeName, up.startDate, up.endDate, up.remainingDays,
        uc.remainingCredits, uc.totalUsedCredits
       FROM users u
       LEFT JOIN user_permissions up ON u.userId = up.userId
       LEFT JOIN user_credits uc ON u.userId = uc.userId
       WHERE u.userId = $1`,
      [userId]
    );
    return result.rows[0];
  }
}

module.exports = User;
