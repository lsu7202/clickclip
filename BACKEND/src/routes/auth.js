const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { validate, registerSchema, loginSchema } = require('../middleware/validation');
const authController = require('../controllers/auth');

// 회원가입
router.post('/register', validate(registerSchema), authController.register);

// 로그인
router.post('/login', validate(loginSchema), authController.login);

// 로그아웃
router.post('/logout', authController.logout);

// 세션 조회 (보호된 라우트)
router.get('/me', authMiddleware, authController.getSession);

module.exports = router;
