import { describe, expect, it } from "vitest";
import {
  ensureGlobalRole,
  PermissionError,
  canManageMembers,
} from "@/lib/permissions";
import { Role } from "@prisma/client";

describe("ensureGlobalRole", () => {
  it("returns user when role is allowed", () => {
    const user = {
      id: "1",
      email: "admin@example.com",
      globalRole: Role.ADMIN,
    } as const;
    const result = ensureGlobalRole(user, [Role.ADMIN, Role.MANAGER]);
    expect(result).toBe(user);
  });

  it("throws when user is missing", () => {
    expect(() => ensureGlobalRole(null, [Role.ADMIN])).toThrowError(
      PermissionError
    );
  });

  it("throws when role not allowed", () => {
    const user = {
      id: "2",
      email: "viewer@example.com",
      globalRole: Role.VIEWER,
    } as const;
    expect(() => ensureGlobalRole(user, [Role.ADMIN])).toThrowError(
      PermissionError
    );
  });
});

describe("canManageMembers", () => {
  it("allows admins and managers", () => {
    expect(canManageMembers(Role.ADMIN)).toBe(true);
    expect(canManageMembers(Role.MANAGER)).toBe(true);
  });

  it("denies members and viewers", () => {
    expect(canManageMembers(Role.MEMBER)).toBe(false);
    expect(canManageMembers(Role.VIEWER)).toBe(false);
  });
});
