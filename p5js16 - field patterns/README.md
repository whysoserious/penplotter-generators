# Field patterns

A pen-plotter generator: a pattern of small marks — circles, rings, squares, stars,
spirals, truchet tiles, dots — swelling, shrinking, slipping and turning with a height
map, or a pattern of whole lines bent by it, on a flat sheet or wrapped round a ball or a
box and seen from outside or from inside. It started from a grid of circles whose size and
place follow a smooth field, so that the overlaps crowd into dark knots and the grid
swims into a moiré. One pen or two: black alone, or black and red.

## Running it

No build step and no install — p5.js is bundled in `libraries/`.

**Straight from disk:** open `index.html` in a browser. Everything works from `file://`.

**Through a local server** (for the *Copy link* button in a strict browser): from the
repository root run `python3 -m http.server 8000` and open
<http://localhost:8000/p5js16%20-%20field%20patterns/>.

## Using it

1. Pick a **Scene**, or set up the **Pattern**, the **Height map** and the **Surface** in
   the panel on the left. The stats under **The sheet** give the stroke count, the ink
   length, how many marks were too small to keep and a rough plot time.
2. On a **flat** sheet a drag slides the field under the pattern and the wheel changes
   its scale. On a **sphere** or a **cube** a drag turns the camera and the wheel zooms.
   **Shift-drag** (or a right-drag) pans. The arrow keys turn by 1°, by 10° with
   <kbd>shift</kbd>; <kbd>X</kbd> steps through the patterns, <kbd>H</kbd> through the
   fields, <kbd>S</kbd> through the surfaces, <kbd>C</kbd> switches one colour and two,
   <kbd>R</kbd> rolls a seed, <kbd>[</kbd> <kbd>]</kbd> step it, <kbd>P</kbd> switches the
   projection, <kbd>+</kbd> <kbd>−</kbd> <kbd>0</kbd> zoom.
3. **Download SVG [everything]** writes the sheet, a group per pen; **[one per pen]** a
   file for black and a file for red, each a pass of the plotter. **Copy link** puts every
   setting in the clipboard as a URL — except a picture loaded as the height map, which
   has to be loaded again.

The paper is any of A0–A5 and B0–B5, either way round, or **custom** at any width and
height in millimetres. Everything is in millimetres, and the SVG is the sheet at 1:1.

## How it is made

### The height map

Every field is read at a point of space: on a flat sheet (x, y, 0), the sheet running from
−1 to 1 across its longer side; on the ball a point of the unit sphere; on the box a point
of the cube from −1 to 1. Read in three dimensions, a field runs over the edges of the box
and round the ball without a seam.

- **perlin** — fractal Perlin, **Octaves** of it at **Roughness**.
- **ridged** — the same folded into sharp crests, each octave weighted by the last.
- **warped** — Inigo Quilez's warp: noise read where noise itself pushed the point.
- **marble** — stripes at **Angle**, bent by noise.
- **worley** — the distance to the nearest of points scattered one to a cube of space;
  **cracks** — the gap between the nearest and the next nearest, which is zero along the
  walls between them; **mosaic** — a value of its own for each point's cell.
- **waves** — rings running out from a few **Sources** and adding up where they cross.
- **plasma** — sines running every way, summed.
- **metaballs** — soft blobs, summed.
- **gyroid**, **egg crate** — the triply periodic surfaces, read as a height.
- **rings**, **spiral** (with **arms**), **gradient** — plain geometry, for clean demos.
- **julia** — a Julia set's smooth escape count, c on the circle of radius 0.7885 at
  **Julia c**.
- **reaction-diffusion** — Gray–Scott on a 128² grid that wraps round, run for 5 000 steps
  from a few seeded drops; spots, maze, coral, worms, holes and mitosis are its rates of
  feeding and dying off. Half a second to run, kept until the seed or the kind changes.
- **image** — any picture from disk, its darkness the height.

The fields that are pictures — julia, the reaction, an image — have no third dimension;
on a surface they are read on whichever face of the cube the point falls on.

Any field can be **warped** — pushed about by noise before it is read — and **slid**
under the pattern. A **second field** can be blended in (add, multiply, screen, max, min,
difference, mask), and it is also what the pens can be split by.

Every field returns whatever numbers it likes; it is then *levelled*: read at a couple of
thousand points spread over the surface, its 2nd and 98th percentile taken to 0 and 1. So
no field has to know its own range, all of them land the same way, and a blend of two is
fair. Last come **Contrast**, **Bias**, **Terraces** and **Invert**.

### The patterns

