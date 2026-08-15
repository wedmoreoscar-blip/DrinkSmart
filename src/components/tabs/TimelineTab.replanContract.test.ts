import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./TimelineTab.tsx", import.meta.url), "utf8");
const start = source.indexOf("const handleReplan = async");
const end = source.indexOf("\n\n  if (state.drinkTimeline.length", start);
const handler = source.slice(start, end);

describe("Timeline online re-plan control contract", () => {
  it("uses the live metrics preference bridge and always releases loading", () => {
    expect(source).toContain("const { preferences } = useUserMetrics()");
    expect(handler).toContain("preferences: replanPreferences");
    expect(handler).toContain("finally");
    expect(handler).toContain("setReplanning(false)");
  });

  it("surfaces incomplete and unexpected failures without navigating away", () => {
    expect(handler).toContain('title: "Complete your profile first"');
    expect(handler).toContain('title: "Couldn\'t re-plan the rest"');
    expect(handler).toContain('variant: "destructive"');
    expect(handler).not.toContain("onNext");
  });
});
