////////////////////////////////////////////////////////////////////////////////////////
// Voxel hatching — a solid of unit cubes drawn as a pen-and-ink engraving
//
// The sketch builds a structure out of voxels, looks at it through an orthographic
// (axonometric) or a perspective camera and shades it with hatching, the way an engraver
// would:
//
//   1. the structure — either a 2D cellular automaton stacked in time, one generation per
//      layer, or a Perlin terrain built up out of columns;
//   2. the surface — every face between a filled and an empty cell that turns towards
//      the camera. Faces with the same orientation that lie in the same plane form one
//      flat region and are hatched as one, so a line runs unbroken across a whole floor;
//   3. the light — one directional lamp. Every orientation gets its Lambert tone, and a
//      point that cannot see the lamp falls back to the ambient tone: a cast shadow;
//   4. the tone — up to four hatching layers, each switched on above its own darkness
//      threshold. The first layer runs one way, the next crosses it (or doubles it), so
//      a darker face is literally more ink;
//   5. visibility — the grid is its own acceleration structure. A point on a hatch line
//      or an edge is visible when the walk through the voxels between it and the camera
//      (Amanatides–Woo) meets nothing; the same walk towards the lamp answers the shadow.
//      Lines are sampled every SAMPLE_MM on paper and every change is pinned down by
//      bisection, so a hidden line ends exactly where the occluder's outline passes.
//
// Nothing here needs WebGL: hidden lines are solved on the grid itself, and the plot is a
// list of straight segments in millimetres, ordered for the pen and written out as SVG.
// Drag the sheet to turn the camera, scroll to zoom, Shift-drag to pan. The whole state
// of the sketch lives in the URL.
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};

const PROJECTIONS    = ['orthographic', 'perspective'];
const GENERATORS     = ['automaton stack', 'terrain'];
const CA_SEEDS       = ['center', 'random', 'random disc'];
const NEIGHBOURHOODS = ['moore', 'von neumann'];
const TIME_DIRS      = ['downwards', 'upwards'];
const HATCH_PATTERNS = ['cross', 'parallel'];
const HATCH_MODES    = ['along edges', 'screen angle'];
const WALL_HATCH     = ['vertical', 'horizontal'];
const EDGE_MODES     = ['outlines', 'every voxel', 'none'];
const CUT_AROUND     = ['drawing', 'drawable area'];

// Life-like rules in B/S notation — the digits are neighbour counts that give birth to a
// dead cell (B) or keep a live one (S).
const CA_PRESETS = [
  { label: '— select rule —' },
  { label: 'Replicator   B1357/S1357',  rule: 'B1357/S1357' },
  { label: 'Fredkin   B1357/S02468',    rule: 'B1357/S02468' },
  { label: 'Life   B3/S23',             rule: 'B3/S23' },
  { label: 'HighLife   B36/S23',        rule: 'B36/S23' },
  { label: 'Coral   B3/S45678',         rule: 'B3/S45678' },
  { label: 'Day & Night   B3678/S34678',rule: 'B3678/S34678' },
  { label: 'Maze   B3/S12345',          rule: 'B3/S12345' },
  { label: 'Majority   B5678/S45678',   rule: 'B5678/S45678' },
  { label: 'Gnarl   B1/S1',             rule: 'B1/S1' },
  { label: 'Seeds   B2/S',              rule: 'B2/S' },
];

// Whole-sketch presets. Anything a scene leaves out falls back to its default.
const SCENES = [
  { label: '— select scene —' },
  { label: 'Replicator pyramid', s: {
    generator: 'automaton stack', caRule: 'B1357/S1357', caSeed: 'center',
    sizeX: 63, sizeY: 63, sizeZ: 32, timeDir: 'downwards' } },
  { label: 'Fredkin ziggurat', s: {
    generator: 'automaton stack', caRule: 'B1357/S02468', caSeed: 'center',
    sizeX: 49, sizeY: 49, sizeZ: 25, timeDir: 'downwards', lightAzimuth: -55 } },
  { label: 'Coral reef', s: {
    generator: 'automaton stack', caRule: 'B3/S45678', caSeed: 'random disc',
    seedDensity: 0.5, seedRadius: 9, sizeX: 48, sizeY: 48, sizeZ: 30, timeDir: 'upwards' } },
  { label: 'Majority pillars', s: {
    generator: 'automaton stack', caRule: 'B5678/S45678', caSeed: 'random',
    seedDensity: 0.5, sizeX: 40, sizeY: 40, sizeZ: 14, wrapEdges: true, elevation: 40 } },
  { label: 'Voxel dunes', s: {
    generator: 'terrain', sizeX: 64, sizeY: 64, sizeZ: 18, noiseScale: 22, octaves: 3,
    elevation: 40, lightElevation: 35 } },
  { label: 'Replicator from the ground', s: {
    generator: 'automaton stack', caRule: 'B1357/S1357', caSeed: 'center',
    sizeX: 63, sizeY: 63, sizeZ: 32, timeDir: 'downwards',
    projection: 'perspective', fov: 80, azimuth: 30, elevation: 14, lightAzimuth: -50 } },
  { label: 'Canyon, wide angle', s: {
    generator: 'terrain', sizeX: 96, sizeY: 96, sizeZ: 24, noiseScale: 30, octaves: 4,
    peakGamma: 1.6, projection: 'perspective', fov: 95, azimuth: 20, elevation: 32,
    lightAzimuth: -60, lightElevation: 30 } },
];

const MAX_STROKES    = 600_000;   // stroke counts no plotter would ever finish
const BUSY_STROKES   = 120_000;   // above this, warn about the plot time
const SAMPLE_MM      = 0.25;      // mm on paper between two visibility samples on a line
const BISECT         = 12;        // halvings that pin a visibility change down
const MIN_STROKE     = 0.05;      // mm — anything shorter would plot as a dot and is dropped
const DOT_MM         = 0.01;      // mm — length of the stub that stands in for one cut dot
const EPS_OFF        = 1e-4;      // voxels — a test point is lifted this far off its face
const FRONT_EPS      = 1e-6;      // a face turned further away than this is seen edge-on
const LINE_JITTER    = 1e-6;      // keeps a hatch line off the exact cell boundaries
const PREVIEW_MAX_PX = 1500;      // preview canvas resolution (paper is measured in mm)
const MAX_PREVIEW_W  = 900;       // on-screen size of that canvas
const MAX_PREVIEW_H  = 700;
const LIVE_BUDGET_MS = 160;       // slower than this and dragging waits for the release
const ORBIT_DEG_PX   = 0.4;       // camera degrees per pixel of drag
const WHEEL_ZOOM     = 0.0015;    // zoom factor per wheel delta unit, as an exponent
const MIN_ZOOM       = 10;        // %
const MAX_ZOOM       = 2000;      // %
const SETTLE_MS      = 300;       // after the last wheel step or key, the hatching is recomputed
const KEY_ORBIT_DEG  = 5;         // camera degrees per arrow key
const KEY_PAN_MM     = 10;        // mm on paper per Shift+arrow
const KEY_ZOOM       = 1.25;      // zoom factor per + / −
const PEN_CYCLE_S    = 0.3;       // rough pen-up + pen-down time, seconds
const DRAW_SPEED     = 60;        // rough drawing speed, mm/s
const TRAVEL_SPEED   = 150;       // rough pen-up travel speed, mm/s

// The in-plane axes (u, v) of a face whose normal lies along X, Y or Z. The same table
// names the two axes perpendicular to an edge running along X, Y or Z.
const AXES_UV = [[1, 2], [0, 2], [0, 1]];

// Hatch layer i → [family, phase]. Family 0 is the first direction, 1 the one across it;
// the phase shifts a family by a share of the spacing, which is how density doubles.
const PATTERN_LAYERS = {
  cross:    [[0, 0], [1, 0], [0, 0.5], [1, 0.5]],
  parallel: [[0, 0], [0, 0.5], [0, 0.25], [0, 0.75]],
};

const settings = {
  // paper + pen
  paper: 'A4',
  orientation: 'portrait',
  margin: 15,
  penWidth: 0.3,        // mm — Rotring nib size
  inkColor: '#000000',

  // cut guides — dots around the image, to trim it out with a guillotine or a knife
  cutMarks: false,
  cutAround: 'drawing',
  cutOffset: 5,         // mm between the image and the cut line
  cutGap: 40,           // mm — the most that is ever left between two dots

  // the structure
  generator: 'automaton stack',
  sizeX: 63,
  sizeY: 63,
  sizeZ: 32,

  // automaton stack
  caRule: 'B1357/S1357',
  neighbourhood: 'moore',
  caSeed: 'center',
  seedDensity: 0.35,
  seedRadius: 8,        // cells, for the random disc
  seedValue: 1,
  wrapEdges: false,
  warmup: 0,            // generations run before the first layer
  genStep: 1,           // one layer every n-th generation
  timeDir: 'downwards',

  // terrain
  fieldSeed: 1,
  noiseScale: 24,       // voxels per noise unit — the feature size of the terrain
  octaves: 3,
  persistence: 0.5,
  baseHeight: 1,        // voxels every column has at least
  peakGamma: 1,         // >1 sharpens the peaks, <1 flattens them into plateaus

  // camera
  projection: 'orthographic',
  fov: 60,              // degrees, perspective only — the angle the structure's sphere fills
  azimuth: 45,          // degrees around the vertical, 0 looks along −X
  elevation: 35,        // degrees above the horizon
  zoom: 100,            // % — 100 just fits the structure inside the margin
  panX: 0,              // mm on paper at 100 % — the point that sits in the middle of the
  panY: 0,              // drawable area, measured from where the fit puts the centre

  // light
  lightAzimuth: -35,    // degrees from the camera's own azimuth — negative is from the left
  lightElevation: 50,
  ambient: 15,          // %
  exposure: 0,
  shadows: true,

  // hatching
  hatchSpacing: 1,      // mm on paper between the lines of one layer
  layers: 3,
  hatchPattern: 'cross',
  hatchMode: 'along edges',
  wallHatch: 'vertical',
  hatchAngle: 45,       // degrees, for the screen-angle mode
  edges: 'outlines',

  // view + output
  showModel: true,
  modelOpacity: 25,
  optimiseOrder: true,
  liveUpdate: true,
};

// Captured before anything can touch it — the URL only carries what differs from this,
// and "Reset" puts it all back.
const DEFAULTS = { ...settings };

const setters   = {};        // settings key -> function that moves its control
const fieldDivs = {};        // settings key -> the .field wrapper, for showing/hiding
let statsDiv, ruleInput, ruleInfoDiv, linkDiv, autoGroup, terrGroup;
let grid     = null;         // { nx, ny, nz, vox, count, sig, bmin, bmax } — the voxels
let view     = null;         // camera, lamp and the fit onto the paper
let planes   = null;         // [{ o, ax, sg, L, ua, va, NU, NV, mask, count, bbox }]
let tones    = null;         // per orientation: how many layers lit, how many in shadow
let shapes   = null;         // { pts, off, hatch } — segments in mm
let strokes  = 0;            // how many of them, even when there are too many to draw
let plan     = null;         // { order, flip, ink, travel }
let modelImg = null;         // offscreen canvas with the shaded faces, built on demand
let lastMs   = 0;

////////////////////////////////////////////////////////////////////////////////////////
// Helpers

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function deg(a) { return a * Math.PI / 180; }

// Deterministic PRNG so a given seed always reproduces the same pattern.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Number fields accept both decimal separators — a number input in a comma locale hands
// back an empty string for "0.35", which would silently swallow the edit.
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

////////////////////////////////////////////////////////////////////////////////////////
// The URL is the document
//
// Every setting that differs from its default is written into the hash, debounced, with
// replaceState so the back button stays usable. Opening that link anywhere rebuilds the
// same sheet: the automaton and the terrain are both seeded, nothing is left to chance.
// A hash typed or pasted into the address bar of a live tab is picked up too, which is
// what makes the link work as a save file.

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
  let any = false;
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
    any = true;
  }
  return any;
}

function syncUrl() {
  if (urlTimer) clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    urlTimer = null;
    urlWritten = encodeState();
    const base = location.pathname + location.search;
    history.replaceState(null, '', urlWritten ? base + '#' + urlWritten : base);
    if (linkDiv) linkDiv.html(location.href);
  }, 250);
}

