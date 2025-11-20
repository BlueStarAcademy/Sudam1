import React, { useState, useEffect } from 'react';
import DraggableWindow from '../DraggableWindow.js';
import Button from '../Button.js';
import Avatar from '../Avatar.js';

interface MatchFoundModalProps {
    gameId: string;
    player1: {
        id: string;
        nickname: string;
        rating: number;
        winChange: number;
        lossChange: number;
    };
    player2: {
        id: string;
        nickname: string;
        rating: number;
        winChange: number;
        lossChange: number;
    };
    currentUserId: string;
    onClose: () => void;
    onEnterGame: (gameId: string) => void;
}

const MatchFoundModal: React.FC<MatchFoundModalProps> = ({
    gameId,
    player1,
    player2,
    currentUserId,
    onClose,
    onEnterGame
}) => {
    const [countdown, setCountdown] = useState(5);
    const isPlayer1 = currentUserId === player1.id;
    const myInfo = isPlayer1 ? player1 : player2;
    const opponentInfo = isPlayer1 ? player2 : player1;

    useEffect(() => {
        if (countdown <= 0) {
            onEnterGame(gameId);
            return;
        }

        const timer = setTimeout(() => {
            setCountdown(countdown - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [countdown, gameId, onEnterGame]);

    return (
        <DraggableWindow
            title="매칭 성공!"
            windowId="match-found"
            onClose={onClose}
            initialWidth={600}
            closeOnOutsideClick={false}
            isTopmost
        >
            <div className="p-6 flex flex-col items-center gap-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">VS</h2>
                    <p className="text-sm text-gray-400">경기가 곧 시작됩니다</p>
                </div>

                <div className="w-full flex items-center justify-center gap-8">
                    {/* 내 정보 */}
                    <div className="flex-1 flex flex-col items-center gap-3">
                        <Avatar userId={myInfo.id} userName={myInfo.nickname} size={80} />
                        <div className="text-center">
                            <p className="text-lg font-bold text-white">{myInfo.nickname}</p>
                            <p className="text-sm text-gray-300">랭킹: {myInfo.rating}점</p>
                        </div>
                        <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3 w-full">
                            <p className="text-xs text-blue-300 mb-1">예상 점수 변동</p>
                            <p className="text-sm font-semibold text-green-400">승리: +{myInfo.winChange}점</p>
                            <p className="text-sm font-semibold text-red-400">패배: {myInfo.lossChange}점</p>
                        </div>
                    </div>

                    <div className="text-4xl font-bold text-yellow-400">VS</div>

                    {/* 상대방 정보 */}
                    <div className="flex-1 flex flex-col items-center gap-3">
                        <Avatar userId={opponentInfo.id} userName={opponentInfo.nickname} size={80} />
                        <div className="text-center">
                            <p className="text-lg font-bold text-white">{opponentInfo.nickname}</p>
                            <p className="text-sm text-gray-300">랭킹: {opponentInfo.rating}점</p>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 w-full">
                            <p className="text-xs text-gray-400 mb-1">상대방 랭킹</p>
                            <p className="text-sm text-gray-300">{opponentInfo.rating}점</p>
                        </div>
                    </div>
                </div>

                <div className="w-full bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4 text-center">
                    <p className="text-lg font-bold text-yellow-300 mb-2">
                        {countdown}초 후 자동으로 경기장에 입장합니다
                    </p>
                    <div className="w-full bg-yellow-900/50 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-yellow-500 transition-all duration-1000"
                            style={{ width: `${(countdown / 5) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="text-xs text-gray-400 text-center">
                    <p>랭킹전에서는 취소할 수 없습니다.</p>
                    <p>고의로 나가거나 접속을 끊으면 랭킹 점수가 대폭 하락합니다.</p>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default MatchFoundModal;

