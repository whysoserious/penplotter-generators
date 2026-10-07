////////////////////////////////////////////////////////////////////////////////////////
// Graphic score — a swarm of small signs strung together by lines of every kind, laid
// as a band of notation across the sheet
//
// The picture this started from is white on black: a few hundred little circles, rings,
// dots and triangles scattered along a band through the middle of the sheet, crowded
// into a few knots and thinning out towards its ends, and strung together by lines that
// are each drawn differently — plain, dashed, dotted, ticked like a ruler, zigzagged,
// beaded — ending in a tick, an arrow, a dot or a ring. Tally marks and small signs like
// letters are tucked in beside them, a few long arcs sweep through, and a few lines run
// far out of the band. It reads like a score for an instrument nobody has, or a star
// chart annotated by an engineer.
//
// It is built in layers, each with a pen of its own. The glyphs are scattered first, by
// rejection against a density — the band, or an ellipse, a ring, islands, the whole
// sheet — pulled into clusters and broken up by noise, never closer than a spacing. A
// few of them are hubs, larger signs that clear the glyphs from under them. Threads are
// walks from glyph to near glyph that like to keep going the way they were going; each
// is drawn in one line style, its pieces straight, bowed or bent at a right angle,
// stopped exactly at the edge of every glyph they reach, and now and then running on
// past their last glyph into an end mark. Stems are short sticks off a glyph, arcs are
// long curves through or round one, rays run out of the band, and a voice is one long
// line wandering through the whole score from one end to the other.
//
// The signs themselves are a chemist's, not the picture's: atoms as dots and circles,
// element symbols in circles or standing bare, rings of six and five, charges; hubs that
// are benzene rings, Bohr atoms, orbits, unit cells; marks that are skeletal chains,
// reaction arrows, orbitals, wedge bonds, ionic lattices and spectra; and labels naming
// compounds by formula or by their English name, in a stroke font of its own.
//
// Two pens draw all of that finely: black, and red for an accent — a share of it at
// random, whole clusters, a stretch of the band, its edges or its core — and for the
// voice. Three more are broad ink markers, 3 to 15 mm: notes laid on glyphs as dabs,
// discs or rings, staves running along the band like the lines of a stave, bars like
// the durations of a piano roll, and sweeps, long gestures behind the whole. A disc
// wider than the nib is filled the way a hand fills one: its edge once, half a nib in,
// then a spiral in passes a little closer than the nib is wide. On dark paper the white
// and silver markers come into their own.
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

const LAYOUTS = ['band', 'ellipse', 'ring', 'islands', 'sheet'];

// The signs at the joints, each with the setting that weighs how often it comes up. They
// are a chemist's: atoms as dots and circles, an element's symbol in a circle or standing
// bare where the bonds stop short of it, small rings of six and of five, charges.
const GLYPHS = [
  ['dot', 'gDot'], ['circle', 'gCircle'], ['element', 'gElement'], ['letter', 'gLetter'],
  ['hexagon', 'gHexagon'], ['pentagon', 'gPentagon'], ['charge', 'gCharge'],
  ['none', 'gNone'],
];
// which element a lettered glyph is, and how often
const ELEMENTS = [['C', 30], ['O', 20], ['N', 16], ['H', 9], ['S', 8], ['P', 5], ['F', 3],
                  ['Cl', 3], ['Br', 2], ['Si', 2], ['B', 2]];
const HUB_KINDS = ['benzene', 'bohr', 'orbitals', 'cell', 'furan'];
const STYLES = [
  ['solid', 'lsSolid'], ['dashed', 'lsDashed'], ['dotted', 'lsDotted'],
  ['dash-dot', 'lsDashDot'], ['double', 'lsDouble'], ['triple', 'lsTriple'],
  ['hashed', 'lsHashed'], ['ticked', 'lsTicked'], ['comb', 'lsComb'],
  ['ladder', 'lsLadder'], ['zigzag', 'lsZigzag'], ['wave', 'lsWave'],
  ['beaded', 'lsBeaded'], ['coil', 'lsCoil'],
];
const STYLE_NAMES = STYLES.map(s => s[0]);
const STYLE_CHOICES = ['mixed'].concat(STYLE_NAMES);
const CAPS = [
  ['none', 'capNone'], ['tick', 'capTick'], ['double tick', 'capDouble'],
  ['arrow', 'capArrow'], ['head', 'capHead'], ['dot', 'capDot'], ['circle', 'capCircle'],
  ['triangle', 'capTriangle'], ['square', 'capSquare'], ['fork', 'capFork'],
  ['flag', 'capFlag'],
];
const MARKS = [
  ['benzene', 'mkBenzene'], ['ring of five', 'mkRing5'], ['chain', 'mkChain'],
  ['reaction arrow', 'mkArrow'], ['atom', 'mkAtom'], ['orbital', 'mkOrbital'],
  ['charge', 'mkCharge'], ['lattice', 'mkLattice'], ['wedge', 'mkWedge'],
  ['spectrum', 'mkSpectrum'],
];
const LABEL_TEXTS = ['mixed', 'formulas', 'names'];
const NOTE_SHAPES = ['disc', 'ring', 'beside'];
const NOTE_PICKS  = ['hubs first', 'largest', 'random', 'clusters'];
const ACCENTS     = ['none', 'random', 'clusters', 'region', 'outskirts', 'core'];
const ACCENT_ON   = ['everything', 'glyphs', 'lines', 'marks', 'labels', 'glyphs and marks'];
const UNDERLAYS   = ['broad first', 'fine first', 'by pen number'];

// What goes on the sheet, one layer at a time, each with a pen of its own and a file of
// its own. The first eight are drawn finely, the last four with a broad marker.
const LAYERS = [
  { id: 'glyphs',  label: 'glyphs',  pen: 'glyphsPen' },
  { id: 'threads', label: 'threads', pen: 'threadsPen' },
  { id: 'stems',   label: 'stems',   pen: 'stemsPen' },
  { id: 'marks',   label: 'marks',   pen: 'marksPen' },
  { id: 'labels',  label: 'labels',  pen: 'labelsPen' },
  { id: 'arcs',    label: 'arcs',    pen: 'arcsPen' },
  { id: 'rays',    label: 'rays',    pen: 'raysPen' },
  { id: 'voices',  label: 'voices',  pen: 'voicesPen' },
  { id: 'notes',   label: 'notes',   pen: 'notesPen' },
  { id: 'staves',  label: 'staves',  pen: 'stavesPen' },
  { id: 'bars',    label: 'bars',    pen: 'barsPen' },
  { id: 'sweeps',  label: 'sweeps',  pen: 'sweepsPen' },
];
const L_GLYPHS = 0, L_THREADS = 1, L_STEMS = 2, L_MARKS = 3, L_LABELS = 4, L_ARCS = 5,
      L_RAYS = 6, L_VOICES = 7, L_NOTES = 8, L_STAVES = 9, L_BARS = 10, L_SWEEPS = 11;
const ACCENT_LAYERS = {
  'everything':       [L_GLYPHS, L_THREADS, L_STEMS, L_MARKS, L_LABELS, L_ARCS, L_RAYS],
  'glyphs':           [L_GLYPHS],
  'lines':            [L_THREADS, L_STEMS, L_ARCS, L_RAYS],
  'marks':            [L_MARKS],
  'labels':           [L_LABELS],
  'glyphs and marks': [L_GLYPHS, L_MARKS],
};

const MAX_STROKES   = 300_000;   // past this nothing is ordered, drawn or exported
const BUSY_STROKES  = 20_000;    // above this, warn about the plot time
const EPS           = 0.01;      // mm — the stub that stands in for a single dab
const SAG           = 0.02;      // mm — how far a circle's chords may stray from it
const CUT_STEP      = 0.3;       // mm — how finely a line is looked along for glyphs it crosses
const MIN_PIECE     = 0.25;      // mm — a piece of line shorter than this is not drawn
const PREVIEW_MAX_PX = 1500;
const PEN_CYCLE_S   = 0.3;
const DRAW_SPEED    = 60;
const TRAVEL_SPEED  = 150;

const settings = {
  // paper
  paper: 'A3',
  orientation: 'landscape',
  customW: 600,         // mm, when the size is custom
  customH: 420,
  margin: 15,
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

  // which pen each layer goes to
  glyphsPen: 1, threadsPen: 1, stemsPen: 1, marksPen: 1, labelsPen: 1, arcsPen: 1, raysPen: 1,
  voicesPen: 2, notesPen: 4, stavesPen: 3, barsPen: 3, sweepsPen: 5,

  // the accent — some of the fine layers moved to another pen
  accent: 'random',
  accentShare: 12,      // %
  accentPen: 2,
  accentOn: 'everything',

  // where the glyphs go
  seed: 1,
  layout: 'band',
  nodes: 300,
  unit: 2.5,            // mm — what every small thing is measured in
  spacing: 1.4,         // units — the closest two glyphs may stand
  bandX: 50,            // % of the sheet — the middle of the band
  bandY: 50,
  bandAngle: 0,         // °
  bandLength: 90,       // % of the sheet along the band
  bandWidth: 28,        // % of the sheet across it
  bandEdge: 30,         // % — how sharply the band ends at its sides
  bandSwell: 45,        // % — how much it thickens and thins along its length
  bandWave: 0,          // % of the sheet — how far it meanders
  bandWaveLen: 50,      // % of its length — one meander
  bands: 1,
  bandGap: 30,          // % of the sheet between two bands
  clusters: 5,
  clusterSize: 7,       // % of the sheet
  clusterPull: 62,      // % of the glyphs drawn to the clusters
  clumping: 50,         // % — the density broken up by noise
  clumpScale: 5,        // noise features along the sheet
  strays: 4,            // % of the glyphs scattered loosely round the shape

  // the glyphs
  glyphSize: 100,       // %
  sizeVariety: 40,      // %
  filled: 6,            // % of the circles and rings inked solid
  gDot: 30, gCircle: 50, gElement: 12, gLetter: 8, gHexagon: 9, gPentagon: 5, gCharge: 5,
  gNone: 24,
  hubs: 4,
  hubSize: 3.5,         // units — a hub's radius

  // threads, stems and the way lines meet the glyphs
  threads: 140,
  threadLen: 4,         // pieces at the most
  reach: 11,            // units — the longest piece
  straightness: 55,     // %
  curvy: 30,            // % of pieces bowed
  bulge: 22,            // % of a piece's length, at the most
  elbows: 8,            // % of pieces bent at a right angle
  spurs: 40,            // % of thread ends running on past their glyph
  spurLen: 3.5,         // units
  joinRest: 45,         // % of the glyphs no thread reached, joined to their nearest
  stems: 28,            // % of the glyphs with a stick off them
  stemLen: 2.8,         // units
  lineGap: 0.15,        // mm — between a line's end and the glyph it stops at
  knockout: true,       // lines stop at the glyphs they cross

  // line styles — how often each comes up, and the size of their pattern
  motif: 100,           // %
  lsSolid: 70, lsDashed: 12, lsDotted: 12, lsDashDot: 6, lsDouble: 8, lsTriple: 3,
  lsHashed: 5, lsTicked: 3, lsComb: 0, lsLadder: 0, lsZigzag: 2, lsWave: 3, lsBeaded: 4,
  lsCoil: 0,

  // what a free end of a line ends in
  capSize: 100,         // %
  capNone: 30, capTick: 16, capDouble: 4, capArrow: 12, capHead: 8, capDot: 18,
  capCircle: 16, capTriangle: 6, capSquare: 4, capFork: 4, capFlag: 3,

  // marks — small signs out of a chemist's notebook
  marks: 90,
  markSize: 180,        // %
  markAttach: 55,       // % beside a thread, the rest beside a glyph
  snap: 70,             // % of stems and marks squared to the band
  mkBenzene: 18, mkRing5: 9, mkChain: 20, mkArrow: 12, mkAtom: 6, mkOrbital: 8,
  mkCharge: 9, mkLattice: 5, mkWedge: 10, mkSpectrum: 6,

  // labels — compounds, by formula or by name
  labels: 26,
  labelText: 'mixed',
  labelSize: 100,       // % of the unit — the height of a capital
  labelAttach: 40,      // % beside a thread, the rest beside a glyph
  labelLeaders: 45,     // % of those beside a glyph that point at it

  // arcs
  arcs: 12,
  arcMin: 6,            // units — radius
  arcMax: 28,
  arcSweep: 110,        // ° at the most
  arcCentred: 35,       // % round a glyph rather than through one
  fullCircles: 12,      // %
  arcStyle: 'mixed',
  arcCaps: 45,          // % of arc ends with an end mark

  // rays
  rays: 6,
  rayMin: 12,           // % of the sheet across the band
  rayMax: 34,
  raySpread: 35,        // °
  rayCurve: 25,         // % bowed
  rayStyle: 'mixed',

  // voices
  voices: 1,
  voiceStyle: 'solid',
  voiceStep: 8,         // units between the glyphs it passes through
  voiceWander: 60,      // %
  voiceSmooth: true,

  // broad strokes — the markers
  notes: 0,
  noteSize: 0,          // mm — 0 is one dab of the nib
  noteShape: 'disc',
  notePick: 'hubs first',
  staves: 0,            // lines
  staveGap: 12,         // mm
  staveLen: 100,        // % of the band
  staveBreaks: 2,
  staveWobble: 0,       // mm
  bars: 0,
  barMin: 12,           // mm
  barMax: 55,
  barTilt: 0,           // °
  sweeps: 0,
  sweepLen: 55,         // % of the band
  sweepBend: 50,        // %

  // output
  optimiseOrder: true,
  liveUpdate: true,
  showGuides: false,
  pngDpi: 200,
};

const DEFAULTS = { ...settings };

