import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GameProps, Player, GameStatus, User, AnimationData, GameMode, Point } from '../../types.js';
import GoBoard from '../GoBoard.js';
import { getGoLogic } from '../../server/goLogic.js';
import { audioService } from '../../services/audioService.js';
import { PLAYFUL_GAME_MODES } from '../../constants/gameModes';

interface DiceGoArenaProps extends GameProps {
    isMyTurn: boolean;
    isMobile: boolean;
    showLastMoveMarker: boolean;
}

const DiceGoArena: React.FC<DiceGoArenaProps> = (props) => {
    const { session, onAction, currentUser, isSpectator, isMyTurn, isMobile, showLastMoveMarker } = props;
    const { id: gameId, boardState, settings, lastMove, winningLine, gameStatus, currentPlayer, blackPlayerId, whitePlayerId, player1, player2, animation, lastTurnStones } = session;
    
    const myPlayerEnum = blackPlayerId === currentUser.id ? Player.Black : Player.White;
    
    const players = [player1, player2];
    const blackPlayer = players.find(p => p.id === blackPlayerId) || null;
    const whitePlayer = players.find(p => p.id === whitePlayerId) || null;

    const highlightedPoints = useMemo(() => {
        if (gameStatus !== 'dice_placing' || !isMyTurn) return [];
        const anyWhiteStones = boardState.flat().some(s => s === Player.White);
        if (!anyWhiteStones) {
            // If no white stones, all empty points are valid.
            const points: Point[] = [];
            for (let y = 0; y < settings.boardSize; y++) {
                for (let x = 0; x < settings.boardSize; x++) {
                    if (boardState[y][x] === Player.None) {
                        points.push({ x, y });
                    }
                }
            }
            return points;
        }
        return getGoLogic(session).getAllLibertiesOfPlayer(Player.White, boardState);
    }, [session, gameStatus, isMyTurn, boardState, settings.boardSize]);

    const handleBoardClick = (x: number, y: number) => {
        if (!isMyTurn || gameStatus !== 'dice_placing') return;
        
        const isValidMove = highlightedPoints.some(p => p.x === x && p.y === y);
        if (!isValidMove) {
            return;
        }
        
        onAction({ type: 'DICE_PLACE_STONE', payload: { gameId, x, y } });
    };

    const backgroundClass = useMemo(() => {
        if (PLAYFUL_GAME_MODES.some(m => m.mode === session.mode)) {
            return 'bg-playful-background';
        }
        return 'bg-primary';
    }, [session.mode]);

    return (
        <div className={`relative w-full h-full flex flex-col items-center justify-center ${backgroundClass}`}>
            <GoBoard
                boardState={boardState}
                boardSize={settings.boardSize}
                onBoardClick={handleBoardClick}
                lastMove={lastMove}
                lastTurnStones={lastTurnStones}
                isBoardDisabled={!isMyTurn || gameStatus !== 'dice_placing'}
                stoneColor={Player.Black}
                winningLine={winningLine}
                mode={session.mode}
                mixedModes={session.settings.mixedModes}
                myPlayerEnum={myPlayerEnum}
                gameStatus={gameStatus}
                currentPlayer={currentPlayer}
                highlightedPoints={highlightedPoints}
                highlightStyle="ring"
                isSpectator={isSpectator}
                currentUser={currentUser}
                blackPlayerNickname={blackPlayer?.nickname || '흑'}
                whitePlayerNickname={whitePlayer?.nickname || '백'}
                isItemModeActive={false}
                animation={animation}
                isMobile={isMobile}
                showLastMoveMarker={showLastMoveMarker}
            />
        </div>
    );
};

export default DiceGoArena;
