// Labyrinth generator for pen plotters.
// All user-facing units are millimetres; canvas is rendered at a
// derived pixel scale so the preview fits on screen. SVG export
// rewrites the outer <svg width/height> to millimetres so plotter
// software (Inkscape/AxiDraw/NextDraw) receives real physical sizes.
//
// Two exports are produced separately so they can be plotted in
// different pen colours: the maze walls first, then the solution
// path overlaid on top.

// ---------------------------------------------------------------------------
// Paper sizes (mm) — short side × long side
// ---------------------------------------------------------------------------
const PAPER_SIZES = {
  'A0': [841, 1189],
  'A1': [594, 841],
  'A2': [420, 594],
  'A3': [297, 420],
  'A4': [210, 297],
  'A5': [148, 210],
  'A6': [105, 148],
  'B0': [1000, 1414],
  'B1': [707, 1000],
  'B2': [500, 707],
  'B3': [353, 500],
  'B4': [250, 353],
  'B5': [176, 250],
  'B6': [125, 176],
};

// Max canvas footprint in pixels for the on-screen preview.
const MAX_CANVAS_W = 900;
const MAX_CANVAS_H = 680;

// ---------------------------------------------------------------------------
// State — all dimensions in mm
// ---------------------------------------------------------------------------
let paperSize = 'A4';
let orientation = 'portrait';
let wallStrokeMm = 0.3;
let corridorMm = 8;
let marginXMm = 10;
let marginYMm = 10;
let pathOverhangMm = 5;   // how far the path sticks out past the frame

// Labyrinth algorithm options.
// straightness: 0 = uniformly random neighbour, 1 = always continue in the
//   previous direction when possible (produces long straight corridors).
// braiding: 0 = perfect maze (every dead-end kept),
//   1 = no dead-ends (every dead-end carved open, introducing loops).
let straightness = 0.0;
let braiding = 0.0;

let paperWmm, paperHmm;
let mmToPx;

let maze;
let cols, rows;
let topOpeningCol, bottomOpeningCol;
let solutionPath;

// ---------------------------------------------------------------------------
// Setup / UI
// ---------------------------------------------------------------------------
function getPaperMm() {
  const [s, l] = PAPER_SIZES[paperSize];
  return orientation === 'portrait' ? [s, l] : [l, s];
}

function computeScale(wMm, hMm) {
  return Math.min(MAX_CANVAS_W / wMm, MAX_CANVAS_H / hMm);
}

function setup() {
  [paperWmm, paperHmm] = getPaperMm();
  mmToPx = computeScale(paperWmm, paperHmm);
  createCanvas(paperWmm * mmToPx, paperHmm * mmToPx);

  buildUI();

  setSvgInkscapeCompatibility(true);
  beginRecordSvg(this, null);
  regenerate();
}

function buildUI() {
  const panel = createDiv().class('controls');

  addSelectRow(panel, 'Paper size', Object.keys(PAPER_SIZES), paperSize, v => {
    paperSize = v; resizePaperAndRegenerate();
  });
  addSelectRow(panel, 'Orientation', ['portrait', 'landscape'], orientation, v => {
    orientation = v; resizePaperAndRegenerate();
  });

  // Geometry.
  addSliderRow(panel, 'Wall stroke (mm)',      0.1,  2.0,  wallStrokeMm,    0.1,  v => wallStrokeMm    = v);
  addSliderRow(panel, 'Corridor width (mm)',   0.1,  30,   corridorMm,      0.1,  v => corridorMm      = v);
  addSliderRow(panel, 'Margin X (mm)',         0,    80,   marginXMm,       1,    v => marginXMm       = v);
  addSliderRow(panel, 'Margin Y (mm)',         0,    80,   marginYMm,       1,    v => marginYMm       = v);
  addSliderRow(panel, 'Path overhang (mm)',    0,    30,   pathOverhangMm,  0.5,  v => pathOverhangMm  = v);

  // Algorithm options (recursive backtracker).
  addSliderRow(panel, 'Straightness (0–1)',    0,    1,    straightness,    0.05, v => straightness    = v);
  addSliderRow(panel, 'Braiding (0–1)',        0,    1,    braiding,        0.05, v => braiding        = v);

  const buttons = createDiv().parent(panel).class('buttons');
  createButton('Regenerate').parent(buttons).mousePressed(regenerate);
  createButton('Export labyrinth').parent(buttons).mousePressed(exportLabyrinth);
  createButton('Export path').parent(buttons).mousePressed(exportPath);
}