// A handful of sheets worth starting from. Each one is the whole state.
const SCENES = [
  { label: '— select scene —' },
  { label: 'Black, a touch of red', s: {} },
  { label: 'A chemist\'s notebook: labels everywhere', s: {
      labels: 70, labelLeaders: 60, marks: 110, gElement: 22, gLetter: 16, gHexagon: 14,
      lsDouble: 14, lsHashed: 9, accent: 'random', accentShare: 10, voices: 0, rays: 4 } },
  { label: 'Formulas in red', s: {
      labels: 45, labelText: 'formulas', labelsPen: 2, accent: 'none', voices: 0 } },
  { label: 'White marker on black paper, large', s: {
      paper: 'B1', paperTone: 'black', paperColor: PAPER_TONES.black, unit: 18, nodes: 170,
      spacing: 1.5, pen1Kind: 'white marker', pen1W: 3, pen1Col: PEN_KINDS['white marker'].col,
      pen2Kind: 'red marker', pen2W: 3, pen2Col: PEN_KINDS['red marker'].col,
      accentShare: 8, voices: 0, marks: 45, markSize: 190, labels: 12, labelSize: 110,
      threads: 85, motif: 125, capSize: 120, lsTicked: 0, lsZigzag: 0, lsTriple: 0,
      lsDouble: 5, lsHashed: 4, mkLattice: 0, mkSpectrum: 3, capDouble: 0, capFork: 2,
      capHead: 0, filled: 0 } },
  { label: 'A red voice through a black score', s: {
      accent: 'none', voices: 2, voiceStyle: 'solid', voiceStep: 6, voiceWander: 80 } },
  { label: 'Red clusters', s: {
      accent: 'clusters', accentShare: 40, clusters: 6, clusterPull: 75, clusterSize: 6 } },
  { label: 'On silver staves, red notes', s: {
      staves: 5, staveGap: 9, staveBreaks: 3, notes: 9, noteSize: 0, notePick: 'hubs first',
      pen3W: 3, pen4W: 10, accent: 'none', voices: 0 } },
  { label: 'Red marker notes like Miró', s: {
      notes: 7, noteSize: 22, noteShape: 'beside', pen4W: 12, accent: 'random',
      accentShare: 6, hubs: 5, voices: 0 } },
  { label: 'Piano roll: silver bars under the signs', s: {
      bars: 26, barMin: 15, barMax: 70, pen3W: 6, accent: 'region', accentShare: 25,
      voices: 0, rays: 3 } },
  { label: 'Constellations: islands', s: {
      layout: 'islands', clusters: 7, clusterSize: 6, nodes: 200, strays: 8, threads: 90,
      arcs: 6, rays: 0, accent: 'clusters', accentShare: 30, voices: 0 } },
  { label: 'Orbit: a ring of notation', s: {
      layout: 'ring', bandLength: 70, bandWidth: 30, orientation: 'portrait', nodes: 230,
      rays: 10, rayMin: 6, rayMax: 18, arcs: 8, accent: 'outskirts', accentShare: 25,
      voices: 0 } },
  { label: 'A page of score: four systems', s: {
      orientation: 'portrait', bands: 4, bandGap: 21, bandWidth: 9, bandLength: 86,
      nodes: 380, spacing: 1.3, clusters: 8, clusterSize: 5, reach: 9, rays: 0, arcs: 6,
      arcMax: 12,
      staves: 5, staveGap: 3, pen3Kind: 'black', pen3W: 0.25, pen3Col: PEN_KINDS.black.col,
      staveBreaks: 1, voices: 0, accent: 'region', accentShare: 20 } },
  { label: 'Sparse: long lines, few signs', s: {
      nodes: 90, spacing: 3, reach: 22, threads: 45, threadLen: 3, marks: 25, labels: 12, arcs: 9,
      arcMax: 40, rays: 9, rayMax: 45, hubs: 3, voices: 1 } },
  { label: 'Dense swarm', s: {
      nodes: 520, spacing: 1.1, threads: 260, marks: 150, labels: 40, reach: 8, clusters: 7,
      clusterPull: 65, bandWidth: 24, unit: 2.2 } },
  { label: 'River: a meandering band', s: {
      bandWave: 22, bandWaveLen: 45, bandWidth: 16, bandSwell: 60, nodes: 260,
      accent: 'core', accentShare: 18, voices: 1 } },
  { label: 'Diagonal, with silver sweeps', s: {
      bandAngle: -24, bandLength: 100, sweeps: 4, sweepLen: 70, pen5Kind: 'silver marker',
      pen5W: 4, pen5Col: PEN_KINDS['silver marker'].col, accent: 'random', accentShare: 10 } },
  { label: 'Black paper: white, silver and red markers', s: {
      paper: 'B2', paperTone: 'black', paperColor: PAPER_TONES.black, unit: 15, nodes: 105,
      spacing: 1.6, pen1Kind: 'white marker', pen1W: 3, pen1Col: PEN_KINDS['white marker'].col,
      pen2Kind: 'red marker', pen2W: 3, pen2Col: PEN_KINDS['red marker'].col,
      pen3W: 6, pen4W: 15, staves: 3, staveGap: 30, staveBreaks: 4, notes: 6, noteSize: 0,
      hubSize: 2.4,
      accent: 'clusters', accentShare: 30, voices: 0, threads: 55, marks: 28, markSize: 190,
      labels: 8, labelSize: 110, motif: 125, capSize: 120, arcs: 7, rays: 4, lsZigzag: 0,
      lsTriple: 0, lsDouble: 5, mkLattice: 0, capHead: 0, filled: 0 } },
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

function lerp1(a, b, t) { return a + (b - a) * t; }

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

// A stream of random numbers of its own for every stage, so that asking for more marks
// does not move a single thread.
function rng(salt) {
  return mulberry32(Math.imul((settings.seed | 0) + 1, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca77));
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

// A table to draw names from by the weights the settings give them.
function weights(list) {
  const ids = [], w = [];
  let tot = 0;
  for (const [id, key] of list) {
    const v = Math.max(0, Number(settings[key]) || 0);
    if (v <= 0) continue;
    ids.push(id); w.push(v); tot += v;
  }
  return { ids, w, tot };
}

function pick(table, r) {
  if (!table.tot) return null;
  let x = r * table.tot;
  for (let i = 0; i < table.ids.length; i++) {
    x -= table.w[i];
    if (x < 0) return table.ids[i];
  }
  return table.ids[table.ids.length - 1];
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

// Called while a slider or the band is being dragged, once a frame at the most.
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
// Improved Perlin, seeded. It breaks the density up into clumps, meanders the band and
// swells it, and bends the sweeps.

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

let NZ = [], nzSeedNow = null;

function ensureNoise() {
  const seed = settings.seed | 0;
  if (seed === nzSeedNow) return;
  nzSeedNow = seed;
  NZ = [];
  for (let i = 0; i < 4; i++) NZ.push(makePerlin3(seed * 7919 + i * 1013 + 17));
}

////////////////////////////////////////////////////////////////////////////////////////
// The shape the glyphs are scattered over
//
// Every layout gives each point of the sheet a coordinate along the shape and one across
// it, and the density falls off across it as exp(−|across / half width|^p) — a soft
// gaussian at p = 2, a crisp edge at p = 12 — and the same, a little softer, towards its
// ends. A band is a strip at any angle, meandering and swelling with noise; several bands
// lie side by side like the systems of a page of music. An ellipse measures the two as
// one radius, a ring measures across from a circle. Islands are clusters alone.

let SHAPE = null;            // the frame of the layout
let SA = 0, SC = 0, SB = 0;  // what shapeAt leaves behind: along, across (normalised), band

function makeShape() {
  const s = settings, [W, H] = paperDims();
  const th = rad(s.bandAngle), ca = Math.cos(th), sa = Math.sin(th);
  const extAlong = Math.abs(W * ca) + Math.abs(H * sa);
  const extAcross = Math.abs(W * sa) + Math.abs(H * ca);
  const minDim = Math.min(W, H);
  const p = 1.6 + clamp(s.bandEdge, 0, 100) / 100 * 10.4;
  const sh = {
    W, H, cx: W * s.bandX / 100, cy: H * s.bandY / 100, th, ca, sa, extAlong, extAcross,
    p, pe: Math.max(2, p * 0.75), layout: s.layout,
    Lh: Math.max(1, s.bandLength / 100 * extAlong / 2),
    hw: Math.max(0.5, s.bandWidth / 100 * extAcross / 2),
    amp: s.bandWave / 100 * extAcross / 2,
    swell: clamp(s.bandSwell, 0, 100) / 100,
    bands: [],
  };
  if (sh.layout === 'ring') {
    sh.Lh = Math.max(2, s.bandLength / 100 * minDim / 2);     // the ring's radius
    sh.hw = Math.max(0.5, s.bandWidth / 100 * minDim / 4);
  }
  sh.wl = Math.max(5, s.bandWaveLen / 100 * 2 * (sh.layout === 'ring' ? Math.PI * sh.Lh : sh.Lh));
  const nb = sh.layout === 'band' ? clamp(Math.round(s.bands), 1, 8) : 1;
  const gap = s.bandGap / 100 * extAcross;
  for (let k = 0; k < nb; k++) sh.bands.push({ off: (k - (nb - 1) / 2) * gap, ph: k * 7.31 });
  return sh;
}

// How far the middle line of band k is off straight, at a distance along it.
function meander(sh, along, k) {
  if (!sh.amp) return 0;
  return sh.amp * 1.6 * fbm(NZ[1], along / sh.wl * 2, sh.bands[k].ph, 0.37, 2);
}

function halfWidth(sh, along, k) {
  if (!sh.swell) return sh.hw;
  const n = fbm(NZ[2], along / (sh.Lh * 0.55), sh.bands[k].ph + 3.1, 2.71, 2);
  return sh.hw * Math.max(0.25, 1 + sh.swell * n * 1.8);
}

// The density of the shape alone at a point, 0 to 1, and its own coordinates there.
function shapeAt(x, y, widen) {
  const sh = SHAPE;
  const dx = x - sh.cx, dy = y - sh.cy;
  const al = dx * sh.ca + dy * sh.sa, ac = -dx * sh.sa + dy * sh.ca;
  const wf = widen || 1;
  switch (sh.layout) {
    case 'band': {
      let best = -1;
      for (let k = 0; k < sh.bands.length; k++) {
        const t = ac - sh.bands[k].off - meander(sh, al, k);
        const hw = halfWidth(sh, al, k) * wf;
        const ua = al / (sh.Lh * (widen ? 1 + (wf - 1) * 0.15 : 1)), ut = t / hw;
        const d = Math.exp(-Math.pow(Math.abs(ua), sh.pe * 2) - Math.pow(Math.abs(ut), sh.p));
        if (d > best) { best = d; SA = ua; SC = ut; SB = k; }
      }
      return best;
    }
    case 'ellipse': {
      const ua = al / (sh.Lh * (widen ? 1 + (wf - 1) * 0.3 : 1)), ut = ac / (sh.hw * wf);
      SA = ua; SC = ut; SB = 0;
      return Math.exp(-Math.pow(Math.hypot(ua, ut), sh.p));
    }
    case 'ring': {
      const r = Math.hypot(dx, dy), phi = Math.atan2(dy, dx);
      const t = r - sh.Lh - meander(sh, phi * sh.Lh, 0);
      const hw = halfWidth(sh, phi * sh.Lh, 0) * wf;
      SA = phi / Math.PI; SC = t / hw; SB = 0;
      return Math.exp(-Math.pow(Math.abs(SC), sh.p));
    }
    default: {
      SA = dx / (sh.W / 2); SC = dy / (sh.H / 2); SB = 0;
      return 1;
    }
  }
}

// The way the shape runs at a point — the band's own axis, or round the ring.
function axisAt(x, y) {
  const sh = SHAPE;
  if (sh.layout === 'ring') return Math.atan2(y - sh.cy, x - sh.cx) + Math.PI / 2;
  return sh.th;
}

// Out of the shape, from a point: across the band away from its middle line, out from
// the middle of an ellipse or a ring, away from the nearest cluster on islands.
function outwardAt(x, y, ac) {
  const sh = SHAPE;
  if (sh.layout === 'band') {
    const sg = ac < 0 ? -1 : 1;
    return Math.atan2(sh.ca * sg, -sh.sa * sg);
  }
  if (sh.layout === 'ellipse' || sh.layout === 'ring') return Math.atan2(y - sh.cy, x - sh.cx);
  const c = nearestCluster(x, y, Infinity);
  if (c >= 0) return Math.atan2(y - CLUSTERS[c].y, x - CLUSTERS[c].x);
  return Math.atan2(y - sh.cy, x - sh.cx);
}

////////////////////////////////////////////////////////////////////////////////////////
// Clusters and the scatter
//
// Clusters are placed first, by the shape's own density; then the glyphs, by rejection
// against the whole density — the shape, pulled towards the clusters by `clusterPull`
// and broken up by noise — and never closer to one another than the spacing. A share of
// them, the strays, are scattered against a shape twice as wide and with no clusters, so
// a few glyphs stand off on their own. Candidates come from one stream of random numbers
// and are judged only against the glyphs already placed, so asking for more glyphs adds
// to the sheet and moves none of those already on it.

let CLUSTERS = [];           // { x, y, sig, w, red }
let NODES = [];              // { x, y, al, ac, band, stray, type, r, rot, filled, hub, ... }
let NODE_GRID = null;
let placedWanted = 0, placedCount = 0;

function makeClusters() {
  const s = settings, sh = SHAPE;
  const rnd = rng(11);
  const n = clamp(Math.round(s.clusters), 0, 40);
  const minDim = Math.min(sh.W, sh.H);
  const out = [];
  const free = sh.layout === 'islands' || sh.layout === 'sheet';
  for (let k = 0; k < n; k++) {
    let x = 0, y = 0;
    for (let tries = 0; tries < 400; tries++) {
      x = sh.W * (0.08 + 0.84 * rnd());
      y = sh.H * (0.08 + 0.84 * rnd());
      if (free || rnd() < Math.pow(shapeAt(x, y), 1.5)) break;
    }
    out.push({ x, y, sig: s.clusterSize / 100 * minDim * (0.6 + 0.8 * rnd()), w: 0.55 + rnd() });
  }
  // which clusters the accent takes — at least one when it takes any
  const order = out.map((c, k) => [hash01(k, 3, 91), k]).sort((a, b) => a[0] - b[0]);
  const red = Math.max(1, Math.round(out.length * s.accentShare / 100));
  order.forEach(([, k], i) => { out[k].red = i < red; });
  return out;
}

function clusterField(x, y) {
  let v = 0;
  for (const c of CLUSTERS) {
    const dx = x - c.x, dy = y - c.y;
    v += c.w * Math.exp(-(dx * dx + dy * dy) / (2 * c.sig * c.sig));
  }
  return Math.min(1, v);
}

function nearestCluster(x, y, within) {
  let best = -1, bd = Infinity;
  for (let k = 0; k < CLUSTERS.length; k++) {
    const c = CLUSTERS[k], d = Math.hypot(x - c.x, y - c.y) / c.sig;
    if (d < bd) { bd = d; best = k; }
  }
  return bd <= within ? best : -1;
}

function densityAt(x, y) {
  const s = settings, sh = SHAPE;
  const d0 = shapeAt(x, y);
  if (d0 < 1e-4) return 0;
  const pull = sh.layout === 'islands' ? 1 : clamp(s.clusterPull, 0, 100) / 100;
  let d = d0 * (CLUSTERS.length ? (1 - pull) + pull * clusterField(x, y) : 1);
  const cl = clamp(s.clumping, 0, 100) / 100;
  if (cl > 0) {
    const f = Math.max(0.2, s.clumpScale) / Math.max(sh.W, sh.H);
    const n = clamp(0.5 + 1.25 * fbm(NZ[0], x * f, y * f, 0.5, 3), 0, 1);
    d *= (1 - cl) + cl * n * n * 1.6;
  }
  return d;
}

function placeNodes() {
  const s = settings, sh = SHAPE, u = s.unit;
  const want = clamp(Math.round(s.nodes), 0, 6000);
  placedWanted = want;
  const nStray = Math.round(want * clamp(s.strays, 0, 100) / 100);
  const nMain = want - nStray;
  const minD = Math.max(0.2, s.spacing * u);
  const A = penArea(0);
  const x0 = Math.max(0, A.x0), y0 = Math.max(0, A.y0);
  const ww = Math.max(1, A.x1 - x0), hh = Math.max(1, A.y1 - y0);

  // the most the density reaches, to judge candidates against
  const probe = rng(13);
  let dmax = 1e-6;
  for (let i = 0; i < 3000; i++) dmax = Math.max(dmax, densityAt(x0 + probe() * ww, y0 + probe() * hh));
  for (const c of CLUSTERS) dmax = Math.max(dmax, densityAt(c.x, c.y));
  dmax = Math.max(dmax, densityAt(sh.cx, sh.cy));

  const cell = minD;
  const gw = Math.ceil(sh.W / cell) + 1, gh = Math.ceil(sh.H / cell) + 1;
  const grid = new Map();
  const nodes = [];
  const fits = (x, y) => {
    const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
    for (let j = gy - 1; j <= gy + 1; j++) {
      for (let i = gx - 1; i <= gx + 1; i++) {
        const list = grid.get(j * gw + i);
        if (!list) continue;
        for (const k of list) {
          const n = nodes[k];
          if ((n.x - x) ** 2 + (n.y - y) ** 2 < minD * minD) return false;
        }
      }
    }
    return true;
  };
  const add = (x, y, stray) => {
    shapeAt(x, y);
    nodes.push({ x, y, al: SA, ac: SC, band: SB, stray });
    const key = Math.floor(y / cell) * gw + Math.floor(x / cell);
    const list = grid.get(key);
    if (list) list.push(nodes.length - 1); else grid.set(key, [nodes.length - 1]);
  };

  const rnd = rng(17);
  let tries = 0;
  const most = 400 * Math.max(1, nMain) + 2000;
  while (nodes.length < nMain && tries++ < most) {
    const x = x0 + rnd() * ww, y = y0 + rnd() * hh;
    if (rnd() * dmax > densityAt(x, y)) continue;
    if (fits(x, y)) add(x, y, false);
  }
  const rs = rng(19);
  let placed = 0;
  tries = 0;
  const widen = sh.layout === 'band' || sh.layout === 'ellipse' || sh.layout === 'ring' ? 2.4 : 1;
  while (placed < nStray && tries++ < 400 * Math.max(1, nStray) + 2000) {
    const x = x0 + rs() * ww, y = y0 + rs() * hh;
    const d = shapeAt(x, y, widen);
    if (rs() > d) continue;
    if (shapeAt(x, y) > 0.35 && rs() < 0.8) continue;     // strays keep off the thick of it
    if (fits(x, y)) { add(x, y, true); placed++; }
  }
  placedCount = nodes.length;
  return nodes;
}

////////////////////////////////////////////////////////////////////////////////////////
// The glyphs
//
// Each glyph's kind, size, turn and fill come from hashes of its own index, so changing
// the weights of one kind repaints the glyphs and moves none of them. A hub is a glyph
// grown several times over — a benzene ring, a Bohr atom with its shells, an atom's three
// orbits, a crystal's unit cell, a ring of five with an oxygen in it — and the glyphs
// under it are taken away.

function chooseGlyphs(nodes) {
  const s = settings, u = s.unit;
  const table = weights(GLYPHS);
  const base = u * 0.5 * clamp(s.glyphSize, 5, 500) / 100;
  const vary = clamp(s.sizeVariety, 0, 100) / 100;
  const els = { ids: ELEMENTS.map(e => e[0]), w: ELEMENTS.map(e => e[1]),
                tot: ELEMENTS.reduce((a, e) => a + e[1], 0) };
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    n.type = pick(table, hash01(i, 1, 201)) || 'none';
    n.el = pick(els, hash01(i, 10, 210));
    n.sign = hash01(i, 11, 211) < 0.5 ? '+' : '-';
    n.aromatic = hash01(i, 12, 212) < 0.4;
    // a size spread about the base, log-normally, the larger ones rarer
    const g = Math.sqrt(-2 * Math.log(1 - hash01(i, 2, 202) * 0.999)) *
              Math.cos(2 * Math.PI * hash01(i, 3, 203));
    n.r = base * Math.exp(clamp(g, -1.6, 2.2) * vary * 0.55);
    // a symbol has to stay legible: no smaller than the usual glyph
    if (n.type === 'element') n.r = Math.max(n.r * 1.3, base * 1.15);
    if (n.type === 'letter') n.r = Math.max(n.r, base * 0.9);
    n.rot = hash01(i, 4, 204) < s.snap / 100
      ? axisAt(n.x, n.y) + Math.floor(hash01(i, 5, 205) * 4) * Math.PI / 2
      : hash01(i, 6, 206) * Math.PI * 2;
    n.filled = n.type === 'dot' ||
      (['circle', 'hexagon', 'pentagon'].includes(n.type) && hash01(i, 7, 207) < s.filled / 100);
    n.hub = null;
    n.deg = 0;
    n.key = i;
  }

  // hubs: the glyph nearest each cluster first, then the rest at random
  const nh = clamp(Math.round(s.hubs), 0, 40);
  if (!nh || !nodes.length) return nodes;
  const chosen = [];
  const taken = new Set();
  for (const c of CLUSTERS) {
    if (chosen.length >= nh) break;
    let best = -1, bd = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      if (taken.has(i) || nodes[i].stray) continue;
      const d = Math.hypot(nodes[i].x - c.x, nodes[i].y - c.y);
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0) { chosen.push(best); taken.add(best); }
  }
  const rh = rng(23);
  for (let tries = 0; chosen.length < nh && tries < 50 * nh; tries++) {
    const i = Math.floor(rh() * nodes.length);
    if (taken.has(i) || nodes[i].stray) continue;
    chosen.push(i); taken.add(i);
  }
  for (const i of chosen) {
    const n = nodes[i];
    n.hub = HUB_KINDS[Math.floor(hash01(i, 8, 208) * HUB_KINDS.length)];
    n.r = s.hubSize * u * (0.7 + 0.6 * hash01(i, 9, 209));
    n.type = 'hub';
    n.filled = false;
  }
  // clear the glyphs under the hubs
  const keep = nodes.filter((n, i) => {
    if (n.hub) return true;
    for (const j of chosen) {
      const h = nodes[j];
      if (Math.hypot(n.x - h.x, n.y - h.y) < h.r * 1.25 + n.r + 0.3 * u) return false;
    }
    return true;
  });
  return keep;
}

// How far from a glyph's middle a line leaving it at angle (dx, dy) crosses its edge.
function exitDist(n, dx, dy) {
  switch (n.type) {
    case 'none': case 'dot': return 0;
    case 'hexagon': return polyExit(n, 6, n.r * 1.1, dx, dy);
    case 'pentagon': return polyExit(n, 5, n.r * 1.1, dx, dy);
    case 'letter': return n.r * 0.95;
    case 'hub':
      if (n.hub === 'benzene') return polyExit(n, 6, n.r, dx, dy);
      if (n.hub === 'furan') return polyExit(n, 5, n.r, dx, dy);
      return n.r;
    default: return n.r;
  }
}

function polyExit(n, k, R, dx, dy) {
  // the ray from the middle meets the side it points at; a regular polygon's sides lie
  // at the inradius, so it is that over the cosine of the angle off the side's normal
  const a = Math.atan2(dy, dx) - n.rot;
  const step = 2 * Math.PI / k;
  // the polygon's corners sit at rot + j·step, so the normals sit halfway between them
  const off = ((a % step) + step) % step - step / 2;
  return R * Math.cos(Math.PI / k) / Math.cos(off);
}

// How far round a glyph other lines keep off it, when they cross it.
function knockR(n) {
  switch (n.type) {
    case 'none': case 'dot': return 0;
    case 'hexagon': case 'pentagon': return n.r * 1.1;
    case 'letter': return n.r * 0.95;
    default: return n.r;
  }
}

function buildNodeGrid(nodes) {
  let cell = settings.unit * 2;
  for (const n of nodes) if (!n.hub) cell = Math.max(cell, knockR(n) + settings.lineGap);
  const map = new Map();
  const hubs = [];
  nodes.forEach((n, i) => {
    if (n.hub) { hubs.push(i); return; }
    if (!knockR(n)) return;
    const key = Math.floor(n.y / cell) * 100003 + Math.floor(n.x / cell);
    const l = map.get(key);
    if (l) l.push(i); else map.set(key, [i]);
  });
  return { cell, map, hubs };
}

// Whether a point lies inside a glyph a line has to stop at, other than the two given.
function insideGlyph(x, y, exA, exB) {
  const G = NODE_GRID, gap = settings.lineGap;
  for (const i of G.hubs) {
    if (i === exA || i === exB) continue;
    const n = NODES[i], r = knockR(n) + gap;
    if ((n.x - x) ** 2 + (n.y - y) ** 2 < r * r) return true;
  }
  const gx = Math.floor(x / G.cell), gy = Math.floor(y / G.cell);
  for (let j = gy - 1; j <= gy + 1; j++) {
    for (let i = gx - 1; i <= gx + 1; i++) {
      const l = G.map.get(j * 100003 + i);
      if (!l) continue;
      for (const k of l) {
        if (k === exA || k === exB) continue;
        const n = NODES[k], r = knockR(n) + gap;
        if ((n.x - x) ** 2 + (n.y - y) ** 2 < r * r) return true;
      }
    }
  }
  return false;
}

////////////////////////////////////////////////////////////////////////////////////////
// Paths
//
// A path is a polyline with its length measured at every vertex, so anything can be laid
// along it by distance: dashes, ticks, beads, waves. Straight pieces are two points,
// circles and arcs are cut into chords no further than SAG from the curve, and a smooth
// line through points is a Catmull–Rom spline sampled every half millimetre.

let AX = 0, AY = 0, ATX = 1, ATY = 0;      // what pathAt leaves behind

function mkPath(xs, ys) {
  const X = [], Y = [];
  for (let i = 0; i < xs.length; i++) {
    const n = X.length;
    if (n && Math.abs(xs[i] - X[n - 1]) < 1e-9 && Math.abs(ys[i] - Y[n - 1]) < 1e-9) continue;
    X.push(xs[i]); Y.push(ys[i]);
  }
  if (X.length < 2) return null;
  const L = new Float64Array(X.length);
  for (let i = 1; i < X.length; i++) L[i] = L[i - 1] + Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1]);
  return { x: X, y: Y, L, n: X.length, len: L[X.length - 1] };
}

