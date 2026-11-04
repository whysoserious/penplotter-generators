////////////////////////////////////////////////////////////////////////////////////////
// Folded orbs — fractals of three and four dimensions, raymarched and drawn in a disc
//
// Signed distance fields: a function that, for any point of space, says how far the
// nearest surface is. Walk a ray in steps that long and it lands on the surface. The
// fields here are kaleidoscopes — space folded on mirrors again and again, scaled and
// twisted between the folds — some of them in four dimensions and cut by a hyperplane, or
// regular polytopes of four dimensions brought down by stereographic projection, or the
// circles of a Hopf fibration. They can be kept inside a ball, carved out of it, seen in a
// mirror ball or from inside a ball that is a mirror on the inside.
//
// What comes out of the rays is not a picture but readings: which piece of the fractal
// each ray hit, through which mirrors, how far, which way the surface faced. A line is
// drawn wherever two neighbouring readings disagree — another piece, another mirror, a
// jump in depth, a fold of the surface — and every region between the lines is shaded
// with a pattern of the pen: halftone dots, hatching, cross-hatching, lines that follow
// the surface, or solid black. The whole of it can be folded into exact symmetry: only
// one wedge is computed and drawn, and the sheet is that wedge turned and mirrored.
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

const VIEWS     = ['orb', 'mirror ball', 'mirror room', 'dome'];
const OBJECTS   = ['kifs', 'mandelbox', 'julia', 'hyperfold', 'polytope', 'hopf'];
const FOLDS     = ['tetra', 'cube'];
const CORES     = ['box', 'ball', 'cross'];
const POLYTOPES = ['tesseract', '16-cell', '24-cell'];
const ENCLOSES  = ['none', 'inside', 'carved', 'shell'];
const SYMS      = ['none', 'mirror', 'dihedral', 'rotational'];
const PATTERNS  = ['mixed', 'dots', 'hatch', 'cross', 'flow', 'none'];
const FILLS     = ['dots', 'hatch', 'cross', 'flow'];
const HATCH_BY  = ['fixed', 'per region', 'surface'];
const FLOWS     = ['depth', 'height', 'radius', 'trap', 'light'];
const DOT_ORDER = ['bayer', 'random', 'rows'];
const RINGS     = ['none', 'line', 'double', 'halo', 'broken'];
const MARK_AT   = ['sheet', 'picture'];

// What goes on the sheet. The cut guides go with the pen of the outlines.
const LAYERS = [
  { id: 'outlines', label: 'outlines',          pen: 'linePen' },
  { id: 'shading',  label: 'shading',           pen: 'fillPen' },
  { id: 'mirrored', label: 'shading in mirrors', pen: 'mirrorPen' },
  { id: 'solid',    label: 'solid black',       pen: 'solidPen' },
  { id: 'ring',     label: 'ring',              pen: 'ringPen' },
  { id: 'guides',   label: 'cut guides',        pen: 'linePen' },
];
const L_LINES = 0, L_FILL = 1, L_MIRROR = 2, L_SOLID = 3, L_RING = 4, L_GUIDES = 5;

const MAX_STROKES    = 400_000;
const BUSY_STROKES   = 40_000;
const MAX_CELLS      = 1400;       // the grid of rays is never finer than this a side
const DRAG_COARSE    = 3;          // while the hand turns the orb, rays this much sparser
const SIMPLIFY       = 0.03;
const HYSTERESIS     = 0.08;       // of the tone — how much lighter a begun hatch line may run on
const MIN_DASH       = 0.8;        // mm — a shorter piece of hatching is left out
const MIN_FLOW       = 1.5;        // mm — and a shorter piece of a flow line       // mm — how far an outline may be straightened
const EPS            = 0.01;       // mm — the stub that stands in for a dot
const PREVIEW_MAX_PX = 1500;
const PEN_CYCLE_S    = 0.3;
const DRAW_SPEED     = 60;
const TRAVEL_SPEED   = 150;
const DRAG_DEG_PX    = 0.4;

const settings = {
  // paper
  paper: 'A4',
  orientation: 'portrait',
  customW: 300,
  customH: 300,
  margin: 20,
  paperTone: 'white',
  paperColor: '#fbfaf5',   // the preview only — the files have no background
  cropMarks: true,         // cut guides — dots to lay the guillotine's blade through
  cropMarkAt: 'sheet',
  cropMarkGap: 400,        // mm — the most that is ever left between two dots

  // the pens
  pen1Kind: 'black',         pen1W: 0.3, pen1Col: '#1b1b1b',
  pen2Kind: 'red',           pen2W: 0.3, pen2Col: '#c8261d',
  pen3Kind: 'red marker',    pen3W: 3,   pen3Col: '#d9342a',
  pen4Kind: 'silver marker', pen4W: 3,   pen4Col: '#adb1b7',
  pen5Kind: 'white marker',  pen5W: 3,   pen5Col: '#f7f6f1',
  linePen: 1, fillPen: 1, mirrorPen: 2, solidPen: 1, ringPen: 1,
  mirrorOwnPen: false,     // what is seen in a mirror shaded in its own pen

  seed: 7,

  // the orb on the sheet
  orbSize: 92,            // % of the picture's short side
  orbX: 0,                 // mm from the middle
  orbY: 0,
  detail: 0.3,             // mm between two rays

  // how it is seen
  view: 'orb',
  camDist: 2.6,            // from the middle, in radii of the ball
  fov: 200,                // ° — the fisheye's whole angle; the orb's when the eye is inside
  camYaw: 0,               // ° — the eye's own turn
  camPitch: 0,

  // the fractal
  object: 'hopf',
  folds: 'tetra',
  iters: 5,
  kScale: 2,
  offX: 1, offY: 1, offZ: 1, offW: 1,
  twistA: 12, twistB: 6, twistC: 0, twistD: 0, twistE: 0,
  coreShape: 'box',
  core: 1,
  partDepth: 1,            // how many of the first folds name the pieces
  mbScale: -1.8, mbMinR: 0.5, mbFold: 1, mbZoom: 3,
  jc0: -0.2, jc1: 0.6, jc2: 0.2, jc3: 0, jZoom: 1.2,
  wSlice: 0,
  hZoom: 1.4,
  polytope: 'tesseract',
  tube: 0.07,              // rad on the three-sphere
  node: 0.14,
  layers: 3, layerGap: 0.3, windA: 1, windB: 2, windStep: 0, fibres: 10,
  xw: 20, yw: 10, zw: 0,   // ° — the turn through the fourth dimension
  yaw: 30, pitch: 20, roll: 0,
  objSize: 0.7,            // radii of the ball
  invertObj: false,
  enclose: 'inside',
  shell: 0.12,
  hollow: 0,               // radii of the ball — a round room carved at the heart

  // mirrors
  mirrorBall: 0,           // radii of the ball — 0, none
  room: 2,                 // the mirror room's radius
  bounces: 3,

  // the rays
  maxSteps: 160,
  precision: 70,           // % of a pixel a ray must come within to call it a hit

  // symmetry
  symmetry: 'mirror',
  symN: 6,

  // light and tone
  lightYaw: -35,           // °
  lightPitch: 40,
  ambient: 22,             // %
  aoK: 70,                 // %
  fog: 0,                  // % — over 0 the far fades to paper, under it to ink
  skyTone: 0,              // % of ink in the sky
  capShift: 0,             // % — the caps the ball cut, lighter or darker
  mirrorDim: 18,           // % darker for every mirror on the way
  flat: 85,                // % — every region shaded with its own mean tone
  levels: 0,               // tones cut into so many steps
  invert: false,
  contrast: 0,             // %
  gamma: 100,              // %

  // the outlines
  outlines: true,
  panels: 0,               // bands of the orbit trap, each a region of its own
  depthEdge: 6,            // % — a jump in depth this large is an edge
  crease: 55,              // ° — a fold this sharp is an edge; 0, none
  despeckle: 8,            // pixels — a region smaller than this is swallowed
  smooth: 3,
  minLine: 1.2,            // mm

  // the shading
  pattern: 'mixed',
  mixDots: true, mixHatch: true, mixCross: true, mixFlow: false,
  dotPitch: 1.0,           // mm
  dotAngle: 45,            // °
  dotOrder: 'bayer',
  hatchPitch: 0.7,         // mm
  hatchAngle: 45,          // °
  hatchBy: 'surface',
  flowField: 'depth',
  flowLines: 90,
  edgeGap: 0.5,            // mm of paper left along every outline
  lightest: 8,             // % — lighter than this is left bare
  solidAt: 100,            // % — darker than this is filled solid; 100, never
  solidPasses: 85,         // % of the nib between two passes

  // ring
  ring: 'line',
  ringGap: 3,              // mm

  // output
  optimiseOrder: true,
  liveUpdate: true,
  showGuides: false,
  showRender: false,
  penDown: 100,            // % of the nib — a hop shorter than this is drawn, not lifted over
  pngDpi: 200,
};

const DEFAULTS = { ...settings };

// What the rays depend on. Anything else is redrawn without casting them again.
const RENDER_KEYS = ['paper', 'orientation', 'customW', 'customH', 'margin', 'orbSize', 'orbX',
  'orbY', 'detail', 'view', 'camDist', 'fov', 'camYaw', 'camPitch', 'object', 'folds', 'iters',
  'kScale', 'offX', 'offY', 'offZ', 'offW', 'twistA', 'twistB', 'twistC', 'twistD', 'twistE',
  'coreShape', 'core', 'partDepth', 'mbScale', 'mbMinR', 'mbFold', 'mbZoom', 'jc0', 'jc1',
  'jc2', 'jc3', 'jZoom', 'wSlice', 'hZoom', 'polytope', 'tube', 'node', 'layers', 'layerGap',
  'windA', 'windB', 'windStep', 'fibres', 'xw', 'yw', 'zw', 'yaw', 'pitch', 'roll', 'objSize',
  'invertObj', 'enclose', 'shell', 'hollow', 'mirrorBall', 'room', 'bounces', 'maxSteps',
  'precision', 'symmetry', 'symN'];

// Sheets worth starting from. Each one is the whole state.
const SCENES = [
  { label: '— select a scene —' },
  { label: 'Linked rings of a Hopf fibration, in a ball', s: {} },
  { label: 'Tetrahedral kaleidoscope cut by the ball', s: {
      object: 'kifs', iters: 4, kScale: 1.8, core: 1.4, objSize: 1.1, offX: 1.2, offY: 0.8,
      offZ: 0.6, twistA: 30, twistB: 6, enclose: 'inside' } },
  { label: 'Menger sponge, the ball its cut', s: {
      object: 'kifs', folds: 'cube', kScale: 3, iters: 3, objSize: 1.1, twistA: 0, twistB: 0,
      enclose: 'inside' } },
  { label: '24-cell — its edges on the three-sphere', s: {
      object: 'polytope', polytope: '24-cell', objSize: 0.55, tube: 0.06, node: 0.1,
      enclose: 'inside' } },
  { label: 'Tesseract in a mirror room', s: {
      view: 'mirror room', room: 1.5, camDist: 0.6, fov: 180, enclose: 'none',
      object: 'polytope', objSize: 0.4 } },
  { label: 'Hopf rings in a mirror ball', s: {
      view: 'mirror ball', mirrorBall: 0.25, enclose: 'none', objSize: 0.7, tube: 0.06,
      mirrorDim: 0, despeckle: 60, minLine: 2 } },
  { label: 'A kaleidoscope reflected in a mirror room', s: {
      view: 'mirror room', room: 1.2, camDist: 0.9, fov: 160, enclose: 'none', object: 'kifs',
      iters: 4, core: 1.5, objSize: 0.5, bounces: 4, mirrorDim: 6, ambient: 40 } },
  { label: 'Dome of the 24-cell, looking up', s: {
      view: 'dome', fov: 200, camDist: 0, camPitch: -90, enclose: 'none', object: 'polytope',
      polytope: '24-cell', objSize: 0.6, symmetry: 'dihedral', symN: 3 } },
  { label: 'Quaternion Julia, cut in w, in rings', s: {
      object: 'julia', iters: 10, objSize: 1.1, jc0: -0.291, jc1: -0.399, jc2: 0.339,
      jc3: 0.437, partDepth: 0, enclose: 'none', camDist: 2.2, panels: 8, crease: 0,
      depthEdge: 0, despeckle: 60, aoK: 0, ambient: 35, pattern: 'flow', flowField: 'depth',
      flowLines: 60 } },
  { label: 'Hyperfold — a four-dimensional sponge, sliced', s: {
      object: 'hyperfold', iters: 3, objSize: 1.2, core: 0.7, kScale: 2.2, twistA: 20, xw: 35 } },
  { label: 'Six mirrors round a Menger', s: {
      object: 'kifs', folds: 'cube', kScale: 2.6, iters: 3, objSize: 1.2, twistA: 15,
      twistB: 10, offY: 0.7, symmetry: 'dihedral', symN: 6 } },
  { label: 'Solid black between the struts', s: {
      object: 'kifs', folds: 'cube', kScale: 3, iters: 3, objSize: 1.1, twistA: 0, twistB: 0,
      yaw: 10, pitch: 8, fog: -70, pattern: 'hatch', solidAt: 62, lightest: 20,
      hatchPitch: 0.9 } },
  { label: 'Lines that follow the surface', s: {
      object: 'hopf', objSize: 0.7, pattern: 'flow', flowField: 'radius', flowLines: 140,
      edgeGap: 0.4 } },
  { label: 'What the mirror shows, in red', s: {
      mirrorBall: 0.5, enclose: 'none', object: 'polytope', polytope: '24-cell', objSize: 0.7,
      tube: 0.05, node: 0.08, hollow: 0.6, camDist: 2.4, mirrorOwnPen: true, ring: 'halo' } },
  { label: 'White marker on black paper', s: {
      paper: 'A3', paperTone: 'black', paperColor: PAPER_TONES.black, linePen: 5, fillPen: 5,
      ringPen: 5, pen5W: 0.8, invert: true, dotPitch: 1.6, hatchPitch: 1.4, edgeGap: 0.9,
      ring: 'halo' } },
];

const setters   = {};
const fieldDivs = {};
let statsDiv, linkDiv, penListDiv, progressDiv, layerButtons = {}, penSelects = [], slotSwatches = [];

let area    = null;          // the margin box, in mm
let ORB     = null;          // { cx, cy, R } — the disc, in mm
let shapes  = null;          // { pts, off, ink, lay } — polylines in mm
let strokes = 0;
let plan    = null;          // { order, flip, ink, travel, downs }
let perPen  = null;
let perLayer = null;
let lastMs  = 0;
let drag    = null;
let COUNTS  = null;
let RENDER_IMG = null;       // the tones, as a picture under the strokes

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

