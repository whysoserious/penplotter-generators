////////////////////////////////////////////////////////////////////////////////////////
// Line volume — a block seen through, drawn as walls of lines, darker where it is dense
//
// The drawing this started from is a box of air hatched with nothing but upright lines:
// the lines of its long face evenly spaced, the lines of its short face coming forward
// one wall at a time, and inside it a dark cloud where line falls on line until the paper
// goes black. Nothing hides anything — it is all seen through, like a block of glass with
// smoke in it.
//
// So a volume is cut into walls — parallel planes front to back, floors one over another,
// pages round an axis or rings one inside another — and every wall carries a family of
// lines. The lines of the outside of the volume are drawn whole: they are the box. The
// lines inside are drawn only where a density field asks for them, and since every wall
// shows through every other, the dark builds up in the drawing wherever the field is
// dense, as it would in the eye.
//
// The field is a noise cloud, a few blobs, a mathematical surface or a formula typed in,
// a 2D cellular automaton with each generation a level higher, or a photograph. It is
// shaped — gathered into a ball, cut into bands, faded towards the back — and turned into
// ink by dither, a solid cut, squiggles, dashes, contour slices or crossed lines. The
// walls themselves can be bent, waved, sheared, tapered, spun, twisted and warped, and
// their lines slanted, waved, shaken, dashed or dotted.
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

// The drawer: rapidographs in black and red, ink markers in red, silver and white.
const PEN_KINDS = {
  'black':         { col: '#1b1b1b', w: 0.3 },
  'red':           { col: '#c8261d', w: 0.3 },
  'red marker':    { col: '#d9342a', w: 3 },
  'silver marker': { col: '#adb1b7', w: 3 },
  'white marker':  { col: '#f7f6f1', w: 3 },
  'other':         { col: '#2a5bd7', w: 0.5 },
};
const KINDS = Object.keys(PEN_KINDS);
const SLOTS = 5;

const STACKS       = ['depth', 'floors', 'pages', 'rings'];
const SHELLS       = ['front + ends', 'outside', 'front', 'ends', 'every line', 'none'];
const EDGE_KINDS   = ['none', 'tops', 'outlines', 'box'];
const LINE_STYLES  = ['straight', 'wavy', 'tremor', 'zigzag', 'dashed', 'dotted'];
const SOURCES      = ['cloud', 'blobs', 'function', 'automaton', 'photo', 'none'];
const FUNCTIONS    = ['gyroid', 'schwarz P', 'diamond', 'sphere', 'torus', 'double helix',
                      'waves', 'ripples', 'lattice', 'custom'];
const FN_MODES     = ['surface', 'inside', 'value'];
const BLOB_LAYOUTS = ['scattered', 'chain', 'ring', 'helix'];
const PHOTO_MAPS   = ['front', 'relief', 'lens', 'heightmap', 'plan'];
const CA_SEEDS     = ['random', 'disc', 'centre', 'cross', 'ring'];
const FOCI         = ['none', 'ball', 'column', 'layer'];
const DARK_MODES   = ['dither', 'solid', 'squiggle', 'dashes', 'contours', 'crossed'];
const DITHERS      = ['ordered', 'random', 'by wall', 'by line'];
const ACCENTS      = ['none', 'densest', 'back walls', 'front walls', 'every n-th wall', 'random lines'];
const PROJECTIONS  = ['parallel', 'perspective'];

// Life-like rules in B/S notation: the neighbour counts that give birth and that let a
// cell survive.
const CA_RULES = [
  { label: '— select a rule —' },
  { label: 'Life   B3/S23',              rule: 'B3/S23' },
  { label: 'HighLife   B36/S23',         rule: 'B36/S23' },
  { label: 'Replicator   B1357/S1357',   rule: 'B1357/S1357' },
  { label: 'Fredkin   B1357/S02468',     rule: 'B1357/S02468' },
  { label: 'Coral   B3/S45678',          rule: 'B3/S45678' },
  { label: 'Day & Night   B3678/S34678', rule: 'B3678/S34678' },
  { label: 'Maze   B3/S12345',           rule: 'B3/S12345' },
  { label: 'Majority   B5678/S45678',    rule: 'B5678/S45678' },
  { label: 'Anneal   B4678/S35678',      rule: 'B4678/S35678' },
  { label: 'Gnarl   B1/S1',              rule: 'B1/S1' },
  { label: 'Seeds   B2/S',               rule: 'B2/S' },
  { label: 'Diamoeba   B35678/S5678',    rule: 'B35678/S5678' },
];

// What goes on the sheet: the walls drawn whole, the dark zones, the part of them moved to
// another pen, and the edges of the walls.
const LAYERS = [
  { id: 'walls',  label: 'walls',      pen: 'shellPen' },
  { id: 'dark',   label: 'dark zones', pen: 'corePen' },
  { id: 'accent', label: 'accent',     pen: 'accentPen' },
  { id: 'edges',  label: 'edges',      pen: 'edgesPen' },
];
const L_SHELL = 0, L_CORE = 1, L_ACCENT = 2, L_EDGES = 3;

const MAX_STROKES    = 400_000;
const BUSY_STROKES   = 40_000;
const MAX_MODEL_PTS  = 6_000_000;
const SAMPLE_BUDGET  = 14_000_000; // density samples a build may take at most
const EPS            = 0.01;       // mm — the stub that stands in for a dot
const PREVIEW_MAX_PX = 1500;
const PEN_CYCLE_S    = 0.3;
const DRAW_SPEED     = 60;
const TRAVEL_SPEED   = 150;
const DRAG_DEG_PX    = 0.35;
const WHEEL_ZOOM     = 0.0015;
const MIN_ZOOM       = 10;
const MAX_ZOOM       = 1000;

const settings = {
  // paper
  paper: 'A3',
  orientation: 'landscape',
  customW: 500,
  customH: 400,
  margin: 20,
  paperTone: 'white',
  paperColor: '#fbfaf5',   // the preview only — the files have no background

  // the pens
  pen1Kind: 'black',         pen1W: 0.3, pen1Col: '#1b1b1b',
  pen2Kind: 'red',           pen2W: 0.3, pen2Col: '#c8261d',
  pen3Kind: 'red marker',    pen3W: 3,   pen3Col: '#d9342a',
  pen4Kind: 'silver marker', pen4W: 3,   pen4Col: '#adb1b7',
  pen5Kind: 'white marker',  pen5W: 3,   pen5Col: '#f7f6f1',
  shellPen: 1, corePen: 1, accentPen: 2, edgesPen: 1,

  // the volume
  stack: 'depth',
  sizeW: 100,
  sizeH: 42,
  sizeD: 30,
  hole: 0,              // % of the radius — the empty middle of pages and rings
  sweep: 360,           // ° — how far round the pages go

  // the walls
  walls: 30,
  crowd: 0,             // −100 … 100 — the walls crowd to the back or the front
  wallJitter: 0,        // % of the space between two walls
  lines: 110,           // lines across a wall
  lineShift: 0,         // of the space between two lines, from one wall to the next
  lineAngle: 0,         // ° off upright, in the wall
  shell: 'front + ends',
  shellEvery: 0,        // every n-th wall drawn whole as well
  edges: 'none',

  // the lines themselves
  lineStyle: 'straight',
  styleAmp: 25,         // % of the space between two lines
  styleFreq: 30,        // waves over the height of a wall
  styleAligned: false,  // every line waves in step

  // bending the walls
  bend: 0,              // % of the depth
  waveAmp: 0,           // % of the depth
  waveAcross: 1.5,      // waves across a wall
  waveUp: 0,            // waves up a wall
  wavePhase: 0,         // turns of the wave from the first wall to the last
  shearA: 0,            // % — each wall slid sideways
  shearB: 0,            // % — each wall slid up
  taper: 0,             // % — how much larger the last wall is
  spin: 0,              // ° — each wall turned in its own plane, first to last
  twist: 0,             // ° — the whole turned round the vertical, bottom to top
  warp: 0,              // %
  warpScale: 1.5,

  // the dark zones: what they are
  source: 'cloud',
  seed: 1,
  cloudScale: 2.2,
  cloudOctaves: 4,
  cloudWarp: 35,        // %
  blobs: 5,
  blobLayout: 'scattered',
  blobSize: 35,         // % of the largest half-size
  blobSoft: 60,         // %
  blobSpread: 60,       // %
  fn: 'gyroid',
  fnExpr: 'sin(5*x)*cos(4*y) + sin(4*z)',
  fnFreq: 2,
  fnMode: 'surface',
  fnLevel: 0,           // % — where the surface is, in the function's own range
  fnWidth: 25,          // % — how thick it is
  round: true,          // read the function in true proportions, not stretched to the box
  photoMap: 'front',
  photoDepth: 100,      // %
  photoInvert: false,
  photoCut: 12,         // % — lighter than this is left empty
  caRule: 'B3/S23',
  caSeed: 'random',
  caDensity: 35,        // %
  caRadius: 35,         // % of the grid
  caCells: 48,
  caLevels: 40,
  caStep: 1,            // generations from one level to the next
  caWarmup: 0,
  caMoore: true,
  caWrap: true,
  caUp: true,
  caTrail: 0,           // % — what is left of a dead cell a level later
  caSnap: true,         // one line for every cell

  // the dark zones: their shape
  focus: 'ball',
  focusX: -30,          // % of the half-size, from the middle
  focusY: 5,
  focusZ: 0,
  focusR: 70,           // % of the largest half-size
  focusSoft: 90,        // %
  level: 0,             // %
  contrast: 0,          // %
  gamma: 160,           // %
  invertField: false,
  bands: 0,
  base: 0,              // % — a haze everywhere
  densest: 100,         // % — the most of the lines the dark may take
  depthFade: 0,         // % — fading from the first wall to the last
  grain: 0,             // %
  grainScale: 8,

  // the dark zones: how they become ink
  dark: 'dither',
  ditherKind: 'ordered',
  levels: 16,
  iso: 50,              // % — the solid cut
  squigAmp: 70,         // % of the space between two lines
  squigFreq: 30,        // waves over the height of a wall
  dashLen: 8,           // % of the height of a wall
  contourLevels: 5,
  contourRes: 90,
  crossFrom: 45,        // % — crossed lines only past this
  minRun: 0.6,          // % of the height of a wall — a shorter piece is dropped
  accent: 'none',
  accentLevel: 70,      // %
  accentEvery: 4,
  accentShare: 20,      // %
  detail: 100,          // samples up a wall

  // the camera
  projection: 'parallel',
  azimuth: 34,
  elevation: 22,
  distance: 4,          // half-diagonals of the volume — perspective only
  upright: true,        // verticals stay vertical in perspective
  zoom: 100,            // %
  panX: 0,              // mm
  panY: 0,

  // output
  optimiseOrder: true,
  liveUpdate: true,
  showGuides: false,
  pngDpi: 200,
};

const DEFAULTS = { ...settings };

// Sheets worth starting from. Each one is the whole state.
const SCENES = [
  { label: '— select a scene —' },
  { label: 'Smoke in a glass block', s: {} },
  { label: 'Smoke, crossed', s: {
      dark: 'crossed', crossFrom: 40, walls: 24, lines: 90, focusR: 85, cloudScale: 1.8 } },
  { label: 'Smoke in dashes', s: { dark: 'dashes', dashLen: 9, focusR: 80, lines: 90 } },
  { label: 'The red heart of it', s: {
      accent: 'densest', accentLevel: 66, cloudWarp: 50 } },
  { label: 'Gyroid lattice', s: {
      sizeW: 70, sizeH: 70, sizeD: 70, walls: 34, lines: 70, source: 'function', fn: 'gyroid',
      fnFreq: 1.6, fnMode: 'surface', fnWidth: 22, focus: 'none', gamma: 100, dark: 'solid',
      iso: 50, shell: 'ends', edges: 'box', azimuth: 32, elevation: 28 } },
  { label: 'A torus in slices', s: {
      sizeW: 90, sizeH: 40, sizeD: 90, walls: 26, lines: 90, source: 'function', fn: 'torus',
      fnMode: 'inside', fnLevel: -45, fnWidth: 4, focus: 'none', gamma: 100, dark: 'contours',
      contourLevels: 1, contourRes: 140, shell: 'none', edges: 'box', elevation: 30 } },
  { label: 'Double helix', s: {
      sizeW: 46, sizeH: 100, sizeD: 46, walls: 26, lines: 60, source: 'function',
      fn: 'double helix', fnFreq: 3.5, fnMode: 'inside', fnLevel: -55, fnWidth: 10,
      focus: 'none', gamma: 100, shell: 'ends', edges: 'box', orientation: 'portrait',
      azimuth: 28, elevation: 16 } },
  { label: 'Ripples, squiggled', s: {
      source: 'function', fn: 'ripples', fnFreq: 3, fnMode: 'value', focus: 'ball', focusX: 0,
      focusY: 0, focusR: 80, gamma: 100, dark: 'squiggle', squigAmp: 90, squigFreq: 26,
      walls: 12, lines: 80 } },
  { label: 'Life, a generation a floor', s: {
      stack: 'floors', sizeW: 80, sizeH: 70, sizeD: 80, source: 'automaton', caRule: 'B3/S23',
      caSeed: 'random', caDensity: 35, caCells: 40, caLevels: 14, caStep: 2, caWarmup: 4,
      focus: 'none', dark: 'contours', contourLevels: 1, contourRes: 160, shell: 'none',
      edges: 'outlines', elevation: 38, azimuth: 32 } },
  { label: 'Anneal, domains growing up', s: {
      sizeW: 80, sizeH: 60, sizeD: 80, source: 'automaton', caRule: 'B4678/S35678',
      caSeed: 'random', caDensity: 50, caCells: 48, caLevels: 40, focus: 'none', densest: 55,
      shell: 'ends', edges: 'box', elevation: 24, azimuth: 36 } },
  { label: 'Diamoeba towers', s: {
      sizeW: 80, sizeH: 60, sizeD: 80, source: 'automaton', caRule: 'B35678/S5678',
      caSeed: 'random', caDensity: 48, caCells: 40, caLevels: 40, focus: 'none', dark: 'solid',
      shell: 'ends', edges: 'box', elevation: 24, azimuth: 36 } },
  { label: 'Replicator pyramid', s: {
      sizeW: 80, sizeH: 60, sizeD: 80, source: 'automaton', caRule: 'B1357/S1357',
      caSeed: 'centre', caCells: 61, caLevels: 40, caWrap: false, focus: 'none', dark: 'solid',
      shell: 'ends', edges: 'box', elevation: 24, azimuth: 36 } },
  { label: 'A worm of blobs', s: {
      source: 'blobs', blobs: 16, blobLayout: 'chain', blobSize: 22, blobSoft: 100,
      blobSpread: 80, focus: 'none', densest: 40 } },
  { label: 'The worm in slices', s: {
      source: 'blobs', blobs: 16, blobLayout: 'chain', blobSize: 22, blobSoft: 60,
      blobSpread: 80, focus: 'none', walls: 24, dark: 'contours', contourLevels: 2 } },
  { label: 'Curtains in the wind', s: {
      walls: 16, lines: 90, waveAmp: 9, waveAcross: 1.6, wavePhase: 0.8, shell: 'outside',
      edges: 'tops', focusR: 90, focusX: 0 } },
  { label: 'Twisted tower', s: {
      stack: 'rings', sizeW: 60, sizeH: 110, walls: 7, lines: 90, hole: 20, twist: 120,
      source: 'cloud', focus: 'column', focusX: 0, focusZ: 0, focusR: 60, shell: 'front',
      edges: 'tops', orientation: 'portrait', elevation: 18 } },
  { label: 'A book of pages', s: {
      stack: 'pages', sizeW: 90, sizeH: 60, walls: 22, lines: 50, sweep: 200, hole: 6,
      source: 'blobs', blobs: 4, blobSize: 40, focus: 'none', shell: 'outside',
      edges: 'outlines', elevation: 26, azimuth: 10 } },
  { label: 'A stair of walls', s: {
      walls: 20, lines: 70, sizeW: 70, sizeH: 34, sizeD: 70, shearB: 70, shearA: 20,
      shell: 'outside', edges: 'outlines', source: 'blobs', blobs: 3, blobSize: 45,
      focus: 'none', azimuth: 40, elevation: 20 } },
  { label: 'Spun walls', s: {
      walls: 24, lines: 60, sizeW: 70, sizeH: 70, sizeD: 70, spin: 90, shell: 'outside',
      focusX: 0, focusR: 70, edges: 'outlines' } },
  { label: 'Your photo, in relief', s: {
      source: 'photo', photoMap: 'relief', photoDepth: 100, focus: 'none', gamma: 100,
      dark: 'solid', iso: 50, walls: 30, lines: 140, sizeW: 100, sizeH: 75, sizeD: 30,
      shell: 'none', edges: 'box', azimuth: 22, elevation: 10 } },
  { label: 'Your photo, through every wall', s: {
      source: 'photo', photoMap: 'front', focus: 'none', gamma: 100, levels: 32, walls: 12,
      densest: 45,
      lines: 150, sizeW: 100, sizeH: 75, sizeD: 24, shell: 'none', edges: 'box', azimuth: 8,
      elevation: 6 } },
  { label: 'Silver and white markers on black', s: {
      paper: 'B2', paperTone: 'black', paperColor: PAPER_TONES.black, walls: 9, lines: 34,
      shellPen: 4, corePen: 5, edgesPen: 4, focusR: 85, levels: 8, minRun: 3,
      cloudOctaves: 3 } },
];

