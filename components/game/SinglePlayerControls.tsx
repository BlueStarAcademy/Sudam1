import React from 'react';
import { GameProps, Player } from '../../types.js';
import Button from '../Button.js';
import { SINGLE_PLAYER_STAGES } from '../../constants';

interface SinglePlayerControlsProps extends Pick<GameProps, 'session' | 'onAction' | 'currentUser'> {}

interface ImageButtonProps {
    src: string;
    alt: string;
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
}

const ImageButton: React.FC<ImageButtonProps> = ({ src, alt, onClick, disabled = false, title }) => {
    return (
        <button
            type="button"
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            title={title}
            className={`relative w-12 h-12 rounded-lg border-2 border-amber-400 transition-transform duration-200 ease-out overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-gray-900 ${disabled ? 'opacity-40 cursor-not-allowed border-gray-700' : 'hover:scale-105 active:scale-95 shadow-lg'}`}
        >
            <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-contain pointer-events-none p-1" />
        </button>
    );
};

const SinglePlayerControls: React.FC<SinglePlayerControlsProps> = ({ session, onAction, currentUser }) => {
    
    if (session.gameStatus === 'ended' || session.gameStatus === 'no_contest') {
        const isWinner = session.winner === Player.Black;
        const currentStageIndex = SINGLE_PLAYER_STAGES.findIndex(s => s.id === session.stageId);
        const currentStage = SINGLE_PLAYER_STAGES.find(s => s.id === session.stageId);
        const nextStage = SINGLE_PLAYER_STAGES[currentStageIndex + 1];
        const canTryNext = isWinner && nextStage && (currentUser.singlePlayerProgress ?? 0) > currentStageIndex;
        
        const retryActionPointCost = currentStage?.actionPointCost ?? 0;
        const nextStageActionPointCost = nextStage?.actionPointCost ?? 0;

        const handleRetry = async () => {
            try {
                await Promise.resolve(onAction({ type: 'START_SINGLE_PLAYER_GAME', payload: { stageId: session.stageId! } }));
            } catch (error) {
                console.error('[SinglePlayerControls] Failed to retry stage:', error);
            }
        };
        const handleNextStage = async () => {
            if (!canTryNext || !nextStage) return;
            try {
                await Promise.resolve(onAction({ type: 'START_SINGLE_PLAYER_GAME', payload: { stageId: nextStage.id } }));
            } catch (error) {
                console.error('[SinglePlayerControls] Failed to start next stage:', error);
            }
        };
        const handleExitToLobby = async () => {
            sessionStorage.setItem('postGameRedirect', '#/singleplayer');
            try {
                await Promise.resolve(onAction({ type: 'LEAVE_AI_GAME', payload: { gameId: session.id } }));
            } catch (error) {
                console.error('[SinglePlayerControls] Failed to leave AI game:', error);
            } finally {
                setTimeout(() => {
                    window.location.hash = '#/singleplayer';
                }, 100);
            }
        };

        return (
             <div className="bg-stone-800/60 backdrop-blur-sm rounded-lg p-2 flex items-center justify-center gap-2 w-full border border-stone-700/50">
                <Button onClick={handleExitToLobby} colorScheme="gray" className="flex-1 !text-sm">로비로</Button>
                <Button onClick={handleRetry} colorScheme="yellow" className="flex-1 !text-sm">
                    재도전{retryActionPointCost > 0 && ` (⚡${retryActionPointCost})`}
                </Button>
                <Button onClick={handleNextStage} colorScheme="accent" disabled={!canTryNext} className="flex-1 !text-sm">
                    다음 단계{nextStage ? `: ${nextStage.name.replace('스테이지 ', '')}` : ''}{nextStageActionPointCost > 0 && ` (⚡${nextStageActionPointCost})`}
                </Button>
            </div>
        );
    }
    
    const refreshesUsed = session.singlePlayerPlacementRefreshesUsed || 0;
    const canRefresh = session.moveHistory.length === 0 && refreshesUsed < 5;
    const costs = [0, 50, 100, 200, 300];
    const nextCost = costs[refreshesUsed] || 0;
    const canAfford = currentUser.gold >= nextCost;
    
    const handleRefresh = () => {
        if (canRefresh && canAfford) {
            onAction({ type: 'SINGLE_PLAYER_REFRESH_PLACEMENT', payload: { gameId: session.id } });
        }
    };

    const handleForfeit = () => {
        if (window.confirm('현재 스테이지를 포기하고 로비로 돌아가시겠습니까?')) {
            window.location.hash = '#/singleplayer';
        }
    };

    // 게임 모드별 아이템 로직
    const hiddenCountSetting = session.settings.hiddenStoneCount ?? 0;
    const scanCountSetting = session.settings.scanCount ?? 0;
    const missileCountSetting = session.settings.missileCount ?? 0;
    
    const isHiddenMode = session.isSinglePlayer && hiddenCountSetting > 0;
    const isMissileMode = session.isSinglePlayer && missileCountSetting > 0;
    
    const isMyTurn = session.currentPlayer === Player.Black; // 싱글플레이어에서는 유저가 항상 흑
    const gameStatus = session.gameStatus;
    
    // 히든 아이템
    const myHiddenUsed = session.hidden_stones_used_p1 ?? 0;
    const hiddenLeft = Math.max(0, hiddenCountSetting - myHiddenUsed);
    const hiddenDisabled = !isMyTurn || gameStatus !== 'playing' || hiddenLeft <= 0;
    
    const handleUseHidden = () => {
        if (gameStatus !== 'playing') return;
        onAction({ type: 'START_HIDDEN_PLACEMENT', payload: { gameId: session.id } });
    };
    
    // 스캔 아이템
    const myScansLeft = session.scans_p1 ?? scanCountSetting;
    // 스캔 가능 여부 확인: 상대방(백)의 히든 스톤이 있고 아직 영구적으로 공개되지 않은 것이 있는지
    const canScan = React.useMemo(() => {
        if (!session.hiddenMoves || !session.moveHistory) {
            return false;
        }
        // 상대방(백)의 히든 스톤 중 아직 영구적으로 공개되지 않은 것이 있는지 확인
        return Object.entries(session.hiddenMoves).some(([moveIndexStr, isHidden]) => {
            if (!isHidden) return false;
            const move = session.moveHistory[parseInt(moveIndexStr)];
            if (!move || move.player !== Player.White) return false;
            const { x, y } = move;
            // 돌이 여전히 보드에 있고 영구적으로 공개되지 않았는지 확인
            if (session.boardState[y]?.[x] !== Player.White) return false;
            const isPermanentlyRevealed = session.permanentlyRevealedStones?.some(p => p.x === x && p.y === y);
            return !isPermanentlyRevealed;
        });
    }, [session.hiddenMoves, session.moveHistory, session.boardState, session.permanentlyRevealedStones]);
    
    const scanDisabled = !isMyTurn || gameStatus !== 'playing' || myScansLeft <= 0 || !canScan;
    
    const handleUseScan = () => {
        if (gameStatus !== 'playing') return;
        onAction({ type: 'START_SCANNING', payload: { gameId: session.id } });
    };
    
    // 미사일 아이템
    const myMissilesLeft = session.missiles_p1 ?? missileCountSetting;
    const missileDisabled = !isMyTurn || gameStatus !== 'playing' || myMissilesLeft <= 0;
    
    const handleUseMissile = () => {
        if (gameStatus !== 'playing') return;
        onAction({ type: 'START_MISSILE_SELECTION', payload: { gameId: session.id } });
    };

    return (
        <div className="bg-stone-800/60 backdrop-blur-sm rounded-lg p-2 flex items-center justify-between gap-4 w-full h-full border border-stone-700/50">
            <Button onClick={handleForfeit} colorScheme="red" className="!text-sm">
                포기하기
            </Button>
            <div className="flex items-center gap-2">
                {/* 히든 아이템 */}
                {isHiddenMode && (
                    <div className="flex flex-col items-center gap-1">
                        <ImageButton
                            src="/images/button/hidden.png"
                            alt="히든"
                            onClick={handleUseHidden}
                            disabled={hiddenDisabled}
                            title="히든 스톤 배치"
                        />
                        <span className={`text-[9px] font-medium ${hiddenDisabled ? 'text-gray-500' : 'text-amber-100'}`}>
                            히든
                        </span>
                        <span className={`text-[8px] ${hiddenDisabled ? 'text-gray-500/80' : 'text-gray-300/90'}`}>
                            {hiddenLeft > 0 ? `남음 ${hiddenLeft}` : '없음'}
                        </span>
                    </div>
                )}
                
                {/* 스캔 아이템 */}
                {isHiddenMode && (
                    <div className="flex flex-col items-center gap-1">
                        <ImageButton
                            src="/images/button/scan.png"
                            alt="스캔"
                            onClick={handleUseScan}
                            disabled={scanDisabled}
                            title="상대 히든 스톤 탐지"
                        />
                        <span className={`text-[9px] font-medium ${scanDisabled ? 'text-gray-500' : 'text-amber-100'}`}>
                            스캔
                        </span>
                        <span className={`text-[8px] ${scanDisabled ? 'text-gray-500/80' : 'text-gray-300/90'}`}>
                            {myScansLeft > 0 ? `남음 ${myScansLeft}` : '없음'}
                        </span>
                    </div>
                )}
                
                {/* 미사일 아이템 */}
                {isMissileMode && (
                    <div className="flex flex-col items-center gap-1">
                        <ImageButton
                            src="/images/button/missile.png"
                            alt="미사일"
                            onClick={handleUseMissile}
                            disabled={missileDisabled}
                            title="미사일 발사"
                        />
                        <span className={`text-[9px] font-medium ${missileDisabled ? 'text-gray-500' : 'text-amber-100'}`}>
                            미사일
                        </span>
                        <span className={`text-[8px] ${missileDisabled ? 'text-gray-500/80' : 'text-gray-300/90'}`}>
                            {myMissilesLeft > 0 ? `남음 ${myMissilesLeft}` : '없음'}
                        </span>
                    </div>
                )}
                
                <span className="text-xs text-stone-400">
                    다음 비용: 💰{canRefresh ? nextCost : '-'}
                </span>
                <Button onClick={handleRefresh} colorScheme="accent" className="!text-sm" disabled={!canRefresh || !canAfford} title={!canAfford ? '골드가 부족합니다.' : ''}>
                    배치 새로고침 ({5 - refreshesUsed}/5)
                </Button>
            </div>
        </div>
    );
};

export default SinglePlayerControls;