import prisma from "../prismaClient.js";
import type { Prisma, UserInventory } from "../../generated/prisma/index.js";
import type { PrismaTransactionClient } from "./transaction.js";

type Tx = PrismaTransactionClient;

export async function listInventory(userId: string, tx?: Tx): Promise<UserInventory[]> {
    const client = tx ?? prisma;
    return client.userInventory.findMany({
        where: { userId },
        orderBy: [{ slot: "asc" }, { createdAt: "asc" }],
    });
}

export async function findInventoryItem(id: string, tx?: Tx): Promise<UserInventory | null> {
    const client = tx ?? prisma;
    return client.userInventory.findUnique({
        where: { id },
    });
}

export async function createInventoryItem(
    data: Prisma.UserInventoryCreateInput,
    tx?: Tx
): Promise<UserInventory> {
    const client = tx ?? prisma;
    return client.userInventory.create({ data });
}

export async function updateInventoryItem(
    id: string,
    data: Prisma.UserInventoryUpdateInput,
    tx?: Tx
): Promise<UserInventory> {
    const client = tx ?? prisma;
    return client.userInventory.update({
        where: { id },
        data,
    });
}

export async function deleteInventoryItem(id: string, tx?: Tx): Promise<void> {
    const client = tx ?? prisma;
    await client.userInventory.delete({ where: { id } });
}

export async function bulkUpsertInventory(
    items: Prisma.UserInventoryCreateManyInput[],
    tx?: Tx
) {
    if (!items.length) return;
    const client = tx ?? prisma;
    await client.userInventory.createMany({
        data: items,
        skipDuplicates: true,
    });
}

export async function updateEquippedFlag(
    id: string,
    isEquipped: boolean,
    tx?: Tx
) {
    const client = tx ?? prisma;
    await client.userInventory.update({
        where: { id },
        data: { isEquipped },
    });
}

