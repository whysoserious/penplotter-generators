# Dissolving blocks

A pen-plotter generator: a solid — a tower on a plinth, a block, a ziggurat, a city of
lots, a courtyard, an arch, a round tower, a ring, a ball, a blob, a Menger sponge, a
maze flat or in the air, a Lorenz attractor, a well, a tesseract, a gyroid — cut into
boxes the way a city is cut into
buildings, and coming apart in one direction into a spray of smaller and smaller pieces.
It is drawn in parallel projection with every hidden line taken out exactly, the sides
hatched and the tops left bare, like an ink drawing of a city — or, on black paper with a
white gel pen, like the drawing that started it. The result is exported as an SVG in
millimetres, one file or one per pen, ready for the plotter.

## Running it

No build step and no install — p5.js is bundled in `libraries/`.

**Straight from disk:** open `index.html` in a browser (double-click it, or
`open index.html` on macOS). Everything works from `file://`.

**Through a local server** (handy when the browser is strict about `file://`, e.g. for
the *Copy link* button): from the repository root run

```bash
python3 -m http.server 8000
```

and open <http://localhost:8000/p5js13%20-%20dissolving%20blocks/>.

## Using it

1. Pick a **Scene** to start from, or set up the solid, how it is cut and how it comes
   apart in the panel on the left. The stats under **The sheet** give the stroke count,
   the ink length, how many boxes there are and a rough plot time.
2. **Drag** on the sheet to turn the camera: across is the azimuth, up and down the
   elevation. **Shift-drag** (or a right-drag) pans, the **wheel** zooms about the point
   under the cursor. The arrow keys turn the camera by 1°, or by 10° with <kbd>shift</kbd>;
   <kbd>+</kbd> and <kbd>−</kbd> zoom, <kbd>0</kbd> resets zoom and pan, <kbd>P</kbd> steps
   through the projections. <kbd>R</kbd> rolls a new seed, <kbd>[</kbd> and <kbd>]</kbd>
   step through seeds, <kbd>G</kbd> hides the guides. <kbd>C</kbd> steps through the
   lines to compose the sheet by and <kbd>F</kbd> shows the frame round the drawing (see
   *Composing the sheet*).
3. **Export SVG** writes the file. **Copy link** puts the whole sheet in the clipboard as
   a URL — every setting that is not a default is in the hash, so pasting it anywhere
   rebuilds exactly this drawing.

Everything is in millimetres. The SVG is the sheet at 1:1 with `width`/`height` in `mm`,
so it goes straight into vpype or AxiDraw without scaling.

**Paper colour** is the preview only: set it to black and the ink to white to see the
drawing the way a white gel pen on black paper will put it down. The file itself never
has a background, and its strokes are the colour of the ink — a white-ink file opened in
an ordinary viewer shows nothing on the white page, which is expected.

## How it is made

### Cutting

The solid is measured in *cells*, and cut the way a k-d tree cuts space: a box wider than
**Widest box** or taller than **Tallest box** is split across whichever axis is furthest
over, at a whole cell somewhere near its middle, and the two halves are cut the same way
until none is too large. A box that is already small enough is still cut once more now
and then, with the chance **Variety**, which is what scatters small boxes among the big
ones. Because every cut falls on a whole cell, the faces of boxes all over the solid line
up with one another, and that alignment is what makes the result read as a city rather
than as rubble. A tallest box several times the widest makes towers.

Every choice a box makes — whether it is cut again and where, whether it stays, how far
it flies — is looked up from a hash of its own cells and the seed, so nothing depends on
the order the boxes are visited in, and moving one slider leaves the boxes it does not
reach exactly where they were.

The round shapes (arch, cylinder, ring, ball, blob) are asked cell by cell whether they
are inside, and the answers are summed into a table of running totals, so how much of any
box lies inside is eight lookups. A box the shape only partly covers is cut across
whichever axis best sorts inside from outside — measured by how differently full the two
sides are when it is cut a quarter, a half and three quarters of the way along — so a
round tower is cut round its circumference and never up its height. It goes down to the
smallest box and is kept if at least half of it is inside: the surface comes out as fine
as whole cells allow and the inside stays in big blocks.

### Coming apart

