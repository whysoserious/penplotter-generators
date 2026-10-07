////////////////////////////////////////////////////////////////////////////////////////
// Field patterns — a pattern of small marks swelling and shrinking with a height map,
// on a flat sheet or wrapped round a ball or a box, drawn as lines
//
// Lay a grid of circles over the sheet and let a smooth field say how large each one is,
// and how far it slips off its place in the grid. Where the field is high the circles
// grow into their neighbours and the overlaps crowd into dark knots; where it is low
// they shrink to rings with paper between them; and the slips turn the grid into a
// moiré that swims across the sheet. That is the whole picture this started from. Here
// the circle is one mark out of many — rings, squares, polygons, stars, spirals, dashes,
// crosses, truchet arcs, dots — and the grid one of several, and next to the marks there
// are patterns of whole lines bent by the same field: ruled lines pushed aside or set
// waving, squiggles, ridgelines hiding one another, contour lines, streamlines, a spiral,
// concentric rings, tone hatching and a grid pulled out of true.
//
// The height map is any of many fields, not only noise: ridged and warped noise and
// marble; Worley's distance to scattered points, its cracks and its mosaic; ripples from
// a few sources; plasma; metaballs; a gyroid and an egg crate; rings, a spiral and a
// plain gradient; a Julia set; a Gray–Scott reaction–diffusion run to its pattern; and
// any picture loaded from disk. Two of them can be blended, and the result is levelled
// to [0, 1] by its own percentiles, so every field lands in the same range whatever its
// own amplitude, and then given contrast, a bias, terraces.
//
// A pattern lives on charts — rectangles of its own plane, measured in cells. A flat sheet
// is one chart. A cube is six, one a face. A ball is six blown up round (a cube map), or
// one wrapped round it in latitude and longitude, or no chart at all: points scattered
// evenly by a Fibonacci spiral, each mark laid in the plane that touches the ball there.
// The field is read at the point of the surface itself, in three dimensions, so it runs
// on from one face onto the next without a seam.
//
// The surface is seen from outside, or from inside — through the open front of it, or
// with the camera standing inside, through an ordinary lens or a fisheye. Both are convex,
// so no hidden-line pass is needed: from outside a point shows exactly when the surface
// faces the camera there, from the cut-open front exactly when it faces away, and from
// inside always. Every line is walked from the chart onto the paper by halving, until
// the middle of each piece lies on its chord, and where it crosses from shown to hidden
// the crossing is pinned down by bisection.
//
// Two pens: black alone, or black and red, split by height, by a second field, at
// random, chequered, by rows, by the parts of a mark, by the faces of the box — or as two
// layers of the pattern laid over each other, the red one shifted, turned and inverted,
// which is the moiré of the picture in two colours.
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};
const PAPERS = Object.keys(PAPER_SIZES).concat('custom');

const FIELDS = ['perlin', 'ridged', 'warped', 'marble', 'worley', 'cracks', 'mosaic',
                'waves', 'plasma', 'metaballs', 'gyroid', 'egg crate', 'rings', 'spiral',
                'gradient', 'julia', 'reaction-diffusion', 'image'];
const BLENDS   = ['none', 'add', 'multiply', 'screen', 'max', 'min', 'difference', 'mask'];
const RD_KINDS = ['spots', 'maze', 'coral', 'worms', 'holes', 'mitosis'];
const RD_PARAMS = {                // Gray–Scott feed and kill
  spots:   [0.030, 0.062], maze: [0.029, 0.057], coral: [0.0545, 0.062],
  worms:   [0.078, 0.061], holes: [0.039, 0.058], mitosis: [0.0367, 0.0649],
};

// The marks laid one to a cell, and the patterns made of whole lines.
const CELL_PATTERNS = ['circles', 'rings', 'squares', 'polygons', 'nested squares',
                       'crosses', 'dashes', 'hatched cells', 'spirals', 'stars', 'flowers',
                       'ellipses', 'truchet', '10 print', 'dots'];
const LINE_PATTERNS = ['lines', 'waves', 'squiggle', 'ridgelines', 'contours', 'flow',
                       'spiral', 'concentric', 'tone hatching', 'warped grid'];
const PATTERNS = CELL_PATTERNS.concat(LINE_PATTERNS);
const SQUARE_ONLY = ['truchet', '10 print'];   // marks that join their neighbours

const GRIDS      = ['square', 'hex', 'radial', 'jittered', 'poisson'];
const OFFSETS    = ['height', 'slope'];
const ROTATIONS  = ['none', 'slope', 'height'];
const SURFACES   = ['flat', 'sphere', 'cube'];
const SIDES      = ['outside', 'inside, cut open', 'inside, camera in'];
const SPHERE_MAPS = ['cube map', 'lat-long', 'fibonacci'];
const PROJECTIONS = ['orthographic', 'perspective'];
const LENSES     = ['rectilinear', 'fisheye'];
const COLOURS    = ['one', 'two'];
const SPLITS     = ['height', 'second field', 'random', 'checker', 'rows', 'parts', 'faces',
                    'overlay'];
const OV_SOURCES = ['same', 'inverted', 'second field'];

const MAX_STROKES   = 400_000;   // past this nothing is ordered, drawn or exported
const MAX_ITEMS     = 600_000;   // polylines the pattern may lay before it gives up
const BUSY_STROKES  = 60_000;    // above this, warn about the plot time
const EPS           = 0.01;      // mm — the stub that stands in for a single dot
const SAG           = 0.03;      // mm — how far a walked line may stray from its chord
const SEG_MAX       = 3;         // mm — the longest chord trusted without a look between
const MAX_DEPTH     = 12;        // halvings of one piece of a walked line
const PREVIEW_MAX_PX = 1500;
const DRAG_DEG_PX   = 0.35;
const WHEEL_ZOOM    = 0.0015;
const PEN_CYCLE_S   = 0.3;
const DRAW_SPEED    = 60;
const TRAVEL_SPEED  = 150;

const settings = {
  // paper + pen
  paper: 'A4',
  orientation: 'portrait',
  customW: 300,         // mm, when the size is custom
  customH: 400,
  margin: 15,
  penWidth: 0.3,

  // pens
  colours: 'one',
  split: 'height',
  splitAt: 50,          // % — where black gives way to red, for the splits that need it
  ovShiftU: 0.5,        // cells — the red layer of an overlay, against the black one
  ovShiftV: 0.5,
  ovTurn: 0,            // °
  ovSource: 'inverted',
  outlinePen: 1,
  ink0: '#1b1b1b',
  ink1: '#d0261e',
  paperColor: '#fbfaf5',

  // the height map
  seed: 1,
  field: 'perlin',
  scale: 1.2,           // features across the half-width of the sheet, about
  octaves: 3,
  rough: 50,            // % — each octave's weight against the last
  warp: 0,              // how far the point is pushed by noise before the field is read
  warpScale: 1,
  fieldX: 0,            // the field slid under the pattern, in its own units
  fieldY: 0,
  count: 5,             // sources, blobs, arms
  angle: 30,            // ° — the gradient's way, the marble's grain
  julia: 135,           // ° — where c sits on its circle
  rdKind: 'maze',
  field2: 'worley',
  scale2: 2,
  blend: 'none',
  blendAmt: 50,         // %
  contrast: 0,
  bias: 0,
  terraces: 0,
  invert: false,

  // the pattern
  pattern: 'circles',
  grid: 'square',
  cell: 3,              // mm on a flat sheet
  cells3d: 18,          // cells across one face of the cube, or a quarter round the ball
  sizeMin: 25,          // % of a cell, at the lowest of the field
  sizeMax: 125,         // % of a cell, at the highest
  skipBelow: 0,         // % — no mark where the field is lower
  offset: 0,            // % of a cell the mark slips off its place
  offsetBy: 'height',
  offsetAngle: -45,     // ° — which way it slips, by height
  rotation: 0,          // °
  rotateBy: 'none',
  rotSpan: 180,         // ° — how far the height turns a mark
  detail: 6,            // rings, turns, lines, spikes, levels — at the most
  sides: 6,
  jitter: 35,           // % of a cell, for the jittered grid
  amplitude: 100,       // % of a cell — how far a line is pushed
  wavelength: 2,        // cells — of the waves on a line
  lineAngle: 0,         // °

  // the surface and the camera
  surface: 'flat',
  side: 'outside',
  sphereMap: 'cube map',
  projection: 'perspective',
  distance: 4,          // radii
  lens: 'rectilinear',
  fov: 110,             // °
  camX: 0,              // % of the way to the wall, the camera standing inside
  camY: 0,
  camZ: 0,
  azimuth: 30,
  elevation: 22,
  roll: 0,
  zoom: 100,
  panX: 0,
  panY: 0,
  thinBelow: 0.5,       // mm — marks smaller than this on paper are left out
  outline: true,

  // output
  optimiseOrder: true,
  liveUpdate: true,
  pngDpi: 200,
};

const DEFAULTS = { ...settings };

// A handful of sheets worth starting from. Each one is the whole state.
const SCENES = [
  { label: '— select scene —' },
  { label: 'Like the picture: circles slipping', s: {
      cell: 2.2, sizeMin: 70, sizeMax: 140, offset: 40, scale: 0.8, octaves: 2,
      penWidth: 0.25 } },
  { label: 'Moiré in black and red', s: {
      colours: 'two', split: 'overlay', cell: 3, sizeMin: 30, sizeMax: 115, offset: 20,
      ovShiftU: 0.5, ovShiftV: 0.5, ovTurn: 4, ovSource: 'inverted', scale: 1 } },
  { label: 'Halftone of a reaction', s: {
      field: 'reaction-diffusion', rdKind: 'maze', scale: 0.8, grid: 'hex', cell: 2,
      sizeMin: 0, sizeMax: 105, skipBelow: 6 } },
  { label: 'Rings from ripples', s: {
      field: 'waves', count: 4, scale: 2.4, pattern: 'rings', cell: 4, sizeMin: 30,
      sizeMax: 110, detail: 4 } },
  { label: 'Worley stars', s: {
      field: 'worley', scale: 2.5, pattern: 'stars', grid: 'hex', cell: 4, detail: 7,
      rotateBy: 'slope', sizeMin: 30, sizeMax: 120, invert: true } },
  { label: 'Ridgelines', s: {
      field: 'ridged', scale: 1.4, octaves: 4, pattern: 'ridgelines', cell: 2.2,
      amplitude: 900 } },
  { label: 'Contour map in two inks', s: {
      field: 'warped', scale: 0.9, warp: 0.6, pattern: 'contours', detail: 24,
      colours: 'two', split: 'parts' } },
  { label: 'Streamlines', s: {
      field: 'perlin', scale: 1.1, pattern: 'flow', cell: 1.6, rotation: 90 } },
  { label: 'Squiggle over metaballs', s: {
      field: 'metaballs', count: 7, scale: 1.3, pattern: 'squiggle', cell: 2.2,
      amplitude: 95, wavelength: 1.4 } },
  { label: 'Truchet, chequered', s: {
      field: 'mosaic', scale: 2, pattern: 'truchet', cell: 6, detail: 3,
      colours: 'two', split: 'checker' } },
  { label: 'Julia, red where it is deep', s: {
      field: 'julia', scale: 0.9, julia: 160, cell: 2.2, sizeMin: 10, sizeMax: 115,
      colours: 'two', split: 'height', splitAt: 62 } },
  { label: 'Warped grid', s: {
      field: 'plasma', count: 5, scale: 1.4, pattern: 'warped grid', cell: 3,
      amplitude: 220 } },
  { label: 'Spiral', s: {
      field: 'rings', scale: 1.6, pattern: 'spiral', cell: 1.6, amplitude: 70,
      wavelength: 0.8 } },
  { label: 'Ball of circles', s: {
      surface: 'sphere', sphereMap: 'fibonacci', field: 'gyroid', scale: 1.2,
      cells3d: 20, sizeMin: 40, sizeMax: 120 } },
  { label: 'Ball wrapped in contours', s: {
      surface: 'sphere', field: 'warped', scale: 1.1, warp: 0.5, pattern: 'contours',
      detail: 20, cells3d: 24, colours: 'two', split: 'parts' } },
  { label: 'Planetarium: inside the ball', s: {
      surface: 'sphere', side: 'inside, camera in', lens: 'fisheye', fov: 180,
      sphereMap: 'fibonacci', pattern: 'stars', detail: 5, cells3d: 22, field: 'worley',
      scale: 1.6, elevation: 70, sizeMin: 15, sizeMax: 90 } },
  { label: 'Box of hatching', s: {
      surface: 'cube', pattern: 'tone hatching', detail: 3, cells3d: 40, field: 'perlin',
      scale: 1.5, colours: 'two', split: 'faces' } },
  { label: 'Room of squares', s: {
      surface: 'cube', side: 'inside, camera in', pattern: 'squares', cells3d: 14,
      rotateBy: 'height', rotSpan: 90, fov: 100, elevation: 8, camZ: 35, field: 'ridged',
      scale: 1.2, thinBelow: 0.6 } },
  { label: 'Box cut open, lined with waves', s: {
      surface: 'cube', side: 'inside, cut open', pattern: 'waves', cells3d: 34,
      field: 'egg crate', scale: 1.5, amplitude: 90, wavelength: 1.2, elevation: 28,
      azimuth: 210 } },
];

const setters   = {};
const fieldDivs = {};
let statsDiv, linkDiv, penListDiv, imageNote;

let area    = null;          // { x0, y0, x1, y1, w, h } — the drawable box, in mm
let shapes  = null;          // { pts, off, ink, lay } — polylines in mm
let strokes = 0;
let plan    = null;          // { order, flip, ink, travel }
let perPen  = null;
let counts  = null;          // { marks, thinned, items }
let lastMs  = 0;
let drag    = null;

////////////////////////////////////////////////////////////////////////////////////////
// Small change

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function lerp1(a, b, t) { return a + (b - a) * t; }

function parseNum(str) {
  const v = Number(String(str).replace(',', '.').trim());
  return Number.isFinite(v) ? v : null;
}

