# Module towers

A pen-plotter generator of towers stacked out of machinery floors, drawn in exact hidden
lines.

A building is one or more towers, on a podium and a stepped plinth or straight on the
ground, joined by bridges. A tower is a pile of floors, and each floor is one kind of thing:
dense **machinery** cut into cabinets, rows of tall **racks** round a slab, a **ribbed**
sleeve of thin plates wrapped round a core, a hollow **frame** like a piece of square duct,
an open **deck** on columns, a tangle of **pipework**, a **lattice** cage of bars with
stepped diagonals, **tanks** standing or lying on a slab, a barrel **vault** of arched
ribs, a factory **hall** with a travelling crane over bays of machines (motors driving
flywheels, gearboxes and pumps, presses, compressors, gear trains, lathes), a **boiler
house** with its drums, steam main and chimney, or a row of **silos** over hoppers with a
gallery and a bucket elevator. Chimneys and cooling towers stand round the towers,
conveyors climb in steps into their floors, gears and belt-driven pulleys turn on the walls,
and the pipes have valves with handwheels. A floor's plan may be an L, a U, a T, a cross, a ring round a courtyard, or two
blocks with a bridge between them. Floors step back into terraces, slide out on braces, lean,
wind round a circle, grow wings with pods on their ends, and a core runs up through them.

Everything is built of upright boxes on a quarter-unit grid: slabs, beams, plates, posts,
pipes with flanges, panels, vents, ladders, stairs, trays, masts and cranes. Round things
(tanks, domes, arches) and diagonals (braces, trusses) are boxes too, turned in steps, so
they come out faceted and jagged. The drawing is the edges of those boxes in a parallel
projection.

## How the lines are found

Nothing is sampled. In a parallel projection a point P is hidden by a box when P + s·c lies
inside it for some s > 0 (c points at the eye). Along an edge that is a few linear
inequalities in two unknowns, so each edge is cut exactly where a box in front of it begins
and stops covering it.

- The boxes of one element (the bars of a frame, the legs of a plate, the runs of a pipe)
  are drawn as **one solid**. A line between two of them is drawn only where the surface
  really turns, so a pipe elbow or the corner of a duct has no seam.
- Where two elements **pass through each other** (a pipe through a slab, a crossbar through
  a mast), the line where they meet is drawn too.
- Edges that fall on the same line on the paper are **merged** and drawn once, however many
  boxes share them.

## Running it

No build step and no install. p5.js is bundled in `libraries/`. Open `index.html` in a
browser; everything works from `file://`.

## Using it

1. Pick a **Scene**: two towers on a podium, the plain stack, an arcology, leaning on its
   braces, a winding tower, a ziggurat, courtyards, every plan there is, a tank farm, on
   stilts, cranes over the site, a factory floor, a boiler house, gearworks, silos and
   conveyors, a power station, hangars, wings and pods, twin bridges, to scale, and the
   older ones (ribbed sleeves, server stacks, a needle, red pipework, the shading scenes…).
   Or set it up in the panel.
2. **Drag** on the sheet to turn the camera (in isometric the first drag switches to
   axonometric). **Shift-drag** or a right-drag moves the drawing, the **wheel** zooms about
   the cursor, <kbd>0</kbd> puts it back. The arrow keys move the drawing by 1 mm, or 10 with
   <kbd>shift</kbd>; <kbd>+</kbd> <kbd>−</kbd> zoom.
   <kbd>S</kbd> scene, <kbd>P</kbd> projection, <kbd>Q</kbd> <kbd>E</kbd> turn (by quarters in
   isometric), <kbd>F</kbd> / <kbd>shift-F</kbd> floors, <kbd>T</kbd> towers, <kbd>O</kbd> turn
   every other floor, <kbd>C</kbd> core, <kbd>L</kbd> layout, <kbd>V</kbd> footprints,
   <kbd>U</kbd> roof, <kbd>M</kbd> size on the paper, <kbd>W</kbd> fin wrap, <kbd>A</kbd> accent, <kbd>J</kbd> <kbd>H</kbd>
   <kbd>K</kbd> shade the left, right and top faces, <kbd>X</kbd> cut guides, <kbd>G</kbd>
   guides, <kbd>R</kbd> a new seed, <kbd>[</kbd> <kbd>]</kbd> step it.
