////////////////////////////////////////////////////////////////////////////////////////
// Dithered gradient for pen plotting
//
// A gradient is a lie a plotter cannot tell. The pen puts down one colour at one width,
// so the only way to get a grey is to leave some of the paper bare: cut the ramp into
// dots and let the eye do the mixing. Everything here stands on one grid — one cell, one
// dot, the dot exactly as wide as the nib — so the ramp runs from bare paper at one end
// to solid ink at the other with nothing to tune per algorithm.
//
// Two things sit on top of that.
//
// The circles. Each one is put down with the mouse, and it does two jobs at once: it is
// drawn, in a pen and a colour of its own, and it does something to the gradient beneath
// it. By default it turns that gradient inside out, so a light disc opens in the dark end
// of the ramp and a dark one closes over the light end. Circles that overlap flip each
// other back — an even number of them is no flip at all — which is what makes an overlap
// read as a third tone rather than as a pile.
//
// The runs. Wherever the ramp goes dark enough the dots stop being dots. At a pitch below
// the nib width neighbours already touch, and a row of them is a solid bar. Plotting that
// bar as four hundred separate pen-downs is four hundred pen cycles spent drawing a line
// the pen could have drawn in one stroke, for exactly the same ink: a round nib swept
// from the first centre to the last covers precisely the ink it would otherwise have
// stamped dot by dot. So a run of touching dots is written out as a line. Nothing
// about the drawing changes — the dark end of the sheet simply stops taking an hour.
//
// Everything is millimetres. One drawing unit is one millimetre, the SVG is written at
// paper size in millimetres and stroke-width is the nib, so the file previews exactly as
// the finished plot looks.
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};

const DITHER_ALGORITHMS = [
  'Floyd-Steinberg', 'Atkinson', 'Stucki', 'Burkes', 'Sierra',
  'Bayer 2x2', 'Bayer 4x4', 'Bayer 8x8', 'Random', 'Stipple',
];

const DISTRIBUTIONS = [
  'Linear', 'Quadratic (ease-in)', 'Inverse Quadratic (ease-out)', 'Smoothstep',
  'Sine', 'Exponential', 'Gaussian (bell)', 'Logarithmic',
];

// What a circle does to the ramp underneath it. The outline it draws is a separate matter —
// a circle can be drawn and do nothing, or do something and never be drawn.
const CIRCLE_EFFECTS = ['invert the gradient', 'nothing', 'keep the paper clear', 'fill it solid'];

const MERGE_MODES = [
  'off',
  'where the dots already touch',
  'always',
];

const SVG_CONTENTS = ['everything', 'the dither only', 'the circle outlines only'];
const SVG_OUTPUTS  = ['one file', 'one file per pen', 'both'];

const MAX_PREVIEW_W  = 900;       // on-screen size of the preview, in CSS pixels
const MAX_PREVIEW_H  = 700;
const PREVIEW_MAX_PX = 2000;      // and its resolution, however large the paper is

// Dots on a square grid of pitch p cover the paper completely once p <= penWidth / sqrt(2),
// i.e. once the spacing drops to ~70.7 % of the nib. Along a single row they merely have
// to touch, which is 100 % — and that, not this, is what a run of dots may become a line.
const FULL_COVERAGE_SPACING = 100 / Math.SQRT2;

const MAX_CELLS    = 60e6;        // grid past this is refused: it would freeze the tab
const MAX_STROKES  = 4e6;         // and so is a drawing that will not fit in memory
const BUSY_CELLS   = 20e6;        // advisory: the regeneration is noticeably slow
const BUSY_STROKES = 300e3;       // advisory: this is a long sitting at the plotter

// Poisson-placed stipple needs several times the grid's dot count before the gaps close;
// without this the black end of a stipple gradient stays speckled.
const STIPPLE_OVERSAMPLE = 3;

const HIT_MM         = 4;         // how close the cursor has to be to grab a rim
const WHEEL_MM       = 0.12;      // circle radius per wheel delta unit
const LIVE_BUDGET_MS = 120;       // slower than this and a drag waits for the mouse up
const SVG_CHUNK      = 20000;     // subpaths per <path>, so no one attribute gets absurd

const PEN_CYCLE_S  = 0.3;         // rough pen-up + pen-down time, seconds
const DRAW_SPEED   = 60;          // rough drawing speed, mm/s
const TRAVEL_SPEED = 150;         // rough pen-up travel speed, mm/s

const settings = {
  // paper
  paper: 'A4',
  orientation: 'portrait',
  margin: 15,

  // the ramp
  algorithm: 'Floyd-Steinberg',
  distribution: 'Linear',
  angle: 0,
  colorFrom: 0,
  colorTo: 255,
  invert: false,

  // the nib that draws the dither
  penWidth: 0.5,
  solidFillSpacing: 70,           // % of the nib between one dot and the next
  dotColor: '#000000',

  // runs of touching dots, drawn as one stroke
  mergeMode: 'where the dots already touch',
  minRun: 3,                      // dots — shorter than this stays a row of dots

  // the circles
  drawCircles: true,
  tintDots: true,                 // dots inside a circle are drawn in its colour
  circleEffect: 'invert the gradient',
  circlePen: 0.5,                   // mm — the nib that draws the outlines
  circleR: 30,                      // mm — the selected circle, or the next one added
  circleColor: '#b23a00',           // and its colour

  // output
  svgContent: 'everything',
  svgOutput: 'one file',
  liveUpdate: true,
  showGuides: true,
};

const DEFAULTS = { ...settings };

// { x, y, r, col } in millimetres on the sheet, in the order they were put down: a later
// circle draws over an earlier one and is the one the mouse grabs first.
const circles = [];
let sel = -1;                     // index of the selected circle, or -1

const setters   = {};             // settings key -> function that moves its control
const fieldDivs = {};             // settings key -> the .field wrapper, for showing/hiding
let statsDiv, circleListDiv, penListDiv;

// Strokes, flat and interleaved as [x, y, dx, ink, ...]. A stroke starts at (x, y) and
// runs dx to the right; dx === 0 is a single dot, and a negative dx is a run the pen
// enters from its right-hand end. `ink` is -1 for the dither's own colour and otherwise
// the index of the circle the stroke falls inside — the topmost one, the same circle the
// mouse would grab there. Flat because a large sheet holds millions of them and one
// object each costs far more than the four numbers it carries, and only four numbers
// because every merged run is horizontal: the grid stays axis-aligned however the ramp is
// turned, and a run is cut wherever the ink under it changes.
let SX = new Float64Array(1 << 16);
let sn = 0;                       // numbers used in SX, so sn / 4 strokes
let perInk = [];                  // per ink id + 1: { strokes, dots, lines, ink }

let nDots = 0, nRuns = 0, swallowed = 0;
let inkLen = 0, travelLen = 0;
let lastCells = 0, lastGridLabel = '', lastMs = 0;
let overflow = '';                // non-empty when nothing was generated, and says why

let ditherLayer = null;           // the dots and runs, cached so dragging a circle is cheap
let drag = null;                  // 'move' | 'size' while the mouse is down on a circle
let dragDirty = false;            // a deferred regenerate is owed
let settleTimer = null;

