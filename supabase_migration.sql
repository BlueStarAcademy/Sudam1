-- ============================================
-- Supabase SQL Editor에서 실행할 마이그레이션
-- ============================================
-- 이 스크립트는 UserCredential 테이블에 kakaoId, emailVerified 컬럼을 추가하고
-- EmailVerificationToken 테이블을 생성합니다.
-- 
-- 실행 방법:
-- 1. Supabase Dashboard에서 SQL Editor 열기
-- 2. 아래 SQL 전체를 복사하여 붙여넣기
-- 3. "Run" 버튼 클릭
-- ============================================

-- 1. UserCredential 테이블에 컬럼 추가
-- kakaoId 컬럼 추가 (NULL 허용, UNIQUE 제약조건)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'UserCredential' AND column_name = 'kakaoId'
    ) THEN
        ALTER TABLE "UserCredential" ADD COLUMN "kakaoId" TEXT;
    END IF;
END $$;

-- emailVerified 컬럼 추가 (기본값 false)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'UserCredential' AND column_name = 'emailVerified'
    ) THEN
        ALTER TABLE "UserCredential" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- createdAt 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'UserCredential' AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE "UserCredential" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- updatedAt 컬럼 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'UserCredential' AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE "UserCredential" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 2. kakaoId에 대한 UNIQUE 인덱스 생성 (NULL 값 제외)
CREATE UNIQUE INDEX IF NOT EXISTS "UserCredential_kakaoId_key" 
ON "UserCredential"("kakaoId") 
WHERE "kakaoId" IS NOT NULL;

-- 3. EmailVerificationToken 테이블 생성
CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- 4. EmailVerificationToken 테이블에 인덱스 생성
CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerificationToken_token_key" 
ON "EmailVerificationToken"("token");

CREATE INDEX IF NOT EXISTS "EmailVerificationToken_userId_idx" 
ON "EmailVerificationToken"("userId");

CREATE INDEX IF NOT EXISTS "EmailVerificationToken_token_idx" 
ON "EmailVerificationToken"("token");

CREATE INDEX IF NOT EXISTS "EmailVerificationToken_email_idx" 
ON "EmailVerificationToken"("email");

CREATE INDEX IF NOT EXISTS "EmailVerificationToken_expiresAt_idx" 
ON "EmailVerificationToken"("expiresAt");

-- 5. Foreign Key 제약조건 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'EmailVerificationToken_userId_fkey'
    ) THEN
        ALTER TABLE "EmailVerificationToken" 
        ADD CONSTRAINT "EmailVerificationToken_userId_fkey" 
        FOREIGN KEY ("userId") 
        REFERENCES "UserCredential"("userId") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- 마이그레이션 완료 확인 쿼리
-- ============================================
-- 아래 쿼리를 실행하여 마이그레이션이 성공적으로 완료되었는지 확인하세요:

-- UserCredential 테이블의 컬럼 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'UserCredential'
ORDER BY ordinal_position;

-- EmailVerificationToken 테이블 존재 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'EmailVerificationToken';

-- EmailVerificationToken 테이블의 컬럼 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'EmailVerificationToken'
ORDER BY ordinal_position;

