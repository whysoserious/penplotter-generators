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

const settings = {
  paper: 'A4',
  orientation: 'portrait',
  cellSize: 2,
  dotRadius: 0.5,
  margin: 15,
  angle: 0,
  colorFrom: 0,
  colorTo: 255,
  algorithm: 'Floyd-Steinberg',
  distribution: 'Linear',
  invert: false,
};

const circles = [];
let lastDots = [];

////////////////////////////////////////////////////////////////////////////////////////

function setup() {
  const [pw, ph] = paperDims();
  const cnv = createCanvas(pw, ph);
  cnv.parent('canvas-container');
  applyCanvasDisplay();

  buildControls();

  beginRecordSvg(this, null);
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
  addSlider(root, 'Cell size (mm)', 0.5, 10, settings.cellSize, 0.1, v => settings.cellSize = v);
  addSlider(root, 'Dot radius (mm)', 0.1, 3, settings.dotRadius, 0.1, v => settings.dotRadius = v);
  addSlider(root, 'Margin (mm)', 0, 100, settings.margin, 1, v => settings.margin = v);

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
  clearRecordSvg();
  background(255);
  noStroke();
  fill(0);

  if (settings.algorithm === 'Stipple') {
    regenerateStipple();
  } else {
    regenerateGrid();
  }
}

function regenerateGrid() {
  const p = gradientParams();
  const { W, H, m } = p;
  const cellSize = settings.cellSize;
  const cols = Math.max(1, Math.floor((W - 2 * m) / cellSize));
  const rows = Math.max(1, Math.floor((H - 2 * m) / cellSize));

  const cx = c => m + (c + 0.5) * cellSize;
  const cy = r => m + (r + 0.5) * cellSize;

  const grid = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid[r * cols + c] = intensityAt(cx(c), cy(r), p);
    }
  }

  const dots = runDither(grid, cols, rows, settings.algorithm);
  const d = settings.dotRadius * 2;
  for (let i = 0; i < dots.length; i++) {
    if (dots[i]) {
      const c = i % cols;
      const r = (i - c) / cols;
      const x = cx(c);
      const y = cy(r);
      lastDots.push([x, y]);
      circle(x, y, d);
    }
  }
}

function regenerateStipple() {
  const p = gradientParams();
  const { W, H, m } = p;
  const area = (W - 2 * m) * (H - 2 * m);
  if (area <= 0) return;
  const density = 1 / (settings.cellSize * settings.cellSize);
  const nCandidates = Math.floor(area * density);
  const d = settings.dotRadius * 2;
  for (let i = 0; i < nCandidates; i++) {
    const x = m + Math.random() * (W - 2 * m);
    const y = m + Math.random() * (H - 2 * m);
    const intensity = intensityAt(x, y, p);
    if (Math.random() > intensity) {
      lastDots.push([x, y]);
      circle(x, y, d);
    }
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

function runDither(grid, cols, rows, algo) {
  const out = new Uint8Array(cols * rows);

  if (algo.startsWith('Bayer')) {
    const n = algo === 'Bayer 2x2' ? 2 : algo === 'Bayer 4x4' ? 4 : 8;
    const m = bayerMatrix(n);
    const denom = n * n;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const threshold = (m[r % n][c % n] + 0.5) / denom;
        out[r * cols + c] = grid[r * cols + c] < threshold ? 1 : 0;
      }
    }
    return out;
  }

  if (algo === 'Random') {
    for (let i = 0; i < grid.length; i++) {
      out[i] = grid[i] < Math.random() ? 1 : 0;
    }
    return out;
  }

  const buf = Float32Array.from(grid);
  const kernel = errorDiffusionKernel(algo);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const old = buf[idx];
      const newV = old < 0.5 ? 0 : 1;
      out[idx] = newV === 0 ? 1 : 0;
      const err = old - newV;
      for (let k = 0; k < kernel.length; k++) {
        const kx = kernel[k][0];
        const ky = kernel[k][1];
        const w = kernel[k][2];
        const nc = c + kx;
        const nr = r + ky;
        if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
          buf[nr * cols + nc] += err * w;
        }
      }
    }
  }
  return out;
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
  setSvgResolutionDPCM(10);
  setSvgDocumentSize(W, H);
  const svgStr = endRecordSvg();
  saveStrings([svgStr], `dithering ${settings.paper}-${settings.orientation} ${timestamp()}`, 'svg');
  beginRecordSvg(this, null);
  regenerate();
}

function exportSvgDots() {
  const [W, H] = paperDims();
  const strokeW = settings.dotRadius * 2;
  const fmt = n => n.toFixed(3).replace(/\.?0+$/, '');
  const d = lastDots.map(([x, y]) => {
    const sx = fmt(x);
    const sy = fmt(y);
    return `M${sx} ${sy}L${sx} ${sy}`;
  }).join('');
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
