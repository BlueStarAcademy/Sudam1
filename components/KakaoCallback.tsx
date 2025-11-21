import React, { useEffect, useState } from 'react';
import { useAppContext } from '../hooks/useAppContext.js';

const KakaoCallback: React.FC = () => {
    const { setCurrentUserAndRoute } = useAppContext();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // URL에서 인증 코드 추출
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');

                if (!code) {
                    setError('인증 코드를 받을 수 없습니다.');
                    setIsLoading(false);
                    return;
                }

                // 서버에 카카오 로그인 요청
                const response = await fetch('/api/auth/kakao/callback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || '카카오 로그인에 실패했습니다.');
                }

                const data = await response.json();
                
                // 로그인 성공
                setCurrentUserAndRoute(data.user);
                
                // 닉네임이 없거나 임시 닉네임이면 닉네임 설정 화면으로, 아니면 프로필로
                if (!data.user.nickname || data.user.nickname.startsWith('user_')) {
                    window.location.hash = '#/set-nickname';
                } else {
                    window.location.hash = '#/profile';
                }
            } catch (err: any) {
                console.error('Kakao callback error:', err);
                setError(err.message || '카카오 로그인 처리 중 오류가 발생했습니다.');
                setIsLoading(false);
            }
        };

        handleCallback();
    }, [setCurrentUserAndRoute]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">카카오 로그인 처리 중...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <a 
                        href="#/" 
                        className="text-blue-400 hover:text-blue-300"
                        onClick={(e) => {
                            e.preventDefault();
                            window.location.hash = '#/';
                        }}
                    >
                        로그인 페이지로 돌아가기
                    </a>
                </div>
            </div>
        );
    }

    return null;
};

export default KakaoCallback;