const setters   = {};
const fieldDivs = {};
let statsDiv, linkDiv, penListDiv, layerButtons = {}, penSelects = [], slotSwatches = [];
let photoNote, fnNote, ruleInput, ruleInfo;

let area    = null;          // the margin box, in mm
let shapes  = null;          // { pts, off, ink, lay } — polylines in mm
let strokes = 0;
let plan    = null;          // { order, flip, ink, travel }
let perPen  = null;
let perLayer = null;
let lastMs  = 0;
let modelMs = 0;
let drag    = null;

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

function frac(v) { return v - Math.floor(v); }

function sstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

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

// A number in [0, 1) for a pair of integers and a salt — what a line decides about itself,
// the same whatever order the lines are visited in.
let SEED_MIX = 0;

function hash01(i, j, salt) {
  let h = Math.imul(i | 0, 0x27d4eb2d) ^ Math.imul((j | 0) + 0x3c6ef372, 0x165667b1) ^
          Math.imul((salt | 0) + SEED_MIX, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca77);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae3d);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
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

////////////////////////////////////////////////////////////////////////////////////////
// The URL is the document
//
// Every setting that differs from its default is written into the hash, debounced, with
// replaceState so the back button stays usable. A photograph loaded from disk is the one
// thing that cannot ride in it.

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
  if (ruleInput) ruleInput.value(settings.caRule);
  updateRuleInfo();
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
  const [a, b] = PAPER_SIZES[settings.paper] || PAPER_SIZES.A3;
  return settings.orientation === 'portrait' ? [a, b] : [b, a];
}

function penW(i) { return clamp(Number(settings[`pen${i + 1}W`]) || 0.3, 0.05, 30); }
function penCol(i) { return settings[`pen${i + 1}Col`] || '#000000'; }
function penKind(i) { return settings[`pen${i + 1}Kind`] || 'black'; }
function penIdx(v) { return clamp(Math.round(Number(v) || 1), 1, SLOTS) - 1; }
function layerPen(li) { return penIdx(settings[LAYERS[li].pen]); }

function penLabel(i) {
  const w = penW(i);
  return `${i + 1} · ${penKind(i)} ${w < 1 ? w.toFixed(2) : +w.toFixed(1)} mm`;
}

// The room inside the margin: what the volume is fitted into.
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

// The passes go down in the order of the pens.
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
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
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
  const t0 = performance.now();
  strokes = 0;
  shapes = plan = perPen = perLayer = null;

  shapes = buildShapes();
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
// Noise
//
// Improved Perlin in three dimensions, seeded, and octaves of it summed.

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

function fbm(nz, x, y, z, octaves) {
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * nz(x * f + o * 17.31, y * f - o * 9.73, z * f + o * 5.19);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

let NZ = null, NZW = null, nzSeedNow = null;

function ensureNoise() {
  const seed = settings.seed | 0;
  SEED_MIX = Math.imul(seed + 1, 0x632be5ab);
  if (seed === nzSeedNow) return;
  nzSeedNow = seed;
  NZ  = makePerlin3(seed * 7919 + 17);
  NZW = makePerlin3(seed * 6271 + 911);
}

////////////////////////////////////////////////////////////////////////////////////////
// The field
//
// Every source is read at a point q of the volume, each coordinate running from −1 to 1
// across it — x across, y up, z from the back to the front. What comes out is a density
// from 0 to 1; a function's value is first brought to −1 … 1 by where its 2nd and 98th
// percentiles fall, since no formula knows its own range, and the surface, the inside or
// the value of it taken from there. Then it is shaped: contrast, gamma, bands, gathered
// into a ball, faded towards the back walls, grained, and a haze added under it all.

let FIELD = null;            // { val(qx, qy, qz), stepped, fn, cell, note, … }
let fieldKeyNow = '';
let PHOTO = null;            // { img, name, ver }
let photoVer = 0;
let PHOTO_GREY = null, photoGreyVer = -1;

const FIELD_KEYS = ['stack', 'sizeW', 'sizeH', 'sizeD', 'source', 'seed', 'cloudScale',
  'cloudOctaves', 'cloudWarp', 'blobs', 'blobLayout', 'blobSize', 'blobSoft', 'blobSpread',
  'fn', 'fnExpr', 'fnFreq', 'round', 'photoMap', 'photoDepth', 'photoInvert', 'photoCut', 'caRule',
  'caSeed', 'caDensity', 'caRadius', 'caCells', 'caLevels', 'caStep', 'caWarmup', 'caMoore',
  'caWrap', 'caUp', 'caTrail'];

function isCylinder() { return settings.stack === 'pages' || settings.stack === 'rings'; }

// The half-sizes of the volume, and the same as shares of the largest: what turns q into
// true proportions, so a ball stays round in a long box.
function halfSizes() {
  const s = settings;
  const hx = Math.max(0.5, s.sizeW / 2), hy = Math.max(0.5, s.sizeH / 2);
  const hz = isCylinder() ? hx : Math.max(0.5, s.sizeD / 2);
  const m = Math.max(hx, hy, hz);
  return { hx, hy, hz, ax: hx / m, ay: hy / m, az: hz / m };
}

function ensureField() {
  const key = FIELD_KEYS.map(k => settings[k]).join('|') + '|' + (PHOTO ? PHOTO.ver : 0);
  if (FIELD && key === fieldKeyNow) return;
  fieldKeyNow = key;
  FIELD = makeField();
}

// A function brought to −1 … 1 by its 2nd and 98th percentiles over the volume.
function levelled(fn, lo, hi) {
  const rnd = mulberry32(0x51ed27);
  const n = 4000, v = new Float64Array(n);
  for (let i = 0; i < n; i++) v[i] = fn(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
  v.sort();
  const p = v[Math.floor(n * 0.02)], P = v[Math.floor(n * 0.98)];
  const k = P - p > 1e-12 ? (hi - lo) / (P - p) : 0;
  return (x, y, z) => lo + (fn(x, y, z) - p) * k;
}

function makeField() {
  const s = settings, H = halfSizes();
  const out = { val: () => 0, stepped: false, fn: false, note: '', cell: 0 };
  switch (s.source) {
    case 'cloud':     return cloudField(s, H, out);
    case 'blobs':     return blobField(s, H, out);
    case 'function':  return functionField(s, H, out);
    case 'automaton': return automatonField(s, H, out);
    case 'photo':     return photoField(s, H, out);
    default:          return out;
  }
}

// Fractal noise, its coordinates first pushed about by noise of their own.
function cloudField(s, H, out) {
  const nz = makePerlin3((s.seed | 0) * 7919 + 101), wz = makePerlin3((s.seed | 0) * 104729 + 3);
  const sc = Math.max(0.05, s.cloudScale), oct = clamp(Math.round(s.cloudOctaves), 1, 7);
  const wp = clamp(s.cloudWarp, 0, 300) / 100 * 1.6;
  const raw = (x, y, z) => {
    let X = x * H.ax * sc, Y = y * H.ay * sc, Z = z * H.az * sc;
    if (wp > 0) {
      const dx = fbm(wz, X * 0.6 + 11.3, Y * 0.6, Z * 0.6, 2);
      const dy = fbm(wz, X * 0.6, Y * 0.6 + 27.1, Z * 0.6, 2);
      const dz = fbm(wz, X * 0.6, Y * 0.6, Z * 0.6 + 41.7, 2);
      X += wp * dx; Y += wp * dy; Z += wp * dz;
    }
    return fbm(nz, X, Y, Z, oct);
  };
  const lv = levelled(raw, 0, 1);
  out.val = (x, y, z) => { const v = lv(x, y, z); return v < 0 ? 0 : v > 1 ? 1 : v; };
  return out;
}

// Metaballs: each a gaussian, summed, the edge of the sum at a half softened by blobSoft.
function blobField(s, H, out) {
  const rnd = rng(31);
  const n = clamp(Math.round(s.blobs), 1, 200), sp = clamp(s.blobSpread, 0, 150) / 100;
  const r0 = Math.max(0.01, s.blobSize / 100);
  const C = [];
  const lim = [H.ax * sp, H.ay * sp, H.az * sp];
  if (s.blobLayout === 'chain') {
    let p = [(rnd() * 2 - 1) * lim[0], (rnd() * 2 - 1) * lim[1], (rnd() * 2 - 1) * lim[2]];
    let d = [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5];
    for (let i = 0; i < n; i++) {
      C.push([p[0], p[1], p[2], r0 * (0.75 + 0.5 * rnd())]);
      for (let k = 0; k < 3; k++) d[k] += (rnd() - 0.5) * 0.9;
      const l = Math.hypot(d[0], d[1], d[2]) || 1;
      for (let k = 0; k < 3; k++) {
        d[k] /= l;
        p[k] += d[k] * r0 * 0.85;
        if (p[k] > lim[k]) { p[k] = 2 * lim[k] - p[k]; d[k] = -Math.abs(d[k]); }
        if (p[k] < -lim[k]) { p[k] = -2 * lim[k] - p[k]; d[k] = Math.abs(d[k]); }
      }
    }
  } else if (s.blobLayout === 'ring') {
    const tilt = (rnd() - 0.5) * 1.2, rr = Math.min(lim[0], lim[2]) * 0.85;
    for (let i = 0; i < n; i++) {
      const a = i / n * 2 * Math.PI;
      C.push([rr * Math.cos(a), rr * Math.sin(a) * Math.sin(tilt), rr * Math.sin(a) * Math.cos(tilt),
              r0 * (0.8 + 0.4 * rnd())]);
    }
  } else if (s.blobLayout === 'helix') {
    const rr = Math.min(lim[0], lim[2]) * 0.6, turns = 1.5;
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 0.5, a = t * turns * 2 * Math.PI;
      C.push([rr * Math.cos(a), (2 * t - 1) * lim[1], rr * Math.sin(a), r0 * (0.8 + 0.4 * rnd())]);
    }
  } else {
    for (let i = 0; i < n; i++) {
      C.push([(rnd() * 2 - 1) * lim[0], (rnd() * 2 - 1) * lim[1], (rnd() * 2 - 1) * lim[2],
              r0 * (0.65 + 0.7 * rnd())]);
    }
  }
  const soft = clamp(s.blobSoft, 0, 100) / 100;
  const e0 = 0.5 - 0.5 * soft - 0.02, e1 = 0.5 + 0.5 * soft + 0.02;
  out.val = (x, y, z) => {
    const X = x * H.ax, Y = y * H.ay, Z = z * H.az;
    let sum = 0;
    for (let i = 0; i < C.length; i++) {
      const c = C[i], dx = X - c[0], dy = Y - c[1], dz = Z - c[2];
      const q = (dx * dx + dy * dy + dz * dz) / (c[3] * c[3]);
      if (q < 9) sum += Math.exp(-q);
    }
    return sstep(e0, e1, sum);
  };
  return out;
}

// A formula typed in: only numbers, the coordinates and the functions of Math, so a link
// cannot carry anything else.
const FN_ALLOWED = new Set(['x', 'y', 'z', 'r', 'a', 'h', 'sin', 'cos', 'tan', 'asin', 'acos',
  'atan', 'atan2', 'sinh', 'cosh', 'tanh', 'exp', 'log', 'sqrt', 'cbrt', 'abs', 'min', 'max',
  'floor', 'ceil', 'round', 'sign', 'pow', 'hypot', 'fract', 'mod', 'clamp', 'mix', 'step',
  'smoothstep', 'noise', 'pi', 'PI', 'tau', 'TAU', 'e', 'E']);

function compileExpr(str) {
  const src = String(str || '').trim();
  if (!src) return { err: 'nothing typed' };
  if (src.length > 500) return { err: 'too long' };
  if (!/^[0-9A-Za-z_+\-*/%^()., <>=!?:&|\t]*$/.test(src)) {
    return { err: 'only numbers, x y z r a h, + − * / ^ % ( ) and functions' };
  }
  for (const id of src.match(/[A-Za-z_][A-Za-z_0-9]*/g) || []) {
    if (!FN_ALLOWED.has(id)) return { err: `unknown name “${id}”` };
  }
  const body = '"use strict";' +
    'const {sin,cos,tan,asin,acos,atan,atan2,sinh,cosh,tanh,exp,log,sqrt,cbrt,abs,min,max,' +
    'floor,ceil,round,sign,pow,hypot}=Math;' +
    'const pi=Math.PI,PI=pi,tau=2*pi,TAU=tau,e=Math.E,E=e;' +
    'const fract=v=>v-Math.floor(v),mod=(v,m)=>v-m*Math.floor(v/m),' +
    'clamp=(v,l,u)=>Math.min(u,Math.max(l,v)),mix=(p,q,t)=>p+(q-p)*t,step=(t,v)=>v<t?0:1,' +
    'smoothstep=(p,q,v)=>{const t=Math.min(1,Math.max(0,(v-p)/(q-p)));return t*t*(3-2*t);};' +
    `return +(${src.replace(/\^/g, '**')});`;
  let fn;
  try {
    fn = new Function('x', 'y', 'z', 'r', 'a', 'h', 'noise', body);
  } catch (e) {
    return { err: 'cannot read it — ' + e.message };
  }
  try {
    const v = fn(0.31, -0.22, 0.47, 0.6, 0.98, 0.39, () => 0.1);
    if (typeof v !== 'number') return { err: 'it gives no number' };
  } catch (e) {
    return { err: e.message };
  }
  return { fn };
}

function presetFunction(s, H) {
  const k = Math.max(0.05, s.fnFreq) * Math.PI;
  switch (s.fn) {
    case 'gyroid': return (x, y, z) => {
      const X = k * x, Y = k * y, Z = k * z;
      return Math.sin(X) * Math.cos(Y) + Math.sin(Y) * Math.cos(Z) + Math.sin(Z) * Math.cos(X);
    };
    case 'schwarz P': return (x, y, z) => Math.cos(k * x) + Math.cos(k * y) + Math.cos(k * z);
    case 'diamond': return (x, y, z) => {
      const sx = Math.sin(k * x), sy = Math.sin(k * y), sz = Math.sin(k * z);
      const cx = Math.cos(k * x), cy = Math.cos(k * y), cz = Math.cos(k * z);
      return sx * sy * sz + sx * cy * cz + cx * sy * cz + cx * cy * sz;
    };
    case 'sphere': return (x, y, z) => Math.hypot(x, y, z);
    case 'torus': return (x, y, z) => Math.hypot(Math.hypot(x, z) - 0.6, y);
    case 'double helix': return (x, y, z) => {
      const t = 0.5 * k * y, hx = 0.5 * Math.cos(t), hz = 0.5 * Math.sin(t);
      return Math.min(Math.hypot(x - hx, z - hz), Math.hypot(x + hx, z + hz));
    };
    case 'waves': {
      const rnd = rng(53), W = [];
      for (let i = 0; i < 3; i++) {
        const th = rnd() * 2 * Math.PI, ph = Math.acos(rnd() * 2 - 1);
        W.push([Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th), rnd() * 6.28]);
      }
      return (x, y, z) => {
        let v = 0;
        for (const w of W) v += Math.sin(k * (w[0] * x + w[1] * y + w[2] * z) + w[3]);
        return v;
      };
    }
    case 'ripples': return (x, y, z) => Math.cos(k * Math.hypot(x, y, z));
    case 'lattice': {
      const g = Math.max(0.5, s.fnFreq);
      return (x, y, z) => {
        const fx = x * g - Math.round(x * g), fy = y * g - Math.round(y * g), fz = z * g - Math.round(z * g);
        return Math.hypot(fx, fy, fz);
      };
    }
    default: return null;
  }
}

