import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const summaryMock = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/AppContext", () => ({
  useAppContext: () => ({ state: {} }),
}));

vi.mock("@/lib/sessionEngine", () => ({
  deriveWindDownSummary: summaryMock,
}));

import WindDownScreen from "@/components/tabs/WindDownScreen";

beforeEach(() => {
  summaryMock.mockReturnValue({
    lastDrinkAt: new Date(2026, 7, 11, 21, 30),
    soberAt: new Date(2026, 7, 12, 2, 15),
    under008At: new Date(2026, 7, 11, 23, 45),
    peakBAC: 0.087,
    consumedEthanolMl: 48.4,
    plannedEthanolMl: 60.2,
  });
});

describe("wind-down terminal screen", () => {
  it("renders the live terminal summary and exact restrained copy", () => {
    const html = renderToStaticMarkup(
      <WindDownScreen currentTime={new Date(2026, 7, 11, 22, 5)} onNext={vi.fn()} />,
    );

    expect(html).toContain("Winding down");
    expect(html).toContain("Last drink 21:30, 35 minutes ago. Nothing else planned.");
    expect(html).toContain("Sober around");
    expect(html).toContain("02:15");
    expect(html).toContain("Under 0.08%");
    expect(html).toContain("23:45");
    expect(html).toContain("Peak tonight");
    expect(html).toContain("0.09%");
    expect(html).toContain("Drunk of planned");
    expect(html).toContain("48 / 60 ml");
    expect(html).toContain(
      "Estimates from your stats and what you logged. Not a legal or medical measurement.",
    );
    expect(html).toContain("Water, 500 ml");
    expect(html).toContain("Before bed. Set a reminder for 07:30 if you have somewhere to be.");
    expect(html).toContain("Get home");
    expect(html).toContain("End session");
    expect(html).not.toMatch(/score|streak|congrat|great job/i);
  });

  it("uses em dashes and omits unsupported last-drink context", () => {
    summaryMock.mockReturnValue({
      lastDrinkAt: null,
      soberAt: null,
      under008At: null,
      peakBAC: null,
      consumedEthanolMl: 0,
      plannedEthanolMl: 60.2,
    });

    const html = renderToStaticMarkup(
      <WindDownScreen currentTime={new Date(2026, 7, 11, 22, 5)} />,
    );

    expect(html).not.toContain("Last drink");
    expect(html.match(/—/g)).toHaveLength(3);
    expect(html).toContain("0 / 60 ml");
  });
});
