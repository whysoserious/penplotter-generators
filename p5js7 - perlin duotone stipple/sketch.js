////////////////////////////////////////////////////////////////////////////////////////
// Perlin duotone stipple — a two-pen dot field driven by one Perlin height map
//
// The field is a plain Perlin surface read as a height h in [0,1]: 0 is the lowest ground
// on the sheet, 1 the highest. Every cell of a grid whose pitch comes from the pen width
// is one possible dot, and two curves of h decide what happens there:
//
//   1. is there a dot?    p    = D(h)   — by default rising with the height, so the peaks
//                                         come out solid and the basins stay paper
//   2. which pen?         p(A) = C(h)   — a crossfade from ink B to ink A, wherever you
//                                         put it along the height
//
// Both curves pick from the same family of shapes — linear, power, smoothstep, logistic,
// gaussian, step — so a ramp, a band, a soft threshold or a hard one are all one select
// away. D is then scaled as a whole to land on the coverage percentage you asked for.
// The two pens export as separate SVG files so the plotter can be re-inked between runs.
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};

const PLACEMENTS    = ['grid', 'jittered'];
const DENSITY_MODES = ['target coverage', 'raw curve'];
const LEVEL_FITS    = ['soft', 'gamma', 'scale'];
const HEIGHT_MAPS   = ['equalize', 'min–max', 'raw'];
const EDGE_MODES    = ['none', 'equal width'];
const SHAPES        = ['linear', 'power', 'smoothstep', 'logistic', 'gaussian', 'step'];
const DITHERS       = ['blue noise', 'random', 'ordered'];
const DOT_MARKERS   = ['segment', 'point'];

const PRESETS = [
  { label: '— select preset —' },
  // The default arrangement: ink B fills the lowlands, the paper stays bare through the
  // middle, ink A fills the highlands. The pens change hands inside the white band, so
  // neither one speckles into the other.
  { label: 'Ink B low → white → ink A high', s: {
    noiseScale: 85, aspect: 1, octaves: 3, persistence: 0.5, warpAmount: 0,
    heightMap: 'equalize', contrast: 1, level: 0, edgeMode: 'none', reliefAmount: 0,
    coverage: 40, levelFit: 'gamma', dither: 'blue noise',
    densityShape: 'gaussian', densityCentre: 0.5, densityWidth: 0.85,
    densityGamma: 1, densityInvert: true, wMin: 0, wMax: 1,
    colorShape: 'smoothstep', colorCentre: 0.5, colorWidth: 0.3, colorGamma: 1,
    colorInvert: false, decorrelation: 0, jitter: 45 } },
  // White in the basins, ink B on the slopes, ink A on the peaks — one continuous ramp
  // with no white band at all. The density curve finishes before the ink crossfade
  // starts, which is what gives a band of solid ink B between the paper and ink A.
  { label: 'Height ramp: white → ink B → ink A', s: {
    noiseScale: 85, aspect: 1, octaves: 3, persistence: 0.5, warpAmount: 0,
    heightMap: 'equalize', contrast: 1, level: 0, edgeMode: 'none', reliefAmount: 0,
    coverage: 38, levelFit: 'soft', dither: 'blue noise',
    densityShape: 'smoothstep', densityCentre: 0.4, densityWidth: 0.75,
    densityGamma: 1, densityInvert: false, wMin: 0, wMax: 1,
    colorShape: 'smoothstep', colorCentre: 0.82, colorWidth: 0.35, colorGamma: 1,
    colorInvert: false, decorrelation: 0, jitter: 45 } },
  { label: 'Peaks only (black caps)', s: {
    noiseScale: 70, octaves: 3, persistence: 0.5, warpAmount: 0,
    heightMap: 'equalize', contrast: 1, level: 0, edgeMode: 'none', reliefAmount: 0,
    coverage: 30, levelFit: 'soft', dither: 'blue noise',
    densityShape: 'logistic', densityCentre: 0.55, densityWidth: 0.5,
    densityGamma: 1, densityInvert: false, wMin: 0, wMax: 1,
    colorShape: 'logistic', colorCentre: 0.85, colorWidth: 0.3, colorInvert: false,
    decorrelation: 0, jitter: 45 } },
  { label: 'Contour band (gaussian)', s: {
    noiseScale: 70, octaves: 3, persistence: 0.5, warpAmount: 0.3, warpFreq: 0.5,
    heightMap: 'equalize', contrast: 1, level: 0, edgeMode: 'none', reliefAmount: 0,
    coverage: 25, levelFit: 'soft', dither: 'blue noise',
    densityShape: 'gaussian', densityCentre: 0.5, densityWidth: 0.4,
    densityGamma: 1, densityInvert: false, wMin: 0, wMax: 1,
    colorShape: 'linear', colorCentre: 0.5, colorWidth: 1, colorInvert: false,
    decorrelation: 0, jitter: 45 } },
  { label: 'Wide white shore', s: {
    noiseScale: 95, octaves: 2, persistence: 0.5, warpAmount: 0,
    heightMap: 'equalize', contrast: 1, level: 0, edgeMode: 'none', reliefAmount: 0,
    coverage: 30, levelFit: 'soft', dither: 'blue noise',
    densityShape: 'gaussian', densityCentre: 0.5, densityWidth: 0.5,
    densityGamma: 1, densityInvert: true, wMin: 0, wMax: 1,
    colorShape: 'step', colorCentre: 0.5, colorWidth: 0.3, colorInvert: false,
    decorrelation: 0, jitter: 45 } },
  { label: 'Embossed relief', s: {
    noiseScale: 55, octaves: 3, persistence: 0.5, warpAmount: 0.35, warpFreq: 0.5,
    heightMap: 'equalize', contrast: 1, level: 0, edgeMode: 'none',
    reliefAmount: 100, lightAngle: 135, reliefGain: 0.8,
    coverage: 30, levelFit: 'soft', dither: 'blue noise',
    densityShape: 'gaussian', densityCentre: 0.5, densityWidth: 0.5,
    densityGamma: 1, densityInvert: true, wMin: 0, wMax: 1,
    colorShape: 'step', colorCentre: 0.5, colorWidth: 0.3, colorInvert: false,
    decorrelation: 0, jitter: 45 } },
  { label: 'Fine grain', s: {
    noiseScale: 16, octaves: 2, persistence: 0.6, warpAmount: 0,
    heightMap: 'equalize', contrast: 1, level: 0, edgeMode: 'none', reliefAmount: 0,
    coverage: 30, levelFit: 'soft', dither: 'blue noise',
    densityShape: 'linear', densityCentre: 0.5, densityWidth: 1,
    densityGamma: 1, densityInvert: false, wMin: 0, wMax: 1,
    colorShape: 'linear', colorCentre: 0.5, colorWidth: 1, colorInvert: false,
    decorrelation: 25, jitter: 60 } },
  { label: 'Poster (hard edges)', s: {
    noiseScale: 90, octaves: 3, persistence: 0.5, warpAmount: 0.6, warpFreq: 0.5,
    heightMap: 'min–max', contrast: 1.6, level: 0, edgeMode: 'equal width', edgeWidth: 6,
    reliefAmount: 0, coverage: 40, levelFit: 'scale', dither: 'blue noise',
    densityShape: 'gaussian', densityCentre: 0.5, densityWidth: 0.35,
    densityGamma: 1, densityInvert: true, wMin: 0, wMax: 1,
    colorShape: 'step', colorCentre: 0.5, colorWidth: 0.2, colorInvert: false,
    decorrelation: 0, jitter: 30 } },
];

