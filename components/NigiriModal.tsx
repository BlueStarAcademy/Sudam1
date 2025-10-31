
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LiveGameSession, User, ServerAction } from '../types.js';
import { audioService } from '../services/audioService.js';
import Button from './Button.js';
import DraggableWindow from './DraggableWindow.js';

interface NigiriModalProps {
    session: LiveGameSession;
    currentUser: User;
    onAction: (action: ServerAction) => void;
}

const NigiriModal: React.FC<NigiriModalProps> = ({ session, currentUser, onAction }) => {
    const [countdown, setCountdown] = useState(15);
    const choosingSoundPlayed = useRef(false);
    
    const { id: gameId, nigiri, player1, player2, gameStatus } = session;
    if (!nigiri) return null;

    const { holderId, guesserId, result, stones: stoneCount, guess } = nigiri;
    const isGuesser = currentUser.id === guesserId;
    
    useEffect(() => {
        if (gameStatus === 'nigiri_choosing' && !choosingSoundPlayed.current) {
            choosingSoundPlayed.current = true;
        }
    }, [gameStatus]);

    const handleGuess = useCallback((myGuess: 1 | 2) => {
        if (currentUser.id !== session.nigiri?.guesserId || session.gameStatus !== 'nigiri_guessing') {
            return;
        }
        onAction({ type: 'NIGIRI_GUESS', payload: { gameId: session.id, guess: myGuess } });
    }, [session, currentUser, onAction]);

    useEffect(() => {
        if (gameStatus !== 'nigiri_guessing' || !isGuesser) return;
        
        const deadline = session.guessDeadline || (Date.now() + 15 * 1000);
        
        const timerId = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            setCountdown(remaining);
            if (remaining <= 0) {
                clearInterval(timerId);
                // Server will handle the timeout action
            }
        }, 1000);
        return () => clearInterval(timerId);
    }, [gameStatus, isGuesser, session.guessDeadline]);
    
    const getTitle = () => {
        switch (gameStatus) {
            case 'nigiri_reveal':
                return '돌가리기 결과';
            case 'nigiri_guessing':
                return '돌 개수 맞추기';
            case 'nigiri_choosing':
            default:
                return '선공/후공 결정 (돌가리기)';
        }
    };
    
    const renderContent = () => {
        const holder = player1.id === holderId ? player1 : player2;
        const guesser = player1.id === guesserId ? player1 : player2;

        if (gameStatus === 'nigiri_reveal') {
            if (!result || !guesser || !holder || typeof stoneCount !== 'number' || !guess) {
                 return (
                    <div className="text-center animate-pulse">
                        <h2 className="text-2xl font-bold mb-2">결과 확인 중...</h2>
                        <div className="flex justify-center items-center h-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-100"></div>
                        </div>
                    </div>
                );
            }
            
            const guesserWon = result === 'correct';
            const winner = guesserWon ? guesser : holder;
            const isBlack = currentUser.id === winner.id;

            const myColorMessage = isBlack ? '당신은 흑돌 입니다.' : '당신은 백돌 입니다.';
            const stoneClass = isBlack ? 'bg-black border-gray-300' : 'bg-white border-gray-800';

            const guesserMessage = guesserWon ? `${guesser.nickname}님이 맞혔습니다!` : `${guesser.nickname}님이 틀렸습니다.`;
            const resultColor = guesserWon ? 'text-green-400' : 'text-red-400';
            const winnerMessage = `${winner.nickname}님이 흑(선)으로 대국을 시작합니다.`;

            return (
                <div className="text-center">
                    <div className="bg-gray-900 p-4 rounded-lg space-y-3 mb-6">
                         <div className="flex justify-between items-center text-lg">
                            <span className="text-gray-400">쥔 돌의 개수:</span>
                            <span className="font-semibold">{stoneCount}개</span>
                        </div>
                         <div className="flex justify-between items-center text-lg">
                            <span className="text-gray-400">{guesser.nickname}님의 예상:</span>
                            <span className="font-semibold">{guess === 1 ? '홀수' : '짝수'}</span>
                        </div>
                         <div className={`mt-2 text-lg font-bold ${resultColor}`}>
                             {guesserMessage}
                         </div>
                    </div>

                    <p className="text-lg font-semibold mb-4">{winnerMessage}</p>

                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${stoneClass}`} />
                        <p className="text-xl font-bold">{myColorMessage}</p>
                    </div>

                    <p className="mt-6 text-sm text-gray-400 animate-pulse">잠시 후 대국이 시작됩니다...</p>
                </div>
            );
        }

        if (gameStatus === 'nigiri_guessing') {
            if (isGuesser) {
                return (
                    <div className="text-center">
                        <h2 className="text-xl font-bold mb-2">{holder.nickname}님이 돌을 쥐었습니다.</h2>
                        <p className="text-gray-300 mb-4">쥔 돌의 개수가 홀수일지 짝수일지 선택하세요.</p>
                        <div className="my-4 text-center">
                            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2 overflow-hidden">
                                <div className="bg-yellow-400 h-2.5 rounded-full" style={{ width: `${(countdown / 15) * 100}%`, transition: 'width 1s linear' }}></div>
                            </div>
                            <div className="text-5xl font-mono text-yellow-300">{countdown}</div>
                        </div>
                        <div className="flex justify-center gap-4 mt-4">
                            <Button onClick={() => handleGuess(1)} colorScheme="gray" className="w-40 py-4 text-lg">홀수</Button>
                            <Button onClick={() => handleGuess(2)} colorScheme="gray" className="w-40 py-4 text-lg">짝수</Button>
                        </div>
                    </div>
                );
            }
             return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">상대방이 맞추는 중</h2>
                    <p className="text-gray-300 mb-6 animate-pulse">{guesser.nickname}님이 돌 개수를 맞추고 있습니다...</p>
                     <div className="flex justify-center items-center h-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-100"></div>
                    </div>
                </div>
             );
        }

         return ( // nigiri_choosing
            <div className="text-center">
                 <p className="text-gray-300 mb-6 animate-pulse">
                     {isGuesser ? `${holder.nickname}님이 돌을 쥐고 있습니다...` : '시스템이 돌을 쥐어주고 있습니다...'}
                 </p>
                 <div className="flex justify-center items-center h-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-100"></div>
                </div>
            </div>
         );
    };

    return (
        <DraggableWindow title={getTitle()} windowId="nigiri">
            {renderContent()}
        </DraggableWindow>
    );
};

export default NigiriModal;