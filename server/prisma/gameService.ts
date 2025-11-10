import prisma from "../prismaClient.js";
import type { LiveGameSession, GameStatus } from "../../types.js";

const ENDED_STATUSES: GameStatus[] = ["ended", "no_contest"];

const mapRowToGame = (row: { id: string; data: unknown; status: string; category: string | null }): LiveGameSession | null => {
  if (!row) return null;
  const game = JSON.parse(JSON.stringify(row.data)) as LiveGameSession;
  if (!game) return null;
  game.id = row.id;
  if (!game.gameStatus) {
    game.gameStatus = row.status as GameStatus;
  }
  if (!game.gameCategory && row.category) {
    game.gameCategory = row.category as any;
  }
  return game;
};

const deriveMeta = (game: LiveGameSession) => {
  const status: GameStatus = (game.gameStatus as GameStatus) ?? "pending";
  const category =
    game.gameCategory ??
    (game.isSinglePlayer ? "singleplayer" : game.gameCategory ?? "normal");
  const isEnded = ENDED_STATUSES.includes(status);
  return { status, category, isEnded };
};

export async function getLiveGame(id: string): Promise<LiveGameSession | null> {
  const row = await prisma.liveGame.findUnique({
    where: { id }
  });
  if (!row) return null;
  return mapRowToGame(row);
}

export async function getAllActiveGames(): Promise<LiveGameSession[]> {
  const rows = await prisma.liveGame.findMany({
    where: { isEnded: false }
  });
  return rows.map((row) => mapRowToGame(row)).filter((g): g is LiveGameSession => g !== null);
}

export async function getAllEndedGames(): Promise<LiveGameSession[]> {
  const rows = await prisma.liveGame.findMany({
    where: { isEnded: true }
  });
  return rows.map((row) => mapRowToGame(row)).filter((g): g is LiveGameSession => g !== null);
}

export async function saveGame(game: LiveGameSession): Promise<void> {
  const { status, category, isEnded } = deriveMeta(game);
  await prisma.liveGame.upsert({
    where: { id: game.id },
    create: {
      id: game.id,
      status,
      category,
      isEnded,
      data: game
    },
    update: {
      status,
      category,
      isEnded,
      data: game,
      updatedAt: new Date()
    }
  });
}

export async function deleteGame(id: string): Promise<void> {
  await prisma.liveGame.delete({
    where: { id }
  });
}

