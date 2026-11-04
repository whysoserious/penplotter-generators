////////////////////////////////////////////////////////////////////////////////////////
// Module towers — stacks of machinery drawn in exact hidden lines
//
// A tower is a pile of floors, each a block of the same kind of things: dense machinery
// cut into cabinets, rows of tall racks round a floor slab, a sleeve of ribbed plates
// wrapped round a core, a hollow frame like a section of a square duct, an open deck on
// columns, or a tangle of pipework. Every one of them is made of upright boxes on a grid —
// slabs, bars, plates, pipes with flanges, panels, vents, ladders, masts — and the drawing
// is the edges of those boxes, seen in a parallel projection, kept exactly where nothing
// in front covers them.
//
// Hidden lines are not sampled. In a parallel projection a point P is hidden by a box
// when P + s·c lies inside it for some s > 0 (c pointing at the eye); along an edge that
// is a handful of linear inequalities in two unknowns, so every edge is cut exactly where
// a box in front starts and stops covering it. Boxes of one element (the bars of a frame,
// the legs of a plate, the runs of a pipe) melt into one solid: a line between two of
// them is drawn only where the surface really turns. Where two elements pass through
// each other the line along which they meet is drawn too.
//
// It is drawn with black and red rapidographs of 0.25, 0.35, 0.5 and 1.0 mm: the edges,
// small parts in a finer nib, an accent — the pipes, the fins, a floor — in red, and
// faces hatched or filled solid by which way they face.
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};
const PAPERS = Object.keys(PAPER_SIZES).concat('custom');