// Pull every control back to whatever the settings object now says — used after a scene,
// a reset, or a hash pasted into the address bar.
function refreshControls() {
  for (const k in setters) if (k in settings) setters[k](settings[k]);
  if (ruleInput) ruleInput.value(settings.caRule);
  updateRuleInfo();
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
// Seeded Perlin noise — the same improved Perlin as the earlier sketches, with a seeded
// permutation and 16 unit gradients.

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

function makePerlin(seed) {
  const rnd  = mulberry32(seed);
  const perm = new Uint8Array(512);
  const p    = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const gx = new Float64Array(16), gy = new Float64Array(16);
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;
    gx[i] = Math.cos(a); gy[i] = Math.sin(a);
  }

  return function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi,        yf = y - yi;
    const X  = xi & 255,      Y  = yi & 255;
    const u  = fade(xf),      v  = fade(yf);

    const h00 = perm[perm[X]     + Y]     & 15;
    const h10 = perm[perm[X + 1] + Y]     & 15;
    const h01 = perm[perm[X]     + Y + 1] & 15;
    const h11 = perm[perm[X + 1] + Y + 1] & 15;

    const n00 = gx[h00] * xf       + gy[h00] * yf;
    const n10 = gx[h10] * (xf - 1) + gy[h10] * yf;
    const n01 = gx[h01] * xf       + gy[h01] * (yf - 1);
    const n11 = gx[h11] * (xf - 1) + gy[h11] * (yf - 1);

    const a = n00 + (n10 - n00) * u;
    const b = n01 + (n11 - n01) * u;
    return a + (b - a) * v;
  };
}

// Fractal sum, normalised by the amplitudes so the result keeps the single-octave range.
function fbm(nz, x, y, octaves, lacunarity, persistence) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum  += amp * nz(x * freq, y * freq);
    norm += amp;
    amp  *= persistence;
    freq *= lacunarity;
  }
  return sum / norm;
}

////////////////////////////////////////////////////////////////////////////////////////
// Paper

function paperDims() {
  const [a, b] = PAPER_SIZES[settings.paper];
  return settings.orientation === 'portrait' ? [a, b] : [b, a];
}

// Where ink may land: inside the margin, and half a pen width further in, since a round
// nib reaches that far past the end of every line.
function drawBox() {
  const [W, H] = paperDims();
  const m = settings.margin + settings.penWidth / 2;
  return { W, H, x0: m, y0: m, x1: Math.max(m, W - m), y1: Math.max(m, H - m) };
}

function previewScale() {
  const [w, h] = paperDims();
  return Math.min(PREVIEW_MAX_PX / w, PREVIEW_MAX_PX / h);
}

////////////////////////////////////////////////////////////////////////////////////////

function setup() {
  applyState(location.hash.replace(/^#/, ''));
  urlWritten = encodeState();
  window.addEventListener('hashchange', onHashChange);

  const [w, h] = paperDims();
  const s = previewScale();
  createCanvas(Math.round(w * s), Math.round(h * s)).parent('canvas-container');
  applyCanvasDisplay();
  attachOrbit();
  attachKeys();
  buildControls();
  update();
}

function applyCanvasDisplay() {
  const [pw, ph] = paperDims();
  const scale = Math.min(MAX_PREVIEW_W / pw, MAX_PREVIEW_H / ph);
  const c = document.querySelector('#canvas-container canvas');
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
  const g = ensureGrid();

  if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
  view = planes = tones = shapes = plan = modelImg = null;
  strokes = 0;
  if (g.count > 0) {
    view   = makeView(g);
    planes = buildPlanes(g, view);
    fitView(view, planes);
    tones  = toneTable(view);
    shapes = buildShapes(g, view, planes, tones);
    strokes = shapes.off.length - 1;
    // Past the limit nothing is ordered, drawn or exported — the stats say why.
    if (strokes > MAX_STROKES) shapes = null;
    else plan = orderShapes(shapes);
  }

  lastMs = performance.now() - t0;
  drawPreview(false);
  updateStats();
  syncUrl();
}

// Called while a slider is being dragged. When a whole update cannot keep up, dragging
// simply waits for the mouse to come up.
function liveUpdate() {
  if (!settings.liveUpdate || lastMs > LIVE_BUDGET_MS) return;
  update();
}

////////////////////////////////////////////////////////////////////////////////////////
// The structure
//
// One byte per voxel, x fastest: index = x + nx·(y + ny·z), so a whole automaton
// generation is one contiguous layer. Only the settings that shape the voxels go into
// the signature — turning the camera or the lamp never rebuilds them.

function structureSignature() {
  const s = settings;
  const base = `${s.generator}|${s.sizeX}|${s.sizeY}|${s.sizeZ}`;
  if (s.generator === 'terrain') {
    return base + `|${s.fieldSeed}|${s.noiseScale}|${s.octaves}|${s.persistence}|` +
      `${s.baseHeight}|${s.peakGamma}`;
  }
  return base + `|${s.caRule}|${s.neighbourhood}|${s.caSeed}|${s.seedDensity}|` +
    `${s.seedRadius}|${s.seedValue}|${s.wrapEdges}|${s.warmup}|${s.genStep}|${s.timeDir}`;
}

function ensureGrid() {
  const sig = structureSignature();
  if (grid && grid.sig === sig) return grid;

  const nx = Math.round(clamp(settings.sizeX, 1, 256));
  const ny = Math.round(clamp(settings.sizeY, 1, 256));
  const nz = Math.round(clamp(settings.sizeZ, 1, 256));
  const vox = new Uint8Array(nx * ny * nz);
  if (settings.generator === 'terrain') buildTerrain(nx, ny, nz, vox);
  else buildAutomatonStack(nx, ny, nz, vox);

  // The bounding box of the filled voxels — the perspective camera orbits its centre and
  // keeps outside its sphere.
  let count = 0, i = 0;
  const bmin = [nx, ny, nz], bmax = [0, 0, 0];
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++, i++) {
        if (!vox[i]) continue;
        count++;
        if (x < bmin[0]) bmin[0] = x;
        if (y < bmin[1]) bmin[1] = y;
        if (z < bmin[2]) bmin[2] = z;
        if (x + 1 > bmax[0]) bmax[0] = x + 1;
        if (y + 1 > bmax[1]) bmax[1] = y + 1;
        if (z + 1 > bmax[2]) bmax[2] = z + 1;
      }
    }
  }
  grid = { nx, ny, nz, vox, count, sig, bmin, bmax };
  return grid;
}

// "B3/S23", "b3s23", "S23/B3" — anything with a B and an S followed by neighbour counts.
function parseCaRule(str) {
  const s = String(str).toUpperCase().replace(/\s+/g, '');
  const b = /B([0-8]*)/.exec(s), sv = /S([0-8]*)/.exec(s);
  if (!b || !sv) return null;
  let birth = 0, survive = 0;
  for (const ch of b[1])  birth   |= 1 << Number(ch);
  for (const ch of sv[1]) survive |= 1 << Number(ch);
  return { birth, survive };
}

function ruleString(r) {
  const digits = m => { let s = ''; for (let n = 0; n <= 8; n++) if ((m >> n) & 1) s += n; return s; };
  return `B${digits(r.birth)}/S${digits(r.survive)}`;
}

const MOORE_DX = [-1, 0, 1, -1, 1, -1, 0, 1];
const MOORE_DY = [-1, -1, -1, 0, 0, 1, 1, 1];
const VN_DX    = [0, -1, 1, 0];
const VN_DY    = [-1, 0, 0, 1];

function caStep(cur, nxt, nx, ny, rule, moore, wrap) {
  const DX = moore ? MOORE_DX : VN_DX, DY = moore ? MOORE_DY : VN_DY, K = DX.length;
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      let n = 0;
      for (let k = 0; k < K; k++) {
        let xx = x + DX[k], yy = y + DY[k];
        if (wrap) {
          if (xx < 0) xx += nx; else if (xx >= nx) xx -= nx;
          if (yy < 0) yy += ny; else if (yy >= ny) yy -= ny;
        } else if (xx < 0 || xx >= nx || yy < 0 || yy >= ny) continue;
        n += cur[xx + nx * yy];
      }
      const i = x + nx * y;
      nxt[i] = cur[i] ? (rule.survive >> n) & 1 : (rule.birth >> n) & 1;
    }
  }
}

function buildAutomatonStack(nx, ny, nz, vox) {
  const rule = parseCaRule(settings.caRule) || parseCaRule(DEFAULTS.caRule);
  const rnd  = mulberry32(settings.seedValue >>> 0);
  let cur = new Uint8Array(nx * ny), nxt = new Uint8Array(nx * ny);

  const cx = (nx - 1) / 2, cy = (ny - 1) / 2, r2 = settings.seedRadius ** 2;
  switch (settings.caSeed) {
    case 'center':
      cur[Math.floor(nx / 2) + nx * Math.floor(ny / 2)] = 1;
      break;
    case 'random':
      for (let i = 0; i < cur.length; i++) cur[i] = rnd() < settings.seedDensity ? 1 : 0;
      break;
    case 'random disc':
      for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
        const inside = (x - cx) ** 2 + (y - cy) ** 2 <= r2;
        const coin = rnd();                      // drawn for every cell, so the radius
        if (inside) cur[x + nx * y] = coin < settings.seedDensity ? 1 : 0; // keeps the pattern
      }
      break;
  }

  const moore = settings.neighbourhood === 'moore';
  const step = () => {
    caStep(cur, nxt, nx, ny, rule, moore, settings.wrapEdges);
    const t = cur; cur = nxt; nxt = t;
  };

  for (let w = 0; w < settings.warmup; w++) step();
  for (let t = 0; t < nz; t++) {
    const z = settings.timeDir === 'upwards' ? t : nz - 1 - t;
    vox.set(cur, z * nx * ny);
    for (let s = 0; s < settings.genStep; s++) step();
  }
}

