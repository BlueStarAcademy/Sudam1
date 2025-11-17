import React from 'react';
import { GameProps, Player, GameMode } from '../types.js';

// Import the new arena components
import GoGameArena from './arenas/GoGameArena.js';
import AlkkagiArena from './arenas/AlkkagiArena.js';
import CurlingArena from './arenas/CurlingArena.js';
import DiceGoArena from './arenas/DiceGoArena.js';
import ThiefGoArena from './arenas/ThiefGoArena.js';
import SinglePlayerArena from './arenas/SinglePlayerArena.js';

interface GameArenaProps extends GameProps {
    isMyTurn: boolean;
    myPlayerEnum: Player;
    handleBoardClick: (x: number, y: number) => void;
    isItemModeActive: boolean;
    showTerritoryOverlay: boolean;
    isMobile: boolean;
    myRevealedMoves: number[];
    showLastMoveMarker: boolean;
    isSinglePlayerPaused?: boolean;
    resumeCountdown?: number;
    isBoardLocked?: boolean;
}

const GameArena: React.FC<GameArenaProps> = (props) => {
    const { session, isSinglePlayerPaused, resumeCountdown, isBoardLocked, ...restProps } = props;
    const sharedProps = { ...restProps, session };
    const { mode, isSinglePlayer, gameCategory } = session;
    
    // 도전의 탑 게임도 싱글플레이어 아레나와 동일하게 처리 (바둑 게임이므로)
    if (isSinglePlayer || gameCategory === 'tower') {
        return <SinglePlayerArena {...sharedProps} isPaused={isSinglePlayerPaused} resumeCountdown={resumeCountdown} isBoardLocked={isBoardLocked} />;
    }

    // This component is now a simple dispatcher.
    switch(mode) {
        case GameMode.Alkkagi: 
            return <AlkkagiArena {...sharedProps} />;
        case GameMode.Curling: 
            return <CurlingArena {...sharedProps} />;
        case GameMode.Dice: 
            return <DiceGoArena {...sharedProps} />;
        case GameMode.Thief: 
            return <ThiefGoArena {...sharedProps} />;
        
        // All other Go-based games are handled by the GoGameArena
        case GameMode.Standard:
        case GameMode.Capture:
        case GameMode.Speed:
        case GameMode.Base:
        case GameMode.Hidden:
        case GameMode.Missile:
        case GameMode.Mix:
        case GameMode.Omok:
        case GameMode.Ttamok:
        default:
            return <GoGameArena {...sharedProps} />;
    }
}

export default GameArena;
