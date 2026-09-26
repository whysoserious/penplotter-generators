////////////////////////////////////////////////////////////////////////////////////////
// Dissolving blocks — a solid cut into boxes and coming apart, drawn as lines
//
// Take a solid — a block, a tower on a plinth, a ziggurat, a city of lots, an arch, a
// round tower, a ring, a ball — and cut it into boxes the way a k-d tree cuts space:
// split it across one axis at a whole number of cells, then split each half, and so on
// until every piece is small enough. The pieces come out of every size, tall and thin
// wherever the height allows it, and each of their faces lines up with a whole field of
// others, which is what makes the mass read as a city and not as rubble.
//
// Then let it come apart. A front runs through the mass in one direction, ragged with
// noise. Behind it everything stands, past it everything is gone, and in between the
// boxes come loose: the further through the front a box is, the finer it was cut, the
// likelier it is to be gone and the further it has drifted and shrunk. The solid breaks
// up into a spray of smaller and smaller pieces that thin out as they fly.
//
// Drawn with a pen, all of that is a question of hidden lines. The view is a parallel
// projection — axonometric, military or oblique — so every ray towards the viewer runs
// the same way, c, and a point P is hidden by a box exactly when P + s·c lands inside
// that box for some s > 0. Along a straight segment A + t·(B − A) that is a pair of
// linear unknowns, t and s, held in by the six planes of the box: the hidden stretch of
// the segment is the shadow of a small convex polygon on the t axis, worked out in
// closed form, with no sampling and no bisection. Every edge and every hatch line is
// cut by the boxes that could stand in front of it, and what is left is what the pen
// draws.
//
// The sides are hatched with straight lines at a spacing measured on paper and the tops
// are left bare, the way an ink drawing of a city is; which faces get which lines is up
// to the sidebar. The camera is turned by dragging the sheet, everything else lives in
// the sidebar and in the URL, so a plot is reproduced by pasting its link.
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};

const SHAPES       = ['tower on plinth', 'block', 'steps', 'city', 'courtyard', 'arch',
                      'cylinder', 'ring', 'ball', 'blob'];
const DISSOLVES    = ['none', 'toward', 'outward', 'noise'];
const PROJECTIONS  = ['axonometric', 'military', 'oblique'];
const SIDE_HATCHES = ['none', 'vertical', 'horizontal', 'grid', 'diagonal', 'crosshatch',
                      'solid'];
const TOP_HATCHES  = ['none', 'along left', 'along right', 'grid', 'diagonal', 'crosshatch',
                      'solid'];
const HATCH_PHASES = ['per face', 'lattice'];
const EDGE_MODES   = ['every edge', 'outline', 'none'];
const SVG_OUTPUTS  = ['one file', 'one file per pen', 'both'];

const MAX_PENS       = 3;
const INK_MARK       = -1;        // cut guides: drawn with every pen
const MAX_BOXES      = 60_000;    // pieces the mass may be cut into before the cutting stops
const MAX_STROKES    = 400_000;   // past this nothing is ordered, drawn or exported
const BUSY_STROKES   = 80_000;    // above this, warn about the plot time
const FACE_EPS       = 1e-4;      // a face turned further away than this is seen edge-on
const HIDE_EPS       = 1e-7;      // cells — how far a box is shrunk before it hides anything
const MERGE_MM       = 1e-3;      // mm — two edges this close on paper are the same line
const FILL_MIN       = 0.01;      // mm — the shortest piece of a solid face still drawn
const MIN_BOX_MM     = 0.2;       // mm — a box thinner than this on paper is not drawn
const EPS            = 0.01;      // mm — the stub that stands in for a single dot
const PREVIEW_MAX_PX = 1500;      // preview canvas resolution (paper is in mm)
const MAX_PREVIEW_W  = 900;       // on-screen size of that canvas
const MAX_PREVIEW_H  = 700;
const LIVE_BUDGET_MS = 150;       // slower than this and a drag shows the boxes only
const DRAG_DEG_PX    = 0.35;      // camera degrees per screen pixel of drag
const WHEEL_ZOOM     = 0.0015;    // zoom factor per wheel delta unit, as an exponent
const MIN_ZOOM       = 10;        // %
const MAX_ZOOM       = 1000;      // %
const SETTLE_MS      = 250;       // after the last wheel step, everything is drawn again
const PEN_CYCLE_S    = 0.3;       // rough pen-up + pen-down time, seconds
const DRAW_SPEED     = 60;        // rough drawing speed, mm/s
const TRAVEL_SPEED   = 150;       // rough pen-up travel speed, mm/s

const settings = {
  // paper + pen
  paper: 'A4',
  orientation: 'portrait',
  margin: 15,
  penWidth: 0.3,

  // cut guides — dots on the edge of the sheet, for trimming an oversized plot back
  cropMarks: false,
  cropMarkGap: 400,     // mm — the most that is ever left between two marks

  // the solid, in cells — only the ratios matter, the fit sizes it to the sheet
  shape: 'tower on plinth',
  massW: 48,            // across (x)
  massD: 48,            // deep (z)
  massH: 130,           // up (y)
  plinthH: 22,          // % of the height the plinth takes
  towerW: 80,           // % of the plinth the tower stands on, across
  towerD: 70,           // and deep
  towerX: 100,          // % — where on the plinth it stands, across
  towerZ: 0,            // and deep
  tiers: 5,             // of `steps`
  lots: 4,              // of a `city`, along each side
  street: 3,            // cells between two lots
  wall: 26,             // % — the piers of an `arch`, the walls of a `courtyard`, a `ring`
  blobSize: 20,         // cells — the lumps of a `blob`
  blobFill: 50,         // % — how full of itself a `blob` is

  // the boxes it is cut into
  seed: 1,
  minBox: 1,            // cells — the smallest a box may be, every way
  maxBox: 8,            // cells — the widest a box may be where the solid stands
  maxTall: 24,          // cells — and the tallest
  variety: 0.45,        // chance a box already small enough is cut once more anyway
  porosity: 5,          // % of the standing boxes left out
  unevenTops: 30,       // % of its height a box may fall short of the one above
  gap: 0.6,             // mm on paper between two neighbouring boxes

  // coming apart
  dissolve: 'toward',
  towardAz: 310,        // deg — which way the front runs, on the camera's compass
  towardEl: 18,         // deg — and how far up
  frontAt: 35,          // % of the way through the mass where the front begins
  frontDepth: 60,       // % of the mass it takes to go from standing to gone
  ragged: 0.4,          // how far noise pushes the front back and forth
  noiseSize: 12,        // cells — the lumps in it
  crumble: 0.85,        // how much finer the boxes are cut as they come loose
  drift: 50,            // % of the mass — how far the loosest boxes fly
  scatter: 22,          // % of the mass — how far they stray off that line
  shrink: 0.6,          // how much a loose box shrinks
  thinning: 1.6,        // how fast the loose boxes thin out

  // the camera — a parallel projection, so a line is the same weight near and far
  projection: 'axonometric',
  azimuth: 45,          // deg round the vertical
  elevation: 35.26,     // deg above the horizon — with azimuth 45°, true isometric
  heightScale: 1,       // military: how tall one cell of height is drawn
  obliqueAngle: 45,     // deg — oblique: the way depth runs off on paper
  obliqueDepth: 0.5,    // oblique: how long one cell of depth is drawn
  zoom: 100,            // % — 100 fits every box that is left inside the margin
  panX: 0,              // mm at 100 % — the point brought to the middle of the sheet
  panY: 0,

  // hatching
  topHatch: 'none',
  topSpacing: 1,        // mm between two lines, on paper
  leftHatch: 'vertical',
  leftSpacing: 0.8,
  rightHatch: 'vertical',
  rightSpacing: 0.8,
  hatchPhase: 'per face',
  hatchJoin: false,     // run the lines of a face into zigzags along its edges
  solidGap: 85,         // % of the nib between two passes over a `solid` face
  edges: 'every edge',
  minStroke: 0.3,       // mm — a piece of line shorter than this is left out

  // pens
  pens: 1,
  edgePen: 1,
  topPen: 1,
  leftPen: 1,
  rightPen: 1,
  loosePen: 0,          // 0 — the loose boxes are drawn like the rest
  looseAt: 25,          // % through the front a box has to be to count as loose
  looseHatch: true,     // hatch the loose boxes too, or leave them outlined
  ink0: '#000000',
  ink1: '#b23a00',
  ink2: '#1a6dd1',
  paperColor: '#ffffff',   // the preview only — the file has no background

  // output
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
  { label: 'Dissolving tower', s: {} },
  { label: 'White pen on black paper', s: { paperColor: '#1d1d1f', ink0: '#f2f1ea' } },
  { label: 'Downtown blowing away', s: {
      orientation: 'landscape', shape: 'city', massW: 64, massD: 64, massH: 40, lots: 5,
      street: 3, maxBox: 5, maxTall: 12, towardAz: 315, towardEl: 15, frontAt: 40,
      frontDepth: 70, drift: 35 } },
  { label: 'Exploding block', s: {
      shape: 'block', massW: 36, massD: 36, massH: 40, maxTall: 10, dissolve: 'outward',
      frontAt: 55, frontDepth: 45, drift: 70, scatter: 18, ragged: 0.25 } },
  { label: 'Ziggurat going up', s: {
      orientation: 'landscape', shape: 'steps', massW: 60, massD: 60, massH: 34, tiers: 6,
      maxTall: 8, towardAz: 0, towardEl: 90, frontAt: 40, frontDepth: 70, drift: 50,
      scatter: 14 } },
  { label: 'Asteroid', s: {
      shape: 'ball', massW: 36, massD: 36, massH: 36, maxBox: 6, maxTall: 6,
      dissolve: 'noise', frontAt: 50, frontDepth: 35, ragged: 0.15, noiseSize: 10,
      drift: 30, scatter: 25, towardAz: 300, towardEl: 20 } },
  { label: 'Ruined arch', s: {
      orientation: 'landscape', shape: 'arch', massW: 64, massD: 12, massH: 56, wall: 24,
      maxBox: 4, maxTall: 8, dissolve: 'noise', frontAt: 62, frontDepth: 25, ragged: 0.1,
      noiseSize: 9, drift: 25, towardAz: 300, towardEl: 50, azimuth: 30 } },
  { label: 'Courtyard in the wind', s: {
      orientation: 'landscape', shape: 'courtyard', massW: 56, massD: 56, massH: 22,
      wall: 20, maxBox: 5, maxTall: 10, towardAz: 225, towardEl: 25, frontAt: 45,
      frontDepth: 60, drift: 45 } },
  { label: 'Round tower', s: {
      shape: 'cylinder', massW: 44, massD: 44, massH: 120, maxBox: 6, maxTall: 20,
      frontAt: 50, frontDepth: 50 } },
  { label: 'Ring', s: {
      orientation: 'landscape', shape: 'ring', massW: 72, massD: 72, massH: 16, wall: 16,
      maxBox: 5, maxTall: 8, elevation: 40, dissolve: 'noise', frontAt: 55, frontDepth: 30,
      noiseSize: 10, drift: 35, towardAz: 300, towardEl: 30 } },
  { label: 'Cloud', s: {
      shape: 'blob', massW: 56, massD: 56, massH: 44, blobSize: 18, maxBox: 4,
      maxTall: 6, dissolve: 'outward', frontAt: 30, frontDepth: 50, drift: 45,
      scatter: 20 } },
  { label: 'Solid, only cut', s: { dissolve: 'none', porosity: 0, unevenTops: 0 } },
  { label: 'Storeys', s: {
      leftHatch: 'horizontal', rightHatch: 'horizontal', leftSpacing: 1.2,
      rightSpacing: 1.2 } },
  { label: 'Inked tops', s: { topHatch: 'solid' } },
  { label: 'Lit from the right', s: {
      leftHatch: 'crosshatch', leftSpacing: 1.1, rightHatch: 'vertical',
      rightSpacing: 1.6 } },
  { label: 'Military view', s: { projection: 'military', azimuth: 30, heightScale: 0.85 } },
  { label: 'Cabinet view', s: { projection: 'oblique', obliqueAngle: 40, obliqueDepth: 0.5,
      towardAz: 270, towardEl: 20 } },
  { label: 'Loose boxes in a second pen', s: { pens: 2, loosePen: 2, looseAt: 30 } },
  { label: 'Spray in outline', s: { looseHatch: false, looseAt: 20 } },
];

const setters   = {};        // settings key -> function that moves its control
const fieldDivs = {};        // settings key -> the .field wrapper, for showing/hiding
let statsDiv, linkDiv, penListDiv;

let area    = null;          // { x0, y0, x1, y1, w, h } — the drawable box, in mm
let shapes  = null;          // { pts, off, ink } — polylines in mm
let strokes = 0;             // how many of them, even when there are too many to draw
let plan    = null;          // { order, flip, ink, travel }
let perPen  = null;          // per pen: { strokes, ink }
let counts  = null;          // what the hidden-line pass found, for the stats
let lastMs  = 0;
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

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// A hash of a box's six cell coordinates, for the choices the box makes about itself —
// whether it is cut again and where, whether it stays, how far it flies. Every choice is
// looked up from the box's own cells, the seed and what the choice is for, so none of
// them depends on the order the boxes are visited in, and nudging one setting leaves the
// boxes it does not reach exactly as they were.
let SEED_MIX = 0;

function mixIn(h, k) {
  k = Math.imul(k | 0, 0xcc9e2d51);
  k = (k << 15) | (k >>> 17);
  k = Math.imul(k, 0x1b873593);
  h ^= k;
  h = (h << 13) | (h >>> 19);
  return (Math.imul(h, 5) + 0xe6546b64) | 0;
}

function hashBox(a, b, c, d, e, f, salt) {
  let h = SEED_MIX ^ Math.imul(salt, 0x9e3779b1);
  h = mixIn(h, a); h = mixIn(h, b); h = mixIn(h, c);
  h = mixIn(h, d); h = mixIn(h, e); h = mixIn(h, f);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

////////////////////////////////////////////////////////////////////////////////////////
// The URL is the document
//
// Every setting that differs from its default is written into the hash, debounced, with
// replaceState so the back button stays usable. Opening that link anywhere rebuilds the
// same sheet — the seed is in there too, so nothing is left to chance.

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
  const [a, b] = PAPER_SIZES[settings.paper] || PAPER_SIZES.A4;
  return settings.orientation === 'portrait' ? [a, b] : [b, a];
}

