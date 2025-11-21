#!/bin/bash
# 배포 스크립트
# Railway 또는 다른 플랫폼에서 사용할 수 있는 배포 전 준비 스크립트

set -e

echo "🚀 Starting deployment preparation..."

# Prisma 클라이언트 생성
echo "📦 Generating Prisma client..."
npm run prisma:generate

# 데이터베이스 마이그레이션 (선택적 - Railway에서는 자동 실행)
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "🔄 Running database migrations..."
    npm run prisma:migrate:deploy
fi

echo "✅ Deployment preparation complete!"

