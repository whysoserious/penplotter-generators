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
// picture, the dots to cut it out by and the edge of the cloth the picture is printed on.
const LAYERS = [
  { id: 'lines',  label: 'lines',      pen: 'linePen' },
  { id: 'echo',   label: 'echo',       pen: 'echoPen' },
  { id: 'border', label: 'border',     pen: 'borderPen' },
  { id: 'guides', label: 'cut guides', pen: 'linePen' },
  { id: 'cloth-edge', label: 'cloth edge', pen: 'edgePen' },
];
const L_LINES = 0, L_ECHO = 1, L_BORDER = 2, L_GUIDES = 3, L_EDGE = 4;

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
const MIN_VIEW       = 5;          // % — how far the drawing itself can be zoomed out
const MAX_VIEW       = 5000;       //   and in
const VIEW_SHIFT     = 20000;      // mm — how far the zoomed drawing can be moved

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
  cropMarks: true,         // cut guides — dots to lay the guillotine's blade through
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
  hairMin: 0.3,         // mm — a hair of paper thinner than this on the sheet is closed
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

  // the cloth — the picture printed on a sheet that folds, crumples, hangs and blows
  cloth: false,
  folds: 0,             // ° — the steepest a fold's side gets; past 90 the folds lap over
  foldLen: 45,          // mm from one fold to the next
  foldAngle: 0,         // ° — 0: the folds run upright
  foldSharp: 0,         // % — 0 soft waves, 100 pleats with flat sides
  foldUneven: 40,       // %
  foldWander: 25,       // % — drifting along their length
  foldTaper: 0,         // % — dying out towards one end (below 0 the other)
  foldLean: 0,          // % — one side of every fold steeper
  crossFolds: 0,        // ° — a second set
  crossLen: 80,         // mm
  crossAngle: 90,       // °
  crossSharp: 0,        // %
  crumple: 0,           // mm deep
  crumpleKind: 'facets',
  crumpleSize: 40,      // mm — a facet
  crumpleDetail: 2,     // octaves of finer crumpling
  creases: 0,           // creases pressed in and opened out again
  creaseKind: 'random',
  creaseDepth: 14,      // ° the cloth is still bent at each
  bow: 0,               // ° — each side of the sheet bowed by
  bowAngle: 0,          // ° — 0: bowed across, its sides rising
  curl: 0,              // ° — an edge rolled up by; below 0 rolled under
  curlAngle: 180,       // ° — which edge: 0 the top, 90 the right, 180 the bottom
  curlSize: 30,         // % of the sheet rolled
  twist: 0,             // ° end to end
  twistAngle: 0,        // ° — the axis it is twisted about; 0 across
  gravity: 'none',      // which way it falls
  weight: 60,           // %
  hangFrom: 'nothing',
  gather: 0,            // % — what it hangs from drawn together
  squeeze: 0,           // % — pushed together from two sides, or all round
  squeezeFrom: 'the sides',
  under: 'nothing',     // what it lies over, falling into the sheet
  propSize: 40,         // % of half the picture's short side
  propX: 0,             // % of half the picture, from its middle
  propY: 0,
  table: true,          // a table under it, falling into the sheet
  tableDrop: 60,        // mm below the cloth, with nothing else under it
  wind: 0,              // %
  windAngle: 0,         // ° over the sheet — 0 to the right, 90 down
  windLift: 40,         // % — and out of the sheet, toward the viewer
  gusts: 50,            // %
  stiffness: 25,        // % — how much of its shape it keeps while it hangs
  simTime: 160,         // steps it is let hang for
  simRes: 56,           // points of the hanging grid along the long side
  viewTilt: 0,          // ° — tilted back, seen from below its bottom edge
  viewTurn: 0,          // ° — turned on the sheet
  viewSide: 0,          // ° — seen from the side
  perspective: 0,       // %
  clothFit: true,       // the cloth as seen fitted to the picture
  clothZoom: 100,       // % — the whole drawing zoomed, flat or on cloth
  clothX: 0,            // mm — and moved, so any part of it can fill the sheet
  clothY: 0,
  shade: 70,            // % — the tone darker where the cloth turns from the light
  lightFrom: -45,       // ° — 0 from the top of the sheet, 90 from the right
  lightHigh: 40,        // ° above the cloth
  hollows: 0,           // % — darker in the hollows
  hidden: true,         // lines behind the folds left out
  clothBack: 'printed through',
  backPen: 2,
  clothEdge: 'none',
  edgePen: 1,
  clothHand: '',        // what was shaped by hand on the sheet
  handScale: 100,       // % — how deep all of that is

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
  { label: 'Cloth — a curtain gathered on its rod', s: {
      cloth: true, gravity: 'down the sheet', hangFrom: 'the top edge', gather: 45, stiffness: 15,
      simTime: 200, echo: 'none', shade: 90, hollows: 60, clothEdge: 'hem', pitch: 3 } },
  { label: 'Cloth — a flag in the wind, in red stripes', s: {
      cloth: true, gravity: 'down the sheet', hangFrom: 'the left edge', weight: 40, wind: 120,
      windLift: 30, gusts: 80, simTime: 140, stiffness: 20, shade: 90, angle: 90,
      echo: 'every n-th line', echoEvery: 2, clothEdge: 'hem' } },
  { label: 'Cloth — washing pegged on a line', s: {
      cloth: true, gravity: 'down the sheet', hangFrom: 'pegs on a line', gather: 10, wind: 50,
      windLift: 15, gusts: 70, simTime: 170, stiffness: 20, shade: 90, hollows: 40, echo: 'none',
      clothEdge: 'hem' } },
  { label: 'Cloth — a tablecloth over a ball', s: {
      cloth: true, gravity: 'into the sheet', under: 'a ball', propSize: 45, simTime: 220,
      stiffness: 20, viewTilt: 40, perspective: 30, shade: 90, hollows: 40,
      clothEdge: 'hem and folds', echo: 'none' } },
  { label: 'Cloth — a sheet thrown over a box', s: {
      cloth: true, gravity: 'into the sheet', under: 'a box', propSize: 55, simTime: 240,
      stiffness: 30, viewTilt: 45, viewTurn: 20, perspective: 35, shade: 100, hollows: 30,
      clothEdge: 'hem and folds', echo: 'none', angle: 90 } },
  { label: 'Cloth — a handkerchief picked up by the middle', s: {
      cloth: true, gravity: 'into the sheet', hangFrom: 'the middle', tableDrop: 160,
      simTime: 300, viewTilt: 30, shade: 100, echo: 'none', clothEdge: 'hem and folds' } },
  { label: 'Cloth — pushed together from the sides', s: {
      cloth: true, squeeze: 35, viewTilt: 45, shade: 100, angle: 90, echo: 'none',
      clothEdge: 'hem and folds' } },
  { label: 'Cloth — drapery lapping over itself', s: {
      cloth: true, folds: 140, foldLen: 60, foldUneven: 50, foldWander: 60, foldTaper: 70,
      shade: 90, hollows: 80, clothEdge: 'hem and folds', echo: 'none', clothFit: true } },
  { label: 'Cloth — accordion pleats, from an angle', s: {
      cloth: true, folds: 65, foldSharp: 90, foldLen: 40, foldUneven: 5, foldWander: 0,
      viewTilt: 30, viewSide: 35, perspective: 30, angle: 90, pitch: 4, shade: 40,
      clothEdge: 'hem and folds', echo: 'none' } },
  { label: 'Cloth — crumpled paper, smoothed out', s: {
      cloth: true, crumple: 10, crumpleSize: 75, crumpleDetail: 2, shade: 160, lightHigh: 30,
      source: 'even', evenTone: 12, pitch: 2.6, echo: 'none', clothEdge: 'hem' } },
  { label: 'Cloth — a letter folded in three', s: {
      cloth: true, creases: 1, creaseKind: 'letter', creaseDepth: 40, viewTilt: 35,
      perspective: 30, shade: 100, echo: 'none', clothEdge: 'hem and folds' } },
  { label: 'Cloth — a scroll rolling up, its back in red', s: {
      cloth: true, curl: 540, curlSize: 45, viewTilt: 45, perspective: 30, angle: 90,
      clothBack: 'other pen', echo: 'none', clothEdge: 'hem' } },
  { label: 'Cloth — a corner turned over', s: {
      cloth: true, curl: 175, curlAngle: 135, curlSize: 30, clothBack: 'bare', shade: 80,
      clothEdge: 'hem and folds', echo: 'none' } },
  { label: 'Cloth — a ribbon twisted, its back in red', s: {
      cloth: true, twist: 150, viewTilt: 25, clothBack: 'other pen', echo: 'none',
      clothEdge: 'hem and folds' } },
  { label: 'Your photo, through upright bars — black runs together', s: {
      source: 'photo', pitch: 2.2, thin: 8, wide: 102, curve: 125, echo: 'none', contrast: 15,
      soften: 0.6, minPiece: 1.2 } },
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
let busy    = false;         // a slider or the wheel in motion: built coarser, to keep up
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
  HAND = parseHand(settings.clothHand);
  updateHandNote();
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
  makeOverlay();
  makeToolbar();
  applyCanvasDisplay();
  buildControls();
  attachPointer();
  attachKeys();
  attachPhotoInput();
  update();
  noLoop();
}

