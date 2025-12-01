import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const { ensureProjectRoleMock } = vi.hoisted(() => ({
  ensureProjectRoleMock: vi.fn(),
}));

vi.mock("@/lib/permissions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/permissions")>(
    "@/lib/permissions"
  );
  return {
    ...actual,
    ensureProjectRole: ensureProjectRoleMock,
  };
});

const {
  prismaTaskFindMany,
  mockTaskCreate,
  mockAuditCreate,
  prismaTransaction,
} = vi.hoisted(() => {
  const prismaTaskFindMany = vi.fn();
  const mockTaskCreate = vi.fn();
  const mockAuditCreate = vi.fn();
  const prismaTransaction = vi.fn((callback: any) =>
    callback({
      task: { create: mockTaskCreate },
      auditLog: { create: mockAuditCreate },
    })
  );

  return {
    prismaTaskFindMany,
    mockTaskCreate,
    mockAuditCreate,
    prismaTransaction,
  };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    task: {
      findMany: prismaTaskFindMany,
    },
    $transaction: prismaTransaction,
  },
}));

import { getCurrentUser } from "@/lib/auth";
import { GET, POST } from "@/app/api/tasks/route";

const mockedGetCurrentUser = vi.mocked(getCurrentUser);

describe("/api/tasks routes", () => {
  const mockUser = {
    id: "user-1",
    email: "admin@example.com",
    name: "Admin User",
    globalRole: Role.ADMIN,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrentUser.mockResolvedValue(mockUser);
    ensureProjectRoleMock.mockResolvedValue({
      user: mockUser,
      role: Role.ADMIN,
    });
    prismaTaskFindMany.mockResolvedValue([]);
    mockTaskCreate.mockResolvedValue({
      id: "task-1",
      title: "Example",
      startDate: new Date("2025-01-01T00:00:00Z"),
      endDateOriginal: new Date("2025-01-05T00:00:00Z"),
      endDateFinal: new Date("2025-01-05T00:00:00Z"),
      delayDays: 0,
      owner: null,
      progress: 0,
      priority: "MEDIUM",
    });
  });

  it("returns 401 when GET is called without a user session", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/tasks"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(prismaTaskFindMany).not.toHaveBeenCalled();
  });

  it("creates a task via POST and writes an audit log", async () => {
    const payload = {
      projectId: "ckproj000000000000000001",
      title: "Example",
      startDate: "2025-01-01T00:00:00Z",
      endDateOriginal: "2025-01-05T00:00:00Z",
      delayDays: 0,
      progress: 0,
      priority: "MEDIUM",
    };

    const response = await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.title).toBe("Example");
    expect(mockTaskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "ckproj000000000000000001",
          title: "Example",
        }),
      })
    );
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "TASK",
          action: "CREATED",
        }),
      })
    );
  });
});