////////////////////////////////////////////////////////////////////////////////////////
// Small change

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

function parseNum(str) {
  const v = Number(String(str).replace(',', '.').trim());
  return Number.isFinite(v) ? v : null;
}

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

////////////////////////////////////////////////////////////////////////////////////////
// Pen geometry
//
// One grid cell holds one dot and a dot is exactly as wide as the nib, so the gradient
// runs from bare paper to solid ink with nothing to tune per algorithm.

function dotDiameter() { return settings.penWidth; }
function strokeCount() { return sn / 4; }

function cellPitch() {
  return settings.penWidth * settings.solidFillSpacing / 100;
}

// A run may become a line only when the nib sweeping between two centres covers the same
// paper the two stamped dots would have. That is the pitch falling to the nib width.
function dotsTouch() {
  return cellPitch() <= settings.penWidth + 1e-9;
}

function mergeOn() {
  if (settings.mergeMode === 'off') return false;
  if (settings.mergeMode === 'always') return true;
  return dotsTouch();
}

// -1 is the dither's own ink; anything else is the circle whose colour those dots took.
function inkColor(id) {
  const c = circles[id];
  return c ? c.col : settings.dotColor;
}

function tintOn() {
  return settings.tintDots && circles.length > 0;
}

function paperDims() {
  const [a, b] = PAPER_SIZES[settings.paper];
  return settings.orientation === 'portrait' ? [a, b] : [b, a];
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
  const [w, h] = paperDims();
  const s = previewScale();
  pixelDensity(1);                // the canvas is already supersampled against its display
  createCanvas(Math.round(w * s), Math.round(h * s)).parent('canvas-container');
  makeDitherLayer();
  applyCanvasDisplay();

  buildControls();
  attachPointer();
  attachKeys();
  regenerate();
}

function makeDitherLayer() {
  ditherLayer = document.createElement('canvas');
  ditherLayer.width = width;
  ditherLayer.height = height;
}

function applyCanvasDisplay() {
  const [pw, ph] = paperDims();
  const scale = Math.min(MAX_PREVIEW_W / pw, MAX_PREVIEW_H / ph);
  const c = canvasEl();
  if (c) {
    c.style.width = pw * scale + 'px';
    c.style.height = ph * scale + 'px';
  }
}

function resizeForPaper() {
  const [w, h] = paperDims();
  const s = previewScale();
  resizeCanvas(Math.round(w * s), Math.round(h * s));
  ditherLayer.width = width;
  ditherLayer.height = height;
  applyCanvasDisplay();
  clampCircles();
  regenerate();
}

// Called while a slider is being dragged or a circle dragged across the sheet. When a whole
// regeneration cannot keep up, the dither is left where it was and only the circles follow
// the mouse; the rebuild is owed on the mouse up.
function liveUpdate() {
  if (settings.liveUpdate && lastMs <= LIVE_BUDGET_MS) {
    regenerate();
    return;
  }
  dragDirty = true;
  drawPreview();
  updateStats();
  scheduleSettle();
}

// The rebuild a heavy sheet put off. A drag settles on the mouse up, but a wheel and a
// number typed into a box have no such moment, so anything deferred is picked up once the
// input goes quiet.
function scheduleSettle() {
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    settleTimer = null;
    if (!drag && dragDirty) regenerate();
  }, 300);
}

