import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  ensureProjectRole,
  Permission,
  PermissionError,
} from "@/lib/permissions";
import { Priority } from "@prisma/client";
import { computeEndDateFinal } from "@/lib/taskDates";

const createTaskSchema = z.object({
  projectId: z.string().cuid(),
  title: z.string().min(3),
  description: z.string().optional(),
  startDate: z.coerce.date(),
  endDateOriginal: z.coerce.date(),
  delayDays: z.number().int().min(0).default(0),
  ownerId: z.string().optional().nullable(),
  progress: z.number().int().min(0).max(100).default(0),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  parentTaskId: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const where = projectId
      ? { projectId }
      : {
          project: { members: { some: { userId: user.id } } },
        };

    const tasks = await prisma.task.findMany({
      where,
      include: { owner: true },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json({ data: tasks });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = createTaskSchema.parse(await request.json());
    const normalizedParentTaskId = body.parentTaskId?.trim();
    const parentTaskId = normalizedParentTaskId ? normalizedParentTaskId : null;

    await ensureProjectRole(user, body.projectId, Permission.taskWriteRoles);

    if (parentTaskId) {
      const parentTask = await prisma.task.findUnique({
        where: { id: parentTaskId },
        select: { projectId: true },
      });

      if (!parentTask || parentTask.projectId !== body.projectId) {
        return NextResponse.json(
          { error: "Parent task must exist within the same project" },
          { status: 400 }
        );
      }
    }

    if (body.endDateOriginal < body.startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    const endDateFinal = computeEndDateFinal(
      body.endDateOriginal,
      body.delayDays
    );

    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          projectId: body.projectId,
          title: body.title,
          description: body.description,
          startDate: body.startDate,
          endDateOriginal: body.endDateOriginal,
          endDateFinal,
          delayDays: body.delayDays,
          ownerId: body.ownerId ?? null,
          progress: body.progress,
          priority: body.priority,
          parentTaskId,
        },
        include: { owner: true },
      });

      await tx.auditLog.create({
        data: {
          projectId: body.projectId,
          actorId: user?.id,
          entityType: "TASK",
          entityId: created.id,
          action: "CREATED",
          payload: {
            title: created.title,
            ownerId: created.ownerId,
          },
        },
      });

      return created;
    });

    return NextResponse.json({ data: task }, { status: 201 });
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
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
