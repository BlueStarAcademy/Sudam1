# Deployment & Operations Plan

## 1. Objectives
- Support 1,000+ concurrent users with predictable latency.
- Decouple build artifacts (frontend SPA, backend API, realtime gateway) into container-friendly components.
- Enable repeatable deployments (dev → staging → production) via CI/CD.
- Provide observability, resilience, and roll-back mechanisms.

## 2. Target Environments
| Environment | Purpose | Notes |
|-------------|---------|-------|
| Development | Individual dev machines | Run Vite + Express locally; mock external services. |
| Staging | Pre-production QA/perf testing | Mirrors production topology with reduced scale. |
| Production | Live traffic | Autoscaling, blue/green or canary deploys. |

## 3. Packaging & Build Strategy
### 3.1 Frontend
- Build via `npm run build` → `dist/` assets.
- Container image: `node:20-alpine` as builder, `nginx:alpine` (or `caddy`) as runtime serving static files.
- Upload build artifacts to CDN (e.g., Amazon S3 + CloudFront) for production; container fallback for staging smoke tests.

### 3.2 Backend API + Realtime Gateway
- Consolidate Express HTTP server and WebSocket server into a single Node service (current code already coupled).
- Introduce `Dockerfile.backend`:
  1. Builder stage installs dependencies (`npm ci --omit=dev` once we define production dependencies).
  2. Copy compiled TypeScript output (`npm run build:server` – we need to add script if missing) into `/app`.
  3. Runtime stage uses `node:20-alpine` with non-root user.
- Expose two ports (HTTP 4000, WS 4001) behind the same load balancer target group.
- Bundle `extract_db` utilities only in an admin/debug image; keep runtime image lean.

### 3.3 Database
- SQLite does not scale to concurrent writes from multiple nodes. For production load (1K CCU) plan migration to PostgreSQL or MySQL.
- Interim: store SQLite on persistent volume (EBS) dedicated to a single backend instance to avoid corruption; unacceptable for HA → migration required before go-live.
- Document schema migration strategy (e.g., Prisma, Knex, or custom SQL scripts).

## 4. Infrastructure Topology (Reference: AWS)
```
Route53
  ↓
CloudFront (SPA assets)
  ↓
ALB (HTTP + WebSocket)
  ↓
ECS Fargate or EKS (backend tasks/pods, min 2)
  ↓
Aurora PostgreSQL (multi-AZ)
  ↓
ElastiCache Redis (session / pub-sub)
```

- **Load Balancer**: Application Load Balancer with WebSocket support; enable sticky sessions only if Redis session store not ready.
- **Autoscaling**: Target CPU 60% or active connections; scale min 2 → max N.
- **Stateful Services**: Migrate `volatileState` data (game state, chats) to Redis or Postgres pub/sub to allow multi-instance backend.
- **Static Assets**: S3 + CloudFront with cache invalidation via CI/CD.

## 5. Observability & Reliability
- **Logging**: Standardize JSON logs; ship via CloudWatch Logs or ELK/OpenSearch.
- **Metrics**: Prometheus-compatible endpoint (use `prom-client`); key metrics: WS connections, action latency, game loop duration, DB query time.
- **Tracing**: Optional OpenTelemetry for action request/response.
- **Alerts**: CloudWatch alarms on error rate, elevated latency, high dropped WebSocket connections.
- **Backups**: Automated DB snapshots; S3 versioning for assets.
- **Disaster Recovery**: Document RPO/RTO; replicate DB to secondary region if required.

## 6. Security & Secrets
- Store secrets in AWS Secrets Manager or HashiCorp Vault.
- Enforce HTTPS everywhere; redirect HTTP to HTTPS at ALB.
- Rate-limit `/api/action` per IP/user via AWS WAF or middleware.
- WebSocket auth: sign JWT during login, verify on `upgrade` handshake.
- Regular dependency scanning via `npm audit` + GitHub Dependabot.

