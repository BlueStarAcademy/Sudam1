import prisma from '../prismaClient.js';

export const getKV = async <T>(key: string): Promise<T | null> => {
    const row = await prisma.keyValue.findUnique({ where: { key } });
    return (row?.value as T) ?? null;
};

export const setKV = async <T>(key: string, value: T): Promise<void> => {
    await prisma.keyValue.upsert({
        where: { key },
        update: { value },
        create: { key, value },
    });
};