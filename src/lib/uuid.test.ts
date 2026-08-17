import { afterEach, describe, expect, it, vi } from "vitest";
import { uuid } from "./uuid";

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("uuid", () => {
  it("uses crypto.randomUUID when the origin is secure", () => {
    const randomUUID = vi.fn(() => "11111111-2222-4333-8444-555555555555");
    vi.stubGlobal("crypto", { randomUUID, getRandomValues: globalThis.crypto.getRandomValues });

    expect(uuid()).toBe("11111111-2222-4333-8444-555555555555");
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  // The bug this file exists for: served over plain HTTP on a LAN address the
  // property is undefined, and calling it threw from inside a click handler —
  // `Add 1` did nothing at all.
  it("still returns a v4 uuid when randomUUID is missing", () => {
    vi.stubGlobal("crypto", { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });

    expect(() => uuid()).not.toThrow();
    expect(uuid()).toMatch(V4);
  });

  it("survives an environment with no WebCrypto at all", () => {
    vi.stubGlobal("crypto", undefined);

    expect(() => uuid()).not.toThrow();
    expect(uuid()).toMatch(V4);
  });

  it("does not repeat itself", () => {
    vi.stubGlobal("crypto", { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });

    const seen = new Set(Array.from({ length: 500 }, () => uuid()));
    expect(seen.size).toBe(500);
  });
});
