# BiteBox

A food delivery app: browse restaurants, build a cart, check out, and track the
order from the kitchen to the door. Built with Next.js 16 (App Router), React
19, Prisma 7 on Postgres, Tailwind CSS v4 and Zustand.

Orders and payments are simulated. No card details are collected or stored.

## Getting started

```bash
npm install
# DATABASE_URL must point at a Postgres database; see Deployment below.
npx prisma migrate dev   # applies migrations
npm run seed             # 18 restaurants, 54 sections, 164 dishes
npm run dev
```

Open <http://localhost:3000>.

### Scripts

| Script             | What it does                                  |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Dev server                                     |
| `npm run build`    | Production build (runs TypeScript)             |
| `npm run start`    | Serve the production build                     |
| `npm run lint`     | ESLint                                         |
| `npm test`         | Playwright end-to-end suite (builds first)     |
| `npm run health`   | Check every deployed site is up                |
| `npm run seed`     | Reset and reseed restaurant data               |
| `npm run db:reset` | Drop, re-migrate and reseed the database       |
| `npm run db:studio`| Prisma Studio                                  |

## Routes

| Route                    | Rendering | Purpose                                     |
| ------------------------ | --------- | ------------------------------------------- |
| `/`                      | Dynamic   | Restaurant list with search, cuisine filter and sort |
| `/restaurants/[slug]`    | Dynamic   | Menu, with a sticky section nav and cart bar |
| `/checkout`              | Static    | Delivery form; the cart lives in the browser |
| `/orders`                | Dynamic   | Every order placed, plus order-number lookup |
| `/credits`               | Static    | Photographer attribution                     |
| `/orders/[orderNumber]`  | Dynamic   | Status timeline, receipt and delivery details |

## How it fits together

**Money is integer cents everywhere** (`src/lib/money.ts`). Nothing stores a
float. The service fee is 8% of the subtotal, capped at $5.00.

**Reads go through `src/lib/queries.ts`.** Pages and actions never call Prisma
directly, so the storage layer is swappable — which is what made the move from
SQLite to Postgres a two-file change. Every read awaits `connection()` first so
it cannot resolve during prerendering and bake build-time rows into static HTML.

**The logo lives in `public/` as six PNGs.** The supplied artwork is a stacked
lockup on a cream card, which suits neither a 64px header nor a dark
background, so it was cut into `mark`, `wordmark` and full `lockup` pieces,
each with a `-dark` colourway (the brand green `#014425` is near-black and
disappears on `#0c0a09`). `src/components/brand-mark.tsx` sets the mark and
wordmark side by side for the header and swaps colourways on
`prefers-color-scheme`; the footer uses the full stacked lockup. Below the `sm`
breakpoint the wordmark is hidden — the full lockup plus the nav overflows a
390px screen by 23px. Brand colours: green `#014425`, orange `#f98c02`.

**The palette follows the logo.** Green is the primary action colour (buttons,
active filters, the progress timeline) and orange is the accent the logo uses
it as (star ratings, the "Popular" badge, the arrival estimate). Orange is
never a surface behind white text: white on `#f98c02` is about 2.3:1. White on
the green is 11.3:1 in light mode, and the dark theme's `#06251a` on `#3dbe7d`
is 6.9:1 — both clear WCAG AA, where the previous orange buttons managed only
~3.4:1 and did not. `--accent-strong` is the darkened amber used wherever
orange has to carry text.

The mark animates in from the left on load, echoing its own speed lines, and
the wordmark settles in behind it. Both end in the resting state with
`animation-fill-mode: forwards`, so the reduced-motion rule in `globals.css`
collapses them to an instant reveal rather than leaving the header empty.

`src/app/icon.png`, `apple-icon.png` and `opengraph-image.png` are generated
from the same artwork. Regenerate them all with
`scratchpad/make_logo.py` if a higher-resolution original turns up.

**The cart is client-only** (`src/lib/cart-store.ts`, Zustand + `persist`). It
holds one restaurant at a time; adding from a second one raises a conflict that
the drawer asks the customer to resolve rather than silently discarding a
basket. Anything derived from the cart is gated on `useHydrated()` so the
server and first client render agree.

**Checkout is a Server Action** (`src/app/actions.ts`). The browser sends item
ids and quantities; the server re-reads every price, the delivery fee, the
minimum order and the restaurant binding from the database. A tampered cart
cannot change what an order costs, mix two restaurants, or order more than 20
of one dish. Order lines snapshot the name and unit price, so past receipts
survive menu edits.

