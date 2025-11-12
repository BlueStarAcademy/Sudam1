
import React, { useState, useMemo } from 'react';
// FIX: Import missing types from the centralized types file.
import { User, ServerAction, AdminProps, LiveGameSession, GameMode, Quest, DailyQuestData, WeeklyQuestData, MonthlyQuestData, TournamentType } from '../../types/index.js';
import DraggableWindow from '../DraggableWindow.js';
import Button from '../Button.js';
import { SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES } from '../../constants';
import { useAppContext } from '../../hooks/useAppContext.js';

interface UserManagementModalProps {
    user: User;
    currentUser: User;
    onClose: () => void;
    onAction: (action: ServerAction) => void;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({ user, currentUser, onClose, onAction }) => {
    const [editedUser, setEditedUser] = useState<User>(JSON.parse(JSON.stringify(user)));
    const [activeTab, setActiveTab] = useState<'general' | 'strategic' | 'playful' | 'quests' | 'danger'>('general');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditedUser(prev => ({ ...prev, [name]: Number(value) }));
    };

    const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditedUser(prev => ({ ...prev, [name]: value }));
    };
    
    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setEditedUser(prev => ({ ...prev, [name]: checked }));
    };

    const handleStatChange = (mode: GameMode, value: string) => {
        setEditedUser(prev => {
            const newStats = { ...(prev.stats || {}) };
            if (!newStats[mode]) {
                newStats[mode] = { wins: 0, losses: 0, rankingScore: 1200 };
            }
            newStats[mode]!.rankingScore = Number(value);
            return { ...prev, stats: newStats };
        });
    };

    const handleQuestPropertyChange = (questType: 'daily' | 'weekly' | 'monthly', questId: string, field: 'progress' | 'isClaimed', value: number | boolean) => {
        setEditedUser(prev => {
            const newQuests = JSON.parse(JSON.stringify(prev.quests || {}));
            if (newQuests[questType] && newQuests[questType].quests) {
                const quest = newQuests[questType].quests.find((q: Quest) => q.id === questId);
                if (quest) {
                    (quest as any)[field] = value;
                }
            }
            return { ...prev, quests: newQuests };
        });
    };

    const handleActivityProgressChange = (questType: 'daily' | 'weekly' | 'monthly', value: number) => {
        setEditedUser(prev => {
            const newQuests = JSON.parse(JSON.stringify(prev.quests || {}));
            if (newQuests[questType]) {
                newQuests[questType].activityProgress = value;
            } else if (!newQuests[questType]) {
                newQuests[questType] = { quests: [], activityProgress: value, claimedMilestones: [false,false,false,false,false], lastReset: 0 };
            }
            return { ...prev, quests: newQuests };
        });
    };

    const handleMilestoneChange = (questType: 'daily' | 'weekly' | 'monthly', index: number, value: boolean) => {
        setEditedUser(prev => {
            const newQuests = JSON.parse(JSON.stringify(prev.quests || {}));
            if (newQuests[questType] && newQuests[questType].claimedMilestones) {
                newQuests[questType].claimedMilestones[index] = value;
            }
            return { ...prev, quests: newQuests };
        });
    };


    const handleSave = () => {
        onAction({ type: 'ADMIN_UPDATE_USER_DETAILS', payload: { targetUserId: user.id, updatedDetails: editedUser } });
        onClose();
    };

    const handleReset = (resetType: 'stats' | 'full') => {
        const message = resetType === 'full' ? `정말로 [${user.nickname}] 님의 레벨과 모든 전적을 초기화하시겠습니까?` : `정말로 [${user.nickname}] 님의 모든 전적을 초기화하시겠습니까?`;
        if (window.confirm(message)) {
            onAction({ type: 'ADMIN_RESET_USER_DATA', payload: { targetUserId: user.id, resetType } });
        }
    };

    const handleDelete = () => {
        if (window.confirm(`정말로 [${user.nickname}] 님의 계정을 삭제하시겠습니까?`)) {
            onAction({ type: 'ADMIN_DELETE_USER', payload: { targetUserId: user.id } });
            onClose();
        }
    };

    const renderStatInputs = (modes: ReadonlyArray<{ mode: GameMode }>) => (
        <div className="space-y-2">
            {modes.map(({ mode }) => (
                <div key={mode} className="grid grid-cols-2 gap-2 items-center">
                    <label className="text-secondary col-span-1">{mode}</label>
                    <input type="number" value={editedUser.stats?.[mode]?.rankingScore ?? 1200} onChange={e => handleStatChange(mode, e.target.value)} className="bg-tertiary p-1 rounded col-span-1" />
                </div>
            ))}
        </div>
    );
    
    type QuestCategoryPanelProps = {
        title: string;
        questType: 'daily' | 'weekly' | 'monthly';
        questData: DailyQuestData | WeeklyQuestData | MonthlyQuestData | undefined;
    };
    const QuestCategoryPanel: React.FC<QuestCategoryPanelProps> = ({ title, questType, questData }) => (
        <div className="bg-tertiary/50 p-3 rounded-lg">
            <h3 className="font-bold text-lg text-highlight mb-2">{title}</h3>
            <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-secondary whitespace-nowrap">활약도:</label>
                <input type="number" value={questData?.activityProgress || 0} onChange={e => handleActivityProgressChange(questType, parseInt(e.target.value, 10) || 0)} className="bg-secondary p-1 rounded w-full" />
            </div>
            <div className="flex items-center gap-2 mb-3">
                <label className="text-sm font-medium text-secondary whitespace-nowrap">마일스톤:</label>
                <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <label key={i} className="flex items-center gap-1 text-xs">
                            <input type="checkbox" checked={questData?.claimedMilestones?.[i] || false} onChange={e => handleMilestoneChange(questType, i, e.target.checked)} className="w-4 h-4" />
                            {i+1}
                        </label>
                    ))}
                </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 border-t border-color pt-2">
                {(questData?.quests || []).map((quest: Quest) => (
                    <div key={quest.id} className="bg-primary/50 p-2 rounded-md text-xs">
                        <p className="font-semibold truncate" title={quest.title}>{quest.title}</p>
                        <div className="flex items-center justify-between gap-2 mt-1">
                            <div className="flex items-center gap-1">
                                <span>진행도:</span>
                                <input type="number" value={quest.progress} onChange={e => handleQuestPropertyChange(questType, quest.id, 'progress', parseInt(e.target.value, 10) || 0)} className="w-16 bg-secondary p-0.5 rounded text-center"/>
                                <span>/ {quest.target}</span>
                            </div>
                            <label className="flex items-center gap-1">
                                <input type="checkbox" checked={quest.isClaimed} onChange={e => handleQuestPropertyChange(questType, quest.id, 'isClaimed', e.target.checked)} className="w-4 h-4"/>
                                <span>완료</span>
                            </label>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
    
    return (
        <DraggableWindow title={`사용자 정보 수정: ${user.nickname}`} onClose={onClose} windowId={`user-edit-${user.id}`} initialWidth={600}>
            <div className="flex flex-col h-[60vh]">
                <div className="flex border-b border-color mb-4">
                    <button onClick={() => setActiveTab('general')} className={`px-4 py-2 ${activeTab === 'general' ? 'border-b-2 border-accent text-primary' : 'text-tertiary'}`}>일반 정보</button>
                    <button onClick={() => setActiveTab('strategic')} className={`px-4 py-2 ${activeTab === 'strategic' ? 'border-b-2 border-accent text-primary' : 'text-tertiary'}`}>전략 바둑</button>
                    <button onClick={() => setActiveTab('playful')} className={`px-4 py-2 ${activeTab === 'playful' ? 'border-b-2 border-accent text-primary' : 'text-tertiary'}`}>놀이 바둑</button>
                    <button onClick={() => setActiveTab('quests')} className={`px-4 py-2 ${activeTab === 'quests' ? 'border-b-2 border-accent text-primary' : 'text-tertiary'}`}>퀘스트</button>
                    <button onClick={() => setActiveTab('danger')} className={`px-4 py-2 ${activeTab === 'danger' ? 'border-b-2 border-danger text-danger' : 'text-tertiary'}`}>위험 구역</button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2">
                    {activeTab === 'general' && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2"><label>닉네임</label><input type="text" name="nickname" value={editedUser.nickname} onChange={handleTextInputChange} className="bg-tertiary p-1 rounded" maxLength={6} /></div>
                            <div className="grid grid-cols-2 gap-2"><label>전략 레벨</label><input type="number" name="strategyLevel" value={editedUser.strategyLevel} onChange={handleInputChange} className="bg-tertiary p-1 rounded" /></div>
                            <div className="grid grid-cols-2 gap-2"><label>전략 XP</label><input type="number" name="strategyXp" value={editedUser.strategyXp} onChange={handleInputChange} className="bg-tertiary p-1 rounded" /></div>
                            <div className="grid grid-cols-2 gap-2"><label>놀이 레벨</label><input type="number" name="playfulLevel" value={editedUser.playfulLevel} onChange={handleInputChange} className="bg-tertiary p-1 rounded" /></div>
                            <div className="grid grid-cols-2 gap-2"><label>놀이 XP</label><input type="number" name="playfulXp" value={editedUser.playfulXp} onChange={handleInputChange} className="bg-tertiary p-1 rounded" /></div>
                            <div className="grid grid-cols-2 gap-2"><label>골드</label><input type="number" name="gold" value={editedUser.gold} onChange={handleInputChange} className="bg-tertiary p-1 rounded" /></div>
                            <div className="grid grid-cols-2 gap-2"><label>다이아</label><input type="number" name="diamonds" value={editedUser.diamonds} onChange={handleInputChange} className="bg-tertiary p-1 rounded" /></div>
                            <div className="grid grid-cols-2 gap-2"><label>매너 점수</label><input type="number" name="mannerScore" value={editedUser.mannerScore} onChange={handleInputChange} className="bg-tertiary p-1 rounded" /></div>
                             <div className="grid grid-cols-2 gap-2 items-center">
                                <label>관리자 권한</label>
                                <input
                                    type="checkbox"
                                    name="isAdmin"
                                    checked={!!editedUser.isAdmin}
                                    onChange={handleCheckboxChange}
                                    className="w-5 h-5"
                                    disabled={user.id === currentUser.id}
                                    title={user.id === currentUser.id ? "자신의 관리자 권한은 변경할 수 없습니다." : ""}
                                />
                            </div>
                        </div>
                    )}
                    {activeTab === 'strategic' && (
                         <div className="grid grid-cols-2 gap-2 items-center font-bold text-sm mb-2 px-1"><span className="col-span-1">게임 모드</span><span>랭킹 점수</span></div>
                    )}
                    {activeTab === 'strategic' && renderStatInputs(SPECIAL_GAME_MODES)}
                    {activeTab === 'playful' && (
                         <div className="grid grid-cols-2 gap-2 items-center font-bold text-sm mb-2 px-1"><span className="col-span-1">게임 모드</span><span>랭킹 점수</span></div>
                    )}
                    {activeTab === 'playful' && renderStatInputs(PLAYFUL_GAME_MODES)}
                    {activeTab === 'quests' && (
                        <div className="space-y-4">
                           <QuestCategoryPanel title="일일 퀘스트" questType="daily" questData={editedUser.quests?.daily} />
                           <QuestCategoryPanel title="주간 퀘스트" questType="weekly" questData={editedUser.quests?.weekly} />
                           <QuestCategoryPanel title="월간 퀘스트" questType="monthly" questData={editedUser.quests?.monthly} />
                        </div>
                    )}
                     {activeTab === 'danger' && (
                        <div className="space-y-4 p-4 border border-danger/50 rounded-lg">
                            <h3 className="text-lg font-bold text-danger">주의: 되돌릴 수 없는 작업입니다.</h3>
                            <Button onClick={() => handleReset('stats')} colorScheme="yellow" className="w-full">모든 전적 초기화</Button>
                            <Button onClick={() => handleReset('full')} colorScheme="orange" className="w-full">레벨 포함 전체 초기화</Button>
                            <Button onClick={handleDelete} colorScheme="red" className="w-full">아이디 삭제</Button>
                            
                            <div className="mt-6 pt-6 border-t border-color">
                                <h3 className="text-lg font-bold text-yellow-400 mb-3">챔피언십 토너먼트 세션 초기화</h3>
                                <p className="text-sm text-gray-400 mb-4">선택한 경기장의 토너먼트 세션을 초기화하고 새로운 매칭을 생성합니다.</p>
                                <div className="space-y-2">
                                    <Button 
                                        onClick={() => {
                                            if (window.confirm(`[${user.nickname}] 님의 동네바둑리그 토너먼트를 초기화하고 새로 매칭하시겠습니까?`)) {
                                                onAction({ type: 'ADMIN_RESET_TOURNAMENT_SESSION', payload: { targetUserId: user.id, tournamentType: 'neighborhood' } });
                                            }
                                        }} 
                                        colorScheme="purple" 
                                        className="w-full"
                                    >
                                        동네바둑리그 재매칭
                                    </Button>
                                    <Button 
                                        onClick={() => {
                                            if (window.confirm(`[${user.nickname}] 님의 전국바둑대회 토너먼트를 초기화하고 새로 매칭하시겠습니까?`)) {
                                                onAction({ type: 'ADMIN_RESET_TOURNAMENT_SESSION', payload: { targetUserId: user.id, tournamentType: 'national' } });
                                            }
                                        }} 
                                        colorScheme="purple" 
                                        className="w-full"
                                    >
                                        전국바둑대회 재매칭
                                    </Button>
                                    <Button 
                                        onClick={() => {
                                            if (window.confirm(`[${user.nickname}] 님의 월드챔피언십 토너먼트를 초기화하고 새로 매칭하시겠습니까?`)) {
                                                onAction({ type: 'ADMIN_RESET_TOURNAMENT_SESSION', payload: { targetUserId: user.id, tournamentType: 'world' } });
                                            }
                                        }} 
                                        colorScheme="purple" 
                                        className="w-full"
                                    >
                                        월드챔피언십 재매칭
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-color">
                    <Button onClick={onClose} colorScheme="gray">취소</Button>
                    <Button onClick={handleSave} colorScheme="green">저장</Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

// FIX: The component uses `allUsers`, `onAction`, `onBack`, and `currentUser` props which were not defined in the interface.
// The extended `AdminProps` type is likely incomplete. Defining the props directly fixes the type error.
interface UserManagementPanelProps {
    allUsers: User[];
    onAction: (action: ServerAction) => void;
    onBack: () => void;
    currentUser: User;
}

const UserManagementPanel: React.FC<UserManagementPanelProps> = ({ allUsers, onAction, onBack, currentUser }) => {
    const { handlers } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [managingUser, setManagingUser] = useState<User | null>(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');

    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password || !nickname) { alert('모든 필드를 입력해주세요.'); return; }
        onAction({ type: 'ADMIN_CREATE_USER', payload: { username, password, nickname } });
        setUsername(''); setPassword(''); setNickname('');
    };

    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return allUsers;
        const lowercasedQuery = searchQuery.toLowerCase();
        return allUsers.filter(user => user.nickname.toLowerCase().includes(lowercasedQuery) || user.username.toLowerCase().includes(lowercasedQuery));
    }, [allUsers, searchQuery]);

    return (
        <div className="space-y-8 bg-primary text-primary">
            {managingUser && <UserManagementModal user={managingUser} currentUser={currentUser} onClose={() => setManagingUser(null)} onAction={onAction} />}
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">사용자 관리</h1>
                <button onClick={onBack} className="p-0 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-100 active:shadow-inner active:scale-95 active:translate-y-0.5">
                    <img src="/images/button/back.png" alt="Back" className="w-10 h-10 sm:w-12 sm:h-12" />
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-panel border border-color text-on-panel p-6 rounded-lg shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">사용자 목록 ({filteredUsers.length})</h2>
                        <input type="text" placeholder="닉네임 또는 아이디 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-secondary border border-color text-primary text-sm rounded-lg focus:ring-accent focus:border-accent w-1/3 p-2.5" />
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <table className="w-full text-sm text-left text-secondary">
                            <thead className="text-xs text-secondary uppercase bg-secondary sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3">닉네임</th>
                                    <th scope="col" className="px-6 py-3">아이디</th>
                                    <th scope="col" className="px-6 py-3">레벨 (전략/놀이)</th>
                                    <th scope="col" className="px-6 py-3">액션</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="bg-primary border-b border-color hover:bg-secondary/50">
                                        <th 
                                            scope="row" 
                                            className="px-6 py-4 font-medium text-primary whitespace-nowrap cursor-pointer hover:text-accent"
                                            onClick={() => handlers.openViewingUser(user.id)}
                                            title={`${user.nickname} 프로필 보기`}
                                        > 
                                            {user.nickname} {user.isAdmin && <span className="text-xs text-purple-400 ml-2">[관리자]</span>} 
                                        </th>
                                        <td className="px-6 py-4">{user.username}</td>
                                        <td className="px-6 py-4">S.{user.strategyLevel} / P.{user.playfulLevel}</td>
                                        <td className="px-6 py-4">
                                            <button onClick={(e) => { e.stopPropagation(); setManagingUser(user); }} className="font-medium text-blue-500 hover:underline">관리</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="bg-panel border border-color text-on-panel p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold mb-4 border-b border-color pb-2">신규 아이디 발급</h2>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <input type="text" name="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="아이디" className="bg-secondary border border-color text-primary text-sm rounded-lg focus:ring-accent focus:border-accent block w-full p-2.5" />
                        <input type="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" className="bg-secondary border border-color text-primary text-sm rounded-lg focus:ring-accent focus:border-accent block w-full p-2.5" />
                        <input type="text" name="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임" className="bg-secondary border border-color text-primary text-sm rounded-lg focus:ring-accent focus:border-accent block w-full p-2.5" maxLength={6} />
                        <Button type="submit" className="w-full">생성하기</Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UserManagementPanel;