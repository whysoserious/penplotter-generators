////////////////////////////////////////////////////////////////////////////////////////
// Voxel hatching — a solid of unit cubes drawn as a pen-and-ink engraving
//
// The sketch builds a structure out of voxels, looks at it through an orthographic
// (axonometric) camera and shades it with hatching, the way an engraver would:
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
// Drag the sheet to turn the camera. The whole state of the sketch lives in the URL.
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};

const GENERATORS     = ['automaton stack', 'terrain'];
const CA_SEEDS       = ['center', 'random', 'random disc'];
const NEIGHBOURHOODS = ['moore', 'von neumann'];
const TIME_DIRS      = ['downwards', 'upwards'];
const HATCH_PATTERNS = ['cross', 'parallel'];
const HATCH_MODES    = ['along edges', 'screen angle'];
const WALL_HATCH     = ['vertical', 'horizontal'];
const EDGE_MODES     = ['outlines', 'every voxel', 'none'];

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
];

const MAX_STROKES    = 600_000;   // stroke counts no plotter would ever finish
const BUSY_STROKES   = 120_000;   // above this, warn about the plot time
const SAMPLE_MM      = 0.25;      // mm on paper between two visibility samples on a line
const BISECT         = 12;        // halvings that pin a visibility change down
const MIN_STROKE     = 0.05;      // mm — anything shorter would plot as a dot and is dropped
const EPS_OFF        = 1e-4;      // voxels — a test point is lifted this far off its face
const FRONT_EPS      = 1e-6;      // a face turned further away than this is seen edge-on
const LINE_JITTER    = 1e-6;      // keeps a hatch line off the exact cell boundaries
const PREVIEW_MAX_PX = 1500;      // preview canvas resolution (paper is measured in mm)
const MAX_PREVIEW_W  = 900;       // on-screen size of that canvas
const MAX_PREVIEW_H  = 700;
const LIVE_BUDGET_MS = 160;       // slower than this and dragging waits for the release
const ORBIT_DEG_PX   = 0.4;       // camera degrees per pixel of drag
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
  zoom: 100,            // % — 100 just fits the structure inside the margin
  penWidth: 0.3,        // mm — Rotring nib size
  inkColor: '#000000',

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
  azimuth: 45,          // degrees around the vertical, 0 looks along −X
  elevation: 35,        // degrees above the horizon

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
let grid     = null;         // { nx, ny, nz, vox, count, sig } — the voxels
let view     = null;         // camera, lamp, rays and the fit onto the paper
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

  view = planes = tones = shapes = plan = modelImg = null;
  strokes = 0;
  if (g.count > 0) {
    view   = makeView(g);
    planes = buildPlanes(g, view);
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

  let count = 0;
  for (let i = 0; i < vox.length; i++) count += vox[i];
  grid = { nx, ny, nz, vox, count, sig };
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
// An orthographic camera: every ray towards it is parallel, so the projection is linear
// and hatch lines that are parallel in space stay parallel on paper.
//
//   cam   — unit vector pointing from the structure towards the camera
//   r, u  — the screen's right and up in world space
//   paper — X = s·(p·r) + ox,  Y = −s·(p·u) + oy   (paper y grows downwards)

function makeView(g) {
  const th = deg(settings.azimuth), ph = deg(settings.elevation);
  const cam = [Math.cos(ph) * Math.cos(th), Math.cos(ph) * Math.sin(th), Math.sin(ph)];
  const r   = [-Math.sin(th), Math.cos(th), 0];
  const u   = [cam[1] * r[2] - cam[2] * r[1], cam[2] * r[0] - cam[0] * r[2],
               cam[0] * r[1] - cam[1] * r[0]];

  const la = deg(settings.azimuth + settings.lightAzimuth), le = deg(settings.lightElevation);
  const light = [Math.cos(le) * Math.cos(la), Math.cos(le) * Math.sin(la), Math.sin(le)];

  // The projection is linear, so the footprint of a voxel is its centre plus a fixed
  // half-extent, and the fit is exact without looking at a single face.
  const hr = 0.5 * (Math.abs(r[0]) + Math.abs(r[1]) + Math.abs(r[2]));
  const hu = 0.5 * (Math.abs(u[0]) + Math.abs(u[1]) + Math.abs(u[2]));
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const { nx, ny, nz, vox } = g;
  let i = 0;
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++, i++) {
        if (!vox[i]) continue;
        const cx = x + 0.5, cy = y + 0.5, cz = z + 0.5;
        const sx = cx * r[0] + cy * r[1] + cz * r[2];
        const sy = -(cx * u[0] + cy * u[1] + cz * u[2]);
        if (sx < x0) x0 = sx;
        if (sx > x1) x1 = sx;
        if (sy < y0) y0 = sy;
        if (sy > y1) y1 = sy;
      }
    }
  }
  x0 -= hr; x1 += hr; y0 -= hu; y1 += hu;

  const box = drawBox();
  const s = Math.min((box.x1 - box.x0) / Math.max(1e-9, x1 - x0),
                     (box.y1 - box.y0) / Math.max(1e-9, y1 - y0)) * settings.zoom / 100;
  const ox = (box.x0 + box.x1) / 2 - s * (x0 + x1) / 2;
  const oy = (box.y0 + box.y1) / 2 - s * (y0 + y1) / 2;

  return {
    cam, r, u, light, s, ox, oy, box,
    px: [s * r[0], s * r[1], s * r[2]],          // paper X per unit along x, y, z
    py: [-s * u[0], -s * u[1], -s * u[2]],       // paper Y per unit along x, y, z
    camRay: makeRay(cam),
    lightRay: makeRay(light),
  };
}

