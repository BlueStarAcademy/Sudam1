-- CreateTable
CREATE TABLE "LiveGame" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "category" TEXT,
    "isEnded" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveGame_pkey" PRIMARY KEY ("id")
);

