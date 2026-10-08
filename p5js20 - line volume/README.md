# Line volume

A pen-plotter generator of a block seen through, drawn as walls of lines. It started from a
plotter drawing of a box of air hatched with nothing but upright lines: the lines of its
long face evenly spaced, the lines of its short face coming forward one wall at a time, and
inside it a dark cloud where line falls on line until the paper goes black. Nothing hides
anything — it is all seen through, like a block of glass with smoke in it.

So the volume is cut into **walls**, every wall carries a family of lines, the lines of the
outside of the volume are drawn whole — they are the box — and the lines inside are drawn
only where a **density field** asks for them. Every wall shows through every other, so the
dark builds up on paper wherever the field is dense. The field can be a noise cloud, blobs,
a mathematical surface or a formula you type in, a 2D cellular automaton with each
generation a level higher, or a photograph.

## Running it

No build step and no install — p5.js is bundled in `libraries/`.

**Straight from disk:** open `index.html` in a browser. Everything works from `file://`.

**Through a local server** (for the *Copy link* button in a strict browser): from the
repository root run `python3 -m http.server 8000` and open
<http://localhost:8000/p5js20%20-%20line%20volume/>.

## Using it

1. Pick a **Scene** — smoke in a glass block, crossed or in dashes, a red heart, a gyroid,
   a torus in slices, a double helix, ripples, Life a generation a floor, Anneal and
   Diamoeba growing up, the Replicator's pyramid, a worm of blobs, curtains, a twisted
   tower, a book of pages, a stair of walls, spun walls, two photo scenes and markers on
   black paper — or set it up in the panel. Each section folds away under its heading.
2. **Drag** on the sheet to turn the camera: across is the azimuth, up and down the
   elevation. **Shift-drag** (or a right-drag) pans, **alt-drag** moves the dark zone
   through the block, the **wheel** zooms about the cursor. The arrow keys turn by 1°, or
   10° with <kbd>shift</kbd>; <kbd>+</kbd> <kbd>−</kbd> zoom and <kbd>0</kbd> resets zoom
   and pan. <kbd>S</kbd> steps through the scenes, <kbd>W</kbd> through the ways the walls
   stand, <kbd>F</kbd> through the fields, <kbd>D</kbd> through the ways the dark becomes
   ink, <kbd>L</kbd> through the line styles; <kbd>P</kbd> switches the projection,
   <kbd>G</kbd> shows the box and the dark zone's middle, <kbd>R</kbd> rolls a seed,
   <kbd>[</kbd> <kbd>]</kbd> step it.
3. **Download SVG [everything]** writes the sheet, a group per pen; **[one per pen]** a file
   per pass; a button per layer writes the walls, the dark zones, the accent or the edges
   alone. **Download PNG** saves the preview. **Copy link** puts every setting in the
   clipboard as a URL — all but a loaded photograph, which has to be loaded again.

The paper is any of A0–A5 and B0–B5, either way round, or **custom**. The block is fitted
inside the **Margin** at 100 % zoom. Everything is in millimetres, and the SVG is the sheet
at 1:1.

## How it is made

### The walls

A wall has coordinates of its own: across it, along its lines, and how far through the
stack it stands, from the first wall to the last. **Walls stand**:

- **depth** — upright walls one behind another, from the front of the block to its back;
  the reference drawing;
- **floors** — level floors one over another from the bottom up, their lines running from
  the back to the front;
- **pages** — upright walls round the vertical axis, from a **Hole in the middle** out to
  the rim, like a book stood open, over a **Sweep** of up to a whole turn;
- **rings** — cylinders one inside another, from the rim in, their lines running round.

**Width**, **Height** and **Depth** are the block's proportions (the width is the diameter of
pages and rings); the fit decides how large it is drawn. **Walls** is how many,
**Crowding** packs them towards the first or the last, **Jitter** nudges each off its
place. **Lines across a wall** sets the spacing, **Shift a wall** slides each wall's lines
on by a share of that spacing so the walls interleave on paper, and **Slant** tilts the
lines in their wall.

**Drawn whole** picks the lines drawn end to end whatever the dark: *front + ends* — the
first wall and the side edges of every wall, which is the box of the reference; *outside* —
the last wall as well; *front*, *ends*, *every line* or *none*. **And every n-th wall**
adds whole walls at a stride. **Edges** draws the top and bottom of every wall, every
wall's outline, or only the box round the whole.

**Lines** gives every line, whole or not, a style: *wavy*, *tremor* (Perlin, like a hand),
*zigzag*, *dashed* or *dotted*, with an **Amplitude** in shares of the line spacing and a
count up the wall.

### Bending the walls

Before a point goes into the world its wall can be **spun** in its own plane, **tapered**
(the last wall larger or smaller than the first) and **slid** sideways and up — each a
little more from one wall to the next, which makes stairs, fans and leaning stacks. After
that the wall is **bowed** out in the middle and **waved** along its own normal — waves
across it, up it, and travelling from wall to wall like a curtain in the wind — the whole
block is **twisted** round the vertical from bottom to top, and **warped** by noise. The
field is always read where the point stood before any of this, so the dark zones go
wherever the walls go.