// Classic 2D gradient noise peaks around ±0.707, so this brings a single octave close to
// the ±1 the height mapping expects before it normalises anything.
const NOISE_NORM = Math.SQRT2;

// A square lattice of round dots is gap-free when the pitch is at most 1/sqrt(2) of the
// pen width — above that, pinholes open between every 2x2 group.
const GAPLESS_FACTOR = Math.SQRT1_2;

const EPS            = 0.01;      // mm — length of the stub that stands in for one dot
const MAX_CELLS      = 4_000_000; // refuse grids that would freeze the browser
const MAX_DOTS       = 1_000_000; // and dot counts no plotter would ever finish
const BUSY_DOTS      = 200_000;   // above this, warn about the plot time
const PREVIEW_MAX_PX = 1500;      // preview canvas resolution (paper is measured in mm)
const MAX_PREVIEW_W  = 900;       // on-screen size of that canvas
const MAX_PREVIEW_H  = 700;
const FIELD_RASTER   = 360;       // longest side of the tone-preview image
const LIVE_BUDGET_MS = 160;       // slower than this and dragging waits for the release
const PEN_CYCLE_S    = 0.3;       // rough pen-up + pen-down time, seconds
const DRAW_SPEED     = 60;        // rough drawing speed, mm/s
const TRAVEL_SPEED   = 150;       // rough pen-up travel speed, mm/s

const settings = {
  // paper + pen
  paper: 'A4',
  orientation: 'portrait',
  margin: 10,
  penWidth: 0.5,        // mm — Rotring nib size
  pitchPercent: 85,     // cell pitch as a percentage of the pen width

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

  // relief — light the surface from one side instead of reading its height
  reliefAmount: 0,      // %
  lightAngle: 135,      // degrees
  reliefGain: 1,

  // edges — optional, and it deliberately flattens everything outside the band
  edgeMode: 'none',
  edgeWidth: 6,         // mm from the mid level out to the extremes

  // how many dots, and where
  densityMode: 'target coverage',
  coverage: 40,         // % of cells that end up carrying a dot
  levelFit: 'gamma',    // how the curve is lifted to that coverage
  dither: 'blue noise', // what the probability is compared against
  placement: 'jittered',
  jitter: 45,           // % of the pitch
  sampleSeed: 1,

  // curve 1 — chance of a dot, as a function of height. Inverted gaussian: ink in both
  // the lowlands and the highlands, paper white through the middle.
  densityShape: 'gaussian',
  densityCentre: 0.5,
  densityWidth: 0.85,
  densityGamma: 1,      // 'power' shape only
  densityInvert: true,  // flip the curve — here it empties the middle band
  wMin: 0,              // floor of the curve
  wMax: 1,              // ceiling of the curve

  // curve 2 — chance of ink A, as a function of height. The pens change hands inside
  // that white band, so neither ink bleeds into the other.
  colorShape: 'smoothstep',
  colorCentre: 0.5,
  colorWidth: 0.3,
  colorGamma: 1,        // 'power' shape only
  colorInvert: false,   // swap which pen sits high
  decorrelation: 0,     // % of a second, independent surface used for the pen choice
  inkA: '#000000',
  inkB: '#cc1a1a',

  // view + output
  showField: true,
  fieldOpacity: 22,
  showA: true,
  showB: true,
  dotMarker: 'segment',
  optimiseOrder: true,
  liveUpdate: true,
};

const setters   = {};        // settings key -> function that moves its control
const fieldDivs = {};        // settings key -> the .field wrapper, for showing/hiding
let statsDiv, btnInkA, btnInkB, rampCanvas;
let grid   = null;           // { W, H, p, cols, rows, cells, x0, y0 }
let field  = null;           // { sig, vals, hist, … } — height at every cell
let sample = null;           // { count, xs, ys, col, nA, nB, plut, alut, … }
let layers = null;           // { A: layer, B: layer } — layer = { n, shapes, plan }
let lastMs = 0;

////////////////////////////////////////////////////////////////////////////////////////
// Helpers

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// Deterministic PRNG so a given seed always reproduces the same image.
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
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

////////////////////////////////////////////////////////////////////////////////////////
// Seeded Perlin noise
//
// p5's own noise() is fine but its seed is global and its range depends on noiseDetail.
// This is classic improved Perlin with a seeded permutation and 16 unit-length gradients,
// so the range is predictable before the height mapping normalises it anyway.

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
// The two curves
//
// One shape family serves both. Everything is written against u = (h - centre) / width,
// so centre says where along the height the interesting part sits and width says how much
// of the height it spans. Both curves are tabulated once per update and the per-cell loop
// only indexes the table.

const LUT_N = 2048;

function shapeValue(shape, h, centre, width, gamma) {
  const u = (h - centre) / Math.max(0.005, width);
  switch (shape) {
    case 'step':       return u >= 0 ? 1 : 0;
    case 'logistic':   return 1 / (1 + Math.exp(-8 * u));
    case 'gaussian':   return Math.exp(-8 * u * u);
    case 'smoothstep': { const s = clamp(u + 0.5, 0, 1); return s * s * s * (s * (s * 6 - 15) + 10); }
    case 'power':      return Math.pow(clamp(u + 0.5, 0, 1), Math.max(0.01, gamma));
    default:           return clamp(u + 0.5, 0, 1);      // linear
  }
}

// How much this cell wants a dot, 0…1. In 'raw curve' mode this *is* the probability;
// in 'target coverage' mode the whole curve is lifted to hit the requested coverage, so
// only its shape matters.
function dotWeight(h) {
  let t = shapeValue(settings.densityShape, h,
    settings.densityCentre, settings.densityWidth, settings.densityGamma);
  if (settings.densityInvert) t = 1 - t;
  return clamp(settings.wMin + (settings.wMax - settings.wMin) * t, 0, 1);
}

