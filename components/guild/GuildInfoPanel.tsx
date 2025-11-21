import React from 'react';
import { Guild, GuildMember } from '../../types/entities.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import Avatar from '../Avatar.js';

interface GuildInfoPanelProps {
    guild: Guild;
    members: GuildMember[];
    onMembersUpdate: (members: GuildMember[]) => void;
}

const GuildInfoPanel: React.FC<GuildInfoPanelProps> = ({ guild, members }) => {
    const { currentUserWithStatus, handlers, allUsers } = useAppContext();
    const isLeader = guild.leaderId === currentUserWithStatus?.id;
    const userMember = members.find(m => m.userId === currentUserWithStatus?.id);
    const isOfficer = userMember?.role === 'officer' || isLeader;

    return (
        <div className="space-y-6">
            {/* Guild Info */}
            <div className="bg-gray-800/50 rounded-lg p-4">
                <h2 className="text-xl font-bold text-white mb-4">길드 정보</h2>
                <div className="space-y-2">
                    <div>
                        <span className="text-gray-400">길드명:</span>
                        <span className="ml-2 text-white font-semibold">{guild.name}</span>
                    </div>
                    {guild.description && (
                        <div>
                            <span className="text-gray-400">설명:</span>
                            <p className="mt-1 text-white">{guild.description}</p>
                        </div>
                    )}
                    <div>
                        <span className="text-gray-400">레벨:</span>
                        <span className="ml-2 text-white font-semibold">{guild.level}</span>
                    </div>
                    <div>
                        <span className="text-gray-400">경험치:</span>
                        <span className="ml-2 text-white font-semibold">{(guild.experience ?? 0).toLocaleString()}</span>
                    </div>
                    <div>
                        <span className="text-gray-400">길드 골드:</span>
                        <span className="ml-2 text-yellow-400 font-semibold">{(guild.gold ?? 0).toLocaleString()}</span>
                    </div>
                    <div>
                        <span className="text-gray-400">멤버 수:</span>
                        <span className="ml-2 text-white font-semibold">{members.length}/50</span>
                    </div>
                </div>
            </div>

            {/* Members List */}
            <div className="bg-gray-800/50 rounded-lg p-4">
                <h2 className="text-xl font-bold text-white mb-4">멤버 목록</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {members.map((member) => {
                        const user = allUsers?.find(u => u.id === member.userId);
                        const isCurrentUser = member.userId === currentUserWithStatus?.id;
                        const canManage = isLeader || (isOfficer && member.role === 'member');

                        return (
                            <div
                                key={member.id}
                                className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar userId={member.userId} userName={user?.nickname || 'Unknown'} size={40} />
                                    <div>
                                        <p className="text-white font-semibold">{user?.nickname || 'Unknown'}</p>
                                        <p className="text-xs text-gray-400">
                                            {member.role === 'leader' && '길드장'}
                                            {member.role === 'officer' && '부길드장'}
                                            {member.role === 'member' && '멤버'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-400">
                                        기여도: {member.contributionTotal.toLocaleString()}
                                    </span>
                                    {canManage && !isCurrentUser && (
                                        <div className="flex gap-2">
                                            {isLeader && (
                                                <button
                                                    onClick={async () => {
                                                        const newRole = member.role === 'officer' ? 'member' : 'officer';
                                                        try {
                                                    const result: any = await handlers.handleAction({
                                                        type: 'UPDATE_GUILD_MEMBER_ROLE',
                                                        payload: { memberId: member.id, role: newRole },
                                                    });
                                                    if (result?.error) {
                                                        alert(result.error);
                                                    } else {
                                                        // Reload members
                                                        window.location.reload(); // Simple reload for now
                                                    }
                                                        } catch (error) {
                                                            console.error('Failed to update role:', error);
                                                        }
                                                    }}
                                                    className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                                                >
                                                    {member.role === 'officer' ? '부길드장 해제' : '부길드장 임명'}
                                                </button>
                                            )}
                                            <button
                                                onClick={async () => {
                                                    if (window.confirm(`${user?.nickname}님을 추방하시겠습니까?`)) {
                                                        try {
                                                            const result: any = await handlers.handleAction({
                                                                type: 'KICK_GUILD_MEMBER',
                                                                payload: { memberId: member.id },
                                                            });
                                                            if (result?.error) {
                                                                alert(result.error);
                                                            } else {
                                                                // Reload members
                                                                window.location.reload(); // Simple reload for now
                                                            }
                                                        } catch (error) {
                                                            console.error('Failed to kick member:', error);
                                                        }
                                                    }
                                                }}
                                                className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                                            >
                                                추방
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default GuildInfoPanel;

