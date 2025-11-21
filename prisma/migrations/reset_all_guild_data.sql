-- 모든 길드 관련 데이터 초기화 스크립트
-- Supabase SQL Editor에서 실행하세요
-- ⚠️ 주의: 이 스크립트는 모든 길드 데이터를 삭제합니다. 백업 후 실행하세요.

-- 1. 먼저 모든 사용자의 guildId를 NULL로 설정 (컬럼이 있는 경우에만)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'guildId'
    ) THEN
        UPDATE "User" SET "guildId" = NULL WHERE "guildId" IS NOT NULL;
        RAISE NOTICE 'User 테이블의 guildId 컬럼을 NULL로 설정했습니다.';
    ELSE
        RAISE NOTICE 'User 테이블에 guildId 컬럼이 없습니다. 건너뜁니다.';
    END IF;
END $$;

-- 2. GuildWarMatch 테이블 삭제 (GuildWar 참조)
DELETE FROM "GuildWarMatch";

-- 3. GuildWar 테이블 삭제 (Guild 참조)
DELETE FROM "GuildWar";

-- 4. GuildDonation 테이블 삭제 (Guild 참조)
DELETE FROM "GuildDonation";

-- 5. GuildShop 테이블 삭제 (Guild 참조)
DELETE FROM "GuildShop";

-- 6. GuildMission 테이블 삭제 (Guild 참조)
DELETE FROM "GuildMission";

-- 7. GuildMessage 테이블 삭제 (Guild 참조)
DELETE FROM "GuildMessage";

-- 8. GuildMember 테이블 삭제 (Guild 참조, User 참조)
DELETE FROM "GuildMember";

-- 9. Guild 테이블 삭제 (User.leaderId 참조)
DELETE FROM "Guild";

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '모든 길드 관련 데이터가 초기화되었습니다.';
    RAISE NOTICE 'User 테이블의 guildId 컬럼도 NULL로 설정되었습니다.';
END $$;