const PAPER_TONES = {
  'white': '#fbfaf5', 'cream': '#f1e8d6', 'grey': '#c9cacb', 'kraft': '#c8a97e', 'black': '#151517',
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
// Red goes down before black, so a black line is never dragged through by the red pen.
function kindRank(k) { return k.startsWith('red') ? 0 : k === 'other' ? 1 : 2; }

const PROJECTIONS = ['isometric', 'axonometric', 'military'];
const FLOOR_KINDS = ['machinery', 'racks', 'ribbed', 'frame', 'deck', 'pipework'];
const WRAPS       = ['over', 'under', 'ring', 'side', 'corner', 'blades', 'mixed'];
const ROOFS       = ['machinery', 'masts', 'slab', 'open'];
const ACCENTS     = ['none', 'pipes', 'fins', 'frames', 'racks', 'details', 'one floor',
                     'every other floor', 'random parts'];
const SHADES      = ['none', 'sparse', 'hatch', 'dense', 'cross', 'solid'];
const SHADE_WHO   = ['everything', 'machinery', 'structure', 'fins', 'pipes'];
const HATCH_DIRS  = ['along the height', 'across', 'diagonal'];
const BORDERS     = ['none', 'line', 'double'];
const MARK_AT     = ['sheet', 'picture'];

// What every box is, for the accent and the shading.
const K_STRUCT = 0, K_MACHINE = 1, K_FIN = 2, K_PIPE = 3, K_FRAME = 4, K_RACK = 5, K_DETAIL = 6;

// What goes on the sheet, each picking a pen of the drawer by number. The cut guides go
// with the first pen in use.
const LAYERS = [
  { id: 'edges',  label: 'edges',        pen: 'edgePen' },
  { id: 'fine',   label: 'small parts',  pen: 'finePen' },
  { id: 'accent', label: 'accent',       pen: 'accentPen' },
  { id: 'hatch',  label: 'hatching',     pen: 'hatchPen' },
  { id: 'solid',  label: 'solid faces',  pen: 'solidPen' },
  { id: 'border', label: 'border',       pen: 'borderPen' },
  { id: 'guides', label: 'cut guides',   pen: null },
];
const LI = {};
LAYERS.forEach((l, i) => { LI[l.id] = i; });

const MAX_BOXES      = 60_000;
const MAX_STROKES    = 600_000;
const BUSY_STROKES   = 40_000;
const HIDE_EPS       = 1e-4;       // units — how far a box is shrunk before it may hide
const SEAM_D         = 1e-3;       // units — how far beside an edge its solid is looked for
const MERGE_TOL      = 0.01;       // mm — lines closer than this are one line
const LEAST          = 0.05;       // mm — a shorter piece of a line is not drawn
const EPS            = 0.01;       // mm — the stub that stands in for a dot
const PREVIEW_MAX_PX = 1500;
const PEN_CYCLE_S    = 0.3;
const DRAW_SPEED     = 60;
const TRAVEL_SPEED   = 150;
const DRAG_DEG_PX    = 0.3;
const WHEEL_ZOOM     = 0.0012;
const MIN_ZOOM = 10, MAX_ZOOM = 2000;

const settings = {
  // paper
  paper: 'A3',
  orientation: 'portrait',
  customW: 300,
  customH: 400,
  margin: 18,
  paperTone: 'white',
  paperColor: '#fbfaf5',   // the preview only — the files have no background
  border: 'none',
  cropMarks: true,         // cut guides — dots to lay the guillotine's blade through
  cropMarkAt: 'sheet',
  cropMarkGap: 400,        // mm — the most that is ever left between two dots

  // the pens
  pen1Kind: 'black 0.35', pen1W: 0.35, pen1Col: '#1b1b1b',
  pen2Kind: 'red 0.35',   pen2W: 0.35, pen2Col: '#c8261d',
  pen3Kind: 'black 0.25', pen3W: 0.25, pen3Col: '#1b1b1b',
  pen4Kind: 'black 1.0',  pen4W: 1.0,  pen4Col: '#1b1b1b',
  pen5Kind: 'red 0.25',   pen5W: 0.25, pen5Col: '#c8261d',
  edgePen: 1, finePen: 3, accentPen: 2, hatchPen: 3, solidPen: 4, borderPen: 1,

  seed: 11,

  // the tower — in units of the grid; the drawing is fitted to the sheet
  towers: 1,
  towerGap: 10,
  floors: 7,
  width: 24,
  depth: 20,
  floorHeight: 11,
  heightVar: 35,        // %
  sizeVar: 20,          // %
  shift: 2,             // units — how far a floor may stand off the one under it
  taper: 0,             // % — how much narrower the top floor is
  gap: 1.5,             // units of air between two floors
  alternate: false,     // every other floor turned a quarter
  roof: 'machinery',

  // what the floors are — how often each kind comes up
  wMachinery: 3,
  wRacks: 3,
  wRibbed: 3,
  wFrame: 2,
  wDeck: 1,
  wPipework: 1,

  // slabs and frames
  slabs: 60,            // % — floors with a slab under them
  slabThick: 0.75,
  overhang: 1.5,
  frameWall: 1,
  rings: 40,            // % — frames with bar rings round them
  portals: 15,          // % — machinery cells that are an upright hollow frame instead
  beams: 45,            // % — floors with a ring of beams round their foot
  beamSize: 1,
  windows: 40,          // % — walls of a frame cut into posts
  columns: 4,           // posts between two floors
  columnSize: 1,

  // racks
  rackSides: 2,
  rackDepth: 4,
  rackWidth: 3,
  rackGap: 0.25,
  rackSteps: 30,        // % — how much the racks of a row differ in height
  rackSplit: 25,        // % — racks cut into two stacked cabinets

  // fins
  finWrap: 'mixed',
  finThick: 0.5,
  finGap: 0.5,
  finDepth: 1.5,
  finCover: 85,         // % of the floor's length the sleeve covers
  finJog: 35,           // % — sleeves that step aside half way

  // machinery
  machineFill: 85,      // % of the cells that hold a cabinet
  machineSize: 4.5,
  machineLevels: 3,
  machineInset: 0.75,
  greebles: 40,         // %
  panels: 35,           // %
  vents: 25,            // %

  // pipes and the rest
  pipes: 2,             // runs a floor
  pipeSize: 0.75,
  bundle: 3,
  flanges: 40,          // %
  risers: 2,            // pipes up the outside of the tower
  ladders: 20,          // %
  trays: 20,            // %
  masts: 3,

  // camera
  projection: 'isometric',
  azimuth: 45,          // °
  elevation: 30,        // °
  heightScale: 1,
  zoom: 100,            // %
  panX: 0,              // mm at 100 %
  panY: 0,

  // ink
  accent: 'pipes',
  accentShare: 15,      // % — of the parts, for 'random parts'
  smallBelow: 0,        // mm — elements smaller than this on paper go with the fine pen
  shadeLeft: 'none',
  shadeRight: 'none',
  shadeTop: 'none',
  shadeGap: 1.2,        // mm
  hatchDir: 'along the height',
  shadeWho: 'everything',
  passes: 85,           // % of the nib between two passes of a solid face
  penDown: 100,         // % of the nib — a hop shorter than this is drawn, not lifted over

  // output
  optimiseOrder: true,
  liveUpdate: true,
  showGuides: false,
  pngDpi: 200,
};

const DEFAULTS = { ...settings };

// Everything the structure depends on — the camera, the pens and the paper do not
// rebuild it.
const STRUCT_KEYS = ['seed', 'towers', 'towerGap', 'floors', 'width', 'depth', 'floorHeight',
  'heightVar', 'sizeVar', 'shift', 'taper', 'gap', 'alternate', 'roof',
  'wMachinery', 'wRacks', 'wRibbed', 'wFrame', 'wDeck', 'wPipework',
  'slabs', 'slabThick', 'overhang', 'frameWall', 'rings', 'portals', 'beams', 'beamSize', 'windows',
  'columns', 'columnSize',
  'rackSides', 'rackDepth', 'rackWidth', 'rackGap', 'rackSteps', 'rackSplit',
  'finWrap', 'finThick', 'finGap', 'finDepth', 'finCover', 'finJog',
  'machineFill', 'machineSize', 'machineLevels', 'machineInset', 'greebles', 'panels', 'vents',
  'pipes', 'pipeSize', 'bundle', 'flanges', 'risers', 'ladders', 'trays', 'masts',
  'accent', 'accentShare'];

// Sheets worth starting from. Each one is the whole state.
const SCENES = [
  { label: '— select a scene —' },
  { label: 'Machine tower', s: {} },
  { label: 'Ribbed sleeves', s: {
      wMachinery: 2, wRacks: 0, wRibbed: 6, wFrame: 1, wDeck: 0, wPipework: 0, finWrap: 'mixed',
      finCover: 85, finJog: 45, floors: 6, floorHeight: 13, accent: 'none', seed: 4 } },
  { label: 'Server stacks', s: {
      wMachinery: 1, wRacks: 6, wRibbed: 0, wFrame: 3, wDeck: 0, wPipework: 0, rackSides: 3,
      rackDepth: 4, rackWidth: 3, rackGap: 0.5, rackSteps: 10, floors: 8, floorHeight: 10,
      gap: 2, slabs: 90, accent: 'none', seed: 21 } },
  { label: 'Exploded, on columns', s: {
      gap: 6, columns: 6, columnSize: 0.75, floors: 6, wDeck: 2, risers: 0, accent: 'frames', seed: 8 } },
  { label: 'A low wide block', s: {
      orientation: 'landscape', floors: 2, width: 44, depth: 34, floorHeight: 10, heightVar: 20,
      machineSize: 5, accent: 'pipes', pipes: 4, risers: 0, seed: 15 } },
  { label: 'A needle', s: {
      floors: 15, width: 14, depth: 12, floorHeight: 8, taper: 45, sizeVar: 10, shift: 1,
      machineSize: 4, finDepth: 1, rackDepth: 2.5, rackWidth: 2, masts: 4, seed: 30 } },
  { label: 'Three towers', s: {
      orientation: 'landscape', towers: 3, towerGap: 8, floors: 6, width: 18, depth: 16,
      floorHeight: 9, risers: 1, seed: 5 } },
  { label: 'Red pipework', s: {
      wPipework: 4, pipes: 4, bundle: 5, risers: 5, flanges: 60, accent: 'pipes', seed: 12 } },
  { label: 'Hatched by the light', s: {
      shadeRight: 'hatch', shadeLeft: 'sparse', hatchDir: 'along the height', shadeGap: 1,
      accent: 'none', seed: 11 } },
  { label: 'Solid shadows', s: {
      shadeRight: 'solid', shadeTop: 'none', shadeWho: 'machinery', accent: 'pipes',
      greebles: 20, panels: 15, vents: 10, seed: 9 } },
  { label: 'Blades and grilles', s: {
      wRibbed: 6, wMachinery: 2, wRacks: 1, wFrame: 0, wDeck: 0, wPipework: 0, finWrap: 'blades',
      finDepth: 2, finThick: 0.5, finGap: 0.75, finCover: 90, accent: 'fins', seed: 3 } },
  { label: 'Hollow frames', s: {
      wFrame: 6, wMachinery: 1, wRacks: 1, wRibbed: 1, wDeck: 0, wPipework: 0, frameWall: 1.25,
      rings: 80, portals: 30, accent: 'frames', seed: 17 } },
  { label: 'One red floor', s: { accent: 'one floor', seed: 26 } },
  { label: 'Plan oblique', s: {
      projection: 'military', azimuth: 30, heightScale: 0.8, floors: 6, accent: 'fins', seed: 19 } },
  { label: 'Fine pen for the small parts', s: {
      smallBelow: 6, edgePen: 1, finePen: 3, accent: 'none', greebles: 70, panels: 60, vents: 40, seed: 2 } },
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
let buildMs = 0;
let drag    = null;
let GUIDE_PEN = 0;
let WORLD = null;            // the structure, cached by STRUCT_KEYS
let worldKey = '';

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
  return mulberry32(Math.imul((settings.seed | 0) + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca77));
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
  const [a, b] = PAPER_SIZES[settings.paper] || PAPER_SIZES.A3;
  return settings.orientation === 'portrait' ? [a, b] : [b, a];
}

function penW(i) { return clamp(Number(settings[`pen${i + 1}W`]) || 0.35, 0.05, 30); }
function penCol(i) { return settings[`pen${i + 1}Col`] || '#000000'; }
function penKind(i) { return settings[`pen${i + 1}Kind`] || 'black 0.35'; }
function penIdx(v) { return clamp(Math.round(Number(v) || 1), 1, SLOTS) - 1; }
function layerPen(li) {
  if (li === LI.guides) return GUIDE_PEN;
  return penIdx(settings[LAYERS[li].pen]);
}

function penLabel(i) {
  const k = penKind(i), w = penW(i);
  const named = PEN_KINDS[k] && Math.abs(PEN_KINDS[k].w - w) < 1e-9 && k !== 'other';
  return named ? `${i + 1} · ${k} mm` : `${i + 1} · ${k} ${w < 1 ? w.toFixed(2) : +w.toFixed(2)} mm`;
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
  return [0, 1, 2, 3, 4].sort((a, b) => kindRank(penKind(a)) - kindRank(penKind(b)) || a - b);
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

  const key = STRUCT_KEYS.map(k => settings[k]).join('|');
  if (!WORLD || key !== worldKey) {
    const b0 = performance.now();
    WORLD = buildWorld();
    worldKey = key;
    buildMs = performance.now() - b0;
  }
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
// The structure
//
// World units, y up. Every element is a few axis-aligned boxes; the boxes of one element
// share a group and are drawn as one solid. Sizes are snapped to a quarter of a unit, so
// faces that ought to meet do meet and their lines merge.

let WB, WK, WG, WF, GROUPS, CUR_FLOOR, R;

function q(v) { return Math.round(v * 4) / 4; }
function rr(a, b) { return a + (b - a) * R(); }
function ri(a, b) { return Math.floor(a + (b - a + 1) * R()); }
function pick(list) { return list[Math.floor(R() * list.length)]; }
function newGroup() { return GROUPS++; }

function addBox(x0, y0, z0, x1, y1, z1, kind, grp) {
  if (x0 > x1) { const t = x0; x0 = x1; x1 = t; }
  if (y0 > y1) { const t = y0; y0 = y1; y1 = t; }
  if (z0 > z1) { const t = z0; z0 = z1; z1 = t; }
  if (x1 - x0 < 0.05 || y1 - y0 < 0.05 || z1 - z0 < 0.05) return -1;
  if (WK.length >= MAX_BOXES) return -1;
  WB.push(x0, y0, z0, x1, y1, z1);
  WK.push(kind);
  WG.push(grp === undefined ? newGroup() : grp);
  WF.push(CUR_FLOOR);
  return WK.length - 1;
}

// A box given along a horizontal axis A (0 = x, 2 = z) and the other one, B.
function addAx(A, a0, a1, b0, b1, y0, y1, kind, grp) {
  return A === 0 ? addBox(a0, y0, b0, a1, y1, b1, kind, grp)
                 : addBox(b0, y0, a0, b1, y1, a1, kind, grp);
}

function lo(F, A) { return A === 0 ? F.x0 : F.z0; }
function hi(F, A) { return A === 0 ? F.x1 : F.z1; }

function slab(x0, z0, x1, z1, y, th, kind) {
  return addBox(x0, y, z0, x1, y + th, z1, kind === undefined ? K_STRUCT : kind);
}

// A cabinet's faces: a shallow panel standing out of a side, or a vent of slats.
function decorate(x0, y0, z0, x1, y1, z1) {
  const s = settings;
  for (let f = 0; f < 4; f++) {
    const A = f < 2 ? 0 : 2;                     // the axis the face runs along
    const out = f % 2 ? 1 : -1;
    const a0 = A === 0 ? x0 : z0, a1 = A === 0 ? x1 : z1;
    const n = A === 0 ? (out > 0 ? z1 : z0) : (out > 0 ? x1 : x0);
    const w = a1 - a0, h = y1 - y0;
    const roll = R();
    if (roll < s.panels / 200 && w >= 2 && h >= 1.5) {
      const m = q(rr(0.25, Math.min(1, w / 4, h / 4)));
      const p = 0.25;
      const g = newGroup();
      if (R() < 0.5 || h < 3) {
        addAx(A, a0 + m, a1 - m, Math.min(n, n + out * p), Math.max(n, n + out * p), y0 + m, y1 - m, K_DETAIL, g);
      } else {                                   // two panels, one over the other
        const ym = q(y0 + h * rr(0.35, 0.65));
        addAx(A, a0 + m, a1 - m, Math.min(n, n + out * p), Math.max(n, n + out * p), y0 + m, ym - m / 2, K_DETAIL);
        addAx(A, a0 + m, a1 - m, Math.min(n, n + out * p), Math.max(n, n + out * p), ym + m / 2, y1 - m, K_DETAIL);
      }
    } else if (roll < s.panels / 200 + s.vents / 200 && w >= 1.5 && h >= 2) {
      const pitch = 0.75, m = 0.5;
      const count = Math.floor((h * rr(0.4, 0.9) - m) / pitch);
      const yb = q(y0 + m);
      const wa = q(rr(0.5, 1) * (w - 2 * m));
      const ac = q((a0 + a1) / 2);
      for (let i = 0; i < count; i++) {
        const y = yb + i * pitch;
        addAx(A, ac - wa / 2, ac + wa / 2, Math.min(n, n + out * 0.5), Math.max(n, n + out * 0.5),
              y, y + 0.25, K_DETAIL);
      }
    }
  }
}

// Small boxes on a top face.
function greebles(x0, z0, x1, z1, y) {
  const count = ri(1, 3);
  for (let i = 0; i < count; i++) {
    const w = q(rr(0.25, Math.min(1.5, (x1 - x0) / 2))), d = q(rr(0.25, Math.min(1.5, (z1 - z0) / 2)));
    if (w < 0.25 || d < 0.25) continue;
    const x = q(rr(x0, x1 - w)), z = q(rr(z0, z1 - d));
    addBox(x, y, z, x + w, y + q(rr(0.25, 1)), z + d, K_DETAIL);
  }
}

// An upright hollow frame — two posts, a head and a sill — facing along A.
function portal(A, a0, a1, b0, b1, y0, y1, t) {
  const g = newGroup();
  if (a1 - a0 < 2 * t + 0.25 || y1 - y0 < 2 * t + 0.25) return;
  addAx(A, a0, a0 + t, b0, b1, y0, y1, K_FRAME, g);
  addAx(A, a1 - t, a1, b0, b1, y0, y1, K_FRAME, g);
  addAx(A, a0 + t, a1 - t, b0, b1, y1 - t, y1, K_FRAME, g);
  addAx(A, a0 + t, a1 - t, b0, b1, y0, y0 + t, K_FRAME, g);
}

// Cabinets packed over a rectangle: the rectangle cut like a k-d tree into cells about
// machineSize across, a cabinet in most cells — set back from the cell's edges, of its
// own height — and smaller ones stacked on the tops of some.
function machinery(x0, z0, x1, z1, y0, hMax, level, density, kind) {
  const s = settings;
  if (x1 - x0 < 0.5 || z1 - z0 < 0.5 || hMax < 0.5) return;
  const size = Math.max(1, s.machineSize * (level < s.machineLevels ? 0.6 : 1));
  const cells = [];
  const split = (a0, b0, a1, b1, depth) => {
    const w = a1 - a0, d = b1 - b0;
    if ((w <= size * 1.4 && d <= size * 1.4) || depth > 14) { cells.push([a0, b0, a1, b1]); return; }
    if (w >= d) {
      const m = q(a0 + w * rr(0.3, 0.7));
      if (m - a0 < 0.5 || a1 - m < 0.5) { cells.push([a0, b0, a1, b1]); return; }
      split(a0, b0, m, b1, depth + 1); split(m, b0, a1, b1, depth + 1);
    } else {
      const m = q(b0 + d * rr(0.3, 0.7));
      if (m - b0 < 0.5 || b1 - m < 0.5) { cells.push([a0, b0, a1, b1]); return; }
      split(a0, b0, a1, m, depth + 1); split(a0, m, a1, b1, depth + 1);
    }
  };
  split(x0, z0, x1, z1, 0);
  const ins = Math.max(0, s.machineInset);
  for (const [c0, d0, c1, d1] of cells) {
    if (R() > density) continue;
    const bx0 = q(c0 + R() * ins), bx1 = q(c1 - R() * ins);
    const bz0 = q(d0 + R() * ins), bz1 = q(d1 - R() * ins);
    if (bx1 - bx0 < 0.5 || bz1 - bz0 < 0.5) continue;
    const h = Math.max(0.5, q(hMax * (0.25 + 0.75 * Math.pow(R(), 0.7))));
    if (R() < s.portals / 100 && h >= 2.5 && Math.max(bx1 - bx0, bz1 - bz0) >= 2.5) {
      const A = bx1 - bx0 >= bz1 - bz0 ? 0 : 2;
      const t = q(Math.max(0.25, Math.min(0.75, h / 6)));
      const thick = q(Math.min(A === 0 ? bz1 - bz0 : bx1 - bx0, rr(0.75, 2.5)));
      const bc = A === 0 ? q((bz0 + bz1) / 2) : q((bx0 + bx1) / 2);
      portal(A, A === 0 ? bx0 : bz0, A === 0 ? bx1 : bz1, bc - thick / 2, bc + thick / 2, y0, y0 + h, t);
      continue;
    }
    addBox(bx0, y0, bz0, bx1, y0 + h, bz1, kind === undefined ? K_MACHINE : kind);
    decorate(bx0, y0, bz0, bx1, y0 + h, bz1);
    if (level > 0 && R() < 0.55 && bx1 - bx0 >= 1.5 && bz1 - bz0 >= 1.5) {
      machinery(bx0 + 0.25, bz0 + 0.25, bx1 - 0.25, bz1 - 0.25, y0 + h, hMax * 0.45, level - 1,
                Math.min(1, density + 0.1), kind);
    } else if (R() < s.greebles / 100 && bx1 - bx0 >= 1 && bz1 - bz0 >= 1) {
      greebles(bx0, bz0, bx1, bz1, y0 + h);
    }
  }
}

// A slab under the floor, standing out of it, if the floor gets one; returns where the
// floor's things stand.
function floorSlab(F, always) {
  const s = settings;
  if (!always && R() >= s.slabs / 100) return F.y0;
  const ov = q(rr(0, s.overhang)), th = Math.max(0.25, q(s.slabThick));
  if (F.y1 - F.y0 < th + 1) return F.y0;
  slab(F.x0 - ov, F.z0 - ov, F.x1 + ov, F.z1 + ov, F.y0, th);
  return F.y0 + th;
}

// Rows of tall racks round some of the sides, machinery in the middle.
function floorRacks(F) {
  const s = settings;
  const yb = floorSlab(F, false);
  const H = F.y1 - yb;
  const rd = Math.max(0.5, q(Math.min(s.rackDepth, (F.x1 - F.x0) / 3, (F.z1 - F.z0) / 3)));
  const order = [0, 1, 2, 3].sort(() => R() - 0.5);
  const n = clamp(Math.round(s.rackSides), 0, 4);
  const on = [false, false, false, false];             // z1, z0, x1, x0
  for (let i = 0; i < n; i++) on[order[i]] = true;
  const row = (A, a0, a1, b0, b1) => {
    let a = a0;
    const base = H * (1 - s.rackSteps / 200);
    while (a < a1 - 0.5) {
      let w = q(s.rackWidth * rr(0.7, 1.3));
      if (a1 - (a + w) < 1) w = a1 - a;
      const h = Math.max(1, q(base * (1 - s.rackSteps / 100 * R() * 0.6) + (R() < 0.15 ? H * 0.15 : 0)));
      const hh = Math.min(H, h);
      if (R() < s.rackSplit / 100 && hh >= 3) {
        const ym = q(yb + hh * rr(0.3, 0.7));
        addAx(A, a, a + w, b0, b1, yb, ym, K_RACK);
        addAx(A, a, a + w, b0, b1, ym, yb + hh, K_RACK);
      } else {
        addAx(A, a, a + w, b0, b1, yb, yb + hh, K_RACK);
      }
      if (A === 0) decorate(a, yb, b0, a + w, yb + hh, b1);
      else decorate(b0, yb, a, b1, yb + hh, a + w);
      a = q(a + w + s.rackGap);
    }
  };
  if (on[0]) row(0, F.x0, F.x1, F.z1 - rd, F.z1);
  if (on[1]) row(0, F.x0, F.x1, F.z0, F.z0 + rd);
  const zs = on[1] ? F.z0 + rd + s.rackGap : F.z0, ze = on[0] ? F.z1 - rd - s.rackGap : F.z1;
  if (on[2]) row(2, zs, ze, F.x1 - rd, F.x1);
  if (on[3]) row(2, zs, ze, F.x0, F.x0 + rd);
  const ix0 = on[3] ? F.x0 + rd + 0.5 : F.x0, ix1 = on[2] ? F.x1 - rd - 0.5 : F.x1;
  const iz0 = on[1] ? F.z0 + rd + 0.5 : F.z0, iz1 = on[0] ? F.z1 - rd - 0.5 : F.z1;
  machinery(ix0, iz0, ix1, iz1, yb, H * 0.6, Math.max(0, s.machineLevels - 1), s.machineFill / 100);
}

// One plate of a sleeve: a section perpendicular to A, its bars e thick, round the
// rectangle [B0, B1] × [Y0, Y1].
function plate(A, p0, p1, B0, B1, Y0, Y1, e, wrap, flip) {
  const g = newGroup();
  const legL = () => addAx(A, p0, p1, B0, B0 + e, Y0, Y1, K_FIN, g);
  const legR = () => addAx(A, p0, p1, B1 - e, B1, Y0, Y1, K_FIN, g);
  switch (wrap) {
    case 'over':
      legL(); legR();
      addAx(A, p0, p1, B0 + e, B1 - e, Y1 - e, Y1, K_FIN, g);
      break;
    case 'under':
      legL(); legR();
      addAx(A, p0, p1, B0 + e, B1 - e, Y0, Y0 + e, K_FIN, g);
      break;
    case 'ring':
      legL(); legR();
      addAx(A, p0, p1, B0 + e, B1 - e, Y1 - e, Y1, K_FIN, g);
      addAx(A, p0, p1, B0 + e, B1 - e, Y0, Y0 + e, K_FIN, g);
      break;
    case 'side':
      addAx(A, p0, p1, B0, B1, Y1 - e, Y1, K_FIN, g);
      addAx(A, p0, p1, B0, B1, Y0, Y0 + e, K_FIN, g);
      if (flip) addAx(A, p0, p1, B1 - e, B1, Y0 + e, Y1 - e, K_FIN, g);
      else addAx(A, p0, p1, B0, B0 + e, Y0 + e, Y1 - e, K_FIN, g);
      break;
    case 'corner':
      addAx(A, p0, p1, B0, B1, Y1 - e, Y1, K_FIN, g);
      if (flip) addAx(A, p0, p1, B1 - e, B1, Y0, Y1 - e, K_FIN, g);
      else addAx(A, p0, p1, B0, B0 + e, Y0, Y1 - e, K_FIN, g);
      break;
    default:                                              // blades
      if (flip) legR(); else legL();
  }
}

// A sleeve of plates wrapped round the floor along one horizontal axis — over it, under
// it, all round, round one side, round a corner, or blades standing out of one face —
// stepping aside half way, sometimes.
function sleeve(F, forceWrap) {
  const s = settings;
  const A = R() < 0.5 ? 0 : 2, B = 2 - A;
  const aLo = lo(F, A), aHi = hi(F, A);
  const e = Math.max(0.25, q(s.finDepth)), tf = Math.max(0.25, q(s.finThick));
  const pitch = tf + Math.max(0, q(s.finGap));
  const len = (aHi - aLo) * clamp(s.finCover, 5, 100) / 100;
  const n = Math.floor((len + pitch - tf) / pitch);
  if (n < 1) return;
  const span = (n - 1) * pitch + tf;
  const a0 = q(aLo + (aHi - aLo - span) * R());
  const wraps = WRAPS.slice(0, -1);
  const wrap = forceWrap || (s.finWrap === 'mixed' ? pick(wraps) : s.finWrap);
  const flip = R() < 0.5;
  const out = wrap === 'blades' ? 0 : e;
  let B0 = lo(F, B) - out, B1 = hi(F, B) + out;
  let Y0 = F.y0, Y1 = F.y1;
  if (wrap === 'over' || wrap === 'corner') Y1 += e;
  if (wrap === 'under') Y0 -= e;
  if (wrap === 'ring' || wrap === 'side') { Y0 -= e; Y1 += e; }
  if (wrap === 'blades') { if (flip) { B0 = hi(F, B); B1 = B0 + e; } else { B1 = lo(F, B); B0 = B1 - e; } }
  const jog = R() < s.finJog / 100 && n >= 6;
  const jm = Math.floor(n * rr(0.3, 0.7));
  const jb = q(pick([-1, 1]) * e * rr(1, 2.5)), jy = q(pick([-1, 1]) * e * rr(0, 1.5));
  for (let i = 0; i < n; i++) {
    const p0 = a0 + i * pitch;
    const ob = jog && i >= jm ? jb : 0, oy = jog && i >= jm ? jy : 0;
    if (wrap === 'blades') plate(A, p0, p0 + tf, B0 + ob, B1 + ob, Y0 + oy, Y1 + oy, e, wrap, false);
    else plate(A, p0, p0 + tf, B0 + ob, B1 + ob, Y0 + oy, Y1 + oy, e, wrap, flip);
  }
}

function floorRibbed(F) {
  const s = settings;
  const yb = floorSlab(F, false);
  machinery(F.x0, F.z0, F.x1, F.z1, yb, (F.y1 - yb) * 0.85, s.machineLevels, s.machineFill / 100);
  sleeve(F);
  if (R() < 0.3) sleeve(F, 'blades');
}

// A hollow square duct round the floor: a floor plate, a roof plate and two walls, one
// wall left out now and then; machinery inside, bar rings round the outside.
function floorFrame(F) {
  const s = settings;
  const A = R() < 0.5 ? 0 : 2, B = 2 - A;
  const fw = Math.max(0.25, q(s.frameWall));
  const aLo = lo(F, A), aHi = hi(F, A), bLo = lo(F, B), bHi = hi(F, B);
  if (bHi - bLo < 4 * fw || F.y1 - F.y0 < 4 * fw) { floorMachinery(F); return; }
  const g = newGroup();
  const open = R() < 0.35 ? (R() < 0.5 ? 1 : 2) : 0;
  addAx(A, aLo, aHi, bLo, bHi, F.y0, F.y0 + fw, K_FRAME, g);
  addAx(A, aLo, aHi, bLo, bHi, F.y1 - fw, F.y1, K_FRAME, g);
  const wall = (b0, b1) => {
    if (R() >= s.windows / 100) { addAx(A, aLo, aHi, b0, b1, F.y0 + fw, F.y1 - fw, K_FRAME, g); return; }
    // cut into posts: the wall's ends and a few between, the windows open
    const posts = Math.max(2, Math.round((aHi - aLo) / rr(5, 9)) + 1), pw = Math.max(fw, 0.5);
    for (let k = 0; k < posts; k++) {
      const a = q(aLo + (aHi - aLo - pw) * k / (posts - 1));
      addAx(A, a, a + pw, b0, b1, F.y0 + fw, F.y1 - fw, K_FRAME, g);
    }
  };
  if (open !== 1) wall(bLo, bLo + fw);
  if (open !== 2) wall(bHi - fw, bHi);
  const ins = fw + 0.5;
  const inner = A === 0 ? [aLo + 0.5, bLo + ins, aHi - 0.5, bHi - ins] : [bLo + ins, aLo + 0.5, bHi - ins, aHi - 0.5];
  machinery(inner[0], inner[1], inner[2], inner[3], F.y0 + fw, F.y1 - F.y0 - 2 * fw - 0.5,
            Math.max(0, s.machineLevels - 1), s.machineFill / 100);
  if (R() < s.rings / 100) {
    const count = ri(1, 3), bar = Math.max(0.5, q(fw * 0.75));
    for (let i = 0; i < count; i++) {
      const p = q(rr(aLo + 1, aHi - 1 - bar));
      plate(A, p, p + bar, bLo - bar, bHi + bar, F.y0 - bar, F.y1 + bar, bar, 'ring', false);
    }
  }
}

function floorMachinery(F) {
  const s = settings;
  const yb = floorSlab(F, false);
  machinery(F.x0, F.z0, F.x1, F.z1, yb, F.y1 - yb, s.machineLevels, s.machineFill / 100);
}

// A slab on columns, a few cabinets on it, a thinner slab over it now and then.
function floorDeck(F) {
  const s = settings;
  const yb = floorSlab(F, true);
  const th = Math.max(0.25, q(s.slabThick * 0.7));
  const roofed = R() < 0.5;
  const top = roofed ? F.y1 - th : F.y1;
  const cs = Math.max(0.25, q(s.columnSize));
  const nx = Math.max(1, Math.round((F.x1 - F.x0) / 8)), nz = Math.max(1, Math.round((F.z1 - F.z0) / 8));
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= nz; j++) {
      if (i > 0 && i < nx && j > 0 && j < nz) continue;
      const x = q(F.x0 + (F.x1 - F.x0 - cs) * i / nx), z = q(F.z0 + (F.z1 - F.z0 - cs) * j / nz);
      addBox(x, yb, z, x + cs, top, z + cs, K_STRUCT);
    }
  }
  if (roofed) slab(F.x0, F.z0, F.x1, F.z1, top, th);
  machinery(F.x0 + cs + 0.5, F.z0 + cs + 0.5, F.x1 - cs - 0.5, F.z1 - cs - 0.5, yb,
            (top - yb) * 0.55, Math.max(0, s.machineLevels - 1), s.machineFill / 200);
}

