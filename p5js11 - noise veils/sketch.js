////////////////////////////////////////////////////////////////////////////////////////
// Noise veils — a regular family of threads dragged through a field until it crumples
//
// Start with something perfectly regular: a set of concentric rings, or a ruling of
// parallel lines, or one long spiral. Then push every point of it sideways by a vector
// read out of a Perlin field. A smooth field would only bend the family; what makes
// cloth out of it is *folding* — looking the field up at a place the field itself has
// already moved you to:
//
//     v  = F(p)
//     v' = F(p + g·v)          one fold
//     v" = F(p + g·v')         two folds
//
// Each round drags the lookup further off its own grid, and where two parts of the sheet
// are dragged towards one another the threads pile up into a crease. Those creases are
// the dark ridges; between them the family fans out and reads as gauze. One fold gives a
// soft swell, two the folded veil of the reference, three a crumple.
//
// What keeps it a fabric and not a tangle is that neighbouring threads must see almost —
// but not quite — the same field. Perlin is read in three dimensions and the third
// coordinate is the thread's own index, so thread 40 is looking at a slice of the field a
// little further along than thread 39. That step is the *drift*. At zero every thread is
// pushed by the same map and the family stays a single warped surface; wind it up and the
// threads separate into sheets that cross and hide one another. Everything that reads as
// depth in the drawing comes out of that one number.
//
// The push can also be turned. Pointed straight along the field vector it spreads and
// gathers; turned a quarter circle it runs *along* the ridges instead, which sweeps the
// threads sideways without ever pulling them apart. Anything between the two is the
// usual answer.
//
// Last, the hole. The eye needs somewhere to rest, so a disc is taken out of the middle:
// either cut, which ends every thread that runs into it on a clean circle, or pushed,
// which squeezes what was inside out into a band around the rim and piles it up dark.
//
// Everything is drawn as polylines, clipped to the drawable box, thinned, ordered for the
// plotter and written out as SVG. The hole is dragged with the mouse and sized with the
// wheel; everything else lives in the sidebar and in the URL, so a plot is reproduced by
// pasting its link.
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};

const SHAPES    = ['rings', 'lines', 'spiral', 'spokes'];
const FALLOFFS  = ['even', 'grows outward', 'fades outward'];
const HOLE_MODES = ['none', 'cut', 'push'];
const PEN_SPLITS = ['bands', 'interleaved', 'by fold'];
const FILL_REGIONS = ['none', 'the blank round the disc', 'every blank patch',
                      'the disc', 'a ring around it', 'everything outside it'];
const FILL_STYLES  = ['spiral', 'rings', 'hatch'];
const SVG_OUTPUTS = ['one file', 'one file per pen', 'both'];

const MAX_PENS       = 3;
const INK_MARK       = -1;        // cut guides: drawn with every pen
const INK_FILL       = -2;        // the filled area: its own colour, its own nib, first
const FILL_SAG       = 0.05;      // mm a filled arc may cut the corner by
const BLANK_CELLS    = 4e6;       // most cells the blank is ever measured on
const MAX_STROKES    = 400_000;   // past this nothing is ordered, drawn or exported
const BUSY_STROKES   = 80_000;    // above this, warn about the plot time
const MAX_POINTS     = 12e6;      // field lookups one update is allowed to ask for
const BUSY_POINTS    = 3e6;       // above this, dragging stops following live
const MAX_THREADS    = 20_000;
const EPS            = 0.01;      // mm — the stub that stands in for a single dot
const NOISE_GAIN     = 1.45;      // brings fbm's practical range up to about ±1
const PREVIEW_MAX_PX = 1500;      // preview canvas resolution (paper is in mm)
const MAX_PREVIEW_W  = 900;       // on-screen size of that canvas
const MAX_PREVIEW_H  = 700;
const LIVE_BUDGET_MS = 150;       // slower than this and a drag waits for the release
const HIT_MM         = 6;         // how close the cursor has to be to grab a handle
const WHEEL_MM       = 0.06;      // hole radius per wheel delta unit
const PEN_CYCLE_S    = 0.3;       // rough pen-up + pen-down time, seconds
const DRAW_SPEED     = 60;        // rough drawing speed, mm/s
const TRAVEL_SPEED   = 150;       // rough pen-up travel speed, mm/s

const settings = {
  // paper + pen
  paper: 'A4',
  orientation: 'landscape',
  margin: 10,
  penWidth: 0.2,

  // cut guides — dots on the edge of the sheet, for trimming an oversized plot back
  cropMarks: false,
  cropMarkGap: 400,     // mm — the most that is ever left between two marks

  // the threads, before anything is done to them
  shape: 'rings',
  spacing: 0.55,        // mm between one thread and the next
  step: 0.4,            // mm along a thread between two samples
  angle: 0,             // deg — which way the ruling runs, for `lines`
  centreU: 50,          // % of the drawable box
  centreV: 50,
  radius0: 4,           // mm — the family starts this far out
  radius1: 0,           // mm — 0 runs it out past the far corner
  span: 360,            // deg of the fan the family fills
  spanFrom: 0,          // deg the fan starts at

  // the warp
  seed: 1,
  feature: 130,         // mm — how far apart the swells of the field sit
  amount: 55,           // mm — how far a point is pushed at full strength
  folds: 2,             // nested lookups: 1 swells, 2 folds, 3 crumples
  foldGain: 2.5,        // how hard one fold feeds into the next
  octaves: 3,
  roughness: 0.5,       // how much each octave keeps of the one before
  drift: 0.2,           // % — how far the field moves on from thread to thread
  swirl: 30,            // deg the push is turned by: 90 sweeps instead of spreading

  // how the push is shared out over the sheet
  falloff: 'even',
  falloffPower: 1.4,

  // the hole
  holeMode: 'cut',
  holeR: 26,            // mm
  holeLinked: true,     // the hole sits where the family is centred
  holeU: 50,
  holeV: 50,
  holeSoft: 8,          // mm — the band the pushed-out material is spread over
  holeOutline: false,   // draw the rim as a circle of its own

  // the fill — a second pass over the middle of the sheet, in a pen of its own
  fillRegion: 'none',
  fillStyle: 'spiral',  // spiral is one stroke and never lifts the pen
  fillPen: 1,           // mm — the thick nib that does the filling
  fillGap: 85,          // % of that nib between one pass of it and the next
  fillInset: 0.5,       // mm the fill keeps clear of whatever it is filling up to
  fillBand: 12,         // mm — how wide the ring is, for `a ring around it`
  fillGrid: 0.5,        // mm — the cell the blank paper is measured on
  fillMinPatch: 40,     // mm² — a blank patch smaller than this is not worth a pen-down
  fillAngle: 0,         // deg — for `hatch`
  fillColor: '#b23a00',

  // pens
  pens: 1,
  penSplit: 'bands',
  ink0: '#000000',
  ink1: '#b23a00',
  ink2: '#1a6dd1',

  // output
  simplifyTol: 0.05,    // mm — how far a thinned thread may stray from the sampled one
  optimiseOrder: true,
  liveUpdate: true,
  showGuides: true,
  svgOutput: 'one file',
};

const DEFAULTS = { ...settings };

// A handful of sheets worth starting from. Each one is the whole state, so a scene is
// also the shortest way to see what one part of the sidebar is for.
const SCENES = [
  { name: 'Veil', s: {} },
  { name: 'Gauze', s: {
      spacing: 0.45, step: 0.35, penWidth: 0.15, amount: 74, feature: 125,
      folds: 2, foldGain: 2.6, drift: 0.14, swirl: 52, holeR: 30, seed: 7 } },
  { name: 'Crumple', s: {
      spacing: 0.95, amount: 46, feature: 58, folds: 3, foldGain: 2.2, octaves: 4,
      drift: 0.45, swirl: 12, holeR: 20, seed: 12 } },
  { name: 'Cloth', s: {
      shape: 'lines', angle: 90, spacing: 0.6, amount: 38, feature: 72,
      folds: 2, foldGain: 2.8, drift: 0.15, swirl: 76, holeMode: 'none', seed: 3 } },
  { name: 'Eye', s: {
      spacing: 0.8, amount: 60, feature: 105, folds: 2, foldGain: 2.4, drift: 0.25,
      swirl: 44, radius0: 3, holeMode: 'push', holeR: 28, holeSoft: 26,
      falloff: 'grows outward', falloffPower: 1.6, seed: 21 } },
  { name: 'Smoke', s: {
      orientation: 'portrait', spacing: 0.8, amount: 46, feature: 78, folds: 2,
      foldGain: 2.6, drift: 3.2, swirl: 62, holeMode: 'none', seed: 33 } },
  { name: 'Whorl', s: {
      shape: 'spiral', spacing: 0.9, step: 0.35, amount: 48, feature: 90, folds: 2,
      foldGain: 2.8, drift: 0.3, swirl: 60, radius0: 6, holeR: 22, seed: 5 } },
  { name: 'Iris', s: {
      shape: 'spokes', spacing: 1.1, amount: 34, feature: 70, folds: 2, foldGain: 2.6,
      drift: 0.9, swirl: 18, radius0: 22, holeR: 22,
      falloff: 'grows outward', falloffPower: 1.5, seed: 9 } },
  { name: 'Two pens', s: {
      spacing: 0.6, amount: 55, feature: 95, drift: 0.2, swirl: 30, holeR: 26,
      pens: 2, penSplit: 'by fold', seed: 15 } },
];

const setters   = {};        // settings key -> function that moves its control
const fieldDivs = {};        // settings key -> the .field wrapper, for showing/hiding
let statsDiv, linkDiv, penListDiv;

let area    = null;          // { x0, y0, x1, y1, w, h } — the drawable box, in mm
let shapes  = null;          // { pts, off, ink } — polylines in mm
let strokes = 0;             // how many of them, even when there are too many to draw
let plan    = null;          // { order, flip, ink, travel }
let perPen  = null;          // per pen: { strokes, ink }
let fillStat = null;         // the filled area on its own: { strokes, ink }
let lastMs  = 0;
let lastPoints = 0;
let drag    = null;          // 'hole' | 'centre' while the mouse is down on a handle

////////////////////////////////////////////////////////////////////////////////////////
// Small change

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function parseNum(str) {
  const v = Number(String(str).replace(',', '.').trim());
  return Number.isFinite(v) ? v : null;
}

function round(v, dp) { return String(+v.toFixed(dp)); }

function groupNum(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
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

////////////////////////////////////////////////////////////////////////////////////////
// The URL is the document
//
// Every setting that differs from its default is written into the hash, debounced, with
// replaceState so the back button stays usable. Opening that link anywhere rebuilds the
// same sheet — the seed is in there too, so nothing is left to chance.

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
  resizeForPaper();
}

