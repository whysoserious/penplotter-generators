////////////////////////////////////////////////////////////////////////////////////////
// Sweet unicorns — chubby unicorns with curly manes, and hearts all round them
//
// A unicorn is built of soft parts — a round body on four stubby legs, a big head with a
// muzzle, a mane and a tail of curls, an ear, a horn — laid one over another from the back
// to the front. Every part is a closed outline; a line of a part is drawn only where no
// part in front of it covers it, and parts of one family (the body and its legs, the head
// and its muzzle, the curls of the mane) melt into one outline where they overlap. So the
// drawing reads like a sticker: an unbroken line round the whole animal, and every curl,
// stripe and eyelash inside it.
//
// It is drawn with two fine pens, a black and a red rapidograph — every fill is passes of
// a 0.3 mm nib — or, as a colouring page, with the black one alone and nothing filled but
// the eyes. Fills follow the drawer's rule: a filled shape is drawn half a nib inside its edge — an
// outline, then passes no further apart than 85 % of the nib — and a shape narrower than
// the nib is one touch of the pen. Hearts are drawn inset exactly, cusp and all.
//
// Around the unicorns: hearts — scattered, packed everywhere, rising from the horns or in
// a frame — and twinkles; under them a cloud, behind them a rainbow, above them a heart
// balloon on a string. One unicorn, two in love, or a sheet of them to cut out.
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};
const PAPERS = Object.keys(PAPER_SIZES).concat('custom');

const PAPER_TONES = {
  'white': '#fbfaf5', 'cream': '#f1e8d6', 'pink': '#f6dfe0', 'grey': '#8e9196', 'black': '#151517',
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
// The passes go down light to dark: markers before fine pens, so a black line is never
// drawn over by a marker that would smear it.
const KIND_RANK = { 'silver marker': 0, 'white marker': 1, 'red marker': 2, 'other': 3, 'red': 4, 'black': 5 };

const LAYOUTS    = ['one', 'pair', 'grid'];
const FACINGS    = ['right', 'left', 'alternate', 'random'];
const POSES      = ['standing', 'prancing', 'jumping', 'rearing', 'sitting', 'lying', 'mixed'];
const EYES       = ['sparkly', 'happy', 'sleepy', 'hearts', 'mixed'];
const MANES      = ['curls', 'waves', 'bob', 'hearts'];
const TAILS      = ['curls', 'waves', 'hearts', 'mermaid'];
const ACCESSORIES = ['none', 'crown', 'flowers', 'bow', 'glasses', 'scarf', 'bowtie', 'halo'];

// Characters: each sets some of what a unicorn is like over the settings below — sizes as
// a share of them, the rest outright. 'mixed' deals them out over a sheet, no two alike
// until every one has been dealt.
const CHARACTERS = {
  'as set below':   {},
  'classic':        { pose: 'standing', maneStyle: 'curls', tailStyle: 'curls', acc: 'none', mark: 'heart' },
  'baby':           { head: 1.3, chubby: 0.88, legs: 0.6, horn: 0.55, maneStyle: 'bob', acc: 'bow', eyes: 'sparkly', mark: 'none' },
  'pony':           { head: 0.85, chubby: 0.9, legs: 1.7, horn: 1.15, maneStyle: 'waves', tailStyle: 'waves', pose: 'prancing' },
  'chonky':         { chubby: 1.3, legs: 0.5, head: 0.95, mark: 'dots' },
  'princess':       { acc: 'crown', maneStyle: 'waves', tailStyle: 'waves', mark: 'three hearts' },
  'flower child':   { acc: 'flowers', eyes: 'happy', mark: 'none' },
  'sweetheart':     { maneStyle: 'hearts', tailStyle: 'hearts', mark: 'spots' },
  'in love':        { eyes: 'hearts', mark: 'spots', maneStyle: 'curls' },
  'sleepyhead':     { pose: 'lying', eyes: 'sleepy', maneStyle: 'bob' },
  'sitting pretty': { pose: 'sitting', eyes: 'happy', acc: 'bow' },
  'hopper':         { pose: 'jumping', eyes: 'happy', maneStyle: 'bob', legs: 0.9 },
  'brave':          { pose: 'rearing', maneStyle: 'waves', tailStyle: 'waves' },
  'angel':          { acc: 'halo', wings: true, eyes: 'happy' },
  'pegasus':        { wings: true, pose: 'prancing', maneStyle: 'waves', tailStyle: 'waves' },
  'mermaid':        { tailStyle: 'mermaid', maneStyle: 'waves', pose: 'standing', mark: 'none' },
  'fluffy':         { fluffy: true, maneStyle: 'bob', mark: 'none', legs: 0.75 },
  'smarty':         { acc: 'glasses', maneStyle: 'bob' },
  'cosy':           { acc: 'scarf', pose: 'sitting', eyes: 'sleepy' },
  'dapper':         { acc: 'bowtie', maneStyle: 'waves', tailStyle: 'waves' },
  'dotty':          { mark: 'dots', tailStyle: 'hearts', eyes: 'happy' },
  'lazy bones':     { pose: 'lying', eyes: 'happy', acc: 'flowers', maneStyle: 'waves', tailStyle: 'waves' },
};
const CHARACTER_NAMES = Object.keys(CHARACTERS).concat('mixed');
const DEALT = Object.keys(CHARACTERS).filter(k => k !== 'as set below');
const MANE_INKS  = ['curls', 'filled + curls', 'filled', 'plain'];
const HORN_INKS  = ['candy stripes', 'stripes', 'filled', 'plain'];
const HOOF_INKS  = ['filled', 'hatched', 'plain'];
const BLUSHES    = ['filled', 'hatched', 'dashes', 'ring', 'none'];
const MARKS      = ['heart', 'three hearts', 'spots', 'dots', 'none'];
const HEARTS     = ['scattered', 'everywhere', 'rising', 'frame', 'none'];
const HEART_INKS = ['filled', 'filled + outline', 'outline', 'double outline', 'hatched'];
const TWINKLES   = ['stars and dots', 'stars', 'dots'];
const BORDERS    = ['none', 'line', 'double'];
const MARK_AT    = ['sheet', 'picture'];

// What goes on the sheet, each picking a pen of the drawer by number. The cut guides go
// with the first pen in use.
const LAYERS = [
  { id: 'outline',    label: 'outline',            pen: 'outlinePen' },
  { id: 'details',    label: 'curls and stripes',  pen: 'detailPen' },
  { id: 'mane',       label: 'mane fill',          pen: 'manePen' },
  { id: 'horn',       label: 'horn and hooves',    pen: 'hornPen' },
  { id: 'blush',      label: 'blush',              pen: 'blushPen' },
  { id: 'hearts',     label: 'hearts',             pen: 'heartPen' },
  { id: 'heartLines', label: 'heart lines',        pen: 'heartLinePen' },
  { id: 'twinkles',   label: 'twinkles',           pen: 'twinklePen' },
  { id: 'rainbow1',   label: 'rainbow',            pen: 'rainbowPen1' },
  { id: 'rainbow2',   label: 'rainbow, between',   pen: 'rainbowPen2' },
  { id: 'border',     label: 'border',             pen: 'borderPen' },
  { id: 'guides',     label: 'cut guides',         pen: null },
];
const LI = {};
LAYERS.forEach((l, i) => { LI[l.id] = i; });

const MAX_STROKES    = 400_000;
const BUSY_STROKES   = 30_000;
const CLIP_STEP      = 0.25;       // mm — how finely a line is read against what covers it
const SIMPLIFY       = 0.008;      // mm — how far a stroke may be straightened
const EPS            = 0.01;       // mm — the stub that stands in for a dot
const PREVIEW_MAX_PX = 1500;
const PEN_CYCLE_S    = 0.3;
const DRAW_SPEED     = 60;
const TRAVEL_SPEED   = 150;
const DRAG_DEG_PX    = 0.25;
const WHEEL_ZOOM     = 0.0012;

const settings = {
  // paper
  paper: 'A4',
  orientation: 'portrait',
  customW: 300,
  customH: 300,
  margin: 12,
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
  outlinePen: 1, detailPen: 2, manePen: 2, hornPen: 2, blushPen: 2,
  heartPen: 2, heartLinePen: 1, twinklePen: 2, rainbowPen1: 2, rainbowPen2: 1, borderPen: 1,

  seed: 3,

  // the herd
  layout: 'one',
  cols: 3,
  rows: 3,
  facing: 'right',
  figSize: 72,          // % of the room each unicorn has
  figX: 0,              // mm
  figY: 0,
  tilt: 0,              // °
  variety: 35,          // % — how much the unicorns of one sheet differ

  // the unicorn
  character: 'as set below',
  pose: 'standing',
  maneStyle: 'curls',
  tailStyle: 'curls',
  accessory: 'none',
  fluffy: false,
  headSize: 100,        // %
  chubby: 100,          // %
  legLength: 100,       // %
  hornLength: 100,      // %
  maneCurls: 7,
  maneSize: 100,        // %
  tailSize: 100,        // %
  eyes: 'sparkly',
  cutieMark: 'heart',
  wings: false,
  wingSize: 100,        // %
  cloud: false,
  rainbow: false,
  rainbowBands: 4,
  rainbowWidth: 100,    // %
  rainbowLines: false,
  balloon: false,
  balloonSize: 100,     // %

  // ink on the unicorn
  colouring: false,     // a colouring page: outlines only, in the outline pen
  outlineStrokes: 1,
  maneInk: 'curls',
  hornInk: 'candy stripes',
  hoofInk: 'hatched',
  blush: 'filled',
  passes: 85,           // % of the nib between two passes of a fill
  penDown: 100,         // % of the nib — a hop shorter than this is drawn, not lifted over

  // hearts
  hearts: 'scattered',
  heartCount: 18,
  heartMin: 6,          // mm
  heartMax: 20,         // mm
  heartTilt: 25,        // °
  heartGap: 4,          // mm
  heartInk: 'filled',
  heartHatch: 1.2,      // mm — hatched hearts and blush, and the second line of a double heart
  pairHeart: 34,        // % of the sheet's short side

  // twinkles
  twinkles: 10,
  twinkleSize: 7,       // mm
  twinkleStyle: 'stars and dots',

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
  { label: 'One unicorn, hearts all round', s: {} },
  { label: 'Over the rainbow, on a cloud', s: {
      rainbow: true, cloud: true, orientation: 'landscape', figSize: 92, hearts: 'scattered',
      heartCount: 10, heartMax: 16, rainbowBands: 4, rainbowLines: true,
      twinkles: 14 } },
  { label: 'Two unicorns in love', s: {
      layout: 'pair', orientation: 'landscape', figSize: 88, hearts: 'scattered', heartCount: 14,
      heartMax: 16, eyes: 'happy', twinkles: 8 } },
  { label: 'A heart balloon', s: {
      balloon: true, pose: 'prancing', figSize: 80, hearts: 'scattered', heartCount: 8,
      heartMax: 14, twinkles: 14 } },
  { label: 'Dreaming, with wings', s: {
      wings: true, wingSize: 140, eyes: 'sleepy', cloud: true, hearts: 'rising', heartMin: 5,
      heartMax: 20, figSize: 64, figY: 40,
      heartCount: 14, twinkles: 18, twinkleStyle: 'stars' } },
  { label: 'Sticker sheet — nine characters', s: {
      character: 'mixed', layout: 'grid', cols: 3, rows: 3, figSize: 84, variety: 40,
      facing: 'alternate', hearts: 'everywhere', heartMin: 4, heartMax: 9, heartGap: 2.5,
      twinkles: 0, border: 'line' } },
  { label: 'Everybody — twenty characters', s: {
      character: 'mixed', paper: 'A3', orientation: 'landscape', layout: 'grid', cols: 5, rows: 4,
      figSize: 86, variety: 20, facing: 'alternate', hearts: 'everywhere', heartMin: 4,
      heartMax: 8, heartGap: 6, twinkles: 0 } },
  { label: 'A princess', s: {
      character: 'princess', figSize: 76, hearts: 'scattered', heartCount: 14, twinkles: 16 } },
  { label: 'A mermaid', s: {
      character: 'mermaid', figSize: 76, hearts: 'rising', heartCount: 10, twinkles: 14 } },
  { label: 'A sleepyhead on a cloud', s: {
      character: 'sleepyhead', cloud: true, orientation: 'landscape', figSize: 70,
      hearts: 'scattered', heartCount: 12, heartMax: 14, twinkles: 20, twinkleStyle: 'stars' } },
  { label: 'Sitting pretty', s: {
      character: 'sitting pretty', figSize: 74, heartCount: 14 } },
  { label: 'Raining hearts', s: {
      hearts: 'everywhere', heartMin: 5, heartMax: 22, heartGap: 3, twinkles: 0, figSize: 66 } },
  { label: 'In a frame of hearts', s: {
      hearts: 'frame', heartMax: 16, heartGap: 3, figSize: 66, twinkles: 12 } },
  { label: 'Red only — one pen', s: {
      outlinePen: 2, detailPen: 2, heartLinePen: 2, twinklePen: 2, rainbowPen2: 2,
      heartInk: 'hatched', hoofInk: 'plain', hearts: 'scattered', heartCount: 16 } },
  { label: 'Hearts with black edges', s: {
      heartInk: 'filled + outline', heartMax: 24, heartCount: 14, outlineStrokes: 2 } },
  { label: 'Colouring page', s: {
      colouring: true, outlineStrokes: 2, cloud: true, rainbow: true, rainbowBands: 4,
      orientation: 'landscape', figSize: 92, heartCount: 12, heartMax: 22, twinkles: 8 } },
  { label: 'Colouring page — a sheet of nine', s: {
      colouring: true, outlineStrokes: 2, layout: 'grid', cols: 3, rows: 3, figSize: 84,
      character: 'mixed', variety: 40, facing: 'alternate', hearts: 'everywhere',
      heartMin: 6, heartMax: 12, heartGap: 3, twinkles: 0 } },
];

const setters   = {};
const fieldDivs = {};
let statsDiv, linkDiv, penListDiv, layerButtons = {}, penSelects = [], slotSwatches = [];

let area    = null;          // the margin box, in mm — the picture
let shapes  = null;          // { pts, off, ink, lay } — polylines in mm
let strokes = 0;
let plan    = null;          // { order, flip, ink, travel, downs }
let perPen  = null;
let perLayer = null;
let lastMs  = 0;
let drag    = null;
let COUNTS  = null;          // { figs, hearts, twinkles }
let FIGS    = [];            // the unicorns as placed: { box, horn }
let GUIDE_PEN = 0;

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
function layerPen(li) {
  if (li === LI.guides) return GUIDE_PEN;
  if (settings.colouring && li !== LI.border) return penIdx(settings.outlinePen);
  return penIdx(settings[LAYERS[li].pen]);
}

function penLabel(i) {
  const w = penW(i);
  return `${i + 1} · ${penKind(i)} ${w < 1 ? w.toFixed(2) : +w.toFixed(1)} mm`;
}

// The room inside the margin: the picture.
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

function penOrder() {
  const r = i => KIND_RANK[penKind(i)] ?? 3;
  return [0, 1, 2, 3, 4].sort((a, b) => r(a) - r(b) || a - b);
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
// Shapes
//
// Outlines are lists of [x, y] while a unicorn is put together in its own units, and
// { xs, ys } arrays in millimetres once it is on the sheet. y runs down.

function ellPts(cx, cy, rx, ry, rot, n) {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const t = 2 * Math.PI * i / n, x = rx * Math.cos(t), y = ry * Math.sin(t);
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}

// |x/rx|^p + |y/ry|^p = 1 — over 2, a rounded box; the higher, the squarer.
function supPts(cx, cy, rx, ry, p, n) {
  const out = [], e = 2 / p;
  for (let i = 0; i < n; i++) {
    const t = 2 * Math.PI * i / n, c = Math.cos(t), s = Math.sin(t);
    out.push([cx + rx * Math.sign(c) * Math.pow(Math.abs(c), e),
              cy + ry * Math.sign(s) * Math.pow(Math.abs(s), e)]);
  }
  return out;
}

function arcPts(cx, cy, r, a0, a1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

// A curl: a spiral from near the middle out to rEnd.
function spiralPts(cx, cy, rEnd, turns, a0, dir, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = a0 + dir * turns * 2 * Math.PI * t, r = rEnd * (0.1 + 0.9 * t);
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

function rotPts(pts, px, py, ang) {
  if (!ang) return pts;
  const c = Math.cos(ang), s = Math.sin(ang);
  return pts.map(([x, y]) => [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c]);
}

// The part of a convex outline on one side of the line through seg: side 1 is the side the
// base of the horn is on (towards +y before turning), -1 the other.
function halfPlane(pts, seg, side) {
  const [[ax, ay], [bx, by]] = seg, nx = -(by - ay), ny = bx - ax;
  const ref = side * (nx * 0 + ny * 1) >= 0 ? 1 : -1;
  const f = ([x, y]) => ((x - ax) * nx + (y - ay) * ny) * ref;
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length], dp = f(p), dq = f(q);
    if (dp >= 0) out.push(p);
    if ((dp >= 0) !== (dq >= 0)) {
      const t = dp / (dp - dq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out.length >= 3 ? out : null;
}

// A leaf from its base B to its tip E, wb wide at the base each side, round at the tip.
function leafPts(B, E, wb, n) {
  const dx = E[0] - B[0], dy = E[1] - B[1], len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len, px = -uy, py = ux;
  const right = [], left = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, w = wb * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - 0.3 * t);
    const cx = B[0] + ux * len * t, cy = B[1] + uy * len * t;
    right.push([cx + px * w, cy + py * w]);
    left.push([cx - px * w, cy - py * w]);
  }
  return right.concat(left.slice(0, -1).reverse());
}

// A horn: base middle Hb, leaning ang from upright, L long, w wide each side at the base,
// a round tip and a base bowed down into the head.
function hornPts(Hb, ang, L, w, tipR, n) {
  const dx = Math.sin(ang), dy = -Math.cos(ang), px = Math.cos(ang), py = Math.sin(ang);
  const tx = Hb[0] + dx * (L - tipR), ty = Hb[1] + dy * (L - tipR);
  const out = [];
  const ap = Math.atan2(py, px);
  for (let i = 0; i <= n; i++) {
    const a = ap - Math.PI * i / n;
    out.push([tx + tipR * Math.cos(a), ty + tipR * Math.sin(a)]);
  }
  // the base, from the left corner back round to the right one, bowed away from the tip
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = Math.PI * t;
    const bx = -Math.cos(a) * w, by = Math.sin(a) * w * 0.35;
    out.push([Hb[0] + px * bx - dx * by, Hb[1] + py * bx - dy * by]);
  }
  return out;
}

// A path through control points (Catmull-Rom), read at count places evenly along it, each
// with the way across it.
function pathSample(ctrl, count) {
  const dense = [];
  const n = ctrl.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = ctrl[Math.max(i - 1, 0)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(i + 2, n - 1)];
    for (let j = 0; j < 30; j++) {
      const t = j / 30, t2 = t * t, t3 = t2 * t;
      const f = k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t +
        (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      dense.push([f(0), f(1)]);
    }
  }
  dense.push(ctrl[n - 1]);
  const cum = [0];
  for (let i = 1; i < dense.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  }
  const total = cum[cum.length - 1], out = [];
  out.total = total;
  let j = 0;
  for (let k = 0; k < count; k++) {
    const target = count > 1 ? total * k / (count - 1) : 0;
    while (j < dense.length - 2 && cum[j + 1] < target) j++;
    const seg = cum[j + 1] - cum[j] || 1, t = clamp((target - cum[j]) / seg, 0, 1);
    const x = dense[j][0] + (dense[j + 1][0] - dense[j][0]) * t;
    const y = dense[j][1] + (dense[j + 1][1] - dense[j][1]) * t;
    const tx = dense[j + 1][0] - dense[j][0], ty = dense[j + 1][1] - dense[j][1], tl = Math.hypot(tx, ty) || 1;
    out.push({ x, y, nx: -ty / tl, ny: tx / tl });
  }
  return out;
}

// A heart s wide round (cx, cy), its point turned by rot from straight down: two round
// lobes and the lines tangent to them that meet at the point. With r > 0 it is the same
// heart r inside its edge, and exactly so — the lobes shrink by r, the point rises along
// the axis, and the cusp between the lobes becomes an arc of radius r about it.
const HEART_A = 0.22, HEART_R = 0.28, HEART_H = 0.17, HEART_B = 0.45;

function heartPts(cx, cy, s, rot, r, step) {
  const a = HEART_A * s, R = HEART_R * s, h0 = HEART_H * s, Py = HEART_B * s;
  const R2 = R - r;
  const Cx = a, Cy = -h0;
  const Ky = Cy - Math.sqrt(R * R - a * a);
  const u = Math.atan2(Py - Cy, -Cx), al = Math.acos(R / Math.hypot(Cx, Py - Cy)), th = u - al;
  const ex = Cx + R * Math.cos(th), ey = Cy + R * Math.sin(th) - Py;
  const T2x = Cx + R2 * Math.cos(th), T2y = Cy + R2 * Math.sin(th);
  const P2y = T2y - ey * T2x / ex;
  if (R2 < 0.3 * R || P2y < Ky + r + 0.05 * s) {
    // too small to keep its shape when inset: the whole heart shrunk instead
    const s2 = s - 2.4 * r;
    return s2 > 0.08 * s ? heartPts(cx, cy, s2, rot, 0, step) : null;
  }
  const right = [[0, P2y]];
  const thK = Math.atan2(Ky - Cy, -Cx), span = th - thK;
  const m = Math.max(10, Math.ceil(R2 * span / step));
  for (let i = 0; i <= m; i++) {
    const t = th - span * i / m;
    right.push([Cx + R2 * Math.cos(t), Cy + R2 * Math.sin(t)]);
  }
  if (r > 0) {
    const b0 = Math.atan2(Cy - Ky, Cx), mk = Math.max(2, Math.ceil(r * (Math.PI / 2 - b0) / step));
    for (let i = 1; i <= mk; i++) {
      const t = b0 + (Math.PI / 2 - b0) * i / mk;
      right.push([r * Math.cos(t), Ky + r * Math.sin(t)]);
    }
  } else {
    right.push([0, Ky]);
  }
  const pts = right.slice();
  for (let i = right.length - 2; i >= 1; i--) pts.push([-right[i][0], right[i][1]]);
  const c = Math.cos(rot), sn = Math.sin(rot);
  const xs = new Float64Array(pts.length), ys = new Float64Array(pts.length);
  for (let i = 0; i < pts.length; i++) {
    xs[i] = cx + pts[i][0] * c - pts[i][1] * sn;
    ys[i] = cy + pts[i][0] * sn + pts[i][1] * c;
  }
  return { xs, ys };
}

// A twinkle: four points joined by curves bowed in towards the middle.
function starPts(cx, cy, size, rot) {
  const R = size / 2, out = [];
  for (let k = 0; k < 4; k++) {
    const a0 = rot + k * Math.PI / 2, a1 = a0 + Math.PI / 2;
    const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    for (let j = 0; j < 10; j++) {
      const t = j / 10, u = 1 - t;
      out.push([u * u * x0 + 2 * t * u * cx + t * t * x1, u * u * y0 + 2 * t * u * cy + t * t * y1]);
    }
  }
  return out;
}

function toArrays(pts) {
  const xs = new Float64Array(pts.length), ys = new Float64Array(pts.length);
  for (let i = 0; i < pts.length; i++) { xs[i] = pts[i][0]; ys[i] = pts[i][1]; }
  return { xs, ys };
}

function polyArea(xs, ys) {
  let A = 0;
  for (let i = 0, n = xs.length; i < n; i++) {
    const j = (i + 1) % n;
    A += xs[i] * ys[j] - xs[j] * ys[i];
  }
  return A / 2;
}

function polyBox(xs, ys) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] < x0) x0 = xs[i];
    if (xs[i] > x1) x1 = xs[i];
    if (ys[i] < y0) y0 = ys[i];
    if (ys[i] > y1) y1 = ys[i];
  }
  return { x0, y0, x1, y1 };
}