// Pipes all over a thin slab, a few cabinets among them.
function floorPipework(F) {
  const s = settings;
  const yb = floorSlab(F, R() < 0.7);
  machinery(F.x0, F.z0, F.x1, F.z1, yb, (F.y1 - yb) * 0.4, 0, s.machineFill / 300);
  const runs = Math.max(2, Math.round(s.pipes * 2 + 2));
  for (let i = 0; i < runs; i++) pipeRun({ ...F, y0: yb }, true);
}

// A square pipe along a path of axis-aligned runs; every run is its own box, none of them
// overlapping, all one solid, with flanges round some runs.
function pipeBoxes(P, size, g) {
  const s = settings, h = size / 2;
  for (let k = 0; k + 1 < P.length; k++) {
    const a = P[k], b = P[k + 1];
    let ax = -1;
    for (let c = 0; c < 3; c++) if (Math.abs(a[c] - b[c]) > 1e-9) ax = c;
    if (ax < 0) continue;
    const dir = b[ax] > a[ax] ? 1 : -1;
    const lo3 = [a[0] - h, a[1] - h, a[2] - h], hi3 = [a[0] + h, a[1] + h, a[2] + h];
    const from = a[ax] + dir * (k === 0 ? -h : h), to = b[ax] + dir * h;
    lo3[ax] = Math.min(from, to); hi3[ax] = Math.max(from, to);
    addBox(lo3[0], lo3[1], lo3[2], hi3[0], hi3[1], hi3[2], K_PIPE, g);
    const L = Math.abs(b[ax] - a[ax]);
    if (L > 3 * size && R() < s.flanges / 100) {
      const fh = q(Math.max(size * 0.8, size / 2 + 0.25)), ft = 0.25;
      const at = q(a[ax] + (b[ax] - a[ax]) * rr(0.25, 0.75));
      const fl = [a[0] - fh, a[1] - fh, a[2] - fh], fu = [a[0] + fh, a[1] + fh, a[2] + fh];
      fl[ax] = at - ft; fu[ax] = at + ft;
      addBox(fl[0], fl[1], fl[2], fu[0], fu[1], fu[2], K_PIPE);
    }
  }
}

// A run of one to a few pipes side by side, in one upright plane — along a face of the
// floor, just outside it, or through the middle — turning between level and upright.
function pipeRun(F, inside) {
  const s = settings;
  const size = Math.max(0.25, q(s.pipeSize * rr(0.75, 1.3)));
  const nb = ri(1, Math.max(1, Math.round(s.bundle)));
  const pitch = q(Math.max(size + 0.25, size * 1.75));
  const H = R() < 0.5 ? 0 : 2, N = 2 - H;
  const hLo = lo(F, H) + size, hHi = hi(F, H) - size;
  const yLo = F.y0 + size, yHi = F.y1 - size;
  if (hHi - hLo < 3 * size || yHi - yLo < 2 * size) return;
  let n0;
  const outside = !inside && R() < 0.6;
  const side = R() < 0.5 ? -1 : 1;
  if (outside) n0 = side > 0 ? hi(F, N) + size / 2 + 0.25 : lo(F, N) - size / 2 - 0.25;
  else n0 = q(rr(lo(F, N) + 1, hi(F, N) - 1 - (nb - 1) * pitch));
  const turns = ri(1, 4);
  const pts = [];
  let h = q(rr(hLo, hHi)), y = q(rr(yLo, yHi));
  pts.push([h, y]);
  let level = R() < 0.6;
  for (let t = 0; t <= turns; t++) {
    if (level) {
      let nh = q(rr(hLo, hHi));
      if (Math.abs(nh - h) < 2 * size) nh = h + (h < (hLo + hHi) / 2 ? 1 : -1) * Math.max(2 * size, (hHi - hLo) / 3);
      h = q(clamp(nh, hLo, hHi));
    } else {
      let ny = q(rr(yLo, yHi));
      if (Math.abs(ny - y) < 2 * size) ny = y + (y < (yLo + yHi) / 2 ? 1 : -1) * Math.max(2 * size, (yHi - yLo) / 2);
      y = q(clamp(ny, yLo, yHi));
    }
    const last = pts[pts.length - 1];
    if (Math.abs(last[0] - h) + Math.abs(last[1] - y) >= 2 * size) pts.push([h, y]);
    level = !level;
  }
  if (pts.length < 2) return;
  const dirN = outside ? side : 1;
  for (let b = 0; b < nb; b++) {
    const nn = n0 + dirN * b * pitch;
    const P = pts.map(([hh, yy]) => H === 0 ? [hh, yy, nn] : [nn, yy, hh]);
    pipeBoxes(P, size, newGroup());
  }
}

// A ladder up a face: two rails standing out of it and rungs between.
function ladder(F) {
  const A = R() < 0.5 ? 0 : 2, B = 2 - A, side = R() < 0.5;
  const face = side ? hi(F, B) : lo(F, B), out = side ? 1 : -1;
  const w = 1.5, rail = 0.25;
  const a = q(rr(lo(F, A) + 1, hi(F, A) - 1 - w));
  const b0 = face + out * 0.5, b1 = b0 + out * rail;
  const g = newGroup();
  addAx(A, a, a + rail, Math.min(b0, b1), Math.max(b0, b1), F.y0, F.y1, K_DETAIL, g);
  addAx(A, a + w - rail, a + w, Math.min(b0, b1), Math.max(b0, b1), F.y0, F.y1, K_DETAIL, g);
  for (let y = F.y0 + 0.75; y < F.y1 - 0.5; y += 0.75) {
    addAx(A, a + rail, a + w - rail, Math.min(b0, b1), Math.max(b0, b1), y, y + 0.25, K_DETAIL, g);
  }
}

