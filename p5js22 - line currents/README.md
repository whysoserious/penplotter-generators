# Line currents

A pen-plotter generator that draws a photograph — or a lay figure, a cloth, balls, noise or
a word — in lines that crowd into its shadows. The picture it started from is a nude drawn
in nothing but lines: they run across the body like the folds of a cloth, close up solid
black in the shadows and thin out to a few hairs on the lit side, and behind the figure red
streaks rake the sheet, packed tight beside it and sparse further off.

The lines are the **fronts of a wave** that crosses the picture slowed by its dark. From one
front to the next is the pitch of the light where the picture is paper and the pitch of the
dark where it is ink, so the fronts crowd into the shadows, lie apart in the light and bend
round every dark place the way a wave bends round a stone — the lines wrap the forms by
themselves. Before a line is drawn the picture can go through a chain of up to three
**transformations** out of twenty-one — smears, stretches, pixel sorting, slices, twirls,
kaleidoscopes, a polar wrap, shards, echoes, zoom streaks, a thumb's smudge and more — and
the ones that only move places can bend the finished drawing instead, its lines and all. The figure can be cut
out of its ground and outlined, red can be put among the black, streaks raked behind it in
a second pen and a marker laid under it all.

## Running it

No build step and no install — p5.js is bundled in `libraries/`.

**Straight from disk:** open `index.html` in a browser. Everything works from `file://`.

**Through a local server** (for the *Copy link* button in a strict browser): from the
repository root run `python3 -m http.server 8000` and open
<http://localhost:8000/p5js22%20-%20line%20currents/>.

## Using it

1. **Load a photo** at the top of the panel — or drop it anywhere on the page, or press
   <kbd>P</kbd>. It is drawn as the scene asks: with a photo loaded every scene of the lay
   figure draws the photo instead, and the scenes that start *Your photo* are made for it.
   Without one the sheet draws a lay figure, a cloth, balls or a word.
2. Pick a **Scene** — the figure in its shadows, red among the black, stretched past a line
   like the nude's legs, smeared down the streaks, echoes of its outline, rings from its
   heart, raindrops, a curtain, twirled, a kaleidoscope of arms, pixel-sorted, sliced,
   melting, shattered, echoes, zoom streaks, a planet, tiles, liquid and twirled, ridges,
   squiggles, contours, drapery, balls, a word, a red marker in the shadow, markers on black
   paper, and seven for your photo — or set it up in the panel. Each section folds away
   under its heading.
3. **Drag** on the sheet to slide the picture; the **wheel** enlarges it about the cursor
   and <kbd>0</kbd> puts it back. **Shift-drag** (or a right-drag) turns the lines,
   **alt-drag** moves the middle the wave sets off from. The arrow keys slide the picture by
   1 mm, or 10 with <kbd>shift</kbd>; <kbd>+</kbd> <kbd>−</kbd> enlarge it. <kbd>S</kbd>
   steps through the scenes, <kbd>F</kbd> through the pictures, <kbd>T</kbd> through the
   first transformation, <kbd>M</kbd> through the kinds of line, <kbd>O</kbd> through where
   the wave sets off from, <kbd>E</kbd> through the streaks; <kbd>X</kbd> switches the cut
   guides, <kbd>G</kbd> shows the margin, the middles and where the cut guides stand,
   <kbd>R</kbd> rolls a seed, <kbd>[</kbd> <kbd>]</kbd> step it.
4. **Download SVG [everything]** writes the sheet, a group per pen; **[one per pen]** a file
   per pass; a button per layer writes the marker, the streaks, the lines, their second
   colour, the outline, the border or the cut guides alone. **Download PNG** saves the
   preview. **Copy link** puts every setting in the clipboard as a URL — all but a loaded
   photograph, which has to be loaded again.

The paper is any of A0–A5 and B0–B5, either way round, or **custom**. The picture is the
sheet less the **Margin**. Everything is in millimetres, and the SVG is the sheet at 1:1.

## How it is made

### The picture

Whatever the lines are drawn from is painted into grids over the margin box: the tones
(0 paper, 1 ink), how far a place is the figure and not its ground, how red the photograph
was there, and what the smears added. **Made of**:

- **photo** — yours, **laid** to *cover* the picture (cut to fill it) or *contain* it
  (whole, paper round it). It is not part of the link;
- **figure** — a lay figure, an artist's wooden mannequin of tubes and balls, its **arms
  raised** over its head or let down by its sides, **leaning**, lit from one side: **light
  from** an angle on the sheet and **above the paper** by another. A low light gives long
  dark sides. **Ground** is the tone round it;
- **drapery** — a hanging cloth, so many **folds** of a **fold size**, gathered towards the
  top and lit like the figure;
