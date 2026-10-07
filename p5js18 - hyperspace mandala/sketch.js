////////////////////////////////////////////////////////////////////////////////////////
// Hyperspace mandala — psychedelic patterns held in the exact symmetry of a mandala:
// rings of motifs round a fractal heart, bent by a trip, bursting out to the edges
//
// A mandala is a circle of rings, each ring a band of one motif repeated round it so many
// times — petals, eyes, jewels, scales, mazes, spiral lattices, waves — and a heart in the
// middle. Every ring here is cut into cells of an n-fold symmetry and its motif is drawn
// once, in a cell of its own coordinates, and laid round the circle cell by cell. The
// cells are conformal: a cell's across is its angle and its height the logarithm of its
// radius, so a circle drawn in one stays round on the paper and every motif grows as it
// moves out, the way the petals of a chrysanthemum or the tiles of a hyperbolic plane do.
// It is what makes a pattern of identical motifs read as an explosion.
//
// The heart is a fractal or a figure of sacred geometry: the spiral florets of the DMT
// chrysanthemum; a hyperbolic tiling of the Poincaré disk, the hyperspace dome; a Julia
// set of z^d + c, whose d-fold symmetry matches the mandala's; an Apollonian gasket; the
// mandala itself again inside itself, turned a little each time, a tunnel; string art of
// a times table round a circle; nested star polygons; the seed of life.
//
// Then the trip: the whole drawing is pushed through a warp before it reaches the paper —
// a vortex that twists the middle, a swirl that grows outward, a breathing of the radius
// in lobes of the symmetry, ripples running out, a bulge, and a melting by noise that is
// itself folded into the symmetry, so the mandala melts and stays a mandala. Every line is
// walked through the warp by halving until its middle lies on its chord.
//
// Round it all an aura of echoes, and behind it a background that bursts out to the edges
// of the sheet: rays, ripples, two systems of ripples making a moiré, a tunnel of spirals,
// op-art lines bent round the middle, or bands of any ring motif growing outward.
//
// Two technical pens, black and red, share the fine work by ring, or by outline and
// detail; three ink markers, 3 to 15 mm, draw broad bands, bindus and rays under it. On
// black paper the white and silver markers draw it all, larger.
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};
const PAPERS = Object.keys(PAPER_SIZES).concat('custom');

const PAPER_TONES = {
  'white': '#fbfaf5', 'cream': '#f1e8d6', 'grey': '#8e9196', 'kraft': '#b6966e',
  'navy': '#1d2433', 'black': '#151517',
};
const TONES = Object.keys(PAPER_TONES).concat('custom');

// The drawer: two technical pens and three ink markers. Each of the five pens on the
// sheet is one of these at a width of its own.
const PEN_KINDS = {
  'black':         { col: '#1b1b1b', w: 0.35, broad: false },
  'red':           { col: '#c8261d', w: 0.35, broad: false },
  'red marker':    { col: '#d9342a', w: 8,    broad: true },
  'silver marker': { col: '#adb1b7', w: 5,    broad: true },
  'white marker':  { col: '#f7f6f1', w: 3,    broad: true },
  'other':         { col: '#2a5bd7', w: 0.5,  broad: false },
};
const KINDS = Object.keys(PEN_KINDS);
const SLOTS = 5;

// The motifs a ring can be laid with: the setting that weighs how often one comes up when
// a ring is left to chance, and the shape of cell it likes, across over up.
const MOTIFS = {
  petals:     { w: 'mwPetals',     a: 0.75 },
  arches:     { w: 'mwArches',     a: 1.0 },
  zigzag:     { w: 'mwZigzag',     a: 1.2 },
  sierpinski: { w: 'mwSierpinski', a: 0.95 },
  beads:      { w: 'mwBeads',      a: 1.0 },
  interlace:  { w: 'mwInterlace',  a: 1.0 },
  lattice:    { w: 'mwLattice',    a: 1.0 },
  pinwheel:   { w: 'mwPinwheel',   a: 0.6 },
  florets:    { w: 'mwFlorets',    a: 1.0 },
  rays:       { w: 'mwRays',       a: 0.6 },
  waves:      { w: 'mwWaves',      a: 1.5 },
  guilloche:  { w: 'mwGuilloche',  a: 2.0 },
  kene:       { w: 'mwKene',       a: 1.0 },
  eyes:       { w: 'mwEyes',       a: 1.6 },
  scales:     { w: 'mwScales',     a: 0.9 },
  jewels:     { w: 'mwJewels',     a: 1.0 },
  koch:       { w: 'mwKoch',       a: 2.0 },
  tree:       { w: 'mwTree',       a: 0.8 },
  checker:    { w: 'mwChecker',    a: 1.0 },
  vines:      { w: 'mwVines',      a: 0.8 },
  lines:      { w: 'mwLines',      a: 3.0 },
};
const MOTIF_NAMES = Object.keys(MOTIFS);
const RING_CHOICES = ['auto'].concat(MOTIF_NAMES);
const MAX_RINGS = 12;

const CENTRES    = ['chrysanthemum', 'hyperbolic', 'julia', 'apollonian', 'droste', 'string',
                    'stars', 'seed of life', 'bindu', 'none'];
const SPACINGS   = ['growing', 'even', 'random'];
const CELLINGS   = ['fit', 'same', 'doubling'];
const BORDERS    = ['mixed', 'line', 'double', 'beads', 'dots', 'teeth', 'none'];
const CHRYS      = ['petals', 'seeds', 'spikes'];
const HYP_DECOR  = ['stars', 'inner', 'circles', 'alternate', 'none'];
const BACKGROUNDS = ['motif', 'rays', 'ripples', 'interference', 'tunnel', 'op-art', 'none'];
const BANDS      = ['none', 'borders', 'alternate rings', 'outer ring', 'centre'];
const BINDUS     = ['none', 'centre', 'ring', 'every ring'];
const RING_COLOURS = ['outline and detail', 'alternate rings', 'one', 'random rings', 'outer half'];
const CENTRE_COLOURS = ['outline and detail', 'one'];
const UNDERLAYS  = ['broad first', 'fine first', 'by pen number'];

// What goes on the sheet, one layer at a time, each with a pen of its own and a file of
// its own. The first five are drawn finely, the last three with a broad marker.
const LAYERS = [
  { id: 'centre',     label: 'centre',      pen: 'centrePen' },
  { id: 'rings',      label: 'rings',       pen: 'ringsPen' },
  { id: 'borders',    label: 'borders',     pen: 'bordersPen' },
  { id: 'aura',       label: 'aura',        pen: 'auraPen' },
  { id: 'background', label: 'background',  pen: 'backgroundPen' },
  { id: 'bands',      label: 'marker bands', pen: 'bandsPen' },
  { id: 'bindus',     label: 'bindus',      pen: 'bindusPen' },
  { id: 'mrays',      label: 'marker rays', pen: 'mraysPen' },
];
const L_CENTRE = 0, L_RINGS = 1, L_BORDERS = 2, L_AURA = 3, L_BACK = 4, L_BANDS = 5,
      L_BINDUS = 6, L_MRAYS = 7;

const MAX_STROKES   = 400_000;   // past this nothing is ordered, drawn or exported
const BUSY_STROKES  = 40_000;    // above this, warn about the plot time
const EPS           = 0.01;      // mm — the stub that stands in for a single dab
const SAG           = 0.03;      // mm — how far a walked line may stray from its chord
const SEG_MAX       = 3;         // mm — the longest chord trusted without a look between
const MAX_DEPTH     = 14;        // halvings of one piece of a walked line
const PREVIEW_MAX_PX = 1500;
const PEN_CYCLE_S   = 0.3;
const DRAW_SPEED    = 60;
const TRAVEL_SPEED  = 150;
const GOLDEN_ANGLE  = Math.PI * (3 - Math.sqrt(5));

const settings = {
  // paper
  paper: 'A3',
  orientation: 'portrait',
  customW: 600,         // mm, when the size is custom
  customH: 600,
  margin: 12,
  paperTone: 'white',
  paperColor: '#fbfaf5',   // the preview only — the files have no background

  // the drawer — five pens, each a kind at a width
  pen1Kind: 'black',         pen1W: 0.35, pen1Col: '#1b1b1b',
  pen2Kind: 'red',           pen2W: 0.35, pen2Col: '#c8261d',
  pen3Kind: 'silver marker', pen3W: 5,    pen3Col: '#adb1b7',
  pen4Kind: 'red marker',    pen4W: 8,    pen4Col: '#d9342a',
  pen5Kind: 'white marker',  pen5W: 3,    pen5Col: '#f7f6f1',
  fillPass: 85,         // % of the nib between two passes of a fill
  underlay: 'broad first',

  // which pen draws what
  centrePen: 1, ringsPen: 1, bordersPen: 1, auraPen: 2, backgroundPen: 1,
  accentPen: 2,         // the second fine pen, for detail or every other ring
  ringColour: 'outline and detail',
  centreColour: 'outline and detail',
  bandsPen: 3, bindusPen: 4, mraysPen: 3,

  // the mandala
  seed: 1,
  symmetry: 12,
  centreX: 50,          // % of the sheet
  centreY: 50,
  size: 94,             // % of the room inside the margin
  rotation: 0,          // °
  rings: 8,
  ringSpacing: 'growing',
  cells: 'fit',
  centreSize: 30,       // % of the radius
  detail: 4,            // nested lines, rows, levels — at the most
  minGap: 0.7,          // mm — the closest two lines of a motif may come
  borders: 'mixed',
  stagger: true,        // every other ring turned half a cell
  ring1: 'petals', ring2: 'florets', ring3: 'eyes', ring4: 'jewels', ring5: 'lattice',
  ring6: 'petals', ring7: 'sierpinski', ring8: 'rays', ring9: 'auto', ring10: 'auto',
  ring11: 'auto', ring12: 'auto',
  mwPetals: 30, mwArches: 12, mwZigzag: 10, mwSierpinski: 10, mwBeads: 12, mwInterlace: 12,
  mwLattice: 14, mwPinwheel: 8, mwFlorets: 18, mwRays: 12, mwWaves: 10, mwGuilloche: 8,
  mwKene: 8, mwEyes: 16, mwScales: 10, mwJewels: 16, mwKoch: 8, mwTree: 6, mwChecker: 6,
  mwVines: 6, mwLines: 6,

  // the heart
  centre: 'chrysanthemum',
  centreDetail: 3,
  chrysCount: 320,
  chrysShape: 'petals',
  hypP: 7,
  hypQ: 3,
  hypDecor: 'stars',
  juliaPower: 6,
  juliaAngle: 140,      // ° — where c sits on its circle
  juliaRadius: 72,      // % — how far out c sits
  juliaZoom: 1.45,
  juliaLevels: 14,
  stringMult: 2,
  stringPoints: 144,
  drosteTwist: 14,      // ° a level

  // the trip
  twist: 60,            // ° — the vortex in the middle
  twistReach: 60,       // % of the radius
  swirl: 0,             // ° — a turn growing outward, at the rim
  breathe: 2.5,         // % of the radius
  breatheLobes: 1,      // × the symmetry
  ripple: 0,            // % of the radius
  rippleFreq: 7,        // ripples across the radius
  bulge: 100,           // % — the radius raised to this power: under 100 swells the middle
  melt: 1.2,            // % of the radius
  meltScale: 3,
  warpBackground: true,

  // the aura
  aura: 4,
  auraGap: 3.5,         // mm
  auraWave: 3,          // %
  auraLobes: 1,         // × the symmetry

  // the background
  background: 'motif',
  bgMotif: 'florets',
  bgMult: 3,            // × the symmetry, cells or rays round it
  bgSpacing: 2.5,       // mm between ripples or lines
  bgGap: 4,             // mm between the aura and the background

  // broad strokes — markers
  bands: 'none',
  bindus: 'none',
  bindusRing: 8,
  bindusSize: 0,        // mm — 0 is one dab of the nib
  mrays: 0,             // × the symmetry

  // output
  optimiseOrder: true,
  liveUpdate: true,
  showGuides: false,
  pngDpi: 200,
};

const DEFAULTS = { ...settings };

// Trips worth starting from. Each one is the whole state.
const SCENES = [
  { label: '— select a trip —' },
  { label: 'DMT — the chrysanthemum', s: {} },
  { label: 'DMT — hyperspace dome', s: {
      centre: 'hyperbolic', centreSize: 52, hypP: 7, hypQ: 3, hypDecor: 'stars', rings: 6,
      ring1: 'eyes', ring2: 'jewels', ring3: 'lattice', ring4: 'petals', ring5: 'florets',
      ring6: 'rays', twist: 20, background: 'tunnel', bgMult: 4, aura: 3, symmetry: 14 } },
  { label: 'DMT — machine elves\' jewel lattice', s: {
      centre: 'stars', centreSize: 22, symmetry: 16, rings: 10, ring1: 'jewels',
      ring2: 'sierpinski', ring3: 'interlace', ring4: 'eyes', ring5: 'koch', ring6: 'jewels',
      ring7: 'checker', ring8: 'florets', ring9: 'beads', ring10: 'sierpinski', twist: 50,
      swirl: 25, background: 'motif', bgMotif: 'jewels', bgMult: 4, centreDetail: 5 } },
  { label: 'DMT — breakthrough tunnel', s: {
      centre: 'droste', centreSize: 46, drosteTwist: 22, rings: 5, ring1: 'florets',
      ring2: 'rays', ring3: 'lattice', ring4: 'eyes', ring5: 'petals', twist: 70,
      twistReach: 90, swirl: 40, background: 'tunnel', bgMult: 3, aura: 2 } },
  { label: 'DMT — the waiting room', s: {
      centre: 'hyperbolic', centreSize: 34, hypP: 5, hypQ: 4, hypDecor: 'alternate',
      symmetry: 10, rings: 7, ring1: 'eyes', ring2: 'scales', ring3: 'jewels',
      ring4: 'petals', ring5: 'eyes', ring6: 'lattice', ring7: 'florets', breathe: 3,
      twist: 30, background: 'motif', bgMotif: 'eyes', bgMult: 2 } },
  { label: 'Ayahuasca — serpent kené', s: {
      symmetry: 8, centre: 'stars', centreSize: 20, rings: 7, ring1: 'kene', ring2: 'scales',
      ring3: 'vines', ring4: 'kene', ring5: 'eyes', ring6: 'kene', ring7: 'scales',
      twist: 0, melt: 2, background: 'motif', bgMotif: 'kene', bgMult: 2, detail: 5,
      ringColour: 'outline and detail', aura: 2 } },
  { label: 'Ayahuasca — vine and the serpent\'s eye', s: {
      symmetry: 6, centre: 'julia', juliaPower: 6, centreSize: 28, rings: 6, ring1: 'vines',
      ring2: 'scales', ring3: 'kene', ring4: 'eyes', ring5: 'vines', ring6: 'scales',
      twist: 15, melt: 3, meltScale: 2, background: 'motif', bgMotif: 'scales', bgMult: 3 } },
  { label: 'LSD — melting fractal', s: {
      centre: 'julia', juliaPower: 6, symmetry: 12, centreSize: 34, rings: 7, ring1: 'waves',
      ring2: 'petals', ring3: 'pinwheel', ring4: 'koch', ring5: 'guilloche', ring6: 'petals',
      ring7: 'lattice', twist: 25, breathe: 5, melt: 5, meltScale: 3, ripple: 1.2,
      background: 'interference', aura: 6, auraWave: 6 } },
  { label: 'LSD — breathing paisley', s: {
      centre: 'string', stringMult: 3, symmetry: 9, rings: 8, ring1: 'petals', ring2: 'waves',
      ring3: 'scales', ring4: 'pinwheel', ring5: 'beads', ring6: 'petals', ring7: 'zigzag',
      ring8: 'arches', breathe: 7, breatheLobes: 1, swirl: 35, twist: 0, melt: 3,
      background: 'op-art', bgSpacing: 2.2, aura: 5 } },
  { label: 'MDMA — warm pulse', s: {
      centre: 'string', stringMult: 2, stringPoints: 180, symmetry: 12, rings: 7,
      ring1: 'guilloche', ring2: 'beads', ring3: 'waves', ring4: 'arches', ring5: 'guilloche',
      ring6: 'interlace', ring7: 'lines', twist: 0, ripple: 0.8, rippleFreq: 9,
      background: 'ripples', bgSpacing: 3, aura: 8, auraWave: 4,
      ringColour: 'alternate rings' } },
  { label: 'Apollonian rose', s: {
      centre: 'apollonian', centreSize: 40, symmetry: 12, rings: 6, ring1: 'petals',
      ring2: 'beads', ring3: 'petals', ring4: 'arches', ring5: 'petals', ring6: 'rays',
      twist: 10, background: 'rays', bgMult: 6 } },
  { label: 'Sacred geometry, sober', s: {
      centre: 'seed of life', symmetry: 12, rings: 7, ring1: 'interlace', ring2: 'sierpinski',
      ring3: 'arches', ring4: 'beads', ring5: 'zigzag', ring6: 'petals', ring7: 'lines',
      twist: 0, background: 'none', aura: 2, auraWave: 0, ringColour: 'one',
      centreColour: 'one' } },
  { label: 'Op-art vortex', s: {
      centre: 'bindu', centreSize: 12, size: 60, rings: 5, ring1: 'checker', ring2: 'lattice',
      ring3: 'zigzag', ring4: 'checker', ring5: 'rays', twist: 120, twistReach: 160,
      background: 'op-art', bgSpacing: 1.6, aura: 0 } },
  { label: 'Silver bands, red bindus', s: {
      bands: 'alternate rings', bindus: 'ring', bindusRing: 6, pen3W: 4, pen4W: 6,
      ringColour: 'one' } },
  { label: 'Black paper: white marker, large', s: {
      paper: 'B1', paperTone: 'black', paperColor: PAPER_TONES.black, symmetry: 10, rings: 6,
      pen1Kind: 'white marker', pen1W: 3, pen1Col: PEN_KINDS['white marker'].col,
      pen2Kind: 'red marker', pen2W: 3, pen2Col: PEN_KINDS['red marker'].col,
      ring1: 'petals', ring2: 'eyes', ring3: 'jewels', ring4: 'florets', ring5: 'petals',
      ring6: 'rays', chrysCount: 110, bgMult: 2, auraGap: 9, bgGap: 10, bgSpacing: 8,
      minGap: 6, aura: 3 } },
  { label: 'Black paper: silver and red bands', s: {
      paper: 'B2', paperTone: 'black', paperColor: PAPER_TONES.black, symmetry: 8, rings: 6,
      pen1Kind: 'white marker', pen1W: 3, pen1Col: PEN_KINDS['white marker'].col,
      pen2Kind: 'red marker', pen2W: 3, pen2Col: PEN_KINDS['red marker'].col,
      pen3W: 6, pen4W: 15, bands: 'alternate rings', bindus: 'ring', bindusRing: 6,
      ring1: 'petals', ring2: 'beads', ring3: 'eyes', ring4: 'arches', ring5: 'petals',
      ring6: 'rays', centre: 'stars', centreSize: 24, background: 'rays', bgMult: 4,
      auraGap: 8, bgGap: 8, minGap: 6, aura: 2 } },
];

