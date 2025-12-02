import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import FrappeGanttChart, {
  type FrappeTask,
} from "@/components/FrappeGanttChart";
import { format } from "date-fns";

const MOCK_TASKS: FrappeTask[] = [
  {
    id: "1",
    name: "Task 1",
    start: "2024-07-01",
    end: "2024-07-05",
    progress: 20,
  },
  {
    id: "2",
    name: "Task 2",
    start: "2024-07-03",
    end: "2024-07-10",
    progress: 50,
    dependencies: "1",
  },
  {
    id: "3",
    name: "Task 3",
    start: "2024-07-08",
    end: "2024-07-15",
    progress: 80,
    dependencies: "2",
  },
];

export default async function FrappeGanttPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-slate-500">
          Gantt (Frappe)
        </p>
        <h1 className="text-3xl font-semibold">{"example project"}</h1>
        <p className="text-slate-600">
          Snapshot generated {format(new Date(), "MMM d, yyyy")} from current
          task data.
        </p>
      </header>

      {MOCK_TASKS.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
          No tasks yet — add one to visualize the schedule.
        </p>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <FrappeGanttChart tasks={MOCK_TASKS} />
        </div>
      )}
    </section>
  );
}
