-- 길드 시스템 테이블 수동 생성 SQL
-- Supabase SQL Editor에서 실행하세요

-- 1. Guild 테이블
CREATE TABLE IF NOT EXISTS "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "description" TEXT,
    "emblem" TEXT,
    "settings" JSONB,
    "gold" BIGINT NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- 2. GuildMember 테이블
CREATE TABLE IF NOT EXISTS "GuildMember" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contributionTotal" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMember_pkey" PRIMARY KEY ("id")
);

-- 3. GuildMessage 테이블
CREATE TABLE IF NOT EXISTS "GuildMessage" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMessage_pkey" PRIMARY KEY ("id")
);

-- 4. GuildMission 테이블
CREATE TABLE IF NOT EXISTS "GuildMission" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "missionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "progress" JSONB,
    "target" JSONB,
    "resetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMission_pkey" PRIMARY KEY ("id")
);

-- 5. GuildShop 테이블
CREATE TABLE IF NOT EXISTS "GuildShop" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "itemTemplateId" TEXT NOT NULL,
    "price" BIGINT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT -1,
    "purchasedBy" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildShop_pkey" PRIMARY KEY ("id")
);

-- 6. GuildDonation 테이블
CREATE TABLE IF NOT EXISTS "GuildDonation" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL DEFAULT 0,
    "itemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildDonation_pkey" PRIMARY KEY ("id")
);

-- 7. GuildWar 테이블
CREATE TABLE IF NOT EXISTS "GuildWar" (
    "id" TEXT NOT NULL,
    "guild1Id" TEXT NOT NULL,
    "guild2Id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildWar_pkey" PRIMARY KEY ("id")
);

-- 8. GuildWarMatch 테이블
CREATE TABLE IF NOT EXISTS "GuildWarMatch" (
    "id" TEXT NOT NULL,
    "warId" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "result" JSONB,
    "gameId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildWarMatch_pkey" PRIMARY KEY ("id")
);

-- 인덱스 생성
CREATE UNIQUE INDEX IF NOT EXISTS "Guild_name_key" ON "Guild"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Guild_leaderId_key" ON "Guild"("leaderId");
CREATE INDEX IF NOT EXISTS "Guild_leaderId_idx" ON "Guild"("leaderId");
CREATE INDEX IF NOT EXISTS "Guild_name_idx" ON "Guild"("name");

