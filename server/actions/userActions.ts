import * as db from '../db.js';
// FIX: Import the full namespace to access enums like CoreStat.
import * as types from '../../types.js';
import { AVATAR_POOL, BORDER_POOL, SPECIAL_GAME_MODES, NICKNAME_MAX_LENGTH, NICKNAME_MIN_LENGTH } from '../../constants';
import { containsProfanity } from '../../profanity.js';
import { UserStatus } from '../../types/enums.js';
import { broadcast } from '../socket.js';
import { getSelectiveUserUpdate } from '../utils/userUpdateHelper.js';

type HandleActionResult = {
    clientResponse?: any;
    error?: string;
};

export const handleUserAction = async (volatileState: types.VolatileState, action: types.ServerAction & { userId: string }, user: types.User): Promise<HandleActionResult> => {
    const { type, payload } = action;

    switch (type) {
        case 'UPDATE_AVATAR': {
            const { avatarId } = payload;
            if (AVATAR_POOL.some(a => a.id === avatarId)) {
                user.avatarId = avatarId;
                await db.updateUser(user);
            } else {
                return { error: 'Invalid avatar ID.' };
            }
            // 선택적 필드만 반환 (메시지 크기 최적화)
            const updatedUser = getSelectiveUserUpdate(user, 'UPDATE_AVATAR');
            
            // WebSocket으로 사용자 업데이트 브로드캐스트 (전체 객체는 WebSocket에서만)
            const fullUserForBroadcast = JSON.parse(JSON.stringify(user));
            broadcast({ type: 'USER_UPDATE', payload: { [user.id]: fullUserForBroadcast } });
            
            return { clientResponse: { updatedUser } };
        }
        case 'UPDATE_BORDER': {
            const { borderId } = payload;
            if (BORDER_POOL.some(b => b.id === borderId)) {
                user.borderId = borderId;
                await db.updateUser(user);
            } else {
                return { error: 'Invalid border ID.' };
            }
            // 선택적 필드만 반환 (메시지 크기 최적화)
            const updatedUser = getSelectiveUserUpdate(user, 'UPDATE_BORDER');
            
            // WebSocket으로 사용자 업데이트 브로드캐스트 (전체 객체는 WebSocket에서만)
            const fullUserForBroadcast = JSON.parse(JSON.stringify(user));
            broadcast({ type: 'USER_UPDATE', payload: { [user.id]: fullUserForBroadcast } });
            
            return { clientResponse: { updatedUser } };
        }
        case 'CHANGE_NICKNAME': {
            const { newNickname } = payload;
            const cost = 150;
            if (user.diamonds < cost && !user.isAdmin) return { error: '다이아가 부족합니다.' };
            if (newNickname.trim().length < NICKNAME_MIN_LENGTH || newNickname.trim().length > NICKNAME_MAX_LENGTH) return { error: `닉네임은 ${NICKNAME_MIN_LENGTH}-${NICKNAME_MAX_LENGTH}자여야 합니다.` };
            if (containsProfanity(newNickname)) return { error: "닉네임에 부적절한 단어가 포함되어 있습니다." };

            const allUsers = await db.getAllUsers();
            if (allUsers.some(u => u.nickname.toLowerCase() === newNickname.toLowerCase())) {
                return { error: '이미 사용 중인 닉네임입니다.' };
            }

            if (!user.isAdmin) {
                user.diamonds -= cost;
            }
            user.nickname = newNickname;
            await db.updateUser(user);
            // 선택적 필드만 반환 (메시지 크기 최적화)
            const updatedUser = getSelectiveUserUpdate(user, 'CHANGE_NICKNAME');
            
            // WebSocket으로 사용자 업데이트 브로드캐스트 (전체 객체는 WebSocket에서만)
            const fullUserForBroadcast = JSON.parse(JSON.stringify(user));
            broadcast({ type: 'USER_UPDATE', payload: { [user.id]: fullUserForBroadcast } });
            
            return { clientResponse: { updatedUser } };
        }
        case 'UPDATE_MBTI': {
            const { mbti, isMbtiPublic, isFirstTime } = payload as { mbti: string; isMbtiPublic: boolean; isFirstTime?: boolean };
            if (mbti && (typeof mbti !== 'string' || !/^[IE][NS][TF][JP]$/.test(mbti))) {
                return { error: '유효하지 않은 MBTI 형식입니다.' };
            }
            
            const wasFirstTime = isFirstTime || !user.mbti;
            
            user.mbti = mbti || null;
            user.isMbtiPublic = true; // 무조건 공개
            
            // 첫 설정 시 다이아 100개 보상
            if (wasFirstTime && !user.isAdmin) {
                user.diamonds = (user.diamonds || 0) + 100;
            }
            
            await db.updateUser(user);
            
            // 선택적 필드만 반환 (메시지 크기 최적화)
            const updatedUser = getSelectiveUserUpdate(user, 'UPDATE_MBTI');
            
            // WebSocket으로 사용자 업데이트 브로드캐스트 (전체 객체는 WebSocket에서만)
            const fullUserForBroadcast = JSON.parse(JSON.stringify(user));
            broadcast({ type: 'USER_UPDATE', payload: { [user.id]: fullUserForBroadcast } });
            
            // 첫 설정 시 다이아 100개 획득 아이템 생성
            const mbtiRewardItem = wasFirstTime ? {
                id: `mbti-reward-${Date.now()}`,
                name: '다이아',
                type: 'consumable' as const,
                grade: 'normal' as const,
                image: '/images/icon/Zem.png',
                quantity: 100,
                createdAt: Date.now(),
                isEquipped: false,
                level: 1,
                stars: 0,
            } : null;
            
            return { 
                clientResponse: { 
                    updatedUser,
                    ...(mbtiRewardItem ? { obtainedItemsBulk: [mbtiRewardItem] } : {})
                } 
            };
        }
        case 'RESET_STAT_POINTS': {
            const cost = 500;
            if (user.diamonds < cost && !user.isAdmin) return { error: `다이아가 부족합니다. (필요: ${cost})` };

            if (!user.isAdmin) {
                user.diamonds -= cost;
            }
            for (const key of Object.values(types.CoreStat)) {
                user.spentStatPoints[key] = 0;
            }
            await db.updateUser(user);
            // 선택적 필드만 반환 (메시지 크기 최적화)
            const updatedUser = getSelectiveUserUpdate(user, 'RESET_STAT_POINTS');
            
            // WebSocket으로 사용자 업데이트 브로드캐스트 (전체 객체는 WebSocket에서만)
            const fullUserForBroadcast = JSON.parse(JSON.stringify(user));
            broadcast({ type: 'USER_UPDATE', payload: { [user.id]: fullUserForBroadcast } });
            
            return { clientResponse: { updatedUser } };
        }
        case 'CONFIRM_STAT_ALLOCATION': {
            const { newStatPoints } = payload as { newStatPoints: Record<types.CoreStat, number> };

            const levelPoints = (user.strategyLevel - 1) * 2 + (user.playfulLevel - 1) * 2;
            const bonusPoints = user.bonusStatPoints || 0;
            const totalAvailablePoints = levelPoints + bonusPoints;

            const totalSpent = Object.values(newStatPoints).reduce((sum, points) => sum + points, 0);

            if (totalSpent > totalAvailablePoints) {
                return { error: '사용 가능한 포인트를 초과했습니다.' };
            }

            user.spentStatPoints = newStatPoints;
            await db.updateUser(user);
            // 선택적 필드만 반환 (메시지 크기 최적화)
            const updatedUser = getSelectiveUserUpdate(user, 'CONFIRM_STAT_ALLOCATION');
            
            // WebSocket으로 사용자 업데이트 브로드캐스트 (전체 객체는 WebSocket에서만)
            const fullUserForBroadcast = JSON.parse(JSON.stringify(user));
            broadcast({ type: 'USER_UPDATE', payload: { [user.id]: fullUserForBroadcast } });
            
            return { clientResponse: { updatedUser } };
        }
        case 'UPDATE_REJECTION_SETTINGS': {
            const { rejectedGameModes } = payload as { rejectedGameModes: types.GameMode[] };
            user.rejectedGameModes = rejectedGameModes;

            const allStrategicGameModes = SPECIAL_GAME_MODES.map(m => m.mode);
            const allRejected = allStrategicGameModes.every(mode => rejectedGameModes.includes(mode));

            if (allRejected) {
                if (volatileState.userStatuses[user.id]) {
                    volatileState.userStatuses[user.id].status = UserStatus.Resting;
                }
            }
            await db.updateUser(user);
            // 선택적 필드만 반환 (메시지 크기 최적화)
            const updatedUser = getSelectiveUserUpdate(user, 'UPDATE_REJECTION_SETTINGS');
            
            // WebSocket으로 사용자 업데이트 브로드캐스트 (전체 객체는 WebSocket에서만)
            const fullUserForBroadcast = JSON.parse(JSON.stringify(user));
            broadcast({ type: 'USER_UPDATE', payload: { [user.id]: fullUserForBroadcast } });
            
            return { clientResponse: { updatedUser } };
        }
        case 'SAVE_PRESET': {
            const { preset, index } = payload as { preset: types.EquipmentPreset, index: number };
            if (!user.equipmentPresets) {
                user.equipmentPresets = [];
            }
            user.equipmentPresets[index] = preset;
            await db.updateUser(user);
            // 선택적 필드만 반환 (메시지 크기 최적화)
            const updatedUser = getSelectiveUserUpdate(user, 'SAVE_PRESET');
            
            // WebSocket으로 사용자 업데이트 브로드캐스트 (전체 객체는 WebSocket에서만)
            const fullUserForBroadcast = JSON.parse(JSON.stringify(user));
            broadcast({ type: 'USER_UPDATE', payload: { [user.id]: fullUserForBroadcast } });
            
            return { clientResponse: { updatedUser } };
        }
        case 'APPLY_PRESET': {
            const { presetName, equipment } = payload as { presetName: string, equipment?: types.Equipment };
            
            // equipment가 직접 전달된 경우 (빈 프리셋 처리용)
            let presetToApply: types.EquipmentPreset | null = null;
            if (equipment !== undefined) {
                presetToApply = { name: presetName, equipment };
            } else {
                // 기존 방식: 프리셋 이름으로 찾기
                presetToApply = user.equipmentPresets?.find(p => p.name === presetName) || null;
            }

            if (!presetToApply) {
                // 빈 프리셋인 경우 빈 장비 세트로 설정
                user.equipment = {};
            } else {
                user.equipment = { ...presetToApply.equipment };
            }

            // Unequip items that are no longer in the preset
            user.inventory.forEach(item => {
                if (item.type === 'equipment' && item.isEquipped && !Object.values(user.equipment).includes(item.id)) {
                    item.isEquipped = false;
                }
            });

            // Equip items that are in the preset but not currently equipped
            // 데이터 손실 방지를 위해 인벤토리에 없는 장비도 절대 삭제하지 않음
            for (const slot in user.equipment) {
                const itemId = user.equipment[slot as types.EquipmentSlot];
                const itemInInventory = user.inventory.find(item => item.id === itemId);
                if (itemInInventory) {
                    if (!itemInInventory.isEquipped) {
                        itemInInventory.isEquipped = true;
                    }
                } else {
                    // 인벤토리에 없어도 장비는 보존 (데이터 손실 방지)
                    // 이는 인벤토리 동기화 문제나 버그로 인한 데이터 손실을 방지하기 위함
                    console.error(`[APPLY_PRESET] CRITICAL: User ${user.id} has equipment ${itemId} in slot ${slot} but not in inventory! PRESERVING equipment to prevent data loss. DO NOT DELETE.`);
                    // 장비는 그대로 유지하여 나중에 복구 가능하도록 함
                }
            }

            // 장비 일관성 검증 및 수정
            const { validateAndFixEquipmentConsistency } = await import('./inventoryActions.js');
            validateAndFixEquipmentConsistency(user);

            await db.updateUser(user);
            // 선택적 필드만 반환 (메시지 크기 최적화)
            const updatedUser = getSelectiveUserUpdate(user, 'APPLY_PRESET');
            
            // WebSocket으로 사용자 업데이트 브로드캐스트 (전체 객체는 WebSocket에서만)
            const fullUserForBroadcast = JSON.parse(JSON.stringify(user));
            broadcast({ type: 'USER_UPDATE', payload: { [user.id]: fullUserForBroadcast } });
            
            return { clientResponse: { updatedUser } };
        }
        default:
            return { error: 'Unknown user action.' };
    }
};