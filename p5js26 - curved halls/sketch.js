////////////////////////////////////////////////////////////////////////////////////////
// Curved halls — rooms of greebled blocks and floating polyhedra, seen through odd lenses
//
// The world is built of modules: a grid of cells, each solid or empty, carved into a hall,
// a corridor, a shaft, a street between towers, an atrium, a lattice, a maze. Every face
// where solid meets empty is cut into panels, and the panels stand out of it as blocks,
// steps, ribs and studs — greebles, as on the hull of a model spaceship. Polyhedra float
// in the empty space: solid, or made of plates, of framed panels, of struts, or spiked.
//
// Every line is a segment in space. Which part of it the eye sees is worked out exactly,
// in space, before any lens is chosen: a point is hidden when the line from the eye to it
// passes through a solid, and for one segment and one convex solid that is a little linear
// programme whose answer is an interval of the segment. So the hidden lines are the same
// for every projection, and the projection is free to be anything that takes a direction
// from the eye to a point on the paper: a pinhole, the fisheyes, the mirrors of
// catadioptric cameras — parabolic and hyperbolic — the discs of Poincaré and Klein, the
// cylinders of panoramas, Pannini's, Mercator's, a log-polar tunnel. A straight edge comes
// out curved; it is followed until the curve is within a hair of the chord.
//
// Light is optional. With it, every face is hatched by how much light falls on it, and the
// hatching is drawn in space, on the face, so it bends with the lens like the edges do.
// Shadows are found the same way the hidden lines are, from the light instead of the eye.
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};
const PAPERS = Object.keys(PAPER_SIZES).concat('custom');

const PAPER_TONES = {
  'white': '#fbfaf5', 'cream': '#f1e8d6', 'grey': '#8e9196', 'black': '#151517',
};
const TONES = Object.keys(PAPER_TONES).concat('custom');

// The drawer: rapidographs in black and red, each in four nibs.
const PEN_KINDS = {
  'black 0.25': { col: '#1b1b1b', w: 0.25 },
  'black 0.35': { col: '#1b1b1b', w: 0.35 },
  'black 0.5':  { col: '#1b1b1b', w: 0.5 },
  'black 1.0':  { col: '#1b1b1b', w: 1.0 },
  'red 0.25':   { col: '#c8261d', w: 0.25 },
  'red 0.35':   { col: '#c8261d', w: 0.35 },
  'red 0.5':    { col: '#c8261d', w: 0.5 },
  'red 1.0':    { col: '#c8261d', w: 1.0 },
  'other':      { col: '#2a5bd7', w: 0.5 },
};
const KINDS = Object.keys(PEN_KINDS);
const SLOTS = 5;

const SPACES = ['hall', 'corridor', 'shaft', 'canyon', 'atrium', 'lattice', 'maze', 'void'];
// what each kind of space starts at when it is picked: across, along, up — in modules
const SPACE_DIMS = {
  hall: [8, 10, 5], corridor: [2, 26, 2], shaft: [4, 4, 18], canyon: [3, 22, 12],
  atrium: [11, 11, 13], lattice: [13, 13, 13], maze: [9, 9, 5], void: [10, 10, 5],
};
const GREEBLES  = ['blocks', 'panels', 'towers', 'ribs', 'mixed', 'plain'];
const FLOORS    = ['as the walls', 'tiles', 'plain'];

const PROJECTIONS = ['perspective', 'fisheye', 'equisolid', 'orthographic', 'stereographic',
  'parabolic mirror', 'hyperbolic mirror', 'Poincaré disc', 'Klein disc', 'panorama', 'cylinder',
  'Mercator', 'Pannini', 'Hammer', 'tunnel'];
const RADIAL = new Set(['perspective', 'fisheye', 'equisolid', 'orthographic', 'stereographic',
  'parabolic mirror', 'hyperbolic mirror', 'Poincaré disc', 'Klein disc']);
const FRAME_SHAPES = ['fill', 'disc'];
const FOV_ACROSS = ['diagonal', 'long side', 'short side'];

const OBJ_KINDS = ['mixed', 'tetrahedron', 'cube', 'octahedron', 'dodecahedron', 'icosahedron',
  'cuboctahedron', 'truncated tetrahedron', 'truncated cube', 'truncated octahedron',
  'rhombicuboctahedron', 'icosidodecahedron', 'truncated icosahedron', 'geodesic ball',
  'goldberg ball', 'prism', 'antiprism', 'bipyramid', 'star', 'stella octangula',
  'menger cube', 'cube cluster', 'ring', 'gyroscope', 'monolith', 'stairs', 'nested cubes'];
// the kinds a polyhedron's style applies to; the rest are built their own way
const POLY_KINDS = OBJ_KINDS.slice(1, 18);
const OBJ_STYLES = ['mixed', 'solid', 'plates', 'framed', 'cage', 'struts'];
const OBJ_PLACES = ['cluster', 'scatter', 'ring', 'column', 'line', 'spiral'];
const OBJ_TURNS  = ['random', 'upright', 'square'];
const OBJ_FILLS  = ['outline', 'black', 'black, paper edges', 'shaded'];
const LIGHTS     = ['none', 'sun', 'lamp', 'eye'];
const HATCH_DIRS = ['along', 'across', 'by face'];
const MARK_AT    = ['sheet', 'picture'];

// What goes on the sheet. The cut guides go with the first pen in use.
const LAYERS = [
  { id: 'edges',   label: 'edges of the halls',  pen: 'linePen' },
  { id: 'objects', label: 'floating things',     pen: 'objPen' },
  { id: 'shading', label: 'shading',             pen: 'shadePen' },
  { id: 'solid',   label: 'solid black',         pen: 'solidPen' },
  { id: 'trails',  label: 'trails',              pen: 'trailPen' },
  { id: 'frame',   label: 'frame',               pen: 'framePen' },
  { id: 'guides',  label: 'cut guides',          pen: 'linePen' },
];
const L_EDGES = 0, L_OBJ = 1, L_SHADE = 2, L_SOLID = 3, L_TRAIL = 4, L_FRAME = 5, L_GUIDES = 6;

const MAX_STROKES    = 400_000;
const BUSY_STROKES   = 40_000;
const Q              = 1 / 64;     // modules — every greeble lies on this grid, so equal edges are equal
const HIDE_EPS       = 1e-6;       // modules — every solid shrunk by this, so it never hides its own skin
const FLAT_DEPTH     = 16;         // halvings of a segment while its curve is followed
const SEAM_MM        = 0.5;        // mm — a chord this long after every halving jumps a seam
const MIN_DASH       = 0.4;        // mm — a shorter piece of hatching is left out
const EPS            = 0.01;       // mm — the stub that stands in for a dot
const PREVIEW_MAX_PX = 1500;
const PEN_CYCLE_S    = 0.3;
const DRAW_SPEED     = 60;
const TRAVEL_SPEED   = 150;
const DRAG_DEG_PX    = 0.25;

const settings = {
  // paper
  paper: 'A3',
  orientation: 'portrait',
  customW: 300,
  customH: 300,
  margin: 15,
  paperTone: 'white',
  paperColor: '#fbfaf5',   // the preview only — the files have no background
  frameShape: 'fill',
  discSize: 100,           // % of the picture's short side
  border: false,           // a line round the picture
  cropMarks: true,         // cut guides — dots to lay the guillotine's blade through
  cropMarkAt: 'sheet',
  cropMarkGap: 400,        // mm — the most that is ever left between two dots

  // the pens
  pen1Kind: 'black 0.35', pen1W: 0.35, pen1Col: '#1b1b1b',
  pen2Kind: 'red 0.35',   pen2W: 0.35, pen2Col: '#c8261d',
  pen3Kind: 'black 0.25', pen3W: 0.25, pen3Col: '#1b1b1b',
  pen4Kind: 'black 1.0',  pen4W: 1.0,  pen4Col: '#1b1b1b',
  pen5Kind: 'red 0.25',   pen5W: 0.25, pen5Col: '#c8261d',
  linePen: 1, objPen: 1, shadePen: 1, solidPen: 1, trailPen: 1, framePen: 1,

  seed: 7,

  // the space
  space: 'hall',
  spaceW: 8,               // modules across
  spaceD: 10,              // along
  spaceH: 5,               // up
  openings: 6,             // passages leading off it — doors, side corridors, niches, bridges
  pillars: 0,              // modules between pillars; 0, none
  latticeStep: 3,          // modules from one beam of the lattice to the next
  ground: true,            // the void stands on a floor

  // the greebles
  greeble: 'blocks',
  gDepth: 0.35,            // modules — the most a block stands out
  gMin: 0.12,              // modules — the smallest panel
  gMax: 1.5,               // modules — a panel larger than this is always cut
  gSplit: 72,              // % — the chance a panel is cut again
  gFlat: 30,               // % of panels left flat
  gInset: 0.03,            // modules — paper round a block on its panel
  gLevels: 2,              // blocks on blocks
  mergeFaces: 3,           // modules — faces of one wall run together into panels this large
  floor: 'as the walls',

  // the eye
  camX: 50,                // % of the space, across
  camY: 18,                // along
  camZ: 45,                // up
  yaw: 0,                  // ° — 0 looks along the space
  pitch: 8,
  roll: 0,
  projection: 'fisheye',
  fov: 190,                // ° — across the picture (see fovAcross); for the cylinders, across its width
  fovAcross: 'diagonal',   // which way across a filled picture the field of view is measured
  mirrorXi: 0.55,          // the hyperbolic mirror's shape: 0 a pinhole, 1 a parabola
  discK: 1.2,              // how hard the discs of Poincaré and Klein crowd the rim
  pannini: 1,              // Pannini's distance: 0 a pinhole across, 1 the classic
  squeeze: 100,            // % — the picture stretched across
  swirl: 0,                // ° — turned more the further from the middle
  barrel: 0,               // % — bulged out (+) or pinched in (−) towards the rim
  shiftX: 0,               // % of the picture — the middle of the lens moved
  shiftY: 0,
  farthest: 80,            // modules — nothing further is drawn

  // floating things
  objects: 5,
  objKind: 'mixed',
  objStyle: 'mixed',
  objPlace: 'cluster',
  objX: 50,                // % of the space — the middle of the cluster, ring, column
  objY: 45,
  objZ: 50,
  objSpread: 2.2,          // modules round the middle
  objSize: 1.1,            // modules — the radius of a thing
  objSizeVar: 45,          // %
  objTurn: 'random',
  objFill: 'black, paper edges',
  plateGap: 5,             // % of the radius between plates
  plateThick: 14,          // % of the radius
  explode: 0,              // % of the radius the plates fly apart
  frameW: 22,              // % of a face, the frame round its panel
  panelSunk: 40,           // % of the plate — how deep a framed panel is set back
  strutW: 5,               // % of the radius
  nodeSize: 8,            // % of the radius
  coreKind: 'none',        // a smaller thing inside each
  trails: 0,               // modules — streaks left behind them; 0, none
  trailCount: 14,
  trailYaw: 160,           // ° — which way the things fly
  trailPitch: -25,
  trailDash: 60,           // % — how broken a streak is

  // light
  light: 'none',
  lightYaw: 35,            // ° — where the sun is
  lightPitch: 55,
  lampX: 50, lampY: 50, lampZ: 92,   // % of the space
  lampReach: 8,            // modules — the lamp falls to half at this distance
  shadows: true,
  ambient: 35,             // %
  shadeWalls: true,
  shadeObjects: true,
  hatchPitch: 0.9,         // mm between hatch lines at the darkest
  hatchDir: 'along',
  crossAt: 55,             // % of tone — darker than this is hatched across as well
  lightest: 25,            // % of tone — lighter is left bare
  contrast: 0,             // %

  // lines
  edges: true,
  minLine: 0.25,           // mm — a shorter piece of an edge is left out
  smoothness: 0.04,        // mm — how near the curve a followed edge must keep
  edgeGap: 0.35,           // mm of paper round each face filled black
  solidPasses: 85,         // % of the nib between two passes of solid black

  // output
  optimiseOrder: true,
  liveUpdate: true,
  showGuides: false,
  penDown: 100,            // % of the nib — a hop shorter than this is drawn, not lifted over
  pngDpi: 200,
};

const DEFAULTS = { ...settings };

// What the world depends on. Anything else is drawn again without building it again.
const WORLD_KEYS = ['seed', 'space', 'spaceW', 'spaceD', 'spaceH', 'openings', 'pillars',
  'latticeStep', 'ground', 'greeble', 'gDepth', 'gMin', 'gMax', 'gSplit', 'gFlat', 'gInset',
  'gLevels', 'mergeFaces', 'floor', 'objects', 'objKind', 'objStyle', 'objPlace', 'objX', 'objY',
  'objZ', 'objSpread', 'objSize', 'objSizeVar', 'objTurn', 'plateGap', 'plateThick', 'explode',
  'frameW', 'panelSunk', 'strutW', 'nodeSize', 'coreKind'];

const setters   = {};
const fieldDivs = {};
let statsDiv, linkDiv, penListDiv, layerButtons = {}, penSelects = [], slotSwatches = [];

let area    = null;          // the margin box, in mm
let PIC     = null;          // the picture: { cx, cy, disc, R, x0, y0, x1, y1 }
let shapes  = null;          // { pts, off, ink, lay } — polylines in mm
let strokes = 0;
let plan    = null;          // { order, flip, ink, travel, downs }
let perPen  = null;
let perLayer = null;
let lastMs  = 0;
let drag    = null;
let COUNTS  = null;

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

function rad(deg) { return deg * Math.PI / 180; }

function wrapDeg(a) { return ((a + 180) % 360 + 360) % 360 - 180; }

function snapQ(v) { return Math.round(v / Q) * Q; }

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

function rng(salt) {
  return mulberry32(Math.imul((settings.seed | 0) + 1, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca77));
}

function hexRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex || '');
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

