// @ts-nocheck
import prisma from "../prismaClient.js";
import type { Prisma } from "@prisma/client";

export type PrismaCredential = Prisma.UserCredentialGetPayload<{
  select: {
    username: true;
    passwordHash: true;
    userId: true;
  };
}>;

export const getUserCredentialByUsername = async (
  username: string
): Promise<PrismaCredential | null> => {
  return prisma.userCredential.findUnique({
    where: { username: username.toLowerCase() }
  });
};

export const getUserCredentialByUserId = async (
  userId: string
): Promise<PrismaCredential | null> => {
  return prisma.userCredential.findUnique({
    where: { userId }
  });
};

export const createUserCredential = async (
  username: string,
  passwordHash: string,
  userId: string
): Promise<void> => {
  const normalizedUsername = username.toLowerCase();
  await prisma.userCredential.create({
    data: {
      username: normalizedUsername,
      passwordHash,
      userId
    }
  });
};

export const deleteUserCredentialByUsername = async (
  username: string
): Promise<void> => {
  await prisma.userCredential.delete({
    where: { username: username.toLowerCase() }
  });
};