### The dark zones

The field is read at a point of the block whose coordinates run from −1 to 1 across it.

- **cloud** — fractal Perlin noise, its coordinates swirled by noise of their own, brought
  to 0 … 1 by its 2nd and 98th percentiles.
- **blobs** — gaussian metaballs, summed and cut at a half with a **Softness**, laid out
  *scattered*, as a *chain* (a worm wandering through, bouncing off the sides), a *ring*
  or a *helix*.
- **function** — the gyroid, Schwarz P and diamond minimal surfaces, a sphere, a torus, a
  double helix, plane waves, ripples, a lattice of spheres — or **custom**, a formula of
  your own in x, y, z (−1 … 1), r (the distance from the middle), a (the angle round the
  vertical) and h (the height, 0 … 1), with the functions of `Math`, `fract`, `mod`,
  `clamp`, `mix`, `step`, `smoothstep` and `noise(x, y, z)`; `^` is a power. Only those
  names and numbers are let through, so a link cannot carry anything else. Every function
  is first brought to −1 … 1 by its percentiles, since no formula knows its own range, and
  then taken as a **surface** (a skin of some **Thickness** at a **Level**), as everything
  **inside** the level, or as its **value**. **True proportions** reads it without
  stretching it to the block, so a sphere stays round.
- **automaton** — a 2D cellular automaton in B/S notation (presets: Life, HighLife,
  Replicator, Fredkin, Coral, Day & Night, Maze, Majority, Anneal, Gnarl, Seeds, Diamoeba)
  on the plan of the block, **each generation a level higher**: the cells alive at a level
  are where the dark is. It starts *random*, from a random *disc*, one cell in the
  *centre*, a *cross* or a *ring*; **Generations a level** skips some, **Generations before
  the first** lets it settle, and a **Trail** keeps a share of a dead cell a level later,
  so the stack goes soft. **Lines follow the cells** puts one line on every cell and one
  wall on every row of cells (or every generation, on floors), and the runs end exactly
  on the cells' edges.
- **photo** — any picture from disk, in greys, laid on the *front* and through every wall;
  as a *relief* as deep from the front as it is dark; as a *lens* as thick about the
  middle; as a *heightmap* on the plan, standing as high as it is dark; or on the *plan*
  the whole height. **Left empty under** drops the paper-white background out.

**Shaping the dark**: **Gathered into** a *ball*, a *column* or a *layer* with a soft edge
(alt-drag moves it); **Level**, **Contrast**, **Gamma**; **Bands** cuts it into terraces;
**Inside out**; a **Haze everywhere**; **Darkest** caps it — where every wall shows every
line the paper goes black, and below 100 % even the core stays smoke; **Fading to the last
wall**; **Grain**.

### From the dark to ink

- **dither** — every line has a threshold of its own and is drawn wherever the field is
  denser than it, pinned exactly where it crosses. The thresholds are spread over the lines
  and the walls together — **ordered** by a Bayer matrix, **random**, **by wall** (whole
  walls take turns) or **by line** — so the number of lines through any place is as large
  as the field is dense there, and seen through, the dark adds up.
- **solid** — every line where the field is denser than one **Cut**: the shape filled, and
  dark on paper where it is thick.
- **squiggle** — lines shake across themselves as hard as the field is dense.
- **dashes** — every line broken into dashes as long as the field is dense.
- **contours** — the edge of the dark on every wall, by marching squares: stacked slices,
  like a scan.
- **crossed** — dither, and lines across the walls where it is densest.

**Shortest piece** drops crumbs. **Accent** moves part of the dark to another pen: the
densest of it (a red heart), the back or front walls, every n-th wall, or random lines.

### Camera

**parallel** draws as a drawing would; **perspective** from **Distance** half-diagonals
away, and with **Upright lines stay upright** the camera looks level and the picture is
shifted instead, as a shift lens does, so the upright lines of the walls stay upright.
Nothing is hidden: the block is seen through, as in the reference.

## Pens

Five slots — the drawer's black and red rapidographs and red, silver and white markers by
default — and each layer (walls, dark zones, accent, edges) picks one by number. Each pen
is clipped to the margin less half its own nib. The stats give how far apart the lines of
the first wall and the walls at its end land on paper, and warn when that is closer than
the pen is wide.

## What ends up in the files

No fills and no background rectangle. `stroke-width` is each pen's own nib and the caps are
round. **everything** is one `<g>` per pen; a layer's file is that layer alone. Every file
is the same sheet — the same `width`, `height` and `viewBox` in millimetres. Strokes come out
ordered greedily, one pen at a time; `vpype-process.sh` is the usual next step. Two
comments ride at the top of every file: the settings in one line, and the URL that rebuilds
the sheet.

## Watching the cost

The default A3 sheet is about 1 100 strokes and 70 m of line, some 26 minutes at the
plotter. The dark costs: a dense core drawn through 30 walls is every line of every wall,
which is why **Darkest** is there. *dashes* and *dotted* lines cost pen lifts — a stroke
a dash. The walls are built in 10–170 ms and kept: turning the camera only projects them
again.
