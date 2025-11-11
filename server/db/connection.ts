export const initializeAndGetDb = async (): Promise<never> => {
    throw new Error('[DB] SQLite connection has been removed. Please use Prisma/Supabase instead.');
};

export const getDb = initializeAndGetDb;