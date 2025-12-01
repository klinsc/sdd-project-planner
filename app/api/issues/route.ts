import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  ensureProjectRole,
  Permission,
  PermissionError,
} from "@/lib/permissions";
import { recalcTaskEndDate } from "@/lib/taskDates";

const issueSchema = z.object({
  taskId: z.string().cuid(),
  title: z.string().min(3),
  startDate: z.coerce.date(),
  durationDays: z.number().int().min(1),
  description: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const taskId = searchParams.get("taskId");

    const where = taskId
      ? { taskId }
      : projectId
      ? { task: { projectId } }
      : { task: { project: { members: { some: { userId: user.id } } } } };

    const issues = await prisma.issue.findMany({
      where,
      include: { task: true },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({ data: issues });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load issues" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = issueSchema.parse(await request.json());

    const task = await prisma.task.findUnique({ where: { id: body.taskId } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await ensureProjectRole(user, task.projectId, Permission.issueWriteRoles);

    const result = await prisma.$transaction(async (tx) => {
      const issue = await tx.issue.create({
        data: {
          ...body,
          createdById: user?.id,
        },
      });

      const updatedTask = await recalcTaskEndDate(tx, body.taskId);

      await tx.auditLog.create({
        data: {
          projectId: task.projectId,
          actorId: user?.id,
          entityType: "ISSUE",
          entityId: issue.id,
          action: "CREATED",
          payload: {
            durationDays: body.durationDays,
            taskId: body.taskId,
          },
        },
      });

      // TODO: Broadcast delay creation over WebSocket/Supabase channel here.

      return { issue, task: updatedTask };
    });

    return NextResponse.json({ data: result }, { status: 201 });
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
      { error: "Failed to create issue" },
      { status: 500 }
    );
  }
}
