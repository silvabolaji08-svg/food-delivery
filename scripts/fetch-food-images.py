"""
Downloads a photo for every restaurant and dish in prisma/seed-data.json and
self-hosts it under public/.

Images are fetched once and committed, so the running app never depends on a
third-party image host and the menus cannot change under us. Re-running is
cheap: anything already on disk is skipped, so a failed run can just be
repeated.

Usage:
    pip install Pillow
    # PEXELS_API_KEY must be in .env (free key from https://www.pexels.com/api/)
    python scripts/fetch-food-images.py            # fetch what is missing
    python scripts/fetch-food-images.py --force    # re-fetch everything
"""

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from io import BytesIO

from PIL import Image

# Photographer names carry characters the Windows console codepage cannot
# encode (one contained a left-to-right mark), which otherwise kills the run
# mid-way through on a print statement.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "prisma", "seed-data.json")
MANIFEST = os.path.join(ROOT, "prisma", "image-manifest.json")
CREDITS = os.path.join(ROOT, "prisma", "image-credits.json")
PUBLIC = os.path.join(ROOT, "public")

# Dish thumbnails are square and small; restaurant heroes are wide.
DISH_SIZE = (480, 480)
HERO_SIZE = (1200, 750)

# Pexels burst-limits well before the documented hourly cap; at 1.2s a run of
# 155 images tripped 429 on a third of them. 3s completes without any.
DELAY_SECONDS = 3.0

FORCE = "--force" in sys.argv


def load_api_key() -> str:
    key = os.environ.get("PEXELS_API_KEY")
    if key:
        return key.strip()

    env_path = os.path.join(ROOT, ".env")
    if os.path.exists(env_path):
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("PEXELS_API_KEY"):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")

    sys.exit(
        "PEXELS_API_KEY not found.\n"
        "Add it to .env as:  PEXELS_API_KEY=your_key_here\n"
        "Get a free key at https://www.pexels.com/api/"
    )


API_KEY = load_api_key()


def search(query: str, landscape: bool):
    """Returns candidate photos for a query, best match first.

    The photographer and the photo's page are carried along with the image
    URL: the Pexels API guidelines require a prominent link back to Pexels and
    credit to the photographer, so that has to be recorded at fetch time or it
    is lost once the file is on disk.
    """
    params = urllib.parse.urlencode({
        "query": query,
        # Deep enough that a relevant shot can be picked out of the results;
        # the top hit alone is often a lifestyle or abstract photo that merely
        # ranks well (a "churros" search led with a tray of chocolate bars).
        "per_page": 20,
        "orientation": "landscape" if landscape else "square",
    })
    req = urllib.request.Request(
        "https://api.pexels.com/v1/search?" + params,
        headers={"Authorization": API_KEY, "User-Agent": "BiteBoxSeed/1.0"},
    )

    # Pexels intermittently answers a perfectly valid query with 422 or 429.
    # Retrying the identical request succeeds, so these are transient rather
    # than a problem with the query itself.
    payload = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                payload = json.load(r)
            break
        except urllib.error.HTTPError as exc:
            if exc.code not in (422, 429, 500, 502, 503, 504) or attempt == 3:
                raise
            # 429 needs a real pause, not a token one: the burst window is
            # measured in tens of seconds, not the couple a 422 needs.
            time.sleep((15 if exc.code == 429 else 2) * (attempt + 1))

    if payload is None:
        return []

    return [
        {
            "id": p.get("id"),
            "download": p["src"]["large2x"],
            "photographer": p.get("photographer", ""),
            "photographerUrl": p.get("photographer_url", ""),
            "pexelsUrl": p.get("url", ""),
            "alt": p.get("alt") or "",
        }
        for p in payload.get("photos", [])
    ]


# Words that say nothing about what is on the plate.
STOPWORDS = {
    "a", "an", "the", "of", "on", "in", "with", "and", "fresh", "delicious",
    "homemade", "traditional", "plate", "bowl", "glass", "dish", "food",
    "close", "up", "top", "view", "table", "wooden", "white", "black",
}


def keywords(text: str) -> set:
    cleaned = "".join(c if c.isalnum() else " " for c in text.lower())
    return {w for w in cleaned.split() if len(w) > 2 and w not in STOPWORDS}


def rank(photos, query, used_ids):
    """Orders candidates by how well the photo's own description matches.

    Pexels returns a descriptive `alt` for most photos, which is a far better
    signal than result position. Photos already used elsewhere are pushed to
    the back so two dishes do not end up sharing one picture.
    """
    wanted = keywords(query)

    def score(photo):
        overlap = len(wanted & keywords(photo["alt"]))
        unused = 0 if photo["id"] in used_ids else 1
        # Unused-and-relevant beats relevant-but-duplicated.
        return (unused, overlap)

    return sorted(photos, key=score, reverse=True)


