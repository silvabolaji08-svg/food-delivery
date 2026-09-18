"""
Cuts the BiteBox logo out of the screenshot it arrived in and writes clean
transparent PNGs into public/.

Usage:  pip install Pillow && python scripts/make-logo.py

BANDS below is measured against that screenshot; a different source image
needs them re-measured.

The artwork is flat two-colour vector art printed on a cream card, so every
pixel is a blend of the cream background and one of the two brand inks. Each
pixel is therefore classified to the nearer ink and given an alpha from how far
it sits from the background, which recovers crisp antialiased edges instead of
the halo a plain colour-key would leave.
"""

import os

from PIL import Image

# Point this at the highest-resolution original available.
SRC = os.environ.get("LOGO_SRC", r"C:\Users\HomePC\Pictures\Screenshots\Screenshot 2026-09-18 154110.png")
OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public"
)

BG = (253, 251, 246)
GREEN = (1, 68, 37)
ORANGE = (249, 140, 2)

# Dark mode needs a lighter green; #014425 is all but invisible on #0c0a09.
GREEN_DARK = (61, 190, 125)
ORANGE_DARK = (251, 146, 20)

# Bands measured from the source, as (left, top, right, bottom).
BANDS = {
    "mark": (153, 140, 692, 348),
    "wordmark": (153, 370, 692, 484),
    "lockup": (153, 140, 692, 532),
}


def dist2(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b))


def extract(box, green, orange):
    im = Image.open(SRC).convert("RGB").crop(box)
    w, h = im.size
    src = im.load()

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dst = out.load()

    for y in range(h):
        for x in range(w):
            p = src[x, y]

            # Screenshot chrome and the card's black surround are not artwork.
            if max(p) < 30:
                continue

            d_bg = dist2(p, BG)
            if d_bg < 60:
                continue

            ink, ink_out = (
                (GREEN, green)
                if dist2(p, GREEN) <= dist2(p, ORANGE)
                else (ORANGE, orange)
            )

            span = dist2(ink, BG)
            alpha = 1.0 if span == 0 else min(1.0, (d_bg / span) ** 0.5)
            if alpha <= 0.02:
                continue

            dst[x, y] = (*ink_out, int(round(alpha * 255)))

    return out.crop(out.getbbox())


for name, box in BANDS.items():
    light = extract(box, GREEN, ORANGE)
    light.save(f"{OUT}/bitebox-{name}.png")

    dark = extract(box, GREEN_DARK, ORANGE_DARK)
    dark.save(f"{OUT}/bitebox-{name}-dark.png")

    print(f"{name:9s} {light.size[0]}x{light.size[1]}")
