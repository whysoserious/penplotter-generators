# Ink in water

A pen-plotter generator: a shallow tank of water with two inks in it — poured in from its
sides in streams, laid in at the start as layers, stripes, rings or drops, or stirred in
by hand — and the fluid that carries them. The inks sink or rise by their weight, curl into
eddies where they shear past one another, part round the posts and walls stood in their
way, and are drawn as lines: one pen, and one SVG, per colour.

## Running it

No build step and no install — p5.js is bundled in `libraries/`.

**Straight from disk:** open `index.html` in a browser (double-click it, or
`open index.html` on macOS). Everything works from `file://`.

**Through a local server** (handy when the browser is strict about `file://`, e.g. for
the *Copy link* button): from the repository root run

```bash
python3 -m http.server 8000
```

and open <http://localhost:8000/p5js14%20-%20ink%20in%20water/>.

## Using it

1. Opened without a link, the tank fills from empty and stops at the end of the timeline;
   that moment is the sheet. Pick a **Scene** to start from something else.
2. **The bar under the sheet** runs the fluid back and forth: back to the start, a step
   back, play, a step on, to the end, and the timeline — drag it anywhere. The stretch
   already run is shaded; going back into it is instant, going past it runs the fluid on.
   <kbd>space</kbd> plays and stops, <kbd>←</kbd> <kbd>→</kbd> step, ten at a time with
   <kbd>shift</kbd>, <kbd>Home</kbd> and <kbd>End</kbd> jump.
3. **Drag across the sheet** to stir the water — **shift**-drag pours colour 1 as it
   stirs, **alt**- or **right**-drag colour 2. The fluid runs while you stir, playing or
   not: a stroke is a stretch of time. **A click** without a drag stops or starts it. The
   wheel sizes the stirrer, <kbd>Z</kbd> takes the last stroke back.
4. **Obstacles**: <kbd>O</kbd> and a drag lays a round post from its middle out,
   <kbd>L</kbd> and a drag a wall from end to end, <kbd>X</kbd> and a click takes one
   away, <kbd>S</kbd> goes back to stirring — the same tools sit at the right of the bar.
   **Put in obstacles** in the sidebar lays a ready set.
5. **Download SVG [Color 1]** and **Download SVG [Color 2]** write the two passes, one
   per pen; **[both colours]** writes one file with both, to look at. **Copy link** puts
   the whole sheet in the clipboard as a URL — every setting that is not a default is in
   the hash, the strokes of the mouse and the moment included, so pasting it anywhere
   replays exactly this fluid.

Everything is in millimetres. The SVG is the sheet at 1:1 with `width`/`height` in `mm`,
so it goes straight into vpype or the plotter without scaling. **Paper colour** is the
preview only — set it dark and the inks light to see a gel pen on black paper.

## How it is made

### The water

The tank is the sheet inside the margin, cut into square cells — **Resolution** of them
across its short side — and the fluid is Stam's *stable fluids* on a staggered grid: the
velocity lives on the faces of the cells, the pressure in their middles. Each step the
velocity is carried along itself, pushed by gravity, the eddies, the streams and the
stirrer, slowed by the water's thickness, and then made to lose no water anywhere by a
pressure solve (red–black Gauss–Seidel, over-relaxed, started from the last step's
pressure). The velocity is carried by MacCormack's there-and-back step, which keeps the
small eddies a plain backtrace smears out.

The inks ride on a grid finer than the water's — **Ink detail** ink cells to a fluid cell
each way — carried by the same MacCormack step and clamped to what the backtrace read, so
an edge stays sharp for hundreds of steps without ever overshooting. Each is a
concentration from 0 to 1; where the two meet they mix.

- **Thickness** — thin as water at 0, thick as honey at 100. It diffuses the velocity
  into itself, taking the small eddies out and slowing the large ones, and it adds the
  drag a thick liquid feels between two panes of glass: honey stops the moment nothing
  pushes it. That is what makes a thick bath good for marbling — it moves where it is
  combed and nowhere else.
- **Turbulence**, **Eddy size**, **Churn** — eddies stirred into the water all the time:
  the curl of a slowly changing noise, so they turn the water over without squeezing it
  anywhere.
- **Swirl** — vorticity confinement: finds the eddies already there and keeps them
  spinning, more and tighter curls.
- **Gravity** and **Gravity pulls toward** — pulls on each ink by its **Weight**, how much
  heavier than the water it is (below 0, lighter: it rises). Heavy ink over light turns
  over in mushrooms; a heavy band drips in fingers.
- **Bleed** — the inks spreading into the water on their own, softening every edge.

A second of the fluid is 30 steps; **Length** is how far the timeline runs.

### The tank

- **Start with** — clear water; **two layers** (colour 1 over colour 2); **side by side**
  (colour 1 on the left); **stripes** across the tank, taking turns; **rings**; **drops**.
  Rings and drops are dropped the way ink is dropped for marbling: a new drop pushes
  everything already there straight out from its middle, just far enough to make room, so
  the drops before it are squeezed into rings round it and every patch keeps its area.
  Rings alternate ink and a drop of clear water, as suminagashi does. **How much ink**,
  **How many**, **Uneven** and **Where they meet** shape all of these.
- **Open** sides — a closed tank churns: water a stream pushes in has to come back round.
  An open side lets water out and in, so a stream pours through. Dashed on the sheet.
- **Current** — clean water flowing in across a whole side and out of the far one, which
  opens itself: a channel, for streaks and wakes and vortex streets behind a post.

### Streams

