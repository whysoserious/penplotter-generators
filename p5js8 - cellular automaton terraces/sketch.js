////////////////////////////////////////////////////////////////////////////////////////
// Cellular automaton terraces — a 1D automaton shaded by a Perlin landscape
//
// Two generators are laid over one another on the same square lattice:
//
//   1. a 1D cellular automaton with a 5-cell neighbourhood (radius 2), one generation
//      per row, exactly as in "p5js5 — cellular automaton";
//   2. a Perlin height map read at the centre of every cell, h in [0,1], with the same
//      surface controls as "p5js7 — perlin duotone stipple".
//
// The automaton decides *whether* a cell is drawn, the height decides *how*. Seven
// terraces run from the lowest ground to the highest:
//
//     empty · 1 line · 2 lines · 3 lines · 4 lines · 5 lines · solid
//
// The lines are horizontal and sit at the top edge, the quarters, the middle and the
// bottom edge of the cell — they are added downwards, so the top edge is always the
// first one to appear and the bottom edge the last. A top or bottom edge with nothing
// on the other side of the boundary is inset half a pen width into its own tile, the
// same way a zone outline is, so its ink stays inside the tile it belongs to; against a
// black tile it stays centred instead, so the two overlap rather than merely touch.
// Each terrace owns a configurable share of the height range, normalised to 100 %.
//
// Lines are drawn as merged horizontal runs: neighbouring cells that ask for a line at
// the same height hand the pen one continuous stroke, and the line shared by a cell and
// the one below it is drawn once. Solid cells are not drawn as lines at all — they are
// gathered into zones, and every zone gets an outline on its own boundary plus a hatch
// inside it, both inset by half a pen width so the black lands exactly on the tiles it
// is made of. The whole state of the sketch lives in the URL, so a plot is reproduced
// by pasting its link.
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};

const SEED_TYPES  = ['center', 'random', 'all-alive', 'alternating', 'left-edge'];
const HEIGHT_MAPS = ['equalize', 'min–max', 'raw'];
const DITHERS     = ['none', 'blue noise', 'ordered', 'random'];

const LEVELS = 7;                                  // empty … solid
const LEVEL_NAMES = ['empty', '1 line', '2 lines', '3 lines', '4 lines', '5 lines', 'solid'];

// Rule presets — rule3 means "5-cell equivalent of Wolfram k=2 r=1 rule N".
const PRESETS = [
  { label: '— select preset —' },
  { label: 'R18  Sierpinski',   rule3: 18  },
  { label: 'R30  chaos',        rule3: 30  },
  { label: 'R54  complex',      rule3: 54  },
  { label: 'R90  fractal',      rule3: 90  },
  { label: 'R110 complex',      rule3: 110 },
  { label: 'R126 dense',        rule3: 126 },
  { label: 'R150 fractal',      rule3: 150 },
  { label: 'R184 traffic',      rule3: 184 },
  { label: 'All alive',         fixedRule: 4294967295 },
  { label: 'All dead',          fixedRule: 0 },
];

// Whole-sketch presets: the automaton, the surface and the terrace shares together.
const SCENES = [
  { label: '— select scene —' },
  { label: 'Sierpinski over dunes', s: {
    rule: 869020620, cellSize: 3, seedType: 'center', wrapEdges: true, warmup: 0, genStep: 1,
    noiseScale: 85, octaves: 3, persistence: 0.5, warpAmount: 0, heightMap: 'equalize',
    contrast: 1, level: 0, reliefAmount: 0,
    share0: 16, share1: 12, share2: 12, share3: 12, share4: 12, share5: 12, share6: 24,
    dither: 'none' } },
  { label: 'Chaos, eroded', s: {
    rule: 66847740, cellSize: 2.5, seedType: 'center', wrapEdges: true, warmup: 0, genStep: 1,
    noiseScale: 55, octaves: 4, persistence: 0.55, warpAmount: 0.4, warpFreq: 0.6,
    heightMap: 'equalize', contrast: 1.2, level: 0, reliefAmount: 0,
    share0: 30, share1: 10, share2: 10, share3: 10, share4: 10, share5: 10, share6: 20,
    dither: 'blue noise', ditherAmount: 0.05 } },
  { label: 'Random soup, lit ridges', s: {
    rule: 1023163644, cellSize: 2, seedType: 'random', seedDensity: 0.5, wrapEdges: true,
    warmup: 40, genStep: 1, noiseScale: 60, octaves: 3, persistence: 0.5, warpAmount: 0.25,
    warpFreq: 0.5, heightMap: 'equalize', contrast: 1, level: 0,
    reliefAmount: 70, lightAngle: 135, reliefGain: 0.9,
    share0: 20, share1: 12, share2: 12, share3: 12, share4: 12, share5: 12, share6: 20,
    dither: 'blue noise', ditherAmount: 0.04 } },
  { label: 'Coarse tiles, hard terraces', s: {
    rule: 3275539260, cellSize: 6, seedType: 'center', wrapEdges: true, warmup: 0, genStep: 1,
    noiseScale: 120, octaves: 2, persistence: 0.5, warpAmount: 0, heightMap: 'min–max',
    contrast: 1.4, level: 0, reliefAmount: 0,
    share0: 10, share1: 15, share2: 15, share3: 15, share4: 15, share5: 15, share6: 15,
    dither: 'none' } },
  { label: 'Traffic bands, high tide', s: {
    rule: 3485519808, cellSize: 2, seedType: 'random', seedDensity: 0.35, wrapEdges: true,
    warmup: 0, genStep: 1, noiseScale: 140, aspect: 3, octaves: 2, persistence: 0.5,
    warpAmount: 0.15, warpFreq: 0.4, heightMap: 'equalize', contrast: 1, level: 0.12,
    reliefAmount: 0,
    share0: 8, share1: 8, share2: 10, share3: 12, share4: 14, share5: 16, share6: 32,
    dither: 'ordered', ditherAmount: 0.05 } },
];

const MAX_CELLS      = 1_500_000; // refuse grids that would freeze the browser
const MAX_STROKES    = 600_000;   // and stroke counts no plotter would ever finish
const BUSY_STROKES   = 120_000;   // above this, warn about the plot time
const EPS            = 0.01;      // mm — length of the stub that stands in for one dot
const PREVIEW_MAX_PX = 1500;      // preview canvas resolution (paper is measured in mm)
const MAX_PREVIEW_W  = 900;       // on-screen size of that canvas
const MAX_PREVIEW_H  = 700;
const FIELD_RASTER   = 360;       // longest side of the height-preview image
const LIVE_BUDGET_MS = 160;       // slower than this and dragging waits for the release
const LUT_N          = 1024;      // height → terrace lookup table
const PEN_CYCLE_S    = 0.3;       // rough pen-up + pen-down time, seconds
const DRAW_SPEED     = 60;        // rough drawing speed, mm/s
const TRAVEL_SPEED   = 150;       // rough pen-up travel speed, mm/s

const settings = {
  // paper + pen
  paper: 'A4',
  orientation: 'portrait',
  margin: 10,
  penWidth: 0.5,        // mm — Rotring nib size
  inkColor: '#000000',

  // cut guides — dots on the edge of the sheet, for trimming an oversized plot back
  cropMarks: false,
  cropMarkGap: 400,     // mm — the most that is ever left between two marks

  // the lattice both generators live on
  cellSize: 3,          // mm — one automaton cell is one terrace tile
  fillPercent: 70,      // solid-fill hatch spacing, % of the pen width

  // the automaton
  rule: wolfram3to5(30),   // chaos — rule 18's triangle dies where it meets the edge
  seedType: 'center',
  seedDensity: 0.3,
  seedValue: 1,
  wrapEdges: true,
  warmup: 0,            // generations run before the first drawn row
  genStep: 1,           // draw every n-th generation
  invertCells: false,

  // the surface
  fieldSeed: 1,
  noiseScale: 85,       // mm per noise unit — the feature size of the terrain
  aspect: 1,            // >1 stretches the terrain along Y, <1 along X
  angle: 0,             // degrees
  panX: 0,              // pan across the terrain, in noise units
  panY: 0,
  octaves: 3,
  lacunarity: 2,
  persistence: 0.5,
  warpAmount: 0,        // domain warp strength, in noise units
  warpFreq: 0.5,        // warp frequency relative to the base field

  // height mapping — raw noise to h in [0,1]
  heightMap: 'equalize',
  contrast: 1,          // spreads or squeezes the heights around the middle
  level: 0,             // raises or lowers the whole terrain
  invertHeight: false,  // swap the lowlands for the highlands

  // relief — light the surface from one side instead of reading its height
  reliefAmount: 0,      // %
  lightAngle: 135,      // degrees
  reliefGain: 1,

  // terraces — each share is a slice of the height range, normalised to 100 %
  share0: 16,           // empty
  share1: 12,           // 1 line
  share2: 12,           // 2 lines
  share3: 12,           // 3 lines
  share4: 12,           // 4 lines
  share5: 12,           // 5 lines
  share6: 24,           // solid
  dither: 'none',       // breaks the terrace borders up instead of leaving them as contours
  ditherAmount: 0.04,   // in height units

  // view + output
  showField: true,
  fieldOpacity: 20,
  optimiseOrder: true,
  liveUpdate: true,
};