// The circles are drawn over a cached dither, so anything that only moves or recolours them
// costs a redraw and not a rebuild.
function circlesChanged() {
  if (settings.circleEffect === 'nothing' && !tintOn()) {
    drawPreview();
    refreshCircleList();
    updateStats();
  } else {
    liveUpdate();
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// The ramp
//
// A direction across the sheet, a distribution along it, and the circles turning it inside
// out where they fall. Everything the inner loop needs is read once, here, rather than off
// `settings` a few million times.

const DIST_CODES = {
  'Linear': 0, 'Quadratic (ease-in)': 1, 'Inverse Quadratic (ease-out)': 2,
  'Smoothstep': 3, 'Sine': 4, 'Exponential': 5, 'Gaussian (bell)': 6, 'Logarithmic': 7,
};

function gradientParams() {
  const [W, H] = paperDims();
  const m = settings.margin;
  const rad = settings.angle * Math.PI / 180;
  const dx = Math.cos(rad), dy = Math.sin(rad);
  const corners = [[m, m], [W - m, m], [m, H - m], [W - m, H - m]];
  const proj = corners.map(([x, y]) => x * dx + y * dy);
  const minP = Math.min.apply(null, proj);
  const rangeP = (Math.max.apply(null, proj) - minP) || 1;

  // The circles, packed flat with their bounding box, so the per-cell test is arithmetic.
  // They are packed whether or not they bend the ramp: a circle that does nothing to the
  // gradient still decides what colour the dots under it come out in.
  const eff = settings.circleEffect === 'nothing' ? 0
            : settings.circleEffect === 'invert the gradient' ? 1
            : settings.circleEffect === 'keep the paper clear' ? 2 : 3;
  const nd = circles.length;
  const cs = new Float64Array(nd * 5);
  for (let i = 0; i < nd; i++) {
    const c = circles[i];
    cs[i * 5]     = c.x;
    cs[i * 5 + 1] = c.y;
    cs[i * 5 + 2] = c.r * c.r;
    cs[i * 5 + 3] = c.x - c.r;
    cs[i * 5 + 4] = c.x + c.r;
  }

  return {
    W, H, m, dx, dy, minP, rangeP,
    dist: DIST_CODES[settings.distribution] || 0,
    from: settings.colorFrom / 255,
    span: (settings.colorTo - settings.colorFrom) / 255,
    inv: settings.invert,
    eff, nd, cs,
  };
}

function intensityAt(x, y, p) {
  let t = (x * p.dx + y * p.dy - p.minP) / p.rangeP;

  if (p.nd && p.eff) {
    let inside = 0;
    for (let i = 0; i < p.nd; i++) {
      const k = i * 5;
      if (x < p.cs[k + 3] || x > p.cs[k + 4]) continue;
      const ddx = x - p.cs[k], ddy = y - p.cs[k + 1];
      if (ddx * ddx + ddy * ddy < p.cs[k + 2]) inside++;
    }
    if (inside) {
      if (p.eff === 2) return 1;                  // keep the paper clear
      if (p.eff === 3) return 0;                  // fill it solid
      if (inside & 1) t = 1 - t;                  // invert, and overlaps flip back
    }
  }

  t = clamp01(applyDistribution(t, p.dist));
  let intensity = clamp01(p.from + p.span * t);
  if (p.inv) intensity = 1 - intensity;
  return intensity;
}

// The topmost circle covering a point, or -1. Topmost so that the dots agree with the
// outlines and with the mouse: the circle drawn last is the one that owns the overlap.
function inkAt(x, y, p) {
  for (let i = p.nd - 1; i >= 0; i--) {
    const k = i * 5;
    if (x < p.cs[k + 3] || x > p.cs[k + 4]) continue;
    const dx = x - p.cs[k], dy = y - p.cs[k + 1];
    if (dx * dx + dy * dy < p.cs[k + 2]) return i;
  }
  return -1;
}

function applyDistribution(t, code) {
  t = clamp01(t);
  switch (code) {
    case 0: return t;
    case 1: return t * t;
    case 2: return 1 - (1 - t) * (1 - t);
    case 3: return t * t * (3 - 2 * t);
    case 4: return (1 - Math.cos(Math.PI * t)) / 2;
    case 5: return (Math.exp(3 * t) - 1) / (Math.exp(3) - 1);
    case 6: {
      const sigma = 0.2;
      return Math.exp(-((t - 0.5) ** 2) / (2 * sigma * sigma));
    }
    case 7: return Math.log(1 + 9 * t) / Math.log(10);
    default: return t;
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Building the strokes

function pushStroke(x, y, dx, ink) {
  if (sn + 4 > SX.length) {
    const grown = new Float64Array(SX.length * 2);
    grown.set(SX);
    SX = grown;
  }
  SX[sn++] = x; SX[sn++] = y; SX[sn++] = dx; SX[sn++] = ink;
}

function regenerate() {
  const t0 = performance.now();
  sn = 0;
  nDots = nRuns = swallowed = 0;
  lastCells = 0;
  lastGridLabel = '';
  overflow = '';
  dragDirty = false;

  const [W, H] = paperDims();
  if (W - 2 * settings.margin <= 0 || H - 2 * settings.margin <= 0) {
    overflow = 'margin';
  } else if (settings.algorithm === 'Stipple') {
    regenerateStipple();
  } else {
    regenerateGrid();
  }

  if (overflow) { sn = 0; nDots = nRuns = swallowed = 0; }
  measure();
  lastMs = performance.now() - t0;

  renderDither();
  drawPreview();
  syncVisibility();
  updateStats();
}

function regenerateGrid() {
  const p = gradientParams();
  const { W, H, m } = p;
  const pitch = cellPitch();
  const cols = Math.max(1, Math.floor((W - 2 * m) / pitch));
  const rows = Math.max(1, Math.floor((H - 2 * m) / pitch));
  lastCells = cols * rows;
  lastGridLabel = `${groupNum(cols)} &times; ${groupNum(rows)} cells`;
  if (lastCells > MAX_CELLS) { overflow = 'cells'; return; }

  const cx = c => m + (c + 0.5) * pitch;
  const cy = r => m + (r + 0.5) * pitch;
  const merge = mergeOn();
  const minRun = Math.max(2, Math.round(settings.minRun));
  const tint = tintOn();
  // Which circle owns each cell of the row. All -1 when the dots are not being tinted, so
  // nothing below has to know whether there are circles at all.
  const inkRow = new Int32Array(cols).fill(-1);

  // A run of `n` touching cells of one ink, laid down in the direction the pen is already
  // travelling.
  const run = (a, b, y, ink, rev) => {
    const n = b - a + 1;
    if (merge && n >= minRun) {
      const xa = cx(a), xb = cx(b);
      if (rev) pushStroke(xb, y, xa - xb, ink);
      else     pushStroke(xa, y, xb - xa, ink);
      nRuns++;
      swallowed += n;
      return;
    }
    if (rev) for (let k = b; k >= a; k--) { pushStroke(cx(k), y, 0, ink); nDots++; }
    else     for (let k = a; k <= b; k++) { pushStroke(cx(k), y, 0, ink); nDots++; }
  };

  ditherRows(cols, rows, settings.algorithm,
    (r, out) => {
      const y = cy(r);
      for (let c = 0; c < cols; c++) out[c] = intensityAt(cx(c), y, p);
    },
    (r, mask) => {
      // Boustrophedon: rows alternate direction, so the pen finishes each row where the
      // next one starts instead of flying back to the left margin.
      const y = cy(r);
      // A run may only be one stroke if it is one colour, so the ink is read first and the
      // run is cut wherever it changes — which is exactly the rim of a circle.
      if (tint) {
        for (let c = 0; c < cols; c++) inkRow[c] = mask[c] ? inkAt(cx(c), y, p) : -1;
      }
      if (r % 2 === 0) {
        let c = 0;
        while (c < cols) {
          if (!mask[c]) { c++; continue; }
          const ink = inkRow[c];
          let e = c;
          while (e + 1 < cols && mask[e + 1] && inkRow[e + 1] === ink) e++;
          run(c, e, y, ink, false);
          c = e + 1;
        }
      } else {
        let c = cols - 1;
        while (c >= 0) {
          if (!mask[c]) { c--; continue; }
          const ink = inkRow[c];
          let s = c;
          while (s - 1 >= 0 && mask[s - 1] && inkRow[s - 1] === ink) s--;
          run(s, c, y, ink, true);
          c = s - 1;
        }
      }
      if (strokeCount() > MAX_STROKES) { overflow = 'strokes'; return false; }
      return true;
    });
}

function regenerateStipple() {
  const p = gradientParams();
  const { W, H, m } = p;
  const w = W - 2 * m, h = H - 2 * m;
  const pitch = cellPitch();
  const nCandidates = Math.floor(w * h * STIPPLE_OVERSAMPLE / (pitch * pitch));
  lastCells = nCandidates;
  lastGridLabel = `${groupNum(nCandidates)} samples`;
  if (nCandidates > MAX_CELLS) { overflow = 'cells'; return; }

  // Random placement has no rows to sweep, so sample band by band and sort each band by
  // x, alternating direction. That keeps one band in memory at a time and still turns a
  // shotgun of pen hops into a sweep across the sheet. It also means there are no runs to
  // find: two neighbours in a band are neighbours by accident, not by the grid.
  const tint = tintOn();
  const nBands = Math.max(1, Math.ceil(h / pitch));
  const perBand = Math.ceil(nCandidates / nBands);
  const band = [];
  for (let b = 0; b < nBands; b++) {
    band.length = 0;
    const y0 = m + b * h / nBands;
    const bandH = h / nBands;
    for (let i = 0; i < perBand; i++) {
      const x = m + Math.random() * w;
      const y = y0 + Math.random() * bandH;
      if (Math.random() > intensityAt(x, y, p)) band.push([x, y]);
    }
    band.sort(b % 2 === 0 ? (q, v) => q[0] - v[0] : (q, v) => v[0] - q[0]);
    for (let i = 0; i < band.length; i++) {
      const bx = band[i][0], by = band[i][1];
      pushStroke(bx, by, 0, tint ? inkAt(bx, by, p) : -1);
      nDots++;
    }
    if (strokeCount() > MAX_STROKES) { overflow = 'strokes'; return; }
  }
}

// How far the pen draws and how far it flies between strokes. Pen-up travel is measured
// from where one stroke ends to where the next begins, which for a row of plain dots is
// the same centre-to-centre hop it always was.
function measure() {
  inkLen = 0;
  travelLen = 0;
  perInk = [];
  for (let k = 0; k <= circles.length; k++) perInk.push({ strokes: 0, dots: 0, lines: 0, ink: 0 });

  let px = 0, py = 0, first = true;
  for (let i = 0; i < sn; i += 4) {
    const x = SX[i], y = SX[i + 1], dx = SX[i + 2];
    if (!first) {
      const ax = x - px, ay = y - py;
      travelLen += Math.sqrt(ax * ax + ay * ay);
    }
    first = false;
    const len = dx < 0 ? -dx : dx;
    inkLen += len;
    px = x + dx; py = y;

    const e = perInk[SX[i + 3] + 1];
    if (e) {
      e.strokes++;
      e.ink += len;
      if (dx === 0) e.dots++; else e.lines++;
    }
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Dithering algorithms
//
// The grid holds intensity 0..1 where 0 = black (dot) and 1 = white (no dot). Dither it
// one row at a time: `fillIntensity(r, out)` writes a row's intensities and
// `emitRow(r, mask)` gets a 0/1 mask of where the dots go, and may return false to stop.
// Only the error-diffusion kernels need memory beyond a single row, and only as many rows
// ahead as the kernel reaches — so paper size no longer decides whether it fits in RAM.

function ditherRows(cols, rows, algo, fillIntensity, emitRow) {
  const mask = new Uint8Array(cols);
  const row = new Float32Array(cols);

  if (algo.startsWith('Bayer')) {
    const n = algo === 'Bayer 2x2' ? 2 : algo === 'Bayer 4x4' ? 4 : 8;
    const m = bayerMatrix(n);
    const denom = n * n;
    for (let r = 0; r < rows; r++) {
      fillIntensity(r, row);
      const mr = m[r % n];
      for (let c = 0; c < cols; c++) {
        mask[c] = row[c] < (mr[c % n] + 0.5) / denom ? 1 : 0;
      }
      if (emitRow(r, mask) === false) return;
    }
    return;
  }

  if (algo === 'Random') {
    for (let r = 0; r < rows; r++) {
      fillIntensity(r, row);
      for (let c = 0; c < cols; c++) mask[c] = row[c] < Math.random() ? 1 : 0;
      if (emitRow(r, mask) === false) return;
    }
    return;
  }

  const kernel = errorDiffusionKernel(algo);
  let depth = 1;
  for (let k = 0; k < kernel.length; k++) depth = Math.max(depth, kernel[k][1] + 1);
  const buf = [];
  for (let i = 0; i < depth; i++) buf.push(new Float32Array(cols));
  // Seed the rows the kernel can already reach, so diffused error always lands on top of
  // an intensity that is in place. Float addition does not reassociate and a cell sitting
  // on the 0.5 threshold flips if the order changes.
  for (let r = 0; r < depth && r < rows; r++) fillIntensity(r, buf[r]);

  for (let r = 0; r < rows; r++) {
    const cur = buf[r % depth];
    for (let c = 0; c < cols; c++) {
      const old = cur[c];
      const newV = old < 0.5 ? 0 : 1;
      mask[c] = newV === 0 ? 1 : 0;
      const err = old - newV;
      for (let k = 0; k < kernel.length; k++) {
        const nc = c + kernel[k][0];
        if (nc < 0 || nc >= cols) continue;
        const nr = r + kernel[k][1];
        if (nr >= rows) continue;
        buf[nr % depth][nc] += err * kernel[k][2];
      }
    }
    if (emitRow(r, mask) === false) return;
    // This row is done, so its slot becomes row r + depth. Seeding it here (rather than
    // zeroing) is what keeps the addition order above intact.
    const next = r + depth;
    if (next < rows) fillIntensity(next, cur);
    else cur.fill(0);
  }
}

function errorDiffusionKernel(algo) {
  switch (algo) {
    case 'Floyd-Steinberg':
      return [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]];
    case 'Atkinson':
      return [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]];
    case 'Stucki':
      return [
        [1, 0, 8 / 42], [2, 0, 4 / 42],
        [-2, 1, 2 / 42], [-1, 1, 4 / 42], [0, 1, 8 / 42], [1, 1, 4 / 42], [2, 1, 2 / 42],
        [-2, 2, 1 / 42], [-1, 2, 2 / 42], [0, 2, 4 / 42], [1, 2, 2 / 42], [2, 2, 1 / 42],
      ];
    case 'Burkes':
      return [
        [1, 0, 8 / 32], [2, 0, 4 / 32],
        [-2, 1, 2 / 32], [-1, 1, 4 / 32], [0, 1, 8 / 32], [1, 1, 4 / 32], [2, 1, 2 / 32],
      ];
    case 'Sierra':
      return [
        [1, 0, 5 / 32], [2, 0, 3 / 32],
        [-2, 1, 2 / 32], [-1, 1, 4 / 32], [0, 1, 5 / 32], [1, 1, 4 / 32], [2, 1, 2 / 32],
        [-1, 2, 2 / 32], [0, 2, 3 / 32], [1, 2, 2 / 32],
      ];
    default:
      return [];
  }
}

function bayerMatrix(n) {
  if (n === 2) return [[0, 2], [3, 1]];
  const prev = bayerMatrix(n / 2);
  const half = n / 2;
  const m = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let r = 0; r < half; r++) {
    for (let c = 0; c < half; c++) {
      const p = prev[r][c];
      m[r][c] = 4 * p;
      m[r][c + half] = 4 * p + 2;
      m[r + half][c] = 4 * p + 3;
      m[r + half][c + half] = 4 * p + 1;
    }
  }
  return m;
}

////////////////////////////////////////////////////////////////////////////////////////
// The circles
//
// A circle is a centre, a radius and a colour, in millimetres on the sheet. They are held
// in the order they were put down: a later one draws over an earlier one and is the one
// the mouse grabs first.

function addCircle(x, y) {
  circles.push({ x, y, r: Math.max(0.5, settings.circleR), col: settings.circleColor });
  sel = circles.length - 1;
}

function removeCircle(i) {
  if (i < 0 || i >= circles.length) return;
  circles.splice(i, 1);
  if (sel >= circles.length) sel = circles.length - 1;
  if (sel >= 0) selectCircle(sel);
  circlesEdited();
}

function clearCircles() {
  circles.length = 0;
  sel = -1;
  circlesEdited();
}

// Selecting one pulls its radius and its colour into the two controls that edit them, so
// there is one place to change either, whichever circle is in hand.
function selectCircle(i) {
  sel = i;
  const c = circles[i];
  if (!c) return;
  settings.circleR = +c.r.toFixed(1);
  settings.circleColor = c.col;
  if (setters.circleR) setters.circleR(settings.circleR);
  if (setters.circleColor) setters.circleColor(settings.circleColor);
}

// The rim is tested before the body, so a circle sitting inside a larger one can still be
// resized by its own edge instead of dragging whatever is under it.
function circleAt(x, y) {
  for (let i = circles.length - 1; i >= 0; i--) {
    const c = circles[i];
    if (Math.abs(Math.hypot(x - c.x, y - c.y) - c.r) <= HIT_MM) return { i, mode: 'size' };
  }
  for (let i = circles.length - 1; i >= 0; i--) {
    const c = circles[i];
    if (Math.hypot(x - c.x, y - c.y) <= c.r) return { i, mode: 'move' };
  }
  return null;
}

// A change of paper must not leave a circle off the edge where it cannot be grabbed again.
function clampCircles() {
  const [W, H] = paperDims();
  for (const c of circles) {
    c.x = clamp(c.x, 0, W);
    c.y = clamp(c.y, 0, H);
  }
}

// A discrete edit — added, deleted, recoloured, resized from the sidebar — as opposed to
// the live one a drag makes. When the circles do nothing to the ramp there is no dither to
// rebuild and only the outlines move.
function circlesEdited() {
  if (settings.circleEffect === 'nothing' && !tintOn()) {
    drawPreview();
    updateStats();
  } else {
    regenerate();
  }
}

function circlesOffSheet() {
  const [W, H] = paperDims();
  let n = 0;
  for (const c of circles) {
    if (c.x - c.r < 0 || c.y - c.r < 0 || c.x + c.r > W || c.y + c.r > H) n++;
  }
  return n;
}

////////////////////////////////////////////////////////////////////////////////////////
// Preview
//
// The dither is drawn once into a layer of its own and kept there. Millions of dots are
// not something to re-stamp every time a circle is nudged a millimetre, and the circles
// and the guides are a handful of arcs over the top.

function renderDither() {
  if (!ditherLayer) return;
  const g = ditherLayer.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, ditherLayer.width, ditherLayer.height);
  if (!sn) return;

  const s = previewScale();
  const d = dotDiameter();
  const r = d / 2;
  // Below a few screen pixels an arc and a square are the same handful of pixels, and
  // rect() is a great deal cheaper when there are millions of them.
  const blocky = d * s < 2.5;

  // One path per ink rather than one per stroke: however many dots there are, the colour
  // is set a handful of times. Index is the ink id + 1, so -1 (the dither's own ink) is 0.
  const nInk = circles.length + 1;
  const dotP = new Array(nInk).fill(null);
  const runP = new Array(nInk).fill(null);
  for (let i = 0; i < sn; i += 4) {
    const x = SX[i], y = SX[i + 1], dx = SX[i + 2];
    const k = SX[i + 3] + 1;
    if (k < 0 || k >= nInk) continue;
    if (dx === 0) {
      let path = dotP[k];
      if (!path) path = dotP[k] = new Path2D();
      if (blocky) path.rect(x - r, y - r, d, d);
      else { path.moveTo(x + r, y); path.arc(x, y, r, 0, Math.PI * 2); }
    } else {
      let path = runP[k];
      if (!path) path = runP[k] = new Path2D();
      path.moveTo(x, y);
      path.lineTo(x + dx, y);
    }
  }

  g.save();
  g.scale(s, s);
  g.lineWidth = d;
  g.lineCap = 'round';
  // The dither's own ink first and the circles in the order they were put down, so a dot
  // under two circles comes out in the colour of the one drawn on top.
  for (let k = 0; k < nInk; k++) {
    if (!dotP[k] && !runP[k]) continue;
    const colour = inkColor(k - 1);
    if (dotP[k]) { g.fillStyle = colour; g.fill(dotP[k]); }
    if (runP[k]) { g.strokeStyle = colour; g.stroke(runP[k]); }
  }
  g.restore();
}

function drawPreview() {
  background(255);
  const ctx = drawingContext;
  if (ditherLayer) ctx.drawImage(ditherLayer, 0, 0);

  ctx.save();
  ctx.scale(previewScale(), previewScale());
  if (settings.drawCircles) drawCircleInk(ctx);
  if (settings.showGuides) drawGuides(ctx);
  ctx.restore();
}

function drawCircleInk(ctx) {
  ctx.lineWidth = Math.max(0.03, settings.circlePen);
  for (const c of circles) {
    ctx.strokeStyle = c.col;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawGuides(ctx) {
  const [W, H] = paperDims();
  const m = settings.margin;

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.lineWidth = 0.3;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(m, m, W - 2 * m, H - 2 * m);

  // A circle that is not drawn still has to be findable, or it cannot be picked up again.
  if (!settings.drawCircles) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 0.3;
    for (const c of circles) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);

  const c = circles[sel];
  if (!c) return;
  ctx.strokeStyle = 'rgba(26, 109, 209, 0.95)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2.5, 2.5]);
  ctx.beginPath();
  ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(c.x - 3, c.y); ctx.lineTo(c.x + 3, c.y);
  ctx.moveTo(c.x, c.y - 3); ctx.lineTo(c.x, c.y + 3);
  ctx.stroke();
}

////////////////////////////////////////////////////////////////////////////////////////
// Mouse and keys
//
// Click the bare sheet and a circle lands there; click one that is already down and it is
// picked up. Dragging the body moves it, dragging the rim resizes it, and the wheel does
// the same without having to find the rim.

function paperPoint(e) {
  const c = canvasEl();
  const r = c.getBoundingClientRect();
  const [W, H] = paperDims();
  return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
}

function attachPointer() {
  const el = canvasEl();
  if (!el) return;

  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const [x, y] = paperPoint(e);
    const hit = circleAt(x, y);

    if (hit && (e.altKey || e.metaKey)) {     // alt-click takes one back off the sheet
      removeCircle(hit.i);
      e.preventDefault();
      return;
    }
    if (hit) {
      selectCircle(hit.i);
      drag = hit.mode;
    } else {
      addCircle(x, y);
      drag = 'move';                          // so a new one can be placed in one gesture
      circlesEdited();
    }
    el.classList.add('dragging');
    el.setPointerCapture(e.pointerId);
    refreshCircleList();
    drawPreview();
    e.preventDefault();
  });

  el.addEventListener('pointermove', e => {
    if (!drag) return;
    const [x, y] = paperPoint(e);
    moveHandle(x, y);
    e.preventDefault();
  });

  const end = e => {
    if (!drag) return;
    drag = null;
    el.classList.remove('dragging');
    if (dragDirty) regenerate();              // the rebuild a slow sheet deferred
    if (e) e.preventDefault();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);

  el.addEventListener('wheel', e => {
    const [x, y] = paperPoint(e);
    let i = sel;
    if (i < 0 || !circles[i]) {
      const hit = circleAt(x, y);
      if (!hit) return;
      selectCircle(hit.i);
      i = sel;
    }
    const c = circles[i];
    c.r = clamp(c.r - e.deltaY * WHEEL_MM, 0.5, 2000);
    settings.circleR = +c.r.toFixed(1);
    if (setters.circleR) setters.circleR(settings.circleR);
    circlesChanged();
    e.preventDefault();
  }, { passive: false });
}

function moveHandle(x, y) {
  const c = circles[sel];
  if (!c) return;
  if (drag === 'size') {
    c.r = Math.max(0.5, Math.hypot(x - c.x, y - c.y));
    settings.circleR = +c.r.toFixed(1);
    if (setters.circleR) setters.circleR(settings.circleR);
  } else {
    c.x = x;
    c.y = y;
  }
  circlesChanged();
}

function attachKeys() {
  window.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    if (e.metaKey || e.ctrlKey) return;

    if ((e.key === 'Backspace' || e.key === 'Delete') && sel >= 0) {
      removeCircle(sel);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      sel = -1;
      refreshCircleList();
      drawPreview();
      e.preventDefault();
    } else if (e.key === 'g' || e.key === 'G') {
      settings.showGuides = !settings.showGuides;
      if (setters.showGuides) setters.showGuides(settings.showGuides);
      drawPreview();
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
  setVisible('minRun', settings.mergeMode !== 'off');
  setVisible('circlePen', settings.drawCircles);
  setVisible('tintDots', circles.length > 0);
}

function addSlider(parent, labelText, key, min, max, step, hint, onChange) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const row = createDiv('').parent(field).class('row');
  const sl = createSlider(min, max, settings[key], step).parent(row);
  const num = createInput(String(settings[key])).parent(row);
  num.attribute('type', 'text');             // type=number rejects "." in a comma locale
  num.attribute('inputmode', 'decimal');
  if (hint) createDiv(hint).parent(field).class('note');

  const done = onChange || regenerate;
  setters[key] = v => { sl.value(v); num.value(String(v)); };

  sl.input(() => {
    settings[key] = Number(sl.value());
    num.value(String(settings[key]));
    if (onChange) onChange(); else liveUpdate();
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
  const sel2 = createSelect().parent(field);
  for (const o of options) sel2.option(o);
  sel2.selected(settings[key]);
  if (hint) createDiv(hint).parent(field).class('note');
  setters[key] = v => sel2.selected(v);
  sel2.changed(() => { settings[key] = sel2.value(); (onChange || regenerate)(); });
  return sel2;
}

function addCheckbox(parent, labelText, key, onChange) {
  const row = createDiv('').parent(parent).class('checkbox-row');
  fieldDivs[key] = row;
  const cb = createCheckbox(labelText, settings[key]).parent(row);
  setters[key] = v => cb.checked(!!v);
  cb.changed(() => { settings[key] = cb.checked(); (onChange || regenerate)(); });
  return cb;
}

function addColor(parent, labelText, key, onChange) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const cp = createColorPicker(settings[key]).parent(field);
  setters[key] = v => cp.value(v);
  cp.input(() => { settings[key] = cp.value(); (onChange || regenerate)(); });
  return cp;
}

// The radius and the colour drive the selected circle when there is one, and otherwise
// set what the next click puts down.
function circleParamChanged(field) {
  const c = circles[sel];
  if (!c) { refreshCircleList(); return; }
  if (field === 'r') {
    c.r = Math.max(0.5, settings.circleR);
    circlesChanged();
    return;
  }
  c.col = settings.circleColor;
  renderDither();
  drawPreview();
  updateStats();
}

function buildControls() {
  const root = select('#controls');

  // --- Paper ---
  addSection(root, 'Paper');
  addSelect(root, 'Paper size', 'paper', Object.keys(PAPER_SIZES), () => {
    clampCircles(); resizeForPaper();
  });
  addSelect(root, 'Orientation', 'orientation', ['portrait', 'landscape'], () => {
    clampCircles(); resizeForPaper();
  });
  addSlider(root, 'Margin (mm)', 'margin', 0, 100, 1);

  // --- The ramp ---
  addSection(root, 'Gradient');
  addSelect(root, 'Dithering algorithm', 'algorithm', DITHER_ALGORITHMS, regenerate,
    'Stipple scatters its dots instead of gridding them, so it is the one algorithm with ' +
    'no rows of touching dots to turn into lines.');
  addSelect(root, 'Distribution', 'distribution', DISTRIBUTIONS);
  addSlider(root, 'Angle (°)', 'angle', 0, 360, 1);
  addSlider(root, 'Tone at the start (0–255)', 'colorFrom', 0, 255, 1);
  addSlider(root, 'Tone at the end (0–255)', 'colorTo', 0, 255, 1);
  addCheckbox(root, 'Invert the ramp', 'invert');

  // --- The nib ---
  addSection(root, 'Dither pen');
  addSlider(root, 'Pen width (mm)', 'penWidth', 0.05, 3, 0.05,
    'One dot is exactly one nib wide, so this is both the dot and the line a merged run ' +
    'is drawn with.');
  addSlider(root, 'Dot spacing (% of the nib)', 'solidFillSpacing', 20, 200, 1,
    `Under ${FULL_COVERAGE_SPACING.toFixed(1)} % the dots close up solid in both ` +
    'directions; under 100 % they at least touch along a row, which is what lets a run ' +
    'become a line.');
  addColor(root, 'Ink', 'dotColor', () => { renderDither(); drawPreview(); updateStats(); });

  // --- Runs ---
  addSection(root, 'Solid areas');
  addSelect(root, 'Draw runs of dots as lines', 'mergeMode', MERGE_MODES, regenerate,
    'A row of dots that already touch covers the same paper as one stroke of the same ' +
    'nib — same ink, one pen-down instead of hundreds. <b>always</b> draws the line even ' +
    'when the dots do not meet, which fills the gaps in and darkens the plot.');
  addSlider(root, 'Shortest run to merge (dots)', 'minRun', 2, 100, 1);

  // --- Circles ---
  addSection(root, 'Circles');
  createDiv('Click the sheet to put one down. Drag the middle to move it, drag the rim ' +
    'or roll the wheel to resize it, <b>alt-click</b> or <b>⌫</b> to take it off again.')
    .parent(root).class('note');
  addCheckbox(root, 'Draw the circles', 'drawCircles', () => {
    syncVisibility(); drawPreview(); updateStats();
  });
  addCheckbox(root, "Dots inside take the circle's colour", 'tintDots', regenerate);
  createDiv('The dither underneath a circle is drawn in that circle\'s ink, so the disc ' +
    'reads as a colour and not only as an outline. Where two circles overlap the one on ' +
    'top wins, the same one the mouse grabs. It is a pen change, so those dots come out ' +
    'as their own pass in the SVG.').parent(root).class('note');
  addSelect(root, 'What a circle does to the gradient', 'circleEffect', CIRCLE_EFFECTS,
    regenerate,
    'Inverting is what makes overlaps interesting: two circles over the same spot flip ' +
    'the ramp back and it reads as a third tone.');
  addSlider(root, 'Circle pen (mm)', 'circlePen', 0.05, 3, 0.05, null,
    () => { drawPreview(); updateStats(); });
  addSlider(root, 'Radius (mm)', 'circleR', 0.5, 600, 0.5,
    'The selected circle, or the next one you put down.',
    () => circleParamChanged('r'));
  addColor(root, 'Colour', 'circleColor', () => circleParamChanged('col'));

  const btns = createDiv('').parent(root).class('btn-row');
  createButton('Add in the middle').parent(btns).mousePressed(() => {
    const [W, H] = paperDims();
    addCircle(W / 2, H / 2);
    refreshCircleList();
    circlesEdited();
  });
  createButton('Clear').parent(btns).mousePressed(clearCircles);

  circleListDiv = createDiv('').parent(root).class('circle-list');
  circleListDiv.elt.addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (del) { removeCircle(Number(del.dataset.del)); return; }
    const row = e.target.closest('[data-i]');
    if (!row) return;
    selectCircle(Number(row.dataset.i));
    refreshCircleList();
    drawPreview();
  });

  // --- Output ---
  addSection(root, 'Output');
  addSelect(root, 'What goes in the file', 'svgContent', SVG_CONTENTS, () => updateStats());
  addSelect(root, 'How it is split', 'svgOutput', SVG_OUTPUTS, () => updateStats(),
    'One file per pen writes a file for the dither and one for each colour of circle, ' +
    'so each can go on the plotter with the right nib in it.');
  addCheckbox(root, 'Follow the sliders live', 'liveUpdate', () => {});
  addCheckbox(root, 'Show the margin and the handles', 'showGuides', () => drawPreview());

  const outBtns = createDiv('').parent(root).class('btn-row');
  createButton('Regenerate').parent(outBtns).mousePressed(regenerate);
  createButton('Reset settings').parent(outBtns).mousePressed(resetAll);
  const dl = createButton('Download SVG').parent(root);
  dl.class('primary');
  dl.mousePressed(exportSvg);

  // --- What it costs ---
  addSection(root, 'The sheet');
  statsDiv = createDiv('').parent(root).class('stats');
  penListDiv = createDiv('').parent(root);
}

