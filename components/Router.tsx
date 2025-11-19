
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../hooks/useAppContext.js';
import { LiveGameSession } from '../types.js';
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
import TowerLobby from './TowerLobby.js';

// 게임 라우트 로더 컴포넌트 (게임이 로드될 때까지 대기)
const GameRouteLoader: React.FC<{ gameId: string }> = ({ gameId }) => {
    const { activeGame, singlePlayerGames, towerGames, liveGames } = useAppContext();
    const [hasTimedOut, setHasTimedOut] = useState(false);
    const maxWaitTime = 2000; // 최대 2초 대기 (handleAction에서 즉시 추가하므로 짧게 설정)
    
    // activeGame이 로드되면 즉시 렌더링
    if (activeGame && activeGame.id === gameId) {
        return <Game session={activeGame} />;
    }
    
    // 타임아웃 처리 (scoring 상태의 게임은 제외)
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!activeGame || activeGame.id !== gameId) {
                // scoring 상태의 게임은 리다이렉트하지 않음 (계가 진행 중)
                // activeGame이 없어도 게임이 scoring 상태일 수 있으므로 확인
                const allGames = { 
                    ...(liveGames || {}), 
                    ...(singlePlayerGames || {}), 
                    ...(towerGames || {}) 
                };
                const currentGame = allGames[gameId];
                if (currentGame && currentGame.gameStatus === 'scoring') {
                    console.log(`[Router] Game ${gameId} is in scoring state, keeping user on game page`);
                    return;
                }
                
                console.warn(`[Router] Game ${gameId} not found after ${maxWaitTime}ms, redirecting to profile.`);
                setHasTimedOut(true);
                setTimeout(() => {
                    if (window.location.hash !== '#/profile') {
                        window.location.hash = '#/profile';
                    }
                }, 100);
            }
        }, maxWaitTime);
        
        return () => clearTimeout(timeout);
    }, [gameId, activeGame, maxWaitTime, singlePlayerGames, towerGames, liveGames]);
    
    // 타임아웃이 발생했으면 에러 메시지 표시
    if (hasTimedOut) {
        return <div className="flex items-center justify-center h-full">게임을 찾을 수 없습니다. 프로필로 이동합니다...</div>;
    }
    
    // 게임이 아직 로드되지 않았으면 대기 메시지 표시
    return <div className="flex items-center justify-center h-full">게임 정보 동기화 중...</div>;
};

const Router: React.FC = () => {
    const { currentRoute, currentUser, activeGame, singlePlayerGames, towerGames, liveGames } = useAppContext();

    if (!currentUser) {
        if (currentRoute.view === 'register') {
            return <Register />;
        }
        return <Login />;
    }
    
    // If user is logged in, but their game is still active, force them into the game view
    // 단, 라우트가 이미 게임 페이지(#/game/${gameId})로 설정되어 있으면 "재접속 중..."을 표시하지 않음
    // (새 게임을 시작한 직후 activeGame이 아직 업데이트되지 않았을 수 있음)
    // scoring 상태의 게임도 포함 (계가 진행 중)
    if (activeGame && currentRoute.view !== 'game' && !currentRoute.params?.id) {
        // The logic in useApp hook will handle the redirect, we can show a loading state here
        return <div className="flex items-center justify-center h-full">재접속 중...</div>;
    }
    
    // scoring 상태의 게임이 있으면 게임 페이지로 유지 (activeGame이 null이어도)
    if (currentRoute.view === 'game' && currentRoute.params?.id) {
        const gameId = currentRoute.params.id;
        const allGames = { 
            ...(liveGames || {}), 
            ...(singlePlayerGames || {}), 
            ...(towerGames || {}) 
        };
        const currentGame = allGames[gameId];
        if (currentGame && currentGame.gameStatus === 'scoring') {
            // scoring 상태이면 게임 화면 유지 (activeGame이 null이어도)
            if (!activeGame || activeGame.id !== gameId) {
                // activeGame이 없어도 scoring 상태이면 게임 화면 표시
                return <Game session={currentGame} />;
            }
        }
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
            if (currentRoute.params.id) {
                const gameId = currentRoute.params.id;
                
                // activeGame이 있고 ID가 일치하면 즉시 렌더링
                if (activeGame && activeGame.id === gameId) {
                    return <Game session={activeGame} />;
                }
                
                // activeGame이 없으면 GameRouteLoader에서 대기
                // handleAction에서 게임을 즉시 상태에 추가하므로, 상태 업데이트를 기다림
                return <GameRouteLoader gameId={gameId} />;
            }
            console.warn("Router: No game ID in route. Redirecting to profile.");
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
        case 'tower':
            return <TowerLobby />;
        default:
            window.location.hash = '#/profile';
            return null;
    }
};

export default Router;