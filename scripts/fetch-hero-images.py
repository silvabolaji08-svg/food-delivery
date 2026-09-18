"""
Fills in the 18 restaurant hero images from TheMealDB, which needs no API key.

A hero only has to look like the right cuisine, so it can be picked from a
cuisine pool rather than matched to a dish name. Dish thumbnails are the
opposite problem and are handled by fetch-food-images.py instead, which needs
a Pexels key to search for specific dishes.

Usage:
    pip install Pillow
    python scripts/fetch-hero-images.py [--force]
"""

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from io import BytesIO

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "prisma", "seed-data.json")
MANIFEST = os.path.join(ROOT, "prisma", "image-manifest.json")
PUBLIC = os.path.join(ROOT, "public")
CACHE = os.path.join(ROOT, "prisma", ".mealdb-cache.json")

HERO_SIZE = (1200, 750)
FORCE = "--force" in sys.argv
UA = {"User-Agent": "BiteBoxSeed/1.0"}

# Each restaurant is pinned to a specific dish rather than matched by keyword.
# Keyword matching was tried first and produced Thai chicken cakes for a
# Mexican taqueria and Eccles cakes for an American diner, because TheMealDB
# has no Indian or American area and "noodle" pulls in half of south-east Asia.
# The picks below are chosen to reflect what each restaurant actually serves.
HEROES = {
    # Italian
    "nonna-rosa": "Pizza Express Margherita",
    "trattoria-vesuvio": "Spaghetti alla Carbonara",
    "osteria-bianca": "Lasagne",
    # Japanese
    "sakura-ramen-bar": "Chicken Karaage",
    "kaito-sushi": "Sushi",
    "udon-house": "Yaki Udon",
    # Mexican
    "el-fuego-taqueria": "Crock Pot Chicken Baked Tacos",
    "la-milpa": "Cajun spiced fish tacos",
    "cantina-verde": "Chicken Enchilada Casserole",
    # Indian
    "spice-route": "Lamb Rogan josh",
    "tandoor-and-co": "Lamb Biryani",
    "malabar-coast": "Recheado Masala Fish",
    # American
    "brick-lane-burgers": "Aussie Burgers",
    "smoke-and-barrel": "Beef Brisket Pot Roast",
    "blue-diner": "Pancakes",
    # Healthy
    "the-green-bowl": "Chicken Quinoa Greek Salad",
    "root-and-grain": "Salmon Avocado Salad",
    "verdant": "Falafel",
}

AREAS = ["Italian", "Japanese", "Mexican", "Indian", "American", "British"]
CATEGORIES = ["Vegetarian", "Vegan", "Seafood", "Chicken", "Beef", "Side", "Pasta"]


def api(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r).get("meals") or []


def build_pool():
    """Cached, because TheMealDB rate-limits bursts hard on the free key."""
    # Deliberately not gated on --force: that flag is about re-fetching the
    # images, and re-pulling this index just burns through the rate limit.
    if os.path.exists(CACHE):
        with open(CACHE, encoding="utf-8") as f:
            return json.load(f)

    base = "https://www.themealdb.com/api/json/v1/1/filter.php"
    pool = {}
    for key, values in (("a", AREAS), ("c", CATEGORIES)):
        for v in values:
            meals = []
            for _ in range(3):
                meals = api(f"{base}?{key}={urllib.parse.quote(v)}")
                # One result means the burst limit tripped, not a real answer.
                if len(meals) > 1:
                    break
                time.sleep(6)
            for m in meals:
                entry = pool.setdefault(m["idMeal"], {
                    "name": m["strMeal"], "thumb": m["strMealThumb"],
                    "areas": [], "categories": [],
                })
                bucket = "areas" if key == "a" else "categories"
                if v not in entry[bucket]:
                    entry[bucket].append(v)
            print(f"  {v:14s} {len(meals):3d}  pool={len(pool)}")
            time.sleep(2.5)

    with open(CACHE, "w", encoding="utf-8") as f:
        json.dump(pool, f, indent=1)
    return pool


def find(pool, dish_name):
    """The pool is keyed by id, so look the pinned dish up by exact name."""
    for entry in pool.values():
        if entry["name"] == dish_name:
            return entry
    return None


def save(url, dest, size):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        im = Image.open(BytesIO(r.read())).convert("RGB")

    tw, th = size
    target = tw / th
    if im.width / im.height > target:
        w = int(im.height * target)
        im = im.crop(((im.width - w) // 2, 0, (im.width - w) // 2 + w, im.height))
    else:
        h = int(im.width / target)
        im = im.crop((0, (im.height - h) // 2, im.width, (im.height - h) // 2 + h))

    im = im.resize(size, Image.LANCZOS)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    im.save(dest, "WEBP", quality=84, method=6)


def main():
    with open(DATA, encoding="utf-8") as f:
        restaurants = json.load(f)["restaurants"]

    print("Building cuisine pool from TheMealDB...")
    pool = build_pool()
    print(f"pool: {len(pool)} dishes\n")

    manifest = {}
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as f:
            manifest = json.load(f)

    ok = failed = 0

    for r in restaurants:
        rel = f"restaurants/{r['slug']}.webp"
        dest = os.path.join(PUBLIC, rel.replace("/", os.sep))

        if os.path.exists(dest) and not FORCE:
            manifest[rel] = "/" + rel
            continue

        wanted = HEROES.get(r["slug"])
        if wanted is None:
            print(f"  SKIPPED {r['slug']}: no hero pinned for it")
            failed += 1
            continue

        pick = find(pool, wanted)
        if pick is None:
            print(f"  FAILED {r['slug']}: {wanted!r} is not in the pool")
            failed += 1
            continue

        try:
            save(pick["thumb"], dest, HERO_SIZE)
            manifest[rel] = "/" + rel
            ok += 1
            print(f"  {r['slug']:22s} {r['cuisine']:9s} <- {pick['name']}")
        except OSError as exc:
            print(f"  FAILED {r['slug']}: {exc}")
            failed += 1

    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1, sort_keys=True)

    print(f"\nheroes saved {ok}, failed {failed}, manifest entries {len(manifest)}")


if __name__ == "__main__":
    main()