// Back to the defaults, but the circles stay: they are the drawing, not a setting.
function resetAll() {
  Object.assign(settings, DEFAULTS);
  for (const k in setters) if (k in settings) setters[k](settings[k]);
  resizeForPaper();
}

function refreshCircleList() {
  if (!circleListDiv) return;
  if (!circles.length) {
    circleListDiv.html('<div class="note dim">No circles yet.</div>');
    return;
  }
  let html = '';
  circles.forEach((c, i) => {
    html += `<div class="circle-row${i === sel ? ' on' : ''}" data-i="${i}">` +
      `<span class="sw" style="background:${c.col}"></span>` +
      `<span class="cname">#${i + 1}</span>` +
      `<span class="cdim">r ${c.r.toFixed(1)} · ${c.x.toFixed(0)},${c.y.toFixed(0)} mm</span>` +
      `<button class="x" data-del="${i}" title="Remove">×</button></div>`;
  });
  circleListDiv.html(html);
}

////////////////////////////////////////////////////////////////////////////////////////
// What the sheet costs

function paperArea() {
  const [W, H] = paperDims();
  return W * H;
}

function circleInk() {
  if (!settings.drawCircles) return 0;
  let len = 0;
  for (const c of circles) len += 2 * Math.PI * c.r;
  return len;
}

