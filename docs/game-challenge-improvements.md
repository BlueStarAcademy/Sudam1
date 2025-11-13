# 대국 신청 시스템 개선 제안서

## 발견된 문제점 및 수정 제안

### 1. 대기실 이탈 시 Negotiation 정리 누락

**문제점:**
- `LEAVE_WAITING_ROOM` 액션에서 사용자가 보낸 negotiation을 정리하지 않음
- challenger가 대기실을 나가도 negotiation이 남아있어 opponent가 수락할 수 있음
- 수락 후 게임이 생성되지만 challenger는 게임에 참여하지 못하는 상황 발생

**수정 제안:**
```typescript
// server/actions/socialActions.ts
case 'LEAVE_WAITING_ROOM': {
    const userStatus = volatileState.userStatuses[user.id];
    if (userStatus && (userStatus.status === UserStatus.Waiting || userStatus.status === UserStatus.Resting)) {
        userStatus.status = UserStatus.Online;
        delete userStatus.mode;
    }
    
    // 사용자가 보낸 negotiation 정리
    const userNegotiations = Object.keys(volatileState.negotiations).filter(negId => {
        const neg = volatileState.negotiations[negId];
        return neg.challenger.id === user.id && neg.status === 'pending';
    });
    
    for (const negId of userNegotiations) {
        const neg = volatileState.negotiations[negId];
        // opponent 상태 복구
        if (volatileState.userStatuses[neg.opponent.id]?.status === UserStatus.Negotiating) {
            volatileState.userStatuses[neg.opponent.id].status = UserStatus.Waiting;
        }
        delete volatileState.negotiations[negId];
    }
    
    broadcast({ type: 'USER_STATUS_UPDATE', payload: volatileState.userStatuses });
    broadcast({ type: 'NEGOTIATION_UPDATE', payload: { negotiations: volatileState.negotiations, userStatuses: volatileState.userStatuses } });
    return {};
}
```

### 2. ACCEPT_NEGOTIATION에서 Challenger 상태 확인 누락

**문제점:**
- `ACCEPT_NEGOTIATION`에서 challenger가 이미 대기실을 나갔는지 확인하지 않음
- challenger가 나간 상태에서 수락되면 게임이 생성되지만 무효 처리되지 않음
- 행동력이 소모되지만 게임이 제대로 진행되지 않음

**수정 제안:**
```typescript
// server/actions/negotiationActions.ts
case 'ACCEPT_NEGOTIATION': {
    const { negotiationId, settings } = payload;
    const negotiation = volatileState.negotiations[negotiationId];
    if (!negotiation || negotiation.proposerId !== user.id || negotiation.status !== 'pending') {
        return { error: 'Cannot accept this negotiation now.' };
    }
    
    // challenger가 이미 대기실을 나갔는지 확인
    const challengerStatus = volatileState.userStatuses[negotiation.challenger.id];
    if (!challengerStatus || (challengerStatus.status !== UserStatus.Negotiating && challengerStatus.status !== UserStatus.Waiting)) {
        // challenger가 이미 나간 경우 negotiation 삭제 및 opponent 상태 복구
        if (volatileState.userStatuses[negotiation.opponent.id]?.status === UserStatus.Negotiating) {
            volatileState.userStatuses[negotiation.opponent.id].status = UserStatus.Waiting;
        }
        delete volatileState.negotiations[negotiationId];
        broadcast({ type: 'NEGOTIATION_UPDATE', payload: { negotiations: volatileState.negotiations, userStatuses: volatileState.userStatuses } });
        return { error: '상대방이 대기실을 나갔습니다. 대국 신청이 취소되었습니다.' };
    }
    
    const challenger = await db.getUser(negotiation.challenger.id);
    const opponent = await db.getUser(negotiation.opponent.id);
    if (!challenger || !opponent) return { error: "One of the players could not be found." };

    // ... 기존 로직 ...
}
```

### 3. 게임 시작 시간 추적 누락

**문제점:**
- 게임 시작 시간(`gameStartTime`)이 저장되지 않음
- 1분 이내 기권 감지 불가능

**수정 제안:**
```typescript
// server/gameModes.ts (initializeGame 함수)
export const initializeGame = async (negotiation: Negotiation): Promise<LiveGameSession> => {
    // ... 기존 로직 ...
    
    const game: LiveGameSession = {
        // ... 기존 필드들 ...
        gameStartTime: Date.now(), // 게임 시작 시간 추가
        // ...
    };
    
    return game;
};
```

### 4. 조기 종료 감지 및 행동력 환불 로직 부재

**문제점:**
- 10턴 이내 종료 감지 없음
- 1분 이내 기권 감지 없음
- 행동력 환불 로직 없음