// A number in [0, 1) for a pair of integers and a salt — the same whatever order things
// are visited in, so two regions with one name get one pattern on both sides of a mirror.
function hash01(i, j, salt) {
  let h = Math.imul(i | 0, 0x27d4eb2d) ^ Math.imul((j | 0) + 0x3c6ef372, 0x165667b1) ^
          Math.imul((salt | 0) + (settings.seed | 0) * 7919, 0x9e3779b1);
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
function penKind(i) { return settings[`pen${i + 1}Kind`] || 'black'; }
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

function orbPlace() {
  const s = settings;
  return {
    cx: (area.x0 + area.x1) / 2 + s.orbX,
    cy: (area.y0 + area.y1) / 2 + s.orbY,
    R: Math.max(2, clamp(s.orbSize, 5, 300) / 100 * Math.min(area.w, area.h) / 2),
  };
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

// Cast the rays if they are not cast yet — in the background, the sheet drawn when they
// are back — otherwise draw it now.
function update() {
  area = drawArea();
  ORB = orbPlace();
  const want = renderParams(!!drag);
  if (!BUF || BUF.key !== want.key) {
    requestRender(want);
    drawPreview();
    updateStats();
    syncUrl();
    return;
  }
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
// Casting the rays
//
// The grid of rays covers the square round the disc, one every `detail` mm. The work is
// cut into bands of rows and handed to a pool of workers built from the raymarcher's own
// source; where a browser will not start a worker from a page opened off the disk, the
// bands are rendered here, a slice at a time between frames.

let BUF = null;              // the readings of the last finished render
let JOB = null;              // the render under way
let POOL = null, POOL_FAILED = false;
let CORE = null;             // the raymarcher on this thread

function renderParams(coarse) {
  const s = settings;
  const R = ORB.R;
  let cell = Math.max(0.05, s.detail) * (coarse ? DRAG_COARSE : 1);
  let N = Math.ceil(2 * R / cell / 2) * 2;
  if (N > MAX_CELLS) { N = MAX_CELLS; }
  cell = 2 * R / N;
  const view = s.view;
  let fov = s.fov, pixAng;
  if (view === 'orb') {
    if (s.camDist > 1.02) fov = 2 * Math.asin(1 / s.camDist) * 180 / Math.PI;
    else fov = Math.min(fov, 170);
    pixAng = 2 * Math.tan(rad(fov) / 2) / N;
  } else if (view === 'mirror ball') {
    pixAng = 4 / N;
  } else {
    pixAng = rad(fov) / N;
  }
  const P = { N, view, fov, pixAng, epsK: clamp(s.precision, 5, 400) / 100,
    stepK: 0.9, tMax: 30, aoDist: 0.06 };
  for (const k of ['camDist', 'camYaw', 'camPitch', 'object', 'folds', 'iters', 'kScale', 'offX',
    'offY', 'offZ', 'offW', 'twistA', 'twistB', 'twistC', 'twistD', 'twistE', 'coreShape', 'core',
    'partDepth', 'mbScale', 'mbMinR', 'mbFold', 'mbZoom', 'jc0', 'jc1', 'jc2', 'jc3', 'jZoom',
    'wSlice', 'hZoom', 'polytope', 'tube', 'node', 'layers', 'layerGap', 'windA', 'windB',
    'windStep', 'fibres', 'xw', 'yw', 'zw', 'yaw', 'pitch', 'roll', 'objSize', 'invertObj',
    'enclose', 'shell', 'hollow', 'bounces', 'maxSteps', 'symmetry', 'symN']) P[k] = s[k];
  P.iters = Math.round(P.iters);
  P.partDepth = Math.round(P.partDepth);
  P.symN = Math.max(1, Math.round(P.symN));
  P.mirrorBall = view === 'mirror ball' ? Math.max(0.05, s.mirrorBall || 0.3) : s.mirrorBall;
  P.room = view === 'mirror room' ? Math.max(0.2, s.room) : 0;
  if (view === 'mirror ball') P.camDist = 0;
  const key = JSON.stringify(P) + `|${ORB.cx.toFixed(3)},${ORB.cy.toFixed(3)},${R.toFixed(3)}`;
  return { P, key, cell, N, R, cx: ORB.cx, cy: ORB.cy, coarse };
}

function workerSource() {
  return `${renderCore.toString()}\n${workerMain.toString()}\nworkerMain();\n`;
}

function ensurePool() {
  if (POOL || POOL_FAILED) return POOL;
  try {
    const url = URL.createObjectURL(new Blob([workerSource()], { type: 'text/javascript' }));
    const n = clamp(navigator.hardwareConcurrency || 4, 1, 12);
    POOL = [];
    for (let i = 0; i < n; i++) POOL.push(new Worker(url));
  } catch (err) {
    POOL = null;
    POOL_FAILED = true;
  }
  return POOL;
}

function killPool() {
  if (POOL) for (const w of POOL) w.terminate();
  POOL = null;
}

function newBuffers(n) {
  if (!CORE) CORE = renderCore();
  return CORE.newOut(n);
}

function bandsOf(N) {
  const per = Math.max(1, Math.round(N / 120)), out = [];
  for (let j = 0; j < N; j += per) {
    const rows = [];
    for (let k = j; k < Math.min(N, j + per); k++) rows.push(k);
    out.push(rows);
  }
  return out;
}

function storeRows(job, rows, out) {
  const N = job.N;
  for (const k in job.buf) {
    const dst = job.buf[k], src = out[k];
    for (let r = 0; r < rows.length; r++) dst.set(src.subarray(r * N, (r + 1) * N), rows[r] * N);
  }
  job.done += rows.length;
}

function requestRender(want) {
  if (JOB && JOB.key === want.key) return;
  if (JOB) cancelRender();
  const job = { ...want, buf: newBuffers(want.N * want.N), done: 0, t0: performance.now(),
    queue: bandsOf(want.N), id: Math.random() };
  JOB = job;
  const pool = typeof Worker !== 'undefined' && typeof Blob !== 'undefined' ? ensurePool() : null;
  if (pool) {
    job.workers = pool.length;
    let failed = false;
    const feed = w => {
      const rows = job.queue.shift();
      if (rows) w.postMessage({ job: job.id, params: job.P, rows });
    };
    for (const w of pool) {
      w.onmessage = e => {
        if (JOB !== job || e.data.job !== job.id) return;
        storeRows(job, e.data.rows, e.data.out);
        feed(w);
        progress(job);
        if (job.done >= job.N) finishRender(job);
      };
      w.onerror = e => {
        if (failed) return;
        failed = true;
        if (e && e.preventDefault) e.preventDefault();
        POOL_FAILED = true;
        killPool();
        if (JOB === job) { JOB = null; requestRender(want); }
      };
      feed(w);
    }
  } else {
    job.workers = 0;
    if (!CORE) CORE = renderCore();
    const slice = () => {
      if (JOB !== job) return;
      const t = performance.now();
      CORE.setup(job.P);
      while (job.queue.length && performance.now() - t < 40) {
        const rows = job.queue.shift();
        storeRows(job, rows, CORE.renderRows(rows));
      }
      progress(job);
      if (job.done >= job.N) finishRender(job);
      else setTimeout(slice, 0);
    };
    setTimeout(slice, 0);
  }
}

function cancelRender() {
  if (!JOB) return;
  if (JOB.workers) killPool();
  JOB = null;
}

// Render everything here and now — what the tests use.
function renderNow(want) {
  if (!CORE) CORE = renderCore();
  CORE.setup(want.P);
  const job = { ...want, buf: newBuffers(want.N * want.N), done: 0, t0: performance.now() };
  for (const rows of bandsOf(want.N)) storeRows(job, rows, CORE.renderRows(rows));
  job.ms = performance.now() - job.t0;
  BUF = job;
  BUF.workers = 0;
  return BUF;
}

function finishRender(job) {
  job.ms = performance.now() - job.t0;
  BUF = job;
  JOB = null;
  progress(null);
  update();
  if (job.coarse && !drag) update();
}

function progress(job) {
  if (!progressDiv) return;
  if (!job) { progressDiv.html(''); progressDiv.style('display', 'none'); return; }
  progressDiv.style('display', '');
  const pc = Math.round(job.done / job.N * 100);
  progressDiv.html(`casting rays — ${pc} % · ${groupNum(job.N * job.N * Math.PI / 4)} of them` +
    `${job.workers ? ` on ${job.workers} threads` : ''}`);
}

////////////////////////////////////////////////////////////////////////////////////////
// From readings to regions
//
// Every reading gets a tone (light, how hidden it is, fog, the mirrors on its way) and a
// name: the mirrors it came through, what it hit, the piece of the fractal and the band
// of the orbit trap. Regions too small to plot are swallowed by their neighbours. Then
// an edge is wherever two neighbours differ in name, jump in depth or fold sharply, and
// the regions are what the edges enclose.

let G = null;                // the grid of the sheet in hand

function quantile(arr, mask, q) {
  const vals = [];
  const step = Math.max(1, Math.floor(arr.length / 40000));
  for (let i = 0; i < arr.length; i += step) if (mask(i)) vals.push(arr[i]);
  if (!vals.length) return 0;
  vals.sort((a, b) => a - b);
  return vals[clamp(Math.floor(q * (vals.length - 1)), 0, vals.length - 1)];
}

function toneOf(B) {
  const s = settings, n = B.N * B.N, T = new Float32Array(n);
  const ly = rad(s.lightYaw), lp = rad(s.lightPitch);
  const Lx = Math.sin(ly) * Math.cos(lp), Ly = Math.sin(lp), Lz = -Math.cos(ly) * Math.cos(lp);
  const amb = s.ambient / 100, aoK = s.aoK / 100, dim = 1 - s.mirrorDim / 100;
  // fog measured from the nearest surface to the furthest one in sight
  const fog = s.fog / 100;
  const isSurf = i => B.buf.kind[i] === 2 || B.buf.kind[i] === 3;
  const near = fog ? quantile(B.buf.depth, isSurf, 0.01) : 0;
  const far = fog ? Math.max(near + 1e-6, quantile(B.buf.depth, isSurf, 0.99)) : 1;
  const gam = 100 / clamp(s.gamma, 10, 1000), con = 1 + s.contrast / 100;
  const { kind, nx, ny, nz, ao, depth, bounce } = B.buf;
  for (let i = 0; i < n; i++) {
    const k = kind[i];
    if (!k) continue;
    let b;
    if (k === 1 || k === 4) {
      b = 1 - s.skyTone / 100;
    } else {
      const dif = Math.max(0, nx[i] * Lx + ny[i] * Ly + nz[i] * Lz);
      b = amb + (1 - amb) * dif;
      b *= 1 - aoK * (1 - ao[i]);
      if (fog) {
        const f = 1 - Math.exp(-Math.abs(fog) * 3 * Math.max(0, depth[i] - near) / (far - near));
        b = b * (1 - f) + (fog > 0 ? 1 : 0) * f;
      }
      if (k === 3) b += s.capShift / 100;
    }
    if (bounce[i]) b *= Math.pow(dim, bounce[i]);
    let t = clamp(1 - b, 0, 1);
    t = clamp((t - 0.5) * con + 0.5, 0, 1);
    t = Math.pow(t, gam);
    if (s.invert) t = 1 - t;
    T[i] = t;
  }
  return T;
}

// A union-find over the grid.
function makeSets(n) {
  const p = new Int32Array(n);
  for (let i = 0; i < n; i++) p[i] = i;
  const find = a => {
    while (p[a] !== a) { p[a] = p[p[a]]; a = p[a]; }
    return a;
  };
  const join = (a, b) => {
    a = find(a); b = find(b);
    if (a !== b) { if (a < b) p[b] = a; else p[a] = b; }
  };
  return { p, find, join };
}

function namesOf(B) {
  const s = settings, N = B.N, n = N * N, name = new Int32Array(n).fill(-1);
  const { kind, part, trap, path } = B.buf;
  const surf = i => kind[i] === 2 || kind[i] === 3;
  let lo = 0, hi = 1;
  const bands = Math.round(s.panels);
  if (bands > 0) {
    lo = quantile(trap, surf, 0.02);
    hi = quantile(trap, surf, 0.98);
    if (hi <= lo) hi = lo + 1;
  }
  for (let i = 0; i < n; i++) {
    const k = kind[i];
    if (!k) continue;
    let band = 0;
    if (bands > 0 && (k === 2 || k === 3)) band = clamp(Math.floor((trap[i] - lo) / (hi - lo) * bands), 0, bands - 1);
    const pc = (part[i] % 4093 + 4093) % 4093;
    name[i] = ((path[i] * 4 + (k & 3)) * 4096 + (k === 2 || k === 3 ? pc : 0)) * 128 + band;
  }
  // regions too small to plot are swallowed by their largest neighbour
  const most = Math.round(s.despeckle);
  if (most > 0) {
    for (let pass = 0; pass < 2; pass++) {
      const U = makeSets(n);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const a = j * N + i;
        if (name[a] < 0) continue;
        if (i + 1 < N && name[a + 1] === name[a]) U.join(a, a + 1);
        if (j + 1 < N && name[a + N] === name[a]) U.join(a, a + N);
      }
      const size = new Int32Array(n);
      for (let a = 0; a < n; a++) if (name[a] >= 0) size[U.find(a)]++;
      const best = new Int32Array(n).fill(-1), bestSize = new Int32Array(n);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const a = j * N + i;
        if (name[a] < 0) continue;
        const ra = U.find(a);
        if (size[ra] >= most) continue;
        const look = b => {
          if (name[b] < 0) return;
          const rb = U.find(b);
          if (rb === ra) return;
          if (size[rb] > bestSize[ra]) { bestSize[ra] = size[rb]; best[ra] = name[b]; }
        };
        if (i > 0) look(a - 1);
        if (i + 1 < N) look(a + 1);
        if (j > 0) look(a - N);
        if (j + 1 < N) look(a + N);
      }
      let changed = 0;
      for (let a = 0; a < n; a++) {
        if (name[a] < 0) continue;
        const ra = U.find(a);
        if (size[ra] < most && best[ra] >= 0) { name[a] = best[ra]; changed++; }
      }
      if (!changed) break;
    }
  }
  return name;
}

function buildGrid(B) {
  const s = settings, N = B.N, n = N * N, cell = B.cell;
  const T0 = toneOf(B), name = namesOf(B);
  const { kind, depth, nx, ny, nz } = B.buf;
  const dEdge = s.depthEdge > 0 ? s.depthEdge / 100 : Infinity;
  const cosC = s.crease > 0 ? Math.cos(rad(s.crease)) : -2;
  const surf = i => kind[i] === 2 || kind[i] === 3;
  // a reading next to another name is on a silhouette, where the normals graze and fold
  // every which way — no depth or fold edge is read there
  const rim = new Uint8Array(n);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = j * N + i;
    if (name[a] < 0) continue;
    if (i + 1 < N && name[a + 1] >= 0 && name[a + 1] !== name[a]) rim[a] = rim[a + 1] = 1;
    if (j + 1 < N && name[a + N] >= 0 && name[a + N] !== name[a]) rim[a] = rim[a + N] = 1;
  }
  const edgeBetween = (a, b) => {
    if (name[a] !== name[b]) return true;
    if (!surf(a) || !surf(b) || rim[a] || rim[b]) return false;
    const da = depth[a], db = depth[b];
    if (Math.abs(da - db) > dEdge * Math.min(da, db)) return true;
    return nx[a] * nx[b] + ny[a] * ny[b] + nz[a] * nz[b] < cosC;
  };
  // EH[a]: between a and a + 1; EV[a]: between a and a + N
  const EH = new Uint8Array(n), EV = new Uint8Array(n);
  const U = makeSets(n);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = j * N + i;
    if (name[a] < 0) continue;
    if (i + 1 < N && name[a + 1] >= 0) {
      if (edgeBetween(a, a + 1)) EH[a] = 1; else U.join(a, a + 1);
    }
    if (j + 1 < N && name[a + N] >= 0) {
      if (edgeBetween(a, a + N)) EV[a] = 1; else U.join(a, a + N);
    }
  }
  // regions, and what each is like on the whole
  const reg = new Int32Array(n).fill(-1);
  const idOf = new Int32Array(n).fill(-1);
  let R = 0;
  const sumT = [], cnt = [], snx = [], sny = [], rname = [], mir = [];
  for (let a = 0; a < n; a++) {
    if (name[a] < 0) continue;
    const r = U.find(a);
    let id = idOf[r];
    if (id < 0) {
      id = idOf[r] = R++;
      sumT.push(0); cnt.push(0); snx.push(0); sny.push(0); rname.push(name[a]);
      mir.push(B.buf.bounce[a] > 0 && kind[a] !== 4 ? 1 : 0);
    }
    reg[a] = id;
    sumT[id] += T0[a]; cnt[id]++;
    if (surf(a)) { snx[id] += nx[a]; sny[id] += ny[a]; }
  }
  const flat = clamp(s.flat, 0, 100) / 100, lv = Math.round(s.levels);
  const T = new Float32Array(n);
  for (let a = 0; a < n; a++) {
    if (reg[a] < 0) continue;
    const id = reg[a];
    let t = T0[a] * (1 - flat) + sumT[id] / cnt[id] * flat;
    if (lv > 1) t = Math.round(t * (lv - 1)) / (lv - 1);
    T[a] = t;
  }
  // how far every reading is from the nearest edge, in mm — the shading keeps off them
  const ED = new Float32Array(n).fill(1e9);
  const h = cell / 2;
  for (let a = 0; a < n; a++) {
    if (EH[a]) { ED[a] = h; ED[a + 1] = h; }
    if (EV[a]) { ED[a] = h; ED[a + N] = h; }
  }
  chamfer(ED, N, cell);
  return { N, n, cell, T, T0, name, reg, R, EH, EV, ED, sumT, cnt, snx, sny, rname, mir,
    gx0: B.cx - B.R, gy0: B.cy - B.R, cx: B.cx, cy: B.cy, rad: B.R, B };
}