function updateStats() {
  refreshCircleList();
  refreshPenList();
  if (!statsDiv) return;

  if (overflow === 'margin') {
    statsDiv.html('<div class="warn">The margin leaves nothing to draw on. Lower it, or ' +
      'use larger paper.</div>');
    return;
  }
  if (overflow === 'cells') {
    statsDiv.html(`<div class="warn">${lastGridLabel} — past the ${groupNum(MAX_CELLS)} ` +
      'limit, so nothing was generated.<br>Widen the dot spacing or take a coarser nib.</div>');
    return;
  }
  if (overflow === 'strokes') {
    statsDiv.html(`<div class="warn">Past the ${groupNum(MAX_STROKES)}-stroke limit, so ` +
      'nothing was generated.<br>Widen the dot spacing, or let the solid areas merge into ' +
      'lines.</div>');
    return;
  }

  const d = dotDiameter();
  const cInk = circleInk();
  const strokes = strokeCount() + (settings.drawCircles ? circles.length : 0);
  const seconds = strokes * PEN_CYCLE_S +
    (inkLen + cInk) / DRAW_SPEED + travelLen / TRAVEL_SPEED;
  const cover = clamp01((nDots * Math.PI * d * d / 4 + inkLen * d +
    cInk * Math.max(0.05, settings.circlePen)) / paperArea());

  let html =
    `<div class="big"><b class="count">${groupNum(nDots)}</b> dots` +
    (nRuns ? ` · <b>${groupNum(nRuns)}</b> lines` : '') + `</div>` +
    `<div>${groupNum(strokes)} pen-downs in all · ` +
    `${(travelLen / 1000).toFixed(1)} m of pen-up travel</div>` +
    `<div>Dot &oslash; ${d.toFixed(2)} mm · pitch ${cellPitch().toFixed(3)} mm · ` +
    `${lastGridLabel}</div>` +
    (inkLen ? `<div>${(inkLen / 1000).toFixed(1)} m of ${d.toFixed(2)} mm line in the ` +
      `solid areas</div>` : '') +
    `<div>Ink covers <b>${(100 * cover).toFixed(0)} %</b> of the sheet</div>` +
    `<div>Roughly <b>${formatDuration(seconds)}</b> to plot · ` +
    `${lastMs.toFixed(0)} ms to build</div>`;

  if (nRuns) {
    const saved = swallowed - nRuns;
    html += `<div class="ok">Merging ${groupNum(swallowed)} touching dots into ` +
      `${groupNum(nRuns)} lines saved ${groupNum(saved)} pen-downs, about ` +
      `${formatDuration(saved * PEN_CYCLE_S)} at the plotter.</div>`;
  }

  if (settings.algorithm === 'Stipple') {
    html += '<div class="dim">Stipple places its dots at random, so there are no rows of ' +
      'touching dots to merge — and the black end stays slightly speckled.</div>';
  } else if (settings.mergeMode === 'where the dots already touch' && !dotsTouch()) {
    html += `<div class="warn">Nothing merged: at ${settings.solidFillSpacing} % the dots ` +
      'sit further apart than the nib is wide, so a line between two of them would lay ' +
      'down ink the dots never did. Drop the spacing under 100 %, or set merging to ' +
      '<b>always</b> and accept the extra ink.</div>';
  } else if (settings.mergeMode === 'always' && !dotsTouch()) {
    html += `<div class="warn">The dots are ${cellPitch().toFixed(2)} mm apart and the nib ` +
      `is ${d.toFixed(2)} mm, so every merged run fills in gaps the dots left. The solid ` +
      'areas will come out darker than the preview of a dot screen would suggest.</div>';
  }

  if (settings.solidFillSpacing > FULL_COVERAGE_SPACING) {
    html += `<div class="dim">Spacing above ${FULL_COVERAGE_SPACING.toFixed(1)} % — the ` +
      'rows do not close up, so the black end stays a dot screen rather than solid ink.</div>';
  } else {
    html += '<div class="ok">The dots overlap: the black end fills solid.</div>';
  }

  const off = circlesOffSheet();
  if (off) {
    html += `<div class="warn">${off} circle${off > 1 ? 's run' : ' runs'} off the edge of ` +
      'the sheet. Nothing clips them, so the plotter will be asked to draw past the ' +
      'paper.</div>';
  }
  if (lastCells > BUSY_CELLS) {
    html += `<div class="dim">${lastGridLabel} — every change takes a while to redraw.</div>`;
  }
  if (strokes > BUSY_STROKES) {
    html += `<div class="warn">${groupNum(strokes)} pen-downs is a long sitting at the ` +
      'plotter. Letting the solid areas merge into lines is where most of it goes.</div>';
  }
  if (cover > 0.6) {
    html += `<div class="warn">${(100 * cover).toFixed(0)} % of the sheet ends up under ` +
      'ink. Thin paper will cockle and the nib will run dry.</div>';
  }

  statsDiv.html(html);
}

