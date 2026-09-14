////////////////////////////////////////////////////////////////////////////////////////
// Wave interference — ripples from a handful of drops, drawn as families of lines
//
// A few drops land on still water. Each one sends a ring of ripples out from where it
// hit; where two rings cross, the water simply adds up — crest on crest stands twice as
// high, crest on trough cancels to nothing. That sum, read at every point of the sheet,
// is the whole drawing.
//
// One drop, t seconds after it landed, read at distance r from where it fell:
//
//     h(r) = power · envelope(r − c·t) · decay(r) · cos( 2π·(r − c·t)/λ + φ )
//
// c is the speed of the ripples, so c·t is how far the leading ring has got by now. The
// envelope is a packet riding on that ring: a long tail of ripples behind it, a short
// lead in front. A drop marked *continuous* is not a drop at all but a finger held in
// the water — its packet has no tail, everything inside the ring keeps moving.
//
// Every drop is a lookup table of h against r, built once and read with a lerp, so the
// inner loop that sums the water is a square root and an addition per drop. Reflections
// off the edge of the sheet are mirror copies of the drop sharing its table.
//
// The sum is divided by the tallest water on the sheet and then read through a curve —
// contrast and crest boost — which decides how much of the drawing's height goes to the
// crests and how much to the ripples between them. That curve is the difference between
// a taller drawing and a more dramatic one.
//
// The sheet is drawn by laying families of parallel lines over that surface. A line is
// walked from one edge of the drawable box to the other and pushed sideways by the water
// under it, so a straight ruled line comes out as the profile of the wave it crosses.
// The same family can instead be cut into pieces — keeping only the crests, only the
// troughs, or only the still water along the nodal curves where two drops cancel each
// other out. Up to four families are drawn over one another, each with its own angle,
// spacing, colour and its own moment in time; two families at different angles weave a
// moiré that reads as the surface itself. A family can also be drawn as contour lines,
// the level curves of the water, which is the same picture with the ruling taken away.
//
// Drops are placed with the mouse: click the water to drop one, drag it about, right
// click it to take it away. Everything else lives in the sidebar and in the URL, so a
// plot is reproduced by pasting its link.
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};

const LAYERS = 4;                          // as many families as a plotter has pens
const STYLES = ['lines', 'contours', 'rings'];

// What a gated family keeps. Every gate is written so that a point is drawn when its
// gate value is positive, which makes one interpolation good for all of them.
//
// The peaks are measured against full deflection: only water that actually stands high
// is kept. A node cannot be read that way — still water is still whether two ripples are
// cancelling there or none has arrived at all — so it is measured against `e`, the
// height the water at that point could reach if everything passing through it lined up.
// A node is where the water stays far below what it has to work with, and dead water,
// with nothing to work with, is not a node.
const GATES = ['none', 'crests', 'troughs', 'both peaks', 'nodes'];
const NODE_FLOOR = 0.04;     // of full deflection — below this the water is simply dead
const GATE_FN = {
  'none':       (v, t, e) => 1,
  'crests':     (v, t, e) => v - t,
  'troughs':    (v, t, e) => -v - t,
  'both peaks': (v, t, e) => Math.abs(v) - t,
  'nodes':      (v, t, e) => Math.min(t * e - Math.abs(v), e - NODE_FLOOR),
};
const GATE_NEEDS_ENVELOPE = { nodes: true };

const INK_MARK = -1;                       // cut guides: drawn with every pen

const MAX_STROKES    = 400_000;   // past this nothing is ordered, drawn or exported
const BUSY_STROKES   = 80_000;    // above this, warn about the plot time
const MAX_SAMPLES    = 14e6;      // field lookups one update is allowed to ask for
const BUSY_SAMPLES   = 3.5e6;     // above this, dragging stops following live
const EPS            = 0.01;      // mm — the stub that stands in for a single dot
const PROF_DR        = 0.1;       // mm per step of a drop's radial lookup table
const PEAK_STEP      = 1.2;       // mm — grid the field's peak is measured on
const FIELD_RASTER   = 420;       // longest side of the water preview image
const PREVIEW_MAX_PX = 1500;      // preview canvas resolution (paper is in mm)
const MAX_PREVIEW_W  = 900;       // on-screen size of that canvas
const MAX_PREVIEW_H  = 700;
const LIVE_BUDGET_MS = 150;       // slower than this and a drag waits for the release
const HIT_MM         = 4.5;       // how close the cursor has to be to grab a drop
const MAX_DROPS      = 64;
const MAX_RINGS      = 20_000;    // per centre, however small the spacing is asked to be
const PEN_CYCLE_S    = 0.3;       // rough pen-up + pen-down time, seconds
const DRAW_SPEED     = 60;        // rough drawing speed, mm/s
const TRAVEL_SPEED   = 150;       // rough pen-up travel speed, mm/s

const settings = {
  // paper + pen
  paper: 'A4',
  orientation: 'portrait',
  margin: 12,
  penWidth: 0.5,

  // cut guides — dots on the edge of the sheet, for trimming an oversized plot back
  cropMarks: false,
  cropMarkGap: 400,     // mm — the most that is ever left between two marks

  // the water
  speed: 60,            // mm/s — how fast a ring travels outwards
  time: 0,              // s — added to the age of every drop at once
  phase: 0,             // deg — slides the ripples without moving the rings
  train: 6,             // wavelengths of ripples trailing behind the ring
  lead: 0.7,            // wavelengths of ripples running ahead of it
  halfDist: 600,        // mm — distance over which a ripple loses half its height
  spreading: true,      // a ring spread over a longer circumference is lower
  bounces: 0,           // reflections off the edge of the sheet, as mirrored drops
  hardWall: false,      // a hard wall turns a crest into a trough on the way back

  // reading the sum — how the height of the water becomes movement on the page
  autoGain: true,       // scale the tallest water on the sheet to full deflection
  gain: 1,
  contrast: 1,          // >1 holds the small ripples down and leaves the crests standing
  crestBoost: 0,        // 0 … 1 — crests towards full deflection, troughs flattened

  // how the lines are walked
  sampleStep: 0.4,      // mm between samples along a line
  simplifyTol: 0.04,    // mm — how far a simplified line may stray from the sampled one
  contourRes: 0.6,      // mm — the grid the contour layers are traced on

  // view + output
  showField: true,
  fieldOpacity: 22,
  showDrops: true,
  optimiseOrder: true,
  liveUpdate: true,
  svgOutput: 'one file',
};

// The four families. Flattened into `settings` below as L0angle, L1spacing … so that the
// URL, the sliders and the reset all reach them the same way everything else is reached.
// The four are identical in what they can do — only their starting values differ, so
// that switching one on gives a different picture rather than a second copy of the first.
const RING_DEFAULTS = {
  ringEach: true,       // a set around every drop, rather than around one point
  ringU: 50,            // that one point, as a percentage across the drawable box
  ringV: 50,
  ringR0: 0,            // mm — the innermost ring
  ringR1: 0,            // mm — the outermost, 0 for as far as the sheet reaches
  ringGrow: 0,          // % — how much wider each gap is than the one before it
  ringAngle: 0,         // deg — where a sector starts
  ringSpan: 360,        // deg — how much of the circle is drawn
  ringSpiral: false,    // one continuous spiral instead of separate rings
};
const LAYER_DEFAULTS = [
  { on: true,  color: '#12306e', style: 'lines', angle: 0,  spacing: 3.2, amp: 2.4,
    gate: 'none', thresh: 0.3, dt: 0, levels: 10, ...RING_DEFAULTS },
  { on: true,  color: '#b23a00', style: 'lines', angle: 90, spacing: 3.2, amp: 2.4,
    gate: 'none', thresh: 0.3, dt: 0, levels: 10, ...RING_DEFAULTS },
  // the green pen starts out as the rings around every splash
  { on: false, color: '#1a7f37', style: 'rings', angle: 45, spacing: 3.2, amp: 2.4,
    gate: 'none', thresh: 0.3, dt: 0, levels: 10, ...RING_DEFAULTS },
  // and the black one as the still water between them
  { on: false, color: '#000000', style: 'lines', angle: 90, spacing: 1.4, amp: 0,
    gate: 'nodes', thresh: 0.12, dt: 0, levels: 10, ...RING_DEFAULTS },
];
const LAYER_KEYS = Object.keys(LAYER_DEFAULTS[0]);
for (let i = 0; i < LAYERS; i++) {
  for (const k of LAYER_KEYS) settings[LK(i, k)] = LAYER_DEFAULTS[i][k];
}

// Drops are held in fractions of the drawable box rather than in millimetres, so that a
// composition survives a change of paper, of margin or of orientation.
const DEFAULT_DROPS = [
  { u: 0.30, v: 0.30, power: 1,    age: 2.2, wavelength: 10, cont: false },
  { u: 0.72, v: 0.44, power: 0.85, age: 1.6, wavelength: 10, cont: false },
  { u: 0.44, v: 0.76, power: 0.8,  age: 1.0, wavelength: 10, cont: false },
];

// Whole-sketch presets: the water, the drops and the families together.
const SCENES = [
  { label: '— select scene —' },
  { label: 'Three drops, woven', s: {}, d: DEFAULT_DROPS },
  { label: 'Two sources, standing', s: {
      speed: 60, time: 0, train: 30, halfDist: 1200, L0angle: 0, L0spacing: 2.8,
      L0amp: 2.2, L1on: true, L1angle: 90, L1spacing: 2.8, L1amp: 2.2,
    }, d: [
      { u: 0.32, v: 0.5, power: 1, age: 6, wavelength: 12, cont: true },
      { u: 0.68, v: 0.5, power: 1, age: 6, wavelength: 12, cont: true },
    ] },
  { label: 'Nodal curves alone', s: {
      train: 30, halfDist: 1500, L0on: false, L1on: false,
      L3on: true, L3angle: 0, L3spacing: 1.1, L3amp: 0, L3gate: 'nodes', L3thresh: 0.12,
      showField: true, fieldOpacity: 14,
    }, d: [
      { u: 0.3, v: 0.36, power: 1, age: 7, wavelength: 14, cont: true },
      { u: 0.7, v: 0.36, power: 1, age: 7, wavelength: 14, cont: true },
      { u: 0.5, v: 0.78, power: 1, age: 7, wavelength: 14, cont: true },
    ] },
  // A tank is one source and the eight mirror copies of it the walls put there. The
  // standing pattern that comes out is far finer than a ruling can follow, so this one
  // is drawn as contours.
  { label: 'One source in a tank', s: {
      speed: 90, time: 0, train: 8, bounces: 1, halfDist: 900,
      L0style: 'contours', L0levels: 9, L1on: false,
    }, d: [{ u: 0.3, v: 0.26, power: 1, age: 4.5, wavelength: 16, cont: true }] },
  { label: 'Contours of a late splash', s: {
      speed: 55, train: 9, halfDist: 900,
      L0style: 'contours', L0levels: 11, L1on: false,
    }, d: [
      { u: 0.42, v: 0.4, power: 1, age: 3.4, wavelength: 13, cont: false },
      { u: 0.66, v: 0.66, power: 0.7, age: 2.1, wavelength: 9, cont: false },
    ] },
  // Rings centred on the splashes themselves: every set is the wave front of its own
  // drop, and what the other drops have made of it.
  { label: 'Rings from every splash', s: {
      train: 10, halfDist: 1100,
      L0style: 'rings', L0spacing: 4.2, L0amp: 2.8, L0ringEach: true, L1on: false,
    }, d: [
      { u: 0.34, v: 0.32, power: 1, age: 2.6, wavelength: 12, cont: false },
      { u: 0.70, v: 0.52, power: 0.9, age: 1.9, wavelength: 12, cont: false },
      { u: 0.44, v: 0.78, power: 0.85, age: 1.2, wavelength: 12, cont: false },
    ] },
  // The outer radius stops short of the edge of the box, so nothing is ever clipped and
  // the whole sheet comes out as one unbroken stroke.
  { label: 'One spiral, one stroke', s: {
      train: 14, halfDist: 1200, contrast: 1.3,
      L0style: 'rings', L0ringEach: false, L0ringSpiral: true, L0ringR1: 90,
      L0spacing: 2.4, L0amp: 1.9, L1on: false,
    }, d: [
      { u: 0.36, v: 0.34, power: 1, age: 3.2, wavelength: 11, cont: true },
      { u: 0.66, v: 0.44, power: 0.9, age: 2.6, wavelength: 11, cont: true },
      { u: 0.5, v: 0.7, power: 0.8, age: 2, wavelength: 11, cont: true },
    ] },
  // Contrast holds the calm water down, the crest boost gives what is left to the tops,
  // and the displacement is then free to be large without the whole sheet going with it.
  { label: 'Swell, high crests', s: {
      train: 12, halfDist: 1200, contrast: 1.9, crestBoost: 0.85,
      L0angle: 0, L0spacing: 2.6, L0amp: 7, L1on: false,
    }, d: [
      { u: 0.26, v: 0.30, power: 1, age: 4, wavelength: 14, cont: true },
      { u: 0.76, v: 0.42, power: 0.9, age: 3.4, wavelength: 14, cont: true },
      { u: 0.48, v: 0.80, power: 0.85, age: 2.6, wavelength: 14, cont: true },
    ] },
  { label: 'Crest bands, two pens', s: {
      train: 12, halfDist: 1000,
      L0angle: 0, L0spacing: 0.8, L0amp: 0, L0gate: 'crests', L0thresh: 0.12,
      L1on: true, L1angle: 0, L1spacing: 0.8, L1amp: 0, L1gate: 'troughs', L1thresh: 0.12,
    }, d: [
      { u: 0.28, v: 0.28, power: 1, age: 4, wavelength: 12, cont: true },
      { u: 0.74, v: 0.36, power: 0.9, age: 3.4, wavelength: 12, cont: true },
      { u: 0.5, v: 0.8, power: 0.8, age: 2.6, wavelength: 12, cont: true },
    ] },
];

