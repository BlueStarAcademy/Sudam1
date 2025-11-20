import { randomUUID } from 'crypto';
import * as db from '../db.js';
import { type ServerAction, type User, type VolatileState } from '../../types.js';
import { broadcast, sendToUser } from '../socket.js';
import * as guildRepo from '../prisma/guildRepository.js';
import { containsProfanity } from '../../profanity.js';

type HandleActionResult = {
    clientResponse?: any;
    error?: string;
};

const GUILD_CREATE_COST = 10000; // 골드
const MAX_GUILD_NAME_LENGTH = 20;
const MIN_GUILD_NAME_LENGTH = 2;
const MAX_GUILD_DESCRIPTION_LENGTH = 200;
const MAX_GUILD_MEMBERS = 50;

export const handleGuildAction = async (volatileState: VolatileState, action: ServerAction & { userId: string }, user: User): Promise<HandleActionResult> => {
    const { type, payload } = action;

    switch (type) {
        case 'CREATE_GUILD': {
            const { name, description, emblem } = payload;
            
            // Validation
            if (!name || name.length < MIN_GUILD_NAME_LENGTH || name.length > MAX_GUILD_NAME_LENGTH) {
                return { error: `길드 이름은 ${MIN_GUILD_NAME_LENGTH}자 이상 ${MAX_GUILD_NAME_LENGTH}자 이하여야 합니다.` };
            }
            
            if (description && description.length > MAX_GUILD_DESCRIPTION_LENGTH) {
                return { error: `길드 설명은 ${MAX_GUILD_DESCRIPTION_LENGTH}자 이하여야 합니다.` };
            }
            
            if (containsProfanity(name) || (description && containsProfanity(description))) {
                return { error: '부적절한 단어가 포함되어 있습니다.' };
            }
            
            // Check if user already has a guild
            if (user.guildId) {
                return { error: '이미 길드에 가입되어 있습니다.' };
            }
            
            // Check if user has enough gold
            if (user.gold < GUILD_CREATE_COST) {
                return { error: `길드 생성에는 ${GUILD_CREATE_COST.toLocaleString()} 골드가 필요합니다.` };
            }
            
            // Check if guild name already exists
            const existingGuild = await guildRepo.getGuildByName(name);
            if (existingGuild) {
                return { error: '이미 존재하는 길드 이름입니다.' };
            }
            
            // Create guild
            const guild = await guildRepo.createGuild({
                name,
                leaderId: user.id,
                description,
                emblem,
            });
            
            // Deduct gold
            user.gold -= GUILD_CREATE_COST;
            user.guildId = guild.id;
            await db.updateUser(user);
            
            // Broadcast guild update
            broadcast({ type: 'GUILD_UPDATE', payload: { guild } });
            broadcast({ type: 'USER_UPDATE', payload: { [user.id]: { guildId: guild.id, gold: user.gold } } });
            
            return { clientResponse: { guild } };
        }
        
        case 'JOIN_GUILD': {
            const { guildId } = payload;
            
            // Check if user already has a guild
            if (user.guildId) {
                return { error: '이미 길드에 가입되어 있습니다.' };
            }
            
            // Get guild
            const guild = await guildRepo.getGuildById(guildId);
            if (!guild) {
                return { error: '길드를 찾을 수 없습니다.' };
            }
            
            // Check member count
            const members = await guildRepo.getGuildMembers(guildId);
            if (members.length >= MAX_GUILD_MEMBERS) {
                return { error: '길드 인원이 가득 찼습니다.' };
            }
            
            // Add member
            await guildRepo.addGuildMember(guildId, user.id, 'member');
            
            // Update user
            user.guildId = guildId;
            await db.updateUser(user);
            
            // Broadcast updates
            const updatedMembers = await guildRepo.getGuildMembers(guildId);
            broadcast({ type: 'GUILD_UPDATE', payload: { guild, members: updatedMembers } });
            broadcast({ type: 'USER_UPDATE', payload: { [user.id]: { guildId: guildId } } });
            
            return { clientResponse: { guild, members: updatedMembers } };
        }
        
        case 'LEAVE_GUILD': {
            if (!user.guildId) {
                return { error: '가입한 길드가 없습니다.' };
            }
            
            const guildId = user.guildId;
            const guild = await guildRepo.getGuildById(guildId);
            
            if (!guild) {
                // Guild doesn't exist, just remove from user
                user.guildId = undefined;
                await db.updateUser(user);
                return { clientResponse: { success: true } };
            }
            
            // If user is leader, transfer leadership or disband
            const members = await guildRepo.getGuildMembers(guildId);
            const userMember = members.find(m => m.userId === user.id);
            
            if (userMember?.role === 'leader') {
                // Transfer to first officer, or first member if no officers
                const newLeader = members.find(m => m.role === 'officer') || members.find(m => m.role === 'member' && m.userId !== user.id);
                
                if (newLeader) {
                    await guildRepo.updateGuildMember(newLeader.id, { role: 'leader' });
                    await guildRepo.updateGuild(guildId, { leaderId: newLeader.userId });
                } else {
                    // No other members, guild will be disbanded (handled by cascade delete)
                    // Just remove user's guildId
                }
            }
            
            // Remove member
            await guildRepo.removeGuildMember(guildId, user.id);
            
            // Update user
            user.guildId = undefined;
            await db.updateUser(user);
            
            // Broadcast updates
            const updatedMembers = await guildRepo.getGuildMembers(guildId);
            broadcast({ type: 'GUILD_UPDATE', payload: { guild, members: updatedMembers } });
            broadcast({ type: 'USER_UPDATE', payload: { [user.id]: { guildId: undefined } } });
            
            return { clientResponse: { success: true } };
        }
        
        case 'KICK_GUILD_MEMBER': {
            const { memberId } = payload;
            
            if (!user.guildId) {
                return { error: '가입한 길드가 없습니다.' };
            }
            
            const guild = await guildRepo.getGuildById(user.guildId);
            if (!guild) {
                return { error: '길드를 찾을 수 없습니다.' };
            }
            
            // Check permissions
            const members = await guildRepo.getGuildMembers(user.guildId);
            const userMember = members.find(m => m.userId === user.id);
            if (!userMember || (userMember.role !== 'leader' && userMember.role !== 'officer')) {
                return { error: '멤버를 추방할 권한이 없습니다.' };
            }
            
            const targetMember = members.find(m => m.id === memberId);
            if (!targetMember) {
                return { error: '멤버를 찾을 수 없습니다.' };
            }
            
            // Cannot kick leader
            if (targetMember.role === 'leader') {
                return { error: '길드장은 추방할 수 없습니다.' };
            }
            
            // Officers can only kick members, not other officers
            if (userMember.role === 'officer' && targetMember.role === 'officer') {
                return { error: '부길드장은 다른 부길드장을 추방할 수 없습니다.' };
            }
            
            // Remove member
            await guildRepo.removeGuildMember(user.guildId, targetMember.userId);
            
            // Update kicked user
            const kickedUser = await db.getUser(targetMember.userId);
            if (kickedUser) {
                kickedUser.guildId = undefined;
                await db.updateUser(kickedUser);
            }
            
            // Broadcast updates
            const updatedMembers = await guildRepo.getGuildMembers(user.guildId);
            broadcast({ type: 'GUILD_UPDATE', payload: { guild, members: updatedMembers } });
            if (kickedUser) {
                broadcast({ type: 'USER_UPDATE', payload: { [kickedUser.id]: { guildId: undefined } } });
            }
            
            return { clientResponse: { success: true, members: updatedMembers } };
        }
        
        case 'UPDATE_GUILD_MEMBER_ROLE': {
            const { memberId, role } = payload;
            
            if (!user.guildId) {
                return { error: '가입한 길드가 없습니다.' };
            }
            
            const guild = await guildRepo.getGuildById(user.guildId);
            if (!guild) {
                return { error: '길드를 찾을 수 없습니다.' };
            }
            
            // Only leader can update roles
            if (guild.leaderId !== user.id) {
                return { error: '권한이 없습니다.' };
            }
            
            const members = await guildRepo.getGuildMembers(user.guildId);
            const targetMember = members.find(m => m.id === memberId);
            if (!targetMember) {
                return { error: '멤버를 찾을 수 없습니다.' };
            }
            
            // Update role
            await guildRepo.updateGuildMember(memberId, { role });
            
            // If promoting to leader, update guild leaderId
            if (role === 'leader') {
                await guildRepo.updateGuild(user.guildId, { leaderId: targetMember.userId });
                // Demote current leader to officer
                const currentLeaderMember = members.find(m => m.userId === user.id);
                if (currentLeaderMember) {
                    await guildRepo.updateGuildMember(currentLeaderMember.id, { role: 'officer' });
                }
            }
            
            // Broadcast updates
            const updatedMembers = await guildRepo.getGuildMembers(user.guildId);
            const updatedGuild = await guildRepo.getGuildById(user.guildId);
            if (updatedGuild) {
                broadcast({ type: 'GUILD_UPDATE', payload: { guild: updatedGuild, members: updatedMembers } });
            }
            
            return { clientResponse: { success: true, members: updatedMembers } };
        }
        
        case 'UPDATE_GUILD_SETTINGS': {
            const { settings } = payload;
            
            if (!user.guildId) {
                return { error: '가입한 길드가 없습니다.' };
            }
            
            const guild = await guildRepo.getGuildById(user.guildId);
            if (!guild) {
                return { error: '길드를 찾을 수 없습니다.' };
            }
            
            // Only leader can update settings
            if (guild.leaderId !== user.id) {
                return { error: '권한이 없습니다.' };
            }
            
            // Update settings
            const updatedGuild = await guildRepo.updateGuild(user.guildId, { settings });
            
            // Broadcast update
            broadcast({ type: 'GUILD_UPDATE', payload: { guild: updatedGuild } });
            
            return { clientResponse: { guild: updatedGuild } };
        }
        
        case 'SEND_GUILD_MESSAGE': {
            const { content } = payload;
            
            if (!user.guildId) {
                return { error: '가입한 길드가 없습니다.' };
            }
            
            if (!content || content.trim().length === 0) {
                return { error: '메시지 내용을 입력해주세요.' };
            }
            
            if (containsProfanity(content)) {
                return { error: '부적절한 단어가 포함되어 있습니다.' };
            }
            
            // Create message
            const message = await guildRepo.createGuildMessage(user.guildId, user.id, content.trim());
            
            // Broadcast to guild members
            const members = await guildRepo.getGuildMembers(user.guildId);
            const memberIds = members.map(m => m.userId);
            
            memberIds.forEach(memberId => {
                sendToUser(memberId, {
                    type: 'GUILD_MESSAGE',
                    payload: { message, author: { id: user.id, nickname: user.nickname } },
                });
            });
            
            return { clientResponse: { message } };
        }
        
        case 'GET_GUILD_MESSAGES': {
            const { limit = 50, before } = payload || {};
            
            if (!user.guildId) {
                return { error: '가입한 길드가 없습니다.' };
            }
            
            const messages = await guildRepo.getGuildMessages(user.guildId, limit, before);
            
            return { clientResponse: { messages } };
        }
        
        case 'GET_GUILD_INFO': {
            if (!user.guildId) {
                return { error: '가입한 길드가 없습니다.' };
            }
            
            const guild = await guildRepo.getGuildById(user.guildId);
            if (!guild) {
                return { error: '길드를 찾을 수 없습니다.' };
            }
            
            const members = await guildRepo.getGuildMembers(user.guildId);
            const missions = await guildRepo.getGuildMissions(user.guildId);
            const shopItems = await guildRepo.getGuildShopItems(user.guildId);
            const donations = await guildRepo.getGuildDonations(user.guildId, 20);
            
            return {
                clientResponse: {
                    guild,
                    members,
                    missions,
                    shopItems,
                    donations,
                },
            };
        }
        
        case 'START_GUILD_MISSION': {
            const { missionType, target } = payload;
            
            if (!user.guildId) {
                return { error: '가입한 길드가 없습니다.' };
            }
            
            const guild = await guildRepo.getGuildById(user.guildId);
            if (!guild) {
                return { error: '길드를 찾을 수 없습니다.' };
            }
            
            // Only leader can start missions
            if (guild.leaderId !== user.id) {
                return { error: '권한이 없습니다.' };
            }
            
            // Create mission
            const mission = await guildRepo.createGuildMission(user.guildId, missionType, target);
            
            // Broadcast update
            const members = await guildRepo.getGuildMembers(user.guildId);
            const memberIds = members.map(m => m.userId);
            
            memberIds.forEach(memberId => {
                sendToUser(memberId, {
                    type: 'GUILD_MISSION_UPDATE',
                    payload: { mission },
                });
            });
            
            return { clientResponse: { mission } };
        }
        
        case 'UPDATE_GUILD_MISSION_PROGRESS': {
            const { missionId, progress } = payload;
            
            if (!user.guildId) {
                return { error: '가입한 길드가 없습니다.' };
            }
            
            const mission = await guildRepo.updateGuildMission(missionId, { progress });
            
            // Broadcast update
            const members = await guildRepo.getGuildMembers(user.guildId);
            const memberIds = members.map(m => m.userId);
            
            memberIds.forEach(memberId => {
                sendToUser(memberId, {
                    type: 'GUILD_MISSION_UPDATE',
                    payload: { mission },
                });
            });
            
            return { clientResponse: { mission } };
        }
        
        case 'DONATE_TO_GUILD': {
            const { amount = 0, itemId } = payload;
            
            if (!user.guildId) {
                return { error: '가입한 길드가 없습니다.' };
            }
            
            if (amount <= 0 && !itemId) {
                return { error: '기부할 골드나 아이템을 선택해주세요.' };
            }
            
            if (amount > 0 && user.gold < amount) {
                return { error: '골드가 부족합니다.' };
            }
            
            if (itemId) {
                const item = user.inventory?.find(i => i.id === itemId);
                if (!item) {
                    return { error: '아이템을 찾을 수 없습니다.' };
                }
            }
            
            // Create donation
            const donation = await guildRepo.createGuildDonation(user.guildId, user.id, amount, itemId);
            
            // Update guild gold
            const guild = await guildRepo.getGuildById(user.guildId);
            if (guild && amount > 0) {
                await guildRepo.updateGuild(user.guildId, { gold: guild.gold + amount });
            }
            
            // Deduct from user
            if (amount > 0) {
                user.gold -= amount;
                await db.updateUser(user);
            }
            
            if (itemId) {
                // Remove item from inventory (simplified - should use proper inventory management)
                user.inventory = user.inventory?.filter(i => i.id !== itemId) || [];
                await db.updateUser(user);
            }
            
            // Update member contribution
            const members = await guildRepo.getGuildMembers(user.guildId);
            const userMember = members.find(m => m.userId === user.id);
            if (userMember) {
                const contribution = amount + (itemId ? 100 : 0); // Item donation = 100 contribution
                await guildRepo.updateGuildMember(userMember.id, {
                    contributionTotal: userMember.contributionTotal + contribution,
                });
            }
            
            // Broadcast updates
            const updatedGuild = await guildRepo.getGuildById(user.guildId);
            const updatedMembers = await guildRepo.getGuildMembers(user.guildId);
            if (updatedGuild) {
                broadcast({ type: 'GUILD_UPDATE', payload: { guild: updatedGuild, members: updatedMembers } });
            }
            broadcast({ type: 'USER_UPDATE', payload: { [user.id]: { gold: user.gold, inventory: user.inventory } } });
            
            return { clientResponse: { donation, guild: updatedGuild } };
        }
        
        case 'PURCHASE_GUILD_SHOP_ITEM': {
            const { shopItemId } = payload;
            
            if (!user.guildId) {
                return { error: '가입한 길드가 없습니다.' };
            }
            
            const shopItem = await guildRepo.purchaseGuildShopItem(shopItemId, user.id);
            
            // Get item template and add to user inventory (simplified - should use proper item creation)
            // This is a placeholder - actual implementation should create item from template
            
            return { clientResponse: { shopItem } };
        }
        
        case 'START_GUILD_WAR': {
            const { targetGuildId } = payload;
            
            if (!user.guildId) {
                return { error: '가입한 길드가 없습니다.' };
            }
            
            const guild = await guildRepo.getGuildById(user.guildId);
            if (!guild) {
                return { error: '길드를 찾을 수 없습니다.' };
            }
            
            // Only leader can start wars
            if (guild.leaderId !== user.id) {
                return { error: '권한이 없습니다.' };
            }
            
            const targetGuild = await guildRepo.getGuildById(targetGuildId);
            if (!targetGuild) {
                return { error: '대상 길드를 찾을 수 없습니다.' };
            }
            
            // Create war
            const war = await guildRepo.createGuildWar(user.guildId, targetGuildId);
            
            // Broadcast to both guilds
            const members1 = await guildRepo.getGuildMembers(user.guildId);
            const members2 = await guildRepo.getGuildMembers(targetGuildId);
            const allMemberIds = [...members1.map(m => m.userId), ...members2.map(m => m.userId)];
            
            allMemberIds.forEach(memberId => {
                sendToUser(memberId, {
                    type: 'GUILD_WAR_UPDATE',
                    payload: { war },
                });
            });
            
            return { clientResponse: { war } };
        }
        
        case 'END_GUILD_WAR': {
            const { warId } = payload;
            
            if (!user.guildId) {
                return { error: '가입한 길드가 없습니다.' };
            }
            
            const war = await guildRepo.updateGuildWar(warId, { status: 'completed' });
            
            // Broadcast to both guilds
            const members1 = await guildRepo.getGuildMembers(war.guild1Id);
            const members2 = await guildRepo.getGuildMembers(war.guild2Id);
            const allMemberIds = [...members1.map(m => m.userId), ...members2.map(m => m.userId)];
            
            allMemberIds.forEach(memberId => {
                sendToUser(memberId, {
                    type: 'GUILD_WAR_UPDATE',
                    payload: { war },
                });
            });
            
            return { clientResponse: { war } };
        }
        
        default:
            return { error: `Unknown guild action: ${type}` };
    }
};