// Columns of voxels, as tall as a Perlin height map says. The heights are stretched to
// fill the grid, so the highest column always reaches the top layer.
function buildTerrain(nx, ny, nz, vox) {
  const nzf = makePerlin(settings.fieldSeed >>> 0);
  const f   = 1 / Math.max(1, settings.noiseScale);
  const h   = new Float64Array(nx * ny);
  let lo = Infinity, hi = -Infinity;
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const v = fbm(nzf, (x + 0.5) * f + 0.37, (y + 0.5) * f + 0.61,
      settings.octaves, 2, settings.persistence);
    h[x + nx * y] = v;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const base = Math.round(clamp(settings.baseHeight, 1, nz));
  const span = Math.max(1e-9, hi - lo);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const t   = Math.pow((h[x + nx * y] - lo) / span, settings.peakGamma);
    const top = Math.min(nz, base + Math.round(t * (nz - base)));
    for (let z = 0; z < top; z++) vox[x + nx * (y + ny * z)] = 1;
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Camera, lamp and the fit onto the paper
//
//   cam   — unit vector pointing from the structure towards the camera
//   r, u  — the screen's right and up in world space
//
// Orthographic: every ray towards the camera is parallel to cam, the screen position of p
// is (p·r, −p·u), and lines that are parallel in space stay parallel on paper.
//
// Perspective: the camera stands at C = Q + dist·cam, where Q is the centre of the filled
// voxels and dist is chosen so that their bounding sphere just fills the field of view.
// The whole structure is therefore always in front of the camera and never around it,
// which keeps every later step simple: nothing needs clipping against a near plane, and a
// ray from the structure towards C that has left the structure's box can never meet a
// voxel again. With rel = p − C and depth d = −rel·cam, the screen position is
// (rel·r, −rel·u) / d.
//
// Either way the paper position is s·screen + o. The fit finds s and o for 100 %; zoom
// and pan then scale about the centre of the drawable box.

function makeView(g) {
  const th = deg(settings.azimuth), ph = deg(settings.elevation);
  const cam = [Math.cos(ph) * Math.cos(th), Math.cos(ph) * Math.sin(th), Math.sin(ph)];
  const r   = [-Math.sin(th), Math.cos(th), 0];
  const u   = [cam[1] * r[2] - cam[2] * r[1], cam[2] * r[0] - cam[0] * r[2],
               cam[0] * r[1] - cam[1] * r[0]];

  const la = deg(settings.azimuth + settings.lightAzimuth), le = deg(settings.lightElevation);
  const light = [Math.cos(le) * Math.cos(la), Math.cos(le) * Math.sin(la), Math.sin(le)];

  const persp = settings.projection === 'perspective';
  const Q = [0, 1, 2].map(k => (g.bmin[k] + g.bmax[k]) / 2);
  const R = 0.5 * Math.hypot(g.bmax[0] - g.bmin[0], g.bmax[1] - g.bmin[1],
                             g.bmax[2] - g.bmin[2]);
  const dist = R / Math.sin(deg(clamp(settings.fov, 1, 120)) / 2);
  const C = [0, 1, 2].map(k => Q[k] + dist * cam[k]);

  return { persp, cam, r, u, light, Q, R, dist, C, box: drawBox(),
    s: 1, ox: 0, oy: 0, s0: 1, ox0: 0, oy0: 0, zoom: 1, panX: 0, panY: 0 };
}

// Screen position before the fit.
function screenXY(v, x, y, z, out) {
  if (v.persp) {
    const rx = x - v.C[0], ry = y - v.C[1], rz = z - v.C[2];
    const d = -(rx * v.cam[0] + ry * v.cam[1] + rz * v.cam[2]);
    out[0] =  (rx * v.r[0] + ry * v.r[1] + rz * v.r[2]) / d;
    out[1] = -(rx * v.u[0] + ry * v.u[1] + rz * v.u[2]) / d;
  } else {
    out[0] =  x * v.r[0] + y * v.r[1] + z * v.r[2];
    out[1] = -(x * v.u[0] + y * v.u[1] + z * v.u[2]);
  }
}

function toPaper(v, x, y, z, out) {
  screenXY(v, x, y, z, out);
  out[0] = v.s * out[0] + v.ox;
  out[1] = v.s * out[1] + v.oy;
}

// Distance in front of the camera — only perspective divides by it.
function depthOf(v, x, y, z) {
  return v.persp
    ? -((x - v.C[0]) * v.cam[0] + (y - v.C[1]) * v.cam[1] + (z - v.C[2]) * v.cam[2])
    : 1;
}

// The fit. Every face the camera can see belongs to a plane, and the outline of a solid
// is the outline of its visible-side faces, so their corners bound the drawing exactly.
function fitView(v, pl) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const c = [0, 0, 0], xy = [0, 0];
  for (const P of pl) {
    const m = P.mask, NU = P.NU;
    const has = (i, j) => i >= P.u0 && i < P.u1 && j >= P.v0 && j < P.v1 && m[i + NU * j] === 1;
    c[P.ax] = P.L;
    for (let vv = P.v0; vv <= P.v1; vv++) {
      for (let uu = P.u0; uu <= P.u1; uu++) {
        if (!(has(uu, vv) || has(uu - 1, vv) || has(uu, vv - 1) || has(uu - 1, vv - 1))) continue;
        c[P.ua] = uu; c[P.va] = vv;
        screenXY(v, c[0], c[1], c[2], xy);
        if (xy[0] < x0) x0 = xy[0];
        if (xy[0] > x1) x1 = xy[0];
        if (xy[1] < y0) y0 = xy[1];
        if (xy[1] > y1) y1 = xy[1];
      }
    }
  }
  if (!(x1 > x0)) { x0 = -1; x1 = 1; }
  if (!(y1 > y0)) { y0 = -1; y1 = 1; }

  const b = v.box;
  const bcx = (b.x0 + b.x1) / 2, bcy = (b.y0 + b.y1) / 2;
  v.s0  = Math.min((b.x1 - b.x0) / (x1 - x0), (b.y1 - b.y0) / (y1 - y0));
  v.ox0 = bcx - v.s0 * (x0 + x1) / 2;
  v.oy0 = bcy - v.s0 * (y0 + y1) / 2;
  applyZoom(v);
}

// Zoom and pan act on the fitted drawing: the point `pan` (mm from the centre of the box,
// measured at 100 %) is brought to the centre of the box and everything scales about it.
function applyZoom(v) {
  const b = v.box, bcx = (b.x0 + b.x1) / 2, bcy = (b.y0 + b.y1) / 2;
  v.zoom = clamp(settings.zoom, MIN_ZOOM, MAX_ZOOM) / 100;
  v.panX = settings.panX;
  v.panY = settings.panY;
  v.s  = v.zoom * v.s0;
  v.ox = bcx + v.zoom * (v.ox0 - bcx - v.panX);
  v.oy = bcy + v.zoom * (v.oy0 - bcy - v.panY);
}

// Millimetres on paper for one voxel edge — everywhere in orthographic, at the centre of
// the structure in perspective.
function voxelMm(v) { return v.persp ? v.s / v.dist : v.s; }

////////////////////////////////////////////////////////////////////////////////////////
// Walking the grid
//
// Amanatides & Woo: from a point, step from voxel to voxel along a direction, always
// crossing whichever cell wall the ray reaches first. The walk stops at the first filled
// voxel, or as soon as the ray has left the grid in a direction it can never come back
// from. The direction does not need to be unit length — the steps only compare with
// each other.

function blockedDir(px, py, pz, dx, dy, dz) {
  const nx = grid.nx, ny = grid.ny, nz = grid.nz, vox = grid.vox, nxy = nx * ny;
  const sx = dx > 1e-12 ? 1 : dx < -1e-12 ? -1 : 0;
  const sy = dy > 1e-12 ? 1 : dy < -1e-12 ? -1 : 0;
  const sz = dz > 1e-12 ? 1 : dz < -1e-12 ? -1 : 0;
  const kx = sx ? 1 / Math.abs(dx) : Infinity;
  const ky = sy ? 1 / Math.abs(dy) : Infinity;
  const kz = sz ? 1 / Math.abs(dz) : Infinity;
  let ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
  let tx = sx > 0 ? (ix + 1 - px) * kx : sx < 0 ? (px - ix) * kx : Infinity;
  let ty = sy > 0 ? (iy + 1 - py) * ky : sy < 0 ? (py - iy) * ky : Infinity;
  let tz = sz > 0 ? (iz + 1 - pz) * kz : sz < 0 ? (pz - iz) * kz : Infinity;

  for (;;) {
    // Outside the grid on a side the ray is heading away from: nothing more to meet.
    if (ix < 0 ? sx <= 0 : ix >= nx ? sx >= 0 : false) return false;
    if (iy < 0 ? sy <= 0 : iy >= ny ? sy >= 0 : false) return false;
    if (iz < 0 ? sz <= 0 : iz >= nz ? sz >= 0 : false) return false;
    if (ix >= 0 && ix < nx && iy >= 0 && iy < ny && iz >= 0 && iz < nz &&
        vox[ix + nx * iy + nxy * iz]) return true;

    if (tx < ty) {
      if (tx < tz) { ix += sx; tx += kx; } else { iz += sz; tz += kz; }
    } else {
      if (ty < tz) { iy += sy; ty += ky; } else { iz += sz; tz += kz; }
    }
  }
}

// The camera sees a point when nothing stands between them: along cam in orthographic,
// straight at C in perspective. The lamp is always infinitely far away.
function seesCamera(v, x, y, z) {
  return v.persp
    ? !blockedDir(x, y, z, v.C[0] - x, v.C[1] - y, v.C[2] - z)
    : !blockedDir(x, y, z, v.cam[0], v.cam[1], v.cam[2]);
}

function inShadow(v, x, y, z) {
  return blockedDir(x, y, z, v.light[0], v.light[1], v.light[2]);
}

////////////////////////////////////////////////////////////////////////////////////////
// The surface
//
// Faces are grouped by orientation o = 2·axis + (normal negative ? 1 : 0) and by the
// plane they lie in. A plane keeps a mask over its (u, v) cells, one byte per face, the
// bounding box of the faces it holds and their centroid. Faces turned away from the
// camera are never collected: they cannot be seen, whatever stands in front of them. In
// perspective that is decided per plane — which side of it the camera stands on.

function facesCamera(v, ax, sg, L) {
  return v.persp ? sg * (v.C[ax] - L) > FRONT_EPS : sg * v.cam[ax] > FRONT_EPS;
}

function buildPlanes(g, v) {
  const dims   = [g.nx, g.ny, g.nz];
  const stride = [1, g.nx, g.nx * g.ny];
  const out = [];

  for (let ax = 0; ax < 3; ax++) {
    const [ua, va] = AXES_UV[ax];
    const NU = dims[ua], NV = dims[va], NA = dims[ax];
    const buf = new Uint8Array(NU * NV);

    for (const sg of [1, -1]) {
      const o = ax * 2 + (sg > 0 ? 0 : 1);

      for (let L = 0; L <= NA; L++) {
        if (!facesCamera(v, ax, sg, L)) continue;
        // The face at plane coordinate L belongs to the voxel behind it and needs the one
        // in front of it to be empty — or to lie outside the grid.
        const inside = sg > 0 ? L - 1 : L;
        if (inside < 0 || inside >= NA) continue;
        const hasOut = inside + sg >= 0 && inside + sg < NA;
        const outStep = sg * stride[ax];

        let count = 0, u0 = NU, u1 = -1, v0 = NV, v1 = -1, su = 0, sv = 0;
        for (let vv = 0; vv < NV; vv++) {
          for (let uu = 0; uu < NU; uu++) {
            const at = inside * stride[ax] + uu * stride[ua] + vv * stride[va];
            const on = g.vox[at] && !(hasOut && g.vox[at + outStep]) ? 1 : 0;
            buf[uu + NU * vv] = on;
            if (on) {
              count++;
              su += uu + 0.5;
              sv += vv + 0.5;
              if (uu < u0) u0 = uu;
              if (uu > u1) u1 = uu;
              if (vv < v0) v0 = vv;
              if (vv > v1) v1 = vv;
            }
          }
        }
        if (count) {
          out.push({ o, ax, sg, L, ua, va, NU, NV, mask: buf.slice(), count,
            u0, u1: u1 + 1, v0, v1: v1 + 1, cu: su / count, cv: sv / count });
        }
      }
    }
  }
  return out;
}

// Where a face points on the sheet, in words — "top", "left wall +X", …
function orientationName(o) {
  const ax = o >> 1, sg = o & 1 ? -1 : 1;
  if (ax === 2) return sg > 0 ? 'top' : 'underside';
  const side = view && sg * view.r[ax] < 0 ? 'left' : 'right';
  return `${side} wall ${sg > 0 ? '+' : '−'}${'XY'[ax]}`;
}

////////////////////////////////////////////////////////////////////////////////////////
// Tone
//
// Brightness is ambient plus Lambert, shifted by the exposure; darkness is what is left.
// Layer i of N switches on once the darkness passes (i + 1) / (N + 1). A face of one
// orientation can only be in two states — lit or in shadow — so all that is needed per
// orientation is how many layers each state gets. Layers beyond the lit count and
// within the shadow count are the ones that only draw inside a cast shadow.

function layerThreshold(i, N) { return (i + 1) / (N + 1); }

function toneTable(v) {
  const N   = Math.round(clamp(settings.layers, 1, 4));
  const amb = clamp(settings.ambient / 100, 0, 1);
  const out = [];
  for (let o = 0; o < 6; o++) {
    const ax = o >> 1, sg = o & 1 ? -1 : 1;
    const lam  = Math.max(0, sg * v.light[ax]);
    const bLit = clamp(amb + (1 - amb) * lam + settings.exposure, 0, 1);
    const bSh  = clamp(amb + settings.exposure, 0, 1);
    let lit = 0, sh = 0;
    for (let i = 0; i < N; i++) {
      if (1 - bLit > layerThreshold(i, N)) lit++;
      if (1 - bSh  > layerThreshold(i, N)) sh++;
    }
    // A face turned away from the lamp is its own shadow — nothing left to cast on it.
    if (!settings.shadows || lam === 0) sh = lit;
    out.push({ lam, bLit, bSh, lit, sh });
  }
  return out;
}

////////////////////////////////////////////////////////////////////////////////////////
// Hatching
//
// On one plane a family of hatch lines is a set of 2D lines  u·wu + v·wv = c  across its
// (u, v) mask. Three kinds:
//
//   along edges   — { p : p[across] = (k + phase)·σ }: the lines follow the cube edges.
//                   σ is chosen so that the spacing on paper is the setting, measured at
//                   the centroid of the plane's faces — exact everywhere in orthographic;
//                   in perspective the lines close up with distance the way the cube
//                   edges themselves do.
//   screen angle, orthographic — { p : p·W = (k + phase)·σ } with W a direction on the
//                   sheet lifted into space: one angle, one spacing on every face.
//   screen angle, perspective — the points that land on one paper line lie on the plane
//                   through the camera and that line, and its intersection with a face
//                   plane is again a straight line. The spacing on paper stays exact.
//
// A 2D grid walk collects the runs of consecutive faces along each line, so a line
// crosses a whole floor in one stroke. Only the part of a plane that lands inside the
// drawable box is walked, so zooming in does not multiply the work.