const setters   = {};
const fieldDivs = {};
let statsDiv, linkDiv, penListDiv, layerButtons = {}, penSelects = [], slotSwatches = [];

let shapes  = null;          // { pts, off, ink, lay } — polylines in mm
let strokes = 0;
let plan    = null;          // { order, flip, ink, travel }
let perPen  = null;          // per pen: { strokes, ink }
let perLayer = null;         // per layer: { strokes, ink, pens }
let counts  = null;
let lastMs  = 0;
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

function wrapAngle(a) {
  a = (a + Math.PI) % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  return a - Math.PI;
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

// WCAG's contrast between two colours, 1 to 21.
function contrast(a, b) {
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
function penKind(i) { return settings[`pen${i + 1}Kind`] || 'black'; }
function penIdx(v) { return clamp(Math.round(Number(v) || 1), 1, SLOTS) - 1; }
function layerPen(li) { return penIdx(settings[LAYERS[li].pen]); }

function penLabel(i) {
  const w = penW(i);
  return `${i + 1} · ${penKind(i)} ${w < 1 ? w.toFixed(2) : +w.toFixed(1)} mm`;
}

// The round nib reaches half its width past the end of every line, so each pen draws
// inside the sheet less the margin less half its own width.
function penArea(i) {
  const [W, H] = paperDims();
  const m = settings.margin + penW(i) / 2;
  return { x0: m, y0: m, x1: W - m, y1: H - m, w: W - 2 * m, h: H - 2 * m };
}

// The order the passes go down in: markers under the fine lines, or over them.
function penOrder() {
  const ids = [0, 1, 2, 3, 4];
  if (settings.underlay === 'broad first') ids.sort((a, b) => penW(b) - penW(a) || a - b);
  else if (settings.underlay === 'fine first') ids.sort((a, b) => penW(a) - penW(b) || a - b);
  return ids;
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
  shapes = plan = perPen = perLayer = counts = null;

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

// Called while a slider or the mandala is being dragged, once a frame at the most.
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
// Improved Perlin, seeded. It melts the mandala.

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

let NZ = null, nzSeedNow = null;

function ensureNoise() {
  const seed = settings.seed | 0;
  if (seed === nzSeedNow) return;
  nzSeedNow = seed;
  NZ = makePerlin3(seed * 7919 + 17);
}

////////////////////////////////////////////////////////////////////////////////////////
// The frame and the trip
//
// Everything is laid out on the unit disk — the mandala's rim at radius 1 — then pushed
// through the warp, then turned, scaled and set on the sheet. The warp works on radius
// and angle. Melting reads its noise at the point folded into half a sector of the
// symmetry, so it is mirrored and repeated exactly as the mandala is; breathing has lobes
// in multiples of the symmetry; the vortex and the swirl only turn. So no warp ever
// breaks the symmetry it is laid over.

let FRAME = { cx: 0, cy: 0, R: 1, c: 1, s: 0 };
let FAR = 2;                 // the farthest corner of the sheet, in radii
let WARP = { on: false };
let NOWARP = false;          // set while the background is drawn unwarped
let WX = 0, WY = 0, MX = 0, MY = 0, DX = 0, DY = 0;

function sym() { return clamp(Math.round(settings.symmetry), 2, 64); }

function makeFrame() {
  const s = settings, [W, H] = paperDims();
  const room = Math.min(W, H) / 2 - s.margin;
  const R = Math.max(5, room * clamp(s.size, 5, 400) / 100);
  const th = rad(s.rotation) - Math.PI / 2;
  FRAME = { cx: W * s.centreX / 100, cy: H * s.centreY / 100, R, c: Math.cos(th), s: Math.sin(th) };
  FAR = 0;
  for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    FAR = Math.max(FAR, Math.hypot(x - FRAME.cx, y - FRAME.cy) / R);
  }
  FAR *= 1.04;
}

function makeWarp() {
  const s = settings, n = sym();
  WARP = {
    twist: rad(s.twist), reach: Math.max(0.02, s.twistReach / 100),
    swirl: rad(s.swirl),
    breathe: s.breathe / 100, lobes: n * Math.max(1, Math.round(s.breatheLobes)),
    ripple: s.ripple / 100, rf: s.rippleFreq,
    gamma: Math.max(0.2, s.bulge / 100),
    melt: s.melt / 100, ms: Math.max(0.1, s.meltScale), sector: 2 * Math.PI / n,
  };
  WARP.on = !!(WARP.twist || WARP.swirl || WARP.breathe || WARP.ripple || WARP.melt ||
               Math.abs(WARP.gamma - 1) > 1e-9);
}

function warpPt(X, Y) {
  if (!WARP.on || NOWARP) { WX = X; WY = Y; return; }
  let r = Math.hypot(X, Y);
  if (r < 1e-12) { WX = X; WY = Y; return; }
  let th = Math.atan2(Y, X);
  const near = Math.min(1, r * 4);           // the middle stays put
  if (WARP.melt) {
    const sec = WARP.sector;
    let a = th - Math.floor(th / sec) * sec;
    if (a > sec / 2) a = sec - a;
    const px = r * Math.cos(a) * WARP.ms, py = r * Math.sin(a) * WARP.ms;
    const n = (NZ(px, py, 0.5) + 0.5 * NZ(px * 2 + 17.3, py * 2 - 9.1, 1.5)) / 1.5;
    r += WARP.melt * 2.2 * n * near;
  }
  if (WARP.ripple) r += WARP.ripple * Math.sin(2 * Math.PI * r * WARP.rf) * near;
  if (WARP.breathe) r *= 1 + WARP.breathe * Math.cos(WARP.lobes * th) * Math.min(1, r * 2);
  if (r < 0) r = 0;
  if (WARP.gamma !== 1) r = Math.pow(r, WARP.gamma);
  if (WARP.twist) th += WARP.twist * Math.exp(-(r / WARP.reach) * (r / WARP.reach));
  if (WARP.swirl) th += WARP.swirl * r;
  WX = r * Math.cos(th); WY = r * Math.sin(th);
}

// A point of the unit disk on the sheet, in mm.
function diskMap(X, Y) {
  warpPt(X, Y);
  MX = FRAME.cx + FRAME.R * (WX * FRAME.c - WY * FRAME.s);
  MY = FRAME.cy + FRAME.R * (WX * FRAME.s + WY * FRAME.c);
}

// A cell of a ring, in its own conformal coordinates: x is angle, y the logarithm of the
// radius over the ring's inner radius. A small circle drawn there stays a circle.
let CELL = { rin: 1, t0: 0 };

function cellToDisk(x, y) {
  const r = CELL.rin * Math.exp(y), a = CELL.t0 + x;
  DX = r * Math.cos(a); DY = r * Math.sin(a);
}

function cellMap(x, y) {
  cellToDisk(x, y);
  diskMap(DX, DY);
}

////////////////////////////////////////////////////////////////////////////////////////
// The sink
//
// Everything is drawn into one sink as polylines in millimetres, each tagged with the pen
// and the layer it belongs to, clipped to that pen's own drawable box as it goes in.

let SINK = null;
let PEN = 0, LAY = 0, PW = 0.35;
let AREAS = [];

function makeSink() {
  return { pts: [], off: [0], ink: [], lay: [] };
}

function setPen(i) { PEN = i; PW = penW(i); }

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

function pushRun(xs, ys) {
  const S = SINK, n = xs.length;
  if (n < 2) return;
  for (let i = 0; i < n; i++) S.pts.push(xs[i], ys[i]);
  S.off.push(S.pts.length / 2);
  S.ink.push(PEN);
  S.lay.push(LAY);
}

function emit(xs, ys) {
  const n = xs.length;
  if (n < 2 || SINK.ink.length > MAX_STROKES) return;
  const A = AREAS[PEN];
  if (A.w <= 0 || A.h <= 0) return;
  let allIn = true;
  for (let i = 0; i < n; i++) {
    if (xs[i] < A.x0 || xs[i] > A.x1 || ys[i] < A.y0 || ys[i] > A.y1) { allIn = false; break; }
  }
  if (allIn) { pushRun(xs, ys); return; }
  let rx = null, ry = null;
  const flush = () => { if (rx && rx.length >= 2) pushRun(rx, ry); rx = ry = null; };
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

function emitDab(x, y) { emit([x, x + EPS], [y, y]); }

////////////////////////////////////////////////////////////////////////////////////////
// The walk
//
// A polyline in some frame's coordinates — a cell's, or the disk's — is carried onto the
// paper through that frame's map. Each piece is halved until the middle of it, carried
// over, lies within SAG of the chord between its carried ends and the chord is no longer
// than SEG_MAX, so a straight line in a cell comes out as the spiral it is on the paper,
// and the warp bends everything as smoothly as it bends.

let RX = [], RY = [];
let SAG2 = SAG * SAG, SEG2 = SEG_MAX * SEG_MAX;
let WALKED = 0;

function walkSeg(map, ax, ay, px, py, bx, by, qx, qy, d) {
  if (d < MAX_DEPTH) {
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    map(mx, my);
    const sx = MX, sy = MY;
    const cx = (px + qx) / 2, cy = (py + qy) / 2;
    const dev = (sx - cx) * (sx - cx) + (sy - cy) * (sy - cy);
    const len = (qx - px) * (qx - px) + (qy - py) * (qy - py);
    if (dev > SAG2 || len > SEG2) {
      walkSeg(map, ax, ay, px, py, mx, my, sx, sy, d + 1);
      walkSeg(map, mx, my, sx, sy, bx, by, qx, qy, d + 1);
      return;
    }
  }
  RX.push(qx); RY.push(qy);
}

// p is a flat array [x0, y0, x1, y1, …] in the coordinates `map` reads.
function walk(p, map) {
  const n = p.length >> 1;
  if (n < 2) return;
  RX = []; RY = [];
  map(p[0], p[1]);
  let px = MX, py = MY;
  RX.push(px); RY.push(py);
  for (let i = 1; i < n; i++) {
    map(p[2 * i], p[2 * i + 1]);
    const qx = MX, qy = MY;
    walkSeg(map, p[2 * i - 2], p[2 * i - 1], px, py, p[2 * i], p[2 * i + 1], qx, qy, 0);
    px = qx; py = qy;
  }
  WALKED += RX.length;
  emit(RX, RY);
}

////////////////////////////////////////////////////////////////////////////////////////
// Shapes in any frame

function circlePts(cx, cy, r, n) {
  const p = [];
  for (let i = 0; i <= n; i++) {
    const a = 2 * Math.PI * i / n;
    p.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  return p;
}

function arcPts(cx, cy, r, a0, a1, n) {
  const p = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n;
    p.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  return p;
}

// A circular arc from A to B standing b of the chord off it at its middle, to the left
// of A→B when b is positive.
function bowPts(ax, ay, bx, by, b, n) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
  if (Math.abs(b) < 1e-4 || d < 1e-12) return [ax, ay, bx, by];
  const h = b * d, nx = -dy / d, ny = dx / d;
  const R = (d * d / 4 + h * h) / (2 * Math.abs(h));
  const mx = (ax + bx) / 2, my = (ay + by) / 2, sg = Math.sign(h);
  const cx = mx - nx * sg * (R - Math.abs(h)), cy = my - ny * sg * (R - Math.abs(h));
  const a0 = Math.atan2(ay - cy, ax - cx), a1 = Math.atan2(by - cy, bx - cx);
  const aa = Math.atan2(my + ny * h - cy, mx + nx * h - cx);
  let d1 = wrapAngle(a1 - a0);
  const dm = wrapAngle(aa - a0);
  if (!(Math.sign(dm) === Math.sign(d1) && Math.abs(dm) < Math.abs(d1))) d1 -= Math.sign(d1) * 2 * Math.PI;
  return arcPts(cx, cy, R, a0, a0 + d1, n);
}

function ngonPts(cx, cy, R, k, a0) {
  const p = [];
  for (let j = 0; j <= k; j++) {
    const a = a0 + j * 2 * Math.PI / k;
    p.push(cx + R * Math.cos(a), cy + R * Math.sin(a));
  }
  return p;
}

function pointInPoly(x, y, poly) {
  let inside = false;
  const n = poly.length >> 1;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[2 * i], yi = poly[2 * i + 1], xj = poly[2 * j], yj = poly[2 * j + 1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// The pieces of a polyline that lie outside a set of shapes, each shape a test (x, y) →
// inside. The line is looked along every `step` and each crossing pinned down by
// bisection. It is how a petal hides the one behind it.
function clipOutside(p, inside, step) {
  const out = [];
  let cur = null;
  const n = p.length >> 1;
  const test = (x, y) => inside(x, y);
  const edge = (ax, ay, bx, by, inA) => {
    for (let k = 0; k < 16; k++) {
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      if (test(mx, my) === inA) { ax = mx; ay = my; } else { bx = mx; by = my; }
    }
    return inA ? [bx, by] : [ax, ay];
  };
  let px = p[0], py = p[1], pin = test(px, py);
  if (!pin) cur = [px, py];
  for (let i = 1; i < n; i++) {
    const qx = p[2 * i], qy = p[2 * i + 1];
    const m = Math.max(1, Math.ceil(Math.hypot(qx - px, qy - py) / step));
    let ax = px, ay = py;
    for (let k = 1; k <= m; k++) {
      const bx = px + (qx - px) * k / m, by = py + (qy - py) * k / m;
      const bin = test(bx, by);
      if (bin !== pin) {
        const [ex, ey] = edge(ax, ay, bx, by, pin);
        if (pin) cur = [ex, ey];
        else { cur.push(ex, ey); if (cur.length >= 4) out.push(cur); cur = null; }
        pin = bin;
      }
      if (!pin) cur.push(bx, by);
      ax = bx; ay = by;
    }
    px = qx; py = qy;
  }
  if (cur && cur.length >= 4) out.push(cur);
  return out;
}

// The same for a circle in disk coordinates, worked out exactly: the pieces of a polyline
// outside (keep > 0) or inside (keep < 0) the circle of radius R round the middle.
function clipCircle(p, R, keep) {
  const out = [];
  let cur = null;
  const n = p.length >> 1;
  const isIn = (x, y) => x * x + y * y < R * R;
  const want = (x, y) => keep > 0 ? !isIn(x, y) : isIn(x, y);
  for (let i = 0; i < n; i++) {
    const x = p[2 * i], y = p[2 * i + 1];
    if (i === 0) { if (want(x, y)) cur = [x, y]; continue; }
    const ax = p[2 * i - 2], ay = p[2 * i - 1];
    // where the segment crosses the circle
    const dx = x - ax, dy = y - ay;
    const A = dx * dx + dy * dy, B = 2 * (ax * dx + ay * dy), C = ax * ax + ay * ay - R * R;
    const disc = B * B - 4 * A * C;
    const ts = [];
    if (A > 0 && disc > 0) {
      const sq = Math.sqrt(disc);
      for (const t of [(-B - sq) / (2 * A), (-B + sq) / (2 * A)]) if (t > 0 && t < 1) ts.push(t);
    }
    for (const t of ts) {
      const cx = ax + dx * t, cy = ay + dy * t;
      if (cur) { cur.push(cx, cy); if (cur.length >= 4) out.push(cur); cur = null; }
      else cur = [cx, cy];
    }
    if (cur) cur.push(x, y);
    else if (want(x, y) && !ts.length) cur = [x, y];
  }
  if (cur && cur.length >= 4) out.push(cur);
  return out;
}

////////////////////////////////////////////////////////////////////////////////////////
// Level lines
//
// Marching squares over a grid of values, the crossings named by the edge of the grid
// they lie on, so the pieces from two cells meet at exactly the same point and can be
// strung into long lines. Saddles are split by the value in the middle of the cell.

function contour(F, nx, ny, x0, y0, dx, dy, level) {
  const segs = [];
  const val = (i, j) => F[j * nx + i];
  const ptOn = id => {
    const h = id & 1, k = id >> 1, i = k % nx, j = (k / nx) | 0;
    if (h === 0) {                        // the edge (i, j)–(i+1, j)
      const a = val(i, j), b = val(i + 1, j), t = (level - a) / (b - a);
      return [x0 + (i + t) * dx, y0 + j * dy];
    }
    const a = val(i, j), b = val(i, j + 1), t = (level - a) / (b - a);
    return [x0 + i * dx, y0 + (j + t) * dy];
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = val(i, j), b = val(i + 1, j), c = val(i + 1, j + 1), d = val(i, j + 1);
      if (!(Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c) && Number.isFinite(d))) continue;
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
  // string the pieces end to end
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
    const chain = [segs[s], segs[s + 1]];
    for (const dir of [1, 0]) {
      while (true) {
        const end = dir ? chain[chain.length - 1] : chain[0];
        const l = at.get(end);
        let next = -1;
        if (l) for (const t of l) if (!used[t >> 1]) { next = t; break; }
        if (next < 0) break;
        used[next >> 1] = 1;
        const other = segs[next] === end ? segs[next + 1] : segs[next];
        if (dir) chain.push(other); else chain.unshift(other);
      }
    }
    const p = [];
    for (const e of chain) { const [x, y] = ptOn(e); p.push(x, y); }
    lines.push(p);
  }
  return lines;
}

////////////////////////////////////////////////////////////////////////////////////////
// Filling with a pen
//
// What has to land on a filled shape is the edge of the black, not the middle of any one
// stroke, so a fill is drawn on the shape pulled half a nib in: its edge once, and then a
// spiral inside it no further apart than `fillPass` of the nib. A disc no wider than the
// nib is one dab of it.

function discFill(cx, cy, r) {
  const w = PW, ri = r - w / 2;
  if (ri <= w * 0.12) { emitDab(cx, cy); return; }
  const p = Math.max(0.02, w * clamp(settings.fillPass, 20, 200) / 100);
  const xs = [], ys = [];
  const steps = a => Math.max(8, Math.ceil(2 * Math.PI / Math.max(0.05, 2 * Math.acos(clamp(1 - SAG / Math.max(a, SAG * 2), -1, 1)))));
  const n = steps(ri);
  for (let i = 0; i <= n; i++) {
    const a = 2 * Math.PI * i / n;
    xs.push(cx + ri * Math.cos(a)); ys.push(cy + ri * Math.sin(a));
  }
  if (ri > w / 2) {
    let a = 0;
    const end = ri / p * 2 * Math.PI;
    while (a < end) {
      const rr = ri - p * a / (2 * Math.PI);
      a += Math.min(0.5, 2 * Math.PI / steps(Math.max(rr, p)));
      const r2 = Math.max(0, ri - p * a / (2 * Math.PI));
      xs.push(cx + r2 * Math.cos(a)); ys.push(cy + r2 * Math.sin(a));
    }
  }
  emit(xs, ys);
}

////////////////////////////////////////////////////////////////////////////////////////
// Motifs
//
// A motif is drawn once per ring, in one cell's own coordinates — x across it from 0 to W
// (its angle), y up it from 0 to H (the logarithm of its radius) — and laid round the
// ring cell by cell, so every cell of a ring is the same and the symmetry is exact. What
// a motif draws is tagged as outline or detail, for the pens to share. Anything that
// repeats inward — nested petals, rows, levels, contour lines — stops while two lines
// would still be at least the gap apart on the paper, so the small rings near the middle
// are drawn in outline and the large ones far out in full.
//
// c: { k — detail asked for, g — the gap in this cell's units, h(j) — the ring's own
// random numbers, spin — which way a motif that has a handedness turns }

let MO = [];

function ol(p) { if (p && p.length >= 4) MO.push({ p, t: 0 }); }
function dl(p) { if (p && p.length >= 4) MO.push({ p, t: 1 }); }
function dlDisk(p) { if (p && p.length >= 4) MO.push({ p, t: 1, disk: true }); }

// How many nested copies fit in `space` with `g` between them, at most `want`.
function fitK(space, want, g) { return clamp(Math.min(want, Math.floor(space / g) - 1), 0, want); }

const LOTUS = t => Math.pow(Math.max(0, 1 - Math.pow(t, 1.7)), 0.75);
const LEAF  = t => Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.85);

// A petal standing on the base y = yb, its tip at yt, its half width hw0 times the
// profile, leaning by skew: up the left side and down the right.
function petalPts(xc, hw0, yb, yt, prof, skew) {
  const m = 36, L = [], R = [];
  for (let i = 0; i <= m; i++) {
    const t = i / m, y = yb + (yt - yb) * t;
    const hw = hw0 * prof(t), sk = skew * hw0 * Math.sin(Math.PI * t);
    L.push(xc - hw + sk, y); R.push(xc + hw + sk, y);
  }
  const p = L.slice();
  for (let i = m - 1; i >= 0; i--) p.push(R[2 * i], R[2 * i + 1]);
  return p;
}

function mPetals(W, H, c) {
  const e = H * 0.03, y0 = e, y1 = H - e;
  const v = Math.floor(c.h(1) * 4);            // lotus, leaf, flame, layered
  const prof = v === 1 ? LEAF : LOTUS;
  const skew = v === 2 ? 0.45 * c.spin : 0;
  const hw0 = W / 2 * (v === 1 ? 0.82 : 0.98);
  const yt = v === 3 ? y0 + (y1 - y0) * 0.8 : y1;
  if (v === 3) {
    // a back row between the front petals, taller, hidden where the front ones stand
    const fronts = [-W / 2, W / 2, 1.5 * W].map(x => petalPts(x, hw0, y0, yt, prof, 0));
    const inside = (x, y) => fronts.some(f => pointInPoly(x, y, f));
    for (const q of clipOutside(petalPts(0, hw0, y0, y1, prof, 0), inside, H / 160)) ol(q);
    const kb = fitK(hw0 * 0.5, Math.min(c.k, 2), c.g);
    for (let j = 1; j <= kb; j++) {
      const f = j / (kb + 1) * 0.5;
      for (const q of clipOutside(petalPts(0, hw0 * (1 - f), y0, y1 - (y1 - y0) * f * 0.6, prof, 0),
                                  inside, H / 160)) dl(q);
    }
  }
  ol(petalPts(W / 2, hw0, y0, yt, prof, skew));
  const kk = fitK(hw0, c.k, c.g);
  for (let j = 1; j <= kk; j++) {
    const f = j / (kk + 1);
    dl(petalPts(W / 2, hw0 * (1 - f), y0, y0 + (yt - y0) * (1 - 0.8 * f), prof, skew * (1 - f)));
  }
  if (v === 1 || c.h(2) < 0.4) {
    const p = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24 * 0.9;
      p.push(W / 2 + skew * hw0 * Math.sin(Math.PI * t), y0 + (yt - y0) * t);
    }
    dl(p);
  }
}

function archPts(cx, hw, yb, h, v) {
  const m = 40, p = [];
  if (v === 2) {
    // an onion dome: a bulb narrowing to a point
    const L = [], R = [];
    for (let i = 0; i <= m; i++) {
      const t = i / m;
      const w = hw * (1 + 0.42 * Math.sin(Math.PI * Math.min(1, t * 1.5))) * Math.pow(1 - t, 0.85) / 1.42;
      L.push(cx - w, yb + h * t); R.push(cx + w, yb + h * t);
    }
    p.push(...L);
    for (let i = m - 1; i >= 0; i--) p.push(R[2 * i], R[2 * i + 1]);
    return p;
  }
  for (let i = 0; i <= m; i++) {
    const s = i / m, u = 2 * s - 1;
    if (v === 0) p.push(cx - hw * Math.cos(Math.PI * s), yb + h * Math.sin(Math.PI * s));
    else p.push(cx + hw * u, yb + h * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 1.4)), 0.65));
  }
  return p;
}

