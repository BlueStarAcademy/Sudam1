import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../../hooks/useAppContext.js';
import type { Guild, GuildMember, GuildMessage, GuildMission, GuildShop, GuildDonation } from '../../types/entities.js';
import Button from '../Button.js';
import GuildCreateModal from './GuildCreateModal.js';
import GuildJoinModal from './GuildJoinModal.js';
import GuildInfoPanel from './GuildInfoPanel.js';
import GuildMemberList from './GuildMemberList.js';
import GuildChat from './GuildChat.js';
import GuildMissionPanel from './GuildMissionPanel.js';
import GuildShopComponent from './GuildShop.js';
import GuildDonationPanel from './GuildDonationPanel.js';
import GuildWarPanel from './GuildWarPanel.js';

interface GuildHomeProps {
    initialGuild?: Guild; // 길드 생성/가입 직후 전달받은 길드 정보
}

const GuildHome: React.FC<GuildHomeProps> = ({ initialGuild }) => {
    const { currentUserWithStatus, handlers, guilds } = useAppContext();
    const [guild, setGuild] = useState<Guild | null>(null);
    const [members, setMembers] = useState<GuildMember[]>([]);
    const [messages, setMessages] = useState<GuildMessage[]>([]);
    const [missions, setMissions] = useState<GuildMission[]>([]);
    const [shopItems, setShopItems] = useState<GuildShop[]>([]);
    const [donations, setDonations] = useState<GuildDonation[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'chat' | 'mission' | 'shop' | 'donation' | 'war'>('info');
    const [loading, setLoading] = useState(true);
    const isLoadingRef = useRef(false);
    const hasErrorRef = useRef(false);

    const loadGuildInfo = useCallback(async () => {
        // initialGuild가 있으면 해당 길드 ID 사용, 없으면 currentUserWithStatus의 guildId 사용
        const guildIdToLoad = initialGuild?.id || currentUserWithStatus?.guildId;
        
        if (!guildIdToLoad) {
            setLoading(false);
            return;
        }
        
        // 이미 로딩 중이면 무시
        if (isLoadingRef.current) return;
        
        try {
            isLoadingRef.current = true;
            hasErrorRef.current = false;
            setLoading(true);
            const result: any = await handlers.handleAction({ type: 'GET_GUILD_INFO' });
            if (result && !result.error && result.clientResponse) {
                setGuild(result.clientResponse.guild);
                setMembers(result.clientResponse.members || []);
                setMissions(result.clientResponse.missions || []);
                setShopItems(result.clientResponse.shopItems || []);
                setDonations(result.clientResponse.donations || []);
                hasErrorRef.current = false;
            } else if (result?.error) {
                // initialGuild가 있으면 에러가 나도 해당 정보 사용
                if (initialGuild) {
                    setGuild(initialGuild);
                    hasErrorRef.current = false;
                } else {
                    // 에러가 발생하면 더 이상 재시도하지 않음
                    console.warn('Failed to load guild info:', result.error);
                    hasErrorRef.current = true;
                    setGuild(null);
                    setMembers([]);
                    setMissions([]);
                    setShopItems([]);
                    setDonations([]);
                }
            }
        } catch (error) {
            console.error('Failed to load guild info:', error);
            // initialGuild가 있으면 에러가 나도 해당 정보 사용
            if (initialGuild) {
                setGuild(initialGuild);
                hasErrorRef.current = false;
            } else {
                hasErrorRef.current = true;
                setGuild(null);
                setMembers([]);
                setMissions([]);
                setShopItems([]);
                setDonations([]);
            }
        } finally {
            setLoading(false);
            isLoadingRef.current = false;
        }
    }, [currentUserWithStatus?.guildId, initialGuild, handlers]);

    useEffect(() => {
        // 깃에서 불러온 길드 데이터(guilds) 우선 사용
        const guildIdToLoad = initialGuild?.id || currentUserWithStatus?.guildId;
        if (guildIdToLoad && guilds[guildIdToLoad]) {
            // guilds 상태에서 길드 정보 가져오기
            setGuild(guilds[guildIdToLoad]);
            setLoading(false);
            hasErrorRef.current = false;
            // 길드 멤버 등 추가 정보 로드
            loadGuildInfo();
        } else if (initialGuild && initialGuild.id) {
            // initialGuild가 있으면 먼저 설정하고 추가 정보 로드
            setGuild(initialGuild);
            setLoading(false);
            hasErrorRef.current = false;
            // 길드 멤버 등 추가 정보 로드
            loadGuildInfo();
        } else if (currentUserWithStatus?.guildId) {
            loadGuildInfo();
        } else {
            setLoading(false);
            setGuild(null);
            setMembers([]);
            setMissions([]);
            setShopItems([]);
            setDonations([]);
            hasErrorRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialGuild?.id, currentUserWithStatus?.guildId, guilds]);

    // WebSocket 업데이트 및 guilds 상태 업데이트 처리
    useEffect(() => {
        const guildIdToWatch = initialGuild?.id || currentUserWithStatus?.guildId;
        if (!guildIdToWatch) return;
        
        // guilds 상태에서 길드 정보가 업데이트되면 반영
        if (guilds[guildIdToWatch] && guilds[guildIdToWatch] !== guild) {
            setGuild(guilds[guildIdToWatch]);
        }
    }, [guilds, initialGuild?.id, currentUserWithStatus?.guildId, guild]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">길드 정보를 불러오는 중...</p>
            </div>
        );
    }

    // No guild - show create/join options (initialGuild가 있으면 길드 정보가 있더라도 표시)
    const hasGuildId = currentUserWithStatus?.guildId || initialGuild?.id;
    if (!hasGuildId || (!guild && !initialGuild)) {
        return (
            <div className="p-6 flex flex-col items-center justify-center h-full gap-4">
                <h1 className="text-3xl font-bold text-white mb-4">길드</h1>
                <p className="text-gray-400 mb-6">가입한 길드가 없습니다.</p>
                <div className="flex gap-4">
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        colorScheme="green"
                        className="!py-3 !px-6"
                    >
                        길드 창설
                    </Button>
                    <Button
                        onClick={() => setIsJoinModalOpen(true)}
                        colorScheme="blue"
                        className="!py-3 !px-6"
                    >
                        길드 가입
                    </Button>
                </div>

                {isCreateModalOpen && (
                    <GuildCreateModal
                        onClose={() => setIsCreateModalOpen(false)}
                        onSuccess={(newGuild) => {
                            setGuild(newGuild);
                            setIsCreateModalOpen(false);
                            loadGuildInfo();
                        }}
                    />
                )}

                {isJoinModalOpen && (
                    <GuildJoinModal
                        onClose={() => setIsJoinModalOpen(false)}
                        onSuccess={(newGuild) => {
                            setGuild(newGuild);
                            setIsJoinModalOpen(false);
                            // 길드 가입 성공 시 페이지 유지 (이미 /guild 페이지에 있음)
                            loadGuildInfo();
                        }}
                    />
                )}
            </div>
        );
    }

    // Has guild - show guild home
    if (!guild) return null;
    
    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-white">{guild.name}</h1>
                <Button
                    onClick={async () => {
                        if (window.confirm('정말 길드를 나가시겠습니까?')) {
                            try {
                                await handlers.handleAction({ type: 'LEAVE_GUILD' });
                                setGuild(null);
                                setMembers([]);
                                setMessages([]);
                                setMissions([]);
                                setShopItems([]);
                                setDonations([]);
                            } catch (error) {
                                console.error('Failed to leave guild:', error);
                            }
                        }
                    }}
                    colorScheme="red"
                    className="!py-2 !px-4"
                >
                    길드 나가기
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b border-gray-700">
                {(['info', 'chat', 'mission', 'shop', 'donation', 'war'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 font-semibold transition-colors ${
                            activeTab === tab
                                ? 'text-blue-400 border-b-2 border-blue-400'
                                : 'text-gray-400 hover:text-gray-300'
                        }`}
                    >
                        {tab === 'info' && '정보'}
                        {tab === 'chat' && '채팅'}
                        {tab === 'mission' && '미션'}
                        {tab === 'shop' && '상점'}
                        {tab === 'donation' && '기부'}
                        {tab === 'war' && '길드전'}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
                {activeTab === 'info' && (
                    <GuildInfoPanel
                        guild={guild}
                        members={members}
                        onMembersUpdate={setMembers}
                    />
                )}
                {activeTab === 'chat' && (
                    <GuildChat
                        guildId={guild.id}
                        messages={messages}
                        onMessagesUpdate={setMessages}
                    />
                )}
                {activeTab === 'mission' && (
                    <GuildMissionPanel
                        guildId={guild.id}
                        missions={missions}
                        onMissionsUpdate={setMissions}
                    />
                )}
                {activeTab === 'shop' && (
                    <GuildShopComponent
                        guildId={guild.id}
                        shopItems={shopItems}
                        onShopItemsUpdate={setShopItems}
                    />
                )}
                {activeTab === 'donation' && (
                    <GuildDonationPanel
                        guildId={guild.id}
                        donations={donations}
                        onDonationsUpdate={setDonations}
                        onGuildUpdate={loadGuildInfo}
                    />
                )}
                {activeTab === 'war' && (
                    <GuildWarPanel guildId={guild.id} />
                )}
            </div>
        </div>
    );
};

export default GuildHome;

