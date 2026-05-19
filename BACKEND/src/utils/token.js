const jwt = require('jsonwebtoken');

module.exports = {
  // JWT 토큰 생성
  generateToken(payload, expiresIn = process.env.JWT_EXPIRES_IN) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  },

  // JWT 토큰 검증
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  },

  // 쿠키에서 토큰 추출
  extractTokenFromCookie(cookies) {
    if (!cookies || !cookies.auth_token) {
      return null;
    }
    return cookies.auth_token;
  },
};