function mArches(W, H, c) {
  const e = H * 0.03, v = Math.floor(c.h(1) * 3), inv = c.h(2) < 0.3;
  const flip = p => { if (inv) for (let i = 1; i < p.length; i += 2) p[i] = H - p[i]; return p; };
  const hw = W / 2 * 0.98, h = H - 2 * e;
  ol(flip(archPts(W / 2, hw, e, h, v)));
  const kk = fitK(Math.min(hw, h), c.k, c.g);
  for (let j = 1; j <= kk; j++) {
    const f = j / (kk + 1);
    dl(flip(archPts(W / 2, hw * (1 - f), e, h * (1 - f), v)));
  }
  if (v === 2) dl(flip(circlePts(W / 2, e + h + h * 0.035, h * 0.03, 16)));
}

function mZigzag(W, H, c) {
  const e = H * 0.03, v = Math.floor(c.h(1) * 3);   // chevrons, meander, diamonds
  const n = Math.max(1, fitK((H - 2 * e) / 2, c.k + 1, c.g) + 1);
  const a = (H - 2 * e) / (n + 1);
  for (let j = 0; j < n; j++) {
    const yb = n > 1 ? e + j * (H - 2 * e - a) / (n - 1) : (H - a) / 2;
    let p;
    if (v === 1) p = [0, yb, W / 4, yb, W / 4, yb + a, 3 * W / 4, yb + a, 3 * W / 4, yb, W, yb];
    else p = [0, yb, W / 2, yb + a, W, yb];
    (j === 0 ? ol : dl)(p);
    if (v === 2) dl([0, yb + a, W / 2, yb, W, yb + a]);
  }
}

function mSierpinski(W, H, c) {
  const e = H * 0.03, inv = c.h(1) < 0.3, gaps = c.h(3) < 0.5;
  const yb = inv ? H - e : e, yt = inv ? e : H - e;
  const depth = clamp(Math.min(c.k, Math.floor(Math.log2(W / (3 * c.g)))), 0, 7);
  const tri = (A, B, C, L) => {
    if (L >= depth) return;
    const ab = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], bc = [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2];
    const ca = [(C[0] + A[0]) / 2, (C[1] + A[1]) / 2];
    dl([ab[0], ab[1], bc[0], bc[1], ca[0], ca[1], ab[0], ab[1]]);
    tri(A, ab, ca, L + 1); tri(ab, B, bc, L + 1); tri(ca, bc, C, L + 1);
  };
  const A = [0, yb], B = [W, yb], C = [W / 2, yt];
  ol([A[0], A[1], B[0], B[1], C[0], C[1], A[0], A[1]]);
  tri(A, B, C, 0);
  if (gaps) {
    // the triangle standing on its head between this cell's and the next
    const D = [W / 2, yt], E = [W, yb], F = [1.5 * W, yt];
    dl([D[0], D[1], E[0], E[1], F[0], F[1], D[0], D[1]]);
    tri(D, E, F, 1);
  }
}

function mBeads(W, H, c) {
  const e = H * 0.03, v = Math.floor(c.h(1) * 3);   // rings, rosettes, crosses
  const m = Math.max(1, Math.round(W / ((H - 2 * e) * 0.95)));
  const rr = Math.min(W / m, H - 2 * e) / 2 * 0.9;
  for (let i = 0; i < m; i++) {
    const x = W * (i + 0.5) / m, y = H / 2;
    ol(circlePts(x, y, rr, 48));
    const kk = fitK(rr, c.k, c.g);
    for (let j = 1; j <= kk; j++) dl(circlePts(x, y, rr * (1 - j / (kk + 1)), 40));
    if (v === 1 && rr * 0.3 > c.g * 1.5) {
      for (let q = 0; q < 6; q++) {
        const a = q * Math.PI / 3;
        dl(circlePts(x + rr * 0.6 * Math.cos(a), y + rr * 0.6 * Math.sin(a), rr * 0.28, 24));
      }
    } else if (v === 2) {
      dl([x - rr, y, x + rr, y]); dl([x, y - rr, x, y + rr]);
    }
  }
}

function mInterlace(W, H, c) {
  const e = H * 0.03, v = Math.floor(c.h(1) * 3);   // vesica, chain, double
  const rho = Math.min((H - 2 * e) / 2, W / 2);
  const sp = v === 1 ? rho * 1.5 : rho;
  const q = Math.max(1, Math.round(W / sp));
  for (let i = 0; i < q; i++) {
    const x = i * W / q;
    ol(circlePts(x, H / 2, rho, 64));
    if (v === 2 && rho * 0.2 > c.g) dl(circlePts(x, H / 2, rho * 0.78, 56));
    if (v === 1 && rho * 0.5 > c.g) dl(circlePts(x, H / 2, rho * 0.25, 24));
  }
}

function mLattice(W, H, c) {
  const e = H * 0.02, v = Math.floor(c.h(1) * 3);   // spiral lattice, vortex, chords
  const m = Math.max(1, Math.min(Math.round(c.k), Math.floor(W / (c.g * 2))));
  const shift = (1 + Math.floor(c.h(2) * 2)) * W;
  for (let i = 0; i < m; i++) {
    const x = W * i / m;
    const p1 = [x, e, x + shift * c.spin, H - e];
    if (v === 2) dlDisk(p1); else dl(p1);
    if (v !== 1) {
      const p2 = [x, e, x - shift * c.spin, H - e];
      if (v === 2) dlDisk(p2); else dl(p2);
    }
  }
}