function functionField(s, H, out) {
  let fn = null;
  if (s.fn === 'custom') {
    const c = compileExpr(s.fnExpr);
    if (c.err) {
      out.note = c.err;
      return out;
    }
    const nz = NZ;
    const call = c.fn, noise3 = (x, y, z) => nz(x, y, z);
    fn = (x, y, z) => {
      const v = call(x, y, z, Math.hypot(x, y, z), Math.atan2(z, x), (y + 1) / 2, noise3);
      return Number.isFinite(v) ? v : 0;
    };
  } else {
    fn = presetFunction(s, H);
  }
  if (!fn) return out;
  const f = s.round ? (x, y, z) => fn(x * H.ax, y * H.ay, z * H.az) : fn;
  out.val = levelled(f, -1, 1);
  out.fn = true;
  return out;
}

// "B3/S23", "b3s23", "S23/B3" — anything with a B and an S followed by neighbour counts.
function parseCaRule(str) {
  const s = String(str).toUpperCase().replace(/\s+/g, '');
  const b = /B([0-8]*)/.exec(s), sv = /S([0-8]*)/.exec(s);
  if (!b || !sv) return null;
  let birth = 0, survive = 0;
  for (const ch of b[1])  birth   |= 1 << Number(ch);
  for (const ch of sv[1]) survive |= 1 << Number(ch);
  return { birth, survive };
}

function ruleString(r) {
  const digits = m => { let s = ''; for (let n = 0; n <= 8; n++) if ((m >> n) & 1) s += n; return s; };
  return `B${digits(r.birth)}/S${digits(r.survive)}`;
}

const MOORE_DX = [-1, 0, 1, -1, 1, -1, 0, 1];
const MOORE_DY = [-1, -1, -1, 0, 0, 1, 1, 1];
const VN_DX    = [0, -1, 1, 0];
const VN_DY    = [-1, 0, 0, 1];

function caStep(cur, nxt, nx, ny, rule, moore, wrap) {
  const DX = moore ? MOORE_DX : VN_DX, DY = moore ? MOORE_DY : VN_DY, K = DX.length;
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      let n = 0;
      for (let k = 0; k < K; k++) {
        let xx = x + DX[k], yy = y + DY[k];
        if (wrap) {
          if (xx < 0) xx += nx; else if (xx >= nx) xx -= nx;
          if (yy < 0) yy += ny; else if (yy >= ny) yy -= ny;
        } else if (xx < 0 || xx >= nx || yy < 0 || yy >= ny) continue;
        n += cur[xx + nx * yy];
      }
      const i = x + nx * y;
      nxt[i] = cur[i] ? (rule.survive >> n) & 1 : (rule.birth >> n) & 1;
    }
  }
}

// A 2D automaton on the plan of the volume, every generation a level higher: the cells
// alive in it are where the dark is. With a trail, a dead cell keeps a share of what it
// had a level below, so the stack goes soft.
function automatonField(s, H, out) {
  const rule = parseCaRule(s.caRule) || parseCaRule('B3/S23');
  const nx = clamp(Math.round(s.caCells), 3, 240);
  const nz = clamp(Math.round(nx * H.hz / H.hx), 1, 240);
  let gens = clamp(Math.round(s.caLevels), 1, 400);
  if (nx * nz * gens > 6e6) gens = Math.max(1, Math.floor(6e6 / (nx * nz)));
  const rnd = rng(41);
  let cur = new Uint8Array(nx * nz), nxt = new Uint8Array(nx * nz);
  const cx = (nx - 1) / 2, cz = (nz - 1) / 2;
  const R = clamp(s.caRadius, 1, 150) / 100 * Math.min(nx, nz) / 2;
  const dens = clamp(s.caDensity, 0, 100) / 100;
  switch (s.caSeed) {
    case 'random':
      for (let i = 0; i < cur.length; i++) cur[i] = rnd() < dens ? 1 : 0;
      break;
    case 'disc':
      for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
        const coin = rnd();
        if ((x - cx) ** 2 + (z - cz) ** 2 <= R * R) cur[x + nx * z] = coin < dens ? 1 : 0;
      }
      break;
    case 'cross': {
      const ix = Math.floor(nx / 2), iz = Math.floor(nz / 2), r = Math.max(1, Math.round(R));
      for (let i = -r; i <= r; i++) {
        if (ix + i >= 0 && ix + i < nx) cur[ix + i + nx * iz] = 1;
        if (iz + i >= 0 && iz + i < nz) cur[ix + nx * (iz + i)] = 1;
      }
      break;
    }
    case 'ring':
      for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
        if (Math.abs(Math.hypot(x - cx, z - cz) - R) < 0.7) cur[x + nx * z] = 1;
      }
      break;
    default:
      cur[Math.floor(nx / 2) + nx * Math.floor(nz / 2)] = 1;
  }
  const moore = s.caMoore, wrap = s.caWrap;
  const step = () => { caStep(cur, nxt, nx, nz, rule, moore, wrap); const t = cur; cur = nxt; nxt = t; };
  for (let i = 0; i < clamp(Math.round(s.caWarmup), 0, 2000); i++) step();
  const trail = clamp(s.caTrail, 0, 99) / 100;
  const cells = new Float32Array(nx * nz * gens);
  let alive = 0, lastAlive = 0;
  for (let g = 0; g < gens; g++) {
    const o = g * nx * nz;
    let a = 0;
    for (let i = 0; i < nx * nz; i++) {
      if (cur[i]) { cells[o + i] = 1; a++; }
      else if (trail && g) cells[o + i] = cells[o - nx * nz + i] * trail;
    }
    alive += a;
    lastAlive = a;
    for (let k = 0; k < clamp(Math.round(s.caStep), 1, 50); k++) step();
  }
  const up = s.caUp;
  out.val = (x, y, z) => {
    const i = clamp(Math.floor((x + 1) / 2 * nx), 0, nx - 1);
    const k = clamp(Math.floor((1 - z) / 2 * nz), 0, nz - 1);
    let g = clamp(Math.floor((y + 1) / 2 * gens), 0, gens - 1);
    if (!up) g = gens - 1 - g;
    return cells[g * nx * nz + k * nx + i];
  };
  out.stepped = true;
  out.nx = nx; out.nz = nz; out.gens = gens;
  out.cell = Math.min(2 * H.hx / nx, 2 * H.hz / nz, 2 * H.hy / gens);
  out.alive = alive / (nx * nz * gens);
  out.lastAlive = lastAlive;
  out.note = `${nx} × ${nz} cells, ${gens} levels, ${(100 * out.alive).toFixed(0)} % alive`;
  return out;
}

