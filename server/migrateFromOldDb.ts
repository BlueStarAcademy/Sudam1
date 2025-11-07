import { Database } from 'sqlite';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { User, CoreStat, LeagueTier } from '../types.ts';
import { createDefaultBaseStats, createDefaultSpentStatPoints, createDefaultQuests } from './initialData.ts';

// OLD_DB_PATH: 기존 데이터베이스 파일 경로 (백업 파일이 있다면 경로를 변경하세요)
// 예: const OLD_DB_PATH = path.resolve('database_backup.sqlite');
const OLD_DB_PATH = process.env.OLD_DB_PATH ? path.resolve(process.env.OLD_DB_PATH) : path.resolve('database.sqlite');
const NEW_DB_PATH = path.resolve('database.sqlite');

interface OldUserRow {
    id: string;
    username: string;
    nickname: string;
    isAdmin: boolean;
    strategyLevel: number;
    strategyXp: number;
    playfulLevel: number;
    playfulXp: number;
    gold: number;
    diamonds: number;
    inventory: string;
    equipment: string;
    stats: string;
    [key: string]: any;
}

const migrateFromOldDatabase = async () => {
    console.log('[Migration] Starting migration from old database...');
    
    // 기존 데이터베이스 연결
    const oldDb = await open({
        filename: OLD_DB_PATH,
        driver: sqlite3.Database
    });
    
    console.log('[Migration] Connected to old database');
    
    // 새 데이터베이스 연결 (현재 사용 중인 데이터베이스)
    const newDb = await open({
        filename: NEW_DB_PATH,
        driver: sqlite3.Database
    });
    
    console.log('[Migration] Connected to new database');
    
    try {
        // 기존 데이터베이스에서 모든 사용자 가져오기
        const oldUsersResult = await oldDb.all<OldUserRow>('SELECT * FROM users');
        const oldUsers: OldUserRow[] = Array.isArray(oldUsersResult) ? oldUsersResult : [];
        console.log(`[Migration] Found ${oldUsers.length} users in old database`);
        
        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        for (const oldUser of oldUsers) {
            try {
                // 새 데이터베이스에 해당 사용자가 이미 존재하는지 확인
                const existingUser = await newDb.get('SELECT id FROM users WHERE id = ? OR username = ?', [oldUser.id, oldUser.username]);
                
                if (existingUser) {
                    console.log(`[Migration] User ${oldUser.username} (${oldUser.id}) already exists in new database, updating...`);
                    
                    // 기존 데이터베이스에서 현재 장비 정보 확인 (장비가 비어있지 않은 경우에만 업데이트)
                    let equipmentToUpdate: string | null = oldUser.equipment || null;
                    if (equipmentToUpdate) {
                        try {
                            // JSON 유효성 검사
                            const parsed = JSON.parse(equipmentToUpdate);
                            // 빈 객체가 아닌 경우에만 업데이트
                            if (Object.keys(parsed).length === 0) {
                                equipmentToUpdate = null;
                                console.log(`[Migration] User ${oldUser.username} has empty equipment, skipping equipment update`);
                            }
                        } catch (e) {
                            console.warn(`[Migration] User ${oldUser.username} has invalid equipment JSON, skipping:`, e);
                            equipmentToUpdate = null;
                        }
                    }
                    
                    // 기존 사용자의 데이터 업데이트 (인벤토리, 장비, 재화 등)
                    const updateFields: string[] = [];
                    const updateValues: any[] = [];
                    
                    // 인벤토리 업데이트
                    if (oldUser.inventory) {
                        try {
                            const parsed = JSON.parse(oldUser.inventory);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                updateFields.push('inventory = ?');
                                updateValues.push(oldUser.inventory);
                                console.log(`[Migration] User ${oldUser.username}: Found ${parsed.length} inventory items`);
                            }
                        } catch (e) {
                            console.warn(`[Migration] User ${oldUser.username} has invalid inventory JSON:`, e);
                        }
                    }
                    
                    // 장비 업데이트 (유효한 장비 데이터가 있는 경우에만)
                    if (equipmentToUpdate) {
                        updateFields.push('equipment = ?');
                        updateValues.push(equipmentToUpdate);
                        console.log(`[Migration] User ${oldUser.username}: Updating equipment`);
                    }
                    
                    // 재화 업데이트
                    if (oldUser.gold !== undefined && oldUser.gold !== null) {
                        updateFields.push('gold = ?');
                        updateValues.push(oldUser.gold);
                    }
                    
                    if (oldUser.diamonds !== undefined && oldUser.diamonds !== null) {
                        updateFields.push('diamonds = ?');
                        updateValues.push(oldUser.diamonds);
                    }
                    
                    // 레벨 및 경험치 업데이트
                    if (oldUser.strategyLevel !== undefined && oldUser.strategyLevel !== null) {
                        updateFields.push('strategyLevel = ?');
                        updateValues.push(oldUser.strategyLevel);
                    }
                    
                    if (oldUser.strategyXp !== undefined && oldUser.strategyXp !== null) {
                        updateFields.push('strategyXp = ?');
                        updateValues.push(oldUser.strategyXp);
                    }
                    
                    if (oldUser.playfulLevel !== undefined && oldUser.playfulLevel !== null) {
                        updateFields.push('playfulLevel = ?');
                        updateValues.push(oldUser.playfulLevel);
                    }
                    
                    if (oldUser.playfulXp !== undefined && oldUser.playfulXp !== null) {
                        updateFields.push('playfulXp = ?');
                        updateValues.push(oldUser.playfulXp);
                    }
                    
                    // 스탯 업데이트
                    if (oldUser.stats) {
                        try {
                            const parsed = JSON.parse(oldUser.stats);
                            if (Object.keys(parsed).length > 0) {
                                updateFields.push('stats = ?');
                                updateValues.push(oldUser.stats);
                            }
                        } catch (e) {
                            console.warn(`[Migration] User ${oldUser.username} has invalid stats JSON:`, e);
                        }
                    }
                    
                    // 업데이트할 필드가 있으면 실행
                    if (updateFields.length > 0) {
                        updateValues.push(oldUser.id);
                        const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
                        await newDb.run(updateQuery, updateValues);
                        console.log(`[Migration] Updated user ${oldUser.username} (${oldUser.id}) - Fields: ${updateFields.length}`);
                        migratedCount++;
                    } else {
                        console.log(`[Migration] No fields to update for user ${oldUser.username}`);
                        skippedCount++;
                    }
                } else {
                    // 새 사용자로 추가
                    console.log(`[Migration] Adding new user ${oldUser.username} (${oldUser.id})...`);
                    
                    // 필수 필드 확인 및 기본값 설정
                    const newUser: Partial<User> = {
                        id: oldUser.id,
                        username: oldUser.username || `user_${oldUser.id}`,
                        nickname: oldUser.nickname || oldUser.username || `user_${oldUser.id}`,
                        isAdmin: oldUser.isAdmin || false,
                        strategyLevel: oldUser.strategyLevel || 1,
                        strategyXp: oldUser.strategyXp || 0,
                        playfulLevel: oldUser.playfulLevel || 1,
                        playfulXp: oldUser.playfulXp || 0,
                        gold: oldUser.gold || 0,
                        diamonds: oldUser.diamonds || 0,
                        inventory: oldUser.inventory ? JSON.parse(oldUser.inventory) : [],
                        equipment: oldUser.equipment ? JSON.parse(oldUser.equipment) : {},
                        stats: oldUser.stats ? JSON.parse(oldUser.stats) : {},
                        inventorySlots: { equipment: 30, consumable: 30, material: 30 },
                        actionPoints: { current: 100, max: 100 },
                        lastActionPointUpdate: Date.now(),
                        mannerScore: 1000,
                        mail: [],
                        quests: createDefaultQuests(),
                        chatBanUntil: null,
                        connectionBanUntil: null,
                        avatarId: 'default',
                        borderId: 'default',
                        previousSeasonTier: null,
                        seasonHistory: {},
                        baseStats: createDefaultBaseStats(),
                        spentStatPoints: createDefaultSpentStatPoints(),
                        actionPointPurchasesToday: 0,
                        lastActionPointPurchaseDate: undefined,
                        dailyShopPurchases: {},
                        tournamentScore: 0,
                        league: LeagueTier.Sprout,
                        mannerMasteryApplied: false,
                        pendingPenaltyNotification: null,
                        lastNeighborhoodPlayedDate: null,
                        dailyNeighborhoodWins: 0,
                        neighborhoodRewardClaimed: false,
                        lastNeighborhoodTournament: null,
                        lastNationalPlayedDate: null,
                        dailyNationalWins: 0,
                        nationalRewardClaimed: false,
                        lastNationalTournament: null,
                        lastWorldPlayedDate: null,
                        dailyWorldWins: 0,
                        worldRewardClaimed: false,
                        lastWorldTournament: null,
                        weeklyCompetitors: [],
                        lastWeeklyCompetitorsUpdate: undefined,
                        lastLeagueUpdate: undefined,
                        ownedBorders: [],
                        equipmentPresets: [],
                        mbti: null,
                        isMbtiPublic: false,
                        monthlyGoldBuffExpiresAt: null,
                        singlePlayerProgress: 0,
                        bonusStatPoints: 0,
                        blacksmithLevel: 1,
                        blacksmithXp: 0
                    };
                    
                    // 새 사용자 삽입
                    const userRepository = await import('./repositories/userRepository.ts');
                    await userRepository.createUser(newDb, newUser as User);
                    console.log(`[Migration] Added new user ${oldUser.username} (${oldUser.id})`);
                    migratedCount++;
                }
            } catch (error: any) {
                console.error(`[Migration] Error migrating user ${oldUser.username} (${oldUser.id}):`, error.message);
                errorCount++;
            }
        }
        
        console.log(`[Migration] Migration complete!`);
        console.log(`[Migration] - Migrated/Updated: ${migratedCount}`);
        console.log(`[Migration] - Skipped: ${skippedCount}`);
        console.log(`[Migration] - Errors: ${errorCount}`);
        
    } catch (error) {
        console.error('[Migration] Fatal error during migration:', error);
        throw error;
    } finally {
        await oldDb.close();
        await newDb.close();
        console.log('[Migration] Database connections closed');
    }
};

// 스크립트가 직접 실행될 때 마이그레이션 수행
migrateFromOldDatabase()
    .then(() => {
        console.log('[Migration] Migration script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Migration] Migration script failed:', error);
        process.exit(1);
    });

export { migrateFromOldDatabase };

