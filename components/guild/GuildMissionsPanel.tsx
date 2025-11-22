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
        <div className="bg-gradient-to-br from-stone-900/95 via-neutral-800/90 to-stone-900/95 p-3 rounded-xl flex items-center gap-3 border-2 border-stone-600/60 hover:border-stone-500/80 transition-all relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-stone-500/10 via-gray-500/5 to-stone-500/10 pointer-events-none"></div>
            <div className="relative z-10 flex items-center gap-3 w-full">
            <div className="w-14 h-14 bg-gradient-to-br from-stone-800/90 to-stone-900/90 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border-2 border-stone-600/60 shadow-lg">
                📜
            </div>
            <div className="flex-grow min-w-0">
                <h4 className="font-bold text-sm text-white truncate mb-0.5">{mission.title}</h4>
                <p className="text-xs text-stone-300/80 mb-2 line-clamp-1">{mission.description}</p>
                <div className="w-full bg-stone-800/60 rounded-full h-2 border border-stone-700/50">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all shadow-sm" style={{ width: `${percentage}%` }}></div>
                </div>
                <p className="text-xs text-right text-stone-300 mt-1">{progress.toLocaleString()} / {target.toLocaleString()}</p>
            </div>
            <div className="w-28 text-center flex-shrink-0 flex flex-col items-center gap-1.5">
                <button
                    onClick={handleClaim}
                    disabled={!canClaim}
                    className={`w-full py-2 rounded-lg font-bold text-xs transition-all relative overflow-hidden group ${
                        canClaim
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]'
                            : isClaimed
                            ? 'bg-stone-700/50 text-stone-400 cursor-not-allowed'
                            : 'bg-stone-700/50 text-stone-400 cursor-not-allowed'
                    }`}
                >
                    {canClaim && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    )}
                    <span className="relative z-10">
                        {isExpired ? '만료됨' : (isClaimed ? '완료' : (isComplete ? '보상 받기' : '진행 중'))}
                    </span>
                </button>
                <div className="flex items-center justify-center gap-2 text-[10px] flex-wrap">
                    <div className="flex items-center gap-1 font-semibold">
                        <img src="/images/guild/tokken.png" alt="Guild Coin" className="w-3 h-3" />
                        <span className="text-amber-300">{mission.personalReward?.guildCoins ?? 0}</span>
                    </div>
                    <span className="text-emerald-400 font-semibold">XP +{finalXp.toLocaleString()}</span>
                </div>
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
        <DraggableWindow title="주간 길드 임무" onClose={onClose} windowId="guild-missions" initialWidth={1000} initialHeight={800} variant="store">
            <div className="flex flex-col h-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-stone-950/50 via-neutral-900/30 to-stone-950/50 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col h-full">
                <div className="flex-shrink-0 mb-3">
                    <div className="bg-gradient-to-br from-stone-900/90 via-neutral-800/80 to-stone-900/90 p-3 rounded-xl border-2 border-stone-600/60 shadow-lg">
                        <p className="text-xs text-stone-300 leading-relaxed">
                            길드원들과 협력하여 임무를 완수하고 보상을 획득하세요. 완료된 임무는 각 길드원이 '보상 받기' 버튼을 눌러 개인 보상(길드 코인)을 받을 수 있습니다. 
                            길드 XP는 미션 완료 시 자동으로 추가됩니다. 매주 월요일 0시(KST)에 초기화되며, 초기화 전에 보상을 받지 못하면 지난 보상은 받을 수 없습니다.
                        </p>
                        {hasUnclaimedRewards && (
                            <p className="text-xs text-red-400 font-semibold mt-2 flex items-center gap-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                보상 받을 내역이 있습니다. 초기화 전에 받아주세요!
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto pr-2">
                    {guild.weeklyMissions && guild.weeklyMissions.length > 0 ? (
                        <ul className="space-y-2">
                            {guild.weeklyMissions.map(mission => (
                                <li key={mission.id}>
                                    <MissionItem mission={mission} guildLevel={guild.level} guild={guild} />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="h-full flex items-center justify-center text-stone-500">
                            <p>진행 가능한 임무가 없습니다.</p>
                        </div>
                    )}
                </div>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default GuildMissionsPanel;