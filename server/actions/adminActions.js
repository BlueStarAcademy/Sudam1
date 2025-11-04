import { randomUUID } from 'crypto';
import * as db from '../db.js';
import { UserStatus } from '../../types.js';
import * as types from '../../types.js';
import { defaultStats, createDefaultSpentStatPoints, createDefaultUser } from '../initialData.js';
import * as summaryService from '../summaryService.js';
import { createItemFromTemplate } from '../shop.js';
import { EQUIPMENT_POOL, CONSUMABLE_ITEMS, MATERIAL_ITEMS } from '../../constants.js';
import * as mannerService from '../mannerService.js';
import { containsProfanity } from '../../profanity.js';
const createAdminLog = async (admin, action, target, backupData) => {
    const log = {
        id: `log-${randomUUID()}`,
        timestamp: Date.now(),
        adminId: admin.id,
        adminNickname: admin.nickname,
        targetUserId: target.id,
        targetNickname: target.nickname,
        action: action,
        backupData: backupData
    };
    const logs = await db.getKV('adminLogs') || [];
    logs.unshift(log);
    if (logs.length > 200)
        logs.length = 200;
    await db.setKV('adminLogs', logs);
};
export const handleAdminAction = async (volatileState, action, user) => {
    if (!user.isAdmin) {
        return { error: 'Permission denied.' };
    }
    const { type, payload } = action;
    switch (type) {
        case 'ADMIN_APPLY_SANCTION': {
            const { targetUserId, sanctionType, durationMinutes } = payload;
            const targetUser = await db.getUser(targetUserId);
            if (!targetUser)
                return { error: '대상 사용자를 찾을 수 없습니다.' };
            const now = Date.now();
            const banUntil = now + durationMinutes * 60 * 1000;
            if (sanctionType === 'chat') {
                targetUser.chatBanUntil = banUntil;
            }
            else if (sanctionType === 'connection') {
                targetUser.connectionBanUntil = banUntil;
                // Also log them out
                delete volatileState.userConnections[targetUserId];
                delete volatileState.userStatuses[targetUserId];
            }
            await db.updateUser(targetUser);
            await createAdminLog(user, 'apply_sanction', targetUser, { sanctionType, durationMinutes });
            return {};
        }
        case 'ADMIN_LIFT_SANCTION': {
            const { targetUserId, sanctionType } = payload;
            const targetUser = await db.getUser(targetUserId);
            if (!targetUser)
                return { error: '대상 사용자를 찾을 수 없습니다.' };
            if (sanctionType === 'chat') {
                targetUser.chatBanUntil = undefined;
            }
            else if (sanctionType === 'connection') {
                targetUser.connectionBanUntil = undefined;
            }
            await db.updateUser(targetUser);
            await createAdminLog(user, 'lift_sanction', targetUser, { sanctionType });
            return {};
        }
        case 'ADMIN_RESET_USER_DATA': {
            const { targetUserId, resetType } = payload;
            const targetUser = await db.getUser(targetUserId);
            if (!targetUser)
                return { error: '대상 사용자를 찾을 수 없습니다.' };
            const backupData = JSON.parse(JSON.stringify(targetUser));
            if (resetType === 'full') {
                targetUser.strategyLevel = 1;
                targetUser.strategyXp = 0;
                targetUser.playfulLevel = 1;
                targetUser.playfulXp = 0;
                targetUser.spentStatPoints = createDefaultSpentStatPoints();
            }
            targetUser.stats = JSON.parse(JSON.stringify(defaultStats));
            await db.updateUser(targetUser);
            await createAdminLog(user, resetType === 'full' ? 'reset_full' : 'reset_stats', targetUser, backupData);
            return {};
        }
        case 'ADMIN_DELETE_USER': {
            const { targetUserId } = payload;
            const targetUser = await db.getUser(targetUserId);
            if (!targetUser)
                return { error: '대상 사용자를 찾을 수 없습니다.' };
            if (targetUser.isAdmin)
                return { error: '관리자 계정은 삭제할 수 없습니다.' };
            const backupData = JSON.parse(JSON.stringify(targetUser));
            await db.deleteUser(targetUserId);
            delete volatileState.userConnections[targetUserId];
            delete volatileState.userStatuses[targetUserId];
            await createAdminLog(user, 'delete_user', targetUser, backupData);
            return {};
        }
        case 'ADMIN_CREATE_USER': {
            const { username, password, nickname } = payload;
            if (!username || !password || !nickname) {
                return { error: '모든 필드를 입력해야 합니다.' };
            }
            const existingByUsername = await db.getUserCredentials(username);
            if (existingByUsername)
                return { error: '이미 사용 중인 아이디입니다.' };
            const allUsers = await db.getAllUsers();
            if (allUsers.some(u => u.nickname.toLowerCase() === nickname.toLowerCase())) {
                return { error: '이미 사용 중인 닉네임입니다.' };
            }
            const newUser = createDefaultUser(`user-${randomUUID()}`, username, nickname, false);
            await db.createUser(newUser);
            await db.createUserCredentials(username, password, newUser.id);
            return {};
        }
        case 'ADMIN_FORCE_LOGOUT': {
            const { targetUserId } = payload;
            const targetUser = await db.getUser(targetUserId);
            if (!targetUser)
                return { error: '대상 사용자를 찾을 수 없습니다.' };
            const backupData = { status: volatileState.userStatuses[targetUserId] };
            delete volatileState.userConnections[targetUserId];
            delete volatileState.userStatuses[targetUserId];
            await createAdminLog(user, 'force_logout', targetUser, backupData);
            return {};
        }
        case 'ADMIN_SEND_MAIL': {
            const { targetSpecifier, title, message, expiresInDays, attachments } = payload;
            let targetUsers = [];
            if (targetSpecifier === 'all') {
                targetUsers = await db.getAllUsers();
            }
            else {
                const foundUser = (await db.getAllUsers()).find(u => u.nickname === targetSpecifier || u.username === targetSpecifier);
                if (foundUser)
                    targetUsers.push(foundUser);
            }
            if (targetUsers.length === 0)
                return { error: '메일을 보낼 사용자를 찾을 수 없습니다.' };
            for (const target of targetUsers) {
                const userAttachments = {
                    gold: attachments.gold,
                    diamonds: attachments.diamonds,
                    actionPoints: attachments.actionPoints,
                    items: []
                };
                if (attachments.items && attachments.items.length > 0) {
                    for (const attachedItem of attachments.items) {
                        const { name, quantity, type } = attachedItem;
                        if (type === 'equipment') {
                            for (let i = 0; i < quantity; i++) {
                                const template = EQUIPMENT_POOL.find(t => t.name === name);
                                if (template) {
                                    userAttachments.items.push(createItemFromTemplate(template));
                                }
                            }
                        }
                        else { // Stackable items (consumable or material)
                            const template = [...CONSUMABLE_ITEMS, ...Object.values(MATERIAL_ITEMS)].find(t => t.name === name);
                            if (template) {
                                userAttachments.items.push({
                                    ...template,
                                    id: `item-${randomUUID()}`,
                                    createdAt: Date.now(),
                                    isEquipped: false,
                                    level: 1,
                                    stars: 0,
                                    quantity: quantity,
                                });
                            }
                        }
                    }
                }
                const newMail = {
                    id: `mail-${randomUUID()}`,
                    from: user.nickname,
                    title, message,
                    attachments: userAttachments,
                    receivedAt: Date.now(),
                    expiresAt: expiresInDays > 0 ? Date.now() + expiresInDays * 24 * 60 * 60 * 1000 : undefined,
                    isRead: false,
                    attachmentsClaimed: false
                };
                target.mail.unshift(newMail);
                await db.updateUser(target);
            }
            await createAdminLog(user, 'send_mail', { id: targetSpecifier, nickname: targetSpecifier }, { mailTitle: title });
            return {};
        }
        case 'ADMIN_REORDER_ANNOUNCEMENTS': {
            await db.setKV('announcements', payload.announcements);
            return {};
        }
        case 'ADMIN_ADD_ANNOUNCEMENT': {
            const announcements = await db.getKV('announcements') || [];
            const newAnnouncement = { id: `ann-${randomUUID()}`, message: payload.message };
            announcements.push(newAnnouncement);
            await db.setKV('announcements', announcements);
            return {};
        }
        case 'ADMIN_REMOVE_ANNOUNCEMENT': {
            const announcements = await db.getKV('announcements') || [];
            const updatedAnnouncements = announcements.filter(a => a.id !== payload.id);
            await db.setKV('announcements', updatedAnnouncements);
            return {};
        }
        case 'ADMIN_SET_ANNOUNCEMENT_INTERVAL': {
            await db.setKV('announcementInterval', payload.interval);
            return {};
        }
        case 'ADMIN_SET_OVERRIDE_ANNOUNCEMENT': {
            const override = { message: payload.message, modes: 'all' };
            await db.setKV('globalOverrideAnnouncement', override);
            return {};
        }
        case 'ADMIN_CLEAR_OVERRIDE_ANNOUNCEMENT': {
            await db.setKV('globalOverrideAnnouncement', null);
            return {};
        }
        case 'ADMIN_TOGGLE_GAME_MODE': {
            const { mode, isAvailable } = payload;
            const availability = await db.getKV('gameModeAvailability') || {};
            availability[mode] = isAvailable;
            await db.setKV('gameModeAvailability', availability);
            return {};
        }
        case 'ADMIN_SET_GAME_DESCRIPTION': {
            const { gameId, description } = payload;
            const game = await db.getLiveGame(gameId);
            if (!game)
                return { error: 'Game not found.' };
            game.description = description;
            await db.saveGame(game);
            await createAdminLog(user, 'set_game_description', game.player1, { mailTitle: `Game ${game.id}` });
            return {};
        }
        case 'ADMIN_FORCE_DELETE_GAME': {
            const { gameId } = payload;
            const game = await db.getLiveGame(gameId);
            if (!game)
                return { error: 'Game not found.' };
            const backupData = JSON.parse(JSON.stringify(game));
            game.gameStatus = 'no_contest';
            game.winReason = 'disconnect';
            if (volatileState.userStatuses[game.player1.id]) {
                volatileState.userStatuses[game.player1.id].status = UserStatus.Waiting;
                volatileState.userStatuses[game.player1.id].mode = game.mode;
            }
            if (volatileState.userStatuses[game.player2.id]) {
                volatileState.userStatuses[game.player2.id].status = UserStatus.Waiting;
                volatileState.userStatuses[game.player2.id].mode = game.mode;
            }
            await createAdminLog(user, 'force_delete_game', game.player1, backupData);
            return {};
        }
        case 'ADMIN_FORCE_WIN': {
            const { gameId, winnerId } = payload;
            const game = await db.getLiveGame(gameId);
            if (!game)
                return { error: 'Game not found.' };
            if (game.gameStatus === 'ended' || game.gameStatus === 'no_contest') {
                return { error: 'Game has already ended.' };
            }
            const winnerEnum = game.blackPlayerId === winnerId ? types.Player.Black : types.Player.White;
            const winnerUser = game.player1.id === winnerId ? game.player1 : game.player2;
            await summaryService.endGame(game, winnerEnum, 'resign'); // Use 'resign' as the reason for 기권승
            // Clean up statuses for both players
            if (volatileState.userStatuses[game.player1.id]) {
                volatileState.userStatuses[game.player1.id].status = UserStatus.Waiting;
                volatileState.userStatuses[game.player1.id].mode = game.mode;
            }
            if (volatileState.userStatuses[game.player2.id]) {
                volatileState.userStatuses[game.player2.id].status = UserStatus.Waiting;
                volatileState.userStatuses[game.player2.id].mode = game.mode;
            }
            await createAdminLog(user, 'force_win', winnerUser, { gameId, winnerId });
            return {};
        }
        case 'ADMIN_UPDATE_USER_DETAILS': {
            const { targetUserId, updatedDetails } = payload;
            const targetUser = await db.getUser(targetUserId);
            if (!targetUser)
                return { error: '대상 사용자를 찾을 수 없습니다.' };
            if (user.id === targetUserId && targetUser.isAdmin && !updatedDetails.isAdmin) {
                return { error: '자신의 관리자 권한을 해제할 수 없습니다.' };
            }
            const backupData = JSON.parse(JSON.stringify(targetUser));
            // NICKNAME CHANGE VALIDATION
            if (updatedDetails.nickname && updatedDetails.nickname !== targetUser.nickname) {
                const newNickname = updatedDetails.nickname.trim();
                if (newNickname.length < 2 || newNickname.length > 12) {
                    return { error: '닉네임은 2-12자여야 합니다.' };
                }
                if (containsProfanity(newNickname)) {
                    return { error: '닉네임에 부적절한 단어가 포함되어 있습니다.' };
                }
                const allUsers = await db.getAllUsers();
                if (allUsers.some(u => u.id !== targetUserId && u.nickname.toLowerCase() === newNickname.toLowerCase())) {
                    return { error: '이미 사용 중인 닉네임입니다.' };
                }
                // If all checks pass, update the nickname
                targetUser.nickname = newNickname;
            }
            const oldMannerScore = targetUser.mannerScore;
            targetUser.isAdmin = !!updatedDetails.isAdmin;
            targetUser.strategyLevel = Number(updatedDetails.strategyLevel) || 1;
            targetUser.strategyXp = Number(updatedDetails.strategyXp) || 0;
            targetUser.playfulLevel = Number(updatedDetails.playfulLevel) || 1;
            targetUser.playfulXp = Number(updatedDetails.playfulXp) || 0;
            targetUser.gold = Number(updatedDetails.gold) || 0;
            targetUser.diamonds = Number(updatedDetails.diamonds) || 0;
            targetUser.mannerScore = Number(updatedDetails.mannerScore) || 200;
            if (updatedDetails.quests) {
                targetUser.quests = updatedDetails.quests;
            }
            if (updatedDetails.stats) {
                for (const mode in updatedDetails.stats) {
                    const modeKey = mode;
                    if (targetUser.stats && targetUser.stats[modeKey] && updatedDetails.stats[modeKey]) {
                        targetUser.stats[modeKey].rankingScore = Number(updatedDetails.stats[modeKey].rankingScore) || 1200;
                    }
                }
            }
            await mannerService.applyMannerRankChange(targetUser, oldMannerScore);
            await db.updateUser(targetUser);
            await createAdminLog(user, 'update_user_details', targetUser, backupData);
            return {};
        }
        default:
            return { error: 'Unknown admin action type.' };
    }
};