// Captured before anything can touch it — the URL only carries what differs from this,
// and "Reset" puts it all back.
const DEFAULTS = { ...settings };

const setters    = {};       // settings key -> function that moves its control
const fieldDivs  = {};       // settings key -> the .field wrapper, for showing/hiding
const dropSetters = [];      // functions that pull the per-drop controls back into line
const layerBodies = [];      // the part of a layer panel that is hidden when it is off
const layerSwatch = [];
const layerSubs   = [];      // the line under a heading saying what that family draws
let statsDiv, linkDiv, dropListDiv, dropPanel, peakDiv;

let drops  = DEFAULT_DROPS.map(d => ({ ...d }));
let picked = 0;              // index of the drop the sidebar is editing, -1 for none

let area   = null;           // { x0, y0, x1, y1, w, h } — the drawable box, in mm
let sets   = null;           // per layer: the point sources it reads, already mirrored
let base   = null;           // the same at the sketch's own moment, for the preview
let norm   = 1;              // what full deflection is worth in field units
let peak   = 0;              // the tallest water actually found on the sheet
let shapes = null;           // { pts, off, ink } — polylines in mm
let strokes = 0;             // how many of them, even when there are too many to draw
let plan   = null;           // { order, flip, ink, travel }
let perLayer = null;         // per layer: { strokes, ink }
let lastMs = 0;
let lastSamples = 0;
let drag   = null;           // the drop being moved with the mouse
let dragFrame = 0;

function LK(i, k) { return 'L' + i + k; }

// One family's settings, gathered from the flattened keys.
function layer(i) {
  const L = { i };
  for (const k of LAYER_KEYS) L[k] = settings[LK(i, k)];
  return L;
}

////////////////////////////////////////////////////////////////////////////////////////
// Helpers

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function parseNum(str) {
  const v = parseFloat(String(str).replace(',', '.').trim());
  return Number.isFinite(v) ? v : null;
}

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}`;
}

function groupNum(n) {
  return Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
}

function formatDuration(sec) {
  if (sec < 90) return `${Math.round(sec)} s`;
  const min = sec / 60;
  if (min < 90) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${Math.round(min - h * 60)} min`;
}

function round(v, dp) { return String(+v.toFixed(dp)); }

////////////////////////////////////////////////////////////////////////////////////////
// The URL is the document
//
// Every setting that differs from its default is written into the hash, debounced, with
// replaceState so the back button stays usable. The drops ride along in one parameter of
// their own: six numbers each, semicolons between them. Opening that link anywhere
// rebuilds the same sheet — nothing here is left to chance.

let urlTimer = null;
let urlWritten = '';

function encodeDrops() {
  return drops.map(d =>
    [round(d.u, 4), round(d.v, 4), round(d.power, 3), round(d.age, 3),
     round(d.wavelength, 2), d.cont ? 1 : 0].join(',')).join(';');
}

function parseDrops(str) {
  const out = [];
  for (const part of String(str).split(';')) {
    if (!part) continue;
    const n = part.split(',').map(parseNum);
    if (n.length < 5 || n.slice(0, 5).some(v => v === null)) continue;
    out.push({
      u: clamp(n[0], -2, 3), v: clamp(n[1], -2, 3),
      power: clamp(n[2], -2, 2), age: clamp(n[3], 0, 600),
      wavelength: clamp(n[4], 0.5, 400), cont: n[5] === 1,
    });
    if (out.length >= MAX_DROPS) break;
  }
  return out;
}

function sameDrops(a, b) {
  return a.length === b.length && a.every((d, i) =>
    ['u', 'v', 'power', 'age', 'wavelength'].every(k =>
      Math.abs(d[k] - b[i][k]) < 1e-9) && !!d.cont === !!b[i].cont);
}

function encodeState() {
  const parts = [];
  for (const k of Object.keys(DEFAULTS)) {
    const v = settings[k], d = DEFAULTS[k];
    if (v === d) continue;
    const raw = typeof d === 'boolean' ? (v ? '1' : '0') : String(v);
    parts.push(`${k}=${encodeURIComponent(raw)}`);
  }
  if (!sameDrops(drops, DEFAULT_DROPS)) parts.push('d=' + encodeDrops());
  return parts.join('&');
}

