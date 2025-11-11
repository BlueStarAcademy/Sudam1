# SUDAM 앱 전체 구조 문서

## 📋 프로젝트 개요

**SUDAM (Supreme Universe of Dueling Ascending Masters)** - 바둑(Go) 게임 기반의 멀티플레이어 전략 게임 플랫폼

- **프론트엔드**: React + TypeScript + Vite
- **백엔드**: Node.js + Express + TypeScript
- **데이터베이스**: SQLite
- **실시간 통신**: WebSocket (ws)
- **AI**: Google Gemini API, KataGo

---

## 🏗️ 프로젝트 구조

```
SUDAM/
├── 📁 프론트엔드 (클라이언트)
│   ├── components/          # React 컴포넌트들
│   ├── contexts/           # React Context (상태 관리)
│   ├── hooks/             # Custom React Hooks
│   ├── services/          # 클라이언트 서비스 (오디오, 에셋)
│   ├── types/             # TypeScript 타입 정의
│   ├── constants/         # 상수 정의
│   ├── utils/             # 유틸리티 함수
│   ├── public/            # 정적 파일 (이미지, 사운드, SGF)
│   ├── App.tsx            # 메인 앱 컴포넌트
│   ├── Game.tsx           # 게임 뷰 컴포넌트
│   └── index.tsx          # 앱 진입점
│
├── 📁 백엔드 (서버)
│   ├── server/
│   │   ├── actions/       # 액션 핸들러 (API 엔드포인트 처리)
│   │   ├── modes/         # 게임 모드별 로직
│   │   ├── repositories/  # 데이터베이스 레포지토리
│   │   ├── db/            # 데이터베이스 연결
│   │   ├── server.ts      # Express 서버 메인
│   │   ├── socket.ts      # WebSocket 서버
│   │   ├── gameActions.ts # 게임 액션 처리
│   │   ├── gameModes.ts   # 게임 모드 관리
│   │   └── ...
│   └── database.sqlite     # SQLite 데이터베이스
│
└── 📁 설정 파일
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── ...
```

---

## 🔄 데이터 흐름 (Data Flow)

### 1. **클라이언트 → 서버 통신**
```
사용자 액션 → useApp.handleAction() → POST /api/action → server.handleAction() → DB 업데이트
```

### 2. **서버 → 클라이언트 통신 (실시간)**
```
서버 상태 변경 → WebSocket.broadcast() → 클라이언트 WebSocket 수신 → useApp의 useEffect → 상태 업데이트
```

### 3. **상태 관리 구조**
```
App.tsx
  └── AppProvider (AppContext)
      └── useApp() Hook
          ├── 로컬 상태 (useState)
          ├── WebSocket 연결
          ├── 라우팅 관리
          └── 액션 핸들러
```

---

## 📂 주요 디렉토리 상세

### **프론트엔드**

#### `components/` - React 컴포넌트
- **게임 관련**
  - `GameArena.tsx` - 게임 아레나 메인
  - `GoBoard.tsx` - 바둑판 렌더링
  - `game/` - 게임 내부 컴포넌트 (Sidebar, PlayerPanel, GameControls 등)
  
- **아레나 모드**
  - `arenas/` - 다양한 게임 모드 아레나 (Alkkagi, Curling, DiceGo, ThiefGo 등)
  
- **UI 컴포넌트**
  - `Header.tsx` - 상단 헤더
  - `Lobby.tsx` - 로비
  - `WaitingRoom.tsx` - 대기실
  - `Profile.tsx` - 프로필
  - `Router.tsx` - 라우팅 처리
  
- **모달**
  - `InventoryModal.tsx` - 인벤토리
  - `ShopModal.tsx` - 상점
  - `QuestsModal.tsx` - 퀘스트
  - `BlacksmithModal.tsx` - 대장간
  - `modals/` - 기타 모달들

#### `contexts/AppContext.tsx`
- React Context Provider
- `useApp()` 훅을 통해 전역 상태 제공

#### `hooks/`
- `useApp.ts` - **핵심 훅**: 전체 앱 상태 관리
  - 사용자 상태
  - 라우팅
  - WebSocket 연결
  - 액션 핸들러
  - 모달 상태
- `useAppContext.ts` - Context 접근 훅
- `useAppSettings.ts` - 설정 관리
- `useClientTimer.ts` - 클라이언트 타이머

#### `services/`
- `audioService.ts` - 사운드 재생
- `assetService.ts` - 이미지 프리로딩
- `effectService.ts` - 이펙트 계산
- `statService.ts` - 스탯 계산

#### `types/` - TypeScript 타입 정의
- `entities.ts` - 주요 엔티티 (User, Game, Item 등)
- `enums.ts` - 열거형 타입
- `api.ts` - API 타입
- `navigation.ts` - 라우팅 타입
- `settings.ts` - 설정 타입
- `index.ts` - 타입 재export (barrel file)

#### `constants/`
- 게임 모드, 아이템, 퀘스트, 랭킹 등 상수 정의

---

### **백엔드**

#### `server/actions/` - 액션 핸들러
서버의 `/api/action` 엔드포인트에서 처리하는 다양한 액션들:
- `userActions.ts` - 사용자 관련 액션
- `gameActions.ts` - 게임 관련 액션
- `inventoryActions.ts` - 인벤토리 액션
- `shopActions.ts` - 상점 액션
- `tournamentActions.ts` - 토너먼트 액션
- `adminActions.ts` - 관리자 액션
- 등등...

