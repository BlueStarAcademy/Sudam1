import React, { useMemo, useEffect, useRef, useState } from 'react';
import { LiveGameSession, User, Player, WinReason, StatChange, AnalysisResult, GameMode, GameSummary, InventoryItem, AvatarInfo, BorderInfo, AlkkagiStone } from '../types.js';
import Avatar from './Avatar.js';
import { audioService } from '../services/audioService.js';
import Button from './Button.js';
import DraggableWindow from './DraggableWindow.js';
import { PLAYFUL_GAME_MODES, AVATAR_POOL, BORDER_POOL, CONSUMABLE_ITEMS } from '../constants';
import { getMannerRank as getMannerRankShared } from '../services/manner.js';

interface GameSummaryModalProps {
    session: LiveGameSession;
    currentUser: User;
    onConfirm: () => void;
}

const getIsWinner = (session: LiveGameSession, currentUser: User): boolean | null => {
    const { winner, blackPlayerId, whitePlayerId, player1, player2 } = session;
    if (winner === null || winner === Player.None) return null;
    const isPlayer = currentUser.id === player1.id || currentUser.id === player2.id;
    if (!isPlayer) return null; // Spectators don't have a win/loss status

    return (winner === Player.Black && currentUser.id === blackPlayerId) || 
           (winner === Player.White && currentUser.id === whitePlayerId);
};

const getMannerRank = (score: number) => {
    return getMannerRankShared(score).rank;
};


