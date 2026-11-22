"""Draws Kasha's app icons into public/icons (and public/favicon.ico) from the logo, public/logo.svg.

The logo is a ladle of kasha with the character 学 ("to learn") in it.
Run from the repository root with:  npm run icons
That draws them and then puts their new version on every address that names them (scripts/icon-version.mts),
so phones fetch the new icons instead of keeping the old ones.
"""

import io
from pathlib import Path

import resvg_py
from PIL import Image

LOGO = Path("public/logo.svg")
PAPER = (251, 250, 247)  # --k-paper (light), also the manifest's background_color
OUT = Path("public/icons")


def logo(width: int) -> Image.Image:
    png = resvg_py.svg_to_bytes(svg_path=str(LOGO), width=width)
    return Image.open(io.BytesIO(bytes(png))).convert("RGBA")


def draw(size: int, content: float, background: tuple[int, int, int] | None) -> Image.Image:
    """`content` is the share of the side the logo's width may use (maskable icons keep to the safe zone)."""
    mark = logo(round(size * content))
    image = Image.new("RGBA", (size, size), (*background, 255) if background else (0, 0, 0, 0))
    image.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return image if background is None else image.convert("RGB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        draw(size, 0.92, None).save(OUT / f"icon-{size}.png")
        # The safe zone is a circle 80% of the side across; the logo's box (446 x 378) fits it at 60% of the side.
        draw(size, 0.6, PAPER).save(OUT / f"maskable-{size}.png")
    # iOS rounds the corners itself and wants no transparency.
    draw(180, 0.8, PAPER).save(OUT / "apple-touch-icon.png")
    draw(256, 0.96, None).save(Path("public/favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])


if __name__ == "__main__":
    main()
