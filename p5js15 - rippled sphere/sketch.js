////////////////////////////////////////////////////////////////////////////////////////
// Rippled sphere — a ball of triangles with waves running over its skin, drawn as lines
//
// A ball is cut into small triangles — a geodesic net, a globe of latitudes and
// longitudes, or a cube blown up round — and its skin is pushed in and out by waves.
// Every wave is a height over the ball, a share of its radius, and they simply add up:
// noise, soft or ridged or creased and swirled by a warp of itself; rings of ripples
// running out from a few drops; folds laid across the ball like the creases of a sheet;
// a weave of small corrugated tiles, each turned across its neighbours; ribs, rings and
// spirals round its axis; and waves drawn on it by hand, which run along the path the
// mouse takes or ring out round the point it clicked.
//
// A skin pushed out along its normals keeps its triangles where they were. A crumpled
// sheet does not: it gathers into its folds. So the net is also let slide over the ball,
// downhill along the slope of the waves, by as much as the deepest trough may squeeze
// it — and where it bunches, the lines crowd together into the dark creases a pen draws
// a fold with. The height is read again where every point has slid to, so the ball
// keeps the shape its waves give it; only its triangles move.
//
// A ring may stand round it — flat like a planet's, or a band like a hoop — tilted,
// split into bands, rippling, and seen through or not.
//
// Drawn with a pen, all of that is a question of hidden lines. Every point is taken onto
// the paper with its nearness to the camera as a third coordinate: the depth itself for
// a parallel view, its inverse for a perspective one, which is what keeps a flat
// triangle flat on the way. A point is then hidden exactly when it lies inside a
// triangle on paper that is nearer than it there, and along a straight piece of line
// both of those are linear: the three sides of the triangle and its depth are four
// inequalities in the one unknown, and what they leave is the hidden stretch, in closed
// form. The ball is closed and star-shaped round its middle, so a triangle turned away
// from the camera never shows, and never hides anything a triangle turned towards it
// does not hide already — only the near half is ever asked.
//
// On the ball go the edges of the net, its outline, contour lines of the waves' height,
// slices through it and hatching where the light does not reach; round it the ring's
// rims, grooves or spokes; and behind everything a sky. Each is a layer with a pen of
// its own, and each can be exported alone. The colours are the preview's — and a
// painted picture's of the same sheet — and can be rolled at random.
//
// Drag on the ball to draw a wave, click it to drop one. Everything lives in the
// sidebar and in the URL, the waves drawn by hand included, so a plot is reproduced by
// pasting its link.
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};

const MESHES        = ['geodesic', 'lat-long', 'lat-long triangles', 'cube'];
const NOISE_STYLES  = ['smooth', 'ridges', 'creases'];
const PROFILES      = ['ridge', 'trough', 'fold', 'crease', 'ripples'];
const PROFILE_KEYS  = 'rtfcp';     // one letter each, as a drawn wave is written down
const RIB_KINDS     = ['ribs', 'rings', 'spiral', 'harmonic'];
const RING_KINDS    = ['none', 'flat', 'band'];
const RING_LINES    = ['rims', 'grooves', 'spokes', 'grid'];
const MESH_LINES    = ['every edge', 'none'];
const CONTOUR_KEEP  = ['all', 'crests', 'troughs'];
const SLICE_KINDS   = ['none', 'latitudes', 'meridians', 'horizontal', 'vertical', 'depth',
                       'tilted'];
const SHADINGS      = ['none', 'hatch', 'dots'];
const SKIES         = ['none', 'stars', 'lines', 'waves', 'halo', 'rays', 'clouds'];
const PREVIEWS      = ['plot', 'painted'];
const PROJECTIONS   = ['orthographic', 'perspective'];
const HARMONIES     = ['any', 'analogous', 'complementary', 'triad', 'one hue', 'dark paper'];
const COMPOSE_LINES = ['none', 'cross', 'golden section', 'thirds', 'cross + golden section'];
const GOLDEN        = (3 - Math.sqrt(5)) / 2;   // 0.382 — the smaller part of a golden cut
const TOOLS         = ['wave', 'turn', 'erase'];

// What goes on the sheet, one layer at a time. Each has a pen of its own and a file of its
// own; `turn` is how sharply a stroke may bend where two of its pieces meet and still be
// drawn without lifting the pen, as the cosine of the angle.
const LAYERS = [
  { id: 'mesh',    label: 'mesh',     pen: 'meshPen',    turn: 0.5 },
  { id: 'outline', label: 'outline',  pen: 'outlinePen', turn: -1 },
  { id: 'waves',   label: 'waves',    pen: 'wavesPen',   turn: -1 },
  { id: 'slices',  label: 'slices',   pen: 'slicesPen',  turn: -1 },
  { id: 'shade',   label: 'shading',  pen: 'shadePen',   turn: 0.97 },
  { id: 'ring',    label: 'ring',     pen: 'ringPen',    turn: -1 },
  { id: 'sky',     label: 'sky',      pen: 'skyPen',     turn: -1 },
];
const L_MESH = 0, L_OUTLINE = 1, L_WAVES = 2, L_SLICES = 3, L_SHADE = 4, L_RING = 5, L_SKY = 6;

const MAX_PENS       = 4;
const INK_MARK       = -1;        // cut guides: drawn with every pen
const MAX_FACES      = 600_000;   // a net finer than this is not built
const MODEL_FACES    = 40_000;    // a net finer than this follows a drag as its outline
const RING_MAX       = 300_000;   // points the ring's own net may have
const MAX_STROKES    = 400_000;   // past this nothing is ordered, drawn or exported
const BUSY_STROKES   = 60_000;    // above this, warn about the plot time
const HEADROOM       = 1.08;      // the fit leaves this much round the ball for its waves
const MIN_R          = 0.15;      // the skin never comes nearer the middle than this
const SLIDE_MAX      = 0.95;      // the net is never squeezed flatter than this
const OCT_Q          = 4096;      // a drawn wave's points, in 1/4096ths of the octahedron
const Q_EPS          = 1e-6;      // of the scale — how much nearer a triangle must be to hide
const SIDE_TOL       = 1e-9;      // how far past its sides a triangle hides, against gaps
const JOIN_Q         = 1e4;       // pieces whose ends meet within 1/10 000 mm are joined
const EPS            = 0.01;      // mm — the stub that stands in for a single dot
const PREVIEW_MAX_PX = 1500;      // preview canvas resolution (paper is in mm)
const MAX_PREVIEW_W  = 900;       // on-screen size of that canvas, at the least
const MAX_PREVIEW_H  = 700;
const LIVE_BUDGET_MS = 150;       // slower than this and a drag shows the ball only
const DRAG_DEG_PX    = 0.35;      // camera degrees per screen pixel of drag
const WHEEL_ZOOM     = 0.0015;    // zoom factor per wheel delta unit, as an exponent
const MIN_ZOOM       = 10;        // %
const MAX_ZOOM       = 1000;      // %
const SETTLE_MS      = 250;       // after the last wheel step, everything is drawn again
const PEN_CYCLE_S    = 0.3;       // rough pen-up + pen-down time, seconds
const DRAW_SPEED     = 60;        // rough drawing speed, mm/s
const TRAVEL_SPEED   = 150;       // rough pen-up travel speed, mm/s

const settings = {
  // paper + pen
  paper: 'A4',
  orientation: 'portrait',
  margin: 15,
  penWidth: 0.25,

  // cut guides — dots on the edge of the sheet, for trimming an oversized plot back
  cropMarks: false,
  cropMarkGap: 400,     // mm — the most that is ever left between two marks

  // the ball — a net of triangles over a sphere of radius 1
  seed: 1,
  mesh: 'geodesic',
  detail: 260,          // edges round the ball, near enough, whatever the net
  jitter: 0,            // % of an edge each point of the net is pushed about by

  // the waves — heights as a share of the radius, all of them added up
  amplitude: 100,       // % — every wave at once
  slide: 90,            // % — how hard the deepest trough squeezes the net it gathers
  slideSoft: 2.5,       // deg — how far either side of a trough the net is gathered from
  noiseAmp: 3,          // % of the radius; 0 leaves the noise out
  noiseStyle: 'creases',
  noiseSize: 1.4,       // lumps to one radius
  noiseOctaves: 3,
  noiseRough: 0.5,      // how much of each octave the next finer one keeps
  noiseWarp: 0.7,       // how far the noise is swirled by noise of its own
  rippleAmp: 0,
  rippleDrops: 3,
  rippleLength: 8,      // deg of arc from one crest to the next
  rippleReach: 45,      // deg — how far out they carry before they are down to a third
  ripplePhase: 0,       // deg — how far through a wavelength the rings have run
  foldAmp: 0,
  foldCount: 8,
  foldLength: 100,      // deg of arc
  foldWidth: 10,        // deg — how far either side of its line a fold reaches
  foldCurl: 50,         // % — how far a fold wanders off a great circle
  foldProfile: 'fold',
  weaveAmp: 3,
  weaveTiles: 4,        // tiles across the ball
  weaveFolds: 1.5,      // folds across one tile
  ribAmp: 0,
  ribKind: 'ribs',
  ribCount: 12,         // round the axis
  ribRings: 6,          // from pole to pole
  ribPhase: 0,          // deg
  drawnAmp: 100,        // % — every wave drawn by hand at once
  brushProfile: 'ripples',
  brushAmp: 5,          // % of the radius
  brushWidth: 14,       // deg of arc either side of the stroke
  brushRipples: 3,      // crests either side of it, for `ripples`
  brushRepeat: 1,       // every drawn wave, this many times round the axis
  waves: '',            // every wave drawn by hand, written down

  // the ring
  ring: 'band',
  ringInner: 1.4,       // radii — a flat ring's inside edge …
  ringOuter: 2,         // … and its outside
  ringRadius: 1.32,     // radii — a band's
  ringHeight: 0.06,     // radii — and how tall it stands
  ringBands: 1,
  ringGap: 25,          // % of a band left open between two of them
  ringTilt: 30,         // deg off the ball's equator
  ringTurn: 40,         // deg — which way round it tilts
  ringWobble: 0,        // % of the radius the ring rises and falls by
  ringWaves: 5,         // … this many times round
  ringLines: 'grooves',
  ringSpacing: 1,       // mm between two lines across it, as if seen face on
  ringOpaque: false,

  // the camera
  projection: 'orthographic',
  distance: 6,          // radii from the middle of the ball — perspective only
  azimuth: 25,          // deg round the ball's axis
  elevation: 12,        // deg above its equator
  roll: 0,              // deg the whole drawing is turned on the sheet
  zoom: 100,            // % — 100 fits the ball and its ring inside the margin
  panX: 0,              // mm at 100 % — the point brought to the middle of the sheet
  panY: 0,

  // the lines
  meshLines: 'every edge',
  outline: true,
  contours: 0,          // levels of the waves' height; 0 draws none
  contourKeep: 'all',
  slices: 'none',
  sliceSpacing: 3,      // mm on paper between two slices, through the middle
  sliceCount: 12,       // meridian planes — each one cuts two meridians
  sliceTilt: 35,        // deg — how far `tilted` slices lean off the equator
  sliceTurn: 0,         // deg — and which way
  shading: 'none',
  shadeLevels: 2,
  shadeFrom: 45,        // % of full light below which the shading starts
  shadeSpacing: 0.8,    // mm between hatch lines, or between dots where it is darkest
  shadeAngle: 45,       // deg on paper
  shadowEdge: false,    // the line where the light gives out, drawn as well
  lightAz: -40,         // deg — 0 from behind the viewer, −90 from the left
  lightEl: 35,          // deg — from above
  sky: 'none',
  skySpacing: 4,        // mm
  skyAmount: 50,        // %
  minStroke: 0.2,       // mm — a piece cut shorter than this by what hides it is left out

  // pens — each layer is sent to one of them
  pens: 2,
  meshPen: 1,
  outlinePen: 1,
  wavesPen: 2,
  slicesPen: 1,
  shadePen: 1,
  ringPen: 2,
  skyPen: 1,
  ink0: '#1d1d1f',
  ink1: '#c0392b',
  ink2: '#1a6dd1',
  ink3: '#2a8a4a',
  paperColor: '#ffffff',   // the preview only — the files have no background

  // the painted preview — a picture of the same sheet, never plotted
  preview: 'plot',
  ballColor: '#f4a30b',
  ballShadow: '#7a3300',
  shine: 55,            // %
  skyTop: '#7d8ca6',
  skyBottom: '#e3e6ec',
  clouds: 55,           // %
  ringColor: '#c0392b',
  ringAlpha: 45,        // %
  harmony: 'any',

  // output
  optimiseOrder: true,
  liveUpdate: true,
  showGuides: true,
  pngDpi: 200,

  // composition — lines over the preview to place the drawing by, never plotted
  composeLines: 'none',
  showFrame: false,
};

const DEFAULTS = { ...settings };

// A handful of sheets worth starting from. Each one is the whole state, so a scene is
// also the shortest way to see what one part of the sidebar is for. The waves drawn by
// hand are part of the state too, so a scene clears them.
const SCENES = [
  { label: '— select scene —' },
  { label: 'Rippled planet', s: {} },
  { label: 'Painted, like the picture', s: { preview: 'painted', ringAlpha: 55 } },
  { label: 'Plain geodesic ball', s: {
      noiseAmp: 0, weaveAmp: 0, ring: 'none', detail: 120, pens: 1 } },
  { label: 'Crumpled paper', s: {
      ring: 'none', noiseAmp: 9, noiseStyle: 'creases', noiseSize: 1.6, noiseWarp: 1.1,
      noiseOctaves: 4, weaveAmp: 0, slide: 88, detail: 200, pens: 1 } },
  { label: 'Three drops, drawn by hand', s: {
      noiseAmp: 0, weaveAmp: 0, ring: 'none', detail: 280, pens: 1,
      waves: 'pu.b4.7.1qk.23t.~pp.8w.6.2gd.1hi.~pm.7s.5.1kw.102.' } },
  { label: 'Drops as contours', s: {
      noiseAmp: 0, weaveAmp: 0, ring: 'none', slide: 0, meshLines: 'none', contours: 12,
      contourKeep: 'crests', wavesPen: 1, pens: 1,
      waves: 'pu.b4.7.1qk.23t.~pp.8w.6.2gd.1hi.~pm.7s.5.1kw.102.' } },
  { label: 'Rain of ripples', s: {
      noiseAmp: 0, weaveAmp: 0, rippleAmp: 2, rippleDrops: 5, rippleLength: 10,
      rippleReach: 40, ring: 'none', detail: 300, pens: 1 } },
  { label: 'Folded like cloth', s: {
      noiseAmp: 1.5, noiseStyle: 'smooth', weaveAmp: 0, foldAmp: 7, foldCount: 10,
      foldWidth: 9, foldLength: 120, foldProfile: 'fold', slide: 85, ring: 'none',
      detail: 190, pens: 1 } },
  { label: 'Basket weave', s: {
      noiseAmp: 0, weaveAmp: 4, weaveTiles: 7, weaveFolds: 2, slide: 90, ring: 'none',
      detail: 200, pens: 1 } },
  { label: 'Saturn', s: {
      mesh: 'lat-long', detail: 96, noiseAmp: 0, weaveAmp: 0, ribAmp: 1.2, ribKind: 'rings',
      ribRings: 9, slide: 60, ring: 'flat', ringInner: 1.35, ringOuter: 2.2, ringBands: 3,
      ringGap: 18, ringTilt: 26, ringTurn: 20, ringLines: 'grooves', ringSpacing: 0.9,
      ringOpaque: true, elevation: 18, orientation: 'landscape', pens: 1, ringPen: 1 } },
  { label: 'Melon', s: {
      mesh: 'lat-long', detail: 120, noiseAmp: 0, weaveAmp: 0, ribAmp: 7, ribKind: 'ribs',
      ribCount: 14, slide: 60, ring: 'none', elevation: 28, pens: 1 } },
  { label: 'Wobbly star', s: {
      noiseAmp: 0, weaveAmp: 0, ribAmp: 12, ribKind: 'harmonic', ribCount: 5, ribRings: 8,
      slide: 40, ring: 'none', meshLines: 'none', slices: 'depth', sliceSpacing: 2.2,
      pens: 1, slicesPen: 1 } },
  { label: 'Spiral shell', s: {
      mesh: 'lat-long triangles', detail: 140, noiseAmp: 0, weaveAmp: 0, ribAmp: 5,
      ribKind: 'spiral', ribCount: 7, ribRings: 5, slide: 70, ring: 'none', pens: 1 } },
  { label: 'Topographic moon', s: {
      noiseAmp: 7, noiseStyle: 'smooth', noiseSize: 1.8, noiseWarp: 0.3, weaveAmp: 0,
      slide: 0, ring: 'none', meshLines: 'none', contours: 16, wavesPen: 1,
      shading: 'hatch', shadeLevels: 1, lightAz: -70, lightEl: 20, shadowEdge: true,
      pens: 1 } },
  { label: 'Sliced', s: {
      noiseAmp: 6, noiseStyle: 'ridges', noiseWarp: 0.5, weaveAmp: 0, slide: 0,
      ring: 'none', meshLines: 'none', slices: 'latitudes', sliceSpacing: 1.8,
      elevation: 30, pens: 1 } },
  { label: 'Moon in its phase', s: {
      noiseAmp: 3, noiseStyle: 'smooth', weaveAmp: 0, slide: 0, ring: 'none',
      meshLines: 'none', shading: 'hatch', shadeLevels: 2, shadeFrom: 60, lightAz: -100,
      lightEl: 10, shadeSpacing: 1, pens: 1 } },
  { label: 'Stippled', s: {
      noiseAmp: 4, weaveAmp: 0, slide: 40, ring: 'none', meshLines: 'none',
      shading: 'dots', shadeFrom: 80, shadeSpacing: 1.2, lightAz: -50, lightEl: 30,
      pens: 1 } },
  { label: 'Globe', s: {
      mesh: 'lat-long', detail: 72, noiseAmp: 0, weaveAmp: 0, ring: 'none', elevation: 20,
      pens: 1 } },
  { label: 'Cube blown round', s: {
      mesh: 'cube', detail: 96, noiseAmp: 3, noiseStyle: 'smooth', weaveAmp: 0, slide: 60,
      ring: 'none', pens: 1 } },
  { label: 'Starry night', s: {
      sky: 'stars', skyAmount: 60, paperColor: '#15171c', ink0: '#f1efe6',
      ink1: '#f2b544', pens: 2 } },
  { label: 'Halo', s: { sky: 'halo', skySpacing: 3, ringOpaque: true } },
  { label: 'Sea of waves', s: {
      sky: 'waves', skySpacing: 3.5, skyAmount: 40, orientation: 'landscape' } },
  { label: 'White gel pen on black', s: {
      paperColor: '#1d1d1f', ink0: '#f2f1ea', ink1: '#ff9a3c' } },
  { label: 'In perspective', s: { projection: 'perspective', distance: 3.2, elevation: 20 } },
];

const setters   = {};        // settings key -> function that moves its control
const fieldDivs = {};        // settings key -> the .field wrapper, for showing/hiding
let statsDiv, linkDiv, penListDiv, waveNote, layerButtons = {}, toolButtons = {};

let area    = null;          // { x0, y0, x1, y1, w, h } — the drawable box, in mm
let shapes  = null;          // { pts, off, ink, lay } — polylines in mm
let strokes = 0;             // how many of them, even when there are too many to draw
let plan    = null;          // { order, flip, ink, travel }
let perPen  = null;          // per pen: { strokes, ink }
let perLayer = null;         // per layer: { strokes, ink }
let counts  = null;          // what the hidden-line pass found, for the stats
let lastMs  = 0;
let drag    = null;          // the camera being turned or the sheet panned
let frameBox = null;         // { x0, y0, x1, y1 } — what the drawing covers on paper, in mm
let inkMid  = null;          // { x, y } — where the weight of the ink sits, in mm

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

function wrapDeg(a) { return ((a + 180) % 360 + 360) % 360 - 180; }

function rad(deg) { return deg * Math.PI / 180; }

function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
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

// A number in [0, 1) for a pair of integers and a salt — what a point of the net or a
// star in the sky makes of the seed, so none of them depends on the order they are
// visited in.
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

function rgbHex(r, g, b) {
  const h = v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}

////////////////////////////////////////////////////////////////////////////////////////
// The URL is the document
//
// Every setting that differs from its default is written into the hash, debounced, with
// replaceState so the back button stays usable. Opening that link anywhere rebuilds the
// same sheet — the seed and the waves drawn by hand are in there too, so nothing is left
// to chance.

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
  syncVisibility();
}

function onHashChange() {
  const h = location.hash.replace(/^#/, '');
  if (h === urlWritten) return;                    // our own write coming back
  Object.assign(settings, DEFAULTS);
  applyState(h);
  urlWritten = h;
  refreshControls();
  refreshWaveNote();
  resizeForPaper();
}

////////////////////////////////////////////////////////////////////////////////////////
// Geometry

function paperDims() {
  const [a, b] = PAPER_SIZES[settings.paper] || PAPER_SIZES.A4;
  return settings.orientation === 'portrait' ? [a, b] : [b, a];
}

// The pen is round, so ink reaches half a pen width past the end of every line: the
// drawable box is the sheet less the margin less that half width.
function drawArea() {
  const [W, H] = paperDims();
  const m = settings.margin + settings.penWidth / 2;
  return { x0: m, y0: m, x1: W - m, y1: H - m, w: W - 2 * m, h: H - 2 * m };
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
  window.addEventListener('resize', applyCanvasDisplay);
  area = drawArea();            // the sidebar is built before the first update

  const [w, h] = paperDims();
  const s = previewScale();
  pixelDensity(1);
  createCanvas(Math.round(w * s), Math.round(h * s)).parent('sheet');
  OVERLAY = document.createElement('canvas');
  OVERLAY.className = 'overlay';
  document.getElementById('sheet').appendChild(OVERLAY);
  sizeOverlay();
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
  const aw = box ? box.clientWidth - 48 : MAX_PREVIEW_W;
  const ah = box ? box.clientHeight - 48 : MAX_PREVIEW_H;
  const scale = Math.max(0.5, Math.min(aw / pw, ah / ph));
  for (const c of [canvasEl(), OVERLAY]) {
    if (!c) continue;
    c.style.width  = pw * scale + 'px';
    c.style.height = ph * scale + 'px';
  }
}

function sizeOverlay() {
  const c = canvasEl();
  if (!OVERLAY || !c) return;
  OVERLAY.width = c.width;
  OVERLAY.height = c.height;
}

function resizeForPaper() {
  const [w, h] = paperDims();
  const s = previewScale();
  resizeCanvas(Math.round(w * s), Math.round(h * s));
  sizeOverlay();
  applyCanvasDisplay();
  update();
}

// Everything, from the net to the order the pen visits the strokes in. The net and the
// waves on it are kept from one update to the next and built again only when something
// they depend on has moved, so turning the camera costs the lines and nothing else.
function update() {
  const t0 = performance.now();
  area = drawArea();
  strokes = 0;
  shapes = plan = perPen = perLayer = counts = frameBox = inkMid = null;
  const mesh = ensureMesh();
  const surf = mesh && ensureSurface(mesh);

  if (area.w > 0 && area.h > 0 && surf) {
    makeView();
    fitView();
    buildRing();
    projectAll();
    buildOccluders();
    shapes = buildShapes();
    strokes = shapes.off.length - 1;
    // Past the limit nothing is ordered, drawn or exported — the stats say why.
    if (strokes > MAX_STROKES) { shapes = null; }
    else { plan = orderShapes(shapes); inkMid = measureInk(); }
    frameBox = measureFrame();
  }

  lastMs = performance.now() - t0;
  drawPreview();
  syncVisibility();
  updateStats();
  syncUrl();
}

// Called while a slider, the camera or a wave is being dragged. When a whole update
// cannot keep up, the drag shows the ball alone and the lines wait for the mouse to
// come up.
function liveUpdate() {
  if (!settings.liveUpdate || lastMs > LIVE_BUDGET_MS) return false;
  update();
  return true;
}

// The wheel has no release to wait for, so a change it could not follow live is drawn
// once it has stopped turning.
let settleTimer = null;

function settle() {
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => { settleTimer = null; update(); }, SETTLE_MS);
}

////////////////////////////////////////////////////////////////////////////////////////
// Noise
//
// Improved Perlin in three dimensions, seeded, and octaves of it summed. It lumps and
// creases the skin, swirls itself when it is warped, and draws the clouds of the sky.

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

// Octaves, each half the size of the last and `gain` of its weight, brought up to about
// ±1 — plain Perlin rarely strays past ±0.7, and a sum of them less.
function fbm3(nz, x, y, z, octaves, gain) {
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * nz(x * f + o * 17.31, y * f - o * 9.73, z * f + o * 5.19);
    norm += amp;
    amp *= gain;
    f *= 2;
  }
  return 1.6 * sum / norm;
}

let NZ_SKIN = null, NZ_W1 = null, NZ_W2 = null, NZ_W3 = null, NZ_SKY = null, nzSeed = null;

function ensureNoise(seed) {
  if (nzSeed === seed && NZ_SKIN) return;
  NZ_SKIN = makePerlin3(seed * 5 + 1);
  NZ_W1 = makePerlin3(seed * 5 + 2);
  NZ_W2 = makePerlin3(seed * 5 + 3);
  NZ_W3 = makePerlin3(seed * 5 + 4);
  NZ_SKY = makePerlin3(seed * 5 + 5);
  nzSeed = seed;
}

////////////////////////////////////////////////////////////////////////////////////////
// The net
//
// The ball before any wave touches it: points on the unit sphere and the triangles
// between them, every triangle turned so that its corners run anticlockwise seen from
// outside. Three ways of cutting it:
//
// - geodesic — an icosahedron, each of its twenty faces cut into n² triangles on a
//   grid and blown out onto the sphere. The points on its edges and corners are shared
//   between faces by where they sit on them, not by searching, so none is doubled.
// - lat-long — rings of latitude and meridians; the quads between them are split into
//   triangles for the hidden lines, but the diagonal is not drawn. `lat-long triangles`
//   shifts every other ring by half a step instead, so the net is all triangles, nearly
//   equal, and all of it drawn.
// - cube — a cube's six faces cut into n × n squares and blown out, spaced by angle so
//   the squares near its corners are not squeezed; again the diagonals are not drawn.
//
// `detail` is the same thing for all three: about how many edges run round the ball.

let MESH = null, meshKeyNow = '';

function meshKey() {
  const s = settings;
  return [s.mesh, Math.round(s.detail), s.jitter, s.jitter > 0 ? s.seed : 0].join('|');
}

function ensureMesh() {
  const key = meshKey();
  if (MESH && key === meshKeyNow) return MESH;
  const s = settings, d = Math.max(4, Math.round(s.detail));
  let net;
  if (s.mesh === 'lat-long' || s.mesh === 'lat-long triangles') {
    const M = Math.max(4, d), P = Math.max(2, Math.round(d / 2));
    net = 4 * M * P <= MAX_FACES ? latLongNet(M, P, s.mesh === 'lat-long triangles') : null;
  } else if (s.mesh === 'cube') {
    const n = Math.max(1, Math.round(d / 4));
    net = 12 * n * n <= MAX_FACES ? cubeNet(n) : null;
  } else {
    // an icosahedron's edge is 63.4° of arc, so n of them to a face edge go 5.68 n round
    const n = Math.max(1, Math.round(d / 5.676));
    net = 20 * n * n <= MAX_FACES ? geodesicNet(n) : null;
  }
  MESH = net ? finishNet(net) : null;
  if (MESH && s.jitter > 0) jitterNet(MESH, s.jitter / 100);
  meshKeyNow = key;
  SURF = null;
  return MESH;
}

