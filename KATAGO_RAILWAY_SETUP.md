# Railway에서 KataGo 설정 가이드

## 중요: 계가 기능에 KataGo 필수

`getGameResult` 함수에서 `analyzeGame(game)`을 호출하여 KataGo 분석을 시작합니다. 계가(점수 계산) 기능이 정상 작동하려면 KataGo가 필요합니다.

## Railway에서 KataGo 실행 방법

### 방법 1: Linux KataGo 바이너리 다운로드 및 추가

1. **KataGo Linux 바이너리 다운로드**
   - [KataGo GitHub Releases](https://github.com/lightvector/KataGo/releases)
   - Linux용 바이너리 다운로드 (예: `katago-v1.16.3-linux-x64.zip`)
   - 압축 해제 후 `katago` 실행 파일 확인

2. **프로젝트에 추가**
   ```
   katago/
     katago          (Linux 바이너리, 실행 권한 필요)
     kata1-b28c512nbt-s9853922560-d5031756885.bin.gz  (모델 파일)
   ```

3. **Dockerfile 수정**
   - 이미 `Dockerfile.backend`에 KataGo 복사 로직 추가됨
   - Linux 바이너리가 `katago/katago`에 있으면 자동으로 복사됨

4. **환경 변수 설정 (Railway)**
   ```
   KATAGO_PATH=/app/katago/katago
   KATAGO_MODEL_PATH=/app/katago/kata1-b28c512nbt-s9853922560-d5031756885.bin.gz
   KATAGO_HOME_PATH=/app/server/katago_home
   KATAGO_NUM_ANALYSIS_THREADS=4
   KATAGO_NUM_SEARCH_THREADS=8
   KATAGO_MAX_VISITS=1000
   KATAGO_NN_MAX_BATCH_SIZE=16
   ```

### 방법 2: 빌드 시 다운로드 (권장)

Dockerfile에서 빌드 시 KataGo를 다운로드하도록 수정:

```dockerfile
FROM base AS katago-download
WORKDIR /tmp
# KataGo Linux 바이너리 다운로드
RUN wget -q https://github.com/lightvector/KataGo/releases/download/v1.16.3/katago-v1.16.3-linux-x64.zip && \
    unzip katago-v1.16.3-linux-x64.zip && \
    chmod +x katago && \
    mkdir -p /app/katago && \
    mv katago /app/katago/ && \
    rm -rf katago-v1.16.3-linux-x64.zip

FROM base AS runner
# ... 기존 코드 ...
# Copy KataGo from download stage
COPY --from=katago-download /app/katago ./katago
```

**주의**: 모델 파일은 별도로 추가해야 합니다 (용량이 큼).

### 방법 3: 별도 KataGo 서버 (장기)

별도 서버에서 KataGo를 실행하고 HTTP API로 래핑:
- GPU 서버에서 KataGo 실행
- HTTP API 서버 구축
- Railway Backend에서 API 호출

## 현재 Dockerfile 상태

`Dockerfile.backend`에 다음이 추가되었습니다:
- OpenCL 라이브러리 설치 (CPU 모드용)
- KataGo 바이너리 복사 (있는 경우)
- 모델 파일 복사 (있는 경우)

## 다음 단계

1. **Linux KataGo 바이너리 다운로드**
   - GitHub Releases에서 다운로드
   - `katago/katago`에 배치

2. **모델 파일 확인**
   - 현재 모델 파일이 있는지 확인
   - 없으면 다운로드

3. **Git에 추가 및 커밋**
   ```bash
   git add katago/katago
   git add katago/*.bin.gz
   git commit -m "Add Linux KataGo binary for Railway deployment"
   git push
   ```

4. **Railway 재배포**
   - 자동으로 재배포됨
   - Deploy Logs에서 KataGo 시작 확인

## 확인 사항

배포 후 Deploy Logs에서:
```
[KataGo] Engine found at: /app/katago/katago
[KataGo] Engine ready.
```

이 메시지가 보이면 KataGo가 정상 작동하는 것입니다.

## 대안: KataGo 없이 계가 (임시)

만약 KataGo를 추가하기 전에 계가가 필요하다면, `getGameResult`의 fallback 로직을 개선할 수 있습니다. 하지만 정확한 계가를 위해서는 KataGo가 필요합니다.