function inPoly(xs, ys, x, y) {
  let c = false;
  for (let i = 0, n = xs.length, j = n - 1; i < n; j = i++) {
    const yi = ys[i], yj = ys[j];
    if ((yi > y) !== (yj > y) && x < (xs[j] - xs[i]) * (y - yi) / (yj - yi) + xs[i]) c = !c;
  }
  return c;
}

// A convex outline r inside its edge, exactly: clipped by every edge moved in by r. Null
// when nothing is left — the shape is narrower than 2r.
function convexInset(xs, ys, r) {
  const n = xs.length;
  if (r <= 0) return { xs: Array.from(xs), ys: Array.from(ys) };
  const sg = polyArea(xs, ys) > 0 ? 1 : -1;
  let px = Array.from(xs), py = Array.from(ys);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, ex = xs[j] - xs[i], ey = ys[j] - ys[i], el = Math.hypot(ex, ey);
    if (el < 1e-12) continue;
    const nx = -ey / el * sg, ny = ex / el * sg;
    const qx = [], qy = [], m = px.length;
    for (let k = 0; k < m; k++) {
      const l = (k + 1) % m;
      const dk = (px[k] - xs[i]) * nx + (py[k] - ys[i]) * ny - r;
      const dl = (px[l] - xs[i]) * nx + (py[l] - ys[i]) * ny - r;
      if (dk >= 0) { qx.push(px[k]); qy.push(py[k]); }
      if ((dk >= 0) !== (dl >= 0)) {
        const t = dk / (dk - dl);
        qx.push(px[k] + t * (px[l] - px[k]));
        qy.push(py[k] + t * (py[l] - py[k]));
      }
    }
    px = qx; py = qy;
    if (px.length < 3) return null;
  }
  return Math.abs(polyArea(px, py)) > 1e-6 ? { xs: px, ys: py } : null;
}

// Any outline moved in by d along its corners' normals — for the second and third line of
// a bold outline, where a hair of error does not show.
function offsetPoly(xs, ys, d) {
  const n = xs.length, sg = polyArea(xs, ys) > 0 ? 1 : -1;
  const ox = new Float64Array(n), oy = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const h = (i - 1 + n) % n, j = (i + 1) % n;
    let ax = xs[i] - xs[h], ay = ys[i] - ys[h], al = Math.hypot(ax, ay) || 1;
    let bx = xs[j] - xs[i], by = ys[j] - ys[i], bl = Math.hypot(bx, by) || 1;
    const n1x = -ay / al * sg, n1y = ax / al * sg, n2x = -by / bl * sg, n2y = bx / bl * sg;
    let vx = n1x + n2x, vy = n1y + n2y;
    const vl = Math.hypot(vx, vy) || 1;
    vx /= vl; vy /= vl;
    const m = d / Math.max(0.35, vx * n1x + vy * n1y);
    ox[i] = xs[i] + vx * m;
    oy[i] = ys[i] + vy * m;
  }
  return { xs: ox, ys: oy };
}

// An open line moved sideways by d.
function offsetLine(xs, ys, d) {
  const n = xs.length, ox = new Float64Array(n), oy = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    const tx = xs[b] - xs[a], ty = ys[b] - ys[a], tl = Math.hypot(tx, ty) || 1;
    ox[i] = xs[i] - ty / tl * d;
    oy[i] = ys[i] + tx / tl * d;
  }
  return { xs: ox, ys: oy };
}

////////////////////////////////////////////////////////////////////////////////////////
// A unicorn
//
// Put together facing right, in units of its own — the body is about two across — as a
// list of parts from the back to the front. A part is an outline (or none), a family it
// melts into, the lines inside it and the fills it carries. A fill names its shapes, not
// its strokes: the strokes depend on the nib, and the nib is known only on the sheet.

