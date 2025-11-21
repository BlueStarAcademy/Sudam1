import prisma from './prismaClient.js';

async function applyMigration() {
    try {
        console.log('[Migration] Starting migration...');
        
        // UserCredential 테이블에 컬럼 추가
        console.log('[Migration] Adding columns to UserCredential...');
        try {
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "UserCredential" 
                ADD COLUMN IF NOT EXISTS "kakaoId" TEXT;
            `);
            console.log('[Migration] Added kakaoId column');
        } catch (e: any) {
            if (!e.message?.includes('already exists') && !e.code?.includes('42701')) {
                console.error('[Migration] Error adding kakaoId:', e.message);
            }
        }

        try {
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "UserCredential" 
                ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
            `);
            console.log('[Migration] Added emailVerified column');
        } catch (e: any) {
            if (!e.message?.includes('already exists') && !e.code?.includes('42701')) {
                console.error('[Migration] Error adding emailVerified:', e.message);
            }
        }

        try {
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "UserCredential" 
                ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
            `);
            console.log('[Migration] Added createdAt column');
        } catch (e: any) {
            if (!e.message?.includes('already exists') && !e.code?.includes('42701')) {
                console.error('[Migration] Error adding createdAt:', e.message);
            }
        }

        try {
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "UserCredential" 
                ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
            `);
            console.log('[Migration] Added updatedAt column');
        } catch (e: any) {
            if (!e.message?.includes('already exists') && !e.code?.includes('42701')) {
                console.error('[Migration] Error adding updatedAt:', e.message);
            }
        }

        // 인덱스 추가
        try {
            await prisma.$executeRawUnsafe(`
                CREATE UNIQUE INDEX IF NOT EXISTS "UserCredential_kakaoId_key" 
                ON "UserCredential"("kakaoId") WHERE "kakaoId" IS NOT NULL;
            `);
            console.log('[Migration] Added kakaoId unique index');
        } catch (e: any) {
            console.log('[Migration] Index may already exist, skipping');
        }

        // EmailVerificationToken 테이블 생성
        console.log('[Migration] Creating EmailVerificationToken table...');
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (
                    "id" TEXT NOT NULL,
                    "userId" TEXT NOT NULL,
                    "email" TEXT NOT NULL,
                    "token" TEXT NOT NULL,
                    "code" TEXT NOT NULL,
                    "expiresAt" TIMESTAMP(3) NOT NULL,
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
                );
            `);
            console.log('[Migration] Created EmailVerificationToken table');
        } catch (e: any) {
            if (!e.message?.includes('already exists') && !e.code?.includes('42P07')) {
                console.error('[Migration] Error creating table:', e.message);
            } else {
                console.log('[Migration] Table may already exist');
            }
        }

        // 인덱스 생성
        try {
            await prisma.$executeRawUnsafe(`
                CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerificationToken_token_key" 
                ON "EmailVerificationToken"("token");
            `);
            await prisma.$executeRawUnsafe(`
                CREATE INDEX IF NOT EXISTS "EmailVerificationToken_userId_idx" 
                ON "EmailVerificationToken"("userId");
            `);
            await prisma.$executeRawUnsafe(`
                CREATE INDEX IF NOT EXISTS "EmailVerificationToken_email_idx" 
                ON "EmailVerificationToken"("email");
            `);
            await prisma.$executeRawUnsafe(`
                CREATE INDEX IF NOT EXISTS "EmailVerificationToken_expiresAt_idx" 
                ON "EmailVerificationToken"("expiresAt");
            `);
            console.log('[Migration] Created indexes');
        } catch (e: any) {
            console.log('[Migration] Indexes may already exist');
        }

        // 외래키 추가
        try {
            await prisma.$executeRawUnsafe(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint 
                        WHERE conname = 'EmailVerificationToken_userId_fkey'
                    ) THEN
                        ALTER TABLE "EmailVerificationToken" 
                        ADD CONSTRAINT "EmailVerificationToken_userId_fkey" 
                        FOREIGN KEY ("userId") REFERENCES "UserCredential"("userId") 
                        ON DELETE CASCADE ON UPDATE CASCADE;
                    END IF;
                END $$;
            `);
            console.log('[Migration] Added foreign key');
        } catch (e: any) {
            console.log('[Migration] Foreign key may already exist');
        }

        console.log('[Migration] Migration completed successfully!');
    } catch (error: any) {
        console.error('[Migration] Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

applyMigration()
    .then(() => {
        console.log('[Migration] Done');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Migration] Failed:', error);
        process.exit(1);
    });

