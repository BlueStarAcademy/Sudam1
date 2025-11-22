import React, { useState, useMemo } from 'react';
import { Guild as GuildType, GuildMember, GuildMemberRole } from '../../types/index.js';
import Button from '../Button.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import Avatar from '../Avatar.js';
import { AVATAR_POOL, BORDER_POOL, GUILD_INITIAL_MEMBER_LIMIT } from '../../constants/index.js';
import { formatLastLogin } from '../../utils/timeUtils.js';

interface GuildMembersPanelProps {
    guild: GuildType;
    myMemberInfo: GuildMember | undefined;
}

const Popover: React.FC<{
    member: GuildMember;
    isMaster: boolean;
    isVice: boolean;
    onPromote: () => void;
    onDemote: () => void;
    onKick: () => void;
    onTransfer: () => void;
    onClose: () => void;
}> = ({ member, isMaster, isVice, onPromote, onDemote, onKick, onTransfer, onClose }) => {
    const canPromoteToVice = isMaster && member.role === GuildMemberRole.Member;
    const canDemote = isMaster && member.role === GuildMemberRole.Vice;
    const canKick = (isMaster && member.role !== GuildMemberRole.Master) || (isVice && member.role === GuildMemberRole.Member);
    const canTransfer = isMaster && member.role !== GuildMemberRole.Master;

    return (
        <div className="absolute z-20 -top-1 right-full mr-2 w-36 bg-gradient-to-br from-stone-900/98 via-neutral-800/95 to-stone-900/98 border-2 border-stone-600/60 rounded-xl shadow-2xl p-2 space-y-1.5 backdrop-blur-md">
            {canPromoteToVice && <Button onClick={onPromote} className="w-full !text-xs !py-2 border border-blue-500/50 bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white shadow-lg hover:shadow-xl transition-all">부길드장 임명</Button>}
            {canDemote && <Button onClick={onDemote} className="w-full !text-xs !py-2 border border-yellow-500/50 bg-gradient-to-r from-yellow-600/90 to-amber-600/90 text-white shadow-lg hover:shadow-xl transition-all">부길드장 해임</Button>}
            {canTransfer && <Button onClick={onTransfer} className="w-full !text-xs !py-2 border border-orange-500/50 bg-gradient-to-r from-orange-600/90 to-red-600/90 text-white shadow-lg hover:shadow-xl transition-all">길드장 위임</Button>}
            {canKick && <Button onClick={onKick} className="w-full !text-xs !py-2 border border-red-500/50 bg-gradient-to-r from-red-600/90 to-rose-600/90 text-white shadow-lg hover:shadow-xl transition-all">추방</Button>}
            <Button onClick={onClose} className="w-full !text-xs !py-2 border border-stone-500/50 bg-gradient-to-r from-stone-700/90 to-neutral-700/90 text-white shadow-lg hover:shadow-xl transition-all">닫기</Button>
        </div>
    );
};

