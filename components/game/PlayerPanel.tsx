import React, { useMemo } from 'react';
// FIX: Import missing types from the centralized types file.
import { Player, GameProps, GameMode, User, AlkkagiPlacementType, GameSettings, GameStatus, UserWithStatus } from '../../types/index.js';
import Avatar from '../Avatar.js';
import { SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES, ALKKAGI_TURN_TIME_LIMIT, CURLING_TURN_TIME_LIMIT, DICE_GO_MAIN_PLACE_TIME, DICE_GO_MAIN_ROLL_TIME, ALKKAGI_PLACEMENT_TIME_LIMIT, ALKKAGI_SIMULTANEOUS_PLACEMENT_TIME_LIMIT, aiUserId, AVATAR_POOL, BORDER_POOL, PLAYFUL_MODE_FOUL_LIMIT } from '../../constants';
import { SINGLE_PLAYER_STAGES } from '../../constants/singlePlayerConstants.js';

const formatTime = (seconds: number) => {
    if (seconds < 0) seconds = 0;
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const CapturedStones: React.FC<{ count: number; target?: number; panelType: 'black' | 'white' | 'neutral', mode: GameMode, isMobile?: boolean }> = ({ count, target, panelType, mode, isMobile = false }) => {
    const displayCount = typeof target === 'number' && target > 0 ? `${count}/${target}` : `${count}`;
    const isDiceGo = mode === GameMode.Dice;
    
    let label = '따낸 돌';
    if (isDiceGo) {
        label = '포획 점수';
    } else if ([GameMode.Thief, GameMode.Curling].includes(mode)) {
        label = '점수';
    }

    const widthClass = isMobile ? 'w-[3rem]' : 'w-[clamp(4.5rem,16vmin,6rem)]';
    const paddingClass = isMobile ? 'p-0.5' : 'p-1';
    const labelSize = isMobile ? 'text-[0.5rem]' : 'text-[clamp(0.6rem,2vmin,0.75rem)]';
    const countSize = isMobile ? 'text-[0.9rem]' : 'text-[clamp(1rem,5vmin,2rem)]';
    const diceSize = isMobile ? 'w-2 h-2' : 'w-[clamp(0.8rem,3vmin,1rem)] h-[clamp(0.8rem,3vmin,1rem)]';
    const marginClass = isMobile ? 'my-0.5' : 'my-1';

    const baseClasses = `flex flex-col items-center justify-center ${widthClass} rounded-lg shadow-lg border-2 ${paddingClass} text-center h-full`;
    let colorClasses = '';
    let labelColor = 'text-gray-300';
    let countColor = 'text-white';

    if (panelType === 'white') {
        colorClasses = 'bg-gradient-to-br from-gray-50 to-gray-200 border-gray-400';
        labelColor = 'text-gray-700';
        countColor = 'text-black';
    } else { // black or neutral
        colorClasses = 'bg-gradient-to-br from-gray-800 to-black border-gray-600';
    }

    return (
        <div className={`${baseClasses} ${colorClasses}`}>
            <span className={`${labelColor} ${labelSize} font-semibold whitespace-nowrap`}>{label}</span>
            {isDiceGo ? (
                <div className={`font-mono font-bold ${countSize} tracking-tighter ${marginClass} ${countColor} flex items-center justify-center gap-0.5`}>
                    <div className={`${diceSize} rounded-full bg-white border border-black inline-block flex-shrink-0`}></div>
                    <span>{displayCount}</span>
                </div>
            ) : (
                <span className={`font-mono font-bold ${countSize} tracking-tighter ${marginClass} ${countColor}`}>
                    {displayCount}
                </span>
            )}
        </div>
    );
};


const TimeBar: React.FC<{ timeLeft: number; totalTime: number; byoyomiTime: number; byoyomiPeriods: number; totalByoyomi: number; isActive: boolean; isInByoyomi: boolean; isFoulMode?: boolean; }> = ({ timeLeft, totalTime, byoyomiTime, byoyomiPeriods, totalByoyomi, isActive, isInByoyomi, isFoulMode = false }) => {
    const percent = useMemo(() => {
        if (isFoulMode) {
             const turnTime = totalTime > 0 ? totalTime : byoyomiTime;
             return turnTime > 0 ? (timeLeft / turnTime) * 100 : 0;
        }
        if (isInByoyomi) {
            if (!isActive) return 100;
            return byoyomiTime > 0 ? (timeLeft / byoyomiTime) * 100 : 0;
        }
        return totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
    }, [timeLeft, totalTime, byoyomiTime, isInByoyomi, isFoulMode, isActive]);

    const clampedPercent = Math.max(0, Math.min(100, percent));

    return (
        <div className="w-full relative">
            {/* The bar track */}
            <div className={`w-full h-1.5 rounded-full transition-colors ${isInByoyomi || isFoulMode ? 'bg-red-900/70' : 'bg-gray-700'}`}>
                {/* The bar fill */}
                <div
                    className={`h-1.5 rounded-full ${isInByoyomi || isFoulMode ? 'bg-red-500' : 'bg-blue-500'} ${isActive && timeLeft < 5 ? 'animate-pulse' : ''}`}
                    style={{ width: `${clampedPercent}%`, transition: 'width 0.2s linear' }}
                />
            </div>
        </div>
    );
};

interface SinglePlayerPanelProps {
    user: User; playerEnum: Player; score: number; isActive: boolean;
    timeLeft: number; totalTime: number; mainTimeLeft: number; byoyomiPeriodsLeft: number;
    totalByoyomi: number; byoyomiTime: number; isLeft: boolean; session: GameProps['session'];
    captureTarget?: number; role?: '도둑' | '경찰';
    isAiPlayer?: boolean;
    mode: GameMode;
    // FIX: Add isSinglePlayer prop to handle different UI themes
    isSinglePlayer?: boolean;
    isMobile?: boolean;
}

const SinglePlayerPanel: React.FC<SinglePlayerPanelProps> = (props) => {
    const { user, playerEnum, score, isActive, timeLeft, totalTime, mainTimeLeft, byoyomiPeriodsLeft, totalByoyomi, byoyomiTime, isLeft, session, captureTarget, role, isAiPlayer, mode, isSinglePlayer, isMobile = false } = props;
    const { gameStatus, winner, blackPlayerId, whitePlayerId } = session;

    const avatarUrl = useMemo(() => AVATAR_POOL.find(a => a.id === user.avatarId)?.url, [user.avatarId]);
    const borderUrl = useMemo(() => BORDER_POOL.find(b => b.id === user.borderId)?.url, [user.borderId]);

    const isStrategic = SPECIAL_GAME_MODES.some(m => m.mode === mode);
    const isFoulMode = PLAYFUL_GAME_MODES.some(m => m.mode === mode) && ![GameMode.Omok, GameMode.Ttamok].includes(mode);
    const isCurling = mode === GameMode.Curling;
    
    const foulLimit = PLAYFUL_MODE_FOUL_LIMIT;
    const effectiveByoyomiTime = isFoulMode ? totalTime : byoyomiTime;
    const effectiveTotalByoyomi = isFoulMode ? foulLimit : totalByoyomi;
    const effectiveByoyomiPeriodsLeft = Math.max(0, isFoulMode ? foulLimit - (session.timeoutFouls?.[user.id] || 0) : byoyomiPeriodsLeft);
    const showByoyomiStatus = isFoulMode ? true : effectiveTotalByoyomi > 0;

    const levelToDisplay = isStrategic ? user.strategyLevel : user.playfulLevel;
    const levelLabel = isStrategic ? '전략' : '놀이';
    const levelText = `${levelLabel} Lv.${levelToDisplay}`;

    const orderClass = isLeft ? 'flex-row' : 'flex-row-reverse';
    const textAlignClass = isLeft ? 'text-left' : 'text-right';
    const justifyClass = isLeft ? 'justify-start' : 'justify-end';
    
    const isGameEnded = ['ended', 'no_contest', 'rematch_pending'].includes(gameStatus);
    const isWinner = (winner === Player.Black && blackPlayerId === user.id) || (winner === Player.White && whitePlayerId === user.id);
    const isLoser = (winner === Player.Black || winner === Player.White) && !isWinner;
    
    const isInByoyomi = !isFoulMode && mainTimeLeft <= 0 && totalByoyomi > 0;
    

    const isDiceGo = mode === GameMode.Dice;
    const isBlackPanel = isDiceGo || playerEnum === Player.Black;
    const isWhitePanel = !isDiceGo && playerEnum === Player.White;

    const panelType = isBlackPanel ? 'black' : isWhitePanel ? 'white' : 'neutral';

    let panelColorClasses = '';
    let nameTextClasses = '';
    let levelTextClasses = '';
    let timeTextClasses = '';

    // FIX: Apply single-player specific styling
    if (isSinglePlayer) {
        panelColorClasses = isActive && !isGameEnded ? 'bg-stone-800 ring-2 ring-amber-400 border-stone-600' : 'bg-stone-900/50 border-stone-700';
        nameTextClasses = 'text-stone-100';
        levelTextClasses = 'text-stone-400';
        timeTextClasses = 'text-stone-200';
    } else {
        if (panelType === 'black') {
            panelColorClasses = isActive && !isGameEnded ? 'bg-gray-800 ring-2 ring-blue-400 border-gray-600' : 'bg-black/50 border-gray-700';
            nameTextClasses = 'text-white';
            levelTextClasses = 'text-gray-400';
            timeTextClasses = 'text-gray-200';
        } else if (panelType === 'white') {
            panelColorClasses = isActive && !isGameEnded ? 'bg-gray-300 ring-2 ring-blue-500 border-blue-500' : 'bg-gray-200 border-gray-400';
            nameTextClasses = 'text-black';
            levelTextClasses = 'text-gray-600';
            timeTextClasses = 'text-gray-800';
        } else { // Neutral/unassigned
            panelColorClasses = isActive && !isGameEnded ? 'bg-blue-900/50 ring-2 ring-blue-400' : 'bg-gray-800/30';
            nameTextClasses = 'text-white';
            levelTextClasses = 'text-gray-400';
            timeTextClasses = 'text-gray-200';
        }
    }
    
    const winnerColor = isSinglePlayer ? 'text-amber-300' : (isBlackPanel ? 'text-yellow-300' : 'text-yellow-600');
    const loserColor = isSinglePlayer ? 'text-stone-500' : 'text-gray-500';
    const finalNameClass = isWinner ? winnerColor : isLoser ? loserColor : nameTextClasses;

    const totalStones = session.settings.curlingStoneCount || 5;
    const stonesThrown = session.stonesThrownThisRound?.[user.id] || 0;
    const stonesLeft = totalStones - stonesThrown;

    const avatarSize = isMobile ? 32 : 48;
    const nameTextSize = isMobile ? 'text-[0.7rem]' : 'text-[clamp(0.8rem,3vmin,1.125rem)]';
    const levelTextSize = isMobile ? 'text-[0.5rem]' : 'text-[clamp(0.6rem,2vmin,0.75rem)]';
    const timeTextSize = isMobile ? 'text-[0.75rem]' : 'text-[clamp(1rem,3.5vmin,1.25rem)]';
    const winLoseTextSize = isMobile ? 'text-lg' : 'text-2xl';
    const padding = isMobile ? 'p-0.5' : 'p-1';
    const gap = isMobile ? 'gap-1' : 'gap-2';

    return (
        <div className={`flex items-stretch ${gap} flex-1 ${orderClass} ${padding} rounded-lg transition-all duration-300 border ${panelColorClasses}`}>
            <div className={`flex flex-col ${textAlignClass} flex-grow justify-between min-w-0`}>
                <div className={`flex items-center ${gap} ${isLeft ? '' : 'flex-row-reverse'}`}>
                    <Avatar userId={user.id} userName={user.nickname} size={avatarSize} avatarUrl={avatarUrl} borderUrl={borderUrl} />
                    <div className="min-w-0">
                         <div className={`flex items-baseline ${gap} ${justifyClass}`}>
                            {!isLeft && isGameEnded && isWinner && <span className={`${winLoseTextSize} font-black text-blue-400`}>승</span>}
                            {!isLeft && isGameEnded && isLoser && <span className={`${winLoseTextSize} font-black text-red-400`}>패</span>}
                            <h2 className={`font-bold ${nameTextSize} leading-tight whitespace-nowrap ${finalNameClass}`}>{user.nickname} {isAiPlayer && '🤖'} {role && `(${role})`}</h2>
                            {isLeft && isGameEnded && isWinner && <span className={`${winLoseTextSize} font-black text-blue-400`}>승</span>}
                            {isLeft && isGameEnded && isLoser && <span className={`${winLoseTextSize} font-black text-red-400`}>패</span>}
                        </div>
                        <p className={`${levelTextSize} ${levelTextClasses}`}>{levelText}</p>
                         {isCurling && (
                            <div className={`flex items-center gap-2 ${isMobile ? 'text-[0.5rem]' : 'text-xs'} mt-0.5 ${justifyClass} ${levelTextClasses}`}>
                                <span>{session.curlingRound || 1}/{session.settings.curlingRounds || 3}R</span>
                                <span className="font-semibold">남은 스톤: {stonesLeft}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className={isMobile ? 'mt-0.5' : 'mt-1'}>
                    <TimeBar timeLeft={timeLeft} totalTime={totalTime} byoyomiTime={effectiveByoyomiTime} byoyomiPeriods={effectiveByoyomiPeriodsLeft} totalByoyomi={effectiveTotalByoyomi} isActive={isActive && !isGameEnded} isInByoyomi={isInByoyomi} isFoulMode={isFoulMode} />
                    <div className={`flex items-center ${isMobile ? 'mt-0' : 'mt-0.5'} ${justifyClass} gap-1`}>
                        <span className={`font-mono font-bold ${isInByoyomi || (isFoulMode && timeLeft < 10) ? 'text-red-400' : timeTextClasses} ${timeTextSize}`}>{formatTime(timeLeft)}</span>
                        {showByoyomiStatus && (
                            isFoulMode ? (
                                <div className="flex items-center gap-0.5">
                                    {Array.from({ length: effectiveByoyomiPeriodsLeft }).map((_, i) => (
                                        <img
                                            key={i}
                                            src="/images/icon/timer.png"
                                            alt="남은 기회"
                                            title={`남은 기회 ${effectiveByoyomiPeriodsLeft}회`}
                                            className="w-4 h-4 object-contain"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 text-yellow-300">
                                    <img
                                        src="/images/icon/timer.png"
                                        alt="초읽기"
                                        className="w-4 h-4 object-contain"
                                    />
                                    <span className="text-xs font-semibold">{effectiveByoyomiPeriodsLeft}</span>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
            <CapturedStones count={score} target={captureTarget} panelType={panelType} mode={mode} isMobile={isMobile} />
        </div>
    );
};

interface PlayerPanelProps extends GameProps {
  clientTimes: { black: number; white: number; };
  // FIX: Add isSinglePlayer prop to handle different UI themes
  isSinglePlayer?: boolean;
  isMobile?: boolean;
}

const getTurnDuration = (mode: GameMode, gameStatus: GameStatus, settings: GameSettings): number => {
    const isFoulMode = PLAYFUL_GAME_MODES.some(m => m.mode === mode) && ![GameMode.Omok, GameMode.Ttamok].includes(mode);
    if (!isFoulMode) {
        return settings.timeLimit * 60;
    }

    switch (mode) {
        case GameMode.Alkkagi:
            if (gameStatus === 'alkkagi_placement') {
                return ALKKAGI_PLACEMENT_TIME_LIMIT;
            }
            if (gameStatus === 'alkkagi_simultaneous_placement') {
                return ALKKAGI_SIMULTANEOUS_PLACEMENT_TIME_LIMIT;
            }
            return ALKKAGI_TURN_TIME_LIMIT;
        case GameMode.Curling:
            return CURLING_TURN_TIME_LIMIT;
        case GameMode.Dice:
            if (gameStatus === 'dice_rolling') return DICE_GO_MAIN_ROLL_TIME;
            if (gameStatus === 'dice_placing') return DICE_GO_MAIN_PLACE_TIME;
            return DICE_GO_MAIN_ROLL_TIME; // Default for dice
        case GameMode.Thief:
             if (gameStatus === 'thief_rolling') return DICE_GO_MAIN_ROLL_TIME;
             if (gameStatus === 'thief_placing') return DICE_GO_MAIN_PLACE_TIME;
             return DICE_GO_MAIN_ROLL_TIME; // Default for thief
        default:
            return settings.timeLimit * 60;
    }
};


const PlayerPanel: React.FC<PlayerPanelProps> = (props) => {
    const { session, clientTimes, isSinglePlayer, isMobile = false } = props;
    const { player1, player2, blackPlayerId, whitePlayerId, captures, mode, settings, effectiveCaptureTargets, scores, currentPlayer } = session;

    const isScoreMode = [GameMode.Dice, GameMode.Thief, GameMode.Curling].includes(mode);

    const leftPlayerUser = player1;
    const rightPlayerUser = player2;
    
    const leftPlayerEnum = leftPlayerUser.id === blackPlayerId ? Player.Black : (leftPlayerUser.id === whitePlayerId ? Player.White : Player.None);
    const rightPlayerEnum = rightPlayerUser.id === blackPlayerId ? Player.Black : (rightPlayerUser.id === whitePlayerId ? Player.White : Player.None);
    
    const isLeftPlayerActive = currentPlayer === leftPlayerEnum && leftPlayerEnum !== Player.None;
    const isRightPlayerActive = currentPlayer === rightPlayerEnum && rightPlayerEnum !== Player.None;

    const leftPlayerScore = mode === GameMode.Curling 
    ? (session.curlingScores?.[leftPlayerEnum] ?? 0) 
    : isScoreMode 
        ? (scores?.[leftPlayerUser.id] ?? 0) 
        : captures[leftPlayerEnum];

    const rightPlayerScore = mode === GameMode.Curling
        ? (session.curlingScores?.[rightPlayerEnum] ?? 0)
        : isScoreMode
            ? (scores?.[rightPlayerUser.id] ?? 0)
            : captures[rightPlayerEnum];


    const leftPlayerTime = leftPlayerEnum === Player.Black ? clientTimes.black : (leftPlayerEnum === Player.White ? clientTimes.white : (settings.timeLimit * 60));
    const rightPlayerTime = rightPlayerEnum === Player.Black ? clientTimes.black : (rightPlayerEnum === Player.White ? clientTimes.white : (settings.timeLimit * 60));
    
    const leftPlayerMainTime = leftPlayerEnum === Player.Black ? session.blackTimeLeft : (leftPlayerEnum === Player.White ? session.whiteTimeLeft : (settings.timeLimit * 60));
    const rightPlayerMainTime = rightPlayerEnum === Player.Black ? session.blackTimeLeft : (rightPlayerEnum === Player.White ? session.whiteTimeLeft : (settings.timeLimit * 60));

    const leftPlayerByoyomi = leftPlayerEnum === Player.Black ? session.blackByoyomiPeriodsLeft : (leftPlayerEnum === Player.White ? session.whiteByoyomiPeriodsLeft : settings.byoyomiCount);
    const rightPlayerByoyomi = rightPlayerEnum === Player.Black ? session.blackByoyomiPeriodsLeft : (rightPlayerEnum === Player.White ? session.whiteByoyomiPeriodsLeft : settings.byoyomiCount);
    
    const leftPlayerRole = mode === GameMode.Thief ? (leftPlayerUser.id === session.thiefPlayerId ? '도둑' : '경찰') : undefined;
    const rightPlayerRole = mode === GameMode.Thief ? (rightPlayerUser.id === session.thiefPlayerId ? '도둑' : '경찰') : undefined;
    
    const getCaptureTargetForPlayer = (playerEnum: Player) => {
        if (session.isSinglePlayer || mode === GameMode.Capture) {
            const isSurvivalMode = (session.settings as any)?.isSurvivalMode === true;
            // 살리기 바둑 모드: 흑(유저)은 목표점수 없음, 백(봇)만 목표점수 표시
            if (isSurvivalMode && playerEnum === Player.Black) {
                return undefined;
            }
            const target = effectiveCaptureTargets?.[playerEnum];
            // 999는 목표점수가 없음을 의미하므로 undefined 반환
            return target === 999 ? undefined : target;
        }
        if (mode === GameMode.Ttamok) {
            return settings.captureTarget;
        }
        return undefined;
    };

    const isLeftAi = session.isAiGame && leftPlayerUser.id === aiUserId;
    const isRightAi = session.isAiGame && rightPlayerUser.id === aiUserId;
    
    const turnDuration = getTurnDuration(mode, session.gameStatus, settings);

    // 싱글플레이 턴 안내 패널 계산
    const turnInfo = useMemo(() => {
        if (!isSinglePlayer || !session.stageId) return null;
        
        const stage = SINGLE_PLAYER_STAGES.find(s => s.id === session.stageId);
        if (!stage) return null;
        
        // 따내기바둑: 흑의 남은 턴 (blackTurnLimit이 있는 경우)
        if (stage.blackTurnLimit) {
            const blackMovesCount = session.moveHistory.filter(m => m.player === Player.Black && m.x !== -1).length;
            const remainingTurns = Math.max(0, stage.blackTurnLimit - blackMovesCount);
            return {
                type: 'capture' as const,
                label: '흑 남은 턴',
                remaining: remainingTurns,
                total: stage.blackTurnLimit
            };
        }
        
        // 살리기바둑: 백의 남은 턴
        if (stage.survivalTurns) {
            // 백이 수를 둔 횟수를 moveHistory에서 직접 계산 (백이 수를 둘 때마다만 카운팅)
            const whiteMovesCount = session.moveHistory.filter(m => m.player === Player.White && m.x !== -1).length;
            const remainingTurns = Math.max(0, stage.survivalTurns - whiteMovesCount);
            return {
                type: 'survival' as const,
                label: '백 남은 턴',
                remaining: remainingTurns,
                total: stage.survivalTurns
            };
        }
        
        // 자동계가: 자동계가까지 남은 턴
        if (stage.autoScoringTurns) {
            const totalTurns = session.totalTurns ?? session.moveHistory.filter(m => m.x !== -1 && m.player !== Player.None).length;
            const remainingTurns = Math.max(0, stage.autoScoringTurns - totalTurns);
            return {
                type: 'auto_scoring' as const,
                label: '자동계가까지',
                remaining: remainingTurns,
                total: stage.autoScoringTurns
            };
        }
        
        // 기본: 현재 턴 표시 (다른 조건이 없는 경우)
        // 이 경우에는 턴 정보를 표시하지 않음
        return null;
    }, [isSinglePlayer, session.stageId, session.moveHistory, session.totalTurns, session.settings]);
    
    const turnInfoSize = isMobile ? 'w-16 h-16' : 'w-24 h-24 md:w-28 md:h-28';
    const turnInfoLabelSize = isMobile ? 'text-[0.5rem]' : 'text-[11px] md:text-xs';
    const turnInfoValueSize = isMobile ? 'text-lg' : 'text-2xl md:text-3xl';
    const turnInfoTotalSize = isMobile ? 'text-[0.6rem]' : 'text-sm md:text-base';

    return (
        <div className={`flex justify-between items-start ${isMobile ? 'gap-1' : 'gap-2'} flex-shrink-0 h-full`}>
            <SinglePlayerPanel
                user={leftPlayerUser}
                playerEnum={leftPlayerEnum}
                score={leftPlayerScore}
                isActive={isLeftPlayerActive}
                timeLeft={leftPlayerTime}
                totalTime={turnDuration}
                mainTimeLeft={leftPlayerMainTime}
                byoyomiPeriodsLeft={leftPlayerByoyomi}
                totalByoyomi={settings.byoyomiCount}
                byoyomiTime={settings.byoyomiTime}
                isLeft={true}
                session={session}
                captureTarget={getCaptureTargetForPlayer(leftPlayerEnum)}
                role={leftPlayerRole}
                isAiPlayer={isLeftAi}
                mode={mode}
                isSinglePlayer={isSinglePlayer}
                isMobile={isMobile}
            />
            {isSinglePlayer && turnInfo && (
                <div className={`flex items-center justify-center ${turnInfoSize} flex-shrink-0 bg-stone-800/95 rounded-lg border-2 border-stone-500 shadow-xl`}>
                    <div className="flex flex-col items-center justify-center text-center px-1">
                        <span className={`${turnInfoLabelSize} text-stone-300 ${isMobile ? 'mb-0.5' : 'mb-1'} leading-tight font-semibold`}>{turnInfo.label}</span>
                        <div className="flex items-baseline justify-center gap-0.5">
                            <span className={`${turnInfoValueSize} font-bold text-amber-300`}>{turnInfo.remaining}</span>
                            <span className={`${turnInfoTotalSize} text-stone-400`}>/{turnInfo.total}</span>
                        </div>
                    </div>
                </div>
            )}
            <SinglePlayerPanel
                user={rightPlayerUser}
                playerEnum={rightPlayerEnum}
                score={rightPlayerScore}
                isActive={isRightPlayerActive}
                timeLeft={rightPlayerTime}
                totalTime={turnDuration}
                mainTimeLeft={rightPlayerMainTime}
                byoyomiPeriodsLeft={rightPlayerByoyomi}
                totalByoyomi={settings.byoyomiCount}
                byoyomiTime={settings.byoyomiTime}
                isLeft={false}
                session={session}
                captureTarget={getCaptureTargetForPlayer(rightPlayerEnum)}
                role={rightPlayerRole}
                isAiPlayer={isRightAi}
                mode={mode}
                isSinglePlayer={isSinglePlayer}
                isMobile={isMobile}
            />
        </div>
    );
};

export default PlayerPanel;