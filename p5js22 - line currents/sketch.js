////////////////////////////////////////////////////////////////////////////////////////
// Line currents — a photograph drawn in lines that crowd into its shadows
//
// The picture this started from is a nude drawn in nothing but lines. They run across the
// body like the folds of a cloth, crowd until they are solid black in the shadows and thin
// out to a few hairs on the lit side; behind the figure red streaks rake the sheet, packed
// tight beside it and sparse further off.
//
// The lines are the fronts of a wave. It sets off from one edge of the picture and crosses
// it, slowed wherever the picture is dark: from one front to the next is the pitch of the
// light in the light and the pitch of the dark in the dark, so the fronts crowd into the
// shadows, lie apart in the light and bend round every dark place as a wave bends round a
// stone — the lines wrap the forms by themselves. A front is a line of equal travel time,
// found on a grid by fast sweeping and drawn by marching squares. The wave can also set off
// from a point, a few points, a line through the middle, both edges, the outline of the
// figure or its highlights; or the lines can be drawn otherwise — as a curtain hanging from
// the edge, ridges pushed up by the dark and hiding one another, squiggles, or the contours
// of the tones.
//
// Before a line is drawn the picture can go through a chain of transformations — smears,
// stretches, pixel sorting, slices, pushes, twirls, bulges, ripples, waves, liquid, melting,
// kaleidoscopes, mirrors, a polar wrap, shards, a mosaic, echoes, zoom and spin streaks,
// tiles. The figure can be cut out of its ground and outlined, red can be put among the
// black, streaks raked behind it in a second pen and a marker laid under it all.
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};
const PAPERS = Object.keys(PAPER_SIZES).concat('custom');

const PAPER_TONES = {
  'white': '#fbfaf5', 'cream': '#f3ebda', 'grey': '#8e9196', 'black': '#151517',
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

const SOURCES  = ['photo', 'figure', 'drapery', 'spheres', 'noise', 'word'];
const FITS     = ['cover', 'contain'];
const SUBJECTS = ['everything', 'its shape', 'darker than', 'lighter than'];
const BACKDROPS = ['cut away', 'kept', 'blank'];
const MODES    = ['fronts', 'curtain', 'ridges', 'squiggle', 'contours'];
const ORIGINS  = ['edge', 'both edges', 'middle line', 'point', 'points', 'outline', 'highlights'];
const SPLITS   = ['none', 'tone band', 'every n-th line', 'blots', 'one side', 'background',
                  'photo reds', 'smeared'];
const STREAKS  = ['none', 'shadow', 'bands', 'even'];
const SIDES    = ['both', 'after', 'before'];
const MARKERS  = ['none', 'shadow band', 'dark tones', 'light tones', 'background', 'subject'];
const BORDERS  = ['none', 'line', 'double'];
const FACES    = ['sans', 'serif', 'mono'];
const MARK_AT  = ['sheet', 'picture'];
const FX_SLOTS = 3;

// A transformation of the picture, made before any line is drawn. Each reads the five numbers
// of its slot — an amount, a size, an angle and a place across and down — and names them for
// itself; what it does not read is hidden. Amount and size: [label, min, max, step, start];
// angle: [label, start]; a place: [label, across, down]. Choosing one puts its numbers to
// where it starts from. Angles on the sheet run clockwise from pointing right: 90 is down.
const FX = {
  'none':    { note: '' },
  'smear':   { amt: ['Strength (%) — below 0 light', -100, 100, 1, 85],
               size: ['Length (mm)', 2, 800, 1, 110], angle: ['Towards (°)', 120],
               note: 'Every dark place drags a trail after it that fades over the length. Below 0 the light drags instead.' },
  'stretch': { amt: ['Stretched (%)', 0, 100, 1, 100], angle: ['Towards (°)', 90],
               at: ['The line passes', 0, 30],
               note: 'Past a line square to the angle the picture is drawn out; at 100 the line itself is smeared to the edge.' },
  'sort':    { amt: ['Threshold (% tone) — below 0 light runs', -100, 100, 1, 40],
               size: ['Longest run (mm)', 1, 800, 1, 220], angle: ['Along (°)', 90],
               note: 'Pixel sorting: every run darker than the threshold is sorted, light to dark along the angle.' },
  'slices':  { amt: ['Furthest slide (mm)', 0, 300, 0.5, 22], size: ['Slice width (mm)', 0.5, 200, 0.5, 10],
               angle: ['Slid along (°)', 0],
               note: 'Cut into strips along the angle, every strip slid along itself by its own amount.' },
  'push':    { amt: ['Furthest (mm)', -300, 300, 0.5, 30], angle: ['Towards (°)', 0],
               note: 'Every place pushed by its own darkness — the dark travels, the light stays put.' },
  'twirl':   { amt: ['Turn (°)', -1080, 1080, 1, 200], size: ['Radius (mm)', 5, 1000, 1, 150],
               at: ['Middle', 0, 0], note: 'Turned about the middle — the most there, none at the radius.' },
  'bulge':   { amt: ['Bulge (%) — below 0 pinch', -100, 100, 1, 70], size: ['Radius (mm)', 5, 1000, 1, 120],
               at: ['Middle', 0, 0] },
  'ripple':  { amt: ['Height (mm)', -60, 60, 0.1, 3], size: ['Wavelength (mm)', 2, 400, 0.5, 26],
               at: ['Middle', 0, 0] },
  'wave':    { amt: ['Height (mm)', -150, 150, 0.1, 10], size: ['Wavelength (mm)', 2, 800, 0.5, 110],
               angle: ['Runs along (°)', 90] },
  'liquid':  { amt: ['How far (mm)', 0, 300, 0.5, 18], size: ['Lump size (mm)', 3, 800, 1, 70],
               note: 'Stirred by slow noise; the seed decides the stirring.' },
  'melt':    { amt: ['Longest drip (mm)', 0, 800, 1, 140], size: ['Drip width (mm)', 2, 400, 1, 22],
               angle: ['Runs (°)', 90], note: 'The far side of the picture runs, column by column, each its own way.' },
  'kaleidoscope': { amt: ['Mirrors', 2, 24, 1, 5], angle: ['Turned (°)', -90], at: ['Middle', 0, -10],
               note: 'One wedge of the picture, from the middle along the angle, mirrored round.' },
  'mirror':  { angle: ['The mirror (°)', 90], at: ['The mirror passes', 0, 0],
               note: 'One side of a line reflected onto the other; turning it by 180 keeps the other side.' },
  'polar':   { amt: ['Wrapped (%)', 0, 100, 1, 100], size: ['Radius (mm)', 10, 1000, 1, 160],
               angle: ['Turned (°)', -90], at: ['Middle', 0, 0],
               note: 'The picture rolled round the middle: its foot at the middle, its head at the radius.' },
  'shatter': { amt: ['Shards slid (mm)', 0, 150, 0.5, 7], size: ['Shard size (mm)', 3, 400, 1, 45],
               angle: ['Shards turned (°)', 8], note: 'Broken into shards, each slid and turned by its own amount.' },
  'mosaic':  { amt: ['Tiles slid (mm)', 0, 150, 0.5, 0], size: ['Tile (mm)', 1, 200, 0.5, 9],
               angle: ['Grid turned (°)', 0] },
  'echo':    { amt: ['Copies', 1, 16, 1, 4], size: ['Apart (mm)', 1, 400, 0.5, 16], angle: ['Towards (°)', 0],
               note: 'Fainter copies of the dark, one after another along the angle.' },
  'zoom':    { amt: ['Strength (%) — below 0 light', -100, 100, 1, 85], size: ['Length (mm)', 2, 800, 1, 100],
               at: ['Middle', 0, 0], note: 'Streaks running out from the middle.' },
  'spin':    { amt: ['Strength (%) — below 0 light', -100, 100, 1, 85], size: ['Arc (mm)', 2, 800, 1, 60],
               at: ['Middle', 0, 0], note: 'Streaks running round the middle.' },
  'tile':    { amt: ['Tiles across', 1, 12, 1, 3], angle: ['Turned (°)', 0], at: ['Tiles slid', 0, 0] },
};
const FX_NAMES = Object.keys(FX);

// What goes on the sheet: a marker under it all, the streaks behind the figure, the lines
// and their second colour, the outline, the border round the picture and the cut guides.
const LAYERS = [
  { id: 'marker',  label: 'marker fill',   pen: 'markerPen' },
  { id: 'streaks', label: 'streaks',       pen: 'streakPen' },
  { id: 'lines',   label: 'lines',         pen: 'linePen' },
  { id: 'second',  label: 'second colour', pen: 'splitPen' },
  { id: 'outline', label: 'outline',       pen: 'outlinePen' },
  { id: 'border',  label: 'border',        pen: 'borderPen' },
  { id: 'guides',  label: 'cut guides',    pen: null },
];
const L_MARKER = 0, L_STREAKS = 1, L_LINES = 2, L_SECOND = 3, L_OUTLINE = 4, L_BORDER = 5, L_GUIDES = 6;

const MAX_STROKES    = 400_000;
const BUSY_STROKES   = 40_000;
const FIELD_CELLS    = 420_000;    // cells of grey the picture is painted into, about
const FIELD_PAD      = 4;          // mm of picture beyond the margin box
const GRID_CELLS     = 1_400_000;  // the most nodes the fronts are found on
const SIMPLIFY       = 0.008;      // mm — how far a stroke may be straightened
const EPS            = 0.01;       // mm — the stub that stands in for a dot
const PREVIEW_MAX_PX = 1500;
const PEN_CYCLE_S    = 0.3;
const DRAW_SPEED     = 60;
const TRAVEL_SPEED   = 150;
const DRAG_DEG_PX    = 0.25;
const WHEEL_ZOOM     = 0.0015;
const MIN_ZOOM       = 10;
const MAX_ZOOM       = 1000;
const INF            = 1e30;

const settings = {
  // paper
  paper: 'A3',
  orientation: 'portrait',
  customW: 300,
  customH: 450,
  margin: 15,
  paperTone: 'cream',
  paperColor: '#f3ebda',   // the preview only — the files have no background
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
  linePen: 1, splitPen: 2, outlinePen: 1, streakPen: 2, markerPen: 3, borderPen: 1,
  markersFirst: true,      // broad pens go down before the fine ones

  seed: 7,

  // the picture
  source: 'figure',
  photoFit: 'cover',
  fieldX: 0,               // mm
  fieldY: 0,
  fieldZoom: 100,          // %
  fieldTurn: 0,            // °
  figArms: 100,            // % — 0 down by its sides, 100 over its head
  figLean: 0,              // °
  lightFrom: -160,         // ° on the sheet the light comes from
  lightHigh: 40,           // ° above the paper
  groundTone: 0,           // % — round the built-in shapes
  folds: 7,
  foldSize: 70,            // mm
  spheres: 6,
  sphereSize: 38,          // % of half the picture's short side
  noiseScale: 45,          // % of the picture's short side to a lump
  noiseOctaves: 3,
  word: 'FLOW',
  wordSize: 92,            // % of the largest that fits
  wordFace: 'sans',

  // its tones
  invert: false,
  equalize: 0,             // %
  level: 0,                // %
  contrast: 0,             // %
  gamma: 100,              // %
  soften: 0.8,             // mm
  rims: 0,                 // %
  rimWidth: 6,             // mm
  bands: 0,

  // the figure and its ground
  subject: 'its shape',
  subjectLevel: 50,        // % tone
  subjectTol: 16,          // % — how unlike the border a photo's figure must be
  subjectGrow: 0,          // mm
  subjectSoft: 0.6,        // mm
  backdrop: 'cut away',
  outline: true,

  // transformations
  fx1: 'none', fx1Amt: 0, fx1Size: 100, fx1Angle: 0, fx1X: 0, fx1Y: 0,
  fx2: 'none', fx2Amt: 0, fx2Size: 100, fx2Angle: 0, fx2X: 0, fx2Y: 0,
  fx3: 'none', fx3Amt: 0, fx3Size: 100, fx3Angle: 0, fx3X: 0, fx3Y: 0,

  // the lines
  mode: 'fronts',
  origin: 'edge',
  angle: 0,                // ° — 0 level, 90 upright
  centreX: 0,              // % of half the picture, from its middle
  centreY: 0,
  points: 5,
  fromLevel: 6,            // % tone — what counts as a highlight
  pitchLight: 3.2,         // mm from one line to the next in the lightest
  pitchDark: 0.45,         // mm in the darkest
  curve: 100,              // %
  phase: 50,               // % of a line
  amp: 7,                  // mm — how far a ridge or a squiggle swings
  wiggle: 1.6,             // mm — a squiggle's wavelength in the dark
  hidden: true,            // ridges hide the ones behind them
  levels: 16,              // contours
  detail: 0.5,             // mm — the grid the lines are found on
  liftBelow: 0,            // % — the pen is up where the picture is lighter
  minPiece: 0.6,           // mm — a shorter stroke is dropped
  penDown: 100,            // % of the nib — a hop shorter than this is drawn, not lifted over

  // the second colour
  split: 'none',
  splitFrom: 20,           // % tone
  splitTo: 48,
  splitEvery: 6,
  splitShare: 30,          // %
  splitAngle: 0,           // °
  splitX: 0,               // %
  splitY: 0,

  // the streaks
  streaks: 'shadow',
  streakAngle: -60,        // °
  streakLight: 9,          // mm between streaks where they are sparse
  streakDark: 0.6,         // mm where they are packed
  streakShift: 20,         // mm — the figure's shadow slid across the streaks
  streakBands: 45,         // % — how much the bands of noise thicken them
  streakBandSize: 35,      // mm
  streakSide: 'both',
  streakGap: 1.5,          // mm kept from the figure
  streakLen: 0,            // mm — 0 runs them to the edge
  streakBreak: 25,         // %
  streakOver: false,       // over the figure too

  // the marker
  marker: 'none',
  markerLevel: 70,         // %
  markerAngle: -60,        // ° — the way its passes run
  markerGap: 1,            // mm kept from the figure
  fillPass: 85,            // % of the nib between two passes

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
  { label: 'The figure — lines crowd into its shadows', s: {} },
  { label: 'The figure, red among the black', s: { split: 'tone band', splitFrom: 12, splitTo: 30 } },
  { label: 'Stretched past a line, like the nude\'s legs', s: {
      fx1: 'stretch', fx1Angle: 72, fx1Y: 12, streakShift: 30 } },
  { label: 'Smeared down along the streaks', s: { fx1: 'smear', fx1Angle: 120, fx1Size: 170 } },
  { label: 'Echoes of its outline', s: { origin: 'outline', backdrop: 'blank', streaks: 'none', pitchLight: 2.6 } },
  { label: 'Rings from its heart', s: { origin: 'point', centreY: -22, streaks: 'bands' } },
  { label: 'Raindrops — fronts from strewn points', s: {
      origin: 'points', points: 7, backdrop: 'blank', streaks: 'none', pitchLight: 3.6 } },
  { label: 'A curtain hanging from it', s: { mode: 'curtain', backdrop: 'blank', pitchLight: 3, streaks: 'none' } },
  { label: 'Twirled', s: { fx1: 'twirl', fx1Amt: 240, fx1Size: 190, fx1Y: -15 } },
  { label: 'A kaleidoscope of arms', s: { fx1: 'kaleidoscope', streaks: 'bands', origin: 'point', centreY: -10 } },
  { label: 'Pixel-sorted down', s: { fx1: 'sort', fx1Amt: 22, fx1Size: 300 } },
  { label: 'Sliced and slid', s: { fx1: 'slices', fx1Amt: 30, fx1Size: 14 } },
  { label: 'Melting', s: { fx1: 'melt', fx1Amt: 200, fx1Size: 26 } },
  { label: 'Shattered', s: { fx1: 'shatter', fx1Amt: 11, fx1Size: 36, fx1Angle: 14 } },
  { label: 'Echoes stepping aside', s: { fx1: 'echo', fx1Amt: 5, fx1Size: 14, fx1Angle: 20 } },
  { label: 'Zoom streaks out of its middle', s: { fx1: 'zoom', fx1Y: -18, fx1Size: 170, streaks: 'none' } },
  { label: 'A planet of it', s: { fx1: 'polar', fx1Y: 8, origin: 'point', centreY: 8, streaks: 'none', backdrop: 'blank' } },
  { label: 'Tiles', s: { fx1: 'tile', streaks: 'none', pitchLight: 2.4, pitchDark: 0.4 } },
  { label: 'Liquid, then twirled', s: { fx1: 'liquid', fx1Amt: 24, fx2: 'twirl', fx2Amt: -160, fx2Size: 220 } },
  { label: 'Ridges — the dark lifts the rows', s: {
      mode: 'ridges', pitchLight: 2.2, amp: 14, backdrop: 'blank', streaks: 'none', outline: false } },
  { label: 'Squiggles', s: { mode: 'squiggle', pitchLight: 2.3, amp: 1.1, wiggle: 1.1 } },
  { label: 'Contours of the tones', s: { mode: 'contours', levels: 24, streaks: 'bands' } },
  { label: 'Drapery, fronts from both sides', s: {
      source: 'drapery', origin: 'both edges', angle: 90, streaks: 'none', pitchLight: 3.4, pitchDark: 0.5 } },
  { label: 'Balls, rings out of their highlights', s: {
      source: 'spheres', origin: 'highlights', fromLevel: 4, backdrop: 'blank', streaks: 'bands' } },
  { label: 'A word in ridges', s: {
      source: 'word', word: 'FLOW', mode: 'ridges', pitchLight: 2.4, amp: 9, backdrop: 'blank',
      streaks: 'bands', outline: false } },
  { label: 'A red marker in its shadow', s: { marker: 'shadow band', markerLevel: 55, streakLight: 12 } },
  { label: 'White and silver markers on black paper', s: {
      paper: 'B2', paperTone: 'black', paperColor: PAPER_TONES.black, invert: true,
      pen1Kind: 'white marker', pen1W: 3, pen1Col: PEN_KINDS['white marker'].col,
      pen2Kind: 'silver marker', pen2W: 3, pen2Col: PEN_KINDS['silver marker'].col,
      pitchLight: 16, pitchDark: 3.3, streakLight: 30, streakDark: 3.6, streakGap: 4, minPiece: 3,
      detail: 0.8 } },
  { label: 'Your photo, like the nude above', s: { source: 'photo' } },
  { label: 'Your photo, the whole frame', s: { source: 'photo', subject: 'everything', streaks: 'none' } },
  { label: 'Your photo, rings out of its highlights', s: {
      source: 'photo', subject: 'everything', origin: 'highlights', fromLevel: 10, streaks: 'none' } },
  { label: 'Your photo, smeared and stretched', s: {
      source: 'photo', fx1: 'smear', fx1Angle: 120, fx1Size: 150, fx2: 'stretch', fx2Angle: 72, fx2Y: 30 } },
  { label: 'Your photo, sorted and sliced', s: {
      source: 'photo', subject: 'everything', streaks: 'none', fx1: 'sort', fx1Amt: 30, fx2: 'slices' } },
  { label: 'Your photo, in ridges', s: {
      source: 'photo', subject: 'everything', streaks: 'none', mode: 'ridges', pitchLight: 2, amp: 9 } },
  { label: 'Your photo, red where it is red', s: { source: 'photo', split: 'photo reds', splitFrom: 18 } },
];

const setters   = {};
const fieldDivs = {};
let statsDiv, linkDiv, penListDiv, layerButtons = {}, penSelects = [], slotSwatches = [];
let photoNote, photoNoteTop;

let area    = null;          // the margin box, in mm — the picture
let shapes  = null;          // { pts, off, ink, lay } — polylines in mm
let strokes = 0;
let plan    = null;          // { order, flip, ink, travel, downs }
let perPen  = null;
let perLayer = null;
let lastMs  = 0;
let fieldMs = 0;
let linesMs = 0;
let drag    = null;
let COUNTS  = null;          // { lines, levels, streaks, dots }

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

// A number in [0, 1) for a pair of integers and a salt — what a line, a strip or a shard
// decides about itself, the same whatever order they are visited in.
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
  for (let n = 1; n <= FX_SLOTS; n++) dressFxSlot(n);
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

function penW(i) { return clamp(Number(settings[`pen${i + 1}W`]) || 0.3, 0.05, 30); }
function penCol(i) { return settings[`pen${i + 1}Col`] || '#000000'; }
function penKind(i) { return settings[`pen${i + 1}Kind`] || 'black'; }
function penIdx(v) { return clamp(Math.round(Number(v) || 1), 1, SLOTS) - 1; }

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

// The passes go down in the order of the pens — the broad markers first if asked, so the
// fine lines are drawn over their ink and not under it.
function penOrder() {
  const o = [0, 1, 2, 3, 4];
  if (!settings.markersFirst) return o;
  return o.filter(i => penW(i) >= 1).concat(o.filter(i => penW(i) < 1));
}

// A place given in % of half the picture, from its middle.
function placeAt(px, py) {
  const A = area;
  return [(A.x0 + A.x1) / 2 + px / 100 * A.w / 2, (A.y0 + A.y1) / 2 + py / 100 * A.h / 2];
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
  // two pixels to a preview point whatever the screen: lines a fraction of a pixel apart
  // smear into bands otherwise
  pixelDensity(2);
  createCanvas(Math.round(w * s), Math.round(h * s)).parent('sheet');
  applyCanvasDisplay();
  buildControls();
  attachPointer();
  attachKeys();
  attachDrop();
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
// Whatever the lines are drawn from is painted first into grids laid over the margin box:
// the tones — 0 paper, 1 ink —, how far a place is the figure and not its ground, how red
// the photograph was there, and what the smears added. The picture has a place of its own:
// it can be slid, enlarged and turned under the sheet. A source paints it, its tones are
// shaped, the figure is told from its ground, and then the transformations go over all
// four grids alike, so whatever happens to the picture happens to the figure's outline too.

let FIELD = null;            // { T, M, R, S, w, h, x0, y0, c, env, mean, shaped, SD }
let fieldKeyNow = '';
let PHOTO = null;            // { img, name, ver }
let photoVer = 0;
let PHOTO_DATA = null, photoDataVer = -1;
let PHOTO_MASK = null, photoMaskKey = '';

const FX_KEYS = [];
for (let n = 1; n <= FX_SLOTS; n++) {
  for (const k of ['', 'Amt', 'Size', 'Angle', 'X', 'Y']) FX_KEYS.push(`fx${n}${k}`);
}

const FIELD_KEYS = ['paper', 'orientation', 'customW', 'customH', 'margin', 'seed', 'source',
  'photoFit', 'fieldX', 'fieldY', 'fieldZoom', 'fieldTurn', 'figArms', 'figLean', 'lightFrom',
  'lightHigh', 'groundTone', 'folds', 'foldSize', 'spheres', 'sphereSize', 'noiseScale',
  'noiseOctaves', 'word', 'wordSize', 'wordFace', 'invert', 'equalize', 'level', 'contrast',
  'gamma', 'soften', 'rims', 'rimWidth', 'bands', 'subject', 'subjectLevel', 'subjectTol',
  'subjectGrow', 'subjectSoft'].concat(FX_KEYS);

function ensureField(coarse) {
  const key = FIELD_KEYS.map(k => settings[k]).join('|') + `|${photoVer}|${coarse ? 1 : 0}`;
  if (FIELD && key === fieldKeyNow) return false;
  const t0 = performance.now();
  fieldKeyNow = key;
  FIELD = makeField(coarse);
  fieldMs = performance.now() - t0;
  return true;
}

function makeField(coarse) {
  const s = settings, A = area;
  const x0 = A.x0 - FIELD_PAD, y0 = A.y0 - FIELD_PAD;
  const Wm = A.w + 2 * FIELD_PAD, Hm = A.h + 2 * FIELD_PAD;
  const c = Math.max(0.2, Math.sqrt(Wm * Hm / FIELD_CELLS)) * (coarse ? 2 : 1);
  const w = Math.max(2, Math.ceil(Wm / c)), h = Math.max(2, Math.ceil(Hm / c)), n = w * h;
  const z = clamp(s.fieldZoom, MIN_ZOOM, MAX_ZOOM) / 100, th = rad(s.fieldTurn);
  const F = {
    T: new Float32Array(n), M: new Float32Array(n).fill(1), R: new Float32Array(n),
    S: new Float32Array(n), w, h, x0, y0, c, mean: 0, shaped: false, SD: null,
    // where a place on the paper is in the picture: mm from its middle, before the zoom
    env: {
      hw: A.w / 2, hh: A.h / 2, S: Math.min(A.w, A.h) / 2, z, th,
      cx: (A.x0 + A.x1) / 2 + s.fieldX, cy: (A.y0 + A.y1) / 2 + s.fieldY,
      ct: Math.cos(th) / z, st: Math.sin(th) / z,
    },
  };
  switch (s.source) {
    case 'photo':   paintPhoto(F); break;
    case 'drapery': paintDrapery(F); break;
    case 'spheres': paintSpheres(F); break;
    case 'noise':   paintNoise(F); break;
    case 'word':    paintWord(F); break;
    default:        paintFigure(F);
  }
  shapeTones(F);
  makeSubject(F);
  for (let k = 1; k <= FX_SLOTS; k++) applyFx(F, k);
  let sum = 0, fig = 0, cnt = 0;
  for (let j = 0; j < h; j++) {
    const y = y0 + (j + 0.5) * c;
    if (y < A.y0 || y > A.y1) continue;
    for (let i = 0; i < w; i++) {
      const x = x0 + (i + 0.5) * c;
      if (x < A.x0 || x > A.x1) continue;
      sum += F.T[j * w + i]; fig += F.M[j * w + i] >= 0.5 ? 1 : 0; cnt++;
    }
  }
  F.mean = cnt ? sum / cnt : 0;
  F.figure = cnt ? fig / cnt : 0;
  return F;
}

// Every cell of the grid, given its place in the picture.
function eachCell(F, fn) {
  const E = F.env, w = F.w, c = F.c, ix = c * E.ct, iy = -c * E.st;
  for (let j = 0; j < F.h; j++) {
    const dy = F.y0 + (j + 0.5) * c - E.cy, dx = F.x0 + 0.5 * c - E.cx;
    let qx = dx * E.ct + dy * E.st, qy = -dx * E.st + dy * E.ct;
    for (let i = 0, o = j * w; i < w; i++, o++, qx += ix, qy += iy) fn(o, qx, qy);
  }
}

// A value of a grid of F at a place on the paper, between its cells.
function sampleF(F, G, x, y) {
  const w = F.w;
  let u = (x - F.x0) / F.c - 0.5, v = (y - F.y0) / F.c - 0.5;
  if (u < 0) u = 0; else if (u > w - 1.001) u = w - 1.001;
  if (v < 0) v = 0; else if (v > F.h - 1.001) v = F.h - 1.001;
  const i = u | 0, j = v | 0, fu = u - i, fv = v - j, o = j * w + i;
  const a = G[o] + (G[o + 1] - G[o]) * fu;
  const b = G[o + w] + (G[o + w + 1] - G[o + w]) * fu;
  return a + (b - a) * fv;
}

function gridAt(G, x, y) { return sampleF(FIELD, G, x, y); }
function toneAt(x, y) { return sampleF(FIELD, FIELD.T, x, y); }

// A value of an image between its pixels, held at its edge.
function bilinear(L, w, h, x, y) {
  const xc = clamp(x, 0, w - 1), yc = clamp(y, 0, h - 1);
  const x0 = Math.floor(xc), y0 = Math.floor(yc);
  const x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
  const fx = xc - x0, fy = yc - y0;
  const a = L[y0 * w + x0] + (L[y0 * w + x1] - L[y0 * w + x0]) * fx;
  const b = L[y1 * w + x0] + (L[y1 * w + x1] - L[y1 * w + x0]) * fx;
  return a + (b - a) * fy;
}

// The value a share of the grid lies under.
function gridQuantile(G, share) {
  const step = Math.max(1, Math.floor(G.length / 20000));
  const pick = [];
  for (let i = 0; i < G.length; i += step) pick.push(G[i]);
  pick.sort((a, b) => a - b);
  return pick[clamp(Math.round(share * (pick.length - 1)), 0, pick.length - 1)];
}

// Noise knows no range of its own: stretch what it gave from its 2nd to its 98th hundredth.
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

// The squared distance from every cell to the nearest marked one, in cells, exactly — one
// pass down the columns and one along the rows (Felzenszwalb and Huttenlocher).
let DT_F = new Float64Array(0), DT_D = new Float64Array(0), DT_Z = new Float64Array(0);
let DT_V = new Int32Array(0);

function edt2(mark, w, h) {
  const n = Math.max(w, h);
  if (DT_F.length < n + 1) {
    DT_F = new Float64Array(n + 1); DT_D = new Float64Array(n + 1);
    DT_Z = new Float64Array(n + 2); DT_V = new Int32Array(n + 1);
  }
  const out = new Float32Array(w * h), BIG = 1e20;
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) DT_F[y] = mark[y * w + x] ? 0 : BIG;
    dt1(h);
    for (let y = 0; y < h; y++) out[y * w + x] = DT_D[y];
  }
  for (let y = 0; y < h; y++) {
    const o = y * w;
    for (let x = 0; x < w; x++) DT_F[x] = out[o + x];
    dt1(w);
    for (let x = 0; x < w; x++) out[o + x] = DT_D[x];
  }
  return out;
}

