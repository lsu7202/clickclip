const db = require('../config/db');

class Work {
    // 작업 생성
    static async create(userId, title, originalScript) {
        const workId = `w_${Date.now()}`;

        const result = await db.query(
            `INSERT INTO works (workid, userid, title, originalscript, status)
       VALUES ($1, $2, $3, $4, 'NEW')
       RETURNING workid, userid, title, status, originalscript, createdat, updatedat`,
            [workId, userId, title, originalScript]
        );

        return result.rows[0];
    }

    // 작업 ID로 조회
    static async findById(workId, userId = null) {
        let query = 'SELECT * FROM works WHERE workid = $1';
        const params = [workId];

        if (userId) {
            query += ' AND userid = $2';
            params.push(userId);
        }

        const result = await db.query(query, params);
        return result.rows[0];
    }

    // 사용자의 작업 목록 조회
    // Work.js 수정안
    static async findByUserId(userId, limit = 50, offset = 0, status = null) {
        // 1. 기본 쿼리와 필수 파라미터 설정
        let query = 'SELECT * FROM works WHERE "userid" = $1';
        const params = [userId];

        // 2. 상태 필터가 있을 경우 동적 추가
        if (status) {
            params.push(status);
            query += ` AND status = $${params.length}`; // $2가 됨
        }

        // 3. 정렬 추가
        query += ' ORDER BY "updatedat" DESC';

        // 4. LIMIT 추가
        params.push(limit);
        query += ` LIMIT $${params.length}`; // $2 또는 $3이 됨

        // 5. OFFSET 추가
        params.push(offset);
        query += ` OFFSET $${params.length}`; // $3 또는 $4가 됨

        const result = await db.query(query, params);
        return result.rows;
    }

    // 작업 상태별 카운트
    static async countByStatus(userId) {
        const result = await db.query(
            `SELECT status, COUNT(*) as count
       FROM works
       WHERE userid = $1
       GROUP BY status`,
            [userId]
        );

        const counts = {};
        result.rows.forEach(row => {
            counts[row.status] = parseInt(row.count);
        });
        return counts;
    }

    static async updateStatus(workId, userId, status) {
        const result = await db.query(
            `
        UPDATE works
        SET status = $3,
            updatedat = NOW()
        WHERE workid = $1 AND userid = $2
        RETURNING *
        `,
            [workId, userId, status]
        );

        // 업데이트된 행이 없을 경우 처리
        if (result.rowCount === 0) {
            return null;
        }

        // 업데이트된 작업 객체 반환
        return result.rows[0];
    }

    // 임시 저장 (Draft 업데이트)
    static async updateDraft(workId, userId, updates) {
        const { title, editedScript, voicePreset, sourceVideoPath, originalScript, durationSec } = updates;
        
        if (typeof editedScript === 'string') {
           
        try {
            editedScript = JSON.parse(editedScript);
            
        } catch (e) {
            console.error("JSON 파싱 에러:", e);
            // 파싱 실패 시 원본 그대로 두거나 에러 처리
        }
    }

        const result = await db.query(
            `UPDATE works
         SET title = COALESCE($3, title),
             editedscript = COALESCE($4::jsonb, editedscript),
             voicepreset = COALESCE($5, voicepreset),
             sourcevideopath = COALESCE($6, sourcevideopath),
             originalscript = COALESCE($7, originalscript), -- 1. 쉼표 추가 및 변수명 소문자 통일
             durationsec = COALESCE($8, durationsec),
             status = 'IN_PROGRESS',
             version = version + 1,
             updatedat = NOW()
         WHERE workid = $1 AND userid = $2
         RETURNING *`,
            [workId, userId, title, JSON.stringify(editedScript), voicePreset, sourceVideoPath, originalScript, durationSec]
        );

        return result.rows[0];
    }

    // 렌더링 시작
    static async startRendering(workId, userId) {
        const result = await db.query(
            `UPDATE works
       SET status = 'RENDERING', updatedat = NOW()
       WHERE workid = $1 AND userid = $2
       RETURNING *`,
            [workId, userId]
        );
        return result.rows[0];
    }

    // 렌더링 완료
    static async completeRendering(workId, outputVideoUrl, downloadUrl=null, durationSec = null) {
        const result = await db.query(
            `UPDATE works
       SET status = 'DONE',
           outputvideourl = $2,
           downloadurl = $3,
           durationsec = COALESCE($4, durationsec),
           updatedat = NOW()
       WHERE workid = $1
       RETURNING *`,
            [workId, outputVideoUrl, downloadUrl, durationSec]
        );
        return result.rows[0];
    }

    // 렌더링 실패
    static async failRendering(workId) {
        const result = await db.query(
            `UPDATE works
       SET status = 'FAILED', updatedat = NOW()
       WHERE workid = $1
       RETURNING *`,
            [workId]
        );
        return result.rows[0];
    }

    // 다운로드 URL 조회
    static async getDownloadUrl(workId, userId) {
        const result = await db.query(
            `SELECT downloadurl, outputvideourl, status FROM works 
       WHERE workid = $1 AND userid = $2 AND status = 'DONE'`,
            [workId, userId]
        );
        return result.rows[0]?.downloadurl || result.rows[0]?.outputvideourl || null;
    }

    // 작업 삭제
    static async delete(workId, userId) {
        await db.query(
            'DELETE FROM works WHERE workid = $1 AND userid = $2',
            [workId, userId]
        );
    }

    // 작업 세부 정보 (API 응답용)
    static async formatForAPI(work) {
        if (!work) return null;

        return {
            workId: work.workid,
            userId: work.userid,
            title: work.title,
            status: work.status,
            originalScript: work.originalscript,
            editedScript: work.editedscript,
            voicePreset: work.voicepreset,
            sourceVideoPath: work.sourcevideopath,
            durationSec: work.durationsec,
            renderResult: work.status === 'DONE' ? {
                outputVideoUrl: work.outputvideourl,
                downloadUrl: work.downloadurl,
            } : null,
            version: work.version,
            canDownload: work.status === 'DONE' && !!work.downloadurl,
            createdAt: work.createdat,
            updatedAt: work.updatedat,
        };
    }

}

module.exports = Work;
