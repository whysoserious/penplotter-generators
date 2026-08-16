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
const OUTPUT_MODES = ['dots', 'runs'];
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
let grid = null;      // { W, H, p, cols, rows, x0, y0, cells, alive, runCount, inkLen }

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

function regenerate() {
  const g = gridGeometry();
  if (g.cols * g.rows > MAX_CELLS) { grid = null; return; }

  const rule32 = settings.rule >>> 0;
  const rnd    = mulberry32(settings.seedValue);
  const cells  = new Array(g.rows);

  let row = makeInitialRow(g.cols, rnd);
  let alive = 0, runCount = 0, inkLen = 0, maxRun = 0;

  for (let r = 0; r < g.rows; r++) {
    cells[r] = row;
    for (let i = 0; i < g.cols; i++) if (row[i]) alive++;
    for (const [a, b] of rowRuns(row)) {
      runCount++;
      if (b - a + 1 > maxRun) maxRun = b - a + 1;
      inkLen += (b - a) * g.p + EPS;
    }
    row = nextRow(row, rule32);
  }

  grid = { ...g, cells, alive, runCount, inkLen, maxRun };
}

////////////////////////////////////////////////////////////////////////////////////////
// Preview — drawn straight on the 2D context, batched per row, because a full sheet can
// hold hundreds of thousands of dots.

function drawPreview() {
  background(255);
  if (!grid) return;

  const { p, cols, rows, x0, y0, cells } = grid;
  const s   = previewScale();
  const ctx = drawingContext;

  ctx.save();
  ctx.scale(s, s);
  ctx.fillStyle   = '#000';
  ctx.strokeStyle = '#000';
  ctx.lineWidth   = settings.penWidth;
  ctx.lineCap     = 'round';

  const r = settings.penWidth / 2;

  for (let ri = 0; ri < rows; ri++) {
    const y   = y0 + ri * p;
    const row = cells[ri];

    if (settings.outputMode === 'runs') {
      const runs = rowRuns(row);
      if (!runs.length) continue;
      ctx.beginPath();
      for (const [a, b] of runs) {
        const [xa, xb] = runEnds(a, b, x0, p);
        ctx.moveTo(xa, y);
        ctx.lineTo(xb, y);
      }
      ctx.stroke();
    } else {
      ctx.beginPath();
      let any = false;
      for (let i = 0; i < cols; i++) {
        if (!row[i]) continue;
        const x = x0 + i * p;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
        any = true;
      }
      if (any) ctx.fill();
    }
  }

  ctx.restore();
}

// A run of one cell has zero length, which no plotter would register — give it a stub.
function runEnds(a, b, x0, p) {
  const xa = x0 + a * p;
  const xb = x0 + b * p;
  return a === b ? [xa - EPS / 2, xb + EPS / 2] : [xa, xb];
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
    '<b>dots</b> — one pen dot per alive cell, exactly as asked.<br>' +
    '<b>runs</b> — horizontal neighbours merged into one stroke: identical ink, ' +
    'a fraction of the plotting time.'
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
  // away. Such a pattern needs a much tighter pitch before it reads as a filled surface.
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

  const dots    = grid.alive;
  const isRuns  = settings.outputMode === 'runs';
  const cycles  = isRuns ? grid.runCount : dots;
  const inkLen  = isRuns ? grid.inkLen : dots * EPS;
  const seconds = cycles * PEN_CYCLE_S + inkLen / DRAW_SPEED;

  statsDiv.html(
    `<div>Pitch <b>${p.toFixed(3)} mm</b> — ${coverage}</div>` +
    `<div>Grid <b>${groupNum(grid.cols)} × ${groupNum(grid.rows)}</b> ` +
    `= ${groupNum(grid.cols * grid.rows)} cells</div>` +
    `<div>Alive <b>${groupNum(dots)}</b> dots ` +
    `(${(100 * dots / (grid.cols * grid.rows)).toFixed(1)} %)</div>` +
    `<div>Pen down/up <b>${groupNum(cycles)}</b>× ` +
    `<span class="dim">(dots ${groupNum(dots)} / runs ${groupNum(grid.runCount)})</span></div>` +
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
// previews exactly as the finished plot looks. Rows alternate direction (serpentine) to
// keep the head from running back across the sheet on every line.

function exportSvg() {
  if (!grid) {
    alert('Grid is too large to generate. Raise the pen width or pitch, or use smaller paper.');
    return;
  }

  const { W, H, p, cols, rows, x0, y0, cells } = grid;
  const f = n => String(+n.toFixed(3));

  let body = '';
  for (let ri = 0; ri < rows; ri++) {
    const y   = y0 + ri * p;
    const row = cells[ri];
    const rev = (ri & 1) === 1;
    let d = '';

    if (settings.outputMode === 'runs') {
      const runs = rowRuns(row);
      if (!runs.length) continue;
      if (rev) runs.reverse();
      for (const [a, b] of runs) {
        let [xa, xb] = runEnds(a, b, x0, p);
        if (rev) [xa, xb] = [xb, xa];
        d += `M${f(xa)},${f(y)}L${f(xb)},${f(y)}`;
      }
    } else {
      const stub = settings.dotMarker === 'segment';
      for (let k = 0; k < cols; k++) {
        const i = rev ? cols - 1 - k : k;
        if (!row[i]) continue;
        const x = x0 + i * p;
        d += stub
          ? `M${f(x - EPS / 2)},${f(y)}l${f(EPS)},0`
          : `M${f(x)},${f(y)}l0,0`;
      }
    }

    if (d) body += `  <path d="${d}"/>\n`;
  }

  const meta =
    `rule=${settings.rule} seed=${settings.seedType}/${settings.seedValue} ` +
    `wrap=${settings.wrapEdges} pen=${settings.penWidth}mm pitch=${p.toFixed(3)}mm ` +
    `grid=${cols}x${rows} dots=${grid.alive} mode=${settings.outputMode}`;

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