3. **Download SVG [everything]** writes the sheet with a group per pen. **[one per pen]**
   writes a file per pen, and a button per layer writes that layer alone. **Download PNG**
   saves the preview. **Copy link** copies every setting as a URL.

Paper is A0–A5 or B0–B5, either way round, or **custom**. It starts as A3 upright. The
drawing is fitted inside the **Margin**, and whatever zoom or pan pushes past the margin is
cut off there, in the files too.

## The parameters

Sizes are in **units** of the grid; 0.25 of a unit is the step everything snaps to. The
stats give the building's width, depth and height in units and in millimetres, and the
drawing's size on the paper.

### The building on the paper

**Size**: **fit the picture** (as big as the margin allows), **mm per unit** (a fixed
scale, so a wider tower draws wider and two sheets match), **height in mm** or **width in
mm** of the whole drawing. **Stands**: in the middle of the picture, on its bottom edge, or
hung from the top. Zoom and pan still apply on top of it; whatever comes out bigger than
the picture is cut at the margin, and the stats say so.

### The towers

- **Towers**, standing in a **row**, **staggered**, a **grid**, a **ring** or
  **scatter**ed, **Between the towers**. **Towers shorter by up to** (the first is the
  tallest) and **Towers differ in size**.
- **Height by**: a number of **Floors**, or a **Total height** the floors are fitted into.
- **Width**, **Depth**, **Floor height**. **Heights differ** and **Sizes differ** vary
  each floor.
- **Floors stand off**: how far a floor may sit to the side of the one below it.
- **Taper**: how much narrower the top floor is.
- **Air between floors**: 0 stacks them tight; more pulls the tower apart, with **Posts
  across a gap**.
- **Every other floor turned a quarter**, **On the roof** (machinery, masts, a slab, tanks,
  a stepped dome, a crane, chimneys, nothing, or **mixed**: one of them for each tower), **Masts**,
  **Cranes**.

### Massing

- **Podium floors** under all the towers together, **Podium floor height**, how far the
  podium **stands out** round the towers, and how far each podium floor **steps in**.
- **Plinth steps**: thin slabs under everything, each wider than the one above, by **Plinth
  step**, **Plinth step height** each.
- **Towers lifted** off the ground or the podium, carried by the core or, without one, by
  legs at the corners.
- **Crown floors** and **Crown width**: the top floors sized on their own, wider than the
  tower (over 100 %) or narrower.
- **Terraces**: a floor now and then steps back from one side by **Terrace depth**, and so
  does every floor above it.
- **Slid out**: floors pushed out past the one under them, by **Slid out by**, with stepped
  braces from the tip down to the lower floor.
- **Lean** (units a floor) **towards** an angle, and **Wind round**: the floors walk round a
  circle, **Wind a floor** degrees each.
- **Footprints**: rectangle, L, U, T, cross, courtyard, split (two blocks with a bridge), or
  mixed. **Floors shaped** is how many of them, **Cut in by** how deep the notch is.
- **Wings**: an arm standing out of a floor, banded, by **Wing reach**, **Wing arm** thick,
  with a pod on its end: a cabinet, a tank or a small cage.
- **Core**: solid, banded or a lattice of bars, up the middle of every tower, in a piece
  under each floor so it follows a leaning tower in steps, and on above the roof by **Core
  above the roof**. It shows in the gaps between the floors and in courtyards.
- **Bridges** between two neighbouring towers where two of their floors face each other:
  a **truss**, a **tube** with windows, a **deck** with a railing, or mixed; **Bridge
  width**, **Bridge height**.
- **Braced**: gaps between floors and legs crossed by stepped diagonals.

### Floors

How often each kind comes up, as shares (0 = never): **Machinery**, **Racks**,
**Ribbed**, **Frame**, **Deck**, **Pipework**, **Lattice**, **Tanks**, **Vault**, **Factory
hall**, **Boiler house**, **Silos**.

### Factory

- **Stacks round the towers**: on the podium or the ground beside a tower, **chimney**s
  (a base, a shaft narrowing in three lengths, bands, a cap), **cooling tower**s (a waisted
  shell of drums on a ring of legs), or mixed. **Stack height** is a share of the tallest
  tower; **Chimney radius** sets these, the boiler-house chimneys and the ones on roofs.
- **Conveyors**: belts in steps from the ground or the podium up into a floor, on posts,
  with a drum and a hopper at the foot and loads riding them.