function unicornParts(v, res) {
  let parts = [];
  const mk = (poly, group, o) => Object.assign({ poly, group, layer: 'outline', line: !!poly, bold: true,
                                                details: [], fills: [] }, o || {});
  const add = (poly, group, o) => { const p = mk(poly, group, o); parts.push(p); return p; };
  const N = k => Math.max(16, Math.round(k * res));
  const rnd = v.rnd;
  const C = v.chubby, rh = 0.9 * v.head;
  const bcy = 0.75, brx = 1.12 * C, bry = 0.72 * (0.8 + 0.2 * C);
  const bodyBot = bcy + bry, legTop = bcy + 0.12;
  const pose = v.pose, sitting = pose === 'sitting', lying = pose === 'lying', rearing = pose === 'rearing';
  const yb = lying ? bodyBot + 0.1 : bodyBot + 0.5 * v.legs;
  const lw = 0.42 * Math.pow(C, 0.4);
  const hcx = 0.8 * brx, hcy = bcy - bry + 0.3 - 0.96 * rh;
  const H = (x, y) => [hcx + x * rh, hcy + y * rh];
  const out = { parts: null, horn: null };
  const mermaid = v.tailStyle === 'mermaid';

  // lobes along a path, each with a curl in it — or hearts, point inward — bulging away
  // from the point `from`
  const lobes = (ctrl, count, r0, r1, group, from, hearts) => {
    const at = pathSample(ctrl, count), made = [];
    // never so few that they come apart: each overlaps the next by a fifth at least
    const spacing = count > 1 ? at.total / (count - 1) : 0;
    const grow = Math.max(1, (hearts ? 0.75 : 0.62) * spacing / Math.min(r0, r1));
    for (let i = 0; i < count; i++) {
      const q = at[i], t = count > 1 ? i / (count - 1) : 0;
      const r = (r0 + (r1 - r0) * t) * grow * (0.92 + 0.16 * rnd());
      const side = (q.nx * (q.x - from[0]) + q.ny * (q.y - from[1])) >= 0 ? 1 : -1;
      const nx = side * q.nx, ny = side * q.ny;
      const cx = q.x + nx * r * 0.25, cy = q.y + ny * r * 0.25;
      made.push(hearts ? heartLobe(cx, cy, r * 0.85, Math.atan2(nx, -ny), null) : lobe(cx, cy, r, group));
    }
    lobeFill(made);
  };
  const lobe = (cx, cy, r, group) => {
    const p = add(ellPts(cx, cy, r, r, 0, N(72)), group);
    if (v.curls) {
      p.details.push({ pts: spiralPts(cx, cy, r * 0.6, 1.15, rnd() * 2 * Math.PI, 1, N(56)),
                       layer: 'details' });
    }
    return p;
  };
  // a heart in place of a curl: its point to the head, a smaller heart inside it
  const heartLobe = (cx, cy, r, rot, group) => {
    const s2 = 2.3 * r, q = heartPts(cx, cy, s2, rot, 0, s2 * 0.02);
    const p = add(Array.from(q.xs, (x, i) => [x, q.ys[i]]), group);
    p.heart = [cx, cy, s2, rot];
    if (v.curls) p.fills.push({ members: [{ heart: [cx, cy, s2, rot] }], layer: 'details', mode: 'ring', insetK: 0.2 });
    return p;
  };
  const lobeFill = made => {
    if (!v.maneFill || !made.length) return;
    made[made.length - 1].fills.push({
      members: made.map(p => p.heart ? { heart: p.heart } : { poly: p.poly, loose: !!p.loose }),
      layer: 'mane', mode: 'solid', angle: 0.6 });
  };
  // a lock of hair: from a round root, dir from it, curling by bend towards its tip
  const lock = (root, dir, len, w0, bend, group) => {
    const n = N(40), cl = [], wave0 = rnd() * 0.6;
    let x = root[0], y = root[1];
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = dir + bend * t * t + 0.28 * Math.sin(2 * Math.PI * 1.1 * t + wave0);
      cl.push([x, y, a, w0 * Math.pow(1 - t, 0.65) * (0.85 + 0.3 * Math.sin(Math.PI * t * 0.8)) + 0.012]);
      x += Math.cos(a) * len / n;
      y += Math.sin(a) * len / n;
    }
    const left = [], right = [];
    for (const [cx, cy, a, w] of cl) {
      left.push([cx - Math.sin(a) * w, cy + Math.cos(a) * w]);
      right.push([cx + Math.sin(a) * w, cy - Math.cos(a) * w]);
    }
    const cap = [];
    for (let i = 1; i < 12; i++) {
      const a = dir + Math.PI / 2 + Math.PI * i / 12;
      cap.push([root[0] + Math.cos(a) * cl[0][3], root[1] + Math.sin(a) * cl[0][3]]);
    }
    const p = add(left.concat(right.reverse(), cap), group, { loose: true });
    if (v.curls) {
      const strand = cl.slice(Math.round(n * 0.12), Math.round(n * 0.85)).map(([cx, cy, a, w]) =>
        [cx + Math.sin(a) * w * 0.25, cy - Math.cos(a) * w * 0.25]);
      p.details.push({ pts: strand, layer: 'details', inside: true });
    }
    return p;
  };
  const leg = (x, top, bot, ang, group, pivY) => {
    const shape = supPts(x, (top + bot) / 2, lw / 2, (bot - top) / 2, 3.2, N(96));
    const piv = [x, pivY === undefined ? top + 0.15 : pivY];
    const p = mk(rotPts(shape, piv[0], piv[1], ang), group);
    const cut = bot - 0.2 * Math.sqrt(Math.max(0.3, v.legs));
    hoof(p, rotPts(shape.filter(q => q[1] >= cut), piv[0], piv[1], ang), ang);
    return p;
  };
  // a leg folded under, lying along the ground with its hoof to the front
  const tucked = (cx, cy, rx, ry, group) => {
    const shape = supPts(cx, cy, rx, ry, 3, N(80));
    const p = mk(shape, group);
    hoof(p, shape.filter(q => q[0] >= cx + rx - 0.17), Math.PI / 2);
    return p;
  };
  const hoof = (p, sub, ang) => {
    if (sub.length < 3) return;
    p.details.push({ pts: [sub[0], sub[sub.length - 1]], layer: 'outline' });
    if (v.hoof === 'filled') p.fills.push({ members: [{ poly: sub }], layer: 'horn', mode: 'solid', angle: ang });
    if (v.hoof === 'hatched') {
      p.fills.push({ members: [{ poly: sub }], layer: 'horn', mode: 'hatch', gap: settings.heartHatch * 0.8, angle: ang + 0.8 });
    }
  };

  // the tail
  const tx = -brx;
  if (mermaid) {
    // a fish's tail out of the rump, scales on it and a fin at its end
    const ctrl = [[-0.45 * brx, bcy + 0.3], [tx - 0.05, bcy + 0.58], [tx - 0.6, bcy + 0.45], [tx - 0.88, bcy + 0.02]];
    const at = pathSample(ctrl, 10);
    at.forEach((q, i) => {
      const r = (0.42 * C - 0.29 * C * i / 9) * v.tail;
      const p = add(ellPts(q.x, q.y, r, r, 0, N(64)), 'body');
      if (i > 1) {
        for (const dx of [-0.35, 0.35]) {
          p.details.push({ pts: arcPts(q.x + dx * r, q.y - 0.1 * r, 0.32 * r, 0.25, Math.PI - 0.25, 12), layer: 'details' });
        }
      }
    });
    const end = at[at.length - 1], prev = at[at.length - 2];
    const a = Math.atan2(end.y - prev.y, end.x - prev.x);
    for (const da of [-0.55, 0.55]) {
      const E = [end.x + Math.cos(a + da) * 0.55 * v.tail, end.y + Math.sin(a + da) * 0.55 * v.tail];
      const f = add(leafPts([end.x, end.y], E, 0.17 * v.tail, N(36)), 'fin');
      f.details.push({ pts: [[end.x, end.y], [E[0] * 0.8 + end.x * 0.2, E[1] * 0.8 + end.y * 0.2]], layer: 'details', inside: true });
    }
  } else if (v.tailStyle === 'waves') {
    const root = [tx + 0.18, bcy - bry * 0.45];
    for (let i = 0; i < 3; i++) {
      const t = i / 2;
      lock([root[0] + 0.05 * i, root[1] + 0.06 * i], Math.PI * (0.78 - 0.16 * t), (1.25 + 0.15 * t) * v.tail,
           0.22 * v.tail, -0.5 - 0.3 * rnd(), 'tail');
    }
  } else {
    lobes([[tx + 0.2, bcy - bry * 0.5], [tx - 0.2, bcy - 0.5], [tx - 0.58, bcy - 0.3],
           [tx - 0.72, bcy + 0.1], [tx - 0.6, bcy + 0.5], [tx - 0.32, bcy + 0.72]],
          Math.max(5, Math.round(v.curlCount * 0.8)), 0.3 * v.tail, 0.21 * v.tail, 'tail', [0, bcy],
          v.tailStyle === 'hearts');
  }

  // the legs: the far pair behind the body, the near pair one with it
  const ang = {
    standing: [0, 0, 0, 0], prancing: [0.12, -0.35, 0.25, -0.8], jumping: [0.55, -0.55, 0.75, -0.8],
    rearing: [0.42, -0.9, 0.42, -1.25],
  }[pose] || [0, 0, 0, 0];
  const farLegs = [], nearLegs = [];
  if (lying) {
    farLegs.push(tucked(0.85 * brx, bodyBot - 0.06, 0.3, 0.12, 'farFront'));
    nearLegs.push(tucked(-0.35 * brx, bodyBot - 0.03, 0.4, 0.14, 'body'));
    nearLegs.push(tucked(0.55 * brx, bodyBot - 0.02, 0.4, 0.14, 'body'));
  } else if (!sitting) {
    const fb = rearing ? legTop + (yb - legTop) * 0.75 : yb;
    if (!mermaid) farLegs.push(leg(-0.36 * brx, legTop, yb - 0.07, ang[0], 'farBack'));
    farLegs.push(leg(0.84 * brx, legTop, fb - 0.07, ang[1], 'farFront'));
    if (!mermaid) nearLegs.push(leg(-0.66 * brx, legTop, yb, ang[2], 'body'));
    nearLegs.push(leg(0.56 * brx, legTop, fb, ang[3], 'body'));
  }
  parts.push(...farLegs);
  let body;
  if (v.fluffy) {
    // a fleece: a smaller body and a ring of puffs round it
    body = add(supPts(0, bcy, brx * 0.9, bry * 0.86, 2.5, N(200)), 'body');
    const ring = supPts(0, bcy, brx * 0.9, bry * 0.86, 2.5, 18);
    for (const [x, y] of ring) add(ellPts(x, y, 0.2 * C, 0.2 * C, 0, N(48)), 'body');
  } else {
    body = add(supPts(0, bcy, brx, bry, 2.5, N(200)), 'body');
  }
  parts.push(...nearLegs);
  const bodyAt = parts.indexOf(body);

  // a wing of three feathers
  if (v.wings) {
    const root = [-0.38 * brx, bcy - 0.2], ws = v.wingSize;
    const feathers = [[-2.15, 0.95], [-2.55, 0.8], [-2.95, 0.62]];
    for (const [a, len] of feathers) {
      const L = len * ws, cx = root[0] + Math.cos(a) * L / 2, cy = root[1] + Math.sin(a) * L / 2;
      add(ellPts(cx, cy, L / 2, 0.15 * ws, a, N(80)), 'wing');
    }
    add(ellPts(root[0], root[1], 0.24 * ws, 0.2 * ws, -0.4, N(56)), 'wing');
  }

  // the head and its muzzle, one outline
  const headAt = parts.length;
  add(supPts(hcx, hcy, 1.04 * rh, 0.96 * rh, 2.3, N(200)), 'head');
  const muzzle = add(ellPts(hcx + 0.68 * rh, hcy + 0.4 * rh, 0.5 * rh, 0.4 * rh, 0, N(120)), 'head');
  face(muzzle);
  if (v.acc === 'bowtie') bowtie();

  // the mane down the back of the head
  const maneCtrl = [H(-0.02, -0.98), H(-0.5, -0.9), H(-0.92, -0.55), H(-1.08, -0.05), H(-0.98, 0.45), H(-0.72, 0.85)];
  if (v.maneStyle === 'waves') {
    // a few long locks falling from the crown down behind the head
    const k = clamp(Math.round(v.curlCount / 2), 3, 6), at = pathSample(maneCtrl.slice(0, 4), k), made = [];
    at.forEach((q, i) => {
      const t = k > 1 ? i / (k - 1) : 0;
      made.push(lock([q.x, q.y], Math.PI * (0.62 - 0.08 * t), rh * v.mane * (1.55 - 0.35 * t),
                     0.27 * rh * v.mane, 0.25 + 0.2 * rnd(), 'mane'));
    });
    lobeFill(made);
  } else if (v.maneStyle === 'bob') {
    lobes(maneCtrl.slice(0, 5), 4, 0.42 * rh * v.mane, 0.36 * rh * v.mane, 'mane', [hcx, hcy]);
  } else {
    lobes(maneCtrl, v.curlCount, 0.3 * rh * v.mane, 0.22 * rh * v.mane, 'mane', [hcx, hcy],
          v.maneStyle === 'hearts');
  }
  if (v.acc === 'scarf') scarf();
  if (v.acc === 'bow') bow();

  // the ear
  const ear = add(leafPts(H(-0.33, -0.72), H(-0.62, -1.42), 0.23 * rh, N(40)), null);
  ear.details.push({ pts: leafPts(H(-0.38, -0.85), H(-0.58, -1.3), 0.1 * rh, N(30)), layer: 'details', inside: true });
  if (v.acc === 'crown') crown();
  if (v.acc === 'flowers') flowers();
  if (v.acc === 'halo') halo();

  // the horn
  const Hb = H(0.1, -0.86), hAng = 0.26, hL = rh * v.horn, hw = 0.2 * rh;
  const horn = add(hornPts(Hb, hAng, hL, hw, 0.045 * rh, N(24)), null);
  const hdx = Math.sin(hAng), hdy = -Math.cos(hAng), hpx = Math.cos(hAng), hpy = Math.sin(hAng);
  out.horn = [Hb[0] + hdx * hL, Hb[1] + hdy * hL];
  if (v.hornStripes) {
    // a stripe is a line slanting up across the horn; candy stripes fill every other band
    const ns = Math.max(2, Math.round(2 + 2.2 * v.horn)), sl = 0.09 * rh;
    const lines = [];
    for (let k = 1; k <= ns; k++) {
      const t = k / (ns + 0.7), cx = Hb[0] + hdx * hL * t, cy = Hb[1] + hdy * hL * t;
      const a = [cx - hpx * hw * 1.4 - hdx * sl, cy - hpy * hw * 1.4 - hdy * sl];
      const b = [cx + hpx * hw * 1.4 + hdx * sl, cy + hpy * hw * 1.4 + hdy * sl];
      lines.push([a, b]);
      horn.details.push({ pts: [a, b], layer: 'details', inside: true });
    }
    if (v.hornCandy) {
      for (let k = 0; k <= ns; k += 2) {
        let band = horn.poly;
        if (k > 0) band = halfPlane(band, lines[k - 1], -1);
        if (band && k < ns) band = halfPlane(band, lines[k], 1);
        if (band && band.length >= 3) {
          horn.fills.push({ members: [{ poly: band }], layer: 'horn', mode: 'solid', angle: hAng + 0.5 });
        }
      }
    }
  }
  if (v.hornFill) horn.fills.push({ members: [{ poly: horn.poly }], layer: 'horn', mode: 'solid', angle: hAng - Math.PI / 2 });

  // the forelock, over the root of the horn
  const fm = v.mane;
  if (v.maneStyle === 'waves') {
    lobeFill([lock(H(-0.12, -0.92), 0.35, 0.62 * rh * fm, 0.17 * rh * fm, 0.9, 'mane')]);
  } else if (v.maneStyle === 'hearts') {
    lobeFill([heartLobe(...H(-0.1, -0.9), 0.22 * rh * fm, -0.3, null),
              heartLobe(...H(0.24, -0.86), 0.18 * rh * fm, 0.35, null)]);
  } else {
    const big = v.maneStyle === 'bob' ? 1.25 : 1;
    lobeFill([lobe(...H(-0.12, -0.86), 0.25 * rh * fm * big, 'mane'),
              lobe(...H(0.2, -0.84), 0.21 * rh * fm * big, 'mane'),
              lobe(...H(0.42, -0.74), 0.14 * rh * fm * big, 'mane')]);
  }

  // a heart balloon on a string held in the mouth
  if (v.balloon) {
    const bs = 1.0 * v.balloonSize, rot = 0.18;
    const c = [hcx + 1.5 * rh + 0.2 * bs, hcy - 1.75 * rh - 0.3 * bs];
    const bot = [c[0] - Math.sin(rot) * HEART_B * bs, c[1] + Math.cos(rot) * HEART_B * bs];
    const m0 = H(0.9, 0.55), str = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, x = m0[0] + (bot[0] - m0[0]) * t, y = m0[1] + (bot[1] - m0[1]) * t;
      const w = 0.06 * Math.sin(t * Math.PI * 3) * Math.sin(t * Math.PI);
      str.push([x + w, y]);
    }
    add(null, null, { line: false, details: [{ pts: str, layer: 'outline' }] });
    const q = heartPts(c[0], c[1], bs, rot, 0, bs * 0.015);
    const hp = add(Array.from(q.xs, (x, i) => [x, q.ys[i]]), null, { bold: false });
    styleHeart(hp, [c[0], c[1], bs, rot]);
  }

  // sitting or rearing: the whole animal turned about its rump or its hind hooves
  let turn = null;
  if (sitting) turn = [-0.78 * brx, bodyBot - 0.05, -0.4];
  if (rearing) turn = [-0.66 * brx, yb, -0.42];
  const rp = turn ? (([x, y]) => rotPts([[x, y]], turn[0], turn[1], turn[2])[0]) : (q => q);
  if (turn) {
    // the body turns; the head goes where the neck takes it and stays upright
    const neck = H(-0.3, 0.85), nk = rp(neck), dx = nk[0] - neck[0], dy = nk[1] - neck[1];
    parts.forEach((p, i) => {
      if (i < headAt) turnPart(p, turn[0], turn[1], turn[2]);
      else turnPart(p, 0, 0, 0, dx, dy);
    });
    out.horn = [out.horn[0] + dx, out.horn[1] + dy];
  }
  let ground = yb, hipPart = body, hip = rp([-0.42 * brx, bcy + 0.08]), hipRot = turn ? turn[2] : 0;
  if (sitting) {
    // front legs straight down to the ground; the hind leg a haunch and a foot forward
    let low = -Infinity;
    for (const [, y] of body.poly) low = Math.max(low, y);
    ground = low + 0.02;
    const fTop = rp([0.56 * brx, legTop + 0.1]), fTop2 = rp([0.84 * brx, legTop + 0.1]);
    const far = leg(fTop2[0], fTop2[1] - 0.1, ground - 0.06, 0, 'farFront');
    const near = leg(fTop[0], fTop[1] - 0.1, ground, 0, 'body');
    const thighC = rp([-0.4 * brx, bcy + 0.28]);
    const thigh = mk(ellPts(thighC[0], thighC[1], 0.46 * Math.sqrt(C), 0.38, -0.5, N(80)), 'thigh');
    const foot = tucked(thighC[0] + 0.32, ground - 0.14, 0.36, 0.14, 'thigh');
    parts.splice(bodyAt + 1, 0, near, thigh, foot);
    parts.splice(bodyAt, 0, far);
    hipPart = thigh; hip = thighC; hipRot = -0.3;
  }

  // the mark on the hip, or spots all over
  if (v.mark === 'heart') {
    heartOn(hipPart, [hip[0], hip[1], 0.36, -0.25 + hipRot]);
  } else if (v.mark === 'three hearts') {
    for (const [dx, dy, sz, r] of [[-0.12, 0.06, 0.25, -0.3], [0.14, -0.06, 0.2, 0.25], [0.02, -0.24, 0.15, -0.1]]) {
      const q = sitting ? [hip[0] + dx, hip[1] + dy] : rp([-0.42 * brx + dx, bcy + 0.08 + dy]);
      heartOn(hipPart, [q[0], q[1], sz, r + hipRot]);
    }
  } else if (v.mark === 'spots' || v.mark === 'dots') {
    const spots = [[-0.55, -0.1], [-0.15, 0.25], [0.3, -0.05], [-0.4, 0.45], [0.05, -0.4], [0.5, 0.35]];
    for (const [fx, fy] of spots) {
      const q = rp([fx * brx, bcy + fy * bry]);
      if (v.mark === 'spots') heartOn(body, [q[0], q[1], 0.2 + 0.08 * rnd(), (rnd() - 0.5) * 0.8 + hipRot]);
      else {
        const r = 0.07 + 0.06 * rnd();
        body.fills.push({ members: [{ poly: ellPts(q[0], q[1], r, r * 0.85, rnd() * 3, N(32)) }],
                          layer: 'blush', mode: 'solid', angle: 0.4, ring: true });
      }
    }
  }

  // behind it all: a rainbow with its feet in two little clouds, and a cloud to stand on
  const back = parts;
  parts = [];
  if (v.rainbow) {
    const cx = 0.25, cy = ground + 0.1, bw = 0.3 * v.bandW, r0 = 2.45;
    const bands = Math.max(0, v.bands), r1 = r0 + Math.max(1, bands) * bw;
    const poly = arcPts(cx, cy, r1, Math.PI, 2 * Math.PI, N(140))
      .concat(arcPts(cx, cy, r0, 2 * Math.PI, Math.PI, N(120)));
    const p = add(poly, null, { line: false });
    for (let i = 0; i < bands; i++) {
      // every other band in arcs further apart, lighter than a solid band
      p.fills.push({ members: [{ annulus: [cx, cy, r0 + i * bw, r0 + (i + 1) * bw, Math.PI, 2 * Math.PI] }],
                     layer: i % 2 ? 'rainbow2' : 'rainbow1', mode: i % 2 ? 'hatch' : 'solid',
                     gap: settings.heartHatch });
    }
    if (v.rainbowLines) {
      for (let i = 0; i <= Math.max(1, bands); i++) {
        p.details.push({ pts: arcPts(cx, cy, r0 + i * bw, Math.PI, 2 * Math.PI, N(140)), layer: 'outline' });
      }
    }
    for (const side of [-1, 1]) {
      const fx = cx + side * (r0 + r1) / 2, w = (r1 - r0) / 2 + 0.3;
      cloud(fx - w * 0.75, fx + w * 0.75, cy - 0.02, 3, 'rainbowCloud' + side);
    }
  }
  if (v.cloud) cloud(-brx - 0.45, brx + 1.0, ground + 0.08, 6, 'cloud');
  out.parts = parts.concat(back);
  return out;

  function cloud(x0, x1, cy, bumps, group) {
    add(supPts((x0 + x1) / 2, cy + 0.08, (x1 - x0) / 2 + 0.18, 0.22, 2.6, N(140)), group);
    for (let i = 0; i < bumps; i++) {
      const t = bumps > 1 ? i / (bumps - 1) : 0.5;
      const r = (0.24 + 0.12 * Math.sin(t * Math.PI) + 0.05 * rnd()) * Math.min(1, (x1 - x0) / 1.6 + 0.3);
      add(ellPts(x0 + t * (x1 - x0), cy - 0.06, r, r * 0.9, 0, N(64)), group);
    }
  }

  // points given in heads, turned by ang about (0, 0) and put at c
  function place(pts, c, ang) {
    const co = Math.cos(ang), si = Math.sin(ang);
    return pts.map(([x, y]) => [c[0] + (x * co - y * si) * rh, c[1] + (x * si + y * co) * rh]);
  }

  function crown() {
    const c = H(-0.2, -1.0), a = -0.3;
    const pts = [[-0.3, 0.04], [0.3, 0.04], [0.33, -0.36], [0.16, -0.18], [0, -0.42], [-0.16, -0.18], [-0.33, -0.36]];
    const p = add(place(pts, c, a), 'crown', { loose: true });
    p.details.push({ pts: place([[-0.34, -0.1], [0.34, -0.1]], c, a), layer: 'details', inside: true });
    p.fills.push({ members: [{ poly: place([[-0.3, 0.04], [0.3, 0.04], [0.3, -0.1], [-0.3, -0.1]], c, a) }],
                   layer: 'horn', mode: 'hatch', gap: settings.heartHatch * 0.8, angle: a + 0.8 });
    for (const [x, y] of [[0.33, -0.4], [0, -0.46], [-0.33, -0.4]]) {
      const [jx, jy] = place([[x, y]], c, a)[0];
      const j = add(ellPts(jx, jy, 0.055 * rh, 0.055 * rh, 0, N(28)), null, { bold: false });
      j.fills.push({ members: [{ poly: j.poly }], layer: 'horn', mode: 'solid', angle: 0, ring: true });
    }
  }

  function flowers() {
    [-2.65, -2.25, -1.9, -1.08, -0.72].forEach((a, k) => {
      const c = [hcx + Math.cos(a) * 1.0 * rh, hcy + Math.sin(a) * 0.93 * rh], g = 'flower' + k;
      const turn0 = rnd() * 2;
      for (let i = 0; i < 5; i++) {
        const b = turn0 + i * 2 * Math.PI / 5;
        add(ellPts(c[0] + Math.cos(b) * 0.1 * rh, c[1] + Math.sin(b) * 0.1 * rh, 0.085 * rh, 0.085 * rh, 0, N(32)), g);
      }
      const m = add(ellPts(c[0], c[1], 0.06 * rh, 0.06 * rh, 0, N(28)), null, { bold: false });
      m.fills.push({ members: [{ poly: m.poly }], layer: 'blush', mode: 'solid', angle: 0, ring: true });
    });
  }

  function halo() {
    const c = H(-0.35, -1.75);
    const p = add(ellPts(c[0], c[1], 0.5 * rh, 0.12 * rh, -0.12, N(80)), null);
    p.details.push({ pts: ellPts(c[0], c[1], 0.36 * rh, 0.06 * rh, -0.12, N(60)).concat([[c[0] + 0.36 * rh * Math.cos(-0.12), c[1] + 0.36 * rh * Math.sin(-0.12)]]),
                     layer: 'outline' });
  }

  function bow() {
    const K = H(-0.98, -0.25), g = 'bow';
    const loops = [[-0.3, -0.12, 0.13], [0.3, -0.12, 0.13], [-0.15, 0.27, 0.06], [0.14, 0.27, 0.06]];
    for (const [dx, dy, w] of loops) {
      const a = Math.atan2(dy, dx), L = Math.hypot(dx, dy) * rh;
      const p = add(w > 0.1
        ? ellPts(K[0] + Math.cos(a) * L * 0.55, K[1] + Math.sin(a) * L * 0.55, L * 0.6, w * rh, a, N(40))
        : leafPts(K, [K[0] + dx * rh, K[1] + dy * rh], w * rh, N(32)), g);
      p.fills.push({ members: [{ poly: p.poly }], layer: 'horn', mode: 'solid', angle: 0.7, ring: false });
    }
    const k = add(ellPts(K[0], K[1], 0.06 * rh, 0.075 * rh, 0, N(32)), null, { bold: false });
    k.fills.push({ members: [{ poly: k.poly }], layer: 'horn', mode: 'solid', angle: 0, ring: false });
  }

  function bowtie() {
    const K = H(-0.08, 1.0);
    for (const sgn of [-1, 1]) {
      const p = add([[K[0], K[1]], [K[0] + sgn * 0.24 * rh, K[1] - 0.14 * rh], [K[0] + sgn * 0.24 * rh, K[1] + 0.14 * rh]], 'tie');
      p.fills.push({ members: [{ poly: p.poly }], layer: 'horn', mode: 'solid', angle: 0.6, ring: false });
    }
    add(ellPts(K[0], K[1], 0.05 * rh, 0.06 * rh, 0, N(24)), null, { bold: false });
  }

  function scarf() {
    const c = H(-0.3, 0.9), a = 0.28;
    const band = add(place(supPts(0, 0, 0.5, 0.15, 3, 80), c, a), 'scarf');
    for (let i = -3; i <= 3; i++) {
      band.details.push({ pts: place([[i * 0.13, -0.3], [i * 0.13 + 0.05, 0.3]], c, a), layer: 'details', inside: true });
    }
    const e0 = place([[-0.3, 0.05]], c, a)[0];
    const end = add(place(supPts(0, 0.32, 0.12, 0.34, 3, 60), e0, 0.25), 'scarf');
    const fr = place([[-0.1, 0.64], [-0.1, 0.78], [0, 0.66], [0, 0.8], [0.1, 0.64], [0.1, 0.78]], e0, 0.25);
    for (let i = 0; i < 6; i += 2) end.details.push({ pts: [fr[i], fr[i + 1]], layer: 'outline' });
    end.details.push({ pts: place([[-0.14, 0.2], [0.14, 0.2]], e0, 0.25), layer: 'details', inside: true });
    end.details.push({ pts: place([[-0.14, 0.4], [0.14, 0.4]], e0, 0.25), layer: 'details', inside: true });
  }

  // the eye, the eyelashes, a nostril, a smile and a blush; glasses if worn
  function face(p) {
    const [ex, ey] = H(0.2, -0.06), erx = 0.155 * rh, ery = 0.215 * rh, er = -0.1;
    const lash = (bx, by, a, len) => [[bx, by], [bx + Math.cos(a + 0.12) * len * 0.55, by + Math.sin(a + 0.12) * len * 0.55],
                                      [bx + Math.cos(a - 0.08) * len, by + Math.sin(a - 0.08) * len]];
    const lashes = () => {
      for (const a of [-2.75, -2.35, -1.95]) {
        const c = Math.cos(a), s = Math.sin(a), cr = Math.cos(er), sr = Math.sin(er);
        const lx = erx * c, ly = ery * s;
        const bx = ex + lx * cr - ly * sr, by = ey + lx * sr + ly * cr;
        p.details.push({ pts: lash(bx, by, a - 0.1, 0.12 * rh), layer: 'outline', bold: true });
      }
    };
    if (v.eyes === 'sparkly') {
      p.fills.push({ members: [{ poly: ellPts(ex, ey, erx, ery, er, N(64)) }],
                     holes: [{ c: [ex + 0.055 * rh, ey - 0.08 * rh, 0.058 * rh] },
                             { c: [ex - 0.05 * rh, ey + 0.09 * rh, 0.026 * rh] }],
                     layer: 'outline', mode: 'solid', angle: Math.PI / 2, keep: true });
      lashes();
    } else if (v.eyes === 'hearts') {
      const Hh = [ex, ey, 0.4 * rh, -0.1];
      p.fills.push({ members: [{ heart: Hh }], layer: 'hearts', mode: 'solid', angle: 0.4, ring: true });
      p.fills.push({ members: [{ heart: Hh }], layer: 'outline', mode: 'ring', inset: 0 });
      lashes();
    } else if (v.eyes === 'happy') {
      const r = 0.16 * rh, cy = ey + 0.06 * rh;
      p.details.push({ pts: arcPts(ex, cy, r, -Math.PI + 0.35, -0.35, 24), layer: 'outline', bold: true });
      const a = -Math.PI + 0.35, bx = ex + r * Math.cos(a), by = cy + r * Math.sin(a);
      p.details.push({ pts: lash(bx, by, -2.6, 0.1 * rh), layer: 'outline', bold: true });
      p.details.push({ pts: lash(bx + 0.04 * rh, by - 0.06 * rh, -2.1, 0.09 * rh), layer: 'outline', bold: true });
    } else {
      const r = 0.16 * rh, cy = ey - 0.04 * rh;
      p.details.push({ pts: arcPts(ex, cy, r, 0.35, Math.PI - 0.35, 24), layer: 'outline', bold: true });
      for (const a of [1.2, 1.75, 2.3]) {
        const bx = ex + r * Math.cos(a), by = cy + r * Math.sin(a);
        p.details.push({ pts: lash(bx, by, a + 0.2, 0.09 * rh), layer: 'outline', bold: true });
      }
    }
    if (v.acc === 'glasses') {
      const gr = 0.3 * rh, ring = arcPts(ex, ey, gr, 0, 2 * Math.PI, 48);
      p.details.push({ pts: ring, layer: 'outline', bold: true });
      p.details.push({ pts: [[ex - gr, ey - 0.02 * rh], H(-0.5, -0.24)], layer: 'outline', bold: true });
      p.details.push({ pts: [[ex + gr * Math.cos(-0.3), ey + gr * Math.sin(-0.3)], H(0.66, -0.2)], layer: 'outline', bold: true });
    }
    // the nostril and the smile
    p.details.push({ pts: arcPts(...H(1.0, 0.27), 0.045 * rh, Math.PI * 1.05, Math.PI * 1.95, 12), layer: 'outline' });
    p.details.push({ pts: arcPts(...H(0.84, 0.5), 0.13 * rh, 0.3, 1.45, 16), layer: 'outline', bold: true });
    // the blush
    const [bx, by] = H(0.4, 0.34), brx2 = 0.15 * rh, bry2 = 0.085 * rh;
    const cheek = ellPts(bx, by, brx2, bry2, 0, N(48));
    if (v.blush === 'filled') p.fills.push({ members: [{ poly: cheek }], layer: 'blush', mode: 'solid', angle: 0, ring: true });
    else if (v.blush === 'hatched') {
      p.fills.push({ members: [{ poly: cheek }], layer: 'blush', mode: 'hatch', gap: settings.heartHatch, angle: -0.9, ring: true });
    } else if (v.blush === 'ring') {
      p.fills.push({ members: [{ poly: cheek }], layer: 'blush', mode: 'ring', inset: 0 });
    } else if (v.blush === 'dashes') {
      for (let j = -1; j <= 1; j++) {
        const cx = bx + j * 0.09 * rh;
        p.details.push({ pts: [[cx - 0.025 * rh, by + 0.05 * rh], [cx + 0.025 * rh, by - 0.05 * rh]], layer: 'blush' });
      }
    }
  }
}

