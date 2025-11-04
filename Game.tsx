import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
// FIX: Import types from the new centralized types barrel file
import { Player, GameMode, GameStatus, Point, GameProps, LiveGameSession, ServerAction } from './types/index.js';
import GameArena from './components/GameArena.js';
import Sidebar from './components/game/Sidebar.js';
import PlayerPanel from './components/game/PlayerPanel.js';
import GameModals from './components/game/GameModals.js';
import TurnDisplay from './components/game/TurnDisplay.js';
import { audioService } from './services/audioService.js';
import { TerritoryAnalysisWindow, HintWindow } from './components/game/AnalysisWindows.js';
import GameControls from './components/game/GameControls.js';
import { PLAYFUL_GAME_MODES, SPECIAL_GAME_MODES } from './constants.js';
import { useAppContext } from './hooks/useAppContext.js';
import DisconnectionModal from './components/DisconnectionModal.js';
// FIX: Import TimeoutFoulModal component to resolve 'Cannot find name' error.
import TimeoutFoulModal from './components/TimeoutFoulModal.js';
import SinglePlayerControls from './components/game/SinglePlayerControls.js';
import SinglePlayerInfoPanel from './components/game/SinglePlayerInfoPanel.js';
import { useClientTimer } from './hooks/useClientTimer.js';

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

interface GameComponentProps {
    session: LiveGameSession;
}

