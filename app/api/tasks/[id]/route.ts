import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  ensureProjectRole,
  Permission,
  PermissionError,
  requireTaskMutation,
} from "@/lib/permissions";
import { recalcTaskEndDate } from "@/lib/taskDates";
import { Priority } from "@prisma/client";

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDateOriginal: z.coerce.date().optional(),
  delayDays: z.number().int().min(0).optional(),
  ownerId: z.string().optional().nullable(),
  progress: z.number().int().min(0).max(100).optional(),
  priority: z.nativeEnum(Priority).optional(),
  parentTaskId: z.string().optional().nullable(),
});

interface RouteParams {
  params: { id: string };
}

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    const task = await prisma.task.find({
      where: { id: params.id },
      include: { owner: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await ensureProjectRole(user, task.projectId, Permission.readableRoles);

    return NextResponse.json({ data: task });
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to load task" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { task } = await requireTaskMutation(user, params.id);

    const body = updateSchema.parse(await request.json());

    await prisma.task.update({
      where: { id: params.id },
      data: body,
    });

    const recalculated = await recalcTaskEndDate(prisma, params.id);

    await prisma.auditLog.create({
      data: {
        projectId: task.projectId,
        actorId: user?.id,
        entityType: "TASK",
        entityId: params.id,
        action: "UPDATED",
        payload: body,
      },
    });

    return NextResponse.json({ data: recalculated });
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
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { task } = await requireTaskMutation(user, params.id);

    await prisma.task.delete({ where: { id: params.id } });

    await prisma.auditLog.create({
      data: {
        projectId: task.projectId,
        actorId: user?.id,
        entityType: "TASK",
        entityId: params.id,
        action: "DELETED",
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
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
