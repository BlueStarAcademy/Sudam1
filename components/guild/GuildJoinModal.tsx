import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../hooks/useAppContext.js';
import { Guild } from '../../types/entities.js';
import Button from '../Button.js';
import DraggableWindow from '../DraggableWindow.js';

interface GuildJoinModalProps {
    onClose: () => void;
    onSuccess: (guild: Guild) => void;
}

type GuildWithMemberCount = Guild & { memberCount: number };

const GuildJoinModal: React.FC<GuildJoinModalProps> = ({ onClose, onSuccess }) => {
    const { handlers } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [guilds, setGuilds] = useState<GuildWithMemberCount[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [joiningGuildId, setJoiningGuildId] = useState<string | null>(null);

    // Load guilds on mount and when search query changes
    useEffect(() => {
        loadGuilds();
    }, []);

    const loadGuilds = async (query?: string) => {
        setLoading(true);
        setError(null);
        try {
            const result: any = await handlers.handleAction({
                type: 'LIST_GUILDS',
                payload: { searchQuery: query || '', limit: 100 },
            });

            if (result?.error) {
                setError(result.error);
            } else if (result?.clientResponse?.guilds) {
                setGuilds(result.clientResponse.guilds);
            }
        } catch (err: any) {
            setError(err.message || '길드 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        loadGuilds(searchQuery);
    };

    const handleJoin = async (guild: GuildWithMemberCount) => {
        if (joiningGuildId) return; // Already processing
        
        setJoiningGuildId(guild.id);
        setError(null);

        try {
            const result: any = await handlers.handleAction({
                type: 'JOIN_GUILD',
                payload: { guildId: guild.id },
            });

            if (result?.error) {
                setError(result.error);
            } else if (result?.clientResponse?.guild) {
                onSuccess(result.clientResponse.guild);
            }
        } catch (err: any) {
            setError(err.message || '길드 가입에 실패했습니다.');
        } finally {
            setJoiningGuildId(null);
        }
    };

    // Filter guilds based on search query (client-side filtering for instant feedback)
    const filteredGuilds = useMemo(() => {
        if (!searchQuery.trim()) return guilds;
        const lowerQuery = searchQuery.toLowerCase();
        return guilds.filter(guild => 
            guild.name.toLowerCase().includes(lowerQuery) ||
            (guild.description?.toLowerCase().includes(lowerQuery))
        );
    }, [guilds, searchQuery]);

    // Get join type from guild settings (default: 'auto' for immediate join)
    const getJoinType = (guild: Guild): 'auto' | 'request' => {
        if (!guild.settings || typeof guild.settings !== 'object') return 'auto';
        return (guild.settings as any).joinType === 'request' ? 'request' : 'auto';
    };

    const MAX_GUILD_MEMBERS = 50;

    return (
        <DraggableWindow
            title="길드 가입"
            windowId="guild-join"
            onClose={onClose}
            initialWidth={700}
            initialHeight={600}
            isTopmost
        >
            <div className="p-6 flex flex-col h-full">
                {/* Search Bar */}
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                        길드 이름으로 검색
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="길드 이름을 입력하세요"
                            className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                        />
                        <Button
                            onClick={handleSearch}
                            colorScheme="blue"
                            className="!py-2 !px-4"
                            disabled={loading}
                        >
                            검색
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
                        <p className="text-sm text-red-200">{error}</p>
                    </div>
                )}

                {/* Guild List */}
                <div className="flex-1 overflow-y-auto mb-4">
                    {loading && guilds.length === 0 ? (
                        <div className="flex items-center justify-center h-32">
                            <p className="text-gray-400">길드 목록을 불러오는 중...</p>
                        </div>
                    ) : filteredGuilds.length === 0 ? (
                        <div className="flex items-center justify-center h-32">
                            <p className="text-gray-400">검색 결과가 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredGuilds.map((guild) => {
                                const joinType = getJoinType(guild);
                                const isFull = guild.memberCount >= MAX_GUILD_MEMBERS;
                                const isJoining = joiningGuildId === guild.id;
                                
                                return (
                                    <div
                                        key={guild.id}
                                        className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-lg font-semibold text-white truncate">
                                                        {guild.name}
                                                    </h3>
                                                    {guild.emblem && (
                                                        <span className="text-xl">{guild.emblem}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                                                    <span>인원: {guild.memberCount}/{MAX_GUILD_MEMBERS}</span>
                                                    <span>레벨: {guild.level}</span>
                                                </div>
                                                {guild.description && (
                                                    <p className="text-sm text-gray-300 line-clamp-2">
                                                        {guild.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex-shrink-0">
                                                <Button
                                                    onClick={() => handleJoin(guild)}
                                                    colorScheme={joinType === 'auto' ? 'green' : 'blue'}
                                                    className="!py-2 !px-4 whitespace-nowrap"
                                                    disabled={isFull || isJoining || loading}
                                                >
                                                    {isJoining 
                                                        ? '처리 중...' 
                                                        : isFull
                                                        ? '인원 가득'
                                                        : joinType === 'auto'
                                                        ? '가입'
                                                        : '신청'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-700">
                    <Button
                        onClick={onClose}
                        colorScheme="gray"
                        className="flex-1"
                        disabled={loading || joiningGuildId !== null}
                    >
                        취소
                    </Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default GuildJoinModal;
