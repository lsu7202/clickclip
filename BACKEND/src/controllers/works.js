const response = require('../utils/response');
const Work = require('../models/Work');
const UserPermission = require('../models/UserPermission');
const UserCredit = require('../models/UserCredit');
const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const { probeVideoDuration } = require('../utils/media');
const {
    enqueueAnalyzeJob,
    enqueueRenderJob,
    getJobStatus,
} = require('../services/aiQueue');

// 작업 목록 조회 (사용자별)
exports.listWorksByUser = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { status, limit = 50, offset = 0 } = req.query;

        // 작업 목록 조회
        const works = await Work.findByUserId(userId, parseInt(limit), parseInt(offset), status);

        // 각 작업을 API 형식으로 변환
        const items = await Promise.all(works.map(work => Work.formatForAPI(work)));

        res.json(response.success({ items }));
    } catch (error) {
        next(error);
    }
};

// 특정 작업 조회
exports.getWorkById = async (req, res, next) => {
    try {
        const { workId } = req.params;
        const { userId } = req.user;

        console.log('[works.get] request received', { workId, userId });

        const work = await Work.findById(workId, userId);
        if (!work) {
            console.log('[works.get] work not found', { workId, userId });
            return res.status(404).json(response.error('Work not found', 404));
        }

        const formatted = await Work.formatForAPI(work);
        console.log('[works.get] resolved', { workId, userId, status: formatted?.status });

        res.json(response.success(formatted));
    } catch (error) {
        console.error('[works.get] failed', {
            workId: req.params.workId,
            userId: req.user?.userId,
            error: error.message,
            stack: error.stack,
        });
        next(error);
    }
};

// 새 작업 생성
exports.createWork = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { title, originalScript } = req.validated;

        console.log('[works.create] request received', {
            userId,
            title,
            originalScriptLength: originalScript?.length,
        });

        const work = await Work.create(userId, title, originalScript);
        const formatted = await Work.formatForAPI(work);

        console.log('[works.create] created', {
            userId,
            workId: formatted?.workId,
            status: formatted?.status,
        });

        res.status(201).json(response.success(formatted, 'Work created successfully'));
    } catch (error) {
        console.error('[works.create] failed', {
            userId: req.user?.userId,
            error: error.message,
            stack: error.stack,
        });
        next(error);
    }
};

exports.analyze = async (req, res, next) => {
    try {
        const { workId } = req.params;
        const { userId } = req.user;
        const { sourceVideoPath } = req.body;

        console.log('[works.analyze] request received', { workId, userId, sourceVideoPath });

        const work = await Work.findById(workId, userId);
        if (!work) {
            console.log('[works.analyze] work not found', { workId, userId });
            return res.status(404).json(response.error('Work not found', 404));
        }

        const canRender = await UserPermission.canRender(userId);
        console.log('[works.analyze] permission result', { workId, userId, canRender });

        if (!canRender.allowed) {
            return res.status(403).json(response.error(canRender.reason, 403));
        }

        let estimatedCredits;
        try {
            estimatedCredits = await UserCredit.calculateFeatureCredits('analyze', work.durationSec || 60);
        } catch (creditError) {
            console.error('[works.analyze] credit calculation failed, fallback to duration rule', {
                workId,
                userId,
                error: creditError.message,
            });
            estimatedCredits = Math.max(1, Math.ceil((work.durationSec || 60) / 60));
        }

        const hasCredits = await UserCredit.hasEnoughCredits(userId, estimatedCredits);
        console.log('[works.analyze] credit check', { workId, userId, estimatedCredits, hasCredits });

        if (!hasCredits) {
            return res.status(402).json(response.error('Insufficient credits', 402));
        }

        
        console.log('[works.analyze] work status updated to IN_PROGRESS', { workId, userId });

        const aiJob = await enqueueAnalyzeJob(workId, sourceVideoPath);
        console.log('[works.analyze] job enqueued', { workId, userId, aiJob });

        return res.status(202).json(response.success({
            workId,
            jobId: aiJob.jobId,
            status: aiJob.status,
            jobType: aiJob.jobType,
            estimatedCredits,
        }, '영상 분석 작업이 큐에 등록되었습니다.'));
    } catch (error) {
        console.error('[works.analyze] failed', {
            workId: req.params.workId,
            userId: req.user?.userId,
            error: error.message,
            stack: error.stack,
        });
        next(error);
    }
};

