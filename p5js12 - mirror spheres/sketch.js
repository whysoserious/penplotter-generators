////////////////////////////////////////////////////////////////////////////////////////
// Mirror spheres — a room seen in a polished ball, drawn as lines
//
// Stand a chrome ball in a tiled room and look at it from across the room. Every point
// of the disc you see is a tiny mirror: the ray from your eye lands on the ball there,
// bounces off and brings back whatever it runs into. The disc is a map of every
// direction there is, as seen from the ball — and the whole of this sketch rests on the
// fact that the map can be written down in one line.
//
// Put the camera far out on +z, so that it looks straight down −z at every point of the
// ball. The point of the disc at (u, v) sits where the ball's normal is
// n = (u, v, √(1 − u² − v²)), and the ray that lands there leaves along d = 2·n_z·n − ẑ.
// Turned round, that says where anything in the room shows up: whatever lies along d
// from the ball is seen where the normal points halfway between d and the way back to
// the camera,
//
//     n = (d + ẑ) / |d + ẑ|          (u, v) = (n_x, n_y)
//
// No ray tracing and no search — one square root per point. The distance from the
// middle of the disc comes out as sin(θ/2), θ being the angle between d and the camera:
// the camera itself sits dead centre, the walls to either side of the ball at 0.71 of
// the radius, and everything behind the ball is pressed into the ring between there and
// the rim. The one direction straight away from the camera has no image at all. It *is*
// the rim, every point of it, which is why a mirror ball always has that dark, crowded
// edge.
//
// The room is taken to be large next to the ball, so everything in it is looked up by
// its direction from the ball's centre. That is exact for a small ball in a big room,
// and on paper it is what a mirror ball looks like.
//
// The room is made of straight lines and circles, and a straight line is the easy case
// twice over. Seen from the ball, the points of an infinite line fill exactly half a
// great circle, from the way it comes in to the way it goes out. So a line is walked by
// the angle it is seen at rather than by its length, which reaches its vanishing points
// in a finite number of steps: with A the point of it nearest the ball and D the way it
// runs,
//
//     direction(α) ∝ A·cos α + |A|·D·sin α        is the point |A|·tan α along it,
//
// and α = ±90° are the two vanishing points themselves.
//
// The mirror bends every one of those arcs, hard near the rim and hardly at all in the
// middle, so no fixed step suits them all. Each curve is walked by halving: a piece is
// split until the point halfway along it lies within a few hundredths of a millimetre of
// its chord. Where halving never brings the two ends together the curve has run through
// the one direction with no image — crossed from one side of the rim to the other — and
// it is broken there.
//
// Left alone, perspective is a disaster for a pen: every family of parallel lines runs
// into its vanishing point, the back of the room is pressed into the rim, and in both
// places hundreds of lines end up on top of one another. So each family thins itself
// out the way a mipmap does. Every line is measured against its neighbour, on paper, at
// every point it is drawn at — but not every line has the same neighbours. Line k counts
// as one of every 2^j, 2^j being the largest power of two that divides k, so the odd
// lines give out first, then every other one of those that are left, and so on. The
// density on paper stays between the gap asked for and twice that all the way to the
// horizon, and the lines that carry on branch like a tree.
//
// Not every pattern nests like that. A honeycomb has no coarser honeycomb inside it and
// a crater is only ever one crater, so the patterns made of pieces — hexagons, bricks,
// scales, arches, flagstones, craters — are measured instead by how large one piece of
// them comes out on paper where it lies, and fade out whole where it grows too small to
// draw. Only the part of a face that can still show them is laid with them at all.
//
// The camera is turned by dragging on the sheet and the ball raised and lowered with the
// wheel; everything else lives in the sidebar and in the URL, so a plot is reproduced by
// pasting its link.
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};

const SCENE_KINDS = ['room', 'open'];
const PATTERNS    = ['none', 'grid', 'stripes', 'diamonds', 'triangles', 'hexagons',
                     'bricks', 'scales', 'arches', 'cells', 'craters', 'rings', 'polygons',
                     'spiral', 'rays', 'whirl', 'posts', 'net'];
const UNSIZED     = ['none', 'rays', 'whirl', 'net'];   // patterns the tile does not scale
const SVG_OUTPUTS = ['one file', 'one file per pen', 'both'];

const MAX_PENS       = 3;
const INK_MARK       = -1;        // cut guides: drawn with every pen
const LOD_MAX        = 10;        // no line counts as rarer than one in every 2^10
const GAP_E          = 1e-3;      // of one spacing — how far off the neighbour is looked up
const TAN_DS         = 1e-6;      // of the curve's own parameter — the step its tangent is read over
const MAX_DEPTH      = 24;        // halvings one piece of a curve is allowed
const SEG_MAX        = 1.5;       // mm — no chord is left standing longer than this
const JUMP_MM        = 0.2;       // mm — a gap no halving can close is the curve crossing the rim
const CULL_OCT       = -1;        // a piece this many octaves under its gap at both ends is not refined
const NO_GATE        = 1e9;
const EDGE_EPS       = 1e-6;      // units — a grid line this close to the edge of a face is the edge
const MAX_CURVES     = 60_000;    // past this nothing is traced
const MAX_ELEMS      = 12_000;    // pieces a fading pattern may lay on one face
const MAX_MAPS       = 30e6;      // mirror lookups one update is allowed
const BUSY_MAPS      = 3e6;       // above this, dragging stops following live
const MAX_STROKES    = 400_000;   // past this nothing is ordered, drawn or exported
const BUSY_STROKES   = 80_000;    // above this, warn about the plot time
const EPS            = 0.01;      // mm — the stub that stands in for a single dot
const PREVIEW_MAX_PX = 1500;      // preview canvas resolution (paper is in mm)
const MAX_PREVIEW_W  = 900;       // on-screen size of that canvas
const MAX_PREVIEW_H  = 700;
const LIVE_BUDGET_MS = 150;       // slower than this and a drag waits for the release
const DRAG_DEG       = 180;       // how far the room turns for a drag across the whole ball
const WHEEL_STEP     = 0.0015;    // ball height per wheel delta unit, as a share of the room's
const PEN_CYCLE_S    = 0.3;       // rough pen-up + pen-down time, seconds
const DRAW_SPEED     = 60;        // rough drawing speed, mm/s
const TRAVEL_SPEED   = 150;       // rough pen-up travel speed, mm/s

const settings = {
  // paper + pen
  paper: 'A4',
  orientation: 'portrait',
  margin: 15,
  penWidth: 0.2,

  // cut guides — dots on the edge of the sheet, for trimming an oversized plot back
  cropMarks: false,
  cropMarkGap: 400,     // mm — the most that is ever left between two marks

  // the ball, as it sits on the sheet
  ballR: 0,             // mm — 0 makes it as large as the drawable box allows
  rim: true,            // the outline of the ball, drawn as a circle of its own
  rimGap: 0,            // mm the reflection stops short of the rim

  // the camera — far away, so it sees every point of the ball straight on
  yaw: 38,              // deg the room is turned about the vertical through the ball
  pitch: 18,            // deg the camera stands above the ball's equator

  // the room — in any unit you like, only the ratios matter
  scene: 'room',
  roomW: 10,
  roomD: 10,
  roomH: 4,             // the ceiling, or the sky when the floor is open
  reach: 150,           // how far the open floor runs
  ballH: 1.1,           // the centre of the ball above the floor
  ballX: 50,            // % — where in the room the ball stands, across
  ballZ: 50,            // % — and deep

  // what the surfaces are laid with
  floor: 'grid',
  ceiling: 'grid',
  walls: 'grid',
  floorScale: 1,        // × tile — how large each surface's pattern is laid
  ceilingScale: 1,
  wallScale: 1,
  tile: 0.25,           // units — one tile, one ring, one stripe
  rays: 96,             // how many a `rays` or `whirl` surface fans out into
  twist: 1.2,           // how hard a `whirl` bends its rays: radians per e-fold outwards
  sides: 8,             // of every ring of `polygons`
  postH: 0.6,           // units — how far a `posts` post stands off its surface
  seed: 1,              // which flagstones, which craters
  edges: true,          // the corners of the room, as lines of their own
  horizon: true,        // the horizon itself, when the floor is open

  // the far away
  minGap: 0.6,          // mm — lines of one family never close up tighter; 0 lets them
  sag: 0.03,            // mm — how far a chord may cut the corner of the curve it stands for

  // pens
  pens: 1,
  floorPen: 1,
  ceilingPen: 1,
  wallPen: 1,
  edgePen: 1,
  rimPen: 1,
  ink0: '#000000',
  ink1: '#b23a00',
  ink2: '#1a6dd1',

  // output
  simplifyTol: 0.02,    // mm — how far a thinned stroke may stray from the traced one
  optimiseOrder: true,
  liveUpdate: true,
  showGuides: true,
  svgOutput: 'one file',
};

const DEFAULTS = { ...settings };

// A handful of sheets worth starting from. Each one is the whole state, so a scene is
// also the shortest way to see what one part of the sidebar is for.
const SCENES = [
  { label: '— select scene —' },
  { label: 'Tiled room', s: {} },
  { label: 'Open floor under a sky of rings', s: {
      scene: 'open', ceiling: 'rings', roomH: 8, ballH: 1, tile: 1, yaw: 0, pitch: 4 } },
  { label: 'Looking down on it', s: {
      pitch: 58, yaw: 15, floor: 'rings', walls: 'stripes', ceiling: 'rays', tile: 0.4 } },
  { label: 'Sunburst hall', s: {
      floor: 'rays', ceiling: 'rays', walls: 'stripes', rays: 128, yaw: 0, pitch: 0,
      roomW: 14, roomD: 14, roomH: 6, ballH: 2, tile: 0.5 } },
  { label: 'Corridor', s: {
      roomW: 3, roomD: 40, roomH: 3, ballH: 1.5, yaw: 0, pitch: 0 } },
  { label: 'Planet', s: {
      scene: 'open', floor: 'rings', ceiling: 'rays', rays: 128, tile: 0.15, ballH: 1,
      roomH: 6, yaw: 0 } },
  { label: 'Moon', s: {
      floor: 'craters', ceiling: 'craters', walls: 'cells',
      floorScale: 2, ceilingScale: 2, wallScale: 2 } },
  { label: 'Geodesic net', s: {
      floor: 'net', ceiling: 'net', walls: 'net', edges: false } },
  { label: 'Forest of posts', s: {
      scene: 'open', floor: 'posts', floorScale: 2, postH: 0.9, ceiling: 'none',
      ballH: 1.2, yaw: 0, pitch: 0 } },
  { label: 'Cloister', s: {
      roomW: 12, roomD: 12, roomH: 6, ballH: 1.5, walls: 'arches', wallScale: 2,
      floor: 'polygons', floorScale: 2, ceiling: 'polygons', ceilingScale: 2,
      yaw: 0, pitch: 0 } },
  { label: 'Rotunda from above', s: {
      roomW: 8, roomD: 8, roomH: 8, ballH: 4, floor: 'polygons', ceiling: 'polygons',
      walls: 'arches', sides: 6, floorScale: 2, ceilingScale: 2, wallScale: 1.5,
      yaw: 0, pitch: 60 } },
  { label: 'Honeycomb', s: {
      floor: 'hexagons', ceiling: 'hexagons', walls: 'hexagons',
      floorScale: 1.5, ceilingScale: 1.5, wallScale: 1.5 } },
  { label: 'Whirlpool', s: {
      scene: 'open', floor: 'whirl', ceiling: 'whirl', rays: 96, twist: 1.2, roomH: 6,
      yaw: 0, pitch: 8 } },
  { label: 'Flagstones and bricks', s: {
      floor: 'cells', floorScale: 2, walls: 'bricks', ceiling: 'diamonds', ceilingScale: 2 } },
  { label: 'Fish scales', s: {
      floor: 'scales', walls: 'scales', ceiling: 'spiral', floorScale: 1.5, wallScale: 1.5 } },
  { label: 'Everything, piled up', s: { minGap: 0 } },
  { label: 'Two pens', s: { pens: 2, wallPen: 2, edgePen: 2 } },
];

const setters   = {};        // settings key -> function that moves its control
const fieldDivs = {};        // settings key -> the .field wrapper, for showing/hiding
let statsDiv, linkDiv, penListDiv;

let area    = null;          // { x0, y0, x1, y1, w, h } — the drawable box, in mm
let ball    = null;          // { x, y, r } — the ball on the sheet, in mm
let shapes  = null;          // { pts, off, ink } — polylines in mm
let strokes = 0;             // how many of them, even when there are too many to draw
let plan    = null;          // { order, flip, ink, travel }
let perPen  = null;          // per pen: { strokes, ink }
let lastMs  = 0;
let lastCurves = 0;          // how many curves the room asks for, before any are traced
let curves  = 0;             // how many were traced
let truncated = false;       // the lookup budget ran out before the room was finished
let drag    = null;          // while the mouse is down: where it went down, and from what

////////////////////////////////////////////////////////////////////////////////////////
// Small change

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function parseNum(str) {
  const v = Number(String(str).replace(',', '.').trim());
  return Number.isFinite(v) ? v : null;
}