// A part turned by ang about (px, py) and moved by (dx, dy): its outline, its lines and its
// fills.
function turnPart(p, px, py, ang, dx = 0, dy = 0) {
  const r = pts => rotPts(pts, px, py, ang).map(([x, y]) => [x + dx, y + dy]);
  const r1 = (x, y) => r([[x, y]])[0];
  if (p.poly) p.poly = r(p.poly);
  if (p.heart) p.heart = [...r1(p.heart[0], p.heart[1]), p.heart[2], p.heart[3] + ang];
  for (const d of p.details) d.pts = r(d.pts);
  for (const f of p.fills) {
    f.angle = (f.angle || 0) + ang;
    f.members = f.members.map(m => m.poly ? { ...m, poly: r(m.poly) }
      : m.heart ? { heart: [...r1(m.heart[0], m.heart[1]), m.heart[2], m.heart[3] + ang] } : m);
    if (f.holes) f.holes = f.holes.map(h => ({ c: [...r1(h.c[0], h.c[1]), h.c[2]] }));
  }
}

// A heart's ink, as the hearts are asked to be: a fill in the heart pen, a line round it in
// the heart line pen, or both. On a part of its own the line is the part's outline; on the
// hip it is a ring of the heart itself.
function styleHeart(p, Hh, onPart) {
  const st = settings.heartInk, m = [{ heart: Hh }];
  if (st === 'filled' || st === 'filled + outline') {
    p.fills.push({ members: m, layer: 'hearts', mode: 'solid', angle: Hh[3] + 0.5, ring: onPart && st === 'filled' });
  }
  if (st === 'hatched') {
    p.fills.push({ members: m, layer: 'heartLines', mode: 'hatch', gap: settings.heartHatch, angle: Hh[3] + Math.PI / 4 });
  }
  if (st === 'double outline') {
    p.fills.push({ members: m, layer: 'heartLines', mode: 'ring', inset: settings.heartHatch });
  }
  const line = st !== 'filled' || settings.colouring;
  if (onPart) {
    if (st !== 'filled') p.fills.push({ members: m, layer: 'heartLines', mode: 'ring', inset: 0 });
  } else {
    p.line = line;
    p.layer = 'heartLines';
  }
}

