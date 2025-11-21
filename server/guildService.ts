

// server/guildService.ts
import { Guild, GuildMemberRole, GuildMission, GuildMissionProgressKey, ChatMessage, Mail, GuildResearchId } from '../types/index.js';
import * as db from './db.js';
import { GUILD_MISSIONS_POOL, GUILD_XP_PER_LEVEL } from '../constants/index.js';
import { randomUUID } from 'crypto';
import { calculateGuildMissionXp } from '../utils/guildUtils.js';

export const checkGuildLevelUp = (guild: Guild): boolean => {
    let leveledUp = false;
    let xpForNextLevel = GUILD_XP_PER_LEVEL(guild.level);
    while (guild.xp >= xpForNextLevel) {
        guild.xp -= xpForNextLevel;
        guild.level++;
        leveledUp = true;
        xpForNextLevel = GUILD_XP_PER_LEVEL(guild.level);
    }
    return leveledUp;
};

export const addContribution = (guild: Guild, userId: string, amount: number) => {
    const member = guild.members.find(m => m.userId === userId);
    if (member) {
        member.contribution = (member.contribution || 0) + amount;
        member.weeklyContribution = (member.weeklyContribution || 0) + amount;
    }
};

// FIX: Added optional guildsToUpdate parameter to prevent race conditions and allow passing the guilds object from the caller.
export const updateGuildMissionProgress = async (guildId: string, missionType: GuildMissionProgressKey, amount: number | string, guildsToUpdate?: Record<string, Guild>) => {
    // FIX: Add parentheses to clarify operator precedence between '??' and '||'.
    const guilds = (guildsToUpdate ?? (await db.getKV<Record<string, Guild>>('guilds'))) || {};
    const guild = guilds[guildId];
    if (!guild || !guild.weeklyMissions) return;

    let missionUpdated = false;

    if (typeof guild.missionProgress[missionType] === 'number') {
        (guild.missionProgress[missionType] as number) += (amount as number);
        missionUpdated = true;
    } else if (Array.isArray(guild.missionProgress[missionType])) {
        // FIX: Cast to any[] to handle different types for 'amount' (string for userId, number for others)
        if (!(guild.missionProgress[missionType] as any[]).includes(amount)) {
            (guild.missionProgress[missionType] as any[]).push(amount);
            missionUpdated = true;
        }
    }

    for (const mission of guild.weeklyMissions) {
        if (mission.progressKey === missionType) {
            if (Array.isArray(guild.missionProgress[missionType])) {
                // FIX: Cast to string[] to resolve type error
                mission.progress = (guild.missionProgress[missionType] as string[]).length;
            } else {
                // FIX: Cast to number to resolve type error
                mission.progress = guild.missionProgress[missionType] as number;
            }
            
            // Check for completion here!
            if (!mission.isCompleted && mission.progress >= mission.target) {
                mission.isCompleted = true;
                missionUpdated = true;
                
                // 미션 완료 시 길드 XP 자동 추가 (보상 받기 전에도)
                const finalXp = calculateGuildMissionXp(mission.guildReward.guildXp, guild.level);
                guild.xp += finalXp;
                checkGuildLevelUp(guild);
                
                // Add a system message to guild chat to notify users to claim their reward
                if (!guild.chatHistory) guild.chatHistory = [];
                const message: ChatMessage = {
                    id: `msg-guild-${randomUUID()}`,
                    user: { id: 'system', nickname: '시스템' },
                    system: true,
                    text: `주간 임무 [${mission.title}]을(를) 달성했습니다! 길드 활동 > 길드 미션 탭에서 보상을 수령하세요.`,
                    timestamp: Date.now(),
                };
                guild.chatHistory.push(message);
                if (guild.chatHistory.length > 100) {
                    guild.chatHistory.shift();
                }
            }
        }
    }
    
    if (missionUpdated && !guildsToUpdate) {
        await db.setKV('guilds', guilds);
    }
};

export const resetWeeklyGuildMissions = (guild: Guild, now: number) => {
    guild.weeklyMissions = GUILD_MISSIONS_POOL.map(m => ({
        ...m,
        id: `quest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        progress: 0,
        isCompleted: false,
        claimedBy: [],
    }));
    guild.missionProgress = {
        checkIns: 0,
        strategicWins: 0,
        playfulWins: 0,
        diamondsSpent: 0,
        equipmentEnhancements: 0,
        materialCrafts: 0,
        equipmentSyntheses: 0,
        championshipClaims: 0,
        towerFloor50Conquerors: [],
        towerFloor100Conquerors: [],
        bossAttempts: 0,
        epicGearAcquisitions: 0,
    };
    guild.lastMissionReset = now;
};

export const checkCompletedResearch = async (guild: Guild): Promise<GuildResearchId | null> => {
    if (guild.researchTask && Date.now() >= guild.researchTask.completionTime) {
        const completedTaskId = guild.researchTask.researchId;
        if (!guild.research) {
            guild.research = {} as any;
        }
        if (!guild.research[completedTaskId]) {
            guild.research[completedTaskId] = { level: 0 };
        }
        guild.research[completedTaskId]!.level += 1;
        guild.researchTask = null;
        
        return completedTaskId;
    }
    return null;
};