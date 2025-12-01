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

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  startDate: z.coerce.date().optional(),
  durationDays: z.number().int().min(1).optional(),
  description: z.string().optional(),
});

interface RouteParams {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const body = updateSchema.parse(await request.json());
    const user = await getCurrentUser();

    const issue = await prisma.issue.findUnique({
      where: { id: params.id },
      include: { task: true },
    });

    if (!issue) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await ensureProjectRole(
      user,
      issue.task.projectId,
      Permission.issueWriteRoles
    );

    await prisma.issue.update({ where: { id: params.id }, data: body });
    const updatedTask = await recalcTaskEndDate(prisma, issue.taskId);

    await prisma.auditLog.create({
      data: {
        projectId: issue.task.projectId,
        actorId: user?.id,
        entityType: "ISSUE",
        entityId: issue.id,
        action: "UPDATED",
        payload: body,
      },
    });

    return NextResponse.json({
      data: { issueId: issue.id, task: updatedTask },
    });
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
      { error: "Failed to update issue" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    const issue = await prisma.issue.findUnique({
      where: { id: params.id },
      include: { task: true },
    });

    if (!issue) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await ensureProjectRole(
      user,
      issue.task.projectId,
      Permission.issueWriteRoles
    );

    await prisma.issue.delete({ where: { id: params.id } });
    const updatedTask = await recalcTaskEndDate(prisma, issue.taskId);

    await prisma.auditLog.create({
      data: {
        projectId: issue.task.projectId,
        actorId: user?.id,
        entityType: "ISSUE",
        entityId: issue.id,
        action: "DELETED",
      },
    });

    return NextResponse.json({ data: { task: updatedTask } });
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete issue" },
      { status: 500 }
    );
  }
}
