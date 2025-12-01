import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureProjectRole, Permission } from "@/lib/permissions";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import Gantt from "@/components/Gantt";
import TaskEditorModal from "@/components/TaskEditorModal";
import MilestoneEditor from "@/components/MilestoneEditor";
import MemberManager from "@/components/MemberManager";
import PermissionsGuard from "@/components/PermissionsGuard";
import { ProjectContextProvider } from "@/components/ProjectContext";

interface ProjectParams {
  params: { projectId: string };
}

export default async function ProjectGanttPage({ params }: ProjectParams) {
  const user = await getCurrentUser();
  try {
    await ensureProjectRole(user, params.projectId, Permission.readableRoles);
  } catch {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      members: { include: { user: true }, orderBy: { createdAt: "asc" } },
      tasks: {
        include: { owner: true },
        orderBy: { startDate: "asc" },
      },
      milestones: {
        orderBy: { date: "asc" },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const membership = project.members.find(
    (member) => member.userId === user?.id
  );
  const userRole =
    user?.globalRole === Role.ADMIN
      ? Role.ADMIN
      : membership?.role ?? Role.VIEWER;

  const ganttTasks = project.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    startDate: task.startDate.toISOString(),
    endDateOriginal: task.endDateOriginal.toISOString(),
    endDateFinal: task.endDateFinal.toISOString(),
    delayDays: task.delayDays,
    ownerName: task.owner?.name ?? task.owner?.email ?? "Unassigned",
    progress: task.progress,
    priority: task.priority,
  }));

  const ganttMilestones = project.milestones.map((milestone) => ({
    id: milestone.id,
    name: milestone.name,
    date: milestone.date.toISOString(),
    relatedTaskId: milestone.relatedTaskId,
  }));

  const ownerOptions = project.members.map((member) => ({
    id: member.userId,
    name: member.user.name ?? member.user.email ?? "Unassigned",
  }));

  return (
    <ProjectContextProvider project={{ id: project.id, name: project.name }}>
      <div className="space-y-8">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-slate-500">
            Gantt
          </p>
          <h1 className="text-3xl font-semibold">{project.name}</h1>
          <p className="text-slate-600">
            {project.description ?? "No description yet."}
          </p>
        </header>

        <div className="flex flex-wrap gap-4">
          <PermissionsGuard
            allowed={[Role.ADMIN, Role.MANAGER, Role.MEMBER]}
            role={userRole}
          >
            <TaskEditorModal
              projectId={project.id}
              members={ownerOptions}
              parentTasks={project.tasks.map((task) => ({
                id: task.id,
                title: task.title,
              }))}
            />
          </PermissionsGuard>
          <PermissionsGuard
            allowed={[Role.ADMIN, Role.MANAGER]}
            role={userRole}
          >
            <MilestoneEditor
              projectId={project.id}
              tasks={project.tasks.map((task) => ({
                id: task.id,
                title: task.title,
              }))}
            />
          </PermissionsGuard>
        </div>

        <Gantt tasks={ganttTasks} milestones={ganttMilestones} />

        <PermissionsGuard allowed={[Role.ADMIN, Role.MANAGER]} role={userRole}>
          <MemberManager
            projectId={project.id}
            initialMembers={project.members.map((member) => ({
              id: member.userId,
              email: member.user.email,
              name: member.user.name,
              role: member.role,
            }))}
          />
        </PermissionsGuard>
      </div>
    </ProjectContextProvider>
  );
}
