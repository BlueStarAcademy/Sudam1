import prisma from "../prismaClient.js";
import type { Prisma, UserEquipment } from "../../generated/prisma/index.js";
import type { PrismaTransactionClient } from "./transaction.js";

type Tx = PrismaTransactionClient;

export async function listEquipment(userId: string, tx?: Tx): Promise<UserEquipment[]> {
    const client = tx ?? prisma;
    return client.userEquipment.findMany({
        where: { userId },
        orderBy: [{ slot: "asc" }],
    });
}

export async function setEquipmentSlot(
    userId: string,
    slot: string,
    inventoryId: string | null,
    tx?: Tx
): Promise<UserEquipment> {
    const client = tx ?? prisma;
    return client.userEquipment.upsert({
        where: {
            userId_slot: {
                userId,
                slot,
            },
        },
        create: {
            userId,
            slot,
            inventory: inventoryId ? { connect: { id: inventoryId } } : undefined,
        },
        update: {
            inventory: inventoryId ? { connect: { id: inventoryId } } : { disconnect: true },
        },
    });
}

export async function clearEquipment(userId: string, tx?: Tx) {
    const client = tx ?? prisma;
    await client.userEquipment.updateMany({
        where: { userId },
        data: { inventoryId: null },
    });
}

