import prismaClient from '../prismaClient.js';
import { Guild, GuildMember, GuildMessage, GuildMission, GuildShop, GuildDonation, GuildWar, GuildWarMatch } from '../../types/entities.js';

export const createGuild = async (guildData: {
    name: string;
    leaderId: string;
    description?: string;
    emblem?: string;
    settings?: any;
}): Promise<Guild> => {
    const guild = await prismaClient.guild.create({
        data: {
            name: guildData.name,
            leaderId: guildData.leaderId,
            description: guildData.description,
            emblem: guildData.emblem,
            settings: guildData.settings || {},
            gold: 0,
            level: 1,
            experience: 0,
        },
    });
    
    // Create leader as member
    await prismaClient.guildMember.create({
        data: {
            guildId: guild.id,
            userId: guildData.leaderId,
            role: 'leader',
            contributionTotal: 0,
        },
    });
    
    return {
        id: guild.id,
        name: guild.name,
        leaderId: guild.leaderId,
        description: guild.description || undefined,
        emblem: guild.emblem || undefined,
        settings: guild.settings as any,
        gold: Number(guild.gold),
        level: guild.level,
        experience: Number(guild.experience),
        createdAt: guild.createdAt.getTime(),
        updatedAt: guild.updatedAt.getTime(),
    };
};

export const getGuildById = async (guildId: string): Promise<Guild | null> => {
    const guild = await prismaClient.guild.findUnique({
        where: { id: guildId },
    });
    
    if (!guild) return null;
    
    return {
        id: guild.id,
        name: guild.name,
        leaderId: guild.leaderId,
        description: guild.description || undefined,
        emblem: guild.emblem || undefined,
        settings: guild.settings as any,
        gold: Number(guild.gold),
        level: guild.level,
        experience: Number(guild.experience),
        createdAt: guild.createdAt.getTime(),
        updatedAt: guild.updatedAt.getTime(),
    };
};

export const getGuildByName = async (name: string): Promise<Guild | null> => {
    const guild = await prismaClient.guild.findUnique({
        where: { name },
    });
    
    if (!guild) return null;
    
    return {
        id: guild.id,
        name: guild.name,
        leaderId: guild.leaderId,
        description: guild.description || undefined,
        emblem: guild.emblem || undefined,
        settings: guild.settings as any,
        gold: Number(guild.gold),
        level: guild.level,
        experience: Number(guild.experience),
        createdAt: guild.createdAt.getTime(),
        updatedAt: guild.updatedAt.getTime(),
    };
};

export const updateGuild = async (guildId: string, updates: Partial<{
    name: string;
    description: string;
    emblem: string;
    settings: any;
    gold: number;
    level: number;
    experience: number;
}>): Promise<Guild> => {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.emblem !== undefined) updateData.emblem = updates.emblem;
    if (updates.settings !== undefined) updateData.settings = updates.settings;
    if (updates.gold !== undefined) updateData.gold = updates.gold;
    if (updates.level !== undefined) updateData.level = updates.level;
    if (updates.experience !== undefined) updateData.experience = updates.experience;
    
    const guild = await prismaClient.guild.update({
        where: { id: guildId },
        data: updateData,
    });
    
    return {
        id: guild.id,
        name: guild.name,
        leaderId: guild.leaderId,
        description: guild.description || undefined,
        emblem: guild.emblem || undefined,
        settings: guild.settings as any,
        gold: Number(guild.gold),
        level: guild.level,
        experience: Number(guild.experience),
        createdAt: guild.createdAt.getTime(),
        updatedAt: guild.updatedAt.getTime(),
    };
};

export const addGuildMember = async (guildId: string, userId: string, role: 'leader' | 'officer' | 'member' = 'member'): Promise<GuildMember> => {
    const member = await prismaClient.guildMember.create({
        data: {
            guildId,
            userId,
            role,
            contributionTotal: 0,
        },
    });
    
    return {
        id: member.id,
        guildId: member.guildId,
        userId: member.userId,
        role: member.role as 'leader' | 'officer' | 'member',
        joinDate: member.joinDate.getTime(),
        contributionTotal: Number(member.contributionTotal),
        createdAt: member.createdAt.getTime(),
        updatedAt: member.updatedAt.getTime(),
    };
};