function groupNum(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function wrapDeg(a) { return ((a + 180) % 360 + 360) % 360 - 180; }

function rad(deg) { return deg * Math.PI / 180; }

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

// A number in [0, 1) for a pair of integers and a salt, so that nothing that asks for one
// depends on the order it was asked in.
function hash01(i, j, salt) {
  let h = Math.imul(i | 0, 0x9e3779b1) ^ Math.imul(j | 0, 0x85ebca77) ^
          Math.imul(salt | 0, 0xc2b2ae3d) ^ Math.imul(settings.seed | 0, 0x27d4eb2f);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12; h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

// The same for three integers — a cell of space, for Worley.
function hash3(i, j, k, salt) {
  let h = Math.imul(i | 0, 0x8da6b343) ^ Math.imul(j | 0, 0xd8163841) ^
          Math.imul(k | 0, 0xcb1ab31f) ^ Math.imul(salt | 0, 0x165667b1);
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15; h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function twoPens() { return settings.colours === 'two'; }

////////////////////////////////////////////////////////////////////////////////////////
// The URL is the document
//
// Every setting that differs from its default is written into the hash, debounced, with
// replaceState so the back button stays usable. A picture loaded as the height map is
// the one thing that cannot ride in it.

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
  if (h === urlWritten) return;
  Object.assign(settings, DEFAULTS);
  applyState(h);
  urlWritten = h;
  refreshControls();
  resizeForPaper();
}

////////////////////////////////////////////////////////////////////////////////////////
// The sheet

function paperDims() {
  if (settings.paper === 'custom') {
    return [clamp(settings.customW, 20, 5000), clamp(settings.customH, 20, 5000)];
  }
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
  return document.querySelector('#sheet canvas.p5Canvas');
}

////////////////////////////////////////////////////////////////////////////////////////

function setup() {
  applyState(location.hash.replace(/^#/, ''));
  urlWritten = encodeState();
  window.addEventListener('hashchange', onHashChange);
  new ResizeObserver(applyCanvasDisplay).observe(document.getElementById('canvas-container'));
  area = drawArea();

  const [w, h] = paperDims();
  const s = previewScale();
  pixelDensity(1);
  createCanvas(Math.round(w * s), Math.round(h * s)).parent('sheet');
  applyCanvasDisplay();
  buildControls();
  attachPointer();
  attachKeys();
  update();
  noLoop();
}

function applyCanvasDisplay() {
  const [pw, ph] = paperDims();
  const box = document.getElementById('canvas-container');
  const aw = box ? box.clientWidth - 48 : 900;
  const ah = box ? box.clientHeight - 48 : 700;
  const scale = Math.max(0.2, Math.min(aw / pw, ah / ph));
  const c = canvasEl();
  if (!c) return;
  c.style.width  = pw * scale + 'px';
  c.style.height = ph * scale + 'px';
}

function resizeForPaper() {
  const [w, h] = paperDims();
  const s = previewScale();
  resizeCanvas(Math.round(w * s), Math.round(h * s));
  applyCanvasDisplay();
  update();
}

// Everything, from the field to the order the pen visits the strokes in. The field and
// the pattern laid on its charts are kept from one update to the next and built again
// only when something they depend on has moved, so turning the camera costs the walk
// onto the paper and nothing else.
let FAST = false;            // while the camera is being dragged: no ordering, coarser walk

function update() {
  const t0 = performance.now();
  area = drawArea();
  strokes = 0;
  shapes = plan = perPen = counts = null;

  if (area.w > 0 && area.h > 0) {
    makeView();
    ensureField();
    ensureItems();
    shapes = buildShapes();
    strokes = shapes.off.length - 1;
    if (strokes > MAX_STROKES) shapes = null;
    else plan = orderShapes(shapes);
  }

  lastMs = performance.now() - t0;
  drawPreview();
  syncVisibility();
  updateStats();
  syncUrl();
}

let liveQueued = false;

// Called while a slider or the camera is being dragged, once a frame at the most.
function liveUpdate() {
  if (liveQueued) return;
  liveQueued = true;
  requestAnimationFrame(() => {
    liveQueued = false;
    FAST = true;
    update();
    FAST = false;
  });
}

////////////////////////////////////////////////////////////////////////////////////////
// Noise
//
// Improved Perlin in three dimensions, seeded, and octaves of it summed. It is one field
// among many here, and it also does the warping that any of them can be put through.

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

function fbm3(nz, x, y, z, octaves, gain) {
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * nz(x * f + o * 17.31, y * f - o * 9.73, z * f + o * 5.19);
    norm += amp;
    amp *= gain;
    f *= 2;
  }
  return sum / norm;
}

////////////////////////////////////////////////////////////////////////////////////////
// Height maps
//
// Every field is read at a point of space: on a flat sheet the point (x, y, 0), the sheet
// running from −1 to 1 across its longer side; on the ball a point of the unit sphere,
// on the box a point of the cube from −1 to 1. Read in three dimensions, a field runs on
// over the edges of the box and round the ball without a seam. The fields that are
// pictures — the reaction–diffusion, a Julia set, a loaded image — have no third
// dimension, and on a surface they are read on each face of the cube that the point
// falls on, by the two coordinates across it.
//
// What a field returns is any number at all. It is levelled afterwards: the field is read
// at a couple of thousand points spread over the surface, and the 2nd and the 98th
// percentile of what comes back are taken to 0 and 1. So a field never has to know its
// own range, every one of them lands the same way, and blending two of them is fair.

let NZ = [], nzSeedNow = null;
let DOM = { cx: 0, cy: 0, R: 1, ws: 1, hs: 1 };   // the flat sheet's frame for the field
let FLAT = true;

function ensureNoise() {
  const seed = settings.seed | 0;
  if (seed === nzSeedNow) return;
  nzSeedNow = seed;
  NZ = [];
  for (let i = 0; i < 8; i++) NZ.push(makePerlin3(seed * 7919 + i * 1013 + 17));
}

// A point spread at random over the surface — where a source, a blob or a drop sits.
function randomPoint(rnd) {
  if (FLAT) return [(rnd() * 2 - 1) * DOM.ws, (rnd() * 2 - 1) * DOM.hs, 0];
  const z = rnd() * 2 - 1, a = rnd() * 2 * Math.PI, r = Math.sqrt(1 - z * z);
  const p = [r * Math.cos(a), r * Math.sin(a), z];
  if (settings.surface === 'cube') {
    const m = Math.max(Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2]));
    p[0] /= m; p[1] /= m; p[2] /= m;
  }
  return p;
}

// Two coordinates for the fields that are pictures: across the sheet, or across the face
// of the cube the point falls on, from −½ to ½.
let RU = 0, RV = 0;

function faceUV(x, y, z) {
  if (FLAT) { RU = x * 0.5; RV = y * 0.5; return; }
  const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
  if (ax >= ay && ax >= az) { RU = (x > 0 ? -z : z) / ax * 0.5; RV = -y / ax * 0.5; }
  else if (ay >= az)        { RU = x / ay * 0.5; RV = (y > 0 ? z : -z) / ay * 0.5; }
  else                      { RU = (z > 0 ? x : -x) / az * 0.5; RV = -y / az * 0.5; }
}

// Bilinear and wrapping round, so a picture tiles.
function sampleWrap(G, N, M, u, v) {
  u = u * N - 0.5; v = v * M - 0.5;
  const i0 = Math.floor(u), j0 = Math.floor(v);
  const fu = u - i0, fv = v - j0;
  const i = ((i0 % N) + N) % N, j = ((j0 % M) + M) % M;
  const i1 = (i + 1) % N, j1 = (j + 1) % M;
  const a = G[j * N + i], b = G[j * N + i1], c = G[j1 * N + i], d = G[j1 * N + i1];
  return (a + (b - a) * fu) * (1 - fv) + (c + (d - c) * fu) * fv;
}

// Bilinear and held at the edge, for a picture that should not repeat.
function sampleClamp(G, N, M, u, v) {
  u = clamp(u * N - 0.5, 0, N - 1.001); v = clamp(v * M - 0.5, 0, M - 1.001);
  const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
  const a = G[j * N + i], b = G[j * N + i + 1], c = G[(j + 1) * N + i], d = G[(j + 1) * N + i + 1];
  return (a + (b - a) * fu) * (1 - fv) + (c + (d - c) * fu) * fv;
}

// --- Worley: the distance to the nearest of points scattered one to a cube of space ---

let W1 = 0, W2 = 0, WID = 0;

function worley(x, y, z, salt) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let b1 = 1e9, b2 = 1e9, id = 0;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const i = xi + dx, j = yi + dy, k = zi + dz;
        const px = i + hash3(i, j, k, salt), py = j + hash3(i, j, k, salt + 1);
        const pz = k + hash3(i, j, k, salt + 2);
        const ex = px - x, ey = py - y, ez = pz - z;
        const d = ex * ex + ey * ey + ez * ez;
        if (d < b1) { b2 = b1; b1 = d; id = hash3(i, j, k, salt + 3); }
        else if (d < b2) b2 = d;
      }
    }
  }
  W1 = Math.sqrt(b1); W2 = Math.sqrt(b2); WID = id;
}

// --- Gray–Scott: two chemicals feeding on and killing each other, run to a pattern ---
//
// On a small grid that wraps round, so the pattern tiles: two chemicals, u fed in and v
// eating it, both spreading, u twice as fast. Spots, mazes, coral and worms are only
// different rates of feeding and of dying off. The grid is kept until the seed or the
// kind changes.

const RD_N = 128;
let RD = null, rdKeyNow = '';

function ensureRD() {
  const key = `${settings.seed}|${settings.rdKind}`;
  if (key === rdKeyNow && RD) return RD;
  rdKeyNow = key;
  const N = RD_N, NN = N * N;
  const [F, K] = RD_PARAMS[settings.rdKind] || RD_PARAMS.maze;
  let U = new Float32Array(NN).fill(1), V = new Float32Array(NN);
  let U2 = new Float32Array(NN), V2 = new Float32Array(NN);
  const rnd = mulberry32((settings.seed | 0) * 131 + 7);
  for (let s = 0; s < 18; s++) {
    const cx = Math.floor(rnd() * N), cy = Math.floor(rnd() * N), r = 2 + Math.floor(rnd() * 5);
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        const k = ((cy + j + N) % N) * N + ((cx + i + N) % N);
        U[k] = 0.5; V[k] = 0.25 + 0.05 * rnd();
      }
    }
  }
  const Du = 0.2097, Dv = 0.105;
  for (let step = 0; step < 5000; step++) {
    for (let y = 0; y < N; y++) {
      const ym = ((y - 1 + N) % N) * N, y0 = y * N, yp = ((y + 1) % N) * N;
      for (let x = 0; x < N; x++) {
        const xm = (x - 1 + N) % N, xp = (x + 1) % N, k = y0 + x;
        const u = U[k], v = V[k];
        const lu = U[ym + x] + U[yp + x] + U[y0 + xm] + U[y0 + xp] - 4 * u;
        const lv = V[ym + x] + V[yp + x] + V[y0 + xm] + V[y0 + xp] - 4 * v;
        const uvv = u * v * v;
        U2[k] = u + Du * lu - uvv + F * (1 - u);
        V2[k] = v + Dv * lv + uvv - (F + K) * v;
      }
    }
    let t = U; U = U2; U2 = t;
    t = V; V = V2; V2 = t;
  }
  RD = V;
  return RD;
}

// --- a picture loaded from disk, as its darkness ---

let IMG = null;              // { g: Float32Array, w, h, name, ver }
let imgVer = 0;

function loadImageFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const im = new Image();
    im.onload = () => {
      const most = 400;
      const k = Math.min(1, most / Math.max(im.width, im.height));
      const w = Math.max(2, Math.round(im.width * k)), h = Math.max(2, Math.round(im.height * k));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(im, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h).data;
      const g = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) {
        const a = d[4 * i + 3] / 255;
        const l = (0.2126 * d[4 * i] + 0.7152 * d[4 * i + 1] + 0.0722 * d[4 * i + 2]) / 255;
        g[i] = 1 - (l * a + (1 - a));          // darkness, transparent counts as paper
      }
      IMG = { g, w, h, name: file.name, ver: ++imgVer };
      if (imageNote) imageNote.html(`<b>${file.name}</b>, ${w} × ${h} — not part of the link.`);
      update();
    };
    im.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// One field, with its own scale and its own share of the seed. `slot` keeps the first
// and the second field from drawing the same noise and the same sources.
function makeField(kind, scale, slot) {
  const s = settings;
  const nA = NZ[slot * 2], nB = NZ[slot * 2 + 1];
  const oct = Math.round(clamp(s.octaves, 1, 8)), gain = clamp(s.rough / 100, 0.05, 0.95);
  const rnd = mulberry32((s.seed | 0) * 31 + slot * 977 + 5);
  const n = Math.round(clamp(s.count, 1, 40));
  const sc = scale;
  const zOff = FLAT ? 0.37 + rnd() * 3 : 0;   // a flat sheet is a slice of a solid field
  const a = rad(s.angle);

  switch (kind) {
    case 'perlin':
      return (x, y, z) => fbm3(nA, x * sc, y * sc, z * sc + zOff, oct, gain);

    case 'ridged':
      return (x, y, z) => {
        let sum = 0, amp = 1, f = sc, w = 1, norm = 0;
        for (let o = 0; o < oct; o++) {
          let v = 1 - Math.abs(nA(x * f + o * 7.1, y * f - o * 3.3, (z + zOff) * f + o * 1.7)) * 1.6;
          v = v * v * w;
          w = clamp(v * 1.4, 0, 1);
          sum += v * amp; norm += amp;
          amp *= gain; f *= 2;
        }
        return sum / norm;
      };

    case 'warped': {
      // Inigo Quilez's warp: the noise read where the noise itself has pushed the point
      const o2 = Math.min(oct, 4);
      return (x, y, z) => {
        const X = x * sc, Y = y * sc, Z = z * sc + zOff;
        const qx = fbm3(nA, X, Y, Z, o2, gain);
        const qy = fbm3(nA, X + 5.2, Y + 1.3, Z + 2.8, o2, gain);
        const qz = fbm3(nA, X + 1.7, Y + 9.2, Z + 4.1, o2, gain);
        return fbm3(nB, X + 2.2 * qx, Y + 2.2 * qy, Z + 2.2 * qz, oct, gain);
      };
    }

    case 'marble': {
      const dx = Math.cos(a), dy = Math.sin(a), dz = 0.35;
      return (x, y, z) => Math.sin(2 * Math.PI * sc * (x * dx + y * dy + z * dz) +
        5 * fbm3(nA, x * sc, y * sc, z * sc + zOff, oct, gain));
    }

    case 'worley':
      return (x, y, z) => { worley(x * sc * 2, y * sc * 2, (z + zOff) * sc * 2, slot * 11 + 3); return W1; };
    case 'cracks':
      return (x, y, z) => { worley(x * sc * 2, y * sc * 2, (z + zOff) * sc * 2, slot * 11 + 3); return W2 - W1; };
    case 'mosaic':
      return (x, y, z) => { worley(x * sc * 2, y * sc * 2, (z + zOff) * sc * 2, slot * 11 + 3); return WID; };

    case 'waves': {
      // rings running out from a few sources and adding up where they cross
      const src = [];
      for (let i = 0; i < n; i++) src.push([...randomPoint(rnd), rnd() * 2 * Math.PI]);
      const k = 2 * Math.PI * sc * 2.5;
      return (x, y, z) => {
        let sum = 0;
        for (const [px, py, pz, ph] of src) {
          sum += Math.cos(k * Math.hypot(x - px, y - py, z - pz) + ph);
        }
        return sum;
      };
    }

    case 'plasma': {
      const w = [];
      for (let i = 0; i < n; i++) {
        const t = rnd() * 2 * Math.PI, u = FLAT ? 0 : rnd() * 2 - 1, r = Math.sqrt(1 - u * u);
        const f = 2 * Math.PI * sc * (0.5 + rnd());
        w.push([r * Math.cos(t) * f, r * Math.sin(t) * f, u * f, rnd() * 2 * Math.PI]);
      }
      return (x, y, z) => {
        let sum = 0;
        for (const [kx, ky, kz, ph] of w) sum += Math.sin(kx * x + ky * y + kz * z + ph);
        return sum;
      };
    }

    case 'metaballs': {
      const b = [];
      for (let i = 0; i < n; i++) {
        const r = (0.25 + 0.35 * rnd()) / sc;
        b.push([...randomPoint(rnd), 1 / (r * r)]);
      }
      return (x, y, z) => {
        let sum = 0;
        for (const [px, py, pz, ir] of b) {
          const dx = x - px, dy = y - py, dz = z - pz;
          sum += Math.exp(-(dx * dx + dy * dy + dz * dz) * ir);
        }
        return sum;
      };
    }

    case 'gyroid': {
      const k = Math.PI * sc * 2;
      return (x, y, z) => {
        const X = x * k, Y = y * k, Z = (z + zOff) * k;
        return Math.sin(X) * Math.cos(Y) + Math.sin(Y) * Math.cos(Z) + Math.sin(Z) * Math.cos(X);
      };
    }

    case 'egg crate': {
      const k = Math.PI * sc * 2;
      return (x, y, z) => Math.cos(x * k) + Math.cos(y * k) + (FLAT ? 0 : Math.cos(z * k));
    }

    case 'rings':
      return (x, y, z) => Math.cos(2 * Math.PI * sc * 2 * (FLAT ? Math.hypot(x, y)
        : Math.hypot(x, y, z - 1)));

    case 'spiral': {
      const arms = n;
      return (x, y, z) => {
        const r = FLAT ? Math.hypot(x, y) : Math.hypot(x, y, z - 1);
        return Math.sin(arms * Math.atan2(y, x) + 2 * Math.PI * sc * 2 * r);
      };
    }

    case 'gradient': {
      const dx = Math.cos(a), dy = Math.sin(a);
      return (x, y, z) => x * dx + y * dy + (FLAT ? 0 : 0.5 * z);
    }

    case 'julia': {
      const cr = 0.7885 * Math.cos(rad(s.julia)), ci = 0.7885 * Math.sin(rad(s.julia));
      const k = 3.2 / sc;
      return (x, y, z) => {
        faceUV(x, y, z);
        let zr = RU * k, zi = RV * k, it = 0;
        const most = 80;
        for (; it < most; it++) {
          const r2 = zr * zr, i2 = zi * zi;
          if (r2 + i2 > 64) break;
          zi = 2 * zr * zi + ci;
          zr = r2 - i2 + cr;
        }
        if (it >= most) return 1;
        const l = Math.log(zr * zr + zi * zi) / 2;
        return (it + 1 - Math.log(l / Math.LN2) / Math.LN2) / most;
      };
    }

    case 'reaction-diffusion': {
      const G = ensureRD();
      return (x, y, z) => { faceUV(x, y, z); return sampleWrap(G, RD_N, RD_N, RU * sc + 0.5, RV * sc + 0.5); };
    }

    case 'image': {
      if (!IMG) return () => 0;
      const ia = IMG.w / IMG.h;
      const hi = (FLAT ? Math.max(DOM.hs, DOM.ws / ia) / 2 : Math.max(0.5, 0.5 / ia)) / sc;
      return (x, y, z) => {
        faceUV(x, y, z);
        return sampleClamp(IMG.g, IMG.w, IMG.h, 0.5 + RU / (2 * hi * ia), 0.5 + RV / (2 * hi));
      };
    }
  }
  return () => 0;
}

// --- both fields together, levelled, blended and shaped ---

let FLD = null, fldKeyNow = '';
let QX = 0, QY = 0, QZ = 0;

function needsSecond() {
  const s = settings;
  return s.blend !== 'none' || (twoPens() && (s.split === 'second field' ||
    (s.split === 'overlay' && s.ovSource === 'second field')));
}

function fieldKey() {
  const s = settings;
  const parts = [s.surface, s.seed, s.field, s.scale, s.octaves, s.rough, s.warp, s.warpScale,
    s.fieldX, s.fieldY, s.count, s.angle, s.julia, s.rdKind, s.contrast, s.bias, s.terraces,
    s.invert, needsSecond() ? `${s.field2}|${s.scale2}|${s.blend}|${s.blendAmt}` : '',
    IMG ? IMG.ver : 0];
  if (s.surface === 'flat') parts.push(area.w.toFixed(3), area.h.toFixed(3));
  return parts.join('|');
}

// The point the fields are read at, once it is slid and warped.
function domainPoint(x, y, z) {
  const s = settings;
  x += s.fieldX; y += s.fieldY;
  if (s.warp) {
    const k = s.warpScale, w = s.warp;
    const X = x * k, Y = y * k, Z = z * k;
    const dx = fbm3(NZ[4], X, Y, Z, 2, 0.5), dy = fbm3(NZ[5], X, Y, Z, 2, 0.5);
    const dz = FLAT ? 0 : fbm3(NZ[6], X, Y, Z, 2, 0.5);
    x += w * dx; y += w * dy; z += w * dz;
  }
  QX = x; QY = y; QZ = z;
}

// Points spread evenly over the surface, for levelling a field by.
function samplePoints() {
  const pts = [];
  if (FLAT) {
    const n = 48;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        pts.push([((i + 0.5) / n * 2 - 1) * DOM.ws, ((j + 0.5) / n * 2 - 1) * DOM.hs, 0]);
      }
    }
    return pts;
  }
  const n = 2400, ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const z = 1 - 2 * (i + 0.5) / n, r = Math.sqrt(1 - z * z), t = ga * i;
    const p = [r * Math.cos(t), r * Math.sin(t), z];
    if (settings.surface === 'cube') {
      const m = Math.max(Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2]));
      p[0] /= m; p[1] /= m; p[2] /= m;
    }
    pts.push(p);
  }
  return pts;
}

