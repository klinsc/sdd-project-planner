'use client';

import clsx from 'clsx';
import { addDays, differenceInCalendarDays, format } from 'date-fns';

type GanttTask = {
  id: string;
  title: string;
  startDate: string;
  endDateOriginal: string;
  endDateFinal: string;
  delayDays: number;
  ownerName?: string;
  progress: number;
  priority: string;
};

type GanttMilestone = {
  id: string;
  name: string;
  date: string;
  relatedTaskId?: string | null;
};

interface Props {
  tasks: GanttTask[];
  milestones: GanttMilestone[];
}

export default function Gantt({ tasks, milestones }: Props) {
  if (!tasks.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
        No tasks yet. Use the task editor to create the first bar.
      </div>
    );
  }

  const sortedTasks = [...tasks].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  const rangeStart = new Date(sortedTasks[0].startDate);
  const rangeEnd = sortedTasks.reduce((latest, task) => {
    const candidate = new Date(task.endDateFinal);
    return candidate > latest ? candidate : latest;
  }, new Date(sortedTasks[0].endDateFinal));
  const rangeDays = Math.max(1, differenceInCalendarDays(rangeEnd, rangeStart));

  const headerDays = Array.from({ length: rangeDays + 1 }, (_, index) =>
    addDays(rangeStart, index)
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap gap-6 text-xs text-slate-500">
        <span>
          Range: {format(rangeStart, 'MMM d')} → {format(rangeEnd, 'MMM d')}
        </span>
        <span>Tasks: {tasks.length}</span>
        <span>// TODO: Wire realtime updates with WebSocket/Pusher subscriptions here.</span>
      </div>

      <div className="mb-2 hidden min-w-max grid-cols-[220px_1fr] gap-4 text-xs font-semibold text-slate-500 md:grid">
        <span>Task</span>
        <div className="flex justify-between">
          {headerDays
            .filter((_, index) => index % Math.ceil(rangeDays / 6 || 1) === 0)
            .map((day) => (
              <span key={day.toISOString()}>{format(day, 'MMM d')}</span>
            ))}
        </div>
      </div>

      <div className="space-y-4">
        {sortedTasks.map((task) => {
          const startOffset =
            (differenceInCalendarDays(new Date(task.startDate), rangeStart) / rangeDays) * 100;
          const duration = Math.max(
            2,
            (differenceInCalendarDays(new Date(task.endDateFinal), new Date(task.startDate)) /
              rangeDays) *
              100
          );
          return (
            <div key={task.id} className="grid min-w-max grid-cols-[220px_1fr] items-center gap-4">
              <div>
                <p className="font-medium text-slate-900">{task.title}</p>
                <p className="text-xs text-slate-500">
                  {task.ownerName ?? 'Unassigned'} · {task.progress}% · {task.priority}
                </p>
              </div>
              <div className="relative h-10 rounded bg-slate-100">
                <div
                  className={clsx(
                    'absolute top-1 bottom-1 rounded px-2 text-xs font-semibold text-white',
                    task.delayDays > 0 ? 'bg-amber-500' : 'bg-brand-500'
                  )}
                  style={{ left: `${startOffset}%`, width: `${duration}%` }}
                >
                  <span className="hidden lg:inline">
                    {format(new Date(task.startDate), 'MMM d')} –{' '}
                    {format(new Date(task.endDateFinal), 'MMM d')}
                  </span>
                </div>
                {milestones.map((milestone) => {
                  const offset =
                    (differenceInCalendarDays(new Date(milestone.date), rangeStart) / rangeDays) *
                    100;
                  return (
                    <div
                      key={`${task.id}-${milestone.id}`}
                      className="pointer-events-none absolute -top-1 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-emerald-500"
                      style={{ left: `${offset}%` }}
                      title={`${milestone.name} · ${format(new Date(milestone.date), 'MMM d')}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
