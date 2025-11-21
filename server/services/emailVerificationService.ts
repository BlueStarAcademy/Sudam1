import { randomBytes } from 'crypto';
import {
    createEmailVerificationToken as dbCreateEmailVerificationToken,
    getEmailVerificationTokenByUserId as dbGetEmailVerificationTokenByUserId,
    getEmailVerificationTokenByToken as dbGetEmailVerificationTokenByToken,
    deleteEmailVerificationTokens as dbDeleteEmailVerificationTokens,
    verifyUserEmail as dbVerifyUserEmail
} from '../db.js';
import { sendVerificationEmail } from './emailService.js';

/**
 * 6자리 인증 코드를 생성합니다.
 */
const generateVerificationCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * 이메일 인증 토큰을 생성합니다.
 */
const generateVerificationToken = (): string => {
    return randomBytes(32).toString('hex');
};

/**
 * 이메일 인증 코드를 전송합니다.
 */
export const sendEmailVerification = async (
    userId: string,
    email: string
): Promise<{ token: string; code: string }> => {
    const code = generateVerificationCode();
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분 후 만료

    try {
        // 기존 토큰 삭제
        await dbDeleteEmailVerificationTokens(userId);

        // 새 토큰 저장
        await dbCreateEmailVerificationToken({
            userId,
            email,
            token,
            code,
            expiresAt,
        });
    } catch (error: any) {
        // 테이블이 없는 경우 (마이그레이션 전)에도 인증 코드는 반환
        const errorCode = error.code || error.meta?.code;
        const errorMessage = error.message || '';
        if (errorCode === 'P2021' || errorCode === '42P01' ||
            errorMessage.includes('does not exist') || errorMessage.includes('EmailVerificationToken')) {
            console.warn('[EmailVerification] Table does not exist, but returning code for development');
        } else {
            throw error;
        }
    }

    // 이메일 전송
    await sendVerificationEmail(email, code);

    return { token, code };
};

/**
 * 이메일 인증 코드를 검증합니다.
 */
export const verifyEmailCode = async (
    userId: string,
    code: string
): Promise<boolean> => {
    const token = await dbGetEmailVerificationTokenByUserId(userId);
    
    if (!token) {
        return false;
    }

    // 만료 확인
    if (new Date() > token.expiresAt) {
        await dbDeleteEmailVerificationTokens(userId);
        return false;
    }

    // 코드 확인
    if (token.code !== code) {
        return false;
    }

    // 인증 완료 처리
    await dbVerifyUserEmail(userId);
    await dbDeleteEmailVerificationTokens(userId);

    return true;
};

/**
 * 이메일 인증 토큰으로 사용자를 확인합니다.
 */
export const verifyEmailToken = async (token: string): Promise<string | null> => {
    const verificationToken = await dbGetEmailVerificationTokenByToken(token);
    
    if (!verificationToken) {
        return null;
    }

    // 만료 확인
    if (new Date() > verificationToken.expiresAt) {
        await dbDeleteEmailVerificationTokens(verificationToken.userId);
        return null;
    }

    // 인증 완료 처리
    await dbVerifyUserEmail(verificationToken.userId);
    await dbDeleteEmailVerificationTokens(verificationToken.userId);

    return verificationToken.userId;
};