// A tray standing out of a face with a few things on it.
function tray(F) {
  const s = settings;
  const A = R() < 0.5 ? 0 : 2, B = 2 - A, side = R() < 0.5;
  const face = side ? hi(F, B) : lo(F, B), out = side ? 1 : -1;
  const reach = q(rr(2, 5)), w = q(rr(3, Math.max(3.5, (hi(F, A) - lo(F, A)) * 0.6)));
  const a = q(rr(lo(F, A), hi(F, A) - w));
  const th = Math.max(0.25, q(s.slabThick * 0.6));
  const y = q(rr(F.y0, F.y1 - 2));
  const b0 = face, b1 = face + out * reach;
  addAx(A, a, a + w, Math.min(b0, b1), Math.max(b0, b1), y, y + th, K_STRUCT);
  const things = ri(1, 3);
  for (let i = 0; i < things; i++) {
    const tw = q(rr(0.75, Math.min(2.5, w / 2))), td = q(rr(0.75, Math.min(2, reach - 0.5)));
    const ta = q(rr(a, a + w - tw)), tb = side ? q(rr(face + 0.25, face + reach - td)) : q(rr(face - reach, face - 0.25 - td));
    addAx(A, ta, ta + tw, tb, tb + td, y + th, y + th + q(rr(0.5, 2)), K_DETAIL);
  }
}

// A mast: a pole, crossbars through it, a box on top.
function mast(x, z, y, H) {
  const pole = 0.5;
  addBox(x, y, z, x + pole, y + H, z + pole, K_DETAIL);
  const bars = ri(1, 3);
  for (let i = 0; i < bars; i++) {
    const yy = q(y + H * rr(0.4, 0.95)), L = q(rr(1.5, 4));
    if (R() < 0.5) addBox(x + pole / 2 - L / 2, yy, z + 0.125, x + pole / 2 + L / 2, yy + 0.25, z + 0.375, K_DETAIL);
    else addBox(x + 0.125, yy, z + pole / 2 - L / 2, x + 0.375, yy + 0.25, z + pole / 2 + L / 2, K_DETAIL);
  }
  if (R() < 0.6) addBox(x - 0.25, y + H, z - 0.25, x + pole + 0.25, y + H + 0.75, z + pole + 0.25, K_DETAIL);
}

// Posts in the air between two floors, where both of them are.
function links(P, F) {
  const s = settings;
  const x0 = Math.max(P.x0, F.x0), x1 = Math.min(P.x1, F.x1);
  const z0 = Math.max(P.z0, F.z0), z1 = Math.min(P.z1, F.z1);
  const cs = Math.max(0.25, q(s.columnSize));
  if (x1 - x0 < 2 * cs || z1 - z0 < 2 * cs || F.y0 - P.y1 < 0.25) return;
  const n = Math.round(s.columns);
  for (let i = 0; i < n; i++) {
    const corner = i < 4 && n >= 4;
    const x = corner ? (i % 2 ? x1 - cs - 0.5 : x0 + 0.5) : q(rr(x0, x1 - cs));
    const z = corner ? (i < 2 ? z0 + 0.5 : z1 - cs - 0.5) : q(rr(z0, z1 - cs));
    addBox(q(x), P.y1, q(z), q(x) + cs, F.y0, q(z) + cs, K_STRUCT);
  }
}

// A ring of square beams round the foot of a floor, standing out of it a little.
function beamRing(F) {
  const b = Math.max(0.25, q(settings.beamSize)), o = q(b * rr(0, 1));
  const x0 = F.x0 - o, x1 = F.x1 + o, z0 = F.z0 - o, z1 = F.z1 + o, y = F.y0;
  if (F.y1 - F.y0 < 2 * b) return;
  const g = newGroup();
  addBox(x0, y, z0, x1, y + b, z0 + b, K_FRAME, g);
  addBox(x0, y, z1 - b, x1, y + b, z1, K_FRAME, g);
  addBox(x0, y, z0 + b, x0 + b, y + b, z1 - b, K_FRAME, g);
  addBox(x1 - b, y, z0 + b, x1, y + b, z1 - b, K_FRAME, g);
  if (R() < 0.35) {                                     // and one round its head
    const yt = F.y1 - b;
    const g2 = newGroup();
    addBox(x0, yt, z0, x1, yt + b, z0 + b, K_FRAME, g2);
    addBox(x0, yt, z1 - b, x1, yt + b, z1, K_FRAME, g2);
    addBox(x0, yt, z0 + b, x0 + b, yt + b, z1 - b, K_FRAME, g2);
    addBox(x1 - b, yt, z0 + b, x1, yt + b, z1 - b, K_FRAME, g2);
  }
}

function pickKind() {
  const s = settings;
  const w = [s.wMachinery, s.wRacks, s.wRibbed, s.wFrame, s.wDeck, s.wPipework].map(v => Math.max(0, v));
  const sum = w.reduce((a, b) => a + b, 0);
  if (sum <= 0) return 'machinery';
  let r = R() * sum;
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return FLOOR_KINDS[i]; }
  return FLOOR_KINDS[0];
}

function buildTower(ox, salt, floorsOut) {
  const s = settings;
  R = rng(salt);
  const n = clamp(Math.round(s.floors), 1, 40);
  let y = 0, prev = null;
  const placed = [];
  for (let f = 0; f < n; f++) {
    CUR_FLOOR = floorsOut.length;
    const tk = 1 - clamp(s.taper, 0, 90) / 100 * (n > 1 ? f / (n - 1) : 0);
    const sv = clamp(s.sizeVar, 0, 80) / 100, hv = clamp(s.heightVar, 0, 90) / 100;
    let w = s.width * tk * (1 + sv * (R() * 2 - 1)), d = s.depth * tk * (1 + sv * (R() * 2 - 1));
    if (s.alternate && f % 2) { const t = w; w = d; d = t; }
    w = Math.max(4, q(w)); d = Math.max(4, q(d));
    const cx = ox + q(s.shift * (R() * 2 - 1)), cz = q(s.shift * (R() * 2 - 1));
    const h = Math.max(3, q(s.floorHeight * (1 + hv * (R() * 2 - 1))));
    const F = { x0: q(cx - w / 2), x1: q(cx - w / 2) + w, z0: q(cz - d / 2), z1: q(cz - d / 2) + d,
                y0: y, y1: y + h, kind: pickKind() };
    if (prev && s.gap > 0) links(prev, F);
    switch (F.kind) {
      case 'racks': floorRacks(F); break;
      case 'ribbed': floorRibbed(F); break;
      case 'frame': floorFrame(F); break;
      case 'deck': floorDeck(F); break;
      case 'pipework': floorPipework(F); break;
      default: floorMachinery(F);
    }
    if (F.kind !== 'frame' && F.kind !== 'deck' && R() < s.beams / 100) beamRing(F);
    const runs = Math.round(s.pipes);
    for (let i = 0; i < runs; i++) pipeRun(F, false);
    if (R() < s.ladders / 100) ladder(F);
    if (R() < s.trays / 100) tray(F);
    floorsOut.push(F);
    placed.push(F);
    y += h + Math.max(0, q(s.gap));
    prev = F;
  }
  // the roof
  const T = prev;
  CUR_FLOOR = floorsOut.length - 1;
  if (s.roof === 'slab') slab(T.x0 - 0.5, T.z0 - 0.5, T.x1 + 0.5, T.z1 + 0.5, T.y1, Math.max(0.25, q(s.slabThick)));
  const top = s.roof === 'slab' ? T.y1 + Math.max(0.25, q(s.slabThick)) : T.y1;
  if (s.roof === 'machinery') {
    machinery(T.x0 + 1, T.z0 + 1, T.x1 - 1, T.z1 - 1, top, s.floorHeight * 0.35, 1, s.machineFill / 200);
  }
  if (s.roof !== 'open' || s.masts > 0) {
    const m = Math.round(s.masts);
    for (let i = 0; i < m; i++) {
      mast(q(rr(T.x0 + 1, T.x1 - 1.5)), q(rr(T.z0 + 1, T.z1 - 1.5)), top, q(rr(3, s.floorHeight * 1.1)));
    }
  }
  // risers: pipes up the outside, past a few floors
  const rs = Math.round(s.risers);
  for (let i = 0; i < rs && placed.length > 1; i++) {
    const a = ri(0, placed.length - 2), b = ri(a + 1, Math.min(placed.length - 1, a + 4));
    const Fa = placed[a], Fb = placed[b];
    const size = Math.max(0.5, q(s.pipeSize * rr(1, 1.6)));
    const nb = ri(1, Math.max(1, Math.round(s.bundle)));
    const A = R() < 0.5 ? 0 : 2, B = 2 - A, side = R() < 0.5;
    const face = side ? Math.max(hi(Fa, B), hi(Fb, B)) : Math.min(lo(Fa, B), lo(Fb, B));
    const bc = face + (side ? 1 : -1) * (size / 2 + 0.5);
    const a0 = Math.max(lo(Fa, A), lo(Fb, A)) + 1, a1 = Math.min(hi(Fa, A), hi(Fb, A)) - 1 - nb * size * 2;
    if (a1 <= a0) continue;
    const ac = q(rr(a0, a1));
    const y0 = q(rr(Fa.y0 + 1, Fa.y1 - 1)), y1 = q(rr(Fb.y0 + 1, Fb.y1 - 1));
    for (let k = 0; k < nb; k++) {
      const at = ac + k * q(size * 1.75);
      const P = [[at, y0, bc], [at, y1, bc]].map(([aa, yy, bb]) => A === 0 ? [aa, yy, bb] : [bb, yy, aa]);
      pipeBoxes(P, size, newGroup());
    }
  }
}

function buildWorld() {
  const s = settings;
  WB = []; WK = []; WG = []; WF = []; GROUPS = 0; CUR_FLOOR = 0;
  const floors = [];
  const nt = clamp(Math.round(s.towers), 1, 8);
  for (let t = 0; t < nt; t++) {
    const ox = (t - (nt - 1) / 2) * (s.width + s.towerGap);
    buildTower(q(ox), 100 + t * 7919, floors);
  }
  const n = WK.length;
  const BXw = Float64Array.from(WB);
  const KD = Uint8Array.from(WK), GP = Int32Array.from(WG), FL = Int32Array.from(WF);

  // the accent, by whole elements
  const AC = new Uint8Array(n);
  R = rng(77);
  const redFloor = Math.floor(R() * floors.length);
  const gRed = new Uint8Array(GROUPS);
  for (let g = 0; g < GROUPS; g++) gRed[g] = R() < s.accentShare / 100 ? 1 : 0;
  for (let i = 0; i < n; i++) {
    const k = KD[i];
    let on = false;
    switch (s.accent) {
      case 'pipes':  on = k === K_PIPE; break;
      case 'fins':   on = k === K_FIN; break;
      case 'frames': on = k === K_FRAME; break;
      case 'racks':  on = k === K_RACK; break;
      case 'details': on = k === K_DETAIL; break;
      case 'one floor': on = FL[i] === redFloor; break;
      case 'every other floor': on = FL[i] % 2 === 1; break;
      case 'random parts': on = gRed[GP[i]] === 1; break;
    }
    AC[i] = on ? 1 : 0;
  }

  // the members of every group of more than one box
  const count = new Int32Array(GROUPS);
  for (let i = 0; i < n; i++) count[GP[i]]++;
  const MEM = new Array(GROUPS).fill(null);
  for (let i = 0; i < n; i++) {
    const g = GP[i];
    if (count[g] < 2) continue;
    (MEM[g] || (MEM[g] = [])).push(i);
  }
  const kinds = {};
  for (const F of floors) kinds[F.kind] = (kinds[F.kind] || 0) + 1;
  return { n, BX: BXw, KD, GP, FL, AC, MEM, groups: GROUPS, floors, kinds,
           capped: n >= MAX_BOXES };
}

////////////////////////////////////////////////////////////////////////////////////////
// The camera
//
// A parallel projection: paper x = S·(P·PR) + OX, paper y = −S·(P·PU) + OY, and CV the
// direction to the eye, the one every point slides along without moving on the paper.

const PRV = new Float64Array(3), PUV = new Float64Array(3), CVV = new Float64Array(3);
let S = 1, OX = 0, OY = 0, FIT = null;

function viewAngles() {
  const s = settings;
  if (s.projection === 'isometric') {
    return [45 + 90 * Math.round((wrapDeg(s.azimuth) - 45) / 90), 35.2644];
  }
  return [s.azimuth, clamp(s.elevation, -89, 89)];
}

function makeView() {
  const s = settings;
  let cx, cy, cz;
  if (s.projection === 'military') {
    const t = rad(s.azimuth), h = clamp(s.heightScale, 0.05, 5);
    PRV[0] = Math.cos(t); PRV[1] = 0; PRV[2] = -Math.sin(t);
    PUV[0] = -Math.sin(t); PUV[1] = h; PUV[2] = -Math.cos(t);
    cx = Math.sin(t); cy = 1 / h; cz = Math.cos(t);
  } else {
    const [az, el] = viewAngles();
    const t = rad(az), p = rad(el);
    PRV[0] = Math.cos(t); PRV[1] = 0; PRV[2] = -Math.sin(t);
    PUV[0] = -Math.sin(p) * Math.sin(t); PUV[1] = Math.cos(p); PUV[2] = -Math.sin(p) * Math.cos(t);
    cx = Math.cos(p) * Math.sin(t); cy = Math.sin(p); cz = Math.cos(p) * Math.cos(t);
  }
  const l = Math.hypot(cx, cy, cz);
  CVV[0] = cx / l; CVV[1] = cy / l; CVV[2] = cz / l;
}