// Chance that a dot at this height belongs to ink A.
function inkAProb(h) {
  const t = shapeValue(settings.colorShape, h,
    settings.colorCentre, settings.colorWidth, settings.colorGamma);
  return clamp(settings.colorInvert ? 1 - t : t, 0, 1);
}

// Turning a weight into a probability at the level that hits the requested coverage.
// 'scale' multiplies and clips, which flattens everything above 1/k into one solid tone.
// 'soft' approaches full ink asymptotically and 'gamma' bends the curve instead, so both
// keep a gradient everywhere.
function applyFit(w, k) {
  if (w <= 0) return 0;
  if (k === Infinity) return 1;
  switch (settings.levelFit) {
    case 'gamma': return Math.pow(w, 1 / Math.max(1e-6, k));
    case 'scale': return k * w < 1 ? k * w : 1;
    default:      return 1 - Math.exp(-k * w);
  }
}

// weight[i] and ink[i] are the two curves at h = i / LUT_N.
function buildLuts() {
  const weight = new Float32Array(LUT_N + 1);
  const ink    = new Float32Array(LUT_N + 1);
  for (let i = 0; i <= LUT_N; i++) {
    const h = i / LUT_N;
    weight[i] = dotWeight(h);
    ink[i]    = inkAProb(h);
  }
  return { weight, ink };
}

////////////////////////////////////////////////////////////////////////////////////////
// Dither masks
//
// Comparing the probability against a fresh random number gives white noise: dots clump,
// and a gentle tonal ramp reads as mush. A blue-noise threshold mask spreads the dots as
// evenly as the tone allows, which is what makes a gradient look like shading instead of
// grain. Built once by void-and-cluster and tiled over the sheet.

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

// The mask is only BN_SIZE cells wide, and a large flat area would show it repeating.
// Rolling the threshold by a per-tile constant hides that: a mask built by void and
// cluster keeps its even spacing for any slice of ranks, not just the ones from zero,
// so an offset tile is still blue noise — it just no longer matches its neighbour.
function tileOffsets(count, tileRow, salt) {
  const offs = new Float32Array(count);
  for (let t = 0; t < count; t++) {
    let h = Math.imul(t * 73856093 ^ tileRow * 19349663 ^ salt, 0x27d4eb2d);
    h ^= h >>> 15;
    offs[t] = ((h >>> 0) & 1023) / 1024;
  }
  return offs;
}

// 8x8 Bayer, built by the usual recursive quadrant rule — a deliberate crosshatch
// rather than an invisible dither.
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

////////////////////////////////////////////////////////////////////////////////////////
// Geometry

function paperDims() {
  const [a, b] = PAPER_SIZES[settings.paper];
  return settings.orientation === 'portrait' ? [a, b] : [b, a];
}

function pitchMm() {
  return Math.max(0.01, settings.penWidth * settings.pitchPercent / 100);
}

// Dot centres are inset by half a pen width so ink never spills past the margin; the
// resulting lattice is then centred on the sheet. One cell = one possible dot.
function gridGeometry() {
  const [W, H] = paperDims();
  const p = pitchMm();
  const spanW = W - 2 * settings.margin - settings.penWidth;
  const spanH = H - 2 * settings.margin - settings.penWidth;
  const cols = Math.max(1, Math.floor(spanW / p) + 1);
  const rows = Math.max(1, Math.floor(spanH / p) + 1);
  return {
    W, H, p, cols, rows,
    cells: cols * rows,
    x0: (W - (cols - 1) * p) / 2,
    y0: (H - (rows - 1) * p) / 2,
  };
}

function previewScale() {
  const [w, h] = paperDims();
  return Math.min(PREVIEW_MAX_PX / w, PREVIEW_MAX_PX / h);
}

////////////////////////////////////////////////////////////////////////////////////////

function setup() {
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

  if (grid.cells > MAX_CELLS) {
    field = sample = layers = null;
  } else {
    field  = ensureField(grid);
    sample = sampleDots(grid, field);
    layers = { A: buildLayer(sample, 0), B: buildLayer(sample, 1) };
  }

  lastMs = performance.now() - t0;
  drawPreview();
  drawRamp();
  updateStats();
}

// Called while a slider is being dragged. The height map is cached, so the curve and
// colour sliders are cheap; when a whole update cannot keep up, dragging simply waits
// for the mouse to come up.
function liveUpdate() {
  if (!settings.liveUpdate || lastMs > LIVE_BUDGET_MS) return;
  update();
}

////////////////////////////////////////////////////////////////////////////////////////
// The height map, evaluated once per cell and cached
//
// Everything downstream — the coverage solver, the dot decisions, the tone preview —
// reads these numbers, so dragging a curve slider costs no noise at all.

function fieldSignature(g) {
  const s = settings;
  return [g.cols, g.rows, g.p, s.paper, s.orientation, s.margin,
    s.fieldSeed, s.noiseScale, s.aspect, s.angle, s.panX, s.panY,
    s.octaves, s.lacunarity, s.persistence, s.warpAmount, s.warpFreq,
    s.reliefAmount, s.lightAngle, s.reliefGain,
    s.edgeMode, s.edgeWidth, s.heightMap, s.contrast, s.level].join('|');
}

// Light the surface from one side instead of reading its height: the value becomes how
// steeply the ground tilts towards the lamp, so one flank of every ridge fills with one
// ink and the opposite flank with the other. That is where a sense of depth comes from.
function applyRelief(g, vals) {
  const a = clamp(settings.reliefAmount / 100, 0, 1);
  if (a <= 0) return;

  const src  = vals.slice();
  const ang  = settings.lightAngle * Math.PI / 180;
  const lx   = Math.cos(ang), ly = Math.sin(ang);
  const gsc  = settings.reliefGain * settings.noiseScale / (2 * g.p);
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

// Divide by the local slope and the value stops meaning "how high" and starts meaning
// "how many millimetres from the mid level". Every crossing then spans the same distance
// — at the price of everything further away being pinned to the extremes, which is what
// makes this the poster look rather than the shaded one.
function applyEqualWidth(g, vals) {
  if (settings.edgeMode !== 'equal width') return;

  const D    = Math.max(0.2, settings.edgeWidth);
  const src  = vals.slice();
  const cols = g.cols, rows = g.rows, p = g.p;
  const R    = 2;                       // stencil radius, in cells — steadier than ±1

  for (let r = 0; r < rows; r++) {
    const base = r * cols;
    const rm = (r > R ? r - R : 0) * cols, rp = (r + R < rows ? r + R : rows - 1) * cols;
    const dy = ((rp - rm) / cols) * p;
    for (let c = 0; c < cols; c++) {
      const cm = c > R ? c - R : 0, cp = c + R < cols ? c + R : cols - 1;
      const gx = (src[base + cp] - src[base + cm]) / ((cp - cm) * p);
      const gy = dy > 0 ? (src[rp + c] - src[rm + c]) / dy : 0;
      const gm = Math.sqrt(gx * gx + gy * gy);
      vals[base + c] = gm > 1e-9
        ? clamp(src[base + c] / (gm * D), -1, 1)
        : (src[base + c] >= 0 ? 1 : -1);
    }
  }
}

// Raw noise crowds around the middle of its range, which is why a straight reading leaves
// broad look-alike areas and only thin transitions. Equalising spreads the heights so
// every tone covers the same amount of paper — the whole sheet becomes gradient.
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
  return { rawMin: min, rawMax: max };
}

