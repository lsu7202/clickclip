// 요청 검증 (Joi 기반)
const Joi = require('joi');

module.exports = {
    // 회원가입 검증
    registerSchema: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        name: Joi.string().min(2).required(),
        phone: Joi.string().length(11).required(),
        birthDate: Joi.string().pattern(/^\d{8}$/).required(), // YYYYMMDD
    }),

    // 로그인 검증
    loginSchema: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    }),

    // 작업 생성 검증
    createWorkSchema: Joi.object({
        title: Joi.string().min(1).max(255).required(),
        originalScript: Joi.string().required(),
    }),

    // 작업 임시저장 검증
    updateWorkDraftSchema: Joi.object({
        title: Joi.string().min(1).max(255),
        // .required()를 빼거나 .allow('', null)을 붙여야 영상만 올리고 저장할 때 에러가 안 납니다.
        editedScript: Joi.array().items(Joi.object()).allow(null),
        voicePreset: Joi.string().allow('', null),
        // ⭐ 업로드된 영상 경로를 허용하도록 추가
        sourceVideoPath: Joi.string().max(500).allow('', null),
        durationSec: Joi.number().integer().min(0).allow(null),
        originalScript: Joi.string().allow('', null)
    }),

    // 검증 미들웨어 생성
    validate(schema) {
        return (req, res, next) => {
            const { error, value } = schema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    status: 'error',
                    message: '입력 형식이 잘못됐습니다.',
                    details: error.details.map(d => d.message),
                });
            }
            req.validated = value;
            next();
        };
    },
};
