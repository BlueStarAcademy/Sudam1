import prisma from "../prismaClient.js";
import type { Prisma, UserMission } from "../../generated/prisma/index.js";
import type { PrismaTransactionClient } from "./transaction.js";

type Tx = PrismaTransactionClient;

export async function listUserMissions(userId: string, tx?: Tx): Promise<UserMission[]> {
    const client = tx ?? prisma;
    return client.userMission.findMany({
        where: { userId },
    });
}

export async function upsertMission(
    userId: string,
    missionId: string,
    data: Prisma.UserMissionUpdateInput,
    tx?: Tx
): Promise<UserMission> {
    const client = tx ?? prisma;
    return client.userMission.upsert({
        where: { userId_missionId: { userId, missionId } },
        create: {
            userId,
            missionId,
            level: (data.level as number | undefined) ?? 1,
            state: data.state ?? undefined,
        },
        update: data,
    });
}

export async function deleteMission(
    userId: string,
    missionId: string,
    tx?: Tx
): Promise<void> {
    const client = tx ?? prisma;
    await client.userMission.delete({
        where: { userId_missionId: { userId, missionId } },
    });
}

