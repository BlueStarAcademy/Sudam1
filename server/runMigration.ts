import prisma from './prismaClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, '../prisma/migrations/0004_add_kakao_and_email_verification/migration.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
        
        console.log('[Migration] Running migration...');
        
        // SQL을 세미콜론으로 분리하여 각각 실행
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await prisma.$executeRawUnsafe(statement);
                    console.log('[Migration] Executed:', statement.substring(0, 50) + '...');
                } catch (error: any) {
                    // 이미 존재하는 경우 무시
                    if (error.message?.includes('already exists') || 
                        error.message?.includes('duplicate') ||
                        error.code === '42P07' || // relation already exists
                        error.code === '42710') { // duplicate object
                        console.log('[Migration] Skipped (already exists):', statement.substring(0, 50) + '...');
                    } else {
                        console.error('[Migration] Error executing:', statement.substring(0, 50));
                        console.error('[Migration] Error:', error.message);
                        throw error;
                    }
                }
            }
        }
        
        console.log('[Migration] Migration completed successfully!');
    } catch (error: any) {
        console.error('[Migration] Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

runMigration()
    .then(() => {
        console.log('[Migration] Done');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Migration] Failed:', error);
        process.exit(1);
    });

