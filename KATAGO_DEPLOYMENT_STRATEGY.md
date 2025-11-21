# KataGo 배포 전략

## 현재 상태

### ✅ Graceful Degradation 구현됨
- KataGo가 없어도 서버는 정상 작동
- 초기화 실패 시 로그만 남기고 계속 진행
- 자체 구현한 Go AI 봇(`goAiBot.ts`)이 있어서 KataGo 없이도 게임 플레이 가능

### 현재 KataGo 사용처
1. **게임 분석** (`analyzeGame`): 승률, 점수 차이, 소유권 분석
2. **AI 플레이어** (`makeStrategicAiMove`): KataGo 분석을 참고하지만 실패 시 fallback 있음

## Railway 배포 제약사항

### 문제점
1. **플랫폼 불일치**: 현재 Windows 바이너리(`katago.exe`) 사용 중
   - Railway는 Linux 컨테이너 사용
   - Linux용 KataGo 바이너리 필요

2. **GPU 제약**: KataGo는 GPU가 있으면 더 빠르지만, Railway는 GPU 미지원
   - CPU 모드로 실행 가능하지만 느림

3. **파일 크기**: 모델 파일이 큼 (수백 MB)
   - Docker 이미지 크기 증가
   - 빌드 시간 증가

4. **라이선스**: KataGo는 오픈소스이지만 배포 시 고려 필요

## 대책

### 옵션 1: KataGo 없이 운영 (현재 상태 유지) ✅ 권장

**장점:**
- ✅ 이미 구현되어 있음
- ✅ 자체 Go AI 봇으로 게임 플레이 가능
- ✅ 추가 비용 없음
- ✅ 배포 간단

**단점:**
- ⚠️ KataGo 분석 기능 사용 불가 (승률, 점수 차이 등)
- ⚠️ AI 플레이어가 KataGo 분석 없이 동작

**현재 동작:**
- `goAiBot.ts`: 1~10단계 바둑 AI 봇 (KataGo 없이 동작)
- `makeStrategicAiMove`: KataGo 분석 실패 시 fallback 로직 사용

### 옵션 2: Linux용 KataGo 바이너리 사용

**필요 작업:**
1. Linux용 KataGo 바이너리 다운로드
2. Dockerfile에 추가
3. 모델 파일 포함

**Dockerfile 수정 예시:**
```dockerfile
# KataGo 바이너리 및 모델 추가
COPY katago/katago /app/katago/katago
COPY katago/kata1-b28c512nbt-s9853922560-d5031756885.bin.gz /app/katago/
RUN chmod +x /app/katago/katago
```

**환경 변수:**
```bash
KATAGO_PATH=/app/katago/katago
KATAGO_MODEL_PATH=/app/katago/kata1-b28c512nbt-s9853922560-d5031756885.bin.gz
```

**단점:**
- ⚠️ CPU 모드로 실행되어 느림
- ⚠️ Docker 이미지 크기 증가
- ⚠️ 메모리 사용량 증가

### 옵션 3: 별도 KataGo 서버 운영

**구조:**
```
Railway Backend → 별도 KataGo 서버 (GPU 서버)
```

**장점:**
- ✅ GPU 활용 가능
- ✅ Railway Backend는 가벼움
- ✅ 확장성 좋음

**단점:**
- ⚠️ 추가 서버 비용
- ⚠️ 네트워크 지연
- ⚠️ 복잡도 증가

**구현 방법:**
1. KataGo를 HTTP API로 래핑
2. Railway Backend에서 HTTP 요청으로 분석 요청

### 옵션 4: KataGo API 서비스 사용 (상용)

**예시:**
- KataGo Cloud API (있는 경우)
- 자체 KataGo 서버 구축

**단점:**
- ⚠️ 비용 발생
- ⚠️ 외부 의존성

## 권장 사항

### 단기 (현재): KataGo 없이 운영 ✅

**이유:**
1. 이미 자체 Go AI 봇이 구현되어 있음
2. 게임 플레이에 문제 없음
3. 배포 간단하고 비용 없음
4. KataGo 분석은 부가 기능

**현재 동작:**
- AI 플레이어: `goAiBot.ts` 사용 (1~10단계)
- 게임 분석: KataGo 없이도 기본 기능 동작

### 중기 (필요시): Linux KataGo 추가

**조건:**
- KataGo 분석 기능이 필수적일 때
- CPU 모드로도 충분할 때

**작업:**
1. Linux용 KataGo 바이너리 다운로드
2. Dockerfile 수정
3. 환경 변수 설정

### 장기 (확장시): 별도 KataGo 서버

**조건:**
- 사용자 수가 많아질 때
- GPU가 필요할 때
- 성능이 중요할 때

## 현재 코드 동작

### KataGo 실패 시 처리

```typescript
// server/kataGoService.ts
// 초기화 실패는 로그만 남기고 계속 진행 (KataGo 없이도 서버는 동작 가능)
console.error('[KataGo] Failed to start engine during initialization:', error.message);
```

### AI 플레이어 Fallback

```typescript
// server/aiPlayer.ts
// KataGo 분석 실패 시:
// 1. 자체 Go AI 봇 사용 (makeGoAiBotMove)
// 2. 또는 랜덤 유효 수 찾기
```

## 결론

**현재 상태로도 충분히 운영 가능합니다.**

- ✅ KataGo 없이도 게임 플레이 가능
- ✅ 자체 Go AI 봇으로 AI 플레이어 동작
- ✅ Railway 배포 간단
- ✅ 추가 비용 없음

KataGo 분석 기능이 필수적이지 않다면, 현재 상태를 유지하는 것을 권장합니다.

