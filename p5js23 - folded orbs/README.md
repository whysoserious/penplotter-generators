# Folded orbs

A pen-plotter generator of fractals of three and four dimensions, raymarched and drawn
in a disc. It is an exercise in signed distance fields: a function that, for any point of
space, says how far the nearest surface is. Walk a ray in steps that long and it lands on
the surface. The fields here are kaleidoscopes — space folded on mirrors again and again,
scaled and twisted between the folds — some of them in four dimensions and cut by a
hyperplane, regular polytopes of four dimensions brought down by stereographic
projection, or the linked circles of a Hopf fibration. They can be kept inside a ball,
carved out of it, seen in a mirror ball, or seen from inside a ball that is a mirror on
the inside, where the fractal repeats in itself.

And the inside of the ball can be made bigger than the ball: it can hold a smaller copy of
itself, and that copy another, down to a vanishing point; the whole world outside can be
turned into it, so that infinity is a point at its heart; it can be a corridor that goes on
behind a round window; its skin can be glass that opens the inside out like a room seen
through a peephole.

What the rays bring back is not a picture but readings: which piece of the fractal each
ray hit, through which mirrors, how far, which way the surface faced. A line is drawn
wherever two neighbouring readings disagree — another piece, another mirror, a jump in
depth, a fold of the surface — and every region between the lines is shaded with a
pattern of the pen: halftone dots, hatching, cross-hatching, level lines, engraved lines
that run with the surface like the lines of an engraver, or solid black — through which
the outlines can be cut back in paper, as in a woodcut. The whole of it can be folded into
exact symmetry and set in a frame of baroque ornament.

## Running it

No build step and no install — p5.js is bundled in `libraries/`.

**Straight from disk:** open `index.html` in a browser. Everything works from `file://`.
The rays are cast in Web Workers made from the sketch's own source — one per core; a
browser that will not start a worker from a page off the disk gets the same work done on
the page, a slice at a time, only slower.

**Through a local server** (for the *Copy link* button in a strict browser): from the
repository root run `python3 -m http.server 8000` and open
<http://localhost:8000/p5js23%20-%20folded%20orbs/>.

## Using it

1. Pick a **Scene**. The first twelve go deeper than the ball: halftone bands in a cell of
   the tesseract with cubes in cubes going on, the vault of a 24-cell from below cut like a
   woodcut with its well going on up, engraved hoops of an armillary sphere in a mirror, the
   world turned into the ball, a corridor behind a window, orbs in orbs winding in a double
   spiral, Solomonic columns, Apollonian pearls in a gloriole, Kleinian ivory in egg and
   dart, an armillary sphere in a laurel wreath, a glass marble, a bowl. Then the first
   sheets — Hopf rings in a ball, a tetrahedral kaleidoscope or a Menger sponge
   cut by the ball, the 24-cell, a tesseract in a mirror room, Hopf rings in a mirror ball,
   a kaleidoscope in a mirror room, a dome of the 24-cell, a quaternion Julia set, a
   four-dimensional sponge, six mirrors round a Menger, solid black in the far recesses,
   lines that follow the surface, what a mirror shows in red, a negative — or set it up in
   the panel. Each section folds away under its heading.
2. **Drag** on the sheet to turn the fractal; **shift-drag** turns it through the fourth
   dimension (the x–w and y–w planes); **alt-drag** or a right-drag turns the eye. The
   **wheel** moves the eye nearer and further. While the hand moves the rays are cast three
   times sparser and the sheet follows; when it stops they are cast again in full.
3. Keys: <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> turn by 5° (15° with
   <kbd>shift</kbd>); <kbd>S</kbd> steps through the scenes, <kbd>O</kbd> the fractals,
   <kbd>V</kbd> the views, <kbd>D</kbd> the ways deeper inside, <kbd>F</kbd> the frames,
   <kbd>P</kbd> the patterns, <kbd>M</kbd> the symmetries,
   <kbd>N</kbd> adds a copy to it (<kbd>shift</kbd> takes one away); <kbd>R</kbd> rolls a
   new fractal of the same kind, <kbd>[</kbd> <kbd>]</kbd> step the seed; <kbd>X</kbd>
   switches the cut guides, <kbd>G</kbd> shows the margin, the orb and the wedge,
   <kbd>H</kbd> shows the rendered tones under the strokes.