function hatchPlanes(v, pl, tn, sink) {
  const layers = PATTERN_LAYERS[settings.hatchPattern] || PATTERN_LAYERS.cross;
  const screenPersp = settings.hatchMode === 'screen angle' && v.persp;

  for (const P of pl) {
    const t = tn[P.o];
    const n = Math.max(t.lit, t.sh);
    if (!n) continue;
    const win = planeWindow(v, P);
    if (!win) continue;
    const fams = [null, null];
    for (let i = 0; i < n; i++) {
      const [fam, phase] = layers[i];
      if (screenPersp) {
        hatchScreenPersp(v, P, win, fam, phase, i >= t.lit, sink);
        continue;
      }
      if (fams[fam] === null) fams[fam] = planeFamily(v, P, fam) || false;
      if (fams[fam]) hatchFixed(v, P, win, fams[fam], phase, i >= t.lit, sink);
    }
  }
}

// Paper displacement per unit step along one axis, at the point c.
const STEP_A = [0, 0], STEP_B = [0, 0];

function paperStep(v, c, axis) {
  const h = 1e-3;
  c[axis] += h;     toPaper(v, c[0], c[1], c[2], STEP_A);
  c[axis] -= 2 * h; toPaper(v, c[0], c[1], c[2], STEP_B);
  c[axis] += h;
  return [(STEP_A[0] - STEP_B[0]) / (2 * h), (STEP_A[1] - STEP_B[1]) / (2 * h)];
}

// { W, sigma } for the along-edges family, or the orthographic screen-angle one.
function planeFamily(v, P, fam) {
  const S = Math.max(0.05, settings.hatchSpacing);

  if (settings.hatchMode === 'screen angle') {
    const a = deg(settings.hatchAngle + (fam ? 90 : 0));
    const sa = Math.sin(a), ca = Math.cos(a);
    return { W: [0, 1, 2].map(k => v.r[k] * sa - v.u[k] * ca), sigma: S / v.s };
  }

  const ax = P.ax;
  let across;                                      // the axis the lines are spaced along
  if (ax === 2) {
    across = fam === 0 ? 1 : 0;
  } else {
    const horizontal = ax === 0 ? 1 : 0;
    const verticalFirst = settings.wallHatch === 'vertical';
    across = (fam === 0) === verticalFirst ? horizontal : 2;
  }
  const along = 3 - ax - across;

  // Paper spacing of lines one unit apart along `across`: the projected offset measured
  // perpendicular to the projected line direction.
  const c = [0, 0, 0];
  c[ax] = P.L; c[P.ua] = P.cu; c[P.va] = P.cv;
  const [dX, dY] = paperStep(v, c, along);
  const [wX, wY] = paperStep(v, c, across);
  const dl = Math.hypot(dX, dY);
  if (dl < 1e-9) return null;                      // the lines would project to points
  const k = Math.abs(dX * wY - dY * wX) / dl;
  if (k < 1e-9) return null;
  const W = [0, 0, 0];
  W[across] = 1;
  return { W, sigma: S / k };
}

function hatchFixed(v, P, win, F, phase, shadowOnly, sink) {
  const W = F.W, sig = F.sigma;
  const wu = W[P.ua], wv = W[P.va];
  if (wu * wu + wv * wv < 1e-12) return;
  const wl = W[P.ax] * P.L;

  let cmin = Infinity, cmax = -Infinity;
  for (const uu of [win.u0, win.u1]) {
    for (const vv of [win.v0, win.v1]) {
      const c = wl + uu * wu + vv * wv;
      if (c < cmin) cmin = c;
      if (c > cmax) cmax = c;
    }
  }
  const k0 = Math.ceil(cmin / sig - phase), k1 = Math.floor(cmax / sig - phase);
  for (let k = k0; k <= k1; k++) {
    hatchLine(v, P, win, wu, wv, (k + phase) * sig - wl + LINE_JITTER, shadowOnly, sink);
  }
}

// The paper line  X·a + Y·b = c  (a = sin, b = cos of the hatch angle) is the image of the
// plane  rel · (s·(a·r − b·u) + (c − ox·a − oy·b)·cam) = 0  through the camera.
function hatchScreenPersp(v, P, win, fam, phase, shadowOnly, sink) {
  const S  = Math.max(0.05, settings.hatchSpacing);
  const al = deg(settings.hatchAngle + (fam ? 90 : 0));
  const a = Math.sin(al), b = Math.cos(al);

  // A projective map keeps the extremes of a paper coordinate on the corners.
  let cmin = Infinity, cmax = -Infinity;
  const c = [0, 0, 0], xy = [0, 0];
  c[P.ax] = P.L;
  for (const uu of [win.u0, win.u1]) {
    for (const vv of [win.v0, win.v1]) {
      c[P.ua] = uu; c[P.va] = vv;
      toPaper(v, c[0], c[1], c[2], xy);
      const cp = xy[0] * a + xy[1] * b;
      if (cp < cmin) cmin = cp;
      if (cp > cmax) cmax = cp;
    }
  }

  const M = [0, 1, 2].map(k => v.s * (a * v.r[k] - b * v.u[k]));
  const N = [0, 0, 0];
  const k0 = Math.ceil(cmin / S - phase), k1 = Math.floor(cmax / S - phase);
  for (let k = k0; k <= k1; k++) {
    const cq = (k + phase) * S - v.ox * a - v.oy * b;
    for (let i = 0; i < 3; i++) N[i] = M[i] + cq * v.cam[i];
    const cc = v.C[0] * N[0] + v.C[1] * N[1] + v.C[2] * N[2] - P.L * N[P.ax];
    hatchLine(v, P, win, N[P.ua], N[P.va], cc + LINE_JITTER, shadowOnly, sink);
  }
}

const RUNS = [];                                   // scratch: u0, v0, u1, v1 per run
const A3 = [0, 0, 0], B3 = [0, 0, 0];

function hatchLine(v, P, win, wu, wv, c, shadowOnly, sink) {
  if (wu * wu + wv * wv < 1e-18) return;
  lineRuns(P, win, wu, wv, c);
  const lift = P.sg * EPS_OFF;                     // test points sit just off the face
  for (let r = 0; r < RUNS.length; r += 4) {
    A3[P.ax] = P.L + lift; A3[P.ua] = RUNS[r];     A3[P.va] = RUNS[r + 1];
    B3[P.ax] = P.L + lift; B3[P.ua] = RUNS[r + 2]; B3[P.va] = RUNS[r + 3];
    cutSegment(v, A3, B3, shadowOnly, sink);
  }
}

// The part of a plane's bounding box that lands inside the drawable box: the four corners
// of the box, sent back through the camera onto the plane. In perspective a corner whose
// ray never meets the plane in front of the camera means the plane runs off to its
// horizon there, and the whole bounding box is kept.
function planeWindow(v, P) {
  const b = v.box, ax = P.ax;
  const X = [b.x0, b.x1, b.x1, b.x0], Y = [b.y0, b.y0, b.y1, b.y1];
  let u0 = Infinity, u1 = -Infinity, w0 = Infinity, w1 = -Infinity;

  for (let i = 0; i < 4; i++) {
    const sx = (X[i] - v.ox) / v.s, sy = (Y[i] - v.oy) / v.s;
    let hu, hv;
    if (v.persp) {
      const D = [0, 1, 2].map(k => sx * v.r[k] - sy * v.u[k] - v.cam[k]);
      if (Math.abs(D[ax]) < 1e-12) { u0 = w0 = -Infinity; u1 = w1 = Infinity; break; }
      const lam = (P.L - v.C[ax]) / D[ax];
      if (!(lam > 0)) { u0 = w0 = -Infinity; u1 = w1 = Infinity; break; }
      hu = v.C[P.ua] + lam * D[P.ua];
      hv = v.C[P.va] + lam * D[P.va];
    } else {
      const O = [0, 1, 2].map(k => sx * v.r[k] - sy * v.u[k]);
      const lam = (P.L - O[ax]) / v.cam[ax];       // a plane that faces the camera: cam[ax] ≠ 0
      hu = O[P.ua] + lam * v.cam[P.ua];
      hv = O[P.va] + lam * v.cam[P.va];
    }
    if (hu < u0) u0 = hu;
    if (hu > u1) u1 = hu;
    if (hv < w0) w0 = hv;
    if (hv > w1) w1 = hv;
  }

  const win = {
    u0: Math.max(P.u0, u0 - 1e-6), u1: Math.min(P.u1, u1 + 1e-6),
    v0: Math.max(P.v0, w0 - 1e-6), v1: Math.min(P.v1, w1 + 1e-6),
  };
  return win.u1 > win.u0 && win.v1 > win.v0 ? win : null;
}

// The runs of one 2D line  u·wu + v·wv = c  over the faces of a plane, inside `win`.
function lineRuns(P, win, wu, wv, c) {
  RUNS.length = 0;
  const inv = 1 / (wu * wu + wv * wv);
  const pu = wu * c * inv, pv = wv * c * inv;      // foot of the line
  const du = -wv, dv = wu;                         // its direction

  let t0 = -Infinity, t1 = Infinity;
  if (Math.abs(du) < 1e-12) {
    if (pu <= win.u0 || pu >= win.u1) return;
  } else {
    let a = (win.u0 - pu) / du, b = (win.u1 - pu) / du;
    if (a > b) { const t = a; a = b; b = t; }
    if (a > t0) t0 = a;
    if (b < t1) t1 = b;
  }
  if (Math.abs(dv) < 1e-12) {
    if (pv <= win.v0 || pv >= win.v1) return;
  } else {
    let a = (win.v0 - pv) / dv, b = (win.v1 - pv) / dv;
    if (a > b) { const t = a; a = b; b = t; }
    if (a > t0) t0 = a;
    if (b < t1) t1 = b;
  }
  if (!(t1 - t0 > 1e-9)) return;

  const su = du > 1e-12 ? 1 : du < -1e-12 ? -1 : 0;
  const sv = dv > 1e-12 ? 1 : dv < -1e-12 ? -1 : 0;
  const tIn = t0 + 1e-7 * (t1 - t0);
  let iu = clamp(Math.floor(pu + du * tIn), P.u0, P.u1 - 1);
  let iv = clamp(Math.floor(pv + dv * tIn), P.v0, P.v1 - 1);
  const tdu = su ? Math.abs(1 / du) : Infinity;
  const tdv = sv ? Math.abs(1 / dv) : Infinity;
  let tnu = su > 0 ? (iu + 1 - pu) / du : su < 0 ? (iu - pu) / du : Infinity;
  let tnv = sv > 0 ? (iv + 1 - pv) / dv : sv < 0 ? (iv - pv) / dv : Infinity;

  const mask = P.mask, NU = P.NU;
  let t = t0, open = false, ts = 0;
  for (;;) {
    const tn = Math.min(tnu, tnv, t1);
    if (tn - t > 1e-12) {
      const on = iu >= P.u0 && iu < P.u1 && iv >= P.v0 && iv < P.v1 && mask[iu + NU * iv] === 1;
      if (on && !open) { open = true; ts = t; }
      else if (!on && open) {
        open = false;
        RUNS.push(pu + du * ts, pv + dv * ts, pu + du * t, pv + dv * t);
      }
      t = tn;
    }
    if (tn >= t1) break;
    if (tnu <= tnv) { iu += su; tnu += tdu; } else { iv += sv; tnv += tdv; }
  }
  if (open) RUNS.push(pu + du * ts, pv + dv * ts, pu + du * t1, pv + dv * t1);
}

// Sample pred at n points over [ta, tb] and hand every run where it holds to emit, with
// each change of state narrowed down by bisection.
const T_IN = 1e-4;                                 // the ends sit on face borders — look inside

function cutByPredicate(pred, ta, tb, n, emit) {
  const at = t => pred(t < T_IN ? T_IN : t > 1 - T_IN ? 1 - T_IN : t);
  let prevT = ta, prevOn = at(ta), start = ta;
  for (let i = 1; i < n; i++) {
    const t  = ta + (tb - ta) * i / (n - 1);
    const on = at(t);
    if (on !== prevOn) {
      let a = prevT, b = t;
      for (let k = 0; k < BISECT; k++) {
        const m = (a + b) / 2;
        if (at(m) === prevOn) a = m; else b = m;
      }
      const x = (a + b) / 2;
      if (on) start = x; else emit(start, x);
    }
    prevT = t;
    prevOn = on;
  }
  if (prevOn) emit(start, tb);
}

