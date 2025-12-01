import { afterEach, beforeAll } from "vitest";
import { vi } from "vitest";

beforeAll(() => {
  process.env.TZ = "UTC";
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});
