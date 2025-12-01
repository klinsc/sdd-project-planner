"use client";

import { Role } from "@prisma/client";
import { ReactNode } from "react";

type PermissionsGuardProps = {
  role: Role;
  allowed: Role[];
  children: ReactNode;
  fallback?: ReactNode;
};

export default function PermissionsGuard({
  role,
  allowed,
  children,
  fallback = null,
}: PermissionsGuardProps) {
  if (!allowed.includes(role)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
