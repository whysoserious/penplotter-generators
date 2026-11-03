# Sweet unicorns

A pen-plotter generator of chubby unicorns with curly manes, and hearts all round them —
or a colouring page of them.

A unicorn is built of soft parts — a round body on four stubby legs, a big head with a
muzzle, a mane and a tail of curls, an ear, a horn, a forelock — laid one over another from
the back to the front. A line of a part is drawn only where no part in front of it covers
it, and parts of one family (the body and its legs, the head and its muzzle, the curls of
the mane) melt into one outline where they overlap. So it reads like a sticker: one
unbroken line round the whole animal, and every curl, stripe and eyelash inside it.

It is drawn with two fine pens: a **black and a red rapidograph**. Every filled shape — a
heart, the blush, a band of the horn, the eye — is passes of the 0.3 mm nib.

## Running it

No build step and no install — p5.js is bundled in `libraries/`. Open `index.html` in a
browser; everything works from `file://`.

## Using it

1. Pick a **Scene** — one unicorn with hearts all round, over a rainbow on a cloud, two in
   love under a big heart, a heart balloon, dreaming with wings, a sticker sheet of nine
   characters, all twenty characters on an A3, a princess, a mermaid, a sleepyhead on a
   cloud, sitting pretty, raining hearts, a frame of hearts, red only, hearts with black
   edges, a colouring page, or a colouring sheet of nine — or set it up in the panel.
2. **Drag** on the sheet to move the unicorns, the **wheel** makes them bigger or smaller,
   **shift-drag** (or a right-drag) tilts them; <kbd>0</kbd> puts them back. The arrow keys
   move them by 1 mm, or 10 with <kbd>shift</kbd>; <kbd>+</kbd> <kbd>−</kbd> size.
   <kbd>S</kbd> steps through the scenes, <kbd>C</kbd> the characters, <kbd>L</kbd> how many, <kbd>M</kbd> which way they
   face, <kbd>P</kbd> the pose, <kbd>E</kbd> the eyes, <kbd>H</kbd> the hearts, <kbd>I</kbd>
   how the hearts are drawn; <kbd>W</kbd> wings, <kbd>B</kbd> balloon, <kbd>N</kbd> rainbow,
   <kbd>U</kbd> cloud, <kbd>K</kbd> colouring page; <kbd>X</kbd> cut guides, <kbd>G</kbd> the
   guides, <kbd>R</kbd> a new seed, <kbd>[</kbd> <kbd>]</kbd> step it.
3. **Download SVG [everything]** writes the sheet, a group per pen; **[one per pen]** a file
   per pen; a button per layer writes that part alone. **Download PNG** saves the preview.
   **Copy link** puts every setting in the clipboard as a URL.

The paper is any of A0–A5 and B0–B5, either way round, or **custom**; A4 upright to start.
The picture is the sheet less the **Margin**. Everything is in millimetres, 1:1.

## The parameters

### Unicorns

- **How many** — **one** in the middle; a **pair** facing each other under a big heart that
  has the top of the picture to itself; a **grid** of **Columns** × **Rows**, a sticker sheet.
- **Facing** right, left, by turns or at random; **Size** — the share of its room a unicorn
  fills (it is fitted to its box, whatever it carries: a rainbow or a balloon makes the
  animal itself smaller); **Moved**, **Tilted**.
- **Variety** — how much the unicorns of one sheet differ: head, body, legs, horn, curls.

### The unicorn

**Character** — twenty of them, each setting some of what follows and leaving the rest as
it is: **classic**; **baby** (a big head, a little horn, a bow); **pony** (long legs, long
hair); **chonky**; **princess** (a crown, long hair); **flower child** (a crown of
flowers); **sweetheart** (a mane and a tail of hearts, hearts all over); **in love** (heart
eyes); **sleepyhead** (lying down, asleep); **sitting pretty**; **hopper** (jumping);
**brave** (rearing); **angel** (a halo and wings); **pegasus**; **mermaid** (a fish's tail
with scales and a fin); **fluffy** (a fleece of puffs); **smarty** (glasses); **cosy**
(sitting in a striped scarf); **dapper** (a bow tie); **dotty**; **lazy bones**. **mixed**
deals them out over a sheet from a deck shuffled by the seed, so a sheet of twenty has
every one once; **as set below** uses the settings alone.

