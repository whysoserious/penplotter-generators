# Mirror spheres

A pen-plotter generator: a chrome ball standing in a tiled room, drawn as the lines of the
room it reflects. The floor, the ceiling and the walls are laid with grids, honeycombs,
bricks, fish scales, arcades, flagstones, craters, rings, spirals, rays, whirls, a forest
of posts or a geodesic net; the ball bends all of them into one disc, with the room behind
the camera in the middle and the room behind the ball pressed into the rim. Where
perspective or the rim crowds a pattern together it thins itself out, so the pen never has
to lay lines on top of one another. The result is exported as an SVG in millimetres, one
file or one per pen, ready for the plotter.

## Running it

No build step and no install — p5.js is bundled in `libraries/`.

**Straight from disk:** open `index.html` in a browser (double-click it, or
`open index.html` on macOS). Everything works from `file://`.

**Through a local server** (handy when the browser is strict about `file://`, e.g. for
the *Copy link* button): from the repository root run

```bash
python3 -m http.server 8000
```

and open <http://localhost:8000/p5js12%20-%20mirror%20spheres/>.

## Using it

1. Pick a **Scene** to start from, or set up the room and what its surfaces are laid with
   in the panel on the left. The stats under **The sheet** give the stroke count, the ink
   length, how much of the ball ends up under ink and a rough plot time.
2. **Drag** on the sheet to turn the camera round the ball: across is the turn, up and
   down the height, and a drag the width of the ball is half a turn. **Shift-drag** walks
   the ball about the room and the **wheel** raises and lowers it. The arrow keys turn the
   camera by 1°, or by 10° with <kbd>shift</kbd>; <kbd>R</kbd> rolls a new seed for the
   flagstones and the craters, <kbd>[</kbd> and <kbd>]</kbd> step through seeds, and
   <kbd>G</kbd> hides the guides.
3. **Export SVG** writes the file. **Copy link** puts the whole sheet in the clipboard as
   a URL — every setting that is not a default is in the hash, so pasting it anywhere
   rebuilds exactly this drawing.

Everything is in millimetres. The SVG is the sheet at 1:1 with `width`/`height` in `mm`,
so it goes straight into vpype or AxiDraw without scaling.

## How it is made

Look at a mirror ball from far away and every point of the disc is a small mirror: the ray
from your eye lands there, bounces off, and carries back whatever it hits. The disc is a
map of every direction around the ball, and the map fits in one line. With the camera out
on `+z`, whatever lies in direction `d` from the ball shows up where the ball's normal
points halfway between `d` and the way back to the camera:

```
n = (d + ẑ) / |d + ẑ|        position on the disc = (n.x, n.y)
```

No ray tracing and no search. A direction at angle `θ` from the camera lands at `sin(θ/2)`
of the radius from the middle: the camera itself (and the room behind it) in the centre,
the walls to either side of the ball at 0.71, and everything behind the ball squeezed into
the ring between there and the rim. The one direction straight away from the camera has no
single image at all — it *is* the rim, all of it, which is why a mirror ball always has
that dark, crowded edge.

The room is made of straight lines and circles. A straight line is walked by the angle it
is seen at rather than by its length: seen from the ball, an infinite line fills half a
great circle, so it reaches both of its vanishing points in a finite number of steps. Every
curve is then **walked by halving** — split until the point halfway along each piece lies
within the curve tolerance of its chord — so the steps crowd in near the rim, where the
mirror bends everything hard, and spread out in the middle, where it hardly bends at all.
Where halving never brings two ends together, the curve has crossed the rim, and it is
broken there instead of being drawn as a chord across the ball.

The room is treated as large next to the ball, so everything in it is looked up by its
direction from the ball's centre. That is exact for a small ball in a big room, and on
paper it is what a mirror ball looks like.

## The far away

Left alone, perspective is a disaster for a pen. Every family of parallel lines runs into
its vanishing point, the back of the room is pressed into the rim, and in both places
hundreds of lines pile up on one another.

So every family thins itself out the way a mipmap does. Each line is measured against its
neighbour, on paper, at every point it is drawn at, and it stops as soon as the lines still
standing there would come closer than **Closest two lines may come**. Not every line has
the same neighbours, though: line *k* counts as one of every 2^j, where 2^j is the largest
power of two dividing *k*. The odd lines give out first, then every other one of those
that are left, and so on. The density on paper stays between the gap and twice the gap all
the way to the horizon, and the lines that carry on branch like a tree. Lines are counted
the same way on the floor and on the wall they meet, so a line that runs up a wall gives
out at the same rank as the floor line it continues.

At `0` nothing is thinned. The *Everything, piled up* scene shows what that does to the
rim; it is worth seeing once, and it is not worth plotting.

Not every pattern nests like that. A honeycomb has no coarser honeycomb inside it, and a
crater is only ever one crater. So the patterns made of pieces — hexagons, bricks, scales,
arches, flagstones, craters — fade instead. Each piece is measured by how large it comes
out on paper where it lies, the thinnest way across it (the smaller singular value of the
map from the face to the paper, since a face seen along a diagonal is foreshortened
between its own axes), and a piece that comes out smaller than the gap is dropped whole.
A tiling keeps an edge while either of the two cells it divides still shows, so it gives
out cell by cell and never leaves an edge standing on its own. Only the part of a face
where a piece can still be seen is laid with them at all, and never more than about
twelve thousand pieces to a face, so a fine pattern on an open floor costs no more than a
coarse one.