**Marks**, one to a cell: circles, rings, squares, polygons, nested squares, crosses,
dashes, hatched cells, spirals, stars, flowers, ellipses, truchet tiles, 10 PRINT
diagonals and dots. A mark is sized between **Size at the lowest** and **at the
highest**, past 100 % overlapping its neighbours; it **slips** off its place by the
height, all one way, or up the slope of the field, by how steep it is against the
steepest on the sheet; it **turns** to face up the slope or by the height; and the height
gives it its rings, lines, turns or dots, up to **Detail**. The cells sit on a **square**,
**hex**, **radial**, **jittered** or **poisson** grid. Truchet tiles and 10 PRINT join their
neighbours, so they are always square; the tile is turned one way as often as the height
is high.

**Lines**, across the whole sheet: ruled **lines** pushed aside by the height; **waves**
that grow with it; a **squiggle** that winds tighter and wider where it is high; the
**ridgelines** of a floating horizon, each lifted by the field and hidden where a line in
front stands higher; **contours** by marching squares, the crossings named by the edge they
lie on so that the pieces join exactly; **flow** — streamlines a cell apart after Jobard
and Lefer, up the slope or turned to run round it; one **spiral** and **concentric** rings,
both pushed out and in; **tone hatching** in up to four directions, each kept where the
field passes its level; and a **warped grid**.

### Charts

A pattern lives on charts — rectangles of its own plane, measured in cells — and the field
is read through them at the point of the surface each place lands on.

- **flat** — one chart, the drawable box, a cell **Cell** mm wide.
- **cube** — six, one a face, **Cells across a face**. The pattern ends at the edges.
- **sphere / cube map** — six faces of a cube blown out onto the ball, their coordinates
  spaced by angle so the cells by their corners are not squeezed. A mark may run on over
  a seam, so the marks along it stay whole; lines end at it.
- **sphere / lat-long** — one chart round the ball like a globe; it crowds at the poles.
- **sphere / fibonacci** — no chart: marks scattered as evenly as points can be by a
  Fibonacci spiral, each laid in the plane touching the ball and carried onto it from its
  middle. Marks only; the lines fall back on the cube map.

The faces are turned so that seen from outside the pattern is never mirrored.

### Seeing it

From **outside** the camera stands **Distance** radii away, or infinitely far for the
orthographic view. **Inside, cut open** is the same camera with the near half of the
surface taken away, so the inside of the far half shows. **Inside, camera in** stands the
camera in it — moved with **Camera across / up / forward** — with a **rectilinear** lens,
which keeps lines straight and sees less than 180°, or a **fisheye**, which puts the angle
off its axis straight onto the paper and can see all round.

The ball and the box are convex, so no hidden-line pass is needed: from outside a point
shows exactly when the surface there faces the camera, through the cut-open front exactly
when it faces away, and from inside always. Every line is walked from its chart onto the
paper by halving each piece until its middle lies within 0.03 mm of its chord and the chord
is no longer than 3 mm, and where it passes from shown to hidden the crossing is pinned down
by bisection.

A mark that would come out smaller than **Leave out marks under** on the paper is left out
whole — the ones seen edge on by the outline, or far off down a corridor, which would only
make a blot. The **outline** is the rim of the ball, or the edges of the box along a face
that shows.

### Two pens

With **two** colours the strokes are split between black and red by: **height** — red above
**Red from**; **second field** — red where it is high; **random** — red as often as the
height is high, a dither; **checker** and **rows** of cells; **parts** — every other ring,
line, strand or contour level; **faces** of the box, opposite faces always different;
**overlay** — the whole pattern laid twice, the red layer shifted, turned, and reading the
height inverted, the same or the second field: the moiré of the picture in two colours.

## What ends up in the files

No fills and no background rectangle. `stroke-width` is the nib and the caps are round.
**everything** is one `<g>` per pen, `id="black"` and `id="red"`; a pen's file is one
group. Every file is the same sheet — the same `width`, `height` and `viewBox` in
millimetres — so the two passes land on one another. Strokes come out ordered greedily, one
pen at a time, black first; `vpype-process.sh` is the usual next step. Two comments ride at
the top of every file: the settings in one line, and the URL that rebuilds the sheet.

## Watching the cost

The stats say how many strokes and how many metres of line, how much of the area the ink
would cover, and roughly how long it takes. Marks are a stroke each — a sheet of small
circles is pen lifts more than ink. **Dots** are nothing but pen lifts. Small cells cost
the square of how small they are. Past 60 % of the area covered in ink the stats warn that
the paper may cockle.
