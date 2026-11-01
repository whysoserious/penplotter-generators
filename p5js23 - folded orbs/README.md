# Folded orbs

A pen-plotter generator of fractals of three and four dimensions, raymarched and drawn
in a disc. It is an exercise in signed distance fields: a function that, for any point of
space, says how far the nearest surface is. Walk a ray in steps that long and it lands on
the surface. The fields here are kaleidoscopes — space folded on mirrors again and again,
scaled and twisted between the folds — some of them in four dimensions and cut by a
hyperplane, regular polytopes of four dimensions brought down by stereographic
projection, or the linked circles of a Hopf fibration. They can be kept inside a ball,
carved out of it, seen in a mirror ball, or seen from inside a ball that is a mirror on
the inside, where the fractal repeats in itself.

What the rays bring back is not a picture but readings: which piece of the fractal each
ray hit, through which mirrors, how far, which way the surface faced. A line is drawn
wherever two neighbouring readings disagree — another piece, another mirror, a jump in
depth, a fold of the surface — and every region between the lines is shaded with a
pattern of the pen: halftone dots, hatching, cross-hatching, lines that follow the
surface, or solid black. The whole of it can be folded into exact symmetry.

## Running it

No build step and no install — p5.js is bundled in `libraries/`.

**Straight from disk:** open `index.html` in a browser. Everything works from `file://`.
The rays are cast in Web Workers made from the sketch's own source — one per core; a
browser that will not start a worker from a page off the disk gets the same work done on
the page, a slice at a time, only slower.

**Through a local server** (for the *Copy link* button in a strict browser): from the
repository root run `python3 -m http.server 8000` and open
<http://localhost:8000/p5js23%20-%20folded%20orbs/>.

## Using it

1. Pick a **Scene** — Hopf rings in a ball, a tetrahedral kaleidoscope or a Menger sponge
   cut by the ball, the 24-cell, a tesseract in a mirror room, Hopf rings in a mirror ball,
   a kaleidoscope in a mirror room, a dome of the 24-cell, a quaternion Julia set, a
   four-dimensional sponge, six mirrors round a Menger, solid black in the far recesses,
   lines that follow the surface, what a mirror shows in red, white marker on black
   paper — or set it up in the panel. Each section folds away under its heading.
2. **Drag** on the sheet to turn the fractal; **shift-drag** turns it through the fourth
   dimension (the x–w and y–w planes); **alt-drag** or a right-drag turns the eye. The
   **wheel** moves the eye nearer and further. While the hand moves the rays are cast three
   times sparser and the sheet follows; when it stops they are cast again in full.
3. Keys: <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> turn by 5° (15° with
   <kbd>shift</kbd>); <kbd>S</kbd> steps through the scenes, <kbd>O</kbd> the fractals,
   <kbd>V</kbd> the views, <kbd>P</kbd> the patterns, <kbd>M</kbd> the symmetries,
   <kbd>N</kbd> adds a copy to it (<kbd>shift</kbd> takes one away); <kbd>R</kbd> rolls a
   new fractal of the same kind, <kbd>[</kbd> <kbd>]</kbd> step the seed; <kbd>X</kbd>
   switches the cut guides, <kbd>G</kbd> shows the margin, the orb and the wedge,
   <kbd>H</kbd> shows the rendered tones under the strokes.
4. **Download SVG [everything]** writes the sheet, a group per pen; **[one per pen]** a file
   per pass; a button per layer writes the outlines, the shading, the shading in mirrors,
   the solid black, the ring or the cut guides alone. **Download PNG** saves the preview.
   **Copy link** puts every setting in the clipboard — the address is the whole document.
5. Run the SVG through `../vpype-process.sh` and plot `output.svg`.

## How it works

**The rays.** The orb is a disc of `orbSize` % of the picture's short side, and a grid of
rays covers it, one every `detail` mm. Each ray goes through the scene by sphere tracing:
it asks the distance field how far the nearest surface is, steps that far (a little less),
and stops when it is nearer than a fraction of the width of a ray at that distance. The
normal is the gradient of the field, four readings round the hit; the ambient occlusion is
how much nearer the surface is than it should be at four points along the normal.

**The views.** In the **orb** the eye looks at the unit ball from outside and the lens is
set so the ball fills the disc exactly. In the **mirror ball** the eye sees only a mirror
ball that fills the disc, and every ray starts as its reflection. In the **mirror room**
the eye is inside a ball that is a mirror on the inside, with an equidistant fisheye; a
ray that misses the fractal bounces off the wall, up to `bounces` times. The **dome** is
the same fisheye with no mirror round it — for looking up from inside the fractal. A mirror
ball can hang in the middle of any of them.

**The fractals.**

- `kifs` — a kaleidoscopic IFS. Every fold reflects space on the mirrors of a tetrahedron
  (`tetra`, a Sierpiński kind) or of a cube with a Menger sponge's extra fold (`cube`),
  scales it by `kScale` away from a corner (`offX` `offY` `offZ`), and turns it a little
  before and after (`twistA`–`twistE`). What is left after `iters` folds is a box, a ball
  or three crossed beams (`coreShape`, `core`). Few folds make big slabs; twists make
  them stop being crystal.
- `mandelbox` — box folds and ball folds: architecture of rooms (negative `mbScale`) or
  towers (positive).
- `julia` — a quaternion Julia set, z ← z² + c in four dimensions, cut by the hyperplane
  w = `wSlice` after a turn through the fourth dimension (`xw` `yw` `zw`).