const XpBar: React.FC<{ initial: number; final: number; max: number; levelUp: boolean; xpGain: number; finalLevel: number; }> = ({ initial, final, max, levelUp, xpGain, finalLevel }) => {
    // Width of the yellow bar, animates from initial to final
    const [barWidth, setBarWidth] = useState(0); 
    // Opacity of the green "flash" element
    const [gainFlashOpacity, setGainFlashOpacity] = useState(0); 
    const [showGainText, setShowGainText] = useState(false);

    const initialPercent = max > 0 ? (initial / max) * 100 : 0;
    const finalPercent = max > 0 ? (levelUp ? 100 : (final / max) * 100) : 0;
    const gainPercent = finalPercent - initialPercent;

    useEffect(() => {
        // Set initial state without animation
        setBarWidth(initialPercent);
        setGainFlashOpacity(0);
        setShowGainText(false);

        // Start animation after a short delay
        const startTimer = setTimeout(() => {
            setShowGainText(true);
            setGainFlashOpacity(1); // Show the green flash
            setBarWidth(finalPercent); // Start the yellow bar animation

            // After the yellow bar animation starts, fade out the green flash
            const fadeTimer = setTimeout(() => {
                setGainFlashOpacity(0);
            }, 500);

            return () => clearTimeout(fadeTimer);
        }, 500);

        return () => clearTimeout(startTimer);
    }, [initial, final, max, levelUp, initialPercent, finalPercent]);
    
    const gainTextKey = `${xpGain}-${initial}`;

    return (
        <div className="flex items-center gap-3">
             <span className="text-sm font-bold w-16 text-right">Lv.{finalLevel}</span>
            <div className="w-full bg-gray-700/50 rounded-full h-4 relative border border-gray-900/50 overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${barWidth}%` }}
                ></div>
                
                <div 
                    className="absolute top-0 h-full bg-gradient-to-r from-green-400 to-green-500 rounded-r-full transition-opacity duration-500 ease-out pointer-events-none"
                    style={{ 
                        left: `${initialPercent}%`, 
                        width: `${gainPercent}%`,
                        opacity: gainFlashOpacity
                    }}
                ></div>

                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-black/80 drop-shadow-sm">
                   {final} / {max}
                </span>

                {levelUp && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white animate-pulse" style={{textShadow: '0 0 5px black'}}>
                        LEVEL UP!
                    </span>
                )}
            </div>
             {showGainText && xpGain > 0 && (
                <span key={gainTextKey} className="text-sm font-bold text-green-400 whitespace-nowrap animate-fade-in-xp w-20">
                    +{xpGain} XP
                </span>
             )}
             <style>{`
                @keyframes fadeInXp {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in-xp {
                    animation: fadeInXp 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

const ScoreDetailsComponent: React.FC<{ analysis: AnalysisResult, session: LiveGameSession }> = ({ analysis, session }) => {
    const { scoreDetails } = analysis;
    const { mode, settings } = session;

    if (!scoreDetails) return <p className="text-center text-gray-400">점수 정보가 없습니다.</p>;
    
    const isSpeedMode = mode === GameMode.Speed || (mode === GameMode.Mix && settings.mixedModes?.includes(GameMode.Speed));
    const isBaseMode = mode === GameMode.Base || (mode === GameMode.Mix && settings.mixedModes?.includes(GameMode.Base));
    const isHiddenMode = mode === GameMode.Hidden || (mode === GameMode.Mix && settings.mixedModes?.includes(GameMode.Hidden));

    return (
        <div className="space-y-3 text-xs md:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 bg-gray-800/50 p-2 rounded-md">
                    <h3 className="font-bold text-center mb-1">흑</h3>
                    <div className="flex justify-between"><span>영토:</span> <span>{scoreDetails.black.territory.toFixed(0)}</span></div>
                    <div className="flex justify-between"><span>따낸 돌:</span> <span>{scoreDetails.black.liveCaptures ?? 0}</span></div>
                    <div className="flex justify-between"><span>사석:</span> <span>{scoreDetails.black.deadStones ?? 0}</span></div>
                    {isBaseMode && <div className="flex justify-between text-blue-300"><span>베이스 보너스:</span> <span>{scoreDetails.black.baseStoneBonus}</span></div>}
                    {isHiddenMode && <div className="flex justify-between text-purple-300"><span>히든 보너스:</span> <span>{scoreDetails.black.hiddenStoneBonus}</span></div>}
                    {isSpeedMode && <div className="flex justify-between text-green-300"><span>시간 보너스:</span> <span>{scoreDetails.black.timeBonus.toFixed(1)}</span></div>}
                    <div className="flex justify-between border-t border-gray-600 pt-1 mt-1 font-bold text-base"><span>총점:</span> <span className="text-yellow-300">{scoreDetails.black.total.toFixed(1)}</span></div>
                </div>
                <div className="space-y-1 bg-gray-800/50 p-2 rounded-md">
                    <h3 className="font-bold text-center mb-1">백</h3>
                    <div className="flex justify-between"><span>영토:</span> <span>{scoreDetails.white.territory.toFixed(0)}</span></div>
                    <div className="flex justify-between"><span>따낸 돌:</span> <span>{scoreDetails.white.liveCaptures ?? 0}</span></div>
                    <div className="flex justify-between"><span>사석:</span> <span>{scoreDetails.white.deadStones ?? 0}</span></div>
                    <div className="flex justify-between"><span>덤:</span> <span>{scoreDetails.white.komi}</span></div>
                    {isBaseMode && <div className="flex justify-between text-blue-300"><span>베이스 보너스:</span> <span>{scoreDetails.white.baseStoneBonus}</span></div>}
                    {isHiddenMode && <div className="flex justify-between text-purple-300"><span>히든 보너스:</span> <span>{scoreDetails.white.hiddenStoneBonus}</span></div>}
                    {isSpeedMode && <div className="flex justify-between text-green-300"><span>시간 보너스:</span> <span>{scoreDetails.white.timeBonus.toFixed(1)}</span></div>}
                    <div className="flex justify-between border-t border-gray-600 pt-1 mt-1 font-bold text-base"><span>총점:</span> <span className="text-yellow-300">{scoreDetails.white.total.toFixed(1)}</span></div>
                </div>
            </div>
        </div>
    );
};

const PlayfulScoreDetailsComponent: React.FC<{ gameSession: LiveGameSession }> = ({ gameSession }) => {
    const { scores, player1, player2, diceGoBonuses } = gameSession;
    const p1Id = player1.id;
    const p2Id = player2.id;

    const p1TotalScore = scores[p1Id] || 0;
    const p2TotalScore = scores[p2Id] || 0;

    const p1Bonus = diceGoBonuses?.[p1Id] || 0;
    const p2Bonus = diceGoBonuses?.[p2Id] || 0;

    const p1CaptureScore = p1TotalScore - p1Bonus;
    const p2CaptureScore = p2TotalScore - p2Bonus;

    const hasBonus = p1Bonus > 0 || p2Bonus > 0;

    if (!hasBonus) {
        return (
            <div className="text-center">
                <p className="text-gray-300">최종 점수</p>
                <p className="text-5xl font-mono my-2">{p1TotalScore} : {p2TotalScore}</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-3 text-xs md:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 bg-gray-800/50 p-2 rounded-md">
                    <h3 className="font-bold text-center mb-1">{player1.nickname}</h3>
                    <div className="flex justify-between"><span>포획 점수:</span> <span>{p1CaptureScore}</span></div>
                    {p1Bonus > 0 && <div className="flex justify-between"><span>마지막 더미 보너스:</span> <span className="text-green-400">+{p1Bonus}</span></div>}
                    <div className="flex justify-between border-t border-gray-600 pt-1 mt-1 font-bold text-base">
                        <span>총점:</span> <span className="text-yellow-300">{p1TotalScore}</span>
                    </div>
                </div>
                <div className="space-y-1 bg-gray-800/50 p-2 rounded-md">
                    <h3 className="font-bold text-center mb-1">{player2.nickname}</h3>
                    <div className="flex justify-between"><span>포획 점수:</span> <span>{p2CaptureScore}</span></div>
                    {p2Bonus > 0 && <div className="flex justify-between"><span>마지막 더미 보너스:</span> <span className="text-green-400">+{p2Bonus}</span></div>}
                    <div className="flex justify-between border-t border-gray-600 pt-1 mt-1 font-bold text-base">
                        <span>총점:</span> <span className="text-yellow-300">{p2TotalScore}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CurlingScoreDetailsComponent: React.FC<{ gameSession: LiveGameSession }> = ({ gameSession }) => {
    const { curlingScores, player1, player2, blackPlayerId, whitePlayerId } = gameSession;
    if (!curlingScores) return <p className="text-center text-gray-400">점수 정보가 없습니다.</p>;

    const blackPlayer = blackPlayerId === player1.id ? player1 : player2;
    const whitePlayer = whitePlayerId === player1.id ? player1 : player2;
    
    const blackScore = curlingScores[Player.Black] || 0;
    const whiteScore = curlingScores[Player.White] || 0;
    
    const blackAvatarUrl = AVATAR_POOL.find((a: AvatarInfo) => a.id === blackPlayer.avatarId)?.url;
    const blackBorderUrl = BORDER_POOL.find((b: BorderInfo) => b.id === blackPlayer.borderId)?.url;
    const whiteAvatarUrl = AVATAR_POOL.find((a: AvatarInfo) => a.id === whitePlayer.avatarId)?.url;
    const whiteBorderUrl = BORDER_POOL.find((b: BorderInfo) => b.id === whitePlayer.borderId)?.url;


    return (
        <div className="text-center">
            <p className="text-gray-300 mb-4">최종 점수</p>
            <div className="flex items-center justify-center my-2">
                <div className="flex flex-col items-center gap-2 w-32 flex-shrink-0">
                    <Avatar userId={blackPlayer.id} userName={blackPlayer.nickname} size={64} avatarUrl={blackAvatarUrl} borderUrl={blackBorderUrl} />
                    <span className="font-bold mt-1 w-full truncate">{blackPlayer.nickname} (흑)</span>
                </div>
                <p className="text-5xl font-mono text-center flex-grow px-2">{blackScore} : {whiteScore}</p>
                <div className="flex flex-col items-center gap-2 w-32 flex-shrink-0">
                    <Avatar userId={whitePlayer.id} userName={whitePlayer.nickname} size={64} avatarUrl={whiteAvatarUrl} borderUrl={whiteBorderUrl}/>
                    <span className="font-bold mt-1 w-full truncate">{whitePlayer.nickname} (백)</span>
                </div>
            </div>
        </div>
    );
};


const GameSummaryModal: React.FC<GameSummaryModalProps> = ({ session, currentUser, onConfirm }) => {
    const { winner, player1, player2, blackPlayerId, whitePlayerId, winReason } = session;
    const soundPlayed = useRef(false);

    const isWinner = getIsWinner(session, currentUser);
    const mySummary = session.summary?.[currentUser.id];
    const isPlayful = PLAYFUL_GAME_MODES.some((m: {mode: GameMode}) => m.mode === session.mode);

    const avatarUrl = useMemo(() => AVATAR_POOL.find((a: AvatarInfo) => a.id === currentUser.avatarId)?.url, [currentUser.avatarId]);
    const borderUrl = useMemo(() => BORDER_POOL.find((b: BorderInfo) => b.id === currentUser.borderId)?.url, [currentUser.borderId]);
    const rewardItem = mySummary?.items?.[0];
    const rewardItemTemplate = rewardItem ? CONSUMABLE_ITEMS.find((item: { name: string; }) => item.name === rewardItem.name) : null;

    useEffect(() => {
        if (soundPlayed.current) return;
        
        if (isWinner === true) audioService.gameWin();
        else if (isWinner === false) audioService.gameLose();
        
        if (mySummary) {
            if (mySummary.level && mySummary.level.initial < mySummary.level.final) {
                setTimeout(() => audioService.levelUp(), 800);
            }
            if (mySummary.manner && getMannerRank(mySummary.manner.initial) !== getMannerRank(mySummary.manner.final)) {
                 setTimeout(() => audioService.levelUp(), 900);
            }
        }
        
        soundPlayed.current = true;
    }, [isWinner, mySummary]);
    
    const isDraw = winner === Player.None;
    const winnerUser = winner === Player.Black 
        ? (player1.id === blackPlayerId ? player1 : player2)
        : (winner === Player.White ? (player1.id === whitePlayerId ? player1 : player2) : null);

    const { title, color } = useMemo(() => {
        if (isDraw) return { title: "무승부", color: 'text-yellow-400' };

        // For spectators or when winner info is not yet available
        if (isWinner === null) {
            if (winnerUser) {
                return { title: `${winnerUser.nickname} 승리`, color: "text-gray-300" };
            }
            return { title: "게임 종료", color: 'text-gray-300' };
        }

        // For players
        if (isWinner) {
            let title = '승리';
            if (winReason === 'resign') title = '기권승';
            if (winReason === 'timeout') title = '시간승';
            return { title, color: 'text-green-400' };
        } else {
            let title = '패배';
            if (winReason === 'resign') title = '기권패';
            if (winReason === 'timeout') title = '시간패';
            return { title, color: 'text-red-400' };
        }
    }, [isWinner, isDraw, winReason, winnerUser]);
    
    const analysisResult = session.analysisResult?.['system']; // System analysis is used for final scores

    const renderGameContent = () => {
        if (isPlayful && winReason === 'resign') {
            const message = isWinner ? "상대방의 기권으로 승리했습니다." : "기권 패배했습니다.";
            return <p className="text-center text-lg">{message}</p>;
        }
        if (winReason === 'score') {
            if (analysisResult) {
                return (
                    <div className="w-full">
                        <ScoreDetailsComponent analysis={analysisResult} session={session} />
                    </div>
                );
            }
            return <p className="text-center text-gray-400 animate-pulse">점수 계산 중...</p>;
        }
        if (session.mode === GameMode.Dice || session.mode === GameMode.Thief) return <PlayfulScoreDetailsComponent gameSession={session} />;
        if (session.mode === GameMode.Curling) return <CurlingScoreDetailsComponent gameSession={session} />;
        if (session.mode === GameMode.Omok || session.mode === GameMode.Ttamok) {
            let message = '';
            if (winReason === 'omok_win') {
                message = isWinner ? '오목 완성' : '상대방 오목 완성';
            } else if (winReason === 'capture_limit') {
                message = isWinner ? '목표 따내기 완료' : '상대방 목표 따내기 완료';
            }
            if (message) {
                return <p className="text-center text-2xl font-bold">{message}</p>;
            }
        }
        if (session.mode === GameMode.Alkkagi) {
            const myPlayerEnum = currentUser.id === blackPlayerId ? Player.Black : Player.White;
            const myStones = (session.alkkagiStones || []).filter((s: AlkkagiStone) => s.player === myPlayerEnum && s.onBoard).length;
            const opponentStones = (session.alkkagiStones || []).filter((s: AlkkagiStone) => s.player !== myPlayerEnum && s.onBoard).length;
        
            if (isWinner) {
                if (myStones > 0) {
                    return <p className="text-center text-lg">{myStones}개의 돌을 남기고 승리했습니다.</p>;
                }
                return <p className="text-center text-lg">상대방의 돌을 모두 떨어뜨리고 승리했습니다.</p>;
            } else { // isWinner is false, I lost.
                if (opponentStones > 0) {
                    return <p className="text-center text-lg">모든 돌이 판 밖으로 나가 패배했습니다. (상대방 돌 {opponentStones}개 남음)</p>;
                }
                return <p className="text-center text-lg">아쉽게 패배했습니다.</p>;
            }
        }
        return <p className="text-center text-gray-400">특별한 경기 내용이 없습니다.</p>;
    }

    const initialMannerRank = mySummary ? getMannerRank(mySummary.manner.initial) : '';
    const finalMannerRank = mySummary ? getMannerRank(mySummary.manner.final) : '';

    return (
        <DraggableWindow title="대국 결과" onClose={onConfirm} initialWidth={600} windowId="game-summary">
            <div className="text-white text-[clamp(0.75rem,2.5vw,1rem)]">
                <h1 className={`text-[clamp(2.25rem,10vw,3rem)] font-black text-center mb-4 tracking-widest ${color}`}>{title}</h1>
                
                <div className="flex flex-col gap-6">
                    {/* Game Content Panel */}
                    <div className="w-full bg-gray-900/50 p-2 sm:p-4 rounded-lg">
                        <h2 className="text-lg font-bold text-center text-gray-200 mb-3 border-b border-gray-700 pb-2">경기 내용</h2>
                        {renderGameContent()}
                    </div>
                    
                    {/* My Results & Rewards Panel */}
                    {mySummary && (
                        <div className="w-full flex flex-col gap-2 sm:gap-4">
                             <div className="bg-gray-900/50 p-2 sm:p-4 rounded-lg space-y-4">
                                <h2 className="text-lg font-bold text-center text-gray-200 mb-3 border-b border-gray-700 pb-2">내 대국 결과</h2>
                                <div className="flex items-center gap-3">
                                    <Avatar userId={currentUser.id} userName={currentUser.nickname} size={48} avatarUrl={avatarUrl} borderUrl={borderUrl} />
                                    <div>
                                        <p className="font-bold">{currentUser.nickname}</p>
                                        <p className="text-xs text-gray-400">
                                            {isPlayful ? '놀이' : '전략'} Lv.{mySummary.level ? mySummary.level.final : (isPlayful ? currentUser.playfulLevel : currentUser.strategyLevel)}
                                        </p>
                                    </div>
                                </div>
                                {mySummary.level && <XpBar initial={mySummary.level.progress.initial} final={mySummary.level.progress.final} max={mySummary.level.progress.max} levelUp={mySummary.level.initial < mySummary.level.final} xpGain={mySummary.xp.change} finalLevel={mySummary.level.final} />}
                                <div className="grid grid-cols-2 gap-2 text-xs text-center">
                                    <div className="bg-gray-800 p-2 rounded-md">
                                        <p className="text-gray-400">랭킹 점수</p>
                                        <p className="font-semibold text-white">{mySummary.rating.final} (<span className={mySummary.rating.change >= 0 ? 'text-green-400' : 'text-red-400'}>{mySummary.rating.change > 0 ? '+' : ''}{mySummary.rating.change}</span>)</p>
                                    </div>
                                    <div className="bg-gray-800 p-2 rounded-md">
                                        <p className="text-gray-400">매너 점수 변동</p>
                                        <p className={`font-semibold ${mySummary.manner.change === 0 ? 'text-white' : mySummary.manner.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {mySummary.manner.change > 0 ? '+' : ''}{mySummary.manner.change}
                                        </p>
                                    </div>
                                    <div className="bg-gray-800 p-2 rounded-md">
                                        <p className="text-gray-400">통산 전적</p>
                                        <p className="font-semibold text-white">{mySummary.overallRecord?.wins}승 {mySummary.overallRecord?.losses}패</p>
                                    </div>
                                    <div className="bg-gray-800 p-2 rounded-md">
                                        <p className="text-gray-400">매너 등급</p>
                                        <p className="font-semibold text-white">{initialMannerRank} &rarr; {finalMannerRank}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-900/50 p-2 sm:p-4 rounded-lg space-y-3">
                                <h2 className="text-lg font-bold text-center text-gray-200 border-b border-gray-700 pb-2">획득 보상</h2>
                                <div className="grid grid-cols-2 gap-2 text-sm text-center">
                                     <div className="bg-gray-800 p-2 rounded-md">
                                        <p className="font-semibold flex items-center justify-center gap-1">
                                            <img src="/images/icon/Gold.png" alt="골드" className="w-4 h-4" /> {(mySummary.gold ?? 0).toLocaleString()} 골드
                                        </p>
                                    </div>
                                    <div className="bg-gray-800 p-2 rounded-md flex items-center justify-center">
                                        {rewardItem && rewardItemTemplate ? (
                                            <div className="flex items-center justify-center gap-2">
                                                {rewardItemTemplate.image && <img src={rewardItemTemplate.image} alt={rewardItem.name} className="w-6 h-6 object-contain" />}
                                                <p className="font-semibold text-xs">{rewardItem.name}</p>
                                            </div>
                                        ) : (
                                            <p className="font-semibold text-xs">🎁 상자 보상 없음</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                 
                 <Button onClick={onConfirm} className="w-full py-3 mt-6">확인</Button>
            </div>
        </DraggableWindow>
    );
};

export default GameSummaryModal;
