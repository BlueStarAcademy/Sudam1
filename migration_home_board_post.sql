-- HomeBoardPost 테이블 생성 SQL 스크립트
-- 이 스크립트를 데이터베이스에 직접 실행하세요

CREATE TABLE IF NOT EXISTS "HomeBoardPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeBoardPost_pkey" PRIMARY KEY ("id")
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS "HomeBoardPost_createdAt_idx" ON "HomeBoardPost"("createdAt");
CREATE INDEX IF NOT EXISTS "HomeBoardPost_isPinned_createdAt_idx" ON "HomeBoardPost"("isPinned", "createdAt");