// The pen is round, so ink reaches half a pen width past the end of every line: the
// drawable box is the sheet less the margin less that half width.
function drawArea() {
  const [W, H] = paperDims();
  const m = settings.margin + settings.penWidth / 2;
  return { x0: m, y0: m, x1: W - m, y1: H - m, w: W - 2 * m, h: H - 2 * m };
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
  strokes = 0;
  shapes = plan = perPen = counts = null;
  const st = ensureStructure();

  if (area.w > 0 && area.h > 0 && st.n > 0) {
    makeView();
    fitView(st);
    placeBoxes(st);
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
// up, the drag shows the boxes alone and the lines wait for the mouse to come up.
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
  settleTimer = setTimeout(() => { settleTimer = null; update(); }, SETTLE_MS);
}

////////////////////////////////////////////////////////////////////////////////////////
// Noise
//
// Improved Perlin in three dimensions, seeded, and a few octaves of it summed. It
// roughens the front, shapes a blob and, for the `noise` dissolve, decides on its own
// which parts of the solid go first.

function fade3(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

function grad3(h, x, y, z) {
  h &= 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : (h === 12 || h === 14) ? x : z;
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

function makePerlin3(seed) {
  const rnd = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  const P = new Uint8Array(512);
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];

  return function (x, y, z) {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    x -= X; y -= Y; z -= Z;
    const xi = X & 255, yi = Y & 255, zi = Z & 255;
    const u = fade3(x), v = fade3(y), w = fade3(z);
    const A = P[xi] + yi, AA = P[A] + zi, AB = P[A + 1] + zi;
    const B = P[xi + 1] + yi, BA = P[B] + zi, BB = P[B + 1] + zi;
    const x1 = x - 1, y1 = y - 1, z1 = z - 1;
    const l00 = grad3(P[AA], x, y, z),  l10 = grad3(P[BA], x1, y, z);
    const l01 = grad3(P[AB], x, y1, z), l11 = grad3(P[BB], x1, y1, z);
    const m00 = grad3(P[AA + 1], x, y, z1),  m10 = grad3(P[BA + 1], x1, y, z1);
    const m01 = grad3(P[AB + 1], x, y1, z1), m11 = grad3(P[BB + 1], x1, y1, z1);
    const a0 = l00 + u * (l10 - l00), a1 = l01 + u * (l11 - l01);
    const b0 = m00 + u * (m10 - m00), b1 = m01 + u * (m11 - m01);
    const a = a0 + v * (a1 - a0), b = b0 + v * (b1 - b0);
    return a + w * (b - a);
  };
}

// Three octaves, each half the size and half the weight of the last, brought up to about
// ±1 — plain Perlin rarely strays past ±0.7.
function fbm3(nz, x, y, z) {
  let sum = 0, amp = 1, f = 1;
  for (let o = 0; o < 3; o++) {
    sum += amp * nz(x * f + o * 17.31, y * f - o * 9.73, z * f + o * 5.19);
    amp *= 0.5;
    f *= 2;
  }
  return sum * 0.8;
}

let NZ_FRONT = null, NZ_FIELD = null, NZ_SHAPE = null, nzSeed = null;

function ensureNoise(seed) {
  if (nzSeed === seed && NZ_FRONT) return;
  NZ_FRONT = makePerlin3(seed * 3 + 1);
  NZ_FIELD = makePerlin3(seed * 3 + 2);
  NZ_SHAPE = makePerlin3(seed * 3 + 3);
  nzSeed = seed;
}

////////////////////////////////////////////////////////////////////////////////////////
// The solid
//
// Everything is measured in cells: x across, y up, z deep, standing on the ground at
// y = 0. Most shapes are a handful of boxes laid next to or on top of one another, each
// cut on its own so the seams between them stay straight — the tower does not share a
// box with the plinth it stands on. The round ones are the box around them and a test
// that says which cells are really inside; a box the test only half agrees with is cut
// again until the curve is followed as closely as whole cells can.

function massParts() {
  const s = settings;
  const W = clamp(Math.round(s.massW), 1, 400);
  const D = clamp(Math.round(s.massD), 1, 400);
  const H = clamp(Math.round(s.massH), 1, 400);
  const parts = [];
  const add = (x0, y0, z0, x1, y1, z1) => {
    if (x1 > x0 && y1 > y0 && z1 > z0) parts.push([x0, y0, z0, x1, y1, z1]);
  };
  let inside = null;

  switch (s.shape) {
    case 'tower on plinth': {
      const ph = clamp(Math.round(H * s.plinthH / 100), 1, H);
      add(0, 0, 0, W, ph, D);
      const tw = clamp(Math.round(W * s.towerW / 100), 1, W);
      const td = clamp(Math.round(D * s.towerD / 100), 1, D);
      const tx = Math.round((W - tw) * clamp(s.towerX, 0, 100) / 100);
      const tz = Math.round((D - td) * clamp(s.towerZ, 0, 100) / 100);
      add(tx, ph, tz, tx + tw, H, tz + td);
      break;
    }
    case 'steps': {
      // Each tier is set in from the one under it, so the top one is about a quarter of
      // the base across.
      const T = clamp(Math.round(s.tiers), 1, 64);
      for (let k = 0; k < T; k++) {
        const ix = Math.floor(W * 0.38 * k / T), iz = Math.floor(D * 0.38 * k / T);
        add(ix, Math.round(H * k / T), iz, W - ix, Math.round(H * (k + 1) / T), D - iz);
      }
      break;
    }
    case 'city': {
      // Lots on a grid with streets between them, tallest in the middle of town. How
      // tall each one is comes from the seed, like everything else about it.
      const L = clamp(Math.round(s.lots), 1, 24), st = Math.max(0, Math.round(s.street));
      for (let i = 0; i < L; i++) {
        for (let j = 0; j < L; j++) {
          const x0 = Math.round(i * (W + st) / L), x1 = Math.round((i + 1) * (W + st) / L) - st;
          const z0 = Math.round(j * (D + st) / L), z1 = Math.round((j + 1) * (D + st) / L) - st;
          const dx = (i + 0.5) / L - 0.5, dz = (j + 0.5) / L - 0.5;
          const near = 1 - Math.min(1, Math.hypot(dx, dz) / Math.SQRT1_2);
          const r = hashBox(i, j, L, 0, 0, 0, 101);
          add(x0, 0, z0, x1, Math.max(1, Math.round(H * (0.15 + 0.85 * (0.45 * r + 0.55 * near * near)))), z1);
        }
      }
      break;
    }
    case 'courtyard': {
      const t = clamp(Math.round(Math.min(W, D) * s.wall / 100), 1, Math.floor(Math.min(W, D) / 2));
      add(0, 0, 0, W, H, t);
      add(0, 0, D - t, W, H, D);
      add(0, 0, t, t, H, D - t);
      add(W - t, 0, t, W, H, D - t);
      break;
    }
    case 'arch': {
      // Two piers, and a round arch springing from them, through the whole depth.
      add(0, 0, 0, W, H, D);
      const pier = W * clamp(s.wall, 1, 49) / 100;
      const r = W / 2 - pier, cx = W / 2;
      const spring = H - Math.max(1, 0.6 * pier) - r;
      inside = (x, y) => {
        const dx = x - cx;
        if (dx <= -r || dx >= r) return true;
        return y >= spring + Math.sqrt(r * r - dx * dx);
      };
      break;
    }
    case 'cylinder': {
      // A round tower, standing the whole height.
      add(0, 0, 0, W, H, D);
      const rx = W / 2, rz = D / 2;
      inside = (x, y, z) => {
        const a = (x - rx) / rx, c = (z - rz) / rz;
        return a * a + c * c <= 1;
      };
      break;
    }
    case 'ring': {
      // A ring lying flat: a tube round the vertical through the middle, as thick across
      // as the walls say and as tall as the solid.
      add(0, 0, 0, W, H, D);
      const rx = W / 2, ry = H / 2, rz = D / 2;
      const h = clamp(s.wall, 1, 49) / 100, mid = 1 - h;
      inside = (x, y, z) => {
        const a = (x - rx) / rx, c = (z - rz) / rz, b = (y - ry) / ry;
        const r = (Math.sqrt(a * a + c * c) - mid) / h;
        return r * r + b * b <= 1;
      };
      break;
    }
    case 'ball': {
      add(0, 0, 0, W, H, D);
      const rx = W / 2, ry = H / 2, rz = D / 2;
      inside = (x, y, z) => {
        const a = (x - rx) / rx, b = (y - ry) / ry, c = (z - rz) / rz;
        return a * a + b * b + c * c <= 1;
      };
      break;
    }
    case 'blob': {
      // A ball whose surface is pushed in and out by noise: fuller, it swells into
      // its box; emptier, it falls apart into lumps. The noise is smooth on the scale of
      // the lumps, so it is looked up on a lattice a few cells apart and blended in
      // between, which is a small part of the work of asking every cell.
      add(0, 0, 0, W, H, D);
      const rx = W / 2, ry = H / 2, rz = D / 2;
      const k = 1 / Math.max(1, s.blobSize), fill = clamp(s.blobFill, 0, 100) / 100;
      const step = clamp(Math.floor(s.blobSize / 8), 1, 4);
      const nx = Math.ceil(W / step) + 2, ny = Math.ceil(H / step) + 2, nz = Math.ceil(D / step) + 2;
      let lumps = (x, y, z) => fbm3(NZ_SHAPE, x * k, y * k, z * k);
      if (nx * ny * nz <= 4e6) {
        const lat = new Float32Array(nx * ny * nz);
        for (let i = 0; i < nx; i++) {
          for (let j = 0; j < ny; j++) {
            for (let l = 0; l < nz; l++) {
              lat[(i * ny + j) * nz + l] = fbm3(NZ_SHAPE, i * step * k, j * step * k, l * step * k);
            }
          }
        }
        lumps = (x, y, z) => {
          const fx = clamp(x / step, 0, nx - 1.001), fy = clamp(y / step, 0, ny - 1.001);
          const fz = clamp(z / step, 0, nz - 1.001);
          const i = Math.floor(fx), j = Math.floor(fy), l = Math.floor(fz);
          const u = fx - i, v = fy - j, w = fz - l;
          const o = (i * ny + j) * nz + l, oy = nz, ox = ny * nz;
          const a = lat[o] + w * (lat[o + 1] - lat[o]);
          const b = lat[o + oy] + w * (lat[o + oy + 1] - lat[o + oy]);
          const c = lat[o + ox] + w * (lat[o + ox + 1] - lat[o + ox]);
          const d = lat[o + ox + oy] + w * (lat[o + ox + oy + 1] - lat[o + ox + oy]);
          const ab = a + v * (b - a), cd = c + v * (d - c);
          return ab + u * (cd - ab);
        };
      }
      inside = (x, y, z) => {
        const a = (x - rx) / rx, b = (y - ry) / ry, c = (z - rz) / rz;
        return 1 - Math.sqrt(a * a + b * b + c * c) + 0.8 * lumps(x, y, z) > 1 - fill;
      };
      break;
    }
    default:
      add(0, 0, 0, W, H, D);
  }

  const bbox = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    for (let k = 0; k < 3; k++) {
      if (p[k] < bbox[k]) bbox[k] = p[k];
      if (p[k + 3] > bbox[k + 3]) bbox[k + 3] = p[k + 3];
    }
  }
  if (!parts.length) bbox.splice(0, 6, 0, 0, 0, 1, 1, 1);
  return { parts, inside, bbox };
}

// A tested shape is asked about every cell once, at the cell's centre, and the answers
// are summed into a table of running totals, so how many cells of any box lie inside is
// eight lookups whatever the size of the box. A shape too large for the table falls back
// on asking each box at a handful of points.
const TABLE_CELLS = 1 << 23;

function insideTable(M) {
  const b = M.bbox, W = b[3], H = b[4], D = b[5];
  const H1 = H + 1, D1 = D + 1;
  if ((W + 1) * H1 * D1 > TABLE_CELLS) return null;
  const T = new Int32Array((W + 1) * H1 * D1);
  for (let x = 1; x <= W; x++) {
    for (let y = 1; y <= H; y++) {
      const r = (x * H1 + y) * D1, rx = ((x - 1) * H1 + y) * D1;
      const ry = (x * H1 + y - 1) * D1, rxy = ((x - 1) * H1 + y - 1) * D1;
      for (let z = 1; z <= D; z++) {
        const v = M.inside(x - 0.5, y - 0.5, z - 0.5) ? 1 : 0;
        T[r + z] = v + T[rx + z] + T[ry + z] + T[r + z - 1]
                 - T[rxy + z] - T[rx + z - 1] - T[ry + z - 1] + T[rxy + z - 1];
      }
    }
  }
  return { T, H1, D1 };
}

function countInside(tab, x0, y0, z0, x1, y1, z1) {
  const { T, H1, D1 } = tab;
  const a0 = x0 * H1, a1 = x1 * H1;
  return T[(a1 + y1) * D1 + z1] - T[(a0 + y1) * D1 + z1] - T[(a1 + y0) * D1 + z1]
       - T[(a1 + y1) * D1 + z0] + T[(a0 + y0) * D1 + z1] + T[(a0 + y1) * D1 + z0]
       + T[(a1 + y0) * D1 + z0] - T[(a0 + y0) * D1 + z0];
}

// The axis to split a partly covered box across: the one along which the box is least
// alike — cut a quarter, a half and three quarters of the way along, the one whose two
// sides differ most in how full they are. An axis the shape does not change along, like
// the height of a round tower, never differs; a shape that is symmetric about the middle
// of the box still differs at the quarters. When no axis differs anywhere the longest is
// cut, and without the table there is nothing to measure with, so the longest it is too.
function sortingAxis(tab, x0, y0, z0, x1, y1, z1, canX, canY, canZ) {
  const all = countInside(tab, x0, y0, z0, x1, y1, z1);
  const vol = (x1 - x0) * (y1 - y0) * (z1 - z0);
  let best = -1, bestGap = 1e-9;
  for (let k = 0; k < 3; k++) {
    if (!(k === 0 ? canX : k === 1 ? canY : canZ)) continue;
    const lo = k === 0 ? x0 : k === 1 ? y0 : z0, len = (k === 0 ? x1 : k === 1 ? y1 : z1) - lo;
    for (let q = 1; q <= 3; q++) {
      const at = lo + Math.max(1, Math.min(len - 1, Math.round(len * q / 4)));
      const na = k === 0 ? countInside(tab, x0, y0, z0, at, y1, z1)
               : k === 1 ? countInside(tab, x0, y0, z0, x1, at, z1)
               : countInside(tab, x0, y0, z0, x1, y1, at);
      const va = vol / len * (at - lo);
      const gap = Math.abs(na / va - (all - na) / (vol - va));
      if (gap > bestGap) { bestGap = gap; best = k; }
    }
  }
  if (best < 0 && (canX || canY || canZ)) {
    best = longestAxis(x1 - x0, y1 - y0, z1 - z0, canX, canY, canZ);
  }
  return best;
}

function longestAxis(sx, sy, sz, canX, canY, canZ) {
  const bx = canX ? sx : 0, by = canY ? sy : 0, bz = canZ ? sz : 0;
  return bx >= by && bx >= bz ? 0 : by >= bz ? 1 : 2;
}

// Without the table: a box is asked at 27 points — the corners, the middles of the edges
// and faces, the centre — just inside it, so a boundary running exactly along a cell
// wall is not read as crossing it. 1 all of it inside, 0 none of it, −1 part of it.
function classify(inside, x0, y0, z0, x1, y1, z1) {
  const e = 1e-3;
  let yes = 0, no = 0;
  for (let i = 0; i < 3; i++) {
    const x = i === 0 ? x0 + e : i === 1 ? (x0 + x1) / 2 : x1 - e;
    for (let j = 0; j < 3; j++) {
      const y = j === 0 ? y0 + e : j === 1 ? (y0 + y1) / 2 : y1 - e;
      for (let k = 0; k < 3; k++) {
        const z = k === 0 ? z0 + e : k === 1 ? (z0 + z1) / 2 : z1 - e;
        if (inside(x, y, z)) yes++; else no++;
        if (yes && no) return -1;
      }
    }
  }
  return no ? 0 : 1;
}

////////////////////////////////////////////////////////////////////////////////////////
// The front
//
// How far through the front a point is, as one number e: at 0 or below the solid
// stands, at 1 or above it is gone, and in between it is coming loose. Along a direction
// e grows evenly from one side of the solid to the other; outward it grows from the
// middle; with `noise` a slow field of its own decides where the solid gives. On top of
// any of them the ragged noise pushes the front back and forth, so it is never a plane.

let ER_MODE = 0, ER_AT = 0, ER_DEPTH = 1, ER_RAG = 0, ER_NS = 1;
let DRX = 0, DRY = 1, DRZ = 0;       // the way the front runs, unit, in the world
let ER_U0 = 0, ER_UK = 1;            // `toward`: where the solid starts along it, 1/length
let ER_CX = 0, ER_CY = 0, ER_CZ = 0; // `outward`: the middle of the solid
let ER_HX = 1, ER_HY = 1, ER_HZ = 1; // and its half-sizes
let MASS_L = 1;                      // cells — the largest size of the solid

function prepareFront(M) {
  const s = settings;
  ER_MODE = Math.max(0, DISSOLVES.indexOf(s.dissolve));
  ER_AT = clamp(s.frontAt, -100, 200) / 100;
  ER_DEPTH = Math.max(0.01, s.frontDepth / 100);
  ER_RAG = Math.max(0, s.ragged);
  ER_NS = 1 / Math.max(0.5, s.noiseSize);

  // The same compass the camera turns on: 0° runs towards a camera at azimuth 0.
  const a = radians(s.towardAz), el = radians(clamp(s.towardEl, -90, 90));
  DRX = Math.cos(el) * Math.sin(a);
  DRY = Math.sin(el);
  DRZ = Math.cos(el) * Math.cos(a);

  const b = M.bbox;
  let u0 = Infinity, u1 = -Infinity;
  for (let c = 0; c < 8; c++) {
    const u = (c & 1 ? b[3] : b[0]) * DRX + (c & 2 ? b[4] : b[1]) * DRY + (c & 4 ? b[5] : b[2]) * DRZ;
    if (u < u0) u0 = u;
    if (u > u1) u1 = u;
  }
  ER_U0 = u0;
  ER_UK = 1 / Math.max(1e-9, u1 - u0);
  ER_CX = (b[0] + b[3]) / 2; ER_CY = (b[1] + b[4]) / 2; ER_CZ = (b[2] + b[5]) / 2;
  ER_HX = Math.max(0.5, (b[3] - b[0]) / 2);
  ER_HY = Math.max(0.5, (b[4] - b[1]) / 2);
  ER_HZ = Math.max(0.5, (b[5] - b[2]) / 2);
  MASS_L = Math.max(1, b[3] - b[0], b[4] - b[1], b[5] - b[2]);
}

function frontOf(x, y, z) {
  if (ER_MODE === 0) return -1;
  let u;
  if (ER_MODE === 1) {
    u = (x * DRX + y * DRY + z * DRZ - ER_U0) * ER_UK;
  } else if (ER_MODE === 2) {
    const a = (x - ER_CX) / ER_HX, b = (y - ER_CY) / ER_HY, c = (z - ER_CZ) / ER_HZ;
    u = Math.sqrt((a * a + b * b + c * c) / 3);
  } else {
    const k = ER_NS * 0.4;
    u = 0.5 + 0.5 * fbm3(NZ_FIELD, x * k, y * k, z * k);
  }
  let e = (u - ER_AT) / ER_DEPTH;
  if (ER_RAG > 0) e += ER_RAG * fbm3(NZ_FRONT, x * ER_NS, y * ER_NS, z * ER_NS);
  return e;
}

////////////////////////////////////////////////////////////////////////////////////////
// Cutting the solid
//
// A k-d tree on whole cells. A box wider than it may be — or taller — is split across
// the axis that is furthest over, at a whole cell somewhere near its middle; a box that
// is small enough is still split once more now and then, by the variety, which is what
// scatters small boxes among the big ones. How large a box may be shrinks as the front
// reaches it — by a steady factor for every step through it, down to 1 − crumble of the
// full size at its far side — so the solid stands in big blocks and flies apart in
// splinters. Across the front the boxes get narrower long before they get shorter, and
// come off as the thin upright slivers a city breaks into.
//
// A box a tested shape only partly covers is split regardless, across whichever axis
// best sorts what is inside from what is not — a round tower is split round its
// circumference, never up its height — down to the smallest box, and kept if at least
// half of it is inside.

function cutMass(M) {
  const s = settings;
  const minB = clamp(Math.round(s.minBox), 1, 64);
  const maxB = Math.max(minB, s.maxBox), maxT = Math.max(minB, s.maxTall);
  const crumble = clamp(s.crumble, 0, 1), variety = clamp(s.variety, 0, 1);
  const out = [];
  const stack = [];
  let truncated = false;
  for (const p of M.parts) stack.push(p[0], p[1], p[2], p[3], p[4], p[5]);

  while (stack.length) {
    const z1 = stack.pop(), y1 = stack.pop(), x1 = stack.pop();
    const z0 = stack.pop(), y0 = stack.pop(), x0 = stack.pop();
    if (out.length >= MAX_BOXES * 6) { truncated = true; break; }

    const sx = x1 - x0, sy = y1 - y0, sz = z1 - z0;
    const canX = sx >= 2 * minB, canY = sy >= 2 * minB, canZ = sz >= 2 * minB;
    let axis = -1;

    let cls = 1, held = 0;
    if (M.table) {
      held = countInside(M.table, x0, y0, z0, x1, y1, z1);
      cls = held === 0 ? 0 : held === sx * sy * sz ? 1 : -1;
    } else if (M.inside) {
      cls = classify(M.inside, x0, y0, z0, x1, y1, z1);
    }
    if (cls === 0) continue;
    if (cls < 0) {
      axis = M.table ? sortingAxis(M.table, x0, y0, z0, x1, y1, z1, canX, canY, canZ)
        : canX || canY || canZ ? longestAxis(sx, sy, sz, canX, canY, canZ) : -1;
      if (axis < 0) {
        // Too small to cut again: the box is kept or dropped whole.
        const keep = M.table ? 2 * held >= sx * sy * sz
          : M.inside((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        if (keep) out.push(x0, y0, z0, x1, y1, z1);
        continue;
      }
    }
    if (cls > 0) {
      const e = frontOf((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      const k = Math.pow(1 - crumble, clamp(e, 0, 1));
      const limH = Math.max(minB, maxB * k), limV = Math.max(minB, maxT * k);
      const rx = canX ? sx / limH : 0, ry = canY ? sy / limV : 0, rz = canZ ? sz / limH : 0;
      const top = Math.max(rx, ry, rz);
      if (top > 1) {
        axis = rx === top ? 0 : ry === top ? 1 : 2;
      } else if (top > 0 && hashBox(x0, y0, z0, x1, y1, z1, 1) < variety) {
        // any axis that can still be cut, the longer ones the likelier
        const wx = rx * rx, wy = ry * ry, wz = rz * rz;
        const r = hashBox(x0, y0, z0, x1, y1, z1, 2) * (wx + wy + wz);
        axis = r < wx ? 0 : r < wx + wy ? 1 : 2;
      }
    }

    if (axis < 0) { out.push(x0, y0, z0, x1, y1, z1); continue; }

    // Where: two draws averaged, so the cut leans towards the middle of the box.
    const n = axis === 0 ? sx : axis === 1 ? sy : sz;
    const room = n - 2 * minB;
    const r = (hashBox(x0, y0, z0, x1, y1, z1, 3) + hashBox(x0, y0, z0, x1, y1, z1, 4)) / 2;
    const cut = minB + Math.min(room, Math.floor(r * (room + 1)));
    if (axis === 0) {
      stack.push(x0, y0, z0, x0 + cut, y1, z1, x0 + cut, y0, z0, x1, y1, z1);
    } else if (axis === 1) {
      stack.push(x0, y0, z0, x1, y0 + cut, z1, x0, y0 + cut, z0, x1, y1, z1);
    } else {
      stack.push(x0, y0, z0, x1, y1, z0 + cut, x0, y0, z0 + cut, x1, y1, z1);
    }
  }
  return { cells: out, n: out.length / 6, truncated };
}

////////////////////////////////////////////////////////////////////////////////////////
// Coming apart
//
// Every box is asked, from its own hash, whether it stays: where the solid stands all
// but the porosity do, and across the front fewer and fewer, until past it none. The
// ones that stay out there are loose — shrunk about their middles, carried off along the
// front's direction (or away from the middle of the solid, when it bursts outward) by
// the drift, further the further through the front they were, and strayed off that line
// by the scatter. A box let go early has flown far and a box let go late has barely
// moved, so what the front takes away is stretched out behind it and thinned as it goes. A box that stays where it is may still fall short of the
// one above it by the uneven tops, which is what breaks the roofs of a solid block into
// a skyline.
//
// All of it happens in cells, before the camera is asked anything, so turning the view
// never changes which boxes there are.

function dissolveBoxes(cut) {
  const s = settings;
  const n = cut.n, c = cut.cells;
  const keep0 = 1 - clamp(s.porosity, 0, 100) / 100;
  const uneven = clamp(s.unevenTops, 0, 100) / 100;
  const drift = Math.max(0, s.drift) / 100 * MASS_L;
  const scat = Math.max(0, s.scatter) / 100 * MASS_L;
  const shrink = clamp(s.shrink, 0, 1), thin = Math.max(0.05, s.thinning);
  const boxes = new Float64Array(n * 6), front = new Float32Array(n);
  let m = 0, nLoose = 0;

  for (let i = 0; i < n; i++) {
    const x0 = c[i * 6], y0 = c[i * 6 + 1], z0 = c[i * 6 + 2];
    const x1 = c[i * 6 + 3], y1 = c[i * 6 + 4], z1 = c[i * 6 + 5];
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
    const e = frontOf(cx, cy, cz);
    const q = e <= 0 ? keep0 : keep0 * Math.pow(Math.max(0, 1 - e), thin);
    if (!(hashBox(x0, y0, z0, x1, y1, z1, 11) < q)) continue;

    let hx = (x1 - x0) / 2, hz = (z1 - z0) / 2;
    let bot = y0, top = y1;
    if (uneven > 0) top = y0 + (y1 - y0) * (1 - uneven * hashBox(x0, y0, z0, x1, y1, z1, 12));
    let ox = cx, oz = cz;
    const o = m * 6;

    if (e > 0) {
      const f = Math.min(1, e);
      const g = 1 - shrink * f * (0.5 + 0.5 * hashBox(x0, y0, z0, x1, y1, z1, 13));
      const my = (bot + top) / 2, hy = (top - bot) / 2 * g;
      hx *= g; hz *= g;

      let dx = DRX, dy = DRY, dz = DRZ;
      if (ER_MODE === 2) {
        dx = cx - ER_CX; dy = cy - ER_CY; dz = cz - ER_CZ;
        const l = Math.hypot(dx, dy, dz);
        if (l > 1e-9) { dx /= l; dy /= l; dz /= l; } else { dx = 0; dy = 1; dz = 0; }
      }
      const d = drift * f * (0.4 + 1.2 * hashBox(x0, y0, z0, x1, y1, z1, 14));
      const w = 2 * hashBox(x0, y0, z0, x1, y1, z1, 15) - 1;
      const ph = 2 * Math.PI * hashBox(x0, y0, z0, x1, y1, z1, 16);
      const rr = Math.sqrt(1 - w * w);
      const sc = scat * f * hashBox(x0, y0, z0, x1, y1, z1, 17);
      ox += d * dx + sc * rr * Math.cos(ph);
      const oy = my + d * dy + sc * w;
      oz += d * dz + sc * rr * Math.sin(ph);
      bot = oy - hy; top = oy + hy;
      nLoose++;
    }
    front[m] = e;
    boxes[o] = ox - hx; boxes[o + 1] = bot; boxes[o + 2] = oz - hz;
    boxes[o + 3] = ox + hx; boxes[o + 4] = top; boxes[o + 5] = oz + hz;
    m++;
  }
  return { boxes: boxes.subarray(0, m * 6), front: front.subarray(0, m), n: m, nLoose };
}

// The boxes depend on the solid, the cutting and the front, never on the camera or the
// paper, so they are kept between updates and only built again when one of those moves.
let struct = null, structKey = '';

function structureKey() {
  const s = settings;
  return JSON.stringify([s.shape, s.massW, s.massD, s.massH, s.plinthH, s.towerW,
    s.towerD, s.towerX, s.towerZ, s.tiers, s.lots, s.street, s.wall, s.blobSize,
    s.blobFill, s.seed, s.minBox, s.maxBox, s.maxTall, s.variety, s.porosity,
    s.unevenTops, s.dissolve, s.towardAz, s.towardEl, s.frontAt, s.frontDepth, s.ragged,
    s.noiseSize, s.crumble, s.drift, s.scatter, s.shrink, s.thinning]);
}

function ensureStructure() {
  const key = structureKey();
  if (struct && key === structKey) return struct;
  const t0 = performance.now();
  const seed = Math.round(settings.seed);
  SEED_MIX = Math.imul(seed ^ 0x5bd1e995, 0x27d4eb2d) ^ 0x165667b1;
  ensureNoise(seed);
  const M = massParts();
  M.table = M.inside ? insideTable(M) : null;
  prepareFront(M);
  const cut = cutMass(M);
  const d = dissolveBoxes(cut);
  struct = { M, ...d, cut: cut.n, truncated: cut.truncated, ms: performance.now() - t0 };
  structKey = key;
  return struct;
}

////////////////////////////////////////////////////////////////////////////////////////
// The camera
//
// A parallel projection is two rows and one direction: PR, the world's way of going
// right on paper, PU, its way of going up, and c, the way every ray runs towards the
// viewer — the one direction that lands on no paper at all, PR·c = PU·c = 0. A point p
// is drawn at
//
//     x = S·(p·PR) + OX        y = −S·(p·PU) + OY
//
// on the sheet, in mm, and the further along c it lies, the nearer the viewer it is.
//
//   axonometric  the camera at azimuth θ round the vertical and φ above the horizon, PR
//                and PU square to c. True isometric is θ = 45°, φ = 35.26°, where every
//                edge of the ground runs at 30° on paper.
//   military     the ground plan turned by θ and drawn true, with the height straight up
//                and scaled by h — the architect's planometric view.
//   oblique      the front drawn true and the depth running off at an angle α,
//                shortened by k: cabinet at k = ½, cavalier at 1.

let PR0 = 1, PR1 = 0, PR2 = 0, PU0 = 0, PU1 = 1, PU2 = 0;
let CV0 = 0, CV1 = 0, CV2 = 1;
const PRV = new Float64Array(3), PUV = new Float64Array(3), CVV = new Float64Array(3);
let S = 1, OX = 0, OY = 0;           // the fit: mm per cell, and where the origin lands

function makeView() {
  const s = settings;
  let cx, cy, cz;
  if (s.projection === 'military') {
    const t = radians(s.azimuth), h = clamp(s.heightScale, 0.05, 5);
    PR0 = Math.cos(t); PR1 = 0; PR2 = -Math.sin(t);
    PU0 = -Math.sin(t); PU1 = h; PU2 = -Math.cos(t);
    cx = Math.sin(t); cy = 1 / h; cz = Math.cos(t);
  } else if (s.projection === 'oblique') {
    const a = radians(s.obliqueAngle), k = clamp(s.obliqueDepth, 0.01, 3);
    PR0 = 1; PR1 = 0; PR2 = -k * Math.cos(a);
    PU0 = 0; PU1 = 1; PU2 = -k * Math.sin(a);
    cx = k * Math.cos(a); cy = k * Math.sin(a); cz = 1;
  } else {
    const t = radians(s.azimuth), p = radians(clamp(s.elevation, -90, 90));
    PR0 = Math.cos(t); PR1 = 0; PR2 = -Math.sin(t);
    PU0 = -Math.sin(p) * Math.sin(t); PU1 = Math.cos(p); PU2 = -Math.sin(p) * Math.cos(t);
    cx = Math.cos(p) * Math.sin(t); cy = Math.sin(p); cz = Math.cos(p) * Math.cos(t);
  }
  const l = Math.hypot(cx, cy, cz);
  CV0 = cx / l; CV1 = cy / l; CV2 = cz / l;
  PRV[0] = PR0; PRV[1] = PR1; PRV[2] = PR2;
  PUV[0] = PU0; PUV[1] = PU1; PUV[2] = PU2;
  CVV[0] = CV0; CVV[1] = CV1; CVV[2] = CV2;
  prepareFaces();
}

// The fit. Every box that is left, loose ones included, is brought inside the drawable
// area at 100 %; zoom and pan then scale the sheet about its middle. A new seed can move
// the fit a little — it follows wherever the loosest boxes happened to fly.
function fitView(st) {
  const src = st.boxes;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < st.n; i++) {
    const o = i * 6;
    let xl = 0, xh = 0, yl = 0, yh = 0;
    for (let k = 0; k < 3; k++) {
      const lo = src[o + k], hi = src[o + 3 + k];
      let a = lo * PRV[k], b = hi * PRV[k];
      if (a < b) { xl += a; xh += b; } else { xl += b; xh += a; }
      a = -lo * PUV[k]; b = -hi * PUV[k];
      if (a < b) { yl += a; yh += b; } else { yl += b; yh += a; }
    }
    if (xl < x0) x0 = xl;
    if (xh > x1) x1 = xh;
    if (yl < y0) y0 = yl;
    if (yh > y1) y1 = yh;
  }
  if (!(x1 - x0 > 1e-9)) { x0 -= 1; x1 += 1; }
  if (!(y1 - y0 > 1e-9)) { y0 -= 1; y1 += 1; }

  const bcx = (area.x0 + area.x1) / 2, bcy = (area.y0 + area.y1) / 2;
  const s0 = Math.min(area.w / (x1 - x0), area.h / (y1 - y0));
  const ox0 = bcx - s0 * (x0 + x1) / 2, oy0 = bcy - s0 * (y0 + y1) / 2;
  const z = clamp(settings.zoom, MIN_ZOOM, MAX_ZOOM) / 100;
  S = z * s0;
  OX = bcx + z * (ox0 - bcx - settings.panX);
  OY = bcy + z * (oy0 - bcy - settings.panY);
}

////////////////////////////////////////////////////////////////////////////////////////
// Faces
//
// Of the two faces a box has across each axis, the camera sees the one on its own side,
// so every box shows at most three: one of its tops (or bottoms, from below) and two of
// its sides. Which side is `left` and which `right` is read off the paper — the face
// whose outward normal points further left is the left one — so the names still mean
// what they say after the camera has gone round the other way.
//
// Each face is hatched by families of parallel lines, each a direction on paper and a
// spacing. A side's lines run up it or along it; a top's along the edge it shares with
// the left face or with the right one; diagonals are at 45° on paper whatever face they
// cross.

const AX_A = [1, 0, 1];              // the two axes that lie in a face across x, y or z
const AX_B = [2, 2, 0];
const FACE_ON = new Uint8Array(3);   // whether the camera sees a face across this axis
const FACE_HI = new Uint8Array(3);   // and whether it is the face at the high end
const ROLE = new Uint8Array(3);      // axis → 0 top, 1 left, 2 right
const UDIR = [null, null, null];     // axis → the unit direction it runs on paper
let KL = 2, KR = 0;                  // the axes across the left and the right faces
let FAM = [[], [], []];              // role → [{ ux, uy, d, solid }]
const SOLID_ROLE = new Uint8Array(3); // role → whether it is inked in solid

function prepareFaces() {
  const s = settings;
  for (let k = 0; k < 3; k++) {
    FACE_ON[k] = Math.abs(CVV[k]) > FACE_EPS ? 1 : 0;
    FACE_HI[k] = CVV[k] > 0 ? 1 : 0;
    const dx = PRV[k], dy = -PUV[k], l = Math.hypot(dx, dy);
    UDIR[k] = l > 1e-9 ? [dx / l, dy / l] : null;
  }
  const side = k => (FACE_HI[k] ? 1 : -1) * PRV[k];
  KL = side(0) <= side(2) ? 0 : 2;
  KR = 2 - KL;
  ROLE[1] = 0; ROLE[KL] = 1; ROLE[KR] = 2;
  FAM = [
    families(s.topHatch, s.topSpacing, UDIR[KR], UDIR[KL]),
    families(s.leftHatch, s.leftSpacing, UDIR[1], UDIR[KR]),
    families(s.rightHatch, s.rightSpacing, UDIR[1], UDIR[KL]),
  ];
  for (let r = 0; r < 3; r++) SOLID_ROLE[r] = FAM[r].some(f => f.solid) ? 1 : 0;
}

// The families one face role is hatched with. `first` and `second` are the two ways the
// face's own edges run on paper: up and along for a side, along the left and along the
// right for a top.
function families(pattern, spacing, first, second) {
  const d = Math.max(0.05, spacing);
  const out = [];
  const add = (u, dd, solid) => { if (u) out.push({ ux: u[0], uy: u[1], d: dd, solid: !!solid }); };
  const up = [Math.SQRT1_2, -Math.SQRT1_2], down = [Math.SQRT1_2, Math.SQRT1_2];
  switch (pattern) {
    case 'vertical': case 'along left':   add(first, d); break;
    case 'horizontal': case 'along right': add(second, d); break;
    case 'grid':       add(first, d); add(second, d); break;
    case 'diagonal':   add(up, d); break;
    case 'crosshatch': add(up, d); add(down, d); break;
    case 'solid':
      add(first, Math.max(0.01, settings.penWidth * clamp(settings.solidGap, 10, 150) / 100), true);
      break;
  }
  return out;
}

////////////////////////////////////////////////////////////////////////////////////////
// Placing the boxes
//
// The boxes as they are drawn: each one shrunk by half the gap on every side, so that
// two neighbours stand the gap apart, and dropped when that leaves too little of it to
// draw. Alongside each goes its outline's bounding box on paper and how near and how far
// it reaches along c — all the hidden-line pass needs to know which boxes could stand in
// front of which.

let NB = 0;
let BX = new Float64Array(0);        // x0 y0 z0 x1 y1 z1, in cells
let BS = new Float64Array(0);        // x0 y0 x1 y1 of the outline on paper, in mm
let BD = new Float64Array(0);        // how far along c it reaches, least and most
let BL = new Uint8Array(0);          // far enough through the front to count as loose

function placeBoxes(st) {
  const n = st.n, src = st.boxes;
  if (BL.length < n) {
    BX = new Float64Array(n * 6);
    BS = new Float64Array(n * 4);
    BD = new Float64Array(n * 2);
    BL = new Uint8Array(n);
  }
  const g = Math.max(0, settings.gap) / S / 2;
  const least = MIN_BOX_MM / S;
  const looseAt = settings.looseAt / 100;
  let m = 0;

  for (let i = 0; i < n; i++) {
    const o = i * 6;
    const x0 = src[o] + g, y0 = src[o + 1] + g, z0 = src[o + 2] + g;
    const x1 = src[o + 3] - g, y1 = src[o + 4] - g, z1 = src[o + 5] - g;
    if (x1 - x0 < least || y1 - y0 < least || z1 - z0 < least) continue;
    const p = m * 6;
    BX[p] = x0; BX[p + 1] = y0; BX[p + 2] = z0;
    BX[p + 3] = x1; BX[p + 4] = y1; BX[p + 5] = z1;

    let xl = 0, xh = 0, yl = 0, yh = 0, dl = 0, dh = 0;
    for (let k = 0; k < 3; k++) {
      const lo = BX[p + k], hi = BX[p + 3 + k];
      let a = lo * PRV[k], b = hi * PRV[k];
      if (a < b) { xl += a; xh += b; } else { xl += b; xh += a; }
      a = -lo * PUV[k]; b = -hi * PUV[k];
      if (a < b) { yl += a; yh += b; } else { yl += b; yh += a; }
      a = lo * CVV[k]; b = hi * CVV[k];
      if (a < b) { dl += a; dh += b; } else { dl += b; dh += a; }
    }
    BS[m * 4] = S * xl + OX; BS[m * 4 + 1] = S * yl + OY;
    BS[m * 4 + 2] = S * xh + OX; BS[m * 4 + 3] = S * yh + OY;
    BD[m * 2] = dl; BD[m * 2 + 1] = dh;
    BL[m] = st.front[i] > looseAt ? 1 : 0;
    m++;
  }
  NB = m;
}

// A grid of bins over the sheet, each listing the boxes whose outline reaches into it,
// about one ordinary box on paper to a bin.
let GX0 = 0, GY0 = 0, GC = 1, GW = 1, GH = 1;
let BIN_START = new Int32Array(2), BIN_ITEMS = new Int32Array(0);

function buildBins() {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, sum = 0;
  for (let i = 0; i < NB; i++) {
    const b = i * 4;
    if (BS[b] < x0) x0 = BS[b];
    if (BS[b + 1] < y0) y0 = BS[b + 1];
    if (BS[b + 2] > x1) x1 = BS[b + 2];
    if (BS[b + 3] > y1) y1 = BS[b + 3];
    sum += (BS[b + 2] - BS[b]) + (BS[b + 3] - BS[b + 1]);
  }
  if (!NB || !(x1 - x0 < 1e6 && y1 - y0 < 1e6)) { x0 = y0 = 0; x1 = y1 = 1; }
  GC = Math.max(0.25, sum / Math.max(1, 2 * NB));
  if (!Number.isFinite(GC)) GC = 1;
  for (;;) {
    GW = Math.floor((x1 - x0) / GC) + 1;
    GH = Math.floor((y1 - y0) / GC) + 1;
    if (GW * GH <= 2e6) break;
    GC *= 1.5;
  }
  GX0 = x0; GY0 = y0;

  const nb = GW * GH;
  const start = new Int32Array(nb + 1);
  for (let i = 0; i < NB; i++) {
    const [gx0, gy0, gx1, gy1] = binRange(i);
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) start[gy * GW + gx + 1]++;
    }
  }
  for (let k = 0; k < nb; k++) start[k + 1] += start[k];
  const items = new Int32Array(start[nb]);
  const cursor = start.slice(0, nb);
  for (let i = 0; i < NB; i++) {
    const [gx0, gy0, gx1, gy1] = binRange(i);
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) items[cursor[gy * GW + gx]++] = i;
    }
  }
  BIN_START = start;
  BIN_ITEMS = items;
}