#### `server/modes/` - 게임 모드별 로직
- `standard.ts` - 표준 바둑 모드
- `playful.ts` - 플레이풀 모드 (재미있는 바리ante)
- `strategic.ts` - 전략 모드
- `alkkagi.ts` - 알까기 모드
- `curling.ts` - 컬링 모드
- `diceGo.ts` - 주사위 바둑
- `thief.ts` - 도둑 모드
- `hidden.ts` - 히든 스톤 모드
- 등등...

#### `server/repositories/` - 데이터베이스 레포지토리
- `userRepository.ts` - 사용자 데이터 접근
- `gameRepository.ts` - 게임 데이터 접근
- `kvRepository.ts` - 키-값 저장소
- `mappers.ts` - 데이터 매핑

#### `server/server.ts` - Express 서버
- HTTP API 엔드포인트 (`/api/action`)
- 주기적 게임 상태 업데이트 (setInterval)
- 액션 포인트 재생성
- 퀘스트 진행 업데이트
- 토너먼트 시뮬레이션

#### `server/socket.ts` - WebSocket 서버
- 실시간 상태 동기화
- 브로드캐스트 메시지 전송

---

## 🔌 주요 기능

### 1. **인증 및 사용자 관리**
- 로그인/회원가입
- 세션 관리 (sessionStorage)
- 프로필 관리

### 2. **게임 시스템**
- 다양한 게임 모드 (표준, 플레이풀, 전략, 특수 모드)
- 실시간 멀티플레이어 게임
- AI 대전 (KataGo, Gemini)
- 싱글 플레이어 모드

### 3. **인벤토리 및 장비 시스템**
- 아이템 수집 및 관리
- 장비 강화 (Enhancement)
- 대장간 기능 (조합, 분해, 변환)
- 장비 프리셋

### 4. **경제 시스템**
- 골드/다이아몬드
- 상점
- 퀘스트 보상
- 랭킹 보상

### 5. **토너먼트**
- 네이버후드/내셔널/월드 토너먼트
- 자동 시뮬레이션
- 리그 시스템

### 6. **퀘스트 시스템**
- 일일/주간/월간 퀘스트
- 미션 진행도 추적
- 보상 지급

### 7. **관리자 기능**
- 사용자 관리
- 서버 설정
- 메일 시스템

---

## 🔄 주요 워크플로우

### **게임 시작 플로우**
```
1. 사용자가 로비에서 게임 모드 선택
2. 대기실에서 상대방 매칭
3. 협상 (Negotiation) - 게임 설정
4. 게임 시작 → Game.tsx 렌더링
5. 게임 진행 → WebSocket으로 실시간 동기화
6. 게임 종료 → 요약 및 보상
```

### **액션 처리 플로우**
```
1. 클라이언트: handleAction() 호출
2. POST /api/action 요청
3. 서버: handleAction() 처리
4. DB 업데이트
5. WebSocket으로 브로드캐스트
6. 클라이언트: 상태 업데이트
```

### **라우팅 시스템**
```
URL 해시 (#/profile, #/game/:id 등)
  → parseHash() 
  → currentRoute 상태 업데이트
  → Router.tsx에서 컴포넌트 렌더링
```

---

## 📊 데이터베이스 스키마 (주요 테이블)

### `users` 테이블
- 사용자 정보, 인벤토리, 장비, 스탯, 퀘스트 등

### `live_games` 테이블
- 진행 중인 게임 상태
- 보드 상태, 이동 기록, 타이머 등

### `user_credentials` 테이블
- 사용자 인증 정보

### `kv` 테이블
- 키-값 저장소 (설정 등)

---

## 🛠️ 기술 스택

### 프론트엔드
- **React 18** - UI 프레임워크
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구
- **Tailwind CSS** - 스타일링
- **WebSocket (ws)** - 실시간 통신

### 백엔드
- **Node.js** - 런타임
- **Express** - HTTP 서버
- **TypeScript** - 타입 안정성
- **SQLite** - 데이터베이스
- **WebSocket (ws)** - 실시간 통신

### AI/외부 서비스
- **Google Gemini API** - AI 분석
- **KataGo** - 바둑 AI 엔진

---

## 🔍 주요 파일 설명

### **프론트엔드**

| 파일 | 역할 |
|------|------|
| `App.tsx` | 메인 앱 컴포넌트, 모달 관리 |
| `Game.tsx` | 게임 뷰 컴포넌트 |
| `hooks/useApp.ts` | 전체 앱 상태 관리 훅 (핵심) |
| `components/Router.tsx` | 라우팅 로직 |
| `contexts/AppContext.tsx` | Context Provider |

### **백엔드**

| 파일 | 역할 |
|------|------|
| `server/server.ts` | Express 서버, 메인 게임 루프 |
| `server/socket.ts` | WebSocket 서버 |
| `server/gameActions.ts` | 게임 액션 처리 |
| `server/gameModes.ts` | 게임 모드 관리 |
| `server/db.ts` | 데이터베이스 접근 |
| `server/actions/*.ts` | 각종 액션 핸들러 |

---

## ⚠️ 주의사항

1. **Import 경로**: 많은 파일에서 `.js` 확장자를 사용하지만 실제로는 `.ts` 파일을 import
2. **WebSocket 포트**: 기본 4001 포트
3. **HTTP API 포트**: 기본 4000 포트
4. **상태 관리**: Context API + useState 조합
5. **데이터베이스**: SQLite 파일 기반

---

## 🚀 실행 방법

```bash
# 의존성 설치
npm install

# 환경 변수 설정 (.env.local)
GEMINI_API_KEY=your_key

# 개발 서버 실행 (클라이언트 + 서버 동시)
npm start

# 빌드
npm run build
```

---

이 문서는 앱의 전체 구조를 파악하기 위한 개요입니다. 
더 자세한 정보는 각 파일의 주석과 코드를 참고하세요.









