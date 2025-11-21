import React, { useMemo } from 'react';
import { Guild as GuildType, GuildMember, GuildMission } from '../../types/index.js';
import Button from '../Button.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import DraggableWindow from '../DraggableWindow.js';
import { calculateGuildMissionXp } from '../../utils/guildUtils.js';
import ResourceActionButton from '../ui/ResourceActionButton.js';
import { isDifferentWeekKST } from '../../utils/timeUtils.js';

interface GuildMissionsPanelProps {
    guild: GuildType;
    myMemberInfo: GuildMember | undefined;
    onClose: () => void;
}

const MissionItem: React.FC<{ mission: GuildMission; guildLevel: number; guild: GuildType; }> = ({ mission, guildLevel, guild }) => {
    const { currentUserWithStatus, handlers } = useAppContext();
    const progress = mission.progress ?? 0;
    const target = mission.target ?? 0;
    const isComplete = progress >= target;
    const percentage = target > 0 ? Math.min((progress / target) * 100, 100) : 100;
    
    const isClaimed = mission.claimedBy?.includes(currentUserWithStatus!.id) ?? false;
    
    // 초기화 후 지난 보상은 받을 수 없도록 체크
    const now = Date.now();
    const isExpired = guild.lastMissionReset && isDifferentWeekKST(guild.lastMissionReset, now);
    const canClaim = isComplete && !isClaimed && !isExpired;

    const handleClaim = async () => {
        if (canClaim) {
            await handlers.handleAction({ type: 'GUILD_CLAIM_MISSION_REWARD', payload: { missionId: mission.id } });
            // 보상 받기 후 길드 정보 갱신
            await handlers.handleAction({ type: 'GET_GUILD_INFO' });
        }
    };
    
    const finalXp = calculateGuildMissionXp((mission.guildReward?.guildXp ?? 0), guildLevel);

    return (
        <div className="bg-gray-900/50 p-3 rounded-lg flex items-center gap-4 border-2 border-gray-700/50 hover:border-gray-600/70 transition-all">
            <div className="w-16 h-16 bg-gray-800 rounded-md flex items-center justify-center text-gray-500 text-3xl flex-shrink-0 border border-gray-700/50">
                📜
            </div>
            <div className="flex-grow min-w-0">
                <h4 className="font-bold text-white truncate">{mission.title}</h4>
                <p className="text-xs text-gray-400 mb-1 truncate">{mission.description}</p>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                </div>
                <p className="text-xs text-right text-gray-300 mt-1">{progress.toLocaleString()} / {target.toLocaleString()}</p>
            </div>
            <div className="w-32 text-center flex-shrink-0 flex flex-col items-center gap-1 relative">
                <ResourceActionButton 
                    onClick={handleClaim} 
                    disabled={!canClaim} 
                    variant={isClaimed ? 'neutral' : (isComplete && !isExpired ? 'materials' : 'gold')}
                    className="w-full !text-sm !py-2"
                >
                    {isExpired ? '만료됨' : (isClaimed ? '완료' : (isComplete ? '보상 받기' : '진행 중'))}
                </ResourceActionButton>
                <div className="flex items-center justify-center gap-2 text-xs flex-wrap">
                    <div className="flex items-center gap-1 font-semibold">
                        <img src="/images/guild/tokken.png" alt="Guild Coin" className="w-3 h-3" />
                        <span className="text-yellow-300">{mission.personalReward?.guildCoins ?? 0}</span>
                    </div>
                    <span className="text-green-400 font-semibold">XP +{finalXp.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

const GuildMissionsPanel: React.FC<GuildMissionsPanelProps> = ({ guild, onClose }) => {
    const { currentUserWithStatus } = useAppContext();
    const now = Date.now();
    const isExpired = guild.lastMissionReset && isDifferentWeekKST(guild.lastMissionReset, now);
    
    // 초기화 전 보상 받을 내역이 있는지 확인
    const hasUnclaimedRewards = useMemo(() => {
        if (!currentUserWithStatus || !guild.weeklyMissions) return false;
        if (isExpired) return false; // 초기화된 경우 보상 받을 수 없음
        
        return guild.weeklyMissions.some(mission => {
            const isComplete = (mission.progress ?? 0) >= (mission.target ?? 0);
            const isClaimed = mission.claimedBy?.includes(currentUserWithStatus.id) ?? false;
            return isComplete && !isClaimed;
        });
    }, [guild.weeklyMissions, currentUserWithStatus, isExpired]);

    return (
        <DraggableWindow title="주간 길드 임무" onClose={onClose} windowId="guild-missions" initialWidth={750} variant="store">
            <div className="flex flex-col h-full">
                <div className="flex-shrink-0 mb-4">
                    <div className="bg-gradient-to-br from-gray-900/80 via-gray-800/70 to-gray-900/80 p-3 rounded-lg border border-gray-700/50">
                        <p className="text-sm text-gray-300 leading-relaxed">
                            길드원들과 협력하여 임무를 완수하고 보상을 획득하세요. 완료된 임무는 각 길드원이 '보상 받기' 버튼을 눌러 개인 보상(길드 코인)을 받을 수 있습니다. 
                            길드 XP는 미션 완료 시 자동으로 추가됩니다. 매주 월요일 0시(KST)에 초기화되며, 초기화 전에 보상을 받지 못하면 지난 보상은 받을 수 없습니다.
                        </p>
                        {hasUnclaimedRewards && (
                            <p className="text-sm text-red-400 font-semibold mt-2 flex items-center gap-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                보상 받을 내역이 있습니다. 초기화 전에 받아주세요!
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto pr-2">
                    {guild.weeklyMissions && guild.weeklyMissions.length > 0 ? (
                        <ul className="space-y-3">
                            {guild.weeklyMissions.map(mission => (
                                <li key={mission.id}>
                                    <MissionItem mission={mission} guildLevel={guild.level} guild={guild} />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                            <p>진행 가능한 임무가 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </DraggableWindow>
    );
};

export default GuildMissionsPanel;