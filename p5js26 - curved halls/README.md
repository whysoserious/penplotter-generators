# Curved halls

A pen-plotter generator of architecture made of modules — halls, corridors, shafts,
streets between towers, atria, space frames, labyrinths — every wall cut into panels with
blocks standing out of them, and polyhedra floating in the empty space. It is drawn
through lenses a camera does not usually have: fisheyes, the convex mirrors of
catadioptric cameras (parabolic and hyperbolic), the discs of Poincaré and Klein, panoramas,
Pannini's projection, Hammer's ellipse of everything, a log-polar tunnel.

## How it works

**The world** is a grid of cells, solid or empty, one module a side. Every face where a
solid cell meets an empty one is gathered plane by plane, run together into rectangles,
and each rectangle is cut into panels by a k-d tree. A panel is left flat or something
stands on it: a block (the top of which may be cut again — blocks on blocks), a stack of
steps, ribs, a grid of studs, a framed plate. Everything lies on a grid of 1/64 of a module,
so two edges in the same place are exactly equal and become one stroke. Where another wall
stands at a right angle, the blocks keep out of its way.

**Floating things** are convex pieces: the Platonic and Archimedean solids (and geodesic and
Goldberg balls) built as the hull of their vertices, then made into plates (each face a
thick plate, a frustum toward the middle, with a gap round it), framed panels, cages,
or struts with knots at the corners; or stars, a stella octangula, a Menger cube, a
cluster of greebled blocks, rings, a gyroscope, a monolith, a spiral stair, nested cube
frames.

**Hidden lines are worked out in space, exactly, before any lens.** A point of a segment
is hidden when the line from the eye to it passes through a solid. For one segment and one
convex solid that is a little linear programme: the points of the triangle eye–A–B are the
(u, v) with 0 ≤ v ≤ u ≤ 1, every plane of the solid is a straight line in (u, v), and the
polygon left after clipping says, through t = v/u at its corners, exactly which interval of
the segment the solid hides. The solids sit in a bounding volume hierarchy. Because this
does not depend on how directions are put on paper, any lens can follow.

**The lens** takes a direction from the eye to a point on the paper. A straight edge comes
out curved; it is halved until the middle of each piece lies within *Curves kept within*
of the chord. Where a lens has a seam (the back of a panorama), the chord that stays long
after every halving is cut.

**Light** is optional: sun (parallel), lamp (a point falling off with distance) or eye (a
lamp on the forehead). Each face is hatched by its tone, the lines laid in space on the face
so they bend with the lens, a fixed spacing on paper rounded to a power of two in space so
neighbouring faces share their lines, the lines for a tone picked in bit-reversed order, a
second family crossing above *Crossed above*. Shadows are found with the same linear
programme from the light instead of the eye; the parts of a line in shadow get the darker tone.

**Black faces** follow the pen's fill contract: the face moved in by half the nib (and by
*Paper along the edges*), its outline once round, passes 85 % of the nib apart, spaced
where the face is seen largest. With paper edges the edges are not drawn at all and stay
white between black faces, as if cut from black card.

## Running it

Open `index.html` from disk. No build step; p5.js is in `libraries/`.

## Using it

1. Pick a **Scene**, or a **space** (B steps) — picking one sets its size and puts the eye
   somewhere sensible.
2. **Drag** to look round; **shift-drag** or right-drag moves the eye across and up;
   **alt-drag** moves it forward. The **wheel**, `+` and `−` widen or narrow the lens.
3. Keys: arrows walk, PgUp/PgDn go up and down, shift+arrows look, Q/E roll; S scene,
   B space, K greebles, P lens, D disc or full frame, O kind of thing, Y what it is made of,
   F how it is drawn, L light, H shadows, R new seed, `[` `]` seed, X cut guides, G guides.

## Settings

**The space** — kind; size across, along and up in modules; passages off it (doors, side
corridors and niches; bridges over the street; beams taken out of the lattice); pillars;
the lattice pitch; a floor under the void; the floor greebled, tiled or plain.

**Greebles** — blocks, panels, towers, ribs, mixed or plain; how far they stand out; the
smallest and the largest panel; the chance a panel is cut again; how many are left flat;
paper round a block; blocks on blocks; how many modules of a wall may make one panel.

**The eye** — where it stands (in % of the space; outside 0–100 it is in a passage or a
wall), turned, looking up, rolled, the farthest thing drawn.

**The lens** — the projection; field of view (across the diagonal, the long or the short
side of a filled picture, across a disc, across the width of a cylinder); the hyperbolic
mirror's ξ; how hard the discs crowd their rim; Pannini's distance; an anamorphic stretch;
a swirl turning the picture more the further from the middle; a bulge; the middle of the
lens moved; a filled picture or a disc, a line round it.

**Floating things** — how many, which kind, made of what, laid out how (cluster, scatter,
ring, column, line, spiral) round which middle and how far apart, their size and how much it
varies, how they are turned; plate gap and thickness, flying apart, frame width, how deep
a panel is sunk, strut and knot sizes, a smaller one inside; drawn as outline, black,
black with paper edges, or shaded; trails — streaks behind them as if they flew, how many,
which way, how broken.

**Light and shadow** — none, sun, lamp, eye; where the sun is or where the lamp hangs and
how far it reaches; shadows; ambient; contrast; which surfaces are hatched; hatch spacing at
the darkest, the way it runs, where it crosses, the lightest tone still hatched.

**Lines** — the hall's edges on or off, the shortest piece, how close curves follow, solid
pass spacing.

**Pens** — black and red rapidographs, 0.25 / 0.35 / 0.5 / 1.0 mm; by default everything is
black 0.35. Edges of the halls, the floating things, shading, solid black, trails and the
line round the picture each pick a pen.

**Paper** — size, orientation, margin, paper tone (preview only), cut guide dots on the
sheet or round the picture, plotted first, each in a numbered SVG group of its own so vpype
keeps them first.

**Output** — SVG of everything, one per pen, one per layer; PNG; the link (the URL hash is
the whole sheet).