function pathAt(P, s) {
  const { x, y, L, n } = P;
  if (s < 0) s = 0;
  if (s > P.len) s = P.len;
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (L[m] <= s) lo = m; else hi = m;
  }
  const seg = L[hi] - L[lo];
  const f = seg > 0 ? (s - L[lo]) / seg : 0;
  AX = x[lo] + (x[hi] - x[lo]) * f;
  AY = y[lo] + (y[hi] - y[lo]) * f;
  if (seg > 0) { ATX = (x[hi] - x[lo]) / seg; ATY = (y[hi] - y[lo]) / seg; }
}

function slicePath(P, s0, s1) {
  s0 = Math.max(0, s0); s1 = Math.min(P.len, s1);
  if (s1 - s0 < 1e-6) return null;
  const xs = [], ys = [];
  pathAt(P, s0); xs.push(AX); ys.push(AY);
  for (let k = 1; k < P.n - 1; k++) {
    if (P.L[k] > s0 && P.L[k] < s1) { xs.push(P.x[k]); ys.push(P.y[k]); }
  }
  pathAt(P, s1); xs.push(AX); ys.push(AY);
  return mkPath(xs, ys);
}

function segPath(ax, ay, bx, by) { return mkPath([ax, bx], [ay, by]); }

function arcSteps(r, sweep) {
  const d = r > SAG ? 2 * Math.acos(1 - SAG / r) : Math.PI / 4;
  return clamp(Math.ceil(Math.abs(sweep) / Math.max(d, 1e-3)), 3, 1440);
}

function arcPath(cx, cy, r, a0, a1) {
  const n = arcSteps(r, a1 - a0);
  const xs = [], ys = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n;
    xs.push(cx + r * Math.cos(a)); ys.push(cy + r * Math.sin(a));
  }
  return mkPath(xs, ys);
}

// A circular arc from A to B standing `b` of the chord off it at its middle, to the left
// of A→B when b is positive. Past half the chord it would be more than a half circle.
function bowPath(ax, ay, bx, by, b) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
  b = clamp(b, -0.5, 0.5);
  if (Math.abs(b) < 0.015 || d < 1e-6) return segPath(ax, ay, bx, by);
  const h = b * d, nx = -dy / d, ny = dx / d;
  const R = (d * d / 4 + h * h) / (2 * Math.abs(h));
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  const sg = Math.sign(h);
  const cx = mx - nx * sg * (R - Math.abs(h)), cy = my - ny * sg * (R - Math.abs(h));
  const a0 = Math.atan2(ay - cy, ax - cx), a1 = Math.atan2(by - cy, bx - cx);
  // the arc runs from a0 to a1 through the apex, the long way round when it must
  const aa = Math.atan2(my + ny * h - cy, mx + nx * h - cx);
  let d1 = wrapAngle(a1 - a0);
  const dm = wrapAngle(aa - a0);
  if (!(Math.sign(dm) === Math.sign(d1) && Math.abs(dm) < Math.abs(d1))) d1 -= Math.sign(d1) * 2 * Math.PI;
  return arcPath(cx, cy, R, a0, a0 + d1);
}

function splinePath(px, py, closed) {
  const n = px.length;
  if (n < 2) return null;
  if (n === 2) return segPath(px[0], py[0], px[1], py[1]);
  const xs = [], ys = [];
  const P = i => {
    if (closed) i = (i + n) % n; else i = clamp(i, 0, n - 1);
    return [px[i], py[i]];
  };
  const spans = closed ? n : n - 1;
  for (let i = 0; i < spans; i++) {
    const [x0, y0] = P(i - 1), [x1, y1] = P(i), [x2, y2] = P(i + 1), [x3, y3] = P(i + 2);
    const m = Math.max(4, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 0.5));
    for (let k = 0; k < m; k++) {
      const t = k / m, t2 = t * t, t3 = t2 * t;
      xs.push(0.5 * (2 * x1 + (-x0 + x2) * t + (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 +
                     (-x0 + 3 * x1 - 3 * x2 + x3) * t3));
      ys.push(0.5 * (2 * y1 + (-y0 + y2) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 +
                     (-y0 + 3 * y1 - 3 * y2 + y3) * t3));
    }
  }
  const [lx, ly] = closed ? P(0) : P(n - 1);
  xs.push(lx); ys.push(ly);
  return mkPath(xs, ys);
}

// The pieces of a path that lie outside every glyph it crosses, but the two it joins.
// The path is looked along every CUT_STEP and each crossing pinned down by bisection.
function cutByGlyphs(P, exA, exB) {
  if (!P) return [];
  if (!settings.knockout) return [P];
  const n = Math.max(2, Math.ceil(P.len / CUT_STEP) + 1);
  const out = [];
  const ins = s => { pathAt(P, s); return insideGlyph(AX, AY, exA, exB); };
  const edge = (a, b, inA) => {          // between s = a and b, where `inside` flips
    for (let k = 0; k < 14; k++) {
      const m = (a + b) / 2;
      if (ins(m) === inA) a = m; else b = m;
    }
    return inA ? b : a;
  };
  let prevS = 0, prevIn = ins(0), start = prevIn ? -1 : 0;
  for (let i = 1; i < n; i++) {
    const s = P.len * i / (n - 1);
    const inn = ins(s);
    if (inn !== prevIn) {
      const e = edge(prevS, s, prevIn);
      if (inn) {                         // going in: a piece ends
        if (start >= 0 && e - start > MIN_PIECE) out.push(slicePath(P, start, e));
        start = -1;
      } else {
        start = e;
      }
    }
    prevS = s; prevIn = inn;
  }
  if (start >= 0) {
    if (start === 0) out.push(P);
    else if (P.len - start > MIN_PIECE) out.push(slicePath(P, start, P.len));
  }
  return out.filter(Boolean);
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

function emitPath(P) { if (P) emit(P.x, P.y); }
function emitSeg(ax, ay, bx, by) { emit([ax, bx], [ay, by]); }
function emitDab(x, y) { emit([x, x + EPS], [y, y]); }

function emitCirc(cx, cy, r) {
  if (r <= 0) return;
  const n = arcSteps(r, 2 * Math.PI);
  const xs = [], ys = [];
  for (let i = 0; i <= n; i++) {
    const a = 2 * Math.PI * i / n;
    xs.push(cx + r * Math.cos(a)); ys.push(cy + r * Math.sin(a));
  }
  emit(xs, ys);
}

function emitPoly(xs, ys, closed) {
  if (closed) emit(xs.concat(xs[0]), ys.concat(ys[0]));
  else emit(xs, ys);
}

////////////////////////////////////////////////////////////////////////////////////////
// Filling with a pen
//
// What has to land on a filled shape is the edge of the black, not the middle of any one
// stroke, so a fill is drawn on the shape pulled half a nib in: its edge once there, and
// then passes inside it no further apart than `fillPass` of the nib. A disc is one
// stroke — its edge, then a spiral wound in to the middle. A shape no wider than the nib
// is one dab of it.

function discFill(cx, cy, r) {
  const w = PW, ri = r - w / 2;
  if (ri <= w * 0.12) { emitDab(cx, cy); return; }
  const p = Math.max(0.02, w * clamp(settings.fillPass, 20, 200) / 100);
  const xs = [], ys = [];
  const n = arcSteps(ri, 2 * Math.PI);
  for (let i = 0; i <= n; i++) {
    const a = 2 * Math.PI * i / n;
    xs.push(cx + ri * Math.cos(a)); ys.push(cy + ri * Math.sin(a));
  }
  if (ri > w / 2) {
    // a spiral in from the edge, p further in every turn, down to the middle
    const turns = ri / p;
    let a = 0;
    while (true) {
      const rr = ri - p * a / (2 * Math.PI);
      if (rr <= 0) break;
      const da = Math.min(0.5, 2 * Math.acos(clamp(1 - SAG / Math.max(rr, SAG * 2), -1, 1)));
      a += da;
      const r2 = Math.max(0, ri - p * a / (2 * Math.PI));
      xs.push(cx + r2 * Math.cos(a)); ys.push(cy + r2 * Math.sin(a));
      if (a > turns * 2 * Math.PI + 1) break;
    }
  }
  emit(xs, ys);
}

// A convex polygon, pulled half a nib in, its edge and then a zigzag across it parallel
// to its longest side.
function polyFill(px, py) {
  const w = PW, n = px.length;
  let area2 = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area2 += px[i] * py[j] - px[j] * py[i];
  }
  if (Math.abs(area2) < 1e-9) return;
  const sg = area2 > 0 ? 1 : -1;
  // each side moved inwards by half a nib, and neighbours met again
  const lines = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = px[j] - px[i], dy = py[j] - py[i], d = Math.hypot(dx, dy);
    const nx = -dy / d * sg, ny = dx / d * sg;          // inward normal
    lines.push([px[i] + nx * w / 2, py[i] + ny * w / 2, dx / d, dy / d]);
  }
  const qx = [], qy = [];
  for (let i = 0; i < n; i++) {
    const a = lines[(i + n - 1) % n], b = lines[i];
    const den = a[2] * b[3] - a[3] * b[2];
    if (Math.abs(den) < 1e-9) return;
    const t = ((b[0] - a[0]) * b[3] - (b[1] - a[1]) * b[2]) / den;
    qx.push(a[0] + a[2] * t); qy.push(a[1] + a[3] * t);
  }
  let a2 = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a2 += qx[i] * qy[j] - qx[j] * qy[i];
  }
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += px[i]; my += py[i]; }
  mx /= n; my /= n;
  if (a2 * area2 <= 0 || Math.abs(a2) < (w * w) * 0.05) { emitDab(mx, my); return; }

  // passes parallel to the longest side, from it across to the far corner
  let li = 0, ll = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, d = Math.hypot(qx[j] - qx[i], qy[j] - qy[i]);
    if (d > ll) { ll = d; li = i; }
  }
  const ux = (qx[(li + 1) % n] - qx[li]) / ll, uy = (qy[(li + 1) % n] - qy[li]) / ll;
  const vx = -uy * sg, vy = ux * sg;
  let vmax = 0;
  for (let i = 0; i < n; i++) vmax = Math.max(vmax, (qx[i] - qx[li]) * vx + (qy[i] - qy[li]) * vy);
  const xs = qx.concat(qx[0]), ys = qy.concat(qy[0]);
  const p = w * clamp(settings.fillPass, 20, 200) / 100;
  const m = Math.ceil(vmax / p);
  let flip = false;
  for (let k = 1; k < m; k++) {
    const v = vmax * k / m;
    // where the line at height v crosses the polygon
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const vi = (qx[i] - qx[li]) * vx + (qy[i] - qy[li]) * vy;
      const vj = (qx[j] - qx[li]) * vx + (qy[j] - qy[li]) * vy;
      if ((vi - v) * (vj - v) > 0 || vi === vj) continue;
      const t = (v - vi) / (vj - vi);
      const x = qx[i] + (qx[j] - qx[i]) * t, y = qy[i] + (qy[j] - qy[i]) * t;
      const uu = (x - qx[li]) * ux + (y - qy[li]) * uy;
      lo = Math.min(lo, uu); hi = Math.max(hi, uu);
    }
    if (!(hi >= lo)) continue;
    const ox = qx[li] + vx * v, oy = qy[li] + vy * v;
    const a = flip ? hi : lo, b = flip ? lo : hi;
    xs.push(ox + ux * a, ox + ux * b);
    ys.push(oy + uy * a, oy + uy * b);
    flip = !flip;
  }
  emit(xs, ys);
}

////////////////////////////////////////////////////////////////////////////////////////
// Line styles
//
// A style lays itself along a path by distance. Its pattern is measured in `motif`
// units and stretched a little so that it fits the path a whole number of times: a
// dashed line starts and ends on a dash, a zigzag on the line, a wave at its middle.

function motifU() { return settings.unit * clamp(settings.motif, 10, 500) / 100; }

function stylePath(P, style) {
  if (!P || P.len < 1e-6) return;
  const u = motifU();
  switch (style) {
    case 'dashed':   dashes(P, 1.1 * u, 0.6 * u); break;
    case 'dotted':   dotsAlong(P, 0.62 * u, 0.12 * u); break;
    case 'dash-dot': dashDot(P, 1.5 * u, 0.42 * u, 0.1 * u); break;
    case 'ticked':   emitPath(P); ticksAlong(P, 0.7 * u, 0.38 * u, 0.38 * u); break;
    case 'comb':     emitPath(P); ticksAlong(P, 0.5 * u, 0.55 * u, 0); break;
    case 'ladder':
      emitPath(offsetPath(P, 0.24 * u)); emitPath(offsetPath(P, -0.24 * u));
      ticksAlong(P, 0.42 * u, 0.24 * u, 0.24 * u);
      break;
    case 'zigzag':   zigzagAlong(P, 0.3 * u, 0.28 * u); break;
    case 'wave':     waveAlong(P, 1.1 * u, 0.26 * u); break;
    case 'beaded':   beadsAlong(P, 1.5 * u, 0.24 * u); break;
    case 'double':   emitPath(offsetPath(P, 0.19 * u)); emitPath(offsetPath(P, -0.19 * u)); break;
    case 'triple':
      emitPath(P); emitPath(offsetPath(P, 0.26 * u)); emitPath(offsetPath(P, -0.26 * u));
      break;
    case 'hashed':   hashedAlong(P, 0.3 * u, 0.03 * u, 0.3 * u); break;
    case 'coil':     coilAlong(P, 0.55 * u, 0.34 * u); break;
    default:         emitPath(P);
  }
}

function dashes(P, dash, gap) {
  const len = P.len;
  if (len <= dash * 1.2) { emitPath(P); return; }
  const n = Math.max(1, Math.round((len + gap) / (dash + gap)));
  const k = (len + gap) / (n * (dash + gap));
  for (let i = 0; i < n; i++) {
    const s0 = i * (dash + gap) * k;
    emitPath(slicePath(P, s0, s0 + dash * k));
  }
}

function dashDot(P, dash, gap, dotR) {
  const len = P.len, per = dash + 2 * gap;
  if (len <= dash * 1.2) { emitPath(P); return; }
  const n = Math.max(1, Math.round((len + 2 * gap) / per));
  const k = (len + 2 * gap) / (n * per);
  for (let i = 0; i < n; i++) {
    const s0 = i * per * k;
    emitPath(slicePath(P, s0, s0 + dash * k));
    if (i < n - 1) { pathAt(P, s0 + (dash + gap) * k); discFill(AX, AY, dotR); }
  }
}

function dotsAlong(P, gap, r) {
  const n = Math.max(1, Math.round(P.len / gap));
  for (let i = 0; i <= n; i++) {
    pathAt(P, P.len * i / n);
    discFill(AX, AY, r);
  }
}

function ticksAlong(P, gap, left, right) {
  const n = Math.max(1, Math.round(P.len / gap));
  for (let i = 0; i < n; i++) {
    pathAt(P, P.len * (i + 0.5) / n);
    const nx = -ATY, ny = ATX;
    emitSeg(AX + nx * left, AY + ny * left, AX - nx * right, AY - ny * right);
  }
}

// A bond going into the paper: strokes across the path, short at its start and long at
// its end, and no line along it.
function hashedAlong(P, gap, w0, w1) {
  const n = Math.max(2, Math.round(P.len / gap));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, w = w0 + (w1 - w0) * t;
    pathAt(P, P.len * t);
    emitSeg(AX - ATY * w, AY + ATX * w, AX + ATY * w, AY - ATX * w);
  }
}

function offsetPath(P, d) {
  const xs = [], ys = [];
  for (let i = 0; i < P.n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(P.n - 1, i + 1);
    let tx = P.x[b] - P.x[a], ty = P.y[b] - P.y[a];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l; ty /= l;
    xs.push(P.x[i] - ty * d); ys.push(P.y[i] + tx * d);
  }
  return mkPath(xs, ys);
}

function zigzagAlong(P, half, amp) {
  const n = Math.max(2, Math.round(P.len / half));
  const xs = [], ys = [];
  for (let i = 0; i <= n; i++) {
    pathAt(P, P.len * i / n);
    const o = i === 0 || i === n ? 0 : (i % 2 ? amp : -amp);
    xs.push(AX - ATY * o); ys.push(AY + ATX * o);
  }
  emit(xs, ys);
}

function waveAlong(P, wl, amp) {
  const m = Math.max(1, Math.round(2 * P.len / wl));
  const w = 2 * P.len / m;
  const n = Math.max(8, Math.ceil(P.len / (w / 18)));
  const xs = [], ys = [];
  for (let i = 0; i <= n; i++) {
    const s = P.len * i / n;
    pathAt(P, s);
    const o = amp * Math.sin(2 * Math.PI * s / w);
    xs.push(AX - ATY * o); ys.push(AY + ATX * o);
  }
  emit(xs, ys);
}

function beadsAlong(P, gap, r) {
  const m = Math.max(1, Math.round(P.len / gap));
  const rr = r + 0.06 * settings.unit;
  let from = 0;
  for (let j = 0; j < m; j++) {
    const s = P.len * (j + 0.5) / m;
    if (s - rr - from > MIN_PIECE) emitPath(slicePath(P, from, s - rr));
    pathAt(P, s);
    emitCirc(AX, AY, r);
    from = s + rr;
  }
  if (P.len - from > MIN_PIECE) emitPath(slicePath(P, from, P.len));
}

// Loops along the path, the way a hand draws a coiled spring: a prolate trochoid, the
// point running back on itself each turn because the loop is wider than the step.
function coilAlong(P, step, r) {
  const turns = Math.max(1, Math.round(P.len / step));
  const a = P.len / (turns * 2 * Math.PI);
  const n = turns * 18;
  const xs = [], ys = [];
  for (let i = 0; i <= n; i++) {
    const ph = 2 * Math.PI * turns * i / n;
    const s = a * ph - r * Math.sin(ph) * 0.9;
    pathAt(P, s);
    const o = r * (1 - Math.cos(ph)) * 0.8;
    xs.push(AX - ATY * o); ys.push(AY + ATX * o);
  }
  emit(xs, ys);
}

////////////////////////////////////////////////////////////////////////////////////////
// End marks
//
// Drawn at a free end of a line, (tx, ty) pointing out of the line. Those with an inside
// — a circle, a triangle, a square — stand beyond the end, so the line just reaches them.

function capSize() { return settings.unit * clamp(settings.capSize, 10, 500) / 100; }