////////////////////////////////////////////////////////////////////////////////////////
// Walking the grid
//
// Amanatides & Woo: from a point, step from voxel to voxel along a fixed direction, always
// crossing whichever cell wall the ray reaches first. The walk stops at the first filled
// voxel, or as soon as the ray has left the grid in a direction it can never come back
// from. The direction is the same for every point, so its steps are worked out once.

function makeRay(d) {
  const sgn = c => c > 1e-12 ? 1 : c < -1e-12 ? -1 : 0;
  const sx = sgn(d[0]), sy = sgn(d[1]), sz = sgn(d[2]);
  return {
    sx, sy, sz,
    dx: sx ? 1 / Math.abs(d[0]) : Infinity,
    dy: sy ? 1 / Math.abs(d[1]) : Infinity,
    dz: sz ? 1 / Math.abs(d[2]) : Infinity,
  };
}

function blocked(ray, px, py, pz) {
  const nx = grid.nx, ny = grid.ny, nz = grid.nz, vox = grid.vox, nxy = nx * ny;
  const sx = ray.sx, sy = ray.sy, sz = ray.sz;
  let ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
  let tx = sx > 0 ? (ix + 1 - px) * ray.dx : sx < 0 ? (px - ix) * ray.dx : Infinity;
  let ty = sy > 0 ? (iy + 1 - py) * ray.dy : sy < 0 ? (py - iy) * ray.dy : Infinity;
  let tz = sz > 0 ? (iz + 1 - pz) * ray.dz : sz < 0 ? (pz - iz) * ray.dz : Infinity;

  for (;;) {
    // Outside the grid on a side the ray is heading away from: nothing more to meet.
    if (ix < 0 ? sx <= 0 : ix >= nx ? sx >= 0 : false) return false;
    if (iy < 0 ? sy <= 0 : iy >= ny ? sy >= 0 : false) return false;
    if (iz < 0 ? sz <= 0 : iz >= nz ? sz >= 0 : false) return false;
    if (ix >= 0 && ix < nx && iy >= 0 && iy < ny && iz >= 0 && iz < nz &&
        vox[ix + nx * iy + nxy * iz]) return true;

    if (tx < ty) {
      if (tx < tz) { ix += sx; tx += ray.dx; } else { iz += sz; tz += ray.dz; }
    } else {
      if (ty < tz) { iy += sy; ty += ray.dy; } else { iz += sz; tz += ray.dz; }
    }
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// The surface
//
// Faces are grouped by orientation o = 2·axis + (normal negative ? 1 : 0) and by the
// plane they lie in. A plane keeps a mask over its (u, v) cells, one byte per face, plus
// the bounding box of the faces it holds. Faces turned away from the camera are never
// collected: they cannot be seen, whatever stands in front of them.

function buildPlanes(g, v) {
  const dims   = [g.nx, g.ny, g.nz];
  const stride = [1, g.nx, g.nx * g.ny];
  const out = [];

  for (let ax = 0; ax < 3; ax++) {
    const [ua, va] = AXES_UV[ax];
    const NU = dims[ua], NV = dims[va], NA = dims[ax];
    const buf = new Uint8Array(NU * NV);

    for (const sg of [1, -1]) {
      if (sg * v.cam[ax] <= FRONT_EPS) continue;
      const o = ax * 2 + (sg > 0 ? 0 : 1);

      for (let L = 0; L <= NA; L++) {
        // The face at plane coordinate L belongs to the voxel behind it and needs the one
        // in front of it to be empty — or to lie outside the grid.
        const inside = sg > 0 ? L - 1 : L;
        if (inside < 0 || inside >= NA) continue;
        const hasOut = inside + sg >= 0 && inside + sg < NA;
        const outStep = sg * stride[ax];

        let count = 0, u0 = NU, u1 = -1, v0 = NV, v1 = -1;
        for (let vv = 0; vv < NV; vv++) {
          for (let uu = 0; uu < NU; uu++) {
            const at = inside * stride[ax] + uu * stride[ua] + vv * stride[va];
            const on = g.vox[at] && !(hasOut && g.vox[at + outStep]) ? 1 : 0;
            buf[uu + NU * vv] = on;
            if (on) {
              count++;
              if (uu < u0) u0 = uu;
              if (uu > u1) u1 = uu;
              if (vv < v0) v0 = vv;
              if (vv > v1) v1 = vv;
            }
          }
        }
        if (count) {
          out.push({ o, ax, sg, L, ua, va, NU, NV, mask: buf.slice(), count,
            u0, u1: u1 + 1, v0, v1: v1 + 1 });
        }
      }
    }
  }
  return out;
}

// Where a face points on the sheet, in words — "top", "left wall", …
function orientationName(o) {
  const ax = o >> 1, sg = o & 1 ? -1 : 1;
  if (ax === 2) return sg > 0 ? 'top' : 'underside';
  if (!view) return ['±X', '±Y'][ax];
  return sg * view.px[ax] < 0 ? 'left wall' : 'right wall';
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
    out.push({ lam, bLit, bSh, lit, sh, front: sg * v.cam[ax] > FRONT_EPS });
  }
  return out;
}

////////////////////////////////////////////////////////////////////////////////////////
// Hatching
//
// A family of hatch lines is { p : p·W = (k + phase)·σ } — parallel lines on every plane
// it crosses. Two ways to choose W:
//
//   along edges  — W is a voxel axis lying in the face, so the lines follow the cube
//                  edges. σ is chosen so that their spacing *on paper* is the setting:
//                  the projection squeezes each orientation differently.
//   screen angle — W is a direction on the sheet lifted into space. The lines come out at
//                  one angle and one spacing on every face, like a screen print.
//
// On a plane the family is a set of 2D lines across the (u, v) mask; a 2D grid walk
// collects the runs of consecutive faces, so a line crosses a whole floor in one stroke.

function hatchFamily(v, ax, fam) {
  const S = Math.max(0.05, settings.hatchSpacing);

  if (settings.hatchMode === 'screen angle') {
    const a = deg(settings.hatchAngle + (fam ? 90 : 0));
    const sa = Math.sin(a), ca = Math.cos(a);
    const W = [0, 1, 2].map(k => v.r[k] * sa - v.u[k] * ca);
    return { W, sigma: S / v.s };
  }

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
  const dX = v.px[along],  dY = v.py[along];
  const wX = v.px[across], wY = v.py[across];
  const dl = Math.hypot(dX, dY);
  if (dl < 1e-9) return null;                      // the lines would project to points
  const k = Math.abs(dX * wY - dY * wX) / dl;
  if (k < 1e-9) return null;
  const W = [0, 0, 0];
  W[across] = 1;
  return { W, sigma: S / k };
}

function hatchPlanes(v, pl, tn, sink) {
  const layers = PATTERN_LAYERS[settings.hatchPattern] || PATTERN_LAYERS.cross;
  const fams = [];
  for (let ax = 0; ax < 3; ax++) fams.push([hatchFamily(v, ax, 0), hatchFamily(v, ax, 1)]);

  for (const P of pl) {
    const t = tn[P.o];
    const n = Math.max(t.lit, t.sh);
    for (let i = 0; i < n; i++) {
      const [fam, phase] = layers[i];
      const F = fams[P.ax][fam];
      if (F) hatchPlane(v, P, F, phase, i >= t.lit, sink);
    }
  }
}

const RUNS = [];                                   // scratch: u0, v0, u1, v1 per run

function hatchPlane(v, P, F, phase, shadowOnly, sink) {
  const W = F.W, sig = F.sigma;
  const wu = W[P.ua], wv = W[P.va];
  if (wu * wu + wv * wv < 1e-12) return;
  const wl = W[P.ax] * P.L;

  let cmin = Infinity, cmax = -Infinity;
  for (const uu of [P.u0, P.u1]) {
    for (const vv of [P.v0, P.v1]) {
      const c = wl + uu * wu + vv * wv;
      if (c < cmin) cmin = c;
      if (c > cmax) cmax = c;
    }
  }

  const lift = P.sg * EPS_OFF;                     // test points sit just off the face
  const A = [0, 0, 0], B = [0, 0, 0];
  const k0 = Math.ceil(cmin / sig - phase), k1 = Math.floor(cmax / sig - phase);
  for (let k = k0; k <= k1; k++) {
    lineRuns(P, wu, wv, (k + phase) * sig - wl + LINE_JITTER);
    for (let r = 0; r < RUNS.length; r += 4) {
      A[P.ax] = P.L + lift; A[P.ua] = RUNS[r];     A[P.va] = RUNS[r + 1];
      B[P.ax] = P.L + lift; B[P.ua] = RUNS[r + 2]; B[P.va] = RUNS[r + 3];
      cutSegment(v, A, B, shadowOnly, sink);
    }
  }
}

// The runs of one 2D line  u·wu + v·wv = c  over the faces of a plane.
function lineRuns(P, wu, wv, c) {
  RUNS.length = 0;
  const inv = 1 / (wu * wu + wv * wv);
  const pu = wu * c * inv, pv = wv * c * inv;      // foot of the line
  const du = -wv, dv = wu;                         // its direction

  // Clip to the bounding box of the plane's faces.
  let t0 = -Infinity, t1 = Infinity;
  if (Math.abs(du) < 1e-12) {
    if (pu <= P.u0 || pu >= P.u1) return;
  } else {
    let a = (P.u0 - pu) / du, b = (P.u1 - pu) / du;
    if (a > b) { const t = a; a = b; b = t; }
    if (a > t0) t0 = a;
    if (b < t1) t1 = b;
  }
  if (Math.abs(dv) < 1e-12) {
    if (pv <= P.v0 || pv >= P.v1) return;
  } else {
    let a = (P.v0 - pv) / dv, b = (P.v1 - pv) / dv;
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

// Sample pred along t ∈ [0, 1] at n points and hand every run where it holds to emit,
// with each change of state narrowed down by bisection.
const T_IN = 1e-4;                                 // the ends sit on face borders — look inside

function cutByPredicate(pred, n, emit) {
  let prevT = 0, prevOn = pred(T_IN), start = 0;
  for (let i = 1; i < n; i++) {
    const t  = i / (n - 1);
    const on = pred(Math.min(t, 1 - T_IN));
    if (on !== prevOn) {
      let a = prevT, b = t;
      for (let k = 0; k < BISECT; k++) {
        const m = (a + b) / 2;
        if (pred(m) === prevOn) a = m; else b = m;
      }
      const x = (a + b) / 2;
      if (on) start = x; else emit(start, x);
    }
    prevT = t;
    prevOn = on;
  }
  if (prevOn) emit(start, 1);
}

function cutSegment(v, A, B, shadowOnly, sink) {
  const ax = A[0], ay = A[1], az = A[2];
  const dx = B[0] - ax, dy = B[1] - ay, dz = B[2] - az;
  const X0 = v.px[0] * ax + v.px[1] * ay + v.px[2] * az + v.ox;
  const Y0 = v.py[0] * ax + v.py[1] * ay + v.py[2] * az + v.oy;
  const DX = v.px[0] * dx + v.px[1] * dy + v.px[2] * dz;
  const DY = v.py[0] * dx + v.py[1] * dy + v.py[2] * dz;
  const len = Math.hypot(DX, DY);
  if (len < MIN_STROKE) return;

  const cam = v.camRay, lamp = v.lightRay;
  const pred = t => {
    const x = ax + dx * t, y = ay + dy * t, z = az + dz * t;
    if (blocked(cam, x, y, z)) return false;
    return !shadowOnly || blocked(lamp, x, y, z);
  };
  const n = Math.max(2, Math.ceil(len / SAMPLE_MM) + 1);
  cutByPredicate(pred, n, (t0, t1) =>
    sink.seg(X0 + DX * t0, Y0 + DY * t0, X0 + DX * t1, Y0 + DY * t1));
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

  const cam = v.camRay;
  const q = [0, 0, 0], base = [0, 0, 0], p0 = [0, 0, 0], p1 = [0, 0, 0];

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

    const unit = Math.hypot(v.px[A], v.py[A]);     // paper length of one unit edge
    if (unit < MIN_STROKE * 0.01) continue;        // edges seen end-on
    const n = Math.max(2, Math.ceil(unit / SAMPLE_MM) + 1);

    let open = false, s0 = 0, s1 = 0;
    const flush = () => {
      if (!open) return;
      open = false;
      p0[B] = p1[B] = base[B];
      p0[C] = p1[C] = base[C];
      p0[A] = s0; p1[A] = s1;
      sink.seg(
        v.px[0] * p0[0] + v.px[1] * p0[1] + v.px[2] * p0[2] + v.ox,
        v.py[0] * p0[0] + v.py[1] * p0[1] + v.py[2] * p0[2] + v.oy,
        v.px[0] * p1[0] + v.px[1] * p1[1] + v.px[2] * p1[2] + v.ox,
        v.py[0] * p1[0] + v.py[1] * p1[1] + v.py[2] * p1[2] + v.oy);
    };

    for (let c = 0; c <= dims[C]; c++) {
      for (let b = 0; b <= dims[B]; b++) {
        flush();
        base[B] = b; base[C] = c;
        const row = NA * (b + (dims[B] + 1) * c);
        for (let a = 0; a < NA; a++) {
          const f = fl[row + a];
          if (!f) { flush(); continue; }
          q[B] = b; q[C] = c;
          const pred = t => {
            q[A] = a + t;
            for (let bit = 0; bit < 8; bit++) {
              if (!(f & (1 << bit))) continue;
              const o = offs[bit];
              if (!blocked(cam, q[0] + o[0], q[1] + o[1], q[2] + o[2])) return true;
            }
            return false;
          };
          cutByPredicate(pred, n, (t0, t1) => {
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

// Liang–Barsky against the drawable box; null when nothing of the segment is left.
function clipSeg(x0, y0, x1, y1, b) {
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
  return [x0 + dx * t0, y0 + dy * t0, x0 + dx * t1, y0 + dy * t1];
}

function makeSink(box) {
  const pts = [], off = [0];
  return {
    pts, off,
    seg(x0, y0, x1, y1) {
      const inside = x0 >= box.x0 && x0 <= box.x1 && x1 >= box.x0 && x1 <= box.x1 &&
                     y0 >= box.y0 && y0 <= box.y1 && y1 >= box.y0 && y1 <= box.y1;
      if (!inside) {
        const c = clipSeg(x0, y0, x1, y1, box);
        if (!c) return;
        [x0, y0, x1, y1] = c;
      }
      if (Math.hypot(x1 - x0, y1 - y0) < MIN_STROKE) return;
      pts.push(x0, y0, x1, y1);
      off.push(pts.length / 2);
    },
  };
}

function buildShapes(g, v, pl, tn) {
  const sink = makeSink(v.box);
  hatchPlanes(v, pl, tn, sink);
  const hatch = sink.off.length - 1;
  edgeLines(g, v, pl, sink);
  return {
    pts: Float64Array.from(sink.pts),
    off: Int32Array.from(sink.off),
    hatch,
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
// gives it, painted back to front. For equal cubes on a lattice, sorting by the depth of
// the voxel a face belongs to is an exact painter's order. It is never exported.

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
  const cam = v.cam;
  pl.forEach((P, pi) => {
    const inside = P.L - 0.5 * P.sg;               // centre of the voxel behind the face
    for (let vv = P.v0; vv < P.v1; vv++) {
      for (let uu = P.u0; uu < P.u1; uu++) {
        const k = uu + P.NU * vv;
        if (!P.mask[k]) continue;
        depth[f] = inside * cam[P.ax] + (uu + 0.5) * cam[P.ua] + (vv + 0.5) * cam[P.va];
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

  const c = [0, 0, 0];
  const CU = [0, 1, 1, 0], CV = [0, 0, 1, 1];
  for (let t = 0; t < F; t++) {
    const i = order[t], P = pl[pidx[i]], k = cidx[i];
    const uu = k % P.NU, vv = (k / P.NU) | 0;
    const tn = tones[P.o];
    let lvl = tn.lit;
    if (tn.sh !== tn.lit) {
      c[P.ax] = P.L + P.sg * EPS_OFF; c[P.ua] = uu + 0.5; c[P.va] = vv + 0.5;
      if (blocked(v.lightRay, c[0], c[1], c[2])) lvl = tn.sh;
    }
    ctx.fillStyle = ctx.strokeStyle = greys[lvl];
    ctx.beginPath();
    for (let m = 0; m < 4; m++) {
      c[P.ax] = P.L; c[P.ua] = uu + CU[m]; c[P.va] = vv + CV[m];
      const X = v.px[0] * c[0] + v.px[1] * c[1] + v.px[2] * c[2] + v.ox;
      const Y = v.py[0] * c[0] + v.py[1] * c[1] + v.py[2] * c[2] + v.oy;
      if (m) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  return cv;
}

// While the camera is being dragged only the shaded model is drawn, at full strength —
// the hatching is recomputed when the mouse comes up.
function drawPreview(dragging) {
  background(255);
  const ctx = drawingContext;

  if (dragging || settings.showModel) {
    if (!modelImg) modelImg = buildModel();
    if (modelImg) {
      ctx.save();
      ctx.globalAlpha = dragging ? 1 : clamp(settings.modelOpacity / 100, 0, 1);
      ctx.drawImage(modelImg, 0, 0, width, height);
      ctx.restore();
    }
  }

  if (dragging || !shapes) return;
  const { pts, off } = shapes;
  const n = off.length - 1;
  const s = previewScale();

  ctx.save();
  ctx.scale(s, s);
  ctx.strokeStyle = settings.inkColor;
  ctx.lineWidth   = settings.penWidth;
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
  ctx.restore();
}

////////////////////////////////////////////////////////////////////////////////////////
// Turning the camera by dragging the sheet
//
// Listeners sit on the canvas itself rather than on p5's global mouse events, so dragging
// a slider in the panel never turns the camera.

let orbit = null, orbitFrame = 0;

function attachOrbit() {
  const c = document.querySelector('#canvas-container canvas');
  if (!c) return;

  c.addEventListener('pointerdown', e => {
    orbit = { x: e.clientX, y: e.clientY, az: settings.azimuth, el: settings.elevation,
      moved: false };
    c.setPointerCapture(e.pointerId);
    c.style.cursor = 'grabbing';
  });

  c.addEventListener('pointermove', e => {
    if (!orbit) return;
    const dx = e.clientX - orbit.x, dy = e.clientY - orbit.y;
    if (!orbit.moved && Math.hypot(dx, dy) < 3) return;
    orbit.moved = true;
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
}

function orbitPreview() {
  const g = ensureGrid();
  if (!g.count) return;
  view   = makeView(g);
  planes = buildPlanes(g, view);
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
  addSlider(root, 'Zoom (%)', 'zoom', 20, 400, 1,
    'At 100 % the structure just fits inside the margin. Past that it is cropped at the ' +
    'margin, every line cut exactly where it leaves.');

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
  createDiv('Drag the sheet to turn the camera — only the shaded model follows the mouse, ' +
    'the hatching is redrawn once you let go.').parent(root).class('note');
  addSlider(root, 'Azimuth (°)', 'azimuth', 0, 360, 1);
  addSlider(root, 'Elevation (°)', 'elevation', -90, 90, 1,
    '35° is close to isometric, 90° looks straight down.');

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
  const voxMm = view.s;

  let toneRows = '';
  const order = [4, 5, 0, 1, 2, 3];
  for (const o of order) {
    const t = tones[o];
    if (!t.front) continue;
    const n = planes.reduce((a, P) => a + (P.o === o ? P.count : 0), 0);
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
    `<div>Voxel edge <b>${voxMm.toFixed(2)} mm</b> on paper</div>` +
    `<div>Faces towards the camera <b>${groupNum(faces)}</b> ` +
    `<span class="dim">in ${groupNum(planes.length)} planes</span></div>` +
    toneRows +
    `<div>Densest gap <b>${gap.toFixed(2)} mm</b> — ` +
    (gap <= settings.penWidth
      ? `<span class="ok">the darkest tone closes up solid</span>`
      : `<span class="dim">${(gap - settings.penWidth).toFixed(2)} mm of paper left</span>`) +
    `</div>` +
    `<div>Strokes <b>${groupNum(strokes)}</b> <span class="dim">` +
    `${groupNum(shapes.hatch)} hatch + ${groupNum(strokes - shapes.hatch)} edges</span></div>` +
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
    `camera=${s.azimuth}°/${s.elevation}° zoom=${s.zoom}% ` +
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
    `az${settings.azimuth} el${settings.elevation} pen${settings.penWidth} ${timestamp()}`,
    'svg'
  );
}
