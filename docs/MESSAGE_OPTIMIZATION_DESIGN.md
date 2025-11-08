# 서버 메시지 최적화 설계

## 현재 문제점 분석

### 1. 무거운 메시지의 원인
- **전체 User 객체 전송**: 매 액션마다 inventory, equipment, quests, stats 등 모든 필드 포함 (수백 KB)
- **전체 Game 객체 전송**: boardState, moveHistory 등 모든 게임 상태 포함
- **중복 데이터 전송**: 변경되지 않은 필드도 매번 전송
- **INITIAL_STATE 과부하**: 모든 사용자, 게임, 채팅 데이터를 한 번에 전송

### 2. 성능 영향
- 네트워크 대역폭 낭비
- 서버 CPU 사용량 증가 (JSON 직렬화/역직렬화)
- 클라이언트 메모리 사용량 증가
- 응답 지연 시간 증가

## 근본적인 해결 방안

### 1. 델타 업데이트 시스템 (Delta Update System)

#### 개념
- 변경된 필드만 전송하는 시스템
- 이전 상태와 현재 상태를 비교하여 차이만 전송

#### 구현 방법
```typescript
// 서버 측: 변경된 필드만 추출
function getDeltaUpdate(oldUser: User, newUser: User): Partial<User> {
    const delta: Partial<User> = {};
    
    // 변경된 필드만 추출
    if (JSON.stringify(oldUser.inventory) !== JSON.stringify(newUser.inventory)) {
        delta.inventory = newUser.inventory;
    }
    if (oldUser.gold !== newUser.gold) {
        delta.gold = newUser.gold;
    }
    // ... 다른 필드들
    
    return delta;
}
```

#### 장점
- 메시지 크기 대폭 감소 (90% 이상)
- 네트워크 트래픽 감소
- 처리 속도 향상

### 2. 액션 배칭 시스템 (Action Batching)

#### 개념
- 여러 액션을 하나의 요청으로 묶어서 처리
- 클라이언트에서 빠른 연속 액션을 자동으로 배치

#### 구현 방법
```typescript
// 클라이언트 측: 액션 큐와 배칭
class ActionBatcher {
    private queue: ServerAction[] = [];
    private batchTimeout: number = 50; // 50ms 배치
    
    async addAction(action: ServerAction) {
        this.queue.push(action);
        
        // 배치 타임아웃 후 일괄 처리
        if (this.queue.length === 1) {
            setTimeout(() => this.flush(), this.batchTimeout);
        }
    }
    
    async flush() {
        if (this.queue.length === 0) return;
        
        const batch = this.queue.splice(0);
        await fetch('/api/action/batch', {
            method: 'POST',
            body: JSON.stringify({ actions: batch })
        });
    }
}
```

#### 장점
- 요청 횟수 감소
- 서버 부하 분산
- 네트워크 오버헤드 감소

### 3. 선택적 필드 반환 (Selective Field Return)

#### 개념
- 액션 타입에 따라 필요한 필드만 반환
- 클라이언트가 요청한 필드만 반환

#### 구현 방법
```typescript
// 서버 측: 필드 선택 반환
function getSelectiveUserUpdate(user: User, actionType: string, requestedFields?: string[]): Partial<User> {
    const fieldMap: Record<string, string[]> = {
        'USE_ITEM': ['inventory', 'gold', 'diamonds'],
        'TOGGLE_EQUIP_ITEM': ['inventory', 'equipment', 'actionPoints'],
        'UPDATE_AVATAR': ['avatarId'],
        // ...
    };
    
    const fields = requestedFields || fieldMap[actionType] || ['inventory', 'equipment', 'gold', 'diamonds'];
    const result: Partial<User> = { id: user.id };
    
    for (const field of fields) {
        if (field in user) {
            result[field] = user[field];
        }
    }
    
    return result;
}
```

#### 장점
- 불필요한 데이터 전송 방지
- 메시지 크기 최소화
- 명확한 데이터 요구사항

### 4. 상태 버전 관리 (State Versioning)

#### 개념
- 각 엔티티에 버전 번호를 부여
- 클라이언트가 최신 버전을 요청하거나 변경사항만 요청

#### 구현 방법
```typescript
// 서버 측: 버전 관리
interface VersionedEntity {
    id: string;
    version: number;
    data: any;
}

// 클라이언트가 특정 버전 이후의 변경사항만 요청
GET /api/user/updates?sinceVersion=123
```

#### 장점
- 증분 업데이트 가능
- 동기화 효율성 향상
- 충돌 감지 가능

### 5. 메시지 압축 (Message Compression)

#### 개념
- 큰 메시지를 압축하여 전송
- gzip 또는 brotli 압축 사용

#### 구현 방법
```typescript
// 서버 측: 압축 미들웨어
import compression from 'compression';

app.use(compression({
    filter: (req, res) => {
        // 큰 응답만 압축
        return res.getHeader('content-length') > 1024;
    }
}));
```

#### 장점
- 전송 데이터 크기 감소 (60-80%)
- 네트워크 대역폭 절약

### 6. 클라이언트 측 캐싱 및 디바운싱

#### 개념
- 클라이언트에서 중복 요청 방지
- 빠른 연속 액션을 디바운싱

#### 구현 방법
```typescript
// 클라이언트 측: 디바운싱
function debounceAction(action: ServerAction, delay: number = 100) {
    // 동일한 액션이 연속으로 발생하면 마지막 것만 실행
}
```

## 구현 우선순위

### Phase 1: 즉시 적용 가능 (High Impact, Low Risk)
1. **선택적 필드 반환**: 액션 타입별 필요한 필드만 반환
2. **메시지 압축**: Express compression 미들웨어 추가
3. **클라이언트 디바운싱**: 빠른 연속 액션 방지

### Phase 2: 중기 개선 (High Impact, Medium Risk)
1. **델타 업데이트**: 변경된 필드만 전송
2. **액션 배칭**: 여러 액션을 하나로 묶기

### Phase 3: 장기 개선 (Medium Impact, High Risk)
1. **상태 버전 관리**: 버전 기반 증분 업데이트
2. **WebSocket 최적화**: 메시지 타입별 최적화

## 예상 효과

### 메시지 크기 감소
- **현재**: 평균 50-200KB per action
- **최적화 후**: 평균 5-20KB per action (90% 감소)

### 네트워크 트래픽 감소
- **현재**: 사용자당 시간당 ~10-50MB
- **최적화 후**: 사용자당 시간당 ~1-5MB (90% 감소)

### 서버 부하 감소
- JSON 직렬화/역직렬화 시간 90% 감소
- 메모리 사용량 70% 감소
- CPU 사용량 60% 감소

## 마이그레이션 전략

1. **하위 호환성 유지**: 기존 전체 객체 반환 방식과 병행
2. **점진적 적용**: 액션 타입별로 하나씩 적용
3. **모니터링**: 메시지 크기와 성능 지표 추적
4. **롤백 계획**: 문제 발생 시 즉시 롤백 가능

