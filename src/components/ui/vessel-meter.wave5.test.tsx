import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VesselMeter } from "./vessel-meter";

const renderTray = (plannedMl: number, pendingMl = 0) =>
  renderToStaticMarkup(
    <VesselMeter
      targetMl={100}
      entries={[{ label: "committed", ml: plannedMl }]}
      pendingMl={pendingMl}
      variant="tray"
    />,
  );

describe("Wave 5 tray meter shades", () => {
  it("uses ordered exact boundaries without changing vessel geometry", () => {
    expect(renderTray(105)).toContain("bg-primary");
    expect(renderTray(110)).toContain("bg-[hsl(var(--over-1))]");
    expect(renderTray(114.99)).toContain("bg-warning");
    expect(renderTray(115)).toContain("bg-[hsl(var(--over-3))]");
    expect(renderTray(120)).toContain("h-[60px] w-[26px]");
  });

  it("uses combined committed plus pending amount while keeping pending hollow", () => {
    const html = renderTray(95, 21);
    expect(html).toContain("border-[hsl(var(--over-3))]");
    expect(html).toContain("bg-[rgba(200,96,94,.22)]");
  });
});