// 임시 저장 (Draft)
exports.updateWorkDraft = async (req, res, next) => {
    try {
        const { workId } = req.params;
        const { userId } = req.user;
        const updates = req.validated;

        console.log('[works.draft] request received', {
            workId,
            userId,
            updateKeys: Object.keys(updates || {}),
        });

        const work = await Work.updateDraft(workId, userId, updates);

        if (!work) {
            console.log('[works.draft] work not found', { workId, userId });
            return res.status(404).json(response.error('Work not found', 404));
        }

        const formatted = await Work.formatForAPI(work);
        console.log('[works.draft] saved', { workId, userId, status: formatted?.status, durationSec: formatted?.durationSec });

        res.json(response.success(formatted, 'Work draft saved'));
    } catch (error) {
        console.error('[works.draft] failed', {
            workId: req.params.workId,
            userId: req.user?.userId,
            error: error.message,
            stack: error.stack,
        });
        next(error);
    }
};

// 렌더링 시작
exports.startWorkRender = async (req, res, next) => {
    try {
        const { workId } = req.params;
        const { rect } = req.body;
        const { videoDim } = req.body;
        const { userId } = req.user;
        const { voicePreset } = req.body;

        console.log('[works.render] request received', {
            workId,
            userId,
            hasRect: !!rect,
            hasVideoDim: !!videoDim,
            rect,
            videoDim,
            voicePreset,
        });

        if (!rect) {
            return res.status(400).json(response.error('Rect Undefined', 400));
        }
        if (!videoDim) {
            return res.status(400).json(response.error('VideoDim Undefined', 400));
        }

        if (!voicePreset) {
            return res.status(400).json(response.error('VoicePreset Undefined', 400));
        }

        const work = await Work.findById(workId, userId);
        if (!work) {
            console.log('[works.render] work not found', { workId, userId });
            return res.status(404).json(response.error('Work not found', 404));
        }

        const canRender = await UserPermission.canRender(userId);
        console.log('[works.render] permission result', { workId, userId, canRender });

        if (!canRender.allowed) {
            return res.status(403).json(response.error(canRender.reason, 403));
        }

        let estimatedCredits;
        try {
            estimatedCredits = await UserCredit.calculateFeatureCredits('render', work.durationSec || 60);
        } catch (creditError) {
            console.error('[works.render] credit calculation failed, fallback to duration rule', {
                workId,
                userId,
                error: creditError.message,
            });
            estimatedCredits = Math.max(1, Math.ceil((work.durationSec || 60) / 60));
        }

        const hasCredits = await UserCredit.hasEnoughCredits(userId, estimatedCredits);
        console.log('[works.render] credit check', { workId, userId, estimatedCredits, hasCredits });

        if (!hasCredits) {
            return res.status(402).json(response.error('Insufficient credits', 402));
        }

        const updated = await Work.startRendering(workId, userId);
        const formatted = await Work.formatForAPI(updated);
        console.log('[works.render] work status updated to RENDERING', { workId, userId, status: updated?.status });

        const subtitle_data = {
            sourceVideoPath: formatted.sourceVideoPath,
            voicePreset: voicePreset,
            metadata: {
                width: Math.round(videoDim.width),
                height: Math.round(videoDim.height)
            },
            globalSubtitleLayout: {
                y: Math.round(rect.y),
                height: Math.round(rect.height)
            },
            editedScript: formatted.editedScript
        };


        const aiJob = await enqueueRenderJob(workId, subtitle_data);
        console.log('[works.render] job enqueued', { workId, userId, aiJob });

        res.status(202).json(response.success({
            workId,
            jobId: aiJob.jobId,
            status: aiJob.status,
            jobType: aiJob.jobType,
            estimatedCredits,
        }, '렌더링 작업이 큐에 등록되었습니다.'));
    } catch (error) {
        console.error('[works.render] failed', {
            workId: req.params.workId,
            userId: req.user?.userId,
            error: error.message,
            stack: error.stack,
        });
        try { await Work.failRendering(req.params.workId, req.user.userId); } catch (e) { }
        next(error);
    }
};