function applyCanvasDisplay() {
  const [pw, ph] = paperDims();
  const box = document.getElementById('canvas-container');
  const bar = TOOLBAR && TOOLBAR.style.display !== 'none' ? TOOLBAR.offsetHeight + 8 : 0;
  const aw = box ? box.clientWidth - 48 : 900;
  const ah = box ? box.clientHeight - 48 - bar : 700;
  const scale = Math.max(0.2, Math.min(aw / pw, ah / ph));
  const c = canvasEl();
  if (!c) return;
  c.style.width  = pw * scale + 'px';
  c.style.height = ph * scale + 'px';
  if (TOOLBAR) TOOLBAR.style.width = pw * scale + 'px';
  drawOverlay();
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
  if (clothPending()) {
    // the picture on the sheet stays as it is until the fine cloth comes from the worker
    syncVisibility();
    updateStats();
    syncUrl();
    return;
  }
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

// The picture for the settings in hand — the fine one is kept on while a drag asks for coarse.
function ensureField(coarse) {
  const key = FIELD_KEYS.map(k => settings[k]).join('|') + `|${photoVer}`;
  if (FIELD && key === fieldKeyNow && (coarse || !FIELD.coarse)) return;
  const t0 = performance.now();
  fieldKeyNow = key;
  FIELD = makeField(coarse);
  FIELD.coarse = coarse;
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
let RH = new Float64Array(4096), RS = new Float64Array(4096), RQ = new Float64Array(4096);
let QX = new Float64Array(4096), QY = new Float64Array(4096), QN = 0;
let MIN_PIECE = 0, PASS_STEP = 0.85, STITCH = 1;

function runPush(x, y, nx, ny, h, sa, q) {
  if (RM >= RX.length) {
    const grow = a => { const b = new Float64Array(a.length * 2); b.set(a); return b; };
    RX = grow(RX); RY = grow(RY); RNX = grow(RNX); RNY = grow(RNY); RH = grow(RH); RS = grow(RS);
    RQ = grow(RQ);
  }
  RX[RM] = x; RY[RM] = y; RNX[RM] = nx; RNY[RM] = ny; RH[RM] = h; RS[RM] = sa; RQ[RM] = q;
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
  // on cloth the lines are laid on the flat cloth, so the nib is as wide as it will be there
  const gK = CLOTH ? CLOTH.g : FLATZ ? FLATZ.g : 1, tone = CF && CF.SH ? clothTone : toneAt;
  const s = settings, nib = penW(L.pen) / gK, A = area;
  const thin = s.thin / 100, wide = s.wide / 100, g = Math.max(0.05, s.curve / 100);
  const lift = clamp(s.liftBelow, 0, 100) / 100;
  const lean = (s.lean + L.lean) / 100, bulge = s.bulge / 100;
  const wAmp = s.waveAmp, wK = 2 * Math.PI / Math.max(1, s.waveLen);
  const wShift = s.waveShift / 100 * 2 * Math.PI;
  const wob = s.wobble, wobK = 1 / Math.max(1, s.wobbleScale);
  const P0 = s.pitch * L.pitchK;
  const reach = Math.abs(wAmp) + 2 * Math.abs(wob) + (Math.abs(lean) + Math.abs(bulge) + 1) * P0 + 1;
  const mask = L.mask, flip = L.flip ? -1 : 1, hair = Math.max(0, s.hairMin) / gK;
  const widthAt = (T, P) => P * ((thin + (wide - thin) * (g === 1 ? T : Math.pow(T, g))) * L.widthK + L.add);
  const wMax = Math.max(thin, wide) * L.widthK + L.add;      // of the pitch
  PEN = L.pen; LAY = L.lay;
  let lines = 0, widest = 0;

  eachLine({ turn: L.turn, shift: L.shift, pitchK: L.pitchK, reach, coarse: L.coarse }, j => {
    RM = 0;
    let before = 0, px = 0, py = 0, pnx = 0, pny = 0, ph = 0, ps = 0, pq = 1, drew = false;
    for (let i = 0; i < LN; i++) {
      const bx = BX[i], by = BY[i], nx = NX[i], ny = NY[i], P = PP[i];
      let d = 0;
      if (wAmp) d += wAmp * Math.sin(SA[i] * wK + j * wShift);
      if (wob) d += wob * 2 * NZW(bx * wobK, by * wobK, j * 0.37 + 3.1);
      if (lean) d += lean * P * (2 * toneAt(bx, by) - 1);
      if (bulge) d += bulge * P * (toneAt(bx + nx * P, by + ny * P) - toneAt(bx - nx * P, by - ny * P));
      let x = bx + nx * d, y = by + ny * d;
      const T = tone(x, y);
      let wd = widthAt(T, P);
      const wd0 = wd;                           // as wide as the tone makes it
      // On cloth the lines come closer on the sheet where it turns away, and further apart
      // where it comes nearer than the rest — read here and halfway to the next line on
      // either side. Where it spreads them, the nib is narrower on the flat picture, so the
      // passes are still close enough on paper to leave none of it.
      let q = 1, sl = 1, sr = 1;
      if (CF) {
        const hp = P / 2;
        sl = clothAcross(x - nx * hp, y - ny * hp, nx, ny);
        sr = clothAcross(x + nx * hp, y + ny * hp, nx, ny);
        const sm = Math.max(sl, sr, clothAcross(x, y, nx, ny));
        if (sm > 1) q = 1 / sm;
      }
      const nq = nib * q;
      // A hair of paper thinner than a few tenths of a millimetre is not kept on paper — it
      // comes out torn, and the preview cannot show it at all. Each of the two hairs beside
      // the line is weighed where it lies, between this line and the next, both as wide as
      // their tone makes them; one too thin is closed — this line and the next both swell
      // to just past the middle between them, and so do the passes.
      if (hair > 0 && wd < P) {
        const e = (1 - PASS_STEP) * nq / 2, wq = Math.max(wd, nq);
        const far = P - (wq + Math.max(P * wMax, nq)) / 2 + nq;     // the most the next can take
        let lo = wd / 2, hi = lo;
        if (far * sl - nib < hair && hairShut(x - nx * P, y - ny * P, P, wq, nq, nib, sl, hair, tone, widthAt, lift)) lo = P / 2 + e;
        if (far * sr - nib < hair && hairShut(x + nx * P, y + ny * P, P, wq, nq, nib, sr, hair, tone, widthAt, lift)) hi = P / 2 + e;
        if (lo !== hi || lo !== wd / 2) {
          const dd = (hi - lo) / 2;
          x += nx * dd; y += ny * dd; wd = lo + hi;
        }
      }
      const h = wd > nq ? (wd - nq) / 2 : 0;
      let on = mask ? flip * mask(x, y, T, j) : 1;
      if (lift > 0 && T - lift < on) on = T - lift;
      const out = Math.max(A.x0 - x, x - A.x1, A.y0 - y, y - A.y1) - h - nib;
      if (out > 0 && -out < on) on = -out;
      if (i > 0 && (on > 0) !== (before > 0)) {
        const t = before / (before - on);       // where between the two the pen goes down or up
        runPush(px + (x - px) * t, py + (y - py) * t, pnx + (nx - pnx) * t, pny + (ny - pny) * t,
                ph + (h - ph) * t, ps + (SA[i] - ps) * t, pq + (q - pq) * t);
        if (before > 0) { if (inkRun(L.ink, nib)) drew = true; RM = 0; }
      }
      if (on > 0) {
        runPush(x, y, nx, ny, h, SA[i], q);
        if (wd0 > widest) widest = wd0;
      }
      before = on; px = x; py = y; pnx = nx; pny = ny; ph = h; ps = SA[i]; pq = q;
    }
    if (RM > 0 && inkRun(L.ink, nib)) drew = true;
    RM = 0;
    if (drew) lines++;
  });
  return { lines, widest: widest * gK };
}

// Whether the hair of paper between a line as wide as wq and the next one, whose middle is
// at (x, y), is thinner on the sheet than asked — s is how the cloth spreads it there. The
// edges are half a nib (nq) inside the outlines on the flat picture, but the pen is as wide
// as ever on the sheet (nib), so where the cloth crowds the lines the ink reaches past their
// crowded outlines and the hair is thinner still. Not if the next line is not drawn there:
// past the edge of the picture, or lifted in the light.
function hairShut(x, y, P, wq, nq, nib, s, hair, tone, widthAt, lift) {
  const A = area;
  if (x < A.x0 || x > A.x1 || y < A.y0 || y > A.y1) return false;
  const T = tone(x, y);
  if (lift > 0 && T < lift) return false;
  return (P - (wq + Math.max(widthAt(T, P), nq)) / 2 + nq) * s - nib < hair;
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
  let hmax = 0;                               // the widest, in the nib of the flat picture
  for (let i = 0; i < m; i++) { const hq = RH[i] / RQ[i]; if (hq > hmax) hmax = hq; }
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
// exactly. b and tau are in the nib of the flat picture, and shrink with it where the cloth
// spreads the lines (RQ).
function passStroke(a, b, tau, under) {
  const m = RM;
  QN = 0;
  let was = false;
  for (let i = 0; i < m; i++) {
    const inside = (RH[i] > tau * RQ[i]) !== under;
    if (i > 0 && inside !== was) {
      const q0 = RQ[i - 1], dq = RQ[i] - q0;
      const t = (tau * q0 - RH[i - 1]) / ((RH[i] - RH[i - 1]) - tau * dq);
      const o = (a * tau + b) * (q0 + dq * t);
      qPush(RX[i - 1] + (RX[i] - RX[i - 1]) * t + (RNX[i - 1] + (RNX[i] - RNX[i - 1]) * t) * o,
            RY[i - 1] + (RY[i] - RY[i - 1]) * t + (RNY[i - 1] + (RNY[i] - RNY[i - 1]) * t) * o);
      if (was) strokeOut(true);
    }
    if (inside) {
      const o = a * RH[i] + b * RQ[i];
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
    if (dd < 1e-18) {
      for (let i = a + 1; i < b; i++) {
        const qx = xs[i] - ax, qy = ys[i] - ay, d = qx * qx + qy * qy;
        if (d > wd) { wd = d; worst = i; }
      }
    } else {
      for (let i = a + 1; i < b; i++) {
        const qx = xs[i] - ax, qy = ys[i] - ay;
        let t = (qx * dx + qy * dy) / dd;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = qx - t * dx, ey = qy - t * dy, d = ex * ex + ey * ey;
        if (d > wd) { wd = d; worst = i; }
      }
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
// The cloth
//
// The picture can be printed on a sheet of cloth — or of paper — that is then folded,
// crumpled, bent, hung up and blown about, and drawn as it is seen from where the viewer
// stands. Every line is laid down on the flat cloth exactly as before; only on its way into
// the sink is it carried to wherever its place on the cloth has gone, and cut wherever
// another part of the cloth lies in front of it.
//
// The cloth is a fine grid of points over the picture, shaped in four steps:
//   folds   — one or two sets of folds, each wound out of a slope that swings to and fro
//             across them, so the cloth keeps its length: where it climbs it is drawn in,
//             and past a slope of 90° it laps back over itself;
//   relief  — crumpling, creases and whatever was shaped by hand, as heights; the cloth is
//             then drawn in on itself until no stretch of it is longer than it was flat;
//   bending — the whole sheet bowed, an edge or a corner rolled up, twisted end to end;
//   hanging — a coarser grid of the same cloth let fall under its weight, held by pins,
//             pushed together, blown by the wind and laid over what is under it; the fine
//             shape rides on it.
// Then it is turned to the viewer, put into perspective and fitted to the picture. A depth
// buffer of the cloth says which part of it is in front at any point of the sheet, and the
// light shades it: the tone a line swells with darkens where the cloth turns from the light
// and in its hollows, so the lines themselves draw the shape of the cloth.

const CLOTH_CELLS  = 64_000;      // points of the fine grid, about
const CLOTH_PX     = 1.4e6;       // cells of the depth buffer, about
const CLOTH_RELAX  = 40;          // rounds of drawing the relief in
const GRAVITIES    = ['none', 'down the sheet', 'into the sheet'];
const HANG_FROM    = ['nothing', 'the top edge', 'pegs on a line', 'two top corners',
                      'one corner', 'the middle', 'four corners', 'the left edge'];
const SQUEEZES     = ['the sides', 'top and bottom', 'all round'];
const UNDER        = ['nothing', 'a ball', 'three balls', 'a box', 'a rod', 'a pole'];
const CRUMPLES     = ['facets', 'creased', 'soft'];
const CREASES      = ['random', 'letter', 'grid'];
const CLOTH_BACKS  = ['printed through', 'bare', 'other pen'];
const CLOTH_EDGES  = ['none', 'hem', 'hem and folds'];
const CLOTH_TOOLS  = ['off', 'fold', 'pinch', 'bump', 'pin', 'erase'];
// what each tool is called in the lists, and what it does on the cloth
const CLOTH_TOOL_NAMES = {
  off:   ['No tool', 'a drag slides the picture under the lines, as on a flat sheet'],
  fold:  ['Fold', 'drag along the cloth: a ridge — with shift, a valley'],
  pinch: ['Pinch', 'drag out from a point: gathered into folds round a peak'],
  bump:  ['Bump', 'drag out from a point: raised — with shift, dented'],
  pin:   ['Pin', 'click: the place is held and the cloth hangs from it; a drag moves it, the wheel lifts it'],
  erase: ['Erase', 'click on anything made by hand to take it away'],
};

// What the shape of the cloth depends on, and what only the way it is seen and lit does —
// so turning it to the viewer, zooming or moving the light never lets it fall again. Only
// what is at work counts: the wind's angle while there is no wind, or the weight of a cloth
// that does not hang, change nothing, and the shape made is kept.
function shapeKey() {
  const s = settings, at = (on, keys) => on ? keys.map(k => s[k]).join(',') : '-';
  const into = s.gravity === 'into the sheet';
  return [
    at(true, ['paper', 'orientation', 'customW', 'customH', 'margin', 'seed']),
    at(s.folds, ['folds', 'foldLen', 'foldAngle', 'foldSharp', 'foldUneven', 'foldWander',
                 'foldTaper', 'foldLean']),
    at(s.crossFolds, ['crossFolds', 'crossLen', 'crossAngle', 'crossSharp', 'foldUneven', 'foldWander']),
    at(s.crumple > 0, ['crumple', 'crumpleKind', 'crumpleSize', 'crumpleDetail']),
    at(s.creases > 0, ['creases', 'creaseKind', 'creaseDepth']),
    at(s.bow, ['bow', 'bowAngle']), at(s.curl, ['curl', 'curlAngle', 'curlSize']),
    at(s.twist, ['twist', 'twistAngle']),
    s.clothHand, at(HAND.some(h => h.t !== 'n'), ['handScale']),
    at(hangWanted(), ['gravity', 'stiffness', 'simTime', 'simRes', 'hangFrom', 'squeeze', 'wind']),
    at(hangWanted() && s.gravity !== 'none', ['weight']),
    at(hangWanted() && s.hangFrom !== 'nothing', ['gather']),
    at(hangWanted() && s.squeeze > 0, ['squeezeFrom']),
    at(hangWanted() && s.wind > 0, ['windAngle', 'windLift', 'gusts']),
    at(hangWanted() && into, ['under', 'table', 'tableDrop', 'propSize', 'propX', 'propY']),
  ].join('|');
}

function seenKey() {
  const s = settings;
  return ['viewTilt', 'viewTurn', 'viewSide', 'perspective', 'clothFit', 'clothZoom', 'clothX',
          'clothY', 'shade', 'lightFrom', 'lightHigh', 'hollows'].map(k => s[k]).join('|') +
    (s.hollows ? '|' + s.foldLen : '');
}
const SHAPES_KEPT = 6;       // shapes kept, so going back to one is instant

let CLOTH = null;            // the cloth as it is seen, or null while the sheet lies flat
let FLATZ = null;            // the flat sheet's zoom: { g, ox, oy, cx, cy }, or null at 1:1
let clothKeyNow = '', clothMs = 0;
const SHAPE_CACHE = [];       // the latest shapes, newest last: { key, coarse, ms, ... }
let clothTool = 'off';
let HAND = [];               // what was shaped by hand
const HAND_UNDO = [];

// What was shaped by hand rides in the link as one string: a fold is f with its two ends,
// its depth and its width; a pinch p and a bump b their middle, radius and depth; a pin n
// the place it holds and how far that place was moved. Places are in ten-thousandths of
// the picture, lengths in tenths of a millimetre.
function parseHand(str) {
  const out = [];
  for (const part of String(str || '').split(';')) {
    const a = part.split(','), t = a[0], v = a.slice(1).map(Number);
    if (!v.length || v.some(x => !Number.isFinite(x))) continue;
    if (t === 'f' && v.length >= 6) {
      out.push({ t, u1: v[0] / 1e4, v1: v[1] / 1e4, u2: v[2] / 1e4, v2: v[3] / 1e4,
                 d: v[4] / 10, w: Math.max(0.5, v[5] / 10) });
    } else if ((t === 'p' || t === 'b') && v.length >= 4) {
      out.push({ t, u: v[0] / 1e4, v: v[1] / 1e4, r: Math.max(0.5, v[2] / 10), d: v[3] / 10 });
    } else if (t === 'n' && v.length >= 4) {
      out.push({ t, u: v[0] / 1e4, v: v[1] / 1e4, dx: v[2] / 10, dy: v[3] / 10, dz: (v[4] || 0) / 10 });
    }
  }
  return out;
}

function handString(list) {
  const q = x => Math.round(x * 1e4), m = x => Math.round(x * 10);
  return list.map(h => h.t === 'f' ? `f,${q(h.u1)},${q(h.v1)},${q(h.u2)},${q(h.v2)},${m(h.d)},${m(h.w)}`
    : h.t === 'n' ? `n,${q(h.u)},${q(h.v)},${m(h.dx)},${m(h.dy)},${m(h.dz)}`
    : `${h.t},${q(h.u)},${q(h.v)},${m(h.r)},${m(h.d)}`).join(';');
}

// Hanging is worth working out only when something holds the cloth or stops it falling.
function hangWanted() {
  const s = settings, pins = s.hangFrom !== 'nothing' || HAND.some(h => h.t === 'n');
  return pins || s.wind > 0 || s.squeeze > 0 || (s.gravity === 'into the sheet' && s.table);
}

// The cloth for the settings in hand. A shape already worked out is used again — the fine
// one even while a drag asks for a coarse one — and so is the view of it, so only what
// changed is done again. A fine shape that takes long — one that hangs, or is crumpled,
// creased or shaped by hand — is made by a worker on another core; until it comes the sheet
// shows the coarse one, made at once, and the page goes on answering.
function ensureCloth(coarse) {
  if (!settings.cloth) { CLOTH = null; clothKeyNow = ''; clothMs = 0; return; }
  const t0 = performance.now();
  HAND = parseHand(settings.clothHand);
  const skey = shapeKey();
  let sh = shapeKept(skey, coarse);
  if (!coarse) STAND_IN = null;
  if (!sh) {
    // made by the worker: while a drag lasts the newest coarse shape it brought stands in
    const later = !SHAPE_NOW && shapeIsSlow() && shapeLater(skey, coarse);
    if (later) sh = coarse ? STAND_IN || (CLOTH && CLOTH.shape) : shapeKept(skey, true);
    if (!sh) sh = shapeKeep(shapeCloth(coarse || later), skey);
  }
  const vkey = seenKey();
  if (CLOTH && CLOTH.shape === sh && CLOTH.vkey === vkey && (coarse || !CLOTH.coarse)) return;
  clothKeyNow = skey + '#' + vkey;
  CLOTH = seeCloth(sh, coarse);
  CLOTH.vkey = vkey;
  clothMs = performance.now() - t0;
}

// The shape kept for a key — the fine one, or if that may do, the coarse one — and put last,
// as the one used most lately; or null.
function shapeKept(key, coarseWill) {
  let sh = null;
  for (const c of SHAPE_CACHE) if (c.key === key && (!c.coarse || (coarseWill && !sh))) sh = c;
  if (sh) { SHAPE_CACHE.splice(SHAPE_CACHE.indexOf(sh), 1); SHAPE_CACHE.push(sh); }
  return sh;
}

function shapeKeep(sh, key) {
  sh.key = key;
  for (let i = SHAPE_CACHE.length - 1; i >= 0; i--) {
    if (SHAPE_CACHE[i].key === key && (SHAPE_CACHE[i].coarse || !sh.coarse)) SHAPE_CACHE.splice(i, 1);
  }
  SHAPE_CACHE.push(sh);
  if (SHAPE_CACHE.length > SHAPES_KEPT) SHAPE_CACHE.shift();
  return sh;
}

function shapeIsSlow() {
  const s = settings;
  return hangWanted() || s.crumple > 0 || s.creases > 0 || (s.handScale > 0 && HAND.some(h => h.t !== 'n'));
}

// The worker that shapes the cloth: the very functions of this page that make a shape, sent
// to it as their text, so it makes exactly the shape they would make here.
let SHAPER = undefined;      // the worker, or null when there is none to be had
let shaperUrl = null, shaperJob = null, shaperNext = null, SHAPE_NOW = false;
let STAND_IN = null;         // while a drag lasts, the newest coarse shape the worker brought

function shaperSource() {
  const fns = [clamp, rad, mulberry32, rng, hash01, fade3, grad3, makePerlin3, ensureNoise,
               hangWanted, shapeCloth, foldSet, facetAt, clothRelief, relaxCloth, rollCloth,
               bendCloth, catmull, fineAt, hangCloth, clothWasm, clothWasmFor, levelOrder];
  return `let settings = null, area = null, HAND = [], SEED_MIX = 0, NZ = null, NZW = null, nzSeedNow = null;
let CLOTH_WASM = undefined;
const CLOTH_CELLS = ${CLOTH_CELLS}, CLOTH_RELAX = ${CLOTH_RELAX};
${fns.map(f => f.toString()).join('\n\n')}
onmessage = e => {
  const m = e.data;
  try {
    settings = m.settings; area = m.area; HAND = m.hand;
    ensureNoise();
    const C = shapeCloth(!!m.coarse);
    postMessage({ key: m.key, C }, [C.PX.buffer, C.PY.buffer, C.PZ.buffer]);
  } catch (err) {
    postMessage({ key: m.key, error: String(err && err.stack || err) });
  }
};`;
}

function shaperStart() {
  if (SHAPER !== undefined) return SHAPER;
  try {
    if (!shaperUrl) shaperUrl = URL.createObjectURL(new Blob([shaperSource()], { type: 'text/javascript' }));
    const W = new Worker(shaperUrl);
    W.onmessage = e => { if (W === SHAPER) shaperDone(e.data); };
    W.onerror = e => {
      if (W === SHAPER) shaperDone({ key: shaperJob && shaperJob.key, error: e.message || 'the worker failed' });
    };
    SHAPER = W;
  } catch (err) {
    SHAPER = null;
  }
  return SHAPER;
}

// Asks the worker for a shape. A fine one is wanted at once: whatever the worker was making
// is dropped. A coarse one — asked for at every step of a drag — waits for the one in hand,
// and of those waiting only the latest is made. False when there is no worker to ask.
function shapeLater(key, coarse) {
  const job = shaperJob;
  if (job && job.key === key && (!job.coarse || coarse)) return true;
  if (!shaperStart()) return false;
  const ask = { key, coarse, settings: { ...settings }, area: { ...area }, hand: HAND };
  if (job && coarse) { shaperNext = ask; return true; }
  if (job) {
    SHAPER.terminate();
    SHAPER = undefined;
    if (!shaperStart()) { shaperJob = null; return false; }
  }
  shaperNext = null;
  shaperJob = { key, coarse };
  SHAPER.postMessage(ask);
  return true;
}

function shaperDone(m) {
  shaperJob = null;
  if (m.error) {
    console.warn('the cloth is shaped on this page from now on:', m.error);
    if (SHAPER) SHAPER.terminate();
    SHAPER = null;
    shaperNext = STAND_IN = null;
  } else {
    shapeKeep(m.C, m.key);
    STAND_IN = m.C.coarse ? m.C : null;
  }
  if (shaperNext && SHAPER) {
    const ask = shaperNext;
    shaperNext = null;
    shaperJob = { key: ask.key, coarse: ask.coarse };
    SHAPER.postMessage(ask);
  }
  if (!settings.cloth) return;
  HAND = parseHand(settings.clothHand);
  if (m.error || shapeKey() === m.key || (STAND_IN && (drag || busy))) update();
}

// Whether the sheet waits for the worker: the cloth wanted takes long and is not made yet —
// so it is asked for, and the sheet stays as it is until it comes.
function clothPending() {
  const s = settings;
  if (!s.cloth || SHAPE_NOW) return false;
  area = drawArea();
  if (area.w < 2 || area.h < 2) return false;
  HAND = parseHand(s.clothHand);
  if (!shapeIsSlow()) return false;
  const key = shapeKey();
  if (shapeKept(key, true)) return false;
  if (!drag && !busy) return shapeLater(key, false);
  // while a drag lasts the sheet is drawn again only once the worker brings a newer shape
  if (!CLOTH || !shapeLater(key, true)) return false;
  return !STAND_IN || STAND_IN === CLOTH.shape;
}

// Before anything is saved, the fine shape, made here and now if it has not come yet.
function fineNow() {
  if (!settings.cloth) return;
  HAND = parseHand(settings.clothHand);
  if (CLOTH && !CLOTH.shape.coarse && CLOTH.shape.key === shapeKey()) return;
  SHAPE_NOW = true;
  busy = false;
  try { update(); } finally { SHAPE_NOW = false; }
}

// The shape: points of the fine grid in world mm, from the middle of the flat cloth — x
// right, y down the sheet, z to the viewer.
function shapeCloth(coarse) {
  const s = settings, A = area, t0 = performance.now();
  const cells = coarse ? CLOTH_CELLS / 4 : CLOTH_CELLS;
  const h0 = Math.max(0.3, Math.sqrt(A.w * A.h / cells));
  const nx = Math.max(3, Math.round(A.w / h0) + 1), ny = Math.max(3, Math.round(A.h / h0) + 1);
  const hx = A.w / (nx - 1), hy = A.h / (ny - 1), N = nx * ny;
  const cu = (A.x0 + A.x1) / 2, cv = (A.y0 + A.y1) / 2;
  const C = { nx, ny, hx, hy, x0: A.x0, y0: A.y0, cu, cv, simMs: 0, hung: false, coarse };

  const PX = new Float64Array(N), PY = new Float64Array(N), PZ = new Float64Array(N);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      PX[k] = A.x0 + i * hx - cu; PY[k] = A.y0 + j * hy - cv;
    }
  }

  if (s.folds) foldSet(PX, PY, PZ, { deg: s.folds, len: s.foldLen, angle: s.foldAngle,
    sharp: s.foldSharp, uneven: s.foldUneven, wander: s.foldWander, taper: s.foldTaper,
    lean: s.foldLean, salt: 1.7 });
  if (s.crossFolds) foldSet(PX, PY, PZ, { deg: s.crossFolds, len: s.crossLen,
    angle: s.crossAngle, sharp: s.crossSharp, uneven: s.foldUneven, wander: s.foldWander,
    taper: 0, lean: 0, salt: 23.3 });

  const H = new Float64Array(N);
  if (clothRelief(C, H)) {
    for (let k = 0; k < N; k++) PZ[k] += H[k];
    relaxCloth(PX, PY, PZ, nx, ny, hx, hy, coarse ? CLOTH_RELAX / 3 : CLOTH_RELAX);
  }

  bendCloth(PX, PY, PZ);

  if (hangWanted()) {
    const t1 = performance.now();
    hangCloth(C, PX, PY, PZ, coarse);
    C.simMs = performance.now() - t1;
    C.hung = true;
  }
  Object.assign(C, { PX, PY, PZ, ms: performance.now() - t0 });
  return C;
}

// The shape seen: turned, put into perspective, fitted, lit, and its depth buffer.
function seeCloth(sh, coarse) {
  const t0 = performance.now(), C = Object.assign({}, sh);
  C.shape = sh;
  C.coarse = coarse || sh.coarse;
  viewCloth(C, sh.PX, sh.PY, sh.PZ);
  shadeCloth(C);
  depthBuffer(C, coarse);
  C.viewMs = performance.now() - t0;
  return C;
}

////////////////////////////////////////////////////////////////////////////////////////
// Folds

// A set of folds. Across them the slope of the cloth swings to and fro — softly, or
// snapping over like a pleat — and the cloth is wound out of that slope step by step, so
// it keeps its length. Uneven folds are of unlike depth and spacing; wandering ones drift
// along their length; tapering ones die out towards one end; leaning ones are steeper on
// one side than the other.
function foldSet(PX, PY, PZ, f) {
  const N = PX.length, th = rad(f.angle);
  const ax = Math.cos(th), ay = Math.sin(th), bx = -ay, by = ax;    // across, along
  let s0 = Infinity, s1 = -Infinity, t0 = Infinity, t1 = -Infinity;
  for (let k = 0; k < N; k++) {
    const sv = PX[k] * ax + PY[k] * ay, tv = PX[k] * bx + PY[k] * by;
    if (sv < s0) s0 = sv;
    if (sv > s1) s1 = sv;
    if (tv < t0) t0 = tv;
    if (tv > t1) t1 = tv;
  }
  const lam = Math.max(2, f.len), kl = 1 / lam, ds = Math.min(0.5, lam / 40);
  const i0 = Math.ceil(-s0 / ds) + 1;                   // s = 0 falls on a sample
  const ns = i0 + Math.ceil(s1 / ds) + 2;
  const tl = Math.max(1e-6, t1 - t0);
  const nt = clamp(Math.ceil(tl / Math.min(lam / 3, 8)) + 1, 2, 300), dt = tl / (nt - 1);
  const X = new Float32Array(ns * nt), Z = new Float32Array(ns * nt), TH = new Float64Array(ns);
  const tmax = rad(clamp(f.deg, -179, 179));
  const sk = 1 - 0.95 * clamp(f.sharp / 100, 0, 1);
  const un = clamp(f.uneven / 100, 0, 1), wa = f.wander / 100, tp = clamp(f.taper / 100, -1, 1);
  const ln = clamp(f.lean / 100, -1, 1) * 0.85, salt = f.salt;
  for (let r = 0; r < nt; r++) {
    const t = t0 + r * dt, tt = (t - (t0 + t1) / 2) / (tl / 2);
    const taper = clamp(1 - Math.abs(tp) * (1 + Math.sign(tp) * tt) / 2, 0, 1);
    for (let k = 0; k < ns; k++) {
      const q = (k - i0) * ds * kl;
      const p = q + un * 0.9 * NZW(q * 0.31, salt, 0.5) + wa * 0.6 * NZW(q * 0.5, t * kl * 0.22, salt + 3.7);
      const amp = (1 - un * 0.75 * (0.5 + 0.5 * NZW(q * 0.43 + 11.3, salt + 7.1, 1.3))) * taper;
      let ph = 2 * Math.PI * p;
      ph += ln * Math.sin(ph);
      const b = Math.sin(ph);
      TH[k] = tmax * amp * (sk === 1 ? b : Math.sign(b) * Math.pow(Math.abs(b), sk));
    }
    const o = r * ns;
    for (let k = i0 + 1; k < ns; k++) {
      X[o + k] = X[o + k - 1] + ds * 0.5 * (Math.cos(TH[k - 1]) + Math.cos(TH[k]));
      Z[o + k] = Z[o + k - 1] + ds * 0.5 * (Math.sin(TH[k - 1]) + Math.sin(TH[k]));
    }
    for (let k = i0 - 1; k >= 0; k--) {
      X[o + k] = X[o + k + 1] - ds * 0.5 * (Math.cos(TH[k + 1]) + Math.cos(TH[k]));
      Z[o + k] = Z[o + k + 1] - ds * 0.5 * (Math.sin(TH[k + 1]) + Math.sin(TH[k]));
    }
    // a cloth that would climb steadily across is levelled
    let sx = 0, sz = 0, sxx = 0, sxz = 0;
    for (let k = 0; k < ns; k++) {
      const x = k - i0, z = Z[o + k];
      sx += x; sz += z; sxx += x * x; sxz += x * z;
    }
    const m = (ns * sxz - sx * sz) / (ns * sxx - sx * sx || 1), c = (sz - m * sx) / ns;
    for (let k = 0; k < ns; k++) Z[o + k] -= c + m * (k - i0);
  }
  for (let k = 0; k < N; k++) {
    const sv = PX[k] * ax + PY[k] * ay, tv = PX[k] * bx + PY[k] * by;
    const a = clamp(sv / ds + i0, 0, ns - 1.0001), b = clamp((tv - t0) / dt, 0, nt - 1.0001);
    const i = a | 0, j = b | 0, fa = a - i, fb = b - j, o = j * ns + i;
    const xv = (X[o] + (X[o + 1] - X[o]) * fa) * (1 - fb) + (X[o + ns] + (X[o + ns + 1] - X[o + ns]) * fa) * fb;
    const zv = (Z[o] + (Z[o + 1] - Z[o]) * fa) * (1 - fb) + (Z[o + ns] + (Z[o + ns + 1] - Z[o + ns]) * fa) * fb;
    const d = xv - sv;
    PX[k] += d * ax; PY[k] += d * ay; PZ[k] += zv;
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Relief

// Crumpled into facets: every cell of a scatter of points is a little pyramid, raised or
// sunk as luck has it, its rim on the creases between the cells — level there, so the
// cells meet.
function facetAt(x, y, salt) {
  const gx = Math.floor(x), gy = Math.floor(y);
  let d1 = 1e9, d2 = 1e9, ci = 0, cj = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = gx + i, cy = gy + j;
      const dx = cx + 0.1 + 0.8 * hash01(cx, cy, salt) - x, dy = cy + 0.1 + 0.8 * hash01(cx, cy, salt + 1) - y;
      const d = dx * dx + dy * dy;
      if (d < d1) { d2 = d1; d1 = d; ci = cx; cj = cy; } else if (d < d2) d2 = d;
    }
  }
  const sg = hash01(ci, cj, salt + 2) < 0.5 ? -1 : 1;
  return sg * Math.min(1, (Math.sqrt(d2) - Math.sqrt(d1)) * 1.6);
}

// Heights laid over the cloth where it was crumpled, creased or shaped by hand, each read
// at its point's place on the flat picture.
function clothRelief(C, H) {
  const s = settings, A = area, { nx, ny, hx, hy } = C, N = nx * ny;
  let any = false;
  const each = fn => {
    for (let j = 0; j < ny; j++) {
      const y = A.y0 + j * hy;
      for (let i = 0; i < nx; i++) H[j * nx + i] += fn(A.x0 + i * hx, y);
    }
  };

  if (s.crumple > 0) {
    any = true;
    const D = s.crumple, S = Math.max(2, s.crumpleSize), oct = clamp(Math.round(s.crumpleDetail), 1, 5);
    const kind = s.crumpleKind;
    each((x, y) => {
      let h = 0, amp = 1, f = 1 / S;
      for (let o = 0; o < oct; o++) {
        const qx = x * f + o * 7.31, qy = y * f - o * 3.17;
        h += amp * (kind === 'facets' ? facetAt(qx, qy, 401 + o * 13)
                  : kind === 'creased' ? 1 - 2.4 * Math.abs(NZ(qx, qy, 4.7 + o))
                  : 1.6 * NZ(qx, qy, 9.1 + o));
        amp *= 0.45; f *= 2.1;
      }
      return D * h;
    });
  }

  if (s.creases > 0) {
    any = true;
    const rnd = rng(733), n = clamp(Math.round(s.creases), 1, 40), lines = [];
    const beta = rad(clamp(s.creaseDepth, 0, 80));
    const cx = (A.x0 + A.x1) / 2, cy = (A.y0 + A.y1) / 2;
    if (s.creaseKind === 'random') {
      for (let k = 0; k < n; k++) {
        const a = rnd() * Math.PI;
        lines.push([A.x0 + rnd() * A.w, A.y0 + rnd() * A.h, Math.cos(a), Math.sin(a),
                    (rnd() < 0.5 ? -1 : 1) * (0.4 + 0.6 * rnd())]);
      }
    } else {
      // a letter is folded in three along its length and once across; a map in a grid
      const along = A.w >= A.h, nl = s.creaseKind === 'letter' ? 2 : n, nc = s.creaseKind === 'letter' ? 1 : n;
      for (let k = 1; k <= nl; k++) {
        const t = k / (nl + 1) + (rnd() - 0.5) * 0.02;
        if (along) lines.push([A.x0 + t * A.w, cy, 0, 1, k & 1 ? 1 : -1]);
        else lines.push([cx, A.y0 + t * A.h, 1, 0, k & 1 ? 1 : -1]);
      }
      for (let k = 1; k <= nc; k++) {
        const t = k / (nc + 1) + (rnd() - 0.5) * 0.02;
        if (along) lines.push([cx, A.y0 + t * A.h, 1, 0, k & 1 ? -0.8 : 0.8]);
        else lines.push([A.x0 + t * A.w, cy, 0, 1, k & 1 ? -0.8 : 0.8]);
      }
    }
    each((x, y) => {
      let h = 0;
      for (const [px, py, dx, dy, sg] of lines) {
        const d = (x - px) * dy - (y - py) * dx;
        h += sg * Math.tan(beta / 2) * Math.sqrt(d * d + 0.09);
      }
      return h;
    });
  }

  const K = clamp(s.handScale, 0, 1000) / 100;
  for (const h of HAND) {
    if (h.t === 'n' || !K) continue;
    any = true;
    if (h.t === 'f') {
      const ax = A.x0 + h.u1 * A.w, ay = A.y0 + h.v1 * A.h, bx = A.x0 + h.u2 * A.w, by = A.y0 + h.v2 * A.h;
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9, L = Math.sqrt(L2), w = h.w, d = h.d * K;
      each((x, y) => {
        const t = ((x - ax) * dx + (y - ay) * dy) / L2;
        if (t <= 0 || t >= 1) return 0;
        const q = Math.abs((x - ax) * dy - (y - ay) * dx) / L / w;
        return q >= 1 ? 0 : d * Math.sqrt(Math.sin(Math.PI * t)) * (0.5 + 0.5 * Math.cos(Math.PI * q));
      });
    } else {
      const px = A.x0 + h.u * A.w, py = A.y0 + h.v * A.h, R = h.r, d = h.d * K;
      const nf = clamp(Math.round(5 + R / 25), 5, 11), a0 = hash01(Math.round(px), Math.round(py), 77) * 6.28;
      each((x, y) => {
        const r = Math.hypot(x - px, y - py) / R;
        if (r >= 1) return 0;
        if (h.t === 'b') return d * (1 - r * r) * (1 - r * r);
        const c = Math.cos(nf * Math.atan2(y - py, x - px) + a0);
        return d * ((1 - r) * (1 - r) * (1 + 2 * r) + 0.4 * 4 * r * (1 - r) * Math.sign(c) * Math.sqrt(Math.abs(c)));
      });
    }
  }

  if (any) {
    let m = 0;
    for (let k = 0; k < N; k++) m += H[k];
    m /= N;
    for (let k = 0; k < N; k++) H[k] -= m;
  }
  return any;
}

// The cloth drawn in on itself, its heights kept: wherever a stretch between two points
// has come to climb, the two are brought closer over the sheet until the stretch is as long
// as it was flat — so a crumpled or creased sheet shrinks where it is steep.
function relaxCloth(PX, PY, PZ, nx, ny, hx, hy, rounds) {
  const N = nx * ny, hd = Math.hypot(hx, hy);
  // The heights stay, so the length each pair is to have over the sheet is worked out once.
  // The rounds sweep forward and back by turns; each sweep's pairs, in the order it puts them
  // right, are then put into levels — the very same sums, many at once.
  const sweep = back => {
    const A = new Int32Array(4 * N), B = new Int32Array(4 * N), WANT = new Float64Array(4 * N);
    let n = 0;
    const pair = (a, b, R) => {
      const dz = PZ[b] - PZ[a];
      A[n] = a; B[n] = b; WANT[n] = Math.sqrt(Math.max(R * R - dz * dz, 0.0025 * R * R)); n++;
    };
    for (let jj = 0; jj < ny; jj++) {
      const j = back ? ny - 1 - jj : jj;
      for (let ii = 0; ii < nx; ii++) {
        const i = back ? nx - 1 - ii : ii, k = j * nx + i;
        if (i + 1 < nx) pair(k, k + 1, hx);
        if (j + 1 < ny) {
          pair(k, k + nx, hy);
          if (i + 1 < nx) pair(k, k + nx + 1, hd);
          if (i > 0) pair(k, k + nx - 1, hd);
        }
      }
    }
    const ord = levelOrder(N, A, B, n, 1), out = { n, A: new Int32Array(n), B: new Int32Array(n), W: new Float64Array(n) };
    for (let t = 0; t < n; t++) { const c = ord[t]; out.A[t] = A[c]; out.B[t] = B[c]; out.W[t] = WANT[c]; }
    return out;
  };
  const S = [sweep(false), sweep(true)];
  const WA = clothWasmFor(N * 16 + (S[0].n + S[1].n) * 16);
  if (WA) {
    // the points as x, y side by side, then the records of the forward sweep and the back one
    const F = new Float64Array(WA.mem.buffer), I = new Int32Array(WA.mem.buffer);
    for (let k = 0; k < N; k++) { F[k * 2] = PX[k]; F[k * 2 + 1] = PY[k]; }
    let o = N * 16;
    const at = S.map(sw => {
      const r0 = o;
      for (let t = 0; t < sw.n; t++, o += 16) { I[o >> 2] = sw.A[t] * 16; I[(o >> 2) + 1] = sw.B[t] * 16; F[(o >> 3) + 1] = sw.W[t]; }
      return r0;
    });
    for (let it = 0; it < rounds; it++) WA.pairs(S[it & 1].n, at[it & 1]);
    for (let k = 0; k < N; k++) { PX[k] = F[k * 2]; PY[k] = F[k * 2 + 1]; }
    return;
  }
  for (let it = 0; it < rounds; it++) {
    const { n, A, B, W } = S[it & 1];
    for (let t = 0; t < n; t++) {
      const a = A[t], b = B[t];
      const dx = PX[b] - PX[a], dy = PY[b] - PY[a], d = Math.sqrt(dx * dx + dy * dy) || 1e-9;
      const c = (d - W[t]) / d * 0.5;
      PX[a] += dx * c; PY[a] += dy * c; PX[b] -= dx * c; PY[b] -= dy * c;
    }
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Bending the whole sheet

// Past a line across the sheet, the cloth is rolled round a cylinder by the angle given —
// toward the viewer, or under, when the angle is below 0 — and beyond one turn it winds in
// as a spiral, each turn inside the last. Its relief rides round with it. Both sides of the
// line roll when asked: that is a bow.
function rollCloth(PX, PY, PZ, ex, ey, w0, len, deg, both) {
  const phiM = rad(Math.min(Math.abs(deg), 1440));
  if (phiM < 1e-4 || len <= 1e-6) return;
  const up = deg > 0 ? 1 : -1, c = phiM > 2 * Math.PI ? 0.18 : 0;
  const R0 = len / (phiM - c * phiM * phiM / (4 * Math.PI)), b = R0 * c / (2 * Math.PI);
  for (let k = 0; k < PX.length; k++) {
    let w = PX[k] * ex + PY[k] * ey - w0, side = 1;
    if (both && w < 0) { w = -w; side = -1; }
    if (w <= 0) continue;
    const arc = Math.min(w, len), extra = w - arc;
    const phi = b ? (R0 - Math.sqrt(Math.max(0, R0 * R0 - 2 * b * arc))) / b : arc / R0;
    const sp = Math.sin(phi), cp = Math.cos(phi);
    const X = R0 * sp - b * (phi * sp + cp - 1) + extra * cp;
    const Zr = R0 * (1 - cp) - b * (sp - phi * cp) + extra * sp;
    const rz = PZ[k];
    const along = X - up * rz * sp, dw = side * (along - w);
    PX[k] += dw * ex; PY[k] += dw * ey;
    PZ[k] = up * Zr + rz * cp;
  }
}

function bendCloth(PX, PY, PZ) {
  const s = settings, N = PX.length;
  const extent = (ex, ey) => {
    let lo = Infinity, hi = -Infinity;
    for (let k = 0; k < N; k++) {
      const w = PX[k] * ex + PY[k] * ey;
      if (w < lo) lo = w;
      if (w > hi) hi = w;
    }
    return [lo, hi];
  };
  if (s.curl) {
    const a = rad(s.curlAngle), ex = Math.sin(a), ey = -Math.cos(a);
    const [lo, hi] = extent(ex, ey), len = (hi - lo) * clamp(s.curlSize, 1, 100) / 100;
    rollCloth(PX, PY, PZ, ex, ey, hi - len, len, s.curl, false);
  }
  if (s.bow) {
    const a = rad(s.bowAngle), ex = Math.cos(a), ey = Math.sin(a);
    const [lo, hi] = extent(ex, ey);
    rollCloth(PX, PY, PZ, ex, ey, 0, Math.max(-lo, hi), s.bow, true);
  }
  if (s.twist) {
    const a = rad(s.twistAngle), bx = Math.cos(a), by = Math.sin(a), ex = -by, ey = bx;
    const [lo, hi] = extent(bx, by), span = Math.max(1e-6, hi - lo), tw = rad(s.twist);
    for (let k = 0; k < N; k++) {
      const t = PX[k] * bx + PY[k] * by, q = PX[k] * ex + PY[k] * ey, z = PZ[k];
      const phi = tw * (t - (lo + hi) / 2) / span, c = Math.cos(phi), sn = Math.sin(phi);
      const q2 = q * c - z * sn;
      PZ[k] = q * sn + z * c;
      PX[k] = bx * t + ex * q2; PY[k] = by * t + ey * q2;
    }
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Hanging
//
// A coarser grid of the same cloth: every point a small weight, every neighbour held at the
// distance it has in the shaped cloth, and every second neighbour too, as stiffly as asked
// — that is what keeps the folds. Each step the points go on as they were going, a little
// slower, pulled by their weight and pushed by the wind against whichever way the cloth
// faces there; then the distances are put right, a few times over, no point is let further
// from a pin than the cloth between them reaches, the pins are put back and the cloth is
// pushed out of whatever it has fallen into. The fine cloth then rides on the coarse one,
// each point keeping its place against it.

// The links are put right by a few lines of WebAssembly when the browser has it — the same
// sums in the same order, so the cloth falls to the last bit as the script would let it
// fall, only two or three times as fast in some browsers. It is written out here op by op.
// links: each link a record of 40 bytes — where its two ends lie (byte offsets of their x, y,
//   z), its length, its share of the error and the weights of its ends;
// pairs: the same over the sheet only, for drawing a relief in — 16 bytes, the offsets of
//   the two ends' x, y and the length the pair is to have over the sheet.
let CLOTH_WASM = undefined;  // the compiled module, or null when there is no WebAssembly

function clothWasm() {
  if (CLOTH_WASM !== undefined) return CLOTH_WASM;
  try {
    const uleb = n => { const o = []; do { let b = n & 127; n >>>= 7; if (n) b |= 128; o.push(b); } while (n); return o; };
    const f64 = x => [...new Uint8Array(new Float64Array([x]).buffer)];
    const OP = { get: 0x20, set: 0x21, tee: 0x22, ld32: 0x28, ld: 0x2b, st: 0x39, i32: 0x41, f64: 0x44,
      add32: 0x6a, mul32: 0x6c, or32: 0x72, geu: 0x4f, ltu: 0x49, eq: 0x61, ne: 0x62, add: 0xa0,
      sub: 0xa1, mul: 0xa2, div: 0xa3, sqrt: 0x9f, block: 0x02, loop: 0x03, if: 0x04, end: 0x0b, brif: 0x0d };
    // a loop over records of `size` bytes: locals 0 how many, 1 the record in hand, 2 past the
    // last, 3 and 4 the offsets of its two ends, then the floats the body asks for
    const fn = (size, floats, body) => {
      const code = [], op = (name, ...imm) => { code.push(OP[name]); for (const x of imm) code.push(...x); };
      const get = i => op('get', uleb(i)), set = i => op('set', uleb(i));
      const ld = (at, off) => { get(at); op('ld', uleb(3), uleb(off)); };
      const st = off => op('st', uleb(3), uleb(off));
      get(1); get(0); op('i32', uleb(size)); op('mul32'); op('add32'); set(2);
      op('block', [0x40]); get(1); get(2); op('geu'); op('brif', [0]);
      op('loop', [0x40]);
      get(1); op('ld32', [2], [0]); set(3);
      get(1); op('ld32', [2], [4]); set(4);
      body({ op, get, set, ld, st, orTiny: i => {                     // d || 1e-9
        get(i); op('f64', f64(0)); op('eq'); get(i); get(i); op('ne'); op('or32');
        op('if', [0x40]); op('f64', f64(1e-9)); set(i); op('end');
      } });
      get(1); op('i32', uleb(size)); op('add32'); op('tee', [1]); get(2); op('ltu'); op('brif', [0]);
      op('end'); op('end'); op('end');
      return [2, 3, 0x7f, ...uleb(floats), 0x7c, ...code];
    };
    // locals 5–7 dx dy dz, 8 d, 9 e
    const links = fn(40, 5, ({ op, get, set, ld, st, orTiny }) => {
      for (let q = 0; q < 3; q++) { ld(4, q * 8); ld(3, q * 8); op('sub'); set(5 + q); }   // b − a
      get(5); get(5); op('mul'); get(6); get(6); op('mul'); op('add'); get(7); get(7); op('mul');
      op('add'); op('sqrt'); set(8); orTiny(8);
      get(8); ld(1, 8); op('sub'); get(8); op('div'); ld(1, 16); op('mul'); set(9);        // (d − rest) / d × share
      for (const [end, w, sign] of [[3, 24, 'add'], [4, 32, 'sub']]) {                      // a += d e wa, b −= d e wb
        for (let q = 0; q < 3; q++) {
          get(end); ld(end, q * 8); get(5 + q); get(9); op('mul'); ld(1, w); op('mul'); op(sign); st(q * 8);
        }
      }
    });
    // locals 5–6 dx dy, 7 d, 8 c
    const pairs = fn(16, 4, ({ op, get, set, ld, st, orTiny }) => {
      for (let q = 0; q < 2; q++) { ld(4, q * 8); ld(3, q * 8); op('sub'); set(5 + q); }
      get(5); get(5); op('mul'); get(6); get(6); op('mul'); op('add'); op('sqrt'); set(7); orTiny(7);
      get(7); ld(1, 8); op('sub'); get(7); op('div'); op('f64', f64(0.5)); op('mul'); set(8);   // (d − want) / d × ½
      for (const [end, sign] of [[3, 'add'], [4, 'sub']]) {
        for (let q = 0; q < 2; q++) { get(end); ld(end, q * 8); get(5 + q); get(8); op('mul'); op(sign); st(q * 8); }
      }
    });
    const sec = (id, b) => [id, ...uleb(b.length), ...b];
    const name = t => [t.length, ...[...t].map(c => c.charCodeAt(0))];
    CLOTH_WASM = new WebAssembly.Module(new Uint8Array([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0,
      ...sec(1, [1, 0x60, 2, 0x7f, 0x7f, 0]), ...sec(2, [1, ...name('m'), ...name('mem'), 2, 0, 1]),
      ...sec(3, [2, 0, 0]), ...sec(7, [2, ...name('links'), 0, 0, ...name('pairs'), 0, 1]),
      ...sec(10, [2, ...uleb(links.length), ...links, ...uleb(pairs.length), ...pairs])]));
  } catch (err) {
    CLOTH_WASM = null;
  }
  return CLOTH_WASM;
}

// Memory for the module and what it exports, or null.
function clothWasmFor(bytes) {
  const mod = clothWasm();
  if (!mod) return null;
  try {
    const mem = new WebAssembly.Memory({ initial: Math.ceil(bytes / 65536) + 1 });
    return { mem, ...new WebAssembly.Instance(mod, { m: { mem } }).exports };
  } catch (err) {
    return null;
  }
}

// Put right one after another, each link waits for the one before; but a link only needs the
// links before it that share a point with it to be done. So each is put one level past the
// last of those, and the links go level by level: within a level none shares a point with
// another, the processor works on many at once, and every point still sees the very same
// sums in the very same order. A and B hold the two ends as k × the point; the order is
// returned, the first n links of A and B are read.
function levelOrder(M, A, B, n, k) {
  const last = new Int32Array(M).fill(-1), lev = new Int32Array(n);
  let nlev = 0;
  for (let c = 0; c < n; c++) {
    const a = A[c] / k, b = B[c] / k, l = Math.max(last[a], last[b]) + 1;
    lev[c] = l; last[a] = last[b] = l;
    if (l >= nlev) nlev = l + 1;
  }
  const at = new Int32Array(nlev + 1), ord = new Int32Array(n);
  for (let c = 0; c < n; c++) at[lev[c] + 1]++;
  for (let l = 0; l < nlev; l++) at[l + 1] += at[l];
  for (let c = 0; c < n; c++) ord[at[lev[c]]++] = c;
  return ord;
}

function catmull(p0, p1, p2, p3, t) {
  return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
}

function fineAt(G, C, u, v) {
  const a = clamp((u - C.x0) / C.hx, 0, C.nx - 1.0001), b = clamp((v - C.y0) / C.hy, 0, C.ny - 1.0001);
  const i = a | 0, j = b | 0, fa = a - i, fb = b - j, o = j * C.nx + i, w = C.nx;
  return (G[o] + (G[o + 1] - G[o]) * fa) * (1 - fb) + (G[o + w] + (G[o + w + 1] - G[o + w]) * fa) * fb;
}

function hangCloth(C, PX, PY, PZ, coarse) {
  const s = settings, A = area;
  const res = clamp(Math.round(s.simRes * (coarse ? 0.65 : 1)), 10, 200);
  const hs = Math.max(A.w, A.h) / res;
  const mx = Math.max(4, Math.round(A.w / hs) + 1), my = Math.max(4, Math.round(A.h / hs) + 1);
  const gx = A.w / (mx - 1), gy = A.h / (my - 1), M = mx * my, hm = (gx + gy) / 2;
  const X = new Float64Array(M), Y = new Float64Array(M), Z = new Float64Array(M);
  for (let j = 0; j < my; j++) {
    for (let i = 0; i < mx; i++) {
      const k = j * mx + i, u = A.x0 + i * gx, v = A.y0 + j * gy;
      X[k] = fineAt(PX, C, u, v); Y[k] = fineAt(PY, C, u, v); Z[k] = fineAt(PZ, C, u, v);
    }
  }
  const IX = X.slice(), IY = Y.slice(), IZ = Z.slice();
  // a breath of unevenness, so a cloth pushed straight together knows which way to buckle
  for (let k = 0; k < M; k++) Z[k] += 0.04 * hm * NZW(X[k] / 60, Y[k] / 60, 41.3) + 0.01 * hm;

  // the distances held: neighbours, across the cells, and every second one for stiffness
  const CA = [], CB = [], CK = [];
  const stiff = clamp(s.stiffness / 100, 0, 1);
  const link = (a, b, k) => { CA.push(a); CB.push(b); CK.push(k); };
  for (let j = 0; j < my; j++) {
    for (let i = 0; i < mx; i++) {
      const k = j * mx + i;
      if (i + 1 < mx) link(k, k + 1, 1);
      if (j + 1 < my) link(k, k + mx, 1);
      if (i + 1 < mx && j + 1 < my) { link(k, k + mx + 1, 0.9); link(k + 1, k + mx, 0.9); }
      if (stiff > 0 && i + 2 < mx) link(k, k + 2, stiff);
      if (stiff > 0 && j + 2 < my) link(k, k + 2 * mx, stiff);
    }
  }
  const nc = CA.length, cA = Int32Array.from(CA), cB = Int32Array.from(CB), cK = Float64Array.from(CK);
  const cR = new Float64Array(nc);
  for (let c = 0; c < nc; c++) {
    const a = cA[c], b = cB[c];
    cR[c] = Math.hypot(IX[b] - IX[a], IY[b] - IY[a], IZ[b] - IZ[a]);
  }

  // the pins, each with the place it goes to
  const pins = new Map();
  const groups = [];
  const group = list => { if (list.length) groups.push(list); };
  const node = (i, j) => clamp(j, 0, my - 1) * mx + clamp(i, 0, mx - 1);
  const f = 1 - clamp(s.gather, 0, 95) / 100;
  const pleated = (list, along) => {
    // held all along an edge and gathered: the edge zigzags in pleats, keeping its length
    const p = Math.max(2, Math.round(24 / hm)), rise = hm * Math.sqrt(Math.max(0, 1 - f * f));
    list.forEach((k, n) => {
      const tri = Math.abs(((n % (2 * p)) + 2 * p) % (2 * p) - p) - p / 2;
      pins.set(k, [0, 0, rise * tri]);
    });
    groups.push({ list, along });
  };
  const edge = [];
  switch (s.hangFrom) {
    case 'the top edge':
      for (let i = 0; i < mx; i++) edge.push(node(i, 0));
      pleated(edge, 'x');
      break;
    case 'the left edge':
      for (let j = 0; j < my; j++) edge.push(node(0, j));
      pleated(edge, 'y');
      break;
    case 'pegs on a line': {
      const n = clamp(Math.round(A.w / 90) + 1, 3, 9), list = [];
      for (let q = 0; q < n; q++) list.push(node(Math.round(q * (mx - 1) / (n - 1)), 0));
      group(list);
      break;
    }
    case 'two top corners': group([node(0, 0), node(mx - 1, 0)]); break;
    case 'one corner':      group([node(0, 0)]); break;
    case 'the middle':      group([node(mx >> 1, my >> 1)]); break;
    case 'four corners':    group([node(0, 0), node(mx - 1, 0), node(0, my - 1), node(mx - 1, my - 1)]); break;
  }
  for (const g of groups) {
    const list = g.list || g;
    if (!g.list) for (const k of list) pins.set(k, [0, 0, 0]);
    if (list.length < 2 || f === 1) continue;
    let mxx = 0, myy = 0;
    for (const k of list) { mxx += IX[k]; myy += IY[k]; }
    mxx /= list.length; myy /= list.length;
    for (const k of list) {
      const d = pins.get(k);
      d[0] += (IX[k] - mxx) * (f - 1); d[1] += (IY[k] - myy) * (f - 1);
    }
  }
  if (s.squeeze > 0) {
    const q = clamp(s.squeeze, 0, 90) / 100;
    const put = (i, j, sx, sy) => {
      const k = node(i, j), d = pins.get(k) || [0, 0, 0];
      d[0] -= IX[k] * q * sx; d[1] -= IY[k] * q * sy;
      pins.set(k, d);
    };
    const all = s.squeezeFrom === 'all round';
    if (s.squeezeFrom === 'the sides' || all) {
      for (let j = 0; j < my; j++) { put(0, j, 1, all ? 1 : 0); put(mx - 1, j, 1, all ? 1 : 0); }
    }
    if (s.squeezeFrom === 'top and bottom' || all) {
      for (let i = all ? 1 : 0; i < (all ? mx - 1 : mx); i++) { put(i, 0, all ? 1 : 0, 1); put(i, my - 1, all ? 1 : 0, 1); }
    }
  }
  for (const h of HAND) {
    if (h.t !== 'n') continue;
    const k = node(Math.round(h.u * (mx - 1)), Math.round(h.v * (my - 1)));
    pins.set(k, [h.dx, h.dy, h.dz]);
  }
  const W = new Float64Array(M).fill(1);
  const pinK = [...pins.keys()], np = pinK.length;
  const PT = new Float64Array(np * 3);
  pinK.forEach((k, n) => {
    const d = pins.get(k);
    W[k] = 0;
    PT[n * 3] = IX[k] + d[0]; PT[n * 3 + 1] = IY[k] + d[1]; PT[n * 3 + 2] = IZ[k] + d[2];
  });
  // no point gets further from its nearest pin than the flat cloth between them
  const tetherP = new Int32Array(M).fill(-1), tetherR = new Float64Array(M);
  if (np) {
    for (let k = 0; k < M; k++) {
      if (!W[k]) continue;
      const i = k % mx, j = (k / mx) | 0;
      let best = Infinity, bp = -1;
      for (let n = 0; n < np; n++) {
        const q = pinK[n], d = Math.hypot((i - q % mx) * gx, (j - ((q / mx) | 0)) * gy);
        if (d < best) { best = d; bp = n; }
      }
      tetherP[k] = bp; tetherR[k] = best * 1.01;
    }
  }

  // what pulls and pushes
  const wt = clamp(s.weight, 0, 300) / 100 * 0.012 * hm;
  const gvx = 0, gvy = s.gravity === 'down the sheet' ? wt : 0, gvz = s.gravity === 'into the sheet' ? -wt : 0;
  const wa = rad(s.windAngle), wl = s.windLift / 100;
  let wx = Math.cos(wa), wy = Math.sin(wa), wz = wl;
  const wn = Math.hypot(wx, wy, wz) || 1;
  wx /= wn; wy /= wn; wz /= wn;
  const wind = clamp(s.wind, 0, 300) / 100 * 0.03 * hm, gust = clamp(s.gusts, 0, 200) / 100;

  // what lies under it, when it falls into the sheet
  const R = clamp(s.propSize, 1, 200) / 100 * Math.min(A.w, A.h) / 2;
  const pcx = s.propX / 100 * A.w / 2, pcy = s.propY / 100 * A.h / 2;
  const into = s.gravity === 'into the sheet';
  const props = [];
  let tz = -Infinity;
  if (into) {
    switch (s.under) {
      case 'a ball': tz = -2 * R - 3; props.push({ k: 'ball', x: pcx, y: pcy, z: tz + R, r: R }); break;
      case 'three balls': {
        const r = R * 0.55, a0 = hash01(3, 5, 61) * 6.283;
        tz = -2 * r - 3;
        for (let q = 0; q < 3; q++) {
          const a = a0 + q * 2.094;
          props.push({ k: 'ball', x: pcx + Math.cos(a) * R * 1.05, y: pcy + Math.sin(a) * R * 1.05, z: tz + r, r });
        }
        break;
      }
      case 'a box': tz = -1.2 * R - 3; props.push({ k: 'box', x: pcx, y: pcy, z: tz + 0.6 * R, bx: R, by: 0.7 * R, bz: 0.6 * R }); break;
      case 'a rod': tz = -0.7 * R - 3; props.push({ k: 'rod', y: pcy, z: tz + 0.35 * R, r: 0.35 * R }); break;
      case 'a pole': {
        const r = Math.max(2, 0.06 * R);
        tz = -2.5 * R - 3;
        props.push({ k: 'pole', x: pcx, y: pcy, z: -3, r });
        break;
      }
      default: tz = -Math.max(1, s.tableDrop);
    }
    if (!s.table) tz = -Infinity;
  }
  // The points side by side, x, y and z, as they are and as they were a step before; the
  // links that have a free end, each with the share of the error its two ends take; the
  // points held to a pin; what lies under the cloth as plain numbers, a kind at a time —
  // all so the loops below are nothing but arithmetic.
  // with WebAssembly the points and the links live in its memory: the points first, then
  // a record for every link
  const rec0 = M * 24, WA = clothWasmFor(rec0 + nc * 40), mem = WA && WA.mem, solve = WA && WA.links;
  const P = mem ? new Float64Array(mem.buffer, 0, M * 3) : new Float64Array(M * 3), O = new Float64Array(M * 3);
  for (let k = 0; k < M; k++) { P[k * 3] = X[k]; P[k * 3 + 1] = Y[k]; P[k * 3 + 2] = Z[k]; }
  O.set(P);
  let nl = 0;
  const LA = new Int32Array(nc), LB = new Int32Array(nc), LR = new Float64Array(nc);
  const LK = new Float64Array(nc), LWA = new Float64Array(nc), LWB = new Float64Array(nc);
  for (let c = 0; c < nc; c++) {
    const wa2 = W[cA[c]], wb = W[cB[c]], ws = wa2 + wb;
    if (!ws) continue;
    // the error is shared out as (d - rest) / d × stiffness / (wa + wb) × the end's weight;
    // the weights are 0 or 1, so the shares are the same numbers to the last bit
    LA[nl] = cA[c] * 3; LB[nl] = cB[c] * 3; LR[nl] = cR[c]; LK[nl] = cK[c] / ws;
    LWA[nl] = wa2; LWB[nl] = wb; nl++;
  }
  {
    const ord = levelOrder(M, LA, LB, nl, 3);
    for (const arr of [LA, LB, LR, LK, LWA, LWB]) {
      const was = arr.slice(0, nl);
      for (let t = 0; t < nl; t++) arr[t] = was[ord[t]];
    }
  }
  if (solve) {
    const I = new Int32Array(mem.buffer), F = new Float64Array(mem.buffer);
    for (let c = 0; c < nl; c++) {
      const o = rec0 + c * 40;
      I[o >> 2] = LA[c] * 8; I[(o >> 2) + 1] = LB[c] * 8;
      F[(o >> 3) + 1] = LR[c]; F[(o >> 3) + 2] = LK[c]; F[(o >> 3) + 3] = LWA[c]; F[(o >> 3) + 4] = LWB[c];
    }
  }
  let nt = 0;
  const TK = new Int32Array(M), TP = new Int32Array(M), TR = new Float64Array(M);
  for (let k = 0; k < M; k++) {
    if (tetherP[k] < 0) continue;
    TK[nt] = k * 3; TP[nt] = pinK[tetherP[k]] * 3; TR[nt] = tetherR[k]; nt++;
  }
  let nf = 0;
  const FK = new Int32Array(M);
  for (let k = 0; k < M; k++) if (W[k]) FK[nf++] = k * 3;
  const pad = 0.6;
  const balls = [], boxes = [], rods = [], poles = [];
  for (const p of props) {
    if (p.k === 'ball') balls.push(p.x, p.y, p.z, p.r + pad);
    else if (p.k === 'box') boxes.push(p.x, p.y, p.z, p.bx + pad, p.by + pad, p.bz + pad);
    else if (p.k === 'rod') rods.push(p.y, p.z, p.r + pad);
    else if (p.k === 'pole') poles.push(p.x, p.y, p.z, p.r);
  }
  const floor = tz + pad, NEAR = 1 + 1e-9;
  // pushed out of what it has fallen into; rubbing against it slows it, on the last round
  const collide = rub => {
    for (let f = 0; f < nf; f++) {
      const q = FK[f];
      let x = P[q], y = P[q + 1], z = P[q + 2], hit = false;
      // the squared distance first, a little generous: only what may touch is measured
      // exactly, as it always was
      for (let b = 0; b < balls.length; b += 4) {
        const dx = x - balls[b], dy = y - balls[b + 1], dz = z - balls[b + 2], r = balls[b + 3];
        if (dx * dx + dy * dy + dz * dz > r * r * NEAR) continue;
        const d = Math.hypot(dx, dy, dz);
        if (d < r && d > 1e-9) { x = balls[b] + dx / d * r; y = balls[b + 1] + dy / d * r; z = balls[b + 2] + dz / d * r; hit = true; }
      }
      for (let b = 0; b < poles.length; b += 4) {
        const px = poles[b], py = poles[b + 1], pz = poles[b + 2], pr = poles[b + 3], r = pr + pad;
        if (z > pz - pr) {
          // over its top, a pole is a ball
          const cz = pz - pr, dx = x - px, dy = y - py, dz = z - cz;
          if (dx * dx + dy * dy + dz * dz > r * r * NEAR) continue;
          const d = Math.hypot(dx, dy, dz);
          if (d < r && d > 1e-9) { x = px + dx / d * r; y = py + dy / d * r; z = cz + dz / d * r; hit = true; }
        } else {
          const dx = x - px, dy = y - py;
          if (dx * dx + dy * dy > r * r * NEAR) continue;
          const d = Math.hypot(dx, dy);
          if (d < r && d > 1e-9) { x = px + dx / d * r; y = py + dy / d * r; hit = true; }
        }
      }
      for (let b = 0; b < rods.length; b += 3) {
        const dy = y - rods[b], dz = z - rods[b + 1], r = rods[b + 2];
        if (dy * dy + dz * dz > r * r * NEAR) continue;
        const d = Math.hypot(dy, dz);
        if (d < r && d > 1e-9) { y = rods[b] + dy / d * r; z = rods[b + 1] + dz / d * r; hit = true; }
      }
      for (let b = 0; b < boxes.length; b += 6) {
        const ox = boxes[b + 3] - Math.abs(x - boxes[b]), oy = boxes[b + 4] - Math.abs(y - boxes[b + 1]);
        const oz = boxes[b + 5] - Math.abs(z - boxes[b + 2]);
        if (ox > 0 && oy > 0 && oz > 0) {
          if (oz <= ox && oz <= oy) z = boxes[b + 2] + Math.sign(z - boxes[b + 2] || 1) * boxes[b + 5];
          else if (ox <= oy) x = boxes[b] + Math.sign(x - boxes[b] || 1) * boxes[b + 3];
          else y = boxes[b + 1] + Math.sign(y - boxes[b + 1] || 1) * boxes[b + 4];
          hit = true;
        }
      }
      if (z < floor) { z = floor; hit = true; }
      if (!hit) continue;
      P[q] = x; P[q + 1] = y; P[q + 2] = z;
      if (rub) {
        O[q] = x - (x - O[q]) * 0.4; O[q + 1] = y - (y - O[q + 1]) * 0.4; O[q + 2] = z - (z - O[q + 2]) * 0.4;
      }
    }
  };

  const steps = clamp(Math.round(s.simTime * (coarse ? 0.6 : 1)), 1, 2000);
  const iters = coarse ? 6 : 12, damp = 0.985, ramp = Math.max(1, Math.round(steps * 0.4));
  const NN = new Float64Array(M * 3);
  for (let step = 0; step < steps; step++) {
    const ease = Math.min(1, (step + 1) / ramp);
    for (let n = 0; n < np; n++) {
      const q = pinK[n] * 3;
      P[q] = O[q] = IX[pinK[n]] + (PT[n * 3] - IX[pinK[n]]) * ease;
      P[q + 1] = O[q + 1] = IY[pinK[n]] + (PT[n * 3 + 1] - IY[pinK[n]]) * ease;
      P[q + 2] = O[q + 2] = IZ[pinK[n]] + (PT[n * 3 + 2] - IZ[pinK[n]]) * ease;
    }
    if (wind) {
      for (let j = 0; j < my; j++) {
        const ju = Math.max(0, j - 1) * mx, jd = Math.min(my - 1, j + 1) * mx;
        for (let i = 0; i < mx; i++) {
          const kl = (j * mx + Math.max(0, i - 1)) * 3, kr = (j * mx + Math.min(mx - 1, i + 1)) * 3;
          const ku = (ju + i) * 3, kd = (jd + i) * 3;
          const ux = P[kr] - P[kl], uy = P[kr + 1] - P[kl + 1], uz = P[kr + 2] - P[kl + 2];
          const vx = P[kd] - P[ku], vy = P[kd + 1] - P[ku + 1], vz = P[kd + 2] - P[ku + 2];
          const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          const nn = Math.hypot(nx, ny, nz) || 1, q = (j * mx + i) * 3;
          NN[q] = nx / nn; NN[q + 1] = ny / nn; NN[q + 2] = nz / nn;
        }
      }
    }
    for (let f = 0; f < nf; f++) {
      const q = FK[f];
      let ax = gvx, ay = gvy, az = gvz;
      if (wind) {
        const g = 1 + gust * 1.6 * NZW(P[q] / 140 - step * 0.035, P[q + 1] / 140, 17.7 + step * 0.01);
        const n1 = NN[q], n2 = NN[q + 1], n3 = NN[q + 2];
        const dn = (wx * n1 + wy * n2 + wz * n3) * wind * g;
        ax += dn * n1 + 0.15 * wind * g * wx;
        ay += dn * n2 + 0.15 * wind * g * wy;
        az += dn * n3 + 0.15 * wind * g * wz;
      }
      const vx = (P[q] - O[q]) * damp, vy = (P[q + 1] - O[q + 1]) * damp, vz = (P[q + 2] - O[q + 2]) * damp;
      O[q] = P[q]; O[q + 1] = P[q + 1]; O[q + 2] = P[q + 2];
      P[q] += vx + ax; P[q + 1] += vy + ay; P[q + 2] += vz + az;
    }
    for (let it = 0; it < iters; it++) {
      if (solve) solve(nl, rec0);
      else for (let c = 0; c < nl; c++) {
        const a = LA[c], b = LB[c];
        const dx = P[b] - P[a], dy = P[b + 1] - P[a + 1], dz = P[b + 2] - P[a + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9;
        const e = (d - LR[c]) / d * LK[c], wa2 = LWA[c], wb = LWB[c];
        P[a] += dx * e * wa2; P[a + 1] += dy * e * wa2; P[a + 2] += dz * e * wa2;
        P[b] -= dx * e * wb; P[b + 1] -= dy * e * wb; P[b + 2] -= dz * e * wb;
      }
      // no point further from its pin than the cloth between them reaches — each point on
      // its own, so all the tethers can go before all the pushing out
      for (let t = 0; t < nt; t++) {
        const q = TK[t], r = TP[t];
        const dx = P[q] - P[r], dy = P[q + 1] - P[r + 1], dz = P[q + 2] - P[r + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > TR[t]) {
          const e = TR[t] / d;
          P[q] = P[r] + dx * e; P[q + 1] = P[r + 1] + dy * e; P[q + 2] = P[r + 2] + dz * e;
        }
      }
      if (into) collide(it === iters - 1);
    }
  }
  for (let k = 0; k < M; k++) { X[k] = P[k * 3]; Y[k] = P[k * 3 + 1]; Z[k] = P[k * 3 + 2]; }

  // the fine cloth rides on the coarse one: each point keeps its offset in the frame the
  // coarse cloth had under it, carried into the frame it has now
  const { nx, ny } = C, N = nx * ny;
  const BI = [new Float64Array(N), new Float64Array(N), new Float64Array(N)];
  const BF = [new Float64Array(N), new Float64Array(N), new Float64Array(N)];
  const grids = [[IX, IY, IZ], [X, Y, Z]];
  // the coarse grid read at every fine point, a curve through four of its points each way:
  // first along every coarse row at the fine columns, then down those at the fine rows
  const across = new Float64Array(my * nx);
  for (let g = 0; g < 2; g++) {
    for (let c = 0; c < 3; c++) {
      const G = grids[g][c], out = (g ? BF : BI)[c];
      for (let i = 0; i < nx; i++) {
        const a = i * C.hx / gx, ci = clamp(Math.floor(a), 0, mx - 2), fa = a - ci;
        const i0 = Math.max(0, ci - 1), i3 = Math.min(mx - 1, ci + 2);
        for (let r = 0; r < my; r++) {
          const o = r * mx;
          across[r * nx + i] = catmull(G[o + i0], G[o + ci], G[o + ci + 1], G[o + i3], fa);
        }
      }
      for (let j = 0; j < ny; j++) {
        const b = j * C.hy / gy, cj = clamp(Math.floor(b), 0, my - 2), fb = b - cj;
        const r0 = clamp(cj - 1, 0, my - 1) * nx, r1 = cj * nx, r2 = clamp(cj + 1, 0, my - 1) * nx;
        const r3 = clamp(cj + 2, 0, my - 1) * nx;
        for (let i = 0; i < nx; i++) {
          out[j * nx + i] = catmull(across[r0 + i], across[r1 + i], across[r2 + i], across[r3 + i], fb);
        }
      }
    }
  }
  const frame = (B, k, i, j, F) => {
    const kl = j * nx + Math.max(0, i - 1), kr = j * nx + Math.min(nx - 1, i + 1);
    const ku = Math.max(0, j - 1) * nx + i, kd = Math.min(ny - 1, j + 1) * nx + i;
    let ux = B[0][kr] - B[0][kl], uy = B[1][kr] - B[1][kl], uz = B[2][kr] - B[2][kl];
    const vx = B[0][kd] - B[0][ku], vy = B[1][kd] - B[1][ku], vz = B[2][kd] - B[2][ku];
    let un = Math.hypot(ux, uy, uz) || 1;
    ux /= un; uy /= un; uz /= un;
    let nx2 = uy * vz - uz * vy, ny2 = uz * vx - ux * vz, nz2 = ux * vy - uy * vx;
    const nn = Math.hypot(nx2, ny2, nz2) || 1;
    nx2 /= nn; ny2 /= nn; nz2 /= nn;
    F[0] = ux; F[1] = uy; F[2] = uz;
    F[3] = ny2 * uz - nz2 * uy; F[4] = nz2 * ux - nx2 * uz; F[5] = nx2 * uy - ny2 * ux;
    F[6] = nx2; F[7] = ny2; F[8] = nz2;
  };
  const F0 = new Float64Array(9), F1 = new Float64Array(9);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      frame(BI, k, i, j, F0);
      frame(BF, k, i, j, F1);
      const rx = PX[k] - BI[0][k], ry = PY[k] - BI[1][k], rz = PZ[k] - BI[2][k];
      const l0 = rx * F0[0] + ry * F0[1] + rz * F0[2];
      const l1 = rx * F0[3] + ry * F0[4] + rz * F0[5];
      const l2 = rx * F0[6] + ry * F0[7] + rz * F0[8];
      PX[k] = BF[0][k] + l0 * F1[0] + l1 * F1[3] + l2 * F1[6];
      PY[k] = BF[1][k] + l0 * F1[1] + l1 * F1[4] + l2 * F1[7];
      PZ[k] = BF[2][k] + l0 * F1[2] + l1 * F1[5] + l2 * F1[8];
    }
  }
  C.sim = { mx, my, gx, gy, props, tz, pins: pinK.length };
}

////////////////////////////////////////////////////////////////////////////////////////
// Seen from

// Turned about the upright of the sheet, tilted back and turned to the side, put into
// perspective if asked, and fitted to the picture: SX, SY are millimetres of the sheet, SD
// how near the viewer a point is.
function viewCloth(C, PX, PY, PZ) {
  const s = settings, A = area, N = PX.length;
  const t = rad(s.viewTurn), al = rad(s.viewTilt), be = rad(s.viewSide);
  const ct = Math.cos(t), st = Math.sin(t), ca = Math.cos(al), sa = Math.sin(al);
  const cb = Math.cos(be), sb = Math.sin(be);
  // world → view, a row each: x across the sheet, y down it, z to the viewer — turned
  // about z, tilted about x, turned to the side about y
  const r1 = [ct, -st, 0], r2 = [st, ct, 0];
  const y2 = [r2[0] * ca, r2[1] * ca, -sa], z2 = [r2[0] * sa, r2[1] * sa, ca];
  const M = [r1[0] * cb + z2[0] * sb, r1[1] * cb + z2[1] * sb, r1[2] * cb + z2[2] * sb,
             y2[0], y2[1], y2[2],
             -r1[0] * sb + z2[0] * cb, -r1[1] * sb + z2[1] * cb, -r1[2] * sb + z2[2] * cb];
  const persp = clamp(s.perspective, 0, 100) / 100;
  const dist = persp > 0 ? Math.hypot(A.w, A.h) * (0.6 / persp + 0.4) : 0;
  const VX = new Float64Array(N), VY = new Float64Array(N), VZ = new Float64Array(N);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let k = 0; k < N; k++) {
    const x = PX[k], y = PY[k], z = PZ[k];
    let vx = M[0] * x + M[1] * y + M[2] * z, vy = M[3] * x + M[4] * y + M[5] * z;
    const vz = M[6] * x + M[7] * y + M[8] * z;
    if (dist) { const f = dist / Math.max(dist * 0.05, dist - vz); vx *= f; vy *= f; }
    VX[k] = vx; VY[k] = vy; VZ[k] = vz;
    if (vx < x0) x0 = vx;
    if (vx > x1) x1 = vx;
    if (vy < y0) y0 = vy;
    if (vy > y1) y1 = vy;
  }
  let g = clamp(s.clothZoom, MIN_VIEW, MAX_VIEW) / 100, ox = 0, oy = 0;
  if (s.clothFit) {
    g *= 0.97 * Math.min(A.w / Math.max(1e-6, x1 - x0), A.h / Math.max(1e-6, y1 - y0));
    ox = (x0 + x1) / 2; oy = (y0 + y1) / 2;
  }
  const cx = (A.x0 + A.x1) / 2 + s.clothX, cy = (A.y0 + A.y1) / 2 + s.clothY;
  const SX = new Float32Array(N), SY = new Float32Array(N), SD = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    SX[k] = cx + (VX[k] - ox) * g; SY[k] = cy + (VY[k] - oy) * g; SD[k] = VZ[k] * g;
  }
  Object.assign(C, { SX, SY, SD, VX, VY, VZ, M, g, ox, oy, cx, cy, dist });
}

// Light on the cloth: a point is darker by as much as it is turned further from the light
// than the flat sheet would be, and lighter by as much as it is turned toward it; and
// darker in the hollows — wherever it lies deeper than the cloth round it.
function shadeCloth(C) {
  const s = settings, { nx, ny, VX, VY, VZ } = C, N = nx * ny;
  const k1 = s.shade / 100 * 1.4, k2 = s.hollows / 100;
  const FACE = new Int8Array((nx - 1) * (ny - 1));
  for (let j = 0; j + 1 < ny; j++) {
    for (let i = 0; i + 1 < nx; i++) {
      const a = j * nx + i, b = a + nx + 1, c = a + nx, d = a + 1;
      const det = (C.SX[b] - C.SX[a]) * (C.SY[c] - C.SY[d]) - (C.SY[b] - C.SY[a]) * (C.SX[c] - C.SX[d]);
      FACE[j * (nx - 1) + i] = det >= 0 ? 1 : -1;
    }
  }
  C.FACE = FACE;
  C.SH = null;
  if (!k1 && !k2) return;
  const SH = new Float32Array(N);
  const la = rad(s.lightFrom), le = rad(clamp(s.lightHigh, 1, 90));
  const lx = Math.sin(la) * Math.cos(le), ly = -Math.cos(la) * Math.cos(le), lz = Math.sin(le);
  if (k1) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i, kl = j * nx + Math.max(0, i - 1), kr = j * nx + Math.min(nx - 1, i + 1);
        const ku = Math.max(0, j - 1) * nx + i, kd = Math.min(ny - 1, j + 1) * nx + i;
        const ux = VX[kr] - VX[kl], uy = VY[kr] - VY[kl], uz = VZ[kr] - VZ[kl];
        const vx = VX[kd] - VX[ku], vy = VY[kd] - VY[ku], vz = VZ[kd] - VZ[ku];
        let n1 = uy * vz - uz * vy, n2 = uz * vx - ux * vz, n3 = ux * vy - uy * vx;
        const nn = Math.hypot(n1, n2, n3) || 1;
        if (n3 < 0) { n1 = -n1; n2 = -n2; n3 = -n3; }
        const lit = Math.max(0, (n1 * lx + n2 * ly + n3 * lz) / nn);
        SH[k] = k1 * (lz - lit);
      }
    }
  }
  if (k2) {
    // the cloth round a point: its depth blurred over a few centimetres
    const r = Math.max(1, Math.round(Math.max(6, s.foldLen * 0.6) / Math.min(C.hx, C.hy)));
    const B = blurGrid(Float32Array.from(VZ), nx, ny, r);
    const depth = Math.max(2, r * Math.min(C.hx, C.hy) * 0.4);
    for (let k = 0; k < N; k++) SH[k] += k2 * clamp((B[k] - VZ[k]) / depth, 0, 1);
  }
  C.SH = SH;
}

// Which part of the cloth is nearest the viewer at every cell of the sheet, and where on
// the flat picture that part is — so a point of a line can tell whether it is the one seen.
function depthBuffer(C, coarse) {
  const { nx, ny, SX, SY, SD, hx, hy } = C;
  const [W, H] = paperDims();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let k = 0; k < SX.length; k++) {
    if (SX[k] < x0) x0 = SX[k];
    if (SX[k] > x1) x1 = SX[k];
    if (SY[k] < y0) y0 = SY[k];
    if (SY[k] > y1) y1 = SY[k];
  }
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W, x1); y1 = Math.min(H, y1);
  const px = Math.max(0.15, Math.sqrt(Math.max(1, (x1 - x0) * (y1 - y0)) / CLOTH_PX)) * (coarse ? 2 : 1);
  const w = Math.max(1, Math.ceil((x1 - x0) / px) + 1), h = Math.max(1, Math.ceil((y1 - y0) / px) + 1);
  // a cell is four numbers side by side — depth, then u and v on the flat picture, then how
  // many millimetres of the picture a millimetre of the sheet holds there — so one reading
  // of it is one trip to memory
  const B = new Float32Array(w * h * 4);
  for (let p = 0; p < B.length; p += 4) B[p] = -Infinity;
  // every point of the grid in cells of the buffer, once — each is a corner of six triangles
  const N = SX.length, GX = new Float64Array(N), GY = new Float64Array(N);
  for (let k = 0; k < N; k++) { GX[k] = (SX[k] - x0) / px - 0.5; GY[k] = (SY[k] - y0) / px - 0.5; }
  const tri = (a, b, c, ua, va, ub, vb, uc, vc, ratio) => {
    const ax = GX[a], ay = GY[a], bx = GX[b], by = GY[b], cx = GX[c], cy = GY[c];
    const area2 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(area2) < 1e-12) return;
    const i0 = Math.max(0, Math.ceil(Math.min(ax, bx, cx))), i1 = Math.min(w - 1, Math.floor(Math.max(ax, bx, cx)));
    const j0 = Math.max(0, Math.ceil(Math.min(ay, by, cy))), j1 = Math.min(h - 1, Math.floor(Math.max(ay, by, cy)));
    if (i0 > i1 || j0 > j1) return;
    const inv = 1 / area2, da = SD[a], db = SD[b], dc = SD[c];
    const e1x = cx - bx, e1y = cy - by, e2x = ax - cx, e2y = ay - cy;
    for (let j = j0; j <= j1; j++) {
      const r1 = e1x * (j - by), r2 = e2x * (j - cy);
      let p = (j * w + i0) * 4;
      for (let i = i0; i <= i1; i++, p += 4) {
        const l1 = (r1 - e1y * (i - bx)) * inv;
        if (l1 < -1e-6) continue;
        const l2 = (r2 - e2y * (i - cx)) * inv;
        const l3 = 1 - l1 - l2;
        if (l2 < -1e-6 || l3 < -1e-6) continue;
        const d = l1 * da + l2 * db + l3 * dc;
        if (d <= B[p]) continue;
        B[p] = d; B[p + 1] = l1 * ua + l2 * ub + l3 * uc; B[p + 2] = l1 * va + l2 * vb + l3 * vc; B[p + 3] = ratio;
      }
    }
  };
  const cellArea = hx * hy;
  for (let j = 0; j + 1 < ny; j++) {
    const v0 = C.y0 + j * hy, v1 = v0 + hy;
    for (let i = 0; i + 1 < nx; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx + 1, d = a + nx;
      const u0 = C.x0 + i * hx, u1 = u0 + hx;
      const scr = Math.abs((SX[c] - SX[a]) * (SY[d] - SY[b]) - (SY[c] - SY[a]) * (SX[d] - SX[b])) / 2;
      const ratio = Math.min(30, Math.sqrt(cellArea / Math.max(1e-9, scr)));
      tri(a, b, c, u0, v0, u1, v0, u1, v1, ratio);
      tri(a, c, d, u0, v0, u1, v1, u0, v1, ratio);
    }
  }
  C.zb = { x0, y0, w, h, px, B };
}

