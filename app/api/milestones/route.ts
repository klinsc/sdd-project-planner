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

const milestoneSchema = z.object({
  projectId: z.string().cuid(),
  name: z.string().min(2),
  date: z.coerce.date(),
  relatedTaskId: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    await ensureProjectRole(user, projectId, Permission.readableRoles);

    const milestones = await prisma.milestone.findMany({
      where: { projectId },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ data: milestones });
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load milestones" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = milestoneSchema.parse(await request.json());
    const user = await getCurrentUser();
    await ensureProjectRole(user, body.projectId, [Role.ADMIN, Role.MANAGER]);

    const milestone = await prisma.milestone.create({ data: body });

    return NextResponse.json({ data: milestone }, { status: 201 });
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
      { error: "Failed to create milestone" },
      { status: 500 }
    );
  }
}
