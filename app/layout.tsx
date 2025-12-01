import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "SDD Project Planner",
  description: "Multi-project Gantt management with RBAC",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </body>
    </html>
  );
}
