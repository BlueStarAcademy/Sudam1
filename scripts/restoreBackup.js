// Supabase 백업 파일을 Railway PostgreSQL에 복원하는 스크립트
// 사용법: node scripts/restoreBackup.js <백업파일경로>

import { Client } from 'pg';
import fs from 'fs';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// 백업 파일 경로 (명령줄 인자 또는 기본값)
const backupPath = process.argv[2] || 'C:\\Users\\muniz\\Downloads\\db_cluster-20-11-2025@15-12-54.backup.gz';

// Railway 연결 정보
const RAILWAY_URL = process.env.DATABASE_URL;

if (!RAILWAY_URL) {
  console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.');
  console.error('   .env 파일에 DATABASE_URL을 추가하세요 (Public URL 사용)');
  console.error('   예: postgresql://postgres:password@postgres-production-f9af.up.railway.app:5432/railway');
  process.exit(1);
}

async function restoreBackup() {
  const client = new Client({
    connectionString: RAILWAY_URL
  });

  try {
    // 백업 파일 확인
    if (!fs.existsSync(backupPath)) {
      console.error(`❌ 백업 파일을 찾을 수 없습니다: ${backupPath}`);
      console.error('   파일 경로를 확인하거나 명령줄 인자로 제공하세요:');
      console.error('   node scripts/restoreBackup.js "C:\\경로\\백업파일.sql"');
      console.error('\n   Downloads 폴더에서 백업 파일 찾기:');
      console.error('   Get-ChildItem C:\\Users\\muniz\\Downloads\\*backup*');
      process.exit(1);
    }

    console.log(`📂 백업 파일 읽는 중: ${backupPath}`);
    
    let backupContent;
    
    // .backup 또는 .backup.gz 파일인 경우
    if (backupPath.endsWith('.backup') || backupPath.endsWith('.backup.gz')) {
      console.error('❌ .backup 파일은 PostgreSQL custom format입니다.');
      console.error('   이 형식은 pg_restore를 사용해야 합니다.');
      console.error('\n   해결 방법:');
      console.error('   1. Supabase에서 SQL 형식으로 다시 다운로드');
      console.error('   2. 또는 Railway CLI 사용:');
      console.error('      Get-Content "' + backupPath + '" -Raw | railway run pg_restore -d railway -c -v');
      console.error('   3. 또는 로컬에서 압축 해제 후 Railway에 업로드');
      process.exit(1);
    }
    
    // .gz 파일인 경우 압축 해제
    if (backupPath.endsWith('.gz')) {
      console.log('   압축 해제 중...');
      const gzipStream = fs.createReadStream(backupPath);
      const gunzipStream = createGunzip();
      const chunks = [];
      
      await new Promise((resolve, reject) => {
        gunzipStream.on('data', chunk => chunks.push(chunk));
        gunzipStream.on('end', () => {
          backupContent = Buffer.concat(chunks).toString('utf8');
          resolve();
        });
        gunzipStream.on('error', reject);
        gzipStream.pipe(gunzipStream);
      });
      
      console.log(`✅ 압축 해제 완료`);
    } else {
      backupContent = fs.readFileSync(backupPath, 'utf8');
    }
    
    console.log(`✅ 백업 파일 읽기 완료 (${(backupContent.length / 1024 / 1024).toFixed(2)} MB)`);

    console.log('🔌 Railway PostgreSQL에 연결 중...');
    console.log('   연결 문자열:', RAILWAY_URL.replace(/:[^:@]+@/, ':****@'));
    await client.connect();
    console.log('✅ Railway 연결 성공');

    console.log('\n📦 백업 복원 중...');
    console.log('   이 작업은 시간이 걸릴 수 있습니다...');

    // SQL 파일을 실행
    // 큰 파일의 경우 여러 쿼리로 나뉘어 있을 수 있으므로 세미콜론으로 분리
    const queries = backupContent
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));

    console.log(`   ${queries.length}개의 쿼리 실행 중...`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      // 빈 쿼리나 주석만 있는 쿼리는 건너뛰기
      if (!query || query.length < 10) continue;

      try {
        await client.query(query);
        successCount++;
        
        // 진행 상황 표시 (100개마다)
        if ((i + 1) % 100 === 0) {
          process.stdout.write(`\r   진행: ${i + 1}/${queries.length} (성공: ${successCount}, 실패: ${errorCount})`);
        }
      } catch (error) {
        errorCount++;
        // 일부 오류는 무시 (예: 테이블이 이미 존재하는 경우)
        if (!error.message.includes('already exists') && 
            !error.message.includes('duplicate key')) {
          console.error(`\n   ⚠️  쿼리 ${i + 1} 실패: ${error.message.substring(0, 100)}`);
        }
      }
    }

    console.log(`\n✅ 백업 복원 완료!`);
    console.log(`   성공: ${successCount}개 쿼리`);
    if (errorCount > 0) {
      console.log(`   실패: ${errorCount}개 쿼리 (일부는 정상일 수 있음)`);
    }

    // 데이터 확인
    console.log('\n📊 복원된 데이터 확인:');
    const tables = ['User', 'UserInventory', 'UserCredential', 'LiveGame'];
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM "${table}"`);
        console.log(`   ${table}: ${result.rows[0].count}개 행`);
      } catch (error) {
        console.log(`   ${table}: 확인 실패 (테이블이 없을 수 있음)`);
      }
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('\n🔌 연결 종료');
  }
}

// 실행
restoreBackup().catch(console.error);