function dt1(n) {
  const f = DT_F, d = DT_D, v = DT_V, z = DT_Z;
  let k = 0;
  v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

// How far every cell is from the edge of a mask, in mm: over 0 inside, under 0 outside.
function signedDistance(M, w, h, c, at) {
  const lv = at === undefined ? 0.5 : at;
  const inside = new Uint8Array(w * h), outside = new Uint8Array(w * h);
  for (let i = 0; i < M.length; i++) { if (M[i] >= lv) inside[i] = 1; else outside[i] = 1; }
  const dIn = edt2(inside, w, h), dOut = edt2(outside, w, h);
  const SD = new Float32Array(w * h);
  for (let i = 0; i < SD.length; i++) {
    SD[i] = inside[i] ? (Math.sqrt(dOut[i]) - 0.5) * c : -(Math.sqrt(dIn[i]) - 0.5) * c;
  }
  return SD;
}

// The figure's distance field, made when something first asks for it.
function fieldSD() {
  if (!FIELD.SD) FIELD.SD = signedDistance(FIELD.M, FIELD.w, FIELD.h, FIELD.c);
  return FIELD.SD;
}

function shapeTones(F) {
  const s = settings, T = F.T, n = T.length;
  if (s.invert) for (let i = 0; i < n; i++) T[i] = 1 - T[i];
  if (s.soften / F.c >= 0.5) T.set(blurGrid(T, F.w, F.h, s.soften / F.c));
  if (s.rims !== 0) {
    const B = blurGrid(T, F.w, F.h, Math.max(0.5, s.rimWidth) / F.c), k = s.rims / 100;
    for (let i = 0; i < n; i++) T[i] += k * (T[i] - B[i]);
  }
  if (s.equalize > 0) {
    // the tones spread evenly from paper to ink, counted over the figure where there is one
    const bins = new Float64Array(257), W = F.shaped ? F.M : null;
    let tot = 0;
    for (let i = 0; i < n; i++) {
      const wt = W ? W[i] : 1;
      bins[clamp(Math.round(T[i] * 256), 0, 256)] += wt;
      tot += wt;
    }
    if (tot > 0) {
      for (let b = 1; b <= 256; b++) bins[b] += bins[b - 1];
      const k = clamp(s.equalize, 0, 100) / 100;
      for (let i = 0; i < n; i++) {
        const e = bins[clamp(Math.round(T[i] * 256), 0, 256)] / tot;
        T[i] += (e - T[i]) * k;
      }
    }
  }
  const lv = s.level / 100, ct = Math.max(0, 1 + s.contrast / 100), g = Math.max(0.05, s.gamma / 100);
  const bands = Math.round(s.bands);
  for (let i = 0; i < n; i++) {
    let v = clamp((T[i] - 0.5) * ct + 0.5 + lv, 0, 1);
    if (g !== 1) v = Math.pow(v, g);
    if (bands >= 2) v = Math.min(bands - 1, Math.floor(v * bands)) / (bands - 1);
    T[i] = v;
  }
}

// The figure, told from its ground: all of the picture; its own shape, if the source has
// one — for a photograph, whatever is unlike its border —; or whatever is darker or lighter
// than a tone. Then grown or shrunk, and its edge softened.
function makeSubject(F) {
  const s = settings, T = F.T, M = F.M, n = T.length, L = clamp(s.subjectLevel, 0, 100) / 100;
  switch (s.subject) {
    case 'everything': M.fill(1); break;
    case 'darker than':
      for (let i = 0; i < n; i++) M[i] = sstep(L - 0.03, L + 0.03, T[i]);
      break;
    case 'lighter than':
      for (let i = 0; i < n; i++) M[i] = 1 - sstep(L - 0.03, L + 0.03, T[i]);
      break;
    default:
      if (!F.shaped) M.fill(1);
  }
  if (s.subject === 'everything') return;
  if (s.subjectGrow) {
    const SD = signedDistance(M, F.w, F.h, F.c), g = s.subjectGrow;
    for (let i = 0; i < n; i++) M[i] = clamp(0.5 + (SD[i] + g) / F.c, 0, 1);
  }
  if (s.subjectSoft / F.c >= 0.5) M.set(blurGrid(M, F.w, F.h, s.subjectSoft / F.c));
}

// --- the sources

// The lay figure: an artist's wooden mannequin of tubes and balls, its arms raised over its
// head or let down by its sides, leaning, lit from one side. Every part stands out of the
// paper as a round tube or a ball; where two meet they melt into one another, and the light
// falls on the bulges. Its height is the picture's: the hands at the top, the shins run off
// the foot of it. A part is [ax, ay, bx, by, ra, rb, squash] — a ball has a = b.
function figureParts() {
  const s = settings, u = clamp(s.figArms, 0, 100) / 100;
  const parts = [];
  const tube = (ax, ay, bx, by, ra, rb) => parts.push([ax, ay, bx, by, ra, rb, 1]);
  const ball = (x, y, r, sq) => parts.push([x, y, x, y, r, r, sq || 1]);
  ball(0.015, -0.585, 0.09, 0.78);                      // head, taller than wide
  tube(0.01, -0.49, 0.0, -0.40, 0.046, 0.05);           // neck
  tube(0.0, -0.31, 0.0, -0.13, 0.168, 0.142);           // chest
  tube(0.0, -0.10, 0.005, 0.10, 0.118, 0.122);          // waist
  tube(-0.07, 0.19, 0.07, 0.195, 0.156, 0.156);         // pelvis
  // the upper arm swings out and up from hanging by the side; the forearm folds over
  for (const side of [-1, 1]) {
    const sx = 0.19 * side, sy = -0.355;
    const a1 = rad(side < 0 ? 103 + 157 * u : 77 - 157 * u);
    const ex = sx + 0.34 * Math.cos(a1), ey = sy + 0.34 * Math.sin(a1);
    const a2 = a1 + rad((-11 + 65 * u) * (side < 0 ? 1 : -1));
    const hx = ex + 0.31 * Math.cos(a2), hy = ey + 0.31 * Math.sin(a2);
    ball(sx, sy, 0.072);
    tube(sx, sy, ex, ey, 0.06, 0.048);
    ball(ex, ey, 0.052);
    tube(ex, ey, hx, hy, 0.047, 0.034);
    ball(hx, hy, 0.043, 0.85);
  }
  for (const side of [-1, 1]) {
    const hx = 0.118 * side, kx = (side < 0 ? 0.135 : 0.16) * side, ky = side < 0 ? 0.715 : 0.70;
    ball(hx, 0.27, 0.092);
    tube(hx, 0.29, kx, ky, 0.1, 0.069);
    ball(kx, ky + 0.015, 0.067);
    tube(kx, ky + 0.03, kx + 0.022 * side, 1.14, 0.063, 0.043);
  }
  // the lean, about the pelvis
  const a = rad(s.figLean), co = Math.cos(a), si = Math.sin(a), px = 0, py = 0.2;
  const P = new Float64Array(parts.length * 11);
  parts.forEach((p, k) => {
    const rot = (x, y) => [px + (x - px) * co - (y - py) * si, py + (x - px) * si + (y - py) * co];
    const [ax, ay] = rot(p[0], p[1]), [bx, by] = rot(p[2], p[3]), r = Math.max(p[4], p[5]);
    const ry = r / Math.min(1, p[6]);
    P.set([ax, ay, bx, by, p[4], p[5], p[6],
      Math.min(ax, bx) - ry, Math.max(ax, bx) + ry, Math.min(ay, by) - ry, Math.max(ay, by) + ry], k * 11);
  });
  return P;
}

// How far the figure stands out of the paper at a place; 0 off it.
function figureHeight(P, fx, fy) {
  const K = 0.035;
  let Z = 0;
  for (let o = 0; o < P.length; o += 11) {
    if (fx < P[o + 7] || fx > P[o + 8] || fy < P[o + 9] || fy > P[o + 10]) continue;
    const ax = P[o], ay = P[o + 1], dx = P[o + 2] - ax, dy = P[o + 3] - ay, ll = dx * dx + dy * dy;
    let t = ll > 0 ? ((fx - ax) * dx + (fy - ay) * dy) / ll : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = fx - ax - dx * t, qy = (fy - ay - dy * t) * P[o + 6];
    const r = P[o + 4] + (P[o + 5] - P[o + 4]) * t, d2 = qx * qx + qy * qy;
    if (d2 >= r * r) continue;
    const zz = Math.sqrt(r * r - d2);
    if (Z <= 0) { Z = zz; continue; }
    // a smooth union that fades out where either part is thin, so no edge is creased
    const h = Math.max(K - Math.abs(Z - zz), 0) / K * sstep(0, K, Math.min(Z, zz));
    Z = Math.max(Z, zz) + h * h * K * 0.25;
  }
  return Z;
}

// Light on a grid of heights: the slope taken across the cells and turned into the
// picture's own frame, so the light turns with the picture.
function shadeHeights(F, Z, perMm, onlyWhere) {
  const s = settings, E = F.env, w = F.w, h = F.h, c = F.c;
  const la = rad(s.lightFrom), le = rad(clamp(s.lightHigh, 1, 89));
  const Lx = Math.cos(le) * Math.cos(la), Ly = Math.cos(le) * Math.sin(la), Lz = Math.sin(le);
  const co = Math.cos(E.th), si = Math.sin(E.th), k = E.z * perMm;
  const out = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const o = j * w + i;
      if (onlyWhere && !(Z[o] > 0)) continue;
      const zl = Z[i > 0 ? o - 1 : o], zr = Z[i < w - 1 ? o + 1 : o];
      const zu = Z[j > 0 ? o - w : o], zd = Z[j < h - 1 ? o + w : o];
      const gx = (zr - zl) / (2 * c), gy = (zd - zu) / (2 * c);
      const fx = k * (co * gx + si * gy), fy = k * (-si * gx + co * gy);
      const nl = 1 / Math.sqrt(fx * fx + fy * fy + 1), nx = -fx * nl, ny = -fy * nl, nz = nl;
      const lam = Math.max(0, nx * Lx + ny * Ly + nz * Lz);
      const rz = 2 * lam * nz - Lz;                       // the light's mirror, seen from above
      out[o] = clamp(0.02 + 1.08 * lam + 0.25 * Math.pow(Math.max(0, rz), 24), 0, 1);
    }
  }
  return out;
}

