#!/usr/bin/env node
/**
 * Checks every site in monitoring/targets.json and reports which are down.
 *
 * Exits non-zero if anything fails, so CI treats it as a failure and the
 * workflow can raise an alert.
 *
 * Deliberately checks page CONTENT, not just the status code. BiteBox served
 * HTTP 200 for hours while its database was deleted, because Next starts
 * streaming the shell before the error surfaces — a status-only monitor would
 * have reported it perfectly healthy the whole time.
 *
 * Usage:
 *   node scripts/health-check.mjs            # check everything
 *   node scripts/health-check.mjs bitebox    # check one site
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TIMEOUT_MS = 30_000;

/**
 * Serverless functions that have not been hit recently take seconds to wake,
 * and a run during a cold start reported six of ten sites down when every one
 * of them was fine. Three attempts with a widening gap gives them time to warm
 * up. A monitor that cries wolf gets ignored, which is worse than no monitor.
 */
const ATTEMPTS = 3;
const BACKOFF_MS = [4000, 10_000];

const { targets } = JSON.parse(
  readFileSync(join(ROOT, "monitoring", "targets.json"), "utf-8"),
);

const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const selected = only.length
  ? targets.filter((t) => only.includes(t.name))
  : targets;

if (selected.length === 0) {
  console.error(`No targets matched: ${only.join(", ")}`);
  process.exit(2);
}

async function fetchOnce(target) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(target.url, {
      redirect: target.followRedirects ? "follow" : "manual",
      signal: controller.signal,
      headers: { "User-Agent": "bitebox-uptime-check" },
    });
    const body = await response.text();
    return { status: response.status, body, ms: Date.now() - startedAt };
  } finally {
    clearTimeout(timer);
  }
}

/** Returns null when healthy, or a human-readable reason when not. */
function judge(target, result) {
  const { expectStatus, expectText, rejectText } = target;

  if (expectStatus && !expectStatus.includes(result.status)) {
    return `expected status ${expectStatus.join(" or ")}, got ${result.status}`;
  }
  if (rejectText && result.body.includes(rejectText)) {
    return `page contains ${JSON.stringify(rejectText)} — it loaded but is broken`;
  }
  if (expectText && !result.body.includes(expectText)) {
    return `page is missing ${JSON.stringify(expectText)}`;
  }
  return null;
}

async function check(target) {
  let lastReason = "unknown";

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const result = await fetchOnce(target);
      const reason = judge(target, result);
      if (!reason) {
        return { ok: true, ms: result.ms, status: result.status, attempt };
      }
      lastReason = reason;
    } catch (error) {
      lastReason =
        error.name === "AbortError"
          ? `no response within ${TIMEOUT_MS / 1000}s`
          : `request failed: ${error.message}`;
    }

    if (attempt < ATTEMPTS) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1] ?? 10_000));
    }
  }

  return { ok: false, reason: lastReason };
}

const results = await Promise.all(
  selected.map(async (target) => ({ target, ...(await check(target)) })),
);

const failures = results.filter((r) => !r.ok);

for (const r of results.sort((a, b) => a.target.name.localeCompare(b.target.name))) {
  const name = r.target.name.padEnd(20);
  if (r.ok) {
    const warm = r.attempt > 1 ? `  (warmed up after ${r.attempt} tries)` : "";
    console.log(`PASS  ${name} ${String(r.status).padEnd(4)} ${String(r.ms).padStart(5)}ms${warm}`);
  } else {
    console.log(`FAIL  ${name} ${r.reason}`);
    console.log(`      ${r.target.url}`);
  }
}

console.log(
  `\n${results.length - failures.length}/${results.length} healthy` +
    (failures.length ? ` — DOWN: ${failures.map((f) => f.target.name).join(", ")}` : ""),
);

process.exit(failures.length ? 1 : 0);
