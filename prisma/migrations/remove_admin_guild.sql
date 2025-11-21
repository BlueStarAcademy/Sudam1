-- 관리자 유저의 길드 연결 해제
-- 이 스크립트는 관리자 유저(isAdmin = true)의 GuildMember 레코드를 삭제하고,
-- status JSON 필드에서도 guildId를 제거합니다.
-- Supabase SQL Editor에서 실행하세요.

-- 1. 먼저 현재 상태 확인
SELECT 
    u.id,
    u.nickname,
    u.username,
    u."isAdmin",
    gm.id as guild_member_id,
    gm."guildId",
    g.name as guild_name,
    u.status->'serializedUser'->>'guildId' as status_guild_id
FROM "User" u
LEFT JOIN "GuildMember" gm ON u.id = gm."userId"
LEFT JOIN "Guild" g ON gm."guildId" = g.id
WHERE u."isAdmin" = true;

-- 2. 관리자 유저의 GuildMember 레코드 삭제
DELETE FROM "GuildMember"
WHERE "userId" IN (
    SELECT id FROM "User" WHERE "isAdmin" = true
);

-- 3. status JSON 필드에서 guildId 제거 (serializedUser.guildId가 있는 경우)
UPDATE "User"
SET status = jsonb_set(
    COALESCE(status, '{}'::jsonb),
    '{serializedUser,guildId}',
    'null'::jsonb,
    true
)
WHERE "isAdmin" = true 
  AND status->'serializedUser'->>'guildId' IS NOT NULL;

-- 4. 결과 확인 (관리자 유저가 길드에 속해있지 않아야 함)
SELECT 
    u.id,
    u.nickname,
    u.username,
    u."isAdmin",
    gm.id as guild_member_id,
    gm."guildId",
    u.status->'serializedUser'->>'guildId' as status_guild_id
FROM "User" u
LEFT JOIN "GuildMember" gm ON u.id = gm."userId"
WHERE u."isAdmin" = true;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '관리자 유저의 길드 연결이 해제되었습니다. (GuildMember 레코드 삭제 및 status JSON의 guildId 제거)';
END $$;

