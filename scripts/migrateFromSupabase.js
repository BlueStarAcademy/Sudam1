// Supabase에서 Railway PostgreSQL로 데이터 마이그레이션 스크립트
// 사용법: node scripts/migrateFromSupabase.js

import { Client } from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Supabase 연결 정보 (환경 변수 또는 직접 입력)
// Railway 환경에서는 Railway 환경 변수를 사용, 로컬에서는 .env 파일 사용
const SUPABASE_URL = process.env.SUPABASE_DATABASE_URL || 
                     (process.env.RAILWAY_ENVIRONMENT ? null : process.env.SUPABASE_DATABASE_URL) ||
                     'postgresql://postgres.xqepeecuuquoamcvomsv:gudans10dkfk@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres';

// 연결 문자열 검증
if (!SUPABASE_URL || SUPABASE_URL.includes('xxx') || (SUPABASE_URL.includes('password') && !SUPABASE_URL.includes('gudans10dkfk'))) {
  console.error('❌ SUPABASE_DATABASE_URL 환경 변수가 올바르게 설정되지 않았습니다.');
  console.error('   Railway 환경 변수에 SUPABASE_DATABASE_URL을 추가하세요:');
  console.error('   railway variables set SUPABASE_DATABASE_URL="..." --service Postgres');
  console.error('   또는 Railway 대시보드 → Postgres → Variables에서 추가');
  process.exit(1);
}

// Railway 연결 정보
// Railway CLI를 사용할 때는 Railway 환경 변수 DATABASE_URL이 자동으로 주입됩니다
// 로컬에서 실행할 때는 .env 파일의 DATABASE_URL 사용 (Public URL 필요)
let RAILWAY_URL = process.env.DATABASE_URL;

// Railway 환경 변수가 없으면 .env 파일에서 로드
if (!RAILWAY_URL || RAILWAY_URL.includes('railway.internal')) {
  // .env 파일이 이미 로드되었으므로 다시 확인
  RAILWAY_URL = process.env.DATABASE_URL;
  
  // 여전히 railway.internal이면 Public URL 사용 안내
  if (RAILWAY_URL && RAILWAY_URL.includes('railway.internal')) {
    console.warn('⚠️  Railway 내부 네트워크 호스트는 로컬에서 접근할 수 없습니다.');
    console.warn('   .env 파일의 DATABASE_URL을 Public URL로 변경하세요:');
    console.warn('   postgres.railway.internal → postgres-production-f9af.up.railway.app');
    process.exit(1);
  }
}

if (!RAILWAY_URL) {
  console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.');
  console.error('   .env 파일에 DATABASE_URL을 추가하세요 (Public URL 사용)');
  process.exit(1);
}

console.log('   Railway 연결 문자열:', RAILWAY_URL.replace(/:[^:@]+@/, ':****@')); // 비밀번호 숨김

async function migrateData() {
  const supabaseClient = new Client({
    connectionString: SUPABASE_URL
  });

  const railwayClient = new Client({
    connectionString: RAILWAY_URL
  });

  try {
    console.log('🔌 Supabase에 연결 중...');
    console.log('   연결 문자열:', SUPABASE_URL.replace(/:[^:@]+@/, ':****@')); // 비밀번호 숨김
    await supabaseClient.connect();
    console.log('✅ Supabase 연결 성공');

    console.log('🔌 Railway PostgreSQL에 연결 중...');
    await railwayClient.connect();
    console.log('✅ Railway 연결 성공');

    // 1. 테이블 목록 가져오기
    console.log('\n📋 테이블 목록 확인 중...');
    const tablesResult = await supabaseClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`✅ ${tables.length}개 테이블 발견:`, tables);

    // 2. 각 테이블별로 데이터 마이그레이션
    for (const tableName of tables) {
      try {
        console.log(`\n📦 ${tableName} 테이블 마이그레이션 중...`);

        // Supabase에서 데이터 가져오기
        const dataResult = await supabaseClient.query(`SELECT * FROM "${tableName}"`);
        const rows = dataResult.rows;

        if (rows.length === 0) {
          console.log(`   ⚠️  ${tableName}: 데이터 없음, 건너뜀`);
          continue;
        }

        console.log(`   📊 ${rows.length}개 행 발견`);

        // Railway에 데이터 삽입
        if (rows.length > 0) {
          const columns = Object.keys(rows[0]);
          const columnNames = columns.map(col => `"${col}"`).join(', ');

          // 기존 데이터 삭제 (선택적 - 주의!)
          // await railwayClient.query(`DELETE FROM "${tableName}"`);

          // 배치로 삽입 (성능 향상)
          const batchSize = 100;
          for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            
            const values = batch.map((row, idx) => {
              const rowValues = columns.map((col, colIdx) => {
                const paramNum = idx * columns.length + colIdx + 1;
                return `$${paramNum}`;
              }).join(', ');
              return `(${rowValues})`;
            }).join(', ');

            const allValues = batch.flatMap(row => 
              columns.map(col => {
                const value = row[col];
                // NULL 처리
                if (value === null) return null;
                // 날짜 객체 처리
                if (value instanceof Date) return value.toISOString();
                // JSON 객체 처리
                if (typeof value === 'object') return JSON.stringify(value);
                return value;
              })
            );

            const query = `
              INSERT INTO "${tableName}" (${columnNames})
              VALUES ${values}
              ON CONFLICT DO NOTHING
            `;

            await railwayClient.query(query, allValues);
          }

          console.log(`   ✅ ${tableName}: ${rows.length}개 행 마이그레이션 완료`);
        }
      } catch (error) {
        console.error(`   ❌ ${tableName} 마이그레이션 실패:`, error.message);
        // 계속 진행
      }
    }

    console.log('\n🎉 마이그레이션 완료!');

    // 3. 데이터 확인
    console.log('\n📊 마이그레이션 결과 확인:');
    for (const tableName of tables) {
      try {
        const count = await railwayClient.query(`SELECT COUNT(*) FROM "${tableName}"`);
        console.log(`   ${tableName}: ${count.rows[0].count}개 행`);
      } catch (error) {
        console.log(`   ${tableName}: 확인 실패`);
      }
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await supabaseClient.end();
    await railwayClient.end();
    console.log('\n🔌 연결 종료');
  }
}

// 실행
migrateData().catch(console.error);