Each colour has its own: **Streams** of them on one **side**, spread over part of it
round **Where along it**. A stream is a mouth three cells deep whose water is held at the
stream's velocity and filled with its ink — **Mouth** wide, at **Speed**, tilted by
**Aim**, swaying by **Sway** every three seconds and surging by **Surge** twice as often,
each on its own phase. **Pours from** and **Stops at** give it a stretch of the timeline;
a stream stopped early leaves its ink to settle and curl.

### Stirring and obstacles

A stroke of the mouse holds the water round the stirrer to the stirrer's own velocity,
softly to its rim. The stirrer is a spoon in a liquid rather than the pointer: each step it
closes a share of the way to the mouse, so a hand that moves in jerks still stirs in one
sweep. **Stirrer size** and **strength** apply to every stroke.

Obstacles are solid cells the water cannot cross — a wall is never thinner than a cell and
a half or water would slip through it diagonally. The ink inside an obstacle is filled
from the water round it, so a backtrace that grazes one brings back ink and not a clean
halo, and every line is cut back from the obstacle's true outline by half a nib and a
quarter of a millimetre. **Outlined by pen** draws the outlines too; at 0 an obstacle is
drawn by its absence.

### The same fluid every time

Every step is ordinary arithmetic. Addition, multiplication, division, square roots and
floors are rounded the same way in every browser; `Math.sin` and its kind are not, and a
fluid run for hundreds of steps turns a last bit into a different eddy. So everything the
step reads goes through a sine of its own and seeded Perlin noise, and the same settings
run the same fluid, step for step, anywhere.

Strokes of the mouse are kept one sample a step, in 1/4000ths of the tank, as a few
hundred characters of the link: the step each began on, where, and each step's move. A
replay reads back exactly the numbers the live stroke used, so a stroke drawn by hand and
the same stroke replayed from its link give the same fluid to the last bit. Obstacles are
kept in thousandths of the tank, so a tank of the same proportions — a larger A size
with the margin grown with it — is the same grid and runs exactly the same fluid, only
larger. The stats give the grid: the same number of cells each way is the same fluid (A4
with a 15 mm margin and A3 with 22 mm are both 90 × 134).

### Time

The timeline keeps a snapshot of the whole tank — velocity, pressure and both inks —
every ten steps (fewer, if the tank is large and the timeline long), so any step is its
nearest snapshot and a handful of steps run forward. Changing anything the water depends
on throws the snapshots away and runs the fluid again from the start up to the step on the
sheet, a frame's worth of steps at a time, so the page never stops answering; changing
only how the ink is drawn keeps them all.

A new stroke starts wherever the tank is shown and lets go of whatever was going to happen
after that — the later strokes and the snapshots past it — the way acting after an undo
lets go of the redo.

## Drawing the ink

Where an ink is at least **Ink counts from** it is there, and that region is filled one of
five ways:

- **echo** — lines half a spacing and then a whole spacing apart inside the region's
  edge, echoing it inwards like the ridges of a thumbprint. They are the levels of the
  distance to the edge — found from how steeply the ink changes there and swept across the
  grid by the eikonal equation — and not to the sides of the tank, so a layer lying on the
  bottom is ruled along its surface and not round it.
- **flow lines** — evenly spaced streamlines of the water (Jobard & Lefer), flown through
  the region both ways from a seed until they leave it, come within half a spacing of
  another line or of themselves, or reach still water. The ink drawn by the way it moves.
- **hatching** — straight lines at **Hatch angle**, at whole spacings from the corner of
  the sheet, so where two inks meet their lines meet too.
- **contours** — the levels of the ink itself between **Ink counts from** and full
  strength, **Levels** of them: how thick the ink is, as a map's contours give height.
- **outline** — the region's edge alone. Marbling and suminagashi read best this way.

**Draw the edge as well** adds the edge to echo, flow lines and hatching. The inks are
traced on their own grid with a ring of points laid on the sides of the tank, so lines run
right up to them; **Smoothing** blurs the ink before it is traced, and **Shortest line**
drops the specks.

Two inks that overlap — where they have mixed and both are thick enough — are both drawn
there, each in its own pattern. **Ink counts from** at 50 for both splits the tank between
them exactly.

## What ends up in the files

One `<g>` per pen, no fills and no background rectangle. `stroke-width` is the nib and
the caps are round, so a file previews as the finished plot looks. Strokes come out in the
order the pen should visit them — greedy nearest-neighbour — each flipped to the end it is
entered from. Each colour's file carries the cut guides, if any, so the two passes line up
on the paper. `vpype-process.sh` is the usual next step:

```bash
./vpype-process.sh "ink in water seed1 t360 A4-portrait colour1 nib0.3 ….svg"
```

Two comments ride at the top of every file: the settings in one line, and the URL that
rebuilds the sheet — strokes of the mouse and all.

## Watching the cost

A default A4 is about 330 strokes and 17 m of line, the two pens together — some seven
minutes at the plotter. The echo is long strokes, so the time goes on drawing rather than
on pen lifts; flow lines are shorter, three or four times the strokes for the same ink. A
region filled with lines costs its area over the spacing: an A4 tank filled from edge to
edge is 48 m at a 1 mm spacing and 32 m at 1.5 mm, which is why the scenes that fill it
use the wider one. The stats warn when the lines are closer than twice the nib and will
run together into solid ink.

The fluid itself costs about 6 ms a step at the default resolution, so the whole default
timeline runs again in two or three seconds. Doubling the resolution quadruples that; the
stats say how long a rerun of the timeline takes when it gets long.