// The photograph in greys, at most 480 px along its longer side.
function photoGrey() {
  if (!PHOTO) return null;
  if (PHOTO_GREY && photoGreyVer === PHOTO.ver) return PHOTO_GREY;
  const img = PHOTO.img, k = Math.min(1, 480 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data, L = new Float32Array(w * h);
  for (let i = 0; i < L.length; i++) {
    L[i] = (0.2126 * d[4 * i] + 0.7152 * d[4 * i + 1] + 0.0722 * d[4 * i + 2]) / 255;
  }
  PHOTO_GREY = { w, h, L };
  photoGreyVer = PHOTO.ver;
  return PHOTO_GREY;
}

// The photograph laid over a face of aspect ta, cut to cover it, read between pixels.
function photoSampler(P, ta) {
  const ia = P.w / P.h;
  const su = ia > ta ? ta / ia : 1, sv = ia > ta ? 1 : ia / ta;
  return (u, v) => {
    const x = clamp((0.5 + (u - 0.5) * su) * P.w - 0.5, 0, P.w - 1);
    const y = clamp((0.5 + (v - 0.5) * sv) * P.h - 0.5, 0, P.h - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(P.w - 1, x0 + 1), y1 = Math.min(P.h - 1, y0 + 1);
    const fx = x - x0, fy = y - y0, L = P.L;
    const a = L[y0 * P.w + x0] + (L[y0 * P.w + x1] - L[y0 * P.w + x0]) * fx;
    const b = L[y1 * P.w + x0] + (L[y1 * P.w + x1] - L[y1 * P.w + x0]) * fx;
    return a + (b - a) * fy;
  };
}

function photoField(s, H, out) {
  const P = photoGrey();
  if (!P) { out.note = 'no photo loaded'; return out; }
  const inv = s.photoInvert, deep = clamp(s.photoDepth, 1, 200) / 100;
  const cut = clamp(s.photoCut, 0, 95) / 100;
  const front = photoSampler(P, H.hx / H.hy), plan = photoSampler(P, H.hx / H.hz);
  const tone = l => { const d = inv ? l : 1 - l; return d <= cut ? 0 : (d - cut) / (1 - cut); };
  const darkF = (u, v) => tone(front(u, v));
  const darkP = (u, v) => tone(plan(u, v));
  const e = 0.015;
  switch (s.photoMap) {
    case 'relief':       // as deep from the front as it is dark
      out.val = (x, y, z) => 1 - sstep(-e, e, (1 - z) / 2 - darkF((x + 1) / 2, (1 - y) / 2) * deep);
      break;
    case 'lens':         // as thick about the middle as it is dark
      out.val = (x, y, z) => 1 - sstep(-e, e, Math.abs(z) - darkF((x + 1) / 2, (1 - y) / 2) * deep);
      break;
    case 'heightmap':    // on the plan, standing as high as it is dark
      out.val = (x, y, z) => 1 - sstep(-e, e, (y + 1) / 2 - darkP((x + 1) / 2, (z + 1) / 2) * deep);
      break;
    case 'plan':         // on the plan, the whole height
      out.val = (x, y, z) => darkP((x + 1) / 2, (z + 1) / 2);
      break;
    default:             // on the front, through every wall
      out.val = (x, y, z) => darkF((x + 1) / 2, (1 - y) / 2);
  }
  return out;
}

// The shaping, read once a build so the inner loop asks no settings.
let SH = null;

function prepareShaping() {
  const s = settings, H = halfSizes();
  SH = {
    fnMode: FIELD.fn ? FN_MODES.indexOf(s.fnMode) : -1,
    fnL: clamp(s.fnLevel, -150, 150) / 100, fnW: Math.max(0.005, s.fnWidth / 100),
    con: 1 + s.contrast / 100, lev: s.level / 100, gam: Math.max(0.05, s.gamma / 100),
    inv: s.invertField, bands: Math.round(s.bands), base: clamp(s.base, 0, 100) / 100,
    most: clamp(s.densest, 1, 100) / 100,
    fade: clamp(s.depthFade, 0, 100) / 100, grain: clamp(s.grain, 0, 100) / 100,
    gsc: Math.max(0.1, s.grainScale),
    focus: FOCI.indexOf(s.focus), fx: s.focusX / 100, fy: s.focusY / 100, fz: s.focusZ / 100,
    fr: Math.max(0.01, s.focusR / 100), fs: clamp(s.focusSoft, 0, 100) / 100,
    ax: H.ax, ay: H.ay, az: H.az,
  };
}

function densityAt(qx, qy, qz, w) {
  const S = SH;
  let d = FIELD.val(qx, qy, qz);
  if (S.fnMode >= 0) {
    if (S.fnMode === 0) d = 1 - sstep(0, S.fnW, Math.abs(d - S.fnL));
    else if (S.fnMode === 1) d = 1 - sstep(S.fnL - S.fnW, S.fnL + S.fnW, d);
    else d = (d + 1) / 2;
  }
  if (S.con !== 1 || S.lev) d = (d - 0.5) * S.con + 0.5 + S.lev;
  d = d < 0 ? 0 : d > 1 ? 1 : d;
  if (S.gam !== 1) d = Math.pow(d, S.gam);
  if (S.inv) d = 1 - d;
  if (S.bands > 1) d = Math.min(S.bands - 1, Math.floor(d * S.bands)) / (S.bands - 1);
  if (S.focus > 0) {
    const dx = (qx - S.fx) * S.ax, dy = (qy - S.fy) * S.ay, dz = (qz - S.fz) * S.az;
    const r = S.focus === 1 ? Math.sqrt(dx * dx + dy * dy + dz * dz)
            : S.focus === 2 ? Math.sqrt(dx * dx + dz * dz) : Math.abs(dy);
    d *= 1 - sstep(S.fr * (1 - S.fs) - 1e-3, S.fr, r);
  }
  if (S.fade) d *= 1 - S.fade * w;
  if (S.grain) {
    const g = 0.5 + 1.3 * NZ(qx * S.ax * S.gsc + 5.3, qy * S.ay * S.gsc - 2.1, qz * S.az * S.gsc + 8.7);
    d *= 1 - S.grain + S.grain * (g < 0 ? 0 : g > 1 ? 1 : g);
  }
  if (S.base) d = S.base + (1 - S.base) * d;
  return d * S.most;
}

////////////////////////////////////////////////////////////////////////////////////////
// The stack of walls
//
// A wall has its own coordinates: a across it, b along its lines, and w, how far through
// the stack it stands, from 0 at the first wall to 1 at the last.
//
//   depth   upright walls one behind another, from the front of the volume to its back;
//   floors  level floors one over another, from the bottom up, their lines running
//           from the back to the front;
//   pages   upright walls round the vertical axis, like the pages of a book stood open,
//           `sweep` of a turn, from `hole` out to the rim;
//   rings   cylinders one inside another, from the rim in to `hole`, a running round.
//
// Before a point is put in the world the wall can be spun in its own plane, scaled, slid
// sideways and up — each a little more from one wall to the next — and after it, bowed
// and waved along the wall's normal, the whole twisted round the vertical, and warped by
// noise. The field is always read where the point stood before any of that, so the dark
// zones go wherever the walls go.

let G = null;

function prepareStack() {
  const s = settings, H = halfSizes();
  const mode = STACKS.indexOf(s.stack);
  const W = H.hx * 2, Ht = H.hy * 2, D = H.hz * 2, R = H.hx;
  const rIn = R * clamp(s.hole, 0, 95) / 100;
  let K = clamp(Math.round(s.walls), 1, 400), L = clamp(Math.round(s.lines), 1, 1000);
  let snap = false;
  if (s.source === 'automaton' && s.caSnap && FIELD && FIELD.nx && mode <= 1) {
    snap = true;
    L = FIELD.nx;
    K = mode === 0 ? FIELD.nz : FIELD.gens;
  }
  const g = { mode, W, H: Ht, D, R, rIn, K, L, snap, hx: H.hx, hy: H.hy, hz: H.hz };
  if (mode === 0) { g.Wa = W; g.Hb = Ht; g.Dc = D; }
  else if (mode === 1) { g.Wa = W; g.Hb = D; g.Dc = Ht; }
  else if (mode === 2) { g.Wa = Math.max(1e-6, R - rIn); g.Hb = Ht; g.Dc = R; }
  else { g.Wa = 0; g.Hb = Ht; g.Dc = Math.max(R - rIn, R * 0.2); }
  g.sweep = rad(clamp(s.sweep, 1, 360));
  const full = mode === 2 && s.sweep >= 359.5;

  // where the walls stand, 0 … 1 through the stack
  const wpos = new Float64Array(K);
  const gam = Math.pow(2, clamp(s.crowd, -100, 100) / 50);
  const rnd = rng(17), jit = clamp(s.wallJitter, 0, 100) / 100;
  for (let k = 0; k < K; k++) {
    const coin = rnd();
    let w;
    if (snap) w = (k + 0.5) / K;
    else if (K === 1) w = mode >= 2 ? 0 : 0.5;
    else if (full || (mode === 3 && rIn === 0)) w = k / K;
    else w = k / (K - 1);
    if (!snap && K > 1) {
      w = Math.pow(w, gam);
      if (jit && k > 0 && k < K - 1) w = clamp(w + (coin - 0.5) * jit / (K - 1), 0, 1);
    }
    wpos[k] = w;
  }
  g.wpos = wpos;
  g.full = full;
  g.alpha = rad(clamp(s.lineAngle, -75, 75));
  g.tanA = Math.abs(s.lineAngle) < 1e-6 ? 0 : Math.tan(g.alpha);
  g.hasEnds = mode !== 3;

  g.spin = rad(s.spin); g.taper = s.taper / 100;
  g.shA = s.shearA / 100; g.shB = s.shearB / 100;
  g.bend = s.bend / 100; g.wA = s.waveAmp / 100;
  g.wU = mode === 3 ? Math.round(s.waveAcross) : s.waveAcross;
  g.wV = s.waveUp; g.wP = s.wavePhase;
  g.twist = rad(s.twist); g.warp = s.warp / 100; g.warpSc = Math.max(0.05, s.warpScale);
  g.Lmax = Math.max(W, Ht, D);
  G = g;
}

function ringR(w) { return G.R - w * (G.R - G.rIn); }

// The point of the stack at (a, b) on wall w, before any bending, and the wall's normal
// there — the way the stack runs.
const BP = new Float64Array(6);

function baseAt(a, b, w, out) {
  const g = G;
  switch (g.mode) {
    case 0:
      out[0] = a; out[1] = b; out[2] = g.D / 2 - w * g.D;
      out[3] = 0; out[4] = 0; out[5] = -1;
      return;
    case 1:
      out[0] = a; out[1] = -g.H / 2 + w * g.H; out[2] = b;
      out[3] = 0; out[4] = 1; out[5] = 0;
      return;
    case 2: {
      const r = g.rIn + a + g.Wa / 2, ph = g.full ? w * g.sweep : (w - 0.5) * g.sweep;
      const sn = Math.sin(ph), cs = Math.cos(ph);
      out[0] = r * sn; out[1] = b; out[2] = r * cs;
      out[3] = cs; out[4] = 0; out[5] = -sn;
      return;
    }
    default: {
      const r = Math.max(1e-9, ringR(w)), ph = a / r, sn = Math.sin(ph), cs = Math.cos(ph);
      out[0] = r * sn; out[1] = b; out[2] = r * cs;
      out[3] = -sn; out[4] = 0; out[5] = -cs;
    }
  }
}

// The field at (a, b) on wall w.
const BQ = new Float64Array(6);

function fieldOn(a, b, w) {
  baseAt(a, b, w, BQ);
  return densityAt(BQ[0] / G.hx, BQ[1] / G.hy, BQ[2] / G.hz, w);
}

// The same point, bent: into OUT3.
const OUT3 = new Float64Array(3);

function placeAt(a, b, w) {
  const g = G;
  let A = a, B = b;
  const dw = w - 0.5;
  if (g.spin && g.mode !== 3) {
    const t = g.spin * dw, c = Math.cos(t), s = Math.sin(t);
    const A2 = A * c - B * s;
    B = A * s + B * c;
    A = A2;
  }
  if (g.taper) {
    const k = Math.max(0.02, 1 + g.taper * w);
    if (g.mode !== 3) A *= k;
    B *= k;
  }
  if (g.shA) A += g.shA * (g.mode === 3 ? 2 * Math.PI * ringR(w) : g.Wa) * dw;
  if (g.shB) B += g.shB * g.Hb * dw;
  baseAt(A, B, w, BP);
  let x = BP[0], y = BP[1], z = BP[2];
  if (g.bend || g.wA) {
    const u = g.mode === 3 ? a / (2 * Math.PI * Math.max(1e-9, ringR(w))) : a / g.Wa + 0.5;
    const v = b / g.Hb + 0.5;
    let o = 0;
    if (g.bend && g.mode !== 3) { const t = 2 * u - 1; o += g.bend * g.Dc * (1 - t * t); }
    if (g.wA) o += g.wA * g.Dc * Math.sin(2 * Math.PI * (g.wU * u + g.wV * v + g.wP * w));
    x += BP[3] * o; y += BP[4] * o; z += BP[5] * o;
  }
  if (g.twist) {
    const t = g.twist * y / g.H, c = Math.cos(t), s = Math.sin(t);
    const x2 = x * c + z * s;
    z = -x * s + z * c;
    x = x2;
  }
  if (g.warp) {
    const k = g.warpSc / g.Lmax * 2, amp = g.warp * g.Lmax * 0.3;
    const X = x * k, Y = y * k, Z = z * k;
    const dx = NZW(X + 3.7, Y, Z), dy = NZW(X, Y + 9.1, Z), dz = NZW(X, Y, Z + 15.3);
    x += amp * dx; y += amp * dy; z += amp * dz;
  }
  OUT3[0] = x; OUT3[1] = y; OUT3[2] = z;
}

////////////////////////////////////////////////////////////////////////////////////////
// The model
//
// The lines of every wall, as 3D polylines tagged with their layer. It depends on the
// volume, the walls, the field and the ink — never on the camera, the paper or the pens —
// so turning the camera only projects it again.

let MODEL = null;            // { pts, off, lay, frame, box, counts }
let modelKeyNow = '';

const MODEL_KEYS = (() => {
  const k = Object.keys(DEFAULTS);
  return k.slice(k.indexOf('stack'), k.indexOf('detail') + 1);
})();

let M_PTS = new Float64Array(1 << 16), M_N = 0, M_OFF = [0], M_LAY = [], M_FULL = false;

function mReset() { M_N = 0; M_OFF = [0]; M_LAY = []; M_FULL = false; }

function mPoint(x, y, z) {
  if (M_N + 3 > M_PTS.length) {
    if (M_PTS.length * 3 >= MAX_MODEL_PTS * 3) { M_FULL = true; return; }
    const n = new Float64Array(M_PTS.length * 2);
    n.set(M_PTS);
    M_PTS = n;
  }
  M_PTS[M_N++] = x; M_PTS[M_N++] = y; M_PTS[M_N++] = z;
}

function mPlace(a, b, w) { placeAt(a, b, w); mPoint(OUT3[0], OUT3[1], OUT3[2]); }

function mEnd(lay) {
  const start = M_OFF[M_OFF.length - 1], n = M_N / 3;
  if (n - start >= 2 && !M_FULL) { M_OFF.push(n); M_LAY.push(lay); }
  else M_N = start * 3;
}

function ensureModel() {
  const key = MODEL_KEYS.map(k => settings[k]).join('|') + '|' + (PHOTO ? PHOTO.ver : 0);
  if (MODEL && key === modelKeyNow) return;
  const t0 = performance.now();
  modelKeyNow = key;
  ensureNoise();
  ensureField();
  prepareStack();
  prepareShaping();
  MODEL = buildModel();
  modelMs = performance.now() - t0;
}

// Thresholds a line is drawn above, one for each line of a wall and each wall, spread so
// that any stretch of neighbours takes them in turn.
function bayerRank(x, y) {
  let v = 0;
  for (let bit = 0; bit < 3; bit++) {
    const xb = (x >> bit) & 1, yb = (y >> bit) & 1;
    v = (v << 2) | ((xb ^ yb) << 1) | yb;
  }
  return v;            // 0 … 63
}

function bitRev6(k) {
  let r = 0;
  for (let i = 0; i < 6; i++) r = (r << 1) | ((k >> i) & 1);
  return r;            // 0 … 63
}

let DITHER = 0, NLEV = 16;

function thresholdOf(j, k) {
  let r;
  switch (DITHER) {
    case 1: r = hash01(j, k, 5); break;
    case 2: r = bitRev6(k & 63) / 64; break;
    case 3: r = bitRev6(j & 63) / 64; break;
    default: r = bayerRank(j & 7, k & 7) / 64;
  }
  return (Math.floor(r * NLEV) + 0.5) / NLEV;
}

// Scratch for one line: the samples and the runs found along it.
let TS = new Float64Array(4096), DS = new Float64Array(4096);
let RUNS = new Float64Array(3 * 2048), NRUN = 0;

function pushRun(t0, t1, c) {
  if (t1 - t0 < 1e-9) return;
  if (3 * NRUN + 3 > RUNS.length) {
    const n = new Float64Array(RUNS.length * 2);
    n.set(RUNS);
    RUNS = n;
  }
  RUNS[3 * NRUN] = t0; RUNS[3 * NRUN + 1] = t1; RUNS[3 * NRUN + 2] = c;
  NRUN++;
}

// The stretches of a line above T1 (class 1) and above T2 (class 2), each pinned where it
// crosses its threshold — midway between two samples when the field steps, as an
// automaton's does, so a run ends at the edge of a cell.
function classRuns(n, T1, T2, stepped) {
  NRUN = 0;
  const cls = d => d > T2 ? 2 : d > T1 ? 1 : 0;
  let cur = cls(DS[0]), start = TS[0];
  for (let i = 1; i < n; i++) {
    const c = cls(DS[i]);
    if (c === cur) continue;
    const d0 = DS[i - 1], d1 = DS[i], t0 = TS[i - 1], t1 = TS[i];
    const at = T => stepped || d1 === d0 ? (t0 + t1) / 2 : t0 + (T - d0) / (d1 - d0) * (t1 - t0);
    if (c > cur) {
      if (cur === 0) { const x = at(T1); start = x; cur = 1; }
      if (cur === 1 && c === 2) { const x = at(T2); pushRun(start, x, 1); start = x; cur = 2; }
    } else {
      if (cur === 2) { const x = at(T2); pushRun(start, x, 2); start = x; cur = 1; }
      if (cur === 1 && c === 0) { const x = at(T1); pushRun(start, x, 1); cur = 0; }
    }
  }
  if (cur > 0) pushRun(start, TS[n - 1], cur);
}

function densityAtT(t, n) {
  const f = clamp(t, 0, 1) * (n - 1), i = Math.min(n - 2, Math.floor(f));
  return DS[i] + (DS[i + 1] - DS[i]) * (f - i);
}

// The build: constants the line tracer reads, set once.
let B = null;

function buildModel() {
  const s = settings, g = G;
  mReset();
  DITHER = Math.max(0, DITHERS.indexOf(s.ditherKind));
  NLEV = clamp(Math.round(s.levels), 2, 64);
  const dm = DARK_MODES.indexOf(s.dark);
  const style = LINE_STYLES.indexOf(s.lineStyle);
  const acc = ACCENTS.indexOf(s.accent);
  const shell = s.shell;
  const curvyStyle = style >= 1 && style <= 3;
  const deform = !!(g.twist || g.warp);
  let detail = clamp(Math.round(s.detail), 8, 1000);
  const linesTotal = g.K * Math.max(1, g.L) * (dm === 5 ? 2 : 1);
  if (linesTotal * detail > SAMPLE_BUDGET) detail = Math.max(8, Math.floor(SAMPLE_BUDGET / linesTotal));
  B = {
    dm, style, acc, detail,
    iso: clamp(s.iso, 0, 100) / 100,
    aL: clamp(s.accentLevel, 0, 100) / 100,
    aEvery: Math.max(1, Math.round(s.accentEvery)),
    aShare: clamp(s.accentShare, 0, 100) / 100,
    sAmp: s.styleAmp / 100, sFreq: Math.max(0.1, s.styleFreq), sAligned: s.styleAligned,
    qAmp: s.squigAmp / 100, qFreq: Math.max(0.1, s.squigFreq),
    dashT: Math.max(0.05, s.dashLen) / 100,
    minRun: Math.max(0, s.minRun) / 100 * g.Hb,
    crossFrom: clamp(s.crossFrom, 0, 99) / 100,
    stepped: FIELD.stepped, cell: FIELD.cell,
    curvyAlong: curvyStyle || dm === 2 || deform || (g.wA && (g.wV || g.tanA)) ||
                (g.bend && g.tanA) || (g.mode === 3 && g.tanA),
    curvyAcross: curvyStyle || deform || !!g.wA || !!g.bend || g.mode === 3,
    counts: { lines: 0, pieces: 0, whole: 0 },
  };
  const shellEnds = (shell === 'front + ends' || shell === 'outside' || shell === 'ends') && g.hasEnds;
  const every = Math.round(s.shellEvery);
  const shellWall = k => shell === 'every line' ||
    ((shell === 'front + ends' || shell === 'outside' || shell === 'front') && k === 0) ||
    (shell === 'outside' && k === g.K - 1 && !g.full && !(g.mode === 3 && g.rIn === 0)) ||
    (every > 0 && k % every === 0);

  for (let k = 0; k < g.K && !M_FULL; k++) {
    const w = g.wpos[k];
    const sh = g.snap ? 0.5 : frac(s.lineShift * k);
    const whole = shellWall(k);
    let Wa = g.Wa, aLo = -g.Wa / 2, Lk = g.L;
    const ring = g.mode === 3;
    if (ring) {
      const r = Math.max(1e-6, ringR(w));
      Wa = 2 * Math.PI * r; aLo = 0;
      Lk = Math.max(3, Math.round(g.L * r / g.R));
    }
    const gap = Wa / Lk, Hb = g.Hb;
    const span = Hb * g.tanA;

    // the lines of the wall
    {
      if (ring) {
        for (let j = 0; j < Lk; j++) {
          if (dm === 4 && !whole) break;
          const c = aLo + (j + sh) * gap;
          traceLine(k, w, j, c, -Hb / 2, c + span, Hb / 2, whole, gap, true);
        }
      } else {
        const jLo = Math.ceil(-Math.max(0, span) / gap - sh - 1e-9);
        const jHi = Math.floor((Wa - Math.min(0, span)) / gap - sh + 1e-9);
        for (let j = jLo; j <= jHi; j++) {
          const c = aLo + (j + sh) * gap;
          let s0 = 0, s1 = Hb;
          if (g.tanA) {
            let p = (aLo - c) / g.tanA, q = (aLo + Wa - c) / g.tanA;
            if (p > q) { const t = p; p = q; q = t; }
            s0 = Math.max(0, p); s1 = Math.min(Hb, q);
            if (s1 - s0 < 1e-9) continue;
          } else if (c < aLo - 1e-6 || c > aLo + Wa + 1e-6) continue;
          const atEnd = !g.tanA && (Math.abs(c - aLo) < 1e-6 || Math.abs(c - aLo - Wa) < 1e-6);
          if (atEnd && shellEnds) continue;
          if (dm === 4 && !whole) continue;
          traceLine(k, w, j, c + s0 * g.tanA, -Hb / 2 + s0, c + s1 * g.tanA, -Hb / 2 + s1,
                    whole, gap, true);
        }
        if (shellEnds) {
          const inner = !(g.mode === 2 && g.rIn === 0) || k === 0;
          if (inner) traceLine(k, w, -1, aLo, -Hb / 2, aLo, Hb / 2, true, gap, true);
          traceLine(k, w, Lk + 1, aLo + Wa, -Hb / 2, aLo + Wa, Hb / 2, true, gap, true);
        }
      }
    }

    // crossed: lines across the wall as well, where it is darkest
    if (dm === 5) {
      const nB = Math.max(1, Math.round(Hb / gap));
      for (let i = 0; i < nB; i++) {
        const b = -Hb / 2 + (i + 0.5) * Hb / nB;
        traceLine(k, w, i, aLo, b, aLo + Wa, b, false, Hb / nB, false);
      }
    }

    // contours: the edges of the dark, wall by wall
    if (dm === 4) contourWall(k, w, aLo, Wa, Hb);
  }

  edgeLines();
  const frame = framePoints();
  const box = boxLines();
  return {
    pts: M_PTS.slice(0, M_N), off: Int32Array.from(M_OFF), lay: Uint8Array.from(M_LAY),
    frame, box, counts: B.counts, full: M_FULL,
  };
}

function accentLine(k, w, j) {
  switch (B.acc) {
    case 2: return w >= B.aL;
    case 3: return w < B.aL;
    case 4: return k % B.aEvery === 0;
    case 5: return hash01(j, k, 13) < B.aShare;
    default: return false;
  }
}

// One line of wall k, from (a0, b0) to (a1, b1) in the wall's coordinates, t running 0 … 1
// along it. Whole lines are drawn end to end; the others where the dark asks for them.
// `along` tells the lines of the wall from the crossed ones.
function traceLine(k, w, j, a0, b0, a1, b1, whole, gap, along) {
  const da = a1 - a0, db = b1 - b0, len = Math.hypot(da, db);
  if (len < 1e-9) return;
  const g = G;
  B.counts.lines++;
  const dm = B.dm;
  const needD = !whole || dm === 2;
  let n = Math.max(3, Math.ceil(B.detail * len / g.Hb) + 1);
  if (B.stepped && B.cell > 0) n = Math.max(n, Math.ceil(6 * len / B.cell) + 1);
  n = Math.min(n, 4000);
  if (TS.length < n) { TS = new Float64Array(n * 2); DS = new Float64Array(n * 2); }
  if (needD) {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      TS[i] = t;
      DS[i] = fieldOn(a0 + t * da, b0 + t * db, w);
    }
  }

  // the runs
  NRUN = 0;
  if (whole) {
    pushRun(0, 1, 0);
    B.counts.whole++;
  } else if (dm === 3) {
    // dashes: in every period a dash as long as the dark there
    const P = B.dashT * g.Hb / len, ph = hash01(j, k, 9) * P;
    for (let s0 = -ph; s0 < 1; s0 += P) {
      const d = densityAtT(s0 + P / 2, n);
      if (d <= 0.02) continue;
      const c = B.acc === 1 && d > B.aL ? 2 : 1;
      pushRun(Math.max(0, s0), Math.min(1, s0 + d * P), c);
    }
  } else {
    let T1;
    if (!along) T1 = B.crossFrom + (1 - B.crossFrom) * thresholdOf(j + 3, k + 5);
    else if (dm === 0 || dm === 5) T1 = thresholdOf(j, k);
    else if (dm === 1) T1 = B.iso;
    else T1 = 0.03;
    const T2 = B.acc === 1 ? Math.max(T1, B.aL) : Infinity;
    classRuns(n, T1, T2, B.stepped);
    if (B.minRun > 0) {
      const m = B.minRun / len;
      let o = 0;
      for (let r = 0; r < NRUN; r++) {
        if (RUNS[3 * r + 1] - RUNS[3 * r] < m) continue;
        RUNS[3 * o] = RUNS[3 * r]; RUNS[3 * o + 1] = RUNS[3 * r + 1]; RUNS[3 * o + 2] = RUNS[3 * r + 2];
        o++;
      }
      NRUN = o;
    }
  }
  if (!NRUN) return;
  const toAccent = !whole && B.acc >= 2 && accentLine(k, w, j);

  // the line's own style: waves across it, or broken into dashes or dots
  const style = B.style;
  const perpA = db / len, perpB = -da / len;
  const phase = B.sAligned ? 0 : hash01(j, k, 3);
  const phase2 = hash01(j, k, 7);
  const hFrac = len / g.Hb;                       // the line's length in wall heights
  const amp = B.sAmp * gap, qamp = B.qAmp * gap;
  const curvy = along ? B.curvyAlong : B.curvyAcross;
  let fine = 1;
  if (curvy) {
    fine = Math.max(n - 1, 8);
    if (style >= 1 && style <= 3) fine = Math.max(fine, Math.ceil(10 * B.sFreq * hFrac));
    if (dm === 2) fine = Math.max(fine, Math.ceil(10 * B.qFreq * hFrac));
    fine = Math.min(fine, 6000);
  }
  const offsetAt = t => {
    let o = 0;
    const v = t * hFrac;
    if (style === 1) o += amp * Math.sin(2 * Math.PI * (B.sFreq * v + phase));
    else if (style === 2) o += amp * 1.8 * NZ(v * B.sFreq * 0.5, j * 0.731 + 0.31, k * 1.137 + 0.71 + (along ? 0 : 50));
    else if (style === 3) o += amp * (4 * Math.abs(frac(B.sFreq * v + phase) - 0.5) - 1);
    if (dm === 2 && needD) o += qamp * densityAtT(t, n) * Math.sin(2 * Math.PI * (B.qFreq * v + phase2));
    return o;
  };
  const lay = c => whole ? L_SHELL : (c === 2 || toAccent) ? L_ACCENT : L_CORE;
  const put = (t0, t1, layer) => {
    const m = curvy ? Math.max(1, Math.ceil((t1 - t0) * fine)) : 1;
    for (let i = 0; i <= m; i++) {
      const t = t0 + (t1 - t0) * i / m;
      const o = curvy ? offsetAt(t) : 0;
      mPlace(a0 + t * da + perpA * o, b0 + t * db + perpB * o, w);
    }
    mEnd(layer);
    B.counts.pieces++;
  };
  const dotP = 1 / (B.sFreq * hFrac);
  for (let r = 0; r < NRUN; r++) {
    const t0 = RUNS[3 * r], t1 = RUNS[3 * r + 1], layer = lay(RUNS[3 * r + 2]);
    if (style === 4) {
      // dashed: 55 % on, in step along the line
      const P = dotP, off = phase * P;
      for (let d0 = Math.floor((t0 - off) / P) * P + off; d0 < t1; d0 += P) {
        const a = Math.max(t0, d0), b = Math.min(t1, d0 + 0.55 * P);
        if (b - a > 1e-6) put(a, b, layer);
      }
    } else if (style === 5) {
      const P = dotP, off = phase * P, e = Math.min(EPS / len, P * 0.1);
      for (let d0 = Math.ceil((t0 - off) / P) * P + off; d0 <= t1; d0 += P) put(d0, d0 + e, layer);
    } else {
      put(t0, t1, layer);
    }
  }
}

// Level lines of the field over one wall, at contourLevels evenly between 0 and 1.
function contourWall(k, w, aLo, Wa, Hb) {
  const res = clamp(Math.round(settings.contourRes), 8, 600);
  const nx = res + 1, ny = clamp(Math.round(res * Hb / Wa), 4, 600) + 1;
  const F = new Float64Array(nx * ny);
  const dx = Wa / (nx - 1), dy = Hb / (ny - 1);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) F[j * nx + i] = fieldOn(aLo + i * dx, -Hb / 2 + j * dy, w);
  }
  const nl = clamp(Math.round(settings.contourLevels), 1, 60);
  const toAccentWall = B.acc >= 2 && B.acc <= 4 && accentLine(k, w, 0);
  for (let l = 0; l < nl; l++) {
    const level = (l + 1) / (nl + 1);
    const lines = contourGrid(F, nx, ny, aLo, -Hb / 2, dx, dy, level);
    const layer = (B.acc === 1 && level >= B.aL) || toAccentWall ? L_ACCENT : L_CORE;
    for (let c = 0; c < lines.length; c++) {
      const p = lines[c];
      for (let i = 0; i < p.length; i += 2) mPlace(p[i], p[i + 1], w);
      mEnd(B.acc === 5 && hash01(c, k * 64 + l, 13) < B.aShare ? L_ACCENT : layer);
      B.counts.pieces++;
    }
  }
}

