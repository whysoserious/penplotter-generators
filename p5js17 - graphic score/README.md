# Graphic score

A pen-plotter generator: a swarm of small signs scattered along a band across the sheet,
crowded into a few knots, and strung together by lines that are each drawn differently —
plain, dashed, dotted, as double and triple bonds, hashed — ending in a tick, an arrow, a
dot or a ring. The signs are a chemist's: atoms, element symbols, rings of six and five,
charges, Bohr atoms and benzene rings; skeletal chains, reaction arrows, orbitals and
spectra beside them; and compounds named by formula or by name, in Polish or English, in
a stroke font of its own. Long arcs sweep through, a few rays run far out of the band, and
a voice winds through the whole of it. It started from a white-on-black drawing that reads
like a score for an instrument nobody has; the composition is that drawing's, the signs
deliberately are not.

Two technical pens draw the fine work — black, and red for an accent and the voice — and
three ink markers, 3 to 15 mm, the broad strokes under it: notes, staves, bars and sweeps.
On black paper the white and silver markers draw the whole score, larger.

## Running it

No build step and no install — p5.js is bundled in `libraries/`.

**Straight from disk:** open `index.html` in a browser. Everything works from `file://`.

**Through a local server** (for the *Copy link* button in a strict browser): from the
repository root run `python3 -m http.server 8000` and open
<http://localhost:8000/p5js17%20-%20graphic%20score/>.

## Using it

1. Pick a **Scene**, or set the sheet up in the panel on the left. Each section folds
   away under its heading; the browser remembers which. The stats under **The sheet**
   give the strokes, the metres of line and a rough plot time, every pass together and
   then pen by pen.
2. **Drag** on the sheet to move the band, **shift-drag** (or a right-drag) to turn it,
   the **wheel** to make it wider or narrower; while the mouse is down its outline and the
   clusters show, and <kbd>G</kbd> keeps them on. The arrow keys nudge the band by 1 %,
   by 10 % with <kbd>shift</kbd>. <kbd>L</kbd> steps through the layouts, <kbd>A</kbd>
   through the accents, <kbd>R</kbd> rolls a seed, <kbd>[</kbd> <kbd>]</kbd> step it.
3. **Download SVG [everything]** writes the sheet, a group per pen at its own width;
   **[one per pen]** a file per pass; under them a button per layer writes that layer
   alone. **Download PNG** saves the preview. **Copy link** puts every setting in the
   clipboard as a URL.

The paper is any of A0–A5 and B0–B5, either way round, or **custom** in millimetres.
Everything is in millimetres, and the SVG is the sheet at 1:1.

## How it is made

### Where the glyphs go

Every layout gives a point of the sheet a coordinate along the shape and one across it,
and the density falls off across it as exp(−|across / half width|^p): a soft gaussian with
**Edge** at 0, a crisp edge at 100, and a little softer towards its ends.

- **band** — a strip at **Angle**, **Length** along and **Width** across, its middle
  meandering by **Meander** and its width swelling by **Swell**, both read off noise.
  **Bands** lays several side by side, **Between bands** apart, like the systems of a
  page of music.
- **ellipse** — the same two measured as one radius.
- **ring** — across measured from a circle, **Length** its radius.
- **islands** — the clusters alone, anywhere on the sheet.
- **sheet** — anywhere at all.

**Clusters** are placed first, by the shape's own density, each **Cluster size** across.
**Pull of the clusters** is how much of the density gathers in them, and **Clumping**
breaks the rest up with noise at **Clump scale**. The glyphs are then scattered by
rejection against that density and never closer than **Spacing**; **Strays** are scattered
against a shape twice as wide with no clusters, so a few stand off on their own.
Candidates come from one stream of random numbers and are judged only against the glyphs
already placed, so asking for more glyphs adds to the sheet and moves none of those on it.

**Unit** is what everything small is measured in: a glyph is about half a unit in radius,
and the dashes, ticks and marks are measured in it too. Scale it with the pen — 2–3 mm
with a 0.35 mm nib, 15 mm and more with a 3 mm marker.

### The glyphs