function paintFigure(F) {
  const s = settings, E = F.env, P = figureParts(), sc = 1 / E.hh;
  const Z = new Float32Array(F.T.length);
  eachCell(F, (o, qx, qy) => { Z[o] = figureHeight(P, qx * sc, qy * sc); });
  const L = shadeHeights(F, Z, E.hh, true), g = clamp(s.groundTone, 0, 100) / 100;
  for (let o = 0; o < Z.length; o++) {
    const m = sstep(0, 0.01, Z[o]);
    F.M[o] = m;
    F.T[o] = g + (1 - L[o] - g) * m;
  }
  F.shaped = true;
}

// Drapery: a cloth hanging in folds — ridges running down it, gathered towards the top and
// wandering with slow noise — lit as the figure is. It has no outline of its own.
function paintDrapery(F) {
  const s = settings, E = F.env, rnd = rng(61);
  const n = clamp(Math.round(s.folds), 1, 40), L0 = Math.max(4, s.foldSize);
  const folds = [];
  for (let i = 0; i < n; i++) {
    const lam = L0 * (0.55 + 0.9 * rnd()), tilt = rad((rnd() - 0.5) * 36);
    folds.push([lam, Math.cos(tilt), Math.sin(tilt), rnd() * 2 * Math.PI, 0.17 * lam]);
  }
  const Z = new Float32Array(F.T.length), wk = 1 / (2.2 * L0);
  eachCell(F, (o, qx, qy) => {
    const g = 0.42 + 0.58 * clamp((qy + E.hh) / (2 * E.hh), 0, 1.4);
    const x = qx * g + 0.4 * L0 * fbm(NZ, qx * wk, qy * wk, 3.3, 2);
    let z = 0;
    for (const [lam, c, sn, ph, a] of folds) z += a * Math.sin(2 * Math.PI * (x * c + qy * sn) / lam + ph);
    Z[o] = z;
  });
  const Lt = shadeHeights(F, Z, 1, false);
  for (let o = 0; o < Z.length; o++) F.T[o] = 1 - Lt[o];
}

// Balls standing on the paper, some in front of others, lit as the figure is.
function paintSpheres(F) {
  const s = settings, E = F.env, rnd = rng(71);
  const n = clamp(Math.round(s.spheres), 1, 60), R0 = Math.max(1, s.sphereSize / 100 * E.S);
  const balls = [];
  for (let b = 0; b < n; b++) {
    let best = null;
    for (let t = 0; t < 12; t++) {           // the least crowded of a dozen tries
      const r = R0 * (0.45 + 0.7 * rnd());
      const x = (rnd() * 2 - 1) * (E.hw - r * 0.5), y = (rnd() * 2 - 1) * (E.hh - r * 0.5);
      let room = Infinity;
      for (const q of balls) room = Math.min(room, Math.hypot(x - q[0], y - q[1]) - r - q[2]);
      if (!best || room > best[4]) best = [x, y, r, rnd() * r, room];
      if (room > 0) break;
    }
    balls.push(best);
  }
  const la = rad(s.lightFrom), le = rad(clamp(s.lightHigh, 1, 89));
  const Lx = Math.cos(le) * Math.cos(la), Ly = Math.cos(le) * Math.sin(la), Lz = Math.sin(le);
  const g = clamp(s.groundTone, 0, 100) / 100;
  eachCell(F, (o, qx, qy) => {
    let top = -1, bz = 0;
    for (let b = 0; b < balls.length; b++) {
      const [x, y, r, dz] = balls[b], dx = qx - x, dy = qy - y, d2 = dx * dx + dy * dy;
      if (d2 >= r * r) continue;
      const zz = dz + Math.sqrt(r * r - d2);
      if (zz > bz || top < 0) { bz = zz; top = b; }
    }
    if (top < 0) { F.T[o] = g; F.M[o] = 0; return; }
    const [x, y, r, dz] = balls[top];
    const nx = (qx - x) / r, ny = (qy - y) / r, nz = (bz - dz) / r;
    const lam = Math.max(0, nx * Lx + ny * Ly + nz * Lz), rz = 2 * lam * nz - Lz;
    const lit = clamp(0.02 + 1.08 * lam + 0.25 * Math.pow(Math.max(0, rz), 24), 0, 1);
    const edge = sstep(0, 0.08, nz);
    F.T[o] = g + (1 - lit - g) * edge;
    F.M[o] = edge;
  });
  F.shaped = true;
}

function paintNoise(F) {
  const s = settings, E = F.env;
  const k = 1 / Math.max(1, s.noiseScale / 100 * E.S * 2);
  const oct = clamp(Math.round(s.noiseOctaves), 1, 6);
  eachCell(F, (o, qx, qy) => { F.T[o] = fbm(NZ, qx * k, qy * k, 0.37, oct); });
  levelGrid(F.T);
}

const FACE_FONTS = {
  sans:  '900 SIZEpx "Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif',
  serif: '700 SIZEpx Georgia, "Times New Roman", Times, serif',
  mono:  '700 SIZEpx Menlo, Consolas, "Courier New", monospace',
};

// A word, set large; a bar | starts a new line. The letters are the figure.
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
  const n = Math.max(1, rowsOf.length), face = FACE_FONTS[s.wordFace] || FACE_FONTS.sans;
  // the largest that fits both the height, row by row, and the width
  ctx.font = face.replace('SIZE', '100');
  const widest = Math.max(1, ...rowsOf.map(t => ctx.measureText(t).width));
  const fits = Math.min(2 * E.hh / n / 1.02, 2 * E.hw * 0.96 / (widest / 100));
  const size = Math.max(2, s.wordSize / 100 * fits);
  ctx.font = face.replace('SIZE', size.toFixed(2));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  rowsOf.forEach((t, i) => ctx.fillText(t, 0, (i - (n - 1) / 2) * size * 0.98 + size * 0.36));
  const d = ctx.getImageData(0, 0, F.w, F.h).data;
  for (let i = 0; i < F.T.length; i++) F.T[i] = F.M[i] = 1 - d[4 * i] / 255;
  F.shaped = true;
}