function geodesicNet(n) {
  const t = (1 + Math.sqrt(5)) / 2;
  const C = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t],
             [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
  const T = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9],
             [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2],
             [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10],
             [8, 6, 7], [9, 8, 1]];
  const edgeOf = new Map();
  for (const f of T) {
    for (let k = 0; k < 3; k++) {
      const a = f[k], b = f[(k + 1) % 3], key = Math.min(a, b) * 12 + Math.max(a, b);
      if (!edgeOf.has(key)) edgeOf.set(key, edgeOf.size);
    }
  }
  const perEdge = n - 1, perFace = (n - 1) * (n - 2) / 2;
  const nv = 12 + 30 * perEdge + 20 * perFace;
  const U = new Float64Array(3 * nv), done = new Uint8Array(nv);
  const F = new Int32Array(3 * 20 * n * n);
  const idx = new Int32Array((n + 1) * (n + 1));   // (i, j) on a face's grid -> point
  let nf = 0;

  // the k-th of the n − 1 points on the icosahedron's edge from corner p towards q
  const onEdge = (p, q, k) => {
    const e = edgeOf.get(Math.min(p, q) * 12 + Math.max(p, q));
    return 12 + e * perEdge + (p < q ? k - 1 : perEdge - k);
  };

  T.forEach((f, fi) => {
    const [A, B, D] = f, a = C[A], b = C[B], c = C[D];
    let inner = 12 + 30 * perEdge + fi * perFace;
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i + j <= n; i++) {
        let v;
        if (i === 0 && j === 0) v = A;
        else if (i === n) v = B;
        else if (j === n) v = D;
        else if (j === 0) v = onEdge(A, B, i);
        else if (i === 0) v = onEdge(A, D, j);
        else if (i + j === n) v = onEdge(B, D, j);
        else v = inner++;
        idx[j * (n + 1) + i] = v;
        if (done[v]) continue;
        done[v] = 1;
        const x = a[0] + (b[0] - a[0]) * i / n + (c[0] - a[0]) * j / n;
        const y = a[1] + (b[1] - a[1]) * i / n + (c[1] - a[1]) * j / n;
        const z = a[2] + (b[2] - a[2]) * i / n + (c[2] - a[2]) * j / n;
        const l = Math.hypot(x, y, z);
        U[3 * v] = x / l; U[3 * v + 1] = y / l; U[3 * v + 2] = z / l;
      }
    }
    for (let j = 0; j < n; j++) {
      for (let i = 0; i + j < n; i++) {
        const p = idx[j * (n + 1) + i], q = idx[j * (n + 1) + i + 1];
        const r = idx[(j + 1) * (n + 1) + i];
        F[3 * nf] = p; F[3 * nf + 1] = q; F[3 * nf + 2] = r; nf++;
        if (i + j < n - 1) {
          const w = idx[(j + 1) * (n + 1) + i + 1];
          F[3 * nf] = q; F[3 * nf + 1] = w; F[3 * nf + 2] = r; nf++;
        }
      }
    }
  });
  return { U, F, nv, nf, hidden: null };
}

// M points round every ring, P bands from pole to pole.
function latLongNet(M, P, stagger) {
  const nv = 2 + (P - 1) * M;
  const U = new Float64Array(3 * nv);
  U[1] = 1;                                 // the north pole
  U[3 * (nv - 1) + 1] = -1;                 // and the south
  const vid = (k, j) => 1 + (k - 1) * M + ((j % M) + M) % M;
  for (let k = 1; k < P; k++) {
    const th = Math.PI * k / P, y = Math.cos(th), r = Math.sin(th);
    const off = stagger && k % 2 ? 0.5 : 0;
    for (let j = 0; j < M; j++) {
      const ph = 2 * Math.PI * (j + off) / M, v = vid(k, j);
      U[3 * v] = r * Math.cos(ph); U[3 * v + 1] = y; U[3 * v + 2] = r * Math.sin(ph);
    }
  }
  const F = [], hidden = [];
  for (let j = 0; j < M; j++) {
    F.push(0, vid(1, j), vid(1, j + 1));
    F.push(nv - 1, vid(P - 1, j + 1), vid(P - 1, j));
  }
  for (let k = 1; k < P - 1; k++) {
    for (let j = 0; j < M; j++) {
      if (!stagger) {
        const a = vid(k, j), b = vid(k + 1, j), c = vid(k + 1, j + 1), d = vid(k, j + 1);
        F.push(a, b, c, a, c, d);
        hidden.push(a, c);
      } else if (k % 2 === 0) {
        F.push(vid(k, j), vid(k + 1, j), vid(k, j + 1));
        F.push(vid(k, j + 1), vid(k + 1, j), vid(k + 1, j + 1));
      } else {
        F.push(vid(k, j), vid(k + 1, j), vid(k + 1, j + 1));
        F.push(vid(k, j), vid(k + 1, j + 1), vid(k, j + 1));
      }
    }
  }
  return { U, F: Int32Array.from(F), nv, nf: F.length / 3, hidden };
}

// Six faces of a cube, n × n squares each, the lattice points on its surface shared
// between the faces that meet there. Each coordinate is spaced by angle — tan of it —
// so the squares come out much the same size all over the ball.
function cubeNet(n) {
  const at = new Map(), pos = [];
  const warp = c => Math.tan((2 * c / n - 1) * Math.PI / 4);
  const vert = (i, j, k) => {
    const key = (i * (n + 1) + j) * (n + 1) + k;
    let v = at.get(key);
    if (v === undefined) {
      v = pos.length / 3;
      at.set(key, v);
      const x = warp(i), y = warp(j), z = warp(k), l = Math.hypot(x, y, z);
      pos.push(x / l, y / l, z / l);
    }
    return v;
  };
  const F = [], hidden = [];
  for (let axis = 0; axis < 3; axis++) {
    for (const side of [0, n]) {
      for (let u = 0; u < n; u++) {
        for (let w = 0; w < n; w++) {
          const c = (a, b) => {
            const g = [0, 0, 0];
            g[axis] = side; g[(axis + 1) % 3] = a; g[(axis + 2) % 3] = b;
            return vert(g[0], g[1], g[2]);
          };
          const p = c(u, w), q = c(u + 1, w), r = c(u + 1, w + 1), s = c(u, w + 1);
          F.push(p, q, r, p, r, s);
          hidden.push(p, r);
        }
      }
    }
  }
  return { U: Float64Array.from(pos), F: Int32Array.from(F), nv: pos.length / 3,
           nf: F.length / 3, hidden };
}

// Every triangle turned to run anticlockwise seen from outside, every edge found once
// with the two triangles on either side of it, and every point's neighbours listed.
function finishNet(net) {
  const { U, F, nv, nf } = net;
  for (let f = 0; f < nf; f++) {
    const a = F[3 * f], b = F[3 * f + 1], c = F[3 * f + 2];
    const ux = U[3 * b] - U[3 * a], uy = U[3 * b + 1] - U[3 * a + 1], uz = U[3 * b + 2] - U[3 * a + 2];
    const vx = U[3 * c] - U[3 * a], vy = U[3 * c + 1] - U[3 * a + 1], vz = U[3 * c + 2] - U[3 * a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * (U[3 * a] + U[3 * b] + U[3 * c]) + ny * (U[3 * a + 1] + U[3 * b + 1] + U[3 * c + 1]) +
        nz * (U[3 * a + 2] + U[3 * b + 2] + U[3 * c + 2]) < 0) {
      F[3 * f + 1] = c; F[3 * f + 2] = b;
    }
  }

  const edgeOf = new Map();
  const E = [], EF = [];
  for (let f = 0; f < nf; f++) {
    for (let k = 0; k < 3; k++) {
      const a = F[3 * f + k], b = F[3 * f + (k + 1) % 3];
      const lo = Math.min(a, b), hi = Math.max(a, b), key = lo * nv + hi;
      const e = edgeOf.get(key);
      if (e === undefined) {
        edgeOf.set(key, E.length / 2);
        E.push(lo, hi);
        EF.push(f, -1);
      } else {
        EF[2 * e + 1] = f;
      }
    }
  }
  const ne = E.length / 2;
  const drawn = new Uint8Array(ne).fill(1);
  if (net.hidden) {
    for (let i = 0; i < net.hidden.length; i += 2) {
      const a = net.hidden[i], b = net.hidden[i + 1];
      const e = edgeOf.get(Math.min(a, b) * nv + Math.max(a, b));
      if (e !== undefined) drawn[e] = 0;
    }
  }

  const nbOff = new Int32Array(nv + 1);
  for (let e = 0; e < ne; e++) { nbOff[E[2 * e] + 1]++; nbOff[E[2 * e + 1] + 1]++; }
  for (let v = 0; v < nv; v++) nbOff[v + 1] += nbOff[v];
  const nbIdx = new Int32Array(2 * ne), cur = nbOff.slice(0, nv);
  for (let e = 0; e < ne; e++) {
    const a = E[2 * e], b = E[2 * e + 1];
    nbIdx[cur[a]++] = b;
    nbIdx[cur[b]++] = a;
  }

  let arc = 0;
  for (let e = 0; e < ne; e++) {
    const a = E[2 * e], b = E[2 * e + 1];
    arc += Math.acos(clamp(U[3 * a] * U[3 * b] + U[3 * a + 1] * U[3 * b + 1] +
                           U[3 * a + 2] * U[3 * b + 2], -1, 1));
  }

  return { U, F, nv, nf, ne, E: Int32Array.from(E), EF: Int32Array.from(EF), drawn,
           nbOff, nbIdx, edgeArc: arc / Math.max(1, ne) };
}