function refreshPenList() {
  if (!penListDiv) return;
  const list = passList();
  if (list.length < 2) { penListDiv.html(''); return; }

  let html = '';
  for (const p of list) {
    let st = p.circles.length;
    let ink = p.circles.reduce((a, c) => a + 2 * Math.PI * c.r, 0);
    for (const id of p.inks) {
      const e = perInk[id + 1];
      if (!e) continue;
      st += e.strokes;
      ink += e.ink;
    }
    html += `<div class="pen-row"><span class="sw" style="background:${p.colour}"></span>` +
      `<span>${p.tag} — <b>${groupNum(st)}</b> pen-downs, ${p.width} mm nib, ` +
      `${formatDuration(st * PEN_CYCLE_S + ink / DRAW_SPEED)}</span></div>`;
  }
  penListDiv.html(html);
}

////////////////////////////////////////////////////////////////////////////////////////
// SVG — one drawing unit is one millimetre
//
// No fills and no background rectangle: everything in the file is meant to be plotted.
// stroke-width is the nib and the caps are round, so a dot is a dot of exactly the right
// size, a merged run is a bar of exactly the right width, and the file previews as the
// finished plot looks.

function fmt(n) { return String(+n.toFixed(3)); }

// The passes this sheet needs, in the order the plotter should run them: the dither
// first, in the fine nib, then the outlines over it. A pass is one pen — one colour at one
// width — so dots that took a circle's colour are their own pass, and they merge with that
// circle's outline when the two nibs happen to be the same.
function passList() {
  const out = [];
  const byPen = new Map();
  const pen = (colour, width, tag) => {
    const key = colour + '|' + width;
    let p = byPen.get(key);
    if (!p) { p = { tag, colour, width, inks: [], circles: [] }; byPen.set(key, p); out.push(p); }
    return p;
  };

  if (settings.svgContent !== 'the circle outlines only' && sn) {
    for (let k = 0; k < perInk.length; k++) {
      if (!perInk[k].strokes) continue;
      pen(inkColor(k - 1), settings.penWidth, 'dither').inks.push(k - 1);
    }
  }
  if (settings.svgContent !== 'the dither only' && settings.drawCircles && circles.length) {
    const w = Math.max(0.05, settings.circlePen);
    for (const c of circles) pen(c.col, w, 'circles').circles.push(c);
  }

  // Name them only once they are all known: a pass that ended up carrying both says so,
  // and pens that share a name are numbered so no two files land on top of each other.
  for (const p of out) {
    if (p.inks.length && p.circles.length) p.tag = 'dither + circles';
  }
  const seen = new Map();
  for (const p of out) seen.set(p.tag, (seen.get(p.tag) || 0) + 1);
  const used = new Map();
  for (const p of out) {
    if (seen.get(p.tag) < 2) continue;
    const i = (used.get(p.tag) || 0) + 1;
    used.set(p.tag, i);
    p.tag = p.tag + ' ' + i;
  }
  return out;
}

