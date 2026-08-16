////////////////////////////////////////////////////////////////////////////////////////
// 1D Cellular Automaton — 5-cell neighborhood (radius 2), plotted with a single pen
//
// Every alive cell is exactly one dot of the pen. The grid pitch is derived from the pen
// width, so neighbouring dots touch (or overlap) and alive regions come out of the
// plotter as one solid black surface. Dead cells are simply never visited.
//
// Neighborhood: [i-2, i-1, i, i+1, i+2]
// Pattern index: (c[i-2]<<4)|(c[i-1]<<3)|(c[i]<<2)|(c[i+1]<<1)|c[i+2]
// New state:    (rule >>> pattern) & 1
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};

const SEED_TYPES   = ['center', 'random', 'all-alive', 'alternating', 'left-edge'];
const OUTPUT_MODES = ['dots', 'runs', 'chained'];
const DOT_MARKERS  = ['segment', 'point'];

// Presets — rule3 means "5-cell equivalent of Wolfram k=2 r=1 rule N"
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

// A square lattice of round dots of radius r is gap-free when the pitch is at most
// r*sqrt(2) — i.e. at most 1/sqrt(2) of the pen width. Above that, pinholes open up
// in the middle of every 2x2 group of dots.
const GAPLESS_FACTOR = Math.SQRT1_2;   // 0.7071…

const EPS            = 0.01;      // mm — length of the stub that represents a single dot
const MAX_CELLS      = 2_500_000; // refuse to build grids that would freeze the browser
const PREVIEW_MAX_PX = 1500;      // preview canvas resolution (paper is measured in mm)
const MAX_PREVIEW_W  = 900;       // on-screen size of that canvas
const MAX_PREVIEW_H  = 700;
const PEN_CYCLE_S    = 0.3;       // rough pen-up + pen-down time, seconds
const DRAW_SPEED     = 60;        // rough drawing speed, mm/s
const TRAVEL_SPEED   = 150;       // rough pen-up travel speed, mm/s

const settings = {
  paper: 'A4',
  orientation: 'portrait',
  margin: 10,
  penWidth: 0.5,       // mm — Rotring nib size
  pitchPercent: 85,    // grid pitch as a percentage of the pen width
  rule: 0,             // set in setup() from wolfram3to5(18)
  seedType: 'center',
  seedDensity: 0.3,
  seedValue: 1,
  wrapEdges: true,
  outputMode: 'dots',
  dotMarker: 'segment',
};

let ruleInput;
let ruleInfoDiv;
let statsDiv;
let seedInput;
let grid   = null;   // { W, H, p, cols, rows, x0, y0, cells, alive, runCount, maxRun, chains }
let shapes = null;   // { pts: Float64Array [x,y,…], off: Int32Array } — polylines in mm
let plan   = null;   // { order: Int32Array, flip: Uint8Array, ink, travel }

////////////////////////////////////////////////////////////////////////////////////////
// Helpers

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
  str = str.trim();
  const n = /^0x/i.test(str) ? parseInt(str.slice(2), 16) : parseInt(str, 10);
  if (isNaN(n) || n < 0 || n > 4294967295) return null;
  return n >>> 0;
}

// Deterministic PRNG so a given seed value always reproduces the same pattern.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}`;
}

function groupNum(n) {
  return n.toLocaleString('en-US').replace(/,/g, ' ');
}

