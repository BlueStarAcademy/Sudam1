import prisma from "../prismaClient.js";
import type { Prisma } from "../../generated/prisma/index.js";

export type PrismaTransactionClient = Prisma.TransactionClient;

export async function withTransaction<T>(
    fn: (tx: PrismaTransactionClient) => Promise<T>
): Promise<T> {
    return prisma.$transaction(async (tx) => {
        return fn(tx);
    });
}

export default withTransaction;