// 다운로드 URL 조회
exports.getDownloadUrl = async (req, res, next) => {
    try {
        const { workId } = req.params;
        const { userId } = req.user;

        console.log('[works.download] request received', { workId, userId });

        const downloadUrl = await Work.getDownloadUrl(workId, userId);
        if (!downloadUrl) {
            console.log('[works.download] not available', { workId, userId });
            return res.status(404).json(response.error('Download not available', 404));
        }

        console.log('[works.download] resolved', { workId, userId, downloadUrl });
        res.json(response.success({ downloadUrl }));
    } catch (error) {
        console.error('[works.download] failed', {
            workId: req.params.workId,
            userId: req.user?.userId,
            error: error.message,
            stack: error.stack,
        });
        next(error);
    }
};

exports.getWorkJobStatus = async (req, res, next) => {
    try {
        const { workId, jobId } = req.params;
        const { userId } = req.user;

        console.log('[works.jobStatus] request received', { workId, jobId, userId });

        const work = await Work.findById(workId, userId);
        if (!work) {
            console.log('[works.jobStatus] work not found', { workId, userId });
            return res.status(404).json(response.error('Work not found', 404));
        }

        const job = await getJobStatus(jobId);
        console.log('[works.jobStatus] ai status fetched', { workId, jobId, status: job?.status, jobType: job?.jobType, progress: job?.progress });

        if (job?.status === 'SUCCEEDED') {
            if (job.jobType === 'analyze' && job.result) {
                console.log('[works.jobStatus] applying analyze result to work', {
                    workId,
                    jobId,
                    originalScriptLength: job.result.originalScript?.length,
                    editedScriptCount: job.result.editedScript?.length,
                });

                const updatedWork = await Work.updateDraft(workId, userId, {
                    originalScript: job.result.originalScript,
                    editedScript: job.result.editedScript,
                    sourceVideoPath: work.sourcevideopath || work.sourceVideoPath,
                });

                // 분석(analyze) 완료 시에도 크레딧을 계산하여 차감합니다.
                try {
                    const durationForCredits = job.result.durationSec || updatedWork.durationsec || updatedWork.durationSec || work.durationsec || 0;
                    let creditsToConsume = null;
                    try {
                        const r = await db.query('SELECT calculate_feature_credits($1, $2) AS credits', ['analyze', durationForCredits]);
                        creditsToConsume = r.rows[0]?.credits || Math.max(1, Math.ceil((durationForCredits || 60) / 60));
                    } catch (e) {
                        console.error('[works.jobStatus] calculate_feature_credits failed for analyze', e.message);
                        creditsToConsume = Math.max(1, Math.ceil((durationForCredits || 60) / 60));
                    }

                    const consumeRes = await UserCredit.consumeCredits(userId, creditsToConsume);
                    console.log('[works.jobStatus] consumeCredits result (analyze)', { workId, userId, creditsToConsume, consumeRes });
                } catch (consumeError) {
                    console.error('[works.jobStatus] credit consumption failed (analyze)', { workId, userId, error: consumeError.message });
                }

                const formatted = await Work.formatForAPI(updatedWork);
                return res.json(response.success({
                    job,
                    work: formatted,
                }, 'Analyze job completed'));
            }

            if (job.jobType === 'render' && job.result) {
                console.log('[works.jobStatus] applying render result to work', {
                    workId,
                    jobId,
                    outputVideoUrl: job.result.outputVideoUrl,
                });

                const downloadUrl = job.result.downloadUrl || job.result.outputVideoUrl || null;

                const finalWork = await Work.completeRendering(
                    workId,
                    job.result.outputVideoUrl,
                    downloadUrl,
                    job.result.durationSec || work.durationsec || work.durationSec || null
                );

                // 백엔드에서 명시적으로 크레딧을 계산하고 차감합니다.
                try {
                    const durationForCredits = job.result.durationSec || finalWork.durationsec || finalWork.durationSec || 0;
                    let creditsToConsume = null;
                    try {
                        const r = await db.query('SELECT calculate_feature_credits($1, $2) AS credits', ['render', durationForCredits]);
                        creditsToConsume = r.rows[0]?.credits || Math.max(1, Math.ceil((durationForCredits || 60) / 60));
                    } catch (e) {
                        console.error('[works.jobStatus] calculate_feature_credits failed', e.message);
                        creditsToConsume = Math.max(1, Math.ceil((durationForCredits || 60) / 60));
                    }

                    const consumeRes = await UserCredit.consumeCredits(userId, creditsToConsume);
                    console.log('[works.jobStatus] consumeCredits result', { workId, userId, creditsToConsume, consumeRes });
                } catch (consumeError) {
                    console.error('[works.jobStatus] credit consumption failed', { workId, userId, error: consumeError.message });
                }

                const formatted = await Work.formatForAPI(finalWork);
                return res.json(response.success({
                    job,
                    work: formatted,
                }, 'Render job completed'));
            }
        }

        return res.json(response.success({ job, work: await Work.formatForAPI(work) }, 'Job status fetched'));
    } catch (error) {
        console.error('[works.jobStatus] failed', {
            workId: req.params.workId,
            jobId: req.params.jobId,
            userId: req.user?.userId,
            error: error.message,
            stack: error.stack,
        });
        next(error);
    }
};