- `hyperfold` — the `kifs` kaleidoscope in four dimensions: every coordinate folded to its
  absolute value, the four sorted, scaled away from a four-dimensional corner — a sponge
  of a tesseract — turned and cut by `wSlice`.
- `polytope` — the edges of the tesseract, the 16-cell or the 24-cell, laid on the
  three-sphere as arcs of great circles and brought down to space by stereographic
  projection, so edges become arcs of circles and cells bubbles. The distance is an angle
  on the sphere (the point folded into one cell of the polytope's symmetry, then to the one
  edge left), and it is turned into a step that is safe in space by bounding how much
  sphere a step of a given length can cover.
- `hopf` — circles wound round nested Clifford tori of the three-sphere, `windA` times one
  way and `windB` the other; one each way is the Hopf fibration, every circle linked with
  every other. The same projection brings them down.

**The ball.** `enclose` keeps the fractal **inside** the unit ball (flat caps where the
ball cut it), **carves** it out of the ball, or keeps a **shell** of it. `hollow` carves a
round room at the heart, for a mirror ball to hang in. `objSize` sizes the fractal against
the ball.

**Symmetry.** The rays are cast through a disc folded into one wedge — a half under a
`mirror`, 1/2n of it under n `dihedral` mirrors, 1/n under a `rotational` symmetry — so the
readings are symmetric already, and under a plain mirror only half of them are cast at
all. The lines are then made for the wedge only and the wedge is turned and mirrored round
the middle of the orb: the sheet is exactly symmetric, hatching meets its mirror image on
the fold in a chevron, and an outline that runs up to the fold is put on it so it meets
its own reflection there; the two are joined into one stroke.

**Regions and outlines.** Every reading gets a name: the mirrors on its way, what it hit
(the fractal, the cap the ball cut, the sky), which piece of the fractal it is — the side
of each mirror the first `partDepth` folds put it on — and, with `panels`, a band of the
orbit trap (how near the folds came to the middle). Regions under `despeckle` readings are
swallowed by their largest neighbour. An edge runs between two neighbours of different
names, between two whose depth jumps by `depthEdge` %, or across a fold of the surface
sharper than `crease` — the last two not on a silhouette, where the normals graze and fold
every which way. The edges run along the sides of the readings, a staircase; they are
linked into chains between the points where three or more meet, smoothed (`smooth`) with
their ends held, and straightened where that changes nothing. A dangling piece shorter
than `minLine` is dropped.

**Tone.** Lambert light from `lightYaw` / `lightPitch` over an `ambient` floor, darkened by
the occlusion (`aoK`), fogged from the nearest surface to the furthest (`fog`: towards
paper above 0, towards ink below), each mirror on the way darkening it by `mirrorDim` %;
then contrast, gamma, `invert`. `flat` mixes every reading's tone with its region's mean —
at 100 every region is one flat tone, like a panel of a screen print — and `levels` cuts
the tones into steps.

**Shading.** Every region gets one pattern — the same for every region of one name, so
what is mirrored is shaded alike. Under `mixed` it is picked by the seed from the ticked
ones.

- `dots` — a grid `dotPitch` mm apart turned by `dotAngle`, a dot wherever the tone is
  darker than an 8×8 ordered dither (`bayer`), a random threshold or a row order. A dot is
  one touch of the pen.
- `hatch` — lines `hatchPitch` mm apart at the darkest, each line coming in at its own
  tone in an ordered sequence, so a tone of 50 % draws every other line. Each region's
  angle is `fixed`, one of four `per region`, or across the way its `surface` faces. A line
  once begun runs on through a slightly lighter tone, so a ripple does not break it.
- `cross` — the same, and a second family across it coming in over the darker half.
- `flow` — level lines of a field read off the hits (`depth`, world `height`, `radius`
  from the middle, the orbit `trap`, or the `light`), `flowLines` across the whole range,
  thinned by the same ordered sequence where the tone is light.

A margin of `edgeGap` mm of paper is left along every outline; lighter than `lightest`
is left bare. Darker than `solidAt` is filled solid by the usual contract: the dark is
drawn from half a nib inside its edge, an outline round it and passes `solidPasses` % of
the nib apart.

**The ring.** A `line` round the orb, a `double` one, a `halo` — a worn, dashed arc
outside it — or a `broken` ring of dashes.

**Pens.** Outlines, shading, shading of what a mirror shows (when `mirrorOwnPen` is on),
solid black and the ring each pick a pen of the drawer. The cut guides are one touch of
the first pen in use, unclipped, on a layer of their own.

## Parameters worth knowing

| Setting | What it does |
| --- | --- |
| `detail` | mm between two rays — the finer, the sharper the outlines and the slower |
| `precision` | % of a ray's width a ray must come within to call it a hit |
| `maxSteps` | how many steps a ray may take before it gives up |
| `partDepth` | how many of the first folds name the pieces — 0, the whole fractal is one |
| `panels` | bands of the orbit trap, each its own region |
| `depthEdge`, `crease` | the other two kinds of edge; 0 switches either off |
| `despeckle`, `minLine` | how small a region or a dangling line may be |
| `flat` | % of each region shaded with its own mean tone |
| `edgeGap` | mm of paper along every outline |
| `symmetry`, `symN` | none, mirror, dihedral n, rotational n |
| `cropMarks`, `cropMarkAt`, `cropMarkGap` | cut guide dots round the sheet or the picture |
