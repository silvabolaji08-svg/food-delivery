import "server-only";

import { cookies } from "next/headers";

const COOKIE_NAME = "bitebox_session";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Identifies the browser that placed an order, so `/orders` can show someone
 * their own orders instead of everyone's.
 *
 * The value is an unguessable random id rather than a signed token: forging
 * one grants nothing unless it happens to collide with a real session, and a
 * v4 UUID makes that infeasible. That keeps the app free of secret management
 * while still closing the hole. Real accounts would replace this wholesale.
 */
export async function readSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

/**
 * Only callable from a Server Action or Route Handler — Next cannot set a
 * cookie once a Server Component has started streaming.
 */
export async function ensureSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const id = crypto.randomUUID();
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });

  return id;
}
