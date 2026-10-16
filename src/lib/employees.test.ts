import { describe, expect, it } from "vitest";
import { monthRange, summarize } from "./employees";

describe("attendance helpers", () => {
  it("month range covers the whole month", () => {
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28", days: 28 });
    expect(monthRange("2026-10").to).toBe("2026-10-31");
  });
  it("counts each status and half day as half a worked day", () => {
    const s = summarize([
      { status: "present" },
      { status: "present" },
      { status: "half_day" },
      { status: "absent" },
      { status: "leave" },
    ]);
    expect(s).toMatchObject({ present: 2, absent: 1, half_day: 1, leave: 1, total: 5, workedDays: 2.5 });
  });
});
