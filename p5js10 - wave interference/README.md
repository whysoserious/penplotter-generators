# Wave interference

A pen-plotter generator: a handful of drops on still water, the ripples they send out and
the pattern where those ripples cross. The water is drawn with families of ruled lines
pushed sideways by the wave under them — up to four of them, each with its own angle,
spacing, colour and moment in time — or with the contour lines of the water itself. The
result is exported as an SVG in millimetres, one file or one per pen, ready for the
plotter.

## Running it

No build step and no install — p5.js is bundled in `libraries/`.

**Straight from disk:** open `index.html` in a browser (double-click it, or
`open index.html` on macOS). Everything works from `file://`.

**Through a local server** (handy when the browser is strict about `file://`, e.g. for
the *Copy link* button): from the repository root run

```bash
python3 -m http.server 8000
```

and open <http://localhost:8000/p5js10%20-%20wave%20interference/>.

## Using it

1. Pick a **Scene** to start from, or place the drops yourself and set up the water and
   the families in the panel on the left. The stats under **Plot** show the stroke count
   per family, the ink length and a rough plot time.
2. Place the drops on the sheet itself (see the controls below).
3. Press **Generate SVG**. With **SVG output** set to *one file per colour* you get one
   file per pen, each carrying the cut guides so the passes line up.

Every setting, and every drop, lives in the address bar. **Copy link** keeps the sheet,
pasting the link into a tab brings it back, **Reset** returns to the defaults.

Optional clean-up with [vpype](https://github.com/abey79/vpype) (sorts and merges the
strokes once more), from the repository root:

```bash
./vpype-process.sh "path/to/waves ….svg"
```

It writes `output.svg` next to where it is run.

## Placing the drops

| Input | Action |
|---|---|
| click the water | a new drop there, already being dragged |
| drag a drop | move it |
| right click a drop | take it away |
| ← → ↑ ↓ | nudge the selected drop, 1 mm per press |
| Shift + arrows | nudge it 0.2 mm |
| Del / Backspace | remove the selected drop |
| N | a drop in the middle of the sheet |
| C | the selected drop: splash ⇄ continuous |
| [ / ] | its age, 0.2 s per press |
| − / + | its wavelength, 1 mm per press |

A new drop copies the wave of the one that was selected, so a row of drops all ringing at
the same wavelength takes four clicks. Drops are held as a fraction of the sheet rather
than in millimetres, so a composition survives a change of paper, margin or orientation.

While a drop is being dragged the water under it is redrawn every frame; the lines follow
at once if a whole sheet fits in the frame, and otherwise when the mouse comes up.

## The water

Each drop is a packet of ripples riding on an expanding ring:

```
h(r) = power · envelope(r − c·t) · decay(r) · cos( 2π·(r − c·t)/λ + φ )
```

- **Time since the splash** is the drop's phase — how long ago it hit the water. Its ring
  has got `speed × age` away from it by now, and every ripple behind the ring follows
  from the same number. **Time** in the *Water* section adds to every drop at once.
- **Train** is how many wavelengths of ripples trail behind the ring before the water
  goes flat again; **lead** is the short run ahead of it. A short train is a splash caught
  early, a long one an established swell.
- A **continuous** drop is not a splash but a finger held in the water: no tail, so
  everything inside the ring keeps moving. Two of them is the textbook two-source
  picture.
- **Power** can be negative — the same splash upside down, cancelling where an equal
  positive one would double.
- **Reflections** turn the sheet into a tank: every drop is joined by mirror copies of
  itself, one ring of them per bounce, so ripples come back off the edges. A hard wall
  sends a crest back as a trough.

Drops are summed, and the sum is divided by the tallest water anywhere on the sheet, so
full deflection always means the highest crest this particular arrangement builds. Turn
**auto gain** off to set the scale by hand.

## Wave height

Full deflection is how far a line is pushed at its furthest, and that distance in
millimetres is set on each family. How the water is shared out over it is set once, under
*Wave height*, and that is where the drama comes from: raising the displacement on its own
lifts the smallest ripple as much as the tallest crest, so the drawing gets busier rather
than higher.

- **Contrast** above 1 holds the small ripples down and leaves only the strong water
  moving — calm paper with the crests standing out of it. Below 1 every last ripple moves
  and the sheet fills up.
- **Crest boost** hands that same room to one side: the crests are carried up towards full
  deflection and the troughs under them are flattened, the way a real swell peaks — sharp
  tops over long shallow hollows.

Both keep still water still and full deflection full; they only move what happens in
between. Contrast up, crest boost up and a displacement of several line spacings is the
*Swell, high crests* scene: the lines cross where the crests stand and lie nearly straight
everywhere else.

## The families

Each of the four families is a separate pen, and the four are the same thing four times
over — anything one can do, all of them can. Only the values they start out with differ,
so that switching one on gives a different picture rather than a second copy of the first:
families 1 and 2 are a ruling each, at right angles; family 3 is the rings around every
splash; family 4 is the still water between them, which is why it looks nothing like the
others until you change it. The line under each heading in the panel says what that family
is currently set to draw.

**Lines** is a ruling at the family's own angle, walked at the sample step and pushed
sideways by the water under it; two families at different angles weave a moiré that reads
as the surface itself. **Contours** is the level curves of the water, with no ruling at
all. **Rings** wraps the same reading around a point instead of laying it across the
sheet: a circle is walked round at a fixed step and pushed out and in by the water, so a
crest bulges the ring outwards and a trough pulls it in.

Rings belong on a drop — that is where the ripples came from, so the rings and the water
agree and every circle comes out as the wave front the other drops have left of it. *A set
around every drop* does that for all of them at once; switch it off for a single set
around a point of your own, with a button that snaps it to the selected drop.

| | |
|---|---|
| innermost / outermost ring | where the family starts and stops; the outermost at 0 runs out past the far corner of the sheet |
| gap growth per ring | how much wider each gap is than the one before, so the rings crowd in the middle and open out |
| sector starts at / span | any arc of the circle rather than the whole of it — a centre off the sheet and a narrow span is a fan of wave fronts sweeping across it |
| one continuous spiral | the whole family as a single unbroken stroke, the pen never leaving the paper. Keep the outermost ring inside the sheet and nothing cuts it |

Line spacing, displacement, the gate and the time offset mean the same for rings as for a
ruling.

**Keep only** cuts a ruling into pieces:

| | |
|---|---|
| crests / troughs | bands of high and low water — one of each, in two colours, is the whole picture |
| both peaks | everything that stands away from the middle |
| nodes | the still water: the curves along which ripples cancel each other out |

A node is measured against how high the water at that point could stand if everything
passing through it agreed, not against full deflection — otherwise water that no ripple
has reached yet would read as the stillest place on the sheet. It is left blank instead.

**Time offset** puts one family a moment later than the others: a second colour a
fraction of a period behind the first draws the same wave a step on.

## What ends up in the file

Strokes are ordered one family at a time — a multi-pen plot is run one pen at a time —
greedy nearest-neighbour within each, each stroke already flipped to the end the pen
should enter it from. Polylines are thinned by Douglas–Peucker first: anything under a
tenth of the pen width is invisible on paper and halves the file. The cut guides go into
every file of a split plot, which is what lines the passes up on the sheet.

Neither the grey water under the drawing nor the drop markers is ever exported — the SVG
holds the lines and nothing else. The header comment carries the whole setup and the link
that rebuilds it.
