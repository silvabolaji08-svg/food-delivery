# BiteBox

A food delivery app: browse restaurants, build a cart, check out, and track the
order from the kitchen to the door. Built with Next.js 16 (App Router), React
19, Prisma 7 on SQLite, Tailwind CSS v4 and Zustand.

Orders and payments are simulated. No card details are collected or stored.

## Getting started

```bash
npm install
npx prisma migrate dev   # creates dev.db and applies migrations
npm run seed             # 6 restaurants, 18 menu sections, 56 dishes
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
| `/orders/[orderNumber]`  | Dynamic   | Status timeline, receipt and delivery details |

## How it fits together

**Money is integer cents everywhere** (`src/lib/money.ts`). Nothing stores a
float. The service fee is 8% of the subtotal, capped at $5.00.

**Reads go through `src/lib/queries.ts`.** Pages and actions never call Prisma
directly, so the storage layer is swappable. Every read awaits `connection()`
first: `better-sqlite3` is a synchronous driver, so without it queries would
resolve during prerendering and bake build-time rows into static HTML.

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

## Data model

`Restaurant → MenuSection → MenuItem`, and `Order → OrderItem`. Orders keep the
customer and address inline rather than in a `Customer` table, because the app
has no accounts — every order stands alone. See `prisma/schema.prisma`.

## Notes

- There is no authentication, so `/orders` lists every order in the database.
- Restaurant images are hosted on Unsplash; `next.config.ts` allows that one
  remote host for image optimisation.
- Light and dark themes are driven by `prefers-color-scheme` from tokens
  defined once in `src/app/globals.css`.