// The part of A→B that lands inside the drawable box, as [t0, t1, paper length], or null.
// The clip happens on paper; perspective turns the paper fraction λ back into t through
// the depths of the two ends.
const PA = [0, 0], PB = [0, 0];

function segmentWindow(v, ax, ay, az, bx, by, bz) {
  toPaper(v, ax, ay, az, PA);
  toPaper(v, bx, by, bz, PB);
  const c = clipRange(PA[0], PA[1], PB[0], PB[1], v.box);
  if (!c) return null;
  const len = Math.hypot(PB[0] - PA[0], PB[1] - PA[1]) * (c[1] - c[0]);
  if (!v.persp) return [c[0], c[1], len];
  const dA = depthOf(v, ax, ay, az), dB = depthOf(v, bx, by, bz);
  const tOf = l => l * dA / (dB * (1 - l) + l * dA);
  return [tOf(c[0]), tOf(c[1]), len];
}

function cutSegment(v, A, B, shadowOnly, sink) {
  const ax = A[0], ay = A[1], az = A[2];
  const dx = B[0] - ax, dy = B[1] - ay, dz = B[2] - az;
  const w = segmentWindow(v, ax, ay, az, B[0], B[1], B[2]);
  if (!w || w[2] < MIN_STROKE) return;

  const pred = t => {
    const x = ax + dx * t, y = ay + dy * t, z = az + dz * t;
    if (!seesCamera(v, x, y, z)) return false;
    return !shadowOnly || inShadow(v, x, y, z);
  };
  const n = Math.max(2, Math.ceil(w[2] / SAMPLE_MM) + 1);
  cutByPredicate(pred, w[0], w[1], n, (t0, t1) => {
    toPaper(v, ax + dx * t0, ay + dy * t0, az + dz * t0, PA);
    toPaper(v, ax + dx * t1, ay + dy * t1, az + dz * t1, PB);
    sink.seg(PA[0], PA[1], PB[0], PB[1]);
  });
}

////////////////////////////////////////////////////////////////////////////////////////
// Edges
//
// Every unit edge a visible face would draw is flagged in a per-axis array, with one bit
// for each face that owns it: which of the two perpendicular axes the face's normal lies
// on, the normal's sign, and which way the face extends from the edge. A point on the
// edge is visible if it is visible from just inside *any* of those faces — lifted off the
// face and moved a hair into it, so a concave corner is tested from the open side.
//
// In "outlines" an edge between two faces of the same plane is not flagged, so a flat
// region keeps only its border. The flagged edges are then walked line by line, and the
// visible pieces of neighbouring unit edges are joined into one stroke.

