////////////////////////////////////////////////////////////////////////////////////////
// Swelling lines — a grating of lines that grow fat in the dark and thin in the light
//
// The picture this started from is nothing but upright lines, all the same distance apart.
// Where they run through a dark place they swell until only a hair of paper is left between
// two of them; through a light one they thin to a hair of ink. A few soft pillows lie in
// it — some white, some grey, each with a black rim — and where a line runs into one it
// tapers to a point, so every edge of every pillow is a row of long teeth.
//
// A pen has one width, so a fat line is a ribbon: its two edges drawn half a nib inside
// its outline, a stroke down its middle, and passes inside the edges that follow them, one
// pass further in each time, each beginning where the ribbon has grown wide enough to need
// it. Those beginnings are the teeth. A ribbon no wider than the nib is one stroke.
//
// The picture the lines swell with is painted first, into a grid of greys: pillows in an
// uneven grid, blobs, noise, ripples, a formula typed in, a word, or a photograph. The
// lines that carry it are straight, rings, rays or one spiral; they can lean with the
// tone, crowd towards the dark, wave and wobble. A second set of lines — the echo — goes
// down in another pen: over the whole sheet, in patches, in a band of tones, on every n-th
// line or in a disc, beside the first set or instead of it there.
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

const CARRIERS = ['lines', 'rings', 'rays', 'spiral'];
const SOURCES  = ['pillows', 'blobs', 'noise', 'ripples', 'formula', 'word', 'photo', 'even'];
const INKS     = ['solid', 'fan', 'outline', 'zigzag', 'wave', 'ladder', 'rungs', 'hairline'];
const ECHOES   = ['none', 'everywhere', 'patches', 'tone band', 'every n-th line', 'disc'];
const BORDERS  = ['none', 'line', 'double'];
const FACES    = ['sans', 'serif', 'mono'];
const MARK_AT  = ['sheet', 'picture'];

const FORMULAS = [
  { label: '— a formula to start from —' },
  { label: 'egg crate',        f: 'sin(5*x)*sin(5*y)' },
  { label: 'pinwheel',         f: 'sin(9*r - 3*a)' },
  { label: 'target',           f: 'cos(14*r)' },
  { label: 'drapery',          f: 'sin(7*x + 2*sin(4*y))' },
  { label: 'saddle',           f: 'sin(6*x*y)' },
  { label: 'two wells',        f: 'exp(-6*hypot(x-0.6,y)^2) + exp(-6*hypot(x+0.6,y)^2)' },
  { label: 'petals',           f: 'cos(5*a) * exp(-r) + 0.5*cos(12*r)' },
  { label: 'checker, soft',    f: 'tanh(4*sin(4*x)*sin(4*y))' },
  { label: 'noise in bands',   f: 'sin(14*noise(1.4*x, 1.4*y))' },
];

// What goes on the sheet: the lines, their echo in another pen, the border round the
// picture and the dots to cut it out by.
const LAYERS = [
  { id: 'lines',  label: 'lines',      pen: 'linePen' },
  { id: 'echo',   label: 'echo',       pen: 'echoPen' },
  { id: 'border', label: 'border',     pen: 'borderPen' },
  { id: 'guides', label: 'cut guides', pen: 'linePen' },
];
const L_LINES = 0, L_ECHO = 1, L_BORDER = 2, L_GUIDES = 3;

const MAX_STROKES    = 400_000;
const BUSY_STROKES   = 40_000;
const MAX_PASSES     = 600;        // the most passes one ribbon may be filled with
const FIELD_CELLS    = 420_000;    // cells of grey the picture is painted into, about
const FIELD_PAD      = 4;          // mm of picture beyond the margin box
const SIMPLIFY       = 0.006;      // mm — how far a stroke may be straightened
const MERGE          = 0.05;       // of the nib — a ribbon's edges this near its middle are one stroke
const EPS            = 0.01;       // mm — the stub that stands in for a dot
const PREVIEW_MAX_PX = 1500;
const PEN_CYCLE_S    = 0.3;
const DRAW_SPEED     = 60;
const TRAVEL_SPEED   = 150;
const DRAG_DEG_PX    = 0.25;
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
  border: 'none',
  cropMarks: false,        // cut guides — dots to lay the guillotine's blade through
  cropMarkAt: 'sheet',
  cropMarkGap: 400,        // mm — the most that is ever left between two dots

  // the pens
  pen1Kind: 'black',         pen1W: 0.3, pen1Col: '#1b1b1b',
  pen2Kind: 'red',           pen2W: 0.3, pen2Col: '#c8261d',
  pen3Kind: 'red marker',    pen3W: 3,   pen3Col: '#d9342a',
  pen4Kind: 'silver marker', pen4W: 3,   pen4Col: '#adb1b7',
  pen5Kind: 'white marker',  pen5W: 3,   pen5Col: '#f7f6f1',
  linePen: 1, echoPen: 2, borderPen: 1,

  seed: 4,

  // the lines
  carrier: 'lines',
  pitch: 3.4,           // mm from one line to the next
  angle: 0,             // ° — 0 upright, 90 level
  phase: 50,            // % of the pitch — the whole set slid across
  centreX: 0,           // % of half the picture, from its middle
  centreY: 0,
  arms: 1,
  hole: 3,              // mm
  detail: 0.5,          // mm between two readings of the picture

  // bending them
  lean: 0,              // % of the pitch — pushed across as the tone goes dark
  bulge: 0,             // % of the pitch — pushed towards the dark side
  waveAmp: 0,           // mm
  waveLen: 90,          // mm
  waveShift: 0,         // % of a wave, from one line to the next
  wobble: 0,            // mm
  wobbleScale: 40,      // mm

  // the swelling
  thin: 0,              // % of the pitch, in the lightest
  wide: 90,             // % of the pitch, in the darkest
  curve: 100,           // %
  liftBelow: 0,         // % — the pen is up where the picture is lighter
  minPiece: 0.6,        // mm — a shorter stroke is dropped

  // ink
  ink: 'solid',
  passes: 85,           // % of the nib between two passes
  stitch: 1.2,          // mm — a zigzag's swing, a ladder's rung
  penDown: 100,         // % of the nib — a hop shorter than this is drawn, not lifted over

  // the picture
  source: 'pillows',
  fieldX: 0,            // mm
  fieldY: 0,
  fieldZoom: 100,       // %
  fieldTurn: 0,         // °
  cols: 3,
  rows: 2,
  uneven: 55,           // %
  loose: true,          // every row divided on its own
  stagger: 0,           // % of a cell, every other row
  pillowFill: 78,       // % of its cell
  pillowRound: 75,      // %
  pillowSoft: 30,       // % of half the pillow's short side
  pillowDome: 35,       // % lighter in the middle
  ground: 72,           // % — the tone between the pillows
  pillowLight: 0,       // % — the lightest pillow
  pillowDark: 62,       // % — the darkest
  pillowBias: 0,        // −100 light … 100 dark
  pillowTones: 3,       // steps between the two; 0 or 1 — any tone
  pillowSkip: 0,        // % of the cells left empty
  halo: 100,            // %
  haloWidth: 16,        // % of half the pillow's short side
  blobs: 9,
  blobSize: 26,         // % of half the picture's short side
  blobSoft: 55,         // %
  noiseScale: 40,       // % of the picture's short side to a lump
  noiseOctaves: 2,
  noiseWarp: 0,         // %
  rippleLen: 55,        // mm
  rippleSources: 2,
  rippleSpread: 70,     // %
  fnExpr: 'sin(5*x)*sin(5*y)',
  word: 'OP',
  wordSize: 80,         // % of the picture's height
  wordFace: 'sans',
  evenTone: 45,         // %

  // its tones
  invert: false,
  level: 0,             // %
  contrast: 0,          // %
  gamma: 100,           // %
  bands: 0,
  soften: 0,            // mm
  rims: 0,              // %
  rimWidth: 8,          // mm

  // the echo
  echo: 'patches',
  echoShare: 22,        // % of the pillows, or of the sheet
  echoFrom: 25,         // % — the band of tones
  echoTo: 70,
  echoEvery: 4,
  echoX: 0,             // % of half the picture, from its middle
  echoY: 0,
  echoR: 45,            // % of half the picture's short side
  echoReplace: true,    // the lines stop where the echo is drawn
  echoInk: 'solid',
  echoWidth: 100,       // % of the lines' own width
  echoAdd: 0,           // % of the pitch, on top
  echoShift: 0,         // % of the pitch, across
  echoLean: 0,          // % of the pitch
  echoTurn: 0,          // °
  echoPitch: 100,       // % of the lines' pitch

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
  { label: 'Pillows, one of them red', s: {} },
  { label: 'Pillows, black only', s: { echo: 'none' } },
  { label: 'A red shadow leaning out', s: {
      echo: 'everywhere', echoReplace: false, echoWidth: 100, echoAdd: 10, echoLean: 70,
      echoInk: 'outline', wide: 78 } },
  { label: 'Red between the black', s: {
      echo: 'tone band', echoFrom: 0, echoTo: 45, echoReplace: false, echoShift: 50,
      echoInk: 'solid', echoWidth: 60, echoAdd: 6, pitch: 4.2, wide: 80 } },
  { label: 'Hollow ribbons', s: { ink: 'outline', echo: 'none', pitch: 3, wide: 82 } },
  { label: 'Onions — passes left open', s: { passes: 300, pitch: 5, wide: 92, echo: 'none' } },
  { label: 'Fans', s: { ink: 'fan', passes: 300, pitch: 5, wide: 92, echo: 'none' } },
  { label: 'Zigzag', s: { ink: 'zigzag', stitch: 1.1, pitch: 5.5, wide: 88, echoInk: 'zigzag' } },
  { label: 'Ladders', s: {
      ink: 'ladder', stitch: 1.4, pitch: 7, wide: 84, echo: 'none', cols: 2, rows: 2 } },
  { label: 'Lens — hairlines only pushed aside', s: {
      thin: 14, wide: 14, bulge: 900, pitch: 2.2, echo: 'none', pillowSoft: 70, haloWidth: 40,
      ground: 45, pillowDome: 0, pillowDark: 0 } },
  { label: 'Pillows in relief — swollen and crowded', s: {
      thin: 12, wide: 40, bulge: 500, pitch: 2.6, echo: 'none', pillowSoft: 70, haloWidth: 40,
      ground: 45, pillowDome: 0 } },
  { label: 'Leaning into the dark', s: {
      lean: 90, pitch: 3.8, wide: 80, echo: 'none', pillowSoft: 45 } },
  { label: 'Level lines over terraces of noise', s: {
      angle: 90, source: 'noise', noiseScale: 55, noiseOctaves: 2, noiseWarp: 60, bands: 5,
      soften: 1.5, pitch: 3, echo: 'tone band', echoFrom: 40, echoTo: 60 } },
  { label: 'Rings over blobs', s: {
      carrier: 'rings', source: 'blobs', blobs: 12, blobSize: 34, invert: true, pitch: 3.6,
      wide: 84, echo: 'disc', echoR: 30, echoX: -6, echoY: 34 } },
  { label: 'Sunburst over ripples', s: {
      carrier: 'rays', source: 'ripples', rippleSources: 1, rippleSpread: 0, rippleLen: 46,
      pitch: 3.2, hole: 6, wide: 80, echo: 'every n-th line', echoEvery: 6 } },
  { label: 'One spiral, one stroke at heart', s: {
      carrier: 'spiral', source: 'pillows', cols: 2, rows: 2, uneven: 30, pitch: 3.6,
      wide: 84, echo: 'none' } },
  { label: 'Egg crate', s: {
      source: 'formula', fnExpr: 'sin(5*x)*sin(5*y)', pitch: 3, angle: 45, wide: 86,
      echo: 'tone band', echoFrom: 0, echoTo: 30 } },
  { label: 'Pinwheel in rings', s: {
      carrier: 'rings', source: 'formula', fnExpr: 'sin(9*r - 3*a)', pitch: 3.2, wide: 84,
      echo: 'none' } },
  { label: 'A word', s: {
      source: 'word', word: 'OP', wordSize: 86, soften: 4, pitch: 3, wide: 88, thin: 0,
      echo: 'tone band', echoFrom: 8, echoTo: 55 } },
  { label: 'Curtain', s: {
      waveAmp: 5, waveLen: 110, waveShift: 3, pitch: 3.6, echo: 'none', cols: 4, rows: 3 } },
  { label: 'Moiré — two gratings a few degrees apart', s: {
      source: 'even', evenTone: 34, pitch: 2.6, echo: 'everywhere', echoReplace: false,
      echoTurn: 4, echoPen: 2 } },
  { label: 'Beats — the echo a little wider apart', s: {
      echo: 'everywhere', echoReplace: false, echoPitch: 106, echoInk: 'hairline',
      pitch: 3, wide: 70 } },
  { label: 'Your photo, in level lines', s: {
      source: 'photo', angle: 90, pitch: 2.4, wide: 92, echo: 'none', gamma: 120, soften: 1.2,
      minPiece: 1.2 } },
  { label: 'Your photo, in one spiral', s: {
      source: 'photo', carrier: 'spiral', pitch: 2.6, wide: 92, echo: 'none', gamma: 120,
      soften: 1.2, minPiece: 1.2 } },
  { label: 'Silver and white markers on black', s: {
      paper: 'B2', paperTone: 'black', paperColor: PAPER_TONES.black, linePen: 5, echoPen: 4,
      invert: true, pitch: 20, wide: 86, thin: 0, liftBelow: 4, echo: 'patches',
      echoShare: 35, minPiece: 4, detail: 1 } },
];

