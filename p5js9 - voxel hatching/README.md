# Voxel hatching

A pen-plotter generator: a structure made of unit cubes (a stacked 2D cellular automaton
or a Perlin terrain), seen through an orthographic or perspective camera and shaded with
hatching — up to four tone layers, cast shadows with a border of their own, a texture
through the solid and hidden lines removed. The result is exported as an SVG in
millimetres, ready for the plotter.

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

## Shadow borders

**Draw a border around them**, under *Light*, adds the edge of every cast shadow as a line
of its own: the shadow keeps its shape even where the tones on either side of it are
close, and a soft shadow no longer dissolves into the hatching. The border is cut by the
same visibility test as everything else, so it disappears behind whatever stands in front
of it.

## Texture

Under *Texture* sits a field running through the solid that shifts how dark each point is
before the tone layers are decided, so a face is a material instead of one flat grey. The
hatching stays on its own grid — only which layers reach a given point changes.

The first five run *through the solid*, so they cut across the faces and ignore where one
cube ends and the next begins:

| Pattern | Looks like |
|---|---|
| `grain` | fractal noise — rough stone, cast concrete, sand |
| `strata` | bands across a gently dipping bedding plane — sedimentary rock |
| `marble` | the same bands, warped hard until they swirl |
| `chequer` | alternate cells, a mosaic laid over every face |
| `speckle` | one value per small cell — a coarse aggregate |

The last three are *stamped on the faces*: a motif in the face's own coordinates, so every
side of every voxel carries the same one. Each is symmetric under a quarter turn and
mirrors across the tile border, so which way round a face lies never shows and neighbours
meet without a seam.

| Pattern | Looks like |
|---|---|
| `dome` | a bead, lightest in the middle, shading down to the ground between the beads |
| `coffer` | square rings of tone — a coffered panel |
| `rings` | concentric rings — a turned boss |

**Feature size** is the size of one band, blob or tile in voxels — for the stamped motifs
`1` puts exactly one on every voxel face and `0.5` puts four. Picking a pattern moves the
size to the one its family wants, unless it has already been moved off that default.
**Strength** is how far
the field can carry a point across a layer threshold — around 0.3 only mottles the edge of
a tone, past 0.6 the pattern carries the drawing. Below a voxel or so the hatching breaks
into very many short strokes, so keep an eye on the stroke count under *Plot*.

A motif needs a few hatch lines across one face to read, so tighten the line spacing or
use fewer, larger voxels; `every voxel` under *Edges* frames each tile and helps.

Three scenes show it off: **Eroded dunes**, **Marble ziggurat** and **Studded blocks**.

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
stroke. A texture is one more test at the same sample points, so a broken line still ends
on an exact boundary. The border of a cast shadow comes from marching squares over that
same shadow test, sampled on paper, chained into contours and cut by the same walk. The
details are in the comments at the top of each section of `sketch.js`.