// Each point pushed along the sphere, a random way and up to `amount` of an edge, so the
// net loses its regularity and reads more like a surface scanned than one computed.
function jitterNet(M, amount) {
  const U = M.U, r = amount * M.edgeArc * 0.5;
  for (let v = 0; v < M.nv; v++) {
    const x = U[3 * v], y = U[3 * v + 1], z = U[3 * v + 2];
    // two directions along the sphere at this point
    let ax = -z, ay = 0, az = x;
    if (Math.abs(y) > 0.9) { ax = 0; ay = z; az = -y; }
    let l = Math.hypot(ax, ay, az);
    ax /= l; ay /= l; az /= l;
    const bx = y * az - z * ay, by = z * ax - x * az, bz = x * ay - y * ax;
    const ang = 2 * Math.PI * hash01(v, 1, 71), d = r * Math.sqrt(hash01(v, 2, 71));
    const c = d * Math.cos(ang), s = d * Math.sin(ang);
    const nx = x + c * ax + s * bx, ny = y + c * ay + s * by, nz = z + c * az + s * bz;
    l = Math.hypot(nx, ny, nz);
    U[3 * v] = nx / l; U[3 * v + 1] = ny / l; U[3 * v + 2] = nz / l;
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Waves drawn by hand, as text
//
// They live in the URL like every other setting, so they are written in the handful of
// characters a URL leaves alone. A point on the ball is folded onto an octahedron and
// the octahedron unfolded into a square, which is kept in 1/4096ths each way — a
// twentieth of a degree at worst. A wave is a letter for its profile, then its height
// in tenths of a percent, its width in tenths of a degree and its ripples, then its
// first point, then each point's step from the one before as two zigzagged varints,
// five bits a character. The wave as it is drawn live is read back from those same
// numbers, so what the mouse drew and what the link replays are the same wave.

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// A unit vector to the square [0, OCT_Q)², and back.
function octEncode(x, y, z) {
  const l = Math.abs(x) + Math.abs(y) + Math.abs(z);
  let u = x / l, v = y / l;
  if (z < 0) {
    const pu = u, pv = v;
    u = (1 - Math.abs(pv)) * (pu >= 0 ? 1 : -1);
    v = (1 - Math.abs(pu)) * (pv >= 0 ? 1 : -1);
  }
  const q = OCT_Q - 1;
  return [Math.round((u + 1) / 2 * q), Math.round((v + 1) / 2 * q)];
}

function octDecode(qx, qy, out, o) {
  const q = OCT_Q - 1;
  let u = qx / q * 2 - 1, v = qy / q * 2 - 1;
  const z = 1 - Math.abs(u) - Math.abs(v);
  if (z < 0) {
    const pu = u, pv = v;
    u = (1 - Math.abs(pv)) * (pu >= 0 ? 1 : -1);
    v = (1 - Math.abs(pu)) * (pv >= 0 ? 1 : -1);
  }
  const l = Math.hypot(u, v, z);
  out[o] = u / l; out[o + 1] = v / l; out[o + 2] = z / l;
}

function parseWaves(str) {
  const out = [];
  for (const part of String(str || '').split('~')) {
    const kind = PROFILE_KEYS.indexOf(part[0]);
    if (kind < 0) continue;
    const bits = part.slice(1).split('.');
    if (bits.length < 5) continue;
    const nums = bits.slice(0, 5).map(b => parseInt(b, 36));
    if (!nums.every(Number.isFinite)) continue;
    const [amp, width, ripples, x0, y0] = nums;
    const qx = [x0], qy = [y0];
    const d = bits[5] || '';
    const vals = [];
    let acc = 0, mul = 1, ok = true;
    for (let i = 0; i < d.length; i++) {
      const c = B64.indexOf(d[i]);
      if (c < 0) { ok = false; break; }
      acc += (c & 31) * mul;
      if (c & 32) { mul *= 32; continue; }
      vals.push(acc % 2 ? -(acc + 1) / 2 : acc / 2);
      acc = 0; mul = 1;
    }
    if (!ok) continue;
    for (let i = 0; i + 1 < vals.length; i += 2) {
      qx.push(qx[qx.length - 1] + vals[i]);
      qy.push(qy[qy.length - 1] + vals[i + 1]);
    }
    if (!qx.every(v => v >= 0 && v < OCT_Q) || !qy.every(v => v >= 0 && v < OCT_Q)) continue;
    out.push({ kind, amp, width: Math.max(1, width), ripples: Math.max(1, ripples), qx, qy });
  }
  return out;
}

function encodeWaves(list) {
  const zz = v => {
    let z = v >= 0 ? 2 * v : -2 * v - 1, s = '';
    for (;;) {
      const c = z % 32;
      z = Math.floor(z / 32);
      if (z > 0) s += B64[c + 32]; else { s += B64[c]; break; }
    }
    return s;
  };
  return list.map(w => {
    let d = '';
    for (let i = 1; i < w.qx.length; i++) {
      d += zz(w.qx[i] - w.qx[i - 1]) + zz(w.qy[i] - w.qy[i - 1]);
    }
    return PROFILE_KEYS[w.kind] +
      [w.amp, w.width, w.ripples, w.qx[0], w.qy[0]].map(v => Math.round(v).toString(36)).join('.') +
      '.' + d;
  }).join('~');
}

////////////////////////////////////////////////////////////////////////////////////////
// The waves
//
// The height of the skin over a point u of the unit sphere, as a share of the radius, is
// the sum of everything below. Each source is read at u alone, so the height can be
// asked anywhere — at the points of the net, and again where they have slid to.
//
// - noise: fractal Perlin at u times the lump size, octave on octave. `ridges` folds it
//   up at its zero into sharp crests, `creases` down into sharp troughs; a warp first
//   pushes u about by noise of its own, which swirls the lumps into folds.
// - ripples: from a few drops scattered over the ball, cos(2π θ / λ − phase) · e^(−θ/R),
//   θ the arc from the drop. Every drop reads the same table, looked up by the chord to
//   it — a square root and a lerp.
// - folds and waves drawn by hand: a path over the ball, and a profile across it read
//   by how far u is from the path — the arc to the nearest point of it, and for a fold,
//   which side it is on. A lone point is a drop of its own: its profile runs round it.
// - weave: space is cut into cubes, and each cube's folds run east–west or north–south
//   across the ball where it cuts it, the two in turn like the strands of a basket. The
//   cubes are blended into their neighbours over a narrow seam, so the tiles meet
//   without a step.
// - ribs, rings, spirals round the ball's axis, and spherical harmonics — standing
//   waves, the shapes a bubble rings in.

let WV_NOISE = 0, WV_STYLE = 0, WV_NSIZE = 1, WV_OCT = 3, WV_GAIN = 0.5, WV_WARP = 0;
let WV_RIPPLE = 0, NDROPS = 0, DROPS = new Float64Array(0);
const DROP_N = 4096;
const DROP_T = new Float64Array(DROP_N + 2);
let WV_WEAVE = 0, WEAVE_T = 6, WEAVE_F = 2.5;
let WV_RIB = 0, RIB_KIND = 0, RIB_N = 12, RIB_K = 6, RIB_M = 6, RIB_PH = 0, RIB_NORM = 1;

// The paths — folds and waves drawn by hand — cut into arcs, each arc filed in every cube
// of a grid over the ball that its reach touches, so a point asks only the arcs near it.
const SG_STRIDE = 19;
let NST = 0, NSG = 0;
let ST_KIND = new Int32Array(0), ST_AMP = new Float64Array(0), ST_W = new Float64Array(0);
let ST_RIP = new Float64Array(0);
let SG = new Float64Array(0), SG_ST = new Int32Array(0);
let GRID_G = 1, GRID_CS = 2.4, GRID_OFF = new Int32Array(2), GRID_IDX = new Int32Array(0);
let SSTAMP = new Int32Array(0), SBEST = new Float64Array(0), SPERP = new Float64Array(0);
let STOUCH = new Int32Array(0), SCALL = 0;
let STROKE_LIST = [];        // the paths as they were laid, for the guides

function prepareWaves() {
  const s = settings;
  ensureNoise(Math.round(s.seed));
  WV_NOISE = s.noiseAmp / 100;
  WV_STYLE = Math.max(0, NOISE_STYLES.indexOf(s.noiseStyle));
  WV_NSIZE = Math.max(0.05, s.noiseSize);
  WV_OCT = clamp(Math.round(s.noiseOctaves), 1, 8);
  WV_GAIN = clamp(s.noiseRough, 0.05, 0.95);
  WV_WARP = Math.max(0, s.noiseWarp);
  WV_WEAVE = s.weaveAmp / 100;
  WEAVE_T = Math.max(1, s.weaveTiles);
  WEAVE_F = Math.max(0.25, s.weaveFolds);
  prepareDrops();
  prepareRibs();
  prepareStrokes();
}

function heightAt(x, y, z) {
  let h = 0;
  if (WV_NOISE !== 0) h += WV_NOISE * noiseHeight(x, y, z);
  if (WV_RIPPLE !== 0) h += WV_RIPPLE * rippleHeight(x, y, z);
  if (WV_WEAVE !== 0) h += WV_WEAVE * weaveHeight(x, y, z);
  if (WV_RIB !== 0) h += WV_RIB * ribHeight(x, y, z);
  if (NSG) h += strokeHeight(x, y, z);
  return h;
}

// --- noise ---

function noiseHeight(x, y, z) {
  let px = x * WV_NSIZE, py = y * WV_NSIZE, pz = z * WV_NSIZE;
  if (WV_WARP > 0) {
    const qx = px * 0.6 + 3.1, qy = py * 0.6 - 1.7, qz = pz * 0.6 + 0.4;
    px += WV_WARP * fbm3(NZ_W1, qx, qy, qz, 2, 0.5);
    py += WV_WARP * fbm3(NZ_W2, qx, qy, qz, 2, 0.5);
    pz += WV_WARP * fbm3(NZ_W3, qx, qy, qz, 2, 0.5);
  }
  const v = fbm3(NZ_SKIN, px, py, pz, WV_OCT, WV_GAIN);
  // |v| averages about 0.35, so the folded kinds are brought back to about zero
  return WV_STYLE === 0 ? v : WV_STYLE === 1 ? 0.7 - 2 * Math.abs(v) : 2 * Math.abs(v) - 0.7;
}

// --- ripples from drops ---

function prepareDrops() {
  const s = settings;
  WV_RIPPLE = s.rippleAmp / 100;
  NDROPS = WV_RIPPLE !== 0 ? clamp(Math.round(s.rippleDrops), 0, 64) : 0;
  if (!NDROPS) { WV_RIPPLE = 0; return; }
  const rnd = mulberry32(Math.round(s.seed) * 9973 + 17);
  DROPS = new Float64Array(3 * NDROPS);
  for (let k = 0; k < NDROPS; k++) {
    const y = 2 * rnd() - 1, a = 2 * Math.PI * rnd(), r = Math.sqrt(1 - y * y);
    DROPS[3 * k] = r * Math.cos(a); DROPS[3 * k + 1] = y; DROPS[3 * k + 2] = r * Math.sin(a);
  }
  const lambda = Math.max(0.5, s.rippleLength), reach = Math.max(1, s.rippleReach);
  const phase = rad(s.ripplePhase);
  for (let k = 0; k <= DROP_N + 1; k++) {
    const chord = Math.min(2, 2 * k / DROP_N);
    const th = 2 * Math.asin(chord / 2) * 180 / Math.PI;
    DROP_T[k] = Math.cos(2 * Math.PI * th / lambda - phase) * Math.exp(-th / reach);
  }
}

function rippleHeight(x, y, z) {
  let h = 0;
  for (let k = 0; k < NDROPS; k++) {
    const dx = x - DROPS[3 * k], dy = y - DROPS[3 * k + 1], dz = z - DROPS[3 * k + 2];
    const f = Math.sqrt(dx * dx + dy * dy + dz * dz) * (DROP_N / 2);
    const i = f | 0, t = f - i;
    h += DROP_T[i] + t * (DROP_T[i + 1] - DROP_T[i]);
  }
  return h;
}

// --- a weave of tiles ---

function sharpen(t) {
  const s = t * t * (3 - 2 * t);
  return s * s * (3 - 2 * s);
}

function weaveHeight(x, y, z) {
  const c = 2 / WEAVE_T, k = 2 * Math.PI * WEAVE_F / c;
  const gx = (x + 1) / c - 0.5, gy = (y + 1) / c - 0.5, gz = (z + 1) / c - 0.5;
  const ix = Math.floor(gx), iy = Math.floor(gy), iz = Math.floor(gz);
  const fx = sharpen(gx - ix), fy = sharpen(gy - iy), fz = sharpen(gz - iz);
  let h = 0;
  for (let d = 0; d < 8; d++) {
    const dx = d & 1, dy = (d >> 1) & 1, dz = d >> 2;
    const w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz);
    if (w < 1e-5) continue;
    const cx = ix + dx, cy = iy + dy, cz = iz + dz;
    // the tile's middle, taken onto the ball, and east and north there
    let mx = (cx + 0.5) * c - 1, my = (cy + 0.5) * c - 1, mz = (cz + 0.5) * c - 1;
    const ml = Math.hypot(mx, my, mz) || 1;
    mx /= ml; my /= ml; mz /= ml;
    let ex = -mz, ez = mx, el = Math.hypot(ex, ez);
    if (el < 1e-6) { ex = 1; ez = 0; el = 1; }
    ex /= el; ez /= el;
    let ux, uy, uz;
    if (((cx + cy + cz) & 1) === 0) { ux = ex; uy = 0; uz = ez; }
    else { ux = my * ez; uy = mz * ex - mx * ez; uz = -my * ex; }
    h += w * Math.sin(k * (x * ux + y * uy + z * uz));
  }
  return h;
}

// --- ribs, rings, spirals and harmonics ---

// The associated Legendre function P_l^m(x), by the usual upward recurrence.
function legendreP(l, m, x) {
  let pmm = 1;
  if (m > 0) {
    const s = Math.sqrt(Math.max(0, (1 - x) * (1 + x)));
    let f = 1;
    for (let i = 1; i <= m; i++) { pmm *= -f * s; f += 2; }
  }
  if (l === m) return pmm;
  let pm1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) return pm1;
  let pl = 0;
  for (let ll = m + 2; ll <= l; ll++) {
    pl = (x * (2 * ll - 1) * pm1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pm1;
    pm1 = pl;
  }
  return pl;
}

function prepareRibs() {
  const s = settings;
  WV_RIB = s.ribAmp / 100;
  RIB_KIND = Math.max(0, RIB_KINDS.indexOf(s.ribKind));
  RIB_N = Math.max(0, Math.round(s.ribCount));
  RIB_K = Math.max(0, Math.round(s.ribRings));
  RIB_PH = rad(s.ribPhase);
  if (RIB_KIND === 3) {
    RIB_K = Math.max(1, RIB_K);
    RIB_M = Math.min(RIB_N, RIB_K);
    let mx = 0;
    for (let i = 0; i <= 2000; i++) mx = Math.max(mx, Math.abs(legendreP(RIB_K, RIB_M, -1 + i / 1000)));
    RIB_NORM = mx > 0 ? mx : 1;
  }
}

function ribHeight(x, y, z) {
  const th = Math.acos(clamp(y, -1, 1)), ph = Math.atan2(z, x);
  // ribs crowd together at the poles, so they fade out before they get there
  const pole = () => smoothstep(0.03, 0.4, Math.sqrt(x * x + z * z));
  switch (RIB_KIND) {
    case 0: return Math.sin(RIB_N * ph + RIB_PH) * pole();
    case 1: return Math.cos(2 * RIB_K * th + RIB_PH);
    case 2: return Math.sin(RIB_N * ph + 2 * RIB_K * th + RIB_PH) * pole();
    default: return legendreP(RIB_K, RIB_M, y) * Math.cos(RIB_M * ph + RIB_PH) / RIB_NORM;
  }
}

// --- folds and waves drawn by hand ---

// The profile across a path, x being the distance from it in widths and xs the same with
// the side it is on. Every one of them is gone by a width out.
function profile(kind, x, xs, rip) {
  const w = 1 - x * x, w2 = w * w;
  switch (kind) {
    case 0: return w2;                                     // ridge
    case 1: return -w2;                                    // trough
    case 2: return 3.494 * xs * w2;                        // fold: up one side, down the other
    case 3: { const c = 1 - x; return -c * c * c; }        // crease: a sharp V
    default: return Math.cos(Math.PI * rip * x) * w2;      // ripples, running out either side
  }
}

// Folds wander over the ball from a random start, turning as a slow noise tells them.
function foldStrokes(list) {
  const s = settings, n = clamp(Math.round(s.foldCount), 0, 200);
  const rnd = mulberry32(Math.round(s.seed) * 7717 + 3);
  const w = rad(Math.max(0.5, s.foldWidth));
  const step = clamp(w / 4, rad(0.5), rad(3));
  const steps = Math.max(1, Math.round(rad(Math.max(0, s.foldLength)) / step));
  const curl = s.foldCurl / 100;
  const kind = Math.max(0, PROFILES.indexOf(s.foldProfile));
  for (let k = 0; k < n; k++) {
    const y0 = 2 * rnd() - 1, a = 2 * Math.PI * rnd(), r = Math.sqrt(1 - y0 * y0);
    let px = r * Math.cos(a), py = y0, pz = r * Math.sin(a);
    let hx = rnd() - 0.5, hy = rnd() - 0.5, hz = rnd() - 0.5;
    let d = hx * px + hy * py + hz * pz;
    hx -= d * px; hy -= d * py; hz -= d * pz;
    let l = Math.hypot(hx, hy, hz) || 1;
    hx /= l; hy /= l; hz /= l;
    const pts = [px, py, pz];
    for (let i = 0; i < steps; i++) {
      const turn = 5 * curl * step * NZ_W1(i * 0.12, k * 7.31 + 0.5, 3.7);
      const cx = py * hz - pz * hy, cy = pz * hx - px * hz, cz = px * hy - py * hx;
      const ct = Math.cos(turn), st = Math.sin(turn);
      hx = hx * ct + cx * st; hy = hy * ct + cy * st; hz = hz * ct + cz * st;
      const cs = Math.cos(step), ss = Math.sin(step);
      const nx = px * cs + hx * ss, ny = py * cs + hy * ss, nz = pz * cs + hz * ss;
      hx = hx * cs - px * ss; hy = hy * cs - py * ss; hz = hz * cs - pz * ss;
      l = Math.hypot(nx, ny, nz);
      px = nx / l; py = ny / l; pz = nz / l;
      d = hx * px + hy * py + hz * pz;
      hx -= d * px; hy -= d * py; hz -= d * pz;
      l = Math.hypot(hx, hy, hz) || 1;
      hx /= l; hy /= l; hz /= l;
      pts.push(px, py, pz);
    }
    list.push({ kind, amp: s.foldAmp / 100, w, rip: 3, pts: Float64Array.from(pts), drawn: -1 });
  }
}

// Every path there is: the waves drawn by hand, the one being drawn, each of them copied
// round the axis if asked, and the folds.
function prepareStrokes() {
  const s = settings, list = [];
  const drawn = parseWaves(s.waves);
  if (LIVE && LIVE.qx.length) drawn.push(LIVE);
  const k = s.drawnAmp / 100, R = clamp(Math.round(s.brushRepeat), 1, 24);
  drawn.forEach((wv, wi) => {
    const m = wv.qx.length, base = new Float64Array(3 * m);
    for (let i = 0; i < m; i++) octDecode(wv.qx[i], wv.qy[i], base, 3 * i);
    for (let r = 0; r < R; r++) {
      const a = 2 * Math.PI * r / R, c = Math.cos(a), sn = Math.sin(a);
      const pts = new Float64Array(3 * m);
      for (let i = 0; i < m; i++) {
        const x = base[3 * i], z = base[3 * i + 2];
        pts[3 * i] = c * x + sn * z;
        pts[3 * i + 1] = base[3 * i + 1];
        pts[3 * i + 2] = -sn * x + c * z;
      }
      list.push({ kind: wv.kind, amp: wv.amp / 1000 * k, w: rad(wv.width / 10), rip: wv.ripples,
                  pts, drawn: wv === LIVE ? -2 : wi });
    }
  });
  if (s.foldAmp !== 0 && s.foldCount > 0) foldStrokes(list);
  STROKE_LIST = list;
  layStrokes(list);
}

function layStrokes(list) {
  NST = list.length;
  NSG = 0;
  if (!NST) return;
  ST_KIND = new Int32Array(NST); ST_AMP = new Float64Array(NST);
  ST_W = new Float64Array(NST); ST_RIP = new Float64Array(NST);
  SSTAMP = new Int32Array(NST); SBEST = new Float64Array(NST);
  SPERP = new Float64Array(NST); STOUCH = new Int32Array(NST);
  SCALL = 0;

  let nsg = 0;
  for (const st of list) nsg += Math.max(1, st.pts.length / 3 - 1);
  SG = new Float64Array(SG_STRIDE * nsg);
  SG_ST = new Int32Array(nsg);

  let minReach = Infinity;
  list.forEach((st, id) => {
    ST_KIND[id] = st.kind; ST_AMP[id] = st.amp; ST_W[id] = Math.max(1e-4, st.w);
    ST_RIP[id] = st.rip;
    const p = st.pts, m = p.length / 3;
    const lay = (ax, ay, az, bx, by, bz, freeA, freeB) => {
      const o = NSG * SG_STRIDE;
      SG[o + 17] = freeA ? 1 : 0; SG[o + 18] = freeB ? 1 : 0;
      SG_ST[NSG] = id;
      SG[o] = ax; SG[o + 1] = ay; SG[o + 2] = az;
      SG[o + 3] = bx; SG[o + 4] = by; SG[o + 5] = bz;
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      const nl = Math.hypot(nx, ny, nz);
      let len = -1, mx = ax, my = ay, mz = az;
      if (nl > 1e-12) {
        len = Math.atan2(nl, ax * bx + ay * by + az * bz);
        nx /= nl; ny /= nl; nz /= nl;
        SG[o + 6] = nx; SG[o + 7] = ny; SG[o + 8] = nz;
        SG[o + 9] = ny * az - nz * ay; SG[o + 10] = nz * ax - nx * az; SG[o + 11] = nx * ay - ny * ax;
        mx = ax + bx; my = ay + by; mz = az + bz;
        const ml = Math.hypot(mx, my, mz);
        mx /= ml; my /= ml; mz /= ml;
      }
      SG[o + 12] = len;
      SG[o + 13] = mx; SG[o + 14] = my; SG[o + 15] = mz;
      const reach = Math.max(0, len) / 2 + ST_W[id] + 1e-9;
      SG[o + 16] = Math.cos(Math.min(Math.PI, reach));
      if (reach < minReach) minReach = reach;
      NSG++;
    };
    if (m === 1) lay(p[0], p[1], p[2], p[0], p[1], p[2], true, true);
    for (let i = 0; i + 1 < m; i++) {
      lay(p[3 * i], p[3 * i + 1], p[3 * i + 2], p[3 * i + 3], p[3 * i + 4], p[3 * i + 5],
          i === 0, i + 2 === m);
    }
  });

  // The grid: cubes of about the smallest reach, over the box round the ball. An arc goes
  // into every cube within its reach that the sphere passes through.
  GRID_CS = clamp(minReach, 0.05, 0.4);
  GRID_G = Math.ceil(2.4 / GRID_CS);
  GRID_CS = 2.4 / GRID_G;
  const G = GRID_G, cs = GRID_CS, ncell = G * G * G;
  const shell = (i, j, k) => {
    const x0 = i * cs - 1.2, y0 = j * cs - 1.2, z0 = k * cs - 1.2;
    const x1 = x0 + cs, y1 = y0 + cs, z1 = z0 + cs;
    const nearest = (a, b) => a > 0 ? a : b < 0 ? -b : 0;
    const dn = nearest(x0, x1) ** 2 + nearest(y0, y1) ** 2 + nearest(z0, z1) ** 2;
    const df = Math.max(x0 * x0, x1 * x1) + Math.max(y0 * y0, y1 * y1) + Math.max(z0 * z0, z1 * z1);
    return dn <= 1 && df >= 1;
  };
  const visit = fn => {
    for (let sgi = 0; sgi < NSG; sgi++) {
      const o = sgi * SG_STRIDE;
      const reach = Math.acos(clamp(SG[o + 16], -1, 1));
      const r = 2 * Math.sin(Math.min(Math.PI, reach) / 2) + 1e-6;
      const lo = v => clamp(Math.floor((v - r + 1.2) / cs), 0, G - 1);
      const hi = v => clamp(Math.floor((v + r + 1.2) / cs), 0, G - 1);
      const mx = SG[o + 13], my = SG[o + 14], mz = SG[o + 15];
      for (let i = lo(mx); i <= hi(mx); i++) {
        for (let j = lo(my); j <= hi(my); j++) {
          for (let k = lo(mz); k <= hi(mz); k++) {
            if (shell(i, j, k)) fn((i * G + j) * G + k, sgi);
          }
        }
      }
    }
  };
  GRID_OFF = new Int32Array(ncell + 1);
  visit(c => { GRID_OFF[c + 1]++; });
  for (let c = 0; c < ncell; c++) GRID_OFF[c + 1] += GRID_OFF[c];
  GRID_IDX = new Int32Array(GRID_OFF[ncell]);
  const cur = GRID_OFF.slice(0, ncell);
  visit((c, sgi) => { GRID_IDX[cur[c]++] = sgi; });
}

function strokeHeight(x, y, z) {
  const G = GRID_G, cs = GRID_CS;
  const ix = clamp(Math.floor((x + 1.2) / cs), 0, G - 1);
  const iy = clamp(Math.floor((y + 1.2) / cs), 0, G - 1);
  const iz = clamp(Math.floor((z + 1.2) / cs), 0, G - 1);
  const c = (ix * G + iy) * G + iz;
  const a0 = GRID_OFF[c], a1 = GRID_OFF[c + 1];
  if (a0 === a1) return 0;
  if (++SCALL > 2e9) { SCALL = 1; SSTAMP.fill(0); }
  const call = SCALL;
  let nt = 0;
  for (let p = a0; p < a1; p++) {
    const sgi = GRID_IDX[p], o = sgi * SG_STRIDE;
    if (x * SG[o + 13] + y * SG[o + 14] + z * SG[o + 15] < SG[o + 16]) continue;
    const id = SG_ST[sgi], len = SG[o + 12];
    const ca = x * SG[o] + y * SG[o + 1] + z * SG[o + 2];
    let full, perp;
    if (len < 0) {
      full = perp = Math.acos(ca > 1 ? 1 : ca < -1 ? -1 : ca);
    } else {
      const dp = x * SG[o + 6] + y * SG[o + 7] + z * SG[o + 8];
      perp = Math.asin(dp > 1 ? 1 : dp < -1 ? -1 : dp);
      const along = Math.atan2(x * SG[o + 9] + y * SG[o + 10] + z * SG[o + 11], ca);
      if (along >= 0 && along <= len) {
        full = perp < 0 ? -perp : perp;
      } else {
        // Past an end of the arc. Where the path goes on, the side is the one the point
        // is on and the distance the whole of it, the same from the arcs either side of the
        // bend; past a free end of the path, the side is read square to its last arc, so a
        // fold dies away round the end instead of flipping over along its line.
        const cb = x * SG[o + 3] + y * SG[o + 4] + z * SG[o + 5];
        const nearA = ca >= cb, c = nearA ? ca : cb;
        full = Math.acos(c > 1 ? 1 : c);
        if (!SG[o + (nearA ? 17 : 18)]) perp = perp < 0 ? -full : full;
      }
    }
    if (SSTAMP[id] !== call) {
      SSTAMP[id] = call; SBEST[id] = full; SPERP[id] = perp; STOUCH[nt++] = id;
    } else if (full < SBEST[id]) {
      SBEST[id] = full; SPERP[id] = perp;
    }
  }
  let h = 0;
  for (let i = 0; i < nt; i++) {
    const id = STOUCH[i], w = ST_W[id], xf = SBEST[id] / w;
    if (xf >= 1) continue;
    h += ST_AMP[id] * profile(ST_KIND[id], xf, SPERP[id] / w, ST_RIP[id]);
  }
  return h;
}

////////////////////////////////////////////////////////////////////////////////////////
// The skin
//
// The height is read at every point of the net and the point pushed out along its
// radius by it. Then, if the net is to slide, each point is moved along the ball
// downhill — against the slope of the waves, softened and read off its neighbours — by
// c times that slope. A field of moves −c∇h squeezes the net by c·∇²h, most where the
// trough is deepest and sharpest, so c is chosen for that squeeze to be `slide` in the
// deepest troughs. A crease is sharper than any trough — the squeeze there has no bound —
// so the points round a triangle squeezed too flat are held back until it is not, and
// the net never folds over itself. The height is then read again where each point has
// come to rest: the triangles have moved, the ball has not.

let SURF = null, surfKeyNow = '';
let LIVE = null, LIVE_VER = 0;       // the wave being drawn, and how many points it has had

// The heights, softened by averaging every point with its neighbours over and over — each
// round spreads them by about 0.7 of an edge, so this many rounds soften them by `deg`.
// The net is let slide by the slope of the softened waves, so a sharp crease gathers it
// from a wide stretch either side, not only from the last triangle before its bottom.
function softened(M, H0, deg) {
  const rounds = clamp(Math.round(2 * (rad(Math.max(0, deg)) / M.edgeArc) ** 2), 0, 400);
  let a = H0, b = new Float64Array(M.nv);
  if (!rounds) return a;
  a = Float64Array.from(H0);
  for (let r = 0; r < rounds; r++) {
    for (let v = 0; v < M.nv; v++) {
      const p0 = M.nbOff[v], p1 = M.nbOff[v + 1];
      let sum = 0;
      for (let p = p0; p < p1; p++) sum += a[M.nbIdx[p]];
      b[v] = 0.5 * a[v] + 0.5 * sum / Math.max(1, p1 - p0);
    }
    const t = a; a = b; b = t;
  }
  return a;
}

function waveKey() {
  const s = settings;
  return [s.amplitude, s.slide, s.slideSoft, s.noiseAmp, s.noiseStyle, s.noiseSize, s.noiseOctaves,
          s.noiseRough, s.noiseWarp, s.rippleAmp, s.rippleDrops, s.rippleLength,
          s.rippleReach, s.ripplePhase, s.foldAmp, s.foldCount, s.foldLength, s.foldWidth,
          s.foldCurl, s.foldProfile, s.weaveAmp, s.weaveTiles, s.weaveFolds, s.ribAmp,
          s.ribKind, s.ribCount, s.ribRings, s.ribPhase, s.drawnAmp, s.brushRepeat,
          s.waves, Math.round(s.seed), LIVE ? 'live' + LIVE_VER : ''].join('|');
}

function ensureSurface(M) {
  const key = meshKeyNow + '#' + waveKey();
  if (SURF && key === surfKeyNow) return SURF;
  SURF = computeSurface(M);
  surfKeyNow = key;
  return SURF;
}

function computeSurface(M) {
  prepareWaves();
  const nv = M.nv, U = M.U, amp = settings.amplitude / 100, lo = MIN_R - 1;
  const H0 = new Float64Array(nv);
  if (amp !== 0) {
    for (let v = 0; v < nv; v++) {
      const h = amp * heightAt(U[3 * v], U[3 * v + 1], U[3 * v + 2]);
      H0[v] = h < lo ? lo : h;
    }
  }

  const D = new Float64Array(3 * nv), H = new Float64Array(nv);
  const sl = clamp(settings.slide / 100, -SLIDE_MAX, SLIDE_MAX);
  let moved = 0;
  if (sl !== 0 && amp !== 0) {
    const Hs = softened(M, H0, settings.slideSoft);
    const G = new Float64Array(3 * nv), L = new Float64Array(nv);
    for (let v = 0; v < nv; v++) {
      const x = U[3 * v], y = U[3 * v + 1], z = U[3 * v + 2];
      let gx = 0, gy = 0, gz = 0, e2 = 0, dh = 0;
      for (let p = M.nbOff[v]; p < M.nbOff[v + 1]; p++) {
        const j = M.nbIdx[p];
        let ex = U[3 * j] - x, ey = U[3 * j + 1] - y, ez = U[3 * j + 2] - z;
        const d = ex * x + ey * y + ez * z;
        ex -= d * x; ey -= d * y; ez -= d * z;
        const dj = Hs[j] - Hs[v];
        gx += dj * ex; gy += dj * ey; gz += dj * ez;
        e2 += ex * ex + ey * ey + ez * ez;
        dh += dj;
      }
      if (e2 > 0) {
        G[3 * v] = 2 * gx / e2; G[3 * v + 1] = 2 * gy / e2; G[3 * v + 2] = 2 * gz / e2;
        L[v] = 4 * dh / e2;
      }
    }
    // The squeeze aimed at is `slide` in the deepest troughs but for the last one in a
    // hundred of the points, so a few sharp creases do not hold the rest of the net back.
    const deep = [];
    for (let v = 0; v < nv; v++) { const c = sl > 0 ? L[v] : -L[v]; if (c > 0) deep.push(c); }
    deep.sort((a, b) => a - b);
    const lref = deep.length ? deep[Math.min(deep.length - 1, Math.floor(0.99 * deep.length))] : 0;
    const k = lref > 1e-12 ? Math.abs(sl) / lref : 0, sg = sl > 0 ? -k : k;

    // Where that would squeeze a triangle to less than a twentieth — in those creases —
    // its corners are held back, a little at a time, until none is.
    const scale = new Float64Array(nv).fill(1), F = M.F, nf = M.nf;
    const A0 = new Float64Array(nf);
    const place = () => {
      for (let v = 0; v < nv; v++) {
        const c = sg * scale[v];
        let x = U[3 * v] + c * G[3 * v], y = U[3 * v + 1] + c * G[3 * v + 1];
        let z = U[3 * v + 2] + c * G[3 * v + 2];
        const l = Math.hypot(x, y, z);
        D[3 * v] = x / l; D[3 * v + 1] = y / l; D[3 * v + 2] = z / l;
      }
    };
    const area = (Q, f) => {
      const a = F[3 * f], b = F[3 * f + 1], c = F[3 * f + 2];
      const ux = Q[3 * b] - Q[3 * a], uy = Q[3 * b + 1] - Q[3 * a + 1], uz = Q[3 * b + 2] - Q[3 * a + 2];
      const vx = Q[3 * c] - Q[3 * a], vy = Q[3 * c + 1] - Q[3 * a + 1], vz = Q[3 * c + 2] - Q[3 * a + 2];
      return (uy * vz - uz * vy) * (Q[3 * a] + Q[3 * b] + Q[3 * c]) +
             (uz * vx - ux * vz) * (Q[3 * a + 1] + Q[3 * b + 1] + Q[3 * c + 1]) +
             (ux * vy - uy * vx) * (Q[3 * a + 2] + Q[3 * b + 2] + Q[3 * c + 2]);
    };
    for (let f = 0; f < nf; f++) A0[f] = area(U, f);
    let bad = 1;
    for (let round = 0; round < 60 && bad; round++) {
      place();
      bad = 0;
      for (let f = 0; f < nf; f++) {
        if (area(D, f) >= (1 - SLIDE_MAX) * A0[f]) continue;
        bad++;
        for (let i = 0; i < 3; i++) scale[F[3 * f + i]] *= 0.8;
      }
    }
    if (bad) place();                          // the last round's holding back, too

    for (let v = 0; v < nv; v++) {
      const x = D[3 * v], y = D[3 * v + 1], z = D[3 * v + 2];
      const h = amp * heightAt(x, y, z);
      H[v] = h < lo ? lo : h;
      const m = Math.hypot(x - U[3 * v], y - U[3 * v + 1], z - U[3 * v + 2]);
      if (m > moved) moved = m;
    }
  } else {
    D.set(U);
    H.set(H0);
  }

  const P = new Float64Array(3 * nv);
  let hMin = Infinity, hMax = -Infinity;
  for (let v = 0; v < nv; v++) {
    const r = 1 + H[v];
    P[3 * v] = r * D[3 * v]; P[3 * v + 1] = r * D[3 * v + 1]; P[3 * v + 2] = r * D[3 * v + 2];
    if (H[v] < hMin) hMin = H[v];
    if (H[v] > hMax) hMax = H[v];
  }

  // the normals: of every triangle, and of every point, the triangles round it weighted
  // by how large they are
  const F = M.F, nf = M.nf;
  const FN = new Float64Array(3 * nf), VN = new Float64Array(3 * nv);
  for (let f = 0; f < nf; f++) {
    const a = F[3 * f], b = F[3 * f + 1], c = F[3 * f + 2];
    const ux = P[3 * b] - P[3 * a], uy = P[3 * b + 1] - P[3 * a + 1], uz = P[3 * b + 2] - P[3 * a + 2];
    const vx = P[3 * c] - P[3 * a], vy = P[3 * c + 1] - P[3 * a + 1], vz = P[3 * c + 2] - P[3 * a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) { VN[3 * v] += nx; VN[3 * v + 1] += ny; VN[3 * v + 2] += nz; }
    const l = Math.hypot(nx, ny, nz) || 1;
    FN[3 * f] = nx / l; FN[3 * f + 1] = ny / l; FN[3 * f + 2] = nz / l;
  }
  for (let v = 0; v < nv; v++) {
    const l = Math.hypot(VN[3 * v], VN[3 * v + 1], VN[3 * v + 2]) || 1;
    VN[3 * v] /= l; VN[3 * v + 1] /= l; VN[3 * v + 2] /= l;
  }

  return { P, D, H, FN, VN, hMin, hMax, moved };
}

////////////////////////////////////////////////////////////////////////////////////////
// The ring
//
// A ring round the ball, in a plane tilted off its equator: `flat`, an annulus lying in
// that plane like a planet's, or `band`, a strip standing up round it like a hoop. Either
// is cut into bands with gaps between, and either can rise and fall as it goes round.
// It is a net of its own, rows of points round it and quads between them, and its lines
// run along those rows — the rims at its edges, the grooves between — or across them,
// the spokes, so every line lies exactly on the ring it is drawn on. The ring has no
// inside and no outside: both of its faces show, and it hides — when it is opaque —
// whatever is behind either.

let RING = null;             // { V, nv, F, nf, lines: [[vertex, …], …] }
let RING_E1 = [1, 0, 0], RING_E2 = [0, 0, 1], RING_N = [0, 1, 0];

function ringFrame() {
  const t = rad(settings.ringTilt), a = rad(settings.ringTurn);
  // the line the ring tilts about, in the equator, and the ring's axis tipped over it
  const kx = Math.cos(a), kz = -Math.sin(a);
  const ct = Math.cos(t), st = Math.sin(t);
  // (0, 1, 0) turned by t about k = (kx, 0, kz): v cos t + (k × v) sin t
  RING_N = [-kz * st, ct, kx * st];
  RING_E1 = [kx, 0, kz];
  const n = RING_N, e = RING_E1;
  RING_E2 = [n[1] * e[2] - n[2] * e[1], n[2] * e[0] - n[0] * e[2], n[0] * e[1] - n[1] * e[0]];
}

// The bands of a ring as [inner, outer] radii (flat) or [bottom, top] heights (band).
function ringBands() {
  const s = settings, B = clamp(Math.round(s.ringBands), 1, 12), g = Math.max(0, s.ringGap) / 100;
  let a, b;
  if (s.ring === 'flat') {
    a = Math.max(0.01, Math.min(s.ringInner, s.ringOuter));
    b = Math.max(a + 0.001, Math.max(s.ringInner, s.ringOuter));
  } else {
    const h = Math.max(0.001, s.ringHeight);
    a = -h / 2; b = h / 2;
  }
  const w = (b - a) / (B + (B - 1) * g), out = [];
  for (let k = 0; k < B; k++) {
    const lo = a + k * w * (1 + g);
    out.push([lo, lo + w]);
  }
  return out;
}

// A point of the ring: `r` across it (a radius, or a height for a band) at angle φ.
function ringPoint(r, ph, out, o) {
  const s = settings, e1 = RING_E1, e2 = RING_E2, n = RING_N;
  const wob = s.ringWobble / 100 * Math.sin(Math.round(s.ringWaves) * ph);
  const c = Math.cos(ph), sn = Math.sin(ph);
  let rad0, up;
  if (s.ring === 'flat') {
    // a brim: the further out, the more it rises and falls
    const lo = Math.min(s.ringInner, s.ringOuter), hi = Math.max(s.ringInner, s.ringOuter);
    rad0 = r;
    up = wob * clamp((r - lo) / Math.max(1e-6, hi - lo), 0, 1);
  } else {
    rad0 = Math.max(0.01, s.ringRadius);
    up = r + wob;
  }
  out[o]     = rad0 * (c * e1[0] + sn * e2[0]) + up * n[0];
  out[o + 1] = rad0 * (c * e1[1] + sn * e2[1]) + up * n[1];
  out[o + 2] = rad0 * (c * e1[2] + sn * e2[2]) + up * n[2];
}

// The outer edge of the ring, for the fit: it has to be known before the scale is.
function ringOutline(n) {
  const out = [], bands = ringBands(), p = [0, 0, 0];
  const edges = settings.ring === 'flat' ? [bands[bands.length - 1][1]]
    : [bands[0][0], bands[bands.length - 1][1]];
  for (const r of edges) {
    for (let i = 0; i < n; i++) {
      ringPoint(r, 2 * Math.PI * i / n, p, 0);
      out.push(p[0], p[1], p[2]);
    }
  }
  return out;
}

// Built once the scale is known: the rows are as far apart as the lines asked for, and
// the points round it close enough that no chord is longer than a millimetre or two.
function buildRing() {
  RING = null;
  const s = settings;
  if (s.ring === 'none') return;
  ringFrame();
  const bands = ringBands(), sp = Math.max(0.1, s.ringSpacing);
  const outR = s.ring === 'flat' ? Math.max(s.ringInner, s.ringOuter) : Math.max(0.01, s.ringRadius);
  const waves = Math.round(s.ringWaves);
  let M = clamp(Math.round(2 * Math.PI * outR * S / 1.5), 96, 2400);
  if (s.ringWobble !== 0) M = Math.max(M, 24 * Math.abs(waves));
  const spokes = s.ringLines === 'spokes' || s.ringLines === 'grid';
  let every = 1;
  if (spokes) {
    const n = clamp(Math.round(2 * Math.PI * outR * S / sp), 3, 4000);
    every = Math.max(1, Math.round(M / n));
    M = n * every;
  }
  const grooves = s.ringLines === 'grooves' || s.ringLines === 'grid';
  // A ring seen close up with fine grooves would be millions of points; past RING_MAX the
  // grooves are spaced wider, as few times as it takes.
  let across0 = 0;
  for (const [a, b] of bands) across0 += Math.max(1, Math.round((b - a) * S / sp)) + 1;
  const wider = Math.max(1, Math.ceil(across0 * M / RING_MAX));
  const rows = [];                            // per band, the r of each row
  for (const [a, b] of bands) {
    const across = Math.max(1, Math.round((b - a) * S / (sp * wider)));
    const n = grooves ? across : Math.max(1, s.ringWobble !== 0 ? Math.ceil(across / 4) : 1);
    const list = [];
    for (let k = 0; k <= n; k++) list.push(a + (b - a) * k / n);
    rows.push(list);
  }
  let nv = 0;
  for (const r of rows) nv += r.length * M;
  const V = new Float64Array(3 * nv), F = [], lines = [];
  let base = 0;
  for (const list of rows) {
    const R = list.length;
    for (let k = 0; k < R; k++) {
      for (let j = 0; j < M; j++) ringPoint(list[k], 2 * Math.PI * j / M, V, 3 * (base + k * M + j));
    }
    for (let k = 0; k + 1 < R; k++) {
      for (let j = 0; j < M; j++) {
        const a = base + k * M + j, b = base + k * M + (j + 1) % M;
        const c = base + (k + 1) * M + (j + 1) % M, d = base + (k + 1) * M + j;
        F.push(a, b, c, a, c, d);
      }
    }
    // rims always; the rows between when grooved
    for (let k = 0; k < R; k++) {
      if (k !== 0 && k !== R - 1 && !grooves) continue;
      const line = [];
      for (let j = 0; j <= M; j++) line.push(base + k * M + j % M);
      lines.push(line);
    }
    if (spokes) {
      for (let j = 0; j < M; j += every) {
        const line = [];
        for (let k = 0; k < R; k++) line.push(base + k * M + j);
        lines.push(line);
      }
    }
    base += R * M;
  }
  RING = { V, nv, F: Int32Array.from(F), nf: F.length / 3, lines };
}

////////////////////////////////////////////////////////////////////////////////////////
// The camera
//
// Round the ball's axis by the azimuth, above its equator by the elevation, turned on
// the sheet by the roll. Seen from there, a point has a right, an up and a nearness. A
// parallel view takes right and up straight onto the paper; a perspective one from
// `distance` radii away divides them by how far off the point is, so that at the middle
// of the ball both come out the same size. The nearness kept with every point on paper
// is the depth itself for the one, and D (D/d − 1) for the other: 1/d is what varies in
// step with the paper across a flat triangle, so a triangle stays flat, its depth still
// a plane over the paper, and a straight line still straight.

let CAM = null;
let S = 1, OX = 0, OY = 0;         // mm to one radius, and where the middle of the ball lands
let PXo = 0, PYo = 0, PQo = 0;     // what project() leaves behind

function makeView() {
  const s = settings;
  const az = rad(s.azimuth), el = rad(clamp(s.elevation, -89.99, 89.99)), ro = rad(s.roll);
  const bx = Math.cos(el) * Math.sin(az), by = Math.sin(el), bz = Math.cos(el) * Math.cos(az);
  const rx = Math.cos(az), ry = 0, rz = -Math.sin(az);
  const ux = by * rz - bz * ry, uy = bz * rx - bx * rz, uz = bx * ry - by * rx;
  const c = Math.cos(ro), sn = Math.sin(ro);
  CAM = {
    bx, by, bz,
    rx: c * rx + sn * ux, ry: c * ry + sn * uy, rz: c * rz + sn * uz,
    ux: c * ux - sn * rx, uy: c * uy - sn * ry, uz: c * uz - sn * rz,
    persp: s.projection === 'perspective',
    D: Math.max(1.2, s.distance),
  };
}

function project(x, y, z) {
  const C = CAM;
  const cx = x * C.rx + y * C.ry + z * C.rz;
  const cy = x * C.ux + y * C.uy + z * C.uz;
  const cz = x * C.bx + y * C.by + z * C.bz;
  if (C.persp) {
    const d = Math.max(1e-3, C.D - cz), k = C.D / d;
    PXo = S * cx * k + OX;
    PYo = -S * cy * k + OY;
    PQo = S * C.D * (k - 1);
  } else {
    PXo = S * cx + OX;
    PYo = -S * cy + OY;
    PQo = S * cz;
  }
}

// The fit: the ball, as if it were a sphere a little larger than its radius to leave room
// for its waves, and the outside of the ring just fit inside the margin at a zoom of 100 %.
// The waves themselves are left out of it, so drawing one never moves the rest.
function fitView() {
  S = 1; OX = 0; OY = 0;
  let x0, x1, y0, y1;
  const r = HEADROOM;
  if (CAM.persp) {
    const D = CAM.D, rr = D * r / Math.sqrt(Math.max(1e-6, D * D - r * r));
    x0 = y0 = -rr; x1 = y1 = rr;
  } else {
    x0 = y0 = -r; x1 = y1 = r;
  }
  if (settings.ring !== 'none') {
    ringFrame();
    const o = ringOutline(180);
    for (let i = 0; i < o.length; i += 3) {
      project(o[i], o[i + 1], o[i + 2]);
      if (PXo < x0) x0 = PXo; if (PXo > x1) x1 = PXo;
      if (PYo < y0) y0 = PYo; if (PYo > y1) y1 = PYo;
    }
  }
  const z = settings.zoom / 100;
  S = Math.min(area.w / Math.max(1e-9, x1 - x0), area.h / Math.max(1e-9, y1 - y0)) * z;
  OX = (area.x0 + area.x1) / 2 - S * (x0 + x1) / 2 - settings.panX * z;
  OY = (area.y0 + area.y1) / 2 - S * (y0 + y1) / 2 - settings.panY * z;
}

// Everything onto the paper: the ball's points first, then the ring's.
let VX = new Float64Array(0), VY = new Float64Array(0), VQ = new Float64Array(0);
let NVB = 0, NVR = 0, NFB = 0, NFR = 0;

function projectAll() {
  const P = SURF.P;
  NVB = MESH.nv; NFB = MESH.nf;
  NVR = RING ? RING.nv : 0; NFR = RING ? RING.nf : 0;
  const n = NVB + NVR;
  if (VX.length < n) { VX = new Float64Array(n); VY = new Float64Array(n); VQ = new Float64Array(n); }
  for (let v = 0; v < NVB; v++) {
    project(P[3 * v], P[3 * v + 1], P[3 * v + 2]);
    VX[v] = PXo; VY[v] = PYo; VQ[v] = PQo;
  }
  for (let v = 0; v < NVR; v++) {
    project(RING.V[3 * v], RING.V[3 * v + 1], RING.V[3 * v + 2]);
    VX[NVB + v] = PXo; VY[NVB + v] = PYo; VQ[NVB + v] = PQo;
  }
}

function faceVerts(f) {
  if (f < NFB) return [MESH.F[3 * f], MESH.F[3 * f + 1], MESH.F[3 * f + 2]];
  const g = f - NFB;
  return [NVB + RING.F[3 * g], NVB + RING.F[3 * g + 1], NVB + RING.F[3 * g + 2]];
}

////////////////////////////////////////////////////////////////////////////////////////
// What can hide anything
//
// Every triangle of the ball turned towards the camera, and every triangle of the ring
// when the ring is opaque: its three corners on paper, turned anticlockwise, the plane
// its nearness makes over the paper, q = A x + B y + C, its box and how near it comes.
// A triangle turned away from the camera shows its corners clockwise on the paper, which
// is how it is told apart. They are filed in a grid of bins over the paper, each bin
// listing the triangles whose box reaches into it.

let NOCC = 0;
let OAX = new Float64Array(0), OAY = OAX, OBX = OAX, OBY = OAX, OCX = OAX, OCY = OAX;
let OPA = OAX, OPB = OAX, OPC = OAX, OX0 = OAX, OY0 = OAX, OX1 = OAX, OY1 = OAX, OQM = OAX;
let OFACE = new Int32Array(0), OSTAMP = new Int32Array(0), OSTAMP_N = 0;
let FRONT = new Uint8Array(0);       // per triangle of the ball: turned towards the camera
let FACE_OCC = new Int32Array(0);    // per triangle, ball and ring: its place among the hiders
let BIN_W = 1, BIN_H = 1, BIN_X0 = 0, BIN_Y0 = 0, BIN_SZ = 1;
let BIN_OFF = new Int32Array(2), BIN_IDX = new Int32Array(0);
let QEPS = 1e-6;

function buildOccluders() {
  const nf = NFB + NFR;
  if (OAX.length < nf) {
    const f = () => new Float64Array(nf);
    OAX = f(); OAY = f(); OBX = f(); OBY = f(); OCX = f(); OCY = f();
    OPA = f(); OPB = f(); OPC = f(); OX0 = f(); OY0 = f(); OX1 = f(); OY1 = f(); OQM = f();
    OFACE = new Int32Array(nf); OSTAMP = new Int32Array(nf);
  }
  if (FRONT.length < NFB) FRONT = new Uint8Array(NFB);
  if (FACE_OCC.length < nf) FACE_OCC = new Int32Array(nf);
  OSTAMP.fill(0);
  OSTAMP_N = 0;
  QEPS = Q_EPS * Math.max(1, S);

  NOCC = 0;
  let sumW = 0, bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  const ringHides = RING && settings.ringOpaque;
  const BF = MESH.F, RF = RING ? RING.F : null;
  for (let f = 0; f < nf; f++) {
    FACE_OCC[f] = -1;
    let a, b, c;
    if (f < NFB) { a = BF[3 * f]; b = BF[3 * f + 1]; c = BF[3 * f + 2]; }
    else {
      const g = f - NFB;
      a = NVB + RF[3 * g]; b = NVB + RF[3 * g + 1]; c = NVB + RF[3 * g + 2];
    }
    let ax = VX[a], ay = VY[a], bx = VX[b], by = VY[b], cx = VX[c], cy = VY[c];
    let qa = VQ[a], qb = VQ[b], qc = VQ[c];
    let den = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
    if (f < NFB) {
      FRONT[f] = den < 0 ? 1 : 0;
      if (!FRONT[f]) continue;
    } else if (!ringHides) {
      continue;
    }
    if (Math.abs(den) < 1e-12) continue;          // seen edge on: it hides nothing
    // wholly outside the drawable box, it hides nothing that is drawn
    if (Math.max(ax, bx, cx) < area.x0 || Math.min(ax, bx, cx) > area.x1 ||
        Math.max(ay, by, cy) < area.y0 || Math.min(ay, by, cy) > area.y1) continue;
    if (den < 0) {                                // turn it anticlockwise
      let t = bx; bx = cx; cx = t;
      t = by; by = cy; cy = t;
      t = qb; qb = qc; qc = t;
      den = -den;
    }
    const k = NOCC++;
    OAX[k] = ax; OAY[k] = ay; OBX[k] = bx; OBY[k] = by; OCX[k] = cx; OCY[k] = cy;
    const A = ((qb - qa) * (cy - ay) - (qc - qa) * (by - ay)) / den;
    const B = ((bx - ax) * (qc - qa) - (cx - ax) * (qb - qa)) / den;
    OPA[k] = A; OPB[k] = B; OPC[k] = qa - A * ax - B * ay;
    OX0[k] = Math.min(ax, bx, cx); OX1[k] = Math.max(ax, bx, cx);
    OY0[k] = Math.min(ay, by, cy); OY1[k] = Math.max(ay, by, cy);
    OQM[k] = Math.max(qa, qb, qc);
    OFACE[k] = f;
    FACE_OCC[f] = k;
    sumW += (OX1[k] - OX0[k]) + (OY1[k] - OY0[k]);
    if (OX0[k] < bx0) bx0 = OX0[k];
    if (OY0[k] < by0) by0 = OY0[k];
    if (OX1[k] > bx1) bx1 = OX1[k];
    if (OY1[k] > by1) by1 = OY1[k];
  }

  // Bins about twice the size of a triangle, fewer if there would be too many.
  if (!NOCC) { BIN_W = BIN_H = 1; BIN_X0 = BIN_Y0 = 0; BIN_SZ = 1e9; BIN_OFF = new Int32Array(2); return; }
  const w = Math.max(1e-6, bx1 - bx0), h = Math.max(1e-6, by1 - by0);
  let sz = Math.max(sumW / NOCC, 1e-3);
  sz = Math.max(sz, Math.sqrt(w * h / 250_000));
  BIN_SZ = sz;
  BIN_X0 = bx0; BIN_Y0 = by0;
  BIN_W = Math.max(1, Math.ceil(w / sz));
  BIN_H = Math.max(1, Math.ceil(h / sz));
  const nb = BIN_W * BIN_H;
  BIN_OFF = new Int32Array(nb + 1);
  const range = k => [
    clamp(Math.floor((OX0[k] - BIN_X0) / sz), 0, BIN_W - 1), clamp(Math.floor((OX1[k] - BIN_X0) / sz), 0, BIN_W - 1),
    clamp(Math.floor((OY0[k] - BIN_Y0) / sz), 0, BIN_H - 1), clamp(Math.floor((OY1[k] - BIN_Y0) / sz), 0, BIN_H - 1)];
  for (let k = 0; k < NOCC; k++) {
    const [i0, i1, j0, j1] = range(k);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) BIN_OFF[j * BIN_W + i + 1]++;
  }
  for (let b = 0; b < nb; b++) BIN_OFF[b + 1] += BIN_OFF[b];
  BIN_IDX = new Int32Array(BIN_OFF[nb]);
  const cur = BIN_OFF.slice(0, nb);
  for (let k = 0; k < NOCC; k++) {
    const [i0, i1, j0, j1] = range(k);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) BIN_IDX[cur[j * BIN_W + i]++] = k;
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Hidden lines
//
// A piece of line from (x0, y0, q0) to (x1, y1, q1) on paper, and one triangle. The
// point at t along it is inside the triangle when it is on the inner side of all three
// of its sides, and each side's test — a cross product — is linear in t; it is behind
// the triangle when the triangle's plane there is nearer than the line, and that too is
// linear in t. Four half-lines in t, one stretch of the piece where all four hold: the
// part the triangle hides, exactly. The triangles are let reach a hair past their sides,
// so two that share a side leave no gap along it between the stretches they hide, and a
// triangle hides only what it is nearer than by a hair, so a line never hides itself
// from the triangle it is drawn on, nor from one that only touches it.
//
// A piece of the sky is behind everything: only the three sides are asked.

let HT0 = 0, HT1 = 1;

function hideStretch(k, x0, y0, q0, dx, dy, dq, back) {
  let lo = 0, hi = 1;
  for (let e = 0; e < 3; e++) {
    let ax, ay, bx, by;
    if (e === 0) { ax = OAX[k]; ay = OAY[k]; bx = OBX[k]; by = OBY[k]; }
    else if (e === 1) { ax = OBX[k]; ay = OBY[k]; bx = OCX[k]; by = OCY[k]; }
    else { ax = OCX[k]; ay = OCY[k]; bx = OAX[k]; by = OAY[k]; }
    const ex = bx - ax, ey = by - ay;
    const f0 = ex * (y0 - ay) - ey * (x0 - ax) + SIDE_TOL * (Math.abs(ex) + Math.abs(ey));
    const fd = ex * dy - ey * dx;
    if (fd === 0) { if (f0 < 0) return false; }
    else {
      const t = -f0 / fd;
      if (fd > 0) { if (t > lo) lo = t; } else if (t < hi) hi = t;
      if (lo >= hi) return false;
    }
  }
  if (!back) {
    const g0 = OPA[k] * x0 + OPB[k] * y0 + OPC[k] - q0 - QEPS;
    const gd = OPA[k] * dx + OPB[k] * dy - dq;
    if (gd === 0) { if (g0 <= 0) return false; }
    else {
      const t = -g0 / gd;
      if (gd > 0) { if (t > lo) lo = t; } else if (t < hi) hi = t;
      if (lo >= hi) return false;
    }
  }
  if (hi - lo < 1e-12) return false;
  HT0 = lo; HT1 = hi;
  return true;
}

// What is left of a piece once every triangle that could stand in front of it has been
// asked: the visible stretches, as pairs of t in VIS, and how many.
let INTS = new Float64Array(512), VIS = new Float64Array(512);

function visibleStretches(x0, y0, q0, x1, y1, q1, skipA, skipB, back) {
  if (!NOCC) { VIS[0] = 0; VIS[1] = 1; return 1; }
  const dx = x1 - x0, dy = y1 - y0, dq = q1 - q0;
  const mnx = Math.min(x0, x1), mxx = Math.max(x0, x1);
  const mny = Math.min(y0, y1), mxy = Math.max(y0, y1);
  const qmin = Math.min(q0, q1);
  const i0 = Math.floor((mnx - BIN_X0) / BIN_SZ), i1 = Math.floor((mxx - BIN_X0) / BIN_SZ);
  const j0 = Math.floor((mny - BIN_Y0) / BIN_SZ), j1 = Math.floor((mxy - BIN_Y0) / BIN_SZ);
  let n = 0;
  if (i1 >= 0 && j1 >= 0 && i0 < BIN_W && j0 < BIN_H) {
    const stamp = ++OSTAMP_N;
    for (let j = Math.max(0, j0); j <= Math.min(BIN_H - 1, j1); j++) {
      for (let i = Math.max(0, i0); i <= Math.min(BIN_W - 1, i1); i++) {
        const b = j * BIN_W + i;
        for (let p = BIN_OFF[b]; p < BIN_OFF[b + 1]; p++) {
          const k = BIN_IDX[p];
          if (OSTAMP[k] === stamp) continue;
          OSTAMP[k] = stamp;
          if (OX1[k] < mnx || OX0[k] > mxx || OY1[k] < mny || OY0[k] > mxy) continue;
          if (!back && OQM[k] <= qmin + QEPS) continue;
          const f = OFACE[k];
          if (f === skipA || f === skipB) continue;
          if (!hideStretch(k, x0, y0, q0, dx, dy, dq, back)) continue;
          if (2 * n + 2 > INTS.length) {
            const bigger = new Float64Array(INTS.length * 2);
            bigger.set(INTS);
            INTS = bigger;
          }
          INTS[2 * n] = HT0; INTS[2 * n + 1] = HT1;
          n++;
        }
      }
    }
  }
  if (!n) { VIS[0] = 0; VIS[1] = 1; return 1; }
  // by where they start, then what is between them
  for (let a = 1; a < n; a++) {
    const s0 = INTS[2 * a], s1 = INTS[2 * a + 1];
    let b = a - 1;
    while (b >= 0 && INTS[2 * b] > s0) { INTS[2 * b + 2] = INTS[2 * b]; INTS[2 * b + 3] = INTS[2 * b + 1]; b--; }
    INTS[2 * b + 2] = s0; INTS[2 * b + 3] = s1;
  }
  if (VIS.length < 2 * n + 2) VIS = new Float64Array(2 * n + 2);
  let m = 0, t = 0;
  for (let a = 0; a < n; a++) {
    const s0 = INTS[2 * a], s1 = INTS[2 * a + 1];
    if (s0 > t + 1e-9) { VIS[2 * m] = t; VIS[2 * m + 1] = s0; m++; }
    if (s1 > t) t = s1;
    if (t >= 1) break;
  }
  if (t < 1 - 1e-9) { VIS[2 * m] = t; VIS[2 * m + 1] = 1; m++; }
  return m;
}

// Whether a single point is hidden — for the dots of stippling and the stars.
function pointHidden(x, y, q, skip, back) {
  if (!NOCC) return false;
  const i = Math.floor((x - BIN_X0) / BIN_SZ), j = Math.floor((y - BIN_Y0) / BIN_SZ);
  if (i < 0 || j < 0 || i >= BIN_W || j >= BIN_H) return false;
  const b = j * BIN_W + i;
  for (let p = BIN_OFF[b]; p < BIN_OFF[b + 1]; p++) {
    const k = BIN_IDX[p];
    if (OFACE[k] === skip) continue;
    if (x < OX0[k] || x > OX1[k] || y < OY0[k] || y > OY1[k]) continue;
    if ((OBX[k] - OAX[k]) * (y - OAY[k]) - (OBY[k] - OAY[k]) * (x - OAX[k]) < 0) continue;
    if ((OCX[k] - OBX[k]) * (y - OBY[k]) - (OCY[k] - OBY[k]) * (x - OBX[k]) < 0) continue;
    if ((OAX[k] - OCX[k]) * (y - OCY[k]) - (OAY[k] - OCY[k]) * (x - OCX[k]) < 0) continue;
    if (back || OPA[k] * x + OPB[k] * y + OPC[k] > q + QEPS) return true;
  }
  return false;
}

// The triangle of the ball under a point of the paper, the nearest if the skin folds
// over itself there, and the point of the unit sphere it stands over — where a wave
// drawn there has to go. The ring is looked through.
function pickBall(x, y) {
  if (!NOCC || !SURF) return null;
  const i = Math.floor((x - BIN_X0) / BIN_SZ), j = Math.floor((y - BIN_Y0) / BIN_SZ);
  if (i < 0 || j < 0 || i >= BIN_W || j >= BIN_H) return null;
  const b = j * BIN_W + i;
  let best = -1, bestQ = -Infinity, bu = 0, bv = 0;
  for (let p = BIN_OFF[b]; p < BIN_OFF[b + 1]; p++) {
    const k = BIN_IDX[p];
    if (OFACE[k] >= NFB) continue;
    const ax = OAX[k], ay = OAY[k];
    const e1x = OBX[k] - ax, e1y = OBY[k] - ay, e2x = OCX[k] - ax, e2y = OCY[k] - ay;
    const den = e1x * e2y - e2x * e1y;
    if (den <= 0) continue;
    const u = ((x - ax) * e2y - e2x * (y - ay)) / den;
    const v = (e1x * (y - ay) - (x - ax) * e1y) / den;
    if (u < -1e-9 || v < -1e-9 || u + v > 1 + 1e-9) continue;
    const q = OPA[k] * x + OPB[k] * y + OPC[k];
    if (q > bestQ) { bestQ = q; best = k; bu = u; bv = v; }
  }
  if (best < 0) return null;
  // the corners in the order the hider keeps them — it may have swapped the last two
  const f = OFACE[best], D = SURF.D;
  let [a, bb, c] = faceVerts(f);
  if (VX[bb] !== OBX[best] || VY[bb] !== OBY[best]) { const t = bb; bb = c; c = t; }
  const wa = 1 - bu - bv;
  let px = wa * D[3 * a] + bu * D[3 * bb] + bv * D[3 * c];
  let py = wa * D[3 * a + 1] + bu * D[3 * bb + 1] + bv * D[3 * c + 1];
  let pz = wa * D[3 * a + 2] + bu * D[3 * bb + 2] + bv * D[3 * c + 2];
  const l = Math.hypot(px, py, pz) || 1;
  return [px / l, py / l, pz / l];
}

////////////////////////////////////////////////////////////////////////////////////////
// The layers
//
// Each layer is laid as pieces of straight line on paper, every one of them cut by the
// triangles in front of it; what is left of them is strung back together further down.

let MIN_STROKE = 0.2;
let C_FRONT = 0, C_PIECES = 0, C_HIDDEN = 0;

function pieceList() { return { a: new Float64Array(4096), n: 0 }; }

function addPiece(L, x0, y0, x1, y1) {
  if (4 * L.n + 4 > L.a.length) {
    const b = new Float64Array(L.a.length * 2);
    b.set(L.a);
    L.a = b;
  }
  const o = 4 * L.n++;
  L.a[o] = x0; L.a[o + 1] = y0; L.a[o + 2] = x1; L.a[o + 3] = y1;
}

// One piece of line, the triangles it lies on left out of the asking, and what shows of
// it laid down. A stretch that something in front has cut shorter than the shortest
// stroke is a pen lift for next to no ink, and is left out.
function laySegment(L, x0, y0, q0, x1, y1, q1, skipA, skipB, back) {
  if (Math.max(x0, x1) < area.x0 || Math.min(x0, x1) > area.x1 ||
      Math.max(y0, y1) < area.y0 || Math.min(y0, y1) > area.y1) return;
  const m = visibleStretches(x0, y0, q0, x1, y1, q1, skipA, skipB, back);
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  if (m === 0 || (m === 1 && VIS[0] === 0 && VIS[1] === 1)) {
    if (m) { addPiece(L, x0, y0, x1, y1); C_PIECES++; } else C_HIDDEN++;
    return;
  }
  for (let i = 0; i < m; i++) {
    const ta = VIS[2 * i], tb = VIS[2 * i + 1], l = (tb - ta) * len;
    if (l < 1e-6 || l < MIN_STROKE) continue;
    addPiece(L,
      ta === 0 ? x0 : x0 + ta * dx, ta === 0 ? y0 : y0 + ta * dy,
      tb === 1 ? x1 : x0 + tb * dx, tb === 1 ? y1 : y0 + tb * dy);
    C_PIECES++;
  }
}

// Whether a triangle of the ball lies wholly outside the drawable box — nothing on it
// would survive the clipping, so nothing on it is laid.
function faceOff(a, b, c) {
  return Math.max(VX[a], VX[b], VX[c]) < area.x0 || Math.min(VX[a], VX[b], VX[c]) > area.x1 ||
         Math.max(VY[a], VY[b], VY[c]) < area.y0 || Math.min(VY[a], VY[b], VY[c]) > area.y1;
}

// --- the net and its outline ---
//
// An edge between two triangles turned away is inside the ball as the camera sees it,
// and hidden without asking. One between a triangle turned towards the camera and one
// turned away is on the outline; everything else is net.
function layNet(meshL, outL) {
  const M = MESH, E = M.E, EF = M.EF, drawn = M.drawn;
  const wantMesh = settings.meshLines !== 'none', wantOut = settings.outline;
  for (let e = 0; e < M.ne; e++) {
    const f0 = EF[2 * e], f1 = EF[2 * e + 1];
    const a0 = FRONT[f0], a1 = f1 >= 0 ? FRONT[f1] : 0;
    if (!a0 && !a1) continue;
    let L;
    if (a0 !== a1 && wantOut) L = outL;
    else if (wantMesh && drawn[e]) L = meshL;
    else continue;
    const a = E[2 * e], b = E[2 * e + 1];
    laySegment(L, VX[a], VY[a], VQ[a], VX[b], VY[b], VQ[b], f0, f1, false);
  }
}

// --- lines where a value over the ball crosses its levels ---
//
// The value is given at every point of the net and runs straight along every side of
// every triangle, so a level crosses a triangle in one straight piece between two of its
// sides. Where it crosses a side is worked out from the side's lower-numbered end, so the
// two triangles on either side of it find the very same point, and the pieces string
// back together without a gap.
function lowerBound(a, v) {
  let lo = 0, hi = a.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < v) lo = m + 1; else hi = m; }
  return lo;
}