function luma(hex) {
  const [r, g, b] = hexRgb(hex).map(v => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const la = luma(a), lb = luma(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// vectors as plain arrays
function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vadd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function vmul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function vcross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function vlen(a) { return Math.hypot(a[0], a[1], a[2]); }
function vnorm(a) { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function vlerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

////////////////////////////////////////////////////////////////////////////////////////
// The URL is the document
//
// Every setting that differs from its default is written into the hash, debounced, with
// replaceState so the back button stays usable.

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
  refreshPenSelects();
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
// The sheet and the pens

function paperDims() {
  if (settings.paper === 'custom') {
    return [clamp(settings.customW, 20, 5000), clamp(settings.customH, 20, 5000)];
  }
  const [a, b] = PAPER_SIZES[settings.paper] || PAPER_SIZES.A4;
  return settings.orientation === 'portrait' ? [a, b] : [b, a];
}

function penW(i) { return clamp(Number(settings[`pen${i + 1}W`]) || 0.3, 0.05, 30); }
function penCol(i) { return settings[`pen${i + 1}Col`] || '#000000'; }
function penKind(i) { return settings[`pen${i + 1}Kind`] || 'black 0.35'; }
function penIdx(v) { return clamp(Math.round(Number(v) || 1), 1, SLOTS) - 1; }

function penLabel(i) {
  const w = penW(i);
  return `${i + 1} · ${penKind(i)} ${w < 1 ? w.toFixed(2) : +w.toFixed(1)} mm`;
}

function drawArea() {
  const [W, H] = paperDims(), m = clamp(settings.margin, 0, Math.min(W, H) / 2 - 1);
  return { x0: m, y0: m, x1: W - m, y1: H - m, w: W - 2 * m, h: H - 2 * m };
}

// What a pen may draw inside: the margin box, less half its own nib all round.
function penArea(i) {
  const m = penW(i) / 2;
  return { x0: area.x0 + m, y0: area.y0 + m, x1: area.x1 - m, y1: area.y1 - m,
           w: area.w - 2 * m, h: area.h - 2 * m };
}

// The picture: the margin box, or a disc in it.
function picturePlace() {
  const s = settings, cx = (area.x0 + area.x1) / 2, cy = (area.y0 + area.y1) / 2;
  if (s.frameShape === 'disc') {
    const R = Math.max(2, clamp(s.discSize, 10, 100) / 100 * Math.min(area.w, area.h) / 2);
    return { cx, cy, disc: true, R, x0: cx - R, y0: cy - R, x1: cx + R, y1: cy + R, half: R };
  }
  const half = s.fovAcross === 'short side' ? Math.min(area.w, area.h) / 2 :
               s.fovAcross === 'long side' ? Math.max(area.w, area.h) / 2 : Math.hypot(area.w, area.h) / 2;
  return { cx, cy, disc: false, R: 0, x0: area.x0, y0: area.y0, x1: area.x1, y1: area.y1, half };
}

function penOrder() { return [0, 1, 2, 3, 4]; }

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

  const [w, h] = paperDims();
  const s = previewScale();
  pixelDensity(2);
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

function update() {
  area = drawArea();
  PIC = picturePlace();
  const t0 = performance.now();
  strokes = 0;
  shapes = plan = perPen = perLayer = null;
  ensureWorld();
  shapes = buildShapes(!!(drag && drag.moved));
  strokes = shapes ? shapes.off.length - 1 : 0;
  if (strokes > MAX_STROKES) shapes = null;
  else if (shapes) plan = orderShapes(shapes);
  lastMs = performance.now() - t0;
  drawPreview();
  syncVisibility();
  updateStats();
  syncUrl();
}

let liveQueued = false;

function liveUpdate() {
  if (liveQueued) return;
  liveQueued = true;
  requestAnimationFrame(() => {
    liveQueued = false;
    update();
  });
}

////////////////////////////////////////////////////////////////////////////////////////
// The world
//
// A grid of cells, 1 solid and 0 empty; one cell is one module. Outside the grid it is
// solid for the closed spaces and empty for the open ones (the street, the lattice, the
// void). `VOID` is the main empty box — where the eye and the floating things are placed.

let WORLD = null;

function worldKey() { return JSON.stringify(WORLD_KEYS.map(k => settings[k])); }

function ensureWorld() {
  const key = worldKey();
  if (WORLD && WORLD.key === key) return WORLD;
  const t0 = performance.now();
  WORLD = buildWorld();
  WORLD.key = key;
  WORLD.ms = performance.now() - t0;
  return WORLD;
}

function newGrid(nx, ny, nz, fill, out) {
  return { nx, ny, nz, out, c: new Uint8Array(nx * ny * nz).fill(fill) };
}

function cellAt(G, i, j, k) {
  if (i < 0 || j < 0 || k < 0 || i >= G.nx || j >= G.ny || k >= G.nz) return G.out;
  return G.c[(k * G.ny + j) * G.nx + i];
}

function setCell(G, i, j, k, v) {
  if (i < 0 || j < 0 || k < 0 || i >= G.nx || j >= G.ny || k >= G.nz) return;
  G.c[(k * G.ny + j) * G.nx + i] = v;
}

function fillBox(G, x0, y0, z0, x1, y1, z1, v) {
  for (let k = z0; k < z1; k++) for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) setCell(G, i, j, k, v);
}

// A passage driven out of the space through its wall: so wide, so high, so long, and with
// a turn at the end half the time, so it goes dark. The grid's own shell is never cut.
function passage(G, r, x, y, z, dx, dy, w, h, len) {
  const keep = (i, j, k) => i >= 1 && j >= 1 && k >= 1 && i < G.nx - 1 && j < G.ny - 1 && k < G.nz - 1;
  const cut = (i, j, k) => { if (keep(i, j, k)) setCell(G, i, j, k, 0); };
  const sx = dy !== 0 ? 1 : 0, sy = dx !== 0 ? 1 : 0;   // across the passage
  let cx = x, cy = y;
  for (let n = 0; n < len; n++) {
    cx += dx; cy += dy;
    for (let a = 0; a < w; a++) for (let b = 0; b < h; b++) cut(cx + sx * a, cy + sy * a, z + b);
  }
  if (r() < 0.5) {
    const sgn = r() < 0.5 ? -1 : 1, turn = 2 + Math.floor(r() * 4);
    const bx = sgn > 0 ? cx + sx * (w - 1) : cx, by = sgn > 0 ? cy + sy * (w - 1) : cy;
    for (let n = 1; n <= turn; n++) {
      for (let a = 0; a < w; a++) for (let b = 0; b < h; b++) {
        cut(bx + sx * sgn * n - dx * a, by + sy * sgn * n - dy * a, z + b);
      }
    }
  }
}

// Doors, side corridors and niches, each on a wall picked by its area.
function openingsOf(G, r, V, n, M) {
  const W = V.x1 - V.x0, D = V.y1 - V.y0, H = V.z1 - V.z0;
  const walls = [[0, D], [1, D], [2, W], [3, W]];
  const total = 2 * (W + D);
  for (let q = 0; q < n; q++) {
    let pick = r() * total, side = 0;
    for (const [s, len] of walls) { if (pick < len) { side = s; break; } pick -= len; side = s; }
    const w = Math.min(1 + (r() < 0.45 ? 1 : 0), side < 2 ? D : W);
    const h = Math.min(H, 1 + Math.floor(r() * Math.min(3, H)));
    const z = V.z0 + (H > h && r() < 0.4 ? Math.floor(r() * (H - h + 1)) : 0);
    const len = 2 + Math.floor(r() * Math.max(1, M - 2));
    if (side < 2) {
      const y = V.y0 + Math.floor(r() * (D - w + 1));
      const x = side === 0 ? V.x0 : V.x1 - 1;
      passage(G, r, x, y, z, side === 0 ? -1 : 1, 0, w, h, len);
    } else {
      const x = V.x0 + Math.floor(r() * (W - w + 1));
      const y = side === 2 ? V.y0 : V.y1 - 1;
      passage(G, r, x, y, z, 0, side === 2 ? -1 : 1, w, h, len);
    }
  }
}

function spaceRoom(W, D, H, r) {
  const M = 6, s = settings;
  const G = newGrid(W + 2 * M, D + 2 * M, H + 2, 1, 1);
  const V = { x0: M, y0: M, z0: 1, x1: M + W, y1: M + D, z1: 1 + H };
  fillBox(G, V.x0, V.y0, V.z0, V.x1, V.y1, V.z1, 0);
  const p = Math.round(s.pillars);
  if (p > 0) {
    for (let x = V.x0 + p; x < V.x1 - 1; x += p + 1) {
      for (let y = V.y0 + p; y < V.y1 - 1; y += p + 1) fillBox(G, x, y, V.z0, x + 1, y + 1, V.z1, 1);
    }
  }
  openingsOf(G, r, V, Math.round(s.openings), M);
  return { G, V };
}

function spaceCanyon(W, D, H, r) {
  const T = 5, s = settings;
  const G = newGrid(W + 2 * T, D, H + 2, 0, 0);
  const V = { x0: T, y0: 0, z0: 1, x1: T + W, y1: D, z1: 1 + H };
  fillBox(G, 0, 0, 0, G.nx, D, 1, 1);
  for (let side = 0; side < 2; side++) {
    let j = 0;
    while (j < D) {
      const len = Math.min(D - j, 1 + Math.floor(r() * 3));
      const h = 2 + Math.floor(r() * Math.max(1, H - 1));
      const f0 = r() < 0.3 ? 1 : 0, tier = 2 + Math.floor(r() * 4), steps = r() < 0.6;
      for (let z = 1; z <= h; z++) {
        const f = Math.min(T - 1, f0 + (steps ? Math.floor((z - 1) / tier) : 0));
        if (side === 0) fillBox(G, 0, j, z, T - f, j + len, z + 1, 1);
        else fillBox(G, T + W + f, j, z, G.nx, j + len, z + 1, 1);
      }
      j += len;
    }
  }
  for (let q = 0; q < Math.round(s.openings); q++) {
    const z = 3 + Math.floor(r() * Math.max(1, H - 3)), y = Math.floor(r() * D);
    fillBox(G, T - 1, y, z, T + W + 1, Math.min(D, y + 1 + (r() < 0.4 ? 1 : 0)), z + 1, 1);
  }
  return { G, V };
}

function spaceAtrium(W, D, H, r) {
  const M = 6, s = settings, g = Math.max(1, Math.min(3, Math.floor(Math.min(W, D) / 4)));
  const G = newGrid(W + 2 * M, D + 2 * M, H + 2, 1, 1);
  const O = { x0: M, y0: M, z0: 1, x1: M + W, y1: M + D, z1: 1 + H };
  fillBox(G, O.x0, O.y0, O.z0, O.x1, O.y1, O.z1, 0);
  const V = { x0: O.x0 + g, y0: O.y0 + g, z0: 1, x1: O.x1 - g, y1: O.y1 - g, z1: 1 + H };
  const storey = 3;
  for (let z = storey; z < O.z1 - 1; z += storey) {
    for (let y = O.y0; y < O.y1; y++) for (let x = O.x0; x < O.x1; x++) {
      if (x >= V.x0 && x < V.x1 && y >= V.y0 && y < V.y1) continue;
      setCell(G, x, y, z, 1);
    }
  }
  const step = 3;
  for (let x = V.x0; x < V.x1; x += step) {
    fillBox(G, x, V.y0 - 1, 1, x + 1, V.y0, O.z1, 1);
    fillBox(G, x, V.y1, 1, x + 1, V.y1 + 1, O.z1, 1);
  }
  for (let y = V.y0; y < V.y1; y += step) {
    fillBox(G, V.x0 - 1, y, 1, V.x0, y + 1, O.z1, 1);
    fillBox(G, V.x1, y, 1, V.x1 + 1, y + 1, O.z1, 1);
  }
  for (let z = 1; z < O.z1 - 1; z += storey) {
    const L = { x0: O.x0, y0: O.y0, z0: z, x1: O.x1, y1: O.y1, z1: Math.min(O.z1, z + storey - 1) };
    openingsOf(G, r, L, Math.max(0, Math.round(s.openings / 3)), M);
  }
  return { G, V };
}

function spaceLattice(W, D, H, r) {
  const p = clamp(Math.round(settings.latticeStep), 2, 9);
  const G = newGrid(W, D, H, 0, 0);
  for (let k = 0; k < H; k++) for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) {
    if ((i % p === 0) + (j % p === 0) + (k % p === 0) >= 2) setCell(G, i, j, k, 1);
  }
  // beams taken out between two nodes
  for (let q = 0; q < Math.round(settings.openings) * 3; q++) {
    const i = p * Math.floor(r() * Math.ceil(W / p)), j = p * Math.floor(r() * Math.ceil(D / p));
    const k = p * Math.floor(r() * Math.ceil(H / p)), ax = Math.floor(r() * 3);
    for (let n = 1; n < p; n++) {
      setCell(G, i + (ax === 0 ? n : 0), j + (ax === 1 ? n : 0), k + (ax === 2 ? n : 0), 0);
    }
  }
  return { G, V: { x0: 0, y0: 0, z0: 0, x1: W, y1: D, z1: H } };
}

function spaceMaze(W, D, H, r) {
  const odd = v => Math.max(3, v | 1);
  const nx = odd(W), ny = odd(D), nz = odd(H);
  const G = newGrid(nx + 2, ny + 2, nz + 2, 1, 1);
  const rx = (nx - 1) / 2, ry = (ny - 1) / 2, rz = (nz - 1) / 2;
  const seen = new Uint8Array(rx * ry * rz);
  const id = (a, b, c) => (c * ry + b) * rx + a;
  const room = (a, b, c) => setCell(G, 2 + 2 * a, 2 + 2 * b, 2 + 2 * c, 0);
  const stack = [[Math.floor(rx / 2), Math.floor(ry / 2), 0]];
  seen[id(...stack[0])] = 1;
  room(...stack[0]);
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  while (stack.length) {
    const [a, b, c] = stack[stack.length - 1];
    const opts = dirs.filter(([da, db, dc]) => {
      const A = a + da, B = b + db, C = c + dc;
      return A >= 0 && B >= 0 && C >= 0 && A < rx && B < ry && C < rz && !seen[id(A, B, C)];
    });
    if (!opts.length) { stack.pop(); continue; }
    // up and down less often than across
    const w = opts.map(d => d[2] ? 0.35 : 1), tot = w.reduce((x, y) => x + y, 0);
    let pick = r() * tot, k = 0;
    while (pick > w[k]) { pick -= w[k]; k++; }
    const [da, db, dc] = opts[Math.min(k, opts.length - 1)];
    setCell(G, 2 + 2 * a + da, 2 + 2 * b + db, 2 + 2 * c + dc, 0);
    seen[id(a + da, b + db, c + dc)] = 1;
    room(a + da, b + db, c + dc);
    stack.push([a + da, b + db, c + dc]);
  }
  // loops, and a few rooms run together
  for (let q = 0; q < Math.round(settings.openings) * 2; q++) {
    const i = 2 + Math.floor(r() * (nx - 1)), j = 2 + Math.floor(r() * (ny - 1)), k = 2 + 2 * Math.floor(r() * rz);
    if (i < nx + 1 && j < ny + 1) setCell(G, i, j, k, 0);
  }
  // every cell of the labyrinth two modules a side, so there is room in it for greebles
  const B = newGrid(G.nx * 2, G.ny * 2, G.nz * 2, 1, 1);
  for (let k = 0; k < B.nz; k++) for (let j = 0; j < B.ny; j++) for (let i = 0; i < B.nx; i++) {
    setCell(B, i, j, k, cellAt(G, i >> 1, j >> 1, k >> 1));
  }
  return { G: B, V: { x0: 2, y0: 2, z0: 2, x1: 2 * nx + 2, y1: 2 * ny + 2, z1: 2 * nz + 2 } };
}

function spaceVoid(W, D, H) {
  const M = 8;
  const G = newGrid(W + 2 * M, D + 2 * M, H + 1, 0, 0);
  if (settings.ground) fillBox(G, 0, 0, 0, G.nx, G.ny, 1, 1);
  return { G, V: { x0: M, y0: M, z0: 1, x1: M + W, y1: M + D, z1: 1 + H } };
}

function buildWorld() {
  const s = settings;
  const W = clamp(Math.round(s.spaceW), 1, 60), D = clamp(Math.round(s.spaceD), 1, 120);
  const H = clamp(Math.round(s.spaceH), 1, 80);
  const r = rng(11);
  let made;
  switch (s.space) {
    case 'canyon':  made = spaceCanyon(W, D, H, r); break;
    case 'atrium':  made = spaceAtrium(Math.max(W, 5), Math.max(D, 5), H, r); break;
    case 'lattice': made = spaceLattice(W, D, H, r); break;
    case 'maze':    made = spaceMaze(W, D, H, r); break;
    case 'void':    made = spaceVoid(W, D, H); break;
    default:        made = spaceRoom(W, D, H, r);
  }
  const Wd = { G: made.G, void: made.V, boxes: [], flat: [], rects: [], things: [], pieces: [], warn: [] };
  wallSurfaces(Wd, rng(23));
  floatingThings(Wd, rng(37));
  Wd.walls = wallBoxes(Wd.G);
  Wd.solids = gatherSolids(Wd);
  Wd.bvh = buildBVH(Wd.solids);
  return Wd;
}

// The solid cells next to empty ones, run together into as few boxes as will do. They only
// hide what is behind them; their faces are drawn as the panels of the surfaces.
function wallBoxes(G) {
  const { nx, ny, nz } = G, need = new Uint8Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (!cellAt(G, i, j, k)) continue;
    let near = false;
    for (let c = -1; c <= 1 && !near; c++) for (let b = -1; b <= 1 && !near; b++) for (let a = -1; a <= 1; a++) {
      if (!cellAt(G, i + a, j + b, k + c)) { near = true; break; }
    }
    if (near) need[(k * ny + j) * nx + i] = 1;
  }
  const at = (i, j, k) => need[(k * ny + j) * nx + i] === 1;
  const out = [];
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (!at(i, j, k)) continue;
    let i1 = i + 1;
    while (i1 < nx && at(i1, j, k)) i1++;
    let j1 = j + 1;
    grow: while (j1 < ny) { for (let a = i; a < i1; a++) if (!at(a, j1, k)) break grow; j1++; }
    let k1 = k + 1;
    grow2: while (k1 < nz) {
      for (let b = j; b < j1; b++) for (let a = i; a < i1; a++) if (!at(a, b, k1)) break grow2;
      k1++;
    }
    for (let c = k; c < k1; c++) for (let b = j; b < j1; b++) for (let a = i; a < i1; a++) need[(c * ny + b) * nx + a] = 2;
    out.push([i, j, k, i1, j1, k1]);
  }
  return out;
}

////////////////////////////////////////////////////////////////////////////////////////
// Surfaces and greebles
//
// Every face where a solid cell meets an empty one, gathered plane by plane, run together
// into rectangles up to `mergeFaces` modules a side, and each rectangle cut into panels by
// a k-d tree: cut, cut again, until the panels are small or chance says stop. A panel is
// left flat or something stands on it — a block, a stack of steps, ribs, a grid of studs —
// and the top of a block may be cut into panels again. Everything lies on a grid of 1/64
// of a module, so two edges in one place are exactly equal and merge.
//
// A rectangle is described by its axis `a` (the normal), the side `s` it faces (±1), the
// plane `c`, and its extent along the other two axes, u = (a+1)%3 and v = (a+2)%3.

function wallSurfaces(W, r) {
  const G = W.G, s = settings, planes = new Map();
  for (let k = 0; k < G.nz; k++) for (let j = 0; j < G.ny; j++) for (let i = 0; i < G.nx; i++) {
    if (!cellAt(G, i, j, k)) continue;
    const idx = [i, j, k];
    for (let a = 0; a < 3; a++) for (const sg of [-1, 1]) {
      const n = idx.slice();
      n[a] += sg;
      if (cellAt(G, n[0], n[1], n[2])) continue;
      // the underside of the ground and other faces out of the grid nobody looks at
      const outside = n[0] < 0 || n[1] < 0 || n[2] < 0 || n[0] >= G.nx || n[1] >= G.ny || n[2] >= G.nz;
      if (outside && a === 2 && sg < 0) continue;
      const c = sg > 0 ? idx[a] + 1 : idx[a];
      const key = `${a},${sg},${c}`;
      let P = planes.get(key);
      if (!P) { P = { a, s: sg, c, cells: new Set() }; planes.set(key, P); }
      P.cells.add(`${idx[(a + 1) % 3]},${idx[(a + 2) % 3]}`);
    }
  }
  const most = Math.max(1, Math.round(s.mergeFaces));
  for (const P of planes.values()) {
    const list = [...P.cells].map(t => t.split(',').map(Number)).sort((p, q) => p[1] - q[1] || p[0] - q[0]);
    const used = new Set();
    const has = (u, v) => P.cells.has(`${u},${v}`) && !used.has(`${u},${v}`);
    for (const [u, v] of list) {
      if (used.has(`${u},${v}`)) continue;
      const mu = 1 + Math.floor(r() * most), mv = 1 + Math.floor(r() * most);
      let u1 = u + 1;
      while (u1 - u < mu && has(u1, v)) u1++;
      let v1 = v + 1;
      grow: while (v1 - v < mv) { for (let a = u; a < u1; a++) if (!has(a, v1)) break grow; v1++; }
      for (let b = v; b < v1; b++) for (let a = u; a < u1; a++) used.add(`${a},${b}`);
      const R = { a: P.a, s: P.s, c: P.c, u0: u, u1, v0: v, v1 };
      W.rects.push(R);
      surfaceRect(W, R, r);
    }
  }
}

// Where the empty layer just off the rectangle is solid beyond one of its sides, another
// wall stands there at a right angle, and its greebles reach this far out: nothing of this
// rectangle's may stand in that strip.
function cornerLimits(G, R) {
  const { a, s, c, u0, u1, v0, v1 } = R, ua = (a + 1) % 3, va = (a + 2) % 3;
  const layer = s > 0 ? c : c - 1;
  const solid = (u, v) => { const p = [0, 0, 0]; p[a] = layer; p[ua] = u; p[va] = v; return cellAt(G, p[0], p[1], p[2]); };
  const any = (fn, lo, hi) => { for (let t = lo; t < hi; t++) if (fn(t)) return true; return false; };
  const keep = snapQ(settings.gDepth + settings.gInset);
  return {
    u0: any(v => solid(u0 - 1, v), v0, v1) ? u0 + keep : u0,
    u1: any(v => solid(u1, v), v0, v1) ? u1 - keep : u1,
    v0: any(u => solid(u, v0 - 1), u0, u1) ? v0 + keep : v0,
    v1: any(u => solid(u, v1), u0, u1) ? v1 - keep : v1,
  };
}

function surfaceRect(W, R, r) {
  const s = settings, { a, c } = R;
  const role = a === 2 ? (R.s > 0 ? 'floor' : 'ceiling') : 'wall';
  const G = makeGreebler(W, a, R.s, c, r);
  const { u0, u1, v0, v1 } = R;
  G.seg(u0, v0, u1, v0, 0); G.seg(u1, v0, u1, v1, 0);
  G.seg(u1, v1, u0, v1, 0); G.seg(u0, v1, u0, v0, 0);
  if (role === 'floor' && s.floor !== 'as the walls') {
    if (s.floor === 'tiles') {
      for (let u = u0 + 0.5; u < u1 - 1e-9; u += 0.5) G.seg(u, v0, u, v1, 0);
      for (let v = v0 + 0.5; v < v1 - 1e-9; v += 0.5) G.seg(u0, v, u1, v, 0);
    }
    return;
  }
  if (s.greeble === 'plain') return;
  G.split(u0, u1, v0, v1, 0, Math.max(Q, s.gDepth), 0, cornerLimits(W.G, R), 0);
}

const MAX_BOXES = 90_000;

// A greebler for one plane: it cuts panels and stands things on them, writing flat lines
// to W.flat and blocks to W.boxes (or, for a floating thing, to its own lists).
function makeGreebler(W, a, sg, c, r, sink) {
  const s = settings, ua = (a + 1) % 3, va = (a + 2) % 3;
  const out = sink || W;
  const P = (u, v, h, o) => { o[a] = c + sg * h; o[ua] = u; o[va] = v; return o; };
  const p0 = [0, 0, 0], p1 = [0, 0, 0];
  const G = {};
  const gMin = Math.max(2 * Q, s.gMin), splitP = clamp(s.gSplit / 100, 0, 0.98);
  const flatP = clamp(s.gFlat / 100, 0, 1), inset = snapQ(Math.max(0, s.gInset));
  const mode = s.greeble;
  G.seg = (ua0, va0, ua1, va1, h) => {
    P(ua0, va0, h, p0); P(ua1, va1, h, p1);
    out.flat.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], a, sg, c + sg * h);
  };
  G.box = (bu0, bu1, bv0, bv1, h0, h1) => {
    if (out.boxes.length >= MAX_BOXES) return false;
    P(bu0, bv0, h0, p0); P(bu1, bv1, h1, p1);
    out.boxes.push([Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.min(p0[2], p1[2]),
                    Math.max(p0[0], p1[0]), Math.max(p0[1], p1[1]), Math.max(p0[2], p1[2])]);
    return true;
  };
  G.split = (u0, u1, v0, v1, h, dmax, level, lim, depth) => {
    const w = u1 - u0, d = v1 - v0, big = Math.max(w, d);
    const canU = w >= 2 * gMin, canV = d >= 2 * gMin;
    if ((canU || canV) && depth < 14 && (big > s.gMax || r() < splitP * (level ? 0.8 : 1))) {
      const alongU = canU && (!canV || (w >= d ? r() < 0.75 : r() < 0.25));
      if (alongU) {
        const t = clamp(snapQ(u0 + w * (0.2 + 0.6 * r())), snapQ(u0 + gMin), u1 - gMin);
        if (t > u0 && t < u1) {
          G.seg(t, v0, t, v1, h);
          G.split(u0, t, v0, v1, h, dmax, level, lim, depth + 1);
          G.split(t, u1, v0, v1, h, dmax, level, lim, depth + 1);
          return;
        }
      } else {
        const t = clamp(snapQ(v0 + d * (0.2 + 0.6 * r())), snapQ(v0 + gMin), v1 - gMin);
        if (t > v0 && t < v1) {
          G.seg(u0, t, u1, t, h);
          G.split(u0, u1, v0, t, h, dmax, level, lim, depth + 1);
          G.split(u0, u1, t, v1, h, dmax, level, lim, depth + 1);
          return;
        }
      }
    }
    G.leaf(u0, u1, v0, v1, h, dmax, level, lim);
  };
  G.leaf = (u0, u1, v0, v1, h, dmax, level, lim) => {
    const bu0 = snapQ(Math.max(u0 + inset, lim.u0)), bu1 = snapQ(Math.min(u1 - inset, lim.u1));
    const bv0 = snapQ(Math.max(v0 + inset, lim.v0)), bv1 = snapQ(Math.min(v1 - inset, lim.v1));
    if (bu1 - bu0 < 2 * Q || bv1 - bv0 < 2 * Q) return;
    let kind;
    const x = r();
    switch (mode) {
      case 'panels':  kind = x < Math.max(flatP, 0.5) ? 'flat' : x < 0.85 ? 'slab' : 'frame'; break;
      case 'towers':  kind = x < flatP * 0.6 ? 'flat' : x < 0.75 ? 'steps' : 'block'; break;
      case 'ribs':    kind = x < flatP * 0.5 ? 'flat' : x < 0.8 ? 'ribs' : 'block'; break;
      case 'mixed':   kind = x < flatP ? 'flat' : ['block', 'steps', 'ribs', 'studs', 'slab', 'frame'][Math.floor(r() * 6)]; break;
      default:        kind = x < flatP ? 'flat' : x < flatP + (1 - flatP) * 0.1 ? 'studs' :
                             x < flatP + (1 - flatP) * 0.2 ? 'ribs' : x < flatP + (1 - flatP) * 0.3 ? 'steps' : 'block';
    }
    const W0 = bu1 - bu0, D0 = bv1 - bv0, short = Math.min(W0, D0);
    const depthOf = (lo, hi) => snapQ(Math.max(Q, dmax * (lo + (hi - lo) * Math.pow(r(), 1.3))));
    switch (kind) {
      case 'flat': return;
      case 'slab': G.box(bu0, bu1, bv0, bv1, h, h + depthOf(0.06, 0.2)); return;
      case 'frame': {
        const e = depthOf(0.08, 0.22), m = snapQ(short * 0.18);
        G.box(bu0, bu1, bv0, bv1, h, h + e);
        if (m >= Q && short - 2 * m > 2 * Q) G.box(bu0 + m, bu1 - m, bv0 + m, bv1 - m, h + e, h + e + snapQ(Math.max(Q, e * 0.5)));
        return;
      }
      case 'steps': {
        const tiers = 2 + Math.floor(r() * 3), step = snapQ(short * (0.08 + 0.08 * r()));
        let hh = h, a0 = bu0, a1 = bu1, b0 = bv0, b1 = bv1;
        for (let t = 0; t < tiers; t++) {
          if (a1 - a0 < 2 * Q || b1 - b0 < 2 * Q) break;
          const e = depthOf(0.15, 0.45);
          if (!G.box(a0, a1, b0, b1, hh, hh + e)) return;
          hh += e;
          a0 += step; a1 -= step; b0 += step; b1 -= step;
          if (step < Q) break;
        }
        return;
      }
      case 'ribs': {
        const alongU = W0 >= D0, len = alongU ? D0 : W0;
        const n = Math.max(1, Math.min(9, Math.floor(len / Math.max(2 * Q, gMin * 0.7))));
        const pitch = len / (2 * n + 1), e = depthOf(0.15, 0.5);
        for (let k = 0; k < n; k++) {
          const t0 = snapQ((alongU ? bv0 : bu0) + pitch * (2 * k + 1)), t1 = snapQ(t0 + Math.max(Q, pitch));
          if (alongU) G.box(bu0, bu1, t0, t1, h, h + e); else G.box(t0, t1, bv0, bv1, h, h + e);
        }
        return;
      }
      case 'studs': {
        const sz = snapQ(Math.max(2 * Q, gMin * 0.5)), gap = sz;
        const nu = Math.floor((W0 + gap) / (sz + gap)), nv = Math.floor((D0 + gap) / (sz + gap));
        if (nu < 1 || nv < 1 || nu * nv > 64) { G.box(bu0, bu1, bv0, bv1, h, h + depthOf(0.1, 0.3)); return; }
        const ou = snapQ(bu0 + (W0 - (nu * sz + (nu - 1) * gap)) / 2), ov = snapQ(bv0 + (D0 - (nv * sz + (nv - 1) * gap)) / 2);
        for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
          const x0 = ou + i * (sz + gap), y0 = ov + j * (sz + gap);
          G.box(x0, x0 + sz, y0, y0 + sz, h, h + sz);
        }
        return;
      }
      default: {
        const e = depthOf(0.12, 1);
        if (!G.box(bu0, bu1, bv0, bv1, h, h + e)) return;
        if (level + 1 < s.gLevels && short > 3 * gMin && r() < 0.6) {
          G.split(bu0, bu1, bv0, bv1, h + e, dmax * 0.45, level + 1, lim, 0);
        }
      }
    }
  };
  return G;
}

