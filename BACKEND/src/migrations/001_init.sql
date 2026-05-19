-- YourFactory Database Initialization
-- 모든 테이블, 함수, 트리거를 생성합니다
BEGIN;
-- ========================================
-- 1️⃣ USERS (사용자)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  userId VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  birthDate VARCHAR(8),                    -- YYYYMMDD 형식
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 2️⃣ USER_PERMISSIONS (권한 상태)
-- ========================================
CREATE TABLE IF NOT EXISTS user_permissions (
  permissionId SERIAL PRIMARY KEY,
  userId VARCHAR(50) UNIQUE NOT NULL REFERENCES users(userId) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'Expired',    -- 'Active', 'Pending', 'Expired'
  gradeName VARCHAR(50),                   -- 'Pro', 'Premium', 'Basic'
  startDate DATE,
  endDate DATE,
  remainingDays INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 3️⃣ USER_CREDITS (크레딧)
-- ========================================
CREATE TABLE IF NOT EXISTS user_credits (
  creditId SERIAL PRIMARY KEY,
  userId VARCHAR(50) UNIQUE NOT NULL REFERENCES users(userId) ON DELETE CASCADE,
  remainingCredits INT DEFAULT 0,
  totalUsedCredits INT DEFAULT 0,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 4️⃣ PLANS (구독 요금제)
-- ========================================
CREATE TABLE IF NOT EXISTS plans (
  gradeName VARCHAR(50) PRIMARY KEY,
  displayName VARCHAR(100),
  price DECIMAL(10, 2),
  credits INT,
  durationDays INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 기본 요금제 데이터 삽입
INSERT INTO plans (gradeName, displayName, price, credits, durationDays)
VALUES 
  ('Pro', 'Pro 플랜', 29900, 2000, 30)
ON CONFLICT (gradeName) DO NOTHING;

-- ========================================
-- 5️⃣ PAYMENTS (결제 내역)
-- ========================================
CREATE TABLE IF NOT EXISTS payments (
  paymentId VARCHAR(50) PRIMARY KEY,
  userId VARCHAR(50) NOT NULL REFERENCES users(userId) ON DELETE CASCADE,
  gradeName VARCHAR(50) REFERENCES plans(gradeName),
  amount DECIMAL(10, 2),
  status VARCHAR(20) DEFAULT 'Pending',    -- 'Pending', 'Success', 'Failed'
  creditsAdded INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approvedAt TIMESTAMP
);

-- ========================================
-- 6️⃣ WORKS (작업 내역)
-- ========================================
CREATE TABLE IF NOT EXISTS works (
  workId VARCHAR(50) PRIMARY KEY,
  userId VARCHAR(50) NOT NULL REFERENCES users(userId) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'NEW',        -- 'NEW', 'IN_PROGRESS', 'RENDERING', 'DONE', 'FAILED'
  originalScript TEXT,
  editedScript JSONB,
  voicePreset VARCHAR(100),
  sourceVideoPath VARCHAR(500),
  durationSec INT,
  outputVideoUrl VARCHAR(500),
  downloadUrl VARCHAR(500),
  version INT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 4-1️⃣ CREDIT_RULES (기능별 크레딧 규칙)
-- ========================================
CREATE TABLE IF NOT EXISTS credit_rules (
  ruleId SERIAL PRIMARY KEY,
  featureKey VARCHAR(50) NOT NULL,        -- analyze, render
  billingUnit VARCHAR(20) NOT NULL,       -- minute, second, job
  creditsPerUnit DECIMAL(10, 2) NOT NULL,
  minimumCredits INT DEFAULT 0,
  baseCredits INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  version INT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (featureKey, version)
);

INSERT INTO credit_rules (featureKey, billingUnit, creditsPerUnit, minimumCredits, baseCredits, active, version)
VALUES
  ('analyze', 'minute', 5, 5, 0, TRUE, 1),
  ('render', 'minute', 15, 15, 0, TRUE, 1)
ON CONFLICT (featureKey, version) DO NOTHING;

-- ========================================
-- 4-2️⃣ CREDIT_LEDGER (크레딧 사용 원장)
-- ========================================
CREATE TABLE IF NOT EXISTS credit_ledger (
  ledgerId SERIAL PRIMARY KEY,
  userId VARCHAR(50) NOT NULL REFERENCES users(userId) ON DELETE CASCADE,
  workId VARCHAR(50) REFERENCES works(workId) ON DELETE CASCADE,
  featureKey VARCHAR(50) NOT NULL,
  direction VARCHAR(10) NOT NULL DEFAULT 'DEBIT', -- DEBIT, CREDIT
  durationSec INT,
  unitCount INT DEFAULT 0,
  credits INT NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',           -- PENDING, APPLIED, FAILED, REVERSED
  note VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_userId ON credit_ledger(userId);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_workId ON credit_ledger(workId);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_featureKey ON credit_ledger(featureKey);


-- ========================================
-- 함수 & 트리거
-- ========================================

-- 회원가입 시 중복 확인 트리거
CREATE OR REPLACE FUNCTION validate_user_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE email = NEW.email AND userId != NEW.userId) THEN
    RAISE EXCEPTION 'Email already exists';
  END IF;
  
  IF NEW.phone IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE phone = NEW.phone AND userId != NEW.userId) THEN
    RAISE EXCEPTION 'Phone number already exists';
  END IF;
  
  IF NEW.birthDate !~ '^\d{8}$' THEN
    RAISE EXCEPTION 'Invalid birthDate format (expected YYYYMMDD)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- DROP/CREATE 보호: 이미 존재할 경우 재생성 시 에러 발생 방지
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_users_insert_validate' AND c.relname = 'users'
  ) THEN
    CREATE TRIGGER trg_users_insert_validate
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_insert();
  END IF;
END;
$$;

-- 회원가입 후 권한/크레딧 자동 생성
CREATE OR REPLACE FUNCTION init_user_permission_and_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_permissions (userId, status, gradeName, startDate, endDate, remainingDays)
  VALUES (NEW.userId, 'Expired', NULL, NULL, NULL, 0);
  
  INSERT INTO user_credits (userId, remainingCredits, totalUsedCredits)
  VALUES (NEW.userId, 0, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_users_insert_init_permission_credits' AND c.relname = 'users'
  ) THEN
    CREATE TRIGGER trg_users_insert_init_permission_credits
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION init_user_permission_and_credits();
  END IF;
END;
$$;

-- 결제 승인 함수
CREATE OR REPLACE FUNCTION approve_payment(p_paymentId VARCHAR)
RETURNS TABLE(success BOOLEAN, message VARCHAR) AS $$
DECLARE
  v_userId VARCHAR;
  v_gradeName VARCHAR;
  v_credits INT;
  v_durationDays INT;
  v_startDate DATE;
  v_endDate DATE;
BEGIN
  SELECT p.userId, p.gradeName, pl.credits, pl.durationDays
  INTO v_userId, v_gradeName, v_credits, v_durationDays
  FROM payments p
  JOIN plans pl ON p.gradeName = pl.gradeName
  WHERE p.paymentId = p_paymentId AND p.status = 'Pending'
  LIMIT 1;
  
  IF v_userId IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Payment not found or already processed'::VARCHAR;
    RETURN;
  END IF;
  
  UPDATE payments
  SET status = 'Success', approvedAt = NOW()
  WHERE paymentId = p_paymentId;
  
  v_startDate := CURRENT_DATE;
  v_endDate := CURRENT_DATE + (v_durationDays || ' days')::INTERVAL;
  
  UPDATE user_permissions
  SET status = 'Active',
      gradeName = v_gradeName,
      startDate = v_startDate,
      endDate = v_endDate,
      remainingDays = v_durationDays
  WHERE userId = v_userId;
  
  UPDATE user_credits
  SET remainingCredits = remainingCredits + v_credits
  WHERE userId = v_userId;
  
  RETURN QUERY SELECT TRUE, 'Payment approved and credits added'::VARCHAR;
END;
$$ LANGUAGE plpgsql;


-- 작업 완료 시 크레딧 차감 함수
CREATE OR REPLACE FUNCTION consume_credits(p_userId VARCHAR, p_creditsUsed INT)
-- 출력 컬럼명에 o_ (output) 접두사를 붙여 테이블 컬럼명과 구분합니다.
RETURNS TABLE(o_success BOOLEAN, o_remainingCredits INT, o_message VARCHAR) AS $$
DECLARE
  v_currentCredits INT;
BEGIN
  -- 테이블명(user_credits)을 명시하여 모호성을 완전히 제거합니다.
  SELECT uc.remainingCredits INTO v_currentCredits
  FROM user_credits uc
  WHERE uc.userId = p_userId
  FOR UPDATE;
  
  IF v_currentCredits IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'User not found'::VARCHAR;
    RETURN;
  END IF;
  
  IF v_currentCredits < p_creditsUsed THEN
    RETURN QUERY SELECT FALSE, v_currentCredits, 'Insufficient credits'::VARCHAR;
    RETURN;
  END IF;
  
  UPDATE user_credits
  SET remainingCredits = remainingCredits - p_creditsUsed,
      totalUsedCredits = totalUsedCredits + p_creditsUsed
  WHERE userId = p_userId;
  
  -- 변경된 출력 컬럼명에 맞춰 결과값을 반환합니다.
  RETURN QUERY SELECT TRUE, v_currentCredits - p_creditsUsed, 'Credits consumed successfully'::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- 기능별 duration 기반 크레딧 계산 함수
CREATE OR REPLACE FUNCTION calculate_feature_credits(p_featureKey VARCHAR, p_durationSec INT)
RETURNS INT AS $$
DECLARE
  v_rule RECORD;
  v_unitCount INT;
  v_credits INT;
BEGIN
  SELECT * INTO v_rule
  FROM credit_rules
  WHERE featureKey = p_featureKey AND active = TRUE
  ORDER BY version DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN GREATEST(1, CEIL(COALESCE(p_durationSec, 0)::FLOAT / 60));
  END IF;

  IF v_rule.billingUnit = 'second' THEN
    v_unitCount := GREATEST(1, COALESCE(p_durationSec, 0));
  ELSIF v_rule.billingUnit = 'job' THEN
    v_unitCount := 1;
  ELSE
    v_unitCount := GREATEST(1, CEIL(COALESCE(p_durationSec, 0)::FLOAT / 60));
  END IF;

  v_credits := CEIL(v_unitCount * v_rule.creditsPerUnit)::INT + COALESCE(v_rule.baseCredits, 0);
  v_credits := GREATEST(v_credits, COALESCE(v_rule.minimumCredits, 0));

  RETURN GREATEST(v_credits, 1);
END;
$$ LANGUAGE plpgsql;


-- 권한 확인 함수
CREATE OR REPLACE FUNCTION can_render_work(p_userId VARCHAR)
RETURNS TABLE(allowed BOOLEAN, reason VARCHAR) AS $$
DECLARE
  v_status VARCHAR;
  v_remainingDays INT;
BEGIN
  SELECT status, remainingDays INTO v_status, v_remainingDays
  FROM user_permissions
  WHERE userId = p_userId;
  
  IF v_status = 'Active' AND v_remainingDays > 0 THEN
    RETURN QUERY SELECT TRUE, 'Permission is valid'::VARCHAR;
  ELSIF v_status = 'Pending' THEN
    RETURN QUERY SELECT FALSE, 'Permission is pending approval'::VARCHAR;
  ELSIF v_status = 'Expired' THEN
    RETURN QUERY SELECT FALSE, 'Permission has expired'::VARCHAR;
  ELSE
    RETURN QUERY SELECT FALSE, 'Permission not found'::VARCHAR;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 남은 구독기간 및 상태 자동 계산 함수
CREATE OR REPLACE FUNCTION calc_remaining_days()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. endDate가 설정되어 있다면 오늘 날짜와 비교하여 남은 일수 계산
  IF NEW.endDate IS NOT NULL THEN
    NEW.remainingDays := GREATEST(0, NEW.endDate - CURRENT_DATE);
    
    -- 2. 계산된 remainingDays에 따라 status 결정
    -- 0이면 Expired, 1 이상이면 Active로 설정
    IF NEW.remainingDays >= 1 THEN
      NEW.status := 'Active';
    ELSE
      NEW.status := 'Expired';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 설정 (기존과 동일)
-- BEFORE INSERT OR UPDATE를 사용하므로 값이 테이블에 써지기 전에 status가 확정됩니다.
DROP TRIGGER IF EXISTS trg_calc_remaining_days ON user_permissions;
CREATE TRIGGER trg_calc_remaining_days
BEFORE INSERT OR UPDATE ON user_permissions
FOR EACH ROW
EXECUTE FUNCTION calc_remaining_days();

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_works_userId ON works(userId);
CREATE INDEX IF NOT EXISTS idx_works_status ON works(status);
CREATE INDEX IF NOT EXISTS idx_payments_userId ON payments(userId);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

COMMIT;