function levelled(f, pts) {
  const v = new Float64Array(pts.length);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    domainPoint(p[0], p[1], p[2]);
    v[i] = f(QX, QY, QZ);
  }
  v.sort();
  let lo = v[Math.floor(0.02 * (v.length - 1))], hi = v[Math.ceil(0.98 * (v.length - 1))];
  if (!(hi - lo > 1e-9)) { lo -= 0.5; hi += 0.5; }
  return { f, lo, k: 1 / (hi - lo) };
}

function ensureField() {
  const s = settings;
  FLAT = s.surface === 'flat';
  if (FLAT) {
    const R = Math.max(area.w, area.h) / 2;
    DOM = { cx: (area.x0 + area.x1) / 2, cy: (area.y0 + area.y1) / 2, R,
            ws: area.w / (2 * R), hs: area.h / (2 * R) };
  }
  const key = fieldKey();
  if (key === fldKeyNow && FLD) return;
  fldKeyNow = key;
  ensureNoise();
  const pts = samplePoints();
  FLD = {
    A: levelled(makeField(s.field, s.scale, 0), pts),
    B: needsSecond() ? levelled(makeField(s.field2, s.scale2, 1), pts) : null,
  };
}

function level(L) { const v = (L.f(QX, QY, QZ) - L.lo) * L.k; return v < 0 ? 0 : v > 1 ? 1 : v; }

// The height in [0, 1] at a point of space, everything applied.
function heightAt(x, y, z) {
  const s = settings;
  domainPoint(x, y, z);
  let h = level(FLD.A);
  if (FLD.B && s.blend !== 'none') {
    const b = level(FLD.B), t = s.blendAmt / 100;
    switch (s.blend) {
      case 'add':        h = h + t * (b - 0.5); break;
      case 'multiply':   h = h * lerp1(1, b, t); break;
      case 'screen':     h = 1 - (1 - h) * (1 - t * b); break;
      case 'max':        h = lerp1(h, Math.max(h, b), t); break;
      case 'min':        h = lerp1(h, Math.min(h, b), t); break;
      case 'difference': h = lerp1(h, Math.abs(h - b), t); break;
      case 'mask': {
        const e = clamp((b - (1 - t) + 0.04) / 0.08, 0, 1);
        h = h * e * e * (3 - 2 * e);
        break;
      }
    }
  }
  if (s.contrast) h = 0.5 + (h - 0.5) * Math.exp(s.contrast / 40);
  h = h < 0 ? 0 : h > 1 ? 1 : h;
  if (s.bias) h = Math.pow(h, Math.pow(2, -s.bias / 40));
  const n = Math.round(s.terraces);
  if (n >= 2) h = Math.min(n - 1, Math.floor(h * n)) / (n - 1);
  return s.invert ? 1 - h : h;
}

// The second field alone, levelled — for splitting the pens by.
function secondAt(x, y, z) {
  if (!FLD.B) return 0.5;
  domainPoint(x, y, z);
  return level(FLD.B);
}

////////////////////////////////////////////////////////////////////////////////////////
// The camera
//
// Seen from outside — or through the cut-open front — the camera stands `distance` radii
// out along the way the azimuth and the elevation point, and looks at the middle;
// orthographic, it stands infinitely far that way. From inside it stands where it is
// put and looks the other way, through an ordinary lens, which keeps lines straight and
// can see less than half of everything, or a fisheye, which bends them and can see all
// round: the angle off its axis goes straight onto the paper as a distance.
//
// The paper's own frame: x to the right, y down, in mm; the world's: y up.

let VMODE = 0;               // 0 flat, 1 outside, 2 inside through the open front, 3 inside
let PERSP = true, FISH = false, HALF = 1, DIST = 4;
let CDX = 0, CDY = 0, CDZ = 1;     // towards the camera
let CRX = 1, CRY = 0, CRZ = 0;     // right
let CUX = 0, CUY = 1, CUZ = 0;     // up
let EYX = 0, EYY = 0, EYZ = 0;     // where the camera stands
let S = 1, OX = 0, OY = 0;
let BX0 = 0, BY0 = 0, BX1 = 0, BY1 = 0;  // past this box on paper nothing is worth walking

function makeView() {
  const s = settings;
  FLAT = s.surface === 'flat';
  VMODE = FLAT ? 0 : s.side === 'outside' ? 1 : s.side === 'inside, cut open' ? 2 : 3;

  const az = rad(s.azimuth), el = rad(clamp(s.elevation, -89.9, 89.9));
  CDX = Math.cos(el) * Math.sin(az); CDY = Math.sin(el); CDZ = Math.cos(el) * Math.cos(az);
  // right = up × towards, up = towards × right
  let rx = CDZ, ry = 0, rz = -CDX;
  const rl = Math.hypot(rx, rz) || 1;
  rx /= rl; rz /= rl;
  let ux = CDY * rz - CDZ * ry, uy = CDZ * rx - CDX * rz, uz = CDX * ry - CDY * rx;
  const ro = rad(s.roll), cr = Math.cos(ro), sr = Math.sin(ro);
  CRX = rx * cr + ux * sr; CRY = ry * cr + uy * sr; CRZ = rz * cr + uz * sr;
  CUX = ux * cr - rx * sr; CUY = uy * cr - ry * sr; CUZ = uz * cr - rz * sr;

  const half = Math.min(area.w, area.h) / 2 * s.zoom / 100;
  if (VMODE === 1 || VMODE === 2) {
    const rho = s.surface === 'sphere' ? 1 : 1.62;
    PERSP = s.projection === 'perspective';
    DIST = Math.max(s.distance, s.surface === 'sphere' ? 1.15 : 1.9);
    EYX = CDX * DIST; EYY = CDY * DIST; EYZ = CDZ * DIST;
    const fit = PERSP ? rho / Math.sqrt(DIST * DIST - rho * rho) : rho;
    S = half / fit;
  } else if (VMODE === 3) {
    const lim = 0.92;
    let x = clamp(s.camX / 100, -1, 1) * lim, y = clamp(s.camY / 100, -1, 1) * lim;
    let z = clamp(s.camZ / 100, -1, 1) * lim;
    if (s.surface === 'sphere') {
      const l = Math.hypot(x, y, z);
      if (l > lim) { x *= lim / l; y *= lim / l; z *= lim / l; }
    }
    EYX = x; EYY = y; EYZ = z;
    FISH = s.lens === 'fisheye';
    HALF = rad(clamp(s.fov, 10, FISH ? 360 : 170)) / 2;
    S = FISH ? half / HALF : half / Math.tan(HALF);
  } else {
    S = 1;
  }
  OX = (area.x0 + area.x1) / 2 + s.panX;
  OY = (area.y0 + area.y1) / 2 + s.panY;
  const pad = 30;
  BX0 = area.x0 - pad; BY0 = area.y0 - pad; BX1 = area.x1 + pad; BY1 = area.y1 + pad;
}

// A point of the surface, with its outward normal, onto the paper: EX, EY, and whether
// it shows. `faceless` skips the question of which way the surface faces there — for the
// outline, which is where it turns.
let EX = 0, EY = 0;

function projectPoint(x, y, z, nx, ny, nz, faceless) {
  let X, Y;
  if (VMODE === 3) {
    const dx = x - EYX, dy = y - EYY, dz = z - EYZ;
    const cx = dx * CRX + dy * CRY + dz * CRZ;
    const cy = dx * CUX + dy * CUY + dz * CUZ;
    const cz = -(dx * CDX + dy * CDY + dz * CDZ);
    if (FISH) {
      const r = Math.hypot(cx, cy), th = Math.atan2(r, cz);
      if (!(th < HALF) || th > Math.PI - 1e-3) return false;
      const k = r > 1e-12 ? th / r : 1;
      X = cx * k; Y = cy * k;
    } else {
      if (!(cz > 0.02 * Math.hypot(dx, dy, dz))) return false;
      X = cx / cz; Y = cy / cz;
    }
  } else {
    if (!faceless) {
      const f = PERSP ? nx * (EYX - x) + ny * (EYY - y) + nz * (EYZ - z)
                      : nx * CDX + ny * CDY + nz * CDZ;
      if (VMODE === 1 ? !(f > 0) : !(f < 0)) return false;
    }
    X = x * CRX + y * CRY + z * CRZ;
    Y = x * CUX + y * CUY + z * CUZ;
    if (PERSP) {
      const depth = DIST - (x * CDX + y * CDY + z * CDZ);
      X /= depth; Y /= depth;
    }
  }
  EX = OX + S * X;
  EY = OY - S * Y;
  return EX > BX0 && EX < BX1 && EY > BY0 && EY < BY1;
}

////////////////////////////////////////////////////////////////////////////////////////
// Charts
//
// A chart is a rectangle of the pattern's own plane, U by V cells, and a map from it
// onto the surface. The pattern is laid on the charts without knowing what they are
// wrapped round; the field is read through them, at the point of the surface each place
// of the chart lands on.
//
//   flat      — the drawable box, a cell `cell` mm wide; the only chart a flat sheet has.
//   face      — a face of the cube, the cube from −1 to 1.
//   blown     — a face of the cube blown out onto the ball, its coordinates spaced by
//               angle so that the cells near its corners are not squeezed.
//   globe     — latitude and longitude round the whole ball, the north pole on top.
//   tangent   — the plane that touches the ball at one point, carried onto it from its
//               middle; one to a mark when the marks are scattered by a Fibonacci spiral.
//
// The faces are turned so that, seen from outside, u runs to the right and v down, as
// they do on paper — the pattern is never mirrored.

const FACES = [
  { F: [1, 0, 0],  A: [0, 0, -1], B: [0, -1, 0] },
  { F: [-1, 0, 0], A: [0, 0, 1],  B: [0, -1, 0] },
  { F: [0, 1, 0],  A: [1, 0, 0],  B: [0, 0, 1] },
  { F: [0, -1, 0], A: [1, 0, 0],  B: [0, 0, -1] },
  { F: [0, 0, 1],  A: [1, 0, 0],  B: [0, -1, 0] },
  { F: [0, 0, -1], A: [-1, 0, 0], B: [0, -1, 0] },
];

const K_FLAT = 0, K_FACE = 1, K_BLOWN = 2, K_GLOBE = 3, K_TAN = 4;

let PX3 = 0, PY3 = 0, PZ3 = 0, NX3 = 0, NY3 = 0, NZ3 = 0;   // what chartPoint leaves behind
let PPX = 0, PPY = 0;                                       // on a flat chart, on paper

function chartPoint(ch, u, v) {
  switch (ch.kind) {
    case K_FLAT: {
      PPX = ch.x0 + u * ch.mm; PPY = ch.y0 + v * ch.mm;
      PX3 = (PPX - DOM.cx) / DOM.R; PY3 = (PPY - DOM.cy) / DOM.R; PZ3 = 0;
      NX3 = 0; NY3 = 0; NZ3 = 1;
      return;
    }
    case K_FACE: {
      const a = 2 * u / ch.U - 1, b = 2 * v / ch.V - 1, f = ch.f;
      PX3 = f.F[0] + f.A[0] * a + f.B[0] * b;
      PY3 = f.F[1] + f.A[1] * a + f.B[1] * b;
      PZ3 = f.F[2] + f.A[2] * a + f.B[2] * b;
      NX3 = f.F[0]; NY3 = f.F[1]; NZ3 = f.F[2];
      return;
    }
    case K_BLOWN: {
      const q = Math.PI / 4;
      const a = Math.tan(q * clamp(2 * u / ch.U - 1, -1.9, 1.9));
      const b = Math.tan(q * clamp(2 * v / ch.V - 1, -1.9, 1.9));
      const f = ch.f;
      let x = f.F[0] + f.A[0] * a + f.B[0] * b;
      let y = f.F[1] + f.A[1] * a + f.B[1] * b;
      let z = f.F[2] + f.A[2] * a + f.B[2] * b;
      const l = Math.hypot(x, y, z);
      PX3 = NX3 = x / l; PY3 = NY3 = y / l; PZ3 = NZ3 = z / l;
      return;
    }
    case K_GLOBE: {
      const lon = 2 * Math.PI * u / ch.U - Math.PI, lat = Math.PI / 2 - Math.PI * v / ch.V;
      const c = Math.cos(lat);
      PX3 = NX3 = c * Math.sin(lon); PY3 = NY3 = Math.sin(lat); PZ3 = NZ3 = c * Math.cos(lon);
      return;
    }
    case K_TAN: {
      const k = ch.k;
      const x = ch.c[0] + (ch.t1[0] * u + ch.t2[0] * v) * k;
      const y = ch.c[1] + (ch.t1[1] * u + ch.t2[1] * v) * k;
      const z = ch.c[2] + (ch.t1[2] * u + ch.t2[2] * v) * k;
      const l = Math.hypot(x, y, z);
      PX3 = NX3 = x / l; PY3 = NY3 = y / l; PZ3 = NZ3 = z / l;
      return;
    }
  }
}

function chartHeight(ch, u, v) {
  chartPoint(ch, u, v);
  return heightAt(PX3, PY3, PZ3);
}

// A place of a chart onto the paper; false where it does not show.
function chartOnPaper(ch, u, v) {
  if (ch.kind === K_SPACE) return spaceOnPaper(u);
  chartPoint(ch, u, v);
  if (ch.kind === K_FLAT) { EX = PPX; EY = PPY; return true; }
  return projectPoint(PX3, PY3, PZ3, NX3, NY3, NZ3, false);
}

// How many cells across one face of the cube, and how wide a cell is on the flat sheet.
function cellsAcross() { return Math.max(2, Math.round(settings.cells3d)); }

// Patterns of whole lines, and marks that join their neighbours, need a chart; the
// Fibonacci scatter has none, and they fall back on the cube map.
function sphereMap() {
  const s = settings;
  if (s.sphereMap === 'fibonacci' && !isCellPattern()) return 'cube map';
  if (s.sphereMap === 'fibonacci' && SQUARE_ONLY.includes(s.pattern)) return 'cube map';
  return s.sphereMap;
}

function isCellPattern() { return CELL_PATTERNS.includes(settings.pattern); }

// Every chart of the surface. `clip` is the part of the chart the pattern is kept to:
// the box's faces end at their edges, and so does a pattern of lines on a blown face —
// but a mark on a blown face may run on over the edge onto the next, which is what keeps
// the marks along the seams of the ball whole.
function makeCharts() {
  const s = settings;
  const out = [];
  if (FLAT) {
    const mm = Math.max(0.2, s.cell);
    out.push({ kind: K_FLAT, U: area.w / mm, V: area.h / mm, mm, x0: area.x0, y0: area.y0,
               face: 0, clip: [0, 0, area.w / mm, area.h / mm] });
    return out;
  }
  const N = cellsAcross();
  if (s.surface === 'cube') {
    FACES.forEach((f, i) => out.push({ kind: K_FACE, U: N, V: N, f, face: i, clip: [0, 0, N, N] }));
    return out;
  }
  const map = sphereMap();
  if (map === 'lat-long') {
    out.push({ kind: K_GLOBE, U: 4 * N, V: 2 * N, face: 0, clip: [0, 0, 4 * N, 2 * N] });
  } else if (map === 'cube map') {
    const lines = !isCellPattern() || SQUARE_ONLY.includes(s.pattern);
    const m = lines ? 0 : 0.4 * N;
    FACES.forEach((f, i) => out.push({ kind: K_BLOWN, U: N, V: N, f, face: i,
                                        clip: [-m, -m, N + m, N + m] }));
  }
  return out;
}

// The Fibonacci scatter: points as evenly spread over the ball as points can be, as many
// as a cube map of the same cell would hold, and the plane touching the ball at each.
function fibonacciCharts() {
  const N = cellsAcross();
  const d = (Math.PI / 2) / N;                 // a cell, in radians
  const n = Math.max(12, Math.round(4 * Math.PI / (d * d)));
  const ga = Math.PI * (3 - Math.sqrt(5));
  const out = [];
  for (let i = 0; i < n; i++) {
    const z = 1 - 2 * (i + 0.5) / n, r = Math.sqrt(1 - z * z), t = ga * i;
    const c = [r * Math.cos(t), z, r * Math.sin(t)];          // the pole up, along y
    // east and south in the touching plane
    let ex = c[2], ez = -c[0];
    const el = Math.hypot(ex, ez);
    let t1;
    if (el < 1e-9) t1 = [1, 0, 0];
    else t1 = [ex / el, 0, ez / el];
    const t2 = [ c[1] * t1[2] - c[2] * t1[1], c[2] * t1[0] - c[0] * t1[2], c[0] * t1[1] - c[1] * t1[0] ];
    // t1 × t2 must point inwards for u right, v down seen from outside
    if (t2[0] * c[0] + t2[1] * c[1] + t2[2] * c[2] > 0 ||
        (t1[1] * t2[2] - t1[2] * t2[1]) * c[0] + (t1[2] * t2[0] - t1[0] * t2[2]) * c[1] +
        (t1[0] * t2[1] - t1[1] * t2[0]) * c[2] > 0) {
      t2[0] = -t2[0]; t2[1] = -t2[1]; t2[2] = -t2[2];
    }
    out.push({ kind: K_TAN, U: 0, V: 0, c, t1, t2, k: d, face: i, idx: i, clip: null });
  }
  return out;
}

////////////////////////////////////////////////////////////////////////////////////////
// Walking a line onto the paper
//
// On a flat sheet a chart is the paper, scaled, and a line goes down as it is. On a
// surface it is bent, and hidden in places. Each piece of it, from one point to the
// next, is halved for as long as its middle strays from its chord by more than SAG on
// paper, or its chord is longer than SEG_MAX; where it crosses from shown to hidden the
// crossing is found by bisection, and the run is cut there. Both ends hidden, a piece is
// looked into once or twice in case it shows in the middle.