// Marching squares over a grid of values, the crossings named by the edge of the grid
// they lie on, so the pieces from two cells meet at exactly the same point and can be
// strung into long lines. Saddles are split by the value in the middle of the cell.
function contourGrid(Fv, nx, ny, x0, y0, dx, dy, level) {
  const segs = [];
  const val = (i, j) => Fv[j * nx + i];
  const ptOn = id => {
    const h = id & 1, k = id >> 1, i = k % nx, j = (k / nx) | 0;
    if (h === 0) {
      const a = val(i, j), b = val(i + 1, j), t = (level - a) / (b - a);
      return [x0 + (i + t) * dx, y0 + j * dy];
    }
    const a = val(i, j), b = val(i, j + 1), t = (level - a) / (b - a);
    return [x0 + i * dx, y0 + (j + t) * dy];
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = val(i, j), b = val(i + 1, j), c = val(i + 1, j + 1), d = val(i, j + 1);
      const code = (a > level ? 1 : 0) | (b > level ? 2 : 0) | (c > level ? 4 : 0) | (d > level ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const eB = 2 * (j * nx + i), eT = 2 * ((j + 1) * nx + i);
      const eL = 2 * (j * nx + i) + 1, eR = 2 * (j * nx + i + 1) + 1;
      const add = (p, q) => segs.push(p, q);
      switch (code) {
        case 1: case 14: add(eB, eL); break;
        case 2: case 13: add(eB, eR); break;
        case 3: case 12: add(eL, eR); break;
        case 4: case 11: add(eR, eT); break;
        case 6: case 9:  add(eB, eT); break;
        case 7: case 8:  add(eL, eT); break;
        case 5: case 10: {
          const mid = (a + b + c + d) / 4 > level;
          if ((code === 5) === mid) { add(eB, eR); add(eL, eT); }
          else { add(eB, eL); add(eR, eT); }
          break;
        }
      }
    }
  }
  const at = new Map();
  for (let s = 0; s < segs.length; s += 2) {
    for (const e of [segs[s], segs[s + 1]]) {
      const l = at.get(e);
      if (l) l.push(s); else at.set(e, [s]);
    }
  }
  const used = new Uint8Array(segs.length >> 1);
  const lines = [];
  for (let s = 0; s < segs.length; s += 2) {
    if (used[s >> 1]) continue;
    used[s >> 1] = 1;
    const head = [segs[s + 1]], tail = [segs[s]];
    for (const dir of [1, 0]) {
      const chain = dir ? head : tail;
      while (true) {
        const end = chain[chain.length - 1];
        const l = at.get(end);
        let next = -1;
        if (l) for (const t of l) if (!used[t >> 1]) { next = t; break; }
        if (next < 0) break;
        used[next >> 1] = 1;
        chain.push(segs[next] === end ? segs[next + 1] : segs[next]);
      }
    }
    const p = [];
    for (let i = tail.length - 1; i >= 0; i--) { const [x, y] = ptOn(tail[i]); p.push(x, y); }
    for (const e of head) { const [x, y] = ptOn(e); p.push(x, y); }
    lines.push(p);
  }
  return lines;
}

// The edges of the walls: their tops and bottoms, their outlines, or only the box round
// the whole.
function wallOutline(k, closed, sidesToo) {
  const g = G, w = g.wpos[k], Hb = g.Hb;
  const curvy = !!(g.twist || g.warp || g.wA || g.bend || g.spin && g.mode === 3);
  if (g.mode === 3) {
    const r = Math.max(1e-6, ringR(w)), Wa = 2 * Math.PI * r, m = 128;
    for (const b of [-Hb / 2, Hb / 2]) {
      for (let i = 0; i <= m; i++) mPlace(Wa * i / m, b, w);
      mEnd(L_EDGES);
    }
    return;
  }
  const aLo = -g.Wa / 2, aHi = g.Wa / 2, m = curvy ? 64 : 1, mb = curvy ? 32 : 1;
  const edge = (pa, pb, qa, qb, steps) => {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      mPlace(pa + (qa - pa) * t, pb + (qb - pb) * t, w);
    }
  };
  if (closed) {
    edge(aLo, -Hb / 2, aHi, -Hb / 2, m);
    M_N -= 3; edge(aHi, -Hb / 2, aHi, Hb / 2, mb);
    M_N -= 3; edge(aHi, Hb / 2, aLo, Hb / 2, m);
    M_N -= 3; edge(aLo, Hb / 2, aLo, -Hb / 2, mb);
    mEnd(L_EDGES);
  } else {
    edge(aLo, -Hb / 2, aHi, -Hb / 2, m); mEnd(L_EDGES);
    edge(aLo, Hb / 2, aHi, Hb / 2, m); mEnd(L_EDGES);
    if (sidesToo) {
      edge(aLo, -Hb / 2, aLo, Hb / 2, mb); mEnd(L_EDGES);
      edge(aHi, -Hb / 2, aHi, Hb / 2, mb); mEnd(L_EDGES);
    }
  }
}

// A line through the stack at (a, b) of every wall, from the first to the last.
function throughLine(a, b, lay) {
  const g = G, curvy = !!(g.twist || g.warp || g.wA || g.spin || g.mode === 2);
  const w0 = 0, w1 = g.full ? 1 : g.K > 1 ? g.wpos[g.K - 1] : 0;
  if (w1 - w0 < 1e-9) return;
  const m = curvy ? Math.max(32, g.K * 3) : 1;
  for (let i = 0; i <= m; i++) mPlace(a, b, w0 + (w1 - w0) * i / m);
  mEnd(lay);
}

function edgeLines() {
  const kind = settings.edges, g = G;
  if (kind === 'none') return;
  if (kind === 'box') {
    boxInto(L_EDGES);
    return;
  }
  for (let k = 0; k < g.K && !M_FULL; k++) wallOutline(k, kind === 'outlines', false);
}

function boxInto(lay) {
  const g = G;
  const first = 0, last = g.K - 1;
  const mark = M_LAY.length;
  wallOutline(first, true, false);
  if (last !== first && !g.full) wallOutline(last, true, false);
  if (g.mode !== 3) {
    for (const a of [-g.Wa / 2, g.Wa / 2]) {
      for (const b of [-g.Hb / 2, g.Hb / 2]) {
        if (g.mode === 2 && a < 0 && g.rIn === 0) continue;
        throughLine(a, b, lay);
      }
    }
    if (g.mode === 2 && g.rIn === 0) {
      mPlace(-g.Wa / 2, -g.Hb / 2, 0); mPlace(-g.Wa / 2, g.Hb / 2, 0); mEnd(lay);
    }
  }
  for (let i = mark; i < M_LAY.length; i++) M_LAY[i] = lay;
}

// The box round the volume as guides — built into the model's own buffer and taken out
// again, so it is bent exactly as the walls are.
function boxLines() {
  const n0 = M_N, o0 = M_OFF.length, full = M_FULL;
  boxInto(L_EDGES);
  const pts = M_PTS.slice(n0, M_N), off = M_OFF.slice(o0 - 1).map(v => v - n0 / 3);
  M_N = n0; M_OFF.length = o0; M_LAY.length = o0 - 1; M_FULL = full;
  return { pts, off };
}

// Points the fit is made from: every wall's outline, bent — never the dark, so the
// framing holds still while the field changes.
function framePoints() {
  const g = G, P = [];
  const step = Math.max(1, Math.floor(g.K / 48));
  const ks = [];
  for (let k = 0; k < g.K; k += step) ks.push(k);
  if (ks[ks.length - 1] !== g.K - 1) ks.push(g.K - 1);
  for (const k of ks) {
    const w = g.wpos[k];
    if (g.mode === 3) {
      const r = Math.max(1e-6, ringR(w));
      for (let i = 0; i < 48; i++) {
        for (const b of [-g.Hb / 2, g.Hb / 2]) { placeAt(2 * Math.PI * r * i / 48, b, w); P.push(OUT3[0], OUT3[1], OUT3[2]); }
      }
      continue;
    }
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const pts = [[-g.Wa / 2 + t * g.Wa, -g.Hb / 2], [-g.Wa / 2 + t * g.Wa, g.Hb / 2],
                   [-g.Wa / 2, -g.Hb / 2 + t * g.Hb], [g.Wa / 2, -g.Hb / 2 + t * g.Hb]];
      for (const [a, b] of pts) { placeAt(a, b, w); P.push(OUT3[0], OUT3[1], OUT3[2]); }
    }
  }
  return Float64Array.from(P);
}

////////////////////////////////////////////////////////////////////////////////////////
// The camera
//
// Round the vertical by the azimuth, above the ground by the elevation. A parallel view
// takes right and up straight onto the paper. A perspective one from `distance` half-
// diagonals away divides them by how far off the point is — and with `upright` the
// camera looks level and the picture is shifted instead of tilted, as an architect's
// shift lens does, so the upright lines of the walls stay upright on the paper.

let CAM = null;
let S = 1, OX = 0, OY = 0;   // mm to one unit of the volume, and where its middle lands
let PXr = 0, PYr = 0;        // what projRaw leaves behind

function boundRadius() {
  const H = halfSizes();
  return Math.hypot(H.hx, H.hy, H.hz);
}

