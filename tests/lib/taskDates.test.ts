import { describe, expect, it, vi } from "vitest";
import { computeEndDateFinal, recalcTaskEndDate } from "@/lib/taskDates";

describe("computeEndDateFinal", () => {
  it("adds delay days and issue durations to the original end date", () => {
    const original = new Date("2025-01-10T00:00:00Z");
    const result = computeEndDateFinal(original, 2, [3, 5]);

    expect(result.toISOString()).toBe("2025-01-20T00:00:00.000Z");
  });
});

describe("recalcTaskEndDate", () => {
  it("updates task end date based on issues and delay", async () => {
    const mockTask = {
      id: "task-123",
      endDateOriginal: new Date("2025-02-01T00:00:00Z"),
      delayDays: 1,
      issues: [{ durationDays: 2 }, { durationDays: 4 }],
    };

    const mockClient = {
      task: {
        findUnique: vi.fn().mockResolvedValue(mockTask),
        update: vi
          .fn()
          .mockResolvedValue({
            ...mockTask,
            endDateFinal: new Date("2025-02-08T00:00:00Z"),
          }),
      },
    } as any;

    const updated = await recalcTaskEndDate(mockClient, "task-123");

    expect(mockClient.task.findUnique).toHaveBeenCalledWith({
      where: { id: "task-123" },
      include: { issues: true },
    });
    expect(mockClient.task.update).toHaveBeenCalled();
    expect(updated.endDateFinal.toISOString()).toBe("2025-02-08T00:00:00.000Z");
  });
});