function mPinwheel(W, H, c) {
  const e = H * 0.03;
  const sh = c.spin * W * (0.6 + 0.8 * c.h(1)), w = W * 0.5;
  ol([0, e, sh, H - e, sh + w, H - e, w, e, 0, e]);
  const kk = fitK(w, c.k * 2, c.g);
  for (let j = 1; j <= kk; j++) {
    const t = j / (kk + 1) * w;
    dl([t, e, sh + t, H - e]);
  }
}

function tearPts(cx, cy, r, ang) {
  // a teardrop, its point at angle `ang` from the middle
  const p = [], c = Math.cos(ang - Math.PI / 2), s = Math.sin(ang - Math.PI / 2);
  for (let i = 0; i <= 40; i++) {
    const t = 2 * Math.PI * i / 40;
    const x = r * 0.8 * Math.sin(t) * Math.pow(Math.abs(Math.sin(t / 2)), 1.3);
    const y = r * Math.cos(t);
    p.push(cx + x * c - y * s, cy + x * s + y * c);
  }
  return p;
}

function mFlorets(W, H, c) {
  const e = H * 0.03, v = Math.floor(c.h(1) * 3);   // seeds, petals, spikes
  const q = clamp(Math.round(c.k / 2), 1, 4);
  const s = W / q, rows = Math.max(1, Math.round((H - 2 * e) / (s * 0.866)));
  const dy = (H - 2 * e) / rows;
  const shear = c.h(2) < 0.5 ? 0 : s * 0.5 * c.spin;
  const r = Math.min(s, dy) * 0.46;
  for (let j = 0; j < rows; j++) {
    const y = e + (j + 0.5) * dy;
    const off = (j % 2) * 0.5 * s + j * shear;
    for (let i = 0; i < q; i++) {
      let x = (i * s + off) % W;
      if (x < 0) x += W;
      if (v === 0) {
        ol(circlePts(x, y, r, 36));
        if (r * 0.5 > c.g) dl(circlePts(x, y, r * 0.5, 24));
        if (r * 0.15 > c.g * 0.5) dl(circlePts(x, y, r * 0.12, 12));
      } else if (v === 1) {
        ol(tearPts(x, y, r, Math.PI / 2));
        if (r * 0.45 > c.g) dl(tearPts(x, y - r * 0.15, r * 0.55, Math.PI / 2));
      } else {
        ol([x, y - r, x + r * 0.32, y, x, y + r, x - r * 0.32, y, x, y - r]);
        if (r * 0.4 > c.g) dl([x, y - r * 0.55, x, y + r * 0.55]);
      }
    }
  }
}

function mRays(W, H, c) {
  const e = H * 0.03, v = Math.floor(c.h(1) * 3);   // sunburst, tipped, flames
  const m = Math.max(2, Math.min(c.k * 2, Math.floor(W / (c.g * 1.3))));
  const pat = m % 4 === 0 ? [1, 0.55, 0.78, 0.55] : [1, 0.6];
  for (let i = 0; i < m; i++) {
    const x = W * (i + 0.5) / m, L = (H - 2 * e) * pat[i % pat.length];
    let p;
    if (v === 2) {
      p = [];
      for (let q = 0; q <= 20; q++) {
        const t = q / 20;
        p.push(x + W / m * 0.3 * Math.sin(t * Math.PI * 3) * t, e + L * t);
      }
    } else p = [x, e, x, e + L];
    (i === 0 ? ol : dl)(p);
    if (v === 1 && pat[i % pat.length] === 1) dl(circlePts(x, e + L, W / m * 0.3, 16));
  }
}

function mWaves(W, H, c) {
  const e = H * 0.03;
  const n = Math.max(1, fitK((H - 2 * e) / 2, c.k + 1, c.g) + 1);
  const f = 1 + Math.floor(c.h(1) * 2);
  const a = (H - 2 * e) / (n + 1) * (0.5 + 0.5 * c.h(2));
  const braid = c.h(3) < 0.5;
  for (let j = 0; j < n; j++) {
    const y = e + a + (H - 2 * e - 2 * a) * (n > 1 ? j / (n - 1) : 0.5);
    const ph = braid ? (j % 2) * Math.PI : j * Math.PI / n;
    const p = [];
    for (let i = 0; i <= 48; i++) {
      const x = W * i / 48;
      p.push(x, y + a * Math.sin(2 * Math.PI * f * x / W + ph));
    }
    (j === 0 ? ol : dl)(p);
  }
}

function mGuilloche(W, H, c) {
  const L = Math.max(2, Math.min(c.k * 3, Math.floor((H * 0.5) / c.g)));
  const f1 = 1 + Math.floor(c.h(1) * 2), f2 = f1 * 2 + Math.floor(c.h(2) * 2);
  const a1 = H * 0.2, a2 = H * 0.1;
  for (let j = 0; j < L; j++) {
    const ph = 2 * Math.PI * j / L, p = [];
    for (let i = 0; i <= 64; i++) {
      const x = W * i / 64;
      p.push(x, H / 2 + a1 * Math.sin(2 * Math.PI * f1 * x / W + ph) +
                a2 * Math.sin(2 * Math.PI * f2 * x / W - ph * 1.5));
    }
    (j === 0 ? ol : dl)(p);
  }
}

function segDist(x, y, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const px = ax + t * dx - x, py = ay + t * dy - y;
  return Math.sqrt(px * px + py * py);
}

// A maze of the kind woven and painted along the Ucayali: a path carved through a grid,
// mirrored, and the corridors round it filled with lines that follow it, as contours of
// the distance to it.
function mKene(W, H, c) {
  const e = H * 0.03;
  const gx = 2 * clamp(1 + Math.round(c.k * 0.7), 2, 5);
  const gy = clamp(Math.round(gx * (H - 2 * e) / W), 2, 10);
  const half = gx / 2;
  const id = (i, j) => j * gx + i;
  const seen = new Uint8Array(gx * gy), edges = [];
  const rnd = mulberry32(Math.floor(c.h(5) * 1e9));
  const start = [Math.floor(rnd() * half), Math.floor(rnd() * gy)];
  const stack = [start];
  seen[id(start[0], start[1])] = 1;
  while (stack.length) {
    const [i, j] = stack[stack.length - 1];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [i + a, j + b])
      .filter(([a, b]) => a >= 0 && a < half && b >= 0 && b < gy && !seen[id(a, b)]);
    if (!nb.length) { stack.pop(); continue; }
    const [a, b] = nb[Math.floor(rnd() * nb.length)];
    seen[id(a, b)] = 1;
    edges.push([i, j, a, b]);
    stack.push([a, b]);
  }
  const all = edges.slice();
  for (const [i, j, a, b] of edges) all.push([gx - 1 - i, j, gx - 1 - a, b]);
  const jc = Math.floor(c.h(6) * gy);
  all.push([half - 1, jc, half, jc]);
  const cw = W / gx, ch = (H - 2 * e) / gy;
  const X = i => (i + 0.5) * cw, Y = j => e + (j + 0.5) * ch;
  const segs = all.map(([i, j, a, b]) => [X(i), Y(j), X(a), Y(b)]);
  for (const s of segs) ol(s);
  const deg = new Map();
  for (const [i, j, a, b] of all) {
    deg.set(id(i, j), (deg.get(id(i, j)) || 0) + 1);
    deg.set(id(a, b), (deg.get(id(a, b)) || 0) + 1);
  }
  const kk = fitK(Math.min(cw, ch) / 2, c.k, c.g);
  if (kk > 0) {
    // the cells either side are the same maze, so their paths count too
    const near = segs.concat(segs.map(s => [s[0] - W, s[1], s[2] - W, s[3]]),
                             segs.map(s => [s[0] + W, s[1], s[2] + W, s[3]]));
    const nx = gx * 8 + 1, ny = gy * 8 + 1;
    const F = new Float64Array(nx * ny);
    const dx = W / (nx - 1), dy = (H - 2 * e) / (ny - 1);
    for (let jy = 0; jy < ny; jy++) {
      for (let ix = 0; ix < nx; ix++) {
        const x = ix * dx, y = e + jy * dy;
        let best = Infinity;
        for (const s of near) {
          if (Math.abs(x - (s[0] + s[2]) / 2) > cw * 1.2 + Math.abs(s[2] - s[0]) / 2) continue;
          const d = segDist(x, y, s[0], s[1], s[2], s[3]);
          if (d < best) best = d;
        }
        F[jy * nx + ix] = best;
      }
    }
    const step = Math.min(cw, ch) / 2 / (kk + 1);
    for (let l = 1; l <= kk; l++) for (const p of contour(F, nx, ny, 0, e, dx, dy, l * step)) dl(p);
  }
  // a small diamond at every dead end
  const r = Math.min(cw, ch) * 0.16;
  if (r > c.g) {
    for (let j = 0; j < gy; j++) {
      for (let i = 0; i < gx; i++) {
        if (deg.get(id(i, j)) !== 1) continue;
        const x = X(i), y = Y(j);
        dl([x, y - r, x + r, y, x, y + r, x - r, y, x, y - r]);
      }
    }
  }
}

function mEyes(W, H, c) {
  const e = H * 0.04, v = Math.floor(c.h(1) * 3);   // lashes, creases, spiral iris
  const vert = W < (H - 2 * e) * 0.9;
  const cx = W / 2, cy = H / 2;
  const L = (vert ? H - 2 * e : W) * 0.46;
  const hh = Math.min((vert ? W : H - 2 * e) * 0.4, L * 0.62);
  const put = p => {
    const q = [];
    for (let i = 0; i < p.length; i += 2) q.push(vert ? cx + p[i + 1] : cx + p[i], vert ? cy + p[i] : cy + p[i + 1]);
    return q;
  };
  const b = hh / (2 * L);
  ol(put(bowPts(-L, 0, L, 0, b, 40)));
  ol(put(bowPts(-L, 0, L, 0, -b, 40)));
  const ir = hh * 0.62;
  ol(put(circlePts(0, 0, ir, 40)));
  if (ir * 0.4 > c.g) dl(put(circlePts(0, 0, ir * 0.38, 28)));
  if (ir * 0.12 > c.g * 0.4) dl(put(circlePts(0, 0, ir * 0.1, 12)));
  if (v === 0) {
    const m = fitK(L * 2, 9, c.g * 2.5);
    const arc = bowPts(-L, 0, L, 0, b, m + 1);
    for (let i = 1; i <= m; i++) {
      const x = arc[2 * i], y = arc[2 * i + 1];
      const nx = x / L * 0.6, ny = 1, d = Math.hypot(nx, ny), l = hh * 0.38;
      dl(put([x, y, x + nx / d * l, y + ny / d * l]));
    }
  } else if (v === 1) {
    const kk = fitK(hh * 0.5, c.k, c.g);
    for (let j = 1; j <= kk; j++) {
      const f = 1 + j * 0.5 / (kk + 1) * 2;
      dl(put(bowPts(-L, 0, L, 0, b * f, 40)));
      dl(put(bowPts(-L, 0, L, 0, -b * f, 40)));
    }
  } else if (ir * 0.5 > c.g) {
    const p = [], turns = Math.min(4, Math.floor(ir / c.g / 1.5));
    for (let i = 0; i <= turns * 24; i++) {
      const a = 2 * Math.PI * i / 24, r = ir * 0.38 + (ir * 0.95 - ir * 0.38) * i / (turns * 24);
      p.push(r * Math.cos(a * c.spin), r * Math.sin(a * c.spin));
    }
    dl(put(p));
  }
}

// Fish scales, or the waves of seigaiha: rows of fans, the nearer row hiding the farther.
function mScales(W, H, c) {
  const e = H * 0.03, sei = c.h(1) < 0.55;
  const q = clamp(Math.round(c.k / 2), 1, 4);
  const rho = W / q / 2;
  const dy = rho * (sei ? 0.55 : 0.75);
  const rows = Math.max(1, Math.round((H - 2 * e - rho) / dy) + 1);
  const occ = [];
  const top = H - e * 0.5;
  const inside = (x, y) => {
    if (y > top) return true;
    for (let i = 0; i < occ.length; i++) {
      const f = occ[i];
      if (y >= f[1] - 1e-9 && (x - f[0]) * (x - f[0]) + (y - f[1]) * (y - f[1]) < f[2]) return true;
    }
    return false;
  };
  const kk = sei ? fitK(rho, c.k, c.g) : 0;
  for (let j = 0; j < rows; j++) {
    const y = e + j * dy;
    const off = (j % 2) * rho;
    const fans = [];
    for (let i = -2; i <= 2 * q + 2; i++) {
      const x = off + i * 2 * rho;
      fans.push(x);
    }
    for (const x of fans) {
      if (x < -1e-9 || x >= W - 1e-9) continue;
      for (let l = 0; l <= kk; l++) {
        const r = rho * (1 - l / (kk + 1));
        for (const p of clipOutside(arcPts(x, y, r, 0, Math.PI, 32), inside, rho / 30)) (l ? dl : ol)(p);
      }
      if (!sei && rho * 0.3 > c.g) {
        for (const p of clipOutside(arcPts(x, y, rho * 0.55, Math.PI * 0.25, Math.PI * 0.75, 12),
                                    inside, rho / 30)) dl(p);
      }
    }
    for (const x of fans) occ.push([x, y, rho * rho * 0.9999]);
  }
}

function mJewels(W, H, c) {
  const e = H * 0.03, v = Math.floor(c.h(1) * 3);   // facets, star, nested
  const q = clamp(Math.round(c.k / 2), 1, 4);
  const s = W / q, rows = Math.max(1, Math.round((H - 2 * e) / (s * 0.866)));
  const dy = (H - 2 * e) / rows;
  const R = Math.min(s / Math.sqrt(3), dy / 1.5) * 0.92;
  for (let j = 0; j < rows; j++) {
    const y = e + (j + 0.5) * dy;
    for (let i = 0; i < q; i++) {
      const x = ((i + 0.5 + (j % 2) * 0.5) * s) % W;
      const hex = ngonPts(x, y, R, 6, Math.PI / 6);
      ol(hex);
      if (R * 0.4 < c.g) continue;
      if (v === 0) {
        dl(ngonPts(x, y, R * 0.5, 6, Math.PI / 6));
        for (let k = 0; k < 6; k++) dl([hex[2 * k], hex[2 * k + 1], x + (hex[2 * k] - x) * 0.5, y + (hex[2 * k + 1] - y) * 0.5]);
      } else if (v === 1) {
        dl(ngonPts(x, y, R * 0.86, 3, Math.PI / 6));
        dl(ngonPts(x, y, R * 0.86, 3, -Math.PI / 6));
      } else {
        const kk = fitK(R, c.k, c.g);
        for (let l = 1; l <= kk; l++) dl(ngonPts(x, y, R * (1 - l / (kk + 1)), 6, Math.PI / 6 + l * 0.2 * c.spin));
      }
    }
  }
}

function kochPts(x0, y0, x1, y1, it, sign, square) {
  let p = [x0, y0, x1, y1];
  for (let k = 0; k < it; k++) {
    const q = [p[0], p[1]];
    for (let i = 0; i + 3 < p.length; i += 2) {
      const ax = p[i], ay = p[i + 1], bx = p[i + 2], by = p[i + 3];
      const dx = (bx - ax) / 3, dy = (by - ay) / 3;
      const px1 = ax + dx, py1 = ay + dy, px2 = ax + 2 * dx, py2 = ay + 2 * dy;
      if (!square) {
        q.push(px1, py1, px1 + dx * 0.5 - dy * 0.866 * sign, py1 + dy * 0.5 + dx * 0.866 * sign,
               px2, py2, bx, by);
      } else {
        const nx = -dy * sign, ny = dx * sign;
        q.push(px1, py1, px1 + nx, py1 + ny, px2 + nx, py2 + ny, px2, py2, bx, by);
      }
    }
    p = q;
  }
  return p;
}

