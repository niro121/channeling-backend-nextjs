"use server"

import prisma from '@/lib/prisma';

// ==== HELPER: TO RESOLVE USERS IN SESSION DATA ==== //
export async function resolveUsersHelper(data: any[]): Promise<any[]> {
  if (data.length === 0) {
    return data;
  }

  // == GET ALL UNIQUE IDs FROM CREATEDBY AND UPDATEDBY FIELDS == //
  const userIds = new Set<string>();
  data.forEach((item) => {
    if (item.createdBy) userIds.add(item.createdBy);
    if (item.updatedBy) userIds.add(item.updatedBy);
  });

  if (userIds.size === 0) {
    return data;
  }

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: Array.from(userIds)
      }
    }
  });

  // ==== LOOKUP MAP ==== //
  const userMap = new Map(users.map((u) => [u.id, u]));

  // == RESOLVE USER NAMES == //
  return data.map((item) => {
    const createdUser = item.createdBy ? userMap.get(item.createdBy) : null;
    const updatedUser = item.updatedBy ? userMap.get(item.updatedBy) : null;

    return {
      ...item,
      createdUserName: createdUser ? createdUser.name : 'NO USER NAME',
      updatedUserName: updatedUser ? updatedUser.name : 'NO USER NAME'
    };
  });
}