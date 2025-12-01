import { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "./db";

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  globalRole: Role;
}

// TODO: Replace stub with NextAuth getServerSession when providers are configured.
export async function getCurrentUser(): Promise<SessionUser | null> {
  const sessionUserId = cookies().get("x-user-id")?.value;

  if (sessionUserId) {
    const user = await prisma.user.findUnique({ where: { id: sessionUserId } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      globalRole: user.globalRole,
    };
  }

  if (process.env.NODE_ENV === "development") {
    const admin = await prisma.user.findFirst({
      where: { globalRole: Role.ADMIN },
    });
    if (admin) {
      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        globalRole: admin.globalRole,
      };
    }
  }

  return null;
}

export function assertUser(
  user: SessionUser | null
): asserts user is SessionUser {
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
}
