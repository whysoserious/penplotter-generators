# Rippled sphere

A pen-plotter generator: a ball cut into small triangles, its skin pushed in and out by
waves — noise, rings of ripples from a few drops, folds, a basket weave of corrugated
tiles, ribs and spirals round its axis, and waves drawn on it by hand with the mouse —
with a ring round it like a planet's. The net slides over the ball into the troughs of
the waves and bunches there, so the folds come out as the dark creases a pen draws a
crumpled sheet with. Everything is drawn with every hidden line taken out exactly, in
layers — the net, the outline, contour lines of the waves, slices, shading, the ring, a
sky — each with a pen and a file of its own. The colours are the preview's, and a
painted picture of the same sheet can be saved as a PNG.

## Running it

No build step and no install — p5.js is bundled in `libraries/`.

**Straight from disk:** open `index.html` in a browser (double-click it, or
`open index.html` on macOS). Everything works from `file://`.

**Through a local server** (handy when the browser is strict about `file://`, e.g. for
the *Copy link* button): from the repository root run

```bash
python3 -m http.server 8000
```

and open <http://localhost:8000/p5js15%20-%20rippled%20sphere/>.

## Using it

1. Pick a **Scene** to start from, or set up the ball, its waves and its ring in the
   panel on the left. The stats under **The sheet** give the stroke count, the ink
   length, how far the waves reach and a rough plot time.
2. **Draw waves** with the mouse. With the **Draw waves** tool (<kbd>W</kbd>), dragging
   over the ball lays a wave along the way the mouse goes, and a click drops one — a ring
   of it round the point. A wave takes the brush — **Profile**, **Height**, **Width**,
   **Ripples** — as it is set when it is drawn, and keeps it, so changing the brush
   changes only the waves still to come. The ring round the cursor is the brush's width
   on the ball. **Copies round the axis** repeats every drawn wave round the ball, and
   **All drawn waves** turns them all up or down at once, or inside out below 0.
   <kbd>Z</kbd> takes the last wave back, the **Erase** tool (<kbd>E</kbd>) takes away
   the one you click, **Clear waves** all of them.
3. **Turn the camera** by dragging off the ball, by <kbd>alt</kbd>-dragging anywhere, or
   with the **Turn** tool (<kbd>T</kbd>), where every drag turns it: across is the
   azimuth, up and down the elevation. **Shift-drag** (or a right-drag) pans, the
   **wheel** zooms about the point under the cursor. The arrow keys turn by 1°, or by 10°
   with <kbd>shift</kbd>; <kbd>+</kbd> and <kbd>−</kbd> zoom, <kbd>0</kbd> resets zoom and
   pan, <kbd>P</kbd> switches between orthographic and perspective. <kbd>R</kbd> rolls a
   new seed, <kbd>[</kbd> and <kbd>]</kbd> step through seeds, <kbd>G</kbd> hides the
   guides, <kbd>V</kbd> switches between the plot and the painted preview,
   <kbd>K</kbd> rolls new colours. <kbd>C</kbd> steps through the lines to compose the
   sheet by and <kbd>F</kbd> shows the frame round the drawing.
4. **Download SVG [everything]** writes the whole sheet, a group per pen. Under it, a
   button per layer writes that layer alone — **SVG [mesh]**, **SVG [waves]**,
   **SVG [ring]** … — each wearing its pen's colour, and **one per pen** writes a file
   for each pen. **Download PNG** saves the preview as it stands, plot or painted,
   without the guides, at the **Picture (dpi)** asked for. **Copy link** puts the whole
   sheet in the clipboard as a URL — every setting that is not a default is in the hash,
   the waves drawn by hand included, so pasting it anywhere rebuilds exactly this
   drawing.

Everything is in millimetres. The SVG is the sheet at 1:1 with `width`/`height` in `mm`,
so it goes straight into vpype or AxiDraw without scaling.

## How it is made

### The net

The ball before any wave touches it: points on the unit sphere and the triangles between
them, all turned the same way round seen from outside.

- **geodesic** — an icosahedron, each of its twenty faces cut into n² triangles on a
  grid and blown out onto the sphere, nearly even all over. The points on the
  icosahedron's edges and corners are shared between its faces by where they sit on
  them, not by searching, so none is doubled.
- **lat-long** — rings of latitude and meridians, like a globe. Its quads are split into
  triangles for the hidden lines, but the diagonals are not drawn.
- **lat-long triangles** — every other ring shifted half a step, so the net is all
  triangles, nearly equal, and all of it drawn.
- **cube** — a cube's six faces cut into n × n squares and blown out, each coordinate
  spaced by angle so the squares near its corners are not squeezed; again the diagonals
  are not drawn.