const BIN_R = [0, 0, 0, 0];

function binRange(i) {
  const b = i * 4;
  BIN_R[0] = clamp(Math.floor((BS[b] - GX0) / GC), 0, GW - 1);
  BIN_R[1] = clamp(Math.floor((BS[b + 1] - GY0) / GC), 0, GH - 1);
  BIN_R[2] = clamp(Math.floor((BS[b + 2] - GX0) / GC), 0, GW - 1);
  BIN_R[3] = clamp(Math.floor((BS[b + 3] - GY0) / GC), 0, GH - 1);
  return BIN_R;
}

////////////////////////////////////////////////////////////////////////////////////////
// Hidden lines
//
// The view is parallel, so every ray towards the viewer runs along c, and a point P is
// hidden by a box J exactly when P + s·c is inside J for some s > 0. For a point of a
// straight segment, P = A + t·E, each axis k of the box asks
//
//     lo_k ≤ A_k + t·E_k + s·c_k ≤ hi_k
//
// which for c_k ≠ 0 is a lower and an upper bound on s, both straight lines in t. The
// point is hidden when some s clears every lower bound, s > 0 among them, and stays under
// every upper one: when each lower line lies under each upper line. That is a handful of
// linear inequalities in t, and they leave a single stretch of the segment — the
// hidden part, exactly, found without sampling anything.
//
// The box is shrunk by a hair first, so a box never hides its own faces, nor the faces
// of a neighbour it only touches.