function ensureField(g) {
  const sig = fieldSignature(g);
  if (field && field.sig === sig && field.vals.length === g.cells) return field;

  const sampler = makeFieldSampler(settings.fieldSeed);
  const vals = new Float32Array(g.cells);

  for (let r = 0; r < g.rows; r++) {
    const y = g.y0 + r * g.p, base = r * g.cols;
    for (let c = 0; c < g.cols; c++) vals[base + c] = sampler(g.x0 + c * g.p, y);
  }
  applyRelief(g, vals);
  applyEqualWidth(g, vals);
  const raw = toHeights(vals);

  // Distribution of the heights — the coverage solver works from this, never from the
  // cells themselves.
  const hist = new Int32Array(LUT_N + 1);
  let flat = 0;
  for (let i = 0; i < vals.length; i++) {
    const h = vals[i];
    if (h <= 0 || h >= 1) flat++;
    hist[(h * LUT_N) | 0]++;
  }
  return { sig, vals, hist, flatFrac: flat / g.cells, ...raw };
}

////////////////////////////////////////////////////////////////////////////////////////
// Sampling

// The height histogram already says how many cells sit at every level, so the solver
// bisects over LUT_N buckets instead of millions of cells.
function solveScale(fld, cells, target, wlut) {
  const hist = fld.hist;
  let support = 0;
  for (let i = 0; i <= LUT_N; i++) if (wlut[i] > 0) support += hist[i];

  const maxCoverage = support / cells;           // every cell the curve allows, at p = 1
  if (target <= 0)           return { k: 0, maxCoverage };
  if (target >= maxCoverage) return { k: Infinity, maxCoverage };

  // Every fit is monotone in k, so plain bisection finds the level.
  const covered = k => {
    let sum = 0;
    for (let i = 0; i <= LUT_N; i++) {
      const h = hist[i];
      if (h === 0 || wlut[i] <= 0) continue;
      sum += h * applyFit(wlut[i], k);
    }
    return sum / cells;
  };

  let lo = 0, hi = 1;
  while (covered(hi) < target && hi < 1e6) hi *= 2;
  for (let it = 0; it < 50; it++) {
    const mid = (lo + hi) / 2;
    if (covered(mid) < target) lo = mid; else hi = mid;
  }
  return { k: (lo + hi) / 2, maxCoverage };
}

function sampleDots(g, fld) {
  const cells  = g.cells;
  const target = clamp(settings.coverage, 0, 100) / 100;
  const byTarget = settings.densityMode === 'target coverage';

  const luts = buildLuts();
  const wlut = luts.weight, alut = luts.ink;
  const solved = byTarget ? solveScale(fld, cells, target, wlut) : { k: 1, maxCoverage: 1 };
  const k = solved.k;

  // Fold the level fit into the table, so the cell loop is one lookup and a compare.
  const plut = new Float32Array(LUT_N + 1);
  for (let i = 0; i <= LUT_N; i++) plut[i] = byTarget ? applyFit(wlut[i], k) : wlut[i];

  const dither = settings.dither;
  const bn = dither === 'blue noise' ? getBlueNoise() : null;

  const capacity = Math.min(cells, MAX_DOTS);
  const xs  = new Float64Array(capacity);
  const ys  = new Float64Array(capacity);
  const col = new Uint8Array(capacity);          // 0 = ink A, 1 = ink B

  const rnd    = mulberry32(settings.sampleSeed);
  const colorS = settings.decorrelation > 0
    ? makeFieldSampler((settings.fieldSeed + 0x9e3779b9) >>> 0)
    : null;
  const dec = clamp(settings.decorrelation / 100, 0, 1);

  // Jitter moves the dot, not the sample point: a fraction of a millimetre would not
  // change a surface whose features are tens of millimetres wide.
  const jit = settings.placement === 'jittered'
    ? g.p * clamp(settings.jitter, 0, 100) / 100 : 0;
  const inset = settings.margin + settings.penWidth / 2;
  const minX = inset, maxX = g.W - inset;
  const minY = inset, maxY = g.H - inset;

  const vals = fld.vals;
  const cols = g.cols, pitch = g.p, x0 = g.x0;
  let count = 0, nA = 0, nB = 0, capped = false;

  const tiles = bn ? Math.ceil(cols / BN_SIZE) : 0;
  let offsD = null, offsC = null, offsRow = -1;

  for (let r = 0; r < g.rows && !capped; r++) {
    const yc = g.y0 + r * pitch, base = r * cols;
    const bnRow  = bn ? (r & (BN_SIZE - 1)) * BN_SIZE : 0;
    const bnRowC = bn ? ((r + 29) & (BN_SIZE - 1)) * BN_SIZE : 0;
    const byRow  = (r & 7) * 8;

    if (bn && (r / BN_SIZE | 0) !== offsRow) {
      offsRow = r / BN_SIZE | 0;
      offsD = tileOffsets(tiles, offsRow, 0x1234);
      offsC = tileOffsets(tiles, offsRow, 0x9e37);
    }

    for (let c = 0; c < cols; c++) {
      const h   = vals[base + c];
      const idx = (h * LUT_N) | 0;
      const p   = plut[idx];
      if (p <= 0) continue;

      // Blue noise and Bayer are fixed thresholds tied to the cell, so a smooth ramp of
      // p comes out as an evenly spread ramp of dots instead of random clumps.
      if (p < 1) {
        let thr;
        if (bn) {
          thr = bn[bnRow + (c & (BN_SIZE - 1))] + offsD[c / BN_SIZE | 0];
          if (thr >= 1) thr -= 1;
        } else {
          thr = dither === 'ordered' ? BAYER8[byRow + (c & 7)] : rnd();
        }
        if (thr >= p) continue;
      }

      let x = x0 + c * pitch, y = yc;
      if (jit > 0) {
        x = clamp(x + (rnd() - 0.5) * jit, minX, maxX);
        y = clamp(y + (rnd() - 0.5) * jit, minY, maxY);
      }

      // The pen choice can follow a second surface instead of this one.
      let ci = idx;
      if (colorS) {
        const hc = clamp(h + (clamp((colorS(x, y) + 1) / 2, 0, 1) - h) * dec, 0, 1);
        ci = (hc * LUT_N) | 0;
      }
      let ct = rnd();
      if (bn) {
        ct = bn[bnRowC + ((c + 47) & (BN_SIZE - 1))] + offsC[c / BN_SIZE | 0];
        if (ct >= 1) ct -= 1;
      }
      const isB = ct >= alut[ci];

      xs[count] = x; ys[count] = y; col[count] = isB ? 1 : 0;
      count++;
      if (isB) nB++; else nA++;

      if (count >= capacity) { capped = true; break; }
    }
  }

  return {
    count, xs, ys, col, nA, nB, capped, plut, alut,
    scale: k, maxCoverage: solved.maxCoverage, byTarget,
    targetPct: byTarget ? target * 100 : null,
  };
}