function mKoch(W, H, c) {
  const e = H * 0.04, square = c.h(1) < 0.35;
  const it = clamp(Math.min(c.k, Math.floor(Math.log(W / (c.g * 1.5)) / Math.log(3))), 1, 5);
  const bump = W * (square ? 0.34 : 0.29);
  const sy = Math.min(1, (H - 2 * e) * 0.42 / bump);
  const fit = (p, y0) => { for (let i = 1; i < p.length; i += 2) p[i] = y0 + (p[i] - y0) * sy; return p; };
  ol(fit(kochPts(0, e, W, e, it, 1, square), e));
  dl(fit(kochPts(0, H - e, W, H - e, Math.max(1, it - 1), -1, square), H - e));
}

function mTree(W, H, c) {
  const e = H * 0.03;
  const depth = clamp(c.k + 3, 3, 9);
  const spread = rad(18 + 22 * c.h(1)), ratio = 0.6 + 0.12 * c.h(2);
  const L0 = (H - 2 * e) * (1 - ratio) * 0.98;
  const branch = (x, y, ang, len, d) => {
    const x2 = x + len * Math.sin(ang), y2 = y + len * Math.cos(ang);
    (d < 2 ? ol : dl)([x, y, x2, y2]);
    if (d + 1 < depth && len * ratio > c.g * 1.5) {
      branch(x2, y2, ang - spread + c.spin * 0.08, len * ratio, d + 1);
      branch(x2, y2, ang + spread + c.spin * 0.08, len * ratio, d + 1);
    } else if (len * 0.3 > c.g * 0.6) {
      dl(circlePts(x2, y2, len * 0.28, 12));
    }
  };
  branch(W / 2, e, 0, L0, 0);
}

function mChecker(W, H, c) {
  const e = H * 0.03;
  const gx = clamp(Math.round(c.k / 2), 1, 6), gy = Math.max(1, Math.round(gx * (H - 2 * e) / W));
  const w = W / gx, h = (H - 2 * e) / gy;
  for (let i = 0; i < gx; i++) ol([i * w, e, i * w, H - e]);
  for (let j = 0; j <= gy; j++) ol([0, e + j * h, W, e + j * h]);
  const sp = Math.max(c.g * 1.2, Math.min(w, h) / (c.k + 2));
  for (let i = 0; i < gx; i++) {
    for (let j = 0; j < gy; j++) {
      const x0 = i * w, y0 = e + j * h;
      if ((i + j) % 2) {
        for (let y = y0 + sp / 2; y < y0 + h; y += sp) dl([x0, y, x0 + w, y]);
      } else {
        for (let x = x0 + sp / 2; x < x0 + w; x += sp) dl([x, y0, x, y0 + h]);
      }
    }
  }
}

function mVines(W, H, c) {
  const e = H * 0.03;
  const stem = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    stem.push(W / 2 + c.spin * W * 0.16 * Math.sin(Math.PI * t * 1.2), e + (H - 2 * e) * t);
  }
  ol(stem);
  const R0 = Math.min(W * 0.26, (H - 2 * e) * 0.16);
  [0.28, 0.52, 0.76].forEach((t, k) => {
    const side = (k % 2 ? -1 : 1) * c.spin;
    const i = Math.round(t * 40), sx = stem[2 * i], sy = stem[2 * i + 1];
    const r0 = R0 * (1 - 0.25 * t);
    // a curl: a spiral winding in from the stem
    const p = [], turns = Math.min(2.2, 0.8 + r0 / c.g / 6);
    const cx = sx + side * r0, cy = sy, a0 = side > 0 ? Math.PI : 0;
    for (let q = 0; q <= 60; q++) {
      const a = a0 - side * 2 * Math.PI * turns * q / 60;
      const r = r0 * (1 - 0.85 * q / 60);
      p.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    dl(p);
    if (r0 * 0.4 > c.g) dl(tearPts(sx - side * r0 * 0.7, sy + r0 * 0.6, r0 * 0.45, Math.PI / 2 + side * 0.6));
  });
}

function mLines(W, H, c) {
  const e = H * 0.03, dotted = c.h(1) < 0.3;
  const n = Math.max(1, fitK(H - 2 * e, c.k * 2, c.g) + 1);
  for (let j = 0; j < n; j++) {
    const y = e + (H - 2 * e) * (j + 0.5) / n;
    if (dotted) {
      const m = Math.max(2, Math.round(W / ((H - 2 * e) / n)));
      for (let i = 0; i < m; i++) dl(circlePts(W * (i + 0.5) / m, y, (H - 2 * e) / n * 0.12, 10));
    } else (j === 0 ? ol : dl)([0, y, W, y]);
  }
}

const MOTIF_FN = {
  petals: mPetals, arches: mArches, zigzag: mZigzag, sierpinski: mSierpinski, beads: mBeads,
  interlace: mInterlace, lattice: mLattice, pinwheel: mPinwheel, florets: mFlorets,
  rays: mRays, waves: mWaves, guilloche: mGuilloche, kene: mKene, eyes: mEyes,
  scales: mScales, jewels: mJewels, koch: mKoch, tree: mTree, checker: mChecker,
  vines: mVines, lines: mLines,
};

////////////////////////////////////////////////////////////////////////////////////////
// Rings
//
// Between the heart and the rim, so many rings. Growing rings are spaced evenly in the
// logarithm of the radius, so every ring's cells are the same shape; even rings are
// spaced evenly in the radius; random ones by chance. A ring is cut into a multiple of
// the symmetry of cells, as many as make them the shape its motif likes best.

let RINGS = [];

function centreRadius() {
  return settings.centre === 'none' ? 0.05 : clamp(settings.centreSize, 3, 92) / 100;
}

function pickMotif(i) {
  const s = settings, set = s[`ring${i + 1}`];
  if (set && MOTIFS[set]) return set;
  let tot = 0;
  for (const m of MOTIF_NAMES) tot += Math.max(0, s[MOTIFS[m].w] || 0);
  if (!tot) return 'lines';
  let x = hash01(i, 7, 911) * tot;
  for (const m of MOTIF_NAMES) {
    x -= Math.max(0, s[MOTIFS[m].w] || 0);
    if (x < 0) return m;
  }
  return MOTIF_NAMES[MOTIF_NAMES.length - 1];
}

function makeRings() {
  const s = settings, n = sym();
  const r0 = centreRadius();
  const K = clamp(Math.round(s.rings), 0, MAX_RINGS);
  const rs = [r0];
  if (s.ringSpacing === 'even') {
    for (let i = 1; i <= K; i++) rs.push(r0 + (1 - r0) * i / K);
  } else if (s.ringSpacing === 'random') {
    const w = [];
    let tot = 0;
    for (let i = 0; i < K; i++) { const v = 0.45 + hash01(i, 3, 913); w.push(v); tot += v; }
    let acc = 0;
    for (let i = 0; i < K; i++) { acc += w[i]; rs.push(r0 * Math.pow(1 / r0, acc / tot)); }
  } else {
    for (let i = 1; i <= K; i++) rs.push(r0 * Math.pow(1 / r0, i / K));
  }
  const out = [];
  const styles = ['line', 'double', 'beads', 'dots', 'teeth', 'line'];
  for (let i = 0; i < K; i++) {
    const rin = rs[i], rout = rs[i + 1], H = Math.log(rout / rin);
    const motif = pickMotif(i);
    let m = 1;
    if (s.cells === 'fit') m = Math.max(1, Math.round((2 * Math.PI / n) / (MOTIFS[motif].a * H)));
    else if (s.cells === 'doubling') m = Math.pow(2, Math.floor(i / 2));
    m = Math.min(m, Math.max(1, Math.floor(1200 / n)));
    out.push({
      i, rin, rout, H, motif, cells: n * m, spin: i % 2 ? -1 : 1,
      border: s.borders === 'mixed' ? styles[Math.floor(hash01(i, 5, 915) * styles.length)] : s.borders,
    });
  }
  return out;
}

// The pen a ring's outline or detail goes to.
function ringPen(i, tag) {
  const s = settings, a = penIdx(s.ringsPen), b = penIdx(s.accentPen);
  switch (s.ringColour) {
    case 'alternate rings': return i % 2 ? b : a;
    case 'outline and detail': return tag ? b : a;
    case 'random rings': return hash01(i, 9, 917) < 0.4 ? b : a;
    case 'outer half': return i >= RINGS.length / 2 ? b : a;
    default: return a;
  }
}

// Whether any of a cell might land on the sheet, once warped.
function cellVisible(W, H) {
  const [SW, SH] = paperDims(), m = FRAME.R * 0.15;
  let l = 0, r = 0, t = 0, b = 0, k = 0;
  for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H], [W / 2, H / 2]]) {
    cellMap(x, y);
    k++;
    if (MX < -m) l++;
    if (MX > SW + m) r++;
    if (MY < -m) t++;
    if (MY > SH + m) b++;
  }
  return !(l === k || r === k || t === k || b === k);
}

// The gap two lines of a motif keep, in mm: the setting, or more for a wide pen.
function gapFor(pens) {
  let w = 0;
  for (const p of pens) w = Math.max(w, penW(p));
  return Math.max(settings.minGap, 2.2 * w);
}

// One ring drawn round the circle, scaled and turned — the scale and turn are for the
// mandala inside itself.
function drawRing(ring, scale, rot, layer) {
  const s = settings, n = ring.cells, W = 2 * Math.PI / n, H = ring.H;
  const rin = ring.rin * scale;
  const phys = rin * Math.exp(H * 0.3) * FRAME.R;
  if (phys * W < 0.4) return;
  const pa = ringPen(ring.i, 0), pb = ringPen(ring.i, 1);
  const g = gapFor(layer === L_BACK ? [penIdx(s.backgroundPen)] : [pa, pb]) / phys;
  const mi = MOTIF_NAMES.indexOf(ring.motif);
  const ctx = { k: clamp(Math.round(s.detail), 0, 12), g, spin: ring.spin,
                h: j => hash01(ring.i, j, 3000 + mi * 31) };
  MO = [];
  MOTIF_FN[ring.motif](W, H, ctx);
  const list = MO;
  LAY = layer;
  for (let k = 0; k < n; k++) {
    CELL = { rin, t0: rot + k * W };
    if (!cellVisible(W, H)) continue;
    for (const it of list) {
      setPen(layer === L_BACK ? penIdx(s.backgroundPen) : (it.t ? pb : pa));
      if (it.disk) {
        const q = [];
        for (let j = 0; j < it.p.length; j += 2) { cellToDisk(it.p[j], it.p[j + 1]); q.push(DX, DY); }
        walk(q, diskMap);
      } else {
        walk(it.p, cellMap);
      }
    }
  }
}

// The line between two rings: a circle, two, a string of beads or of dots, or teeth.
function drawBorder(r, style, cells, i, scale, rot) {
  if (style === 'none') return;
  const R = r * scale;
  const gap = gapFor([penIdx(settings.bordersPen)]) / FRAME.R;
  LAY = L_BORDERS;
  setPen(penIdx(settings.bordersPen));
  const circ = rr => walk(circlePts(0, 0, rr, Math.max(64, cells * 4)), diskMap);
  if (style === 'line' || style === 'double') {
    circ(R);
    if (style === 'double') circ(R + gap * 1.4);
    return;
  }
  const N = cells * (style === 'teeth' ? 1 : 2);
  const step = 2 * Math.PI / N;
  const rb = R * step * 0.3;
  for (let j = 0; j < N; j++) {
    const a = rot + (j + 0.5) * step;
    if (style === 'beads') {
      walk(circlePts(R * Math.cos(a), R * Math.sin(a), rb, 16), diskMap);
    } else if (style === 'dots') {
      diskMap(R * Math.cos(a), R * Math.sin(a));
      discFill(MX, MY, Math.max(PW * 0.5, rb * FRAME.R * 0.35));
    } else {
      const a0 = rot + j * step, a1 = a0 + step, h = R * step * 0.45;
      walk([R * Math.cos(a0), R * Math.sin(a0), (R + h) * Math.cos(a), (R + h) * Math.sin(a),
            R * Math.cos(a1), R * Math.sin(a1)], diskMap);
    }
  }
  if (style === 'beads' || style === 'teeth') circ(R);
}

////////////////////////////////////////////////////////////////////////////////////////
// The heart
//
// Everything here is drawn on the disk itself, inside the heart's radius, and walked
// through the warp like the rest. Outline goes to the centre's pen; detail, when the
// centre is split, to the second pen.

function cpen(tag) {
  const s = settings;
  return tag && s.centreColour === 'outline and detail' ? penIdx(s.accentPen) : penIdx(s.centrePen);
}

function cline(p, tag) {
  if (!p || p.length < 4) return;
  LAY = L_CENTRE;
  setPen(cpen(tag));
  walk(p, diskMap);
}

function centreGap() {
  return gapFor([cpen(0), cpen(1)]) / FRAME.R;
}

function drawCentre() {
  const r0 = centreRadius();
  switch (settings.centre) {
    case 'chrysanthemum': chrysanthemum(r0); break;
    case 'hyperbolic':    hyperbolic(r0); break;
    case 'julia':         julia(r0); break;
    case 'apollonian':    apollonian(r0); break;
    case 'droste':        droste(r0); break;
    case 'string':        stringArt(r0); break;
    case 'stars':         stars(r0); break;
    case 'seed of life':  seedOfLife(r0); break;
    case 'bindu':         bindu(r0); break;
    default: break;
  }
}

// Florets laid by the golden angle, each a petal turned outward and growing towards the
// rim: the spinning flower said to come before the breakthrough.
function chrysanthemum(r0) {
  const s = settings, N = clamp(Math.round(s.chrysCount), 8, 4000), g = centreGap();
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N, rr = r0 * Math.sqrt(t) * 0.95;
    const a = i * GOLDEN_ANGLE;
    const size = r0 * 1.75 / Math.sqrt(N) * (0.5 + 0.65 * Math.sqrt(t));
    const x = rr * Math.cos(a), y = rr * Math.sin(a);
    if (size < g * 1.2) {
      diskMap(x, y);
      LAY = L_CENTRE; setPen(cpen(0));
      emitDab(MX, MY);
      continue;
    }
    if (s.chrysShape === 'seeds') {
      cline(circlePts(x, y, size * 0.42, 24), 0);
      if (size * 0.2 > g) cline(circlePts(x, y, size * 0.18, 12), 1);
    } else if (s.chrysShape === 'spikes') {
      const c = Math.cos(a), sn = Math.sin(a), l = size * 0.6, w = size * 0.2;
      cline([x - c * l, y - sn * l, x - sn * w, y + c * w, x + c * l, y + sn * l,
             x + sn * w, y - c * w, x - c * l, y - sn * l], 0);
      if (w > g) cline([x - c * l * 0.6, y - sn * l * 0.6, x + c * l * 0.6, y + sn * l * 0.6], 1);
    } else {
      cline(tearPts(x, y, size * 0.6, a), 0);
      const kk = fitK(size * 0.3, Math.max(1, s.centreDetail - 1), g);
      for (let j = 1; j <= kk; j++) {
        const f = j / (kk + 1);
        cline(tearPts(x - Math.cos(a) * size * 0.2 * f, y - Math.sin(a) * size * 0.2 * f,
                      size * 0.6 * (1 - f), a), 1);
      }
    }
  }
  cline(circlePts(0, 0, r0, 180), 0);
}

// The hyperbolic plane in the Poincaré disk, tiled by regular p-gons, q round every
// corner. The middle tile's corners sit at tanh(R/2), R the circumradius, cosh R =
// cot(π/p) cot(π/q); every other tile is a tile reflected across an edge — an inversion
// in the circle that edge lies on, which meets the rim at right angles. The tiles shrink
// toward the rim without end; they stop when they would come out smaller than the pen
// can draw.
function geodesic(ax, ay, bx, by) {
  const det = ax * by - ay * bx;
  if (Math.abs(det) < 1e-12) {
    const l = Math.hypot(bx - ax, by - ay) || 1;
    return { line: true, ux: (bx - ax) / l, uy: (by - ay) / l };
  }
  const ra = (ax * ax + ay * ay + 1) / 2, rb = (bx * bx + by * by + 1) / 2;
  const cx = (ra * by - rb * ay) / det, cy = (ax * rb - bx * ra) / det;
  return { cx, cy, r: Math.sqrt(Math.max(0, cx * cx + cy * cy - 1)) };
}