const Game: React.FC<GameComponentProps> = ({ session }) => {
    const { 
        currentUser,
        currentUserWithStatus,
        handlers,
        onlineUsers,
        waitingRoomChats,
        gameChats,
        negotiations,
        activeNegotiation,
        settings,
    } = useAppContext();

    const { id: gameId, currentPlayer, gameStatus, player1, player2, mode, blackPlayerId, whitePlayerId } = session;

    if (!player1?.id || !player2?.id || !currentUser || !currentUserWithStatus) {
        return <div className="flex items-center justify-center min-h-screen">플레이어 정보를 불러오는 중...</div>;
    }

    const [confirmModalType, setConfirmModalType] = useState<'resign' | null>(null);
    const clientTimes = useClientTimer(session);
    const [showResultModal, setShowResultModal] = useState(false);
    const [showFinalTerritory, setShowFinalTerritory] = useState(false);
    const [justScanned, setJustScanned] = useState(false);
    const [pendingMove, setPendingMove] = useState<Point | null>(null);
    const [isAnalysisActive, setIsAnalysisActive] = useState(false);
    
    const prevGameStatus = usePrevious(gameStatus);
    const prevCurrentPlayer = usePrevious(currentPlayer);
    const prevCaptures = usePrevious(session.captures);
    const prevAnimationType = usePrevious(session.animation?.type);
    const warningSoundPlayedForTurn = useRef(false);
    const prevMoveCount = usePrevious(session.moveHistory?.length);

    const isSpectator = useMemo(() => currentUserWithStatus?.status === 'spectating', [currentUserWithStatus]);
    const isSinglePlayer = session.isSinglePlayer;
    
    // --- Mobile UI State ---
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const gameChat = useMemo(() => gameChats[session.id] || [], [gameChats, session.id]);
    const prevChatLength = usePrevious(gameChat.length);

    useEffect(() => {
        const checkIsMobile = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    useEffect(() => {
        if (!isMobileSidebarOpen && prevChatLength !== undefined && gameChat.length > prevChatLength) {
            setHasNewMessage(true);
        }
    }, [gameChat.length, prevChatLength, isMobileSidebarOpen]);

    const openMobileSidebar = () => {
        setIsMobileSidebarOpen(true);
        setHasNewMessage(false);
    };

    useEffect(() => {
        const gameHasJustEnded =
            (gameStatus === 'ended' || gameStatus === 'no_contest') &&
            prevGameStatus !== 'ended' &&
            prevGameStatus !== 'no_contest' &&
            prevGameStatus !== 'rematch_pending';

        if (gameHasJustEnded) {
            setShowResultModal(true);
            setShowFinalTerritory(true);
        }
    }, [gameStatus, prevGameStatus]);
    
    const myPlayerEnum = useMemo(() => {
        if (isSpectator) return Player.None;
        if (blackPlayerId === currentUser.id) return Player.Black;
        if (whitePlayerId === currentUser.id) return Player.White;
        if ((mode === GameMode.Base || (mode === GameMode.Mix && session.settings.mixedModes?.includes(GameMode.Base))) && gameStatus === 'base_placement') {
             return currentUser.id === player1.id ? Player.Black : Player.White;
        }
        return Player.None;
    }, [currentUser.id, blackPlayerId, whitePlayerId, isSpectator, mode, gameStatus, player1.id, player2.id, session.settings.mixedModes]);
    
    const isMyTurn = useMemo(() => {
        if (isSpectator) return false;
        if (gameStatus === 'alkkagi_simultaneous_placement' && session.settings.alkkagiPlacementType === '일괄 배치') {
            const myStonesOnBoard = (session.alkkagiStones || []).filter(s => s.player === myPlayerEnum).length;
            const myStonesInPlacement = (currentUser.id === player1.id ? session.alkkagiStones_p1 : session.alkkagiStones_p2)?.length || 0;
            return (myStonesOnBoard + myStonesInPlacement) < (session.settings.alkkagiStoneCount || 5);
        }
        switch (gameStatus) {
            case 'dice_turn_rolling': return session.turnOrderRolls?.[currentUser.id] === null;
            case 'dice_turn_choice': return session.turnChooserId === currentUser.id;
            case 'playing': case 'hidden_placing': case 'scanning': case 'missile_selecting': 
            case 'alkkagi_placement': case 'alkkagi_playing': case 'curling_playing':
            case 'dice_rolling': case 'dice_placing': case 'thief_rolling': case 'thief_placing':
                return myPlayerEnum !== Player.None && myPlayerEnum === currentPlayer;
            case 'base_placement': {
                 const myStones = currentUser.id === player1.id ? session.baseStones_p1 : session.baseStones_p2;
                 return (myStones?.length || 0) < (session.settings.baseStones || 4);
            }
            default: return false;
        }
    }, [myPlayerEnum, currentPlayer, gameStatus, isSpectator, session, currentUser.id, player1.id, session.settings]);
    
    // --- Sound Effects ---
    const prevIsMyTurn = usePrevious(isMyTurn);
    useEffect(() => {
        if (isMyTurn && !prevIsMyTurn) {
            const isPlayfulTurnSoundMode = [ GameMode.Dice, GameMode.Thief, GameMode.Alkkagi, GameMode.Curling, ].includes(session.mode);
            if (isPlayfulTurnSoundMode) audioService.myTurn();
        }
    }, [isMyTurn, prevIsMyTurn, session.mode]);

    const prevLastMove = usePrevious(session.lastMove);
    useEffect(() => {
        if (session.lastMove && session.lastMove.x !== -1 && JSON.stringify(session.lastMove) !== JSON.stringify(prevLastMove)) {
            const isGoBasedGame = SPECIAL_GAME_MODES.some(m => m.mode === session.mode) || 
                                  [GameMode.Omok, GameMode.Ttamok, GameMode.Dice, GameMode.Thief].includes(session.mode);
            if (isGoBasedGame) audioService.placeStone();
        }
    }, [session.lastMove, prevLastMove, session.mode]);
    
    useEffect(() => { if (prevCaptures) { /* Capture sounds removed */ } }, [session.captures, prevCaptures, session.justCaptured, session.blackPlayerId, currentUser.id]);

    useEffect(() => {
        if (gameStatus === 'scanning' && prevGameStatus !== 'scanning') audioService.playScanBgm();
        else if (gameStatus !== 'scanning' && prevGameStatus === 'scanning') audioService.stopScanBgm();
        return () => { if (gameStatus === 'scanning') audioService.stopScanBgm(); };
    }, [gameStatus, prevGameStatus]);

    useEffect(() => {
        const anim = session.animation;
        if (anim && anim.type !== prevAnimationType) { 
            switch(anim.type) {
                case 'missile': case 'hidden_missile': audioService.launchMissile(); break;
                case 'hidden_reveal': if (!justScanned) audioService.revealHiddenStone(); break;
                case 'scan':
                    setJustScanned(true); setTimeout(() => setJustScanned(false), 1000);
                    if (anim.success) audioService.scanSuccess(); else audioService.scanFail();
                    break;
            }
        }
    }, [session.animation, prevAnimationType, justScanned]);

    useEffect(() => {
        const activeStartStatuses: GameStatus[] = [ 'playing', 'alkkagi_placement', 'alkkagi_simultaneous_placement', 'curling_playing', 'dice_rolling', 'thief_rolling' ];
        if (activeStartStatuses.includes(gameStatus) && (prevGameStatus === undefined || !activeStartStatuses.includes(prevGameStatus))) audioService.gameStart();
    }, [gameStatus, prevGameStatus]);

    useEffect(() => { return () => audioService.stopScanBgm(); }, []);

    useEffect(() => {
        const isGameOver = ['ended', 'no_contest', 'scoring'].includes(gameStatus);
        const hasTurnChanged = prevMoveCount !== undefined && session.moveHistory && session.moveHistory.length > prevMoveCount;
    
        if (!isMyTurn || hasTurnChanged || isGameOver) {
            if (warningSoundPlayedForTurn.current) {
                audioService.stopTimerWarning();
                warningSoundPlayedForTurn.current = false;
            }
        }
        
        if (isMyTurn && !isGameOver) {
            const myTime = myPlayerEnum === Player.Black ? clientTimes.clientTimes.black : clientTimes.clientTimes.white;
            if (myTime <= 10 && myTime > 0 && !warningSoundPlayedForTurn.current) {
                audioService.timerWarning();
                warningSoundPlayedForTurn.current = true;
            }
        }
    }, [isMyTurn, clientTimes.clientTimes, myPlayerEnum, session.moveHistory, prevMoveCount, gameStatus]);


    const isItemModeActive = ['hidden_placing', 'scanning', 'missile_selecting', 'missile_animating', 'scanning_animating'].includes(gameStatus);

    const handleBoardClick = useCallback((x: number, y: number) => {
        audioService.stopTimerWarning();
        if (isSpectator || gameStatus === 'missile_animating') return;

        if (isMobile && settings.features.mobileConfirm && isMyTurn && !isItemModeActive) {
            if (pendingMove && pendingMove.x === x && pendingMove.y === y) return;
            setPendingMove({ x, y });
            return;
        }
        
        let actionType: ServerAction['type'] | null = null;
        let payload: any = { gameId, x, y };

        if ((mode === GameMode.Omok || mode === GameMode.Ttamok) && gameStatus === 'playing' && isMyTurn) {
            actionType = 'OMOK_PLACE_STONE';
        } else if (gameStatus === 'scanning' && isMyTurn) {
            audioService.stopScanBgm();
            actionType = 'SCAN_BOARD';
        } else if (gameStatus === 'base_placement') {
            const myStones = currentUser.id === player1.id ? session.baseStones_p1 : session.baseStones_p2;
            if ((myStones?.length || 0) < (session.settings.baseStones || 4)) actionType = 'PLACE_BASE_STONE';
        } else if (['playing', 'hidden_placing'].includes(gameStatus) && isMyTurn) {
            actionType = 'PLACE_STONE'; 
            payload.isHidden = gameStatus === 'hidden_placing';
            if (payload.isHidden) audioService.stopScanBgm();
        }

        if (actionType) handlers.handleAction({ type: actionType, payload } as ServerAction);
    }, [isSpectator, gameStatus, isMyTurn, gameId, handlers.handleAction, currentUser.id, player1.id, session.baseStones_p1, session.baseStones_p2, session.settings.baseStones, mode, isMobile, settings.features.mobileConfirm, pendingMove, isItemModeActive]);

    const handleConfirmMove = useCallback(() => {
        audioService.stopTimerWarning();
        if (!pendingMove) return;
        
        let actionType: ServerAction['type'] | null = null;
        let payload: any = { gameId, x: pendingMove.x, y: pendingMove.y };

        if ((mode === GameMode.Omok || mode === GameMode.Ttamok) && gameStatus === 'playing' && isMyTurn) {
            actionType = 'OMOK_PLACE_STONE';
        } else if (['playing', 'hidden_placing'].includes(gameStatus) && isMyTurn) {
            actionType = 'PLACE_STONE'; 
            payload.isHidden = gameStatus === 'hidden_placing';
        }
        
        if (actionType) handlers.handleAction({ type: actionType, payload } as ServerAction);
        
        setPendingMove(null);
    }, [pendingMove, gameId, handlers, gameStatus, isMyTurn, mode]);

    const handleCancelMove = useCallback(() => setPendingMove(null), []);

    const analysisResult = useMemo(() => session.analysisResult?.[currentUser.id] ?? (['ended','no_contest'].includes(gameStatus) ? session.analysisResult?.['system'] : null), [session.analysisResult, currentUser.id, gameStatus]);

    const isNoContestLeaveAvailable = useMemo(() => {
        if (isSpectator || session.isAiGame) return false;
        return !!session.canRequestNoContest?.[currentUser.id];
    }, [session.canRequestNoContest, currentUser.id, isSpectator, session.isAiGame]);

    const handleLeaveOrResignClick = useCallback(() => {
        if (isSpectator) {
            handlers.handleAction({ type: 'LEAVE_SPECTATING' });
            return;
        }
        if (['ended', 'no_contest', 'rematch_pending'].includes(gameStatus)) {
            const actionType = session.isAiGame ? 'LEAVE_AI_GAME' : 'LEAVE_GAME_ROOM';
            handlers.handleAction({ type: actionType, payload: { gameId } });
            return;
        }
        if (isNoContestLeaveAvailable) {
            if (window.confirm("상대방의 장고로 인해 페널티 없이 무효 처리하고 나가시겠습니까?")) {
                handlers.handleAction({ type: 'REQUEST_NO_CONTEST_LEAVE', payload: { gameId } });
            }
        } else {
            setConfirmModalType('resign');
        }
    }, [isSpectator, handlers.handleAction, session.isAiGame, gameId, gameStatus, isNoContestLeaveAvailable]);
    
    const globalChat = useMemo(() => waitingRoomChats['global'] || [], [waitingRoomChats]);
    
    const handleCloseResults = useCallback(() => {
        setShowResultModal(false);
        setShowFinalTerritory(false);
    }, []);
    
    const gameProps: GameProps = {
        session, onAction: handlers.handleAction, currentUser: currentUserWithStatus, waitingRoomChat: globalChat,
        gameChat: gameChat, isSpectator, onlineUsers, activeNegotiation, negotiations: Object.values(negotiations), onViewUser: handlers.openViewingUser
    };

    const gameControlsProps = {
        session, isMyTurn, isSpectator, onAction: handlers.handleAction, setShowResultModal, setConfirmModalType, currentUser: currentUserWithStatus,
        onlineUsers, pendingMove, onConfirmMove: handleConfirmMove, onCancelMove: handleCancelMove, settings, isMobile,
    };

    if (isSinglePlayer) {
        return (
            <div className="w-full h-dvh flex flex-col p-1 lg:p-4 bg-wood-pattern text-stone-200">
                <button
                    onClick={handlers.openSettingsModal}
                    className="absolute top-2 right-2 z-30 p-2 rounded-lg text-xl hover:bg-black/20 transition-colors"
                    title="설정"
                >
                    ⚙️
                </button>
                <main className="flex-1 flex flex-col items-center justify-center gap-2 lg:gap-4 max-w-5xl w-full mx-auto min-h-0">
                    <div className="w-full flex-shrink-0">
                        <PlayerPanel {...gameProps} clientTimes={clientTimes.clientTimes} isSinglePlayer={true} />
                    </div>
                    <div className="flex-1 w-full relative">
                        <div className="absolute inset-0">
                             <GameArena 
                                {...gameProps}
                                isMyTurn={isMyTurn} 
                                myPlayerEnum={myPlayerEnum} 
                                handleBoardClick={handleBoardClick} 
                                isItemModeActive={isItemModeActive} 
                                showTerritoryOverlay={showFinalTerritory} 
                                isMobile={isMobile}
                                myRevealedMoves={session.revealedHiddenMoves?.[currentUser.id] || []}
                                showLastMoveMarker={settings.features.lastMoveMarker}
                            />
                        </div>
                    </div>
                    <div className="w-full flex flex-col-reverse md:flex-row gap-2 lg:gap-4 items-stretch flex-shrink-0">
                        <div className="flex-1">
                            <SinglePlayerInfoPanel session={session} />
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0 w-full md:w-auto">
                            <TurnDisplay session={session} />
                            <SinglePlayerControls {...gameProps} currentUser={currentUserWithStatus} />
                        </div>
                    </div>
                </main>
                 <GameModals 
                    {...gameProps}
                    confirmModalType={confirmModalType}
                    onHideConfirmModal={() => setConfirmModalType(null)}
                    showResultModal={showResultModal}
                    onCloseResults={handleCloseResults}
                />
            </div>
        );
    }

    return (
        <div className={`w-full h-dvh flex flex-col p-1 lg:p-2 relative max-w-full bg-tertiary`}>
            {session.disconnectionState && <DisconnectionModal session={session} currentUser={currentUser} />}
            {session.gameStatus === 'scoring' && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-30">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-100 mb-4"></div>
                    <p className="text-xl font-bold text-white">계가 중...</p>
                </div>
            )}
            <button
                onClick={handlers.openSettingsModal}
                className="absolute top-2 right-2 z-30 p-2 rounded-lg text-xl hover:bg-secondary/50 transition-colors"
                title="설정"
            >
                ⚙️
            </button>
            <div className="flex-1 flex flex-col lg:flex-row gap-2 min-h-0">
                <main className="flex-1 flex items-center justify-center min-w-0 min-h-0">
                    <div className="w-full h-full max-h-full max-w-full lg:max-w-[calc(100vh-8rem)] flex flex-col items-center gap-1 lg:gap-2">
                        <div className="flex-shrink-0 w-full">
                            <PlayerPanel {...gameProps} clientTimes={clientTimes.clientTimes} />
                        </div>
                        <div className="flex-1 w-full relative">
                            <div className="absolute inset-0">
                                <GameArena 
                                    {...gameProps}
                                    isMyTurn={isMyTurn} 
                                    myPlayerEnum={myPlayerEnum} 
                                    handleBoardClick={handleBoardClick} 
                                    isItemModeActive={isItemModeActive} 
                                    showTerritoryOverlay={showFinalTerritory} 
                                    isMobile={isMobile}
                                    myRevealedMoves={session.revealedHiddenMoves?.[currentUser.id] || []}
                                    showLastMoveMarker={settings.features.lastMoveMarker}
                                />
                            </div>
                        </div>
                        <div className="flex-shrink-0 w-full flex flex-col gap-1">
                            <TurnDisplay session={session} />
                            <GameControls {...gameControlsProps} />
                        </div>
                    </div>
                </main>
                
                {!isMobile && (
                     <div className="w-full lg:w-[320px] xl:w-[360px] flex-shrink-0">
                        <Sidebar 
                            {...gameProps}
                            onLeaveOrResign={handleLeaveOrResignClick}
                            isNoContestLeaveAvailable={isNoContestLeaveAvailable}
                        />
                    </div>
                )}
                
                {isMobile && (
                    <>
                        <div className="absolute top-1/2 -translate-y-1/2 right-0 z-20">
                            <button 
                                onClick={openMobileSidebar} 
                                className="w-8 h-12 bg-secondary/80 backdrop-blur-sm rounded-l-lg flex items-center justify-center text-primary shadow-lg"
                                aria-label="메뉴 열기"
                            >
                                <span className="relative font-bold text-lg">
                                    {'<'}
                                    {hasNewMessage && <div className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-danger rounded-full border-2 border-secondary"></div>}
                                </span>
                            </button>
                        </div>

                        <div className={`fixed top-0 right-0 h-full w-[280px] bg-secondary shadow-2xl z-50 transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                            <Sidebar 
                                {...gameProps}
                                onLeaveOrResign={handleLeaveOrResignClick}
                                isNoContestLeaveAvailable={isNoContestLeaveAvailable}
                                onClose={() => setIsMobileSidebarOpen(false)}
                            />
                        </div>
                        {isMobileSidebarOpen && <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setIsMobileSidebarOpen(false)}></div>}
                    </>
                )}
            </div>
            
            {isAnalysisActive && analysisResult && (
                <TerritoryAnalysisWindow session={session} result={analysisResult} onClose={() => setIsAnalysisActive(false)} />
            )}
            
            <GameModals 
                {...gameProps}
                confirmModalType={confirmModalType}
                onHideConfirmModal={() => setConfirmModalType(null)}
                showResultModal={showResultModal}
                onCloseResults={handleCloseResults}
            />
        </div>
    );
};

export default Game;