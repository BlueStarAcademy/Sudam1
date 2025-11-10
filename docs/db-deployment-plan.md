# PostgreSQL Deployment Plan (Development → Staging → Production)

## 1. Development Environment

1. **Docker Compose**
   ```yaml
   services:
     postgres:
       image: postgres:15
       restart: always
       environment:
         POSTGRES_USER: sudamr
         POSTGRES_PASSWORD: sudamr
         POSTGRES_DB: sudamr
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
   volumes:
     postgres_data:
   ```

2. **Prisma Configuration**
   - `.env`:
     ```
     DATABASE_URL="postgresql://sudamr:sudamr@localhost:5432/sudamr?schema=public"
     ```
   - `npx prisma migrate dev --name init_schema`
   - `npx prisma generate`

3. **CI Test Database (Optional)**
   - Use ephemeral Postgres in GitHub Actions via services.
   - Or use `docker-compose -f docker-compose.test.yml up`.

## 2. Staging Environment

1. **Managed Postgres Instance**
   - AWS RDS / GCP Cloud SQL / Supabase / Render 등.
   - 최소 스펙: 2 vCPU, 4GB RAM (초기 환경 기준).
   - 백업: 자동 스냅샷 (일 1회 이상), PITR 가능 옵션 활성화.

2. **Secrets/Config**
   - `.env.staging` → `DATABASE_URL` 업데이트.
   - 애플리케이션에서 ENV에 따라 Prisma datasource 선택 (`DATABASE_URL_STAGING` 등).

3. **Deployment Steps**
   1. `npx prisma migrate deploy`
   2. SQLite → Postgres 마이그레이션 스크립트 실행 (스테이징 데이터로 검증).
   3. 애플리케이션을 Prisma/Postgres 경로로 빌드 및 배포.
   4. Smoke test (인벤토리, 장비, 보상 등 핵심 기능).

4. **Monitoring**
   - RDS metrics (CPU, connections, IOPS).
   - 애플리케이션 로그: DB 연결 실패, transaction rollback 등 확인.

## 3. Production Rollout

1. **Pre-deployment Checklist**
   - 마이그레이션 스크립트 dry-run.
   - 백업 확인 (최신 SQLite & Postgres snapshot).
   - 롤백 플랜 문서화:
     - 긴급 시 Postgres snapshot 복원.
     - 애플리케이션 환경변수로 SQLite path로 되돌릴 수 있는지 확인.

2. **Deployment Strategy**
   - Step 1: 서비스 Read-Only 모드 전환 (짧은 다운타임 허용).
   - Step 2: 최종 SQLite 데이터 덤프.
   - Step 3: `prisma migrate deploy` 실행 (production DB).
   - Step 4: 데이터 이관 스크립트 실행.
   - Step 5: 애플리케이션 환경변수 교체 (`DATABASE_URL` → Postgres).
   - Step 6: 서비스 재시작 및 기능 테스트.

3. **Post-deployment Monitoring**
   - 실시간 동작 확인 (보상 수령, 장비 장착, 대장간 기능 등).
   - DB 쿼리 모니터링 (slow query 로그).
   - 에러 트래킹 (Sentry 등).

4. **Rollback Plan**
   - 장애 발생 시:
     1. 서비스 read-only.
     2. Postgres snapshot 시점으로 복원.
     3. 애플리케이션을 SQLite 모드로 임시 롤백.
     4. 문제 분석 후 재시도.

## 4. Integration Testing

1. **Test Suites**
   - Unit tests for Prisma repositories.
   - Integration tests hitting action handlers with transaction boundaries.
   - Scenario coverage:
     - 보상 수령 → 인벤토리/골드 업데이트.
     - 장비 장착/해제 → `user_equipment` 반영.
     - 대장간 강화 → 인벤토리 항목 업데이트 + 히스토리 기록.
     - 싱글플레이/토너먼트 보상 → 수동/자동 동작.

2. **Test Data Reset**
   - `prisma db seed` 또는 커스텀 스크립트로 기본 데이터 로딩.
   - 테스트 종료 후 `prisma migrate reset`.

## 5. Ongoing Maintenance

- **Schema Changes**: 항상 Prisma migration으로 관리.
- **Backups**: Postgres 자동 백업 + 수동 `pg_dump` (주단위).
- **Performance**: 인덱스 최적화, 정기 통계 분석 (`ANALYZE`).
- **Observability**: DB connection pool 모니터링, 알림 설정.