**Dots** (atoms), **circles**, **elements in circles** (C, O, N, H, S, P, F, Cl, Br, Si
or B, carbon the most often), **elements, bare** — the symbol alone, the bonds stopping
short of it as in a skeletal formula — **rings of six** (some with the circle of an
aromatic ring), **rings of five**, **charges** and **nothing**, a bare joint where lines
simply meet, each as often as its weight says. Their kind, size, turn and element come
from hashes of their own index, so changing a weight repaints the glyphs and moves none of
them. **Inked solid** fills a share of the circles and rings. A symbol never comes out
smaller than an ordinary glyph, so it stays legible.

**Hubs** are glyphs grown several times over — a benzene ring, a Bohr atom with two or
three shells and its electrons on them, three orbits round a nucleus, a crystal's unit
cell with an atom at every corner, a ring of five with an O, N or S in it — one in each
cluster first, the rest anywhere. The glyphs under a hub are taken away.

### Threads, stems and the way lines meet the glyphs

A thread is a walk from glyph to glyph through their eight nearest neighbours within
**Reach**. Each step weighs the neighbours by how little they turn the walk —
**Straightness** sharpens that — and by how few lines they already have, and an edge is
never taken twice. A thread has one style and up to **Pieces at most** pieces; a piece is
straight, **bowed** into an arc of up to **Bow** of its length, or bent once at a right
angle, along the band and then across it (**Elbows**). A free end may run on past its last
glyph into an end mark (**Spurs**). **Join the rest** joins a share of the glyphs no thread
reached to their nearest neighbour. **Stems** are short sticks off a glyph into an end mark,
squared to the band — along it more often than across — or at any angle.

Every line stops at the edge of a glyph it reaches, **Gap at a glyph** short of it, worked
out exactly for a circle and for the side of a ring of six or five it meets. With **Lines
stop at the glyphs they cross** a line is also cut wherever it passes over another glyph:
the path is looked along every 0.3 mm and each crossing pinned down by bisection. Dots and
bare joints let lines through.

### Line styles and end marks

**solid**, **dashed**, **dotted**, **dash-dot**, **double** and **triple** (bonds),
**hashed** (a bond going into the paper: strokes across, growing along it), **ticked** (a
ruler), **comb** (ticks on one side), **ladder**, **zigzag**, **wave**, **beaded** (small
circles strung along, the line broken round each) and **coil** (loops like a spring, a
prolate trochoid); the comb, the ladder and the coil are off unless asked for. A
style lays itself along the path by distance and stretches a little to fit it a whole
number of times — a dashed line starts and ends on a dash, a zigzag on the line, a wave at
its middle. **Pattern size** scales them all against the unit.

End marks: a **tick**, a **double tick**, an open **arrow**, a solid **arrowhead**, a
**dot**, a **circle**, a **triangle**, a **square**, a **fork**, a **flag** — or nothing.
The ones with an inside stand beyond the end, so the line just reaches them.

### Marks

Small signs out of a chemist's notebook, in a frame of their own and never upside down:
a **benzene ring**, aromatic or with its double bonds drawn in; a **ring of five**, now
and then with an O, N or S at a corner and the bonds stopping short of it; a **chain** — a
skeletal formula, bonds at 120°, one of them double, now and then ending in OH, NH₂, COOH,
Cl or SH written out; a **reaction arrow** — →, ⇌, ↔, or → with Δ over it; an **atom** of
three orbits; a **p or d orbital**; a **charge**; an **ionic lattice**, small ions and large
in turn; a **wedge bond**, solid or hashed; a stick **spectrum** with its multiplets.
**Beside a thread** sets how many sit off to one side of a thread and turn with it; the
rest stand clear of a glyph, squared to the band by **Squared to the band** or at any
angle. A mark keeps off the glyphs and the marks already laid, and tries elsewhere.

### Labels

Compounds named beside the score — water, glucose, caffeine, blue vitriol, cinnabar and
some fifty more — **written as** formulas (H₂O, C₆H₁₂O₆, CuSO₄·5H₂O, SO₄²⁻), names, or a
mix, the names **in** Polish or English. A label beside a thread lies along it, off to one
side; one beside a glyph stands square to the band, and **Leaders** of them stand off and
point at it with a short line. A label keeps clear of the glyphs, the lines, the marks and
the other labels, so a crowded sheet has its labels round its edges; the stats say how many
found no room. **Size** is the height of a capital in units.

