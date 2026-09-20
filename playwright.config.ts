import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3300);
const baseURL = `http://localhost:${PORT}`;

/**
 * The suite runs against a production build rather than `next dev`, because
 * several of the things it guards only behave correctly when built: static vs
 * dynamic rendering, the 404 status on `notFound()`, and the serverless file
 * tracing that decides what the credits page can read.
 */
export default defineConfig({
  testDir: "./e2e",
  // Ordering tests write to a shared database, so they must not race.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      // The responsive suite asserts against a 390px device and only makes
      // sense in the mobile project.
      testIgnore: /responsive\.spec\.ts/,
    },
    {
      name: "mobile",
      // Not `devices["Pixel 5"]`: its isMobile scaling grows the layout
      // viewport to fit an overflowing page, which hides the very horizontal
      // overflow the responsive test exists to catch.
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
      testMatch: /responsive\.spec\.ts/,
    },
  ],

  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
