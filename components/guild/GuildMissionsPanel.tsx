import React from 'react';
import { Guild as GuildType, GuildMember, GuildMission } from '../../types/index.js';
import Button from '../Button.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import DraggableWindow from '../DraggableWindow.js';
import { calculateGuildMissionXp } from '../../utils/guildUtils.js';

interface GuildMissionsPanelProps {
    guild: GuildType;
    myMemberInfo: GuildMember | undefined;
    onClose: () => void;
}

const MissionItem: React.FC<{ mission: GuildMission; guildLevel: number; }> = ({ mission, guildLevel }) => {
    const { currentUserWithStatus, handlers } = useAppContext();
    const progress = mission.progress ?? 0;
    const target = mission.target ?? 0;
    const isComplete = progress >= target;
    const percentage = target > 0 ? Math.min((progress / target) * 100, 100) : 100;
    
    const isClaimed = mission.claimedBy?.includes(currentUserWithStatus!.id) ?? false;
    const canClaim = isComplete && !isClaimed;

    const handleClaim = () => {
        if (canClaim) {
            handlers.handleAction({ type: 'GUILD_CLAIM_MISSION_REWARD', payload: { missionId: mission.id } });
        }
    };
    
    const finalXp = calculateGuildMissionXp((mission.guildReward?.guildXp ?? 0), guildLevel);

    return (
        <div className="bg-secondary p-2 rounded-lg flex items-center gap-3">
            <div className="flex-grow min-w-0">
                <h4 className="font-bold truncate">{mission.title}</h4>
                <p className="text-xs text-tertiary truncate">{mission.description}</p>
                <div className="w-full bg-tertiary rounded-full h-2.5 mt-1">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                </div>
                <p className="text-xs text-right text-primary">{progress.toLocaleString()} / {target.toLocaleString()}</p>
            </div>
            <div className="w-28 text-center flex-shrink-0 flex flex-col items-center gap-2 relative">
                <div className="flex flex-col items-center text-xs gap-1">
                    <div className="flex items-center gap-1 font-semibold">
                        <img src="/images/guild/tokken.png" alt="Guild Coin" className="w-4 h-4" />
                        <span className="text-primary">{mission.personalReward?.guildCoins ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold">
                        <span className="text-green-400">XP +{finalXp.toLocaleString()}</span>
                    </div>
                </div>
                <Button
                    onClick={handleClaim}
                    disabled={!canClaim}
                    colorScheme={canClaim ? 'green' : 'gray'}
                    className="w-full !text-sm !py-1.5"
                >
                    {isClaimed ? '완료' : (isComplete ? '받기' : '진행 중')}
                </Button>
            </div>
        </div>
    );
};

const GuildMissionsPanel: React.FC<GuildMissionsPanelProps> = ({ guild, onClose }) => {
    return (
        <DraggableWindow title="주간 길드 임무" onClose={onClose} windowId="guild-missions" initialWidth={750}>
            <div className="flex flex-col">
                <div className="flex-shrink-0 mb-4">
                    <p className="text-sm text-tertiary">길드원들과 협력하여 임무를 완수하고 보상을 획득하세요. 완료된 임무는 각 길드원이 '받기' 버튼을 눌러 개인 보상과 길드 경험치를 획득할 수 있습니다. 매주 월요일에 초기화됩니다.</p>
                </div>
                <div className="flex-grow overflow-y-auto pr-2 max-h-[calc(70vh-100px)]">
                    {guild.weeklyMissions && guild.weeklyMissions.length > 0 ? (
                        <ul className="space-y-2">
                            {guild.weeklyMissions.map(mission => (
                                <li key={mission.id}>
                                    <MissionItem mission={mission} guildLevel={guild.level} />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-tertiary pt-8">진행 가능한 임무가 없습니다.</p>
                    )}
                </div>
            </div>
        </DraggableWindow>
    );
};

export default GuildMissionsPanel;