////////////////////////////////////////////////////////////////////////////////////////
// From the flat picture to the cloth

// Where a place of the flat picture has gone on the sheet: CM holds x, y, how near the
// viewer it is and which way the cloth faces there.
const CM = new Float64Array(4);

// What the lines read of the cloth at every step, in one object made at once: the cloth
// itself gathers so many fields one by one that the engine stops keeping them quick to read.
let CF = null;

function clothFast(C, coarse) {
  const s = settings, Z = C.zb, J = C.spread || (C.spread = clothSpread(C));
  return {
    nx: C.nx, ny: C.ny, x0: C.x0, y0: C.y0, hx: C.hx, hy: C.hy,
    SX: C.SX, SY: C.SY, SD: C.SD, FACE: C.FACE, SH: C.SH,
    XU: J.XU, YU: J.YU, XV: J.XV, YV: J.YV,
    zx0: Z.x0, zy0: Z.y0, zpx: Z.px, zw: Z.w, zh: Z.h, ZB: Z.B,
    // read every 0.8 of a cell — while a drag lasts twice as far, and not straightened: the
    // points cost less to keep than to weigh
    step: 0.8 * Math.min(C.hx, C.hy) * (coarse ? 2 : 1), tol: coarse ? 0 : SIMPLIFY,
    hidden: !!s.hidden,
    back: { 'printed through': 1, 'bare': 0, 'other pen': 2 }[s.clothBack] ?? 1,
    backPen: penIdx(s.backPen), reads: 0, unseen: 0,
  };
}