**수정 제안:**
```typescript
// server/summaryService.ts
export const endGame = async (game: LiveGameSession, winner: Player, winReason: WinReason): Promise<void> => {
    if (game.gameStatus === 'ended' || game.gameStatus === 'no_contest') {
        return;
    }
    
    const now = Date.now();
    const gameStartTime = game.gameStartTime || game.createdAt || now;
    const gameDuration = now - gameStartTime;
    const moveCount = game.moveHistory?.filter(m => m.x !== -1 && m.y !== -1).length || 0;
    
    // 조기 종료 조건 확인 (10턴 이내 또는 1분 이내 기권)
    const isEarlyTermination = (moveCount <= 10 || gameDuration < 60000) && 
                                (winReason === 'resign' || winReason === 'disconnect');
    
    // 비매너 행동자 식별 (조기 종료를 한 사람)
    let badMannerPlayerId: string | null = null;
    if (isEarlyTermination) {
        if (winReason === 'resign') {
            // 기권한 사람이 비매너 행동자
            badMannerPlayerId = winner === Player.Black ? game.whitePlayerId! : game.blackPlayerId!;
        } else if (winReason === 'disconnect') {
            // 접속 끊긴 사람이 비매너 행동자
            const disconnectedPlayerId = game.lastTimeoutPlayerId || 
                                        (winner === Player.Black ? game.whitePlayerId! : game.blackPlayerId!);
            badMannerPlayerId = disconnectedPlayerId;
        }
    }
    
    game.winner = winner;
    game.winReason = winReason;
    game.gameStatus = 'ended';
    game.isEarlyTermination = isEarlyTermination; // 조기 종료 플래그
    game.badMannerPlayerId = badMannerPlayerId; // 비매너 행동자 ID

    // ... 기존 게임 종료 처리 로직 ...
    
    // 조기 종료인 경우 행동력 환불 처리
    if (isEarlyTermination && !game.isSinglePlayer) {
        await refundActionPointsForEarlyTermination(game, badMannerPlayerId);
    }
    
    // ... 나머지 로직 ...
};

// 행동력 환불 함수
const refundActionPointsForEarlyTermination = async (
    game: LiveGameSession, 
    badMannerPlayerId: string | null
): Promise<void> => {
    const { SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES, STRATEGIC_ACTION_POINT_COST, PLAYFUL_ACTION_POINT_COST } = await import('../constants');
    
    const getActionPointCost = (mode: GameMode): number => {
        if (SPECIAL_GAME_MODES.some(m => m.mode === mode)) {
            return STRATEGIC_ACTION_POINT_COST;
        }
        if (PLAYFUL_GAME_MODES.some(m => m.mode === mode)) {
            return PLAYFUL_ACTION_POINT_COST;
        }
        return STRATEGIC_ACTION_POINT_COST;
    };
    
    const cost = getActionPointCost(game.mode);
    const player1 = await db.getUser(game.player1.id);
    const player2 = await db.getUser(game.player2.id);
    
    if (!player1 || !player2) return;
    
    // 비매너 행동자가 아닌 사람에게만 환불
    if (badMannerPlayerId !== player1.id && !player1.isAdmin) {
        player1.actionPoints.current = Math.min(
            player1.actionPoints.max, 
            player1.actionPoints.current + cost
        );
        player1.lastActionPointUpdate = Date.now();
        await db.updateUser(player1);
    }
    
    if (badMannerPlayerId !== player2.id && !player2.isAdmin) {
        player2.actionPoints.current = Math.min(
            player2.actionPoints.max, 
            player2.actionPoints.current + cost
        );
        player2.lastActionPointUpdate = Date.now();
        await db.updateUser(player2);
    }
    
    // 환불된 사용자에게 브로드캐스트
    const { broadcast } = await import('./socket.js');
    if (badMannerPlayerId !== player1.id) {
        broadcast({ type: 'USER_UPDATE', payload: { [player1.id]: player1 } });
    }
    if (badMannerPlayerId !== player2.id) {
        broadcast({ type: 'USER_UPDATE', payload: { [player2.id]: player2 } });
    }
};
```

### 5. 비매너 행동 패널티 메일 발송 로직 부재

**문제점:**
- 비매너 행동으로 인한 패널티 정보를 메일로 보내는 로직 없음
- 사용자가 자신의 비매너 행동에 대한 패널티를 알 수 없음

