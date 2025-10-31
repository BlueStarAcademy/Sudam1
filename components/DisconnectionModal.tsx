import React, { useState, useEffect } from 'react';
import { LiveGameSession, User } from '../types.js';

interface DisconnectionModalProps {
    session: LiveGameSession;
    currentUser: User;
}

const DisconnectionModal: React.FC<DisconnectionModalProps> = ({ session, currentUser }) => {
    const { disconnectionState, player1, player2, disconnectionCounts } = session;
    const [timeLeft, setTimeLeft] = useState(90);

    if (!disconnectionState) return null;

    const disconnectedPlayer = disconnectionState.disconnectedPlayerId === player1.id ? player1 : player2;
    const isDisconnectedMe = disconnectedPlayer.id === currentUser.id;
    const count = disconnectionCounts?.[disconnectedPlayer.id] || 1;

    useEffect(() => {
        const updateTimer = () => {
            const elapsed = (Date.now() - disconnectionState.timerStartedAt) / 1000;
            const remaining = Math.max(0, 90 - Math.floor(elapsed));
            setTimeLeft(remaining);
        };

        const timerId = setInterval(updateTimer, 1000);
        updateTimer(); // Initial call

        return () => clearInterval(timerId);
    }, [disconnectionState.timerStartedAt]);
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-8 border border-gray-700 text-center">
                <h2 className="text-2xl font-bold text-yellow-400 mb-4">플레이어 접속 끊김 ({count}/3회)</h2>
                <div className="flex justify-center items-center my-6">
                    <div className="animate-pulse rounded-full h-16 w-16 border-4 border-yellow-400 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
                <p className="text-lg text-white mb-2">
                    <span className="font-bold">{disconnectedPlayer.nickname}</span> 님의 연결이 끊겼습니다.
                </p>
                <p className="text-gray-300">재접속을 기다리는 중입니다...</p>
                <p className="text-4xl font-mono font-bold my-4 text-white">{timeLeft}초</p>
                {isDisconnectedMe && (
                    <p className="text-sm text-red-400 bg-red-900/50 p-2 rounded-md">페이지를 새로고침하여 재접속하세요.</p>
                )}
            </div>
        </div>
    );
};

export default DisconnectionModal;