////////////////////////////////////////////////////////////////////////////////////////
// Polyhedra
//
// Each is a set of vertices whose convex hull it is, scaled to a circumradius of 1. The
// hull is found the plain way — every plane through three vertices with all the others on
// one side of it — which is quick enough for a hundred points and never wrong about faces
// with many vertices, which is what the plates, frames and struts are made from.

const PHI = (1 + Math.sqrt(5)) / 2;
const POLY_CACHE = new Map();

function dedupe(pts) {
  const m = new Map();
  for (const p of pts) m.set(p.map(v => (Math.abs(v) < 1e-9 ? 0 : v).toFixed(6)).join(','), p);
  return [...m.values()];
}
function signsOf(p) {
  const out = [];
  for (let m = 0; m < 8; m++) out.push([m & 1 ? -p[0] : p[0], m & 2 ? -p[1] : p[1], m & 4 ? -p[2] : p[2]]);
  return out;
}
function cyc(p) { return [[p[0], p[1], p[2]], [p[2], p[0], p[1]], [p[1], p[2], p[0]]]; }
function perms(p) {
  return [[p[0], p[1], p[2]], [p[0], p[2], p[1]], [p[1], p[0], p[2]],
          [p[1], p[2], p[0]], [p[2], p[0], p[1]], [p[2], p[1], p[0]]];
}
function ring(n, z, r, a0) {
  const out = [];
  for (let i = 0; i < n; i++) out.push([r * Math.cos(a0 + 2 * Math.PI * i / n), r * Math.sin(a0 + 2 * Math.PI * i / n), z]);
  return out;
}

function orderFace(P, on, n) {
  const c = [0, 0, 0];
  for (const i of on) { c[0] += P[i][0]; c[1] += P[i][1]; c[2] += P[i][2]; }
  c[0] /= on.length; c[1] /= on.length; c[2] /= on.length;
  const e1 = vnorm(vsub(P[on[0]], c)), e2 = vcross(n, e1);
  return on.map(i => [i, Math.atan2(vdot(vsub(P[i], c), e2), vdot(vsub(P[i], c), e1))])
    .sort((p, q) => p[1] - q[1]).map(p => p[0]);
}

function hull(P) {
  const n = P.length, faces = [], seen = new Set();
  let size = 0;
  for (const p of P) size = Math.max(size, vlen(p));
  const tol = 1e-7 * Math.max(1e-3, size);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const eij = vsub(P[j], P[i]);
    for (let k = j + 1; k < n; k++) {
      const nr = vcross(eij, vsub(P[k], P[i])), L = vlen(nr);
      if (L < 1e-9 * size * size) continue;
      const N = [nr[0] / L, nr[1] / L, nr[2] / L], d = vdot(N, P[i]);
      let pos = false, neg = false;
      for (let m = 0; m < n; m++) {
        const e = vdot(N, P[m]) - d;
        if (e > tol) pos = true; else if (e < -tol) neg = true;
        if (pos && neg) break;
      }
      if (pos && neg) continue;
      const sg = pos ? -1 : 1, Nf = [N[0] * sg, N[1] * sg, N[2] * sg], df = d * sg;
      const on = [];
      for (let m = 0; m < n; m++) if (Math.abs(vdot(Nf, P[m]) - df) <= tol * 10) on.push(m);
      const key = on.join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      faces.push({ idx: orderFace(P, on, Nf), n: Nf, d: df });
    }
  }
  return faces;
}

function unitPoly(V) {
  let R = 0;
  for (const p of V) R = Math.max(R, vlen(p));
  const U = dedupe(V).map(p => vmul(p, 1 / R));
  return { V: U, F: hull(U) };
}

function geodesic(freq) {
  const ico = unitPoly(cyc([0, 1, PHI]).flatMap(signsOf));
  const pts = [];
  for (const f of ico.F) {
    const [a, b, c] = f.idx.map(i => ico.V[i]);
    for (let i = 0; i <= freq; i++) for (let j = 0; j <= freq - i; j++) {
      pts.push(vnorm(vadd(a, vadd(vmul(vsub(b, a), i / freq), vmul(vsub(c, a), j / freq)))));
    }
  }
  return dedupe(pts);
}

function polyOf(kind) {
  if (POLY_CACHE.has(kind)) return POLY_CACHE.get(kind);
  let V;
  switch (kind) {
    case 'tetrahedron': V = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]; break;
    case 'cube': V = signsOf([1, 1, 1]); break;
    case 'octahedron': V = perms([1, 0, 0]).flatMap(signsOf); break;
    case 'dodecahedron': V = [...signsOf([1, 1, 1]), ...cyc([0, 1 / PHI, PHI]).flatMap(signsOf)]; break;
    case 'icosahedron': V = cyc([0, 1, PHI]).flatMap(signsOf); break;
    case 'cuboctahedron': V = perms([1, 1, 0]).flatMap(signsOf); break;
    case 'truncated tetrahedron':
      V = perms([3, 1, 1]).flatMap(signsOf).filter(p => p.filter(v => v < 0).length % 2 === 0); break;
    case 'truncated cube': V = perms([Math.SQRT2 - 1, 1, 1]).flatMap(signsOf); break;
    case 'truncated octahedron': V = perms([0, 1, 2]).flatMap(signsOf); break;
    case 'rhombicuboctahedron': V = perms([1, 1, 1 + Math.SQRT2]).flatMap(signsOf); break;
    case 'icosidodecahedron':
      V = [...perms([0, 0, PHI]).flatMap(signsOf), ...cyc([0.5, PHI / 2, PHI * PHI / 2]).flatMap(signsOf)]; break;
    case 'truncated icosahedron':
      V = [...cyc([0, 1, 3 * PHI]), ...cyc([1, 2 + PHI, 2 * PHI]), ...cyc([PHI, 2, 2 * PHI + 1])].flatMap(signsOf); break;
    case 'geodesic ball': V = geodesic(3); break;
    case 'goldberg ball': {
      const g = unitPoly(geodesic(2));
      V = g.F.map(f => vmul(f.n, 1 / f.d));
      break;
    }
    case 'prism': V = [...ring(6, 0.62, 1, 0), ...ring(6, -0.62, 1, 0)]; break;
    case 'antiprism': V = [...ring(8, 0.42, 1, 0), ...ring(8, -0.42, 1, Math.PI / 8)]; break;
    case 'bipyramid': V = [...ring(5, 0, 0.8, 0), [0, 0, 1.25], [0, 0, -1.25]]; break;
    default: V = signsOf([1, 1, 1]);
  }
  const P = unitPoly(V);
  POLY_CACHE.set(kind, P);
  return P;
}

// A convex polygon, its vertices counter-clockwise about n, moved in by g.
function insetPoly(pts, n, g) {
  const k = pts.length, m = [];
  for (let i = 0; i < k; i++) m.push(vnorm(vcross(n, vsub(pts[(i + 1) % k], pts[i]))));
  const out = [];
  for (let i = 0; i < k; i++) {
    const a = m[(i + k - 1) % k], b = m[i], den = 1 + vdot(a, b);
    if (den < 1e-6) return null;
    out.push(vadd(pts[i], vmul(vadd(a, b), g / den)));
  }
  for (let i = 0; i < k; i++) {
    if (vdot(vsub(pts[(i + 1) % k], pts[i]), vsub(out[(i + 1) % k], out[i])) <= 1e-9) return null;
  }
  return out;
}

function inradius(pts, n) {
  const c = pts.reduce((a, p) => vadd(a, p), [0, 0, 0]).map(v => v / pts.length);
  let r = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const e = vnorm(vsub(pts[(i + 1) % pts.length], pts[i])), m = vcross(n, e);
    r = Math.min(r, vdot(vsub(c, pts[i]), m));
  }
  return r;
}

// Toward the middle of the thing: a point moved along its line from the centre, so that
// every plate is a frustum of the solid angle it stands in and none touches the next.
function towardCentre(pts, n, depth) {
  const h = vdot(n, pts[0]);
  const k = Math.max(0.04, 1 - depth / Math.max(1e-6, h));
  return pts.map(p => vmul(p, k));
}

