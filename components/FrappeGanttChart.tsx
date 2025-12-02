"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GanttTask, GanttViewMode } from "frappe-gantt";
import "node_modules/frappe-gantt/dist/frappe-gantt.css";

const VIEW_OPTIONS: GanttViewMode[] = ["Day", "Week", "Month", "Year"];

export type FrappeTask = {
  id: string;
  name: string;
  start: Date | string;
  end: Date | string;
  progress?: number;
  dependencies?: string;
  custom_class?: string;
  meta?: {
    owner?: string;
    priority?: string;
    description?: string;
  };
};

type NormalizedTask = Omit<FrappeTask, "start" | "end"> & {
  start: Date;
  end: Date;
};

interface FrappeGanttChartProps {
  tasks: FrappeTask[];
  viewMode?: "Day" | "Week" | "Month" | "Year";
}

export default function FrappeGanttChart({
  tasks,
  viewMode = "Week",
}: FrappeGanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(viewMode);
  const orderedViewModes = useMemo(() => {
    // Keep the active view first so frappe-gantt does not reset to another mode.
    return [view, ...VIEW_OPTIONS.filter((mode) => mode !== view)];
  }, [view]);

  const sanitizedTasks = useMemo<NormalizedTask[]>(
    () =>
      tasks.map((task) => ({
        ...task,
        start: task.start instanceof Date ? task.start : new Date(task.start),
        end: task.end instanceof Date ? task.end : new Date(task.end),
      })),
    [tasks]
  );

  useEffect(() => {
    let gantt: any;
    const render = async () => {
      const { default: Gantt } = await import("frappe-gantt");
      if (!containerRef.current) return;
      containerRef.current.innerHTML = "";
      gantt = new Gantt(containerRef.current, sanitizedTasks as GanttTask[], {
        view_modes: orderedViewModes,
        view_mode: view,
        custom_popup_html: (task: GanttTask) => {
          const normalized = task as NormalizedTask;
          const lines = [
            `<h5 class="font-semibold text-base">${normalized.name}</h5>`,
            `<p class="text-xs text-slate-500">${normalized.start.toDateString()} → ${normalized.end.toDateString()}</p>`,
            `<p class="text-xs mt-2">Progress: ${
              normalized.progress ?? 0
            }%</p>`,
          ];
          if (normalized.meta?.owner) {
            lines.push(
              `<p class="text-xs">Owner: ${normalized.meta.owner}</p>`
            );
          }
          if (normalized.meta?.priority) {
            lines.push(
              `<p class="text-xs">Priority: ${normalized.meta.priority}</p>`
            );
          }
          if (normalized.meta?.description) {
            lines.push(
              `<p class="text-xs mt-2">${normalized.meta.description}</p>`
            );
          }
          return `<div class="rounded-md bg-white p-3 shadow">${lines.join(
            ""
          )}</div>`;
        },
      });
    };
    render();
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [orderedViewModes, sanitizedTasks, view]);

  // effect: save view mode to local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sdd-frappeGanttViewMode", view);
    }
  }, [view]);

  // effect: load view mode from local storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedView = window.localStorage.getItem("sdd-frappeGanttViewMode");
      if (
        savedView === "Day" ||
        savedView === "Week" ||
        savedView === "Month" ||
        savedView === "Year"
      ) {
        setView(savedView);
      }
    }
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">View:</span>
        {VIEW_OPTIONS.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setView(mode as GanttViewMode)}
            className={`rounded-md border px-3 py-1 ${
              view === mode
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 text-slate-600"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div ref={containerRef} className="min-w-[640px]" />
      </div>
    </div>
  );
}