function groupNum(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function wrapDeg(a) { return ((a + 180) % 360 + 360) % 360 - 180; }

function timestamp() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`;
}

function formatDuration(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return '—';
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  if (m) return `${m} min`;
  return `${Math.round(sec)} s`;
}

////////////////////////////////////////////////////////////////////////////////////////
// The URL is the document
//
// Every setting that differs from its default is written into the hash, debounced, with
// replaceState so the back button stays usable. Opening that link anywhere rebuilds the
// same sheet.

let urlTimer = null;
let urlWritten = '';

function encodeState() {
  const parts = [];
  for (const k of Object.keys(DEFAULTS)) {
    const v = settings[k], d = DEFAULTS[k];
    if (v === d) continue;
    const raw = typeof d === 'boolean' ? (v ? '1' : '0') : String(v);
    parts.push(`${k}=${encodeURIComponent(raw)}`);
  }
  return parts.join('&');
}

function applyState(str) {
  const q = new URLSearchParams(str);
  for (const [k, raw] of q) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULTS, k)) continue;
    const d = DEFAULTS[k];
    let v;
    if (typeof d === 'number') {
      v = parseNum(raw);
      if (v === null) continue;
    } else if (typeof d === 'boolean') {
      v = raw === '1' || raw === 'true';
    } else {
      v = raw;
    }
    settings[k] = v;
  }
}

function syncUrl() {
  if (urlTimer) clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    urlTimer = null;
    urlWritten = encodeState();
    const b = location.pathname + location.search;
    history.replaceState(null, '', urlWritten ? b + '#' + urlWritten : b);
    if (linkDiv) linkDiv.html(location.href);
  }, 250);
}

function refreshControls() {
  for (const k in setters) if (k in settings) setters[k](settings[k]);
  syncVisibility();
}

function onHashChange() {
  const h = location.hash.replace(/^#/, '');
  if (h === urlWritten) return;                    // our own write coming back
  Object.assign(settings, DEFAULTS);
  applyState(h);
  urlWritten = h;
  refreshControls();
  resizeForPaper();
}

////////////////////////////////////////////////////////////////////////////////////////
// Geometry

function paperDims() {
  const [a, b] = PAPER_SIZES[settings.paper];
  return settings.orientation === 'portrait' ? [a, b] : [b, a];
}

// The pen is round, so ink reaches half a pen width past the end of every line: the
// drawable box is the sheet less the margin less that half width.
function drawArea() {
  const [W, H] = paperDims();
  const m = settings.margin + settings.penWidth / 2;
  return { x0: m, y0: m, x1: W - m, y1: H - m, w: W - 2 * m, h: H - 2 * m };
}

// The ball sits in the middle of the drawable box and, unless it is given a size, is as
// large as the box lets it be.
function ballOnPaper() {
  const r = settings.ballR > 0 ? settings.ballR : Math.min(area.w, area.h) / 2;
  return { x: area.x0 + area.w / 2, y: area.y0 + area.h / 2, r: Math.max(0, r) };
}

function previewScale() {
  const [w, h] = paperDims();
  return Math.min(PREVIEW_MAX_PX / w, PREVIEW_MAX_PX / h);
}

function canvasEl() {
  return document.querySelector('#canvas-container canvas');
}

////////////////////////////////////////////////////////////////////////////////////////

function setup() {
  applyState(location.hash.replace(/^#/, ''));
  urlWritten = encodeState();
  window.addEventListener('hashchange', onHashChange);
  area = drawArea();            // the sidebar is built before the first update

  const [w, h] = paperDims();
  const s = previewScale();
  createCanvas(Math.round(w * s), Math.round(h * s)).parent('canvas-container');
  applyCanvasDisplay();
  buildControls();
  attachPointer();
  attachKeys();
  update();
}

function applyCanvasDisplay() {
  const [pw, ph] = paperDims();
  const scale = Math.min(MAX_PREVIEW_W / pw, MAX_PREVIEW_H / ph);
  const c = canvasEl();
  if (c) {
    c.style.width  = pw * scale + 'px';
    c.style.height = ph * scale + 'px';
  }
}

function resizeForPaper() {
  const [w, h] = paperDims();
  const s = previewScale();
  resizeCanvas(Math.round(w * s), Math.round(h * s));
  applyCanvasDisplay();
  update();
}

function update() {
  const t0 = performance.now();
  area = drawArea();
  ball = area.w > 0 && area.h > 0 ? ballOnPaper() : null;
  strokes = 0;
  curves = maps = 0;
  truncated = false;
  shapes = plan = perPen = null;
  lastCurves = countCurves();

  if (ball && ball.r > 0 && lastCurves <= MAX_CURVES) {
    shapes = buildShapes();
    strokes = shapes.off.length - 1;
    // Past the limit nothing is ordered, drawn or exported — the stats say why.
    if (strokes > MAX_STROKES) { shapes = null; perPen = null; }
    else plan = orderShapes(shapes);
  }

  lastMs = performance.now() - t0;
  drawPreview();
  syncVisibility();
  updateStats();
  syncUrl();
}

// Called while a slider or the camera is being dragged. When a whole update cannot keep
// up, dragging simply waits for the mouse to come up.
function liveUpdate() {
  if (!settings.liveUpdate || lastMs > LIVE_BUDGET_MS) return false;
  update();
  return true;
}

// The wheel has no release to wait for, so a change it could not follow live is drawn
// once it has stopped turning.
let settleTimer = null;

function settle() {
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => { settleTimer = null; update(); }, 250);
}

////////////////////////////////////////////////////////////////////////////////////////
// The mirror
//
// The camera is turned first. Yaw spins the room about the vertical through the ball,
// pitch lifts the camera over the ball's equator, and the camera's three axes are the
// three rows below: x to the right of the sheet, y up it, z back towards the camera. A
// direction in the room is taken into them, and then looked up on the ball.

let M0 = 1, M1 = 0, M2 = 0, M3 = 0, M4 = 1, M5 = 0, M6 = 0, M7 = 0, M8 = 1;
let OX = 0, OY = 0, BR = 1;          // the ball on paper, mm
let PX = 0, PY = 0;                  // where the last lookup landed
let maps = 0;                        // lookups so far this update
const HD = new Float64Array(3);      // the direction being looked up

function computeCamera() {
  const ps = radians(settings.yaw), be = radians(clamp(settings.pitch, -89.9, 89.9));
  const sp = Math.sin(ps), cp = Math.cos(ps), sb = Math.sin(be), cb = Math.cos(be);
  M0 = cp;       M1 = 0;   M2 = -sp;
  M3 = -sb * sp; M4 = cb;  M5 = -sb * cp;
  M6 = cb * sp;  M7 = sb;  M8 = cb * cp;
}

// Where on the sheet the direction in HD is seen — the length of HD does not matter.
// False for the one direction that has no single image: straight away from the camera,
// which the ball spreads round the whole of its rim.
function toPaper() {
  const x = HD[0], y = HD[1], z = HD[2];
  const cx = M0 * x + M1 * y + M2 * z;
  const cy = M3 * x + M4 * y + M5 * z;
  const cz = M6 * x + M7 * y + M8 * z;
  const q = cx * cx + cy * cy;
  const l = Math.sqrt(q + cz * cz);
  // l + cz, written so that it keeps its digits right up against the rim, where the two
  // all but cancel
  const w = cz >= 0 ? l + cz : q / (l - cz);
  if (!(w > 0)) return false;
  const k = BR / Math.sqrt(2 * l * w);
  PX = OX + k * cx;
  PY = OY - k * cy;
  maps++;
  return true;
}

////////////////////////////////////////////////////////////////////////////////////////
// Curves
//
// Everything drawn is a curve with a direction for every value of its own parameter s.
// `curveAt(c, s, e)` writes that direction into HD — and, for e other than 0, the
// direction of the same point on the curve e spacings over in its family, which is how
// the gap between two neighbours is measured on paper. HW is the weight the direction
// was written with: the point itself is HD / HW, so a step along the surface can be
// added to it.
//
//   0  a straight line, walked by angle   (A + e·N)·cos s + p·D·sin s
//   1  a ray fanning out of a foot point  F·cos s + p·D(θ(s) + e·dθ)·sin s
//   2  a circle or a spiral on a plane    C + (r + g·s + e·dr)·(cos s·U + sin s·V)
//   3  a great circle                     cos s·U + sin s·V
//   4  a polyline laid on a face          F + u(s)·U + v(s)·V, straight between points
//
// A is the point of the line nearest the ball, p its distance and N the step across to
// the next line of the family; the neighbour is looked up at the same distance along
// its own line, which is what makes the two points face one another across the gap. A
// ray may be bent — θ turns by `tw` for every e-fold it runs further out — and the
// neighbour of a polyline is the same polyline moved by N, or grown about the foot of
// its face by nk for every step.
//
// A curve that is one of a lattice of copies of itself — su along U, sv along V — is
// measured against the two copies next to it instead, square to its own tangent, by
// whichever of them stands the further off: a copy that only slides along it on paper
// is lined up behind it, not crowding it.

const C = {
  t: 0, ax: 0, ay: 0, az: 0, dx: 0, dy: 0, dz: 0, nx: 0, ny: 0, nz: 0,
  ux: 0, uy: 0, uz: 0, vx: 0, vy: 0, vz: 0,
  p: 1, r: 0, g: 0, dr: 0, th: 0, dth: 0, tw: 0,
  pu: null, pv: null, pn: 0,
  nm: 0, nk: 0, sux: 0, suy: 0, suz: 0, svx: 0, svy: 0, svz: 0,
  s0: 0, s1: 1, n0: 8, level: -1, closed: false, id: 0,
};
const NB_FAMILY = 0, NB_GROW = 1, NB_LATTICE = 2;    // what C.nm measures the gap against
let HW = 1;

function curveAt(c, s, e) {
  switch (c.t) {
    case 0: {
      const cs = Math.cos(s), k = c.p * Math.sin(s);
      HD[0] = (c.ax + e * c.nx) * cs + k * c.dx;
      HD[1] = (c.ay + e * c.ny) * cs + k * c.dy;
      HD[2] = (c.az + e * c.nz) * cs + k * c.dz;
      HW = cs;
      return;
    }
    case 1: {
      const cs = Math.cos(s), sn = Math.sin(s);
      let th = c.th + e * c.dth;
      if (c.tw !== 0) th += c.tw * Math.log1p(Math.max(0, sn / cs));
      const ct = Math.cos(th), st = Math.sin(th), k = c.p * sn;
      HD[0] = c.ax * cs + k * (ct * c.ux + st * c.vx);
      HD[1] = c.ay * cs + k * (ct * c.uy + st * c.vy);
      HD[2] = c.az * cs + k * (ct * c.uz + st * c.vz);
      HW = cs;
      return;
    }
    case 2: {
      const cs = Math.cos(s), sn = Math.sin(s), r = c.r + c.g * s + e * c.dr;
      HD[0] = c.ax + r * (cs * c.ux + sn * c.vx);
      HD[1] = c.ay + r * (cs * c.uy + sn * c.vy);
      HD[2] = c.az + r * (cs * c.uz + sn * c.vz);
      HW = 1;
      return;
    }
    case 3: {
      const cs = Math.cos(s), sn = Math.sin(s);
      HD[0] = cs * c.ux + sn * c.vx;
      HD[1] = cs * c.uy + sn * c.vy;
      HD[2] = cs * c.uz + sn * c.vz;
      HW = 0;
      return;
    }
    default: {
      const n = c.pn;
      let i = Math.floor(s);
      if (i < 0) i = 0; else if (i > n - 2) i = n - 2;
      const f = s - i;
      const u = c.pu[i] + (c.pu[i + 1] - c.pu[i]) * f;
      const v = c.pv[i] + (c.pv[i + 1] - c.pv[i]) * f;
      let k = 1, ox = 0, oy = 0, oz = 0;
      if (e !== 0 && c.nm === NB_GROW) k = 1 + e * c.nk;
      else if (e !== 0 && c.nm === NB_FAMILY) { ox = e * c.nx; oy = e * c.ny; oz = e * c.nz; }
      HD[0] = c.ax + k * (u * c.ux + v * c.vx) + ox;
      HD[1] = c.ay + k * (u * c.uy + v * c.vy) + oy;
      HD[2] = c.az + k * (u * c.uz + v * c.vz) + oz;
      HW = 1;
    }
  }
}

function look(c, s) {
  curveAt(c, s, 0);
  return toPaper();
}

// Which share of its family a line belongs to: one in every 2^j, 2^j being the largest
// power of two that divides its index. Line 0 — the one through the foot of the ball —
// counts as the rarest of all.
function levelOf(k) {
  k = Math.abs(k);
  if (k === 0) return LOD_MAX;
  let j = 0;
  while ((k & 1) === 0 && j < LOD_MAX) { k >>= 1; j++; }
  return j;
}

// Everything the walk needs, worked out once per update.
let LOD_ON = false, MIN_GAP = 0, RIM_CUT = false, RIM_R = 0;
let SAG2 = 0, SEG2 = 0, JUMP2 = 0;
let LAST_LOD = NO_GATE;      // the thinning half of the last gate, in octaves

function computeConstants() {
  computeCamera();
  OX = ball.x; OY = ball.y; BR = ball.r;
  MIN_GAP = Math.max(0, settings.minGap);
  LOD_ON = MIN_GAP > 0;
  const rg = Math.max(0, settings.rimGap);
  RIM_CUT = rg > 0;
  RIM_R = BR - rg;
  const sag = Math.max(0.002, settings.sag);
  SAG2 = sag * sag;
  SEG2 = SEG_MAX * SEG_MAX;
  JUMP2 = JUMP_MM * JUMP_MM;
}

// Whether a point of a curve is drawn: positive where it is, negative where it is not,
// and crossing zero where the stroke should end.
//
// The thinning is read in octaves — how many times over the gap to the nearest line of
// the family that is still standing here fits the gap asked for — so it is the same
// number however large the ball, and a piece of line that is well under it at both ends
// can be passed over without being refined. The gap is the neighbour's offset taken
// square to the curve's own tangent, which is the distance a ruler would measure.
function gateAt(c, s, x, y) {
  let g = NO_GATE;
  LAST_LOD = NO_GATE;
  if (LOD_ON && c.level >= 0) {
    let across = -1;
    if (c.nm === NB_LATTICE) {
      curveAt(c, s, 0);
      const w = HW * GAP_E, hx = HD[0], hy = HD[1], hz = HD[2];
      HD[0] = hx + w * c.sux; HD[1] = hy + w * c.suy; HD[2] = hz + w * c.suz;
      if (toPaper()) {
        const ax = PX - x, ay = PY - y;
        HD[0] = hx + w * c.svx; HD[1] = hy + w * c.svy; HD[2] = hz + w * c.svz;
        if (toPaper()) {
          const bx = PX - x, by = PY - y;
          curveAt(c, s + TAN_DS, 0);
          if (toPaper()) {
            const tx = PX - x, ty = PY - y, tl = Math.hypot(tx, ty);
            across = tl > 1e-12
              ? Math.max(Math.abs(ax * ty - ay * tx), Math.abs(bx * ty - by * tx)) / tl
              : Math.max(Math.hypot(ax, ay), Math.hypot(bx, by));
          }
        }
      }
    } else {
      curveAt(c, s + TAN_DS, 0);
      const okT = toPaper(), tx = PX - x, ty = PY - y;
      curveAt(c, s, GAP_E);
      if (okT && toPaper()) {
        const nx = PX - x, ny = PY - y;
        const tl = Math.sqrt(tx * tx + ty * ty);
        across = tl > 1e-12 ? Math.abs(nx * ty - ny * tx) / tl : Math.sqrt(nx * nx + ny * ny);
      }
    }
    if (across >= 0) {
      g = across > 0 ? Math.max(-60, Math.log2(across / (GAP_E * MIN_GAP)) + c.level) : -60;
      LAST_LOD = g;
    }
  }
  if (RIM_CUT) {
    const dx = x - OX, dy = y - OY;
    const rg = RIM_R - Math.sqrt(dx * dx + dy * dy);
    if (rg < g) g = rg;
  }
  return g;
}

// The smaller singular value of the 2×2 map with columns (ax, ay) and (bx, by): how
// short the thinnest way across the square they are the images of comes out. Neither
// column alone will do — seen along a diagonal, a face is foreshortened between them.
function sigmaMin(ax, ay, bx, by) {
  const p = ax * ax + ay * ay, q = bx * bx + by * by, r = ax * bx + ay * by;
  const d = Math.sqrt((p - q) * (p - q) + 4 * r * r);
  return Math.sqrt(Math.max(0, 0.5 * (p + q - d)));
}

function segDist2(px, py, ax, ay, bx, by) {
  const ex = bx - ax, ey = by - ay;
  const L2 = ex * ex + ey * ey;
  let qx = px - ax, qy = py - ay;
  if (L2 > 1e-18) {
    const t = clamp((qx * ex + qy * ey) / L2, 0, 1);
    qx -= t * ex; qy -= t * ey;
  }
  return qx * qx + qy * qy;
}

// The run being walked, and the right-hand ends of the pieces still to be reached.
let RX = new Float64Array(4096), RY = new Float64Array(4096), RG = new Float64Array(4096);
let rn = 0;
const STACK = MAX_DEPTH + 2;
const SS = new Float64Array(STACK), SX = new Float64Array(STACK), SY = new Float64Array(STACK);
const SG = new Float64Array(STACK), SL = new Float64Array(STACK);
const SOK = new Uint8Array(STACK), SD = new Uint8Array(STACK);

function pushPt(x, y, g) {
  if (rn === RX.length) {
    const grow = a => { const b = new Float64Array(a.length * 2); b.set(a); return b; };
    RX = grow(RX); RY = grow(RY); RG = grow(RG);
  }
  RX[rn] = x; RY[rn] = y; RG[rn] = g; rn++;
}

function flushRun(sink, id, closed) {
  if (rn >= 2) emitPath(RX, RY, RG, rn, true, closed, sink, id);
  rn = 0;
}

// One curve, from s0 to s1. It is cut into n0 even pieces first, so that nothing the
// size of a piece can hide between two samples, and each piece is then halved for as
// long as its middle strays from its chord or its chord is too long to trust.
function traceCurve(c, sink) {
  if (maps > MAX_MAPS) { truncated = true; return; }
  curves++;
  rn = 0;
  let broken = false;
  const s0 = c.s0, span = c.s1 - c.s0, n0 = c.n0;

  let sL = s0, okL = look(c, sL), xL = PX, yL = PY, lL = NO_GATE;
  if (okL) { pushPt(xL, yL, gateAt(c, sL, xL, yL)); lL = LAST_LOD; }

  for (let i = 1; i <= n0; i++) {
    let top = 0;
    SS[0] = s0 + span * i / n0;
    SOK[0] = look(c, SS[0]) ? 1 : 0;
    SX[0] = PX; SY[0] = PY; SD[0] = 0;
    if (SOK[0]) { SG[0] = gateAt(c, SS[0], SX[0], SY[0]); SL[0] = LAST_LOD; }
    else { SG[0] = -1; SL[0] = NO_GATE; }

    while (top >= 0) {
      const sR = SS[top], okR = SOK[top] === 1, xR = SX[top], yR = SY[top];
      const gR = SG[top], lR = SL[top], d = SD[top];

      if (d < MAX_DEPTH && !(okL && okR && lL < CULL_OCT && lR < CULL_OCT)) {
        const sm = 0.5 * (sL + sR);
        const okM = look(c, sm), xm = PX, ym = PY;
        let split = !okL || !okR || !okM;
        if (!split) {
          const ex = xR - xL, ey = yR - yL;
          split = ex * ex + ey * ey > SEG2 || segDist2(xm, ym, xL, yL, xR, yR) > SAG2;
        }
        if (split) {
          SD[top] = d + 1;
          top++;
          SS[top] = sm; SOK[top] = okM ? 1 : 0; SX[top] = xm; SY[top] = ym; SD[top] = d + 1;
          if (okM) { SG[top] = gateAt(c, sm, xm, ym); SL[top] = LAST_LOD; }
          else { SG[top] = -1; SL[top] = NO_GATE; }
          continue;
        }
      }

      // The piece from L to R stands. It joins the run unless an end of it has no image
      // or halving gave out with the ends still apart: the curve crossed the rim there.
      const ex = xR - xL, ey = yR - yL;
      if (okL && okR && (d < MAX_DEPTH || ex * ex + ey * ey <= JUMP2)) {
        pushPt(xR, yR, gR);
      } else {
        flushRun(sink, c.id, false);
        broken = true;
        if (okR) pushPt(xR, yR, gR);
      }
      sL = sR; okL = okR; xL = xR; yL = yR; lL = lR;
      top--;
    }
  }
  flushRun(sink, c.id, c.closed && !broken);
}

// The setting up every curve shares, so that nothing one curve left in C leaks into the
// next.
function begin(t, id, level) {
  C.t = t; C.id = id; C.level = level;
  C.nm = NB_FAMILY; C.closed = false; C.g = 0; C.tw = 0;
}

function onFace(f) {
  C.ax = f.F[0]; C.ay = f.F[1]; C.az = f.F[2];
  C.ux = f.U[0]; C.uy = f.U[1]; C.uz = f.U[2];
  C.vx = f.V[0]; C.vy = f.V[1]; C.vz = f.V[2];
}

// Measure the curve as one of a lattice of copies of itself on face f, a apart along U
// and b apart along V.
function byLattice(f, a, b) {
  C.nm = NB_LATTICE;
  C.sux = a * f.U[0]; C.suy = a * f.U[1]; C.suz = a * f.U[2];
  C.svx = b * f.V[0]; C.svy = b * f.V[1]; C.svz = b * f.V[2];
}

// A straight line from t0 to t1 along D, measured from A, its point nearest the ball.
// Either end may be infinite. Given a face, the line is measured as one of a lattice of
// copies of itself on that face instead of by the next line of a family.
function lineCurve(ax, ay, az, dx, dy, dz, t0, t1, nx, ny, nz, level, id, sink, lf, la, lb) {
  const p = Math.sqrt(ax * ax + ay * ay + az * az);
  if (p < 1e-9 || !(t1 > t0)) return;          // a line through the ball itself
  begin(0, id, level);
  C.ax = ax; C.ay = ay; C.az = az;
  C.dx = dx; C.dy = dy; C.dz = dz;
  C.nx = nx; C.ny = ny; C.nz = nz;
  C.p = p;
  if (lf) byLattice(lf, la, lb);
  C.s0 = Math.atan2(t0, p);
  C.s1 = Math.atan2(t1, p);
  C.n0 = Math.max(4, Math.ceil((C.s1 - C.s0) / (Math.PI / 48)));
  traceCurve(C, sink);
}

// A polyline laid on face f, in the face's own u and v. Each straight piece of it is one
// piece of the walk to start with, and the walk bends it from there. `nb` says how it
// is thinned: its pen, its level, and what its gap is measured against.
function polyCurve(f, us, vs, closed, nb, sink) {
  const n = us.length;
  if (n < 2) return;
  begin(4, nb.id, nb.level);
  onFace(f);
  C.pu = us; C.pv = vs; C.pn = n;
  C.closed = closed;
  if (nb.mode === NB_GROW) { C.nm = NB_GROW; C.nk = nb.k; }
  else { C.nx = nb.N[0]; C.ny = nb.N[1]; C.nz = nb.N[2]; }
  C.s0 = 0; C.s1 = n - 1;
  C.n0 = n - 1;
  traceCurve(C, sink);
}

////////////////////////////////////////////////////////////////////////////////////////
// Sinks, clipping, thinning
//
// One walked run is a list of points in millimetres with a gate value on each. It is cut
// where the gate goes negative, clipped to the drawable box, thinned by Douglas–Peucker
// and handed to the sink.

function makeSink() {
  const pts = [], off = [0], ink = [];
  return {
    pts, off, ink,
    run(xs, ys, n, id) {
      if (n < 2) return;
      for (let i = 0; i < n; i++) pts.push(xs[i], ys[i]);
      off.push(pts.length / 2);
      ink.push(id);
    },
    // A zero-length path is dropped by most plotter toolchains, so a dot goes down as a
    // hairline stub instead.
    dot(x, y, id) {
      pts.push(x - EPS / 2, y, x + EPS / 2, y);
      off.push(pts.length / 2);
      ink.push(id);
    },
  };
}

// Liang–Barsky against the drawable box. Writes the clipped segment into CLIP_OUT and
// returns whether any of it survived; nothing is allocated, it runs once per sample.
const CLIP_OUT = new Float64Array(4);

function clipSeg(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  let t0 = 0, t1 = 1;

  for (let e = 0; e < 4; e++) {
    const p = e === 0 ? -dx : e === 1 ? dx : e === 2 ? -dy : dy;
    const q = e === 0 ? x0 - area.x0 : e === 1 ? area.x1 - x0
            : e === 2 ? y0 - area.y0 : area.y1 - y0;
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else       { if (r < t0) return false; if (r < t1) t1 = r; }
  }

  CLIP_OUT[0] = x0 + t0 * dx; CLIP_OUT[1] = y0 + t0 * dy;
  CLIP_OUT[2] = x0 + t1 * dx; CLIP_OUT[3] = y0 + t1 * dy;
  return true;
}

function insideArea(x, y) {
  return x >= area.x0 && x <= area.x1 && y >= area.y0 && y <= area.y1;
}

// Douglas–Peucker. The walk already puts points only where the curve bends, but the cap
// on chord length leaves long straight stretches carrying more than they need.
function simplifyRun(xs, ys, tol) {
  const n = xs.length;
  if (n <= 2 || tol <= 0) return [xs, ys];

  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const t2 = tol * tol;
  const stack = [0, n - 1];

  while (stack.length) {
    const b = stack.pop(), a = stack.pop();
    if (b - a < 2) continue;
    const ax = xs[a], ay = ys[a], bx = xs[b], by = ys[b];
    let bi = -1, bd = t2;
    for (let i = a + 1; i < b; i++) {
      const d2 = segDist2(xs[i], ys[i], ax, ay, bx, by);
      if (d2 > bd) { bd = d2; bi = i; }
    }
    if (bi < 0) continue;
    keep[bi] = 1;
    stack.push(a, bi, bi, b);
  }

  const ox = [], oy = [];
  for (let i = 0; i < n; i++) if (keep[i]) { ox.push(xs[i]); oy.push(ys[i]); }
  return [ox, oy];
}

function emitRun(xs, ys, sink, id) {
  if (xs.length < 2) return;
  const [sx, sy] = simplifyRun(xs, ys, Math.max(0, settings.simplifyTol));
  sink.run(sx, sy, sx.length, id);
}

// The pieces of one run that survive the box, in the order they were walked.
function clipRuns(px, py, n, out) {
  if (n < 2) return;

  // The common case by far: nothing to cut, so hand the whole run straight over.
  let allIn = true;
  for (let i = 0; i < n; i++) {
    if (!insideArea(px[i], py[i])) { allIn = false; break; }
  }
  if (allIn) {
    const rx = new Array(n), ry = new Array(n);
    for (let i = 0; i < n; i++) { rx[i] = px[i]; ry[i] = py[i]; }
    out.push([rx, ry]);
    return;
  }

  let rx = null, ry = null;
  const flush = () => {
    if (rx && rx.length >= 2) out.push([rx, ry]);
    rx = ry = null;
  };

  for (let i = 0; i + 1 < n; i++) {
    if (!clipSeg(px[i], py[i], px[i + 1], py[i + 1])) { flush(); continue; }
    const ax = CLIP_OUT[0], ay = CLIP_OUT[1], bx = CLIP_OUT[2], by = CLIP_OUT[3];
    if (rx && Math.abs(rx[rx.length - 1] - ax) < 1e-9 &&
              Math.abs(ry[ry.length - 1] - ay) < 1e-9) {
      rx.push(bx); ry.push(by);
    } else {
      flush();
      rx = [ax, bx]; ry = [ay, by];
    }
  }
  flush();
}

// Cutting a run where its gate goes negative. The crossing is interpolated on the gate
// itself, so a stroke ends where the gate says and not at the nearest sample before it.
let gateX = null, gateY = null;

function gateRuns(px, py, gv, n, out) {
  if (!gateX || gateX.length < n + 2) {
    gateX = new Float64Array(n + 2);
    gateY = new Float64Array(n + 2);
  }
  let m = 0;

  for (let i = 0; i < n; i++) {
    if (gv[i] >= 0) {
      if (m === 0 && i > 0) {                     // stepped back in since the last
        const t = gv[i - 1] / (gv[i - 1] - gv[i]);
        gateX[m] = px[i - 1] + (px[i] - px[i - 1]) * t;
        gateY[m] = py[i - 1] + (py[i] - py[i - 1]) * t;
        m++;
      }
      gateX[m] = px[i]; gateY[m] = py[i]; m++;
    } else if (m > 0) {                           // and out again
      const t = gv[i - 1] / (gv[i - 1] - gv[i]);
      gateX[m] = px[i - 1] + (px[i] - px[i - 1]) * t;
      gateY[m] = py[i - 1] + (py[i] - py[i - 1]) * t;
      m++;
      clipRuns(gateX, gateY, m, out);
      m = 0;
    }
  }
  if (m > 0) clipRuns(gateX, gateY, m, out);
}

// One walked run — gated, clipped and handed over. A closed curve that comes back to
// where it started is stitched up again if the gate cut it there, so a ring is one
// stroke and not two halves that happen to meet.
function emitPath(px, py, gv, n, gated, closed, sink, id) {
  const runs = [];
  if (gated) gateRuns(px, py, gv, n, runs);
  else clipRuns(px, py, n, runs);

  if (closed && runs.length > 1) {
    const head = runs[0], tail = runs[runs.length - 1];
    const hx = head[0], hy = head[1], tx = tail[0], ty = tail[1];
    if (Math.abs(tx[tx.length - 1] - hx[0]) < 1e-9 &&
        Math.abs(ty[ty.length - 1] - hy[0]) < 1e-9) {
      tx.pop(); ty.pop();                       // the point the two share
      runs[0] = [tx.concat(hx), ty.concat(hy)];
      runs.pop();
    }
  }

  for (const [xs, ys] of runs) emitRun(xs, ys, sink, id);
}

////////////////////////////////////////////////////////////////////////////////////////
// The room
//
// The ball's centre is the origin, y is up and the camera — before yaw turns the room —
// stands out on +z. The room is a box around the ball; the open scene is the same floor
// and ceiling without the walls, each a disc that runs out to `reach` and a ceiling high
// enough to read as sky.
//
// Every face is a plane with a foot point F — where it comes nearest the ball — and two
// axes U and V in it, so a point of the face is F + u·U + v·V and its bounds are ranges
// of u and v measured from F. Tiles are counted from the middle of the floor and the
// ceiling, and up from the floor on the walls, which makes a line on the floor carry on
// up the wall it meets.

function penId(v) {
  const pens = Math.round(clamp(settings.pens, 1, MAX_PENS));
  return clamp(Math.round(v), 1, pens) - 1;
}

function roomBox() {
  const s = settings;
  const H = Math.max(0.1, s.roomH);
  const h = clamp(s.ballH, 0.01 * H, 0.99 * H);
  if (s.scene === 'open') {
    const R = Math.max(1, s.reach);
    return { open: true, R, x0: -R, x1: R, z0: -R, z1: R, y0: -h, y1: H - h };
  }
  const bx = clamp(s.ballX, 1, 99) / 100, bz = clamp(s.ballZ, 1, 99) / 100;
  const W = Math.max(0.1, s.roomW), D = Math.max(0.1, s.roomD);
  return { open: false, R: 0, x0: -W * bx, x1: W * (1 - bx),
           z0: -D * bz, z1: D * (1 - bz), y0: -h, y1: H - h };
}

// Every face with what it is laid with, the size one piece of that is, and a salt of its
// own, so that two faces laid with the same scatter do not repeat one another.
function faces(B) {
  const s = settings;
  const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
  const xc = (B.x0 + B.x1) / 2, zc = (B.z0 + B.z1) / 2;
  const tile = Math.max(0.01, s.tile);
  const size = k => tile * Math.max(0.05, k);
  const salt = i => Math.round(s.seed) * 1013 + i * 7919;
  const flat = { U: X, V: Z, u0: B.x0, u1: B.x1, v0: B.z0, v1: B.z1, uc: xc, vc: zc };
  const out = [
    { ...flat, pat: s.floor,   id: penId(s.floorPen),   size: size(s.floorScale),
      salt: salt(0), F: [0, B.y0, 0] },
    { ...flat, pat: s.ceiling, id: penId(s.ceilingPen), size: size(s.ceilingScale),
      salt: salt(1), F: [0, B.y1, 0] },
  ];
  if (!B.open) {
    const wall = { pat: s.walls, id: penId(s.wallPen), size: size(s.wallScale),
                   V: Y, v0: B.y0, v1: B.y1, vc: B.y0 };
    out.push({ ...wall, salt: salt(2), F: [B.x0, 0, 0], U: Z, u0: B.z0, u1: B.z1, uc: zc });
    out.push({ ...wall, salt: salt(3), F: [B.x1, 0, 0], U: Z, u0: B.z0, u1: B.z1, uc: zc });
    out.push({ ...wall, salt: salt(4), F: [0, 0, B.z0], U: X, u0: B.x0, u1: B.x1, uc: xc });
    out.push({ ...wall, salt: salt(5), F: [0, 0, B.z1], U: X, u0: B.x0, u1: B.x1, uc: xc });
  }
  return out;
}

// A rough count of the lines the room will ask to be traced, so a tile of a thousandth
// of the room is refused before it freezes the tab rather than after. The patterns that
// fade are left out: they are held to MAX_ELEMS pieces a face whatever they are asked.
function countCurves() {
  const B = roomBox();
  let n = 0;
  for (const f of faces(B)) {
    const a = f.size;
    const du = (f.u1 - f.u0) / a, dv = (f.v1 - f.v0) / a;
    const across = Math.hypot(f.u1 - f.u0, f.v1 - f.v0) / a;
    switch (f.pat) {
      case 'grid':      n += du + dv; break;
      case 'stripes':   n += du; break;
      case 'diamonds':  n += 2 * across; break;
      case 'triangles': n += 3.5 * across; break;
      case 'bricks':    n += dv; break;
      case 'arches':    n += dv / 3.5; break;
      case 'rings':
      case 'polygons':
      case 'spiral':    n += across; break;
      case 'rays':
      case 'whirl':     n += Math.max(1, settings.rays); break;
      case 'net':       n += NET_AXES.length; break;
    }
  }
  return n;
}

////////////////////////////////////////////////////////////////////////////////////////
// Where a pattern may go
//
// A region is the part of a face a pattern is laid on, in the face's own u and v: the
// face's rectangle in a room, its disc on the open floor, and — for the patterns that
// only fade — never further out from F than they can still be seen.

function faceRegion(f, B, far) {
  return { rect: !B.open, u0: f.u0, u1: f.u1, v0: f.v0, v1: f.v1,
           R: Math.min(B.open ? B.R : Infinity, far) };
}

function insideRegion(u, v, reg) {
  if (reg.rect && (u < reg.u0 || u > reg.u1 || v < reg.v0 || v > reg.v1)) return false;
  return u * u + v * v <= reg.R * reg.R;
}

function regionBox(reg) {
  let u0 = -reg.R, u1 = reg.R, v0 = -reg.R, v1 = reg.R;
  if (reg.rect) {
    u0 = Math.max(u0, reg.u0); u1 = Math.min(u1, reg.u1);
    v0 = Math.max(v0, reg.v0); v1 = Math.min(v1, reg.v1);
  }
  return [u0, u1, v0, v1];
}

function regionMaxRadius(reg) {
  if (!reg.rect) return reg.R;
  return Math.min(reg.R, Math.max(
    Math.hypot(reg.u0, reg.v0), Math.hypot(reg.u0, reg.v1),
    Math.hypot(reg.u1, reg.v0), Math.hypot(reg.u1, reg.v1)));
}

// The stretch [t0, t1] of the line A + t·D, D of unit length, that lies in a region.
function clipLineRegion(au, av, du, dv, reg) {
  let t0 = -Infinity, t1 = Infinity;
  if (reg.rect) {
    const P = [-du, du, -dv, dv];
    const Q = [au - reg.u0, reg.u1 - au, av - reg.v0, reg.v1 - av];
    for (let e = 0; e < 4; e++) {
      if (P[e] === 0) { if (Q[e] < 0) return null; continue; }
      const r = Q[e] / P[e];
      if (P[e] < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
    }
  }
  if (reg.R < Infinity) {
    const b = au * du + av * dv, c = au * au + av * av - reg.R * reg.R;
    const disc = b * b - c;
    if (disc <= 0) return null;
    const sq = Math.sqrt(disc);
    t0 = Math.max(t0, -b - sq);
    t1 = Math.min(t1, -b + sq);
  }
  return t1 > t0 ? [t0, t1] : null;
}

// The stretches of a polyline that lie in a region, in the order they were laid, pushed
// onto `out`. True when nothing had to be cut; a closed polyline cut open where it
// started is joined back up there.
function clipPolyRegion(us, vs, closed, reg, out) {
  const n = us.length, first = out.length;
  let ru = null, rv = null, whole = true, joined = false, head = false;
  const flush = () => { if (ru && ru.length >= 2) out.push([ru, rv]); ru = rv = null; };

  for (let i = 0; i + 1 < n; i++) {
    const au = us[i], av = vs[i], du = us[i + 1] - au, dv = vs[i + 1] - av;
    let t0 = 0, t1 = 1;
    if (reg.rect) {
      const P = [-du, du, -dv, dv];
      const Q = [au - reg.u0, reg.u1 - au, av - reg.v0, reg.v1 - av];
      for (let e = 0; e < 4 && t0 < t1; e++) {
        if (P[e] === 0) { if (Q[e] < 0) t1 = -1; continue; }
        const r = Q[e] / P[e];
        if (P[e] < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
      }
    }
    if (t0 < t1 && reg.R < Infinity) {
      const A = du * du + dv * dv, b = au * du + av * dv;
      const c = au * au + av * av - reg.R * reg.R;
      const disc = b * b - A * c;
      if (A <= 0) { if (c > 0) t1 = -1; }
      else if (disc <= 0) t1 = -1;
      else {
        const sq = Math.sqrt(disc);
        t0 = Math.max(t0, (-b - sq) / A);
        t1 = Math.min(t1, (-b + sq) / A);
      }
    }
    if (!(t1 > t0)) { whole = false; joined = false; flush(); continue; }
    if (t0 > 0 || t1 < 1) whole = false;
    if (i === 0 && t0 === 0) head = true;
    const qu = au + t1 * du, qv = av + t1 * dv;
    if (ru && t0 === 0 && joined) { ru.push(qu); rv.push(qv); }
    else { flush(); ru = [au + t0 * du, qu]; rv = [av + t0 * dv, qv]; }
    joined = t1 === 1;
  }
  flush();

  if (closed && !whole && head && joined && out.length - first > 1) {
    const [hu, hv] = out[first], [tu, tv] = out.pop();
    tu.pop(); tv.pop();
    out[first] = [tu.concat(hu), tv.concat(hv)];
  }
  return whole;
}

// The stretches of s where a curve walked from s0 to s1 lies inside, found on a fine
// grid and then pinned down by bisection.
function paramIntervals(inside, s0, s1, steps) {
  const out = [];
  let prev = inside(s0), start = prev ? s0 : null, sp = s0;
  for (let k = 1; k <= steps; k++) {
    const s = s0 + (s1 - s0) * k / steps;
    const cur = inside(s);
    if (cur !== prev) {
      let a = sp, b = s;
      for (let it = 0; it < 40; it++) {
        const m = 0.5 * (a + b);
        if (inside(m) === prev) a = m; else b = m;
      }
      const edge = 0.5 * (a + b);
      if (cur) start = edge;
      else { out.push([start, edge]); start = null; }
      prev = cur;
    }
    sp = s;
  }
  if (start !== null && s1 > start) out.push([start, s1]);
  return out;
}

// A number in [0, 1) that depends on nothing but a tile's index and the salt, so that a
// scattered pattern stays put wherever the drawing of it happens to start and stop.
function hash01(i, j, salt) {
  let h = Math.imul(i | 0, 0x27d4eb2d) ^ Math.imul(j | 0, 0x165667b1) ^
          Math.imul(salt | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// How large a piece a across U and b across V comes out on paper at a point of the
// face, the thinnest way across it: that is the way the face is foreshortened there.
function surfaceGap(x, y, z, a, b, U, V) {
  HD[0] = x; HD[1] = y; HD[2] = z;
  if (!toPaper()) return 0;
  const px = PX, py = PY, ea = GAP_E * a, eb = GAP_E * b;
  HD[0] = x + ea * U[0]; HD[1] = y + ea * U[1]; HD[2] = z + ea * U[2];
  if (!toPaper()) return 0;
  const ux = PX - px, uy = PY - py;
  HD[0] = x + eb * V[0]; HD[1] = y + eb * V[1]; HD[2] = z + eb * V[2];
  if (!toPaper()) return 0;
  return sigmaMin(ux, uy, PX - px, PY - py) / GAP_E;
}

// Whether a piece of a fading pattern at (u, v) on a face, a across U and b across V,
// still comes out large enough on paper to be drawn.
function pieceShows(f, u, v, a, b) {
  if (!LOD_ON) return true;
  const F = f.F, U = f.U, V = f.V;
  return surfaceGap(F[0] + u * U[0] + v * V[0], F[1] + u * U[1] + v * V[1],
                    F[2] + u * U[2] + v * V[2], a, b, U, V) >= MIN_GAP;
}

// How far out from the foot of a face pieces `size` across still come out large enough
// on paper to be drawn, looking every way along the face and with room to spare. A
// pattern that only fades is laid no further out than that — and, however fine it is
// asked to be, on no more than about MAX_ELEMS tiles of its own size.
function visibleReach(f, B, size) {
  const outer = regionMaxRadius(faceRegion(f, B, Infinity));
  const cap = Math.sqrt(MAX_ELEMS / Math.PI) * size;
  if (!LOD_ON) return Math.min(outer, cap);
  const F = f.F, U = f.U, V = f.V;
  let far = 0;
  for (let k = 0; k < 32; k++) {
    const th = 2 * Math.PI * (k + 0.5) / 32, cu = Math.cos(th), cv = Math.sin(th);
    const du = cu * U[0] + cv * V[0], dv = cu * U[1] + cv * V[1], dw = cu * U[2] + cv * V[2];
    for (let t = 0.5 * size; t <= outer; t *= 1.15) {
      const g = surfaceGap(F[0] + t * du, F[1] + t * dv, F[2] + t * dw, size, size, U, V);
      if (2 * g >= MIN_GAP && t > far) far = t;
    }
  }
  return Math.min(outer, cap, 1.3 * far + size);
}

// A polyline on a face, cut to a region and walked stretch by stretch.
//
// The edges of a tiling that fades (`nb.fade`) are kept or dropped whole, straight piece
// by straight piece, and a piece is kept while either of the two cells it divides still
// shows — their middles lie `nb.off` to either side of it, and a cell a × b across shows
// while it comes out at least the gap across on paper. So every edge that is drawn
// belongs to a cell that is drawn all the way round, and the tiling gives out cell by
// cell without leaving an edge standing on its own.
function polyInRegion(f, us, vs, closed, reg, nb, sink) {
  const runs = [];
  const whole = clipPolyRegion(us, vs, closed, reg, runs);
  for (const [ru, rv] of runs) {
    if (!nb.fade || !LOD_ON) { polyCurve(f, ru, rv, closed && whole, nb, sink); continue; }
    let ku = null, kv = null, all = true;
    const flush = () => { if (ku) polyCurve(f, ku, kv, false, nb, sink); ku = kv = null; };
    for (let i = 0; i + 1 < ru.length; i++) {
      const du = ru[i + 1] - ru[i], dv = rv[i + 1] - rv[i], l = Math.hypot(du, dv) || 1;
      const mu = 0.5 * (ru[i] + ru[i + 1]), mv = 0.5 * (rv[i] + rv[i + 1]);
      const ou = -dv / l * nb.off, ov = du / l * nb.off;
      if (!pieceShows(f, mu + ou, mv + ov, nb.a, nb.b) &&
          !pieceShows(f, mu - ou, mv - ov, nb.a, nb.b)) {
        all = false;
        flush();
        continue;
      }
      if (!ku) { ku = [ru[i]]; kv = [rv[i]]; }
      ku.push(ru[i + 1]); kv.push(rv[i + 1]);
    }
    if (all && ku) { polyCurve(f, ku, kv, closed && whole, nb, sink); ku = null; }
    flush();
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Patterns
//
// What a face can be laid with. The families — straight lines, rings, polygons, spirals,
// rays — are thinned line by line as the header says. The rest are made of pieces that
// do not nest, and fade out instead: each of those is laid only as far out as
// `visibleReach` says a piece of it can still be seen, and there every edge, joint or
// crater is kept or dropped whole by how large it comes out on paper where it lies.

function faceCurves(f, B, sink) {
  const reg = faceRegion(f, B, Infinity);
  const a = f.size;
  switch (f.pat) {
    case 'grid':
      lineFamily(f, reg, Math.PI / 2, a, sink);
      lineFamily(f, reg, 0, a, sink);
      break;
    case 'stripes':
      lineFamily(f, reg, Math.PI / 2, a, sink);
      break;
    case 'diamonds':
      lineFamily(f, reg, Math.PI / 4, a, sink);
      lineFamily(f, reg, 3 * Math.PI / 4, a, sink);
      break;
    case 'triangles':
      for (let k = 0; k < 3; k++) lineFamily(f, reg, k * Math.PI / 3, a * Math.sqrt(3) / 2, sink);
      break;
    case 'hexagons': hexCurves(f, B, sink); break;
    case 'bricks':
      lineFamily(f, reg, 0, a, sink);
      brickJoints(f, B, sink);
      break;
    case 'scales':   scaleCurves(f, B, sink); break;
    case 'arches':
      lineFamily(f, reg, 0, ARCH_TIER * a, sink);
      archCurves(f, B, sink);
      break;
    case 'cells':    cellCurves(f, B, sink); break;
    case 'craters':  craterCurves(f, B, sink); break;
    case 'rings':    ringCurves(f, B, sink); break;
    case 'polygons': polygonCurves(f, reg, sink); break;
    case 'spiral':   spiralCurves(f, reg, sink); break;
    case 'rays':     rayCurves(f, B, sink); break;
    case 'whirl':    whirlCurves(f, reg, sink); break;
    case 'posts':    postCurves(f, B, sink); break;
    case 'net':      netCurves(f, reg, sink); break;
  }
}

// A family of parallel straight lines on a face, `gap` apart and turned `phi` from U,
// counted from the line through the face's anchor. Each is walked from edge to edge of
// the region; a line that falls on the edge of the face is left to the edges.
function lineFamily(f, reg, phi, gap, sink) {
  const cu = Math.cos(phi), cv = Math.sin(phi);         // along a line
  const eu = -cv, ev = cu;                              // across the family
  const F = f.F, U = f.U, V = f.V;
  const D = [cu * U[0] + cv * V[0], cu * U[1] + cv * V[1], cu * U[2] + cv * V[2]];
  const E = [eu * U[0] + ev * V[0], eu * U[1] + ev * V[1], eu * U[2] + ev * V[2]];

  let cmin = -reg.R, cmax = reg.R;
  if (reg.rect) {
    cmin = Infinity; cmax = -Infinity;
    for (const u of [reg.u0, reg.u1]) {
      for (const v of [reg.v0, reg.v1]) {
        const c = u * eu + v * ev;
        if (c < cmin) cmin = c;
        if (c > cmax) cmax = c;
      }
    }
  }
  const c0 = f.uc * eu + f.vc * ev;
  const kLo = Math.ceil((cmin - c0) / gap - 1e-9), kHi = Math.floor((cmax - c0) / gap + 1e-9);

  for (let k = kLo; k <= kHi; k++) {
    const c = c0 + k * gap;
    if (c <= cmin + EDGE_EPS || c >= cmax - EDGE_EPS) continue;
    const pu = c * eu, pv = c * ev;                     // its point nearest F
    const t = clipLineRegion(pu, pv, cu, cv, reg);
    if (!t) continue;
    lineCurve(F[0] + pu * U[0] + pv * V[0], F[1] + pu * U[1] + pv * V[1],
              F[2] + pu * U[2] + pv * V[2], D[0], D[1], D[2], t[0], t[1],
              gap * E[0], gap * E[1], gap * E[2], levelOf(k), f.id, sink);
  }
}

// Concentric circles about the foot point, one tile apart, cut to the face.
function ringCurves(f, B, sink) {
  const d = f.size;
  const rMax = B.open ? B.R : Math.max(
    Math.hypot(f.u0, f.v0), Math.hypot(f.u0, f.v1),
    Math.hypot(f.u1, f.v0), Math.hypot(f.u1, f.v1));
  const kHi = Math.floor(rMax / d - 1e-9);

  for (let k = 1; k <= kHi; k++) {
    const r = k * d;
    const arcs = B.open ? [[0, 2 * Math.PI]] : circleInRect(r, f.u0, f.u1, f.v0, f.v1);
    for (const [a, b] of arcs) {
      begin(2, f.id, levelOf(k));
      onFace(f);
      C.r = r; C.dr = d;
      C.s0 = a; C.s1 = b;
      C.n0 = Math.max(8, Math.ceil((b - a) / (Math.PI / 32)));
      C.closed = b - a > 2 * Math.PI - 1e-9;
      traceCurve(C, sink);
    }
  }
}

// The arcs of a circle about the origin that lie inside a box around it, as [from, to]
// pairs of angles with to > from.
function circleInRect(r, u0, u1, v0, v1) {
  const cuts = [];
  for (const c of [u0, u1]) {
    if (Math.abs(c) < r) { const a = Math.acos(c / r); cuts.push(a, 2 * Math.PI - a); }
  }
  for (const c of [v0, v1]) {
    if (Math.abs(c) < r) { const a = Math.asin(c / r); cuts.push(a < 0 ? a + 2 * Math.PI : a, Math.PI - a); }
  }
  const inside = a => {
    const u = r * Math.cos(a), v = r * Math.sin(a);
    return u >= u0 && u <= u1 && v >= v0 && v <= v1;
  };
  if (!cuts.length) return inside(0) ? [[0, 2 * Math.PI]] : [];

  cuts.sort((a, b) => a - b);
  const arcs = [];
  for (let i = 0; i < cuts.length; i++) {
    const a = cuts[i], b = i + 1 < cuts.length ? cuts[i + 1] : cuts[0] + 2 * Math.PI;
    if (b - a < 1e-12 || !inside((a + b) / 2)) continue;
    const last = arcs[arcs.length - 1];
    if (last && Math.abs(last[1] - a) < 1e-12) last[1] = b;
    else arcs.push([a, b]);
  }
  // The sweep began on a cut, so the last arc may run on into the first.
  if (arcs.length > 1) {
    const first = arcs[0], last = arcs[arcs.length - 1];
    if (Math.abs(last[1] - (first[0] + 2 * Math.PI)) < 1e-12) {
      last[1] = first[1] + 2 * Math.PI;
      arcs.shift();
    }
  }
  return arcs;
}

// Concentric regular polygons about the foot point, one tile apart side to side — the
// rings of a coffered dome, or a floor laid out from its middle.
function polygonCurves(f, reg, sink) {
  const d = f.size, N = Math.max(3, Math.round(settings.sides));
  const rMax = regionMaxRadius(reg), kr = 1 / Math.cos(Math.PI / N);
  for (let m = 1; m * d <= rMax; m++) {
    const R = m * d * kr, us = [], vs = [];
    for (let k = 0; k <= N; k++) {
      const a = Math.PI / N + 2 * Math.PI * (k % N) / N;
      us.push(R * Math.cos(a));
      vs.push(R * Math.sin(a));
    }
    polyInRegion(f, us, vs, true, reg, { id: f.id, level: levelOf(m), mode: NB_GROW, k: 1 / m }, sink);
  }
}

// An Archimedean spiral about the foot point, one tile further out every turn. It is
// walked a turn at a time, so that each turn can give out on its own the way a ring does.
function spiralCurves(f, reg, sink) {
  const d = f.size, g = d / (2 * Math.PI), rMax = regionMaxRadius(reg);
  for (let m = 0; m * d < rMax; m++) {
    const r0 = m * d;
    const inside = s => {
      const r = r0 + g * s;
      return insideRegion(r * Math.cos(s), r * Math.sin(s), reg);
    };
    for (const [a, b] of paramIntervals(inside, 0, 2 * Math.PI, 128)) {
      begin(2, f.id, levelOf(m + 1));
      onFace(f);
      C.r = r0; C.g = g; C.dr = d;
      C.s0 = a; C.s1 = b;
      C.n0 = Math.max(8, Math.ceil((b - a) / (Math.PI / 32)));
      traceCurve(C, sink);
    }
  }
}

// Straight lines fanning out of the foot point to the edge of the face. They all meet
// there, which is exactly what the thinning is for.
function rayCurves(f, B, sink) {
  const n = Math.max(1, Math.round(settings.rays));
  const F = f.F;
  const p = Math.hypot(F[0], F[1], F[2]);
  if (p < 1e-9) return;
  const dth = 2 * Math.PI / n;

  for (let k = 0; k < n; k++) {
    const th = k * dth, ct = Math.cos(th), st = Math.sin(th);
    let t = Infinity;
    if (B.open) t = B.R;
    else {
      if (ct > 1e-12)  t = Math.min(t, f.u1 / ct);
      if (ct < -1e-12) t = Math.min(t, f.u0 / ct);
      if (st > 1e-12)  t = Math.min(t, f.v1 / st);
      if (st < -1e-12) t = Math.min(t, f.v0 / st);
    }
    if (!(t > 0)) continue;
    begin(1, f.id, levelOf(k));
    onFace(f);
    C.p = p; C.th = th; C.dth = dth;
    C.s0 = 0; C.s1 = Math.atan2(t, p);
    C.n0 = Math.max(4, Math.ceil(C.s1 / (Math.PI / 48)));
    traceCurve(C, sink);
  }
}

// Rays bent into spirals: each one turns by `twist` radians for every e-fold it runs
// further out from the foot, so the whole fan sweeps round like water going down a drain.
function whirlCurves(f, reg, sink) {
  const n = Math.max(1, Math.round(settings.rays)), tw = settings.twist;
  const F = f.F;
  const p = Math.hypot(F[0], F[1], F[2]);
  if (p < 1e-9) return;
  const dth = 2 * Math.PI / n, rMax = regionMaxRadius(reg);

  for (let k = 0; k < n; k++) {
    const th = k * dth;
    const inside = t => {
      const a = th + tw * Math.log1p(t / p);
      return insideRegion(t * Math.cos(a), t * Math.sin(a), reg);
    };
    for (const [ta, tb] of paramIntervals(inside, 0, rMax, 256)) {
      begin(1, f.id, levelOf(k));
      onFace(f);
      C.p = p; C.th = th; C.dth = dth; C.tw = tw;
      C.s0 = Math.atan2(ta, p); C.s1 = Math.atan2(tb, p);
      C.n0 = Math.max(8, Math.ceil((C.s1 - C.s0) / (Math.PI / 96)));
      traceCurve(C, sink);
    }
  }
}

// A honeycomb of side a: a zigzag along the top of every row, which is the bottom of the
// row above it, and the short upright edges between neighbours within a row.
function hexCurves(f, B, sink) {
  const a = f.size, w = Math.sqrt(3) * a, rowH = 1.5 * a;
  const reg = faceRegion(f, B, visibleReach(f, B, a));
  const [bu0, bu1, bv0, bv1] = regionBox(reg);
  if (!(bu1 > bu0 && bv1 > bv0)) return;
  const nb = { id: f.id, level: -1, N: [0, 0, 0], fade: true, off: w / 2, a: w, b: w };
  const i0 = Math.floor((bu0 - f.uc) / w) - 1, i1 = Math.ceil((bu1 - f.uc) / w) + 1;
  const j0 = Math.floor((bv0 - f.vc) / rowH) - 1, j1 = Math.ceil((bv1 - f.vc) / rowH) + 1;

  for (let j = j0; j <= j1; j++) {
    const cy = f.vc + j * rowH, sh = (j & 1) * w / 2;
    const us = [], vs = [];
    for (let m = 2 * i0; m <= 2 * i1 + 2; m++) {
      us.push(f.uc + sh + (m - 1) * w / 2);
      vs.push(cy + ((m & 1) ? a : a / 2));
    }
    polyInRegion(f, us, vs, false, reg, nb, sink);
    for (let i = i0; i <= i1; i++) {
      const x = f.uc + sh + i * w + w / 2;
      polyInRegion(f, [x, x], [cy - a / 2, cy + a / 2], false, reg, nb, sink);
    }
  }
}

// The upright joints of a brick wall, the courses being a family of their own: a brick
// is two courses long, and every other course is shifted along by half a brick.
function brickJoints(f, B, sink) {
  const h = f.size, L = 2 * h;
  const reg = faceRegion(f, B, visibleReach(f, B, h));
  const [bu0, bu1, bv0, bv1] = regionBox(reg);
  if (!(bu1 > bu0 && bv1 > bv0)) return;
  const nb = { id: f.id, level: -1, N: [0, 0, 0], fade: true, off: h, a: L, b: h };
  const j0 = Math.floor((bv0 - f.vc) / h) - 1, j1 = Math.ceil((bv1 - f.vc) / h);
  const i0 = Math.floor((bu0 - f.uc) / L) - 1, i1 = Math.ceil((bu1 - f.uc) / L) + 1;

  for (let j = j0; j <= j1; j++) {
    const v = f.vc + j * h, sh = (j & 1) * h;
    for (let i = i0; i <= i1; i++) {
      const u = f.uc + i * L + sh;
      polyInRegion(f, [u, u], [v, v + h], false, reg, nb, sink);
    }
  }
}

// Fish scales: rows of half circles standing on a line, each row a radius above the last
// and shifted along by one, so that every scale's crown touches the tips of the row above.
// A row is one stroke for as long as its scales show; a scale that does not is left out
// whole.
function scaleCurves(f, B, sink) {
  const r = f.size, SEG = 16;
  const reg = faceRegion(f, B, visibleReach(f, B, r));
  const [bu0, bu1, bv0, bv1] = regionBox(reg);
  if (!(bu1 > bu0 && bv1 > bv0)) return;
  const nb = { id: f.id, level: -1, N: [0, 0, 0] };
  const j0 = Math.floor((bv0 - f.vc) / r) - 2, j1 = Math.ceil((bv1 - f.vc) / r) + 1;
  const i0 = Math.floor((bu0 - f.uc) / (2 * r)) - 1, i1 = Math.ceil((bu1 - f.uc) / (2 * r)) + 1;

  for (let j = j0; j <= j1; j++) {
    const v = f.vc + j * r, sh = (j & 1) * r;
    let us = [], vs = [];
    const flush = () => { if (us.length > 1) polyInRegion(f, us, vs, false, reg, nb, sink); us = []; vs = []; };
    for (let i = i0; i <= i1; i++) {
      const cu = f.uc + 2 * i * r + sh;
      if (!pieceShows(f, cu, v + 0.5 * r, 2 * r, r)) { flush(); continue; }
      for (let k = us.length ? 1 : 0; k <= SEG; k++) {
        const t = Math.PI * (1 - k / SEG);
        us.push(cu + r * Math.cos(t));
        vs.push(v + r * Math.sin(t));
      }
    }
    flush();
  }
}

// Arcades: tier on tier of round arches on square piers, each arch one stroke — up one
// jamb, over the top and down the other. The line each tier stands on is a family of its
// own, laid by the caller.
const ARCH_TIER = 3.5;             // tier height, in arch radii

function archCurves(f, B, sink) {
  const a = f.size, pier = 0.5 * a, bay = 2 * a + pier, tier = ARCH_TIER * a, SEG = 24;
  const reg = faceRegion(f, B, visibleReach(f, B, a));
  const [bu0, bu1, bv0, bv1] = regionBox(reg);
  if (!(bu1 > bu0 && bv1 > bv0)) return;
  const nb = { id: f.id, level: -1, N: [0, 0, 0] };
  const j0 = Math.floor((bv0 - f.vc) / tier) - 1, j1 = Math.ceil((bv1 - f.vc) / tier);
  const i0 = Math.floor((bu0 - f.uc) / bay) - 1, i1 = Math.ceil((bu1 - f.uc) / bay) + 1;

  for (let j = j0; j <= j1; j++) {
    const v = f.vc + j * tier;
    for (let i = i0; i <= i1; i++) {
      const u = f.uc + i * bay + pier / 2;
      if (!pieceShows(f, u + a, v + 0.5 * tier, bay, tier)) continue;
      const us = [u], vs = [v];
      for (let k = 0; k <= SEG; k++) {
        const t = Math.PI * (1 - k / SEG);
        us.push(u + a + a * Math.cos(t));
        vs.push(v + 2 * a + a * Math.sin(t));
      }
      us.push(u + 2 * a);
      vs.push(v);
      polyInRegion(f, us, vs, false, reg, nb, sink);
    }
  }
}

// Flagstones: the Voronoi cells of a jittered lattice of seeds, one to a tile. Each seed
// is hashed from its tile's index, so a stone keeps its shape however much of the floor
// happens to be worth drawing while the camera moves. Every cell is cut out of a square
// by the bisectors with its neighbours, each new edge remembering which neighbour made
// it, and an edge is drawn from the cell that comes first of the two it divides — if
// either of the two still shows, so a stone is drawn all the way round or not at all.
function cellCurves(f, B, sink) {
  const a = f.size;
  const reg = faceRegion(f, B, visibleReach(f, B, a));
  const [bu0, bu1, bv0, bv1] = regionBox(reg);
  if (!(bu1 > bu0 && bv1 > bv0)) return;
  const i0 = Math.floor((bu0 - f.uc) / a) - 2, i1 = Math.ceil((bu1 - f.uc) / a) + 1;
  const j0 = Math.floor((bv0 - f.vc) / a) - 2, j1 = Math.ceil((bv1 - f.vc) / a) + 1;
  const su = (i, j) => f.uc + a * (i + 0.5 + 0.8 * (hash01(i, j, f.salt) - 0.5));
  const sv = (i, j) => f.vc + a * (j + 0.5 + 0.8 * (hash01(i, j, f.salt + 1) - 0.5));
  const seen = new Map();
  const shows = (i, j) => {
    const k = i + ',' + j;
    let v = seen.get(k);
    if (v === undefined) { v = pieceShows(f, su(i, j), sv(i, j), a, a); seen.set(k, v); }
    return v;
  };
  const segs = [];

  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const x = su(i, j), y = sv(i, j);
      let cell = [[x - 2 * a, x + 2 * a, x + 2 * a, x - 2 * a],
                  [y - 2 * a, y - 2 * a, y + 2 * a, y + 2 * a], [-1, -1, -1, -1]];
      for (let di = -2; di <= 2 && cell[0].length; di++) {
        for (let dj = -2; dj <= 2 && cell[0].length; dj++) {
          if (!di && !dj) continue;
          const nx = su(i + di, j + dj), ny = sv(i + di, j + dj);
          cell = clipCell(cell, nx - x, ny - y, (x + nx) / 2, (y + ny) / 2, (di + 2) * 5 + dj + 2);
        }
      }
      const [pu, pv, pl] = cell;
      for (let k = 0; k < pu.length; k++) {
        if (pl[k] < 0) continue;
        const di = Math.floor(pl[k] / 5) - 2, dj = pl[k] % 5 - 2;
        if (di < 0 || (di === 0 && dj < 0)) continue;     // the other cell draws it
        if (!shows(i, j) && !shows(i + di, j + dj)) continue;
        const k2 = (k + 1) % pu.length;
        segs.push(pu[k], pv[k], pu[k2], pv[k2]);
      }
    }
  }

  const nb = { id: f.id, level: -1, N: [0, 0, 0] };
  for (const [us, vs] of chainSegments(segs, a * 1e-7)) polyInRegion(f, us, vs, false, reg, nb, sink);
}

// One cut of Sutherland–Hodgman: keep the side of the bisector nearer the seed, where
// (p − m)·e ≤ 0. Every vertex carries the label of the edge that leaves it, and the edge
// the cut opens takes the label of the neighbour that made it.
function clipCell(cell, ex, ey, mx, my, lab) {
  const [pu, pv, pl] = cell, n = pu.length;
  const ou = [], ov = [], ol = [];
  for (let k = 0; k < n; k++) {
    const k2 = (k + 1) % n;
    const da = (pu[k] - mx) * ex + (pv[k] - my) * ey;
    const db = (pu[k2] - mx) * ex + (pv[k2] - my) * ey;
    if (da <= 0) {
      ou.push(pu[k]); ov.push(pv[k]); ol.push(pl[k]);
      if (db > 0) {
        const t = da / (da - db);
        ou.push(pu[k] + (pu[k2] - pu[k]) * t); ov.push(pv[k] + (pv[k2] - pv[k]) * t); ol.push(lab);
      }
    } else if (db <= 0) {
      const t = da / (da - db);
      ou.push(pu[k] + (pu[k2] - pu[k]) * t); ov.push(pv[k] + (pv[k2] - pv[k]) * t); ol.push(pl[k]);
    }
  }
  return [ou, ov, ol];
}

// Edges that meet end to end, joined into as few strokes as a greedy walk finds.
function chainSegments(segs, eps) {
  const n = segs.length / 4;
  const key = (u, v) => Math.round(u / eps) + ',' + Math.round(v / eps);
  const at = new Map();
  for (let s = 0; s < n; s++) {
    for (let e = 0; e < 2; e++) {
      const k = key(segs[4 * s + 2 * e], segs[4 * s + 2 * e + 1]);
      const l = at.get(k);
      if (l) l.push(s); else at.set(k, [s]);
    }
  }
  const used = new Uint8Array(n), out = [];
  const step = (u, v) => {
    const k = key(u, v), l = at.get(k);
    if (l) {
      for (const s of l) {
        if (used[s]) continue;
        used[s] = 1;
        const far = key(segs[4 * s], segs[4 * s + 1]) === k ? 1 : 0;
        return [segs[4 * s + 2 * far], segs[4 * s + 2 * far + 1]];
      }
    }
    return null;
  };
  for (let s = 0; s < n; s++) {
    if (used[s]) continue;
    used[s] = 1;
    const us = [segs[4 * s], segs[4 * s + 2]], vs = [segs[4 * s + 1], segs[4 * s + 3]];
    for (let p; (p = step(us[us.length - 1], vs[vs.length - 1])); ) { us.push(p[0]); vs.push(p[1]); }
    for (let p; (p = step(us[0], vs[0])); ) { us.unshift(p[0]); vs.unshift(p[1]); }
    out.push([us, vs]);
  }
  return out;
}

// Craters: a scatter of circles over a lattice two tiles across. Most tiles get one, of
// a size drawn from a steep curve so that small ones are common and big ones rare; the
// big ones get a terrace inside the rim, and the biggest a peak in the middle.
function craterCurves(f, B, sink) {
  const cell = 2 * f.size;
  const reg = faceRegion(f, B, visibleReach(f, B, 0.5 * f.size));
  const [bu0, bu1, bv0, bv1] = regionBox(reg);
  if (!(bu1 > bu0 && bv1 > bv0)) return;
  const i0 = Math.floor((bu0 - f.uc) / cell) - 1, i1 = Math.ceil((bu1 - f.uc) / cell);
  const j0 = Math.floor((bv0 - f.vc) / cell) - 1, j1 = Math.ceil((bv1 - f.vc) / cell);

  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      if (hash01(i, j, f.salt) > 0.62) continue;
      const r = cell * (0.08 + 0.52 * Math.pow(hash01(i, j, f.salt + 1), 2.4));
      const cu = f.uc + cell * (i + hash01(i, j, f.salt + 2));
      const cv = f.vc + cell * (j + hash01(i, j, f.salt + 3));
      if (!insideRegion(cu, cv, reg)) continue;
      if (B.open && Math.hypot(cu, cv) + r > B.R) continue;
      circleOnFace(f, cu, cv, r, reg, sink);
      if (r > 0.22 * cell) circleOnFace(f, cu, cv, 0.78 * r, reg, sink);
      if (r > 0.4 * cell) circleOnFace(f, cu, cv, 0.14 * r, reg, sink);
    }
  }
}

// A circle of radius r about (cu, cv) on a face, cut to the face's rectangle — and left
// out whole where it is too small on paper to read as a circle.
function circleOnFace(f, cu, cv, r, reg, sink) {
  if (!pieceShows(f, cu, cv, r, r)) return;
  const arcs = reg.rect
    ? circleInRect(r, reg.u0 - cu, reg.u1 - cu, reg.v0 - cv, reg.v1 - cv)
    : [[0, 2 * Math.PI]];
  for (const [a, b] of arcs) {
    begin(2, f.id, -1);
    onFace(f);
    C.ax += cu * f.U[0] + cv * f.V[0];
    C.ay += cu * f.U[1] + cv * f.V[1];
    C.az += cu * f.U[2] + cv * f.V[2];
    C.r = r; C.dr = r;
    C.s0 = a; C.s1 = b;
    C.n0 = Math.max(8, Math.ceil((b - a) / (Math.PI / 32)));
    C.closed = b - a > 2 * Math.PI - 1e-9;
    traceCurve(C, sink);
  }
}

// A forest of posts standing straight off the face, one to a tile but shaken off the
// lattice so that no two rows line up: on the floor they stand, from the ceiling they
// hang, out of the walls they stick.
//
// A post has no thickness, so nothing would ever hide one behind another, and towards
// the horizon they would pile up without end. So they hide one another the way trunks
// do. Seen from the ball, all of a post lies at one bearing about the face's normal, and
// it covers a range of angles off the plane through the ball parallel to the face —
// which is exactly the angle its line is walked by. Posts are taken nearest first; each
// is cut wherever it would come within the gap, on paper, of a post already standing at
// nearly the same bearing, and then goes into a table of bearings to hide the ones
// behind it in its turn.
function postCurves(f, B, sink) {
  const a = f.size, h = Math.max(0.01, settings.postH);
  const F = f.F, U = f.U, V = f.V;
  const pF = Math.hypot(F[0], F[1], F[2]);
  if (pF < 1e-9) return;
  const nx = -F[0] / pF, ny = -F[1] / pF, nz = -F[2] / pF;   // into the room
  const reg = faceRegion(f, B, postReach(f, B, a, h, nx, ny, nz));
  const [bu0, bu1, bv0, bv1] = regionBox(reg);
  if (!(bu1 > bu0 && bv1 > bv0)) return;

  const posts = [];
  const i0 = Math.floor((bu0 - f.uc) / a) - 1, i1 = Math.ceil((bu1 - f.uc) / a) + 1;
  const j0 = Math.floor((bv0 - f.vc) / a) - 1, j1 = Math.ceil((bv1 - f.vc) / a) + 1;
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const u = f.uc + a * (i + 0.8 * (hash01(i, j, f.salt) - 0.5));
      const v = f.vc + a * (j + 0.8 * (hash01(i, j, f.salt + 1) - 0.5));
      if (!insideRegion(u, v, reg)) continue;
      const d = Math.hypot(u, v);
      if (d > 1e-6) posts.push([d, u, v]);
    }
  }
  posts.sort((p, q) => p[0] - q[0]);

  const NB = 8192, bins = new Map(), dl = 1e-4;
  const binOf = th => ((Math.floor((th + Math.PI) / (2 * Math.PI) * NB) % NB) + NB) % NB;

  for (const [d, u, v] of posts) {
    // The post's line meets the plane through the ball parallel to the face at
    // u·U + v·V, its point nearest the ball; the face is pF behind that.
    const ax = u * U[0] + v * V[0], ay = u * U[1] + v * V[1], az = u * U[2] + v * V[2];
    const s0 = Math.atan2(-pF, d), s1 = Math.atan2(h - pF, d), th = Math.atan2(v, u);
    let vis = [[s0, s1]];

    if (LOD_ON) {
      // How far apart on paper, at the post's middle, one radian of bearing and one
      // radian along the post come out: the gap as a bearing, and as a margin along it.
      const sm = 0.5 * (s0 + s1);
      const at = (x, y, z, s) => {
        HD[0] = x * Math.cos(s) + d * nx * Math.sin(s);
        HD[1] = y * Math.cos(s) + d * ny * Math.sin(s);
        HD[2] = z * Math.cos(s) + d * nz * Math.sin(s);
        return toPaper() ? [PX, PY] : null;
      };
      const ur = d * Math.cos(th + dl), vr = d * Math.sin(th + dl);
      const p0 = at(ax, ay, az, sm);
      const p1 = at(ur * U[0] + vr * V[0], ur * U[1] + vr * V[1], ur * U[2] + vr * V[2], sm);
      const p2 = at(ax, ay, az, sm + dl);
      if (p0 && p1 && p2) {
        const wb = MIN_GAP * dl / Math.max(1e-12, Math.hypot(p1[0] - p0[0], p1[1] - p0[1]));
        const me = MIN_GAP * dl / Math.max(1e-12, Math.hypot(p2[0] - p0[0], p2[1] - p0[1]));
        const span = Math.min(NB >> 3, Math.ceil(wb / (2 * Math.PI) * NB));
        const b = binOf(th);
        for (let k = -span; k <= span && vis.length; k++) {
          const list = bins.get((b + k + NB) % NB);
          if (list) for (const [o0, o1] of list) vis = cutOut(vis, o0 - me, o1 + me);
        }
      }
      const b = binOf(th), list = bins.get(b);
      if (list) list.push([s0, s1]); else bins.set(b, [[s0, s1]]);
    }

    for (const [x0, x1] of vis) {
      if (x1 - x0 > 1e-9) lineCurve(ax, ay, az, nx, ny, nz, d * Math.tan(x0), d * Math.tan(x1),
                                    0, 0, 0, 0, f.id, sink, f, a, a);
    }
  }
}

// What is left of a set of intervals once [o0, o1] is taken out of them.
function cutOut(vis, o0, o1) {
  const out = [];
  for (const [a, b] of vis) {
    if (o1 <= a || o0 >= b) { out.push([a, b]); continue; }
    if (o0 > a) out.push([a, o0]);
    if (o1 < b) out.push([o1, b]);
  }
  return out;
}

// How far out from the foot of a face a post still comes out at least twice the gap long
// on paper, with room to spare — and on no more than about MAX_ELEMS tiles.
function postReach(f, B, a, h, nx, ny, nz) {
  const outer = regionMaxRadius(faceRegion(f, B, Infinity));
  const cap = Math.sqrt(MAX_ELEMS / Math.PI) * a;
  if (!LOD_ON) return Math.min(outer, cap);
  const F = f.F, U = f.U, V = f.V;
  let far = 0;
  for (let k = 0; k < 32; k++) {
    const th = 2 * Math.PI * (k + 0.5) / 32, cu = Math.cos(th), cv = Math.sin(th);
    for (let t = 0.5 * a; t <= outer; t *= 1.15) {
      const x = F[0] + t * (cu * U[0] + cv * V[0]);
      const y = F[1] + t * (cu * U[1] + cv * V[1]);
      const z = F[2] + t * (cu * U[2] + cv * V[2]);
      HD[0] = x; HD[1] = y; HD[2] = z;
      if (!toPaper()) continue;
      const px = PX, py = PY;
      HD[0] = x + h * nx; HD[1] = y + h * ny; HD[2] = z + h * nz;
      if (!toPaper()) continue;
      if (Math.hypot(PX - px, PY - py) >= 2 * MIN_GAP && t > far) far = t;
    }
  }
  return Math.min(outer, cap, 1.3 * far + a);
}

// The great circles of the icosahedron's fifteen mirror planes. A plane through the
// ball's centre meets a flat face in a straight line, so on every face the net is laid
// as straight lines, and it is only the mirror that joins them up into circles.
const NET_AXES = (() => {
  const t = (1 + Math.sqrt(5)) / 2, P = [];
  for (const a of [-1, 1]) for (const b of [-t, t]) P.push([0, a, b], [a, b, 0], [b, 0, a]);
  const axes = [];
  for (let i = 0; i < P.length; i++) {
    for (let j = i + 1; j < P.length; j++) {
      const d = Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1], P[i][2] - P[j][2]);
      if (Math.abs(d - 2) > 1e-9) continue;               // not an edge
      const m = [P[i][0] + P[j][0], P[i][1] + P[j][1], P[i][2] + P[j][2]];
      const l = Math.hypot(m[0], m[1], m[2]);
      m[0] /= l; m[1] /= l; m[2] /= l;
      if (!axes.some(q => Math.abs(Math.abs(q[0] * m[0] + q[1] * m[1] + q[2] * m[2]) - 1) < 1e-9)) {
        axes.push(m);
      }
    }
  }
  return axes;
})();

function netCurves(f, reg, sink) {
  const F = f.F, U = f.U, V = f.V;
  for (const n of NET_AXES) {
    const a = n[0] * U[0] + n[1] * U[1] + n[2] * U[2];
    const b = n[0] * V[0] + n[1] * V[1] + n[2] * V[2];
    const d = n[0] * F[0] + n[1] * F[1] + n[2] * F[2];
    const m2 = a * a + b * b;
    if (m2 < 1e-12) continue;              // the plane runs parallel to the face
    // the trace a·u + b·v = −d: its point nearest F, and the way it runs
    const pu = -d * a / m2, pv = -d * b / m2;
    const m = Math.sqrt(m2), du = -b / m, dv = a / m;
    const t = clipLineRegion(pu, pv, du, dv, reg);
    if (!t) continue;
    lineCurve(F[0] + pu * U[0] + pv * V[0], F[1] + pu * U[1] + pv * V[1],
              F[2] + pu * U[2] + pv * V[2],
              du * U[0] + dv * V[0], du * U[1] + dv * V[1], du * U[2] + dv * V[2],
              t[0], t[1], 0, 0, 0, -1, f.id, sink);
  }
}

// The twelve corners of the room. They are never thinned — there is only ever one of
// each.
function edgeCurves(B, sink) {
  const id = penId(settings.edgePen);
  for (const y of [B.y0, B.y1]) {
    for (const z of [B.z0, B.z1]) lineCurve(0, y, z, 1, 0, 0, B.x0, B.x1, 0, 0, 0, -1, id, sink);
  }
  for (const x of [B.x0, B.x1]) {
    for (const z of [B.z0, B.z1]) lineCurve(x, 0, z, 0, 1, 0, B.y0, B.y1, 0, 0, 0, -1, id, sink);
  }
  for (const x of [B.x0, B.x1]) {
    for (const y of [B.y0, B.y1]) lineCurve(x, y, 0, 0, 0, 1, B.z0, B.z1, 0, 0, 0, -1, id, sink);
  }
}

// The horizon of the open floor: the great circle of level directions, which is where
// the floor and the sky both run out.
function horizonCurve(sink) {
  begin(3, penId(settings.edgePen), -1);
  C.ux = 1; C.uy = 0; C.uz = 0;
  C.vx = 0; C.vy = 0; C.vz = 1;
  C.s0 = 0; C.s1 = 2 * Math.PI;
  C.n0 = 64;
  C.closed = true;
  traceCurve(C, sink);
}

// The outline of the ball, drawn on the sheet rather than looked up.
function rimShape(sink) {
  const st = Math.max(0.2, Math.sqrt(8 * Math.sqrt(SAG2) * BR));
  const m = Math.max(24, Math.ceil(2 * Math.PI * BR / st));
  rn = 0;
  for (let k = 0; k <= m; k++) {
    const a = 2 * Math.PI * (k % m) / m;
    pushPt(OX + BR * Math.cos(a), OY + BR * Math.sin(a), NO_GATE);
  }
  emitPath(RX, RY, RG, rn, false, true, sink, penId(settings.rimPen));
  rn = 0;
}

function cropMarkShapes(sink) {
  const [W, H] = paperDims();
  const step = Math.max(1, settings.cropMarkGap);
  const dot  = (x, y) => sink.dot(x, y, INK_MARK);
  const nx = Math.max(1, Math.ceil(W / step));
  const ny = Math.max(1, Math.ceil(H / step));

  for (let i = 0; i <= nx; i++) {           // top and bottom edges, corners included
    const x = W * i / nx;
    dot(x, 0);
    dot(x, H);
  }
  for (let j = 1; j < ny; j++) {            // the sides, the corners already placed
    const y = H * j / ny;
    dot(0, y);
    dot(W, y);
  }
}

function buildShapes() {
  computeConstants();

  const sink = makeSink();
  const pens = Math.round(clamp(settings.pens, 1, MAX_PENS));
  perPen = [];
  for (let i = 0; i < pens; i++) perPen.push({ strokes: 0, ink: 0 });

  const B = roomBox();
  for (const f of faces(B)) if (f.pat !== 'none') faceCurves(f, B, sink);
  if (!B.open && settings.edges) edgeCurves(B, sink);
  if (B.open && settings.horizon) horizonCurve(sink);
  if (settings.rim) rimShape(sink);
  if (settings.cropMarks) cropMarkShapes(sink);

  for (const id of sink.ink) if (id >= 0 && perPen[id]) perPen[id].strokes++;

  return {
    pts: Float64Array.from(sink.pts),
    off: Int32Array.from(sink.off),
    ink: Int32Array.from(sink.ink),
  };
}

////////////////////////////////////////////////////////////////////////////////////////
// Stroke order
//
// Greedy nearest-neighbour over stroke endpoints, either end allowed as the entry point,
// with a uniform bucket grid so the search stays local. One pen at a time, cut guides
// first: a multi-pen plot is run one pen at a time, and the pen should never have to come
// back to a colour it has already put down. vpype's linesort would redo this pass
// regardless, so it is here only to make the estimate honest and the preview readable.

function greedy(sh, ids, startX, startY) {
  const { pts, off } = sh;
  const n = ids.length;
  const order = new Int32Array(n);
  const flip  = new Uint8Array(n);
  if (!n) return { order, flip, px: startX, py: startY };

  const N  = 2 * n;
  const ex = new Float64Array(N);
  const ey = new Float64Array(N);
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;

  for (let i = 0; i < n; i++) {
    const g = ids[i];
    const a = off[g] * 2, b = (off[g + 1] - 1) * 2;
    ex[i * 2]     = pts[a];     ey[i * 2]     = pts[a + 1];
    ex[i * 2 + 1] = pts[b];     ey[i * 2 + 1] = pts[b + 1];
  }
  for (let e = 0; e < N; e++) {
    if (ex[e] < minx) minx = ex[e];
    if (ex[e] > maxx) maxx = ex[e];
    if (ey[e] < miny) miny = ey[e];
    if (ey[e] > maxy) maxy = ey[e];
  }

  const w    = Math.max(maxx - minx, 1e-6);
  const h    = Math.max(maxy - miny, 1e-6);
  const cell = Math.max(1e-3, Math.sqrt(w * h / N) * 1.5);
  const gw   = Math.floor(w / cell) + 1;
  const gh   = Math.floor(h / cell) + 1;
  const nb   = gw * gh;

  const eb = new Int32Array(N);           // bucket of every endpoint
  for (let e = 0; e < N; e++) {
    const cx = Math.min(gw - 1, (ex[e] - minx) / cell | 0);
    const cy = Math.min(gh - 1, (ey[e] - miny) / cell | 0);
    eb[e] = cy * gw + cx;
  }

  const start = new Int32Array(nb + 1);   // CSR buckets, no per-bucket arrays
  for (let e = 0; e < N; e++) start[eb[e] + 1]++;
  for (let k = 0; k < nb; k++) start[k + 1] += start[k];
  const items  = new Int32Array(N);
  const cursor = start.slice(0, nb);
  for (let e = 0; e < N; e++) items[cursor[eb[e]]++] = e;
  const left = new Int32Array(nb);        // live endpoints left per bucket
  for (let k = 0; k < nb; k++) left[k] = start[k + 1] - start[k];

  const used = new Uint8Array(n);
  let px = startX, py = startY, best = -1, bestD = Infinity;

  const scan = (cx, cy) => {
    if (cx < 0 || cx >= gw || cy < 0 || cy >= gh) return;
    const k = cy * gw + cx;
    if (left[k] === 0) return;
    for (let t = start[k]; t < start[k + 1]; t++) {
      const e = items[t];
      if (used[e >> 1]) continue;
      const dx = ex[e] - px, dy = ey[e] - py;
      const d  = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = e; }
    }
  };

  for (let done = 0; done < n; done++) {
    best = -1; bestD = Infinity;
    const ccx = Math.max(0, Math.min(gw - 1, (px - minx) / cell | 0));
    const ccy = Math.max(0, Math.min(gh - 1, (py - miny) / cell | 0));
    const maxRing = gw + gh;

    for (let ring = 0; ring <= maxRing; ring++) {
      if (best >= 0) {
        const reach = (ring - 1) * cell;
        if (reach > 0 && reach * reach > bestD) break;
      }
      const yTop = ccy - ring, yBot = ccy + ring;
      for (let cy = yTop; cy <= yBot; cy++) {
        if (cy === yTop || cy === yBot) {
          for (let cx = ccx - ring; cx <= ccx + ring; cx++) scan(cx, cy);
        } else {
          scan(ccx - ring, cy);
          scan(ccx + ring, cy);
        }
      }
    }
    if (best < 0) {                       // safety net; the ring walk should always find one
      for (let e = 0; e < N; e++) {
        if (used[e >> 1]) continue;
        const dx = ex[e] - px, dy = ey[e] - py;
        const d  = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = e; }
      }
    }

    const i = best >> 1;
    used[i] = 1;
    left[eb[i * 2]]--;
    left[eb[i * 2 + 1]]--;
    order[done] = ids[i];
    flip[done]  = best & 1;               // entered by the far end -> draw it reversed

    const exitE = i * 2 + (flip[done] ? 0 : 1);
    px = ex[exitE];
    py = ey[exitE];
  }

  return { order, flip, px, py };
}

function orderShapes(sh) {
  const n = sh.off.length - 1;
  const order = new Int32Array(n);
  const flip  = new Uint8Array(n);
  if (!n) return { order, flip, ink: 0, travel: 0 };

  const byInk = new Map();
  for (let i = 0; i < n; i++) {
    const id = sh.ink[i];
    const a = byInk.get(id);
    if (a) a.push(i); else byInk.set(id, [i]);
  }
  const ids = [...byInk.keys()].sort((a, b) => a - b);   // −1, the cut guides, first

  let px = 0, py = 0, at = 0;
  for (const id of ids) {
    const list = byInk.get(id);
    if (settings.optimiseOrder) {
      const g = greedy(sh, list, px, py);
      for (let t = 0; t < g.order.length; t++) { order[at] = g.order[t]; flip[at++] = g.flip[t]; }
      px = g.px; py = g.py;
    } else {
      for (const i of list) { order[at] = i; flip[at++] = 0; }
      const last = sh.off[list[list.length - 1] + 1] - 1;
      px = sh.pts[last * 2]; py = sh.pts[last * 2 + 1];
    }
  }
  return { order, flip, ...measurePlan(sh, order, flip) };
}

// How far the pen draws and how far it travels between strokes — per pen as well as
// altogether, since each colour is a separate pass with a pen of its own.
function measurePlan(sh, order, flip) {
  const { pts, off } = sh;
  let ink = 0, travel = 0, px = 0, py = 0;

  for (let t = 0; t < order.length; t++) {
    const i = order[t], rev = flip[t] === 1;
    const a = off[i], b = off[i + 1];
    const inA = rev ? b - 1 : a;
    const inB = rev ? a : b - 1;

    travel += Math.hypot(pts[inA * 2] - px, pts[inA * 2 + 1] - py);
    let run = 0;
    for (let k = a; k < b - 1; k++) {
      const ux = pts[(k + 1) * 2] - pts[k * 2], uy = pts[(k + 1) * 2 + 1] - pts[k * 2 + 1];
      run += Math.sqrt(ux * ux + uy * uy);
    }
    ink += run;
    const id = sh.ink[i];
    if (perPen && id >= 0 && perPen[id]) perPen[id].ink += run;
    px = pts[inB * 2];
    py = pts[inB * 2 + 1];
  }
  return { ink, travel };
}

////////////////////////////////////////////////////////////////////////////////////////
// Preview
//
// The strokes are drawn straight on the 2D context from the same polylines the SVG
// exports, in the order and the colours the plotter will use, so what you see is what it
// draws. The guides sit on top; they are not part of the plot.

function inkColor(id) {
  if (id === INK_MARK) return '#666';
  return settings['ink' + clamp(id, 0, MAX_PENS - 1)];
}

function drawPreview() {
  background(255);
  if (!area || area.w <= 0 || area.h <= 0) return;

  const s = previewScale();
  const ctx = drawingContext;

  if (shapes && plan) drawStrokes(ctx, s);
  if (settings.showGuides) drawGuides(ctx, s);
}

function drawStrokes(ctx, s) {
  const { pts, off } = shapes;
  const { order } = plan;

  ctx.save();
  ctx.scale(s, s);
  ctx.lineCap   = 'round';
  ctx.lineJoin  = 'round';
  ctx.lineWidth = settings.penWidth;

  // The plan already has one pen after another, so the colour changes a handful of times
  // however many strokes there are.
  let t = 0;
  while (t < order.length) {
    const id = shapes.ink[order[t]];
    ctx.strokeStyle = inkColor(id);
    ctx.beginPath();
    let held = 0;
    while (t < order.length && shapes.ink[order[t]] === id) {
      const i = order[t++];
      const a = off[i], b = off[i + 1];
      ctx.moveTo(pts[a * 2], pts[a * 2 + 1]);
      for (let k = a + 1; k < b; k++) ctx.lineTo(pts[k * 2], pts[k * 2 + 1]);
      if (++held >= 4000) { ctx.stroke(); ctx.beginPath(); held = 0; }
    }
    ctx.stroke();
  }
  ctx.restore();
}

// The outline of the ball when it is not being drawn, the line the reflection stops at
// when it is kept off the rim, and the middle of the disc — where the camera sees
// itself, and the one fixed point the room turns about while it is dragged.
function drawGuides(ctx, s) {
  if (!ball || ball.r <= 0) return;

  ctx.save();
  ctx.scale(s, s);
  ctx.strokeStyle = 'rgba(26, 109, 209, 0.85)';
  ctx.lineWidth = 0.45;
  ctx.setLineDash([2.5, 2.5]);
  if (!settings.rim) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (settings.rimGap > 0 && settings.rimGap < ball.r) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r - settings.rimGap, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.strokeStyle = 'rgba(178, 58, 0, 0.9)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(ball.x - 3, ball.y); ctx.lineTo(ball.x + 3, ball.y);
  ctx.moveTo(ball.x, ball.y - 3); ctx.lineTo(ball.x, ball.y + 3);
  ctx.stroke();
  ctx.restore();
}

////////////////////////////////////////////////////////////////////////////////////////
// Mouse and keys
//
// Dragging turns the camera round the ball as if the ball were a trackball under the
// cursor: across the sheet is yaw, up and down it is pitch, and a drag the width of the
// ball is half a turn. Shift-drag walks the ball across the floor of the room instead,
// and the wheel raises and lowers it.

function paperPoint(e) {
  const c = canvasEl();
  const r = c.getBoundingClientRect();
  const [W, H] = paperDims();
  return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
}

function attachPointer() {
  const c = canvasEl();
  if (!c) return;

  c.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !ball) return;
    const [x, y] = paperPoint(e);
    drag = { move: e.shiftKey && settings.scene === 'room', x, y,
             yaw: settings.yaw, pitch: settings.pitch, bx: settings.ballX, bz: settings.ballZ };
    c.classList.add('dragging');
    c.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  c.addEventListener('pointermove', e => {
    if (!drag) return;
    const [x, y] = paperPoint(e);
    if (drag.move) moveBall(x - drag.x, y - drag.y);
    else turnCamera(x - drag.x, y - drag.y);
    liveUpdate();
    e.preventDefault();
  });

  const end = e => {
    if (!drag) return;
    drag = null;
    c.classList.remove('dragging');
    update();
    if (e) e.preventDefault();
  };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', end);

  c.addEventListener('wheel', e => {
    const H = Math.max(0.1, settings.roomH);
    settings.ballH = +clamp(settings.ballH - e.deltaY * WHEEL_STEP * H, 0.01 * H, 0.99 * H).toFixed(3);
    if (setters.ballH) setters.ballH(settings.ballH);
    if (!liveUpdate()) settle();
    e.preventDefault();
  }, { passive: false });
}

function turnCamera(dx, dy) {
  const k = DRAG_DEG / Math.max(1, 2 * ball.r);
  settings.yaw = +wrapDeg(drag.yaw - dx * k).toFixed(1);
  settings.pitch = +clamp(drag.pitch + dy * k, -89, 89).toFixed(1);
  if (setters.yaw) { setters.yaw(settings.yaw); setters.pitch(settings.pitch); }
}

// Right on the sheet is the camera's own right, up the sheet is away from the camera,
// both laid flat on the floor; a drag the width of the ball crosses the room.
function moveBall(dx, dy) {
  const k = Math.max(settings.roomW, settings.roomD) / Math.max(1, 2 * ball.r);
  const ps = radians(settings.yaw), cp = Math.cos(ps), sp = Math.sin(ps);
  const wx = k * (dx * cp + dy * sp);
  const wz = k * (dy * cp - dx * sp);
  settings.ballX = +clamp(drag.bx + 100 * wx / Math.max(0.1, settings.roomW), 1, 99).toFixed(2);
  settings.ballZ = +clamp(drag.bz + 100 * wz / Math.max(0.1, settings.roomD), 1, 99).toFixed(2);
  if (setters.ballX) { setters.ballX(settings.ballX); setters.ballZ(settings.ballZ); }
}

function attachKeys() {
  window.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const step = e.shiftKey ? 10 : 1;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      settings.yaw = wrapDeg(settings.yaw + (e.key === 'ArrowLeft' ? step : -step));
      if (setters.yaw) setters.yaw(settings.yaw);
      update();
      e.preventDefault();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      settings.pitch = clamp(settings.pitch + (e.key === 'ArrowDown' ? step : -step), -89, 89);
      if (setters.pitch) setters.pitch(settings.pitch);
      update();
      e.preventDefault();
    } else if (e.key === 'r' || e.key === 'R') {
      settings.seed = Math.floor(Math.random() * 100000);
      if (setters.seed) setters.seed(settings.seed);
      update();
      e.preventDefault();
    } else if (e.key === '[' || e.key === ']') {
      settings.seed = Math.max(0, Math.round(settings.seed) + (e.key === ']' ? 1 : -1));
      if (setters.seed) setters.seed(settings.seed);
      update();
      e.preventDefault();
    } else if (e.key === 'g' || e.key === 'G') {
      settings.showGuides = !settings.showGuides;
      if (setters.showGuides) setters.showGuides(settings.showGuides);
      drawPreview();
      syncUrl();
      e.preventDefault();
    }
  });
}

////////////////////////////////////////////////////////////////////////////////////////
// The sidebar

function addSection(parent, title) {
  createDiv(title).parent(parent).class('section');
}

function setVisible(key, on) {
  if (fieldDivs[key]) fieldDivs[key].style('display', on ? '' : 'none');
}

// Whether any surface that is actually there is laid with one of these patterns.
function uses(...pats) {
  const s = settings;
  return pats.includes(s.floor) || pats.includes(s.ceiling) ||
         (s.scene === 'room' && pats.includes(s.walls));
}

function syncVisibility() {
  const s = settings;
  const open = s.scene === 'open';
  const pens = Math.round(clamp(s.pens, 1, MAX_PENS));
  const sized = p => !UNSIZED.includes(p);

  setVisible('cropMarkGap', s.cropMarks);
  setVisible('roomW', !open);
  setVisible('roomD', !open);
  setVisible('ballX', !open);
  setVisible('ballZ', !open);
  setVisible('reach', open);
  setVisible('walls', !open);
  setVisible('edges', !open);
  setVisible('horizon', open);
  setVisible('floorScale', sized(s.floor));
  setVisible('ceilingScale', sized(s.ceiling));
  setVisible('wallScale', !open && sized(s.walls));
  setVisible('rays', uses('rays', 'whirl'));
  setVisible('twist', uses('whirl'));
  setVisible('sides', uses('polygons'));
  setVisible('postH', uses('posts'));
  setVisible('seed', uses('cells', 'craters'));
  setVisible('ink1', pens > 1);
  setVisible('ink2', pens > 2);
  setVisible('floorPen', pens > 1);
  setVisible('ceilingPen', pens > 1);
  setVisible('wallPen', pens > 1 && !open);
  setVisible('edgePen', pens > 1 && (open ? settings.horizon : settings.edges));
  setVisible('rimPen', pens > 1 && settings.rim);
  refreshPenList();
}

function applyScene(sc) {
  Object.assign(settings, DEFAULTS, sc.s || {});
  refreshControls();
  resizeForPaper();
}

function resetAll() {
  Object.assign(settings, DEFAULTS);
  refreshControls();
  resizeForPaper();
}

function copyLink(btn) {
  const done = () => {
    btn.html('Copied');
    btn.addClass('copied');
    setTimeout(() => { btn.html('Copy link'); btn.removeClass('copied'); }, 1200);
  };
  // The clipboard API is blocked on file:// in some browsers, hence the old fallback.
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(location.href).then(done, () => legacyCopy(location.href, done));
  } else {
    legacyCopy(location.href, done);
  }
}

function legacyCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { /* nothing else to try */ }
  document.body.removeChild(ta);
}

// redrawOnly controls skip the whole pipeline — nothing about the strokes changes.
function addSlider(parent, labelText, key, min, max, step, hint, redrawOnly) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const row = createDiv('').parent(field).class('row');
  const sl  = createSlider(min, max, settings[key], step).parent(row);
  const num = createInput(String(settings[key])).parent(row);
  num.attribute('type', 'text');           // type=number rejects "." in a comma locale
  num.attribute('inputmode', 'decimal');
  if (hint) createDiv(hint).parent(field).class('note');

  const refresh = () => { if (redrawOnly) { drawPreview(); syncUrl(); } else update(); };
  setters[key] = v => { sl.value(v); num.value(String(v)); };

  sl.input(() => {
    settings[key] = Number(sl.value());
    num.value(String(settings[key]));
    if (redrawOnly) drawPreview(); else liveUpdate();
  });
  sl.changed(() => refresh());
  num.input(() => {
    const v = parseNum(num.value());
    if (v === null) return;
    settings[key] = clamp(v, min, max);
    sl.value(settings[key]);
    refresh();
  });
  return sl;
}

function addSelect(parent, labelText, key, options, onChange, hint) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const sel = createSelect().parent(field);
  for (const o of options) sel.option(o);
  sel.selected(settings[key]);
  if (hint) createDiv(hint).parent(field).class('note');
  setters[key] = v => sel.selected(v);
  sel.changed(() => { settings[key] = sel.value(); onChange(); });
  return sel;
}

function addCheckbox(parent, labelText, key, redrawOnly) {
  const row = createDiv('').parent(parent).class('checkbox-row');
  fieldDivs[key] = row;
  const cb = createCheckbox(labelText, settings[key]).parent(row);
  setters[key] = v => cb.checked(!!v);
  cb.changed(() => {
    settings[key] = cb.checked();
    syncVisibility();
    if (redrawOnly) { drawPreview(); syncUrl(); } else update();
  });
  return cb;
}

function addColor(parent, labelText, key) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const cp = createColorPicker(settings[key]).parent(field);
  setters[key] = v => cp.value(v);
  cp.input(() => {
    settings[key] = cp.value();
    refreshPenList();
    drawPreview();
    syncUrl();
  });
  return cp;
}

function addSeedField(parent) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs.seed = field;
  createSpan('Seed').parent(field).class('label');
  const row = createDiv('').parent(field).class('row');
  const num = createInput(String(settings.seed)).parent(row);
  num.attribute('type', 'text');
  num.attribute('inputmode', 'numeric');
  const btn = createButton('Roll').parent(row).class('inline-btn');
  createDiv('Which flagstones and which craters. <b>R</b> rolls a new one, <b>[</b> and ' +
    '<b>]</b> step through them.').parent(field).class('note');

  setters.seed = v => num.value(String(v));
  num.input(() => {
    const v = parseNum(num.value());
    if (v === null) return;
    settings.seed = clamp(Math.round(v), 0, 1e9);
    update();
  });
  btn.mousePressed(() => {
    settings.seed = Math.floor(Math.random() * 100000);
    num.value(String(settings.seed));
    update();
  });
}

function buildControls() {
  const root = select('#controls');
  const refit = () => { syncVisibility(); update(); };

  addSection(root, 'Scene');
  const sceneSel = createSelect().parent(createDiv('').parent(root).class('field'));
  for (const sc of SCENES) sceneSel.option(sc.label);
  sceneSel.changed(() => {
    const sc = SCENES[sceneSel.elt.selectedIndex];
    if (sc && sc.s) applyScene(sc);
    sceneSel.elt.selectedIndex = 0;
  });

  // --- Pen ---
  addSection(root, 'Pen');
  addSlider(root, 'Pen width (mm)', 'penWidth', 0.05, 2, 0.05,
    'The nib. It sets the line the preview and the SVG draw with, and it is taken off ' +
    'the margin so ink never reaches past it.');
  addSlider(root, 'Pens', 'pens', 1, MAX_PENS, 1,
    'Split the room between two or three colours — one pass of the plotter each. Which ' +
    'part goes to which pen is set under <b>Surfaces</b> and <b>Ball</b>.');
  addColor(root, 'Ink', 'ink0');
  addColor(root, 'Second pen', 'ink1');
  addColor(root, 'Third pen', 'ink2');

  // --- Paper ---
  addSection(root, 'Paper');
  addSelect(root, 'Size', 'paper', Object.keys(PAPER_SIZES), resizeForPaper);
  addSelect(root, 'Orientation', 'orientation', ['portrait', 'landscape'], resizeForPaper);
  addSlider(root, 'Margin (mm)', 'margin', 0, 60, 1);
  addCheckbox(root, 'Cut guide dots around the sheet', 'cropMarks');
  addSlider(root, 'Most between two dots (mm)', 'cropMarkGap', 20, 600, 5,
    'A dot in every corner, and each side split evenly so no gap is wider than this — ' +
    'lay a ruler through two dots and cut.');

  // --- The ball ---
  addSection(root, 'Ball');
  addSlider(root, 'Radius on paper (mm)', 'ballR', 0, 500, 1,
    'At 0 the ball fills the drawable box. Larger than that and it runs off the sheet, ' +
    'which is cut at the margin.');
  addCheckbox(root, 'Draw the rim', 'rim');
  addSlider(root, 'Rim pen', 'rimPen', 1, MAX_PENS, 1);
  addSlider(root, 'Keep off the rim (mm)', 'rimGap', 0, 20, 0.1,
    'The back half of the room is pressed into the band just inside the rim. This stops ' +
    'the reflection short of it and leaves a clean ring of paper instead.');

  // --- Camera ---
  addSection(root, 'Camera');
  addSlider(root, 'Turn (°)', 'yaw', -180, 180, 0.5,
    'The room spun about the vertical through the ball. Dragging across the sheet does ' +
    'the same.');
  addSlider(root, 'Height (°)', 'pitch', -89, 89, 0.5,
    'How far above the ball\'s equator the camera stands. At <b>0</b> the horizon is a ' +
    'straight line through the middle; above it closes into an oval round the sky, ' +
    'below it round the floor.');

  // --- The room ---
  addSection(root, 'Room');
  addSelect(root, 'Kind', 'scene', SCENE_KINDS, refit,
    '<b>room</b> — a box with a floor, a ceiling and four walls.<br>' +
    '<b>open</b> — the floor and the sky and nothing between them, both running out to ' +
    'the horizon.');
  addSlider(root, 'Width', 'roomW', 0.5, 100, 0.1);
  addSlider(root, 'Depth', 'roomD', 0.5, 100, 0.1);
  addSlider(root, 'Ceiling, or sky, height', 'roomH', 0.2, 60, 0.1);
  addSlider(root, 'Floor runs out to', 'reach', 5, 1000, 1,
    'How far the open floor and sky go before they stop. The thinning usually gives out ' +
    'long before this does.');
  addSlider(root, 'Ball height', 'ballH', 0.01, 60, 0.01,
    'Where the centre of the ball sits above the floor. The wheel over the sheet moves it.');
  addSlider(root, 'Ball across (%)', 'ballX', 1, 99, 0.5);
  addSlider(root, 'Ball deep (%)', 'ballZ', 1, 99, 0.5,
    'Where in the room the ball stands. Shift-drag on the sheet walks it about.');

  // --- Surfaces ---
  addSection(root, 'Surfaces');
  addSelect(root, 'Floor', 'floor', PATTERNS, refit);
  addSlider(root, 'Floor scale (× tile)', 'floorScale', 0.1, 20, 0.05);
  addSlider(root, 'Floor pen', 'floorPen', 1, MAX_PENS, 1);
  addSelect(root, 'Ceiling', 'ceiling', PATTERNS, refit);
  addSlider(root, 'Ceiling scale (× tile)', 'ceilingScale', 0.1, 20, 0.05);
  addSlider(root, 'Ceiling pen', 'ceilingPen', 1, MAX_PENS, 1);
  addSelect(root, 'Walls', 'walls', PATTERNS, refit);
  addSlider(root, 'Wall scale (× tile)', 'wallScale', 0.1, 20, 0.05);
  addSlider(root, 'Wall pen', 'wallPen', 1, MAX_PENS, 1);
  createDiv(
    '<b>grid</b> — square tiles; <b>stripes</b> — one family of them, along the room on ' +
    'the floor and the ceiling, upright on the walls; <b>diamonds</b> — the grid turned ' +
    'a quarter; <b>triangles</b> and <b>hexagons</b> — the other two ways to tile a ' +
    'floor.<br>' +
    '<b>bricks</b> — courses and staggered joints; <b>scales</b> — rows of half circles; ' +
    '<b>arches</b> — arcades, tier on tier; <b>cells</b> — flagstones; <b>craters</b> — ' +
    'a moon\'s worth of circles.<br>' +
    '<b>rings</b>, <b>polygons</b>, <b>spiral</b> — about the point nearest the ball; ' +
    '<b>rays</b>, <b>whirl</b> — out of it, straight or bent round.<br>' +
    '<b>posts</b> — a forest of sticks standing off the surface; <b>net</b> — the fifteen ' +
    'great circles of an icosahedron, drawn wherever they cross the room.')
    .parent(root).class('note');
  addSlider(root, 'Tile', 'tile', 0.05, 10, 0.05,
    'One piece of every pattern — a tile, the gap between two stripes or two rings, a ' +
    'brick\'s height, an arch\'s radius — in the same units as the room, and multiplied ' +
    'for each surface by its scale.');
  addSlider(root, 'Rays', 'rays', 4, 512, 1,
    'How many lines a <b>rays</b> or <b>whirl</b> surface fans out into. A power of two ' +
    'thins out the most evenly.');
  addSlider(root, 'Twist', 'twist', -6, 6, 0.05,
    'How hard a <b>whirl</b> bends its rays round: radians of turn for every time a ray ' +
    'gets e times further out. Negative turns the other way.');
  addSlider(root, 'Polygon sides', 'sides', 3, 16, 1);
  addSlider(root, 'Post height', 'postH', 0.05, 20, 0.05,
    'How far a <b>posts</b> post stands off its surface, in the units of the room.');
  addSeedField(root);
  addCheckbox(root, 'Draw the corners of the room', 'edges');
  addCheckbox(root, 'Draw the horizon', 'horizon');
  addSlider(root, 'Corner and horizon pen', 'edgePen', 1, MAX_PENS, 1);

  // --- The far away ---
  addSection(root, 'Far away');
  addSlider(root, 'Closest two lines may come (mm)', 'minGap', 0, 5, 0.05,
    'Where perspective or the rim squeezes a family together, its lines give out one ' +
    'by one — the odd ones first, then every other one of those left — so they never ' +
    'close up tighter than this on paper. A pattern made of pieces drops every piece ' +
    'that comes out smaller than this instead, and posts hide the ones behind them. At ' +
    '<b>0</b> nothing is thinned and every family runs on into its vanishing point.');
  addSlider(root, 'Curve tolerance (mm)', 'sag', 0.005, 0.2, 0.005,
    'How far a straight piece of stroke may cut the corner of the curve it stands for. ' +
    'Most pieces are held short by a cap on their length anyway, so going finer costs ' +
    'little.');

  // --- Output ---
  addSection(root, 'Output');
  addSlider(root, 'Simplify (mm)', 'simplifyTol', 0, 0.5, 0.01,
    'How far a thinned stroke may stray from the traced one.');
  addCheckbox(root, 'Order the strokes for the plotter', 'optimiseOrder');
  addCheckbox(root, 'Follow the sliders live', 'liveUpdate');
  addCheckbox(root, 'Show the guides', 'showGuides', true);
  addSelect(root, 'SVG', 'svgOutput', SVG_OUTPUTS, () => syncUrl(),
    'With more than one pen, a file per colour is one plot each.');

  createButton('Export SVG').parent(root).class('primary').mousePressed(exportSvg);
  const row = createDiv('').parent(root).class('btn-row');
  createButton('Copy link').parent(row).mousePressed(function () { copyLink(this); });
  createButton('Reset').parent(row).mousePressed(resetAll);

  addSection(root, 'The sheet');
  statsDiv = createDiv('').parent(root).class('stats');
  penListDiv = createDiv('').parent(root).class('stats');
  const keys = createDiv('').parent(root).class('note keys');
  keys.html(
    '<div><kbd>drag</kbd> turn the room · <kbd>shift</kbd>+<kbd>drag</kbd> walk the ball</div>' +
    '<div><kbd>wheel</kbd> ball height · <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> ' +
    'turn by 1°, with <kbd>shift</kbd> by 10°</div>' +
    '<div><kbd>R</kbd> new seed · <kbd>[</kbd> <kbd>]</kbd> step it · <kbd>G</kbd> guides</div>');
  linkDiv = createDiv('').parent(root).class('link');

  syncVisibility();
}

// One row per plot pass, since each is a separate sitting at the plotter with a
// different pen in the holder.
function refreshPenList() {
  if (!penListDiv) return;
  const pens = Math.round(clamp(settings.pens, 1, MAX_PENS));
  if (pens < 2 || !perPen) { penListDiv.html(''); return; }

  let html = '';
  for (let i = 0; i < pens; i++) {
    const p = perPen[i] || { strokes: 0, ink: 0 };
    if (!p.strokes) continue;
    html += `<div class="pen-row"><span class="sw" style="background:${inkColor(i)}"></span>` +
      `<span>pen ${i + 1} — <b>${groupNum(p.strokes)}</b> strokes, ` +
      `<b>${(p.ink / 1000).toFixed(1)}</b> m, ` +
      `${formatDuration(p.strokes * PEN_CYCLE_S + p.ink / DRAW_SPEED)}</span></div>`;
  }
  penListDiv.html(html);
}

////////////////////////////////////////////////////////////////////////////////////////
// What the sheet costs

function updateStats() {
  if (!statsDiv) return;

  if (!area || area.w <= 0 || area.h <= 0) {
    statsDiv.html(`<div class="warn">The margin leaves nothing to draw on. ` +
      `Lower it, or use larger paper.</div>`);
    refreshPenList();
    return;
  }

  if (lastCurves > MAX_CURVES) {
    statsDiv.html(
      `<div class="warn">${groupNum(lastCurves)} curves to trace — past the ` +
      `${groupNum(MAX_CURVES)} limit, so nothing was drawn.<br>Make the tile larger or ` +
      `the room smaller.</div>`);
    refreshPenList();
    return;
  }

  if (!plan || !shapes) {
    statsDiv.html(
      `<div class="warn">${groupNum(strokes)} strokes — past the ${groupNum(MAX_STROKES)} ` +
      `limit, so nothing was ordered or drawn.<br>Make the tile larger or let the lines ` +
      `thin out sooner.</div>`);
    refreshPenList();
    return;
  }

  const seconds = strokes * PEN_CYCLE_S + plan.ink / DRAW_SPEED + plan.travel / TRAVEL_SPEED;
  const disc = Math.PI * ball.r * ball.r;
  const cover = disc > 0 ? clamp(plan.ink * settings.penWidth / disc, 0, 1) : 0;
  const pts = shapes.off[shapes.off.length - 1];

  let html =
    `<div class="big"><b>${groupNum(strokes)}</b> strokes, ` +
    `<b>${(plan.ink / 1000).toFixed(1)}</b> m of line</div>` +
    `<div>${groupNum(curves)} curves traced, ${groupNum(maps)} lookups on the ball, ` +
    `${groupNum(pts)} points kept</div>` +
    `<div>Pen up for ${(plan.travel / 1000).toFixed(1)} m between strokes</div>` +
    `<div>Ink covers <b>${(100 * cover).toFixed(0)} %</b> of the ball</div>` +
    `<div>Roughly <b>${formatDuration(seconds)}</b> to plot · ${lastMs.toFixed(0)} ms to build</div>`;

  if (truncated) {
    html += `<div class="warn">The walk stopped after ${groupNum(MAX_MAPS)} lookups and ` +
      `part of the room is missing. Make the tile larger, let the lines thin out sooner ` +
      `or loosen the curve tolerance.</div>`;
  }
  if (settings.minGap <= 0) {
    html += `<div class="warn">Nothing is thinned: every family runs on into its ` +
      `vanishing point and the back of the room into the rim, where the lines lie on top ` +
      `of one another. Expect solid ink there and a nib that wears through the paper.</div>`;
  } else if (settings.minGap < settings.penWidth) {
    html += `<div class="warn">Lines may close up to ${settings.minGap} mm and the nib is ` +
      `${settings.penWidth} mm: where they converge they will run together into solid ink. ` +
      `Twice the nib — ${(2 * settings.penWidth).toFixed(2)} mm — is where lines stay ` +
      `lines.</div>`;
  }
  if (cover > 0.5) {
    html += `<div class="warn">${(100 * cover).toFixed(0)} % of the ball ends up under ink. ` +
      `Widen the gap the lines keep, or take a finer nib.</div>`;
  }
  if (strokes > BUSY_STROKES) {
    html += `<div class="warn">${groupNum(strokes)} strokes is a long sitting at the ` +
      `plotter.</div>`;
  }
  if (maps > BUSY_MAPS) {
    html += `<div class="dim">Too much to follow a drag live — the room waits for the ` +
      `mouse to come up.</div>`;
  }

  statsDiv.html(html);
  refreshPenList();
}

////////////////////////////////////////////////////////////////////////////////////////
// SVG
//
// One group per pen, no fills, no background rectangle — everything in the file is meant
// to be plotted. stroke-width is the pen width and the caps are round, so the file
// previews exactly as the finished plot looks. Strokes come out in the order the pen
// should visit them, each already flipped to the end it should be entered from, and the
// link that rebuilds the sheet is written into the header comment.

function metaComment() {
  const s = settings;
  const open = s.scene === 'open';
  const where = open
    ? `open reach=${s.reach} sky=${s.roomH}`
    : `room ${s.roomW}x${s.roomD}x${s.roomH} ball@${s.ballX},${s.ballZ}%`;
  const laid = (p, k) => p + (UNSIZED.includes(p) ? '' : '×' + k);
  const extra =
    `${uses('rays', 'whirl') ? ' rays=' + s.rays : ''}` +
    `${uses('whirl') ? ' twist=' + s.twist : ''}` +
    `${uses('polygons') ? ' sides=' + s.sides : ''}` +
    `${uses('posts') ? ' posts=' + s.postH : ''}` +
    `${uses('cells', 'craters') ? ' seed=' + s.seed : ''}`;
  return `mirror spheres — ${where} ball-height=${s.ballH} ` +
    `yaw=${s.yaw}° pitch=${s.pitch}° ` +
    `floor=${laid(s.floor, s.floorScale)} ceiling=${laid(s.ceiling, s.ceilingScale)}` +
    `${open ? '' : ' walls=' + laid(s.walls, s.wallScale)} ` +
    `tile=${s.tile}${extra} ` +
    `${open ? (s.horizon ? 'horizon ' : '') : (s.edges ? 'edges ' : '')}` +
    `gap=${s.minGap}mm sag=${s.sag}mm ` +
    `ball=${s.ballR > 0 ? s.ballR + 'mm' : 'fit'}${s.rim ? '/rim' : ''}` +
    `${s.rimGap > 0 ? '/clear' + s.rimGap + 'mm' : ''} ` +
    `pens=${s.pens} simplify=${s.simplifyTol}mm ` +
    `${s.cropMarks ? 'cropmarks<=' + s.cropMarkGap + 'mm ' : ''}` +
    `pen=${s.penWidth}mm strokes=${strokes}`;
}

// The strokes of one pen, in plot order, as one <g>.
function svgGroup(keep, colour) {
  const { pts, off } = shapes;
  const { order, flip } = plan;
  const f = n => String(+n.toFixed(3));
  const CHUNK = 400;                       // subpaths per <path>, keeps the DOM small

  let body = '', d = '', held = 0, count = 0;
  for (let t = 0; t < order.length; t++) {
    const i = order[t];
    if (!keep(i)) continue;
    const rev = flip[t] === 1;
    const a = off[i], b = off[i + 1];
    const n = b - a;
    count++;

    let k  = rev ? b - 1 : a;
    let px = pts[k * 2], py = pts[k * 2 + 1];
    d += `M${f(px)},${f(py)}`;
    for (let m = 1; m < n; m++) {
      k += rev ? -1 : 1;
      const x = pts[k * 2], y = pts[k * 2 + 1];
      if (y === py)      d += `h${f(x - px)}`;
      else if (x === px) d += `v${f(y - py)}`;
      else               d += `l${f(x - px)},${f(y - py)}`;
      px = x; py = y;
    }
    if (++held >= CHUNK) { body += `  <path d="${d}"/>\n`; d = ''; held = 0; }
  }
  if (d) body += `  <path d="${d}"/>\n`;
  if (!count) return null;

  return {
    count,
    body: `<g fill="none" stroke="${colour}" stroke-width="${f(settings.penWidth)}" ` +
      `stroke-linecap="round" stroke-linejoin="round">\n${body}</g>\n`,
  };
}

// The pens this sheet actually needs, in the order the plotter should run them.
function passList() {
  const out = [];
  const pens = Math.round(clamp(settings.pens, 1, MAX_PENS));
  for (let i = 0; i < pens; i++) {
    if (!perPen || !perPen[i] || !perPen[i].strokes) continue;
    out.push({ tag: pens > 1 ? 'pen' + (i + 1) : 'ball', colour: inkColor(i),
               keep: j => shapes.ink[j] === i });
  }
  return out;
}

// The whole sheet, or one pen of it. The cut guides are in every file — they are what
// lines the passes up on the paper.
function svgFile(pass) {
  const [W, H] = paperDims();
  const list = pass ? [pass] : passList();
  const groups = [];

  if (settings.cropMarks) {
    groups.push([i => shapes.ink[i] === INK_MARK, (list[0] && list[0].colour) || '#000000']);
  }
  for (const p of list) groups.push([p.keep, p.colour]);

  let body = '', count = 0;
  for (const [keep, col] of groups) {
    const g = svgGroup(keep, col);
    if (!g) continue;
    body += g.body;
    count += g.count;
  }
  if (!count) return null;

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- ${metaComment()}${pass ? ' pass=' + pass.tag : ''} -->\n` +
    `<!-- ${location.origin === 'null' ? '' : location.origin}${location.pathname}` +
    `#${encodeState()} -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n` +
    body +
    `</svg>\n`;
}

function exportSvg() {
  if (!shapes || !plan || !strokes) {
    alert('Nothing to export — the ball is not showing anything on this sheet.');
    return;
  }

  const list = passList();
  const out = settings.svgOutput;
  const parts = out === 'one file' ? [null]
    : out === 'one file per pen' ? list
    : [null, ...list];

  const stem = `mirror ${settings.scene} yaw${settings.yaw} pitch${settings.pitch} ` +
    `${settings.paper}-${settings.orientation}`;
  const stamp = timestamp();

  for (const pass of parts) {
    const svg = svgFile(pass);
    if (!svg) continue;
    const tag = pass ? ` ${pass.tag}` : '';
    saveStrings([svg], `${stem}${tag} pen${settings.penWidth} ${stamp}`, 'svg');
  }
}