function reflectPt(g, x, y) {
  if (g.line) { const d = x * g.ux + y * g.uy; return [2 * d * g.ux - x, 2 * d * g.uy - y]; }
  const dx = x - g.cx, dy = y - g.cy, k = g.r * g.r / (dx * dx + dy * dy);
  return [g.cx + dx * k, g.cy + dy * k];
}

function geodesicPts(ax, ay, bx, by, g, n) {
  if (g.line) return [ax, ay, bx, by];
  const a0 = Math.atan2(ay - g.cy, ax - g.cx), a1 = Math.atan2(by - g.cy, bx - g.cx);
  return arcPts(g.cx, g.cy, g.r, a0, a0 + wrapAngle(a1 - a0), n);
}

function hyperbolic(r0) {
  const s = settings;
  const p = clamp(Math.round(s.hypP), 3, 12), q = clamp(Math.round(s.hypQ), 3, 12);
  if ((p - 2) * (q - 2) <= 4) { stars(r0); return; }
  const coshR = 1 / (Math.tan(Math.PI / p) * Math.tan(Math.PI / q));
  const rv = Math.tanh(Math.acosh(coshR) / 2);
  const minSize = Math.max(centreGap() * 1.4, 1.2 / FRAME.R) / r0;
  const first = [];
  for (let k = 0; k < p; k++) {
    const a = 2 * Math.PI * k / p + Math.PI / p;
    first.push(rv * Math.cos(a), rv * Math.sin(a));
  }
  const key = v => {
    let x = 0, y = 0;
    for (let i = 0; i < v.length; i += 2) { x += v[i]; y += v[i + 1]; }
    return Math.round(x / p * 1e6) + ',' + Math.round(y / p * 1e6);
  };
  const seen = new Set([key(first)]);
  const queue = [[first, 0]];
  const edges = new Set();
  const decor = s.hypDecor;
  let tiles = 0;
  const S = (x, y) => [x * r0, y * r0];
  while (queue.length && tiles < 6000) {
    const [v, par] = queue.shift();
    tiles++;
    let diam = 0, cx = 0, cy = 0;
    for (let i = 0; i < v.length; i += 2) {
      cx += v[i] / p; cy += v[i + 1] / p;
      for (let j = i + 2; j < v.length; j += 2) diam = Math.max(diam, Math.hypot(v[i] - v[j], v[i + 1] - v[j + 1]));
    }
    const mids = [];
    for (let k = 0; k < p; k++) {
      const ax = v[2 * k], ay = v[2 * k + 1];
      const bx = v[(2 * k + 2) % v.length], by = v[(2 * k + 3) % v.length];
      const g = geodesic(ax, ay, bx, by);
      const pts = geodesicPts(ax, ay, bx, by, g, 16);
      mids.push(pts[16] !== undefined ? [pts[16], pts[17]] : [(ax + bx) / 2, (ay + by) / 2]);
      const ek = [Math.round(ax * 1e6), Math.round(ay * 1e6), Math.round(bx * 1e6), Math.round(by * 1e6)];
      const k1 = ek[0] < ek[2] || (ek[0] === ek[2] && ek[1] < ek[3]) ? ek.join(',') : [ek[2], ek[3], ek[0], ek[1]].join(',');
      if (!edges.has(k1)) {
        edges.add(k1);
        const d = [];
        for (let i = 0; i < pts.length; i += 2) d.push(...S(pts[i], pts[i + 1]));
        cline(d, 0);
      }
      if (diam > minSize) {
        const nv = [];
        for (let i = 0; i < v.length; i += 2) nv.push(...reflectPt(g, v[i], v[i + 1]));
        const kk = key(nv);
        if (!seen.has(kk)) { seen.add(kk); queue.push([nv, par ^ 1]); }
      }
    }
    // the tile's own decoration
    if (decor === 'none' || diam < minSize * 2.2) continue;
    const kind = decor === 'alternate' ? (par ? 'inner' : 'stars') : decor;
    if (kind === 'stars') {
      for (const [mx, my] of mids) cline([...S(cx, cy), ...S(cx + (mx - cx) * 0.8, cy + (my - cy) * 0.8)], 1);
    } else if (kind === 'inner') {
      const d = [];
      for (let i = 0; i <= v.length; i += 2) {
        const j = i % v.length;
        d.push(...S(cx + (v[j] - cx) * 0.55, cy + (v[j + 1] - cy) * 0.55));
      }
      cline(d, 1);
    } else if (kind === 'circles') {
      let m = Infinity;
      for (const [mx, my] of mids) m = Math.min(m, Math.hypot(mx - cx, my - cy));
      const d = [];
      const c = circlePts(cx, cy, m * 0.6, 24);
      for (let i = 0; i < c.length; i += 2) d.push(...S(c[i], c[i + 1]));
      cline(d, 1);
    }
  }
  cline(circlePts(0, 0, r0, 240), 0);
}

// A Julia set of z^d + c — d-fold symmetric, like the mandala round it — as the level
// lines of its smooth escape count, spaced so that each takes an equal share of the area,
// and the edge of the set itself.
function julia(r0) {
  const s = settings, d = clamp(Math.round(s.juliaPower), 2, 12);
  const ca = rad(s.juliaAngle), cr = s.juliaRadius / 100;
  const cx = cr * Math.cos(ca), cy = cr * Math.sin(ca);
  const res = Math.round(clamp(r0 * FRAME.R * 2 / 0.3, 120, 460));
  const zoom = Math.max(0.2, s.juliaZoom), maxIt = 64, logd = Math.log(d);
  const F = new Float64Array(res * res);
  const vals = [];
  const step = 2 * r0 / (res - 1);
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const X = -r0 + i * step, Y = -r0 + j * step;
      if (X * X + Y * Y > r0 * r0 * 0.995) { F[j * res + i] = NaN; continue; }
      let zx = X / r0 * zoom, zy = Y / r0 * zoom, it = 0, m2 = zx * zx + zy * zy;
      while (it < maxIt && m2 < 64) {
        let px = zx, py = zy;
        for (let k = 1; k < d; k++) { const t = px * zx - py * zy; py = px * zy + py * zx; px = t; }
        zx = px + cx; zy = py + cy;
        m2 = zx * zx + zy * zy;
        it++;
      }
      let mu = maxIt + 1;
      if (m2 >= 64) {
        mu = it + 1 - Math.log(Math.log(Math.sqrt(m2))) / logd;
        vals.push(mu);
      }
      F[j * res + i] = mu;
    }
  }
  vals.sort((a, b) => a - b);
  const L = clamp(Math.round(s.juliaLevels), 1, 60);
  const levels = new Set();
  for (let l = 0; l < L && vals.length; l++) {
    levels.add(+vals[Math.min(vals.length - 1, Math.floor((l + 0.5) / L * vals.length))].toFixed(4));
  }
  for (const lv of levels) for (const p of contour(F, res, res, -r0, -r0, step, step, lv)) cline(p, 1);
  for (const p of contour(F, res, res, -r0, -r0, step, step, maxIt + 0.5)) cline(p, 0);
  cline(circlePts(0, 0, r0, 240), 0);
}

// Apollonius's gasket: three circles in a circle, and in every gap between three that
// touch, the one circle that touches all three — found by flipping the fourth of a
// touching quadruple, k' = 2(k₁+k₂+k₃) − k₄, and the same for k·z.
function apollonian(r0) {
  const minR = centreGap() * 0.9;
  const r1 = r0 * (2 * Math.sqrt(3) - 3), dd = r0 - r1;
  const O = { k: -1 / r0, kx: 0, ky: 0 };
  const inner = [0, 1, 2].map(j => {
    const a = Math.PI / 2 + j * 2 * Math.PI / 3;
    return { k: 1 / r1, kx: dd * Math.cos(a) / r1, ky: dd * Math.sin(a) / r1 };
  });
  const draw = c => {
    const r = 1 / c.k, x = c.kx / c.k, y = c.ky / c.k;
    cline(circlePts(x, y, r, Math.max(16, Math.min(120, Math.round(r * FRAME.R * 2)))), 0);
    if (r > minR * 5) cline(circlePts(x, y, r * 0.82, 64), 1);
  };
  cline(circlePts(0, 0, r0, 240), 0);
  for (const c of inner) draw(c);
  const flip = (a, b, c, d) => ({
    k: 2 * (a.k + b.k + c.k) - d.k,
    kx: 2 * (a.kx + b.kx + c.kx) - d.kx,
    ky: 2 * (a.ky + b.ky + c.ky) - d.ky,
  });
  const [A, B, C] = inner;
  const stack = [[A, B, C, O], [O, A, B, C], [O, A, C, B], [O, B, C, A]];
  let count = 0;
  while (stack.length && count < 5000) {
    const [a, b, c, d] = stack.pop();
    const n = flip(a, b, c, d);
    if (!(n.k > 0) || 1 / n.k < minR) continue;
    draw(n);
    count++;
    stack.push([a, b, n, c], [a, c, n, b], [b, c, n, a]);
  }
}

// The mandala again inside its own heart, and again inside that, each turned a little
// further: a tunnel.
function droste(r0) {
  const s = settings;
  let scale = r0, rot = 0, level = 0;
  while (scale * FRAME.R * (1 - r0) > 2.5 && level < 14) {
    rot += rad(s.drosteTwist);
    for (const ring of RINGS) drawRing(ring, scale, rot + ringOffset(ring), L_CENTRE);
    drawBorders(scale, rot, L_CENTRE);
    scale *= r0;
    level++;
  }
  const g = centreGap();
  for (let j = 1; j <= 3; j++) if (scale * j / 3 > g) cline(circlePts(0, 0, scale * j / 3, 48), j === 3 ? 0 : 1);
}

// A times table round a circle: point i joined to point m·i, the cardioid at m = 2, the
// nephroid at 3, and on.
function stringArt(r0) {
  const s = settings, n = sym();
  const N = Math.max(n, n * Math.round(clamp(s.stringPoints, 6, 720) / n));
  const m = s.stringMult;
  cline(circlePts(0, 0, r0, 240), 0);
  for (let i = 0; i < N; i++) {
    const a = 2 * Math.PI * i / N, b = 2 * Math.PI * ((i * m) % N) / N;
    if (Math.abs(wrapAngle(a - b)) < 1e-6) continue;
    cline([r0 * Math.cos(a), r0 * Math.sin(a), r0 * Math.cos(b), r0 * Math.sin(b)], 1);
  }
}

// Star polygons {N/q} nested inside one another, every other one turned half a point.
function stars(r0) {
  const s = settings, n = sym(), N = n >= 5 ? n : 2 * n, g = centreGap();
  const kk = clamp(Math.round(s.centreDetail) + 1, 1, 8);
  const qmax = Math.max(2, Math.floor((N - 1) / 2));
  for (let l = 0; l < kk; l++) {
    const r = r0 * (0.97 - l * 0.85 / kk);
    if (r < g * 2) break;
    const q = 2 + (l % Math.max(1, qmax - 1));
    const rot = (l % 2) * Math.PI / N;
    const gc = gcd(N, q);
    for (let st = 0; st < gc; st++) {
      const p = [];
      let j = st;
      do {
        const a = rot + 2 * Math.PI * j / N;
        p.push(r * Math.cos(a), r * Math.sin(a));
        j = (j + q) % N;
      } while (j !== st);
      p.push(p[0], p[1]);
      cline(p, l ? 1 : 0);
    }
    cline(circlePts(0, 0, r, 120), 1);
  }
  diskMap(0, 0);
  LAY = L_CENTRE; setPen(cpen(0));
  discFill(MX, MY, Math.max(PW * 0.5, r0 * FRAME.R * 0.06));
}

function gcd(a, b) { while (b) { const t = a % b; a = b; b = t; } return a; }

// Nineteen circles of one radius on the hexagonal lattice: the seed and the flower of life.
function seedOfLife(r0) {
  const rho = r0 / 3, n = sym();
  const rot = Math.PI / 2 + (n % 6 === 0 ? 0 : Math.PI / n);
  const centres = [[0, 0]];
  for (let k = 0; k < 6; k++) {
    const a = rot + k * Math.PI / 3;
    centres.push([rho * Math.cos(a), rho * Math.sin(a)]);
    centres.push([2 * rho * Math.cos(a), 2 * rho * Math.sin(a)]);
    const b = a + Math.PI / 6;
    centres.push([rho * Math.sqrt(3) * Math.cos(b), rho * Math.sqrt(3) * Math.sin(b)]);
  }
  centres.forEach(([x, y], i) => cline(circlePts(x, y, rho, 72), i < 7 ? 0 : 1));
  cline(circlePts(0, 0, r0, 240), 0);
}

function bindu(r0) {
  const g = centreGap();
  const kk = fitK(r0, Math.round(settings.centreDetail) + 2, g * 1.6);
  for (let j = 0; j <= kk; j++) cline(circlePts(0, 0, r0 * (1 - j / (kk + 1)), 120), j ? 1 : 0);
  diskMap(0, 0);
  LAY = L_CENTRE; setPen(cpen(0));
  discFill(MX, MY, Math.max(PW * 0.5, r0 * FRAME.R * 0.15));
}

////////////////////////////////////////////////////////////////////////////////////////
// Borders, the aura and the background

// Every other ring turned half a cell, so its motifs sit between the ones below.
function ringOffset(ring) {
  return settings.stagger && ring.i % 2 ? Math.PI / ring.cells : 0;
}

function drawBorders(scale, rot, layer) {
  if (settings.centre !== 'none') drawBorderAt(centreRadius(), 'double', RINGS.length ? RINGS[0].cells : sym(), scale, rot, layer);
  for (const ring of RINGS) drawBorderAt(ring.rout, ring.border, ring.cells, scale, rot + ringOffset(ring), layer);
}

function drawBorderAt(r, style, cells, scale, rot, layer) {
  drawBorder(r, style, cells, 0, scale, rot);
  if (layer !== L_BORDERS) {
    // drawn into another layer: retag what was just laid
    for (let i = SINK.lay.length - 1; i >= 0 && SINK.lay[i] === L_BORDERS; i--) SINK.lay[i] = layer;
  }
}

function auraExtent() {
  const s = settings;
  const gap = Math.max(s.auraGap, gapFor([penIdx(s.auraPen)])) / FRAME.R;
  return Math.round(s.aura) * gap * (1 + s.auraWave / 100) + (s.auraWave / 100) * 1.1;
}

function drawAura() {
  const s = settings, n = sym(), A = clamp(Math.round(s.aura), 0, 60);
  if (!A) return;
  LAY = L_AURA;
  setPen(penIdx(s.auraPen));
  const gap = Math.max(s.auraGap, gapFor([penIdx(s.auraPen)])) / FRAME.R;
  const lobes = n * Math.max(1, Math.round(s.auraLobes)), wv = s.auraWave / 100;
  const m = Math.max(360, lobes * 24);
  for (let j = 1; j <= A; j++) {
    const base = 1 + j * gap, ph = (j % 2) * Math.PI, p = [];
    for (let i = 0; i <= m; i++) {
      const a = 2 * Math.PI * i / m, r = base * (1 + wv * Math.cos(lobes * a + ph));
      p.push(r * Math.cos(a), r * Math.sin(a));
    }
    walk(p, diskMap);
  }
}

function backgroundStart() {
  return 1 + auraExtent() + Math.max(0, settings.bgGap) / FRAME.R;
}

