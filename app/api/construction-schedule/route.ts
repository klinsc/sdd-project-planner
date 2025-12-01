import { NextResponse } from "next/server";
import {
  buildTimeline,
  calculateProgress,
  constructionSchedule,
  findOverlaps,
  generateAlerts,
  scheduleTasks,
  suggestResourceLeveling,
  toCsv,
  toGanttDataset,
} from "@/lib/constructionSchedule";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const horizonParam = searchParams.get("horizonDays");
    const resourceFilter = searchParams.get("resource") ?? undefined;
    const dateParam = searchParams.get("date");

    const parsedHorizon = horizonParam
      ? Number.parseInt(horizonParam, 10)
      : Number.NaN;
    const horizonDays = Number.isFinite(parsedHorizon)
      ? Math.max(parsedHorizon, 0)
      : 3;

    const parsedDate = dateParam ? new Date(dateParam) : undefined;
    const referenceDate =
      parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate
        : new Date();

    const tasks = scheduleTasks;

    return NextResponse.json({
      schedule: constructionSchedule,
      tasks,
      timeline: buildTimeline(tasks),
      overlaps: findOverlaps(tasks, resourceFilter ?? undefined),
      progress: calculateProgress(tasks),
      alerts: generateAlerts(tasks, referenceDate, horizonDays),
      csv: toCsv(tasks),
      gantt: toGanttDataset(tasks),
      resourceRecommendations: suggestResourceLeveling(
        tasks,
        resourceFilter ?? undefined
      ),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load schedule" },
      { status: 500 }
    );
  }
}
