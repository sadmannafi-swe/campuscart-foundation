import { describe, expect, it } from "vitest";
import { dhakaMonthStart } from "../routes/seller";

describe("dhakaMonthStart", () => {
  it("uses Bangladesh time (UTC+6) for month boundaries", () => {
    // 30 Nov 20:00 UTC is already 1 Dec 02:00 in Dhaka → month starts 1 Dec (= 30 Nov 18:00 UTC).
    expect(dhakaMonthStart(new Date("2026-11-30T20:00:00Z")).toISOString()).toBe(
      "2026-11-30T18:00:00.000Z",
    );
    // 15 Nov → 1 Nov 00:00 Dhaka = 31 Oct 18:00 UTC
    expect(dhakaMonthStart(new Date("2026-11-15T10:00:00Z")).toISOString()).toBe(
      "2026-10-31T18:00:00.000Z",
    );
  });
});