// How the cloth spreads the flat picture over the sheet, a cell at a time: where a step
// along u and a step along v of the picture go on the sheet, against the scale the whole
// cloth was fitted with — 1 where it lies square to the viewer.
function clothSpread(C) {
  const { nx, ny, SX, SY } = C, n = (nx - 1) * (ny - 1), ku = 0.5 / (C.hx * C.g), kv = 0.5 / (C.hy * C.g);
  const XU = new Float32Array(n), YU = new Float32Array(n), XV = new Float32Array(n), YV = new Float32Array(n);
  for (let j = 0; j + 1 < ny; j++) {
    for (let i = 0; i + 1 < nx; i++) {
      const o = j * nx + i, c = j * (nx - 1) + i;
      XU[c] = (SX[o + 1] - SX[o] + SX[o + nx + 1] - SX[o + nx]) * ku;
      YU[c] = (SY[o + 1] - SY[o] + SY[o + nx + 1] - SY[o + nx]) * ku;
      XV[c] = (SX[o + nx] - SX[o] + SX[o + nx + 1] - SX[o + 1]) * kv;
      YV[c] = (SY[o + nx] - SY[o] + SY[o + nx + 1] - SY[o + 1]) * kv;
    }
  }
  return { XU, YU, XV, YV };
}

// How far apart two lines of the flat picture, a step apart the way (px, py), come out on
// the sheet at (u, v), against the fitted scale: under 1 where the cloth turns away and
// the lines crowd, over 1 where it comes nearer than the rest. Measured square to the
// lines as they run there, which a shear makes nearer than the step itself.
function clothAcross(u, v, px, py) {
  const C = CF, gx = C.nx - 1;
  let a = (u - C.x0) / C.hx, b = (v - C.y0) / C.hy;
  if (a < 0) a = 0; else if (a > gx - 0.000001) a = gx - 0.000001;
  if (b < 0) b = 0; else if (b > C.ny - 1.000001) b = C.ny - 1.000001;
  const c = (b | 0) * gx + (a | 0);
  const xu = C.XU[c], yu = C.YU[c], xv = C.XV[c], yv = C.YV[c];
  const across = Math.hypot(xu * px + xv * py, yu * px + yv * py);
  const along = Math.hypot(xv * px - xu * py, yv * px - yu * py);
  const square = Math.abs(xu * yv - xv * yu) / Math.max(along, 1e-9);
  return square < across ? square : across;
}