**수정 제안:**
```typescript
// server/summaryService.ts (endGame 함수 내)
// 조기 종료인 경우 행동력 환불 처리
if (isEarlyTermination && !game.isSinglePlayer) {
    await refundActionPointsForEarlyTermination(game, badMannerPlayerId);
    
    // 비매너 행동자에게 패널티 메일 발송
    if (badMannerPlayerId) {
        await sendBadMannerPenaltyMail(game, badMannerPlayerId);
    }
}

// 패널티 메일 발송 함수
const sendBadMannerPenaltyMail = async (
    game: LiveGameSession,
    badMannerPlayerId: string
): Promise<void> => {
    const badMannerPlayer = await db.getUser(badMannerPlayerId);
    if (!badMannerPlayer) return;
    
    const opponent = game.player1.id === badMannerPlayerId ? 
                     await db.getUser(game.player2.id) : 
                     await db.getUser(game.player1.id);
    
    if (!opponent) return;
    
    const moveCount = game.moveHistory?.filter(m => m.x !== -1 && m.y !== -1).length || 0;
    const gameStartTime = game.gameStartTime || game.createdAt || Date.now();
    const gameDuration = Date.now() - gameStartTime;
    
    let penaltyReason = '';
    if (moveCount <= 10) {
        penaltyReason = `게임 시작 후 10턴 이내에 종료하여`;
    } else if (gameDuration < 60000) {
        penaltyReason = `게임 시작 후 1분 이내에 종료하여`;
    }
    
    if (game.winReason === 'resign') {
        penaltyReason += ' 기권';
    } else if (game.winReason === 'disconnect') {
        penaltyReason += ' 접속 끊김';
    }
    
    const penaltyMail: Mail = {
        id: `mail-penalty-${randomUUID()}`,
        from: '시스템',
        title: '비매너 행동 패널티 안내',
        message: `안녕하세요, ${badMannerPlayer.nickname}님.\n\n` +
                 `대국 중 비매너 행동으로 인해 패널티가 적용되었습니다.\n\n` +
                 `[패널티 사유]\n` +
                 `${penaltyReason}로 인해 게임이 조기 종료되었습니다.\n\n` +
                 `[적용된 패널티]\n` +
                 `- 매너 점수 감소\n` +
                 `- 행동력 환불 불가 (상대방에게만 환불됨)\n\n` +
                 `정상적인 게임 진행을 위해 협조 부탁드립니다.`,
        receivedAt: Date.now(),
        expiresAt: undefined, // 무제한
        isRead: false,
        attachmentsClaimed: false,
    };
    
    if (!badMannerPlayer.mail) {
        badMannerPlayer.mail = [];
    }
    badMannerPlayer.mail.unshift(penaltyMail);
    
    await db.updateUser(badMannerPlayer);
    
    const { broadcast } = await import('./socket.js');
    broadcast({ type: 'USER_UPDATE', payload: { [badMannerPlayer.id]: badMannerPlayer } });
};
```

### 6. 게임 타입에 gameStartTime 필드 추가

**수정 제안:**
```typescript
// types/entities.ts (LiveGameSession 타입에 추가)
export type LiveGameSession = {
    // ... 기존 필드들 ...
    gameStartTime?: number; // 게임 시작 시간 (초기화 시점)
    isEarlyTermination?: boolean; // 조기 종료 여부
    badMannerPlayerId?: string; // 비매너 행동자 ID
    // ...
};
```

### 7. Negotiation 타임아웃 처리 개선

**문제점:**
- negotiation의 deadline이 지나도 자동으로 정리되지 않을 수 있음
- 만료된 negotiation이 남아있어 문제 발생 가능

**수정 제안:**
```typescript
// server/server.ts (메인 루프에 추가)
const cleanupExpiredNegotiations = (volatileState: VolatileState, now: number): void => {
    const expiredNegIds: string[] = [];
    
    for (const [negId, neg] of Object.entries(volatileState.negotiations)) {
        if (neg.deadline && now > neg.deadline && neg.status === 'pending') {
            expiredNegIds.push(negId);
            
            // 사용자 상태 복구
            if (volatileState.userStatuses[neg.challenger.id]?.status === UserStatus.Negotiating) {
                volatileState.userStatuses[neg.challenger.id].status = UserStatus.Waiting;
            }
            if (volatileState.userStatuses[neg.opponent.id]?.status === UserStatus.Negotiating) {
                volatileState.userStatuses[neg.opponent.id].status = UserStatus.Waiting;
            }
        }
    }
    
    for (const negId of expiredNegIds) {
        delete volatileState.negotiations[negId];
    }
    
    if (expiredNegIds.length > 0) {
        const { broadcast } = require('./socket.js');
        broadcast({ type: 'NEGOTIATION_UPDATE', payload: { negotiations: volatileState.negotiations, userStatuses: volatileState.userStatuses } });
    }
};
```

## 구현 우선순위

1. **높음 (즉시 수정 필요)**
   - LEAVE_WAITING_ROOM에서 negotiation 정리
   - ACCEPT_NEGOTIATION에서 challenger 상태 확인
   - 게임 시작 시간 추적

2. **중간 (다음 업데이트)**
   - 조기 종료 감지 및 행동력 환불
   - 비매너 행동자 식별 및 환불 제외

3. **낮음 (향후 개선)**
   - 패널티 메일 발송
   - Negotiation 타임아웃 처리 개선

## 테스트 시나리오

1. **대기실 이탈 테스트**
   - Challenger가 대기실을 나간 후 opponent가 수락 시도
   - Negotiation이 정리되고 opponent에게 에러 메시지 표시 확인

2. **조기 종료 테스트**
   - 게임 시작 후 10턴 이내 기권
   - 게임 시작 후 1분 이내 기권
   - 행동력 환불 확인 (비매너 행동자 제외)

3. **패널티 메일 테스트**
   - 비매너 행동 후 메일 수신 확인
   - 메일 내용 및 만료일 확인

