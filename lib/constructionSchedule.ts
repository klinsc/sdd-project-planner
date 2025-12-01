const DAY_IN_MS = 86_400_000;

const asDate = (value: string) => new Date(`${value}T00:00:00Z`);
const diffDays = (start: string, end: string) =>
  Math.round((asDate(end).getTime() - asDate(start).getTime()) / DAY_IN_MS) + 1;

export type ScheduleTask = {
  id: string;
  phase: string;
  name: string;
  start: string; // ISO date
  end: string; // ISO date
  dependencies?: string[];
  resources?: string[];
  crewSize?: number;
  percentComplete?: number;
  notes?: string;
};

type PhaseTask = Omit<ScheduleTask, "phase">;

export type ConstructionSchedule = {
  project: string;
  baselineStart: string;
  baselineEnd: string;
  timezone: string;
  phases: {
    name: string;
    tasks: PhaseTask[];
  }[];
};

export const constructionSchedule: ConstructionSchedule = {
  project: "F apartment new construction",
  baselineStart: "2025-11-05",
  baselineEnd: "2025-12-04",
  timezone: "UTC",
  phases: [
    {
      name: "Temporary works",
      tasks: [
        {
          id: "TEMP-CORE",
          name: "Temporary works",
          start: "2025-11-09",
          end: "2025-12-04",
          resources: ["logistics"],
          crewSize: 6,
          percentComplete: 35,
        },
        {
          id: "TEMP-CARRY",
          name: "Carrying in",
          start: "2025-11-13",
          end: "2025-11-21",
          dependencies: ["TEMP-CORE"],
          resources: ["logistics"],
          crewSize: 4,
          percentComplete: 15,
        },
        {
          id: "TEMP-PREP",
          name: "Preparation",
          start: "2025-11-15",
          end: "2025-11-18",
          dependencies: ["TEMP-CORE"],
          resources: ["logistics", "hse"],
          crewSize: 3,
          percentComplete: 20,
        },
        {
          id: "TEMP-SCAF-ASSY",
          name: "Assembling scaffolding",
          start: "2025-11-13",
          end: "2025-11-24",
          dependencies: ["TEMP-PREP"],
          resources: ["scaffolding"],
          crewSize: 6,
          percentComplete: 60,
        },
        {
          id: "TEMP-SCAF-CLEAN",
          name: "Scaffolding dismantling / cleaning",
          start: "2025-11-10",
          end: "2025-11-30",
          dependencies: ["TEMP-SCAF-ASSY"],
          resources: ["scaffolding"],
          crewSize: 6,
          percentComplete: 0,
          notes: "Scheduled overlap with assembly; consider staging.",
        },
      ],
    },
    {
      name: "Soil / Foundation",
      tasks: [
        {
          id: "SOIL-CORE",
          name: "Soil / foundation work",
          start: "2025-11-11",
          end: "2025-11-20",
          dependencies: ["TEMP-CORE"],
          resources: ["earthworks"],
          crewSize: 8,
          percentComplete: 50,
        },
        {
          id: "SOIL-PREP",
          name: "Foundation preparation",
          start: "2025-11-13",
          end: "2025-11-30",
          dependencies: ["SOIL-CORE"],
          resources: ["engineering"],
          crewSize: 4,
          percentComplete: 20,
        },
        {
          id: "SOIL-MAT",
          name: "Bringing in materials",
          start: "2025-11-05",
          end: "2025-11-16",
          resources: ["supply-chain"],
          crewSize: 3,
          percentComplete: 80,
        },
      ],
    },
    {
      name: "Plastering",
      tasks: [
        {
          id: "PLAST-CORE",
          name: "Plastering",
          start: "2025-11-13",
          end: "2025-11-19",
          dependencies: ["SOIL-CORE", "TEMP-SCAF-ASSY"],
          resources: ["plaster"],
          crewSize: 5,
          percentComplete: 5,
        },
        {
          id: "PLAST-OUTER",
          name: "Outer wall",
          start: "2025-11-09",
          end: "2025-11-26",
          dependencies: ["TEMP-SCAF-ASSY"],
          resources: ["facade"],
          crewSize: 5,
          percentComplete: 0,
          notes: "Starts before plaster core ends; sequencing review required.",
        },
      ],
    },
  ],
};

