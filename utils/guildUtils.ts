export const calculateGuildMissionXp = (baseXp: number, guildLevel: number): number => {
    const bonusPerLevel = 0.01; // 1% per level above 1.
    const bonus = Math.max(0, guildLevel - 1) * bonusPerLevel;
    return Math.floor(baseXp * (1 + bonus));
};