let RUNX = [], RUNY = [];
const SINK_CTX = { sink: null, pen: 0, layer: 0 };
let SAG2 = SAG * SAG, SEG2 = SEG_MAX * SEG_MAX;

function segDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ex = ax + t * dx - px, ey = ay + t * dy - py;
  return ex * ex + ey * ey;
}

function flushRun() {
  if (RUNX.length >= 2) {
    const runs = [];
    clipRuns(RUNX, RUNY, RUNX.length, runs);
    for (const [rx, ry] of runs) SINK_CTX.sink.run(rx, ry, rx.length, SINK_CTX.pen, SINK_CTX.layer);
  }
  RUNX = []; RUNY = [];
}

function walkSeg(ch, u0, v0, x0, y0, s0, u1, v1, x1, y1, s1, d) {
  if (s0 && s1) {
    if (d < MAX_DEPTH) {
      const um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
      const sm = chartOnPaper(ch, um, vm), xm = EX, ym = EY;
      let split = !sm;
      if (!split) {
        const dx = x1 - x0, dy = y1 - y0;
        split = dx * dx + dy * dy > SEG2 || segDist2(xm, ym, x0, y0, x1, y1) > SAG2;
      }
      if (split) {
        walkSeg(ch, u0, v0, x0, y0, true, um, vm, xm, ym, sm, d + 1);
        walkSeg(ch, um, vm, xm, ym, sm, u1, v1, x1, y1, true, d + 1);
        return;
      }
    }
    RUNX.push(x1); RUNY.push(y1);
    return;
  }
  if (!s0 && !s1) {
    if (d < 2) {
      const um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
      if (chartOnPaper(ch, um, vm)) {
        const xm = EX, ym = EY;
        walkSeg(ch, u0, v0, x0, y0, false, um, vm, xm, ym, true, d + 1);
        walkSeg(ch, um, vm, xm, ym, true, u1, v1, x1, y1, false, d + 1);
      }
    }
    return;
  }
  // one end shows: where does it stop?
  let ua = s0 ? u0 : u1, va = s0 ? v0 : v1, ub = s0 ? u1 : u0, vb = s0 ? v1 : v0;
  let xa = s0 ? x0 : x1, ya = s0 ? y0 : y1;
  for (let it = 0; it < 16; it++) {
    const um = (ua + ub) / 2, vm = (va + vb) / 2;
    if (chartOnPaper(ch, um, vm)) { ua = um; va = vm; xa = EX; ya = EY; }
    else { ub = um; vb = vm; }
  }
  if (s0) {
    walkSeg(ch, u0, v0, x0, y0, true, ua, va, xa, ya, true, d + 1);
    flushRun();
  } else {
    flushRun();
    RUNX.push(xa); RUNY.push(ya);
    walkSeg(ch, ua, va, xa, ya, true, u1, v1, x1, y1, true, d + 1);
  }
}

function walkLine(ch, us, vs, n, sink, pen, layer) {
  SINK_CTX.sink = sink; SINK_CTX.pen = pen; SINK_CTX.layer = layer;
  RUNX = []; RUNY = [];
  if (ch.kind === K_FLAT) {
    const xs = new Array(n), ys = new Array(n);
    for (let i = 0; i < n; i++) { xs[i] = ch.x0 + us[i] * ch.mm; ys[i] = ch.y0 + vs[i] * ch.mm; }
    const runs = [];
    clipRuns(xs, ys, n, runs);
    for (const [rx, ry] of runs) sink.run(rx, ry, rx.length, pen, layer);
    return;
  }
  let u0 = us[0], v0 = vs[0];
  let s0 = chartOnPaper(ch, u0, v0), x0 = EX, y0 = EY;
  if (s0) { RUNX.push(x0); RUNY.push(y0); }
  for (let i = 1; i < n; i++) {
    const u1 = us[i], v1 = vs[i];
    const s1 = chartOnPaper(ch, u1, v1), x1 = EX, y1 = EY;
    walkSeg(ch, u0, v0, x0, y0, s0, u1, v1, x1, y1, s1, 0);
    u0 = u1; v0 = v1; s0 = s1; x0 = x1; y0 = y1;
  }
  flushRun();
}

// A polyline of space, for the outline — the edges of the box, the rim of the ball — as
// a chart of its own: u counts its points, and between two of them it runs straight.
const K_SPACE = -1;
const SPACE_CH = { kind: K_SPACE, pts: [] };

function walkSpace(pts, closed, sink, pen, layer) {
  const P = closed ? pts.concat([pts[0]]) : pts;
  SPACE_CH.pts = P;
  const us = [], vs = [];
  for (let i = 0; i < P.length; i++) { us.push(i); vs.push(0); }
  walkLine(SPACE_CH, us, vs, us.length, sink, pen, layer);
}

function spaceOnPaper(u) {
  const P = SPACE_CH.pts, n = P.length;
  let i = Math.floor(u);
  if (i > n - 2) i = n - 2;
  if (i < 0) i = 0;
  const t = u - i, a = P[i], b = P[i + 1];
  return projectPoint(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t,
                      a[2] + (b[2] - a[2]) * t, 0, 0, 0, true);
}

////////////////////////////////////////////////////////////////////////////////////////
// Laying the pattern
//
// The pattern is laid once on the charts, in their own coordinates, and kept: turning the
// camera walks the same lines onto the paper again and lays nothing anew. Each line laid
// is an item — a polyline of one chart, one pen, and the mark it belongs to, so that a
// mark too small on paper can be left out whole.

let CHARTS = [];
let ITEMS = null, itemKeyNow = '';
// what laying collects, turned into typed arrays when it is done
let I_CH, I_PEN, I_EL, I_OFF, I_U, I_V, EL_CH, EL_U, EL_V, EL_R, LAY_FULL = false;

const VIEW_KEYS = new Set(['side', 'projection', 'distance', 'lens', 'fov', 'camX', 'camY',
  'camZ', 'azimuth', 'elevation', 'roll', 'zoom', 'panX', 'panY', 'thinBelow', 'outline',
  'outlinePen', 'ink0', 'ink1', 'paperColor', 'optimiseOrder', 'liveUpdate', 'pngDpi',
  'paper', 'orientation', 'customW', 'customH', 'margin', 'penWidth']);

function itemKey() {
  const parts = [fldKeyNow];
  for (const k of Object.keys(DEFAULTS)) if (!VIEW_KEYS.has(k)) parts.push(settings[k]);
  if (FLAT) parts.push(area.x0, area.y0, area.w, area.h);
  else parts.push(Math.min(area.w, area.h));
  return parts.join('|');
}

function ensureItems() {
  const key = itemKey();
  if (key === itemKeyNow && ITEMS) return;
  itemKeyNow = key;
  layPattern();
}

// --- collecting ---

let L_CH = [], L_PEN = [], L_EL = [], L_OFF = [0], L_U = [], L_V = [];
let E_CH = [], E_U = [], E_V = [], E_R = [];
let CUR_CH = 0;

function newMark(ci, cu, cv, r) {
  E_CH.push(ci); E_U.push(cu); E_V.push(cv); E_R.push(r);
  return E_CH.length - 1;
}

// Liang–Barsky against a rectangle of the chart, for the runs of a polyline inside it.
function clipRect(us, vs, n, R, out) {
  let inside = true;
  for (let i = 0; i < n; i++) {
    if (us[i] < R[0] || us[i] > R[2] || vs[i] < R[1] || vs[i] > R[3]) { inside = false; break; }
  }
  if (inside) { out.push([us, vs]); return; }
  let ru = null, rv = null;
  const flush = () => { if (ru && ru.length >= 2) out.push([ru, rv]); ru = rv = null; };
  for (let i = 0; i + 1 < n; i++) {
    const x0 = us[i], y0 = vs[i], dx = us[i + 1] - x0, dy = vs[i + 1] - y0;
    let t0 = 0, t1 = 1, ok = true;
    for (let e = 0; e < 4 && ok; e++) {
      const p = e === 0 ? -dx : e === 1 ? dx : e === 2 ? -dy : dy;
      const q = e === 0 ? x0 - R[0] : e === 1 ? R[2] - x0 : e === 2 ? y0 - R[1] : R[3] - y0;
      if (p === 0) { if (q < 0) ok = false; continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) ok = false; else if (r > t0) t0 = r; }
      else { if (r < t0) ok = false; else if (r < t1) t1 = r; }
    }
    if (!ok) { flush(); continue; }
    const ax = x0 + t0 * dx, ay = y0 + t0 * dy, bx = x0 + t1 * dx, by = y0 + t1 * dy;
    if (ru && Math.abs(ru[ru.length - 1] - ax) < 1e-9 && Math.abs(rv[rv.length - 1] - ay) < 1e-9) {
      ru.push(bx); rv.push(by);
    } else {
      flush();
      ru = [ax, bx]; rv = [ay, by];
    }
    if (t1 < 1) flush();
  }
  flush();
}

function addItem(us, vs, pen, el) {
  if (LAY_FULL) return;
  const ch = CHARTS[CUR_CH];
  const runs = [];
  if (ch.clip) clipRect(us, vs, us.length, ch.clip, runs);
  else runs.push([us, vs]);
  for (const [ru, rv] of runs) {
    if (ru.length < 2) continue;
    for (let i = 0; i < ru.length; i++) { L_U.push(ru[i]); L_V.push(rv[i]); }
    L_OFF.push(L_U.length);
    L_CH.push(CUR_CH); L_PEN.push(pen); L_EL.push(el);
    if (L_CH.length > MAX_ITEMS) { LAY_FULL = true; return; }
  }
}

// A polyline whose pen may change along it: cut where it does, halfway between.
function addSplit(us, vs, pens, el) {
  const n = us.length;
  if (n < 2) return;
  let su = [us[0]], sv = [vs[0]], p = pens[0];
  for (let i = 1; i < n; i++) {
    if (pens[i] !== p) {
      const mu = (us[i - 1] + us[i]) / 2, mv = (vs[i - 1] + vs[i]) / 2;
      su.push(mu); sv.push(mv);
      addItem(su, sv, p, el);
      su = [mu]; sv = [mv]; p = pens[i];
    }
    su.push(us[i]); sv.push(vs[i]);
  }
  addItem(su, sv, p, el);
}

// --- which pen ---

function penOf(ch, u, v, h, ci, cj, part, pass) {
  const s = settings;
  if (!twoPens()) return 0;
  const t = s.splitAt / 100;
  switch (s.split) {
    case 'height':       return h >= t ? 1 : 0;
    case 'second field': chartPoint(ch, u, v); return secondAt(PX3, PY3, PZ3) >= t ? 1 : 0;
    case 'random':       return hash01(ci, cj, 77 + ch.face * 131) < h ? 1 : 0;
    case 'checker':      return ((ci + cj) % 2 + 2) % 2;
    case 'rows':         return ((cj % 2) + 2) % 2;
    case 'parts':        return part & 1;
    case 'faces':        return FACE_PEN[ch.face % 6];
    case 'overlay':      return pass;
  }
  return 0;
}

// Faces opposite one another always differ; of the eight corners of the box, the one the
// camera looks at to begin with has a red face between two black ones. (Two of the
// corners have to come out all one colour — two colours cannot do better on a cube.)
const FACE_PEN = [0, 1, 1, 0, 0, 1];

// What a pass of the pattern reads: the height, or for the red layer of an overlay, the
// height inverted or the second field.
function sourceFor(pass) {
  const s = settings;
  if (pass === 0 || !twoPens() || s.split !== 'overlay' || s.ovSource === 'same') {
    return (ch, u, v) => chartHeight(ch, u, v);
  }
  if (s.ovSource === 'inverted') return (ch, u, v) => 1 - chartHeight(ch, u, v);
  return (ch, u, v) => { chartPoint(ch, u, v); return secondAt(PX3, PY3, PZ3); };
}

function passes() { return twoPens() && settings.split === 'overlay' ? 2 : 1; }

// About how many millimetres of paper a cell comes to — for how finely a circle is cut
// into straight pieces before it is walked. On a surface it depends on the camera, which
// the pattern does not know; the walk bends whatever it is given anyway.
function mmPerCell(ch) {
  if (ch.kind === K_FLAT) return ch.mm;
  return Math.min(area.w, area.h) / 2 * (Math.PI / 2) / cellsAcross() * 1.3;
}

function layPattern() {
  L_CH = []; L_PEN = []; L_EL = []; L_OFF = [0]; L_U = []; L_V = [];
  E_CH = []; E_U = []; E_V = []; E_R = [];
  LAY_FULL = false;

  CHARTS = makeCharts();
  const fib = !FLAT && settings.surface === 'sphere' && sphereMap() === 'fibonacci';
  if (fib) CHARTS = fibonacciCharts();

  if (isCellPattern()) layMarks(fib);
  else layLines();

  ITEMS = {
    n: L_CH.length,
    ch: Int32Array.from(L_CH), pen: Int8Array.from(L_PEN), el: Int32Array.from(L_EL),
    off: Int32Array.from(L_OFF), u: Float64Array.from(L_U), v: Float64Array.from(L_V),
    marks: E_CH.length, full: LAY_FULL,
  };
  EL_CH = Int32Array.from(E_CH); EL_U = Float64Array.from(E_U);
  EL_V = Float64Array.from(E_V); EL_R = Float64Array.from(E_R);
  L_CH = L_PEN = L_EL = L_U = L_V = E_CH = E_U = E_V = E_R = null;
  L_OFF = [0];
}

////////////////////////////////////////////////////////////////////////////////////////
// Marks, one to a cell
//
// Every cell of every chart is read first — its height, and the slope of the field
// across it — and only then drawn, because a mark that slips down the slope slips by its
// slope against the steepest on the sheet (all but the steepest twentieth), which is not
// known until every cell has been read.

// The centres of the cells of one chart, for one pass. The red layer of an overlay is the
// same grid shifted and turned about the middle of the chart.
function lattice(ch, pass, cb) {
  const s = settings;
  const grid = SQUARE_ONLY.includes(s.pattern) ? 'square' : s.grid;
  const ov = pass === 1;
  const turn = ov ? rad(s.ovTurn) : 0, ct = Math.cos(turn), st = Math.sin(turn);
  const su = ov ? s.ovShiftU : 0, sv = ov ? s.ovShiftV : 0;
  const U = ch.U, V = ch.V, mu = U / 2, mv = V / 2;
  const place = (lu, lv, ci, cj) => {
    const x = lu - mu + su, y = lv - mv + sv;
    const u = mu + x * ct - y * st, v = mv + x * st + y * ct;
    if (u >= 0 && u <= U && v >= 0 && v <= V) cb(u, v, ci, cj);
  };
  const pad = turn ? Math.ceil(Math.hypot(U, V) / 2) + 2 : 2 + Math.ceil(Math.abs(su) + Math.abs(sv));

  if (grid === 'radial') {
    const K = Math.ceil(Math.hypot(U, V) / 2) + 2;
    for (let k = 0; k <= K; k++) {
      const n = k === 0 ? 1 : Math.round(2 * Math.PI * k);
      const off = (k & 1) ? 0.5 : 0;
      for (let m = 0; m < n; m++) {
        const a = 2 * Math.PI * (m + off) / n;
        place(mu + k * Math.cos(a), mv + k * Math.sin(a), k, m);
      }
    }
    return;
  }
  if (grid === 'poisson') {
    for (const [u, v, i] of poissonPoints(U, V, ch.face * 7 + pass * 3 + 1)) place(u, v, i, 0);
    return;
  }
  if (grid === 'hex') {
    const hh = Math.sqrt(3) / 2;
    const ou = (U - Math.floor(U)) / 2, ov2 = (V - Math.floor(V / hh) * hh) / 2;
    for (let j = -pad; j <= V / hh + pad; j++) {
      for (let i = -pad; i <= U + pad; i++) {
        place(ou + i + 0.5 + (j & 1) * 0.5, ov2 + (j + 0.5) * hh, i, j);
      }
    }
    return;
  }
  const ou = (U - Math.floor(U)) / 2, ov2 = (V - Math.floor(V)) / 2;
  const jit = grid === 'jittered' ? s.jitter / 100 : 0;
  for (let j = -pad; j < V + pad; j++) {
    for (let i = -pad; i < U + pad; i++) {
      let lu = ou + i + 0.5, lv = ov2 + j + 0.5;
      if (jit) {
        lu += (hash01(i, j, 11 + ch.face * 17 + pass) - 0.5) * jit;
        lv += (hash01(i, j, 12 + ch.face * 17 + pass) - 0.5) * jit;
      }
      place(lu, lv, i, j);
    }
  }
}

// Bridson's Poisson disc: points no nearer each other than 0.92 of a cell, as many as
// fit — about as many as a square grid holds, but with no rows to them.
function poissonPoints(U, V, salt) {
  const r = 0.92, cs = r / Math.SQRT2;
  const gw = Math.ceil(U / cs) + 1, gh = Math.ceil(V / cs) + 1;
  const grid = new Int32Array(gw * gh).fill(-1);
  const pts = [], active = [];
  const rnd = mulberry32((settings.seed | 0) * 7 + salt * 101);
  const put = (u, v) => {
    pts.push([u, v, pts.length]);
    grid[Math.floor(v / cs) * gw + Math.floor(u / cs)] = pts.length - 1;
    active.push(pts.length - 1);
  };
  put(rnd() * U, rnd() * V);
  while (active.length) {
    const ai = Math.floor(rnd() * active.length), p = pts[active[ai]];
    let found = false;
    for (let t = 0; t < 20; t++) {
      const a = rnd() * 2 * Math.PI, d = r * (1 + rnd());
      const u = p[0] + d * Math.cos(a), v = p[1] + d * Math.sin(a);
      if (u < 0 || u >= U || v < 0 || v >= V) continue;
      const gi = Math.floor(u / cs), gj = Math.floor(v / cs);
      let ok = true;
      for (let j = Math.max(0, gj - 2); j <= Math.min(gh - 1, gj + 2) && ok; j++) {
        for (let i = Math.max(0, gi - 2); i <= Math.min(gw - 1, gi + 2); i++) {
          const q = grid[j * gw + i];
          if (q >= 0 && (pts[q][0] - u) ** 2 + (pts[q][1] - v) ** 2 < r * r) { ok = false; break; }
        }
      }
      if (ok) { put(u, v); found = true; break; }
    }
    if (!found) { active[ai] = active[active.length - 1]; active.pop(); }
  }
  return pts;
}