function applyState(str) {
  const q = new URLSearchParams(str);
  for (const [k, raw] of q) {
    if (k === 'd') { drops = parseDrops(raw); picked = drops.length ? 0 : -1; continue; }
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

// Pull every control back to whatever the settings now say — used after a scene, a
// reset, or a hash pasted into the address bar.
function refreshControls() {
  for (const k in setters) if (k in settings) setters[k](settings[k]);
  rebuildDropList();
  syncVisibility();
}

function onHashChange() {
  const h = location.hash.replace(/^#/, '');
  if (h === urlWritten) return;                    // our own write coming back
  Object.assign(settings, DEFAULTS);
  drops = DEFAULT_DROPS.map(d => ({ ...d }));
  picked = drops.length ? 0 : -1;
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
// drawable box is the sheet less the margin less that half width, and nothing — not a
// displaced line, not a contour — is ever allowed outside it.
function drawArea() {
  const [W, H] = paperDims();
  const m = settings.margin + settings.penWidth / 2;
  return { x0: m, y0: m, x1: W - m, y1: H - m, w: W - 2 * m, h: H - 2 * m };
}

function dropMm(d) {
  return [area.x0 + d.u * area.w, area.y0 + d.v * area.h];
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
  shapes = plan = sets = base = perLayer = null;
  waterImg = null;
  peak = 0;
  norm = 1;
  lastSamples = estimateSamples();

  if (area.w > 0 && area.h > 0 && lastSamples <= MAX_SAMPLES) {
    // One set of point sources per family, because a family may be looking at the water
    // at a different moment; families with no offset of their own share one set.
    base = buildSources(0);
    sets = [];
    for (let i = 0; i < LAYERS; i++) {
      const L = layer(i);
      sets.push(!L.on ? null : L.dt === 0 ? base : buildSources(L.dt));
    }

    peak = measurePeak();
    norm = settings.autoGain && peak > 1e-6 ? peak : 1;
    norm /= Math.max(0.01, settings.gain);
    computeShaping();

    shapes = buildShapes();
    strokes = shapes.off.length - 1;
    // Past the limit nothing is ordered, drawn or exported — the stats say why.
    if (strokes > MAX_STROKES) { shapes = null; perLayer = null; }
    else plan = orderShapes(shapes);
  }

  lastMs = performance.now() - t0;
  drawPreview();
  refreshDropRows();
  refreshLayerSubs();
  updateStats();
  syncUrl();
}

// Called while a slider is being dragged. When a whole update cannot keep up, dragging
// simply waits for the mouse to come up.
function liveUpdate() {
  if (!settings.liveUpdate || lastMs > LIVE_BUDGET_MS) return;
  update();
}

// A rough count of how many times the field will be read, so a spacing of 0.05 mm is
// refused before it freezes the tab rather than after.
function estimateSamples() {
  const a = drawArea();
  if (a.w <= 0 || a.h <= 0) return 0;
  const diag = Math.hypot(a.w, a.h);
  let n = 0;
  for (let i = 0; i < LAYERS; i++) {
    const L = layer(i);
    if (!L.on) continue;
    if (L.style === 'contours') {
      const res = Math.max(0.15, settings.contourRes);
      n += (a.w / res + 1) * (a.h / res + 1);
    } else if (L.style === 'rings') {
      // every ring is its own circumference: pi·r²/(spacing·step) for the lot of them
      const r = L.ringR1 > 0 ? L.ringR1 : diag;
      const centres = L.ringEach ? Math.max(1, drops.length) : 1;
      n += centres * clamp(L.ringSpan, 1, 360) / 360 * Math.PI * r * r /
        (Math.max(0.15, L.spacing) * Math.max(0.05, settings.sampleStep));
    } else {
      n += (diag / Math.max(0.1, L.spacing)) * (diag / Math.max(0.05, settings.sampleStep));
    }
  }
  return n;
}

////////////////////////////////////////////////////////////////////////////////////////
// The water
//
// Each drop becomes a radial lookup table — its height against distance, at this moment
// — plus a list of point sources that all read from it: the drop itself and, when the
// edges of the sheet are reflecting, its mirror images. A mirror image is at the same
// age as its parent, because the distance to the image is exactly the length of the path
// the ripple took to the wall and back.
//
// The tables are the reason this stays interactive: summing the water at a point costs
// one square root and one lerp per source, with no trigonometry anywhere in sight.

// The height of this drop against distance, and beside it the envelope that height
// swings inside — the same numbers without the ripple, which is what tells a node from
// a piece of water nothing has reached.
function profileFor(d, front, lam, train, lead, reach) {
  const n = Math.max(2, Math.ceil(reach / PROF_DR) + 2);
  const prof = new Float32Array(n);
  const envl = new Float32Array(n);
  const k    = TWO_PI / lam;
  const ph   = radians(settings.phase);
  const half = Math.max(1, settings.halfDist);
  const spread = settings.spreading;

  for (let j = 0; j < n; j++) {
    const r = j * PROF_DR;
    let env;
    if (r > front) {                       // ahead of the ring, a short lead
      const u = (r - front) / lead;
      env = Math.exp(-u * u);
    } else if (d.cont) {                   // a finger in the water: no tail, it all moves
      env = 1;
    } else {                               // behind it, the tail of the packet
      const u = (front - r) / train;
      env = Math.exp(-u * u);
    }
    if (env < 2e-4) continue;              // the table starts at zero already

    let a = env * Math.pow(0.5, r / half);
    // A ring spread over a longer circumference carries the same energy through more
    // water, so it drops as 1/sqrt(r) — softened near the middle where r goes to zero.
    if (spread) a /= Math.sqrt(1 + r / lam);
    envl[j] = Math.abs(d.power) * a;
    prof[j] = d.power * a * Math.cos(k * (r - front) + ph);
  }
  return { prof, envl };
}

// Mirror copies of one point in the box, out to `b` bounces. In one dimension the images
// of u in [0, L] sit at n·L + (n even ? u : L − u); the sheet is the product of the two.
// A hard wall turns the wave over on every reflection, a soft one lets it come back as
// it went in.
function mirrorImages(px, py, b) {
  const out = [];
  const hard = settings.hardWall;
  for (let n = -b; n <= b; n++) {
    const ux = (n & 1) ? area.w - (px - area.x0) : px - area.x0;
    const x  = area.x0 + n * area.w + ux;
    for (let m = -b; m <= b; m++) {
      const uy = (m & 1) ? area.h - (py - area.y0) : py - area.y0;
      const y  = area.y0 + m * area.h + uy;
      const sign = hard && ((Math.abs(n) + Math.abs(m)) & 1) ? -1 : 1;
      out.push([x, y, sign]);
    }
  }
  return out;
}

// Nearest and farthest a point of the box can be from (x, y) — used to throw away mirror
// images whose ripples cannot reach the sheet at all.
function boxDistRange(x, y) {
  const cx = clamp(x, area.x0, area.x1), cy = clamp(y, area.y0, area.y1);
  const near = Math.hypot(x - cx, y - cy);
  const far  = Math.max(
    Math.hypot(x - area.x0, y - area.y0), Math.hypot(x - area.x1, y - area.y0),
    Math.hypot(x - area.x0, y - area.y1), Math.hypot(x - area.x1, y - area.y1));
  return [near, far];
}

function buildSources(dt) {
  const c = Math.max(1, settings.speed);
  const b = Math.round(clamp(settings.bounces, 0, 2));
  const X = [], Y = [], SG = [], P = [], EN = [], R2A = [], R2B = [];

  for (const d of drops) {
    const age = d.age + settings.time + dt;
    if (age <= 0 || d.power === 0) continue;

    const lam   = Math.max(0.5, d.wavelength);
    const front = c * age;
    const train = Math.max(0.05, settings.train) * lam;
    const lead  = Math.max(0.02, settings.lead) * lam;
    // Outside [rMin, rMax] the packet is worth less than a thousandth of its height.
    const rMax  = front + 3 * lead;
    const rMin  = d.cont ? 0 : Math.max(0, front - 3.2 * train);

    const [px, py] = dropMm(d);
    const imgs = mirrorImages(px, py, b).filter(([x, y]) => {
      const [near, far] = boxDistRange(x, y);
      return near <= rMax && far >= rMin;
    });
    if (!imgs.length) continue;

    // The table only has to reach as far as the farthest corner any of them can see.
    let need = 0;
    for (const [x, y] of imgs) need = Math.max(need, boxDistRange(x, y)[1]);
    const reach = Math.min(rMax, need);
    const { prof, envl } = profileFor(d, front, lam, train, lead, reach);

    for (const [x, y, sign] of imgs) {
      X.push(x); Y.push(y); SG.push(sign); P.push(prof); EN.push(envl);
      R2A.push(rMin * rMin);
      R2B.push(reach * reach);
    }
  }

  return {
    n: X.length,
    x: Float64Array.from(X), y: Float64Array.from(Y),
    sign: Float64Array.from(SG), prof: P, envl: EN,
    r2a: Float64Array.from(R2A), r2b: Float64Array.from(R2B),
  };
}

// The curve the height of the water is read through before anything is drawn with it.
//
// Full deflection is one thing — how far a line is pushed at its furthest — and the
// shape of what happens below it is another. Raising the displacement alone raises the
// smallest ripple as much as the biggest crest, which is why a taller drawing so often
// just looks busier. These two exponents change the share instead:
//
//   contrast    the same exponent on both sides. Above 1 the small water is held down
//               and only the strong water still moves; below 1 everything moves.
//   crestBoost  splits that exponent between the sides: crests are carried up towards
//               full deflection and the troughs under them are flattened, the way a real
//               swell peaks — sharp tops over long shallow hollows.
//
// Both keep still water still and full deflection full; they only move the middle. At
// the defaults nothing is computed at all.
let shapeOn = false, crestExp = 1, troughExp = 1;

function computeShaping() {
  const c = clamp(settings.contrast, 0.05, 8);
  const k = clamp(settings.crestBoost, 0, 1);
  crestExp  = c / (1 + k);
  troughExp = c * (1 + k);
  shapeOn   = crestExp !== 1 || troughExp !== 1;
}

function shapeDeflection(v) {
  if (!shapeOn) return v;
  return v < 0 ? -Math.pow(-v, troughExp) : Math.pow(v, crestExp);
}

// The same curve for a magnitude that has no side of its own — the envelope a node is
// measured against, which has to stay in step with the water it is compared to.
function shapeMagnitude(m) {
  return shapeOn ? Math.pow(m, crestExp) : m;
}

function fieldAt(S, x, y) {
  let v = 0;
  for (let i = 0; i < S.n; i++) {
    const dx = x - S.x[i], dy = y - S.y[i];
    const r2 = dx * dx + dy * dy;
    if (r2 > S.r2b[i] || r2 < S.r2a[i]) continue;
    const p = S.prof[i];
    const t = Math.sqrt(r2) / PROF_DR;
    const j = t | 0;
    if (j + 1 >= p.length) continue;
    const f = t - j;
    v += S.sign[i] * (p[j] + (p[j + 1] - p[j]) * f);
  }
  return v;
}

// How high the water at this point could stand if everything reaching it lined up — the
// sum of the envelopes, with no regard for whether the ripples agree.
function energyAt(S, x, y) {
  let e = 0;
  for (let i = 0; i < S.n; i++) {
    const dx = x - S.x[i], dy = y - S.y[i];
    const r2 = dx * dx + dy * dy;
    if (r2 > S.r2b[i] || r2 < S.r2a[i]) continue;
    const p = S.envl[i];
    const t = Math.sqrt(r2) / PROF_DR;
    const j = t | 0;
    if (j + 1 >= p.length) continue;
    const f = t - j;
    e += p[j] + (p[j + 1] - p[j]) * f;
  }
  return e;
}

// The tallest water anywhere on the sheet, over every moment any family is looking at.
// It is what "auto gain" divides by, so that full deflection means the highest crest
// this particular arrangement of drops manages to build.
function measurePeak() {
  const cols = Math.max(2, Math.ceil(area.w / PEAK_STEP));
  const rows = Math.max(2, Math.ceil(area.h / PEAK_STEP));
  const hx = area.w / (cols - 1), hy = area.h / (rows - 1);
  const seen = new Set();
  let top = 0;

  for (const S of [base, ...sets]) {
    if (!S || seen.has(S)) continue;
    seen.add(S);
    if (!S.n) continue;
    for (let j = 0; j < rows; j++) {
      const y = area.y0 + j * hy;
      for (let i = 0; i < cols; i++) {
        const v = Math.abs(fieldAt(S, area.x0 + i * hx, y));
        if (v > top) top = v;
      }
    }
  }
  return top;
}

////////////////////////////////////////////////////////////////////////////////////////
// From the water to polylines
//
// A family is a set of parallel lines covering the drawable box. Every line is walked at
// a fixed step; at each step the water under it is read once and used twice — to push the
// point sideways, and to decide whether the pen is down at all. What comes out is cut at
// the gate, clipped to the box, thinned by Douglas–Peucker and handed to the sink.

const DISP_MAX = 3;          // the most a line is ever pushed, in multiples of its amount

function makeSink() {
  const pts = [], off = [0], ink = [];
  return {
    pts, off, ink,
    run(xs, ys, n, id) {
      if (n < 2) return;
      for (let i = 0; i < n; i++) pts.push(xs[i], ys[i]);
      off.push(pts.length / 2);
      ink.push(id);
    },
    // A gate can leave a single sample standing. A zero-length path is dropped by most
    // plotter toolchains, so it goes down as a hairline stub instead.
    dot(x, y, id) {
      pts.push(x - EPS / 2, y, x + EPS / 2, y);
      off.push(pts.length / 2);
      ink.push(id);
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

// Douglas–Peucker: the sampling step is fine enough to draw a smooth wave, which leaves
// long stretches of still water carrying hundreds of collinear points. Dropping them
// costs nothing visible and takes a large bite out of both the SVG and the plot time.
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

// The pieces of one sampled path that survive the box, in the order they were walked.
function clipRuns(px, py, n, out) {
  if (n === 1) {
    if (insideArea(px[0], py[0])) out.push([[px[0]], [py[0]]]);
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

// Cutting a sampled line at the gate. The crossing is interpolated on the gate value
// itself, so a band of crests ends on the threshold rather than on the nearest sample.
let gateX = null, gateY = null;

function gateRuns(px, py, gv, n, out) {
  if (!gateX || gateX.length < n + 2) {
    gateX = new Float64Array(n + 2);
    gateY = new Float64Array(n + 2);
  }
  let m = 0;

  for (let i = 0; i < n; i++) {
    if (gv[i] >= 0) {
      if (m === 0 && i > 0) {                     // stepped in since the last sample
        const t = gv[i - 1] / (gv[i - 1] - gv[i]);
        gateX[m] = px[i - 1] + (px[i] - px[i - 1]) * t;
        gateY[m] = py[i - 1] + (py[i] - py[i - 1]) * t;
        m++;
      }
      gateX[m] = px[i]; gateY[m] = py[i]; m++;
    } else if (m > 0) {                           // and stepped back out again
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

// One walked path — a ruled line, a ring, a whole spiral — cut at the gate, clipped to
// the box and handed over. A closed path that comes back to where it started is stitched
// up again if the sheet cut it there, so a ring is one stroke and not two halves that
// happen to meet.
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
// A family of ruled lines

function lineLayer(S, L, sink) {
  const th = radians(L.angle);
  const dx = Math.cos(th), dy = Math.sin(th);   // along a line
  // Across the family, pointing the way a crest pushes. For the horizontal ruling that
  // is up the page, so high water stands up out of the sheet and the flattened troughs
  // hang below it — the reading anyone brings to a row of profiles.
  const nx = dy, ny = -dx;

  // The box, measured in the family's own frame: how far the lines have to reach, and
  // how far across them the family has to go.
  let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
  for (const [x, y] of [[area.x0, area.y0], [area.x1, area.y0],
                        [area.x0, area.y1], [area.x1, area.y1]]) {
    const a = x * nx + y * ny, b = x * dx + y * dy;
    if (a < aMin) aMin = a;
    if (a > aMax) aMax = a;
    if (b < bMin) bMin = b;
    if (b > bMax) bMax = b;
  }

  const sp  = Math.max(0.1, L.spacing);
  const amp = Math.max(0, L.amp);
  // Centred on the middle of the box, so that changing the paper or the margin slides
  // the sheet under the same ruling instead of shuffling it.
  const aC  = ((area.x0 + area.x1) / 2) * nx + ((area.y0 + area.y1) / 2) * ny;
  const pad = DISP_MAX * amp;                   // lines that can still be pushed in
  const k0  = Math.ceil((aMin - pad - aC) / sp);
  const k1  = Math.floor((aMax + pad - aC) / sp);

  const ds    = Math.max(0.05, settings.sampleStep);
  const steps = Math.max(1, Math.ceil((bMax - bMin) / ds));
  const h     = (bMax - bMin) / steps;
  const np    = steps + 1;

  const gated = L.gate !== 'none';
  const gate  = GATE_FN[L.gate] || GATE_FN.none;
  const thr   = clamp(L.thresh, 0, 1);
  const wantE = gated && GATE_NEEDS_ENVELOPE[L.gate] === true;

  const px = new Float64Array(np), py = new Float64Array(np);
  const gv = gated ? new Float64Array(np) : null;

  for (let k = k0; k <= k1; k++) {
    const a = aC + k * sp;
    const ox = nx * a, oy = ny * a;

    for (let s = 0; s < np; s++) {
      const b = bMin + s * h;
      const x = dx * b + ox, y = dy * b + oy;
      const v = shapeDeflection(fieldAt(S, x, y) / norm);
      const d = clamp(v, -DISP_MAX, DISP_MAX) * amp;
      px[s] = x + nx * d;
      py[s] = y + ny * d;
      if (gated) gv[s] = gate(v, thr, wantE ? shapeMagnitude(energyAt(S, x, y) / norm) : 0);
    }

    emitPath(px, py, gv, np, gated, false, sink, L.i);
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// A family of rings
//
// The same reading of the water as a ruled family, wrapped around a point instead of
// laid across the sheet: a ring is walked round at a fixed step along its arc and pushed
// in and out by the water under it, so a circle comes out as the wave front it crosses.
// Centred on a drop — which is where they belong, since that is where the ripples
// actually came from — the rings and the water agree, and every ring is the shape the
// other drops have left of it.
//
// A ring can be any sector of a circle rather than the whole of it, the gap between
// rings can widen as they go out, and the whole family can be drawn as one unbroken
// spiral instead, which is a single stroke with no pen lift in it anywhere.

function ringCentres(L) {
  if (L.ringEach) return drops.map(d => dropMm(d));
  return [[area.x0 + L.ringU / 100 * area.w, area.y0 + L.ringV / 100 * area.h]];
}

// Where the gaps between the rings have got to after k of them. A growth of 0 is an
// even spacing; anything else compounds, exactly as it does turn by turn on the spiral.
function ringRadius(r0, sp, g, k) {
  return g === 0 ? r0 + sp * k : r0 + sp * (Math.pow(1 + g, k) - 1) / g;
}

function ringLayer(S, L, sink) {
  const sp    = Math.max(0.15, L.spacing);
  const amp   = Math.max(0, L.amp);
  const ds    = Math.max(0.05, settings.sampleStep);
  const grow  = clamp(L.ringGrow, -50, 200) / 100;
  const a0    = radians(L.ringAngle);
  const spanD = clamp(L.ringSpan, 1, 360);
  const span  = radians(spanD);
  const shut  = spanD >= 359.999;               // a whole circle closes on itself

  const gated = L.gate !== 'none';
  const gate  = GATE_FN[L.gate] || GATE_FN.none;
  const thr   = clamp(L.thresh, 0, 1);
  const wantE = gated && GATE_NEEDS_ENVELOPE[L.gate] === true;

  // The water at one point of a ring, and where that puts the pen: a crest pushes the
  // ring outwards, a trough pulls it in.
  const walk = (cx, cy, r, th, px, py, gv, i) => {
    const c = Math.cos(th), s2 = Math.sin(th);
    const x = cx + r * c, y = cy + r * s2;
    const v = shapeDeflection(fieldAt(S, x, y) / norm);
    const d = r + clamp(v, -DISP_MAX, DISP_MAX) * amp;
    px[i] = cx + d * c;
    py[i] = cy + d * s2;
    if (gated) gv[i] = gate(v, thr, wantE ? shapeMagnitude(energyAt(S, x, y) / norm) : 0);
  };

  for (const [cx, cy] of ringCentres(L)) {
    const rEnd   = L.ringR1 > 0 ? L.ringR1 : boxDistRange(cx, cy)[1];
    const rStart = Math.max(0.05, L.ringR0);
    if (rEnd <= rStart) continue;

    if (L.ringSpiral) {
      spiralPath(cx, cy, rStart, rEnd, sp, grow, a0, ds, gated, walk, sink, L.i);
      continue;
    }

    // One buffer for the whole centre, sized for the longest ring it will hold.
    const most = Math.max(16, Math.ceil(rEnd * span / ds) + 2);
    const px = new Float64Array(most), py = new Float64Array(most);
    const gv = gated ? new Float64Array(most) : null;

    for (let k = 0; k < MAX_RINGS; k++) {
      const r = ringRadius(rStart, sp, grow, k);
      if (r > rEnd) break;
      if (k > 0 && ringRadius(rStart, sp, grow, k) - ringRadius(rStart, sp, grow, k - 1) < 0.02) break;

      const n = Math.max(8, Math.ceil(r * span / ds));
      for (let i = 0; i <= n; i++) walk(cx, cy, r, a0 + span * i / n, px, py, gv, i);
      emitPath(px, py, gv, n + 1, gated, shut, sink, L.i);
    }
  }
}

// One turn after another without lifting the pen: the radius grows the same way it does
// from ring to ring, only continuously, and the step around is short enough that the
// curve stays smooth however far out it gets.
function spiralPath(cx, cy, rStart, rEnd, sp, grow, a0, ds, gated, walk, sink, id) {
  const xs = [], ys = [], gs = [];
  const px = [0], py = [0], gv = [0];           // one point at a time, into the arrays
  let th = 0;

  for (let guard = 0; guard < 4_000_000; guard++) {
    const turns = th / TWO_PI;
    const r = grow === 0 ? rStart + sp * turns
            : rStart + sp * (Math.pow(1 + grow, turns) - 1) / grow;
    if (r > rEnd) break;

    walk(cx, cy, r, a0 + th, px, py, gv, 0);
    xs.push(px[0]); ys.push(py[0]);
    if (gated) gs.push(gv[0]);

    th += ds / Math.max(0.5, r);
  }
  if (xs.length < 2) return;
  emitPath(Float64Array.from(xs), Float64Array.from(ys),
    gated ? Float64Array.from(gs) : null, xs.length, gated, false, sink, id);
}

////////////////////////////////////////////////////////////////////////////////////////
// A family of contour lines
//
// Marching squares over a grid of the box, one pass per level, the levels spread evenly
// across the deflection and deliberately never landing on zero — still water is exactly
// zero everywhere, and a level sitting on it would trace the whole sheet. The segments
// come out one cell at a time and are stitched back into long polylines by their shared
// endpoints, which is the difference between a plot of a few hundred strokes and one of
// a hundred thousand.

const KEY_HALF = 2097152;    // quantised to the micron, packed into one safe integer
const KEY_SPAN = 4194304;

function ptKey(x, y) {
  return (Math.round(x * 1000) + KEY_HALF) * KEY_SPAN + (Math.round(y * 1000) + KEY_HALF);
}

function contourLayer(S, L, sink) {
  const res = Math.max(0.15, settings.contourRes);
  const nx  = Math.max(2, Math.ceil(area.w / res) + 1);
  const ny  = Math.max(2, Math.ceil(area.h / res) + 1);
  const hx  = area.w / (nx - 1), hy = area.h / (ny - 1);

  const g = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const y = area.y0 + j * hy;
    const row = j * nx;
    for (let i = 0; i < nx; i++) {
      g[row + i] = shapeDeflection(fieldAt(S, area.x0 + i * hx, y) / norm);
    }
  }

  const levels = Math.round(clamp(L.levels, 2, 60));
  const sx = [], sy = [], ex = [], ey = [];

  for (let li = 0; li < levels; li++) {
    const lv = -1 + 2 * (li + 0.5) / levels;
    sx.length = sy.length = ex.length = ey.length = 0;
    marchLevel(g, nx, ny, hx, hy, lv, sx, sy, ex, ey);
    stitchInto(sx, sy, ex, ey, sink, L.i);
  }
}

function marchLevel(g, nx, ny, hx, hy, lv, sx, sy, ex, ey) {
  const seg = (ax, ay, bx, by) => {
    if (ax === bx && ay === by) return;
    sx.push(ax); sy.push(ay); ex.push(bx); ey.push(by);
  };

  for (let j = 0; j + 1 < ny; j++) {
    const r0 = j * nx, r1 = r0 + nx;
    const y = area.y0 + j * hy;

    for (let i = 0; i + 1 < nx; i++) {
      const v0 = g[r0 + i], v1 = g[r0 + i + 1], v2 = g[r1 + i + 1], v3 = g[r1 + i];
      let idx = 0;
      if (v0 > lv) idx |= 1;
      if (v1 > lv) idx |= 2;
      if (v2 > lv) idx |= 4;
      if (v3 > lv) idx |= 8;
      if (idx === 0 || idx === 15) continue;

      const x = area.x0 + i * hx;
      // Where the level crosses each side of the cell. A side whose ends are equal is
      // never one of the sides actually used, so the half-way fallback never shows.
      const e0x = x + hx * (v1 !== v0 ? (lv - v0) / (v1 - v0) : 0.5), e0y = y;
      const e1x = x + hx, e1y = y + hy * (v2 !== v1 ? (lv - v1) / (v2 - v1) : 0.5);
      const e2x = x + hx * (v2 !== v3 ? (lv - v3) / (v2 - v3) : 0.5), e2y = y + hy;
      const e3x = x, e3y = y + hy * (v3 !== v0 ? (lv - v0) / (v3 - v0) : 0.5);

      switch (idx) {
        case 1:  seg(e3x, e3y, e0x, e0y); break;
        case 2:  seg(e0x, e0y, e1x, e1y); break;
        case 3:  seg(e3x, e3y, e1x, e1y); break;
        case 4:  seg(e1x, e1y, e2x, e2y); break;
        case 6:  seg(e0x, e0y, e2x, e2y); break;
        case 7:  seg(e3x, e3y, e2x, e2y); break;
        case 8:  seg(e2x, e2y, e3x, e3y); break;
        case 9:  seg(e0x, e0y, e2x, e2y); break;
        case 11: seg(e1x, e1y, e2x, e2y); break;
        case 12: seg(e1x, e1y, e3x, e3y); break;
        case 13: seg(e0x, e0y, e1x, e1y); break;
        case 14: seg(e3x, e3y, e0x, e0y); break;
        // The saddles: the middle of the cell decides which pair of corners is joined.
        case 5:
          if ((v0 + v1 + v2 + v3) / 4 > lv) { seg(e0x, e0y, e1x, e1y); seg(e2x, e2y, e3x, e3y); }
          else                              { seg(e3x, e3y, e0x, e0y); seg(e1x, e1y, e2x, e2y); }
          break;
        case 10:
          if ((v0 + v1 + v2 + v3) / 4 > lv) { seg(e3x, e3y, e0x, e0y); seg(e1x, e1y, e2x, e2y); }
          else                              { seg(e0x, e0y, e1x, e1y); seg(e2x, e2y, e3x, e3y); }
          break;
      }
    }
  }
}

// Chain the loose segments into polylines through a map of their endpoints. Both ends of
// every chain are followed, so an open contour that starts in the middle of itself still
// comes out as one stroke, and a closed one comes back to where it began.
function stitchInto(sx, sy, ex, ey, sink, id) {
  const m = sx.length;
  if (!m) return;

  const map = new Map();
  const ks = new Float64Array(m), ke = new Float64Array(m);
  const put = (k, i) => { const a = map.get(k); if (a) a.push(i); else map.set(k, [i]); };

  for (let i = 0; i < m; i++) {
    ks[i] = ptKey(sx[i], sy[i]);
    ke[i] = ptKey(ex[i], ey[i]);
    put(ks[i], i); put(ke[i], i);
  }

  const used = new Uint8Array(m);

  // Walk away from one end of a chain for as long as some unused segment shares it.
  const extend = (x, y, xs, ys) => {
    for (;;) {
      const list = map.get(ptKey(x, y));
      if (!list) return;
      let j = -1;
      for (const c of list) if (!used[c]) { j = c; break; }
      if (j < 0) return;
      used[j] = 1;
      const atStart = ks[j] === ptKey(x, y);
      x = atStart ? ex[j] : sx[j];
      y = atStart ? ey[j] : sy[j];
      xs.push(x); ys.push(y);
    }
  };

  for (let i = 0; i < m; i++) {
    if (used[i]) continue;
    used[i] = 1;

    const fx = [ex[i]], fy = [ey[i]];
    extend(ex[i], ey[i], fx, fy);
    const bx = [], by = [];
    extend(sx[i], sy[i], bx, by);

    const xs = [], ys = [];
    for (let k = bx.length - 1; k >= 0; k--) { xs.push(bx[k]); ys.push(by[k]); }
    xs.push(sx[i]); ys.push(sy[i]);
    for (let k = 0; k < fx.length; k++) { xs.push(fx[k]); ys.push(fy[k]); }
    emitRun(xs, ys, sink, id);
  }
}

////////////////////////////////////////////////////////////////////////////////////////

// Dots on the edge of the sheet: one on every corner, and more along the edges until no
// two are further apart than the spacing asks, so a plot run on oversized paper can be
// trimmed back to its nominal size by cutting through them. They go into every file a
// multi-pen plot is split into — they are what lines the sheets up.
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
  const sink = makeSink();
  perLayer = [];

  for (let i = 0; i < LAYERS; i++) {
    const L = layer(i);
    const before = sink.off.length - 1;
    if (L.on && sets[i]) {
      if (L.style === 'contours') contourLayer(sets[i], L, sink);
      else if (L.style === 'rings') ringLayer(sets[i], L, sink);
      else lineLayer(sets[i], L, sink);
    }
    perLayer.push({ strokes: sink.off.length - 1 - before, ink: 0 });
  }
  if (settings.cropMarks) cropMarkShapes(sink);

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
// with a uniform bucket grid so the search stays local. One family at a time, cut guides
// first: a multi-pen plot is run one pen at a time, and the pen should never have to
// come back to a colour it has already put down. Greedy lands a little above optimal,
// which no plotter file format lets us close anyway; vpype's linesort would redo this
// pass regardless.

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
    if (best < 0) {                        // safety net; the ring walk should always find one
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
    flip[done]  = best & 1;                // entered by the far end -> draw it reversed

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

// How far the pen draws and how far it travels between strokes — per family as well as
// altogether, since each family is a separate pass with a pen of its own.
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
      run += Math.hypot(pts[(k + 1) * 2] - pts[k * 2], pts[(k + 1) * 2 + 1] - pts[k * 2 + 1]);
    }
    ink += run;
    const id = sh.ink[i];
    if (perLayer && id >= 0 && perLayer[id]) perLayer[id].ink += run;
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
// draws. Under them, optionally, sits the water itself as a grey wash — never exported,
// it is there to show where the crests are between the lines. The drops are drawn on top
// as handles; they are not part of the plot either.

function inkColor(id) {
  return id === INK_MARK ? '#666' : settings[LK(id, 'color')];
}

let waterImg = null;

function buildWaterImage() {
  // The wash is only a guide, so it gives up resolution rather than time when the water
  // is made of many sources — two bounces off the edges is 25 of them per drop.
  const budget = clamp(2.2e6 / Math.max(1, base.n), 8000, FIELD_RASTER * FIELD_RASTER);
  const scale  = Math.sqrt(budget / (area.w * area.h));
  const w = Math.max(2, Math.min(FIELD_RASTER, Math.round(area.w * scale)));
  const h = Math.max(2, Math.min(FIELD_RASTER, Math.round(area.h * scale)));
  const img = createImage(w, h);

  img.loadPixels();
  for (let j = 0; j < h; j++) {
    const y = area.y0 + (j + 0.5) / h * area.h;
    for (let i = 0; i < w; i++) {
      const x = area.x0 + (i + 0.5) / w * area.w;
      const v = clamp(shapeDeflection(fieldAt(base, x, y) / norm), -1, 1);
      // Troughs go to a cold slate, crests to white, still water to a light grey.
      const t = (v + 1) / 2;
      const px = (j * w + i) * 4;
      img.pixels[px]     = Math.round(60 + 195 * t);
      img.pixels[px + 1] = Math.round(72 + 183 * t);
      img.pixels[px + 2] = Math.round(92 + 163 * t);
      img.pixels[px + 3] = 255;
    }
  }
  img.updatePixels();
  return img;
}

function drawPreview() {
  background(255);
  if (!area || area.w <= 0 || area.h <= 0) return;

  const s   = previewScale();
  const ctx = drawingContext;

  if (settings.showField && base) {
    if (!waterImg) waterImg = buildWaterImage();
    ctx.save();
    ctx.scale(s, s);
    ctx.globalAlpha = clamp(settings.fieldOpacity / 100, 0, 1);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(waterImg.canvas, area.x0, area.y0, area.w, area.h);
    ctx.restore();
  }

  if (shapes && plan && !drag) drawStrokes(ctx, s);
  if (settings.showDrops) drawDropMarks(ctx, s);
}

function drawStrokes(ctx, s) {
  const { pts, off } = shapes;
  const { order } = plan;

  ctx.save();
  ctx.scale(s, s);
  ctx.lineWidth = settings.penWidth;
  ctx.lineCap   = 'round';
  ctx.lineJoin  = 'round';

  // The plan already has one family after another, so the colour changes a handful of
  // times however many strokes there are.
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

// The drops as handles: a ring where each one fell, the selected one filled in and
// wearing the circle its leading ripple has reached by now.
function drawDropMarks(ctx, s) {
  const c = Math.max(1, settings.speed);

  ctx.save();
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Where the leading ripple of the selected drop has got to.
  const sel = selectedDrop();
  if (sel) {
    const age = Math.max(0, sel.age + settings.time);
    if (age > 0) {
      const [x, y] = dropMm(sel);
      ctx.strokeStyle = 'rgba(26, 109, 209, 0.5)';
      ctx.lineWidth = 0.3;
      ctx.setLineDash([1.8, 1.8]);
      ctx.beginPath();
      ctx.arc(x, y, c * age, 0, TWO_PI);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // A hole in the drawing behind every marker, so a handle stays a handle however
  // dense the ruling over it is.
  for (const d of drops) {
    const [x, y] = dropMm(d);
    ctx.beginPath();
    ctx.arc(x, y, d.cont ? 4 : 3, 0, TWO_PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fill();
  }

  for (let i = 0; i < drops.length; i++) {
    const d = drops[i];
    const [x, y] = dropMm(d);
    const on = i === picked;

    if (d.cont) {                            // a finger in the water, not a splash
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, TWO_PI);
      ctx.strokeStyle = 'rgba(26, 109, 209, 0.55)';
      ctx.lineWidth = 0.3;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, TWO_PI);
    ctx.fillStyle   = on ? '#1a6dd1' : '#ffffff';
    ctx.strokeStyle = on ? '#0d4e9e' : '#1a6dd1';
    ctx.lineWidth   = 0.45;
    ctx.fill();
    ctx.stroke();

    ctx.font = '2.8px -apple-system, sans-serif';
    ctx.fillStyle = on ? '#fff' : '#1a6dd1';
    ctx.fillText(String(i + 1), x, y + 0.15);
  }
  ctx.restore();
}

// While a drop is being dragged and a full update cannot keep up, the water alone is
// redrawn — the lines follow when the mouse comes up.
function dragPreview() {
  area = drawArea();
  base = buildSources(0);
  sets = [base, base, base, base];
  peak = measurePeak();
  norm = settings.autoGain && peak > 1e-6 ? peak : 1;
  norm /= Math.max(0.01, settings.gain);
  computeShaping();
  waterImg = null;
  drawPreview();
}

////////////////////////////////////////////////////////////////////////////////////////
// UI

function buildControls() {
  const root = 'controls';

  // --- Scenes ---
  addSection(root, 'Scene');
  const sceneSel = createSelect().parent(createDiv('').parent(root).class('field'));
  for (const s of SCENES) sceneSel.option(s.label);
  sceneSel.changed(() => {
    const s = SCENES[sceneSel.elt.selectedIndex];
    if (s && s.d) applyScene(s);
    sceneSel.elt.selectedIndex = 0;
  });

  // --- Pen ---
  addSection(root, 'Pen');
  addSlider(root, 'Pen width (mm)', 'penWidth', 0.1, 2, 0.05,
    'Only the width the lines are drawn and exported with — the spacing of a family is ' +
    'set on the family itself.');

  // --- Paper ---
  addSection(root, 'Paper');
  addSelect(root, 'Size', 'paper', Object.keys(PAPER_SIZES), resizeForPaper);
  addSelect(root, 'Orientation', 'orientation', ['portrait', 'landscape'], resizeForPaper);
  addSlider(root, 'Margin (mm)', 'margin', 0, 60, 1);
  addCheckbox(root, 'Cut guide dots on the sheet edge', 'cropMarks');
  addSlider(root, 'Most between two marks (mm)', 'cropMarkGap', 20, 1000, 10,
    'A dot on each corner of the sheet, and more along the edges until no gap is wider ' +
    'than this — cut through them to trim a plot back out of a larger piece of paper. ' +
    'They go into every file of a multi-pen plot, which is what lines the passes up.');

  // --- Drops ---
  addSection(root, 'Drops');
  createDiv('<b>Click</b> the water to drop one · <b>drag</b> it to move it · ' +
    '<b>right click</b> it to take it away. Drops are held as a fraction of the sheet, ' +
    'so the composition survives a change of paper.').parent(root).class('note');
  const keys = createDiv('').parent(root).class('note keys');
  keys.html(
    '<div><kbd>N</kbd> new drop &nbsp; <kbd>C</kbd> splash ⇄ continuous</div>' +
    '<div><kbd>Del</kbd> remove &nbsp; <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> nudge</div>' +
    '<div><kbd>[</kbd><kbd>]</kbd> age &nbsp; <kbd>−</kbd><kbd>+</kbd> wavelength ' +
    '&nbsp; <kbd>⇧</kbd> finer</div>');

  dropListDiv = createDiv('').parent(root).class('drop-list');
  const dropBtns = createDiv('').parent(root).class('btn-row');
  createButton('Add').parent(dropBtns).mousePressed(() => addDrop(0.5, 0.5));
  createButton('Scatter 5').parent(dropBtns).mousePressed(scatterDrops);
  createButton('Clear').parent(dropBtns).mousePressed(() => {
    drops = []; picked = -1; rebuildDropList(); update();
  });

  dropPanel = createDiv('').parent(root);
  addDropSlider(dropPanel, 'Power', 'power', -1.5, 1.5, 0.05,
    'How high this drop\'s ripples stand. A negative drop is the same splash upside ' +
    'down — it cancels where an equal positive one would double.');
  addDropSlider(dropPanel, 'Time since the splash (s)', 'age', 0, 60, 0.05,
    'The phase of this drop: how long ago it hit the water. Its leading ring is this ' +
    'long times the wave speed away from it, and every ripple behind the ring follows ' +
    'from the same number.');
  addDropSlider(dropPanel, 'Wavelength (mm)', 'wavelength', 1, 120, 0.5,
    'Crest to crest. Two drops of different wavelengths beat against each other instead ' +
    'of settling into a standing pattern.');
  addDropSlider(dropPanel, 'Across the sheet (%)', 'u', -20, 120, 0.1);
  addDropSlider(dropPanel, 'Down the sheet (%)', 'v', -20, 120, 0.1);
  addDropCheckbox(dropPanel, 'Continuous — a finger in the water, not a splash', 'cont');
  const applyRow = createDiv('').parent(dropPanel).class('btn-row');
  createButton('Wave → all drops').parent(applyRow).mousePressed(applyWaveToAll);
  createButton('Remove').parent(applyRow).mousePressed(() => removeDrop(picked));

  // --- Water ---
  addSection(root, 'Water');
  addSlider(root, 'Wave speed (mm/s)', 'speed', 2, 400, 1,
    'How fast a ring travels. Together with the age of a drop this is where its leading ' +
    'ripple has got to.');
  addSlider(root, 'Time (s)', 'time', -30, 60, 0.05,
    'Added to the age of every drop at once — the whole scene, later or earlier.');
  addSlider(root, 'Phase (°)', 'phase', 0, 360, 1,
    'Slides the ripples inside their packets without moving the rings: the same instant, ' +
    'read half a crest along.');
  addSlider(root, 'Train (wavelengths)', 'train', 0.5, 40, 0.5,
    'How many ripples trail behind the leading ring before the water goes flat again. ' +
    'A short train is a splash caught early; a long one is an established swell.');
  addSlider(root, 'Lead (wavelengths)', 'lead', 0.1, 6, 0.1,
    'How far the first ripple runs ahead of the ring — the soft edge of the packet.');
  addSlider(root, 'Half-height distance (mm)', 'halfDist', 20, 2000, 10,
    'How far a ripple travels before it is half as high. Put it past the diagonal of the ' +
    'sheet for water that does not damp at all.');
  addCheckbox(root, 'Spread over the ring (1/√r)', 'spreading');
  addSlider(root, 'Reflections off the edges', 'bounces', 0, 2, 1,
    'The sheet as a tank with walls: every drop is joined by mirror copies of itself, ' +
    'one ring of them per bounce, so ripples come back off the edges.');
  addCheckbox(root, 'Hard walls (a crest comes back a trough)', 'hardWall');

  // --- Reading the water ---
  addSection(root, 'Wave height');
  createDiv('Full deflection is what pushes a line by its whole displacement — the ' +
    'millimetres are set on each family. These decide how the water is shared out over ' +
    'that height, which is where the drama is: raising the displacement alone lifts the ' +
    'smallest ripple as much as the tallest crest.').parent(root).class('note');
  addCheckbox(root, 'Auto gain', 'autoGain');
  addSlider(root, 'Gain', 'gain', 0.1, 4, 0.05,
    'With auto gain on, full deflection is the tallest water on the sheet, so the ' +
    'drawing always uses its whole range. Past 1 the crests are pushed beyond it and ' +
    'the tops run together.');
  addSlider(root, 'Contrast', 'contrast', 0.3, 3, 0.05,
    'Above 1 the small ripples are held down and only the strong water still moves — ' +
    'calm paper with the crests standing out of it. Below 1 every last ripple moves and ' +
    'the sheet fills up.');
  addSlider(root, 'Crest boost', 'crestBoost', 0, 1, 0.01,
    'Carries the crests up towards full deflection and flattens the troughs under them, ' +
    'the way a real swell peaks: sharp tops over long shallow hollows. Still water stays ' +
    'still either way.');
  peakDiv = createDiv('').parent(root).class('note');

  // --- Lines ---
  addSection(root, 'Drawing');
  addSlider(root, 'Sample step (mm)', 'sampleStep', 0.05, 3, 0.05,
    'How far the pen walks between two readings of the water. It has to be a good deal ' +
    'finer than the wavelength or the ripples come out as facets.');
  addSlider(root, 'Simplify tolerance (mm)', 'simplifyTol', 0, 0.3, 0.005,
    'Points are dropped while the line stays within this of where it was sampled. Still ' +
    'water collapses to one long segment, which is most of the file. Anything under a ' +
    'tenth of the pen width is invisible on paper and halves the SVG.');
  addSlider(root, 'Contour grid (mm)', 'contourRes', 0.15, 3, 0.05,
    'Only used by families drawn as contours: the cell the level curves are traced on.');

  // --- Families ---
  for (let i = 0; i < LAYERS; i++) addLayerPanel(root, i);

  // --- View ---
  addSection(root, 'View');
  addCheckbox(root, 'Show the water under the lines', 'showField', true);
  addSlider(root, 'Water opacity (%)', 'fieldOpacity', 0, 100, 1, null, true);
  addCheckbox(root, 'Show the drops', 'showDrops', true);
  addCheckbox(root, 'Live update while dragging', 'liveUpdate', true);
  createDiv('Neither the water nor the drop markers is ever exported — the SVG holds ' +
    'the lines and nothing else.').parent(root).class('note');

  // --- Stats + actions ---
  addSection(root, 'Plot');
  statsDiv = createDiv('').parent(root).class('stats');
  addSelect(root, 'SVG output', 'svgOutput',
    ['one file', 'one file per colour', 'both'], () => syncUrl(),
    'A file per colour is one pen each, every one of them carrying the cut guides so ' +
    'the passes can be lined up on the sheet.');
  createButton('Regenerate').parent(root).mousePressed(update);
  createButton('Generate SVG').parent(root).class('primary').mousePressed(exportSvg);
  addCheckbox(root, 'Optimise stroke order', 'optimiseOrder');

  // --- Link ---
  addSection(root, 'Link');
  createDiv('Every setting, and every drop, lives in the address bar. Copy the link to ' +
    'keep this sheet, paste it into another tab to get it back.').parent(root).class('note');
  const linkRow = createDiv('').parent(root).class('btn-row');
  const copyBtn = createButton('Copy link').parent(linkRow);
  copyBtn.mousePressed(() => copyLink(copyBtn));
  createButton('Reset').parent(linkRow).mousePressed(resetAll);
  linkDiv = createDiv(location.href).parent(root).class('link');

  rebuildDropList();
  syncVisibility();
}

// One panel per family. The body is folded away when the family is switched off, so four
// of them do not bury the rest of the sidebar.
function addLayerPanel(parent, i) {
  const group = createDiv('').parent(parent).class('group');
  const head  = createDiv('').parent(group).class('section layer-head');
  const sw    = createDiv('').parent(head).class('sw');
  sw.style('background', settings[LK(i, 'color')]);
  createSpan(`Family ${i + 1}`).parent(head);
  layerSwatch[i] = sw;
  // The four families are the same thing four times over; only what each one is set to
  // differs. This line says what this one is set to, so that is plain from the outside.
  layerSubs[i] = createDiv('').parent(group).class('layer-sub');

  addCheckbox(group, 'Draw this family', LK(i, 'on'));
  const body = createDiv('').parent(group);
  layerBodies[i] = body;

  addColor(body, 'Pen colour', LK(i, 'color'), () => {
    sw.style('background', settings[LK(i, 'color')]);
  });
  addSelect(body, 'Drawn as', LK(i, 'style'), STYLES, () => { syncVisibility(); update(); },
    '<b>lines</b> — a ruling laid over the water and pushed about by it.<br>' +
    '<b>contours</b> — the level curves of the water itself, no ruling at all.<br>' +
    '<b>rings</b> — circles round a point, pushed out and in by the water the same way ' +
    'a ruling is pushed sideways. Round a drop they are its own wave fronts.');
  addSlider(body, 'Angle (°)', LK(i, 'angle'), 0, 180, 1,
    'Two families at different angles weave a moiré; the same angle twice, half a ' +
    'spacing apart, doubles the ruling instead.');
  addSlider(body, 'Line spacing (mm)', LK(i, 'spacing'), 0.15, 20, 0.05);
  addSlider(body, 'Displacement (mm)', LK(i, 'amp'), 0, 20, 0.1,
    'How far full deflection pushes a line sideways. Past half the spacing the lines ' +
    'start to cross, which reads as depth rather than as a mistake.');
  addSlider(body, 'Contour levels', LK(i, 'levels'), 2, 60, 1,
    'Level curves spread evenly across the deflection, never landing on still water.');

  // --- rings ---
  addCheckbox(body, 'A set around every drop', LK(i, 'ringEach'));
  addSlider(body, 'Centre across the sheet (%)', LK(i, 'ringU'), -20, 120, 0.5);
  addSlider(body, 'Centre down the sheet (%)', LK(i, 'ringV'), -20, 120, 0.5);
  const ringBtn = createDiv('').parent(body).class('btn-row');
  createButton('Centre on the selected drop').parent(ringBtn).mousePressed(() => {
    const d = selectedDrop();
    if (!d) return;
    settings[LK(i, 'ringU')] = +(100 * d.u).toFixed(2);
    settings[LK(i, 'ringV')] = +(100 * d.v).toFixed(2);
    setters[LK(i, 'ringU')](settings[LK(i, 'ringU')]);
    setters[LK(i, 'ringV')](settings[LK(i, 'ringV')]);
    update();
  });
  fieldDivs[LK(i, 'ringSnap')] = ringBtn;
  addSlider(body, 'Innermost ring (mm)', LK(i, 'ringR0'), 0, 400, 0.5,
    'Where the family starts. Leaving the middle out is how the eye is sent to it.');
  addSlider(body, 'Outermost ring (mm)', LK(i, 'ringR1'), 0, 1500, 1,
    'Where it stops. At 0 the rings run out until the far corner of the sheet is past.');
  addSlider(body, 'Gap growth per ring (%)', LK(i, 'ringGrow'), -20, 40, 0.5,
    'How much wider each gap is than the one before it. Above 0 the rings crowd in the ' +
    'middle and open out — the way a ripple looks when the water is deep in the middle.');
  addSlider(body, 'Sector starts at (°)', LK(i, 'ringAngle'), 0, 360, 1);
  addSlider(body, 'Sector span (°)', LK(i, 'ringSpan'), 1, 360, 1,
    'At 360 the rings are whole circles. Below that they are arcs, which turns a centre ' +
    'sitting off the sheet into a fan of wave fronts sweeping across it.');
  addCheckbox(body, 'One continuous spiral', LK(i, 'ringSpiral'));
  fieldDivs[LK(i, 'ringSpiralNote')] = createDiv(
    'One unbroken line from the middle outwards instead of a stack of circles — the ' +
    'whole family in a single stroke, with the pen never leaving the paper. Keep the ' +
    'outermost ring inside the sheet and nothing cuts it.').parent(body).class('note');
  addSelect(body, 'Keep only', LK(i, 'gate'), GATES, () => { syncVisibility(); update(); },
    '<b>crests</b> and <b>troughs</b> cut the ruling into bands of high and low water — ' +
    'one of each, in two colours, is the whole picture.<br><b>nodes</b> keeps the still ' +
    'water instead: the curves along which ripples cancel each other out. Water nothing ' +
    'has reached yet is not a node and is left blank.');
  addSlider(body, 'Threshold', LK(i, 'thresh'), 0, 1, 0.01,
    'Where the gate opens. For the peaks it is a share of full deflection; for the ' +
    'nodes, a share of how high the water at that point could stand if the ripples ' +
    'passing through it all agreed.');
  addSlider(body, 'Time offset (s)', LK(i, 'dt'), -20, 20, 0.05,
    'This family alone sees the water this much later. A second colour a fraction of a ' +
    'period behind the first draws the same wave a moment on.');
}

function addSection(parent, title) {
  createDiv(title).parent(parent).class('section');
}

// What this family is set to draw, in one line. All four can do all of it; they only
// start out pointed at different things.
function layerSummary(i) {
  const L = layer(i);
  if (!L.on) return 'off';
  const bits = [];
  if (L.style === 'contours') {
    bits.push('contours', `${Math.round(L.levels)} levels`);
  } else if (L.style === 'rings') {
    bits.push(L.ringSpiral ? 'spiral' : 'rings');
    bits.push(L.ringEach ? 'round every drop' : 'round a point');
    if (L.ringSpan < 359.999) bits.push(`${Math.round(L.ringSpan)}° sector`);
    bits.push(`${L.spacing} mm`);
    bits.push(L.amp > 0 ? `±${L.amp} mm` : 'undisplaced');
  } else {
    bits.push('lines', `${Math.round(L.angle)}°`, `${L.spacing} mm`);
    bits.push(L.amp > 0 ? `±${L.amp} mm` : 'undisplaced');
  }
  if (L.style !== 'contours' && L.gate !== 'none') bits.push(L.gate + ' only');
  if (L.dt) bits.push(`${L.dt > 0 ? '+' : ''}${L.dt} s`);
  return bits.join(' · ');
}

function refreshLayerSubs() {
  for (let i = 0; i < LAYERS; i++) {
    if (layerSubs[i]) layerSubs[i].html(layerSummary(i));
  }
}

function setVisible(key, on) {
  if (fieldDivs[key]) fieldDivs[key].style('display', on ? '' : 'none');
}

function syncVisibility() {
  setVisible('cropMarkGap', settings.cropMarks);

  for (let i = 0; i < LAYERS; i++) {
    const L = layer(i);
    const con = L.style === 'contours';
    const rng = L.style === 'rings';
    if (layerBodies[i]) layerBodies[i].style('display', L.on ? '' : 'none');
    setVisible(LK(i, 'angle'), L.style === 'lines');
    setVisible(LK(i, 'spacing'), !con);
    setVisible(LK(i, 'amp'), !con);
    setVisible(LK(i, 'gate'), !con);
    setVisible(LK(i, 'thresh'), !con && L.gate !== 'none');
    setVisible(LK(i, 'levels'), con);
    setVisible(LK(i, 'ringEach'), rng);
    setVisible(LK(i, 'ringU'), rng && !L.ringEach);
    setVisible(LK(i, 'ringV'), rng && !L.ringEach);
    setVisible(LK(i, 'ringSnap'), rng && !L.ringEach);
    setVisible(LK(i, 'ringR0'), rng);
    setVisible(LK(i, 'ringR1'), rng);
    setVisible(LK(i, 'ringGrow'), rng);
    setVisible(LK(i, 'ringSpiral'), rng);
    setVisible(LK(i, 'ringSpiralNote'), rng);
    setVisible(LK(i, 'ringAngle'), rng);
    setVisible(LK(i, 'ringSpan'), rng && !L.ringSpiral);
    if (layerSwatch[i]) layerSwatch[i].style('background', L.color);
  }
  refreshLayerSubs();
  if (dropPanel) dropPanel.style('display', picked >= 0 && drops[picked] ? '' : 'none');
}

function applyScene(sc) {
  Object.assign(settings, DEFAULTS, sc.s || {});
  drops = (sc.d || DEFAULT_DROPS).map(d => ({ ...d }));
  picked = drops.length ? 0 : -1;
  refreshControls();
  resizeForPaper();
}

function resetAll() {
  Object.assign(settings, DEFAULTS);
  drops = DEFAULT_DROPS.map(d => ({ ...d }));
  picked = drops.length ? 0 : -1;
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

function addColor(parent, labelText, key, onChange) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const cp = createColorPicker(settings[key]).parent(field);
  setters[key] = v => { cp.value(v); if (onChange) onChange(); };
  cp.input(() => {
    settings[key] = cp.value();
    if (onChange) onChange();
    drawPreview();
    syncUrl();
  });
  return cp;
}

////////////////////////////////////////////////////////////////////////////////////////
// The drops, in the sidebar

function selectedDrop() {
  return picked >= 0 && picked < drops.length ? drops[picked] : null;
}

// The per-drop controls edit whichever drop is selected, so they are wired to the
// selection rather than to a settings key, and pulled back into line whenever it changes.
function addDropSlider(parent, labelText, key, min, max, step, hint) {
  const field = createDiv('').parent(parent).class('field');
  createSpan(labelText).parent(field).class('label');
  const row = createDiv('').parent(field).class('row');
  const sl  = createSlider(min, max, 0, step).parent(row);
  const num = createInput('').parent(row);
  num.attribute('type', 'text');
  num.attribute('inputmode', 'decimal');
  if (hint) createDiv(hint).parent(field).class('note');

  // u and v are kept as fractions and shown as percentages.
  const pct = key === 'u' || key === 'v';
  const show = v => { sl.value(pct ? v * 100 : v); num.value(String(+(pct ? v * 100 : v).toFixed(3))); };
  const take = v => (pct ? v / 100 : v);

  dropSetters.push(() => { const d = selectedDrop(); if (d) show(d[key]); });

  sl.input(() => {
    const d = selectedDrop();
    if (!d) return;
    d[key] = take(Number(sl.value()));
    num.value(String(+Number(sl.value()).toFixed(3)));
    liveUpdate();
    updateDropRow(picked);
  });
  sl.changed(() => { if (selectedDrop()) update(); });
  num.input(() => {
    const d = selectedDrop();
    const v = parseNum(num.value());
    if (!d || v === null) return;
    d[key] = take(clamp(v, min, max));
    sl.value(pct ? d[key] * 100 : d[key]);
    updateDropRow(picked);
    update();
  });
  return sl;
}

function addDropCheckbox(parent, labelText, key) {
  const row = createDiv('').parent(parent).class('checkbox-row');
  const cb = createCheckbox(labelText, false).parent(row);
  dropSetters.push(() => { const d = selectedDrop(); if (d) cb.checked(!!d[key]); });
  cb.changed(() => {
    const d = selectedDrop();
    if (!d) return;
    d[key] = cb.checked();
    rebuildDropList();
    update();
  });
  return cb;
}

function refreshDropControls() {
  for (const f of dropSetters) f();
  if (dropPanel) dropPanel.style('display', selectedDrop() ? '' : 'none');
}

function dropSummary(d) {
  const [x, y] = area ? dropMm(d) : [0, 0];
  return `${x.toFixed(0)}, ${y.toFixed(0)} mm · λ${+d.wavelength.toFixed(1)} · ` +
    `${+d.age.toFixed(2)} s · ×${+d.power.toFixed(2)}`;
}

function rebuildDropList() {
  if (!dropListDiv) return;
  dropListDiv.html('');

  if (!drops.length) {
    createDiv('No drops — click the water to make one.')
      .parent(dropListDiv).class('empty');
  }

  for (let i = 0; i < drops.length; i++) {
    const row = createDiv('').parent(dropListDiv).class('drop-row' + (i === picked ? ' sel' : ''));
    createSpan(String(i + 1)).parent(row).class('idx');
    createSpan(dropSummary(drops[i])).parent(row).class('info');
    if (drops[i].cont) createSpan('cont').parent(row).class('cont');
    const kill = createSpan('×').parent(row).class('kill');
    kill.elt.title = 'Remove this drop';
    kill.elt.addEventListener('click', e => { e.stopPropagation(); removeDrop(i); });
    row.elt.addEventListener('click', () => selectDrop(i));
  }
  refreshDropControls();
}

// Only the one row, so that dragging a slider does not rebuild the whole list under the
// cursor every frame.
function updateDropRow(i) {
  if (!dropListDiv || i < 0 || i >= drops.length) return;
  const rows = dropListDiv.elt.querySelectorAll('.drop-row');
  const row  = rows[i];
  if (!row) return;
  const info = row.querySelector('.info');
  if (info) info.textContent = dropSummary(drops[i]);
}

function refreshDropRows() {
  for (let i = 0; i < drops.length; i++) updateDropRow(i);
}

function selectDrop(i) {
  picked = i;
  rebuildDropList();
  drawPreview();
}

function addDrop(u, v) {
  if (drops.length >= MAX_DROPS) return -1;
  const from = selectedDrop() || DEFAULT_DROPS[0];
  drops.push({
    u, v,
    power: from.power, age: from.age, wavelength: from.wavelength, cont: from.cont,
  });
  picked = drops.length - 1;
  rebuildDropList();
  update();
  return picked;
}

function removeDrop(i) {
  if (i < 0 || i >= drops.length) return;
  drops.splice(i, 1);
  picked = Math.min(picked, drops.length - 1);
  rebuildDropList();
  update();
}

function scatterDrops() {
  const from = selectedDrop() || DEFAULT_DROPS[0];
  drops = [];
  for (let i = 0; i < 5 && drops.length < MAX_DROPS; i++) {
    drops.push({
      u: 0.12 + Math.random() * 0.76,
      v: 0.12 + Math.random() * 0.76,
      power: +(0.55 + Math.random() * 0.45).toFixed(2),
      age: +(Math.random() * 3.5).toFixed(2),
      wavelength: from.wavelength,
      cont: from.cont,
    });
  }
  picked = 0;
  rebuildDropList();
  update();
}

function applyWaveToAll() {
  const d = selectedDrop();
  if (!d) return;
  for (const o of drops) {
    o.power = d.power; o.age = d.age; o.wavelength = d.wavelength; o.cont = d.cont;
  }
  rebuildDropList();
  update();
}

////////////////////////////////////////////////////////////////////////////////////////
// The sheet as the control surface
//
// Click the water and a drop lands there, already being dragged so it can be put down
// exactly where it is wanted; click one that is already there and it is picked up
// instead; right click it and it is gone. While a drop is moving the water is redrawn
// under it every frame — the lines follow at once if a whole update fits in the frame,
// and otherwise when the mouse comes up.

function paperPoint(e) {
  const rect = canvasEl().getBoundingClientRect();
  const [W, H] = paperDims();
  return [(e.clientX - rect.left) / rect.width * W, (e.clientY - rect.top) / rect.height * H];
}

function pickDrop(x, y) {
  let best = -1, bestD = HIT_MM * HIT_MM;
  for (let i = 0; i < drops.length; i++) {
    const [dx, dy] = dropMm(drops[i]);
    const d = (dx - x) * (dx - x) + (dy - y) * (dy - y);
    if (d <= bestD) { bestD = d; best = i; }     // ties go to the one drawn on top
  }
  return best;
}

function moveDropTo(i, x, y) {
  if (!area || area.w <= 0 || area.h <= 0) return;
  drops[i].u = clamp((x - area.x0) / area.w, -0.5, 1.5);
  drops[i].v = clamp((y - area.y0) / area.h, -0.5, 1.5);
}

function attachPointer() {
  const c = canvasEl();
  if (!c) return;

  c.addEventListener('contextmenu', e => e.preventDefault());

  c.addEventListener('pointerdown', e => {
    if (!area || area.w <= 0) return;
    const [x, y] = paperPoint(e);
    const hit = pickDrop(x, y);

    if (e.button === 2 || (e.button === 0 && (e.ctrlKey || e.metaKey))) {
      if (hit >= 0) removeDrop(hit);
      return;
    }
    if (e.button !== 0) return;

    if (hit >= 0) {
      selectDrop(hit);
      // Held where it was grabbed rather than snapped to the cursor.
      const [dx, dy] = dropMm(drops[hit]);
      drag = { i: hit, ox: dx - x, oy: dy - y };
    } else {
      const i = addDrop(clamp((x - area.x0) / area.w, -0.5, 1.5),
                        clamp((y - area.y0) / area.h, -0.5, 1.5));
      if (i < 0) return;                         // the sheet already holds its limit
      drag = { i, ox: 0, oy: 0 };
    }
    // Capture keeps the drop following the cursor past the edge of the canvas; a
    // browser that will not give it up is no reason to stop dragging.
    try { c.setPointerCapture(e.pointerId); } catch (err) { /* carry on without it */ }
    c.style.cursor = 'grabbing';
  });

  c.addEventListener('pointermove', e => {
    if (!drag) return;
    const [x, y] = paperPoint(e);
    moveDropTo(drag.i, x + drag.ox, y + drag.oy);
    refreshDropControls();
    updateDropRow(drag.i);
    if (!dragFrame) dragFrame = requestAnimationFrame(() => { dragFrame = 0; dragStep(); });
  });

  const end = () => {
    if (!drag) return;
    drag = null;
    c.style.cursor = '';
    if (dragFrame) { cancelAnimationFrame(dragFrame); dragFrame = 0; }
    update();
  };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', end);
}

// One frame of a drag: the whole drawing when it fits in the budget, the water alone
// when it does not.
function dragStep() {
  if (settings.liveUpdate && lastMs <= LIVE_BUDGET_MS && lastSamples <= BUSY_SAMPLES) {
    const held = drag;
    drag = null;                                 // so the strokes are drawn
    update();
    drag = held;
  } else {
    dragPreview();
  }
}

// A text field, a select or a slider keeps its own keys — they would otherwise move a
// drop and the focused control at once.
function attachKeys() {
  window.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable ||
        (t.tagName === 'INPUT' && !['checkbox', 'button', 'color'].includes(t.type)))) return;
    if (e.metaKey || e.ctrlKey || e.altKey || drag) return;

    const d = selectedDrop();
    const fine = e.shiftKey;
    const nudge = (dx, dy) => {
      if (!d || !area) return;
      const step = fine ? 0.2 : 1;
      d.u = clamp(d.u + dx * step / area.w, -0.5, 1.5);
      d.v = clamp(d.v + dy * step / area.h, -0.5, 1.5);
      rebuildDropList();
      update();
    };

    switch (e.key) {
      case 'ArrowLeft':  nudge(-1, 0); break;
      case 'ArrowRight': nudge(1, 0);  break;
      case 'ArrowUp':    nudge(0, -1); break;
      case 'ArrowDown':  nudge(0, 1);  break;
      case 'Delete': case 'Backspace':
        if (picked >= 0) removeDrop(picked);
        break;
      case 'n': case 'N':
        addDrop(0.5, 0.5);
        break;
      case 'c': case 'C':
        if (!d) return;
        d.cont = !d.cont;
        rebuildDropList();
        update();
        break;
      case '[':
        if (!d) return;
        d.age = Math.max(0, d.age - (fine ? 0.02 : 0.2));
        rebuildDropList();
        update();
        break;
      case ']':
        if (!d) return;
        d.age = Math.min(600, d.age + (fine ? 0.02 : 0.2));
        rebuildDropList();
        update();
        break;
      case '-': case '_':
        if (!d) return;
        d.wavelength = clamp(d.wavelength - (fine ? 0.2 : 1), 0.5, 400);
        rebuildDropList();
        update();
        break;
      case '=': case '+':
        if (!d) return;
        d.wavelength = clamp(d.wavelength + (fine ? 0.2 : 1), 0.5, 400);
        rebuildDropList();
        update();
        break;
      default:
        return;
    }
    e.preventDefault();
  });
}

////////////////////////////////////////////////////////////////////////////////////////

function shortestWavelength() {
  let m = Infinity;
  for (const d of drops) if (d.power !== 0) m = Math.min(m, d.wavelength);
  return m === Infinity ? 0 : m;
}

// The drops are what you place; the sources are what the water actually has in it once
// the silent drops are dropped and the walls have made their copies.
function sourceNote() {
  if (!base) return '';
  if (settings.bounces > 0) {
    return `= ${groupNum(base.n)} sources once the walls have copied them`;
  }
  if (base.n < drops.length) {
    return base.n === 0 ? '— none of them has started' : `— ${groupNum(base.n)} of them ringing`;
  }
  return '';
}

function updateStats() {
  if (!statsDiv) return;

  if (!area || area.w <= 0 || area.h <= 0) {
    statsDiv.html(`<div class="warn">The margin leaves nothing to draw on. ` +
      `Lower it, or use larger paper.</div>`);
    if (peakDiv) peakDiv.html('');
    return;
  }

  if (lastSamples > MAX_SAMPLES) {
    statsDiv.html(
      `<div class="warn">${groupNum(lastSamples)} readings of the water — past the ` +
      `${groupNum(MAX_SAMPLES)} limit, so nothing was drawn.<br>Widen the line spacing, ` +
      `coarsen the sample step, or switch a family off.</div>`);
    if (peakDiv) peakDiv.html('');
    return;
  }

  if (peakDiv) {
    peakDiv.html(peak > 1e-6
      ? `Tallest water on the sheet: <b>${peak.toFixed(2)}</b> of one drop at full power` +
        `${settings.autoGain ? ', which is what full deflection is worth here.' : '.'}`
      : `The sheet is still — no ripple has reached it yet.`);
  }

  if (!plan || !shapes) {
    statsDiv.html(
      `<div class="warn">${groupNum(strokes)} strokes — past the ${groupNum(MAX_STROKES)} ` +
      `limit, so nothing was ordered or drawn.<br>Widen the line spacing, raise the ` +
      `simplify tolerance, or ask for fewer contour levels.</div>`);
    return;
  }

  const [W, H] = paperDims();
  const seconds = strokes * PEN_CYCLE_S + plan.ink / DRAW_SPEED + plan.travel / TRAVEL_SPEED;
  const lam = shortestWavelength();

  let rows = '';
  for (let i = 0; i < LAYERS; i++) {
    const L = layer(i);
    if (!L.on) continue;
    const p = perLayer[i] || { strokes: 0, ink: 0 };
    rows += `<div class="legend"><span class="sw" style="background:${L.color}"></span>` +
      `<span class="tone-name">Family ${i + 1}</span><b>${groupNum(p.strokes)}</b> ` +
      `<span class="dim">strokes, ${(p.ink / 1000).toFixed(1)} m` +
      `${L.style === 'contours' ? ', contours' : ''}</span></div>`;
  }

  let warn = '';
  if (!drops.length) {
    warn += `<div class="warn">No drops: the water is flat, so every line is straight. ` +
      `Click the sheet to make one.</div>`;
  } else if (peak <= 1e-6) {
    warn += `<div class="warn">Not one ripple has reached the sheet. Give the drops more ` +
      `time, or move them onto the paper.</div>`;
  }
  if (lam > 0 && settings.sampleStep > lam / 6) {
    warn += `<div class="warn">The sample step is ${settings.sampleStep} mm against a ` +
      `shortest wavelength of ${+lam.toFixed(1)} mm — the ripples will come out as ` +
      `facets. Bring it under ${+(lam / 8).toFixed(2)} mm.</div>`;
  }
  for (let i = 0; i < LAYERS; i++) {
    const L = layer(i);
    if (!L.on || L.style === 'contours') continue;
    if (L.spacing < settings.penWidth) {
      warn += `<div class="warn">Family ${i + 1} rules its lines ${L.spacing} mm apart, ` +
        `closer than the ${settings.penWidth} mm nib — it will come out as a solid wash.` +
        `</div>`;
    }
  }
  if (strokes > BUSY_STROKES) {
    warn += `<div class="warn">${groupNum(strokes)} strokes is a very long plot — and a ` +
      `big SVG.</div>`;
  }
  if (lastSamples > BUSY_SAMPLES) {
    warn += `<div class="warn">This sheet takes ${Math.round(lastMs)} ms to build, so ` +
      `dragging a drop shows the water alone; the lines follow when the mouse comes up.` +
      `</div>`;
  }

  let crossing = '';
  for (let i = 0; i < LAYERS; i++) {
    const L = layer(i);
    if (!L.on || L.style === 'contours' || L.amp <= 0) continue;
    const over = L.amp > L.spacing / 2;
    crossing += `<div>Family ${i + 1} pushes <b>${L.amp} mm</b> over a ${L.spacing} mm ` +
      `spacing — <span class="${over ? 'dim' : 'ok'}">` +
      `${over ? 'the lines cross' : 'the lines stay apart'}</span></div>`;
  }

  statsDiv.html(
    `<div>Sheet <b>${W} × ${H} mm</b>, drawn on ` +
    `${area.w.toFixed(0)} × ${area.h.toFixed(0)} mm</div>` +
    `<div class="big">Drops <b>${drops.length}</b> ` +
    `<span class="dim">${sourceNote()}</span></div>` +
    crossing +
    rows +
    `<div>Strokes <b>${groupNum(strokes)}</b> ` +
    `<span class="dim">= as many pen cycles</span></div>` +
    `<div>Draws <b>${(plan.ink / 1000).toFixed(1)} m</b>, travels ` +
    `<b>${(plan.travel / 1000).toFixed(1)} m</b> with the pen up</div>` +
    `<div>Rough plot time <b>${formatDuration(seconds)}</b></div>` +
    `<div class="dim">${groupNum(lastSamples)} readings of the water, ` +
    `generated in ${Math.round(lastMs)} ms</div>` +
    warn
  );
}

////////////////////////////////////////////////////////////////////////////////////////
// SVG export
//
// One group per pen, no fills, no background rectangle — everything in the file is meant
// to be plotted. stroke-width is the pen width and the caps are round, so the file
// previews exactly as the finished plot looks. Strokes come out in the order the pen
// should visit them, each already flipped to the end it should be entered from, and the
// link that rebuilds the sheet is written into the header comment.

function metaComment() {
  const s = settings;
  const fam = [];
  for (let i = 0; i < LAYERS; i++) {
    const L = layer(i);
    if (!L.on) continue;
    const tail = `${L.gate === 'none' ? '' : '/' + L.gate + '>' + L.thresh}@${L.color}` +
      `${L.dt ? '+' + L.dt + 's' : ''}`;
    if (L.style === 'contours') {
      fam.push(`F${i + 1}=contours/${L.levels}@${L.color}${L.dt ? '+' + L.dt + 's' : ''}`);
    } else if (L.style === 'rings') {
      fam.push(`F${i + 1}=${L.ringSpiral ? 'spiral' : 'rings'}` +
        `${L.ringEach ? '/each-drop' : '/' + L.ringU + ',' + L.ringV + '%'}` +
        `/${L.spacing}mm/±${L.amp}mm/r${L.ringR0}-${L.ringR1 || 'edge'}` +
        `${L.ringGrow ? '/grow' + L.ringGrow + '%' : ''}` +
        `${L.ringSpan < 360 ? '/' + L.ringAngle + '+' + L.ringSpan + '°' : ''}${tail}`);
    } else {
      fam.push(`F${i + 1}=${L.angle}°/${L.spacing}mm/±${L.amp}mm${tail}`);
    }
  }
  return `wave interference — ` +
    `drops=${drops.length}[${drops.map(d =>
      `${(100 * d.u).toFixed(1)},${(100 * d.v).toFixed(1)}%` +
      `×${d.power}@${d.age}s λ${d.wavelength}${d.cont ? ' cont' : ''}`).join('; ')}] ` +
    `speed=${s.speed}mm/s time=${s.time}s phase=${s.phase}° ` +
    `train=${s.train}λ lead=${s.lead}λ half=${s.halfDist}mm` +
    `${s.spreading ? ' spread' : ''} ` +
    `bounces=${s.bounces}${s.hardWall ? ' hard' : ''} ` +
    `gain=${s.autoGain ? 'auto' : 'fixed'}×${s.gain} peak=${peak.toFixed(3)} ` +
    `contrast=${s.contrast} crest=${s.crestBoost} ` +
    `step=${s.sampleStep}mm simplify=${s.simplifyTol}mm ` +
    `${fam.join(' ')} ` +
    `${s.cropMarks ? 'cropmarks<=' + s.cropMarkGap + 'mm ' : ''}` +
    `pen=${s.penWidth}mm strokes=${strokes}`;
}

// The strokes of one pen, in plot order, as one <g>.
function svgGroup(keep, colour) {
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
      // A run of still water is one long straight segment by now, and a contour is
      // rarely axis-aligned — h and v are worth taking where they turn up all the same.
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
    body: `<g fill="none" stroke="${colour}" stroke-width="${f(settings.penWidth)}" ` +
      `stroke-linecap="round" stroke-linejoin="round">\n${body}</g>\n`,
  };
}

// The colours actually put down on this sheet, in the order the families are drawn.
function colourList() {
  const out = [];
  for (let i = 0; i < LAYERS; i++) {
    const L = layer(i);
    if (!L.on || !perLayer[i] || !perLayer[i].strokes) continue;
    if (!out.includes(L.color)) out.push(L.color);
  }
  return out;
}

// The whole sheet, or the one pen `colour` draws. The cut guides are in every file —
// they are what lines the passes up on the paper.
function svgFile(colour) {
  const [W, H] = paperDims();
  const groups = [];

  if (settings.cropMarks) {
    groups.push([i => shapes.ink[i] === INK_MARK, colour || colourList()[0] || '#000000']);
  }
  for (let i = 0; i < LAYERS; i++) {
    const L = layer(i);
    if (!L.on || (colour && L.color !== colour)) continue;
    groups.push([j => shapes.ink[j] === i, L.color]);
  }

  let body = '', count = 0;
  for (const [keep, col] of groups) {
    const g = svgGroup(keep, col);
    if (!g) continue;
    body += g.body;
    count += g.count;
  }
  if (!count) return null;

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- ${metaComment()}${colour ? ' pen=' + colour : ''} -->\n` +
    `<!-- ${location.origin === 'null' ? '' : location.origin}${location.pathname}` +
    `#${encodeState()} -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n` +
    body +
    `</svg>\n`;
}

function exportSvg() {
  if (!shapes || !plan || !strokes) {
    alert('Nothing to export — no family is drawing anything on this sheet.');
    return;
  }

  const colours = colourList();
  const out = settings.svgOutput;
  const parts = out === 'one file' ? [null]
    : out === 'one file per colour' ? colours
    : [null, ...colours];

  const stem = `waves ${drops.length}drops ` +
    `${settings.paper}-${settings.orientation} pen${settings.penWidth}`;
  const stamp = timestamp();

  for (const colour of parts) {
    const svg = svgFile(colour);
    if (!svg) continue;
    const tag = colour ? ' pen' + colour.replace('#', '') : '';
    saveStrings([svg], `${stem}${tag} ${stamp}`, 'svg');
  }
}
