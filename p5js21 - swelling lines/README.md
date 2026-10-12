# Swelling lines

A pen-plotter generator of a grating of lines that grow fat in the dark and thin in the
light. The picture it started from is nothing but upright lines, all the same distance
apart: through a dark place they swell until only a hair of paper is left between two of
them, through a light one they thin to a hair of ink. A few soft pillows lie in it — some
white, some grey, each with a black rim — and where a line runs into one it tapers to a
point, so every edge of every pillow is a row of long teeth.

A pen has one width, so a fat line is drawn as a **ribbon**: its two edges, a stroke down
its middle, and passes inside the edges, each beginning where the ribbon has grown wide
enough to need it. The **picture** the lines swell with can be pillows, blobs, noise,
ripples, a formula you type in, a word or a photograph; the lines that carry it are
straight, rings, rays or one spiral. A second set of lines — the **echo** — goes down in
another pen. The sheet is mostly black; the red is the echo.

## Running it

No build step and no install — p5.js is bundled in `libraries/`.

**Straight from disk:** open `index.html` in a browser. Everything works from `file://`.

**Through a local server** (for the *Copy link* button in a strict browser): from the
repository root run `python3 -m http.server 8000` and open
<http://localhost:8000/p5js21%20-%20swelling%20lines/>.

## Using it

1. Pick a **Scene** — pillows with one of them red or all black, a red shadow leaning out,
   red between the black, hollow ribbons, onions and fans with their passes left open,
   zigzag, ladders, a lens of hairlines, pillows in relief, lines leaning into the dark,
   level lines over terraces of noise, rings over blobs, a sunburst over ripples, one
   spiral, an egg crate, a pinwheel in rings, a word, a curtain, two kinds of moiré, two
   photo scenes and markers on black paper — or set it up in the panel. Each section folds
   away under its heading.
2. **Drag** on the sheet to slide the picture under the lines; the **wheel** enlarges it
   about the cursor and <kbd>0</kbd> puts it back. **Shift-drag** (or a right-drag) turns
   the lines, **alt-drag** moves the middle the rings, rays and spiral go round. The arrow
   keys slide the picture by 1 mm, or 10 with <kbd>shift</kbd>; <kbd>+</kbd> <kbd>−</kbd>
   enlarge it. <kbd>S</kbd> steps through the scenes, <kbd>C</kbd> through the carriers,
   <kbd>F</kbd> through the pictures, <kbd>I</kbd> through the inks, <kbd>E</kbd> through
   the echoes; <kbd>X</kbd> switches the cut guides, <kbd>G</kbd> shows the margin, the
   middle and where the cut guides stand, <kbd>R</kbd> rolls a seed, <kbd>[</kbd>
   <kbd>]</kbd> step it.
3. **Download SVG [everything]** writes the sheet, a group per pen; **[one per pen]** a file
   per pass; a button per layer writes the lines, the echo, the border or the cut guides
   alone. **Download PNG** saves the preview. **Copy link** puts every setting in the
   clipboard as a URL — all but a loaded photograph, which has to be loaded again.

The paper is any of A0–A5 and B0–B5, either way round, or **custom**. The picture is the
sheet less the **Margin**. Everything is in millimetres, and the SVG is the sheet at 1:1.

## How it is made

### The lines

**Carried by**:

- **lines** — straight and parallel, as in the picture this came from;
- **rings** — circles round a middle, a pitch apart; every ring's seam is somewhere else;
- **rays** — out of the middle. They are further apart the further they go, and a ray is as
  fat as the room it has, so a sunburst is thin at heart and broad at the edge;
- **spiral** — one line wound outward, or a few **Arms** of it.

**Pitch** is the distance from one line to the next (for rays: at a quarter of the
picture's short side from the middle). **Angle** is 0 for upright and 90 for level;
**Slid across** moves the whole set by a share of the pitch. Rings, rays and the spiral have
a **Middle** and a **Hole** round it. **Read every** is how often along a line the picture
is looked at — finer follows it more closely and takes longer to build.

### Swelling

A line's width is a share of the pitch: **Thinnest** in the lightest place, **Widest** in
the darkest, and in between as the picture's tone says, bent by **Curve** (over 100 keeps
the lines thin longer). Under 100 % a hair of paper always stays between two lines; over it
they run together. Anything narrower than the nib is one stroke of it, so a white place is
crossed by hairlines — unless **Pen up below** lifts the pen wherever the picture is
lighter than that and leaves the paper bare. **Shortest stroke** drops the crumbs.

### Ink

**A fat line is**:

- **solid** — one stroke down the middle while the ribbon is no wider than the nib; then
  its two edges, half a nib inside its outline; then, once the edges are too far apart to
  close the paper between them, the middle again and passes inside each edge that follow
  it, one pass further in each time. A pass peels off the middle where the ribbon has
  swollen enough to need it — those are the teeth — and the passes are everywhere the same
  distance apart, so the ink is even;
- **fan** — the passes spread evenly across the ribbon whatever its width: they run
  together where it thins, and each begins where its neighbours have come too far apart;
- **outline** — the two edges alone: hollow ribbons, about a third of the ink;
- **zigzag**, **wave** — one stroke swinging from edge to edge, in step from line to line;
- **ladder** — the edges and rungs across; **rungs** — the rungs alone, with a dot where
  the line is a hair;
- **hairline** — no swelling at all: the middle only, for the echo of a moiré.

