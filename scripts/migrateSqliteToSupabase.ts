import 'dotenv/config';
import path from 'path';
import { randomUUID } from 'crypto';
import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { PrismaClient } from '../generated/prisma/client.ts';
import type { LiveGameSession, GameStatus } from '../types.js';

type SQLiteUserRow = Record<string, any>;

type CredentialRow = {
  username: string;
  passwordHash: string;
  userId: string;
};

type InventoryItemRow = {
  id?: string;
  name?: string;
  description?: string;
  type?: string;
  slot?: string | null;
  image?: string;
  grade?: string;
  quantity?: number;
  createdAt?: number;
  isEquipped?: boolean;
  stars?: number;
  level?: number;
  enhancementLvl?: number;
  enhancementLevel?: number;
  metadata?: Record<string, unknown>;
  [key: string]: any;
};

type MailRow = {
  id?: string;
  title?: string;
  message?: string;
  from?: string;
  attachments?: unknown;
  expiresAt?: number | null;
  receivedAt?: number | null;
  isRead?: boolean;
  attachmentsClaimed?: boolean;
  [key: string]: any;
};

type QuestRow = {
  id: string;
  title?: string;
  description?: string;
  progress?: number;
  target?: number;
  isClaimed?: boolean;
  [key: string]: any;
};

type MissionRow = {
  id?: string;
  level?: number;
  lastCollectionTime?: number;
  accumulatedAmount?: number;
  accumulatedCollection?: number;
  isStarted?: boolean;
  [key: string]: any;
};

type LiveGameRow = Record<string, any>;

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const argv = new Set(process.argv.slice(2));
const DRY_RUN = argv.has('--dry-run');

const toBigInt = (value: number | string | null | undefined): bigint =>
  BigInt(typeof value === 'string' ? value : value ?? 0);

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return false;
};

const toDate = (value: unknown): Date => {
  if (typeof value === 'number' && value > 0) return new Date(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && parsed > 0) return new Date(parsed);
    const iso = Date.parse(value);
    if (!Number.isNaN(iso)) return new Date(iso);
  }
  return new Date();
};

const toDateOrNull = (value: unknown): Date | null => {
  if (typeof value === 'number' && value > 0) return new Date(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && parsed > 0) return new Date(parsed);
    const iso = Date.parse(value);
    if (!Number.isNaN(iso)) return new Date(iso);
  }
  return null;
};

const safeJsonParse = <T>(value: unknown, fallback: T): T => {
  if (value == null) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value !== 'string') return fallback;
  if (value.trim() === '') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const flattenQuestBuckets = (questLog: any): QuestRow[] => {
  if (!questLog || typeof questLog !== 'object') return [];
  const buckets: QuestRow[] = [];
  const categories = ['daily', 'weekly', 'monthly'];
  for (const key of categories) {
    const bucket = questLog[key];
    if (!bucket || typeof bucket !== 'object') continue;
    const quests = Array.isArray(bucket.quests) ? bucket.quests : [];
    for (const quest of quests) {
      if (!quest?.id) continue;
      buckets.push(quest as QuestRow);
    }
  }
  return buckets;
};

const extractMissionEntries = (missions: any): Array<{ missionId: string; payload: MissionRow }> => {
  if (!missions || typeof missions !== 'object') return [];
  return Object.entries(missions).map(([missionId, payload]) => ({
    missionId,
    payload: payload as MissionRow,
  }));
};

const maybeParseJson = (value: unknown) => {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const transformLiveGameRow = (row: LiveGameRow): LiveGameSession => {
  const transformed: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    transformed[key] = maybeParseJson(value);
  }
  return transformed as LiveGameSession;
};

const deriveGameMeta = (game: LiveGameSession) => {
  const status = (game.gameStatus as GameStatus) ?? 'pending';
  const category =
    game.gameCategory ??
    (game.isSinglePlayer ? 'singleplayer' : game.gameCategory ?? 'normal');
  const isEnded = status === 'ended' || status === 'no_contest';
  return { status, category, isEnded };
};