export const removeGuildMember = async (guildId: string, userId: string): Promise<void> => {
    await prismaClient.guildMember.deleteMany({
        where: {
            guildId,
            userId,
        },
    });
};

export const getGuildMembers = async (guildId: string): Promise<GuildMember[]> => {
    const members = await prismaClient.guildMember.findMany({
        where: { guildId },
        orderBy: [
            { role: 'asc' }, // leader first, then officer, then member
            { joinDate: 'asc' },
        ],
    });
    
    return members.map(m => ({
        id: m.id,
        guildId: m.guildId,
        userId: m.userId,
        role: m.role as 'leader' | 'officer' | 'member',
        joinDate: m.joinDate.getTime(),
        contributionTotal: Number(m.contributionTotal),
        createdAt: m.createdAt.getTime(),
        updatedAt: m.updatedAt.getTime(),
    }));
};

export const updateGuildMember = async (memberId: string, updates: Partial<{
    role: string;
    contributionTotal: number;
}>): Promise<GuildMember> => {
    const updateData: any = {};
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.contributionTotal !== undefined) updateData.contributionTotal = updates.contributionTotal;
    
    const member = await prismaClient.guildMember.update({
        where: { id: memberId },
        data: updateData,
    });
    
    return {
        id: member.id,
        guildId: member.guildId,
        userId: member.userId,
        role: member.role as 'leader' | 'officer' | 'member',
        joinDate: member.joinDate.getTime(),
        contributionTotal: Number(member.contributionTotal),
        createdAt: member.createdAt.getTime(),
        updatedAt: member.updatedAt.getTime(),
    };
};

export const createGuildMessage = async (guildId: string, authorId: string, content: string): Promise<GuildMessage> => {
    const message = await prismaClient.guildMessage.create({
        data: {
            guildId,
            authorId,
            content,
        },
    });
    
    return {
        id: message.id,
        guildId: message.guildId,
        authorId: message.authorId,
        content: message.content,
        createdAt: message.createdAt.getTime(),
    };
};

export const getGuildMessages = async (guildId: string, limit: number = 50, before?: number): Promise<GuildMessage[]> => {
    const where: any = { guildId };
    if (before) {
        where.createdAt = { lt: new Date(before) };
    }
    
    const messages = await prismaClient.guildMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
    
    return messages.reverse().map(m => ({
        id: m.id,
        guildId: m.guildId,
        authorId: m.authorId,
        content: m.content,
        createdAt: m.createdAt.getTime(),
    }));
};

export const createGuildMission = async (guildId: string, missionType: string, target: any, resetAt?: number): Promise<GuildMission> => {
    const mission = await prismaClient.guildMission.create({
        data: {
            guildId,
            missionType,
            status: 'active',
            progress: {},
            target,
            resetAt: resetAt ? new Date(resetAt) : null,
        },
    });
    
    return {
        id: mission.id,
        guildId: mission.guildId,
        missionType: mission.missionType,
        status: mission.status as 'active' | 'completed' | 'expired',
        progress: mission.progress as any,
        target: mission.target as any,
        resetAt: mission.resetAt ? mission.resetAt.getTime() : undefined,
        createdAt: mission.createdAt.getTime(),
        updatedAt: mission.updatedAt.getTime(),
    };
};

export const updateGuildMission = async (missionId: string, updates: Partial<{
    status: string;
    progress: any;
    target: any;
    resetAt: number;
}>): Promise<GuildMission> => {
    const updateData: any = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.progress !== undefined) updateData.progress = updates.progress;
    if (updates.target !== undefined) updateData.target = updates.target;
    if (updates.resetAt !== undefined) updateData.resetAt = updates.resetAt ? new Date(updates.resetAt) : null;
    
    const mission = await prismaClient.guildMission.update({
        where: { id: missionId },
        data: updateData,
    });
    
    return {
        id: mission.id,
        guildId: mission.guildId,
        missionType: mission.missionType,
        status: mission.status as 'active' | 'completed' | 'expired',
        progress: mission.progress as any,
        target: mission.target as any,
        resetAt: mission.resetAt ? mission.resetAt.getTime() : undefined,
        createdAt: mission.createdAt.getTime(),
        updatedAt: mission.updatedAt.getTime(),
    };
};

