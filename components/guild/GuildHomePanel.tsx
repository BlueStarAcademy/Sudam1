import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Guild as GuildType, ChatMessage, GuildMemberRole, GuildMember } from '../../types/index.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import Button from '../Button.js';
import { GUILD_CHECK_IN_MILESTONE_REWARDS } from '../../constants/index.js';
import { isSameDayKST, formatDateTimeKST } from '../../utils/timeUtils.js';
import Avatar from '../Avatar.js';
import { AVATAR_POOL, BORDER_POOL } from '../../constants/index.js';

const GuildCheckInPanel: React.FC<{ guild: GuildType }> = ({ guild }) => {
    const { handlers, currentUserWithStatus } = useAppContext();

    const now = Date.now();
    const myCheckInTimestamp = guild.checkIns?.[currentUserWithStatus!.id];
    const hasCheckedInToday = myCheckInTimestamp ? isSameDayKST(myCheckInTimestamp, now) : false;

    const todaysCheckIns = Object.values(guild.checkIns || {}).filter(ts => isSameDayKST(ts, now)).length;
    const totalMembers = guild.memberLimit || (guild.members?.length || 0);
    
    const maxProgress = GUILD_CHECK_IN_MILESTONE_REWARDS[GUILD_CHECK_IN_MILESTONE_REWARDS.length - 1].count;
    const progressPercent = maxProgress > 0 ? (todaysCheckIns / maxProgress) * 100 : 0;

    const handleCheckIn = () => {
        handlers.handleAction({ type: 'GUILD_CHECK_IN' });
    };
    
    const handleClaimMilestone = (index: number) => {
        handlers.handleAction({ type: 'GUILD_CLAIM_CHECK_IN_REWARD', payload: { milestoneIndex: index } });
    };

    return (
        <div className="bg-secondary p-2 rounded-lg flex flex-col h-full">
            <div>
                <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-base text-highlight">길드 출석부</h3>
                    <Button onClick={handleCheckIn} disabled={hasCheckedInToday} className="!text-sm !py-1">
                        {hasCheckedInToday ? '출석 완료' : '출석하기'}
                    </Button>
                </div>
                <p className="text-sm text-tertiary">오늘 출석: <span className="font-bold text-primary">{todaysCheckIns} / {totalMembers}</span>명</p>
            </div>
            <div className="my-2">
                <div className="w-full bg-tertiary rounded-full h-2.5 relative border border-black/20">
                    <div className="bg-green-500 h-full rounded-full transition-width duration-500" style={{ width: `${progressPercent}%` }}></div>
                    {GUILD_CHECK_IN_MILESTONE_REWARDS.map((milestone, index) => {
                        if (milestone.count < maxProgress) {
                            const milestonePercent = (milestone.count / maxProgress) * 100;
                            return <div key={`milestone-line-${index}`} className="absolute top-0 h-full w-px bg-black/50" style={{ left: `${milestonePercent}%` }} title={`${milestone.count}명 보상`}></div>;
                        }
                        return null;
                    })}
                </div>
            </div>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 flex-grow">
                {GUILD_CHECK_IN_MILESTONE_REWARDS.map((milestone, index) => {
                    const isAchieved = todaysCheckIns >= milestone.count;
                    const isClaimed = guild.dailyCheckInRewardsClaimed?.some(c => c.userId === currentUserWithStatus!.id && c.milestoneIndex === index);
                    const canClaim = isAchieved && !isClaimed && hasCheckedInToday;
                    
                    return (
                        <div key={index} className={`bg-tertiary p-1.5 rounded-lg text-center flex flex-col items-center justify-between border-2 ${isAchieved ? 'border-yellow-500/50' : 'border-transparent'} aspect-square`}>
                            <div className="flex flex-col items-center">
                                <img src="/images/guild/tokken.png" alt="길드 코인" className="w-7 h-7"/>
                                <span className="text-sm font-bold text-primary">+{milestone.reward.guildCoins}</span>
                                <p className="text-xs text-tertiary">{milestone.count}명</p>
                            </div>
                            <Button onClick={() => canClaim && handleClaimMilestone(index)} disabled={!canClaim} colorScheme={canClaim ? 'green' : 'gray'} className="!text-[10px] !py-1 mt-1 w-full whitespace-nowrap">
                                {isClaimed ? '완료' : (isAchieved ? '받기' : '미달성')}
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const GuildAnnouncementPanel: React.FC<{ guild: GuildType }> = ({ guild }) => (
    <div className="bg-secondary p-2 rounded-lg flex flex-col h-full">
        <h3 className="font-bold text-base text-highlight mb-1 flex-shrink-0">길드 공지</h3>
        <div className="flex-grow overflow-y-auto pr-2 bg-tertiary/40 p-2 rounded-md min-h-0">
            <p className="text-sm text-primary whitespace-pre-wrap">
                {guild.announcement || '등록된 공지사항이 없습니다.'}
            </p>
        </div>
    </div>
);

const GuildChat: React.FC<{ guild: GuildType, myMemberInfo: GuildMember | undefined }> = ({ guild, myMemberInfo }) => {
    const { handlers, allUsers, currentUserWithStatus } = useAppContext();
    const [message, setMessage] = useState('');
    const chatBodyRef = useRef<HTMLDivElement>(null);
    const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [guild.chatHistory]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim()) {
            handlers.handleAction({ type: 'SEND_GUILD_CHAT_MESSAGE', payload: { content: message } });
            setMessage('');
        }
    };

    const handleDelete = (msg: ChatMessage) => {
        if (window.confirm('메시지를 삭제하시겠습니까?')) {
            handlers.handleAction({ 
                type: 'GUILD_DELETE_CHAT_MESSAGE', 
                payload: { 
                    messageId: msg.id, 
                    timestamp: msg.timestamp 
                } 
            });
        }
    };

    return (
        <div className="bg-secondary p-2 rounded-lg h-full flex flex-col">
            <h3 className="font-bold text-base text-highlight mb-1 flex-shrink-0">길드 채팅</h3>
            <div ref={chatBodyRef} className="flex-grow space-y-3 overflow-y-auto pr-2 mb-2 bg-tertiary/40 p-2 rounded-md min-h-0">
                {guild.chatHistory && guild.chatHistory.length > 0 ? (
                    guild.chatHistory.map(msg => {
                        const senderId = msg.user?.id || msg.authorId;
                        const sender = senderId ? userMap.get(senderId) : undefined;
                        const avatarUrl = sender ? AVATAR_POOL.find(a => a.id === sender.avatarId)?.url : undefined;
                        const borderUrl = sender ? BORDER_POOL.find(b => b.id === sender.borderId)?.url : undefined;
                        const isMyMessage = senderId === currentUserWithStatus?.id;
                        const canManage = myMemberInfo?.role === 'leader' || myMemberInfo?.role === 'officer';

                        return (
                            <div key={msg.id || msg.timestamp || msg.createdAt} className="flex items-start gap-3 group">
                                <div className="flex-shrink-0 mt-1">
                                    {sender && <Avatar userId={sender.id} userName={sender.nickname} avatarUrl={avatarUrl} borderUrl={borderUrl} size={32} />}
                                </div>
                                <div className="flex-grow">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-semibold text-primary">{msg.user?.nickname || sender?.nickname || 'Unknown'}</span>
                                            <span className="text-xs text-tertiary">{formatDateTimeKST(msg.timestamp || msg.createdAt)}</span>
                                        </div>
                                        {(isMyMessage || canManage) && !msg.system && msg.id && (
                                            <button onClick={() => handleDelete(msg as ChatMessage)} className="text-xs text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity font-semibold" aria-label="Delete message" title="메시지 삭제">삭제</button>
                                        )}
                                    </div>
                                    <p className="text-sm text-secondary break-words whitespace-pre-wrap">{msg.text || msg.content || ''}</p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="h-full flex items-center justify-center text-tertiary"><p>길드 채팅 메시지가 없습니다.</p></div>
                )}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2 flex-shrink-0">
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="메시지를 입력하세요..." className="flex-grow bg-tertiary border border-color rounded-md p-2 text-sm resize-none" rows={1} maxLength={200} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }} />
                <Button type="submit" className="self-end">전송</Button>
            </form>
        </div>
    );
};

interface GuildHomePanelProps {
    guild: GuildType;
    myMemberInfo: GuildMember | undefined;
}

const GuildHomePanel: React.FC<GuildHomePanelProps> = ({ guild, myMemberInfo }) => {
    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0">
                <GuildCheckInPanel guild={guild} />
                <GuildAnnouncementPanel guild={guild} />
            </div>
            <div className="flex-grow min-h-0">
                <GuildChat guild={guild} myMemberInfo={myMemberInfo} />
            </div>
        </div>
    );
};

export default GuildHomePanel;
