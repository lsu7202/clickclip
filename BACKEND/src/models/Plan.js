const db = require('../config/db');

class Plan {
    // 모든 요금제 조회
    static async findAll() {
        const result = await db.query(
            'SELECT * FROM plans ORDER BY credits DESC'
        );
        return result.rows;
    }

    // 특정 요금제 조회
    static async findByGradeName(gradeName) {
        const result = await db.query(
            'SELECT * FROM plans WHERE gradename = $1',
            [gradeName]
        );
        return result.rows[0];
    }

    // 요금제 생성 (관리자)
    static async create(gradeName, displayName, price, credits, durationDays) {
        const result = await db.query(
            `INSERT INTO plans (gradeName, displayName, price, credits, durationDays)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [gradeName, displayName, price, credits, durationDays]
        );
        return result.rows[0];
    }

    // 요금제 업데이트 (관리자)
    static async update(gradeName, updates) {
        const { displayName, price, credits, durationDays } = updates;
        const result = await db.query(
            `UPDATE plans
       SET displayName = COALESCE($2, displayName),
           price = COALESCE($3, price),
           credits = COALESCE($4, credits),
           durationDays = COALESCE($5, durationDays)
       WHERE gradename = $1
       RETURNING *`,
            [gradeName, displayName, price, credits, durationDays]
        );
        return result.rows[0];
    }

    // 요금제 삭제 (관리자)
    static async delete(gradeName) {
        await db.query('DELETE FROM plans WHERE gradename = $1', [gradeName]);
    }

    // 요금제 세부 정보 (API 응답용)
    static async formatForAPI() {
        const plans = await this.findAll();
        return plans.map(plan => {
            // DB의 모든 키를 소문자로 가정하고 안전하게 매핑
            return {
                gradeName: plan.gradename || plan.gradeName || "",
                displayName: plan.displayname || plan.displayName || "이름 없음",
                price: parseFloat(plan.price || 0),
                credits: plan.credits || 0,
                durationDays: plan.durationdays || plan.durationDays || 0,
            };
        });
    }
}

module.exports = Plan;