function makeView() {
  const s = settings;
  const az = rad(s.azimuth), el = rad(clamp(s.elevation, -89.9, 89.9));
  const bx = Math.cos(el) * Math.sin(az), by = Math.sin(el), bz = Math.cos(el) * Math.cos(az);
  const rx = Math.cos(az), ry = 0, rz = -Math.sin(az);
  const ux = by * rz - bz * ry, uy = bz * rx - bx * rz, uz = bx * ry - by * rx;
  const rho = boundRadius();
  const D = Math.max(1.2, s.distance) * rho;
  CAM = {
    bx, by, bz, rx, ry, rz, ux, uy, uz, D,
    persp: s.projection === 'perspective', upright: s.upright,
    hx: Math.sin(az), hz: Math.cos(az),
    cy: D * Math.sin(el), Dh: Math.max(D * Math.cos(el), 1.2 * rho),
  };
}

function projRaw(x, y, z) {
  const C = CAM;
  if (!C.persp) {
    PXr = x * C.rx + y * C.ry + z * C.rz;
    PYr = x * C.ux + y * C.uy + z * C.uz;
    return;
  }
  if (C.upright) {
    const qx = x - C.hx * C.Dh, qy = y - C.cy, qz = z - C.hz * C.Dh;
    const depth = Math.max(1e-6 * C.D, -(qx * C.hx + qz * C.hz));
    const k = C.Dh / depth;
    PXr = (qx * C.rx + qz * C.rz) * k;
    PYr = qy * k;
    return;
  }
  const cx = x * C.rx + y * C.ry + z * C.rz;
  const cy = x * C.ux + y * C.uy + z * C.uz;
  const cz = x * C.bx + y * C.by + z * C.bz;
  const k = C.D / Math.max(1e-6 * C.D, C.D - cz);
  PXr = cx * k;
  PYr = cy * k;
}

// The fit: every wall's outline inside the margin at a zoom of 100 %; zoom and pan then
// scale the sheet about its middle.
function fitView() {
  const P = MODEL.frame;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < P.length; i += 3) {
    projRaw(P[i], P[i + 1], P[i + 2]);
    if (PXr < x0) x0 = PXr; if (PXr > x1) x1 = PXr;
    if (PYr < y0) y0 = PYr; if (PYr > y1) y1 = PYr;
  }
  if (!(x1 - x0 > 1e-9)) { x0 -= 1; x1 += 1; }
  if (!(y1 - y0 > 1e-9)) { y0 -= 1; y1 += 1; }
  const z = clamp(settings.zoom, MIN_ZOOM, MAX_ZOOM) / 100;
  S = Math.min(area.w / (x1 - x0), area.h / (y1 - y0)) * z;
  OX = (area.x0 + area.x1) / 2 - S * (x0 + x1) / 2 - settings.panX * z;
  OY = (area.y0 + area.y1) / 2 + S * (y0 + y1) / 2 - settings.panY * z;
}

function toPaper(x, y, z) {
  projRaw(x, y, z);
  return [S * PXr + OX, -S * PYr + OY];
}

////////////////////////////////////////////////////////////////////////////////////////
// The sink
//
// Everything is drawn into one sink as polylines in millimetres, each tagged with the pen
// and the layer it belongs to, clipped to that pen's own drawable box as it goes in.

let SINK = null;
let PEN = 0, LAY = 0;
let AREAS = [];

function makeSink() {
  return { pts: [], off: [0], ink: [], lay: [] };
}

const CLIP_OUT = new Float64Array(4);

function clipSeg(A, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  let t0 = 0, t1 = 1;
  for (let e = 0; e < 4; e++) {
    const p = e === 0 ? -dx : e === 1 ? dx : e === 2 ? -dy : dy;
    const q = e === 0 ? x0 - A.x0 : e === 1 ? A.x1 - x0 : e === 2 ? y0 - A.y0 : A.y1 - y0;
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else       { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  CLIP_OUT[0] = x0 + t0 * dx; CLIP_OUT[1] = y0 + t0 * dy;
  CLIP_OUT[2] = x0 + t1 * dx; CLIP_OUT[3] = y0 + t1 * dy;
  return true;
}

function pushPoly(xs, ys, n) {
  const S2 = SINK;
  if (n < 2) return;
  for (let i = 0; i < n; i++) S2.pts.push(xs[i], ys[i]);
  S2.off.push(S2.pts.length / 2);
  S2.ink.push(PEN);
  S2.lay.push(LAY);
}

function emit(xs, ys, n) {
  if (n < 2 || SINK.ink.length > MAX_STROKES) return;
  const A = AREAS[PEN];
  if (A.w <= 0 || A.h <= 0) return;
  let allIn = true;
  for (let i = 0; i < n; i++) {
    if (xs[i] < A.x0 || xs[i] > A.x1 || ys[i] < A.y0 || ys[i] > A.y1) { allIn = false; break; }
  }
  if (allIn) { pushPoly(xs, ys, n); return; }
  let rx = null, ry = null;
  const flush = () => { if (rx && rx.length >= 2) pushPoly(rx, ry, rx.length); rx = ry = null; };
  for (let i = 0; i + 1 < n; i++) {
    if (!clipSeg(A, xs[i], ys[i], xs[i + 1], ys[i + 1])) { flush(); continue; }
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
// Everything, in order

let XS = new Float64Array(1024), YS = new Float64Array(1024);

function buildShapes() {
  area = drawArea();
  if (area.w < 2 || area.h < 2) return null;
  ensureModel();
  makeView();
  fitView();
  SINK = makeSink();
  AREAS = [];
  for (let i = 0; i < SLOTS; i++) AREAS.push(penArea(i));

  const M = MODEL, P = M.pts;
  const pens = LAYERS.map((ly, li) => layerPen(li));
  for (let i = 0; i < M.lay.length; i++) {
    const a = M.off[i], b = M.off[i + 1], n = b - a;
    if (XS.length < n) { XS = new Float64Array(n * 2); YS = new Float64Array(n * 2); }
    for (let k = 0; k < n; k++) {
      const o = 3 * (a + k);
      projRaw(P[o], P[o + 1], P[o + 2]);
      XS[k] = S * PXr + OX;
      YS[k] = -S * PYr + OY;
    }
    LAY = M.lay[i];
    PEN = pens[LAY];
    emit(XS, YS, n);
  }

  const S2 = SINK;
  perPen = [];
  for (let i = 0; i < SLOTS; i++) perPen.push({ strokes: 0, ink: 0 });
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
// with a uniform bucket grid so the search stays local; one pen at a time, in the order
// the passes go down. vpype's linesort would redo it regardless, so it is here to make
// the estimate honest and the preview readable.

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
  let at = 0;
  for (const id of penOrder()) {
    const list = byInk.get(id);
    if (!list) continue;
    if (settings.optimiseOrder) {
      const g = greedy(sh, list, 0, 0);
      for (let t = 0; t < g.order.length; t++) { order[at] = g.order[t]; flip[at++] = g.flip[t]; }
    } else {
      for (const i of list) { order[at] = i; flip[at++] = 0; }
    }
  }
  return { order, flip, ...measurePlan(sh, order, flip) };
}

// Every pass starts with the pen at the corner of the sheet.
function measurePlan(sh, order, flip) {
  const { pts, off } = sh;
  let ink = 0, travel = 0, px = 0, py = 0, prevId = -1;
  for (let t = 0; t < order.length; t++) {
    const i = order[t], rev = flip[t] === 1;
    const id = sh.ink[i];
    if (id !== prevId) { px = 0; py = 0; prevId = id; }
    const a = off[i], b = off[i + 1];
    const inA = rev ? b - 1 : a, inB = rev ? a : b - 1;
    const hop = Math.hypot(pts[inA * 2] - px, pts[inA * 2 + 1] - py);
    travel += hop;
    let run = 0;
    for (let k = a; k < b - 1; k++) {
      run += Math.hypot(pts[(k + 1) * 2] - pts[k * 2], pts[(k + 1) * 2 + 1] - pts[k * 2 + 1]);
    }
    ink += run;
    if (perPen && perPen[id]) { perPen[id].ink += run; perPen[id].travel = (perPen[id].travel || 0) + hop; }
    const ly = sh.lay[i];
    if (perLayer && perLayer[ly]) perLayer[ly].ink += run;
    px = pts[inB * 2];
    py = pts[inB * 2 + 1];
  }
  return { ink, travel };
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
  const { order } = plan;
  ctx.save();
  ctx.scale(s, s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let t = 0;
  while (t < order.length) {
    const id = shapes.ink[order[t]];
    ctx.strokeStyle = penCol(id);
    ctx.lineWidth = penW(id);
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

// The margin, the box round the volume and where the dark zone is gathered. Never plotted.
function drawGuides(ctx) {
  if (!MODEL || !CAM) return;
  const dark = luma(settings.paperColor) < 0.25;
  const col = dark ? 'rgba(110, 200, 255, 0.85)' : 'rgba(26, 109, 209, 0.8)';
  ctx.save();
  ctx.strokeStyle = col;
  ctx.lineWidth = 0.3;
  ctx.setLineDash([1.5, 1.5]);
  ctx.strokeRect(area.x0, area.y0, area.w, area.h);
  ctx.setLineDash([2, 1.2]);
  const { pts, off } = MODEL.box;
  ctx.beginPath();
  for (let i = 0; i + 1 < off.length; i++) {
    for (let k = off[i]; k < off[i + 1]; k++) {
      const [x, y] = toPaper(pts[3 * k], pts[3 * k + 1], pts[3 * k + 2]);
      if (k === off[i]) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  if (settings.focus !== 'none' && settings.source !== 'none') {
    const H = halfSizes(), s = settings;
    const [x, y] = toPaper(s.focusX / 100 * H.hx, s.focusY / 100 * H.hy, s.focusZ / 100 * H.hz);
    const r = s.focusR / 100 * Math.max(H.hx, H.hy, H.hz) * S;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y);
    ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3);
    ctx.stroke();
    if (s.focus === 'ball') {
      ctx.setLineDash([0.8, 1.6]);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }
  ctx.restore();
}

////////////////////////////////////////////////////////////////////////////////////////
// The mouse and the keys
//
// Dragging the sheet turns the camera: across is the azimuth, up and down the elevation.
// Shift-drag, or a drag with the right button, pans; alt-drag moves the dark zone; the
// wheel zooms about the point under the cursor.

let settleTimer = null;

function settle() {
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => { settleTimer = null; update(); }, 250);
}

function paperPoint(e) {
  const r = canvasEl().getBoundingClientRect();
  const [W, H] = paperDims();
  return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
}

const CAMERA_KEYS = ['azimuth', 'elevation', 'zoom', 'panX', 'panY'];
const FOCUS_KEYS = ['focus', 'focusX', 'focusY', 'focusZ'];

function attachPointer() {
  const c = canvasEl();
  c.addEventListener('contextmenu', e => e.preventDefault());
  c.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.button !== 2) return;
    const s = settings;
    drag = {
      mode: e.altKey ? 'focus' : (e.shiftKey || e.button === 2) ? 'pan' : 'turn',
      x: e.clientX, y: e.clientY, p: paperPoint(e), moved: false,
      az: s.azimuth, el: s.elevation, panX: s.panX, panY: s.panY,
      fx: s.focusX, fy: s.focusY, fz: s.focusZ,
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
    if (drag.mode === 'pan') {
      const p = paperPoint(e), z = s.zoom / 100;
      s.panX = +(drag.panX - (p[0] - drag.p[0]) / z).toFixed(2);
      s.panY = +(drag.panY - (p[1] - drag.p[1]) / z).toFixed(2);
    } else if (drag.mode === 'focus') {
      // the paper's right and up, back in the volume
      const p = paperPoint(e), H = halfSizes(), C = CAM;
      const mx = (p[0] - drag.p[0]) / S, my = -(p[1] - drag.p[1]) / S;
      if (s.focus === 'none') s.focus = 'ball';
      s.focusX = +clamp(drag.fx + (mx * C.rx + my * C.ux) / H.hx * 100, -150, 150).toFixed(1);
      s.focusY = +clamp(drag.fy + (mx * C.ry + my * C.uy) / H.hy * 100, -150, 150).toFixed(1);
      s.focusZ = +clamp(drag.fz + (mx * C.rz + my * C.uz) / H.hz * 100, -150, 150).toFixed(1);
    } else {
      s.azimuth = +wrapDeg(drag.az - dx * DRAG_DEG_PX).toFixed(1);
      s.elevation = +clamp(drag.el + dy * DRAG_DEG_PX, -90, 90).toFixed(1);
    }
    for (const k of CAMERA_KEYS.concat(FOCUS_KEYS)) if (setters[k]) setters[k](s[k]);
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
    zoomAbout(Math.exp(-delta * WHEEL_ZOOM), paperPoint(e));
  }, { passive: false });
}

// Zoom by a factor, keeping the paper point m where it is.
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
  for (const k of CAMERA_KEYS) if (setters[k]) setters[k](settings[k]);
  liveUpdate();
}

function resetView() {
  for (const k of ['zoom', 'panX', 'panY']) settings[k] = DEFAULTS[k];
  refreshControls();
  update();
}

function attachKeys() {
  window.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable ||
        (t.tagName === 'INPUT' && !['checkbox', 'button', 'color', 'range'].includes(t.type)))) return;
    if (e.metaKey || e.ctrlKey || e.altKey || drag) return;
    const s = settings;
    const cycle = (key, list, dir) => {
      s[key] = list[(list.indexOf(s[key]) + dir + list.length) % list.length];
      refreshControls();
      update();
    };
    const turn = (k, d) => {
      s[k] = k === 'azimuth' ? +wrapDeg(s[k] + d).toFixed(1) : clamp(+(s[k] + d).toFixed(1), -90, 90);
      refreshControls();
      update();
    };
    const step = e.shiftKey ? 10 : 1;
    switch (e.key) {
      case 'r': case 'R': s.seed = Math.floor(Math.random() * 100000); refreshControls(); update(); break;
      case '[': s.seed = Math.max(0, Math.round(s.seed) - 1); refreshControls(); update(); break;
      case ']': s.seed = Math.round(s.seed) + 1; refreshControls(); update(); break;
      case 'd': cycle('dark', DARK_MODES, 1); break;
      case 'D': cycle('dark', DARK_MODES, -1); break;
      case 'f': cycle('source', SOURCES, 1); break;
      case 'F': cycle('source', SOURCES, -1); break;
      case 'w': cycle('stack', STACKS, 1); break;
      case 'W': cycle('stack', STACKS, -1); break;
      case 'l': cycle('lineStyle', LINE_STYLES, 1); break;
      case 'L': cycle('lineStyle', LINE_STYLES, -1); break;
      case 'p': case 'P': cycle('projection', PROJECTIONS, 1); break;
      case 's': case 'S': {
        const k = (SCENES.findIndex(sc => sc.label === lastScene) + (e.key === 'S' ? -1 : 1) +
                   SCENES.length) % SCENES.length || (e.key === 'S' ? SCENES.length - 1 : 1);
        applyScene(SCENES[k]);
        break;
      }
      case 'ArrowLeft':  turn('azimuth', step); break;
      case 'ArrowRight': turn('azimuth', -step); break;
      case 'ArrowUp':    turn('elevation', step); break;
      case 'ArrowDown':  turn('elevation', -step); break;
      case '+': case '=': zoomAbout(1.1, null); break;
      case '-': case '_': zoomAbout(1 / 1.1, null); break;
      case '0': resetView(); break;
      case 'g': case 'G': s.showGuides = !s.showGuides; refreshControls(); drawPreview(); syncUrl(); break;
      default: return;
    }
    e.preventDefault();
  });
}

////////////////////////////////////////////////////////////////////////////////////////
// Controls

let lastScene = '';

