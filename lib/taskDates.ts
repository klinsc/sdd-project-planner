import { Prisma, PrismaClient } from "@prisma/client";

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

export function computeEndDateFinal(
  endDateOriginal: Date,
  delayDays: number,
  issueDurations: number[] = []
) {
  const totalDelay =
    delayDays + issueDurations.reduce((sum, value) => sum + value, 0);
  const result = new Date(endDateOriginal);
  result.setUTCDate(result.getUTCDate() + totalDelay);
  return result;
}

export async function recalcTaskEndDate(
  client: PrismaClientLike,
  taskId: string
) {
  const task = await client.task.findUnique({
    where: { id: taskId },
    include: { issues: true },
  });

  if (!task) {
    throw new Error("TASK_NOT_FOUND");
  }

  const endDateFinal = computeEndDateFinal(
    task.endDateOriginal,
    task.delayDays,
    task.issues.map((issue) => issue.durationDays)
  );

  return client.task.update({
    where: { id: taskId },
    data: { endDateFinal },
  });
}