function addSelectRow(parent, label, options, selected, onChange) {
  const row = createDiv().parent(parent).class('row');
  createElement('label', label + ':').parent(row);
  const sel = createSelect().parent(row);
  options.forEach(o => sel.option(o));
  sel.selected(selected);
  sel.changed(() => onChange(sel.value()));
  createSpan('').parent(row);
  createSpan('').parent(row).class('val');
}

// Slider with an adjacent number input. The input accepts values outside
// the slider's range (for custom fine-tuning); the slider clamps its own
// position but the numeric value from the input is what the algorithm
// actually uses. Regeneration only fires on release/commit, never during
// a drag or while typing.
function addSliderRow(parent, label, min, max, defaultVal, step, onChange) {
  const row = createDiv().parent(parent).class('row');
  createElement('label', label + ':').parent(row);
  const slider = createSlider(min, max, defaultVal, step).parent(row);
  const input = createInput(String(defaultVal), 'number').parent(row).class('val-input');
  input.elt.step = step;
  input.elt.min = 0;
  createSpan('').parent(row);

  // Drag: only update the readout; do not regenerate until release.
  slider.input(() => input.value(slider.value()));
  slider.changed(() => {
    const v = Number(slider.value());
    onChange(v);
    regenerate();
  });

  // Typing: let the user commit via Enter or blur; slider follows when in
  // range, otherwise it pins at its own extreme but the real value is kept.
  input.changed(() => {
    const v = Number(input.value());
    if (!isFinite(v) || v < 0) return;
    slider.value(v);
    onChange(v);
    regenerate();
  });
}

function resizePaperAndRegenerate() {
  [paperWmm, paperHmm] = getPaperMm();
  mmToPx = computeScale(paperWmm, paperHmm);
  resizeCanvas(paperWmm * mmToPx, paperHmm * mmToPx);
  regenerate();
}

// ---------------------------------------------------------------------------
// SVG export — each layer exported separately so they can be plotted
// on the same sheet with different pens.
// ---------------------------------------------------------------------------
function exportLabyrinth() { exportLayer('maze',     'labyrinth'); }
function exportPath()      { exportLayer('solution', 'path');      }

function exportLayer(layerName, fileLabel) {
  // Re-draw just the requested layer into a fresh SVG recording so the
  // exported file only contains those strokes — no invisible extras from
  // the other layer tagging along.
  clearRecordSvg();
  background(255);
  if (layerName === 'maze') drawMazeLayer();
  else if (layerName === 'solution') drawSolutionLayer();

  let svgStr = endRecordSvg();
  svgStr = svgStr.replace(/(<svg\b[^>]*?)\swidth="[^"]*"/,  `$1 width="${paperWmm}mm"`);
  svgStr = svgStr.replace(/(<svg\b[^>]*?)\sheight="[^"]*"/, `$1 height="${paperHmm}mm"`);

  const ts = timestamp();
  saveStrings([svgStr], `${fileLabel} ${paperSize}-${orientation} ${ts}`, 'svg');

  // Restore full-preview drawing and recording.
  beginRecordSvg(this, null);
  redrawAll();
}

