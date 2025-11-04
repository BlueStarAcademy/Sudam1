import React, { useState, useEffect } from 'react';
import { LiveGameSession, ServerAction, User } from '../types.js';
import Avatar from './Avatar.js';
import Button from './Button.js';
import DraggableWindow from './DraggableWindow.js';
import { AVATAR_POOL, BORDER_POOL } from '../constants.js';

interface DiceRoundSummaryProps {
    session: LiveGameSession;
    currentUser: User;
    onAction: (action: ServerAction) => void;
}

const DiceRoundSummary: React.FC<DiceRoundSummaryProps> = ({ session, currentUser, onAction }) => {
    const { id: gameId, player1, player2, diceRoundSummary, roundEndConfirmations, revealEndTime } = session;
    const [countdown, setCountdown] = useState(20);
    const hasConfirmed = !!(roundEndConfirmations?.[currentUser.id]);

    useEffect(() => {
        const deadline = revealEndTime || (Date.now() + 20000);
        const timerId = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            setCountdown(remaining);
        }, 1000);

        return () => {
            clearInterval(timerId);
        };
    }, [revealEndTime]);

    if (!diceRoundSummary) return null;

    const { round, scores, diceStats } = diceRoundSummary;
    const p1Score = scores[player1.id] || 0;
    const p2Score = scores[player2.id] || 0;
    
    const p1AvatarUrl = AVATAR_POOL.find(a => a.id === player1.avatarId)?.url;
    const p1BorderUrl = BORDER_POOL.find(b => b.id === player1.borderId)?.url;
    const p2AvatarUrl = AVATAR_POOL.find(a => a.id === player2.avatarId)?.url;
    const p2BorderUrl = BORDER_POOL.find(b => b.id === player2.borderId)?.url;

    const renderDiceStats = (playerId: string) => {
        if (!diceStats || !diceStats[playerId]) return null;
        const stats = diceStats[playerId];
        if (stats.totalRolls === 0) return <p className="text-sm text-gray-400">주사위를 굴리지 않았습니다.</p>;

        return (
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                {Array.from({ length: 6 }, (_, i) => i + 1).map(num => {
                    const count = stats.rolls[num] || 0;
                    const percentage = ((count / stats.totalRolls) * 100).toFixed(0);
                    return (
                        <div key={num} className="flex justify-between">
                            <span>{num}:</span>
                            <span className="font-mono">{count}회 ({percentage}%)</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const isFinalRound = diceRoundSummary.round >= (session.settings.diceGoRounds ?? 3);
    const isTie = p1Score === p2Score;

    let buttonText = `다음 라운드 시작 (${countdown})`;
    if (isFinalRound) {
        if (isTie) {
            buttonText = `데스매치 시작 (${countdown})`;
        } else {
            buttonText = `최종 결과 보기 (${countdown})`;
        }
    }
    if (hasConfirmed) {
        buttonText = '상대방 확인 대기 중...';
    }

    return (
        <DraggableWindow title={`${round} 라운드 중간 집계`} initialWidth={650} windowId="dice-round-summary">
            <div className="text-white">
                <p className="text-center text-gray-300 mb-6">백돌을 모두 포획하여 라운드가 종료되었습니다.</p>
                
                <div className="flex justify-around items-center my-6">
                    <div className="flex flex-col items-center text-center">
                        <Avatar userId={player1.id} userName={player1.nickname} size={96} avatarUrl={p1AvatarUrl} borderUrl={p1BorderUrl} />
                        <p className="mt-2 text-xl font-bold">{player1.nickname}</p>
                    </div>
                    <span className="text-4xl font-mono text-gray-300">{p1Score} : {p2Score}</span>
                    <div className="flex flex-col items-center text-center">
                        <Avatar userId={player2.id} userName={player2.nickname} size={96} avatarUrl={p2AvatarUrl} borderUrl={p2BorderUrl} />
                        <p className="mt-2 text-xl font-bold">{player2.nickname}</p>
                    </div>
                </div>

                {diceStats && (
                    <div className="bg-gray-900/50 p-4 rounded-lg my-6">
                        <h3 className="text-lg font-bold text-center text-gray-200 mb-3">1라운드 주사위 통계</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-800/60 p-3 rounded">
                                <h4 className="font-semibold text-center mb-2">{player1.nickname}</h4>
                                {renderDiceStats(player1.id)}
                            </div>
                            <div className="bg-gray-800/60 p-3 rounded">
                                <h4 className="font-semibold text-center mb-2">{player2.nickname}</h4>
                                {renderDiceStats(player2.id)}
                            </div>
                        </div>
                    </div>
                )}

                <Button
                    onClick={() => onAction({ type: 'CONFIRM_ROUND_END', payload: { gameId }})} 
                    disabled={!!hasConfirmed}
                    className="w-full py-3"
                >
                    {buttonText}
                </Button>
            </div>
        </DraggableWindow>
    );
};

export default DiceRoundSummary;