import path from 'path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import prisma from '../prismaClient.ts';
import { rowToUser } from '../repositories/mappers.ts';
import type { User } from '../../types.ts';
import { serializeUser } from '../prisma/userAdapter.ts';

const SQLITE_DB_PATH =
  process.env.SQLITE_DB_PATH ?? path.resolve(process.cwd(), 'database.sqlite');

const toBigInt = (value: number | undefined | null): bigint => {
  if (typeof value === 'bigint') return value;
  if (value === undefined || value === null || Number.isNaN(value)) return 0n;
  return BigInt(Math.trunc(value));
};

const buildPersistentFields = (user: User) => {
  const status = serializeUser(user);

  return {
    nickname: user.nickname,
    username: user.username ?? null,
    isAdmin: user.isAdmin ?? false,
    strategyLevel: user.strategyLevel ?? 1,
    strategyXp: user.strategyXp ?? 0,
    playfulLevel: user.playfulLevel ?? 1,
    playfulXp: user.playfulXp ?? 0,
    actionPointCurr: user.actionPoints?.current ?? 0,
    actionPointMax: user.actionPoints?.max ?? 0,
    gold: toBigInt(user.gold),
    diamonds: toBigInt(user.diamonds),
    league: user.league ?? null,
    tournamentScore: user.tournamentScore ?? 0,
    status,
  };
};

async function migrateUsers() {
  console.log('[Migration] Connecting to SQLite database:', SQLITE_DB_PATH);
  const sqliteDb = await open({
    filename: SQLITE_DB_PATH,
    driver: sqlite3.Database,
  });

  try {
    const rawUsers = await sqliteDb.all('SELECT * FROM users');
    console.log(`[Migration] Loaded ${rawUsers.length} users from SQLite`);

    let migrated = 0;
    let skipped = 0;
    for (const raw of rawUsers) {
      const user = rowToUser(raw);
      if (!user) {
        skipped += 1;
        continue;
      }

      const data = buildPersistentFields(user);

      try {
        await prisma.user.upsert({
          where: { id: user.id },
          update: data,
          create: {
            id: user.id,
            ...data,
          },
        });
        migrated += 1;
      } catch (err: any) {
        console.error(
          `[Migration] Failed to upsert user ${user.id} (${user.nickname}):`,
          err?.message ?? err,
        );
        skipped += 1;
      }
    }

    console.log(
      `[Migration] Users migration complete. Migrated=${migrated}, Skipped=${skipped}`,
    );
  } finally {
    await sqliteDb.close();
  }
}

async function migrateCredentials() {
  console.log('[Migration] Migrating user credentials…');
  const sqliteDb = await open({
    filename: SQLITE_DB_PATH,
    driver: sqlite3.Database,
  });

  try {
    const creds = await sqliteDb.all(
      'SELECT username, passwordHash, userId FROM user_credentials',
    );
    console.log(`[Migration] Loaded ${creds.length} credentials from SQLite`);

    let migrated = 0;
    let skipped = 0;
    for (const cred of creds) {
      if (!cred?.username || !cred?.userId) {
        skipped += 1;
        continue;
      }

      const username = String(cred.username).toLowerCase();
      try {
        await prisma.userCredential.upsert({
          where: { username },
          update: {
            passwordHash: cred.passwordHash,
            userId: cred.userId,
          },
          create: {
            username,
            passwordHash: cred.passwordHash ?? '',
            userId: cred.userId,
          },
        });
        migrated += 1;
      } catch (err: any) {
        console.error(
          `[Migration] Failed to upsert credential ${username}:`,
          err?.message ?? err,
        );
        skipped += 1;
      }
    }

    console.log(
      `[Migration] Credentials migration complete. Migrated=${migrated}, Skipped=${skipped}`,
    );
  } finally {
    await sqliteDb.close();
  }
}

async function main() {
  try {
    await migrateUsers();
    await migrateCredentials();
    console.log('[Migration] All migrations completed.');
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();

