import React, { useMemo } from 'react';
import { GameProps, Player, Point, GameMode } from '../../types.js';
import GoBoard from '../GoBoard.js';
import { getGoLogic } from '../../server/goLogic.js';
import { PLAYFUL_GAME_MODES } from '../../constants/gameModes';

interface ThiefGoArenaProps extends GameProps {
    isMyTurn: boolean;
    isMobile: boolean;
    showLastMoveMarker: boolean;
}

const ThiefGoArena: React.FC<ThiefGoArenaProps> = (props) => {
    const { session, onAction, currentUser, isMyTurn, isSpectator, isMobile, showLastMoveMarker } = props;
    const { id: gameId, boardState, settings, lastMove, winningLine, gameStatus, currentPlayer, blackPlayerId, whitePlayerId, thiefPlayerId, player1, player2, lastTurnStones } = session;
    
    const myPlayerEnum = blackPlayerId === currentUser.id ? Player.Black : (whitePlayerId === currentUser.id ? Player.White : Player.None);
    const myRole = currentUser.id === thiefPlayerId ? '도둑' : '경찰';
    
    const players = [player1, player2];
    const blackPlayer = players.find(p => p.id === blackPlayerId) || null;
    const whitePlayer = players.find(p => p.id === whitePlayerId) || null;

    const handleBoardClick = (x: number, y: number) => {
        if (!isMyTurn || gameStatus !== 'thief_placing') return;
        onAction({ type: 'THIEF_PLACE_STONE', payload: { gameId, x, y } });
    };

    const highlightedPoints = useMemo(() => {
        if (gameStatus !== 'thief_placing' || !isMyTurn) return [];
    
        const logic = getGoLogic(session);
        const allEmptyPoints = () => {
            const points: Point[] = [];
            for (let y = 0; y < settings.boardSize; y++) {
                for (let x = 0; x < settings.boardSize; x++) {
                    if (boardState[y][x] === Player.None) {
                        points.push({ x, y });
                    }
                }
            }
            return points;
        };
    
        if (myRole === '도둑') {
            const noBlackStonesOnBoard = !boardState.flat().includes(Player.Black);
            const canPlaceFreely = (session.turnInRound === 1 || noBlackStonesOnBoard);
            if (canPlaceFreely) {
                return allEmptyPoints();
            } else {
                const blackStonesOnBoard = boardState.flat().includes(Player.Black);
                if (blackStonesOnBoard) {
                    const liberties = logic.getAllLibertiesOfPlayer(Player.Black, boardState);
                    return liberties.length > 0 ? liberties : allEmptyPoints();
                } else {
                    return allEmptyPoints();
                }
            }
        } else { // Police
            const blackStonesOnBoard = boardState.flat().includes(Player.Black);
            if (blackStonesOnBoard) {
                const liberties = logic.getAllLibertiesOfPlayer(Player.Black, boardState);
                return liberties.length > 0 ? liberties : allEmptyPoints();
            } else {
                return allEmptyPoints();
            }
        }
    }, [gameStatus, isMyTurn, session, boardState, myRole, settings.boardSize]);
    
    const backgroundClass = useMemo(() => {
        if (PLAYFUL_GAME_MODES.some(m => m.mode === session.mode)) {
            return 'bg-playful-background';
        }
        return 'bg-primary';
    }, [session.mode]);
    
    return (
        <div className={`relative w-full h-full ${backgroundClass}`}>
            <GoBoard
                boardState={boardState}
                boardSize={settings.boardSize}
                onBoardClick={handleBoardClick}
                lastMove={lastMove}
                lastTurnStones={lastTurnStones}
                isBoardDisabled={!isMyTurn || gameStatus !== 'thief_placing'}
                stoneColor={myPlayerEnum}
                winningLine={winningLine}
                mode={session.mode}
                mixedModes={session.settings.mixedModes}
                myPlayerEnum={myPlayerEnum}
                gameStatus={gameStatus}
                currentPlayer={currentPlayer}
                highlightedPoints={highlightedPoints}
                isSpectator={isSpectator}
                currentUser={currentUser}
                blackPlayerNickname={blackPlayer?.nickname || '흑'}
                whitePlayerNickname={whitePlayer?.nickname || '백'}
                isItemModeActive={false}
                isMobile={isMobile}
                showLastMoveMarker={showLastMoveMarker}
            />
        </div>
    );
};

export default ThiefGoArena;