The lettering is a stroke font of its own: capitals a unit high, small letters 0.6,
descenders to −0.32, each letter a few polylines with its curves cut every 15°; the Polish
letters are the Latin ones with an accent, a dot, an ogonek or a bar added. A formula is
set the way a chemist sets it: digits after a symbol or a bracket small and dropped, a
charge after `^` small and raised, a number at the start or after the dot of a hydrate full
size. The stats warn when a subscript would come out too small for the pen that writes it.

### Arcs, rays and voices

**Arcs** are long circular arcs through a glyph, or round one (**Round a glyph**), between
**Smallest** and **Largest radius**, sweeping up to **Sweep at most**; **Whole circles**
are kept to the small end of the range. **Rays** start from the glyphs furthest out of the
shape and run out of it, **Spread** off straight out, **Shortest** to **Longest** of the
sheet across the band, into a larger end mark. A **voice** runs the whole length of the
shape, stepping from glyph to glyph near where it is heading every **Step** and straying
across the band by **Wander**, as a spline or a polyline; it is cut at every glyph it
passes through, so it reads as a line strung between them.

### Broad strokes — markers

- **Notes** — on the hubs first, the largest glyphs, at random, or the glyph nearest each
  cluster: one dab of the nib at **Note size** 0, a disc filled from its edge in when it is
  wider, a **ring** round the glyph, or a disc set **beside** it like a moon.
- **Staves** — **Stave lines** along the middle of every band, **Gap** apart, following its
  meander, with **Breaks** cut into them and a **Wobble**; round the ring on a ring.
- **Bars** — strokes along the band from a glyph onward, **Shortest** to **Longest**,
  tilted by up to **Tilt**: the durations of a piano roll.
- **Sweeps** — long gestures across the band, bent by noise.

### Filling with a pen

What has to land on a filled shape is the edge of the black, so a fill is drawn on the
shape pulled half a nib in: its edge once, then passes no further apart than **Fill
passes** of the nib — 85 % overlaps them by 15 %, as elsewhere in the repository. A disc
is one stroke, its edge and then a spiral wound in to the middle; a triangle or a square
is its edge and a zigzag across it parallel to its longest side. Anything no wider than
the nib is a single dab. The same rule fills a solid arrowhead with a 0.35 mm pen and a
22 mm note with a 12 mm marker.

## Pens

Five pens, a pass of the plotter each. Each has a **Kind** — black or red rapidograph, red,
silver or white marker, or another — a **Width** and a preview **Colour**; changing the kind
sets the colour and a usual width. Every layer picks a pen by number: glyphs, threads,
stems, marks, labels, arcs, rays and voices; notes, staves, bars and sweeps. Every pen draws inside
the margin less half its own width, so a 15 mm marker stops 7.5 mm further in than a fine
pen.

The **Accent** moves part of the fine layers to another pen: a **random** share, whole
**clusters** (the share is how many of them), a **region** along the band, its
**outskirts** or its **core** — on everything, or only the glyphs, the lines, the marks or
the labels.

**Passes go down** orders the passes: broad first puts the markers under the fine lines,
which is how the preview paints them and the order the groups take in the file with
everything. The **Paper** is the preview's alone — white, cream, grey, kraft, navy, black
or any colour. On dark paper only the markers and light inks show, and the stats say when
a pen would barely show on the paper chosen, and when a pen is too wide for the glyphs it
draws and would close them up into blots.

## What ends up in the files

No fills and no background rectangle. `stroke-width` is each pen's own nib and the caps are
round. **everything** is one `<g>` per pen, `id="pen1-black"`, `id="pen4-red-marker"` …,
in the order the passes go down; a pen's file is one group, and a layer's file a group per
pen it uses. Every file is the same sheet — the same `width`, `height` and `viewBox` in
millimetres — so the passes land on one another. Strokes come out ordered greedily, one pen
at a time; `vpype-process.sh` is the usual next step. Two comments ride at the top of every
file: the settings in one line, and the URL that rebuilds the sheet.

## Watching the cost

The default A3 is about 2 700 strokes and 11 m of line, some 18 minutes at the plotter, and
most of that is pen lifts: every glyph, every mark, every dash and every dot is one, and
every letter of a label two or three.
Dotted and beaded lines and the marks cost the most for the least ink; solid threads and
arcs the least. The broad layers are a handful of strokes each. A sheet builds in 10–20 ms,
so the sliders and the drag follow live.
