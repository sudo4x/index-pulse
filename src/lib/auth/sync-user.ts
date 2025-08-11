import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * 同步 Supabase auth 用户到 public.users 表
 * 返回同步后的用户记录，包含自增 ID
 */
export async function syncAuthUser(authUser: {
  id: string; // Supabase auth.users 的 UUID
  email?: string;
}): Promise<{ id: number; authId: string; email: string }> {
  try {
    if (!authUser.email) {
      throw new Error("User email is required");
    }

    // 检查用户是否已存在（通过 authId 查找）
    const existingUser = await db.select().from(users).where(eq(users.authId, authUser.id)).limit(1);

    if (existingUser.length === 0) {
      // 创建新用户记录
      const [newUser] = await db
        .insert(users)
        .values({
          authId: authUser.id,
          email: authUser.email,
        })
        .returning({
          id: users.id,
          authId: users.authId,
          email: users.email,
        });

      console.log(`Created user record for ${authUser.email} with ID ${newUser.id}`);
      return newUser;
    } else {
      // 更新用户信息（如果需要）
      const [updatedUser] = await db
        .update(users)
        .set({
          email: authUser.email,
          updatedAt: new Date(),
        })
        .where(eq(users.authId, authUser.id))
        .returning({
          id: users.id,
          authId: users.authId,
          email: users.email,
        });

      console.log(`Updated user record for ${authUser.email} with ID ${updatedUser.id}`);
      return updatedUser;
    }
  } catch (error) {
    console.error("Error syncing user:", error);
    throw error;
  }
}