const CROSS = new Float64Array(6);

function crossSide(i, j, vi, vj, lv, o) {
  if (i > j) { const t = i; i = j; j = t; const w = vi; vi = vj; vj = w; }
  const t = (lv - vi) / (vj - vi), P = SURF.P;
  project(P[3 * i] + t * (P[3 * j] - P[3 * i]), P[3 * i + 1] + t * (P[3 * j + 1] - P[3 * i + 1]),
          P[3 * i + 2] + t * (P[3 * j + 2] - P[3 * i + 2]));
  CROSS[o] = PXo; CROSS[o + 1] = PYo; CROSS[o + 2] = PQo;
}

function layLevels(L, val, levels) {
  if (!levels.length) return;
  const F = MESH.F;
  for (let f = 0; f < NFB; f++) {
    if (!FRONT[f]) continue;
    const a = F[3 * f], b = F[3 * f + 1], c = F[3 * f + 2];
    if (faceOff(a, b, c)) continue;
    const va = val[a], vb = val[b], vc = val[c];
    const lo = Math.min(va, vb, vc), hi = Math.max(va, vb, vc);
    for (let k = lowerBound(levels, lo); k < levels.length && levels[k] < hi; k++) {
      const lv = levels[k];
      let n = 0;
      if ((va < lv) !== (vb < lv)) { crossSide(a, b, va, vb, lv, 3 * n); n++; }
      if ((vb < lv) !== (vc < lv)) { crossSide(b, c, vb, vc, lv, 3 * n); n++; }
      if (n < 2 && (vc < lv) !== (va < lv)) { crossSide(c, a, vc, va, lv, 3 * n); n++; }
      if (n < 2) continue;
      laySegment(L, CROSS[0], CROSS[1], CROSS[2], CROSS[3], CROSS[4], CROSS[5], f, -1, false);
    }
  }
}

// The waves' own contour lines: levels of height spread evenly between the deepest
// trough and the highest crest, the ones above the bare sphere or below it, or all.
function layContours(L) {
  const n = clamp(Math.round(settings.contours), 0, 400);
  const lo = SURF.hMin, hi = SURF.hMax;
  if (!n || !(hi - lo > 1e-9)) return;
  const keep = settings.contourKeep, levels = [];
  for (let k = 0; k < n; k++) {
    const lv = lo + (k + 0.5) * (hi - lo) / n;
    if (keep === 'crests' && lv <= 0) continue;
    if (keep === 'troughs' && lv >= 0) continue;
    levels.push(lv);
  }
  layLevels(L, SURF.H, Float64Array.from(levels));
}

// Slices: a family of parallel planes through the ball, `sliceSpacing` apart on paper
// through its middle — or planes through its axis, for the meridians.
function laySlices(L) {
  const s = settings, P = SURF.P, nv = MESH.nv, kind = s.slices;
  const val = new Float64Array(nv);
  const along = (ax, ay, az) => {
    for (let v = 0; v < nv; v++) val[v] = P[3 * v] * ax + P[3 * v + 1] * ay + P[3 * v + 2] * az;
  };
  if (kind === 'meridians') {
    const m = clamp(Math.round(s.sliceCount), 1, 360), zero = Float64Array.of(0);
    for (let k = 0; k < m; k++) {
      const a = Math.PI * k / m;
      along(Math.cos(a), 0, Math.sin(a));
      layLevels(L, val, zero);
    }
    return;
  }
  let ax = 0, ay = 1, az = 0;
  if (kind === 'horizontal') { ax = CAM.ux; ay = CAM.uy; az = CAM.uz; }
  else if (kind === 'vertical') { ax = CAM.rx; ay = CAM.ry; az = CAM.rz; }
  else if (kind === 'depth') { ax = CAM.bx; ay = CAM.by; az = CAM.bz; }
  else if (kind === 'tilted') {
    const t = rad(s.sliceTilt), u = rad(s.sliceTurn);
    ax = Math.sin(t) * Math.cos(u); ay = Math.cos(t); az = Math.sin(t) * Math.sin(u);
  }
  along(ax, ay, az);
  const step = Math.max(0.05, s.sliceSpacing) / Math.max(1e-9, S);
  const reach = 1 + Math.max(0, SURF.hMax) + step, levels = [];
  for (let k = Math.ceil(-reach / step); k * step <= reach; k++) levels.push(k * step);
  if (levels.length > 4000) return;
  layLevels(L, val, Float64Array.from(levels));
}

