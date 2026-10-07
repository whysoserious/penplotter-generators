# Hyperspace mandala

A pen-plotter generator: psychedelic patterns held in the exact symmetry of a mandala.
Rings of motifs — lotus petals, eyes, jewels, fish scales and seigaiha, Shipibo-style
mazes, spiral lattices, Sierpiński teeth, Koch edges, guilloche, florets — round a fractal
heart: the DMT chrysanthemum, a hyperbolic tiling of the Poincaré disk, a Julia set, an
Apollonian gasket, the mandala inside itself as a tunnel. Then the whole of it is bent by a
trip — a vortex, a swirl, breathing, ripples, a symmetric melt — and wrapped in an aura,
with a background that bursts out to the edges of the sheet.

Two technical pens draw the fine work, black and red, split by ring or by outline and
detail; three ink markers, 3 to 15 mm, lay broad bands, bindus and rays under it. On black
paper the white and silver markers draw it all, larger.

## Running it

No build step and no install — p5.js is bundled in `libraries/`.

**Straight from disk:** open `index.html` in a browser. Everything works from `file://`.

**Through a local server** (for the *Copy link* button in a strict browser): from the
repository root run `python3 -m http.server 8000` and open
<http://localhost:8000/p5js18%20-%20hyperspace%20mandala/>.

## Using it

1. Pick a **Trip** — five DMT ones, two ayahuasca, two LSD, MDMA, and a few more — or set
   the mandala up in the panel. Each section folds away under its heading.
2. **Drag** on the sheet to turn the mandala, **shift-drag** (or a right-drag) to move it,
   the **wheel** (or <kbd>↑</kbd> <kbd>↓</kbd>) to wind the vortex in its middle; <kbd>←</kbd>
   <kbd>→</kbd> turn it. <kbd>T</kbd> steps through the trips, <kbd>C</kbd> through the
   hearts, <kbd>B</kbd> through the backgrounds; <kbd>R</kbd> rolls a seed, <kbd>[</kbd>
   <kbd>]</kbd> step it, <kbd>M</kbd> leaves every ring to chance and rolls; <kbd>G</kbd>
   shows the rings as they were laid out before the warp.
3. **Download SVG [everything]** writes the sheet, a group per pen at its own width;
   **[one per pen]** a file per pass; under them a button per layer. **Download PNG** saves
   the preview. **Copy link** puts every setting in the clipboard as a URL.

The paper is any of A0–A5 and B0–B5, either way round, or **custom** in millimetres.
Everything is in millimetres, and the SVG is the sheet at 1:1.

## How it is made

### Conformal cells

A ring is cut into cells — a multiple of the **Symmetry** — and its motif is drawn once,
in one cell's own coordinates: x across it is the angle, y up it is the logarithm of the
radius. That map, the complex logarithm turned inside out, is conformal: a small circle
drawn in a cell is still a circle on the paper, and every angle is kept. It also means the
motifs grow as they go out. A cell far out is larger than one near the middle by exactly
the ratio of their radii, so a ring of identical motifs reads as something bursting
outward, the way the florets of a chrysanthemum or the tiles of a hyperbolic plane do. A
straight line in a cell is a logarithmic spiral on the paper.

Every cell of a ring is the same, so the symmetry is exact: n-fold, and mirrored too when
the motif is. **Every other ring turned half a cell** sets the motifs of one ring between
those of the next.

**Rings spaced growing** spaces the rings evenly in the logarithm of the radius, so all of
their cells are the same shape; **even** spaces them evenly in the radius. **Cells in a
ring: fit** gives each ring the multiple of the symmetry that makes its cells the shape its
motif likes best.

### Motifs

