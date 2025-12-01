import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  canManageMembers,
  ensureProjectRole,
  Permission,
  PermissionError,
} from "@/lib/permissions";
import { Role } from "@prisma/client";

const memberSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.nativeEnum(Role).default(Role.MEMBER),
});

const removeSchema = z.object({
  userId: z.string().cuid(),
});

interface RouteParams {
  params: { projectId: string };
}

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    await ensureProjectRole(user, params.projectId, Permission.readableRoles);

    const members = await prisma.projectMember.findMany({
      where: { projectId: params.projectId },
      include: { user: true },
    });

    return NextResponse.json({ data: members });
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load members" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { role } = await ensureProjectRole(user, params.projectId, [
      Role.ADMIN,
      Role.MANAGER,
    ]);

    if (!canManageMembers(role)) {
      throw new PermissionError("FORBIDDEN", 403);
    }

    const body = memberSchema.parse(await request.json());

    const invitee = await prisma.user.upsert({
      where: { email: body.email },
      update: { name: body.name ?? undefined },
      create: {
        email: body.email,
        name: body.name,
        globalRole: Role.MEMBER,
      },
    });

    const membership = await prisma.projectMember.upsert({
      where: {
        projectId_userId: { projectId: params.projectId, userId: invitee.id },
      },
      update: { role: body.role },
      create: {
        projectId: params.projectId,
        userId: invitee.id,
        role: body.role,
      },
    });

    await prisma.auditLog.create({
      data: {
        projectId: params.projectId,
        actorId: user.id,
        entityType: "PROJECT_MEMBER",
        entityId: membership.id,
        action: "UPSERT",
        payload: { email: invitee.email, role: body.role },
      },
    });

    // TODO: send invite notification email or push event here.

    return NextResponse.json({ data: membership }, { status: 201 });
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to upsert member" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { role } = await ensureProjectRole(user, params.projectId, [
      Role.ADMIN,
      Role.MANAGER,
    ]);
    if (!canManageMembers(role)) {
      throw new PermissionError("FORBIDDEN", 403);
    }

    const body = removeSchema.parse(await request.json());

    await prisma.projectMember.delete({
      where: {
        projectId_userId: { projectId: params.projectId, userId: body.userId },
      },
    });

    await prisma.auditLog.create({
      data: {
        projectId: params.projectId,
        actorId: user.id,
        entityType: "PROJECT_MEMBER",
        entityId: body.userId,
        action: "REMOVED",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