const GuildMembersPanel: React.FC<GuildMembersPanelProps> = ({ guild, myMemberInfo }) => {
    const { handlers, allUsers, onlineUsers, currentUserWithStatus } = useAppContext();
    const [managingMember, setManagingMember] = useState<GuildMember | null>(null);

    const memberLimit = useMemo(() => {
        const baseLimit = GUILD_INITIAL_MEMBER_LIMIT;
        const researchBonus = (guild.research?.member_limit_increase?.level || 0) * 5;
        return baseLimit + researchBonus;
    }, [guild]);


    const sortedMembers = useMemo(() => {
        const roleOrder: Record<string, number> = {
            'leader': 0,
            'officer': 1,
            'member': 2,
        };
        return [...(guild.members || [])].sort((a, b) => (roleOrder[a.role] || 3) - (roleOrder[b.role] || 3));
    }, [guild.members]);
    
    const isMaster = myMemberInfo?.role === 'leader';
    const isVice = myMemberInfo?.role === 'officer';
    const canManage = isMaster || isVice;

    const handleAction = (type: 'PROMOTE' | 'DEMOTE' | 'KICK' | 'TRANSFER', targetMemberId: string) => {
        let actionType: 'GUILD_PROMOTE_MEMBER' | 'GUILD_DEMOTE_MEMBER' | 'GUILD_KICK_MEMBER' | 'GUILD_TRANSFER_MASTERSHIP';
        let confirmMessage = '';
        const targetMember = guild.members?.find(m => m.userId === targetMemberId);
        if (!targetMember) return;

        const memberName = targetMember.nickname || 'Unknown';
        switch (type) {
            case 'PROMOTE':
                actionType = 'GUILD_PROMOTE_MEMBER';
                confirmMessage = `${memberName}님을 부길드장으로 임명하시겠습니까?`;
                break;
            case 'DEMOTE':
                actionType = 'GUILD_DEMOTE_MEMBER';
                confirmMessage = `${memberName}님을 부길드장에서 해임하시겠습니까?`;
                break;
            case 'KICK':
                actionType = 'GUILD_KICK_MEMBER';
                confirmMessage = `${memberName}님을 길드에서 추방하시겠습니까?`;
                break;
            case 'TRANSFER':
                actionType = 'GUILD_TRANSFER_MASTERSHIP';
                confirmMessage = `정말로 길드장 권한을 ${memberName}님에게 위임하시겠습니까? 이 작업은 되돌릴 수 없습니다.`;
                break;
        }

        if (window.confirm(confirmMessage)) {
            if (actionType === 'GUILD_KICK_MEMBER') {
                handlers.handleAction({ type: 'GUILD_KICK_MEMBER', payload: { guildId: guild.id, memberId: targetMemberId, targetMemberId } });
            } else {
                handlers.handleAction({ type: actionType as 'GUILD_PROMOTE_MEMBER' | 'GUILD_DEMOTE_MEMBER' | 'GUILD_TRANSFER_MASTERSHIP', payload: { guildId: guild.id, targetMemberId } });
            }
        }
        setManagingMember(null);
    };

    const getRoleName = (role: string) => {
        switch (role) {
            case 'leader': return '길드장';
            case 'officer': return '부길드장';
            case 'member': return '길드원';
            default: return '길드원';
        }
    };
    
    const getRoleColor = (role: string) => {
        switch (role) {
            case 'leader': return 'text-yellow-400';
            case 'officer': return 'text-blue-400';
            case 'member': return 'text-gray-300';
            default: return 'text-gray-300';
        }
    };
    
    const handleLeaveGuild = () => {
        if (myMemberInfo?.role === 'leader' && (guild.members?.length || 0) > 1) {
            alert('길드장이 길드를 떠나려면 먼저 다른 길드원에게 길드장을 위임해야 합니다.');
            return;
        }
        const confirmMessage = myMemberInfo?.role === 'leader' && (guild.members?.length || 0) === 1
            ? '길드의 마지막 멤버입니다. 길드를 떠나면 길드가 해체됩니다. 정말로 떠나시겠습니까?'
            : '정말로 길드를 떠나시겠습니까?';

        if (window.confirm(confirmMessage)) {
            handlers.handleAction({ type: 'GUILD_LEAVE' });
        }
    };

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-stone-900/95 via-neutral-800/90 to-stone-900/95 rounded-xl border-2 border-stone-600/60 shadow-2xl backdrop-blur-md p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-stone-500/10 via-gray-500/5 to-stone-500/10 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <h3 className="text-2xl font-bold text-highlight drop-shadow-lg flex items-center gap-2">
                        <span className="text-2xl">👥</span>
                        <span>길드원 목록 <span className="text-lg text-primary">({(guild.members?.length || 0)} / {memberLimit})</span></span>
                    </h3>
                    {myMemberInfo && myMemberInfo.role !== 'leader' && (
                        <Button onClick={handleLeaveGuild} colorScheme="red" className="!text-xs !py-2 !px-4 border-2 border-red-500/50 shadow-lg hover:shadow-xl transition-all">길드 탈퇴</Button>
                    )}
                    {myMemberInfo && myMemberInfo.role === 'leader' && (guild.members?.length || 0) === 1 && (
                        <Button onClick={handleLeaveGuild} colorScheme="red" className="!text-xs !py-2 !px-4 border-2 border-red-500/50 shadow-lg hover:shadow-xl transition-all">길드 해체</Button>
                    )}
                </div>
                <div className="flex text-sm text-highlight px-5 py-4 mb-4 font-bold bg-gradient-to-r from-stone-800/95 via-neutral-700/85 to-stone-800/95 rounded-xl border-2 border-stone-600/50 shadow-lg backdrop-blur-md">
                    <div className="flex-1 text-base">길드원</div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="w-24 text-center">주간 기여도</div>
                        <div className="w-24 text-center">누적 기여도</div>
                        <div className="w-28 text-center">최근 접속</div>
                        {canManage && <div className="w-20 text-center">관리</div>}
                    </div>
                </div>
                <div className="overflow-y-auto pr-3 flex-grow">
                    <ul className="space-y-4">
                        {sortedMembers.map(member => {
                            const user = allUsers.find(u => u.id === member.userId);
                            const userStatus = onlineUsers.find(u => u.id === member.userId);
                            const avatarUrl = user ? AVATAR_POOL.find(a => a.id === user.avatarId)?.url : undefined;
                            const borderUrl = user ? BORDER_POOL.find(b => b.id === user.borderId)?.url : undefined;
                            const isOnline = !!userStatus;
                            const isClickable = user && user.id !== currentUserWithStatus?.id;

                            return (
                                <li
                                    key={member.userId}
                                    onClick={isClickable ? (e) => { e?.stopPropagation(); handlers.openViewingUser(member.userId); } : undefined}
                                    title={isClickable ? `${member.nickname || 'Unknown'} 프로필 보기` : ''}
                                    className={`bg-gradient-to-r from-stone-800/95 via-neutral-700/90 to-stone-800/95 p-5 rounded-xl flex items-center gap-5 border-2 border-stone-600/50 shadow-xl backdrop-blur-md transition-all duration-200 ${
                                        isClickable 
                                            ? 'cursor-pointer hover:from-stone-700/98 hover:via-neutral-600/95 hover:to-stone-700/98 hover:border-stone-500/70 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02]' 
                                            : ''
                                    } ${
                                        member.role === 'leader' 
                                            ? 'border-yellow-500/70 bg-gradient-to-r from-yellow-900/40 via-amber-900/30 to-yellow-900/40 shadow-[0_6px_20px_rgba(251,191,36,0.4)] ring-2 ring-yellow-400/20' 
                                            : member.role === 'officer'
                                            ? 'border-blue-500/70 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-blue-900/40 shadow-[0_6px_20px_rgba(59,130,246,0.4)] ring-2 ring-blue-400/20'
                                            : ''
                                    }`}
                                >
                                <div className="flex items-center gap-5 flex-1 min-w-0">
                                    <div className="relative flex-shrink-0">
                                         <Avatar userId={member.userId} userName={member.nickname || 'Unknown'} size={56} avatarUrl={avatarUrl} borderUrl={borderUrl} />
                                         {isOnline && <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-stone-800 shadow-xl animate-pulse ring-2 ring-green-400/50"></div>}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-xl truncate drop-shadow-lg mb-1">{member.nickname || 'Unknown'}</p>
                                        <p className={`text-sm font-bold ${getRoleColor(member.role)} drop-shadow-md`}>{getRoleName(member.role)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 flex-shrink-0">
                                    <div className="text-center w-24">
                                        <p className="font-bold text-lg text-primary drop-shadow-lg">{member.weeklyContribution || 0}</p>
                                    </div>
                                    <div className="text-center w-24">
                                        <p className="font-bold text-lg text-accent drop-shadow-lg">{member.contributionTotal || 0}</p>
                                    </div>
                                    <div className="text-center w-28">
                                        <p className="truncate text-sm font-semibold">{isOnline ? <span className="text-green-400 drop-shadow-lg">온라인</span> : (user?.lastLoginAt ? <span className="text-tertiary">{formatLastLogin(user.lastLoginAt)}</span> : <span className="text-tertiary">알 수 없음</span>)}</p>
                                    </div>
                                    {(isMaster || isVice) && (
                                        <div className="relative w-20 text-center">
                                            {member.userId !== myMemberInfo?.userId && (
                                                <Button 
                                                    onClick={(e) => { e?.stopPropagation(); setManagingMember(member); }} 
                                                    className="!text-xs !py-2.5 !px-4 border-2 border-cyan-500/60 bg-gradient-to-r from-cyan-600/95 via-blue-600/95 to-indigo-600/95 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold"
                                                >
                                                    관리
                                                </Button>
                                            )}
                                            {managingMember?.userId === member.userId && (
                                                <Popover 
                                                    member={member}
                                                    isMaster={isMaster}
                                                    isVice={isVice}
                                                    onPromote={() => handleAction('PROMOTE', member.userId)}
                                                    onDemote={() => handleAction('DEMOTE', member.userId)}
                                                    onKick={() => handleAction('KICK', member.userId)}
                                                    onTransfer={() => handleAction('TRANSFER', member.userId)}
                                                    onClose={() => setManagingMember(null)}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
                </div>
            </div>
        </div>
    );
};

export default GuildMembersPanel;

