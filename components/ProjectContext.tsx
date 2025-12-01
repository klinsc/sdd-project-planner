"use client";

import { createContext, ReactNode, useContext } from "react";

type ProjectContextValue = {
  id: string;
  name: string;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectContextProvider({
  project,
  children,
}: {
  project: ProjectContextValue;
  children: ReactNode;
}) {
  return (
    <ProjectContext.Provider value={project}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error(
      "ProjectContext is missing. Wrap component with ProjectContextProvider."
    );
  }
  return context;
}
