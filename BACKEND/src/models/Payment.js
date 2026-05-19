const db = require('../config/db');
const crypto = require('crypto');

class Payment {
    // 결제 생성
    static async create(userId, gradeName, amount) {
        const paymentId = `pay_${crypto.randomBytes(10).toString('hex')}`;

        const result = await db.query(
            `INSERT INTO payments (paymentid, userid, gradename, amount, status)
       VALUES ($1, $2, $3, $4, 'Pending')
       RETURNING paymentId, userId, gradeName, amount, status, createdAt`,
            [paymentId, userId, gradeName, amount]
        );
        return result.rows[0];
    }

    // 결제 ID로 조회
    static async findById(paymentId) {
        const result = await db.query(
            'SELECT * FROM payments WHERE paymentId = $1',
            [paymentId]
        );
        return result.rows[0];
    }

    // 사용자의 결제 내역 조회
    static async findByUserId(userId, limit = 20, offset = 0) {
        const result = await db.query(
            `SELECT * FROM payments 
       WHERE userid = $1 
       ORDER BY createdAt DESC 
       LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
        return result.rows;
    }

    // 결제 승인
    static async approve(paymentId) {
        // AS result를 빼고, FROM 절을 사용하세요.
        const result = await db.query(
            `SELECT * FROM approve_payment($1)`,
            [paymentId]
        );

        const row = result.rows[0];

        // DB에서 행 자체가 반환되지 않았을 경우
        if (!row) {
            return { success: false, message: "결제 정보를 찾을 수 없습니다." };
        }

        // 이제 row.success와 row.message를 바로 쓸 수 있습니다.
        return {
            success: row.success,
            message: row.message,
        };
    }
    // 결제 실패 처리
    static async fail(paymentId, reason = null) {
        const result = await db.query(
            `UPDATE payments
       SET status = 'Failed'
       WHERE paymentId = $1
       RETURNING paymentId, status`,
            [paymentId]
        );
        return result.rows[0];
    }

    // 결제 상태 확인
    static async getStatus(paymentId) {
        const result = await db.query(
            'SELECT paymentId, status, gradeName, userId, createdAt, approvedAt FROM payments WHERE paymentId = $1',
            [paymentId]
        );
        return result.rows[0];
    }

    // 보류 중인 결제 조회 (관리자)
    static async findPending(limit = 50, offset = 0) {
        const result = await db.query(
            `SELECT * FROM payments 
       WHERE status = 'Pending' 
       ORDER BY createdAt ASC 
       LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows;
    }

    // 결제 내역 통계
    static async getStats(userId) {
        const result = await db.query(
            `SELECT 
        COUNT(*) as total_payments,
        COUNT(CASE WHEN status = 'Success' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_count,
        SUM(CASE WHEN status = 'Success' THEN amount ELSE 0 END) as total_spent
       FROM payments
       WHERE userid = $1`,
            [userId]
        );
        return result.rows[0];
    }
}

module.exports = Payment;