export const scheduleTasks: ScheduleTask[] =
  flattenSchedule(constructionSchedule);

export type TimelineSummary = {
  projectStart: string;
  projectEnd: string;
  totalDurationDays: number;
  phaseSummaries: Record<
    string,
    { start: string; end: string; durationDays: number; taskCount: number }
  >;
};

export type Overlap = {
  taskA: ScheduleTask;
  taskB: ScheduleTask;
  overlapDays: number;
  sharedResources: string[];
};

export type ProgressSnapshot = {
  overall: number;
  byPhase: Record<string, number>;
};

export type ScheduleAlert = {
  taskId: string;
  taskName: string;
  type: "start" | "deadline";
  dueInDays: number;
};

export type GanttDatasetItem = {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies: string;
};

export type ResourceRecommendation = {
  resource: string;
  tasks: [string, string];
  overlapDays: number;
  recommendation: string;
};

export function flattenSchedule(
  schedule: ConstructionSchedule
): ScheduleTask[] {
  return schedule.phases.flatMap((phase) =>
    phase.tasks.map((task) => ({ ...task, phase: phase.name }))
  );
}

export function buildTimeline(tasks: ScheduleTask[]): TimelineSummary {
  const ordered = [...tasks].sort(
    (a, b) => asDate(a.start).getTime() - asDate(b.start).getTime()
  );
  if (ordered.length === 0) {
    return {
      projectStart: "",
      projectEnd: "",
      totalDurationDays: 0,
      phaseSummaries: {},
    };
  }
  const projectStart = ordered[0]?.start ?? "";
  const projectEnd = ordered.reduce(
    (latest, task) => (asDate(task.end) > asDate(latest) ? task.end : latest),
    ordered[0]?.end ?? ""
  );

  const phaseSummaries = ordered.reduce<TimelineSummary["phaseSummaries"]>(
    (acc, task) => {
      const summary = acc[task.phase];
      if (!summary) {
        acc[task.phase] = {
          start: task.start,
          end: task.end,
          durationDays: diffDays(task.start, task.end),
          taskCount: 1,
        };
      } else {
        if (asDate(task.start) < asDate(summary.start)) {
          summary.start = task.start;
        }
        if (asDate(task.end) > asDate(summary.end)) {
          summary.end = task.end;
        }
        summary.durationDays = diffDays(summary.start, summary.end);
        summary.taskCount += 1;
      }
      return acc;
    },
    {}
  );

  return {
    projectStart,
    projectEnd,
    totalDurationDays:
      projectStart && projectEnd ? diffDays(projectStart, projectEnd) : 0,
    phaseSummaries,
  };
}

export function findOverlaps(
  tasks: ScheduleTask[],
  resourceFilter?: string
): Overlap[] {
  const overlaps: Overlap[] = [];
  for (let i = 0; i < tasks.length; i += 1) {
    for (let j = i + 1; j < tasks.length; j += 1) {
      const a = tasks[i];
      const b = tasks[j];
      if (
        resourceFilter &&
        !(a.resources ?? []).includes(resourceFilter) &&
        !(b.resources ?? []).includes(resourceFilter)
      ) {
        continue;
      }
      const latestStart =
        asDate(a.start).getTime() > asDate(b.start).getTime()
          ? asDate(a.start)
          : asDate(b.start);
      const earliestEnd =
        asDate(a.end).getTime() < asDate(b.end).getTime()
          ? asDate(a.end)
          : asDate(b.end);
      const overlapMs = earliestEnd.getTime() - latestStart.getTime();
      if (overlapMs < 0) {
        continue;
      }
      const overlapDays = Math.floor(overlapMs / DAY_IN_MS) + 1;
      const sharedResources = (a.resources ?? []).filter((resource) =>
        (b.resources ?? []).includes(resource)
      );
      overlaps.push({ taskA: a, taskB: b, overlapDays, sharedResources });
    }
  }
  return overlaps;
}

