import { describe, expect, it } from "vitest";
import {
  buildTimeline,
  findOverlaps,
  scheduleTasks,
  suggestResourceLeveling,
  toCsv,
} from "@/lib/constructionSchedule";

describe("construction schedule helpers", () => {
  it("computes the overall timeline window", () => {
    const timeline = buildTimeline(scheduleTasks);
    expect(timeline.projectStart).toBe("2025-11-05");
    expect(timeline.projectEnd).toBe("2025-12-04");
    expect(timeline.totalDurationDays).toBeGreaterThan(25);
    expect(
      timeline.phaseSummaries["Temporary works"].taskCount
    ).toBeGreaterThan(0);
  });

  it("detects scaffolding overlap and recommendations", () => {
    const overlaps = findOverlaps(scheduleTasks, "scaffolding");
    const hasScaffoldingClash = overlaps.some(
      ({ taskA, taskB, sharedResources }) => {
        const ids = [taskA.id, taskB.id];
        return (
          ids.includes("TEMP-SCAF-ASSY") &&
          ids.includes("TEMP-SCAF-CLEAN") &&
          sharedResources.includes("scaffolding")
        );
      }
    );
    expect(hasScaffoldingClash).toBe(true);

    const recommendations = suggestResourceLeveling(
      scheduleTasks,
      "scaffolding"
    );
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0].resource).toContain("scaffolding");
  });

  it("exports csv rows for downstream tooling", () => {
    const csv = toCsv(scheduleTasks);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "id,phase,name,start,end,dependencies,resources,crewSize,percentComplete,notes"
    );
    expect(lines[1].startsWith("TEMP-CORE")).toBe(true);
  });
});
