import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureProjectRole, Permission } from "@/lib/permissions";
import { notFound } from "next/navigation";
import { format } from "date-fns";

interface ProjectParams {
  params: { projectId: string };
}

export default async function ProjectDashboardPage({ params }: ProjectParams) {
  const user = await getCurrentUser();
  try {
    await ensureProjectRole(user, params.projectId, Permission.readableRoles);
  } catch {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      tasks: true,
      milestones: true,
      members: { include: { user: true } },
    },
  });

  if (!project) {
    notFound();
  }

  const completed = project.tasks.filter((task) => task.progress >= 100).length;
  const averageProgress =
    project.tasks.length === 0
      ? 0
      : Math.round(
          project.tasks.reduce((sum, task) => sum + task.progress, 0) /
            project.tasks.length
        );

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm text-slate-500">
          Started {format(project.startDate, "MMM d, yyyy")}
        </p>
        <h1 className="text-3xl font-semibold">{project.name}</h1>
        <p className="text-slate-600">
          {project.description ?? "No description yet."}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Tasks</p>
          <p className="text-3xl font-semibold">{project.tasks.length}</p>
          <p className="text-xs text-slate-500">{completed} complete</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Average progress</p>
          <p className="text-3xl font-semibold">{averageProgress}%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Milestones</p>
          <p className="text-3xl font-semibold">{project.milestones.length}</p>
          <p className="text-xs text-slate-500">
            Next:{" "}
            {project.milestones[0]
              ? format(project.milestones[0].date, "MMM d")
              : "None scheduled"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Team</h2>
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          {project.members.map((member) => (
            <li key={member.userId} className="flex justify-between">
              <span>{member.user.name ?? member.user.email}</span>
              <span className="uppercase text-slate-500">{member.role}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