function chamfer(D, N, cell) {
  const d1 = cell, d2 = cell * Math.SQRT2;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = j * N + i;
    let v = D[a];
    if (i > 0 && D[a - 1] + d1 < v) v = D[a - 1] + d1;
    if (j > 0) {
      if (D[a - N] + d1 < v) v = D[a - N] + d1;
      if (i > 0 && D[a - N - 1] + d2 < v) v = D[a - N - 1] + d2;
      if (i + 1 < N && D[a - N + 1] + d2 < v) v = D[a - N + 1] + d2;
    }
    D[a] = v;
  }
  for (let j = N - 1; j >= 0; j--) for (let i = N - 1; i >= 0; i--) {
    const a = j * N + i;
    let v = D[a];
    if (i + 1 < N && D[a + 1] + d1 < v) v = D[a + 1] + d1;
    if (j + 1 < N) {
      if (D[a + N] + d1 < v) v = D[a + N] + d1;
      if (i + 1 < N && D[a + N + 1] + d2 < v) v = D[a + N + 1] + d2;
      if (i > 0 && D[a + N - 1] + d2 < v) v = D[a + N - 1] + d2;
    }
    D[a] = v;
  }
}

// The reading under a point of the paper, or −1 off the grid.
function cellAt(x, y) {
  const i = Math.floor((x - G.gx0) / G.cell), j = Math.floor((y - G.gy0) / G.cell);
  if (i < 0 || j < 0 || i >= G.N || j >= G.N) return -1;
  return j * G.N + i;
}

////////////////////////////////////////////////////////////////////////////////////////
// Symmetry
//
// The rays were cast through a disc folded into one wedge, so the readings are symmetric
// already. The lines are made for that wedge only and then turned and mirrored round the
// middle of the orb: the sheet is exactly symmetric, and a hatch meets its mirror image
// on the fold in a chevron.

function wedgeAngle() {
  const s = settings, n = Math.max(1, Math.round(s.symN));
  if (s.symmetry === 'mirror') return Math.PI;
  if (s.symmetry === 'dihedral') return Math.PI / n;
  if (s.symmetry === 'rotational') return 2 * Math.PI / n;
  return 2 * Math.PI;
}

function inWedge(x, y) {
  if (settings.symmetry === 'none') return true;
  const dx = x - ORB.cx, dy = y - ORB.cy;
  let a = Math.atan2(dx, -dy);
  if (a < 0) a += 2 * Math.PI;
  const w = wedgeAngle();
  return settings.symmetry === 'rotational' ? a < w : a <= w;
}

// The copies of the wedge, each as [cos, sin, mirrored].
function wedgeCopies() {
  const s = settings, n = Math.max(1, Math.round(s.symN)), out = [];
  if (s.symmetry === 'none') return [[1, 0, false]];
  if (s.symmetry === 'mirror') return [[1, 0, false], [1, 0, true]];
  for (let k = 0; k < n; k++) {
    const f = 2 * Math.PI * k / n;
    out.push([Math.cos(f), Math.sin(f), false]);
    if (s.symmetry === 'dihedral') out.push([Math.cos(f), Math.sin(f), true]);
  }
  return out;
}

// The edges of the wedge, as angles from straight up.
function wedgeRays() {
  const s = settings;
  if (s.symmetry === 'none') return [];
  if (s.symmetry === 'mirror') return [0, Math.PI];
  return [0, wedgeAngle()];
}