function heartOn(p, Hh) { styleHeart(p, Hh, true); }

// What one unicorn of the sheet is like: the settings, each shaken a little by the
// variety, and the choices left to chance where the settings say mixed.
function variantFor(i) {
  const s = settings, R = rng(1000 + i * 7919), V = s.variety / 100;
  const j = a => 1 + V * a * (R() * 2 - 1);
  const pick = (opt, list) => opt === 'mixed' ? list[Math.floor(R() * list.length)] : opt;
  const v = {
    rnd: rng(5000 + i * 104729),
    head: s.headSize / 100 * j(0.15), chubby: s.chubby / 100 * j(0.12),
    legs: s.legLength / 100 * j(0.25), horn: s.hornLength / 100 * j(0.3),
    mane: s.maneSize / 100 * j(0.2), tail: s.tailSize / 100 * j(0.2),
    curlCount: Math.max(3, Math.round(s.maneCurls * j(0.3))),
    eyes: pick(s.eyes, ['sparkly', 'sparkly', 'happy', 'sleepy', 'hearts']),
    pose: pick(s.pose, ['standing', 'standing', 'prancing', 'jumping', 'sitting', 'lying']),
    flipRoll: R(),
    maneStyle: s.maneStyle, tailStyle: s.tailStyle, acc: s.accessory, fluffy: s.fluffy,
    wings: s.wings, wingSize: s.wingSize / 100, cloud: s.cloud,
    rainbow: s.rainbow, bands: s.rainbowBands, bandW: s.rainbowWidth / 100, rainbowLines: s.rainbowLines || s.colouring,
    balloon: s.balloon, balloonSize: s.balloonSize / 100, mark: s.cutieMark,
    curls: s.maneInk.includes('curls'), maneFill: s.maneInk.includes('filled'),
    hornStripes: s.hornInk.includes('stripes'), hornCandy: s.hornInk === 'candy stripes',
    hornFill: s.hornInk === 'filled', hoof: s.hoofInk, blush: s.blush,
  };
  let ch = s.character;
  if (ch === 'mixed') {
    // dealt from a deck shuffled by the seed, so a sheet repeats none until it must
    const deck = DEALT.slice(), D = rng(31);
    for (let k = deck.length - 1; k > 0; k--) { const m = Math.floor(D() * (k + 1)); [deck[k], deck[m]] = [deck[m], deck[k]]; }
    ch = deck[i % deck.length];
  }
  const pre = CHARACTERS[ch] || {};
  for (const k in pre) {
    if (['head', 'chubby', 'legs', 'horn'].includes(k)) v[k] *= pre[k];
    else v[k] = pre[k];
  }
  v.character = ch;
  return v;
}

// A unicorn put on the sheet: fitted into a box, turned to face the way asked, tilted.
function placeUnicorn(v, box, flip) {
  const probe = unicornParts(v, 1);
  let bb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const p of probe.parts) {
    if (!p.poly) continue;
    for (const [x, y] of p.poly) {
      if (x < bb.x0) bb.x0 = x;
      if (x > bb.x1) bb.x1 = x;
      if (y < bb.y0) bb.y0 = y;
      if (y > bb.y1) bb.y1 = y;
    }
  }
  const bw = bb.x1 - bb.x0, bh = bb.y1 - bb.y0;
  const k = Math.min(box.w / bw, box.h / bh);
  if (!(k > 0)) return null;
  // finer outlines for a bigger unicorn
  const built = unicornParts({ ...v, rnd: v.rndSeed() }, clamp(k / 28, 1, 6));
  const T = { k, flip, tilt: rad(settings.tilt), ox: box.x + box.w / 2, oy: box.y + box.h / 2,
              px: (bb.x0 + bb.x1) / 2, py: (bb.y0 + bb.y1) / 2 };
  const c = Math.cos(T.tilt), s = Math.sin(T.tilt);
  const tp = (x, y) => {
    const fx = T.flip * T.k * (x - T.px), fy = T.k * (y - T.py);
    return [T.ox + c * fx - s * fy, T.oy + s * fx + c * fy];
  };
  const tpoly = pts => {
    const xs = new Float64Array(pts.length), ys = new Float64Array(pts.length);
    for (let i = 0; i < pts.length; i++) { const q = tp(pts[i][0], pts[i][1]); xs[i] = q[0]; ys[i] = q[1]; }
    return { xs, ys };
  };
  const ta = a => (T.flip < 0 ? Math.PI - a : a) + T.tilt;
  const parts = built.parts.map(p => {
    const q = { ...p, poly: null, xs: null, ys: null };
    if (p.poly) { const a = tpoly(p.poly); q.xs = a.xs; q.ys = a.ys; }
    q.details = p.details.map(d => ({ ...d, ...tpoly(d.pts) }));
    q.fills = p.fills.map(f => ({
      ...f,
      angle: ta(f.angle || 0),
      members: f.members.map(m => {
        if (m.poly) return { poly: tpoly(m.poly), loose: m.loose };
        if (m.heart) {
          const [x, y] = tp(m.heart[0], m.heart[1]);
          return { heart: [x, y, m.heart[2] * k, (T.flip < 0 ? -m.heart[3] : m.heart[3]) + T.tilt] };
        }
        const [cx, cy, r1, r2, a0, a1] = m.annulus, [x, y] = tp(cx, cy);
        const b0 = T.flip < 0 ? Math.PI - a1 : a0, b1 = T.flip < 0 ? Math.PI - a0 : a1;
        return { annulus: [x, y, r1 * k, r2 * k, b0 + T.tilt, b1 + T.tilt] };
      }),
      holes: (f.holes || []).map(h => { const [x, y] = tp(h.c[0], h.c[1]); return { cx: x, cy: y, r: h.c[2] * k }; }),
    }));
    return q;
  });
  let box2 = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const p of parts) {
    if (!p.xs) continue;
    const b = polyBox(p.xs, p.ys);
    box2 = { x0: Math.min(box2.x0, b.x0), y0: Math.min(box2.y0, b.y0), x1: Math.max(box2.x1, b.x1), y1: Math.max(box2.y1, b.y1) };
  }
  return { parts, box: box2, horn: tp(...built.horn), k, character: v.character };
}

////////////////////////////////////////////////////////////////////////////////////////
// The herd
//
// One unicorn in the middle of the picture; two facing each other under a big heart; or
// a grid of them, each in a cell of its own.

function layoutFigures() {
  const s = settings, A = area, fs = clamp(s.figSize, 5, 150) / 100;
  const figs = [], cells = [];
  const facingOf = (i, v) => {
    if (s.facing === 'left') return -1;
    if (s.facing === 'alternate') return i % 2 ? -1 : 1;
    if (s.facing === 'random') return v.flipRoll < 0.5 ? -1 : 1;
    return 1;
  };
  if (s.layout === 'pair') {
    // the big heart has the top of the picture to itself
    const top = A.y0 + Math.min(A.w, A.h) * clamp(s.pairHeart, 5, 80) / 100 * 0.95, h = A.y1 - top;
    cells.push({ x: A.x0, y: top, w: A.w / 2, h, flip: 1 });
    cells.push({ x: A.x0 + A.w / 2, y: top, w: A.w / 2, h, flip: -1 });
  } else if (s.layout === 'grid') {
    const nc = clamp(Math.round(s.cols), 1, 12), nr = clamp(Math.round(s.rows), 1, 12);
    for (let r = 0; r < nr; r++) {
      for (let c = 0; c < nc; c++) {
        cells.push({ x: A.x0 + A.w * c / nc, y: A.y0 + A.h * r / nr, w: A.w / nc, h: A.h / nr });
      }
    }
  } else {
    cells.push({ x: A.x0, y: A.y0, w: A.w, h: A.h });
  }
  cells.forEach((cell, i) => {
    const v = variantFor(i);
    v.rndSeed = () => rng(5000 + i * 104729);
    const flip = cell.flip || facingOf(i, v);
    const w = cell.w * fs, h = cell.h * fs;
    const box = { x: cell.x + (cell.w - w) / 2 + s.figX, y: cell.y + (cell.h - h) / 2 + s.figY, w, h };
    const f = placeUnicorn(v, box, flip);
    if (f) figs.push(f);
  });
  return figs;
}

////////////////////////////////////////////////////////////////////////////////////////
// Room on the sheet
//
// A coarse grid of what is taken: the unicorns' outlines, and every heart and twinkle as
// it is placed. A heart goes only where a disc round it is free.

let OCC = null;

function occMake() {
  const [W, H] = paperDims();
  const cs = Math.max(0.5, Math.sqrt(W * H / 2.5e6));
  const w = Math.ceil(W / cs) + 1, h = Math.ceil(H / cs) + 1;
  OCC = { cs, w, h, g: new Uint8Array(w * h) };
}

