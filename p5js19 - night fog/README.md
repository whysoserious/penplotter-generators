# Night fog

A pen-plotter generator of views by a ring road on a foggy night, in one black pen: an
embankment topped by a noise barrier of panels and posts, street lamps on tall poles whose
light hangs in the fog as halos and wedges, a row of them going off into the distance, bare
saplings, a lone tree and weeds black against the glow, a dark field with patches of snow,
stairs climbing a grassy mound to a lit door in the wall, a road curving away between guard
rails, wet under the lamps. It started from photographs of exactly that.

Each view is first painted as a picture in greys, then turned into lines: line dither,
squiggles, crosshatching, stipple or the contours of the light, with the edges of things
drawn over it. Black ink on white paper draws the dark; turned round, white ink on black
paper draws the light. A photograph from disk can stand in for the painted picture.

## Running it

No build step and no install — p5.js is bundled in `libraries/`.

**Straight from disk:** open `index.html` in a browser. Everything works from `file://`.

**Through a local server** (for the *Copy link* button in a strict browser): from the
repository root run `python3 -m http.server 8000` and open
<http://localhost:8000/p5js19%20-%20night%20fog/>.

## Using it

1. Pick a **View** — lamps over the embankment, a tree in the fog, one lamp over the wall,
   stairs to a door, a curve under the lamps, and versions in the other techniques — or set
   the scene up in the panel. Each section folds away under its heading.
2. **Drag** on the sheet: up and down moves the horizon and the embankment, sideways slides
   the lamps along it. **Shift-drag** (or a right-drag) moves the trees. The **wheel**
   thickens or thins the fog. <kbd>S</kbd> steps through the views, <kbd>T</kbd> through the
   techniques, <kbd>V</kbd> through the previews (the plot, the grey picture, both),
   <kbd>I</kbd> turns to drawing the light, <kbd>R</kbd> rolls a seed, <kbd>[</kbd>
   <kbd>]</kbd> step it, <kbd>G</kbd> shows the horizon and the lamps.
3. **Download SVG [everything]** writes the sheet, a group per pen; **[one per pen]** a file
   per pass; a button per layer writes the tone, the edges or the border alone.
   **Download PNG** saves the preview. **Copy link** puts every setting in the clipboard as a
   URL — all but a loaded photograph, which has to be loaded again.

The paper is any of A0–A5 and B0–B5, either way round, or **custom**; the **Picture** is cut
to 4:3, 3:2, 16:9, 2:1, 1:1, 3:4 or the whole room inside the margin, with a line round it
if asked. Everything is in millimetres, and the SVG is the sheet at 1:1.

## How it is made

### The picture

The scene is laid out in the picture's own millimetres and painted on a raster **Picture
resolution** pixels to the millimetre, in greys. It goes on in the order light reaches the
eye through fog:

1. **The sky and the light.** The sky darkens upward from a band of fog at the **Horizon**
   (**Fog at the horizon**, **Band of fog**, **Sky at the top**), mottled by **Clouds in
   the fog**. Every lamp adds its light on top: a wide soft glow, a **Halo** and a core,
   and **Beams** — wedges of light hanging in the fog, to the left, the right, both or
   down. Then all of it is blurred by **Haze**, because that is what fog does to light.
2. **The solid things, pixel by pixel.** The wall, the slope below it, the **Lit strip** at
   its foot, the field from **Far** to **Near**, the **Snow** in patches that grow towards
   you. Each pixel of a solid thing is its own grey mixed with the light already there by
   how deep in the fog it stands: fog = 1 − e^(−4·density·depth), with **Fog** the density
   and **Into the fog** the depth. So far things melt into the glow behind them.
3. **The thin things.** The wall's posts and rails, the poles of the lamps (they stand on
   the road behind the wall, so only what rises above it shows), the door and the stairs,
   the road with its guard rails and the lamps in its wet surface, the trees, the weeds,
   the grass — each as opaque as it is near.
4. **The lamps themselves**, sharp, on top.