**Order status** is a validated string (SQLite has no enums), advanced through
`PLACED → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED`, with
`CANCELLED` available until the courier collects. There is no real kitchen, so
the tracking page exposes demo controls that stand in for a restaurant POS and
a courier app; both are Server Actions that revalidate the route.

### Two things worth knowing before you edit

- **`loading.tsx` placement.** The home skeleton lives in `src/app/(browse)/`,
  not at the app root. A `loading` boundary flushes the response shell early,
  which locks the HTTP status at 200 — a root-level one turns every
  `notFound()` on a nested route into a soft 404. Route groups keep the
  skeleton without that cost.
- **`"use server"` modules may only export async functions.** Shared types and
  the initial form state live in `src/lib/checkout.ts`; declaring them in
  `actions.ts` compiles, but they arrive on the client as `undefined`.

## Tests

`npm test` runs the Playwright suite in `e2e/` against a production build,
because several things it guards only behave correctly when built: static vs
dynamic rendering, the 404 status from `notFound()`, and serverless file
tracing. It needs a seeded `DATABASE_URL`; CI runs it against a throwaway
Postgres service container.

The suite exists because each of these was a real bug, not a hypothetical:

| Spec | Guards |
| --- | --- |
| `browse` | cuisine filters, case-insensitive search, real 404 statuses |
| `ordering` | cart conflicts, server-side validation, tracking, cancelling |
| `security` | server re-pricing, minimum order, cross-restaurant carts |
| `privacy` | orders scoped to the browser that placed them |
| `responsive` | no horizontal overflow at 390px |
| `motion` | reduced motion leaves content visible, not stuck hidden |

Tests share one database and place real orders, so they run serially
(`workers: 1`).

## Uptime monitoring

`npm run health` checks every site in `monitoring/targets.json`.
`.github/workflows/uptime.yml` runs it every 15 minutes, opens a single
rolling GitHub issue when something breaks, and closes it on recovery.

Two things it does that a plain status check would not:

- **It asserts on page content, not just the status code.** BiteBox served
  HTTP 200 for hours while its database was deleted, because Next starts
  streaming the shell before the error surfaces. `expectText` is a string the
  page can only render if its data layer is alive.
- **Health is defined per site.** The three API projects answer `404` at `/`
  and that is correct — it proves the app is routing. Whisper redirects to
  `/login`. Treating `200` as the only healthy answer would report half of
  these down permanently.

Cold starts are the main source of false alarms, so each target gets three
attempts with a widening gap before it counts as down.

Adding a site means adding an entry to `monitoring/targets.json` — no code
change, and nothing to deploy into the site being watched.

## Data model

`Restaurant → MenuSection → MenuItem`, and `Order → OrderItem`. Orders keep the
customer and address inline rather than in a `Customer` table, because the app
has no accounts — every order stands alone. See `prisma/schema.prisma`.

## Notes

- There is no authentication. `/orders` is scoped to the browser that placed
  the order via an httpOnly cookie; an order number still works from anywhere,
  which is how someone tracks a delivery from another device.
- All 155 photos are self-hosted under `public/`, so `next.config.ts` allows no
  remote image hosts at all. Most dish photos come from Pexels and restaurant
  covers from TheMealDB; everything is credited at `/credits`, which the Pexels
  API guidelines require.
- **22 dishes are pinned to Wikimedia Commons.** Keyword search on a stock
  library fails on dishes it holds few photos of, and it returned tortilla
  chips for churros, a pizza for quesabirria and a berry crepe for masala dosa.
  Commons files a photo under the name of the dish itself, so the lead image of
  the article *is* the dish. These are CC-licensed rather than Pexels-licensed,
  so `/credits` names each photo's licence next to its author.
  `scripts/fetch-food-images.py` skips any image whose credit records
  `"source": "wikimedia"`, so re-running it — even with `FORCE` — cannot
  overwrite them.
- Light and dark themes are driven by `prefers-color-scheme` from tokens
  defined once in `src/app/globals.css`.

## Deployment

Runs on Vercel. Two things are load-bearing:

- **Postgres, not SQLite.** Serverless filesystems are read-only and thrown
  away between invocations, so a local database file cannot be written to or
  survive a request. `DATABASE_URL` must be set in the Vercel project.
- **`postinstall` runs `prisma generate`.** The generated client lives in
  `src/generated/prisma`, which is gitignored, so the build regenerates it.
- **Postgres LIKE is case-sensitive**, unlike SQLite's. Searches use
  `mode: "insensitive"`; without it the restaurant search matches nothing for
  a lowercase query.

After changing the schema, run `npx prisma migrate deploy` against the
production database before the new code goes live.