let HT0 = 0, HT1 = 1;
const LA = new Float64Array(4), LB = new Float64Array(4), LK = new Int8Array(4);
const UA = new Float64Array(3), UB = new Float64Array(3), UK = new Int8Array(3);

function hideSpan(ax, ay, az, ex, ey, ez, j) {
  const o = j * 6;
  let t0 = 0, t1 = 1, nl = 1, nu = 0;
  LA[0] = HIDE_EPS; LB[0] = 0; LK[0] = -1;

  for (let k = 0; k < 3; k++) {
    const a = k === 0 ? ax : k === 1 ? ay : az;
    const e = k === 0 ? ex : k === 1 ? ey : ez;
    const lo = BX[o + k] + HIDE_EPS, hi = BX[o + 3 + k] - HIDE_EPS;
    const ck = CVV[k];
    if (ck > -1e-12 && ck < 1e-12) {
      // the ray never moves along this axis: the segment itself has to be inside
      if (e > -1e-15 && e < 1e-15) {
        if (a < lo || a > hi) return false;
        continue;
      }
      let ta = (lo - a) / e, tb = (hi - a) / e;
      if (ta > tb) { const t = ta; ta = tb; tb = t; }
      if (ta > t0) t0 = ta;
      if (tb < t1) t1 = tb;
      if (t0 >= t1) return false;
      continue;
    }
    const inv = 1 / ck, slope = -e * inv;
    let aLo = (lo - a) * inv, aHi = (hi - a) * inv;
    if (ck < 0) { const t = aLo; aLo = aHi; aHi = t; }
    LA[nl] = aLo; LB[nl] = slope; LK[nl] = k; nl++;
    UA[nu] = aHi; UB[nu] = slope; UK[nu] = k; nu++;
  }

  for (let i = 0; i < nl; i++) {
    for (let m = 0; m < nu; m++) {
      if (LK[i] === UK[m]) continue;       // one axis never contradicts itself
      const g = LB[i] - UB[m], h = UA[m] - LA[i];
      if (g > 1e-15) { const t = h / g; if (t < t1) t1 = t; }
      else if (g < -1e-15) { const t = h / g; if (t > t0) t0 = t; }
      else if (h < 0) return false;
      if (t0 >= t1) return false;
    }
  }
  HT0 = t0; HT1 = t1;
  return true;
}

// The same question for a single point.
function pointHidden(x, y, z, j) {
  const o = j * 6;
  let s0 = HIDE_EPS, s1 = Infinity;
  for (let k = 0; k < 3; k++) {
    const p = k === 0 ? x : k === 1 ? y : z;
    const lo = BX[o + k] + HIDE_EPS, hi = BX[o + 3 + k] - HIDE_EPS;
    const ck = CVV[k];
    if (ck > -1e-12 && ck < 1e-12) {
      if (p < lo || p > hi) return false;
      continue;
    }
    let a = (lo - p) / ck, b = (hi - p) / ck;
    if (a > b) { const t = a; a = b; b = t; }
    if (a > s0) s0 = a;
    if (b < s1) s1 = b;
    if (s0 > s1) return false;
  }
  return true;
}

// The boxes that could stand in front of box i: their outlines overlap its outline on
// paper, and they reach nearer the viewer than its farthest point does.
let STAMP = new Int32Array(0), CAND = new Int32Array(0);
const FCL = [new Int32Array(0), new Int32Array(0), new Int32Array(0)];

function gatherCandidates(i) {
  const b = i * 4, bx0 = BS[b], by0 = BS[b + 1], bx1 = BS[b + 2], by1 = BS[b + 3];
  const far = BD[i * 2];
  const [gx0, gy0, gx1, gy1] = binRange(i);
  const tag = i + 1;
  let n = 0;
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      const k = gy * GW + gx;
      for (let t = BIN_START[k], e = BIN_START[k + 1]; t < e; t++) {
        const j = BIN_ITEMS[t];
        if (STAMP[j] === tag) continue;
        STAMP[j] = tag;
        if (j === i || BD[j * 2 + 1] <= far) continue;
        const c = j * 4;
        if (BS[c] >= bx1 || BS[c + 2] <= bx0 || BS[c + 1] >= by1 || BS[c + 3] <= by0) continue;
        CAND[n++] = j;
      }
    }
  }
  return n;
}

////////////////////////////////////////////////////////////////////////////////////////
// Drawing one box
//
// Face by face: the boxes that could hide it are the ones that reach past its plane
// towards the viewer and overlap its outline on paper. If one of them hides all four
// corners, it hides the whole face — what one box hides is convex — and the face is
// passed over with its hatching and its edges. Otherwise every hatch line is laid
// across it and cut by those boxes. Last come the edges: every edge between two faces
// the camera sees, and every edge between one it sees and one it does not, which is the
// outline — or the outline alone, if that is all that is asked for.

const FHID = new Uint8Array(3);      // hidden whole
const FN = new Int32Array(3);        // how many boxes could hide it
const FBOX = new Float64Array(4);    // its outline on paper
const QP = new Float64Array(12);     // its corners, in cells
const PA = new Float64Array(3), PB = new Float64Array(3);

let PEN_EDGE = 0, PEN_LOOSE = -1, EDGE_MODE = 0, PHASE_LATTICE = false, MIN_STROKE = 0;
let JOIN_HATCH = false, HATCH_LOOSE = true, NIB = 0.3;
const PEN_ROLE = new Int8Array(3);
let C_FACES = 0, C_HIDDEN = 0, C_HATCH = 0;