export const getGuildMissions = async (guildId: string): Promise<GuildMission[]> => {
    const missions = await prismaClient.guildMission.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
    });
    
    return missions.map(m => ({
        id: m.id,
        guildId: m.guildId,
        missionType: m.missionType,
        status: m.status as 'active' | 'completed' | 'expired',
        progress: m.progress as any,
        target: m.target as any,
        resetAt: m.resetAt ? m.resetAt.getTime() : undefined,
        createdAt: m.createdAt.getTime(),
        updatedAt: m.updatedAt.getTime(),
    }));
};

export const createGuildShopItem = async (guildId: string, itemTemplateId: string, price: number, stock: number = -1): Promise<GuildShop> => {
    const shopItem = await prismaClient.guildShop.create({
        data: {
            guildId,
            itemTemplateId,
            price,
            stock,
            purchasedBy: [],
        },
    });
    
    return {
        id: shopItem.id,
        guildId: shopItem.guildId,
        itemTemplateId: shopItem.itemTemplateId,
        price: Number(shopItem.price),
        stock: shopItem.stock,
        purchasedBy: (shopItem.purchasedBy as any) || [],
        createdAt: shopItem.createdAt.getTime(),
        updatedAt: shopItem.updatedAt.getTime(),
    };
};

export const purchaseGuildShopItem = async (shopItemId: string, userId: string): Promise<GuildShop> => {
    const shopItem = await prismaClient.guildShop.findUnique({
        where: { id: shopItemId },
    });
    
    if (!shopItem) throw new Error('Shop item not found');
    
    const purchasedBy = (shopItem.purchasedBy as any) || [];
    if (shopItem.stock !== -1 && purchasedBy.length >= shopItem.stock) {
        throw new Error('Item is out of stock');
    }
    
    const updatedPurchasedBy = [...purchasedBy, userId];
    
    const updated = await prismaClient.guildShop.update({
        where: { id: shopItemId },
        data: { purchasedBy: updatedPurchasedBy },
    });
    
    return {
        id: updated.id,
        guildId: updated.guildId,
        itemTemplateId: updated.itemTemplateId,
        price: Number(updated.price),
        stock: updated.stock,
        purchasedBy: updatedPurchasedBy,
        createdAt: updated.createdAt.getTime(),
        updatedAt: updated.updatedAt.getTime(),
    };
};

export const getGuildShopItems = async (guildId: string): Promise<GuildShop[]> => {
    const shopItems = await prismaClient.guildShop.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
    });
    
    return shopItems.map(item => ({
        id: item.id,
        guildId: item.guildId,
        itemTemplateId: item.itemTemplateId,
        price: Number(item.price),
        stock: item.stock,
        purchasedBy: (item.purchasedBy as any) || [],
        createdAt: item.createdAt.getTime(),
        updatedAt: item.updatedAt.getTime(),
    }));
};

export const createGuildDonation = async (guildId: string, userId: string, amount: number, itemId?: string): Promise<GuildDonation> => {
    const donation = await prismaClient.guildDonation.create({
        data: {
            guildId,
            userId,
            amount,
            itemId,
        },
    });
    
    return {
        id: donation.id,
        guildId: donation.guildId,
        userId: donation.userId,
        amount: Number(donation.amount),
        itemId: donation.itemId || undefined,
        createdAt: donation.createdAt.getTime(),
    };
};

export const getGuildDonations = async (guildId: string, limit: number = 50): Promise<GuildDonation[]> => {
    const donations = await prismaClient.guildDonation.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
    
    return donations.map(d => ({
        id: d.id,
        guildId: d.guildId,
        userId: d.userId,
        amount: Number(d.amount),
        itemId: d.itemId || undefined,
        createdAt: d.createdAt.getTime(),
    }));
};

