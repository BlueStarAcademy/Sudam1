# 싱글플레이 보드 잠금 메커니즘 구현 플랜

## 문제 상황

싱글플레이 모드에서 AI(백)가 돌을 둔 직후 사용자(흑)가 너무 빨리 돌을 두면, 사용자가 둔 돌이 사라지는 버그가 발생합니다.

### 증상
- 콘솔 로그에서 `serverRevision`이 계속 증가하지만 `moveHistoryLength`는 증가하지 않음
- `currentPlayer`가 변경되지 않음
- 사용자가 둔 돌이 클라이언트에서는 보이지만 서버에서 거부됨

### 원인 분석
클라이언트가 AI의 움직임을 처리하기 전에 사용자가 돌을 두려고 시도하면, 클라이언트의 게임 상태가 서버의 최신 상태와 동기화되지 않은 상태에서 움직임을 전송하게 됩니다. 서버는 이 움직임을 유효하지 않은 것으로 판단하여 거부합니다.

## 해결 방법

클라이언트 측에서 `serverRevision`을 추적하고, AI가 돌을 둔 직후(즉, `currentPlayer`가 변경되었을 때) 최신 `serverRevision`을 받을 때까지 보드를 잠가야 합니다.

## 구현 계획

### 1. `Game.tsx` 수정
- `serverRevision` 상태 추가: 마지막으로 받은 `serverRevision`을 추적
- `isBoardLocked` 상태 추가: 보드가 잠겨있는지 여부
- `useEffect`로 `currentPlayer` 변경 감지: AI가 돌을 두면 보드 잠금 활성화
- `useEffect`로 `serverRevision` 변경 감지: 최신 `serverRevision`을 받으면 보드 잠금 해제
- `handleBoardClick`에서 `isBoardLocked` 체크 추가

### 2. `components/arenas/SinglePlayerArena.tsx` 수정
- `isBoardLocked` prop 추가
- `GoBoard`의 `isBoardDisabled`에 `isBoardLocked` 조건 추가

### 3. UI 피드백 (선택사항)
- 보드가 잠겨있을 때 시각적 피드백 제공 (예: 반투명 오버레이 또는 "동기화 중..." 메시지)

## 구현 세부사항

### `Game.tsx` 변경사항

```typescript
// 상태 추가
const [lastReceivedServerRevision, setLastReceivedServerRevision] = useState<number>(session.serverRevision ?? 0);
const [isBoardLocked, setIsBoardLocked] = useState(false);

// currentPlayer 변경 감지 (AI가 돌을 둔 경우)
useEffect(() => {
    if (session.isSinglePlayer && prevCurrentPlayer !== undefined) {
        const wasMyTurn = prevCurrentPlayer === (currentUser.id === player1.id ? Player.Black : Player.White);
        const isNowMyTurn = currentPlayer === (currentUser.id === player1.id ? Player.Black : Player.White);
        
        // AI가 돌을 둔 경우 (내 턴이 아니었다가 내 턴이 된 경우는 제외)
        if (wasMyTurn && !isNowMyTurn) {
            setIsBoardLocked(true);
        }
    }
}, [currentPlayer, prevCurrentPlayer, session.isSinglePlayer, currentUser.id, player1.id]);

// serverRevision 변경 감지 (최신 상태를 받은 경우)
useEffect(() => {
    if (session.isSinglePlayer && session.serverRevision !== undefined) {
        const newRevision = session.serverRevision;
        if (newRevision > lastReceivedServerRevision) {
            setLastReceivedServerRevision(newRevision);
            // 최신 상태를 받았으므로 잠금 해제
            setIsBoardLocked(false);
        }
    }
}, [session.serverRevision, session.isSinglePlayer, lastReceivedServerRevision]);

// handleBoardClick 수정
const handleBoardClick = useCallback((x: number, y: number) => {
    audioService.stopTimerWarning();
    if (isSpectator || gameStatus === 'missile_animating') return;
    if (session.isSinglePlayer && isPaused) return;
    if (session.isSinglePlayer && isBoardLocked) return; // 잠금 상태 체크 추가
    
    // ... 나머지 로직
}, [/* ... 기존 dependencies ... */, isBoardLocked]);
```

### `components/arenas/SinglePlayerArena.tsx` 변경사항

```typescript
interface SinglePlayerArenaProps extends GameProps {
    // ... 기존 props ...
    isBoardLocked?: boolean; // 추가
}

const SinglePlayerArena: React.FC<SinglePlayerArenaProps> = (props) => {
    // ... 기존 코드 ...
    const { isBoardLocked = false } = props;
    
    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
            <div className={`w-full h-full transition-opacity duration-500 ${isPaused ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <GoBoard
                    // ... 기존 props ...
                    isBoardDisabled={!isMyTurn || isSpectator || isPaused || isBoardLocked} // isBoardLocked 추가
                    // ... 나머지 props ...
                />
            </div>
            {/* 잠금 상태 시각적 피드백 (선택사항) */}
            {isBoardLocked && !isPaused && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/20 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm">
                        동기화 중...
                    </div>
                </div>
            )}
            {/* ... 기존 pause UI ... */}
        </div>
    );
};
```

### `Game.tsx`에서 `SinglePlayerArena`에 prop 전달

```typescript
<SinglePlayerArena
    // ... 기존 props ...
    isBoardLocked={isBoardLocked}
/>
```

## 테스트 시나리오

1. **정상 케이스**: AI가 돌을 두고 잠시 후 사용자가 돌을 두는 경우
   - 예상: 정상적으로 돌이 놓임

2. **버그 케이스 (수정 전)**: AI가 돌을 둔 직후 즉시 사용자가 돌을 두는 경우
   - 예상 (수정 전): 돌이 사라짐
   - 예상 (수정 후): 보드가 잠겨있어 클릭이 무시되거나, 동기화 완료 후 정상적으로 돌이 놓임

3. **엣지 케이스**: 네트워크 지연으로 `serverRevision` 업데이트가 늦는 경우
   - 예상: 보드가 잠겨있어 잘못된 움직임이 전송되지 않음

## 참고 파일

- `Game.tsx`: 메인 게임 컴포넌트, 보드 잠금 로직 구현
- `components/arenas/SinglePlayerArena.tsx`: 싱글플레이 아레나, 보드 잠금 상태 전달
- `hooks/useApp.ts`: WebSocket `GAME_UPDATE` 처리 (이미 `serverRevision` 로깅 중)

## 추가 개선 사항 (선택사항)

1. **타임아웃 메커니즘**: 일정 시간(예: 5초) 이상 `serverRevision`이 업데이트되지 않으면 잠금 해제
2. **에러 처리**: 서버에서 움직임이 거부된 경우 사용자에게 알림 (토스트 메시지)
3. **로깅**: 보드 잠금/해제 이벤트를 콘솔에 로깅하여 디버깅 용이성 향상