function faceCorners(i, k, w) {
  const o = i * 6, a = AX_A[k], b = AX_B[k];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let c = 0; c < 4; c++) {
    const q = c * 3;
    QP[q + k] = w;
    QP[q + a] = c & 1 ? BX[o + 3 + a] : BX[o + a];
    QP[q + b] = c & 2 ? BX[o + 3 + b] : BX[o + b];
    const px = S * (QP[q] * PR0 + QP[q + 1] * PR1 + QP[q + 2] * PR2) + OX;
    const py = -S * (QP[q] * PU0 + QP[q + 1] * PU1 + QP[q + 2] * PU2) + OY;
    if (px < x0) x0 = px;
    if (px > x1) x1 = px;
    if (py < y0) y0 = py;
    if (py > y1) y1 = py;
  }
  FBOX[0] = x0; FBOX[1] = y0; FBOX[2] = x1; FBOX[3] = y1;
}

function drawBox(i, sink) {
  const o = i * 6;
  const nc = gatherCandidates(i);
  const loose = BL[i] === 1 && PEN_LOOSE >= 0;
  const hatch = BL[i] === 0 || HATCH_LOOSE;
  let shown = 0;

  for (let k = 0; k < 3; k++) {
    FN[k] = 0; FHID[k] = 0;
    if (!FACE_ON[k]) continue;
    const w = FACE_HI[k] ? BX[o + 3 + k] : BX[o + k];
    faceCorners(i, k, w);

    const list = FCL[k];
    let n = 0;
    for (let q = 0; q < nc; q++) {
      const j = CAND[q], oj = j * 6;
      if (FACE_HI[k] ? BX[oj + 3 + k] <= w + HIDE_EPS : BX[oj + k] >= w - HIDE_EPS) continue;
      const c = j * 4;
      if (BS[c] >= FBOX[2] || BS[c + 2] <= FBOX[0] || BS[c + 1] >= FBOX[3] || BS[c + 3] <= FBOX[1]) continue;
      list[n++] = j;
    }
    FN[k] = n;

    let covered = false;
    for (let q = 0; q < n && !covered; q++) {
      const j = list[q];
      covered = pointHidden(QP[0], QP[1], QP[2], j) && pointHidden(QP[3], QP[4], QP[5], j) &&
                pointHidden(QP[6], QP[7], QP[8], j) && pointHidden(QP[9], QP[10], QP[11], j);
    }
    if (covered) { FHID[k] = 1; C_HIDDEN++; continue; }

    shown++;
    C_FACES++;
    const role = ROLE[k];
    if (hatch && FAM[role].length) {
      hatchFace(i, k, w, list, n, loose ? PEN_LOOSE : PEN_ROLE[role], sink);
    }
  }

  // A solid face keeps its own edges whatever the edge mode asks: a round nib cannot
  // reach into a corner or along an edge its passes run into at a slant, and the edge is
  // the pass that does. On a face inked in solid it disappears into the ink anyway.
  if (!shown) return;
  for (let m = 0; m < 3; m++) {
    const p = (m + 1) % 3, q = (m + 2) % 3;
    for (let sp = 0; sp < 2; sp++) {
      const fp = FACE_ON[p] && sp === FACE_HI[p] ? 1 : 0;
      for (let sq = 0; sq < 2; sq++) {
        const fq = FACE_ON[q] && sq === FACE_HI[q] ? 1 : 0;
        const nv = fp + fq;
        if (!nv) continue;
        if ((fp && FHID[p]) || (fq && FHID[q])) continue;
        const wanted = EDGE_MODE === 0 || (EDGE_MODE === 1 && nv === 1);
        const sP = hatch && fp && SOLID_ROLE[ROLE[p]], sQ = hatch && fq && SOLID_ROLE[ROLE[q]];
        if (!wanted && !sP && !sQ) continue;
        const pen = loose ? PEN_LOOSE : wanted ? PEN_EDGE : PEN_ROLE[ROLE[sP ? p : q]];
        const k = fp && fq ? (FN[p] <= FN[q] ? p : q) : fp ? p : q;
        PA[m] = BX[o + m]; PB[m] = BX[o + 3 + m];
        PA[p] = PB[p] = sp ? BX[o + 3 + p] : BX[o + p];
        PA[q] = PB[q] = sq ? BX[o + 3 + q] : BX[o + q];
        drawVisible(PA[0], PA[1], PA[2], PB[0], PB[1], PB[2], FCL[k], FN[k], m, pen, sink);
      }
    }
  }
}

// Every family of lines laid across the face on paper, at its spacing, and each line
// taken back onto the face in the world, where the hidden-line test can see it. Per face,
// the lines are centred on the face, so none runs closer than half a spacing to its
// edges; on the lattice they sit at whole spacings across the sheet and line up from one
// face to the next, less any that would crowd an edge.
function hatchFace(i, k, w, list, n, pen, sink) {
  const o = i * 6, a = AX_A[k], b = AX_B[k];
  const la = BX[o + a], lb = BX[o + b];
  const Ea = BX[o + 3 + a] - la, Eb = BX[o + 3 + b] - lb;
  PA[k] = w; PA[a] = la; PA[b] = lb;
  const fx = PA[0], fy = PA[1], fz = PA[2];
  const p0x = S * (fx * PR0 + fy * PR1 + fz * PR2) + OX;
  const p0y = -S * (fx * PU0 + fy * PU1 + fz * PU2) + OY;
  const sax = S * Ea * PRV[a], say = -S * Ea * PUV[a];
  const sbx = S * Eb * PRV[b], sby = -S * Eb * PUV[b];

  for (const f of FAM[ROLE[k]]) {
    const nx = -f.uy, ny = f.ux, d = f.d;
    const o0 = nx * p0x + ny * p0y;
    const ga = nx * sax + ny * say, gb = nx * sbx + ny * sby;
    const lo = o0 + Math.min(0, ga) + Math.min(0, gb);
    const hi = o0 + Math.max(0, ga) + Math.max(0, gb);
    let first, count, step = d;
    if (f.solid) {
      // Edge to edge: the outermost passes run half a nib in from the two edges they are
      // parallel to, so their ink reaches those edges exactly, and the rest are spread
      // evenly between, never further apart than the spacing asked for. A face narrower
      // than the nib gets one pass down its middle.
      const inner = hi - lo - NIB;
      if (inner <= 0) { first = (lo + hi) / 2; count = 1; }
      else { count = Math.ceil(inner / d - 1e-9) + 1; step = inner / (count - 1); first = lo + NIB / 2; }
    } else if (PHASE_LATTICE) {
      const keep = 0.25 * d;
      first = Math.ceil((lo + keep) / d) * d;
      count = Math.floor((hi - keep - first) / d + 1e-9) + 1;
    } else {
      count = Math.floor((hi - lo) / d + 1e-9);
      first = lo + ((hi - lo) - (count - 1) * d) / 2;
    }
    let zig = null;                   // the zigzag being laid across this face
    let fills = [];                   // or, for a solid face, the strokes still open
    for (let t = 0; t < count; t++) {
      if (!squareChord(ga, gb, first + t * step - o0)) {
        if (!f.solid) zig = layZig(zig, sink, pen);
        continue;
      }
      PA[k] = w; PA[a] = la + CH[0] * Ea; PA[b] = lb + CH[1] * Eb;
      PB[k] = w; PB[a] = la + CH[2] * Ea; PB[b] = lb + CH[3] * Eb;
      if (f.solid) {
        fills = fillLine(fills, list, n, sink, pen);
        continue;
      }
      if (!JOIN_HATCH) {
        drawVisible(PA[0], PA[1], PA[2], PB[0], PB[1], PB[2], list, n, -1, pen, sink);
        continue;
      }
      const m = visibleSpans(PA[0], PA[1], PA[2], PB[0], PB[1], PB[2], list, n, false, MIN_STROKE);
      if (m === 1 && SPANS[0] === 0 && SPANS[1] === 1) {
        zig = zigLine(zig, list, n, sink, pen);
      } else {
        zig = layZig(zig, sink, pen);
        const pax = SEG_P[0], pay = SEG_P[1], dx = SEG_P[2] - pax, dy = SEG_P[3] - pay;
        for (let r = 0; r < m; r++) {
          const t0 = SPANS[r * 2], t1 = SPANS[r * 2 + 1];
          if (clipSeg(pax + dx * t0, pay + dy * t0, pax + dx * t1, pay + dy * t1)) {
            sink.seg(CLIP_OUT[0], CLIP_OUT[1], CLIP_OUT[2], CLIP_OUT[3], pen);
            C_HATCH++;
          }
        }
      }
    }
    layZig(zig, sink, pen);
    for (const z of fills) layZig(z, sink, pen);
  }
}

// A pass over a solid face carries on from wherever the one before it stopped. Each
// visible piece of it is taken up by the open stroke whose end lies nearest, entered from
// its nearer end, provided nothing hides the short way across; a piece no stroke can
// reach starts one of its own, and a stroke no piece took up is laid down. The way across
// runs inside the face, which is to be ink anyway, so a solid face goes down as one
// back-and-forth stroke wherever nothing in front of it breaks it up — the pen runs pass
// by pass without lifting — and as a few where something does. Pieces far shorter than the
// shortest stroke are kept: here each one is ink the face needs.
function fillLine(open, list, n, sink, pen) {
  const m = visibleSpans(PA[0], PA[1], PA[2], PB[0], PB[1], PB[2], list, n, true, FILL_MIN);
  if (!m) return open;
  const pax = SEG_P[0], pay = SEG_P[1], dx = SEG_P[2] - pax, dy = SEG_P[3] - pay;
  const ax = PA[0], ay = PA[1], az = PA[2], ex = PB[0] - ax, ey = PB[1] - ay, ez = PB[2] - az;
  const taken = new Uint8Array(open.length);
  const next = [];

  for (let r = 0; r < m; r++) {
    let best = -1, bestD = Infinity, rev = false;
    for (let z = 0; z < open.length; z++) {
      if (taken[z]) continue;
      const zz = open[z], lx = zz.xs[zz.xs.length - 1], ly = zz.ys[zz.ys.length - 1];
      for (let e = 0; e < 2; e++) {
        const t = SPANS[r * 2 + e];
        const ddx = pax + dx * t - lx, ddy = pay + dy * t - ly, dd = ddx * ddx + ddy * ddy;
        if (dd < bestD) { bestD = dd; best = z; rev = e === 1; }
      }
    }
    const t0 = SPANS[r * 2 + (rev ? 1 : 0)], t1 = SPANS[r * 2 + (rev ? 0 : 1)];
    const x0 = pax + dx * t0, y0 = pay + dy * t0, x1 = pax + dx * t1, y1 = pay + dy * t1;
    const out = [ax + ex * t1, ay + ey * t1, az + ez * t1];
    if (best >= 0) {
      const zz = open[best];
      if (segmentClear(zz.at[0], zz.at[1], zz.at[2], ax + ex * t0, ay + ey * t0, az + ez * t0, list, n)) {
        zz.xs.push(x0, x1); zz.ys.push(y0, y1);
        zz.at = out;
        zz.lines++;
        taken[best] = 1;
        next.push(zz);
        continue;
      }
    }
    next.push({ xs: [x0, x1], ys: [y0, y1], at: out, edge: -1, lines: 1 });
  }
  for (let z = 0; z < open.length; z++) if (!taken[z]) layZig(open[z], sink, pen);
  return next;
}

// Joining the hatch into zigzags. Two neighbouring lines that both show from end to end,
// with ends on the same edge of the face, are joined along that edge — if nothing hides
// the join either — so the pen goes down once for a whole run of them. The joins lie on
// the face's own edges, which are drawn anyway; the pen goes over them a second time.
// Everything is read off the line squareChord and visibleSpans have just laid: its ends
// in the face's own coordinates in CH, in the world in PA and PB, on paper in SEG_P.
function faceEdgeAt(u, v) {
  if (u < 1e-9) return 0;
  if (u > 1 - 1e-9) return 1;
  if (v < 1e-9) return 2;
  if (v > 1 - 1e-9) return 3;
  return -1;
}

function zigLine(zig, list, n, sink, pen) {
  const eA = faceEdgeAt(CH[0], CH[1]), eB = faceEdgeAt(CH[2], CH[3]);
  if (zig && zig.edge >= 0 && (zig.edge === eA || zig.edge === eB)) {
    const inA = zig.edge === eA;                   // enter at the end on the shared edge
    const P = inA ? PA : PB, Q = inA ? PB : PA;
    if (segmentClear(zig.at[0], zig.at[1], zig.at[2], P[0], P[1], P[2], list, n)) {
      const i0 = inA ? 0 : 2, i1 = inA ? 2 : 0;
      zig.xs.push(SEG_P[i0], SEG_P[i1]);
      zig.ys.push(SEG_P[i0 + 1], SEG_P[i1 + 1]);
      zig.at = [Q[0], Q[1], Q[2]];
      zig.edge = inA ? eB : eA;
      zig.lines++;
      return zig;
    }
  }
  layZig(zig, sink, pen);
  return { xs: [SEG_P[0], SEG_P[2]], ys: [SEG_P[1], SEG_P[3]], at: [PB[0], PB[1], PB[2]],
           edge: eB, lines: 1 };
}

function layZig(zig, sink, pen) {
  if (!zig) return null;
  const runs = [];
  clipRuns(zig.xs, zig.ys, zig.xs.length, runs);
  for (const [rx, ry] of runs) sink.run(rx, ry, rx.length, pen);
  C_HATCH += zig.lines;
  return null;
}

// Where the line ga·α + gb·β = h crosses the unit square of a face's own coordinates:
// the (α, β) of its two ends, one after the other, in CH.
const CH = new Float64Array(4);

function squareChord(ga, gb, h) {
  const flip = Math.abs(ga) < Math.abs(gb);
  const g1 = flip ? gb : ga, g2 = flip ? ga : gb;   // solve for the first, walk the second
  if (Math.abs(g1) < 1e-12) return false;
  let v0 = 0, v1 = 1;
  if (Math.abs(g2) > 1e-12) {
    const va = h / g2, vb = (h - g1) / g2;            // where the first is 0 and where it is 1
    v0 = Math.max(0, Math.min(va, vb));
    v1 = Math.min(1, Math.max(va, vb));
  } else {
    const u = h / g1;
    if (u < 0 || u > 1) return false;
  }
  if (v1 - v0 < 1e-9) return false;
  const u0 = (h - g2 * v0) / g1, u1 = (h - g2 * v1) / g1;
  if (flip) { CH[0] = v0; CH[1] = u0; CH[2] = v1; CH[3] = u1; }
  else      { CH[0] = u0; CH[1] = v0; CH[2] = u1; CH[3] = v1; }
  return true;
}

// One segment in the world, cut by the boxes on its list: the stretch each one hides is
// taken out, and what is left is written to SPANS as pairs of t, with the segment's two
// ends on paper in SEG_P. A piece cut shorter than `least` is left out; an edge nothing
// cut is kept however short, so the smallest boxes keep their outlines.
let IV = new Float64Array(256), SPANS = new Float64Array(256);
const SEG_P = new Float64Array(5);   // ax ay bx by on paper, and the length between