**Passes apart** is the distance between two passes in nibs: 85 % closes the paper, as a
filled shape wants; over 100 % the passes stand apart, and a solid line opens into rings
like an onion's, a fan into a fan. **Swing or rung every** sets the zigzag, the wave and
the ladder.

**Pen kept down over**: a hop to the next stroke that is shorter than this many nibs is
drawn instead of lifted over. Up to 100 % the hop lies inside ink that is there anyway, so
nothing shows — and the passes of a ribbon, whose ends are a pass apart, become one stroke
drawn back and forth. It cuts the pen's ups and downs to about a third.

### Bending

All of it pushes a line sideways, across itself, before the picture is read under it:

- **Lean with the tone** — across as the picture goes dark under it, so the line slants
  wherever the tone changes;
- **Crowd to the dark** — towards its darker side: the lines gather on the rims and leave
  the light places, which turns a flat picture into a lens. Below 0, towards the light;
- **Wave** with its **length**, and **Wave slips** — how much further on it is on the next
  line: a curtain;
- **Wobble** — a slow shake of the hand.

### The picture

Whatever the lines swell with is painted first into a grid of greys over the margin box —
0 paper, 1 ink — and read back between its cells. **Made of**:

- **pillows** — the frame cut into **Columns** and **Rows**, **Uneven**ly, **every row on
  its own** if asked, every other row **slid**. In each cell a box that **fills** so much of
  it, **rounded**, with a **soft edge** (the softer, the longer the teeth) and **lighter in
  the middle**. Pillows come in so many **kinds** between the **lightest** and the
  **darkest** tone, with **more light** or **more dark** ones; some **cells are left
  empty**. **Between the pillows** is the tone of the ground, and the **Rim** is the dark
  ring round every pillow. The grid goes on past the frame, each frame of it cut
  differently, so sliding or shrinking the picture brings new pillows in;
- **blobs** — light balls in the dark; **noise** — with a **lump size**, **octaves** and a
  **swirl**; **ripples** — from one **stone** or several, meeting;
- **formula** — `f(x, y)` of your own: x and y run from −1 to 1 across the picture's short
  side, y upward, `r` is the distance from the middle and `a` the angle, `noise(x, y)` is
  Perlin noise, `^` is a power. Only numbers, those names and the functions of `Math` are
  let through. Whatever range the formula has is stretched from paper to ink;
- **word** — set large in a bold face; a bar `|` starts a new line;
- **photo** — laid over the frame and cut to cover it. It is not part of the link;
- **even** — one tone all over, for the bending and the echo to work on.

**Where it lies** slides, enlarges and turns the picture under the lines — the same as
dragging and the wheel.

### Tones

**Inside out** swaps dark and light; **Level**, **Contrast** and **Gamma** shape the tones;
**Bands** cuts them into steps, so a line changes width at once; **Soften** blurs the whole
picture; **Rims** overdoes every edge in it — darker on its dark side, lighter on its
light one — as far as **Rims reach**.

### Echo

A second set of lines in another pen:

- **everywhere**;
- in **patches** — a **share** of the pillows (of those lying in the picture never fewer
  than one), rim and all; for the other pictures, blots of the sheet;
- in a **tone band** of the picture, **from** one tone **to** another;
- on **every n-th line**;
- in a **disc**.

**Instead of the lines there** makes the lines stop where the echo is drawn, so the sheet
changes colour; without it the echo lies beside or under them. The echo has **its own ink**,
is **as wide as the lines** by a percentage and **wider by** a share of the pitch, can be
**slid across** (50 % puts it between the lines), has **its own lean**, and can be
**turned** by a few degrees or given a slightly different **pitch** — both make the two
sets beat against each other: moiré.

### Pens

Five pens of the drawer — rapidographs in black and red, ink markers in red, silver and
white — each a kind, a width and a colour. The lines, the echo and the border pick one by
number. Every pen is clipped to the margin box less half its own nib.

### Paper and cut guides

A **Border** is a line, or two, round the picture, on the edge the lines are cut at.

**Cut guide dots** are for trimming the plot on a guillotine: a dot in every corner, and
each side split evenly so that no two dots are further apart than **Most between two dots**
— lay the blade through two of them and cut. **Dots round** the **sheet** is for a plot
made on a larger piece of paper and trimmed back to size; round the **picture** cuts the
margin off and keeps the picture to its very edge. A dot is one touch of the pen of the
lines, and no margin clips it.

## What ends up in the files

No fills and no background rectangle — everything in a file is meant to be plotted.
`stroke-width` is the nib and the caps are round, so the file previews as the finished plot
looks. **everything** is one `<g>` per pen; a layer's file or a pen's file is one group.
Every file is the same sheet — the same `width`, `height` and `viewBox` in millimetres.

The cut guides are a layer of their own in the pen of the lines: they are in **everything**
and in that one pen's file, so they are plotted once.

Strokes come out in the order the pen should visit them, each already flipped to the end
it should be entered from: greedy nearest-neighbour over the endpoints, one pen at a time.
A hop the pen stays down over is written as a line, so the path goes on. `vpype`'s
`linesort` would redo the order anyway, and the repository's `vpype-process.sh` is the next
step. The header comment of every file carries the link that rebuilds the sheet.

## What the sheet costs

The panel says how many strokes and metres of line the sheet is, how fat the fattest line
gets and in how many passes, how much paper is left between two lines, how often the pen
goes down and roughly how long the plot takes. A solid sheet costs what it covers: the
length of line is the inked area over the distance between two passes, whatever the pitch.
The default A3 is about 190 m and an hour; hollow ribbons, zigzags and open passes are a
quarter to a half of that.