export const createGuildWar = async (guild1Id: string, guild2Id: string): Promise<GuildWar> => {
    const war = await prismaClient.guildWar.create({
        data: {
            guild1Id,
            guild2Id,
            status: 'pending',
        },
    });
    
    return {
        id: war.id,
        guild1Id: war.guild1Id,
        guild2Id: war.guild2Id,
        status: war.status as 'pending' | 'active' | 'completed' | 'cancelled',
        startTime: war.startTime ? war.startTime.getTime() : undefined,
        endTime: war.endTime ? war.endTime.getTime() : undefined,
        result: war.result as any,
        createdAt: war.createdAt.getTime(),
        updatedAt: war.updatedAt.getTime(),
    };
};

export const updateGuildWar = async (warId: string, updates: Partial<{
    status: string;
    startTime: number;
    endTime: number;
    result: any;
}>): Promise<GuildWar> => {
    const updateData: any = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.startTime !== undefined) updateData.startTime = new Date(updates.startTime);
    if (updates.endTime !== undefined) updateData.endTime = new Date(updates.endTime);
    if (updates.result !== undefined) updateData.result = updates.result;
    
    const war = await prismaClient.guildWar.update({
        where: { id: warId },
        data: updateData,
    });
    
    return {
        id: war.id,
        guild1Id: war.guild1Id,
        guild2Id: war.guild2Id,
        status: war.status as 'pending' | 'active' | 'completed' | 'cancelled',
        startTime: war.startTime ? war.startTime.getTime() : undefined,
        endTime: war.endTime ? war.endTime.getTime() : undefined,
        result: war.result as any,
        createdAt: war.createdAt.getTime(),
        updatedAt: war.updatedAt.getTime(),
    };
};

export const getGuildWars = async (guildId: string): Promise<GuildWar[]> => {
    const wars = await prismaClient.guildWar.findMany({
        where: {
            OR: [
                { guild1Id: guildId },
                { guild2Id: guildId },
            ],
        },
        orderBy: { createdAt: 'desc' },
    });
    
    return wars.map(w => ({
        id: w.id,
        guild1Id: w.guild1Id,
        guild2Id: w.guild2Id,
        status: w.status as 'pending' | 'active' | 'completed' | 'cancelled',
        startTime: w.startTime ? w.startTime.getTime() : undefined,
        endTime: w.endTime ? w.endTime.getTime() : undefined,
        result: w.result as any,
        createdAt: w.createdAt.getTime(),
        updatedAt: w.updatedAt.getTime(),
    }));
};

export const createGuildWarMatch = async (warId: string, player1Id: string, player2Id: string, gameId?: string): Promise<GuildWarMatch> => {
    const match = await prismaClient.guildWarMatch.create({
        data: {
            warId,
            player1Id,
            player2Id,
            gameId,
        },
    });
    
    return {
        id: match.id,
        warId: match.warId,
        player1Id: match.player1Id,
        player2Id: match.player2Id,
        result: match.result as any,
        gameId: match.gameId || undefined,
        createdAt: match.createdAt.getTime(),
        updatedAt: match.updatedAt.getTime(),
    };
};

export const updateGuildWarMatch = async (matchId: string, result: { winnerId: string; gameId: string }): Promise<GuildWarMatch> => {
    const match = await prismaClient.guildWarMatch.update({
        where: { id: matchId },
        data: { result, gameId: result.gameId },
    });
    
    return {
        id: match.id,
        warId: match.warId,
        player1Id: match.player1Id,
        player2Id: match.player2Id,
        result: match.result as any,
        gameId: match.gameId || undefined,
        createdAt: match.createdAt.getTime(),
        updatedAt: match.updatedAt.getTime(),
    };
};

export const getGuildWarMatches = async (warId: string): Promise<GuildWarMatch[]> => {
    const matches = await prismaClient.guildWarMatch.findMany({
        where: { warId },
        orderBy: { createdAt: 'asc' },
    });
    
    return matches.map(m => ({
        id: m.id,
        warId: m.warId,
        player1Id: m.player1Id,
        player2Id: m.player2Id,
        result: m.result as any,
        gameId: m.gameId || undefined,
        createdAt: m.createdAt.getTime(),
        updatedAt: m.updatedAt.getTime(),
    }));
};