- **Gears on the walls**: floors with a train of meshing gears, or two pulleys and a belt,
  standing out of a face on stub axles. **Gear size**, **Tooth** (how big the teeth are and
  how far apart).
- **Valves**: pipe runs with a valve body, a stem and a handwheel.
- **Halls with a crane**: factory halls with a travelling crane: rails on columns, a
  girder, a trolley and a hook.

### Lattice, tanks, vaults

**Lattice cell** and **Bar size** (of the lattice floors and the lattice core), **Panels
braced**. **Tank radius**, **Tank roundness** (how many steps a quarter of the round is made
of: 1 is a square, 6 almost a circle), **Domes on tanks**. **Between two ribs** of a vault;
the ribs are as thick as the fins' plates and as deep as their depth.

### Slabs and frames

**Floors on a slab** (%), **Slab thickness**, **Slabs stand out up to**. **Frame walls**:
the duct's thickness. **Frames with rings**: bar rings round the duct. **Frame walls with
windows**: a wall cut into posts so the inside shows. **Hollow frames among the cabinets**:
upright rings in place of some cabinets. **Floors with beams round** and **Beam size**: a
ring of square beams round the foot of a floor, sometimes round its head as well. **Post
size**.

### Racks

**Sides with a row**, **Rack depth**, **Rack width**, **Between two racks**, **Heights
differ**, **Cut in two**: racks made of two cabinets, one on top of the other.

### Fins

**Wrapped**: each plate of a sleeve goes **over** the floor (down both sides and across the
top), **under** it, **ring** all round, round one **side**, round a **corner**, or stands
out of one face as **blades**. **mixed** picks one for every sleeve. Also **Plate
thickness**, **Between two plates**, **Plate depth** (how far the plates stand off the
floor), **Sleeve covers** (% of the floor's length), and **Sleeves step aside**: halfway
along, the rest of the plates move over, so the sleeve has a step in it.

### Machinery

The floor is cut like a k-d tree into cells about **Cell size** across, and most cells hold
a cabinet (**Cells with a cabinet**). Each cabinet is set back from its cell's edges by up to
**Set back up to** and has its own height. **Stacked levels**: how many times smaller
cabinets are stacked on top. Also **Bits on the tops**, **Panels** (shallow panels standing
out of the sides) and **Vents** (rows of slats).

### Pipes and the rest

**Pipe runs a floor**: each run stays in one upright plane, along a face, just outside it,
or through the middle, and turns between level and upright. **Pipe size**, **Pipes side by
side up to**, **Flanges**. **Risers**: pipes up the outside of the tower, past several
floors. **Ladders**, **Trays** (shelves standing out of a face with things on them), **Stairs**
(two flights up the outside of a floor, turning on a landing).

### Camera

**Projection**: **isometric** (turns by quarters), **axonometric** (any **Turned** and
**Looking down**), or **military** (the plan true, heights upright, scaled by **Heights**).
**Zoom**, **Moved across**, **Moved down**.

### Ink

- **Accent**: what goes in the accent pen (red by default): the pipes, the fins, the
  frames, the racks, the small details, the trusses (lattice, cranes, truss bridges), the
  tanks, the bridges, the core, the wings, the chimneys and cooling towers, the gears and
  pulleys, the conveyors, one floor, every other floor, or random parts
  (**Parts in the accent**).
- **Small parts under**: elements smaller than this on the paper go in the fine pen.
- **Faces to the left**, **to the right**, **on top**: sparse, hatch, dense, cross, or
  **solid**. Solid follows the fill rule: half a nib inside the face, an outline, passes no
  more than 85 % of the nib apart, and one line where the face is narrower than the nib.
  **Hatching apart** (mm on the paper), **Hatching runs** (along the height, across,
  diagonal), **Shade** (which parts get it).
- **Passes apart**, **Pen kept down over**.

### Pens

Five pens of the drawer: black and red rapidographs at 0.25, 0.35, 0.5 and 1.0 mm. By
default: edges black 0.35, accent red 0.35, small parts and hatching black 0.25, solid
faces black 1.0. Red is plotted before black.

### Paper

Size, orientation, margin, the paper tone (for the preview only), a border, and the **cut
guide dots** (on by default): a dot in every corner of the sheet or of the picture, each
side split evenly so no gap is wider than **Most between two dots**. They are one touch of
the pen that goes down first, a layer of their own, and they are plotted once.

## After

`../vpype-process.sh <file.svg>` sorts and merges the lines into `output.svg` for plotly.
