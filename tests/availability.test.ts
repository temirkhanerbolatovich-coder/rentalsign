import { test } from "node:test";
import assert from "node:assert/strict";
import { availabilitySchema, dayStatus } from "../src/lib/availability";
test("calendar validates real inclusive dates and explicit statuses", () => {
  const input = {
    catalogSlug: "example",
    startDate: "2026-11-03",
    endDate: "2026-11-05",
    status: "occupied",
  };
  assert.equal(availabilitySchema.safeParse(input).success, true);
  for (const patch of [
    { startDate: "2026-02-30" },
    { endDate: "2026-11-01" },
    { status: "free" },
    { endDate: "2029-01-01" },
  ])
    assert.equal(
      availabilitySchema.safeParse({ ...input, ...patch }).success,
      false,
    );
  assert.equal(dayStatus("2026-11-05", [input]), "occupied");
  assert.equal(dayStatus("2026-11-06", [input]), "unknown");
  assert.equal(
    dayStatus("2026-11-04", [{ ...input, status: "reserved" }, input]),
    "occupied",
  );
});
