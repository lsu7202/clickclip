const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const multer = require('multer'); // 추가
const upload = multer({ dest: 'temp/' }); // 임시 저장 폴더 설정
const { validate, createWorkSchema, updateWorkDraftSchema } = require('../middleware/validation');
const worksController = require('../controllers/works');

// 작업 목록 조회 (사용자별)
router.get('/', authMiddleware, worksController.listWorksByUser);

// 특정 작업 조회
router.get('/:workId', authMiddleware, worksController.getWorkById);

// 새 작업 생성
router.post('/', authMiddleware, validate(createWorkSchema), worksController.createWork);

// 작업 삭제
router.delete('/:workId', authMiddleware, worksController.deleteWork);

// 영상 분석 요청 (AI 서버 큐 등록)
router.post('/:workId/analyze', authMiddleware, worksController.analyze);

// 분석/렌더 작업 상태 조회
router.get('/:workId/jobs/:jobId', authMiddleware, worksController.getWorkJobStatus);

// 임시 저장 (Draft)
router.post('/:workId/draft', authMiddleware, validate(updateWorkDraftSchema), worksController.updateWorkDraft);

// 렌더링 시작 (AI 서버 큐 등록)
router.post('/:workId/render', authMiddleware, worksController.startWorkRender);

// 다운로드 URL 조회
router.get('/:workId/download', authMiddleware, worksController.getDownloadUrl);

router.post('/:workId/upload', authMiddleware, upload.single('video'), worksController.uploadWorkVideo);

module.exports = router;
