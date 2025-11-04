import React, { useState, useRef, useEffect } from 'react';
import { LiveGameSession, ServerAction, UserWithStatus } from '../../types.js';
import Avatar from '../Avatar.js';

interface GameListProps {
    games: LiveGameSession[];
    onAction: (a: ServerAction) => void;
    currentUser: UserWithStatus;
}

const GameList: React.FC<GameListProps> = ({ games, onAction, currentUser }) => {
    const [spectateRoomNumber, setSpectateRoomNumber] = useState('');
    const [adminMenuGameId, setAdminMenuGameId] = useState<string | null>(null);
    const adminMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
                setAdminMenuGameId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSpectateByNumber = () => {
        const roomNum = parseInt(spectateRoomNumber, 10);
        if (isNaN(roomNum) || roomNum < 1 || roomNum > games.length) {
            alert('유효하지 않은 방 번호입니다.');
            return;
        }
        const gameToSpectate = games[roomNum - 1];
        if (gameToSpectate) {
            onAction({ type: 'SPECTATE_GAME', payload: { gameId: gameToSpectate.id } });
        }
        setSpectateRoomNumber('');
    };
    
    const handleAdminMenu = (gameId: string) => {
        setAdminMenuGameId(prev => (prev === gameId ? null : gameId));
    };

    const handleSetDescription = (game: LiveGameSession) => {
        const newDescription = prompt("방 내용을 입력하세요 (50자 이내):", game.description || "");
        if (newDescription !== null) {
            if (newDescription.length > 50) {
                alert("방 내용은 50자를 초과할 수 없습니다.");
                return;
            }
            onAction({ type: 'ADMIN_SET_GAME_DESCRIPTION', payload: { gameId: game.id, description: newDescription } });
        }
        setAdminMenuGameId(null);
    };

    const handleDeleteGame = (game: LiveGameSession) => {
        if (window.confirm(`[${game.player1.nickname} vs ${game.player2.nickname}] 대국을 강제로 종료하시겠습니까?`)) {
            onAction({ type: 'ADMIN_FORCE_DELETE_GAME', payload: { gameId: game.id } });
        }
        setAdminMenuGameId(null);
    };

    return (
      <div className="bg-panel border border-color text-on-panel rounded-lg shadow-lg p-4 flex flex-col min-h-0 h-full">
        <div className="flex justify-between items-center mb-3 border-b border-color pb-2 flex-shrink-0">
            <h2 className="text-xl font-semibold">진행중인 대국</h2>
            <div className="flex items-center gap-2">
                <input 
                    type="number"
                    min="1"
                    placeholder="방 번호"
                    value={spectateRoomNumber}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || parseInt(val, 10) > 0) {
                            setSpectateRoomNumber(val);
                        }
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSpectateByNumber(); }}
                    className="w-24 bg-tertiary border border-color rounded-md p-2 focus:ring-accent focus:border-accent text-sm text-center"
                />
                <button onClick={handleSpectateByNumber} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-sm transition-colors shrink-0">
                    입장
                </button>
            </div>
        </div>
        <ul className="space-y-3 overflow-y-auto pr-2 flex-grow">
          {games.length > 0 ? games.map((game, index) => {
            if (!game || !game.player1 || !game.player2) {
              return null;
            }
            return (
              <li key={game.id} className="relative">
                <div className="flex items-center justify-between p-2.5 bg-tertiary/50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <div 
                        className={`flex-shrink-0 w-8 h-8 flex items-center justify-center bg-secondary rounded-full font-bold text-sm ${currentUser.isAdmin ? 'cursor-pointer hover:bg-tertiary transition-colors' : ''}`}
                        onClick={currentUser.isAdmin ? () => handleAdminMenu(game.id) : undefined}
                        title={currentUser.isAdmin ? '관리 메뉴 열기' : `방 번호: ${index + 1}`}
                    >
                        {index + 1}
                    </div>
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="text-center truncate">
                        <Avatar userId={game.player1.id} userName={game.player1.nickname} size={36} className="border-2 border-color mx-auto" />
                        <span className="text-xs font-semibold block truncate">{game.player1.nickname}</span>
                      </div>
                      <span className="text-tertiary font-bold">vs</span>
                      <div className="text-center truncate">
                        <Avatar userId={game.player2.id} userName={game.player2.nickname} size={36} className="border-2 border-color mx-auto" />
                        <span className="text-xs font-semibold block truncate">{game.player2.nickname}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {game.description && (
                        <div className="text-sm text-highlight truncate max-w-xs hidden md:block" title={game.description}>
                            {game.description}
                        </div>
                    )}
                    <button onClick={() => onAction({ type: 'SPECTATE_GAME', payload: { gameId: game.id } })} className="ml-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-sm transition-colors shrink-0">
                      관전하기
                    </button>
                  </div>
                </div>
                {currentUser.isAdmin && adminMenuGameId === game.id && (
                    <div ref={adminMenuRef} className="absolute top-12 left-2 z-10 bg-secondary rounded-md shadow-lg p-2 space-y-2 w-48 border border-color">
                        <button onClick={() => handleSetDescription(game)} className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors">
                            방 내용 작성/수정
                        </button>
                        <button onClick={() => handleDeleteGame(game)} className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-danger text-red-300 transition-colors">
                            방 강제 삭제
                        </button>
                    </div>
                )}
              </li>
            );
          }) : (
            <p className="text-center text-tertiary pt-8">진행중인 대국이 없습니다.</p>
          )}
        </ul>
      </div>
    );
};

export default GameList;