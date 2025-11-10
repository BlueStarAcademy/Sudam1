import prisma from "../prismaClient.js";
import type { Prisma, User } from "../../generated/prisma/index.js";
import type { PrismaTransactionClient } from "./transaction.js";

type Tx = PrismaTransactionClient;

export async function getUserById(id: string, tx?: Tx): Promise<User | null> {
    const client = tx ?? prisma;
    return client.user.findUnique({ where: { id } });
}

export async function getUsersByIds(ids: string[], tx?: Tx): Promise<User[]> {
    if (ids.length === 0) return [];
    const client = tx ?? prisma;
    return client.user.findMany({ where: { id: { in: ids } } });
}

export async function upsertUser(
    data: Prisma.UserUpsertArgs["create"],
    update: Prisma.UserUpsertArgs["update"],
    tx?: Tx
): Promise<User> {
    const client = tx ?? prisma;
    return client.user.upsert({
        where: { id: data.id as string },
        create: data,
        update,
    });
}

export async function updateUserCore(
    id: string,
    data: Prisma.UserUpdateInput,
    tx?: Tx
): Promise<User> {
    const client = tx ?? prisma;
    return client.user.update({
        where: { id },
        data,
    });
}

export async function incrementUserVersion(
    id: string,
    tx?: Tx
): Promise<User> {
    const client = tx ?? prisma;
    return client.user.update({
        where: { id },
        data: {
            version: { increment: 1 },
        },
    });
}

export async function getUserProfileSnapshot(id: string, tx?: Tx) {
    const client = tx ?? prisma;
    return client.user.findUnique({
        where: { id },
        include: {
            inventory: true,
            equipment: true,
            quests: true,
            missions: true,
            mail: {
                where: { isRead: false },
            },
        },
    });
}

