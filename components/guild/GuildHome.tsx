import React, { useState, useEffect } from 'react';
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

const GuildHome: React.FC = () => {
    const { currentUserWithStatus, handlers } = useAppContext();
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

    useEffect(() => {
        if (currentUserWithStatus?.guildId) {
            loadGuildInfo();
        } else {
            setLoading(false);
        }
        
        // Listen for WebSocket guild updates
        const ws = (window as any).ws;
        if (!ws || !currentUserWithStatus?.guildId) return;
        
        const handleMessage = (event: MessageEvent) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'GUILD_UPDATE' && message.payload?.guild?.id === currentUserWithStatus?.guildId) {
                    // Reload guild info when update is received
                    loadGuildInfo();
                }
            } catch (e) {
                // Ignore
            }
        };
        
        ws.addEventListener('message', handleMessage);
        return () => ws.removeEventListener('message', handleMessage);
    }, [currentUserWithStatus?.guildId]);

    const loadGuildInfo = async () => {
        if (!currentUserWithStatus?.guildId) return;
        
        try {
            setLoading(true);
            const result: any = await handlers.handleAction({ type: 'GET_GUILD_INFO' });
            if (result && !result.error && result.clientResponse) {
                setGuild(result.clientResponse.guild);
                setMembers(result.clientResponse.members || []);
                setMissions(result.clientResponse.missions || []);
                setShopItems(result.clientResponse.shopItems || []);
                setDonations(result.clientResponse.donations || []);
            }
        } catch (error) {
            console.error('Failed to load guild info:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">길드 정보를 불러오는 중...</p>
            </div>
        );
    }

    // No guild - show create/join options
    if (!currentUserWithStatus?.guildId || !guild) {
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
                            loadGuildInfo();
                        }}
                    />
                )}
            </div>
        );
    }

    // Has guild - show guild home
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

