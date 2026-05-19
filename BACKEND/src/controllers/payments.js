const response = require('../utils/response');
const Payment = require('../models/Payment');
const Plan = require('../models/Plan');

// 구독 요금제 조회
exports.getPlans = async (req, res, next) => {
  try {
    const plans = await Plan.formatForAPI();
    res.json(response.success({ items: plans }));
  } catch (error) {
    next(error);
  }
};

// 결제 요청 생성
exports.createPayment = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { gradeName } = req.body;

    const plan = await Plan.findByGradeName(gradeName);
    if (!plan) return res.status(400).json(response.error('Invalid plan', 400));

    const payment = await Payment.create(userId, gradeName, plan.price);

    res.status(201).json(response.success({
      paymentId: payment.paymentId,
      status: payment.status,
      gradeName: payment.gradeName,
      amount: parseFloat(plan.price),
      bankInfo: {
        accountNumber: process.env.BANK_ACCOUNT_NUMBER || '123-456-789',
        accountHolder: process.env.BANK_ACCOUNT_HOLDER || 'YourFactory Inc.',
      },
    }, 'Payment created'));
  } catch (error) {
    next(error);
  }
};

// 결제 상태 조회
exports.getPaymentStatus = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { userId } = req.user;

    const payment = await Payment.findById(paymentId);
    if (!payment || payment.userid !== userId && payment.userId !== userId) {
      return res.status(404).json(response.error('Payment not found', 404));
    }

    res.json(response.success({
      paymentId: payment.paymentid || payment.paymentId,
      status: payment.status,
      gradeName: payment.gradename || payment.gradeName,
      amount: parseFloat(payment.amount),
      creditsAdded: payment.creditsadded || payment.creditsAdded,
      createdAt: payment.createdat || payment.createdAt,
      approvedAt: payment.approvedat || payment.approvedAt,
    }));
  } catch (error) {
    next(error);
  }
};

// 관리자: 결제 승인
exports.approvePayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { adminKey } = req.body; // 프론트에서 전달받은 비밀번호

    // 고정된 관리자 비밀번호 대조 (예: 'admin1234')
    if (adminKey !== 'admin1234') {
      return res.status(403).json(response.error('관리자 비밀번호가 틀렸습니다.', 403));
    }

    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status !== 'Pending') {
      return res.status(400).json(response.error('이미 처리되었거나 존재하지 않는 내역입니다.', 400));
    }
    const result = await Payment.approve(paymentId);
    if (!result.success) return res.status(400).json(response.error(result.message, 400));

    const updated = await Payment.findById(paymentId);
    res.json(response.success({
      paymentId: updated.paymentid || updated.paymentId,
      status: updated.status,
      gradeName: updated.gradename || updated.gradeName,
      creditsAdded: updated.creditsadded || updated.creditsAdded,
      approvedAt: updated.approvedat || updated.approvedAt,
    }, 'Payment approved'));
  } catch (error) {
    next(error);
  }
};

exports.getAllPayments = async (req, res, next) => {
  try {
    // 직접 db.query를 쓰지 않고 모델의 findPending 또는 별도의 findAll(없다면 모델 추가 권장) 사용
    // 여기서는 모델에 있는 findPending(보류중인 것만)을 우선 사용하거나, 
    // 전체 목록이 필요하면 Payment 모델에 findAll을 추가하는 것이 정석입니다.
    
    // 임시로 보류 중인 결제 50건 조회 (모델 활용)
    const payments = await Payment.findPending(50, 0); 

    res.json(response.success({ items: payments }));
  } catch (error) {
    next(error);
  }
};