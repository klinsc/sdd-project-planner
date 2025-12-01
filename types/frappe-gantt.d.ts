declare module "frappe-gantt" {
  export type GanttViewMode = "Day" | "Week" | "Month" | "Year";

  export type GanttTask = {
    id: string;
    name: string;
    start: Date | string;
    end: Date | string;
    progress?: number;
    dependencies?: string;
    custom_class?: string;
  };

  export interface GanttOptions {
    view_modes?: GanttViewMode[];
    view_mode?: GanttViewMode;
    custom_popup_html?: (task: GanttTask) => string;
    on_click?: (task: GanttTask) => void;
    on_date_change?: (task: GanttTask, start: Date, end: Date) => void;
    on_progress_change?: (task: GanttTask, progress: number) => void;
    on_view_change?: (mode: GanttViewMode) => void;
    language?: string;
    bar_height?: number;
    padding?: number;
  }

  export default class Gantt {
    constructor(
      element: string | Element,
      tasks: GanttTask[],
      options?: GanttOptions
    );
    refresh(tasks: GanttTask[]): void;
  }
}