const setters   = {};
const fieldDivs = {};
let statsDiv, linkDiv, penListDiv, layerButtons = {}, penSelects = [], slotSwatches = [];
let photoNote, fnNote;

let area    = null;          // the margin box, in mm — the picture
let shapes  = null;          // { pts, off, ink, lay } — polylines in mm
let strokes = 0;
let plan    = null;          // { order, flip, ink, travel, downs }
let perPen  = null;
let perLayer = null;
let lastMs  = 0;
let fieldMs = 0;
let drag    = null;
let COUNTS  = null;          // { lines, pieces, passes, widest }

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
  updateFnNote();
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

// The room inside the margin: the picture, and what the lines are cut to.
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
  // two pixels to a preview point whatever the screen: passes a fraction of a pixel apart
  // smear into bands otherwise
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
// The picture
//
// Whatever the lines swell with is painted first into a grid of greys laid over the margin
// box — 0 is paper, 1 is ink — and read back between its cells, so a line costs the same
// whatever the picture is made of. The picture has a place of its own: it can be slid,
// enlarged and turned under the lines. A source paints its raw tones; then they are
// softened, given rims, levelled, bent by a gamma and cut into bands.
//
// With the echo in patches there is a second grid beside it: how far inside a chosen
// pillow a place is — or, for the other sources, inside a blot of noise.

let FIELD = null;            // { T, M, w, h, x0, y0, c, env, mean, note, pillows }
let fieldKeyNow = '';
let PHOTO = null;            // { img, name, ver }
let photoVer = 0;
let PHOTO_GREY = null, photoGreyVer = -1;

const FIELD_KEYS = ['paper', 'orientation', 'customW', 'customH', 'margin', 'seed', 'source',
  'fieldX', 'fieldY', 'fieldZoom', 'fieldTurn', 'cols', 'rows', 'uneven', 'loose', 'stagger',
  'pillowFill', 'pillowRound', 'pillowSoft', 'pillowDome', 'ground', 'pillowLight',
  'pillowDark', 'pillowBias', 'pillowTones', 'pillowSkip', 'halo', 'haloWidth', 'blobs',
  'blobSize', 'blobSoft', 'noiseScale', 'noiseOctaves', 'noiseWarp', 'rippleLen',
  'rippleSources', 'rippleSpread', 'fnExpr', 'word', 'wordSize', 'wordFace', 'evenTone',
  'invert', 'level', 'contrast', 'gamma', 'bands', 'soften', 'rims', 'rimWidth',
  'echo', 'echoShare'];

function ensureField(coarse) {
  const key = FIELD_KEYS.map(k => settings[k]).join('|') + `|${photoVer}|${coarse ? 1 : 0}`;
  if (FIELD && key === fieldKeyNow) return;
  const t0 = performance.now();
  fieldKeyNow = key;
  FIELD = makeField(coarse);
  fieldMs = performance.now() - t0;
}

function makeField(coarse) {
  const s = settings, A = area;
  const x0 = A.x0 - FIELD_PAD, y0 = A.y0 - FIELD_PAD;
  const Wm = A.w + 2 * FIELD_PAD, Hm = A.h + 2 * FIELD_PAD;
  const c = Math.max(0.25, Math.sqrt(Wm * Hm / FIELD_CELLS)) * (coarse ? 2 : 1);
  const w = Math.max(2, Math.ceil(Wm / c)), h = Math.max(2, Math.ceil(Hm / c));
  const z = clamp(s.fieldZoom, MIN_ZOOM, MAX_ZOOM) / 100, th = rad(s.fieldTurn);
  const F = {
    T: new Float32Array(w * h), M: null, w, h, x0, y0, c, mean: 0, note: '', pillows: 0,
    // where a place on the paper is in the picture: mm from its middle, before the zoom
    env: {
      hw: A.w / 2, hh: A.h / 2, S: Math.min(A.w, A.h) / 2, z, th,
      cx: (A.x0 + A.x1) / 2 + s.fieldX, cy: (A.y0 + A.y1) / 2 + s.fieldY,
      ct: Math.cos(th) / z, st: Math.sin(th) / z,
    },
  };
  switch (s.source) {
    case 'pillows': paintPillows(F); break;
    case 'blobs':   paintBlobs(F); break;
    case 'noise':   paintNoise(F); break;
    case 'ripples': paintRipples(F); break;
    case 'formula': paintFormula(F); break;
    case 'word':    paintWord(F); break;
    case 'photo':   paintPhoto(F); break;
    default:        F.T.fill(clamp(s.evenTone, 0, 100) / 100);
  }
  shapeField(F);
  if (s.echo === 'patches' && !F.M) paintBlots(F);
  return F;
}

// Every cell of a grid, given its place in the picture.
function paintEach(F, into, fn) {
  const E = F.env, w = F.w, c = F.c;
  for (let j = 0; j < F.h; j++) {
    const dy = F.y0 + (j + 0.5) * c - E.cy;
    const dx = F.x0 + 0.5 * c - E.cx;
    let qx = dx * E.ct + dy * E.st, qy = -dx * E.st + dy * E.ct;
    const o = j * w, ix = c * E.ct, iy = -c * E.st;
    for (let i = 0; i < w; i++) {
      into[o + i] = fn(qx, qy);
      qx += ix; qy += iy;
    }
  }
}

// The cells a box of the picture — given by its middle and half-sizes — can fall on.
const SPAN = new Int32Array(4);

function cellSpan(F, qx, qy, bx, by) {
  const E = F.env, co = Math.cos(E.th) * E.z, si = Math.sin(E.th) * E.z;
  const px = E.cx + qx * co - qy * si, py = E.cy + qx * si + qy * co;
  const ex = Math.abs(bx * co) + Math.abs(by * si), ey = Math.abs(bx * si) + Math.abs(by * co);
  SPAN[0] = Math.max(0, Math.floor((px - ex - F.x0) / F.c));
  SPAN[1] = Math.min(F.w - 1, Math.ceil((px + ex - F.x0) / F.c));
  SPAN[2] = Math.max(0, Math.floor((py - ey - F.y0) / F.c));
  SPAN[3] = Math.min(F.h - 1, Math.ceil((py + ey - F.y0) / F.c));
  return SPAN[0] <= SPAN[1] && SPAN[2] <= SPAN[3];
}

// A value of a grid at a place on the paper, between its cells.
function gridAt(G, x, y) {
  const F = FIELD, w = F.w;
  let u = (x - F.x0) / F.c - 0.5, v = (y - F.y0) / F.c - 0.5;
  if (u < 0) u = 0; else if (u > w - 1.001) u = w - 1.001;
  if (v < 0) v = 0; else if (v > F.h - 1.001) v = F.h - 1.001;
  const i = u | 0, j = v | 0, fu = u - i, fv = v - j, o = j * w + i;
  const a = G[o] + (G[o + 1] - G[o]) * fu;
  const b = G[o + w] + (G[o + w + 1] - G[o + w]) * fu;
  return a + (b - a) * fv;
}

function toneAt(x, y) { return gridAt(FIELD.T, x, y); }

// The value a share of the grid lies under.
function gridQuantile(G, share) {
  const step = Math.max(1, Math.floor(G.length / 20000));
  const pick = [];
  for (let i = 0; i < G.length; i += step) pick.push(G[i]);
  pick.sort((a, b) => a - b);
  return pick[clamp(Math.round(share * (pick.length - 1)), 0, pick.length - 1)];
}

// No formula knows its own range: stretch what it gave from its 2nd to its 98th hundredth.
function levelGrid(G) {
  const lo = gridQuantile(G, 0.02), hi = gridQuantile(G, 0.98), k = hi - lo > 1e-9 ? 1 / (hi - lo) : 0;
  for (let i = 0; i < G.length; i++) G[i] = k ? clamp((G[i] - lo) * k, 0, 1) : 0.5;
}