4. **Download SVG [everything]** writes the sheet, a group per pen; **[one per pen]** a file
   per pass; a button per layer writes the outlines, the shading, the shading in mirrors,
   the solid black, the ring, the frame or the cut guides alone. The cut guides go first,
   in a group of their own numbered for vpype, so they stay first through it.
   **Download PNG** saves the preview.
   **Copy link** puts every setting in the clipboard — the address is the whole document.
5. Run the SVG through `../vpype-process.sh` and plot `output.svg`.

## How it works

**The rays.** The orb is a disc of `orbSize` % of the picture's short side, and a grid of
rays covers it, one every `detail` mm. Each ray goes through the scene by sphere tracing:
it asks the distance field how far the nearest surface is, steps that far (a little less),
and stops when it is nearer than a fraction of the width of a ray at that distance. The
normal is the gradient of the field, four readings round the hit; the ambient occlusion is
how much nearer the surface is than it should be at four points along the normal.

**The views.** In the **orb** the eye looks at the unit ball from outside and the lens is
set so the ball fills the disc exactly. In the **mirror ball** the eye sees only a mirror
ball that fills the disc, and every ray starts as its reflection. In the **mirror room**
the eye is inside a ball that is a mirror on the inside, with an equidistant fisheye; a
ray that misses the fractal bounces off the wall, up to `bounces` times. The **dome** is
the same fisheye with no mirror round it — for looking up from inside the fractal. A mirror
ball can hang in the middle of any of them.

**The fractals.**

- `kifs` — a kaleidoscopic IFS. Every fold reflects space on the mirrors of a tetrahedron
  (`tetra`, a Sierpiński kind) or of a cube with a Menger sponge's extra fold (`cube`),
  scales it by `kScale` away from a corner (`offX` `offY` `offZ`), and turns it a little
  before and after (`twistA`–`twistE`). What is left after `iters` folds is a box, a ball
  or three crossed beams (`coreShape`, `core`). Few folds make big slabs; twists make
  them stop being crystal.
- `mandelbox` — box folds and ball folds: architecture of rooms (negative `mbScale`) or
  towers (positive).
- `julia` — a quaternion Julia set, z ← z² + c in four dimensions, cut by the hyperplane
  w = `wSlice` after a turn through the fourth dimension (`xw` `yw` `zw`).
- `hyperfold` — the `kifs` kaleidoscope in four dimensions: every coordinate folded to its
  absolute value, the four sorted, scaled away from a four-dimensional corner — a sponge
  of a tesseract — turned and cut by `wSlice`.
- `polytope` — the edges of the tesseract, the 16-cell or the 24-cell, laid on the
  three-sphere as arcs of great circles and brought down to space by stereographic
  projection, so edges become arcs of circles and cells bubbles. The distance is an angle
  on the sphere (the point folded into one cell of the polytope's symmetry, then to the one
  edge left), and it is turned into a step that is safe in space by bounding how much
  sphere a step of a given length can cover.
- `hopf` — circles wound round nested Clifford tori of the three-sphere, `windA` times one
  way and `windB` the other; one each way is the Hopf fibration, every circle linked with
  every other. The same projection brings them down.
- `apollonian` — pearls packed in the gaps between pearls: space folded into a cube and
  turned inside out in a ball, again and again (`apoS`, `apoZoom`).
- `kleinian` — a pseudo-Kleinian limit set, folded in a box and inverted in a ball wherever
  it comes near the middle: carved ivory, pillows and arcades (`klBox`, `klSize`).
- `rings` — an armillary sphere: `ringCount` hoops, each `ringShrink` the size of the last,
  tipped by `ringTilt` and turned by `ringTurn` more than the last; with `ringLat` they are
  laid round a ball one above the next, like its parallels. Each hoop is a band with a flat
  inside and outside and rounded edges.

`coreRound` rounds the edges of the pieces of `kifs` and `hyperfold` into tubes, the way a
moulding is; `spiral` twists the whole fractal round its upright — the further up, the
further turned — like a Solomonic column.

**The ball.** `enclose` keeps the fractal **inside** the unit ball (flat caps where the
ball cut it), **carves** it out of the ball, keeps a **shell** of it, or makes the ball a
round **window**: nothing in front of it, everything behind it as far as it goes. `hollow`
carves a round room at the heart, for a mirror ball to hang in. `objSize` sizes the fractal
against the ball. `cutaway` cuts the side of the ball towards the eye away, so it is looked
into like a bowl. `lens` makes the ball's skin glass of that index: under 100 % it spreads
the rays inside and the inside opens out wider than the ball; over 100 % it is a marble.