// --- shading ---
//
// The light comes from a direction fixed to the camera — from the left, from above — so
// it stays where it was set while the ball is turned. Every point of the net has how
// much of it falls there, by its normal, and that runs straight across each triangle.
// Hatching lays a family of lines at `shadeAngle` on paper, at whole spacings across the
// sheet so they carry on from one triangle into the next, and keeps of each line the
// part where the light is under the threshold. More levels add families at other angles,
// each where the light is lower still: across, then diagonally both ways. Dots are
// scattered over the dark instead, thicker where it is darker. The line where the light
// gives out can be drawn too.
function lightDir() {
  const s = settings, C = CAM;
  const az = rad(s.lightAz), el = rad(s.lightEl);
  const lx = Math.cos(el) * Math.sin(az), ly = Math.sin(el), lz = Math.cos(el) * Math.cos(az);
  return {
    wx: lx * C.rx + ly * C.ux + lz * C.bx,
    wy: lx * C.ry + ly * C.uy + lz * C.by,
    wz: lx * C.rz + ly * C.uz + lz * C.bz,
  };
}

function vertexLight() {
  const VN = SURF.VN, nv = MESH.nv;
  const { wx, wy, wz } = lightDir();
  const lam = new Float64Array(nv);
  for (let v = 0; v < nv; v++) {
    const d = VN[3 * v] * wx + VN[3 * v + 1] * wy + VN[3 * v + 2] * wz;
    lam[v] = d > 0 ? d : 0;
  }
  return { lam, wx, wy, wz };
}

function layShade(L) {
  const s = settings, F = MESH.F, K = clamp(Math.round(s.shadeLevels), 1, 4);
  const { lam } = vertexLight();
  const top = clamp(s.shadeFrom / 100, 0.001, 1);
  const sp = Math.max(0.05, s.shadeSpacing);

  if (s.shading === 'hatch') {
    const turns = [0, 90, 45, -45];
    for (let lev = 0; lev < K; lev++) {
      const tau = top * (K - lev) / K;
      const th = rad(s.shadeAngle + turns[lev]);
      const nx = Math.sin(th), ny = Math.cos(th);           // across the lines, on paper
      for (let f = 0; f < NFB; f++) {
        if (!FRONT[f]) continue;
        const a = F[3 * f], b = F[3 * f + 1], c = F[3 * f + 2];
        if (Math.min(lam[a], lam[b], lam[c]) >= tau || faceOff(a, b, c)) continue;
        const k = FACE_OCC[f];
        if (k < 0) continue;
        const sa = VX[a] * nx + VY[a] * ny, sb = VX[b] * nx + VY[b] * ny, sc = VX[c] * nx + VY[c] * ny;
        const m0 = Math.ceil(Math.min(sa, sb, sc) / sp), m1 = Math.floor(Math.max(sa, sb, sc) / sp);
        for (let m = m0; m <= m1; m++) {
          const o = m * sp;
          let n = 0, x0 = 0, y0 = 0, l0 = 0, x1 = 0, y1 = 0, l1 = 0;
          const side = (i, j, si, sj) => {
            if ((si < o) === (sj < o)) return;
            if (i > j) { const t = i; i = j; j = t; const w = si; si = sj; sj = w; }
            const t = (o - si) / (sj - si);
            const x = VX[i] + t * (VX[j] - VX[i]), y = VY[i] + t * (VY[j] - VY[i]);
            const l = lam[i] + t * (lam[j] - lam[i]);
            if (n === 0) { x0 = x; y0 = y; l0 = l; } else { x1 = x; y1 = y; l1 = l; }
            n++;
          };
          side(a, b, sa, sb);
          side(b, c, sb, sc);
          if (n < 2) side(c, a, sc, sa);
          if (n < 2) continue;
          if (l0 >= tau && l1 >= tau) continue;
          if (l0 >= tau || l1 >= tau) {
            const t = (tau - l0) / (l1 - l0), xm = x0 + t * (x1 - x0), ym = y0 + t * (y1 - y0);
            if (l0 >= tau) { x0 = xm; y0 = ym; } else { x1 = xm; y1 = ym; }
          }
          const q0 = OPA[k] * x0 + OPB[k] * y0 + OPC[k], q1 = OPA[k] * x1 + OPB[k] * y1 + OPC[k];
          laySegment(L, x0, y0, q0, x1, y1, q1, f, -1, false);
        }
      }
    }
  } else if (s.shading === 'dots') {
    for (let f = 0; f < NFB; f++) {
      if (!FRONT[f]) continue;
      const a = F[3 * f], b = F[3 * f + 1], c = F[3 * f + 2];
      const lmin = Math.min(lam[a], lam[b], lam[c]);
      if (lmin >= top || faceOff(a, b, c)) continue;
      const k = FACE_OCC[f];
      if (k < 0) continue;
      const area2 = Math.abs((VX[b] - VX[a]) * (VY[c] - VY[a]) - (VX[c] - VX[a]) * (VY[b] - VY[a])) / 2;
      const dmax = 1 - lmin / top;
      const want = area2 * dmax / (sp * sp);
      let n = Math.floor(want);
      if (hash01(f, 0, 313) < want - n) n++;
      for (let i = 0; i < n; i++) {
        let r1 = hash01(f, 3 * i + 1, 317), r2 = hash01(f, 3 * i + 2, 317);
        if (r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2; }
        const x = VX[a] + r1 * (VX[b] - VX[a]) + r2 * (VX[c] - VX[a]);
        const y = VY[a] + r1 * (VY[b] - VY[a]) + r2 * (VY[c] - VY[a]);
        const l = lam[a] + r1 * (lam[b] - lam[a]) + r2 * (lam[c] - lam[a]);
        const d = 1 - l / top;
        if (d <= 0 || hash01(f, 3 * i + 3, 317) * dmax > d) continue;
        const q = OPA[k] * x + OPB[k] * y + OPC[k];
        if (pointHidden(x, y, q, f, false)) continue;
        addPiece(L, x - EPS / 2, y, x + EPS / 2, y);
        C_PIECES++;
      }
    }
  }

  if (s.shadowEdge) layLevels(L, lam, Float64Array.of(top));
}

// --- the ring ---

function layRing(L) {
  for (const line of RING.lines) {
    for (let i = 0; i + 1 < line.length; i++) {
      const a = NVB + line[i], b = NVB + line[i + 1];
      laySegment(L, VX[a], VY[a], VQ[a], VX[b], VY[b], VQ[b], -1, -1, false);
    }
  }
}

// --- the sky ---
//
// Behind everything: a piece of it is hidden wherever the ball, or the ring when it is
// opaque, covers it on paper. Long lines are laid in short pieces so each asks only the
// triangles near it.
function laySkyLine(L, xs, ys) {
  const step = Math.max(1, 3 * BIN_SZ);
  for (let i = 0; i + 1 < xs.length; i++) {
    const x0 = xs[i], y0 = ys[i], x1 = xs[i + 1], y1 = ys[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = 0; k < n; k++) {
      const ta = k / n, tb = (k + 1) / n;
      laySegment(L, x0 + ta * (x1 - x0), y0 + ta * (y1 - y0), 0,
                 k + 1 === n ? x1 : x0 + tb * (x1 - x0), k + 1 === n ? y1 : y0 + tb * (y1 - y0), 0,
                 -1, -1, true);
    }
  }
}

function laySky(L) {
  const s = settings, a = area, sp = Math.max(0.3, s.skySpacing), amt = clamp(s.skyAmount / 100, 0, 1);
  const [W, H] = paperDims();
  const kind = s.sky;
  if (kind === 'lines' || kind === 'waves') {
    const A = kind === 'waves' ? amt * sp * 0.9 : 0, lambda = sp * 9;
    let row = 0;
    for (let y = a.y0 + sp / 2; y <= a.y1; y += sp, row++) {
      const xs = [], ys = [];
      const n = A ? Math.ceil(a.w / 0.8) : 1;
      for (let i = 0; i <= n; i++) {
        const x = a.x0 + a.w * i / n;
        xs.push(x);
        ys.push(y + (A ? A * Math.sin(2 * Math.PI * x / lambda + row * 0.9) : 0));
      }
      laySkyLine(L, xs, ys);
    }
  } else if (kind === 'halo' || kind === 'rays') {
    const r0 = S * (CAM.persp ? CAM.D / Math.sqrt(CAM.D * CAM.D - 1) : 1) * (1 + Math.max(0, SURF.hMax)) + sp;
    const far = Math.max(Math.hypot(OX - a.x0, OY - a.y0), Math.hypot(OX - a.x1, OY - a.y0),
                         Math.hypot(OX - a.x0, OY - a.y1), Math.hypot(OX - a.x1, OY - a.y1));
    if (kind === 'halo') {
      for (let r = r0; r <= far; r += sp) {
        const n = Math.max(24, Math.ceil(2 * Math.PI * r / 1.2)), xs = [], ys = [];
        for (let i = 0; i <= n; i++) {
          xs.push(OX + r * Math.cos(2 * Math.PI * i / n));
          ys.push(OY + r * Math.sin(2 * Math.PI * i / n));
        }
        laySkyLine(L, xs, ys);
      }
    } else {
      const n = Math.max(3, Math.round(12 + amt * 180));
      for (let i = 0; i < n; i++) {
        const ang = 2 * Math.PI * (i + 0.5 * hash01(i, 0, 91)) / n;
        const c = Math.cos(ang), sn = Math.sin(ang);
        const start = r0 * (1 + 0.6 * hash01(i, 1, 91));
        laySkyLine(L, [OX + start * c, OX + far * c], [OY + start * sn, OY + far * sn]);
      }
    }
  } else if (kind === 'stars') {
    const n = Math.round(amt * a.w * a.h / 120);
    for (let i = 0; i < n; i++) {
      const x = a.x0 + a.w * hash01(i, 0, 57), y = a.y0 + a.h * hash01(i, 1, 57);
      if (pointHidden(x, y, 0, -1, true)) continue;
      const big = hash01(i, 2, 57), r = sp * (0.06 + 0.3 * big * big * big);
      if (r < 0.25) { addPiece(L, x - EPS / 2, y, x + EPS / 2, y); continue; }
      laySkyLine(L, [x - r, x + r], [y, y]);
      laySkyLine(L, [x, x], [y - r, y + r]);
      if (big > 0.8) {
        const d = r * 0.6;
        laySkyLine(L, [x - d, x + d], [y - d, y + d]);
        laySkyLine(L, [x - d, x + d], [y + d, y - d]);
      }
    }
  } else if (kind === 'clouds') {
    // contours of a slow noise over the sheet, a few levels near the top of its range
    const cell = Math.max(0.6, sp / 3), scale = sp * 14;
    const nx = Math.ceil(a.w / cell), ny = Math.ceil(a.h / cell);
    const G = new Float64Array((nx + 1) * (ny + 1));
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) {
        const x = a.x0 + i * cell, y = a.y0 + j * cell;
        G[j * (nx + 1) + i] = fbm3(NZ_SKY, x / scale, y / scale * 1.8, 0.37, 4, 0.5);
      }
    }
    const levels = [];
    for (let k = 0; k < 4; k++) levels.push(0.55 - amt * 0.7 + k * 0.14);
    const px = (i, j) => a.x0 + i * cell, py = (i, j) => a.y0 + j * cell;
    for (const lv of levels) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
          const v = c.map(([u, w]) => G[w * (nx + 1) + u]);
          const pts = [];
          for (let e = 0; e < 4; e++) {
            let p = e, q = (e + 1) % 4;
            if ((v[p] < lv) === (v[q] < lv)) continue;
            // along the grid edge from its lower-numbered corner, so neighbours agree
            const kp = c[p][1] * (nx + 1) + c[p][0], kq = c[q][1] * (nx + 1) + c[q][0];
            if (kp > kq) { const t = p; p = q; q = t; }
            const t = (lv - v[p]) / (v[q] - v[p]);
            pts.push(px(...c[p]) + t * (px(...c[q]) - px(...c[p])), py(...c[p]) + t * (py(...c[q]) - py(...c[p])));
          }
          for (let m = 0; m + 3 < pts.length; m += 4) {
            laySkyLine(L, [pts[m], pts[m + 2]], [pts[m + 1], pts[m + 3]]);
          }
        }
      }
    }
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Strung together
//
// The pieces of a layer that meet end to end are joined into one stroke, so the pen goes
// down once for the whole run. Where more than two meet — at a corner of the net — the
// stroke carries on along the straightest of them, and stops rather than turn sharper
// than the layer allows: the net is drawn as long lines running across the ball, not
// as a scribble round its triangles.

function chainPieces(L, turnCos, emit) {
  const n = L.n, A = L.a;
  if (!n) return;
  const key = (x, y) => Math.round(x * JOIN_Q) * 67108864 + Math.round(y * JOIN_Q);
  const head = new Map(), next = new Int32Array(2 * n);
  for (let e = 0; e < 2 * n; e++) {
    const k = key(A[2 * e], A[2 * e + 1]);
    const h = head.get(k);
    next[e] = h === undefined ? -1 : h;
    head.set(k, e);
  }
  const used = new Uint8Array(n);

  // From end e of a piece already taken, onwards; the points passed are pushed on xs, ys.
  const walk = (e, xs, ys) => {
    for (;;) {
      const cx = A[2 * e], cy = A[2 * e + 1], o = e ^ 1;
      let dx = cx - A[2 * o], dy = cy - A[2 * o + 1];
      const dl = Math.hypot(dx, dy);
      if (dl > 0) { dx /= dl; dy /= dl; }
      let best = -1, bestDot = turnCos;
      const h = head.get(key(cx, cy));
      for (let f = h === undefined ? -1 : h; f !== -1; f = next[f]) {
        if (used[f >> 1]) continue;
        const g = f ^ 1;
        let ex = A[2 * g] - A[2 * f], ey = A[2 * g + 1] - A[2 * f + 1];
        const el = Math.hypot(ex, ey);
        if (el > 0) { ex /= el; ey /= el; }
        const dot = dl > 0 && el > 0 ? dx * ex + dy * ey : 1;
        if (dot > bestDot || (best < 0 && dot >= bestDot)) { bestDot = dot; best = f; }
      }
      if (best < 0) return;
      used[best >> 1] = 1;
      e = best ^ 1;
      xs.push(A[2 * e]); ys.push(A[2 * e + 1]);
    }
  };

  for (let p = 0; p < n; p++) {
    if (used[p]) continue;
    used[p] = 1;
    const fx = [A[4 * p], A[4 * p + 2]], fy = [A[4 * p + 1], A[4 * p + 3]];
    walk(2 * p + 1, fx, fy);
    const bx = [], by = [];
    walk(2 * p, bx, by);
    const xs = bx.reverse().concat(fx), ys = by.reverse().concat(fy);
    emit(xs, ys);
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Sinks and clipping
//
// Everything drawn ends up as polylines in millimetres, each with the pen that draws it
// and the layer it belongs to, clipped to the drawable box on the way in.

function makeSink() {
  const pts = [], off = [0], ink = [], lay = [];
  return {
    pts, off, ink, lay,
    run(xs, ys, n, id, layer) {
      if (n < 2) return;
      for (let i = 0; i < n; i++) pts.push(xs[i], ys[i]);
      off.push(pts.length / 2);
      ink.push(id);
      lay.push(layer);
    },
    // A zero-length path is dropped by most plotter toolchains, so a dot goes down as a
    // hairline stub instead.
    dot(x, y, id, layer) {
      pts.push(x - EPS / 2, y, x + EPS / 2, y);
      off.push(pts.length / 2);
      ink.push(id);
      lay.push(layer);
    },
  };
}

// Liang–Barsky against the drawable box. Writes the clipped segment into CLIP_OUT and
// returns whether any of it survived; nothing is allocated, it runs once per piece.
const CLIP_OUT = new Float64Array(4);

function clipSeg(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  let t0 = 0, t1 = 1;

  for (let e = 0; e < 4; e++) {
    const p = e === 0 ? -dx : e === 1 ? dx : e === 2 ? -dy : dy;
    const q = e === 0 ? x0 - area.x0 : e === 1 ? area.x1 - x0
            : e === 2 ? y0 - area.y0 : area.y1 - y0;
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else       { if (r < t0) return false; if (r < t1) t1 = r; }
  }

  CLIP_OUT[0] = x0 + t0 * dx; CLIP_OUT[1] = y0 + t0 * dy;
  CLIP_OUT[2] = x0 + t1 * dx; CLIP_OUT[3] = y0 + t1 * dy;
  return true;
}

function insideArea(x, y) {
  return x >= area.x0 && x <= area.x1 && y >= area.y0 && y <= area.y1;
}

// The pieces of one polyline that survive the box, in the order they were walked.
function clipRuns(px, py, n, out) {
  if (n < 2) return;

  let allIn = true;
  for (let i = 0; i < n; i++) {
    if (!insideArea(px[i], py[i])) { allIn = false; break; }
  }
  if (allIn) { out.push([px, py]); return; }

  let rx = null, ry = null;
  const flush = () => {
    if (rx && rx.length >= 2) out.push([rx, ry]);
    rx = ry = null;
  };

  for (let i = 0; i + 1 < n; i++) {
    if (!clipSeg(px[i], py[i], px[i + 1], py[i + 1])) { flush(); continue; }
    const ax = CLIP_OUT[0], ay = CLIP_OUT[1], bx = CLIP_OUT[2], by = CLIP_OUT[3];
    if (rx && Math.abs(rx[rx.length - 1] - ax) < 1e-9 &&
              Math.abs(ry[ry.length - 1] - ay) < 1e-9) {
      rx.push(bx); ry.push(by);
    } else {
      flush();
      rx = [ax, bx]; ry = [ay, by];
    }
  }
  flush();
}

// Cut guides: a dot in every corner of the sheet and each side split evenly, so no two
// dots are further apart than asked — lay a ruler through two of them and cut.
function cropMarkShapes(sink) {
  const [W, H] = paperDims();
  const step = Math.max(1, settings.cropMarkGap);
  const dot = (x, y) => sink.dot(x, y, INK_MARK, -1);
  const nx = Math.max(1, Math.ceil(W / step));
  const ny = Math.max(1, Math.ceil(H / step));

  for (let i = 0; i <= nx; i++) {           // top and bottom edges, corners included
    const x = W * i / nx;
    dot(x, 0);
    dot(x, H);
  }
  for (let j = 1; j < ny; j++) {            // the sides, the corners already placed
    const y = H * j / ny;
    dot(0, y);
    dot(W, y);
  }
}

function penIdx(v) {
  const pens = Math.round(clamp(settings.pens, 1, MAX_PENS));
  return clamp(Math.round(v), 1, pens) - 1;
}

function buildShapes() {
  const s = settings;
  const pens = Math.round(clamp(s.pens, 1, MAX_PENS));
  perPen = [];
  for (let i = 0; i < pens; i++) perPen.push({ strokes: 0, ink: 0 });
  perLayer = LAYERS.map(() => ({ strokes: 0, ink: 0, pen: 0 }));
  MIN_STROKE = Math.max(0, s.minStroke);
  C_PIECES = C_HIDDEN = 0;
  C_FRONT = 0;
  for (let f = 0; f < NFB; f++) C_FRONT += FRONT[f];

  const lists = LAYERS.map(() => pieceList());
  if (s.meshLines !== 'none' || s.outline) layNet(lists[L_MESH], lists[L_OUTLINE]);
  if (s.contours > 0) layContours(lists[L_WAVES]);
  if (s.slices !== 'none') laySlices(lists[L_SLICES]);
  if (s.shading !== 'none' || s.shadowEdge) layShade(lists[L_SHADE]);
  if (RING) layRing(lists[L_RING]);
  if (s.sky !== 'none') laySky(lists[L_SKY]);

  const sink = makeSink();
  LAYERS.forEach((ly, li) => {
    const pen = penIdx(s[ly.pen]);
    perLayer[li].pen = pen;
    chainPieces(lists[li], ly.turn, (xs, ys) => {
      const runs = [];
      clipRuns(xs, ys, xs.length, runs);
      for (const [rx, ry] of runs) sink.run(rx, ry, rx.length, pen, li);
    });
  });
  if (s.cropMarks) cropMarkShapes(sink);

  for (let i = 0; i < sink.ink.length; i++) {
    const id = sink.ink[i], li = sink.lay[i];
    if (id >= 0 && perPen[id]) perPen[id].strokes++;
    if (li >= 0) perLayer[li].strokes++;
  }
  counts = { front: C_FRONT, pieces: C_PIECES, hidden: C_HIDDEN };

  return {
    pts: Float64Array.from(sink.pts),
    off: Int32Array.from(sink.off),
    ink: Int32Array.from(sink.ink),
    lay: Int32Array.from(sink.lay),
  };
}

////////////////////////////////////////////////////////////////////////////////////////
// Stroke order
//
// Greedy nearest-neighbour over stroke endpoints, either end allowed as the entry point,
// with a uniform bucket grid so the search stays local. One pen at a time, cut guides
// first: a multi-pen plot is run one pen at a time, and the pen should never have to come
// back to a colour it has already put down. vpype's linesort would redo this pass
// regardless, so it is here only to make the estimate honest and the preview readable.

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
    ex[i * 2]     = pts[a];     ey[i * 2]     = pts[a + 1];
    ex[i * 2 + 1] = pts[b];     ey[i * 2 + 1] = pts[b + 1];
  }
  for (let e = 0; e < N; e++) {
    if (ex[e] < minx) minx = ex[e];
    if (ex[e] > maxx) maxx = ex[e];
    if (ey[e] < miny) miny = ey[e];
    if (ey[e] > maxy) maxy = ey[e];
  }

  const w    = Math.max(maxx - minx, 1e-6);
  const h    = Math.max(maxy - miny, 1e-6);
  // about 1.5 endpoints to a bucket — but never more than 1024 buckets a side, which a
  // row of endpoints all on one line (a ring seen edge on) would otherwise ask for
  const cell = Math.max(1e-3, Math.sqrt(w * h / N) * 1.5, Math.max(w, h) / 1024);
  const gw   = Math.floor(w / cell) + 1;
  const gh   = Math.floor(h / cell) + 1;
  const nb   = gw * gh;

  const eb = new Int32Array(N);           // bucket of every endpoint
  for (let e = 0; e < N; e++) {
    const cx = Math.min(gw - 1, (ex[e] - minx) / cell | 0);
    const cy = Math.min(gh - 1, (ey[e] - miny) / cell | 0);
    eb[e] = cy * gw + cx;
  }

  const start = new Int32Array(nb + 1);   // CSR buckets, no per-bucket arrays
  for (let e = 0; e < N; e++) start[eb[e] + 1]++;
  for (let k = 0; k < nb; k++) start[k + 1] += start[k];
  const items  = new Int32Array(N);
  const cursor = start.slice(0, nb);
  for (let e = 0; e < N; e++) items[cursor[eb[e]]++] = e;
  const left = new Int32Array(nb);        // live endpoints left per bucket
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
      const dx = ex[e] - px, dy = ey[e] - py;
      const d  = dx * dx + dy * dy;
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
    if (best < 0) {                       // safety net; the ring walk should always find one
      for (let e = 0; e < N; e++) {
        if (used[e >> 1]) continue;
        const dx = ex[e] - px, dy = ey[e] - py;
        const d  = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = e; }
      }
    }

    const i = best >> 1;
    used[i] = 1;
    left[eb[i * 2]]--;
    left[eb[i * 2 + 1]]--;
    order[done] = ids[i];
    flip[done]  = best & 1;               // entered by the far end -> draw it reversed

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
    const id = sh.ink[i];
    const a = byInk.get(id);
    if (a) a.push(i); else byInk.set(id, [i]);
  }
  const ids = [...byInk.keys()].sort((a, b) => a - b);   // −1, the cut guides, first

  let px = 0, py = 0, at = 0;
  for (const id of ids) {
    const list = byInk.get(id);
    if (settings.optimiseOrder) {
      const g = greedy(sh, list, px, py);
      for (let t = 0; t < g.order.length; t++) { order[at] = g.order[t]; flip[at++] = g.flip[t]; }
      px = g.px; py = g.py;
    } else {
      for (const i of list) { order[at] = i; flip[at++] = 0; }
      const last = sh.off[list[list.length - 1] + 1] - 1;
      px = sh.pts[last * 2]; py = sh.pts[last * 2 + 1];
    }
  }
  return { order, flip, ...measurePlan(sh, order, flip) };
}

// How far the pen draws and how far it travels between strokes — per pen and per layer as
// well as altogether, since each colour is a separate pass with a pen of its own.
function measurePlan(sh, order, flip) {
  const { pts, off } = sh;
  let ink = 0, travel = 0, px = 0, py = 0;

  for (let t = 0; t < order.length; t++) {
    const i = order[t], rev = flip[t] === 1;
    const a = off[i], b = off[i + 1];
    const inA = rev ? b - 1 : a;
    const inB = rev ? a : b - 1;

    travel += Math.hypot(pts[inA * 2] - px, pts[inA * 2 + 1] - py);
    let run = 0;
    for (let k = a; k < b - 1; k++) {
      const ux = pts[(k + 1) * 2] - pts[k * 2], uy = pts[(k + 1) * 2 + 1] - pts[k * 2 + 1];
      run += Math.sqrt(ux * ux + uy * uy);
    }
    ink += run;
    const id = sh.ink[i], li = sh.lay[i];
    if (perPen && id >= 0 && perPen[id]) perPen[id].ink += run;
    if (perLayer && li >= 0 && perLayer[li]) perLayer[li].ink += run;
    px = pts[inB * 2];
    py = pts[inB * 2 + 1];
  }
  return { ink, travel };
}

////////////////////////////////////////////////////////////////////////////////////////
// Preview
//
// The strokes are drawn straight on the canvas from the same polylines the SVG exports,
// in the order and the colours the plotter will use, on a sheet the colour of the paper.
// Painted, the sheet is a picture instead — a sky, the ball coloured and lit, the ring
// seen through — with the same lines over it. The guides sit on a canvas of their own
// over the sheet, so the brush following the mouse never redraws the lines.

let OVERLAY = null;
let RING_CANVAS = null;
let SKY_CANVAS = null, skyKeyNow = '';

function inkColor(id) {
  if (id === INK_MARK) return '#888888';
  return settings['ink' + clamp(id, 0, MAX_PENS - 1)];
}

