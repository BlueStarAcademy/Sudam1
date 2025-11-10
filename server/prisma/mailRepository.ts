import prisma from "../prismaClient.js";
import type { Prisma, UserMail } from "../../generated/prisma/index.js";
import type { PrismaTransactionClient } from "./transaction.js";

type Tx = PrismaTransactionClient;

export async function listUserMail(userId: string, tx?: Tx): Promise<UserMail[]> {
    const client = tx ?? prisma;
    return client.userMail.findMany({
        where: { userId },
        orderBy: [{ createdAt: "desc" }],
    });
}

export async function createMail(
    data: Prisma.UserMailCreateInput,
    tx?: Tx
): Promise<UserMail> {
    const client = tx ?? prisma;
    return client.userMail.create({ data });
}

export async function markMailRead(id: string, tx?: Tx): Promise<void> {
    const client = tx ?? prisma;
    await client.userMail.update({
        where: { id },
        data: { isRead: true },
    });
}

export async function deleteMail(id: string, tx?: Tx): Promise<void> {
    const client = tx ?? prisma;
    await client.userMail.delete({ where: { id } });
}