**Deeper inside.** `deep` makes the space inside the ball bigger than the ball.

- `nested` — the ball holds a copy of itself, `nestRatio` its size, shrunk towards the
  vanishing point (`vanishX` `vanishY` `vanishZ`) and turned `deepTurn` more; that copy holds
  another, `deepLevels` times, and what is past the last is the abyss (`abyssTone`). With
  `nestCarve` each copy sits in a round room of its own, `nestGap` larger than it; without,
  the one outside is simply cut open where the next begins. A turn per copy winds them into
  a spiral, as in the Droste effect. Every copy is read in its own terms, so it is as sharp
  as the first, and a ray is held at the border of a copy so it never steps over one.
- `inverted` — the whole world outside the ball turned into it by an inversion about the
  vanishing point that keeps the ball's sphere where it is: what is far away out there is
  near the vanishing point in here, and infinity is that point itself. With `deepRepeat` the
  world is a lattice of copies of the fractal that far apart, each cut to its cell so they
  join without a seam; without, make the fractal larger than the ball. The distance turned
  inside is exact: a sphere of radius D round the outside point is the image of one of
  radius D m² / (ρ² + D m) round the inside one.
- `tunnel` — the fractal again every `tunnelLen` down the line of sight, each turned
  `deepTurn` more, with `hollow` boring a round way down the middle; best behind a `window`.

Fog deeper inside is measured in steps of scale, not of length, so every copy fades by the
same amount; `deepAlike` shades every copy as the first is.

**Light from the eye.** `headlight` mixes in a light that comes from the eye: what faces
it is lit, what turns away goes dark — the light that reads best deep inside, where a light
from one side shades a whole cathedral the same.

**Symmetry.** The rays are cast through a disc folded into one wedge — a half under a
`mirror`, 1/2n of it under n `dihedral` mirrors, 1/n under a `rotational` symmetry — so the
readings are symmetric already, and under a plain mirror only half of them are cast at
all. The lines are then made for the wedge only and the wedge is turned and mirrored round
the middle of the orb: the sheet is exactly symmetric, hatching meets its mirror image on
the fold in a chevron, and an outline that runs up to the fold is put on it so it meets
its own reflection there; the two are joined into one stroke.

**Regions and outlines.** Every reading gets a name: the mirrors on its way, what it hit
(the fractal, the cap the ball cut, the sky), which piece of the fractal it is — the side
of each mirror the first `partDepth` folds put it on — and, with `panels`, a band of the
orbit trap (how near the folds came to the middle). Regions under `despeckle` readings are
swallowed by their largest neighbour. An edge runs between two neighbours of different
names, between two whose depth jumps by `depthEdge` %, or across a fold of the surface
sharper than `crease` — the last two not on a silhouette, where the normals graze and fold
every which way. The edges run along the sides of the readings, a staircase; they are
linked into chains between the points where three or more meet, smoothed (`smooth`) with
their ends held, and straightened where that changes nothing. A dangling piece shorter
than `minLine` is dropped.

**Tone.** Lambert light from `lightYaw` / `lightPitch` over an `ambient` floor, darkened by
the occlusion (`aoK`), fogged from the nearest surface to the furthest (`fog`: towards
paper above 0, towards ink below), each mirror on the way darkening it by `mirrorDim` %;
then contrast, gamma, `invert`. `flat` mixes every reading's tone with its region's mean —
at 100 every region is one flat tone, like a panel of a screen print — and `levels` cuts
the tones into steps.

**Shading.** Every region gets one pattern — the same for every region of one name, so
what is mirrored is shaded alike. Under `mixed` it is picked by the seed from the ticked
ones.

- `dots` — a grid `dotPitch` mm apart turned by `dotAngle`, a dot wherever the tone is
  darker than an 8×8 ordered dither (`bayer`), a random threshold or a row order. A dot is
  one touch of the pen.
- `hatch` — lines `hatchPitch` mm apart at the darkest, each line coming in at its own
  tone in an ordered sequence, so a tone of 50 % draws every other line. Each region's
  angle is `fixed`, one of four `per region`, or across the way its `surface` faces. A line
  once begun runs on through a slightly lighter tone, so a ripple does not break it.
