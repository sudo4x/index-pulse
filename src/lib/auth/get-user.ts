import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * 根据 Supabase auth 信息获取用户记录
 * 返回包含自增 ID 的用户信息
 */
export async function getCurrentUser(): Promise<{
  id: number;
  authId: string;
  email: string;
} | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // 通过 authId 查找用户记录
    const userRecord = await db
      .select({
        id: users.id,
        authId: users.authId,
        email: users.email,
      })
      .from(users)
      .where(eq(users.authId, user.id))
      .limit(1);

    if (userRecord.length === 0) {
      // 用户不存在，需要同步
      const { syncAuthUser } = await import("./sync-user");
      return await syncAuthUser({
        id: user.id,
        email: user.email,
      });
    }

    return userRecord[0];
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}