function drawCap(type, x, y, tx, ty, k) {
  const sz = capSize() * (k || 1);
  const nx = -ty, ny = tx;
  switch (type) {
    case 'tick':
      emitSeg(x + nx * sz * 0.45, y + ny * sz * 0.45, x - nx * sz * 0.45, y - ny * sz * 0.45);
      break;
    case 'double tick':
      for (const b of [0, 0.26]) {
        const cx = x - tx * sz * b, cy = y - ty * sz * b;
        emitSeg(cx + nx * sz * 0.4, cy + ny * sz * 0.4, cx - nx * sz * 0.4, cy - ny * sz * 0.4);
      }
      break;
    case 'arrow': {
      const a = 0.42 * sz, b = 0.24 * sz;
      emit([x - tx * a + nx * b, x, x - tx * a - nx * b], [y - ty * a + ny * b, y, y - ty * a - ny * b]);
      break;
    }
    case 'head': {
      const a = 0.5 * sz, b = 0.2 * sz;
      polyFill([x + tx * a, x + nx * b, x - nx * b], [y + ty * a, y + ny * b, y - ny * b]);
      break;
    }
    case 'dot': {
      const r = 0.18 * sz;
      discFill(x + tx * r * 0.5, y + ty * r * 0.5, r);
      break;
    }
    case 'circle': {
      const r = 0.3 * sz;
      emitCirc(x + tx * r, y + ty * r, r);
      break;
    }
    case 'triangle': {
      const R = 0.36 * sz, cx = x + tx * R / 2, cy = y + ty * R / 2;
      emitPoly([cx + tx * R, cx - tx * R / 2 + nx * R * 0.866, cx - tx * R / 2 - nx * R * 0.866],
               [cy + ty * R, cy - ty * R / 2 + ny * R * 0.866, cy - ty * R / 2 - ny * R * 0.866], true);
      break;
    }
    case 'square': {
      const h = 0.22 * sz, cx = x + tx * h, cy = y + ty * h;
      emitPoly([cx + (tx + nx) * h, cx + (tx - nx) * h, cx + (-tx - nx) * h, cx + (-tx + nx) * h],
               [cy + (ty + ny) * h, cy + (ty - ny) * h, cy + (-ty - ny) * h, cy + (-ty + ny) * h], true);
      break;
    }
    case 'fork': {
      const c = Math.cos(0.6), s = Math.sin(0.6), l = 0.5 * sz;
      emit([x + (tx * c - ty * s) * l, x, x + (tx * c + ty * s) * l],
           [y + (ty * c + tx * s) * l, y, y + (ty * c - tx * s) * l]);
      break;
    }
    case 'flag': {
      emitPoly([x, x - tx * sz * 0.42, x - tx * sz * 0.2 + nx * sz * 0.38],
               [y, y - ty * sz * 0.42, y - ty * sz * 0.2 + ny * sz * 0.38], true);
      break;
    }
    default: break;
  }
}

// A line laid between two glyphs (either may be -1, an open end), cut where it crosses
// others, styled, and capped at its open ends.
function layLine(P, style, exA, exB, capA, capB, capK) {
  if (!P || P.len < MIN_PIECE) return [];
  const pieces = cutByGlyphs(P, exA, exB);
  for (const q of pieces) stylePath(q, style);
  if (capA && capA !== 'none') {
    pathAt(P, 0);
    if (!insideGlyph(AX, AY, exA, exB)) drawCap(capA, AX, AY, -ATX, -ATY, capK);
  }
  if (capB && capB !== 'none') {
    pathAt(P, P.len);
    if (!insideGlyph(AX, AY, exA, exB)) drawCap(capB, AX, AY, ATX, ATY, capK);
  }
  return pieces;
}

////////////////////////////////////////////////////////////////////////////////////////
// Which pen
//
// Every layer has a pen; the accent moves some of the fine layers' elements to another,
// chosen once per element — a glyph with everything drawn on it, a thread with its caps.

function accentHit(layer, x, y, key) {
  const s = settings;
  if (s.accent === 'none' || s.accentShare <= 0) return false;
  if (!(ACCENT_LAYERS[s.accentOn] || []).includes(layer)) return false;
  const f = clamp(s.accentShare, 0, 100) / 100;
  switch (s.accent) {
    case 'random': return hash01(key, layer, 4242) < f;
    case 'clusters': {
      if (!CLUSTERS.length) return hash01(key, layer, 4242) < f;
      const c = nearestCluster(x, y, 2.2);
      return c >= 0 && CLUSTERS[c].red;
    }
    case 'region': {
      shapeAt(x, y);
      const q = clamp((SA + 1) / 2, 0, 1);
      const c0 = f / 2 + hash01(7, 7, 4343) * (1 - f);
      return Math.abs(q - c0) < f / 2;
    }
    case 'outskirts':
    case 'core': {
      shapeAt(x, y);
      const r = SHAPE.layout === 'ellipse' ? Math.hypot(SA, SC) : Math.abs(SC);
      const cut = SHAPE.layout === 'sheet' || SHAPE.layout === 'islands' ? 1 : 1.3;
      const out = r / cut > 1 - f;
      return s.accent === 'outskirts' ? out : !out && r / cut < f;
    }
    default: return false;
  }
}

function usePen(layer, x, y, key) {
  LAY = layer;
  setPen(accentHit(layer, x, y, key) ? penIdx(settings.accentPen) : layerPen(layer));
}

////////////////////////////////////////////////////////////////////////////////////////
// Glyphs on paper

function drawGlyph(n) {
  const { x, y, r, rot } = n;
  switch (n.type) {
    case 'dot': discFill(x, y, Math.max(r * 0.32, PW * 0.5)); break;
    case 'circle': if (n.filled) discFill(x, y, r); else emitCirc(x, y, r); break;
    case 'element': {
      emitCirc(x, y, r);
      const w = textLayout(n.el, false).w;
      drawText(n.el, false, x, y, r * Math.min(1, 1.25 / Math.max(w, 0.6)), readable(axisAt(x, y)));
      break;
    }
    case 'letter': drawText(n.el, false, x, y, r * 1.45, readable(axisAt(x, y))); break;
    case 'hexagon': case 'pentagon': {
      const k = n.type === 'hexagon' ? 6 : 5;
      MF = { ox: x, oy: y, c: Math.cos(rot), s: Math.sin(rot), k: r * 1.1 };
      const p = ngon(k, 1, 0);
      if (n.filled) {
        const xs = [], ys = [];
        for (let j = 0; j < p.length; j += 2) { const [wx, wy] = mpt(p[j], p[j + 1]); xs.push(wx); ys.push(wy); }
        polyFill(xs, ys);
      } else {
        mring(p);
        if (n.aromatic && r * 0.6 > PW * 1.5) mcirc(0, 0, 0.56);
      }
      break;
    }
    case 'charge': {
      emitCirc(x, y, r);
      const l = r * 0.55;
      emitSeg(x - l, y, x + l, y);
      if (n.sign === '+') emitSeg(x, y - l, x, y + l);
      break;
    }
    case 'hub': drawHub(n); break;
    default: break;
  }
}