function occPoly(xs, ys) {
  const O = OCC, b = polyBox(xs, ys);
  const r0 = Math.max(0, Math.floor(b.y0 / O.cs)), r1 = Math.min(O.h - 1, Math.ceil(b.y1 / O.cs));
  const n = xs.length, cuts = [];
  for (let r = r0; r <= r1; r++) {
    const y = (r + 0.5) * O.cs;
    cuts.length = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      if ((ys[i] > y) !== (ys[j] > y)) cuts.push(xs[i] + (y - ys[i]) / (ys[j] - ys[i]) * (xs[j] - xs[i]));
    }
    cuts.sort((a, b2) => a - b2);
    for (let k = 0; k + 1 < cuts.length; k += 2) {
      const c0 = Math.max(0, Math.floor(cuts[k] / O.cs)), c1 = Math.min(O.w - 1, Math.floor(cuts[k + 1] / O.cs));
      for (let c = c0; c <= c1; c++) O.g[r * O.w + c] = 1;
    }
  }
}

function occDisc(cx, cy, rr, mark) {
  const O = OCC;
  const c0 = Math.floor((cx - rr) / O.cs), c1 = Math.floor((cx + rr) / O.cs);
  const r0 = Math.floor((cy - rr) / O.cs), r1 = Math.floor((cy + rr) / O.cs);
  for (let r = r0; r <= r1; r++) {
    if (r < 0 || r >= O.h) continue;
    for (let c = c0; c <= c1; c++) {
      if (c < 0 || c >= O.w) continue;
      const dx = (c + 0.5) * O.cs - cx, dy = (r + 0.5) * O.cs - cy;
      if (dx * dx + dy * dy > rr * rr) continue;
      if (mark) O.g[r * O.w + c] = 1;
      else if (O.g[r * O.w + c]) return false;
    }
  }
  return true;
}

function inPicture(cx, cy, rr) {
  return cx - rr >= area.x0 && cx + rr <= area.x1 && cy - rr >= area.y0 && cy + rr <= area.y1;
}

////////////////////////////////////////////////////////////////////////////////////////
// Hearts and twinkles

function heartPart(cx, cy, size, rot) {
  const q = heartPts(cx, cy, size, rot, 0, 0.4);
  const p = { xs: q ? q.xs : null, ys: q ? q.ys : null, group: null, layer: 'heartLines',
              line: false, bold: false, details: [], fills: [] };
  styleHeart(p, [cx, cy, size, rot]);
  return p;
}

function placeHearts(figs, out) {
  const s = settings, R = rng(4242);
  const lo = Math.max(1, Math.min(s.heartMin, s.heartMax)), hi = Math.max(1, s.heartMin, s.heartMax);
  const gap = Math.max(0, s.heartGap), tilt = rad(s.heartTilt);
  let count = 0;
  const tryPut = (cx, cy, size, rot, force) => {
    const rr = size * 0.5;
    if (!inPicture(cx, cy, rr)) return false;
    if (!force && !occDisc(cx, cy, rr + gap, false)) return false;
    occDisc(cx, cy, rr, true);
    out.push(heartPart(cx, cy, size, rot));
    count++;
    return true;
  };
  const spin = () => (R() * 2 - 1) * tilt;

  // the big heart between a pair
  if (s.layout === 'pair' && figs.length === 2) {
    const size = Math.min(area.w, area.h) * clamp(s.pairHeart, 5, 80) / 100;
    const cx = (area.x0 + area.x1) / 2 + s.figX;
    const cy = area.y0 + size * 0.5;
    tryPut(cx, cy, size, 0, true);
  }

  const cap = clamp(Math.round(s.heartCount), 0, 3000);
  if (s.hearts === 'scattered') {
    const sizes = [];
    for (let i = 0; i < cap; i++) sizes.push(lo + (hi - lo) * Math.pow(R(), 1.7));
    sizes.sort((a, b) => b - a);
    for (const size of sizes) {
      for (let t = 0; t < 400; t++) {
        const cx = area.x0 + size / 2 + R() * Math.max(0, area.w - size);
        const cy = area.y0 + size / 2 + R() * Math.max(0, area.h - size);
        if (tryPut(cx, cy, size, spin())) break;
      }
    }
  } else if (s.hearts === 'everywhere') {
    const total = 40000;
    for (let t = 0; t < total && count < 4000; t++) {
      const size = hi - (hi - lo) * Math.sqrt(t / total);
      const cx = area.x0 + size / 2 + R() * Math.max(0, area.w - size);
      const cy = area.y0 + size / 2 + R() * Math.max(0, area.h - size);
      tryPut(cx, cy, size, spin());
    }
  } else if (s.hearts === 'rising') {
    for (const f of figs) {
      const [x0, y0] = f.horn, top = area.y0 + hi * 0.5;
      const run = Math.max(1, y0 - top), phase = R() * 6;
      let y = y0 - lo * 0.5 - gap, placed = 0, side = 1, prev = 0;
      while (y > top && placed < cap) {
        const t = clamp((y0 - y) / run, 0, 1), size = lo + (hi - lo) * t;
        const x = x0 + Math.sin(phase + t * 7) * (6 + 0.12 * run * t);
        if (tryPut(x, y, size, side * tilt * 0.6)) { placed++; side = -side; prev = size; y -= (prev + size) / 2 + gap + 0.5; }
        else y -= 1;
      }
    }
  } else if (s.hearts === 'frame') {
    const size = hi, inset = size / 2 + 0.5;
    const X0 = area.x0 + inset, X1 = area.x1 - inset, Y0 = area.y0 + inset, Y1 = area.y1 - inset;
    const nx = Math.max(1, Math.floor((X1 - X0) / (size + gap))), ny = Math.max(1, Math.floor((Y1 - Y0) / (size + gap)));
    let k = 0;
    const put = (x, y) => { tryPut(x, y, size, (k++ % 2 ? 1 : -1) * tilt * 0.5, false); };
    for (let i = 0; i <= nx; i++) { put(X0 + (X1 - X0) * i / nx, Y0); put(X0 + (X1 - X0) * i / nx, Y1); }
    for (let j = 1; j < ny; j++) { put(X0, Y0 + (Y1 - Y0) * j / ny); put(X1, Y0 + (Y1 - Y0) * j / ny); }
  }
  return count;
}

function placeTwinkles(out) {
  const s = settings, R = rng(777);
  const n = clamp(Math.round(s.twinkles), 0, 2000), base = Math.max(1, s.twinkleSize);
  let count = 0;
  for (let i = 0; i < n; i++) {
    const dot = s.twinkleStyle === 'dots' || (s.twinkleStyle === 'stars and dots' && R() < 0.4);
    const size = dot ? base * 0.25 : base * (0.6 + 0.7 * R());
    for (let t = 0; t < 200; t++) {
      const cx = area.x0 + size + R() * Math.max(0, area.w - 2 * size);
      const cy = area.y0 + size + R() * Math.max(0, area.h - 2 * size);
      if (!inPicture(cx, cy, size / 2) || !occDisc(cx, cy, size * 0.5 + Math.max(1.5, s.heartGap * 0.6), false)) continue;
      occDisc(cx, cy, size * 0.5, true);
      if (dot) {
        const q = toArrays(ellPts(cx, cy, size / 2, size / 2, 0, 24));
        out.push({ xs: q.xs, ys: q.ys, group: null, line: false, bold: false, details: [],
                   fills: [{ members: [{ poly: q }], layer: 'twinkles', mode: 'solid', angle: 0.7, ring: true }] });
      } else {
        const q = toArrays(starPts(cx, cy, size, R() * 0.4 - 0.2));
        out.push({ xs: q.xs, ys: q.ys, group: null, layer: 'twinkles', line: true, bold: false,
                   details: [], fills: [] });
      }
      count++;
      break;
    }
  }
  return count;
}

////////////////////////////////////////////////////////////////////////////////////////
// Fills
//
// The drawer's rule for a filled shape: its outline drawn half a nib inside the edge, so
// the ink stops at the edge and goes no further; passes across it, evenly, no further
// apart than the pass setting; a shape too narrow for that is one touch of the pen. A fill
// of several overlapping shapes fills what they cover together; holes stay paper.

let PASS = 0.85;

function fillStrokes(f, nib) {
  const out = [], r = nib / 2;
  const m0 = f.members[0];
  if (m0.annulus) {
    const [cx, cy, r1, r2, a0, a1] = m0.annulus, lo = r1 + r, hi = r2 - r;
    const gap = f.mode === 'hatch' ? Math.max(nib, f.gap || 1) : PASS * nib;
    const radii = [];
    if (hi <= lo) radii.push((r1 + r2) / 2);
    else {
      const n = Math.max(1, Math.ceil((hi - lo) / gap - 1e-9));
      for (let k = 0; k <= n; k++) radii.push(lo + (hi - lo) * k / n);
    }
    radii.forEach((rr, k) => {
      const m = Math.max(8, Math.ceil(rr * Math.abs(a1 - a0) / 0.8));
      const xs = [], ys = [];
      for (let j = 0; j <= m; j++) {
        const t = k % 2 ? 1 - j / m : j / m, a = a0 + (a1 - a0) * t;
        xs.push(cx + rr * Math.cos(a));
        ys.push(cy + rr * Math.sin(a));
      }
      out.push({ xs, ys });
    });
    return out;
  }
  const insetOf = (m, d) => m.heart ? heartPts(m.heart[0], m.heart[1], m.heart[2], m.heart[3], d, 0.3)
                          : m.loose ? looseInset(m.poly.xs, m.poly.ys, d)
                          : convexInset(m.poly.xs, m.poly.ys, d);
  if (f.mode === 'ring') {
    for (const m of f.members) {
      const q = insetOf(m, f.insetK && m.heart ? m.heart[2] * f.insetK : f.inset);
      if (q) out.push({ xs: q.xs, ys: q.ys, closed: true });
    }
    return out;
  }
  const insets = [];
  for (const m of f.members) {
    const q = insetOf(m, r);
    if (q) insets.push(q);
  }
  if (!insets.length) {
    // narrower than the nib: one touch in the middle of it
    const m = f.members[0];
    const [x, y] = m.heart ? [m.heart[0], m.heart[1]] : centroid(m.poly.xs, m.poly.ys);
    out.push({ touch: true, x, y });
    return out;
  }
  const holes = (f.holes || []).map(h => ({ cx: h.cx, cy: h.cy, r: h.r + r }));
  const inHole = (x, y, skip) => holes.some((h, i) => i !== skip && (x - h.cx) ** 2 + (y - h.cy) ** 2 < h.r * h.r);
  const inInset = (x, y, skip) => insets.some((q, i) => i !== skip && inPoly(q.xs, q.ys, x, y));
  if (f.mode === 'solid') {
    insets.forEach((q, i) => {
      out.push({ xs: q.xs, ys: q.ys, closed: true, mask: (x, y) => !inInset(x, y, i) && !inHole(x, y, -1) });
    });
    holes.forEach((h, i) => {
      const c = arcPts(h.cx, h.cy, h.r, 0, 2 * Math.PI, Math.max(16, Math.ceil(h.r * 2 * Math.PI / 0.3)));
      c.pop();
      const q = toArrays(c);
      out.push({ xs: q.xs, ys: q.ys, closed: true, mask: (x, y) => inInset(x, y, -1) && !inHole(x, y, i) });
    });
  }
  const gap = f.mode === 'solid' ? PASS * nib : Math.max(nib * 0.5, f.gap || 1);
  hatchLines(insets, holes, gap, f.angle || 0, out);
  return out;
}

// A shape that is not convex — a lock of hair, a crown — moved in along its corners'
// normals; good enough where it bends gently, and given up when it turns inside out.
function looseInset(xs, ys, d) {
  if (d <= 0) return { xs, ys };
  const A = polyArea(xs, ys), q = offsetPoly(xs, ys, d), B = polyArea(q.xs, q.ys);
  return Math.sign(A) === Math.sign(B) && Math.abs(B) > 0.05 * Math.abs(A) ? q : null;
}

function centroid(xs, ys) {
  let x = 0, y = 0;
  for (let i = 0; i < xs.length; i++) { x += xs[i]; y += ys[i]; }
  return [x / xs.length, y / ys.length];
}

// Passes across the union of the outlines, less the holes, one every gap or a little less
// so they are spread evenly between the two outermost — which the outline already draws.
function hatchLines(insets, holes, gap, angle, out) {
  const c = Math.cos(angle), s = Math.sin(angle);
  let w0 = Infinity, w1 = -Infinity;
  const P = insets.map(q => {
    const n = q.xs.length, U = new Float64Array(n), W = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      U[i] = q.xs[i] * c + q.ys[i] * s;
      W[i] = -q.xs[i] * s + q.ys[i] * c;
      if (W[i] < w0) w0 = W[i];
      if (W[i] > w1) w1 = W[i];
    }
    return { U, W };
  });
  const n = Math.ceil((w1 - w0) / gap - 1e-9);
  if (n < 2) return;
  const Hs = holes.map(h => ({ u: h.cx * c + h.cy * s, w: -h.cx * s + h.cy * c, r: h.r }));
  for (let k = 1; k < n; k++) {
    const w = w0 + (w1 - w0) * k / n;
    let iv = [];
    for (const { U, W } of P) {
      const cut = [];
      for (let i = 0, m = U.length, j = m - 1; i < m; j = i++) {
        if ((W[i] > w) !== (W[j] > w)) cut.push(U[i] + (w - W[i]) / (W[j] - W[i]) * (U[j] - U[i]));
      }
      cut.sort((a, b) => a - b);
      for (let q = 0; q + 1 < cut.length; q += 2) iv.push([cut[q], cut[q + 1]]);
    }
    iv.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const v of iv) {
      const last = merged[merged.length - 1];
      if (last && v[0] <= last[1]) last[1] = Math.max(last[1], v[1]);
      else merged.push(v.slice());
    }
    iv = merged;
    for (const h of Hs) {
      const dw = w - h.w;
      if (Math.abs(dw) >= h.r) continue;
      const du = Math.sqrt(h.r * h.r - dw * dw), a = h.u - du, b = h.u + du;
      const next = [];
      for (const [p, q] of iv) {
        if (q <= a || p >= b) { next.push([p, q]); continue; }
        if (p < a) next.push([p, a]);
        if (q > b) next.push([b, q]);
      }
      iv = next;
    }
    if (k % 2) { iv.reverse(); iv = iv.map(([p, q]) => [q, p]); }
    for (const [p, q] of iv) {
      if (Math.abs(q - p) < 1e-6) continue;
      out.push({ xs: [p * c - w * s, q * c - w * s], ys: [p * s + w * c, q * s + w * c] });
    }
  }
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

