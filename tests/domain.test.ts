import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultTerms,
  effectiveStatus,
  whatsappUrl,
} from "../src/domain/contracts";
import { contractSchema, propertySchema } from "../src/validation/schemas";
import { hashPassword, verifyPassword } from "../src/auth/password";
import { checkOrigin, jsonBody } from "../src/lib/http";
test("status computes expiration on the server without updating stored PENDING", () => {
  const now = new Date("2026-10-13T10:00:00Z");
  assert.equal(
    effectiveStatus(
      { status: "PENDING" },
      { expiresAt: now, revokedAt: null },
      now,
    ),
    "EXPIRED",
  );
  assert.equal(
    effectiveStatus(
      { status: "DEMO_SIGNED" },
      { expiresAt: now, revokedAt: null },
      now,
    ),
    "DEMO_SIGNED",
  );
  assert.equal(
    effectiveStatus(
      { status: "PENDING" },
      { expiresAt: now, revokedAt: now },
      now,
    ),
    "REVOKED",
  );
});
test("WhatsApp message round-trips URL encoding and Kazakhstan phone normalization", () => {
  const url = new URL(
    whatsappUrl(
      "8 (700) 000-00-00",
      "https://example.test/sign/abc?x=1&y=2",
      "DEMO-1",
    ),
  );
  assert.equal(url.pathname, "/77000000000");
  assert.ok(
    url.searchParams
      .get("text")
      ?.includes("https://example.test/sign/abc?x=1&y=2"),
  );
  assert.ok(url.searchParams.get("text")?.includes("ЭЦП"));
});
test("validation rejects unknown keys, negative amounts and invalid identifiers", () => {
  assert.equal(
    propertySchema.safeParse({
      name: "ДЕМО",
      address: "Вымышленный адрес",
      type: "APARTMENT",
      unit: "",
      description: "",
      rent: -1,
      deposit: 0,
    }).success,
    false,
  );
  assert.equal(
    contractSchema.safeParse({ tenantId: "111", ownerId: "other" }).success,
    false,
  );
  const contract = {
    propertyId: "fictional-id",
    landlordName: "ДЕМО",
    landlordId: "",
    landlordPhone: "+7 000 000 00 00",
    tenantName: "ДЕМО",
    tenantId: "",
    tenantPhone: "+7 000 000 00 00",
    checkIn: "2026-10-15T14:00:00+05:00",
    checkOut: "2026-10-17T12:00:00+05:00",
    rent: 20000,
    deposit: 10000,
    additionalTerms: "",
    ...defaultTerms,
  };
  assert.equal(contractSchema.safeParse(contract).success, true);
  assert.equal(
    contractSchema.safeParse({ ...contract, tenantPhone: "--------" }).success,
    false,
  );
  assert.equal(
    contractSchema.safeParse({ ...contract, tenantId: "111" }).success,
    false,
  );
  assert.equal(
    contractSchema.safeParse({ ...contract, rent: -1 }).success,
    false,
  );
  assert.equal(
    contractSchema.safeParse({ ...contract, checkOut: contract.checkIn })
      .success,
    false,
  );
  assert.equal(
    contractSchema.safeParse({ ...contract, ownerId: "other" }).success,
    false,
  );
});
test("password hashes are salted and a wrong password is rejected", async () => {
  const first = await hashPassword("fictional-test-password");
  const second = await hashPassword("fictional-test-password");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("fictional-test-password", first), true);
  assert.equal(await verifyPassword("wrong-password", first), false);
  await assert.rejects(hashPassword("short"));
});
test("CSRF checks reject foreign and missing origins", () => {
  process.env.APP_URL = "http://localhost:3000";
  assert.throws(() =>
    checkOrigin(
      new Request("http://localhost:3000/api", {
        headers: { origin: "https://evil.test" },
      }),
    ),
  );
  assert.throws(() => checkOrigin(new Request("http://localhost:3000/api")));
  assert.doesNotThrow(() =>
    checkOrigin(
      new Request("http://localhost:3000/api", {
        headers: { origin: "http://localhost:3000" },
      }),
    ),
  );
});
test("JSON reader rejects malformed, oversized and non-JSON requests", async () => {
  await assert.rejects(
    jsonBody(
      new Request("http://localhost/api", {
        method: "POST",
        body: "{",
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  await assert.rejects(
    jsonBody(
      new Request("http://localhost/api", {
        method: "POST",
        body: "x".repeat(100000),
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  await assert.rejects(
    jsonBody(
      new Request("http://localhost/api", { method: "POST", body: "{}" }),
    ),
  );
});