function visibleSpans(ax, ay, az, bx, by, bz, list, n, keepWhole, least) {
  const pax = S * (ax * PR0 + ay * PR1 + az * PR2) + OX;
  const pay = -S * (ax * PU0 + ay * PU1 + az * PU2) + OY;
  const pbx = S * (bx * PR0 + by * PR1 + bz * PR2) + OX;
  const pby = -S * (bx * PU0 + by * PU1 + bz * PU2) + OY;
  const len = Math.hypot(pbx - pax, pby - pay);
  SEG_P[0] = pax; SEG_P[1] = pay; SEG_P[2] = pbx; SEG_P[3] = pby; SEG_P[4] = len;
  if (len < 1e-6) return 0;
  const minx = pax < pbx ? pax : pbx, maxx = pax < pbx ? pbx : pax;
  const miny = pay < pby ? pay : pby, maxy = pay < pby ? pby : pay;
  const ex = bx - ax, ey = by - ay, ez = bz - az;

  let ni = 0;
  for (let q = 0; q < n; q++) {
    const j = list[q], c = j * 4;
    if (BS[c] >= maxx || BS[c + 2] <= minx || BS[c + 1] >= maxy || BS[c + 3] <= miny) continue;
    if (!hideSpan(ax, ay, az, ex, ey, ez, j)) continue;
    if (HT0 <= 0 && HT1 >= 1) return 0;
    if (ni * 2 + 2 > IV.length) { const g = new Float64Array(IV.length * 2); g.set(IV); IV = g; }
    IV[ni * 2] = HT0; IV[ni * 2 + 1] = HT1;
    ni++;
  }
  if (ni === 0) {
    if (!keepWhole && len < least) return 0;
    SPANS[0] = 0; SPANS[1] = 1;
    return 1;
  }

  for (let r = 1; r < ni; r++) {                  // by where each hidden stretch starts
    const s0 = IV[r * 2], s1 = IV[r * 2 + 1];
    let q = r - 1;
    while (q >= 0 && IV[q * 2] > s0) {
      IV[q * 2 + 2] = IV[q * 2]; IV[q * 2 + 3] = IV[q * 2 + 1];
      q--;
    }
    IV[q * 2 + 2] = s0; IV[q * 2 + 3] = s1;
  }
  if (SPANS.length < IV.length + 2) SPANS = new Float64Array(IV.length + 2);

  let t = 0, m = 0;
  for (let r = 0; r <= ni && t < 1; r++) {
    const s0 = r < ni ? IV[r * 2] : 1;
    if (s0 > t) {
      const t1 = s0 < 1 ? s0 : 1;
      if ((t1 - t) * len >= least) { SPANS[m * 2] = t; SPANS[m * 2 + 1] = t1; m++; }
    }
    if (r < ni && IV[r * 2 + 1] > t) t = IV[r * 2 + 1];
  }
  return m;
}

// Whether no box on the list hides any of a segment.
function segmentClear(ax, ay, az, bx, by, bz, list, n) {
  const ex = bx - ax, ey = by - ay, ez = bz - az;
  for (let q = 0; q < n; q++) {
    if (hideSpan(ax, ay, az, ex, ey, ez, list[q]) && HT1 - HT0 > 1e-9) return false;
  }
  return true;
}

