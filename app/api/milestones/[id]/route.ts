import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureProjectRole, PermissionError } from "@/lib/permissions";
import { Role } from "@prisma/client";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  date: z.coerce.date().optional(),
  relatedTaskId: z.string().optional().nullable(),
});

interface RouteParams {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const milestone = await prisma.milestone.findUnique({
      where: { id: params.id },
    });
    if (!milestone) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await ensureProjectRole(user, milestone.projectId, [
      Role.ADMIN,
      Role.MANAGER,
    ]);

    const body = updateSchema.parse(await request.json());

    const updated = await prisma.milestone.update({
      where: { id: params.id },
      data: body,
    });

    return NextResponse.json({ data: updated });
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
      { error: "Failed to update milestone" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const milestone = await prisma.milestone.findUnique({
      where: { id: params.id },
    });
    if (!milestone) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await ensureProjectRole(user, milestone.projectId, [
      Role.ADMIN,
      Role.MANAGER,
    ]);

    await prisma.milestone.delete({ where: { id: params.id } });

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
      { error: "Failed to delete milestone" },
      { status: 500 }
    );
  }
}