// Captured before anything can touch it — the URL only carries what differs from this,
// and "Reset" puts it all back.
const DEFAULTS = { ...settings };

const setters   = {};        // settings key -> function that moves its control
const fieldDivs = {};        // settings key -> the .field wrapper, for showing/hiding
let statsDiv, ruleInput, ruleInfoDiv, bandCanvas, shareRows = [], linkDiv;
let grid   = null;           // { W, H, cs, cols, rows, x0, y0, cells, sub, dy }
let auto   = null;           // { alive: Uint8Array(cells), on } — the automaton
let field  = null;           // { sig, vals, flatFrac, … } — height at every cell
let terr   = null;           // { level: Uint8Array(cells), hist, thr } — terrace per cell
let shapes = null;           // { pts, off } — polylines in mm
let strokes = 0;             // how many of them, even when there are too many to draw
let plan   = null;           // { order, flip, ink, travel }
let lastMs = 0;

////////////////////////////////////////////////////////////////////////////////////////
// Helpers

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// Lift a Wolfram k=2 r=1 (3-cell) rule into 5-cell rule space by ignoring outermost cells.
function wolfram3to5(rule3) {
  let rule5 = 0;
  for (let p = 0; p < 32; p++) {
    const b = (p >> 3) & 1;
    const c = (p >> 2) & 1;
    const d = (p >> 1) & 1;
    const threePat = (b << 2) | (c << 1) | d;
    if ((rule3 >> threePat) & 1) rule5 |= (1 << p);
  }
  return rule5 >>> 0;
}

function resolvePresetRule(p) {
  if (p.fixedRule !== undefined) return p.fixedRule >>> 0;
  if (p.rule3 !== undefined)     return wolfram3to5(p.rule3);
  return null;
}

function parseRule(str) {
  str = String(str).trim();
  const n = /^0x/i.test(str) ? parseInt(str.slice(2), 16) : parseInt(str, 10);
  if (isNaN(n) || n < 0 || n > 4294967295) return null;
  return n >>> 0;
}

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

function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

////////////////////////////////////////////////////////////////////////////////////////
// The URL is the document
//
// Every setting that differs from its default is written into the hash, debounced, with
// replaceState so the back button stays usable. Opening that link anywhere rebuilds the
// same sheet: the automaton, the surface and the sampling are all seeded, nothing is
// left to chance. A hash typed or pasted into the address bar of a live tab is picked
// up too, which is what makes the link work as a save file.

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
  if (ruleInput) ruleInput.value(String(settings.rule));
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
// Seeded Perlin noise
//
// p5's own noise() is fine but its seed is global and its range depends on noiseDetail.
// This is classic improved Perlin with a seeded permutation and 16 unit-length gradients,
// so the range is predictable before the height mapping normalises it anyway.

// Classic 2D gradient noise peaks around ±0.707, so this brings a single octave close to
// the ±1 the height mapping expects.
const NOISE_NORM = Math.SQRT2;

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

// Everything the surface does to a millimetre position, baked into one closure so the hot
// loop reads no settings. Returns the raw noise; the height mapping normalises it.
function makeFieldSampler(seed) {
  const nz  = makePerlin(seed >>> 0);
  const wz  = makePerlin((Math.imul(seed, 2654435761) ^ 0x5bf03635) >>> 0);
  const [W, H] = paperDims();
  const cx  = W / 2, cy = H / 2;
  const a   = settings.angle * Math.PI / 180;
  const ca  = Math.cos(a), sa = Math.sin(a);
  const sx  = Math.max(0.5, settings.noiseScale);
  const sy  = Math.max(0.5, settings.noiseScale * Math.max(0.05, settings.aspect));
  const oct = clamp(Math.round(settings.octaves), 1, 8);
  const lac = settings.lacunarity;
  const per = settings.persistence;
  const wA  = settings.warpAmount;
  const wF  = Math.max(0.01, settings.warpFreq);
  const px  = settings.panX, py = settings.panY;

  return function (x, y) {
    const dx = x - cx, dy = y - cy;
    let u = ( dx * ca + dy * sa) / sx + px;
    let v = (-dx * sa + dy * ca) / sy + py;
    if (wA !== 0) {
      const wu = wz(u * wF + 17.3, v * wF +  5.1);
      const wv = wz(u * wF -  9.7, v * wF + 23.9);
      u += wA * wu;
      v += wA * wv;
    }
    return fbm(nz, u, v, oct, lac, per) * NOISE_NORM;
  };
}

////////////////////////////////////////////////////////////////////////////////////////
// Dither masks
//
// A terrace border is a contour line of the surface: without dithering it comes out as a
// clean, hard edge, which is the point of terracing in the first place. Adding a mask to
// the height before it is quantised frays that edge instead — blue noise scatters the
// two neighbouring terraces into each other evenly, Bayer does it as a visible weave.

const BN_SIZE = 64;                    // power of two so the tiling is a bitmask
let blueNoiseMask = null;              // Float32Array(BN_SIZE²) of thresholds in (0,1)

function makeBlueNoise(N) {
  const n    = N * N;
  const rnd  = mulberry32(0x51ff7);
  const bin  = new Uint8Array(n);
  const nrg  = new Float32Array(n);
  const rank = new Int32Array(n);

  const SIGMA = 1.9, R = 5;            // gaussian energy, wrapped, cut off at R cells
  const kern = [];
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      kern.push(dx, dy, Math.exp(-(dx * dx + dy * dy) / (2 * SIGMA * SIGMA)));
    }
  }
  const SHIFT = Math.round(Math.log2(N));
  const splat = (idx, sign) => {
    const x = idx & (N - 1), y = idx >> SHIFT;
    for (let t = 0; t < kern.length; t += 3) {
      const xx = (x + kern[t] + N) & (N - 1);
      const yy = (y + kern[t + 1] + N) & (N - 1);
      nrg[(yy << SHIFT) + xx] += sign * kern[t + 2];
    }
  };
  const tightestOne = () => {
    let best = -1, e = -Infinity;
    for (let i = 0; i < n; i++) if (bin[i] && nrg[i] > e) { e = nrg[i]; best = i; }
    return best;
  };
  const largestVoid = () => {
    let best = -1, e = Infinity;
    for (let i = 0; i < n; i++) if (!bin[i] && nrg[i] < e) { e = nrg[i]; best = i; }
    return best;
  };

  // A random tenth of the cells, then shuffled around until no cluster and no void is
  // worth swapping — that is the prototype pattern every rank is grown from.
  const M = Math.max(1, Math.round(n * 0.1));
  for (let placed = 0; placed < M; ) {
    const i = (rnd() * n) | 0;
    if (!bin[i]) { bin[i] = 1; splat(i, 1); placed++; }
  }
  for (let iter = 0; iter < 4 * n; iter++) {
    const c = tightestOne();
    bin[c] = 0; splat(c, -1);
    const v = largestVoid();
    if (v === c) { bin[c] = 1; splat(c, 1); break; }
    bin[v] = 1; splat(v, 1);
  }

  const proto = bin.slice(), protoNrg = nrg.slice();

  // Phase 1 — pull the prototype apart, tightest cluster first: ranks M-1 … 0.
  for (let r = M - 1; r >= 0; r--) {
    const c = tightestOne();
    bin[c] = 0; splat(c, -1);
    rank[c] = r;
  }
  // Phases 2 and 3 — fill it back up, always into the largest void: ranks M … n-1.
  bin.set(proto); nrg.set(protoNrg);
  for (let r = M; r < n; r++) {
    const v = largestVoid();
    bin[v] = 1; splat(v, 1);
    rank[v] = r;
  }

  const mask = new Float32Array(n);
  for (let i = 0; i < n; i++) mask[i] = (rank[i] + 0.5) / n;
  return mask;
}

