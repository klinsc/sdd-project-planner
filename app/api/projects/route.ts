import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureGlobalRole, PermissionError } from "@/lib/permissions";
import { Role } from "@prisma/client";

const createProjectSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  startDate: z.coerce.date(),
  endDateTarget: z.coerce.date().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await prisma.projectMember.findMany({
      where: { userId: user.id },
      include: { project: true },
      orderBy: { project: { createdAt: "desc" } },
    });

    const data = memberships.map((membership) => ({
      id: membership.projectId,
      name: membership.project.name,
      description: membership.project.description,
      role: membership.role,
      startDate: membership.project.startDate,
      endDateTarget: membership.project.endDateTarget,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    ensureGlobalRole(user, [Role.ADMIN]);

    const body = createProjectSchema.parse(await request.json());

    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description,
        startDate: body.startDate,
        endDateTarget: body.endDateTarget,
        createdById: user.id,
        members: {
          create: { userId: user.id, role: Role.ADMIN },
        },
      },
      include: { members: true },
    });

    return NextResponse.json({ data: project }, { status: 201 });
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
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
