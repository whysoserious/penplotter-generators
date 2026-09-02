////////////////////////////////////////////////////////////////////////////////////////
// 1D Cellular Automaton — 5-cell neighborhood (radius 2)
// Neighborhood: [i-2, i-1, i, i+1, i+2]
// Rule space: 2^32 possible rules (0 to 4,294,967,295)
// Pattern index: (c[i-2]<<4)|(c[i-1]<<3)|(c[i]<<2)|(c[i+1]<<1)|c[i+2]
// New state:    (rule >>> pattern) & 1
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};

const SEED_TYPES = ['center', 'random', 'all-alive', 'alternating', 'left-edge'];
const CELL_STYLES = ['filled', 'dot', 'outline'];

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

const MAX_PREVIEW_W = 900;
const MAX_PREVIEW_H = 700;

const settings = {
  paper: 'A4',
  orientation: 'portrait',
  margin: 5,
  cellSize: 2,
  rule: 0,           // set in setup() after computing wolfram3to5(18)
  seedType: 'center',
  seedDensity: 0.3,
  wrapEdges: true,
  fillCells: true,
  cellStyle: 'filled',
  dotRadius: 0.5,
  penWidth: 0.5,    // physical pen tip width (mm); used as stroke-width on outlines and hatch
  hatchSize: 0.25,  // spacing between adjacent hatch passes (mm)
  aliveColor: 0,
  deadColor: 255,
};

