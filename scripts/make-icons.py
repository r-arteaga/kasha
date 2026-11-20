"""Draws Kasha's app icons into public/icons (and public/favicon.ico).

The icon is the app's signature: a "K" sitting on the highlighter mark that follows the spoken word, on the accent.
Run from the repository root with:  uv run --with pillow scripts/make-icons.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ACCENT = (185, 61, 11)  # --k-accent (light)
PAPER = (251, 250, 247)  # --k-paper (light)
MARKER = (255, 214, 107)  # --k-marker (light)
INK = (28, 27, 25)  # --k-on-marker (light)
FONT = Path("C:/Windows/Fonts/segoeuib.ttf")
OUT = Path("public/icons")
SCALE = 4  # draw large, then shrink, for smooth edges


def draw(size: int, content: float) -> Image.Image:
    """`content` is the share of the side the letter and its mark may use (maskable icons keep to the safe zone)."""
    side = size * SCALE
    image = Image.new("RGB", (side, side), ACCENT)
    pen = ImageDraw.Draw(image)
    box = side * content
    font = ImageFont.truetype(str(FONT), int(box * 0.86))
    left, top, right, bottom = pen.textbbox((0, 0), "K", font=font)
    width, height = right - left, bottom - top
    x = (side - width) / 2 - left
    y = (side - height) / 2 - top - box * 0.04
    # The marker: a soft-cornered bar across the lower part of the letter, a little wider than it.
    mark_top = y + top + height * 0.58
    mark_bottom = y + top + height * 1.06
    pad = width * 0.16
    mark = (x + left - pad, mark_top, x + right + pad, mark_bottom)
    radius = (mark_bottom - mark_top) * 0.28
    pen.rounded_rectangle(mark, radius=radius, fill=MARKER)
    pen.text((x, y), "K", font=font, fill=PAPER)
    # Over the mark the letter turns to ink, as text over the marker does in the app (--k-on-marker).
    inked = image.copy()
    ImageDraw.Draw(inked).text((x, y), "K", font=font, fill=INK)
    mask = Image.new("L", (side, side), 0)
    ImageDraw.Draw(mask).rounded_rectangle(mark, radius=radius, fill=255)
    image.paste(inked, (0, 0), mask)
    return image.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("icon-*.png"):
        old.unlink()
    for size in (192, 512):
        draw(size, 0.62).save(OUT / f"icon-{size}.png")
        draw(size, 0.46).save(OUT / f"maskable-{size}.png")
    # iOS rounds the corners itself and wants no transparency.
    draw(180, 0.62).save(OUT / "apple-touch-icon.png")
    draw(256, 0.62).save(Path("public/favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])


if __name__ == "__main__":
    main()