function styledPieces(P, style, add) {
  const s = settings;
  const g = s.plateGap / 200, t = Math.max(0.01, s.plateThick / 100), ex = s.explode / 100;
  if (style === 'solid') { add(P.V); return; }
  if (style === 'struts') {
    const w = Math.max(0.005, s.strutW / 100), nr = Math.max(0.005, s.nodeSize / 100);
    const seen = new Set();
    for (const f of P.F) {
      for (let i = 0; i < f.idx.length; i++) {
        const a = f.idx[i], b = f.idx[(i + 1) % f.idx.length], key = a < b ? `${a},${b}` : `${b},${a}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const A = P.V[a], B = P.V[b], e = vnorm(vsub(B, A)), mid = vmul(vadd(A, B), 0.5);
        const s1 = vnorm(vsub(mid, vmul(e, vdot(mid, e)))), s2 = vcross(e, s1);
        const A1 = vadd(A, vmul(e, nr * 0.9)), B1 = vsub(B, vmul(e, nr * 0.9));
        const pts = [];
        for (const q of [A1, B1]) for (const u of [-1, 1]) for (const v of [-1, 1]) {
          pts.push(vadd(q, vadd(vmul(s1, u * w / 2), vmul(s2, v * w / 2))));
        }
        add(pts);
      }
    }
    for (const V of P.V) {
      const z = vnorm(V), x = vnorm(vcross(z, Math.abs(z[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0])), y = vcross(z, x);
      const pts = [];
      for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) {
        pts.push(vadd(V, vadd(vmul(x, a * nr), vadd(vmul(y, b * nr), vmul(z, c * nr)))));
      }
      add(pts);
    }
    return;
  }
  for (const f of P.F) {
    const pts = f.idx.map(i => P.V[i]), n = f.n;
    const outer = insetPoly(pts, n, g);
    if (!outer) continue;
    const top = outer.map(p => vadd(p, vmul(n, ex)));
    if (style === 'plates') { add([...top, ...towardCentre(top, n, t)]); continue; }
    const fw = inradius(outer, n) * clamp(s.frameW / 100, 0.02, 0.95);
    const inner = insetPoly(outer, n, fw);
    if (!inner) { add([...top, ...towardCentre(top, n, t)]); continue; }
    const itop = inner.map(p => vadd(p, vmul(n, ex)));
    for (let i = 0; i < top.length; i++) {
      const j = (i + 1) % top.length, q = [top[i], top[j], itop[j], itop[i]];
      add([...q, ...towardCentre(q, n, t)]);
    }
    if (style === 'framed') {
      const sunk = t * clamp(s.panelSunk / 100, 0, 0.9);
      const ptop = towardCentre(itop, n, sunk);
      add([...ptop, ...towardCentre(ptop, n, Math.max(0.01, (t - sunk) * 0.7))]);
    }
  }
}

function boxPts(x0, y0, z0, x1, y1, z1) {
  const out = [];
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) out.push([x, y, z]);
  return out;
}

function turnPts(pts, ax, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return pts.map(([x, y, z]) => ax === 2 ? [x * c - y * s, x * s + y * c, z] :
                                ax === 1 ? [x * c + z * s, y, -x * s + z * c] :
                                           [x, y * c - z * s, y * s + z * c]);
}

function ringPieces(add, R, rw, hh, n, ax, ang) {
  for (let k = 0; k < n; k++) {
    const a0 = 2 * Math.PI * k / n, a1 = 2 * Math.PI * (k + 1) / n, pts = [];
    for (const a of [a0, a1]) for (const r of [R - rw, R]) for (const z of [-hh, hh]) {
      pts.push([r * Math.cos(a), r * Math.sin(a), z]);
    }
    add(ax === 2 && !ang ? pts : turnPts(pts, ax, ang));
  }
}

// One floating thing, in its own unit ball: its pieces as point sets (each convex), and any
// lines lying on its faces, as [p, q, normal].
function thingParts(kind, style, r) {
  const parts = [], lines = [];
  const add = pts => parts.push(pts);
  switch (kind) {
    case 'star': {
      const P = polyOf(r() < 0.5 ? 'dodecahedron' : 'icosahedron');
      const k = 1 / (1 + 0.9 * 0.79);
      add(P.V.map(p => vmul(p, k)));
      for (const f of P.F) {
        const apex = vmul(f.n, f.d * 1.9 * k);
        add([...f.idx.map(i => vmul(P.V[i], k)), apex]);
      }
      break;
    }
    case 'stella octangula': {
      const P = polyOf('octahedron'), a = Math.SQRT2, k = 0.62;
      add(P.V.map(p => vmul(p, k)));
      for (const f of P.F) {
        const pts = f.idx.map(i => P.V[i]), c = vmul(pts.reduce((x, y) => vadd(x, y), [0, 0, 0]), 1 / 3);
        add([...pts.map(p => vmul(p, k)), vmul(vadd(c, vmul(f.n, a * Math.sqrt(2 / 3))), k)]);
      }
      break;
    }
    case 'menger cube': {
      const h = 1 / Math.sqrt(3), cell = 2 * h / 9, solid = (i, j, k) => {
        for (let p = 1; p <= 3; p *= 3) {
          const ones = (Math.floor(i / p) % 3 === 1) + (Math.floor(j / p) % 3 === 1) + (Math.floor(k / p) % 3 === 1);
          if (ones >= 2) return false;
        }
        return true;
      };
      const G = newGrid(9, 9, 9, 0, 0);
      for (let k = 0; k < 9; k++) for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) if (solid(i, j, k)) setCell(G, i, j, k, 1);
      for (const [i0, j0, k0, i1, j1, k1] of mergeCells(G)) {
        add(boxPts(-h + i0 * cell, -h + j0 * cell, -h + k0 * cell, -h + i1 * cell, -h + j1 * cell, -h + k1 * cell));
      }
      break;
    }
    case 'cube cluster': {
      const c = 0.42, sink = { flat: [], boxes: [] };
      add(boxPts(-c, -c, -c, c, c, c));
      const lim = { u0: -c + 0.2, u1: c - 0.2, v0: -c + 0.2, v1: c - 0.2 };
      for (let a = 0; a < 3; a++) for (const sg of [-1, 1]) {
        const G = makeGreebler(null, a, sg, sg * c, r, sink);
        G.split(-c, c, -c, c, 0, 0.18, 0, lim, 0);
      }
      for (const b of sink.boxes) add(boxPts(...b));
      const F = sink.flat;
      for (let i = 0; i < F.length; i += 9) {
        const nrm = [0, 0, 0];
        nrm[F[i + 6]] = F[i + 7];
        lines.push([[F[i], F[i + 1], F[i + 2]], [F[i + 3], F[i + 4], F[i + 5]], nrm]);
      }
      // the outline of each face of the core
      for (let a = 0; a < 3; a++) for (const sg of [-1, 1]) {
        const ua = (a + 1) % 3, va = (a + 2) % 3, nrm = [0, 0, 0];
        nrm[a] = sg;
        const P = (u, v) => { const p = [0, 0, 0]; p[a] = sg * c; p[ua] = u; p[va] = v; return p; };
        const cs = [P(-c, -c), P(c, -c), P(c, c), P(-c, c)];
        for (let i = 0; i < 4; i++) lines.push([cs[i], cs[(i + 1) % 4], nrm]);
      }
      break;
    }
    case 'ring': ringPieces(add, 1, 0.2, 0.11, 28, 2, 0); break;
    case 'gyroscope': {
      ringPieces(add, 1, 0.12, 0.07, 32, 2, 0);
      ringPieces(add, 0.82, 0.12, 0.07, 28, 0, Math.PI / 2);
      ringPieces(add, 0.64, 0.12, 0.07, 24, 1, Math.PI / 2);
      add(polyOf('icosahedron').V.map(p => vmul(p, 0.24)));
      break;
    }
    case 'monolith': {
      const k = 1 / Math.hypot(1, 4, 9);
      add(boxPts(-k, -4 * k, -9 * k, k, 4 * k, 9 * k));
      break;
    }
    case 'stairs': {
      const n = 13;
      for (let k = 0; k < n; k++) {
        const z = -0.9 + 1.8 * k / (n - 1);
        add(turnPts(boxPts(0.16, -0.17, z - 0.035, 0.98, 0.17, z + 0.035), 2, k * 0.52));
      }
      add([...ring(10, 0.98, 0.16, 0), ...ring(10, -0.98, 0.16, 0)]);
      break;
    }
    case 'nested cubes': {
      const P = polyOf('cube');
      const sub = (k, ang) => styledPieces({ V: P.V.map(p => vmul(p, k)), F: P.F }, 'struts', pts => add(turnPts(pts, 2, ang)));
      sub(1, 0); sub(0.62, Math.PI / 4); sub(0.36, Math.PI / 8 + r());
      break;
    }
    default: {
      styledPieces(polyOf(kind), style, add);
      const core = settings.coreKind;
      if (core !== 'none' && style !== 'solid' && POLY_KINDS.includes(core)) {
        add(polyOf(core).V.map(p => vmul(p, 0.4)));
      }
    }
  }
  return { parts, lines };
}

function mergeCells(G) {
  const { nx, ny, nz } = G, done = new Uint8Array(nx * ny * nz), out = [];
  const at = (i, j, k) => cellAt(G, i, j, k) === 1 && !done[(k * ny + j) * nx + i];
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (!at(i, j, k)) continue;
    let i1 = i + 1;
    while (i1 < nx && at(i1, j, k)) i1++;
    let j1 = j + 1;
    g1: while (j1 < ny) { for (let a = i; a < i1; a++) if (!at(a, j1, k)) break g1; j1++; }
    let k1 = k + 1;
    g2: while (k1 < nz) { for (let b = j; b < j1; b++) for (let a = i; a < i1; a++) if (!at(a, b, k1)) break g2; k1++; }
    for (let c = k; c < k1; c++) for (let b = j; b < j1; b++) for (let a = i; a < i1; a++) done[(c * ny + b) * nx + a] = 1;
    out.push([i, j, k, i1, j1, k1]);
  }
  return out;
}

function randomTurn(r) {
  // a uniform rotation, from a uniform quaternion
  const u1 = r(), u2 = r() * 2 * Math.PI, u3 = r() * 2 * Math.PI;
  const a = Math.sqrt(1 - u1), b = Math.sqrt(u1);
  const x = a * Math.sin(u2), y = a * Math.cos(u2), z = b * Math.sin(u3), w = b * Math.cos(u3);
  return [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
          [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
          [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]];
}

function mat3(M, p) {
  return [M[0][0] * p[0] + M[0][1] * p[1] + M[0][2] * p[2],
          M[1][0] * p[0] + M[1][1] * p[1] + M[1][2] * p[2],
          M[2][0] * p[0] + M[2][1] * p[1] + M[2][2] * p[2]];
}

// Is a ball of radius R at C clear of every solid cell, greebles and all?
function clearOf(G, C, R) {
  const m = R + settings.gDepth + 0.05;
  for (let k = Math.floor(C[2] - m); k <= Math.floor(C[2] + m); k++)
    for (let j = Math.floor(C[1] - m); j <= Math.floor(C[1] + m); j++)
      for (let i = Math.floor(C[0] - m); i <= Math.floor(C[0] + m); i++) {
        if (!cellAt(G, i, j, k)) continue;
        const dx = Math.max(i - C[0], 0, C[0] - i - 1), dy = Math.max(j - C[1], 0, C[1] - j - 1);
        const dz = Math.max(k - C[2], 0, C[2] - k - 1);
        if (dx * dx + dy * dy + dz * dz < m * m) return false;
      }
  return true;
}

function floatingThings(W, r) {
  const s = settings, V = W.void, n = Math.round(s.objects);
  if (n <= 0) return;
  const size = [V.x1 - V.x0, V.y1 - V.y0, V.z1 - V.z0];
  const mid = [V.x0 + size[0] * s.objX / 100, V.y0 + size[1] * s.objY / 100, V.z0 + size[2] * s.objZ / 100];
  const spread = Math.max(0, s.objSpread);
  const placed = [];
  const longAx = size[0] >= size[1] ? 0 : 1;
  for (let i = 0; i < n; i++) {
    let R = Math.max(0.05, s.objSize * (1 - clamp(s.objSizeVar, 0, 95) / 100 * r()));
    let C = null;
    for (let tries = 0; tries < 40 && !C; tries++) {
      let p;
      const f = n > 1 ? i / (n - 1) : 0.5, jit = () => (r() - 0.5) * 0.3 * spread;
      switch (s.objPlace) {
        case 'scatter':
          p = [V.x0 + r() * size[0], V.y0 + r() * size[1], V.z0 + r() * size[2]]; break;
        case 'ring': {
          const a = 2 * Math.PI * i / n + (tries ? r() : 0);
          p = [mid[0] + spread * Math.cos(a), mid[1] + spread * Math.sin(a), mid[2] + (tries ? jit() : 0)];
          break;
        }
        case 'column':
          p = [mid[0] + (tries ? jit() : 0), mid[1] + (tries ? jit() : 0),
               V.z0 + R + f * Math.max(0, size[2] - 2 * R)]; break;
        case 'line': {
          p = mid.slice();
          p[longAx] = [V.x0, V.y0][longAx] + R + f * Math.max(0, size[longAx] - 2 * R);
          if (tries) { p[2] += jit(); p[1 - longAx] += jit(); }
          break;
        }
        case 'spiral': {
          const a = 2.4 * i + (tries ? r() : 0);
          p = [mid[0] + spread * Math.cos(a), mid[1] + spread * Math.sin(a), V.z0 + R + f * Math.max(0, size[2] - 2 * R)];
          break;
        }
        default: {
          // cluster: within the ball of the spread round the middle
          let q;
          do q = [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]; while (vdot(q, q) > 1);
          p = vadd(mid, vmul(q, i === 0 && !tries ? 0 : spread));
        }
      }
      const ok = clearOf(W.G, p, R) && placed.every(t => vlen(vsub(t.C, p)) > t.R + R + 0.08);
      if (ok) C = p; else if (tries > 20) R *= 0.92;
    }
    if (!C) continue;
    let kind = s.objKind;
    if (kind === 'mixed') kind = OBJ_KINDS[1 + Math.floor(r() * (OBJ_KINDS.length - 1))];
    let style = s.objStyle;
    if (style === 'mixed') style = ['plates', 'framed', 'cage', 'struts', 'solid', 'plates'][Math.floor(r() * 6)];
    const M = s.objTurn === 'random' ? randomTurn(r) : s.objTurn === 'upright' ?
      (() => { const a = r() * 2 * Math.PI, c = Math.cos(a), sn = Math.sin(a); return [[c, -sn, 0], [sn, c, 0], [0, 0, 1]]; })() :
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const { parts, lines } = thingParts(kind, style, r);
    const T = { C, R, M, kind, style, first: W.pieces.length, lines: [] };
    const toW = p => vadd(C, vmul(mat3(M, p), R));
    for (const pts of parts) {
      const F = hull(pts);
      if (F.length < 4) continue;
      const Vw = pts.map(toW);
      W.pieces.push({
        V: Vw, thing: placed.length,
        F: F.map(f => { const nn = mat3(M, f.n); return { idx: f.idx, n: nn, d: vdot(nn, Vw[f.idx[0]]) }; }),
      });
    }
    for (const [p, q, nr] of lines) T.lines.push([toW(p), toW(q), mat3(M, nr)]);
    T.last = W.pieces.length;
    placed.push(T);
  }
  W.things = placed;
  for (const pc of W.pieces) pc.E = pieceEdges(pc);
}

function pieceEdges(pc) {
  const map = new Map();
  pc.F.forEach((f, fi) => {
    for (let i = 0; i < f.idx.length; i++) {
      const a = f.idx[i], b = f.idx[(i + 1) % f.idx.length], key = a < b ? a * 4096 + b : b * 4096 + a;
      const e = map.get(key);
      if (e) e[3] = fi; else map.set(key, [Math.min(a, b), Math.max(a, b), fi, -1]);
    }
  });
  return [...map.values()];
}

////////////////////////////////////////////////////////////////////////////////////////
// What hides what
//
// Every solid is convex: a set of planes n·X ≤ d. The walls are boxes, the greebles are
// boxes, each piece of a floating thing is a hull. They sit in a bounding volume hierarchy.
//
// A point P of a segment A→B is hidden from the eye E when some solid holds a point of the
// segment E→P short of P. Write that point X = E + u·(A − E) + v·(B − A): for P = A + t·(B − A)
// it is u = s, v = s·t with s in [0, 1), so the points of the triangle E, A, B are exactly the
// (u, v) with 0 ≤ v ≤ u ≤ 1, and every plane of a solid is a straight line in (u, v). Clip the
// triangle by those lines; what is left is a convex polygon, and the t = v/u of its corners
// span exactly the part of the segment that solid hides. A sun is the same with
// X = A + t·(B − A) + s·L; a lamp is an eye.

function gatherSolids(W) {
  const n = W.walls.length + W.boxes.length + W.pieces.length;
  let planes = (W.walls.length + W.boxes.length) * 6;
  for (const pc of W.pieces) planes += pc.F.length;
  const bb = new Float64Array(n * 6), off = new Int32Array(n + 1), pl = new Float64Array(planes * 4);
  const kind = new Uint8Array(n);
  let at = 0, p = 0;
  const box = (b, k) => {
    bb.set(b, at * 6);
    off[at] = p;
    const [x0, y0, z0, x1, y1, z1] = b;
    pl.set([-1, 0, 0, -x0, 1, 0, 0, x1, 0, -1, 0, -y0, 0, 1, 0, y1, 0, 0, -1, -z0, 0, 0, 1, z1], p * 4);
    p += 6;
    kind[at++] = k;
  };
  for (const b of W.walls) box(b, 0);
  for (const b of W.boxes) box(b, 1);
  for (const pc of W.pieces) {
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (const v of pc.V) {
      x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); z0 = Math.min(z0, v[2]);
      x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); z1 = Math.max(z1, v[2]);
    }
    bb.set([x0, y0, z0, x1, y1, z1], at * 6);
    off[at] = p;
    for (const f of pc.F) { pl.set([f.n[0], f.n[1], f.n[2], f.d], p * 4); p++; }
    kind[at++] = 2;
  }
  off[n] = p;
  return { n, bb, off, pl, kind };
}

function buildBVH(S) {
  const n = S.n, order = new Int32Array(n), cen = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    order[i] = i;
    for (let a = 0; a < 3; a++) cen[i * 3 + a] = (S.bb[i * 6 + a] + S.bb[i * 6 + 3 + a]) / 2;
  }
  const cap = Math.max(4, 2 * n);
  const nb = new Float64Array(cap * 6), left = new Int32Array(cap), right = new Int32Array(cap);
  const start = new Int32Array(cap), count = new Int32Array(cap);
  let nodes = 0;
  const build = (lo, hi) => {
    const id = nodes++;
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    let c0 = [Infinity, Infinity, Infinity], c1 = [-Infinity, -Infinity, -Infinity];
    for (let k = lo; k < hi; k++) {
      const i = order[k], o = i * 6;
      if (S.bb[o] < x0) x0 = S.bb[o]; if (S.bb[o + 1] < y0) y0 = S.bb[o + 1]; if (S.bb[o + 2] < z0) z0 = S.bb[o + 2];
      if (S.bb[o + 3] > x1) x1 = S.bb[o + 3]; if (S.bb[o + 4] > y1) y1 = S.bb[o + 4]; if (S.bb[o + 5] > z1) z1 = S.bb[o + 5];
      for (let a = 0; a < 3; a++) { const c = cen[i * 3 + a]; if (c < c0[a]) c0[a] = c; if (c > c1[a]) c1[a] = c; }
    }
    nb.set([x0, y0, z0, x1, y1, z1], id * 6);
    if (hi - lo <= 4) { left[id] = -1; start[id] = lo; count[id] = hi - lo; return id; }
    let ax = 0;
    for (let a = 1; a < 3; a++) if (c1[a] - c0[a] > c1[ax] - c0[ax]) ax = a;
    const part = Array.from(order.subarray(lo, hi)).sort((p, q) => cen[p * 3 + ax] - cen[q * 3 + ax]);
    order.set(part, lo);
    const m = (lo + hi) >> 1;
    left[id] = build(lo, m);
    right[id] = build(m, hi);
    count[id] = 0;
    return id;
  };
  if (n) build(0, n);
  return { order, nb, left, right, start, count, nodes };
}

// The query: a bounding box, a plane the region straddles, and three planes it lies on the
// positive side of. Filled in before every walk of the tree.
const QB = new Float64Array(6);
const QP = new Float64Array(16);      // 4 planes: nx, ny, nz, w (n·X + w); the first two-sided
let SPAN_MODE = 0;                     // 0 from a point (eye or lamp), 1 from the sun
const SE = new Float64Array(3), SA = new Float64Array(3), SB = new Float64Array(3), SL = new Float64Array(3);
let SMAX = 0;
let HID = new Float64Array(512);
let HN = 0;
const STACK = new Int32Array(512);
const PU = new Float64Array(64), PV = new Float64Array(64), RU = new Float64Array(64), RV = new Float64Array(64);
let CANDIDATES = 0;

function boxPasses(b, o) {
  if (b[o] > QB[3] || b[o + 3] < QB[0] || b[o + 1] > QB[4] || b[o + 4] < QB[1] ||
      b[o + 2] > QB[5] || b[o + 5] < QB[2]) return false;
  const cx = (b[o] + b[o + 3]) / 2, cy = (b[o + 1] + b[o + 4]) / 2, cz = (b[o + 2] + b[o + 5]) / 2;
  const ex = (b[o + 3] - b[o]) / 2, ey = (b[o + 4] - b[o + 1]) / 2, ez = (b[o + 5] - b[o + 2]) / 2;
  for (let q = 0; q < 4; q++) {
    const nx = QP[q * 4], ny = QP[q * 4 + 1], nz = QP[q * 4 + 2];
    const c = nx * cx + ny * cy + nz * cz + QP[q * 4 + 3];
    const r = Math.abs(nx) * ex + Math.abs(ny) * ey + Math.abs(nz) * ez;
    if (q === 0) { if (c > r || c < -r) return false; }
    else if (c + r < 0) return false;
  }
  return true;
}

function setPlane(q, nx, ny, nz, px, py, pz) {
  QP[q * 4] = nx; QP[q * 4 + 1] = ny; QP[q * 4 + 2] = nz; QP[q * 4 + 3] = -(nx * px + ny * py + nz * pz);
}

// Clip the polygon in PU/PV (n corners) by α·x + β·y ≤ γ; returns the new count.
function clipPoly(n, al, be, ga) {
  let m = 0;
  for (let i = 0; i < n; i++) {
    const j = i + 1 === n ? 0 : i + 1;
    const ui = PU[i], vi = PV[i], uj = PU[j], vj = PV[j];
    const di = al * ui + be * vi - ga, dj = al * uj + be * vj - ga;
    if (di <= 0) { RU[m] = ui; RV[m] = vi; m++; }
    if ((di < 0 && dj > 0) || (di > 0 && dj < 0)) {
      const t = di / (di - dj);
      RU[m] = ui + (uj - ui) * t; RV[m] = vi + (vj - vi) * t; m++;
    }
  }
  for (let i = 0; i < m; i++) { PU[i] = RU[i]; PV[i] = RV[i]; }
  return m;
}

function solidSpan(S, i) {
  const o0 = S.off[i], o1 = S.off[i + 1], pl = S.pl;
  let n;
  if (SPAN_MODE === 0) {
    const ax = SA[0] - SE[0], ay = SA[1] - SE[1], az = SA[2] - SE[2];
    const bx = SB[0] - SA[0], by = SB[1] - SA[1], bz = SB[2] - SA[2];
    PU[0] = 0; PV[0] = 0; PU[1] = 1; PV[1] = 0; PU[2] = 1; PV[2] = 1; n = 3;
    for (let p = o0; p < o1 && n; p++) {
      const nx = pl[p * 4], ny = pl[p * 4 + 1], nz = pl[p * 4 + 2], d = pl[p * 4 + 3];
      n = clipPoly(n, nx * ax + ny * ay + nz * az, nx * bx + ny * by + nz * bz,
                   d - HIDE_EPS - (nx * SE[0] + ny * SE[1] + nz * SE[2]));
    }
    if (n < 2) return false;
    let t0 = Infinity, t1 = -Infinity;
    for (let k = 0; k < n; k++) {
      if (PU[k] < 1e-12) { t0 = 0; t1 = 1; break; }
      const t = PV[k] / PU[k];
      if (t < t0) t0 = t; if (t > t1) t1 = t;
    }
    if (t1 - t0 < 1e-9) return false;
    pushSpan(Math.max(0, t0), Math.min(1, t1));
    return true;
  }
  const bx = SB[0] - SA[0], by = SB[1] - SA[1], bz = SB[2] - SA[2];
  const s0 = 1e-5;
  PU[0] = 0; PV[0] = s0; PU[1] = 1; PV[1] = s0; PU[2] = 1; PV[2] = SMAX; PU[3] = 0; PV[3] = SMAX; n = 4;
  for (let p = o0; p < o1 && n; p++) {
    const nx = pl[p * 4], ny = pl[p * 4 + 1], nz = pl[p * 4 + 2], d = pl[p * 4 + 3];
    n = clipPoly(n, nx * bx + ny * by + nz * bz, nx * SL[0] + ny * SL[1] + nz * SL[2],
                 d - HIDE_EPS - (nx * SA[0] + ny * SA[1] + nz * SA[2]));
  }
  if (n < 2) return false;
  let t0 = Infinity, t1 = -Infinity;
  for (let k = 0; k < n; k++) { if (PU[k] < t0) t0 = PU[k]; if (PU[k] > t1) t1 = PU[k]; }
  if (t1 - t0 < 1e-9) return false;
  pushSpan(Math.max(0, t0), Math.min(1, t1));
  return true;
}

function pushSpan(a, b) {
  if (HN * 2 + 2 > HID.length) { const g = new Float64Array(HID.length * 2); g.set(HID); HID = g; }
  HID[HN * 2] = a; HID[HN * 2 + 1] = b; HN++;
}

// Sort and merge the spans; true when they cover the whole segment.
function mergeSpans() {
  if (HN < 2) return HN === 1 && HID[0] <= 1e-9 && HID[1] >= 1 - 1e-9;
  const list = [];
  for (let i = 0; i < HN; i++) list.push([HID[i * 2], HID[i * 2 + 1]]);
  list.sort((p, q) => p[0] - q[0]);
  let m = 0;
  for (const [a, b] of list) {
    if (m && a <= HID[m * 2 - 1] + 1e-9) { if (b > HID[m * 2 - 1]) HID[m * 2 - 1] = b; }
    else { HID[m * 2] = a; HID[m * 2 + 1] = b; m++; }
  }
  HN = m;
  return m === 1 && HID[0] <= 1e-9 && HID[1] >= 1 - 1e-9;
}

function walk(W) {
  const S = W.solids, T = W.bvh;
  if (!S.n) return false;
  let sp = 0;
  STACK[sp++] = 0;
  while (sp) {
    const id = STACK[--sp];
    if (!boxPasses(T.nb, id * 6)) continue;
    if (T.left[id] < 0) {
      for (let k = T.start[id], e = k + T.count[id]; k < e; k++) {
        const i = T.order[k];
        if (!boxPasses(S.bb, i * 6)) continue;
        CANDIDATES++;
        if (solidSpan(S, i) && HID[HN * 2 - 2] <= 1e-9 && HID[HN * 2 - 1] >= 1 - 1e-9) return true;
      }
    } else {
      STACK[sp++] = T.left[id];
      STACK[sp++] = T.right[id];
    }
  }
  return mergeSpans();
}

// The parts of A→B hidden from the point E; spans of t in HID[0 .. 2·HN). True: all of it.
function hiddenFrom(W, E, A, B) {
  HN = 0;
  SPAN_MODE = 0;
  SE[0] = E[0]; SE[1] = E[1]; SE[2] = E[2];
  SA[0] = A[0]; SA[1] = A[1]; SA[2] = A[2];
  SB[0] = B[0]; SB[1] = B[1]; SB[2] = B[2];
  const ax = A[0] - E[0], ay = A[1] - E[1], az = A[2] - E[2];
  const cx = B[0] - E[0], cy = B[1] - E[1], cz = B[2] - E[2];
  const nx = ay * cz - az * cy, ny = az * cx - ax * cz, nz = ax * cy - ay * cx;
  if (nx * nx + ny * ny + nz * nz < 1e-20) return true;   // seen end on: a dot
  QB[0] = Math.min(E[0], A[0], B[0]); QB[1] = Math.min(E[1], A[1], B[1]); QB[2] = Math.min(E[2], A[2], B[2]);
  QB[3] = Math.max(E[0], A[0], B[0]); QB[4] = Math.max(E[1], A[1], B[1]); QB[5] = Math.max(E[2], A[2], B[2]);
  setPlane(0, nx, ny, nz, E[0], E[1], E[2]);
  // the side through E and A, B on its positive side; through E and B; through A and B
  let mx = ny * az - nz * ay, my = nz * ax - nx * az, mz = nx * ay - ny * ax;
  if (mx * cx + my * cy + mz * cz < 0) { mx = -mx; my = -my; mz = -mz; }
  setPlane(1, mx, my, mz, E[0], E[1], E[2]);
  mx = ny * cz - nz * cy; my = nz * cx - nx * cz; mz = nx * cy - ny * cx;
  if (mx * ax + my * ay + mz * az < 0) { mx = -mx; my = -my; mz = -mz; }
  setPlane(2, mx, my, mz, E[0], E[1], E[2]);
  const bx = B[0] - A[0], by = B[1] - A[1], bz = B[2] - A[2];
  mx = ny * bz - nz * by; my = nz * bx - nx * bz; mz = nx * by - ny * bx;
  if (-(mx * ax + my * ay + mz * az) < 0) { mx = -mx; my = -my; mz = -mz; }
  setPlane(3, mx, my, mz, A[0], A[1], A[2]);
  return walk(WORLD);
}

// The parts of A→B in the shadow of the sun, which shines from L (unit, towards it).
function shadowOfSun(W, A, B, L, reach) {
  HN = 0;
  SPAN_MODE = 1;
  SMAX = reach;
  SA[0] = A[0]; SA[1] = A[1]; SA[2] = A[2];
  SB[0] = B[0]; SB[1] = B[1]; SB[2] = B[2];
  SL[0] = L[0]; SL[1] = L[1]; SL[2] = L[2];
  const bx = B[0] - A[0], by = B[1] - A[1], bz = B[2] - A[2];
  const nx = by * L[2] - bz * L[1], ny = bz * L[0] - bx * L[2], nz = bx * L[1] - by * L[0];
  if (nx * nx + ny * ny + nz * nz < 1e-20) return false;
  const fx = L[0] * reach, fy = L[1] * reach, fz = L[2] * reach;
  QB[0] = Math.min(A[0], B[0], A[0] + fx, B[0] + fx); QB[3] = Math.max(A[0], B[0], A[0] + fx, B[0] + fx);
  QB[1] = Math.min(A[1], B[1], A[1] + fy, B[1] + fy); QB[4] = Math.max(A[1], B[1], A[1] + fy, B[1] + fy);
  QB[2] = Math.min(A[2], B[2], A[2] + fz, B[2] + fz); QB[5] = Math.max(A[2], B[2], A[2] + fz, B[2] + fz);
  setPlane(0, nx, ny, nz, A[0], A[1], A[2]);
  let mx = ny * L[2] - nz * L[1], my = nz * L[0] - nx * L[2], mz = nx * L[1] - ny * L[0];
  if (mx * bx + my * by + mz * bz < 0) { mx = -mx; my = -my; mz = -mz; }
  setPlane(1, mx, my, mz, A[0], A[1], A[2]);
  setPlane(2, -mx, -my, -mz, B[0], B[1], B[2]);
  mx = ny * bz - nz * by; my = nz * bx - nx * bz; mz = nx * by - ny * bx;
  if (mx * L[0] + my * L[1] + mz * L[2] < 0) { mx = -mx; my = -my; mz = -mz; }
  setPlane(3, mx, my, mz, A[0], A[1], A[2]);
  return walk(W);
}

////////////////////////////////////////////////////////////////////////////////////////
// The eye and its lens
//
// A lens here is anything that takes a direction from the eye to a point on the paper.
// The radial ones work by the angle θ off the axis: a pinhole tan θ, the fisheyes θ (the
// equidistant one), 2 sin θ/2 (equisolid), sin θ (orthographic), 2 tan θ/2 (stereographic).
// The mirrors are what a camera sees in a convex mirror in front of it — so the middle of the
// picture is what is behind the eye — after the unified model of catadioptric cameras,
// (1 + ξ) sin θ / (cos θ + ξ): ξ = 1 is the paraboloid, 0 < ξ < 1 a hyperboloid. The discs
// put the whole sphere of directions into a disc the way the hyperbolic plane is put there,
// conformally (Poincaré) or with geodesics straight (Klein). The cylinders work by the
// longitude λ round the eye's up and the latitude φ: equirectangular (λ, φ), the cylinder
// (λ, tan φ), Mercator, Pannini's, Hammer's equal-area ellipse of everything, and the tunnel,
// which is log-polar about the axis: rings round it come out as straight rows.

const PK = { 'perspective': 0, 'fisheye': 1, 'equisolid': 2, 'orthographic': 3, 'stereographic': 4,
  'parabolic mirror': 5, 'hyperbolic mirror': 6, 'Poincaré disc': 7, 'Klein disc': 8, 'panorama': 9,
  'cylinder': 10, 'Mercator': 11, 'Pannini': 12, 'Hammer': 13, 'tunnel': 14 };

let CAM = null;
let PX = 0, PY = 0;

function radialOf(C, t) {
  switch (C.kind) {
    case 0: return Math.tan(t);
    case 1: return t;
    case 2: return 2 * Math.sin(t / 2);
    case 3: return Math.sin(t);
    case 4: return 2 * Math.tan(t / 2);
    case 5: case 6: return (1 + C.xi) * Math.sin(t) / (Math.cos(t) + C.xi);
    case 7: return 2 / C.k * Math.tanh(C.k * t / 2);
    case 8: return Math.tanh(C.k * t) / C.k;
  }
  return t;
}

function eyeAt(W) {
  const s = settings, V = W.void;
  return [V.x0 + (V.x1 - V.x0) * s.camX / 100, V.y0 + (V.y1 - V.y0) * s.camY / 100,
          V.z0 + (V.z1 - V.z0) * s.camZ / 100];
}

function eyeAxes() {
  const s = settings, ya = rad(s.yaw), pa = rad(s.pitch), ro = rad(s.roll);
  const f = [Math.sin(ya) * Math.cos(pa), Math.cos(ya) * Math.cos(pa), Math.sin(pa)];
  const r0 = [Math.cos(ya), -Math.sin(ya), 0], u0 = vcross(r0, f);
  const r = vadd(vmul(r0, Math.cos(ro)), vmul(u0, Math.sin(ro)));
  const u = vsub(vmul(u0, Math.cos(ro)), vmul(r0, Math.sin(ro)));
  return { r, u, f };
}

function makeCamera(W) {
  const s = settings, E = eyeAt(W), { r, u, f } = eyeAxes();
  const kind = PK[s.projection] ?? 1;
  const half = rad(clamp(s.fov, 1, 360)) / 2;
  const C = {
    E, ex: E[0], ey: E[1], ez: E[2], rx: r[0], ry: r[1], rz: r[2], ux: u[0], uy: u[1], uz: u[2],
    fx: f[0], fy: f[1], fz: f[2], kind, xi: kind === 5 ? 1 : clamp(s.mirrorXi, 0, 0.99),
    k: Math.max(0.05, s.discK), d: clamp(s.pannini, 0, 3), far2: Math.pow(Math.max(1, s.farthest), 2),
    sq: clamp(s.squeeze, 20, 500) / 100, swirl: rad(s.swirl), barrel: s.barrel / 100,
    tmin: 0, tmax: Math.PI, lmax: Math.PI, phimax: Math.PI / 2, py0: 0, S: 1,
  };
  switch (kind) {
    case 0: C.tmax = Math.min(half, rad(85)); break;
    case 3: C.tmax = Math.min(half, Math.PI / 2); break;
    case 4: C.tmax = Math.min(half, rad(178)); break;
    case 5: C.tmax = Math.min(half, rad(178)); break;
    case 6: C.tmax = Math.min(half, Math.acos(-C.xi) - 0.03); break;
    case 14: C.tmax = Math.min(half, rad(179)); C.tmin = rad(3); break;
    default: C.tmax = Math.min(half, Math.PI);
  }
  const P = PIC, halfW = (P.x1 - P.x0) / 2, halfH = (P.y1 - P.y0) / 2;
  C.cx = P.cx + clamp(s.shiftX, -100, 100) / 100 * halfW;
  C.cy = P.cy - clamp(s.shiftY, -100, 100) / 100 * halfH;
  C.half = P.half;
  if (kind <= 8) {
    C.S = P.half / Math.max(1e-6, radialOf(C, C.tmax));
  } else if (kind <= 12) {
    C.phimax = kind === 9 ? Math.PI / 2 : kind === 10 ? rad(80) : kind === 11 ? rad(84) : rad(85);
    C.lmax = Math.min(half, kind === 12 ? Math.acos(-Math.min(1, C.d)) - 0.03 : Math.PI);
    if (kind === 12 && C.d > 1) C.lmax = Math.min(half, Math.PI);
    const pxm = kind === 12 ? (C.d + 1) / (C.d + Math.cos(C.lmax)) * Math.sin(C.lmax) : C.lmax;
    C.S = halfW / Math.max(1e-6, Math.abs(pxm) < 1e-6 ? C.lmax : pxm);
  } else if (kind === 13) {
    C.S = Math.min(halfW / (2 * Math.SQRT2), halfH / Math.SQRT2);
  } else {
    C.S = halfW / Math.PI;
    C.py0 = (Math.log(Math.tan(C.tmin / 2)) + Math.log(Math.tan(C.tmax / 2))) / 2;
  }
  return C;
}

// A point in space onto the paper: PX, PY in mm. False where the lens cannot see it.
function proj(x, y, z) {
  const C = CAM;
  const dx = x - C.ex, dy = y - C.ey, dz = z - C.ez;
  const L2 = dx * dx + dy * dy + dz * dz;
  if (L2 > C.far2 || L2 < 1e-18) return false;
  const L = Math.sqrt(L2);
  const a = (dx * C.rx + dy * C.ry + dz * C.rz) / L;
  const b = (dx * C.ux + dy * C.uy + dz * C.uz) / L;
  let c = (dx * C.fx + dy * C.fy + dz * C.fz) / L;
  let px, py;
  const k = C.kind;
  if (k <= 8) {
    if (k === 5 || k === 6) c = -c;
    const h = Math.sqrt(a * a + b * b), t = Math.atan2(h, c);
    if (t > C.tmax) return false;
    if (k === 0) { px = a / c; py = b / c; }
    else if (h < 1e-12) { px = 0; py = 0; }
    else { const r = radialOf(C, t) / h; px = a * r; py = b * r; }
  } else if (k <= 13) {
    const lam = Math.atan2(a, c), phi = Math.atan2(b, Math.sqrt(a * a + c * c));
    if (k === 13) {
      const cp = Math.cos(phi), den = Math.sqrt(1 + cp * Math.cos(lam / 2));
      px = 2 * Math.SQRT2 * cp * Math.sin(lam / 2) / den;
      py = Math.SQRT2 * Math.sin(phi) / den;
    } else {
      if (lam > C.lmax || lam < -C.lmax || phi > C.phimax || phi < -C.phimax) return false;
      if (k === 9) { px = lam; py = phi; }
      else if (k === 10) { px = lam; py = Math.tan(phi); }
      else if (k === 11) { px = lam; py = Math.log(Math.tan(Math.PI / 4 + phi / 2)); }
      else {
        const sd = (C.d + 1) / (C.d + Math.cos(lam));
        if (!(sd > 0)) return false;
        px = sd * Math.sin(lam); py = sd * Math.tan(phi);
      }
    }
  } else {
    const t = Math.atan2(Math.sqrt(a * a + b * b), c);
    if (t > C.tmax || t < C.tmin) return false;
    px = Math.atan2(b, a);
    py = Math.log(Math.tan(t / 2)) - C.py0;
  }
  let X = px * C.sq * C.S, Y = -py * C.S;
  if (C.swirl !== 0 || C.barrel !== 0) {
    const rho = Math.sqrt(X * X + Y * Y) / C.half;
    const m = 1 + C.barrel * rho * rho, ang = C.swirl * rho;
    const cs = Math.cos(ang) * m, sn = Math.sin(ang) * m;
    const nx = X * cs - Y * sn;
    Y = X * sn + Y * cs; X = nx;
  }
  PX = C.cx + X; PY = C.cy + Y;
  return true;
}

////////////////////////////////////////////////////////////////////////////////////////
// One segment in space onto the paper
//
// 1. the parts the lens can see at all (a few samples along it and halving at every change);
// 2. each part followed as a curve: halved until its middle lies within `smoothness` of the
//    chord; a chord that stays long after every halving jumps a seam of the lens, and is cut;
// 3. clipped to the picture and the pen's box, every point keeping its t along the segment;
// 4. the parts hidden from the eye, in t, worked out once for what is left;
// 5. the rest is drawn.

let FX = new Float64Array(4096), FY = new Float64Array(4096), FT = new Float64Array(4096);
let FN = 0;
let FBRK = [];                      // where each followed piece starts in FX
let CXs = new Float64Array(4096), CYs = new Float64Array(4096), CTs = new Float64Array(4096);
let CN = 0;
let CBRK = [];
let TOL2 = 0.0016;
let SEG_A = [0, 0, 0], SEG_B = [0, 0, 0];

function fpush(x, y, t) {
  if (FN >= FX.length) {
    const g = n => { const a = new Float64Array(n.length * 2); a.set(n); return a; };
    FX = g(FX); FY = g(FY); FT = g(FT);
  }
  FX[FN] = x; FY[FN] = y; FT[FN] = t; FN++;
}

function cpush(x, y, t) {
  if (CN >= CXs.length) {
    const g = n => { const a = new Float64Array(n.length * 2); a.set(n); return a; };
    CXs = g(CXs); CYs = g(CYs); CTs = g(CTs);
  }
  CXs[CN] = x; CYs[CN] = y; CTs[CN] = t; CN++;
}

function projT(t) {
  return proj(SEG_A[0] + (SEG_B[0] - SEG_A[0]) * t, SEG_A[1] + (SEG_B[1] - SEG_A[1]) * t,
              SEG_A[2] + (SEG_B[2] - SEG_A[2]) * t);
}

function follow(ta, xa, ya, tb, xb, yb, depth) {
  const tm = (ta + tb) / 2;
  const ok = projT(tm);
  const mx = PX, my = PY;
  const chord2 = (xb - xa) * (xb - xa) + (yb - ya) * (yb - ya);
  if (!ok) {
    // the edge of what the lens sees, touched in between: cut there
    FBRK.push(FN); fpush(xb, yb, tb);
    return;
  }
  const ex = mx - (xa + xb) / 2, ey = my - (ya + yb) / 2;
  if (depth < FLAT_DEPTH && (ex * ex + ey * ey > TOL2 || (depth < 2 && chord2 > 9))) {
    follow(ta, xa, ya, tm, mx, my, depth + 1);
    follow(tm, mx, my, tb, xb, yb, depth + 1);
    return;
  }
  if (depth >= FLAT_DEPTH && chord2 > SEAM_MM * SEAM_MM) { FBRK.push(FN); fpush(xb, yb, tb); return; }
  fpush(xb, yb, tb);
}

// The runs of t over which the lens sees the segment.
const RUNS = [];
function seenRuns(A, B) {
  RUNS.length = 0;
  const C = CAM;
  const ax = A[0] - C.ex, ay = A[1] - C.ey, az = A[2] - C.ez;
  const bx = B[0] - C.ex, by = B[1] - C.ey, bz = B[2] - C.ez;
  const la = Math.sqrt(ax * ax + ay * ay + az * az), lb = Math.sqrt(bx * bx + by * by + bz * bz);
  const cosab = (ax * bx + ay * by + az * bz) / Math.max(1e-12, la * lb);
  const ang = Math.acos(clamp(cosab, -1, 1));
  const n = clamp(Math.ceil(ang / 0.12), 1, 64);
  let prevT = 0, prevOk = projT(0), runStart = prevOk ? 0 : -1;
  for (let i = 1; i <= n; i++) {
    const t = i / n, ok = projT(t);
    if (ok !== prevOk) {
      let lo = prevT, hi = t;
      for (let it = 0; it < 30; it++) {
        const m = (lo + hi) / 2;
        if (projT(m) === prevOk) lo = m; else hi = m;
      }
      if (prevOk) { RUNS.push(runStart, lo); runStart = -1; } else runStart = hi;
    }
    prevT = t; prevOk = ok;
  }
  if (prevOk && runStart >= 0) RUNS.push(runStart, 1);
  return RUNS.length / 2;
}

const CLIP = { x0: 0, y0: 0, x1: 0, y1: 0, disc: false, cx: 0, cy: 0, R: 0 };

// Clip the chord p→q to the picture: the part kept as [s0, s1] of it, or false.
let S0 = 0, S1 = 1;
function clipChord(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  let t0 = 0, t1 = 1;
  for (let e = 0; e < 4; e++) {
    const p = e === 0 ? -dx : e === 1 ? dx : e === 2 ? -dy : dy;
    const q = e === 0 ? x0 - CLIP.x0 : e === 1 ? CLIP.x1 - x0 : e === 2 ? y0 - CLIP.y0 : CLIP.y1 - y0;
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else       { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  if (CLIP.disc) {
    const fx = x0 - CLIP.cx, fy = y0 - CLIP.cy;
    const A = dx * dx + dy * dy, B = 2 * (fx * dx + fy * dy), Cc = fx * fx + fy * fy - CLIP.R * CLIP.R;
    if (A < 1e-18) { if (Cc > 0) return false; }
    else {
      const D = B * B - 4 * A * Cc;
      if (D < 0) return false;
      const sq = Math.sqrt(D), r0 = (-B - sq) / (2 * A), r1 = (-B + sq) / (2 * A);
      if (r0 > t0) t0 = r0;
      if (r1 < t1) t1 = r1;
    }
  }
  if (t1 <= t0) return false;
  S0 = t0; S1 = t1;
  return true;
}

function setClip(pen) {
  const A = AREAS[pen], P = PIC, m = penW(pen) / 2;
  CLIP.x0 = Math.max(A.x0, P.x0 + (P.disc ? 0 : 0)); CLIP.y0 = Math.max(A.y0, P.y0);
  CLIP.x1 = Math.min(A.x1, P.x1); CLIP.y1 = Math.min(A.y1, P.y1);
  CLIP.disc = P.disc; CLIP.cx = P.cx; CLIP.cy = P.cy; CLIP.R = P.R - m;
}

let SEG_COUNT = 0;

// Draw the segment A→B: what of it the eye sees, through the lens, in the picture.
function drawSeg(A, B, minLen) {
  SEG_COUNT++;
  SEG_A = A; SEG_B = B;
  if (!seenRuns(A, B)) return;
  FN = 0; FBRK.length = 0;
  for (let r = 0; r < RUNS.length; r += 2) {
    const t0 = RUNS[r], t1 = RUNS[r + 1];
    if (!projT(t0)) continue;
    const x0 = PX, y0 = PY;
    if (!projT(t1)) continue;
    const x1 = PX, y1 = PY;
    FBRK.push(FN);
    fpush(x0, y0, t0);
    follow(t0, x0, y0, t1, x1, y1, 0);
  }
  FBRK.push(FN);
  // clip
  CN = 0; CBRK.length = 0;
  let open = false;
  for (let p = 0; p + 1 < FBRK.length; p++) {
    open = false;
    for (let i = FBRK[p]; i + 1 < FBRK[p + 1]; i++) {
      if (!clipChord(FX[i], FY[i], FX[i + 1], FY[i + 1])) { open = false; continue; }
      const dx = FX[i + 1] - FX[i], dy = FY[i + 1] - FY[i], dt = FT[i + 1] - FT[i];
      if (!open || S0 > 1e-9) {
        CBRK.push(CN);
        cpush(FX[i] + dx * S0, FY[i] + dy * S0, FT[i] + dt * S0);
      }
      cpush(FX[i] + dx * S1, FY[i] + dy * S1, FT[i] + dt * S1);
      open = S1 >= 1 - 1e-9;
    }
  }
  if (!CN) return;
  CBRK.push(CN);
  let tl = Infinity, th = -Infinity;
  for (let i = 0; i < CN; i++) { if (CTs[i] < tl) tl = CTs[i]; if (CTs[i] > th) th = CTs[i]; }
  if (th - tl < 1e-12) return;
  const A1 = vlerp(A, B, tl), B1 = vlerp(A, B, th);
  if (hiddenFrom(WORLD, CAM.E, A1, B1)) return;
  // what is seen, in t of the whole segment
  const vis = [];
  let at = tl;
  for (let i = 0; i < HN; i++) {
    const h0 = tl + HID[i * 2] * (th - tl), h1 = tl + HID[i * 2 + 1] * (th - tl);
    if (h0 > at) vis.push(at, h0);
    at = Math.max(at, h1);
  }
  if (at < th) vis.push(at, th);
  for (let p = 0; p + 1 < CBRK.length; p++) {
    const i0 = CBRK[p], i1 = CBRK[p + 1];
    for (let v = 0; v < vis.length; v += 2) emitPart(i0, i1, vis[v], vis[v + 1], minLen);
  }
}

const OX = [], OY = [];
// The part of the clipped piece i0..i1 with t in [va, vb].
function emitPart(i0, i1, va, vb, minLen) {
  if (CTs[i1 - 1] <= va || CTs[i0] >= vb) return;
  OX.length = 0; OY.length = 0;
  for (let i = i0; i < i1; i++) {
    const t = CTs[i];
    if (t < va) {
      if (i + 1 < i1 && CTs[i + 1] > va) {
        const k = (va - t) / (CTs[i + 1] - t);
        OX.push(CXs[i] + (CXs[i + 1] - CXs[i]) * k); OY.push(CYs[i] + (CYs[i + 1] - CYs[i]) * k);
      }
      continue;
    }
    if (t > vb) {
      if (i > i0 && CTs[i - 1] < vb) {
        const k = (vb - CTs[i - 1]) / (t - CTs[i - 1]);
        OX.push(CXs[i - 1] + (CXs[i] - CXs[i - 1]) * k); OY.push(CYs[i - 1] + (CYs[i] - CYs[i - 1]) * k);
      }
      break;
    }
    OX.push(CXs[i]); OY.push(CYs[i]);
  }
  if (OX.length < 2) return;
  let L = 0;
  for (let i = 1; i < OX.length; i++) L += Math.hypot(OX[i] - OX[i - 1], OY[i] - OY[i - 1]);
  if (L < minLen) return;
  pushPoly(OX, OY, OX.length);
}

////////////////////////////////////////////////////////////////////////////////////////
// The sheet
//
// Everything lands in the sink as polylines in millimetres, each tagged with its pen and
// its layer, already clipped to that pen's box and the picture.

let SINK = null;
let PEN = 0, LAY = 0;
let AREAS = [];

function makeSink() {
  return { pts: [], off: [0], ink: [], lay: [] };
}

function pushPoly(xs, ys, n) {
  const S2 = SINK;
  if (n < 2 || S2.ink.length > MAX_STROKES) return;
  for (let i = 0; i < n; i++) S2.pts.push(xs[i], ys[i]);
  S2.off.push(S2.pts.length / 2);
  S2.ink.push(PEN);
  S2.lay.push(LAY);
}

function usePen(key, layer) {
  PEN = penIdx(settings[key]);
  LAY = layer;
  setClip(PEN);
}

// Could the box be in the picture at all? Too far, or wholly outside the cone of a radial
// lens, and it is skipped before any of its edges are looked at.
function boxSeen(b) {
  const C = CAM;
  const cx = (b[0] + b[3]) / 2 - C.ex, cy = (b[1] + b[4]) / 2 - C.ey, cz = (b[2] + b[5]) / 2 - C.ez;
  const r = Math.hypot(b[3] - b[0], b[4] - b[1], b[5] - b[2]) / 2;
  const d = Math.sqrt(cx * cx + cy * cy + cz * cz);
  if (d - r > Math.sqrt(C.far2)) return false;
  if (d <= r || (C.kind > 8 && C.kind !== 14) || C.tmax >= Math.PI - 1e-6) return true;
  let c = (cx * C.fx + cy * C.fy + cz * C.fz) / d;
  if (C.kind === 5 || C.kind === 6) c = -c;
  return Math.acos(clamp(c, -1, 1)) - Math.asin(Math.min(1, r / d)) <= C.tmax;
}

// The halls' edges: lines on the surfaces and the edges of the blocks that face the eye.
// All of them run along an axis, so they are pooled by the line they lie on and merged —
// one stroke where two blocks share an edge, or where a block stands on a cut of its panel.
function hallEdges(W) {
  const E = CAM.E, pool = new Map();
  const add = (ax, k1, k2, lo, hi) => {
    const key = ax === 0 ? `x${k1},${k2}` : ax === 1 ? `y${k1},${k2}` : `z${k1},${k2}`;
    let p = pool.get(key);
    if (!p) { p = { ax, k1, k2, list: [] }; pool.set(key, p); }
    p.list.push(lo, hi);
  };
  const seg = (x0, y0, z0, x1, y1, z1) => {
    if (x0 !== x1) add(0, y0, z0, Math.min(x0, x1), Math.max(x0, x1));
    else if (y0 !== y1) add(1, x0, z0, Math.min(y0, y1), Math.max(y0, y1));
    else if (z0 !== z1) add(2, x0, y0, Math.min(z0, z1), Math.max(z0, z1));
  };
  const F = W.flat, bb = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < F.length; i += 9) {
    const a = F[i + 6];
    if ((E[a] - F[i + 8]) * F[i + 7] <= 0) continue;
    bb[0] = Math.min(F[i], F[i + 3]); bb[1] = Math.min(F[i + 1], F[i + 4]); bb[2] = Math.min(F[i + 2], F[i + 5]);
    bb[3] = Math.max(F[i], F[i + 3]); bb[4] = Math.max(F[i + 1], F[i + 4]); bb[5] = Math.max(F[i + 2], F[i + 5]);
    if (!boxSeen(bb)) continue;
    seg(F[i], F[i + 1], F[i + 2], F[i + 3], F[i + 4], F[i + 5]);
  }
  for (const b of W.boxes) {
    if (!boxSeen(b)) continue;
    const fr = [E[0] < b[0], E[0] > b[3], E[1] < b[1], E[1] > b[4], E[2] < b[2], E[2] > b[5]];
    for (let p = 0; p < 2; p++) for (let q = 0; q < 2; q++) {
      const y = b[1 + 3 * p], z = b[2 + 3 * q], x = b[3 * p], zz = b[2 + 3 * q], xx = b[3 * p], yy = b[1 + 3 * q];
      if (fr[2 + p] || fr[4 + q]) seg(b[0], y, z, b[3], y, z);
      if (fr[p] || fr[4 + q]) seg(x, b[1], zz, x, b[4], zz);
      if (fr[p] || fr[2 + q]) seg(xx, yy, b[2], xx, yy, b[5]);
    }
  }
  usePen('linePen', L_EDGES);
  const A = [0, 0, 0], B = [0, 0, 0], min = Math.max(0, settings.minLine);
  for (const p of pool.values()) {
    const L = p.list, n = L.length / 2, idx = [];
    for (let i = 0; i < n; i++) idx.push(i);
    idx.sort((i, j) => L[i * 2] - L[j * 2]);
    let lo = L[idx[0] * 2], hi = L[idx[0] * 2 + 1];
    const flush = () => {
      if (hi - lo < 1e-9) return;
      if (p.ax === 0) { A[0] = lo; A[1] = p.k1; A[2] = p.k2; B[0] = hi; B[1] = p.k1; B[2] = p.k2; }
      else if (p.ax === 1) { A[0] = p.k1; A[1] = lo; A[2] = p.k2; B[0] = p.k1; B[1] = hi; B[2] = p.k2; }
      else { A[0] = p.k1; A[1] = p.k2; A[2] = lo; B[0] = p.k1; B[1] = p.k2; B[2] = hi; }
      drawSeg(A.slice(), B.slice(), min);
      COUNTS.lines++;
    };
    for (let k = 1; k < n; k++) {
      const a = L[idx[k] * 2], b = L[idx[k] * 2 + 1];
      if (a <= hi + 1e-9) { if (b > hi) hi = b; }
      else { flush(); lo = a; hi = b; }
    }
    flush();
  }
}

function frontOf(f, E) { return f.n[0] * E[0] + f.n[1] * E[1] + f.n[2] * E[2] - f.d > 1e-9; }

function thingEdges(W) {
  const E = CAM.E, min = Math.max(0, settings.minLine);
  if (settings.objFill === 'black, paper edges') return;
  usePen('objPen', L_OBJ);
  for (const pc of W.pieces) {
    for (const [a, b, f1, f2] of pc.E) {
      if (!frontOf(pc.F[f1], E) && !(f2 >= 0 && frontOf(pc.F[f2], E))) continue;
      drawSeg(pc.V[a], pc.V[b], min);
    }
  }
  for (const T of W.things) {
    for (const [p, q, nr] of T.lines) {
      if (vdot(nr, vsub(E, p)) <= 1e-9) continue;
      drawSeg(p, q, min);
    }
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Light and the hatching
//
// A face's tone is the light that does not reach it. The hatch lines are laid in space on
// the face, a fixed number of millimetres apart on the paper where the face is seen, and
// the spacing is rounded to a power of two in space, so that faces of one plane seen at
// about one size share their lines. Which of the lines are drawn for a tone goes by the
// bit-reversed order of their numbers: a lighter tone keeps every other line, and so on.
// Darker than `crossAt`, a second family crosses the first.

const BR16 = [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15];
function rank16(k) { return (BR16[((k % 16) + 16) % 16] + 0.5) / 16; }

function sunDir() {
  const s = settings, y = rad(s.lightYaw), p = rad(s.lightPitch);
  return [Math.cos(p) * Math.sin(y), Math.cos(p) * Math.cos(y), Math.sin(p)];
}

function lampAt(W) {
  const s = settings, V = W.void;
  return [V.x0 + (V.x1 - V.x0) * s.lampX / 100, V.y0 + (V.y1 - V.y0) * s.lampY / 100,
          V.z0 + (V.z1 - V.z0) * s.lampZ / 100];
}

function contrasted(t) {
  const k = 1 + settings.contrast / 100;
  return clamp(0.5 + (t - 0.5) * k, 0, 1);
}

// The tone of a face at P, lit and in shadow, and whether shadows can fall on it.
const TONE = { lit: 0, dark: 0, cast: false };
function toneAt(P, n, light) {
  const s = settings, amb = clamp(s.ambient / 100, 0, 1);
  let b = 0, cast = false;
  if (light === 'sun') {
    const L = LIGHT.L;
    b = Math.max(0, vdot(n, L));
    cast = b > 0 && s.shadows;
  } else if (light === 'lamp') {
    const v = vsub(LIGHT.P, P), d = vlen(v);
    b = Math.max(0, vdot(n, v) / Math.max(1e-9, d)) / (1 + Math.pow(d / Math.max(0.1, s.lampReach), 2));
    cast = b > 0 && s.shadows;
  } else {
    const v = vsub(CAM.E, P), d = vlen(v);
    b = Math.max(0, vdot(n, v) / Math.max(1e-9, d));
  }
  TONE.lit = contrasted(1 - (amb + (1 - amb) * b));
  TONE.dark = contrasted(1 - amb);
  TONE.cast = cast;
  return TONE;
}

const LIGHT = { kind: 'none', L: [0, 0, 1], P: [0, 0, 0] };

// Millimetres of paper per module along dir at P; 0 where the lens does not see P.
function paperScale(P, dir) {
  if (!proj(P[0], P[1], P[2])) return 0;
  const x0 = PX, y0 = PY;
  const h = 1e-4 * Math.max(0.05, vlen(vsub(P, CAM.E)));
  if (!proj(P[0] + dir[0] * h, P[1] + dir[1] * h, P[2] + dir[2] * h)) {
    if (!proj(P[0] - dir[0] * h, P[1] - dir[1] * h, P[2] - dir[2] * h)) return 0;
  }
  return Math.hypot(PX - x0, PY - y0) / h;
}

function centroid(pts) {
  const c = [0, 0, 0];
  for (const p of pts) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
  return [c[0] / pts.length, c[1] / pts.length, c[2] / pts.length];
}

// The chord of a convex polygon (in its own s, o coordinates) along the line o = const.
function chordAt(S, O, o) {
  let lo = Infinity, hi = -Infinity;
  const n = S.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, oa = O[i], ob = O[j];
    if ((oa - o) * (ob - o) > 0 || oa === ob) {
      if (oa === o) { lo = Math.min(lo, S[i]); hi = Math.max(hi, S[i]); }
      continue;
    }
    const s = S[i] + (S[j] - S[i]) * (o - oa) / (ob - oa);
    if (s < lo) lo = s; if (s > hi) hi = s;
  }
  return hi > lo ? [lo, hi] : null;
}

// The hatch lines of one face. `dir` the way the lines run in the face; the tone from the light.
function hatchFace(pts, n, dir, light) {
  const s = settings, C = centroid(pts);
  const e = vcross(n, dir);
  const sc = paperScale(C, e);
  if (!(sc > 0)) return;
  const T = toneAt(C, n, light);
  const lightest = s.lightest / 100;
  const pitch = Math.max(0.1, s.hatchPitch);
  let w = Math.pow(2, Math.floor(Math.log2(pitch / sc)));
  const keep = w * sc / pitch;                        // the share of lines at full darkness
  const cross = clamp(s.crossAt / 100, 0.05, 1);
  const share1 = t => t < lightest ? 0 : (cross >= 1 ? t : Math.min(1, t / cross)) * keep;
  const share2 = t => t < lightest || cross >= 1 ? 0 : Math.max(0, (t - cross) / (1 - cross)) * keep;
  const h = vdot(n, pts[0]);
  for (let fam = 0; fam < 2; fam++) {
    const fL = fam ? share2(T.lit) : share1(T.lit), fD = fam ? share2(T.dark) : share1(T.dark);
    const fMax = T.cast ? Math.max(fL, fD) : fL;
    if (fMax <= 0) continue;
    const d = fam ? e : dir, ee = fam ? vmul(dir, -1) : e;
    const S = pts.map(p => vdot(p, d)), O = pts.map(p => vdot(p, ee));
    const o0 = Math.min(...O), o1 = Math.max(...O);
    let ww = w;
    while ((o1 - o0) / ww > 3000) ww *= 2;
    for (let k = Math.ceil(o0 / ww + 1e-9); k * ww < o1 - 1e-9; k++) {
      const rk = rank16(k) * (ww / w);
      if (rk >= fMax) continue;
      const o = k * ww, ch = chordAt(S, O, o);
      if (!ch) continue;
      const A = vadd(vadd(vmul(d, ch[0]), vmul(ee, o)), vmul(n, h));
      const B = vadd(vadd(vmul(d, ch[1]), vmul(ee, o)), vmul(n, h));
      if (!T.cast || fL === fD) { drawSeg(A, B, MIN_DASH); COUNTS.hatch++; continue; }
      // which parts lie in shadow
      const all = light === 'sun' ? shadowOfSun(WORLD, A, B, LIGHT.L, Math.sqrt(CAM.far2)) :
                                    hiddenFrom(WORLD, LIGHT.P, A, B);
      const spans = [];
      if (all) spans.push(0, 1); else for (let i = 0; i < HN * 2; i++) spans.push(HID[i]);
      let at = 0;
      const part = (t0, t1, shade) => {
        if (t1 - t0 < 1e-9) return;
        if (rk < (shade ? fD : fL)) { drawSeg(vlerp(A, B, t0), vlerp(A, B, t1), MIN_DASH); COUNTS.hatch++; }
      };
      for (let i = 0; i < spans.length; i += 2) { part(at, spans[i], false); part(spans[i], spans[i + 1], true); at = spans[i + 1]; }
      part(at, 1, false);
    }
  }
}

// The four corners of an axis-aligned face, counter-clockwise about its normal.
function axisFace(a, sg, c, u0, u1, v0, v1) {
  const ua = (a + 1) % 3, va = (a + 2) % 3;
  const P = (u, v) => { const p = [0, 0, 0]; p[a] = c; p[ua] = u; p[va] = v; return p; };
  const pts = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
  if (sg < 0) pts.reverse();
  const n = [0, 0, 0];
  n[a] = sg;
  const du = [0, 0, 0], dv = [0, 0, 0];
  du[ua] = 1; dv[va] = 1;
  return { pts, n, du, dv, lu: u1 - u0, lv: v1 - v0 };
}

function axisDir(F, salt) {
  const m = settings.hatchDir;
  const along = F.lu >= F.lv ? F.du : F.dv, across = F.lu >= F.lv ? F.dv : F.du;
  if (m === 'across') return across;
  if (m === 'by face') return ((salt * 2654435761) >>> 0) % 2 ? along : across;
  return along;
}

function hallShading(W, light) {
  const E = CAM.E;
  usePen('shadePen', L_SHADE);
  let salt = 0;
  for (const R of W.rects) {
    salt++;
    if ((E[R.a] - R.c) * R.s <= 0) continue;
    const b = [0, 0, 0, 0, 0, 0], ua = (R.a + 1) % 3, va = (R.a + 2) % 3;
    b[R.a] = b[R.a + 3] = R.c; b[ua] = R.u0; b[ua + 3] = R.u1; b[va] = R.v0; b[va + 3] = R.v1;
    if (!boxSeen(b)) continue;
    const F = axisFace(R.a, R.s, R.c, R.u0, R.u1, R.v0, R.v1);
    hatchFace(F.pts, F.n, axisDir(F, salt), light);
  }
  for (const b of W.boxes) {
    salt++;
    if (!boxSeen(b)) continue;
    for (let a = 0; a < 3; a++) for (let q = 0; q < 2; q++) {
      const sg = q ? 1 : -1, c = b[a + 3 * q];
      if ((E[a] - c) * sg <= 0) continue;
      const ua = (a + 1) % 3, va = (a + 2) % 3;
      const F = axisFace(a, sg, c, b[ua], b[ua + 3], b[va], b[va + 3]);
      hatchFace(F.pts, F.n, axisDir(F, salt * 7 + a), light);
    }
  }
}

function longestEdge(pts) {
  let best = 0, dir = [1, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const v = vsub(pts[(i + 1) % pts.length], pts[i]), L = vlen(v);
    if (L > best) { best = L; dir = vmul(v, 1 / L); }
  }
  return dir;
}

// A face filled black by the contract of the pen: the field moved in by half the nib (and
// by the paper left along its edges), its outline once round, then passes `solidPasses` %
// of the nib apart. The spacing is worked out where the face is seen largest, so no part of
// it is left with a hair of paper.
function solidFace(pts, n, paper) {
  const s = settings, nib = penW(PEN);
  const dir = longestEdge(pts), e = vcross(n, dir);
  let sc = 0;
  for (const p of [...pts, centroid(pts)]) sc = Math.max(sc, paperScale(p, dir), paperScale(p, e));
  if (!(sc > 0)) return;
  const g = (nib / 2 + (paper ? Math.max(0, s.edgeGap) : 0)) / sc;
  const ins = insetPoly(pts, n, g);
  if (!ins) return;
  for (let i = 0; i < ins.length; i++) drawSeg(ins[i], ins[(i + 1) % ins.length], 0);
  const w = clamp(s.solidPasses, 20, 300) / 100 * nib / sc;
  const S = ins.map(p => vdot(p, dir)), O = ins.map(p => vdot(p, e)), h = vdot(n, ins[0]);
  const o0 = Math.min(...O), o1 = Math.max(...O), span = o1 - o0;
  const k = Math.ceil(span / w);
  if (k > 4000) return;
  for (let i = 1; i < k; i++) {
    const o = o0 + span * i / k, ch = chordAt(S, O, o);
    if (!ch) continue;
    drawSeg(vadd(vadd(vmul(dir, ch[0]), vmul(e, o)), vmul(n, h)),
            vadd(vadd(vmul(dir, ch[1]), vmul(e, o)), vmul(n, h)), 0);
    COUNTS.passes++;
  }
}

function thingFills(W, light) {
  const s = settings, E = CAM.E, mode = s.objFill;
  if (mode === 'outline') return;
  if (mode === 'shaded') {
    if (!s.shadeObjects) return;
    usePen('shadePen', L_SHADE);
    for (const pc of W.pieces) for (const f of pc.F) {
      if (!frontOf(f, E)) continue;
      const pts = f.idx.map(i => pc.V[i]), d = longestEdge(pts);
      hatchFace(pts, f.n, s.hatchDir === 'across' ? vcross(f.n, d) : d, light === 'none' ? 'eye' : light);
    }
    return;
  }
  usePen('solidPen', L_SOLID);
  const paper = mode === 'black, paper edges';
  for (const pc of W.pieces) for (const f of pc.F) {
    if (!frontOf(f, E)) continue;
    solidFace(f.idx.map(i => pc.V[i]), f.n, paper);
  }
}

// Streaks left behind the floating things, broken into dashes that thin out.
function trailLines(W) {
  const s = settings;
  if (s.trails <= 0 || !W.things.length) return;
  usePen('trailPen', L_TRAIL);
  const ty = rad(s.trailYaw), tp = rad(s.trailPitch);
  const v = [Math.cos(tp) * Math.sin(ty), Math.cos(tp) * Math.cos(ty), Math.sin(tp)];
  const brk = clamp(s.trailDash, 0, 100) / 100;
  W.things.forEach((T, ti) => {
    const r = rng(500 + ti);
    for (let k = 0; k < Math.round(s.trailCount); k++) {
      let q;
      do { q = [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]; } while (vdot(q, q) > 1 || vdot(q, q) < 0.05);
      q = vnorm(q);
      if (vdot(q, v) > 0) q = vsub(q, vmul(v, 2 * vdot(q, v)));
      const p = vadd(T.C, vmul(q, T.R * (0.85 + 0.2 * r())));
      const len = s.trails * T.R * (0.35 + 0.65 * r());
      if (brk <= 0) { drawSeg(p, vadd(p, vmul(v, -len)), MIN_DASH); continue; }
      let pos = 0;
      while (pos < len) {
        const prog = pos / len;
        const dash = Math.max(0.01, len * 0.18 * (1 - 0.8 * prog) * (0.6 + 0.8 * r()));
        const end = Math.min(len, pos + dash);
        drawSeg(vadd(p, vmul(v, -pos)), vadd(p, vmul(v, -end)), MIN_DASH);
        pos = end + dash * brk * (0.4 + 3 * prog);
      }
    }
  });
}

function frameLines() {
  if (!settings.border) return;
  usePen('framePen', L_FRAME);
  const P = PIC, m = penW(PEN) / 2;
  if (P.disc) {
    const n = 720, xs = [], ys = [];
    for (let i = 0; i <= n; i++) {
      const a = 2 * Math.PI * i / n;
      xs.push(P.cx + (P.R - m) * Math.cos(a)); ys.push(P.cy + (P.R - m) * Math.sin(a));
    }
    pushPoly(xs, ys, xs.length);
  } else {
    const A = AREAS[PEN];
    pushPoly([A.x0, A.x1, A.x1, A.x0, A.x0], [A.y0, A.y0, A.y1, A.y1, A.y0], 5);
  }
}

function cropMarkPlaces() {
  const [W, H] = paperDims();
  const B = settings.cropMarkAt === 'picture' ? area : { x0: 0, y0: 0, x1: W, y1: H, w: W, h: H };
  const step = Math.max(1, settings.cropMarkGap);
  const nx = Math.max(1, Math.ceil(B.w / step)), ny = Math.max(1, Math.ceil(B.h / step));
  const out = [];
  for (let i = 0; i <= nx; i++) {
    const x = B.x0 + B.w * i / nx;
    out.push([x, B.y0], [x, B.y1]);
  }
  for (let j = 1; j < ny; j++) {
    const y = B.y0 + B.h * j / ny;
    out.push([B.x0, y], [B.x1, y]);
  }
  return out;
}

// A dot is one touch of the pen, and no pen's box clips it: it stands on the very edge. It
// goes with the pen that plots first, and before any of its lines (see orderShapes). The stub
// points into the sheet: one lying along the bottom or the right edge is cut away by vpype.
function cropMarkDots() {
  if (!settings.cropMarks) return;
  const [W, H] = paperDims(), used = new Uint8Array(SLOTS);
  for (const id of SINK.ink) used[id] = 1;
  const first = penOrder().find(i => used[i]);
  PEN = first === undefined ? penIdx(settings.linePen) : first; LAY = L_GUIDES;
  for (const [x, y] of cropMarkPlaces()) {
    pushPoly([x, x + (x > W / 2 ? -EPS : EPS)], [y, y + (y > H / 2 ? -EPS : EPS)], 2);
  }
}

function eyeInside(W) {
  const E = CAM.E;
  if (cellAt(W.G, Math.floor(E[0]), Math.floor(E[1]), Math.floor(E[2]))) return true;
  for (const b of W.boxes) {
    if (E[0] > b[0] && E[0] < b[3] && E[1] > b[1] && E[1] < b[4] && E[2] > b[2] && E[2] < b[5]) return true;
  }
  for (const pc of W.pieces) if (pc.F.every(f => !frontOf(f, E))) return true;
  return false;
}

function buildShapes(coarse) {
  if (area.w < 2 || area.h < 2) return null;
  const s = settings, W = WORLD;
  SINK = makeSink();
  AREAS = [];
  for (let i = 0; i < SLOTS; i++) AREAS.push(penArea(i));
  CAM = makeCamera(W);
  TOL2 = Math.pow(Math.max(0.005, s.smoothness) * (coarse ? 3 : 1), 2);
  COUNTS = { lines: 0, hatch: 0, passes: 0, inside: eyeInside(W) };
  SEG_COUNT = 0; CANDIDATES = 0;
  const light = s.light;
  LIGHT.kind = light;
  LIGHT.L = sunDir();
  LIGHT.P = lampAt(W);
  if (!COUNTS.inside) {
    if (s.edges) hallEdges(W);
    thingEdges(W);
    if (light !== 'none' && s.shadeWalls && !coarse) hallShading(W, light);
    thingFills(W, light);
    trailLines(W);
  }
  frameLines();
  cropMarkDots();

  const S2 = SINK;
  perPen = [];
  for (let i = 0; i < SLOTS; i++) perPen.push({ strokes: 0, ink: 0, downs: 0 });
  perLayer = LAYERS.map(() => ({ strokes: 0, ink: 0, pens: new Set() }));
  for (let i = 0; i < S2.ink.length; i++) {
    perPen[S2.ink[i]].strokes++;
    perLayer[S2.lay[i]].strokes++;
    perLayer[S2.lay[i]].pens.add(S2.ink[i]);
  }
  return {
    pts: Float64Array.from(S2.pts),
    off: Int32Array.from(S2.off),
    ink: Int32Array.from(S2.ink),
    lay: Int32Array.from(S2.lay),
  };
}

////////////////////////////////////////////////////////////////////////////////////////
// Stroke order
//
// Greedy nearest-neighbour over stroke endpoints, either end allowed as the entry point,
// with a uniform bucket grid so the search stays local; one pen at a time, the cut guides
// first.

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
  if (!n) return { order, flip, ink: 0, travel: 0, downs: 0 };
  const byInk = new Map();
  for (let i = 0; i < n; i++) {
    const id = sh.ink[i], a = byInk.get(id);
    if (a) a.push(i); else byInk.set(id, [i]);
  }
  let at = 0;
  for (const id of penOrder()) {
    const list = byInk.get(id);
    if (!list) continue;
    // the cut guides first, round the sheet, and the lines on from the last of them: a plot
    // stopped half way still leaves a sheet marked for the guillotine
    const dots = list.filter(i => sh.lay[i] === L_GUIDES);
    const rest = dots.length ? list.filter(i => sh.lay[i] !== L_GUIDES) : list;
    let x = 0, y = 0;
    for (const part of [dots, rest]) {
      if (settings.optimiseOrder) {
        const g = greedy(sh, part, x, y);
        for (let t = 0; t < g.order.length; t++) { order[at] = g.order[t]; flip[at++] = g.flip[t]; }
        x = g.px; y = g.py;
      } else {
        for (const i of part) { order[at] = i; flip[at++] = 0; }
      }
    }
  }
  return { order, flip, ...measurePlan(sh, order, flip) };
}

// Every pass starts with the pen at the corner of the sheet. A hop to the next stroke
// shorter than the pen is told to stay down over is ink, not travel.
function measurePlan(sh, order, flip) {
  const { pts, off } = sh;
  let ink = 0, travel = 0, downs = 0, px = 0, py = 0, prevId = -1, reach = 0;
  for (let t = 0; t < order.length; t++) {
    const i = order[t], rev = flip[t] === 1;
    const id = sh.ink[i];
    const fresh = id !== prevId;
    if (fresh) { px = 0; py = 0; prevId = id; reach = settings.penDown / 100 * penW(id); }
    const a = off[i], b = off[i + 1];
    const inA = rev ? b - 1 : a, inB = rev ? a : b - 1;
    const hop = Math.hypot(pts[inA * 2] - px, pts[inA * 2 + 1] - py);
    const kept = !fresh && hop <= reach;
    let run = kept ? hop : 0;
    for (let k = a; k < b - 1; k++) {
      run += Math.hypot(pts[(k + 1) * 2] - pts[k * 2], pts[(k + 1) * 2 + 1] - pts[k * 2 + 1]);
    }
    ink += run;
    if (!kept) { travel += hop; downs++; }
    const p = perPen && perPen[id];
    if (p) {
      p.ink += run;
      if (!kept) { p.travel = (p.travel || 0) + hop; p.downs++; }
    }
    const ly = sh.lay[i];
    if (perLayer && perLayer[ly]) perLayer[ly].ink += run;
    px = pts[inB * 2];
    py = pts[inB * 2 + 1];
  }
  return { ink, travel, downs };
}

////////////////////////////////////////////////////////////////////////////////////////
// Preview

function drawPreview() {
  const ctx = drawingContext;
  ctx.save();
  ctx.setTransform(pixelDensity(), 0, 0, pixelDensity(), 0, 0);
  drawSheet(ctx, previewScale(), true);
  ctx.restore();
}

function drawSheet(ctx, s, guides) {
  const [W, H] = paperDims();
  ctx.fillStyle = settings.paperColor;
  ctx.fillRect(0, 0, W * s, H * s);
  if (shapes && plan) drawStrokes(ctx, s);
  if (guides && (settings.showGuides || drag)) {
    ctx.save();
    ctx.scale(s, s);
    drawGuides(ctx);
    ctx.restore();
  }
}

function drawStrokes(ctx, s) {
  const { pts, off } = shapes;
  const { order, flip } = plan;
  ctx.save();
  ctx.scale(s, s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let t = 0;
  while (t < order.length) {
    const id = shapes.ink[order[t]], reach = settings.penDown / 100 * penW(id);
    ctx.strokeStyle = penCol(id);
    ctx.lineWidth = penW(id);
    ctx.beginPath();
    let held = 0, lx = NaN, ly = NaN;
    while (t < order.length && shapes.ink[order[t]] === id) {
      const i = order[t], rev = flip[t] === 1;
      t++;
      const a = off[i], b = off[i + 1], step = rev ? -1 : 1;
      let k = rev ? b - 1 : a;
      const x = pts[k * 2], y = pts[k * 2 + 1];
      if (Math.hypot(x - lx, y - ly) <= reach) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      for (let m = 1; m < b - a; m++) { k += step; ctx.lineTo(pts[k * 2], pts[k * 2 + 1]); }
      lx = pts[k * 2]; ly = pts[k * 2 + 1];
      if (++held >= 4000) { ctx.stroke(); ctx.beginPath(); held = 0; lx = ly = NaN; }
    }
    ctx.stroke();
  }
  ctx.restore();
}

// The margin, the picture, the middle of the lens and the cut guides. Never plotted.
function drawGuides(ctx) {
  if (!area || !PIC) return;
  const s = settings, dark = luma(s.paperColor) < 0.25;
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = dark ? 'rgba(110, 200, 255, 0.85)' : 'rgba(26, 109, 209, 0.8)';
  ctx.lineWidth = 0.3;
  ctx.setLineDash([1.5, 1.5]);
  ctx.strokeRect(area.x0, area.y0, area.w, area.h);
  if (PIC.disc) {
    ctx.beginPath();
    ctx.arc(PIC.cx, PIC.cy, PIC.R, 0, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  if (CAM) {
    ctx.beginPath();
    ctx.moveTo(CAM.cx - 3, CAM.cy); ctx.lineTo(CAM.cx + 3, CAM.cy);
    ctx.moveTo(CAM.cx, CAM.cy - 3); ctx.lineTo(CAM.cx, CAM.cy + 3);
    ctx.stroke();
  }
  if (s.cropMarks) {
    for (const [x, y] of cropMarkPlaces()) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }
  ctx.restore();
}

////////////////////////////////////////////////////////////////////////////////////////
// The mouse and the keys
//
// Dragging the sheet turns the eye; shift-drag (or the right button) moves it across and
// up, alt-drag moves it forward and back. The wheel widens and narrows the lens. While the
// hand is moving the walls are not hatched and the curves are followed more coarsely.

function eyeStep(fwd, side, up) {
  const s = settings, V = WORLD.void;
  const ya = rad(s.yaw);
  const f = [Math.sin(ya), Math.cos(ya)], r = [Math.cos(ya), -Math.sin(ya)];
  const dx = f[0] * fwd + r[0] * side, dy = f[1] * fwd + r[1] * side;
  s.camX = +clamp(s.camX + dx / Math.max(1, V.x1 - V.x0) * 100, -100, 200).toFixed(2);
  s.camY = +clamp(s.camY + dy / Math.max(1, V.y1 - V.y0) * 100, -100, 200).toFixed(2);
  s.camZ = +clamp(s.camZ + up / Math.max(1, V.z1 - V.z0) * 100, -100, 200).toFixed(2);
  for (const k of ['camX', 'camY', 'camZ']) if (setters[k]) setters[k](s[k]);
}

function attachPointer() {
  const c = canvasEl();
  c.addEventListener('contextmenu', e => e.preventDefault());
  c.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.button !== 2) return;
    const s = settings;
    drag = {
      mode: e.shiftKey || e.button === 2 ? 'move' : e.altKey ? 'walk' : 'look',
      x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false,
      yaw: s.yaw, pitch: s.pitch,
    };
    c.setPointerCapture(e.pointerId);
    c.classList.add('dragging');
    e.preventDefault();
  });
  c.addEventListener('pointermove', e => {
    if (!drag) return;
    const s = settings;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 3) return;
    drag.moved = true;
    const k = DRAG_DEG_PX * Math.max(0.2, Math.min(1.5, s.fov / 180));
    if (drag.mode === 'look') {
      s.yaw = +wrapDeg(drag.yaw - dx * k).toFixed(1);
      s.pitch = +clamp(drag.pitch + dy * k, -90, 90).toFixed(1);
      for (const key of ['yaw', 'pitch']) if (setters[key]) setters[key](s[key]);
    } else {
      const mx = e.clientX - drag.lx, my = e.clientY - drag.ly;
      if (drag.mode === 'move') eyeStep(0, -mx * 0.02, my * 0.02);
      else eyeStep(-my * 0.03, 0, 0);
    }
    drag.lx = e.clientX; drag.ly = e.clientY;
    liveUpdate();
    e.preventDefault();
  });
  const end = e => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    c.classList.remove('dragging');
    try { c.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
    if (moved) update(); else drawPreview();
  };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', end);
  c.addEventListener('wheel', e => {
    e.preventDefault();
    if (drag) return;
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    const s = settings;
    s.fov = +clamp(s.fov * Math.exp(delta * 0.001), 5, 360).toFixed(1);
    if (setters.fov) setters.fov(s.fov);
    settle();
  }, { passive: false });
}

let settleTimer = null;

function settle() {
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => { settleTimer = null; update(); }, 200);
}

// Where the eye stands and looks when a kind of space is picked.
const SPACE_EYES = {
  hall:     { camX: 50, camY: 18, camZ: 45, yaw: 0, pitch: 8, objX: 50, objY: 45, objZ: 50 },
  corridor: { camX: 50, camY: 2, camZ: 50, yaw: 0, pitch: 0, objX: 50, objY: 30, objZ: 50, objSize: 0.5, objSpread: 3 },
  shaft:    { camX: 50, camY: 50, camZ: 4, yaw: 0, pitch: 90, objX: 50, objY: 50, objZ: 45, objPlace: 'column' },
  canyon:   { camX: 50, camY: 4, camZ: 6, yaw: 0, pitch: 30, objX: 50, objY: 35, objZ: 45 },
  atrium:   { camX: 50, camY: 50, camZ: 3, yaw: 0, pitch: 90, objX: 50, objY: 50, objZ: 50, objPlace: 'spiral' },
  lattice:  { camX: 42, camY: 6, camZ: 42, yaw: 10, pitch: 6, objX: 50, objY: 50, objZ: 50 },
  maze:     { camX: 61, camY: 61, camZ: 30, yaw: 0, pitch: 0, objX: 50, objY: 50, objZ: 50, objects: 2 },
  void:     { camX: 50, camY: 0, camZ: 40, yaw: 0, pitch: 4, objX: 50, objY: 55, objZ: 50 },
};

function pickSpace(name) {
  const s = settings;
  s.space = name;
  [s.spaceW, s.spaceD, s.spaceH] = SPACE_DIMS[name] || SPACE_DIMS.hall;
  Object.assign(s, { objPlace: DEFAULTS.objPlace, objSize: DEFAULTS.objSize, objSpread: DEFAULTS.objSpread,
    objects: DEFAULTS.objects }, SPACE_EYES[name] || {});
  refreshControls();
  update();
}

function attachKeys() {
  window.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || t.isContentEditable ||
        (t.tagName === 'INPUT' && !['checkbox', 'button', 'color', 'range'].includes(t.type)))) return;
    if (t && t.tagName === 'SELECT' && !/^[a-zA-Z\[\]]$/.test(e.key)) return;
    if (e.metaKey || e.ctrlKey || e.altKey || drag) return;
    if (t && t.tagName === 'SELECT') t.blur();
    const s = settings;
    const cycle = (key, list, dir) => {
      s[key] = list[(list.indexOf(s[key]) + dir + list.length) % list.length];
      refreshControls();
      update();
    };
    const step = e.shiftKey ? 15 : 5;
    const look = (k, d) => {
      s[k] = k === 'pitch' ? clamp(s[k] + d, -90, 90) : +wrapDeg(s[k] + d).toFixed(1);
      refreshControls(); update();
    };
    const walk = (f, sd, up) => { eyeStep(f, sd, up); update(); };
    switch (e.key) {
      case 'ArrowUp':    if (e.shiftKey) look('pitch', 5); else walk(0.25, 0, 0); break;
      case 'ArrowDown':  if (e.shiftKey) look('pitch', -5); else walk(-0.25, 0, 0); break;
      case 'ArrowLeft':  if (e.shiftKey) look('yaw', -step); else walk(0, -0.25, 0); break;
      case 'ArrowRight': if (e.shiftKey) look('yaw', step); else walk(0, 0.25, 0); break;
      case 'PageUp':     walk(0, 0, 0.25); break;
      case 'PageDown':   walk(0, 0, -0.25); break;
      case 'q': case 'Q': look('roll', -step); break;
      case 'e': case 'E': look('roll', step); break;
      case 'p': cycle('projection', PROJECTIONS, 1); break;
      case 'P': cycle('projection', PROJECTIONS, -1); break;
      case 'b': case 'B': {
        const k = SPACES.indexOf(s.space) + (e.key === 'B' ? -1 : 1);
        pickSpace(SPACES[(k + SPACES.length) % SPACES.length]);
        break;
      }
      case 'k': cycle('greeble', GREEBLES, 1); break;
      case 'K': cycle('greeble', GREEBLES, -1); break;
      case 'o': cycle('objKind', OBJ_KINDS, 1); break;
      case 'O': cycle('objKind', OBJ_KINDS, -1); break;
      case 'y': cycle('objStyle', OBJ_STYLES, 1); break;
      case 'Y': cycle('objStyle', OBJ_STYLES, -1); break;
      case 'f': cycle('objFill', OBJ_FILLS, 1); break;
      case 'F': cycle('objFill', OBJ_FILLS, -1); break;
      case 'l': cycle('light', LIGHTS, 1); break;
      case 'L': cycle('light', LIGHTS, -1); break;
      case 'h': case 'H': s.shadows = !s.shadows; refreshControls(); update(); break;
      case 'd': case 'D': s.frameShape = s.frameShape === 'disc' ? 'fill' : 'disc'; refreshControls(); update(); break;
      case 's': case 'S': {
        const k = (SCENES.findIndex(sc => sc.label === lastScene) + (e.key === 'S' ? -1 : 1) +
                   SCENES.length) % SCENES.length || (e.key === 'S' ? SCENES.length - 1 : 1);
        applyScene(SCENES[k]);
        break;
      }
      case 'r': case 'R': s.seed = Math.floor(Math.random() * 100000); refreshControls(); update(); break;
      case '[': s.seed = Math.max(0, Math.round(s.seed) - 1); refreshControls(); update(); break;
      case ']': s.seed = Math.round(s.seed) + 1; refreshControls(); update(); break;
      case '+': case '=': s.fov = clamp(Math.round(s.fov - 10), 5, 360); refreshControls(); update(); break;
      case '-': case '_': s.fov = clamp(Math.round(s.fov + 10), 5, 360); refreshControls(); update(); break;
      case 'x': case 'X': s.cropMarks = !s.cropMarks; refreshControls(); update(); break;
      case 'g': case 'G': s.showGuides = !s.showGuides; refreshControls(); drawPreview(); syncUrl(); break;
      default: return;
    }
    e.preventDefault();
  });
}

////////////////////////////////////////////////////////////////////////////////////////
// Scenes — sheets worth starting from. Each one is the whole state.

const SCENES = [
  { label: '— select a scene —' },
  { label: 'A hall of blocks through a fisheye, plates floating', s: {} },
];

////////////////////////////////////////////////////////////////////////////////////////
// Controls

let lastScene = '';

function syncVisibility() {
  const s = settings;
  const show = (keys, on) => { for (const k of keys) setVisible(k, on); };
  setVisible('orientation', s.paper !== 'custom');
  show(['customW', 'customH'], s.paper === 'custom');
  show(['cropMarkAt', 'cropMarkGap'], s.cropMarks);
  setVisible('discSize', s.frameShape === 'disc');
  setVisible('fovAcross', s.frameShape !== 'disc');
  setVisible('framePen', s.border);

  const sp = s.space;
  setVisible('openings', sp !== 'void');
  setVisible('pillars', sp === 'hall' || sp === 'corridor' || sp === 'shaft');
  setVisible('latticeStep', sp === 'lattice');
  setVisible('ground', sp === 'void');
  const g = s.greeble !== 'plain';
  show(['gDepth', 'gMin', 'gMax', 'gSplit', 'gFlat', 'gInset', 'gLevels'], g);

  const k = PK[s.projection];
  setVisible('mirrorXi', k === 6);
  setVisible('discK', k === 7 || k === 8);
  setVisible('pannini', k === 12);
  setVisible('fov', k !== 13);

  const n = s.objects > 0;
  show(['objKind', 'objStyle', 'objPlace', 'objX', 'objY', 'objZ', 'objSpread', 'objSize',
    'objSizeVar', 'objTurn', 'objFill', 'coreKind', 'trails'], n);
  const st = s.objStyle, plates = n && ['mixed', 'plates', 'framed', 'cage'].includes(st);
  show(['plateGap', 'plateThick', 'explode'], plates);
  show(['frameW'], n && ['mixed', 'framed', 'cage'].includes(st));
  show(['panelSunk'], n && ['mixed', 'framed'].includes(st));
  show(['strutW', 'nodeSize'], n && ['mixed', 'struts'].includes(st));
  show(['trailCount', 'trailYaw', 'trailPitch', 'trailDash', 'trailPen'], n && s.trails > 0);
  show(['edgeGap'], n && s.objFill === 'black, paper edges');
  show(['solidPasses', 'solidPen'], n && (s.objFill === 'black' || s.objFill === 'black, paper edges'));

  const lit = s.light !== 'none';
  show(['lightYaw', 'lightPitch'], s.light === 'sun');
  show(['lampX', 'lampY', 'lampZ', 'lampReach'], s.light === 'lamp');
  show(['shadows'], s.light === 'sun' || s.light === 'lamp');
  show(['ambient', 'shadeWalls', 'contrast'], lit || s.objFill === 'shaded');
  show(['hatchPitch', 'hatchDir', 'crossAt', 'lightest', 'shadePen', 'shadeObjects'],
    lit || s.objFill === 'shaded');
  refreshPenList();
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
  createDiv('Every cut of a panel, every block, the passages, which things float where and how ' +
    'they are turned. <b>[</b> and <b>]</b> step, <b>R</b> rolls.').parent(field).class('note');
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
  let sec;

  sec = addSection(root, 'Scene');
  const sceneSel = createSelect().parent(createDiv('').parent(sec).class('field'));
  for (const sc of SCENES) sceneSel.option(sc.label);
  sceneSel.changed(() => {
    const sc = SCENES[sceneSel.elt.selectedIndex];
    if (sc && sc.s) applyScene(sc);
    sceneSel.elt.selectedIndex = 0;
    sceneSel.elt.blur();
  });
  addSeedField(sec);
  createDiv('').parent(sec).class('note keys').html(
    '<div><kbd>drag</kbd> look round · <kbd>shift</kbd>/<kbd>right</kbd>+<kbd>drag</kbd> move across and up · <kbd>alt</kbd>+<kbd>drag</kbd> forward</div>' +
    '<div><kbd>wheel</kbd> <kbd>+</kbd> <kbd>−</kbd> the lens wider or narrower</div>' +
    '<div><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> walk · <kbd>PgUp</kbd><kbd>PgDn</kbd> up, down · <kbd>shift</kbd>+arrows look · <kbd>Q</kbd><kbd>E</kbd> roll</div>' +
    '<div><kbd>S</kbd> scene · <kbd>B</kbd> space · <kbd>K</kbd> greebles · <kbd>P</kbd> lens · <kbd>D</kbd> disc · <kbd>O</kbd> things · <kbd>Y</kbd> style · <kbd>F</kbd> fill</div>' +
    '<div><kbd>L</kbd> light · <kbd>H</kbd> shadows · <kbd>R</kbd> roll · <kbd>[</kbd> <kbd>]</kbd> seed · <kbd>X</kbd> cut guides · <kbd>G</kbd> guides</div>');

  sec = addSection(root, 'The space');
  const spaceSel = addSelect(sec, 'Kind', 'space', SPACES, () => pickSpace(settings.space),
    '<b>hall</b> — a room with passages leading off it; <b>corridor</b>; <b>shaft</b> — a well to ' +
    'look up or down; <b>canyon</b> — a street between towers stepping back as they rise, bridges ' +
    'over it, the sky open; <b>atrium</b> — storeys of galleries round a void; <b>lattice</b> — ' +
    'beams of a space frame, open all round; <b>maze</b> — a labyrinth in three dimensions; ' +
    '<b>void</b> — nothing but the floating things, on a floor. Picking one sets its size and the eye. <b>B</b> steps.');
  spaceSel.elt.addEventListener('change', () => spaceSel.elt.blur());
  addSlider(sec, 'Across (modules)', 'spaceW', 1, 40, 1);
  addSlider(sec, 'Along (modules)', 'spaceD', 1, 80, 1);
  addSlider(sec, 'Up (modules)', 'spaceH', 1, 60, 1);
  addSlider(sec, 'Passages off it', 'openings', 0, 40, 1,
    'Doors, side corridors, niches — dark mouths in the walls. In the canyon, bridges; in the lattice, beams taken out.');
  addSlider(sec, 'Pillars every (modules)', 'pillars', 0, 8, 1, '0 — none.');
  addSlider(sec, 'Lattice pitch (modules)', 'latticeStep', 2, 8, 1);
  addCheckbox(sec, 'A floor under the void', 'ground');
  addSelect(sec, 'The floor', 'floor', FLOORS, update,
    '<b>tiles</b> — squares of half a module; <b>plain</b>; or greebled <b>as the walls</b>.');

  sec = addSection(root, 'Greebles');
  addSelect(sec, 'On the walls', 'greeble', GREEBLES, resync,
    '<b>blocks</b> — panels with blocks standing out, blocks on blocks; <b>panels</b> — shallow ' +
    'plates and frames; <b>towers</b> — stepped stacks; <b>ribs</b> — rows of fins; <b>mixed</b> — ' +
    'all of it, with studs; <b>plain</b> — bare walls. <b>K</b> steps.');
  addSlider(sec, 'Stand out at most (modules)', 'gDepth', 0.02, 1.5, 0.01);
  addSlider(sec, 'Smallest panel (modules)', 'gMin', 0.04, 1, 0.01);
  addSlider(sec, 'Largest panel (modules)', 'gMax', 0.2, 6, 0.05, 'Anything larger is always cut.');
  addSlider(sec, 'Cut again (%)', 'gSplit', 0, 98, 1, 'The chance a panel is cut once more.');
  addSlider(sec, 'Left flat (%)', 'gFlat', 0, 100, 1);
  addSlider(sec, 'Paper round a block (modules)', 'gInset', 0, 0.2, 1 / 64);
  addSlider(sec, 'Blocks on blocks', 'gLevels', 1, 4, 1);
  addSlider(sec, 'Faces run together (modules)', 'mergeFaces', 1, 8, 1,
    'How many modules of one wall may make one panel before it is cut.');

  sec = addSection(root, 'The eye');
  addSlider(sec, 'Across (% of the space)', 'camX', -100, 200, 0.5,
    '<b>Shift</b>-drag or the arrows move it; outside 0–100 it stands in a passage or a wall.');
  addSlider(sec, 'Along (%)', 'camY', -100, 200, 0.5);
  addSlider(sec, 'Up (%)', 'camZ', -100, 200, 0.5);
  addSlider(sec, 'Turned (°)', 'yaw', -180, 180, 0.5, 'Drag on the sheet to look round.');
  addSlider(sec, 'Looking up (°)', 'pitch', -90, 90, 0.5);
  addSlider(sec, 'Rolled (°)', 'roll', -180, 180, 0.5);
  addSlider(sec, 'Farthest (modules)', 'farthest', 2, 400, 1, 'Nothing beyond is drawn.');

  sec = addSection(root, 'The lens');
  addSelect(sec, 'Projection', 'projection', PROJECTIONS, resync,
    '<b>perspective</b> — a pinhole, straight lines straight; the fisheyes — <b>fisheye</b> ' +
    '(equidistant), <b>equisolid</b>, <b>orthographic</b>, <b>stereographic</b>; the mirrors — what ' +
    'the eye sees in a convex <b>parabolic</b> or <b>hyperbolic mirror</b> held before it: the middle ' +
    'is behind the eye; the discs — the whole sphere as the hyperbolic plane, <b>Poincaré</b> ' +
    '(conformal) or <b>Klein</b>; the cylinders — <b>panorama</b> (equirectangular), <b>cylinder</b>, ' +
    '<b>Mercator</b>, <b>Pannini</b> (uprights straight), <b>Hammer</b> (everything, in an ellipse); ' +
    '<b>tunnel</b> — log-polar: the rings round the axis come out as straight rows. <b>P</b> steps.');
  addSlider(sec, 'Field of view (°)', 'fov', 5, 360, 0.5,
    'Across the picture\'s short side, or the disc; for the cylinders, across its width. The wheel changes it.');
  addSlider(sec, 'Mirror shape ξ', 'mirrorXi', 0, 0.99, 0.01, '0 — a pinhole; towards 1 the hyperboloid becomes a paraboloid.');
  addSlider(sec, 'Crowding at the rim', 'discK', 0.1, 4, 0.01, 'How much of everything is squeezed into the rim of the disc.');
  addSlider(sec, 'Pannini distance', 'pannini', 0, 3, 0.01, '0 — a pinhole across; 1 — the classic.');
  addSlider(sec, 'Stretched across (%)', 'squeeze', 20, 300, 1, 'An anamorphic squeeze.');
  addSlider(sec, 'Swirl (°)', 'swirl', -360, 360, 1, 'Turned more the further from the middle — a vortex.');
  addSlider(sec, 'Bulge (%)', 'barrel', -60, 200, 1, 'Out towards the rim (+) or pinched in (−).');
  addSlider(sec, 'Middle across (%)', 'shiftX', -100, 100, 0.5);
  addSlider(sec, 'Middle up (%)', 'shiftY', -100, 100, 0.5);
  addSelect(sec, 'Picture', 'frameShape', FRAME_SHAPES, resync,
    '<b>fill</b> — the margin box; <b>disc</b> — a round picture, as a fisheye makes. <b>D</b> switches.');
  addSelect(sec, 'Field of view across', 'fovAcross', FOV_ACROSS, update,
    'Which way across a filled picture the field of view is measured: across the <b>diagonal</b> ' +
    'a fisheye fills the whole frame, across the <b>short side</b> it leaves the corners bare.');
  addSlider(sec, 'Disc (% of the short side)', 'discSize', 10, 100, 1);
  addCheckbox(sec, 'A line round the picture', 'border', resync);

  sec = addSection(root, 'Floating things');
  addSlider(sec, 'How many', 'objects', 0, 40, 1);
  addSelect(sec, 'Kind', 'objKind', OBJ_KINDS, resync,
    'The Platonic and Archimedean solids, a geodesic ball and a Goldberg ball, prisms, a star ' +
    '(spikes on a dodecahedron or icosahedron), the stella octangula, a Menger cube, a cluster of ' +
    'greebled blocks, a ring, a gyroscope of three rings, a monolith, a spiral stair, nested cube ' +
    'frames — or <b>mixed</b>. <b>O</b> steps.');
  addSelect(sec, 'Made of', 'objStyle', OBJ_STYLES, resync,
    '<b>solid</b>; <b>plates</b> — each face a thick plate with a gap round it; <b>framed</b> — each ' +
    'face a frame with a sunken panel; <b>cage</b> — frames only, the inside showing; <b>struts</b> — ' +
    'beams along the edges, a knot at each corner; <b>mixed</b>. <b>Y</b> steps.');
  addSelect(sec, 'Laid out', 'objPlace', OBJ_PLACES, update,
    '<b>cluster</b> — round a middle; <b>scatter</b> — anywhere in the space; <b>ring</b>; ' +
    '<b>column</b> — one above another; <b>line</b> — down the length; <b>spiral</b> — winding up.');
  addSlider(sec, 'Middle across (% of the space)', 'objX', 0, 100, 0.5);
  addSlider(sec, 'Middle along (%)', 'objY', 0, 100, 0.5);
  addSlider(sec, 'Middle up (%)', 'objZ', 0, 100, 0.5);
  addSlider(sec, 'Spread (modules)', 'objSpread', 0, 12, 0.05);
  addSlider(sec, 'Size (modules)', 'objSize', 0.05, 5, 0.01, 'The radius of the ball round each.');
  addSlider(sec, 'Sizes differ (%)', 'objSizeVar', 0, 95, 1);
  addSelect(sec, 'Turned', 'objTurn', OBJ_TURNS, update, '<b>random</b>; <b>upright</b> — turned about the vertical only; <b>square</b> — to the walls.');
  addSlider(sec, 'Gap between plates (% of the radius)', 'plateGap', 0, 40, 0.5);
  addSlider(sec, 'Plate thickness (%)', 'plateThick', 1, 60, 0.5);
  addSlider(sec, 'Flying apart (%)', 'explode', 0, 80, 0.5);
  addSlider(sec, 'Frame width (% of a face)', 'frameW', 2, 90, 1);
  addSlider(sec, 'Panel sunk (% of the plate)', 'panelSunk', 0, 90, 1);
  addSlider(sec, 'Strut width (% of the radius)', 'strutW', 0.5, 30, 0.5);
  addSlider(sec, 'Knots (% of the radius)', 'nodeSize', 0.5, 30, 0.5);
  addSelect(sec, 'A smaller one inside', 'coreKind', ['none', ...POLY_KINDS], update,
    'Seen through the gaps, the cage and the struts.');
  addSelect(sec, 'Drawn', 'objFill', OBJ_FILLS, resync,
    '<b>outline</b> — the edges; <b>black</b> — the edges and the faces filled; <b>black, paper ' +
    'edges</b> — the faces filled, with paper left where the edges are, as cut from black card; ' +
    '<b>shaded</b> — hatched by the light (by the eye when there is none). <b>F</b> steps.');
  addSlider(sec, 'Paper along the edges (mm)', 'edgeGap', 0, 3, 0.05);
  addSlider(sec, 'Trails (radii)', 'trails', 0, 20, 0.1, 'Streaks left behind them, as if they flew. 0 — none.');
  addSlider(sec, 'Streaks each', 'trailCount', 1, 80, 1);
  addSlider(sec, 'Flying towards (°)', 'trailYaw', -180, 180, 1);
  addSlider(sec, 'Flying up (°)', 'trailPitch', -90, 90, 1);
  addSlider(sec, 'Broken (%)', 'trailDash', 0, 100, 1, '0 — whole lines; more — dashes thinning out.');

  sec = addSection(root, 'Light and shadow');
  addSelect(sec, 'Light', 'light', LIGHTS, resync,
    '<b>none</b> — lines only; <b>sun</b> — parallel light from far away; <b>lamp</b> — a point of ' +
    'light in the space, falling off with distance; <b>eye</b> — a lamp on the forehead: what ' +
    'faces the eye is lit. The faces are hatched by how dark they are. <b>L</b> steps.');
  addSlider(sec, 'Sun from (°)', 'lightYaw', -180, 180, 1);
  addSlider(sec, 'Sun height (°)', 'lightPitch', -90, 90, 1);
  addSlider(sec, 'Lamp across (% of the space)', 'lampX', -50, 150, 0.5);
  addSlider(sec, 'Lamp along (%)', 'lampY', -50, 150, 0.5);
  addSlider(sec, 'Lamp up (%)', 'lampZ', -50, 150, 0.5);
  addSlider(sec, 'Lamp reaches (modules)', 'lampReach', 0.5, 60, 0.5, 'Half as bright this far away.');
  addCheckbox(sec, 'Shadows', 'shadows', resync);
  addSlider(sec, 'Ambient (%)', 'ambient', 0, 100, 1);
  addSlider(sec, 'Contrast (%)', 'contrast', -100, 300, 1);
  addCheckbox(sec, 'Hatch the walls', 'shadeWalls');
  addCheckbox(sec, 'Hatch the things (when shaded)', 'shadeObjects');
  addSlider(sec, 'Hatching apart (mm)', 'hatchPitch', 0.2, 5, 0.05, 'At the darkest.');
  addSelect(sec, 'Hatching runs', 'hatchDir', HATCH_DIRS, update,
    '<b>along</b> the longer side of a face; <b>across</b> it; <b>by face</b> — either, by chance.');
  addSlider(sec, 'Crossed above (% tone)', 'crossAt', 5, 100, 1, '100 — never.');
  addSlider(sec, 'Bare below (% tone)', 'lightest', 0, 100, 1);

  sec = addSection(root, 'Lines');
  addCheckbox(sec, 'The edges of the halls', 'edges');
  addSlider(sec, 'Shortest piece (mm)', 'minLine', 0, 5, 0.05);
  addSlider(sec, 'Curves kept within (mm)', 'smoothness', 0.01, 0.5, 0.01,
    'How near a curved edge must keep to the true curve. Finer is smoother and takes longer.');
  addSlider(sec, 'Solid passes apart (% of the nib)', 'solidPasses', 30, 200, 1);

  sec = addSection(root, 'Pens');
  addNote(sec, 'Five pens of the drawer; each layer picks one by number. Changing the kind sets ' +
    'its colour and a usual width.');
  addPenSelect(sec, 'Edges of the halls', 'linePen', 'The cut guides go with the first pen in use.');
  addPenSelect(sec, 'Floating things', 'objPen');
  addPenSelect(sec, 'Shading', 'shadePen');
  addPenSelect(sec, 'Solid black', 'solidPen');
  addPenSelect(sec, 'Trails', 'trailPen');
  addPenSelect(sec, 'Line round the picture', 'framePen');
  for (let i = 0; i < SLOTS; i++) addPenSlot(sec, i);

  sec = addSection(root, 'Paper');
  addSelect(sec, 'Size', 'paper', PAPERS, () => { syncVisibility(); resizeForPaper(); });
  addSelect(sec, 'Orientation', 'orientation', ['landscape', 'portrait'], resizeForPaper);
  addSlider(sec, 'Width (mm)', 'customW', 20, 2000, 1, '', resizeForPaper);
  addSlider(sec, 'Height (mm)', 'customH', 20, 2000, 1, '', resizeForPaper);
  addSlider(sec, 'Margin (mm)', 'margin', 0, 150, 1);
  addSelect(sec, 'Paper', 'paperTone', TONES, () => {
    if (PAPER_TONES[settings.paperTone]) {
      settings.paperColor = PAPER_TONES[settings.paperTone];
      setters.paperColor(settings.paperColor);
    }
    drawPreview(); updateStats(); syncUrl();
  }, 'The preview only — the files have no background.');
  addColor(sec, 'Paper colour', 'paperColor');
  addCheckbox(sec, 'Cut guide dots', 'cropMarks', resync);
  addSelect(sec, 'Dots round', 'cropMarkAt', MARK_AT, update,
    'The <b>sheet</b> — plot on a larger piece of paper and trim it back to size; the ' +
    '<b>picture</b> — cut the margin off.');
  addSlider(sec, 'Most between two dots (mm)', 'cropMarkGap', 20, 600, 5,
    'A dot in every corner, and each side split evenly so no gap is wider than this — lay ' +
    'the blade through two dots and cut. <b>X</b> switches them.');

  sec = addSection(root, 'Output');
  addCheckbox(sec, 'Order the strokes for the plotter', 'optimiseOrder');
  addCheckbox(sec, 'Follow the sliders live', 'liveUpdate', () => syncUrl());
  addCheckbox(sec, 'Show the margin, the picture, the middle and the cut guides', 'showGuides', () => { drawPreview(); syncUrl(); });
  addSlider(sec, 'Pen kept down over (% of the nib)', 'penDown', 0, 300, 5,
    'A hop shorter than this to the next stroke is drawn instead of lifted over.');
  createButton('Download SVG [everything]').parent(sec).class('primary')
    .mousePressed(() => exportSvg({ all: true }));
  createButton('Download SVG [one per pen]').parent(sec).mousePressed(() => exportSvg({ perPen: true }));
  const lb = createDiv('').parent(sec).class('layer-buttons');
  LAYERS.forEach((ly, li) => {
    layerButtons[li] = createButton('').parent(lb).mousePressed(() => exportSvg({ layer: li }));
  });
  addNote(sec, 'Everything is one file, a group per pen; a layer\'s file is that layer alone. ' +
    'Every file is the whole sheet in millimetres.');
  addSlider(sec, 'Picture (dpi)', 'pngDpi', 50, 600, 10, '', () => syncUrl());
  createButton('Download PNG').parent(sec).mousePressed(exportPng);
  const row = createDiv('').parent(sec).class('btn-row');
  createButton('Copy link').parent(row).mousePressed(function () { copyLink(this); });
  createButton('Reset').parent(row).mousePressed(resetAll);

  sec = addSection(root, 'The sheet');
  statsDiv = createDiv('').parent(sec).class('stats');
  penListDiv = createDiv('').parent(sec).class('stats');
  linkDiv = createDiv('').parent(sec).class('link');
  refreshPenSelects();
  syncVisibility();
}

////////////////////////////////////////////////////////////////////////////////////////
// What the sheet costs

function updateStats() {
  if (!statsDiv) return;
  const s = settings, W = WORLD;
  if (!shapes && !strokes) {
    statsDiv.html('<div class="warn">The margin leaves nothing to draw on.</div>');
    refreshPenList();
    return;
  }
  if (!plan || !shapes) {
    statsDiv.html(`<div class="warn">${groupNum(strokes)} strokes — past the ` +
      `${groupNum(MAX_STROKES)} limit, so nothing was ordered or drawn.</div>`);
    refreshPenList();
    return;
  }
  const seconds = plan.downs * PEN_CYCLE_S + plan.ink / DRAW_SPEED + plan.travel / TRAVEL_SPEED;
  let html =
    `<div class="big"><b>${groupNum(strokes)}</b> strokes, ` +
    `<b>${(plan.ink / 1000).toFixed(1)}</b> m of line</div>` +
    `<div>The pen goes down <b>${groupNum(plan.downs)}</b> times, ` +
    `${(plan.travel / 1000).toFixed(1)} m in the air</div>` +
    `<div>Roughly <b>${formatDuration(seconds)}</b> to plot · ${lastMs.toFixed(0)} ms to draw` +
    `${W && W.ms > 1 ? ` · the world built in ${W.ms.toFixed(0)} ms` : ''}</div>`;
  if (W) {
    html += `<div>${groupNum(W.rects.length)} panels of wall, ${groupNum(W.boxes.length)} blocks, ` +
      `${W.things.length} floating things of ${groupNum(W.pieces.length)} pieces</div>` +
      `<div>${groupNum(SEG_COUNT)} segments looked at, ${groupNum(COUNTS.lines)} edges after merging` +
      `${COUNTS.hatch ? `, ${groupNum(COUNTS.hatch)} hatch lines` : ''}` +
      `${COUNTS.passes ? `, ${groupNum(COUNTS.passes)} solid passes` : ''}</div>`;
    if (s.objects > 0 && W.things.length < Math.round(s.objects)) {
      html += `<div class="dim">Only ${W.things.length} of ${Math.round(s.objects)} things found room in the space.</div>`;
    }
  }
  if (s.cropMarks && perLayer && perLayer[L_GUIDES].strokes) {
    html += `<div>${perLayer[L_GUIDES].strokes} cut guide dots round the ${s.cropMarkAt}</div>`;
  }
  if (COUNTS && COUNTS.inside) {
    html += '<div class="warn">The eye is inside something solid — move it into the open (shift-drag, the arrows, or The eye).</div>';
  }
  const nib = penW(penIdx(s.shadePen));
  if ((s.light !== 'none' || s.objFill === 'shaded') && s.hatchPitch < nib) {
    html += `<div class="warn">The hatching is ${s.hatchPitch} mm apart and the pen ${nib} mm wide — ` +
      'at the darkest it closes up.</div>';
  }
  if (s.solidPasses > 100 && (s.objFill === 'black' || s.objFill === 'black, paper edges')) {
    html += '<div class="warn">Solid passes over 100 % of the nib leave a hair of paper between them.</div>';
  }
  for (let i = 0; i < SLOTS; i++) {
    if (perPen && perPen[i].strokes && contrastRatio(penCol(i), s.paperColor) < 1.6) {
      html += `<div class="warn">Pen ${i + 1} (${penKind(i)}) will barely show on this paper.</div>`;
    }
  }
  if (strokes > BUSY_STROKES) {
    html += `<div class="warn">${groupNum(strokes)} strokes is a long sitting at the plotter.</div>`;
  }
  statsDiv.html(html);
  refreshPenList();
}

function metaComment() {
  const s = settings;
  const pens = [];
  for (let i = 0; i < SLOTS; i++) if (perPen && perPen[i].strokes) pens.push(penLabel(i));
  return `curved halls — ${s.space} ${s.spaceW}x${s.spaceD}x${s.spaceH} greeble=${s.greeble} ` +
    `lens=${s.projection} fov=${s.fov} things=${s.objects}x${s.objKind}/${s.objStyle}/${s.objFill} ` +
    `light=${s.light}${s.light !== 'none' && s.shadows ? '+shadows' : ''} ` +
    `${s.cropMarks ? `cutguides=${s.cropMarkAt}<=${s.cropMarkGap}mm ` : ''}` +
    `seed=${s.seed} pens=[${pens.join('; ')}] strokes=${strokes}`;
}

function fileStem() {
  const s = settings;
  const paper = s.paper === 'custom' ? `${s.customW}x${s.customH}mm` : `${s.paper}-${s.orientation}`;
  return `curved halls ${s.space} ${s.projection} seed${s.seed} ${paper}`;
}

////////////////////////////////////////////////////////////////////////////////////////
// Controls, shared

function foldedSet() {
  try { return new Set(JSON.parse(localStorage.getItem('p5js26-folded') || '[]')); }
  catch (e) { return new Set(); }
}

function saveFolded(set) {
  try { localStorage.setItem('p5js26-folded', JSON.stringify([...set])); } catch (e) { /* no storage */ }
}

function addSection(parent, title, folded) {
  const head = createDiv(title).parent(parent).class('section');
  const body = createDiv('').parent(parent).class('sec-body');
  const set = foldedSet();
  if (set.has(title) || (folded && !set.has('!' + title))) head.addClass('folded');
  head.mousePressed(() => {
    const st = foldedSet();
    if (head.hasClass('folded')) {
      head.removeClass('folded'); st.delete(title); st.add('!' + title);
    } else {
      head.addClass('folded'); st.add(title); st.delete('!' + title);
    }
    saveFolded(st);
  });
  return body;
}

function addSub(parent, title) { createDiv(title).parent(parent).class('sub'); }

function addNote(parent, html) { return createDiv(html).parent(parent).class('note'); }

function setVisible(key, on) {
  if (fieldDivs[key]) fieldDivs[key].style('display', on ? '' : 'none');
}

// A scene is the whole picture, but not how the sheet is to be cut out or put out.
const SCENE_KEEPS = ['cropMarks', 'cropMarkAt', 'cropMarkGap', 'optimiseOrder', 'liveUpdate',
  'showGuides', 'pngDpi'];

function applyScene(sc) {
  const kept = {};
  for (const k of SCENE_KEEPS) kept[k] = settings[k];
  Object.assign(settings, DEFAULTS, sc.s || {}, kept);
  lastScene = sc.label;
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
  sel.changed(() => { settings[key] = sel.value(); (onChange || update)(); sel.elt.blur(); });
  return sel;
}

function addPenSelect(parent, labelText, key, hint) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const sel = createSelect().parent(field);
  for (let i = 0; i < SLOTS; i++) sel.option(penLabel(i), String(i + 1));
  sel.selected(String(settings[key]));
  if (hint) createDiv(hint).parent(field).class('note');
  setters[key] = v => sel.selected(String(v));
  sel.changed(() => { settings[key] = Number(sel.value()); update(); sel.elt.blur(); });
  penSelects.push(sel);
  return sel;
}

function refreshPenSelects() {
  for (const sel of penSelects) {
    const o = sel.elt.options;
    for (let i = 0; i < o.length && i < SLOTS; i++) o[i].text = penLabel(i);
  }
  slotSwatches.forEach((sw, i) => sw.style('background', penCol(i)));
}

function addCheckbox(parent, labelText, key, onChange) {
  const row = createDiv('').parent(parent).class('checkbox-row');
  fieldDivs[key] = row;
  const cb = createCheckbox(labelText, settings[key]).parent(row);
  setters[key] = v => cb.checked(!!v);
  cb.changed(() => { settings[key] = cb.checked(); (onChange || update)(); });
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
    if (key === 'paperColor' && settings.paperTone !== 'custom') {
      settings.paperTone = 'custom';
      if (setters.paperTone) setters.paperTone('custom');
    }
    refreshPenSelects();
    refreshPenList();
    updateStats();
    drawPreview();
    syncUrl();
  });
  return cp;
}

function addPenSlot(parent, i) {
  const box = createDiv('').parent(parent).class('pen-slot');
  const head = createDiv('').parent(box).class('slot-head');
  const sw = createSpan('').parent(head).class('sw');
  slotSwatches[i] = sw;
  createSpan(`Pen ${i + 1}`).parent(head);
  const k = `pen${i + 1}`;
  addSelect(box, 'Kind', k + 'Kind', KINDS, () => {
    const kind = PEN_KINDS[settings[k + 'Kind']];
    if (kind) {
      settings[k + 'Col'] = kind.col;
      settings[k + 'W'] = kind.w;
      setters[k + 'Col'](kind.col);
      setters[k + 'W'](kind.w);
    }
    refreshPenSelects();
    update();
  });
  addSlider(box, 'Width (mm)', k + 'W', 0.05, 20, 0.05, '', () => { refreshPenSelects(); update(); });
  addColor(box, 'Colour', k + 'Col');
}

function refreshPenList() {
  LAYERS.forEach((ly, li) => {
    const b = layerButtons[li];
    if (!b) return;
    const p = perLayer && perLayer[li];
    const on = p && p.strokes > 0;
    b.style('display', on ? '' : 'none');
    if (on) {
      const sw = [...p.pens].sort().map(i =>
        `<span class="sw" style="background:${penCol(i)}"></span>`).join('');
      b.html(`${sw}SVG [${ly.label}] — ${groupNum(p.strokes)} strokes, ${(p.ink / 1000).toFixed(1)} m`);
    }
  });
  if (!penListDiv) return;
  if (!perPen) { penListDiv.html(''); return; }
  let html = '';
  for (const i of penOrder()) {
    const p = perPen[i];
    if (!p || !p.strokes) continue;
    const names = LAYERS.filter((ly, li) => perLayer && perLayer[li].pens.has(i)).map(ly => ly.label).join(', ');
    const sec = p.downs * PEN_CYCLE_S + p.ink / DRAW_SPEED + (p.travel || 0) / TRAVEL_SPEED;
    html += `<div class="pen-row"><span class="sw" style="background:${penCol(i)}"></span>` +
      `<span>${penLabel(i)} — <b>${groupNum(p.strokes)}</b> strokes, ` +
      `<b>${(p.ink / 1000).toFixed(1)}</b> m, ${formatDuration(sec)}` +
      `${names ? ` · ${names}` : ''}</span></div>`;
  }
  penListDiv.html(html);
}

////////////////////////////////////////////////////////////////////////////////////////
// SVG
//
// No fills, no background rectangle — everything in the file is meant to be plotted.
// stroke-width is each pen's own nib and the caps are round. Strokes come out in the order
// the pen should visit them, and the link that rebuilds the sheet is in the header.

function svgGroup(keepIt, pen, id, num) {
  const { pts, off } = shapes;
  const { order, flip } = plan;
  const f = n => String(+n.toFixed(3));
  const CHUNK = 400, reach = settings.penDown / 100 * penW(pen);
  let body = '', d = '', held = 0, count = 0, ex = NaN, ey = NaN;
  for (let t = 0; t < order.length; t++) {
    const i = order[t];
    if (shapes.ink[i] !== pen || !keepIt(i)) continue;
    const rev = flip[t] === 1;
    const a = off[i], b = off[i + 1], n = b - a;
    count++;
    let k = rev ? b - 1 : a;
    let px = pts[k * 2], py = pts[k * 2 + 1];
    d += (d && Math.hypot(px - ex, py - ey) <= reach ? 'L' : 'M') + `${f(px)},${f(py)}`;
    for (let m = 1; m < n; m++) {
      k += rev ? -1 : 1;
      const x = pts[k * 2], y = pts[k * 2 + 1];
      if (y === py)      d += `h${f(x - px)}`;
      else if (x === px) d += `v${f(y - py)}`;
      else               d += `l${f(x - px)},${f(y - py)}`;
      px = x; py = y;
    }
    ex = px; ey = py;
    if (++held >= CHUNK) { body += `  <path d="${d}"/>\n`; d = ''; held = 0; }
  }
  if (d) body += `  <path d="${d}"/>\n`;
  if (!count) return null;
  return `<g id="${id}" inkscape:label="${num} ${id}" fill="none" stroke="${penCol(pen)}" ` +
    `stroke-width="${f(penW(pen))}" stroke-linecap="round" stroke-linejoin="round">\n${body}</g>\n`;
}

function penId(i) { return `pen${i + 1}-${penKind(i).replace(/\s+/g, '-')}`; }

function svgFile(groups, tag) {
  const [W, H] = paperDims();
  // The groups numbered as they stand in the file: vpype takes the first number in a label for
  // its layer, sorts the strokes within a layer and writes the layers by number — so the plot
  // keeps this order through vpype-process.sh.
  let body = '', n = 0;
  for (const [keepIt, pen, id] of groups) {
    const g = svgGroup(keepIt, pen, id, n + 1);
    if (g) { body += g; n++; }
  }
  if (!body) return null;
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- ${metaComment().replace(/--/g, '- -')} pass=${tag} -->\n` +
    `<!-- ${location.origin === 'null' ? '' : location.origin}${location.pathname}` +
    `#${encodeState().replace(/--/g, '-%2D')} -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" ` +
    `width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n` +
    body +
    `</svg>\n`;
}

function exportSvg(what) {
  if (!shapes || !plan || !strokes) {
    alert('Nothing to export — no line is on this sheet yet.');
    return;
  }
  // the cut guides in a group of their own ahead of their pen's lines, so that vpype, which
  // sorts the strokes inside a group, cannot mix them in
  const guides = j => shapes.lay[j] === L_GUIDES, rest = j => shapes.lay[j] !== L_GUIDES;
  const penGroups = i => [[guides, i, `cut-guides-${penId(i)}`], [rest, i, penId(i)]];
  const files = [];
  if (what.all) {
    files.push([penOrder().flatMap(penGroups), 'everything']);
  } else if (what.perPen) {
    for (const i of penOrder()) {
      if (perPen[i] && perPen[i].strokes) {
        const w = penW(i);
        files.push([penGroups(i), `pen${i + 1} ${penKind(i)} ${+w.toFixed(2)}mm`]);
      }
    }
  } else if (what.layer !== undefined) {
    const li = what.layer;
    files.push([penOrder().map(i => [j => shapes.lay[j] === li, i, `${LAYERS[li].id}-${penId(i)}`]),
                LAYERS[li].id]);
  }
  const stamp = timestamp();
  let saved = 0;
  for (const [groups, tag] of files) {
    const svg = svgFile(groups, tag);
    if (!svg) continue;
    saveStrings([svg], `${fileStem()} ${tag} ${stamp}`, 'svg');
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
  drawSheet(c.getContext('2d'), pxmm, false);
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