- `cross` — the same, and a second family across it coming in over the darker half.
- `flow` — level lines of a field read off the hits (`depth`, world `height`, `radius`
  from the middle, the orbit `trap`, the `light`, or in the fractal's own terms `meridians`,
  `parallels` and `axis`, which run the same way in every copy), `flowLines` across the whole
  range, thinned by the same ordered sequence where the tone is light.
- `engrave` — lines that run with the surface, laid as evenly as an engraver lays them and
  closer where it is darker: `engravePitch` apart at the darkest, twice that at half the
  tone. Each line is grown from a seed both ways through a field of directions and stops at
  its region's edge, where the tone gets too light, or where it comes nearer another line
  than about half the spacing there; every line seeds the next a spacing to either side.
  The directions are `contour` — round the form, along lines of equal depth — `slope` —
  down it — `meridians` and `parallels` — ribs and rings in the fractal's own terms —
  `ribs and rings` — each region one of those two — or `per region`, any of the four.

A margin of `edgeGap` mm of paper is left along every outline; lighter than `lightest`
is left bare. Darker than `solidAt` is filled solid by the usual contract: the dark is
drawn from half a nib inside its edge, an outline round it and passes `solidPasses` % of
the nib apart. With `solidCut` an outline that runs through the black is not drawn but cut
back out of it, a line of paper `edgeGap` wide, as in a woodcut — so the shapes deep in the
dark still show, white on black.

**The ring.** A `line` round the orb, a `double` one, a `halo` — a worn, dashed arc
outside it — or a `broken` ring of dashes.

**The frame.** A band of ornament round the orb, `frameGap` mm off the ring and
`frameWidth` across, with `frameCount` motifs round it (always an even number, each standing
on the top, so a mirror through the middle holds): `pearls` — beads and reels; `rope` — a
twisted cord, its halves twisted opposite ways and tied at the top and the bottom; `egg and
dart`; a `gloriole` of straight and wavy rays, long and short in turn; `scrolls` — a running
scroll under a palmette; `laurel` — two branches of a wreath meeting at the top and the
bottom. `frameShade` hatches the shadow sides and ribs the leaves, `frameBorder` draws its
two edges. Make the orb smaller to give it room.

**Pens.** The drawer holds black and red rapidographs in 0.25, 0.35, 0.5 and 1.0 mm.
Outlines, shading, shading of what a mirror shows (when `mirrorOwnPen` is on), solid black,
the ring and the frame each pick one of five slots. The scenes hatch and engrave with the
0.25, outline with the 0.35, fill solid with the 1.0 and draw some frames in red. The cut
guides are one touch of the first pen in use, unclipped, on a layer of their own, plotted
before anything else.

## Parameters worth knowing

| Setting | What it does |
| --- | --- |
| `detail` | mm between two rays — the finer, the sharper the outlines and the slower |
| `precision` | % of a ray's width a ray must come within to call it a hit |
| `maxSteps` | how many steps a ray may take before it gives up |
| `partDepth` | how many of the first folds name the pieces — 0, the whole fractal is one |
| `panels` | bands of the orbit trap, each its own region |
| `depthEdge`, `crease` | the other two kinds of edge; 0 switches either off |
| `despeckle`, `minLine` | how small a region or a dangling line may be |
| `flat` | % of each region shaded with its own mean tone |
| `edgeGap` | mm of paper along every outline |
| `symmetry`, `symN` | none, mirror, dihedral n, rotational n |
| `deep` | nested, inverted or tunnel — the inside bigger than the ball |
| `deepLevels`, `nestRatio`, `deepTurn` | how many copies, how much smaller, how much turned |
| `vanishX`, `vanishY`, `vanishZ` | where the copies shrink to, in radii of the ball |
| `lens`, `cutaway` | a glass skin; the near side cut away |
| `headlight` | % of the light from the eye |
| `engravePitch`, `engraveBy` | how far apart engraved lines are, and what they follow |
| `solidCut` | outlines through solid black cut in paper |
| `frame`, `frameWidth`, `frameCount` | the ornament round the orb |
| `cropMarks`, `cropMarkAt`, `cropMarkGap` | cut guide dots round the sheet or the picture |
