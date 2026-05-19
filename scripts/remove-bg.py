"""Remove backgrounds from WISP_Schriftzug.png and WISP_Figur.png.

- Schriftzug: gold pixel-art text on solid dark background. Threshold-based
  removal (color distance from background) is bullet-proof here and produces
  crisp pixel-perfect edges.
- Figur: photographed clay character on cream gradient background. We use
  rembg (U2Net AI model) which handles soft shadows and edges.

Output goes to docs/assets/.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "assets"


def remove_solid_bg(
    src: Path,
    dst: Path,
    bg_color: tuple[int, int, int] | None = None,
    tolerance: int = 50,
    feather: int = 6,
) -> None:
    """Make pixels close to bg_color transparent. bg_color auto-detected from
    corner pixels if not given. `tolerance` is the color distance below which
    a pixel is fully transparent; `feather` smooths the edge over that many
    additional units of distance."""
    img = Image.open(src).convert("RGBA")
    arr = np.asarray(img).astype(np.int32)

    if bg_color is None:
        # Sample the four corners — most stable estimator for a solid bg.
        h, w = arr.shape[:2]
        samples = np.stack(
            [arr[0, 0], arr[0, w - 1], arr[h - 1, 0], arr[h - 1, w - 1]]
        )
        bg_color = tuple(int(c) for c in np.median(samples[:, :3], axis=0))

    bg = np.array(bg_color, dtype=np.int32)
    # Euclidean color distance per pixel in RGB.
    diff = arr[..., :3] - bg
    dist = np.sqrt(np.sum(diff * diff, axis=-1))

    # Alpha curve: 0 below tolerance, 255 above tolerance + feather, smooth between.
    alpha = np.zeros_like(dist)
    alpha = np.where(dist >= tolerance + feather, 255, alpha)
    band = (dist > tolerance) & (dist < tolerance + feather)
    alpha = np.where(band, (dist - tolerance) / feather * 255, alpha)

    out = arr.copy()
    out[..., 3] = alpha.astype(np.uint8)
    out = np.clip(out, 0, 255).astype(np.uint8)

    Image.fromarray(out, "RGBA").save(dst, optimize=True)
    print(f"  wrote {dst} (bg={bg_color}, tol={tolerance}, feather={feather})")


def remove_bg_ai(src: Path, dst: Path) -> None:
    """Use rembg (U2Net) for the clay figure photograph."""
    from rembg import remove

    data = src.read_bytes()
    result = remove(data, alpha_matting=False)
    dst.write_bytes(result)
    print(f"  wrote {dst} (via rembg)")


def main() -> int:
    ASSETS.mkdir(parents=True, exist_ok=True)

    schriftzug_src = ROOT / "WISP_Schriftzug.png"
    figur_src = ROOT / "WISP_Figur.png"

    if not schriftzug_src.exists() or not figur_src.exists():
        print("source images missing", file=sys.stderr)
        return 1

    print("Schriftzug -> docs/assets/wisp-logo.png")
    remove_solid_bg(
        schriftzug_src,
        ASSETS / "wisp-logo.png",
        bg_color=None,
        tolerance=55,
        feather=10,
    )

    print("Figur -> docs/assets/wisp-figure.png")
    try:
        remove_bg_ai(figur_src, ASSETS / "wisp-figure.png")
    except Exception as e:
        print(f"  rembg failed ({e}); falling back to threshold")
        remove_solid_bg(
            figur_src,
            ASSETS / "wisp-figure.png",
            bg_color=None,
            tolerance=40,
            feather=12,
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
