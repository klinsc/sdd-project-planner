"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Priority } from "@prisma/client";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "./ui/label";

const taskSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  startDate: z.string(),
  endDateOriginal: z.string(),
  delayDays: z.coerce.number().min(0),
  ownerId: z.string().optional().nullable(),
  priority: z.nativeEnum(Priority),
  progress: z.coerce.number().min(0).max(100),
  parentTaskId: z.string().optional().nullable(),
});

type TaskEditorModalProps = {
  projectId: string;
  members: { id: string; name?: string | null }[];
  parentTasks?: { id: string; title: string }[];
  task?: {
    id: string;
    title: string;
    description?: string | null;
    startDate: string;
    endDateOriginal: string;
    delayDays: number;
    ownerId?: string | null;
    priority: Priority;
    progress: number;
    parentTaskId?: string | null;
  };
  triggerLabel?: string;
};

export default function TaskEditorModal({
  projectId,
  members,
  parentTasks = [],
  task,
  triggerLabel = "New Task",
}: TaskEditorModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const initialState = useMemo(
    () => ({
      title: task?.title ?? "",
      description: task?.description ?? "",
      startDate:
        task?.startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      endDateOriginal:
        task?.endDateOriginal?.slice(0, 10) ??
        new Date().toISOString().slice(0, 10),
      delayDays: task?.delayDays ?? 0,
      ownerId: task?.ownerId ?? "",
      priority: task?.priority ?? Priority.MEDIUM,
      progress: task?.progress ?? 0,
      parentTaskId: task?.parentTaskId ?? "",
    }),
    [task]
  );

  const [formState, setFormState] = useState(initialState);
  const parentOptions = useMemo(
    () => parentTasks.filter((parentTask) => parentTask.id !== task?.id),
    [parentTasks, task?.id]
  );

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const parsed = taskSchema.parse(formState);
        const payload = {
          ...parsed,
          parentTaskId: parsed.parentTaskId ? parsed.parentTaskId : null,
        };
        const endpoint = task ? `/api/tasks/${task.id}` : "/api/tasks";
        const method = task ? "PATCH" : "POST";
        const body = task ? payload : { ...payload, projectId };
        const response = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? "Request failed");
        }

        // TODO: publish optimistic updates to realtime channel once websocket wiring exists.
        setOpen(false);
        setFormState(initialState);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save task");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{task ? "Edit Task" : triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create Task"}</DialogTitle>
          <DialogDescription>
            Populate timing, ownership, and priority fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="parentTask">Parent Task</Label>
            <select
              id="parentTask"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={formState.parentTaskId ?? ""}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  parentTaskId: event.target.value || "",
                }))
              }
              disabled={isPending || parentOptions.length === 0}
            >
              <option value="">None</option>
              {parentOptions.map((parentTask) => (
                <option key={parentTask.id} value={parentTask.id}>
                  {parentTask.title}
                </option>
              ))}
            </select>
            {parentOptions.length === 0 && (
              <p className="text-xs text-slate-500">
                Add a few tasks first to enable nesting.
              </p>
            )}
          </div>

          <Input
            placeholder="Title"
            value={formState.title}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, title: event.target.value }))
            }
            disabled={isPending}
          />
          <Textarea
            placeholder="Description"
            value={formState.description}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                description: event.target.value,
              }))
            }
            disabled={isPending}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              type="date"
              value={formState.startDate}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  startDate: event.target.value,
                }))
              }
              disabled={isPending}
            />
            <Input
              type="date"
              value={formState.endDateOriginal}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  endDateOriginal: event.target.value,
                }))
              }
              disabled={isPending}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Label>Delay Days</Label>
            <Input
              type="number"
              min={0}
              value={formState.delayDays}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  delayDays: Number(event.target.value),
                }))
              }
              disabled={isPending}
            />
            <Label>Progress %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={formState.progress}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  progress: Number(event.target.value),
                }))
              }
              disabled={isPending}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={formState.ownerId ?? ""}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  ownerId: event.target.value,
                }))
              }
              disabled={isPending}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={formState.priority}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  priority: event.target.value as Priority,
                }))
              }
              disabled={isPending}
            >
              {Object.values(Priority).map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <DialogClose asChild>
            <Button variant="ghost" disabled={isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isPending}>
            {task ? "Save changes" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
