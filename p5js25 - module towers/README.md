# Module towers

A pen-plotter generator of towers stacked out of machinery floors, drawn in exact hidden
lines.

A tower is a pile of floors, and each floor is one kind of thing: dense **machinery** cut
into cabinets, rows of tall **racks** round a slab, a **ribbed** sleeve of thin plates
wrapped round a core, a hollow **frame** like a piece of square duct, an open **deck** on
columns, or a tangle of **pipework**. Everything is built of upright boxes on a quarter-unit
grid: slabs, beams, plates, posts, pipes with flanges, panels, vents, ladders, trays, masts.
The drawing is the edges of those boxes in a parallel projection.

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

1. Pick a **Scene**: machine tower, ribbed sleeves, server stacks, exploded on columns, a
   low wide block, a needle, three towers, red pipework, hatched by the light, solid
   shadows, blades and grilles, hollow frames, one red floor, plan oblique, or a fine pen
   for the small parts. Or set it up in the panel.
2. **Drag** on the sheet to turn the camera (in isometric the first drag switches to
   axonometric). **Shift-drag** or a right-drag moves the drawing, the **wheel** zooms about
   the cursor, <kbd>0</kbd> puts it back. The arrow keys move the drawing by 1 mm, or 10 with
   <kbd>shift</kbd>; <kbd>+</kbd> <kbd>−</kbd> zoom.
   <kbd>S</kbd> scene, <kbd>P</kbd> projection, <kbd>Q</kbd> <kbd>E</kbd> turn (by quarters in
   isometric), <kbd>F</kbd> / <kbd>shift-F</kbd> floors, <kbd>T</kbd> towers, <kbd>O</kbd> turn
   every other floor, <kbd>W</kbd> fin wrap, <kbd>A</kbd> accent, <kbd>J</kbd> <kbd>H</kbd>
   <kbd>K</kbd> shade the left, right and top faces, <kbd>X</kbd> cut guides, <kbd>G</kbd>
   guides, <kbd>R</kbd> a new seed, <kbd>[</kbd> <kbd>]</kbd> step it.
3. **Download SVG [everything]** writes the sheet with a group per pen. **[one per pen]**
   writes a file per pen, and a button per layer writes that layer alone. **Download PNG**
   saves the preview. **Copy link** copies every setting as a URL.

Paper is A0–A5 or B0–B5, either way round, or **custom**. It starts as A3 upright. The
drawing is fitted inside the **Margin**, and whatever zoom or pan pushes past the margin is
cut off there, in the files too.

## The parameters

Sizes are in **units** of the grid. The tower is fitted to the picture, so only how the
sizes compare matters. The stats say how many millimetres a unit came out.

### The tower

- **Towers** side by side, each built from its own seed, **Between the towers**.
- **Floors**, **Width**, **Depth**, **Floor height**. **Heights differ** and **Sizes
  differ** vary each floor.
- **Floors stand off**: how far a floor may sit to the side of the one below it.
- **Taper**: how much narrower the top floor is.
- **Air between floors**: 0 stacks them tight; more pulls the tower apart, with **Posts
  across a gap**.
- **Every other floor turned a quarter**, **On the roof** (machinery, masts, a slab, or
  nothing), **Masts**.

### Floors

How often each kind comes up, as shares (0 = never): **Machinery**, **Racks**,
**Ribbed**, **Frame**, **Deck**, **Pipework**.

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
floors. **Ladders**, **Trays** (shelves standing out of a face with things on them).

### Camera

**Projection**: **isometric** (turns by quarters), **axonometric** (any **Turned** and
**Looking down**), or **military** (the plan true, heights upright, scaled by **Heights**).
**Zoom**, **Moved across**, **Moved down**.

### Ink

- **Accent**: what goes in the accent pen (red by default): the pipes, the fins, the
  frames, the racks, the small details, one floor, every other floor, or random parts
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
