
import React from 'react';
import { useAppContext } from '../hooks/useAppContext.js';

import { GameMode } from '../types.js';
import Login from './Login.js';
import Register from './Register.js';
import Profile from './Profile.js';
import Lobby from './Lobby.js';
import WaitingRoom from './waiting-room/WaitingRoom.js';
import Game from '../Game.js';
import Admin from './Admin.js';
import TournamentLobby from './TournamentLobby.js';
import TournamentArena from './arenas/TournamentArena.js';
import SinglePlayerLobby from './SinglePlayerLobby.js';
import Guild from './Guild.js';

const Router: React.FC = () => {
    const { currentRoute, currentUser, activeGame } = useAppContext();

    if (!currentUser) {
        if (currentRoute.view === 'register') {
            return <Register />;
        }
        return <Login />;
    }
    
    // If user is logged in, but their game is still active, force them into the game view
    if (activeGame && currentRoute.view !== 'game') {
        // The logic in useApp hook will handle the redirect, we can show a loading state here
        return <div className="flex items-center justify-center h-full">재접속 중...</div>;
    }

    switch (currentRoute.view) {
        case 'profile':
            return <Profile />;
        case 'lobby':
            const lobbyType = currentRoute.params.type === 'playful' ? 'playful' : 'strategic';
            return <Lobby lobbyType={lobbyType} />;
        case 'waiting':
            if (currentRoute.params.mode) {
                return <WaitingRoom mode={currentRoute.params.mode as GameMode | 'strategic' | 'playful'} />;
            }
            // Fallback if mode is missing
            window.location.hash = '#/profile';
            return null;
        case 'game':
             if (currentRoute.params.id && activeGame && activeGame.id === currentRoute.params.id) {
                return <Game session={activeGame} />;
            }
            // Fallback if game ID is missing or doesn't match active game
            console.warn("Router: Mismatch between route and active game. Redirecting to profile.");
            window.location.hash = '#/profile';
            return null;
        case 'admin':
            return <Admin />;
        case 'tournament':
            if (currentRoute.params.type) {
                return <TournamentArena type={currentRoute.params.type as any} />;
            }
            return <TournamentLobby />;
        case 'singleplayer':
             return <SinglePlayerLobby />;
        case 'guild':
            return <Guild />;
        default:
            window.location.hash = '#/profile';
            return null;
    }
};

export default Router;