CREATE UNIQUE INDEX IF NOT EXISTS "GuildMember_guildId_userId_key" ON "GuildMember"("guildId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "GuildMember_userId_key" ON "GuildMember"("userId");
CREATE INDEX IF NOT EXISTS "GuildMember_guildId_idx" ON "GuildMember"("guildId");
CREATE INDEX IF NOT EXISTS "GuildMember_userId_idx" ON "GuildMember"("userId");

CREATE INDEX IF NOT EXISTS "GuildMessage_guildId_createdAt_idx" ON "GuildMessage"("guildId", "createdAt");
CREATE INDEX IF NOT EXISTS "GuildMessage_authorId_idx" ON "GuildMessage"("authorId");

CREATE INDEX IF NOT EXISTS "GuildMission_guildId_status_idx" ON "GuildMission"("guildId", "status");
CREATE INDEX IF NOT EXISTS "GuildMission_resetAt_idx" ON "GuildMission"("resetAt");

CREATE INDEX IF NOT EXISTS "GuildShop_guildId_idx" ON "GuildShop"("guildId");

CREATE INDEX IF NOT EXISTS "GuildDonation_guildId_createdAt_idx" ON "GuildDonation"("guildId", "createdAt");
CREATE INDEX IF NOT EXISTS "GuildDonation_userId_idx" ON "GuildDonation"("userId");

CREATE INDEX IF NOT EXISTS "GuildWar_guild1Id_status_idx" ON "GuildWar"("guild1Id", "status");
CREATE INDEX IF NOT EXISTS "GuildWar_guild2Id_status_idx" ON "GuildWar"("guild2Id", "status");
CREATE INDEX IF NOT EXISTS "GuildWar_status_idx" ON "GuildWar"("status");

CREATE INDEX IF NOT EXISTS "GuildWarMatch_warId_idx" ON "GuildWarMatch"("warId");
CREATE INDEX IF NOT EXISTS "GuildWarMatch_player1Id_idx" ON "GuildWarMatch"("player1Id");
CREATE INDEX IF NOT EXISTS "GuildWarMatch_player2Id_idx" ON "GuildWarMatch"("player2Id");

-- 외래키 제약조건 추가
DO $$ 
BEGIN
    -- Guild.leaderId -> User.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Guild_leaderId_fkey'
    ) THEN
        ALTER TABLE "Guild" ADD CONSTRAINT "Guild_leaderId_fkey" 
        FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- GuildMember.guildId -> Guild.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GuildMember_guildId_fkey'
    ) THEN
        ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_guildId_fkey" 
        FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- GuildMember.userId -> User.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GuildMember_userId_fkey'
    ) THEN
        ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- GuildMessage.guildId -> Guild.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GuildMessage_guildId_fkey'
    ) THEN
        ALTER TABLE "GuildMessage" ADD CONSTRAINT "GuildMessage_guildId_fkey" 
        FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- GuildMission.guildId -> Guild.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GuildMission_guildId_fkey'
    ) THEN
        ALTER TABLE "GuildMission" ADD CONSTRAINT "GuildMission_guildId_fkey" 
        FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- GuildShop.guildId -> Guild.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GuildShop_guildId_fkey'
    ) THEN
        ALTER TABLE "GuildShop" ADD CONSTRAINT "GuildShop_guildId_fkey" 
        FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- GuildDonation.guildId -> Guild.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GuildDonation_guildId_fkey'
    ) THEN
        ALTER TABLE "GuildDonation" ADD CONSTRAINT "GuildDonation_guildId_fkey" 
        FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- GuildWar.guild1Id -> Guild.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GuildWar_guild1Id_fkey'
    ) THEN
        ALTER TABLE "GuildWar" ADD CONSTRAINT "GuildWar_guild1Id_fkey" 
        FOREIGN KEY ("guild1Id") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- GuildWar.guild2Id -> Guild.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GuildWar_guild2Id_fkey'
    ) THEN
        ALTER TABLE "GuildWar" ADD CONSTRAINT "GuildWar_guild2Id_fkey" 
        FOREIGN KEY ("guild2Id") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- GuildWarMatch.warId -> GuildWar.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GuildWarMatch_warId_fkey'
    ) THEN
        ALTER TABLE "GuildWarMatch" ADD CONSTRAINT "GuildWarMatch_warId_fkey" 
        FOREIGN KEY ("warId") REFERENCES "GuildWar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- updatedAt 자동 업데이트 트리거 함수 (이미 있다면 스킵)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updatedAt 트리거 생성
DO $$ 
BEGIN
    -- Guild 테이블
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_Guild_updated_at') THEN
        CREATE TRIGGER update_Guild_updated_at BEFORE UPDATE ON "Guild"
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- GuildMember 테이블
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_GuildMember_updated_at') THEN
        CREATE TRIGGER update_GuildMember_updated_at BEFORE UPDATE ON "GuildMember"
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- GuildMission 테이블
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_GuildMission_updated_at') THEN
        CREATE TRIGGER update_GuildMission_updated_at BEFORE UPDATE ON "GuildMission"
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- GuildShop 테이블
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_GuildShop_updated_at') THEN
        CREATE TRIGGER update_GuildShop_updated_at BEFORE UPDATE ON "GuildShop"
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- GuildWar 테이블
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_GuildWar_updated_at') THEN
        CREATE TRIGGER update_GuildWar_updated_at BEFORE UPDATE ON "GuildWar"
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- GuildWarMatch 테이블
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_GuildWarMatch_updated_at') THEN
        CREATE TRIGGER update_GuildWarMatch_updated_at BEFORE UPDATE ON "GuildWarMatch"
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