////////////////////////////////////////////////////////////////////////////////////////
// Shapes — what the pen draws, as flat polylines in millimetres.
// Shape i owns points off[i] … off[i+1]-1. Every dot is a hairline stub so that plotter
// toolchains which drop zero-length paths still see it.

function buildLayer(s, which) {
  let n = 0;
  for (let i = 0; i < s.count; i++) if (s.col[i] === which) n++;

  const pts = new Float64Array(n * 4);
  const off = new Int32Array(n + 1);
  let k = 0;
  for (let i = 0; i < s.count; i++) {
    if (s.col[i] !== which) continue;
    const x = s.xs[i], y = s.ys[i];
    pts[k * 4]     = x - EPS / 2; pts[k * 4 + 1] = y;
    pts[k * 4 + 2] = x + EPS / 2; pts[k * 4 + 3] = y;
    off[k] = k * 2;
    k++;
  }
  off[n] = n * 2;

  const shapes = { pts, off };
  return { n, shapes, plan: orderShapes(shapes) };
}

// Greedy nearest-neighbour over shape endpoints, either end allowed as the entry point,
// with a uniform bucket grid so the search stays local. Scan order would otherwise send
// the pen across the full width of the sheet on every row. Greedy lands a little above
// optimal, which no plotter file format lets us close anyway; vpype's linesort would redo
// this pass regardless.
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

function layerSeconds(layer) {
  if (!layer || layer.n === 0) return 0;
  return layer.n * PEN_CYCLE_S + layer.plan.ink / DRAW_SPEED + layer.plan.travel / TRAVEL_SPEED;
}

////////////////////////////////////////////////////////////////////////////////////////
// Preview
//
// The dots are drawn straight on the 2D context from the same shapes the SVG exports, so
// what you see is what the plotter draws. Under them sits the tone the two curves ask
// for — how dark, in which ink — which is what the dots are trying to reproduce. It is
// never exported.

function toneRgb(h, A, B) {
  const i  = (clamp(h, 0, 1) * LUT_N) | 0;
  const p  = sample.plut[i];
  const pa = sample.alut[i];
  const r  = B[0] + (A[0] - B[0]) * pa;
  const g  = B[1] + (A[1] - B[1]) * pa;
  const b  = B[2] + (A[2] - B[2]) * pa;
  return [255 + (r - 255) * p, 255 + (g - 255) * p, 255 + (b - 255) * p];
}