**Detail** means the same for all of them: about how many edges run once round the
ball. **Jitter** pushes every point along the ball by up to that share of an edge, so the
net loses its regularity and reads more like a surface scanned than one computed.

### The waves

The height of the skin over a point of the unit sphere, as a share of the radius, is the
sum of everything below, each with a height of its own — 0 leaves it out — and all of
them scaled by **All waves**. Every one is read at the point alone, so the height can be
asked anywhere: at the points of the net, and again where they have slid to.

- **Noise** — fractal Perlin, octave on octave, **Lumps** to one radius. *ridges* folds
  it up at its zero into sharp crests, like a mountain range; *creases* folds it down
  into sharp troughs, like crumpled paper. **Warp** first pushes the point about by noise
  of its own, which swirls the lumps into folds and whorls.
- **Ripples** — rings running out from **Drops** scattered over the ball by the seed,
  cos(2π θ/λ − phase) · e^(−θ/reach), θ the arc from the drop. Where two sets of rings
  cross they simply add up. Every drop reads the same table, looked up by the chord to
  it, so a drop is a square root and a lerp.
- **Folds** — paths wandering over the ball from random starts, turning as a slow noise
  tells them, **Wander** how much; each has a profile across it like a wave drawn by
  hand.
- **Weave** — space is cut into cubes, **Tiles** across the ball, and each cube's folds
  run east–west or north–south across the ball where it cuts it, the two in turn, like
  the strands of a basket. The cubes are blended into their neighbours over a narrow
  seam, so the tiles meet without a step. It is what makes the blocks of creases turned
  across one another in the picture this started from.
- **Ribs** — *ribs* from pole to pole like a melon, *rings* round it like latitudes,
  *spiral* both at once, *harmonic* a spherical harmonic of degree **Rings** and order
  **Ribs**: the standing wave a bubble rings in. Ribs crowd together at the poles, so
  they fade out before they get there.
- **Drawn by hand** — a path over the ball and a profile across it, read by how far the
  point is from the path: *ridge* and *trough* a crest or a groove along it, *fold* up on
  one side and down on the other, *crease* a sharp V, *ripples* crests running out
  either side. Every profile is gone a **Width** out. A lone point — a click — is a drop
  of its own, its profile running round it. The path is cut into arcs of great circles,
  each filed in every cube of a grid over the ball that its reach touches, so a point
  asks only the arcs near it. For a fold it matters which side the point is on: past a
  bend the side is the one the point is on and the distance the whole of it, the same
  from the arcs either side of the bend; past the free end of the path the side is read
  square to its last arc, so a fold dies away round its end instead of flipping over
  along its line.

A drawn wave is kept in the URL: its profile, height, width and ripples, then its points
folded onto an octahedron and the octahedron unfolded into a square, in 1/4096ths each
way — a twentieth of a degree at worst — as steps from one point to the next, five bits
a character. A stroke across the ball is a hundred characters or so. The wave being
drawn is read back from those same numbers, so what the mouse drew and what the link
replays are the same wave.

### Sliding into the troughs

A skin pushed out along its normals keeps its triangles where they were, and seen head
on, a wave pushed straight at the camera does not move a single line of the net on paper
— only the outline and the parts seen at a slant show it. A crumpled sheet is not like
that: it gathers into its folds. So the net slides over the ball, downhill, into the
troughs of the waves, and where it bunches the lines crowd together into dark creases.

Each point moves along the ball by −c∇h, the slope of the waves read off its neighbours.
A field of moves like that squeezes the net by c·∇²h, most where a trough is deepest and
sharpest, so c is chosen for the squeeze to be **Slide into troughs** in the deepest
troughs — all but the last one in a hundred of the points, so a few sharp creases do not
hold the rest of the net back. A crease is sharper than any trough, and the squeeze
there has no bound: wherever a triangle would be squeezed to less than a twentieth of
itself, its corners are held back a little at a time until none is, and the net never
folds over itself. **Gather from** softens the waves by that much before their slope is
read, so even a sharp crease draws the net in from a wide stretch either side of it, and
not only from the triangles next to it. Below 0 the net gathers on the crests instead.

The height is then read again where every point has come to rest: the triangles have
moved, the ball has not. How much a wave shows in the net depends on how many edges it
spans — a wave of three edges can only jitter them, one of twenty bunches them into
bands — so a finer net shows finer waves.

### The ring

