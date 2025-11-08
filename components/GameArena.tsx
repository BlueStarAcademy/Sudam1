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
}

const GameArena: React.FC<GameArenaProps> = (props) => {
    const { session, isSinglePlayerPaused, resumeCountdown, ...restProps } = props;
    const sharedProps = { ...restProps, session };
    const { mode, isSinglePlayer } = session;
    
    if (isSinglePlayer) {
        return <SinglePlayerArena {...sharedProps} isPaused={isSinglePlayerPaused} resumeCountdown={resumeCountdown} />;
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
