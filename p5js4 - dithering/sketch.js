////////////////////////////////////////////////////////////////////////////////////////
// Dithered gradient for pen plotting
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189],
  'A1': [594, 841],
  'A2': [420, 594],
  'A3': [297, 420],
  'A4': [210, 297],
  'A5': [148, 210],
  'B0': [1000, 1414],
  'B1': [707, 1000],
  'B2': [500, 707],
  'B3': [353, 500],
  'B4': [250, 353],
  'B5': [176, 250],
};

const DITHER_ALGORITHMS = [
  'Floyd-Steinberg',
  'Atkinson',
  'Stucki',
  'Burkes',
  'Sierra',
  'Bayer 2x2',
  'Bayer 4x4',
  'Bayer 8x8',
  'Random',
  'Stipple',
];

const DISTRIBUTIONS = [
  'Linear',
  'Quadratic (ease-in)',
  'Inverse Quadratic (ease-out)',
  'Smoothstep',
  'Sine',
  'Exponential',
  'Gaussian (bell)',
  'Logarithmic',
];

const MAX_PREVIEW_W = 900;
const MAX_PREVIEW_H = 700;
const PREVIEW_DENSITY = 4;

// Dots on a square grid of pitch p cover the paper completely once
// p <= penWidth / sqrt(2), i.e. once the spacing drops to ~70.7 % of the nib.
const FULL_COVERAGE_SPACING = 100 / Math.SQRT2;

// Purely advisory: past this the regeneration is noticeably slow, but the pitch
// is never altered to stay under it -- the geometry is whatever you dialled in.
const BUSY_CELLS = 20000000;

// Poisson-placed stipple needs several times the grid's dot count before the
// gaps close; without this the black end of a stipple gradient stays speckled.
const STIPPLE_OVERSAMPLE = 3;

const settings = {
  paper: 'A4',
  orientation: 'portrait',
  penWidth: 0.5,
  solidFillSpacing: 70,
  margin: 15,
  angle: 0,
  colorFrom: 0,
  colorTo: 255,
  algorithm: 'Floyd-Steinberg',
  distribution: 'Linear',
  invert: false,
};

const circles = [];
// Dots in plot order, flat and interleaved as [x0, y0, x1, y1, ...]. Flat rather
// than an array of pairs because a large sheet holds millions of them and one
// two-element array each costs far more than the two numbers it carries.
let lastDots = [];
let lastCells = 0;
let lastGridLabel = '';
let infoEl;
let p5sketch;

////////////////////////////////////////////////////////////////////////////////////////
// Pen geometry. One grid cell holds one dot and a dot is exactly as wide as the
// nib, so the gradient runs from bare paper (no dots) to solid ink (overlapping
// dots) with nothing to tune per algorithm.

function dotDiameter() {
  return settings.penWidth;
}

function dotCount() {
  return lastDots.length / 2;
}

