
import React, { useState } from 'react';
import Button from './Button.js';
import { containsProfanity } from '../profanity.js';
import { useAppContext } from '../hooks/useAppContext.js';

const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 6;

const Register: React.FC = () => {
    const { setCurrentUserAndRoute } = useAppContext();
    const [username, setUsername] = useState('');
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!username.trim() || !nickname.trim() || !password.trim()) {
            setError("모든 필드를 입력해주세요.");
            return;
        }
        if (username.trim().length < 2) {
            setError("아이디는 2자 이상이어야 합니다.");
            return;
        }
        if (password.trim().length < 4) {
            setError("비밀번호는 4자 이상이어야 합니다.");
            return;
        }
        if (password !== passwordConfirm) {
            setError("비밀번호가 일치하지 않습니다.");
            return;
        }
        if (nickname.trim().length < NICKNAME_MIN_LENGTH || nickname.trim().length > NICKNAME_MAX_LENGTH) {
            setError(`닉네임은 ${NICKNAME_MIN_LENGTH}자 이상 ${NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`);
            return;
        }
        if (containsProfanity(username) || containsProfanity(nickname)) {
            setError("아이디 또는 닉네임에 부적절한 단어가 포함되어 있습니다.");
            return;
        }


        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, nickname, password }),
            });

            if (!response.ok) {
                let errorText = `회원가입 실패 (${response.statusText})`;
                 try {
                    const errorData = await response.json();
                    errorText = errorData.message || errorText;
                } catch (jsonError) {
                    console.error("Could not parse error response as JSON", jsonError);
                }
                throw new Error(errorText);
            }
            
            const data = await response.json();
            // After successful registration, automatically log the user in
            setCurrentUserAndRoute(data.user);
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
                            <label htmlFor="nickname-register" className="sr-only">Nickname</label>
                            <input
                                id="nickname-register"
                                name="nickname"
                                type="text"
                                required
                                className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="닉네임"
                                value={nickname}
                                onChange={e => setNickname(e.target.value)}
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
                    </div>

                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                    <div className="w-full flex justify-center">
                       <Button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 text-lg"
                        >
                            {isLoading ? '가입하는 중...' : '가입하기'}
                        </Button>
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
