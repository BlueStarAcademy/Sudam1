// 관리자 유저의 길드 연결 해제 스크립트
// 실행 방법: npx tsx --tsconfig server/tsconfig.json server/scripts/removeAdminGuild.ts

import "dotenv/config";
import prisma from '../prismaClient.js';

async function removeAdminGuild() {
    try {
        console.log('[RemoveAdminGuild] 시작...');
        
        // 1. 관리자 유저 찾기
        const adminUsers = await prisma.user.findMany({
            where: { isAdmin: true },
            include: {
                guildMember: {
                    include: {
                        guild: true
                    }
                }
            }
        });
        
        console.log(`[RemoveAdminGuild] 관리자 유저 ${adminUsers.length}명 발견`);
        
        if (adminUsers.length === 0) {
            console.log('[RemoveAdminGuild] 관리자 유저가 없습니다.');
            return;
        }
        
        for (const user of adminUsers) {
            if (user.guildMember) {
                console.log(`[RemoveAdminGuild] 관리자 유저 "${user.nickname}" (${user.id})의 길드 연결 해제 중...`);
                console.log(`  - 길드: ${user.guildMember.guild?.name || 'N/A'} (${user.guildMember.guildId})`);
                
                // GuildMember 레코드 삭제
                await prisma.guildMember.delete({
                    where: { userId: user.id }
                });
                
                console.log(`[RemoveAdminGuild] 완료: "${user.nickname}"의 길드 연결이 해제되었습니다.`);
            } else {
                console.log(`[RemoveAdminGuild] "${user.nickname}" (${user.id})는 이미 길드에 속해있지 않습니다.`);
            }
        }
        
        // 2. 결과 확인
        const updatedAdminUsers = await prisma.user.findMany({
            where: { isAdmin: true },
            include: {
                guildMember: true
            }
        });
        
        console.log('\n[RemoveAdminGuild] 최종 결과:');
        for (const user of updatedAdminUsers) {
            if (user.guildMember) {
                console.log(`  ⚠️  "${user.nickname}" (${user.id})는 여전히 길드에 속해있습니다. (guildId: ${user.guildMember.guildId})`);
            } else {
                console.log(`  ✓ "${user.nickname}" (${user.id})는 길드에 속해있지 않습니다.`);
            }
        }
        
        console.log('\n[RemoveAdminGuild] 작업 완료!');
    } catch (error) {
        console.error('[RemoveAdminGuild] 오류 발생:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

removeAdminGuild().catch(console.error);

