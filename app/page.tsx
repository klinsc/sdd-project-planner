import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureProjectRole, Permission } from "@/lib/permissions";
import FrappeGanttChart, {
  type FrappeTask,
} from "@/components/FrappeGanttChart";
import { format } from "date-fns";

interface ProjectParams {
  params: { projectId: string };
}

export default async function ProjectFrappeGanttPage({
  params,
}: ProjectParams) {
  const user = await getCurrentUser();
  try {
    await ensureProjectRole(user, params.projectId, Permission.readableRoles);
  } catch {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      tasks: {
        include: { owner: true },
        orderBy: { startDate: "asc" },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const frappeTasks: FrappeTask[] = project.tasks.map((task) => ({
    id: task.id,
    name: task.title,
    start: task.startDate.toISOString(),
    end: (task.endDateFinal ?? task.endDateOriginal).toISOString(),
    progress: task.progress,
    dependencies: task.parentTaskId ?? undefined,
    custom_class: `priority-${task.priority.toLowerCase()}`,
    meta: {
      owner: task.owner?.name ?? task.owner?.email ?? "Unassigned",
      priority: task.priority,
      description: task.description ?? undefined,
    },
  }));

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-slate-500">
          Gantt (Frappe)
        </p>
        <h1 className="text-3xl font-semibold">{project.name}</h1>
        <p className="text-slate-600">
          Snapshot generated {format(new Date(), "MMM d, yyyy")} from current
          task data.
        </p>
      </header>

      {frappeTasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
          No tasks yet — add one to visualize the schedule.
        </p>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <FrappeGanttChart tasks={frappeTasks} />
        </div>
      )}
    </section>
  );
}
