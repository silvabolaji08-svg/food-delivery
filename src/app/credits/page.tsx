import type { Metadata } from "next";
import { Camera } from "lucide-react";

// Imported rather than read from disk at request time. Next traces file
// dependencies at build time and a path built with `process.cwd()` is not
// traced into the serverless bundle, so the deployed page found nothing.
// The data only changes when the image fetcher runs, which needs a rebuild
// anyway, so bundling it is both safer and cheaper.
import creditsData from "../../../prisma/image-credits.json";

export const metadata: Metadata = {
  title: "Photo credits",
  description: "Where the photography on BiteBox comes from.",
};

type Credit = {
  query: string;
  photographer: string;
  photographerUrl: string;
  alt: string;
  source?: "pexels" | "wikimedia";
  sourceUrl?: string;
  pexelsUrl?: string;
  license?: string;
  licenseUrl?: string;
};

/**
 * Pexels asks for a link back plus the photographer's name. The Wikimedia
 * photos are mostly CC BY-SA, which additionally requires naming the licence
 * and linking to it, so every image row carries its own licence rather than
 * relying on one blanket statement at the top.
 */
const credits: [string, Credit][] = Object.entries(
  creditsData as Record<string, Credit>,
).sort(([a], [b]) => a.localeCompare(b));

const linkFor = (credit: Credit) =>
  credit.sourceUrl ?? credit.pexelsUrl ?? "https://www.pexels.com";

function contributors(source: Credit["source"]) {
  const people = new Map<string, string>();
  for (const [, credit] of credits) {
    const from = credit.source ?? "pexels";
    if (from === source && credit.photographer) {
      people.set(credit.photographer, credit.photographerUrl);
    }
  }
  return people;
}

export default function CreditsPage() {
  const pexels = contributors("pexels");
  const commons = contributors("wikimedia");
  const commonsCount = credits.filter(
    ([, c]) => c.source === "wikimedia",
  ).length;
  const pexelsCount = credits.length - commonsCount;

  const nameList = (people: Map<string, string>) => (
    <ul className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-sm">
      {[...people].map(([name, url], index) => (
        <li key={name}>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-brand"
          >
            {name}
          </a>
          {index < people.size - 1 && <span className="text-muted">,</span>}
        </li>
      ))}
    </ul>
  );

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
          Most dishes are photographed by contributors to{" "}
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

        {pexels.size === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No Pexels photography has been fetched yet.
          </p>
        ) : (
          <>
            <p className="mt-4 text-sm text-muted">
              {pexels.size}{" "}
              {pexels.size === 1 ? "photographer" : "photographers"} across{" "}
              {pexelsCount} images:
            </p>
            {nameList(pexels)}
          </>
        )}
      </section>

      {commonsCount > 0 && (
        <section className="mt-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="text-lg font-semibold">
            Regional dishes, from Wikimedia Commons
          </h2>
          <p className="mt-1 text-sm text-muted">
            Stock search struggles with dishes it has few photos of, and
            returned tortilla chips for churros and a pizza for quesabirria. For{" "}
            {commonsCount} of them the photo comes instead from{" "}
            <a
              href="https://commons.wikimedia.org"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand underline underline-offset-2"
            >
              Wikimedia Commons
            </a>
            , where a photo is filed under the name of the dish itself. These
            are used under the Creative Commons licences named below.
          </p>
          <p className="mt-4 text-sm text-muted">
            {commons.size} {commons.size === 1 ? "contributor" : "contributors"}
            :
          </p>
          {nameList(commons)}
        </section>
      )}

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
                <span className="ml-auto flex gap-x-2">
                  <a
                    href={linkFor(credit)}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-brand"
                  >
                    {credit.photographer || "Pexels"}
                  </a>
                  {credit.license && (
                    <a
                      href={credit.licenseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-xs text-muted underline underline-offset-2 hover:text-brand"
                    >
                      {credit.license}
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