let p5sketch;
let ruleInput;
let ruleInfoDiv;
let lastCells = [];

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
  const n = /^0x/i.test(str)
    ? parseInt(str.slice(2), 16)
    : parseInt(str, 10);
  if (isNaN(n) || n < 0 || n > 4294967295) return null;
  return n >>> 0;
}

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}`;
}

////////////////////////////////////////////////////////////////////////////////////////

function setup() {
  p5sketch = this;
  settings.rule = wolfram3to5(18); // Sierpinski triangle default

  const [pw, ph] = paperDims();
  createCanvas(pw, ph).parent('canvas-container');
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
    c.style.width  = pw * scale + 'px';
    c.style.height = ph * scale + 'px';
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// UI

function buildControls() {
  const root = 'controls';

  // --- Rule number ---
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
    if (v !== null) { settings.rule = v; updateRuleInfo(); regenerate(); }
  });

  const rndBtn = createButton('Random').parent(ruleRow);
  rndBtn.class('inline-btn');
  rndBtn.mousePressed(() => {
    settings.rule = (Math.random() * 4294967296) >>> 0;
    ruleInput.value(String(settings.rule));
    updateRuleInfo();
    regenerate();
  });

  // hex + binary readout
  ruleInfoDiv = createDiv('').parent(root).class('rule-info');
  updateRuleInfo();

  // --- Presets ---
  const presetField = createDiv('').parent(root).class('field');
  createSpan('Preset').parent(presetField).class('label');
  const presetSel = createSelect().parent(presetField);
  for (const p of PRESETS) presetSel.option(p.label);
  presetSel.changed(() => {
    const p = PRESETS[presetSel.elt.selectedIndex];
    const r = resolvePresetRule(p);
    if (r !== null) {
      settings.rule = r;
      ruleInput.value(String(settings.rule));
      updateRuleInfo();
      regenerate();
    }
  });

  // --- Paper ---
  addSelect(root, 'Paper size', Object.keys(PAPER_SIZES), settings.paper, v => {
    settings.paper = v; resizeForPaper();
  });
  addSelect(root, 'Orientation', ['portrait', 'landscape'], settings.orientation, v => {
    settings.orientation = v; resizeForPaper();
  });

  // --- Visuals ---
  addSelect(root, 'Cell style', CELL_STYLES, settings.cellStyle, v => {
    settings.cellStyle = v; regenerate();
  });
  addSlider(root, 'Cell size (mm)', 0.5, 10, settings.cellSize, 0.1, v => settings.cellSize = v);
  addSlider(root, 'Dot radius (mm)', 0.1, 3, settings.dotRadius, 0.1, v => settings.dotRadius = v);
  addSlider(root, 'Pen width (mm)', 0.05, 2, settings.penWidth, 0.05, v => settings.penWidth = v);
  addSlider(root, 'Hatch size (mm)', 0.05, 2, settings.hatchSize, 0.05, v => settings.hatchSize = v);
  addSlider(root, 'Margin (mm)', 0, 50, settings.margin, 1, v => settings.margin = v);
  addSlider(root, 'Alive color (0–255)', 0, 255, settings.aliveColor, 1, v => settings.aliveColor = v);
  addSlider(root, 'Dead color (0–255)', 0, 255, settings.deadColor, 1, v => settings.deadColor = v);

  // --- Seed ---
  addSelect(root, 'Seed type', SEED_TYPES, settings.seedType, v => {
    settings.seedType = v; regenerate();
  });
  addSlider(root, 'Seed density (random)', 0.01, 1, settings.seedDensity, 0.01, v => {
    settings.seedDensity = v;
  });

  // --- Edge behaviour ---
  const cbRow = createDiv('').parent(root).class('checkbox-row');
  const wrapCb = createCheckbox('Wrap edges', settings.wrapEdges).parent(cbRow);
  wrapCb.changed(() => { settings.wrapEdges = wrapCb.checked(); regenerate(); });

  const cbRow2 = createDiv('').parent(root).class('checkbox-row');
  const fillCb = createCheckbox('Fill alive cells', settings.fillCells).parent(cbRow2);
  fillCb.changed(() => { settings.fillCells = fillCb.checked(); regenerate(); });

  // --- Actions ---
  createButton('Regenerate').parent(root).mousePressed(regenerate);
  createButton('Generate SVG').parent(root).class('primary').mousePressed(exportSvg);
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
  s.input(()   => { const v = Number(s.value());   num.value(v); onChange(v); });
  s.changed(()  => regenerate());
  num.input(()  => { const v = Number(num.value()); s.value(v);  onChange(v); regenerate(); });
}

function resizeForPaper() {
  const [pw, ph] = paperDims();
  resizeCanvas(pw, ph);
  applyCanvasDisplay();
  regenerate();
}

////////////////////////////////////////////////////////////////////////////////////////
// Cellular automaton core

function makeInitialRow(cols) {
  const row = new Uint8Array(cols);
  switch (settings.seedType) {
    case 'center':
      row[Math.floor(cols / 2)] = 1;
      break;
    case 'random':
      for (let i = 0; i < cols; i++) row[i] = Math.random() < settings.seedDensity ? 1 : 0;
      break;
    case 'all-alive':
      row.fill(1);
      break;
    case 'alternating':
      for (let i = 0; i < cols; i++) row[i] = i & 1;
      break;
    case 'left-edge':
      row[0] = 1;
      break;
  }
  return row;
}

function nextRow(current, rule32) {
  const n    = current.length;
  const next = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = settings.wrapEdges ? current[(i - 2 + n) % n] : (i >= 2     ? current[i - 2] : 0);
    const b = settings.wrapEdges ? current[(i - 1 + n) % n] : (i >= 1     ? current[i - 1] : 0);
    const c = current[i];
    const d = settings.wrapEdges ? current[(i + 1) % n]     : (i + 1 < n  ? current[i + 1] : 0);
    const e = settings.wrapEdges ? current[(i + 2) % n]     : (i + 2 < n  ? current[i + 2] : 0);
    const pattern = (a << 4) | (b << 3) | (c << 2) | (d << 1) | e;
    next[i] = (rule32 >>> pattern) & 1;
  }
  return next;
}

////////////////////////////////////////////////////////////////////////////////////////
// Drawing

function regenerate() {
  lastCells = [];
  const [W, H] = paperDims();
  const { margin: m, cellSize: cs } = settings;
  const cols = Math.max(1, Math.floor((W - 2 * m) / cs));
  const rows = Math.max(1, Math.floor((H - 2 * m) / cs));
  const rule32 = settings.rule >>> 0;

  background(settings.deadColor);

  let row = makeInitialRow(cols);
  for (let gen = 0; gen < rows; gen++) {
    const y = m + gen * cs;
    for (let i = 0; i < cols; i++) {
      if (row[i]) {
        const x = m + i * cs;
        lastCells.push([x, y]);
        drawCell(x, y, cs);
      }
    }
    row = nextRow(row, rule32);
  }
}

// Boustrophedon hatch points for a square cell.
// - Vertical: first/last pass at pen/2 from the edge, stroke (width=pen, centred
//   on path) reaches y / y+cs exactly.
// - Horizontal: path spans the full cell so the pen physically travels to the
//   side edges (not relying on stroke caps). Boustrophedon connectors lie on
//   the outline's left/right edges — harmless double pass with the same pen.
function cellHatchPoints(x, y, cs, pen, spacing) {
  const avail = cs - pen;
  if (avail < 0) return null;
  const n = Math.max(2, Math.ceil(avail / spacing) + 1);
  const step = avail / (n - 1);
  const xL = x;
  const xR = x + cs;
  const yT = y + pen / 2;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const yi = yT + i * step;
    if (i % 2 === 0) pts.push([xL, yi], [xR, yi]);
    else             pts.push([xR, yi], [xL, yi]);
  }
  return pts;
}

function drawPolyline(pts) {
  beginShape();
  for (const [px, py] of pts) vertex(px, py);
  endShape();
}

function drawCell(x, y, cs) {
  const pen = settings.penWidth;
  switch (settings.cellStyle) {
    case 'filled': {
      noFill();
      stroke(settings.aliveColor);
      strokeWeight(pen);
      rect(x, y, cs, cs);
      const hatch = cellHatchPoints(x, y, cs, pen, settings.hatchSize);
      if (hatch) drawPolyline(hatch);
      strokeWeight(1);
      break;
    }
    case 'outline':
      noFill();
      stroke(settings.aliveColor);
      strokeWeight(pen);
      rect(x, y, cs, cs);
      strokeWeight(1);
      break;
    case 'dot':
      if (settings.fillCells) { fill(settings.aliveColor); noStroke(); }
      else                    { noFill(); stroke(settings.aliveColor); strokeWeight(pen); }
      circle(x + cs / 2, y + cs / 2, settings.dotRadius * 2);
      strokeWeight(1);
      break;
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// SVG export — built manually so fill colours are preserved

function grayHex(v) {
  const c = Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c}${c}${c}`;
}

