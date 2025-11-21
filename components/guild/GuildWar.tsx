import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../hooks/useAppContext.js';
import BackButton from '../BackButton.js';
import Button from '../Button.js';

interface Board {
    id: string;
    name: string;
    myStars: number;
    opponentStars: number;
    boardSize: number;
    highestScorer?: string;
    scoreDiff?: number;
    initialStones?: { black: number; white: number };
}

const GuildWar = () => {
    const { currentUserWithStatus, guilds } = useAppContext();
    const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);

    // Mock data for UI layout
    const myGuild = { id: 'g1', name: '청룡 길드', emblem: '/images/guild/profile/icon1.png', stars: 8, totalScore: 125 };
    const opponentGuild = { id: 'g2', name: '백호 길드', emblem: '/images/guild/profile/icon2.png', stars: 5, totalScore: 88 };
    
    const boards: Board[] = [
        { id: 'top-left', name: '좌상귀', myStars: 2, opponentStars: 1, boardSize: 9, initialStones: {black: 10, white: 10}, highestScorer: '길드원A', scoreDiff: 15.5 },
        { id: 'top-mid', name: '상변', myStars: 3, opponentStars: 0, boardSize: 9, initialStones: {black: 10, white: 10}, highestScorer: '길드원C', scoreDiff: 25.5 },
        { id: 'top-right', name: '우상귀', myStars: 0, opponentStars: 0, boardSize: 9, initialStones: {black: 10, white: 10} },
        { id: 'mid-left', name: '좌변', myStars: 1, opponentStars: 1, boardSize: 11, initialStones: {black: 10, white: 10}, highestScorer: '길드원B', scoreDiff: 8.5 },
        { id: 'center', name: '중앙', myStars: 0, opponentStars: 2, boardSize: 11, initialStones: {black: 10, white: 10}, highestScorer: '상대길드원X', scoreDiff: 18.5 },
        { id: 'mid-right', name: '우변', myStars: 1, opponentStars: 0, boardSize: 11, initialStones: {black: 10, white: 10}, highestScorer: '길드원D', scoreDiff: 5.5 },
        { id: 'bottom-left', name: '좌하귀', myStars: 0, opponentStars: 1, boardSize: 13, initialStones: {black: 10, white: 10}, highestScorer: '상대길드원Y', scoreDiff: 12.5 },
        { id: 'bottom-mid', name: '하변', myStars: 1, opponentStars: 0, boardSize: 13, initialStones: {black: 10, white: 10}, highestScorer: '길드원E', scoreDiff: 7.5 },
        { id: 'bottom-right', name: '우하귀', myStars: 0, opponentStars: 0, boardSize: 13, initialStones: {black: 10, white: 10} },
    ];
    
    const myMembersChallenging = [
        { name: '길드원A', board: '상변' },
        { name: '길드원B', board: '중앙' },
    ];
    const opponentMembersChallenging: {name: string, board: string}[] = [];

    const StarDisplay = ({ count, total = 3, size = 'w-6 h-6' }: { count: number, total?: number, size?: string }) => {
        const stars = [];
        for (let i = 0; i < count; i++) {
            stars.push(<img key={`filled-${i}`} src="/images/guild/guildwar/clearstar.png" alt="filled star" className={size} />);
        }
        for (let i = count; i < total; i++) {
            stars.push(<img key={`empty-${i}`} src="/images/guild/guildwar/emptystar.png" alt="empty star" className={size} />);
        }
        return <div className="flex justify-center">{stars}</div>;
    };
    
    const totalStars = myGuild.stars + opponentGuild.stars;
    const myStarPercent = totalStars > 0 ? (myGuild.stars / totalStars) * 100 : 50;

    const StatusAndViewerPanel: React.FC<{
        team: 'blue' | 'red';
        challengingMembers: { name: string, board: string }[];
        usedTickets: number;
        totalTickets: number;
        board: Board | null;
    }> = ({ team, challengingMembers, usedTickets, totalTickets, board }) => {
        const isBlue = team === 'blue';
        const panelClasses = isBlue ? 'bg-blue-900/50 border-blue-700' : 'bg-red-900/50 border-red-700';
        const textClasses = isBlue ? 'text-blue-300' : 'text-red-300';
        const secondaryTextClasses = isBlue ? 'text-blue-200' : 'text-red-200';

        return (
            <div className={`h-full w-full flex flex-col gap-4 ${panelClasses} border-2 rounded-lg p-4`}>
                <div className="h-1/2 flex flex-col border-b-2 border-gray-500/50 pb-2">
                    <h2 className={`text-xl font-bold text-center ${textClasses} pb-2 mb-2`}>상황판</h2>
                    <div className="space-y-3">
                         <div>
                            <h3 className={`font-semibold ${secondaryTextClasses}`}>사용된 도전권</h3>
                            <p className="text-lg">{usedTickets} / {totalTickets}</p>
                        </div>
                        <div>
                            <h3 className={`font-semibold ${secondaryTextClasses}`}>점령중인 길드원</h3>
                            <ul className="text-sm list-disc list-inside pl-2">
                                {challengingMembers.map((m, i) => <li key={i}>{m.name} - {m.board}</li>)}
                                {challengingMembers.length === 0 && <p className="text-xs text-gray-400">없음</p>}
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="h-1/2 flex flex-col pt-2">
                    <h2 className={`text-xl font-bold text-center ${textClasses} pb-2 mb-2`}>상세 정보</h2>
                    <div className="flex-grow bg-black/30 rounded-md p-3 text-xs flex flex-col justify-center items-center">
                        {board ? (
                            <div className="space-y-1 text-left w-full">
                                <p><strong>맵:</strong> {board.name} ({board.boardSize}줄)</p>
                                <p><strong>초기 배치:</strong> 흑 {board.initialStones?.black} / 백 {board.initialStones?.white}</p>
                                <p><strong>현재 점령자:</strong> {board.highestScorer || '없음'}</p>
                                {board.highestScorer && <p><strong>점수:</strong> {board.scoreDiff}집 승</p>}
                            </div>
                        ) : (
                            <p className="text-tertiary">바둑판을 선택하여<br/>정보를 확인하세요.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full w-full flex flex-col bg-tertiary text-primary p-4 bg-cover bg-center" style={{ backgroundImage: "url('/images/guild/guildwar/warmap.png')" }}>
            <header className="flex justify-between items-center mb-4 flex-shrink-0">
                 <BackButton onClick={() => window.location.hash = '#/guild'} />
                <h1 className="text-3xl font-bold text-white" style={{textShadow: '2px 2px 5px black'}}>길드 전쟁</h1>
                 <div className="w-40 text-right">
                    <p className="text-sm text-white font-semibold" style={{textShadow: '1px 1px 3px black'}}>남은 시간: 2일 14시간</p>
                </div>
            </header>
            <main className="flex-1 grid grid-cols-5 gap-4 min-h-0">
                {/* Left Panel */}
                <div className="col-span-1">
                    <StatusAndViewerPanel
                        team="blue"
                        challengingMembers={myMembersChallenging}
                        usedTickets={15}
                        totalTickets={60}
                        board={selectedBoard}
                    />
                </div>

                {/* Center Panel */}
                <div className="col-span-3 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col items-center">
                            <div className="relative w-20 h-28">
                                <img src="/images/guild/guildwar/blueteam.png" alt="Blue Team Flag" className="w-full h-full" />
                                <img src={myGuild.emblem} alt="My Guild Emblem" className="absolute top-6 left-4 w-12 h-12 object-contain" />
                            </div>
                            <div className="bg-black/60 px-3 py-1 rounded-md -mt-5 z-10 shadow-lg">
                                <span className="font-bold text-white">{myGuild.name}</span>
                            </div>
                        </div>
                        
                        <div className="flex-1 mx-4 flex flex-col items-center gap-1 -translate-y-2">
                             <div className="flex items-center justify-center w-full gap-4 text-white" style={{ textShadow: '2px 2px 4px black' }}>
                                <span className="text-5xl font-black">{myGuild.stars}</span>
                                <img src="/images/guild/guildwar/clearstar.png" alt="star" className="w-10 h-10" />
                                <span className="text-5xl font-black text-gray-400">:</span>
                                <img src="/images/guild/guildwar/clearstar.png" alt="star" className="w-10 h-10" />
                                <span className="text-5xl font-black">{opponentGuild.stars}</span>
                            </div>
                            
                            <div className="w-full h-4 bg-red-700/80 rounded-full flex relative border-2 border-black/50 shadow-inner mt-1">
                                <div className="h-full bg-blue-500/90 rounded-full" style={{ width: `${myStarPercent}%`, transition: 'width 0.5s ease-in-out' }}></div>
                            </div>

                            <div className="flex items-center justify-between w-full text-xs font-semibold text-white mt-1" style={{ textShadow: '1px 1px 2px black' }}>
                                <span>점수 합계: {myGuild.totalScore}</span>
                                <span>점수 합계: {opponentGuild.totalScore}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="relative w-20 h-28">
                                <img src="/images/guild/guildwar/redteam.png" alt="Red Team Flag" className="w-full h-full" />
                                <img src={opponentGuild.emblem} alt="Opponent Guild Emblem" className="absolute top-6 left-4 w-12 h-12 object-contain" />
                            </div>
                             <div className="bg-black/60 px-3 py-1 rounded-md -mt-5 z-10 shadow-lg">
                                <span className="font-bold text-white">{opponentGuild.name}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-x-8 gap-y-4">
                        {boards.map(board => (
                            <div key={board.id} className="flex flex-col items-center justify-center gap-1 cursor-pointer transition-transform hover:scale-110" onClick={() => setSelectedBoard(board)}>
                                <StarDisplay count={board.myStars} size="w-5 h-5"/>
                                <img src="/images/guild/guildwar/board.png" alt="Go Board" className="w-24 h-24" />
                                <span className="bg-black/60 px-2 py-0.5 rounded-md text-sm font-semibold -mt-2">{board.name}</span>
                                <StarDisplay count={board.opponentStars} size="w-5 h-5"/>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel */}
                <div className="col-span-1">
                     <StatusAndViewerPanel
                        team="red"
                        challengingMembers={opponentMembersChallenging}
                        usedTickets={12}
                        totalTickets={60}
                        board={selectedBoard}
                    />
                </div>
            </main>
        </div>
    );
};

export default GuildWar;
