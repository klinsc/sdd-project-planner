"use client";

import { Role } from "@prisma/client";
import { useRouter } from "next/navigation";

type ProjectCard = {
  id: string;
  name: string;
  description?: string | null;
  role: Role;
};

export default function ProjectSelector({
  projects,
}: {
  projects: ProjectCard[];
}) {
  const router = useRouter();

  if (!projects.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
        You are not assigned to any projects yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {projects.map((project) => (
        <button
          key={project.id}
          onClick={() => router.push(`/projects/${project.id}/dashboard`)}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-card"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{project.name}</h3>
            <span className="text-xs font-semibold uppercase text-slate-500">
              {project.role}
            </span>
          </div>
          <p className="mt-2 h-12 overflow-hidden text-sm text-slate-600">
            {project.description ?? "No description yet."}
          </p>
        </button>
      ))}
    </div>
  );
}
