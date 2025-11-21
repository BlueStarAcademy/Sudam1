import { PrismaClient } from '../generated/prisma/client.js';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

async function resetAdminPassword() {
    try {
        const username = '푸른별바둑학원';
        const newPassword = '1217';
        
        console.log(`[Reset Admin Password] Resetting password for: ${username}`);
        
        // 비밀번호를 bcrypt로 해시
        const passwordHash = await bcrypt.hash(newPassword, 10);
        
        // 사용자 자격 증명 업데이트
        const result = await prisma.$executeRawUnsafe(
            `UPDATE "UserCredential" SET "passwordHash" = $1 WHERE username = $2`,
            passwordHash,
            username
        );
        
        if (result > 0) {
            console.log(`[Reset Admin Password] Successfully reset password for: ${username}`);
            console.log(`[Reset Admin Password] New password: ${newPassword}`);
        } else {
            console.log(`[Reset Admin Password] No user found with username: ${username}`);
        }
    } catch (error) {
        console.error('[Reset Admin Password] Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

resetAdminPassword()
    .then(() => {
        console.log('[Reset Admin Password] Done');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Reset Admin Password] Failed:', error);
        process.exit(1);
    });