**Keep off the rim** stops the reflection that many millimetres short of the rim instead,
and leaves a clean ring of paper between the room and the outline.

## The room

- **room** — a box with a floor, a ceiling and four walls. **Width**, **Depth** and
  **Ceiling height** are in any unit you like; only the ratios matter. The ball stands at
  **Ball across** and **Ball deep** per cent of the floor, **Ball height** above it.
- **open** — the floor and the sky and nothing in between, both running out to **Floor
  runs out to**. The sky is a ceiling high enough to read as one; rings on it are the
  circles of a dome, rays on it are its meridians. *Draw the horizon* adds the level line
  where both give out.

**Turn** spins the room about the vertical through the ball. **Height** lifts the camera
above the ball's equator: at 0 the horizon is a straight line through the middle of the
ball, above it the horizon closes into an oval round the sky, and below it round the floor.

## Surfaces

Each of the floor, the ceiling and the walls is laid with a pattern of its own, at a
**scale** of its own: one piece of every pattern is **Tile** units across, times the
surface's scale. Tiles are counted from the middle of the floor and the ceiling, and up
from the floor on the walls, so a floor line carries on up the wall it meets.

Families of lines, thinned line by line:

- **grid** — square tiles.
- **stripes** — one family of them: along the room on the floor and the ceiling, upright
  on the walls.
- **diamonds** — the grid turned a quarter.
- **triangles** — three families at 60°, which make a triangular lattice and, thinned,
  a coarser one.
- **rings**, **polygons**, **spiral** — circles, regular polygons (**Polygon sides**) or
  an Archimedean spiral about the point of the surface nearest the ball, one tile apart.
  Polygons on the ceiling are the coffers of a dome; the spiral is walked a turn at a
  time so each turn can give out on its own.
- **rays**, **whirl** — **Rays** lines fanning out of that same point, straight or bent
  round: a whirl's ray turns by **Twist** radians every time it gets e times further out,
  so the whole fan sweeps round like water going down a drain. They all meet in the
  middle, which is exactly what the thinning is for; a power of two thins out the most
  evenly.

Patterns made of pieces, which fade:

- **hexagons** — a honeycomb: a zigzag along the top of every row and the short upright
  edges between neighbours.
- **bricks** — courses one tile apart, which are a family, and upright joints a brick
  apart, every other course shifted by half a brick.
- **scales** — fish scales: rows of half circles, each row a radius above the last.
- **arches** — arcades, tier on tier of round arches on piers, each arch one stroke. On
  the walls a cloister; on the floor and the ceiling they lie flat.
- **cells** — flagstones: the Voronoi cells of a jittered lattice of seeds, one to a tile.
- **craters** — a scatter of circles, small ones common and big ones rare, the big ones
  with a terrace inside the rim and the biggest with a peak.

And two that are neither:

- **posts** — a forest of sticks standing straight off the surface, **Post height**
  long, one to a tile but shaken off the lattice: standing on the floor, hanging from the
  ceiling, sticking out of the walls. A post has no thickness, so nothing would ever hide
  one behind another and towards the horizon they would pile up without end. So they hide
  each other the way trunks do: taken nearest first, each is cut wherever it would come
  within the gap of a post already standing at nearly the same bearing from the ball.
- **net** — the fifteen great circles of an icosahedron's mirror planes. A plane through
  the ball's centre meets a flat face in a straight line, so the net is laid as straight
  lines on every face it crosses, and the mirror joins them up into circles. Put it on
  every face for the whole geodesic sphere.

The flagstones and the craters are hashed from the **Seed** and each tile's own index, so
they stay put while the camera moves and more or less of a face is worth drawing.

*Draw the corners of the room* adds the twelve edges as lines of their own; a grid line
that would fall on an edge is left to the edge, so no corner is ever drawn twice.

## Pens

Up to three, one plotter pass each. The floor, the ceiling, the walls, the corners (or the
horizon) and the rim each have a pen of their own, set next to them in the panel.

## What ends up in the file

One `<g>` per pen, no fills and no background rectangle — everything in the file is meant
to be plotted. `stroke-width` is the nib and the caps are round, so the file previews as
the finished plot looks.

**SVG** picks whether that is one file or one per pen. *One file per pen* writes each colour
separately, and each file carries the cut guides, so the passes line up on the paper.

Strokes come out in the order the pen should visit them, each already flipped to the end
it should be entered from: greedy nearest-neighbour over the endpoints, one pen at a time.
`vpype`'s `linesort` would redo this anyway, and the repository's `vpype-process.sh` is
the usual next step:

```bash
./vpype-process.sh "mirror room yaw38 pitch18 A4-portrait pen0.2 ….svg"
```

Two comments ride at the top of the file: every setting in one line, and the URL that
rebuilds the sheet. A plot is always reproducible from the file it came from.

## Watching the cost

A default A4 is about 30 m of line and ten minutes at the plotter. The stats warn
when the lines may close up tighter than the nib is wide — where they converge they will
run into solid ink — and when nothing is thinned at all. A finer tile costs more line, not
more of anything else: the thinning holds the density on paper wherever the room gets far
away, so the extra lines only ever show up where there is room for them.

The patterns made of pieces cost pen lifts rather than line. Every upright edge of a
honeycomb, every brick joint and every post is a stroke of its own, and at 0.3 s a lift a
few thousand of them add up to a long sitting — the stroke count in the stats is the number
to watch. Grids, rings and spirals are the cheap end: long strokes, few lifts.