A ring round the ball in a plane tilted **Tilt** off its equator, **Tilted towards** the
way the tilt leans: *flat*, an annulus lying in that plane like a planet's, from
**Inside** to **Outside**, or *band*, a strip standing up round it like a hoop, of
**Radius** and **Height**. Either is cut into **Bands** with a **Gap** between, and
either can rise and fall **Wobbles round** times as it goes — a flat one more towards its
outside edge, like a brim.

It is a net of its own, rows of points round it and quads between them, and its lines
run along those rows — *rims* at its edges, *grooves* between them — or across them,
*spokes*, so every line lies exactly on the ring it is drawn on. The ring has no inside
and no outside: both of its faces show. **Opaque** decides whether it hides what is
behind it. Seen through, its grooves cross the net and the two lie over each other, which
on paper is the pen's way of drawing a ring you can see through, as in the picture this
started from.

### Camera

- **orthographic** — from far away, so a line is the same size near and far.
- **perspective** — from **Distance** radii away: the near side of the ball swells, and
  the outline shrinks towards the middle as the camera comes in.

At 100 % **Zoom** the ball — as a sphere 8 % larger than its radius, to leave room for
its waves — and the outside of the ring just fit inside the margin. The waves themselves
are left out of the fit, so drawing one never moves the rest of the sheet.

### Hidden lines

Every point of the ball and the ring is taken onto the paper with its nearness to the
camera as a third coordinate: the depth itself for the orthographic view, and
D (D/d − 1) for the perspective one, d being the distance from the camera — 1/d varies
in step with the paper across a flat triangle, so a triangle stays flat and a straight
line straight. A point is then hidden exactly when it lies inside a triangle on paper
that is nearer than it there, and along a straight piece of line from A to B both are
linear in t: the three sides of the triangle are three cross products, and the
triangle's plane against the line's depth a fourth. Four half-lines in t, and the one
stretch where all four hold is what that triangle hides — worked out in closed form, with
no sampling and no bisection. Every edge of the net, every contour, slice and hatch line,
every line of the ring and of the sky is cut this way by the triangles that could stand
in front of it, found through a grid of bins over the paper.

The ball is closed, and star-shaped round its middle — every wave only ever moves the
skin along its radius, and never inside the middle — so a ray from the camera always
enters it through a triangle turned towards the camera before it meets any other. A
triangle turned away never shows, and hides nothing that one turned towards the camera
does not hide already: only the near half of the ball is asked, and an edge between two
triangles turned away is hidden without asking at all.

The triangles are let reach a hair past their sides, so two that share a side leave no
gap between the stretches they hide, and a triangle hides a line only where it is nearer
by a hair, so a line never hides itself from the triangle it lies on. A stretch cut
shorter than **Shortest stroke** by what is in front of it — a sliver peeking round the
outline — is left out; a piece nothing cut is always kept.

Checked by brute force: points along the edges of the net and the lines of the ring,
each asked against every triangle there is, turned towards the camera or away, ball and
ring — about 156 000 of them, in an orthographic and a perspective view, from above and
from below, with the ring opaque, flat and wobbling, and on a skin pushed out by 12 %.
Not one came out different from the closed-form answer, and every edge the pass hides
without asking was hidden.

### The layers

- **Net** — the edges of the triangles. Pieces that meet end to end are strung into one
  stroke, and at a corner of the net the stroke carries on along the straightest of the
  edges there and stops rather than turn by more than 60°, so the net is drawn as long
  lines running across the ball — about a stroke to every forty edges on a geodesic
  ball — and not as a scribble round its triangles.
- **Outline** — every edge between a triangle turned towards the camera and one turned
  away, where it shows: the outline of the ball and of every fold that turns its back.
- **Wave contours** — levels of the waves' height, spread evenly from the deepest trough
  to the highest crest, drawn on the ball like the contours of a map; *crests* keeps
  only the ones above the bare ball, *troughs* only those below.
- **Slices** — the ball cut by planes and the cuts drawn: *latitudes* square to its axis,
  *meridians* through it, *horizontal* and *vertical* across the sheet whichever way the
  ball is turned, *depth* square to the view — rings round the middle — or *tilted* any
  way. A level crosses a triangle in one straight piece between two of its sides, and
  where it crosses a side is worked out from the side's lower-numbered end, so the two
  triangles either side of it find the very same point and the pieces join without a
  gap.
- **Shading** — the light comes from a direction fixed to the camera, **Light from**
  round the ball and **from above**, so it stays where it was set while the ball turns.
  How much of it falls on each point of the net comes from its normal, and runs straight
  across each triangle. *hatch* lays lines at **Hatch angle** at whole spacings across the
  sheet, so they carry on from one triangle into the next, and keeps of each line the
  part where the light is under **Shade below**; more **Hatch levels** add lines across,
  then diagonally both ways, each where the light is lower still. *dots* scatters dots
  over the dark instead, thicker where it is darker — every dot is a pen lift. **The line
  where the light gives out** draws the edge of the shade.
