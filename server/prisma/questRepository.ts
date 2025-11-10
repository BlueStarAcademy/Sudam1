import prisma from "../prismaClient.js";
import type { Prisma, UserQuest } from "../../generated/prisma/index.js";
import type { PrismaTransactionClient } from "./transaction.js";

type Tx = PrismaTransactionClient;

export async function listUserQuests(userId: string, tx?: Tx): Promise<UserQuest[]> {
    const client = tx ?? prisma;
    return client.userQuest.findMany({
        where: { userId },
    });
}

export async function upsertQuest(
    userId: string,
    questId: string,
    data: Prisma.UserQuestUpdateInput,
    tx?: Tx
): Promise<UserQuest> {
    const client = tx ?? prisma;
    return client.userQuest.upsert({
        where: { userId_questId: { userId, questId } },
        create: {
            userId,
            questId,
            status: (data.status as string) ?? "active",
            progress: data.progress ?? undefined,
        },
        update: data,
    });
}

export async function deleteQuest(
    userId: string,
    questId: string,
    tx?: Tx
): Promise<void> {
    const client = tx ?? prisma;
    await client.userQuest.delete({
        where: { userId_questId: { userId, questId } },
    });
}