function drawBackground() {
  const s = settings, n = sym();
  const Rb = backgroundStart();
  if (s.background === 'none' || Rb >= FAR) return;
  NOWARP = !s.warpBackground;
  LAY = L_BACK;
  const pen = penIdx(s.backgroundPen);
  setPen(pen);
  const sp = Math.max(s.bgSpacing, gapFor([pen])) / FRAME.R;
  const mult = Math.max(1, Math.round(s.bgMult));
  switch (s.background) {
    case 'rays': {
      const N = n * mult * 2;
      for (let j = 0; j < N; j++) {
        const a = 2 * Math.PI * j / N, r1 = Rb * (j % 2 ? 1.05 : 1);
        walk([r1 * Math.cos(a), r1 * Math.sin(a), FAR * Math.cos(a), FAR * Math.sin(a)], diskMap);
      }
      break;
    }
    case 'ripples':
      for (let r = Rb; r < FAR; r += sp) walk(circlePts(0, 0, r, Math.max(180, Math.round(r * 120))), diskMap);
      break;
    case 'interference': {
      const off = 0.32;
      for (const ox of [-off, off]) {
        for (let r = sp; r < FAR + off; r += sp) {
          for (const q of clipCircle(circlePts(ox, 0, r, Math.max(120, Math.round(r * 120))), Rb, 1)) walk(q, diskMap);
        }
      }
      break;
    }
    case 'tunnel': {
      const N = n * mult, T = Math.log(FAR / Rb);
      for (let j = 0; j < N; j++) {
        for (const dir of [1, -1]) {
          const p = [];
          for (let i = 0; i <= 64; i++) {
            const t = T * i / 64, r = Rb * Math.exp(t), a = 2 * Math.PI * j / N + dir * t;
            p.push(r * Math.cos(a), r * Math.sin(a));
          }
          walk(p, diskMap);
        }
      }
      break;
    }
    case 'op-art':
      for (let y = -FAR; y <= FAR; y += sp) {
        for (const q of clipCircle([-FAR, y, 0, y, FAR, y], Rb, 1)) walk(q, diskMap);
      }
      break;
    case 'motif': {
      const motif = MOTIFS[s.bgMotif] ? s.bgMotif : 'florets';
      const N = n * mult, Wc = 2 * Math.PI / N, Hb = Wc / MOTIFS[motif].a;
      const B = Math.ceil(Math.log(FAR / Rb) / Hb);
      for (let b = 0; b < B && b < 60; b++) {
        const ring = { i: 100, rin: Rb * Math.exp(b * Hb), H: Hb, motif, cells: N, spin: b % 2 ? -1 : 1 };
        drawRing(ring, 1, s.stagger && b % 2 ? Wc / 2 : 0, L_BACK);
      }
      break;
    }
  }
  NOWARP = false;
}

////////////////////////////////////////////////////////////////////////////////////////
// Broad strokes — what the markers draw
//
// Bands of a marker round the ring borders, or rings filled solid with it in concentric
// passes, half a nib in from either edge; bindus — dabs or discs — on a ring's cells or
// in the middle; and broad rays under everything.

function fillAnnulus(a, b) {
  const w = PW / FRAME.R, p = w * clamp(settings.fillPass, 20, 200) / 100;
  const lo = a + w / 2, hi = b - w / 2;
  if (hi < lo) { walk(circlePts(0, 0, (a + b) / 2, 240), diskMap); return; }
  const m = Math.max(1, Math.ceil((hi - lo) / p));
  for (let j = 0; j <= m; j++) {
    const r = lo + (hi - lo) * j / m;
    if (r <= 0) { diskMap(0, 0); emitDab(MX, MY); continue; }
    walk(circlePts(0, 0, r, Math.max(90, Math.round(r * FRAME.R * 2))), diskMap);
  }
}

