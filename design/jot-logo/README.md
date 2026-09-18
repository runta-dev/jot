# Jot — pixel identity 01

Reference: pi.dev's coarse pixel geometry and restrained palette. Original Jot glyphs; no pi artwork copied.

The mark is a lowercase j: an orange square dot above a stepped hook. The dot refers to a jot, the smallest mark on a page; the hook makes the letter legible at favicon sizes. The custom lowercase jot wordmark uses the same grid, with no font dependency.

## Assets

- `jot-mark.svg`: transparent color icon,16×16 viewBox.
- `jot-wordmark.svg`: transparent custom pixel lettering,44×16 viewBox.
- `*-mono.svg`: single-color versions.
- `*-dark.svg`: warm-white body with orange dot for dark surfaces.
- `jot-mark-{16,24,32,48,64,128,256,512}.png`: transparent pixel-aligned icons.
- `jot-wordmark.png`: transparent704×256 wordmark.
- `jot-logo-board.png`: complete presentation sheet.
- `preview.html`: local presentation.

Palette: ink `#272925`, terracotta `#D97945`, warm paper `#F7F5EF`.

Keep the rectangular pixels, one-cell gap below the dot, and consistent stroke weight. Prefer icon dimensions divisible by8 for exact pixel alignment. Reserve at least one grid unit of surrounding clear space in layouts. Do not add gradients, rounded cells, outlines or artificial pixel texture.

Approved identity applied to the README and Web UI. Runtime copies live in `packages/ui/public/brand/`; the favicon adapts to light/dark browser themes. `build.py` regenerates SVG/PNG files; presentation labels use local Arial/Courier New on macOS, while logo SVG files contain rectangles only.
