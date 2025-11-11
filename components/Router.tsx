
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
                const mode = currentRoute.params.mode;
                // 통합 대기실(strategic/playful)만 허용, 개별 게임 모드는 프로필로 리다이렉트
                if (mode === 'strategic' || mode === 'playful') {
                    return <WaitingRoom mode={mode as 'strategic' | 'playful'} />;
                } else {
                    console.warn('Router: Individual game mode waiting room access denied, redirecting to profile:', mode);
                    window.location.hash = '#/profile';
                    return null;
                }
            }
            // Fallback if mode is missing
            window.location.hash = '#/profile';
            return null;
        case 'game':
             if (currentRoute.params.id && activeGame && activeGame.id === currentRoute.params.id) {
                return <Game session={activeGame} />;
            }
            console.warn("Router: Mismatch between route and active game. Redirecting to profile.");
            setTimeout(() => {
                if (window.location.hash !== '#/profile') {
                    window.location.hash = '#/profile';
                }
            }, 100);
            return <div className="flex items-center justify-center h-full">게임 정보 동기화 중...</div>;
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