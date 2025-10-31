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
}

const GameArena: React.FC<GameArenaProps> = (props) => {
    const { session } = props;
    const { mode, isSinglePlayer } = session;
    
    if (isSinglePlayer) {
        return <SinglePlayerArena {...props} />;
    }

    // This component is now a simple dispatcher.
    switch(mode) {
        case GameMode.Alkkagi: 
            return <AlkkagiArena {...props} />;
        case GameMode.Curling: 
            return <CurlingArena {...props} />;
        case GameMode.Dice: 
            return <DiceGoArena {...props} />;
        case GameMode.Thief: 
            return <ThiefGoArena {...props} />;
        
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
            return <GoGameArena {...props} />;
    }
}

export default GameArena;