function setLayer(id) {
  LAY = LI[id];
  PEN = layerPen(LAY);
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

// Douglas–Peucker: a stroke loses every point within tol of the line it would make.
function simplifyRun(xs, ys, tol) {
  const n = xs.length;
  if (n < 3) return [xs, ys];
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const dx = xs[b] - xs[a], dy = ys[b] - ys[a], L = Math.hypot(dx, dy);
    let best = -1, bestD = tol;
    for (let i = a + 1; i < b; i++) {
      const d = L > 1e-12 ? Math.abs((xs[i] - xs[a]) * dy - (ys[i] - ys[a]) * dx) / L
                          : Math.hypot(xs[i] - xs[a], ys[i] - ys[a]);
      if (d > bestD) { bestD = d; best = i; }
    }
    if (best >= 0) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  const ox = [], oy = [];
  for (let i = 0; i < n; i++) if (keep[i]) { ox.push(xs[i]); oy.push(ys[i]); }
  return [ox, oy];
}

function outRun(xs, ys) {
  if (xs.length < 2) return;
  let len = 0;
  for (let i = 1; i < xs.length; i++) len += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
  if (len < 0.08) return;
  const [ox, oy] = simplifyRun(xs, ys, SIMPLIFY);
  emit(ox, oy, ox.length);
}

// A line read every CLIP_STEP against what may hide it; where it goes from shown to hidden
// the edge is found by halving, so it stops right on the outline that covers it.
function clipEmit(xs, ys, closed, keep) {
  const n = xs.length;
  if (n < 2) return;
  const segs = closed ? n : n - 1;
  const runs = [];
  let rx = [], ry = [];
  let first = true, pin = false, lx = 0, ly = 0, fromStart = false;
  for (let i = 0; i < segs; i++) {
    const x0 = xs[i], y0 = ys[i], j = (i + 1) % n, x1 = xs[j], y1 = ys[j];
    const m = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / CLIP_STEP));
    for (let k = first ? 0 : 1; k <= m; k++) {
      const t = k / m, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      const inn = keep(x, y);
      if (first) {
        first = false;
        fromStart = inn;
        if (inn) { rx.push(x); ry.push(y); }
        pin = inn; lx = x; ly = y;
        continue;
      }
      if (inn !== pin) {
        let ax = lx, ay = ly, bx = x, by = y;
        for (let b = 0; b < 8; b++) {
          const mx = (ax + bx) / 2, my = (ay + by) / 2;
          if (keep(mx, my) === pin) { ax = mx; ay = my; } else { bx = mx; by = my; }
        }
        if (pin) {
          rx.push(ax); ry.push(ay);
          runs.push([rx, ry]);
          rx = []; ry = [];
        } else {
          rx = [bx]; ry = [by];
        }
      }
      if (inn) { rx.push(x); ry.push(y); }
      pin = inn; lx = x; ly = y;
    }
  }
  if (rx.length) runs.push([rx, ry]);
  if (closed && runs.length > 1 && fromStart && pin) {
    const a = runs.shift(), b = runs.pop();
    runs.push([b[0].concat(a[0].slice(1)), b[1].concat(a[1].slice(1))]);
  }
  for (const [qx, qy] of runs) outRun(qx, qy);
}

////////////////////////////////////////////////////////////////////////////////////////
// Everything, in order
//
// Parts go from the back to the front. Each part's lines are kept only where no part in
// front of it covers them; its outline is also dropped inside the other parts of its own
// family, so a family has one outline round all of it.