function penUpTravel() {
  let total = 0;
  for (let i = 2; i < lastDots.length; i += 2) {
    const dx = lastDots[i] - lastDots[i - 2];
    const dy = lastDots[i + 1] - lastDots[i - 1];
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

function cellPitch() {
  return settings.penWidth * settings.solidFillSpacing / 100;
}

////////////////////////////////////////////////////////////////////////////////////////

function setup() {
  p5sketch = this;
  const [pw, ph] = paperDims();
  const cnv = createCanvas(pw, ph);
  cnv.parent('canvas-container');
  pixelDensity(PREVIEW_DENSITY);
  applyCanvasDisplay();

  buildControls();
  regenerate();
}

function paperDims() {
  const [a, b] = PAPER_SIZES[settings.paper];
  return settings.orientation === 'portrait' ? [a, b] : [b, a];
}

function applyCanvasDisplay() {
  const [pw, ph] = paperDims();
  const scale = Math.min(MAX_PREVIEW_W / pw, MAX_PREVIEW_H / ph, 2);
  const c = document.querySelector('#canvas-container canvas');
  if (c) {
    c.style.width = (pw * scale) + 'px';
    c.style.height = (ph * scale) + 'px';
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// UI

function buildControls() {
  const root = 'controls';

  addSelect(root, 'Paper size', Object.keys(PAPER_SIZES), settings.paper, v => {
    settings.paper = v; resizeForPaper();
  });

  addSelect(root, 'Orientation', ['portrait', 'landscape'], settings.orientation, v => {
    settings.orientation = v; resizeForPaper();
  });

  addSelect(root, 'Dithering algorithm', DITHER_ALGORITHMS, settings.algorithm, v => {
    settings.algorithm = v; regenerate();
  });

  addSelect(root, 'Distribution', DISTRIBUTIONS, settings.distribution, v => {
    settings.distribution = v; regenerate();
  });

  addSlider(root, 'Angle (°)', 0, 360, settings.angle, 1, v => settings.angle = v);
  addSlider(root, 'Color from (0–255)', 0, 255, settings.colorFrom, 1, v => settings.colorFrom = v);
  addSlider(root, 'Color to (0–255)', 0, 255, settings.colorTo, 1, v => settings.colorTo = v);
  addSlider(root, 'Pen width (mm)', 0.1, 3, settings.penWidth, 0.05, v => settings.penWidth = v);
  addSlider(root, 'Solid fill spacing (% of pen)', 20, 200, settings.solidFillSpacing, 1, v => settings.solidFillSpacing = v);
  addSlider(root, 'Margin (mm)', 0, 100, settings.margin, 1, v => settings.margin = v);

  infoEl = createDiv('').parent(root);
  infoEl.class('info');

  const cbRow = createDiv('').parent(root);
  cbRow.class('checkbox-row');
  const cb = createCheckbox('Invert gradient', settings.invert).parent(cbRow);
  cb.changed(() => { settings.invert = cb.checked(); regenerate(); });

  const addC = createButton('Add circle').parent(root);
  addC.mousePressed(addCircle);

  const clrC = createButton('Clear circles').parent(root);
  clrC.mousePressed(clearCircles);

  const reg = createButton('Regenerate').parent(root);
  reg.mousePressed(regenerate);

  const svg = createButton('Generate SVG (circles)').parent(root);
  svg.class('primary');
  svg.mousePressed(exportSvg);

  const svgDots = createButton('Generate SVG (dots, for rapidograph)').parent(root);
  svgDots.class('primary');
  svgDots.mousePressed(exportSvgDots);
}

function updateInfo() {
  if (!infoEl) return;
  const lines = [
    // Dot count first and loud: it is what decides how long the plot takes.
    `<b class="count">${dotCount().toLocaleString('en-US')}</b> dots`,
    `${Math.round(penUpTravel() / 1000).toLocaleString('en-US')} m of pen travel`,
    `Dot &oslash; ${dotDiameter().toFixed(2)} mm &middot; pitch ${cellPitch().toFixed(3)} mm`,
    lastGridLabel,
  ];
  if (lastCells > BUSY_CELLS) {
    lines.push('Large grid &mdash; every change takes a while to redraw.');
  }
  if (settings.algorithm === 'Stipple') {
    lines.push('Stipple places dots at random, so the black end stays slightly speckled.');
  } else if (settings.solidFillSpacing > FULL_COVERAGE_SPACING) {
    lines.push('Spacing above ' + FULL_COVERAGE_SPACING.toFixed(1) +
      '&nbsp;% &mdash; dots no longer overlap, so black stays a dot screen.');
  } else {
    lines.push('Dots overlap: the black end fills solid.');
  }
  infoEl.html(lines.join('<br>'));
}

function addCircle() {
  const [W, H] = paperDims();
  const m = settings.margin;
  const maxR = Math.max(10, Math.min(W - 2 * m, H - 2 * m) / 3);
  const minR = Math.min(15, maxR * 0.25);
  const r = minR + Math.random() * (maxR - minR);
  const x = m + r + Math.random() * Math.max(0, W - 2 * m - 2 * r);
  const y = m + r + Math.random() * Math.max(0, H - 2 * m - 2 * r);
  circles.push({ x, y, r });
  regenerate();
}

function clearCircles() {
  circles.length = 0;
  regenerate();
}

function addSelect(parent, labelText, options, selected, onChange) {
  const field = createDiv('').parent(parent).class('field');
  createSpan(labelText).parent(field).class('label');
  const sel = createSelect().parent(field);
  for (const o of options) sel.option(o);
  sel.selected(selected);
  sel.changed(() => onChange(sel.value()));
  return sel;
}

function addSlider(parent, labelText, min, max, val, step, onChange) {
  const field = createDiv('').parent(parent).class('field');
  createSpan(labelText).parent(field).class('label');
  const row = createDiv('').parent(field).class('row');
  const s = createSlider(min, max, val, step).parent(row);
  const num = createInput(String(val)).parent(row);
  num.attribute('type', 'number');
  num.attribute('step', String(step));
  num.attribute('min', String(min));
  num.attribute('max', String(max));
  s.input(() => {
    const v = Number(s.value());
    num.value(v);
    onChange(v);
  });
  s.changed(() => regenerate());
  num.input(() => {
    const v = Number(num.value());
    s.value(v);
    onChange(v);
    regenerate();
  });
}

function resizeForPaper() {
  const [pw, ph] = paperDims();
  resizeCanvas(pw, ph);
  applyCanvasDisplay();
  regenerate();
}

////////////////////////////////////////////////////////////////////////////////////////
// Gradient + dithering

function gradientParams() {
  const [W, H] = paperDims();
  const m = settings.margin;
  const angleRad = settings.angle * Math.PI / 180;
  const dx = Math.cos(angleRad);
  const dy = Math.sin(angleRad);
  const corners = [
    [m, m], [W - m, m], [m, H - m], [W - m, H - m],
  ];
  const projections = corners.map(([x, y]) => x * dx + y * dy);
  const minP = Math.min.apply(null, projections);
  const maxP = Math.max.apply(null, projections);
  const rangeP = maxP - minP || 1;
  return { W, H, m, dx, dy, minP, rangeP };
}

function intensityAt(x, y, p) {
  let t = (x * p.dx + y * p.dy - p.minP) / p.rangeP;
  for (let i = 0; i < circles.length; i++) {
    const c = circles[i];
    const ddx = x - c.x;
    const ddy = y - c.y;
    if (ddx * ddx + ddy * ddy < c.r * c.r) t = 1 - t;
  }
  t = clamp01(applyDistribution(t, settings.distribution));
  const g = settings.colorFrom + (settings.colorTo - settings.colorFrom) * t;
  let intensity = clamp01(g / 255);
  if (settings.invert) intensity = 1 - intensity;
  return intensity;
}

function regenerate() {
  lastDots = [];
  lastCells = 0;
  lastGridLabel = '';
  clearRecordSvg();
  background(255);
  noStroke();
  fill(0);

  if (settings.algorithm === 'Stipple') {
    regenerateStipple();
  } else {
    regenerateGrid();
  }

  drawDots(dotDiameter());
  updateInfo();
}

// Recording needs real p5 circles so plotSvg can capture them; the preview does
// not, and one batched Path2D keeps hundreds of thousands of dots interactive.
function drawDots(d) {
  if (typeof isRecordingSVG === 'function' && isRecordingSVG()) {
    for (let i = 0; i < lastDots.length; i += 2) {
      circle(lastDots[i], lastDots[i + 1], d);
    }
    return;
  }
  const r = d / 2;
  const path = new Path2D();
  // Below a few device pixels an arc and a square are the same handful of pixels,
  // and rect() is a great deal cheaper when there are millions of them.
  const blocky = d * PREVIEW_DENSITY < 3;
  for (let i = 0; i < lastDots.length; i += 2) {
    const x = lastDots[i];
    const y = lastDots[i + 1];
    if (blocky) {
      path.rect(x - r, y - r, d, d);
    } else {
      path.moveTo(x + r, y);
      path.arc(x, y, r, 0, Math.PI * 2);
    }
  }
  drawingContext.fillStyle = '#000';
  drawingContext.fill(path);
}

function regenerateGrid() {
  const p = gradientParams();
  const { W, H, m } = p;
  const pitch = cellPitch();
  const cols = Math.max(1, Math.floor((W - 2 * m) / pitch));
  const rows = Math.max(1, Math.floor((H - 2 * m) / pitch));
  lastCells = cols * rows;
  lastGridLabel = `${cols} &times; ${rows} cells`;

  const cx = c => m + (c + 0.5) * pitch;
  const cy = r => m + (r + 0.5) * pitch;

  ditherRows(cols, rows, settings.algorithm,
    (r, out) => {
      const y = cy(r);
      for (let c = 0; c < cols; c++) out[c] = intensityAt(cx(c), y, p);
    },
    (r, mask) => {
      // Boustrophedon: rows alternate direction, so the pen finishes each row
      // where the next one starts instead of flying back to the left margin.
      const y = cy(r);
      if (r % 2 === 0) {
        for (let c = 0; c < cols; c++) if (mask[c]) lastDots.push(cx(c), y);
      } else {
        for (let c = cols - 1; c >= 0; c--) if (mask[c]) lastDots.push(cx(c), y);
      }
    });
}

function regenerateStipple() {
  const p = gradientParams();
  const { W, H, m } = p;
  const w = W - 2 * m;
  const h = H - 2 * m;
  if (w <= 0 || h <= 0) return;
  const pitch = cellPitch();
  const nCandidates = Math.floor(w * h * STIPPLE_OVERSAMPLE / (pitch * pitch));
  lastCells = nCandidates;
  lastGridLabel = `${nCandidates.toLocaleString('en-US')} samples`;

  // Random placement has no rows to sweep, so sample band by band and sort each
  // band by x, alternating direction. That keeps one band in memory at a time
  // and still turns a shotgun of pen hops into a sweep across the sheet.
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
    for (let i = 0; i < band.length; i++) lastDots.push(band[i][0], band[i][1]);
  }
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function applyDistribution(t, kind) {
  t = clamp01(t);
  switch (kind) {
    case 'Linear': return t;
    case 'Quadratic (ease-in)': return t * t;
    case 'Inverse Quadratic (ease-out)': return 1 - (1 - t) * (1 - t);
    case 'Smoothstep': return t * t * (3 - 2 * t);
    case 'Sine': return (1 - Math.cos(Math.PI * t)) / 2;
    case 'Exponential': {
      const k = 3;
      return (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
    }
    case 'Gaussian (bell)': {
      const sigma = 0.2;
      const peak = Math.exp(0);
      return Math.exp(-((t - 0.5) ** 2) / (2 * sigma * sigma)) / peak;
    }
    case 'Logarithmic': {
      const k = 9;
      return Math.log(1 + k * t) / Math.log(1 + k);
    }
    default: return t;
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Dithering algorithms
// `grid` holds intensity 0..1 where 0 = black (dot), 1 = white (no dot).
// Returns Uint8Array of 0/1 where 1 means draw a dot.

// Dither the grid one row at a time. `fillIntensity(r, out)` writes the row's
// intensities (0 = black, 1 = white) and `emitRow(r, mask)` gets a 0/1 mask of
// where to put dots. Only the error-diffusion kernels need memory beyond a
// single row, and only as many rows ahead as the kernel reaches -- so paper size
// no longer decides whether the whole thing fits in RAM.
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
      emitRow(r, mask);
    }
    return;
  }

  if (algo === 'Random') {
    for (let r = 0; r < rows; r++) {
      fillIntensity(r, row);
      for (let c = 0; c < cols; c++) mask[c] = row[c] < Math.random() ? 1 : 0;
      emitRow(r, mask);
    }
    return;
  }

  const kernel = errorDiffusionKernel(algo);
  let depth = 1;
  for (let k = 0; k < kernel.length; k++) depth = Math.max(depth, kernel[k][1] + 1);
  const buf = [];
  for (let i = 0; i < depth; i++) buf.push(new Float32Array(cols));
  // Seed the rows the kernel can already reach, so diffused error always lands
  // on top of an intensity that is in place. Float addition does not reassociate
  // and a cell sitting on the 0.5 threshold flips if the order changes.
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
    emitRow(r, mask);
    // This row is done, so its slot becomes row r + depth. Seeding it here
    // (rather than zeroing) is what keeps the addition order above intact.
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
// SVG export — 1 canvas unit = 1 mm

function exportSvg() {
  const [W, H] = paperDims();
  // Replay the dots already on screen rather than re-running the dither, so the
  // file matches the preview even for the randomised algorithms.
  beginRecordSvg(p5sketch, null);
  background(255);
  noStroke();
  fill(0);
  drawDots(dotDiameter());
  setSvgResolutionDPCM(10);
  setSvgDocumentSize(W, H);
  const svgStr = endRecordSvg();
  saveStrings([svgStr], `dithering ${settings.paper}-${settings.orientation} ${timestamp()}`, 'svg');
}

function exportSvgDots() {
  const [W, H] = paperDims();
  const strokeW = dotDiameter();
  const fmt = n => n.toFixed(3).replace(/\.?0+$/, '');
  const parts = [];
  for (let i = 0; i < lastDots.length; i += 2) {
    const sx = fmt(lastDots[i]);
    const sy = fmt(lastDots[i + 1]);
    parts.push(`M${sx} ${sy}L${sx} ${sy}`);
  }
  const d = parts.join('');
  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${W}mm" height="${H}mm" ` +
    `viewBox="0 0 ${W} ${H}">\n` +
    `  <path d="${d}" ` +
    `fill="none" stroke="black" stroke-width="${strokeW}" stroke-linecap="round"/>\n` +
    `</svg>\n`;
  saveStrings([svg], `dithering-dots ${settings.paper}-${settings.orientation} ${timestamp()}`, 'svg');
}

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}`;
}