function layMarks(fib) {
  const s = settings;
  const npass = passes();
  // read every cell first
  const C = [];                               // [chart, pass, u, v, ci, cj, h, gx, gy]
  const d = 0.35;
  for (let pass = 0; pass < npass; pass++) {
    const src = sourceFor(pass);
    CHARTS.forEach((ch, k) => {
      const read = (u, v, ci, cj) => {
        const h = src(ch, u, v);
        const gx = (src(ch, u + d, v) - src(ch, u - d, v)) / (2 * d);
        const gy = (src(ch, u, v + d) - src(ch, u, v - d)) / (2 * d);
        C.push([k, pass, u, v, ci, cj, h, gx, gy]);
      };
      if (fib) {
        // the red layer of an overlay on the scatter: the next point along, shifted
        const sh = pass ? [s.ovShiftU, s.ovShiftV] : [0, 0];
        read(sh[0], sh[1], ch.idx, 0);
      } else {
        lattice(ch, pass, read);
      }
    });
  }
  const gs = C.map(c => Math.hypot(c[7], c[8])).sort((a, b) => a - b);
  const gRef = Math.max(1e-6, gs.length ? gs[Math.floor(0.95 * (gs.length - 1))] : 1);

  for (const c of C) {
    if (LAY_FULL) break;
    CUR_CH = c[0];
    drawMark(CHARTS[c[0]], c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8], gRef);
  }
}

// One mark: its size from the height, its place slipped by the height or down the slope,
// turned by either, and as many rings, turns, lines or spikes as the height gives it.
function drawMark(ch, pass, u, v, ci, cj, h, gx, gy, gRef) {
  const s = settings;
  const pat = s.pattern;
  if (h < s.skipBelow / 100) return;
  const r = lerp1(s.sizeMin, s.sizeMax, h) / 200;      // radius, in cells

  if (s.offset) {
    const k = s.offset / 100;
    if (s.offsetBy === 'slope') {
      const m = Math.min(2, Math.hypot(gx, gy) / gRef), a = Math.atan2(gy, gx);
      u += k * m * Math.cos(a); v += k * m * Math.sin(a);
    } else {
      u += k * h * Math.cos(rad(s.offsetAngle)); v += k * h * Math.sin(rad(s.offsetAngle));
    }
  }
  let ang = rad(s.rotation) + (pass ? rad(s.ovTurn) : 0);
  if (s.rotateBy === 'slope' || pat === 'ellipses') ang += Math.atan2(gy, gx);
  else if (s.rotateBy === 'height') ang += h * rad(s.rotSpan);
  const n = Math.max(1, Math.round(lerp1(1, s.detail, h)));
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const pen = part => penOf(ch, u, v, h, ci, cj, part, pass);
  const mm = mmPerCell(ch);
  const segs = rr => Math.round(clamp(2 * Math.PI * rr * mm / 0.4, 12, 180));

  // a shape given in the mark's own frame, turned and set down
  const shape = (xs, ys, closed, part, el) => {
    const us = [], vs = [];
    for (let i = 0; i < xs.length; i++) {
      us.push(u + xs[i] * ca - ys[i] * sa);
      vs.push(v + xs[i] * sa + ys[i] * ca);
    }
    if (closed) { us.push(us[0]); vs.push(vs[0]); }
    addItem(us, vs, pen(part), el);
  };
  const circle = (rr, part, el, sx = 1, sy = 1) => {
    const m = segs(rr), xs = [], ys = [];
    for (let i = 0; i < m; i++) {
      const t = 2 * Math.PI * i / m;
      xs.push(rr * sx * Math.cos(t)); ys.push(rr * sy * Math.sin(t));
    }
    shape(xs, ys, true, part, el);
  };
  const polygon = (rr, k, part, el, inner = 0) => {
    const xs = [], ys = [], m = inner ? 2 * k : k;
    for (let i = 0; i < m; i++) {
      const t = 2 * Math.PI * i / m - Math.PI / 2, q = inner && (i & 1) ? inner : rr;
      xs.push(q * Math.cos(t)); ys.push(q * Math.sin(t));
    }
    shape(xs, ys, true, part, el);
  };
  const square = (hr, part, el) => shape([-hr, hr, hr, -hr], [-hr, -hr, hr, hr], true, part, el);

  if (pat === 'truchet' || pat === '10 print') {
    const flip = hash01(ci, cj, 31 + ch.face * 7 + pass) < h;
    const strands = Math.max(1, Math.round(s.detail));
    const u0 = u - 0.5, v0 = v - 0.5;
    for (let k = 0; k < strands; k++) {
      const off = strands > 1 ? (k / (strands - 1) - 0.5) * (pat === 'truchet' ? 0.4 : 0.6) : 0;
      if (pat === '10 print') {
        // a diagonal one way or the other, and its neighbours beside it, kept to the cell
        const dx = 1, dy = flip ? 1 : -1;
        const px = -dy / Math.SQRT2 * off, py = dx / Math.SQRT2 * off;
        const runs = [];
        clipRect([u - dx + px, u + dx + px], [v - dy + py, v + dy + py], 2,
                 [u0, v0, u0 + 1, v0 + 1], runs);
        for (const [us, vs] of runs) addItem(us, vs, pen(k), -1);
        continue;
      }
      const rr = 0.5 + off;
      for (const corner of flip ? [[0, 0, 0], [1, 1, 2]] : [[1, 0, 1], [0, 1, 3]]) {
        const cx = u0 + corner[0], cy = v0 + corner[1], a0 = corner[2] * Math.PI / 2;
        const m = Math.max(6, segs(rr) >> 2), us = [], vs = [];
        for (let i = 0; i <= m; i++) {
          const t = a0 + Math.PI / 2 * i / m;
          us.push(cx + rr * Math.cos(t)); vs.push(cy + rr * Math.sin(t));
        }
        addItem(us, vs, pen(k), -1);
      }
    }
    return;
  }

  if (pat === 'dots') {
    const m = Math.round(h * Math.max(1, s.detail) * 1.5);
    const e = EPS / mm;
    for (let k = 0; k < m; k++) {
      const du = (hash01(ci * 13 + k, cj, 51 + ch.face + pass * 3) - 0.5) * 2 * r;
      const dv = (hash01(ci * 13 + k, cj, 52 + ch.face + pass * 3) - 0.5) * 2 * r;
      addItem([u + du, u + du + e], [v + dv, v + dv], pen(k), -1);
    }
    return;
  }

  if (r <= 0) return;
  const el = newMark(CUR_CH, u, v, r);
  switch (pat) {
    case 'circles': circle(r, 0, el); break;
    case 'rings':
      for (let k = 1; k <= n; k++) circle(r * k / n, k, el);
      break;
    case 'squares': square(r, 0, el); break;
    case 'polygons': polygon(r, Math.max(3, Math.round(s.sides)), 0, el); break;
    case 'nested squares':
      for (let k = 1; k <= n; k++) square(r * k / n, k, el);
      break;
    case 'crosses':
      shape([-r, r], [0, 0], false, 0, el);
      shape([0, 0], [-r, r], false, 1, el);
      break;
    case 'dashes': shape([-r, r], [0, 0], false, 0, el); break;
    case 'hatched cells':
      for (let k = 0; k < n; k++) {
        const x = -r + (k + 0.5) * 2 * r / n;
        shape([x, x], [-r, r], false, k, el);
      }
      break;
    case 'spirals': {
      const turns = lerp1(0.75, Math.max(1, s.detail), h), m = Math.ceil(turns * segs(r) * 0.6);
      const xs = [], ys = [];
      for (let i = 0; i <= m; i++) {
        const t = i / m, a = t * turns * 2 * Math.PI;
        xs.push(r * t * Math.cos(a)); ys.push(r * t * Math.sin(a));
      }
      shape(xs, ys, false, 0, el);
      break;
    }
    case 'stars': polygon(r, Math.max(3, Math.round(s.detail)), 0, el, r * 0.42); break;
    case 'flowers': {
      const k = Math.max(2, Math.round(s.detail)), m = segs(r) * 2, xs = [], ys = [];
      for (let i = 0; i < m; i++) {
        const t = 2 * Math.PI * i / m, q = r * (0.68 + 0.32 * Math.cos(k * t));
        xs.push(q * Math.cos(t)); ys.push(q * Math.sin(t));
      }
      shape(xs, ys, true, 0, el);
      break;
    }
    case 'ellipses': {
      const g = Math.min(1, Math.hypot(gx, gy) / gRef);
      circle(r, 0, el, 1, 1 - 0.85 * g);
      break;
    }
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Patterns of whole lines
//
// A line runs across a whole chart and reads the field at every point it passes. The
// ruled patterns are families of parallel lines a cell apart, at an angle; each point of
// a line is pushed square to it, or set waving, or kept only where the field is high
// enough. Contours, streamlines and the warped grid read the field off a grid of samples
// laid over the chart once, which is cheaper than asking the field itself for every
// step of every line, and smooth enough at a few samples to a cell.

// Samples of the field over a chart, `res` cells apart — never more than about 300 000.
function chartGrid(ch, res, src) {
  const U = ch.U, V = ch.V;
  res = Math.max(res, Math.sqrt(U * V / 300000));
  const nx = Math.ceil(U / res) + 1, ny = Math.ceil(V / res) + 1;
  const g = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) g[j * nx + i] = src(ch, Math.min(U, i * res), Math.min(V, j * res));
  }
  return { g, nx, ny, res };
}

function gridAt(G, u, v) {
  const x = clamp(u / G.res, 0, G.nx - 1.0001), y = clamp(v / G.res, 0, G.ny - 1.0001);
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, nx = G.nx, g = G.g;
  const a = g[j * nx + i], b = g[j * nx + i + 1], c = g[(j + 1) * nx + i], d = g[(j + 1) * nx + i + 1];
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}

let GGX = 0, GGY = 0;
function gridGrad(G, u, v) {
  const e = G.res * 0.5;
  GGX = (gridAt(G, u + e, v) - gridAt(G, u - e, v)) / (2 * e);
  GGY = (gridAt(G, u, v + e) - gridAt(G, u, v - e)) / (2 * e);
}

function gridSlopeRef(G) {
  const m = [];
  for (let j = 1; j < G.ny - 1; j += 2) {
    for (let i = 1; i < G.nx - 1; i += 2) {
      const k = j * G.nx + i;
      m.push(Math.hypot(G.g[k + 1] - G.g[k - 1], G.g[k + G.nx] - G.g[k - G.nx]) / (2 * G.res));
    }
  }
  m.sort((a, b) => a - b);
  return Math.max(1e-6, m.length ? m[Math.floor(0.95 * (m.length - 1))] : 1);
}

// Parallel lines a cell apart at angle a across the chart, `m` cells of room round it for
// how far they are pushed: cb(k, bx, by, dx, dy, nx, ny, t0, t1) for each, the line being
// (bx, by) + t (dx, dy) and (nx, ny) square to it.
function family(ch, a, shift, m, cb) {
  const U = ch.U, V = ch.V, cu = U / 2, cv = V / 2;
  const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  const R = Math.hypot(U, V) / 2 + m + 1;
  const r0 = -m, r1 = U + m, s0 = -m, s1 = V + m;
  for (let k = Math.floor(-R - shift); k <= Math.ceil(R - shift); k++) {
    const o = k + shift;
    const bx = cu + nx * o, by = cv + ny * o;
    let t0 = -Infinity, t1 = Infinity;
    if (Math.abs(dx) < 1e-12) { if (bx < r0 || bx > r1) continue; }
    else {
      const ta = (r0 - bx) / dx, tb = (r1 - bx) / dx;
      t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb));
    }
    if (Math.abs(dy) < 1e-12) { if (by < s0 || by > s1) continue; }
    else {
      const ta = (s0 - by) / dy, tb = (s1 - by) / dy;
      t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb));
    }
    if (!(t1 > t0)) continue;
    cb(k, bx, by, dx, dy, nx, ny, t0, t1);
  }
}

function layLines() {
  const s = settings;
  const npass = passes();
  for (let pass = 0; pass < npass; pass++) {
    const src = sourceFor(pass);
    for (let k = 0; k < CHARTS.length && !LAY_FULL; k++) {
      CUR_CH = k;
      layLinesOn(CHARTS[k], pass, src);
    }
  }
}

function layLinesOn(ch, pass, src) {
  const s = settings;
  const pat = s.pattern;
  const ov = pass === 1;
  const turn = ov ? rad(s.ovTurn) : 0;
  const shiftU = ov ? s.ovShiftU : 0, shiftV = ov ? s.ovShiftV : 0;
  const amp = s.amplitude / 100;
  const lam = Math.max(0.1, s.wavelength);
  const ang = rad(s.lineAngle) + turn;
  const pof = (u, v, h, part) => penOf(ch, u, v, h, Math.floor(u), Math.floor(v), part, pass);

  if (pat === 'lines' || pat === 'waves' || pat === 'squiggle') {
    const step = pat === 'lines' ? 0.25 : pat === 'waves' ? Math.min(0.25, lam / 16)
               : Math.min(0.1, lam / 24);
    family(ch, ang, shiftU, Math.abs(amp) * 0.6 + 0.5, (k, bx, by, dx, dy, nx, ny, t0, t1) => {
      const us = [], vs = [], pens = [];
      let ph = 0;
      for (let t = t0; t <= t1 + 1e-9; t += step) {
        const x = bx + dx * t, y = by + dy * t, h = src(ch, x, y);
        let o;
        if (pat === 'lines') o = (h - 0.5) * amp;
        else if (pat === 'waves') o = Math.sin(2 * Math.PI * t / lam) * h * amp * 0.5;
        else {
          ph += step * 2 * Math.PI / lam * (0.25 + 2.5 * h);
          o = Math.sin(ph) * 0.5 * amp * Math.sqrt(h);
        }
        us.push(x + nx * o); vs.push(y + ny * o); pens.push(pof(x, y, h, k));
      }
      addSplit(us, vs, pens, -1);
    });
    return;
  }

  if (pat === 'tone hatching') {
    const L = Math.max(1, Math.min(4, Math.round(s.detail)));
    const turns = [0, 90, 45, 135];
    for (let lv = 0; lv < L; lv++) {
      const thr = (lv + 1) / (L + 1);
      family(ch, ang + rad(turns[lv]), shiftU + lv * 0.37, 0, (k, bx, by, dx, dy, nx, ny, t0, t1) => {
        const step = 0.2;
        let us = null, vs = null, pens = null, ph = 0, pt = t0;
        const end = () => { if (us && us.length >= 2) addSplit(us, vs, pens, -1); us = vs = pens = null; };
        for (let t = t0; t <= t1 + 1e-9; t += step) {
          const x = bx + dx * t, y = by + dy * t, h = src(ch, x, y);
          if (h > thr) {
            if (!us) {
              // where the line came into the dark, between the last sample and this one
              const f = t > t0 ? clamp((thr - ph) / (h - ph), 0, 1) : 0;
              const tt = t > t0 ? pt + (t - pt) * f : t;
              us = [bx + dx * tt]; vs = [by + dy * tt]; pens = [pof(x, y, h, lv)];
            }
            us.push(x); vs.push(y); pens.push(pof(x, y, h, lv));
          } else if (us) {
            const f = clamp((ph - thr) / (ph - h), 0, 1), tt = pt + (t - pt) * f;
            us.push(bx + dx * tt); vs.push(by + dy * tt); pens.push(pens[pens.length - 1]);
            end();
          }
          ph = h; pt = t;
        }
        end();
      });
    }
    return;
  }

  if (pat === 'ridgelines') {
    // the floating horizon: lines laid from the front of the chart (its bottom) to the
    // back, each lifted by the field and hidden wherever an earlier one stands higher
    const du = 0.12, nu = Math.ceil(ch.U / du) + 1;
    const hor = new Float64Array(nu).fill(Infinity);
    for (let j = 0; ; j++) {
      const v0 = ch.V - (j + 0.5) + shiftV;
      if (v0 < -Math.abs(amp)) break;
      if (v0 > ch.V) continue;
      const ys = new Float64Array(nu), hs = new Float64Array(nu);
      for (let i = 0; i < nu; i++) {
        const u = Math.min(ch.U, i * du);
        const h = v0 >= 0 ? src(ch, u, v0) : 0;
        hs[i] = h; ys[i] = v0 - h * amp;
      }
      let us = null, vs = null, pens = null;
      const end = () => { if (us && us.length >= 2) addSplit(us, vs, pens, -1); us = vs = pens = null; };
      for (let i = 0; i < nu; i++) {
        const u = Math.min(ch.U, i * du);
        const show = ys[i] <= hor[i] - 1e-6;
        if (show) {
          if (!us) {
            us = []; vs = []; pens = [];
            if (i > 0 && Number.isFinite(hor[i - 1])) {
              // where it rose over the horizon
              const a = ys[i - 1] - hor[i - 1], b = ys[i] - hor[i], f = clamp(a / (a - b), 0, 1);
              us.push(u - du + du * f); vs.push(ys[i - 1] + (ys[i] - ys[i - 1]) * f);
              pens.push(pof(u, v0, hs[i], j));
            }
          }
          us.push(u); vs.push(ys[i]); pens.push(pof(u, v0, hs[i], j));
        } else if (us) {
          const a = ys[i - 1] - hor[i - 1], b = ys[i] - hor[i];
          const f = Number.isFinite(a) ? clamp(a / (a - b), 0, 1) : 0;
          us.push(u - du + du * f); vs.push(ys[i - 1] + (ys[i] - ys[i - 1]) * f);
          pens.push(pens[pens.length - 1]);
          end();
        }
      }
      end();
      for (let i = 0; i < nu; i++) if (ys[i] < hor[i]) hor[i] = ys[i];
      if (LAY_FULL) return;
    }
    return;
  }

  if (pat === 'spiral' || pat === 'concentric') {
    const cu = ch.U / 2 + shiftU, cv = ch.V / 2 + shiftV;
    const R = Math.hypot(Math.max(cu, ch.U - cu), Math.max(cv, ch.V - cv)) + Math.abs(amp) + 1;
    const inside = (u, v) => u >= -1 && u <= ch.U + 1 && v >= -1 && v <= ch.V + 1;
    if (pat === 'spiral') {
      const us = [], vs = [], pens = [];
      let th = 0, sLen = 0;
      while (th / (2 * Math.PI) < R) {
        const r = th / (2 * Math.PI) + 0.25;
        const x = cu + r * Math.cos(th + turn), y = cv + r * Math.sin(th + turn);
        const h = inside(x, y) ? src(ch, clamp(x, 0, ch.U), clamp(y, 0, ch.V)) : 0;
        const o = Math.sin(2 * Math.PI * sLen / lam) * h * amp * 0.5;
        us.push(cu + (r + o) * Math.cos(th + turn)); vs.push(cv + (r + o) * Math.sin(th + turn));
        pens.push(pof(x, y, h, 0));
        const dth = Math.min(0.3, 0.12 / r);
        th += dth; sLen += r * dth;
      }
      addSplit(us, vs, pens, -1);
    } else {
      for (let k = 1; k <= R; k++) {
        const m = Math.max(24, Math.ceil(2 * Math.PI * k / 0.15));
        const us = [], vs = [], pens = [];
        for (let i = 0; i <= m; i++) {
          const t = 2 * Math.PI * i / m + turn;
          const x = cu + k * Math.cos(t), y = cv + k * Math.sin(t);
          const h = inside(x, y) ? src(ch, clamp(x, 0, ch.U), clamp(y, 0, ch.V)) : 0.5;
          const r = k + (h - 0.5) * amp;
          us.push(cu + r * Math.cos(t)); vs.push(cv + r * Math.sin(t)); pens.push(pof(x, y, h, k));
        }
        addSplit(us, vs, pens, -1);
      }
    }
    return;
  }

  const G = chartGrid(ch, 0.4, src);

  if (pat === 'contours') {
    const L = Math.max(1, Math.round(s.detail));
    for (let k = 0; k < L; k++) {
      const lev = (k + 0.5) / L;
      for (const [us, vs] of isolines(G, lev)) {
        const pens = us.map((u, i) => pof(u, vs[i], lev, k));
        addSplit(us, vs, pens, -1);
      }
    }
    return;
  }

  if (pat === 'flow') {
    layFlow(ch, G, pass, shiftU, shiftV, turn, pof);
    return;
  }

  if (pat === 'warped grid') {
    const gRef = gridSlopeRef(G);
    const oa = rad(s.offsetAngle);
    const push = (u, v) => {
      const h = gridAt(G, u, v);
      if (s.offsetBy === 'slope') {
        gridGrad(G, u, v);
        const m = Math.min(2, Math.hypot(GGX, GGY) / gRef), a = Math.atan2(GGY, GGX);
        return [u + amp * m * Math.cos(a) * 0.5, v + amp * m * Math.sin(a) * 0.5, h];
      }
      return [u + amp * h * Math.cos(oa), v + amp * h * Math.sin(oa), h];
    };
    for (let dir = 0; dir < 2; dir++) {
      const along = dir === 0 ? ch.U : ch.V, across = dir === 0 ? ch.V : ch.U;
      const sh = dir === 0 ? shiftV : shiftU;
      const off = ((across - Math.floor(across)) / 2 + sh) % 1;
      for (let k = 0; off + k <= across; k++) {
        const c = off + k, us = [], vs = [], pens = [];
        for (let t = 0; t <= along + 1e-9; t += 0.2) {
          const [x, y, h] = dir === 0 ? push(t, c) : push(c, t);
          us.push(x); vs.push(y);
          pens.push(pof(dir === 0 ? t : c, dir === 0 ? c : t, h, dir));
        }
        addSplit(us, vs, pens, -1);
      }
    }
  }
}