function luma(hex) {
  const [r, g, b] = hexRgb(hex).map(v => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function darkPaper() {
  return luma(settings.preview === 'painted' ? settings.skyTop : settings.paperColor) < 0.45;
}

function drawPreview() {
  const ctx = drawingContext;
  ctx.save();
  drawSheet(ctx, previewScale());
  ctx.restore();
  drawOverlay();
}

// The sheet onto any 2D context at s pixels to the millimetre — the preview's own, or
// that of a picture being saved.
function drawSheet(ctx, s) {
  const [W, H] = paperDims();
  if (settings.preview === 'painted') {
    ctx.drawImage(skyCanvas(Math.round(W * s), Math.round(H * s)), 0, 0);
    if (SURF && MESH && VX.length >= NVB && area && area.w > 0 && area.h > 0) drawPainted(ctx, s);
  } else {
    ctx.fillStyle = settings.paperColor;
    ctx.fillRect(0, 0, W * s, H * s);
  }
  if (shapes && plan) drawStrokes(ctx, s);
}

function drawStrokes(ctx, s) {
  const { pts, off } = shapes;
  const { order } = plan;

  ctx.save();
  ctx.scale(s, s);
  ctx.lineCap   = 'round';
  ctx.lineJoin  = 'round';
  ctx.lineWidth = settings.penWidth;

  // The plan already has one pen after another, so the colour changes a handful of times
  // however many strokes there are.
  let t = 0;
  while (t < order.length) {
    const id = shapes.ink[order[t]];
    ctx.strokeStyle = inkColor(id);
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

// --- the painted sheet ---

// A sky: the two colours top to bottom, and clouds of a slow noise over them, drawn small
// and stretched so they come out soft.
function skyCanvas(wpx, hpx) {
  const s = settings;
  const key = [wpx, hpx, s.skyTop, s.skyBottom, s.clouds, Math.round(s.seed)].join('|');
  if (SKY_CANVAS && key === skyKeyNow) return SKY_CANVAS;
  const c = document.createElement('canvas');
  c.width = wpx; c.height = hpx;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, hpx);
  grad.addColorStop(0, s.skyTop);
  grad.addColorStop(1, s.skyBottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, wpx, hpx);
  const amt = clamp(s.clouds / 100, 0, 1);
  if (amt > 0) {
    ensureNoise(Math.round(s.seed));
    const cw = Math.max(8, Math.round(wpx / 6)), ch = Math.max(8, Math.round(hpx / 6));
    const small = document.createElement('canvas');
    small.width = cw; small.height = ch;
    const sg = small.getContext('2d'), img = sg.createImageData(cw, ch);
    const [r0, g0, b0] = hexRgb(s.skyBottom);
    const t0 = 0.55 - amt * 0.85, sc = Math.max(cw, ch) / 3.2;
    for (let j = 0; j < ch; j++) {
      for (let i = 0; i < cw; i++) {
        const v = fbm3(NZ_SKY, i / sc, j / sc * 1.9, 0.91, 5, 0.55);
        const d = smoothstep(t0, t0 + 0.55, v), o = 4 * (j * cw + i);
        img.data[o] = r0 + (255 - r0) * 0.75;
        img.data[o + 1] = g0 + (255 - g0) * 0.75;
        img.data[o + 2] = b0 + (255 - b0) * 0.75;
        img.data[o + 3] = 255 * d * 0.9;
      }
    }
    sg.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(small, 0, 0, wpx, hpx);
  }
  SKY_CANVAS = c;
  skyKeyNow = key;
  return c;
}

// The ball's triangles turned to the camera, lit from where the shading's light is and
// coloured between the shadow colour and the ball's, with a shine where the light
// glances off; painted back to front. The ring goes on a canvas of its own, opaque, and
// that canvas onto the sheet at the ring's alpha — the part behind the ball first and the
// part in front last — so it is seen through evenly, with no seams where its triangles
// overlap.
function drawPainted(ctx, s) {
  const Sf = settings, F = MESH.F, FN = SURF.FN, C = CAM;
  const { wx, wy, wz } = lightDir();
  let hx = wx + C.bx, hy = wy + C.by, hz = wz + C.bz;
  const hl = Math.hypot(hx, hy, hz) || 1;
  hx /= hl; hy /= hl; hz /= hl;
  const lit = hexRgb(Sf.ballColor), dark = hexRgb(Sf.ballShadow), shine = Sf.shine / 100;

  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x0 * s, area.y0 * s, area.w * s, area.h * s);
  ctx.clip();
  ctx.scale(s, s);

  // the ring behind the ball, then the ball, then the ring in front
  const ringPart = front => {
    if (!RING || !NFR) return;
    const w = ctx.canvas.width, h = ctx.canvas.height;
    if (!RING_CANVAS || RING_CANVAS.width !== w || RING_CANVAS.height !== h) {
      RING_CANVAS = document.createElement('canvas');
      RING_CANVAS.width = w; RING_CANVAS.height = h;
    }
    const g = RING_CANVAS.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.setTransform(s, 0, 0, s, 0, 0);
    const [rr, rg, rb] = hexRgb(Sf.ringColor);
    const V = RING.V;
    for (let f = 0; f < NFR; f++) {
      const a = RING.F[3 * f], b = RING.F[3 * f + 1], c = RING.F[3 * f + 2];
      const qa = VQ[NVB + a] + VQ[NVB + b] + VQ[NVB + c];
      if ((qa >= 0) !== front) continue;
      const ux = V[3 * b] - V[3 * a], uy = V[3 * b + 1] - V[3 * a + 1], uz = V[3 * b + 2] - V[3 * a + 2];
      const vx = V[3 * c] - V[3 * a], vy = V[3 * c + 1] - V[3 * a + 1], vz = V[3 * c + 2] - V[3 * a + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const nl = Math.hypot(nx, ny, nz) || 1;
      const k = 0.55 + 0.45 * Math.abs((nx * wx + ny * wy + nz * wz) / nl);
      const col = `rgb(${rr * k | 0},${rg * k | 0},${rb * k | 0})`;
      g.fillStyle = col;
      g.strokeStyle = col;
      g.lineWidth = 0.8 / s;
      g.beginPath();
      g.moveTo(VX[NVB + a], VY[NVB + a]);
      g.lineTo(VX[NVB + b], VY[NVB + b]);
      g.lineTo(VX[NVB + c], VY[NVB + c]);
      g.closePath();
      g.fill();
      g.stroke();
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = clamp(Sf.ringAlpha / 100, 0, 1);
    ctx.drawImage(RING_CANVAS, 0, 0);
    ctx.restore();
  };

  ringPart(false);

  const list = [];
  for (let f = 0; f < NFB; f++) if (FRONT[f]) list.push(f);
  const depth = new Float64Array(NFB);
  for (const f of list) depth[f] = VQ[F[3 * f]] + VQ[F[3 * f + 1]] + VQ[F[3 * f + 2]];
  list.sort((a, b) => depth[a] - depth[b]);
  ctx.lineJoin = 'round';
  for (const f of list) {
    const nx = FN[3 * f], ny = FN[3 * f + 1], nz = FN[3 * f + 2];
    const diff = Math.max(0, nx * wx + ny * wy + nz * wz);
    const k = 0.16 + 0.84 * diff;
    const sp = shine * Math.pow(Math.max(0, nx * hx + ny * hy + nz * hz), 36);
    let r = dark[0] + (lit[0] - dark[0]) * k, g = dark[1] + (lit[1] - dark[1]) * k;
    let b = dark[2] + (lit[2] - dark[2]) * k;
    r += (255 - r) * sp; g += (255 - g) * sp; b += (255 - b) * sp;
    const col = `rgb(${r | 0},${g | 0},${b | 0})`;
    const a = F[3 * f], bb = F[3 * f + 1], c = F[3 * f + 2];
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.8 / s;
    ctx.beginPath();
    ctx.moveTo(VX[a], VY[a]);
    ctx.lineTo(VX[bb], VY[bb]);
    ctx.lineTo(VX[c], VY[c]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ringPart(true);
  ctx.restore();
}

// What the drawing covers on paper, in full — cut by the margin or not — and where the
// weight of its ink sits: every stroke's middle, weighted by its length, the cut guides
// left out. The one frames the drawing, the other is where the eye feels its middle to be.
function measureFrame() {
  const n = NVB + NVR;
  if (!n) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let v = 0; v < n; v++) {
    if (VX[v] < x0) x0 = VX[v];
    if (VX[v] > x1) x1 = VX[v];
    if (VY[v] < y0) y0 = VY[v];
    if (VY[v] > y1) y1 = VY[v];
  }
  if (shapes && settings.sky !== 'none') {
    for (let i = 0; i + 1 < shapes.off.length; i++) {
      if (shapes.lay[i] !== L_SKY) continue;
      for (let k = shapes.off[i]; k < shapes.off[i + 1]; k++) {
        const x = shapes.pts[2 * k], y = shapes.pts[2 * k + 1];
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  return { x0, y0, x1, y1 };
}

function measureInk() {
  if (!shapes) return null;
  const { pts, off, ink } = shapes;
  let sx = 0, sy = 0, sw = 0;
  for (let i = 0; i + 1 < off.length; i++) {
    if (ink[i] === INK_MARK) continue;
    for (let k = off[i]; k < off[i + 1] - 1; k++) {
      const ax = pts[k * 2], ay = pts[k * 2 + 1], bx = pts[k * 2 + 2], by = pts[k * 2 + 3];
      const l = Math.hypot(bx - ax, by - ay);
      sx += l * (ax + bx) / 2; sy += l * (ay + by) / 2; sw += l;
    }
  }
  return sw > 0 ? { x: sx / sw, y: sy / sw } : null;
}

// --- over the sheet ---
//
// The margin; the lines to compose by and the frame round the drawing, if asked; the
// paths of the waves drawn by hand, the one being drawn, and the brush — the ring on the
// ball a wave drawn here would reach to.

let HOVER = null;            // { x, y } on paper, and u — the point of the ball under it

function drawOverlay() {
  if (!OVERLAY) return;
  const ctx = OVERLAY.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, OVERLAY.width, OVERLAY.height);
  if (!area || area.w <= 0 || area.h <= 0) return;
  const s = previewScale(), dark = darkPaper();
  ctx.save();
  ctx.scale(s, s);
  if (settings.showGuides) {
    ctx.lineWidth = 0.35;
    ctx.setLineDash([2.5, 2.5]);
    ctx.strokeStyle = dark ? 'rgba(130, 175, 255, 0.55)' : 'rgba(26, 109, 209, 0.5)';
    ctx.strokeRect(area.x0, area.y0, area.w, area.h);
    ctx.setLineDash([]);
    drawComposition(ctx, dark);
    if (TOOL !== 'turn' && SURF) drawWavePaths(ctx, dark);
  }
  drawBrush(ctx, dark);
  ctx.restore();
}

// A path over the ball, taken onto the skin and the paper, the part round the back left
// out.
function pathOnPaper(pts, closed) {
  const out = [];
  let run = null;
  const amp = settings.amplitude / 100;
  const m = pts.length / 3;
  for (let i = 0; i < m + (closed ? 1 : 0); i++) {
    const j = i % m;
    const x = pts[3 * j], y = pts[3 * j + 1], z = pts[3 * j + 2];
    const r = 1 + Math.max(MIN_R - 1, amp * heightAt(x, y, z));
    const facing = CAM.persp
      ? (x * CAM.bx + y * CAM.by + z * CAM.bz) * CAM.D > r
      : x * CAM.bx + y * CAM.by + z * CAM.bz > 0;
    if (!facing) { run = null; continue; }
    project(r * x, r * y, r * z);
    if (!run) { run = []; out.push(run); }
    run.push(PXo, PYo);
  }
  return out;
}

function strokePaths(ctx, runs) {
  ctx.beginPath();
  for (const r of runs) {
    ctx.moveTo(r[0], r[1]);
    for (let i = 2; i < r.length; i += 2) ctx.lineTo(r[i], r[i + 1]);
    if (r.length === 2) ctx.arc(r[0], r[1], 0.6, 0, 2 * Math.PI);
  }
  ctx.stroke();
}

function drawWavePaths(ctx, dark) {
  ctx.lineWidth = 0.45;
  ctx.setLineDash([1.6, 1.2]);
  for (const st of STROKE_LIST) {
    if (st.drawn < 0) continue;
    const doomed = TOOL === 'erase' && HOVER && HOVER.erase === st.drawn;
    ctx.strokeStyle = doomed ? (dark ? 'rgba(255, 120, 90, 0.95)' : 'rgba(205, 40, 20, 0.9)')
      : dark ? 'rgba(255, 205, 70, 0.75)' : 'rgba(190, 120, 0, 0.75)';
    ctx.lineWidth = doomed ? 0.9 : 0.45;
    strokePaths(ctx, pathOnPaper(st.pts, false));
  }
  ctx.setLineDash([]);
}

function drawBrush(ctx, dark) {
  if (!CAM || !SURF) return;
  const col = dark ? 'rgba(120, 220, 255, 0.9)' : 'rgba(0, 120, 190, 0.85)';
  if (LIVE && LIVE.qx.length) {
    const m = LIVE.qx.length, pts = new Float64Array(3 * m);
    for (let i = 0; i < m; i++) octDecode(LIVE.qx[i], LIVE.qy[i], pts, 3 * i);
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.7;
    strokePaths(ctx, pathOnPaper(pts, false));
  }
  if (TOOL !== 'wave' || !HOVER || !HOVER.u) return;
  // the ring a width out from the point under the mouse
  const [x, y, z] = HOVER.u, w = rad(Math.max(0.2, settings.brushWidth));
  let ax = -z, ay = 0, az = x;
  if (Math.abs(y) > 0.9) { ax = 0; ay = z; az = -y; }
  const al = Math.hypot(ax, ay, az);
  ax /= al; ay /= al; az /= al;
  const bx = y * az - z * ay, by = z * ax - x * az, bz = x * ay - y * ax;
  const n = 72, pts = new Float64Array(3 * n), cw = Math.cos(w), sw = Math.sin(w);
  for (let k = 0; k < n; k++) {
    const a = 2 * Math.PI * k / n, c = Math.cos(a), sn = Math.sin(a);
    pts[3 * k] = x * cw + (c * ax + sn * bx) * sw;
    pts[3 * k + 1] = y * cw + (c * ay + sn * by) * sw;
    pts[3 * k + 2] = z * cw + (c * az + sn * bz) * sw;
  }
  ctx.strokeStyle = col;
  ctx.lineWidth = 0.45;
  strokePaths(ctx, pathOnPaper(pts, true));
  strokePaths(ctx, pathOnPaper(Float64Array.of(x, y, z), false));
}

// Lines across the whole sheet: a cross through its middle, the golden section — each
// way, the smaller part 0.382 of the sheet and the larger 0.618 — or thirds. And the
// frame round the drawing: its extent, dashed; its middle, a small cross; where the
// weight of the ink sits, a ring; and on each side how far the frame is from that edge
// of the sheet — the same number left and right, and top and bottom, is a drawing
// centred by its frame.
function drawComposition(ctx, dark) {
  const [W, H] = paperDims();
  const mode = settings.composeLines;
  const across = (f, g) => {
    ctx.beginPath();
    for (const t of f) { ctx.moveTo(W * t, 0); ctx.lineTo(W * t, H); }
    for (const t of g) { ctx.moveTo(0, H * t); ctx.lineTo(W, H * t); }
    ctx.stroke();
  };
  ctx.lineWidth = 0.3;
  if (mode === 'thirds') {
    ctx.strokeStyle = dark ? 'rgba(175, 185, 225, 0.7)' : 'rgba(80, 90, 135, 0.6)';
    ctx.setLineDash([0.8, 1.2]);
    across([1 / 3, 2 / 3], [1 / 3, 2 / 3]);
  }
  if (mode === 'golden section' || mode === 'cross + golden section') {
    ctx.strokeStyle = dark ? 'rgba(255, 205, 70, 0.8)' : 'rgba(190, 135, 0, 0.8)';
    ctx.setLineDash([2.5, 1.5]);
    across([GOLDEN, 1 - GOLDEN], [GOLDEN, 1 - GOLDEN]);
  }
  if (mode === 'cross' || mode === 'cross + golden section') {
    ctx.strokeStyle = dark ? 'rgba(255, 120, 190, 0.8)' : 'rgba(205, 40, 125, 0.7)';
    ctx.setLineDash([]);
    across([0.5], [0.5]);
  }
  ctx.setLineDash([]);

  const fb = frameBox;
  if (!settings.showFrame || !fb) return;
  const col = dark ? 'rgba(95, 220, 160, 0.9)' : 'rgba(20, 135, 85, 0.85)';
  ctx.strokeStyle = col;
  ctx.lineWidth = 0.3;
  ctx.setLineDash([1.5, 1]);
  ctx.strokeRect(fb.x0, fb.y0, fb.x1 - fb.x0, fb.y1 - fb.y0);
  ctx.setLineDash([]);
  const mx = (fb.x0 + fb.x1) / 2, my = (fb.y0 + fb.y1) / 2;
  ctx.beginPath();
  ctx.moveTo(mx - 1.6, my - 1.6); ctx.lineTo(mx + 1.6, my + 1.6);
  ctx.moveTo(mx - 1.6, my + 1.6); ctx.lineTo(mx + 1.6, my - 1.6);
  if (inkMid) {
    ctx.moveTo(inkMid.x + 1.8, inkMid.y);
    ctx.arc(inkMid.x, inkMid.y, 1.8, 0, Math.PI * 2);
  }
  ctx.stroke();

  // how far the frame is from each edge of the sheet, written just outside it where
  // there is room and just inside where there is not
  ctx.font = '3px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.lineWidth = 0.8;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = settings.preview === 'painted' ? settings.skyBottom : settings.paperColor;
  ctx.fillStyle = col;
  const label = (text, x, y, ax, ay) => {
    ctx.textAlign = ax;
    ctx.textBaseline = ay;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  };
  const mm = v => v.toFixed(1);
  const cy = clamp(my, 4, H - 4), cx = clamp(mx, 8, W - 8);
  if (fb.x0 > 12) label(mm(fb.x0), fb.x0 - 1, cy, 'right', 'middle');
  else label(mm(fb.x0), Math.max(fb.x0, 0) + 1, cy, 'left', 'middle');
  if (W - fb.x1 > 12) label(mm(W - fb.x1), fb.x1 + 1, cy, 'left', 'middle');
  else label(mm(W - fb.x1), Math.min(fb.x1, W) - 1, cy, 'right', 'middle');
  if (fb.y0 > 5) label(mm(fb.y0), cx, fb.y0 - 1, 'center', 'bottom');
  else label(mm(fb.y0), cx, Math.max(fb.y0, 0) + 1, 'center', 'top');
  if (H - fb.y1 > 5) label(mm(H - fb.y1), cx, fb.y1 + 1, 'center', 'top');
  else label(mm(H - fb.y1), cx, Math.min(fb.y1, H) - 1, 'center', 'bottom');
}

// While the camera moves and a whole update cannot keep up, only the ball follows: its
// triangles turned to the camera, filled with the paper and outlined, painted back to
// front — or, painted, the picture without its lines; and a net too fine to paint that
// fast, as its outline alone. Painting by the middles of the triangles can go wrong where
// the skin folds, which is why it is only the sketch of the view and not the plot.
function showModel() {
  const mesh = ensureMesh();
  const surf = mesh && ensureSurface(mesh);
  area = drawArea();
  if (!surf || area.w <= 0 || area.h <= 0) return;
  makeView();
  fitView();
  buildRing();
  projectAll();
  NOCC = 0;
  if (FRONT.length < NFB) FRONT = new Uint8Array(NFB);
  const F = MESH.F;
  for (let f = 0; f < NFB; f++) {
    const a = F[3 * f], b = F[3 * f + 1], c = F[3 * f + 2];
    FRONT[f] = (VX[b] - VX[a]) * (VY[c] - VY[a]) - (VX[c] - VX[a]) * (VY[b] - VY[a]) < 0 ? 1 : 0;
  }
  shapes = plan = inkMid = null;
  frameBox = measureFrame();

  const ctx = drawingContext, s = previewScale();
  const big = NFB > MODEL_FACES;
  ctx.save();
  if (settings.preview === 'painted' && !big) {
    drawSheet(ctx, s);
  } else {
    const [W, H] = paperDims();
    ctx.fillStyle = settings.paperColor;
    ctx.fillRect(0, 0, W * s, H * s);
    ctx.beginPath();
    ctx.rect(area.x0 * s, area.y0 * s, area.w * s, area.h * s);
    ctx.clip();
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    if (big) {
      // too many triangles to paint one by one while the mouse moves: the outline alone,
      // and every edge on it or across the fold of the skin, in one path
      const E = MESH.E, EF = MESH.EF;
      ctx.strokeStyle = settings.ink0;
      ctx.lineWidth = Math.max(0.2, settings.penWidth);
      ctx.beginPath();
      for (let e = 0; e < MESH.ne; e++) {
        if (FRONT[EF[2 * e]] === FRONT[EF[2 * e + 1]]) continue;
        const a = E[2 * e], b = E[2 * e + 1];
        ctx.moveTo(VX[a], VY[a]);
        ctx.lineTo(VX[b], VY[b]);
      }
      ctx.stroke();
    }
    const list = [];
    if (!big) for (let f = 0; f < NFB; f++) if (FRONT[f]) list.push(f);
    const depth = new Float64Array(NFB);
    for (const f of list) depth[f] = VQ[F[3 * f]] + VQ[F[3 * f + 1]] + VQ[F[3 * f + 2]];
    list.sort((a, b) => depth[a] - depth[b]);
    ctx.fillStyle = settings.paperColor;
    ctx.strokeStyle = settings.ink0;
    ctx.lineWidth = Math.max(0.12, settings.penWidth * 0.6);
    for (const f of list) {
      const a = F[3 * f], b = F[3 * f + 1], c = F[3 * f + 2];
      ctx.beginPath();
      ctx.moveTo(VX[a], VY[a]);
      ctx.lineTo(VX[b], VY[b]);
      ctx.lineTo(VX[c], VY[c]);
      ctx.closePath();
      ctx.fill();
      if (settings.meshLines !== 'none') ctx.stroke();
    }
    if (RING) {
      ctx.strokeStyle = inkColor(penIdx(settings.ringPen));
      ctx.beginPath();
      for (const line of RING.lines) {
        ctx.moveTo(VX[NVB + line[0]], VY[NVB + line[0]]);
        for (let i = 1; i < line.length; i++) ctx.lineTo(VX[NVB + line[i]], VY[NVB + line[i]]);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
  drawOverlay();
}

////////////////////////////////////////////////////////////////////////////////////////
// Mouse and keys
//
// With the wave tool, dragging over the ball draws a wave along the way the mouse goes,
// and a click drops one — a ring of it round the point. The wave takes the brush as it
// is set when it is drawn, and keeps it: changing the brush afterwards changes only the
// waves still to come. Off the ball, or with the turn tool, dragging turns the camera:
// across is the azimuth, up and down the elevation. Shift-drag, or a drag with the right
// button, pans, and the wheel zooms about the point under the cursor. The eraser takes
// away the wave drawn nearest to where it clicks.

let TOOL = 'wave';

function paperPoint(e) {
  const c = canvasEl();
  const r = c.getBoundingClientRect();
  const [W, H] = paperDims();
  return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
}

function setTool(t) {
  TOOL = t;
  for (const k in toolButtons) toolButtons[k].elt.classList.toggle('on', k === t);
  const c = canvasEl();
  if (c) c.dataset.tool = t;
  drawOverlay();
}

// The wave being drawn keeps its points as the link will: a point is let in only once
// the mouse has moved a fifth of the brush's width over the ball, and it is rounded to
// the octahedron's square straight away, so the wave drawn live and the wave replayed
// from the link are one and the same.
function waveStep() {
  return clamp(rad(settings.brushWidth) / 5, rad(0.4), rad(3));
}

function startWave(u) {
  const s = settings;
  const [qx, qy] = octEncode(u[0], u[1], u[2]);
  LIVE = {
    kind: Math.max(0, PROFILES.indexOf(s.brushProfile)),
    amp: Math.round(clamp(s.brushAmp, 0, 100) * 10),
    width: Math.max(1, Math.round(clamp(s.brushWidth, 0.1, 180) * 10)),
    ripples: clamp(Math.round(s.brushRipples), 1, 40),
    qx: [qx], qy: [qy],
    last: u,
  };
  LIVE_VER++;
}

function extendWave(u) {
  const l = LIVE.last;
  const ang = Math.acos(clamp(u[0] * l[0] + u[1] * l[1] + u[2] * l[2], -1, 1));
  if (ang < waveStep()) return false;
  const [qx, qy] = octEncode(u[0], u[1], u[2]);
  const n = LIVE.qx.length;
  if (qx === LIVE.qx[n - 1] && qy === LIVE.qy[n - 1]) return false;
  LIVE.qx.push(qx);
  LIVE.qy.push(qy);
  const back = new Float64Array(3);
  octDecode(qx, qy, back, 0);
  LIVE.last = [back[0], back[1], back[2]];
  LIVE_VER++;
  return true;
}

function commitWave() {
  const w = LIVE;
  LIVE = null;
  LIVE_VER++;
  if (!w || !w.qx.length) return;
  const list = parseWaves(settings.waves);
  list.push(w);
  settings.waves = encodeWaves(list);
  refreshWaveNote();
}

function undoWave() {
  const list = parseWaves(settings.waves);
  if (!list.length) return;
  list.pop();
  settings.waves = encodeWaves(list);
  refreshWaveNote();
  update();
}

function clearWaves() {
  if (!settings.waves) return;
  settings.waves = '';
  refreshWaveNote();
  update();
}

// The wave drawn by hand nearest to a point of the ball, by its index among them, if the
// point is within its reach — its copies round the axis count as it.
function waveNear(u) {
  let best = -1, bestD = Infinity;
  for (const st of STROKE_LIST) {
    if (st.drawn < 0) continue;
    const p = st.pts, m = p.length / 3;
    for (let i = 0; i < m; i++) {
      const d = Math.acos(clamp(u[0] * p[3 * i] + u[1] * p[3 * i + 1] + u[2] * p[3 * i + 2], -1, 1));
      if (d < bestD && d < st.w + rad(3)) { bestD = d; best = st.drawn; }
    }
  }
  return best;
}

function eraseWave(i) {
  const list = parseWaves(settings.waves);
  if (i < 0 || i >= list.length) return;
  list.splice(i, 1);
  settings.waves = encodeWaves(list);
  refreshWaveNote();
  update();
}

// While a wave is drawn the whole sheet follows it if it can; if it cannot, the wave's
// path is drawn over the sheet as it stands and the rest waits for the mouse to come up.
function followWave() {
  if (!liveUpdate()) drawOverlay();
}

function attachPointer() {
  const c = canvasEl();
  if (!c) return;
  c.dataset.tool = TOOL;
  c.addEventListener('contextmenu', e => e.preventDefault());

  c.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.button !== 2) return;
    const p = paperPoint(e);
    const turnOnly = e.button === 2 || e.shiftKey || e.altKey || TOOL === 'turn';
    const u = turnOnly ? null : pickBall(p[0], p[1]);
    c.setPointerCapture(e.pointerId);
    e.preventDefault();
    if (u && TOOL === 'wave') {
      startWave(u);
      c.classList.add('drawing');
      followWave();
      return;
    }
    if (u && TOOL === 'erase') {
      eraseWave(waveNear(u));
      return;
    }
    drag = {
      pan: e.shiftKey || e.button === 2, x: e.clientX, y: e.clientY, p,
      az: settings.azimuth, el: settings.elevation,
      panX: settings.panX, panY: settings.panY, moved: false,
    };
    c.classList.add('dragging');
  });

  c.addEventListener('pointermove', e => {
    const p = paperPoint(e);
    if (LIVE) {
      const u = pickBall(p[0], p[1]);
      HOVER = { x: p[0], y: p[1], u };
      if (u && extendWave(u)) followWave();
      else drawOverlay();
      e.preventDefault();
      return;
    }
    if (!drag) {
      const u = TOOL === 'turn' ? null : pickBall(p[0], p[1]);
      HOVER = { x: p[0], y: p[1], u, erase: TOOL === 'erase' && u ? waveNear(u) : -1 };
      drawOverlay();
      return;
    }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 3) return;
    drag.moved = true;
    if (drag.pan) {
      const z = settings.zoom / 100;
      settings.panX = +(drag.panX - (p[0] - drag.p[0]) / z).toFixed(2);
      settings.panY = +(drag.panY - (p[1] - drag.p[1]) / z).toFixed(2);
    } else {
      turnCamera(dx, dy);
    }
    if (!liveUpdate()) showModel();
    e.preventDefault();
  });

  const end = e => {
    c.classList.remove('dragging');
    c.classList.remove('drawing');
    if (LIVE) {
      commitWave();
      update();
      if (e) e.preventDefault();
      return;
    }
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    if (moved) update();
    if (e) e.preventDefault();
  };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', end);
  c.addEventListener('pointerleave', () => { if (!drag && !LIVE) { HOVER = null; drawOverlay(); } });

  c.addEventListener('wheel', e => {
    e.preventDefault();
    if (drag || LIVE) return;
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    zoomAbout(Math.exp(-delta * WHEEL_ZOOM), paperPoint(e));
  }, { passive: false });
}

function turnCamera(dx, dy) {
  const s = settings;
  s.azimuth = +wrapDeg(drag.az - dx * DRAG_DEG_PX).toFixed(1);
  s.elevation = +clamp(drag.el + dy * DRAG_DEG_PX, -90, 90).toFixed(1);
  if (setters.azimuth) setters.azimuth(s.azimuth);
  if (setters.elevation) setters.elevation(s.elevation);
}

// Zoom by a factor, keeping the paper point m where it is — the middle of the drawable
// box when none is given.
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
  if (setters.zoom) setters.zoom(settings.zoom);
  if (!liveUpdate()) { showModel(); settle(); }
}

// Pan the drawing so the middle of the ball, the middle of its frame, or the weight of
// its ink lands on the middle of the sheet. A ring tilted one way pulls the frame's middle
// off the ball's, and the fit centres the frame. The frame and the ink are measured on
// what the margin leaves, which moves as the drawing does, so they are settled in a few
// rounds.
function centreOn(what) {
  const [W, H] = paperDims(), cx = W / 2, cy = H / 2;
  for (let round = 0; round < 8; round++) {
    const p = what === 'ink' ? inkMid
      : what === 'ball' ? { x: OX, y: OY }
      : frameBox && { x: (frameBox.x0 + frameBox.x1) / 2, y: (frameBox.y0 + frameBox.y1) / 2 };
    if (!p) break;
    const dx = p.x - cx, dy = p.y - cy;
    if (Math.hypot(dx, dy) < 0.02) break;
    const z = settings.zoom / 100;
    settings.panX = +(settings.panX + dx / z).toFixed(2);
    settings.panY = +(settings.panY + dy / z).toFixed(2);
    update();
  }
  if (setters.zoom) setters.zoom(settings.zoom);
}

function resetZoom() {
  settings.zoom = DEFAULTS.zoom;
  settings.panX = DEFAULTS.panX;
  settings.panY = DEFAULTS.panY;
  if (setters.zoom) setters.zoom(settings.zoom);
  update();
}

function attachKeys() {
  window.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable ||
        (t.tagName === 'INPUT' && !['checkbox', 'button', 'color', 'range'].includes(t.type)))) return;
    if (e.metaKey || e.ctrlKey || e.altKey || drag || LIVE) return;
    const s = settings, step = e.shiftKey ? 10 : 1;

    const turn = (da, de) => {
      s.azimuth = wrapDeg(s.azimuth + da);
      s.elevation = clamp(+(s.elevation + de).toFixed(2), -90, 90);
      refreshControls();
      update();
    };
    const reseed = v => {
      s.seed = v;
      if (setters.seed) setters.seed(s.seed);
      update();
    };
    const toggle = (key, redraw) => {
      s[key] = !s[key];
      if (setters[key]) setters[key](s[key]);
      if (redraw) { drawPreview(); updateStats(); syncUrl(); } else update();
    };

    switch (e.key) {
      case 'ArrowLeft':  turn(step, 0); break;
      case 'ArrowRight': turn(-step, 0); break;
      case 'ArrowUp':    turn(0, -step); break;
      case 'ArrowDown':  turn(0, step); break;
      case 'r': case 'R': reseed(Math.floor(Math.random() * 100000)); break;
      case '[': reseed(Math.max(0, Math.round(s.seed) - 1)); break;
      case ']': reseed(Math.round(s.seed) + 1); break;
      case '+': case '=': zoomAbout(1.25); break;
      case '-': case '_': zoomAbout(1 / 1.25); break;
      case '0': resetZoom(); break;
      case 'w': case 'W': setTool('wave'); break;
      case 't': case 'T': setTool('turn'); break;
      case 'e': case 'E': setTool('erase'); break;
      case 'z': case 'Z': undoWave(); break;
      case 'p': case 'P':
        s.projection = PROJECTIONS[(PROJECTIONS.indexOf(s.projection) + 1) % PROJECTIONS.length];
        refreshControls();
        update();
        break;
      case 'v': case 'V':
        s.preview = PREVIEWS[(PREVIEWS.indexOf(s.preview) + 1) % PREVIEWS.length];
        if (setters.preview) setters.preview(s.preview);
        syncVisibility();
        drawPreview();
        syncUrl();
        break;
      case 'k': case 'K': rollColours(); break;
      case 'g': case 'G': toggle('showGuides', true); break;
      case 'c': case 'C':
        s.composeLines = COMPOSE_LINES[(COMPOSE_LINES.indexOf(s.composeLines) + 1) % COMPOSE_LINES.length];
        if (!s.showGuides) { s.showGuides = true; if (setters.showGuides) setters.showGuides(true); }
        if (setters.composeLines) setters.composeLines(s.composeLines);
        drawPreview();
        syncUrl();
        break;
      case 'f': case 'F':
        s.showFrame = !s.showFrame;
        if (s.showFrame && !s.showGuides) { s.showGuides = true; if (setters.showGuides) setters.showGuides(true); }
        if (setters.showFrame) setters.showFrame(s.showFrame);
        drawPreview();
        updateStats();
        syncUrl();
        break;
      default: return;
    }
    e.preventDefault();
  });
}

////////////////////////////////////////////////////////////////////////////////////////
// Colours
//
// The inks are the pens the plotter will hold; the paper, the ball, the sky and the ring
// are for the preview and for the painted picture. A palette sets all of them at once.
// Rolling makes one up: a hue for the ball, others picked from it by the harmony asked
// for, the paper light or — now and then, or when asked — dark, and the inks as far from
// the paper as they can go, as a gel pen on black paper is. The colours land in the
// settings, so a rolled palette is in the link like any other.

const PALETTES = [
  { label: '— select palette —' },
  { label: 'The picture', c: {
      paperColor: '#ffffff', ink0: '#1d1d1f', ink1: '#c0392b', ink2: '#1a6dd1', ink3: '#2a8a4a',
      ballColor: '#f4a30b', ballShadow: '#7a3300', skyTop: '#7d8ca6', skyBottom: '#e3e6ec',
      ringColor: '#c0392b' } },
  { label: 'Black on white', c: {
      paperColor: '#ffffff', ink0: '#111111', ink1: '#555555', ink2: '#888888', ink3: '#bbbbbb',
      ballColor: '#f2f2f2', ballShadow: '#6d6d6d', skyTop: '#d9d9d9', skyBottom: '#ffffff',
      ringColor: '#9a9a9a' } },
  { label: 'White gel on black', c: {
      paperColor: '#17181b', ink0: '#f2f1ea', ink1: '#ff9a3c', ink2: '#6ec6ff', ink3: '#b8f28a',
      ballColor: '#2b2d33', ballShadow: '#050506', skyTop: '#07080b', skyBottom: '#23262e',
      ringColor: '#ff9a3c' } },
  { label: 'Blueprint', c: {
      paperColor: '#1f4f8f', ink0: '#f4f7fb', ink1: '#9fd3ff', ink2: '#ffe28a', ink3: '#c8f0c8',
      ballColor: '#3a74bf', ballShadow: '#0e2748', skyTop: '#173d70', skyBottom: '#2d65ad',
      ringColor: '#9fd3ff' } },
  { label: 'Sepia', c: {
      paperColor: '#f3e7cf', ink0: '#3b2414', ink1: '#8a4b20', ink2: '#5b6b3a', ink3: '#9a7b4f',
      ballColor: '#d9a066', ballShadow: '#5a3218', skyTop: '#c9b28b', skyBottom: '#f3e7cf',
      ringColor: '#8a4b20' } },
  { label: 'Risograph', c: {
      paperColor: '#fbf6ee', ink0: '#0078bf', ink1: '#ff48b0', ink2: '#ffe800', ink3: '#00a95c',
      ballColor: '#ff7ac8', ballShadow: '#2a3b8f', skyTop: '#9fd6f5', skyBottom: '#fbf6ee',
      ringColor: '#0078bf' } },
  { label: 'Neon', c: {
      paperColor: '#0c0d12', ink0: '#39ff88', ink1: '#ff3cac', ink2: '#2de2e6', ink3: '#fff200',
      ballColor: '#1f7a5c', ballShadow: '#06110d', skyTop: '#05060a', skyBottom: '#1c1030',
      ringColor: '#ff3cac' } },
  { label: 'Sunset', c: {
      paperColor: '#fff4e8', ink0: '#2b1b3f', ink1: '#d7263d', ink2: '#f46036', ink3: '#1b998b',
      ballColor: '#ff9f1c', ballShadow: '#6b1d3a', skyTop: '#5b3f8c', skyBottom: '#ffb88c',
      ringColor: '#d7263d' } },
  { label: 'Forest', c: {
      paperColor: '#eef2e6', ink0: '#1e2d24', ink1: '#6b8f3a', ink2: '#a0522d', ink3: '#3a6ea5',
      ballColor: '#8fb35a', ballShadow: '#1f3a22', skyTop: '#7fa39a', skyBottom: '#e6efe0',
      ringColor: '#a0522d' } },
];

const COLOUR_KEYS = ['paperColor', 'ink0', 'ink1', 'ink2', 'ink3', 'ballColor', 'ballShadow',
                     'skyTop', 'skyBottom', 'ringColor'];

function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 1); l = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function applyPalette(c) {
  Object.assign(settings, c);
  for (const k of COLOUR_KEYS) if (setters[k]) setters[k](settings[k]);
  refreshPenList();
  drawPreview();
  syncUrl();
}

