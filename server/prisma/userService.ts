import prisma from "../prismaClient.js";
import type { Prisma } from "@prisma/client";
import type { User } from "../../types/index.js";
import { deserializeUser, serializeUser, PrismaUserWithStatus } from "./userAdapter.js";

const toBigInt = (value: number | undefined): bigint => {
  if (typeof value === "bigint") return value;
  if (value == null || Number.isNaN(value)) return 0n;
  return BigInt(Math.trunc(value));
};

const buildPersistentFields = (user: User) => {
  const status = serializeUser(user);
  // Convert status to Prisma-compatible JSON type
  const statusJson = JSON.parse(JSON.stringify(status)) as Prisma.JsonValue;

  return {
    nickname: user.nickname,
    username: user.username,
    isAdmin: user.isAdmin ?? false,
    strategyLevel: user.strategyLevel,
    strategyXp: user.strategyXp,
    playfulLevel: user.playfulLevel,
    playfulXp: user.playfulXp,
    actionPointCurr: user.actionPoints?.current ?? 0,
    actionPointMax: user.actionPoints?.max ?? 0,
    gold: toBigInt(user.gold),
    diamonds: toBigInt(user.diamonds),
    league: user.league ?? null,
    tournamentScore: user.tournamentScore ?? 0,
    towerFloor: user.towerFloor ?? 0,
    lastTowerClearTime: user.lastTowerClearTime != null ? BigInt(user.lastTowerClearTime) : null,
    status: statusJson
  };
};

const mapUser = (row: PrismaUserWithStatus): User => deserializeUser(row);

export async function listUsers(): Promise<User[]> {
  const rows = await prisma.user.findMany({
    include: { guildMember: true }
  });
  return rows.map(mapUser);
}

export async function getUserById(id: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ 
    where: { id },
    include: { guildMember: true }
  });
  return row ? mapUser(row) : null;
}

export async function getUserByNickname(nickname: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ 
    where: { nickname },
    include: { guildMember: true }
  });
  return row ? mapUser(row) : null;
}

export async function createUser(user: User): Promise<User> {
  const data = buildPersistentFields(user);
  const created = await prisma.user.create({
    data: {
      id: user.id,
      ...data
    }
  });
  return mapUser(created);
}

export async function updateUser(user: User): Promise<User> {
  const data = buildPersistentFields(user);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data
  });
  return mapUser(updated);
}

export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}