function getBlueNoise() {
  if (!blueNoiseMask) blueNoiseMask = makeBlueNoise(BN_SIZE);
  return blueNoiseMask;
}

// 8x8 Bayer, built by the usual recursive quadrant rule — a deliberate crosshatch rather
// than an invisible dither.
const BAYER8 = (() => {
  let m = [[0]];
  for (let s = 1; s < 8; s *= 2) {
    const next = Array.from({ length: s * 2 }, () => new Array(s * 2));
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const v = m[y][x] * 4;
        next[y][x] = v;         next[y][x + s]     = v + 2;
        next[y + s][x] = v + 3; next[y + s][x + s] = v + 1;
      }
    }
    m = next;
  }
  const out = new Float32Array(64);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) out[y * 8 + x] = (m[y][x] + 0.5) / 64;
  return out;
})();

// A cheap hash of a cell, for the 'random' dither — a PRNG would tie the value to the
// scan order, and it would then change with the grid size.
function hash01(x, y, salt) {
  let h = Math.imul(x * 73856093 ^ y * 19349663 ^ salt, 0x27d4eb2d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

////////////////////////////////////////////////////////////////////////////////////////
// Geometry

function paperDims() {
  const [a, b] = PAPER_SIZES[settings.paper];
  return settings.orientation === 'portrait' ? [a, b] : [b, a];
}

// The pen is round: ink reaches half a pen width past the ends of a terrace line, so the
// usable span is inset by that much before the tiles are counted. The grid is then
// centred on the sheet, and whatever does not divide evenly becomes a slightly wider
// margin rather than a cropped tile. One cell always fits, however large it is asked to
// be — a cell wider than the sheet simply leaves a single tile.
function gridGeometry() {
  const [W, H] = paperDims();
  const cs = Math.max(0.2, settings.cellSize);
  const spanW = W - 2 * settings.margin - settings.penWidth;
  const spanH = H - 2 * settings.margin - settings.penWidth;
  const cols = Math.max(1, Math.floor(spanW / cs));
  const rows = Math.max(1, Math.floor(spanH / cs));

  // The terrace lines sit on the quarters of a cell; the hatch inside a black zone has a
  // lattice of its own, spaced by the fill setting alone. Nothing has to divide anything
  // evenly any more, so the cell size is free.
  return {
    W, H, cs, cols, rows,
    cells: cols * rows,
    gap: fillGap(),
    x0: (W - cols * cs) / 2,
    y0: (H - rows * cs) / 2,
  };
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
  grid = gridGeometry();

  strokes = 0;
  if (grid.cells > MAX_CELLS) {
    auto = field = terr = shapes = plan = null;
  } else {
    auto   = runAutomaton(grid);
    field  = ensureField(grid);
    terr   = terraces(grid, field, auto);
    shapes = buildShapes(grid, auto, terr);
    strokes = shapes.off.length - 1;
    // Past the limit nothing is ordered, drawn or exported — the stats say why.
    if (strokes > MAX_STROKES) { shapes = null; plan = null; }
    else plan = orderShapes(shapes);
  }

  lastMs = performance.now() - t0;
  drawPreview();
  drawBands();
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
// Cellular automaton core
//
// Neighborhood: [i-2, i-1, i, i+1, i+2]
// Pattern index: (c[i-2]<<4)|(c[i-1]<<3)|(c[i]<<2)|(c[i+1]<<1)|c[i+2]
// New state:    (rule >>> pattern) & 1
// Rule space: 2^32 rules, of which the 256 Wolfram ones are the lifted subset.

function makeInitialRow(cols, rnd) {
  const row = new Uint8Array(cols);
  switch (settings.seedType) {
    case 'center':      row[Math.floor(cols / 2)] = 1; break;
    case 'random':      for (let i = 0; i < cols; i++) row[i] = rnd() < settings.seedDensity ? 1 : 0; break;
    case 'all-alive':   row.fill(1); break;
    case 'alternating': for (let i = 0; i < cols; i++) row[i] = i & 1; break;
    case 'left-edge':   row[0] = 1; break;
  }
  return row;
}

function nextRow(current, next, rule32) {
  const n = current.length;
  const wrap = settings.wrapEdges;
  for (let i = 0; i < n; i++) {
    const a = wrap ? current[(i - 2 + n) % n] : (i >= 2    ? current[i - 2] : 0);
    const b = wrap ? current[(i - 1 + n) % n] : (i >= 1    ? current[i - 1] : 0);
    const c = current[i];
    const d = wrap ? current[(i + 1) % n]     : (i + 1 < n ? current[i + 1] : 0);
    const e = wrap ? current[(i + 2) % n]     : (i + 2 < n ? current[i + 2] : 0);
    const pattern = (a << 4) | (b << 3) | (c << 2) | (d << 1) | e;
    next[i] = (rule32 >>> pattern) & 1;
  }
  return next;
}

// One flat bitmap of the whole run, so the terrace pass can read it in scan order.
// Warm-up throws away the opening generations — the same rule with the transient cut off
// — and the step draws every n-th generation after that.
function runAutomaton(g) {
  const rule32 = settings.rule >>> 0;
  const rnd    = mulberry32(settings.seedValue);
  const alive  = new Uint8Array(g.cells);
  const step   = Math.max(1, Math.round(settings.genStep));
  const warm   = Math.max(0, Math.round(settings.warmup));

  let cur = makeInitialRow(g.cols, rnd);
  let nxt = new Uint8Array(g.cols);
  const advance = () => { nextRow(cur, nxt, rule32); const t = cur; cur = nxt; nxt = t; };

  for (let i = 0; i < warm; i++) advance();

  const inv = settings.invertCells;
  let on = 0;
  for (let r = 0; r < g.rows; r++) {
    const base = r * g.cols;
    for (let c = 0; c < g.cols; c++) {
      const v = inv ? 1 - cur[c] : cur[c];
      alive[base + c] = v;
      on += v;
    }
    for (let s = 0; s < step; s++) advance();
  }
  return { alive, on };
}

////////////////////////////////////////////////////////////////////////////////////////
// The height map, evaluated once per cell and cached
//
// Everything downstream — the terraces, the preview underlay — reads these numbers, so
// dragging a terrace share costs no noise at all.

function fieldSignature(g) {
  const s = settings;
  return [g.cols, g.rows, g.cs, s.paper, s.orientation, s.margin,
    s.fieldSeed, s.noiseScale, s.aspect, s.angle, s.panX, s.panY,
    s.octaves, s.lacunarity, s.persistence, s.warpAmount, s.warpFreq,
    s.reliefAmount, s.lightAngle, s.reliefGain,
    s.heightMap, s.contrast, s.level, s.invertHeight].join('|');
}

// Light the surface from one side instead of reading its height: the value becomes how
// steeply the ground tilts towards the lamp, so one flank of every ridge terraces up and
// the opposite flank down. That is where a sense of depth comes from.
function applyRelief(g, vals) {
  const a = clamp(settings.reliefAmount / 100, 0, 1);
  if (a <= 0) return;

  const src  = vals.slice();
  const ang  = settings.lightAngle * Math.PI / 180;
  const lx   = Math.cos(ang), ly = Math.sin(ang);
  const gsc  = settings.reliefGain * settings.noiseScale / (2 * g.cs);
  const cols = g.cols, rows = g.rows;

  for (let r = 0; r < rows; r++) {
    const base = r * cols;
    const up   = r > 0        ? base - cols : base;
    const down = r < rows - 1 ? base + cols : base;
    for (let c = 0; c < cols; c++) {
      const xm = src[base + (c > 0 ? c - 1 : c)];
      const xp = src[base + (c < cols - 1 ? c + 1 : c)];
      const gx = (xp - xm) * gsc;
      const gy = (src[down + c] - src[up + c]) * gsc;
      const lit = clamp(gx * lx + gy * ly, -1, 1);
      vals[base + c] = src[base + c] * (1 - a) + lit * a;
    }
  }
}

// Raw noise crowds around the middle of its range, which is why a straight reading leaves
// broad look-alike areas and only thin transitions. Equalising spreads the heights so
// every terrace covers exactly the share of paper its slider asks for.
function toHeights(vals) {
  const n = vals.length;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < n; i++) {
    const v = vals[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }

  const mode = settings.heightMap;
  if (mode === 'equalize') {
    const B = 4096;
    const hist = new Float64Array(B + 1);
    const span = Math.max(1e-9, max - min);
    for (let i = 0; i < n; i++) hist[((vals[i] - min) / span * B) | 0]++;
    let acc = 0;
    for (let b = 0; b <= B; b++) { const c = hist[b]; hist[b] = (acc + c / 2) / n; acc += c; }
    for (let i = 0; i < n; i++) vals[i] = hist[((vals[i] - min) / span * B) | 0];
  } else if (mode === 'min–max') {
    const span = Math.max(1e-9, max - min);
    for (let i = 0; i < n; i++) vals[i] = (vals[i] - min) / span;
  } else {
    for (let i = 0; i < n; i++) vals[i] = clamp((vals[i] + 1) / 2, 0, 1);
  }

  const k = Math.max(0.01, settings.contrast), off = settings.level;
  if (k !== 1 || off !== 0) {
    for (let i = 0; i < n; i++) vals[i] = clamp((vals[i] - 0.5) * k + 0.5 + off, 0, 1);
  }
  if (settings.invertHeight) {
    for (let i = 0; i < n; i++) vals[i] = 1 - vals[i];
  }
  return { rawMin: min, rawMax: max };
}

function ensureField(g) {
  const sig = fieldSignature(g);
  if (field && field.sig === sig && field.vals.length === g.cells) return field;

  const sampler = makeFieldSampler(settings.fieldSeed);
  const vals = new Float32Array(g.cells);

  // The height belongs to the tile, so it is read at the tile's centre.
  for (let r = 0; r < g.rows; r++) {
    const y = g.y0 + (r + 0.5) * g.cs, base = r * g.cols;
    for (let c = 0; c < g.cols; c++) vals[base + c] = sampler(g.x0 + (c + 0.5) * g.cs, y);
  }
  applyRelief(g, vals);
  const raw = toHeights(vals);

  let flat = 0;
  for (let i = 0; i < vals.length; i++) if (vals[i] <= 0 || vals[i] >= 1) flat++;

  return { sig, vals, flatFrac: flat / g.cells, ...raw };
}

////////////////////////////////////////////////////////////////////////////////////////
// Terraces
//
// Seven shares, normalised to 100 %, cut the height range into seven bands. With the
// height map on 'equalize' a share is also the share of the sheet that band covers, so
// the sliders read as "how much paper is empty, how much is solid".

function shareList() {
  const out = [];
  for (let i = 0; i < LEVELS; i++) out.push(Math.max(0, settings['share' + i]));
  return out;
}

// thr[i] is where band i starts; thr[LEVELS] is 1. Bands with a zero share collapse to
// zero width and simply never appear.
function bandThresholds() {
  const sh  = shareList();
  const sum = sh.reduce((a, b) => a + b, 0);
  const thr = new Float64Array(LEVELS + 1);
  if (sum <= 0) {
    for (let i = 0; i <= LEVELS; i++) thr[i] = i / LEVELS;
    return { thr, sh, sum: LEVELS, norm: sh.map(() => 100 / LEVELS) };
  }
  let acc = 0;
  for (let i = 0; i < LEVELS; i++) { thr[i] = acc / sum; acc += sh[i]; }
  thr[LEVELS] = 1;
  return { thr, sh, sum, norm: sh.map(v => 100 * v / sum) };
}

function levelAt(h, thr) {
  for (let i = LEVELS - 1; i >= 0; i--) if (h >= thr[i]) return i;
  return 0;
}

function terraces(g, fld, a) {
  const bands = bandThresholds();
  const thr   = bands.thr;

  // One lookup table instead of a search per cell.
  const lut = new Uint8Array(LUT_N + 1);
  for (let i = 0; i <= LUT_N; i++) lut[i] = levelAt(i / LUT_N, thr);

  const level = new Uint8Array(g.cells);
  const hist  = new Int32Array(LEVELS);
  const amt   = settings.dither === 'none' ? 0 : Math.max(0, settings.ditherAmount);
  const bn    = settings.dither === 'blue noise' ? getBlueNoise() : null;
  const vals  = fld.vals;
  const alive = a.alive;

  for (let r = 0; r < g.rows; r++) {
    const base = r * g.cols;
    const bnRow = bn ? (r & (BN_SIZE - 1)) * BN_SIZE : 0;
    const byRow = (r & 7) * 8;
    for (let c = 0; c < g.cols; c++) {
      const i = base + c;
      if (!alive[i]) continue;
      let h = vals[i];
      if (amt > 0) {
        const d = bn ? bn[bnRow + (c & (BN_SIZE - 1))]
          : settings.dither === 'ordered' ? BAYER8[byRow + (c & 7)]
          : hash01(c, r, settings.fieldSeed);
        h = clamp(h + (d - 0.5) * amt, 0, 1);
      }
      const L = lut[(h * LUT_N) | 0];
      level[i] = L;
      hist[L]++;
    }
  }
  return { level, hist, ...bands };
}

////////////////////////////////////////////////////////////////////////////////////////
// Shapes — what the pen draws, as flat polylines in millimetres.
// Shape i owns the points off[i] … off[i+1]-1.
//
// Two passes, because a terrace line and a black zone want opposite things from the pen.
//
// A line is a line: it is centred on the height it stands for — the top edge, a quarter,
// the middle of a tile — and it runs the full width of the tile. Neighbouring tiles that
// ask for a line at the same height hand the pen one continuous stroke, and the line a
// tile shares with the tile below it is drawn exactly once.
//
// A black zone is an area, and what has to land exactly is its edge, not the centre of
// any one stroke. So every zone is drawn as its own outline — one closed stroke, inset
// by half a pen width so the ink stops on the zone's boundary instead of half a pen past
// it — and then hatched inside that boundary, the hatch runs inset by the same half pen
// at both ends. The black then comes out exactly the size of the tiles it is made of,
// and its edge is one smooth stroke instead of a row of round caps.
//
// The hatch sits on a lattice of its own, spaced by the fill setting alone. It no longer
// has to land on the quarters of a tile, which is what lets the cell size grow without
// bound — and it is why a tile's fill is no longer pinned to the line positions of the
// tile beside it.

function makeSink() {
  const pts = [], off = [0];
  return {
    pts, off,
    line(x0, y, x1) { pts.push(x0, y, x1, y); off.push(pts.length / 2); },
    poly(flat) { for (let i = 0; i < flat.length; i++) pts.push(flat[i]); off.push(pts.length / 2); },
  };
}

// Spacing of the solid hatch — a share of the pen width, so at 100 % the passes just
// touch and below that they overlap into one black surface. Nothing rounds it any more.
function fillGap() {
  return Math.max(0.02, settings.penWidth * settings.fillPercent / 100);
}

// How far the outline and the hatch are pulled inside a zone's boundary: half a pen
// width, clamped so a one-cell zone can shrink to a point but never turn inside out.
function zoneInset(cs) {
  return Math.min(settings.penWidth / 2, cs / 2);
}

function solidMask(g, a, t) {
  const sol = new Uint8Array(g.cells);
  for (let i = 0; i < g.cells; i++) {
    if (a.alive[i] && t.level[i] === LEVELS - 1) sol[i] = 1;
  }
  return sol;
}

////////////////////////////////////////////////////////////////////////////////////////
// Pass 1 — the terrace lines of levels 1…5, on the quarters of a tile.
//
// Solid tiles sit this pass out: they are zones, not stacks of lines. A line that runs
// up against a zone simply ends at the shared edge, where the black already is.

function terraceLines(g, a, t, sol, sink) {
  const cols = g.cols, q = g.cs / 4;
  const inset = zoneInset(g.cs);
  const rowMask = Array.from({ length: 5 }, () => new Uint8Array(cols));
  const carry   = new Uint8Array(cols);
  const edge    = new Uint8Array(cols);   // per column on a tile boundary: 0 none, 1 up, 2 centred, 3 down

  const emit = (mask, y) => {
    let start = -1;
    for (let c = 0; c < cols; c++) {
      if (mask[c]) { if (start < 0) start = c; }
      else if (start >= 0) { sink.line(g.x0 + start * g.cs, y, g.x0 + c * g.cs); start = -1; }
    }
    if (start >= 0) sink.line(g.x0 + start * g.cs, y, g.x0 + cols * g.cs);
  };

  // A tile boundary is emitted one contiguous run at a time, and the run — not the
  // column — decides where it sits. A run whose columns disagree, the tile above asking
  // for the boundary along part of it and the tile below along the rest, is centred: it
  // reads as one edge, and a full pen width of step halfway across it is a worse fault
  // than the half pen the inset was there to save. A run whose columns agree keeps the
  // offset they ask for, which is every run that does not straddle a terrace change.
  const emitEdge = (code, yTop) => {
    let start = -1, first = 0, mixed = 0;
    const flush = end => {
      const dy = mixed || first === 2 ? 0 : first === 1 ? -inset : inset;
      sink.line(g.x0 + start * g.cs, yTop + dy, g.x0 + end * g.cs);
      start = -1; mixed = 0;
    };
    for (let c = 0; c < cols; c++) {
      const v = code[c];
      if (v) { if (start < 0) { start = c; first = v; } else if (v !== first) mixed = 1; }
      else if (start >= 0) flush(c);
    }
    if (start >= 0) flush(cols);
  };

  for (let r = 0; r < g.rows; r++) {
    for (let j = 0; j <= 4; j++) rowMask[j].fill(0);

    const base = r * cols;
    for (let c = 0; c < cols; c++) {
      const L = a.alive[base + c] ? t.level[base + c] : 0;
      if (L === 0 || L === LEVELS - 1) continue;
      for (let k = 0; k < L; k++) rowMask[k][c] = 1; // top edge first, bottom edge last
    }

    // An edge that only one of the two tiles asks for is pulled half a pen width into
    // that tile, exactly like a zone outline, so its ink stops on the tile boundary
    // instead of standing that much past it — a line beside a black zone then starts and
    // ends where the zone's own outline does. Where both tiles ask for the boundary the
    // two share one stroke, and a shared stroke stays centred on it: it belongs to both
    // and cannot lean into either. This is only the column's request, though: emitEdge
    // above decides per run, and drops the inset wherever a run's columns disagree.
    //
    // A black tile across the boundary is the one case where the line stays centred even
    // though only one tile asks for it: the half pen it then stands past the boundary
    // lands on the zone, which is black anyway, and the zone's outline is inset by that
    // same half pen. Pulled back, the two would only touch — and two strokes that touch
    // leave a hairline of paper between them and a visible step where the line meets the
    // zone. Centred, they overlap and the black closes over the boundary.
    for (let c = 0; c < cols; c++) {
      const top = rowMask[0][c], bot = carry[c];
      const solBelow = sol[base + c];
      const solAbove = r > 0 ? sol[base - cols + c] : 0;
      // Shared wins, so past it `bot` alone already means the tile above asks and the one
      // below does not, and `top` alone the other way round.
      edge[c] = ((top & bot) | (top & solAbove) | (bot & solBelow)) ? 2 : bot ? 1 : top ? 3 : 0;
    }

    const yTop = g.y0 + r * g.cs;
    emitEdge(edge, yTop);
    for (let j = 1; j < 4; j++) emit(rowMask[j], yTop + j * q);
    carry.set(rowMask[4]);
  }
  emit(carry, g.y0 + g.rows * g.cs - inset);        // the last bottom edge, nothing below
}

////////////////////////////////////////////////////////////////////////////////////////
// Pass 2a — the hatch inside the black zones.
//
// One lattice for the whole sheet, so neighbouring tiles hand the pen one long stroke.
// A pass is dropped from a column when it comes closer than the inset to a boundary the
// zone does not share with a solid neighbour — the outline covers that band — and every
// run is shortened by the inset at both ends so its round caps land on the boundary.
//
// The passes are then chained: a run is joined to the run above it and drawn the other
// way round, so a zone comes out as one long serpentine stroke instead of a stack of
// loose ones. That is not about travel — it is what keeps the black in one piece. Left
// loose, the runs are ordered like everything else, and the pen, having just finished a
// run at the edge of a zone, finds the end of the terrace line beside it closer than the
// next run: it leaves the black, follows the lines away and comes back hundreds of
// strokes later to fill the band it skipped. Whatever the machine's repeatability is
// worth, it shows up as a pale seam right there — on the height of the line that lured
// the pen out. One stroke cannot be interrupted, so the seam has nowhere to appear.
//
// A run is only joined to one it overlaps, and the join is placed inside that overlap,
// so the short hop between two passes always runs over black.

function solidHatch(g, sol, inset, sink) {
  const cols = g.cols, rows = g.rows, cs = g.cs;
  const gap  = fillGap();
  const mask = new Uint8Array(cols);
  const kMax = Math.floor((rows * cs) / gap);
  let open = [];                          // the runs of the row above, still being chained

  for (let k = 0; k <= kMax; k++) {
    const y = g.y0 + k * gap;
    let r = Math.floor(k * gap / cs);
    if (r >= rows) r = rows - 1;

    const base = r * cols;
    const up   = r > 0        ? base - cols : -1;
    const down = r < rows - 1 ? base + cols : -1;
    const yTop = g.y0 + r * cs;
    const nearTop = (y - yTop)      < inset - 1e-9;
    const nearBot = (yTop + cs - y) < inset - 1e-9;

    let any = 0;
    for (let c = 0; c < cols; c++) {
      let on = sol[base + c];
      if (on && nearTop && (up   < 0 || !sol[up   + c])) on = 0;
      if (on && nearBot && (down < 0 || !sol[down + c])) on = 0;
      mask[c] = on;
      any |= on;
    }
    if (!any) { for (const p of open) sink.poly(p.pts); open = []; continue; }

    const runs = [];
    let start = -1;
    for (let c = 0; c <= cols; c++) {
      const on = c < cols ? mask[c] : 0;
      if (on) { if (start < 0) start = c; }
      else if (start >= 0) {
        const xa = g.x0 + start * cs + inset;
        const xb = g.x0 + c * cs - inset;
        if (xb > xa + 1e-9) runs.push({ xa, xb, pts: null, ex: 0 });
        start = -1;
      }
    }

    for (const run of runs) {
      let best = null, bestD = Infinity;
      for (const p of open) {
        if (p.taken) continue;
        const lo = Math.max(p.xa, run.xa), hi = Math.min(p.xb, run.xb);
        if (hi < lo - 1e-9) continue;                 // no overlap: the hop would cross paper
        const entry = Math.abs(run.xa - p.ex) <= Math.abs(run.xb - p.ex) ? run.xa : run.xb;
        const a = Math.min(p.ex, entry), b = Math.max(p.ex, entry);
        if (a < lo - 1e-9 || b > hi + 1e-9) continue; // and neither may the hop itself
        const d = Math.abs(entry - p.ex);
        if (d < bestD) { bestD = d; best = p; }
      }

      const entry = best ? (Math.abs(run.xa - best.ex) <= Math.abs(run.xb - best.ex) ? run.xa : run.xb)
                         : run.xa;
      run.pts = best ? (best.taken = true, best.pts) : [];
      run.ex  = entry === run.xa ? run.xb : run.xa;
      run.pts.push(entry, y, run.ex, y);
    }

    for (const p of open) if (!p.taken) sink.poly(p.pts);
    open = runs;
  }
  for (const p of open) sink.poly(p.pts);
}

////////////////////////////////////////////////////////////////////////////////////////
// Pass 2b — the outline around every black zone.
//
// The boundary of the solid cells is walked as directed cell edges that always keep the
// black on their right, so every zone comes out as a closed loop and a hole inside a
// zone comes out as a loop of its own, wound the other way. Collinear edges are merged,
// then each loop is offset inwards by the inset: the edges are axis-aligned, so a corner
// is just the horizontal edge's new y against the vertical edge's new x.

const DIR_DX = [1, 0, -1, 0];
const DIR_DY = [0, 1, 0, -1];

function zoneOutlines(g, sol, inset, sink) {
  const cols = g.cols, rows = g.rows;
  const VW = cols + 1;
  const nv = VW * (rows + 1);

  const from = [], dir = [];
  const outA = new Int32Array(nv).fill(-1);
  const outB = new Int32Array(nv).fill(-1);

  const add = (vx, vy, d) => {
    const v = vy * VW + vx, e = from.length;
    from.push(v); dir.push(d);
    if (outA[v] < 0) outA[v] = e; else outB[v] = e;
  };

  for (let r = 0; r < rows; r++) {
    const base = r * cols;
    for (let c = 0; c < cols; c++) {
      if (!sol[base + c]) continue;
      if (r === 0        || !sol[base - cols + c]) add(c,     r,     0); // top    →
      if (c === cols - 1 || !sol[base + c + 1])    add(c + 1, r,     1); // right  ↓
      if (r === rows - 1 || !sol[base + cols + c]) add(c + 1, r + 1, 2); // bottom ←
      if (c === 0        || !sol[base + c - 1])    add(c,     r + 1, 3); // left   ↑
    }
  }

  const used = new Uint8Array(from.length);
  const seq  = [];
  let zones  = 0;

  for (let e0 = 0; e0 < from.length; e0++) {
    if (used[e0]) continue;
    seq.length = 0;

    for (let e = e0; e >= 0; ) {
      used[e] = 1;
      const v = from[e], vx = v % VW, vy = (v - vx) / VW, d = dir[e];
      seq.push(vx, vy, d);

      const nvx = vx + DIR_DX[d], nvy = vy + DIR_DY[d];
      const w = nvy * VW + nvx;
      const a = outA[w], b = outB[w];
      let next = -1;
      // Prefer the sharpest right turn, so cells that only touch at a corner stay
      // separate zones and the loop never crosses itself.
      for (let p = 0; p < 3 && next < 0; p++) {
        const want = (d + [1, 0, 3][p]) % 4;
        if (a >= 0 && !used[a] && dir[a] === want) next = a;
        else if (b >= 0 && !used[b] && dir[b] === want) next = b;
      }
      e = next;
    }
    if (emitLoop(g, seq, inset, sink)) zones++;
  }
  return zones;
}

function emitLoop(g, seq, inset, sink) {
  const n = seq.length / 3;
  if (n < 4) return false;

  // Keep a vertex only where the direction changes — the runs in between are collinear.
  const vs = [];
  for (let i = 0; i < n; i++) {
    const dPrev = seq[((i - 1 + n) % n) * 3 + 2];
    const d     = seq[i * 3 + 2];
    if (d !== dPrev) vs.push(seq[i * 3], seq[i * 3 + 1], d);
  }
  const m = vs.length / 3;
  if (m < 4) return false;

  const out = new Float64Array(2 * (m + 1));
  for (let j = 0; j < m; j++) {
    const x = g.x0 + vs[j * 3]     * g.cs;
    const y = g.y0 + vs[j * 3 + 1] * g.cs;
    const dIn  = vs[((j - 1 + m) % m) * 3 + 2];
    const dOut = vs[j * 3 + 2];
    const nIn  = (dIn  + 1) % 4;                    // inwards is to the right of travel
    const nOut = (dOut + 1) % 4;
    if (DIR_DY[dIn] === 0) {                        // arrived horizontally: it fixes y
      out[j * 2]     = x + inset * DIR_DX[nOut];
      out[j * 2 + 1] = y + inset * DIR_DY[nIn];
    } else {                                        // arrived vertically: it fixes x
      out[j * 2]     = x + inset * DIR_DX[nIn];
      out[j * 2 + 1] = y + inset * DIR_DY[nOut];
    }
  }
  out[m * 2]     = out[0];
  out[m * 2 + 1] = out[1];
  sink.poly(out);
  return true;
}

////////////////////////////////////////////////////////////////////////////////////////
// Cut guides
//
// A dot on every corner of the sheet, and more along its edges until no two are further
// apart than the spacing asks, so a plot run on oversized paper can be trimmed back to
// its nominal size by cutting through them. The marks sit on the page rectangle itself,
// which is the line to cut along; like p5js7's stipple they are hairline stubs rather
// than zero-length paths, because plotter toolchains drop the latter.

function cropMarkShapes(g, sink) {
  const step = Math.max(1, settings.cropMarkGap);
  const dot  = (x, y) => sink.line(x - EPS / 2, y, x + EPS / 2);

  const nx = Math.max(1, Math.ceil(g.W / step));
  const ny = Math.max(1, Math.ceil(g.H / step));

  for (let i = 0; i <= nx; i++) {           // top and bottom edges, corners included
    const x = g.W * i / nx;
    dot(x, 0);
    dot(x, g.H);
  }
  for (let j = 1; j < ny; j++) {            // the side edges, corners already placed
    const y = g.H * j / ny;
    dot(0, y);
    dot(g.W, y);
  }
}

function buildShapes(g, a, t) {
  const sink  = makeSink();
  const sol   = solidMask(g, a, t);
  const inset = zoneInset(g.cs);

  terraceLines(g, a, t, sol, sink);
  const zones = zoneOutlines(g, sol, inset, sink);
  solidHatch(g, sol, inset, sink);
  if (settings.cropMarks) cropMarkShapes(g, sink);

  return {
    pts: Float64Array.from(sink.pts),
    off: Int32Array.from(sink.off),
    zones,
  };
}

////////////////////////////////////////////////////////////////////////////////////////
// Stroke order
//
// Greedy nearest-neighbour over stroke endpoints, either end allowed as the entry point,
// with a uniform bucket grid so the search stays local. Scan order would otherwise send
// the pen across the full width of the sheet whenever a run ends. Greedy lands a little
// above optimal, which no plotter file format lets us close anyway; vpype's linesort
// would redo this pass regardless.

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
// The strokes are drawn straight on the 2D context from the same shapes the SVG exports,
// so what you see is what the plotter draws. Under them, optionally, sits the terraced
// landscape itself — the seven bands as seven greys, over the whole sheet rather than
// only where the automaton is alive. It is never exported; it is there to show where the
// contours fall and how much of the sheet each band owns.

function buildFieldImage(g, fld, t) {
  const step = Math.max(1, Math.ceil(Math.max(g.cols, g.rows) / FIELD_RASTER));
  const w = Math.ceil(g.cols / step), h = Math.ceil(g.rows / step);
  const img = createImage(w, h);

  img.loadPixels();
  for (let j = 0; j < h; j++) {
    const row = Math.min(g.rows - 1, j * step) * g.cols;
    for (let i = 0; i < w; i++) {
      const hv = fld.vals[row + Math.min(g.cols - 1, i * step)];
      const L  = levelAt(hv, t.thr);
      const v  = 255 - Math.round(210 * L / (LEVELS - 1));
      const px = (j * w + i) * 4;
      img.pixels[px] = v; img.pixels[px + 1] = v; img.pixels[px + 2] = v;
      img.pixels[px + 3] = 255;
    }
  }
  img.updatePixels();
  return { img, step, w, h };
}

function drawPreview() {
  background(255);
  const s   = previewScale();
  const ctx = drawingContext;

  if (settings.showField && field && terr && grid) {
    const fi = buildFieldImage(grid, field, terr);
    ctx.save();
    ctx.scale(s, s);
    ctx.globalAlpha = clamp(settings.fieldOpacity / 100, 0, 1);
    ctx.imageSmoothingEnabled = false;
    // The raster is rounded up to whole steps, so it is clipped back to the grid.
    ctx.beginPath();
    ctx.rect(grid.x0, grid.y0, grid.cols * grid.cs, grid.rows * grid.cs);
    ctx.clip();
    ctx.drawImage(fi.img.canvas, grid.x0, grid.y0,
      fi.w * fi.step * grid.cs, fi.h * fi.step * grid.cs);
    ctx.restore();
  }

  if (!shapes) return;
  const { pts, off } = shapes;
  const n = off.length - 1;

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

// The seven terraces laid out along the height range, each as wide as its share and drawn
// with the pattern it stands for — the fastest way to see what the sliders are doing.
function drawBands() {
  if (!bandCanvas) return;
  const ctx = bandCanvas.getContext('2d');
  const W = bandCanvas.width, H = bandCanvas.height;
  const top = 5, tile = 38, lw = 2;
  const { thr, norm } = bandThresholds();

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  ctx.font = '9px -apple-system, sans-serif';
  ctx.textAlign = 'center';

  for (let L = 0; L < LEVELS; L++) {
    const xa = Math.round(thr[L] * W), xb = Math.round(thr[L + 1] * W);
    const w  = xb - xa;
    if (w <= 0) continue;

    ctx.fillStyle = '#000';
    if (L === LEVELS - 1) {
      ctx.fillRect(xa, top, w, tile);
    } else {
      for (let k = 0; k < L; k++) {
        ctx.fillRect(xa, Math.round(top + k * (tile - lw) / 4), w, lw);
      }
    }
    if (w > 2) {
      ctx.strokeStyle = '#ddd';
      ctx.beginPath();
      ctx.moveTo(xb - 0.5, top);
      ctx.lineTo(xb - 0.5, top + tile);
      ctx.stroke();
    }
    if (w >= 18) {
      ctx.fillStyle = '#999';
      ctx.fillText(`${norm[L].toFixed(0)}%`, (xa + xb) / 2, H - 3);
    }
  }

  ctx.strokeStyle = '#ccc';
  ctx.strokeRect(0.5, top - 0.5, W - 1, tile + 1);

  updateShareLabels();
}

////////////////////////////////////////////////////////////////////////////////////////
// UI

function buildControls() {
  const root = 'controls';

  // --- Pen ---
  addSection(root, 'Pen');
  addSlider(root, 'Pen width (mm)', 'penWidth', 0.1, 2, 0.05);
  addSlider(root, 'Solid fill spacing (% of pen)', 'fillPercent', 30, 100, 1,
    'How close the hatch lines inside a black zone run, as a share of the pen width — ' +
    'at 100 % they just touch, below that they overlap into one black surface. The ' +
    'hatch has a lattice of its own, so this is the spacing exactly, not an upper ' +
    'bound that rounds.');
  addColor(root, 'Ink', 'inkColor');

  // --- Paper ---
  addSection(root, 'Paper');
  addSelect(root, 'Size', 'paper', Object.keys(PAPER_SIZES), resizeForPaper);
  addSelect(root, 'Orientation', 'orientation', ['portrait', 'landscape'], resizeForPaper);
  addSlider(root, 'Margin (mm)', 'margin', 0, 50, 1);
  addCheckbox(root, 'Cut guide dots on the sheet edge', 'cropMarks');
  addSlider(root, 'Most between two marks (mm)', 'cropMarkGap', 20, 1000, 10,
    'A dot on each corner of the sheet, and more along the edges until no gap is wider ' +
    'than this — cut through them to trim a plot back out of a larger piece of paper.');
  addSlider(root, 'Cell size (mm)', 'cellSize', 0.5, 400, 0.1,
    'One automaton cell, one terrace tile. Its quarter is the spacing of the five ' +
    'lines, so a tile much smaller than four pen widths cannot show them apart. There ' +
    'is no upper limit: the hatch inside a black zone no longer has to divide the tile, ' +
    'so a cell can be as large as the sheet.');

  // --- Automaton ---
  addSection(root, 'Automaton');

  const ruleField = createDiv('').parent(root).class('field');
  createSpan('Rule  (0 – 4,294,967,295)').parent(ruleField).class('label');
  const ruleRow = createDiv('').parent(ruleField).class('row');
  ruleInput = createInput(String(settings.rule)).parent(ruleRow);
  ruleInput.attribute('type', 'text');
  ruleInput.attribute('placeholder', 'decimal or 0x…');
  ruleInput.style('flex', '1');
  ruleInput.style('min-width', '0');
  ruleInput.style('font-family', 'monospace');
  ruleInput.input(() => {
    const v = parseRule(ruleInput.value());
    if (v !== null) { settings.rule = v; updateRuleInfo(); update(); }
  });
  createButton('Random').parent(ruleRow).class('inline-btn').mousePressed(() => {
    settings.rule = (Math.random() * 4294967296) >>> 0;
    ruleInput.value(String(settings.rule));
    updateRuleInfo();
    update();
  });

  ruleInfoDiv = createDiv('').parent(root).class('rule-info');
  updateRuleInfo();

  const presetField = createDiv('').parent(root).class('field');
  createSpan('Rule preset').parent(presetField).class('label');
  const presetSel = createSelect().parent(presetField);
  for (const p of PRESETS) presetSel.option(p.label);
  presetSel.changed(() => {
    const r = resolvePresetRule(PRESETS[presetSel.elt.selectedIndex]);
    if (r !== null) {
      settings.rule = r;
      ruleInput.value(String(settings.rule));
      updateRuleInfo();
      update();
    }
  });
  createDiv('A 5-cell neighbourhood, so the rule is 32 bits wide. The presets lift the ' +
    'familiar Wolfram rules into that space by ignoring the outermost two cells.')
    .parent(root).class('note');

  addSelect(root, 'Seed type', 'seedType', SEED_TYPES, () => { syncVisibility(); update(); });
  addSlider(root, 'Seed density (random)', 'seedDensity', 0.01, 1, 0.01);
  addSeedField(root, 'Seed value', 'seedValue');
  addCheckbox(root, 'Wrap edges', 'wrapEdges');
  addSlider(root, 'Warm-up generations', 'warmup', 0, 2000, 1,
    'Generations run before the first drawn row — the same rule with its opening ' +
    'transient cut off.');
  addSlider(root, 'Generation step', 'genStep', 1, 12, 1,
    'Draw every n-th generation. Coarser steps break the diagonals up into texture.');
  addCheckbox(root, 'Invert cells', 'invertCells');

  // --- Surface ---
  addSection(root, 'Surface');
  createDiv('A Perlin landscape read at the centre of every tile. It decides how a live ' +
    'cell is drawn, never whether it is alive.').parent(root).class('note');
  addSeedField(root, 'Field seed', 'fieldSeed');
  addSlider(root, 'Feature size (mm)', 'noiseScale', 2, 400, 1);
  addSlider(root, 'Y / X stretch', 'aspect', 0.1, 12, 0.1);
  addSlider(root, 'Rotation (°)', 'angle', 0, 360, 1);
  addSlider(root, 'Octaves', 'octaves', 1, 8, 1);
  addSlider(root, 'Lacunarity', 'lacunarity', 1.2, 4, 0.05);
  addSlider(root, 'Persistence', 'persistence', 0.1, 0.9, 0.01);
  addSlider(root, 'Domain warp', 'warpAmount', 0, 2, 0.05,
    'Bends the terrain through a second noise — swirls and marbling.');
  addSlider(root, 'Warp frequency', 'warpFreq', 0.05, 4, 0.05);
  addSlider(root, 'Pan X', 'panX', -20, 20, 0.1);
  addSlider(root, 'Pan Y', 'panY', -20, 20, 0.1);

  // --- Height mapping ---
  addSection(root, 'Height mapping');
  addSelect(root, 'Height map', 'heightMap', HEIGHT_MAPS, update,
    'Raw noise piles up around its middle, which is what leaves big look-alike areas ' +
    'and thin transitions.<br>' +
    '<b>equalize</b> — every height covers the same amount of paper, so a terrace share ' +
    'is also its share of the sheet.<br><b>min–max</b> — a plain stretch of the range.' +
    '<br><b>raw</b> — the noise as it comes.');
  addSlider(root, 'Contrast', 'contrast', 0.1, 4, 0.05,
    'Spreads the heights away from the middle (>1) or squeezes them into it (<1).');
  addSlider(root, 'Level', 'level', -0.5, 0.5, 0.01,
    'Raises or lowers the whole terrain against the terraces below.');
  addCheckbox(root, 'Invert heights', 'invertHeight');

  // --- Relief ---
  addSection(root, 'Relief (3D)');
  createDiv('Reads the surface as lit ground instead of as height: one flank of every ' +
    'ridge terraces up towards solid, the other down towards bare paper.')
    .parent(root).class('note');
  addSlider(root, 'Relief amount (%)', 'reliefAmount', 0, 100, 1);
  addSlider(root, 'Light angle (°)', 'lightAngle', 0, 360, 1);
  addSlider(root, 'Relief gain', 'reliefGain', 0.05, 4, 0.05);

  // --- Terraces ---
  addSection(root, 'Terraces');
  createDiv('Seven looks, from the lowest ground to the highest. Each slider is that ' +
    'terrace\'s share of the height range; the shares are normalised to 100 %, so ' +
    'pulling one up squeezes the others.').parent(root).class('note');
  const holder = createDiv('').parent(root).class('bands');
  bandCanvas = createElement('canvas').parent(holder).elt;
  bandCanvas.width = 258;
  bandCanvas.height = 56;
  const ends = createDiv('').parent(root).class('band-ends');
  createSpan('low ground').parent(ends);
  createSpan('high ground').parent(ends);
  for (let i = 0; i < LEVELS; i++) addShare(root, i);

  addSelect(root, 'Border dither', 'dither', DITHERS, () => { syncVisibility(); update(); },
    'A terrace border is a contour of the surface, and without dithering it comes out ' +
    'as a hard edge.<br><b>blue noise</b> — frays it evenly.<br>' +
    '<b>ordered</b> — 8×8 Bayer, a visible weave.<br>' +
    '<b>random</b> — a per-tile coin, ragged and clumpy.');
  addSlider(root, 'Dither amount (height)', 'ditherAmount', 0, 0.3, 0.005);

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
  addCheckbox(root, 'Show the terraced landscape', 'showField', true);
  addSlider(root, 'Landscape opacity (%)', 'fieldOpacity', 0, 100, 1, null, true);
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
  setVisible('seedDensity',  settings.seedType === 'random');
  setVisible('ditherAmount', settings.dither !== 'none');
  setVisible('cropMarkGap',  settings.cropMarks);
}

function updateRuleInfo() {
  if (!ruleInfoDiv) return;
  const hex = (settings.rule >>> 0).toString(16).padStart(8, '0').toUpperCase();
  const bin = (settings.rule >>> 0).toString(2).padStart(32, '0');
  ruleInfoDiv.html(
    `<span class="rule-hex">0x${hex}</span>&nbsp;&nbsp;` +
    `<span class="rule-bin">${bin}</span>`
  );
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
    drawPreview();
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

// One compact row per terrace: the name it stands for, its share, and what that share
// works out to once all seven are normalised.
function addShare(parent, i) {
  const key = 'share' + i;
  const row = createDiv('').parent(parent).class('share-row');
  fieldDivs[key] = row;
  createSpan(LEVEL_NAMES[i]).parent(row).class('share-name');
  const sl  = createSlider(0, 100, settings[key], 0.5).parent(row);
  const pct = createSpan('').parent(row).class('share-pct');

  shareRows.push({ i, pct });
  setters[key] = v => sl.value(v);
  sl.input(() => { settings[key] = Number(sl.value()); liveUpdate(); drawBands(); });
  sl.changed(() => update());
  return sl;
}

function updateShareLabels() {
  if (!shareRows.length) return;
  const { norm } = bandThresholds();
  for (const r of shareRows) r.pct.html(`${norm[r.i].toFixed(1)}%`);
}

////////////////////////////////////////////////////////////////////////////////////////

function updateStats() {
  if (!statsDiv) return;

  if (!grid || grid.cells > MAX_CELLS) {
    statsDiv.html(
      `<div class="warn">Grid too large: ${groupNum(grid ? grid.cells : 0)} cells ` +
      `(limit ${groupNum(MAX_CELLS)}).<br>Raise the cell size, or use smaller paper.</div>`
    );
    return;
  }

  if (!plan) {
    statsDiv.html(
      `<div class="warn">${groupNum(strokes)} strokes — past the ${groupNum(MAX_STROKES)} ` +
      `limit, so nothing was ordered or drawn.<br>Raise the cell size or the fill ` +
      `spacing, or give the solid terrace a smaller share.</div>`
    );
    return;
  }

  const quarter = grid.cs / 4;
  const gap     = grid.gap;
  const alive   = auto.on;
  const cells   = grid.cells;
  const seconds = strokes * PEN_CYCLE_S + plan.ink / DRAW_SPEED + plan.travel / TRAVEL_SPEED;

  const lineNote = quarter >= settings.penWidth
    ? `<span class="ok">the five lines stay apart</span>`
    : `<span class="warn">the five lines overlap</span>`;
  const fillNote = gap <= settings.penWidth
    ? `<span class="ok">solid</span>`
    : `<span class="warn">striped, not solid</span>`;
  const zones = shapes.zones;

  let hist = '';
  for (let L = LEVELS - 1; L >= 0; L--) {
    const n = terr.hist[L];
    hist += `<div class="legend"><span class="share-name">${LEVEL_NAMES[L]}</span>` +
      `<b>${groupNum(n)}</b> <span class="dim">` +
      `${alive > 0 ? (100 * n / alive).toFixed(1) : '0.0'} %</span></div>`;
  }

  let warn = '';
  if (strokes > BUSY_STROKES) {
    warn += `<div class="warn">${groupNum(strokes)} strokes is a very long plot — and a ` +
      `big SVG.</div>`;
  }
  if (quarter < settings.penWidth) {
    warn += `<div class="warn">A quarter of a tile is ${quarter.toFixed(2)} mm, narrower ` +
      `than the pen: the middle terraces will not read apart. Raise the cell size to at ` +
      `least ${(4 * settings.penWidth).toFixed(1)} mm, or use a finer nib.</div>`;
  }
  if (field.flatFrac > 0.35) {
    warn += `<div class="warn">${(100 * field.flatFrac).toFixed(0)} % of the sheet is ` +
      `pinned to the very top or bottom of the height range, which is where flat areas ` +
      `come from. Lower the contrast, or switch the height map to <b>equalize</b>.</div>`;
  }

  statsDiv.html(
    `<div>Tile <b>${grid.cs.toFixed(2)} mm</b>, lines ${quarter.toFixed(2)} mm apart ` +
    `— ${lineNote}</div>` +
    `<div>Hatch <b>${gap.toFixed(3)} mm</b> apart — ${fillNote}</div>` +
    `<div>Black zones <b>${groupNum(zones)}</b> ` +
    `<span class="dim">each outlined on its own edge</span></div>` +
    `<div>Grid <b>${groupNum(grid.cols)} × ${groupNum(grid.rows)}</b> ` +
    `= ${groupNum(cells)} tiles</div>` +
    `<div class="big">Alive <b>${groupNum(alive)}</b> ` +
    `<span class="dim">= ${(100 * alive / cells).toFixed(1)} % of the sheet</span></div>` +
    hist +
    `<div>Strokes <b>${groupNum(strokes)}</b> ` +
    `<span class="dim">= as many pen cycles</span></div>` +
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

function metaComment() {
  const s = settings;
  return `cellular automaton terraces — ` +
    `rule=${s.rule} seed=${s.seedType}/${s.seedValue}` +
    `${s.seedType === 'random' ? '@' + s.seedDensity : ''} wrap=${s.wrapEdges} ` +
    `warmup=${s.warmup} step=${s.genStep}${s.invertCells ? ' inverted' : ''} ` +
    `cell=${s.cellSize}mm pen=${s.penWidth}mm fill=${s.fillPercent}%(${grid.gap.toFixed(3)}mm) ` +
    `field=${s.fieldSeed} scale=${s.noiseScale}mm aspect=${s.aspect} angle=${s.angle} ` +
    `oct=${s.octaves}/${s.lacunarity}/${s.persistence} warp=${s.warpAmount}@${s.warpFreq} ` +
    `height=${s.heightMap} contrast=${s.contrast} level=${s.level}` +
    `${s.invertHeight ? ' inverted' : ''} ` +
    `relief=${s.reliefAmount}%@${s.lightAngle}°x${s.reliefGain} ` +
    `shares=${shareList().join('/')} dither=${s.dither}@${s.ditherAmount} ` +
    `${s.cropMarks ? 'cropmarks<=' + s.cropMarkGap + 'mm ' : ''}` +
    `grid=${grid.cols}x${grid.rows} alive=${auto.on} zones=${shapes.zones} ` +
    `strokes=${shapes.off.length - 1}`;
}

function exportSvg() {
  if (!grid || !shapes || !plan || shapes.off.length - 1 === 0) {
    alert('Nothing to export — either the grid is too large, or no cell asks for a line.');
    return;
  }

  const { W, H } = grid;
  const { pts, off } = shapes;
  const { order, flip } = plan;
  const f = n => String(+n.toFixed(3));
  const CHUNK = 400;                       // subpaths per <path>, keeps the DOM small

  let body = '', d = '', held = 0;
  for (let t = 0; t < order.length; t++) {
    const i = order[t], rev = flip[t] === 1;
    const a = off[i], b = off[i + 1];
    const n = b - a;
    // A hatch run is one horizontal segment, a zone outline a closed rectilinear loop;
    // both come out as h/v steps, the smallest the file can be without giving up the
    // "point the pen the way it travels" ordering.
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
    `ca-terraces r${settings.rule} f${settings.fieldSeed} ` +
    `${settings.paper}-${settings.orientation} cell${settings.cellSize} ` +
    `pen${settings.penWidth} ${timestamp()}`,
    'svg'
  );
}
