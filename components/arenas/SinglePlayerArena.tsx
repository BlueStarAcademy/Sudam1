import React from 'react';
import { GameProps, Player } from '../../types.js';
import GoBoard from '../GoBoard.js';

interface SinglePlayerArenaProps extends GameProps {
    isMyTurn: boolean;
    myPlayerEnum: Player;
    handleBoardClick: (x: number, y: number) => void;
    isMobile: boolean;
    showLastMoveMarker: boolean;
    isPaused?: boolean;
    resumeCountdown?: number;
}

const SinglePlayerArena: React.FC<SinglePlayerArenaProps> = (props) => {
    const {
        session,
        currentUser,
        isSpectator,
        isMyTurn,
        myPlayerEnum,
        handleBoardClick,
        isMobile,
        showLastMoveMarker,
        isPaused = false,
        resumeCountdown = 0,
    } = props;
    
    const {
        boardState,
        settings,
        lastMove,
        winningLine,
        gameStatus,
        currentPlayer,
        blackPlayerId,
        whitePlayerId,
        player1,
        player2,
        animation,
        blackPatternStones,
        whitePatternStones,
        lastTurnStones,
    } = session;
    
    const blackPlayer = player1.id === blackPlayerId ? player1 : player2;
    const whitePlayer = player1.id === whitePlayerId ? player2 : player1;

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
            <div className={`w-full h-full transition-opacity duration-500 ${isPaused ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <GoBoard
                    boardState={boardState}
                    boardSize={settings.boardSize}
                    onBoardClick={handleBoardClick}
                    lastMove={lastMove}
                    lastTurnStones={lastTurnStones}
                    isBoardDisabled={!isMyTurn || isSpectator || isPaused}
                    stoneColor={myPlayerEnum}
                    winningLine={winningLine}
                    mode={session.mode}
                    myPlayerEnum={myPlayerEnum}
                    gameStatus={gameStatus}
                    currentPlayer={currentPlayer}
                    isSpectator={isSpectator}
                    currentUser={currentUser}
                    blackPlayerNickname={blackPlayer.nickname}
                    whitePlayerNickname={whitePlayer.nickname}
                    animation={animation}
                    isMobile={isMobile}
                    showLastMoveMarker={showLastMoveMarker}
                    blackPatternStones={blackPatternStones}
                    whitePatternStones={whitePatternStones}
                    isItemModeActive={false} // No items in single player
                />
            </div>
            {isPaused && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none text-white drop-shadow-lg">
                    <h2 className="text-3xl font-bold tracking-wide">일시 정지</h2>
                    {resumeCountdown > 0 && (
                        <p className="text-lg font-semibold text-amber-200">
                            재개 가능까지 {resumeCountdown}초
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default SinglePlayerArena;