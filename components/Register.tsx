
import React, { useState } from 'react';
import Button from './Button.js';
import { containsProfanity } from '../profanity.js';
import { useAppContext } from '../hooks/useAppContext.js';

const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 6;

const Register: React.FC = () => {
    const { setCurrentUserAndRoute } = useAppContext();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [requiresVerification, setRequiresVerification] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [userId, setUserId] = useState<string | null>(null);
    
    const handleVerification = async (code: string, userIdToVerify: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/auth/email/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userIdToVerify, code }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '인증에 실패했습니다.');
            }
            
            // 인증 성공, 사용자 정보 가져오기
            const userResponse = await fetch('/api/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userIdToVerify }),
            });
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                // 닉네임이 없으면 닉네임 설정 화면으로 이동
                if (!userData.user.nickname || userData.user.nickname.startsWith('user_')) {
                    window.location.hash = '#/set-nickname';
                } else {
                    setCurrentUserAndRoute(userData.user);
                }
            } else {
                throw new Error('사용자 정보를 가져올 수 없습니다.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const trimmedUsername = username.trim();
        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();

        if (!trimmedUsername || !trimmedPassword || !trimmedEmail) {
            setError("모든 필드를 입력해주세요.");
            return;
        }
        
        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            setError("올바른 이메일 형식이 아닙니다.");
            return;
        }
        if (trimmedUsername.length < 2) {
            setError("아이디는 2자 이상이어야 합니다.");
            return;
        }
        if (trimmedPassword.length < 4) {
            setError("비밀번호는 4자 이상이어야 합니다.");
            return;
        }
        if (trimmedPassword !== passwordConfirm.trim()) {
            setError("비밀번호가 일치하지 않습니다.");
            return;
        }
        if (containsProfanity(trimmedUsername)) {
            setError("아이디에 부적절한 단어가 포함되어 있습니다.");
            return;
        }


        setIsLoading(true);
        try {
            const requestBody = { 
                username: trimmedUsername, 
                email: trimmedEmail, 
                password: trimmedPassword 
            };
            console.log('[Register] Sending registration request:', { 
                username: requestBody.username, 
                email: requestBody.email, 
                passwordLength: requestBody.password.length,
                hasUsername: !!requestBody.username,
                hasEmail: !!requestBody.email,
                hasPassword: !!requestBody.password
            });
            
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                let errorText = `회원가입 실패 (${response.statusText})`;
                 try {
                    const errorData = await response.json();
                    errorText = errorData.message || errorText;
                    console.error('[Register] Server error response:', errorData);
                } catch (jsonError) {
                    console.error("Could not parse error response as JSON", jsonError);
                    const text = await response.text();
                    console.error('[Register] Raw error response:', text);
                }
                throw new Error(errorText);
            }
            
            const data = await response.json();
            
            if (data.requiresEmailVerification) {
                // 이메일 인증 필요
                setRequiresVerification(true);
                setUserId(data.user.id);
                // 개발 환경에서 인증 코드가 포함된 경우 자동 입력
                if (data.verificationCode) {
                    setVerificationCode(data.verificationCode);
                    setError(null);
                    // 개발 환경에서는 자동으로 인증 시도
                    if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost' || window.location.hostname.includes('192.168')) {
                        setTimeout(() => {
                            // 자동 인증 시도
                            handleVerification(data.verificationCode, data.user.id);
                        }, 500);
                    }
                } else {
                    setError(data.message || '이메일 인증 코드를 입력해주세요.');
                }
            } else {
                // 이메일 인증 불필요 (자동 로그인)
                setCurrentUserAndRoute(data.user);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center py-12">
            <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-2xl border border-color">
                <div>
                    <h2 className="text-3xl font-bold text-center text-white">회원가입</h2>
                    <p className="mt-2 text-center text-gray-400">새로운 계정을 생성합니다.</p>
                </div>
                <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm space-y-4">
                         <div>
                            <label htmlFor="username-register" className="sr-only">Username</label>
                            <input
                                id="username-register"
                                name="username"
                                type="text"
                                required
                                className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="아이디"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                minLength={NICKNAME_MIN_LENGTH}
                                maxLength={NICKNAME_MAX_LENGTH}
                            />
                        </div>
                        <div>
                            <label htmlFor="email-register" className="sr-only">Email</label>
                            <input
                                id="email-register"
                                name="email"
                                type="email"
                                required
                                className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="이메일"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password-register" className="sr-only">Password</label>
                            <input
                                id="password-register"
                                name="password"
                                type="password"
                                required
                                className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="비밀번호"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password-confirm" className="sr-only">Confirm Password</label>
                            <input
                                id="password-confirm"
                                name="passwordConfirm"
                                type="password"
                                required
                                className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="비밀번호 확인"
                                value={passwordConfirm}
                                onChange={e => setPasswordConfirm(e.target.value)}
                            />
                        </div>
                        {requiresVerification && (
                            <div>
                                <label htmlFor="verification-code" className="sr-only">Verification Code</label>
                                <input
                                    id="verification-code"
                                    name="verificationCode"
                                    type="text"
                                    required
                                    className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder="이메일 인증 코드 (6자리)"
                                    value={verificationCode}
                                    onChange={e => setVerificationCode(e.target.value)}
                                    maxLength={6}
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    {process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost' || window.location.hostname.includes('192.168')
                                        ? '개발 환경: 서버 콘솔에서 인증 코드를 확인하세요.'
                                        : '이메일로 전송된 6자리 인증 코드를 입력하세요.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                    <div className="w-full flex justify-center">
                       {requiresVerification ? (
                           <Button 
                                type="button"
                                disabled={isLoading || !verificationCode || verificationCode.length !== 6}
                                className="w-full py-3 text-lg"
                                onClick={async () => {
                                    if (!userId || !verificationCode) return;
                                    await handleVerification(verificationCode, userId);
                                }}
                            >
                                {isLoading ? '인증 중...' : '인증 완료'}
                            </Button>
                       ) : (
                           <Button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 text-lg"
                            >
                                {isLoading ? '가입하는 중...' : '가입하기'}
                            </Button>
                       )}
                    </div>
                </form>
                 <div className="text-sm text-center">
                    <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }} className="font-medium text-blue-400 hover:text-blue-300">
                        이미 계정이 있으신가요? 로그인
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Register;