// An end that has run up to the edge of the wedge is put on it, so that it meets its own
// mirror image there.
function snapToWedge(xs, ys, k, reach) {
  for (const a of wedgeRays()) {
    const ux = Math.sin(a), uy = -Math.cos(a);
    const dx = xs[k] - ORB.cx, dy = ys[k] - ORB.cy;
    const along = dx * ux + dy * uy;
    if (along < -reach) continue;
    const off = dx * -uy + dy * ux;
    if (Math.abs(off) <= reach) {
      xs[k] = ORB.cx + ux * Math.max(0, along);
      ys[k] = ORB.cy + uy * Math.max(0, along);
      return;
    }
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// The sink
//
// The wedge's strokes are gathered first, each tagged with its pen and layer; then every
// copy of the wedge goes into the sink, clipped to that pen's own drawable box.

let SINK = null;
let PEN = 0, LAY = 0;
let AREAS = [];
let WEDGE = [];

function makeSink() {
  return { pts: [], off: [0], ink: [], lay: [] };
}

function keep(xs, ys, n) {
  if (n < 2) return;
  WEDGE.push({ xs: Float64Array.from(xs.slice(0, n)), ys: Float64Array.from(ys.slice(0, n)),
    pen: PEN, lay: LAY });
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

// Every copy of the wedge into the sink. Outlines that meet end to end across a fold are
// joined into one stroke.
function spreadWedge() {
  const copies = wedgeCopies(), cx = ORB.cx, cy = ORB.cy;
  const out = [];
  for (const w of WEDGE) {
    for (const [c, s, m] of copies) {
      const n = w.xs.length, xs = new Float64Array(n), ys = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        let dx = w.xs[i] - cx;
        const dy = w.ys[i] - cy;
        if (m) dx = -dx;
        xs[i] = cx + dx * c - dy * s;
        ys[i] = cy + dy * c + dx * s;
      }
      out.push({ xs, ys, pen: w.pen, lay: w.lay });
    }
  }
  const joined = joinEnds(out.filter(o => o.lay === L_LINES), 0.02)
    .concat(out.filter(o => o.lay !== L_LINES));
  for (const o of joined) {
    PEN = o.pen; LAY = o.lay;
    emit(o.xs, o.ys, o.xs.length);
  }
}

// Polylines whose ends meet are run into one. Each end is looked up in a grid of buckets.
function joinEnds(list, tol) {
  if (list.length < 2) return list;
  const key = (x, y) => `${Math.round(x / tol)},${Math.round(y / tol)}`;
  const ends = new Map();
  const add = (k, v) => { const a = ends.get(k); if (a) a.push(v); else ends.set(k, [v]); };
  list.forEach((o, i) => {
    const n = o.xs.length;
    add(key(o.xs[0], o.ys[0]), i * 2);
    add(key(o.xs[n - 1], o.ys[n - 1]), i * 2 + 1);
  });
  const used = new Uint8Array(list.length), out = [];
  const partner = (pen, x, y) => {
    const a = ends.get(key(x, y));
    if (!a) return -1;
    for (const f of a) if (!used[f >> 1] && list[f >> 1].pen === pen) return f;
    return -1;
  };
  for (let i = 0; i < list.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    let xs = Array.from(list[i].xs), ys = Array.from(list[i].ys);
    for (let side = 0; side < 2; side++) {
      for (;;) {
        const n = xs.length;
        const f = partner(list[i].pen, xs[n - 1], ys[n - 1]);
        if (f < 0) break;
        const o = list[f >> 1];
        used[f >> 1] = 1;
        const ox = Array.from(o.xs), oy = Array.from(o.ys);
        if (f & 1) { ox.reverse(); oy.reverse(); }
        xs = xs.concat(ox.slice(1)); ys = ys.concat(oy.slice(1));
      }
      xs.reverse(); ys.reverse();
    }
    out.push({ xs: Float64Array.from(xs), ys: Float64Array.from(ys), pen: list[i].pen, lay: list[i].lay });
  }
  return out;
}

////////////////////////////////////////////////////////////////////////////////////////
// Outlines
//
// The edges run along the sides of the readings, a staircase. They are linked into
// chains between the points where three or more meet, smoothed — the staircase becomes
// the curve it stands for, the ends held — and straightened where that changes nothing.

let KEEP = new Uint8Array(4096), STACK = new Int32Array(512);

function simplify(xs, ys, n, tol) {
  if (n < 3) return n;
  if (KEEP.length < n) KEEP = new Uint8Array(n * 2);
  KEEP.fill(0, 0, n);
  KEEP[0] = KEEP[n - 1] = 1;
  const tol2 = tol * tol;
  let sp = 0;
  STACK[sp++] = 0; STACK[sp++] = n - 1;
  while (sp) {
    const b = STACK[--sp], a = STACK[--sp];
    if (b - a < 2) continue;
    const ax = xs[a], ay = ys[a], dx = xs[b] - ax, dy = ys[b] - ay, dd = dx * dx + dy * dy;
    let worst = -1, wd = tol2;
    for (let i = a + 1; i < b; i++) {
      const qx = xs[i] - ax, qy = ys[i] - ay;
      let d;
      if (dd < 1e-18) d = qx * qx + qy * qy;
      else {
        const t = clamp((qx * dx + qy * dy) / dd, 0, 1), ex = qx - t * dx, ey = qy - t * dy;
        d = ex * ex + ey * ey;
      }
      if (d > wd) { wd = d; worst = i; }
    }
    if (worst < 0) continue;
    KEEP[worst] = 1;
    if (sp + 4 > STACK.length) { const g = new Int32Array(STACK.length * 2); g.set(STACK); STACK = g; }
    STACK[sp++] = a; STACK[sp++] = worst;
    STACK[sp++] = worst; STACK[sp++] = b;
  }
  let k = 0;
  for (let i = 0; i < n; i++) if (KEEP[i]) { xs[k] = xs[i]; ys[k] = ys[i]; k++; }
  return k;
}

function smoothChain(xs, ys, closed, times) {
  const n = xs.length;
  if (n < 3) return;
  const tx = new Float64Array(n), ty = new Float64Array(n);
  for (let it = 0; it < times; it++) {
    for (let i = 0; i < n; i++) {
      if (!closed && (i === 0 || i === n - 1)) { tx[i] = xs[i]; ty[i] = ys[i]; continue; }
      const a = closed ? (i - 1 + n) % n : i - 1, b = closed ? (i + 1) % n : i + 1;
      tx[i] = (xs[a] + 2 * xs[i] + xs[b]) / 4;
      ty[i] = (ys[a] + 2 * ys[i] + ys[b]) / 4;
    }
    for (let i = 0; i < n; i++) { xs[i] = tx[i]; ys[i] = ty[i]; }
  }
}

function polyLength(xs, ys, n) {
  let L = 0;
  for (let i = 1; i < n; i++) L += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
  return L;
}

function outlines() {
  const s = settings;
  if (!s.outlines) return;
  PEN = penIdx(s.linePen); LAY = L_LINES;
  const { N, EH, EV, gx0, gy0, cell } = G;
  const M = N + 1;
  // segments between corners of the readings
  const sa = [], sb = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = j * N + i;
    if (EH[a]) {
      const x = gx0 + (i + 1) * cell, y = gy0 + (j + 0.5) * cell;
      if (inWedge(x, y)) { sa.push(j * M + i + 1); sb.push((j + 1) * M + i + 1); }
    }
    if (EV[a]) {
      const x = gx0 + (i + 0.5) * cell, y = gy0 + (j + 1) * cell;
      if (inWedge(x, y)) { sa.push((j + 1) * M + i); sb.push((j + 1) * M + i + 1); }
    }
  }
  const S = sa.length;
  if (!S) return;
  const deg = new Uint8Array(M * M), adj = new Int32Array(M * M * 4).fill(-1);
  for (let e = 0; e < S; e++) {
    for (const v of [sa[e], sb[e]]) { adj[v * 4 + deg[v]] = e; deg[v]++; }
  }
  const used = new Uint8Array(S);
  const nx = v => gx0 + (v % M) * cell, ny = v => gy0 + Math.floor(v / M) * cell;
  const walk = (v0, e0) => {
    const xs = [nx(v0)], ys = [ny(v0)];
    let v = v0, e = e0;
    for (;;) {
      used[e] = 1;
      v = sa[e] === v ? sb[e] : sa[e];
      xs.push(nx(v)); ys.push(ny(v));
      if (deg[v] !== 2) break;
      let next = -1;
      for (let k = 0; k < 2; k++) { const f = adj[v * 4 + k]; if (!used[f]) next = f; }
      if (next < 0) break;
      e = next;
    }
    return { xs, ys, closed: v === v0 && deg[v] === 2, v0, v1: v };
  };
  const chains = [];
  for (let v = 0; v < M * M; v++) {
    if (!deg[v] || deg[v] === 2) continue;
    for (let k = 0; k < deg[v]; k++) {
      const e = adj[v * 4 + k];
      if (!used[e]) chains.push(walk(v, e));
    }
  }
  for (let e = 0; e < S; e++) if (!used[e]) chains.push(walk(sa[e], e));

  const reach = cell * 1.6, times = Math.round(s.smooth);
  for (const c of chains) {
    let { xs, ys } = c;
    if (c.closed) { xs.pop(); ys.pop(); }
    smoothChain(xs, ys, c.closed, times);
    if (c.closed) { xs.push(xs[0]); ys.push(ys[0]); }
    let n = xs.length;
    // a short piece is dropped only when it dangles — between two junctions it is part of
    // a longer outline
    const free = c.closed || deg[c.v0] === 1 || deg[c.v1] === 1;
    if (free && polyLength(xs, ys, n) < s.minLine) continue;
    if (!c.closed) { snapToWedge(xs, ys, 0, reach); snapToWedge(xs, ys, n - 1, reach); }
    n = simplify(xs, ys, n, SIMPLIFY);
    keep(xs, ys, n);
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Shading
//
// Every region gets one pattern — the same one for every region of one name, so that
// what is mirrored is shaded alike — and the pattern is the region's tone in the pen:
// dots on a grid lit up in the order of a dither matrix, lines a line at a time in that
// same kind of order, crossed lines that come in over the darker half, or lines that
// follow the surface. A margin of paper is left along every outline.

const BAYER8 = (() => {
  const m = [[0, 2], [3, 1]];
  let b = m;
  for (let s = 2; s < 8; s *= 2) {
    const n = [];
    for (let i = 0; i < 2 * s; i++) {
      n.push([]);
      for (let j = 0; j < 2 * s; j++) n[i].push(4 * b[i % s][j % s] + m[(i / s) | 0][(j / s) | 0]);
    }
    b = n;
  }
  return b.map(r => r.map(v => (v + 0.5) / 64));
})();

const ORDER8 = [0, 4, 2, 6, 1, 5, 3, 7];
function lineRank(k) { return (ORDER8[((k % 8) + 8) % 8] + 0.5) / 8; }

function regionPattern(r) {
  const s = settings;
  if (s.pattern !== 'mixed') return s.pattern;
  const pool = FILLS.filter(f => s['mix' + f[0].toUpperCase() + f.slice(1)]);
  if (!pool.length) return 'none';
  return pool[Math.floor(hash01(G.rname[r], 17, 3) * pool.length)];
}

function regionAngle(r) {
  const s = settings, base = s.hatchAngle;
  if (s.hatchBy === 'fixed') return base;
  if (s.hatchBy === 'per region') return wrapDeg(base + 45 * Math.floor(hash01(G.rname[r], 5, 11) * 4));
  // across the way the surface faces, in steps of 15°
  const x = G.snx[r], y = -G.sny[r];
  if (Math.hypot(x, y) < 1e-6 * G.cnt[r]) return base;
  return wrapDeg(Math.round(Math.atan2(y, x) * 180 / Math.PI / 15) * 15 + 90);
}

function shadePen(r) {
  const s = settings;
  return s.mirrorOwnPen && G.mir[r] ? [penIdx(s.mirrorPen), L_MIRROR] : [penIdx(s.fillPen), L_FILL];
}

// Is the point one the shading may touch — inside the orb, the wedge, and off the lines?
function shadeable(x, y, a, gap) {
  if (a < 0 || G.reg[a] < 0) return false;
  const dx = x - ORB.cx, dy = y - ORB.cy, R = ORB.R - gap;
  if (dx * dx + dy * dy > R * R) return false;
  if (G.ED[a] < gap) return false;
  return inWedge(x, y);
}

function shading() {
  const s = settings, R = G.R;
  const pat = new Array(R), ang = new Float64Array(R), solid = new Uint8Array(R);
  const solidAt = s.solidAt / 100;
  for (let r = 0; r < R; r++) {
    pat[r] = regionPattern(r);
    ang[r] = regionAngle(r);
  }
  COUNTS.patterns = {};
  for (let r = 0; r < R; r++) COUNTS.patterns[pat[r]] = (COUNTS.patterns[pat[r]] || 0) + 1;
  const gap = Math.max(0, s.edgeGap), low = s.lightest / 100;
  const isSolid = a => solidAt < 1 && G.T[a] >= solidAt;

  // hatching and cross-hatching: one family of lines per angle in use
  // every region of hatching belongs to one family of lines, crossed ones to a second
  // family too; a family is an angle and whether it is the crossing
  const fams = [], famIdx = new Map();
  const famA = new Int32Array(R).fill(-1), famB = new Int32Array(R).fill(-1);
  const famOf = (deg, role) => {
    const k = deg + '|' + role;
    if (!famIdx.has(k)) { famIdx.set(k, fams.length); fams.push([deg, role]); }
    return famIdx.get(k);
  };
  for (let r = 0; r < R; r++) {
    if (pat[r] !== 'hatch' && pat[r] !== 'cross') continue;
    const d = Math.round(ang[r] * 10) / 10;
    famA[r] = famOf(d, 0);
    if (pat[r] === 'cross') famB[r] = famOf(d, 1);
  }
  const pitch = Math.max(0.1, s.hatchPitch), step = G.cell / 2;
  fams.forEach(([deg, role], f) => {
    const own = role ? famB : famA;
    const th = rad(role ? deg + 90 : deg);
    const ux = Math.cos(th), uy = Math.sin(th), vx = -uy, vy = ux;
    const K = Math.ceil(ORB.R / pitch);
    for (let k = -K; k <= K; k++) {
      const ox = ORB.cx + vx * k * pitch, oy = ORB.cy + vy * k * pitch;
      const rk = lineRank(k);
      let run = null;
      const flush = () => {
        if (run && Math.hypot(run[2] - run[0], run[3] - run[1]) >= MIN_DASH) {
          [PEN, LAY] = shadePen(run[4]);
          keep([run[0], run[2]], [run[1], run[3]], 2);
        }
        run = null;
      };
      for (let t = -ORB.R; t <= ORB.R; t += step) {
        const x = ox + ux * t, y = oy + uy * t, a = cellAt(x, y);
        const r = a < 0 ? -1 : G.reg[a];
        let on = r >= 0 && own[r] === f;
        if (on) {
          const want = pat[r] === 'cross' ? (role ? 0.5 + rk * 0.5 : rk * 0.5) : rk;
          // a line once begun runs on through a little lighter tone, so a ripple of the
          // tone does not break it into dashes
          on = G.T[a] >= low && G.T[a] > want - (run && run[4] === r ? HYSTERESIS : 0) &&
            !isSolid(a) && shadeable(x, y, a, gap);
        }
        if (on && run && run[4] !== r && shadePen(run[4])[0] !== shadePen(r)[0]) flush();
        if (on) {
          if (!run) run = [x, y, x, y, r];
          else { run[2] = x; run[3] = y; }
        } else flush();
      }
      flush();
    }
  });

  // dots on a turned grid
  {
    const p = Math.max(0.2, s.dotPitch), th = rad(s.dotAngle);
    const ux = Math.cos(th), uy = Math.sin(th), vx = -uy, vy = ux;
    const K = Math.ceil(ORB.R / p) + 1;
    let n = 0;
    for (let j = -K; j <= K; j++) for (let i = -K; i <= K; i++) {
      const x = ORB.cx + (ux * i + vx * j) * p, y = ORB.cy + (uy * i + vy * j) * p;
      const a = cellAt(x, y);
      if (!shadeable(x, y, a, gap) || isSolid(a)) continue;
      const r = G.reg[a];
      if (pat[r] !== 'dots') continue;
      const t = G.T[a];
      if (t < low) continue;
      const want = s.dotOrder === 'bayer' ? BAYER8[i & 7][j & 7]
                 : s.dotOrder === 'rows' ? lineRank(j) * 0.5 + lineRank(i) * 0.5 / 8
                 : hash01(i, j, 29);
      if (t <= want) continue;
      [PEN, LAY] = shadePen(r);
      keep([x, x + EPS], [y, y], 2);
      n++;
    }
    COUNTS.dots = n;
  }

  // lines that follow the surface: level lines of a field read off the hits
  if (pat.includes('flow')) flowLines(pat, gap, low, isSolid);
  if (solidAt < 1) solids(isSolid);
}

function flowField() {
  const s = settings, B = G.B, n = G.n, F = new Float32Array(n);
  const { kind, depth, px, py, pz, trap, nx, ny, nz } = B.buf;
  const ly = rad(s.lightYaw), lp = rad(s.lightPitch);
  const Lx = Math.sin(ly) * Math.cos(lp), Ly = Math.sin(lp), Lz = -Math.cos(ly) * Math.cos(lp);
  for (let i = 0; i < n; i++) {
    if (!kind[i]) continue;
    switch (s.flowField) {
      case 'depth':  F[i] = Math.log(depth[i] + 1e-3); break;
      case 'height': F[i] = py[i]; break;
      case 'radius': F[i] = Math.hypot(px[i], py[i], pz[i]); break;
      case 'trap':   F[i] = trap[i]; break;
      default:       F[i] = nx[i] * Lx + ny[i] * Ly + nz[i] * Lz;
    }
  }
  const surf = i => kind[i] === 2 || kind[i] === 3;
  const lo = quantile(F, surf, 0.01), hi = quantile(F, surf, 0.99);
  const k = hi > lo ? 1 / (hi - lo) : 1;
  for (let i = 0; i < n; i++) F[i] = (F[i] - lo) * k;
  return F;
}

// Marching squares over the readings' centres: every cell whose four corners lie in one
// region of the right kind gives its piece of each level line through it.
function flowLines(pat, gap, low, isSolid) {
  const s = settings, { N, gx0, gy0, cell, reg } = G;
  const F = flowField(), L = Math.max(2, Math.round(s.flowLines));
  const segs = [];
  const px = (i, j) => gx0 + (i + 0.5) * cell, py = (i, j) => gy0 + (j + 0.5) * cell;
  for (let j = 0; j + 1 < N; j++) for (let i = 0; i + 1 < N; i++) {
    const a = j * N + i, b = a + 1, c = a + N, d = a + N + 1;
    const r = reg[a];
    if (r < 0 || reg[b] !== r || reg[c] !== r || reg[d] !== r || pat[r] !== 'flow') continue;
    const x = px(i, j) + cell / 2, y = py(i, j) + cell / 2;
    if (!shadeable(x, y, a, gap) || isSolid(a)) continue;
    if (Math.min(G.ED[a], G.ED[b], G.ED[c], G.ED[d]) < gap) continue;
    const t = (G.T[a] + G.T[b] + G.T[c] + G.T[d]) / 4;
    if (t < low) continue;
    const fa = F[a], fb = F[b], fc = F[c], fd = F[d];
    const mn = Math.min(fa, fb, fc, fd) * L - 0.5, mx = Math.max(fa, fb, fc, fd) * L - 0.5;
    for (let k = Math.ceil(mn); k <= mx; k++) {
      if (t <= lineRank(k)) continue;
      const lv = (k + 0.5) / L;
      // the cell's edges: top a–b, right b–d, bottom c–d, left a–c; ids on the grid
      const pts = [];
      const cross = (f0, f1, x0, y0, x1, y1, id) => {
        if ((f0 < lv) === (f1 < lv)) return;
        const u = (lv - f0) / (f1 - f0);
        pts.push([x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, id]);
      };
      const X0 = px(i, j), Y0 = py(i, j), X1 = X0 + cell, Y1 = Y0 + cell;
      cross(fa, fb, X0, Y0, X1, Y0, a * 2);
      cross(fb, fd, X1, Y0, X1, Y1, b * 2 + 1);
      cross(fc, fd, X0, Y1, X1, Y1, c * 2);
      cross(fa, fc, X0, Y0, X0, Y1, a * 2 + 1);
      if (pts.length === 2) segs.push([pts[0], pts[1], k, r]);
      else if (pts.length === 4) { segs.push([pts[0], pts[1], k, r]); segs.push([pts[2], pts[3], k, r]); }
    }
  }
  for (const c of chainSegs(segs)) {
    if (polyLength(c.xs, c.ys, c.xs.length) < MIN_FLOW) continue;
    [PEN, LAY] = shadePen(segs[c.first][3]);
    const n = simplify(c.xs, c.ys, c.xs.length, 0.02);
    keep(c.xs, c.ys, n);
  }
}

// Pieces of level lines, each [end, end, level, …] with every end [x, y, the grid edge it
// lies on], linked into polylines through the edges they share.
function chainSegs(segs) {
  const at = new Map();
  const put = (id, k, si) => {
    const key = id * 4096 + (k & 4095);
    const v = at.get(key);
    if (v === undefined) at.set(key, [si]); else v.push(si);
  };
  segs.forEach((sg, si) => { put(sg[0][2], sg[2], si); put(sg[1][2], sg[2], si); });
  const used = new Uint8Array(segs.length), out = [];
  for (let si = 0; si < segs.length; si++) {
    if (used[si]) continue;
    used[si] = 1;
    const k = segs[si][2];
    const xs = [segs[si][0][0], segs[si][1][0]], ys = [segs[si][0][1], segs[si][1][1]];
    let ends = [segs[si][0][2], segs[si][1][2]];
    for (let side = 0; side < 2; side++) {
      for (;;) {
        const v = at.get(ends[1] * 4096 + (k & 4095));
        let nxt = -1;
        if (v) for (const o of v) if (!used[o]) { nxt = o; break; }
        if (nxt < 0) break;
        used[nxt] = 1;
        const sg = segs[nxt], fwd = sg[0][2] === ends[1];
        const far = fwd ? sg[1] : sg[0];
        xs.push(far[0]); ys.push(far[1]);
        ends = [ends[0], far[2]];
      }
      xs.reverse(); ys.reverse(); ends = [ends[1], ends[0]];
    }
    out.push({ xs, ys, first: si });
  }
  return out;
}

// The darkest regions filled solid: the dark drawn in from half a nib inside its edge, an
// outline round it and passes across it, each pass this far from the last.
function solids(isSolid) {
  const s = settings, { N, n, cell, gx0, gy0 } = G;
  const pen = penIdx(s.solidPen), nib = penW(pen);
  PEN = pen; LAY = L_SOLID;
  const D = new Float32Array(n).fill(1e9);
  let any = false;
  // the dark ends at the rim of the orb as well as at its own edge
  const rim = (ORB.R - nib / 2) * (ORB.R - nib / 2);
  const off = b => {
    const x = gx0 + (b % N + 0.5) * cell - ORB.cx, y = gy0 + (Math.floor(b / N) + 0.5) * cell - ORB.cy;
    return G.reg[b] < 0 || !isSolid(b) || x * x + y * y > rim;
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = j * N + i;
    if (off(a)) { D[a] = 0; continue; }
    any = true;
    const out = off;
    if (i === 0 || j === 0 || i === N - 1 || j === N - 1 || out(a - 1) || out(a + 1) ||
        out(a - N) || out(a + N)) D[a] = cell / 2;
  }
  if (!any) return;
  chamfer(D, N, cell);
  const half = nib / 2, step = cell / 2;
  const inside = (x, y) => {
    const a = cellAt(x, y);
    if (a < 0 || D[a] < half) return false;
    const dx = x - ORB.cx, dy = y - ORB.cy;
    return dx * dx + dy * dy <= (ORB.R - half) * (ORB.R - half) && inWedge(x, y);
  };
  // passes
  const gapP = Math.max(0.05, s.solidPasses / 100 * nib), th = rad(s.hatchAngle);
  const ux = Math.cos(th), uy = Math.sin(th), vx = -uy, vy = ux;
  const K = Math.ceil(ORB.R / gapP);
  for (let k = -K; k <= K; k++) {
    const ox = ORB.cx + vx * k * gapP, oy = ORB.cy + vy * k * gapP;
    let run = null;
    for (let t = -ORB.R; t <= ORB.R + step; t += step) {
      const x = ox + ux * t, y = oy + uy * t;
      if (inside(x, y)) {
        if (!run) run = [x, y, x, y]; else { run[2] = x; run[3] = y; }
      } else if (run) {
        keep([run[0], run[2]], [run[1], run[3]], 2);
        run = null;
      }
    }
  }
  // the outline: the level of half a nib in the distance inside the dark
  const segs = [];
  const px = i => gx0 + (i + 0.5) * cell, py = j => gy0 + (j + 0.5) * cell;
  for (let j = 0; j + 1 < N; j++) for (let i = 0; i + 1 < N; i++) {
    const a = j * N + i, b = a + 1, c = a + N, d = a + N + 1;
    const fa = D[a] - half, fb = D[b] - half, fc = D[c] - half, fd = D[d] - half;
    if ((fa < 0) === (fb < 0) && (fa < 0) === (fc < 0) && (fa < 0) === (fd < 0)) continue;
    const pts = [];
    const cr = (f0, f1, x0, y0, x1, y1, id) => {
      if ((f0 < 0) === (f1 < 0)) return;
      const u = f0 / (f0 - f1);
      pts.push([x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, id]);
    };
    const X0 = px(i), Y0 = py(j), X1 = X0 + cell, Y1 = Y0 + cell;
    cr(fa, fb, X0, Y0, X1, Y0, a * 2);
    cr(fb, fd, X1, Y0, X1, Y1, b * 2 + 1);
    cr(fc, fd, X0, Y1, X1, Y1, c * 2);
    cr(fa, fc, X0, Y0, X0, Y1, a * 2 + 1);
    const mx = (X0 + X1) / 2 - ORB.cx, my = (Y0 + Y1) / 2 - ORB.cy;
    if (pts.length >= 2 && mx * mx + my * my <= ORB.R * ORB.R && inWedge(mx + ORB.cx, my + ORB.cy)) {
      segs.push([pts[0], pts[1], 0]);
      if (pts.length === 4) segs.push([pts[2], pts[3], 0]);
    }
  }
  for (const c of chainSegs(segs)) {
    const n = simplify(c.xs, c.ys, c.xs.length, 0.02);
    keep(c.xs, c.ys, n);
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// The ring and the cut guides

function ringLines() {
  const s = settings;
  if (s.ring === 'none') return;
  PEN = penIdx(s.ringPen); LAY = L_RING;
  const circle = (R, a0, a1) => {
    const n = Math.max(8, Math.ceil(R * Math.abs(a1 - a0) / 0.6));
    const xs = [], ys = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n;
      xs.push(ORB.cx + R * Math.sin(a)); ys.push(ORB.cy - R * Math.cos(a));
    }
    emit(xs, ys, xs.length);
  };
  const R = ORB.R, gap = Math.max(0.3, s.ringGap);
  if (s.ring !== 'broken') circle(R, 0, 2 * Math.PI);
  if (s.ring === 'double') circle(R + gap, 0, 2 * Math.PI);
  if (s.ring === 'halo' || s.ring === 'broken') {
    // dashes of every length round a part of the ring, as if it had been worn away
    const rnd = rng(41), Rh = s.ring === 'halo' ? R + gap : R;
    const span = s.ring === 'halo' ? Math.PI * (0.5 + rnd() * 0.6) : 2 * Math.PI;
    const start = s.ring === 'halo' ? -span / 2 + (rnd() - 0.5) * 0.8 : 0;
    let a = start;
    while (a < start + span) {
      const len = (0.4 + Math.pow(rnd(), 2) * 9) / Rh;
      const b = Math.min(start + span, a + len);
      const fade = s.ring === 'halo' ? Math.sin(Math.PI * (a - start) / span) : 1;
      if (rnd() < 0.35 + 0.6 * fade) circle(Rh, a, b);
      a = b + (0.6 + rnd() * 2.5 * (1.2 - fade)) / Rh;
    }
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

// A dot is one touch of the pen, and no pen's box clips it: it stands on the very edge.
// It goes with the first pen in use, so it is plotted once.
function cropMarkDots() {
  if (!settings.cropMarks) return;
  const [W] = paperDims();
  let first = penIdx(settings.linePen);
  for (const i of penOrder()) if (SINK.ink.includes(i)) { first = i; break; }
  PEN = first; LAY = L_GUIDES;
  for (const [x, y] of cropMarkPlaces()) pushPoly([x, x + (x > W / 2 ? -EPS : EPS)], [y, y], 2);
}

function buildShapes() {
  if (area.w < 2 || area.h < 2) return null;
  SINK = makeSink();
  AREAS = [];
  for (let i = 0; i < SLOTS; i++) AREAS.push(penArea(i));
  COUNTS = { regions: 0, dots: 0, patterns: {} };
  G = buildGrid(BUF);
  COUNTS.regions = G.R;
  WEDGE = [];
  outlines();
  shading();
  spreadWedge();
  ringLines();
  cropMarkDots();
  RENDER_IMG = null;

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
// with a uniform bucket grid so the search stays local; one pen at a time.

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
    if (settings.optimiseOrder) {
      const g = greedy(sh, list, 0, 0);
      for (let t = 0; t < g.order.length; t++) { order[at] = g.order[t]; flip[at++] = g.flip[t]; }
    } else {
      for (const i of list) { order[at] = i; flip[at++] = 0; }
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
  if (guides && settings.showRender && G) drawRender(ctx, s);
  if (shapes && plan) {
    if (guides && JOB && !JOB.coarse) ctx.globalAlpha = 0.35;
    drawStrokes(ctx, s);
    ctx.globalAlpha = 1;
  }
  if (guides && (settings.showGuides || drag)) {
    ctx.save();
    ctx.scale(s, s);
    drawGuides(ctx);
    ctx.restore();
  }
}

// The tones the shading is made from, faint under the strokes. Never plotted.
function drawRender(ctx, s) {
  if (!RENDER_IMG) {
    const N = G.N, c = document.createElement('canvas');
    c.width = c.height = N;
    const cx = c.getContext('2d'), im = cx.createImageData(N, N);
    for (let a = 0; a < N * N; a++) {
      if (G.reg[a] < 0) continue;
      const v = Math.round(255 * (1 - G.T[a] * 0.45));
      im.data[a * 4] = im.data[a * 4 + 1] = im.data[a * 4 + 2] = v;
      im.data[a * 4 + 3] = 255;
    }
    cx.putImageData(im, 0, 0);
    RENDER_IMG = c;
  }
  ctx.save();
  ctx.scale(s, s);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(RENDER_IMG, G.gx0, G.gy0, G.N * G.cell, G.N * G.cell);
  ctx.restore();
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

// The margin, the orb, the wedge and the cut guides. Never plotted.
function drawGuides(ctx) {
  if (!area || !ORB) return;
  const s = settings, dark = luma(s.paperColor) < 0.25;
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = dark ? 'rgba(110, 200, 255, 0.85)' : 'rgba(26, 109, 209, 0.8)';
  ctx.lineWidth = 0.3;
  ctx.setLineDash([1.5, 1.5]);
  ctx.strokeRect(area.x0, area.y0, area.w, area.h);
  ctx.beginPath();
  ctx.arc(ORB.cx, ORB.cy, ORB.R, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const a of wedgeRays()) {
    ctx.beginPath();
    ctx.moveTo(ORB.cx, ORB.cy);
    ctx.lineTo(ORB.cx + ORB.R * Math.sin(a), ORB.cy - ORB.R * Math.cos(a));
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
// Dragging the sheet turns the fractal; shift-drag turns it through the fourth dimension;
// alt-drag (or the right button) turns the eye. The wheel moves the eye in and out. While
// the hand is moving the rays are cast sparser, to keep up with it.

function attachPointer() {
  const c = canvasEl();
  c.addEventListener('contextmenu', e => e.preventDefault());
  c.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.button !== 2) return;
    const s = settings;
    drag = {
      mode: e.altKey || e.button === 2 ? 'eye' : e.shiftKey ? 'four' : 'turn',
      x: e.clientX, y: e.clientY, moved: false,
      yaw: s.yaw, pitch: s.pitch, xw: s.xw, yw: s.yw, cy: s.camYaw, cp: s.camPitch,
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
    const k = DRAG_DEG_PX;
    if (drag.mode === 'turn') {
      s.yaw = +wrapDeg(drag.yaw - dx * k).toFixed(1);
      s.pitch = +wrapDeg(drag.pitch - dy * k).toFixed(1);
    } else if (drag.mode === 'four') {
      s.xw = +wrapDeg(drag.xw + dx * k).toFixed(1);
      s.yw = +wrapDeg(drag.yw + dy * k).toFixed(1);
    } else {
      s.camYaw = +wrapDeg(drag.cy + dx * k).toFixed(1);
      s.camPitch = +clamp(drag.cp + dy * k, -180, 180).toFixed(1);
    }
    for (const key of ['yaw', 'pitch', 'xw', 'yw', 'camYaw', 'camPitch']) if (setters[key]) setters[key](s[key]);
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
    s.camDist = +clamp(s.camDist * Math.exp(delta * 0.001), 0, 12).toFixed(3);
    if (setters.camDist) setters.camDist(s.camDist);
    settle();
  }, { passive: false });
}

let settleTimer = null;

function settle() {
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => { settleTimer = null; update(); }, 200);
}

// A new fractal of the same kind: its twists, offsets and turns rolled.
function rollObject() {
  const s = settings, r = Math.random;
  const pick = (lo, hi, d) => +(lo + r() * (hi - lo)).toFixed(d);
  s.yaw = pick(-180, 180, 0); s.pitch = pick(-90, 90, 0); s.roll = pick(-30, 30, 0);
  s.twistA = pick(-40, 40, 0); s.twistB = pick(-30, 30, 0);
  s.twistC = r() < 0.5 ? 0 : pick(-30, 30, 0); s.twistD = r() < 0.6 ? 0 : pick(-20, 20, 0);
  s.xw = pick(-60, 60, 0); s.yw = pick(-60, 60, 0); s.zw = r() < 0.5 ? 0 : pick(-45, 45, 0);
  switch (s.object) {
    case 'kifs':
      s.offX = pick(0.6, 1.3, 2); s.offY = pick(0.4, 1.3, 2); s.offZ = pick(0.4, 1.3, 2);
      s.kScale = s.folds === 'cube' ? pick(2.4, 3.2, 2) : pick(1.7, 2.4, 2);
      break;
    case 'hyperfold':
      s.offX = pick(0.6, 1.3, 2); s.offY = pick(0.4, 1.3, 2); s.offZ = pick(0.2, 1.2, 2);
      s.offW = pick(0, 1.2, 2); s.kScale = pick(1.8, 2.8, 2); s.wSlice = pick(-0.6, 0.6, 2);
      break;
    case 'mandelbox':
      s.mbScale = r() < 0.5 ? pick(-2.6, -1.4, 2) : pick(1.8, 2.8, 2); s.mbMinR = pick(0.2, 0.7, 2);
      break;
    case 'julia': {
      const a = r() * 2 * Math.PI, b = r() * Math.PI, m = pick(0.45, 0.85, 2);
      s.jc0 = +(m * Math.cos(a)).toFixed(3); s.jc1 = +(m * Math.sin(a) * Math.cos(b)).toFixed(3);
      s.jc2 = +(m * Math.sin(a) * Math.sin(b) * 0.7).toFixed(3); s.jc3 = pick(-0.2, 0.2, 3);
      s.wSlice = pick(-0.4, 0.4, 2);
      break;
    }
    case 'polytope': s.polytope = POLYTOPES[Math.floor(r() * POLYTOPES.length)]; break;
    case 'hopf':
      s.windA = 1 + Math.floor(r() * 2); s.windB = 1 + Math.floor(r() * 3);
      s.fibres = 6 + Math.floor(r() * 14); s.windStep = Math.floor(r() * 2);
      break;
  }
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
    const turn = (k, d) => { s[k] = +wrapDeg(s[k] + d).toFixed(1); refreshControls(); update(); };
    const step = e.shiftKey ? 15 : 5;
    switch (e.key) {
      case 'r': case 'R': rollObject(); break;
      case '[': s.seed = Math.max(0, Math.round(s.seed) - 1); refreshControls(); update(); break;
      case ']': s.seed = Math.round(s.seed) + 1; refreshControls(); update(); break;
      case 'o': cycle('object', OBJECTS, 1); break;
      case 'O': cycle('object', OBJECTS, -1); break;
      case 'v': cycle('view', VIEWS, 1); break;
      case 'V': cycle('view', VIEWS, -1); break;
      case 'p': cycle('pattern', PATTERNS, 1); break;
      case 'P': cycle('pattern', PATTERNS, -1); break;
      case 'm': cycle('symmetry', SYMS, 1); break;
      case 'M': cycle('symmetry', SYMS, -1); break;
      case 'n': s.symN = clamp(Math.round(s.symN) + 1, 1, 24); refreshControls(); update(); break;
      case 'N': s.symN = clamp(Math.round(s.symN) - 1, 1, 24); refreshControls(); update(); break;
      case 's': case 'S': {
        const k = (SCENES.findIndex(sc => sc.label === lastScene) + (e.key === 'S' ? -1 : 1) +
                   SCENES.length) % SCENES.length || (e.key === 'S' ? SCENES.length - 1 : 1);
        applyScene(SCENES[k]);
        break;
      }
      case 'ArrowLeft':  turn('yaw', step); break;
      case 'ArrowRight': turn('yaw', -step); break;
      case 'ArrowUp':    turn('pitch', step); break;
      case 'ArrowDown':  turn('pitch', -step); break;
      case 'x': case 'X': s.cropMarks = !s.cropMarks; refreshControls(); update(); break;
      case 'g': case 'G': s.showGuides = !s.showGuides; refreshControls(); drawPreview(); syncUrl(); break;
      case 'h': case 'H': s.showRender = !s.showRender; refreshControls(); drawPreview(); syncUrl(); break;
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
  const show = (keys, on) => { for (const k of keys) setVisible(k, on); };
  setVisible('orientation', s.paper !== 'custom');
  show(['customW', 'customH'], s.paper === 'custom');
  show(['cropMarkAt', 'cropMarkGap'], s.cropMarks);

  const v = s.view, o = s.object;
  setVisible('camDist', v !== 'mirror ball');
  setVisible('fov', v === 'dome' || v === 'mirror room' || (v === 'orb' && s.camDist <= 1.02));
  show(['camYaw', 'camPitch'], v !== 'mirror ball');
  setVisible('room', v === 'mirror room');
  setVisible('bounces', v !== 'orb' || s.mirrorBall > 0);
  setVisible('mirrorBall', true);

  setVisible('folds', o === 'kifs');
  show(['kScale', 'offX', 'offY', 'offZ'], o === 'kifs' || o === 'hyperfold');
  setVisible('offW', o === 'hyperfold');
  show(['twistA', 'twistB', 'twistC', 'twistD'], o === 'kifs' || o === 'hyperfold' || o === 'mandelbox');
  setVisible('twistE', o === 'kifs' || o === 'mandelbox');
  show(['coreShape', 'core'], o === 'kifs' || o === 'hyperfold');
  setVisible('iters', o === 'kifs' || o === 'hyperfold' || o === 'mandelbox' || o === 'julia');
  show(['mbScale', 'mbMinR', 'mbFold', 'mbZoom'], o === 'mandelbox');
  show(['jc0', 'jc1', 'jc2', 'jc3', 'jZoom'], o === 'julia');
  setVisible('wSlice', o === 'julia' || o === 'hyperfold');
  setVisible('hZoom', o === 'hyperfold');
  show(['polytope', 'node'], o === 'polytope');
  setVisible('tube', o === 'polytope' || o === 'hopf');
  show(['layers', 'layerGap', 'windA', 'windB', 'windStep', 'fibres'], o === 'hopf');
  show(['xw', 'yw', 'zw'], ['julia', 'hyperfold', 'polytope', 'hopf'].includes(o));
  setVisible('shell', s.enclose === 'shell');

  const p = s.pattern, mixed = p === 'mixed';
  show(['mixDots', 'mixHatch', 'mixCross', 'mixFlow'], mixed);
  const uses = f => p === f || (mixed && s['mix' + f[0].toUpperCase() + f.slice(1)]);
  show(['dotPitch', 'dotAngle', 'dotOrder'], uses('dots'));
  show(['hatchPitch', 'hatchBy'], uses('hatch') || uses('cross'));
  setVisible('hatchAngle', uses('hatch') || uses('cross') || s.solidAt < 100);
  show(['flowField', 'flowLines'], uses('flow'));
  setVisible('solidPasses', s.solidAt < 100);
  setVisible('ringGap', s.ring === 'double' || s.ring === 'halo');
  setVisible('mirrorPen', s.mirrorOwnPen);
  setVisible('solidPen', s.solidAt < 100);
  setVisible('ringPen', s.ring !== 'none');
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
  createDiv('Which pattern each region gets, which way its hatching runs, the dashes of a ' +
    'worn ring. <b>[</b> and <b>]</b> step through them; <b>R</b> rolls a new fractal instead.')
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
  addNote(sec, '<b>S</b> steps through the scenes, <b>R</b> rolls a new fractal of the same kind.');
  createButton('Roll a new fractal').parent(sec).mousePressed(rollObject);
  addSeedField(sec);
  progressDiv = createDiv('').parent(sec).class('note');
  progressDiv.style('display', 'none');

  sec = addSection(root, 'View');
  addSelect(sec, 'Seen as', 'view', VIEWS, resync,
    '<b>orb</b> — from outside, the ball filling the disc; <b>mirror ball</b> — only what a ' +
    'mirror ball in the middle reflects; <b>mirror room</b> — from inside a ball that is a mirror ' +
    'on the inside, the fractal over and over in it; <b>dome</b> — a fisheye from inside the ' +
    'fractal. <b>V</b> steps.');
  addSlider(sec, 'Eye from the middle (radii)', 'camDist', 0, 12, 0.01,
    'The wheel over the sheet moves it. In the orb, under 1 the eye is inside the ball.');
  addSlider(sec, 'Field of view (°)', 'fov', 20, 360, 1,
    'The fisheye\'s whole angle, rim to rim — 180 is a half of everything, 360 all of it.');
  addSlider(sec, 'Eye turned (°)', 'camYaw', -180, 180, 0.5, '<b>Alt</b>-drag or right-drag turns the eye.');
  addSlider(sec, 'Eye tilted (°)', 'camPitch', -180, 180, 0.5);
  addSlider(sec, 'Mirror ball (radii)', 'mirrorBall', 0, 1, 0.01,
    'A mirror ball in the middle of everything; 0 — none. In <b>mirror ball</b> it is the view.');
  addSlider(sec, 'Mirror room (radii)', 'room', 0.2, 6, 0.01);
  addSlider(sec, 'Bounces', 'bounces', 0, 6, 1, 'How many mirrors a ray may pass through.');
  addSlider(sec, 'Orb size (% of the short side)', 'orbSize', 10, 100, 1);
  addSlider(sec, 'Orb across (mm)', 'orbX', -300, 300, 0.5);
  addSlider(sec, 'Orb down (mm)', 'orbY', -300, 300, 0.5);

  sec = addSection(root, 'Fractal');
  addSelect(sec, 'Kind', 'object', OBJECTS, resync,
    '<b>kifs</b> — space folded on the mirrors of a tetrahedron or a cube, scaled and twisted ' +
    'between the folds; <b>mandelbox</b> — boxes and balls folded into architecture; ' +
    '<b>julia</b> — a quaternion Julia set, four-dimensional, cut by a hyperplane; ' +
    '<b>hyperfold</b> — the same kaleidoscope in four dimensions, cut; <b>polytope</b> — the ' +
    'edges of a regular polytope of four dimensions, projected stereographically; <b>hopf</b> — ' +
    'linked circles on nested tori of the three-sphere. <b>O</b> steps.');
  addSelect(sec, 'Mirrors', 'folds', FOLDS, update, '<b>tetra</b> — a Sierpiński kind; <b>cube</b> — a Menger kind.');
  addSlider(sec, 'Folds', 'iters', 1, 14, 1, 'Each fold is another order of detail. Few — big slabs.');
  addSlider(sec, 'Scale', 'kScale', 1.2, 4, 0.01);
  addSlider(sec, 'Corner x', 'offX', -2, 2, 0.01, 'The corner it is scaled away from.');
  addSlider(sec, 'Corner y', 'offY', -2, 2, 0.01);
  addSlider(sec, 'Corner z', 'offZ', -2, 2, 0.01);
  addSlider(sec, 'Corner w', 'offW', -2, 2, 0.01);
  addSlider(sec, 'Twist a (°)', 'twistA', -90, 90, 0.5, 'Turns inside every fold — where it stops being crystal.');
  addSlider(sec, 'Twist b (°)', 'twistB', -90, 90, 0.5);
  addSlider(sec, 'Twist c (°)', 'twistC', -90, 90, 0.5);
  addSlider(sec, 'Twist d (°)', 'twistD', -90, 90, 0.5);
  addSlider(sec, 'Twist e (°)', 'twistE', -90, 90, 0.5);
  addSelect(sec, 'Each piece is a', 'coreShape', CORES, update);
  addSlider(sec, 'Piece size', 'core', 0.2, 2.5, 0.01);
  addSlider(sec, 'Box scale', 'mbScale', -3.5, 3.5, 0.01, 'Negative — rooms; positive — towers.');
  addSlider(sec, 'Inner radius', 'mbMinR', 0.05, 1, 0.01);
  addSlider(sec, 'Fold limit', 'mbFold', 0.3, 2, 0.01);
  addSlider(sec, 'Zoom', 'mbZoom', 0.5, 10, 0.05);
  addSlider(sec, 'c — real', 'jc0', -1.5, 1.5, 0.005);
  addSlider(sec, 'c — i', 'jc1', -1.5, 1.5, 0.005);
  addSlider(sec, 'c — j', 'jc2', -1.5, 1.5, 0.005);
  addSlider(sec, 'c — k', 'jc3', -1.5, 1.5, 0.005);
  addSlider(sec, 'Zoom', 'jZoom', 0.3, 4, 0.01);
  addSlider(sec, 'Zoom', 'hZoom', 0.3, 4, 0.01);
  addSlider(sec, 'Cut at w', 'wSlice', -2, 2, 0.005, 'Where the hyperplane cuts the four-dimensional thing.');
  addSelect(sec, 'Polytope', 'polytope', POLYTOPES, update,
    '<b>tesseract</b> — the hypercube, 32 edges; <b>16-cell</b> — its dual, 24; <b>24-cell</b> — 96.');
  addSlider(sec, 'Tube (rad)', 'tube', 0.005, 0.4, 0.001, 'Measured on the three-sphere, so it swells away from the middle.');
  addSlider(sec, 'Knots (rad)', 'node', 0, 0.5, 0.001);
  addSlider(sec, 'Tori', 'layers', 1, 7, 1);
  addSlider(sec, 'Between tori (rad)', 'layerGap', 0.05, 0.7, 0.005);
  addSlider(sec, 'Winds one way', 'windA', 0, 6, 1);
  addSlider(sec, 'Winds the other', 'windB', 0, 6, 1);
  addSlider(sec, 'Each torus winds more by', 'windStep', -3, 3, 1);
  addSlider(sec, 'Circles on a torus', 'fibres', 1, 48, 1);
  addSub(sec, 'Turned');
  addSlider(sec, 'Turned (°)', 'yaw', -180, 180, 0.5, 'Drag on the sheet turns it; the arrow keys too.');
  addSlider(sec, 'Tipped (°)', 'pitch', -180, 180, 0.5);
  addSlider(sec, 'Rolled (°)', 'roll', -180, 180, 0.5);
  addSlider(sec, 'Through x–w (°)', 'xw', -180, 180, 0.5,
    'A turn the eye cannot make — through the fourth dimension. <b>Shift</b>-drag turns it.');
  addSlider(sec, 'Through y–w (°)', 'yw', -180, 180, 0.5);
  addSlider(sec, 'Through z–w (°)', 'zw', -180, 180, 0.5);
  addSub(sec, 'In the ball');
  addSlider(sec, 'Size (radii)', 'objSize', 0.05, 5, 0.005);
  addSelect(sec, 'The ball', 'enclose', ENCLOSES, resync,
    '<b>none</b> — the fractal on its own; <b>inside</b> — cut to the ball, flat caps where it was ' +
    'cut; <b>carved</b> — the ball with the fractal taken out of it; <b>shell</b> — a rind of it.');
  addSlider(sec, 'Rind (radii)', 'shell', 0.01, 0.6, 0.005);
  addSlider(sec, 'Hollow at the heart (radii)', 'hollow', 0, 1, 0.01);
  addCheckbox(sec, 'Inside out — solid where it was empty', 'invertObj');
  addSlider(sec, 'Pieces named by the first folds', 'partDepth', 0, 2, 1,
    'Every piece the first folds cut space into is a region with its own outline.');

  sec = addSection(root, 'Symmetry');
  addSelect(sec, 'Kind', 'symmetry', SYMS, resync,
    '<b>mirror</b> — left and right; <b>dihedral</b> — so many mirrors through the middle, a ' +
    'kaleidoscope; <b>rotational</b> — turned copies, no mirrors. Only one wedge is computed and ' +
    'drawn — the rest is that wedge, exactly. <b>M</b> steps, <b>N</b> adds a mirror.');
  addSlider(sec, 'Copies', 'symN', 1, 24, 1);

  sec = addSection(root, 'Light and tone');
  addSlider(sec, 'Light from (°)', 'lightYaw', -180, 180, 1);
  addSlider(sec, 'Light height (°)', 'lightPitch', -90, 90, 1);
  addSlider(sec, 'Ambient (%)', 'ambient', 0, 100, 1);
  addSlider(sec, 'Hidden corners (%)', 'aoK', 0, 100, 1, 'Ambient occlusion — crevices go dark.');
  addSlider(sec, 'Fog (%)', 'fog', -100, 100, 1, 'Over 0 the far fades to paper, under 0 to ink.');
  addSlider(sec, 'Sky (% ink)', 'skyTone', 0, 100, 1);
  addSlider(sec, 'Cut caps (± %)', 'capShift', -100, 100, 1);
  addSlider(sec, 'Each mirror darkens (%)', 'mirrorDim', 0, 100, 1);
  addSlider(sec, 'Flat regions (%)', 'flat', 0, 100, 1,
    'Every region shaded with its own mean tone — panels rather than gradients.');
  addSlider(sec, 'Tone steps', 'levels', 0, 12, 1, '0 — any tone.');
  addSlider(sec, 'Contrast (%)', 'contrast', -100, 300, 1);
  addSlider(sec, 'Gamma (%)', 'gamma', 20, 500, 1, 'Over 100 lightens the middle tones.');
  addCheckbox(sec, 'Inside out — ink where it is light', 'invert');

  sec = addSection(root, 'Outlines');
  addCheckbox(sec, 'Draw the outlines', 'outlines');
  addSlider(sec, 'Bands of the orbit trap', 'panels', 0, 24, 1,
    'How near the folds came to the middle, cut into bands — each a panel with its own outline.');
  addSlider(sec, 'Depth jump (%)', 'depthEdge', 0, 50, 0.5, 'One surface in front of another. 0 — off.');
  addSlider(sec, 'Fold of the surface (°)', 'crease', 0, 120, 1, 'A ridge or a valley this sharp. 0 — off.');
  addSlider(sec, 'Swallow regions under (rays)', 'despeckle', 0, 200, 1);
  addSlider(sec, 'Smoothing', 'smooth', 0, 12, 1, 'How far the staircase of the rays is rounded off.');
  addSlider(sec, 'Shortest line (mm)', 'minLine', 0, 20, 0.1);
  addSlider(sec, 'Rays every (mm)', 'detail', 0.1, 2, 0.01,
    'The grid the outlines are read off. Finer is sharper and takes longer to cast.');
  addSlider(sec, 'Steps a ray may take', 'maxSteps', 30, 500, 1);
  addSlider(sec, 'Precision (% of a ray)', 'precision', 5, 300, 1,
    'How near a ray must come to call it a hit. Lower is finer and slower.');

  sec = addSection(root, 'Shading');
  addSelect(sec, 'Regions shaded with', 'pattern', PATTERNS, resync,
    '<b>mixed</b> — each region one of the patterns ticked below, the same for regions of one ' +
    'name; <b>dots</b> — a halftone; <b>hatch</b>; <b>cross</b> — hatching crossed over the ' +
    'darker half; <b>flow</b> — lines that follow the surface; <b>none</b>. <b>P</b> steps.');
  addCheckbox(sec, 'dots', 'mixDots', resync);
  addCheckbox(sec, 'hatch', 'mixHatch', resync);
  addCheckbox(sec, 'cross', 'mixCross', resync);
  addCheckbox(sec, 'flow', 'mixFlow', resync);
  addSlider(sec, 'Dots apart (mm)', 'dotPitch', 0.3, 6, 0.05, 'Each dot is a touch of the pen.');
  addSlider(sec, 'Dot grid turned (°)', 'dotAngle', -90, 90, 1);
  addSelect(sec, 'Dots come in', 'dotOrder', DOT_ORDER, update,
    '<b>bayer</b> — an ordered dither, a cross-stitch at the middle tones; <b>random</b>; ' +
    '<b>rows</b> — a row at a time.');
  addSlider(sec, 'Hatch lines apart (mm)', 'hatchPitch', 0.2, 6, 0.05, 'At the darkest.');
  addSlider(sec, 'Hatch angle (°)', 'hatchAngle', -90, 90, 1);
  addSelect(sec, 'Each region\'s angle', 'hatchBy', HATCH_BY, update,
    '<b>fixed</b>; <b>per region</b> — one of four, by its name; <b>surface</b> — across the ' +
    'way the surface faces.');
  addSelect(sec, 'Lines follow', 'flowField', FLOWS, update,
    '<b>depth</b> — rings of equal distance; <b>height</b> — level lines; <b>radius</b> — shells ' +
    'round the middle; <b>trap</b> — the orbit trap; <b>light</b> — lines of equal light.');
  addSlider(sec, 'Flow lines', 'flowLines', 4, 400, 1, 'Across the whole range, at the darkest.');
  addSlider(sec, 'Paper along the outlines (mm)', 'edgeGap', 0, 3, 0.05);
  addSlider(sec, 'Bare below (% tone)', 'lightest', 0, 100, 1);
  addSlider(sec, 'Solid above (% tone)', 'solidAt', 0, 100, 1, '100 — never.');
  addSlider(sec, 'Solid passes apart (% of the nib)', 'solidPasses', 30, 200, 1);

  sec = addSection(root, 'Pens');
  addNote(sec, 'Five pens of the drawer; each layer picks one by number. Changing the kind sets ' +
    'its colour and a usual width.');
  addPenSelect(sec, 'Outlines', 'linePen', 'The cut guides go with the first pen in use.');
  addPenSelect(sec, 'Shading', 'fillPen');
  addCheckbox(sec, 'What a mirror shows, shaded in its own pen', 'mirrorOwnPen', resync);
  addPenSelect(sec, 'Shading in mirrors', 'mirrorPen');
  addPenSelect(sec, 'Solid', 'solidPen');
  addPenSelect(sec, 'Ring', 'ringPen');
  for (let i = 0; i < SLOTS; i++) addPenSlot(sec, i);

  sec = addSection(root, 'Paper');
  addSelect(sec, 'Size', 'paper', PAPERS, () => { syncVisibility(); resizeForPaper(); });
  addSelect(sec, 'Orientation', 'orientation', ['landscape', 'portrait'], resizeForPaper);
  addSlider(sec, 'Width (mm)', 'customW', 20, 2000, 1, '', resizeForPaper);
  addSlider(sec, 'Height (mm)', 'customH', 20, 2000, 1, '', resizeForPaper);
  addSlider(sec, 'Margin (mm)', 'margin', 0, 150, 1, 'The orb sits in the sheet less the margin.');
  addSelect(sec, 'Paper', 'paperTone', TONES, () => {
    if (PAPER_TONES[settings.paperTone]) {
      settings.paperColor = PAPER_TONES[settings.paperTone];
      setters.paperColor(settings.paperColor);
    }
    drawPreview(); updateStats(); syncUrl();
  }, 'The preview only — the files have no background.');
  addColor(sec, 'Paper colour', 'paperColor');
  addSelect(sec, 'Ring round the orb', 'ring', RINGS, resync,
    '<b>halo</b> — a worn, dashed arc outside it; <b>broken</b> — the ring itself in dashes.');
  addSlider(sec, 'Ring gap (mm)', 'ringGap', 0.3, 30, 0.1);
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
  addCheckbox(sec, 'Show the margin, the orb, the wedge and the cut guides', 'showGuides', () => { drawPreview(); syncUrl(); });
  addCheckbox(sec, 'Show the rendered tones underneath', 'showRender', () => { drawPreview(); syncUrl(); });
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
  createDiv('').parent(sec).class('note keys').html(
    '<div><kbd>drag</kbd> turn it · <kbd>shift</kbd>+<kbd>drag</kbd> through the 4th dimension</div>' +
    '<div><kbd>alt</kbd>+<kbd>drag</kbd> turn the eye · <kbd>wheel</kbd> nearer, further</div>' +
    '<div><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> turn by 5°, with <kbd>shift</kbd> 15°</div>' +
    '<div><kbd>S</kbd> scene · <kbd>O</kbd> fractal · <kbd>V</kbd> view · <kbd>P</kbd> pattern · <kbd>M</kbd> symmetry · <kbd>N</kbd> copies</div>' +
    '<div><kbd>R</kbd> roll a fractal · <kbd>[</kbd> <kbd>]</kbd> seed · <kbd>X</kbd> cut guides · <kbd>G</kbd> guides · <kbd>H</kbd> tones</div>');
  linkDiv = createDiv('').parent(sec).class('link');
  refreshPenSelects();
  syncVisibility();
}

////////////////////////////////////////////////////////////////////////////////////////
// What the sheet costs

function updateStats() {
  if (!statsDiv) return;
  const s = settings;
  const rays = BUF ? `${groupNum(BUF.N * BUF.N * Math.PI / 4)} rays, ${BUF.cell.toFixed(2)} mm apart, ` +
    `cast in ${(BUF.ms / 1000).toFixed(1)} s${BUF.workers ? ` on ${BUF.workers} threads` : ''}` : '';
  if (!BUF || !shapes && !strokes) {
    statsDiv.html(JOB ? '<div>Casting the rays…</div>' : '<div class="warn">The margin leaves nothing to draw on.</div>');
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
  const pats = Object.entries(COUNTS.patterns).map(([k, v]) => `${v} ${k}`).join(', ');
  let html =
    `<div class="big"><b>${groupNum(strokes)}</b> strokes, ` +
    `<b>${(plan.ink / 1000).toFixed(1)}</b> m of line</div>` +
    `<div>${groupNum(COUNTS.regions)} regions — ${pats}</div>` +
    `<div>${groupNum(COUNTS.dots)} dots · the orb ${(ORB.R * 2).toFixed(0)} mm across</div>` +
    `<div>The pen goes down <b>${groupNum(plan.downs)}</b> times, ` +
    `${(plan.travel / 1000).toFixed(1)} m in the air</div>` +
    `<div>Roughly <b>${formatDuration(seconds)}</b> to plot · ${lastMs.toFixed(0)} ms to draw</div>` +
    `<div>${rays}</div>`;
  if (JOB) html += '<div class="dim">Casting the rays again…</div>';
  if (s.cropMarks && perLayer && perLayer[L_GUIDES].strokes) {
    html += `<div>${perLayer[L_GUIDES].strokes} cut guide dots round the ${s.cropMarkAt}</div>`;
  }
  const nib = penW(penIdx(s.fillPen));
  if (s.hatchPitch < nib) {
    html += `<div class="warn">The hatching is ${s.hatchPitch} mm apart and the pen ${nib} mm wide — ` +
      'at the darkest it closes up.</div>';
  }
  if (s.dotPitch < nib * 1.3) {
    html += '<div class="warn">The dots are nearly as close as the pen is wide — they run together.</div>';
  }
  if (s.solidAt < 100 && s.solidPasses > 100) {
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
  return `folded orbs — ${s.view} ${s.object}${s.object === 'kifs' ? '/' + s.folds : ''}` +
    `${s.object === 'polytope' ? '/' + s.polytope : ''} enclose=${s.enclose} ` +
    `symmetry=${s.symmetry}${s.symmetry === 'dihedral' || s.symmetry === 'rotational' ? s.symN : ''} ` +
    `pattern=${s.pattern} ${s.cropMarks ? `cutguides=${s.cropMarkAt}<=${s.cropMarkGap}mm ` : ''}` +
    `seed=${s.seed} pens=[${pens.join('; ')}] strokes=${strokes}`;
}

function fileStem() {
  const s = settings;
  const paper = s.paper === 'custom' ? `${s.customW}x${s.customH}mm` : `${s.paper}-${s.orientation}`;
  return `folded orbs ${s.view} ${s.object} ${s.pattern} seed${s.seed} ${paper}`;
}

////////////////////////////////////////////////////////////////////////////////////////
// Controls, shared

function foldedSet() {
  try { return new Set(JSON.parse(localStorage.getItem('p5js23-folded') || '[]')); }
  catch (e) { return new Set(); }
}

function saveFolded(set) {
  try { localStorage.setItem('p5js23-folded', JSON.stringify([...set])); } catch (e) { /* no storage */ }
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
  'showGuides', 'showRender', 'pngDpi'];

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
  sel.changed(() => { settings[key] = sel.value(); (onChange || update)(); });
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

function svgGroup(keepIt, pen, id) {
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
  return `<g id="${id}" fill="none" stroke="${penCol(pen)}" stroke-width="${f(penW(pen))}" ` +
    `stroke-linecap="round" stroke-linejoin="round">\n${body}</g>\n`;
}

function penId(i) { return `pen${i + 1}-${penKind(i).replace(/\s+/g, '-')}`; }

function svgFile(groups, tag) {
  const [W, H] = paperDims();
  let body = '';
  for (const [keepIt, pen, id] of groups) {
    const g = svgGroup(keepIt, pen, id);
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
    alert('Nothing to export — no line is on this sheet yet.');
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

////////////////////////////////////////////////////////////////////////////////////////
// The raymarcher
//
// One self-contained function, so that the very same code runs on the page and, turned
// back into source, in as many Web Workers as the machine has cores. Nothing in it reads
// anything from outside: it is handed a plain object of parameters, renders a set of rows
// of the grid, and hands back typed arrays.
//
// Every reading of the grid is one ray through a disc: what it hit (the fractal, the cap
// the enclosing ball cut off it, the sky), through which mirrors it came (a code of the
// bounces), which piece of the fractal it is (the folds the last iterations took), an
// orbit trap, the length of the whole path, the normal, the point hit and how hidden it is
// (ambient occlusion). Light, tone and lines are all made of these afterwards, on the page.
////////////////////////////////////////////////////////////////////////////////////////

function renderCore() {
  'use strict';

  let P = null;
  const OR = new Float64Array(9);   // world → object
  const CR = new Float64Array(9);   // the camera's own turn
  const K1 = new Float64Array(9);   // twist before every fold
  const K2 = new Float64Array(9);   // and after it
  const H4 = new Float64Array(16);  // the turn in four dimensions
  const T4 = new Float64Array(16);  // a four-dimensional twist inside the loop
  let PART = 0, TRAP = 0, CAP = 0;
  let DE = null;

  const RAD = Math.PI / 180;

  function rot3(yaw, pitch, roll, M) {
    const a = yaw * RAD, b = pitch * RAD, c = roll * RAD;
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    const cc = Math.cos(c), sc = Math.sin(c);
    // Rz(roll) · Rx(pitch) · Ry(yaw)
    const Y = [ca, 0, sa, 0, 1, 0, -sa, 0, ca];
    const X = [1, 0, 0, 0, cb, -sb, 0, sb, cb];
    const Z = [cc, -sc, 0, sc, cc, 0, 0, 0, 1];
    const m = (A, B) => {
      const o = new Array(9);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        o[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
      }
      return o;
    };
    const R = m(Z, m(X, Y));
    for (let i = 0; i < 9; i++) M[i] = R[i];
  }

  // A turn in the xw, yw and zw planes — the ones a three-dimensional eye cannot make.
  function rot4(xw, yw, zw, xy, M) {
    const I = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const plane = (i, j, deg) => {
      const R = I(), c = Math.cos(deg * RAD), s = Math.sin(deg * RAD);
      R[i * 4 + i] = c; R[i * 4 + j] = -s; R[j * 4 + i] = s; R[j * 4 + j] = c;
      return R;
    };
    const m = (A, B) => {
      const o = new Array(16);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        let v = 0;
        for (let k = 0; k < 4; k++) v += A[i * 4 + k] * B[k * 4 + j];
        o[i * 4 + j] = v;
      }
      return o;
    };
    const R = m(plane(0, 1, xy), m(plane(2, 3, zw), m(plane(1, 3, yw), plane(0, 3, xw))));
    for (let i = 0; i < 16; i++) M[i] = R[i];
  }

  ////////////////////////////////////////////////////////////////////////////////////
  // The distance estimates, each in its own object units. Each leaves the piece it is
  // in in PART and an orbit trap in TRAP.

  function deKifs(x, y, z) {
    const S = P.kScale, n = P.iters, tet = P.folds === 'tetra';
    const ox = P.offX, oy = P.offY, oz = P.offZ, keep = P.partDepth;
    const mz = 0.5 * oz * (S - 1) / S;
    let k = 1, part = 0, trap = 1e9, t;
    for (let i = 0; i < n; i++) {
      t = K1[0] * x + K1[1] * y + K1[2] * z;
      const yy = K1[3] * x + K1[4] * y + K1[5] * z;
      z = K1[6] * x + K1[7] * y + K1[8] * z; x = t; y = yy;
      let bits = 0;
      if (tet) {
        if (x + y < 0) { t = -y; y = -x; x = t; bits |= 1; }
        if (x + z < 0) { t = -z; z = -x; x = t; bits |= 2; }
        if (y + z < 0) { t = -z; z = -y; y = t; bits |= 4; }
        x = x * S - ox * (S - 1); y = y * S - oy * (S - 1); z = z * S - oz * (S - 1);
      } else {
        if (x < 0) { x = -x; bits |= 1; }
        if (y < 0) { y = -y; bits |= 2; }
        if (z < 0) { z = -z; bits |= 4; }
        if (x < y) { t = x; x = y; y = t; bits |= 8; }
        if (x < z) { t = x; x = z; z = t; bits |= 16; }
        if (y < z) { t = y; y = z; z = t; bits |= 32; }
        z -= mz; if (z > 0) { z = -z; bits |= 64; } z += mz;
        x = x * S - ox * (S - 1); y = y * S - oy * (S - 1); z = z * S;
      }
      t = K2[0] * x + K2[1] * y + K2[2] * z;
      const y2 = K2[3] * x + K2[4] * y + K2[5] * z;
      z = K2[6] * x + K2[7] * y + K2[8] * z; x = t; y = y2;
      k *= S;
      const r2 = x * x + y * y + z * z;
      if (r2 < trap) trap = r2;
      if (i < keep) part = part * 128 + bits;
    }
    PART = part; TRAP = Math.sqrt(trap);
    return finalShape(x, y, z, 0, false) / k;
  }

  function finalShape(x, y, z, w, four) {
    const b = P.core;
    if (P.coreShape === 'ball') {
      return Math.sqrt(x * x + y * y + z * z + w * w) - b;
    }
    const dx = Math.abs(x) - b, dy = Math.abs(y) - b, dz = Math.abs(z) - b;
    const dw = four ? Math.abs(w) - b : -1e9;
    if (P.coreShape === 'cross') {
      // three slabs crossing — a jack, beams in every direction
      const t = b * 0.35;
      const sx = Math.max(dx, Math.abs(y) - t, Math.abs(z) - t);
      const sy = Math.max(dy, Math.abs(x) - t, Math.abs(z) - t);
      const sz = Math.max(dz, Math.abs(x) - t, Math.abs(y) - t);
      return Math.min(sx, sy, sz);
    }
    const qx = Math.max(dx, 0), qy = Math.max(dy, 0), qz = Math.max(dz, 0), qw = Math.max(dw, 0);
    return Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw) +
      Math.min(Math.max(dx, dy, dz, dw), 0);
  }

  function deMandelbox(X, Y, Z) {
    const zoom = P.mbZoom, s = P.mbScale, minR2 = P.mbMinR * P.mbMinR, fold = P.mbFold;
    let x = X * zoom, y = Y * zoom, z = Z * zoom;
    const cx = x, cy = y, cz = z, keep = P.partDepth;
    let dr = 1, part = 0, trap = 1e9;
    for (let i = 0; i < P.iters; i++) {
      let bits = 0;
      if (x > fold) { x = 2 * fold - x; bits |= 1; } else if (x < -fold) { x = -2 * fold - x; bits |= 2; }
      if (y > fold) { y = 2 * fold - y; bits |= 4; } else if (y < -fold) { y = -2 * fold - y; bits |= 8; }
      if (z > fold) { z = 2 * fold - z; bits |= 16; } else if (z < -fold) { z = -2 * fold - z; bits |= 32; }
      const r2 = x * x + y * y + z * z;
      if (r2 < minR2) { const f = 1 / minR2; x *= f; y *= f; z *= f; dr *= f; bits |= 64; }
      else if (r2 < 1) { const f = 1 / r2; x *= f; y *= f; z *= f; dr *= f; }
      let t = K2[0] * x + K2[1] * y + K2[2] * z;
      const yy = K2[3] * x + K2[4] * y + K2[5] * z;
      z = K2[6] * x + K2[7] * y + K2[8] * z; x = t; y = yy;
      x = s * x + cx; y = s * y + cy; z = s * z + cz;
      dr = dr * Math.abs(s) + 1;
      const q = x * x + y * y + z * z;
      if (q < trap) trap = q;
      if (i < keep) part = part * 128 + bits;
      if (q > 1e6) break;
    }
    PART = part; TRAP = Math.sqrt(trap);
    return Math.sqrt(x * x + y * y + z * z) / Math.abs(dr) / zoom;
  }

  function at4(x, y, z, w) {
    // the point in four dimensions, turned
    return [
      H4[0] * x + H4[1] * y + H4[2] * z + H4[3] * w,
      H4[4] * x + H4[5] * y + H4[6] * z + H4[7] * w,
      H4[8] * x + H4[9] * y + H4[10] * z + H4[11] * w,
      H4[12] * x + H4[13] * y + H4[14] * z + H4[15] * w,
    ];
  }

  // A quaternion Julia set: z ← z² + c in four dimensions, cut by the hyperplane w = slice.
  function deJulia(X, Y, Z) {
    const zoom = P.jZoom;
    const q = at4(X * zoom, Y * zoom, Z * zoom, P.wSlice);
    let a = q[0], b = q[1], c = q[2], d = q[3];
    const c0 = P.jc0, c1 = P.jc1, c2 = P.jc2, c3 = P.jc3;
    let m2 = a * a + b * b + c * c + d * d, dz = 1, trap = 1e9, esc = P.iters;
    for (let i = 0; i < P.iters; i++) {
      dz = 2 * Math.sqrt(m2) * dz;
      const na = a * a - b * b - c * c - d * d + c0;
      b = 2 * a * b + c1; c = 2 * a * c + c2; d = 2 * a * d + c3; a = na;
      m2 = a * a + b * b + c * c + d * d;
      if (m2 < trap) trap = m2;
      if (m2 > 256) { esc = i; break; }
    }
    PART = P.partDepth ? esc : 0;
    TRAP = Math.sqrt(trap);
    if (m2 <= 256) return 0;
    const r = Math.sqrt(m2);
    return 0.5 * r * Math.log(r) / dz / zoom;
  }

  // A kaleidoscope in four dimensions: every coordinate folded to its absolute value,
  // sorted, scaled away from a corner — a Menger sponge of a tesseract — and cut by w.
  function deHyperfold(X, Y, Z) {
    const zoom = P.hZoom;
    const q = at4(X * zoom, Y * zoom, Z * zoom, P.wSlice);
    let a = q[0], b = q[1], c = q[2], d = q[3], t;
    const S = P.kScale, n = P.iters, keep = P.partDepth;
    const oa = P.offX * (S - 1), ob = P.offY * (S - 1), oc = P.offZ * (S - 1), od = P.offW * (S - 1);
    let k = 1, part = 0, trap = 1e9;
    for (let i = 0; i < n; i++) {
      let bits = 0;
      if (a < 0) { a = -a; bits |= 1; }
      if (b < 0) { b = -b; bits |= 2; }
      if (c < 0) { c = -c; bits |= 4; }
      if (d < 0) { d = -d; bits |= 8; }
      if (a < b) { t = a; a = b; b = t; bits |= 16; }
      if (c < d) { t = c; c = d; d = t; bits |= 32; }
      if (a < c) { t = a; a = c; c = t; bits |= 64; }
      if (b < d) { t = b; b = d; d = t; }
      if (b < c) { t = b; b = c; c = t; }
      const na = T4[0] * a + T4[1] * b + T4[2] * c + T4[3] * d;
      const nb = T4[4] * a + T4[5] * b + T4[6] * c + T4[7] * d;
      const nc = T4[8] * a + T4[9] * b + T4[10] * c + T4[11] * d;
      const nd = T4[12] * a + T4[13] * b + T4[14] * c + T4[15] * d;
      a = na * S - oa; b = nb * S - ob; c = nc * S - oc; d = nd * S - od;
      k *= S;
      const r2 = a * a + b * b + c * c + d * d;
      if (r2 < trap) trap = r2;
      if (i < keep) part = part * 128 + bits;
    }
    PART = part; TRAP = Math.sqrt(trap);
    return finalShape(a, b, c, d, true) / k / zoom;
  }

  // The edges of a regular polytope of four dimensions, drawn on the three-sphere and
  // brought down to space by stereographic projection: straight edges become arcs of
  // circles, cells become bubbles. Distances are measured on the sphere, as angles, and
  // turned into a step that is safe in space.
  function onSphere(X, Y, Z) {
    const x = X, y = Y, z = Z;
    const r2 = x * x + y * y + z * z, k = 1 / (1 + r2);
    return at4(2 * x * k, 2 * y * k, 2 * z * k, (r2 - 1) * k).concat([Math.sqrt(r2)]);
  }

  function sphereStep(ang, r) {
    // how far one may go in space from radius r and not cover more than ang on the sphere
    if (ang <= 0) return ang * (1 + r * r) / 2;
    const h = Math.atan(r) - ang / 2;
    return h <= -Math.PI / 2 + 1e-6 ? 1e3 : r - Math.tan(h);
  }

  function acosC(v) { return Math.acos(v > 1 ? 1 : v < -1 ? -1 : v); }

  function dePolytope(X, Y, Z) {
    const q = onSphere(X, Y, Z);
    let a = Math.abs(q[0]), b = Math.abs(q[1]), c = Math.abs(q[2]), d = Math.abs(q[3]), t;
    const sg = (q[0] < 0 ? 1 : 0) | (q[1] < 0 ? 2 : 0) | (q[2] < 0 ? 4 : 0) | (q[3] < 0 ? 8 : 0);
    // which coordinate is the largest — the cell the point is nearest
    let big = 0, bv = a;
    if (b > bv) { big = 1; bv = b; }
    if (c > bv) { big = 2; bv = c; }
    if (d > bv) { big = 3; bv = d; }
    if (a < b) { t = a; a = b; b = t; }
    if (c < d) { t = c; c = d; d = t; }
    if (a < c) { t = a; a = c; c = t; }
    if (b < d) { t = b; b = d; d = t; }
    if (b < c) { t = b; b = c; c = t; }
    let edge, vert;
    if (P.polytope === '16-cell') {
      edge = acosC(Math.sqrt(a * a + b * b));
      vert = acosC(a);
    } else if (P.polytope === '24-cell') {
      const s = (2 * a + b + c) / Math.sqrt(6), u = (b - c) / Math.SQRT2;
      vert = acosC((a + b) / Math.SQRT2);
      edge = Math.atan2(u, s) <= Math.PI / 6 + 1e-9 ? acosC(Math.sqrt(s * s + u * u)) : vert;
    } else {
      const s = (a + b + c) / Math.sqrt(3);
      edge = acosC(Math.sqrt(s * s + d * d));
      vert = acosC((a + b + c + d) / 2);
    }
    const dd = Math.min(edge - P.tube, vert - P.node);
    PART = P.partDepth ? (P.partDepth > 1 ? sg * 4 + big : big) : 0;
    TRAP = edge;
    return sphereStep(dd, q[4]);
  }

  // Circles wound round nested Clifford tori of the three-sphere — a Hopf fibration when
  // they wind once each way — brought down by the same projection: linked rings on tori.
  function deHopf(X, Y, Z) {
    const q = onSphere(X, Y, Z);
    const r1 = Math.hypot(q[0], q[1]), r2 = Math.hypot(q[2], q[3]);
    const eta = Math.atan2(r2, r1), al = Math.atan2(q[1], q[0]), be = Math.atan2(q[3], q[2]);
    const L = P.layers, gap = P.layerGap;
    let li = Math.round((eta - Math.PI / 4) / gap + (L - 1) / 2);
    li = li < 0 ? 0 : li > L - 1 ? L - 1 : li;
    const e0 = Math.PI / 4 + (li - (L - 1) / 2) * gap;
    const pw = P.windA, qw = P.windB + li * P.windStep, m = P.fibres;
    const u = qw * al - pw * be, cell = 2 * Math.PI / m;
    const k = Math.round(u / cell), du = u - k * cell;
    const ce = Math.max(Math.cos(e0), 0.05), se = Math.max(Math.sin(e0), 0.05);
    const across = du / Math.sqrt(qw * qw / (ce * ce) + pw * pw / (se * se));
    const dd = Math.sqrt((eta - e0) * (eta - e0) + across * across) - P.tube;
    PART = P.partDepth ? (P.partDepth > 1 ? li * 64 + (((k % m) + m) % m) : li) : 0;
    TRAP = Math.abs(eta - e0);
    return sphereStep(dd, q[4]);
  }

  const OBJECTS = {
    kifs: deKifs, mandelbox: deMandelbox, julia: deJulia,
    hyperfold: deHyperfold, polytope: dePolytope, hopf: deHopf,
  };

  // The whole scene but the mirrors, in world units: the fractal turned and sized, then
  // kept inside the unit ball or carved out of it.
  function sceneDE(x, y, z) {
    const s = P.objSize;
    const qx = (OR[0] * x + OR[1] * y + OR[2] * z) / s;
    const qy = (OR[3] * x + OR[4] * y + OR[5] * z) / s;
    const qz = (OR[6] * x + OR[7] * y + OR[8] * z) / s;
    let d = DE(qx, qy, qz) * s;
    if (P.invertObj) d = -d;
    if (P.hollow > 0) {
      // a round room at the heart, for a mirror ball to hang in
      const h = P.hollow - Math.sqrt(x * x + y * y + z * z);
      if (h > d) d = h;
    }
    const en = P.enclose;
    if (en === 'none') { CAP = 0; return d; }
    const db = Math.sqrt(x * x + y * y + z * z) - 1;
    if (en === 'inside') {
      if (db > d) { CAP = 1; return db; }
      CAP = 0; return d;
    }
    if (en === 'carved') {
      if (db > -d) { CAP = 1; return db; }
      CAP = 0; return -d;
    }
    // shell: a rind of the ball, the fractal cut into it
    const sh = Math.abs(db + P.shell) - P.shell;
    if (sh > d) { CAP = 1; return sh; }
    CAP = 0; return d;
  }

  ////////////////////////////////////////////////////////////////////////////////////
  // Rays

  let HIT_T = 0, STEPS = 0;

  function march(ox, oy, oz, dx, dy, dz, t0, t1, base) {
    let t = t0;
    const eK = P.pixAng * P.epsK, maxS = P.maxSteps, kS = P.stepK;
    for (let i = 0; i < maxS; i++) {
      const d = sceneDE(ox + dx * t, oy + dy * t, oz + dz * t);
      const eps = Math.max(1e-5, eK * (base + t));
      if (d < eps) { HIT_T = t; STEPS = i; return true; }
      t += d * kS;
      if (t > t1) { STEPS = i; return false; }
    }
    HIT_T = t; STEPS = maxS;
    return t < t1;
  }

  function sphereHit(ox, oy, oz, dx, dy, dz, R, inside) {
    const b = ox * dx + oy * dy + oz * dz, c = ox * ox + oy * oy + oz * oz - R * R;
    const h = b * b - c;
    if (h < 0) return Infinity;
    const s = Math.sqrt(h);
    if (inside) { const t = -b + s; return t > 1e-6 ? t : Infinity; }
    const t = -b - s;
    return t > 1e-6 ? t : Infinity;
  }

  // What one ray sees. Writes into the output arrays at index o.
  function shade(OUT, o, ox, oy, oz, dx, dy, dz, path, bounces, total) {
    const mb = P.mirrorBall, room = P.room;
    for (;;) {
      const tB = mb > 0 ? sphereHit(ox, oy, oz, dx, dy, dz, mb, false) : Infinity;
      const tR = room > 0 ? sphereHit(ox, oy, oz, dx, dy, dz, room, true) : Infinity;
      let t0 = 1e-4, t1 = Math.min(tB, tR, P.tMax);
      let can = true;
      if (P.enclose !== 'none') {
        // nothing of the scene lies outside the unit ball
        const b = ox * dx + oy * dy + oz * dz, c = ox * ox + oy * oy + oz * oz - 1, h = b * b - c;
        if (h < 0) can = false;
        else {
          const s = Math.sqrt(h);
          t0 = Math.max(t0, -b - s); t1 = Math.min(t1, -b + s);
          if (t1 <= t0) can = false;
        }
      }
      if (can && march(ox, oy, oz, dx, dy, dz, t0, t1, total)) {
        const t = HIT_T, px = ox + dx * t, py = oy + dy * t, pz = oz + dz * t;
        const h = Math.max(1e-5, P.pixAng * P.epsK * (total + t) * 0.5);
        const a = sceneDE(px + h, py - h, pz - h), b = sceneDE(px - h, py - h, pz + h);
        const c = sceneDE(px - h, py + h, pz - h), d = sceneDE(px + h, py + h, pz + h);
        let nx = a - b - c + d, ny = -a - b + c + d, nz = -a + b - c + d;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;
        // facing away from the eye means the normal came out wrong in a crevice
        if (nx * dx + ny * dy + nz * dz > 0) { nx = -nx; ny = -ny; nz = -nz; }
        let occ = 0;
        const ad = P.aoDist;
        for (let i = 1; i <= 4; i++) {
          const hh = ad * i / 4;
          occ += (hh - sceneDE(px + nx * hh, py + ny * hh, pz + nz * hh)) / (1 << i) / ad;
        }
        sceneDE(px, py, pz);
        OUT.kind[o] = CAP ? 3 : 2;
        OUT.part[o] = PART;
        OUT.trap[o] = TRAP;
        OUT.depth[o] = total + t;
        OUT.nx[o] = nx; OUT.ny[o] = ny; OUT.nz[o] = nz;
        OUT.px[o] = px; OUT.py[o] = py; OUT.pz[o] = pz;
        OUT.ao[o] = Math.max(0, Math.min(1, 1 - 2.2 * occ));
        OUT.steps[o] = STEPS;
        OUT.path[o] = path; OUT.bounce[o] = bounces;
        return;
      }
      const tm = Math.min(tB, tR);
      if (tm < P.tMax && bounces < P.bounces) {
        const px = ox + dx * tm, py = oy + dy * tm, pz = oz + dz * tm;
        let nx, ny, nz;
        if (tB <= tR) { nx = px / mb; ny = py / mb; nz = pz / mb; path = path * 3 + 1; }
        else { nx = -px / room; ny = -py / room; nz = -pz / room; path = path * 3 + 2; }
        const k = 2 * (dx * nx + dy * ny + dz * nz);
        dx -= k * nx; dy -= k * ny; dz -= k * nz;
        ox = px + nx * 1e-4; oy = py + ny * 1e-4; oz = pz + nz * 1e-4;
        total += tm; bounces++;
        continue;
      }
      // the sky — or a mirror seen once too often
      OUT.kind[o] = tm < P.tMax ? 4 : 1;
      OUT.part[o] = 0; OUT.trap[o] = 0;
      OUT.depth[o] = total + P.tMax;
      OUT.nx[o] = dx; OUT.ny[o] = dy; OUT.nz[o] = dz;
      OUT.px[o] = dx; OUT.py[o] = dy; OUT.pz[o] = dz;
      OUT.ao[o] = 1; OUT.steps[o] = 0;
      OUT.path[o] = path; OUT.bounce[o] = bounces;
      return;
    }
  }

  function setup(params) {
    P = params;
    rot3(P.yaw, P.pitch, P.roll, OR);
    rot3(P.camYaw, P.camPitch, 0, CR);
    rot3(P.twistA, P.twistB, 0, K1);
    rot3(P.twistC, P.twistD, P.twistE, K2);
    rot4(P.xw, P.yw, P.zw, 0, H4);
    rot4(P.twistA, P.twistB, P.twistC, P.twistD, T4);
    DE = OBJECTS[P.object] || deKifs;
  }

  // Fold a point of the disc into the wedge the symmetry repeats — the angle is measured
  // from straight up, clockwise.
  function foldDisc(u, v) {
    const n = P.symN, sym = P.symmetry;
    if (sym === 'none') return [u, v];
    const r = Math.hypot(u, v);
    let a = Math.atan2(u, v);
    if (a < 0) a += 2 * Math.PI;
    const w = sym === 'mirror' ? 2 * Math.PI : 2 * Math.PI / n;
    a = a % w;
    if (sym !== 'rotational' && a > w / 2) a = w - a;
    return [r * Math.sin(a), r * Math.cos(a)];
  }

  function newOut(n) {
    return {
      kind: new Uint8Array(n), part: new Int32Array(n), trap: new Float32Array(n),
      depth: new Float32Array(n), nx: new Float32Array(n), ny: new Float32Array(n),
      nz: new Float32Array(n), px: new Float32Array(n), py: new Float32Array(n),
      pz: new Float32Array(n), ao: new Float32Array(n), steps: new Uint16Array(n),
      path: new Uint16Array(n), bounce: new Uint8Array(n),
    };
  }

  // Render a list of rows. Under a plain mirror only the right half is marched and the
  // left is its copy, pixel for pixel.
  function renderRows(rows) {
    const N = P.N, out = newOut(rows.length * N);
    const half = P.symmetry === 'mirror' ? N >> 1 : 0;
    const view = P.view;
    const tanH = Math.tan(Math.min(P.fov, 170) * RAD / 2);
    const fish = P.fov * RAD / 2;
    for (let r = 0; r < rows.length; r++) {
      const j = rows[r], v0 = 1 - (j + 0.5) / N * 2;
      for (let i = half; i < N; i++) {
        const o = r * N + i;
        const u0 = (i + 0.5) / N * 2 - 1;
        const rr = u0 * u0 + v0 * v0;
        if (rr > 1) { out.kind[o] = 0; continue; }
        const [u, v] = foldDisc(u0, v0);
        let ox = 0, oy = 0, oz = -P.camDist, dx, dy, dz;
        let path = 0, bounces = 0;
        if (view === 'mirror ball') {
          // looking straight at a mirror ball that fills the disc: only what it reflects
          const R = P.mirrorBall > 0 ? P.mirrorBall : 1;
          const w = Math.sqrt(Math.max(0, 1 - u * u - v * v));
          const nx = u, ny = v, nz = -w;
          ox = nx * R; oy = ny * R; oz = nz * R;
          // the eye looks along +z
          const k = 2 * nz;
          dx = -k * nx; dy = -k * ny; dz = 1 - k * nz;
          ox += nx * 1e-4; oy += ny * 1e-4; oz += nz * 1e-4;
          path = 1; bounces = 1;
        } else if (view === 'orb') {
          dx = u * tanH; dy = v * tanH; dz = 1;
          const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
        } else {
          // equidistant fisheye: the angle off the axis grows evenly to the rim of the disc
          const rho = Math.hypot(u, v), th = rho * fish;
          const s = rho > 1e-12 ? Math.sin(th) / rho : fish;
          dx = u * s; dy = v * s; dz = Math.cos(th);
        }
        if (view !== 'mirror ball') {
          const ax = CR[0] * dx + CR[1] * dy + CR[2] * dz;
          const ay = CR[3] * dx + CR[4] * dy + CR[5] * dz;
          dz = CR[6] * dx + CR[7] * dy + CR[8] * dz; dx = ax; dy = ay;
        }
        shade(out, o, ox, oy, oz, dx, dy, dz, path, bounces, view === 'mirror ball' ? P.camDist : 0);
      }
      if (half) {
        for (let i = 0; i < half; i++) {
          const o = r * N + i, m = r * N + (N - 1 - i);
          for (const k in out) out[k][o] = out[k][m];
        }
      }
    }
    return out;
  }

  return { setup, renderRows, newOut };
}

// In a worker: wait for a job, render its rows, send them back.
function workerMain() {
  const core = renderCore();
  self.onmessage = e => {
    const { job, params, rows } = e.data;
    core.setup(params);
    const out = core.renderRows(rows);
    self.postMessage({ job, rows, out }, Object.values(out).map(a => a.buffer));
  };
}