function timestamp() {
  const n = new Date();
  const p = v => String(v).padStart(2, '0');
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())} ${p(n.getHours())}-${p(n.getMinutes())}-${p(n.getSeconds())}`;
}

// ---------------------------------------------------------------------------
// Regenerate — top-level orchestration
// ---------------------------------------------------------------------------
// Generates fresh maze data *and* redraws.
function regenerate() {
  rebuild();
  redrawAll();
}

// Recomputes the maze / openings / solution from current parameters.
function rebuild() {
  const availW = paperWmm - 2 * marginXMm;
  const availH = paperHmm - 2 * marginYMm;

  cols = Math.max(2, Math.floor(availW / corridorMm));
  rows = Math.max(2, Math.floor(availH / corridorMm));

  maze = buildMaze(cols, rows);

  topOpeningCol = Math.floor(Math.random() * cols);
  bottomOpeningCol = Math.floor(Math.random() * cols);
  maze[0][topOpeningCol].walls[WALL_TOP] = false;
  maze[rows - 1][bottomOpeningCol].walls[WALL_BOTTOM] = false;

  solutionPath = solveMaze(maze, cols, rows, 0, topOpeningCol, rows - 1, bottomOpeningCol);
}

// Redraws both layers using the current maze data, clearing any previous
// recording so preview and recorded SVG stay in sync.
function redrawAll() {
  clearRecordSvg();
  background(255);
  drawMazeLayer();
  drawSolutionLayer();
}

// ---------------------------------------------------------------------------
// Maze data structure
// ---------------------------------------------------------------------------
// walls: [top, right, bottom, left]
const WALL_TOP = 0;
const WALL_RIGHT = 1;
const WALL_BOTTOM = 2;
const WALL_LEFT = 3;

function makeGrid(cols, rows) {
  const g = new Array(rows);
  for (let r = 0; r < rows; r++) {
    g[r] = new Array(cols);
    for (let c = 0; c < cols; c++) {
      g[r][c] = { walls: [true, true, true, true] };
    }
  }
  return g;
}

function neighborsOf(r, c, rows, cols) {
  const out = [];
  if (r > 0)         out.push({ r: r - 1, c,         wallFrom: WALL_TOP,    wallTo: WALL_BOTTOM });
  if (c < cols - 1)  out.push({ r,         c: c + 1, wallFrom: WALL_RIGHT,  wallTo: WALL_LEFT   });
  if (r < rows - 1)  out.push({ r: r + 1, c,         wallFrom: WALL_BOTTOM, wallTo: WALL_TOP    });
  if (c > 0)         out.push({ r,         c: c - 1, wallFrom: WALL_LEFT,   wallTo: WALL_RIGHT  });
  return out;
}

function carve(cells, r, c, n) {
  cells[r][c].walls[n.wallFrom] = false;
  cells[n.r][n.c].walls[n.wallTo] = false;
}

// ---------------------------------------------------------------------------
// Generation — recursive backtracker with straightness bias and braiding
// ---------------------------------------------------------------------------
function buildMaze(cols, rows) {
  const cells = makeGrid(cols, rows);
  recursiveBacktracker(cells, cols, rows, straightness);
  if (braiding > 0) braid(cells, cols, rows, braiding);
  return cells;
}

function recursiveBacktracker(cells, cols, rows, straightnessBias) {
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));
  // Each stack frame remembers the direction we entered the cell from
  // (i.e. the wall index *on the current cell* of the step we just took).
  // -1 for the root cell.
  const stack = [{ r: 0, c: 0, lastDir: -1 }];
  visited[0][0] = true;

  while (stack.length) {
    const top = stack[stack.length - 1];
    const unv = neighborsOf(top.r, top.c, rows, cols).filter(n => !visited[n.r][n.c]);
    if (unv.length === 0) { stack.pop(); continue; }

    let chosen = null;
    if (top.lastDir !== -1 && straightnessBias > 0 && Math.random() < straightnessBias) {
      // Prefer the "continue straight" option if it's still available.
      chosen = unv.find(n => n.wallFrom === top.lastDir) || null;
    }
    if (!chosen) chosen = unv[Math.floor(Math.random() * unv.length)];

    carve(cells, top.r, top.c, chosen);
    visited[chosen.r][chosen.c] = true;
    stack.push({ r: chosen.r, c: chosen.c, lastDir: chosen.wallFrom });
  }
}

// Braiding: find dead-ends and, with probability `amount`, carve one of
// their remaining walls (preferring a wall that connects to another
// dead-end, to eliminate pairs at once). Introduces loops — the resulting
// maze is no longer "perfect" but is more interesting to solve visually.
function braid(cells, cols, rows, amount) {
  const isDeadEnd = (r, c) => cells[r][c].walls.filter(Boolean).length === 3;
  const deadEnds = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isDeadEnd(r, c)) deadEnds.push([r, c]);
    }
  }
  // Shuffle so braiding doesn't favour a scan direction.
  for (let i = deadEnds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deadEnds[i], deadEnds[j]] = [deadEnds[j], deadEnds[i]];
  }

  for (const [r, c] of deadEnds) {
    if (!isDeadEnd(r, c)) continue; // may have been fixed via a neighbour
    if (Math.random() > amount) continue;
    const candidates = neighborsOf(r, c, rows, cols).filter(n => cells[r][c].walls[n.wallFrom]);
    if (candidates.length === 0) continue;
    // Prefer merging two dead-ends in one cut, else pick randomly.
    const deadPartner = candidates.find(n => isDeadEnd(n.r, n.c));
    const pick = deadPartner || candidates[Math.floor(Math.random() * candidates.length)];
    carve(cells, r, c, pick);
  }
}

// ---------------------------------------------------------------------------
// Solve — BFS from top opening to bottom opening
// ---------------------------------------------------------------------------
function solveMaze(cells, cols, rows, sr, sc, er, ec) {
  const prev = new Int32Array(rows * cols).fill(-1);
  const visited = new Uint8Array(rows * cols);
  const queue = new Int32Array(rows * cols);
  let head = 0, tail = 0;

  const start = sr * cols + sc;
  queue[tail++] = start;
  visited[start] = 1;

  const target = er * cols + ec;
  while (head < tail) {
    const idx = queue[head++];
    if (idx === target) break;
    const r = (idx / cols) | 0;
    const c = idx - r * cols;
    for (const n of neighborsOf(r, c, rows, cols)) {
      if (cells[r][c].walls[n.wallFrom]) continue; // blocked
      const ni = n.r * cols + n.c;
      if (visited[ni]) continue;
      visited[ni] = 1;
      prev[ni] = idx;
      queue[tail++] = ni;
    }
  }

  const path = [];
  if (!visited[target]) return path;
  let cur = target;
  while (cur !== -1) {
    const r = (cur / cols) | 0;
    const c = cur - r * cols;
    path.push([r, c]);
    cur = prev[cur];
  }
  path.reverse();
  return path;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function mazeOffsets() {
  // Centre the grid inside the margin box (available area may be
  // slightly bigger than cols*corridorMm because of the floor()).
  const mazeWmm = cols * corridorMm;
  const mazeHmm = rows * corridorMm;
  const availW = paperWmm - 2 * marginXMm;
  const availH = paperHmm - 2 * marginYMm;
  const ox = marginXMm + (availW - mazeWmm) / 2;
  const oy = marginYMm + (availH - mazeHmm) / 2;
  return { ox, oy, mazeWmm, mazeHmm };
}

function drawMazeLayer() {
  beginSvgGroup('maze');
  stroke(0);
  strokeWeight(wallStrokeMm * mmToPx);
  noFill();
  strokeCap(SQUARE);
  strokeJoin(MITER);

  const { ox, oy } = mazeOffsets();
  const sPx = corridorMm * mmToPx;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (ox + c * corridorMm) * mmToPx;
      const y = (oy + r * corridorMm) * mmToPx;
      const w = maze[r][c].walls;
      // Draw top and left for every cell; right/bottom only for the
      // last column/row — avoids drawing each shared interior wall twice.
      if (w[WALL_TOP])  line(x, y, x + sPx, y);
      if (w[WALL_LEFT]) line(x, y, x, y + sPx);
      if (c === cols - 1 && w[WALL_RIGHT])  line(x + sPx, y, x + sPx, y + sPx);
      if (r === rows - 1 && w[WALL_BOTTOM]) line(x, y + sPx, x + sPx, y + sPx);
    }
  }
  endSvgGroup();
}

function drawSolutionLayer() {
  beginSvgGroup('solution');
  stroke(220, 30, 30); // red so the second pen is obvious in preview
  strokeWeight(wallStrokeMm * mmToPx);
  noFill();
  strokeJoin(ROUND);
  strokeCap(ROUND);

  const { ox, oy, mazeHmm } = mazeOffsets();

  const topX = ox + (topOpeningCol    + 0.5) * corridorMm;
  const botX = ox + (bottomOpeningCol + 0.5) * corridorMm;

  // Overhang: the path sticks out past the maze frame by `pathOverhangMm`
  // at both openings — it does NOT extend all the way to the paper edge.
  const topYOut = oy - pathOverhangMm;
  const botYOut = oy + mazeHmm + pathOverhangMm;

  beginShape();
  vertex(topX * mmToPx, topYOut * mmToPx);
  vertex(topX * mmToPx, oy * mmToPx);
  for (const [r, c] of solutionPath) {
    const x = ox + (c + 0.5) * corridorMm;
    const y = oy + (r + 0.5) * corridorMm;
    vertex(x * mmToPx, y * mmToPx);
  }
  vertex(botX * mmToPx, (oy + mazeHmm) * mmToPx);
  vertex(botX * mmToPx, botYOut * mmToPx);
  endShape();

  endSvgGroup();
}
