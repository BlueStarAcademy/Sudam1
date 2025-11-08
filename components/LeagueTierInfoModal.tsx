import React from 'react';
import DraggableWindow from './DraggableWindow.js';
import { LEAGUE_DATA, LEAGUE_WEEKLY_REWARDS } from '../constants';
import { LeagueRewardTier, LeagueTier } from '../types.js';

interface LeagueTierInfoModalProps {
    onClose: () => void;
    isTopmost?: boolean;
}

const formatRankRange = (start: number, end: number) => {
    return start === end ? `${start}위` : `${start}-${end}위`;
};

const getOutcomeLabel = (tier: LeagueTier, outcome: LeagueRewardTier['outcome']) => {
    if (outcome === 'promote' && tier === LeagueTier.Challenger) {
        return '최상위';
    }
    switch (outcome) {
        case 'promote':
            return '승급';
        case 'maintain':
            return '잔류';
        case 'demote':
            return '강등';
        default:
            return '';
    }
};

const buildOutcomeSummary = (tier: LeagueTier, rewards: LeagueRewardTier[]) => {
    const grouped: Record<'promote' | 'maintain' | 'demote', string[]> = {
        promote: [],
        maintain: [],
        demote: [],
    };

    rewards.forEach(reward => {
        grouped[reward.outcome].push(formatRankRange(reward.rankStart, reward.rankEnd));
    });

    const parts: string[] = [];
    (['promote', 'maintain', 'demote'] as const).forEach(outcome => {
        if (grouped[outcome].length > 0) {
            const label = getOutcomeLabel(tier, outcome);
            parts.push(`${label}: ${grouped[outcome].join(', ')}`);
        }
    });

    return parts.join(' / ');
};

const LeagueTierInfoModal: React.FC<LeagueTierInfoModalProps> = ({ onClose, isTopmost }) => {

    const renderReward = (rewardTier: LeagueRewardTier) => {
        const rankText = rewardTier.rankStart === rewardTier.rankEnd
            ? `${rewardTier.rankStart}위`
            : `${rewardTier.rankStart}-${rewardTier.rankEnd}위`;

        let outcomeText = '';
        let outcomeColor = '';
        switch (rewardTier.outcome) {
            case 'promote':
                outcomeText = '승급';
                outcomeColor = 'text-green-400';
                break;
            case 'maintain':
                outcomeText = '잔류';
                outcomeColor = 'text-gray-400';
                break;
            case 'demote':
                outcomeText = '강등';
                outcomeColor = 'text-red-400';
                break;
        }

        return (
            <li key={rewardTier.rankStart} className="flex justify-between items-center bg-gray-700/50 px-3 py-1.5 rounded-md">
                <span className="font-semibold">{rankText}</span>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-yellow-300">
                        <img src="/images/icon/Zem.png" alt="다이아" className="w-4 h-4" />
                        {rewardTier.diamonds}
                    </span>
                    <span className={`font-bold w-12 text-center ${outcomeColor}`}>{outcomeText}</span>
                </div>
            </li>
        );
    };

    return (
        <DraggableWindow title="챔피언십 리그 안내" onClose={onClose} windowId="league-tier-info-modal" initialWidth={550} isTopmost={isTopmost}>
            <div className="space-y-4">
                <p className="text-sm text-gray-300 text-center">
                    일주일간 16명의 유저가 경쟁하여 순위에 따라 승급·잔류·강등이 결정되고, 주간이 종료되면 티어에 따라 보상을 지급받습니다.
                </p>

                <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {LEAGUE_DATA.map(tierData => {
                        const rewards = LEAGUE_WEEKLY_REWARDS[tierData.tier];
                        return (
                            <li key={tierData.tier} className="p-3 bg-gray-900/50 rounded-lg">
                                <div className="flex items-center gap-4">
                                   <img src={tierData.icon} alt={tierData.name} className="w-12 h-12 flex-shrink-0" />
                                   <div>
                                     <h3 className="text-lg font-bold">{tierData.name}</h3>
                                     <p className="text-xs text-gray-400">순위 경쟁 기반 티어 (승급·잔류·강등 조건은 아래 보상표 참고)</p>
                                     <p className="text-[11px] text-gray-500 mt-1">
                                         {buildOutcomeSummary(tierData.tier, rewards)}
                                     </p>
                                   </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-700/50">
                                   <h4 className="text-sm font-semibold text-gray-400 mb-1.5">주간 보상</h4>
                                   <ul className="space-y-1 text-xs">
                                       {rewards.map(renderReward)}
                                   </ul>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </DraggableWindow>
    );
};

export default LeagueTierInfoModal;