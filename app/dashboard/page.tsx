import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureGlobalRole } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import ProjectSelector from "@/components/ProjectSelector";

const projectFormSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  startDate: z.string().min(1),
  endDateTarget: z.string().optional(),
});

async function createProject(formData: FormData) {
  "use server";
  const user = ensureGlobalRole(await getCurrentUser(), [Role.ADMIN]);

  const payload = {
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    startDate: formData.get("startDate"),
    endDateTarget: formData.get("endDateTarget") ?? undefined,
  };

  const parsed = projectFormSchema.parse(payload);
  const startDate = new Date(parsed.startDate);
  const endDateTarget = parsed.endDateTarget
    ? new Date(parsed.endDateTarget)
    : undefined;

  await prisma.project.create({
    data: {
      name: parsed.name,
      description: parsed.description,
      startDate,
      endDateTarget,
      createdById: user.id,
      members: {
        create: { userId: user.id, role: Role.ADMIN },
      },
    },
  });

  revalidatePath("/dashboard");
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/api/auth/signin");
  }

  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id },
    include: { project: true },
    orderBy: { project: { createdAt: "desc" } },
  });

  const projects = memberships.map((member) => ({
    id: member.projectId,
    name: member.project.name,
    description: member.project.description,
    role: member.role,
  }));

  return (
    <section className="space-y-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-slate-500">
          Workspace
        </p>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-slate-600">
          Select a project to view its summary and Gantt timeline.
        </p>
      </header>

      <ProjectSelector projects={projects} />

      {user.globalRole === Role.ADMIN && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Create Project</h2>
          <p className="text-sm text-slate-600">
            Admins can bootstrap new initiatives and assign themselves as
            owners.
          </p>
          <form
            action={createProject}
            className="mt-4 grid gap-4 md:grid-cols-2"
          >
            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="name"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                minLength={3}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="startDate"
              >
                Start date
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                required
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="description"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="endDateTarget"
              >
                Target end date
              </label>
              <input
                id="endDateTarget"
                name="endDateTarget"
                type="date"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Create project
              </button>
            </div>
          </form>
        </section>
      )}
    </section>
  );
}