A front runs through the solid. For every box there is one number, how far through the
front it is: at 0 or below the box stands, at 1 or above it is gone, and in between it is
coming loose. Three kinds of front:

- **toward** — the front crosses the solid in one direction (**Direction**, on the same
  compass the camera turns on, and **Rising**, how far it tilts up) and the loose boxes
  fly off that way. The arrow on the sheet shows it.
- **outward** — the front spreads from the middle and the loose boxes burst away from it.
- **noise** — a slow noise field decides where the solid gives, the loose boxes drift in
  the direction.

**Front starts at** and **Front depth** place it: how far through the solid the first box
comes loose, and how much of the solid it takes to go from standing to gone. **Ragged**
pushes the front back and forth with noise of **Lump size**, so it breaks along lumps and
not along a plane.

The further through the front a box is:

- the finer it was cut — its largest size is multiplied by a steady factor for every step
  through the front, down to 1 − **Crumble** at the far side. The width goes before the
  height, so the loose boxes come off as the thin upright slivers a city breaks into;
- the likelier it is gone — the chance of staying falls as (1 − e) to the power
  **Thinning**, so at 1 the spray thins out evenly and past 2 only a few pieces make it
  far;
- the further it has flown — by **Drift** (a share of the solid's largest size) times how
  far through it was, each box anywhere from 0.4 to 1.6 times that, plus **Scatter** in
  any direction at all;
- and the smaller it has shrunk, by up to **Shrink**.

A box let go early has flown far, a box let go late has barely moved, so what the front
takes away is stretched out behind it and thinned as it goes. Untick **Hatch the loose
boxes** and everything more than **Loose from** through the front is drawn as an outline
alone: the spray stays light, as the small pieces in a drawing like this usually are, and
every hatch line it would have had is a pen lift saved. **Holes** leaves a share of
the standing boxes out, and **Uneven tops** lets each box stop short of the top of its
cell, which is what breaks the flat roof of a block into a skyline.

All of this happens before the camera is asked anything: turning the view never changes
which boxes there are.

### Hidden lines

The view is a parallel projection, so every ray towards the viewer runs the same way, c,
and a point P is hidden by a box exactly when P + s·c lands inside that box for some
s > 0. For the points of a straight segment, P = A + t·(B − A), each axis of the box
gives a lower and an upper bound on s, both straight lines in t; the point is hidden when
every lower line lies under every upper line. That is at most nine linear inequalities in
t, and they leave a single stretch of the segment — the hidden part, exactly, with no
sampling and no bisection. Every edge and every hatch line is cut by the boxes that could
stand in front of it, found through a grid of bins on paper, and what is left is what the
pen draws. A face one box hides entirely — all four corners behind it — is passed over
whole, which is most of the inside of the solid.

Boxes are shrunk by a hair before they hide anything, so a box never hides its own faces,
nor those of a neighbour it only touches. Edges of different boxes that fall on the same
line on paper — the lattice lines a whole field of them up exactly in true isometric — are
merged into one, so no line is drawn twice, and edges that meet end to end are strung
into one stroke, starting from the corners where an odd number of edges meet, so a box
drawn whole is two strokes and not three.

## The solid

- **tower on plinth** — a tall block on a wide low one. **Plinth height** is a share of
  the whole height, **Tower width** and **depth** a share of the plinth, and **Tower
  across** and **deep** where on the plinth it stands.
- **block** — one box.
- **steps** — a ziggurat of **Tiers**, each set in from the one below.
- **city** — **Lots along a side** squared, with **Street** cells between them, tallest
  in the middle of town.
- **courtyard** — four walls round an open square; **Walls** is how thick they are.
- **arch** — two piers and a round arch through the whole depth; **Walls** is how wide
  the piers are.
- **cylinder** — a round tower, the whole height.
- **ring** — a ring lying flat, a tube round the vertical through the middle; **Walls** is
  how thick it is across.
- **ball**, **blob** — an ellipsoid filling the box, and one whose skin is pushed in and
  out by noise of **Lump size**, **Fullness** deciding how much of it is left.
- **fractal** — a Menger sponge: the block cut in three each way with the middle of every
  face and the middle of the block taken out, **Fractal levels** times over. A side that
  divides by three as many times comes out on whole cells and so comes out square — 27
  cells for three levels, 81 for four. Each level is twenty times the pieces, so four
  levels wants a larger **Smallest box** or it runs into the box limit.
- **maze** — the walls of a flat maze, standing the whole height: rooms on the odd places
  of a grid, walls on the even ones, joined by a randomised depth-first carve that reaches
  every room once. **Maze step** is how wide one wall is, and one corridor with it. The
  seed is the maze. Seen from above it is a maze; from the side, a city of alleys.
- **maze 3d** — the same carve in three dimensions, and here the solid is the corridor
  rather than the wall: a tangle of square tubes running through the whole block, which is
  what a maze looks like when you can see it from outside instead of walking it.
- **chaos** — a Lorenz attractor, flown for twenty thousand steps and left in the air as a
  ribbon of cells as thick as **Walls**. The butterfly is the same every time; the path
  round it belongs to the seed. It holds itself up by nothing, so it takes a front that
  pulls it apart rather than one that blows it off a base — and it wants a camera looking
  along the flight, near an azimuth of 0°, for the two wings to show.
- **well** — a round shaft with a floor, open to the sky, **Walls** thick. Drawn from far
  enough above, the far side of the shaft is in view, which is the reason to draw one.
- **tesseract** — a four-dimensional cube held at a distance and cast into three: a cube
  inside a cube with a strut from every corner to the one it answers to, laid in bars
  **Walls** thick. **Far cube** is how small the second cube comes out, which is how far
  off the fourth dimension is held. The struts run diagonally, so they come down as
  staircases — which is what every slanting thing is in a solid cut on whole cells.
- **gyroid** — the surface that winds through space dividing it into two halves that never
  meet, `sin x cos y + sin y cos z + sin z cos x` near enough to zero, thickened into a
  sheet by **Walls** and turning once every **Lump size** cells. It is all surface and no
  inside, so it is the most boxes of any shape here for its size.

**Width**, **Depth** and **Height** are in cells. Only the ratios matter to the drawing —
the fit sizes the whole to the sheet — but more cells mean smaller boxes, and more of
them.

## Camera

- **axonometric** — the camera far away at an **Azimuth** and an **Elevation**. 45° and
  35.26° is true isometric, where every edge of the ground runs at 30° on paper.
- **military** — the ground plan drawn true and turned by the azimuth, the height
  straight up and scaled by **Height scale**, the architect's planometric view.
- **oblique** — the front drawn true and the depth running off at **Depth angle**,
  shortened by **Depth scale**: 0.5 is cabinet, 1 cavalier.

All three are parallel, so a line is the same weight near and far and so is the
hatching. At 100 % **Zoom** every box that is left, loose ones included, just fits inside
the margin; a new seed can move the fit a little, since it follows wherever the loosest
boxes happened to fly.

## Composing the sheet

Placing the drawing is the zoom and the pan; the **Composition** part of the panel is
there to see where it has landed. None of it is ever plotted — it sits over the preview
with the other guides, and <kbd>G</kbd> hides all of them at once.

**Lines over the sheet** draws, edge to edge across the paper:

- **cross** — two lines through the middle of the sheet, to centre the drawing by. The
  margins are the same all round, so it is also the middle of the drawable area.
- **golden section** — each way, the two lines that cut the sheet into 0.382 and 0.618
  of it: where to put the edge of the tower, the break of the front or the thickest of
  the spray.
- **thirds** — the painter's grid.
- **cross + golden section** — both.

<kbd>C</kbd> steps through them. **Frame round the drawing** (<kbd>F</kbd>) adds, dashed,
the box round everything the boxes cover — cut by the margin or not — with a small cross
at its middle, a ring where the weight of the ink sits, and on each side how far the
frame is from that edge of the sheet, in millimetres. The same number left and right,
and top and bottom, is a drawing centred by its frame; a negative one is a frame that runs
off the sheet. The stats say the same in a line: how large the drawing is and how far its
middle is off the middle of the sheet.

Two buttons do the centring:

- **Centre the frame** pans the middle of the frame onto the middle of the sheet. At a
  pan of 0 the fit has already done that, so this is the way back after panning by hand,
  at any zoom.
- **Centre the ink** pans the weight of the ink there instead — every stroke's middle,
  weighted by its length. A dissolving block is lopsided: the solid is on one side and
  weighs, the spray on the other is light, and the frame's middle falls somewhere in the
  thin of the spray. Centring the ink puts the solid in the middle and balances the sheet
  the way the eye reads it. If that pushes a drawing that was whole off the sheet, the
  zoom comes down just far enough to bring it back; a drawing already cut by the margin
  keeps its zoom, since the crop was meant.

## Hatching

Each box shows at most three faces: a top (or a bottom, from below) and two sides. Which
side is **left** and which **right** is read off the paper — the face whose outward normal
points further left is the left one — so the names mean what they say whichever way the
camera has turned. Each has a pattern and a spacing of its own, in millimetres on paper:

- sides — **vertical** (up the face, as in the drawing that started this), **horizontal**
  (along it, like storeys), **grid** (both, like windows);
- tops — **along left** and **along right** (parallel to where the top meets the left or
  the right face) and **grid**;
- any face — **diagonal** and **crosshatch** at 45° on paper, and **solid**, which inks
  the face in (below).

**Lines sit** decides where the lines fall. *per face* centres them on every face, never
closer than half a spacing to its edges; *lattice* puts them at whole spacings across the
sheet, so they line up from one box to the next.

**Edges** draws every edge of every box, only the **outline** (where a box meets what is
behind it), or **none** — hatching alone. **Shortest stroke** leaves out any piece of line
cut shorter than that by the boxes in front: the slivers seen through the gaps between
boxes are a pen lift each for next to no ink. An edge nothing cut is always kept, so the
smallest boxes keep their outlines.

**Join the hatch lines into zigzags** runs neighbouring lines that both show from end to
end into one stroke along the edge of their face, when nothing hides the join. The
hatching then costs about half the pen lifts; the joins go over the face's edges a second
time, and with the edges off they draw pieces of them. A solid face is laid as one stroke
anyway, and more freely — see below.

### Solid faces

A solid face is filled the way a person fills a shape with a pen — the boundary once, then
pass after pass inside it, each overlapping the last. What has to land exactly on a filled
shape is the edge of the black, not the centre of any one stroke, so nothing is drawn on
the face itself: everything is drawn on the face pulled **half a nib** inwards, where a
round nib of that width lays ink from the centreline out to the face's own edge and no
further.

- The boundary of that inset face goes down once, and the inside of it is filled with
  passes parallel to one pair of the face's edges — up a side, along the left edge of a
  top. They are spread evenly, never further apart than **Solid passes**, a share of the
  nib, and the two outermost of them are the two sides of the boundary they run parallel
  to. At 100 % two passes just touch, at 85 % they overlap by 15 % of the nib; 85 % is the
  default and suits a fineliner, a pen that spreads on the paper can go higher, a dry one
  lower. The lattice setting does not apply — a solid face is always laid edge to edge.
- Boundary and passes cover the inset face whole: a point further than a nib from the
  boundary is reached by a pass, since the passes cross the inset face from side to side,
  and a point nearer than that by the boundary itself, which is also what carries the ink
  into the corners and along the edges the passes run into at a slant, where a round nib
  cannot reach from inside. Half a nib of ink round every centreline turns that back into
  the face exactly — bar its corners, where a round pen cannot reach into a point and
  leaves the tip bare for `half a nib / sin(half the angle) − half a nib`: 0.13 mm at the
  60° corner of an isometric face with a 0.3 mm nib, and more the sharper the sliver.
- **Edges** has nothing to do with it. A face inked in solid needs no edge of its own, and
  an edge drawn over it is an ordinary line of the drawing, standing half a nib outside the
  black like every other line does. It does fill in the corner tips, which is why a sheet
  full of slivers comes out that much blacker with the edges on.
- A face narrower than the nib gets a single pass down its middle, and one narrower than
  the nib either way a single dab. Ink there is a nib wide whatever the face is, so this is
  the one place where the black stands outside the face — by at most half a nib, and in
  practice by a fraction of it.
- The whole of a face is one stroke: the boundary and every pass after it carry on from
  wherever the last one stopped, entered from its nearer end, as long as nothing in front
  hides the short way across. The way across runs inside the face, which is to be ink
  anyway, so the pen goes round and then back and forth without lifting. Where a box in
  front cuts the face, each piece is a stroke of its own; the ink runs up to that box's
  silhouette and the nib carries it half a nib into it, under that box's own outline, which
  is where the black has to close for no seam to show. With the edges off there is no
  outline there, and that half nib stands on the box in front.
- Every piece of a pass is drawn however short — the shortest-stroke rule does not apply,
  since here each one is ink the face needs.

Checked by rasterising the sheet at 0.02–0.04 mm and asking two questions of every point at
once: which face the camera sees there — z-buffered exactly as the hidden-line pass sees it
— and how far the nearest stroke centreline runs from it, which is what tells whether ink
of half a nib reaches it. One box with all three faces inked, in all three projections, at
nibs from 0.1 to 1 mm and at a grazing camera: **no ink at all outside the faces**, and the
only bare paper 0.0005 % of the black, every bit of it in the points of the corners. A whole
default sheet with every face solid and the edges off: 0.9 % bare, again the corners — the
tips of the slivers the spray is made of — and 0.008 % with the edges drawn. The only ink
that stands outside the black there is the single passes on the faces narrower than the
nib: 0.08 mm of it at the worst with the 0.3 mm nib, none at all with a 0.1 mm nib, which
no face on that sheet is thinner than, and 0.23 mm with a fat 0.6 mm one — always under the
half nib the rule allows. At 110 % the gaps between the passes show up as they should,
8.8 % of the black. A solid face costs ink rather than pen lifts — the length is its area
over the spacing — so solid tops on a default A4 add about 12 m of line.

**Gap** is the space between two neighbouring boxes on paper: each box is shrunk by half
of it all round, so every box keeps an outline of its own. At 0 the boxes touch and the
solid is drawn as one, with every seam.

## Pens

Up to three, one plotter pass each. The edges, the tops, the left and the right faces each
have a pen of their own, set next to them in the panel, and **Loose boxes pen** sends
everything drawn on boxes more than **Loose from** through the front to another — the
solid in one colour and the spray in another.

## What ends up in the file

One `<g>` per pen, no fills and no background rectangle — everything in the file is meant
to be plotted. `stroke-width` is the nib and the caps are round, so the file previews as
the finished plot looks.

**SVG** picks whether that is one file or one per pen. *One file per pen* writes each
colour separately, and each file carries the cut guides, so the passes line up on the
paper.

Strokes come out in the order the pen should visit them, each already flipped to the end
it should be entered from: greedy nearest-neighbour over the endpoints, one pen at a time.
`vpype`'s `linesort` would redo this anyway, and the repository's `vpype-process.sh` is
the usual next step:

```bash
./vpype-process.sh "blocks tower on plinth seed1 az45 el35.26 A4-portrait pen0.3 ….svg"
```

Two comments ride at the top of the file: every setting in one line, and the URL that
rebuilds the sheet. A plot is always reproducible from the file it came from.

## Watching the cost

A default A4 is about 8 500 strokes, 37 m of line and just under an hour at the plotter,
and most of that time is pen lifts: every hatch line is one, and every box outline two.
The things that move it most:

- **the hatching** — a spacing half as wide is twice the lines; *crosshatch* and *grid*
  double them. Zigzags halve the lifts. A *solid* face goes down as one stroke, so it
  costs ink rather than lifts.
- **the number of boxes** — more cells, a smaller widest box, more variety or a deeper
  front all mean more of them, and each small box is two strokes for very little ink.
- **the spray** — hundreds of tiny loose boxes are hundreds of lifts; thinning above 2
  keeps it sparse, and leaving the loose boxes unhatched takes their hatching off the
  bill.

The stats warn when the hatching is closer than twice the nib — it will run together into
solid ink — and when the gap is narrower than the nib, where neighbouring outlines will
touch. Everything is computed in a few tens of milliseconds for an ordinary sheet, so the
sliders and the camera follow live; past about 150 ms a drag shows the boxes alone and
the lines are drawn when the mouse comes up.
