# 기능 개발 로드맵 (길드 & 도전의 탑)

## 1. 목표
- 새로운 아키텍처(중앙 상태 관리, WebSocket 이벤트 라우터) 위에서 길드와 도전의 탑 컨텐츠를 확장.
- 실시간 동기화, 분산 환경을 고려한 데이터 모델과 이벤트 계약 정립.
- 운영/배포 프로세스와 연계 가능한 기능별 마일스톤 정의.

## 2. 전제 조건
1. **상태 관리 개편**: `state/` 스토어와 `realtime/eventRouter`가 기본으로 도입되어 있어야 함.
2. **배포 환경 준비**: Docker Compose 또는 클라우드 기반 환경에서 백엔드/프론트엔드/카타고가 정상 동작.
3. **DB 전략**: SQLite → Postgres 마이그레이션 계획. 길드/탑은 동시성 요구도가 높으므로 트랜잭션/락 처리가 필요.

## 3. 길드 시스템 설계안
### 3.1 핵심 기능
- 길드 생성/가입/탈퇴
- 길드 채팅 및 알림
- 길드 레이드/미션 (주간 목표, 누적 점수)
- 길드 상점/기부 시스템

### 3.2 데이터 모델 초안 (Postgres 기준)
- `guilds(id, name, leader_id, created_at, description, emblem, settings_json)`
- `guild_members(guild_id, user_id, role, join_date, contribution_total)`
- `guild_events(id, guild_id, type, payload_json, created_at)`
- `guild_messages(id, guild_id, author_id, content, created_at)`
- `guild_missions(id, guild_id, mission_type, status, progress, target, reset_at)`

### 3.3 상태 동기화
- WebSocket 이벤트 유형:
  - `guild.member.joined`, `guild.member.left`, `guild.mission.updated`, `guild.chat.message`
  - 페이로드는 `types/realtime/guild.ts`에 정의.
- 클라이언트 스토어 예시:
  - `state/guildStore.ts` → `guild`, `members`, `chat`, `missions` 슬라이스.
  - 셀렉터 기반 UI 업데이트 (길드 대시보드, 채팅 창 등을 구독).

### 3.4 API 플로우
```
POST /api/guilds -> createGuild
POST /api/guilds/:id/join -> joinGuild
POST /api/guilds/:id/leave -> leaveGuild
POST /api/guilds/:id/chat -> sendMessage
GET  /api/guilds/:id -> fetchGuildSummary
```
- 모든 변동 액션은 서버에서 DB 트랜잭션 처리 후 WebSocket으로 브로드캐스트.
- 최종 합의 데이터는 REST로도 조회 가능하도록 캐싱(예: Redis) 고려.

### 3.5 마일스톤
1. 길드 생성/가입/탈퇴 + 단순 정보 표시
2. 길드 채팅/공지 (WebSocket 이벤트 포함)
3. 길드 미션 및 주간 보상
4. 길드 상점 및 기부 시스템
5. 길드 레이드(협동 PvE) – 장기 과제

## 4. 도전의 탑 컨텐츠 설계안
### 4.1 핵심 기능
- 탑 층별 스테이지 (AI 대전, 퍼즐 등)
- 주간 리더보드, 보상 시스템
- 실시간 진행 상태(티켓 소비, 진행도) 표시

### 4.2 데이터 모델 초안
- `tower_runs(id, user_id, floor, status, best_score, best_time, created_at, updated_at)`
- `tower_floor_configs(floor, name, ai_difficulty, rewards_json, modifiers_json)`
- `tower_attempts(id, run_id, floor, result, score, clear_time, replay_data)`
- `tower_leaderboard(week_id, user_id, floor, score, rank)`

### 4.3 상태 동기화
- 이벤트 유형:
  - `tower.run.started`, `tower.run.updated`, `tower.run.completed`
  - `tower.leaderboard.updated`
- 클라이언트:
  - `state/towerStore.ts`에서 현재 진행 중인 러닝(run) 상태 + 히스토리 관리.
  - 싱글플레이어 UI와 유사하나, 탑 전용 화면(`components/tower/*`) 구성.

### 4.4 게임 흐름
```
1. 사용자 탑 티켓 확인 -> 시작 버튼
2. 서버: run 생성, KataGo/AI 전투 세션 설정
3. 실시간 경기 → WebSocket으로 상태 갱신
4. 결과 저장 -> 리더보드 갱신 + 보상 지급
```
- 도전 실패 시 재도전 조건(티켓 소비/쿨다운) 체크 필요.

### 4.5 마일스톤
1. 기본 스테이지 클리어 로직 구현 (단일 층 반복)
2. 층별 구성 및 난이도/보상 테이블 추가
3. 주간 리더보드 + 보상 배치
4. 탑 전용 이벤트(예: 제한 룰) 추가

## 5. 기술/운영 고려 사항
- **데이터베이스**: SQLite로는 경합이 심한 테이블에서 문제가 생길 수 있으므로 Postgres 전환이 우선.
- **백엔드 구조**:
  - `server/actions/guildActions.ts`, `towerActions.ts` 신설.
  - 이벤트 발행 → `realtime` 모듈에서 WebSocket 브로드캐스트 (connection registry 활용).
- **테스트 전략**:
  - API 단위 테스트 (Jest/supertest)
  - WebSocket 이벤트 흐름 e2e 테스트.
- **운영 지표**:
  - 길드 DAU/채팅량, 탑 도전 완료율, 리더보드 변동량.
  - 알람: 길드/탑 관련 오류 로그, 큐 대기 시간 등.

## 6. 우선순위 제안
1. DB 마이그레이션 & 상태 관리 구조 확정
2. 길드 기본 기능 (마일스톤 1~2)
3. 도전의 탑 기본 러닝/리더보드 구조
4. 고급 기능(레이드, 이벤트, 추가 모드) 순차 구현

## 7. 일정 샘플 (주 단위)
| 주차 | 작업 |
|------|------|
| 1주차 | DB 전환, guild/tower 스키마 설계, 상태 스토어 scaffolding |
| 2주차 | 길드 생성/가입/정보 UI + WebSocket 이벤트 |
| 3주차 | 길드 채팅 & 미션 1차 |
| 4주차 | 탑 러닝 로직, 층별 데이터 구조 |
| 5주차 | 탑 리더보드/보상, QA 및 튜닝 |
| 이후 | 레이드/이벤트/운영 자동화 |

## 8. 협업 포인트
- **백엔드**: DB 마이그레이션, 이벤트 발행, KataGo 연동 최적화.
- **프론트엔드**: Zustand/Redux 스토어 구성, UI/UX 설계, 컴포넌트 모듈화.
- **운영/기획**: 미션/보상 테이블, 이벤트 스케줄, 경제 밸런싱.
- **QA**: 멀티유저 시나리오, WebSocket 끊김 복구, 보상 중복 방지 케이스.

이 로드맵을 기반으로 세부 작업 티켓을 나누고, 각 마일스톤마다 기능 브랜치 및 QA 계획을 수립하면 효율적으로 신규 컨텐츠를 개발할 수 있습니다.