// The hubs are drawn in a frame of their own, a unit the hub's radius, turned by its turn.
function drawHub(n) {
  const { x, y, r, rot } = n;
  const h = j => hash01(n.key, j, 301);
  MF = { ox: x, oy: y, c: Math.cos(rot), s: Math.sin(rot), k: r };
  const upright = readable(axisAt(x, y));
  const dotR = Math.max(0.05, PW * 0.6 / r);
  switch (n.hub) {
    case 'benzene': {
      const p = ngon(6, 1, 0);
      mring(p);
      if (h(1) < 0.5) mcirc(0, 0, 0.6);
      else mkekule(p, [0, 2, 4], 0.2);
      break;
    }
    case 'bohr': {
      // a nucleus and two or three shells, two electrons in the first, eight in the next
      mdot(0, 0, 0.11);
      const shells = h(1) < 0.5 ? [0.45, 0.75, 1] : [0.55, 1];
      const fill = [2, 8, 1 + Math.floor(h(2) * 7)];
      shells.forEach((rr, j) => {
        mcirc(0, 0, rr);
        const m = fill[j], ph = h(3 + j) * Math.PI * 2;
        for (let e = 0; e < m; e++) {
          const a = ph + e * 2 * Math.PI / m;
          mdot(rr * Math.cos(a), rr * Math.sin(a), dotR);
        }
      });
      break;
    }
    case 'orbitals':
      for (let j = 0; j < 3; j++) mellipse(0, 0, 1, 0.32, j * Math.PI / 3);
      mdot(0, 0, 0.1);
      break;
    case 'cell': {
      // a crystal's unit cell: a cube seen at a slant, an atom at every corner
      const a = 0.6, d = 0.32;
      const F = [[-a - d, -a + d], [a - d, -a + d], [a - d, a + d], [-a - d, a + d]];
      const B = F.map(([px, py]) => [px + 2 * d, py - 2 * d]);
      mline(...F.flat(), F[0][0], F[0][1]);
      mline(...B.flat(), B[0][0], B[0][1]);
      for (let j = 0; j < 4; j++) mline(F[j][0], F[j][1], B[j][0], B[j][1]);
      for (const [px, py] of F.concat(B)) mdot(px, py, dotR * 1.6);
      if (h(1) < 0.5) mdot(0, 0, dotR * 2.2);
      break;
    }
    case 'furan': {
      // a ring of five with a heteroatom at its first corner, the bonds to it stopping
      // short of its symbol, and the double bonds across from it
      const p = ngon(5, 1, 0);
      const el = ['O', 'N', 'S'][Math.floor(h(1) * 3)];
      const g = 0.32;
      for (let j = 0; j < 5; j++) {
        const a = j, b = (j + 1) % 5;
        let ax = p[a * 2], ay = p[a * 2 + 1], bx = p[b * 2], by = p[b * 2 + 1];
        const L = Math.hypot(bx - ax, by - ay);
        if (a === 0) { ax += (bx - ax) * g / L; ay += (by - ay) * g / L; }
        if (b === 0) { bx += (ax - bx) * g / L; by += (ay - by) * g / L; }
        mline(ax, ay, bx, by);
      }
      mkekule(p, [1, 3], 0.22);
      mtext(el, p[0], p[1], 0.42, upright);
      break;
    }
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Threads
//
// A thread is a walk from glyph to glyph through their nearest neighbours. Each step
// weighs the neighbours by how little they turn it — `straightness` sharpens that — and
// by how few lines they have already, and never takes an edge twice. Every piece of a
// thread runs from the edge of one glyph to the edge of the next, straight, bowed into
// an arc, or bent once at a right angle to the band; the whole thread has one style, and
// its free ends may run on past their glyphs into an end mark.

let NEIGH = [];
let SEGS = [];               // the pieces drawn, for marks to sit beside

function buildNeighbours(nodes) {
  const reach = settings.reach * settings.unit;
  const K = 8;
  const out = [];
  const cell = Math.max(reach, 1);
  const map = new Map();
  nodes.forEach((n, i) => {
    const key = Math.floor(n.y / cell) * 100003 + Math.floor(n.x / cell);
    const l = map.get(key);
    if (l) l.push(i); else map.set(key, [i]);
  });
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const gx = Math.floor(a.x / cell), gy = Math.floor(a.y / cell);
    const cand = [];
    for (let j = gy - 1; j <= gy + 1; j++) {
      for (let k = gx - 1; k <= gx + 1; k++) {
        const l = map.get(j * 100003 + k);
        if (!l) continue;
        for (const b of l) {
          if (b === i) continue;
          const d = Math.hypot(nodes[b].x - a.x, nodes[b].y - a.y);
          if (d <= reach && d > exitDist(a, 1, 0) + exitDist(nodes[b], 1, 0) + 0.3) cand.push([d, b]);
        }
      }
    }
    cand.sort((p, q) => p[0] - q[0]);
    out.push(cand.slice(0, K).map(c => c[1]));
  }
  return out;
}

function threadShape(rnd) {
  const s = settings;
  const r = rnd();
  if (r < s.elbows / 100) return 'elbow';
  if (r < (s.elbows + s.curvy) / 100) return 'bow';
  return 'straight';
}

// The path of one piece from glyph a to glyph b, from edge to edge.
function piecePath(a, b, shape, bow, side) {
  const s = settings, A = NODES[a], B = NODES[b];
  const gap = s.lineGap;
  let P;
  if (shape === 'elbow') {
    // along the band first, then across it — or the other way, by `side`
    const th = axisAt(A.x, A.y), ux = Math.cos(th), uy = Math.sin(th);
    const dx = B.x - A.x, dy = B.y - A.y;
    const along = dx * ux + dy * uy;
    const cx = side > 0 ? A.x + ux * along : B.x - ux * along;
    const cy = side > 0 ? A.y + uy * along : B.y - uy * along;
    P = mkPath([A.x, cx, B.x], [A.y, cy, B.y]);
  } else if (shape === 'bow') {
    P = bowPath(A.x, A.y, B.x, B.y, bow);
  } else {
    P = segPath(A.x, A.y, B.x, B.y);
  }
  if (!P) return null;
  pathAt(P, 0);
  const s0 = exitDist(A, ATX, ATY) + (exitDist(A, ATX, ATY) > 0 ? gap : 0);
  pathAt(P, P.len);
  const e0 = exitDist(B, -ATX, -ATY) + (exitDist(B, -ATX, -ATY) > 0 ? gap : 0);
  if (P.len - s0 - e0 < MIN_PIECE) return null;
  return slicePath(P, s0, P.len - e0);
}

function layThreads() {
  const s = settings, u = s.unit;
  const N = NODES.length;
  if (N < 2) return 0;
  const rnd = rng(31);
  const styles = weights(STYLES), caps = weights(CAPS);
  const used = new Set();
  const ekey = (a, b) => a < b ? a * 100003 + b : b * 100003 + a;
  const nT = clamp(Math.round(s.threads), 0, 20000);
  const stp = clamp(s.straightness, 0, 100) / 100 * 6;
  let laid = 0;

  for (let t = 0; t < nT; t++) {
    // start where few lines are yet
    let start = Math.floor(rnd() * N);
    for (let k = 0; k < 2; k++) {
      const c = Math.floor(rnd() * N);
      if (NODES[c].deg < NODES[start].deg) start = c;
    }
    const segs = 1 + Math.floor(Math.pow(rnd(), 1.2) * clamp(Math.round(s.threadLen), 1, 40));
    const path = [start];
    const seen = new Set(path);
    let dirx = 0, diry = 0;
    for (let k = 0; k < segs; k++) {
      const c = path[path.length - 1];
      const cand = [], w = [];
      let tot = 0;
      for (const j of NEIGH[c]) {
        if (seen.has(j) || used.has(ekey(c, j))) continue;
        const dx = NODES[j].x - NODES[c].x, dy = NODES[j].y - NODES[c].y;
        const d = Math.hypot(dx, dy);
        const cosT = k ? (dx * dirx + dy * diry) / d : 0;
        const ww = Math.pow(0.12 + (1 + cosT) / 2, stp) / (1 + NODES[j].deg * 0.6);
        cand.push(j); w.push(ww); tot += ww;
      }
      if (!cand.length) break;
      let x = rnd() * tot, nxt = cand[cand.length - 1];
      for (let q = 0; q < cand.length; q++) { x -= w[q]; if (x < 0) { nxt = cand[q]; break; } }
      dirx = NODES[nxt].x - NODES[c].x; diry = NODES[nxt].y - NODES[c].y;
      const l = Math.hypot(dirx, diry); dirx /= l; diry /= l;
      used.add(ekey(c, nxt));
      NODES[c].deg++; NODES[nxt].deg++;
      path.push(nxt); seen.add(nxt);
    }
    if (path.length < 2) continue;

    const style = pick(styles, rnd()) || 'solid';
    const mid = NODES[path[Math.floor(path.length / 2)]];
    usePen(L_THREADS, mid.x, mid.y, t);
    for (let k = 0; k + 1 < path.length; k++) {
      const shape = threadShape(rnd);
      const bow = (rnd() * 2 - 1) * s.bulge / 100;
      const P = piecePath(path[k], path[k + 1], shape, bow, rnd() < 0.5 ? 1 : -1);
      const pieces = layLine(P, style, path[k], path[k + 1], null, null);
      for (const q of pieces) SEGS.push(q);
    }
    // spurs off either end
    for (const end of [0, 1]) {
      if (rnd() >= s.spurs / 100) continue;
      const a = end ? path[path.length - 1] : path[0];
      const b = end ? path[path.length - 2] : path[1];
      const A = NODES[a], B = NODES[b];
      let th = Math.atan2(A.y - B.y, A.x - B.x) + (rnd() - 0.5) * 0.7;
      spur(a, th, s.spurLen * u * (0.5 + rnd()), style, pick(caps, rnd()));
    }
    laid++;
  }

  // the glyphs no thread reached, joined to their nearest
  const rj = rng(37);
  for (let i = 0; i < N; i++) {
    if (NODES[i].deg || NODES[i].hub || rj() >= s.joinRest / 100) continue;
    const j = NEIGH[i][0];
    if (j === undefined) continue;
    NODES[i].deg++; NODES[j].deg++;
    usePen(L_THREADS, NODES[i].x, NODES[i].y, 50000 + i);
    const style = rj() < 0.6 ? 'solid' : (pick(styles, rj()) || 'solid');
    const P = piecePath(i, j, threadShape(rj), (rj() * 2 - 1) * s.bulge / 100, 1);
    for (const q of layLine(P, style, i, j, null, null)) SEGS.push(q);
  }
  return laid;
}

// A short line off glyph a at angle th, ending in a cap.
function spur(a, th, len, style, cap) {
  const A = NODES[a], ux = Math.cos(th), uy = Math.sin(th);
  const e = exitDist(A, ux, uy);
  const s0 = e + (e > 0 ? settings.lineGap : 0);
  const P = segPath(A.x + ux * s0, A.y + uy * s0, A.x + ux * (s0 + len), A.y + uy * (s0 + len));
  const pieces = layLine(P, style, a, -1, null, cap);
  for (const q of pieces) SEGS.push(q);
}

function layStems() {
  const s = settings, u = s.unit;
  const rnd = rng(41);
  const caps = weights(CAPS), styles = weights(STYLES);
  let n = 0;
  for (let i = 0; i < NODES.length; i++) {
    const A = NODES[i];
    if (rnd() >= s.stems / 100) continue;
    let th;
    if (rnd() < s.snap / 100) {
      const q = rnd();
      th = axisAt(A.x, A.y) + (q < 0.6 ? 0 : q < 0.85 ? Math.PI / 2 : Math.PI / 4) +
        (rnd() < 0.5 ? Math.PI : 0);
    } else th = rnd() * 2 * Math.PI;
    const style = rnd() < 0.75 ? 'solid' : (pick(styles, rnd()) || 'solid');
    usePen(L_STEMS, A.x, A.y, i);
    spur(i, th, s.stemLen * u * (0.5 + rnd()), style, pick(caps, rnd()));
    n++;
  }
  return n;
}

////////////////////////////////////////////////////////////////////////////////////////
// Arcs, rays and voices — the long lines

function longStyle(choice, r, solidBias) {
  if (choice !== 'mixed') return choice;
  if (r() < solidBias) return 'solid';
  return pick(weights(STYLES), r()) || 'solid';
}

function layArcs() {
  const s = settings, u = s.unit, N = NODES.length;
  if (!N) return 0;
  const rnd = rng(43), caps = weights(CAPS);
  const n = clamp(Math.round(s.arcs), 0, 2000);
  for (let k = 0; k < n; k++) {
    const i = Math.floor(rnd() * N), A = NODES[i];
    const lo = Math.min(s.arcMin, s.arcMax), hi = Math.max(s.arcMin, s.arcMax);
    let R = u * (lo + (hi - lo) * Math.pow(rnd(), 1.4));
    const full = rnd() < s.fullCircles / 100;
    if (full) R = u * lo + (R - u * lo) * 0.35;
    const sweep = full ? 2 * Math.PI : rad(s.arcSweep) * (0.3 + 0.7 * rnd());
    let cx, cy, mid;
    let exA = -1;
    if (rnd() < s.arcCentred / 100) {
      // round the glyph, clear of it
      const rr = Math.max(R, exitDist(A, 1, 0) + u * 1.2);
      cx = A.x; cy = A.y; mid = rnd() * 2 * Math.PI;
      usePen(L_ARCS, A.x, A.y, k);
      const style = longStyle(s.arcStyle, rnd, 0.45);
      const a0 = mid - sweep / 2;
      const P = arcPath(cx, cy, rr, a0, a0 + sweep);
      const cA = !full && rnd() < s.arcCaps / 100 ? pick(caps, rnd()) : null;
      const cB = !full && rnd() < s.arcCaps / 100 ? pick(caps, rnd()) : null;
      for (const q of layLine(P, style, exA, -1, cA, cB)) SEGS.push(q);
      continue;
    }
    // through the glyph: the centre a radius off it, the glyph somewhere along the arc
    const phi = rnd() * 2 * Math.PI;
    cx = A.x + Math.cos(phi) * R; cy = A.y + Math.sin(phi) * R;
    const back = phi + Math.PI;
    const a0 = back - sweep * (0.15 + 0.7 * rnd());
    usePen(L_ARCS, A.x, A.y, k);
    const style = longStyle(s.arcStyle, rnd, 0.45);
    const P = arcPath(cx, cy, R, a0, a0 + sweep);
    const cA = !full && rnd() < s.arcCaps / 100 ? pick(caps, rnd()) : null;
    const cB = !full && rnd() < s.arcCaps / 100 ? pick(caps, rnd()) : null;
    for (const q of layLine(P, style, i, -1, cA, cB)) SEGS.push(q);
  }
  return n;
}

function layRays() {
  const s = settings, u = s.unit, N = NODES.length;
  if (!N) return 0;
  const rnd = rng(47);
  const big = [['circle', 'capCircle'], ['triangle', 'capTriangle'], ['square', 'capSquare'],
               ['tick', 'capTick'], ['dot', 'capDot'], ['arrow', 'capArrow']];
  const ends = weights(big);
  const n = clamp(Math.round(s.rays), 0, 500);
  const ext = SHAPE.extAcross;
  for (let k = 0; k < n; k++) {
    // a glyph out towards the edge of the shape
    let i = Math.floor(rnd() * N);
    for (let t = 0; t < 5; t++) {
      const j = Math.floor(rnd() * N);
      if (Math.abs(NODES[j].ac) > Math.abs(NODES[i].ac)) i = j;
    }
    const A = NODES[i];
    const th = outwardAt(A.x, A.y, A.ac) + rad(s.raySpread) * (rnd() * 2 - 1);
    const lo = Math.min(s.rayMin, s.rayMax), hi = Math.max(s.rayMin, s.rayMax);
    const L = (lo + (hi - lo) * rnd()) / 100 * ext;
    const ux = Math.cos(th), uy = Math.sin(th);
    const e = exitDist(A, ux, uy), s0 = e + (e > 0 ? s.lineGap : 0);
    const bx = A.x + ux * (s0 + L), by = A.y + uy * (s0 + L);
    const P = rnd() < s.rayCurve / 100
      ? bowPath(A.x + ux * s0, A.y + uy * s0, bx, by, (rnd() * 2 - 1) * 0.18)
      : segPath(A.x + ux * s0, A.y + uy * s0, bx, by);
    usePen(L_RAYS, A.x, A.y, k);
    const style = longStyle(s.rayStyle, rnd, 0.3);
    const cap = pick(ends, rnd());
    for (const q of layLine(P, style, i, -1, null, cap, 1.5)) SEGS.push(q);
  }
  return n;
}

// A voice runs the length of the shape, stepping from glyph to glyph near where it is
// heading and wandering across the band as it goes.
function layVoices() {
  const s = settings, u = s.unit, sh = SHAPE, N = NODES.length;
  if (!N) return 0;
  const n = clamp(Math.round(s.voices), 0, 40);
  const step = Math.max(1, s.voiceStep * u);
  const G = new Map(), cell = step;
  NODES.forEach((nd, i) => {
    const key = Math.floor(nd.y / cell) * 100003 + Math.floor(nd.x / cell);
    const l = G.get(key);
    if (l) l.push(i); else G.set(key, [i]);
  });
  const near = (x, y, r) => {
    let best = -1, bd = r;
    const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
    for (let j = gy - 1; j <= gy + 1; j++) {
      for (let i = gx - 1; i <= gx + 1; i++) {
        const l = G.get(j * 100003 + i);
        if (!l) continue;
        for (const k of l) {
          const d = Math.hypot(NODES[k].x - x, NODES[k].y - y);
          if (d < bd) { bd = d; best = k; }
        }
      }
    }
    return best;
  };
  for (let v = 0; v < n; v++) {
    const rnd = rng(53 + v * 7);
    const band = sh.bands.length ? v % sh.bands.length : 0;
    const px = [], py = [];
    const wander = clamp(s.voiceWander, 0, 200) / 100;
    let t = (rnd() * 2 - 1) * 0.6;
    const ring = sh.layout === 'ring';
    const span = ring ? 2 * Math.PI * sh.Lh : 2 * sh.Lh * 0.96;
    const m = Math.max(2, Math.round(span / step));
    let lastNode = -1;
    for (let k = 0; k <= m; k++) {
      t = clamp(t * 0.75 + (rnd() * 2 - 1) * wander * 0.7, -1.4, 1.4);
      let x, y;
      if (ring) {
        const phi = -Math.PI + 2 * Math.PI * k / m + v;
        const rr = sh.Lh + t * sh.hw;
        x = sh.cx + Math.cos(phi) * rr; y = sh.cy + Math.sin(phi) * rr;
      } else if (sh.layout === 'band') {
        const al = -span / 2 + span * k / m;
        const ac = sh.bands[band].off + meander(sh, al, band) + t * halfWidth(sh, al, band);
        x = sh.cx + al * sh.ca - ac * sh.sa; y = sh.cy + al * sh.sa + ac * sh.ca;
      } else {
        const al = -span / 2 + span * k / m, ac = t * sh.hw;
        x = sh.cx + al * sh.ca - ac * sh.sa; y = sh.cy + al * sh.sa + ac * sh.ca;
      }
      const j = near(x, y, step * 0.8);
      if (j >= 0 && j !== lastNode) { x = NODES[j].x; y = NODES[j].y; lastNode = j; }
      px.push(x); py.push(y);
    }
    if (ring) { px.pop(); py.pop(); }
    const P = s.voiceSmooth ? splinePath(px, py, ring) : mkPath(ring ? px.concat(px[0]) : px,
                                                            ring ? py.concat(py[0]) : py);
    LAY = L_VOICES;
    setPen(layerPen(L_VOICES));
    for (const q of layLine(P, s.voiceStyle, -1, -1, null, null)) SEGS.push(q);
  }
  return n;
}

////////////////////////////////////////////////////////////////////////////////////////
// Lettering
//
// A stroke font of its own, for the labels and the symbols in the glyphs: capitals one
// unit high, small letters 0.6, descenders to −0.32, every letter a few polylines and
// every curve cut every 15°. A formula is set the way a chemist sets it: the digits after
// a symbol or a bracket small and dropped, a charge after ^ small and raised, a number at
// the start or after the dot of a hydrate full size.

const FONT = (() => {
  const g = {};
  const arc = (cx, cy, rx, ry, a0, a1) => {
    const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 15));
    const p = [];
    for (let i = 0; i <= n; i++) {
      const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
      p.push(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
    }
    return p;
  };
  const J = (...parts) => [].concat(...parts);
  const def = (ch, w, ...st) => { g[ch] = { w, s: st }; };

  def('A', 0.64, [0, 0, 0.32, 1, 0.64, 0], [0.13, 0.4, 0.51, 0.4]);
  def('B', 0.56, J([0, 0.5, 0, 1, 0.28, 1], arc(0.28, 0.75, 0.25, 0.25, 90, -90), [0, 0.5]),
                 J(arc(0.3, 0.25, 0.26, 0.25, 90, -90), [0, 0, 0, 0.5]));
  def('C', 0.62, arc(0.37, 0.5, 0.37, 0.5, 50, 310));
  def('D', 0.62, J([0, 0, 0, 1, 0.18, 1], arc(0.18, 0.5, 0.44, 0.5, 90, -90), [0, 0]));
  def('E', 0.52, [0.52, 1, 0, 1, 0, 0, 0.52, 0], [0, 0.5, 0.42, 0.5]);
  def('F', 0.5, [0.5, 1, 0, 1, 0, 0], [0, 0.5, 0.4, 0.5]);
  def('G', 0.66, J(arc(0.37, 0.5, 0.37, 0.5, 50, 320), [0.66, 0.42, 0.4, 0.42]));
  def('H', 0.6, [0, 0, 0, 1], [0.6, 0, 0.6, 1], [0, 0.5, 0.6, 0.5]);
  def('I', 0, [0, 0, 0, 1]);
  def('J', 0.46, J([0.46, 1, 0.46, 0.26], arc(0.23, 0.26, 0.23, 0.26, 0, -180)));
  def('K', 0.56, [0, 0, 0, 1], [0.56, 1, 0, 0.36], [0.17, 0.53, 0.58, 0]);
  def('L', 0.48, [0, 1, 0, 0, 0.48, 0]);
  def('M', 0.74, [0, 0, 0, 1, 0.37, 0.32, 0.74, 1, 0.74, 0]);
  def('N', 0.6, [0, 0, 0, 1, 0.6, 0, 0.6, 1]);
  def('O', 0.74, arc(0.37, 0.5, 0.37, 0.5, 0, 360));
  def('P', 0.54, J([0, 0, 0, 1, 0.28, 1], arc(0.28, 0.74, 0.26, 0.26, 90, -90), [0, 0.48]));
  def('Q', 0.74, arc(0.37, 0.5, 0.37, 0.5, 0, 360), [0.46, 0.22, 0.76, -0.06]);
  def('R', 0.56, J([0, 0, 0, 1, 0.28, 1], arc(0.28, 0.75, 0.25, 0.25, 90, -90), [0, 0.5]),
                 [0.26, 0.5, 0.56, 0]);
  def('S', 0.56, J(arc(0.28, 0.75, 0.26, 0.25, 15, 270), arc(0.28, 0.25, 0.28, 0.25, 90, -165)));
  def('T', 0.6, [0, 1, 0.6, 1], [0.3, 1, 0.3, 0]);
  def('U', 0.6, J([0, 1, 0, 0.3], arc(0.3, 0.3, 0.3, 0.3, 180, 360), [0.6, 1]));
  def('V', 0.62, [0, 1, 0.31, 0, 0.62, 1]);
  def('W', 0.86, [0, 1, 0.2, 0, 0.43, 0.72, 0.66, 0, 0.86, 1]);
  def('X', 0.6, [0, 0, 0.6, 1], [0, 1, 0.6, 0]);
  def('Y', 0.6, [0, 1, 0.3, 0.5, 0.6, 1], [0.3, 0.5, 0.3, 0]);
  def('Z', 0.58, [0, 1, 0.58, 1, 0, 0, 0.58, 0]);

  def('a', 0.5, arc(0.25, 0.3, 0.25, 0.3, 0, 360), [0.5, 0.6, 0.5, 0]);
  def('b', 0.5, [0, 1, 0, 0], arc(0.25, 0.3, 0.25, 0.3, 0, 360));
  def('c', 0.46, arc(0.25, 0.3, 0.25, 0.3, 45, 315));
  def('d', 0.5, arc(0.25, 0.3, 0.25, 0.3, 0, 360), [0.5, 1, 0.5, 0]);
  def('e', 0.5, J([0, 0.3, 0.5, 0.3], arc(0.25, 0.3, 0.25, 0.3, 0, 320)));
  def('f', 0.34, J([0.12, 0], arc(0.3, 0.8, 0.18, 0.2, 180, 30)), [0, 0.6, 0.32, 0.6]);
  def('g', 0.5, arc(0.25, 0.3, 0.25, 0.3, 0, 360),
                J([0.5, 0.6, 0.5, -0.08], arc(0.25, -0.08, 0.25, 0.22, 0, -165)));
  def('h', 0.5, [0, 1, 0, 0], J([0, 0.33], arc(0.25, 0.33, 0.25, 0.27, 180, 0), [0.5, 0]));
  def('i', 0, [0, 0, 0, 0.6], [0, 0.8, 0, 0.84]);
  def('j', 0.2, J([0.2, 0.6, 0.2, -0.1], arc(0.02, -0.1, 0.18, 0.2, 0, -150)), [0.2, 0.8, 0.2, 0.84]);
  def('k', 0.46, [0, 1, 0, 0], [0.44, 0.6, 0, 0.24], [0.13, 0.33, 0.46, 0]);
  def('l', 0, [0, 1, 0, 0]);
  def('m', 0.8, [0, 0, 0, 0.6], J([0, 0.38], arc(0.2, 0.38, 0.2, 0.22, 180, 0), [0.4, 0]),
                J([0.4, 0.38], arc(0.6, 0.38, 0.2, 0.22, 180, 0), [0.8, 0]));
  def('n', 0.5, [0, 0, 0, 0.6], J([0, 0.33], arc(0.25, 0.33, 0.25, 0.27, 180, 0), [0.5, 0]));
  def('o', 0.54, arc(0.27, 0.3, 0.27, 0.3, 0, 360));
  def('p', 0.5, [0, 0.6, 0, -0.32], arc(0.25, 0.3, 0.25, 0.3, 0, 360));
  def('q', 0.5, arc(0.25, 0.3, 0.25, 0.3, 0, 360), [0.5, 0.6, 0.5, -0.32]);
  def('r', 0.36, [0, 0, 0, 0.6], J([0, 0.34], arc(0.24, 0.34, 0.24, 0.26, 180, 60)));
  def('s', 0.42, J(arc(0.21, 0.45, 0.2, 0.15, 15, 270), arc(0.21, 0.15, 0.21, 0.15, 90, -165)));
  def('t', 0.34, J([0.12, 0.92], arc(0.27, 0.1, 0.15, 0.1, 180, 270), [0.34, 0]), [0, 0.6, 0.32, 0.6]);
  def('u', 0.5, J([0, 0.6, 0, 0.28], arc(0.25, 0.28, 0.25, 0.28, 180, 360)), [0.5, 0.6, 0.5, 0]);
  def('v', 0.5, [0, 0.6, 0.25, 0, 0.5, 0.6]);
  def('w', 0.74, [0, 0.6, 0.18, 0, 0.37, 0.45, 0.56, 0, 0.74, 0.6]);
  def('x', 0.5, [0, 0, 0.5, 0.6], [0, 0.6, 0.5, 0]);
  def('y', 0.5, [0, 0.6, 0.25, 0.04], [0.5, 0.6, 0.12, -0.32]);
  def('z', 0.48, [0, 0.6, 0.48, 0.6, 0, 0, 0.48, 0]);

  def('0', 0.56, arc(0.28, 0.5, 0.28, 0.5, 0, 360));
  def('1', 0.3, [0, 0.78, 0.26, 1, 0.26, 0]);
  def('2', 0.56, J(arc(0.28, 0.72, 0.27, 0.28, 165, -25), [0, 0, 0.56, 0]));
  def('3', 0.54, J(arc(0.26, 0.76, 0.25, 0.24, 155, -90), arc(0.26, 0.26, 0.28, 0.26, 90, -155)));
  def('4', 0.58, [0.44, 0, 0.44, 1, 0, 0.3, 0.58, 0.3]);
  def('5', 0.54, J([0.52, 1, 0.08, 1, 0.05, 0.56], arc(0.26, 0.32, 0.28, 0.32, 135, -160)));
  def('6', 0.56, [0.46, 1, 0.06, 0.42], arc(0.28, 0.3, 0.28, 0.3, 0, 360));
  def('7', 0.56, [0, 1, 0.56, 1, 0.18, 0]);
  def('8', 0.56, arc(0.28, 0.76, 0.23, 0.24, 0, 360), arc(0.28, 0.26, 0.28, 0.26, 0, 360));
  def('9', 0.56, arc(0.28, 0.7, 0.28, 0.3, 0, 360), [0.56, 0.7, 0.14, 0]);

  def('(', 0.2, arc(0.4, 0.5, 0.4, 0.62, 128, 232));
  def(')', 0.2, arc(-0.2, 0.5, 0.4, 0.62, 52, -52));
  def('+', 0.5, [0, 0.4, 0.5, 0.4], [0.25, 0.15, 0.25, 0.65]);
  def('-', 0.36, [0, 0.4, 0.36, 0.4]);
  def('·', 0, [0, 0.45, 0, 0.49]);
  def('=', 0.5, [0, 0.3, 0.5, 0.3], [0, 0.52, 0.5, 0.52]);
  def(' ', 0.36);
  return g;
})();

// A string laid out in font units: its strokes, and how wide it runs.
function textLayout(str, chem) {
  const strokes = [];
  let x = 0, prev = '', prevSub = false, sup = false, last = 0;
  for (const ch of str) {
    if (chem && ch === '^') { sup = true; continue; }
    if (ch === ' ') sup = false;
    let sc = 1, dy = 0, sub = false;
    if (chem && sup) { sc = 0.62; dy = 0.55; }
    else if (chem && /[0-9]/.test(ch) && (/[A-Za-z)]/.test(prev) || (prevSub && /[0-9]/.test(prev)))) {
      sc = 0.62; dy = -0.24; sub = true;
    }
    const g = FONT[ch] || FONT[' '];
    for (const st of g.s) {
      const q = [];
      for (let i = 0; i < st.length; i += 2) q.push(x + st[i] * sc, dy + st[i + 1] * sc);
      strokes.push(q);
    }
    x += (g.w + 0.17) * sc;
    last = 0.17 * sc;
    prev = ch; prevSub = sub;
  }
  return { strokes, w: Math.max(0, x - last) };
}

// Text with its middle at (x, y), turned by th, its capitals `cap` mm high.
function drawText(str, chem, x, y, cap, th) {
  const L = textLayout(str, chem);
  const c = Math.cos(th), s = Math.sin(th);
  for (const st of L.strokes) {
    const xs = [], ys = [];
    for (let i = 0; i < st.length; i += 2) {
      const lx = (st[i] - L.w / 2) * cap, ly = -(st[i + 1] - 0.5) * cap;
      xs.push(x + lx * c - ly * s); ys.push(y + lx * s + ly * c);
    }
    emit(xs, ys);
  }
  return L.w * cap;
}

// The way text should run at an angle so that it is never upside down.
function readable(th) {
  const a = wrapAngle(th);
  return a > Math.PI / 2 ? a - Math.PI : a < -Math.PI / 2 ? a + Math.PI : a;
}

////////////////////////////////////////////////////////////////////////////////////////
// Marks
//
// Small signs out of a chemist's notebook, laid in a frame of their own: x along the line
// or the band, y across it, one unit of the mark's size across, and never upside down.
// Beside a thread they sit off to one side of it and turn with it; beside a glyph they
// stand clear of it, squared to the band or at any angle. A mark keeps off the glyphs and
// off the marks already laid, and tries elsewhere a few times before it gives up.

let MF = { ox: 0, oy: 0, c: 1, s: 0, k: 1 };
let FOOT = [];               // the boxes the marks and labels stand in: { x, y, c, s, hw, hh }

function mpt(lx, ly) {
  return [MF.ox + MF.k * (lx * MF.c - ly * MF.s), MF.oy + MF.k * (lx * MF.s + ly * MF.c)];
}

function mline(...p) {
  const xs = [], ys = [];
  for (let i = 0; i < p.length; i += 2) {
    const [x, y] = mpt(p[i], p[i + 1]);
    xs.push(x); ys.push(y);
  }
  emit(xs, ys);
}

function mcirc(lx, ly, r) { const [x, y] = mpt(lx, ly); emitCirc(x, y, r * MF.k); }
function mdot(lx, ly, r) { const [x, y] = mpt(lx, ly); discFill(x, y, Math.max(r * MF.k, PW * 0.5)); }

function mellipse(cx, cy, rx, ry, a) {
  const n = arcSteps(Math.max(rx, ry) * MF.k, 2 * Math.PI);
  const p = [], c = Math.cos(a), s = Math.sin(a);
  for (let i = 0; i <= n; i++) {
    const t = 2 * Math.PI * i / n, ex = rx * Math.cos(t), ey = ry * Math.sin(t);
    p.push(cx + ex * c - ey * s, cy + ex * s + ey * c);
  }
  mline(...p);
}

