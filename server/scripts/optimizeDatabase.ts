/**
 * 데이터베이스 최적화 스크립트
 * 
 * 실행 방법:
 * npx tsx --tsconfig server/tsconfig.json server/scripts/optimizeDatabase.ts
 */

import prisma from '../prismaClient.js';
import { Prisma } from '@prisma/client';

const DAYS_TO_KEEP_GAMES = 30; // 30일 이상 된 게임 데이터 삭제
const DAYS_TO_KEEP_MAIL = 90; // 90일 이상 된 읽은 메일 삭제
const DAYS_TO_KEEP_INVENTORY_HISTORY = 180; // 180일 이상 된 인벤토리 히스토리 삭제
const MAX_GUILD_MESSAGES_PER_GUILD = 1000; // 길드당 최대 메시지 수

async function getDatabaseSize() {
    const result = await prisma.$queryRaw<Array<{ size: string }>>`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size;
    `;
    return result[0]?.size || 'Unknown';
}

async function getTableSizes() {
    try {
        const result = await prisma.$queryRaw<Array<{ 
            table_name: string;
            size: string;
        }>>`
            SELECT 
                schemaname || '.' || tablename AS table_name,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            LIMIT 10;
        `;
        return result;
    } catch (error) {
        console.warn('[경고] 테이블 크기 조회 실패:', error);
        return [];
    }
}

async function cleanupOldGames() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP_GAMES);
    
    console.log(`[최적화] ${DAYS_TO_KEEP_GAMES}일 이상 된 게임 데이터 삭제 중... (기준일: ${cutoffDate.toISOString()})`);
    
    const result = await prisma.liveGame.deleteMany({
        where: {
            isEnded: true,
            updatedAt: {
                lt: cutoffDate
            }
        }
    });
    
    console.log(`[최적화] ${result.count}개의 오래된 게임 데이터 삭제 완료`);
    return result.count;
}

async function cleanupOldMail() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP_MAIL);
    
    console.log(`[최적화] ${DAYS_TO_KEEP_MAIL}일 이상 된 읽은 메일 삭제 중...`);
    
    const result = await prisma.userMail.deleteMany({
        where: {
            isRead: true,
            updatedAt: {
                lt: cutoffDate
            }
        }
    });
    
    console.log(`[최적화] ${result.count}개의 오래된 메일 삭제 완료`);
    return result.count;
}

async function cleanupExpiredMail() {
    console.log(`[최적화] 만료된 메일 삭제 중...`);
    
    const result = await prisma.userMail.deleteMany({
        where: {
            expiresAt: {
                lt: new Date()
            }
        }
    });
    
    console.log(`[최적화] ${result.count}개의 만료된 메일 삭제 완료`);
    return result.count;
}

async function cleanupOldInventoryHistory() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP_INVENTORY_HISTORY);
    
    console.log(`[최적화] ${DAYS_TO_KEEP_INVENTORY_HISTORY}일 이상 된 인벤토리 히스토리 삭제 중...`);
    
    const result = await prisma.inventoryHistory.deleteMany({
        where: {
            createdAt: {
                lt: cutoffDate
            }
        }
    });
    
    console.log(`[최적화] ${result.count}개의 오래된 인벤토리 히스토리 삭제 완료`);
    return result.count;
}

async function cleanupOldGuildMessages() {
    console.log(`[최적화] 길드 메시지 정리 중... (길드당 최대 ${MAX_GUILD_MESSAGES_PER_GUILD}개 유지)`);
    
    // 각 길드별로 최신 메시지만 유지
    const guilds = await prisma.guild.findMany({
        select: { id: true }
    });
    
    let totalDeleted = 0;
    for (const guild of guilds) {
        const messages = await prisma.guildMessage.findMany({
            where: { guildId: guild.id },
            orderBy: { createdAt: 'desc' },
            select: { id: true }
        });
        
        if (messages.length > MAX_GUILD_MESSAGES_PER_GUILD) {
            const messagesToDelete = messages.slice(MAX_GUILD_MESSAGES_PER_GUILD);
            const idsToDelete = messagesToDelete.map(m => m.id);
            
            const result = await prisma.guildMessage.deleteMany({
                where: {
                    id: { in: idsToDelete }
                }
            });
            
            totalDeleted += result.count;
        }
    }
    
    console.log(`[최적화] ${totalDeleted}개의 오래된 길드 메시지 삭제 완료`);
    return totalDeleted;
}

async function optimizeUserStatus() {
    console.log(`[최적화] User.status JSON 최적화 중...`);
    
    // status가 null이거나 빈 객체인 경우 정리
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { status: null },
                { status: Prisma.JsonNull }
            ]
        },
        select: { id: true }
    });
    
    let optimized = 0;
    for (const user of users) {
        await prisma.user.update({
            where: { id: user.id },
            data: { status: {} }
        });
        optimized++;
    }
    
    console.log(`[최적화] ${optimized}개의 User.status 정리 완료`);
    return optimized;
}

async function vacuumDatabase() {
    console.log(`[최적화] VACUUM 실행 중... (시간이 걸릴 수 있습니다)`);
    
    await prisma.$executeRaw`VACUUM ANALYZE;`;
    
    console.log(`[최적화] VACUUM 완료`);
}

async function main() {
    console.log('=== 데이터베이스 최적화 시작 ===\n');
    
    try {
        // 현재 데이터베이스 크기 확인
        const initialSize = await getDatabaseSize();
        console.log(`[현재 상태] 데이터베이스 크기: ${initialSize}\n`);
        
        // 테이블별 크기 확인
        console.log('[현재 상태] 테이블별 크기:');
        const tableSizes = await getTableSizes();
        for (const table of tableSizes.slice(0, 10)) {
            console.log(`  - ${table.table_name}: ${table.size}`);
        }
        console.log('');
        
        // 데이터 정리
        const deletedGames = await cleanupOldGames();
        const deletedMail = await cleanupOldMail();
        const deletedExpiredMail = await cleanupExpiredMail();
        const deletedHistory = await cleanupOldInventoryHistory();
        const deletedGuildMessages = await cleanupOldGuildMessages();
        const optimizedUsers = await optimizeUserStatus();
        
        console.log('\n[정리 결과]');
        console.log(`  - 게임 데이터: ${deletedGames}개 삭제`);
        console.log(`  - 읽은 메일: ${deletedMail}개 삭제`);
        console.log(`  - 만료된 메일: ${deletedExpiredMail}개 삭제`);
        console.log(`  - 인벤토리 히스토리: ${deletedHistory}개 삭제`);
        console.log(`  - 길드 메시지: ${deletedGuildMessages}개 삭제`);
        console.log(`  - User.status 최적화: ${optimizedUsers}개`);
        
        // VACUUM 실행
        await vacuumDatabase();
        
        // 최종 데이터베이스 크기 확인
        const finalSize = await getDatabaseSize();
        console.log(`\n[최종 결과] 데이터베이스 크기: ${finalSize}`);
        console.log(`[최적화 전] ${initialSize} → [최적화 후] ${finalSize}`);
        
        console.log('\n=== 데이터베이스 최적화 완료 ===');
        
    } catch (error) {
        console.error('[오류] 최적화 중 오류 발생:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main();