exports.deleteWork = async (req, res, next) => {
    try {
        const { workId } = req.params;
        const { userId } = req.user;

        const work = await Work.findById(workId, userId);
        if (!work) {
            return res.status(404).json(response.error('Work not found', 404));
        }

        await Work.delete(workId, userId);
        return res.json(response.success({ workId }, 'Work deleted successfully'));
    } catch (error) {
        console.error('[works.delete] failed', {
            workId: req.params.workId,
            userId: req.user?.userId,
            error: error.message,
            stack: error.stack,
        });
        next(error);
    }
};

exports.uploadWorkVideo = async (req, res, next) => {
    try {
        const { workId } = req.params;
        const { userId } = req.user;

        if (!req.file) {
            return res.status(400).json({ success: false, error: '파일 없음' });
        }

        // 1. 저장할 경로 설정
        const ext = path.extname(req.file.originalname);
        const fileName = `source_${workId}_${Date.now()}${ext}`;
        const targetPath = path.join('/app/media', fileName);

        // 2. EXDEV 에러 방지를 위해 복사 후 삭제 방식으로 변경
        try {
            // 파일을 대상 경로로 복사
            fs.copyFileSync(req.file.path, targetPath);
            // 임시 폴더의 원본 파일 삭제
            fs.unlinkSync(req.file.path);
        } catch (copyError) {
            console.error('File move error:', copyError);
            return res.status(500).json({ success: false, error: '파일 이동 실패' });
        }

        let durationSec = null;
        try {
            durationSec = Math.ceil(await probeVideoDuration(targetPath));
        } catch (durationError) {
            console.error('Duration probe failed:', durationError.message);
        }

        // 3. DB 업데이트 (기존 로직 동일)
        const updated = await Work.updateDraft(workId, userId, {
            sourceVideoPath: targetPath,
            durationSec,
        });

        res.json({ success: true, data: { sourceVideoPath: targetPath, durationSec } });
    } catch (error) {
        next(error);
    }
};