import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { connection } from "next/server";
import { join } from "node:path";
import { Camera } from "lucide-react";

export const metadata: Metadata = {
  title: "Photo credits",
  description: "Where the photography on BiteBox comes from.",
};

type Credit = {
  query: string;
  photographer: string;
  photographerUrl: string;
  pexelsUrl: string;
  alt: string;
};

/**
 * The Pexels API guidelines require a prominent link back to Pexels and
 * credit to the photographer, so the fetcher records both at download time
 * and this page is where they are shown.
 */
function loadCredits(): [string, Credit][] {
  try {
    const raw = readFileSync(
      join(process.cwd(), "prisma", "image-credits.json"),
      "utf-8",
    );
    const parsed = JSON.parse(raw) as Record<string, Credit>;

    return Object.entries(parsed).sort(([a], [b]) => a.localeCompare(b));
  } catch {
    // No Pexels photos fetched yet.
    return [];
  }
}

export default async function CreditsPage() {
  // Read at request time, not build time: the credits file is written by the
  // image fetcher, so a prerender would bake in whatever was there before it
  // had run.
  await connection();

  const credits = loadCredits();

  const photographers = new Map<string, string>();
  for (const [, credit] of credits) {
    if (credit.photographer) {
      photographers.set(credit.photographer, credit.photographerUrl);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-subtle text-brand">
        <Camera className="h-6 w-6" aria-hidden />
      </span>

      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
        Photo credits
      </h1>
      <p className="mt-2 text-muted">
        BiteBox is a demo. The restaurants are invented, but the photography is
        real work by real people.
      </p>

      <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Dish photography</h2>
        <p className="mt-1 text-sm text-muted">
          Provided by{" "}
          <a
            href="https://www.pexels.com"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand underline underline-offset-2"
          >
            Pexels
          </a>
          .
        </p>

        {photographers.size === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No Pexels photography has been fetched yet.
          </p>
        ) : (
          <>
            <p className="mt-4 text-sm text-muted">
              {photographers.size}{" "}
              {photographers.size === 1 ? "photographer" : "photographers"}{" "}
              across {credits.length} images:
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-sm">
              {[...photographers].map(([name, url], index) => (
                <li key={name}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-brand"
                  >
                    {name}
                  </a>
                  {index < photographers.size - 1 && (
                    <span className="text-muted">,</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Restaurant photography</h2>
        <p className="mt-1 text-sm text-muted">
          Cover images come from{" "}
          <a
            href="https://www.themealdb.com"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand underline underline-offset-2"
          >
            TheMealDB
          </a>
          , an open recipe database.
        </p>
      </section>

      {credits.length > 0 && (
        <section className="mt-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Every image</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {credits.map(([path, credit]) => (
              <li key={path} className="flex flex-wrap gap-x-2 py-2">
                <span className="font-mono text-xs text-muted">{path}</span>
                <span className="ml-auto">
                  <a
                    href={credit.pexelsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-brand"
                  >
                    {credit.photographer || "Pexels"}
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
