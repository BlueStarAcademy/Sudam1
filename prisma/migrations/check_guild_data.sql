-- 길드 데이터 확인 스크립트
-- Supabase SQL Editor에서 실행하여 현재 길드 데이터 상태를 확인하세요

-- 1. Guild 테이블의 모든 데이터 조회
SELECT 
    id, 
    name, 
    "leaderId", 
    description, 
    level, 
    "createdAt"
FROM "Guild"
ORDER BY "createdAt" DESC;

-- 2. GuildMember 테이블의 모든 데이터 조회
SELECT 
    id,
    "guildId",
    "userId",
    role,
    "joinDate"
FROM "GuildMember"
ORDER BY "joinDate" DESC;

-- 3. User 테이블에서 guildId가 설정된 사용자 확인
SELECT 
    id,
    nickname,
    "guildId"
FROM "User"
WHERE "guildId" IS NOT NULL;

-- 4. 각 테이블의 레코드 수 확인
SELECT 
    'Guild' as table_name,
    COUNT(*) as record_count
FROM "Guild"
UNION ALL
SELECT 
    'GuildMember' as table_name,
    COUNT(*) as record_count
FROM "GuildMember"
UNION ALL
SELECT 
    'GuildMessage' as table_name,
    COUNT(*) as record_count
FROM "GuildMessage"
UNION ALL
SELECT 
    'GuildMission' as table_name,
    COUNT(*) as record_count
FROM "GuildMission"
UNION ALL
SELECT 
    'GuildShop' as table_name,
    COUNT(*) as record_count
FROM "GuildShop"
UNION ALL
SELECT 
    'GuildDonation' as table_name,
    COUNT(*) as record_count
FROM "GuildDonation"
UNION ALL
SELECT 
    'GuildWar' as table_name,
    COUNT(*) as record_count
FROM "GuildWar"
UNION ALL
SELECT 
    'GuildWarMatch' as table_name,
    COUNT(*) as record_count
FROM "GuildWarMatch";

