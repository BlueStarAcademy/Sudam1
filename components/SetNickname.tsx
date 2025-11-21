import React, { useState, useEffect } from 'react';
import Button from './Button.js';
import { containsProfanity } from '../profanity.js';
import { useAppContext } from '../hooks/useAppContext.js';

const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 6;

const SetNickname: React.FC = () => {
    const { currentUser, setCurrentUserAndRoute } = useAppContext();
    const [nickname, setNickname] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // 이미 닉네임이 설정되어 있으면 프로필로 이동
        if (currentUser && currentUser.nickname && !currentUser.nickname.startsWith('user_')) {
            window.location.hash = '#/profile';
        }
    }, [currentUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!nickname.trim()) {
            setError("닉네임을 입력해주세요.");
            return;
        }

        if (nickname.trim().length < NICKNAME_MIN_LENGTH || nickname.trim().length > NICKNAME_MAX_LENGTH) {
            setError(`닉네임은 ${NICKNAME_MIN_LENGTH}자 이상 ${NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`);
            return;
        }

        if (containsProfanity(nickname)) {
            setError("닉네임에 부적절한 단어가 포함되어 있습니다.");
            return;
        }

        if (!currentUser) {
            setError("로그인이 필요합니다.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/set-nickname', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname: nickname.trim(), userId: currentUser.id }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '닉네임 설정에 실패했습니다.');
            }

            const data = await response.json();
            setCurrentUserAndRoute(data.user);
            window.location.hash = '#/profile';
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentUser) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-gray-400 mb-4">로그인이 필요합니다.</p>
                    <a 
                        href="#/" 
                        className="text-blue-400 hover:text-blue-300"
                        onClick={(e) => {
                            e.preventDefault();
                            window.location.hash = '#/';
                        }}
                    >
                        로그인 페이지로 이동
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen py-12">
            <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-2xl border border-color">
                <div>
                    <h2 className="text-3xl font-bold text-center text-white">닉네임 설정</h2>
                    <p className="mt-2 text-center text-gray-400">게임에서 사용할 닉네임을 설정해주세요.</p>
                </div>
                <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="nickname-set" className="sr-only">Nickname</label>
                        <input
                            id="nickname-set"
                            name="nickname"
                            type="text"
                            required
                            autoFocus
                            className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                            placeholder="닉네임 (2-6자)"
                            value={nickname}
                            onChange={e => setNickname(e.target.value)}
                            minLength={NICKNAME_MIN_LENGTH}
                            maxLength={NICKNAME_MAX_LENGTH}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            {nickname.length > 0 && (
                                <span className={nickname.length >= NICKNAME_MIN_LENGTH && nickname.length <= NICKNAME_MAX_LENGTH ? 'text-green-400' : 'text-red-400'}>
                                    {nickname.length} / {NICKNAME_MIN_LENGTH}-{NICKNAME_MAX_LENGTH}자
                                </span>
                            )}
                        </p>
                    </div>

                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                    <div className="w-full flex justify-center">
                        <Button 
                            type="submit"
                            disabled={isLoading || !nickname.trim() || nickname.trim().length < NICKNAME_MIN_LENGTH || nickname.trim().length > NICKNAME_MAX_LENGTH}
                            className="w-full py-3 text-lg"
                        >
                            {isLoading ? '설정 중...' : '닉네임 설정'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SetNickname;