function clothAt(u, v) {
  const C = CF, nx = C.nx;
  let a = (u - C.x0) / C.hx, b = (v - C.y0) / C.hy;
  if (a < 0) a = 0; else if (a > nx - 1.000001) a = nx - 1.000001;
  if (b < 0) b = 0; else if (b > C.ny - 1.000001) b = C.ny - 1.000001;
  const i = a | 0, j = b | 0, fa = a - i, fb = b - j, o = j * nx + i;
  const X = C.SX, Y = C.SY, D = C.SD;
  const xa = X[o] + (X[o + 1] - X[o]) * fa, xb = X[o + nx] + (X[o + nx + 1] - X[o + nx]) * fa;
  const ya = Y[o] + (Y[o + 1] - Y[o]) * fa, yb = Y[o + nx] + (Y[o + nx + 1] - Y[o + nx]) * fa;
  const da = D[o] + (D[o + 1] - D[o]) * fa, db = D[o + nx] + (D[o + nx + 1] - D[o + nx]) * fa;
  CM[0] = xa + (xb - xa) * fb; CM[1] = ya + (yb - ya) * fb; CM[2] = da + (db - da) * fb;
  CM[3] = C.FACE[j * (nx - 1) + i];
}

// Whether the place just carried over is the part of the cloth seen there: it is, if it is
// as near the viewer as the nearest, or if the nearest is the same place of the cloth.
function clothSeen(u, v) {
  const Z = CF;
  const i = Math.round((CM[0] - Z.zx0) / Z.zpx - 0.5), j = Math.round((CM[1] - Z.zy0) / Z.zpx - 0.5);
  if (i < 0 || j < 0 || i >= Z.zw || j >= Z.zh) return true;
  const B = Z.ZB, p = (j * Z.zw + i) * 4, d = B[p];
  if (d === -Infinity || CM[2] >= d - 0.05) return true;
  const du = u - B[p + 1], dv = v - B[p + 2], tol = Math.max(0.9, 2.5 * Z.zpx * B[p + 3]);
  return du * du + dv * dv < tol * tol;
}

// 0 — not drawn there; 1 — drawn in its own pen; 2 — in the pen of the back.
function clothClass(u, v) {
  clothAt(u, v);
  if (CF.hidden && !clothSeen(u, v)) return 0;
  return CM[3] < 0 && LAY !== L_EDGE ? CF.back : 1;
}

let OX = new Float64Array(4096), OY = new Float64Array(4096), ON = 0;

function oPush(x, y) {
  if (ON >= OX.length) {
    const grow = a => { const b = new Float64Array(a.length * 2); b.set(a); return b; };
    OX = grow(OX); OY = grow(OY);
  }
  OX[ON] = x; OY[ON] = y;
  ON++;
}

