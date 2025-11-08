import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameMode, LiveGameSession, ServerAction, GameProps, Player, User, Point, GameStatus, AppSettings } from '../../types.js';
import { SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES } from '../../constants';
import { SINGLE_PLAYER_STAGES } from '../../constants/singlePlayerConstants.js';
import Button from '../Button.js';
import Dice from '../Dice.js';
import { audioService } from '../../services/audioService.js';

interface ImageButtonProps {
    src: string;
    alt: string;
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
    variant?: 'primary' | 'danger';
}

const ImageButton: React.FC<ImageButtonProps> = ({ src, alt, onClick, disabled = false, title, variant = 'primary' }) => {
    const variantClasses = variant === 'danger'
        ? 'border-red-400 shadow-red-500/40 focus:ring-red-400'
        : 'border-amber-400 shadow-amber-500/30 focus:ring-amber-300';

    return (
        <button
            type="button"
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            title={title}
            className={`relative w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 transition-transform duration-200 ease-out overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${variantClasses} ${disabled ? 'opacity-40 cursor-not-allowed border-gray-700 shadow-none' : 'hover:scale-105 active:scale-95 shadow-lg'}`}
        >
            <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
        </button>
    );
};

interface GameControlsProps {
    session: LiveGameSession;
    isMyTurn: boolean;
    isSpectator: boolean;
    onAction: (action: ServerAction) => void;
    setShowResultModal: (show: boolean) => void;
    setConfirmModalType: (type: 'resign' | null) => void;
    currentUser: GameProps['currentUser'];
    onlineUsers: GameProps['onlineUsers'];
    pendingMove: Point | null;
    onConfirmMove: () => void;
    onCancelMove: () => void;
    isMobile: boolean;
    settings: AppSettings;
    isSinglePlayer?: boolean;
    isSinglePlayerPaused?: boolean;
}

