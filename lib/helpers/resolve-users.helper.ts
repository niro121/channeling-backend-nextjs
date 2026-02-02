"use server"

import prisma from '@/lib/prisma';

// Helper function to resolve users in session data
export async function resolveUsersHelper(data: any[]): Promise<any[]> {
  if (data.length === 0) {
    return data;
  }

  // Get all unique user IDs from createdBy and updatedBy fields
  const userIds = new Set<string>();
  data.forEach((item) => {
    if (item.createdBy) userIds.add(item.createdBy);
    if (item.updatedBy) userIds.add(item.updatedBy);
  });

  if (userIds.size === 0) {
    return data;
  }

  // Fetch all users
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: Array.from(userIds)
      }
    }
  });

  // Create a map for quick lookup
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Resolve user names
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