function rollColours() {
  const r = Math.random, h = settings.harmony;
  const H = 360 * r();
  const offsets = {
    'analogous': [30, -30, 60],
    'complementary': [180, 150, 210],
    'triad': [120, 240, 60],
    'one hue': [0, 0, 0],
  }[h] || [60 + 240 * r(), 90 + 180 * r(), 360 * r()];
  const dark = h === 'dark paper' || (h === 'any' && r() < 0.3);
  const sat = h === 'one hue' ? 0.35 : 0.75;
  const inkL = dark ? [0.9, 0.66, 0.62, 0.7] : [0.14, 0.42, 0.4, 0.36];
  const c = {
    paperColor: dark ? hsl(H + 180, 0.18, 0.08 + 0.05 * r()) : hsl(H + 30, 0.3, 0.93 + 0.05 * r()),
    ink0: hsl(H + 200, dark ? 0.1 : 0.25, inkL[0]),
    ink1: hsl(H + offsets[0], sat, inkL[1] + (h === 'one hue' ? 0.12 : 0)),
    ink2: hsl(H + offsets[1], sat, inkL[2]),
    ink3: hsl(H + offsets[2], sat * 0.9, inkL[3]),
    ballColor: hsl(H, 0.8, dark ? 0.42 : 0.55),
    ballShadow: hsl(H - 20, 0.85, dark ? 0.06 : 0.2),
    skyTop: hsl(H + 180 + offsets[0] / 6, 0.28, dark ? 0.08 : 0.55),
    skyBottom: hsl(H + 180, 0.2, dark ? 0.22 : 0.88),
    ringColor: hsl(H + offsets[0], 0.72, dark ? 0.55 : 0.45),
  };
  applyPalette(c);
}

////////////////////////////////////////////////////////////////////////////////////////
// The sidebar

function addSection(parent, title) {
  createDiv(title).parent(parent).class('section');
}

function addSub(parent, title) {
  createDiv(title).parent(parent).class('sub');
}

function setVisible(key, on) {
  if (fieldDivs[key]) fieldDivs[key].style('display', on ? '' : 'none');
}

function syncVisibility() {
  const s = settings;
  const pens = Math.round(clamp(s.pens, 1, MAX_PENS));
  const persp = s.projection === 'perspective';
  setVisible('cropMarkGap', s.cropMarks);
  setVisible('distance', persp);

  setVisible('brushRipples', s.brushProfile === 'ripples');
  setVisible('slideSoft', s.slide !== 0);

  const on = k => s[k] !== 0;
  for (const k of ['noiseStyle', 'noiseSize', 'noiseOctaves', 'noiseRough', 'noiseWarp']) setVisible(k, on('noiseAmp'));
  for (const k of ['rippleDrops', 'rippleLength', 'rippleReach', 'ripplePhase']) setVisible(k, on('rippleAmp'));
  for (const k of ['foldCount', 'foldLength', 'foldWidth', 'foldCurl', 'foldProfile']) setVisible(k, on('foldAmp'));
  for (const k of ['weaveTiles', 'weaveFolds']) setVisible(k, on('weaveAmp'));
  for (const k of ['ribKind', 'ribCount', 'ribRings', 'ribPhase']) setVisible(k, on('ribAmp'));
  if (on('ribAmp')) {
    setVisible('ribCount', s.ribKind !== 'rings');
    setVisible('ribRings', s.ribKind !== 'ribs');
  }

  const ring = s.ring !== 'none', flat = s.ring === 'flat';
  setVisible('ringInner', flat);
  setVisible('ringOuter', flat);
  setVisible('ringRadius', s.ring === 'band');
  setVisible('ringHeight', s.ring === 'band');
  for (const k of ['ringBands', 'ringTilt', 'ringTurn', 'ringWobble', 'ringLines', 'ringOpaque']) setVisible(k, ring);
  setVisible('ringGap', ring && s.ringBands > 1);
  setVisible('ringWaves', ring && s.ringWobble !== 0);
  setVisible('ringSpacing', ring && s.ringLines !== 'rims');

  setVisible('contourKeep', s.contours > 0);
  setVisible('sliceSpacing', s.slices !== 'none' && s.slices !== 'meridians');
  setVisible('sliceCount', s.slices === 'meridians');
  setVisible('sliceTilt', s.slices === 'tilted');
  setVisible('sliceTurn', s.slices === 'tilted');
  const shade = s.shading !== 'none';
  setVisible('shadeLevels', s.shading === 'hatch');
  setVisible('shadeAngle', s.shading === 'hatch');
  setVisible('shadeSpacing', shade);
  setVisible('shadeFrom', shade || s.shadowEdge);
  const lit = shade || s.shadowEdge || s.preview === 'painted';
  setVisible('lightAz', lit);
  setVisible('lightEl', lit);
  setVisible('skySpacing', s.sky !== 'none' && s.sky !== 'rays');
  setVisible('skyAmount', ['stars', 'waves', 'rays', 'clouds'].includes(s.sky));

  for (let i = 1; i < MAX_PENS; i++) setVisible('ink' + i, pens > i);
  const layerOn = {
    meshPen: s.meshLines !== 'none', outlinePen: s.outline, wavesPen: s.contours > 0,
    slicesPen: s.slices !== 'none', shadePen: shade || s.shadowEdge, ringPen: ring,
    skyPen: s.sky !== 'none',
  };
  for (const k in layerOn) setVisible(k, pens > 1 && layerOn[k]);

  const painted = s.preview === 'painted';
  for (const k of ['ballColor', 'ballShadow', 'shine', 'skyTop', 'skyBottom', 'clouds',
                   'ringColor', 'ringAlpha']) setVisible(k, painted);
  refreshPenList();
}

function applyScene(sc) {
  Object.assign(settings, DEFAULTS, sc.s || {});
  refreshControls();
  refreshWaveNote();
  resizeForPaper();
}

function resetAll() {
  Object.assign(settings, DEFAULTS);
  refreshControls();
  refreshWaveNote();
  resizeForPaper();
}

function copyLink(btn) {
  const done = () => {
    btn.html('Copied');
    btn.addClass('copied');
    setTimeout(() => { btn.html('Copy link'); btn.removeClass('copied'); }, 1200);
  };
  // The clipboard API is blocked on file:// in some browsers, hence the old fallback.
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

// redrawOnly controls skip the whole pipeline — nothing about the strokes changes.
function addSlider(parent, labelText, key, min, max, step, hint, redrawOnly) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const row = createDiv('').parent(field).class('row');
  const sl  = createSlider(min, max, settings[key], step).parent(row);
  const num = createInput(String(settings[key])).parent(row);
  num.attribute('type', 'text');           // type=number rejects "." in a comma locale
  num.attribute('inputmode', 'decimal');
  if (hint) createDiv(hint).parent(field).class('note');

  const refresh = () => { if (redrawOnly) { syncVisibility(); drawPreview(); syncUrl(); } else update(); };
  setters[key] = v => { sl.value(v); num.value(String(v)); };

  sl.input(() => {
    settings[key] = Number(sl.value());
    num.value(String(settings[key]));
    if (redrawOnly) drawPreview();
    else if (!liveUpdate() && isCamera(key)) showModel();
  });
  sl.changed(() => refresh());
  num.input(() => {
    const v = parseNum(num.value());
    if (v === null) return;
    settings[key] = clamp(v, min, max);
    sl.value(settings[key]);
    refresh();
  });
  return sl;
}

function isCamera(key) {
  return ['azimuth', 'elevation', 'roll', 'distance', 'zoom'].includes(key);
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
  sel.changed(() => { settings[key] = sel.value(); onChange(); });
  return sel;
}