const formatCooldown = (ms: number) => {
    if (ms <= 0) return 'READY';
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

interface ActionButtonsPanelProps {
    session: LiveGameSession;
    isSpectator: boolean;
    onAction: (action: ServerAction) => void;
    currentUser: GameProps['currentUser'];
}

const ACTIVE_GAME_STATUSES: GameStatus[] = [
    'playing',
    'alkkagi_playing',
    'curling_playing',
    'dice_rolling',
    'dice_placing',
    'thief_rolling',
    'thief_placing',
];

const ActionButtonsPanel: React.FC<ActionButtonsPanelProps> = ({ session, isSpectator, onAction, currentUser }) => {
    const [cooldownTime, setCooldownTime] = useState('00:00');
    const { id: gameId, mode, gameStatus } = session;

    useEffect(() => {
        const deadline = session.actionButtonCooldownDeadline?.[currentUser.id];
        if (!deadline) {
            setCooldownTime('READY');
            return;
        }

        const update = () => {
            const remaining = deadline - Date.now();
            setCooldownTime(formatCooldown(remaining));
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [session.actionButtonCooldownDeadline, currentUser.id]);

    const isGameEnded = ['ended', 'no_contest', 'rematch_pending'].includes(gameStatus);
    const canUseActions = SPECIAL_GAME_MODES.some(m => m.mode === mode) || PLAYFUL_GAME_MODES.some(m => m.mode === mode);

    if (isGameEnded || isSpectator || !canUseActions) {
        return null;
    }

    const myActionButtons = session.currentActionButtons?.[currentUser.id];
    const hasButtons = myActionButtons && myActionButtons.length > 0;
    const isGameActive = ACTIVE_GAME_STATUSES.includes(gameStatus);
    const hasUsedThisCycle = session.actionButtonUsedThisCycle?.[currentUser.id];
    const isReady = cooldownTime === 'READY';

    return (
        <div className="flex items-center justify-center gap-2 flex-wrap">
            {hasButtons && !hasUsedThisCycle ? (
                myActionButtons.map(button => (
                    <Button
                        key={button.name}
                        onClick={() => onAction({ type: 'USE_ACTION_BUTTON', payload: { gameId, buttonName: button.name } })}
                        colorScheme={button.type === 'manner' ? 'green' : 'orange'}
                        className="whitespace-nowrap text-[clamp(0.5rem,1.8vmin,0.75rem)] px-[clamp(0.3rem,1.5vmin,0.5rem)] py-[clamp(0.15rem,1vmin,0.25rem)]"
                        title={button.message}
                        disabled={isSpectator || !isGameActive}
                    >
                        {button.name}
                    </Button>
                ))
            ) : (
                <span className="text-xs text-gray-400">다음 액션 대기중...</span>
            )}
            <span className={`text-xs font-mono ${isReady && !hasUsedThisCycle ? 'text-green-400' : 'text-gray-400'}`}>
                {cooldownTime}
            </span>
        </div>
    );
};


const DicePanel: React.FC<{ session: LiveGameSession, isMyTurn: boolean, onAction: (a: ServerAction) => void, currentUser: User }> = ({ session, isMyTurn, onAction, currentUser }) => {
    const { id: gameId, gameStatus } = session;

    const isRolling = gameStatus === 'dice_rolling_animating';
    
    const handleRoll = (itemType?: 'odd' | 'even') => {
        if (isMyTurn && gameStatus === 'dice_rolling') {
            audioService.rollDice(1);
            onAction({ type: 'DICE_ROLL', payload: { gameId, itemType } });
        }
    };

    const myItemUses = session.diceGoItemUses?.[currentUser.id];
    const oddCount = myItemUses?.odd ?? 0;
    const evenCount = myItemUses?.even ?? 0;
    const canRoll = isMyTurn && gameStatus === 'dice_rolling';
    
    const diceValue = isRolling ? null : session.dice?.dice1;

    return (
        <div className={`flex flex-row items-center justify-center gap-3 transition-all ${canRoll ? 'animate-pulse-border-yellow' : 'border-2 border-transparent p-2 rounded-lg'}`}>
            <div className="flex flex-col items-center">
                <Dice 
                    value={diceValue ?? null} 
                    isRolling={isRolling} 
                    size={48}
                    onClick={() => handleRoll()}
                    disabled={!canRoll}
                />
            </div>
            <div className="flex flex-col items-center">
                <Dice 
                    displayText="홀" 
                    color="blue" 
                    value={null} 
                    isRolling={isRolling} 
                    size={48}
                    onClick={() => handleRoll('odd')}
                    disabled={!canRoll || oddCount <= 0}
                />
                <span className="text-xs mt-1 font-bold">{oddCount}개</span>
            </div>
             <div className="flex flex-col items-center">
                <Dice 
                    displayText="짝" 
                    color="yellow" 
                    value={null} 
                    isRolling={isRolling} 
                    size={48}
                    onClick={() => handleRoll('even')}
                    disabled={!canRoll || evenCount <= 0}
                />
                <span className="text-xs mt-1 font-bold">{evenCount}개</span>
            </div>
        </div>
    );
};

const AlkkagiItemPanel: React.FC<{ session: LiveGameSession; isMyTurn: boolean; onAction: (a: ServerAction) => void; currentUser: User; }> = ({ session, isMyTurn, onAction, currentUser }) => {
    const { id: gameId, gameStatus, activeAlkkagiItems } = session;
    const myItems = session.alkkagiItemUses?.[currentUser.id];
    const slowCount = myItems?.slow ?? session.settings.alkkagiSlowItemCount ?? 0;
    const aimCount = myItems?.aimingLine ?? session.settings.alkkagiAimingLineItemCount ?? 0;
    const myActiveItems = activeAlkkagiItems?.[currentUser.id] || [];

    const useItem = (itemType: 'slow' | 'aimingLine') => {
        onAction({ type: 'USE_ALKKAGI_ITEM', payload: { gameId, itemType } });
    };

    const isSlowActive = myActiveItems.includes('slow');
    const isAimActive = myActiveItems.includes('aimingLine');
    const canUse = isMyTurn && gameStatus === 'alkkagi_playing';
    const buttonClasses = "whitespace-nowrap text-[clamp(0.6rem,2.2vmin,0.875rem)] px-[clamp(0.4rem,1.8vmin,0.75rem)] py-[clamp(0.3rem,1.2vmin,0.625rem)]";

    const totalRounds = session.settings.alkkagiRounds || 1;
    if (totalRounds <= 1) {
        return (
            <div className="flex items-center justify-center gap-2">
                <Button
                    onClick={() => useItem('slow')}
                    disabled={!canUse || slowCount <= 0 || isSlowActive}
                    colorScheme={isSlowActive ? 'green' : 'blue'}
                    className={buttonClasses}
                    title={`파워 게이지 속도를 50% 감소시킵니다. 남은 개수: ${slowCount}`}
                >
                    슬로우 ({slowCount})
                </Button>
                <Button
                    onClick={() => useItem('aimingLine')}
                    disabled={!canUse || aimCount <= 0 || isAimActive}
                    colorScheme={isAimActive ? 'green' : 'purple'}
                    className={buttonClasses}
                    title={`조준선 길이를 1000% 증가시킵니다. 남은 개수: ${aimCount}`}
                >
                    조준선 ({aimCount})
                </Button>
            </div>
        );
    }
    
    const maxRefills = totalRounds - 1;
    const myRefillsUsed = session.alkkagiRefillsUsed?.[currentUser.id] || 0;
    const myRefillsLeft = maxRefills - myRefillsUsed;

    return (
        <div className="flex items-center justify-center gap-2">
            <div className="flex flex-col text-center text-xs font-semibold">
                <span className="text-yellow-300">리필: {myRefillsLeft} / {maxRefills}</span>
            </div>
             <div className="h-8 w-px bg-gray-600 mx-2"></div>
            <div className="flex items-center justify-center gap-2">
                 <Button
                    onClick={() => useItem('slow')}
                    disabled={!canUse || slowCount <= 0 || isSlowActive}
                    colorScheme={isSlowActive ? 'green' : 'blue'}
                    className={buttonClasses}
                    title={`파워 게이지 속도를 50% 감소시킵니다. 남은 개수: ${slowCount}`}
                >
                    슬로우 ({slowCount})
                </Button>
                <Button
                    onClick={() => useItem('aimingLine')}
                    disabled={!canUse || aimCount <= 0 || isAimActive}
                    colorScheme={isAimActive ? 'green' : 'purple'}
                    className={buttonClasses}
                    title={`조준선 길이를 1000% 증가시킵니다. 남은 개수: ${aimCount}`}
                >
                    조준선 ({aimCount})
                </Button>
            </div>
        </div>
    );
};


const PlayfulStonesPanel: React.FC<{ session: LiveGameSession, currentUser: GameProps['currentUser'] }> = ({ session, currentUser }) => {
    // This panel is now a fallback for playful modes without special item controls.
    // Currently, it displays nothing for Omok/Ttamok, which is acceptable.
    // A potential future implementation for Ttamok capture count could go here.
    return null;
};

interface ThiefPanelProps {
    session: LiveGameSession;
    isMyTurn: boolean;
    onAction: (a: ServerAction) => void;
    currentUser: User;
}

const ThiefPanel: React.FC<ThiefPanelProps> = ({ session, isMyTurn, onAction, currentUser }) => {
    const { id: gameId, gameStatus, animation, currentPlayer, blackPlayerId, whitePlayerId, thiefPlayerId } = session;

    const diceAnimation = animation?.type === 'dice_roll_main' ? animation : null;
    const isRolling = !!diceAnimation && Date.now() < (diceAnimation.startTime + diceAnimation.duration);
    
    const currentPlayerId = currentPlayer === Player.Black ? blackPlayerId : whitePlayerId;
    const currentPlayerRole = currentPlayerId === thiefPlayerId ? 'thief' : 'police';
    const diceCount = currentPlayerRole === 'thief' ? 1 : 2;

    const handleRoll = () => {
        if (isMyTurn && gameStatus === 'thief_rolling') {
            audioService.rollDice(diceCount);
            onAction({ type: 'THIEF_ROLL_DICE', payload: { gameId } });
        }
    };
    
    return (
        <div className="flex items-center justify-center gap-2">
            {Array.from({ length: diceCount }).map((_, index) => {
                const diceKey = index === 0 ? 'dice1' : 'dice2';
                const diceValue = diceAnimation ? diceAnimation.dice[diceKey as keyof typeof diceAnimation.dice] : session.dice?.[diceKey as keyof typeof session.dice];
                return (
                    <Dice
                        key={index}
                        value={diceValue ?? null}
                        isRolling={isRolling}
                        size={48}
                        onClick={handleRoll}
                        disabled={!isMyTurn || gameStatus !== 'thief_rolling'}
                    />
                );
            })}
        </div>
    );
};

const CurlingItemPanel: React.FC<{ session: LiveGameSession; isMyTurn: boolean; onAction: (a: ServerAction) => void; currentUser: User; }> = ({ session, isMyTurn, onAction, currentUser }) => {
    const { id: gameId, gameStatus, activeCurlingItems } = session;
    const myItems = session.curlingItemUses?.[currentUser.id];
    const slowCount = myItems?.slow ?? session.settings.curlingSlowItemCount ?? 0;
    const aimCount = myItems?.aimingLine ?? session.settings.curlingAimingLineItemCount ?? 0;
    const myActiveItems = activeCurlingItems?.[currentUser.id] || [];


    const useItem = (itemType: 'slow' | 'aimingLine') => {
        onAction({ type: 'USE_CURLING_ITEM', payload: { gameId, itemType } });
    };

    const isSlowActive = myActiveItems.includes('slow');
    const isAimActive = myActiveItems.includes('aimingLine');
    const canUse = isMyTurn && gameStatus === 'curling_playing';
    const buttonClasses = "whitespace-nowrap text-[clamp(0.6rem,2.2vmin,0.875rem)] px-[clamp(0.4rem,1.8vmin,0.75rem)] py-[clamp(0.3rem,1.2vmin,0.625rem)]";

    return (
        <div className="flex items-center justify-center gap-2">
            <Button
                onClick={() => useItem('slow')}
                disabled={!canUse || slowCount <= 0 || isSlowActive}
                colorScheme={isSlowActive ? 'green' : 'blue'}
                className={buttonClasses}
                title={`파워 게이지 속도를 50% 감소시킵니다. 남은 개수: ${slowCount}`}
            >
                슬로우 ({slowCount})
            </Button>
            <Button
                onClick={() => useItem('aimingLine')}
                disabled={!canUse || aimCount <= 0 || isAimActive}
                colorScheme={isAimActive ? 'green' : 'purple'}
                className={buttonClasses}
                title={`조준선 길이를 1000% 증가시킵니다. 남은 개수: ${aimCount}`}
            >
                조준선 ({aimCount})
            </Button>
        </div>
    );
};


const GameControls: React.FC<GameControlsProps> = (props) => {
    const { session, isMyTurn, isSpectator, onAction, setShowResultModal, setConfirmModalType, currentUser, onlineUsers, pendingMove, onConfirmMove, onCancelMove, isMobile, settings, isSinglePlayer, isSinglePlayerPaused = false } = props;
    const { id: gameId, mode, gameStatus, blackPlayerId, whitePlayerId, player1, player2 } = session;
    const isMixMode = mode === GameMode.Mix;
    const isGameEnded = ['ended', 'no_contest', 'rematch_pending'].includes(gameStatus);
    const isGameActive = ACTIVE_GAME_STATUSES.includes(gameStatus);
    const isPreGame = !isGameActive && !isGameEnded;
    const isStrategic = SPECIAL_GAME_MODES.some(m => m.mode === mode);
    const handlePass = () => { if (isMyTurn && !isSpectator && gameStatus === 'playing') onAction({ type: 'PASS_TURN', payload: { gameId } }); };
    const handleResign = () => { if (!isSpectator && !session.isAiGame && isGameActive) setConfirmModalType('resign'); };
    const handleUseItem = (item: 'hidden' | 'scan' | 'missile') => { if(gameStatus !== 'playing') return; const actionType = item === 'hidden' ? 'START_HIDDEN_PLACEMENT' : (item === 'scan' ? 'START_SCANNING' : 'START_MISSILE_SELECTION'); onAction({ type: actionType, payload: { gameId } }); };

    const myPlayerEnum = currentUser.id === blackPlayerId ? Player.Black : Player.White;
    const opponentPlayerEnum = myPlayerEnum === Player.Black ? Player.White : Player.Black;

    const canScan = useMemo(() => {
        if (!session.hiddenMoves || !session.moveHistory) {
            return false;
        }
    
        // Check if there is AT LEAST ONE opponent hidden stone on the board that has NOT been permanently revealed.
        return Object.entries(session.hiddenMoves).some(([moveIndexStr, isHidden]) => {
            if (!isHidden) return false;
            
            const move = session.moveHistory[parseInt(moveIndexStr)];
            if (!move || move.player !== opponentPlayerEnum) {
                return false;
            }
    
            const { x, y } = move;
    
            // Condition 1: The stone must still be on the board.
            if (session.boardState[y]?.[x] !== opponentPlayerEnum) {
                return false;
            }
    
            // Condition 2: The stone must NOT be permanently revealed to everyone.
            const isPermanentlyRevealed = session.permanentlyRevealedStones?.some(p => p.x === x && p.y === y);
            
            return !isPermanentlyRevealed;
        });
    }, [session.hiddenMoves, session.moveHistory, session.boardState, session.permanentlyRevealedStones, opponentPlayerEnum]);
    
    const buttonClasses = "whitespace-nowrap text-[clamp(0.6rem,2.2vmin,0.875rem)] px-[clamp(0.4rem,1.8vmin,0.75rem)] py-[clamp(0.2rem,0.8vmin,0.4rem)]";

    const renderItemButtons = () => {
        const isHiddenMode = mode === GameMode.Hidden || (mode === GameMode.Mix && (session.settings.mixedModes || []).includes(GameMode.Hidden));
        const isMissileMode = mode === GameMode.Missile || (mode === GameMode.Mix && (session.settings.mixedModes || []).includes(GameMode.Missile));
        const p1Id = session.player1.id;
        const myHiddenUsed = currentUser.id === p1Id ? (session.hidden_stones_used_p1 ?? 0) : (session.hidden_stones_used_p2 ?? 0);
        const myScansLeft = currentUser.id === p1Id ? session.scans_p1 : session.scans_p2;
        const myMissilesLeft = currentUser.id === p1Id ? session.missiles_p1 : session.missiles_p2;
        const hiddenLeft = (session.settings.hiddenStoneCount || 0) - myHiddenUsed;
        
        return ( <> {isHiddenMode && <Button onClick={() => handleUseItem('hidden')} disabled={!isMyTurn || isSpectator || gameStatus !== 'playing' || hiddenLeft <= 0} colorScheme="purple" className={buttonClasses}>히든 ({hiddenLeft})</Button>} {isHiddenMode && <Button onClick={() => handleUseItem('scan')} disabled={!isMyTurn || isSpectator || gameStatus !== 'playing' || (myScansLeft ?? 0) <= 0 || !canScan} colorScheme="purple" className={buttonClasses}>스캔 ({myScansLeft ?? 0})</Button>} {isMissileMode && <Button onClick={() => handleUseItem('missile')} disabled={!isMyTurn || isSpectator || gameStatus !== 'playing' || (myMissilesLeft ?? 0) <= 0} colorScheme="orange" className={buttonClasses}>미사일 ({myMissilesLeft ?? 0})</Button>} </> );
    };

    const hasItems = (mode === GameMode.Hidden || mode === GameMode.Missile) || (mode === GameMode.Mix && (session.settings.mixedModes || []).some(m => [GameMode.Hidden, GameMode.Missile].includes(m)));
    if (isSpectator && !currentUser.isAdmin) return null;

    const usesLeft = (session.maxActionButtonUses ?? 0) - (session.actionButtonUses?.[currentUser.id] ?? 0);
    const maxUses = session.maxActionButtonUses;
    const usesLeftText = (typeof usesLeft === 'number' && typeof maxUses === 'number') ? `(${usesLeft})` : '';
    
    const isRequestingAnalysis = session.isAnalyzing;

    if (isSinglePlayer) {
        const stageId = session.stageId;
        const currentStageIndex = stageId ? SINGLE_PLAYER_STAGES.findIndex(s => s.id === stageId) : -1;
        const nextStage = currentStageIndex >= 0 ? SINGLE_PLAYER_STAGES[currentStageIndex + 1] : undefined;
        const highestClearedStageIndex = currentUser.singlePlayerProgress ?? -1;
        const isWinner = session.winner === Player.Black;
        const canTryNextStage = !!nextStage && isWinner && highestClearedStageIndex >= currentStageIndex;

        const refreshCosts = [0, 50, 75, 100, 200];
        const refreshesUsed = session.singlePlayerPlacementRefreshesUsed ?? 0;
        const remainingRefreshes = Math.max(0, 5 - refreshesUsed);
        const costIndex = Math.min(refreshesUsed, refreshCosts.length - 1);
        const nextCost = refreshCosts[costIndex] ?? refreshCosts[refreshCosts.length - 1];
        const moveCount = session.moveHistory?.length ?? 0;
        const isPlayingState = gameStatus === 'playing';
        const currentGold = currentUser.gold ?? 0;
        const canRefreshNow = !isGameEnded && isPlayingState && moveCount === 0 && remainingRefreshes > 0;
        const canAffordRefresh = currentGold >= nextCost;
        const isPaused = isSinglePlayerPaused;
        const refreshDisabled = !canRefreshNow || !canAffordRefresh || isPaused;

        let refreshHelperMessage = '';
        if (remainingRefreshes <= 0) {
            refreshHelperMessage = '재배치 횟수를 모두 사용했습니다.';
        } else if (!isPlayingState) {
            refreshHelperMessage = '게임이 시작되면 재배치할 수 있습니다.';
        } else if (moveCount > 0) {
            refreshHelperMessage = '첫 수를 두기 전에만 재배치할 수 있습니다.';
        } else if (!canAffordRefresh) {
            refreshHelperMessage = '골드가 부족합니다.';
        } else if (isPaused) {
            refreshHelperMessage = '일시 정지 상태에서는 재배치할 수 없습니다.';
        }

        const handleRefreshClick = () => {
            if (refreshDisabled) {
                if (refreshHelperMessage) window.alert(refreshHelperMessage);
                return;
            }
            const confirmationMessage = nextCost > 0
                ? `${nextCost.toLocaleString()} 골드를 사용하여 배치를 다시 섞으시겠습니까? (남은 재배치 ${remainingRefreshes}/5)`
                : '첫 재배치는 무료입니다. 배치를 다시 섞으시겠습니까?';
            if (window.confirm(confirmationMessage)) {
                onAction({ type: 'SINGLE_PLAYER_REFRESH_PLACEMENT', payload: { gameId } } as ServerAction);
            }
        };

        const canResign = isGameActive && !isSpectator && !isGameEnded && !isPaused;
        const handleResignClick = () => {
            if (!canResign) {
                if (isPaused) {
                    window.alert('일시 정지 상태에서는 기권할 수 없습니다.');
                } else if (!isGameActive && !isGameEnded) {
                    window.alert('게임이 시작된 후에만 기권할 수 있습니다.');
                }
                return;
            }
            if (window.confirm('기권하시겠습니까? (스테이지 실패)')) {
                onAction({ type: 'RESIGN_GAME', payload: { gameId } } as ServerAction);
            }
        };

        const handleRetry = () => {
            if (stageId) {
                onAction({ type: 'START_SINGLE_PLAYER_GAME', payload: { stageId } });
            }
        };

        const handleNextStage = () => {
            if (canTryNextStage && nextStage) {
                onAction({ type: 'START_SINGLE_PLAYER_GAME', payload: { stageId: nextStage.id } });
            }
        };

        const handleCloseResults = () => {
            setShowResultModal(false);
            sessionStorage.setItem('postGameRedirect', '#/singleplayer');
            onAction({ type: 'LEAVE_AI_GAME', payload: { gameId } });
        };

        if (isGameEnded) {
            return (
                <footer className="responsive-controls flex-shrink-0 bg-gray-800 rounded-lg p-2 flex flex-col items-stretch justify-center gap-2 w-full min-h-[148px]">
                    {isMobile && settings.features.mobileConfirm && pendingMove && (
                        <div className="flex gap-4 p-2 justify-center">
                            <Button onClick={onCancelMove} colorScheme="red" className="!py-3 !px-6">취소</Button>
                            <Button onClick={onConfirmMove} colorScheme="green" className="!py-3 !px-6 animate-pulse">착수</Button>
                        </div>
                    )}
                    <div className="bg-gray-900/70 border border-stone-700 rounded-xl px-4 py-3 flex flex-wrap items-center justify-center gap-3">
                        <Button onClick={handleRetry} colorScheme="yellow" className="min-w-[120px]">재도전</Button>
                        <Button onClick={handleNextStage} colorScheme="accent" className="min-w-[120px]" disabled={!canTryNextStage}>
                            다음 단계{canTryNextStage && nextStage ? `: ${nextStage.name}` : ''}
                        </Button>
                        <Button onClick={handleCloseResults} colorScheme="green" className="min-w-[120px]">
                            나가기
                        </Button>
                    </div>
                </footer>
            );
        }

        return (
            <footer className="responsive-controls flex-shrink-0 bg-gray-800 rounded-lg p-2 flex flex-col items-stretch justify-center gap-2 w-full min-h-[148px]">
                {isMobile && settings.features.mobileConfirm && pendingMove && (
                    <div className="flex gap-4 p-2 justify-center">
                        <Button onClick={onCancelMove} colorScheme="red" className="!py-3 !px-6">취소</Button>
                        <Button onClick={onConfirmMove} colorScheme="green" className="!py-3 !px-6 animate-pulse">착수</Button>
                    </div>
                )}
                <div className="bg-gray-900/60 border border-stone-700 rounded-xl px-4 py-3 flex flex-col lg:flex-row items-center justify-center gap-6 w-full">
                    <div className="flex flex-col items-center gap-2">
                        <ImageButton
                            src="/images/button/giveup.png"
                            alt="기권"
                            title="기권하기"
                            onClick={handleResignClick}
                            disabled={!canResign}
                            variant="danger"
                        />
                        <span className="text-[10px] text-red-300 font-semibold tracking-wide">기권</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <ImageButton
                            src="/images/button/reflesh.png"
                            alt="돌 재배치"
                            title="돌 재배치"
                            onClick={handleRefreshClick}
                            disabled={refreshDisabled}
                        />
                        <span className="text-[10px] text-amber-200 font-semibold tracking-wide">
                            {remainingRefreshes}/5 · {nextCost === 0 ? '무료' : `${nextCost.toLocaleString()}G`}
                        </span>
                    </div>
                </div>
            </footer>
        );
    }

    return (
        <footer className="responsive-controls flex-shrink-0 bg-gray-800 rounded-lg p-1 flex flex-col items-stretch justify-center gap-1 w-full">
            {isMobile && settings.features.mobileConfirm && pendingMove && (
                 <div className="flex gap-4 p-2 justify-center">
                    <Button onClick={onCancelMove} colorScheme="red" className="!py-3 !px-6">취소</Button>
                    <Button onClick={onConfirmMove} colorScheme="green" className="!py-3 !px-6 animate-pulse">착수</Button>
                </div>
            )}
            {/* Row 1: Manner Actions - 숨김 (싱글플레이에서는 AI봇과의 경기이므로) */}
            {!isSinglePlayer && (
                <div className="bg-gray-900/50 rounded-md p-2 flex flex-row items-center gap-4 w-full">
                    <h3 className="text-xs font-bold text-gray-300 whitespace-nowrap">매너 액션 {usesLeftText}</h3>
                    <div className="flex-grow flex items-center justify-center">
                        <ActionButtonsPanel session={session} isSpectator={isSpectator} onAction={onAction} currentUser={currentUser} />
                    </div>
                </div>
            )}

            {/* Row 2: Game and Special/Playful Functions */}
            <div className="flex flex-col lg:flex-row gap-1 w-full">
                {/* Panel 1: 대국 기능 */}
                <div className="bg-gray-900/50 rounded-md p-2 flex flex-row items-center gap-4 flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-gray-300 whitespace-nowrap">대국 기능</h3>
                    <div className="flex items-center justify-center gap-2 flex-wrap flex-grow">
                        {isGameEnded ? (
                            <Button onClick={() => setShowResultModal(true)} colorScheme="yellow" className={buttonClasses}>결과 보기</Button>
                        ) : (
                            <>
                                {isStrategic && mode !== GameMode.Capture && <Button onClick={handlePass} disabled={!isMyTurn || isSpectator || isPreGame} colorScheme="blue" className={buttonClasses}>통과</Button>}
                                <Button onClick={handleResign} disabled={isSpectator || session.isAiGame || isPreGame} colorScheme="red" className={buttonClasses}>기권</Button>
                            </>
                        )}
                    </div>
                </div>
                
                {/* Panel 2: 특수/놀이 기능 */}
                <div className="bg-gray-900/50 rounded-md p-2 flex flex-row items-center gap-4 flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-gray-300 whitespace-nowrap">{isStrategic ? '특수 기능' : '놀이 기능'}</h3>
                    <div className="flex items-center justify-center gap-2 flex-wrap flex-grow">
                        {isStrategic ? (
                            <>
                                {!isGameEnded && hasItems && renderItemButtons()}
                            </>
                        ) : (
                            mode === GameMode.Dice ? <DicePanel session={session} isMyTurn={isMyTurn} onAction={onAction} currentUser={currentUser} /> :
                            mode === GameMode.Thief ? <ThiefPanel session={session} isMyTurn={isMyTurn} onAction={onAction} currentUser={currentUser} /> :
                            mode === GameMode.Curling ? <CurlingItemPanel session={session} isMyTurn={isMyTurn} onAction={onAction} currentUser={currentUser} /> :
                            mode === GameMode.Alkkagi ? <AlkkagiItemPanel session={session} isMyTurn={isMyTurn} onAction={onAction} currentUser={currentUser} /> :
                            <PlayfulStonesPanel session={session} currentUser={currentUser} />
                        )}
                    </div>
                </div>
            </div>
             {/* Admin Controls */}
            {isSpectator && currentUser.isAdmin && isGameActive && (
                <div className="bg-purple-900/50 rounded-md p-2 flex flex-row items-center gap-4 w-full mt-1">
                    <h3 className="text-xs font-bold text-purple-300 whitespace-nowrap">관리자 기능</h3>
                    <div className="flex items-center justify-center gap-2 flex-wrap flex-grow">
                        <Button
                            onClick={() => {
                                if (window.confirm(`${player1.nickname}님을 기권승 처리하시겠습니까?`)) {
                                    onAction({ type: 'ADMIN_FORCE_WIN', payload: { gameId, winnerId: player1.id } })
                                }
                            }}
                            colorScheme="purple"
                            className={buttonClasses}
                        >
                            {player1.nickname} 기권승
                        </Button>
                        <Button
                            onClick={() => {
                                 if (window.confirm(`${player2.nickname}님을 기권승 처리하시겠습니까?`)) {
                                    onAction({ type: 'ADMIN_FORCE_WIN', payload: { gameId, winnerId: player2.id } })
                                 }
                            }}
                            colorScheme="purple"
                            className={buttonClasses}
                        >
                            {player2.nickname} 기권승
                        </Button>
                    </div>
                </div>
            )}
        </footer>
    );
};

export default GameControls;