const buildStatusPayload = (
  row: SQLiteUserRow,
  credentials: CredentialRow | undefined,
  inventoryRaw: unknown,
  equipmentRaw: unknown,
  mailRaw: unknown,
  questsRaw: unknown,
  missionsRaw: unknown
) => {
  const status: Record<string, unknown> = {
    isAdmin: toBoolean(row.isAdmin),
    baseStats: safeJsonParse(row.baseStats, null),
    spentStatPoints: safeJsonParse(row.spentStatPoints, null),
    stats: safeJsonParse(row.stats, null),
    inventorySlots: safeJsonParse(row.inventorySlots, null),
    mannerScore: toNumber(row.mannerScore, 0),
    lastActionPointUpdate: row.lastActionPointUpdate ?? null,
    chatBanUntil: row.chatBanUntil ?? null,
    connectionBanUntil: row.connectionBanUntil ?? null,
    avatarId: row.avatarId ?? null,
    borderId: row.borderId ?? null,
    ownedBorders: safeJsonParse(row.ownedBorders, []),
    mannerMasteryApplied: toBoolean(row.mannerMasteryApplied),
    pendingPenaltyNotification: row.pendingPenaltyNotification ?? null,
    leagueMetadata: {
      tournamentScore: row.tournamentScore ?? 0,
      league: row.league ?? null,
      previousSeasonTier: row.previousSeasonTier ?? null,
      seasonHistory: safeJsonParse(row.seasonHistory, {}),
      weeklyCompetitors: safeJsonParse(row.weeklyCompetitors, []),
      lastWeeklyCompetitorsUpdate: row.lastWeeklyCompetitorsUpdate ?? null,
      lastLeagueUpdate: row.lastLeagueUpdate ?? null,
      cumulativeTournamentScore: row.cumulativeTournamentScore ?? 0,
    },
    personalProgress: {
      singlePlayerProgress: row.singlePlayerProgress ?? null,
      clearedSinglePlayerStages: safeJsonParse(row.clearedSinglePlayerStages, []),
      towerProgress: safeJsonParse(row.towerProgress, null),
      claimedFirstClearRewards: safeJsonParse(row.claimedFirstClearRewards, []),
      bonusStatPoints: row.bonusStatPoints ?? 0,
      blacksmithLevel: row.blacksmithLevel ?? 0,
      blacksmithXp: row.blacksmithXp ?? 0,
      monthlyGoldBuffExpiresAt: row.monthlyGoldBuffExpiresAt ?? null,
      singlePlayerMissions: missionsRaw,
    },
    questsRaw,
    mailRaw,
    inventoryRaw,
    equipmentRaw,
    currencyLogs: safeJsonParse(row.currencyLogs, []),
    actionPointMeta: {
      actionPoints: safeJsonParse(row.actionPoints, null),
      purchasesToday: row.actionPointPurchasesToday ?? null,
      lastPurchaseDate: row.lastActionPointPurchaseDate ?? null,
      quizzesToday: row.actionPointQuizzesToday ?? null,
      lastQuizDate: row.lastActionPointQuizDate ?? null,
    },
    store: {
      dailyShopPurchases: safeJsonParse(row.dailyShopPurchases, {}),
      inventorySlotsMigrated: toBoolean(row.inventorySlotsMigrated),
      equipmentPresets: safeJsonParse(row.equipmentPresets, []),
      appSettings: safeJsonParse(row.appSettings, null),
    },
    social: {
      guildId: row.guildId ?? null,
      guildApplications: safeJsonParse(row.guildApplications, []),
      guildLeaveCooldownUntil: row.guildLeaveCooldownUntil ?? null,
      guildCoins: row.guildCoins ?? 0,
      guildBossAttempts: row.guildBossAttempts ?? 0,
      lastGuildBossAttemptDate: row.lastGuildBossAttemptDate ?? null,
      dailyDonations: safeJsonParse(row.dailyDonations, {}),
      guildShopPurchases: safeJsonParse(row.guildShopPurchases, {}),
      dailyMissionContribution: safeJsonParse(row.dailyMissionContribution, {}),
    },
    identity: {
      username: row.username ?? null,
      mbti: row.mbti ?? null,
      isMbtiPublic: toBoolean(row.isMbtiPublic),
      lastLoginAt: row.lastLoginAt ?? null,
    },
    credentials,
  };

  return status;
};