// Three box blurs each way — as good as a Gaussian of about r cells.
function blurGrid(src, w, h, r) {
  r = clamp(Math.round(r), 1, Math.max(1, Math.min(w, h) >> 1));
  let a = Float32Array.from(src);
  const b = new Float32Array(src.length), k = 1 / (2 * r + 1);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) {
      const o = y * w;
      let sum = 0;
      for (let x = -r; x <= r; x++) sum += a[o + clamp(x, 0, w - 1)];
      for (let x = 0; x < w; x++) {
        b[o + x] = sum * k;
        sum += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += b[clamp(y, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = sum * k;
        sum += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}

function shapeField(F) {
  const s = settings, T = F.T, n = T.length;
  if (s.invert) for (let i = 0; i < n; i++) T[i] = 1 - T[i];
  if (s.soften > 0) T.set(blurGrid(T, F.w, F.h, s.soften / F.c));
  if (s.rims !== 0) {
    const B = blurGrid(T, F.w, F.h, Math.max(0.5, s.rimWidth) / F.c), k = s.rims / 100;
    for (let i = 0; i < n; i++) T[i] += k * (T[i] - B[i]);
  }
  const lv = s.level / 100, ct = Math.max(0, 1 + s.contrast / 100), g = Math.max(0.05, s.gamma / 100);
  const bands = Math.round(s.bands);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    let v = clamp((T[i] - 0.5) * ct + 0.5 + lv, 0, 1);
    if (g !== 1) v = Math.pow(v, g);
    if (bands >= 2) v = Math.min(bands - 1, Math.floor(v * bands)) / (bands - 1);
    T[i] = v;
    sum += v;
  }
  F.mean = sum / n;
}

// Blots of slow noise, as much of the sheet as asked for — where the echo goes when the
// picture has no pillows to choose from.
function paintBlots(F) {
  const M = F.M = new Float32Array(F.T.length), k = 1 / (F.env.S * 0.8);
  paintEach(F, M, (qx, qy) => NZW(qx * k + 11.3, qy * k - 7.7, 2.5));
  const cut = gridQuantile(M, 1 - clamp(settings.echoShare, 0, 100) / 100);
  for (let i = 0; i < M.length; i++) M[i] = (M[i] - cut) * 100;
}

// Pillows: the picture's frame cut into rows and each row into cells, unevenly; in every
// cell a rounded box with a soft edge, light or grey inside, a dark rim round it. The grid
// goes on past the frame for ever, each frame of it cut differently, so sliding the picture
// or shrinking it brings new pillows in.
function paintPillows(F) {
  const s = settings, E = F.env, T = F.T, w = F.w, c = F.c;
  const W = 2 * E.hw, H = 2 * E.hh;
  const cols = clamp(Math.round(s.cols), 1, 60), rows = clamp(Math.round(s.rows), 1, 60);
  const un = clamp(s.uneven, 0, 100) / 100;
  const fill = clamp(s.pillowFill, 5, 140) / 100, roundK = clamp(s.pillowRound, 0, 100) / 100;
  const dome = clamp(s.pillowDome, -100, 100) / 100, halo = clamp(s.halo, 0, 100) / 100;
  const light = s.pillowLight / 100, dark = s.pillowDark / 100;
  const bias = Math.exp(-s.pillowBias / 40), tones = Math.round(s.pillowTones);
  const skip = s.pillowSkip / 100, share = s.echoShare / 100;
  T.fill(clamp(s.ground, 0, 100) / 100);
  const R = halo > 0 ? new Float32Array(T.length) : null;                  // the rims
  const M = s.echo === 'patches' ? new Float32Array(T.length).fill(-50) : null;

  // what of the endless grid the sheet can see, measured from the frame's corner
  let qx0 = Infinity, qx1 = -Infinity, qy0 = Infinity, qy1 = -Infinity;
  for (let k = 0; k < 4; k++) {
    const dx = F.x0 + (k & 1 ? w * c : 0) - E.cx, dy = F.y0 + (k & 2 ? F.h * c : 0) - E.cy;
    const qx = dx * E.ct + dy * E.st + E.hw, qy = -dx * E.st + dy * E.ct + E.hh;
    qx0 = Math.min(qx0, qx); qx1 = Math.max(qx1, qx);
    qy0 = Math.min(qy0, qy); qy1 = Math.max(qy1, qy);
  }
  const cuts = (n, a, b, salt) => {          // n + 1 places from 0 to 1, unevenly apart
    const out = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) out[i + 1] = out[i] + 1 + 0.9 * un * (2 * hash01(i + 977 * a, b, salt) - 1);
    for (let i = 1; i <= n; i++) out[i] /= out[n];
    return out;
  };

  // every pillow in sight, before any is painted
  const list = [];
  const pillow = (xa, ya, xb, yb, I, J) => {
    if (hash01(I, J, 23) < skip) return;
    const pcx = (xa + xb) / 2 - E.hw, pcy = (ya + yb) / 2 - E.hh;
    const bx = (xb - xa) / 2 * fill, by = (yb - ya) / 2 * fill, k = Math.min(bx, by);
    if (k < 0.05) return;
    const rr = roundK * k, soft = Math.max(1e-3, s.pillowSoft / 100 * k);
    const sig = Math.max(1e-3, s.haloWidth / 100 * k * 0.6), h0 = sig * 0.5;
    const rim = halo > 0 ? h0 + 1.5 * sig : soft * 0.5;      // where a chosen pillow ends
    const reach = Math.max(soft, rim, halo > 0 ? h0 + 2.6 * sig : 0);
    if (!cellSpan(F, pcx, pcy, bx + reach, by + reach)) return;
    let u = Math.pow(hash01(I, J, 11), bias);
    if (tones >= 2) u = Math.min(tones - 1, Math.floor(u * tones)) / (tones - 1);
    // its middle on the paper: only the ones that lie in the picture are counted
    const mx = E.cx + E.z * (pcx * Math.cos(E.th) - pcy * Math.sin(E.th));
    const my = E.cy + E.z * (pcx * Math.sin(E.th) + pcy * Math.cos(E.th));
    list.push({
      pcx, pcy, bx, by, k, rr, soft, sig, h0, rim, reach, tone: light + (dark - light) * u,
      pick: hash01(I, J, 37), chosen: false,
      inside: mx > area.x0 && mx < area.x1 && my > area.y0 && my < area.y1,
    });
  };

  const paint = p => {
    const { pcx, pcy, bx, by, k, rr, soft, sig, h0, rim, reach, tone, chosen } = p;
    cellSpan(F, pcx, pcy, bx + reach, by + reach);
    const i0 = SPAN[0], i1 = SPAN[1], j0 = SPAN[2], j1 = SPAN[3];
    const ix = c * E.ct, iy = -c * E.st;
    for (let j = j0; j <= j1; j++) {
      const dy = F.y0 + (j + 0.5) * c - E.cy, dx = F.x0 + (i0 + 0.5) * c - E.cx;
      let qx = dx * E.ct + dy * E.st - pcx, qy = -dx * E.st + dy * E.ct - pcy;
      for (let i = i0, o = j * w + i0; i <= i1; i++, o++, qx += ix, qy += iy) {
        const ax = Math.abs(qx) - (bx - rr), ay = Math.abs(qy) - (by - rr);
        const ox = ax > 0 ? ax : 0, oy = ay > 0 ? ay : 0;
        const sd = Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(ax, ay), 0) - rr;
        if (sd >= reach) continue;
        if (sd < soft) {
          // a hump with no crease in it: 1 in the middle, 0 at the sides of the box
          const u = qx / bx, v = qy / by, d = Math.max(0, 1 - u * u) * Math.max(0, 1 - v * v);
          const inside = dome >= 0 ? tone * (1 - dome * d) : tone + (1 - tone) * -dome * d;
          T[o] += (inside - T[o]) * (1 - sstep(-soft, soft, sd));
        }
        if (R) {
          // rims that meet darken each other, so no seam is left where one takes over
          const e = (sd - h0) / sig;
          R[o] = 1 - (1 - R[o]) * (1 - halo * Math.exp(-e * e));
        }
        if (chosen && rim - sd > M[o]) M[o] = rim - sd;
      }
    }
  };

  // a cell further than can be seen, for the rims that reach in
  const pj0 = Math.floor((qy0 - H / rows) / H), pj1 = Math.floor((qy1 + H / rows) / H);
  rowsLoop:
  for (let pj = pj0; pj <= pj1; pj++) {
    const rc = cuts(rows, pj, 0, 3);
    for (let r = 0; r < rows; r++) {
      const ya = (pj + rc[r]) * H, yb = (pj + rc[r + 1]) * H;
      if (yb < qy0 - (yb - ya) || ya > qy1 + (yb - ya)) continue;
      const J = pj * rows + r;
      const slid = (J & 1) ? s.stagger / 100 * W / cols : 0;
      const pi0 = Math.floor((qx0 - slid - W / cols) / W), pi1 = Math.floor((qx1 - slid + W / cols) / W);
      for (let pi = pi0; pi <= pi1; pi++) {
        const cc = cuts(cols, pi, s.loose ? J : 0, 5);
        for (let q = 0; q < cols; q++) {
          if (list.length > 8000) { F.note = 'more pillows than can be painted'; break rowsLoop; }
          pillow((pi + cc[q]) * W + slid, ya, (pi + cc[q + 1]) * W + slid, yb, pi * cols + q, J);
        }
      }
    }
  }
  // The echo's pillows: of those lying in the picture, the share asked for and never
  // fewer than one; of those only looking in over its edge, each as luck has it.
  if (M && share > 0) {
    const seen = list.filter(p => p.inside).sort((p, q) => p.pick - q.pick);
    const want = Math.max(1, Math.round(share * seen.length));
    seen.forEach((p, i) => { p.chosen = i < want; });
    for (const p of list) if (!p.inside) p.chosen = p.pick < share;
  }
  for (const p of list) paint(p);
  F.pillows = list.length;
  if (R) for (let i = 0; i < T.length; i++) T[i] += (1 - T[i]) * R[i];
  F.M = M;
}

// Blobs: light balls in the dark, where they please.
function paintBlobs(F) {
  const s = settings, E = F.env, T = F.T, w = F.w, c = F.c, rnd = rng(41);
  const n = clamp(Math.round(s.blobs), 1, 500);
  const p = 0.35 + 3 * clamp(s.blobSoft, 0, 100) / 100;
  const acc = new Float32Array(T.length);
  const co = Math.cos(E.th) * E.z, si = Math.sin(E.th) * E.z;
  for (let b = 0; b < n; b++) {
    const qx = (rnd() * 2 - 1) * E.hw, qy = (rnd() * 2 - 1) * E.hh;
    const r = Math.max(0.5, s.blobSize / 100 * E.S * (0.55 + 0.9 * rnd()));
    if (!cellSpan(F, qx, qy, r, r)) continue;
    const px = E.cx + qx * co - qy * si, py = E.cy + qx * si + qy * co, rp = r * E.z, k = 1 / (rp * rp);
    for (let j = SPAN[2]; j <= SPAN[3]; j++) {
      const dy = F.y0 + (j + 0.5) * c - py;
      for (let i = SPAN[0]; i <= SPAN[1]; i++) {
        const dx = F.x0 + (i + 0.5) * c - px, d = (dx * dx + dy * dy) * k;
        if (d < 1) acc[j * w + i] += Math.pow(1 - d, p);
      }
    }
  }
  for (let i = 0; i < T.length; i++) T[i] = 1 - Math.min(1, acc[i]);
}

function paintNoise(F) {
  const s = settings, E = F.env;
  const k = 1 / Math.max(1, s.noiseScale / 100 * E.S * 2);
  const oct = clamp(Math.round(s.noiseOctaves), 1, 6), wp = s.noiseWarp / 100;
  paintEach(F, F.T, (qx, qy) => {
    let x = qx * k, y = qy * k;
    if (wp) {
      const a = NZW(x * 0.7 + 5.1, y * 0.7 - 3.3, 0.5), b = NZW(x * 0.7 - 8.4, y * 0.7 + 1.7, 4.5);
      x += wp * a * 1.5; y += wp * b * 1.5;
    }
    return fbm(NZ, x, y, 0.37, oct);
  });
  levelGrid(F.T);
}

// Ripples from one stone or several, meeting.
function paintRipples(F) {
  const s = settings, E = F.env, rnd = rng(53);
  const n = clamp(Math.round(s.rippleSources), 1, 8), sp = s.rippleSpread / 100;
  const k = 2 * Math.PI / Math.max(1, s.rippleLen);
  const xs = [], ys = [];
  for (let i = 0; i < n; i++) {
    xs.push((rnd() * 2 - 1) * E.hw * sp);
    ys.push((rnd() * 2 - 1) * E.hh * sp);
  }
  paintEach(F, F.T, (qx, qy) => {
    let v = 0;
    for (let i = 0; i < n; i++) v += Math.cos(k * Math.hypot(qx - xs[i], qy - ys[i]));
    return 0.5 + 0.5 * v / n;
  });
  if (n > 1) levelGrid(F.T);
}

// A formula typed in: only numbers, the coordinates and the functions of Math, so a link
// cannot carry anything else.
const FN_ALLOWED = new Set(['x', 'y', 'r', 'a', 'sin', 'cos', 'tan', 'asin', 'acos',
  'atan', 'atan2', 'sinh', 'cosh', 'tanh', 'exp', 'log', 'sqrt', 'cbrt', 'abs', 'min', 'max',
  'floor', 'ceil', 'round', 'sign', 'pow', 'hypot', 'fract', 'mod', 'clamp', 'mix', 'step',
  'smoothstep', 'noise', 'pi', 'PI', 'tau', 'TAU', 'e', 'E']);

let fnCache = { src: null, out: null };

function compileExpr(str) {
  const src = String(str || '').trim();
  if (fnCache.src === src) return fnCache.out;
  const done = out => { fnCache = { src, out }; return out; };
  if (!src) return done({ err: 'nothing typed' });
  if (src.length > 500) return done({ err: 'too long' });
  if (!/^[0-9A-Za-z_+\-*/%^()., <>=!?:&|\t]*$/.test(src)) {
    return done({ err: 'only numbers, x y r a, + − * / ^ % ( ) and functions' });
  }
  for (const id of src.match(/[A-Za-z_][A-Za-z_0-9]*/g) || []) {
    if (!FN_ALLOWED.has(id)) return done({ err: `unknown name “${id}”` });
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
    fn = new Function('x', 'y', 'r', 'a', 'noise', body);
  } catch (e) {
    return done({ err: 'cannot read it — ' + e.message });
  }
  try {
    if (typeof fn(0.31, -0.22, 0.38, -0.62, () => 0.1) !== 'number') return done({ err: 'it gives no number' });
  } catch (e) {
    return done({ err: e.message });
  }
  return done({ fn });
}

