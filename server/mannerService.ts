

import { User } from '../types/index.js';
import * as types from '../types/index.js';
import * as db from './db.js';
import { regenerateActionPoints } from './effectService.js';

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

const RANK_COLORS: Record<string, string> = {
    '최악': 'text-red-700',
    '매우 나쁨': 'text-red-500',
    '나쁨': 'text-orange-400',
    '주의': 'text-yellow-400',
    '보통': 'text-gray-300',
    '좋음': 'text-green-400',
    '매우 좋음': 'text-teal-400',
    '품격': 'text-cyan-400',
    '프로': 'text-blue-400',
    '마스터': 'text-purple-400',
};

export const getMannerRank = (score: number): { rank: string, color: string } => {
    const rank = [...MANNER_RANKS].reverse().find(tier => score >= tier.min) ?? MANNER_RANKS[0];
    return { rank: rank.name, color: RANK_COLORS[rank.name] ?? 'text-gray-300' };
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


export const applyMannerRankChange = async (user: types.User, oldMannerScore: number): Promise<void> => {
    // Regenerate points with the OLD interval to "cash out" any earned progress.
    // This correctly updates the timer before the new, potentially faster, interval takes effect.
    const tempUserWithOldScore = { ...user, mannerScore: oldMannerScore };
    const regeneratedUser = await regenerateActionPoints(tempUserWithOldScore as User);
    
    // Copy the updated AP and timestamp to our main user object.
    user.actionPoints = regeneratedUser.actionPoints;
    user.lastActionPointUpdate = regeneratedUser.lastActionPointUpdate;

    const newMannerScore = getMannerScore(user);
    const newRank = getMannerRank(newMannerScore).rank;
    user.mannerMasteryApplied = newRank === '마스터';

    // Recalculate with the NEW manner score so that higher-tier 보너스/페널티가 즉시 반영되도록 함
    const refreshedUser = await regenerateActionPoints(user as User);
    user.actionPoints = refreshedUser.actionPoints;
    user.lastActionPointUpdate = refreshedUser.lastActionPointUpdate;
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