// @ts-nocheck
import prisma from "../prismaClient.js";

export interface EmailVerificationToken {
  id: string;
  userId: string;
  email: string;
  token: string;
  code: string;
  expiresAt: Date;
  createdAt: Date;
}

const handleTableNotExists = async <T>(
  operation: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    const errorCode = error.code || error.meta?.code;
    const errorMessage = error.message || '';
    // 테이블이 없는 경우 (P2021: table does not exist, 42P01: relation does not exist)
    if (errorCode === 'P2021' || errorCode === '42P01' ||
        errorMessage.includes('does not exist') || errorMessage.includes('EmailVerificationToken')) {
      return await fallback();
    }
    throw error;
  }
};

export const createEmailVerificationToken = async (data: {
  userId: string;
  email: string;
  token: string;
  code: string;
  expiresAt: Date;
}): Promise<void> => {
  await handleTableNotExists(
    async () => {
      await prisma.emailVerificationToken.create({ data });
    },
    async () => {
      // 테이블이 없으면 raw SQL로 시도 (테이블이 없으면 무시)
      try {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "EmailVerificationToken" (id, "userId", email, token, code, "expiresAt", "createdAt")
          VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW())
        `, data.userId, data.email, data.token, data.code, data.expiresAt);
      } catch (e: any) {
        // 테이블이 정말 없으면 그냥 무시 (마이그레이션 전)
        console.warn('[EmailVerification] Table does not exist, skipping token creation:', e.message);
      }
    }
  );
};

export const getEmailVerificationTokenByUserId = async (
  userId: string
): Promise<EmailVerificationToken | null> => {
  return handleTableNotExists(
    async () => {
      return prisma.emailVerificationToken.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
    },
    async () => {
      // 테이블이 없으면 null 반환
      return null;
    }
  );
};

export const getEmailVerificationTokenByToken = async (
  token: string
): Promise<EmailVerificationToken | null> => {
  return handleTableNotExists(
    async () => {
      return prisma.emailVerificationToken.findUnique({
        where: { token }
      });
    },
    async () => {
      // 테이블이 없으면 null 반환
      return null;
    }
  );
};

export const deleteEmailVerificationTokens = async (
  userId: string
): Promise<void> => {
  await handleTableNotExists(
    async () => {
      await prisma.emailVerificationToken.deleteMany({
        where: { userId }
      });
    },
    async () => {
      // 테이블이 없으면 무시
      console.warn('[EmailVerification] Table does not exist, skipping token deletion');
    }
  );
};

export const verifyUserEmail = async (userId: string): Promise<void> => {
  try {
    await prisma.userCredential.update({
      where: { userId },
      data: { emailVerified: true }
    });
  } catch (error: any) {
    const errorCode = error.code || error.meta?.code;
    const errorMessage = error.message || '';
    // emailVerified 컬럼이 없는 경우 무시
    if (errorCode === 'P2022' || errorCode === '42703' ||
        errorMessage.includes('emailVerified') || errorMessage.includes('column') ||
        errorMessage.includes('does not exist')) {
      console.warn('[EmailVerification] emailVerified column does not exist, skipping update');
      return;
    }
    throw error;
  }
};

