import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';

// AWS SES 클라이언트 초기화
let sesClient: SESClient | null = null;
let transporter: nodemailer.Transporter | null = null;

const initializeEmailService = () => {
    const region = process.env.AWS_REGION || 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const fromEmail = process.env.EMAIL_FROM || 'noreply@yourdomain.com';

    // AWS SES 사용 가능한 경우
    if (accessKeyId && secretAccessKey) {
        sesClient = new SESClient({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
        console.log('[EmailService] AWS SES initialized');
    } else {
        // 개발 환경: Gmail SMTP 또는 로컬 테스트용
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        console.log('[EmailService] SMTP transporter initialized (development mode)');
    }
};

// 서버 시작 시 초기화
initializeEmailService();

/**
 * 이메일 인증 코드를 전송합니다.
 */
export const sendVerificationEmail = async (
    to: string,
    verificationCode: string
): Promise<void> => {
    const fromEmail = process.env.EMAIL_FROM || 'noreply@yourdomain.com';
    const subject = 'SUDAM 이메일 인증';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">이메일 인증</h2>
            <p>안녕하세요,</p>
            <p>SUDAM 회원가입을 위한 이메일 인증 코드입니다:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
                <h1 style="color: #007bff; font-size: 32px; margin: 0;">${verificationCode}</h1>
            </div>
            <p>이 코드는 10분간 유효합니다.</p>
            <p>본인이 요청하지 않았다면 이 이메일을 무시하세요.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">이 이메일은 자동으로 발송되었습니다.</p>
        </div>
    `;

    try {
        if (sesClient) {
            // AWS SES 사용
            const command = new SendEmailCommand({
                Source: fromEmail,
                Destination: {
                    ToAddresses: [to],
                },
                Message: {
                    Subject: {
                        Data: subject,
                        Charset: 'UTF-8',
                    },
                    Body: {
                        Html: {
                            Data: html,
                            Charset: 'UTF-8',
                        },
                    },
                },
            });

            await sesClient.send(command);
            console.log(`[EmailService] Verification email sent to ${to} via AWS SES`);
        } else if (transporter) {
            // SMTP 사용 (개발 환경)
            await transporter.sendMail({
                from: fromEmail,
                to,
                subject,
                html,
            });
            console.log(`[EmailService] Verification email sent to ${to} via SMTP`);
        } else {
            // 이메일 서비스가 설정되지 않은 경우 (개발 환경)
            console.log(`\n========================================`);
            console.log(`[EmailService] 개발 환경 - 이메일 인증 코드`);
            console.log(`[EmailService] 이메일: ${to}`);
            console.log(`[EmailService] 인증 코드: ${verificationCode}`);
            console.log(`========================================\n`);
            // 프로덕션에서는 에러를 던져야 하지만, 개발 환경에서는 로그만 출력
            if (process.env.NODE_ENV === 'production') {
                throw new Error('Email service not configured');
            }
        }
    } catch (error: any) {
        console.error('[EmailService] Failed to send email:', error);
        throw new Error('이메일 전송에 실패했습니다.');
    }
};

/**
 * 비밀번호 재설정 이메일을 전송합니다.
 */
export const sendPasswordResetEmail = async (
    to: string,
    resetToken: string
): Promise<void> => {
    const fromEmail = process.env.EMAIL_FROM || 'noreply@yourdomain.com';
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${baseUrl}/#/reset-password?token=${resetToken}`;
    const subject = 'SUDAM 비밀번호 재설정';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">비밀번호 재설정</h2>
            <p>안녕하세요,</p>
            <p>비밀번호 재설정을 요청하셨습니다. 아래 링크를 클릭하여 비밀번호를 재설정하세요:</p>
            <div style="text-align: center; margin: 20px 0;">
                <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                    비밀번호 재설정
                </a>
            </div>
            <p>또는 아래 링크를 복사하여 브라우저에 붙여넣으세요:</p>
            <p style="color: #666; word-break: break-all;">${resetUrl}</p>
            <p>이 링크는 1시간간 유효합니다.</p>
            <p>본인이 요청하지 않았다면 이 이메일을 무시하세요.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">이 이메일은 자동으로 발송되었습니다.</p>
        </div>
    `;

    try {
        if (sesClient) {
            const command = new SendEmailCommand({
                Source: fromEmail,
                Destination: {
                    ToAddresses: [to],
                },
                Message: {
                    Subject: {
                        Data: subject,
                        Charset: 'UTF-8',
                    },
                    Body: {
                        Html: {
                            Data: html,
                            Charset: 'UTF-8',
                        },
                    },
                },
            });

            await sesClient.send(command);
            console.log(`[EmailService] Password reset email sent to ${to} via AWS SES`);
        } else if (transporter) {
            await transporter.sendMail({
                from: fromEmail,
                to,
                subject,
                html,
            });
            console.log(`[EmailService] Password reset email sent to ${to} via SMTP`);
        } else {
            console.warn(`[EmailService] Email service not configured. Reset token for ${to}: ${resetToken}`);
            if (process.env.NODE_ENV === 'production') {
                throw new Error('Email service not configured');
            }
        }
    } catch (error: any) {
        console.error('[EmailService] Failed to send password reset email:', error);
        throw new Error('이메일 전송에 실패했습니다.');
    }
};

