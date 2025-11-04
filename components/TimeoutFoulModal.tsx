import React, { useState, useEffect } from 'react';
import { GameMode, GameStatus } from '../types.js';

interface TimeoutFoulModalProps {
    gameMode: GameMode;
    gameStatus: GameStatus;
    onClose: () => void;
}

const TimeoutFoulModal: React.FC<TimeoutFoulModalProps> = ({ gameMode, gameStatus, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 4000); // Close after 4 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    const getMessage = () => {
        if (gameMode === GameMode.Alkkagi && gameStatus === 'alkkagi_placement') {
            return '시간이 초과되어 남은 돌이 무작위로 배치됩니다.';
        }
        switch (gameMode) {
            case GameMode.Dice:
            case GameMode.Thief:
                return '차례가 자동으로 진행됩니다.';
            case GameMode.Alkkagi:
                return '차례가 상대에게 넘어갑니다.';
            case GameMode.Curling:
                return '스톤 1개를 잃으며 차례가 넘어갑니다.';
            default:
                return '시간을 초과하여 불이익을 받습니다.';
        }
    };

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-md z-50 animate-slide-down">
            <div className="bg-red-800 border-2 border-red-500 rounded-lg shadow-2xl p-4 text-white">
                <h2 className="text-xl font-bold text-center mb-2">타임오버 파울!</h2>
                <p className="text-center text-red-200">{getMessage()}</p>
                 <div className="absolute bottom-0 left-0 h-1 bg-red-400 animate-shrink-x"></div>
            </div>
             <style>{`
                @keyframes shrink-x {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                .animate-shrink-x {
                    animation: shrink-x 4s linear forwards;
                }
             `}</style>
        </div>
    );
};

export default TimeoutFoulModal;