const jwt = require('jsonwebtoken');

// 요청에서 JWT 토큰 추출 및 검증
module.exports = (req, res, next) => {
  try {
    // 1. Authorization 헤더 또는 쿠키에서 토큰 추출
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    } else if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'No authentication token provided',
      });
    }

    // 2. 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token',
      error: error.message,
    });
  }
};
