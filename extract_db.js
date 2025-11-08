import fs from 'fs';
import { execSync } from 'child_process';

try {
  // Git stash에서 바이너리 파일 추출
  const stashOutput = execSync('git show "stash@{0}:database.sqlite"', { encoding: null });
  
  // 파일로 저장
  fs.writeFileSync('database_local.sqlite', stashOutput);
  
  console.log('Database extracted successfully');
  console.log('File size:', stashOutput.length, 'bytes');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