// A stroke of the flat picture carried onto the cloth: read in steps finer than the cloth's
// grid, cut where it goes behind a fold or round to the back, each end found between two
// steps, and every piece into the sink in its pen. One loop and no closures over the
// numbers that change at every step — the engine would box each of them anew otherwise.
function clothEmit(xs, ys, n) {
  const C = CF, step = C.step, pen0 = PEN;
  let cls = -1, pu = 0, pv = 0, reads = 0, unseen = 0;
  ON = 0;
  for (let i = 0; i < n; i++) {
    let m = 1, x0 = 0, y0 = 0, dx = 0, dy = 0;
    if (i > 0) {
      x0 = xs[i - 1]; y0 = ys[i - 1]; dx = xs[i] - x0; dy = ys[i] - y0;
      m = Math.max(1, Math.ceil(Math.hypot(dx, dy) / step));
    }
    for (let q = 1; q <= m; q++) {
      const u = i > 0 ? x0 + dx * q / m : xs[0], v = i > 0 ? y0 + dy * q / m : ys[0];
      const k = clothClass(u, v);
      reads++;
      if (k === 0) unseen++;
      if (cls >= 0 && k !== cls) {
        const x = CM[0], y = CM[1];
        let lo = 0, hi = 1;
        for (let it = 0; it < 7; it++) {
          const t = (lo + hi) / 2;
          if (clothClass(pu + (u - pu) * t, pv + (v - pv) * t) === cls) lo = t; else hi = t;
        }
        if (cls > 0) { clothAt(pu + (u - pu) * lo, pv + (v - pv) * lo); oPush(CM[0], CM[1]); }
        clothFlush(cls, pen0);
        if (k > 0) { clothAt(pu + (u - pu) * hi, pv + (v - pv) * hi); oPush(CM[0], CM[1]); }
        CM[0] = x; CM[1] = y;
      }
      if (k > 0) oPush(CM[0], CM[1]);
      cls = k; pu = u; pv = v;
    }
  }
  clothFlush(cls, pen0);
  C.reads += reads; C.unseen += unseen;
}

function clothFlush(k, pen0) {
  if (k > 0 && ON >= 2) {
    const m = CF.tol > 0 ? simplify(OX, OY, ON, CF.tol) : ON;
    PEN = k === 2 ? CF.backPen : pen0;
    emitFlat(OX, OY, m);
    PEN = pen0;
  }
  ON = 0;
}

// The tone a line swells with, shaded by the cloth.
function clothTone(x, y) {
  const t = toneAt(x, y) + fineAt(CF.SH, CF, x, y);
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

// The edge of the cloth, and — if asked — where it folds out of sight: wherever it turns
// from facing the viewer to facing away, followed through the grid as level lines.
function clothEdges() {
  const s = settings;
  if (!CLOTH || s.clothEdge === 'none') return;
  const C = CLOTH, A = area;
  PEN = penIdx(s.edgePen); LAY = L_EDGE;
  const e = 0.001;
  clothEmit([A.x0 + e, A.x1 - e, A.x1 - e, A.x0 + e, A.x0 + e],
            [A.y0 + e, A.y0 + e, A.y1 - e, A.y1 - e, A.y0 + e], 5);
  if (s.clothEdge !== 'hem and folds') return;
  const { nx, ny, SX, SY } = C, N = nx * ny;
  const F = new Float64Array(N);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i, kl = j * nx + Math.max(0, i - 1), kr = j * nx + Math.min(nx - 1, i + 1);
      const ku = Math.max(0, j - 1) * nx + i, kd = Math.min(ny - 1, j + 1) * nx + i;
      F[k] = (SX[kr] - SX[kl]) * (SY[kd] - SY[ku]) - (SY[kr] - SY[kl]) * (SX[kd] - SX[ku]);
      if (F[k] === 0) F[k] = 1e-12;
    }
  }
  for (const line of levelLines(F, nx, ny)) {
    const xs = line.map(p => C.x0 + p[0] * C.hx), ys = line.map(p => C.y0 + p[1] * C.hy);
    if (xs.length >= 2) clothEmit(xs, ys, xs.length);
  }
}

// Where a grid crosses 0, as polylines in grid units: marching squares, the pieces joined
// end to end by the cell edges they share.
function levelLines(F, nx, ny) {
  const pt = new Map(), next = new Map();
  const edgeId = (i, j, vert) => ((j * nx + i) << 1) | vert;
  const at = (i, j, vert) => {
    const id = edgeId(i, j, vert);
    if (!pt.has(id)) {
      const a = F[j * nx + i], b = vert ? F[(j + 1) * nx + i] : F[j * nx + i + 1], t = a / (a - b);
      pt.set(id, vert ? [i, j + t] : [i + t, j]);
    }
    return id;
  };
  const join = (p, q) => {
    if (!next.has(p)) next.set(p, []);
    if (!next.has(q)) next.set(q, []);
    next.get(p).push(q); next.get(q).push(p);
  };
  for (let j = 0; j + 1 < ny; j++) {
    for (let i = 0; i + 1 < nx; i++) {
      const a = F[j * nx + i] > 0, b = F[j * nx + i + 1] > 0, c = F[(j + 1) * nx + i + 1] > 0, d = F[(j + 1) * nx + i] > 0;
      const cut = [];
      if (a !== b) cut.push(at(i, j, 0));
      if (b !== c) cut.push(at(i + 1, j, 1));
      if (d !== c) cut.push(at(i, j + 1, 0));
      if (a !== d) cut.push(at(i, j, 1));
      if (cut.length === 2) join(cut[0], cut[1]);
      else if (cut.length === 4) { join(cut[0], cut[1]); join(cut[2], cut[3]); }
    }
  }
  const used = new Set(), lines = [];
  const walk = start => {
    const line = [start];
    used.add(start);
    let cur = start;
    for (;;) {
      const nb = (next.get(cur) || []).find(q => !used.has(q));
      if (nb === undefined) break;
      used.add(nb); line.push(nb); cur = nb;
    }
    return line;
  };
  for (const [id, nb] of next) if (nb.length === 1 && !used.has(id)) lines.push(walk(id));
  for (const id of next.keys()) {
    if (used.has(id)) continue;
    const line = walk(id);
    line.push(id);
    lines.push(line);
  }
  return lines.map(l => l.map(id => pt.get(id)));
}

////////////////////////////////////////////////////////////////////////////////////////
// Shaping it by hand
//
// With a tool picked, the sheet is the cloth: a drag lays a fold along it (a ridge, or with
// shift a valley); a pinch gathers it at a point into folds round a peak; a bump raises it
// (with shift dents it), a drag setting how far either reaches; a pin holds the place
// clicked and a drag moves it, the wheel over it lifts it toward the viewer or lets it
// back. Over anything made by hand the wheel deepens or flattens it, with shift widens or
// narrows it; a drag moves it, a right-click or the eraser takes it away.

function clothPick(p) {
  const C = CLOTH, Z = C && C.zb;
  if (!Z) return null;
  const i0 = Math.round((p[0] - Z.x0) / Z.px - 0.5), j0 = Math.round((p[1] - Z.y0) / Z.px - 0.5);
  for (let r = 0; r <= 6; r++) {
    for (let j = j0 - r; j <= j0 + r; j++) {
      for (let i = i0 - r; i <= i0 + r; i++) {
        if (Math.max(Math.abs(i - i0), Math.abs(j - j0)) !== r) continue;
        if (i < 0 || j < 0 || i >= Z.w || j >= Z.h) continue;
        const q = (j * Z.w + i) * 4;
        if (Z.B[q] !== -Infinity) return [(Z.B[q + 1] - area.x0) / area.w, (Z.B[q + 2] - area.y0) / area.h];
      }
    }
  }
  return null;
}

function handOnSheet(u, v) {
  clothAt(area.x0 + u * area.w, area.y0 + v * area.h);
  return [CM[0], CM[1]];
}

// The grips of everything made by hand, where they stand on the sheet.
function handGrips() {
  const out = [];
  if (!CLOTH) return out;
  HAND.forEach((h, n) => {
    if (h.t === 'f') {
      out.push({ n, g: 0, p: handOnSheet(h.u1, h.v1) }, { n, g: 1, p: handOnSheet(h.u2, h.v2) },
               { n, g: 2, p: handOnSheet((h.u1 + h.u2) / 2, (h.v1 + h.v2) / 2) });
    } else {
      out.push({ n, g: 2, p: handOnSheet(h.u, h.v) });
    }
  });
  return out;
}

function handHit(p, reach) {
  let best = null, bd = reach;
  for (const g of handGrips()) {
    const d = Math.hypot(g.p[0] - p[0], g.p[1] - p[1]);
    if (d < bd) { bd = d; best = g; }
  }
  return best;
}

function handSave(record) {
  if (record) {
    HAND_UNDO.push(settings.clothHand);
    if (HAND_UNDO.length > 200) HAND_UNDO.shift();
  }
  settings.clothHand = handString(HAND);
  if (setters.clothHand) setters.clothHand(settings.clothHand);
  updateHandNote();
}

function handUndo() {
  if (!HAND_UNDO.length) return;
  settings.clothHand = HAND_UNDO.pop();
  HAND = parseHand(settings.clothHand);
  updateHandNote();
  update();
}

function handClear() {
  if (!HAND.length) return;
  HAND = [];
  handSave(true);
  update();
}

function setClothTool(t) {
  clothTool = CLOTH_TOOLS.includes(t) ? t : 'off';
  for (const sel of toolSels) sel.selected(clothTool);
  if (toolDoes) toolDoes.textContent = toolDoes.title = CLOTH_TOOL_NAMES[clothTool][1];
  const c = canvasEl();
  if (c) c.classList.toggle('shaping', clothTool !== 'off' && settings.cloth);
  drawOverlay();
}

// A pin moved over the sheet by so many millimetres of it: as far in the cloth's own space,
// in the plane the viewer sees.
function pinShift(h, dx, dy, dz) {
  const C = CLOTH, M = C.M, g = C.g || 1;
  const vx = dx / g, vy = dy / g, vz = dz;
  h.dx += M[0] * vx + M[3] * vy + M[6] * vz;
  h.dy += M[1] * vx + M[4] * vy + M[7] * vz;
  h.dz += M[2] * vx + M[5] * vy + M[8] * vz;
}

let hand = null;             // the press in hand: making something, or moving it
let handHover = null;

function handDown(e, p) {
  const reach = 9 * paperDims()[0] / canvasEl().getBoundingClientRect().width;
  const hit = handHit(p, reach);
  if (hit && (clothTool === 'erase' || e.button === 2)) {
    HAND.splice(hit.n, 1);
    handSave(true);
    handHover = null;
    update();
    return null;
  }
  if (clothTool === 'erase' || e.button !== 0) return null;
  if (hit) {
    HAND_UNDO.push(settings.clothHand);
    const h = HAND[hit.n];
    return { kind: 'move', hit, p0: p, last: p, m0: clothPick(p), was: { ...h } };
  }
  const m = clothPick(p);
  if (!m) return null;
  if (clothTool === 'pin') {
    if (settings.gravity === 'none') {
      settings.gravity = 'down the sheet';
      if (setters.gravity) setters.gravity(settings.gravity);
      syncVisibility();
    }
    HAND.push({ t: 'n', u: m[0], v: m[1], dx: 0, dy: 0, dz: 0 });
    handSave(true);
    return { kind: 'move', hit: { n: HAND.length - 1, g: 2 }, p0: p, last: p, m0: m, was: { ...HAND[HAND.length - 1] } };
  }
  return { kind: 'make', tool: clothTool, p0: p, p1: p, m0: m, shift: e.shiftKey };
}

function handMove(p) {
  if (!hand) return false;
  if (hand.kind === 'make') { hand.p1 = p; drawOverlay(); return false; }
  const h = HAND[hand.hit.n];
  if (!h) return false;
  if (h.t === 'n') {
    pinShift(h, p[0] - hand.last[0], p[1] - hand.last[1], 0);
    hand.last = p;
  } else {
    const m = clothPick(p);
    if (!m) return false;
    if (h.t === 'f' && hand.hit.g === 0) { h.u1 = m[0]; h.v1 = m[1]; }
    else if (h.t === 'f' && hand.hit.g === 1) { h.u2 = m[0]; h.v2 = m[1]; }
    else if (h.t === 'f') {
      if (!hand.m0) return false;
      const du = m[0] - hand.m0[0], dv = m[1] - hand.m0[1], w = hand.was;
      h.u1 = w.u1 + du; h.v1 = w.v1 + dv; h.u2 = w.u2 + du; h.v2 = w.v2 + dv;
    } else { h.u = m[0]; h.v = m[1]; }
  }
  handSave(false);
  return true;
}

function handUp(p) {
  const H0 = hand;
  hand = null;
  if (!H0) return false;
  if (H0.kind === 'move') return true;
  const A = area, m1 = clothPick(p) || H0.m0;
  const du = (m1[0] - H0.m0[0]) * A.w, dv = (m1[1] - H0.m0[1]) * A.h, len = Math.hypot(du, dv);
  const sg = H0.shift ? -1 : 1;
  if (H0.tool === 'fold') {
    if (len < 3) { drawOverlay(); return false; }
    const w = clamp(len * 0.16, 3, 40);
    HAND.push({ t: 'f', u1: H0.m0[0], v1: H0.m0[1], u2: m1[0], v2: m1[1], d: sg * w * 0.55, w });
  } else {
    const r = Math.max(4, len || 12);
    HAND.push({ t: H0.tool === 'pinch' ? 'p' : 'b', u: H0.m0[0], v: H0.m0[1], r,
                d: sg * r * (H0.tool === 'pinch' ? 0.45 : 0.35) });
  }
  handSave(true);
  return true;
}

// The wheel over something made by hand: deeper or flatter, with shift wider or narrower;
// over a pin, nearer the viewer or further.
function handWheel(p, delta, shift) {
  const reach = 9 * paperDims()[0] / canvasEl().getBoundingClientRect().width;
  const hit = handHit(p, reach);
  if (!hit) return false;
  const h = HAND[hit.n], k = Math.exp(-delta * 0.002);
  if (!handWheel.rec) { HAND_UNDO.push(settings.clothHand); handWheel.rec = true; }
  clearTimeout(handWheel.timer);
  handWheel.timer = setTimeout(() => { handWheel.rec = false; }, 600);
  if (h.t === 'n') pinShift(h, 0, 0, -delta * (shift ? 0.01 : 0.05));
  else if (shift && h.t === 'f') h.w = clamp(h.w * k, 0.5, 400);
  else if (shift) h.r = clamp(h.r * k, 1, 2000);
  else h.d = clamp(h.d * k, -2000, 2000);
  handSave(false);
  return true;
}

////////////////////////////////////////////////////////////////////////////////////////
// The overlay: what was made by hand, and the guides while the card draws the strokes —
// drawn over the sheet and never plotted

let OVERLAY = null, handNote = null;
let TOOLBAR = null, toolDoes = null;
const toolSels = [];         // every list of the tools, kept on the one in hand

function makeOverlay() {
  OVERLAY = document.createElement('canvas');
  OVERLAY.className = 'overlay';
  document.getElementById('sheet').appendChild(OVERLAY);
}

// A list of the tools by name; whichever list one is picked in, all of them show it.
function addToolSelect(parent) {
  const sel = createSelect().parent(parent);
  for (const t of CLOTH_TOOLS) sel.option(CLOTH_TOOL_NAMES[t][0], t);
  sel.selected(clothTool);
  sel.changed(() => { sel.elt.blur(); setClothTool(sel.value()); });
  toolSels.push(sel);
  return sel;
}

// The tools over the sheet, where they are used: there while the picture is on a cloth.
function makeToolbar() {
  TOOLBAR = createDiv('').id('toolbar').elt;
  document.getElementById('canvas-container').insertBefore(TOOLBAR, document.getElementById('sheet'));
  createSpan('Tool').parent(TOOLBAR).class('label');
  addToolSelect(TOOLBAR);
  toolDoes = createSpan('').parent(TOOLBAR).class('does').elt;
  toolDoes.textContent = toolDoes.title = CLOTH_TOOL_NAMES[clothTool][1];
  createSpan('<kbd>T</kbd> next · <kbd>Esc</kbd> none · <kbd>U</kbd> undo')
    .parent(TOOLBAR).class('keys');
  TOOLBAR.style.display = 'none';
}

function syncToolbar() {
  if (!TOOLBAR) return;
  const want = settings.cloth ? '' : 'none';
  if (TOOLBAR.style.display === want) return;
  TOOLBAR.style.display = want;
  applyCanvasDisplay();
}