function formatDuration(sec) {
  if (sec < 90) return `${Math.round(sec)} s`;
  const min = sec / 60;
  if (min < 90) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${Math.round(min - h * 60)} min`;
}

////////////////////////////////////////////////////////////////////////////////////////
// Geometry

function paperDims() {
  const [a, b] = PAPER_SIZES[settings.paper];
  return settings.orientation === 'portrait' ? [a, b] : [b, a];
}

function pitchMm() {
  return settings.penWidth * settings.pitchPercent / 100;
}

// Dot centres are inset by half a pen width so the ink never spills past the margin.
// The resulting grid is then centred on the sheet.
function gridGeometry() {
  const [W, H] = paperDims();
  const p = pitchMm();
  const spanW = W - 2 * settings.margin - settings.penWidth;
  const spanH = H - 2 * settings.margin - settings.penWidth;
  const cols = Math.max(1, Math.floor(spanW / p) + 1);
  const rows = Math.max(1, Math.floor(spanH / p) + 1);
  return {
    W, H, p, cols, rows,
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
  settings.rule = wolfram3to5(18); // Sierpinski triangle default

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
  regenerate();
  shapes = grid ? buildShapes(grid, settings.outputMode) : null;
  plan   = shapes ? orderShapes(shapes) : null;
  drawPreview();
  updateStats();
}

////////////////////////////////////////////////////////////////////////////////////////
// Cellular automaton core

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

function nextRow(current, rule32) {
  const n    = current.length;
  const next = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = settings.wrapEdges ? current[(i - 2 + n) % n] : (i >= 2    ? current[i - 2] : 0);
    const b = settings.wrapEdges ? current[(i - 1 + n) % n] : (i >= 1    ? current[i - 1] : 0);
    const c = current[i];
    const d = settings.wrapEdges ? current[(i + 1) % n]     : (i + 1 < n ? current[i + 1] : 0);
    const e = settings.wrapEdges ? current[(i + 2) % n]     : (i + 2 < n ? current[i + 2] : 0);
    const pattern = (a << 4) | (b << 3) | (c << 2) | (d << 1) | e;
    next[i] = (rule32 >>> pattern) & 1;
  }
  return next;
}

// Maximal spans of consecutive alive cells in one row, as [firstIndex, lastIndex].
function rowRuns(cells) {
  const runs = [];
  let start = -1;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i]) { if (start < 0) start = i; }
    else if (start >= 0) { runs.push([start, i - 1]); start = -1; }
  }
  if (start >= 0) runs.push([start, cells.length - 1]);
  return runs;
}

// Index of the run covering `col`, or -1 if there is none or it is already taken.
function findRun(runs, used, col) {
  let lo = 0, hi = runs.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (runs[mid][1] < col)      lo = mid + 1;
    else if (runs[mid][0] > col) hi = mid - 1;
    else return used[mid] ? -1 : mid;
  }
  return -1;
}

// Chain horizontal runs into continuous polylines: when a run ends directly above an
// alive cell in the next row, the pen steps down and carries on instead of lifting.
// That vertical step is the hull of two dots the pen places anyway, so it widens the
// drawing by nothing — it only fills the waist between them, which is meant to be black.
// Entering a run in the middle, the pen sweeps the short side first and doubles back;
// re-inking costs travel, never an extra pen cycle. Points are cell coordinates [col,row].
function buildChains(g) {
  const runs = [], used = [];
  for (let r = 0; r < g.rows; r++) {
    const rs = rowRuns(g.cells[r]);
    runs.push(rs);
    used.push(new Uint8Array(rs.length));
  }

  const chains = [];
  for (let r = 0; r < g.rows; r++) {
    for (let j = 0; j < runs[r].length; j++) {
      if (used[r][j]) continue;
      used[r][j] = 1;

      const [a, b] = runs[r][j];
      const pts = [a, r, b, r];
      let exit = b, cr = r;

      for (;;) {
        const nr = cr + 1;
        if (nr >= g.rows) break;
        const k = findRun(runs[nr], used[nr], exit);
        if (k < 0) break;
        used[nr][k] = 1;

        const [na, nb] = runs[nr][k];
        const near = (exit - na <= nb - exit) ? na : nb;
        const far  = near === na ? nb : na;
        pts.push(exit, nr);
        if (near !== exit) pts.push(near, nr);
        if (far !== near)  pts.push(far, nr);
        exit = far;
        cr = nr;
      }
      chains.push(pts);
    }
  }
  return chains;
}

function regenerate() {
  const g = gridGeometry();
  if (g.cols * g.rows > MAX_CELLS) { grid = null; return; }

  const rule32 = settings.rule >>> 0;
  const rnd    = mulberry32(settings.seedValue);
  const cells  = new Array(g.rows);

  let row = makeInitialRow(g.cols, rnd);
  let alive = 0, runCount = 0, maxRun = 0;

  for (let r = 0; r < g.rows; r++) {
    cells[r] = row;
    for (let i = 0; i < g.cols; i++) if (row[i]) alive++;
    for (const [a, b] of rowRuns(row)) {
      runCount++;
      if (b - a + 1 > maxRun) maxRun = b - a + 1;
    }
    row = nextRow(row, rule32);
  }

  grid = { ...g, cells, alive, runCount, maxRun };
  grid.chains = buildChains(grid);
}

////////////////////////////////////////////////////////////////////////////////////////
// Shapes — everything the pen has to draw, as flat polylines in millimetres.
// Shape i owns the points off[i] … off[i+1]-1.

function buildShapes(g, mode) {
  const pts = [];
  const off = [0];
  const X = c => g.x0 + c * g.p;
  const Y = r => g.y0 + r * g.p;
  const close = () => off.push(pts.length / 2);

  if (mode === 'chained') {
    for (const c of g.chains) {
      // A chain of one lone cell has zero length; give it a stub the plotter can see.
      if (c.length === 4 && c[0] === c[2] && c[1] === c[3]) {
        const x = X(c[0]), y = Y(c[1]);
        pts.push(x - EPS / 2, y, x + EPS / 2, y);
      } else {
        for (let i = 0; i < c.length; i += 2) pts.push(X(c[i]), Y(c[i + 1]));
      }
      close();
    }
  } else if (mode === 'runs') {
    for (let r = 0; r < g.rows; r++) {
      const y = Y(r);
      for (const [a, b] of rowRuns(g.cells[r])) {
        if (a === b) pts.push(X(a) - EPS / 2, y, X(b) + EPS / 2, y);
        else         pts.push(X(a), y, X(b), y);
        close();
      }
    }
  } else {
    for (let r = 0; r < g.rows; r++) {
      const y = Y(r), row = g.cells[r];
      for (let i = 0; i < g.cols; i++) {
        if (!row[i]) continue;
        const x = X(i);
        pts.push(x - EPS / 2, y, x + EPS / 2, y);
        close();
      }
    }
  }

  return { pts: Float64Array.from(pts), off: Int32Array.from(off) };
}

// Greedy nearest-neighbour over shape endpoints, either end allowed as the entry point,
// with a uniform bucket grid so the search stays local. Beats drawing row by row because
// the next row is only one pitch away while the next gap in the same row can be
// centimetres wide — the pen ends up weaving down a narrow column band instead of
// sweeping the full width. Greedy lands a little above optimal, which no plotter file
// format lets us close anyway; vpype's linesort would redo this pass regardless.
function orderShapes(sh) {
  const { pts, off } = sh;
  const n = off.length - 1;
  const order = new Int32Array(n);
  const flip  = new Uint8Array(n);
  if (n === 0) return { order, flip, ink: 0, travel: 0 };

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
// Preview — drawn straight on the 2D context from the same shapes the SVG exports, so
// what you see is what the plotter draws. Batched, because a full sheet can hold
// hundreds of thousands of them.

function drawPreview() {
  background(255);
  if (!shapes) return;

  const { pts, off } = shapes;
  const n   = off.length - 1;
  const s   = previewScale();
  const ctx = drawingContext;

  ctx.save();
  ctx.scale(s, s);
  ctx.strokeStyle = '#000';
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
// UI

function buildControls() {
  const root = 'controls';

  // --- Pen ---
  addSection(root, 'Pen');
  addSlider(root, 'Pen width (mm)', 0.1, 2, settings.penWidth, 0.05, v => settings.penWidth = v);
  addSlider(root, 'Grid pitch (% of pen)', 40, 130, settings.pitchPercent, 1, v => settings.pitchPercent = v);

  // --- Paper ---
  addSection(root, 'Paper');
  addSelect(root, 'Size', Object.keys(PAPER_SIZES), settings.paper, v => {
    settings.paper = v; resizeForPaper();
  });
  addSelect(root, 'Orientation', ['portrait', 'landscape'], settings.orientation, v => {
    settings.orientation = v; resizeForPaper();
  });
  addSlider(root, 'Margin (mm)', 0, 50, settings.margin, 1, v => settings.margin = v);

  // --- Pattern ---
  addSection(root, 'Pattern');

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
  createSpan('Preset').parent(presetField).class('label');
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

  addSelect(root, 'Seed type', SEED_TYPES, settings.seedType, v => {
    settings.seedType = v; update();
  });
  addSlider(root, 'Seed density (random)', 0.01, 1, settings.seedDensity, 0.01, v => settings.seedDensity = v);

  const seedField = createDiv('').parent(root).class('field');
  createSpan('Seed value').parent(seedField).class('label');
  const seedRow = createDiv('').parent(seedField).class('row');
  seedInput = createInput(String(settings.seedValue)).parent(seedRow);
  seedInput.attribute('type', 'number');
  seedInput.style('flex', '1');
  seedInput.style('min-width', '0');
  seedInput.input(() => {
    const v = parseInt(seedInput.value(), 10);
    if (!isNaN(v)) { settings.seedValue = v; update(); }
  });
  createButton('Random').parent(seedRow).class('inline-btn').mousePressed(() => {
    settings.seedValue = Math.floor(Math.random() * 1e9);
    seedInput.value(String(settings.seedValue));
    update();
  });

  const cbRow = createDiv('').parent(root).class('checkbox-row');
  const wrapCb = createCheckbox('Wrap edges', settings.wrapEdges).parent(cbRow);
  wrapCb.changed(() => { settings.wrapEdges = wrapCb.checked(); update(); });

  // --- Output ---
  addSection(root, 'Output');
  addSelect(root, 'Path mode', OUTPUT_MODES, settings.outputMode, v => {
    settings.outputMode = v; update();
  });
  createDiv(
    '<b>dots</b> — one pen dot per alive cell.<br>' +
    '<b>runs</b> — horizontal neighbours merged into one stroke.<br>' +
    '<b>chained</b> — those strokes also linked downwards into one continuous ' +
    'polyline per blob. Same ink as <b>dots</b>, far fewer pen lifts.'
  ).parent(root).class('note');

  // Only affects the exported file, not the grid or the preview.
  addSelect(root, 'Dot marker', DOT_MARKERS, settings.dotMarker, v => settings.dotMarker = v);
  createDiv(
    '<b>segment</b> — 0.01 mm stub, survives every plotter toolchain.<br>' +
    '<b>point</b> — zero-length path, smaller file, some software drops it.'
  ).parent(root).class('note');

  // --- Stats + actions ---
  addSection(root, 'Plot');
  statsDiv = createDiv('').parent(root).class('stats');

  createButton('Regenerate').parent(root).mousePressed(update);
  createButton('Generate SVG').parent(root).class('primary').mousePressed(exportSvg);
}

function addSection(parent, title) {
  createDiv(title).parent(parent).class('section');
}

function updateRuleInfo() {
  if (!ruleInfoDiv) return;
  const hex = settings.rule.toString(16).padStart(8, '0').toUpperCase();
  const bin = settings.rule.toString(2).padStart(32, '0');
  ruleInfoDiv.html(
    `<span class="rule-hex">0x${hex}</span>&nbsp;&nbsp;` +
    `<span class="rule-bin">${bin}</span>`
  );
}

function updateStats() {
  if (!statsDiv) return;

  if (!grid) {
    const g = gridGeometry();
    statsDiv.html(
      `<div class="warn">Grid too large: ${groupNum(g.cols * g.rows)} cells ` +
      `(limit ${groupNum(MAX_CELLS)}).<br>Raise the pen width or pitch, or use smaller paper.</div>`
    );
    return;
  }

  const p = pitchMm();
  const f = settings.pitchPercent / 100;

  // Some rules (18, 90, 184…) never put two cells side by side: every alive cell sits on
  // one parity sublattice, so its nearest alive neighbour is a diagonal one, pitch*sqrt(2)
  // away. Such a pattern needs a much tighter pitch before it reads as a filled surface,
  // and neither runs nor chained can merge anything.
  const diagonalOnly = grid.alive > 1 && grid.maxRun === 1;

  let coverage, hint = '';
  if (diagonalOnly) {
    if (f <= 0.5) {
      coverage = '<span class="ok">solid — no gaps</span>';
    } else {
      coverage = f <= GAPLESS_FACTOR
        ? '<span class="warn">dots touch diagonally, gaps remain</span>'
        : '<span class="warn">dots do not touch at all</span>';
      hint =
        `<div class="warn">This rule never puts two cells side by side — alive cells meet ` +
        `only diagonally, ${(p * Math.SQRT2).toFixed(3)} mm apart. Set the pitch to 50 % ` +
        `for a solid fill, 71 % for dots that just touch.</div>`;
    }
  } else {
    if (f <= GAPLESS_FACTOR) coverage = '<span class="ok">solid — no gaps</span>';
    else if (f <= 1)         coverage = '<span class="warn">dots touch, pinholes at the corners</span>';
    else                     coverage = '<span class="warn">dots do not touch — visible gaps</span>';
  }

  const cells   = grid.cols * grid.rows;
  const cycles  = plan ? plan.order.length : 0;
  const seconds = cycles * PEN_CYCLE_S + plan.ink / DRAW_SPEED + plan.travel / TRAVEL_SPEED;

  statsDiv.html(
    `<div>Pitch <b>${p.toFixed(3)} mm</b> — ${coverage}</div>` +
    `<div>Grid <b>${groupNum(grid.cols)} × ${groupNum(grid.rows)}</b> ` +
    `= ${groupNum(cells)} cells</div>` +
    `<div>Alive <b>${groupNum(grid.alive)}</b> dots ` +
    `(${(100 * grid.alive / cells).toFixed(1)} %)</div>` +
    `<div>Pen down/up <b>${groupNum(cycles)}</b>× <span class="dim">` +
    `(dots ${groupNum(grid.alive)} / runs ${groupNum(grid.runCount)} / ` +
    `chained ${groupNum(grid.chains.length)})</span></div>` +
    `<div>Draws <b>${(plan.ink / 1000).toFixed(1)} m</b>, ` +
    `travels <b>${(plan.travel / 1000).toFixed(1)} m</b> with the pen up</div>` +
    `<div>Rough plot time <b>${formatDuration(seconds)}</b></div>` +
    hint
  );
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
  const s   = createSlider(min, max, val, step).parent(row);
  const num = createInput(String(val)).parent(row);
  num.attribute('type', 'number');
  num.attribute('step', String(step));
  num.attribute('min',  String(min));
  num.attribute('max',  String(max));
  s.input(()    => { const v = Number(s.value());   num.value(v); onChange(v); });
  s.changed(()  => update());
  num.input(()  => { const v = Number(num.value()); s.value(v);   onChange(v); update(); });
}

////////////////////////////////////////////////////////////////////////////////////////
// SVG export
//
// One stroke group, no fills, no background rectangle — everything in the file is meant
// to be plotted. stroke-width is the pen width and the caps are round, so the file
// previews exactly as the finished plot looks. Shapes come out in the order the pen
// should visit them, each already flipped to the end it should be entered from.

function exportSvg() {
  if (!grid || !shapes || !plan) {
    alert('Grid is too large to generate. Raise the pen width or pitch, or use smaller paper.');
    return;
  }

  const { W, H, p, cols, rows } = grid;
  const { pts, off } = shapes;
  const { order, flip } = plan;
  const f = n => String(+n.toFixed(3));

  // Zero-length markers only make sense for single dots, never for a polyline.
  const asPoint = settings.outputMode === 'dots' && settings.dotMarker === 'point';
  const CHUNK   = 400;   // subpaths per <path>, purely to keep the DOM small

  let body = '', d = '', held = 0;
  for (let t = 0; t < order.length; t++) {
    const i = order[t], rev = flip[t] === 1;
    const a = off[i], b = off[i + 1];

    if (asPoint) {
      d += `M${f((pts[a * 2] + pts[(b - 1) * 2]) / 2)},${f(pts[a * 2 + 1])}l0,0`;
    } else if (b - a === 2 && pts[a * 2 + 1] === pts[(a + 1) * 2 + 1]) {
      // Flat two-point stroke — a dot stub or a merged run. Relative keeps the file small.
      const x0 = rev ? pts[(a + 1) * 2] : pts[a * 2];
      const x1 = rev ? pts[a * 2] : pts[(a + 1) * 2];
      d += `M${f(x0)},${f(pts[a * 2 + 1])}l${f(x1 - x0)},0`;
    } else {
      const step = rev ? -1 : 1;
      let k = rev ? b - 1 : a;
      d += `M${f(pts[k * 2])},${f(pts[k * 2 + 1])}`;
      for (let q = 1; q < b - a; q++) {
        k += step;
        d += `L${f(pts[k * 2])},${f(pts[k * 2 + 1])}`;
      }
    }

    if (++held >= CHUNK) { body += `  <path d="${d}"/>\n`; d = ''; held = 0; }
  }
  if (d) body += `  <path d="${d}"/>\n`;

  const meta =
    `rule=${settings.rule} seed=${settings.seedType}/${settings.seedValue} ` +
    `wrap=${settings.wrapEdges} pen=${settings.penWidth}mm pitch=${p.toFixed(3)}mm ` +
    `grid=${cols}x${rows} dots=${grid.alive} mode=${settings.outputMode} ` +
    `strokes=${order.length} ink=${(plan.ink / 1000).toFixed(1)}m travel=${(plan.travel / 1000).toFixed(1)}m`;

  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- ${meta} -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n` +
    `<g fill="none" stroke="#000000" stroke-width="${f(settings.penWidth)}" ` +
    `stroke-linecap="round" stroke-linejoin="round">\n` +
    body +
    `</g>\n</svg>\n`;

  saveStrings(
    [svg],
    `ca5 r${settings.rule} ${settings.paper}-${settings.orientation} ` +
    `pen${settings.penWidth} ${settings.outputMode} ${timestamp()}`,
    'svg'
  );
}
