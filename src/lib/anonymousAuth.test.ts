import type { Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  signInAnonymously: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));

import { ensureSession } from "./anonymousAuth";

const cachedSession = (anonymous: boolean, expiresAt: number): Session =>
  ({
    access_token: "access",
    refresh_token: "refresh",
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: "bearer",
    user: { id: anonymous ? "anon-user" : "account-user", is_anonymous: anonymous },
  }) as unknown as Session;

describe("ensureSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("server-refreshes even a cached session whose local expiry looks current", async () => {
    const cached = cachedSession(true, Math.floor(Date.now() / 1000) + 3600);
    const refreshed = cachedSession(true, Math.floor(Date.now() / 1000) + 7200);
    auth.getSession.mockResolvedValue({ data: { session: cached }, error: null });
    auth.refreshSession.mockResolvedValue({ data: { session: refreshed }, error: null });

    await expect(ensureSession()).resolves.toEqual({ session: refreshed, error: null });
    expect(auth.refreshSession).toHaveBeenCalledOnce();
  });

  it("refreshes an expired session before declaring the app ready", async () => {
    const expired = cachedSession(true, Math.floor(Date.now() / 1000) - 1);
    const refreshed = cachedSession(true, Math.floor(Date.now() / 1000) + 3600);
    auth.getSession.mockResolvedValue({ data: { session: expired }, error: null });
    auth.refreshSession.mockResolvedValue({ data: { session: refreshed }, error: null });

    await expect(ensureSession()).resolves.toEqual({ session: refreshed, error: null });
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it("replaces an expired anonymous session only when refresh fails", async () => {
    const expired = cachedSession(true, Math.floor(Date.now() / 1000) - 1);
    const replacement = cachedSession(true, Math.floor(Date.now() / 1000) + 3600);
    auth.getSession.mockResolvedValue({ data: { session: expired }, error: null });
    auth.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: "refresh expired" },
    });
    auth.signInAnonymously.mockResolvedValue({
      data: { session: replacement },
      error: null,
    });

    await expect(ensureSession()).resolves.toEqual({ session: replacement, error: null });
  });

  it("never replaces a real account when its refresh fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const expired = cachedSession(false, Math.floor(Date.now() / 1000) - 1);
    const error = { message: "refresh expired" };
    auth.getSession.mockResolvedValue({ data: { session: expired }, error: null });
    auth.refreshSession.mockResolvedValue({ data: { session: null }, error });

    await expect(ensureSession()).resolves.toEqual({ session: null, error });
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("Failed to refresh authenticated session:", error);
    errorSpy.mockRestore();
  });

  it("creates an anonymous session when none is cached", async () => {
    const session = cachedSession(true, Math.floor(Date.now() / 1000) + 3600);
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    auth.signInAnonymously.mockResolvedValue({ data: { session }, error: null });

    await expect(ensureSession()).resolves.toEqual({ session, error: null });
  });
});