// Text at a point of the frame, `cap` of the frame's unit high, at the world angle th.
function mtext(str, lx, ly, cap, th) {
  const [x, y] = mpt(lx, ly);
  drawText(str, true, x, y, cap * MF.k, th);
}

// The corners of a regular polygon, the first at angle a0.
function ngon(k, R, a0) {
  const p = [];
  for (let j = 0; j < k; j++) {
    const a = a0 + j * 2 * Math.PI / k;
    p.push(R * Math.cos(a), R * Math.sin(a));
  }
  return p;
}

function mring(p) { mline(...p, p[0], p[1]); }

// The second line of a double bond inside a ring, on the sides asked for: drawn towards
// the middle by t of the way and a sixth short at either end.
function mkekule(p, sides, t) {
  const k = p.length / 2;
  for (const j of sides) {
    const a = j % k, b = (j + 1) % k;
    const ax = p[a * 2] * (1 - t), ay = p[a * 2 + 1] * (1 - t);
    const bx = p[b * 2] * (1 - t), by = p[b * 2 + 1] * (1 - t);
    const dx = (bx - ax) / 6, dy = (by - ay) / 6;
    mline(ax + dx, ay + dy, bx - dx, by - dy);
  }
}

function drawMark(type, key) {
  const h = j => hash01(key, j, 601);
  const th = Math.atan2(MF.s, MF.c);
  switch (type) {
    case 'benzene': {
      const p = ngon(6, 0.5, h(1) < 0.5 ? 0 : Math.PI / 6);
      mring(p);
      if (h(2) < 0.5) mcirc(0, 0, 0.29);
      else mkekule(p, h(3) < 0.5 ? [0, 2, 4] : [1, 3, 5], 0.24);
      break;
    }
    case 'ring of five': {
      const p = ngon(5, 0.46, -Math.PI / 2);
      if (h(1) < 0.55) {
        // a heteroatom at the top corner, the bonds to it stopping short of its symbol
        const el = ['O', 'N', 'S'][Math.floor(h(2) * 3)];
        for (let j = 0; j < 5; j++) {
          const a = j, b = (j + 1) % 5;
          let ax = p[a * 2], ay = p[a * 2 + 1], bx = p[b * 2], by = p[b * 2 + 1];
          if (a === 0) { ax += (bx - ax) * 0.4; ay += (by - ay) * 0.4; }
          if (b === 0) { bx += (ax - bx) * 0.4; by += (ay - by) * 0.4; }
          mline(ax, ay, bx, by);
        }
        mtext(el, p[0], p[1], 0.3, th);
        if (h(3) < 0.6) mkekule(p, [1, 3], 0.24);
      } else {
        mring(p);
        mkekule(p, [Math.floor(h(4) * 5)], 0.24);
      }
      break;
    }
    case 'chain': {
      // a skeletal formula: bonds at 120° to one another, one of them double, and now and
      // then a group written out at its end
      const m = 3 + Math.floor(h(1) * 4), b = 0.34;
      const dx = b * Math.cos(Math.PI / 6), dy = b * 0.5;
      const xs = [], ys = [];
      const flip = h(2) < 0.5 ? 1 : -1;
      for (let i = 0; i <= m; i++) { xs.push(-m * dx / 2 + i * dx); ys.push(((i % 2) - 0.5) * dy * flip); }
      const groups = ['OH', 'O', 'N', 'NH2', 'Cl', 'COOH', 'SH'];
      const grp = h(3) < 0.45 ? groups[Math.floor(h(4) * groups.length)] : null;
      const p = [];
      for (let i = 0; i <= m; i++) p.push(xs[i], ys[i]);
      if (grp) {
        // the last bond stops short and the group is written past its end
        const w = textLayout(grp, true).w * 0.3;
        const lx = xs[m - 1], ly = ys[m - 1];
        p[m * 2] = lx + (xs[m] - lx) * 0.55; p[m * 2 + 1] = ly + (ys[m] - ly) * 0.55;
        mtext(grp, xs[m] + w / 2 - 0.05, ys[m], 0.3, th);
      }
      mline(...p);
      const j = Math.floor(h(5) * (grp ? m - 1 : m));
      const ax = xs[j], ay = ys[j], bx = xs[j + 1], by = ys[j + 1];
      const nx = -(by - ay) / b, ny = (bx - ax) / b, sg = (ay + by) / 2 * ny > 0 ? -1 : 1;
      const o = 0.08 * sg;
      mline(ax + (bx - ax) * 0.18 + nx * o, ay + (by - ay) * 0.18 + ny * o,
            bx - (bx - ax) * 0.18 + nx * o, by - (by - ay) * 0.18 + ny * o);
      break;
    }
    case 'reaction arrow': {
      const v = Math.floor(h(1) * 4);
      if (v === 1) {
        // an equilibrium: two half arrows, one each way
        mline(-0.6, -0.08, 0.6, -0.08, 0.42, -0.2);
        mline(0.6, 0.08, -0.6, 0.08, -0.42, 0.2);
      } else if (v === 3) {
        // resonance: one line, a head at each end
        mline(-0.6, 0, 0.6, 0);
        mline(0.44, -0.12, 0.6, 0, 0.44, 0.12);
        mline(-0.44, -0.12, -0.6, 0, -0.44, 0.12);
      } else {
        mline(-0.6, 0, 0.6, 0);
        mline(0.44, -0.12, 0.6, 0, 0.44, 0.12);
        if (v === 2) mline(-0.1, -0.12, 0, -0.3, 0.1, -0.12, -0.1, -0.12);   // Δ, heat
      }
      break;
    }
    case 'atom':
      for (let j = 0; j < 3; j++) mellipse(0, 0, 0.55, 0.18, j * Math.PI / 3);
      mdot(0, 0, 0.06);
      break;
    case 'orbital': {
      // a p orbital — two lobes — or a d orbital — four
      const d = h(1) < 0.35, a = 0.55, n = 96, p = [];
      for (let i = 0; i <= n; i++) {
        const t = 2 * Math.PI * i / n;
        const r = d ? a * Math.cos(2 * t) ** 2 : a * Math.cos(t) ** 2;
        p.push(r * Math.cos(t), r * Math.sin(t) * (d ? 1 : 0.85));
      }
      mline(...p);
      break;
    }
    case 'charge':
      mcirc(0, 0, 0.24);
      mline(-0.13, 0, 0.13, 0);
      if (h(1) < 0.5) mline(0, -0.13, 0, 0.13);
      break;
    case 'lattice': {
      // a salt's lattice: small ions and large ones in turn, bonds between neighbours
      const g = 0.3, o = -g, rad2 = (i, j) => (i + j) % 2 ? 0.05 : 0.1;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          for (const [di, dj] of [[1, 0], [0, 1]]) {
            if (i + di > 2 || j + dj > 2) continue;
            const ax = o + i * g, ay = o + j * g, bx = o + (i + di) * g, by = o + (j + dj) * g;
            const ra = rad2(i, j), rb = rad2(i + di, j + dj);
            mline(ax + (bx - ax) * ra / g, ay + (by - ay) * ra / g,
                  bx - (bx - ax) * rb / g, by - (by - ay) * rb / g);
          }
          if ((i + j) % 2) mdot(o + i * g, o + j * g, 0.05);
          else mcirc(o + i * g, o + j * g, 0.1);
        }
      }
      break;
    }
    case 'wedge': {
      if (h(1) < 0.5) {
        // a bond coming out of the paper, solid
        const [x0, y0] = mpt(-0.55, 0), [x1, y1] = mpt(0.55, -0.13), [x2, y2] = mpt(0.55, 0.13);
        polyFill([x0, x1, x2], [y0, y1, y2]);
      } else {
        // one going in, hashed
        for (let i = 0; i < 7; i++) {
          const t = (i + 0.5) / 7, x = -0.55 + 1.1 * t, w = 0.02 + 0.12 * t;
          mline(x, -w, x, w);
        }
      }
      break;
    }
    case 'spectrum': {
      // a stick spectrum: a baseline and peaks up from it, a multiplet now and then
      mline(-0.7, 0.3, 0.7, 0.3);
      const m = 3 + Math.floor(h(1) * 4);
      for (let i = 0; i < m; i++) {
        const x = -0.6 + 1.2 * h(10 + i), t = h(20 + i), H = 0.12 + 0.55 * t * t;
        if (h(30 + i) < 0.3) {
          for (const d of [-0.05, 0, 0.05]) mline(x + d, 0.3, x + d, 0.3 - H * (d ? 0.6 : 1));
        } else {
          mline(x, 0.3, x, 0.3 - H);
        }
      }
      break;
    }
  }
}

// Whether a box — centred at (cx, cy), turned by (c, s), hw by hh either side — stands
// clear of the glyphs, of the boxes already laid and, when asked, of the lines.
function boxFree(cx, cy, c, s, hw, hh, lines) {
  const pts = [];
  for (let i = -2; i <= 2; i++) {
    for (let j = -1; j <= 1; j++) {
      const lx = hw * i / 2, ly = hh * j;
      pts.push(cx + lx * c - ly * s, cy + lx * s + ly * c);
    }
  }
  for (let q = 0; q < pts.length; q += 2) {
    if (insideGlyph(pts[q], pts[q + 1], -1, -1)) return false;
  }
  for (const b of FOOT) {
    if (Math.hypot(b.x - cx, b.y - cy) > Math.hypot(b.hw, b.hh) + Math.hypot(hw, hh)) continue;
    for (let q = 0; q < pts.length; q += 2) {
      const dx = pts[q] - b.x, dy = pts[q + 1] - b.y;
      if (Math.abs(dx * b.c + dy * b.s) < b.hw && Math.abs(-dx * b.s + dy * b.c) < b.hh) return false;
    }
    const dx = b.x - cx, dy = b.y - cy;
    if (Math.abs(dx * c + dy * s) < hw && Math.abs(-dx * s + dy * c) < hh) return false;
  }
  if (lines && LINE_GRID) {
    const G = LINE_GRID, R = Math.hypot(hw, hh);
    const g0 = Math.floor((cx - R) / G.cell), g1 = Math.floor((cx + R) / G.cell);
    const h0 = Math.floor((cy - R) / G.cell), h1 = Math.floor((cy + R) / G.cell);
    for (let gy = h0; gy <= h1; gy++) {
      for (let gx = g0; gx <= g1; gx++) {
        const l = G.map.get(gy * 100003 + gx);
        if (!l) continue;
        for (let q = 0; q < l.length; q += 2) {
          const dx = l[q] - cx, dy = l[q + 1] - cy;
          if (Math.abs(dx * c + dy * s) < hw && Math.abs(-dx * s + dy * c) < hh) return false;
        }
      }
    }
  }
  return true;
}

function layMarks() {
  const s = settings, u = s.unit, N = NODES.length;
  const n = clamp(Math.round(s.marks), 0, 20000);
  if (!n || (!N && !SEGS.length)) return 0;
  const rnd = rng(59);
  const table = weights(MARKS);
  const k = u * 0.9 * clamp(s.markSize, 10, 500) / 100;
  let laid = 0;
  for (let m = 0; m < n; m++) {
    const type = pick(table, rnd());
    if (!type) break;
    const hw = (type === 'chain' || type === 'spectrum' || type === 'reaction arrow' ? 0.75 : 0.6) * k;
    const hh = 0.5 * k;
    for (let tries = 0; tries < 6; tries++) {
      let ox, oy, th;
      if (SEGS.length && rnd() < s.markAttach / 100) {
        const P = SEGS[Math.floor(rnd() * SEGS.length)];
        if (P.len < k) continue;
        pathAt(P, P.len * (0.2 + 0.6 * rnd()));
        const side = rnd() < 0.5 ? 1 : -1, off = hh + k * (0.25 + 0.4 * rnd());
        ox = AX - ATY * off * side; oy = AY + ATX * off * side;
        th = Math.atan2(ATY, ATX);
      } else if (N) {
        const A = NODES[Math.floor(rnd() * N)];
        const a = rnd() * 2 * Math.PI, d = exitDist(A, Math.cos(a), Math.sin(a)) + k * (0.8 + 0.9 * rnd());
        ox = A.x + Math.cos(a) * d; oy = A.y + Math.sin(a) * d;
        th = rnd() < s.snap / 100 ? axisAt(ox, oy) + (rnd() < 0.2 ? Math.PI / 2 : 0)
                                  : rnd() * 2 * Math.PI;
      } else continue;
      th = readable(th);
      const c = Math.cos(th), sn = Math.sin(th);
      if (!boxFree(ox, oy, c, sn, hw * 0.85, hh * 0.85, false)) continue;
      FOOT.push({ x: ox, y: oy, c, s: sn, hw: hw * 0.85, hh: hh * 0.85 });
      MF = { ox, oy, c, s: sn, k };
      usePen(L_MARKS, ox, oy, m);
      drawMark(type, m);
      laid++;
      break;
    }
  }
  return laid;
}

////////////////////////////////////////////////////////////////////////////////////////
// Labels
//
// Compounds named beside the score, by formula or by their English name. A
// label beside a thread lies along it, off to one side; one beside a glyph stands square
// to the band, and now and then a short leader points from it at the glyph, the way a
// drawing is annotated. A label keeps clear of the glyphs, the lines, the marks and the
// labels already laid, and tries elsewhere a few times before it gives up — so a crowded
// sheet has its labels round its edges.

const COMPOUNDS = [
  // formula, name
  ['H2O', 'water'],
  ['CO2', 'carbon dioxide'],
  ['NaCl', 'sodium chloride'],
  ['CH4', 'methane'],
  ['NH3', 'ammonia'],
  ['C6H12O6', 'glucose'],
  ['H2SO4', 'sulfuric acid'],
  ['HNO3', 'nitric acid'],
  ['C2H5OH', 'ethanol'],
  ['CaCO3', 'calcium carbonate'],
  ['NaHCO3', 'baking soda'],
  ['C8H10N4O2', 'caffeine'],
  ['O3', 'ozone'],
  ['H2O2', 'hydrogen peroxide'],
  ['Fe2O3', 'iron oxide'],
  ['CuSO4·5H2O', 'blue vitriol'],
  ['KMnO4', 'potassium permanganate'],
  ['C9H8O4', 'aspirin'],
  ['C12H22O11', 'sucrose'],
  ['SiO2', 'silica'],
  ['NaOH', 'caustic soda'],
  ['HCl', 'hydrochloric acid'],
  ['CH3COOH', 'acetic acid'],
  ['C3H8', 'propane'],
  ['N2O', 'laughing gas'],
  ['SO2', 'sulfur dioxide'],
  ['C10H8', 'naphthalene'],
  ['C6H6', 'benzene'],
  ['C8H9NO2', 'paracetamol'],
  ['AgNO3', 'silver nitrate'],
  ['MgSO4', 'epsom salt'],
  ['Ca(OH)2', 'slaked lime'],
  ['NH4^+', 'ammonium'],
  ['SO4^2-', 'sulfate'],
  ['C6H8O7', 'citric acid'],
  ['ZnO', 'zinc oxide'],
  ['Al2O3', 'corundum'],
  ['PbS', 'galena'],
  ['HgS', 'cinnabar'],
  ['NaClO', 'bleach'],
  ['C2H4', 'ethylene'],
  ['C5H5N', 'pyridine'],
  ['BaSO4', 'barite'],
  ['C20H14O4', 'phenolphthalein'],
  ['C27H46O', 'cholesterol'],
  ['C8H8', 'styrene'],
  ['CH2O', 'formaldehyde'],
  ['Na2B4O7', 'borax'],
  ['KNO3', 'saltpetre'],
];

let LINE_GRID = null;

// Every line drawn so far, as points a millimetre apart in a grid, for labels to keep off.
function buildLineGrid() {
  const cell = 4, map = new Map();
  const add = (x, y) => {
    const key = Math.floor(y / cell) * 100003 + Math.floor(x / cell);
    const l = map.get(key);
    if (l) l.push(x, y); else map.set(key, [x, y]);
  };
  for (const P of SEGS) {
    const n = Math.max(1, Math.ceil(P.len / 1));
    for (let i = 0; i <= n; i++) { pathAt(P, P.len * i / n); add(AX, AY); }
  }
  return { cell, map };
}

function layLabels() {
  const s = settings, u = s.unit, N = NODES.length;
  const n = clamp(Math.round(s.labels), 0, 2000);
  if (!n || (!N && !SEGS.length)) return 0;
  LINE_GRID = buildLineGrid();
  const rnd = rng(83);
  const cap = u * clamp(s.labelSize, 10, 500) / 100;
  let laid = 0;
  for (let m = 0; m < n; m++) {
    const cmp = COMPOUNDS[Math.floor(rnd() * COMPOUNDS.length)];
    const formula = s.labelText === 'formulas' || (s.labelText === 'mixed' && rnd() < 0.6);
    const text = formula ? cmp[0] : cmp[1];
    const hw = textLayout(text, formula).w * cap / 2 + 0.2 * cap, hh = 0.72 * cap;
    for (let tries = 0; tries < 10; tries++) {
      let cx, cy, th, lead = null;
      if (SEGS.length && rnd() < s.labelAttach / 100) {
        const P = SEGS[Math.floor(rnd() * SEGS.length)];
        if (P.len < hw * 1.2) continue;
        pathAt(P, P.len * (0.3 + 0.4 * rnd()));
        th = readable(Math.atan2(ATY, ATX));
        const side = rnd() < 0.5 ? 1 : -1, off = hh + 0.3 * cap;
        cx = AX - Math.sin(th) * off * side; cy = AY + Math.cos(th) * off * side;
      } else if (N) {
        const A = NODES[Math.floor(rnd() * N)];
        th = readable(axisAt(A.x, A.y));
        const leader = rnd() < s.labelLeaders / 100;
        // along the band either way, or off at an angle with a leader to the glyph
        const phi = th + (rnd() < 0.5 ? 0 : Math.PI) +
          (leader ? (rnd() < 0.5 ? 1 : -1) * rad(25 + 40 * rnd()) : 0);
        const dphi = phi - th;
        const ext = Math.abs(hw * Math.cos(dphi)) + Math.abs(hh * Math.sin(dphi));
        const e = exitDist(A, Math.cos(phi), Math.sin(phi));
        const gap = leader ? cap * (1.4 + 1.8 * rnd()) : 0.35 * cap;
        const d = e + gap + ext;
        cx = A.x + Math.cos(phi) * d; cy = A.y + Math.sin(phi) * d;
        if (leader) {
          const d0 = e + Math.max(0.1, s.lineGap) + 0.1 * cap, d1 = e + gap - 0.15 * cap;
          lead = [A.x + Math.cos(phi) * d0, A.y + Math.sin(phi) * d0,
                  A.x + Math.cos(phi) * d1, A.y + Math.sin(phi) * d1];
        }
      } else continue;
      const c = Math.cos(th), sn = Math.sin(th);
      if (!boxFree(cx, cy, c, sn, hw, hh, true)) continue;
      FOOT.push({ x: cx, y: cy, c, s: sn, hw, hh });
      usePen(L_LABELS, cx, cy, m);
      drawText(text, formula, cx, cy, cap, th);
      if (lead) emitSeg(lead[0], lead[1], lead[2], lead[3]);
      laid++;
      break;
    }
  }
  return laid;
}

////////////////////////////////////////////////////////////////////////////////////////
// Broad strokes — what the markers draw
//
// Notes sit on glyphs: one dab of the nib, a disc filled from its edge in, a ring, or a
// disc set beside the glyph like a moon. Staves run along the middle of each band at an
// even gap, broken here and there. Bars are strokes along the band from a glyph onward,
// the durations of a piano roll. Sweeps are long gestures bent by noise.

