const bcrypt = require('bcrypt');
const response = require('../utils/response');
const tokenUtil = require('../utils/token');
const User = require('../models/User');

// 회원가입
exports.register = async (req, res, next) => {
  try {
    const { email, password, name, phone, birthDate } = req.validated;

    // 이메일 중복 확인
    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json(response.error('이미 존재한는 이메일입니다.', 409));

    // 휴대폰 중복 확인
    if (phone) {
      const phoneExists = await User.findByPhone(phone);
      if (phoneExists) return res.status(409).json(response.error('이미 존재하는 전화번호입니다.', 409));
    }

    // 비밀번호 해시
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
    const passwordHash = await bcrypt.hash(password, rounds);

    // 사용자 생성 (트리거로 permission/credits 생성)
    const user = await User.create(email, passwordHash, name, phone, birthDate);

    // 토큰 생성
    const token = tokenUtil.generateToken({ userId: user.userId, email: user.email });

    res.status(201).json(response.success({ userId: user.userId, email: user.email, name: user.name, token }, 'User registered successfully'));
  } catch (error) {
    next(error);
  }
};

// 로그인
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.validated;

    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json(response.error('Invalid email or password', 401));

    const valid = await bcrypt.compare(password, user.passwordHash || user.passwordhash);
    if (!valid) return res.status(401).json(response.error('Invalid email or password', 401));

    const token = tokenUtil.generateToken({ userId: user.userId || user.userid, email: user.email });

    const session = await User.getSession(user.userId || user.userid);

    res.json(response.success({
      userId: session.userId || session.userid,
      email: session.email,
      name: session.name,
      token,
      permission: {
        status: session.permissionstatus || session.permissionStatus,
        gradeName: session.gradename || session.gradeName,
        startDate: session.startdate || session.startDate,
        endDate: session.enddate || session.endDate,
        remainingDays: session.remainingdays || session.remainingDays,
      },
      credits: {
        remainingCredits: session.remainingcredits || session.remainingCredits,
        totalUsedCredits: session.totalusedcredits || session.totalUsedCredits,
      },
    }, 'Logged in successfully'));
  } catch (error) {
    next(error);
  }
};

// 로그아웃
exports.logout = (req, res) => {
  // 클라이언트에서 토큰을 버리면 충분
  res.json(response.success(null, 'Logged out successfully'));
};

// 세션 조회
exports.getSession = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const session = await User.getSession(userId);
    if (!session) return res.status(404).json(response.error('User not found', 404));

    res.json(response.success({
      userId: session.userid || session.userId,
      email: session.email,
      name: session.name,
      phone: session.phone,
      birthDate: session.birthdate || session.birthDate,
      permission: {
        status: session.permissionstatus || session.permissionStatus,
        gradeName: session.gradename || session.gradeName,
        startDate: session.startdate || session.startDate,
        endDate: session.enddate || session.endDate,
        remainingDays: session.remainingdays || session.remainingDays,
      },
      credits: {
        remainingCredits: session.remainingcredits || session.remainingCredits,
        totalUsedCredits: session.totalusedcredits || session.totalUsedCredits,
      },
    }));
  } catch (error) {
    next(error);
  }
};