def save(url: str, dest: str, size) -> None:
    """Centre-crops to the target aspect ratio, then writes a WebP."""
    req = urllib.request.Request(url, headers={"User-Agent": "BiteBoxSeed/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        im = Image.open(BytesIO(r.read())).convert("RGB")

    target_w, target_h = size
    target_ratio = target_w / target_h
    ratio = im.width / im.height

    if ratio > target_ratio:
        new_w = int(im.height * target_ratio)
        left = (im.width - new_w) // 2
        im = im.crop((left, 0, left + new_w, im.height))
    else:
        new_h = int(im.width / target_ratio)
        top = (im.height - new_h) // 2
        im = im.crop((0, top, im.width, top + new_h))

    im = im.resize(size, Image.LANCZOS)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    im.save(dest, "WEBP", quality=82, method=6)


def collect_jobs(data):
    """Every image the seed needs, as (public path, query, is_hero).

    Deduplicated by destination: restaurants of the same cuisine deliberately
    share a dish slug where they serve the same thing, and there is no sense
    downloading that photo once per restaurant.
    """
    jobs = {}
    for r in data["restaurants"]:
        jobs.setdefault(f"restaurants/{r['slug']}.webp", (r["imageQuery"], True))
        for section in r["sections"]:
            for item in section["items"]:
                jobs.setdefault(f"menu/{item['slug']}.webp", (item["imageQuery"], False))
    return [(rel, q, hero) for rel, (q, hero) in jobs.items()]


def main():
    with open(DATA, encoding="utf-8") as f:
        data = json.load(f)

    jobs = collect_jobs(data)
    manifest = {}
    if os.path.exists(MANIFEST) and not FORCE:
        with open(MANIFEST, encoding="utf-8") as f:
            manifest = json.load(f)

    credits = {}
    if os.path.exists(CREDITS) and not FORCE:
        with open(CREDITS, encoding="utf-8") as f:
            credits = json.load(f)

    # Tracks which Pexels photos are already spoken for, so the ranking can
    # avoid handing the same picture to two different dishes.
    used_ids = {c.get("photoId") for c in credits.values() if c.get("photoId")}

    failures = []
    fetched = skipped = 0

    for i, (rel, query, is_hero) in enumerate(jobs, 1):
        dest = os.path.join(PUBLIC, rel.replace("/", os.sep))

        # Some dishes have too few stock photos for keyword search to find the
        # right one -- it returned tortilla chips for churros and a pizza for
        # quesabirria. Those are pinned to a Wikimedia Commons photo filed
        # under the dish's own name, so FORCE must not clobber them.
        if credits.get(rel, {}).get("source") == "wikimedia":
            manifest[rel] = "/" + rel
            skipped += 1
            continue

        if os.path.exists(dest) and not FORCE:
            manifest[rel] = "/" + rel
            skipped += 1
            continue

        try:
            photos = search(query, landscape=is_hero)
            if not photos:
                raise LookupError("no photos returned")

            # The search can succeed while an individual photo's download URL
            # answers 422, so walk the candidates rather than giving up on the
            # first one. Ordering still means the best match is preferred.
            last_error: Exception | None = None
            saved = None
            for photo in rank(photos, query, used_ids):
                try:
                    save(photo["download"], dest, HERO_SIZE if is_hero else DISH_SIZE)
                    saved = photo
                    break
                except (urllib.error.HTTPError, urllib.error.URLError, OSError) as exc:
                    last_error = exc
                    time.sleep(0.5)

            if saved is None:
                raise last_error or LookupError("every candidate failed to download")

            manifest[rel] = "/" + rel
            used_ids.add(saved["id"])
            credits[rel] = {
                "query": query,
                "photoId": saved["id"],
                "match": sorted(keywords(query) & keywords(saved["alt"])),
                "photographer": saved["photographer"],
                "photographerUrl": saved["photographerUrl"],
                "pexelsUrl": saved["pexelsUrl"],
                "alt": saved["alt"],
            }
            fetched += 1
            print(f"[{i:3d}/{len(jobs)}] {rel}  <- {query!r}  (c) {saved['photographer']}")
        except (urllib.error.HTTPError, urllib.error.URLError, LookupError, OSError) as exc:
            failures.append((rel, query, str(exc)[:80]))
            print(f"[{i:3d}/{len(jobs)}] FAILED {rel}  ({exc})")

        time.sleep(DELAY_SECONDS)

    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1, sort_keys=True)
    with open(CREDITS, "w", encoding="utf-8") as f:
        json.dump(credits, f, indent=1, sort_keys=True)

    print(f"\nfetched {fetched}, skipped {skipped}, failed {len(failures)}")
    print(f"manifest: {MANIFEST} ({len(manifest)} entries)")
    print(f"credits:  {CREDITS} ({len(credits)} entries)")

    if failures:
        print("\nFailures (re-run to retry just these):")
        for rel, query, err in failures:
            print(f"  {rel:45s} {query!r}  {err}")


if __name__ == "__main__":
    main()
