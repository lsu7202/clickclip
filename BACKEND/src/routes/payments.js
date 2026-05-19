const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const paymentsController = require('../controllers/payments');

// 구독 요금제 조회
router.get('/plans', paymentsController.getPlans);

// 결제 요청 생성
router.post('/', authMiddleware, paymentsController.createPayment);

// 결제 상태 조회
router.get('/:paymentId', authMiddleware, paymentsController.getPaymentStatus);

// 관리자: 결제 승인
router.post('/:paymentId/approve', authMiddleware, paymentsController.approvePayment);

router.get('/payment/list', authMiddleware, paymentsController.getAllPayments);

module.exports = router;
