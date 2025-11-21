-- ============================================
-- 마이그레이션 완료 확인 쿼리
-- ============================================
-- 이 쿼리를 실행하여 모든 마이그레이션이 성공적으로 완료되었는지 확인하세요.

-- 1. UserCredential 테이블의 컬럼 확인
-- kakaoId, emailVerified, createdAt, updatedAt 컬럼이 있는지 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'UserCredential'
ORDER BY ordinal_position;

-- 2. UserCredential 테이블의 kakaoId UNIQUE 인덱스 확인
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'UserCredential' 
  AND indexname = 'UserCredential_kakaoId_key';

-- 3. EmailVerificationToken 테이블 존재 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'EmailVerificationToken';

-- 4. EmailVerificationToken 테이블의 컬럼 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'EmailVerificationToken'
ORDER BY ordinal_position;

-- 5. EmailVerificationToken 테이블의 Foreign Key 확인
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'EmailVerificationToken';