**Pose** standing, prancing (a front hoof up), jumping (all four flung out), rearing (on the
hind legs), sitting (the body tipped back on a haunch, a foot forward, the front legs
straight) or lying (the legs folded under); or mixed across a sheet. Sitting and rearing
turn the body and carry the head along with the neck, upright. **Eyes**: **sparkly** —
big, black, with two shines and three lashes; **happy** — smiling shut; **sleepy** — shut,
lashes down; **hearts** — red; or mixed. **Mane**: curls, long **waves** (a few locks
falling from the crown, a strand drawn in each), a **bob** of a few big curls, or
**hearts**. **Tail**: curls, waves, hearts, or a **mermaid**'s. **Wearing**: a crown, a
crown of flowers, a bow, glasses, a scarf, a bow tie, a halo. **Fluffy fleece**. **Head**, **Chubby**, **Legs**, **Horn**, **Curls
in the mane** (the curls grow if there are too few to touch), **Mane**, **Tail**. **On the
hip** a heart, three small ones, little hearts or round dots all over, or nothing. **Wings** — three feathers on the back. A
**cloud** to stand on; a **rainbow** behind with its feet in two little clouds — **bands**
filled and in arcs further apart by turns, **lines between the bands** if asked; a **heart
balloon** on a string held in the mouth.

### Ink on the unicorn

- **Colouring page — lines only**: everything goes with the outline pen and nothing is
  filled but the eyes. The hearts, the blush, the hip heart and the twinkle dots keep the
  line round them, the rainbow gets its lines; colours are left for crayons.
- **Outline strokes** — 2–4 make the outline bolder, each next stroke 80 % of a nib further
  in; the eyelashes, the closed eyes and the smile get bolder too.
- **Mane and tail** — a spiral in every curl, filled, both, or plain.
- **Horn** — **candy stripes** (slanting stripes, every other band filled), stripes, filled
  or plain. **Hooves** — filled, hatched or plain. **Blush** — filled, hatched, three
  dashes, a ring, or none.
- **Passes apart** — the distance between two passes of every fill, in nibs: 85 % closes
  the paper. **Pen kept down over** — a hop shorter than this many nibs is drawn, not lifted.

### Hearts

**scattered** — so many, between the **smallest** and the **largest**, more small ones than
big; **everywhere** — as many as fit; **rising** in a wavy stream from every horn, growing
as they go; a **frame** round the picture; or none. Every heart keeps **room round it**
from the unicorns and from the other hearts, and is **tilted** up to so many degrees.
**Drawn**: filled in the red pen; filled with an outline in the black; an outline; a double
outline; hatched — **Lines apart** sets the hatching and how far in the second line is.
The balloon, the hip heart and the pair's big heart are drawn the same way.

### Twinkles

Four-pointed stars with curved sides and small filled dots, in the free room left by the
unicorns and the hearts.

### Pens

Five pens of the drawer; each part picks one by number. By default only two are used:
pen 1, the black rapidograph — the outline, the eyes and the smile, the black edges of
hearts — and pen 2, the red one — the curls and stripes, the horn's bands and the hooves,
the blush, the hearts, the twinkles and the rainbow. Pens go down light to dark, so the red
goes first and the black line last.

### Paper and cut guides

A **Border** is a line, or two, round the picture. **Cut guide dots** are for trimming the
plot on a guillotine: a dot in every corner, and each side split evenly so that no two are
further apart than **Most between two dots**, round the **sheet** or the **picture**. A dot
is one touch of the pen that goes down first, in a layer of its own, so it is plotted once.

## How it is made

Each part is an outline; a line is read every quarter of a millimetre against the outlines
in front of it, and where it goes under one, the edge is found by halving, so it stops
exactly on the line that covers it. A unicorn is put together facing right in units of its
own and fitted into its box on the sheet, mirrored and tilted there.

Fills follow the drawer's rule: a filled shape is drawn half a nib inside its edge — an
outline, then passes evenly between its two outermost — and a shape narrower than the nib
is one touch. Convex shapes are inset exactly, by cutting with every edge moved in; a
heart is inset exactly too: its lobes shrink, its point rises along the axis and the cusp
becomes an arc. A fill of several shapes (the curls of a filled mane) fills what they cover
together; the shines in an eye stay paper.

Hearts and twinkles are placed on a coarse grid of what is taken — the unicorns' outlines
and every heart already down.

## What ends up in the files

No fills and no background rectangle — everything in a file is meant to be plotted.
`stroke-width` is the nib and the caps are round. **everything** is one `<g>` per pen; a
layer's file or a pen's file is one group. Strokes come out in the order the pen should
visit them (greedy nearest neighbour, one pen at a time); the repository's
`vpype-process.sh` is the next step. The header comment carries the link that rebuilds the
sheet.

## What the sheet costs

The panel says how many strokes and metres of line, how many unicorns, hearts and twinkles,
how often the pen goes down and roughly how long the plot takes, and per pen. The default
A4 is about 9 m and five minutes; filled hearts are most of it. A colouring page is a third
of that.