function paintFormula(F) {
  const cpl = compileExpr(settings.fnExpr);
  if (cpl.err) { F.note = cpl.err; F.T.fill(0.5); return; }
  const k = 1 / F.env.S, fn = cpl.fn, nz = (x, y, z) => NZ(x || 0, y || 0, z || 0);
  paintEach(F, F.T, (qx, qy) => {
    const x = qx * k, y = -qy * k;
    let v;
    try { v = fn(x, y, Math.hypot(x, y), Math.atan2(y, x), nz); } catch (e) { v = 0; }
    return Number.isFinite(v) ? v : 0;
  });
  levelGrid(F.T);
}

const FACE_FONTS = {
  sans:  '900 SIZEpx "Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif',
  serif: '700 SIZEpx Georgia, "Times New Roman", Times, serif',
  mono:  '700 SIZEpx Menlo, Consolas, "Courier New", monospace',
};

// A word, set large; a bar | starts a new line.
function paintWord(F) {
  const s = settings, E = F.env;
  const cv = document.createElement('canvas');
  cv.width = F.w; cv.height = F.h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, F.w, F.h);
  ctx.fillStyle = '#000';
  ctx.setTransform(1 / F.c, 0, 0, 1 / F.c, -F.x0 / F.c, -F.y0 / F.c);
  ctx.translate(E.cx, E.cy);
  ctx.rotate(E.th);
  ctx.scale(E.z, E.z);
  const rowsOf = String(s.word || '').split('|').map(t => t.trim()).filter(t => t);
  const n = Math.max(1, rowsOf.length);
  const size = Math.max(2, s.wordSize / 100 * 2 * E.hh / n);
  ctx.font = (FACE_FONTS[s.wordFace] || FACE_FONTS.sans).replace('SIZE', size.toFixed(2));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  rowsOf.forEach((t, i) => ctx.fillText(t, 0, (i - (n - 1) / 2) * size * 0.98 + size * 0.36));
  const d = ctx.getImageData(0, 0, F.w, F.h).data;
  for (let i = 0; i < F.T.length; i++) F.T[i] = 1 - d[4 * i] / 255;
}