// What is left of a segment goes to the sheet — a hatch line straight to the sink, a
// piece of edge into the pool, where edges from all the boxes are merged and strung
// together before they are drawn.
function drawVisible(ax, ay, az, bx, by, bz, list, n, axis, pen, sink) {
  const k = visibleSpans(ax, ay, az, bx, by, bz, list, n, axis >= 0, MIN_STROKE);
  const pax = SEG_P[0], pay = SEG_P[1], dx = SEG_P[2] - pax, dy = SEG_P[3] - pay;
  for (let r = 0; r < k; r++) {
    const t0 = SPANS[r * 2], t1 = SPANS[r * 2 + 1];
    const x0 = pax + dx * t0, y0 = pay + dy * t0, x1 = pax + dx * t1, y1 = pay + dy * t1;
    if (axis >= 0) {
      poolEdge(x0, y0, x1, y1, pen, axis);
    } else if (clipSeg(x0, y0, x1, y1)) {
      sink.seg(CLIP_OUT[0], CLIP_OUT[1], CLIP_OUT[2], CLIP_OUT[3], pen);
      C_HATCH++;
    }
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Edges, merged and strung together
//
// Edges from two boxes can fall on the very same line on paper. The lattice the boxes
// are cut on sees to that: in true isometric a whole field of edges lines up exactly,
// one box's edge running on where another's stops, or lying right over it where one
// box only grazes the outline of the next. So every visible piece of edge is filed
// under its pen, the axis it runs along and how far across the sheet its line lies, and
// the pieces on one line are joined into as few strokes as they cover — no line is ever
// drawn twice. Then pieces that meet end to end, the corners of one box mostly, are
// strung into one stroke, so the pen goes round an outline without lifting.

let EP = new Float64Array(4 * 4096);   // x0 y0 x1 y1 on paper
let EPA = new Uint8Array(4096);        // the axis the edge runs along
let EPP = new Int8Array(4096);         // its pen
let EPN = 0;

function poolEdge(x0, y0, x1, y1, pen, axis) {
  if (EPN === EPA.length) {
    const n = EPA.length * 2;
    const a = new Float64Array(n * 4); a.set(EP); EP = a;
    const b = new Uint8Array(n); b.set(EPA); EPA = b;
    const c = new Int8Array(n); c.set(EPP); EPP = c;
  }
  EP[EPN * 4] = x0; EP[EPN * 4 + 1] = y0; EP[EPN * 4 + 2] = x1; EP[EPN * 4 + 3] = y1;
  EPA[EPN] = axis; EPP[EPN] = pen;
  EPN++;
}

// The pool with every line's pieces joined up: { seg, pen, n }.
function mergeEdges() {
  const lines = new Map();
  for (let i = 0; i < EPN; i++) {
    const u = UDIR[EPA[i]];
    if (!u) continue;
    const mx = (EP[i * 4] + EP[i * 4 + 2]) / 2, my = (EP[i * 4 + 1] + EP[i * 4 + 3]) / 2;
    const off = -u[1] * mx + u[0] * my;
    const key = (Math.round(off / MERGE_MM) * 3 + EPA[i]) * 4 + EPP[i];
    const l = lines.get(key);
    if (l) l.push(i); else lines.set(key, [i]);
  }

  const seg = new Float64Array(EPN * 4), pen = new Int8Array(EPN);
  let n = 0;
  const put = (x0, y0, x1, y1, p) => {
    seg[n * 4] = x0; seg[n * 4 + 1] = y0; seg[n * 4 + 2] = x1; seg[n * 4 + 3] = y1;
    pen[n++] = p;
  };

  for (const list of lines.values()) {
    const i0 = list[0];
    if (list.length === 1) {
      put(EP[i0 * 4], EP[i0 * 4 + 1], EP[i0 * 4 + 2], EP[i0 * 4 + 3], EPP[i0]);
      continue;
    }
    const u = UDIR[EPA[i0]], ux = u[0], uy = u[1];
    const off = -uy * EP[i0 * 4] + ux * EP[i0 * 4 + 1];
    const runs = list.map(i => {
      const a = ux * EP[i * 4] + uy * EP[i * 4 + 1], b = ux * EP[i * 4 + 2] + uy * EP[i * 4 + 3];
      return a < b ? [a, b] : [b, a];
    }).sort((p, q) => p[0] - q[0]);
    // back from (along, across) to the sheet: along·u + across·(−uy, ux)
    const emit = (a, b) => put(a * ux - off * uy, a * uy + off * ux,
                               b * ux - off * uy, b * uy + off * ux, EPP[i0]);
    let [a, b] = runs[0];
    for (let r = 1; r < runs.length; r++) {
      if (runs[r][0] <= b + MERGE_MM) { if (runs[r][1] > b) b = runs[r][1]; }
      else { emit(a, b); [a, b] = runs[r]; }
    }
    emit(a, b);
  }
  return { seg, pen, n };
}

function chainEdges(E, sink) {
  const { seg, pen, n } = E;
  const key = (x, y) => Math.round((x + 4096) * 1000) * 8388608 + Math.round((y + 4096) * 1000);
  const ends = new Map();
  for (let e = 0; e < 2 * n; e++) {
    const k = key(seg[e * 2], seg[e * 2 + 1]);
    const l = ends.get(k);
    if (l) l.push(e); else ends.set(k, [e]);
  }
  const used = new Uint8Array(n);

  // Walk on from the last point for as long as an unused piece in the same pen starts
  // there. A piece that carries straight on replaces the last point instead of adding a
  // corner.
  const extend = (xs, ys, p) => {
    for (;;) {
      const m = xs.length;
      const l = ends.get(key(xs[m - 1], ys[m - 1]));
      let hit = -1;
      if (l) for (const e of l) if (!used[e >> 1] && pen[e >> 1] === p) { hit = e; break; }
      if (hit < 0) return;
      const s = hit >> 1, far = (hit & 1) ? 0 : 1;
      used[s] = 1;
      const nx = seg[s * 4 + far * 2], ny = seg[s * 4 + far * 2 + 1];
      if (m >= 2) {
        const ax = xs[m - 1] - xs[m - 2], ay = ys[m - 1] - ys[m - 2];
        const bx = nx - xs[m - 1], by = ny - ys[m - 1];
        if (Math.abs(ax * by - ay * bx) < 1e-9 * (Math.hypot(ax, ay) * Math.hypot(bx, by) + 1e-12) &&
            ax * bx + ay * by > 0) {
          xs[m - 1] = nx; ys[m - 1] = ny;
          continue;
        }
      }
      xs.push(nx); ys.push(ny);
    }
  };

  // A network of edges goes down in the fewest strokes when every stroke starts and ends
  // where an odd number of edges meet — a box drawn whole has four such corners and so
  // wants two strokes, not three. So the walks start from those corners first, and the
  // closed loops left over after them.
  const odd = new Uint8Array(2 * n);
  for (const list of ends.values()) {
    for (let a = 0; a < list.length; a++) {
      let deg = 0;
      for (const e of list) if (pen[e >> 1] === pen[list[a] >> 1]) deg++;
      odd[list[a]] = deg & 1;
    }
  }
  const starts = [];
  for (let e = 0; e < 2 * n; e++) if (odd[e]) starts.push(e);
  for (let e = 0; e < 2 * n; e += 2) starts.push(e);

  const runs = [];
  for (const e0 of starts) {
    const i = e0 >> 1;
    if (used[i]) continue;
    used[i] = 1;
    const a = e0 & 1, b = 1 - a;                  // leave from the end the walk starts at
    const xs = [seg[i * 4 + a * 2], seg[i * 4 + b * 2]];
    const ys = [seg[i * 4 + a * 2 + 1], seg[i * 4 + b * 2 + 1]];
    extend(xs, ys, pen[i]);
    xs.reverse(); ys.reverse();
    extend(xs, ys, pen[i]);
    runs.length = 0;
    clipRuns(xs, ys, xs.length, runs);
    for (const [rx, ry] of runs) sink.run(rx, ry, rx.length, pen[i]);
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Sinks and clipping
//
// Everything drawn ends up as polylines in millimetres, each with the pen that draws it,
// clipped to the drawable box on the way in.

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
    seg(x0, y0, x1, y1, id) {
      pts.push(x0, y0, x1, y1);
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
// returns whether any of it survived; nothing is allocated, it runs once per piece.
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

// The pieces of one polyline that survive the box, in the order they were walked.
function clipRuns(px, py, n, out) {
  if (n < 2) return;

  let allIn = true;
  for (let i = 0; i < n; i++) {
    if (!insideArea(px[i], py[i])) { allIn = false; break; }
  }
  if (allIn) { out.push([px, py]); return; }

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

// Cut guides: a dot in every corner of the sheet and each side split evenly, so no two
// dots are further apart than asked — lay a ruler through two of them and cut.
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

function penIdx(v) {
  const pens = Math.round(clamp(settings.pens, 1, MAX_PENS));
  return clamp(Math.round(v), 1, pens) - 1;
}

function buildShapes() {
  const s = settings;
  const pens = Math.round(clamp(s.pens, 1, MAX_PENS));
  perPen = [];
  for (let i = 0; i < pens; i++) perPen.push({ strokes: 0, ink: 0 });

  PEN_EDGE = penIdx(s.edgePen);
  PEN_ROLE[0] = penIdx(s.topPen);
  PEN_ROLE[1] = penIdx(s.leftPen);
  PEN_ROLE[2] = penIdx(s.rightPen);
  PEN_LOOSE = s.loosePen >= 1 && pens > 1 ? penIdx(s.loosePen) : -1;
  EDGE_MODE = Math.max(0, EDGE_MODES.indexOf(s.edges));
  PHASE_LATTICE = s.hatchPhase === 'lattice';
  JOIN_HATCH = !!s.hatchJoin;
  HATCH_LOOSE = !!s.looseHatch;
  NIB = Math.max(0.01, s.penWidth);
  MIN_STROKE = Math.max(0, s.minStroke);
  C_FACES = C_HIDDEN = C_HATCH = 0;
  EPN = 0;

  if (STAMP.length < NB) {
    STAMP = new Int32Array(NB);
    CAND = new Int32Array(NB);
    for (let k = 0; k < 3; k++) FCL[k] = new Int32Array(NB);
  } else {
    STAMP.fill(0);
  }
  buildBins();

  const sink = makeSink();
  for (let i = 0; i < NB; i++) drawBox(i, sink);
  const merged = mergeEdges();
  chainEdges(merged, sink);
  if (s.cropMarks) cropMarkShapes(sink);

  for (const id of sink.ink) if (id >= 0 && perPen[id]) perPen[id].strokes++;
  counts = { faces: C_FACES, hidden: C_HIDDEN, hatch: C_HATCH, edges: merged.n };

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
// exports, in the order and the colours the plotter will use, on a sheet the colour of
// the paper, so what you see is what it draws. The guides sit on top; they are not part
// of the plot.

function inkColor(id) {
  if (id === INK_MARK) return '#888888';
  return settings['ink' + clamp(id, 0, MAX_PENS - 1)];
}

function darkPaper() {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(settings.paperColor || '');
  if (!m) return false;
  const [r, g, b] = [m[1], m[2], m[3]].map(h => parseInt(h, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.45;
}

function drawPreview() {
  background(settings.paperColor);
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

// The margin, and an arrow from the middle of the solid the way the front runs and as
// far as the drift carries the loosest boxes.
function drawGuides(ctx, s) {
  const dark = darkPaper();
  ctx.save();
  ctx.scale(s, s);
  ctx.lineWidth = 0.35;
  ctx.setLineDash([2.5, 2.5]);
  ctx.strokeStyle = dark ? 'rgba(130, 175, 255, 0.55)' : 'rgba(26, 109, 209, 0.5)';
  ctx.strokeRect(area.x0, area.y0, area.w, area.h);
  ctx.setLineDash([]);

  if (struct && struct.n && (ER_MODE === 1 || ER_MODE === 3)) {
    const b = struct.M.bbox;
    const cx = (b[0] + b[3]) / 2, cy = (b[1] + b[4]) / 2, cz = (b[2] + b[5]) / 2;
    const L = Math.max(0.15 * MASS_L, Math.max(0, settings.drift) / 100 * MASS_L);
    const x0 = S * (cx * PR0 + cy * PR1 + cz * PR2) + OX;
    const y0 = -S * (cx * PU0 + cy * PU1 + cz * PU2) + OY;
    const x1 = x0 + S * L * (DRX * PR0 + DRY * PR1 + DRZ * PR2);
    const y1 = y0 - S * L * (DRX * PU0 + DRY * PU1 + DRZ * PU2);
    const l = Math.hypot(x1 - x0, y1 - y0);
    ctx.strokeStyle = dark ? 'rgba(255, 150, 90, 0.8)' : 'rgba(178, 58, 0, 0.75)';
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.arc(x0, y0, 1.2, 0, Math.PI * 2);
    if (l > 2) {
      const ux = (x1 - x0) / l, uy = (y1 - y0) / l, h = Math.min(4, l / 3);
      ctx.moveTo(x0 + ux * 1.2, y0 + uy * 1.2);
      ctx.lineTo(x1, y1);
      ctx.moveTo(x1 - h * (ux - 0.5 * uy), y1 - h * (uy + 0.5 * ux));
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1 - h * (ux + 0.5 * uy), y1 - h * (uy - 0.5 * ux));
    }
    ctx.stroke();
  }
  ctx.restore();
}

// While the camera moves and a whole update cannot keep up, only the boxes follow: each
// one's visible faces filled with the colour of the paper and outlined, painted back to
// front by how near their middles are. Painting by middles can be wrong where a long box
// meets a short one, which is why it is only the sketch of the view and not the plot.
function drawModel() {
  background(settings.paperColor);
  if (!area || area.w <= 0 || area.h <= 0) return;
  const s = previewScale(), ctx = drawingContext;
  ctx.save();
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.rect(area.x0, area.y0, area.w, area.h);
  ctx.clip();

  const order = new Uint32Array(NB);
  for (let i = 0; i < NB; i++) order[i] = i;
  order.sort((a, b) => (BD[a * 2] + BD[a * 2 + 1]) - (BD[b * 2] + BD[b * 2 + 1]));

  ctx.lineWidth = Math.max(settings.penWidth, 0.15);
  ctx.lineJoin = 'round';
  ctx.fillStyle = settings.paperColor;
  ctx.strokeStyle = settings.ink0;
  for (let t = 0; t < NB; t++) {
    const i = order[t], o = i * 6;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      if (!FACE_ON[k]) continue;
      faceCorners(i, k, FACE_HI[k] ? BX[o + 3 + k] : BX[o + k]);
      for (const c of [0, 1, 3, 2]) {
        const q = c * 3;
        const px = S * (QP[q] * PR0 + QP[q + 1] * PR1 + QP[q + 2] * PR2) + OX;
        const py = -S * (QP[q] * PU0 + QP[q + 1] * PU1 + QP[q + 2] * PU2) + OY;
        if (c === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  if (settings.showGuides) drawGuides(ctx, s);
}

function showModel() {
  const st = ensureStructure();
  area = drawArea();
  if (!st.n || area.w <= 0 || area.h <= 0) return;
  makeView();
  fitView(st);
  placeBoxes(st);
  shapes = plan = null;
  drawModel();
}

////////////////////////////////////////////////////////////////////////////////////////
// Mouse and keys
//
// Dragging the sheet turns the camera: across is the azimuth, up and down the elevation
// — or, for the other two projections, what stands in for them. Shift-drag, or a drag
// with the right button, pans, and the wheel zooms about the point under the cursor.
// The listeners sit on the canvas itself, so dragging a slider never moves the camera.

function paperPoint(e) {
  const c = canvasEl();
  const r = c.getBoundingClientRect();
  const [W, H] = paperDims();
  return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
}

function attachPointer() {
  const c = canvasEl();
  if (!c) return;
  c.addEventListener('contextmenu', e => e.preventDefault());

  c.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.button !== 2) return;
    drag = {
      pan: e.shiftKey || e.button === 2, x: e.clientX, y: e.clientY, p: paperPoint(e),
      az: settings.azimuth, el: settings.elevation, hs: settings.heightScale,
      oa: settings.obliqueAngle, od: settings.obliqueDepth,
      panX: settings.panX, panY: settings.panY, moved: false,
    };
    c.classList.add('dragging');
    c.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  c.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 3) return;
    drag.moved = true;
    if (drag.pan) {
      const p = paperPoint(e), z = settings.zoom / 100;
      settings.panX = +(drag.panX - (p[0] - drag.p[0]) / z).toFixed(2);
      settings.panY = +(drag.panY - (p[1] - drag.p[1]) / z).toFixed(2);
    } else {
      turnCamera(dx, dy);
    }
    if (!liveUpdate()) showModel();
    e.preventDefault();
  });

  const end = e => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    c.classList.remove('dragging');
    if (moved) update();
    if (e) e.preventDefault();
  };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', end);

  c.addEventListener('wheel', e => {
    e.preventDefault();
    if (drag) return;
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    zoomAbout(Math.exp(-delta * WHEEL_ZOOM), paperPoint(e));
  }, { passive: false });
}

function turnCamera(dx, dy) {
  const s = settings;
  if (s.projection === 'oblique') {
    s.obliqueAngle = +((drag.oa - dx * DRAG_DEG_PX) % 360 + 360).toFixed(1) % 360;
    s.obliqueDepth = +clamp(drag.od + dy * 0.004, 0.05, 1.5).toFixed(3);
  } else {
    s.azimuth = +wrapDeg(drag.az - dx * DRAG_DEG_PX).toFixed(1);
    if (s.projection === 'military') {
      s.heightScale = +clamp(drag.hs * Math.exp(-dy * 0.004), 0.1, 3).toFixed(3);
    } else {
      s.elevation = +clamp(drag.el + dy * DRAG_DEG_PX, -90, 90).toFixed(1);
    }
  }
  for (const k of ['azimuth', 'elevation', 'heightScale', 'obliqueAngle', 'obliqueDepth']) {
    if (setters[k]) setters[k](s[k]);
  }
}

// Zoom by a factor, keeping the paper point m where it is — the middle of the drawable
// box when none is given.
function zoomAbout(factor, m) {
  const bcx = (area.x0 + area.x1) / 2, bcy = (area.y0 + area.y1) / 2;
  const z  = settings.zoom / 100;
  const z2 = clamp(Math.round(z * factor * 1000) / 1000, MIN_ZOOM / 100, MAX_ZOOM / 100);
  if (z2 === z) return;
  if (m) {
    settings.panX = +(settings.panX + (m[0] - bcx) * (1 / z - 1 / z2)).toFixed(2);
    settings.panY = +(settings.panY + (m[1] - bcy) * (1 / z - 1 / z2)).toFixed(2);
  }
  settings.zoom = Math.round(z2 * 1000) / 10;
  if (setters.zoom) setters.zoom(settings.zoom);
  if (!liveUpdate()) { showModel(); settle(); }
}

function resetZoom() {
  settings.zoom = DEFAULTS.zoom;
  settings.panX = DEFAULTS.panX;
  settings.panY = DEFAULTS.panY;
  if (setters.zoom) setters.zoom(settings.zoom);
  update();
}

function attachKeys() {
  window.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable ||
        (t.tagName === 'INPUT' && !['checkbox', 'button', 'color'].includes(t.type)))) return;
    if (e.metaKey || e.ctrlKey || e.altKey || drag) return;
    const s = settings, step = e.shiftKey ? 10 : 1;

    const turn = (da, de) => {
      if (s.projection === 'oblique') {
        s.obliqueAngle = ((s.obliqueAngle + da) % 360 + 360) % 360;
        s.obliqueDepth = +clamp(s.obliqueDepth - de * 0.01, 0.05, 1.5).toFixed(3);
      } else {
        s.azimuth = wrapDeg(s.azimuth + da);
        if (s.projection === 'military') {
          s.heightScale = +clamp(s.heightScale + de * 0.01, 0.1, 3).toFixed(3);
        } else {
          s.elevation = clamp(+(s.elevation + de).toFixed(2), -90, 90);
        }
      }
      refreshControls();
      update();
    };
    const reseed = v => {
      s.seed = v;
      if (setters.seed) setters.seed(s.seed);
      update();
    };

    switch (e.key) {
      case 'ArrowLeft':  turn(step, 0); break;
      case 'ArrowRight': turn(-step, 0); break;
      case 'ArrowUp':    turn(0, -step); break;
      case 'ArrowDown':  turn(0, step); break;
      case 'r': case 'R': reseed(Math.floor(Math.random() * 100000)); break;
      case '[': reseed(Math.max(0, Math.round(s.seed) - 1)); break;
      case ']': reseed(Math.round(s.seed) + 1); break;
      case '+': case '=': zoomAbout(1.25); break;
      case '-': case '_': zoomAbout(1 / 1.25); break;
      case '0': resetZoom(); break;
      case 'p': case 'P':
        s.projection = PROJECTIONS[(PROJECTIONS.indexOf(s.projection) + 1) % PROJECTIONS.length];
        refreshControls();
        update();
        break;
      case 'g': case 'G':
        s.showGuides = !s.showGuides;
        if (setters.showGuides) setters.showGuides(s.showGuides);
        drawPreview();
        syncUrl();
        break;
      default: return;
    }
    e.preventDefault();
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

function syncVisibility() {
  const s = settings;
  const pens = Math.round(clamp(s.pens, 1, MAX_PENS));
  const axo = s.projection === 'axonometric', mil = s.projection === 'military';
  const obl = s.projection === 'oblique';
  const drifting = s.dissolve !== 'none';

  setVisible('cropMarkGap', s.cropMarks);
  setVisible('azimuth', !obl);
  setVisible('elevation', axo);
  setVisible('heightScale', mil);
  setVisible('obliqueAngle', obl);
  setVisible('obliqueDepth', obl);

  const tower = s.shape === 'tower on plinth';
  for (const k of ['plinthH', 'towerW', 'towerD', 'towerX', 'towerZ']) setVisible(k, tower);
  setVisible('tiers', s.shape === 'steps');
  setVisible('lots', s.shape === 'city');
  setVisible('street', s.shape === 'city');
  setVisible('wall', ['arch', 'courtyard', 'ring'].includes(s.shape));
  setVisible('blobSize', s.shape === 'blob');
  setVisible('blobFill', s.shape === 'blob');

  for (const k of ['frontAt', 'frontDepth', 'ragged', 'noiseSize', 'crumble', 'drift',
                   'scatter', 'shrink', 'thinning']) setVisible(k, drifting);
  setVisible('towardAz', s.dissolve === 'toward' || s.dissolve === 'noise');
  setVisible('towardEl', s.dissolve === 'toward' || s.dissolve === 'noise');

  const spaced = p => p !== 'none' && p !== 'solid';
  setVisible('topSpacing', spaced(s.topHatch));
  setVisible('leftSpacing', spaced(s.leftHatch));
  setVisible('rightSpacing', spaced(s.rightHatch));
  setVisible('solidGap', [s.topHatch, s.leftHatch, s.rightHatch].includes('solid'));

  setVisible('ink1', pens > 1);
  setVisible('ink2', pens > 2);
  setVisible('topPen', pens > 1 && s.topHatch !== 'none');
  setVisible('leftPen', pens > 1 && s.leftHatch !== 'none');
  setVisible('rightPen', pens > 1 && s.rightHatch !== 'none');
  setVisible('edgePen', pens > 1 && s.edges !== 'none');
  setVisible('looseHatch', drifting);
  setVisible('loosePen', pens > 1 && drifting);
  setVisible('looseAt', drifting && (!s.looseHatch || (pens > 1 && s.loosePen >= 1)));
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
    if (redrawOnly) drawPreview();
    else if (!liveUpdate() && isCamera(key)) showModel();
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

function isCamera(key) {
  return ['azimuth', 'elevation', 'heightScale', 'obliqueAngle', 'obliqueDepth', 'zoom']
    .includes(key);
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

function addColor(parent, labelText, key, hint) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const cp = createColorPicker(settings[key]).parent(field);
  if (hint) createDiv(hint).parent(field).class('note');
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
  createDiv('Where the cuts fall, which boxes stay and how far each one flies. <b>R</b> ' +
    'rolls a new one, <b>[</b> and <b>]</b> step through them.').parent(field).class('note');

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
    'Split the drawing between two or three colours — one pass of the plotter each. ' +
    'Which part goes to which pen is set under <b>Hatching</b> and <b>Coming apart</b>.');
  addColor(root, 'Ink', 'ink0');
  addColor(root, 'Second pen', 'ink1');
  addColor(root, 'Third pen', 'ink2');
  addColor(root, 'Paper colour', 'paperColor',
    'The preview only — the file has no background. Black paper and a white gel pen is ' +
    'how this kind of drawing is often plotted.');

  // --- Paper ---
  addSection(root, 'Paper');
  addSelect(root, 'Size', 'paper', Object.keys(PAPER_SIZES), resizeForPaper);
  addSelect(root, 'Orientation', 'orientation', ['portrait', 'landscape'], resizeForPaper);
  addSlider(root, 'Margin (mm)', 'margin', 0, 60, 1);
  addCheckbox(root, 'Cut guide dots around the sheet', 'cropMarks');
  addSlider(root, 'Most between two dots (mm)', 'cropMarkGap', 20, 600, 5,
    'A dot in every corner, and each side split evenly so no gap is wider than this — ' +
    'lay a ruler through two dots and cut.');

  // --- Camera ---
  addSection(root, 'Camera');
  addSelect(root, 'Projection', 'projection', PROJECTIONS, refit,
    '<b>axonometric</b> — the camera far away at an azimuth and an elevation; 45° and ' +
    '35.26° is true isometric.<br>' +
    '<b>military</b> — the ground plan drawn true and turned, the height straight up.<br>' +
    '<b>oblique</b> — the front drawn true, the depth running off at an angle.<br>' +
    'All three are parallel: a line is the same weight near and far, and so is the ' +
    'hatching.');
  addSlider(root, 'Azimuth (°)', 'azimuth', -180, 180, 0.5,
    'Round the vertical. Dragging across the sheet does the same.');
  addSlider(root, 'Elevation (°)', 'elevation', -90, 90, 0.01,
    'Above the horizon. 35.26° at azimuth 45° puts every edge of the ground at 30° on ' +
    'paper; lower, the sides grow and the tops shrink.');
  addSlider(root, 'Height scale', 'heightScale', 0.1, 3, 0.01,
    'How tall one cell of height is drawn next to one cell of plan. Military drawings ' +
    'often shorten it to two thirds or three quarters.');
  addSlider(root, 'Depth angle (°)', 'obliqueAngle', 0, 360, 0.5,
    'Which way depth runs off on paper — 45° is up and to the right.');
  addSlider(root, 'Depth scale', 'obliqueDepth', 0.05, 1.5, 0.01,
    '<b>0.5</b> is cabinet, <b>1</b> cavalier.');
  addSlider(root, 'Zoom (%)', 'zoom', MIN_ZOOM, MAX_ZOOM, 1,
    'At 100 % every box that is left, the loose ones too, just fits inside the margin. ' +
    'Past that the drawing is cut at the margin. The wheel zooms about the point under ' +
    'the cursor.');
  createButton('Reset zoom and pan').parent(root).mousePressed(resetZoom);

  // --- The solid ---
  addSection(root, 'The solid');
  addSelect(root, 'Shape', 'shape', SHAPES, refit,
    '<b>tower on plinth</b> — a tall block standing on a wide low one.<br>' +
    '<b>block</b> — one box.<br>' +
    '<b>steps</b> — a ziggurat, each tier set in from the one below.<br>' +
    '<b>city</b> — lots on a grid with streets between, tallest in the middle.<br>' +
    '<b>courtyard</b> — four walls round an open square.<br>' +
    '<b>arch</b> — two piers and a round arch, through the whole depth.<br>' +
    '<b>cylinder</b> — a round tower; <b>ring</b> — a ring lying flat.<br>' +
    '<b>ball</b>, <b>blob</b> — round, and round with a lumpy skin.');
  addSlider(root, 'Width (cells)', 'massW', 1, 200, 1);
  addSlider(root, 'Depth (cells)', 'massD', 1, 200, 1);
  addSlider(root, 'Height (cells)', 'massH', 1, 200, 1,
    'A cell is the unit everything is cut in. Only the ratios matter — the fit sizes the ' +
    'whole to the sheet — but more cells mean smaller boxes, and more of them.');
  addSlider(root, 'Plinth height (%)', 'plinthH', 1, 100, 1);
  addSlider(root, 'Tower width (%)', 'towerW', 1, 100, 1);
  addSlider(root, 'Tower depth (%)', 'towerD', 1, 100, 1);
  addSlider(root, 'Tower across (%)', 'towerX', 0, 100, 1);
  addSlider(root, 'Tower deep (%)', 'towerZ', 0, 100, 1,
    'Where on the plinth the tower stands, from one end to the other each way.');
  addSlider(root, 'Tiers', 'tiers', 1, 20, 1);
  addSlider(root, 'Lots along a side', 'lots', 1, 12, 1);
  addSlider(root, 'Street (cells)', 'street', 0, 12, 1);
  addSlider(root, 'Walls (%)', 'wall', 1, 49, 1,
    'How thick the piers of the arch are, the walls of the courtyard or the ring, as a ' +
    'share of the width.');
  addSlider(root, 'Lump size (cells)', 'blobSize', 2, 100, 1);
  addSlider(root, 'Fullness (%)', 'blobFill', 0, 100, 1);

  // --- Boxes ---
  addSection(root, 'Boxes');
  addSeedField(root);
  addSlider(root, 'Smallest box (cells)', 'minBox', 1, 8, 1);
  addSlider(root, 'Widest box (cells)', 'maxBox', 1, 64, 0.5);
  addSlider(root, 'Tallest box (cells)', 'maxTall', 1, 128, 0.5,
    'Where the solid still stands. A box larger than this is cut across its longest ' +
    'side at a whole cell somewhere near its middle, and its halves the same, until ' +
    'none is. A tallest box several times the widest makes towers.');
  addSlider(root, 'Variety', 'variety', 0, 1, 0.01,
    'The chance that a box already small enough is cut once more anyway. At 0 all the ' +
    'boxes are about as big as they may be; towards 1 small ones crowd in among them.');
  addSlider(root, 'Holes (%)', 'porosity', 0, 90, 1,
    'Boxes left out of the standing solid, so the eye can reach in between the others.');
  addSlider(root, 'Uneven tops (%)', 'unevenTops', 0, 90, 1,
    'How far short of the top of its cell a box may stop — what turns the flat roof of a ' +
    'block into a skyline.');
  addSlider(root, 'Gap (mm)', 'gap', 0, 5, 0.05,
    'On paper, between two neighbours. Each box is shrunk by half of it all round, so ' +
    'every box keeps an outline of its own.');

  // --- Coming apart ---
  addSection(root, 'Coming apart');
  addSelect(root, 'Front', 'dissolve', DISSOLVES, refit,
    '<b>toward</b> — a front crosses the solid in one direction and the boxes fly off ' +
    'that way.<br>' +
    '<b>outward</b> — it spreads from the middle and everything bursts outward.<br>' +
    '<b>noise</b> — a slow field decides where the solid gives, and the loose boxes ' +
    'drift one way.<br>' +
    '<b>none</b> — the solid stands whole.');
  addSlider(root, 'Direction (°)', 'towardAz', 0, 360, 1,
    'On the same compass the camera turns on: the camera\'s own azimuth sends the boxes ' +
    'at the viewer, ninety less off to the left of the sheet. The arrow on the sheet ' +
    'shows the way.');
  addSlider(root, 'Rising (°)', 'towardEl', -90, 90, 1);
  addSlider(root, 'Front starts at (%)', 'frontAt', -50, 150, 1,
    'How far through the solid — along the direction, out from the middle, or up the ' +
    'noise — the first box comes loose.');
  addSlider(root, 'Front depth (%)', 'frontDepth', 1, 200, 1,
    'How much of the solid it takes to go from standing to gone. Short is a clean break; ' +
    'long is a slow erosion.');
  addSlider(root, 'Ragged', 'ragged', 0, 1.5, 0.01,
    'Noise pushing the front back and forth, so it breaks along lumps and not along a ' +
    'plane.');
  addSlider(root, 'Lump size (cells)', 'noiseSize', 2, 100, 1);
  addSlider(root, 'Crumble', 'crumble', 0, 1, 0.01,
    'How much smaller the boxes are cut as the front reaches them. The width goes first ' +
    'and the height after, so the loose ones come off as thin upright slivers.');
  addSlider(root, 'Drift (% of the solid)', 'drift', 0, 200, 1,
    'How far the loosest boxes fly. Halfway through the front a box goes half as far ' +
    'as at its far side — each one anywhere from 0.4 to 1.6 times that.');
  addSlider(root, 'Scatter (% of the solid)', 'scatter', 0, 100, 1,
    'How far each loose box strays off that line, any way at all.');
  addSlider(root, 'Shrink', 'shrink', 0, 1, 0.01,
    'How much smaller a loose box gets as it goes.');
  addSlider(root, 'Thinning', 'thinning', 0.1, 5, 0.05,
    'How fast the loose boxes thin out across the front: below 1 the spray is dense ' +
    'right to its far side, above 1 only a few make it far.');
  addCheckbox(root, 'Hatch the loose boxes', 'looseHatch');
  addSlider(root, 'Loose boxes pen', 'loosePen', 0, MAX_PENS, 1,
    'At <b>0</b> the loose boxes are drawn like the rest; otherwise every line of them ' +
    'goes to this pen.');
  addSlider(root, 'Loose from (% through the front)', 'looseAt', 0, 100, 1,
    'How far through the front a box has to be to count as loose — at 0 everything the ' +
    'front has reached, higher only the spray. Loose boxes left unhatched are drawn as ' +
    'outlines alone, which keeps the spray light and saves a pen lift per line.');

  // --- Hatching ---
  addSection(root, 'Hatching');
  addSelect(root, 'Tops', 'topHatch', TOP_HATCHES, refit,
    '<b>along left</b>, <b>along right</b> — parallel to where the top meets the left or ' +
    'the right face; <b>grid</b> — both.');
  addSlider(root, 'Top spacing (mm)', 'topSpacing', 0.2, 10, 0.05);
  addSlider(root, 'Top pen', 'topPen', 1, MAX_PENS, 1);
  addSelect(root, 'Left faces', 'leftHatch', SIDE_HATCHES, refit);
  addSlider(root, 'Left spacing (mm)', 'leftSpacing', 0.2, 10, 0.05);
  addSlider(root, 'Left pen', 'leftPen', 1, MAX_PENS, 1);
  addSelect(root, 'Right faces', 'rightHatch', SIDE_HATCHES, refit,
    '<b>vertical</b> — up the face; <b>horizontal</b> — along it, like storeys; ' +
    '<b>grid</b> — both, like windows; <b>diagonal</b>, <b>crosshatch</b> — at 45° on ' +
    'paper; <b>solid</b> — overlapping passes edge to edge, which inks the face in.');
  addSlider(root, 'Right spacing (mm)', 'rightSpacing', 0.2, 10, 0.05);
  addSlider(root, 'Right pen', 'rightPen', 1, MAX_PENS, 1);
  addSlider(root, 'Solid passes (% of the nib)', 'solidGap', 50, 120, 1,
    'How far apart the passes over a <b>solid</b> face lie, as a share of the nib: at ' +
    '100 % two passes just touch, below that they overlap, which is what leaves no paper ' +
    'between them. The outermost pass runs half a nib in from the face\'s edge, so the ' +
    'ink meets the edge exactly, and the passes are joined into one back-and-forth stroke ' +
    'wherever nothing in front breaks them up. 80–90 % suits a fineliner; a pen that ' +
    'spreads on the paper can go higher, a dry one lower.');
  addSelect(root, 'Lines sit', 'hatchPhase', HATCH_PHASES, refit,
    '<b>per face</b> — centred on every face, never closer than half a spacing to its ' +
    'edges.<br><b>lattice</b> — at whole spacings across the sheet, so they line up from ' +
    'one box to the next.');
  addCheckbox(root, 'Join the hatch lines into zigzags', 'hatchJoin');
  createDiv('Neighbouring lines that both show from end to end are joined along the edge ' +
    'of the face, so the pen goes down once for a whole run of them — about half the pen ' +
    'lifts of the hatching. The joins go over the edges a second time; with the edges ' +
    'off, they draw pieces of them.').parent(root).class('note');
  addSelect(root, 'Edges', 'edges', EDGE_MODES, refit,
    '<b>every edge</b> — each box drawn whole; <b>outline</b> — only where a box meets ' +
    'what is behind it; <b>none</b> — hatching alone. A solid face keeps its own edges ' +
    'either way: they are the pass that reaches the ink into its corners.');
  addSlider(root, 'Edge pen', 'edgePen', 1, MAX_PENS, 1);
  addSlider(root, 'Shortest stroke (mm)', 'minStroke', 0, 3, 0.05,
    'A piece of line cut shorter than this by the boxes in front is left out — the ' +
    'slivers seen through the gaps are pen lifts for next to no ink. An edge nothing ' +
    'cut is always kept, so the smallest boxes keep their outlines.');

  // --- Output ---
  addSection(root, 'Output');
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
    '<div><kbd>drag</kbd> turn the camera · <kbd>shift</kbd>+<kbd>drag</kbd> pan</div>' +
    '<div><kbd>wheel</kbd> zoom · <kbd>+</kbd> <kbd>−</kbd> too · <kbd>0</kbd> reset</div>' +
    '<div><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> turn by 1°, with ' +
    '<kbd>shift</kbd> by 10°</div>' +
    '<div><kbd>R</kbd> new seed · <kbd>[</kbd> <kbd>]</kbd> step it · <kbd>P</kbd> ' +
    'projection · <kbd>G</kbd> guides</div>');
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
  const s = settings;

  if (!area || area.w <= 0 || area.h <= 0) {
    statsDiv.html(`<div class="warn">The margin leaves nothing to draw on. ` +
      `Lower it, or use larger paper.</div>`);
    refreshPenList();
    return;
  }
  if (!struct || !struct.n) {
    statsDiv.html(`<div class="warn">No box is left standing. Move the front further ` +
      `through the solid, or leave fewer holes.</div>`);
    refreshPenList();
    return;
  }
  if (!plan || !shapes) {
    statsDiv.html(
      `<div class="warn">${groupNum(strokes)} strokes — past the ${groupNum(MAX_STROKES)} ` +
      `limit, so nothing was ordered or drawn.<br>Widen the hatching, use fewer cells or ` +
      `larger boxes.</div>`);
    refreshPenList();
    return;
  }

  const seconds = strokes * PEN_CYCLE_S + plan.ink / DRAW_SPEED + plan.travel / TRAVEL_SPEED;
  const cover = clamp(plan.ink * s.penWidth / Math.max(1, area.w * area.h), 0, 1);

  let html =
    `<div class="big"><b>${groupNum(strokes)}</b> strokes, ` +
    `<b>${(plan.ink / 1000).toFixed(1)}</b> m of line</div>` +
    `<div>${groupNum(NB)} boxes drawn, ${groupNum(struct.nLoose)} of them in the front, ` +
    `cut from ${groupNum(struct.cut)}</div>` +
    `<div>${groupNum(counts.faces)} faces showing, ${groupNum(counts.hidden)} hidden ` +
    `whole · ${groupNum(counts.hatch)} hatch lines</div>` +
    `<div>Pen up for ${(plan.travel / 1000).toFixed(1)} m between strokes</div>` +
    `<div>Ink covers <b>${(100 * cover).toFixed(0)} %</b> of the drawable area</div>` +
    `<div>Roughly <b>${formatDuration(seconds)}</b> to plot · ${lastMs.toFixed(0)} ms to ` +
    `build</div>`;

  if (struct.truncated) {
    html += `<div class="warn">The cutting stopped at ${groupNum(MAX_BOXES)} boxes and ` +
      `part of the solid is missing. Use fewer cells or allow larger boxes.</div>`;
  }
  const tight = [];
  const roles = [['top', s.topHatch, s.topSpacing], ['left', s.leftHatch, s.leftSpacing],
                 ['right', s.rightHatch, s.rightSpacing]];
  for (const [name, pat, sp] of roles) {
    if (pat !== 'none' && pat !== 'solid' && sp < 2 * s.penWidth) tight.push(name);
  }
  if (tight.length) {
    html += `<div class="warn">The hatching on the ${tight.join(' and ')} faces is closer ` +
      `than twice the nib — ${(2 * s.penWidth).toFixed(2)} mm — and will run together into ` +
      `solid ink.</div>`;
  }
  if ([s.topHatch, s.leftHatch, s.rightHatch].includes('solid') && s.solidGap > 100) {
    html += `<div class="warn">Solid passes ${s.solidGap} % of the nib apart leave a hair of ` +
      `paper between every two of them — below 100 % they overlap.</div>`;
  }
  if (s.gap > 0 && s.gap < s.penWidth) {
    html += `<div class="warn">The gap between boxes is narrower than the nib, so ` +
      `neighbouring outlines will run into one another.</div>`;
  }
  if (strokes > BUSY_STROKES) {
    html += `<div class="warn">${groupNum(strokes)} strokes is a long sitting at the ` +
      `plotter. Wider hatching or larger boxes bring it down.</div>`;
  }
  if (lastMs > LIVE_BUDGET_MS) {
    html += `<div class="dim">Too much to follow a drag live — the boxes alone follow the ` +
      `camera and the lines wait for the mouse to come up.</div>`;
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
  const shapeTag = {
    'tower on plinth': `plinth=${s.plinthH}% tower=${s.towerW}x${s.towerD}%@${s.towerX},${s.towerZ}`,
    'steps': `tiers=${s.tiers}`,
    'city': `lots=${s.lots} street=${s.street}`,
    'courtyard': `walls=${s.wall}%`,
    'arch': `piers=${s.wall}%`,
    'ring': `ring=${s.wall}%`,
    'blob': `lumps=${s.blobSize} fill=${s.blobFill}%`,
  }[s.shape] || '';
  const cam = s.projection === 'axonometric' ? `az=${s.azimuth}° el=${s.elevation}°`
    : s.projection === 'military' ? `az=${s.azimuth}° height=${s.heightScale}`
    : `depth=${s.obliqueDepth}@${s.obliqueAngle}°`;
  const front = s.dissolve === 'none' ? 'front=none'
    : `front=${s.dissolve}` +
      (s.dissolve === 'outward' ? '' : ` dir=${s.towardAz}°/${s.towardEl}°`) +
      ` at=${s.frontAt}% depth=${s.frontDepth}% ragged=${s.ragged}/${s.noiseSize} ` +
      `crumble=${s.crumble} drift=${s.drift}% scatter=${s.scatter}% shrink=${s.shrink} ` +
      `thin=${s.thinning}`;
  return `dissolving blocks — ${s.shape} ${s.massW}x${s.massD}x${s.massH} ` +
    `${shapeTag ? shapeTag + ' ' : ''}seed=${s.seed} ` +
    `boxes=${s.minBox}..${s.maxBox}/${s.maxTall} variety=${s.variety} holes=${s.porosity}% ` +
    `uneven=${s.unevenTops}% gap=${s.gap}mm ${front} ` +
    `${s.projection} ${cam} zoom=${s.zoom}% ` +
    `top=${s.topHatch}/${s.topSpacing} left=${s.leftHatch}/${s.leftSpacing} ` +
    `right=${s.rightHatch}/${s.rightSpacing} ${s.hatchPhase}${s.hatchJoin ? ' zigzag' : ''} ` +
    `${[s.topHatch, s.leftHatch, s.rightHatch].includes('solid') ? 'solid=' + s.solidGap + '% ' : ''}` +
    `${s.dissolve !== 'none' && !s.looseHatch ? 'loose-unhatched>' + s.looseAt + '% ' : ''}` +
    `edges=${s.edges} ` +
    `min=${s.minStroke}mm pens=${s.pens} ` +
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
    out.push({ tag: pens > 1 ? 'pen' + (i + 1) : 'blocks', colour: inkColor(i),
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
    alert('Nothing to export — no box is left on this sheet.');
    return;
  }

  const list = passList();
  const out = settings.svgOutput;
  const parts = out === 'one file' ? [null]
    : out === 'one file per pen' ? list
    : [null, ...list];

  const s = settings;
  const cam = s.projection === 'axonometric' ? `az${s.azimuth} el${s.elevation}`
    : s.projection === 'military' ? `military az${s.azimuth}` : `oblique ${s.obliqueAngle}`;
  const stem = `blocks ${s.shape} seed${s.seed} ${cam} ${s.paper}-${s.orientation}`;
  const stamp = timestamp();

  for (const pass of parts) {
    const svg = svgFile(pass);
    if (!svg) continue;
    const tag = pass ? ` ${pass.tag}` : '';
    saveStrings([svg], `${stem}${tag} pen${s.penWidth} ${stamp}`, 'svg');
  }
}