function exportSvg() {
  const [W, H] = paperDims();
  const cs      = settings.cellSize;
  const aliveH  = grayHex(settings.aliveColor);
  const deadH   = grayHex(settings.deadColor);
  const fmt     = n => +n.toFixed(4) + '';

  const pen = settings.penWidth;
  const strokeAttrs = `fill="none" stroke="${aliveH}" stroke-width="${fmt(pen)}" stroke-linecap="square" stroke-linejoin="miter"`;

  let shapes = '';
  for (const [x, y] of lastCells) {
    if (settings.cellStyle === 'dot') {
      const r  = settings.dotRadius;
      const cx = fmt(x + cs / 2);
      const cy = fmt(y + cs / 2);
      if (settings.fillCells) {
        shapes += `  <circle cx="${cx}" cy="${cy}" r="${fmt(r)}" fill="${aliveH}"/>\n`;
      } else {
        shapes += `  <circle cx="${cx}" cy="${cy}" r="${fmt(r)}" fill="none" stroke="${aliveH}" stroke-width="${fmt(pen)}"/>\n`;
      }
    } else if (settings.cellStyle === 'filled') {
      shapes += `  <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(cs)}" height="${fmt(cs)}" ${strokeAttrs}/>\n`;
      const hatch = cellHatchPoints(x, y, cs, pen, settings.hatchSize);
      if (hatch) {
        const ptsStr = hatch.map(([px, py]) => `${fmt(px)},${fmt(py)}`).join(' ');
        shapes += `  <polyline points="${ptsStr}" ${strokeAttrs}/>\n`;
      }
    } else {
      shapes += `  <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(cs)}" height="${fmt(cs)}" ${strokeAttrs}/>\n`;
    }
  }

  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n` +
    `  <rect width="${W}" height="${H}" fill="${deadH}"/>\n` +
    shapes +
    `</svg>\n`;

  const fname = `ca5_r${settings.rule}_${settings.paper}-${settings.orientation}_${timestamp().replace(/[ .:]/g, '-')}.svg`;
  downloadBlob(svg, fname, 'image/svg+xml');
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
