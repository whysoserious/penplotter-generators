# Voxel hatching

A pen-plotter generator: a structure made of unit cubes (a stacked 2D cellular automaton
or a Perlin terrain), seen through an orthographic or perspective camera and shaded with
hatching — up to four tone layers, cast shadows and hidden lines removed. The result is
exported as an SVG in millimetres, ready for the plotter.

## Running it

No build step and no install — p5.js is bundled in `libraries/`.

**Straight from disk:** open `index.html` in a browser (double-click it, or
`open index.html` on macOS). Everything works from `file://`.

**Through a local server** (handy when the browser is strict about `file://`, e.g. for
the *Copy link* button): from the repository root run

```bash
python3 -m http.server 8000
```

and open <http://localhost:8000/p5js9%20-%20voxel%20hatching/>.

## Using it

1. Pick a **Scene** to start from, or set up the structure, camera, light and hatching in
   the panel on the left. The stats under **Plot** show the stroke count, the ink length
   and a rough plot time.
2. Move the camera on the sheet itself (see the controls below).
3. Press **Generate SVG**. The file is named after the rule, the paper and the camera,
   and its header comment holds the link that rebuilds the exact same sheet.

Every setting lives in the address bar. **Copy link** keeps the sheet, pasting the link
into a tab brings it back, **Reset** returns to the defaults.

Optional clean-up with [vpype](https://github.com/abey79/vpype) (sorts and merges the
strokes once more), from the repository root:

```bash
./vpype-process.sh "path/to/voxels ….svg"
```

It writes `output.svg` next to where it is run.

## Camera controls

| Input | Action |
|---|---|
| drag | turn the camera |
| mouse wheel | zoom into the point under the cursor |
| Shift + drag, or right-drag | pan |
| ← → | azimuth, 5° per press |
| ↑ ↓ | elevation, 5° per press |
| Shift + arrows | pan, 10 mm per press |
| + / − | zoom in / out |
| 0 | reset zoom and pan |
| P | switch orthographic ⇄ perspective |

While the camera moves only the shaded model follows; the hatching is recomputed once the
movement settles. Keys are ignored while a text field, a list or a slider has the focus.

## Cutting the image out

Tick **Cut guide dots around the image** under *Paper*. Dots are plotted on a rectangle
around the drawing (or around the margin line), a set distance away from it, with a dot on
every corner and no gap wider than the chosen maximum — lay a ruler through two dots and
cut with a knife or a guillotine.

## How it works

The voxel grid is its own acceleration structure: a point on a hatch line or an edge is
visible when a walk through the voxels towards the camera (Amanatides–Woo) meets nothing,
and in shadow when the same walk towards the lamp does. Lines are sampled every 0.25 mm on
paper and each visibility change is pinned down by bisection. Faces that share a plane
and an orientation are hatched as one region, so a line crosses a whole floor in a single
stroke. The details are in the comments at the top of each section of `sketch.js`.
