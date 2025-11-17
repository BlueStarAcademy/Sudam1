-- 도전의 탑 관련 필드 추가 마이그레이션
-- SQL Editor에서 실행하세요

-- 1. towerFloor 컬럼 추가 (기본값 0)
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "towerFloor" INTEGER NOT NULL DEFAULT 0;

-- 2. lastTowerClearTime 컬럼 추가 (NULL 허용)
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "lastTowerClearTime" BIGINT;

-- 3. towerFloor 인덱스 추가
CREATE INDEX IF NOT EXISTS "User_towerFloor_idx" ON "User"("towerFloor");

-- 4. 복합 인덱스 추가 (towerFloor, lastTowerClearTime)
CREATE INDEX IF NOT EXISTS "User_towerFloor_lastTowerClearTime_idx" ON "User"("towerFloor", "lastTowerClearTime");

