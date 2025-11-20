-- CreateTable
CREATE TABLE "Guild" (
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

-- CreateTable
CREATE TABLE "GuildMember" (
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

-- CreateTable
CREATE TABLE "GuildMessage" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMission" (
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

-- CreateTable
CREATE TABLE "GuildShop" (
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

-- CreateTable
CREATE TABLE "GuildDonation" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL DEFAULT 0,
    "itemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildDonation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildWar" (
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

-- CreateTable
CREATE TABLE "GuildWarMatch" (
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

-- CreateIndex
CREATE UNIQUE INDEX "Guild_name_key" ON "Guild"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_leaderId_key" ON "Guild"("leaderId");

-- CreateIndex
CREATE INDEX "Guild_leaderId_idx" ON "Guild"("leaderId");

-- CreateIndex
CREATE INDEX "Guild_name_idx" ON "Guild"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GuildMember_guildId_userId_key" ON "GuildMember"("guildId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildMember_userId_key" ON "GuildMember"("userId");

-- CreateIndex
CREATE INDEX "GuildMember_guildId_idx" ON "GuildMember"("guildId");

-- CreateIndex
CREATE INDEX "GuildMember_userId_idx" ON "GuildMember"("userId");

-- CreateIndex
CREATE INDEX "GuildMessage_guildId_createdAt_idx" ON "GuildMessage"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "GuildMessage_authorId_idx" ON "GuildMessage"("authorId");

-- CreateIndex
CREATE INDEX "GuildMission_guildId_status_idx" ON "GuildMission"("guildId", "status");

-- CreateIndex
CREATE INDEX "GuildMission_resetAt_idx" ON "GuildMission"("resetAt");

-- CreateIndex
CREATE INDEX "GuildShop_guildId_idx" ON "GuildShop"("guildId");

-- CreateIndex
CREATE INDEX "GuildDonation_guildId_createdAt_idx" ON "GuildDonation"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "GuildDonation_userId_idx" ON "GuildDonation"("userId");

-- CreateIndex
CREATE INDEX "GuildWar_guild1Id_status_idx" ON "GuildWar"("guild1Id", "status");

-- CreateIndex
CREATE INDEX "GuildWar_guild2Id_status_idx" ON "GuildWar"("guild2Id", "status");

-- CreateIndex
CREATE INDEX "GuildWar_status_idx" ON "GuildWar"("status");

-- CreateIndex
CREATE INDEX "GuildWarMatch_warId_idx" ON "GuildWarMatch"("warId");

-- CreateIndex
CREATE INDEX "GuildWarMatch_player1Id_idx" ON "GuildWarMatch"("player1Id");

-- CreateIndex
CREATE INDEX "GuildWarMatch_player2Id_idx" ON "GuildWarMatch"("player2Id");

-- AddForeignKey
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMessage" ADD CONSTRAINT "GuildMessage_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMission" ADD CONSTRAINT "GuildMission_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildShop" ADD CONSTRAINT "GuildShop_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildDonation" ADD CONSTRAINT "GuildDonation_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildWar" ADD CONSTRAINT "GuildWar_guild1Id_fkey" FOREIGN KEY ("guild1Id") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildWar" ADD CONSTRAINT "GuildWar_guild2Id_fkey" FOREIGN KEY ("guild2Id") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildWarMatch" ADD CONSTRAINT "GuildWarMatch_warId_fkey" FOREIGN KEY ("warId") REFERENCES "GuildWar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

