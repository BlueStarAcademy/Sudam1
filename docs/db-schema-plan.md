# Database Schema Redesign (PostgreSQL Target)

## Goals

- 분리된 테이블 구조로 `users` 의 대용량 JSON 컬럼 의존 탈피
- 트랜잭션 기반 갱신 및 부분 업데이트 가능 구조
- 감사용 히스토리·로그 확장 대비
- 마이그레이션 및 롤백이 용이한 Prisma/SQL 기반 관리

---

## Core Tables

### `users`

| column              | type            | notes                               |
|---------------------|-----------------|--------------------------------------|
| `id`                | uuid (PK)       | 기존 `user.id` 유지                  |
| `nickname`          | text            | unique                              |
| `email`/`username`  | text            | 필요 시                              |
| `strategy_level`    | int             |                                      |
| `strategy_xp`       | int             |                                      |
| `playful_level`     | int             |                                      |
| `playful_xp`        | int             |                                      |
| `action_point_curr` | int             |                                      |
| `action_point_max`  | int             |                                      |
| `gold`              | bigint          |                                      |
| `diamonds`          | bigint          |                                      |
| `league`            | enum            |                                      |
| `tournament_score`  | int             |                                      |
| `status`            | jsonb           | 세션/대기실 상태 등 저장             |
| `created_at`        | timestamptz     | default now()                        |
| `updated_at`        | timestamptz     |                                      |
| `version`           | int             | optimistic locking (default 0)       |

> 기존 JSON 필드(인벤토리, 장비, 퀘스트 등)는 모두 별도 테이블로 이동.

### `user_inventory`

| column             | type        | notes                                                  |
|--------------------|-------------|-------------------------------------------------------|
| `id`               | uuid (PK)   | 개별 인벤토리 아이템 식별자                           |
| `user_id`          | uuid (FK)   | `users.id`                                            |
| `template_id`      | text        | 아이템 템플릿/마스터 ID                               |
| `quantity`         | int         | stackable 일 경우                                     |
| `slot`             | text        | 장비 슬롯 (fan/top/board 등)                          |
| `enhancement_lvl`  | int         | 강화 레벨                                             |
| `stars`            | int         | 별 수                                                  |
| `rarity`           | enum        | normal/rare/epic/legendary/mythic                     |
| `metadata`         | jsonb       | 옵션, 추가 속성(예: 옵션 롤 결과 등)                  |
| `is_equipped`      | boolean     | 일부 UI 용 (실제 장착 관계는 `user_equipment` 참조)   |
| `created_at`       | timestamptz |                                                       |
| `updated_at`       | timestamptz |                                                       |
| `version`          | int         |                                                       |

### `user_equipment`

| column            | type      | notes                                              |
|-------------------|-----------|---------------------------------------------------|
| `id`              | uuid (PK) |                                                   |
| `user_id`         | uuid (FK) |                                                   |
| `slot`            | text      | fan/top/board/...                                 |
| `inventory_id`    | uuid (FK) | `user_inventory.id`, NULL 허용(빈 슬롯)           |
| `created_at`      | timestamptz |                                                |
| `updated_at`      | timestamptz |                                                |
| `version`         | int       |                                                   |

> 장착 아이템은 인벤토리 레코드와 참조 관계를 맺음. 슬롯 교체 시 `user_equipment` 업데이트.

### `user_mail`

별도 테이블로 분리 (첨부 아이템은 `user_inventory` 와 연계하거나 `mail_attachments` 보조 테이블 사용).

### `user_quests`, `user_missions`

유사한 패턴으로 `progress`, `status`, `metadata` 등을 jsonb 로 보관하는 행 기반 구조.

### `inventory_history` (Audit)

| column         | type        | notes                                 |
|----------------|-------------|---------------------------------------|
| `id`           | uuid (PK)   |                                       |
| `user_id`      | uuid        |                                       |
| `inventory_id` | uuid        | 대상 아이템                           |
| `action`       | text        | `equip`, `unequip`, `reward`, etc.    |
| `delta`        | jsonb       | 변화량/상태                           |
| `created_at`   | timestamptz | default now()                         |

---

## Keys & Indexes

- `user_inventory`: `(user_id)`, `(user_id, template_id)`, `(user_id, slot, is_equipped)`
- `user_equipment`: unique `(user_id, slot)`
- `user_mail`: `(user_id, read, created_at)`
- `inventory_history`: `(user_id, created_at desc)`

---

## Relation Diagram (요약)

```
users (1) ───< user_inventory
  │             │
  │             └── user_equipment (참조)
  ├── user_mail
  ├── user_quests
  └── user_missions
```

---

## Migration Strategy (요약)

1. 신규 테이블 생성 (Prisma Schema or raw SQL).
2. SQLite → PostgreSQL 데이터 덤프 / 변환 스크립트 실행:
   - `users` 기본정보 + 신규 컬럼 세팅
   - `users.inventory` JSON → `user_inventory` insert
   - `users.equipment` JSON → `user_equipment` insert
   - 기타 JSON 필드(`mail`, `quests`, `missions`) 동일하게 변환
3. 애플리케이션 레이어 리팩터링:
   - `db.updateUser` 대신 세분화된 repository 함수 사용
   - 트랜잭션 적용
4. 충분한 테스트 후 구 JSON 컬럼 제거.

---

## Next Steps

1. Prisma schema 정의 및 마이그레이션 파일 생성 (`todos/t2`).
2. Repository/서비스 계층 분리 (`todos/t3`).
3. Postgres 환경 구축 및 배포 계획 수립 (`todos/t4`).


