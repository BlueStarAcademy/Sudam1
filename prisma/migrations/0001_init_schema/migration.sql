-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT,
    "strategyLevel" INTEGER NOT NULL DEFAULT 1,
    "strategyXp" INTEGER NOT NULL DEFAULT 0,
    "playfulLevel" INTEGER NOT NULL DEFAULT 1,
    "playfulXp" INTEGER NOT NULL DEFAULT 0,
    "actionPointCurr" INTEGER NOT NULL DEFAULT 0,
    "actionPointMax" INTEGER NOT NULL DEFAULT 0,
    "gold" BIGINT NOT NULL DEFAULT 0,
    "diamonds" BIGINT NOT NULL DEFAULT 0,
    "league" TEXT,
    "tournamentScore" INTEGER NOT NULL DEFAULT 0,
    "status" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInventory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "slot" TEXT,
    "enhancementLvl" INTEGER NOT NULL DEFAULT 0,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "rarity" TEXT,
    "metadata" JSONB,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEquipment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "inventoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQuest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "state" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inventoryId" TEXT,
    "action" TEXT NOT NULL,
    "delta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_league_idx" ON "User"("league");

-- CreateIndex
CREATE INDEX "User_tournamentScore_idx" ON "User"("tournamentScore");

-- CreateIndex
CREATE INDEX "UserInventory_userId_idx" ON "UserInventory"("userId");

-- CreateIndex
CREATE INDEX "UserInventory_userId_templateId_idx" ON "UserInventory"("userId", "templateId");

-- CreateIndex
CREATE INDEX "UserInventory_userId_slot_idx" ON "UserInventory"("userId", "slot");

-- CreateIndex
CREATE INDEX "UserEquipment_inventoryId_idx" ON "UserEquipment"("inventoryId");

-- CreateIndex
CREATE UNIQUE INDEX "UserEquipment_userId_slot_key" ON "UserEquipment"("userId", "slot");

-- CreateIndex
CREATE INDEX "UserMail_userId_isRead_idx" ON "UserMail"("userId", "isRead");

-- CreateIndex
CREATE INDEX "UserMail_expiresAt_idx" ON "UserMail"("expiresAt");

-- CreateIndex
CREATE INDEX "UserQuest_userId_questId_idx" ON "UserQuest"("userId", "questId");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuest_userId_questId_key" ON "UserQuest"("userId", "questId");

-- CreateIndex
CREATE INDEX "UserMission_userId_missionId_idx" ON "UserMission"("userId", "missionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMission_userId_missionId_key" ON "UserMission"("userId", "missionId");

-- CreateIndex
CREATE INDEX "InventoryHistory_userId_createdAt_idx" ON "InventoryHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryHistory_inventoryId_idx" ON "InventoryHistory"("inventoryId");

-- AddForeignKey
ALTER TABLE "UserInventory" ADD CONSTRAINT "UserInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEquipment" ADD CONSTRAINT "UserEquipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEquipment" ADD CONSTRAINT "UserEquipment_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "UserInventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMail" ADD CONSTRAINT "UserMail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuest" ADD CONSTRAINT "UserQuest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMission" ADD CONSTRAINT "UserMission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryHistory" ADD CONSTRAINT "InventoryHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryHistory" ADD CONSTRAINT "InventoryHistory_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "UserInventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