function drawBroad() {
  const s = settings, n = sym(), r0 = centreRadius();
  if (s.bands !== 'none') {
    LAY = L_BANDS;
    setPen(penIdx(s.bandsPen));
    if (s.bands === 'borders') {
      walk(circlePts(0, 0, r0, 240), diskMap);
      for (const ring of RINGS) walk(circlePts(0, 0, ring.rout, 360), diskMap);
    } else if (s.bands === 'alternate rings') {
      RINGS.forEach((ring, i) => { if (i % 2 === 0) fillAnnulus(ring.rin, ring.rout); });
    } else if (s.bands === 'outer ring' && RINGS.length) {
      const ring = RINGS[RINGS.length - 1];
      fillAnnulus(ring.rin, ring.rout);
    } else if (s.bands === 'centre') {
      fillAnnulus(0, r0);
    }
  }
  if (s.bindus !== 'none') {
    LAY = L_BINDUS;
    setPen(penIdx(s.bindusPen));
    const dot = (x, y) => {
      diskMap(x, y);
      if (s.bindusSize <= PW * 1.05) emitDab(MX, MY);
      else discFill(MX, MY, s.bindusSize / 2);
    };
    if (s.bindus === 'centre') dot(0, 0);
    const which = s.bindus === 'every ring' ? RINGS : RINGS.filter(r => r.i === clamp(Math.round(s.bindusRing), 1, RINGS.length) - 1);
    for (const ring of which) {
      const N = Math.min(ring.cells, 240), rr = (ring.rin + ring.rout) / 2;
      for (let k = 0; k < N; k++) {
        const a = ringOffset(ring) + 2 * Math.PI * (k + 0.5) / N;
        dot(rr * Math.cos(a), rr * Math.sin(a));
      }
    }
  }
  if (s.mrays > 0) {
    LAY = L_MRAYS;
    setPen(penIdx(s.mraysPen));
    const N = n * Math.round(s.mrays);
    for (let j = 0; j < N; j++) {
      const a = 2 * Math.PI * (j + 0.5) / N;
      walk([r0 * Math.cos(a), r0 * Math.sin(a), FAR * Math.cos(a), FAR * Math.sin(a)], diskMap);
    }
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Everything, in order

function buildShapes() {
  ensureNoise();
  makeFrame();
  makeWarp();
  SINK = makeSink();
  AREAS = [];
  for (let i = 0; i < SLOTS; i++) AREAS.push(penArea(i));
  if (AREAS.every(A => A.w <= 0 || A.h <= 0)) return null;
  WALKED = 0;
  RINGS = makeRings();

  drawBroad();
  drawBackground();
  drawAura();
  drawCentre();
  for (const ring of RINGS) drawRing(ring, 1, ringOffset(ring), L_RINGS);
  drawBorders(1, 0, L_BORDERS);

  counts = { rings: RINGS.length, cells: RINGS.reduce((a, r) => a + r.cells, 0), walked: WALKED };
  const S = SINK;
  perPen = [];
  for (let i = 0; i < SLOTS; i++) perPen.push({ strokes: 0, ink: 0 });
  perLayer = LAYERS.map(() => ({ strokes: 0, ink: 0, pens: new Set() }));
  for (let i = 0; i < S.ink.length; i++) {
    perPen[S.ink[i]].strokes++;
    perLayer[S.lay[i]].strokes++;
    perLayer[S.lay[i]].pens.add(S.ink[i]);
  }
  return {
    pts: Float64Array.from(S.pts),
    off: Int32Array.from(S.off),
    ink: Int32Array.from(S.ink),
    lay: Int32Array.from(S.lay),
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

// The rings as laid out before the warp, where the background starts, and the margin.
// Never plotted.
function drawGuides(ctx) {
  const dark = luma(settings.paperColor) < 0.25;
  const col = dark ? 'rgba(110, 200, 255, 0.85)' : 'rgba(26, 109, 209, 0.8)';
  ctx.strokeStyle = col;
  ctx.lineWidth = 0.35;
  const A = penArea(0);
  ctx.setLineDash([2, 1.5]);
  ctx.strokeRect(A.x0, A.y0, A.w, A.h);
  ctx.setLineDash([1.2, 1.2]);
  const circ = r => { ctx.beginPath(); ctx.arc(FRAME.cx, FRAME.cy, r * FRAME.R, 0, 2 * Math.PI); ctx.stroke(); };
  circ(centreRadius());
  for (const ring of RINGS) circ(ring.rout);
  ctx.setLineDash([4, 2]);
  circ(backgroundStart());
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(FRAME.cx - 3, FRAME.cy); ctx.lineTo(FRAME.cx + 3, FRAME.cy);
  ctx.moveTo(FRAME.cx, FRAME.cy - 3); ctx.lineTo(FRAME.cx, FRAME.cy + 3);
  ctx.stroke();
}

////////////////////////////////////////////////////////////////////////////////////////
// The mouse and the keys
//
// A drag turns the mandala about its middle, shift-drag (or a right-drag) moves it, the
// wheel winds the vortex in its middle tighter or looser.

let settleTimer = null;

function settle() {
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => { settleTimer = null; update(); }, 250);
}

function sheetPoint(e) {
  const c = canvasEl(), r = c.getBoundingClientRect();
  const [W, H] = paperDims();
  return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
}

function attachPointer() {
  const c = canvasEl();
  c.addEventListener('contextmenu', e => e.preventDefault());
  c.addEventListener('pointerdown', e => {
    const s = settings;
    const [x, y] = sheetPoint(e);
    drag = {
      at: [x, y], move: e.shiftKey || e.button === 2, rot: s.rotation,
      a0: Math.atan2(y - FRAME.cy, x - FRAME.cx), cx: s.centreX, cy: s.centreY, moved: false,
      sx: e.clientX, sy: e.clientY,
    };
    c.setPointerCapture(e.pointerId);
    c.classList.add('dragging');
  });
  c.addEventListener('pointermove', e => {
    if (!drag) return;
    const s = settings;
    if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 2) drag.moved = true;
    if (!drag.moved) return;
    const [x, y] = sheetPoint(e);
    const [W, H] = paperDims();
    if (drag.move) {
      s.centreX = +clamp(drag.cx + (x - drag.at[0]) / W * 100, -50, 150).toFixed(2);
      s.centreY = +clamp(drag.cy + (y - drag.at[1]) / H * 100, -50, 150).toFixed(2);
    } else {
      const a = Math.atan2(y - FRAME.cy, x - FRAME.cx);
      s.rotation = +(((drag.rot + (a - drag.a0) * 180 / Math.PI) + 540) % 360 - 180).toFixed(1);
    }
    for (const k of ['rotation', 'centreX', 'centreY']) if (setters[k]) setters[k](s[k]);
    liveUpdate();
  });
  const end = e => {
    if (!drag) return;
    drag = null;
    c.classList.remove('dragging');
    try { c.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
    update();
  };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', end);
  c.addEventListener('wheel', e => {
    e.preventDefault();
    const s = settings;
    s.twist = +clamp(s.twist - e.deltaY * 0.15, -720, 720).toFixed(1);
    if (setters.twist) setters.twist(s.twist);
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
    const cycle = (key, list, dir) => {
      s[key] = list[(list.indexOf(s[key]) + dir + list.length) % list.length];
      refreshControls();
      update();
    };
    switch (e.key) {
      case 'ArrowLeft':  s.rotation = +(s.rotation - step).toFixed(1); refreshControls(); update(); break;
      case 'ArrowRight': s.rotation = +(s.rotation + step).toFixed(1); refreshControls(); update(); break;
      case 'ArrowUp':    s.twist = +(s.twist + step * 5).toFixed(1); refreshControls(); update(); break;
      case 'ArrowDown':  s.twist = +(s.twist - step * 5).toFixed(1); refreshControls(); update(); break;
      case 'r': case 'R': s.seed = Math.floor(Math.random() * 100000); refreshControls(); update(); break;
      case '[': s.seed = Math.max(0, Math.round(s.seed) - 1); refreshControls(); update(); break;
      case ']': s.seed = Math.round(s.seed) + 1; refreshControls(); update(); break;
      case 'c': cycle('centre', CENTRES, 1); break;
      case 'C': cycle('centre', CENTRES, -1); break;
      case 'b': cycle('background', BACKGROUNDS, 1); break;
      case 'B': cycle('background', BACKGROUNDS, -1); break;
      case 'm': case 'M':
        for (let i = 1; i <= MAX_RINGS; i++) s[`ring${i}`] = 'auto';
        s.seed = Math.floor(Math.random() * 100000);
        refreshControls(); update();
        break;
      case 't': case 'T': {
        const k = (SCENES.findIndex(sc => sc.label === lastScene) + 1) % SCENES.length || 1;
        applyScene(SCENES[k]);
        break;
      }
      case 'g': case 'G': s.showGuides = !s.showGuides; refreshControls(); drawPreview(); syncUrl(); break;
      default: return;
    }
    e.preventDefault();
  });
}

////////////////////////////////////////////////////////////////////////////////////////
// Controls
//
// A section folds away under its heading; which ones are folded is remembered by the
// browser, not by the link.

let lastScene = '';

function foldedSet() {
  try { return new Set(JSON.parse(localStorage.getItem('p5js18-folded') || '[]')); }
  catch (e) { return new Set(); }
}

function saveFolded(set) {
  try { localStorage.setItem('p5js18-folded', JSON.stringify([...set])); } catch (e) { /* no storage */ }
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
function addNote(parent, html) { createDiv(html).parent(parent).class('note'); }

function setVisible(key, on) {
  if (fieldDivs[key]) fieldDivs[key].style('display', on ? '' : 'none');
}

function syncVisibility() {
  const s = settings;
  setVisible('orientation', s.paper !== 'custom');
  setVisible('customW', s.paper === 'custom');
  setVisible('customH', s.paper === 'custom');
  const K = clamp(Math.round(s.rings), 0, MAX_RINGS);
  for (let i = 1; i <= MAX_RINGS; i++) setVisible(`ring${i}`, i <= K);
  const c = s.centre;
  setVisible('centreSize', c !== 'none');
  setVisible('centreDetail', ['chrysanthemum', 'stars', 'bindu'].includes(c));
  for (const k of ['chrysCount', 'chrysShape']) setVisible(k, c === 'chrysanthemum');
  for (const k of ['hypP', 'hypQ', 'hypDecor']) setVisible(k, c === 'hyperbolic');
  for (const k of ['juliaPower', 'juliaAngle', 'juliaRadius', 'juliaZoom', 'juliaLevels']) setVisible(k, c === 'julia');
  for (const k of ['stringMult', 'stringPoints']) setVisible(k, c === 'string');
  setVisible('drosteTwist', c === 'droste');
  setVisible('twistReach', s.twist !== 0);
  setVisible('breatheLobes', s.breathe !== 0);
  setVisible('rippleFreq', s.ripple !== 0);
  setVisible('meltScale', s.melt !== 0);
  for (const k of ['auraGap', 'auraWave', 'auraLobes']) setVisible(k, s.aura > 0);
  const bg = s.background;
  setVisible('bgMotif', bg === 'motif');
  setVisible('bgMult', ['motif', 'rays', 'tunnel'].includes(bg));
  setVisible('bgSpacing', ['ripples', 'interference', 'op-art'].includes(bg));
  for (const k of ['bgGap', 'warpBackground', 'backgroundPen']) setVisible(k, bg !== 'none');
  setVisible('bandsPen', s.bands !== 'none');
  for (const k of ['bindusRing', 'bindusSize', 'bindusPen']) setVisible(k, s.bindus !== 'none');
  setVisible('bindusRing', s.bindus === 'ring');
  setVisible('mraysPen', s.mrays > 0);
  setVisible('auraPen', s.aura > 0);
  refreshPenList();
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

function addSeedField(parent) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs.seed = field;
  createSpan('Seed').parent(field).class('label');
  const row = createDiv('').parent(field).class('row');
  const num = createInput(String(settings.seed)).parent(row);
  num.attribute('type', 'text');
  num.attribute('inputmode', 'numeric');
  const btn = createButton('Roll').parent(row).class('inline-btn');
  createDiv('The motifs of the rings left to chance, the variant each ring draws its motif ' +
    'in, the mazes and the melting. <b>R</b> rolls a new one, <b>[</b> and <b>]</b> step ' +
    'through them, <b>M</b> sets every ring to chance and rolls.').parent(field).class('note');
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

function buildControls() {
  const root = select('#controls');
  const resync = () => { syncVisibility(); update(); };
  let sec;

  sec = addSection(root, 'Trip');
  const sceneSel = createSelect().parent(createDiv('').parent(sec).class('field'));
  for (const sc of SCENES) sceneSel.option(sc.label);
  sceneSel.changed(() => {
    const sc = SCENES[sceneSel.elt.selectedIndex];
    if (sc && sc.s) applyScene(sc);
    sceneSel.elt.selectedIndex = 0;
  });
  addNote(sec, '<b>T</b> steps through the trips.');

  // --- the mandala ---
  sec = addSection(root, 'Mandala');
  addSeedField(sec);
  addSlider(sec, 'Symmetry', 'symmetry', 2, 48, 1,
    'How many times everything goes round. Every ring is cut into a multiple of it.');
  addSlider(sec, 'Size (%)', 'size', 10, 300, 1,
    'The rim against the room inside the margin. Past 100 it runs off the sheet.');
  addSlider(sec, 'Across (% of the sheet)', 'centreX', -50, 150, 0.5, 'Shift-drag moves it.');
  addSlider(sec, 'Down (% of the sheet)', 'centreY', -50, 150, 0.5);
  addSlider(sec, 'Turn (°)', 'rotation', -180, 180, 0.5, 'A drag on the sheet turns it.');
  addSlider(sec, 'Rings', 'rings', 0, MAX_RINGS, 1);
  addSelect(sec, 'Rings spaced', 'ringSpacing', SPACINGS, update,
    '<b>growing</b> — wider as they go out, every ring\'s cells the same shape; <b>even</b>; ' +
    '<b>random</b>.');
  addSelect(sec, 'Cells in a ring', 'cells', CELLINGS, update,
    '<b>fit</b> — a multiple of the symmetry that gives each motif the shape it likes; ' +
    '<b>same</b> — the symmetry, every ring; <b>doubling</b> — twice as many every other ring.');
  addCheckbox(sec, 'Every other ring turned half a cell', 'stagger');
  addSlider(sec, 'Heart (% of the radius)', 'centreSize', 3, 92, 1);
  addSlider(sec, 'Detail', 'detail', 0, 12, 1,
    'Nested petals, rows, levels, contour lines at the most — fewer where they would crowd.');
  addSlider(sec, 'Closest two lines (mm)', 'minGap', 0.2, 12, 0.05,
    'Nothing nests closer than this, nor closer than two nibs of the pen that draws it. ' +
    'Raise it with a marker.');
  addSelect(sec, 'Borders', 'borders', BORDERS, update,
    'The line between two rings: a circle, two, beads, dots, teeth — <b>mixed</b> by chance.');

  sec = addSection(root, 'Rings');
  addNote(sec, 'From the heart outward. <b>auto</b> leaves a ring to chance, by the weights ' +
    'below and the seed.');
  for (let i = 1; i <= MAX_RINGS; i++) addSelect(sec, `Ring ${i}`, `ring${i}`, RING_CHOICES, update);
  addSub(sec, 'How often each comes up, left to chance');
  for (const m of MOTIF_NAMES) addSlider(sec, m, MOTIFS[m].w, 0, 100, 1);

  // --- the heart ---
  sec = addSection(root, 'Heart');
  addSelect(sec, 'Heart', 'centre', CENTRES, resync,
    '<b>chrysanthemum</b> — florets by the golden angle; <b>hyperbolic</b> — the Poincaré disk ' +
    'tiled; <b>julia</b> — z^d + c; <b>apollonian</b> — circles in the gaps of circles; ' +
    '<b>droste</b> — the mandala inside itself; <b>string</b> — a times table round a circle; ' +
    '<b>stars</b>; <b>seed of life</b>; <b>bindu</b>. <b>C</b> steps through them.');
  addSlider(sec, 'Its detail', 'centreDetail', 0, 8, 1);
  addSlider(sec, 'Florets', 'chrysCount', 8, 2000, 1);
  addSelect(sec, 'Floret', 'chrysShape', CHRYS, update);
  addSlider(sec, 'Sides of a tile (p)', 'hypP', 3, 12, 1,
    'A tiling {p, q} is hyperbolic when (p − 2)(q − 2) > 4: {7, 3}, {5, 4}, {4, 5}, {8, 3}…');
  addSlider(sec, 'Tiles round a corner (q)', 'hypQ', 3, 12, 1);
  addSelect(sec, 'In every tile', 'hypDecor', HYP_DECOR, update);
  addSlider(sec, 'Power d', 'juliaPower', 2, 12, 1, 'The set has d-fold symmetry.');
  addSlider(sec, 'c, angle (°)', 'juliaAngle', 0, 360, 0.5);
  addSlider(sec, 'c, radius (%)', 'juliaRadius', 0, 150, 0.5);
  addSlider(sec, 'Zoom', 'juliaZoom', 0.3, 4, 0.01);
  addSlider(sec, 'Level lines', 'juliaLevels', 1, 60, 1);
  addSlider(sec, 'Multiplier', 'stringMult', 1, 60, 0.01, '2 is a cardioid, 3 a nephroid.');
  addSlider(sec, 'Points', 'stringPoints', 12, 720, 1);
  addSlider(sec, 'Turn a level (°)', 'drosteTwist', -90, 90, 0.5);

  // --- the trip ---
  sec = addSection(root, 'Trip warp');
  addNote(sec, 'Everything is pushed through these before it reaches the paper — each keeps the ' +
    'symmetry. The wheel winds the vortex.');
  addSlider(sec, 'Vortex (°)', 'twist', -720, 720, 1, 'The middle turned, less and less outward.');
  addSlider(sec, 'Vortex reach (% of the radius)', 'twistReach', 2, 300, 1);
  addSlider(sec, 'Swirl (°)', 'swirl', -360, 360, 1, 'A turn that grows outward, this much at the rim.');
  addSlider(sec, 'Breathe (%)', 'breathe', 0, 30, 0.1, 'The radius swelling in lobes.');
  addSlider(sec, 'Lobes (× the symmetry)', 'breatheLobes', 1, 6, 1);
  addSlider(sec, 'Ripple (%)', 'ripple', 0, 10, 0.05, 'Waves running out from the middle.');
  addSlider(sec, 'Ripples across the radius', 'rippleFreq', 1, 40, 0.5);
  addSlider(sec, 'Bulge (%)', 'bulge', 30, 300, 1, 'Under 100 the middle swells, over 100 it shrinks.');
  addSlider(sec, 'Melt (%)', 'melt', 0, 20, 0.1, 'The radius pushed by noise folded into the symmetry.');
  addSlider(sec, 'Melt scale', 'meltScale', 0.3, 20, 0.1);
  addCheckbox(sec, 'Warp the background too', 'warpBackground');

  // --- aura and background ---
  sec = addSection(root, 'Aura and background');
  addSlider(sec, 'Aura', 'aura', 0, 40, 1, 'Echoes round the rim, waving in turn.');
  addPenSelect(sec, 'Pen', 'auraPen');
  addSlider(sec, 'Aura gap (mm)', 'auraGap', 0.5, 30, 0.1);
  addSlider(sec, 'Aura wave (%)', 'auraWave', 0, 20, 0.1);
  addSlider(sec, 'Aura lobes (× the symmetry)', 'auraLobes', 1, 6, 1);
  addSelect(sec, 'Background', 'background', BACKGROUNDS, resync,
    '<b>motif</b> — bands of a ring motif growing out to the edges; <b>rays</b>; ' +
    '<b>ripples</b>; <b>interference</b> — two systems of ripples, a moiré; <b>tunnel</b> — ' +
    'spirals both ways; <b>op-art</b> — parallel lines bent by the warp. <b>B</b> steps.');
  addPenSelect(sec, 'Pen', 'backgroundPen');
  addSelect(sec, 'Background motif', 'bgMotif', MOTIF_NAMES, update);
  addSlider(sec, 'Round it (× the symmetry)', 'bgMult', 1, 16, 1);
  addSlider(sec, 'Spacing (mm)', 'bgSpacing', 0.4, 20, 0.1);
  addSlider(sec, 'Gap from the aura (mm)', 'bgGap', 0, 60, 0.5);

  // --- the markers ---
  sec = addSection(root, 'Broad strokes — markers');
  addNote(sec, 'Drawn with whichever pen each is given — meant for the 3–15 mm ink markers. ' +
    'They go down first, under the fine lines (see <b>Pens</b>).');
  addSelect(sec, 'Bands', 'bands', BANDS, resync,
    '<b>borders</b> — a marker line on every border; <b>alternate rings</b>, <b>outer ring</b>, ' +
    '<b>centre</b> — filled solid in concentric passes.');
  addPenSelect(sec, 'Pen', 'bandsPen');
  addSelect(sec, 'Bindus', 'bindus', BINDUS, resync, 'Dabs or discs: in the middle, or on a ring\'s cells.');
  addPenSelect(sec, 'Pen', 'bindusPen');
  addSlider(sec, 'On ring', 'bindusRing', 1, MAX_RINGS, 1);
  addSlider(sec, 'Size (mm)', 'bindusSize', 0, 40, 0.5, '0 — one dab of the nib.');
  addSlider(sec, 'Broad rays (× the symmetry)', 'mrays', 0, 8, 1);
  addPenSelect(sec, 'Pen', 'mraysPen');

  // --- pens ---
  sec = addSection(root, 'Pens');
  addNote(sec, 'Five pens, a pass of the plotter each. Changing the kind sets its colour and a ' +
    'usual width.');
  addPenSelect(sec, 'Heart', 'centrePen');
  addSelect(sec, 'Heart split', 'centreColour', CENTRE_COLOURS, update,
    '<b>outline and detail</b> — the detail in the second pen.');
  addPenSelect(sec, 'Rings', 'ringsPen');
  addPenSelect(sec, 'Second pen', 'accentPen');
  addSelect(sec, 'Rings split', 'ringColour', RING_COLOURS, update,
    '<b>outline and detail</b> — each motif\'s outline in the first pen, its nested lines in ' +
    'the second; <b>alternate rings</b>; <b>one</b>; <b>random rings</b>; <b>outer half</b>.');
  addPenSelect(sec, 'Borders', 'bordersPen');
  for (let i = 0; i < SLOTS; i++) addPenSlot(sec, i);
  addSlider(sec, 'Fill passes (% of the nib)', 'fillPass', 30, 150, 1,
    'How far apart the passes of a fill run. 85 overlaps them by 15 %.');
  addSelect(sec, 'Passes go down', 'underlay', UNDERLAYS, update,
    '<b>broad first</b> — the markers under the fine lines.');

  // --- paper ---
  sec = addSection(root, 'Paper');
  addSelect(sec, 'Size', 'paper', PAPERS, () => { syncVisibility(); resizeForPaper(); });
  addSelect(sec, 'Orientation', 'orientation', ['portrait', 'landscape'], resizeForPaper);
  addSlider(sec, 'Width (mm)', 'customW', 20, 2000, 1, '', resizeForPaper);
  addSlider(sec, 'Height (mm)', 'customH', 20, 2000, 1, '', resizeForPaper);
  addSlider(sec, 'Margin (mm)', 'margin', 0, 100, 1);
  addSelect(sec, 'Paper', 'paperTone', TONES, () => {
    if (PAPER_TONES[settings.paperTone]) {
      settings.paperColor = PAPER_TONES[settings.paperTone];
      setters.paperColor(settings.paperColor);
    }
    drawPreview(); updateStats(); syncUrl();
  }, 'The preview only — the files have no background. On dark paper only the markers ' +
     'and light inks show.');
  addColor(sec, 'Paper colour', 'paperColor');

  // --- output ---
  sec = addSection(root, 'Output');
  addCheckbox(sec, 'Order the strokes for the plotter', 'optimiseOrder');
  addCheckbox(sec, 'Follow the sliders live', 'liveUpdate', () => syncUrl());
  addCheckbox(sec, 'Show the rings before the warp', 'showGuides', () => { drawPreview(); syncUrl(); });
  createButton('Download SVG [everything]').parent(sec).class('primary')
    .mousePressed(() => exportSvg({ all: true }));
  createButton('Download SVG [one per pen]').parent(sec).mousePressed(() => exportSvg({ perPen: true }));
  const lb = createDiv('').parent(sec).class('layer-buttons');
  LAYERS.forEach((ly, li) => {
    layerButtons[li] = createButton('').parent(lb).mousePressed(() => exportSvg({ layer: li }));
  });
  addNote(sec, 'Everything is one file, a group per pen, each at its own width; one per pen ' +
    'is a pass each; a layer\'s file is that layer alone. Every file is the whole sheet in ' +
    'millimetres, so they land on one another.');
  addSlider(sec, 'Picture (dpi)', 'pngDpi', 50, 600, 10, '', () => syncUrl());
  createButton('Download PNG').parent(sec).mousePressed(exportPng);
  const row = createDiv('').parent(sec).class('btn-row');
  createButton('Copy link').parent(row).mousePressed(function () { copyLink(this); });
  createButton('Reset').parent(row).mousePressed(resetAll);

  sec = addSection(root, 'The sheet');
  statsDiv = createDiv('').parent(sec).class('stats');
  penListDiv = createDiv('').parent(sec).class('stats');
  createDiv('').parent(sec).class('note keys').html(
    '<div><kbd>drag</kbd> turn it · <kbd>shift</kbd>+<kbd>drag</kbd> move it</div>' +
    '<div><kbd>wheel</kbd> <kbd>↑</kbd> <kbd>↓</kbd> the vortex · <kbd>←</kbd> <kbd>→</kbd> turn</div>' +
    '<div><kbd>T</kbd> trip · <kbd>C</kbd> heart · <kbd>B</kbd> background · <kbd>G</kbd> guides</div>' +
    '<div><kbd>R</kbd> new seed · <kbd>[</kbd> <kbd>]</kbd> step it · <kbd>M</kbd> rings to chance</div>');
  linkDiv = createDiv('').parent(sec).class('link');
  refreshPenSelects();
  syncVisibility();
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
  const seconds = strokes * PEN_CYCLE_S + plan.ink / DRAW_SPEED + plan.travel / TRAVEL_SPEED;
  const motifs = RINGS.map(r => r.motif).join(', ');
  let html =
    `<div class="big"><b>${groupNum(strokes)}</b> strokes, ` +
    `<b>${(plan.ink / 1000).toFixed(1)}</b> m of line</div>` +
    `<div>${s.centre} heart · ${counts.rings} rings, ${groupNum(counts.cells)} cells — ${motifs}</div>` +
    `<div>Pen up for ${(plan.travel / 1000).toFixed(1)} m between strokes</div>` +
    `<div>Roughly <b>${formatDuration(seconds)}</b> to plot, every pass together · ` +
    `${lastMs.toFixed(0)} ms to build</div>`;
  const used = new Set();
  for (let i = 0; i < SLOTS; i++) if (perPen && perPen[i].strokes) used.add(i);
  for (const i of used) {
    if (contrast(penCol(i), s.paperColor) < 1.6) {
      html += `<div class="warn">Pen ${i + 1} (${penKind(i)}) will barely show on this paper.</div>`;
    }
  }
  if (s.centre === 'hyperbolic' && (s.hypP - 2) * (s.hypQ - 2) <= 4) {
    html += `<div class="warn">{${s.hypP}, ${s.hypQ}} is not hyperbolic — (p − 2)(q − 2) has to ` +
      `be over 4. Stars are drawn instead.</div>`;
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
// stroke-width is each pen's own nib and the caps are round, so the file previews as the
// finished plot looks. Strokes come out in the order the pen should visit them, and the
// link that rebuilds the sheet is written into the header comment.

function metaComment() {
  const s = settings;
  const pens = [];
  for (let i = 0; i < SLOTS; i++) if (perPen && perPen[i].strokes) pens.push(penLabel(i));
  return `hyperspace mandala — ${s.symmetry}-fold ${s.centre} heart, ` +
    `rings=[${RINGS.map(r => `${r.motif}×${r.cells}`).join(' ')}] ` +
    `warp=vortex${s.twist}/swirl${s.swirl}/breathe${s.breathe}/ripple${s.ripple}/melt${s.melt} ` +
    `aura=${s.aura} background=${s.background}${s.background === 'motif' ? '/' + s.bgMotif : ''} ` +
    `seed=${s.seed} pens=[${pens.join('; ')}] strokes=${strokes}`;
}

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
  return `hyperspace mandala ${s.symmetry}-fold ${s.centre} seed${s.seed} ${paper}`;
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