function syncVisibility() {
  const s = settings;
  setVisible('orientation', s.paper !== 'custom');
  setVisible('customW', s.paper === 'custom');
  setVisible('customH', s.paper === 'custom');
  const cyl = isCylinder();
  setVisible('sizeD', !cyl);
  setVisible('hole', cyl);
  setVisible('sweep', s.stack === 'pages');
  const snap = !!(G && G.snap);
  setVisible('walls', !snap);
  setVisible('lines', !snap);
  setVisible('lineShift', !snap);
  setVisible('crowd', !snap);
  setVisible('wallJitter', !snap);
  setVisible('snapNote', snap);
  setVisible('spin', s.stack !== 'rings');
  setVisible('bend', s.stack !== 'rings');
  for (const k of ['styleAmp', 'styleFreq', 'styleAligned']) setVisible(k, s.lineStyle !== 'straight');
  setVisible('styleAmp', ['wavy', 'tremor', 'zigzag'].includes(s.lineStyle));
  setVisible('styleAligned', ['wavy', 'zigzag', 'dashed', 'dotted'].includes(s.lineStyle));
  for (const k of ['waveAcross', 'waveUp', 'wavePhase']) setVisible(k, s.waveAmp !== 0);
  setVisible('warpScale', s.warp > 0);

  const src = s.source;
  for (const k of ['cloudScale', 'cloudOctaves', 'cloudWarp']) setVisible(k, src === 'cloud');
  for (const k of ['blobs', 'blobLayout', 'blobSize', 'blobSoft', 'blobSpread']) setVisible(k, src === 'blobs');
  for (const k of ['fn', 'fnFreq', 'fnMode', 'fnLevel', 'fnWidth', 'round']) setVisible(k, src === 'function');
  setVisible('fnExpr', src === 'function' && s.fn === 'custom');
  setVisible('fnFreq', src === 'function' && !['sphere', 'torus', 'custom'].includes(s.fn));
  setVisible('fnLevel', src === 'function' && s.fnMode !== 'value');
  setVisible('fnWidth', src === 'function' && s.fnMode !== 'value');
  for (const k of ['photoLoad', 'photoMap', 'photoInvert', 'photoCut']) setVisible(k, src === 'photo');
  setVisible('photoDepth', src === 'photo' && ['relief', 'lens', 'heightmap'].includes(s.photoMap));
  for (const k of ['caRule', 'caPreset', 'caSeed', 'caCells', 'caLevels', 'caStep', 'caWarmup',
                   'caMoore', 'caWrap', 'caUp', 'caTrail', 'caSnap']) setVisible(k, src === 'automaton');
  setVisible('caDensity', src === 'automaton' && ['random', 'disc'].includes(s.caSeed));
  setVisible('caRadius', src === 'automaton' && ['disc', 'cross', 'ring'].includes(s.caSeed));

  for (const k of ['focusX', 'focusY', 'focusZ', 'focusR', 'focusSoft']) setVisible(k, s.focus !== 'none');
  setVisible('focusX', s.focus === 'ball' || s.focus === 'column');
  setVisible('focusZ', s.focus === 'ball' || s.focus === 'column');
  setVisible('focusY', s.focus === 'ball' || s.focus === 'layer');
  setVisible('grainScale', s.grain > 0);

  const dm = s.dark;
  setVisible('ditherKind', dm === 'dither' || dm === 'crossed');
  setVisible('levels', dm === 'dither' || dm === 'crossed');
  setVisible('iso', dm === 'solid');
  for (const k of ['squigAmp', 'squigFreq']) setVisible(k, dm === 'squiggle');
  setVisible('dashLen', dm === 'dashes');
  for (const k of ['contourLevels', 'contourRes']) setVisible(k, dm === 'contours');
  setVisible('crossFrom', dm === 'crossed');
  setVisible('minRun', dm !== 'contours' && dm !== 'dashes');
  setVisible('accentLevel', ['densest', 'back walls', 'front walls'].includes(s.accent));
  setVisible('accentEvery', s.accent === 'every n-th wall');
  setVisible('accentShare', s.accent === 'random lines');
  setVisible('accentPen', s.accent !== 'none');

  const persp = s.projection === 'perspective';
  setVisible('distance', persp);
  setVisible('upright', persp);
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
  createDiv('The cloud, the blobs, the automaton\'s start, the waves of a formula, the ' +
    'jitter and the dither. <b>R</b> rolls a new one, <b>[</b> and <b>]</b> step through them.')
    .parent(field).class('note');
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

function addTextField(parent, labelText, key, hint, onInput) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const inp = createInput(String(settings[key])).parent(field);
  inp.attribute('type', 'text');
  inp.attribute('spellcheck', 'false');
  inp.style('width', '100%');
  inp.style('box-sizing', 'border-box');
  inp.style('font-family', 'monospace');
  if (hint) createDiv(hint).parent(field).class('note');
  setters[key] = v => { if (inp.value() !== v) inp.value(v); };
  inp.input(() => onInput(inp.value()));
  return { field, inp };
}

function updateRuleInfo() {
  if (!ruleInfo) return;
  const r = parseCaRule(ruleInput ? ruleInput.value() : settings.caRule);
  ruleInfo.html(r
    ? `born on ${ruleString(r).split('/')[0].slice(1) || '—'}, survives on ` +
      `${ruleString(r).split('/')[1].slice(1) || '—'}`
    : `<span class="warn">not a B…/S… rule — still drawing ${settings.caRule}</span>`);
}

function updateFnNote() {
  if (!fnNote) return;
  const c = compileExpr(settings.fnExpr);
  fnNote.html(c.err
    ? `<span class="warn">${c.err}</span>`
    : 'x, y, z run from −1 to 1 across the volume, r is the distance from its middle, ' +
      'a the angle round the vertical, h the height from 0 to 1; noise(x, y, z) is Perlin ' +
      'noise. ^ is a power.');
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
  });
  addNote(sec, '<b>S</b> steps through the scenes. The ones with a photo want one loaded under ' +
    '<b>Dark zones</b>.');
  addSeedField(sec);

  sec = addSection(root, 'The volume');
  addSelect(sec, 'Walls stand', 'stack', STACKS, resync,
    '<b>depth</b> — upright walls one behind another; <b>floors</b> — levels one over another; ' +
    '<b>pages</b> — walls round the vertical, like a book stood open; <b>rings</b> — cylinders ' +
    'one inside another. <b>W</b> steps.');
  addSlider(sec, 'Width', 'sizeW', 5, 300, 1, 'The proportions of the block — the fit to the ' +
    'paper decides how large it is drawn. The width is the diameter of pages and rings.');
  addSlider(sec, 'Height', 'sizeH', 5, 300, 1);
  addSlider(sec, 'Depth', 'sizeD', 2, 300, 1);
  addSlider(sec, 'Hole in the middle (%)', 'hole', 0, 95, 1);
  addSlider(sec, 'Sweep of the pages (°)', 'sweep', 10, 360, 1);

  sec = addSection(root, 'Walls');
  addSlider(sec, 'Walls', 'walls', 1, 300, 1, 'How many, from the first to the last.');
  addSlider(sec, 'Crowding (−back … front)', 'crowd', -100, 100, 1,
    'Spaced evenly at 0; crowded towards the first wall above it, the last below.');
  addSlider(sec, 'Jitter (%)', 'wallJitter', 0, 100, 1, 'Each wall nudged off its place.');
  addSlider(sec, 'Lines across a wall', 'lines', 1, 600, 1);
  addSlider(sec, 'Shift a wall (of a line)', 'lineShift', 0, 1, 0.01,
    'Each wall\'s lines slid on by this share of the space between two lines, so the walls ' +
    'interleave on paper — ½ alternates, 0.38 spreads them most evenly.');
  addSlider(sec, 'Slant of the lines (°)', 'lineAngle', -75, 75, 1, 'Off upright, in the wall.');
  fieldDivs.snapNote = createDiv('One line for every cell of the automaton and one wall for ' +
    'every row of it (or every generation on floors) — <b>Lines follow the cells</b> under ' +
    'Dark zones lets go of that.').parent(sec).class('note');
  addSelect(sec, 'Drawn whole', 'shell', SHELLS, update,
    'The lines drawn end to end whatever the dark: <b>front + ends</b> — the first wall and the ' +
    'side edges of every wall, the box as in a drawing seen through; <b>outside</b> — the last ' +
    'wall too; <b>every line</b> — all of them.');
  addSlider(sec, 'And every n-th wall', 'shellEvery', 0, 50, 1, '0 — none.');
  addSelect(sec, 'Edges', 'edges', EDGE_KINDS, update,
    '<b>tops</b> — the top and bottom of every wall; <b>outlines</b> — every wall all round; ' +
    '<b>box</b> — only round the whole.');

  sec = addSection(root, 'Lines');
  addSelect(sec, 'Style', 'lineStyle', LINE_STYLES, resync,
    'Every line, the whole ones too. <b>L</b> steps.');
  addSlider(sec, 'Amplitude (% of a line\'s space)', 'styleAmp', 0, 300, 1);
  addSlider(sec, 'Waves, dashes or dots up a wall', 'styleFreq', 1, 400, 1);
  addCheckbox(sec, 'Every line in step', 'styleAligned');

  sec = addSection(root, 'Bending the walls', true);
  addSlider(sec, 'Bow (% of the depth)', 'bend', -100, 100, 1, 'Every wall bowed out in the middle.');
  addSlider(sec, 'Wave (% of the depth)', 'waveAmp', -60, 60, 0.5);
  addSlider(sec, 'Waves across', 'waveAcross', 0, 12, 0.1);
  addSlider(sec, 'Waves up', 'waveUp', 0, 12, 0.1);
  addSlider(sec, 'Wave travels (turns)', 'wavePhase', -4, 4, 0.05,
    'How far the wave has moved on by the last wall — curtains in the wind.');
  addSlider(sec, 'Slide sideways (%)', 'shearA', -200, 200, 1);
  addSlider(sec, 'Slide up (%)', 'shearB', -200, 200, 1, 'Stairs, when the walls rise one by one.');
  addSlider(sec, 'Taper (%)', 'taper', -95, 300, 1, 'How much larger the last wall is than the first.');
  addSlider(sec, 'Spin (°)', 'spin', -360, 360, 1, 'Each wall turned in its own plane, first to last.');
  addSlider(sec, 'Twist (°)', 'twist', -720, 720, 1, 'The whole turned round the vertical, bottom to top.');
  addSlider(sec, 'Warp (%)', 'warp', 0, 100, 0.5);
  addSlider(sec, 'Warp size', 'warpScale', 0.2, 8, 0.1);

  sec = addSection(root, 'Dark zones');
  addSelect(sec, 'Made of', 'source', SOURCES, resync,
    '<b>cloud</b> — noise; <b>blobs</b>; <b>function</b> — a mathematical surface or your own ' +
    'formula; <b>automaton</b> — a 2D cellular automaton, a generation a level; <b>photo</b>. ' +
    '<b>F</b> steps.');
  addSlider(sec, 'Cloud size', 'cloudScale', 0.2, 12, 0.05, 'Lumps across the volume.');
  addSlider(sec, 'Octaves', 'cloudOctaves', 1, 7, 1);
  addSlider(sec, 'Swirl (%)', 'cloudWarp', 0, 300, 1);
  addSlider(sec, 'Blobs', 'blobs', 1, 80, 1);
  addSelect(sec, 'Laid out', 'blobLayout', BLOB_LAYOUTS, update,
    '<b>chain</b> — a worm wandering through; <b>ring</b>, <b>helix</b>.');
  addSlider(sec, 'Size (%)', 'blobSize', 2, 120, 1);
  addSlider(sec, 'Softness (%)', 'blobSoft', 0, 100, 1);
  addSlider(sec, 'Spread (%)', 'blobSpread', 0, 150, 1);
  addSelect(sec, 'Function', 'fn', FUNCTIONS, resync,
    'Triply periodic minimal surfaces (<b>gyroid</b>, <b>schwarz P</b>, <b>diamond</b>), shapes, ' +
    'waves — or <b>custom</b>, a formula of your own.');
  const fx = addTextField(sec, 'f(x, y, z) =', 'fnExpr', '', v => {
    settings.fnExpr = v;
    updateFnNote();
    if (!compileExpr(v).err) update();
  });
  fnNote = createDiv('').parent(fx.field).class('note');
  updateFnNote();
  addSlider(sec, 'Frequency', 'fnFreq', 0.1, 10, 0.05);
  addSelect(sec, 'Taken as', 'fnMode', FN_MODES, resync,
    '<b>surface</b> — a skin where the function is at its level; <b>inside</b> — all below it; ' +
    '<b>value</b> — the function itself, low to high.');
  addSlider(sec, 'Level (%)', 'fnLevel', -100, 100, 1, 'From the low end of the function to its high end.');
  addSlider(sec, 'Thickness (%)', 'fnWidth', 0.5, 100, 0.5);
  addCheckbox(sec, 'True proportions — not stretched to the block', 'round');
  const pf = createDiv('').parent(sec).class('field');
  fieldDivs.photoLoad = pf;
  createSpan('Photo').parent(pf).class('label');
  const fileIn = createFileInput(() => {}).parent(pf);
  fileIn.elt.accept = 'image/*';
  fileIn.elt.onchange = ev => loadPhotoFile(ev.target.files && ev.target.files[0]);
  photoNote = createDiv(PHOTO ? PHOTO.name : 'Not part of the link — load it again to rebuild the sheet.')
    .parent(pf).class('note');
  addSelect(sec, 'Laid', 'photoMap', PHOTO_MAPS, resync,
    '<b>front</b> — on the front and through every wall; <b>relief</b> — as deep as it is dark; ' +
    '<b>lens</b> — as thick about the middle; <b>heightmap</b> — on the plan, as high as it is ' +
    'dark; <b>plan</b> — on the plan, the whole height.');
  addSlider(sec, 'Depth (%)', 'photoDepth', 1, 200, 1);
  addCheckbox(sec, 'The light is dense, not the dark', 'photoInvert');
  addSlider(sec, 'Left empty under (%)', 'photoCut', 0, 95, 1,
    'Paper lighter than this is no part of the block — the background drops out.');
  const rf = addTextField(sec, 'Rule (B…/S…)', 'caRule', '', v => {
    const r = parseCaRule(v);
    if (r) { settings.caRule = ruleString(r); update(); }
    updateRuleInfo();
  });
  ruleInput = rf.inp;
  ruleInfo = createDiv('').parent(rf.field).class('note');
  updateRuleInfo();
  const presetField = createDiv('').parent(sec).class('field');
  fieldDivs.caPreset = presetField;
  const ruleSel = createSelect().parent(presetField);
  for (const r of CA_RULES) ruleSel.option(r.label);
  ruleSel.changed(() => {
    const r = CA_RULES[ruleSel.elt.selectedIndex];
    if (r && r.rule) {
      settings.caRule = r.rule;
      ruleInput.value(r.rule);
      updateRuleInfo();
      update();
    }
    ruleSel.elt.selectedIndex = 0;
  });
  addSelect(sec, 'Starts from', 'caSeed', CA_SEEDS, resync,
    '<b>random</b> over the whole plan, a random <b>disc</b>, one cell in the <b>centre</b>, a ' +
    '<b>cross</b> or a <b>ring</b>.');
  addSlider(sec, 'Alive at the start (%)', 'caDensity', 1, 100, 1);
  addSlider(sec, 'Radius (%)', 'caRadius', 1, 150, 1);
  addSlider(sec, 'Cells across', 'caCells', 3, 200, 1);
  addSlider(sec, 'Levels — generations up', 'caLevels', 1, 300, 1);
  addSlider(sec, 'Generations a level', 'caStep', 1, 20, 1);
  addSlider(sec, 'Generations before the first', 'caWarmup', 0, 500, 1);
  addCheckbox(sec, 'Eight neighbours (Moore), not four', 'caMoore');
  addCheckbox(sec, 'The edges wrap round', 'caWrap');
  addCheckbox(sec, 'The first generation at the bottom', 'caUp');
  addSlider(sec, 'Trail (%)', 'caTrail', 0, 99, 1, 'What is left of a dead cell a level later — the stack goes soft.');
  addCheckbox(sec, 'Lines follow the cells', 'caSnap', resync);

  sec = addSection(root, 'Shaping the dark');
  addSelect(sec, 'Gathered into', 'focus', FOCI, resync,
    'Only inside a <b>ball</b>, a <b>column</b> or a <b>layer</b>, fading out at its edge. ' +
    '<b>Alt</b>-drag on the sheet moves it.');
  addSlider(sec, 'Across (%)', 'focusX', -150, 150, 1);
  addSlider(sec, 'Up (%)', 'focusY', -150, 150, 1);
  addSlider(sec, 'Front (%)', 'focusZ', -150, 150, 1);
  addSlider(sec, 'Radius (%)', 'focusR', 1, 200, 1);
  addSlider(sec, 'Soft edge (%)', 'focusSoft', 0, 100, 1);
  addSlider(sec, 'Level (%)', 'level', -100, 100, 1);
  addSlider(sec, 'Contrast (%)', 'contrast', -100, 400, 1);
  addSlider(sec, 'Gamma (%)', 'gamma', 20, 500, 1, 'Over 100 thins the light parts out.');
  addSlider(sec, 'Bands', 'bands', 0, 12, 1, 'The dark cut into steps — terraces. 0 or 1 — none.');
  addCheckbox(sec, 'Inside out — dense where it was empty', 'invertField');
  addSlider(sec, 'Haze everywhere (%)', 'base', 0, 100, 1);
  addSlider(sec, 'Darkest (%)', 'densest', 1, 100, 1,
    'The densest the field may get. Where every wall shows every line the paper goes black; ' +
    'below 100 even the core stays smoke.');
  addSlider(sec, 'Fading to the last wall (%)', 'depthFade', 0, 100, 1);
  addSlider(sec, 'Grain (%)', 'grain', 0, 100, 1);
  addSlider(sec, 'Grain size', 'grainScale', 1, 40, 0.5);

  sec = addSection(root, 'Ink');
  addSelect(sec, 'The dark as', 'dark', DARK_MODES, resync,
    '<b>dither</b> — every line its own threshold, so the lines through a place are as many as ' +
    'it is dense; <b>solid</b> — every line where it is denser than one cut; <b>squiggle</b> — ' +
    'lines shaking as hard as it is dense; <b>dashes</b> — as long as it is dense; ' +
    '<b>contours</b> — the edge of the dark on every wall; <b>crossed</b> — dither, and lines ' +
    'across the walls in the densest part. <b>D</b> steps.');
  addSelect(sec, 'Thresholds', 'ditherKind', DITHERS, update,
    '<b>ordered</b> — a Bayer matrix over lines and walls, even; <b>random</b> — grainy, like ' +
    'smoke; <b>by wall</b> — whole walls take turns; <b>by line</b> — lines take turns.');
  addSlider(sec, 'Levels', 'levels', 2, 64, 1);
  addSlider(sec, 'Cut (%)', 'iso', 0, 99, 1);
  addSlider(sec, 'Shake (% of a line\'s space)', 'squigAmp', 0, 400, 1);
  addSlider(sec, 'Waves up a wall', 'squigFreq', 1, 300, 1);
  addSlider(sec, 'Dash period (% of a wall)', 'dashLen', 0.2, 30, 0.1);
  addSlider(sec, 'Contours', 'contourLevels', 1, 30, 1);
  addSlider(sec, 'Contour detail', 'contourRes', 10, 400, 1);
  addSlider(sec, 'Crossed from (%)', 'crossFrom', 0, 95, 1);
  addSlider(sec, 'Shortest piece (% of a wall)', 'minRun', 0, 10, 0.1);
  addSlider(sec, 'Detail along a line', 'detail', 10, 600, 1, 'Samples of the field up a wall.');
  addSub(sec, 'Accent');
  addSelect(sec, 'Accent', 'accent', ACCENTS, resync,
    'Part of the dark moved to the accent pen: the <b>densest</b> of it, the <b>back</b> or ' +
    '<b>front walls</b>, <b>every n-th wall</b> or <b>random lines</b>.');
  addSlider(sec, 'From (%)', 'accentLevel', 0, 100, 1, 'The density — or, for walls, how far through the stack.');
  addSlider(sec, 'Every', 'accentEvery', 1, 30, 1);
  addSlider(sec, 'Share (%)', 'accentShare', 0, 100, 1);

  sec = addSection(root, 'Camera');
  addSelect(sec, 'Projection', 'projection', PROJECTIONS, resync,
    '<b>parallel</b> — as a drawing would; <b>perspective</b> — from close by. <b>P</b> switches.');
  addSlider(sec, 'Azimuth (°)', 'azimuth', -180, 180, 0.5, 'A drag on the sheet turns the camera; the arrow keys by 1°, with shift 10°.');
  addSlider(sec, 'Elevation (°)', 'elevation', -90, 90, 0.5);
  addSlider(sec, 'Distance', 'distance', 1.2, 20, 0.1, 'In half-diagonals of the block.');
  addCheckbox(sec, 'Upright lines stay upright (shift lens)', 'upright');
  addSlider(sec, 'Zoom (%)', 'zoom', MIN_ZOOM, MAX_ZOOM, 1, 'The wheel zooms, shift-drag pans, <b>0</b> resets.');
  addSlider(sec, 'Pan across (mm)', 'panX', -1000, 1000, 0.5);
  addSlider(sec, 'Pan down (mm)', 'panY', -1000, 1000, 0.5);
  createButton('Reset zoom and pan').parent(sec).mousePressed(resetView);

  sec = addSection(root, 'Pens');
  addNote(sec, 'Five pens of the drawer; each layer picks one by number. Changing the kind sets ' +
    'its colour and a usual width.');
  addPenSelect(sec, 'Walls drawn whole', 'shellPen');
  addPenSelect(sec, 'Dark zones', 'corePen');
  addPenSelect(sec, 'Accent', 'accentPen');
  addPenSelect(sec, 'Edges', 'edgesPen');
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

  sec = addSection(root, 'Output');
  addCheckbox(sec, 'Order the strokes for the plotter', 'optimiseOrder');
  addCheckbox(sec, 'Follow the sliders live', 'liveUpdate', () => syncUrl());
  addCheckbox(sec, 'Show the box and the dark zone\'s middle', 'showGuides', () => { drawPreview(); syncUrl(); });
  createButton('Download SVG [everything]').parent(sec).class('primary')
    .mousePressed(() => exportSvg({ all: true }));
  createButton('Download SVG [one per pen]').parent(sec).mousePressed(() => exportSvg({ perPen: true }));
  const lb = createDiv('').parent(sec).class('layer-buttons');
  LAYERS.forEach((ly, li) => {
    layerButtons[li] = createButton('').parent(lb).mousePressed(() => exportSvg({ layer: li }));
  });
  addNote(sec, 'Everything is one file, a group per pen; a layer\'s file is the walls, the dark ' +
    'zones, the accent or the edges alone. Every file is the whole sheet in millimetres.');
  addSlider(sec, 'Picture (dpi)', 'pngDpi', 50, 600, 10, '', () => syncUrl());
  createButton('Download PNG').parent(sec).mousePressed(exportPng);
  const row = createDiv('').parent(sec).class('btn-row');
  createButton('Copy link').parent(row).mousePressed(function () { copyLink(this); });
  createButton('Reset').parent(row).mousePressed(resetAll);

  sec = addSection(root, 'The sheet');
  statsDiv = createDiv('').parent(sec).class('stats');
  penListDiv = createDiv('').parent(sec).class('stats');
  createDiv('').parent(sec).class('note keys').html(
    '<div><kbd>drag</kbd> turn · <kbd>shift</kbd>+<kbd>drag</kbd> pan · <kbd>alt</kbd>+<kbd>drag</kbd> the dark zone</div>' +
    '<div><kbd>wheel</kbd> zoom · <kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> turn · <kbd>+</kbd><kbd>−</kbd><kbd>0</kbd> zoom</div>' +
    '<div><kbd>S</kbd> scene · <kbd>W</kbd> walls · <kbd>F</kbd> field · <kbd>D</kbd> dark as · <kbd>L</kbd> line style</div>' +
    '<div><kbd>P</kbd> projection · <kbd>G</kbd> guides · <kbd>R</kbd> new seed · <kbd>[</kbd> <kbd>]</kbd> step it</div>');
  linkDiv = createDiv('').parent(sec).class('link');
  refreshPenSelects();
  syncVisibility();
}

function loadPhotoFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    PHOTO = { img, name: file.name, ver: ++photoVer };
    settings.source = 'photo';
    if (setters.source) setters.source('photo');
    if (photoNote) photoNote.html(file.name + ' — not part of the link; load it again to rebuild the sheet.');
    syncVisibility();
    update();
  };
  img.src = url;
}

////////////////////////////////////////////////////////////////////////////////////////
// What the sheet costs

// How far apart two neighbouring lines of the first wall, and two neighbouring walls at
// the end of the stack, land on the paper — the closest the ink comes to closing up.
function paperSpacing() {
  if (!G || !MODEL) return null;
  const g = G, w0 = g.wpos[0];
  const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const at = (a, b, w) => { placeAt(a, b, w); return toPaper(OUT3[0], OUT3[1], OUT3[2]); };
  let lines = Infinity, walls = Infinity;
  if (g.mode === 3) {
    const r = ringR(w0), gap = 2 * Math.PI * r / Math.max(3, Math.round(g.L * r / g.R));
    lines = d(at(0, 0, w0), at(gap, 0, w0));
  } else {
    const gap = g.Wa / g.L;
    lines = d(at(0, 0, w0), at(gap, 0, w0));
    if (g.K > 1) walls = d(at(g.Wa / 2, 0, w0), at(g.Wa / 2, 0, g.wpos[1]));
  }
  return { lines, walls };
}

function updateStats() {
  if (!statsDiv) return;
  const s = settings;
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
  const seconds = strokes * PEN_CYCLE_S + plan.ink / DRAW_SPEED + plan.travel / TRAVEL_SPEED;
  const sp = paperSpacing();
  const c = MODEL.counts;
  let html =
    `<div class="big"><b>${groupNum(strokes)}</b> strokes, ` +
    `<b>${(plan.ink / 1000).toFixed(1)}</b> m of line</div>` +
    `<div>${G.K} ${s.stack === 'floors' ? 'floors' : s.stack === 'rings' ? 'rings' : s.stack === 'pages' ? 'pages' : 'walls'} × ` +
    `${G.L} lines · ${groupNum(c.lines)} traced, ${groupNum(c.whole)} whole</div>` +
    `<div>${s.source}${FIELD && FIELD.note ? ' — ' + FIELD.note : ''} · ${s.dark}</div>`;
  if (sp) {
    html += `<div>On paper the lines are <b>${sp.lines.toFixed(2)}</b> mm apart` +
      `${Number.isFinite(sp.walls) ? `, the walls <b>${sp.walls.toFixed(2)}</b> mm` : ''}</div>`;
  }
  html +=
    `<div>Pen up for ${(plan.travel / 1000).toFixed(1)} m between strokes</div>` +
    `<div>Roughly <b>${formatDuration(seconds)}</b> to plot · ${lastMs.toFixed(0)} ms to build` +
    `${modelMs ? ` (the walls ${modelMs.toFixed(0)} ms)` : ''}</div>`;
  if (s.source === 'photo' && !PHOTO) {
    html += '<div class="warn">No photo loaded — load one under <b>Dark zones</b>.</div>';
  }
  if (s.source === 'function' && s.fn === 'custom' && FIELD && FIELD.note) {
    html += `<div class="warn">The formula: ${FIELD.note}.</div>`;
  }
  if (s.source === 'automaton' && FIELD && FIELD.alive === 0) {
    html += '<div class="warn">The automaton is dead from the start — another rule, seed or start.</div>';
  }
  if (MODEL.full) html += '<div class="warn">Too many points — the walls were cut short.</div>';
  const nib = penW(penIdx(s.shellPen));
  if (sp && sp.lines < nib * 1.15) {
    html += `<div class="warn">The lines land ${sp.lines.toFixed(2)} mm apart and the pen is ${nib} mm ` +
      'wide — they will run together. Fewer lines, or a finer pen.</div>';
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
  return `line volume — ${s.stack} ${G ? G.K + 'x' + G.L : ''} shell=${s.shell} ` +
    `${s.source}${s.source === 'photo' && PHOTO ? ' ' + PHOTO.name : ''}` +
    `${s.source === 'function' ? ' ' + (s.fn === 'custom' ? s.fnExpr : s.fn) : ''}` +
    `${s.source === 'automaton' ? ' ' + s.caRule : ''} dark=${s.dark} ` +
    `${s.projection} az=${s.azimuth} el=${s.elevation} seed=${s.seed} ` +
    `pens=[${pens.join('; ')}] strokes=${strokes}`;
}

function fileStem() {
  const s = settings;
  const paper = s.paper === 'custom' ? `${s.customW}x${s.customH}mm` : `${s.paper}-${s.orientation}`;
  const src = s.source === 'function' ? (s.fn === 'custom' ? 'formula' : s.fn)
            : s.source === 'automaton' ? s.caRule.replace('/', '-') : s.source;
  return `line volume ${s.stack} ${src} ${s.dark} seed${s.seed} ${paper}`;
}

////////////////////////////////////////////////////////////////////////////////////////
// Controls, shared
//
// A section folds away under its heading; which ones are folded is remembered by the
// browser, not by the link.

function foldedSet() {
  try { return new Set(JSON.parse(localStorage.getItem('p5js20-folded') || '[]')); }
  catch (e) { return new Set(); }
}

function saveFolded(set) {
  try { localStorage.setItem('p5js20-folded', JSON.stringify([...set])); } catch (e) { /* no storage */ }
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

function applyScene(sc) {
  Object.assign(settings, DEFAULTS, sc.s || {});
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
  sel.changed(() => { settings[key] = sel.value(); (onChange || update)(); });
  return sel;
}

// A select of the five pens, by number, each named for what it is now.
function addPenSelect(parent, labelText, key, hint) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const sel = createSelect().parent(field);
  for (let i = 0; i < SLOTS; i++) sel.option(penLabel(i), String(i + 1));
  sel.selected(String(settings[key]));
  if (hint) createDiv(hint).parent(field).class('note');
  setters[key] = v => sel.selected(String(v));
  sel.changed(() => { settings[key] = Number(sel.value()); update(); });
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

// A pen of the drawer: its kind, its width, its colour in the preview.
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
    const sec = p.strokes * PEN_CYCLE_S + p.ink / DRAW_SPEED + (p.travel || 0) / TRAVEL_SPEED;
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
// the pen should visit them, and the link that rebuilds the sheet is in the header comment.

function svgGroup(keep, pen, id) {
  const { pts, off } = shapes;
  const { order, flip } = plan;
  const f = n => String(+n.toFixed(3));
  const CHUNK = 400;
  let body = '', d = '', held = 0, count = 0;
  for (let t = 0; t < order.length; t++) {
    const i = order[t];
    if (shapes.ink[i] !== pen || !keep(i)) continue;
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
  return `<g id="${id}" fill="none" stroke="${penCol(pen)}" stroke-width="${f(penW(pen))}" ` +
    `stroke-linecap="round" stroke-linejoin="round">\n${body}</g>\n`;
}

function penId(i) { return `pen${i + 1}-${penKind(i).replace(/\s+/g, '-')}`; }

function svgFile(groups, tag) {
  const [W, H] = paperDims();
  let body = '';
  for (const [keep, pen, id] of groups) {
    const g = svgGroup(keep, pen, id);
    if (g) body += g;
  }
  if (!body) return null;
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- ${metaComment().replace(/--/g, '- -')} pass=${tag} -->\n` +
    `<!-- ${location.origin === 'null' ? '' : location.origin}${location.pathname}` +
    `#${encodeState().replace(/--/g, '-%2D')} -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n` +
    body +
    `</svg>\n`;
}

function exportSvg(what) {
  if (!shapes || !plan || !strokes) {
    alert('Nothing to export — no line is left on this sheet.');
    return;
  }
  const all = () => true;
  const files = [];
  if (what.all) {
    files.push([penOrder().map(i => [all, i, penId(i)]), 'everything']);
  } else if (what.perPen) {
    for (const i of penOrder()) {
      if (perPen[i] && perPen[i].strokes) {
        const w = penW(i);
        files.push([[[all, i, penId(i)]], `pen${i + 1} ${penKind(i)} ${+w.toFixed(2)}mm`]);
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