// Marching squares at one level over a grid, the pieces strung into lines. A crossing is
// named by the edge of the grid it lies on, so two cells that share an edge share the
// point exactly and the pieces join by name, with no tolerance.
function isolines(G, lev) {
  const { g, nx, ny, res } = G;
  const segA = [], segB = [];
  const eid = (i, j, vert) => 2 * (j * nx + i) + vert;
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = g[j * nx + i] - lev, b = g[j * nx + i + 1] - lev;
      const c = g[(j + 1) * nx + i + 1] - lev, d = g[(j + 1) * nx + i] - lev;
      const code = (a > 0 ? 1 : 0) | (b > 0 ? 2 : 0) | (c > 0 ? 4 : 0) | (d > 0 ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const top = eid(i, j, 0), right = eid(i + 1, j, 1), bottom = eid(i, j + 1, 0), left = eid(i, j, 1);
      const add = (p, q) => { segA.push(p); segB.push(q); };
      switch (code) {
        case 1: case 14: add(left, top); break;
        case 2: case 13: add(top, right); break;
        case 3: case 12: add(left, right); break;
        case 4: case 11: add(right, bottom); break;
        case 6: case 9:  add(top, bottom); break;
        case 7: case 8:  add(left, bottom); break;
        case 5: case 10: {
          const mid = (a + b + c + d) / 4 > 0;
          if ((code === 5) === mid) { add(left, bottom); add(top, right); }
          else { add(left, top); add(right, bottom); }
          break;
        }
      }
    }
  }
  const point = id => {
    const vert = id & 1, k = id >> 1, i = k % nx, j = (k - i) / nx;
    const i2 = vert ? i : i + 1, j2 = vert ? j + 1 : j;
    const p = g[j * nx + i] - lev, q = g[j2 * nx + i2] - lev;
    const t = p === q ? 0.5 : p / (p - q);
    return [(i + (i2 - i) * t) * res, (j + (j2 - j) * t) * res];
  };
  const at = new Map();
  for (let s = 0; s < segA.length; s++) {
    for (const e of [segA[s], segB[s]]) {
      const l = at.get(e);
      if (l) l.push(s); else at.set(e, [s]);
    }
  }
  const used = new Uint8Array(segA.length), out = [];
  const walk = (s, from, ids) => {
    for (;;) {
      used[s] = 1;
      const to = segA[s] === from ? segB[s] : segA[s];
      ids.push(to);
      const l = at.get(to);
      let nxt = -1;
      if (l) for (const t of l) if (!used[t]) { nxt = t; break; }
      if (nxt < 0) return;
      s = nxt; from = to;
    }
  };
  for (let s = 0; s < segA.length; s++) {
    if (used[s]) continue;
    const fwd = [segA[s]];
    walk(s, segA[s], fwd);
    // and backwards from where it started, unless it closed on itself
    const back = [];
    const l = at.get(segA[s]);
    if (fwd[fwd.length - 1] !== segA[s] && l) {
      for (const t of l) if (!used[t]) { walk(t, segA[s], back); break; }
    }
    const ids = back.reverse().concat(fwd);
    const us = [], vs = [];
    for (const id of ids) { const [u, v] = point(id); us.push(u); vs.push(v); }
    out.push([us, vs]);
  }
  return out;
}

// Streamlines a cell apart, after Jobard and Lefer: from seeds on a grid, each line runs
// both ways along the field — up its slope, or turned to run round it — until it leaves
// the chart, stalls on flat ground, or comes within half a cell of a line already drawn.
function layFlow(ch, G, pass, shiftU, shiftV, turn, pof) {
  const s = settings;
  const sep = 1, test = 0.5 * sep, step = 0.18;
  const rot = rad(s.rotation) + turn, cr = Math.cos(rot), sr = Math.sin(rot);
  const cs = test, gw = Math.ceil(ch.U / cs) + 1, gh = Math.ceil(ch.V / cs) + 1;
  const occ = new Map();                         // cell -> [u, v, line, step, ...]
  const gRef = gridSlopeRef(G);
  let DX = 0, DY = 0;
  const dir = (u, v) => {
    gridGrad(G, u, v);
    const l = Math.hypot(GGX, GGY);
    if (l < gRef * 0.02) return false;
    const x = GGX / l, y = GGY / l;
    DX = x * cr - y * sr; DY = x * sr + y * cr;
    return true;
  };
  const free = (u, v, line, stepNo) => {
    const ci = Math.floor(u / cs), cj = Math.floor(v / cs);
    for (let j = cj - 1; j <= cj + 1; j++) {
      for (let i = ci - 1; i <= ci + 1; i++) {
        const l = occ.get(j * gw + i);
        if (!l) continue;
        for (let k = 0; k < l.length; k += 4) {
          if (l[k + 2] === line && Math.abs(l[k + 3] - stepNo) < 12) continue;
          if ((l[k] - u) ** 2 + (l[k + 1] - v) ** 2 < test * test) return false;
        }
      }
    }
    return true;
  };
  // A line is marked as it is traced, so that it sees itself — a line running round a
  // hill closes on its own start instead of circling it for ever — and its last dozen
  // steps are not counted against it. A line too short to keep is taken out again.
  let touched = [];
  const mark = (u, v, line, stepNo) => {
    const key = Math.floor(v / cs) * gw + Math.floor(u / cs);
    const l = occ.get(key);
    if (l) l.push(u, v, line, stepNo); else occ.set(key, [u, v, line, stepNo]);
    touched.push(key);
  };
  const unmark = line => {
    for (const key of touched) {
      const l = occ.get(key);
      if (!l) continue;
      const keep = [];
      for (let k = 0; k < l.length; k += 4) if (l[k + 2] !== line) keep.push(l[k], l[k + 1], l[k + 2], l[k + 3]);
      if (keep.length) occ.set(key, keep); else occ.delete(key);
    }
  };
  let lineNo = 0;
  const trace = (u, v, sign, line) => {
    const us = [], vs = [];
    for (let n = 1; n < 3000; n++) {
      if (!dir(u, v)) break;
      const mu = u + sign * DX * step * 0.5, mv = v + sign * DY * step * 0.5;
      if (!dir(mu, mv)) break;
      u += sign * DX * step; v += sign * DY * step;
      if (u < 0 || u > ch.U || v < 0 || v > ch.V) break;
      if (!free(u, v, line, sign * n)) break;
      mark(u, v, line, sign * n);
      us.push(u); vs.push(v);
    }
    return [us, vs];
  };
  const ou = ((shiftU % sep) + sep) % sep, ov = ((shiftV % sep) + sep) % sep;
  for (let j = 0; ov + j * sep <= ch.V; j++) {
    for (let i = 0; ou + i * sep <= ch.U; i++) {
      const u0 = ou + (i + 0.5) * sep, v0 = ov + (j + 0.5) * sep;
      if (u0 > ch.U || v0 > ch.V) continue;
      const line = lineNo++;
      if (!free(u0, v0, -1, 0)) continue;
      touched = [];
      mark(u0, v0, line, 0);
      const [fu, fv] = trace(u0, v0, 1, line);
      const [bu, bv] = trace(u0, v0, -1, line);
      const us = bu.reverse().concat([u0], fu), vs = bv.reverse().concat([v0], fv);
      if (us.length * step < 1.5 * sep) { unmark(line); continue; }
      const pens = us.map((u, k) => pof(u, vs[k], gridAt(G, u, vs[k]), line));
      addSplit(us, vs, pens, -1);
      if (LAY_FULL) return;
    }
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// From the charts onto the sheet
//
// Every item is walked onto the paper; a mark that would come out smaller than
// `thinBelow` there is left out whole — on a surface that is what keeps the marks seen
// edge on near the outline, or far off down a corridor, from piling up into a blot.
// Then the outline: the rim of the ball, or the edges of the box that show.

function markShows(e) {
  const ch = CHARTS[EL_CH[e]], u = EL_U[e], v = EL_V[e], r = EL_R[e];
  if (!chartOnPaper(ch, u, v)) return true;          // the walk will decide
  const x0 = EX, y0 = EY;
  if (!chartOnPaper(ch, u + r, v)) return true;
  const a = Math.hypot(EX - x0, EY - y0);
  if (!chartOnPaper(ch, u, v + r)) return true;
  const b = Math.hypot(EX - x0, EY - y0);
  return 2 * Math.sqrt(a * b) >= settings.thinBelow;
}

function outlinePen() { return twoPens() ? clamp(Math.round(settings.outlinePen), 1, 2) - 1 : 0; }

function layOutline(sink) {
  const s = settings, pen = outlinePen();
  if (s.surface === 'sphere') {
    if (VMODE === 3) return;
    const n = 360, pts = [];
    const c = PERSP ? 1 / DIST : 0, r = PERSP ? Math.sqrt(1 - c * c) : 1;
    for (let i = 0; i < n; i++) {
      const t = 2 * Math.PI * i / n, a = r * Math.cos(t), b = r * Math.sin(t);
      pts.push([CDX * c + CRX * a + CUX * b, CDY * c + CRY * a + CUY * b, CDZ * c + CRZ * a + CUZ * b]);
    }
    walkSpace(pts, true, sink, pen, 1);
    return;
  }
  // the box: an edge is drawn when either face along it shows
  const shows = f => {
    if (VMODE === 3) return true;
    const d = PERSP ? f[0] * EYX + f[1] * EYY + f[2] * EYZ - 1 : f[0] * CDX + f[1] * CDY + f[2] * CDZ;
    return VMODE === 1 ? d > 0 : d < 0;
  };
  for (let ax = 0; ax < 3; ax++) {
    const b1 = (ax + 1) % 3, b2 = (ax + 2) % 3;
    for (const s1 of [-1, 1]) {
      for (const s2 of [-1, 1]) {
        const f1 = [0, 0, 0], f2 = [0, 0, 0];
        f1[b1] = s1; f2[b2] = s2;
        if (!shows(f1) && !shows(f2)) continue;
        const a = [0, 0, 0], b = [0, 0, 0];
        a[ax] = -1; b[ax] = 1; a[b1] = b[b1] = s1; a[b2] = b[b2] = s2;
        walkSpace([a, b], false, sink, pen, 1);
      }
    }
  }
}

function buildShapes() {
  const s = settings;
  SAG2 = (FAST ? 0.08 : SAG) ** 2;
  SEG2 = (FAST ? 6 : SEG_MAX) ** 2;
  perPen = [{ strokes: 0, ink: 0 }, { strokes: 0, ink: 0 }];
  const sink = makeSink();
  const I = ITEMS;
  const thin = new Uint8Array(EL_CH.length);
  let thinned = 0;
  const one = !twoPens();

  for (let it = 0; it < I.n; it++) {
    const e = I.el[it];
    if (e >= 0 && s.thinBelow > 0) {
      if (!thin[e]) {
        thin[e] = markShows(e) ? 1 : 2;
        if (thin[e] === 2) thinned++;
      }
      if (thin[e] === 2) continue;
    }
    const a = I.off[it], b = I.off[it + 1];
    walkLine(CHARTS[I.ch[it]], I.u.subarray(a, b), I.v.subarray(a, b), b - a, sink,
             one ? 0 : I.pen[it], 0);
    if (sink.ink.length > MAX_STROKES) break;
  }
  if (!FLAT && s.outline) layOutline(sink);

  for (let i = 0; i < sink.ink.length; i++) if (perPen[sink.ink[i]]) perPen[sink.ink[i]].strokes++;
  counts = { marks: I.marks, thinned, items: I.n, full: I.full };
  return {
    pts: Float64Array.from(sink.pts),
    off: Int32Array.from(sink.off),
    ink: Int32Array.from(sink.ink),
    lay: Int32Array.from(sink.lay),
  };
}

////////////////////////////////////////////////////////////////////////////////////////
// Sinks and clipping

function makeSink() {
  const pts = [], off = [0], ink = [], lay = [];
  return {
    pts, off, ink, lay,
    run(xs, ys, n, id, layer) {
      if (n < 2) return;
      for (let i = 0; i < n; i++) pts.push(xs[i], ys[i]);
      off.push(pts.length / 2);
      ink.push(id);
      lay.push(layer);
    },
  };
}

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

function clipRuns(px, py, n, out) {
  if (n < 2) return;
  let allIn = true;
  for (let i = 0; i < n; i++) {
    if (!insideArea(px[i], py[i])) { allIn = false; break; }
  }
  if (allIn) { out.push([px, py]); return; }
  let rx = null, ry = null;
  const flush = () => { if (rx && rx.length >= 2) out.push([rx, ry]); rx = ry = null; };
  for (let i = 0; i + 1 < n; i++) {
    if (!clipSeg(px[i], py[i], px[i + 1], py[i + 1])) { flush(); continue; }
    const ax = CLIP_OUT[0], ay = CLIP_OUT[1], bx = CLIP_OUT[2], by = CLIP_OUT[3];
    if (rx && Math.abs(rx[rx.length - 1] - ax) < 1e-9 && Math.abs(ry[ry.length - 1] - ay) < 1e-9) {
      rx.push(bx); ry.push(by);
    } else {
      flush();
      rx = [ax, bx]; ry = [ay, by];
    }
  }
  flush();
}

////////////////////////////////////////////////////////////////////////////////////////
// Stroke order
//
// Greedy nearest-neighbour over stroke endpoints, either end allowed as the entry point,
// with a uniform bucket grid so the search stays local; one pen at a time, black first.
// vpype's linesort would redo it regardless, so it is here to make the estimate honest
// and the preview readable.

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
    ex[i * 2] = pts[a];         ey[i * 2] = pts[a + 1];
    ex[i * 2 + 1] = pts[b];     ey[i * 2 + 1] = pts[b + 1];
  }
  for (let e = 0; e < N; e++) {
    if (ex[e] < minx) minx = ex[e];
    if (ex[e] > maxx) maxx = ex[e];
    if (ey[e] < miny) miny = ey[e];
    if (ey[e] > maxy) maxy = ey[e];
  }
  const w = Math.max(maxx - minx, 1e-6), h = Math.max(maxy - miny, 1e-6);
  const cell = Math.max(1e-3, Math.sqrt(w * h / N) * 1.5, Math.max(w, h) / 1024);
  const gw = Math.floor(w / cell) + 1, gh = Math.floor(h / cell) + 1, nb = gw * gh;
  const eb = new Int32Array(N);
  for (let e = 0; e < N; e++) {
    const cx = Math.min(gw - 1, (ex[e] - minx) / cell | 0);
    const cy = Math.min(gh - 1, (ey[e] - miny) / cell | 0);
    eb[e] = cy * gw + cx;
  }
  const start = new Int32Array(nb + 1);
  for (let e = 0; e < N; e++) start[eb[e] + 1]++;
  for (let k = 0; k < nb; k++) start[k + 1] += start[k];
  const items = new Int32Array(N);
  const cursor = start.slice(0, nb);
  for (let e = 0; e < N; e++) items[cursor[eb[e]]++] = e;
  const left = new Int32Array(nb);
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
      const dx = ex[e] - px, dy = ey[e] - py, d = dx * dx + dy * dy;
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
    if (best < 0) {
      for (let e = 0; e < N; e++) {
        if (used[e >> 1]) continue;
        const dx = ex[e] - px, dy = ey[e] - py, d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = e; }
      }
    }
    const i = best >> 1;
    used[i] = 1;
    left[eb[i * 2]]--;
    left[eb[i * 2 + 1]]--;
    order[done] = ids[i];
    flip[done] = best & 1;
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
    const id = sh.ink[i], a = byInk.get(id);
    if (a) a.push(i); else byInk.set(id, [i]);
  }
  const ids = [...byInk.keys()].sort((a, b) => a - b);
  let px = 0, py = 0, at = 0;
  for (const id of ids) {
    const list = byInk.get(id);
    if (settings.optimiseOrder && !FAST) {
      const g = greedy(sh, list, px, py);
      for (let t = 0; t < g.order.length; t++) { order[at] = g.order[t]; flip[at++] = g.flip[t]; }
      px = g.px; py = g.py;
    } else {
      for (const i of list) { order[at] = i; flip[at++] = 0; }
    }
  }
  return { order, flip, ...measurePlan(sh, order, flip) };
}