**The embankment** runs across the picture, its road on top from **left** to **right**.
When **Going away** makes its far end smaller, a point a fraction u of the way along it
lands where perspective puts it: screen positions blend weighted by depth,
x(u) = (x₀z₀(1−u) + x₁z₁u) / (z₀(1−u) + z₁u), and its scale is 1/z(u). So posts and lamps
spaced evenly along it crowd together towards the far end. **A farther row** of lamps —
glows with no poles, the other side of the road — sits **below the near row** and dimmer.

**Trees** are saplings — a leader rising nearly straight, shoots angled up along it — or
bare trees, a trunk forking again and again, each fork shorter, thinner and leaning back
towards the vertical. **Weeds** are stalks bending over with a seed pod hanging off the tip.

**The road** lies on the ground in front of a camera one unit high: a point X across and Z
ahead is at x = w/2 + f·X/Z, y = horizon + f/Z, the road bending away by **Curve** as it
goes, its surface fading into the fog, the lamps smeared down it by **Wet**.

**Stairs and a door**: a door with lit **Panes** in the wall, stairs widening a little as
they come down the mound, and a **handrail** on posts.

**Picture from: photo** skips all of that and takes any picture from disk, cover-fitted to
the frame and turned to grey.

### From light to ink

The picture's light goes through **Gamma**, **Contrast** and **Brightness**, and what comes
out is the ink wanted — the darkness, or with **Draw the light** the light itself. Anything
below **Left bare under** gets no ink at all, so the halos stay clean paper. A little
**Grain** gives the dither something to break on.

- **line dither** — parallel lines **Closest lines** apart at **Angle**, and every line has
  a threshold of its own: the bits of its number reversed, so over **Levels** lines the
  thresholds come in as 0, ½, ¼, ¾, ⅛… and any stretch of lines is evenly spread. A line
  is drawn wherever the picture wants more ink than its threshold, pinned exactly where it
  crosses, so the lines thin out evenly as the fog brightens. **Shortest dash** drops the
  crumbs; **Wobble** shakes the lines as a hand would.
- **squiggle** — a line every **Between squiggles**, waving as high as it is dark and the
  faster the darker, up to **Waves a mm**; the pen lifts where nothing is wanted.
- **crosshatch** — up to four **Directions**, each drawn where the dark passes its own
  step.
- **stipple** — dots thrown at random and kept as often as the ink wanted there, never
  closer than **Closest dots**.
- **contours** — the isophotes, lines of equal light: a ring round every lamp at every
  level. **Contours as well** lays them over any other technique.

### The edges of things

Branches, poles and arms, the wall's edges, posts and rails, the door and its panes, the
steps and the handrail, the road's edges and guard rails, weeds — drawn as lines over the
tone. A wide thing (a trunk, a near pole) is as many strokes side by side as the nib needs.
**Far things break into dashes**: the wall and the road, standing deep in the fog, are
dashed with gaps that grow with it, and past a point not drawn at all; trees, weeds and
poles are drawn whole. With **Draw the light** the edges — dark outlines — are better left
off.

## Pens

Black and white: two pens, which can be the same one — the tone, the edges and the border
each pick one. A black technical pen on white paper is the usual answer; for black paper,
a white marker with the lines spaced wider than it is.

## What ends up in the files

No fills and no background rectangle. `stroke-width` is each pen's own nib and the caps are
round. **everything** is one `<g>` per pen; a layer's file is the tone, the edges or the
border alone. Every file is the same sheet — the same `width`, `height` and `viewBox` in
millimetres. Strokes come out ordered greedily; `vpype-process.sh` is the usual next step.
Two comments ride at the top of every file: the settings in one line, and the URL that
rebuilds the sheet.

## Watching the cost

A default A4 view is about 2 000 strokes and 50 m of line, some 25 minutes at the plotter.
The dark is what costs: line dither at 0.5 mm draws a metre of line for every 5 cm² of
black. Crosshatching costs about three times as much; stipple costs pen lifts, a stroke a
dot. The stats warn when the lines are closer than the pen is wide — the dark would close up
solid.
