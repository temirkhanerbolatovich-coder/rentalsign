import { defineConfig } from "@playwright/test";
import { randomBytes } from "node:crypto";
process.env.E2E_PASSWORD ||= randomBytes(20).toString("base64url");
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3100",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  reporter: "list",
  webServer: {
    command: "npx tsx scripts/e2e-server.ts",
    url: "http://localhost:3100/login",
    reuseExistingServer: false,
    timeout: 120000,
    env: { E2E_PASSWORD: process.env.E2E_PASSWORD! },
  },
});