- **spheres** — **balls** of a **size**, some in front of others;
- **noise** — with a **lump size** and **octaves**;
- **word** — set in a bold face as large as fits; a bar `|` starts a new line.

**Where it lies** slides, enlarges and turns the picture — the same as dragging and the
wheel.

### Tones

**Inside out** swaps dark and light; **Spread evenly** equalizes the photograph so every
tone gets as much of it as every other — a flat photo opens up; **Level**, **Contrast** and
**Gamma** shape the tones; **Soften** blurs the picture and calms the lines; **Rims**
overdoes every edge, as far as **Rims reach**; **Bands** cuts the tones into steps.

### The figure

**The figure is**:

- **everything** — no figure, no ground;
- **its shape** — the lay figure, the balls or the letters; of a photograph, whatever is
  *unlike its border*. The ground's colour is read off the top and the upper sides of the
  photograph — a portrait, a bust or a body whose legs run off the frame all stand on its
  foot — and every place is measured by how far its colour is from that one: a body and the
  wall behind it differ in hue even where they are as light. Ground for certain is what can
  be reached from the border over colours within half the tolerance, and any large patch of
  them the figure closes in (the wall seen between an arm and the body); figure for certain
  is every colour more than twice the tolerance away. Between the two the photograph's own
  edges decide: both are grown outwards together, the flattest places first — a watershed —
  so they meet where the photograph changes most. The edge is then smoothed and specks given
  back. Made for a figure on a plain background; raise **Unlike the border by** if ground is
  taken for figure, lower it if the figure is eaten. The panel says how much of the picture
  the figure is;
- **darker than** or **lighter than** a tone.

It can be **grown** or shrunk and its edge **softened**. **Its ground** is:

- **cut away** — the lines stop at the figure's edge. The wave crosses the ground as if the
  figure's own tones went on over it, so it comes into the figure straight;
- **kept** — drawn as it is;
- **blank** — drawn as bare paper: the lines cross it at the pitch of the light, and the wave
  races round the figure and comes into it from the sides.

**Outline the figure** draws its edge, in a pen of its own choosing.

### Transformations

Up to three, one after another, all before a line is drawn. They go over all four grids
alike, so the figure's outline, its reds and its ground go with the picture. Every one reads
the same five numbers of its slot — an amount, a size, an angle and a place across and
down — names them for itself and hides what it does not read; choosing one puts its numbers
to where it starts from. Angles run clockwise from pointing right: 90 is down.

- **smear** — every dark place drags a trail after it that fades over the **length**,
  **towards** the angle; below 0 the light drags instead. The figure goes with the trail
  and fades slower, so the lines run on into it as it pales;
- **stretch** — past a line square to the angle the picture is drawn out; at 100 the line
  itself is smeared to the edge, as the nude's legs are;
- **sort** — pixel sorting: every run darker than the threshold (or lighter, below 0), no
  longer than the **longest run**, put in order of tone along the angle;
- **slices** — strips along the angle, each slid along itself; about a third stay put;
- **push** — every place pushed by its own darkness: the dark travels, the light stays;
- **twirl**, **bulge** (below 0 a pinch), **ripple** — about a **middle**, within a radius;
- **wave** — a sine across the angle; **liquid** — stirred by slow noise;
- **melt** — the far side of the picture runs, column by column, each its own way;
- **kaleidoscope** — one wedge, from the middle along the angle, mirrored round;
- **mirror** — one side of a line reflected onto the other;
- **polar** — the picture rolled round the middle, its foot there, its head at the radius;
- **shatter** — shards of a jittered grid, each slid and turned by its own amount;
- **mosaic** — tiles of a turned grid, each the tone of its middle, slid if asked;
- **echo** — fainter copies of the dark, one after another along the angle;
- **zoom**, **spin** — streaks out of the middle, or round it;
- **tile** — the whole picture shrunk into so many tiles across;
- **smudge** — grabbed at a place and dragged, as a thumb drags wet ink: what is at the
  place goes all the way, what is at the reach stays.

The seed decides the strips, shards, drips and stirring.

**Bends** — the stretch, twirl, bulge, ripple, wave, liquid and smudge can bend the
**picture**, before its lines are found, or the **drawing**, after: the lines are found on
the picture as it is and then twisted with the sheet — the fronts, the streaks and the
outline alike, cut into half-millimetre steps and each step sent where the bend takes it. A
marker fill is not bent, it is found through the bend: every place of the sheet looks back
to where in the picture it came from, and is filled as a shape wants it there. The border and
the cut guides stay where they are.

### The lines

**Drawn as**:

- **fronts** — of the wave. Its travel time is found on a grid of nodes by fast sweeping:
  the grid is swept from each corner in turn, every node taking the earliest time a front
  could reach it from its neighbours, until nothing changes; the fronts are drawn by
  marching squares, every whole line at once. **The wave sets off from**:
  - an **edge** — the one the angle points away from: level lines at 0, upright at 90;
  - **both edges**, meeting in a seam;
  - a **middle line** through the middle, along the angle;
  - a **point** — rings, round the middle;
  - **points** strewn by the seed — raindrops whose rings meet;
  - the figure's **outline** — echoes of it inside and out;
  - its **highlights** — everything lighter than a tone stays paper and the rings run out
    of it;
- **curtain** — the time is only added up down each column, so a dark place drags every
  line below it down with it: the lines hang;
- **ridges** — rows a **pitch** apart, **lifted** by the dark, each hiding behind the rows in
  front of it if asked;
- **squiggle** — rows swinging to either side, wider and quicker in the dark — down to the
  **wiggle** in the darkest;
- **contours** — of the tones, so many **levels** from paper to ink.

**Pitch in the light** and **Pitch in the dark** are the distances from one line to the next
on paper and on ink; at the nib or under it the darkest places close up solid. **Curve**
over 100 keeps the lines apart longer. **Slid along** moves every front by a share of a
line. **Grid** is what the lines are found on — finer follows the picture closer and takes
longer. **Pen up below** stops the lines where the picture is lighter, **Shortest stroke**
drops crumbs, and a hop shorter than **Pen kept down over** is drawn instead of lifted over.

### Second colour

**Among the lines** — where they go on in another pen: a **tone band**; **every n-th
line**; **blots** of the sheet; **one side** of a line; the **background**, if it is drawn;
the **photo reds** — wherever the photograph was strongly red; where the transformations
**smeared** the picture.

### Streaks

Straight lines across the sheet at their own **angle**, in another pen. In the figure's
**shadow** they are packed — the dark side of the figure seen along the streaks, **slid
across** them so the packed band can lie beside the figure, as it does in the nude — and in
**bands** of noise; sparse elsewhere. Or **bands** only, or **even**. The packing is found the
way the fronts are: the streaks stand at whole numbers of the density added up across them.
Each stops **short of the figure**, keeps to **both** sides of it, only **after** it (the way
the angle points) or only **before**, may be given a **length** from the figure, and is
**broken** at random — its far ends worn away, a gap here and there. **Over the figure too**
lets them cross it.

### Marker

A broad pen filling a region solid: the figure's **shadow band**, its **dark tones** or
**light tones**, the **background** or the **subject** itself. A fill is drawn as a filled
shape wants it: its outline half a nib inside the edge, passes inside it no further apart
than **Passes apart** of the nib (85 closes the paper), and a part narrower than the nib is
one touch of it. **Markers go down first** puts every pen of 1 mm or more before the fine
ones, so the fine lines are drawn over their ink.

### Pens

Five pens of the drawer — rapidographs in black and red, ink markers in red, silver and
white — each a kind, a width and a colour. Every layer picks one by number. Every pen is
clipped to the margin box less half its own nib.

### Paper and cut guides

A **Border** is a line, or two, round the picture.

**Cut guide dots** are for trimming the plot on a guillotine: a dot in every corner, and
each side split evenly so that no two dots are further apart than **Most between two dots**
— lay the blade through two of them and cut. **Dots round** the **sheet** is for a plot made
on a larger piece of paper and trimmed back to size; round the **picture** cuts the margin
off and keeps the picture to its very edge. A dot is one touch of the first pen of the plot,
drawn before anything else of it, and no margin clips it.

## What ends up in the files

No fills and no background rectangle — everything in a file is meant to be plotted.
`stroke-width` is the nib and the caps are round, so the file previews as the finished plot
looks. **everything** is one `<g>` per pen, in the order the passes go down; a layer's file
or a pen's file is one group. Every file is the same sheet — the same `width`, `height` and
`viewBox` in millimetres.

The cut guides are a layer of their own in the first pen of the plot: they are in
**everything** and in that one pen's file, so they are plotted once.

Strokes come out in the order the pen should visit them, each already flipped to the end
it should be entered from: greedy nearest-neighbour over the endpoints, one pen at a time.
A hop the pen stays down over is written as a line. `vpype`'s `linesort` would redo the
order anyway, and the repository's `vpype-process.sh` is the next step. The header comment
of every file carries the link that rebuilds the sheet.

## What the sheet costs

The panel says how many strokes and metres of line the sheet is, how many fronts or rows
the picture made and how many lines were drawn of them, how dark the picture is and how
much of it is the figure, how often the pen goes down and roughly how long the plot takes,
pen by pen. The default A3 is about 85 m and half an hour; a whole photograph at the
default pitches is 130–170 m and close to an hour.