**petals** (lotus, leaf, flame, or layered — a back row peeking between the front petals,
hidden where they stand), **arches** (round, pointed, onion domes), **zigzag** (chevrons,
meanders, diamonds), **sierpinski** (teeth subdivided level by level), **beads**,
**interlace** (the flower of life's overlapping circles, or chains), **lattice** (lines
sliding across neighbouring cells — logarithmic spirals both ways, a vortex, or chords
straight on the paper, a hyperboloid's moiré), **pinwheel**, **florets**, **rays**,
**waves**, **guilloche**, **kené** (below), **eyes** (with lashes, creases or a spiral
iris), **scales** (fish scales, or seigaiha — rows of fans, the nearer hiding the farther),
**jewels** (faceted hexagons), **koch** (a Koch or square Koch edge), **tree**,
**checker** (op-art hatching), **vines** (curls and leaves) and **lines**.

Each ring can be set by hand — **Ring 1** is the innermost — or left to chance, by the
weights under it and the seed. Each ring also draws its motif in a variant of its own.

A motif's nested lines — echoes of a petal, rows, Sierpiński levels, contour lines — stop
where two of them would come closer on the paper than **Closest two lines**, or than two
nibs of the pen that draws them. So the small rings near the middle are drawn in outline
and the large ones far out in full, and a marker gets fewer, wider-spaced lines on its own.

**Kené** is drawn the way the mazes painted and embroidered along the Ucayali look: a path
carved through a grid by a depth-first walk, mirrored, joined across the middle, and the
corridors round it filled with lines that follow it — the contours of the distance to the
path, found by marching squares, with the neighbouring cells' paths counted so the lines
run on from cell to cell. A small diamond marks each dead end.

### The heart

- **chrysanthemum** — florets laid by the golden angle, each a petal turned outward and
  larger towards the rim: the spinning flower said to come before the breakthrough.
- **hyperbolic** — the Poincaré disk tiled by regular p-gons, q round every corner, when
  (p − 2)(q − 2) > 4. The middle tile's corners sit at tanh(R/2), with cosh R =
  cot(π/p) cot(π/q); every other tile is a tile reflected across one of its edges, an
  inversion in the circle that edge lies on, which meets the rim at right angles. Tiles
  stop when they would come out smaller than the pen can draw. **In every tile**: stars,
  an inner polygon, circles, or stars and polygons in turn.
- **julia** — a Julia set of z^d + c, which is d-fold symmetric like the mandala round it,
  drawn as level lines of the smooth escape count, spaced so each takes an equal share of
  the area, and the edge of the set itself.
- **apollonian** — three circles in a circle, and in every gap between three that touch,
  the one that touches all three: k' = 2(k₁ + k₂ + k₃) − k₄, and the same for k·z.
- **droste** — the rings again inside the heart, and again inside that, each level turned
  a little further: a tunnel.
- **string** — a times table round a circle, point i joined to point m·i: a cardioid at 2,
  a nephroid at 3.
- **stars** — star polygons {N/q} nested, every other turned half a point; **seed of life** —
  nineteen circles on the hexagonal lattice; **bindu** — rings round a solid point.

### The trip

Before anything reaches the paper it is pushed through a warp of the radius and the angle:
a **vortex** that turns the middle, less and less outward; a **swirl** that grows to the
rim; **breathing** — the radius swelling in lobes that are a multiple of the symmetry;
**ripples** running out; a **bulge**, the radius raised to a power; and a **melt** — the
radius pushed by noise that is read at the point folded into half a sector, so it repeats
and mirrors exactly as the mandala does. None of them breaks the symmetry. Every line is
walked through the warp by halving each piece until its middle lies within 0.03 mm of its
chord and the chord is no longer than 3 mm.

### Aura and background

The **aura** is echoes round the rim, each waving in lobes of the symmetry, every other one
the other way. Behind it the **background** runs out to the edges of the sheet: bands of
any ring motif growing outward (**motif**), **rays**, **ripples**, **interference** — two
systems of ripples a little apart, a moiré — a **tunnel** of spirals both ways, or
**op-art** — parallel lines, bent by the warp round the mandala. It can be left out of the
warp.

### Broad strokes — markers

**Bands**: a marker line on every border, or rings filled solid — every other ring, the
outer one, or the heart — in concentric passes half a nib in from either edge and
**Fill passes** of the nib apart. **Bindus**: dabs (at size 0, one touch of the nib) or
filled discs, in the middle or on the cells of a ring. **Broad rays** under everything.

## Pens

Five pens, a pass of the plotter each, each a **Kind** — black or red rapidograph, red,
silver or white marker, or another — at a **Width**, with a preview **Colour**. The heart,
the rings, the borders, the aura and the background each pick one; **Rings split** sends
each motif's nested lines to the **Second pen** (*outline and detail*), or every other
ring, or half of them; **Heart split** does the same for the heart. **Passes go down**
orders the passes, broad first by default. The **Paper** colour is the preview's alone, and
the stats say when a pen would barely show on it.

## What ends up in the files

No fills and no background rectangle. `stroke-width` is each pen's own nib and the caps are
round. **everything** is one `<g>` per pen, `id="pen1-black"` …, in the order the passes go
down; a pen's file is one group, a layer's file a group per pen it uses. Every file is the
same sheet — the same `width`, `height` and `viewBox` in millimetres — so the passes land on
one another. Strokes come out ordered greedily, one pen at a time; `vpype-process.sh` is the
usual next step. Two comments ride at the top of every file: the settings in one line, and
the URL that rebuilds the sheet.

## Watching the cost

The default A3 is about 3 500 strokes and 66 m of line, some 40 minutes at the plotter; the
trips run from a quarter of an hour to over an hour. What moves it most: **Detail** and
**Closest two lines** (the nested lines are most of the ink), the **lattice** and
**guilloche** rings (long and many), a **kené** background (contour lines over the whole
sheet), and a hyperbolic heart with decorated tiles (a stroke for every edge). A sheet
builds in 15–110 ms.