function layNotes() {
  const s = settings, N = NODES.length;
  const n = clamp(Math.round(s.notes), 0, N);
  if (!n) return 0;
  LAY = L_NOTES;
  setPen(layerPen(L_NOTES));
  const rnd = rng(61);
  let order = NODES.map((nd, i) => i);
  const byHash = (a, b) => hash01(a, 1, 801) - hash01(b, 1, 801);
  if (s.notePick === 'random') order.sort(byHash);
  else if (s.notePick === 'largest') order.sort((a, b) => NODES[b].r - NODES[a].r);
  else if (s.notePick === 'hubs first') {
    order.sort((a, b) => (NODES[b].hub ? 1 : 0) - (NODES[a].hub ? 1 : 0) || byHash(a, b));
  } else {
    const first = [];
    for (const c of CLUSTERS) {
      let best = -1, bd = Infinity;
      for (let i = 0; i < N; i++) {
        const d = Math.hypot(NODES[i].x - c.x, NODES[i].y - c.y);
        if (d < bd && !first.includes(i)) { bd = d; best = i; }
      }
      if (best >= 0) first.push(best);
    }
    order = first.concat(order.filter(i => !first.includes(i)).sort(byHash));
  }
  // notes do not crowd one another
  const D = Math.max(s.noteSize, PW);
  const placed = [];
  for (const i of order) {
    if (placed.length >= n) break;
    const A = NODES[i];
    let x = A.x, y = A.y;
    if (s.noteShape === 'beside') {
      const a = rnd() * 2 * Math.PI, d = D * 0.5 + exitDist(A, 1, 0) * 0.3;
      x += Math.cos(a) * d; y += Math.sin(a) * d;
    }
    if (placed.some(p => Math.hypot(p[0] - x, p[1] - y) < D * 1.15 + PW)) continue;
    placed.push([x, y]);
    if (s.noteShape === 'ring') {
      const r = Math.max(D / 2, exitDist(A, 1, 0) + PW / 2 + 0.6 * s.unit);
      emitCirc(x, y, r);
    } else if (s.noteSize <= PW * 1.05) {
      emitDab(x, y);
    } else {
      discFill(x, y, D / 2);
    }
  }
  return placed.length;
}

function layStaves() {
  const s = settings, sh = SHAPE;
  const n = clamp(Math.round(s.staves), 0, 40);
  if (!n) return 0;
  LAY = L_STAVES;
  setPen(layerPen(L_STAVES));
  const rnd = rng(67);
  const gap = Math.max(0.1, s.staveGap);
  for (let b = 0; b < sh.bands.length; b++) {
    for (let k = 0; k < n; k++) {
      const off = (k - (n - 1) / 2) * gap;
      const wob = s.staveWobble;
      const xs = [], ys = [];
      if (sh.layout === 'ring') {
        const rr = sh.Lh + off;
        if (rr <= 0) continue;
        const m = Math.ceil(2 * Math.PI * rr / 1);
        for (let i = 0; i <= m; i++) {
          const phi = 2 * Math.PI * i / m;
          const w = wob ? wob * fbm(NZ[3], Math.cos(phi) * 2 + k, Math.sin(phi) * 2, b, 2) : 0;
          xs.push(sh.cx + Math.cos(phi) * (rr + w)); ys.push(sh.cy + Math.sin(phi) * (rr + w));
        }
      } else {
        const half = sh.Lh * clamp(s.staveLen, 1, 300) / 100;
        const m = Math.max(2, Math.ceil(2 * half));
        for (let i = 0; i <= m; i++) {
          const al = -half + 2 * half * i / m;
          const w = wob ? wob * fbm(NZ[3], al / 40, k * 3.3, b, 2) : 0;
          const ac = (sh.layout === 'band' ? sh.bands[b].off + meander(sh, al, b) : 0) + off + w;
          xs.push(sh.cx + al * sh.ca - ac * sh.sa); ys.push(sh.cy + al * sh.sa + ac * sh.ca);
        }
      }
      const P = mkPath(xs, ys);
      if (!P) continue;
      // breaks: gaps cut at random places
      const cuts = [];
      for (let q = 0; q < Math.round(s.staveBreaks); q++) {
        const c = rnd() * P.len, w = P.len * (0.015 + 0.04 * rnd());
        cuts.push([c - w / 2, c + w / 2]);
      }
      cuts.sort((a, c) => a[0] - c[0]);
      let from = 0;
      for (const [a, c] of cuts) {
        if (a > from + MIN_PIECE) emitPath(slicePath(P, from, a));
        from = Math.max(from, c);
      }
      if (P.len > from + MIN_PIECE) emitPath(slicePath(P, from, P.len));
    }
  }
  return n * sh.bands.length;
}

function layBars() {
  const s = settings, N = NODES.length;
  const n = clamp(Math.round(s.bars), 0, 5000);
  if (!n || !N) return 0;
  LAY = L_BARS;
  setPen(layerPen(L_BARS));
  const rnd = rng(71);
  for (let k = 0; k < n; k++) {
    const A = NODES[Math.floor(rnd() * N)];
    const th = axisAt(A.x, A.y) + rad(s.barTilt) * (rnd() * 2 - 1);
    const lo = Math.min(s.barMin, s.barMax), hi = Math.max(s.barMin, s.barMax);
    const L = lo + (hi - lo) * Math.pow(rnd(), 1.3);
    const c = Math.cos(th), sn = Math.sin(th);
    emitSeg(A.x, A.y, A.x + c * L, A.y + sn * L);
  }
  return n;
}

function laySweeps() {
  const s = settings, sh = SHAPE;
  const n = clamp(Math.round(s.sweeps), 0, 500);
  if (!n) return 0;
  LAY = L_SWEEPS;
  setPen(layerPen(L_SWEEPS));
  const rnd = rng(73);
  for (let k = 0; k < n; k++) {
    const L = Math.max(5, s.sweepLen / 100 * 2 * sh.Lh * (0.6 + 0.6 * rnd()));
    const al = (rnd() * 2 - 1) * sh.Lh * 0.7;
    const ac = (rnd() * 2 - 1) * sh.hw * 0.8;
    let x, y, th;
    if (sh.layout === 'ring') {
      const phi = rnd() * 2 * Math.PI, rr = sh.Lh + ac;
      x = sh.cx + Math.cos(phi) * rr; y = sh.cy + Math.sin(phi) * rr;
      th = phi + Math.PI / 2;
    } else {
      const a0 = al - L / 2;
      x = sh.cx + a0 * sh.ca - ac * sh.sa; y = sh.cy + a0 * sh.sa + ac * sh.ca;
      th = sh.th + (rnd() * 2 - 1) * 0.35;
    }
    const xs = [x], ys = [y];
    const bend = clamp(s.sweepBend, 0, 300) / 100 * 6 / L;
    const steps = Math.ceil(L);
    for (let i = 0; i < steps; i++) {
      th += bend * fbm(NZ[3], i / 60 + k * 9.1, k * 3.7, 0.5, 2) * (L / steps) * 1.6;
      x += Math.cos(th) * L / steps; y += Math.sin(th) * L / steps;
      xs.push(x); ys.push(y);
    }
    emit(xs, ys);
  }
  return n;
}

////////////////////////////////////////////////////////////////////////////////////////
// Everything, in order