// The photograph in greys, at most 900 px along its longer side.
function photoGrey() {
  if (!PHOTO) return null;
  if (PHOTO_GREY && photoGreyVer === PHOTO.ver) return PHOTO_GREY;
  const img = PHOTO.img, k = Math.min(1, 900 / Math.max(img.width, img.height));
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

// The photograph laid over the frame and cut to cover it; past its edge there is paper.
// With none loaded, a ball of shade keeps the sheet from being empty.
function paintPhoto(F) {
  const P = photoGrey(), E = F.env;
  if (!P) {
    paintEach(F, F.T, (qx, qy) => 0.9 * (1 - sstep(0.15, 1.05, Math.hypot(qx, qy) / E.S)));
    return;
  }
  const k = Math.min(P.w / (2 * E.hw), P.h / (2 * E.hh)), L = P.L, pw = P.w, ph = P.h;
  paintEach(F, F.T, (qx, qy) => {
    const x = pw / 2 + qx * k - 0.5, y = ph / 2 + qy * k - 0.5;
    if (x < -0.5 || y < -0.5 || x > pw - 0.5 || y > ph - 0.5) return 0;
    const xc = clamp(x, 0, pw - 1), yc = clamp(y, 0, ph - 1);
    const x0 = Math.floor(xc), y0 = Math.floor(yc);
    const x1 = Math.min(pw - 1, x0 + 1), y1 = Math.min(ph - 1, y0 + 1);
    const fx = xc - x0, fy = yc - y0;
    const a = L[y0 * pw + x0] + (L[y0 * pw + x1] - L[y0 * pw + x0]) * fx;
    const b = L[y1 * pw + x0] + (L[y1 * pw + x1] - L[y1 * pw + x0]) * fx;
    return 1 - (a + (b - a) * fy);
  });
}

////////////////////////////////////////////////////////////////////////////////////////
// The lines
//
// A carrier is a family of lines a pitch apart: straight ones, rings, rays or the arms of
// a spiral. Each is walked in small steps, and at every step it gives a place, the
// direction across it — the way it will swell — the distance to its neighbour there and
// how far along it the place is.

let LN = 0;                  // readings on the line in hand
let BX = new Float64Array(4096), BY = new Float64Array(4096);
let NX = new Float64Array(4096), NY = new Float64Array(4096);
let PP = new Float64Array(4096), SA = new Float64Array(4096);

function lineRoom(n) {
  if (BX.length >= n) return;
  const grow = a => { const b = new Float64Array(n * 2); b.set(a); return b; };
  BX = grow(BX); BY = grow(BY); NX = grow(NX); NY = grow(NY); PP = grow(PP); SA = grow(SA);
}

// The middle the rings, the rays and the spiral go round.
function carrierCentre() {
  const A = area, s = settings;
  return [(A.x0 + A.x1) / 2 + s.centreX / 100 * A.w / 2, (A.y0 + A.y1) / 2 + s.centreY / 100 * A.h / 2];
}

function eachLine(opt, fn) {
  const s = settings, A = area;
  const P = clamp(s.pitch * opt.pitchK, 0.2, 1000);
  const ds = clamp(s.detail, 0.1, 10) * (opt.coarse ? 2 : 1);
  const fcx = (A.x0 + A.x1) / 2, fcy = (A.y0 + A.y1) / 2;
  const [ccx, ccy] = carrierCentre();
  const X = { x0: A.x0 - opt.reach, y0: A.y0 - opt.reach, x1: A.x1 + opt.reach, y1: A.y1 + opt.reach };
  const th = rad(s.angle + opt.turn);
  // the farthest and the nearest the box gets from the middle
  const far = Math.max(Math.hypot(X.x0 - ccx, X.y0 - ccy), Math.hypot(X.x1 - ccx, X.y0 - ccy),
                       Math.hypot(X.x0 - ccx, X.y1 - ccy), Math.hypot(X.x1 - ccx, X.y1 - ccy));
  const near = Math.hypot(Math.max(X.x0 - ccx, 0, ccx - X.x1), Math.max(X.y0 - ccy, 0, ccy - X.y1));
  // a straight stretch from (ox, oy) along (dx, dy), kept to the box, read every ds
  const straight = (ox, oy, dx, dy, t0, t1, nx, ny, pitchAt) => {
    if (!clipSeg(X, ox + dx * t0, oy + dy * t0, ox + dx * t1, oy + dy * t1)) return false;
    const a = Math.floor(((CLIP_OUT[0] - ox) * dx + (CLIP_OUT[1] - oy) * dy) / ds);
    const b = Math.ceil(((CLIP_OUT[2] - ox) * dx + (CLIP_OUT[3] - oy) * dy) / ds);
    const n = b - a + 1;
    if (n < 2) return false;
    lineRoom(n);
    for (let k = 0; k < n; k++) {
      const t = (a + k) * ds;
      BX[k] = ox + dx * t; BY[k] = oy + dy * t; NX[k] = nx; NY[k] = ny;
      PP[k] = pitchAt ? pitchAt(t) : P; SA[k] = t;
    }
    LN = n;
    return true;
  };

  switch (s.carrier) {
    case 'rings': {
      const hole = Math.max(0.3, s.hole, near - P);
      for (let j = 0; j < 20000; j++) {
        const r = (j + opt.shift) * P;
        if (r > far) break;
        if (r < hole) continue;
        const n = Math.max(12, Math.ceil(2 * Math.PI * r / ds)) + 1;
        const a0 = hash01(j, 7, 91) * 2 * Math.PI;     // the seam, never twice in one place
        lineRoom(n);
        for (let k = 0; k < n; k++) {
          const a = a0 + 2 * Math.PI * k / (n - 1), co = Math.cos(a), si = Math.sin(a);
          BX[k] = ccx + r * co; BY[k] = ccy + r * si; NX[k] = co; NY[k] = si;
          PP[k] = P; SA[k] = r * (a - a0);
        }
        LN = n;
        fn(j);
      }
      break;
    }
    case 'rays': {
      const n = clamp(Math.round(2 * Math.PI * (Math.min(A.w, A.h) / 4) / P), 3, 4000);
      const k = 2 * Math.PI / n, r0 = Math.max(0.5, s.hole);
      for (let j = 0; j < n; j++) {
        const a = th + (j + opt.shift) * k, dx = Math.sin(a), dy = -Math.cos(a);
        if (straight(ccx, ccy, dx, dy, r0, Math.max(r0 + 1, far), Math.cos(a), Math.sin(a),
                     t => Math.max(0.05, t * k))) fn(j);
      }
      break;
    }
    case 'spiral': {
      const m = clamp(Math.round(s.arms), 1, 48);
      const k = 2 * Math.PI / (P * m);                 // the turn that comes with a mm outward
      const r0 = Math.max(s.hole, P * 0.25);
      for (let arm = 0; arm < m; arm++) {
        const a0 = th + (arm + opt.shift) * 2 * Math.PI / m;
        let r = r0, n = 0, sa = 0;
        while (r <= far && n < 3_000_000) {
          lineRoom(n + 1);
          const a = a0 + r * k, co = Math.cos(a), si = Math.sin(a);
          BX[n] = ccx + r * co; BY[n] = ccy + r * si; NX[n] = co; NY[n] = si;
          PP[n] = P; SA[n] = sa;
          r += ds / Math.sqrt(1 + r * k * r * k);
          sa += ds;
          n++;
        }
        LN = n;
        if (n >= 2) fn(arm);
      }
      break;
    }
    default: {
      const dx = Math.sin(th), dy = -Math.cos(th), nx = Math.cos(th), ny = Math.sin(th);
      const R = Math.hypot(A.w, A.h) / 2 + opt.reach + P;
      const J = Math.ceil(R / P) + 1;
      for (let j = -J; j <= J; j++) {
        const off = (j + opt.shift) * P;
        if (straight(fcx + nx * off, fcy + ny * off, dx, dy, -R, R, nx, ny, null)) fn(j);
      }
    }
  }
}

// Where the echo goes: more than 0 inside, less outside, and running through 0 at the edge
// so the place a line crosses it can be found between two readings.
function makeMask() {
  const s = settings, A = area;
  switch (s.echo) {
    case 'patches': {
      const M = FIELD.M;
      return M ? (x, y) => gridAt(M, x, y) : () => 1;
    }
    case 'tone band': {
      const lo = Math.min(s.echoFrom, s.echoTo) / 100, hi = Math.max(s.echoFrom, s.echoTo) / 100;
      const a = lo <= 0 ? -1 : lo, b = hi >= 1 ? 2 : hi;
      return (x, y, T) => Math.min(T - a, b - T);
    }
    case 'every n-th line': {
      const n = Math.max(1, Math.round(s.echoEvery));
      return (x, y, T, j) => (((j % n) + n) % n === 0 ? 1 : -1);
    }
    case 'disc': {
      const cx = (A.x0 + A.x1) / 2 + s.echoX / 100 * A.w / 2;
      const cy = (A.y0 + A.y1) / 2 + s.echoY / 100 * A.h / 2;
      const R = s.echoR / 100 * Math.min(A.w, A.h) / 2;
      return (x, y) => R - Math.hypot(x - cx, y - cy);
    }
    default: return () => 1;
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// From a line to ink
//
// A line is read step by step: pushed aside by the wave, the wobble, the lean and the
// bulge, then given the width the picture has under it there. Wherever the pen is to be
// up — the picture too light, the echo's turn, the edge of the sheet — the line is cut,
// at the place between two readings where that happens, and each piece is inked on its
// own: a run of middles, directions across, half-widths and distances along.

let RM = 0;                  // readings in the piece in hand
let RX = new Float64Array(4096), RY = new Float64Array(4096);
let RNX = new Float64Array(4096), RNY = new Float64Array(4096);
let RH = new Float64Array(4096), RS = new Float64Array(4096);
let QX = new Float64Array(4096), QY = new Float64Array(4096), QN = 0;
let MIN_PIECE = 0, PASS_STEP = 0.85, STITCH = 1;

function runPush(x, y, nx, ny, h, sa) {
  if (RM >= RX.length) {
    const grow = a => { const b = new Float64Array(a.length * 2); b.set(a); return b; };
    RX = grow(RX); RY = grow(RY); RNX = grow(RNX); RNY = grow(RNY); RH = grow(RH); RS = grow(RS);
  }
  RX[RM] = x; RY[RM] = y; RNX[RM] = nx; RNY[RM] = ny; RH[RM] = h; RS[RM] = sa;
  RM++;
}

function qPush(x, y) {
  if (QN >= QX.length) {
    const grow = a => { const b = new Float64Array(a.length * 2); b.set(a); return b; };
    QX = grow(QX); QY = grow(QY);
  }
  QX[QN] = x; QY[QN] = y;
  QN++;
}

function traceLayer(L) {
  const s = settings, nib = penW(L.pen), A = area;
  const thin = s.thin / 100, wide = s.wide / 100, g = Math.max(0.05, s.curve / 100);
  const lift = clamp(s.liftBelow, 0, 100) / 100;
  const lean = (s.lean + L.lean) / 100, bulge = s.bulge / 100;
  const wAmp = s.waveAmp, wK = 2 * Math.PI / Math.max(1, s.waveLen);
  const wShift = s.waveShift / 100 * 2 * Math.PI;
  const wob = s.wobble, wobK = 1 / Math.max(1, s.wobbleScale);
  const P0 = s.pitch * L.pitchK;
  const reach = Math.abs(wAmp) + 2 * Math.abs(wob) + (Math.abs(lean) + Math.abs(bulge) + 1) * P0 + 1;
  const mask = L.mask, flip = L.flip ? -1 : 1;
  PEN = L.pen; LAY = L.lay;
  let lines = 0, widest = 0;

  eachLine({ turn: L.turn, shift: L.shift, pitchK: L.pitchK, reach, coarse: L.coarse }, j => {
    RM = 0;
    let before = 0, px = 0, py = 0, pnx = 0, pny = 0, ph = 0, ps = 0, drew = false;
    for (let i = 0; i < LN; i++) {
      const bx = BX[i], by = BY[i], nx = NX[i], ny = NY[i], P = PP[i];
      let d = 0;
      if (wAmp) d += wAmp * Math.sin(SA[i] * wK + j * wShift);
      if (wob) d += wob * 2 * NZW(bx * wobK, by * wobK, j * 0.37 + 3.1);
      if (lean) d += lean * P * (2 * toneAt(bx, by) - 1);
      if (bulge) d += bulge * P * (toneAt(bx + nx * P, by + ny * P) - toneAt(bx - nx * P, by - ny * P));
      const x = bx + nx * d, y = by + ny * d;
      const T = toneAt(x, y);
      const wd = P * ((thin + (wide - thin) * (g === 1 ? T : Math.pow(T, g))) * L.widthK + L.add);
      const h = wd > nib ? (wd - nib) / 2 : 0;
      let on = mask ? flip * mask(x, y, T, j) : 1;
      if (lift > 0 && T - lift < on) on = T - lift;
      const out = Math.max(A.x0 - x, x - A.x1, A.y0 - y, y - A.y1) - h - nib;
      if (out > 0 && -out < on) on = -out;
      if (i > 0 && (on > 0) !== (before > 0)) {
        const t = before / (before - on);       // where between the two the pen goes down or up
        runPush(px + (x - px) * t, py + (y - py) * t, pnx + (nx - pnx) * t, pny + (ny - pny) * t,
                ph + (h - ph) * t, ps + (SA[i] - ps) * t);
        if (before > 0) { if (inkRun(L.ink, nib)) drew = true; RM = 0; }
      }
      if (on > 0) {
        runPush(x, y, nx, ny, h, SA[i]);
        if (wd > widest) widest = wd;
      }
      before = on; px = x; py = y; pnx = nx; pny = ny; ph = h; ps = SA[i];
    }
    if (RM > 0 && inkRun(L.ink, nib)) drew = true;
    RM = 0;
    if (drew) lines++;
  });
  return { lines, widest };
}

// One piece of a line, as its ink asks.
//
// Solid is one stroke down the middle while the ribbon is no wider than the nib; then its
// two edges, half a nib inside its outline; then, once the edges have come too far apart to
// close the paper between them, the middle again and passes inside each edge that follow
// it, one pass further in each time, for as long as there is room. A pass peels off the
// middle where the ribbon has swollen enough to need it — those are the teeth — and
// everywhere the passes are the same distance apart, so the ink is even.
//
// A fan spreads its passes evenly across the ribbon instead, whatever its width: they run
// together where it thins, and each begins where its neighbours have come too far apart.
function inkRun(ink, nib) {
  const m = RM;
  if (m < 2 || Math.abs(RS[m - 1] - RS[0]) < MIN_PIECE) return false;
  let hmax = 0;
  for (let i = 0; i < m; i++) if (RH[i] > hmax) hmax = RH[i];
  const merge = MERGE * nib;
  if (ink === 'hairline' || (hmax <= merge && ink !== 'rungs')) { passStroke(0, 0, -1, false); return true; }
  const step = Math.max(0.03, PASS_STEP * nib);
  switch (ink) {
    case 'solid': {
      // a pass may begin only so far off the middle that the two still close the paper
      const lead = Math.min(merge, Math.max(0, nib - step));
      const each = clamp(Math.ceil((hmax - lead) / step), 1, MAX_PASSES >> 1);
      passStroke(0, 0, merge, true);
      passStroke(0, 0, step / 2, false);
      passStroke(-1, 0, merge, false);
      passStroke(1, 0, merge, false);
      for (let k = 1; k < each; k++) {
        passStroke(-1, k * step, k * step + lead, false);
        passStroke(1, -k * step, k * step + lead, false);
      }
      if (COUNTS && 2 * each + 1 > COUNTS.passes) COUNTS.passes = 2 * each + 1;
      break;
    }
    case 'fan': {
      const n = clamp(Math.ceil(2 * hmax / step) + 1, 3, MAX_PASSES) | 1;   // odd: one is the middle
      const mid = (n - 1) >> 1;
      passStroke(0, 0, merge, true);
      passStroke(0, 0, step / 2, false);
      passStroke(-1, 0, merge, false);
      passStroke(1, 0, merge, false);
      fanBetween(0, mid, n, step);
      fanBetween(mid, n - 1, n, step);
      if (COUNTS && n > COUNTS.passes) COUNTS.passes = n;
      break;
    }
    case 'zigzag': swingStroke(false, merge); break;
    case 'wave':   swingStroke(true, merge); break;
    case 'rungs':  rungStrokes(merge, true); break;
    default:                                    // outline, and a ladder's two rails
      passStroke(0, 0, merge, true);
      passStroke(-1, 0, merge, false);
      passStroke(1, 0, merge, false);
      if (ink === 'ladder') rungStrokes(merge, false);
  }
  return true;
}

// A fan's passes between two that are already there: the one in the middle wherever those
// two have come further apart than a pass may be, then the same on either side of it.
function fanBetween(lo, hi, n, step) {
  if (hi - lo < 2) return;
  const mid = (lo + hi) >> 1;
  passStroke(-1 + 2 * mid / (n - 1), 0, step * (n - 1) / (2 * (hi - lo)), false);
  fanBetween(lo, mid, n, step);
  fanBetween(mid, hi, n, step);
}

// A stroke a × the half-width + b off the middle, wherever the half-width is over tau —
// or, if asked, wherever it is not; its ends are put where the half-width crosses tau
// exactly.
function passStroke(a, b, tau, under) {
  const m = RM;
  QN = 0;
  let was = false;
  for (let i = 0; i < m; i++) {
    const inside = (RH[i] > tau) !== under;
    if (i > 0 && inside !== was) {
      const t = (tau - RH[i - 1]) / (RH[i] - RH[i - 1]), o = a * tau + b;
      qPush(RX[i - 1] + (RX[i] - RX[i - 1]) * t + (RNX[i - 1] + (RNX[i] - RNX[i - 1]) * t) * o,
            RY[i - 1] + (RY[i] - RY[i - 1]) * t + (RNY[i - 1] + (RNY[i] - RNY[i - 1]) * t) * o);
      if (was) strokeOut(true);
    }
    if (inside) {
      const o = a * RH[i] + b;
      qPush(RX[i] + RNX[i] * o, RY[i] + RNY[i] * o);
    }
    was = inside;
  }
  strokeOut(true);
}

// The stroke gathered in QX, QY: dropped if too short, straightened, and into the sink.
function strokeOut(straighten) {
  let n = QN;
  QN = 0;
  if (n < 2) return;
  let len = 0;
  for (let i = 1; i < n && len < MIN_PIECE; i++) len += Math.hypot(QX[i] - QX[i - 1], QY[i] - QY[i - 1]);
  if (len < MIN_PIECE) return;
  if (straighten) n = simplify(QX, QY, n, SIMPLIFY);
  emit(QX, QY, n);
}

// The piece read at a distance u along it: fills AT with its middle, the way across and
// its half-width. The readings are looked for from where the last one was found.
const AT = new Float64Array(5);
let atI = 0;

function runAt(u) {
  const m = RM;
  while (atI < m - 2 && RS[atI + 1] < u) atI++;
  const i = atI, span = RS[i + 1] - RS[i];
  const t = span > 0 ? clamp((u - RS[i]) / span, 0, 1) : 0;
  AT[0] = RX[i] + (RX[i + 1] - RX[i]) * t;
  AT[1] = RY[i] + (RY[i + 1] - RY[i]) * t;
  AT[2] = RNX[i] + (RNX[i + 1] - RNX[i]) * t;
  AT[3] = RNY[i] + (RNY[i + 1] - RNY[i]) * t;
  AT[4] = RH[i] + (RH[i + 1] - RH[i]) * t;
}

// One stroke swinging from edge to edge: a zigzag, or a wave. The swings of neighbouring
// lines are in step, since they are counted from the same place along every line.
function swingStroke(smooth, merge) {
  const m = RM, st = Math.max(0.1, STITCH), du = smooth ? st / 8 : st;
  const u0 = RS[0], u1 = RS[m - 1];
  const put = u => {
    runAt(u);
    const p = u / st, k = Math.floor(p), fr = p - k;
    const f = smooth ? -Math.cos(Math.PI * p) : (k & 1) ? 1 - 2 * fr : 2 * fr - 1;
    const a = AT[4] > merge ? AT[4] * f : 0;
    qPush(AT[0] + AT[2] * a, AT[1] + AT[3] * a);
  };
  QN = 0;
  atI = 0;
  put(u0);
  for (let k = Math.floor(u0 / du) + 1; k * du < u1; k++) put(k * du);
  put(u1);
  // only what is dead straight can go: every corner of a zigzag is the drawing
  let n = 1;
  for (let i = 1; i < QN - 1; i++) {
    const ax = QX[n - 1], ay = QY[n - 1], dx = QX[i + 1] - ax, dy = QY[i + 1] - ay;
    const cr = (QX[i] - ax) * dy - (QY[i] - ay) * dx;
    if (cr * cr > 1e-5 * (dx * dx + dy * dy)) { QX[n] = QX[i]; QY[n] = QY[i]; n++; }
  }
  QX[n] = QX[QN - 1]; QY[n] = QY[QN - 1];
  QN = n + 1;
  strokeOut(false);
}

// Rungs across the ribbon, one every stitch; where the ribbon is a hair, a dot if asked.
const RUNG_X = new Float64Array(2), RUNG_Y = new Float64Array(2);

function rungStrokes(merge, dots) {
  const m = RM, st = Math.max(0.1, STITCH), u1 = RS[m - 1];
  atI = 0;
  for (let k = Math.ceil(RS[0] / st); k * st <= u1; k++) {
    runAt(k * st);
    const h = AT[4];
    if (h > merge) {
      const side = (k & 1) ? 1 : -1;            // there and back, like a hand would
      RUNG_X[0] = AT[0] - AT[2] * h * side; RUNG_Y[0] = AT[1] - AT[3] * h * side;
      RUNG_X[1] = AT[0] + AT[2] * h * side; RUNG_Y[1] = AT[1] + AT[3] * h * side;
    } else if (dots) {
      RUNG_X[0] = AT[0]; RUNG_Y[0] = AT[1];
      RUNG_X[1] = AT[0] + AT[2] * EPS; RUNG_Y[1] = AT[1] + AT[3] * EPS;
    } else continue;
    emit(RUNG_X, RUNG_Y, 2);
  }
}

// Douglas–Peucker in place: a stroke loses every point that is within tol of the line
// through the ones that stay.
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

// A line round the picture, on the edge the lines are cut at.
function borderLines() {
  if (settings.border === 'none') return;
  PEN = penIdx(settings.borderPen); LAY = L_BORDER;
  const A = AREAS[PEN], nib = penW(PEN);
  const box = d => {
    if (A.w - 2 * d <= 0 || A.h - 2 * d <= 0) return;
    emit([A.x0 + d, A.x1 - d, A.x1 - d, A.x0 + d, A.x0 + d],
         [A.y0 + d, A.y0 + d, A.y1 - d, A.y1 - d, A.y0 + d], 5);
  };
  box(0);
  if (settings.border === 'double') box(Math.max(1.5, 3 * nib));
}

// Where the cut guides stand: a dot in every corner of the sheet — or of the picture — and
// each side split evenly, so no two dots are further apart than asked. Lay the blade of
// the guillotine through two of them and cut.
function cropMarkPlaces() {
  const [W, H] = paperDims();
  const B = settings.cropMarkAt === 'picture' ? area : { x0: 0, y0: 0, x1: W, y1: H, w: W, h: H };
  const step = Math.max(1, settings.cropMarkGap);
  const nx = Math.max(1, Math.ceil(B.w / step)), ny = Math.max(1, Math.ceil(B.h / step));
  const out = [];
  for (let i = 0; i <= nx; i++) {             // top and bottom, corners included
    const x = B.x0 + B.w * i / nx;
    out.push([x, B.y0], [x, B.y1]);
  }
  for (let j = 1; j < ny; j++) {              // the sides, the corners already placed
    const y = B.y0 + B.h * j / ny;
    out.push([B.x0, y], [B.x1, y]);
  }
  return out;
}

// A dot is one touch of the pen, and no pen's box clips it: it stands on the very edge.
function cropMarkDots() {
  if (!settings.cropMarks) return;
  const [W] = paperDims();
  PEN = penIdx(settings.linePen); LAY = L_GUIDES;
  for (const [x, y] of cropMarkPlaces()) pushPoly([x, x + (x > W / 2 ? -EPS : EPS)], [y, y], 2);
}

function buildShapes() {
  area = drawArea();
  if (area.w < 2 || area.h < 2) return null;
  const s = settings, coarse = !!drag;
  ensureNoise();
  ensureField(coarse);
  SINK = makeSink();
  AREAS = [];
  for (let i = 0; i < SLOTS; i++) AREAS.push(penArea(i));
  MIN_PIECE = Math.max(0, s.minPiece);
  PASS_STEP = clamp(s.passes, 10, 2000) / 100;
  STITCH = Math.max(0.1, s.stitch);
  COUNTS = { lines: 0, echo: 0, passes: 1, widest: 0 };

  const echoOn = s.echo !== 'none', mask = echoOn ? makeMask() : null;
  const main = traceLayer({
    lay: L_LINES, pen: penIdx(s.linePen), ink: s.ink, widthK: 1, add: 0, shift: s.phase / 100,
    lean: 0, turn: 0, pitchK: 1, mask: echoOn && s.echoReplace ? mask : null, flip: true, coarse,
  });
  COUNTS.lines = main.lines;
  COUNTS.widest = main.widest;
  if (echoOn) {
    COUNTS.echo = traceLayer({
      lay: L_ECHO, pen: penIdx(s.echoPen), ink: s.echoInk, widthK: s.echoWidth / 100,
      add: s.echoAdd / 100, shift: (s.phase + s.echoShift) / 100, lean: s.echoLean,
      turn: s.echoTurn, pitchK: clamp(s.echoPitch, 10, 1000) / 100, mask, flip: false, coarse,
    }).lines;
  }
  borderLines();
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

// Every pass starts with the pen at the corner of the sheet. A hop to the next stroke that
// is shorter than the pen is told to stay down over is ink, not travel: between two passes
// of one ribbon it runs inside what they ink anyway, and the ribbon becomes one stroke
// drawn back and forth.
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

// As the pen will draw it: every stroke from the end it is entered at, and the hops the
// pen stays down over drawn too.
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

// The margin, the middle the lines go round, the echo's disc and where the cut guides
// stand. Never plotted.
function drawGuides(ctx) {
  if (!area) return;
  const s = settings, dark = luma(s.paperColor) < 0.25;
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = dark ? 'rgba(110, 200, 255, 0.85)' : 'rgba(26, 109, 209, 0.8)';
  ctx.lineWidth = 0.3;
  ctx.setLineDash([1.5, 1.5]);
  ctx.strokeRect(area.x0, area.y0, area.w, area.h);
  ctx.setLineDash([]);
  if (s.carrier !== 'lines') {
    const [x, y] = carrierCentre();
    ctx.beginPath();
    ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y);
    ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4);
    ctx.stroke();
  }
  if (s.echo === 'disc') {
    ctx.setLineDash([0.8, 1.6]);
    ctx.beginPath();
    ctx.arc((area.x0 + area.x1) / 2 + s.echoX / 100 * area.w / 2,
            (area.y0 + area.y1) / 2 + s.echoY / 100 * area.h / 2,
            s.echoR / 100 * Math.min(area.w, area.h) / 2, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
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
// Dragging the sheet slides the picture under the lines; the wheel enlarges it about the
// point under the cursor. Shift-drag, or a drag with the right button, turns the lines;
// alt-drag moves the middle the rings, the rays and the spiral go round. While a drag
// lasts the picture is painted coarser, to keep up with the hand.

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

const VIEW_KEYS = ['fieldX', 'fieldY', 'fieldZoom', 'fieldTurn'];
const DRAG_KEYS = VIEW_KEYS.concat(['angle', 'centreX', 'centreY']);

function attachPointer() {
  const c = canvasEl();
  c.addEventListener('contextmenu', e => e.preventDefault());
  c.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.button !== 2) return;
    const s = settings;
    drag = {
      mode: e.altKey ? 'centre' : (e.shiftKey || e.button === 2) ? 'turn' : 'slide',
      x: e.clientX, y: e.clientY, p: paperPoint(e), moved: false,
      fx: s.fieldX, fy: s.fieldY, angle: s.angle, cx: s.centreX, cy: s.centreY,
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
    const p = paperPoint(e);
    if (drag.mode === 'slide') {
      s.fieldX = +clamp(drag.fx + p[0] - drag.p[0], -1000, 1000).toFixed(1);
      s.fieldY = +clamp(drag.fy + p[1] - drag.p[1], -1000, 1000).toFixed(1);
    } else if (drag.mode === 'centre') {
      s.centreX = +clamp(drag.cx + (p[0] - drag.p[0]) / (area.w / 2) * 100, -150, 150).toFixed(1);
      s.centreY = +clamp(drag.cy + (p[1] - drag.p[1]) / (area.h / 2) * 100, -150, 150).toFixed(1);
    } else {
      s.angle = +wrapDeg(drag.angle + dx * DRAG_DEG_PX).toFixed(1);
    }
    for (const k of DRAG_KEYS) if (setters[k]) setters[k](s[k]);
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

// Enlarge the picture by a factor, keeping what is under the paper point m where it is.
function zoomAbout(factor, m) {
  const s = settings;
  const z = s.fieldZoom / 100;
  const z2 = clamp(Math.round(z * factor * 1000) / 1000, MIN_ZOOM / 100, MAX_ZOOM / 100);
  if (z2 === z) return;
  const cx = (area.x0 + area.x1) / 2, cy = (area.y0 + area.y1) / 2, k = z2 / z;
  const mx = m ? m[0] - cx : 0, my = m ? m[1] - cy : 0;
  s.fieldX = +clamp(mx + (s.fieldX - mx) * k, -1000, 1000).toFixed(1);
  s.fieldY = +clamp(my + (s.fieldY - my) * k, -1000, 1000).toFixed(1);
  s.fieldZoom = Math.round(z2 * 1000) / 10;
  for (const key of VIEW_KEYS) if (setters[key]) setters[key](s[key]);
  liveUpdate();
}

function resetView() {
  for (const k of VIEW_KEYS) settings[k] = DEFAULTS[k];
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
    const slide = (k, d) => {
      s[k] = +clamp(s[k] + d, -1000, 1000).toFixed(1);
      refreshControls();
      update();
    };
    const step = e.shiftKey ? 10 : 1;
    switch (e.key) {
      case 'r': case 'R': s.seed = Math.floor(Math.random() * 100000); refreshControls(); update(); break;
      case '[': s.seed = Math.max(0, Math.round(s.seed) - 1); refreshControls(); update(); break;
      case ']': s.seed = Math.round(s.seed) + 1; refreshControls(); update(); break;
      case 'c': cycle('carrier', CARRIERS, 1); break;
      case 'C': cycle('carrier', CARRIERS, -1); break;
      case 'f': cycle('source', SOURCES, 1); break;
      case 'F': cycle('source', SOURCES, -1); break;
      case 'i': cycle('ink', INKS, 1); break;
      case 'I': cycle('ink', INKS, -1); break;
      case 'e': cycle('echo', ECHOES, 1); break;
      case 'E': cycle('echo', ECHOES, -1); break;
      case 's': case 'S': {
        const k = (SCENES.findIndex(sc => sc.label === lastScene) + (e.key === 'S' ? -1 : 1) +
                   SCENES.length) % SCENES.length || (e.key === 'S' ? SCENES.length - 1 : 1);
        applyScene(SCENES[k]);
        break;
      }
      case 'ArrowLeft':  slide('fieldX', -step); break;
      case 'ArrowRight': slide('fieldX', step); break;
      case 'ArrowUp':    slide('fieldY', -step); break;
      case 'ArrowDown':  slide('fieldY', step); break;
      case '+': case '=': zoomAbout(1.1, null); break;
      case '-': case '_': zoomAbout(1 / 1.1, null); break;
      case '0': resetView(); break;
      case 'x': case 'X': s.cropMarks = !s.cropMarks; refreshControls(); update(); break;
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
  const show = (keys, on) => { for (const k of keys) setVisible(k, on); };
  setVisible('orientation', s.paper !== 'custom');
  show(['customW', 'customH'], s.paper === 'custom');
  show(['cropMarkAt', 'cropMarkGap'], s.cropMarks);
  setVisible('borderPen', s.border !== 'none');

  const car = s.carrier;
  setVisible('angle', car !== 'rings');
  show(['centreX', 'centreY', 'hole'], car !== 'lines');
  setVisible('arms', car === 'spiral');
  show(['waveLen', 'waveShift'], s.waveAmp !== 0);
  setVisible('wobbleScale', s.wobble !== 0);

  const echoOn = s.echo !== 'none';
  const inks = echoOn ? [s.ink, s.echoInk] : [s.ink];
  setVisible('passes', inks.includes('solid') || inks.includes('fan'));
  setVisible('stitch', inks.some(k => ['zigzag', 'wave', 'ladder', 'rungs'].includes(k)));

  const src = s.source;
  show(['cols', 'rows', 'uneven', 'loose', 'stagger', 'pillowFill', 'pillowRound', 'pillowSoft',
        'pillowDome', 'ground', 'pillowLight', 'pillowDark', 'pillowBias', 'pillowTones',
        'pillowSkip', 'halo'], src === 'pillows');
  setVisible('haloWidth', src === 'pillows' && s.halo > 0);
  show(['blobs', 'blobSize', 'blobSoft'], src === 'blobs');
  show(['noiseScale', 'noiseOctaves', 'noiseWarp'], src === 'noise');
  show(['rippleLen', 'rippleSources'], src === 'ripples');
  setVisible('rippleSpread', src === 'ripples');
  show(['fnExpr', 'fnPreset'], src === 'formula');
  show(['word', 'wordSize', 'wordFace'], src === 'word');
  setVisible('photoLoad', src === 'photo');
  setVisible('evenTone', src === 'even');
  setVisible('rimWidth', s.rims !== 0);

  show(['echoPen', 'echoReplace', 'echoInk', 'echoWidth', 'echoAdd', 'echoShift', 'echoLean',
        'echoPitch'], echoOn);
  setVisible('echoTurn', echoOn && car !== 'rings');
  setVisible('echoShare', s.echo === 'patches');
  show(['echoFrom', 'echoTo'], s.echo === 'tone band');
  setVisible('echoEvery', s.echo === 'every n-th line');
  show(['echoX', 'echoY', 'echoR'], s.echo === 'disc');
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
  createDiv('How the pillows are cut and which are light, where the blobs and the stones ' +
    'lie, the noise, the echo\'s patches, the wobble. <b>R</b> rolls a new one, <b>[</b> and ' +
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

function updateFnNote() {
  if (!fnNote) return;
  const c = compileExpr(settings.fnExpr);
  fnNote.html(c.err
    ? `<span class="warn">${c.err}</span>`
    : 'x and y run from −1 to 1 across the picture\'s short side, y upward; r is the distance ' +
      'from the middle, a the angle; noise(x, y) is Perlin noise. ^ is a power. Whatever range ' +
      'it has is stretched from paper to ink.');
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
    '<b>The picture</b>.');
  addSeedField(sec);

  sec = addSection(root, 'Lines');
  addSelect(sec, 'Carried by', 'carrier', CARRIERS, resync,
    '<b>lines</b> — straight and parallel, as in the picture this came from; <b>rings</b> round ' +
    'a middle; <b>rays</b> out of it, wider apart the further they go; <b>spiral</b> — one ' +
    'line, or a few arms, wound outward. <b>C</b> steps.');
  addSlider(sec, 'Pitch (mm)', 'pitch', 0.6, 60, 0.1,
    'From one line to the next. For rays: at a quarter of the picture\'s short side from the middle.');
  addSlider(sec, 'Angle (°)', 'angle', -180, 180, 0.5,
    '0 — upright, 90 — level. <b>Shift</b>-drag on the sheet turns them.');
  addSlider(sec, 'Slid across (% of the pitch)', 'phase', 0, 100, 1);
  addSlider(sec, 'Middle, across (%)', 'centreX', -150, 150, 1, '<b>Alt</b>-drag on the sheet moves it.');
  addSlider(sec, 'Middle, down (%)', 'centreY', -150, 150, 1);
  addSlider(sec, 'Arms', 'arms', 1, 24, 1);
  addSlider(sec, 'Hole in the middle (mm)', 'hole', 0, 150, 0.5);
  addSlider(sec, 'Read every (mm)', 'detail', 0.15, 3, 0.05,
    'How often along a line the picture is looked at. Finer follows it closer and takes longer to build.');

  sec = addSection(root, 'Swelling');
  addSlider(sec, 'Widest (% of the pitch)', 'wide', 0, 140, 1,
    'How fat a line gets in the darkest. Under 100 a hair of paper stays between two lines; ' +
    'over it they run together.');
  addSlider(sec, 'Thinnest (% of the pitch)', 'thin', 0, 100, 1,
    'In the lightest. Anything narrower than the nib is one stroke of it.');
  addSlider(sec, 'Curve (%)', 'curve', 20, 400, 1, 'Over 100 keeps the lines thin longer and swells them late.');
  addSlider(sec, 'Pen up below (% tone)', 'liftBelow', 0, 100, 1,
    '0 — a hairline runs through the lightest places too. Above it the lines stop there and ' +
    'the paper is left bare.');
  addSlider(sec, 'Shortest stroke (mm)', 'minPiece', 0, 20, 0.1);

  sec = addSection(root, 'Ink');
  addSelect(sec, 'A fat line is', 'ink', INKS, resync,
    '<b>solid</b> — its edges and passes inside them that follow the edge, each peeling off the ' +
    'middle where the ribbon has grown wide enough to need it; <b>fan</b> — passes spread evenly ' +
    'across, running together where it thins; <b>outline</b> — the two edges alone; ' +
    '<b>zigzag</b>, <b>wave</b> — one stroke swinging from edge to edge; <b>ladder</b> — edges ' +
    'and rungs; <b>rungs</b> — rungs alone, a dot where the line is a hair; <b>hairline</b> — ' +
    'no swelling, the middle only. <b>I</b> steps.');
  addSlider(sec, 'Passes apart (% of the nib)', 'passes', 30, 600, 1,
    '85 closes the paper. Over 100 the passes stand apart: a solid line opens into rings ' +
    'like an onion\'s, a fan into a fan.');
  addSlider(sec, 'Swing or rung every (mm)', 'stitch', 0.2, 20, 0.05);
  addSlider(sec, 'Pen kept down over (% of the nib)', 'penDown', 0, 300, 5,
    'A hop shorter than this to the next stroke is drawn instead of lifted over. Up to 100 it ' +
    'stays inside ink that is there anyway, and a ribbon becomes one stroke back and forth.');

  sec = addSection(root, 'Bending', true);
  addSlider(sec, 'Lean with the tone (% of the pitch)', 'lean', -300, 300, 1,
    'A line is pushed across as the picture goes dark under it, so it slants wherever the tone changes.');
  addSlider(sec, 'Crowd to the dark (% of the pitch)', 'bulge', -1000, 1000, 5,
    'Pushed towards its darker side — the lines gather on the rims. Below 0, towards the light.');
  addSlider(sec, 'Wave (mm)', 'waveAmp', -40, 40, 0.1);
  addSlider(sec, 'Wave length (mm)', 'waveLen', 5, 600, 1);
  addSlider(sec, 'Wave slips (% a line)', 'waveShift', -50, 50, 0.5,
    'How much further on the wave is on the next line.');
  addSlider(sec, 'Wobble (mm)', 'wobble', 0, 20, 0.05, 'A slow shake of the hand.');
  addSlider(sec, 'Wobble size (mm)', 'wobbleScale', 3, 300, 1);

  sec = addSection(root, 'The picture');
  addSelect(sec, 'Made of', 'source', SOURCES, resync,
    '<b>pillows</b> — soft boxes in an uneven grid, each with a dark rim; <b>blobs</b>; ' +
    '<b>noise</b>; <b>ripples</b>; <b>formula</b> — one of your own; <b>word</b>; <b>photo</b>; ' +
    '<b>even</b> — one tone all over, for the bending and the echo to work on. <b>F</b> steps.');
  addSlider(sec, 'Columns', 'cols', 1, 24, 1);
  addSlider(sec, 'Rows', 'rows', 1, 24, 1);
  addSlider(sec, 'Uneven (%)', 'uneven', 0, 100, 1, 'How unlike in size the cells are.');
  addCheckbox(sec, 'Every row divided on its own', 'loose');
  addSlider(sec, 'Every other row slid (% of a cell)', 'stagger', -100, 100, 1);
  addSlider(sec, 'Pillow fills (% of its cell)', 'pillowFill', 10, 130, 1);
  addSlider(sec, 'Rounded (%)', 'pillowRound', 0, 100, 1);
  addSlider(sec, 'Soft edge (%)', 'pillowSoft', 0, 100, 1, 'The softer, the longer the teeth.');
  addSlider(sec, 'Lighter in the middle (%)', 'pillowDome', -100, 100, 1);
  addSlider(sec, 'Lightest pillow (% tone)', 'pillowLight', 0, 100, 1);
  addSlider(sec, 'Darkest pillow (% tone)', 'pillowDark', 0, 100, 1);
  addSlider(sec, 'Kinds of pillow', 'pillowTones', 0, 8, 1,
    'So many tones from the lightest to the darkest; 0 — any tone.');
  addSlider(sec, 'More light … more dark', 'pillowBias', -100, 100, 1);
  addSlider(sec, 'Cells left empty (%)', 'pillowSkip', 0, 100, 1);
  addSlider(sec, 'Between the pillows (% tone)', 'ground', 0, 100, 1);
  addSlider(sec, 'Rim (%)', 'halo', 0, 100, 1, 'The dark ring round every pillow.');
  addSlider(sec, 'Rim width (%)', 'haloWidth', 1, 100, 1);
  addSlider(sec, 'Blobs', 'blobs', 1, 120, 1);
  addSlider(sec, 'Size (%)', 'blobSize', 3, 150, 1);
  addSlider(sec, 'Softness (%)', 'blobSoft', 0, 100, 1);
  addSlider(sec, 'Lump size (%)', 'noiseScale', 4, 300, 1);
  addSlider(sec, 'Octaves', 'noiseOctaves', 1, 6, 1);
  addSlider(sec, 'Swirl (%)', 'noiseWarp', 0, 300, 1);
  addSlider(sec, 'Ripple length (mm)', 'rippleLen', 4, 400, 1);
  addSlider(sec, 'Stones', 'rippleSources', 1, 8, 1);
  addSlider(sec, 'How far apart (%)', 'rippleSpread', 0, 150, 1);
  const fx = addTextField(sec, 'f(x, y) =', 'fnExpr', '', v => {
    settings.fnExpr = v;
    updateFnNote();
    if (!compileExpr(v).err) update();
  });
  fnNote = createDiv('').parent(fx.field).class('note');
  updateFnNote();
  const presetField = createDiv('').parent(sec).class('field');
  fieldDivs.fnPreset = presetField;
  const fnSel = createSelect().parent(presetField);
  for (const f of FORMULAS) fnSel.option(f.label);
  fnSel.changed(() => {
    const f = FORMULAS[fnSel.elt.selectedIndex];
    if (f && f.f) {
      settings.fnExpr = f.f;
      setters.fnExpr(f.f);
      updateFnNote();
      update();
    }
    fnSel.elt.selectedIndex = 0;
  });
  addTextField(sec, 'Word', 'word', 'A bar | starts a new line.', v => { settings.word = v; update(); });
  addSlider(sec, 'Size (% of the height)', 'wordSize', 5, 300, 1);
  addSelect(sec, 'Face', 'wordFace', FACES);
  const pf = createDiv('').parent(sec).class('field');
  fieldDivs.photoLoad = pf;
  createSpan('Photo').parent(pf).class('label');
  const fileIn = createFileInput(() => {}).parent(pf);
  fileIn.elt.accept = 'image/*';
  fileIn.elt.onchange = ev => loadPhotoFile(ev.target.files && ev.target.files[0]);
  photoNote = createDiv(PHOTO ? PHOTO.name : 'Not part of the link — load it again to rebuild the sheet.')
    .parent(pf).class('note');
  addSlider(sec, 'Tone (%)', 'evenTone', 0, 100, 1);
  addSub(sec, 'Where it lies');
  addSlider(sec, 'Slid across (mm)', 'fieldX', -1000, 1000, 0.5,
    'A drag on the sheet slides the picture under the lines, the wheel enlarges it about the ' +
    'cursor, <b>0</b> puts it back.');
  addSlider(sec, 'Slid down (mm)', 'fieldY', -1000, 1000, 0.5);
  addSlider(sec, 'Enlarged (%)', 'fieldZoom', MIN_ZOOM, MAX_ZOOM, 1);
  addSlider(sec, 'Turned (°)', 'fieldTurn', -180, 180, 0.5);
  createButton('Put the picture back').parent(sec).mousePressed(resetView);

  sec = addSection(root, 'Tones');
  addCheckbox(sec, 'Inside out — dark where it was light', 'invert');
  addSlider(sec, 'Level (%)', 'level', -100, 100, 1);
  addSlider(sec, 'Contrast (%)', 'contrast', -100, 400, 1);
  addSlider(sec, 'Gamma (%)', 'gamma', 20, 500, 1, 'Over 100 lightens the middle tones.');
  addSlider(sec, 'Bands', 'bands', 0, 12, 1,
    'The tones cut into steps, so a line changes width at once. 0 or 1 — none.');
  addSlider(sec, 'Soften (mm)', 'soften', 0, 40, 0.5, 'The whole picture blurred — longer teeth.');
  addSlider(sec, 'Rims (%)', 'rims', -300, 300, 5,
    'Every edge in the picture overdone: darker on its dark side, lighter on its light one.');
  addSlider(sec, 'Rims reach (mm)', 'rimWidth', 1, 60, 0.5);

  sec = addSection(root, 'Echo');
  addSelect(sec, 'A second set of lines', 'echo', ECHOES, resync,
    'In another pen: <b>everywhere</b>; in <b>patches</b> — some of the pillows, or blots of ' +
    'the sheet; in a <b>tone band</b> of the picture; on <b>every n-th line</b>; in a ' +
    '<b>disc</b>. <b>E</b> steps.');
  addPenSelect(sec, 'Drawn with', 'echoPen');
  addCheckbox(sec, 'Instead of the lines there, not beside them', 'echoReplace');
  addSlider(sec, 'Share (%)', 'echoShare', 0, 100, 1);
  addSlider(sec, 'From (% tone)', 'echoFrom', 0, 100, 1);
  addSlider(sec, 'To (% tone)', 'echoTo', 0, 100, 1);
  addSlider(sec, 'Every', 'echoEvery', 1, 40, 1);
  addSlider(sec, 'Disc, across (%)', 'echoX', -150, 150, 1);
  addSlider(sec, 'Disc, down (%)', 'echoY', -150, 150, 1);
  addSlider(sec, 'Disc, radius (%)', 'echoR', 1, 300, 1);
  addSelect(sec, 'Its ink', 'echoInk', INKS, resync);
  addSlider(sec, 'As wide as the lines (%)', 'echoWidth', 0, 300, 1);
  addSlider(sec, 'And wider by (% of the pitch)', 'echoAdd', -50, 100, 1);
  addSlider(sec, 'Slid across (% of the pitch)', 'echoShift', -100, 100, 1,
    '0 — on the lines themselves; 50 — in between them.');
  addSlider(sec, 'Its own lean (% of the pitch)', 'echoLean', -300, 300, 1);
  addSlider(sec, 'Turned (°)', 'echoTurn', -45, 45, 0.1,
    'A few degrees and the two sets beat against each other — moiré.');
  addSlider(sec, 'Pitch (% of the lines\')', 'echoPitch', 50, 200, 0.5,
    'A little off 100 gives slow bands across the sheet.');

  sec = addSection(root, 'Pens');
  addNote(sec, 'Five pens of the drawer; each layer picks one by number — the echo under ' +
    '<b>Echo</b>. Changing the kind sets its colour and a usual width.');
  addPenSelect(sec, 'Lines', 'linePen', 'The cut guides are dotted with this pen too.');
  addPenSelect(sec, 'Border', 'borderPen');
  for (let i = 0; i < SLOTS; i++) addPenSlot(sec, i);

  sec = addSection(root, 'Paper');
  addSelect(sec, 'Size', 'paper', PAPERS, () => { syncVisibility(); resizeForPaper(); });
  addSelect(sec, 'Orientation', 'orientation', ['landscape', 'portrait'], resizeForPaper);
  addSlider(sec, 'Width (mm)', 'customW', 20, 2000, 1, '', resizeForPaper);
  addSlider(sec, 'Height (mm)', 'customH', 20, 2000, 1, '', resizeForPaper);
  addSlider(sec, 'Margin (mm)', 'margin', 0, 150, 1, 'The picture is the sheet less the margin.');
  addSelect(sec, 'Paper', 'paperTone', TONES, () => {
    if (PAPER_TONES[settings.paperTone]) {
      settings.paperColor = PAPER_TONES[settings.paperTone];
      setters.paperColor(settings.paperColor);
    }
    drawPreview(); updateStats(); syncUrl();
  }, 'The preview only — the files have no background.');
  addColor(sec, 'Paper colour', 'paperColor');
  addSelect(sec, 'Border round the picture', 'border', BORDERS, resync);
  addCheckbox(sec, 'Cut guide dots', 'cropMarks', resync);
  addSelect(sec, 'Dots round', 'cropMarkAt', MARK_AT, update,
    'The <b>sheet</b> — plot on a larger piece of paper and trim it back to size; the ' +
    '<b>picture</b> — cut the margin off and keep the picture to its very edge.');
  addSlider(sec, 'Most between two dots (mm)', 'cropMarkGap', 20, 600, 5,
    'A dot in every corner, and each side split evenly so no gap is wider than this — lay ' +
    'the blade through two dots and cut. <b>X</b> switches them.');

  sec = addSection(root, 'Output');
  addCheckbox(sec, 'Order the strokes for the plotter', 'optimiseOrder');
  addCheckbox(sec, 'Follow the sliders live', 'liveUpdate', () => syncUrl());
  addCheckbox(sec, 'Show the margin, the middle and the cut guides', 'showGuides', () => { drawPreview(); syncUrl(); });
  createButton('Download SVG [everything]').parent(sec).class('primary')
    .mousePressed(() => exportSvg({ all: true }));
  createButton('Download SVG [one per pen]').parent(sec).mousePressed(() => exportSvg({ perPen: true }));
  const lb = createDiv('').parent(sec).class('layer-buttons');
  LAYERS.forEach((ly, li) => {
    layerButtons[li] = createButton('').parent(lb).mousePressed(() => exportSvg({ layer: li }));
  });
  addNote(sec, 'Everything is one file, a group per pen; a layer\'s file is the lines, the echo, ' +
    'the border or the cut guides alone. The cut guides go with the pen of the lines, so they ' +
    'are plotted once. Every file is the whole sheet in millimetres.');
  addSlider(sec, 'Picture (dpi)', 'pngDpi', 50, 600, 10, '', () => syncUrl());
  createButton('Download PNG').parent(sec).mousePressed(exportPng);
  const row = createDiv('').parent(sec).class('btn-row');
  createButton('Copy link').parent(row).mousePressed(function () { copyLink(this); });
  createButton('Reset').parent(row).mousePressed(resetAll);

  sec = addSection(root, 'The sheet');
  statsDiv = createDiv('').parent(sec).class('stats');
  penListDiv = createDiv('').parent(sec).class('stats');
  createDiv('').parent(sec).class('note keys').html(
    '<div><kbd>drag</kbd> slide the picture · <kbd>wheel</kbd> enlarge it · <kbd>0</kbd> put it back</div>' +
    '<div><kbd>shift</kbd>+<kbd>drag</kbd> turn the lines · <kbd>alt</kbd>+<kbd>drag</kbd> their middle</div>' +
    '<div><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> slide by 1 mm, with <kbd>shift</kbd> 10 · <kbd>+</kbd><kbd>−</kbd> enlarge</div>' +
    '<div><kbd>S</kbd> scene · <kbd>C</kbd> carrier · <kbd>F</kbd> picture · <kbd>I</kbd> ink · <kbd>E</kbd> echo</div>' +
    '<div><kbd>X</kbd> cut guides · <kbd>G</kbd> guides · <kbd>R</kbd> new seed · <kbd>[</kbd> <kbd>]</kbd> step it</div>');
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
  if (!strokes) {
    statsDiv.html('<div class="warn">Nothing is drawn — the pen is up over the whole sheet. ' +
      'Lower <b>Pen up below</b>, or let the echo leave the lines be.</div>');
    refreshPenList();
    return;
  }
  const seconds = plan.downs * PEN_CYCLE_S + plan.ink / DRAW_SPEED + plan.travel / TRAVEL_SPEED;
  const nib = penW(penIdx(s.linePen));
  const fat = Math.max(nib, COUNTS.widest), gap = s.pitch - fat;
  const what = { lines: 'lines', rings: 'rings', rays: 'rays', spiral: COUNTS.lines === 1 ? 'spiral' : 'arms' }[s.carrier];
  let html =
    `<div class="big"><b>${groupNum(strokes)}</b> strokes, ` +
    `<b>${(plan.ink / 1000).toFixed(1)}</b> m of line</div>` +
    `<div>${groupNum(COUNTS.lines)} ${what}, ${s.pitch} mm apart` +
    `${COUNTS.echo ? ` · ${groupNum(COUNTS.echo)} in the echo` : ''}</div>` +
    `<div>${s.source}${FIELD && FIELD.pillows ? ` — ${FIELD.pillows} of them` : ''} · ` +
    `${FIELD ? Math.round(FIELD.mean * 100) : 0} % dark on the whole</div>` +
    `<div>The fattest line is <b>${fat.toFixed(2)}</b> mm` +
    `${(s.ink === 'solid' || s.ink === 'fan') && COUNTS.passes > 1 ? `, ${COUNTS.passes} passes of the pen` : ''}` +
    `${s.carrier !== 'rays' && gap > 0 ? ` — <b>${gap.toFixed(2)}</b> mm of paper to the next` : ''}</div>` +
    `<div>The pen goes down <b>${groupNum(plan.downs)}</b> times, ` +
    `${(plan.travel / 1000).toFixed(1)} m in the air</div>` +
    `<div>Roughly <b>${formatDuration(seconds)}</b> to plot · ${lastMs.toFixed(0)} ms to build` +
    `${fieldMs ? ` (the picture ${fieldMs.toFixed(0)} ms)` : ''}</div>`;
  if (s.cropMarks && perLayer && perLayer[L_GUIDES].strokes) {
    html += `<div>${perLayer[L_GUIDES].strokes} cut guide dots round the ${s.cropMarkAt}, ` +
      `in the pen of the lines</div>`;
  }
  if (s.source === 'photo' && !PHOTO) {
    html += '<div class="warn">No photo loaded — load one under <b>The picture</b>. Until then: a ball of shade.</div>';
  }
  if (FIELD && FIELD.note) html += `<div class="warn">The picture: ${FIELD.note}.</div>`;
  if (s.pitch < nib * 1.5) {
    html += `<div class="warn">The lines are ${s.pitch} mm apart and the pen is ${nib} mm wide — ` +
      'there is no room to swell. A wider pitch, or a finer pen.</div>';
  } else if (s.carrier !== 'rays' && gap <= 0 && s.wide <= 100) {
    html += '<div class="warn">At their fattest the lines touch — the dark closes up altogether.</div>';
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

function sourceName() {
  const s = settings;
  return s.source === 'photo' && PHOTO ? 'photo ' + PHOTO.name
       : s.source === 'formula' ? s.fnExpr
       : s.source === 'word' ? `word "${s.word}"` : s.source;
}

function metaComment() {
  const s = settings;
  const pens = [];
  for (let i = 0; i < SLOTS; i++) if (perPen && perPen[i].strokes) pens.push(penLabel(i));
  return `swelling lines — ${s.carrier} pitch=${s.pitch}mm angle=${s.angle} ${sourceName()} ` +
    `ink=${s.ink} wide=${s.wide}% echo=${s.echo}${s.echo !== 'none' ? '/' + s.echoInk : ''} ` +
    `${s.cropMarks ? `cutguides=${s.cropMarkAt}<=${s.cropMarkGap}mm ` : ''}seed=${s.seed} ` +
    `pens=[${pens.join('; ')}] strokes=${strokes}`;
}

function fileStem() {
  const s = settings;
  const paper = s.paper === 'custom' ? `${s.customW}x${s.customH}mm` : `${s.paper}-${s.orientation}`;
  return `swelling lines ${s.carrier} ${s.source} ${s.ink} seed${s.seed} ${paper}`;
}

////////////////////////////////////////////////////////////////////////////////////////
// Controls, shared
//
// A section folds away under its heading; which ones are folded is remembered by the
// browser, not by the link.

function foldedSet() {
  try { return new Set(JSON.parse(localStorage.getItem('p5js21-folded') || '[]')); }
  catch (e) { return new Set(); }
}

function saveFolded(set) {
  try { localStorage.setItem('p5js21-folded', JSON.stringify([...set])); } catch (e) { /* no storage */ }
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

// A scene is the whole picture, but not how the sheet is to be cut out or put out: the cut
// guides and the output switches stay as they are.
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
// the pen should visit them, a hop the pen stays down over is a line like any other, and
// the link that rebuilds the sheet is in the header comment.

function svgGroup(keep, pen, id) {
  const { pts, off } = shapes;
  const { order, flip } = plan;
  const f = n => String(+n.toFixed(3));
  const CHUNK = 400, reach = settings.penDown / 100 * penW(pen);
  let body = '', d = '', held = 0, count = 0, ex = NaN, ey = NaN;
  for (let t = 0; t < order.length; t++) {
    const i = order[t];
    if (shapes.ink[i] !== pen || !keep(i)) continue;
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