function measurePlan(sh, order, flip) {
  const { pts, off } = sh;
  let ink = 0, travel = 0, px = 0, py = 0;
  for (let t = 0; t < order.length; t++) {
    const i = order[t], rev = flip[t] === 1;
    const a = off[i], b = off[i + 1];
    const inA = rev ? b - 1 : a, inB = rev ? a : b - 1;
    travel += Math.hypot(pts[inA * 2] - px, pts[inA * 2 + 1] - py);
    let run = 0;
    for (let k = a; k < b - 1; k++) {
      run += Math.hypot(pts[(k + 1) * 2] - pts[k * 2], pts[(k + 1) * 2 + 1] - pts[k * 2 + 1]);
    }
    ink += run;
    const id = sh.ink[i];
    if (perPen && perPen[id]) perPen[id].ink += run;
    px = pts[inB * 2];
    py = pts[inB * 2 + 1];
  }
  return { ink, travel };
}

////////////////////////////////////////////////////////////////////////////////////////
// Preview

function inkColor(id) { return id === 1 ? settings.ink1 : settings.ink0; }

function drawPreview() {
  const ctx = drawingContext;
  ctx.save();
  drawSheet(ctx, previewScale());
  ctx.restore();
}

function drawSheet(ctx, s) {
  const [W, H] = paperDims();
  ctx.fillStyle = settings.paperColor;
  ctx.fillRect(0, 0, W * s, H * s);
  if (shapes && plan) drawStrokes(ctx, s);
}

function drawStrokes(ctx, s) {
  const { pts, off } = shapes;
  const { order } = plan;
  ctx.save();
  ctx.scale(s, s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = settings.penWidth;
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

////////////////////////////////////////////////////////////////////////////////////////
// The mouse and the keys
//
// On a surface a drag turns the camera and the wheel zooms; on a flat sheet a drag slides
// the field under the pattern and the wheel makes it larger or smaller. Shift-drag, or a
// right-drag, pans the drawing on the sheet.

function paperDelta(e, from) {
  const c = canvasEl(), r = c.getBoundingClientRect();
  const [W] = paperDims();
  const k = W / r.width;
  return [(e.clientX - from[0]) * k, (e.clientY - from[1]) * k, e.clientX - from[0], e.clientY - from[1]];
}

let settleTimer = null;

function settle() {
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => { settleTimer = null; update(); }, 250);
}

function attachPointer() {
  const c = canvasEl();
  c.addEventListener('contextmenu', e => e.preventDefault());
  c.addEventListener('pointerdown', e => {
    const s = settings;
    drag = {
      at: [e.clientX, e.clientY], pan: e.shiftKey || e.button === 2,
      az: s.azimuth, el: s.elevation, px: s.panX, py: s.panY, fx: s.fieldX, fy: s.fieldY,
      moved: false,
    };
    c.setPointerCapture(e.pointerId);
    c.classList.add('dragging');
  });
  c.addEventListener('pointermove', e => {
    if (!drag) return;
    const s = settings;
    const [dxm, dym, dxp, dyp] = paperDelta(e, drag.at);
    if (Math.abs(dxp) + Math.abs(dyp) > 2) drag.moved = true;
    if (!drag.moved) return;
    if (drag.pan) {
      s.panX = +(drag.px + dxm).toFixed(2); s.panY = +(drag.py + dym).toFixed(2);
      if (FLAT) { s.panX = drag.px; s.panY = drag.py; }
    } else if (FLAT) {
      s.fieldX = +(drag.fx - dxm / DOM.R).toFixed(4);
      s.fieldY = +(drag.fy - dym / DOM.R).toFixed(4);
    } else {
      s.azimuth = +wrapDeg(drag.az - dxp * DRAG_DEG_PX).toFixed(1);
      s.elevation = +clamp(drag.el + dyp * DRAG_DEG_PX, -89.9, 89.9).toFixed(1);
    }
    for (const k of ['panX', 'panY', 'fieldX', 'fieldY', 'azimuth', 'elevation']) {
      if (setters[k]) setters[k](s[k]);
    }
    liveUpdate();
  });
  const end = e => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    c.classList.remove('dragging');
    try { c.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
    if (moved) update();
  };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', end);
  c.addEventListener('wheel', e => {
    e.preventDefault();
    const s = settings, f = Math.exp(-e.deltaY * WHEEL_ZOOM);
    if (FLAT) {
      s.scale = +clamp(s.scale / f, 0.05, 40).toFixed(3);
      if (setters.scale) setters.scale(s.scale);
    } else {
      s.zoom = +clamp(s.zoom * f, 10, 1000).toFixed(1);
      if (setters.zoom) setters.zoom(s.zoom);
    }
    liveUpdate();
    settle();
  }, { passive: false });
}

function attachKeys() {
  window.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable ||
        (t.tagName === 'INPUT' && !['checkbox', 'button', 'color', 'range'].includes(t.type)))) return;
    if (e.metaKey || e.ctrlKey || e.altKey || drag) return;
    const s = settings, step = e.shiftKey ? 10 : 1;
    const turn = (da, de) => {
      s.azimuth = wrapDeg(s.azimuth + da);
      s.elevation = clamp(+(s.elevation + de).toFixed(2), -89.9, 89.9);
      refreshControls();
      update();
    };
    const cycle = (key, list, dir) => {
      s[key] = list[(list.indexOf(s[key]) + dir + list.length) % list.length];
      refreshControls();
      update();
    };
    switch (e.key) {
      case 'ArrowLeft':  turn(step, 0); break;
      case 'ArrowRight': turn(-step, 0); break;
      case 'ArrowUp':    turn(0, -step); break;
      case 'ArrowDown':  turn(0, step); break;
      case 'r': case 'R': s.seed = Math.floor(Math.random() * 100000); refreshControls(); update(); break;
      case '[': s.seed = Math.max(0, Math.round(s.seed) - 1); refreshControls(); update(); break;
      case ']': s.seed = Math.round(s.seed) + 1; refreshControls(); update(); break;
      case '+': case '=': s.zoom = clamp(s.zoom * 1.25, 10, 1000); refreshControls(); update(); break;
      case '-': case '_': s.zoom = clamp(s.zoom / 1.25, 10, 1000); refreshControls(); update(); break;
      case '0': s.zoom = 100; s.panX = s.panY = 0; refreshControls(); update(); break;
      case 'p': case 'P': cycle('projection', PROJECTIONS, 1); break;
      case 'x': cycle('pattern', PATTERNS, 1); break;
      case 'X': cycle('pattern', PATTERNS, -1); break;
      case 'h': cycle('field', FIELDS, 1); break;
      case 'H': cycle('field', FIELDS, -1); break;
      case 's': case 'S': cycle('surface', SURFACES, 1); break;
      case 'c': case 'C': cycle('colours', COLOURS, 1); break;
      default: return;
    }
    e.preventDefault();
  });
}

////////////////////////////////////////////////////////////////////////////////////////
// Controls

function addSection(parent, title) { createDiv(title).parent(parent).class('section'); }
function addSub(parent, title) { createDiv(title).parent(parent).class('sub'); }

function setVisible(key, on) {
  if (fieldDivs[key]) fieldDivs[key].style('display', on ? '' : 'none');
}