function metaComment() {
  const s = settings;
  return `dithering — ${s.algorithm} / ${s.distribution} ` +
    `angle=${s.angle}° tone=${s.colorFrom}-${s.colorTo}${s.invert ? ' inverted' : ''} ` +
    `pen=${s.penWidth}mm pitch=${cellPitch().toFixed(3)}mm (${s.solidFillSpacing}%) ` +
    `margin=${s.margin}mm ` +
    `merge=${s.mergeMode}${s.mergeMode === 'off' ? '' : '/min' + s.minRun} ` +
    `dots=${nDots} lines=${nRuns} ` +
    `circles=${circles.length}${circles.length ? '/' + s.circleEffect +
      (s.drawCircles ? '/' + s.circlePen + 'mm' : '/not drawn') +
      (tintOn() ? '/tinted' : '') : ''}`;
}

// Every stroke as one subpath: `h0` is a zero-length line, which a round cap renders as a
// dot of exactly one nib. Chunked so that no single `d` attribute grows to tens of
// megabytes on a sheet with millions of dots.
function ditherBody(body, inks) {
  const want = new Uint8Array(circles.length + 2);   // indexed by ink id + 1
  for (const id of inks) want[id + 1] = 1;

  let d = '', held = 0;
  for (let i = 0; i < sn; i += 4) {
    const k = SX[i + 3] + 1;
    if (k < 0 || k >= want.length || !want[k]) continue;
    d += `M${fmt(SX[i])},${fmt(SX[i + 1])}h${fmt(SX[i + 2])}`;
    if (++held >= SVG_CHUNK) { body.push(`<path d="${d}"/>\n`); d = ''; held = 0; }
  }
  if (d) body.push(`<path d="${d}"/>\n`);
}

