# 간단한 데이터 마이그레이션 방법

PostgreSQL 설치가 복잡하다면, 더 간단한 방법들을 사용할 수 있습니다.

## 방법 1: Railway CLI 사용 (가장 간단)

PostgreSQL을 설치하지 않고도 할 수 있습니다.

### 1단계: Railway CLI 설치

```bash
npm install -g @railway/cli
```

### 2단계: Supabase에서 SQL 덤프 (웹 기반 도구 사용)

**옵션 A: Supabase SQL Editor 사용**

1. Supabase → **"SQL Editor"** 클릭
2. 다음 쿼리로 각 테이블 데이터 확인:
   ```sql
   -- 사용자 데이터 확인
   SELECT * FROM "User" LIMIT 10;
   ```
3. 데이터를 CSV로 내보내기 (각 테이블별로)

**옵션 B: 온라인 PostgreSQL 덤프 도구 사용**

- [pgAdmin Web](https://www.pgadmin.org/) 같은 웹 기반 도구
- 또는 Supabase의 백업 기능 사용

### 3단계: Railway에 연결하여 데이터 복원

```bash
# Railway 프로젝트 연결
railway link

# SQL 파일이 있다면
railway run psql < backup.sql
```

## 방법 2: Supabase Backups 기능 사용

### 1단계: Supabase에서 백업 다운로드

1. Supabase → 왼쪽 사이드바 → **"Platform"** → **"Backups"** 클릭
2. **"Create backup"** 또는 기존 백업 다운로드
3. 백업 파일 저장

### 2단계: Railway에 복원

Railway CLI 사용:
```bash
railway link
railway run psql < backup_file.sql
```

## 방법 3: 간단한 스크립트 사용 (Node.js)

PostgreSQL 설치 없이 Node.js로 덤프/복원:

### 덤프 스크립트 생성

`dump-supabase.js` 파일 생성:

```javascript
const { Client } = require('pg');
const fs = require('fs');

async function dumpDatabase() {
  const client = new Client({
    connectionString: 'postgresql://postgres:password@db.xxx.supabase.co:5432/postgres?sslmode=require'
  });

  await client.connect();
  
  // 테이블 목록 가져오기
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);

  let sql = '';
  
  for (const table of tables.rows) {
    const tableName = table.table_name;
    const data = await client.query(`SELECT * FROM "${tableName}"`);
    
    // INSERT 문 생성
    for (const row of data.rows) {
      const columns = Object.keys(row).join(', ');
      const values = Object.values(row).map(v => 
        typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v
      ).join(', ');
      sql += `INSERT INTO "${tableName}" (${columns}) VALUES (${values});\n`;
    }
  }
  
  fs.writeFileSync('supabase_dump.sql', sql);
  console.log('덤프 완료!');
  
  await client.end();
}

dumpDatabase().catch(console.error);
```

실행:
```bash
npm install pg
node dump-supabase.js
```

## 방법 4: Supabase 대시보드에서 직접 확인

데이터가 많지 않다면:

1. Supabase → **"Table Editor"** 또는 **"SQL Editor"**
2. 각 테이블 데이터 확인
3. 필요시 수동으로 Railway에 입력

## 추천: Railway CLI + Supabase Backups

가장 간단한 조합:

1. **Supabase Backups에서 백업 다운로드**
   - Supabase → Platform → Backups
   - 백업 파일 다운로드

2. **Railway CLI로 복원**
   ```bash
   npm install -g @railway/cli
   railway link
   railway run psql < backup_file.sql
   ```

## 다음 단계

어떤 방법을 사용하시겠어요?

1. **Railway CLI 사용** (추천) - PostgreSQL 설치 불필요
2. **Supabase Backups 사용** - 가장 간단
3. **Node.js 스크립트** - 프로그래밍 가능한 경우