- **Ring** — its rims, grooves and spokes.
- **Sky** — behind everything, and hidden wherever the ball, or the ring when it is
  opaque, is in front: *stars*, *lines* across the sheet, *waves* — the same lines,
  rolling — a *halo* of rings round the ball, *rays* out of it, or *clouds*, the contours
  of a slow noise.

Each layer has a pen (**Pens** from one to four), and each can be exported alone.

### Colours and the painted picture

The inks are the pens the plotter will hold, and the preview draws with them. The paper,
the ball, its shadow, the sky and the ring are for the preview and for a painted picture
of the same sheet. A **palette** sets all of them at once. **Roll colours** makes one up:
a hue for the ball, the others picked from it by the **Harmony** asked for — next to it,
across from it, a third of the way round, all one hue — the paper light or, now and then
or when asked, dark, and the inks as far from the paper as they can go, as a gel pen on
black paper is. The colours land in the settings, so a rolled palette is in the link like
any other.

The **painted** preview is a picture: a sky from **Sky, top** to **Sky, bottom** with
clouds of a slow noise drawn small and stretched so they come out soft; the ball's
triangles lit from where the shading's light is, coloured between **Ball in shadow** and
**Ball** with a **Shine** where the light glances off, and painted back to front; the
ring on a canvas of its own, laid over at **Ring seen through** — the part behind the ball
first, the part in front last — so it is seen through evenly, with no seams where its
triangles meet; and the lines over all of it. **Download PNG** saves it. The SVGs never
have any of it.

## Composing the sheet

**Lines over the sheet** draws, edge to edge across the paper and never plotted: a
**cross** through its middle, the **golden section** each way at 0.382 and 0.618 of it,
**thirds**, or the cross and the golden section together. <kbd>C</kbd> steps through
them. **Frame round the drawing** (<kbd>F</kbd>) adds, dashed, the box round what the
ball, the ring and the sky cover, with a small cross at its middle, a ring where the
weight of the ink sits, and how far the frame is from each edge of the sheet in
millimetres.

**Centre the ball** pans the middle of the ball onto the middle of the sheet — a tilted
ring pulls the frame off the ball, and the fit centres the frame. **Centre the frame**
pans the frame's middle there, **Centre the ink** the weight of the ink.

## What ends up in the files

No fills and no background rectangle — everything in a file is meant to be plotted.
`stroke-width` is the nib and the caps are round, so the file previews as the finished
plot looks. **everything** is one `<g>` per pen, `id="pen1"` … ; a layer's file or a
pen's file is one group. The cut guides go into **everything** alone: every file is the
same sheet — the same `width`, `height` and `viewBox` in millimetres — so two of them
opened over one another land exactly on top of each other without a mark to align by,
and a set of marks in every file would only be drawn again with every pass.

Strokes come out in the order the pen should visit them, each already flipped to the end
it should be entered from: greedy nearest-neighbour over the endpoints, one pen at a
time. `vpype`'s `linesort` would redo this anyway, and the repository's
`vpype-process.sh` is the usual next step:

```bash
./vpype-process.sh "rippled sphere geodesic seed1 A4-portrait mesh pen0.25 ….svg"
```

Two comments ride at the top of every file: every setting in one line and which pass it
is, and the URL that rebuilds the sheet. A plot is always reproducible from the file it
came from.

## Watching the cost

The default sheet is about 900 strokes and 45 m of line — some 17 minutes at the plotter
— nearly all of it the net. What moves it most:

- **Detail** — twice the detail is four times the triangles, and four times the line. The
  stats warn when the edges come out shorter than two and a half nibs on paper, where the
  net runs together into solid ink.
- **Shading** — hatching at 0.8 mm over half the ball is tens of metres; each level more
  adds as much again at a steeper cut. Dots cost pen lifts, not ink: every one is a
  stroke.
- **Slices** and **contours** — a slice every millimetre is a lot of line; contours are
  cheap.
- **The sky** — lines and waves across a whole sheet are as much line as the ball.

Everything is built in a few tens of milliseconds for an ordinary sheet — the net and its
waves are kept from one update to the next, so turning the camera costs only the lines.
A very fine net can take a few hundred: past 150 ms a drag shows the ball alone — its
triangles painted back to front, or only its outline when the net is finer than 40 000
triangles — and the lines are drawn when the mouse comes up; a wave being drawn is shown
as its path until then.