function edgeLines(g, v, pl, sink) {
  if (settings.edges === 'none') return;
  const every = settings.edges === 'every voxel';
  const dims  = [g.nx, g.ny, g.nz];
  const flags = [0, 1, 2].map(A => {
    const [B, C] = AXES_UV[A];
    return new Uint8Array(dims[A] * (dims[B] + 1) * (dims[C] + 1));
  });

  const c3 = [0, 0, 0];
  const mark = (A, ax, sg, inward) => {
    const [B, C] = AXES_UV[A];
    const idx = c3[A] + dims[A] * (c3[B] + (dims[B] + 1) * c3[C]);
    const bit = (ax === B ? 0 : 4) + (sg > 0 ? 2 : 0) + (inward > 0 ? 1 : 0);
    flags[A][idx] |= 1 << bit;
  };

  for (const P of pl) {
    const { ax, sg, L, ua, va, NU, NV, mask } = P;
    for (let vv = P.v0; vv < P.v1; vv++) {
      for (let uu = P.u0; uu < P.u1; uu++) {
        const k = uu + NU * vv;
        if (!mask[k]) continue;
        c3[ax] = L;
        // the two sides across u — edges running along v
        c3[va] = vv;
        if (every || uu === 0      || !mask[k - 1])  { c3[ua] = uu;     mark(va, ax, sg, +1); }
        if (every || uu === NU - 1 || !mask[k + 1])  { c3[ua] = uu + 1; mark(va, ax, sg, -1); }
        // the two sides across v — edges running along u
        c3[ua] = uu;
        if (every || vv === 0      || !mask[k - NU]) { c3[va] = vv;     mark(ua, ax, sg, +1); }
        if (every || vv === NV - 1 || !mask[k + NU]) { c3[va] = vv + 1; mark(ua, ax, sg, -1); }
      }
    }
  }

  const q = [0, 0, 0], base = [0, 0, 0];
  const e0 = [0, 0, 0], e1 = [0, 0, 0], p0 = [0, 0, 0], p1 = [0, 0, 0];

  for (let A = 0; A < 3; A++) {
    const [B, C] = AXES_UV[A];
    const NA = dims[A], fl = flags[A];

    // The test-point offset for each of the eight bits.
    const offs = [];
    for (let b = 0; b < 8; b++) {
      const o = [0, 0, 0];
      o[b < 4 ? B : C] = (b & 2 ? 1 : -1) * EPS_OFF;
      o[b < 4 ? C : B] = (b & 1 ? 1 : -1) * EPS_OFF;
      offs.push(o);
    }

    let open = false, s0 = 0, s1 = 0;
    const flush = () => {
      if (!open) return;
      open = false;
      p0[B] = p1[B] = base[B];
      p0[C] = p1[C] = base[C];
      p0[A] = s0; p1[A] = s1;
      toPaper(v, p0[0], p0[1], p0[2], PA);
      toPaper(v, p1[0], p1[1], p1[2], PB);
      sink.seg(PA[0], PA[1], PB[0], PB[1]);
    };

    for (let c = 0; c <= dims[C]; c++) {
      for (let b = 0; b <= dims[B]; b++) {
        flush();
        base[B] = e0[B] = e1[B] = q[B] = b;
        base[C] = e0[C] = e1[C] = q[C] = c;
        const row = NA * (b + (dims[B] + 1) * c);
        for (let a = 0; a < NA; a++) {
          const f = fl[row + a];
          if (!f) { flush(); continue; }
          e0[A] = a; e1[A] = a + 1;
          const w = segmentWindow(v, e0[0], e0[1], e0[2], e1[0], e1[1], e1[2]);
          if (!w) { flush(); continue; }
          const pred = t => {
            q[A] = a + t;
            for (let bit = 0; bit < 8; bit++) {
              if (!(f & (1 << bit))) continue;
              const o = offs[bit];
              if (seesCamera(v, q[0] + o[0], q[1] + o[1], q[2] + o[2])) return true;
            }
            return false;
          };
          const n = Math.max(2, Math.ceil(w[2] / SAMPLE_MM) + 1);
          cutByPredicate(pred, w[0], w[1], n, (t0, t1) => {
            if (open && Math.abs(s1 - (a + t0)) < 1e-6) { s1 = a + t1; return; }
            flush();
            open = true; s0 = a + t0; s1 = a + t1;
          });
        }
      }
    }
    flush();
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// The plot

// Liang–Barsky against a box: the range [λ0, λ1] of the segment that lies inside it, or
// null when nothing does.
function clipRange(x0, y0, x1, y1, b) {
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dy = y1 - y0;
  const P = [-dx, dx, -dy, dy];
  const Q = [x0 - b.x0, b.x1 - x0, y0 - b.y0, b.y1 - y0];
  for (let i = 0; i < 4; i++) {
    if (P[i] === 0) { if (Q[i] < 0) return null; continue; }
    const r = Q[i] / P[i];
    if (P[i] < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
    else          { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return [t0, t1];
}

function makeSink(box) {
  const pts = [], off = [0];
  return {
    pts, off,
    seg(x0, y0, x1, y1) {
      const inside = x0 >= box.x0 && x0 <= box.x1 && x1 >= box.x0 && x1 <= box.x1 &&
                     y0 >= box.y0 && y0 <= box.y1 && y1 >= box.y0 && y1 <= box.y1;
      if (!inside) {
        const c = clipRange(x0, y0, x1, y1, box);
        if (!c) return;
        const dx = x1 - x0, dy = y1 - y0;
        [x0, y0, x1, y1] = [x0 + dx * c[0], y0 + dy * c[0], x0 + dx * c[1], y0 + dy * c[1]];
      }
      if (Math.hypot(x1 - x0, y1 - y0) < MIN_STROKE) return;
      pts.push(x0, y0, x1, y1);
      off.push(pts.length / 2);
    },
    // A dot is a stub too short to see as a line: the pen goes down, and comes back up.
    dot(x, y) {
      pts.push(x - DOT_MM / 2, y, x + DOT_MM / 2, y);
      off.push(pts.length / 2);
    },
  };
}

// The rectangle the image is cut out along: around the strokes themselves, or around the
// drawable area, pushed out by the offset and kept on the sheet.
function cutFrame(v, pts, strokesEnd) {
  let x0, y0, x1, y1;
  if (settings.cutAround === 'drawing') {
    x0 = y0 = Infinity; x1 = y1 = -Infinity;
    for (let i = 0; i < strokesEnd * 2; i += 2) {
      if (pts[i] < x0) x0 = pts[i];
      if (pts[i] > x1) x1 = pts[i];
      if (pts[i + 1] < y0) y0 = pts[i + 1];
      if (pts[i + 1] > y1) y1 = pts[i + 1];
    }
    if (!(x1 >= x0)) return null;
    const half = settings.penWidth / 2;            // the ink reaches past the line
    x0 -= half; y0 -= half; x1 += half; y1 += half;
  } else {
    ({ x0, y0, x1, y1 } = drawBox());
    const half = settings.penWidth / 2;
    x0 -= half; y0 -= half; x1 += half; y1 += half;
  }
  const [W, H] = paperDims(), d = settings.cutOffset, e = settings.penWidth / 2;
  return {
    x0: clamp(x0 - d, e, W - e), y0: clamp(y0 - d, e, H - e),
    x1: clamp(x1 + d, e, W - e), y1: clamp(y1 + d, e, H - e),
  };
}

// Dots along the cut frame: one on every corner, and each side split evenly so no two
// dots are further apart than the setting.
function cutDots(f, sink) {
  const gap = Math.max(1, settings.cutGap);
  const w = f.x1 - f.x0, h = f.y1 - f.y0;
  const nx = Math.max(1, Math.ceil(w / gap - 1e-9));
  const ny = Math.max(1, Math.ceil(h / gap - 1e-9));
  for (let i = 0; i <= nx; i++) {                  // top and bottom, corners included
    const x = f.x0 + w * i / nx;
    sink.dot(x, f.y0);
    sink.dot(x, f.y1);
  }
  for (let j = 1; j < ny; j++) {                   // the sides, corners already placed
    const y = f.y0 + h * j / ny;
    sink.dot(f.x0, y);
    sink.dot(f.x1, y);
  }
  return { nx, ny, gapX: w / nx, gapY: h / ny };
}

function buildShapes(g, v, pl, tn) {
  const sink = makeSink(v.box);
  hatchPlanes(v, pl, tn, sink);
  const hatch = sink.off.length - 1;
  edgeLines(g, v, pl, sink);
  const lines = sink.off.length - 1;

  let cut = null;
  if (settings.cutMarks) {
    const f = cutFrame(v, sink.pts, sink.off[lines]);
    if (f) cut = { ...f, ...cutDots(f, sink) };
  }
  return {
    pts: Float64Array.from(sink.pts),
    off: Int32Array.from(sink.off),
    hatch,
    edges: lines - hatch,
    dots: sink.off.length - 1 - lines,
    cut,
  };
}

////////////////////////////////////////////////////////////////////////////////////////
// Stroke order
//
// Greedy nearest-neighbour over stroke endpoints, either end allowed as the entry point,
// with a uniform bucket grid so the search stays local — the same pass as in the
// terrace sketch. vpype's linesort would redo it regardless.

function orderShapes(sh) {
  const { pts, off } = sh;
  const n = off.length - 1;
  const order = new Int32Array(n);
  const flip  = new Uint8Array(n);
  if (n === 0) return { order, flip, ink: 0, travel: 0 };

  if (!settings.optimiseOrder) {
    for (let i = 0; i < n; i++) order[i] = i;
    return { order, flip, ...measurePlan(sh, order, flip) };
  }

  const N  = 2 * n;
  const ex = new Float64Array(N);
  const ey = new Float64Array(N);
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;

  for (let i = 0; i < n; i++) {
    const a = off[i] * 2, b = (off[i + 1] - 1) * 2;
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
  let px = 0, py = 0, best = -1, bestD = Infinity;

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
    order[done] = i;
    flip[done]  = best & 1;                // entered by the far end -> draw it reversed

    const exitE = i * 2 + (flip[done] ? 0 : 1);
    px = ex[exitE];
    py = ey[exitE];
  }

  return { order, flip, ...measurePlan(sh, order, flip) };
}

function measurePlan(sh, order, flip) {
  const { pts, off } = sh;
  let ink = 0, travel = 0, px = 0, py = 0;

  for (let t = 0; t < order.length; t++) {
    const i = order[t], rev = flip[t] === 1;
    const a = off[i], b = off[i + 1];
    const inA = rev ? b - 1 : a;
    const inB = rev ? a : b - 1;

    travel += Math.hypot(pts[inA * 2] - px, pts[inA * 2 + 1] - py);
    for (let k = a; k < b - 1; k++) {
      ink += Math.hypot(pts[(k + 1) * 2] - pts[k * 2], pts[(k + 1) * 2 + 1] - pts[k * 2 + 1]);
    }
    px = pts[inB * 2];
    py = pts[inB * 2 + 1];
  }
  return { ink, travel };
}

////////////////////////////////////////////////////////////////////////////////////////
// Preview
//
// The strokes are drawn straight on the 2D context from the same segments the SVG
// exports, so what you see is what the plotter draws. Under them, optionally, sits the
// structure itself: every visible-side face filled with the grey of the tone the hatching
// gives it, painted back to front. It is never exported.
//
// For equal cubes on a lattice the painter's order is exact with a simple key. Two cubes
// that overlap on screen are separated along some axis, and the one on the camera's side
// of that gap is in front — in orthographic that is the one further along cam, in
// perspective the one whose centre lies closer to C along every axis where they differ,
// so their L1 distances to C already order them.

function buildModel() {
  if (!view || !planes || !tones) return null;
  const v = view, pl = planes, pd = pixelDensity();
  const cv = document.createElement('canvas');
  cv.width  = Math.round(width * pd);
  cv.height = Math.round(height * pd);
  const ctx = cv.getContext('2d');
  const s = previewScale() * pd;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.beginPath();                                 // the plot is cropped here, so is the model
  ctx.rect(v.box.x0, v.box.y0, v.box.x1 - v.box.x0, v.box.y1 - v.box.y0);
  ctx.clip();

  let F = 0;
  for (const P of pl) F += P.count;
  const depth = new Float64Array(F), pidx = new Int32Array(F), cidx = new Int32Array(F);
  let f = 0;
  const cam = v.cam, C = v.C, c = [0, 0, 0];
  pl.forEach((P, pi) => {
    c[P.ax] = P.L - 0.5 * P.sg;                    // centre of the voxel behind the face
    for (let vv = P.v0; vv < P.v1; vv++) {
      for (let uu = P.u0; uu < P.u1; uu++) {
        const k = uu + P.NU * vv;
        if (!P.mask[k]) continue;
        c[P.ua] = uu + 0.5; c[P.va] = vv + 0.5;
        depth[f] = v.persp
          ? -(Math.abs(c[0] - C[0]) + Math.abs(c[1] - C[1]) + Math.abs(c[2] - C[2]))
          : c[0] * cam[0] + c[1] * cam[1] + c[2] * cam[2];
        pidx[f] = pi; cidx[f] = k; f++;
      }
    }
  });
  const order = new Uint32Array(F);
  for (let i = 0; i < F; i++) order[i] = i;
  order.sort((a, b) => depth[a] - depth[b]);

  const N = Math.max(1, Math.round(settings.layers));
  const greys = [];
  for (let l = 0; l <= N; l++) {
    const gv = Math.round(236 - 176 * l / N);
    greys.push(`rgb(${gv},${gv},${gv})`);
  }
  ctx.lineWidth = 0.8 / s;                         // closes the hairline seams between faces
  ctx.lineJoin  = 'round';

  const xy = [0, 0];
  const CU = [0, 1, 1, 0], CV = [0, 0, 1, 1];
  for (let t = 0; t < F; t++) {
    const i = order[t], P = pl[pidx[i]], k = cidx[i];
    const uu = k % P.NU, vv = (k / P.NU) | 0;
    const tn = tones[P.o];
    let lvl = tn.lit;
    if (tn.sh !== tn.lit) {
      c[P.ax] = P.L + P.sg * EPS_OFF; c[P.ua] = uu + 0.5; c[P.va] = vv + 0.5;
      if (inShadow(v, c[0], c[1], c[2])) lvl = tn.sh;
    }
    ctx.fillStyle = ctx.strokeStyle = greys[lvl];
    ctx.beginPath();
    for (let m = 0; m < 4; m++) {
      c[P.ax] = P.L; c[P.ua] = uu + CU[m]; c[P.va] = vv + CV[m];
      toPaper(v, c[0], c[1], c[2], xy);
      if (m) ctx.lineTo(xy[0], xy[1]); else ctx.moveTo(xy[0], xy[1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  return cv;
}

// While the camera is being dragged only the shaded model is drawn, at full strength —
// the hatching is recomputed when the mouse comes up. While zooming or panning, the last
// model and plot are only scaled and moved (xf: paper → paper, P' = k·P + t), clipped to
// the drawable box, until the gesture settles and everything is computed again.
function drawPreview(dragging, xf) {
  background(255);
  const ctx = drawingContext;
  const ps = previewScale();
  const [W, H] = paperDims();

  ctx.save();
  ctx.scale(ps, ps);                               // from here on, millimetres
  if (xf) {
    const b = drawBox();
    ctx.beginPath();
    ctx.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    ctx.clip();
    ctx.transform(xf.k, 0, 0, xf.k, xf.tx, xf.ty);
  }

  if (dragging || settings.showModel) {
    if (!modelImg) modelImg = buildModel();
    if (modelImg) {
      ctx.save();
      ctx.globalAlpha = dragging ? 1 : clamp(settings.modelOpacity / 100, 0, 1);
      ctx.drawImage(modelImg, 0, 0, W, H);
      ctx.restore();
    }
  }

  if (!dragging && shapes) {
    const { pts, off } = shapes;
    const n = off.length - 1;
    ctx.strokeStyle = settings.inkColor;
    ctx.lineWidth   = settings.penWidth / (xf ? xf.k : 1);
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    const CHUNK = 4000;
    for (let i0 = 0; i0 < n; i0 += CHUNK) {
      const i1 = Math.min(n, i0 + CHUNK);
      ctx.beginPath();
      for (let i = i0; i < i1; i++) {
        const a = off[i], b = off[i + 1];
        ctx.moveTo(pts[a * 2], pts[a * 2 + 1]);
        for (let k = a + 1; k < b; k++) ctx.lineTo(pts[k * 2], pts[k * 2 + 1]);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

////////////////////////////////////////////////////////////////////////////////////////
// Moving the camera with the mouse
//
//   drag             — turn the camera around the structure
//   wheel            — zoom, keeping the point under the cursor where it is
//   Shift / right-drag — pan
//
// Listeners sit on the canvas itself rather than on p5's global mouse events, so dragging
// a slider in the panel never moves the camera.

let orbit = null, orbitFrame = 0, settleTimer = null;

function canvasEl() { return document.querySelector('#canvas-container canvas'); }

// Client pixels → millimetres on the sheet.
function paperPoint(e) {
  const rect = canvasEl().getBoundingClientRect();
  const [W, H] = paperDims();
  return [(e.clientX - rect.left) / rect.width * W, (e.clientY - rect.top) / rect.height * H];
}

function attachOrbit() {
  const c = canvasEl();
  if (!c) return;

  c.addEventListener('contextmenu', e => e.preventDefault());

  c.addEventListener('pointerdown', e => {
    orbit = {
      pan: e.shiftKey || e.button === 1 || e.button === 2,
      x: e.clientX, y: e.clientY, p: paperPoint(e),
      az: settings.azimuth, el: settings.elevation, panX: settings.panX, panY: settings.panY,
      moved: false,
    };
    c.setPointerCapture(e.pointerId);
    c.style.cursor = orbit.pan ? 'move' : 'grabbing';
  });

  c.addEventListener('pointermove', e => {
    if (!orbit) return;
    const dx = e.clientX - orbit.x, dy = e.clientY - orbit.y;
    if (!orbit.moved && Math.hypot(dx, dy) < 3) return;
    orbit.moved = true;

    if (orbit.pan) {
      const p = paperPoint(e), z = settings.zoom / 100;
      settings.panX = orbit.panX - (p[0] - orbit.p[0]) / z;
      settings.panY = orbit.panY - (p[1] - orbit.p[1]) / z;
      transformPreview();
      return;
    }
    settings.azimuth   = ((Math.round(orbit.az - dx * ORBIT_DEG_PX) % 360) + 360) % 360;
    settings.elevation = clamp(Math.round(orbit.el + dy * ORBIT_DEG_PX), -90, 90);
    setters.azimuth(settings.azimuth);
    setters.elevation(settings.elevation);
    if (!orbitFrame) orbitFrame = requestAnimationFrame(() => { orbitFrame = 0; orbitPreview(); });
  });

  const end = () => {
    if (!orbit) return;
    const moved = orbit.moved;
    orbit = null;
    c.style.cursor = '';
    if (orbitFrame) { cancelAnimationFrame(orbitFrame); orbitFrame = 0; }
    if (moved) update();
  };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', end);

  c.addEventListener('wheel', e => {
    e.preventDefault();
    if (orbit) return;
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    zoomAbout(Math.exp(-delta * WHEEL_ZOOM), paperPoint(e));
  }, { passive: false });
}

// Zoom by a factor, keeping the paper point m where it is — the centre of the drawable
// box when none is given: pan' = pan + (m − centre)·(1/z − 1/z').
function zoomAbout(factor, m) {
  if (!view) return;
  const b = drawBox(), bcx = (b.x0 + b.x1) / 2, bcy = (b.y0 + b.y1) / 2;
  const z  = settings.zoom / 100;
  const z2 = clamp(Math.round(z * factor * 1000) / 1000, MIN_ZOOM / 100, MAX_ZOOM / 100);
  if (z2 === z) return;
  if (m) {
    settings.panX += (m[0] - bcx) * (1 / z - 1 / z2);
    settings.panY += (m[1] - bcy) * (1 / z - 1 / z2);
  }
  settings.zoom = Math.round(z2 * 1000) / 10;
  setters.zoom(settings.zoom);
  transformPreview();
  settleLater();
}

function settleLater() {
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = setTimeout(update, SETTLE_MS);
}

// Keyboard control of the camera. A text field, a select or a slider keeps its own keys —
// the arrows would otherwise move the camera and the focused control at once.
function attachKeys() {
  window.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable ||
        (t.tagName === 'INPUT' && !['checkbox', 'button', 'color'].includes(t.type)))) return;
    if (e.metaKey || e.ctrlKey || e.altKey || orbit) return;

    const z = settings.zoom / 100;
    const orbitBy = (dAz, dEl) => {
      settings.azimuth   = ((settings.azimuth + dAz) % 360 + 360) % 360;
      settings.elevation = clamp(settings.elevation + dEl, -90, 90);
      setters.azimuth(settings.azimuth);
      setters.elevation(settings.elevation);
      orbitPreview();
      settleLater();
    };
    const panBy = (dx, dy) => {
      settings.panX += dx / z;
      settings.panY += dy / z;
      transformPreview();
      settleLater();
    };

    switch (e.key) {
      case 'ArrowLeft':  if (e.shiftKey) panBy(-KEY_PAN_MM, 0); else orbitBy(KEY_ORBIT_DEG, 0);  break;
      case 'ArrowRight': if (e.shiftKey) panBy(KEY_PAN_MM, 0);  else orbitBy(-KEY_ORBIT_DEG, 0); break;
      case 'ArrowUp':    if (e.shiftKey) panBy(0, -KEY_PAN_MM); else orbitBy(0, KEY_ORBIT_DEG);  break;
      case 'ArrowDown':  if (e.shiftKey) panBy(0, KEY_PAN_MM);  else orbitBy(0, -KEY_ORBIT_DEG); break;
      case '+': case '=': zoomAbout(KEY_ZOOM); break;
      case '-': case '_': zoomAbout(1 / KEY_ZOOM); break;
      case '0': resetZoom(); break;
      case 'p': case 'P':
        settings.projection = settings.projection === 'perspective' ? 'orthographic' : 'perspective';
        setters.projection(settings.projection);
        syncVisibility();
        update();
        break;
      default: return;
    }
    e.preventDefault();
  });
}

// The paper transform from the last computed view to the current zoom and pan:
// P' = k·P + centre·(1 − k) + z'·(pan − pan').
function transformPreview() {
  if (!view) return;
  const b = view.box, bcx = (b.x0 + b.x1) / 2, bcy = (b.y0 + b.y1) / 2;
  const z2 = clamp(settings.zoom, MIN_ZOOM, MAX_ZOOM) / 100;
  const k = z2 / view.zoom;
  drawPreview(false, {
    k,
    tx: bcx * (1 - k) + z2 * (view.panX - settings.panX),
    ty: bcy * (1 - k) + z2 * (view.panY - settings.panY),
  });
}

function orbitPreview() {
  const g = ensureGrid();
  if (!g.count) return;
  view   = makeView(g);
  planes = buildPlanes(g, view);
  fitView(view, planes);
  tones  = toneTable(view);
  shapes = plan = null;
  modelImg = buildModel();
  drawPreview(true);
}

////////////////////////////////////////////////////////////////////////////////////////
// UI

function buildControls() {
  const root = 'controls';

  // --- Pen ---
  addSection(root, 'Pen');
  addSlider(root, 'Pen width (mm)', 'penWidth', 0.1, 2, 0.05);
  addColor(root, 'Ink', 'inkColor');

  // --- Paper ---
  addSection(root, 'Paper');
  addSelect(root, 'Size', 'paper', Object.keys(PAPER_SIZES), resizeForPaper);
  addSelect(root, 'Orientation', 'orientation', ['portrait', 'landscape'], resizeForPaper);
  addSlider(root, 'Margin (mm)', 'margin', 0, 60, 1);
  addCheckbox(root, 'Cut guide dots around the image', 'cutMarks');
  addSelect(root, 'Dots go around', 'cutAround', CUT_AROUND, update,
    '<b>drawing</b> — the strokes themselves, ink included.<br>' +
    '<b>drawable area</b> — the margin line, the same frame whatever is drawn.');
  addSlider(root, 'Cut line offset (mm)', 'cutOffset', 0, 50, 0.5,
    'White border left between the image and the cut. The frame never leaves the sheet.');
  addSlider(root, 'Most between two dots (mm)', 'cutGap', 5, 300, 1,
    'A dot on every corner, and each side split evenly so no gap is wider than this — ' +
    'lay a ruler through two dots and cut.');

  // --- Structure ---
  addSection(root, 'Structure');
  addSelect(root, 'Generator', 'generator', GENERATORS, () => { syncVisibility(); update(); },
    '<b>automaton stack</b> — a 2D automaton, one generation per layer.<br>' +
    '<b>terrain</b> — columns as tall as a Perlin height map.');
  addSlider(root, 'Width X (voxels)', 'sizeX', 1, 128, 1);
  addSlider(root, 'Depth Y (voxels)', 'sizeY', 1, 128, 1);
  addSlider(root, 'Height Z (voxels)', 'sizeZ', 1, 128, 1,
    'For the automaton, the number of generations stacked.');

  // --- Automaton stack ---
  autoGroup = createDiv('').parent(root).class('group');
  addSection(autoGroup, 'Automaton stack');

  const ruleField = createDiv('').parent(autoGroup).class('field');
  createSpan('Rule  (B…/S…)').parent(ruleField).class('label');
  ruleInput = createInput(settings.caRule).parent(ruleField);
  ruleInput.attribute('type', 'text');
  ruleInput.attribute('placeholder', 'B3/S23');
  ruleInput.style('width', '100%');
  ruleInput.style('box-sizing', 'border-box');
  ruleInput.style('font-family', 'monospace');
  ruleInput.input(() => {
    const r = parseCaRule(ruleInput.value());
    if (r) { settings.caRule = ruleString(r); update(); }
    updateRuleInfo();
  });
  ruleInfoDiv = createDiv('').parent(autoGroup).class('rule-info');
  updateRuleInfo();

  const presetField = createDiv('').parent(autoGroup).class('field');
  createSpan('Rule preset').parent(presetField).class('label');
  const presetSel = createSelect().parent(presetField);
  for (const p of CA_PRESETS) presetSel.option(p.label);
  presetSel.changed(() => {
    const p = CA_PRESETS[presetSel.elt.selectedIndex];
    if (p && p.rule) {
      settings.caRule = p.rule;
      ruleInput.value(p.rule);
      updateRuleInfo();
      update();
    }
  });

  addSelect(autoGroup, 'Neighbourhood', 'neighbourhood', NEIGHBOURHOODS, update,
    '<b>moore</b> — the eight cells around, counts 0–8.<br>' +
    '<b>von neumann</b> — the four edge neighbours, counts 0–4.');
  addSelect(autoGroup, 'Seed', 'caSeed', CA_SEEDS, () => { syncVisibility(); update(); });
  addSlider(autoGroup, 'Seed density', 'seedDensity', 0.01, 1, 0.01);
  addSlider(autoGroup, 'Seed radius (cells)', 'seedRadius', 1, 64, 1);
  addSeedField(autoGroup, 'Seed value', 'seedValue');
  addCheckbox(autoGroup, 'Wrap edges', 'wrapEdges');
  addSlider(autoGroup, 'Warm-up generations', 'warmup', 0, 500, 1,
    'Generations run before the first layer — the opening transient cut off.');
  addSlider(autoGroup, 'Generation step', 'genStep', 1, 8, 1,
    'One layer every n-th generation.');
  addSelect(autoGroup, 'Time runs', 'timeDir', TIME_DIRS, update,
    '<b>downwards</b> — the first generation is the top layer, so a pattern that grows ' +
    'stands on its widest layer.<br><b>upwards</b> — the first generation is the ground.');

  // --- Terrain ---
  terrGroup = createDiv('').parent(root).class('group');
  addSection(terrGroup, 'Terrain');
  addSeedField(terrGroup, 'Field seed', 'fieldSeed');
  addSlider(terrGroup, 'Feature size (voxels)', 'noiseScale', 2, 200, 1);
  addSlider(terrGroup, 'Octaves', 'octaves', 1, 6, 1);
  addSlider(terrGroup, 'Persistence', 'persistence', 0.1, 0.9, 0.01);
  addSlider(terrGroup, 'Base (voxels)', 'baseHeight', 1, 64, 1,
    'Every column is at least this tall; the tallest always reaches the top.');
  addSlider(terrGroup, 'Peak sharpness', 'peakGamma', 0.3, 4, 0.05,
    'Above 1 the ground flattens and the peaks narrow; below 1 the hills swell into ' +
    'plateaus.');

  // --- Camera ---
  addSection(root, 'Camera');
  createDiv(
    '<div><kbd>drag</kbd> turn the camera</div>' +
    '<div><kbd>wheel</kbd> zoom into the point under the cursor</div>' +
    '<div><kbd>Shift</kbd>+<kbd>drag</kbd> or <kbd>right-drag</kbd> pan</div>' +
    '<div><kbd>←</kbd> <kbd>→</kbd> azimuth, <kbd>↑</kbd> <kbd>↓</kbd> elevation ' +
    `(${KEY_ORBIT_DEG}°)</div>` +
    '<div><kbd>Shift</kbd>+<kbd>arrows</kbd> pan</div>' +
    '<div><kbd>+</kbd> <kbd>−</kbd> zoom, <kbd>0</kbd> reset zoom and pan</div>' +
    '<div><kbd>P</kbd> orthographic ⇄ perspective</div>' +
    '<div class="dim">While the camera moves only a quick preview follows; the hatching ' +
    'is redrawn once it settles. Keys work whenever no text field has the focus.</div>'
  ).parent(root).class('note keys');
  addSelect(root, 'Projection', 'projection', PROJECTIONS, () => { syncVisibility(); update(); },
    '<b>orthographic</b> — parallel rays: nothing shrinks with distance, the classic ' +
    'axonometric look.<br><b>perspective</b> — a camera at a finite distance. The ' +
    'wider the field of view, the closer it stands and the harder the lines converge.');
  addSlider(root, 'Field of view (°)', 'fov', 5, 120, 1,
    'The angle the structure\'s bounding sphere fills. Around 5° is nearly orthographic, ' +
    'past 90° is a wide-angle lens.');
  addSlider(root, 'Azimuth (°)', 'azimuth', 0, 360, 1);
  addSlider(root, 'Elevation (°)', 'elevation', -90, 90, 1,
    '35° is close to isometric, 90° looks straight down.');
  addSlider(root, 'Zoom (%)', 'zoom', MIN_ZOOM, MAX_ZOOM, 1,
    'At 100 % the structure just fits inside the margin. Past that it is cropped at the ' +
    'margin, every line cut exactly where it leaves. Only the part inside is computed, so ' +
    'zooming in stays fast.');
  createButton('Reset zoom and pan').parent(root).mousePressed(resetZoom);

  // --- Light ---
  addSection(root, 'Light');
  addSlider(root, 'Direction (° from the view)', 'lightAzimuth', -180, 180, 1,
    'Measured from the camera, so the light stays put on the sheet while the structure ' +
    'turns. Negative comes from the left.');
  addSlider(root, 'Height (°)', 'lightElevation', 1, 90, 1);
  addSlider(root, 'Ambient (%)', 'ambient', 0, 100, 1,
    'The light a face still gets when it is turned away from the lamp or in shadow.');
  addSlider(root, 'Exposure', 'exposure', -0.5, 0.5, 0.01,
    'Brightens (+) or darkens (−) every face at once — moves the tones across the ' +
    'layer thresholds.');
  addCheckbox(root, 'Cast shadows', 'shadows');

  // --- Hatching ---
  addSection(root, 'Hatching');
  addSlider(root, 'Line spacing (mm)', 'hatchSpacing', 0.2, 5, 0.05,
    'The spacing of one layer on paper, the same on every face whatever its angle.');
  addSlider(root, 'Tone layers', 'layers', 1, 4, 1,
    'How many layers the darkest face gets. Each one switches on at its own darkness, ' +
    'evenly spaced between white and black.');
  addSelect(root, 'Pattern', 'hatchPattern', HATCH_PATTERNS, update,
    '<b>cross</b> — one direction, then across it, then both again at half the spacing.' +
    '<br><b>parallel</b> — one direction only, each layer halving the gaps.');
  addSelect(root, 'Direction', 'hatchMode', HATCH_MODES, () => { syncVisibility(); update(); },
    '<b>along edges</b> — the lines follow the cube edges, so every face reads as a ' +
    'plane in space.<br><b>screen angle</b> — one angle on the whole sheet, like a print.');
  addSelect(root, 'First layer on walls', 'wallHatch', WALL_HATCH, update);
  addSlider(root, 'Hatch angle (°)', 'hatchAngle', 0, 180, 1);
  addSelect(root, 'Edges', 'edges', EDGE_MODES, update,
    '<b>outlines</b> — the border of every flat region, and nothing inside it.<br>' +
    '<b>every voxel</b> — each cube face outlined.<br><b>none</b> — tone alone.');

  // --- Scenes ---
  addSection(root, 'Scenes');
  const sceneSel = createSelect().parent(createDiv('').parent(root).class('field'));
  for (const s of SCENES) sceneSel.option(s.label);
  sceneSel.changed(() => {
    const s = SCENES[sceneSel.elt.selectedIndex];
    if (s && s.s) applyScene(s.s);
  });

  // --- View ---
  addSection(root, 'View');
  addCheckbox(root, 'Show the shaded model', 'showModel', true);
  addSlider(root, 'Model opacity (%)', 'modelOpacity', 0, 100, 1, null, true);
  addCheckbox(root, 'Live update while dragging', 'liveUpdate', true);

  // --- Stats + actions ---
  addSection(root, 'Plot');
  statsDiv = createDiv('').parent(root).class('stats');
  createButton('Regenerate').parent(root).mousePressed(update);
  createButton('Generate SVG').parent(root).class('primary').mousePressed(exportSvg);
  addCheckbox(root, 'Optimise stroke order', 'optimiseOrder');

  syncVisibility();

  // --- Link ---
  addSection(root, 'Link');
  createDiv('Every setting lives in the address bar. Copy the link to keep this sheet, ' +
    'paste it into another tab to get it back.').parent(root).class('note');
  const linkRow = createDiv('').parent(root).class('btn-row');
  const copyBtn = createButton('Copy link').parent(linkRow);
  copyBtn.mousePressed(() => copyLink(copyBtn));
  createButton('Reset').parent(linkRow).mousePressed(resetAll);
  linkDiv = createDiv(location.href).parent(root).class('link');
}

function addSection(parent, title) {
  createDiv(title).parent(parent).class('section');
}

function setVisible(key, on) {
  if (fieldDivs[key]) fieldDivs[key].style('display', on ? '' : 'none');
}

function syncVisibility() {
  const auto = settings.generator === 'automaton stack';
  if (autoGroup) autoGroup.style('display', auto ? '' : 'none');
  if (terrGroup) terrGroup.style('display', auto ? 'none' : '');
  setVisible('seedDensity',  settings.caSeed !== 'center');
  setVisible('seedRadius',   settings.caSeed === 'random disc');
  setVisible('seedValue',    settings.caSeed !== 'center');
  setVisible('wallHatch',    settings.hatchMode === 'along edges');
  setVisible('hatchAngle',   settings.hatchMode === 'screen angle');
  setVisible('modelOpacity', settings.showModel);
  setVisible('fov',          settings.projection === 'perspective');
  setVisible('cutAround',    settings.cutMarks);
  setVisible('cutOffset',    settings.cutMarks);
  setVisible('cutGap',       settings.cutMarks);
}

function resetZoom() {
  settings.zoom = 100;
  settings.panX = settings.panY = 0;
  setters.zoom(settings.zoom);
  update();
}

function updateRuleInfo() {
  if (!ruleInfoDiv) return;
  const typed = ruleInput ? ruleInput.value() : settings.caRule;
  const r = parseCaRule(typed);
  ruleInfoDiv.html(r
    ? `<span class="rule-hex">${ruleString(r)}</span>&nbsp;&nbsp;` +
      `<span class="rule-bin">born on ${ruleString(r).split('/')[0].slice(1) || '—'}, ` +
      `survives on ${ruleString(r).split('/')[1].slice(1) || '—'}</span>`
    : `<span class="warn">not a B…/S… rule — still drawing ${settings.caRule}</span>`);
}

function applyScene(patch) {
  Object.assign(settings, DEFAULTS, patch);
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

  const refresh = () => { if (redrawOnly) { drawPreview(false); syncUrl(); } else update(); };
  setters[key] = v => { sl.value(v); num.value(String(v)); };

  sl.input(() => {
    settings[key] = Number(sl.value());
    num.value(String(settings[key]));
    if (redrawOnly) drawPreview(false); else liveUpdate();
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
    if (redrawOnly) { drawPreview(false); syncUrl(); } else update();
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
    drawPreview(false);
    syncUrl();
  });
  return cp;
}

function addSeedField(parent, labelText, key) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const row = createDiv('').parent(field).class('row');
  const inp = createInput(String(settings[key])).parent(row);
  inp.attribute('inputmode', 'numeric');
  inp.style('flex', '1');
  inp.style('min-width', '0');
  setters[key] = v => inp.value(String(v));
  inp.input(() => {
    const v = parseNum(inp.value());
    if (v === null) return;
    settings[key] = Math.round(v);
    update();
  });
  createButton('Random').parent(row).class('inline-btn').mousePressed(() => {
    settings[key] = Math.floor(Math.random() * 1e9);
    inp.value(String(settings[key]));
    update();
  });
  return inp;
}

////////////////////////////////////////////////////////////////////////////////////////

// The smallest gap the darkest tone leaves between two lines of one direction.
function densestGap() {
  const layers = (PATTERN_LAYERS[settings.hatchPattern] || PATTERN_LAYERS.cross)
    .slice(0, Math.round(settings.layers));
  let best = Infinity;
  for (const fam of [0, 1]) {
    const ph = layers.filter(l => l[0] === fam).map(l => l[1]).sort((a, b) => a - b);
    for (let i = 0; i < ph.length; i++) {
      const next = i + 1 < ph.length ? ph[i + 1] : ph[0] + 1;
      best = Math.min(best, next - ph[i]);
    }
  }
  return best * settings.hatchSpacing;
}

function updateStats() {
  if (!statsDiv) return;
  const g = grid;

  if (!g || g.count === 0) {
    statsDiv.html(`<div class="warn">The structure is empty — no voxel survived. Try ` +
      `another rule or seed, or a denser seed.</div>`);
    return;
  }
  if (!plan) {
    statsDiv.html(
      `<div class="warn">${groupNum(strokes)} strokes — past the ${groupNum(MAX_STROKES)} ` +
      `limit, so nothing was ordered or drawn.<br>Widen the line spacing, drop a tone ` +
      `layer, or use a smaller structure.</div>`
    );
    return;
  }

  const cells = g.nx * g.ny * g.nz;
  let faces = 0;
  for (const P of planes) faces += P.count;
  const seconds = strokes * PEN_CYCLE_S + plan.ink / DRAW_SPEED + plan.travel / TRAVEL_SPEED;
  const gap = densestGap();
  const voxMm = voxelMm(view);

  let toneRows = '';
  const order = [4, 5, 0, 1, 2, 3];
  for (const o of order) {
    const t = tones[o];
    const n = planes.reduce((a, P) => a + (P.o === o ? P.count : 0), 0);
    if (!n) continue;
    const sh = t.sh !== t.lit ? ` <span class="dim">· ${t.sh} in shadow</span>` : '';
    toneRows += `<div class="legend"><span class="tone-name">${orientationName(o)}</span>` +
      `<b>${t.lit}</b>&nbsp;layer${t.lit === 1 ? '' : 's'}${sh} ` +
      `<span class="dim">${groupNum(n)} faces</span></div>`;
  }

  let warn = '';
  if (strokes > BUSY_STROKES) {
    warn += `<div class="warn">${groupNum(strokes)} strokes is a very long plot — and a ` +
      `big SVG.</div>`;
  }
  if (settings.hatchSpacing > voxMm * 1.5) {
    warn += `<div class="warn">A voxel is ${voxMm.toFixed(2)} mm on paper and the lines ` +
      `run ${settings.hatchSpacing} mm apart — single cubes will mostly miss the hatch. ` +
      `Tighten the spacing or use a smaller structure.</div>`;
  }

  statsDiv.html(
    `<div>Grid <b>${g.nx} × ${g.ny} × ${g.nz}</b> = ${groupNum(cells)} cells</div>` +
    `<div class="big">Filled <b>${groupNum(g.count)}</b> ` +
    `<span class="dim">= ${(100 * g.count / cells).toFixed(1)} %</span></div>` +
    `<div>Voxel edge <b>${voxMm.toFixed(2)} mm</b> on paper` +
    `${view.persp ? ' <span class="dim">at the centre</span>' : ''}</div>` +
    `<div>Faces towards the camera <b>${groupNum(faces)}</b> ` +
    `<span class="dim">in ${groupNum(planes.length)} planes</span></div>` +
    toneRows +
    `<div>Densest gap <b>${gap.toFixed(2)} mm</b> — ` +
    (gap <= settings.penWidth
      ? `<span class="ok">the darkest tone closes up solid</span>`
      : `<span class="dim">${(gap - settings.penWidth).toFixed(2)} mm of paper left</span>`) +
    `</div>` +
    `<div>Strokes <b>${groupNum(strokes)}</b> <span class="dim">` +
    `${groupNum(shapes.hatch)} hatch + ${groupNum(shapes.edges)} edges` +
    `${shapes.dots ? ` + ${shapes.dots} dots` : ''}</span></div>` +
    (shapes.cut
      ? `<div>Cut frame <b>${(shapes.cut.x1 - shapes.cut.x0).toFixed(1)} × ` +
        `${(shapes.cut.y1 - shapes.cut.y0).toFixed(1)} mm</b> <span class="dim">dots every ` +
        `${shapes.cut.gapX.toFixed(1)} / ${shapes.cut.gapY.toFixed(1)} mm</span></div>`
      : '') +
    `<div>Draws <b>${(plan.ink / 1000).toFixed(1)} m</b>, travels ` +
    `<b>${(plan.travel / 1000).toFixed(1)} m</b> with the pen up</div>` +
    `<div>Rough plot time <b>${formatDuration(seconds)}</b></div>` +
    `<div class="dim">generated in ${Math.round(lastMs)} ms</div>` +
    warn
  );
}

////////////////////////////////////////////////////////////////////////////////////////
// SVG export
//
// One stroke group, no fills, no background rectangle — everything in the file is meant
// to be plotted. stroke-width is the pen width and the caps are round, so the file
// previews exactly as the finished plot looks. Strokes come out in the order the pen
// should visit them, each already flipped to the end it should be entered from, and the
// link that rebuilds the sheet is written into the header comment.

function structureTag() {
  const s = settings;
  return s.generator === 'terrain'
    ? `terrain f${s.fieldSeed}`
    : `${s.caRule.replace('/', '-')} ${s.caSeed}${s.caSeed === 'center' ? '' : s.seedValue}`;
}

function metaComment() {
  const s = settings;
  const struct = s.generator === 'terrain'
    ? `terrain seed=${s.fieldSeed} scale=${s.noiseScale} oct=${s.octaves}/${s.persistence} ` +
      `base=${s.baseHeight} gamma=${s.peakGamma}`
    : `automaton rule=${s.caRule} ${s.neighbourhood} seed=${s.caSeed}/${s.seedValue}` +
      `${s.caSeed === 'center' ? '' : '@' + s.seedDensity} wrap=${s.wrapEdges} ` +
      `warmup=${s.warmup} step=${s.genStep} time=${s.timeDir}`;
  return `voxel hatching — ${struct} ` +
    `grid=${grid.nx}x${grid.ny}x${grid.nz} filled=${grid.count} ` +
    `camera=${s.projection}${s.projection === 'perspective' ? '@' + s.fov + '°' : ''} ` +
    `${s.azimuth}°/${s.elevation}° zoom=${s.zoom}% pan=${+s.panX.toFixed(2)},${+s.panY.toFixed(2)} ` +
    `${s.cutMarks ? `cut=${s.cutAround}+${s.cutOffset}mm<=${s.cutGap}mm ` : ''}` +
    `light=${s.lightAzimuth}°/${s.lightElevation}° ambient=${s.ambient}% ` +
    `exposure=${s.exposure}${s.shadows ? ' shadows' : ''} ` +
    `hatch=${s.hatchSpacing}mm x${s.layers} ${s.hatchPattern} ${s.hatchMode}` +
    `${s.hatchMode === 'screen angle' ? '@' + s.hatchAngle + '°' : '/' + s.wallHatch} ` +
    `edges=${s.edges} pen=${s.penWidth}mm strokes=${shapes.off.length - 1}`;
}

function exportSvg() {
  if (!view || !shapes || !plan || shapes.off.length - 1 === 0) {
    alert('Nothing to export — the structure is empty, or there are too many strokes.');
    return;
  }

  const [W, H] = paperDims();
  const { pts, off } = shapes;
  const { order, flip } = plan;
  const f = n => String(+n.toFixed(3));
  const CHUNK = 400;                       // subpaths per <path>, keeps the DOM small

  let body = '', d = '', held = 0;
  for (let t = 0; t < order.length; t++) {
    const i = order[t], rev = flip[t] === 1;
    const a = off[i], b = off[i + 1];
    let k  = rev ? b - 1 : a;
    let px = pts[k * 2], py = pts[k * 2 + 1];
    d += `M${f(px)},${f(py)}`;
    for (let m = 1; m < b - a; m++) {
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

  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- ${metaComment()} -->\n` +
    `<!-- ${location.origin === 'null' ? '' : location.origin}${location.pathname}#${encodeState()} -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n` +
    `<g fill="none" stroke="${settings.inkColor}" stroke-width="${f(settings.penWidth)}" ` +
    `stroke-linecap="round" stroke-linejoin="round">\n` +
    body +
    `</g>\n</svg>\n`;

  saveStrings(
    [svg],
    `voxels ${structureTag()} ${settings.paper}-${settings.orientation} ` +
    `${settings.projection === 'perspective' ? 'persp' + settings.fov + ' ' : ''}` +
    `az${settings.azimuth} el${settings.elevation} pen${settings.penWidth} ${timestamp()}`,
    'svg'
  );
}