const migrateUser = async (
  sqliteRow: SQLiteUserRow,
  credential: CredentialRow | undefined,
  sqliteDb: Database
) => {
  const userId: string = sqliteRow.id;

  const inventoryItems = safeJsonParse<InventoryItemRow[]>(sqliteRow.inventory, []);
  const equipmentMap = safeJsonParse<Record<string, string | null>>(sqliteRow.equipment, {});
  const mailItems = safeJsonParse<MailRow[]>(sqliteRow.mail, []);
  const quests = safeJsonParse(sqliteRow.quests, {});
  const missions = safeJsonParse<Record<string, MissionRow>>(sqliteRow.singlePlayerMissions, {});
  const actionPoints = safeJsonParse<{ current?: number; max?: number }>(sqliteRow.actionPoints, {});

  const statusPayload = buildStatusPayload(
    sqliteRow,
    credential,
    sqliteRow.inventory,
    sqliteRow.equipment,
    sqliteRow.mail,
    sqliteRow.quests,
    sqliteRow.singlePlayerMissions
  );

  const userCreateData = {
    id: userId,
    nickname: sqliteRow.nickname ?? sqliteRow.username ?? `user-${userId.slice(-6)}`,
    username: sqliteRow.username ?? null,
    email: null,
    strategyLevel: toNumber(sqliteRow.strategyLevel, 1),
    strategyXp: toNumber(sqliteRow.strategyXp, 0),
    playfulLevel: toNumber(sqliteRow.playfulLevel, 1),
    playfulXp: toNumber(sqliteRow.playfulXp, 0),
    actionPointCurr: toNumber(actionPoints.current, 0),
    actionPointMax: toNumber(actionPoints.max, 0),
    gold: toBigInt(sqliteRow.gold),
    diamonds: toBigInt(sqliteRow.diamonds),
    league: sqliteRow.league ?? null,
    tournamentScore: toNumber(sqliteRow.tournamentScore, 0),
    status: statusPayload,
    createdAt: toDate(sqliteRow.createdAt ?? sqliteRow.lastLoginAt),
    updatedAt: new Date(),
    version: sqliteRow.version ?? 0,
  };

  const userUpdateData = {
    nickname: userCreateData.nickname,
    username: userCreateData.username,
    strategyLevel: userCreateData.strategyLevel,
    strategyXp: userCreateData.strategyXp,
    playfulLevel: userCreateData.playfulLevel,
    playfulXp: userCreateData.playfulXp,
    actionPointCurr: userCreateData.actionPointCurr,
    actionPointMax: userCreateData.actionPointMax,
    gold: userCreateData.gold,
    diamonds: userCreateData.diamonds,
    league: userCreateData.league,
    tournamentScore: userCreateData.tournamentScore,
    status: userCreateData.status,
    version: userCreateData.version,
    updatedAt: new Date(),
  };

  const inventoryRecords = new Map<string, InventoryItemRow>();

  await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { id: userId },
      create: userCreateData,
      update: userUpdateData,
    });

    if (!DRY_RUN) {
      await tx.userInventory.deleteMany({ where: { userId } });
      for (const item of inventoryItems) {
        const inventoryId = item.id ?? `inv-${randomUUID()}`;
        inventoryRecords.set(inventoryId, item);
        await tx.userInventory.create({
          data: {
            id: inventoryId,
            userId,
            templateId: item.name ?? inventoryId,
            quantity: toNumber(item.quantity, 1),
            slot: item.slot ?? null,
            enhancementLvl: toNumber(
              item.enhancementLvl ?? item.enhancementLevel ?? item.level ?? 0,
              0
            ),
            stars: toNumber(item.stars, 0),
            rarity: item.grade ?? null,
            metadata: {
              name: item.name,
              description: item.description,
              image: item.image,
              type: item.type,
              level: item.level,
              options: item.options ?? item.metadata ?? null,
              extra: item.extra ?? undefined,
            },
            isEquipped: toBoolean(item.isEquipped),
            createdAt: toDate(item.createdAt),
            updatedAt: new Date(),
            version: 0,
          },
        });
      }

      await tx.userEquipment.deleteMany({ where: { userId } });
      const equipmentEntries = Object.entries(equipmentMap);
      for (const [slot, inventoryId] of equipmentEntries) {
        await tx.userEquipment.create({
          data: {
            id: `equip-${userId}-${slot}`,
            userId,
            slot,
            inventoryId: inventoryId && inventoryRecords.has(inventoryId) ? inventoryId : null,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 0,
          },
        });
      }

      await tx.userMail.deleteMany({ where: { userId } });
      for (const mail of mailItems) {
        const mailId = mail.id ?? `mail-${randomUUID()}`;
        await tx.userMail.create({
          data: {
            id: mailId,
            userId,
            title: mail.title ?? '무제',
            body: mail.message ?? '',
            attachments: mail.attachments ?? null,
            isRead: toBoolean(mail.isRead),
            expiresAt: toDateOrNull(mail.expiresAt),
            createdAt: toDate(mail.receivedAt),
            updatedAt: new Date(),
          },
        });
      }

      await tx.userQuest.deleteMany({ where: { userId } });
      const questEntries = flattenQuestBuckets(quests);
      for (const quest of questEntries) {
        const status =
          quest.isClaimed === true
            ? 'claimed'
            : toNumber(quest.progress, 0) >= toNumber(quest.target, Number.MAX_SAFE_INTEGER)
            ? 'completed'
            : 'in_progress';

        const questId = quest.id ?? `quest-${randomUUID()}`;

        await tx.userQuest.create({
          data: {
            id: questId,
            userId,
            questId,
            status,
            progress: quest,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      await tx.userMission.deleteMany({ where: { userId } });
      const missionEntries = extractMissionEntries(missions);
      for (const { missionId, payload } of missionEntries) {
        const recordId = (() => {
          const rawId = payload.id && `${payload.id}`.trim();
          if (rawId) {
            return `${userId}-${rawId}`;
          }
          return `${userId}-${missionId}`;
        })();
        await tx.userMission.create({
          data: {
            id: recordId,
            userId,
            missionId,
            level: payload.level ?? 1,
            state: payload,
            createdAt: toDate(payload.lastCollectionTime),
            updatedAt: new Date(),
          },
        });
      }
    }

    if (!DRY_RUN && credential) {
      const usernameNormalized = credential.username.toLowerCase();
      await tx.userCredential.upsert({
        where: { username: usernameNormalized },
        create: {
          username: usernameNormalized,
          passwordHash: credential.passwordHash,
          userId: credential.userId
        },
        update: {
          passwordHash: credential.passwordHash,
          userId: credential.userId
        }
      });
    }
  });
};

const migrateLiveGames = async (sqliteDb: Database) => {
  const liveGameRows = await sqliteDb.all<LiveGameRow[]>('SELECT * FROM live_games');

  for (const row of liveGameRows) {
    if (!row?.id) continue;
    const game = transformLiveGameRow(row);
    const { status, category, isEnded } = deriveGameMeta(game);
    const createdAt =
      typeof game.createdAt === 'number' ? new Date(game.createdAt) : new Date();
    const updatedAt =
      typeof (game as any).updatedAt === 'number'
        ? new Date((game as any).updatedAt)
        : new Date();

    if (DRY_RUN) {
      console.log(`[Dry Run] Would upsert live game ${row.id} (status=${status})`);
      continue;
    }

    await prisma.liveGame.upsert({
      where: { id: row.id as string },
      create: {
        id: row.id as string,
        status,
        category,
        isEnded,
        data: game,
        createdAt,
        updatedAt
      },
      update: {
        status,
        category,
        isEnded,
        data: game,
        updatedAt
      }
    });
  }
};

const main = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 환경 변수가 설정되어 있지 않습니다.');
  }

  const sqlitePath = path.resolve('database.sqlite');
  const sqliteDb = await open({
    filename: sqlitePath,
    driver: sqlite3.Database,
  });

  const users = await sqliteDb.all<SQLiteUserRow[]>('SELECT * FROM users');
  const credentials = await sqliteDb.all<CredentialRow[]>('SELECT * FROM user_credentials');
  const credentialByUserId = new Map<string, CredentialRow>();
  for (const cred of credentials) {
    credentialByUserId.set(cred.userId, cred);
  }

  console.log(
    `[Migration] 대상 사용자 수: ${users.length}. Dry-run: ${DRY_RUN ? '예' : '아니오'}`
  );

  let migratedCount = 0;
  const failures: Array<{ userId: string; error: Error }> = [];

  for (const userRow of users) {
    try {
      await migrateUser(userRow, credentialByUserId.get(userRow.id), sqliteDb);
      migratedCount += 1;
      console.log(`[Migration] 사용자 ${userRow.nickname ?? userRow.username ?? userRow.id} 처리 완료`);
    } catch (error) {
      failures.push({ userId: userRow.id, error: error as Error });
      console.error(`[Migration] 사용자 ${userRow.id} 처리 중 오류 발생:`, error);
    }
  }

  await migrateLiveGames(sqliteDb);

  if (!DRY_RUN) {
    await prisma.$disconnect();
  }
  await sqliteDb.close();

  console.log(`[Migration] 완료: ${migratedCount}/${users.length} 사용자 처리`);
  if (failures.length > 0) {
    console.error('[Migration] 실패한 사용자 목록:');
    for (const failure of failures) {
      console.error(`  - ${failure.userId}: ${failure.error.message}`);
    }
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error('[Migration] 치명적 오류:', error);
  process.exit(1);
});