function buildToneImage(g, fld) {
  const step = Math.max(1, Math.ceil(Math.max(g.cols, g.rows) / FIELD_RASTER));
  const w = Math.ceil(g.cols / step), h = Math.ceil(g.rows / step);
  const img = createImage(w, h);
  const A = hexToRgb(settings.inkA), B = hexToRgb(settings.inkB);

  img.loadPixels();
  for (let j = 0; j < h; j++) {
    const row = Math.min(g.rows - 1, j * step) * g.cols;
    for (let i = 0; i < w; i++) {
      const [r, gg, b] = toneRgb(fld.vals[row + Math.min(g.cols - 1, i * step)], A, B);
      const px = (j * w + i) * 4;
      img.pixels[px] = r; img.pixels[px + 1] = gg; img.pixels[px + 2] = b;
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

  if (settings.showField && field && sample && grid) {
    const tone = buildToneImage(grid, field);
    ctx.save();
    ctx.scale(s, s);
    ctx.globalAlpha = clamp(settings.fieldOpacity / 100, 0, 1);
    ctx.drawImage(tone.img.canvas,
      grid.x0 - grid.p / 2, grid.y0 - grid.p / 2,
      tone.w * tone.step * grid.p, tone.h * tone.step * grid.p);
    ctx.restore();
  }
  if (!layers) return;

  // Ink B first so ink A ends up on top, matching a plot drawn black last.
  if (settings.showB) strokeLayer(ctx, layers.B, settings.inkB, s);
  if (settings.showA) strokeLayer(ctx, layers.A, settings.inkA, s);
}

function strokeLayer(ctx, layer, colour, s) {
  if (!layer || layer.n === 0) return;
  const { pts, off } = layer.shapes;
  const n = off.length - 1;

  ctx.save();
  ctx.scale(s, s);
  ctx.strokeStyle = colour;
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

// A strip of the finished tone from the lowest ground on the left to the highest on the
// right — the fastest way to see what the two curves are actually doing to the sheet.
function drawRamp() {
  if (!rampCanvas || !sample) return;
  const ctx = rampCanvas.getContext('2d');
  const W = rampCanvas.width, H = rampCanvas.height;
  const A = hexToRgb(settings.inkA), B = hexToRgb(settings.inkB);

  const img = ctx.createImageData(W, H);
  for (let x = 0; x < W; x++) {
    const [r, g, b] = toneRgb(x / (W - 1), A, B);
    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

////////////////////////////////////////////////////////////////////////////////////////
// UI

function buildControls() {
  const root = 'controls';

  // --- Pen ---
  addSection(root, 'Pen');
  addSlider(root, 'Pen width (mm)', 'penWidth', 0.1, 2, 0.05);
  addSlider(root, 'Cell pitch (% of pen)', 'pitchPercent', 40, 200, 1,
    'One cell = one possible dot, so the pitch decides what “100 % covered” means.');

  // --- Paper ---
  addSection(root, 'Paper');
  addSelect(root, 'Size', 'paper', Object.keys(PAPER_SIZES), resizeForPaper);
  addSelect(root, 'Orientation', 'orientation', ['portrait', 'landscape'], resizeForPaper);
  addSlider(root, 'Margin (mm)', 'margin', 0, 50, 1);

  // --- Dot count ---
  addSection(root, 'Dot count');
  addSelect(root, 'Density mode', 'densityMode', DENSITY_MODES, () => {
    setVisible('coverage', settings.densityMode === 'target coverage');
    setVisible('levelFit', settings.densityMode === 'target coverage');
    update();
  },
    '<b>target coverage</b> — the curve decides only <i>where</i> dots go; its overall ' +
    'level is scaled so the coverage slider lands exactly.<br>' +
    '<b>raw curve</b> — the curve is the probability itself.');
  addSlider(root, 'Coverage (% of cells with a dot)', 'coverage', 0.1, 100, 0.1);
  addSelect(root, 'Level fit', 'levelFit', LEVEL_FITS, update,
    '<b>gamma</b> — bends the curve, which keeps the very ends of the height range at ' +
    'full ink and thins out everything below them. Saturated extremes, long fade.<br>' +
    '<b>soft</b> — lifts the whole curve towards solid asymptotically: the gentlest ' +
    'gradient, but the extremes stop short of full ink at low coverage.<br>' +
    '<b>scale</b> — multiplies and clips: flat solid areas with hard borders.');
  addSelect(root, 'Dither', 'dither', DITHERS, update,
    '<b>blue noise</b> — dots spread as evenly as the tone allows.<br>' +
    '<b>random</b> — a fresh coin per cell; clumpy, grainier.<br>' +
    '<b>ordered</b> — 8×8 Bayer, a visible crosshatch.');
  addSelect(root, 'Placement', 'placement', PLACEMENTS, update);
  addSlider(root, 'Jitter (% of pitch)', 'jitter', 0, 100, 1);
  addSeedField(root, 'Dot seed', 'sampleSeed');

  // --- Surface ---
  addSection(root, 'Surface');
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
    '<b>equalize</b> — every height covers the same amount of paper: the whole sheet ' +
    'becomes gradient.<br><b>min–max</b> — a plain stretch of the range.<br>' +
    '<b>raw</b> — the noise as it comes.');
  addSlider(root, 'Contrast', 'contrast', 0.1, 4, 0.05,
    'Spreads the heights away from the middle (>1) or squeezes them into it (<1).');
  addSlider(root, 'Level', 'level', -0.5, 0.5, 0.01,
    'Raises or lowers the whole terrain against the curves below.');

  // --- Relief ---
  addSection(root, 'Relief (3D)');
  createDiv('Reads the surface as lit ground instead of as height: one flank of every ' +
    'ridge fills with ink A, the other with ink B, the flats stay paper.')
    .parent(root).class('note');
  addSlider(root, 'Relief amount (%)', 'reliefAmount', 0, 100, 1);
  addSlider(root, 'Light angle (°)', 'lightAngle', 0, 360, 1);
  addSlider(root, 'Relief gain', 'reliefGain', 0.05, 4, 0.05);

  // --- Edges ---
  addSection(root, 'Edges');
  addSelect(root, 'Edge mode', 'edgeMode', EDGE_MODES, () => {
    setVisible('edgeWidth', settings.edgeMode === 'equal width');
    update();
  },
    '<b>equal width</b> — divides the surface by its own slope, so every crossing of the ' +
    'mid level spans the same distance. Everything further away pins to the extremes, so ' +
    'this is the poster look: crisp borders, flat insides.');
  addSlider(root, 'Transition width (mm)', 'edgeWidth', 0.5, 60, 0.5);
  setVisible('edgeWidth', settings.edgeMode === 'equal width');

  // --- Dot curve ---
  addSection(root, 'Curve 1 — dot or nothing');
  createDiv('Chance of a dot against the height. With <b>linear</b> at centre 0.5 and ' +
    'width 1 the sheet ramps from empty at the lowest ground to solid at the highest.')
    .parent(root).class('note');
  addSelect(root, 'Shape', 'densityShape', SHAPES, update,
    '<b>linear</b> — straight ramp.<br><b>power</b> — ramp bent by gamma.<br>' +
    '<b>smoothstep</b> — ramp eased in and out.<br>' +
    '<b>logistic</b> — soft threshold, flat outside the band.<br>' +
    '<b>gaussian</b> — a band of dots at one height, empty above and below.<br>' +
    '<b>step</b> — hard threshold.');
  addSlider(root, 'Centre (height)', 'densityCentre', 0, 1, 0.01);
  addSlider(root, 'Width (of height)', 'densityWidth', 0.02, 2, 0.01,
    'How much of the height range the shape spans. On the default flipped gaussian this ' +
    'is the width of the bare paper through the middle: wider = a longer fade out of ' +
    'each ink, narrower = a tight white shoreline.');
  addSlider(root, 'Gamma (power shape)', 'densityGamma', 0.1, 6, 0.05);
  addCheckbox(root, 'Flip the curve', 'densityInvert');
  createDiv('On a ramp, flipping moves the ink to the low ground. On a gaussian it ' +
    'empties the band and inks both ends instead — which is what puts ink B in the ' +
    'lowlands, paper in the middle and ink A on the peaks.')
    .parent(root).class('note');
  addSlider(root, 'Floor weight', 'wMin', 0, 1, 0.01,
    'Chance left over where the shape says nothing — a scatter of dots everywhere.');
  addSlider(root, 'Ceiling weight', 'wMax', 0, 1, 0.01);

  // --- Colour curve ---
  addSection(root, 'Curve 2 — which pen');
  createDiv('Chance of ink A against the height. Put its centre above the dot curve and ' +
    'you get paper, then a band of pure ink B, then ink A on the peaks.')
    .parent(root).class('note');
  addSelect(root, 'Shape', 'colorShape', SHAPES, update);
  addSlider(root, 'Centre (height)', 'colorCentre', 0, 1, 0.01);
  addSlider(root, 'Width (of height)', 'colorWidth', 0.02, 2, 0.01,
    'How much of the height range the two pens mix over. Narrow = a clean line ' +
    'between them, wide = a long speckled blend.');
  addSlider(root, 'Gamma (power shape)', 'colorGamma', 0.1, 6, 0.05);
  addCheckbox(root, 'Swap the pens', 'colorInvert');
  addSlider(root, 'Decorrelate (%)', 'decorrelation', 0, 100, 1,
    'Blends a second, independent surface into the pen choice, so the colour stops ' +
    'following the height exactly.');
  addColor(root, 'Ink A', 'inkA');
  addColor(root, 'Ink B', 'inkB');

  // --- Tone strip ---
  addSection(root, 'Tone');
  createDiv('The finished sheet, as the pens will lay it down, read from the lowest ' +
    'ground to the highest.')
    .parent(root).class('note');
  const holder = createDiv('').parent(root).class('ramp');
  rampCanvas = createElement('canvas').parent(holder).elt;
  rampCanvas.width = 258;
  rampCanvas.height = 30;
  const ends = createDiv('').parent(root).class('ramp-ends');
  createSpan('low ground').parent(ends);
  createSpan('high ground').parent(ends);

  // --- View ---
  addSection(root, 'View');
  addCheckbox(root, 'Show target tone (preview only)', 'showField', true);
  addSlider(root, 'Tone opacity (%)', 'fieldOpacity', 0, 100, 1, null, true);
  addCheckbox(root, 'Show ink A dots', 'showA', true);
  addCheckbox(root, 'Show ink B dots', 'showB', true);
  addCheckbox(root, 'Live update while dragging', 'liveUpdate', true);

  // --- Presets ---
  addSection(root, 'Presets');
  const presetSel = createSelect().parent(createDiv('').parent(root).class('field'));
  for (const p of PRESETS) presetSel.option(p.label);
  presetSel.changed(() => {
    const p = PRESETS[presetSel.elt.selectedIndex];
    if (p && p.s) applyPreset(p.s);
  });

  // --- Stats + actions ---
  addSection(root, 'Plot');
  statsDiv = createDiv('').parent(root).class('stats');

  createButton('Regenerate').parent(root).mousePressed(update);

  const row = createDiv('').parent(root).class('btn-row');
  btnInkA = createButton('Export SVG — ink A').parent(row);
  btnInkB = createButton('Export SVG — ink B').parent(row);
  btnInkA.mousePressed(() => exportSvg('A'));
  btnInkB.mousePressed(() => exportSvg('B'));
  refreshExportButtons();

  createButton('Export SVG — both layers').parent(root).mousePressed(() => exportSvg('both'));
  createDiv('One file per pen: plot ink A, swap the pen, plot ink B on the same sheet. ' +
    'The <b>both</b> file carries the two as Inkscape layers, for previewing.')
    .parent(root).class('note');

  addSelect(root, 'SVG dot marker', 'dotMarker', DOT_MARKERS, () => {},
    'File only — nothing on screen changes.<br>' +
    '<b>segment</b> — 0.01 mm stub, survives every plotter toolchain.<br>' +
    '<b>point</b> — zero-length path, smaller file, some software drops it.');
  addCheckbox(root, 'Optimise stroke order', 'optimiseOrder');
}

// The export buttons wear the ink they export, so there is no doubt which is which.
function refreshExportButtons() {
  if (btnInkA) btnInkA.style('background', settings.inkA);
  if (btnInkB) btnInkB.style('background', settings.inkB);
}

function applyPreset(patch) {
  for (const k in patch) {
    settings[k] = patch[k];
    if (setters[k]) setters[k](patch[k]);
  }
  setVisible('edgeWidth', settings.edgeMode === 'equal width');
  refreshExportButtons();
  update();
}

function addSection(parent, title) {
  createDiv(title).parent(parent).class('section');
}

function setVisible(key, on) {
  if (fieldDivs[key]) fieldDivs[key].style('display', on ? '' : 'none');
}

// redrawOnly controls skip the whole pipeline — nothing about the dots changes.
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

  const refresh = () => redrawOnly ? drawPreview() : update();
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
    if (redrawOnly) { drawPreview(); updateStats(); } else update();
  });
  return cb;
}

// Ink colours are only a stroke attribute, but the tone preview is painted with them.
function addColor(parent, labelText, key) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const cp = createColorPicker(settings[key]).parent(field);
  setters[key] = v => cp.value(v);
  cp.input(() => {
    settings[key] = cp.value();
    refreshExportButtons();
    drawPreview();
    drawRamp();
    updateStats();
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

function updateStats() {
  if (!statsDiv) return;

  const p = pitchMm();
  const f = settings.pitchPercent / 100;
  const pitchNote = f <= GAPLESS_FACTOR
    ? '<span class="ok">100 % coverage would read as solid</span>'
    : f <= 1
      ? '<span class="dim">neighbouring dots touch, pinholes at the corners</span>'
      : '<span class="dim">neighbouring dots never touch</span>';

  if (!grid || grid.cells > MAX_CELLS || !sample || !layers) {
    statsDiv.html(
      `<div class="warn">Grid too large: ${groupNum(grid ? grid.cells : 0)} cells ` +
      `(limit ${groupNum(MAX_CELLS)}).<br>Raise the pen width or the pitch, or use ` +
      `smaller paper.</div>`
    );
    return;
  }

  const A = layers.A, B = layers.B;
  const total = sample.count;
  const secA = layerSeconds(A), secB = layerSeconds(B);
  const covPct = 100 * total / grid.cells;

  const swatch = c => `<span class="sw" style="background:${c}"></span>`;
  const pct = (a, b) => b > 0 ? `${(100 * a / b).toFixed(1)} %` : '—';

  let warn = '';
  if (sample.capped) {
    warn += `<div class="warn">Stopped at ${groupNum(MAX_DOTS)} dots — the hard limit. ` +
      `Lower the coverage or raise the pitch.</div>`;
  }
  if (sample.byTarget && sample.targetPct / 100 > sample.maxCoverage + 1e-9) {
    warn += `<div class="warn">This curve can only reach ` +
      `<b>${(100 * sample.maxCoverage).toFixed(1)} %</b> coverage — it drops to zero over ` +
      `the rest of the sheet. Widen it, or raise the floor weight, to go denser.</div>`;
  }
  if (total > BUSY_DOTS) {
    warn += `<div class="warn">${groupNum(total)} dots is a very long plot — and a big ` +
      `SVG.</div>`;
  }
  if (field.flatFrac > 0.35) {
    warn += `<div class="warn">${(100 * field.flatFrac).toFixed(0)} % of the sheet is ` +
      `pinned to the very top or bottom of the height range, which is where flat areas ` +
      `come from. Lower the contrast, or switch the height map to <b>equalize</b>.</div>`;
  }

  const fitNote = sample.byTarget
    ? `<div class="dim">${settings.levelFit} fit, k = ${sample.scale === Infinity ? '∞'
        : sample.scale.toFixed(2)} · ${settings.dither} · ` +
      `max ${(100 * sample.maxCoverage).toFixed(0)} %</div>`
    : `<div class="dim">raw curve · ${settings.dither}</div>`;

  statsDiv.html(
    `<div>Cell <b>${p.toFixed(3)} mm</b> — ${pitchNote}</div>` +
    `<div>Grid <b>${groupNum(grid.cols)} × ${groupNum(grid.rows)}</b> ` +
    `= ${groupNum(grid.cells)} cells</div>` +
    `<div>Height map <b>${settings.heightMap}</b> ` +
    `<span class="dim">(${(100 * field.flatFrac).toFixed(0)} % at the very ends)</span></div>` +
    `<div class="big">Dots <b>${groupNum(total)}</b> ` +
    `<span class="dim">= ${covPct.toFixed(1)} % of cells covered` +
    (sample.byTarget ? `, asked for ${sample.targetPct.toFixed(1)} %` : '') +
    `</span></div>` +
    fitNote +
    `<div class="legend">${swatch(settings.inkA)} ink A <b>${groupNum(A.n)}</b> ` +
    `<span class="dim">${pct(A.n, total)}</span></div>` +
    `<div class="legend">${swatch(settings.inkB)} ink B <b>${groupNum(B.n)}</b> ` +
    `<span class="dim">${pct(B.n, total)}</span></div>` +
    `<div>Travel <b>${(A.plan.travel / 1000).toFixed(1)} m</b> + ` +
    `<b>${(B.plan.travel / 1000).toFixed(1)} m</b> with the pen up</div>` +
    `<div>Rough plot time <b>${formatDuration(secA)}</b> + ` +
    `<b>${formatDuration(secB)}</b> = <b>${formatDuration(secA + secB)}</b></div>` +
    `<div class="dim">generated in ${Math.round(lastMs)} ms</div>` +
    warn
  );
}

////////////////////////////////////////////////////////////////////////////////////////
// SVG export
//
// One stroke group per pen, no fills, no background rectangle — everything in the file is
// meant to be plotted. stroke-width is the pen width and the caps are round, so the file
// previews exactly as the finished plot looks. Dots come out in the order the pen should
// visit them.

function layerBody(layer) {
  const { pts, off } = layer.shapes;
  const { order, flip } = layer.plan;
  const fmt = n => String(+n.toFixed(3));
  const asPoint = settings.dotMarker === 'point';
  const CHUNK = 400;                       // subpaths per <path>, keeps the DOM small

  let body = '', d = '', held = 0;
  for (let t = 0; t < order.length; t++) {
    const i = order[t], rev = flip[t] === 1;
    const a = off[i], b = off[i + 1];

    if (asPoint) {
      d += `M${fmt((pts[a * 2] + pts[(b - 1) * 2]) / 2)},${fmt(pts[a * 2 + 1])}l0,0`;
    } else {
      const x0 = rev ? pts[(b - 1) * 2] : pts[a * 2];
      const x1 = rev ? pts[a * 2] : pts[(b - 1) * 2];
      d += `M${fmt(x0)},${fmt(pts[a * 2 + 1])}l${fmt(x1 - x0)},0`;
    }

    if (++held >= CHUNK) { body += `  <path d="${d}"/>\n`; d = ''; held = 0; }
  }
  if (d) body += `  <path d="${d}"/>\n`;
  return body;
}

function metaComment() {
  const s = settings;
  return `perlin duotone stipple — ` +
    `fieldSeed=${s.fieldSeed} dotSeed=${s.sampleSeed} ` +
    `scale=${s.noiseScale}mm aspect=${s.aspect} angle=${s.angle} ` +
    `oct=${s.octaves}/${s.lacunarity}/${s.persistence} warp=${s.warpAmount}@${s.warpFreq} ` +
    `height=${s.heightMap} contrast=${s.contrast} level=${s.level} ` +
    `relief=${s.reliefAmount}%@${s.lightAngle}°x${s.reliefGain} ` +
    `edges=${s.edgeMode}${s.edgeMode === 'equal width' ? '/' + s.edgeWidth + 'mm' : ''} ` +
    `density=${s.densityMode}/${s.coverage}% fit=${s.levelFit} dither=${s.dither} ` +
    `placement=${s.placement}${s.placement === 'jittered' ? '/' + s.jitter + '%' : ''} ` +
    `curve1=${s.densityShape}@${s.densityCentre}±${s.densityWidth}` +
    `${s.densityShape === 'power' ? ',g' + s.densityGamma : ''}` +
    `${s.densityInvert ? ',inverted' : ''},${s.wMin}..${s.wMax},` +
    `k${sample.scale === Infinity ? 'max' : sample.scale.toFixed(3)} ` +
    `curve2=${s.colorShape}@${s.colorCentre}±${s.colorWidth}` +
    `${s.colorInvert ? ',swapped' : ''},decorr${s.decorrelation}% ` +
    `pen=${s.penWidth}mm pitch=${pitchMm().toFixed(3)}mm ` +
    `grid=${grid.cols}x${grid.rows} dots=${sample.count}(A ${layers.A.n}/B ${layers.B.n})`;
}

function exportSvg(which) {
  if (!grid || !sample || !layers) {
    alert('Nothing to export — the grid is too large. Raise the pen width or the pitch, ' +
      'or use smaller paper.');
    return;
  }

  const pick = which === 'B' ? [['B', settings.inkB]]
    : which === 'A' ? [['A', settings.inkA]]
    : [['A', settings.inkA], ['B', settings.inkB]];

  if (pick.every(([k]) => layers[k].n === 0)) {
    alert(`Ink ${which} has no dots to export.`);
    return;
  }

  const { W, H } = grid;
  const fmt = n => String(+n.toFixed(3));
  const both = pick.length > 1;

  let groups = '';
  for (const [k, colour] of pick) {
    const layerAttrs = both
      ? ` inkscape:groupmode="layer" inkscape:label="ink ${k}"` : '';
    groups +=
      `<g${layerAttrs} fill="none" stroke="${colour}" ` +
      `stroke-width="${fmt(settings.penWidth)}" ` +
      `stroke-linecap="round" stroke-linejoin="round">\n` +
      layerBody(layers[k]) +
      `</g>\n`;
  }

  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- ${metaComment()} -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg"` +
    (both ? ` xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"` : ``) +
    ` width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n` +
    groups +
    `</svg>\n`;

  const tag = both ? 'both' : `ink${which}`;
  saveStrings(
    [svg],
    `perlin-duotone ${tag} ${settings.paper}-${settings.orientation} ` +
    `pen${settings.penWidth} f${settings.fieldSeed} d${settings.sampleSeed} ${timestamp()}`,
    'svg'
  );
}