////////////////////////////////////////////////////////////////////////////////////////
// Geometry

function paperDims() {
  const [a, b] = PAPER_SIZES[settings.paper];
  return settings.orientation === 'portrait' ? [a, b] : [b, a];
}

// The pen is round, so ink reaches half a pen width past the end of every line: the
// drawable box is the sheet less the margin less that half width, and no thread — warped
// or not — is ever allowed outside it.
function drawArea() {
  const [W, H] = paperDims();
  const m = settings.margin + settings.penWidth / 2;
  return { x0: m, y0: m, x1: W - m, y1: H - m, w: W - 2 * m, h: H - 2 * m };
}

function centreMm() {
  return [area.x0 + area.w * settings.centreU / 100,
          area.y0 + area.h * settings.centreV / 100];
}

function holeMm() {
  if (settings.holeLinked) return centreMm();
  return [area.x0 + area.w * settings.holeU / 100,
          area.y0 + area.h * settings.holeV / 100];
}

// How far the family has to run to cover the sheet: the corner of the box furthest from
// where it is centred, plus the room the warp needs to drag material back in from.
function reachMm() {
  const [cx, cy] = centreMm();
  let r = 0;
  for (const x of [area.x0, area.x1]) {
    for (const y of [area.y0, area.y1]) r = Math.max(r, Math.hypot(x - cx, y - cy));
  }
  return r;
}

function padMm() {
  return Math.max(0, settings.amount) * 1.25 + Math.max(0.05, settings.spacing);
}

function outerR() {
  return settings.radius1 > 0 ? settings.radius1 : reachMm() + padMm();
}

function previewScale() {
  const [w, h] = paperDims();
  return Math.min(PREVIEW_MAX_PX / w, PREVIEW_MAX_PX / h);
}

function canvasEl() {
  return document.querySelector('#canvas-container canvas');
}

////////////////////////////////////////////////////////////////////////////////////////