function renderParts(all) {
  for (const p of all) p.bb = p.xs ? polyBox(p.xs, p.ys) : null;
  const strokesOf = n => Math.max(1, Math.min(4, Math.round(settings.outlineStrokes)));
  for (let i = 0; i < all.length; i++) {
    const p = all[i], jobs = [];
    if (p.line && p.xs) {
      jobs.push({ xs: p.xs, ys: p.ys, closed: true, layer: p.layer, union: true });
      if (p.bold) {
        const nib = penW(layerPen(LI[p.layer]));
        for (let k = 1; k < strokesOf(); k++) {
          const q = offsetPoly(p.xs, p.ys, k * 0.8 * nib);
          jobs.push({ xs: q.xs, ys: q.ys, closed: true, layer: p.layer, union: true });
        }
      }
    }
    for (const d of p.details) {
      if (d.touch) { jobs.push({ touch: true, x: d.x, y: d.y, layer: d.layer }); continue; }
      jobs.push({ xs: d.xs, ys: d.ys, closed: false, layer: d.layer, inside: d.inside });
      if (d.bold && strokesOf() > 1) {
        const nib = penW(layerPen(LI[d.layer]));
        for (let k = 1; k < strokesOf(); k++) {
          const q = offsetLine(d.xs, d.ys, (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.7 * nib);
          jobs.push({ xs: q.xs, ys: q.ys, closed: false, layer: d.layer, inside: d.inside });
        }
      }
    }
    for (let f of p.fills) {
      // a colouring page keeps the eyes black and leaves every other fill to the crayons:
      // a shape that would have no line round it without its fill keeps that line
      if (settings.colouring && !f.keep && f.mode !== 'ring') {
        if (!f.ring) continue;
        f = { ...f, mode: 'ring', inset: 0 };
      }
      const nib = penW(layerPen(LI[f.layer]));
      for (const st of fillStrokes(f, nib)) {
        if (st.touch) jobs.push({ touch: true, x: st.x, y: st.y, layer: f.layer });
        else jobs.push({ xs: st.xs, ys: st.ys, closed: !!st.closed, layer: f.layer, mask: st.mask });
      }
    }
    if (!jobs.length) continue;
    let bb = p.bb ? { ...p.bb } : { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const j of jobs) {
      if (j.touch) {
        bb = { x0: Math.min(bb.x0, j.x), y0: Math.min(bb.y0, j.y), x1: Math.max(bb.x1, j.x), y1: Math.max(bb.y1, j.y) };
      } else {
        const b = polyBox(j.xs, j.ys);
        bb = { x0: Math.min(bb.x0, b.x0), y0: Math.min(bb.y0, b.y0), x1: Math.max(bb.x1, b.x1), y1: Math.max(bb.y1, b.y1) };
      }
    }
    const front = [], same = [];
    for (let j = 0; j < all.length; j++) {
      const q = all[j];
      if (j === i || !q.bb) continue;
      if (q.bb.x1 < bb.x0 || q.bb.x0 > bb.x1 || q.bb.y1 < bb.y0 || q.bb.y0 > bb.y1) continue;
      if (p.group && q.group === p.group) same.push(q);
      else if (j > i) front.push(q);
    }
    const hit = (list, x, y) => {
      for (const q of list) {
        if (x < q.bb.x0 || x > q.bb.x1 || y < q.bb.y0 || y > q.bb.y1) continue;
        if (inPoly(q.xs, q.ys, x, y)) return true;
      }
      return false;
    };
    for (const j of jobs) {
      setLayer(j.layer);
      const keep = (x, y) => (!j.inside || inPoly(p.xs, p.ys, x, y)) && (!j.mask || j.mask(x, y)) &&
                             !hit(front, x, y) && (!j.union || !hit(same, x, y));
      if (j.touch) {
        if (keep(j.x, j.y)) emit([j.x, j.x + EPS], [j.y, j.y], 2);
        continue;
      }
      clipEmit(j.xs, j.ys, j.closed, keep);
    }
  }
}

// A line round the picture.
function borderLines() {
  if (settings.border === 'none') return;
  setLayer('border');
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

// A dot is one touch of the pen that goes down first, and no pen's box clips it.
function cropMarkDots() {
  const used = new Set(SINK.ink);
  GUIDE_PEN = penOrder().find(i => used.has(i)) ?? penIdx(settings.outlinePen);
  if (!settings.cropMarks) return;
  const [W] = paperDims();
  PEN = GUIDE_PEN; LAY = LI.guides;
  for (const [x, y] of cropMarkPlaces()) pushPoly([x, x + (x > W / 2 ? -EPS : EPS)], [y, y], 2);
}

function buildShapes() {
  area = drawArea();
  if (area.w < 5 || area.h < 5) return null;
  SINK = makeSink();
  AREAS = [];
  for (let i = 0; i < SLOTS; i++) AREAS.push(penArea(i));
  PASS = clamp(settings.passes, 10, 300) / 100;

  const figs = layoutFigures();
  FIGS = figs;
  occMake();
  for (const f of figs) for (const p of f.parts) if (p.xs) occPoly(p.xs, p.ys);
  const back = [];
  const hearts = placeHearts(figs, back);
  const twinkles = placeTwinkles(back);
  COUNTS = { figs: figs.length, hearts, twinkles };

  const all = back;
  for (const f of figs) for (const p of f.parts) all.push(p);
  renderParts(all);
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
// of one fill it runs inside what they ink anyway.
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

// The margin, the boxes the unicorns are fitted in and where the cut guides stand.
// Never plotted.
function drawGuides(ctx) {
  if (!area) return;
  const s = settings, dark = luma(s.paperColor) < 0.25;
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = dark ? 'rgba(110, 200, 255, 0.85)' : 'rgba(26, 109, 209, 0.8)';
  ctx.lineWidth = 0.3;
  ctx.setLineDash([1.5, 1.5]);
  ctx.strokeRect(area.x0, area.y0, area.w, area.h);
  ctx.setLineDash([0.8, 1.6]);
  for (const f of FIGS) ctx.strokeRect(f.box.x0, f.box.y0, f.box.x1 - f.box.x0, f.box.y1 - f.box.y0);
  ctx.setLineDash([]);
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
// Dragging the sheet moves the unicorns; the wheel makes them bigger or smaller;
// shift-drag, or a drag with the right button, tilts them.

function paperPoint(e) {
  const r = canvasEl().getBoundingClientRect();
  const [W, H] = paperDims();
  return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
}

const DRAG_KEYS = ['figX', 'figY', 'tilt', 'figSize'];

function attachPointer() {
  const c = canvasEl();
  c.addEventListener('contextmenu', e => e.preventDefault());
  c.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.button !== 2) return;
    const s = settings;
    drag = {
      mode: (e.shiftKey || e.button === 2) ? 'tilt' : 'move',
      x: e.clientX, y: e.clientY, p: paperPoint(e), moved: false,
      fx: s.figX, fy: s.figY, tilt: s.tilt,
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
    if (drag.mode === 'move') {
      s.figX = +clamp(drag.fx + p[0] - drag.p[0], -1000, 1000).toFixed(1);
      s.figY = +clamp(drag.fy + p[1] - drag.p[1], -1000, 1000).toFixed(1);
    } else {
      s.tilt = +clamp(wrapDeg(drag.tilt + dx * DRAG_DEG_PX), -45, 45).toFixed(1);
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
    resize(Math.exp(-delta * WHEEL_ZOOM));
  }, { passive: false });
}

function resize(factor) {
  const s = settings;
  s.figSize = +clamp(s.figSize * factor, 5, 150).toFixed(1);
  if (setters.figSize) setters.figSize(s.figSize);
  liveUpdate();
}

function resetView() {
  for (const k of DRAG_KEYS) settings[k] = DEFAULTS[k];
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
    const toggle = key => { s[key] = !s[key]; refreshControls(); update(); };
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
      case 'l': cycle('layout', LAYOUTS, 1); break;
      case 'L': cycle('layout', LAYOUTS, -1); break;
      case 'e': cycle('eyes', EYES, 1); break;
      case 'E': cycle('eyes', EYES, -1); break;
      case 'h': cycle('hearts', HEARTS, 1); break;
      case 'H': cycle('hearts', HEARTS, -1); break;
      case 'i': cycle('heartInk', HEART_INKS, 1); break;
      case 'I': cycle('heartInk', HEART_INKS, -1); break;
      case 'p': case 'P': cycle('pose', POSES, 1); break;
      case 'c': cycle('character', CHARACTER_NAMES, 1); break;
      case 'C': cycle('character', CHARACTER_NAMES, -1); break;
      case 'm': case 'M': cycle('facing', FACINGS, 1); break;
      case 'w': case 'W': toggle('wings'); break;
      case 'b': case 'B': toggle('balloon'); break;
      case 'n': case 'N': toggle('rainbow'); break;
      case 'u': case 'U': toggle('cloud'); break;
      case 'k': case 'K': toggle('colouring'); break;
      case 's': case 'S': {
        const k = (SCENES.findIndex(sc => sc.label === lastScene) + (e.key === 'S' ? -1 : 1) +
                   SCENES.length) % SCENES.length || (e.key === 'S' ? SCENES.length - 1 : 1);
        applyScene(SCENES[k]);
        break;
      }
      case 'ArrowLeft':  slide('figX', -step); break;
      case 'ArrowRight': slide('figX', step); break;
      case 'ArrowUp':    slide('figY', -step); break;
      case 'ArrowDown':  slide('figY', step); break;
      case '+': case '=': resize(1.05); break;
      case '-': case '_': resize(1 / 1.05); break;
      case '0': resetView(); break;
      case 'x': case 'X': toggle('cropMarks'); break;
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

  show(['cols', 'rows'], s.layout === 'grid');
  setVisible('facing', s.layout !== 'pair');
  setVisible('variety', s.layout !== 'one');
  setVisible('pairHeart', s.layout === 'pair');
  setVisible('wingSize', s.wings);
  show(['rainbowBands', 'rainbowWidth', 'rainbowLines', 'rainbowPen1', 'rainbowPen2'], s.rainbow);
  setVisible('balloonSize', s.balloon);
  setVisible('manePen', s.maneInk.includes('filled'));
  setVisible('hornPen', s.hornInk.includes('filled') || s.hoofInk === 'filled');
  setVisible('blushPen', s.blush !== 'none');

  const hOn = s.hearts !== 'none' || s.layout === 'pair' || s.balloon || s.cutieMark !== 'none';
  show(['heartInk'], hOn);
  setVisible('heartCount', s.hearts === 'scattered' || s.hearts === 'rising');
  show(['heartMin', 'heartTilt', 'heartGap'], s.hearts !== 'none' && s.hearts !== 'frame');
  setVisible('heartMax', s.hearts !== 'none');
  setVisible('heartHatch', ['hatched', 'double outline'].includes(s.heartInk) || s.blush === 'hatched');
  setVisible('heartPen', hOn && s.heartInk.includes('filled'));
  setVisible('heartLinePen', hOn && s.heartInk !== 'filled');
  show(['twinkleSize', 'twinkleStyle', 'twinklePen'], s.twinkles > 0);
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
  createDiv('Where the hearts and twinkles fall, how the curls turn, how the unicorns of a ' +
    'sheet differ. <b>R</b> rolls a new one, <b>[</b> and <b>]</b> step through them.')
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
  addNote(sec, '<b>S</b> steps through the scenes.');
  addSeedField(sec);

  sec = addSection(root, 'Unicorns');
  addSelect(sec, 'How many', 'layout', LAYOUTS, () => { syncVisibility(); update(); },
    '<b>one</b> in the middle; a <b>pair</b> facing each other under a big heart; a ' +
    '<b>grid</b> of them — a sticker sheet. <b>L</b> steps.');
  addSlider(sec, 'Columns', 'cols', 1, 12, 1);
  addSlider(sec, 'Rows', 'rows', 1, 12, 1);
  addSelect(sec, 'Facing', 'facing', FACINGS, update, '<b>M</b> steps.');
  addSlider(sec, 'Size (% of the room)', 'figSize', 5, 150, 1,
    'The wheel on the sheet makes them bigger or smaller.');
  addSlider(sec, 'Moved across (mm)', 'figX', -300, 300, 0.5,
    'Drag on the sheet to move them, <b>0</b> puts them back.');
  addSlider(sec, 'Moved down (mm)', 'figY', -300, 300, 0.5);
  addSlider(sec, 'Tilted (°)', 'tilt', -45, 45, 0.5, '<b>Shift</b>-drag on the sheet tilts them.');
  addSlider(sec, 'Variety (%)', 'variety', 0, 100, 1,
    'How much the unicorns of one sheet differ: heads, horns, legs, curls.');

  sec = addSection(root, 'The unicorn');
  addSelect(sec, 'Character', 'character', CHARACTER_NAMES, update,
    'A baby, a pony, a princess, a mermaid, an angel, a sleepyhead… Each sets some of what ' +
    'is below and leaves the rest as it is. <b>mixed</b> deals a different one to every ' +
    'unicorn of the sheet. <b>C</b> steps.');
  addSelect(sec, 'Pose', 'pose', POSES, update,
    '<b>prancing</b> lifts a front hoof, <b>jumping</b> throws all four, <b>rearing</b> ' +
    'stands on the hind legs; <b>sitting</b>, <b>lying</b>. <b>P</b> steps.');
  addSelect(sec, 'Eyes', 'eyes', EYES, update,
    '<b>sparkly</b> — big and shining; <b>happy</b> — smiling shut; <b>sleepy</b>; ' +
    '<b>hearts</b> — red. <b>E</b> steps.');
  addSelect(sec, 'Mane', 'maneStyle', MANES, update,
    '<b>curls</b>; long <b>waves</b>; a <b>bob</b> of a few big curls; <b>hearts</b>.');
  addSelect(sec, 'Tail', 'tailStyle', TAILS, update, '<b>mermaid</b> — a fish\'s tail instead of hind legs.');
  addSelect(sec, 'Wearing', 'accessory', ACCESSORIES, update,
    'A crown, a crown of flowers, a bow in the mane, glasses, a scarf, a bow tie, a halo.');
  addCheckbox(sec, 'Fluffy fleece', 'fluffy');
  addSlider(sec, 'Head (%)', 'headSize', 60, 140, 1);
  addSlider(sec, 'Chubby (%)', 'chubby', 70, 130, 1);
  addSlider(sec, 'Legs (%)', 'legLength', 40, 200, 1);
  addSlider(sec, 'Horn (%)', 'hornLength', 30, 200, 1);
  addSlider(sec, 'Curls in the mane', 'maneCurls', 3, 14, 1);
  addSlider(sec, 'Mane (%)', 'maneSize', 50, 160, 1);
  addSlider(sec, 'Tail (%)', 'tailSize', 50, 170, 1);
  addSelect(sec, 'On the hip', 'cutieMark', MARKS, resync);
  addCheckbox(sec, 'Wings', 'wings', resync);
  addSlider(sec, 'Wings (%)', 'wingSize', 50, 180, 1);
  addCheckbox(sec, 'Standing on a cloud', 'cloud', resync);
  addCheckbox(sec, 'A rainbow behind', 'rainbow', resync);
  addSlider(sec, 'Rainbow bands', 'rainbowBands', 0, 8, 1,
    'Filled, the pens of <b>rainbow</b> and <b>rainbow, between</b> by turns.');
  addSlider(sec, 'Band width (%)', 'rainbowWidth', 30, 250, 1);
  addCheckbox(sec, 'Lines between the bands', 'rainbowLines');
  addCheckbox(sec, 'A heart balloon', 'balloon', resync);
  addSlider(sec, 'Balloon (%)', 'balloonSize', 40, 200, 1);

  sec = addSection(root, 'Ink on the unicorn');
  addCheckbox(sec, 'Colouring page — lines only', 'colouring', resync);
  addNote(sec, 'Everything in the outline pen and nothing filled but the eyes — the hearts, ' +
    'the blush, the horn and the rainbow are left for crayons. <b>K</b> switches it.');
  addSlider(sec, 'Outline strokes', 'outlineStrokes', 1, 4, 1,
    'More than one makes the outline bolder: each next stroke 80 % of a nib further in.');
  addSelect(sec, 'Mane and tail', 'maneInk', MANE_INKS, resync,
    '<b>curls</b> — a spiral in every curl; <b>filled</b> — in the mane pen.');
  addSelect(sec, 'Horn', 'hornInk', HORN_INKS, resync);
  addSelect(sec, 'Hooves', 'hoofInk', HOOF_INKS, resync);
  addSelect(sec, 'Blush', 'blush', BLUSHES, resync);
  addSlider(sec, 'Passes apart (% of the nib)', 'passes', 30, 200, 1,
    'In every filled shape. 85 closes the paper; over 100 leaves a hair of it.');
  addSlider(sec, 'Pen kept down over (% of the nib)', 'penDown', 0, 300, 5,
    'A hop to the next stroke shorter than this is drawn, not lifted over.');

  sec = addSection(root, 'Hearts');
  addSelect(sec, 'Hearts', 'hearts', HEARTS, resync,
    '<b>scattered</b> round the unicorns; <b>everywhere</b> — as many as fit; <b>rising</b> ' +
    'from the horns; a <b>frame</b> round the picture. <b>H</b> steps.');
  addSlider(sec, 'How many', 'heartCount', 0, 300, 1);
  addSlider(sec, 'Smallest (mm)', 'heartMin', 1, 120, 0.5);
  addSlider(sec, 'Largest (mm)', 'heartMax', 1, 160, 0.5);
  addSlider(sec, 'Tilted up to (°)', 'heartTilt', 0, 60, 1);
  addSlider(sec, 'Room round each (mm)', 'heartGap', 0, 30, 0.5);
  addSlider(sec, 'Big heart of a pair (%)', 'pairHeart', 5, 80, 1);
  addSelect(sec, 'Drawn', 'heartInk', HEART_INKS, resync,
    '<b>filled</b> in the heart pen; with an <b>outline</b> in the heart line pen; ' +
    '<b>hatched</b>. The balloon and the hip heart too. <b>I</b> steps.');
  addSlider(sec, 'Lines apart (mm)', 'heartHatch', 0.3, 6, 0.1,
    'Of hatched hearts and blush, and how far inside the second line of a double heart.');

  sec = addSection(root, 'Twinkles');
  addSlider(sec, 'How many', 'twinkles', 0, 200, 1, '', () => { syncVisibility(); update(); });
  addSlider(sec, 'Size (mm)', 'twinkleSize', 1, 40, 0.5);
  addSelect(sec, 'Kind', 'twinkleStyle', TWINKLES);

  sec = addSection(root, 'Pens');
  addNote(sec, 'Five pens of the drawer; each part picks one by number — by default only the ' +
    'black and the red rapidograph. Changing the kind sets its colour and a usual width. On a ' +
    'colouring page everything goes with the outline pen.');
  addPenSelect(sec, 'Outline', 'outlinePen', 'The eyes and the smile too.');
  addPenSelect(sec, 'Curls and stripes', 'detailPen');
  addPenSelect(sec, 'Mane fill', 'manePen');
  addPenSelect(sec, 'Horn and hooves', 'hornPen');
  addPenSelect(sec, 'Blush', 'blushPen');
  addPenSelect(sec, 'Hearts, filled', 'heartPen');
  addPenSelect(sec, 'Hearts, lines', 'heartLinePen');
  addPenSelect(sec, 'Twinkles', 'twinklePen');
  addPenSelect(sec, 'Rainbow', 'rainbowPen1');
  addPenSelect(sec, 'Rainbow, between', 'rainbowPen2');
  addPenSelect(sec, 'Border', 'borderPen');
  for (let i = 0; i < SLOTS; i++) addPenSlot(sec, i);

  sec = addSection(root, 'Paper');
  addSelect(sec, 'Size', 'paper', PAPERS, () => { syncVisibility(); resizeForPaper(); });
  addSelect(sec, 'Orientation', 'orientation', ['portrait', 'landscape'], resizeForPaper);
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
  addCheckbox(sec, 'Show the margin, the unicorns\' boxes and the cut guides', 'showGuides', () => { drawPreview(); syncUrl(); });
  createButton('Download SVG [everything]').parent(sec).class('primary')
    .mousePressed(() => exportSvg({ all: true }));
  createButton('Download SVG [one per pen]').parent(sec).mousePressed(() => exportSvg({ perPen: true }));
  const lb = createDiv('').parent(sec).class('layer-buttons');
  LAYERS.forEach((ly, li) => {
    layerButtons[li] = createButton('').parent(lb).mousePressed(() => exportSvg({ layer: li }));
  });
  addNote(sec, 'Everything is one file, a group per pen; a layer\'s file is that part alone. ' +
    'The cut guides go with the pen that goes down first, so they are plotted once. Every ' +
    'file is the whole sheet in millimetres.');
  addSlider(sec, 'Picture (dpi)', 'pngDpi', 50, 600, 10, '', () => syncUrl());
  createButton('Download PNG').parent(sec).mousePressed(exportPng);
  const row = createDiv('').parent(sec).class('btn-row');
  createButton('Copy link').parent(row).mousePressed(function () { copyLink(this); });
  createButton('Reset').parent(row).mousePressed(resetAll);

  sec = addSection(root, 'The sheet');
  statsDiv = createDiv('').parent(sec).class('stats');
  penListDiv = createDiv('').parent(sec).class('stats');
  createDiv('').parent(sec).class('note keys').html(
    '<div><kbd>drag</kbd> move the unicorns · <kbd>wheel</kbd> size · <kbd>shift</kbd>+<kbd>drag</kbd> tilt · <kbd>0</kbd> back</div>' +
    '<div><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> move by 1 mm, with <kbd>shift</kbd> 10 · <kbd>+</kbd><kbd>−</kbd> size</div>' +
    '<div><kbd>S</kbd> scene · <kbd>C</kbd> character · <kbd>L</kbd> how many · <kbd>M</kbd> facing · <kbd>P</kbd> pose · <kbd>E</kbd> eyes</div>' +
    '<div><kbd>H</kbd> hearts · <kbd>I</kbd> how drawn · <kbd>W</kbd> wings · <kbd>B</kbd> balloon · <kbd>N</kbd> rainbow · <kbd>U</kbd> cloud · <kbd>K</kbd> colouring</div>' +
    '<div><kbd>X</kbd> cut guides · <kbd>G</kbd> guides · <kbd>R</kbd> new seed · <kbd>[</kbd> <kbd>]</kbd> step it</div>');
  linkDiv = createDiv('').parent(sec).class('link');
  refreshPenSelects();
  syncVisibility();
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
    statsDiv.html('<div class="warn">Nothing is drawn — make the unicorns bigger.</div>');
    refreshPenList();
    return;
  }
  const seconds = plan.downs * PEN_CYCLE_S + plan.ink / DRAW_SPEED + plan.travel / TRAVEL_SPEED;
  const one = (n, a, b) => `${groupNum(n)} ${n === 1 ? a : b}`;
  let html =
    `<div class="big"><b>${groupNum(strokes)}</b> strokes, ` +
    `<b>${(plan.ink / 1000).toFixed(1)}</b> m of line</div>` +
    `<div>${one(COUNTS.figs, 'unicorn', 'unicorns')}, ${one(COUNTS.hearts, 'heart', 'hearts')}, ` +
    `${one(COUNTS.twinkles, 'twinkle', 'twinkles')}</div>` +
    `<div>${FIGS.length <= 30 ? FIGS.map(f => f.character).join(', ') : ''}</div>` +
    `<div>The pen goes down <b>${groupNum(plan.downs)}</b> times, ` +
    `${(plan.travel / 1000).toFixed(1)} m in the air</div>` +
    `<div>Roughly <b>${formatDuration(seconds)}</b> to plot · ${lastMs.toFixed(0)} ms to build</div>`;
  if (s.cropMarks && perLayer && perLayer[LI.guides].strokes) {
    html += `<div>${perLayer[LI.guides].strokes} cut guide dots round the ${s.cropMarkAt}, ` +
      `in pen ${GUIDE_PEN + 1}</div>`;
  }
  if (s.hearts === 'scattered' && COUNTS.hearts < Math.round(s.heartCount) - (s.layout === 'pair' ? -1 : 0)) {
    html += `<div class="warn">Only ${COUNTS.hearts} of ${Math.round(s.heartCount)} hearts found room — ` +
      'smaller hearts, less room round each, or smaller unicorns.</div>';
  }
  if (s.passes > 100) {
    html += '<div class="warn">Passes over 100 % of the nib leave a hair of paper in every fill.</div>';
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
  return `sweet unicorns — ${s.character} ${s.layout}${s.layout === 'grid' ? ` ${s.cols}x${s.rows}` : ''} ` +
    `pose=${s.pose} eyes=${s.eyes} hearts=${s.hearts}/${s.heartInk} ` +
    `${s.wings ? 'wings ' : ''}${s.rainbow ? 'rainbow ' : ''}${s.cloud ? 'cloud ' : ''}${s.balloon ? 'balloon ' : ''}` +
    `${s.cropMarks ? `cutguides=${s.cropMarkAt}<=${s.cropMarkGap}mm ` : ''}seed=${s.seed} ` +
    `pens=[${pens.join('; ')}] strokes=${strokes}`;
}

function fileStem() {
  const s = settings;
  const paper = s.paper === 'custom' ? `${s.customW}x${s.customH}mm` : `${s.paper}-${s.orientation}`;
  return `sweet unicorns ${s.layout} ${s.hearts} seed${s.seed} ${paper}`;
}

////////////////////////////////////////////////////////////////////////////////////////
// Controls, shared
//
// A section folds away under its heading; which ones are folded is remembered by the
// browser, not by the link.

function foldedSet() {
  try { return new Set(JSON.parse(localStorage.getItem('p5js24-folded') || '[]')); }
  catch (e) { return new Set(); }
}

function saveFolded(set) {
  try { localStorage.setItem('p5js24-folded', JSON.stringify([...set])); } catch (e) { /* no storage */ }
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