export function calculateProgress(tasks: ScheduleTask[]): ProgressSnapshot {
  const totals = tasks.reduce(
    (acc, task) => {
      const duration = diffDays(task.start, task.end);
      const weight = duration * (task.crewSize ?? 1);
      const completionRatio = (task.percentComplete ?? 0) / 100;
      acc.weighted += weight;
      acc.completed += weight * completionRatio;
      const phaseTotals = acc.byPhase[task.phase] ?? {
        completed: 0,
        weighted: 0,
      };
      phaseTotals.weighted += weight;
      phaseTotals.completed += weight * completionRatio;
      acc.byPhase[task.phase] = phaseTotals;
      return acc;
    },
    {
      weighted: 0,
      completed: 0,
      byPhase: {} as Record<string, { completed: number; weighted: number }>,
    }
  );

  const byPhase = Object.fromEntries(
    Object.entries(totals.byPhase).map(([phase, { completed, weighted }]) => [
      phase,
      weighted ? Math.round((completed / weighted) * 100) : 0,
    ])
  );

  return {
    overall: totals.weighted
      ? Math.round((totals.completed / totals.weighted) * 100)
      : 0,
    byPhase,
  };
}

export function generateAlerts(
  tasks: ScheduleTask[],
  today = new Date(),
  horizonDays = 3
): ScheduleAlert[] {
  const normalizedToday = new Date(
    `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}-${String(today.getUTCDate()).padStart(2, "0")}T00:00:00Z`
  );
  return tasks.flatMap((task) => {
    const startDelta = Math.ceil(
      (asDate(task.start).getTime() - normalizedToday.getTime()) / DAY_IN_MS
    );
    const endDelta = Math.ceil(
      (asDate(task.end).getTime() - normalizedToday.getTime()) / DAY_IN_MS
    );
    const alerts: ScheduleAlert[] = [];
    if (startDelta >= 0 && startDelta <= horizonDays) {
      alerts.push({
        taskId: task.id,
        taskName: task.name,
        type: "start",
        dueInDays: startDelta,
      });
    }
    if (endDelta >= 0 && endDelta <= horizonDays) {
      alerts.push({
        taskId: task.id,
        taskName: task.name,
        type: "deadline",
        dueInDays: endDelta,
      });
    }
    return alerts;
  });
}

export function toCsv(tasks: ScheduleTask[]): string {
  const header =
    "id,phase,name,start,end,dependencies,resources,crewSize,percentComplete,notes";
  const rows = tasks.map((task) =>
    [
      task.id,
      task.phase,
      JSON.stringify(task.name),
      task.start,
      task.end,
      (task.dependencies ?? []).join("|"),
      (task.resources ?? []).join("|"),
      task.crewSize ?? "",
      task.percentComplete ?? "",
      task.notes ? JSON.stringify(task.notes) : "",
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

export function toGanttDataset(tasks: ScheduleTask[]): GanttDatasetItem[] {
  return tasks.map((task) => ({
    id: task.id,
    name: `${task.phase}: ${task.name}`,
    start: task.start,
    end: task.end,
    progress: task.percentComplete ?? 0,
    dependencies: (task.dependencies ?? []).join(","),
  }));
}

export function suggestResourceLeveling(
  tasks: ScheduleTask[],
  resourceFilter?: string
): ResourceRecommendation[] {
  return findOverlaps(tasks, resourceFilter)
    .filter((entry) => entry.sharedResources.length > 0)
    .map((entry) => ({
      resource: entry.sharedResources.join(", "),
      tasks: [entry.taskA.id, entry.taskB.id],
      overlapDays: entry.overlapDays,
      recommendation: `Shift ${entry.taskB.id} by ${
        entry.overlapDays
      } day(s) or split crew for resource ${entry.sharedResources.join(", ")}`,
    }));
}
