# Database Migration Plan (SQLite → PostgreSQL with Prisma)

## Overview

목표: 기존 SQLite `users` 테이블에 포함된 대규모 JSON 데이터를 분리하고, PostgreSQL 기반의 정규화된 스키마로 이전한다. Prisma ORM을 도입하여 스키마와 마이그레이션을 자동화하고, ETL 스크립트를 통해 현재 데이터를 단계적으로 이관한다.

---

## Environment Setup

1. **Prisma 설치**
   ```bash
   npm install prisma @prisma/client
   npx prisma init --datasource-provider postgresql
   ```

2. **로컬/테스트 Postgres 준비**
   - docker-compose 예시:
     ```yaml
     services:
       db:
         image: postgres:15
         environment:
           POSTGRES_USER: sudamr
           POSTGRES_PASSWORD: sudamr
           POSTGRES_DB: sudamr
         ports:
           - "5432:5432"
         volumes:
           - db_data:/var/lib/postgresql/data
     volumes:
       db_data:
     ```
   - `.env` (Prisma datasource) 업데이트:
     ```
     DATABASE_URL="postgresql://sudamr:sudamr@localhost:5432/sudamr?schema=public"
     ```

---

## Prisma Schema Draft

`prisma/schema.prisma` 예시 (요약):

```prisma
model User {
  id               String   @id @default(uuid())
  nickname         String   @unique
  strategyLevel    Int
  strategyXp       Int
  playfulLevel     Int
  playfulXp        Int
  actionPointCurr  Int
  actionPointMax   Int
  gold             BigInt   @default(0)
  diamonds         BigInt   @default(0)
  league           String?
  tournamentScore  Int      @default(0)
  status           Json?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  version          Int      @default(0)

  inventory        UserInventory[]
  equipment        UserEquipment[]
  mail             UserMail[]
  quests           UserQuest[]
  missions         UserMission[]
}

model UserInventory {
  id              String   @id @default(uuid())
  userId          String
  templateId      String
  quantity        Int      @default(1)
  slot            String?
  enhancementLvl  Int      @default(0)
  stars           Int      @default(0)
  rarity          String?
  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  version         Int      @default(0)

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UserEquipment {
  id            String   @id @default(uuid())
  userId        String
  slot          String
  inventoryId   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  version       Int      @default(0)

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  inventoryItem UserInventory? @relation(fields: [inventoryId], references: [id], onDelete: SetNull)

  @@unique([userId, slot])
}

model UserMail {
  id         String   @id @default(uuid())
  userId     String
  title      String
  body       String
  attachments Json?
  isRead     Boolean  @default(false)
  expiresAt  DateTime?
  createdAt  DateTime @default(now())

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UserQuest {
  id         String   @id @default(uuid())
  userId     String
  questId    String
  status     String
  progress   Json?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UserMission {
  id         String   @id @default(uuid())
  userId     String
  missionId  String
  level      Int      @default(1)
  state      Json?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

> 실제 구현 시 enum, default 등은 현재 비즈니스 로직에 맞춰 구체화 필요.

---

## Migration Steps

1. **초기 Prisma 마이그레이션 생성**
   ```bash
   npx prisma migrate dev --name init_schema
   ```
   - 생성된 SQL 확인 후 검토.

2. **데이터 변환 스크립트 작성 (`scripts/migrate-sqlite-to-postgres.ts` 등)**
   - 순서:
     1. SQLite `users` 전체 로드.
     2. 각 유저에 대해:
        - `INSERT INTO User` (핵심 필드만)
        - `users.inventory` JSON → `UserInventory` 레코드 생성.
        - `users.equipment` JSON → `UserEquipment` 레코드 생성.
        - `users.mail`, `users.quests`, `users.singlePlayerMissions` 등 → 대응 테이블로 삽입.
        - `inventory.isEquipped` 가 `true` 인 경우 `UserEquipment` 와 연결.
     3. `inventory_history` 등 로그 테이블은 필요 시 이후 단계에서 추가.
   - Prisma Client 또는 `pg` 드라이버를 활용하여 Postgres에 insert.

3. **검증**
   - 샘플 유저 몇 명에 대해 Postgres 데이터가 원본과 동일한지 diff.
   - 핵심 액션(보상 수령, 장비 장착/해제 등)이 신규 스키마로 동작하는지 테스트 (추후 단계에서 완료).

4. **애플리케이션 코드 전환**
   - `db.updateUser` 호출 지점 식별 → `inventoryRepo.updateItem()` 등 세분화된 함수로 변경.
   - Prisma Client 사용 예:
     ```ts
     const prisma = new PrismaClient();
     await prisma.$transaction(async (tx) => {
       await tx.user.update({ ... });
       await tx.userInventory.create({ ... });
     });
     ```

5. **구조 안정화 후 레거시 컬럼 제거**
   - SQLite에서 사용하던 `inventory`, `equipment` 컬럼 제거 (또는 `deprecated_*`로 rename 후 유지).
   - 백업/복구 스크립트 업데이트.

---

## Data Migration Script Skeleton (Pseudo-code)

```ts
import { PrismaClient } from '@prisma/client';
import sqlite from 'better-sqlite3';

const prisma = new PrismaClient();
const sqliteDb = sqlite('database.sqlite');

async function migrateUsers() {
  const rows = sqliteDb.prepare('SELECT * FROM users').all();

  for (const row of rows) {
    const inventory = JSON.parse(row.inventory ?? '[]');
    const equipment = JSON.parse(row.equipment ?? '{}');
    const mail = JSON.parse(row.mail ?? '[]');
    // ...

    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: row.id,
          nickname: row.nickname,
          strategyLevel: row.strategyLevel ?? 1,
          strategyXp: row.strategyXp ?? 0,
          // ... 기타 필요 필드
        },
      });

      for (const item of inventory) {
        await tx.userInventory.create({
          data: {
            id: item.id ?? uuid(),
            userId: row.id,
            templateId: item.templateId,
            quantity: item.quantity ?? 1,
            slot: item.slot ?? null,
            enhancementLvl: item.enhancement ?? 0,
            stars: item.stars ?? 0,
            rarity: item.rarity ?? null,
            metadata: item,
            isEquipped: item.isEquipped ?? false,
          },
        });
      }

      for (const [slot, itemId] of Object.entries(equipment ?? {})) {
        if (!itemId) continue;
        await tx.userEquipment.create({
          data: {
            userId: row.id,
            slot,
            inventoryId: itemId,
          },
        });
      }

      // mail, quests, missions 등도 동일한 절차로 insert
    });
  }
}

migrateUsers()
  .then(() => console.log('Migration completed'))
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
```

---

## Rollout & Verification

1. **Dry Run**
   - 개발 환경에서 SQLite → Postgres 변환 및 서비스 코드 변경 적용 후 테스트.

2. **스테이징 배포**
   - 실제 데이터와 유사한 스냅샷으로 마이그레이션 수행 및 QA.

3. **프로덕션 배포**
   - 다운타임 최소화 계획:
     - 서비스 read-only 모드 전환
     - 최종 덤프 → Postgres import
     - 신규 서비스 롤아웃
     - 모니터링 및 롤백 플랜 확보

4. **모니터링**
   - 로그인, 인벤토리 교환, 장비 장착/해제, 보상 수령 등 주요 플로우 실시간 확인.

---

## Notes

- 초기 배포 후 일정 기간은 구 SQLite 백업을 보관.
- Prisma `previewFeatures` (e.g., `referentialActions`) 사용 여부는 Prisma 버전에 따라 조정.
- 대규모 데이터의 경우 batch insert 최적화, COPY 명령 활용 등 추가 고려.


