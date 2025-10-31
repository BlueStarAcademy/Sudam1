import React from 'react';
import { GameProps, Player } from '../../types.js';
import GoBoard from '../GoBoard.js';

interface SinglePlayerArenaProps extends GameProps {
    isMyTurn: boolean;
    myPlayerEnum: Player;
    handleBoardClick: (x: number, y: number) => void;
    isMobile: boolean;
    showLastMoveMarker: boolean;
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
            <GoBoard
                boardState={boardState}
                boardSize={settings.boardSize}
                onBoardClick={handleBoardClick}
                lastMove={lastMove}
                lastTurnStones={lastTurnStones}
                isBoardDisabled={!isMyTurn || isSpectator}
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
    );
};

export default SinglePlayerArena;