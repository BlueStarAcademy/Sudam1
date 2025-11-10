# 저비용 Docker Compose 배포 가이드

## 1. 개요
CPU-only KataGo 환경을 포함한 최소 비용 배포 구성을 위해 `docker-compose.yml`과 예시 환경 변수 파일(`deploy.env.example`)을 제공합니다. 단일 VM(Lightsail, DigitalOcean 등)에 이 구성을 적용하면 월 10달러 이하로도 배포가 가능합니다.

## 2. 준비물
- Docker 24.x, Docker Compose v2
- KataGo CPU용 바이너리 및 모델 파일 (예: `katago` 실행 파일, `kata1-b18c384nbt.bin.gz` 등)
- 프로젝트 루트에 다음 디렉터리 및 파일 배치
  ```
  katago/
    ├── katago           # 실행 파일 (Linux)
    └── model.bin.gz     # 모델 파일 (원본 이름 유지 가능)
  database.sqlite        # 운영용 DB (초기엔 개발 DB 복사 가능)
  deploy.env             # 환경 변수 실파일 (deploy.env.example 참조)
  ```

## 3. 환경 변수 설정
`deploy.env.example`를 복사하여 `deploy.env`로 저장하고 필요한 값을 수정하세요.
```
NODE_ENV=production
KATAGO_NUM_ANALYSIS_THREADS=4
KATAGO_NUM_SEARCH_THREADS=8
KATAGO_MAX_VISITS=500
KATAGO_NN_MAX_BATCH_SIZE=8
```
- CPU-only 환경에서는 탐색 쓰레드와 방문 수를 적당히 낮춰 리소스를 절약합니다.
- 추가로 필요한 API 키 등은 `deploy.env`에 정의하거나 `docker-compose.yml`의 `environment` 항목에 직접 설정할 수 있습니다.

## 4. docker-compose 실행
```bash
# 최초 빌드
docker compose build

# 컨테이너 실행
docker compose up -d

# 로그 확인
docker compose logs -f backend
```
- `frontend`는 8080 포트로, `backend`는 4000/4001 포트로 노출됩니다.
- KataGo 홈 디렉터리는 `katago-home` 볼륨에 저장되어 로그 및 캐시가 유지됩니다.

## 5. KataGo 경로 및 설정
- `docker-compose.yml`에서 다음 환경 변수를 통해 경로를 지정합니다.
  - `KATAGO_PATH=/katago/katago`
  - `KATAGO_MODEL_PATH=/katago/model.bin.gz`
  - `KATAGO_HOME_PATH=/katago-home`
- `katago` 디렉터리는 읽기 전용(`:ro`)으로 마운트하여 바이너리/모델을 보호합니다.
- CPU-only 성능이 부족하면 `KATAGO_MAX_VISITS` 값을 더 낮추거나, 장기적으로 GPU 인스턴스로 이전합니다.

## 6. 배포시 주의 사항
- **데이터 백업**: `database.sqlite`는 호스트와 공유됩니다. 정기적으로 외부 백업을 수행하세요.
- **보안**: Nginx/Cloudflare 등을 활용해 HTTPS를 적용하고, 방화벽으로 4000/4001 포트 접근을 제한합니다.
- **리소스 모니터링**: VM의 CPU 사용률과 메모리를 모니터링하여 필요 시 상향 조정합니다.
- **로그 관리**: `docker compose logs --since=1h backend` 등으로 KataGo 또는 서버 오류를 주기적으로 점검하세요.

## 7. 추후 확장 계획
- 트래픽이 증가하면 DB를 Postgres로 마이그레이션하고, KataGo를 별도 GPU 인스턴스로 분리하도록 설계를 확장합니다.
- Docker Compose 대신 IaC(ECS/EKS)로 전환 시 이 구성을 초기 참조로 활용하면 됩니다.