function setup() {
  applyState(location.hash.replace(/^#/, ''));
  urlWritten = encodeState();
  window.addEventListener('hashchange', onHashChange);
  area = drawArea();            // the sidebar is built before the first update

  const [w, h] = paperDims();
  const s = previewScale();
  createCanvas(Math.round(w * s), Math.round(h * s)).parent('canvas-container');
  applyCanvasDisplay();
  buildControls();
  attachPointer();
  attachKeys();
  update();
}

function applyCanvasDisplay() {
  const [pw, ph] = paperDims();
  const scale = Math.min(MAX_PREVIEW_W / pw, MAX_PREVIEW_H / ph);
  const c = canvasEl();
  if (c) {
    c.style.width  = pw * scale + 'px';
    c.style.height = ph * scale + 'px';
  }
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
  area = drawArea();
  strokes = 0;
  shapes = plan = perPen = null;
  lastPoints = estimatePoints();

  if (area.w > 0 && area.h > 0 && lastPoints <= MAX_POINTS) {
    shapes = buildShapes();
    strokes = shapes.off.length - 1;
    // Past the limit nothing is ordered, drawn or exported — the stats say why.
    if (strokes > MAX_STROKES) { shapes = null; perPen = null; }
    else plan = orderShapes(shapes);
  }

  lastMs = performance.now() - t0;
  drawPreview();
  syncVisibility();
  updateStats();
  syncUrl();
}

// Called while a slider is being dragged. When a whole update cannot keep up, dragging
// simply waits for the mouse to come up.
function liveUpdate() {
  if (!settings.liveUpdate || lastMs > LIVE_BUDGET_MS) return;
  update();
}

// A rough count of the points that will be warped, so a spacing of 0.05 mm is refused
// before it freezes the tab rather than after.
function estimatePoints() {
  const a = drawArea();
  if (a.w <= 0 || a.h <= 0) return 0;
  const sp = Math.max(0.05, settings.spacing);
  const st = Math.max(0.05, settings.step);
  const r0 = Math.max(0, settings.radius0);
  const r1 = Math.max(r0 + sp, outerR());
  const frac = clamp(settings.span, 1, 360) / 360;

  let fill = 0;
  if (blankRegion()) {
    // Scanned over the whole box: what the flood actually claims is only knowable later.
    const fs = fillSpacing(), cell = clamp(settings.fillGrid, 0.15, 4) / 2;
    fill = (a.w / fs) * (Math.hypot(a.w, a.h) / cell);
  } else if (settings.fillRegion !== 'none') {
    const rr = fillRadii();
    if (rr) {
      const fs = fillSpacing();
      fill = Math.PI * (rr[1] * rr[1] - rr[0] * rr[0]) / (fs * Math.max(0.4, arcStep(rr[1])));
    }
  }

  switch (settings.shape) {
    case 'lines': {
      const d = Math.hypot(a.w, a.h) + 2 * padMm();
      return fill + (d / sp) * (d / st);
    }
    case 'spokes': {
      const n = Math.max(1, Math.round(frac * 2 * Math.PI * r1 / sp));
      return fill + n * ((r1 - r0) / st + 1);
    }
    case 'spiral':
      return fill + Math.PI * (r1 * r1 - r0 * r0) / (sp * st);
    default:
      return fill + frac * Math.PI * (r1 * r1 - r0 * r0) / (sp * st);
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// The field
//
// Improved Perlin in three dimensions. The first two coordinates are the point on the
// sheet, divided by the feature size so that one swell of the field is that many
// millimetres across; the third is the thread's own place in the family. Two lookups at
// well-separated offsets give the two components of a vector, which is what a point is
// pushed by.

// The twelve gradients, flattened: three numbers each, so the inner loop indexes a
// typed array once instead of walking an array of arrays eight times per lookup. The
// permutation is folded through the same table up front for the same reason.
const GRAD3 = new Float64Array([
   1, 1, 0,  -1, 1, 0,   1,-1, 0,  -1,-1, 0,
   1, 0, 1,  -1, 0, 1,   1, 0,-1,  -1, 0,-1,
   0, 1, 1,   0,-1, 1,   0, 1,-1,   0,-1,-1,
]);

function makePerlin3(seed) {
  const rnd = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  const perm = new Uint16Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const gi = new Uint8Array(512);
  for (let i = 0; i < 512; i++) gi[i] = (perm[i] % 12) * 3;

  return function (x, y, z) {
    const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
    const X = fx & 255, Y = fy & 255, Z = fz & 255;
    const xf = x - fx, yf = y - fy, zf = z - fz;
    const x1 = xf - 1, y1 = yf - 1, z1 = zf - 1;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const w = zf * zf * zf * (zf * (zf * 6 - 15) + 10);

    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;

    const g0 = gi[AA],     a0 = GRAD3[g0] * xf + GRAD3[g0 + 1] * yf + GRAD3[g0 + 2] * zf;
    const g1 = gi[BA],     b0 = GRAD3[g1] * x1 + GRAD3[g1 + 1] * yf + GRAD3[g1 + 2] * zf;
    const g2 = gi[AB],     a1 = GRAD3[g2] * xf + GRAD3[g2 + 1] * y1 + GRAD3[g2 + 2] * zf;
    const g3 = gi[BB],     b1 = GRAD3[g3] * x1 + GRAD3[g3 + 1] * y1 + GRAD3[g3 + 2] * zf;
    const g4 = gi[AA + 1], a2 = GRAD3[g4] * xf + GRAD3[g4 + 1] * yf + GRAD3[g4 + 2] * z1;
    const g5 = gi[BA + 1], b2 = GRAD3[g5] * x1 + GRAD3[g5 + 1] * yf + GRAD3[g5 + 2] * z1;
    const g6 = gi[AB + 1], a3 = GRAD3[g6] * xf + GRAD3[g6 + 1] * y1 + GRAD3[g6 + 2] * z1;
    const g7 = gi[BB + 1], b3 = GRAD3[g7] * x1 + GRAD3[g7 + 1] * y1 + GRAD3[g7 + 2] * z1;

    const n0 = a0 + (b0 - a0) * u, n1 = a1 + (b1 - a1) * u;
    const n2 = a2 + (b2 - a2) * u, n3 = a3 + (b3 - a3) * u;
    const m0 = n0 + (n1 - n0) * v, m1 = n2 + (n3 - n2) * v;
    return m0 + (m1 - m0) * w;
  };
}

let nz = null, nzSeed = null;

function ensureNoise() {
  const s = Math.round(settings.seed);
  if (!nz || nzSeed !== s) { nz = makePerlin3(s); nzSeed = s; }
}

// Everything the inner loop needs, worked out once per update.
let OCT = 3, ROUGH = 0.5, FOLDS = 2, GAIN = 2.5, SCL = 1 / 70;
let SWC = 1, SWS = 0, AMP = 22, FALL = 0, FPOW = 1, CX = 0, CY = 0, REACH = 1;
let HX = 0, HY = 0, HR = 0, HSOFT = 0, HCUT = false, HPUSH = false;
let WANT_DISP = false;       // the mean push, which only the `by fold` split asks for

function computeConstants() {
  OCT   = Math.round(clamp(settings.octaves, 1, 6));
  ROUGH = clamp(settings.roughness, 0.1, 0.9);
  FOLDS = Math.round(clamp(settings.folds, 1, 3));
  GAIN  = clamp(settings.foldGain, 0, 8);
  SCL   = 1 / Math.max(1, settings.feature);
  const sw = radians(settings.swirl);
  SWC = Math.cos(sw); SWS = Math.sin(sw);
  AMP = Math.max(0, settings.amount);
  FALL = settings.falloff === 'grows outward' ? 1
       : settings.falloff === 'fades outward' ? -1 : 0;
  FPOW = Math.max(0.05, settings.falloffPower);
  [CX, CY] = centreMm();
  REACH = Math.max(1e-6, reachMm());
  [HX, HY] = holeMm();
  HR = Math.max(0, settings.holeR);
  HSOFT = Math.max(0, settings.holeSoft);
  HCUT  = settings.holeMode === 'cut' && HR > 0;
  HPUSH = settings.holeMode === 'push' && HR > 0;
  WANT_DISP = Math.round(clamp(settings.pens, 1, MAX_PENS)) > 1 &&
              settings.penSplit === 'by fold';
}

function fbm3(x, y, z) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < OCT; o++) {
    sum  += amp * nz(x * freq, y * freq, z * freq);
    norm += amp;
    amp  *= ROUGH;
    freq *= 2;
  }
  return sum / norm;
}

// The offsets that keep the folds from reading the same corner of the field twice. Plain
// numbers, chosen only to be far apart and not whole multiples of the lattice period.
const FOLD_OX = [0, 137.31, -73.19];
const FOLD_OY = [0, -91.77, 41.53];

// Where a point ends up, and how far it travelled getting there.
const PT = [0, 0, 0];

function warpTo(x, y, z) {
  const px = x * SCL, py = y * SCL;
  let vx = 0, vy = 0;
  for (let f = 0; f < FOLDS; f++) {
    const qx = px + GAIN * vx + FOLD_OX[f];
    const qy = py + GAIN * vy + FOLD_OY[f];
    vx = fbm3(qx, qy, z);
    vy = fbm3(qx + 311.7, qy + 157.3, z - 87.9);
  }

  let dx = vx * NOISE_GAIN, dy = vy * NOISE_GAIN;
  if (SWS !== 0) {                              // turn the push away from the field vector
    const t = dx * SWC - dy * SWS;
    dy = dx * SWS + dy * SWC;
    dx = t;
  }

  let a = AMP;
  if (FALL !== 0) {
    const t = clamp(Math.hypot(x - CX, y - CY) / REACH, 0, 1);
    a *= Math.pow(FALL > 0 ? t : 1 - t, FPOW);
  }
  dx *= a; dy *= a;

  PT[0] = x + dx;
  PT[1] = y + dy;
  PT[2] = WANT_DISP ? Math.sqrt(dx * dx + dy * dy) : 0;
}

// Punching the hole. Everything that lands inside the disc is squeezed out into the band
// just past its rim: the radius is remapped so that 0 … R+soft becomes R … R+soft, which
// leaves a clean circle with the material that used to fill it piled up around the edge.
function pushFromHole(x, y) {
  const dx = x - HX, dy = y - HY;
  const d = Math.sqrt(dx * dx + dy * dy);
  const outer = HR + HSOFT;
  if (d >= outer) { PT[0] = x; PT[1] = y; return; }
  const nd = HSOFT > 0 ? HR + HSOFT * d / outer : HR;
  if (d < 1e-9) { PT[0] = HX + nd; PT[1] = HY; return; }
  const k = nd / d;
  PT[0] = HX + dx * k;
  PT[1] = HY + dy * k;
}

////////////////////////////////////////////////////////////////////////////////////////
// Sinks, clipping, thinning
//
// One walked thread is a run of points in millimetres. It is cut at the hole if the hole
// cuts, clipped to the drawable box, thinned by Douglas–Peucker and handed to the sink.

function makeSink() {
  const pts = [], off = [0], ink = [], disp = [];
  return {
    pts, off, ink, disp,
    run(xs, ys, n, id) {
      if (n < 2) return;
      for (let i = 0; i < n; i++) pts.push(xs[i], ys[i]);
      off.push(pts.length / 2);
      ink.push(id);
      disp.push(0);
    },
    // A cut can leave a single sample standing. A zero-length path is dropped by most
    // plotter toolchains, so it goes down as a hairline stub instead.
    dot(x, y, id) {
      pts.push(x - EPS / 2, y, x + EPS / 2, y);
      off.push(pts.length / 2);
      ink.push(id);
      disp.push(0);
    },
  };
}

// Liang–Barsky against the drawable box. Writes the clipped segment into CLIP_OUT and
// returns whether any of it survived; nothing is allocated, it runs once per sample.
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

// Douglas–Peucker. The step along a thread is fine enough to draw a smooth curve, which
// leaves long stretches of the calm parts of the sheet carrying hundreds of collinear
// points. Dropping them costs nothing visible and takes a large bite out of both the SVG
// and the plot time.
function simplifyRun(xs, ys, tol) {
  const n = xs.length;
  if (n <= 2 || tol <= 0) return [xs, ys];

  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const t2 = tol * tol;
  const stack = [0, n - 1];

  while (stack.length) {
    const b = stack.pop(), a = stack.pop();
    if (b - a < 2) continue;
    const ax = xs[a], ay = ys[a];
    const ex = xs[b] - ax, ey = ys[b] - ay;
    const L2 = ex * ex + ey * ey;
    let bi = -1, bd = t2;

    for (let i = a + 1; i < b; i++) {
      const px = xs[i] - ax, py = ys[i] - ay;
      let d2;
      if (L2 <= 1e-18) {
        d2 = px * px + py * py;
      } else {
        const t = clamp((px * ex + py * ey) / L2, 0, 1);
        const qx = px - t * ex, qy = py - t * ey;
        d2 = qx * qx + qy * qy;
      }
      if (d2 > bd) { bd = d2; bi = i; }
    }
    if (bi < 0) continue;
    keep[bi] = 1;
    stack.push(a, bi, bi, b);
  }

  const ox = [], oy = [];
  for (let i = 0; i < n; i++) if (keep[i]) { ox.push(xs[i]); oy.push(ys[i]); }
  return [ox, oy];
}

function emitRun(xs, ys, sink, id) {
  if (xs.length < 2) return;
  const [sx, sy] = simplifyRun(xs, ys, Math.max(0, settings.simplifyTol));
  sink.run(sx, sy, sx.length, id);
}

// The pieces of one walked thread that survive the box, in the order they were walked.
function clipRuns(px, py, n, out) {
  if (n === 1) {
    if (insideArea(px[0], py[0])) out.push([[px[0]], [py[0]]]);
    return;
  }

  // The common case by far: nothing to cut, so hand the whole run straight over.
  let allIn = true;
  for (let i = 0; i < n; i++) {
    if (!insideArea(px[i], py[i])) { allIn = false; break; }
  }
  if (allIn) {
    const rx = new Array(n), ry = new Array(n);
    for (let i = 0; i < n; i++) { rx[i] = px[i]; ry[i] = py[i]; }
    out.push([rx, ry]);
    return;
  }

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

// Cutting a thread at the rim of the hole. The crossing is interpolated on the distance
// itself, so a thread ends on the circle and not on the nearest sample before it.
let gateX = null, gateY = null;

function gateRuns(px, py, gv, n, out) {
  if (!gateX || gateX.length < n + 2) {
    gateX = new Float64Array(n + 2);
    gateY = new Float64Array(n + 2);
  }
  let m = 0;

  for (let i = 0; i < n; i++) {
    if (gv[i] >= 0) {
      if (m === 0 && i > 0) {                     // stepped out of the hole since the last
        const t = gv[i - 1] / (gv[i - 1] - gv[i]);
        gateX[m] = px[i - 1] + (px[i] - px[i - 1]) * t;
        gateY[m] = py[i - 1] + (py[i] - py[i - 1]) * t;
        m++;
      }
      gateX[m] = px[i]; gateY[m] = py[i]; m++;
    } else if (m > 0) {                           // and back into it again
      const t = gv[i - 1] / (gv[i - 1] - gv[i]);
      gateX[m] = px[i - 1] + (px[i] - px[i - 1]) * t;
      gateY[m] = py[i - 1] + (py[i] - py[i - 1]) * t;
      m++;
      clipRuns(gateX, gateY, m, out);
      m = 0;
    }
  }
  if (m > 0) clipRuns(gateX, gateY, m, out);
}

// One walked thread — a ring, a ruled line, a whole spiral — cut at the hole, clipped to
// the box and handed over. A closed thread that comes back to where it started is
// stitched up again if the sheet cut it there, so a ring is one stroke and not two halves
// that happen to meet.
function emitPath(px, py, gv, n, gated, closed, sink, id) {
  const runs = [];
  if (gated) gateRuns(px, py, gv, n, runs);
  else clipRuns(px, py, n, runs);

  if (closed && runs.length > 1) {
    const head = runs[0], tail = runs[runs.length - 1];
    const hx = head[0], hy = head[1], tx = tail[0], ty = tail[1];
    if (Math.abs(tx[tx.length - 1] - hx[0]) < 1e-9 &&
        Math.abs(ty[ty.length - 1] - hy[0]) < 1e-9) {
      tx.pop(); ty.pop();                       // the point the two share
      runs[0] = [tx.concat(hx), ty.concat(hy)];
      runs.pop();
    }
  }

  for (const [xs, ys] of runs) {
    if (xs.length === 1) sink.dot(xs[0], ys[0], id);
    else emitRun(xs, ys, sink, id);
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Walking the family
//
// Each shape fills BX/BY with the points of one thread as it would be without any field
// at all, then hands it to `emitThread`, which is where the warp, the hole and the sheet
// are applied. Keeping the two apart means a new shape is a dozen lines and nothing else
// has to know about it.

let BX = new Float64Array(8192), BY = new Float64Array(8192), BZ = new Float64Array(8192);
let WX = new Float64Array(8192), WY = new Float64Array(8192), GV = new Float64Array(8192);
let usePointZ = false;       // a spiral carries its own slice of the field point by point

function needBuf(n) {
  if (BX.length >= n) return;
  const m = 1 << Math.ceil(Math.log2(n));
  BX = new Float64Array(m); BY = new Float64Array(m); BZ = new Float64Array(m);
  WX = new Float64Array(m); WY = new Float64Array(m); GV = new Float64Array(m);
}

// Which pen draws this thread. `bands` cuts the family into as many contiguous groups as
// there are pens — concentric belts, for rings — and `interleaved` alternates thread by
// thread. `by fold` cannot be answered here: how far the field moved one thread only
// means something next to how far it moved the rest, so those threads are laid down
// unassigned and sorted out once the whole family has been walked.
function penFor(i, total) {
  const pens = Math.round(clamp(settings.pens, 1, MAX_PENS));
  if (pens <= 1) return 0;
  if (settings.penSplit === 'by fold') return 0;
  if (settings.penSplit === 'interleaved') return i % pens;
  const t = total > 1 ? i / total : 0;
  return Math.min(pens - 1, Math.floor(t * pens));
}

// Split the family into equal shares by how far the field moved each thread, so the pen
// that draws the creases is not the pen that draws the calm — and so that both pens
// always have something to do, whatever the push happens to be set to.
function assignByFold(sink) {
  const n = sink.ink.length;
  const pens = Math.round(clamp(settings.pens, 1, MAX_PENS));
  if (pens <= 1 || !n) return;

  const live = [];
  for (let i = 0; i < n; i++) if (sink.ink[i] >= 0) live.push(sink.disp[i]);
  if (!live.length) return;
  live.sort((a, b) => a - b);

  const cut = [];                              // the quantiles the pens change hands at
  for (let k = 1; k < pens; k++) cut.push(live[Math.floor(live.length * k / pens)]);
  for (let i = 0; i < n; i++) {
    if (sink.ink[i] < 0) continue;
    let id = 0;
    while (id < cut.length && sink.disp[i] >= cut[id]) id++;
    sink.ink[i] = id;
  }
}

function emitThread(i, total, n, closed, sink) {
  if (n < 2) return;
  const z = i * settings.drift / 100;
  const before = sink.ink.length;
  let disp = 0;

  for (let k = 0; k < n; k++) {
    warpTo(BX[k], BY[k], usePointZ ? BZ[k] : z);
    let x = PT[0], y = PT[1];
    disp += PT[2];
    if (HPUSH) { pushFromHole(x, y); x = PT[0]; y = PT[1]; }
    WX[k] = x; WY[k] = y;
    if (HCUT) {
      const hx = x - HX, hy = y - HY;
      GV[k] = Math.sqrt(hx * hx + hy * hy) - HR;
    }
  }

  emitPath(WX, WY, GV, n, HCUT, closed, sink, penFor(i, total));
  if (WANT_DISP) {
    const mean = disp / n;
    for (let k = before; k < sink.disp.length; k++) sink.disp[k] = mean;
  }
}

function ringThreads(sink) {
  const sp = Math.max(0.05, settings.spacing);
  const st = Math.max(0.05, settings.step);
  const r0 = Math.max(0, settings.radius0);
  const r1 = outerR();
  if (r1 <= r0) return;

  const total = Math.min(MAX_THREADS, Math.floor((r1 - r0) / sp) + 1);
  const span = clamp(settings.span, 1, 360);
  const full = span >= 359.999;
  const arc = radians(span);
  const from = radians(settings.spanFrom);

  for (let i = 0; i < total; i++) {
    const r = r0 + i * sp;
    if (r < 1e-6) continue;
    const m = Math.max(3, Math.ceil(arc * r / st) + 1);
    const n = full ? m + 1 : m;                  // a full ring repeats its first point
    needBuf(n);
    for (let k = 0; k < m; k++) {
      const a = from + arc * (full ? k / m : k / (m - 1));
      BX[k] = CX + r * Math.cos(a);
      BY[k] = CY + r * Math.sin(a);
    }
    if (full) { BX[m] = BX[0]; BY[m] = BY[0]; }
    emitThread(i, total, n, full, sink);
  }
}

function lineThreads(sink) {
  const sp = Math.max(0.05, settings.spacing);
  const st = Math.max(0.05, settings.step);
  const th = radians(settings.angle);
  const dx = Math.cos(th), dy = Math.sin(th);    // along a thread
  const ux = -dy, uy = dx;                       // across the family
  const pad = padMm();

  // The box, grown by the room the warp needs, projected onto both directions.
  let a0 = Infinity, a1 = -Infinity, c0 = Infinity, c1 = -Infinity;
  for (const x of [area.x0 - pad, area.x1 + pad]) {
    for (const y of [area.y0 - pad, area.y1 + pad]) {
      const a = x * dx + y * dy, c = x * ux + y * uy;
      if (a < a0) a0 = a; if (a > a1) a1 = a;
      if (c < c0) c0 = c; if (c > c1) c1 = c;
    }
  }

  const total = Math.min(MAX_THREADS, Math.floor((c1 - c0) / sp) + 1);
  const n = Math.min(1 << 22, Math.max(2, Math.ceil((a1 - a0) / st) + 1));
  needBuf(n);

  for (let i = 0; i < total; i++) {
    const c = c0 + i * sp;
    for (let k = 0; k < n; k++) {
      const a = a0 + (a1 - a0) * k / (n - 1);
      BX[k] = dx * a + ux * c;
      BY[k] = dy * a + uy * c;
    }
    emitThread(i, total, n, false, sink);
  }
}

function spokeThreads(sink) {
  const sp = Math.max(0.05, settings.spacing);
  const st = Math.max(0.05, settings.step);
  const r0 = Math.max(0, settings.radius0);
  const r1 = outerR();
  if (r1 <= r0) return;

  const span = clamp(settings.span, 1, 360);
  const full = span >= 359.999;
  const arc = radians(span);
  const from = radians(settings.spanFrom);
  const total = Math.min(MAX_THREADS, Math.max(1, Math.round(arc * r1 / sp)));
  const n = Math.max(2, Math.ceil((r1 - r0) / st) + 1);
  needBuf(n);

  for (let i = 0; i < total; i++) {
    const a = from + arc * (full || total < 2 ? i / total : i / (total - 1));
    const ca = Math.cos(a), sa = Math.sin(a);
    for (let k = 0; k < n; k++) {
      const r = r0 + (r1 - r0) * k / (n - 1);
      BX[k] = CX + r * ca;
      BY[k] = CY + r * sa;
    }
    emitThread(i, total, n, false, sink);
  }
}

// One thread for the whole sheet: the radius grows by the thread spacing every turn, and
// the step along it is held to the sample step by taking smaller angular bites the
// further out it gets. A spiral plots as a single stroke, pen down once.
function spiralThread(sink) {
  const sp = Math.max(0.05, settings.spacing);
  const st = Math.max(0.05, settings.step);
  const r0 = Math.max(0.01, settings.radius0);
  const r1 = outerR();
  if (r1 <= r0) return;

  const k = sp / (2 * Math.PI);                  // radius gained per radian
  const aEnd = (r1 - r0) / k;
  const xs = [], ys = [], zs = [];
  const dz = settings.drift / 100 / (2 * Math.PI);

  for (let a = 0; a < aEnd; ) {
    const r = r0 + k * a;
    xs.push(CX + r * Math.cos(a));
    ys.push(CY + r * Math.sin(a));
    zs.push(a * dz);
    a += Math.min(0.4, st / Math.max(0.5, r));
    if (xs.length > (1 << 22)) break;
  }
  const r = r0 + k * aEnd;
  xs.push(CX + r * Math.cos(aEnd));
  ys.push(CY + r * Math.sin(aEnd));
  zs.push(aEnd * dz);

  const n = xs.length;
  needBuf(n);
  for (let i = 0; i < n; i++) { BX[i] = xs[i]; BY[i] = ys[i]; BZ[i] = zs[i]; }
  usePointZ = true;
  emitThread(0, 1, n, false, sink);
  usePointZ = false;
}

// The rim of the hole, drawn rather than merely left empty.
function holeOutlineShape(sink) {
  if (HR <= 0) return;
  const st = Math.max(0.05, settings.step);
  const m = Math.max(24, Math.ceil(2 * Math.PI * HR / st));
  needBuf(m + 1);
  for (let k = 0; k <= m; k++) {
    const a = 2 * Math.PI * (k % m) / m;
    WX[k] = HX + HR * Math.cos(a);
    WY[k] = HY + HR * Math.sin(a);
  }
  emitPath(WX, WY, GV, m + 1, false, true, sink, 0);
}

////////////////////////////////////////////////////////////////////////////////////////
// The filled area
//
// A second pass over the middle of the sheet, and the one place in this sketch where the
// point is to cover paper rather than to draw a line. It is always the same shape — a
// ring about the centre of the hole, between two radii — so the disc, a band around the
// rim and the whole sheet outside it are one piece of machinery given different radii.
//
// It is a pass of its own: its own colour, its own nib and, if you like, its own file.
// The nib is the reason. Filling with the pen that drew the veils would take hours, and
// a 1 mm nib covers five times the paper a 0.2 mm one does for the same length of line,
// so the fill wants the thickest pen in the drawer and the veils the thinnest.

function fillOn() {
  return blankRegion() ? true : settings.fillRegion !== 'none' && fillRadii() !== null;
}

// The two regions that are not a shape but whatever the veils left empty.
function blankRegion() {
  return settings.fillRegion === 'the blank round the disc' ||
         settings.fillRegion === 'every blank patch';
}

// The two radii, measured from the centre of the hole.
function fillRadii() {
  const R = Math.max(0, settings.holeR);
  const inset = settings.fillInset;
  let r0, r1;
  switch (settings.fillRegion) {
    case 'the disc':
      r0 = 0; r1 = R - inset; break;
    case 'a ring around it':
      r0 = R + inset; r1 = r0 + Math.max(0, settings.fillBand); break;
    case 'everything outside it':
      r0 = R + inset; r1 = fillReach(); break;
    default:
      return null;
  }
  return r1 > r0 + 1e-6 ? [Math.max(0, r0), r1] : null;
}

// Far enough to leave no corner of the sheet bare.
function fillReach() {
  const [hx, hy] = holeMm();
  let r = 0;
  for (const x of [area.x0, area.x1]) {
    for (const y of [area.y0, area.y1]) r = Math.max(r, Math.hypot(x - hx, y - hy));
  }
  return r;
}

// How far apart two passes of the fill nib sit. At 100 % they just touch and the paper
// between them is left; below that they overlap, which is what makes it read as solid.
function fillSpacing() {
  return Math.max(0.05, Math.max(0.05, settings.fillPen) * clamp(settings.fillGap, 20, 200) / 100);
}

// Arc to walk before laying the next point down, from how far a chord may cut the corner.
function arcStep(r) {
  return clamp(Math.sqrt(8 * FILL_SAG * Math.max(FILL_SAG, r)), 0.4, 6);
}

function fillRingPass(sink, r0, r1, sp, hx, hy) {
  const first = r0 > 1e-6 ? r0 : sp / 2;
  for (let r = first; r <= r1 + 1e-9; r += sp) {
    const m = Math.max(8, Math.ceil(2 * Math.PI * r / arcStep(r)));
    needBuf(m + 1);
    for (let k = 0; k <= m; k++) {
      const a = 2 * Math.PI * (k % m) / m;
      WX[k] = hx + r * Math.cos(a);
      WY[k] = hy + r * Math.sin(a);
    }
    emitPath(WX, WY, GV, m + 1, false, true, sink, INK_FILL);
  }
}

// One stroke for the whole area: the pen goes down once and comes up at the outside.
function fillSpiralPass(sink, r0, r1, sp, hx, hy) {
  const k = sp / (2 * Math.PI);
  const aEnd = (r1 - r0) / k;
  const xs = [], ys = [];
  for (let a = 0; a < aEnd; ) {
    const r = r0 + k * a;
    xs.push(hx + r * Math.cos(a));
    ys.push(hy + r * Math.sin(a));
    a += arcStep(r) / Math.max(0.2, r);
    if (xs.length > (1 << 21)) break;
  }
  const r = r0 + k * aEnd;
  xs.push(hx + r * Math.cos(aEnd));
  ys.push(hy + r * Math.sin(aEnd));

  const n = xs.length;
  needBuf(n);
  for (let i = 0; i < n; i++) { WX[i] = xs[i]; WY[i] = ys[i]; }
  emitPath(WX, WY, GV, n, false, false, sink, INK_FILL);
}

// Straight lines across the area, cut where they leave it. The gate is the distance from
// the centre against both radii at once, so one number decides a ring and a disc alike.
function fillHatchPass(sink, r0, r1, sp, hx, hy) {
  const th = radians(settings.fillAngle);
  const dx = Math.cos(th), dy = Math.sin(th);
  const ux = -dy, uy = dx;
  const step = Math.min(arcStep(r1), sp);

  const a0 = -r1, a1 = r1, c0 = -r1, c1 = r1;      // the area sits inside its own circle
  const n = Math.max(2, Math.ceil((a1 - a0) / step) + 1);
  needBuf(n);

  for (let c = c0; c <= c1 + 1e-9; c += sp) {
    for (let k = 0; k < n; k++) {
      const a = a0 + (a1 - a0) * k / (n - 1);
      const x = hx + dx * a + ux * c, y = hy + dy * a + uy * c;
      WX[k] = x; WY[k] = y;
      const rx = x - hx, ry = y - hy;
      const d = Math.sqrt(rx * rx + ry * ry);
      GV[k] = Math.min(d - r0, r1 - d);
    }
    emitPath(WX, WY, GV, n, true, false, sink, INK_FILL);
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// The blank paper
//
// The geometric fills above know their shape in advance. This one does not: the area
// worth colouring is whatever paper the veils happened to leave empty, and that is only
// knowable once they are drawn. So the strokes already in the sink are stamped into a
// grid, fattened by the nib that will draw them and by however far the fill is asked to
// keep clear, and what is left unmarked is the blank. A flood from the middle of the
// hole picks out the one piece of it the hole belongs to — the disc together with the
// white it opens into — and every piece at once is the same walk started everywhere.
//
// The grid is the only approximation here, and the fill nib is wide enough that half a
// cell of slop on the edge never shows.

let blank = null;            // { m, nx, ny, g, x0, y0, cells } — 1 where the fill may go

function blankGrid(sink, seeded) {
  const g = clamp(settings.fillGrid, 0.15, 4);
  const nx = Math.ceil(area.w / g) + 1, ny = Math.ceil(area.h / g) + 1;
  if (nx * ny > BLANK_CELLS || nx < 2 || ny < 2) return null;

  // 0 is bare paper, 1 is under ink, 2 is bare paper the fill has claimed.
  const m = new Uint8Array(nx * ny);
  const x0 = area.x0, y0 = area.y0;
  const r = Math.max(0, settings.penWidth / 2 + settings.fillInset);
  const rc = Math.ceil(r / g), r2 = (r / g) * (r / g);

  const stamp = (px, py) => {
    const cx = (px - x0) / g, cy = (py - y0) / g;
    const i0 = Math.max(0, Math.floor(cx - rc)), i1 = Math.min(nx - 1, Math.ceil(cx + rc));
    const j0 = Math.max(0, Math.floor(cy - rc)), j1 = Math.min(ny - 1, Math.ceil(cy + rc));
    for (let j = j0; j <= j1; j++) {
      const dy = j - cy, dy2 = dy * dy;
      for (let i = i0; i <= i1; i++) {
        const dx = i - cx;
        if (dx * dx + dy2 <= r2 + 0.25) m[i + nx * j] = 1;
      }
    }
  };

  // Every stroke the pens will actually put down, walked at half a cell.
  const { pts, off, ink } = sink;
  const half = g / 2;
  for (let k = 0; k < ink.length; k++) {
    if (ink[k] < 0) continue;                  // cut guides are not ink on the drawing
    for (let i = off[k]; i < off[k + 1] - 1; i++) {
      const ax = pts[i * 2], ay = pts[i * 2 + 1];
      const bx = pts[i * 2 + 2], by = pts[i * 2 + 3];
      const len = Math.hypot(bx - ax, by - ay);
      const steps = Math.max(1, Math.ceil(len / half));
      for (let t = 0; t <= steps; t++) stamp(ax + (bx - ax) * t / steps, ay + (by - ay) * t / steps);
    }
  }

  // Flood the bare paper. Scanline fill: push a cell, run the row out both ways, look at
  // the row above and below for more of it.
  const stack = [];
  const push = (i, j) => { if (i >= 0 && i < nx && j >= 0 && j < ny && m[i + nx * j] === 0) stack.push(i, j); };

  if (seeded) {
    const [hx, hy] = holeMm();
    push(Math.round((hx - x0) / g), Math.round((hy - y0) / g));
    if (!stack.length) return null;            // the middle of the hole is under ink
  }

  const patch = [];                            // cells of the run being flooded
  let claimed = 0;

  const flood = () => {
    let n = 0;
    patch.length = 0;
    while (stack.length) {
      const j = stack.pop(), i = stack.pop();
      if (m[i + nx * j] !== 0) continue;
      let a = i, b = i;
      const row = nx * j;
      while (a > 0 && m[a - 1 + row] === 0) a--;
      while (b < nx - 1 && m[b + 1 + row] === 0) b++;
      for (let x = a; x <= b; x++) {
        m[x + row] = 2;
        patch.push(x, j);
        n++;
        if (j > 0) push(x, j - 1);
        if (j < ny - 1) push(x, j + 1);
      }
    }
    return n;
  };

  if (seeded) {
    claimed = flood();
  } else {
    const min = Math.max(0, settings.fillMinPatch) / (g * g);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        if (m[i + nx * j] !== 0) continue;
        stack.push(i, j);
        const n = flood();
        if (n >= min) { claimed += n; continue; }
        for (let t = 0; t < patch.length; t += 2) m[patch[t] + nx * patch[t + 1]] = 0;
      }
    }
  }

  if (!claimed) return null;
  // Everything that was not claimed becomes ink as far as the fill is concerned.
  for (let i = 0; i < m.length; i++) m[i] = m[i] === 2 ? 1 : 0;
  return { m, nx, ny, g, x0, y0, cells: claimed };
}

// The claimed grid, read as a continuous number so a scan line ends part-way across a
// cell rather than on its corner. Positive means the fill may draw here.
function blankAt(B, x, y) {
  const cx = (x - B.x0) / B.g, cy = (y - B.y0) / B.g;
  const i = Math.floor(cx), j = Math.floor(cy);
  if (i < 0 || j < 0 || i >= B.nx - 1 || j >= B.ny - 1) return -0.5;
  const fx = cx - i, fy = cy - j;
  const m = B.m, nx = B.nx;
  const a = m[i + nx * j],       b = m[i + 1 + nx * j];
  const c = m[i + nx * (j + 1)], d = m[i + 1 + nx * (j + 1)];
  const top = a + (b - a) * fx, bot = c + (d - c) * fx;
  return top + (bot - top) * fy - 0.5;
}

// Scan lines across whatever the flood claimed, cut where they leave it.
function fillBlankPass(sink, B, sp) {
  const th = radians(settings.fillAngle);
  const dx = Math.cos(th), dy = Math.sin(th);
  const ux = -dy, uy = dx;
  const step = Math.max(0.1, B.g / 2);

  let a0 = Infinity, a1 = -Infinity, c0 = Infinity, c1 = -Infinity;
  for (const x of [area.x0, area.x1]) {
    for (const y of [area.y0, area.y1]) {
      const a = x * dx + y * dy, c = x * ux + y * uy;
      if (a < a0) a0 = a; if (a > a1) a1 = a;
      if (c < c0) c0 = c; if (c > c1) c1 = c;
    }
  }

  const n = Math.max(2, Math.ceil((a1 - a0) / step) + 1);
  needBuf(n);
  for (let c = c0; c <= c1 + 1e-9; c += sp) {
    for (let k = 0; k < n; k++) {
      const a = a0 + (a1 - a0) * k / (n - 1);
      const x = dx * a + ux * c, y = dy * a + uy * c;
      WX[k] = x; WY[k] = y;
      GV[k] = blankAt(B, x, y);
    }
    emitPath(WX, WY, GV, n, true, false, sink, INK_FILL);
  }
}

function fillShapes(sink) {
  if (blankRegion()) {
    blank = blankGrid(sink, settings.fillRegion === 'the blank round the disc');
    if (blank) fillBlankPass(sink, blank, fillSpacing());
    return;
  }
  const rr = fillRadii();
  if (!rr) return;
  const [r0, r1] = rr;
  const sp = fillSpacing();
  const [hx, hy] = holeMm();
  if (settings.fillStyle === 'hatch') fillHatchPass(sink, r0, r1, sp, hx, hy);
  else if (settings.fillStyle === 'rings') fillRingPass(sink, r0, r1, sp, hx, hy);
  else fillSpiralPass(sink, r0, r1, sp, hx, hy);
}

function cropMarkShapes(sink) {
  const [W, H] = paperDims();
  const step = Math.max(1, settings.cropMarkGap);
  const dot  = (x, y) => sink.dot(x, y, INK_MARK);
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

function buildShapes() {
  ensureNoise();
  computeConstants();

  const sink = makeSink();
  const pens = Math.round(clamp(settings.pens, 1, MAX_PENS));
  perPen = [];
  fillStat = null;
  blank = null;
  for (let i = 0; i < pens; i++) perPen.push({ strokes: 0, ink: 0 });

  switch (settings.shape) {
    case 'lines':  lineThreads(sink); break;
    case 'spokes': spokeThreads(sink); break;
    case 'spiral': spiralThread(sink); break;
    default:       ringThreads(sink); break;
  }
  if (WANT_DISP) assignByFold(sink);
  if (settings.holeOutline && settings.holeMode !== 'none') holeOutlineShape(sink);
  if (settings.fillRegion !== 'none') fillShapes(sink);
  if (settings.cropMarks) cropMarkShapes(sink);

  fillStat = { strokes: 0, ink: 0 };
  for (const id of sink.ink) {
    if (id >= 0 && perPen[id]) perPen[id].strokes++;
    else if (id === INK_FILL) fillStat.strokes++;
  }

  return {
    pts: Float64Array.from(sink.pts),
    off: Int32Array.from(sink.off),
    ink: Int32Array.from(sink.ink),
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
  const cell = Math.max(1e-3, Math.sqrt(w * h / N) * 1.5);
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

// How far the pen draws and how far it travels between strokes — per pen as well as
// altogether, since each colour is a separate pass with a pen of its own.
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
    const id = sh.ink[i];
    if (perPen && id >= 0 && perPen[id]) perPen[id].ink += run;
    else if (id === INK_FILL && fillStat) fillStat.ink += run;
    px = pts[inB * 2];
    py = pts[inB * 2 + 1];
  }
  return { ink, travel };
}

////////////////////////////////////////////////////////////////////////////////////////
// Preview
//
// The strokes are drawn straight on the 2D context from the same polylines the SVG
// exports, in the order and the colours the plotter will use, so what you see is what it
// draws. The handles for the hole and the centre sit on top; they are not part of the
// plot.

function inkColor(id) {
  if (id === INK_MARK) return '#666';
  if (id === INK_FILL) return settings.fillColor;
  return settings['ink' + clamp(id, 0, MAX_PENS - 1)];
}

function inkWidth(id) {
  return id === INK_FILL ? Math.max(0.05, settings.fillPen) : settings.penWidth;
}

function drawPreview() {
  background(255);
  if (!area || area.w <= 0 || area.h <= 0) return;

  const s = previewScale();
  const ctx = drawingContext;

  if (shapes && plan) drawStrokes(ctx, s);
  if (settings.showGuides) drawGuides(ctx, s);
}

function drawStrokes(ctx, s) {
  const { pts, off } = shapes;
  const { order } = plan;

  ctx.save();
  ctx.scale(s, s);
  ctx.lineCap   = 'round';
  ctx.lineJoin  = 'round';

  // The plan already has one pen after another, so the colour changes a handful of times
  // however many strokes there are.
  let t = 0;
  while (t < order.length) {
    const id = shapes.ink[order[t]];
    ctx.strokeStyle = inkColor(id);
    ctx.lineWidth   = inkWidth(id);
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

function drawGuides(ctx, s) {
  const [hx, hy] = holeMm();
  const [cx, cy] = centreMm();

  ctx.save();
  ctx.scale(s, s);
  ctx.lineJoin = 'round';

  if (settings.holeMode !== 'none' && settings.holeR > 0) {
    ctx.strokeStyle = 'rgba(26, 109, 209, 0.85)';
    ctx.lineWidth = 0.45;
    ctx.setLineDash([2.5, 2.5]);
    ctx.beginPath();
    ctx.arc(hx, hy, settings.holeR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // The centre of the family, whenever the hole is not already marking it.
  const marked = settings.holeMode !== 'none' && settings.holeR > 0 &&
                 Math.hypot(cx - hx, cy - hy) < 0.5;
  if (settings.shape !== 'lines' && !marked) {
    ctx.strokeStyle = 'rgba(178, 58, 0, 0.9)';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy); ctx.lineTo(cx + 3, cy);
    ctx.moveTo(cx, cy - 3); ctx.lineTo(cx, cy + 3);
    ctx.stroke();
  }
  ctx.restore();
}

////////////////////////////////////////////////////////////////////////////////////////
// Mouse and keys

function paperPoint(e) {
  const c = canvasEl();
  const r = c.getBoundingClientRect();
  const [W, H] = paperDims();
  return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
}

function attachPointer() {
  const c = canvasEl();
  if (!c) return;

  c.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const [x, y] = paperPoint(e);
    const [hx, hy] = holeMm();
    const [cx, cy] = centreMm();
    // Shift goes for the centre of the family; otherwise whatever handle is nearer, and
    // failing that the hole, which is the one worth moving by eye.
    const noHole = settings.holeMode === 'none' || settings.holeR <= 0;
    if ((e.shiftKey || noHole) && settings.shape !== 'lines') drag = 'centre';
    else if (Math.hypot(x - cx, y - cy) < HIT_MM &&
             Math.hypot(x - cx, y - cy) < Math.hypot(x - hx, y - hy) &&
             settings.shape !== 'lines' && !settings.holeLinked) drag = 'centre';
    else drag = 'hole';
    c.classList.add('dragging');
    c.setPointerCapture(e.pointerId);
    moveHandle(x, y);
    e.preventDefault();
  });

  c.addEventListener('pointermove', e => {
    if (!drag) return;
    const [x, y] = paperPoint(e);
    moveHandle(x, y);
    e.preventDefault();
  });

  const end = e => {
    if (!drag) return;
    drag = null;
    c.classList.remove('dragging');
    update();
    if (e) e.preventDefault();
  };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', end);

  c.addEventListener('wheel', e => {
    if (settings.holeMode === 'none') return;
    const r = clamp(settings.holeR - e.deltaY * WHEEL_MM, 0, 400);
    settings.holeR = +r.toFixed(1);
    if (setters.holeR) setters.holeR(settings.holeR);
    liveUpdate();
    e.preventDefault();
  }, { passive: false });
}

function moveHandle(x, y) {
  const u = clamp((x - area.x0) / Math.max(1e-6, area.w) * 100, -50, 150);
  const v = clamp((y - area.y0) / Math.max(1e-6, area.h) * 100, -50, 150);
  if (drag === 'centre' || (drag === 'hole' && settings.holeLinked)) {
    settings.centreU = +u.toFixed(2);
    settings.centreV = +v.toFixed(2);
    if (setters.centreU) { setters.centreU(settings.centreU); setters.centreV(settings.centreV); }
  }
  if (drag === 'hole' && !settings.holeLinked) {
    settings.holeU = +u.toFixed(2);
    settings.holeV = +v.toFixed(2);
    if (setters.holeU) { setters.holeU(settings.holeU); setters.holeV(settings.holeV); }
  }
  liveUpdate();
}

function attachKeys() {
  window.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === 'r' || e.key === 'R') {
      settings.seed = Math.floor(Math.random() * 100000);
      if (setters.seed) setters.seed(settings.seed);
      update();
      e.preventDefault();
    } else if (e.key === '[' || e.key === ']') {
      settings.seed = Math.max(0, Math.round(settings.seed) + (e.key === ']' ? 1 : -1));
      if (setters.seed) setters.seed(settings.seed);
      update();
      e.preventDefault();
    } else if (e.key === 'g' || e.key === 'G') {
      settings.showGuides = !settings.showGuides;
      if (setters.showGuides) setters.showGuides(settings.showGuides);
      drawPreview();
      syncUrl();
      e.preventDefault();
    }
  });
}

////////////////////////////////////////////////////////////////////////////////////////
// The sidebar

function addSection(parent, title) {
  createDiv(title).parent(parent).class('section');
}

function setVisible(key, on) {
  if (fieldDivs[key]) fieldDivs[key].style('display', on ? '' : 'none');
}

function syncVisibility() {
  const radial = settings.shape !== 'lines';
  const spiral = settings.shape === 'spiral';
  const pens = Math.round(clamp(settings.pens, 1, MAX_PENS));

  setVisible('cropMarkGap', settings.cropMarks);
  setVisible('angle', settings.shape === 'lines');
  setVisible('centreU', radial);
  setVisible('centreV', radial);
  setVisible('radius0', radial);
  setVisible('radius1', radial);
  setVisible('span', radial && !spiral);
  setVisible('spanFrom', radial && !spiral);
  setVisible('falloffPower', settings.falloff !== 'even');
  const filling = settings.fillRegion !== 'none';
  const blankFill = blankRegion();
  setVisible('holeR', settings.holeMode !== 'none' || (filling && !blankFill));
  setVisible('holeLinked', (settings.holeMode !== 'none' || filling) && radial);
  setVisible('holeU', (settings.holeMode !== 'none' || filling) &&
                      (!settings.holeLinked || !radial));
  setVisible('holeV', (settings.holeMode !== 'none' || filling) &&
                      (!settings.holeLinked || !radial));
  setVisible('holeSoft', settings.holeMode === 'push');
  setVisible('holeOutline', settings.holeMode !== 'none');
  setVisible('fillPen', filling);
  setVisible('fillStyle', filling && !blankFill);
  setVisible('fillAngle', filling && (blankFill || settings.fillStyle === 'hatch'));
  setVisible('fillGap', filling);
  setVisible('fillInset', filling);
  setVisible('fillBand', filling && settings.fillRegion === 'a ring around it');
  setVisible('fillGrid', blankFill);
  setVisible('fillMinPatch', settings.fillRegion === 'every blank patch');
  setVisible('fillColor', filling);
  setVisible('penSplit', pens > 1);
  setVisible('ink1', pens > 1);
  setVisible('ink2', pens > 2);
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

  const refresh = () => { if (redrawOnly) { drawPreview(); syncUrl(); } else update(); };
  setters[key] = v => { sl.value(v); num.value(String(v)); };

  sl.input(() => {
    settings[key] = Number(sl.value());
    num.value(String(settings[key]));
    if (redrawOnly) drawPreview(); else liveUpdate();
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
    if (redrawOnly) { drawPreview(); syncUrl(); } else update();
  });
  return cb;
}

function addColor(parent, labelText, key) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const cp = createColorPicker(settings[key]).parent(field);
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
  createDiv('Every thread of the family reads the same field, so one number decides the ' +
    'whole sheet. <b>R</b> rolls a new one, <b>[</b> and <b>]</b> step through them.')
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

  addSection(root, 'Scenes');
  const scenes = createDiv('').parent(root).class('btn-row');
  for (const sc of SCENES) {
    createButton(sc.name).parent(scenes).mousePressed(() => applyScene(sc));
  }

  // --- Pen ---
  addSection(root, 'Pen');
  addSlider(root, 'Pen width (mm)', 'penWidth', 0.05, 2, 0.05,
    'The nib. It sets the line the preview and the SVG draw with, and it is taken off ' +
    'the margin so ink never reaches past it.');
  addSlider(root, 'Pens', 'pens', 1, MAX_PENS, 1,
    'Split the family between two or three colours — one pass of the plotter each.');
  addSelect(root, 'Split', 'penSplit', PEN_SPLITS, update,
    '<b>bands</b> — contiguous groups, which for rings is concentric belts.<br>' +
    '<b>interleaved</b> — thread by thread, so the colours weave.<br>' +
    '<b>by fold</b> — by how far the field moved that thread, so one pen draws the ' +
    'creases and another the calm.');
  addColor(root, 'Ink', 'ink0');
  addColor(root, 'Second pen', 'ink1');
  addColor(root, 'Third pen', 'ink2');

  // --- Paper ---
  addSection(root, 'Paper');
  addSelect(root, 'Size', 'paper', Object.keys(PAPER_SIZES), resizeForPaper);
  addSelect(root, 'Orientation', 'orientation', ['portrait', 'landscape'], resizeForPaper);
  addSlider(root, 'Margin (mm)', 'margin', 0, 60, 1);
  addCheckbox(root, 'Cut guide dots around the sheet', 'cropMarks');
  addSlider(root, 'Most between two dots (mm)', 'cropMarkGap', 20, 600, 5,
    'A dot in every corner, and each side split evenly so no gap is wider than this — ' +
    'lay a ruler through two dots and cut.');

  // --- The family ---
  addSection(root, 'Family');
  addSelect(root, 'Threads', 'shape', SHAPES, () => { syncVisibility(); update(); },
    '<b>rings</b> — circles about a centre, which is what the folded veil is made of.<br>' +
    '<b>lines</b> — a ruling across the sheet, which folds into cloth.<br>' +
    '<b>spiral</b> — one thread for the whole sheet, so the plot is a single stroke.<br>' +
    '<b>spokes</b> — out from the centre, which the field combs sideways.');
  addSlider(root, 'Thread spacing (mm)', 'spacing', 0.2, 10, 0.05,
    'How far apart the threads sit before the field touches them. Below about twice the ' +
    'nib the calm parts of the sheet will fill in solid.');
  addSlider(root, 'Step along a thread (mm)', 'step', 0.1, 4, 0.05,
    'How finely a thread is sampled. It has to be well under the feature size or the ' +
    'folds come out as corners.');
  addSlider(root, 'Ruling angle (°)', 'angle', 0, 180, 1);
  addSlider(root, 'Centre across (%)', 'centreU', -20, 120, 0.5);
  addSlider(root, 'Centre down (%)', 'centreV', -20, 120, 0.5);
  addSlider(root, 'Inner radius (mm)', 'radius0', 0, 200, 0.5,
    'The family starts here. Anything the hole is going to take out anyway is worth not ' +
    'drawing in the first place.');
  addSlider(root, 'Outer radius (mm)', 'radius1', 0, 900, 1,
    'Where it stops. At 0 it runs out past the far corner of the sheet with room to ' +
    'spare, so the field always has material to drag inwards.');
  addSlider(root, 'Fan (°)', 'span', 10, 360, 1,
    'Less than a full turn leaves a sector of bare paper.');
  addSlider(root, 'Fan starts at (°)', 'spanFrom', 0, 360, 1);

  // --- The warp ---
  addSection(root, 'Warp');
  addSeedField(root);
  addSlider(root, 'Feature size (mm)', 'feature', 5, 400, 1,
    'How far apart the swells of the field sit. Large is a few broad folds, small is ' +
    'a rumple.');
  addSlider(root, 'Push (mm)', 'amount', 0, 200, 0.5,
    'How far a point is moved at full strength. Once this passes the feature size the ' +
    'threads start crossing themselves and the veil turns to smoke.');
  addSlider(root, 'Folds', 'folds', 1, 3, 1,
    'How many times the field is looked up at a place it has already moved you to. ' +
    '<b>1</b> swells, <b>2</b> folds — the veil — and <b>3</b> crumples.');
  addSlider(root, 'Fold depth', 'foldGain', 0, 8, 0.1,
    'How hard one fold feeds into the next. At 0 the folds do nothing and the push is ' +
    'a plain swell; the creases sharpen the further up this goes.');
  addSlider(root, 'Octaves', 'octaves', 1, 6, 1,
    'Detail piled on the field itself — each octave is half the size and, below, a ' +
    'share of the height.');
  addSlider(root, 'Roughness', 'roughness', 0.1, 0.9, 0.05);
  addSlider(root, 'Drift (%)', 'drift', 0, 20, 0.02,
    'How far the field moves on from one thread to the next, and the single number that ' +
    'decides whether this is a fabric or a fog. At <b>0</b> every thread is pushed by ' +
    'the same map and the family stays one warped surface. Under <b>1</b> the threads ' +
    'hold together as veils that fold and hang over one another — which is nearly all ' +
    'of the range worth having. Past <b>3</b> they come apart into smoke.');
  addSlider(root, 'Swirl (°)', 'swirl', 0, 180, 1,
    'The push is turned by this much. At <b>0</b> it spreads and gathers the threads; ' +
    'at <b>90</b> it runs along the ridges instead and sweeps them sideways without ' +
    'pulling them apart.');
  addSelect(root, 'Strength', 'falloff', FALLOFFS, () => { syncVisibility(); update(); },
    'Whether the push is the same everywhere, or grows away from the centre — calm in ' +
    'the middle, wild at the edges — or the other way about.');
  addSlider(root, 'Strength curve', 'falloffPower', 0.1, 4, 0.05,
    'How sharply it changes. 1 is a straight ramp; higher holds the quiet part quiet ' +
    'for longer.');

  // --- The hole ---
  addSection(root, 'Hole');
  addSelect(root, 'Middle', 'holeMode', HOLE_MODES, () => { syncVisibility(); update(); },
    '<b>cut</b> — every thread that runs into the disc ends on it, leaving a clean ' +
    'circle of bare paper.<br><b>push</b> — nothing is thrown away: what was inside is ' +
    'squeezed out into a band around the rim and piles up dark.');
  addSlider(root, 'Radius (mm)', 'holeR', 0, 400, 0.5,
    'The wheel over the sheet resizes it.');
  addSlider(root, 'Rim band (mm)', 'holeSoft', 0, 80, 0.5,
    'How wide a band the pushed-out material is spread over. At 0 all of it lands on ' +
    'the rim itself, which comes out as a solid black circle.');
  addCheckbox(root, 'The hole sits where the family is centred', 'holeLinked');
  addSlider(root, 'Hole across (%)', 'holeU', -20, 120, 0.5);
  addSlider(root, 'Hole down (%)', 'holeV', -20, 120, 0.5);
  addCheckbox(root, 'Draw the rim', 'holeOutline');

  // --- The fill ---
  addSection(root, 'Fill');
  addSelect(root, 'Lay colour over', 'fillRegion', FILL_REGIONS,
    () => { syncVisibility(); update(); },
    'A second pass in a pen of its own — plotted on its own, and exported on its own if ' +
    'you ask for a file per pen.<br>' +
    '<b>the blank round the disc</b> — not a shape but whatever paper the veils actually ' +
    'left empty: the hole together with the white it opens into, found by flooding out ' +
    'from the middle of the hole until it runs into ink.<br>' +
    '<b>every blank patch</b> — the same, started everywhere at once, so every gap the ' +
    'veils left is coloured in.<br>' +
    '<b>the disc</b> — the hole as a circle, whatever the veils are doing.<br>' +
    '<b>a ring around it</b> — a band just outside the rim.<br>' +
    '<b>everything outside it</b> — the whole sheet but the disc. That is a lot of ' +
    'paper: watch the length it reports before you start it.');
  addSlider(root, 'Fill nib (mm)', 'fillPen', 0.1, 6, 0.05,
    'The pen that does the filling, which wants to be the thickest one in the drawer. ' +
    'It sets both the spacing of the passes and the stroke width in the file, and a ' +
    '1 mm nib covers five times the paper a 0.2 mm one does for the same length of line.');
  addSelect(root, 'Laid down as', 'fillStyle', FILL_STYLES,
    () => { syncVisibility(); update(); },
    '<b>spiral</b> — one stroke for the whole area, so the pen goes down once.<br>' +
    '<b>rings</b> — one closed stroke per turn.<br>' +
    '<b>hatch</b> — straight lines across it, cut at the edge.');
  addSlider(root, 'Hatch angle (°)', 'fillAngle', 0, 180, 1);
  addSlider(root, 'Pass spacing (% of the nib)', 'fillGap', 20, 200, 1,
    'At 100 % two passes of the nib just touch and the paper between them is left. ' +
    'Below that they overlap, which is what makes it read as solid; 80–90 % is the ' +
    'usual answer for a fibre tip, less for anything that skips.');
  addSlider(root, 'Keep clear (mm)', 'fillInset', -10, 20, 0.5,
    'How far the fill stops short of what it is filling up to — the rim of the hole, or ' +
    'every line of the veils when it is the blank paper being coloured — so a thick nib ' +
    'does not paint over them. Negative runs it under them instead.');
  addSlider(root, 'Ring width (mm)', 'fillBand', 1, 200, 1);
  addSlider(root, 'Blank measured at (mm)', 'fillGrid', 0.15, 4, 0.05,
    'The cell the empty paper is found on. Finer follows the edge of the veils more ' +
    'closely and costs more to work out; half the fill nib is plenty, since the nib is ' +
    'wider than the error.');
  addSlider(root, 'Smallest patch (mm²)', 'fillMinPatch', 0, 2000, 10,
    'A gap smaller than this is left alone — not worth putting the pen down for.');
  addColor(root, 'Fill ink', 'fillColor');

  // --- Output ---
  addSection(root, 'Output');
  addSlider(root, 'Simplify (mm)', 'simplifyTol', 0, 0.5, 0.01,
    'How far a thinned thread may stray from the sampled one. A little of this takes a ' +
    'large bite out of the file and the plot time and cannot be seen on paper.');
  addCheckbox(root, 'Order the strokes for the plotter', 'optimiseOrder');
  addCheckbox(root, 'Follow the sliders live', 'liveUpdate');
  addCheckbox(root, 'Show the handles', 'showGuides', true);
  addSelect(root, 'SVG', 'svgOutput', SVG_OUTPUTS, () => syncUrl(),
    'With more than one pen, a file per colour is one plot each.');

  createButton('Export SVG').parent(root).class('primary').mousePressed(exportSvg);
  const row = createDiv('').parent(root).class('btn-row');
  createButton('Copy link').parent(row).mousePressed(function () { copyLink(this); });
  createButton('Reset').parent(row).mousePressed(resetAll);

  addSection(root, 'The sheet');
  statsDiv = createDiv('').parent(root).class('stats');
  penListDiv = createDiv('').parent(root).class('stats');
  const keys = createDiv('').parent(root).class('note keys');
  keys.html(
    '<div><kbd>drag</kbd> move the hole · <kbd>shift</kbd>+<kbd>drag</kbd> the centre</div>' +
    '<div><kbd>wheel</kbd> hole radius · <kbd>R</kbd> new seed · ' +
    '<kbd>[</kbd> <kbd>]</kbd> step it · <kbd>G</kbd> handles</div>');
  linkDiv = createDiv('').parent(root).class('link');

  syncVisibility();
}

// One row per plot pass, since each is a separate sitting at the plotter with a
// different pen in the holder.
function refreshPenList() {
  if (!penListDiv) return;
  const pens = Math.round(clamp(settings.pens, 1, MAX_PENS));
  const showFill = fillOn() && fillStat && fillStat.strokes;
  if ((pens < 2 && !showFill) || !perPen) { penListDiv.html(''); return; }

  const row = (colour, name, st, ink, nib) =>
    `<div class="pen-row"><span class="sw" style="background:${colour}"></span>` +
    `<span>${name} — <b>${groupNum(st)}</b> strokes, <b>${(ink / 1000).toFixed(1)}</b> m ` +
    `of ${nib} mm, ${formatDuration(st * PEN_CYCLE_S + ink / DRAW_SPEED)}</span></div>`;

  let html = '';
  if (showFill) {
    html += row(settings.fillColor, 'fill', fillStat.strokes, fillStat.ink, settings.fillPen);
  }
  for (let i = 0; i < pens; i++) {
    const p = perPen[i] || { strokes: 0, ink: 0 };
    if (!p.strokes) continue;
    html += row(inkColor(i), pens > 1 ? 'pen ' + (i + 1) : 'veils',
                p.strokes, p.ink, settings.penWidth);
  }
  penListDiv.html(html);
}

////////////////////////////////////////////////////////////////////////////////////////
// What the sheet costs

function sheetArea() {
  const [W, H] = paperDims();
  return W * H;
}

function updateStats() {
  if (!statsDiv) return;

  if (!area || area.w <= 0 || area.h <= 0) {
    statsDiv.html(`<div class="warn">The margin leaves nothing to draw on. ` +
      `Lower it, or use larger paper.</div>`);
    refreshPenList();
    return;
  }

  if (lastPoints > MAX_POINTS) {
    statsDiv.html(
      `<div class="warn">${groupNum(lastPoints)} points to warp — past the ` +
      `${groupNum(MAX_POINTS)} limit, so nothing was drawn.<br>Widen the thread ` +
      `spacing, coarsen the step, or pull the outer radius in.</div>`);
    refreshPenList();
    return;
  }

  if (!plan || !shapes) {
    statsDiv.html(
      `<div class="warn">${groupNum(strokes)} strokes — past the ${groupNum(MAX_STROKES)} ` +
      `limit, so nothing was ordered or drawn.<br>Widen the thread spacing or raise the ` +
      `simplify tolerance.</div>`);
    refreshPenList();
    return;
  }

  const seconds = strokes * PEN_CYCLE_S + plan.ink / DRAW_SPEED + plan.travel / TRAVEL_SPEED;
  const fs = (fillOn() && fillStat) ? fillStat : { strokes: 0, ink: 0 };
  const lineInk = plan.ink - fs.ink;
  // Every pass covers paper at its own nib width, so the two are weighed separately.
  const cover = clamp((lineInk * settings.penWidth +
                       fs.ink * Math.max(0.05, settings.fillPen)) / sheetArea(), 0, 1);
  const pts = shapes.off[shapes.off.length - 1];

  let html =
    `<div class="big"><b>${groupNum(strokes - fs.strokes)}</b> strokes, ` +
    `<b>${(lineInk / 1000).toFixed(1)}</b> m of ${settings.penWidth} mm line` +
    `${fs.strokes ? ` · fill <b>${(fs.ink / 1000).toFixed(1)}</b> m of ` +
      `${settings.fillPen} mm` : ''}</div>` +
    `<div>${groupNum(pts)} points after thinning, ` +
    `${groupNum(lastPoints)} warped to get them</div>` +
    `<div>Pen up for ${(plan.travel / 1000).toFixed(1)} m between strokes</div>` +
    `<div>Ink covers <b>${(100 * cover).toFixed(0)} %</b> of the sheet</div>` +
    `<div>Roughly <b>${formatDuration(seconds)}</b> to plot · ${lastMs.toFixed(0)} ms to build</div>`;

  // The nib is wider than the gaps the calm parts of the sheet are left with, so those
  // parts will come out as solid ink rather than as lines.
  if (settings.spacing < 2 * settings.penWidth) {
    html += `<div class="warn">Threads sit ${settings.spacing} mm apart and the nib is ` +
      `${settings.penWidth} mm: wherever the field leaves them alone they will run ` +
      `together into solid ink. Two nib widths — ${(2 * settings.penWidth).toFixed(2)} mm ` +
      `— is where lines stay lines.</div>`;
  }
  if (cover > 0.55) {
    html += `<div class="warn">${(100 * cover).toFixed(0)} % of the sheet ends up under ` +
      `ink. Thin paper will cockle and the nib will run dry — widen the spacing or take ` +
      `a finer nib.</div>`;
  }
  if (fs.strokes && blank) {
    const mm2 = blank.cells * blank.g * blank.g;
    html += `<div>The fill found <b>${(mm2 / 100).toFixed(0)} cm²</b> of blank paper, ` +
      `<b>${(100 * mm2 / sheetArea()).toFixed(0)} %</b> of the sheet</div>`;
  }
  if (blankRegion() && !blank) {
    html += `<div class="warn">No blank paper to fill — ` +
      `${settings.fillRegion === 'every blank patch'
        ? 'every gap is smaller than the smallest patch, or the veils cover the sheet'
        : 'the middle of the hole is under ink. Cut a hole, or move it somewhere empty'}` +
      `.</div>`;
  }
  if (fs.strokes && settings.fillGap > 100) {
    html += `<div class="warn">The fill lays its passes ${settings.fillGap} % of a nib ` +
      `apart, so they never meet and the area will come out striped rather than solid. ` +
      `Under 100 % is what covers paper.</div>`;
  }
  if (fs.ink / DRAW_SPEED > 3600) {
    html += `<div class="warn">The fill alone is ` +
      `${formatDuration(fs.strokes * PEN_CYCLE_S + fs.ink / DRAW_SPEED)} of drawing. ` +
      `A thicker nib is the only cheap way out — the length falls off with the square ` +
      `of it.</div>`;
  }
  if (strokes > BUSY_STROKES) {
    html += `<div class="warn">${groupNum(strokes)} strokes is a long sitting at the ` +
      `plotter. The hole cuts threads into pieces, so a smaller hole or fewer folds ` +
      `buys a lot of pen-up time back.</div>`;
  }
  if (lastPoints > BUSY_POINTS) {
    html += `<div class="dim">Too much to follow a slider live — dragging waits for the ` +
      `mouse to come up.</div>`;
  }
  if (settings.step > settings.feature / 12) {
    html += `<div class="warn">The step along a thread is ${settings.step} mm against a ` +
      `feature size of ${settings.feature} mm. The folds will come out as corners; ` +
      `${(settings.feature / 20).toFixed(2)} mm or under is safe.</div>`;
  }

  statsDiv.html(html);
  refreshPenList();
}

////////////////////////////////////////////////////////////////////////////////////////
// SVG
//
// One group per pen, no fills, no background rectangle — everything in the file is meant
// to be plotted. stroke-width is the pen width and the caps are round, so the file
// previews exactly as the finished plot looks. Strokes come out in the order the pen
// should visit them, each already flipped to the end it should be entered from, and the
// link that rebuilds the sheet is written into the header comment.

function metaComment() {
  const s = settings;
  const geom = s.shape === 'lines'
    ? `${s.angle}°`
    : `centre=${s.centreU},${s.centreV}% r=${s.radius0}-${s.radius1 || 'edge'}` +
      `${s.span < 360 ? ' fan=' + s.spanFrom + '+' + s.span + '°' : ''}`;
  const hole = s.holeMode === 'none' ? 'none'
    : `${s.holeMode}/${s.holeR}mm` +
      `${s.holeMode === 'push' ? '/band' + s.holeSoft + 'mm' : ''}` +
      `${s.holeLinked ? '' : '@' + s.holeU + ',' + s.holeV + '%'}` +
      `${s.holeOutline ? '/rim' : ''}`;

  return `noise veils — ` +
    `${s.shape} ${geom} spacing=${s.spacing}mm step=${s.step}mm ` +
    `seed=${s.seed} feature=${s.feature}mm push=${s.amount}mm ` +
    `folds=${s.folds}@${s.foldGain} oct=${s.octaves}/${s.roughness} ` +
    `drift=${s.drift}% swirl=${s.swirl}° ` +
    `strength=${s.falloff}${s.falloff === 'even' ? '' : '^' + s.falloffPower} ` +
    `hole=${hole} ` +
    `pens=${s.pens}${s.pens > 1 ? '/' + s.penSplit : ''} ` +
    `fill=${s.fillRegion === 'none' ? 'none'
      : `${s.fillRegion}/${s.fillStyle}/${s.fillPen}mm@${s.fillGap}%` +
        `${s.fillRegion === 'a ring around it' ? '/band' + s.fillBand + 'mm' : ''}` +
        `${s.fillStyle === 'hatch' ? '/' + s.fillAngle + '°' : ''}` +
        `/inset${s.fillInset}mm@${s.fillColor}`} ` +
    `simplify=${s.simplifyTol}mm ` +
    `${s.cropMarks ? 'cropmarks<=' + s.cropMarkGap + 'mm ' : ''}` +
    `pen=${s.penWidth}mm strokes=${strokes}`;
}

// The strokes of one pen, in plot order, as one <g>.
function svgGroup(keep, colour, width) {
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
    body: `<g fill="none" stroke="${colour}" stroke-width="${f(width)}" ` +
      `stroke-linecap="round" stroke-linejoin="round">\n${body}</g>\n`,
  };
}

// The passes this sheet actually needs, in the order the plotter should run them: the
// fill first, so the thick colour goes down and the veils are drawn over it, then a pass
// per pen that has anything to draw. Each carries its own nib, which is the whole reason
// the fill is a pass and not just another colour.
function passList() {
  const out = [];
  if (fillOn() && fillStat && fillStat.strokes) {
    out.push({ tag: 'fill', colour: settings.fillColor, width: Math.max(0.05, settings.fillPen),
               keep: i => shapes.ink[i] === INK_FILL });
  }
  const pens = Math.round(clamp(settings.pens, 1, MAX_PENS));
  for (let i = 0; i < pens; i++) {
    if (!perPen || !perPen[i] || !perPen[i].strokes) continue;
    out.push({ tag: pens > 1 ? 'pen' + (i + 1) : 'veils', colour: inkColor(i),
               width: settings.penWidth, keep: j => shapes.ink[j] === i });
  }
  return out;
}

// The whole sheet, or one pass of it. The cut guides are in every file — they are what
// lines the passes up on the paper.
function svgFile(pass) {
  const [W, H] = paperDims();
  const list = pass ? [pass] : passList();
  const groups = [];

  if (settings.cropMarks) {
    groups.push([i => shapes.ink[i] === INK_MARK,
                 (list[0] && list[0].colour) || '#000000', settings.penWidth]);
  }
  for (const p of list) groups.push([p.keep, p.colour, p.width]);

  let body = '', count = 0;
  for (const [keep, col, width] of groups) {
    const g = svgGroup(keep, col, width);
    if (!g) continue;
    body += g.body;
    count += g.count;
  }
  if (!count) return null;

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- ${metaComment()}${pass ? ' pass=' + pass.tag + '@' + pass.width + 'mm' : ''} -->\n` +
    `<!-- ${location.origin === 'null' ? '' : location.origin}${location.pathname}` +
    `#${encodeState()} -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n` +
    body +
    `</svg>\n`;
}

function exportSvg() {
  if (!shapes || !plan || !strokes) {
    alert('Nothing to export — the family is not drawing anything on this sheet.');
    return;
  }

  const list = passList();
  const out = settings.svgOutput;
  const parts = out === 'one file' ? [null]
    : out === 'one file per pen' ? list
    : [null, ...list];

  const stem = `veils ${settings.shape} seed${settings.seed} ` +
    `${settings.paper}-${settings.orientation}`;
  const stamp = timestamp();

  for (const pass of parts) {
    const svg = svgFile(pass);
    if (!svg) continue;
    const tag = pass ? ` ${pass.tag} pen${pass.width}` : ` pen${settings.penWidth}`;
    saveStrings([svg], `${stem}${tag} ${stamp}`, 'svg');
  }
}
