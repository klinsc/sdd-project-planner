import { PrismaClient, Priority, Role } from "@prisma/client";

const prisma = new PrismaClient();

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const computeEndDateFinal = (
  endDateOriginal: Date,
  delayDays: number,
  issueDurations: number[] = []
) => {
  const totalDelay =
    delayDays + issueDurations.reduce((sum, value) => sum + value, 0);
  return addDays(endDateOriginal, totalDelay);
};

async function recalcTask(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { issues: true },
  });
  if (!task) return;
  const endDateFinal = computeEndDateFinal(
    task.endDateOriginal,
    task.delayDays,
    task.issues.map((i) => i.durationDays)
  );
  await prisma.task.update({ where: { id: taskId }, data: { endDateFinal } });
}

async function main() {
  console.log("Seeding database...");

  await prisma.auditLog.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin User",
      globalRole: Role.ADMIN,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "pm@example.com",
      name: "Project Manager",
      globalRole: Role.MANAGER,
    },
  });

  const member = await prisma.user.create({
    data: {
      email: "member@example.com",
      name: "Team Member",
      globalRole: Role.MEMBER,
    },
  });

  const projectAlpha = await prisma.project.create({
    data: {
      name: "Alpha Expansion",
      description: "Migration of the legacy planner to a multi-tenant system.",
      startDate: new Date("2025-01-01T00:00:00Z"),
      endDateTarget: new Date("2025-04-30T00:00:00Z"),
      createdById: admin.id,
      members: {
        create: [
          { userId: admin.id, role: Role.ADMIN },
          { userId: manager.id, role: Role.MANAGER },
          { userId: member.id, role: Role.MEMBER },
        ],
      },
    },
  });

  const discoveryTask = await prisma.task.create({
    data: {
      projectId: projectAlpha.id,
      title: "Discovery & Requirements",
      description: "Interview stakeholders and define scope.",
      startDate: new Date("2025-01-02T00:00:00Z"),
      endDateOriginal: new Date("2025-01-20T00:00:00Z"),
      delayDays: 2,
      endDateFinal: computeEndDateFinal(new Date("2025-01-20T00:00:00Z"), 2),
      ownerId: manager.id,
      progress: 80,
      priority: Priority.HIGH,
    },
  });

  const implementationTask = await prisma.task.create({
    data: {
      projectId: projectAlpha.id,
      title: "Core Implementation",
      description: "Build scheduling engine and Gantt UI.",
      startDate: new Date("2025-01-22T00:00:00Z"),
      endDateOriginal: new Date("2025-03-01T00:00:00Z"),
      delayDays: 0,
      endDateFinal: computeEndDateFinal(new Date("2025-03-01T00:00:00Z"), 0),
      ownerId: member.id,
      progress: 25,
      priority: Priority.CRITICAL,
      parentTaskId: discoveryTask.id,
    },
  });

  await prisma.milestone.createMany({
    data: [
      {
        projectId: projectAlpha.id,
        name: "Requirements Sign-off",
        date: new Date("2025-01-21T00:00:00Z"),
        relatedTaskId: discoveryTask.id,
      },
      {
        projectId: projectAlpha.id,
        name: "MVP Complete",
        date: new Date("2025-03-05T00:00:00Z"),
        relatedTaskId: implementationTask.id,
      },
    ],
  });

  const slippage = await prisma.issue.create({
    data: {
      taskId: implementationTask.id,
      title: "API Contract Change",
      startDate: new Date("2025-02-10T00:00:00Z"),
      durationDays: 5,
      description: "External dependency pushed a breaking change.",
      createdById: manager.id,
    },
  });

  await recalcTask(discoveryTask.id);
  await recalcTask(implementationTask.id);

  await prisma.auditLog.create({
    data: {
      projectId: projectAlpha.id,
      actorId: manager.id,
      entityType: "ISSUE",
      entityId: slippage.id,
      action: "CREATED",
      payload: {
        message: "Initial schedule variance recorded via seed.",
      },
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