// The fit: the whole structure in the picture at 100 %; zoom and pan then scale the
// sheet about the picture's middle.
function fitView(W) {
  const { n, BX } = W;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const o = i * 6;
    let xl = 0, xh = 0, yl = 0, yh = 0;
    for (let k = 0; k < 3; k++) {
      const lo_ = BX[o + k], hi_ = BX[o + 3 + k];
      let a = lo_ * PRV[k], b = hi_ * PRV[k];
      if (a < b) { xl += a; xh += b; } else { xl += b; xh += a; }
      a = -lo_ * PUV[k]; b = -hi_ * PUV[k];
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
  FIT = { bcx, bcy, ox0, oy0, s0 };
}

////////////////////////////////////////////////////////////////////////////////////////
// Hidden lines
//
// Every box's bounds on the paper (BS) and how near the eye it comes (DMX); a grid of
// bins over the paper; for every box, the boxes that may stand in front of any of it.

let BS = null, DMN = null, DMX = null;
let BIN = null;
let STAMP = null, STAMP_ID = 0;

function projectBoxes(W) {
  const { n, BX } = W;
  BS = new Float64Array(n * 4);
  DMN = new Float64Array(n);
  DMX = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 6;
    let xl = OX, xh = OX, yl = OY, yh = OY, dl = 0, dh = 0;
    for (let k = 0; k < 3; k++) {
      const lo_ = BX[o + k], hi_ = BX[o + 3 + k];
      let a = S * lo_ * PRV[k], b = S * hi_ * PRV[k];
      if (a < b) { xl += a; xh += b; } else { xl += b; xh += a; }
      a = -S * lo_ * PUV[k]; b = -S * hi_ * PUV[k];
      if (a < b) { yl += a; yh += b; } else { yl += b; yh += a; }
      a = lo_ * CVV[k]; b = hi_ * CVV[k];
      if (a < b) { dl += a; dh += b; } else { dl += b; dh += a; }
    }
    const c = i * 4;
    BS[c] = xl; BS[c + 1] = yl; BS[c + 2] = xh; BS[c + 3] = yh;
    DMN[i] = dl; DMX[i] = dh;
  }
}

function buildBins(W) {
  const n = W.n;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, sum = 0;
  for (let i = 0; i < n; i++) {
    const c = i * 4;
    if (BS[c] < x0) x0 = BS[c];
    if (BS[c + 1] < y0) y0 = BS[c + 1];
    if (BS[c + 2] > x1) x1 = BS[c + 2];
    if (BS[c + 3] > y1) y1 = BS[c + 3];
    sum += Math.sqrt((BS[c + 2] - BS[c]) * (BS[c + 3] - BS[c + 1]));
  }
  const cell = Math.max(0.5, n ? sum / n : 1, Math.max(x1 - x0, y1 - y0) / 400);
  const gw = Math.max(1, Math.ceil((x1 - x0) / cell) + 1), gh = Math.max(1, Math.ceil((y1 - y0) / cell) + 1);
  const start = new Int32Array(gw * gh + 1);
  const span = (i, f) => {
    const c = i * 4;
    const ca = Math.max(0, Math.floor((BS[c] - x0) / cell)), cb = Math.min(gw - 1, Math.floor((BS[c + 2] - x0) / cell));
    const ra = Math.max(0, Math.floor((BS[c + 1] - y0) / cell)), rb = Math.min(gh - 1, Math.floor((BS[c + 3] - y0) / cell));
    for (let r = ra; r <= rb; r++) for (let q2 = ca; q2 <= cb; q2++) f(r * gw + q2);
  };
  for (let i = 0; i < n; i++) span(i, k => { start[k + 1]++; });
  for (let k = 0; k < gw * gh; k++) start[k + 1] += start[k];
  const items = new Int32Array(start[gw * gh]);
  const cur = start.slice(0, gw * gh);
  for (let i = 0; i < n; i++) span(i, k => { items[cur[k]++] = i; });
  BIN = { x0, y0, cell, gw, gh, start, items };
  STAMP = new Int32Array(n);
  STAMP_ID = 0;
}

// The boxes that may hide any part of box i: on the paper over it, and coming nearer
// the eye than its farthest corner.
let CAND = new Int32Array(1024);
function gather(i) {
  const { x0, y0, cell, gw, gh, start, items } = BIN;
  const c = i * 4;
  const ca = Math.max(0, Math.floor((BS[c] - x0) / cell)), cb = Math.min(gw - 1, Math.floor((BS[c + 2] - x0) / cell));
  const ra = Math.max(0, Math.floor((BS[c + 1] - y0) / cell)), rb = Math.min(gh - 1, Math.floor((BS[c + 3] - y0) / cell));
  const id = ++STAMP_ID;
  let m = 0;
  const bx0 = BS[c], by0 = BS[c + 1], bx1 = BS[c + 2], by1 = BS[c + 3], dmin = DMN[i];
  for (let r = ra; r <= rb; r++) {
    for (let k = r * gw + ca, ke = r * gw + cb; k <= ke; k++) {
      for (let t = start[k]; t < start[k + 1]; t++) {
        const j = items[t];
        if (STAMP[j] === id) continue;
        STAMP[j] = id;
        const d = j * 4;
        if (BS[d] >= bx1 || BS[d + 2] <= bx0 || BS[d + 1] >= by1 || BS[d + 3] <= by0) continue;
        if (DMX[j] <= dmin + 1e-9) continue;
        if (m >= CAND.length) { const g = new Int32Array(CAND.length * 2); g.set(CAND); CAND = g; }
        CAND[m++] = j;
      }
    }
  }
  return m;
}

// Where along A + t·E (t in 0..1) box j hides the segment: those t for which some s > 0
// puts A + t·E + s·CV inside the box (shrunk by HIDE_EPS). For every axis the box bounds
// s from below and above by lines in t; the answer is where every lower bound stays under
// every upper one — an interval, HT0..HT1.
const LA = new Float64Array(4), LB = new Float64Array(4), LK = new Int8Array(4);
const UA = new Float64Array(3), UB = new Float64Array(3), UK = new Int8Array(3);
let HT0 = 0, HT1 = 0;