function addCheckbox(parent, labelText, key, redrawOnly) {
  const row = createDiv('').parent(parent).class('checkbox-row');
  fieldDivs[key] = row;
  const cb = createCheckbox(labelText, settings[key]).parent(row);
  setters[key] = v => cb.checked(!!v);
  cb.changed(() => {
    settings[key] = cb.checked();
    syncVisibility();
    if (redrawOnly) { drawPreview(); updateStats(); syncUrl(); } else update();
  });
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
    refreshPenList();
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
  createDiv('The noise, where the drops fall, which way the folds wander, the jitter of ' +
    'the net and the stars. <b>R</b> rolls a new one, <b>[</b> and <b>]</b> step through ' +
    'them.').parent(field).class('note');

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

function refreshWaveNote() {
  if (!waveNote) return;
  const n = parseWaves(settings.waves).length, R = Math.round(settings.brushRepeat);
  waveNote.html(n
    ? `<b>${n}</b> wave${n > 1 ? 's' : ''} drawn by hand${R > 1 ? `, each ${R} times round` : ''} — ` +
      `${settings.waves.length} characters of the link.`
    : 'No wave drawn by hand yet.');
}

function buildControls() {
  const root = select('#controls');
  const refit = () => { syncVisibility(); update(); };
  const redraw = () => { syncVisibility(); drawPreview(); syncUrl(); };

  addSection(root, 'Scene');
  const sceneSel = createSelect().parent(createDiv('').parent(root).class('field'));
  for (const sc of SCENES) sceneSel.option(sc.label);
  sceneSel.changed(() => {
    const sc = SCENES[sceneSel.elt.selectedIndex];
    if (sc && sc.s) applyScene(sc);
    sceneSel.elt.selectedIndex = 0;
  });

  // --- Drawing waves ---
  addSection(root, 'Drawing waves');
  const tools = createDiv('').parent(root).class('tools');
  for (const [t, label] of [['wave', 'Draw waves'], ['turn', 'Turn'], ['erase', 'Erase']]) {
    toolButtons[t] = createButton(label).parent(tools).mousePressed(() => setTool(t));
  }
  createDiv('<b>Draw waves</b> — drag over the ball and a wave runs along the way you go; ' +
    'click and it rings out round the point. Off the ball a drag turns the camera. ' +
    '<b>Turn</b> — every drag turns it. <b>Erase</b> — click a wave to take it away. ' +
    'A right-drag or <b>shift</b>-drag always pans.').parent(root).class('note');
  addSelect(root, 'Profile', 'brushProfile', PROFILES, () => syncVisibility(),
    '<b>ridge</b>, <b>trough</b> — a crest or a groove along the stroke; <b>fold</b> — up ' +
    'on one side of it and down on the other, like a sheet folded over; <b>crease</b> — a ' +
    'sharp V the net gathers into; <b>ripples</b> — crests running out either side of it.');
  addSlider(root, 'Height (% of the radius)', 'brushAmp', 0, 30, 0.1);
  addSlider(root, 'Width (°)', 'brushWidth', 1, 90, 0.5,
    'How far either side of the stroke the wave reaches, in degrees of arc over the ball. ' +
    'The ring round the mouse shows it.');
  addSlider(root, 'Ripples', 'brushRipples', 1, 12, 1);
  addSlider(root, 'Copies round the axis', 'brushRepeat', 1, 24, 1,
    'Every wave drawn by hand, repeated this many times round the ball, for patterns that ' +
    'go all the way round.', false);
  addSlider(root, 'All drawn waves (%)', 'drawnAmp', -200, 300, 1,
    'Every wave drawn so far, higher or lower at once — below 0 turned inside out.');
  waveNote = createDiv('').parent(root).class('note');
  refreshWaveNote();
  const waveRow = createDiv('').parent(root).class('btn-row');
  createButton('Undo last wave').parent(waveRow).mousePressed(undoWave);
  createButton('Clear waves').parent(waveRow).mousePressed(clearWaves);

  // --- Pen and colours ---
  addSection(root, 'Pens and colours');
  addSlider(root, 'Pen width (mm)', 'penWidth', 0.05, 2, 0.05,
    'The nib. It sets the line the preview and the SVG draw with, and it is taken off ' +
    'the margin so ink never reaches past it.');
  addSlider(root, 'Pens', 'pens', 1, MAX_PENS, 1,
    'Split the drawing between up to four colours — one pass of the plotter each. Which ' +
    'layer goes to which pen is set under <b>Lines</b>.');
  addColor(root, 'Ink 1', 'ink0');
  addColor(root, 'Ink 2', 'ink1');
  addColor(root, 'Ink 3', 'ink2');
  addColor(root, 'Ink 4', 'ink3');
  addColor(root, 'Paper colour', 'paperColor',
    'The preview only — the files have no background.');
  const palSel = createSelect().parent(createDiv('').parent(root).class('field'));
  for (const p of PALETTES) palSel.option(p.label);
  palSel.changed(() => {
    const p = PALETTES[palSel.elt.selectedIndex];
    if (p && p.c) applyPalette(p.c);
    palSel.elt.selectedIndex = 0;
  });
  addSelect(root, 'Harmony', 'harmony', HARMONIES, () => syncUrl(),
    'How <b>Roll colours</b> picks the inks from the ball\'s hue: next to it, across from ' +
    'it, a third of the way round, all one hue — or anything, now and then on dark paper. ' +
    '<b>K</b> rolls too.');
  createButton('Roll colours').parent(root).mousePressed(rollColours);
  addSelect(root, 'Preview', 'preview', PREVIEWS, redraw,
    '<b>plot</b> — the lines on the paper, as they will be plotted. <b>painted</b> — a ' +
    'picture of the same sheet: a sky, the ball coloured and lit, the ring seen through, ' +
    'and the lines over them. It is saved with <b>Download PNG</b>; the SVGs never have it. ' +
    '<b>V</b> switches.');
  addColor(root, 'Ball', 'ballColor');
  addColor(root, 'Ball in shadow', 'ballShadow');
  addSlider(root, 'Shine (%)', 'shine', 0, 100, 1, '', true);
  addColor(root, 'Sky, top', 'skyTop');
  addColor(root, 'Sky, bottom', 'skyBottom');
  addSlider(root, 'Clouds (%)', 'clouds', 0, 100, 1, '', true);
  addColor(root, 'Ring', 'ringColor');
  addSlider(root, 'Ring seen through (%)', 'ringAlpha', 0, 100, 1,
    'How much of the ring\'s colour covers what is behind it — the opacity, in the picture.',
    true);

  // --- Paper ---
  addSection(root, 'Paper');
  addSelect(root, 'Size', 'paper', Object.keys(PAPER_SIZES), resizeForPaper);
  addSelect(root, 'Orientation', 'orientation', ['portrait', 'landscape'], resizeForPaper);
  addSlider(root, 'Margin (mm)', 'margin', 0, 60, 1);
  addCheckbox(root, 'Cut guide dots around the sheet', 'cropMarks');
  addSlider(root, 'Most between two dots (mm)', 'cropMarkGap', 20, 600, 5,
    'A dot in every corner, and each side split evenly so no gap is wider than this — ' +
    'lay a ruler through two dots and cut.');

  // --- Camera ---
  addSection(root, 'Camera');
  addSelect(root, 'Projection', 'projection', PROJECTIONS, refit,
    '<b>orthographic</b> — from far away: a line is the same size near and far. ' +
    '<b>perspective</b> — from close by: the near side of the ball swells and its outline ' +
    'shrinks. <b>P</b> switches.');
  addSlider(root, 'Distance (radii)', 'distance', 1.3, 40, 0.1,
    'How far the camera stands from the middle of the ball. Close is dramatic; past 20 ' +
    'it is hard to tell from orthographic.');
  addSlider(root, 'Azimuth (°)', 'azimuth', -180, 180, 0.5,
    'Round the ball\'s axis. Dragging across the sheet off the ball does the same.');
  addSlider(root, 'Elevation (°)', 'elevation', -90, 90, 0.5,
    'Above the ball\'s equator.');
  addSlider(root, 'Roll (°)', 'roll', -180, 180, 0.5,
    'The whole drawing turned on the sheet.');
  addSlider(root, 'Zoom (%)', 'zoom', MIN_ZOOM, MAX_ZOOM, 1,
    'At 100 % the ball — before its waves, with a little room for them — and its ring just ' +
    'fit inside the margin. Past that the drawing is cut at the margin. The wheel zooms ' +
    'about the point under the cursor.');
  createButton('Reset zoom and pan').parent(root).mousePressed(resetZoom);

  // --- Composition ---
  addSection(root, 'Composition');
  addSelect(root, 'Lines over the sheet', 'composeLines', COMPOSE_LINES,
    () => { drawPreview(); syncUrl(); },
    'Over the preview only, never plotted. <b>cross</b> — through the middle of the ' +
    'sheet; <b>golden section</b> — each way at 0.382 and 0.618 of it; <b>thirds</b> — the ' +
    'painter\'s grid. <b>C</b> steps through them.');
  addCheckbox(root, 'Frame round the drawing', 'showFrame', true);
  createDiv('Dashed round what the ball, the ring and the sky cover, with a small cross at ' +
    'its middle and a ring where the weight of the ink sits; the numbers are how far it is ' +
    'from each edge of the sheet, in mm. <b>F</b> shows and hides it.').parent(root).class('note');
  const centreRow = createDiv('').parent(root).class('btn-row');
  createButton('Centre the ball').parent(centreRow).mousePressed(() => centreOn('ball'));
  createButton('Centre the frame').parent(centreRow).mousePressed(() => centreOn('frame'));
  createButton('Centre the ink').parent(centreRow).mousePressed(() => centreOn('ink'));

  // --- The ball ---
  addSection(root, 'The ball');
  addSeedField(root);
  addSelect(root, 'Net', 'mesh', MESHES, refit,
    '<b>geodesic</b> — an icosahedron cut into triangles and blown round, nearly even ' +
    'all over.<br><b>lat-long</b> — latitudes and meridians, like a globe; the diagonals ' +
    'that make its squares into triangles are not drawn.<br><b>lat-long triangles</b> — ' +
    'every other ring shifted half a step, all of it triangles.<br><b>cube</b> — a cube ' +
    'cut into squares and blown round.');
  addSlider(root, 'Detail (edges round)', 'detail', 8, 600, 1,
    'About how many edges of the net go once round the ball. Twice the detail is four ' +
    'times the triangles — and the lines.');
  addSlider(root, 'Jitter (% of an edge)', 'jitter', 0, 60, 1,
    'Every point of the net pushed about along the ball, so it loses its regularity and ' +
    'reads more like a surface scanned than one computed.');

  // --- Waves ---
  addSection(root, 'Waves');
  addSlider(root, 'All waves (%)', 'amplitude', -200, 300, 1,
    'Every wave at once. Each one below is a height as a share of the radius, and they ' +
    'add up; 0 on its own height leaves it out.');
  addSlider(root, 'Slide into troughs (%)', 'slide', -95, 95, 1,
    'The net slides along the ball downhill, into the troughs of the waves, and gathers ' +
    'there as a crumpled sheet gathers in its folds: where it bunches, the lines crowd ' +
    'into dark creases. This is how much the deepest trough squeezes it — at 90 % to a ' +
    'tenth. Below 0 it gathers on the crests instead. The shape stays the same; only the ' +
    'triangles move.');
  addSlider(root, 'Gather from (°)', 'slideSoft', 0, 40, 0.5,
    'How far either side of a trough the net is drawn in from. The waves are softened by ' +
    'this much before their slope is read, so even a sharp crease gathers the net from a ' +
    'wide stretch round it, and not only from the triangles next to it.');

  addSub(root, 'Noise');
  addSlider(root, 'Height (% of the radius)', 'noiseAmp', 0, 30, 0.1);
  addSelect(root, 'Kind', 'noiseStyle', NOISE_STYLES, refit,
    '<b>smooth</b> — rolling lumps; <b>ridges</b> — sharp crests, like a mountain range; ' +
    '<b>creases</b> — sharp troughs, like crumpled paper.');
  addSlider(root, 'Lumps (to a radius)', 'noiseSize', 0.2, 12, 0.05);
  addSlider(root, 'Octaves', 'noiseOctaves', 1, 7, 1);
  addSlider(root, 'Roughness', 'noiseRough', 0.1, 0.9, 0.01,
    'How much of each octave the next, finer one keeps.');
  addSlider(root, 'Warp', 'noiseWarp', 0, 3, 0.01,
    'The noise pushed about by noise of its own before it is read, which swirls the ' +
    'lumps into folds and whorls.');

  addSub(root, 'Ripples');
  addSlider(root, 'Height (% of the radius)', 'rippleAmp', 0, 20, 0.1);
  addSlider(root, 'Drops', 'rippleDrops', 1, 24, 1,
    'Scattered over the ball by the seed; each rings out and the rings add up where they ' +
    'cross.');
  addSlider(root, 'Wavelength (°)', 'rippleLength', 1, 90, 0.5);
  addSlider(root, 'Reach (°)', 'rippleReach', 2, 180, 1,
    'How far out the rings carry before they are down to a third.');
  addSlider(root, 'Phase (°)', 'ripplePhase', 0, 360, 1,
    'How far through a wavelength the rings have run out.');

  addSub(root, 'Folds');
  addSlider(root, 'Height (% of the radius)', 'foldAmp', 0, 30, 0.1);
  addSlider(root, 'Folds', 'foldCount', 1, 80, 1);
  addSlider(root, 'Length (°)', 'foldLength', 5, 360, 1);
  addSlider(root, 'Width (°)', 'foldWidth', 1, 60, 0.5);
  addSlider(root, 'Wander (%)', 'foldCurl', 0, 200, 1,
    'How far each fold turns off a great circle as it goes.');
  addSelect(root, 'Profile', 'foldProfile', PROFILES, refit);

  addSub(root, 'Weave');
  addSlider(root, 'Height (% of the radius)', 'weaveAmp', 0, 20, 0.1);
  addSlider(root, 'Tiles (across)', 'weaveTiles', 1, 30, 0.5,
    'Tiles across the ball. The folds of each run east–west or north–south across it, ' +
    'the two in turn, like the strands of a basket.');
  addSlider(root, 'Folds (a tile)', 'weaveFolds', 0.5, 10, 0.25);

  addSub(root, 'Ribs');
  addSlider(root, 'Height (% of the radius)', 'ribAmp', 0, 30, 0.1);
  addSelect(root, 'Kind', 'ribKind', RIB_KINDS, refit,
    '<b>ribs</b> — pole to pole, like a melon; <b>rings</b> — round it, like latitudes; ' +
    '<b>spiral</b> — both at once; <b>harmonic</b> — a spherical harmonic, the standing ' +
    'wave a bubble rings in, of degree <b>Rings</b> and order <b>Ribs</b>.');
  addSlider(root, 'Ribs', 'ribCount', 0, 60, 1);
  addSlider(root, 'Rings', 'ribRings', 0, 40, 1);
  addSlider(root, 'Phase (°)', 'ribPhase', 0, 360, 1);

  // --- The ring ---
  addSection(root, 'The ring');
  addSelect(root, 'Ring', 'ring', RING_KINDS, refit,
    '<b>flat</b> — lying in its plane, like a planet\'s. <b>band</b> — a strip standing ' +
    'round the ball, like a hoop.');
  addSlider(root, 'Inside (radii)', 'ringInner', 1, 4, 0.01);
  addSlider(root, 'Outside (radii)', 'ringOuter', 1, 5, 0.01);
  addSlider(root, 'Radius (radii)', 'ringRadius', 1, 4, 0.01);
  addSlider(root, 'Height (radii)', 'ringHeight', 0.005, 1, 0.005);
  addSlider(root, 'Bands', 'ringBands', 1, 12, 1);
  addSlider(root, 'Gap between bands (%)', 'ringGap', 0, 200, 1);
  addSlider(root, 'Tilt (°)', 'ringTilt', -90, 90, 0.5,
    'Off the ball\'s equator.');
  addSlider(root, 'Tilted towards (°)', 'ringTurn', -180, 180, 0.5);
  addSlider(root, 'Wobble (% of the radius)', 'ringWobble', -40, 40, 0.5,
    'The ring rising and falling as it goes round — a flat one more towards its outside ' +
    'edge, like a brim.');
  addSlider(root, 'Wobbles round', 'ringWaves', 1, 40, 1);
  addSelect(root, 'Lines', 'ringLines', RING_LINES, refit,
    '<b>rims</b> — its edges; <b>grooves</b> — lines along it between them; <b>spokes</b> ' +
    '— lines across it; <b>grid</b> — both.');
  addSlider(root, 'Line spacing (mm)', 'ringSpacing', 0.2, 10, 0.05);
  addCheckbox(root, 'Opaque — hides what is behind it', 'ringOpaque');

  // --- Lines ---
  addSection(root, 'Lines');
  createDiv('Each kind of line is a layer, with a pen of its own and a file of its own.')
    .parent(root).class('note');
  addSelect(root, 'Net', 'meshLines', MESH_LINES, refit,
    'The edges of the triangles, drawn as long strokes running on across the ball.');
  addSlider(root, 'Net pen', 'meshPen', 1, MAX_PENS, 1);
  addCheckbox(root, 'Outline', 'outline');
  addSlider(root, 'Outline pen', 'outlinePen', 1, MAX_PENS, 1);
  addSlider(root, 'Wave contours', 'contours', 0, 80, 1,
    'Contour lines of the waves\' height — levels spread evenly from the deepest trough ' +
    'to the highest crest, drawn on the ball like the contours of a map.');
  addSelect(root, 'Contours kept', 'contourKeep', CONTOUR_KEEP, refit,
    '<b>crests</b> — only the levels above the bare ball; <b>troughs</b> — only those ' +
    'below it.');
  addSlider(root, 'Waves pen', 'wavesPen', 1, MAX_PENS, 1);
  addSelect(root, 'Slices', 'slices', SLICE_KINDS, refit,
    'The ball cut by parallel planes and the cuts drawn: <b>latitudes</b> — square to ' +
    'its axis; <b>meridians</b> — through it; <b>horizontal</b>, <b>vertical</b> — ' +
    'across the sheet whichever way the ball is turned; <b>depth</b> — square to the ' +
    'view, rings round the middle; <b>tilted</b> — any way you like.');
  addSlider(root, 'Slice spacing (mm)', 'sliceSpacing', 0.2, 20, 0.05);
  addSlider(root, 'Meridian planes', 'sliceCount', 1, 180, 1);
  addSlider(root, 'Slices lean (°)', 'sliceTilt', 0, 90, 0.5);
  addSlider(root, 'Slices lean towards (°)', 'sliceTurn', -180, 180, 0.5);
  addSlider(root, 'Slices pen', 'slicesPen', 1, MAX_PENS, 1);
  addSelect(root, 'Shading', 'shading', SHADINGS, refit,
    '<b>hatch</b> — lines where the light does not reach, and more of them across the ' +
    'first where it reaches less; <b>dots</b> — scattered over the dark, thicker where ' +
    'it is darker.');
  addSlider(root, 'Hatch levels', 'shadeLevels', 1, 4, 1);
  addSlider(root, 'Shade below (% of the light)', 'shadeFrom', 1, 100, 1);
  addSlider(root, 'Spacing (mm)', 'shadeSpacing', 0.2, 6, 0.05,
    'Between two hatch lines — or between two dots where it is darkest.');
  addSlider(root, 'Hatch angle (°)', 'shadeAngle', -90, 90, 1);
  addCheckbox(root, 'The line where the light gives out', 'shadowEdge');
  addSlider(root, 'Light from (°)', 'lightAz', -180, 180, 1,
    'Round the ball as the camera sees it: 0 from behind you, −90 from the left, 90 from ' +
    'the right. It stays put while the ball turns.');
  addSlider(root, 'Light from above (°)', 'lightEl', -90, 90, 1);
  addSlider(root, 'Shading pen', 'shadePen', 1, MAX_PENS, 1);
  addSlider(root, 'Ring pen', 'ringPen', 1, MAX_PENS, 1);
  addSelect(root, 'Sky', 'sky', SKIES, refit,
    'Behind everything, and hidden wherever the ball — or the ring, when it is opaque — ' +
    'is in front: <b>stars</b>; <b>lines</b> across the sheet; <b>waves</b> — the same ' +
    'lines, rolling; <b>halo</b> — rings round the ball; <b>rays</b> out of it; ' +
    '<b>clouds</b> — contours of a slow noise.');
  addSlider(root, 'Sky spacing (mm)', 'skySpacing', 0.5, 30, 0.1);
  addSlider(root, 'Sky amount (%)', 'skyAmount', 0, 100, 1);
  addSlider(root, 'Sky pen', 'skyPen', 1, MAX_PENS, 1);
  addSlider(root, 'Shortest stroke (mm)', 'minStroke', 0, 3, 0.05,
    'A piece of line cut shorter than this by what is in front of it is left out — the ' +
    'slivers peeking round the outline are pen lifts for next to no ink.');

  // --- Output ---
  addSection(root, 'Output');
  addCheckbox(root, 'Order the strokes for the plotter', 'optimiseOrder');
  addCheckbox(root, 'Follow the sliders live', 'liveUpdate');
  addCheckbox(root, 'Show the guides', 'showGuides', true);

  createButton('Download SVG [everything]').parent(root).class('primary')
    .mousePressed(() => exportSvg({ all: true }));
  createDiv('One file with every layer, a group per pen.').parent(root).class('note');
  const layerBox = createDiv('').parent(root).class('layer-buttons');
  LAYERS.forEach((ly, li) => {
    const b = createButton('').parent(layerBox);
    b.mousePressed(() => exportSvg({ layer: li }));
    layerButtons[li] = b;
  });
  createButton('Download SVG [one per pen]').parent(root).mousePressed(() => exportSvg({ perPen: true }));
  createDiv('One file a layer, or one a pen — each a pass of the plotter on its own. The ' +
    'cut guides go into every file, so the passes line up.').parent(root).class('note');
  addSlider(root, 'Picture (dpi)', 'pngDpi', 50, 600, 10, '', true);
  createButton('Download PNG').parent(root).mousePressed(exportPng);
  createDiv('The preview as it stands — plot or painted — without the guides.')
    .parent(root).class('note');
  const row = createDiv('').parent(root).class('btn-row');
  createButton('Copy link').parent(row).mousePressed(function () { copyLink(this); });
  createButton('Reset').parent(row).mousePressed(resetAll);

  addSection(root, 'The sheet');
  statsDiv = createDiv('').parent(root).class('stats');
  penListDiv = createDiv('').parent(root).class('stats');
  const keys = createDiv('').parent(root).class('note keys');
  keys.html(
    '<div><kbd>drag</kbd> on the ball: draw a wave · <kbd>click</kbd>: drop one</div>' +
    '<div><kbd>drag</kbd> off it: turn · <kbd>shift</kbd>+<kbd>drag</kbd> pan</div>' +
    '<div><kbd>W</kbd> draw · <kbd>T</kbd> turn · <kbd>E</kbd> erase · <kbd>Z</kbd> undo a wave</div>' +
    '<div><kbd>wheel</kbd> zoom · <kbd>+</kbd> <kbd>−</kbd> too · <kbd>0</kbd> reset</div>' +
    '<div><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> turn by 1°, with ' +
    '<kbd>shift</kbd> by 10°</div>' +
    '<div><kbd>R</kbd> new seed · <kbd>[</kbd> <kbd>]</kbd> step it · <kbd>P</kbd> ' +
    'projection · <kbd>G</kbd> guides</div>' +
    '<div><kbd>V</kbd> plot / painted · <kbd>K</kbd> roll colours · <kbd>C</kbd> lines ' +
    'over the sheet · <kbd>F</kbd> frame</div>');
  linkDiv = createDiv('').parent(root).class('link');

  setTool(TOOL);
  syncVisibility();
}

// How large the drawing is, and how far off the middle of the sheet its frame's middle —
// and, with the frame shown, the weight of its ink — sits.
function offMiddle(x, y) {
  const [W, H] = paperDims();
  const dx = x - W / 2, dy = y - H / 2, out = [];
  if (Math.abs(dx) >= 0.05) out.push(`${Math.abs(dx).toFixed(1)} mm ${dx > 0 ? 'right' : 'left'}`);
  if (Math.abs(dy) >= 0.05) out.push(`${Math.abs(dy).toFixed(1)} mm ${dy > 0 ? 'down' : 'up'}`);
  return out.length ? out.join(' and ') + ' off the middle of the sheet' : 'on the middle of the sheet';
}

function placeLine() {
  const fb = frameBox;
  if (!fb) return '';
  let html = `<div>The drawing is <b>${(fb.x1 - fb.x0).toFixed(0)} × ` +
    `${(fb.y1 - fb.y0).toFixed(0)} mm</b>, its frame's middle ` +
    `${offMiddle((fb.x0 + fb.x1) / 2, (fb.y0 + fb.y1) / 2)}</div>`;
  if (settings.showFrame && inkMid) {
    html += `<div>The weight of the ink ${offMiddle(inkMid.x, inkMid.y)}</div>`;
  }
  return html;
}

// One row per plot pass, since each is a separate sitting at the plotter with a
// different pen in the holder — and a button per layer, wearing the colour it is drawn in.
function refreshPenList() {
  LAYERS.forEach((ly, li) => {
    const b = layerButtons[li];
    if (!b) return;
    const p = perLayer && perLayer[li];
    const on = p && p.strokes > 0;
    b.style('display', on ? '' : 'none');
    if (on) {
      b.html(`<span class="sw" style="background:${inkColor(p.pen)}"></span>` +
        `SVG [${ly.label}] — ${groupNum(p.strokes)} strokes, ${(p.ink / 1000).toFixed(1)} m`);
    }
  });
  if (!penListDiv) return;
  const pens = Math.round(clamp(settings.pens, 1, MAX_PENS));
  if (pens < 2 || !perPen) { penListDiv.html(''); return; }

  let html = '';
  for (let i = 0; i < pens; i++) {
    const p = perPen[i] || { strokes: 0, ink: 0 };
    if (!p.strokes) continue;
    const names = LAYERS.filter((ly, li) => perLayer && perLayer[li].strokes && perLayer[li].pen === i)
      .map(ly => ly.label).join(', ');
    html += `<div class="pen-row"><span class="sw" style="background:${inkColor(i)}"></span>` +
      `<span>pen ${i + 1} — <b>${groupNum(p.strokes)}</b> strokes, ` +
      `<b>${(p.ink / 1000).toFixed(1)}</b> m, ` +
      `${formatDuration(p.strokes * PEN_CYCLE_S + p.ink / DRAW_SPEED)}` +
      `${names ? ` · ${names}` : ''}</span></div>`;
  }
  penListDiv.html(html);
}

////////////////////////////////////////////////////////////////////////////////////////
// What the sheet costs

function updateStats() {
  if (!statsDiv) return;
  const s = settings;

  if (!MESH) {
    statsDiv.html(`<div class="warn">A net this fine would be more than ` +
      `${groupNum(MAX_FACES)} triangles. Lower the detail.</div>`);
    refreshPenList();
    return;
  }
  if (!area || area.w <= 0 || area.h <= 0) {
    statsDiv.html(`<div class="warn">The margin leaves nothing to draw on. ` +
      `Lower it, or use larger paper.</div>`);
    refreshPenList();
    return;
  }
  if (!plan || !shapes) {
    statsDiv.html(
      `<div class="warn">${groupNum(strokes)} strokes — past the ${groupNum(MAX_STROKES)} ` +
      `limit, so nothing was ordered or drawn.<br>Lower the detail, or widen the hatching ` +
      `and the slices.</div>`);
    refreshPenList();
    return;
  }

  const seconds = strokes * PEN_CYCLE_S + plan.ink / DRAW_SPEED + plan.travel / TRAVEL_SPEED;
  const cover = clamp(plan.ink * s.penWidth / Math.max(1, area.w * area.h), 0, 1);
  const edgeMm = S * MESH.edgeArc;

  let html =
    `<div class="big"><b>${groupNum(strokes)}</b> strokes, ` +
    `<b>${(plan.ink / 1000).toFixed(1)}</b> m of line</div>` +
    `<div>${groupNum(MESH.nf)} triangles, ${groupNum(counts.front)} of them turned to the ` +
    `camera · edges ${edgeMm.toFixed(2)} mm on paper, about</div>` +
    `<div>Waves from ${(100 * SURF.hMin).toFixed(1)} to ${(100 * SURF.hMax).toFixed(1)} % of ` +
    `the radius${SURF.moved > 0 ? ` · the net slid ${(SURF.moved * 180 / Math.PI).toFixed(1)}° at most` : ''}</div>` +
    `<div>Pen up for ${(plan.travel / 1000).toFixed(1)} m between strokes</div>` +
    `<div>Ink covers <b>${(100 * cover).toFixed(0)} %</b> of the drawable area</div>` +
    placeLine() +
    `<div>Roughly <b>${formatDuration(seconds)}</b> to plot · ${lastMs.toFixed(0)} ms to ` +
    `build</div>`;

  if (s.meshLines !== 'none' && edgeMm < 2.5 * s.penWidth) {
    html += `<div class="warn">The edges of the net are about ${edgeMm.toFixed(2)} mm long on ` +
      `paper, under ${(2.5 * s.penWidth).toFixed(2)} mm — two and a half nibs — and the net ` +
      `will run together into solid ink. Lower the detail, or zoom in.</div>`;
  }
  if (s.shading === 'hatch' && s.shadeSpacing < 2 * s.penWidth) {
    html += `<div class="warn">The hatching is closer than twice the nib and will run ` +
      `together into solid ink.</div>`;
  }
  if (strokes > BUSY_STROKES) {
    html += `<div class="warn">${groupNum(strokes)} strokes is a long sitting at the ` +
      `plotter. A coarser net, or fewer layers, bring it down.</div>`;
  }
  if (lastMs > LIVE_BUDGET_MS) {
    html += `<div class="dim">Too much to follow a drag live — the ball alone follows the ` +
      `camera and the lines wait for the mouse to come up.</div>`;
  }

  statsDiv.html(html);
  refreshPenList();
}

////////////////////////////////////////////////////////////////////////////////////////
// SVG
//
// No fills, no background rectangle — everything in the file is meant to be plotted.
// stroke-width is the pen width and the caps are round, so the file previews exactly as
// the finished plot looks. Strokes come out in the order the pen should visit them, each
// already flipped to the end it should be entered from, and the link that rebuilds the
// sheet is written into the header comment. Everything, one group per pen; or a file a
// layer, or a file a pen — each a pass of its own, the cut guides in every one.

function metaComment() {
  const s = settings;
  const waves = [];
  if (s.noiseAmp) waves.push(`noise=${s.noiseAmp}%/${s.noiseStyle}/${s.noiseSize}x${s.noiseOctaves}` +
    ` rough=${s.noiseRough} warp=${s.noiseWarp}`);
  if (s.rippleAmp) waves.push(`ripples=${s.rippleAmp}%x${s.rippleDrops} len=${s.rippleLength}°` +
    ` reach=${s.rippleReach}° phase=${s.ripplePhase}°`);
  if (s.foldAmp) waves.push(`folds=${s.foldAmp}%x${s.foldCount}/${s.foldProfile} len=${s.foldLength}°` +
    ` width=${s.foldWidth}° wander=${s.foldCurl}%`);
  if (s.weaveAmp) waves.push(`weave=${s.weaveAmp}% tiles=${s.weaveTiles} folds=${s.weaveFolds}`);
  if (s.ribAmp) waves.push(`${s.ribKind}=${s.ribAmp}% n=${s.ribCount} k=${s.ribRings} phase=${s.ribPhase}°`);
  const drawn = parseWaves(s.waves).length;
  if (drawn) waves.push(`drawn=${drawn}x${s.brushRepeat} at ${s.drawnAmp}%`);
  const ring = s.ring === 'none' ? 'ring=none'
    : `ring=${s.ring} ${s.ring === 'flat' ? `${s.ringInner}..${s.ringOuter}` : `r=${s.ringRadius} h=${s.ringHeight}`}` +
      ` bands=${s.ringBands} tilt=${s.ringTilt}°@${s.ringTurn}° wobble=${s.ringWobble}%x${s.ringWaves}` +
      ` lines=${s.ringLines}/${s.ringSpacing} ${s.ringOpaque ? 'opaque' : 'clear'}`;
  const cam = `${s.projection}${s.projection === 'perspective' ? '@' + s.distance : ''} ` +
    `az=${s.azimuth}° el=${s.elevation}° roll=${s.roll}° zoom=${s.zoom}%`;
  const lines = [`net=${s.meshLines}`];
  if (s.outline) lines.push('outline');
  if (s.contours) lines.push(`contours=${s.contours}/${s.contourKeep}`);
  if (s.slices !== 'none') lines.push(`slices=${s.slices}/${s.slices === 'meridians' ? s.sliceCount : s.sliceSpacing}`);
  if (s.shading !== 'none') lines.push(`shading=${s.shading}/${s.shadeLevels}<${s.shadeFrom}%/${s.shadeSpacing}`);
  if (s.shadowEdge) lines.push('shadow-edge');
  if (s.sky !== 'none') lines.push(`sky=${s.sky}/${s.skySpacing}/${s.skyAmount}%`);
  return `rippled sphere — ${s.mesh} detail=${s.detail} jitter=${s.jitter}% seed=${s.seed} ` +
    `waves=${s.amplitude}% slide=${s.slide}% ${waves.join(' ') || 'still'} ${ring} ${cam} ` +
    `${lines.join(' ')} light=${s.lightAz}°/${s.lightEl}° min=${s.minStroke}mm pens=${s.pens} ` +
    `${s.cropMarks ? 'cropmarks<=' + s.cropMarkGap + 'mm ' : ''}` +
    `pen=${s.penWidth}mm strokes=${strokes}`;
}

// The strokes kept, in plot order, as one <g>.
function svgGroup(keep, colour, id) {
  const { pts, off } = shapes;
  const { order, flip } = plan;
  const f = n => String(+n.toFixed(3));
  const CHUNK = 400;                       // subpaths per <path>, keeps the DOM small

  let body = '', d = '', held = 0, count = 0;
  for (let t = 0; t < order.length; t++) {
    const i = order[t];
    if (!keep(i)) continue;
    const rev = flip[t] === 1;
    const a = off[i], b = off[i + 1];
    const n = b - a;
    count++;

    let k  = rev ? b - 1 : a;
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

  return {
    count,
    body: `<g id="${id}" fill="none" stroke="${colour}" stroke-width="${f(settings.penWidth)}" ` +
      `stroke-linecap="round" stroke-linejoin="round">\n${body}</g>\n`,
  };
}

// A file of the groups asked for, the cut guides first in the first one's colour.
function svgFile(groups, tag) {
  const [W, H] = paperDims();
  const all = [];
  if (settings.cropMarks && groups.length) {
    all.push([i => shapes.ink[i] === INK_MARK, groups[0][1], 'cut-guides']);
  }
  all.push(...groups);

  let body = '', count = 0;
  for (const [keep, col, id] of all) {
    const g = svgGroup(keep, col, id);
    if (!g) continue;
    body += g.body;
    if (id !== 'cut-guides') count += g.count;
  }
  if (!count) return null;

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- ${metaComment()} pass=${tag} -->\n` +
    `<!-- ${location.origin === 'null' ? '' : location.origin}${location.pathname}` +
    `#${encodeState()} -->\n` +
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
  const s = settings, pens = Math.round(clamp(s.pens, 1, MAX_PENS));
  const files = [];
  const penGroup = i => [j => shapes.ink[j] === i, inkColor(i), 'pen' + (i + 1)];
  if (what.all) {
    const groups = [];
    for (let i = 0; i < pens; i++) groups.push(penGroup(i));
    files.push([groups, 'everything']);
  } else if (what.perPen) {
    for (let i = 0; i < pens; i++) {
      if (perPen[i] && perPen[i].strokes) files.push([[penGroup(i)], 'pen' + (i + 1)]);
    }
  } else if (what.layer !== undefined) {
    const li = what.layer, ly = LAYERS[li];
    files.push([[[j => shapes.lay[j] === li, inkColor(perLayer[li].pen), ly.id]], ly.id]);
  }

  const stem = `rippled sphere ${s.mesh} seed${s.seed} ${s.paper}-${s.orientation}`;
  const stamp = timestamp();
  let saved = 0;
  for (const [groups, tag] of files) {
    const svg = svgFile(groups, tag);
    if (!svg) continue;
    saveStrings([svg], `${stem} ${tag} pen${s.penWidth} ${stamp}`, 'svg');
    saved++;
  }
  if (!saved) alert('Nothing in that part of the sheet.');
}

// The preview as a picture, at the resolution asked for, without the guides.
function exportPng() {
  const [W, H] = paperDims();
  let pxmm = Math.max(1, settings.pngDpi / 25.4);
  const most = 1.2e8;                                  // pixels a canvas is safe with
  if (W * H * pxmm * pxmm > most) pxmm = Math.sqrt(most / (W * H));
  const c = document.createElement('canvas');
  c.width = Math.round(W * pxmm);
  c.height = Math.round(H * pxmm);
  drawSheet(c.getContext('2d'), pxmm);
  const s = settings;
  const name = `rippled sphere ${s.mesh} seed${s.seed} ${s.paper}-${s.orientation} ` +
    `${s.preview} ${Math.round(pxmm * 25.4)}dpi ${timestamp()}.png`;
  c.toBlob(blob => {
    if (!blob) { alert('The picture could not be made — try a lower dpi.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }, 'image/png');
  drawPreview();                                       // the sky and ring canvases, back to size
}
