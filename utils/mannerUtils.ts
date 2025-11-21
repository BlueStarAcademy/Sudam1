

import { User, MannerEffects } from '../types/index.js';
import { ACTION_POINT_REGEN_INTERVAL_MS } from '../constants/rules.js';

export const getMannerScore = (user: User): number => {
    return user.mannerScore ?? 200;
};

export const getMannerRank = (score: number): { rank: string, color: string } => {
    if (score >= 2000) return { rank: '마스터', color: 'text-purple-400' };
    if (score >= 1600) return { rank: '프로', color: 'text-blue-400' };
    if (score >= 1200) return { rank: '품격', color: 'text-cyan-400' };
    if (score >= 800) return { rank: '매우 좋음', color: 'text-teal-400' };
    if (score >= 400) return { rank: '좋음', color: 'text-green-400' };
    if (score >= 200) return { rank: '보통', color: 'text-gray-300' };
    if (score >= 100) return { rank: '주의', color: 'text-yellow-400' };
    if (score >= 50) return { rank: '나쁨', color: 'text-orange-400' };
    if (score >= 1) return { rank: '매우 나쁨', color: 'text-red-500' };
    return { rank: '최악', color: 'text-red-700' };
};

export const getMannerStyle = (score: number): { percentage: number, colorClass: string } => {
    const percentage = Math.max(0, Math.min(100, (score / 2000) * 100));
    let colorClass = 'bg-red-700';
    if (score >= 2000) colorClass = 'bg-purple-400';
    else if (score >= 1600) colorClass = 'bg-blue-400';
    else if (score >= 1200) colorClass = 'bg-cyan-400';
    else if (score >= 800) colorClass = 'bg-teal-400';
    else if (score >= 400) colorClass = 'bg-green-400';
    else if (score >= 200) colorClass = 'bg-gray-300';
    else if (score >= 100) colorClass = 'bg-yellow-400';
    else if (score >= 50) colorClass = 'bg-orange-400';
    else if (score >= 1) colorClass = 'bg-red-500';
    return { percentage, colorClass };
};

export const getMannerEffects = (user: User): MannerEffects => {
    const score = getMannerScore(user);
    const effects: MannerEffects = {
        maxActionPoints: 30,
        actionPointRegenInterval: ACTION_POINT_REGEN_INTERVAL_MS,
        goldBonusPercent: 0,
        itemDropRateBonus: 0,
        mannerActionButtonBonus: 0,
        rewardMultiplier: 1,
        enhancementSuccessRateBonus: 0,
    };

    if (score >= 400) effects.maxActionPoints += 10;
    if (score >= 800) effects.goldBonusPercent += 10;
    if (score >= 1200) effects.itemDropRateBonus += 10;
    if (score >= 1600) effects.enhancementSuccessRateBonus += 10;
    if (score <= 199) effects.mannerActionButtonBonus += 1;
    if (score <= 99) effects.rewardMultiplier *= 0.5;
    if (score <= 49) effects.actionPointRegenInterval = 20 * 60 * 1000;
    if (score <= 0) effects.maxActionPoints = Math.floor(effects.maxActionPoints * 0.1);
    
    return effects;
};