function drawOverlay() {
  if (!OVERLAY) return;
  const c = canvasEl();
  if (!c) return;
  const r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if (OVERLAY.width !== w || OVERLAY.height !== h) { OVERLAY.width = w; OVERLAY.height = h; }
  OVERLAY.style.width = r.width + 'px';
  OVERLAY.style.height = r.height + 'px';
  const onCard = GLS && GLS.canvas.style.display !== 'none';
  if (GLS) { GLS.canvas.style.width = r.width + 'px'; GLS.canvas.style.height = r.height + 'px'; }
  const ctx = OVERLAY.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const guides = onCard && (settings.showGuides || drag), shaping = CLOTH && settings.cloth &&
    (clothTool !== 'off' || settings.showGuides);
  if (!guides && !shaping) return;
  const [W] = paperDims(), k = w / W, px = 1 / k * dpr;   // a css pixel, in mm
  ctx.setTransform(k, 0, 0, k, 0, 0);
  if (guides) drawGuides(ctx);
  if (!shaping) return;
  const A = area;
  // the hem, for knowing where the cloth is
  ctx.strokeStyle = 'rgba(26, 109, 209, 0.55)';
  ctx.lineWidth = px;
  ctx.setLineDash([4 * px, 3 * px]);
  ctx.beginPath();
  const n = 200;
  for (let q = 0; q <= 4 * n; q++) {
    const side = Math.floor(q / n) % 4, t = (q % n) / n;
    const u = side === 0 ? t : side === 1 ? 1 : side === 2 ? 1 - t : 0;
    const v = side === 0 ? 0 : side === 1 ? t : side === 2 ? 1 : 1 - t;
    const [x, y] = handOnSheet(u, v);
    if (q) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  const along = (u1, v1, u2, v2) => {
    ctx.beginPath();
    for (let q = 0; q <= 24; q++) {
      const [x, y] = handOnSheet(u1 + (u2 - u1) * q / 24, v1 + (v2 - v1) * q / 24);
      if (q) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
  };
  const ring = (u, v, rmm) => {
    ctx.beginPath();
    for (let q = 0; q <= 48; q++) {
      const a = q / 48 * 2 * Math.PI;
      const [x, y] = handOnSheet(u + Math.cos(a) * rmm / A.w, v + Math.sin(a) * rmm / A.h);
      if (q) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
  };
  const dot = (p, r, fill) => {
    ctx.beginPath();
    ctx.arc(p[0], p[1], r, 0, 2 * Math.PI);
    if (fill) ctx.fill();
    ctx.stroke();
  };
  HAND.forEach((h, i) => {
    const hot = handHover && handHover.n === i;
    const col = h.t === 'n' ? '#7a3fd1' : h.d >= 0 ? '#1a6dd1' : '#d1661a';
    ctx.strokeStyle = col;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = (hot ? 2.5 : 1.5) * px;
    if (h.t === 'f') {
      along(h.u1, h.v1, h.u2, h.v2);
      dot(handOnSheet(h.u1, h.v1), 4 * px, true);
      dot(handOnSheet(h.u2, h.v2), 4 * px, true);
      const m = handOnSheet((h.u1 + h.u2) / 2, (h.v1 + h.v2) / 2);
      ctx.fillRect(m[0] - 3 * px, m[1] - 3 * px, 6 * px, 6 * px);
      ctx.strokeRect(m[0] - 3 * px, m[1] - 3 * px, 6 * px, 6 * px);
    } else if (h.t === 'n') {
      const p = handOnSheet(h.u, h.v);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + 6 * px, p[1] - 9 * px);
      ctx.stroke();
      dot([p[0] + 7 * px, p[1] - 10.5 * px], 3.5 * px, true);
    } else {
      ctx.setLineDash(h.t === 'p' ? [3 * px, 2 * px] : []);
      ring(h.u, h.v, h.r);
      ctx.setLineDash([]);
      dot(handOnSheet(h.u, h.v), 4 * px, true);
    }
  });
  if (hand && hand.kind === 'make') {
    ctx.strokeStyle = hand.shift ? '#d1661a' : '#1a6dd1';
    ctx.lineWidth = 1.5 * px;
    ctx.setLineDash([3 * px, 2 * px]);
    ctx.beginPath();
    if (hand.tool === 'fold') {
      ctx.moveTo(hand.p0[0], hand.p0[1]); ctx.lineTo(hand.p1[0], hand.p1[1]);
    } else {
      ctx.arc(hand.p0[0], hand.p0[1], Math.max(1, Math.hypot(hand.p1[0] - hand.p0[0], hand.p1[1] - hand.p0[1])), 0, 2 * Math.PI);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function updateHandNote() {
  if (!handNote) return;
  const c = { f: 0, p: 0, b: 0, n: 0 };
  for (const h of HAND) c[h.t]++;
  const parts = [];
  if (c.f) parts.push(`${c.f} fold${c.f > 1 ? 's' : ''}`);
  if (c.p) parts.push(`${c.p} pinch${c.p > 1 ? 'es' : ''}`);
  if (c.b) parts.push(`${c.b} bump${c.b > 1 ? 's' : ''}`);
  if (c.n) parts.push(`${c.n} pin${c.n > 1 ? 's' : ''}`);
  handNote.html(parts.length ? `By hand so far: ${parts.join(', ')}.` : 'Nothing shaped by hand yet.');
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

// On cloth the lines and the cloth's edge are carried onto it first.
// Flat and zoomed, the lines are carried to where the zoom puts them.
function emit(xs, ys, n) {
  if (CLOTH && (LAY === L_LINES || LAY === L_ECHO || LAY === L_EDGE)) clothEmit(xs, ys, n);
  else if (FLATZ && (LAY === L_LINES || LAY === L_ECHO)) {
    const Z = FLATZ;
    ON = 0;
    for (let i = 0; i < n; i++) oPush(Z.cx + (xs[i] - Z.ox) * Z.g, Z.cy + (ys[i] - Z.oy) * Z.g);
    emitFlat(OX, OY, n);
  } else emitFlat(xs, ys, n);
}

function emitFlat(xs, ys, n) {
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

function buildShapes() {
  area = drawArea();
  if (area.w < 2 || area.h < 2) return null;
  const s = settings, coarse = !!drag || busy;
  ensureNoise();
  ensureField(coarse);
  ensureCloth(coarse);
  FLATZ = null;
  if (!CLOTH && (s.clothZoom !== 100 || s.clothX || s.clothY)) {
    const ox = (area.x0 + area.x1) / 2, oy = (area.y0 + area.y1) / 2;
    FLATZ = { g: clamp(s.clothZoom, MIN_VIEW, MAX_VIEW) / 100, ox, oy, cx: ox + s.clothX, cy: oy + s.clothY };
  }
  CF = CLOTH ? clothFast(CLOTH, coarse) : null;
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
  clothEdges();
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

// The strokes are drawn by the graphics card when there is one to draw with — tens of
// thousands of them, of hundreds of points each on a cloth, are a long wait for the canvas
// otherwise. They lie on a layer of their own over the paper, so nothing has to be copied
// back from the card; the guides go on the overlay above them. The PNG is drawn as before.
function drawPreview() {
  const ctx = drawingContext, s = previewScale(), d = pixelDensity();
  ctx.save();
  ctx.setTransform(d, 0, 0, d, 0, 0);
  const G = shapes && plan ? glStrokes(ctx.canvas.width, ctx.canvas.height, s * d) : null;
  if (G) {
    const [W, H] = paperDims();
    ctx.fillStyle = settings.paperColor;
    ctx.fillRect(0, 0, W * s, H * s);
  } else {
    if (GLS) GLS.canvas.style.display = 'none';
    drawSheet(ctx, s, true);
  }
  ctx.restore();
  drawOverlay();
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

// Strokes on the graphics card. Every piece between two points is a little box round it, as
// long as the piece and as wide as the pen, and the card works out how far each pixel of
// the box is from the piece — so its ends are round and the pieces join round, as on paper.
// A pen at a time, the nearest of all its pieces is kept, at four places in every pixel;
// then the pen's ink goes down by how many of the four lie within half a pen of some piece,
// each softened over a quarter of a pixel. So it is the edge of all the pen's pieces
// together that is softened — as the canvas does, stroking them as one path — and two
// passes that overlap by less than a pixel leave no lighter seam between them. Pen after
// pen, in the order they draw, each over the ones before.
let GLS = undefined;         // { canvas, gl, ... } once made, or null when there is no card to use

const GLS_SEG_VERT = `#version 300 es
in vec2 corner;
in vec4 seg;
uniform vec2 uSize;
uniform float uScale;
uniform float uHalf;
out vec2 vP;
flat out vec4 vSeg;
void main() {
  float hw = max(uHalf, 0.5) + 1.0;
  vec2 a = seg.xy * uScale, b = seg.zw * uScale, d = b - a;
  float L = length(d);
  vec2 t = L > 1e-6 ? d / L : vec2(1.0, 0.0), n = vec2(-t.y, t.x);
  vec2 p = mix(a - t * hw, b + t * hw, corner.x) + n * hw * (corner.y * 2.0 - 1.0);
  vP = p; vSeg = vec4(a, b);
  gl_Position = vec4(p.x / uSize.x * 2.0 - 1.0, 1.0 - p.y / uSize.y * 2.0, 0.0, 1.0);
}`;

// how far outside the pen's edge each of four places of the pixel is, in quarters of a
// pixel, offset by half and kept between 0 and 1
const GLS_SEG_FRAG = `#version 300 es
precision highp float;
in vec2 vP;
flat in vec4 vSeg;
uniform float uHalf;
out vec4 o;
float far(vec2 p) {
  vec2 pa = p - vSeg.xy, ba = vSeg.zw - vSeg.xy;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-12), 0.0, 1.0);
  return length(pa - ba * h);
}
void main() {
  float hw = max(uHalf, 0.5);
  vec4 d = vec4(far(vP + vec2(0.125, 0.375)), far(vP + vec2(0.375, -0.125)),
                far(vP + vec2(-0.125, -0.375)), far(vP + vec2(-0.375, 0.125)));
  vec4 v = clamp((d - hw) * 4.0 + 0.5, 0.0, 1.0);
  if (min(min(v.x, v.y), min(v.z, v.w)) >= 1.0) discard;
  o = v;
}`;

const GLS_INK_VERT = `#version 300 es
in vec2 corner;
void main() { gl_Position = vec4(corner * 4.0 - 1.0, 0.0, 1.0); }`;

const GLS_INK_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uNear;
uniform vec3 uCol;
uniform float uThin;
out vec4 o;
void main() {
  float cov = (1.0 - dot(texelFetch(uNear, ivec2(gl_FragCoord.xy), 0), vec4(0.25))) * uThin;
  if (cov <= 0.0) discard;
  o = vec4(uCol * cov, cov);
}`;

function glsMake() {
  try {
    const canvas = document.createElement('canvas');
    canvas.className = 'overlay strokes';
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false,
                                              preserveDrawingBuffer: true, depth: false, stencil: false });
    if (!gl) return null;
    const program = (vs, fs) => {
      const prog = gl.createProgram();
      for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
        gl.attachShader(prog, sh);
      }
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      return prog;
    };
    const seg = program(GLS_SEG_VERT, GLS_SEG_FRAG), ink = program(GLS_INK_VERT, GLS_INK_FRAG);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    const segVao = gl.createVertexArray();
    gl.bindVertexArray(segVao);
    const lc = gl.getAttribLocation(seg, 'corner');
    gl.enableVertexAttribArray(lc);
    gl.vertexAttribPointer(lc, 2, gl.FLOAT, false, 0, 0);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const ls = gl.getAttribLocation(seg, 'seg');
    gl.enableVertexAttribArray(ls);
    gl.vertexAttribDivisor(ls, 1);
    const inkVao = gl.createVertexArray();
    gl.bindVertexArray(inkVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    const li = gl.getAttribLocation(ink, 'corner');
    gl.enableVertexAttribArray(li);
    gl.vertexAttribPointer(li, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    const near = gl.createTexture(), fbo = gl.createFramebuffer();
    const G = { canvas, gl, seg, ink, segVao, inkVao, buf, ls, near, fbo, nw: 0, nh: 0,
      data: new Float32Array(4 * 65536), lost: false,
      uSize: gl.getUniformLocation(seg, 'uSize'), uScale: gl.getUniformLocation(seg, 'uScale'),
      uHalf: gl.getUniformLocation(seg, 'uHalf'), uNear: gl.getUniformLocation(ink, 'uNear'),
      uCol: gl.getUniformLocation(ink, 'uCol'), uThin: gl.getUniformLocation(ink, 'uThin') };
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); G.lost = true; drawPreview(); });
    const sheet = document.getElementById('sheet');
    if (sheet) sheet.insertBefore(canvas, OVERLAY && OVERLAY.parentNode === sheet ? OVERLAY : null);
    return G;
  } catch (err) {
    console.warn('strokes drawn without the graphics card:', err.message);
    return null;
  }
}

// The strokes, drawn on the card into a canvas of w × h pixels at k pixels a millimetre;
// null when there is no card to draw with, and the canvas draws them itself.
function glStrokes(w, h, k) {
  if (GLS === undefined) GLS = glsMake();
  if (!GLS || GLS.lost) return null;
  const G = GLS, gl = G.gl, { pts, off } = shapes, { order, flip } = plan;
  let n = 0, data = G.data;
  const put = (x0, y0, x1, y1) => {
    if (n * 4 + 4 > data.length) { const b = new Float32Array(data.length * 2); b.set(data); data = G.data = b; }
    const o = n * 4;
    data[o] = x0; data[o + 1] = y0; data[o + 2] = x1; data[o + 3] = y1;
    n++;
  };
  // as drawStrokes does: the hops the pen stays down over are drawn too
  const runs = [];
  let t = 0;
  while (t < order.length) {
    const id = shapes.ink[order[t]], reach = settings.penDown / 100 * penW(id), first = n;
    let held = 0, lx = NaN, ly = NaN;
    while (t < order.length && shapes.ink[order[t]] === id) {
      const i = order[t], rev = flip[t] === 1;
      t++;
      const a = off[i], b = off[i + 1], step = rev ? -1 : 1;
      let q = rev ? b - 1 : a, x = pts[q * 2], y = pts[q * 2 + 1];
      if (Math.hypot(x - lx, y - ly) <= reach) put(lx, ly, x, y);
      for (let m = 1; m < b - a; m++) {
        q += step;
        const x2 = pts[q * 2], y2 = pts[q * 2 + 1];
        put(x, y, x2, y2);
        x = x2; y = y2;
      }
      lx = x; ly = y;
      if (++held >= 4000) { held = 0; lx = ly = NaN; }
    }
    runs.push({ id, first, count: n - first });
  }
  if (G.canvas.width !== w || G.canvas.height !== h) { G.canvas.width = w; G.canvas.height = h; }
  if (G.nw !== w || G.nh !== h) {
    gl.bindTexture(gl.TEXTURE_2D, G.near);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, G.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, G.near, 0);
    G.nw = w; G.nh = h;
  }
  gl.viewport(0, 0, w, h);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindBuffer(gl.ARRAY_BUFFER, G.buf);
  gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, n * 4), gl.STREAM_DRAW);
  gl.enable(gl.BLEND);
  for (const r of runs) {
    if (!r.count) continue;
    // the nearest piece of this pen at every pixel
    gl.bindFramebuffer(gl.FRAMEBUFFER, G.fbo);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(G.seg);
    gl.uniform2f(G.uSize, w, h);
    gl.uniform1f(G.uScale, k);
    gl.uniform1f(G.uHalf, penW(r.id) * k / 2);
    gl.blendEquation(gl.MIN);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.bindVertexArray(G.segVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, G.buf);
    gl.vertexAttribPointer(G.ls, 4, gl.FLOAT, false, 16, r.first * 16);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, r.count);
    // and its ink, over what is there
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(G.ink);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, G.near);
    gl.uniform1i(G.uNear, 0);
    gl.uniform3fv(G.uCol, hexRgb(penCol(r.id)).map(c => c / 255));
    // a pen finer than a pixel is drawn a pixel wide, as faint as it is fine
    gl.uniform1f(G.uThin, Math.min(1, penW(r.id) * k));
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(G.inkVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // the next pen clears the same texture: some cards would clear it before this ink has
    // been read from it, unless told to finish what they have
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.flush();
  }
  gl.bindVertexArray(null);
  G.canvas.style.display = '';
  return G.canvas;
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
  // what lies on the flat picture is shown where it has gone on the cloth
  const at = (x, y) => {
    if (FLATZ) return [FLATZ.cx + (x - FLATZ.ox) * FLATZ.g, FLATZ.cy + (y - FLATZ.oy) * FLATZ.g];
    if (!CLOTH) return [x, y];
    clothAt(x, y);
    return [CM[0], CM[1]];
  };
  if (s.carrier !== 'lines') {
    const [x, y] = at(...carrierCentre());
    ctx.beginPath();
    ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y);
    ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4);
    ctx.stroke();
  }
  if (s.echo === 'disc') {
    ctx.setLineDash([0.8, 1.6]);
    ctx.beginPath();
    const ex = (area.x0 + area.x1) / 2 + s.echoX / 100 * area.w / 2;
    const ey = (area.y0 + area.y1) / 2 + s.echoY / 100 * area.h / 2;
    const er = s.echoR / 100 * Math.min(area.w, area.h) / 2;
    for (let q = 0; q <= 96; q++) {
      const a = q / 96 * 2 * Math.PI, [x, y] = at(ex + er * Math.cos(a), ey + er * Math.sin(a));
      if (q) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
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
  settleTimer = setTimeout(() => { settleTimer = null; busy = false; update(); }, 250);
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
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
    const s = settings;
    if (e.button === 1 || e.ctrlKey || e.metaKey) {
      // the zoomed drawing moved over the sheet
      drag = { mode: 'pan', x: e.clientX, y: e.clientY, p: paperPoint(e), moved: false,
               vx: s.clothX, vy: s.clothY };
      try { c.setPointerCapture(e.pointerId); } catch (err) { /* not a live pointer */ }
      c.classList.add('dragging');
      e.preventDefault();
      return;
    }
    if (s.cloth && CLOTH && clothTool !== 'off') {
      hand = handDown(e, paperPoint(e));
      if (hand) {
        drag = { mode: 'hand', moved: false };
        try { c.setPointerCapture(e.pointerId); } catch (err) { /* not a live pointer */ }
        drawOverlay();
      }
      e.preventDefault();
      return;
    }
    drag = {
      mode: e.altKey ? 'centre' : (e.shiftKey || e.button === 2) ? 'turn' : 'slide',
      x: e.clientX, y: e.clientY, p: paperPoint(e), moved: false,
      fx: s.fieldX, fy: s.fieldY, angle: s.angle, cx: s.centreX, cy: s.centreY,
    };
    try { c.setPointerCapture(e.pointerId); } catch (err) { /* not a live pointer */ }
    c.classList.add('dragging');
    e.preventDefault();
  });
  c.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });   // no autoscroll
  c.addEventListener('pointermove', e => {
    if (!drag) {
      if (settings.cloth && CLOTH && clothTool !== 'off') {
        const reach = 9 * paperDims()[0] / c.getBoundingClientRect().width;
        const hv = handHit(paperPoint(e), reach);
        if ((hv && hv.n) !== (handHover && handHover.n)) { handHover = hv; drawOverlay(); }
      }
      return;
    }
    if (drag.mode === 'hand') {
      if (handMove(paperPoint(e))) { drag.moved = true; liveUpdate(); }
      e.preventDefault();
      return;
    }
    const s = settings;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 3) return;
    drag.moved = true;
    const p = paperPoint(e);
    if (drag.mode === 'pan') {
      s.clothX = +clamp(drag.vx + p[0] - drag.p[0], -VIEW_SHIFT, VIEW_SHIFT).toFixed(2);
      s.clothY = +clamp(drag.vy + p[1] - drag.p[1], -VIEW_SHIFT, VIEW_SHIFT).toFixed(2);
      for (const k of ZOOM_KEYS) if (setters[k]) setters[k](s[k]);
      liveUpdate();
      e.preventDefault();
      return;
    }
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
    if (drag.mode === 'hand') {
      const made = e.type === 'pointerup' ? handUp(paperPoint(e)) : (hand = null, false);
      const moved = drag.moved;
      drag = null;
      try { c.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
      if (made || moved) update(); else drawOverlay();
      return;
    }
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
    const raw = e.deltaY || e.deltaX;
    const delta = raw * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    if (e.ctrlKey || e.metaKey) {
      // the drawing itself zoomed about the cursor — ctrl+wheel, or a pinch on a touchpad
      busy = true;
      zoomViewAbout(Math.exp(-delta * WHEEL_ZOOM * (e.ctrlKey && Math.abs(raw) < 50 ? 4 : 1)), paperPoint(e));
      settle();
      return;
    }
    if (settings.cloth && CLOTH && clothTool !== 'off' && handWheel(paperPoint(e), delta, e.shiftKey)) {
      busy = true;
      liveUpdate();
      settle();
      return;
    }
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

// The drawing itself zoomed by a factor, keeping what is under the paper point m where it is
// on the sheet — the picture under the lines stays as it lies.
const ZOOM_KEYS = ['clothZoom', 'clothX', 'clothY'];

function zoomViewAbout(factor, m) {
  const s = settings, z = s.clothZoom / 100;
  const z2 = Math.round(clamp(z * factor, MIN_VIEW / 100, MAX_VIEW / 100) * 1000) / 1000;
  if (z2 === z) return;
  const k = z2 / z, ox = (area.x0 + area.x1) / 2, oy = (area.y0 + area.y1) / 2;
  const px = m ? m[0] : ox, py = m ? m[1] : oy;
  const cx = ox + s.clothX, cy = oy + s.clothY;
  s.clothX = +clamp(px - (px - cx) * k - ox, -VIEW_SHIFT, VIEW_SHIFT).toFixed(2);
  s.clothY = +clamp(py - (py - cy) * k - oy, -VIEW_SHIFT, VIEW_SHIFT).toFixed(2);
  s.clothZoom = Math.round(z2 * 1000) / 10;
  for (const key of ZOOM_KEYS) if (setters[key]) setters[key](s[key]);
  liveUpdate();
}

function resetZoom() {
  for (const k of ZOOM_KEYS) settings[k] = DEFAULTS[k];
  refreshControls();
  update();
}

function resetView() {
  for (const k of VIEW_KEYS) settings[k] = DEFAULTS[k];
  refreshControls();
  update();
}

function attachKeys() {
  window.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || t.isContentEditable ||
        (t.tagName === 'INPUT' && !['checkbox', 'button', 'color', 'range'].includes(t.type)))) return;
    // a list with the focus keeps its own arrows; a letter is a shortcut, not a jump to an option
    if (t && t.tagName === 'SELECT' && (e.key.length > 1 && e.key !== 'Escape' && e.key !== 'Delete')) return;
    if (t && t.tagName === 'SELECT') t.blur();
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
      case 'k': case 'K': s.cloth = !s.cloth; refreshControls(); update(); setClothTool(clothTool); break;
      case 't': case 'T': {
        const k = CLOTH_TOOLS.indexOf(clothTool) + (e.key === 'T' ? -1 : 1);
        if (!s.cloth) { s.cloth = true; refreshControls(); update(); }
        setClothTool(CLOTH_TOOLS[(k + CLOTH_TOOLS.length) % CLOTH_TOOLS.length]);
        break;
      }
      case 'Escape': setClothTool('off'); break;
      case 'u': case 'U': handUndo(); break;
      case 'Delete': case 'Backspace':
        if (!handHover || !s.cloth || clothTool === 'off' || !HAND[handHover.n]) return;
        HAND.splice(handHover.n, 1);
        handHover = null;
        handSave(true);
        update();
        break;
      case 'z': zoomViewAbout(1.25, null); break;
      case 'Z': zoomViewAbout(1 / 1.25, null); break;
      case 'v': case 'V': resetZoom(); break;
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
  syncToolbar();
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

  const cl = s.cloth;
  show(['subFolds', 'folds', 'crossFolds', 'subCrumple', 'crumple', 'creases', 'subBend', 'bow',
        'curl', 'twist', 'subHang', 'gravity', 'hangFrom', 'squeeze', 'wind', 'subView',
        'viewTilt', 'viewTurn', 'viewSide', 'perspective', 'clothFit', 'subLight', 'shade', 'hollows', 'subShow', 'hidden', 'clothBack', 'clothEdge',
        'subHand', 'clothTool', 'handScale', 'handButtons', 'handNote', 'clothHand'], cl);
  show(['foldLen', 'foldAngle', 'foldSharp', 'foldUneven', 'foldWander', 'foldTaper', 'foldLean'],
       cl && s.folds !== 0);
  show(['crossLen', 'crossAngle', 'crossSharp'], cl && s.crossFolds !== 0);
  show(['crumpleKind', 'crumpleSize', 'crumpleDetail'], cl && s.crumple > 0);
  show(['creaseKind', 'creaseDepth'], cl && s.creases > 0);
  setVisible('bowAngle', cl && s.bow !== 0);
  show(['curlAngle', 'curlSize'], cl && s.curl !== 0);
  setVisible('twistAngle', cl && s.twist !== 0);
  setVisible('weight', cl && s.gravity !== 'none');
  setVisible('gather', cl && ['the top edge', 'pegs on a line', 'two top corners', 'four corners',
                              'the left edge'].includes(s.hangFrom));
  setVisible('squeezeFrom', cl && s.squeeze > 0);
  const into = cl && s.gravity === 'into the sheet';
  show(['under', 'table'], into);
  setVisible('tableDrop', into && s.table && s.under === 'nothing');
  show(['propSize', 'propX', 'propY'], into && s.under !== 'nothing');
  show(['windAngle', 'windLift', 'gusts'], cl && s.wind > 0);
  const hung = s.gravity !== 'none' || s.wind > 0 || s.squeeze > 0 || s.hangFrom !== 'nothing' ||
               /(^|;)n,/.test(s.clothHand);
  show(['stiffness', 'simTime', 'simRes'], cl && hung);
  show(['lightFrom', 'lightHigh'], cl && s.shade !== 0);
  setVisible('backPen', cl && s.clothBack === 'other pen');
  setVisible('edgePen', cl && s.clothEdge !== 'none');
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

  sec = addSection(root, 'Keys and mouse');
  createDiv('').parent(sec).class('note keys').html(
    '<div><kbd>drag</kbd> slide the picture under the lines · <kbd>wheel</kbd> enlarge it · <kbd>0</kbd> put it back</div>' +
    '<div><kbd>ctrl</kbd>+<kbd>wheel</kbd> (or a pinch) zoom the drawing about the cursor · <kbd>Z</kbd> in, <kbd>shift</kbd>+<kbd>Z</kbd> out · <kbd>V</kbd> the whole drawing</div>' +
    '<div><kbd>ctrl</kbd>+<kbd>drag</kbd> or the middle button: move the zoomed drawing</div>' +
    '<div><kbd>shift</kbd>+<kbd>drag</kbd> turn the lines · <kbd>alt</kbd>+<kbd>drag</kbd> their middle</div>' +
    '<div><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> slide the picture 1 mm, with <kbd>shift</kbd> 10 · <kbd>+</kbd><kbd>−</kbd> enlarge it</div>' +
    '<div><kbd>S</kbd> next scene, <kbd>shift</kbd>+<kbd>S</kbd> back · <kbd>C</kbd> carrier · <kbd>F</kbd> picture · <kbd>I</kbd> ink · <kbd>E</kbd> echo (with <kbd>shift</kbd> back)</div>' +
    '<div><kbd>X</kbd> cut guides · <kbd>G</kbd> guides · <kbd>R</kbd> new seed · <kbd>[</kbd> <kbd>]</kbd> step it</div>' +
    '<div><kbd>K</kbd> cloth · <kbd>T</kbd> next tool on it, named over the sheet (<kbd>shift</kbd> back) · <kbd>U</kbd> undo · <kbd>Delete</kbd> what is under the cursor · <kbd>Esc</kbd> no tool</div>' +
    '<div>with a tool: <kbd>drag</kbd> shape · <kbd>wheel</kbd> deeper · <kbd>shift</kbd>+<kbd>wheel</kbd> wider · right-click remove</div>');

  sec = addSection(root, 'Zoom');
  addSlider(sec, 'Zoom (%)', 'clothZoom', MIN_VIEW, 2000, 1,
    'The whole drawing — lines, nib and all — enlarged, so a part of it fills the sheet. ' +
    '<b>ctrl</b>+wheel zooms about the cursor, <b>ctrl</b>+drag or the middle button moves it; ' +
    'a plain drag still slides the picture under the lines.');
  addSlider(sec, 'Moved across (mm)', 'clothX', -2000, 2000, 0.5);
  addSlider(sec, 'Moved down (mm)', 'clothY', -2000, 2000, 0.5);
  createButton('The whole drawing').parent(sec).mousePressed(resetZoom);

  sec = addSection(root, 'Scene');
  const sceneSel = createSelect().parent(createDiv('').parent(sec).class('field'));
  for (const sc of SCENES) sceneSel.option(sc.label);
  sceneSel.changed(() => {
    const sc = SCENES[sceneSel.elt.selectedIndex];
    if (sc && sc.s) applyScene(sc);
    sceneSel.elt.selectedIndex = 0;
    sceneSel.elt.blur();
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
  addSlider(sec, 'Paper between, at least (mm)', 'hairMin', 0, 3, 0.05,
    'A hair of paper left between two lines and thinner than this on the sheet — where they ' +
    'swell, or where a cloth turned away crowds them — is closed: they run together. A ' +
    'plotter cannot leave a much thinner hair clean, and the preview cannot show one. 0 ' +
    'keeps every hair.');
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


  sec = addSection(root, 'Cloth');
  addCheckbox(sec, 'The picture printed on a sheet of cloth', 'cloth', () => {
    setClothTool(clothTool);
    resync();
  });
  addNote(sec, 'The lines are laid on the flat cloth as ever; then the cloth is folded, ' +
    'crumpled, bent, hung up and blown about, and drawn as it is seen — the lines behind a fold ' +
    'left out, and fatter where the cloth turns from the light. <b>K</b> switches it.');
  addSub(sec, 'Folds', 'subFolds');
  addSlider(sec, 'Folds (° of slope)', 'folds', 0, 178, 1,
    'How steep the side of a fold gets. The cloth keeps its length, so it is drawn in as it ' +
    'climbs; past 90 every fold laps over the next.');
  addSlider(sec, 'Fold to fold (mm)', 'foldLen', 4, 400, 1);
  addSlider(sec, 'Running at (°)', 'foldAngle', -90, 90, 1, '0 — upright, 90 — level.');
  addSlider(sec, 'Sharp (%)', 'foldSharp', 0, 100, 1,
    '0 — soft waves; 100 — pleats with flat sides that snap over at the crest.');
  addSlider(sec, 'Uneven (%)', 'foldUneven', 0, 100, 1, 'Unlike in depth and spacing.');
  addSlider(sec, 'Wandering (%)', 'foldWander', 0, 300, 1, 'Drifting sideways along their length.');
  addSlider(sec, 'Dying out (%)', 'foldTaper', -100, 100, 1,
    'Flat at one end, deep at the other — below 0 the other way round.');
  addSlider(sec, 'Leaning (%)', 'foldLean', -100, 100, 1, 'One side of every fold steeper than the other.');
  addSlider(sec, 'Folds across (° of slope)', 'crossFolds', 0, 178, 1, 'A second set.');
  addSlider(sec, 'Across, fold to fold (mm)', 'crossLen', 4, 400, 1);
  addSlider(sec, 'Across, running at (°)', 'crossAngle', -90, 90, 1);
  addSlider(sec, 'Across, sharp (%)', 'crossSharp', 0, 100, 1);

  addSub(sec, 'Crumpled and creased', 'subCrumple');
  addSlider(sec, 'Crumpled (mm deep)', 'crumple', 0, 60, 0.1,
    'Crushed in the hand and smoothed out again: the cloth shrinks where it is steep.');
  addSelect(sec, 'Into', 'crumpleKind', CRUMPLES, resync,
    '<b>facets</b> — little pyramids raised and sunk, as paper crumples; <b>creased</b> — ' +
    'winding ridges; <b>soft</b> — lumps, as cloth.');
  addSlider(sec, 'Facet size (mm)', 'crumpleSize', 4, 300, 1);
  addSlider(sec, 'Finer crumpling', 'crumpleDetail', 1, 5, 1);
  addSlider(sec, 'Creases', 'creases', 0, 40, 1, 'Folded flat and opened out again.');
  addSelect(sec, 'Laid', 'creaseKind', CREASES, resync,
    '<b>random</b>; a <b>letter</b> — in three and once across; a <b>grid</b> — as a map, ' +
    'mountain and valley by turns.');
  addSlider(sec, 'Still bent at each (°)', 'creaseDepth', 0, 80, 0.5);

  addSub(sec, 'Bent as a whole', 'subBend');
  addSlider(sec, 'Bowed (°)', 'bow', -180, 180, 1, 'Each side turned up by so much — below 0, down.');
  addSlider(sec, 'Bowed across (°)', 'bowAngle', -90, 90, 1, '0 — its left and right sides rise.');
  addSlider(sec, 'Rolled up (°)', 'curl', -1440, 1440, 5,
    'An edge rolled round a cylinder, toward the viewer — below 0, under. Past 360 it winds ' +
    'into a scroll.');
  addSlider(sec, 'The edge rolled (°)', 'curlAngle', -180, 180, 1,
    '0 — the top, 90 — the right, 180 — the bottom; 45 rolls a corner.');
  addSlider(sec, 'How much of it (%)', 'curlSize', 1, 100, 1);
  addSlider(sec, 'Twisted (°)', 'twist', -720, 720, 1, 'End to end.');
  addSlider(sec, 'Twisted about (°)', 'twistAngle', -90, 90, 1, '0 — an axis across the sheet.');

  addSub(sec, 'Hanging', 'subHang');
  addSelect(sec, 'It falls', 'gravity', GRAVITIES, resync,
    '<b>down the sheet</b> — it hangs before the viewer, as a curtain or a flag; <b>into the ' +
    'sheet</b> — seen from above, it falls onto a table and over what is under it.');
  addSlider(sec, 'Weight (%)', 'weight', 0, 300, 1);
  addSelect(sec, 'Hangs from', 'hangFrom', HANG_FROM, resync);
  addSlider(sec, 'Gathered (%)', 'gather', 0, 90, 1,
    'What it hangs from drawn together: a curtain gathered on its rod, in pleats.');
  addSlider(sec, 'Pushed together (%)', 'squeeze', 0, 80, 1,
    'Its edges held and pushed in, so it buckles.');
  addSelect(sec, 'From', 'squeezeFrom', SQUEEZES, resync);
  addSelect(sec, 'Lies over', 'under', UNDER, resync);
  addSlider(sec, 'Its size (%)', 'propSize', 1, 200, 1);
  addSlider(sec, 'Its place, across (%)', 'propX', -100, 100, 1);
  addSlider(sec, 'Its place, down (%)', 'propY', -100, 100, 1);
  addCheckbox(sec, 'A table under it all', 'table');
  addSlider(sec, 'The table below it (mm)', 'tableDrop', 1, 600, 1,
    'With nothing else under the cloth. Over a ball, a box or a rod the table is where they stand.');
  addSlider(sec, 'Wind (%)', 'wind', 0, 300, 1, 'Pushes against whichever way the cloth faces.');
  addSlider(sec, 'Blowing toward (°)', 'windAngle', -180, 180, 1, '0 — the right, 90 — down the sheet.');
  addSlider(sec, 'And out of the sheet (%)', 'windLift', -200, 200, 1, 'Toward the viewer; below 0, away.');
  addSlider(sec, 'Gusts (%)', 'gusts', 0, 200, 1);
  addSlider(sec, 'Stiff (%)', 'stiffness', 0, 100, 1,
    'How much of its shape — the folds above — it keeps while it hangs. 0 is silk.');
  addSlider(sec, 'Let hang for (steps)', 'simTime', 1, 800, 1,
    'Short, and it is caught still falling; a flag in the wind is never still, so this is ' +
    'the moment it is drawn.');
  addSlider(sec, 'Hanging grid (points)', 'simRes', 12, 160, 1,
    'Along the long side. Finer folds, slower.');

  addSub(sec, 'Seen from', 'subView');
  addSlider(sec, 'Tilted back (°)', 'viewTilt', -85, 85, 1, 'Seen from below its bottom edge.');
  addSlider(sec, 'Turned on the sheet (°)', 'viewTurn', -180, 180, 1);
  addSlider(sec, 'From the side (°)', 'viewSide', -85, 85, 1);
  addSlider(sec, 'Perspective (%)', 'perspective', 0, 100, 1);
  addCheckbox(sec, 'Fitted to the picture', 'clothFit');

  addSub(sec, 'Light', 'subLight');
  addSlider(sec, 'Shade (%)', 'shade', 0, 300, 1,
    'The lines swell where the cloth turns from the light and thin where it turns to it.');
  addSlider(sec, 'Light from (°)', 'lightFrom', -180, 180, 1, '0 — the top of the sheet, 90 — the right.');
  addSlider(sec, 'Light high (°)', 'lightHigh', 1, 90, 1);
  addSlider(sec, 'Dark in the hollows (%)', 'hollows', 0, 300, 1);

  addSub(sec, 'What shows', 'subShow');
  addCheckbox(sec, 'Lines behind the folds left out', 'hidden');
  addSelect(sec, 'The back of the cloth', 'clothBack', CLOTH_BACKS, resync,
    'Where a fold or a roll turns it over: the lines <b>printed through</b>, the back left ' +
    '<b>bare</b>, or drawn in an <b>other pen</b>.');
  addPenSelect(sec, 'The back in', 'backPen');
  addSelect(sec, 'Outlined', 'clothEdge', CLOTH_EDGES, resync,
    'The <b>hem</b> round the cloth; and the <b>folds</b> — wherever it turns out of sight. ' +
    'A layer of its own.');
  addPenSelect(sec, 'Outlined with', 'edgePen');

  addSub(sec, 'By hand', 'subHand');
  {
    const field = createDiv('').parent(sec).class('field');
    fieldDivs.clothTool = field;
    createSpan('Tool on the sheet').parent(field).class('label');
    addToolSelect(field);
    createDiv('The same list stands over the sheet. ' +
      '<b>fold</b> — drag along the cloth: a ridge, with <b>shift</b> a valley; ' +
      '<b>pinch</b> — gathered at a point into folds round a peak; <b>bump</b> — raised, with ' +
      '<b>shift</b> dented; the drag sets how far either reaches; <b>pin</b> — holds the place ' +
      'clicked, a drag moves it, the wheel lifts it (it hangs). Over anything made: the ' +
      '<b>wheel</b> deepens it, <b>shift</b>+wheel widens it, a drag moves it, a right-click or ' +
      '<b>Delete</b> takes it away. <b>T</b> steps the tools, <b>Esc</b> puts it down, ' +
      '<b>U</b> undoes.').parent(field).class('note');
  }
  addSlider(sec, 'All of it as deep as (%)', 'handScale', 0, 400, 1);
  {
    const row = createDiv('').parent(sec).class('btn-row');
    fieldDivs.handButtons = row;
    createButton('Undo').parent(row).mousePressed(handUndo);
    createButton('Clear what was made').parent(row).mousePressed(handClear);
  }
  handNote = addNote(sec, '');
  fieldDivs.handNote = handNote;
  addTextField(sec, 'As it rides in the link', 'clothHand', '', v => {
    settings.clothHand = v;
    HAND = parseHand(v);
    updateHandNote();
    update();
  });
  updateHandNote();

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
  photoNote = createDiv(PHOTO ? PHOTO.name :
    'Or paste one (<b>ctrl+V</b>) or drop it on the page. Not part of the link — load it ' +
    'again to rebuild the sheet.')
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
  addNote(sec, 'The cloth\'s back and its edge pick theirs under <b>Cloth</b>.');
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
  linkDiv = createDiv('').parent(sec).class('link');
  refreshPenSelects();
  syncVisibility();
}

// The sheet turned the way the photograph is, so as little of it as possible is cut off.
function turnToPhoto() {
  if (!PHOTO || settings.source !== 'photo' || settings.paper === 'custom') return false;
  const turn = PHOTO.img.height > PHOTO.img.width ? 'portrait' : 'landscape';
  if (settings.orientation === turn) return false;
  settings.orientation = turn;
  return true;
}

function loadPhotoFile(file, name) {
  if (!file) return;
  name = name || file.name || 'photo';
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    PHOTO = { img, name, ver: ++photoVer };
    settings.source = 'photo';
    if (turnToPhoto()) {
      refreshControls();
      resizeForPaper();
    }
    if (setters.source) setters.source('photo');
    if (photoNote) photoNote.html(name + ' — not part of the link; load it again to rebuild the sheet.');
    syncVisibility();
    update();
  };
  img.src = url;
}

// A photograph can also be pasted (ctrl+V — a screenshot, an image copied in a browser) or
// dropped onto the page; either way it becomes the picture.
function firstImage(items) {
  for (const it of items || []) {
    const f = it.getAsFile ? (it.kind === 'file' ? it.getAsFile() : null) : it;
    if (f && /^image\//.test(f.type)) return f;
  }
  return null;
}

function attachPhotoInput() {
  window.addEventListener('paste', e => {
    const cd = e.clipboardData;
    const f = cd && (firstImage(cd.items) || firstImage(cd.files));
    if (!f) return;
    e.preventDefault();
    loadPhotoFile(f, f.name && f.name !== 'image.png' ? f.name : 'pasted image');
  });
  window.addEventListener('dragover', e => {
    if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault();
  });
  window.addEventListener('drop', e => {
    const f = firstImage(e.dataTransfer && e.dataTransfer.files);
    if (!f) return;
    e.preventDefault();
    loadPhotoFile(f);
  });
}

////////////////////////////////////////////////////////////////////////////////////////
// What the sheet costs

function updateStats() {
  if (!statsDiv) return;
  const s = settings;
  if (!shapes && s.cloth && shaperJob) {
    statsDiv.html('<div>The cloth is being worked out…</div>');
    refreshPenList();
    return;
  }
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
    `${s.carrier !== 'rays' && gap > 0 ? gap < s.hairMin
      ? ` — the ${gap.toFixed(2)} mm of paper to the next is under the least kept, so they run together`
      : ` — <b>${gap.toFixed(2)}</b> mm of paper to the next` : ''}</div>` +
    `<div>The pen goes down <b>${groupNum(plan.downs)}</b> times, ` +
    `${(plan.travel / 1000).toFixed(1)} m in the air</div>` +
    `<div>Roughly <b>${formatDuration(seconds)}</b> to plot · ${lastMs.toFixed(0)} ms to build` +
    `${fieldMs ? ` (the picture ${fieldMs.toFixed(0)} ms)` : ''}</div>`;
  if (s.cloth && CLOTH) {
    const hid = CF && CF.reads ? Math.round(CF.unseen / CF.reads * 100) : 0;
    html += `<div>On cloth${CLOTH.hung ? `, hung over ${CLOTH.sim.mx}×${CLOTH.sim.my} points` : ''}` +
      `${HAND.length ? `, ${HAND.length} shaped by hand` : ''} — ${hid} % of the lines behind ` +
      `its folds · shaped in ${CLOTH.ms.toFixed(0)} ms${CLOTH.hung ? ` (hanging ${CLOTH.simMs.toFixed(0)})` : ''}, ` +
      `seen in ${CLOTH.viewMs.toFixed(0)}</div>`;
    if (shaperJob && !shaperJob.coarse) {
      html += `<div>${CLOTH.shape.key === shaperJob.key ? 'Shown coarse for now' : 'The sheet shows the cloth as it was'}` +
        ' — the fine cloth is being worked out.</div>';
    }
  }
  if (s.cropMarks && perLayer && perLayer[L_GUIDES].strokes) {
    html += `<div>${perLayer[L_GUIDES].strokes} cut guide dots round the ${s.cropMarkAt}, ` +
      `in the pen of the lines</div>`;
  }
  if (s.source === 'photo' && !PHOTO) {
    html += '<div class="warn">No photo loaded — load one under <b>The picture</b>, paste it (ctrl+V) or drop it on the page. Until then: a ball of shade.</div>';
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
    `${s.cropMarks ? `cutguides=${s.cropMarkAt}<=${s.cropMarkGap}mm ` : ''}` +
    `${s.cloth ? `cloth folds=${s.folds} crumple=${s.crumple} gravity=${s.gravity} hand=${HAND.length} ` : ''}seed=${s.seed} ` +
    `pens=[${pens.join('; ')}] strokes=${strokes}`;
}

function fileStem() {
  const s = settings;
  const paper = s.paper === 'custom' ? `${s.customW}x${s.customH}mm` : `${s.paper}-${s.orientation}`;
  return `swelling lines ${s.carrier} ${s.source} ${s.ink}${s.cloth ? ' cloth' : ''} seed${s.seed} ${paper}`;
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

function addSub(parent, title, key) {
  const d = createDiv(title).parent(parent).class('sub');
  if (key) fieldDivs[key] = d;
  return d;
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
  if (!('orientation' in (sc.s || {}))) turnToPhoto();
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
    if (settings.liveUpdate && !onChange) { busy = true; liveUpdate(); }
  });
  sl.changed(() => { busy = false; done(); });
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
  sel.changed(() => { settings[key] = sel.value(); sel.elt.blur(); (onChange || update)(); });
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
  sel.changed(() => { settings[key] = Number(sel.value()); sel.elt.blur(); update(); });
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

function svgGroup(keep, pen, id, n) {
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
  return `<g id="${id}" inkscape:label="${n} ${id}" fill="none" stroke="${penCol(pen)}" ` +
    `stroke-width="${f(penW(pen))}" ` +
    `stroke-linecap="round" stroke-linejoin="round">\n${body}</g>\n`;
}

function penId(i) { return `pen${i + 1}-${penKind(i).replace(/\s+/g, '-')}`; }

function svgFile(groups, tag) {
  const [W, H] = paperDims();
  // The groups numbered as they stand in the file: vpype takes the first number in a label for
  // its layer, sorts the strokes within a layer and writes the layers by number — so the plot
  // keeps this order through vpype-process.sh.
  let body = '', n = 0;
  for (const [keep, pen, id] of groups) {
    const g = svgGroup(keep, pen, id, n + 1);
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
  fineNow();
  if (!shapes || !plan || !strokes) {
    alert('Nothing to export — no line is left on this sheet.');
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
  fineNow();
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