// The photograph at most 900 px along its longer side: its greys, and how red it is.
function photoData() {
  if (!PHOTO) return null;
  if (PHOTO_DATA && photoDataVer === PHOTO.ver) return PHOTO_DATA;
  const img = PHOTO.img, k = Math.min(1, 900 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data, L = new Float32Array(w * h), R = new Float32Array(w * h);
  for (let i = 0; i < L.length; i++) {
    const r = d[4 * i] / 255, g = d[4 * i + 1] / 255, b = d[4 * i + 2] / 255;
    L[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // red: strong in colour and near the red of the hue circle
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx > 0 && mx - mn > 1e-6) {
      let hue = mx === r ? (g - b) / (mx - mn) : mx === g ? 2 + (b - r) / (mx - mn) : 4 + (r - g) / (mx - mn);
      hue = ((hue * 60) % 360 + 360) % 360;
      const off = Math.min(hue, 360 - hue);
      R[i] = (mx - mn) / mx * mx * Math.max(0, 1 - off / 35);
    }
  }
  PHOTO_DATA = { w, h, L, R };
  photoDataVer = PHOTO.ver;
  return PHOTO_DATA;
}

// A photograph's ground is what can be reached from its border without crossing anything
// unlike the border: its greys blurred a little, the border's middle tone taken, and every
// pixel within the tolerance of that tone flooded from the edge in. What is left — holes
// in it too — is the figure.
function photoFigure(P, tol) {
  const key = `${PHOTO.ver}|${tol}`;
  if (PHOTO_MASK && photoMaskKey === key) return PHOTO_MASK;
  const { w, h } = P;
  const G = blurGrid(P.L, w, h, Math.max(1, Math.round(Math.max(w, h) / 450)));
  const rim = [];
  for (let x = 0; x < w; x++) rim.push(G[x], G[(h - 1) * w + x]);
  for (let y = 1; y < h - 1; y++) rim.push(G[y * w], G[y * w + w - 1]);
  rim.sort((a, b) => a - b);
  const mid = rim[rim.length >> 1], t = clamp(tol, 0, 100) / 100;
  const ground = new Uint8Array(w * h), stack = new Int32Array(w * h);
  let sp = 0;
  const reach = o => {
    if (!ground[o] && Math.abs(G[o] - mid) <= t) { ground[o] = 1; stack[sp++] = o; }
  };
  for (let x = 0; x < w; x++) { reach(x); reach((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { reach(y * w); reach(y * w + w - 1); }
  while (sp) {
    const o = stack[--sp], x = o % w;
    if (x > 0) reach(o - 1);
    if (x < w - 1) reach(o + 1);
    if (o >= w) reach(o - w);
    if (o < w * (h - 1)) reach(o + w);
  }
  // its edge smoothed, and specks of figure left out in the ground given back to it
  let M = new Float32Array(w * h);
  for (let i = 0; i < M.length; i++) M[i] = ground[i] ? 0 : 1;
  M = blurGrid(M, w, h, Math.max(1, Math.round(Math.max(w, h) / 300)));
  for (let i = 0; i < M.length; i++) M[i] = M[i] >= 0.5 ? 1 : 0;
  const lab = new Int32Array(w * h).fill(-1), least = w * h / 400;
  for (let o0 = 0; o0 < M.length; o0++) {
    if (!M[o0] || lab[o0] >= 0) continue;
    let top = 0, n = 0;
    lab[o0] = o0; stack[top++] = o0;
    const members = [];
    while (top) {
      const o = stack[--top], x = o % w;
      members.push(o); n++;
      const nb = [x > 0 ? o - 1 : -1, x < w - 1 ? o + 1 : -1, o >= w ? o - w : -1, o < w * (h - 1) ? o + w : -1];
      for (const q of nb) if (q >= 0 && M[q] && lab[q] < 0) { lab[q] = o0; stack[top++] = q; }
    }
    if (n < least) for (const o of members) M[o] = 0;
  }
  PHOTO_MASK = M;
  photoMaskKey = key;
  return M;
}

// The photograph laid over the frame — cut to cover it, or whole inside it with paper round
// it. With none loaded, a ball of shade keeps the sheet from being empty.
function paintPhoto(F) {
  const P = photoData(), E = F.env;
  if (!P) {
    eachCell(F, (o, qx, qy) => {
      const d = Math.hypot(qx, qy) / E.S;
      F.T[o] = 0.9 * (1 - sstep(0.1, 0.95, d));
      F.M[o] = 1 - sstep(0.76, 0.8, d);
    });
    F.shaped = true;
    return;
  }
  const cover = settings.photoFit !== 'contain';
  const kx = P.w / (2 * E.hw), ky = P.h / (2 * E.hh), k = cover ? Math.min(kx, ky) : Math.max(kx, ky);
  const Mk = settings.subject === 'its shape' ? photoFigure(P, settings.subjectTol) : null;
  eachCell(F, (o, qx, qy) => {
    const x = P.w / 2 + qx * k - 0.5, y = P.h / 2 + qy * k - 0.5;
    if (x < -0.5 || y < -0.5 || x > P.w - 0.5 || y > P.h - 0.5) { F.T[o] = 0; F.M[o] = 0; return; }
    F.T[o] = 1 - bilinear(P.L, P.w, P.h, x, y);
    F.R[o] = bilinear(P.R, P.w, P.h, x, y);
    if (Mk) F.M[o] = bilinear(Mk, P.w, P.h, x, y);
  });
  F.shaped = !!Mk;
}

////////////////////////////////////////////////////////////////////////////////////////
// Transformations
//
// Most of them move places: every cell looks up where its value comes from in the picture
// before the change, and takes the four grids' values from there. The smears, the sorting
// and the echoes work along rows of a grid turned to their angle, or on a grid of rings and
// spokes round a middle, and what they add is kept in the grid of smears — the second
// colour can be put there.

function fxSpec(type) { return FX[type] || FX.none; }

function fxParams(n) {
  const s = settings;
  return {
    type: s[`fx${n}`], amt: s[`fx${n}Amt`], size: Math.max(0.1, s[`fx${n}Size`]),
    angle: s[`fx${n}Angle`], at: placeAt(s[`fx${n}X`], s[`fx${n}Y`]),
    ax: s[`fx${n}X`], ay: s[`fx${n}Y`], salt: 1000 * n,
  };
}

function applyFx(F, n) {
  const P = fxParams(n);
  switch (P.type) {
    case 'smear':        fxSmear(F, P); break;
    case 'stretch':      fxStretch(F, P); break;
    case 'sort':         fxSort(F, P); break;
    case 'slices':       fxSlices(F, P); break;
    case 'push':         fxPush(F, P); break;
    case 'twirl':        fxTwirl(F, P); break;
    case 'bulge':        fxBulge(F, P); break;
    case 'ripple':       fxRipple(F, P); break;
    case 'wave':         fxWave(F, P); break;
    case 'liquid':       fxLiquid(F, P); break;
    case 'melt':         fxMelt(F, P); break;
    case 'kaleidoscope': fxKaleidoscope(F, P); break;
    case 'mirror':       fxMirror(F, P); break;
    case 'polar':        fxPolar(F, P); break;
    case 'shatter':      fxShatter(F, P); break;
    case 'mosaic':       fxMosaic(F, P); break;
    case 'echo':         fxEcho(F, P); break;
    case 'zoom':         fxRadial(F, P, false); break;
    case 'spin':         fxRadial(F, P, true); break;
    case 'tile':         fxTile(F, P); break;
    default:
  }
}

// Every cell takes its values from the place the map leaves in WX, WY; WS, if the map sets
// it, is how much of a smear that is.
let WX = 0, WY = 0, WS = 0;

function warpField(F, map) {
  const w = F.w, h = F.h, n = w * h, c = F.c;
  const T = new Float32Array(n), M = new Float32Array(n), R = new Float32Array(n), S = new Float32Array(n);
  const T0 = F.T, M0 = F.M, R0 = F.R, S0 = F.S;
  for (let j = 0; j < h; j++) {
    const y = F.y0 + (j + 0.5) * c;
    for (let i = 0; i < w; i++) {
      const x = F.x0 + (i + 0.5) * c, o = j * w + i;
      WS = 0;
      map(x, y);
      let u = (WX - F.x0) / c - 0.5, v = (WY - F.y0) / c - 0.5;
      if (!(u >= 0)) u = 0; else if (u > w - 1.001) u = w - 1.001;
      if (!(v >= 0)) v = 0; else if (v > h - 1.001) v = h - 1.001;
      const iu = u | 0, iv = v | 0, fu = u - iu, fv = v - iv, q = iv * w + iu;
      const a = (1 - fu) * (1 - fv), b = fu * (1 - fv), cc = (1 - fu) * fv, d = fu * fv;
      T[o] = a * T0[q] + b * T0[q + 1] + cc * T0[q + w] + d * T0[q + w + 1];
      M[o] = a * M0[q] + b * M0[q + 1] + cc * M0[q + w] + d * M0[q + w + 1];
      R[o] = a * R0[q] + b * R0[q + 1] + cc * R0[q + w] + d * R0[q + w + 1];
      S[o] = Math.max(WS, a * S0[q] + b * S0[q + 1] + cc * S0[q + w] + d * S0[q + w + 1]);
    }
  }
  F.T = T; F.M = M; F.R = R; F.S = S;
}

// The four grids resampled onto rows along an angle, each row running the way the angle
// points; and back.
function turnedRows(F, deg) {
  const a = rad(deg), ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux, c = F.c;
  let u0 = INF, u1 = -INF, v0 = INF, v1 = -INF;
  for (const x of [F.x0, F.x0 + F.w * c]) {
    for (const y of [F.y0, F.y0 + F.h * c]) {
      const u = x * ux + y * uy, v = x * vx + y * vy;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
  }
  const U = Math.ceil((u1 - u0) / c) + 1, V = Math.ceil((v1 - v0) / c) + 1, n = U * V;
  const G = { U, V, c, u0, v0, ux, uy, vx, vy,
    T: new Float32Array(n), M: new Float32Array(n), R: new Float32Array(n), S: new Float32Array(n) };
  for (let j = 0; j < V; j++) {
    const v = v0 + j * c;
    for (let i = 0; i < U; i++) {
      const u = u0 + i * c, x = u * ux + v * vx, y = u * uy + v * vy, o = j * U + i;
      G.T[o] = sampleF(F, F.T, x, y); G.M[o] = sampleF(F, F.M, x, y);
      G.R[o] = sampleF(F, F.R, x, y); G.S[o] = sampleF(F, F.S, x, y);
    }
  }
  return G;
}

function putBack(F, G) {
  const w = F.w, c = F.c, U = G.U, V = G.V;
  for (let j = 0; j < F.h; j++) {
    const y = F.y0 + (j + 0.5) * c;
    for (let i = 0; i < w; i++) {
      const x = F.x0 + (i + 0.5) * c, o = j * w + i;
      let u = (x * G.ux + y * G.uy - G.u0) / c, v = (x * G.vx + y * G.vy - G.v0) / c;
      u = clamp(u, 0, U - 1.001); v = clamp(v, 0, V - 1.001);
      const iu = u | 0, iv = v | 0, fu = u - iu, fv = v - iv, q = iv * U + iu;
      const a = (1 - fu) * (1 - fv), b = fu * (1 - fv), cc = (1 - fu) * fv, d = fu * fv;
      F.T[o] = a * G.T[q] + b * G.T[q + 1] + cc * G.T[q + U] + d * G.T[q + U + 1];
      F.M[o] = a * G.M[q] + b * G.M[q + 1] + cc * G.M[q + U] + d * G.M[q + U + 1];
      F.R[o] = a * G.R[q] + b * G.R[q + 1] + cc * G.R[q + U] + d * G.R[q + U + 1];
      F.S[o] = a * G.S[q] + b * G.S[q + 1] + cc * G.S[q + U] + d * G.S[q + U + 1];
    }
  }
}

// A trail along a row: every value carried on, fading by k a cell and weighed by al, and
// the darker of it and what is there kept. Light trails are the same on the tones turned
// over. The figure trails with its tone, but fades a third as fast, so the lines run on
// into the trail as it pales; the reds go along. A ring is gone round once first, only to
// carry the trail over the place it starts at.
function trailRow(G, o0, step, n, k, al, light, ring) {
  let mT = 0, mM = 0, mR = 0;
  const kM = Math.pow(k, 1 / 3);
  if (ring) {
    for (let t = 0, o = o0; t < n; t++, o += step) {
      mT = Math.max(light ? 1 - G.T[o] : G.T[o], mT) * k;
      mM = Math.max(light ? 1 - G.M[o] : G.M[o], mM) * kM;
      mR = Math.max(G.R[o], mR) * k;
    }
  }
  for (let t = 0, o = o0; t < n; t++, o += step) {
    const t0 = G.T[o], tv = light ? 1 - t0 : t0, mv = light ? 1 - G.M[o] : G.M[o], rv = G.R[o];
    const out = Math.max(tv, al * mT), outM = Math.max(mv, Math.min(1, 1.25 * al) * mM);
    mT = Math.max(tv, mT) * k; mM = Math.max(mv, mM) * kM;
    G.R[o] = Math.max(rv, al * mR); mR = Math.max(rv, mR) * k;
    G.T[o] = light ? 1 - out : out;
    G.M[o] = light ? 1 - outM : outM;
    G.S[o] = Math.max(G.S[o], Math.abs(G.T[o] - t0) * 2.5);
  }
}

function fxSmear(F, P) {
  const G = turnedRows(F, P.angle);
  const k = Math.exp(-3 * G.c / Math.max(G.c, P.size)), al = Math.abs(P.amt) / 100;
  for (let j = 0; j < G.V; j++) trailRow(G, j * G.U, 1, G.U, k, al, P.amt < 0);
  putBack(F, G);
}

// Past a line square to the angle, every place looks back towards the line.
function fxStretch(F, P) {
  const a = rad(P.angle), dx = Math.cos(a), dy = Math.sin(a), [cx, cy] = P.at;
  const k = clamp(P.amt, 0, 100) / 100;
  warpField(F, (x, y) => {
    const s = (x - cx) * dx + (y - cy) * dy;
    if (s > 0) { WX = x - dx * s * k; WY = y - dy * s * k; WS = k * sstep(0, 3, s); }
    else { WX = x; WY = y; }
  });
}

// Pixel sorting: along every row, each run of cells darker than the threshold — or lighter,
// below 0 — no longer than the longest run, put in order of tone; the other grids follow.
let SORT_KEY = new Float64Array(0);

function fxSort(F, P) {
  const G = turnedRows(F, P.angle), U = G.U;
  const thr = Math.abs(P.amt) / 100, light = P.amt < 0, most = Math.max(2, Math.round(P.size / G.c));
  if (SORT_KEY.length < most + 1) SORT_KEY = new Float64Array(most + 1);
  const tT = new Float32Array(most), tM = new Float32Array(most), tR = new Float32Array(most);
  const inRun = o => (light ? G.T[o] < thr : G.T[o] > thr);
  for (let j = 0; j < G.V; j++) {
    const row = j * U;
    let i = 0;
    while (i < U) {
      if (!inRun(row + i)) { i++; continue; }
      let e = i;
      while (e < U && e - i < most && inRun(row + e)) e++;
      const n = e - i, o = row + i;
      if (n > 1) {
        const keys = SORT_KEY.subarray(0, n);
        for (let t = 0; t < n; t++) {
          keys[t] = Math.round(clamp(G.T[o + t], 0, 1) * 1e6) * 65536 + t;
          tT[t] = G.T[o + t]; tM[t] = G.M[o + t]; tR[t] = G.R[o + t];
        }
        keys.sort();
        for (let t = 0; t < n; t++) {
          const src = keys[light ? n - 1 - t : t] % 65536;
          G.T[o + t] = tT[src]; G.M[o + t] = tM[src]; G.R[o + t] = tR[src];
          if (src !== t) G.S[o + t] = Math.max(G.S[o + t], 0.7);
        }
      }
      i = e;
    }
  }
  putBack(F, G);
}

// Strips along the angle, each slid along itself; about a third of them stay where they are.
function fxSlices(F, P) {
  const a = rad(P.angle), dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  const [cx, cy] = placeAt(0, 0), wd = Math.max(0.2, P.size);
  warpField(F, (x, y) => {
    const b = Math.floor(((x - cx) * nx + (y - cy) * ny) / wd);
    const r = hash01(b, 3, P.salt + 401);
    const off = r < 0.35 ? 0 : P.amt * (2 * hash01(b, 5, P.salt + 409) - 1);
    WX = x - dx * off; WY = y - dy * off; WS = off ? 0.6 : 0;
  });
}

function fxPush(F, P) {
  const a = rad(P.angle), dx = Math.cos(a), dy = Math.sin(a), T = F.T;
  warpField(F, (x, y) => {
    const d = P.amt * sampleF(F, T, x, y);
    WX = x - dx * d; WY = y - dy * d; WS = Math.min(1, Math.abs(d) / 20);
  });
}

function fxTwirl(F, P) {
  const [cx, cy] = P.at, R = P.size, turn = rad(P.amt);
  warpField(F, (x, y) => {
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
    if (r >= R) { WX = x; WY = y; return; }
    const f = -turn * (1 - r / R) * (1 - r / R), co = Math.cos(f), si = Math.sin(f);
    WX = cx + dx * co - dy * si; WY = cy + dx * si + dy * co;
  });
}

function fxBulge(F, P) {
  const [cx, cy] = P.at, R = P.size, s = P.amt / 100 * (P.amt < 0 ? 0.85 : 1);
  warpField(F, (x, y) => {
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
    if (r >= R || r < 1e-9) { WX = x; WY = y; return; }
    const k = Math.pow(r / R, s);
    WX = cx + dx * k; WY = cy + dy * k;
  });
}

function fxRipple(F, P) {
  const [cx, cy] = P.at, K = 2 * Math.PI / P.size;
  warpField(F, (x, y) => {
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
    if (r < 1e-9) { WX = x; WY = y; return; }
    const k = (r + P.amt * Math.sin(r * K)) / r;
    WX = cx + dx * k; WY = cy + dy * k;
  });
}

function fxWave(F, P) {
  const a = rad(P.angle), dx = Math.cos(a), dy = Math.sin(a), K = 2 * Math.PI / P.size;
  warpField(F, (x, y) => {
    const off = P.amt * Math.sin((x * dx + y * dy) * K);
    WX = x - dy * off; WY = y + dx * off;
  });
}

function fxLiquid(F, P) {
  const k = 1 / P.size, A = P.amt * 1.6, z = 7.7 + P.salt * 0.013;
  warpField(F, (x, y) => {
    WX = x + A * fbm(NZW, x * k, y * k, z, 2);
    WY = y + A * fbm(NZW, x * k + 31.4, y * k - 17.1, z + 2.2, 2);
  });
}

// The far side of the picture runs: every column along the angle slides its own way
// further on, more the further it is from the near edge.
function fxMelt(F, P) {
  const a = rad(P.angle), dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx, A = area;
  let v0 = INF, v1 = -INF;
  for (const x of [A.x0, A.x1]) for (const y of [A.y0, A.y1]) {
    const v = x * dx + y * dy;
    v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  const k = 1 / P.size, z = 9.1 + P.salt * 0.017;
  warpField(F, (x, y) => {
    const u = x * nx + y * ny, v = (x * dx + y * dy - v0) / Math.max(1, v1 - v0);
    const drip = Math.pow(sstep(0.32, 0.86, 0.5 + 0.9 * fbm(NZW, u * k, 3.7, z, 2)), 1.5);
    const off = P.amt * drip * sstep(-0.05, 1, v);
    WX = x - dx * off; WY = y - dy * off; WS = Math.min(1, off / 15);
  });
}

function fxKaleidoscope(F, P) {
  const [cx, cy] = P.at, n = clamp(Math.round(P.amt), 2, 48), seg = 2 * Math.PI / n, a0 = rad(P.angle);
  warpField(F, (x, y) => {
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
    let f = Math.atan2(dy, dx) - a0;
    f -= seg * Math.floor(f / seg);
    if (f > seg / 2) f = seg - f;
    WX = cx + r * Math.cos(f + a0); WY = cy + r * Math.sin(f + a0);
  });
}

function fxMirror(F, P) {
  const [cx, cy] = P.at, a = rad(P.angle), nx = -Math.sin(a), ny = Math.cos(a);
  warpField(F, (x, y) => {
    const s = (x - cx) * nx + (y - cy) * ny;
    if (s > 0) { WX = x - 2 * s * nx; WY = y - 2 * s * ny; } else { WX = x; WY = y; }
  });
}

// Rolled round the middle: the picture's foot at the middle, its head at the radius.
function fxPolar(F, P) {
  const [cx, cy] = P.at, R = P.size, a0 = rad(P.angle), k = clamp(P.amt, 0, 100) / 100, A = area;
  warpField(F, (x, y) => {
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
    const t = frac((Math.atan2(dy, dx) - a0) / (2 * Math.PI));
    const sx = A.x0 + t * A.w, sy = A.y1 - r / R * A.h;
    WX = x + (sx - x) * k; WY = y + (sy - y) * k;
  });
}

// Shards: the nearest of a jittered grid of points owns a place; every shard is slid and
// turned about its point by its own amount.
function fxShatter(F, P) {
  const s = P.size, A = P.amt, turn = rad(P.angle), salt = P.salt + 503;
  warpField(F, (x, y) => {
    const gi = Math.floor(x / s), gj = Math.floor(y / s);
    let best = INF, bi = 0, bj = 0, bx = 0, by = 0;
    for (let j = gj - 1; j <= gj + 1; j++) {
      for (let i = gi - 1; i <= gi + 1; i++) {
        const px = (i + 0.1 + 0.8 * hash01(i, j, salt)) * s, py = (j + 0.1 + 0.8 * hash01(i, j, salt + 1)) * s;
        const d = (x - px) * (x - px) + (y - py) * (y - py);
        if (d < best) { best = d; bi = i; bj = j; bx = px; by = py; }
      }
    }
    const da = 2 * Math.PI * hash01(bi, bj, salt + 2), dl = A * (0.3 + 0.7 * hash01(bi, bj, salt + 3));
    const f = -turn * (2 * hash01(bi, bj, salt + 4) - 1), co = Math.cos(f), si = Math.sin(f);
    const qx = x - bx - dl * Math.cos(da), qy = y - by - dl * Math.sin(da);
    WX = bx + qx * co - qy * si; WY = by + qx * si + qy * co;
  });
}

// A mosaic: every tile of a grid takes the tone of its own middle, the picture first
// blurred to about a tile; tiles may slide along the grid.
function fxMosaic(F, P) {
  const s = P.size, r = s / 2.5 / F.c;
  if (r >= 0.5) { F.T = blurGrid(F.T, F.w, F.h, r); F.M = blurGrid(F.M, F.w, F.h, r); F.R = blurGrid(F.R, F.w, F.h, r); }
  const a = rad(P.angle), ux = Math.cos(a), uy = Math.sin(a), [cx, cy] = placeAt(0, 0), salt = P.salt + 607;
  warpField(F, (x, y) => {
    const dx = x - cx, dy = y - cy, u = dx * ux + dy * uy, v = -dx * uy + dy * ux;
    const iu = Math.floor(u / s), iv = Math.floor(v / s);
    const tu = (iu + 0.5) * s + P.amt * (2 * hash01(iu, iv, salt) - 1);
    const tv = (iv + 0.5) * s + P.amt * (2 * hash01(iu, iv, salt + 1) - 1);
    WX = cx + tu * ux - tv * uy; WY = cy + tu * uy + tv * ux;
  });
}

// Fainter copies of the dark, one after another along the angle.
function fxEcho(F, P) {
  const a = rad(P.angle), dx = Math.cos(a), dy = Math.sin(a), n = clamp(Math.round(P.amt), 1, 32);
  const w = F.w, c = F.c, N = w * F.h;
  const T = new Float32Array(N), M = new Float32Array(N), R = new Float32Array(N), S = Float32Array.from(F.S);
  for (let j = 0; j < F.h; j++) {
    const y = F.y0 + (j + 0.5) * c;
    for (let i = 0; i < w; i++) {
      const x = F.x0 + (i + 0.5) * c, o = j * w + i;
      let t = F.T[o], m = F.M[o], r = F.R[o];
      for (let k = 1; k <= n; k++) {
        const f = 1 - k / (n + 1), px = x - dx * P.size * k, py = y - dy * P.size * k;
        t = Math.max(t, f * sampleF(F, F.T, px, py));
        m = Math.max(m, f * sampleF(F, F.M, px, py));
        r = Math.max(r, f * sampleF(F, F.R, px, py));
      }
      T[o] = t; M[o] = m; R[o] = r;
      S[o] = Math.max(S[o], (t - F.T[o]) * 2.5);
    }
  }
  F.T = T; F.M = M; F.R = R; F.S = S;
}

// Streaks round a middle: the grids resampled onto spokes — one row a spoke, one column a
// ring — trailed out along the spokes, or round along the rings, and put back.
function fxRadial(F, P, spin) {
  const [cx, cy] = P.at, c = F.c;
  let far = 0;
  for (const x of [F.x0, F.x0 + F.w * c]) for (const y of [F.y0, F.y0 + F.h * c]) far = Math.max(far, Math.hypot(x - cx, y - cy));
  const NR = Math.ceil(far / c) + 2, NA = clamp(Math.ceil(2 * Math.PI * far / (1.5 * c)), 64, 4096);
  const dA = 2 * Math.PI / NA, n = NR * NA;
  const G = { T: new Float32Array(n), M: new Float32Array(n), R: new Float32Array(n), S: new Float32Array(n) };
  for (let a = 0; a < NA; a++) {
    const co = Math.cos(a * dA), si = Math.sin(a * dA);
    for (let r = 0; r < NR; r++) {
      const x = cx + r * c * co, y = cy + r * c * si, o = a * NR + r;
      G.T[o] = sampleF(F, F.T, x, y); G.M[o] = sampleF(F, F.M, x, y);
      G.R[o] = sampleF(F, F.R, x, y); G.S[o] = sampleF(F, F.S, x, y);
    }
  }
  const al = Math.abs(P.amt) / 100, light = P.amt < 0, L = Math.max(c, P.size);
  if (!spin) {
    const k = Math.exp(-3 * c / L);
    for (let a = 0; a < NA; a++) trailRow(G, a * NR, 1, NR, k, al, light);
  } else {
    for (let r = 1; r < NR; r++) trailRow(G, r, NR, NA, Math.exp(-3 * r * c * dA / L), al, light, true);
  }
  const w = F.w;
  for (let j = 0; j < F.h; j++) {
    const y = F.y0 + (j + 0.5) * c;
    for (let i = 0; i < w; i++) {
      const x = F.x0 + (i + 0.5) * c, o = j * w + i;
      let fa = Math.atan2(y - cy, x - cx) / dA;
      if (fa < 0) fa += NA;
      const fr = clamp(Math.hypot(x - cx, y - cy) / c, 0, NR - 1.001);
      const ia = Math.floor(fa) % NA, ib = (ia + 1) % NA, ta = fa - Math.floor(fa);
      const ir = fr | 0, tr = fr - ir;
      const q00 = ia * NR + ir, q01 = q00 + 1, q10 = ib * NR + ir, q11 = q10 + 1;
      const w00 = (1 - ta) * (1 - tr), w01 = (1 - ta) * tr, w10 = ta * (1 - tr), w11 = ta * tr;
      F.T[o] = w00 * G.T[q00] + w01 * G.T[q01] + w10 * G.T[q10] + w11 * G.T[q11];
      F.M[o] = w00 * G.M[q00] + w01 * G.M[q01] + w10 * G.M[q10] + w11 * G.M[q11];
      F.R[o] = w00 * G.R[q00] + w01 * G.R[q01] + w10 * G.R[q10] + w11 * G.R[q11];
      F.S[o] = w00 * G.S[q00] + w01 * G.S[q01] + w10 * G.S[q10] + w11 * G.S[q11];
    }
  }
}

// The whole picture shrunk into tiles, so many across, turned and slid.
function fxTile(F, P) {
  const A = area, n = clamp(Math.round(P.amt), 1, 40), m = Math.max(1, Math.round(n * A.h / A.w));
  const tw = A.w / n, th = A.h / m, a = rad(P.angle), co = Math.cos(a), si = Math.sin(a);
  const [cx, cy] = placeAt(0, 0), ox = P.ax / 100 * tw, oy = P.ay / 100 * th;
  warpField(F, (x, y) => {
    const dx = x - cx, dy = y - cy, u = dx * co + dy * si + A.w / 2 - ox, v = -dx * si + dy * co + A.h / 2 - oy;
    WX = A.x0 + frac(u / tw) * A.w; WY = A.y0 + frac(v / th) * A.h;
  });
}

////////////////////////////////////////////////////////////////////////////////////////
// The lines
//
// A front is a line of equal travel time of a wave crossing the picture, slowed by its
// dark: from one front to the next is the pitch of the light where the picture is paper
// and the pitch of the dark where it is ink. The travel time is found on a grid of nodes —
// its rows across the way the lines run, turned with them when the wave sets off from an
// edge or a line — by fast sweeping: the grid is swept from each corner in turn, every node
// taking the earliest time a front could reach it from its neighbours, until nothing
// changes. The fronts are then drawn by marching squares, every whole line at once.
//
// The curtain is simpler: the time is only added up down each column, so a dark place
// drags every line below it down with it. Ridges, squiggles and contours need no wave.

let LINESET = null;          // { pts, off, k } — polylines in mm, and the number of each
let linesKeyNow = '';

const LINE_KEYS = ['mode', 'origin', 'angle', 'centreX', 'centreY', 'points', 'fromLevel',
  'pitchLight', 'pitchDark', 'curve', 'phase', 'amp', 'wiggle', 'hidden', 'levels', 'detail',
  'backdrop'];

function ensureLines(coarse) {
  const key = fieldKeyNow + '#' + LINE_KEYS.map(k => settings[k]).join('|') + `|${coarse ? 1 : 0}`;
  if (LINESET && key === linesKeyNow) return;
  const t0 = performance.now();
  linesKeyNow = key;
  LB = { pts: [], off: [0], k: [] };
  switch (settings.mode) {
    case 'curtain':  waveLines(coarse, true); break;
    case 'ridges':   rowLines(coarse, false); break;
    case 'squiggle': rowLines(coarse, true); break;
    case 'contours': contourLines(); break;
    default:         waveLines(coarse, false);
  }
  LINESET = { pts: Float64Array.from(LB.pts), off: Int32Array.from(LB.off), k: Int32Array.from(LB.k),
              levels: COUNTS_LEVELS };
  LB = null;
  linesMs = performance.now() - t0;
}

let LB = null;

function lineOut(xs, ys, n, k) {
  if (n < 2) return;
  for (let i = 0; i < n; i++) LB.pts.push(xs[i], ys[i]);
  LB.off.push(LB.pts.length / 2);
  LB.k.push(k);
}

// A grid of nodes c mm apart over the margin box and a pad round it, its columns along the
// angle: node (i, j) lies at (ox, oy) + i c (ux, uy) + j c (vx, vy). Coarser if it would be
// too many.
function makeGrid(deg, c, pad) {
  const A = area, a = rad(deg), ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
  let u0 = INF, u1 = -INF, v0 = INF, v1 = -INF;
  for (const x of [A.x0, A.x1]) {
    for (const y of [A.y0, A.y1]) {
      const u = x * ux + y * uy, v = x * vx + y * vy;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
  }
  u0 -= pad; u1 += pad; v0 -= pad; v1 += pad;
  let cc = c, U = Math.ceil((u1 - u0) / cc) + 1, V = Math.ceil((v1 - v0) / cc) + 1;
  if (U * V > GRID_CELLS) {
    cc *= Math.sqrt(U * V / GRID_CELLS);
    U = Math.ceil((u1 - u0) / cc) + 1; V = Math.ceil((v1 - v0) / cc) + 1;
  }
  return { U, V, c: cc, ux, uy, vx, vy, u0, v0, ox: u0 * ux + v0 * vx, oy: u0 * uy + v0 * vy };
}

function nodeX(G, i, j) { return G.ox + (i * G.ux + j * G.vx) * G.c; }
function nodeY(G, i, j) { return G.oy + (i * G.uy + j * G.vy) * G.c; }

// What the wave crosses. A ground that is kept is crossed as it is, a blank one as paper —
// the wave races round the figure there and comes into it from the sides. Round a figure
// cut away the ground is never drawn, so it is filled with the figure's own tones carried
// out over it and blurred, and the wave comes into the figure as if the ground were not
// there at all.
function mediumTone() {
  const F = FIELD, s = settings;
  if (s.backdrop === 'kept' || s.subject === 'everything') return F.T;
  if (s.backdrop === 'blank') {
    if (!F.TB) { F.TB = new Float32Array(F.T.length); for (let i = 0; i < F.T.length; i++) F.TB[i] = F.T[i] * F.M[i]; }
    return F.TB;
  }
  if (F.TE) return F.TE;
  const n = F.T.length, TM = new Float32Array(n);
  let sum = 0, cnt = 0;
  for (let i = 0; i < n; i++) { TM[i] = F.T[i] * F.M[i]; sum += TM[i]; cnt += F.M[i]; }
  const mean = cnt > 0 ? sum / cnt : 0, r = 12 / F.c;
  const num = blurGrid(TM, F.w, F.h, r), den = blurGrid(F.M, F.w, F.h, r), eps = 0.02;
  const TE = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const out = (num[i] + mean * eps) / (den[i] + eps);
    TE[i] = F.T[i] * F.M[i] + out * (1 - F.M[i]);
  }
  F.TE = TE;
  return TE;
}

// The tone and the figure at every node, and how many lines a step of the grid crosses
// there: the tone bent by the curve takes the pitch from the light's to the dark's.
function nodeDensity(G) {
  const s = settings, F = FIELD, n = G.U * G.V, TT = mediumTone();
  const D = new Float64Array(n), T = new Float32Array(n), M = new Float32Array(n);
  const Pl = Math.max(0.05, s.pitchLight), Pd = Math.max(0.05, s.pitchDark), g = Math.max(0.05, s.curve / 100);
  const a = G.c / Pl, b = G.c / Pd - G.c / Pl;
  for (let j = 0; j < G.V; j++) {
    for (let i = 0; i < G.U; i++) {
      const o = j * G.U + i, x = nodeX(G, i, j), y = nodeY(G, i, j);
      const t = clamp(sampleF(F, TT, x, y), 0, 1);
      T[o] = t; M[o] = sampleF(F, F.M, x, y);
      D[o] = a + b * (g === 1 ? t : Math.pow(t, g));
    }
  }
  G.D = D; G.T = T; G.M = M;
}

// Points strewn over the picture, each as far from the others as a few tries allow.
function strewnPoints(n) {
  const A = area, rnd = rng(83), out = [];
  for (let p = 0; p < n; p++) {
    let best = null, room = -1;
    for (let t = 0; t < 10; t++) {
      const x = A.x0 + rnd() * A.w, y = A.y0 + rnd() * A.h;
      let d = Infinity;
      for (const q of out) d = Math.min(d, Math.hypot(x - q[0], y - q[1]));
      if (d > room) { room = d; best = [x, y]; }
    }
    out.push(best);
  }
  return out;
}

// Seeds where a grid of values crosses a level between two nodes: each node of the pair is
// given the time it takes to reach it from the crossing. With `inside` every node on the
// low side is a seed too, at time 0.
function seedCrossing(G, Fa, fixed, Gv, lv, inside) {
  const U = G.U, V = G.V, D = G.D;
  let found = false;
  const put = (q, t) => { if (t < Fa[q]) Fa[q] = t; fixed[q] = 1; found = true; };
  for (let j = 0; j < V; j++) {
    for (let i = 0; i < U; i++) {
      const o = j * U + i, a = Gv[o] - lv;
      if (inside && a <= 0) put(o, 0);
      if (i < U - 1) {
        const b = Gv[o + 1] - lv;
        if ((a > 0) !== (b > 0)) { const t = a / (a - b); put(o, t * D[o]); put(o + 1, (1 - t) * D[o + 1]); }
      }
      if (j < V - 1) {
        const b = Gv[o + U] - lv;
        if ((a > 0) !== (b > 0)) { const t = a / (a - b); put(o, t * D[o]); put(o + U, (1 - t) * D[o + U]); }
      }
    }
  }
  return found;
}

// Fast sweeping of the eikonal equation, first order: a node's time from the earlier of
// its neighbours across and the earlier along, as a front would cross the cell between.
function sweepTimes(G, Fa, fixed) {
  const U = G.U, V = G.V, D = G.D, n = U * V;
  for (let it = 0; it < 12; it++) {
    let changed = 0;
    for (let sw = 0; sw < 4; sw++) {
      const di = (sw & 1) ? -1 : 1, dj = (sw & 2) ? -1 : 1;
      const i0 = di > 0 ? 0 : U - 1, i1 = di > 0 ? U : -1;
      const j0 = dj > 0 ? 0 : V - 1, j1 = dj > 0 ? V : -1;
      for (let j = j0; j !== j1; j += dj) {
        const row = j * U;
        for (let i = i0; i !== i1; i += di) {
          const o = row + i;
          if (fixed[o]) continue;
          let a = i > 0 ? Fa[o - 1] : INF;
          if (i < U - 1 && Fa[o + 1] < a) a = Fa[o + 1];
          let b = j > 0 ? Fa[o - U] : INF;
          if (j < V - 1 && Fa[o + U] < b) b = Fa[o + U];
          if (a > b) { const t = a; a = b; b = t; }
          if (a >= INF) continue;
          const f = D[o];
          const nv = b - a >= f ? a + f : 0.5 * (a + b + Math.sqrt(2 * f * f - (b - a) * (b - a)));
          const old = Fa[o];
          if (nv < old) {
            Fa[o] = nv;
            if (old - nv > 0.004) changed++;
          }
        }
      }
    }
    if (changed <= n * 4e-4) break;
  }
}

// Lines as the fronts of the wave, or as the curtain.
function waveLines(coarse, curtain) {
  const s = settings, o = curtain ? 'edge' : s.origin;
  const turned = o === 'edge' || o === 'both edges' || o === 'middle line';
  const c = clamp(s.detail, 0.15, 4) * (coarse ? 2 : 1);
  const G = makeGrid(turned ? s.angle : 0, c, 2 * c);
  nodeDensity(G);
  const U = G.U, V = G.V, n = U * V, D = G.D;
  const Fa = new Float64Array(n).fill(INF), fixed = new Uint8Array(n);
  const put = (q, t) => { if (t < Fa[q]) Fa[q] = t; fixed[q] = 1; };
  const fromPoints = pts => {
    for (const [px, py] of pts) {
      const fi = ((px * G.ux + py * G.uy) - G.u0) / G.c, fj = ((px * G.vx + py * G.vy) - G.v0) / G.c;
      for (let j = Math.floor(fj) - 1; j <= Math.ceil(fj) + 1; j++) {
        for (let i = Math.floor(fi) - 1; i <= Math.ceil(fi) + 1; i++) {
          if (i < 0 || j < 0 || i >= U || j >= V) continue;
          const d = Math.hypot(i - fi, j - fj);
          if (d <= 1.5) put(j * U + i, d * D[j * U + i]);
        }
      }
    }
  };
  if (curtain) {
    // every column added up from the edge the lines hang from
    for (let i = 0; i < U; i++) Fa[i] = 0;
    for (let j = 1; j < V; j++) {
      for (let i = 0; i < U; i++) {
        const q = j * U + i;
        Fa[q] = Fa[q - U] + 0.5 * (D[q - U] + D[q]);
      }
    }
  } else {
    switch (o) {
      case 'both edges':
        for (let i = 0; i < U; i++) { put(i, 0); put((V - 1) * U + i, 0); }
        break;
      case 'middle line': {
        const [cx, cy] = placeAt(s.centreX, s.centreY);
        const fj = (cx * G.vx + cy * G.vy - G.v0) / G.c, j0 = Math.floor(fj);
        for (const j of [j0, j0 + 1]) {
          if (j < 0 || j >= V) continue;
          for (let i = 0; i < U; i++) put(j * U + i, Math.abs(j - fj) * D[j * U + i]);
        }
        break;
      }
      case 'point': fromPoints([placeAt(s.centreX, s.centreY)]); break;
      case 'points': fromPoints(strewnPoints(clamp(Math.round(s.points), 1, 60))); break;
      case 'outline':
        if (!seedCrossing(G, Fa, fixed, G.M, 0.5, false)) fromPoints([placeAt(s.centreX, s.centreY)]);
        break;
      case 'highlights':
        if (!seedCrossing(G, Fa, fixed, G.T, clamp(s.fromLevel, 0, 100) / 100, true)) {
          fromPoints([placeAt(s.centreX, s.centreY)]);
        }
        break;
      default:
        for (let i = 0; i < U; i++) put(i, 0);
    }
    sweepTimes(G, Fa, fixed);
  }
  let hi = 0;
  for (let q = 0; q < n; q++) if (Fa[q] < INF && Fa[q] > hi) hi = Fa[q];
  const ph = clamp(s.phase, 0, 100) / 100;
  COUNTS_LEVELS = Math.max(0, Math.floor(hi - ph) + 1);
  const xs = [], ys = [];
  isoLines(Fa, U, V, ph, 1, 0, Math.floor(hi - ph), (k, px, py, m) => {
    xs.length = ys.length = m;
    for (let t = 0; t < m; t++) { xs[t] = nodeX(G, px[t], py[t]); ys[t] = nodeY(G, px[t], py[t]); }
    lineOut(xs, ys, m, k);
  });
}

let COUNTS_LEVELS = 0;

// Contours of the tones: so many levels from paper to ink.
function contourLines() {
  const s = settings, F = FIELD, n = clamp(Math.round(s.levels), 1, 400), ph = clamp(s.phase, 0, 100) / 100;
  const G = mediumTone();
  COUNTS_LEVELS = n;
  const xs = [], ys = [];
  isoLines(G, F.w, F.h, ph / n, 1 / n, 0, n - 1, (k, px, py, m) => {
    xs.length = ys.length = m;
    for (let t = 0; t < m; t++) { xs[t] = F.x0 + (px[t] + 0.5) * F.c; ys[t] = F.y0 + (py[t] + 0.5) * F.c; }
    lineOut(xs, ys, m, k);
  });
}

// Rows a pitch apart, along the angle. A ridge is lifted across its row by the dark under
// it, and hides behind the rows in front of it — those further down the sheet — if asked;
// a squiggle swings to either side, wider and quicker in the dark.
function rowLines(coarse, squiggle) {
  const s = settings, A = area, a = rad(s.angle), ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
  let u0 = INF, u1 = -INF, v0 = INF, v1 = -INF;
  for (const x of [A.x0, A.x1]) {
    for (const y of [A.y0, A.y1]) {
      const u = x * ux + y * uy, v = x * vx + y * vy;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
  }
  const P = Math.max(0.2, s.pitchLight), amp = s.amp, g = Math.max(0.05, s.curve / 100);
  const ds = clamp(s.detail, 0.1, 4) * (coarse ? 2 : 1) * (squiggle ? 0.5 : 1);
  const nU = Math.max(2, Math.ceil((u1 - u0) / ds) + 1), ph = clamp(s.phase, 0, 100) / 100;
  const F = FIELD, TT = mediumTone();
  // ridges start below the box too, so that the ones lifted into it are there
  const vA = v0 - (squiggle ? Math.abs(amp) : Math.max(0, -amp)), vB = v1 + (squiggle ? Math.abs(amp) : Math.max(0, amp));
  const j0 = Math.ceil((vA - v0) / P - ph), j1 = Math.floor((vB - v0) / P - ph);
  const hor = new Float64Array(nU).fill(INF), vis = new Uint8Array(nU);
  const VX = new Float64Array(nU), VY = new Float64Array(nU), VV = new Float64Array(nU);
  const xs = [], ys = [];
  const flush = (k) => { if (xs.length >= 2) lineOut(xs, ys, xs.length, k); xs.length = ys.length = 0; };
  const hide = s.hidden && !squiggle && amp !== 0;
  COUNTS_LEVELS = Math.max(0, j1 - j0 + 1);
  for (let step = 0; step <= j1 - j0; step++) {
    // front to back: the row the lift points away from comes first
    const j = amp >= 0 ? j1 - step : j0 + step, v = v0 + (j + ph) * P;
    let phase = 0;
    for (let i = 0; i < nU; i++) {
      const u = u0 + i * ds, bx = u * ux + v * vx, by = u * uy + v * vy;
      const t = clamp(sampleF(F, TT, bx, by), 0, 1);
      const tg = g === 1 ? t : Math.pow(t, g);
      let d;
      if (squiggle) {
        phase += 2 * Math.PI * ds / (Math.max(0.2, s.wiggle) / (0.3 + 0.7 * tg));
        d = amp * tg * Math.sin(phase);
      } else {
        d = -amp * tg;
      }
      VX[i] = bx + vx * d; VY[i] = by + vy * d; VV[i] = v + d;
    }
    if (!hide) {
      xs.length = ys.length = 0;
      for (let i = 0; i < nU; i++) { xs.push(VX[i]); ys.push(VY[i]); }
      flush(j);
      continue;
    }
    // what of the row stands clear of every row in front of it
    const sign = amp >= 0 ? 1 : -1;
    for (let i = 0; i < nU; i++) vis[i] = sign * (hor[i] - VV[i]) > 1e-6 || hor[i] >= INF ? 1 : 0;
    xs.length = ys.length = 0;
    for (let i = 0; i < nU; i++) {
      if (i > 0 && vis[i] !== vis[i - 1] && hor[i] < INF && hor[i - 1] < INF) {
        const da = sign * (hor[i - 1] - VV[i - 1]), db = sign * (hor[i] - VV[i]);
        const t = clamp(da / (da - db), 0, 1);
        xs.push(VX[i - 1] + (VX[i] - VX[i - 1]) * t); ys.push(VY[i - 1] + (VY[i] - VY[i - 1]) * t);
        if (!vis[i]) flush(j);
      } else if (i > 0 && vis[i] !== vis[i - 1] && !vis[i]) {
        flush(j);
      }
      if (vis[i]) { xs.push(VX[i]); ys.push(VY[i]); }
    }
    flush(j);
    for (let i = 0; i < nU; i++) {
      if (hor[i] >= INF || sign * (hor[i] - VV[i]) > 0) hor[i] = VV[i];
    }
  }
}

// Marching squares over a grid of values at every level phase + k step for k from kLo to
// kHi, all at once: every cell is filed under the levels that cross it, then level by level
// the pieces in the cells are joined edge to edge into polylines. fn(k, xs, ys, n) is given
// each, in the grid's node coordinates; a closed one ends where it began.
let ISO_SA = new Int32Array(0), ISO_SB = new Int32Array(0), ISO_ST = new Int32Array(0);
let ISO_PX = new Float64Array(4096), ISO_PY = new Float64Array(4096);

function isoLines(Gv, U, V, phase, step, kLo, kHi, fn) {
  const K = kHi - kLo + 1;
  if (K <= 0 || U < 2 || V < 2) return;
  const UV = U * V;
  // cells filed under the levels that cross them
  const start = new Int32Array(K + 1);
  const range = (o, out) => {
    const a = Gv[o], b = Gv[o + 1], c = Gv[o + U + 1], d = Gv[o + U];
    if (!(a < INF && b < INF && c < INF && d < INF)) return false;
    const lo = Math.min(a, b, c, d), hi = Math.max(a, b, c, d);
    let k0 = Math.floor((lo - phase) / step) + 1, k1 = Math.floor((hi - phase) / step);
    if (k0 < kLo) k0 = kLo;
    if (k1 > kHi) k1 = kHi;
    if (k0 > k1) return false;
    out[0] = k0; out[1] = k1;
    return true;
  };
  const kk = [0, 0];
  for (let j = 0; j < V - 1; j++) {
    for (let i = 0; i < U - 1; i++) {
      if (!range(j * U + i, kk)) continue;
      for (let k = kk[0]; k <= kk[1]; k++) start[k - kLo + 1]++;
    }
  }
  for (let k = 0; k < K; k++) start[k + 1] += start[k];
  const total = start[K];
  if (!total) return;
  const cells = new Int32Array(total), fill = start.slice(0, K);
  for (let j = 0; j < V - 1; j++) {
    for (let i = 0; i < U - 1; i++) {
      const o = j * U + i;
      if (!range(o, kk)) continue;
      for (let k = kk[0]; k <= kk[1]; k++) cells[fill[k - kLo]++] = o;
    }
  }
  // edges: a horizontal one is numbered by its left node, a vertical one by UV + its top node
  if (ISO_ST.length < 2 * UV) {
    ISO_SA = new Int32Array(2 * UV); ISO_SB = new Int32Array(2 * UV); ISO_ST = new Int32Array(2 * UV);
  } else {
    ISO_ST.fill(0, 0, 2 * UV);
  }
  const SA = ISO_SA, SB = ISO_SB, ST = ISO_ST;
  let E0 = new Int32Array(1024), E1 = new Int32Array(1024), seen = new Uint8Array(1024);
  for (let kq = 0; kq < K; kq++) {
    const c0 = start[kq], c1 = start[kq + 1];
    if (c1 <= c0) continue;
    const L = phase + (kLo + kq) * step, stamp = kq + 1;
    if (E0.length < 2 * (c1 - c0)) {
      E0 = new Int32Array(4 * (c1 - c0)); E1 = new Int32Array(4 * (c1 - c0)); seen = new Uint8Array(4 * (c1 - c0));
    }
    let ns = 0;
    const seg = (ea, eb) => {
      E0[ns] = ea; E1[ns] = eb;
      for (const e of [ea, eb]) {
        if (ST[e] !== stamp) { ST[e] = stamp; SA[e] = ns; SB[e] = -1; } else SB[e] = ns;
      }
      ns++;
    };
    for (let t = c0; t < c1; t++) {
      const o = cells[t], i = o % U, j = (o - i) / U;
      const a = Gv[o], b = Gv[o + 1], c = Gv[o + U + 1], d = Gv[o + U];
      const cs = (a >= L ? 1 : 0) | (b >= L ? 2 : 0) | (c >= L ? 4 : 0) | (d >= L ? 8 : 0);
      const eT = o, eB = o + U, eL = UV + o, eR = UV + o + 1;
      switch (cs) {
        case 1: case 14: seg(eL, eT); break;
        case 2: case 13: seg(eT, eR); break;
        case 3: case 12: seg(eL, eR); break;
        case 4: case 11: seg(eR, eB); break;
        case 6: case 9:  seg(eT, eB); break;
        case 7: case 8:  seg(eL, eB); break;
        case 5:
          if ((a + b + c + d) / 4 >= L) { seg(eT, eR); seg(eL, eB); } else { seg(eL, eT); seg(eR, eB); }
          break;
        case 10:
          if ((a + b + c + d) / 4 >= L) { seg(eL, eT); seg(eR, eB); } else { seg(eT, eR); seg(eL, eB); }
          break;
        default:
      }
    }
    seen.fill(0, 0, ns);
    const other = (e, sgi) => (ST[e] !== stamp ? -1 : SA[e] === sgi ? SB[e] : SA[e]);
    const put = (e, m) => {
      if (m >= ISO_PX.length) {
        const gx = new Float64Array(ISO_PX.length * 2), gy = new Float64Array(ISO_PY.length * 2);
        gx.set(ISO_PX); gy.set(ISO_PY); ISO_PX = gx; ISO_PY = gy;
      }
      if (e < UV) {
        const g0 = Gv[e], g1 = Gv[e + 1], i = e % U;
        ISO_PX[m] = i + (L - g0) / (g1 - g0); ISO_PY[m] = (e - i) / U;
      } else {
        const q = e - UV, g0 = Gv[q], g1 = Gv[q + U], i = q % U;
        ISO_PX[m] = i; ISO_PY[m] = (q - i) / U + (L - g0) / (g1 - g0);
      }
    };
    for (let s0 = 0; s0 < ns; s0++) {
      if (seen[s0]) continue;
      // back to the start of the chain, or once round a loop
      let sg = s0, e = E0[s0], guard = 0;
      for (;;) {
        const nx = other(e, sg);
        if (nx < 0 || nx === s0 || seen[nx]) break;
        e = E0[nx] === e ? E1[nx] : E0[nx];
        sg = nx;
        if (++guard > ns) break;
      }
      // and along it
      let m = 0, cur = sg, inE = e;
      put(inE, m++);
      for (;;) {
        seen[cur] = 1;
        const outE = E0[cur] === inE ? E1[cur] : E0[cur];
        put(outE, m++);
        const nx = other(outE, cur);
        if (nx < 0 || seen[nx]) break;
        cur = nx; inE = outE;
      }
      if (m >= 2) fn(kLo + kq, ISO_PX, ISO_PY, m);
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
let MIN_PIECE = 0;

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

// The stroke gathered in QX, QY: dropped if too short, straightened, and into the sink.
let QX = new Float64Array(4096), QY = new Float64Array(4096), QN = 0;

function qPush(x, y) {
  if (QN >= QX.length) {
    const grow = a => { const b = new Float64Array(a.length * 2); b.set(a); return b; };
    QX = grow(QX); QY = grow(QY);
  }
  QX[QN] = x; QY[QN] = y;
  QN++;
}

function strokeOut(straighten) {
  let n = QN;
  QN = 0;
  if (n < 2) return false;
  let len = 0;
  for (let i = 1; i < n && len < MIN_PIECE; i++) len += Math.hypot(QX[i] - QX[i - 1], QY[i] - QY[i - 1]);
  if (len < MIN_PIECE) return false;
  if (straighten) n = simplify(QX, QY, n, SIMPLIFY);
  emit(QX, QY, n);
  return true;
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
// From lines to strokes
//
// A line found on the picture is walked point by point. Where the figure is cut out of its
// ground, or the picture is lighter than the pen-up tone, the pen lifts — the line is cut
// between two points, where that happens; where the second colour is asked for, the line
// goes on in the other pen from there. Every piece is straightened a little and sunk.

let BLOTS = null, blotsKey = '';

// Blots of slow noise covering a share of the sheet: more than 0 inside.
function blotGrid() {
  const key = fieldKeyNow + '|' + settings.splitShare;
  if (BLOTS && blotsKey === key) return BLOTS;
  const F = FIELD, M = new Float32Array(F.T.length), k = 1 / (F.env.S * 0.8);
  eachCell(F, (o, qx, qy) => { M[o] = NZW(qx * k + 11.3, qy * k - 7.7, 2.5); });
  const cut = gridQuantile(M, 1 - clamp(settings.splitShare, 0, 100) / 100);
  for (let i = 0; i < M.length; i++) M[i] = (M[i] - cut) * 100;
  BLOTS = M; blotsKey = key;
  return M;
}

// Where the second colour goes: more than 0 there.
function makeSplit() {
  const s = settings;
  switch (s.split) {
    case 'tone band': {
      const lo = Math.min(s.splitFrom, s.splitTo) / 100, hi = Math.max(s.splitFrom, s.splitTo) / 100;
      const a = lo <= 0 ? -1 : lo, b = hi >= 1 ? 2 : hi;
      return (x, y, T) => Math.min(T - a, b - T);
    }
    case 'every n-th line': {
      const n = Math.max(1, Math.round(s.splitEvery));
      return (x, y, T, k) => (((k % n) + n) % n === 0 ? 1 : -1);
    }
    case 'blots': {
      const B = blotGrid();
      return (x, y) => gridAt(B, x, y);
    }
    case 'one side': {
      const [cx, cy] = placeAt(s.splitX, s.splitY), a = rad(s.splitAngle), nx = -Math.sin(a), ny = Math.cos(a);
      return (x, y) => (x - cx) * nx + (y - cy) * ny;
    }
    case 'background': return (x, y) => 0.5 - gridAt(FIELD.M, x, y);
    case 'photo reds': {
      const lv = clamp(s.splitFrom, 0, 100) / 100;
      return (x, y) => gridAt(FIELD.R, x, y) - lv;
    }
    case 'smeared': return (x, y) => gridAt(FIELD.S, x, y) - 0.3;
    default: return null;
  }
}

function drawLines() {
  const s = settings, L = LINESET, F = FIELD;
  const penA = penIdx(s.linePen), penB = penIdx(s.splitPen);
  const cut = s.backdrop === 'cut away' && s.subject !== 'everything';
  const blank = s.backdrop !== 'kept', lift = clamp(s.liftBelow, 0, 100) / 100;
  const sp = makeSplit(), pts = L.pts;
  let drawn = 0;
  const out = st => {
    PEN = st === 2 ? penB : penA;
    LAY = st === 2 ? L_SECOND : L_LINES;
    return strokeOut(true);
  };
  for (let l = 0; l + 1 < L.off.length; l++) {
    const a = L.off[l], b = L.off[l + 1], k = L.k[l];
    let prev = 0, px = 0, py = 0, pon = 0, psv = 0, any = false;
    QN = 0;
    for (let q = a; q < b; q++) {
      const x = pts[2 * q], y = pts[2 * q + 1];
      const m = cut || blank ? sampleF(F, F.M, x, y) : 1;
      let T = sampleF(F, F.T, x, y);
      if (blank) T *= m;
      let on = cut ? m - 0.5 : 1;
      if (lift > 0 && T - lift < on) on = T - lift;
      const sv = sp ? sp(x, y, T, k) : -1;
      const st = on > 0 ? (sv > 0 ? 2 : 1) : 0;
      if (q > a && st !== prev) {
        let t = 1;
        if ((on > 0) !== (pon > 0)) t = Math.min(t, pon / (pon - on));
        if (on > 0 && pon > 0 && (sv > 0) !== (psv > 0)) t = Math.min(t, psv / (psv - sv));
        const cx = px + (x - px) * t, cy = py + (y - py) * t;
        if (prev) { qPush(cx, cy); if (out(prev)) any = true; }
        QN = 0;
        if (st) qPush(cx, cy);
      }
      if (st) qPush(x, y);
      prev = st; px = x; py = y; pon = on; psv = sv;
    }
    if (prev && out(prev)) any = true;
    QN = 0;
    if (any) drawn++;
  }
  COUNTS.lines = drawn;
}

// The figure's outline, where it parts from its ground.
function drawOutline() {
  const s = settings, F = FIELD;
  if (!s.outline || s.subject === 'everything') return;
  PEN = penIdx(s.outlinePen); LAY = L_OUTLINE;
  isoLines(F.M, F.w, F.h, 0.5, 1, 0, 0, (k, px, py, m) => {
    QN = 0;
    for (let t = 0; t < m; t++) qPush(F.x0 + (px[t] + 0.5) * F.c, F.y0 + (py[t] + 0.5) * F.c);
    strokeOut(true);
  });
}

// --- the streaks
//
// Straight lines raked across the sheet at their own angle: packed where the figure's
// shadow falls — the figure seen along the streaks, slid across them by the shift — and
// in bands of noise, sparse elsewhere. The packing is found as the fronts are: the streaks
// stand at whole numbers of the density added up across them. Each stops short of the
// figure and keeps to the side of it asked for; some are cut short, some broken.

let SHADOW = null, shadowKey = '';

// How far each streak lies in the figure's shadow, 0 to 1, along the way across them: the
// share of it that crosses the dark side of the figure.
function streakShadow() {
  const s = settings, A = area;
  const key = fieldKeyNow + '|' + [s.streakAngle, s.streakShift].join('|');
  if (SHADOW && shadowKey === key) return SHADOW;
  const a = rad(s.streakAngle), ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
  let u0 = INF, u1 = -INF, v0 = INF, v1 = -INF;
  for (const x of [A.x0, A.x1]) {
    for (const y of [A.y0, A.y1]) {
      const u = x * ux + y * uy, v = x * vx + y * vy;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
  }
  const dv = 0.25, nv = Math.ceil((v1 - v0) / dv) + 1, du = 1, P = new Float32Array(nv);
  if (s.subject !== 'everything') {
    for (let j = 0; j < nv; j++) {
      const v = v0 + j * dv - s.streakShift;
      let sum = 0, cnt = 0;
      for (let u = u0; u <= u1; u += du) {
        const x = u * ux + v * vx, y = u * uy + v * vy;
        if (x < A.x0 || x > A.x1 || y < A.y0 || y > A.y1) continue;
        sum += gridAt(FIELD.M, x, y) * sstep(0.45, 0.75, toneAt(x, y)); cnt++;
      }
      P[j] = cnt ? sstep(0, 0.16, sum / cnt) : 0;
    }
  }
  SHADOW = { P, v0, v1, dv, nv, u0, u1, ux, uy, vx, vy };
  shadowKey = key;
  return SHADOW;
}

function shadowAt(S, x, y) {
  const f = clamp((x * S.vx + y * S.vy - S.v0) / S.dv, 0, S.nv - 1.001), j = f | 0;
  return S.P[j] + (S.P[j + 1] - S.P[j]) * (f - j);
}

function drawStreaks() {
  const s = settings;
  if (s.streaks === 'none') return;
  const S = streakShadow(), F = FIELD, nv = S.nv, dv = S.dv;
  const Pl = Math.max(0.1, s.streakLight), Pd = Math.max(0.1, s.streakDark);
  const bk = clamp(s.streakBands, 0, 100) / 100, bz = 1 / Math.max(1, s.streakBandSize);
  // how packed they are along the way across, and that added up
  const cum = new Float64Array(nv);
  let acc = 0;
  for (let j = 0; j < nv; j++) {
    const v = S.v0 + j * dv;
    const band = sstep(0.5, 0.74, 0.5 + 0.9 * fbm(NZW, v * bz, 0.5, 19.3 + s.seed * 0.1, 3));
    let q = 0;
    if (s.streaks === 'shadow') q = Math.max(S.P[j], bk * band);
    else if (s.streaks === 'bands') q = band;
    cum[j] = acc;
    acc += (1 / Pl + (1 / Pd - 1 / Pl) * q) * dv;
  }
  const SD = s.subject !== 'everything' && !s.streakOver ? fieldSD() : null;
  const gap = Math.max(0, s.streakGap), brk = clamp(s.streakBreak, 0, 100) / 100;
  const len = Math.max(0, s.streakLen), side = s.streakSide;
  const du = 0.5, nu = Math.ceil((S.u1 - S.u0) / du) + 1;
  const U = new Float64Array(nu), X = new Float64Array(nu), Y = new Float64Array(nu), O = new Float64Array(nu);
  PEN = penIdx(s.streakPen); LAY = L_STREAKS;
  let count = 0, j = 0;
  for (let k = 0; k + 0.5 < acc; k++) {
    const lv = k + 0.5;
    while (j < nv - 2 && cum[j + 1] < lv) j++;
    const v = S.v0 + (j + (lv - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j])) * dv;
    // the streak sampled along: how far off the figure each point is
    let uin = INF, uout = -INF;
    for (let i = 0; i < nu; i++) {
      const u = S.u0 + i * du, x = u * S.ux + v * S.vx, y = u * S.uy + v * S.vy;
      U[i] = u; X[i] = x; Y[i] = y;
      O[i] = SD ? -(sampleF(F, SD, x, y) + gap) : 1;
      if (O[i] <= 0) { uin = Math.min(uin, u); uout = Math.max(uout, u); }
    }
    const touches = uin < INF;
    // what of it may be drawn
    let a = S.u0, b = S.u1;
    if (touches && side === 'after') a = uout;
    if (touches && side === 'before') b = uin;
    const h1 = hash01(k, 1, 211), h2 = hash01(k, 2, 211), h3 = hash01(k, 3, 211), h4 = hash01(k, 4, 211);
    if (len > 0) {
      const L = len * (0.35 + 0.65 * h1);
      if (!touches) { a = a + (b - a - L) * h2; b = a + L; }
      else if (side === 'after') b = Math.min(b, a + L);
      else if (side === 'before') a = Math.max(a, b - L);
      else { a = Math.max(a, uin - L); b = Math.min(b, uout + L); }
    }
    if (brk > 0) {
      // the far ends worn away
      const span = b - a;
      if (!(touches && side === 'before')) b -= span * brk * 0.5 * h3;
      if (!(touches && side === 'after')) a += span * brk * 0.5 * h4;
    }
    const gapAt = brk > 0 && hash01(k, 5, 211) < brk ? a + (b - a) * hash01(k, 6, 211) : NaN;
    const gapLen = (b - a) * (0.05 + 0.25 * hash01(k, 7, 211));
    const ok = u => u >= a && u <= b && !(u >= gapAt && u <= gapAt + gapLen);
    QN = 0;
    let was = false, drew = false;
    for (let i = 0; i < nu; i++) {
      const on = O[i] > 0 && ok(U[i]);
      if (on !== was && i > 0) {
        // the edge of the figure between two points; the ends of the span as they fall
        let t = 0.5;
        if ((O[i] > 0) !== (O[i - 1] > 0)) t = O[i - 1] / (O[i - 1] - O[i]);
        const cx = X[i - 1] + (X[i] - X[i - 1]) * t, cy = Y[i - 1] + (Y[i] - Y[i - 1]) * t;
        qPush(cx, cy);
        if (was && strokeOut(true)) drew = true;
        QN = 0;
        if (on) qPush(cx, cy);
      }
      if (on) qPush(X[i], Y[i]);
      was = on;
    }
    if (was && strokeOut(true)) drew = true;
    QN = 0;
    if (drew) count++;
  }
  COUNTS.streaks = count;
}

// --- the marker
//
// A region filled solid with a broad pen: the figure's shadow band, the dark or the light of
// the figure, its ground, or the figure itself. It is drawn as a filled shape wants it: its
// outline half a nib inside the edge, then passes inside that no further apart than the
// fill pass of the nib; a part narrower than the nib is one touch of it.

function drawMarker() {
  const s = settings;
  if (s.marker === 'none') return;
  const F = FIELD, A = area, w = F.w, h = F.h, c = F.c, n = w * h;
  const pen = penIdx(s.markerPen), nib = penW(pen), lv = clamp(s.markerLevel, 0, 100) / 100;
  const gap = Math.max(0, s.markerGap), shaped = s.subject !== 'everything';
  const SD = shaped ? fieldSD() : null, S = s.marker === 'shadow band' ? streakShadow() : null;
  const R = new Float32Array(n);
  let any = false;
  for (let j = 0; j < h; j++) {
    const y = F.y0 + (j + 0.5) * c;
    if (y < A.y0 || y > A.y1) continue;
    for (let i = 0; i < w; i++) {
      const x = F.x0 + (i + 0.5) * c, o = j * w + i;
      if (x < A.x0 || x > A.x1) continue;
      const d = SD ? SD[o] : 1e9;
      let on;
      switch (s.marker) {
        case 'shadow band': on = shadowAt(S, x, y) >= lv && d < -gap; break;
        case 'dark tones':  on = F.T[o] >= lv && d > gap; break;
        case 'light tones': on = F.T[o] <= lv && d > gap; break;
        case 'background':  on = shaped && d < -gap; break;
        default:            on = d > gap;
      }
      if (on) { R[o] = 1; any = true; }
    }
  }
  if (!any) return;
  const D = signedDistance(R, w, h, c), half = nib / 2;
  PEN = pen; LAY = L_MARKER;
  // the outline, half a nib in
  isoLines(D, w, h, half, 1, 0, 0, (k, px, py, m) => {
    QN = 0;
    for (let t = 0; t < m; t++) qPush(F.x0 + (px[t] + 0.5) * c, F.y0 + (py[t] + 0.5) * c);
    strokeOut(true);
  });
  // passes inside it
  const a = rad(s.markerAngle), ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
  let u0 = INF, u1 = -INF, v0 = INF, v1 = -INF;
  for (const x of [A.x0, A.x1]) {
    for (const y of [A.y0, A.y1]) {
      const u = x * ux + y * uy, v = x * vx + y * vy;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
  }
  const step = Math.max(0.05, nib * clamp(s.fillPass, 20, 300) / 100), du = Math.min(0.5, nib / 4);
  for (let v = v0 + step / 2; v < v1; v += step) {
    QN = 0;
    let pd = -1, px = 0, py = 0;
    for (let u = u0; u <= u1 + du; u += du) {
      const x = u * ux + v * vx, y = u * uy + v * vy;
      const d = sampleF(F, D, x, y) - half;
      if ((d > 0) !== (pd > 0) && u > u0) {
        const t = pd / (pd - d), cx = px + (x - px) * t, cy = py + (y - py) * t;
        qPush(cx, cy);
        if (pd > 0) strokeOut(true);
        QN = 0;
        if (d > 0) qPush(cx, cy);
      } else if (d > 0) qPush(x, y);
      pd = d; px = x; py = y;
    }
    if (pd > 0) strokeOut(true);
    QN = 0;
  }
  // the parts too narrow for the nib: one touch at the widest place of each
  const lab = new Int32Array(n).fill(-1), stack = new Int32Array(n);
  let dots = 0;
  for (let o0 = 0; o0 < n; o0++) {
    if (!R[o0] || lab[o0] >= 0) continue;
    let sp = 0, best = o0, cnt = 0;
    lab[o0] = o0; stack[sp++] = o0;
    while (sp) {
      const o = stack[--sp], i = o % w;
      cnt++;
      if (D[o] > D[best]) best = o;
      const nb = [i > 0 ? o - 1 : -1, i < w - 1 ? o + 1 : -1, o >= w ? o - w : -1, o < n - w ? o + w : -1];
      for (const q of nb) if (q >= 0 && R[q] && lab[q] < 0) { lab[q] = o0; stack[sp++] = q; }
    }
    if (D[best] >= half || cnt * c * c < 0.2 * nib * nib) continue;
    const bi = best % w, bj = (best - bi) / w, x = F.x0 + (bi + 0.5) * c, y = F.y0 + (bj + 0.5) * c;
    emit([x, x + EPS], [y, y], 2);
    dots++;
  }
  COUNTS.dots = dots;
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

// The pen the cut guides are dotted with: the first in the order of the passes that draws
// anything — so they go down once, at the start.
function guidePen() {
  const used = new Set(SINK.ink);
  for (const i of penOrder()) if (used.has(i)) return i;
  return penIdx(settings.linePen);
}

// A dot is one touch of the pen, and no pen's box clips it: it stands on the very edge.
function cropMarkDots() {
  if (!settings.cropMarks) return;
  const [W] = paperDims();
  PEN = guidePen(); LAY = L_GUIDES;
  for (const [x, y] of cropMarkPlaces()) pushPoly([x, x + (x > W / 2 ? -EPS : EPS)], [y, y], 2);
}

function buildShapes() {
  area = drawArea();
  if (area.w < 2 || area.h < 2) return null;
  const s = settings, coarse = !!drag;
  ensureNoise();
  ensureField(coarse);
  ensureLines(coarse);
  SINK = makeSink();
  AREAS = [];
  for (let i = 0; i < SLOTS; i++) AREAS.push(penArea(i));
  MIN_PIECE = Math.max(0, s.minPiece);
  COUNTS = { lines: 0, levels: LINESET.levels, streaks: 0, dots: 0 };

  drawMarker();
  drawStreaks();
  drawLines();
  drawOutline();
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
    // the cut guides first, then the rest of what the pen draws
    const guides = list.filter(i => sh.lay[i] === L_GUIDES), rest = list.filter(i => sh.lay[i] !== L_GUIDES);
    for (const part of [guides, rest]) {
      if (settings.optimiseOrder) {
        const g = greedy(sh, part, 0, 0);
        for (let t = 0; t < g.order.length; t++) { order[at] = g.order[t]; flip[at++] = g.flip[t]; }
      } else {
        for (const i of part) { order[at] = i; flip[at++] = 0; }
      }
    }
  }
  return { order, flip, ...measurePlan(sh, order, flip) };
}

// Every pass starts with the pen at the corner of the sheet. A hop to the next stroke that
// is shorter than the pen is told to stay down over is ink, not travel.
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
    const kept = !fresh && hop <= reach && sh.lay[i] !== L_GUIDES;
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
      if (Math.hypot(x - lx, y - ly) <= reach && shapes.lay[i] !== L_GUIDES) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      for (let m = 1; m < b - a; m++) { k += step; ctx.lineTo(pts[k * 2], pts[k * 2 + 1]); }
      lx = pts[k * 2]; ly = pts[k * 2 + 1];
      if (++held >= 4000) { ctx.stroke(); ctx.beginPath(); held = 0; lx = ly = NaN; }
    }
    ctx.stroke();
  }
  ctx.restore();
}

// The margin, the middle the fronts set off from, the places the transformations use and
// where the cut guides stand. Never plotted.
function drawGuides(ctx) {
  if (!area) return;
  const s = settings, dark = luma(s.paperColor) < 0.25;
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = dark ? 'rgba(110, 200, 255, 0.85)' : 'rgba(26, 109, 209, 0.8)';
  ctx.lineWidth = 0.3;
  ctx.setLineDash([1.5, 1.5]);
  ctx.strokeRect(area.x0, area.y0, area.w, area.h);
  ctx.setLineDash([]);
  const cross = (x, y, r) => {
    ctx.beginPath();
    ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
    ctx.stroke();
  };
  if (s.mode === 'fronts' && ['middle line', 'point'].includes(s.origin)) {
    const [x, y] = placeAt(s.centreX, s.centreY);
    cross(x, y, 5);
  }
  for (let n = 1; n <= FX_SLOTS; n++) {
    const sp = fxSpec(s[`fx${n}`]);
    if (!sp.at) continue;
    const [x, y] = placeAt(s[`fx${n}X`], s[`fx${n}Y`]);
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.font = '4px sans-serif';
    ctx.fillText(String(n), x + 3.5, y - 3.5);
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
// alt-drag moves the middle the wave sets off from. While a drag lasts everything is found
// on coarser grids, to keep up with the hand. A photograph dropped on the page is loaded.

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

function attachDrop() {
  window.addEventListener('dragover', e => { e.preventDefault(); });
  window.addEventListener('drop', e => {
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && /^image\//.test(f.type)) loadPhotoFile(f);
  });
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
        (t.tagName === 'INPUT' && !['checkbox', 'button', 'color', 'range', 'file'].includes(t.type)))) return;
    if (e.metaKey || e.ctrlKey || e.altKey || drag) return;
    const s = settings;
    const cycle = (key, list, dir) => {
      s[key] = list[(list.indexOf(s[key]) + dir + list.length) % list.length];
      if (key === 'fx1') { fxDefaults(1); dressFxSlot(1); }
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
      case 'm': cycle('mode', MODES, 1); break;
      case 'M': cycle('mode', MODES, -1); break;
      case 'o': cycle('origin', ORIGINS, 1); break;
      case 'O': cycle('origin', ORIGINS, -1); break;
      case 'f': cycle('source', SOURCES, 1); break;
      case 'F': cycle('source', SOURCES, -1); break;
      case 't': cycle('fx1', FX_NAMES, 1); break;
      case 'T': cycle('fx1', FX_NAMES, -1); break;
      case 'e': cycle('streaks', STREAKS, 1); break;
      case 'E': cycle('streaks', STREAKS, -1); break;
      case 'p': case 'P': if (photoInput) photoInput.elt.click(); break;
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
let photoInput = null;
const sliderParts = {};
const fxNotes = {};

// A transformation's numbers put to where it starts from.
function fxDefaults(n) {
  const sp = fxSpec(settings[`fx${n}`]), s = settings;
  s[`fx${n}Amt`] = sp.amt ? sp.amt[4] : 0;
  s[`fx${n}Size`] = sp.size ? sp.size[4] : 100;
  s[`fx${n}Angle`] = sp.angle ? sp.angle[1] : 0;
  s[`fx${n}X`] = sp.at ? sp.at[1] : 0;
  s[`fx${n}Y`] = sp.at ? sp.at[2] : 0;
}

// A slot's sliders named, ranged and shown for the transformation in it.
function dressFxSlot(n) {
  const sp = fxSpec(settings[`fx${n}`]);
  const dress = (suffix, label, lo, hi, st) => {
    const P = sliderParts[`fx${n}${suffix}`];
    if (!P || !label) return;
    P.label.html(label);
    P.sl.elt.min = lo; P.sl.elt.max = hi; P.sl.elt.step = st;
    P.sl.value(settings[`fx${n}${suffix}`]);
  };
  if (sp.amt) dress('Amt', ...sp.amt.slice(0, 4));
  if (sp.size) dress('Size', ...sp.size.slice(0, 4));
  if (sp.angle) dress('Angle', sp.angle[0], -180, 180, 0.5);
  if (sp.at) {
    dress('X', `${sp.at[0]}, across (%)`, -150, 150, 1);
    dress('Y', `${sp.at[0]}, down (%)`, -150, 150, 1);
  }
  if (fxNotes[n]) fxNotes[n].html(sp.note || '');
}

function syncVisibility() {
  const s = settings;
  const show = (keys, on) => { for (const k of keys) setVisible(k, on); };
  setVisible('orientation', s.paper !== 'custom');
  show(['customW', 'customH'], s.paper === 'custom');
  show(['cropMarkAt', 'cropMarkGap'], s.cropMarks);
  setVisible('borderPen', s.border !== 'none');

  const src = s.source;
  show(['photoFit', 'photoLoad'], src === 'photo');
  show(['figArms', 'figLean'], src === 'figure');
  show(['lightFrom', 'lightHigh'], ['figure', 'drapery', 'spheres'].includes(src));
  setVisible('groundTone', src === 'figure' || src === 'spheres');
  show(['folds', 'foldSize'], src === 'drapery');
  show(['spheres', 'sphereSize'], src === 'spheres');
  show(['noiseScale', 'noiseOctaves'], src === 'noise');
  show(['word', 'wordSize', 'wordFace'], src === 'word');
  setVisible('rimWidth', s.rims !== 0);

  const fig = s.subject !== 'everything';
  setVisible('subjectLevel', s.subject === 'darker than' || s.subject === 'lighter than');
  setVisible('subjectTol', s.subject === 'its shape' && src === 'photo');
  show(['subjectGrow', 'subjectSoft', 'backdrop', 'outline'], fig);
  setVisible('outlinePen', fig && s.outline);

  for (let n = 1; n <= FX_SLOTS; n++) {
    const sp = fxSpec(s[`fx${n}`]);
    setVisible(`fx${n}Amt`, !!sp.amt);
    setVisible(`fx${n}Size`, !!sp.size);
    setVisible(`fx${n}Angle`, !!sp.angle);
    setVisible(`fx${n}X`, !!sp.at);
    setVisible(`fx${n}Y`, !!sp.at);
  }

  const m = s.mode, wave = m === 'fronts' || m === 'curtain', rows = m === 'ridges' || m === 'squiggle';
  setVisible('origin', m === 'fronts');
  setVisible('angle', m !== 'contours' && !(m === 'fronts' && !['edge', 'both edges', 'middle line'].includes(s.origin)));
  show(['centreX', 'centreY'], m === 'fronts' && ['middle line', 'point', 'outline', 'highlights'].includes(s.origin));
  setVisible('points', m === 'fronts' && s.origin === 'points');
  setVisible('fromLevel', m === 'fronts' && s.origin === 'highlights');
  setVisible('pitchLight', m !== 'contours');
  setVisible('pitchDark', wave);
  setVisible('curve', m !== 'contours');
  setVisible('amp', rows);
  setVisible('wiggle', m === 'squiggle');
  setVisible('hidden', m === 'ridges');
  setVisible('levels', m === 'contours');
  if (sliderParts.pitchLight) {
    sliderParts.pitchLight.label.html(wave ? 'Pitch in the light (mm)' : 'Pitch (mm)');
    sliderParts.amp.label.html(m === 'squiggle' ? 'Swing (mm)' : 'Lift (mm)');
  }

  const sp = s.split;
  show(['splitPen'], sp !== 'none');
  show(['splitFrom'], sp === 'tone band' || sp === 'photo reds');
  setVisible('splitTo', sp === 'tone band');
  setVisible('splitEvery', sp === 'every n-th line');
  setVisible('splitShare', sp === 'blots');
  show(['splitAngle', 'splitX', 'splitY'], sp === 'one side');
  if (sliderParts.splitFrom) sliderParts.splitFrom.label.html(sp === 'photo reds' ? 'Red at least (%)' : 'From (% tone)');

  const st = s.streaks !== 'none';
  show(['streakPen', 'streakAngle', 'streakLight', 'streakSide', 'streakLen', 'streakBreak'], st);
  setVisible('streakDark', st && s.streaks !== 'even');
  show(['streakShift'], st && s.streaks === 'shadow');
  setVisible('streakBands', st && s.streaks === 'shadow');
  setVisible('streakBandSize', st && (s.streaks === 'shadow' || s.streaks === 'bands'));
  show(['streakGap', 'streakOver'], st && fig);

  const mk = s.marker !== 'none';
  show(['markerPen', 'markerAngle', 'fillPass'], mk);
  setVisible('markerLevel', ['shadow band', 'dark tones', 'light tones'].includes(s.marker));
  setVisible('markerGap', mk && fig);
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
  createDiv('Where the shards, strips, drips and blots fall, the points the wave sets off ' +
    'from, the folds and the balls, the streaks\' bands and breaks. <b>R</b> rolls a new one, ' +
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

function addTextField(parent, labelText, key, hint, onInput) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const inp = createInput(String(settings[key])).parent(field);
  inp.attribute('type', 'text');
  inp.attribute('spellcheck', 'false');
  inp.style('width', '100%');
  inp.style('box-sizing', 'border-box');
  if (hint) createDiv(hint).parent(field).class('note');
  setters[key] = v => { if (inp.value() !== v) inp.value(v); };
  inp.input(() => onInput(inp.value()));
  return { field, inp };
}

// A photograph loaded from disk — by the button, by P, or dropped on the page.
function addPhotoField(parent, top) {
  const pf = createDiv('').parent(parent).class('field');
  if (!top) fieldDivs.photoLoad = pf;
  createSpan(top ? 'Your photo' : 'Photo').parent(pf).class('label');
  const fileIn = createFileInput(() => {}).parent(pf);
  fileIn.elt.accept = 'image/*';
  fileIn.elt.onchange = ev => loadPhotoFile(ev.target.files && ev.target.files[0]);
  if (top) photoInput = fileIn;
  const note = createDiv('').parent(pf).class('note');
  if (top) photoNoteTop = note; else photoNote = note;
  updatePhotoNotes();
}

function updatePhotoNotes() {
  const html = PHOTO
    ? `<b>${PHOTO.name.replace(/[<>&]/g, '')}</b> — ${PHOTO.img.width} × ${PHOTO.img.height}. Not part of the link: load it again to rebuild the sheet.`
    : 'Load one — or drop it on the sheet, or press <b>P</b> — and it is drawn as the scene asks. ' +
      'Not part of the link.';
  if (photoNoteTop) photoNoteTop.html(html);
  if (photoNote) photoNote.html(html);
}

function addFxSlot(parent, n) {
  addSub(parent, `Transformation ${n}`);
  addSelect(parent, 'Kind', `fx${n}`, FX_NAMES, () => {
    fxDefaults(n);
    dressFxSlot(n);
    for (const k of ['Amt', 'Size', 'Angle', 'X', 'Y']) setters[`fx${n}${k}`](settings[`fx${n}${k}`]);
    syncVisibility();
    update();
  });
  fxNotes[n] = addNote(parent, '');
  addSlider(parent, 'Amount', `fx${n}Amt`, -100, 100, 1);
  addSlider(parent, 'Size (mm)', `fx${n}Size`, 1, 1000, 1);
  addSlider(parent, 'Angle (°)', `fx${n}Angle`, -180, 180, 0.5);
  addSlider(parent, 'Across (%)', `fx${n}X`, -150, 150, 1);
  addSlider(parent, 'Down (%)', `fx${n}Y`, -150, 150, 1);
  dressFxSlot(n);
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
  addNote(sec, '<b>S</b> steps through the scenes. Until you load a photograph they draw a lay ' +
    'figure, a cloth, balls or a word; with one loaded, every scene of the figure draws your ' +
    'photo, and the ones that start "Your photo" are made for it.');
  addPhotoField(sec, true);
  addSeedField(sec);

  sec = addSection(root, 'The picture');
  addSelect(sec, 'Made of', 'source', SOURCES, resync,
    '<b>photo</b> — yours; <b>figure</b> — a lay figure of tubes and balls, lit from one side; ' +
    '<b>drapery</b> — a hanging cloth; <b>spheres</b>; <b>noise</b>; <b>word</b>. <b>F</b> steps.');
  addPhotoField(sec, false);
  addSelect(sec, 'Laid', 'photoFit', FITS, update,
    '<b>cover</b> — cut to fill the picture; <b>contain</b> — whole, with paper round it.');
  addSlider(sec, 'Arms raised (%)', 'figArms', 0, 100, 1, '0 — down by its sides, 100 — over its head.');
  addSlider(sec, 'Leaning (°)', 'figLean', -40, 40, 0.5);
  addSlider(sec, 'Light from (°)', 'lightFrom', -180, 180, 1,
    'The way the light comes from: 180 the left, −90 above, 0 the right.');
  addSlider(sec, 'Light above the paper (°)', 'lightHigh', 2, 88, 1, 'Low light, long dark sides.');
  addSlider(sec, 'Ground (% tone)', 'groundTone', 0, 100, 1, 'The tone round the figure or the balls.');
  addSlider(sec, 'Folds', 'folds', 1, 30, 1);
  addSlider(sec, 'Fold size (mm)', 'foldSize', 5, 400, 1);
  addSlider(sec, 'Balls', 'spheres', 1, 40, 1);
  addSlider(sec, 'Ball size (%)', 'sphereSize', 3, 150, 1);
  addSlider(sec, 'Lump size (%)', 'noiseScale', 4, 300, 1);
  addSlider(sec, 'Octaves', 'noiseOctaves', 1, 6, 1);
  addTextField(sec, 'Word', 'word', 'A bar | starts a new line.', v => { settings.word = v; update(); });
  addSlider(sec, 'Size (% of what fits)', 'wordSize', 5, 300, 1);
  addSelect(sec, 'Face', 'wordFace', FACES);
  addSub(sec, 'Where it lies');
  addSlider(sec, 'Slid across (mm)', 'fieldX', -1000, 1000, 0.5,
    'A drag on the sheet slides the picture, the wheel enlarges it about the cursor, <b>0</b> puts it back.');
  addSlider(sec, 'Slid down (mm)', 'fieldY', -1000, 1000, 0.5);
  addSlider(sec, 'Enlarged (%)', 'fieldZoom', MIN_ZOOM, MAX_ZOOM, 1);
  addSlider(sec, 'Turned (°)', 'fieldTurn', -180, 180, 0.5);
  createButton('Put the picture back').parent(sec).mousePressed(resetView);

  sec = addSection(root, 'Tones');
  addCheckbox(sec, 'Inside out — dark where it was light', 'invert');
  addSlider(sec, 'Spread evenly (%)', 'equalize', 0, 100, 1,
    'Every tone given as much of the picture as every other — a flat photograph opens up.');
  addSlider(sec, 'Level (%)', 'level', -100, 100, 1);
  addSlider(sec, 'Contrast (%)', 'contrast', -100, 400, 1);
  addSlider(sec, 'Gamma (%)', 'gamma', 20, 500, 1, 'Over 100 lightens the middle tones.');
  addSlider(sec, 'Soften (mm)', 'soften', 0, 30, 0.1, 'The whole picture blurred: the lines grow calmer.');
  addSlider(sec, 'Rims (%)', 'rims', -300, 300, 5,
    'Every edge overdone — darker on its dark side, lighter on its light one.');
  addSlider(sec, 'Rims reach (mm)', 'rimWidth', 1, 60, 0.5);
  addSlider(sec, 'Bands', 'bands', 0, 12, 1, 'The tones cut into steps. 0 or 1 — none.');

  sec = addSection(root, 'The figure');
  addSelect(sec, 'The figure is', 'subject', SUBJECTS, resync,
    '<b>everything</b> — no figure, no ground; <b>its shape</b> — the figure, the balls or the ' +
    'letters, and of a photograph whatever is unlike its border; <b>darker than</b> or ' +
    '<b>lighter than</b> a tone.');
  addSlider(sec, 'Tone (%)', 'subjectLevel', 0, 100, 1);
  addSlider(sec, 'Unlike the border by (%)', 'subjectTol', 1, 80, 1,
    'The ground is flooded in from the photograph\'s border over every tone this close to the ' +
    'border\'s. Raise it if the ground leaks into the figure as figure; lower it if the figure is eaten.');
  addSlider(sec, 'Grown (mm)', 'subjectGrow', -30, 30, 0.5);
  addSlider(sec, 'Soft edge (mm)', 'subjectSoft', 0, 10, 0.1);
  addSelect(sec, 'Its ground', 'backdrop', BACKDROPS, resync,
    '<b>cut away</b> — the lines stop at the figure\'s edge; <b>kept</b> — drawn as it is; ' +
    '<b>blank</b> — drawn as bare paper, the lines crossing it at the pitch of the light.');
  addCheckbox(sec, 'Outline the figure', 'outline', resync);
  addPenSelect(sec, 'Outline drawn with', 'outlinePen');

  sec = addSection(root, 'Transformations');
  addNote(sec, 'Up to three, one after another, all before a line is drawn — the figure\'s ' +
    'edge goes with the picture. <b>T</b> steps through the first. Angles run clockwise from ' +
    'pointing right: 90 is down. <b>G</b> shows where their middles are.');
  for (let n = 1; n <= FX_SLOTS; n++) addFxSlot(sec, n);

  sec = addSection(root, 'Lines');
  addSelect(sec, 'Drawn as', 'mode', MODES, resync,
    '<b>fronts</b> — of a wave slowed by the dark: they crowd into the shadows and wrap the ' +
    'forms; <b>curtain</b> — added up down the columns, so a dark place drags the lines below ' +
    'it down; <b>ridges</b> — rows lifted by the dark, hiding each other; <b>squiggle</b> — ' +
    'rows swinging wider and quicker in the dark; <b>contours</b> — of the tones. <b>M</b> steps.');
  addSelect(sec, 'The wave sets off from', 'origin', ORIGINS, resync,
    '<b>edge</b> — the one the angle points away from; <b>both edges</b>, meeting; a ' +
    '<b>middle line</b>; a <b>point</b> — rings; <b>points</b> strewn by the seed; the figure\'s ' +
    '<b>outline</b> — inside and out; its <b>highlights</b>. <b>O</b> steps.');
  addSlider(sec, 'Angle (°)', 'angle', -180, 180, 0.5,
    '0 — level, 90 — upright. <b>Shift</b>-drag on the sheet turns them.');
  addSlider(sec, 'Middle, across (%)', 'centreX', -150, 150, 1, '<b>Alt</b>-drag on the sheet moves it.');
  addSlider(sec, 'Middle, down (%)', 'centreY', -150, 150, 1);
  addSlider(sec, 'Points', 'points', 1, 40, 1);
  addSlider(sec, 'Highlights up to (% tone)', 'fromLevel', 0, 60, 1);
  addSlider(sec, 'Pitch in the light (mm)', 'pitchLight', 0.2, 30, 0.05,
    'From one line to the next where the picture is paper.');
  addSlider(sec, 'Pitch in the dark (mm)', 'pitchDark', 0.1, 30, 0.01,
    'Where it is ink. At the nib or under it the darkest places close up solid.');
  addSlider(sec, 'Curve (%)', 'curve', 20, 400, 1, 'Over 100 the lines stay apart longer and crowd late.');
  addSlider(sec, 'Lift (mm)', 'amp', -60, 60, 0.1);
  addSlider(sec, 'Wiggle in the dark (mm)', 'wiggle', 0.2, 20, 0.05);
  addCheckbox(sec, 'Ridges hide the ones behind them', 'hidden');
  addSlider(sec, 'Levels', 'levels', 1, 120, 1);
  addSlider(sec, 'Slid along (% of a line)', 'phase', 0, 100, 1);
  addSlider(sec, 'Grid (mm)', 'detail', 0.2, 3, 0.05,
    'What the lines are found on. Finer follows the picture closer and takes longer.');
  addSlider(sec, 'Pen up below (% tone)', 'liftBelow', 0, 100, 1,
    'Above 0 the lines stop where the picture is lighter, and the paper is left bare.');
  addSlider(sec, 'Shortest stroke (mm)', 'minPiece', 0, 20, 0.1);
  addSlider(sec, 'Pen kept down over (% of the nib)', 'penDown', 0, 300, 5,
    'A hop shorter than this to the next stroke is drawn instead of lifted over.');
  addPenSelect(sec, 'Drawn with', 'linePen');

  sec = addSection(root, 'Second colour');
  addSelect(sec, 'Among the lines', 'split', SPLITS, resync,
    'Where the lines go on in another pen: a <b>tone band</b>; <b>every n-th line</b>; ' +
    '<b>blots</b> of the sheet; <b>one side</b> of a line; the <b>background</b> if it is drawn; ' +
    'the <b>photo reds</b>; where the transformations <b>smeared</b> the picture.');
  addPenSelect(sec, 'Drawn with', 'splitPen');
  addSlider(sec, 'From (% tone)', 'splitFrom', 0, 100, 1);
  addSlider(sec, 'To (% tone)', 'splitTo', 0, 100, 1);
  addSlider(sec, 'Every', 'splitEvery', 2, 40, 1);
  addSlider(sec, 'Share (%)', 'splitShare', 0, 100, 1);
  addSlider(sec, 'The line (°)', 'splitAngle', -180, 180, 0.5);
  addSlider(sec, 'It passes, across (%)', 'splitX', -150, 150, 1);
  addSlider(sec, 'It passes, down (%)', 'splitY', -150, 150, 1);

  sec = addSection(root, 'Streaks');
  addSelect(sec, 'Raked behind', 'streaks', STREAKS, resync,
    'Straight lines across the sheet in another pen: packed in the figure\'s <b>shadow</b> — the ' +
    'figure seen along them — and in bands; in <b>bands</b> only; or <b>even</b>. <b>E</b> steps.');
  addPenSelect(sec, 'Drawn with', 'streakPen');
  addSlider(sec, 'Angle (°)', 'streakAngle', -180, 180, 0.5, '−60 rises to the right.');
  addSlider(sec, 'Apart where sparse (mm)', 'streakLight', 0.3, 60, 0.1);
  addSlider(sec, 'Apart where packed (mm)', 'streakDark', 0.1, 30, 0.05);
  addSlider(sec, 'Shadow slid across (mm)', 'streakShift', -300, 300, 0.5,
    'The packed band beside the figure instead of behind it.');
  addSlider(sec, 'Bands (%)', 'streakBands', 0, 100, 1);
  addSlider(sec, 'Band size (mm)', 'streakBandSize', 2, 300, 1);
  addSelect(sec, 'Beside the figure', 'streakSide', SIDES, update,
    '<b>both</b> sides of it; only <b>after</b> it, the way the angle points; only <b>before</b>.');
  addSlider(sec, 'Kept from the figure (mm)', 'streakGap', 0, 20, 0.1);
  addCheckbox(sec, 'Over the figure too', 'streakOver');
  addSlider(sec, 'Length (mm)', 'streakLen', 0, 800, 1, '0 — to the edge of the picture.');
  addSlider(sec, 'Broken (%)', 'streakBreak', 0, 100, 1, 'Ends worn away, and gaps.');

  sec = addSection(root, 'Marker');
  addSelect(sec, 'Filled solid', 'marker', MARKERS, resync,
    'A broad pen filling the figure\'s <b>shadow band</b>, the <b>dark tones</b> or the <b>light ' +
    'tones</b> of the figure, the <b>background</b> or the <b>subject</b>: its outline half a nib ' +
    'in, passes inside it, a touch where it is narrower than the nib.');
  addPenSelect(sec, 'Drawn with', 'markerPen');
  addSlider(sec, 'Level (%)', 'markerLevel', 0, 100, 1);
  addSlider(sec, 'Passes run (°)', 'markerAngle', -180, 180, 0.5);
  addSlider(sec, 'Kept from the figure (mm)', 'markerGap', 0, 20, 0.1);
  addSlider(sec, 'Passes apart (% of the nib)', 'fillPass', 30, 200, 1, '85 closes the paper.');

  sec = addSection(root, 'Pens');
  addNote(sec, 'Five pens of the drawer; every layer picks one by number. Changing the kind ' +
    'sets its colour and a usual width.');
  addCheckbox(sec, 'Markers go down first', 'markersFirst');
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
    'the blade through two dots and cut. They go with the first pen of the plot. <b>X</b> switches them.');

  sec = addSection(root, 'Output');
  addCheckbox(sec, 'Order the strokes for the plotter', 'optimiseOrder');
  addCheckbox(sec, 'Follow the sliders live', 'liveUpdate', () => syncUrl());
  addCheckbox(sec, 'Show the margin, the middles and the cut guides', 'showGuides', () => { drawPreview(); syncUrl(); });
  createButton('Download SVG [everything]').parent(sec).class('primary')
    .mousePressed(() => exportSvg({ all: true }));
  createButton('Download SVG [one per pen]').parent(sec).mousePressed(() => exportSvg({ perPen: true }));
  const lb = createDiv('').parent(sec).class('layer-buttons');
  LAYERS.forEach((ly, li) => {
    layerButtons[li] = createButton('').parent(lb).mousePressed(() => exportSvg({ layer: li }));
  });
  addNote(sec, 'Everything is one file, a group per pen; a layer\'s file is that layer alone. ' +
    'The cut guides go with the first pen of the plot, so they are plotted once. Every file is ' +
    'the whole sheet in millimetres.');
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
    '<div><kbd>S</kbd> scene · <kbd>F</kbd> picture · <kbd>T</kbd> transformation · <kbd>M</kbd> lines · <kbd>O</kbd> origin · <kbd>E</kbd> streaks</div>' +
    '<div><kbd>P</kbd> load a photo · <kbd>X</kbd> cut guides · <kbd>G</kbd> guides · <kbd>R</kbd> new seed · <kbd>[</kbd> <kbd>]</kbd> step it</div>');
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
    updatePhotoNotes();
    syncVisibility();
    update();
  };
  img.onerror = () => alert('That file could not be read as a picture.');
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
      'Lower <b>Pen up below</b>, or keep the figure\'s ground.</div>');
    refreshPenList();
    return;
  }
  const seconds = plan.downs * PEN_CYCLE_S + plan.ink / DRAW_SPEED + plan.travel / TRAVEL_SPEED;
  const nib = penW(penIdx(s.linePen));
  const fxs = [];
  for (let n = 1; n <= FX_SLOTS; n++) if (s[`fx${n}`] !== 'none') fxs.push(s[`fx${n}`]);
  const what = s.mode === 'fronts' ? `fronts from ${s.origin === 'edge' ? 'an edge' : s.origin === 'point' ? 'a point' : 'the ' + s.origin}`
    : s.mode;
  let html =
    `<div class="big"><b>${groupNum(strokes)}</b> strokes, ` +
    `<b>${(plan.ink / 1000).toFixed(1)}</b> m of line</div>` +
    `<div>${groupNum(COUNTS.levels)} ${s.mode === 'contours' ? 'levels' : s.mode === 'fronts' || s.mode === 'curtain' ? 'fronts' : 'rows'}, ` +
    `${groupNum(COUNTS.lines)} lines drawn — ${what}` +
    `${COUNTS.streaks ? ` · ${groupNum(COUNTS.streaks)} streaks` : ''}` +
    `${COUNTS.dots ? ` · ${COUNTS.dots} marker touches` : ''}</div>` +
    `<div>${sourceName()}${fxs.length ? ' → ' + fxs.join(' → ') : ''} · ` +
    `${FIELD ? Math.round(FIELD.mean * 100) : 0} % dark on the whole` +
    `${s.subject !== 'everything' && FIELD ? `, the figure ${Math.round(FIELD.figure * 100)} % of it` : ''}</div>` +
    `<div>The pen goes down <b>${groupNum(plan.downs)}</b> times, ` +
    `${(plan.travel / 1000).toFixed(1)} m in the air</div>` +
    `<div>Roughly <b>${formatDuration(seconds)}</b> to plot · ${lastMs.toFixed(0)} ms to build` +
    ` (the picture ${fieldMs.toFixed(0)}, the lines ${linesMs.toFixed(0)})</div>`;
  if (s.cropMarks && perLayer && perLayer[L_GUIDES].strokes) {
    const g = [...perLayer[L_GUIDES].pens][0];
    html += `<div>${perLayer[L_GUIDES].strokes} cut guide dots round the ${s.cropMarkAt}, ` +
      `in pen ${g + 1} (${penKind(g)})</div>`;
  }
  if (s.source === 'photo' && !PHOTO) {
    html += '<div class="warn">No photo loaded — load one at the top or drop it on the sheet. ' +
      'Until then: a ball of shade.</div>';
  }
  if ((s.mode === 'fronts' || s.mode === 'curtain') && s.pitchDark < nib) {
    html += `<div>The darkest lines are ${s.pitchDark} mm apart and the pen is ${nib} mm wide — ` +
      'the deepest shadows close up solid.</div>';
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
  return s.source === 'photo' && PHOTO ? 'photo ' + PHOTO.name.replace(/[<>&]/g, '')
       : s.source === 'word' ? `word "${s.word}"` : s.source;
}

function metaComment() {
  const s = settings;
  const pens = [], fxs = [];
  for (let i = 0; i < SLOTS; i++) if (perPen && perPen[i].strokes) pens.push(penLabel(i));
  for (let n = 1; n <= FX_SLOTS; n++) if (s[`fx${n}`] !== 'none') fxs.push(s[`fx${n}`]);
  return `line currents — ${s.mode}${s.mode === 'fronts' ? '/' + s.origin : ''} angle=${s.angle} ` +
    `pitch=${s.pitchLight}/${s.pitchDark}mm ${sourceName()} fx=[${fxs.join(', ')}] ` +
    `streaks=${s.streaks} second=${s.split} marker=${s.marker} ` +
    `${s.cropMarks ? `cutguides=${s.cropMarkAt}<=${s.cropMarkGap}mm ` : ''}seed=${s.seed} ` +
    `pens=[${pens.join('; ')}] strokes=${strokes}`;
}

function fileStem() {
  const s = settings;
  const paper = s.paper === 'custom' ? `${s.customW}x${s.customH}mm` : `${s.paper}-${s.orientation}`;
  return `line currents ${s.mode} ${s.source} seed${s.seed} ${paper}`;
}

////////////////////////////////////////////////////////////////////////////////////////
// Controls, shared
//
// A section folds away under its heading; which ones are folded is remembered by the
// browser, not by the link.

function foldedSet() {
  try { return new Set(JSON.parse(localStorage.getItem('p5js22-folded') || '[]')); }
  catch (e) { return new Set(); }
}

function saveFolded(set) {
  try { localStorage.setItem('p5js22-folded', JSON.stringify([...set])); } catch (e) { /* no storage */ }
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
// guides and the output switches stay as they are. A transformation a scene names without
// its numbers starts from its own. With a photograph loaded, every scene of the lay figure
// draws the photograph instead.
const SCENE_KEEPS = ['cropMarks', 'cropMarkAt', 'cropMarkGap', 'optimiseOrder', 'liveUpdate',
  'showGuides', 'pngDpi'];

function applyScene(sc) {
  const kept = {}, got = sc.s || {};
  for (const k of SCENE_KEEPS) kept[k] = settings[k];
  if (PHOTO && !got.source) kept.source = 'photo';
  Object.assign(settings, DEFAULTS);
  for (let n = 1; n <= FX_SLOTS; n++) {
    if (!got[`fx${n}`]) continue;
    settings[`fx${n}`] = got[`fx${n}`];
    fxDefaults(n);
  }
  Object.assign(settings, got, kept);
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
  const label = createSpan(labelText).parent(field).class('label');
  const row = createDiv('').parent(field).class('row');
  const sl  = createSlider(min, max, settings[key], step).parent(row);
  const num = createInput(String(settings[key])).parent(row);
  num.attribute('type', 'text');
  num.attribute('inputmode', 'decimal');
  if (hint) createDiv(hint).parent(field).class('note');
  const done = onChange || update;
  setters[key] = v => { sl.value(v); num.value(String(v)); };
  sliderParts[key] = { label, sl, num };
  sl.input(() => {
    settings[key] = Number(sl.value());
    num.value(String(settings[key]));
    if (settings.liveUpdate && !onChange) liveUpdate();
  });
  sl.changed(() => done());
  num.input(() => {
    const v = parseNum(num.value());
    if (v === null) return;
    settings[key] = clamp(v, Number(sl.elt.min), Number(sl.elt.max));
    sl.value(settings[key]);
    done();
  });
  return sl;
}

function addSelect(parent, labelText, key, options, onChange, hint) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  if (labelText) createSpan(labelText).parent(field).class('label');
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
    const join = d && shapes.lay[i] !== L_GUIDES && Math.hypot(px - ex, py - ey) <= reach;
    d += (join ? 'L' : 'M') + `${f(px)},${f(py)}`;
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