function circleBody(body, list) {
  for (const c of list) {
    body.push(`<circle cx="${fmt(c.x)}" cy="${fmt(c.y)}" r="${fmt(c.r)}"/>\n`);
  }
}

// The whole sheet, or one pass of it, as an array of pieces — joined only by the Blob, so
// a file with millions of dots never has to exist as one string.
function svgFile(pass) {
  const [W, H] = paperDims();
  const list = pass ? [pass] : passList();
  if (!list.length) return null;

  const out = [
    '<?xml version="1.0" encoding="UTF-8"?>\n',
    `<!-- ${metaComment()}${pass ? ' pass=' + pass.tag + '@' + pass.width + 'mm' : ''} -->\n`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" ` +
    `viewBox="0 0 ${W} ${H}">\n`,
  ];
  let drew = false;
  for (const p of list) {
    const body = [];
    if (p.inks.length) ditherBody(body, p.inks);
    if (p.circles.length) circleBody(body, p.circles);
    if (!body.length) continue;
    out.push(`<g fill="none" stroke="${p.colour}" stroke-width="${fmt(p.width)}" ` +
      `stroke-linecap="round" stroke-linejoin="round">\n`);
    for (const b of body) out.push(b);
    out.push('</g>\n');
    drew = true;
  }
  if (!drew) return null;
  out.push('</svg>\n');
  return out;
}

function downloadSvg(parts, name) {
  const url = URL.createObjectURL(new Blob(parts, { type: 'image/svg+xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name + '.svg';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function exportSvg() {
  const list = passList();
  if (!list.length) {
    alert('Nothing to export — the sheet is empty, or everything on it is filtered out ' +
      'by what goes in the file.');
    return;
  }

  const files = settings.svgOutput === 'one file' ? [null]
    : settings.svgOutput === 'one file per pen' ? list
    : [null, ...list];

  const stem = `dithering ${settings.algorithm} ${settings.paper}-${settings.orientation}`;
  const stamp = timestamp();
  let delay = 0;
  for (const pass of files) {
    const parts = svgFile(pass);
    if (!parts) continue;
    const tag = pass ? ` ${pass.tag} pen${pass.width}` : ` pen${settings.penWidth}`;
    // Browsers throttle a burst of downloads, so they go out one at a time.
    setTimeout(() => downloadSvg(parts, `${stem}${tag} ${stamp}`), delay);
    delay += 350;
  }
}
