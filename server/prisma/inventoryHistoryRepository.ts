// @ts-nocheck
import prisma from "../prismaClient.js";
import type { Prisma, InventoryHistory } from "@prisma/client";
import type { PrismaTransactionClient } from "./transaction.js";

type Tx = PrismaTransactionClient;

export async function logInventoryEvent(
    data: Prisma.InventoryHistoryCreateInput,
    tx?: Tx
): Promise<InventoryHistory> {
    const client = tx ?? prisma;
    return client.inventoryHistory.create({ data });
}

export async function listHistoryByUser(
    userId: string,
    limit = 100,
    tx?: Tx
): Promise<InventoryHistory[]> {
    const client = tx ?? prisma;
    return client.inventoryHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
    });
}

