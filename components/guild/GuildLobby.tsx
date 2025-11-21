import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../hooks/useAppContext.js';
import { Guild as GuildType, ServerAction } from '../../types/index.js';
import BackButton from '../BackButton.js';
import Button from '../Button.js';
import CreateGuildModal from './CreateGuildModal.js';
import { GUILD_INITIAL_MEMBER_LIMIT } from '../../constants/index.js';

interface GuildLobbyProps {}

const GuildLobby: React.FC<GuildLobbyProps> = () => {
    const { guilds, handlers, currentUserWithStatus } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [creatingGuild, setCreatingGuild] = useState(false);
    
    const joinableGuilds = useMemo(() => {
        return Object.values(guilds)
            .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0));
    }, [guilds, searchTerm]);

    const handleJoinOrApply = (guild: GuildType) => {
        const action: ServerAction = { type: 'JOIN_GUILD', payload: { guildId: guild.id } };
        handlers.handleAction(action);
    };

    const handleCancelApplication = (guildId: string) => {
        handlers.handleAction({ type: 'GUILD_CANCEL_APPLICATION', payload: { guildId } });
    };


    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
            {creatingGuild && <CreateGuildModal onClose={() => setCreatingGuild(false)} />}
            <header className="flex justify-between items-center mb-6">
                <BackButton onClick={() => window.location.hash = '#/profile'} />
                <h1 className="text-3xl font-bold">길드 찾기</h1>
                <Button onClick={() => setCreatingGuild(true)} colorScheme="green">길드 창설</Button>
            </header>
            <div className="mb-4">
                <input 
                    type="text" 
                    placeholder="길드 이름 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-secondary p-3 rounded-lg border border-color"
                />
            </div>
            <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
                {joinableGuilds.map(guild => {
                    const isApplicationPending = currentUserWithStatus?.guildApplications?.some(app => app.guildId === guild.id);
                    const memberLimit = GUILD_INITIAL_MEMBER_LIMIT + (guild.research?.member_limit_increase?.level || 0);
                    const memberCount = guild.members?.length || 0;
                    return (
                        <div key={guild.id} className="bg-panel p-4 rounded-lg flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 bg-tertiary rounded-md flex-shrink-0">
                                     {guild.icon && <img src={guild.icon} alt={guild.name} className="w-full h-full object-cover p-1" />}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-lg">{guild.name} <span className="text-sm text-secondary">(Lv.{guild.level || 1})</span></h3>
                                    <p className="text-xs text-tertiary truncate">{guild.description || ''}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0">
                                <span className="text-sm">{memberCount} / {memberLimit}</span>
                                {isApplicationPending ? (
                                    <div className="flex items-center gap-2">
                                        <Button disabled={true} colorScheme="gray">신청중</Button>
                                        <Button onClick={() => handleCancelApplication(guild.id)} colorScheme="red" className="!text-xs !py-1">취소</Button>
                                    </div>
                                ) : (
                                    <Button onClick={() => handleJoinOrApply(guild)} disabled={memberCount >= memberLimit}>
                                        {guild.isPublic ? '바로 가입' : '가입 신청'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default GuildLobby;