## 7. CI/CD Pipeline (GitHub Actions Example)
1. **Lint & Test**: ESLint, TypeScript check, unit/integration tests.
2. **Build Artifacts**: Frontend build + backend compile.
3. **Container Build**: Build & push images to ECR with semantic tags (`main`, `commit-sha`).
4. **Staging Deployment**:
   - Terraform/CloudFormation apply to staging.
   - Run smoke tests (health endpoints, WebSocket connectivity).
5. **Production Deployment**:
   - Blue/Green (two target groups) or canary (progressive traffic shift).
   - Post-deploy verification script (latency, error rate).
6. **Roll-back Plan**: Revert to previous image tag via pipeline command.

## 8. Performance & Load Testing
- Maintain k6 scenarios simulating 1K websocket + HTTP actions.
- Run nightly on staging; track metrics baseline.
- Integrate with CI for regression threshold.

## 9. Operational Checklists
- [ ] Dockerfiles committed (`Dockerfile.frontend`, `Dockerfile.backend`).
- [ ] Terraform/IaC repository with environment configs.
- [ ] Redis session store implemented (or alternative).
- [ ] DB migration off SQLite completed or scheduled with deadline.
- [ ] Health probes (`/healthz`, `/readyz`) for container orchestrator.
- [ ] Runbooks documented for common incidents (WebSocket storm, DB failover).

## 10. Next Actions
1. Author Dockerfiles + NPM scripts for production builds.
2. Prototype IaC (Terraform) for staging stack.
3. Design DB migration path (choose managed Postgres, plan data export/import).
4. Implement WebSocket auth + connection registry needed for multi-instance.
5. Wire metrics/logging scaffolding into codebase.
6. Adapt CI (GitHub Actions) to run container builds and deploy to staging.

---

## 11. KataGo 통합 및 비용 최소화 고려
- **KataGo 실행 요구사항**
  - GPU 사용 시 CUDA 지원 드라이버가 필요한 호스트 또는 컨테이너(GPU 패스스루)가 필요.
  - 소형 인스턴스에서는 CPU-only 실행도 가능하나 속도 감소 주의.
  - KataGo 모델 파일과 설정(`server/katago_home/*`)은 볼륨 마운트로 공유.
- **저비용 배포 옵션 (초기 단계)**
  1. **단일 VM (예: AWS Lightsail, Vultr, Oracle Cloud Free Tier)**
     - Docker Compose로 `frontend`, `backend`, `katago` 컨테이너를 한 서버에 배치.
     - SQLite 유지(백업 주의) + 주기적 전체 스냅샷.
     - 장점: 월 $10 이하 요금, 간단한 구성. 단점: 단일 장애 지점.
  2. **백엔드 + KataGo 통합 컨테이너**
     - Node 서버가 KataGo 바이너리를 `child_process`로 실행하도록 현재 구조 유지.
     - Dockerfile.backend 에 KataGo 바이너리 설치 스텝 추가(빌드 용량 증가).
  3. **별도 KataGo 마이크로서비스**
     - Node 서버가 HTTP/gRPC로 KataGo 호출. GPU 전용 머신으로 분리 가능.
     - 초기 비용은 다소 증가하지만 확장성 우수.
- **권장 초기 구성**
  - AWS Lightsail (2vCPU, 4GB RAM) 또는 DigitalOcean Droplet (similar spec) + Docker Compose.
  - KataGo는 CPU-only로 실행하여 비용 절감, 필요 시 GPU 서버로 마이그레이션 계획 수립.
  - Cloudflare Zero Trust 또는 Nginx Reverse Proxy로 HTTPS 종료.
- **확장 시 전환 전략**
  - 게임/웹소켓 서버를 컨테이너 오케스트레이터(ECS/EKS)로 이전.
  - KataGo는 GPU가 필요한 경우 AWS G4dn Spot 인스턴스나 Lambda + EFS(비용 상승) 검토.
  - Redis 도입 후 다중 인스턴스 지원 → 오토스케일 환경으로 자연스러운 업그레이드.
- **구현 예시**: 구체적인 Compose 구성과 운영 절차는 `docs/deployment-compose.md`를 참고하세요.