function syncVisibility() {
  const s = settings;
  const flat = s.surface === 'flat', cellPat = isCellPattern(), pat = s.pattern;
  const fib = !flat && s.surface === 'sphere' && sphereMap() === 'fibonacci';
  const inside = s.side === 'inside, camera in';

  setVisible('orientation', s.paper !== 'custom');
  setVisible('customW', s.paper === 'custom');
  setVisible('customH', s.paper === 'custom');

  // the field
  const f = s.field;
  const noisy = ['perlin', 'ridged', 'warped', 'marble'].includes(f);
  setVisible('octaves', noisy);
  setVisible('rough', noisy);
  setVisible('count', ['waves', 'plasma', 'metaballs', 'spiral'].includes(f) ||
    (needsSecond() && ['waves', 'plasma', 'metaballs', 'spiral'].includes(s.field2)));
  setVisible('angle', ['gradient', 'marble'].includes(f));
  setVisible('julia', f === 'julia' || (needsSecond() && s.field2 === 'julia'));
  setVisible('rdKind', f === 'reaction-diffusion' || (needsSecond() && s.field2 === 'reaction-diffusion'));
  setVisible('imageLoad', f === 'image' || (needsSecond() && s.field2 === 'image'));
  setVisible('warpScale', s.warp !== 0);
  setVisible('scale2', needsSecond());
  setVisible('field2', true);
  setVisible('blendAmt', s.blend !== 'none');

  // the pattern
  setVisible('grid', cellPat && !SQUARE_ONLY.includes(pat) && !fib);
  setVisible('jitter', cellPat && s.grid === 'jittered' && !fib);
  setVisible('cell', flat);
  setVisible('cells3d', !flat);
  const sized = cellPat && !SQUARE_ONLY.includes(pat);
  setVisible('sizeMin', sized);
  setVisible('sizeMax', sized);
  setVisible('skipBelow', cellPat);
  setVisible('offset', sized);
  setVisible('offsetBy', (sized && s.offset !== 0) || pat === 'warped grid');
  setVisible('offsetAngle', ((sized && s.offset !== 0) || pat === 'warped grid') && s.offsetBy === 'height');
  setVisible('rotation', (sized && pat !== 'circles' && pat !== 'rings' && pat !== 'dots') || pat === 'flow');
  setVisible('rotateBy', sized && !['circles', 'rings', 'dots', 'ellipses'].includes(pat));
  setVisible('rotSpan', sized && s.rotateBy === 'height');
  setVisible('detail', ['rings', 'nested squares', 'hatched cells', 'spirals', 'stars', 'flowers',
    'truchet', '10 print', 'dots', 'contours', 'tone hatching'].includes(pat));
  setVisible('sides', pat === 'polygons');
  setVisible('amplitude', ['lines', 'waves', 'squiggle', 'ridgelines', 'spiral', 'concentric',
    'warped grid'].includes(pat));
  setVisible('wavelength', ['waves', 'squiggle', 'spiral'].includes(pat));
  setVisible('lineAngle', ['lines', 'waves', 'squiggle', 'tone hatching'].includes(pat));

  // the surface
  for (const k of ['side', 'azimuth', 'elevation', 'roll', 'zoom', 'panX', 'panY', 'thinBelow',
                   'outline']) setVisible(k, !flat);
  setVisible('thinBelow', true);
  setVisible('sphereMap', s.surface === 'sphere');
  setVisible('projection', !flat && !inside);
  setVisible('distance', !flat && !inside && s.projection === 'perspective');
  for (const k of ['lens', 'fov', 'camX', 'camY', 'camZ']) setVisible(k, !flat && inside);

  // the pens
  const two = twoPens();
  setVisible('split', two);
  setVisible('splitAt', two && ['height', 'second field'].includes(s.split));
  for (const k of ['ovShiftU', 'ovShiftV', 'ovTurn', 'ovSource']) setVisible(k, two && s.split === 'overlay');
  setVisible('outlinePen', two && !flat && s.outline);
  setVisible('ink1', two);
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

function addSlider(parent, labelText, key, min, max, step, hint, onChange) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const row = createDiv('').parent(field).class('row');
  const sl  = createSlider(min, max, settings[key], step).parent(row);
  const num = createInput(String(settings[key])).parent(row);
  num.attribute('type', 'text');
  num.attribute('inputmode', 'decimal');
  if (hint) createDiv(hint).parent(field).class('note');
  const done = onChange || update;
  setters[key] = v => { sl.value(v); num.value(String(v)); };
  sl.input(() => {
    settings[key] = Number(sl.value());
    num.value(String(settings[key]));
    if (settings.liveUpdate && !onChange) liveUpdate();
  });
  sl.changed(() => done());
  num.input(() => {
    const v = parseNum(num.value());
    if (v === null) return;
    settings[key] = clamp(v, min, max);
    sl.value(settings[key]);
    done();
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
  sel.changed(() => { settings[key] = sel.value(); (onChange || update)(); });
  return sel;
}

function addCheckbox(parent, labelText, key) {
  const row = createDiv('').parent(parent).class('checkbox-row');
  fieldDivs[key] = row;
  const cb = createCheckbox(labelText, settings[key]).parent(row);
  setters[key] = v => cb.checked(!!v);
  cb.changed(() => { settings[key] = cb.checked(); update(); });
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
  createDiv('The noise, where the sources and blobs sit, the reaction\'s first drops, the ' +
    'jitter and the coin each truchet tile is turned by. <b>R</b> rolls a new one, ' +
    '<b>[</b> and <b>]</b> step through them.').parent(field).class('note');
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
  const resync = () => { syncVisibility(); update(); };

  addSection(root, 'Scene');
  const sceneSel = createSelect().parent(createDiv('').parent(root).class('field'));
  for (const sc of SCENES) sceneSel.option(sc.label);
  sceneSel.changed(() => {
    const sc = SCENES[sceneSel.elt.selectedIndex];
    if (sc && sc.s) applyScene(sc);
    sceneSel.elt.selectedIndex = 0;
  });

  // --- the pattern ---
  addSection(root, 'Pattern');
  addSelect(root, 'Pattern', 'pattern', PATTERNS, resync,
    'The first fifteen are <b>marks</b>, one to a cell, sized by the height; the rest are ' +
    '<b>lines</b> running across the whole sheet and bent by it. <b>X</b> steps through them.');
  addSelect(root, 'Grid', 'grid', GRIDS, resync,
    '<b>hex</b> — rows half a cell over; <b>radial</b> — rings round the middle; ' +
    '<b>jittered</b> — the square grid shaken; <b>poisson</b> — scattered evenly, no rows.');
  addSlider(root, 'Jitter (% of a cell)', 'jitter', 0, 100, 1);
  addSlider(root, 'Cell (mm)', 'cell', 0.5, 30, 0.1,
    'A cell of the grid, or the gap between two lines, on the paper.');
  addSlider(root, 'Cells across a face', 'cells3d', 3, 120, 1,
    'Cells across one face of the box, or across a quarter of the way round the ball.');
  addSlider(root, 'Size at the lowest (% of a cell)', 'sizeMin', 0, 300, 1);
  addSlider(root, 'Size at the highest (% of a cell)', 'sizeMax', 0, 300, 1,
    'Past 100 the marks overlap their neighbours, and the overlaps crowd into the dark ' +
    'knots of the picture this started from.');
  addSlider(root, 'Nothing below (% of the height)', 'skipBelow', 0, 100, 1,
    'Cells lower than this are left empty.');
  addSlider(root, 'Slip (% of a cell)', 'offset', -300, 300, 1,
    'How far a mark slips off its place in the grid — what turns a grid into a moiré.');
  addSelect(root, 'Slip by', 'offsetBy', OFFSETS, resync,
    '<b>height</b> — by how high the field is, all one way; <b>slope</b> — down… up the ' +
    'slope of the field, by how steep it is.');
  addSlider(root, 'Slip towards (°)', 'offsetAngle', -180, 180, 1);
  addSlider(root, 'Turn (°)', 'rotation', -180, 180, 1);
  addSelect(root, 'Turn by', 'rotateBy', ROTATIONS, resync,
    '<b>slope</b> — every mark turned to face up the slope; <b>height</b> — turned by how ' +
    'high it is.');
  addSlider(root, 'Turn at the highest (°)', 'rotSpan', -720, 720, 1);
  addSlider(root, 'Detail', 'detail', 1, 40, 1,
    'Rings, squares, lines or turns of a mark at the highest; spikes or petals; strands ' +
    'of a truchet tile; dots to a cell; contour levels; levels of tone hatching (up to 4).');
  addSlider(root, 'Sides', 'sides', 3, 12, 1);
  addSlider(root, 'Push (% of a cell)', 'amplitude', -2000, 2000, 1,
    'How far a line is pushed aside, or how high it waves, at the highest of the field.');
  addSlider(root, 'Wavelength (cells)', 'wavelength', 0.2, 20, 0.1);
  addSlider(root, 'Lines at (°)', 'lineAngle', -90, 90, 1);

  // --- the height map ---
  addSection(root, 'Height map');
  addSeedField(root);
  addSelect(root, 'Field', 'field', FIELDS, resync,
    '<b>perlin</b>, <b>ridged</b>, <b>warped</b> (noise read where noise pushed it), ' +
    '<b>marble</b>; <b>worley</b> — distance to scattered points, <b>cracks</b> — the walls ' +
    'between them, <b>mosaic</b> — a value a cell; <b>waves</b> from a few sources; ' +
    '<b>plasma</b>; <b>metaballs</b>; <b>gyroid</b>, <b>egg crate</b>; <b>rings</b>, ' +
    '<b>spiral</b>, <b>gradient</b>; <b>julia</b>; <b>reaction-diffusion</b>; an ' +
    '<b>image</b> from disk. <b>H</b> steps through them.');
  addSlider(root, 'Scale', 'scale', 0.05, 20, 0.01,
    'How many features across the sheet or the ball — the wheel changes it on a flat sheet.');
  addSlider(root, 'Octaves', 'octaves', 1, 8, 1);
  addSlider(root, 'Roughness (%)', 'rough', 5, 95, 1);
  addSlider(root, 'Sources, blobs, arms', 'count', 1, 40, 1);
  addSlider(root, 'Angle (°)', 'angle', -180, 180, 1);
  addSlider(root, 'Julia c (°)', 'julia', 0, 360, 0.5,
    'Where c sits on the circle of radius 0.7885 — every angle is a different set.');
  addSelect(root, 'Reaction', 'rdKind', RD_KINDS, resync,
    'Gray–Scott at different rates of feeding and dying off. Run anew when the seed changes ' +
    '— half a second or so.');
  const imgField = createDiv('').parent(root).class('field');
  fieldDivs.imageLoad = imgField;
  createSpan('Image').parent(imgField).class('label');
  const fileIn = createFileInput(() => {}).parent(imgField);
  fileIn.elt.accept = 'image/*';
  fileIn.elt.onchange = ev => loadImageFile(ev.target.files && ev.target.files[0]);
  imageNote = createDiv(IMG ? IMG.name : 'Dark is high. A picture is not part of the link — ' +
    'load it again to rebuild the sheet.').parent(imgField).class('note');
  addSlider(root, 'Warp', 'warp', 0, 3, 0.01,
    'Any field pushed about by noise before it is read: lines swirl, circles wobble.');
  addSlider(root, 'Warp scale', 'warpScale', 0.1, 10, 0.05);
  addSlider(root, 'Slide across', 'fieldX', -5, 5, 0.001,
    'The field slid under the pattern — on a flat sheet a drag does it.');
  addSlider(root, 'Slide down', 'fieldY', -5, 5, 0.001);
  addSub(root, 'A second field');
  addSelect(root, 'Second field', 'field2', FIELDS, resync,
    'Blended into the first, and what the pens can be split by.');
  addSlider(root, 'Its scale', 'scale2', 0.05, 20, 0.01);
  addSelect(root, 'Blend', 'blend', BLENDS, resync,
    '<b>add</b> lays its detail over the first; <b>mask</b> keeps the first only where ' +
    'the second is high.');
  addSlider(root, 'Blend amount (%)', 'blendAmt', 0, 100, 1);
  addSub(root, 'Shaping');
  addSlider(root, 'Contrast', 'contrast', -100, 100, 1);
  addSlider(root, 'Bias', 'bias', -100, 100, 1, 'Towards the low end, or the high.');
  addSlider(root, 'Terraces', 'terraces', 0, 16, 1, 'The height in so many steps; 0 is smooth.');
  addCheckbox(root, 'Invert', 'invert');

  // --- surface and camera ---
  addSection(root, 'Surface and camera');
  addSelect(root, 'Surface', 'surface', SURFACES, resync,
    'The pattern on a <b>flat</b> sheet, round a <b>sphere</b> or on a <b>cube</b>. <b>S</b> ' +
    'steps through them.');
  addSelect(root, 'Seen from', 'side', SIDES, resync,
    '<b>outside</b>; <b>inside, cut open</b> — through the front, which is taken away; ' +
    '<b>inside, camera in</b> — standing in it.');
  addSelect(root, 'Laid on the ball as', 'sphereMap', SPHERE_MAPS, resync,
    '<b>cube map</b> — six faces blown round; <b>lat-long</b> — like a globe, crowding at ' +
    'the poles; <b>fibonacci</b> — marks scattered evenly, each laid flat on the ball ' +
    '(marks only).');
  addSelect(root, 'Projection', 'projection', PROJECTIONS, resync);
  addSlider(root, 'Distance (radii)', 'distance', 1.2, 40, 0.1);
  addSelect(root, 'Lens', 'lens', LENSES, resync,
    '<b>rectilinear</b> keeps lines straight; <b>fisheye</b> bends them and sees all round — ' +
    '180° is a whole hemisphere.');
  addSlider(root, 'Field of view (°)', 'fov', 10, 360, 1);
  addSlider(root, 'Camera across (%)', 'camX', -100, 100, 1);
  addSlider(root, 'Camera up (%)', 'camY', -100, 100, 1);
  addSlider(root, 'Camera forward (%)', 'camZ', -100, 100, 1);
  addSlider(root, 'Azimuth (°)', 'azimuth', -180, 180, 0.5, 'A drag on the sheet turns.');
  addSlider(root, 'Elevation (°)', 'elevation', -89.9, 89.9, 0.5);
  addSlider(root, 'Roll (°)', 'roll', -180, 180, 0.5);
  addSlider(root, 'Zoom (%)', 'zoom', 10, 1000, 1);
  addSlider(root, 'Pan across (mm)', 'panX', -500, 500, 0.5);
  addSlider(root, 'Pan down (mm)', 'panY', -500, 500, 0.5);
  addSlider(root, 'Leave out marks under (mm)', 'thinBelow', 0, 5, 0.05,
    'A mark smaller than this on the paper is left out whole — the ones seen edge on, or ' +
    'far off, that would only make a blot.');
  addCheckbox(root, 'Outline — the rim of the ball, the edges of the box', 'outline');

  // --- pens ---
  addSection(root, 'Pens');
  addSelect(root, 'Colours', 'colours', COLOURS, resync,
    '<b>one</b> — black alone; <b>two</b> — black and red, a pass of the plotter each. ' +
    '<b>C</b> switches.');
  addSelect(root, 'Split by', 'split', SPLITS, resync,
    '<b>height</b> — red above the line; <b>second field</b> — red where it is high; ' +
    '<b>random</b> — red as often as the height is high; <b>checker</b>, <b>rows</b>; ' +
    '<b>parts</b> — every other ring, line or level; <b>faces</b> of the box; <b>overlay</b> ' +
    '— a second layer of the pattern in red, shifted and turned.');
  addSlider(root, 'Red from (% of the height)', 'splitAt', 0, 100, 1);
  addSlider(root, 'Red layer across (cells)', 'ovShiftU', -5, 5, 0.01);
  addSlider(root, 'Red layer down (cells)', 'ovShiftV', -5, 5, 0.01);
  addSlider(root, 'Red layer turned (°)', 'ovTurn', -90, 90, 0.1,
    'A few degrees is a moiré; 45 is a rosette.');
  addSelect(root, 'Red layer reads', 'ovSource', OV_SOURCES, resync,
    '<b>inverted</b> — large where the black is small.');
  addSlider(root, 'Outline pen', 'outlinePen', 1, 2, 1);
  addColor(root, 'Black ink', 'ink0');
  addColor(root, 'Red ink', 'ink1');
  addColor(root, 'Paper colour', 'paperColor', 'The preview only — the files have no background.');
  addSlider(root, 'Pen width (mm)', 'penWidth', 0.05, 2, 0.05);

  // --- paper ---
  addSection(root, 'Paper');
  addSelect(root, 'Size', 'paper', PAPERS, () => { syncVisibility(); resizeForPaper(); });
  addSelect(root, 'Orientation', 'orientation', ['portrait', 'landscape'], resizeForPaper);
  addSlider(root, 'Width (mm)', 'customW', 20, 2000, 1, '', resizeForPaper);
  addSlider(root, 'Height (mm)', 'customH', 20, 2000, 1, '', resizeForPaper);
  addSlider(root, 'Margin (mm)', 'margin', 0, 100, 1);

  // --- output ---
  addSection(root, 'Output');
  addCheckbox(root, 'Order the strokes for the plotter', 'optimiseOrder');
  addCheckbox(root, 'Follow the sliders live', 'liveUpdate');
  createButton('Download SVG [everything]').parent(root).class('primary')
    .mousePressed(() => exportSvg({ all: true }));
  createButton('Download SVG [one per pen]').parent(root).mousePressed(() => exportSvg({ perPen: true }));
  createDiv('Everything is one file, a group per pen; or a file a pen, each a pass of its ' +
    'own. Every file is the whole sheet in millimetres, so they land on one another.')
    .parent(root).class('note');
  addSlider(root, 'Picture (dpi)', 'pngDpi', 50, 600, 10, '', () => syncUrl());
  createButton('Download PNG').parent(root).mousePressed(exportPng);
  const row = createDiv('').parent(root).class('btn-row');
  createButton('Copy link').parent(row).mousePressed(function () { copyLink(this); });
  createButton('Reset').parent(row).mousePressed(resetAll);

  addSection(root, 'The sheet');
  statsDiv = createDiv('').parent(root).class('stats');
  penListDiv = createDiv('').parent(root).class('stats');
  createDiv('').parent(root).class('note keys').html(
    '<div><kbd>drag</kbd> turn the camera · on a flat sheet slide the field</div>' +
    '<div><kbd>shift</kbd>+<kbd>drag</kbd> pan · <kbd>wheel</kbd> zoom, or the field\'s scale</div>' +
    '<div><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> turn by 1°, with <kbd>shift</kbd> 10°</div>' +
    '<div><kbd>X</kbd> pattern · <kbd>H</kbd> field · <kbd>S</kbd> surface · <kbd>C</kbd> colours</div>' +
    '<div><kbd>R</kbd> new seed · <kbd>[</kbd> <kbd>]</kbd> step it · <kbd>P</kbd> projection · ' +
    '<kbd>+</kbd> <kbd>−</kbd> <kbd>0</kbd> zoom</div>');
  linkDiv = createDiv('').parent(root).class('link');
  syncVisibility();
}

function refreshPenList() {
  if (!penListDiv) return;
  if (!twoPens() || !perPen) { penListDiv.html(''); return; }
  let html = '';
  for (let i = 0; i < 2; i++) {
    const p = perPen[i];
    if (!p || !p.strokes) continue;
    html += `<div class="pen-row"><span class="sw" style="background:${inkColor(i)}"></span>` +
      `<span>${i ? 'red' : 'black'} — <b>${groupNum(p.strokes)}</b> strokes, ` +
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
    statsDiv.html('<div class="warn">The margin leaves nothing to draw on.</div>');
    refreshPenList();
    return;
  }
  if (!plan || !shapes) {
    statsDiv.html(`<div class="warn">${groupNum(strokes)} strokes — past the ` +
      `${groupNum(MAX_STROKES)} limit, so nothing was ordered or drawn. Larger cells bring ` +
      `it down.</div>`);
    refreshPenList();
    return;
  }
  const seconds = strokes * PEN_CYCLE_S + plan.ink / DRAW_SPEED + plan.travel / TRAVEL_SPEED;
  const cover = clamp(plan.ink * s.penWidth / Math.max(1, area.w * area.h), 0, 1);
  let html =
    `<div class="big"><b>${groupNum(strokes)}</b> strokes, ` +
    `<b>${(plan.ink / 1000).toFixed(1)}</b> m of line</div>` +
    (counts.marks ? `<div>${groupNum(counts.marks)} marks${counts.thinned
      ? `, ${groupNum(counts.thinned)} of them too small on paper and left out` : ''}</div>` : '') +
    `<div>Pen up for ${(plan.travel / 1000).toFixed(1)} m between strokes</div>` +
    `<div>Ink would cover <b>${(100 * cover).toFixed(0)} %</b> of the drawable area</div>` +
    `<div>Roughly <b>${formatDuration(seconds)}</b> to plot · ${lastMs.toFixed(0)} ms to build</div>`;
  if (counts.full) {
    html += `<div class="warn">The pattern stopped at ${groupNum(MAX_ITEMS)} lines — larger ` +
      `cells, or fewer of them.</div>`;
  }
  if (FLAT && s.cell < 3 * s.penWidth) {
    html += `<div class="warn">A cell is under three nibs wide — the marks will run ` +
      `together into solid ink.</div>`;
  }
  if (cover > 0.6) {
    html += `<div class="warn">That much ink soaks the paper — it may cockle, and the pen ` +
      `may tear it.</div>`;
  }
  if (strokes > BUSY_STROKES) {
    html += `<div class="warn">${groupNum(strokes)} strokes is a long sitting at the plotter.</div>`;
  }
  statsDiv.html(html);
  refreshPenList();
}

////////////////////////////////////////////////////////////////////////////////////////
// SVG
//
// No fills, no background rectangle — everything in the file is meant to be plotted.
// stroke-width is the pen width and the caps are round, so the file previews as the
// finished plot looks. Strokes come out in the order the pen should visit them, and the
// link that rebuilds the sheet is written into the header comment.

function metaComment() {
  const s = settings;
  const where = s.surface === 'flat' ? `flat cell=${s.cell}mm`
    : `${s.surface} ${s.side}${s.surface === 'sphere' ? ' ' + sphereMap() : ''} cells=${s.cells3d} ` +
      `az=${s.azimuth}° el=${s.elevation}° zoom=${s.zoom}%`;
  return `field patterns — ${s.pattern} on ${where} field=${s.field}x${s.scale}` +
    `${s.blend !== 'none' ? ` ${s.blend} ${s.field2}x${s.scale2}@${s.blendAmt}%` : ''}` +
    ` seed=${s.seed} pens=${s.colours}${twoPens() ? '/' + s.split : ''} ` +
    `pen=${s.penWidth}mm strokes=${strokes}`;
}

function svgGroup(keep, colour, id) {
  const { pts, off } = shapes;
  const { order, flip } = plan;
  const f = n => String(+n.toFixed(3));
  const CHUNK = 400;
  let body = '', d = '', held = 0, count = 0;
  for (let t = 0; t < order.length; t++) {
    const i = order[t];
    if (!keep(i)) continue;
    const rev = flip[t] === 1;
    const a = off[i], b = off[i + 1], n = b - a;
    count++;
    let k = rev ? b - 1 : a;
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
  return `<g id="${id}" fill="none" stroke="${colour}" stroke-width="${f(settings.penWidth)}" ` +
    `stroke-linecap="round" stroke-linejoin="round">\n${body}</g>\n`;
}

function svgFile(groups, tag) {
  const [W, H] = paperDims();
  let body = '';
  for (const [keep, col, id] of groups) {
    const g = svgGroup(keep, col, id);
    if (g) body += g;
  }
  if (!body) return null;
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- ${metaComment()} pass=${tag} -->\n` +
    `<!-- ${location.origin === 'null' ? '' : location.origin}${location.pathname}` +
    `#${encodeState()} -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n` +
    body +
    `</svg>\n`;
}

function fileStem() {
  const s = settings;
  const paper = s.paper === 'custom' ? `${s.customW}x${s.customH}mm` : `${s.paper}-${s.orientation}`;
  return `field patterns ${s.pattern} ${s.field} ${s.surface} seed${s.seed} ${paper}`;
}

function exportSvg(what) {
  if (!shapes || !plan || !strokes) {
    alert('Nothing to export — no line is left on this sheet.');
    return;
  }
  const pens = twoPens() ? 2 : 1;
  const names = ['black', 'red'];
  const penGroup = i => [j => shapes.ink[j] === i, inkColor(i), names[i]];
  const files = [];
  if (what.all) {
    const g = [];
    for (let i = 0; i < pens; i++) g.push(penGroup(i));
    files.push([g, 'everything']);
  } else {
    for (let i = 0; i < pens; i++) if (perPen[i] && perPen[i].strokes) files.push([[penGroup(i)], names[i]]);
  }
  const stamp = timestamp();
  let saved = 0;
  for (const [groups, tag] of files) {
    const svg = svgFile(groups, tag);
    if (!svg) continue;
    saveStrings([svg], `${fileStem()} ${tag} pen${settings.penWidth} ${stamp}`, 'svg');
    saved++;
  }
  if (!saved) alert('Nothing in that part of the sheet.');
}

function exportPng() {
  const [W, H] = paperDims();
  let pxmm = Math.max(1, settings.pngDpi / 25.4);
  const most = 1.2e8;
  if (W * H * pxmm * pxmm > most) pxmm = Math.sqrt(most / (W * H));
  const c = document.createElement('canvas');
  c.width = Math.round(W * pxmm);
  c.height = Math.round(H * pxmm);
  drawSheet(c.getContext('2d'), pxmm);
  const name = `${fileStem()} ${Math.round(pxmm * 25.4)}dpi ${timestamp()}.png`;
  c.toBlob(blob => {
    if (!blob) { alert('The picture could not be made — try a lower dpi.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }, 'image/png');
}
