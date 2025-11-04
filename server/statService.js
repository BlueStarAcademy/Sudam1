// FIX: Import missing types from the centralized types file.
import { CoreStat } from '../types/index.js';
import { calculateUserEffects } from './effectService.js';
// This function is moved from the client to the server.
export const calculateTotalStats = (user) => {
    const finalStats = {};
    // 1. Start with base stats and spent points
    const baseWithSpent = {};
    for (const key of Object.values(CoreStat)) {
        baseWithSpent[key] = (user.baseStats?.[key] || 0) + (user.spentStatPoints?.[key] || 0);
    }
    // 2. Get equipment bonuses from effect service
    const effects = calculateUserEffects(user);
    const bonuses = effects.coreStatBonuses;
    // 3. Calculate final stats
    for (const key of Object.values(CoreStat)) {
        const baseValue = baseWithSpent[key];
        const finalValue = Math.floor((baseValue + bonuses[key].flat) * (1 + bonuses[key].percent / 100));
        finalStats[key] = finalValue;
    }
    return finalStats;
};