function hideSpan(BX, ax, ay, az, ex, ey, ez, j) {
  const o = j * 6;
  let t0 = 0, t1 = 1, nl = 1, nu = 0;
  LA[0] = HIDE_EPS; LB[0] = 0; LK[0] = -1;
  for (let k = 0; k < 3; k++) {
    const a = k === 0 ? ax : k === 1 ? ay : az;
    const e = k === 0 ? ex : k === 1 ? ey : ez;
    const lo_ = BX[o + k] + HIDE_EPS, hi_ = BX[o + 3 + k] - HIDE_EPS;
    const ck = CVV[k];
    if (ck > -1e-12 && ck < 1e-12) {
      if (e > -1e-15 && e < 1e-15) {
        if (a < lo_ || a > hi_) return false;
        continue;
      }
      let ta = (lo_ - a) / e, tb = (hi_ - a) / e;
      if (ta > tb) { const t = ta; ta = tb; tb = t; }
      if (ta > t0) t0 = ta;
      if (tb < t1) t1 = tb;
      if (t0 >= t1) return false;
      continue;
    }
    const inv = 1 / ck, slope = -e * inv;
    let aLo = (lo_ - a) * inv, aHi = (hi_ - a) * inv;
    if (ck < 0) { const t = aLo; aLo = aHi; aHi = t; }
    LA[nl] = aLo; LB[nl] = slope; LK[nl] = k; nl++;
    UA[nu] = aHi; UB[nu] = slope; UK[nu] = k; nu++;
  }
  for (let i = 0; i < nl; i++) {
    for (let m = 0; m < nu; m++) {
      if (LK[i] === UK[m]) continue;
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

// What is left of A→B, as SPANS of t, after every candidate has hidden its share.
let IV = new Float64Array(64), SPANS = new Float64Array(64);
const SEG = new Float64Array(5);

function visibleSpans(BX, ax, ay, az, bx, by, bz, cand, nc) {
  const pax = S * (ax * PRV[0] + ay * PRV[1] + az * PRV[2]) + OX;
  const pay = -S * (ax * PUV[0] + ay * PUV[1] + az * PUV[2]) + OY;
  const pbx = S * (bx * PRV[0] + by * PRV[1] + bz * PRV[2]) + OX;
  const pby = -S * (bx * PUV[0] + by * PUV[1] + bz * PUV[2]) + OY;
  const len = Math.hypot(pbx - pax, pby - pay);
  SEG[0] = pax; SEG[1] = pay; SEG[2] = pbx; SEG[3] = pby; SEG[4] = len;
  if (len < LEAST) return 0;
  const minx = Math.min(pax, pbx), maxx = Math.max(pax, pbx);
  const miny = Math.min(pay, pby), maxy = Math.max(pay, pby);
  const da = ax * CVV[0] + ay * CVV[1] + az * CVV[2], db = bx * CVV[0] + by * CVV[1] + bz * CVV[2];
  const dmin = Math.min(da, db);
  const ex = bx - ax, ey = by - ay, ez = bz - az;
  let ni = 0;
  for (let q2 = 0; q2 < nc; q2++) {
    const j = cand[q2], c = j * 4;
    if (BS[c] >= maxx || BS[c + 2] <= minx || BS[c + 1] >= maxy || BS[c + 3] <= miny) continue;
    if (DMX[j] <= dmin + 1e-9) continue;
    if (!hideSpan(BX, ax, ay, az, ex, ey, ez, j)) continue;
    if (HT0 <= 0 && HT1 >= 1) return 0;
    if (ni * 2 + 2 > IV.length) { const g = new Float64Array(IV.length * 2); g.set(IV); IV = g; }
    IV[ni * 2] = HT0; IV[ni * 2 + 1] = HT1;
    ni++;
  }
  if (ni === 0) { SPANS[0] = 0; SPANS[1] = 1; return 1; }
  for (let r = 1; r < ni; r++) {
    const s0 = IV[r * 2], s1 = IV[r * 2 + 1];
    let k = r - 1;
    while (k >= 0 && IV[k * 2] > s0) { IV[k * 2 + 2] = IV[k * 2]; IV[k * 2 + 3] = IV[k * 2 + 1]; k--; }
    IV[k * 2 + 2] = s0; IV[k * 2 + 3] = s1;
  }
  if (SPANS.length < IV.length + 2) SPANS = new Float64Array(IV.length + 2);
  let t = 0, m = 0;
  for (let r = 0; r <= ni && t < 1; r++) {
    const s0 = r < ni ? IV[r * 2] : 1;
    if (s0 > t) {
      const t1 = s0 < 1 ? s0 : 1;
      if ((t1 - t) * len >= LEAST) { SPANS[m * 2] = t; SPANS[m * 2 + 1] = t1; m++; }
    }
    if (r < ni && IV[r * 2 + 1] > t) t = IV[r * 2 + 1];
  }
  return m;
}

// Where an edge of box i — along axis k, on the side sa of axis a and sb of axis b — is
// a real edge of its element. Around the edge four quarters may hold the element's solid;
// the edge is drawn where one or three of them do (a corner standing out or turned in)
// or two across from each other, not where two side by side do (a flat face) or all four.
function realSpans(W, i, k, a, sa, b, sb, out) {
  const { BX, MEM, GP } = W;
  const mem = MEM[GP[i]];
  if (!mem) { out[0] = 0; out[1] = 1; return 1; }
  const o = i * 6;
  const ca = BX[o + (sa ? 3 : 0) + a], cb = BX[o + (sb ? 3 : 0) + b];
  const k0 = BX[o + k], k1 = BX[o + 3 + k], L = k1 - k0;
  const own = (sa ? 0 : 1) | (sb ? 0 : 2);
  const ivs = [];
  for (const m of mem) {
    if (m === i) continue;
    const p = m * 6;
    const l = Math.max(k0, BX[p + k]), h = Math.min(k1, BX[p + 3 + k]);
    if (h - l < 1e-6) continue;
    const am = BX[p + a] < ca - SEAM_D && BX[p + 3 + a] > ca - SEAM_D;
    const ap = BX[p + a] < ca + SEAM_D && BX[p + 3 + a] > ca + SEAM_D;
    const bm = BX[p + b] < cb - SEAM_D && BX[p + 3 + b] > cb - SEAM_D;
    const bp = BX[p + b] < cb + SEAM_D && BX[p + 3 + b] > cb + SEAM_D;
    let mask = 0;
    if (am && bm) mask |= 1 << 0;
    if (ap && bm) mask |= 1 << 1;
    if (am && bp) mask |= 1 << 2;
    if (ap && bp) mask |= 1 << 3;
    if (mask) ivs.push((l - k0) / L, (h - k0) / L, mask);
  }
  if (!ivs.length) { out[0] = 0; out[1] = 1; return 1; }
  const cuts = [0, 1];
  for (let r = 0; r < ivs.length; r += 3) cuts.push(ivs[r], ivs[r + 1]);
  cuts.sort((x, y) => x - y);
  let m = 0, open = -1;
  for (let c = 0; c + 1 < cuts.length; c++) {
    const t0 = cuts[c], t1 = cuts[c + 1];
    if (t1 - t0 < 1e-9) continue;
    const tm = (t0 + t1) / 2;
    let mask = 1 << own;
    for (let r = 0; r < ivs.length; r += 3) if (ivs[r] <= tm && ivs[r + 1] >= tm) mask |= ivs[r + 2];
    const bits = (mask & 1) + (mask >> 1 & 1) + (mask >> 2 & 1) + (mask >> 3 & 1);
    const real = bits === 1 || bits === 3 || mask === 9 || mask === 6;
    if (real) {
      if (open < 0) open = t0;
    } else if (open >= 0) {
      out[m * 2] = open; out[m * 2 + 1] = t0; m++; open = -1;
    }
  }
  if (open >= 0) { out[m * 2] = open; out[m * 2 + 1] = 1; m++; }
  return m;
}

function faceFront(axis, side) {
  return side ? CVV[axis] > 1e-9 : CVV[axis] < -1e-9;
}

////////////////////////////////////////////////////////////////////////////////////////
// From boxes to lines
//
// Edges and the lines where elements meet are axis-aligned, so on the paper they lie on
// a few families of parallel lines; they are pooled per layer and per axis and every
// line drawn once however many boxes share it. Hatching and solid faces go straight out.

let POOL = null;          // per layer*3 + axis: flat [x0, y0, x1, y1, ...]

function poolSeg(layer, axis, x0, y0, x1, y1) {
  POOL[layer * 3 + axis].push(x0, y0, x1, y1);
}

const RS = new Float64Array(256);

function edgeLines(W, i, layer, cand, nc) {
  const BX = W.BX, o = i * 6;
  const A3 = [0, 0, 0], B3 = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const a = (k + 1) % 3, b = (k + 2) % 3;
    for (let sa = 0; sa < 2; sa++) {
      for (let sb = 0; sb < 2; sb++) {
        if (!faceFront(a, sa) && !faceFront(b, sb)) continue;
        const nr = realSpans(W, i, k, a, sa, b, sb, RS);
        if (!nr) continue;
        const ca = BX[o + (sa ? 3 : 0) + a], cb = BX[o + (sb ? 3 : 0) + b];
        const k0 = BX[o + k], k1 = BX[o + 3 + k];
        for (let r = 0; r < nr; r++) {
          A3[a] = ca; A3[b] = cb; A3[k] = k0 + (k1 - k0) * RS[r * 2];
          B3[a] = ca; B3[b] = cb; B3[k] = k0 + (k1 - k0) * RS[r * 2 + 1];
          emitVisible(BX, A3, B3, cand, nc, layer, k);
        }
      }
    }
  }
}

function emitVisible(BX, A3, B3, cand, nc, layer, axis) {
  const m = visibleSpans(BX, A3[0], A3[1], A3[2], B3[0], B3[1], B3[2], cand, nc);
  if (!m) return;
  const pax = SEG[0], pay = SEG[1], dx = SEG[2] - pax, dy = SEG[3] - pay;
  for (let r = 0; r < m; r++) {
    const t0 = SPANS[r * 2], t1 = SPANS[r * 2 + 1];
    const x0 = pax + dx * t0, y0 = pay + dy * t0, x1 = pax + dx * t1, y1 = pay + dy * t1;
    if (axis >= 0) poolSeg(layer, axis, x0, y0, x1, y1);
    else { setPen(layer); emit([x0, x1], [y0, y1], 2); }
  }
}

// Where box i and a box of another element pass into each other: the edges of the box
// they share that lie on a face of each.
function meetLines(W, i, cand, nc, layerOf) {
  const { BX, GP } = W;
  const o = i * 6;
  const lo3 = [0, 0, 0], hi3 = [0, 0, 0], fa = [[0, 0], [0, 0], [0, 0]], fb = [[0, 0], [0, 0], [0, 0]];
  const A3 = [0, 0, 0], B3 = [0, 0, 0];
  for (let c = 0; c < nc; c++) {
    const j = cand[c];
    if (j <= i || GP[j] === GP[i]) continue;
    const p = j * 6;
    let ok = true;
    for (let k = 0; k < 3; k++) {
      const l = Math.max(BX[o + k], BX[p + k]), h = Math.min(BX[o + 3 + k], BX[p + 3 + k]);
      if (h - l < 1e-6) { ok = false; break; }
      lo3[k] = l; hi3[k] = h;
      // which box each bound of the shared box comes from: bit 1 for i, bit 2 for j
      fa[k][0] = (BX[o + k] >= BX[p + k] ? 1 : 0) | (BX[p + k] >= BX[o + k] ? 2 : 0);
      fa[k][1] = (BX[o + 3 + k] <= BX[p + 3 + k] ? 1 : 0) | (BX[p + 3 + k] <= BX[o + 3 + k] ? 2 : 0);
    }
    if (!ok) continue;
    const vi = (BX[o + 3] - BX[o]) * (BX[o + 4] - BX[o + 1]) * (BX[o + 5] - BX[o + 2]);
    const vj = (BX[p + 3] - BX[p]) * (BX[p + 4] - BX[p + 1]) * (BX[p + 5] - BX[p + 2]);
    const layer = layerOf(vi <= vj ? i : j);
    for (let k = 0; k < 3; k++) {
      const a = (k + 1) % 3, b = (k + 2) % 3;
      for (let sa = 0; sa < 2; sa++) {
        for (let sb = 0; sb < 2; sb++) {
          const fA = fa[a][sa], fB = fa[b][sb];
          if ((fA & 1 && fB & 1) || (fA & 2 && fB & 2)) continue;      // an edge of one of them
          if (!((fA & 1 && fB & 2) || (fA & 2 && fB & 1))) continue;
          const ca = sa ? hi3[a] : lo3[a], cb = sb ? hi3[b] : lo3[b];
          A3[a] = ca; A3[b] = cb; A3[k] = lo3[k];
          B3[a] = ca; B3[b] = cb; B3[k] = hi3[k];
          emitVisible(BX, A3, B3, cand, nc, layer, k);
        }
      }
    }
  }
}

// Hatching or a solid fill on one face of box i: lines on the face itself, hidden like
// everything else. Spacing is measured on the paper.
function faceShade(W, i, n, sn, tone, layer, cand, nc) {
  const BX = W.BX, o = i * 6, s = settings;
  const fp = n === 1 ? (s.hatchDir === 'across' ? 2 : 0) : (s.hatchDir === 'across' ? 2 - n : 1);
  const fq = 3 - n - fp;
  const vpx = S * PRV[fp], vpy = -S * PUV[fp], vqx = S * PRV[fq], vqy = -S * PUV[fq];
  const cr = Math.abs(vpx * vqy - vpy * vqx);
  const lp = Math.hypot(vpx, vpy), lq = Math.hypot(vqx, vqy);
  if (cr < 1e-9 || lp < 1e-9 || lq < 1e-9) return;
  const p0 = BX[o + fp], p1 = BX[o + 3 + fp], q0 = BX[o + fq], q1 = BX[o + 3 + fq];
  const cn = BX[o + (sn ? 3 : 0) + n];
  const Lp = p1 - p0, Lq = q1 - q0;
  const dq = cr / lp, dp = cr / lq;          // mm on the paper per unit across p-lines / q-lines
  const A3 = [0, 0, 0], B3 = [0, 0, 0];
  const line = (pa, qa, pb, qb) => {
    A3[n] = cn; A3[fp] = pa; A3[fq] = qa;
    B3[n] = cn; B3[fp] = pb; B3[fq] = qb;
    emitVisible(BX, A3, B3, cand, nc, layer, -1);
  };
  const family = (gap, alongP) => {           // lines along p, stepped across q — or the other way
    const width = alongP ? Lq * dq : Lp * dp;
    const m = Math.ceil(width / gap - 1e-9);
    for (let j = 1; j < m; j++) {
      if (alongP) { const qq = q0 + Lq * j / m; line(p0, qq, p1, qq); }
      else { const pp = p0 + Lp * j / m; line(pp, q0, pp, q1); }
    }
  };
  const g = Math.max(0.1, s.shadeGap);
  if (tone === 'solid') {
    const nib = penW(layerPen(layer));
    const ip = nib / 2 / dp, iq = nib / 2 / dq;
    const alongP = Lp * dp >= Lq * dq;        // passes run the long way
    if (Lp - 2 * ip <= 1e-9 || Lq - 2 * iq <= 1e-9) {
      if (alongP) line(p0 + Math.min(ip, Lp / 2), (q0 + q1) / 2, p1 - Math.min(ip, Lp / 2), (q0 + q1) / 2);
      else line((p0 + p1) / 2, q0 + Math.min(iq, Lq / 2), (p0 + p1) / 2, q1 - Math.min(iq, Lq / 2));
      return;
    }
    const a0 = p0 + ip, a1 = p1 - ip, b0 = q0 + iq, b1 = q1 - iq;
    line(a0, b0, a1, b0); line(a1, b0, a1, b1); line(a1, b1, a0, b1); line(a0, b1, a0, b0);
    const width = alongP ? (b1 - b0) * dq : (a1 - a0) * dp;
    const m = Math.ceil(width / (PASS * nib) - 1e-9);
    for (let j = 1; j < m; j++) {
      if (alongP) { const qq = b0 + (b1 - b0) * j / m; line(a0, qq, a1, qq); }
      else { const pp = a0 + (a1 - a0) * j / m; line(pp, b0, pp, b1); }
    }
    return;
  }
  if (s.hatchDir === 'diagonal' && tone !== 'cross') {
    const gg = tone === 'sparse' ? g * 2 : tone === 'dense' ? g * 0.5 : g;
    const dl = Math.hypot(vpx + vqx, vpy + vqy);
    if (dl < 1e-9) return;
    const step = gg * dl / cr;                 // units of (p − q) between two lines
    for (let c = -Lq + step; c < Lp - 1e-9; c += step) {
      // p − q = c, inside [0, Lp] × [0, Lq]
      const qa = Math.max(0, -c), qb = Math.min(Lq, Lp - c);
      if (qb - qa < 1e-9) continue;
      line(p0 + c + qa, q0 + qa, p0 + c + qb, q0 + qb);
    }
    return;
  }
  if (tone === 'sparse') family(g * 2, true);
  else if (tone === 'dense') family(g * 0.5, true);
  else if (tone === 'cross') { family(g, true); family(g, false); }
  else family(g, true);
}

function shadeRole(n, sn) {
  if (n === 1) return 'top';
  const nx = (sn ? 1 : -1) * PRV[n];
  return nx < 0 ? 'left' : 'right';
}

function shadeWanted(kind) {
  switch (settings.shadeWho) {
    case 'machinery': return kind === K_MACHINE || kind === K_RACK || kind === K_DETAIL;
    case 'structure': return kind === K_STRUCT || kind === K_FRAME || kind === K_RACK;
    case 'fins': return kind === K_FIN;
    case 'pipes': return kind === K_PIPE;
    default: return true;
  }
}

// Every pooled family of lines: sorted by where across the paper each lies, runs of
// lines closer than MERGE_TOL taken as one, and their pieces joined where they overlap.
function flushPool() {
  for (let layer = 0; layer < LAYERS.length; layer++) {
    for (let axis = 0; axis < 3; axis++) {
      const L = POOL[layer * 3 + axis];
      const n = L.length / 4;
      if (!n) continue;
      let ux = S * PRV[axis], uy = -S * PUV[axis];
      const ul = Math.hypot(ux, uy);
      if (ul < 1e-12) continue;
      ux /= ul; uy /= ul;
      const nx = -uy, ny = ux;
      const D = new Float64Array(n), T0 = new Float64Array(n), T1 = new Float64Array(n);
      const idx = new Int32Array(n);
      for (let r = 0; r < n; r++) {
        const x0 = L[r * 4], y0 = L[r * 4 + 1], x1 = L[r * 4 + 2], y1 = L[r * 4 + 3];
        D[r] = x0 * nx + y0 * ny;
        const a = x0 * ux + y0 * uy, b = x1 * ux + y1 * uy;
        T0[r] = Math.min(a, b); T1[r] = Math.max(a, b);
        idx[r] = r;
      }
      idx.sort((p, q2) => D[p] - D[q2]);
      setPen(layer);
      let r = 0;
      while (r < n) {
        let e = r + 1;
        while (e < n && D[idx[e]] - D[idx[e - 1]] < MERGE_TOL) e++;
        const grp = Array.from(idx.subarray(r, e)).sort((p, q2) => T0[p] - T0[q2]);
        const d = D[grp[0]];
        let a = T0[grp[0]], b = T1[grp[0]];
        const out = () => {
          emit([d * nx + a * ux, d * nx + b * ux], [d * ny + a * uy, d * ny + b * uy], 2);
        };
        for (let g = 1; g < grp.length; g++) {
          const p = grp[g];
          if (T0[p] <= b + MERGE_TOL) { if (T1[p] > b) b = T1[p]; }
          else { out(); a = T0[p]; b = T1[p]; }
        }
        out();
        r = e;
      }
    }
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// The sink — polylines in mm, each with its pen and layer, clipped to the pen's box

let SINK = null;
let PEN = 0, LAY = 0;
let AREAS = [];
let PASS = 0.85;
let COUNTS = null;

function makeSink() {
  return { pts: [], off: [0], ink: [], lay: [] };
}

function setPen(li) {
  LAY = li;
  PEN = layerPen(li);
}

const CLIP_OUT = new Float64Array(4);

function clipSeg(A, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  let t0 = 0, t1 = 1;
  for (let e = 0; e < 4; e++) {
    const p = e === 0 ? -dx : e === 1 ? dx : e === 2 ? -dy : dy;
    const qq = e === 0 ? x0 - A.x0 : e === 1 ? A.x1 - x0 : e === 2 ? y0 - A.y0 : A.y1 - y0;
    if (p === 0) { if (qq < 0) return false; continue; }
    const r = qq / p;
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
    if (Math.hypot(bx - ax, by - ay) < LEAST) { flush(); continue; }
    if (rx && Math.abs(rx[rx.length - 1] - ax) < 1e-9 && Math.abs(ry[ry.length - 1] - ay) < 1e-9) {
      rx.push(bx); ry.push(by);
    } else {
      flush();
      rx = [ax, bx]; ry = [ay, by];
    }
  }
  flush();
}

// A line round the picture.
function borderLines() {
  if (settings.border === 'none') return;
  setPen(LI.border);
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
  GUIDE_PEN = penOrder().find(i => used.has(i)) ?? penIdx(settings.edgePen);
  if (!settings.cropMarks) return;
  const [W] = paperDims();
  PEN = GUIDE_PEN; LAY = LI.guides;
  for (const [x, y] of cropMarkPlaces()) pushPoly([x, x + (x > W / 2 ? -EPS : EPS)], [y, y], 2);
}

function buildShapes() {
  const s = settings;
  area = drawArea();
  if (area.w < 5 || area.h < 5 || !WORLD || !WORLD.n) return null;
  SINK = makeSink();
  AREAS = [];
  for (let i = 0; i < SLOTS; i++) AREAS.push(penArea(i));
  PASS = clamp(s.passes, 10, 300) / 100;
  POOL = [];
  for (let k = 0; k < LAYERS.length * 3; k++) POOL.push([]);

  const W = WORLD;
  makeView();
  fitView(W);
  projectBoxes(W);
  buildBins(W);

  // elements smaller on the paper than smallBelow go with the fine pen, whole
  const gx0 = new Float64Array(W.groups).fill(Infinity), gy0 = new Float64Array(W.groups).fill(Infinity);
  const gx1 = new Float64Array(W.groups).fill(-Infinity), gy1 = new Float64Array(W.groups).fill(-Infinity);
  for (let i = 0; i < W.n; i++) {
    const g = W.GP[i], c = i * 4;
    if (BS[c] < gx0[g]) gx0[g] = BS[c];
    if (BS[c + 1] < gy0[g]) gy0[g] = BS[c + 1];
    if (BS[c + 2] > gx1[g]) gx1[g] = BS[c + 2];
    if (BS[c + 3] > gy1[g]) gy1[g] = BS[c + 3];
  }
  const small = s.smallBelow;
  const layerOf = i => {
    if (W.AC[i]) return LI.accent;
    const g = W.GP[i];
    if (small > 0 && Math.max(gx1[g] - gx0[g], gy1[g] - gy0[g]) < small) return LI.fine;
    return LI.edges;
  };
  const tones = { left: s.shadeLeft, right: s.shadeRight, top: s.shadeTop };
  const shading = tones.left !== 'none' || tones.right !== 'none' || tones.top !== 'none';

  for (let i = 0; i < W.n; i++) {
    const nc = gather(i);
    const layer = layerOf(i);
    edgeLines(W, i, layer, CAND, nc);
    meetLines(W, i, CAND, nc, layerOf);
    if (shading && shadeWanted(W.KD[i])) {
      for (let n = 0; n < 3; n++) {
        for (let sn = 0; sn < 2; sn++) {
          if (!faceFront(n, sn)) continue;
          const tone = tones[shadeRole(n, sn)];
          if (!tone || tone === 'none') continue;
          const sl = W.AC[i] ? LI.accent : tone === 'solid' ? LI.solid : LI.hatch;
          faceShade(W, i, n, sn, tone, sl, CAND, nc);
        }
      }
    }
  }
  flushPool();
  POOL = null;
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
  COUNTS = { boxes: W.n, groups: W.groups, floors: W.floors.length, unit: S };
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

// The margin, the outline of every floor on the ground and where the cut guides stand.
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
  if (WORLD) {
    for (const F of WORLD.floors) {
      ctx.beginPath();
      const c = [[F.x0, F.z0], [F.x1, F.z0], [F.x1, F.z1], [F.x0, F.z1]];
      c.forEach(([x, z], k) => {
        const px = S * (x * PRV[0] + F.y0 * PRV[1] + z * PRV[2]) + OX;
        const py = -S * (x * PUV[0] + F.y0 * PUV[1] + z * PUV[2]) + OY;
        if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();
    }
  }
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
// Dragging the sheet turns the camera round the tower; shift-drag, or a drag with the
// right button, moves the drawing over the sheet; the wheel zooms about the cursor.

function paperPoint(e) {
  const r = canvasEl().getBoundingClientRect();
  const [W, H] = paperDims();
  return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
}

const VIEW_KEYS = ['projection', 'azimuth', 'elevation', 'zoom', 'panX', 'panY'];

function attachPointer() {
  const c = canvasEl();
  c.addEventListener('contextmenu', e => e.preventDefault());
  c.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.button !== 2) return;
    const s = settings;
    drag = {
      mode: (e.shiftKey || e.button === 2) ? 'pan' : 'turn',
      x: e.clientX, y: e.clientY, p: paperPoint(e), moved: false,
      az: s.azimuth, el: s.elevation, px: s.panX, py: s.panY,
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
      const p = paperPoint(e), z = clamp(s.zoom, MIN_ZOOM, MAX_ZOOM) / 100;
      s.panX = +clamp(drag.px - (p[0] - drag.p[0]) / z, -2000, 2000).toFixed(1);
      s.panY = +clamp(drag.py - (p[1] - drag.p[1]) / z, -2000, 2000).toFixed(1);
    } else {
      if (s.projection === 'isometric') {
        const [az] = viewAngles();
        s.projection = 'axonometric';
        drag.az = az; drag.el = 35.3;
      }
      s.azimuth = +wrapDeg(drag.az - dx * DRAG_DEG_PX).toFixed(1);
      if (s.projection === 'military') s.heightScale = +clamp(1 - dy * 0.004, 0.1, 3).toFixed(2);
      else s.elevation = +clamp(drag.el + dy * DRAG_DEG_PX, -89, 89).toFixed(1);
    }
    for (const k of [...VIEW_KEYS, 'heightScale']) if (setters[k]) setters[k](s[k]);
    liveUpdate();
    e.preventDefault();
  });
  const end = e => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    c.classList.remove('dragging');
    try { c.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
    if (moved) { syncVisibility(); update(); } else drawPreview();
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

// Zoom keeping the point under the cursor where it is on the sheet.
function zoomAbout(factor, m) {
  const s = settings;
  const z = clamp(s.zoom, MIN_ZOOM, MAX_ZOOM) / 100;
  const z2 = clamp(s.zoom * factor, MIN_ZOOM, MAX_ZOOM) / 100;
  if (FIT && m) {
    const { bcx, bcy, ox0, oy0 } = FIT;
    const ox = bcx + z * (ox0 - bcx - s.panX), oy = bcy + z * (oy0 - bcy - s.panY);
    const nox = m[0] - z2 / z * (m[0] - ox), noy = m[1] - z2 / z * (m[1] - oy);
    s.panX = +(ox0 - bcx - (nox - bcx) / z2).toFixed(1);
    s.panY = +(oy0 - bcy - (noy - bcy) / z2).toFixed(1);
  }
  s.zoom = +(z2 * 100).toFixed(1);
  for (const k of ['zoom', 'panX', 'panY']) if (setters[k]) setters[k](s[k]);
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
    const toggle = key => { s[key] = !s[key]; refreshControls(); update(); };
    const nudge = (k, d, lo_, hi_) => {
      s[k] = +clamp(s[k] + d, lo_, hi_).toFixed(2);
      refreshControls();
      update();
    };
    const step = e.shiftKey ? 10 : 1;
    const turn = s.projection === 'isometric' ? 90 : 15;
    switch (e.key) {
      case 'r': case 'R': s.seed = Math.floor(Math.random() * 100000); refreshControls(); update(); break;
      case '[': s.seed = Math.max(0, Math.round(s.seed) - 1); refreshControls(); update(); break;
      case ']': s.seed = Math.round(s.seed) + 1; refreshControls(); update(); break;
      case 'p': cycle('projection', PROJECTIONS, 1); break;
      case 'P': cycle('projection', PROJECTIONS, -1); break;
      case 'q': case 'Q': nudge('azimuth', -turn, -180, 180); s.azimuth = wrapDeg(s.azimuth); break;
      case 'e': case 'E': nudge('azimuth', turn, -180, 180); s.azimuth = wrapDeg(s.azimuth); break;
      case 'f': nudge('floors', 1, 1, 40); break;
      case 'F': nudge('floors', -1, 1, 40); break;
      case 't': nudge('towers', 1, 1, 8); break;
      case 'T': nudge('towers', -1, 1, 8); break;
      case 'a': cycle('accent', ACCENTS, 1); break;
      case 'A': cycle('accent', ACCENTS, -1); break;
      case 'w': cycle('finWrap', WRAPS, 1); break;
      case 'W': cycle('finWrap', WRAPS, -1); break;
      case 'h': cycle('shadeRight', SHADES, 1); break;
      case 'H': cycle('shadeRight', SHADES, -1); break;
      case 'j': cycle('shadeLeft', SHADES, 1); break;
      case 'J': cycle('shadeLeft', SHADES, -1); break;
      case 'k': cycle('shadeTop', SHADES, 1); break;
      case 'K': cycle('shadeTop', SHADES, -1); break;
      case 'o': case 'O': toggle('alternate'); break;
      case 's': case 'S': {
        const k = (SCENES.findIndex(sc => sc.label === lastScene) + (e.key === 'S' ? -1 : 1) +
                   SCENES.length) % SCENES.length || (e.key === 'S' ? SCENES.length - 1 : 1);
        applyScene(SCENES[k]);
        break;
      }
      case 'ArrowLeft':  nudge('panX', step, -2000, 2000); break;
      case 'ArrowRight': nudge('panX', -step, -2000, 2000); break;
      case 'ArrowUp':    nudge('panY', step, -2000, 2000); break;
      case 'ArrowDown':  nudge('panY', -step, -2000, 2000); break;
      case '+': case '=': zoomAbout(1.1, area ? [(area.x0 + area.x1) / 2, (area.y0 + area.y1) / 2] : null); break;
      case '-': case '_': zoomAbout(1 / 1.1, area ? [(area.x0 + area.x1) / 2, (area.y0 + area.y1) / 2] : null); break;
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
  setVisible('towerGap', s.towers > 1);
  setVisible('columns', s.gap > 0);
  show(['azimuth'], true);
  setVisible('elevation', s.projection === 'axonometric');
  setVisible('heightScale', s.projection === 'military');
  setVisible('accentShare', s.accent === 'random parts');
  setVisible('accentPen', s.accent !== 'none');
  setVisible('finePen', s.smallBelow > 0);
  const tones = [s.shadeLeft, s.shadeRight, s.shadeTop];
  const anyShade = tones.some(t => t !== 'none');
  show(['shadeWho'], anyShade);
  show(['shadeGap', 'hatchDir'], tones.some(t => t !== 'none' && t !== 'solid'));
  setVisible('hatchPen', tones.some(t => t !== 'none' && t !== 'solid'));
  show(['solidPen', 'passes'], tones.includes('solid'));
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
  createDiv('What every floor is and everything on it. <b>R</b> rolls a new one, ' +
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

  sec = addSection(root, 'The tower');
  addNote(sec, 'In units of the grid — the drawing is fitted to the picture, so only how they ' +
    'compare matters. The sheet tells how many millimetres a unit came out.');
  addSlider(sec, 'Towers', 'towers', 1, 8, 1, 'Side by side, each of its own. <b>T</b> adds one.', resync);
  addSlider(sec, 'Between the towers', 'towerGap', 0, 60, 0.5);
  addSlider(sec, 'Floors', 'floors', 1, 40, 1, '<b>F</b> adds one, <b>shift-F</b> takes one off.');
  addSlider(sec, 'Width', 'width', 4, 120, 0.5);
  addSlider(sec, 'Depth', 'depth', 4, 120, 0.5);
  addSlider(sec, 'Floor height', 'floorHeight', 3, 60, 0.5);
  addSlider(sec, 'Heights differ (%)', 'heightVar', 0, 90, 1);
  addSlider(sec, 'Sizes differ (%)', 'sizeVar', 0, 80, 1, 'How much a floor is wider or narrower than set.');
  addSlider(sec, 'Floors stand off (units)', 'shift', 0, 20, 0.25,
    'How far a floor may sit to the side of the one under it.');
  addSlider(sec, 'Taper (%)', 'taper', 0, 90, 1, 'How much narrower the top floor is than the bottom one.');
  addSlider(sec, 'Air between floors', 'gap', 0, 30, 0.25,
    '0 stacks them tight; more pulls the tower apart, with posts across the gaps.', resync);
  addSlider(sec, 'Posts across a gap', 'columns', 0, 16, 1);
  addCheckbox(sec, 'Every other floor turned a quarter', 'alternate');
  addSelect(sec, 'On the roof', 'roof', ROOFS, update,
    'Low <b>machinery</b> and masts, <b>masts</b> only, a <b>slab</b>, or nothing.');
  addSlider(sec, 'Masts', 'masts', 0, 20, 1);

  sec = addSection(root, 'Floors');
  addNote(sec, 'How often each kind of floor comes up — 0 never, the rest by share.');
  addSlider(sec, 'Machinery', 'wMachinery', 0, 10, 0.5,
    'Cabinets packed over the floor, smaller ones stacked on them.');
  addSlider(sec, 'Racks', 'wRacks', 0, 10, 0.5, 'Rows of tall racks round the edges, machinery in the middle.');
  addSlider(sec, 'Ribbed', 'wRibbed', 0, 10, 0.5, 'A sleeve of thin plates wrapped round a machinery core.');
  addSlider(sec, 'Frame', 'wFrame', 0, 10, 0.5, 'A hollow square duct round the floor, bar rings round it.');
  addSlider(sec, 'Deck', 'wDeck', 0, 10, 0.5, 'An open slab on columns, a few cabinets on it.');
  addSlider(sec, 'Pipework', 'wPipework', 0, 10, 0.5, 'A thin slab tangled in pipes.');

  sec = addSection(root, 'Slabs and frames');
  addSlider(sec, 'Floors on a slab (%)', 'slabs', 0, 100, 1);
  addSlider(sec, 'Slab thickness', 'slabThick', 0.25, 4, 0.25);
  addSlider(sec, 'Slabs stand out up to', 'overhang', 0, 8, 0.25);
  addSlider(sec, 'Frame walls', 'frameWall', 0.25, 5, 0.25, 'How thick the duct of a frame floor is.');
  addSlider(sec, 'Frames with rings (%)', 'rings', 0, 100, 1);
  addSlider(sec, 'Hollow frames among the cabinets (%)', 'portals', 0, 100, 1,
    'Upright rings — two posts, a head and a sill — in place of some cabinets.');
  addSlider(sec, 'Post size', 'columnSize', 0.25, 4, 0.25, 'Of the posts of a deck and across the gaps.');
  addSlider(sec, 'Floors with beams round (%)', 'beams', 0, 100, 1,
    'A ring of square beams round the foot of a floor, and now and then its head.');
  addSlider(sec, 'Beam size', 'beamSize', 0.25, 4, 0.25);
  addSlider(sec, 'Frame walls with windows (%)', 'windows', 0, 100, 1,
    'A wall of the duct cut into posts, so what is inside shows.');

  sec = addSection(root, 'Racks');
  addSlider(sec, 'Sides with a row', 'rackSides', 0, 4, 1);
  addSlider(sec, 'Rack depth', 'rackDepth', 0.5, 12, 0.25);
  addSlider(sec, 'Rack width', 'rackWidth', 0.5, 12, 0.25);
  addSlider(sec, 'Between two racks', 'rackGap', 0, 3, 0.25, '0 packs them face to face.');
  addSlider(sec, 'Heights differ (%)', 'rackSteps', 0, 100, 1);
  addSlider(sec, 'Cut in two (%)', 'rackSplit', 0, 100, 1, 'Racks made of two cabinets, one on the other.');

  sec = addSection(root, 'Fins');
  addSelect(sec, 'Wrapped', 'finWrap', WRAPS, update,
    'Each plate of a sleeve goes <b>over</b> the floor (down both sides and over the top), ' +
    '<b>under</b> it, <b>ring</b> all round, round one <b>side</b>, round a <b>corner</b>, or ' +
    'stands out of one face as <b>blades</b>; <b>mixed</b> picks for every sleeve. <b>W</b> steps.');
  addSlider(sec, 'Plate thickness', 'finThick', 0.25, 3, 0.25);
  addSlider(sec, 'Between two plates', 'finGap', 0, 4, 0.25);
  addSlider(sec, 'Plate depth', 'finDepth', 0.25, 6, 0.25, 'How far the plates stand off the floor.');
  addSlider(sec, 'Sleeve covers (%)', 'finCover', 5, 100, 1, 'Of the floor\'s length.');
  addSlider(sec, 'Sleeves step aside (%)', 'finJog', 0, 100, 1,
    'Half way along, the rest of the plates moved over — a sleeve with a step in it.');

  sec = addSection(root, 'Machinery');
  addSlider(sec, 'Cells with a cabinet (%)', 'machineFill', 0, 100, 1);
  addSlider(sec, 'Cell size', 'machineSize', 1, 30, 0.25);
  addSlider(sec, 'Stacked levels', 'machineLevels', 0, 4, 1, 'How many times smaller cabinets are stacked on tops.');
  addSlider(sec, 'Set back up to', 'machineInset', 0, 4, 0.25, 'From the edges of its cell — the gaps between cabinets.');
  addSlider(sec, 'Bits on the tops (%)', 'greebles', 0, 100, 1);
  addSlider(sec, 'Panels (%)', 'panels', 0, 100, 1, 'Shallow panels standing out of the sides.');
  addSlider(sec, 'Vents (%)', 'vents', 0, 100, 1, 'Rows of slats on the sides.');

  sec = addSection(root, 'Pipes and the rest');
  addSlider(sec, 'Pipe runs a floor', 'pipes', 0, 12, 1,
    'Each in one upright plane — along a face, just outside it, or through the middle.');
  addSlider(sec, 'Pipe size', 'pipeSize', 0.25, 4, 0.25);
  addSlider(sec, 'Pipes side by side up to', 'bundle', 1, 10, 1);
  addSlider(sec, 'Flanges (%)', 'flanges', 0, 100, 1);
  addSlider(sec, 'Risers', 'risers', 0, 20, 1, 'Pipes up the outside of the tower, past a few floors.');
  addSlider(sec, 'Ladders (%)', 'ladders', 0, 100, 1);
  addSlider(sec, 'Trays (%)', 'trays', 0, 100, 1, 'Shelves standing out of a face with things on them.');

  sec = addSection(root, 'Camera');
  addSelect(sec, 'Projection', 'projection', PROJECTIONS, resync,
    '<b>isometric</b> turns by quarters; <b>axonometric</b> any way; <b>military</b> — the plan ' +
    'true, heights upright. Drag on the sheet to turn it. <b>P</b> steps.');
  addSlider(sec, 'Turned (°)', 'azimuth', -180, 180, 0.5, '<b>Q</b> and <b>E</b> turn it.');
  addSlider(sec, 'Looking down (°)', 'elevation', -89, 89, 0.5);
  addSlider(sec, 'Heights (×)', 'heightScale', 0.1, 3, 0.01);
  addSlider(sec, 'Zoom (%)', 'zoom', MIN_ZOOM, MAX_ZOOM, 1,
    'The wheel zooms about the cursor; <b>shift</b>-drag moves the drawing; <b>0</b> puts it back. ' +
    'What leaves the picture is cut at the margin.');
  addSlider(sec, 'Moved across (mm)', 'panX', -500, 500, 0.5);
  addSlider(sec, 'Moved down (mm)', 'panY', -500, 500, 0.5);

  sec = addSection(root, 'Ink');
  addSelect(sec, 'Accent', 'accent', ACCENTS, resync,
    'What goes with the accent pen — red to start: the pipes, the fins, the frames, the racks, ' +
    'the small details, one floor, every other floor, or parts at random. <b>A</b> steps.');
  addSlider(sec, 'Parts in the accent (%)', 'accentShare', 0, 100, 1);
  addSlider(sec, 'Small parts under (mm)', 'smallBelow', 0, 30, 0.5,
    'Elements smaller than this on the paper go with the fine pen. 0 — none.', resync);
  addSelect(sec, 'Faces to the left', 'shadeLeft', SHADES, resync, '<b>J</b> steps.');
  addSelect(sec, 'Faces to the right', 'shadeRight', SHADES, resync, '<b>H</b> steps.');
  addSelect(sec, 'Faces on top', 'shadeTop', SHADES, resync,
    'Hatched <b>sparse</b>, <b>hatch</b>, <b>dense</b>, <b>cross</b>-hatched, or filled ' +
    '<b>solid</b> — half a nib inside the face, passes 85 % of the nib apart. <b>K</b> steps.');
  addSlider(sec, 'Hatching apart (mm)', 'shadeGap', 0.3, 6, 0.05);
  addSelect(sec, 'Hatching runs', 'hatchDir', HATCH_DIRS);
  addSelect(sec, 'Shade', 'shadeWho', SHADE_WHO, update, 'Which parts get the shading.');
  addSlider(sec, 'Passes apart (% of the nib)', 'passes', 30, 200, 1,
    'In every solid face. 85 closes the paper; over 100 leaves a hair of it.');
  addSlider(sec, 'Pen kept down over (% of the nib)', 'penDown', 0, 300, 5,
    'A hop to the next stroke shorter than this is drawn, not lifted over.');

  sec = addSection(root, 'Pens');
  addNote(sec, 'Five pens of the drawer — black and red rapidographs, 0.25, 0.35, 0.5 and 1.0 mm. ' +
    'Each layer picks one by number; changing the kind sets its colour and nib.');
  addPenSelect(sec, 'Edges', 'edgePen');
  addPenSelect(sec, 'Small parts', 'finePen');
  addPenSelect(sec, 'Accent', 'accentPen');
  addPenSelect(sec, 'Hatching', 'hatchPen');
  addPenSelect(sec, 'Solid faces', 'solidPen');
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
  addCheckbox(sec, 'Show the margin, the floors and the cut guides', 'showGuides', () => { drawPreview(); syncUrl(); });
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
    '<div><kbd>drag</kbd> turn · <kbd>shift</kbd>+<kbd>drag</kbd> move · <kbd>wheel</kbd> zoom · <kbd>0</kbd> back</div>' +
    '<div><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> move by 1 mm, with <kbd>shift</kbd> 10 · <kbd>+</kbd><kbd>−</kbd> zoom</div>' +
    '<div><kbd>S</kbd> scene · <kbd>P</kbd> projection · <kbd>Q</kbd><kbd>E</kbd> turn · <kbd>F</kbd> floors · <kbd>T</kbd> towers · <kbd>O</kbd> turn every other</div>' +
    '<div><kbd>W</kbd> fins · <kbd>A</kbd> accent · <kbd>J</kbd> <kbd>H</kbd> <kbd>K</kbd> shade left, right, top</div>' +
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
    statsDiv.html('<div class="warn">Nothing is drawn — zoom out, or move the drawing back.</div>');
    refreshPenList();
    return;
  }
  const seconds = plan.downs * PEN_CYCLE_S + plan.ink / DRAW_SPEED + plan.travel / TRAVEL_SPEED;
  const kinds = Object.entries(WORLD.kinds).map(([k, n]) => `${n} ${k}`).join(', ');
  let html =
    `<div class="big"><b>${groupNum(strokes)}</b> strokes, ` +
    `<b>${(plan.ink / 1000).toFixed(1)}</b> m of line</div>` +
    `<div>${groupNum(COUNTS.floors)} floors — ${kinds}</div>` +
    `<div>${groupNum(COUNTS.boxes)} boxes in ${groupNum(COUNTS.groups)} parts · a unit is ` +
    `${COUNTS.unit.toFixed(2)} mm</div>` +
    `<div>The pen goes down <b>${groupNum(plan.downs)}</b> times, ` +
    `${(plan.travel / 1000).toFixed(1)} m in the air</div>` +
    `<div>Roughly <b>${formatDuration(seconds)}</b> to plot · ${lastMs.toFixed(0)} ms to draw` +
    `${buildMs ? `, ${buildMs.toFixed(0)} ms to build` : ''}</div>`;
  if (s.cropMarks && perLayer && perLayer[LI.guides].strokes) {
    html += `<div>${perLayer[LI.guides].strokes} cut guide dots round the ${s.cropMarkAt}, ` +
      `in pen ${GUIDE_PEN + 1}</div>`;
  }
  if (WORLD.capped) {
    html += `<div class="warn">The structure stopped at ${groupNum(MAX_BOXES)} boxes — fewer floors, ` +
      'bigger cells or fewer plates.</div>';
  }
  const pitchMm = (Math.max(0.25, q(s.finThick)) + Math.max(0, q(s.finGap))) * COUNTS.unit;
  const finNib = penW(layerPen(s.accent === 'fins' ? LI.accent : LI.edges));
  if (WORLD.kinds.ribbed && q(s.finGap) * COUNTS.unit < finNib * 1.2) {
    html += `<div class="warn">The gap between two plates is ${(q(s.finGap) * COUNTS.unit).toFixed(2)} mm ` +
      `on the paper — the ${finNib} mm nib will close it up.</div>`;
  } else if (WORLD.kinds.ribbed && pitchMm < 3 * finNib) {
    html += `<div class="warn">Plates ${pitchMm.toFixed(2)} mm apart — close for a ${finNib} mm nib.</div>`;
  }
  const hatchNib = penW(layerPen(LI.hatch));
  if ([s.shadeLeft, s.shadeRight, s.shadeTop].some(t => t === 'dense' || t === 'cross') &&
      s.shadeGap * 0.5 < hatchNib * 1.2) {
    html += `<div class="warn">Dense hatching ${(s.shadeGap * 0.5).toFixed(2)} mm apart runs into one ` +
      `black with a ${hatchNib} mm nib.</div>`;
  }
  if (s.passes > 100) {
    html += '<div class="warn">Passes over 100 % of the nib leave a hair of paper in every solid face.</div>';
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
  const [az, el] = viewAngles();
  return `module towers — ${s.towers > 1 ? `${s.towers} towers ` : ''}${s.floors} floors ` +
    `${s.width}x${s.depth}x${s.floorHeight} gap=${s.gap} ` +
    `kinds=${[s.wMachinery, s.wRacks, s.wRibbed, s.wFrame, s.wDeck, s.wPipework].join('/')} ` +
    `${s.projection} az=${+az.toFixed(1)}${s.projection === 'axonometric' ? ` el=${el}` : ''} ` +
    `accent=${s.accent} shade=${s.shadeLeft}/${s.shadeRight}/${s.shadeTop} ` +
    `${s.cropMarks ? `cutguides=${s.cropMarkAt}<=${s.cropMarkGap}mm ` : ''}seed=${s.seed} ` +
    `pens=[${pens.join('; ')}] strokes=${strokes}`;
}

function fileStem() {
  const s = settings;
  const paper = s.paper === 'custom' ? `${s.customW}x${s.customH}mm` : `${s.paper}-${s.orientation}`;
  return `module towers ${s.floors}f seed${s.seed} ${paper}`;
}

////////////////////////////////////////////////////////////////////////////////////////
// Controls, shared
//
// A section folds away under its heading; which ones are folded is remembered by the
// browser, not by the link.

function foldedSet() {
  try { return new Set(JSON.parse(localStorage.getItem('p5js25-folded') || '[]')); }
  catch (e) { return new Set(); }
}

function saveFolded(set) {
  try { localStorage.setItem('p5js25-folded', JSON.stringify([...set])); } catch (e) { /* no storage */ }
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

// A scene is the whole picture, but not how the sheet is to be cut out or put out, nor
// the pens in the drawer: those stay as they are.
const SCENE_KEEPS = ['cropMarks', 'cropMarkAt', 'cropMarkGap', 'optimiseOrder', 'liveUpdate',
  'showGuides', 'pngDpi', 'paper', 'customW', 'customH', 'paperTone', 'paperColor'];
for (let i = 1; i <= SLOTS; i++) SCENE_KEEPS.push(`pen${i}Kind`, `pen${i}W`, `pen${i}Col`);

function applyScene(sc) {
  const kept = {};
  for (const k of SCENE_KEEPS) kept[k] = settings[k];
  Object.assign(settings, DEFAULTS, kept, sc.s || {});
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
