# Noise veils

A pen-plotter generator: a perfectly regular family of threads — concentric rings, a
ruling of parallel lines, one long spiral — dragged through a Perlin field until it
crumples into folded gauze. Where the field pulls two parts of the sheet towards one
another the threads pile up into dark creases; between them the family fans out and reads
as something translucent hanging in front of something else. A disc is taken out of the
middle so the eye has somewhere to rest. The result is exported as an SVG in millimetres,
one file or one per pen, ready for the plotter.

## Running it

No build step and no install — p5.js is bundled in `libraries/`.

**Straight from disk:** open `index.html` in a browser (double-click it, or
`open index.html` on macOS). Everything works from `file://`.

**Through a local server** (handy when the browser is strict about `file://`, e.g. for
the *Copy link* button): from the repository root run

```bash
python3 -m http.server 8000
```

and open <http://localhost:8000/p5js11%20-%20noise%20veils/>.

## Using it

1. Pick a **Scene** to start from, or set the family and the warp up yourself in the
   panel on the left. The stats under **The sheet** give the stroke count, the ink
   length, how much of the paper ends up under ink and a rough plot time.
2. **Drag** on the sheet to move the hole, **shift-drag** to move the centre of the
   family when the two are not tied together, and **roll the wheel** to resize the hole.
3. Press <kbd>R</kbd> for a new seed, <kbd>[</kbd> and <kbd>]</kbd> to step through
   seeds one at a time, <kbd>G</kbd> to hide the handles.
4. **Export SVG** writes the file. **Copy link** puts the whole sheet in the clipboard as
   a URL — every setting that is not a default is in the hash, so pasting it anywhere
   rebuilds exactly this drawing.

Everything is in millimetres. The SVG is the sheet at 1:1 with `width`/`height` in `mm`,
so it goes straight into vpype or AxiDraw without scaling.

## How it is made

Start with something regular, and push every point of it sideways by a vector read out of
a Perlin field. A smooth field would only bend the family. What makes cloth out of it is
*folding* — looking the field up at a place the field itself has already moved you to:

```
v  = F(p)             no folds: a smooth swell
v' = F(p + g·v)       one fold
v" = F(p + g·v')      two folds
```

Each round drags the lookup further off its own grid, and where the map doubles back on
itself the threads cross and stack into a crease. **Folds** is how many rounds, **Fold
depth** is the `g` above, and together they are the difference between a dune and a
crumple.

What keeps the result a fabric rather than a tangle is that neighbouring threads have to
see *almost* — but not quite — the same field. The noise is read in three dimensions and
the third coordinate is the thread's own place in the family, so thread 40 looks at a
slice of the field a little further along than thread 39. That step is **Drift**, and it
is the single most important number here:

| Drift | What it does |
| --- | --- |
| `0` | every thread is pushed by the same map; the family stays one warped surface |
| `0.1 – 1` | threads hold together as veils that fold and hang over one another — **this is the range worth living in** |
| `1 – 3` | the veils start to come apart and show their own threads |
| `3 +` | smoke: no two threads agree and the sheet is a fog |

The push can also be turned, by **Swirl**. Pointed straight along the field vector (0°) it
spreads and gathers the threads, which is what opens the white gaps and closes the dark
ones. Turned a quarter circle (90°) it runs *along* the ridges instead and sweeps the
threads sideways without ever pulling them apart — much calmer, much more like a current.
Anything between the two is the usual answer.

**Push** against **Feature size** is the other pair that matters. Push well under the
feature size only swells the family; as it approaches it the map starts folding over
itself and the creases appear; well past it, everything crosses everything and the veils
turn to wire wool. A big feature size with a matching push gives a few large veils and
plenty of bare paper; a small one rumples the whole sheet evenly.

**Strength** decides whether the push is the same everywhere or grows away from the
centre. Even is the usual choice for veils. *Grows outward* holds the middle of the sheet
calm — a tight rosette of nearly circular rings around the hole, exploding as it goes out.

## The family

What is dragged through the field, before the field touches it.

- **rings** — concentric circles about a centre. The folded veil of the reference is made
  of these, and a full ring plots as one closed stroke.
- **lines** — a ruling across the sheet at **Ruling angle**. Folds into cloth: the same
  machinery, but the creases run in bands instead of wrapping.
- **spiral** — one thread for the whole sheet, so the plot is a single stroke and the pen
  never lifts. Drift still applies, turn by turn, exactly as it does ring by ring.
- **spokes** — out from the centre. The field combs them sideways, which gives a burst
  rather than a veil.

**Thread spacing** is how far apart the threads sit *before* the warp — it sets how dense
the calm parts of the sheet are, and everything darker than that is the field pushing
threads together. **Step along a thread** is how finely each one is sampled; it has to be
well under the feature size or the folds come out as corners, and the stats will say so.

**Inner** and **outer radius** bound a radial family. Leaving the outer one at 0 runs it
out past the far corner with room to spare, so the field always has material to drag
inwards and the sheet never shows a bald edge. **Fan** draws less than a full turn.

## The hole

- **cut** — every thread that runs into the disc ends on it. The crossing is interpolated,
  so threads end *on* the circle and not at the nearest sample before it, and the rim
  comes out clean. This is what the reference does.
- **push** — nothing is thrown away. The radius is remapped so that everything inside
  `R + band` lands between `R` and `R + band`: the disc empties and what used to fill it
  piles up around the rim. **Rim band** is how wide that band is. At 0 all of it lands on
  the circle itself and prints as a solid black ring, which is a decision rather than a
  bug — 10–25 mm is where it reads as a gathered edge instead.

*Draw the rim* adds the circle itself as a stroke. The hole does not have to sit at the
centre of the family: untick *the hole sits where the family is centred* and it gets its
own position.

## Pens

Up to three, one plotter pass each. **Split** decides which thread goes to which:

- **bands** — contiguous groups, which for rings is concentric belts.
- **interleaved** — thread by thread, so the colours weave through one another.
- **by fold** — by how far the field moved that thread, in equal shares, so one pen draws
  the creases and another the calm. The shares are worked out over the family as actually
  drawn, so both pens always have something to do whatever the push is set to.

## What ends up in the file

One `<g>` per pen, no fills and no background rectangle — everything in the file is meant
to be plotted. `stroke-width` is the pen width and the caps are round, so the file
previews as the finished plot looks.

Strokes come out in the order the pen should visit them, each already flipped to the end
it should be entered from: greedy nearest-neighbour over the endpoints, one pen at a time,
so a pass never has to come back to a colour it has already put down. `vpype`'s `linesort`
would redo this anyway, and the repository's `vpype-process.sh` is the usual next step:

```bash
./vpype-process.sh "veils rings seed1 A4-landscape pen0.2 ….svg"
```

Two comments ride at the top of the file: every setting in one line, and the URL that
rebuilds the sheet. A plot is always reproducible from the file it came from.

## Watching the cost

This style is expensive. The threads are close together by design and the creases stack
them closer still, so a default A4 runs to a couple of hundred metres of line and about an
hour at the plotter. The stats warn about three things in particular:

- **thread spacing under two nib widths** — wherever the field leaves the threads alone
  they will run together into solid ink rather than reading as lines.
- **ink over half the sheet** — thin paper will cockle and the nib will run dry.
- **step too coarse for the feature size** — the folds will come out as corners.

A finer nib is usually the right answer: at 0.15–0.2 mm the veils keep their gauze, and
the spacing can come down with it.
