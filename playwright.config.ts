import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  workers: 1,
  timeout: 180000,
  use: {
    channel: "chrome",
    baseURL: process.env.TEST_BASE_URL || "http://localhost:3100",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  reporter: "list",
});
