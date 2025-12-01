import { Role } from "@prisma/client";
import { prisma } from "./db";
import type { SessionUser } from "./auth";

export class PermissionError extends Error {
  constructor(message: string, public status = 403) {
    super(message);
    this.name = "PermissionError";
  }
}

export const Permission = {
  readableRoles: [Role.ADMIN, Role.MANAGER, Role.MEMBER, Role.VIEWER],
  taskWriteRoles: [Role.ADMIN, Role.MANAGER, Role.MEMBER],
  milestoneWriteRoles: [Role.ADMIN, Role.MANAGER],
  issueWriteRoles: [Role.ADMIN, Role.MANAGER, Role.MEMBER],
};

export function ensureGlobalRole(
  user: SessionUser | null,
  allowedRoles: Role[]
): SessionUser {
  if (!user) {
    throw new PermissionError("UNAUTHENTICATED", 401);
  }
  if (!allowedRoles.includes(user.globalRole)) {
    throw new PermissionError("FORBIDDEN", 403);
  }
  return user;
}

export async function ensureProjectRole(
  user: SessionUser | null,
  projectId: string,
  allowedRoles: Role[]
): Promise<{ user: SessionUser; role: Role }> {
  if (!user) {
    throw new PermissionError("UNAUTHENTICATED", 401);
  }

  if (user.globalRole === Role.ADMIN) {
    return { user, role: Role.ADMIN };
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    select: { role: true },
  });

  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new PermissionError("FORBIDDEN", 403);
  }

  return { user, role: membership.role };
}

export async function requireTaskMutation(
  user: SessionUser | null,
  taskId: string
) {
  if (!user) {
    throw new PermissionError("UNAUTHENTICATED", 401);
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, ownerId: true },
  });

  if (!task) {
    throw new PermissionError("NOT_FOUND", 404);
  }

  const { role } = await ensureProjectRole(
    user,
    task.projectId,
    Permission.taskWriteRoles
  );

  if (role === Role.MEMBER && task.ownerId && task.ownerId !== user.id) {
    throw new PermissionError("FORBIDDEN", 403);
  }

  return { task, role };
}

export function canManageMembers(role: Role) {
  return role === Role.ADMIN || role === Role.MANAGER;
}