function buildShapes() {
  ensureNoise();
  SHAPE = makeShape();
  SINK = makeSink();
  AREAS = [];
  for (let i = 0; i < SLOTS; i++) AREAS.push(penArea(i));
  if (AREAS.every(A => A.w <= 0 || A.h <= 0)) return null;

  CLUSTERS = makeClusters();
  NODES = chooseGlyphs(placeNodes());
  NODE_GRID = buildNodeGrid(NODES);
  NEIGH = buildNeighbours(NODES);
  SEGS = [];
  FOOT = [];
  LINE_GRID = null;

  // the broad layers first, so the fine ones are laid over them in the sink's own order
  const notes = layNotes();
  layStaves();
  layBars();
  laySweeps();

  const threads = layThreads();
  const stems = layStems();
  layArcs();
  layRays();
  layVoices();
  const marks = layMarks();
  const labels = layLabels();

  for (let i = 0; i < NODES.length; i++) {
    const n = NODES[i];
    if (n.type === 'none') continue;
    usePen(L_GLYPHS, n.x, n.y, i);
    drawGlyph(n);
  }

  counts = {
    nodes: NODES.length, placed: placedCount, wanted: placedWanted, threads, stems, marks, notes,
    labels, labelsWanted: Math.round(settings.labels),
    hubs: NODES.filter(n => n.hub).length,
  };
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

// The shape the glyphs were scattered over, its clusters and the margin. Never plotted.
function drawGuides(ctx) {
  const sh = SHAPE;
  if (!sh) return;
  const dark = luma(settings.paperColor) < 0.25;
  const col = dark ? 'rgba(110, 200, 255, 0.85)' : 'rgba(26, 109, 209, 0.8)';
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 0.35;
  const A = penArea(0);
  ctx.setLineDash([2, 1.5]);
  ctx.strokeRect(A.x0, A.y0, A.w, A.h);
  ctx.setLineDash([1.2, 1.2]);
  const line = (f) => {
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const [x, y] = f(i / 200);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
  };
  if (sh.layout === 'band') {
    for (let b = 0; b < sh.bands.length; b++) {
      for (const side of [-1, 0, 1]) {
        line(q => {
          const al = -sh.Lh + 2 * sh.Lh * q;
          const ac = sh.bands[b].off + meander(sh, al, b) + side * halfWidth(sh, al, b);
          return [sh.cx + al * sh.ca - ac * sh.sa, sh.cy + al * sh.sa + ac * sh.ca];
        });
      }
    }
  } else if (sh.layout === 'ellipse') {
    line(q => {
      const a = 2 * Math.PI * q, al = Math.cos(a) * sh.Lh, ac = Math.sin(a) * sh.hw;
      return [sh.cx + al * sh.ca - ac * sh.sa, sh.cy + al * sh.sa + ac * sh.ca];
    });
  } else if (sh.layout === 'ring') {
    for (const side of [-1, 0, 1]) {
      line(q => {
        const phi = -Math.PI + 2 * Math.PI * q, al = phi * sh.Lh;
        const rr = sh.Lh + meander(sh, al, 0) + side * halfWidth(sh, al, 0);
        return [sh.cx + Math.cos(phi) * rr, sh.cy + Math.sin(phi) * rr];
      });
    }
  }
  ctx.setLineDash([]);
  for (const c of CLUSTERS) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.sig, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(c.x - 2, c.y); ctx.lineTo(c.x + 2, c.y);
    ctx.moveTo(c.x, c.y - 2); ctx.lineTo(c.x, c.y + 2);
    ctx.stroke();
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// The mouse and the keys
//
// A drag moves the band, shift-drag (or a right-drag) turns it, the wheel makes it wider
// or narrower. While the mouse is down the band's outline shows.

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
      at: [e.clientX, e.clientY], turn: e.shiftKey || e.button === 2,
      bx: s.bandX, by: s.bandY, ba: s.bandAngle, moved: false,
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
    const [W, H] = paperDims();
    if (drag.turn) {
      s.bandAngle = +clamp(drag.ba + (dxp - dyp) * 0.3, -180, 180).toFixed(1);
    } else {
      s.bandX = +clamp(drag.bx + dxm / W * 100, -50, 150).toFixed(2);
      s.bandY = +clamp(drag.by + dym / H * 100, -50, 150).toFixed(2);
    }
    for (const k of ['bandX', 'bandY', 'bandAngle']) if (setters[k]) setters[k](s[k]);
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
    const s = settings, f = Math.exp(-e.deltaY * 0.0015);
    s.bandWidth = +clamp(s.bandWidth * f, 1, 200).toFixed(2);
    if (setters.bandWidth) setters.bandWidth(s.bandWidth);
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
    const nudge = (k, d) => { s[k] = +(s[k] + d).toFixed(2); refreshControls(); update(); };
    const cycle = (key, list, dir) => {
      s[key] = list[(list.indexOf(s[key]) + dir + list.length) % list.length];
      refreshControls();
      update();
    };
    switch (e.key) {
      case 'ArrowLeft':  nudge('bandX', -step); break;
      case 'ArrowRight': nudge('bandX', step); break;
      case 'ArrowUp':    nudge('bandY', -step); break;
      case 'ArrowDown':  nudge('bandY', step); break;
      case 'r': case 'R': s.seed = Math.floor(Math.random() * 100000); refreshControls(); update(); break;
      case '[': s.seed = Math.max(0, Math.round(s.seed) - 1); refreshControls(); update(); break;
      case ']': s.seed = Math.round(s.seed) + 1; refreshControls(); update(); break;
      case 'l': cycle('layout', LAYOUTS, 1); break;
      case 'L': cycle('layout', LAYOUTS, -1); break;
      case 'a': cycle('accent', ACCENTS, 1); break;
      case 'A': cycle('accent', ACCENTS, -1); break;
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

function foldedSet() {
  try { return new Set(JSON.parse(localStorage.getItem('p5js17-folded') || '[]')); }
  catch (e) { return new Set(); }
}

function saveFolded(set) {
  try { localStorage.setItem('p5js17-folded', JSON.stringify([...set])); } catch (e) { /* no storage */ }
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
  setVisible('paperColor', true);

  const band = s.layout === 'band', ring = s.layout === 'ring';
  const shaped = band || ring || s.layout === 'ellipse';
  for (const k of ['bandLength', 'bandWidth', 'bandEdge']) setVisible(k, shaped);
  setVisible('bandAngle', s.layout !== 'ring');
  for (const k of ['bandSwell', 'bandWave']) setVisible(k, band || ring);
  setVisible('bandWaveLen', (band || ring) && s.bandWave !== 0);
  setVisible('bands', band);
  setVisible('bandGap', band && s.bands > 1);
  setVisible('clusterPull', s.layout !== 'islands');
  setVisible('clusterSize', s.clusters > 0);
  setVisible('clumpScale', s.clumping > 0);
  setVisible('hubSize', s.hubs > 0);

  setVisible('bulge', s.curvy > 0);
  setVisible('spurLen', s.spurs > 0);
  setVisible('stemLen', s.stems > 0);
  setVisible('lineGap', true);

  for (const k of ['arcMin', 'arcMax', 'arcSweep', 'arcCentred', 'fullCircles', 'arcStyle', 'arcCaps',
                   'arcsPen']) setVisible(k, s.arcs > 0);
  for (const k of ['rayMin', 'rayMax', 'raySpread', 'rayCurve', 'rayStyle', 'raysPen']) setVisible(k, s.rays > 0);
  for (const k of ['voiceStyle', 'voiceStep', 'voiceWander', 'voiceSmooth', 'voicesPen']) setVisible(k, s.voices > 0);
  for (const k of ['noteSize', 'noteShape', 'notePick', 'notesPen']) setVisible(k, s.notes > 0);
  for (const k of ['staveGap', 'staveLen', 'staveBreaks', 'staveWobble', 'stavesPen']) setVisible(k, s.staves > 0);
  setVisible('staveLen', s.staves > 0 && !ring);
  for (const k of ['barMin', 'barMax', 'barTilt', 'barsPen']) setVisible(k, s.bars > 0);
  for (const k of ['sweepLen', 'sweepBend', 'sweepsPen']) setVisible(k, s.sweeps > 0);
  for (const k of ['accentShare', 'accentPen', 'accentOn']) setVisible(k, s.accent !== 'none');
  for (const k of ['labelText', 'labelSize', 'labelAttach', 'labelLeaders', 'labelsPen']) {
    setVisible(k, s.labels > 0);
  }
  for (let i = 1; i <= SLOTS; i++) setVisible(`pen${i}Col`, true);
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
  createDiv('Where the clusters and the glyphs fall, and every choice after. <b>R</b> rolls a ' +
    'new one, <b>[</b> and <b>]</b> step through them.').parent(field).class('note');
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

  sec = addSection(root, 'Scene');
  const sceneSel = createSelect().parent(createDiv('').parent(sec).class('field'));
  for (const sc of SCENES) sceneSel.option(sc.label);
  sceneSel.changed(() => {
    const sc = SCENES[sceneSel.elt.selectedIndex];
    if (sc && sc.s) applyScene(sc);
    sceneSel.elt.selectedIndex = 0;
  });

  // --- where the glyphs go ---
  sec = addSection(root, 'Layout');
  addSeedField(sec);
  addSelect(sec, 'Layout', 'layout', LAYOUTS, resync,
    '<b>band</b> — a strip across the sheet, as in the picture; <b>ellipse</b>; <b>ring</b>; ' +
    '<b>islands</b> — the clusters alone; <b>sheet</b> — anywhere. <b>L</b> steps through them.');
  addSlider(sec, 'Glyphs', 'nodes', 0, 2000, 1,
    'How many signs are scattered. More come in on top of those already there.');
  addSlider(sec, 'Unit (mm)', 'unit', 0.5, 40, 0.1,
    'What everything small is measured in — a glyph is about half a unit across its ' +
    'radius. Scale it with the pen: 2–3 mm for a 0.35 mm pen, 10 mm and more for a marker.');
  addSlider(sec, 'Spacing (units)', 'spacing', 0.2, 12, 0.05,
    'The closest two glyphs may stand, middle to middle.');
  addSlider(sec, 'Across (% of the sheet)', 'bandX', -50, 150, 0.5,
    'Where the middle of the shape sits — a drag on the sheet moves it.');
  addSlider(sec, 'Down (% of the sheet)', 'bandY', -50, 150, 0.5);
  addSlider(sec, 'Angle (°)', 'bandAngle', -180, 180, 0.5, 'Shift-drag turns it.');
  addSlider(sec, 'Length (% of the sheet)', 'bandLength', 5, 200, 0.5,
    'Along the band, or the ellipse — the radius of a ring.');
  addSlider(sec, 'Width (% of the sheet)', 'bandWidth', 1, 200, 0.5,
    'Across the band, where the density has fallen to a third. The wheel changes it.');
  addSlider(sec, 'Edge (%)', 'bandEdge', 0, 100, 1,
    'Soft as a gaussian at 0, a crisp edge at 100.');
  addSlider(sec, 'Swell (%)', 'bandSwell', 0, 100, 1,
    'How much the band thickens and thins along its length.');
  addSlider(sec, 'Meander (% of the sheet)', 'bandWave', 0, 80, 0.5);
  addSlider(sec, 'Meander length (% of the band)', 'bandWaveLen', 5, 200, 1);
  addSlider(sec, 'Bands', 'bands', 1, 8, 1,
    'Several bands side by side, like the systems of a page of music.');
  addSlider(sec, 'Between bands (% of the sheet)', 'bandGap', 2, 80, 0.5);
  addSub(sec, 'Clusters and clumps');
  addSlider(sec, 'Clusters', 'clusters', 0, 40, 1,
    'Knots the glyphs crowd into. A hub is put in each one first.');
  addSlider(sec, 'Cluster size (% of the sheet)', 'clusterSize', 1, 40, 0.5);
  addSlider(sec, 'Pull of the clusters (%)', 'clusterPull', 0, 100, 1,
    'How much of the density gathers in the clusters; the rest is spread along the shape.');
  addSlider(sec, 'Clumping (%)', 'clumping', 0, 100, 1,
    'The density broken up by noise into clumps and gaps.');
  addSlider(sec, 'Clump scale', 'clumpScale', 0.5, 30, 0.1, 'Clumps along the sheet, about.');
  addSlider(sec, 'Strays (%)', 'strays', 0, 60, 1,
    'Glyphs scattered loosely round the shape, standing off on their own.');

  // --- the glyphs ---
  sec = addSection(root, 'Glyphs');
  addPenSelect(sec, 'Pen', 'glyphsPen');
  addSlider(sec, 'Size (%)', 'glyphSize', 10, 400, 1);
  addSlider(sec, 'Variety of size (%)', 'sizeVariety', 0, 100, 1);
  addSlider(sec, 'Inked solid (%)', 'filled', 0, 100, 1,
    'Of the circles and the rings of six and five, filled the way a pen fills — edge, ' +
    'then passes.');
  addSub(sec, 'How often each comes up');
  addSlider(sec, 'Dots — atoms', 'gDot', 0, 100, 1);
  addSlider(sec, 'Circles', 'gCircle', 0, 100, 1);
  addSlider(sec, 'Elements in circles', 'gElement', 0, 100, 1,
    'C, O, N, H, S, P, F, Cl, Br, Si or B in a circle, carbon the most often.');
  addSlider(sec, 'Elements, bare', 'gLetter', 0, 100, 1,
    'The symbol alone, the bonds stopping short of it, as in a skeletal formula.');
  addSlider(sec, 'Rings of six', 'gHexagon', 0, 100, 1, 'Some with the circle of an aromatic ring.');
  addSlider(sec, 'Rings of five', 'gPentagon', 0, 100, 1);
  addSlider(sec, 'Charges', 'gCharge', 0, 100, 1);
  addSlider(sec, 'Nothing — a bare joint', 'gNone', 0, 100, 1);
  addSub(sec, 'Hubs');
  addSlider(sec, 'Hubs', 'hubs', 0, 40, 1,
    'Large signs — a benzene ring, a Bohr atom with its shells, three orbits round a ' +
    'nucleus, a crystal\'s unit cell, a ring of five with an oxygen in it — one in each ' +
    'cluster first. The glyphs under them are taken away.');
  addSlider(sec, 'Hub size (units)', 'hubSize', 1, 20, 0.1);

  // --- threads ---
  sec = addSection(root, 'Threads');
  addPenSelect(sec, 'Pen', 'threadsPen');
  addSlider(sec, 'Threads', 'threads', 0, 2000, 1,
    'Walks from glyph to near glyph, each drawn in one style.');
  addSlider(sec, 'Pieces at most', 'threadLen', 1, 20, 1);
  addSlider(sec, 'Reach (units)', 'reach', 1, 60, 0.5, 'The longest a piece may be.');
  addSlider(sec, 'Straightness (%)', 'straightness', 0, 100, 1,
    'How much a thread likes to keep going the way it was going.');
  addSlider(sec, 'Bowed (%)', 'curvy', 0, 100, 1, 'Pieces drawn as arcs.');
  addSlider(sec, 'Bow (% of the piece)', 'bulge', 0, 50, 1);
  addSlider(sec, 'Elbows (%)', 'elbows', 0, 100, 1,
    'Pieces bent once at a right angle, along the band and then across it.');
  addSlider(sec, 'Spurs (%)', 'spurs', 0, 100, 1,
    'Thread ends running on past their last glyph, into an end mark.');
  addSlider(sec, 'Spur length (units)', 'spurLen', 0.5, 20, 0.1);
  addSlider(sec, 'Join the rest (%)', 'joinRest', 0, 100, 1,
    'Of the glyphs no thread reached, how many are joined to their nearest.');
  addSlider(sec, 'Gap at a glyph (mm)', 'lineGap', -1, 3, 0.05,
    'Between a line\'s end and the edge of the glyph it stops at.');
  addCheckbox(sec, 'Lines stop at the glyphs they cross', 'knockout');
  addSub(sec, 'Stems');
  addPenSelect(sec, 'Pen', 'stemsPen');
  addSlider(sec, 'Stems (% of the glyphs)', 'stems', 0, 100, 1,
    'Short sticks off a glyph, ending in an end mark.');
  addSlider(sec, 'Stem length (units)', 'stemLen', 0.3, 20, 0.1);

  sec = addSection(root, 'Line styles', true);
  addSlider(sec, 'Pattern size (%)', 'motif', 10, 400, 1,
    'How large the dashes, dots, ticks, zigzags and coils are, against the unit.');
  addSub(sec, 'How often each comes up');
  addSlider(sec, 'Solid', 'lsSolid', 0, 100, 1);
  addSlider(sec, 'Dashed', 'lsDashed', 0, 100, 1);
  addSlider(sec, 'Dotted', 'lsDotted', 0, 100, 1);
  addSlider(sec, 'Dash-dot', 'lsDashDot', 0, 100, 1);
  addSlider(sec, 'Double bond', 'lsDouble', 0, 100, 1);
  addSlider(sec, 'Triple bond', 'lsTriple', 0, 100, 1);
  addSlider(sec, 'Hashed — a bond going in', 'lsHashed', 0, 100, 1);
  addSlider(sec, 'Ticked', 'lsTicked', 0, 100, 1);
  addSlider(sec, 'Comb', 'lsComb', 0, 100, 1);
  addSlider(sec, 'Ladder', 'lsLadder', 0, 100, 1);
  addSlider(sec, 'Zigzag', 'lsZigzag', 0, 100, 1);
  addSlider(sec, 'Wave', 'lsWave', 0, 100, 1);
  addSlider(sec, 'Beaded', 'lsBeaded', 0, 100, 1);
  addSlider(sec, 'Coil', 'lsCoil', 0, 100, 1);

  sec = addSection(root, 'End marks', true);
  addSlider(sec, 'Size (%)', 'capSize', 10, 400, 1);
  addSub(sec, 'How often each comes up');
  addSlider(sec, 'Nothing', 'capNone', 0, 100, 1);
  addSlider(sec, 'Tick', 'capTick', 0, 100, 1);
  addSlider(sec, 'Double tick', 'capDouble', 0, 100, 1);
  addSlider(sec, 'Arrow', 'capArrow', 0, 100, 1);
  addSlider(sec, 'Arrowhead, solid', 'capHead', 0, 100, 1);
  addSlider(sec, 'Dot', 'capDot', 0, 100, 1);
  addSlider(sec, 'Circle', 'capCircle', 0, 100, 1);
  addSlider(sec, 'Triangle', 'capTriangle', 0, 100, 1);
  addSlider(sec, 'Square', 'capSquare', 0, 100, 1);
  addSlider(sec, 'Fork', 'capFork', 0, 100, 1);
  addSlider(sec, 'Flag', 'capFlag', 0, 100, 1);

  // --- marks ---
  sec = addSection(root, 'Marks');
  addPenSelect(sec, 'Pen', 'marksPen');
  addSlider(sec, 'Marks', 'marks', 0, 3000, 1,
    'Small signs out of a chemist\'s notebook beside the threads and the glyphs. A mark ' +
    'keeps clear of the glyphs and the other marks, so in a crowded sheet fewer find room.');
  addSlider(sec, 'Size (%)', 'markSize', 10, 400, 1);
  addSlider(sec, 'Beside a thread (%)', 'markAttach', 0, 100, 1,
    'The rest stand beside a glyph.');
  addSlider(sec, 'Squared to the band (%)', 'snap', 0, 100, 1,
    'Of the marks by a glyph, the stems and the glyphs\' own turn: square to the band, or at ' +
    'any angle.');
  addSub(sec, 'How often each comes up');
  addSlider(sec, 'Benzene ring', 'mkBenzene', 0, 100, 1);
  addSlider(sec, 'Ring of five', 'mkRing5', 0, 100, 1, 'Now and then with an O, N or S in it.');
  addSlider(sec, 'Chain — a skeletal formula', 'mkChain', 0, 100, 1);
  addSlider(sec, 'Reaction arrow', 'mkArrow', 0, 100, 1, '→, ⇌, ↔, and → with Δ over it.');
  addSlider(sec, 'Atom — three orbits', 'mkAtom', 0, 100, 1);
  addSlider(sec, 'Orbital — p or d', 'mkOrbital', 0, 100, 1);
  addSlider(sec, 'Charge', 'mkCharge', 0, 100, 1);
  addSlider(sec, 'Ionic lattice', 'mkLattice', 0, 100, 1);
  addSlider(sec, 'Wedge bond', 'mkWedge', 0, 100, 1);
  addSlider(sec, 'Spectrum', 'mkSpectrum', 0, 100, 1);

  // --- labels ---
  sec = addSection(root, 'Labels');
  addSlider(sec, 'Labels', 'labels', 0, 500, 1,
    'Compounds named beside the score, in a stroke font of its own. A label keeps clear of ' +
    'the glyphs, the lines, the marks and the other labels, so a crowded sheet has its ' +
    'labels round its edges.');
  addPenSelect(sec, 'Pen', 'labelsPen');
  addSelect(sec, 'Written as', 'labelText', LABEL_TEXTS, resync,
    '<b>formulas</b> — H₂O, C₆H₁₂O₆, CuSO₄·5H₂O, SO₄²⁻; <b>names</b> — water, glucose, ' +
    'blue vitriol, in English; <b>mixed</b> — both.');
  addSlider(sec, 'Size (% of the unit)', 'labelSize', 20, 400, 1,
    'The height of a capital; small letters and subscripts are 0.6 of it.');
  addSlider(sec, 'Beside a thread (%)', 'labelAttach', 0, 100, 1,
    'Along a thread, off to one side of it; the rest beside a glyph, square to the band.');
  addSlider(sec, 'Leaders (%)', 'labelLeaders', 0, 100, 1,
    'Of those beside a glyph, how many stand off and point at it with a short line.');

  // --- long lines ---
  sec = addSection(root, 'Arcs, rays and voices');
  addSlider(sec, 'Arcs', 'arcs', 0, 300, 1, 'Long curves through a glyph, or round one.');
  addPenSelect(sec, 'Pen', 'arcsPen');
  addSlider(sec, 'Smallest radius (units)', 'arcMin', 1, 150, 0.5);
  addSlider(sec, 'Largest radius (units)', 'arcMax', 1, 150, 0.5);
  addSlider(sec, 'Sweep at most (°)', 'arcSweep', 10, 360, 1);
  addSlider(sec, 'Round a glyph (%)', 'arcCentred', 0, 100, 1);
  addSlider(sec, 'Whole circles (%)', 'fullCircles', 0, 100, 1);
  addSelect(sec, 'Style', 'arcStyle', STYLE_CHOICES, update,
    '<b>mixed</b> — by the weights under <b>Line styles</b>, solid more often.');
  addSlider(sec, 'End marks (%)', 'arcCaps', 0, 100, 1);
  addSub(sec, 'Rays');
  addSlider(sec, 'Rays', 'rays', 0, 200, 1, 'Long lines running out of the shape, into a sign.');
  addPenSelect(sec, 'Pen', 'raysPen');
  addSlider(sec, 'Shortest (% of the sheet)', 'rayMin', 1, 100, 0.5);
  addSlider(sec, 'Longest (% of the sheet)', 'rayMax', 1, 100, 0.5);
  addSlider(sec, 'Spread (°)', 'raySpread', 0, 180, 1, 'Off straight out of the band.');
  addSlider(sec, 'Bowed (%)', 'rayCurve', 0, 100, 1);
  addSelect(sec, 'Style', 'rayStyle', STYLE_CHOICES, update);
  addSub(sec, 'Voices');
  addSlider(sec, 'Voices', 'voices', 0, 12, 1,
    'One long line through the whole score, glyph to glyph from one end to the other.');
  addPenSelect(sec, 'Pen', 'voicesPen');
  addSelect(sec, 'Style', 'voiceStyle', STYLE_NAMES, update);
  addSlider(sec, 'Step (units)', 'voiceStep', 1, 40, 0.5);
  addSlider(sec, 'Wander (%)', 'voiceWander', 0, 200, 1, 'How far it strays across the band.');
  addCheckbox(sec, 'Smooth — a spline, not a polyline', 'voiceSmooth');

  // --- the markers ---
  sec = addSection(root, 'Broad strokes — markers');
  addNote(sec, 'Drawn with whichever pen each is given — meant for the 3–15 mm ink markers. ' +
    'They go down first, under the fine lines (see <b>Pens</b>).');
  addSlider(sec, 'Notes', 'notes', 0, 300, 1, 'Dabs, discs or rings laid on glyphs.');
  addPenSelect(sec, 'Pen', 'notesPen');
  addSlider(sec, 'Note size (mm)', 'noteSize', 0, 120, 0.5,
    '0 — one dab of the nib. Wider than the nib: a disc filled from its edge in.');
  addSelect(sec, 'Shape', 'noteShape', NOTE_SHAPES, update,
    '<b>disc</b> on the glyph; <b>ring</b> round it; <b>beside</b> it, like a moon.');
  addSelect(sec, 'Laid on', 'notePick', NOTE_PICKS, update);
  addSub(sec, 'Staves');
  addSlider(sec, 'Stave lines', 'staves', 0, 15, 1, 'Lines along the middle of every band.');
  addPenSelect(sec, 'Pen', 'stavesPen');
  addSlider(sec, 'Gap (mm)', 'staveGap', 0.5, 120, 0.5);
  addSlider(sec, 'Length (% of the band)', 'staveLen', 5, 150, 1);
  addSlider(sec, 'Breaks', 'staveBreaks', 0, 20, 1);
  addSlider(sec, 'Wobble (mm)', 'staveWobble', 0, 30, 0.1);
  addSub(sec, 'Bars');
  addSlider(sec, 'Bars', 'bars', 0, 400, 1, 'Strokes along the band from a glyph onward.');
  addPenSelect(sec, 'Pen', 'barsPen');
  addSlider(sec, 'Shortest (mm)', 'barMin', 1, 400, 1);
  addSlider(sec, 'Longest (mm)', 'barMax', 1, 400, 1);
  addSlider(sec, 'Tilt (°)', 'barTilt', 0, 90, 1);
  addSub(sec, 'Sweeps');
  addSlider(sec, 'Sweeps', 'sweeps', 0, 40, 1, 'Long gestures across the band.');
  addPenSelect(sec, 'Pen', 'sweepsPen');
  addSlider(sec, 'Length (% of the band)', 'sweepLen', 5, 200, 1);
  addSlider(sec, 'Bend (%)', 'sweepBend', 0, 300, 1);

  // --- pens ---
  sec = addSection(root, 'Pens');
  addNote(sec, 'Five pens, a pass of the plotter each. Every layer above picks one by number. ' +
    'Changing the kind sets its colour and a usual width.');
  for (let i = 0; i < SLOTS; i++) addPenSlot(sec, i);
  addSlider(sec, 'Fill passes (% of the nib)', 'fillPass', 30, 150, 1,
    'How far apart the passes of a fill run. 85 overlaps them by 15 % — a marker that ' +
    'spreads can go higher.');
  addSelect(sec, 'Passes go down', 'underlay', UNDERLAYS, update,
    '<b>broad first</b> — the markers under the fine lines; also the order of the groups ' +
    'in the file with everything.');
  addSub(sec, 'Accent');
  addSelect(sec, 'Accent', 'accent', ACCENTS, resync,
    'Some of the fine layers drawn with another pen: <b>random</b> — a share of everything; ' +
    '<b>clusters</b> — whole clusters; <b>region</b> — a stretch along the band; ' +
    '<b>outskirts</b>, <b>core</b>. <b>A</b> steps through them.');
  addSlider(sec, 'Share (%)', 'accentShare', 0, 100, 1);
  addPenSelect(sec, 'Accent pen', 'accentPen');
  addSelect(sec, 'Accent on', 'accentOn', ACCENT_ON, update);

  // --- paper ---
  sec = addSection(root, 'Paper');
  addSelect(sec, 'Size', 'paper', PAPERS, () => { syncVisibility(); resizeForPaper(); });
  addSelect(sec, 'Orientation', 'orientation', ['landscape', 'portrait'], resizeForPaper);
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
  addCheckbox(sec, 'Show the shape and the clusters', 'showGuides', () => { drawPreview(); syncUrl(); });
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
    '<div><kbd>drag</kbd> move the band · <kbd>shift</kbd>+<kbd>drag</kbd> turn it</div>' +
    '<div><kbd>wheel</kbd> its width · <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> ' +
    'nudge it, with <kbd>shift</kbd> by 10</div>' +
    '<div><kbd>L</kbd> layout · <kbd>A</kbd> accent · <kbd>G</kbd> guides</div>' +
    '<div><kbd>R</kbd> new seed · <kbd>[</kbd> <kbd>]</kbd> step it</div>');
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
  let html =
    `<div class="big"><b>${groupNum(strokes)}</b> strokes, ` +
    `<b>${(plan.ink / 1000).toFixed(1)}</b> m of line</div>` +
    `<div>${groupNum(counts.nodes)} glyphs${counts.hubs ? `, ${counts.hubs} of them hubs` : ''}` +
    ` · ${groupNum(counts.threads)} threads · ${groupNum(counts.stems)} stems · ` +
    `${groupNum(counts.marks)} marks · ${groupNum(counts.labels)} labels` +
    `${counts.notes ? ` · ${counts.notes} notes` : ''}</div>` +
    `<div>Pen up for ${(plan.travel / 1000).toFixed(1)} m between strokes</div>` +
    `<div>Roughly <b>${formatDuration(seconds)}</b> to plot, every pass together · ` +
    `${lastMs.toFixed(0)} ms to build</div>`;
  if (counts.placed < counts.wanted * 0.97 && counts.wanted > 0) {
    html += `<div class="warn">Only ${groupNum(counts.placed)} of ${groupNum(counts.wanted)} ` +
      `glyphs found room — a smaller spacing or a wider shape makes more.</div>`;
  }
  // pens that will not show on this paper
  const used = new Set();
  for (let i = 0; i < SLOTS; i++) if (perPen && perPen[i].strokes) used.add(i);
  for (const i of used) {
    const c = contrast(penCol(i), s.paperColor);
    if (c < 1.6) {
      html += `<div class="warn">Pen ${i + 1} (${penKind(i)}) will barely show on this paper.</div>`;
    }
  }
  // broad pens drawing small things
  const smallLayers = [L_GLYPHS, L_THREADS, L_STEMS, L_MARKS, L_LABELS];
  const feature = s.unit * 0.5 * s.glyphSize / 100;
  for (const i of used) {
    if (penW(i) < feature * 0.9) continue;
    const ls = smallLayers.filter(li => perLayer[li].pens.has(i));
    if (!ls.length) continue;
    html += `<div class="warn">Pen ${i + 1} is ${+penW(i).toFixed(2)} mm wide and draws the ` +
      `${ls.map(li => LAYERS[li].label).join(', ')}, whose glyphs are about ` +
      `${(feature * 2).toFixed(1)} mm across — they will close up into blots. A larger unit ` +
      `fixes it.</div>`;
  }
  if (counts.labels < counts.labelsWanted * 0.8) {
    html += `<div class="note">${counts.labelsWanted - counts.labels} labels found no clear room ` +
      `— smaller ones, or a sparser sheet, fit more.</div>`;
  }
  const capMm = s.unit * s.labelSize / 100;
  if (counts.labels && perLayer[L_LABELS].pens.size) {
    const w = Math.max(...[...perLayer[L_LABELS].pens].map(penW));
    if (capMm * 0.6 * 0.6 < w * 2.2) {
      html += `<div class="warn">A subscript is ${(capMm * 0.36).toFixed(1)} mm high and the label ` +
        `pen ${w} mm wide — small letters will fill in. A larger label size fixes it.</div>`;
    }
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
  return `graphic score — ${s.layout} glyphs=${counts ? counts.nodes : 0} unit=${s.unit}mm ` +
    `threads=${s.threads} marks=${s.marks} labels=${s.labels}/${s.labelText} ` +
    `arcs=${s.arcs} rays=${s.rays} voices=${s.voices} ` +
    `notes=${s.notes} staves=${s.staves} bars=${s.bars} sweeps=${s.sweeps} ` +
    `accent=${s.accent}${s.accent !== 'none' ? '/' + s.accentShare + '%' : ''} seed=${s.seed} ` +
    `pens=[${pens.join('; ')}] strokes=${strokes}`;
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
  return `graphic score ${s.layout} seed${s.seed} ${paper}`;
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
