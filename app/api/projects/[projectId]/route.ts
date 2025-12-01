import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  ensureProjectRole,
  Permission,
  PermissionError,
} from "@/lib/permissions";
import { Role } from "@prisma/client";

const updateSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDateTarget: z.coerce.date().optional(),
});

interface RouteParams {
  params: { projectId: string };
}

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    await ensureProjectRole(user, params.projectId, Permission.readableRoles);

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      include: {
        members: { include: { user: true } },
        tasks: true,
        milestones: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: project });
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load project" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    await ensureProjectRole(user, params.projectId, [Role.ADMIN, Role.MANAGER]);

    const body = updateSchema.parse(await request.json());

    const project = await prisma.project.update({
      where: { id: params.projectId },
      data: body,
      include: { members: true },
    });

    return NextResponse.json({ data: project });
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
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    await ensureProjectRole(user, params.projectId, [Role.ADMIN, Role.MANAGER]);

    await prisma.project.delete({ where: { id: params.projectId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
