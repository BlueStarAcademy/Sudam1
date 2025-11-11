import prisma from './prismaClient.ts';

const migrate = async () => {
    console.log('Prisma/Supabase migration helper');
    try {
        await prisma.$connect();
        console.log('Connected to Supabase via Prisma. Run `npx prisma migrate dev` or `npx prisma db push` to manage schema changes.');
        await prisma.$disconnect();
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
};

migrate();