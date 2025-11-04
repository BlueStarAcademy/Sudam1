

import { User } from '../types.js';
import * as types from '../types.js';
import * as db from './db.ts';
import { ACTION_POINT_REGEN_INTERVAL_MS } from '../constants.js';
import { regenerateActionPoints, getMannerEffects as getMannerEffectsFromService } from './effectService.js';
import { createDefaultSpentStatPoints } from './initialData.js';

export const MANNER_RANKS = [
    { name: '최악', min: 0, max: 0 },
    { name: '매우 나쁨', min: 1, max: 49 },
    { name: '나쁨', min: 50, max: 99 },
    { name: '주의', min: 100, max: 199 },
    { name: '보통', min: 200, max: 399 },
    { name: '좋음', min: 400, max: 799 },
    { name: '매우 좋음', min: 800, max: 1199 },
    { name: '품격', min: 1200, max: 1599 },
    { name: '프로', min: 1600, max: 1999 },
    { name: '마스터', min: 2000, max: Infinity },
];

export const getMannerScore = (user: User): number => {
    return user.mannerScore ?? 200;
};

export const getMannerRank = (score: number): { rank: string, color: string } => {
    if (score >= 2000) return { rank: '마스터', color: 'text-purple-400' };
    if (score >= 1600) return { rank: '프로', color: 'text-blue-400' };
    if (score >= 1100) return { rank: '품격', color: 'text-cyan-400' };
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
    else if (score >= 1100) colorClass = 'bg-cyan-400';
    else if (score >= 800) colorClass = 'bg-teal-400';
    else if (score >= 400) colorClass = 'bg-green-400';
    else if (score >= 200) colorClass = 'bg-gray-300';
    else if (score >= 100) colorClass = 'bg-yellow-400';
    else if (score >= 50) colorClass = 'bg-orange-400';
    else if (score >= 1) colorClass = 'bg-red-500';
    return { percentage, colorClass };
};


export interface MannerEffects {
    maxActionPoints: number;
    actionPointRegenInterval: number;
    goldBonusPercent: number;
    itemDropRateBonus: number;
    mannerActionButtonBonus: number;
    unmannerlyActionPenaltyMultiplier: number;
    enhancementSuccessRateBonus: number;
}

export const applyMannerRankChange = async (user: types.User, oldMannerScore: number): Promise<void> => {
    // Regenerate points with the OLD interval to "cash out" any earned progress.
    // This correctly updates the timer before the new, potentially faster, interval takes effect.
    const tempUserWithOldScore = { ...user, mannerScore: oldMannerScore };
    const regeneratedUser = await regenerateActionPoints(tempUserWithOldScore as User);
    
    // Copy the updated AP and timestamp to our main user object.
    user.actionPoints = regeneratedUser.actionPoints;
    user.lastActionPointUpdate = regeneratedUser.lastActionPointUpdate;

    const newMannerScore = getMannerScore(user);
    const oldRank = getMannerRank(oldMannerScore).rank;
    const newRank = getMannerRank(newMannerScore).rank;

    // --- Master Rank Stat Point Adjustment ---
    if (newRank === '마스터' && oldRank !== '마스터' && !user.mannerMasteryApplied) {
        user.mannerMasteryApplied = true;
    } else if (newRank !== '마스터' && oldRank === '마스터' && user.mannerMasteryApplied) {
        user.mannerMasteryApplied = false;
        
        const spentStats = user.spentStatPoints || createDefaultSpentStatPoints();
        const statKeys = Object.keys(spentStats) as types.CoreStat[];
        const levelPoints = (user.strategyLevel - 1) * 2 + (user.playfulLevel - 1) * 2;
        let totalSpent = statKeys.reduce((sum, key) => sum + spentStats[key], 0);

        let pointsToRetrieve = totalSpent - levelPoints;

        if (pointsToRetrieve > 0) {
             while (pointsToRetrieve > 0 && totalSpent > 0) {
                const availableStats = statKeys.filter(key => spentStats[key] > 0);
                if (availableStats.length === 0) break;
                
                const randomStat = availableStats[Math.floor(Math.random() * availableStats.length)];
                
                spentStats[randomStat]--;
                pointsToRetrieve--;
                totalSpent--;
            }
        }
        user.spentStatPoints = spentStats;
    }
};

export const handleMannerAction = async (volatileState: types.VolatileState, action: types.ServerAction & { userId: string }, user: types.User): Promise<types.HandleActionResult> => {
    const { payload } = action;
    const { type: mannerType } = payload as { type: 'manner' | 'unmannerly' }; // Assuming payload has a 'type' field

    const oldMannerScore = user.mannerScore ?? 200;
    let scoreChange = 0;

    if (mannerType === 'manner') {
        scoreChange = 5; // Example: Increase by 5 for mannerly action
    } else if (mannerType === 'unmannerly') {
        scoreChange = -10; // Example: Decrease by 10 for unmannerly action
    }

    user.mannerScore = Math.max(0, (user.mannerScore ?? 200) + scoreChange); // Ensure score doesn't go below 0

    await applyMannerRankChange(user, oldMannerScore);
    await db.updateUser(user);

    return { clientResponse: { updatedUser: user } };
};