////////////////////////////////////////////////////////////////////////////////////////
// Night fog — views of a ring road at night in fog, in one black pen
//
// The photographs this started from were taken by a ring road on a foggy night: an
// embankment topped by a noise barrier of panels and posts, street lamps on tall poles
// whose light hangs in the fog as a halo and spills down in wedges, a row of them going
// off into the distance, bare saplings and weeds black against the glow, a field that is
// nothing but dark, stairs climbing a grassy mound to a lit door in the wall, a road
// curving away between guard rails, wet and shining under the lamps.
//
// A view is built in two halves. The first is a picture: the scene is painted in greys
// on a raster — a sky that brightens towards a band of fog at the horizon, every lamp's
// halo and beams added as light, then the solid things painted over it, each the less
// opaque the further it stands in the fog, so it melts into the light behind it; then the
// field, the lit strip at the foot of the embankment and the snow, then the near things.
// The fog is softened by blurring the light before the solids go on. A photograph from
// disk can stand in for the painted picture.
//
// The second half turns that picture into lines for one pen. Darkness is ink. In line
// dither every line of a close-set family has a threshold of its own, spread like an
// ordered dither — 0, ½, ¼, ¾… — and is drawn wherever the picture is darker than its
// threshold, so the lines thin out evenly as the fog brightens and leave the paper bare
// where the lamps are. Squiggles turn darkness into the amplitude of a wave along each
// line; crosshatching adds a direction for every step of dark; stipple scatters dots;
// contours draw the isophotes, the rings of equal light round each lamp. Over it all the
// edges of things are drawn as lines — branches, poles, the posts of the wall, the steps,
// the rails — breaking into dashes the further off they stand.
//
// Black ink on white paper draws the dark; turned round, white ink on black paper draws
// the light.
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};
const PAPERS = Object.keys(PAPER_SIZES).concat('custom');

const PAPER_TONES = {
  'white': '#fbfaf5', 'cream': '#f1e8d6', 'grey': '#8e9196', 'black': '#151517',
};
const TONES = Object.keys(PAPER_TONES).concat('custom');

// Black and white: a black pen, or a white one for black paper.
const PEN_KINDS = {
  'black':        { col: '#1b1b1b', w: 0.3 },
  'white marker': { col: '#f7f6f1', w: 3 },
  'other':        { col: '#3a3a3a', w: 0.5 },
};
const KINDS = Object.keys(PEN_KINDS);
const SLOTS = 2;

const FRAMES = { 'fill': 0, '4:3': 4 / 3, '3:2': 1.5, '16:9': 16 / 9, '2:1': 2, '1:1': 1, '3:4': 0.75 };
const FRAME_NAMES = Object.keys(FRAMES);
const SOURCES    = ['scene', 'photo'];
const TECHNIQUES = ['line dither', 'squiggle', 'crosshatch', 'stipple', 'contours', 'none'];
const BEAMS      = ['left', 'right', 'both', 'down', 'none'];
const ENDS       = ['right', 'left'];
const TREE_KINDS = ['saplings', 'bare', 'mixed'];
const RAILS      = ['both', 'left', 'right', 'none'];
const PREVIEWS   = ['plot', 'picture', 'both'];

// What goes on the sheet: the tone, the edges of things, the border round the picture.
const LAYERS = [
  { id: 'tone',   label: 'tone',   pen: 'tonePen' },
  { id: 'lines',  label: 'lines',  pen: 'linesPen' },
  { id: 'border', label: 'border', pen: 'borderPen' },
];
const L_TONE = 0, L_LINES = 1, L_BORDER = 2;

const MAX_STROKES   = 400_000;
const BUSY_STROKES  = 40_000;
const EPS           = 0.01;      // mm — the stub that stands in for a dot
const PREVIEW_MAX_PX = 1500;
const PEN_CYCLE_S   = 0.3;
const DRAW_SPEED    = 60;
const TRAVEL_SPEED  = 150;

const settings = {
  // paper and picture
  paper: 'A4',
  orientation: 'landscape',
  customW: 400,
  customH: 300,
  margin: 15,
  frame: '4:3',
  border: true,
  paperTone: 'white',
  paperColor: '#fbfaf5',   // the preview only — the files have no background
  invert: false,           // draw the light, for white ink on black paper

  // the pens
  pen1Kind: 'black', pen1W: 0.3, pen1Col: '#1b1b1b',
  pen2Kind: 'black', pen2W: 0.3, pen2Col: '#1b1b1b',
  tonePen: 1, linesPen: 1, borderPen: 1,

  // the picture
  source: 'scene',
  seed: 1,
  res: 3,               // px per mm of the picture the lines are made from

  // sky and fog
  horizon: 38,          // % of the picture's height
  skyDark: 9,           // % light at the top of the sky
  fogLight: 70,         // % light in the band of fog at the horizon
  fogBand: 14,          // % of the height — how deep the band is
  fog: 50,              // % — how fast things fade into the fog with distance
  haze: 2.5,            // mm — how far the light is softened
  mottle: 12,           // % — clouds in the fog
  mottleScale: 3,

  // the embankment and its wall
  embankment: true,
  embY: 40,             // % — the road on top, at the left end
  embY2: 40,            // % — at the right end
  embPersp: 0,          // % — how much smaller the far end is
  embFar: 'right',
  wallH: 4,             // % of the height, at the near end
  slopeH: 13,
  wallLight: 18,        // %
  slopeLight: 12,       // %
  embDepth: 45,         // % — how far it stands in the fog
  panelW: 9,            // % of the width, at the near end
  rails: 2,
  litStrip: 72,         // % light of the strip at its foot
  stripH: 2.5,          // % of the height

  // lamps
  lamps: 2,
  lampStart: 9,         // % along the embankment
  lampEnd: 59,
  poleH: 15,            // % of the height, at the near end
  lampBright: 95,       // %
  halo: 11,             // % of the height
  haloSoft: 55,         // %
  beam: 'left',
  beamSpread: 28,       // °
  beamLen: 30,          // % of the height
  beamBright: 30,       // %
  arms: true,
  farRow: 2,            // lamps in a farther row
  farDrop: 14,          // % of the height below the near row
  farBright: 70,        // %

  // trees and weeds
  trees: 4,
  treeKind: 'saplings',
  treeX: 42,            // % across
  treeSpread: 60,       // % of the width
  treeBase: 58,         // % down
  treeH: 33,            // % of the height
  treeDetail: 6,
  treeDepth: 15,        // % — how far they stand in the fog
  weeds: 4,
  weedH: 18,            // % of the height
  grass: 35,            // % — blades along the edge of the field

  // the ground
  groundLight: 3,       // % light at the bottom
  groundFar: 10,        // % light at the far edge of the field
  snow: 0,              // % of the field under snow
  snowScale: 4,
  snowLight: 80,        // %

  // the road
  road: false,
  roadCurve: 45,        // %
  roadX: -10,           // %
  roadWidth: 3.2,       // camera heights
  guardrails: 'both',
  railPosts: 1.6,       // camera heights between posts
  roadLight: 22,        // %
  wet: 55,              // % — the lamps in the wet road

  // stairs and a door
  stairs: false,
  stairsX: 30,          // % along the embankment
  steps: 11,
  doorH: 21,            // % of the height
  doorW: 9,             // % of the width
  doorLight: 85,        // %
  panes: 3,
  handrail: true,

  // the ink — how the picture becomes lines
  technique: 'line dither',
  spacing: 0.5,         // mm — the closest two lines
  levels: 8,
  angle: 0,             // °
  wobble: 0,            // mm
  minDash: 0.6,         // mm — a shorter piece is not drawn
  squiggleGap: 1.1,     // mm between squiggle lines
  squiggleFreq: 1.4,    // waves a mm, at the darkest
  hatchDirs: 3,
  hatchGap: 0.8,        // mm
  stippleGap: 0.45,     // mm — the closest two dots
  stippleMax: 60000,
  contourLevels: 14,
  contoursToo: false,
  brightness: 0,        // %
  contrast: 0,          // %
  gamma: 125,           // %
  whiteCut: 6,          // % — lighter than this is left bare
  grain: 5,             // %

  // the edges of things
  lines: true,
  lineFog: true,        // far things break into dashes
  lineGrass: false,     // every blade of grass as a line

  // output
  preview: 'plot',
  optimiseOrder: true,
  liveUpdate: true,
  showGuides: false,
  pngDpi: 200,
};

const DEFAULTS = { ...settings };

// Views worth starting from. Each one is the whole state.
const SCENES = [
  { label: '— select a view —' },
  { label: 'Lamps over the embankment', s: {} },
  { label: 'A tree in the fog', s: {
      horizon: 47, fogLight: 72, fogBand: 22, fog: 60, embY: 44, embY2: 41, embPersp: 70,
      embFar: 'right', wallH: 2.5, slopeH: 5, panelW: 0, rails: 0, embDepth: 70, litStrip: 0,
      lamps: 9, lampStart: 4, lampEnd: 100, poleH: 7, halo: 5, beam: 'down', beamLen: 10,
      beamBright: 18, farRow: 8, farDrop: 2.5, trees: 1, treeKind: 'bare', treeX: 44,
      treeBase: 52, treeH: 20, treeDetail: 6, treeDepth: 30, weeds: 0, grass: 15,
      groundFar: 30, groundLight: 5 } },
  { label: 'One lamp over the wall', s: {
      horizon: 40, skyDark: 30, fogLight: 66, fogBand: 30, embY: 94, embY2: 93, wallH: 58,
      slopeH: 0, wallLight: 9, embDepth: 15, panelW: 27, rails: 2, litStrip: 0, lamps: 2,
      lampStart: -12, lampEnd: 62, poleH: 80, halo: 14, haloSoft: 45, beam: 'none', farRow: 0,
      trees: 0, weeds: 0, grass: 30, arms: false, groundLight: 12, groundFar: 14, lampBright: 62,
      mottle: 4 } },
  { label: 'Stairs to a door', s: {
      horizon: 15, skyDark: 40, fogLight: 60, fogBand: 25, embY: 32, embY2: 30, wallH: 40,
      slopeH: 22, wallLight: 22, slopeLight: 30, embDepth: 20, panelW: 25, rails: 2,
      litStrip: 0, lamps: 0, farRow: 0, trees: 0, weeds: 0, grass: 50, stairs: true,
      stairsX: 30, doorW: 9, doorH: 27, steps: 12, snow: 42, snowScale: 1.6, snowLight: 70,
      groundLight: 24, groundFar: 30, mottle: 6 } },
  { label: 'A curve under the lamps', s: {
      horizon: 54, skyDark: 6, fogLight: 50, fogBand: 14, embY: 56, embY2: 46, embPersp: 75,
      embFar: 'left', wallH: 1.5, slopeH: 8, panelW: 0, rails: 0, embDepth: 55, litStrip: 0,
      lamps: 9, lampStart: 4, lampEnd: 96, poleH: 12, halo: 5, beam: 'down', beamLen: 12,
      farRow: 7, farDrop: 4, trees: 0, weeds: 0, grass: 0, road: true, roadCurve: -55,
      roadX: 22, roadWidth: 2.6, wet: 70, groundLight: 3, groundFar: 12 } },
  { label: 'Only lights in the fog', s: {
      embankment: false, lamps: 0, farRow: 0, trees: 0, weeds: 0, grass: 0, horizon: 55,
      fogLight: 45 } },
  { label: 'Saplings, squiggled', s: { technique: 'squiggle' } },
  { label: 'Etching: crosshatch', s: { technique: 'crosshatch', hatchDirs: 4, hatchGap: 0.7 } },
  { label: 'Isophotes: the rings of light', s: {
      technique: 'contours', contourLevels: 16, lines: true } },
  { label: 'Stippled fog', s: { technique: 'stipple', stippleGap: 0.7, stippleMax: 25000 } },
  { label: 'White ink on black paper', s: {
      paper: 'B2', invert: true, paperTone: 'black', paperColor: PAPER_TONES.black,
      pen1Kind: 'white marker', pen1W: 3, pen1Col: PEN_KINDS['white marker'].col,
      pen2Kind: 'white marker', pen2W: 3, pen2Col: PEN_KINDS['white marker'].col,
      spacing: 3.6, minDash: 4, lines: false, border: false, levels: 4 } },
];

const setters   = {};
const fieldDivs = {};
let statsDiv, linkDiv, penListDiv, layerButtons = {}, penSelects = [], slotSwatches = [], photoNote;

let shapes  = null;          // { pts, off, ink, lay } — polylines in mm
let strokes = 0;
let plan    = null;          // { order, flip, ink, travel }
let perPen  = null;
let perLayer = null;
let counts  = null;
let lastMs  = 0;
let drag    = null;

////////////////////////////////////////////////////////////////////////////////////////
// Small change

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function parseNum(str) {
  const v = Number(String(str).replace(',', '.').trim());
  return Number.isFinite(v) ? v : null;
}

function groupNum(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function rad(deg) { return deg * Math.PI / 180; }

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

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function rng(salt) {
  return mulberry32(Math.imul((settings.seed | 0) + 1, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca77));
}

function hexRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex || '');
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

function luma(hex) {
  const [r, g, b] = hexRgb(hex).map(v => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const la = luma(a), lb = luma(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

////////////////////////////////////////////////////////////////////////////////////////
// The URL is the document
//
// Every setting that differs from its default is written into the hash, debounced, with
// replaceState so the back button stays usable. A photograph loaded from disk is the one
// thing that cannot ride in it.

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
  }
}

function syncUrl() {
  if (urlTimer) clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    urlTimer = null;
    urlWritten = encodeState();
    const b = location.pathname + location.search;
    history.replaceState(null, '', urlWritten ? b + '#' + urlWritten : b);
    if (linkDiv) linkDiv.html(location.href);
  }, 250);
}

function refreshControls() {
  for (const k in setters) if (k in settings) setters[k](settings[k]);
  refreshPenSelects();
  syncVisibility();
}

function onHashChange() {
  const h = location.hash.replace(/^#/, '');
  if (h === urlWritten) return;
  Object.assign(settings, DEFAULTS);
  applyState(h);
  urlWritten = h;
  refreshControls();
  resizeForPaper();
}

////////////////////////////////////////////////////////////////////////////////////////
// The sheet, the picture on it, and the pens

function paperDims() {
  if (settings.paper === 'custom') {
    return [clamp(settings.customW, 20, 5000), clamp(settings.customH, 20, 5000)];
  }
  const [a, b] = PAPER_SIZES[settings.paper] || PAPER_SIZES.A4;
  return settings.orientation === 'portrait' ? [a, b] : [b, a];
}

function penW(i) { return clamp(Number(settings[`pen${i + 1}W`]) || 0.3, 0.05, 30); }
function penCol(i) { return settings[`pen${i + 1}Col`] || '#000000'; }
function penKind(i) { return settings[`pen${i + 1}Kind`] || 'black'; }
function penIdx(v) { return clamp(Math.round(Number(v) || 1), 1, SLOTS) - 1; }
function layerPen(li) { return penIdx(settings[LAYERS[li].pen]); }

function penLabel(i) {
  const w = penW(i);
  return `${i + 1} · ${penKind(i)} ${w < 1 ? w.toFixed(2) : +w.toFixed(1)} mm`;
}

// The picture: the room inside the margin, cut to the proportions asked for, centred.
let F = { x0: 0, y0: 0, w: 1, h: 1 };

function makeFrame() {
  const s = settings, [W, H] = paperDims();
  const aw = Math.max(1, W - 2 * s.margin), ah = Math.max(1, H - 2 * s.margin);
  const r = FRAMES[s.frame] || 0;
  let w = aw, h = ah;
  if (r) { if (aw / ah > r) w = ah * r; else h = aw / r; }
  F = { x0: (W - w) / 2, y0: (H - h) / 2, w, h };
}

// What a pen may draw inside: the picture, less half its own nib all round.
function penArea(i) {
  const m = penW(i) / 2;
  return { x0: F.x0 + m, y0: F.y0 + m, x1: F.x0 + F.w - m, y1: F.y0 + F.h - m,
           w: F.w - 2 * m, h: F.h - 2 * m };
}

function borderArea(i) {
  const [W, H] = paperDims(), m = penW(i) / 2;
  return { x0: m, y0: m, x1: W - m, y1: H - m, w: W - 2 * m, h: H - 2 * m };
}

// The passes go down in the order of the pens.
function penOrder() { return [0, 1]; }

function previewScale() {
  const [w, h] = paperDims();
  return Math.min(PREVIEW_MAX_PX / w, PREVIEW_MAX_PX / h);
}

function canvasEl() {
  return document.querySelector('#sheet canvas.p5Canvas');
}

////////////////////////////////////////////////////////////////////////////////////////

function setup() {
  applyState(location.hash.replace(/^#/, ''));
  urlWritten = encodeState();
  window.addEventListener('hashchange', onHashChange);
  new ResizeObserver(applyCanvasDisplay).observe(document.getElementById('canvas-container'));

  const [w, h] = paperDims();
  const s = previewScale();
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  createCanvas(Math.round(w * s), Math.round(h * s)).parent('sheet');
  applyCanvasDisplay();
  buildControls();
  attachPointer();
  attachKeys();
  update();
  noLoop();
}

function applyCanvasDisplay() {
  const [pw, ph] = paperDims();
  const box = document.getElementById('canvas-container');
  const aw = box ? box.clientWidth - 48 : 900;
  const ah = box ? box.clientHeight - 48 : 700;
  const scale = Math.max(0.2, Math.min(aw / pw, ah / ph));
  const c = canvasEl();
  if (!c) return;
  c.style.width  = pw * scale + 'px';
  c.style.height = ph * scale + 'px';
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
  strokes = 0;
  shapes = plan = perPen = perLayer = counts = null;

  shapes = buildShapes();
  strokes = shapes ? shapes.off.length - 1 : 0;
  if (strokes > MAX_STROKES) shapes = null;
  else if (shapes) plan = orderShapes(shapes);

  lastMs = performance.now() - t0;
  drawPreview();
  syncVisibility();
  updateStats();
  syncUrl();
}

let liveQueued = false;

function liveUpdate() {
  if (liveQueued) return;
  liveQueued = true;
  requestAnimationFrame(() => {
    liveQueued = false;
    update();
  });
}

////////////////////////////////////////////////////////////////////////////////////////
// Noise
//
// Improved Perlin, seeded: clouds in the fog, frost on the lit grass, snow on the field.

function fade3(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

function grad3(h, x, y, z) {
  h &= 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : (h === 12 || h === 14) ? x : z;
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

function makePerlin3(seed) {
  const rnd = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  const P = new Uint8Array(512);
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];

  return function (x, y, z) {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    x -= X; y -= Y; z -= Z;
    const xi = X & 255, yi = Y & 255, zi = Z & 255;
    const u = fade3(x), v = fade3(y), w = fade3(z);
    const A = P[xi] + yi, AA = P[A] + zi, AB = P[A + 1] + zi;
    const B = P[xi + 1] + yi, BA = P[B] + zi, BB = P[B + 1] + zi;
    const x1 = x - 1, y1 = y - 1, z1 = z - 1;
    const l00 = grad3(P[AA], x, y, z),  l10 = grad3(P[BA], x1, y, z);
    const l01 = grad3(P[AB], x, y1, z), l11 = grad3(P[BB], x1, y1, z);
    const m00 = grad3(P[AA + 1], x, y, z1),  m10 = grad3(P[BA + 1], x1, y, z1);
    const m01 = grad3(P[AB + 1], x, y1, z1), m11 = grad3(P[BB + 1], x1, y1, z1);
    const a0 = l00 + u * (l10 - l00), a1 = l01 + u * (l11 - l01);
    const b0 = m00 + u * (m10 - m00), b1 = m01 + u * (m11 - m01);
    const a = a0 + v * (a1 - a0), b = b0 + v * (b1 - b0);
    return a + w * (b - a);
  };
}

function fbm(nz, x, y, z, octaves) {
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * nz(x * f + o * 17.31, y * f - o * 9.73, z * f + o * 5.19);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

let NZ = null, nzSeedNow = null;

function ensureNoise() {
  const seed = settings.seed | 0;
  if (seed === nzSeedNow) return;
  nzSeedNow = seed;
  NZ = makePerlin3(seed * 7919 + 17);
}


////////////////////////////////////////////////////////////////////////////////////////
// The picture
//
// The scene is laid out in the picture's own millimetres — x across from 0 to F.w, y down
// from 0 to F.h — and painted on a raster `res` pixels to the millimetre, in greys from
// dark 0 to light 1. It goes on in the order light reaches the eye through fog:
//
//   1. the sky darkening upward from a bright band of fog at the horizon, and every
//      lamp's halo and beams added on as light; then all of it softened by `haze`,
//      because that is what fog does to light;
//   2. the embankment, the field and the snow, worked out pixel by pixel: each pixel of a
//      solid thing is its own grey mixed with the light already there by how deep in the
//      fog it stands — fog = 1 − e^(−4·density·depth) — so far things melt into the glow;
//   3. the thin things over that — posts, rails, poles, the door and the stairs, the road
//      and its rails, the trees, the weeds, the grass — each as opaque as it is near;
//   4. the lamps themselves, sharp, on top.
//
// The same geometry gives the edges of things as lines, each with the fog it stands in.

let PIC = null;              // { w, h, res, L } — the picture, w × h pixels
let LINES = [];              // { p: [x, y, …] in picture mm, fog }
let picKeyNow = '';
let CAN = null;
let PHOTO = null;            // { img, name, ver }
let photoVer = 0;

const PIC_KEYS = (() => {
  const k = Object.keys(DEFAULTS);
  return k.slice(k.indexOf('source'), k.indexOf('handrail') + 1);
})();

function PX(p) { return p / 100 * F.w; }
function PY(p) { return p / 100 * F.h; }

function fogOf(depth) { return 1 - Math.exp(-4 * settings.fog / 100 * Math.max(0, depth)); }

function grey(v) {
  const c = Math.round(clamp(v, 0, 1) * 255);
  return `rgb(${c},${c},${c})`;
}

function sstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

function readLum(ctx, w, h) {
  const d = ctx.getImageData(0, 0, w, h).data, L = new Float32Array(w * h);
  for (let i = 0; i < L.length; i++) L[i] = d[4 * i] / 255;
  return L;
}

function writeLum(ctx, L, w, h) {
  const img = ctx.createImageData(w, h), d = img.data;
  for (let i = 0; i < L.length; i++) {
    const v = L[i] <= 0 ? 0 : L[i] >= 1 ? 255 : Math.round(L[i] * 255);
    d[4 * i] = d[4 * i + 1] = d[4 * i + 2] = v;
    d[4 * i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

// Three passes of a box blur, which is near enough a gaussian.
function blurLum(L, w, h, r) {
  r = Math.round(r);
  if (r < 1) return;
  const tmp = new Float32Array(L.length);
  const pass = (src, dst, n, m, stride, step) => {
    for (let j = 0; j < m; j++) {
      const base = j * stride;
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += src[base + clamp(k, 0, n - 1) * step];
      for (let i = 0; i < n; i++) {
        dst[base + i * step] = acc / (2 * r + 1);
        acc += src[base + Math.min(n - 1, i + r + 1) * step] - src[base + Math.max(0, i - r) * step];
      }
    }
  };
  for (let p = 0; p < 3; p++) {
    pass(L, tmp, w, h, w, 1);
    pass(tmp, L, h, w, 1, w);
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// The embankment and the row of lamps along it
//
// The embankment runs across the picture. At its far end it is smaller by `embPersp`, and
// a point a fraction u of the way along it lands where perspective puts it: screen
// positions blend weighted by depth, x(u) = (x₀z₀(1−u) + x₁z₁u) / (z₀(1−u) + z₁u), and
// its scale is 1/z(u). So posts and lamps spaced evenly along it crowd together towards
// the far end as they should.

let EMB = null;

function makeEmbankment() {
  const s = settings;
  const persp = clamp(s.embPersp, 0, 95) / 100;
  const sFar = 1 - persp * 0.92;
  const s0 = s.embFar === 'left' ? sFar : 1, s1 = s.embFar === 'left' ? 1 : sFar;
  const x0 = -0.03 * F.w, x1 = 1.03 * F.w;
  const y0 = PY(s.embY), y1 = PY(s.embY2);
  const at = u => {
    const a = (1 - u) / s0, b = u / s1, d = a + b;
    return { x: (x0 * a + x1 * b) / d, y: (y0 * a + y1 * b) / d, s: 1 / d };
  };
  // x → u, by a table, since x(u) only ever grows
  const N = 2048, xs = new Float64Array(N + 1);
  for (let i = 0; i <= N; i++) xs[i] = at(i / N).x;
  const uOf = x => {
    if (x <= xs[0]) return 0;
    if (x >= xs[N]) return 1;
    let lo = 0, hi = N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m; }
    return (lo + (x - xs[lo]) / (xs[hi] - xs[lo])) / N;
  };
  const depth = u => s.embDepth / 100 + (1 - at(u).s) * 0.9;
  return { at, uOf, depth, on: s.embankment, wallH: PY(s.wallH), slopeH: PY(s.slopeH) };
}

// Where along the picture the lamps stand when there is no embankment: the horizon.
function rowAt(u) {
  if (EMB && EMB.on) return EMB.at(u);
  return { x: -0.03 * F.w + 1.06 * F.w * u, y: PY(settings.horizon), s: 1 };
}

function groundTop(x) {
  if (EMB && EMB.on) {
    const p = EMB.at(EMB.uOf(x));
    return p.y + EMB.slopeH * p.s;
  }
  return PY(settings.horizon);
}

let LAMPS = [];

function makeLamps() {
  const s = settings, out = [];
  const n = clamp(Math.round(s.lamps), 0, 60);
  const ph = PY(s.poleH);
  for (let k = 0; k < n; k++) {
    const u = (n === 1 ? s.lampStart : s.lampStart + (s.lampEnd - s.lampStart) * k / (n - 1)) / 100;
    const p = rowAt(clamp(u, 0, 1));
    const top = p.y - ph * p.s;
    let hx = p.x, hy = top;
    const arm = [];
    if (s.arms) {
      const dir = p.x < F.w / 2 ? 1 : -1, len = PY(2.2) * p.s;
      hx = p.x + dir * len; hy = top + len * 0.15;
      arm.push(p.x, top, p.x + dir * len * 0.7, top - len * 0.05, hx, hy);
    }
    const depth = EMB && EMB.on ? EMB.depth(clamp(u, 0, 1)) : s.embDepth / 100;
    const foot = EMB && EMB.on ? p.y - EMB.wallH * p.s : p.y;
    out.push({ x: hx, y: hy, s: p.s, b: s.lampBright / 100, pole: [p.x, foot, p.x, top], arm, depth });
  }
  const m = clamp(Math.round(s.farRow), 0, 60);
  for (let k = 0; k < m; k++) {
    const u = (k + 0.5) / m;
    const p = rowAt(u);
    const y = p.y - ph * p.s + PY(s.farDrop) * p.s;
    out.push({ x: p.x, y, s: p.s * 0.75, b: s.lampBright / 100 * s.farBright / 100, pole: null, arm: [],
               depth: (EMB && EMB.on ? EMB.depth(u) : s.embDepth / 100) + 0.2 });
  }
  return out;
}

////////////////////////////////////////////////////////////////////////////////////////
// Light

// A glow: exp(−(d/r)^p), the softer the lower p, as a radial gradient added on.
function glow(ctx, x, y, r, a, soft) {
  if (r <= 0 || a <= 0) return;
  const R = r * 2.4, p = 2.2 - 1.5 * clamp(soft, 0, 1);
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    g.addColorStop(t, `rgba(255,255,255,${clamp(a * Math.exp(-Math.pow(t * 2.4, p)), 0, 1)})`);
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, 2 * Math.PI);
  ctx.fill();
}

// A wedge of light from a lamp, brightest at the lamp and fading along its length, its
// edges softened by laying narrower wedges inside wider ones.
function beam(ctx, x, y, ang, spread, len, a) {
  if (len <= 0 || a <= 0) return;
  for (const f of [1, 0.72, 0.46, 0.22]) {
    const half = spread * f / 2;
    const g = ctx.createLinearGradient(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    g.addColorStop(0, `rgba(255,255,255,${clamp(a * 0.4, 0, 1)})`);
    g.addColorStop(0.45, `rgba(255,255,255,${clamp(a * 0.17, 0, 1)})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang - half) * len, y + Math.sin(ang - half) * len);
    ctx.lineTo(x + Math.cos(ang + half) * len, y + Math.sin(ang + half) * len);
    ctx.closePath();
    ctx.fill();
  }
}

function lampBeams(ctx, L) {
  const s = settings, sp = rad(s.beamSpread), len = PY(s.beamLen) * L.s, a = L.b * s.beamBright / 100;
  const left = Math.PI - sp / 2 - 0.05, right = sp / 2 + 0.05;
  if (s.beam === 'left' || s.beam === 'both') beam(ctx, L.x, L.y, left, sp, len, a);
  if (s.beam === 'right' || s.beam === 'both') beam(ctx, L.x, L.y, right, sp, len, a);
  if (s.beam === 'down') beam(ctx, L.x, L.y, Math.PI / 2, sp, len, a);
}

////////////////////////////////////////////////////////////////////////////////////////
// Trees, weeds, grass

// A tree as branches, each a short polyline with a width. A sapling is a leader rising
// nearly straight with side shoots angled up along it, shorter towards the top; a bare
// tree is a trunk forking again and again, each fork a little shorter and thinner and
// leaning back towards the vertical.
function growTree(x, y, H, kind, rnd, detail) {
  const out = [];
  const minLen = 1.1;
  const branch = (x0, y0, a, len, w, depth, up) => {
    const k = 3, p = [x0, y0];
    let cx = x0, cy = y0, aa = a;
    for (let j = 0; j < k; j++) {
      aa += (rnd() - 0.5) * 0.3;
      aa -= aa * 0.1 * up;
      cx += Math.sin(aa) * len / k; cy -= Math.cos(aa) * len / k;
      p.push(cx, cy);
    }
    out.push({ p, w });
    if (depth <= 0 || len * 0.7 < minLen) return;
    const forks = up > 1 ? 2 : rnd() < 0.3 ? 3 : 2;
    for (let f = 0; f < forks; f++) {
      const spread = up > 1 ? 0.2 + 0.25 * rnd() : 0.32 + 0.32 * rnd();
      const na = aa + (f - (forks - 1) / 2) * spread * 1.15 + (rnd() - 0.5) * 0.3;
      branch(cx, cy, na, len * (0.68 + 0.16 * rnd()), w * 0.66, depth - 1, up);
    }
  };
  if (kind === 'sapling') {
    const n = 14 + Math.floor(rnd() * 6), step = H / n, w0 = Math.max(0.25, H * 0.011);
    let px = x, py = y, ang = (rnd() - 0.5) * 0.1;
    const leader = [px, py];
    for (let i = 0; i < n; i++) {
      ang += (rnd() - 0.5) * 0.14 - ang * 0.25;
      px += Math.sin(ang) * step; py -= Math.cos(ang) * step;
      leader.push(px, py);
      const t = i / n;
      if (i > n * 0.15 && rnd() < 0.62) {
        const side = rnd() < 0.5 ? -1 : 1;
        const len = H * (0.26 * (1 - t) + 0.06) * (0.6 + 0.5 * rnd());
        branch(px, py, ang + side * (0.35 + 0.3 * rnd()), len, w0 * 0.45 * (1 - t * 0.7),
               detail >= 8 ? 2 : detail >= 4 ? 1 : 0, 1.6);
      }
    }
    out.push({ p: leader, w: w0 });
  } else {
    branch(x, y, (rnd() - 0.5) * 0.12, H * 0.32, Math.max(0.4, H * 0.035), detail, 0.7);
  }
  return out;
}

// A weed: a stalk bending over, and a head of seeds or a drooping leaf at its tip.
function growWeed(x, y, H, rnd) {
  const out = [];
  const bend = (rnd() - 0.5) * H * 1.2;
  const p = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    p.push(x + bend * t * t, y - H * t * (1 - 0.35 * Math.abs(bend) / H * t));
  }
  out.push({ p, w: 0.3 });
  const tx = p[32], ty = p[33];
  const dx = p[32] - p[30], dy = p[33] - p[31], dl = Math.hypot(dx, dy) || 1;
  const ux = dx / dl, uy = dy / dl, L = H * (0.05 + 0.04 * rnd()), Wd = L * 0.32;
  const pod = [];
  for (let i = 0; i <= 16; i++) {
    const a = 2 * Math.PI * i / 16, along = L * (0.5 - 0.5 * Math.cos(a)), across = Wd * Math.sin(a) * Math.sin(a / 2);
    pod.push(tx + ux * along - uy * across, ty + uy * along + ux * across);
  }
  out.push({ p: pod, w: 0.25 });
  return out;
}

////////////////////////////////////////////////////////////////////////////////////////
// The road
//
// Laid on the ground in front of the camera, which stands one unit high: a point X across
// and Z ahead is at x = w/2 + f·X/Z, y = horizon + f/Z. The road bends away as it goes.

let ROAD = null;

function makeRoad() {
  const s = settings;
  if (!s.road) return null;
  const yH = PY(s.horizon), f = F.h * 0.9;
  if (F.h - yH < 2) return null;
  const Zn = f / (F.h - yH) * 0.98, Zf = Zn * 14;
  const X = Z => s.roadX / 100 * 6 + s.roadCurve / 100 * 1.6 * Math.pow((Z - Zn) / Zn, 1.6);
  const proj = (x, Z, h) => [F.w / 2 + f * x / Z, yH + f * (1 - (h || 0)) / Z];
  const zs = [];
  for (let i = 0; i <= 80; i++) zs.push(Zn * Math.pow(Zf / Zn, i / 80));
  const depth = Z => (Z - Zn) / (Zf - Zn) * 0.9 + 0.05;
  return { Zn, Zf, X, proj, zs, depth, w: s.roadWidth };
}

////////////////////////////////////////////////////////////////////////////////////////
// Edges as lines

// solid: a thing that is drawn whole or not at all — a tree, a pole — rather than broken up
function addLine(p, fog, solid) {
  if (p && p.length >= 4) LINES.push({ p, fog, solid: !!solid });
}

// A line drawn with a width: as many strokes side by side as the nib needs to cover it.
function addWideLine(p, w, fog, solid) {
  const pw = penW(penIdx(settings.linesPen));
  const n = clamp(Math.round(w / (pw * 0.9)), 1, 6);
  if (n === 1) { addLine(p, fog, solid); return; }
  for (let k = 0; k < n; k++) {
    const o = (k - (n - 1) / 2) * (w - pw) / Math.max(1, n - 1);
    const q = [];
    for (let i = 0; i < p.length; i += 2) {
      const a = Math.max(0, i - 2), b = Math.min(p.length - 2, i + 2);
      let tx = p[b] - p[a], ty = p[b + 1] - p[a + 1];
      const l = Math.hypot(tx, ty) || 1;
      q.push(p[i] - ty / l * o, p[i + 1] + tx / l * o);
    }
    addLine(q, fog, solid);
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Painting it

function strokePoly(ctx, p, w, v, alpha) {
  if (alpha <= 0.01) return;
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.strokeStyle = grey(v);
  ctx.lineWidth = Math.max(0.08, w);
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function fillPoly(ctx, p, style, alpha) {
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.fillStyle = style;
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function ensurePicture() {
  const s = settings;
  const res = clamp(s.res, 1, 8);
  const key = JSON.stringify([PIC_KEYS.map(k => s[k]), F.w, F.h, res, s.linesPen, penW(penIdx(s.linesPen)),
                              s.source === 'photo' ? photoVer : 0]);
  if (key === picKeyNow && PIC) return;
  picKeyNow = key;
  const w = Math.max(2, Math.round(F.w * res)), h = Math.max(2, Math.round(F.h * res));
  if (!CAN) CAN = document.createElement('canvas');
  CAN.width = w; CAN.height = h;
  const ctx = CAN.getContext('2d', { willReadFrequently: true });
  LINES = [];
  if (s.source === 'photo' && PHOTO) {
    paintPhoto(ctx, w, h);
  } else {
    paintScene(ctx, w, h, res);
  }
  PIC = { w, h, res, L: readLum(ctx, w, h) };
  // grain, for the dither to have something to break on
  const g = s.grain / 100;
  if (g > 0) {
    const r = rng(97);
    for (let i = 0; i < PIC.L.length; i++) PIC.L[i] += (r() - 0.5) * g;
  }
}

function paintPhoto(ctx, w, h) {
  const img = PHOTO.img;
  const k = Math.max(w / img.width, h / img.height);
  const dw = img.width * k, dh = img.height * k;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.filter = 'grayscale(1)';
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  ctx.filter = 'none';
  // the filter is not everywhere, so take the luma by hand as well
  const img2 = ctx.getImageData(0, 0, w, h), d = img2.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img2, 0, 0);
}

function paintScene(ctx, w, h, res) {
  const s = settings;
  ensureNoise();
  EMB = makeEmbankment();
  LAMPS = makeLamps();
  ROAD = makeRoad();
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  // 1. sky and the band of fog, then the light
  const yH = PY(s.horizon), band = Math.max(0.5, PY(s.fogBand));
  const sky = ctx.createLinearGradient(0, 0, 0, F.h);
  const sk = s.skyDark / 100, fl = s.fogLight / 100;
  const stop = (y, v) => sky.addColorStop(clamp(y / F.h, 0, 1), grey(v));
  stop(0, sk);
  stop(Math.max(0, yH - band * 2.2), sk + (fl - sk) * 0.18);
  stop(Math.max(0, yH - band * 0.9), sk + (fl - sk) * 0.6);
  stop(yH, fl);
  stop(Math.min(F.h, yH + band * 0.8), fl * 0.7);
  stop(F.h, sk * 0.6);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, F.w, F.h);
  ctx.globalCompositeOperation = 'lighter';
  for (const L of LAMPS) {
    const fade = 1 - 0.5 * fogOf(L.depth);
    glow(ctx, L.x, L.y, PY(s.halo) * L.s * 1.8, L.b * 0.32 * fade, 0.9);
    glow(ctx, L.x, L.y, PY(s.halo) * L.s, L.b * 0.6 * fade, s.haloSoft / 100);
    glow(ctx, L.x, L.y, PY(s.halo) * L.s * 0.3, L.b * 0.55 * fade, 0.2);
    if (L.pole) lampBeams(ctx, L);
  }
  ctx.globalCompositeOperation = 'source-over';
  let Lm = readLum(ctx, w, h);
  if (s.mottle > 0) {
    const m = s.mottle / 100, sc = Math.max(0.2, s.mottleScale) / F.w;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const x = i / res, y = j / res;
        Lm[j * w + i] *= 1 + m * 1.6 * fbm(NZ, x * sc * 3, y * sc * 6, 0.3, 3);
      }
    }
  }
  blurLum(Lm, w, h, s.haze * res / 1.8);

  // 2. the embankment, the field, the snow — pixel by pixel
  paintGround(Lm, w, h, res);
  writeLum(ctx, Lm, w, h);

  // 3. the thin things
  paintThings(ctx);

  // 4. the lamps themselves
  ctx.globalCompositeOperation = 'lighter';
  for (const L of LAMPS) glow(ctx, L.x, L.y, PY(0.55) * L.s, L.b * (1 - 0.6 * fogOf(L.depth)), 0.1);
  ctx.globalCompositeOperation = 'source-over';
}

function paintGround(Lm, w, h, res) {
  const s = settings, E = EMB && EMB.on ? EMB : null;
  const yH = PY(s.horizon);
  const strip = PY(s.stripH), lit = s.litStrip / 100;
  const gL = s.groundLight / 100, gF = s.groundFar / 100;
  const snow = s.snow / 100, snowL = s.snowLight / 100, sc = Math.max(0.3, s.snowScale) * 8;
  for (let i = 0; i < w; i++) {
    const x = (i + 0.5) / res;
    let yWall = Infinity, yRoad = Infinity, yBase = yH, fe = 0, ps = 1;
    if (E) {
      const u = E.uOf(x), p = E.at(u);
      ps = p.s;
      yRoad = p.y; yWall = p.y - E.wallH * p.s; yBase = p.y + E.slopeH * p.s;
      fe = fogOf(E.depth(u));
    }
    const span = Math.max(1, F.h - yBase);
    for (let j = 0; j < h; j++) {
      const y = (j + 0.5) / res, k = j * w + i;
      if (y >= yWall && y < yRoad) {
        const t = (y - yWall) / Math.max(0.01, yRoad - yWall);
        const tone = s.wallLight / 100 * (1.25 - 0.45 * t);
        Lm[k] = Lm[k] * fe + tone * (1 - fe);
      } else if (y >= yRoad && y < yBase) {
        let tone = s.slopeLight / 100 * (0.75 + 0.5 * (0.5 + fbm(NZ, x * 0.25, y * 0.6, 2.1, 2)));
        if (lit > 0 && y > yBase - strip * ps) {
          const frost = 0.5 + fbm(NZ, x * 0.9, y * 2.5, 4.4, 2);
          tone = Math.max(tone, lit * (0.7 + 0.6 * frost) * sstep(yBase - strip * ps, yBase - strip * ps * 0.6, y));
        }
        Lm[k] = Lm[k] * fe + tone * (1 - fe);
      } else if (y >= yBase) {
        const t = (y - yBase) / span;
        let tone = gF + (gL - gF) * Math.pow(t, 0.55);
        tone *= 0.85 + 0.3 * (0.5 + fbm(NZ, x * 0.12, y * 0.3, 6.6, 2));
        if (snow > 0) {
          const k2 = sc * (0.12 + 0.9 * t);
          const n = 0.5 + 1.2 * fbm(NZ, x / k2, y * 3.2 / k2, 8.8, 5);
          const m = sstep(1 - snow - 0.03, 1 - snow + 0.03, n) * sstep(0, 0.1, t);
          tone = tone * (1 - m) + snowL * (0.85 + 0.15 * (0.5 + fbm(NZ, x, y * 2, 9.9, 1))) * m;
        }
        const fg = fogOf((1 - t) * 0.45);
        Lm[k] = Lm[k] * fg + tone * (1 - fg);
      }
    }
  }
}

function paintThings(ctx) {
  const s = settings, E = EMB && EMB.on ? EMB : null;
  const rnd = rng(31);

  // the wall's posts and rails, and its edges
  if (E) {
    const N = 48;
    const edge = (f, fogAdd) => {
      for (let c = 0; c < N; c++) {
        const p = [];
        for (let i = 0; i <= 4; i++) {
          const u = (c + i / 4) / N, q = E.at(u);
          p.push(q.x, f(q));
        }
        addLine(p, fogOf(E.depth((c + 0.5) / N)) + (fogAdd || 0));
      }
    };
    if (E.wallH > 0.05) edge(q => q.y - E.wallH * q.s);
    edge(q => q.y);
    if (E.slopeH > 0.05) edge(q => q.y + E.slopeH * q.s);
    if (s.panelW > 0 && E.wallH > 0.5) {
      // posts spaced so the nearest panel is panelW of the width across
      const un = s.embFar === 'left' ? 1 : 0, d = 1e-3;
      const dx = Math.abs(E.at(un).x - E.at(un + (un ? -d : d)).x) / d;
      const M = clamp(Math.round(dx / PX(s.panelW)), 1, 400);
      for (let j = 0; j <= M; j++) {
        const u = j / M, q = E.at(u), fo = fogOf(E.depth(u));
        const p = [q.x, q.y - E.wallH * q.s, q.x, q.y];
        strokePoly(ctx, p, 0.6 * q.s, s.wallLight / 100 + 0.12, 1 - fo);
        addLine(p, fo);
      }
      const R = clamp(Math.round(s.rails), 0, 8);
      for (let r = 1; r <= R; r++) {
        const f = r / (R + 1);
        for (let c = 0; c < N; c++) {
          const p = [];
          for (let i = 0; i <= 4; i++) {
            const u = (c + i / 4) / N, q = E.at(u);
            p.push(q.x, q.y - E.wallH * q.s * (1 - f));
          }
          const fo = fogOf(E.depth((c + 0.5) / N));
          strokePoly(ctx, p, 0.45 * E.at((c + 0.5) / N).s, s.wallLight / 100 * 0.6, 1 - fo);
          addLine(p, fo);
        }
      }
    }
  }

  // the door in the wall and the stairs up to it
  if (s.stairs && E) {
    const u = clamp(s.stairsX / 100, 0, 1), q = E.at(u), fo = fogOf(E.depth(u));
    const dw = PX(s.doorW) * q.s, dh = PY(s.doorH) * q.s;
    const x0 = q.x - dw / 2, x1 = q.x + dw / 2, yb = q.y, yt = q.y - dh;
    fillPoly(ctx, [x0, yt, x1, yt, x1, yb, x0, yb], grey(0.08), 1 - fo);
    const n = clamp(Math.round(s.panes), 1, 6), fr = dw * 0.07;
    for (let k = 0; k < n; k++) {
      const a = yt + fr + (dh - fr) * k / n, b = yt + (dh - fr) * (k + 1) / n;
      const pane = [x0 + fr, a, x1 - fr, a, x1 - fr, b, x0 + fr, b];
      fillPoly(ctx, pane, grey(s.doorLight / 100), 1 - fo * 0.6);
      addLine(pane.concat(pane[0], pane[1]), fo);
    }
    addLine([x0, yb, x0, yt, x1, yt, x1, yb], fo);
    // the stairs, widening a little as they come down the mound
    const ybase = q.y + E.slopeH * q.s, m = clamp(Math.round(s.steps), 2, 40);
    const half = k => dw / 2 * (1 + 0.18 * k / m);
    const body = [q.x - half(0), yb, q.x + half(0), yb, q.x + half(m), ybase, q.x - half(m), ybase];
    fillPoly(ctx, body, grey(0.1), 1 - fo);
    for (let k = 0; k <= m; k++) {
      const y = yb + (ybase - yb) * k / m;
      const p = [q.x - half(k), y, q.x + half(k), y];
      strokePoly(ctx, p, 0.35, 0.3, 1 - fo);
      addLine(p, fo);
    }
    addLine([q.x - half(0), yb, q.x - half(m), ybase], fo);
    addLine([q.x + half(0), yb, q.x + half(m), ybase], fo);
    if (s.handrail) {
      const lift = PY(5) * q.s, off = dw * 0.15;
      const top = [q.x - half(0) - off * 0.4, yb - lift], bot = [q.x - half(m) - off, ybase - lift * 0.9];
      const rail = [top[0], top[1] - lift * 0.15, top[0], top[1], bot[0], bot[1], bot[0], bot[1] + lift * 0.9];
      strokePoly(ctx, rail, 0.5, 0.6, 1 - fo);
      addLine(rail, fo);
      for (const t of [0.33, 0.66]) {
        const px = top[0] + (bot[0] - top[0]) * t, py = top[1] + (bot[1] - top[1]) * t;
        const p = [px, py, px, py + lift * 0.95];
        strokePoly(ctx, p, 0.35, 0.5, 1 - fo);
        addLine(p, fo);
      }
    }
  }

  // the poles of the lamps
  for (const L of LAMPS) {
    if (!L.pole) continue;
    const fo = fogOf(L.depth);
    strokePoly(ctx, L.pole, 0.6 * L.s, 0.07, 1 - fo);
    if (fo < 0.35) addWideLine(L.pole, 0.6 * L.s, fo, true); else addLine(L.pole, fo, true);
    if (L.arm.length) { strokePoly(ctx, L.arm, 0.5 * L.s, 0.07, 1 - fo); addLine(L.arm, fo, true); }
  }

  // the road: its surface fading into the fog, the lamps in it, the rails along it
  if (ROAD) paintRoad(ctx);

  // the trees and the weeds
  const nt = clamp(Math.round(s.trees), 0, 40);
  for (let t = 0; t < nt; t++) {
    const kind = s.treeKind === 'mixed' ? (rnd() < 0.5 ? 'sapling' : 'bare') : s.treeKind === 'bare' ? 'bare' : 'sapling';
    const x = nt === 1 ? PX(s.treeX) : PX(s.treeX + s.treeSpread * (t / (nt - 1) - 0.5)) + (rnd() - 0.5) * PX(4);
    const y = PY(s.treeBase) + (rnd() - 0.5) * PY(3);
    const H = PY(s.treeH) * (nt === 1 ? 1 : 0.6 + 0.55 * rnd());
    const depth = s.treeDepth / 100 * (0.8 + 0.4 * rnd());
    const fo = fogOf(depth);
    for (const b of growTree(x, y, H, kind, rnd, clamp(Math.round(s.treeDetail), 1, 10))) {
      strokePoly(ctx, b.p, b.w, 0.04, 1 - fo);
      addWideLine(b.p, b.w, fo, true);
    }
  }
  const nw = clamp(Math.round(s.weeds), 0, 60);
  for (let k = 0; k < nw; k++) {
    const x = PX(5 + 90 * rnd()), y = Math.max(groundTop(x) + PY(1), PY(s.treeBase) + PY(4) + rnd() * PY(8));
    for (const b of growWeed(x, y, PY(s.weedH) * (0.5 + 0.7 * rnd()), rnd)) {
      strokePoly(ctx, b.p, b.w, 0.03, 1);
      addLine(b.p, 0, true);
    }
  }

  // blades of grass along the edge of the field
  const ng = Math.round(clamp(s.grass, 0, 100) / 100 * F.w * 0.9);
  for (let k = 0; k < ng; k++) {
    const x = rnd() * F.w, y = groundTop(x) + PY(0.4) + rnd() * PY(2.5);
    const hgt = PY(0.8 + 5 * Math.pow(rnd(), 3)), lean = (rnd() - 0.5) * 0.9;
    const p = [x, y, x + Math.sin(lean) * hgt * 0.5, y - hgt * 0.55, x + Math.sin(lean) * hgt, y - hgt];
    strokePoly(ctx, p, 0.12, 0.03, 1);
    if (s.lineGrass) addLine(p, 0);
  }
}

function paintRoad(ctx) {
  const s = settings, R = ROAD;
  const L = [], Rr = [];
  for (const Z of R.zs) {
    L.push(R.proj(R.X(Z) - R.w / 2, Z)); Rr.push(R.proj(R.X(Z) + R.w / 2, Z));
  }
  const poly = [];
  for (const p of L) poly.push(p[0], p[1]);
  for (let i = Rr.length - 1; i >= 0; i--) poly.push(Rr[i][0], Rr[i][1]);
  const yNear = L[0][1], yFar = L[L.length - 1][1];
  const g = ctx.createLinearGradient(0, yNear, 0, yFar);
  g.addColorStop(0, grey(s.roadLight / 100));
  g.addColorStop(1, 'rgba(128,128,128,0)');
  fillPoly(ctx, poly, g, 1);
  // the lamps in the wet road: streaks under each, clipped to the road
  if (s.wet > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(poly[0], poly[1]);
    for (let i = 2; i < poly.length; i += 2) ctx.lineTo(poly[i], poly[i + 1]);
    ctx.closePath();
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    for (const Lp of LAMPS) {
      const wd = PY(1.4) * Lp.s, a = s.wet / 100 * Lp.b * 0.22;
      const y0 = Math.max(yFar, Lp.y), len = (yNear - y0) * 0.55;
      for (const f of [1, 0.6, 0.3]) {
        const sg = ctx.createLinearGradient(0, y0, 0, y0 + len * f);
        sg.addColorStop(0, `rgba(255,255,255,${a})`);
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(Lp.x - wd * f, y0, wd * 2 * f, len * f);
      }
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }
  // its edges, in pieces each with its own fog
  for (const side of [L, Rr]) {
    for (let i = 0; i + 4 < side.length; i += 4) {
      const p = [];
      for (let j = i; j <= i + 4; j++) p.push(side[j][0], side[j][1]);
      addLine(p, fogOf(R.depth(R.zs[i + 2])));
    }
  }
  // guard rails: a rail on posts along either edge
  const sides = s.guardrails === 'both' ? [-1, 1] : s.guardrails === 'left' ? [-1] : s.guardrails === 'right' ? [1] : [];
  const hr = 0.38, step = Math.max(0.3, s.railPosts);
  for (const sd of sides) {
    const off = sd * (R.w / 2 + 0.25);
    for (let i = 0; i + 4 < R.zs.length; i += 4) {
      const p = [];
      for (let j = i; j <= i + 4; j++) { const q = R.proj(R.X(R.zs[j]) + off, R.zs[j], hr); p.push(q[0], q[1]); }
      const fo = fogOf(R.depth(R.zs[i + 2]));
      strokePoly(ctx, p, Math.min(0.9, 6 / R.zs[i + 2] * R.Zn / 6), 0.08, 1 - fo);
      addLine(p, fo);
    }
    for (let Z = R.Zn * 1.02; Z < R.Zf; Z += step) {
      const a = R.proj(R.X(Z) + off, Z, 0), b = R.proj(R.X(Z) + off, Z, hr);
      const fo = fogOf(R.depth(Z));
      const p = [a[0], a[1], b[0], b[1]];
      strokePoly(ctx, p, Math.min(0.8, 5 * R.Zn / Z * 0.2), 0.08, 1 - fo);
      addLine(p, fo);
    }
  }
}

function loadPhotoFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    PHOTO = { img, name: file.name, ver: ++photoVer };
    settings.source = 'photo';
    if (setters.source) setters.source('photo');
    if (photoNote) photoNote.html(file.name + ' — not part of the link; load it again to rebuild the sheet.');
    update();
  };
  img.src = url;
}


////////////////////////////////////////////////////////////////////////////////////////
// The sink
//
// Everything is drawn into one sink as polylines in millimetres, each tagged with the pen
// and the layer it belongs to, clipped to that pen's own drawable box as it goes in.

let SINK = null;
let PEN = 0, LAY = 0, PW = 0.3;
let AREAS = [];

function makeSink() {
  return { pts: [], off: [0], ink: [], lay: [] };
}

function setPen(i) { PEN = i; PW = penW(i); }

const CLIP_OUT = new Float64Array(4);

function clipSeg(A, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  let t0 = 0, t1 = 1;
  for (let e = 0; e < 4; e++) {
    const p = e === 0 ? -dx : e === 1 ? dx : e === 2 ? -dy : dy;
    const q = e === 0 ? x0 - A.x0 : e === 1 ? A.x1 - x0 : e === 2 ? y0 - A.y0 : A.y1 - y0;
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else       { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  CLIP_OUT[0] = x0 + t0 * dx; CLIP_OUT[1] = y0 + t0 * dy;
  CLIP_OUT[2] = x0 + t1 * dx; CLIP_OUT[3] = y0 + t1 * dy;
  return true;
}

function pushRun(xs, ys) {
  const S = SINK, n = xs.length;
  if (n < 2) return;
  for (let i = 0; i < n; i++) S.pts.push(xs[i], ys[i]);
  S.off.push(S.pts.length / 2);
  S.ink.push(PEN);
  S.lay.push(LAY);
}

function emit(xs, ys) {
  const n = xs.length;
  if (n < 2 || SINK.ink.length > MAX_STROKES) return;
  const A = AREAS[LAY === L_BORDER ? 2 : PEN];
  if (A.w <= 0 || A.h <= 0) return;
  let allIn = true;
  for (let i = 0; i < n; i++) {
    if (xs[i] < A.x0 || xs[i] > A.x1 || ys[i] < A.y0 || ys[i] > A.y1) { allIn = false; break; }
  }
  if (allIn) { pushRun(xs, ys); return; }
  let rx = null, ry = null;
  const flush = () => { if (rx && rx.length >= 2) pushRun(rx, ry); rx = ry = null; };
  for (let i = 0; i + 1 < n; i++) {
    if (!clipSeg(A, xs[i], ys[i], xs[i + 1], ys[i + 1])) { flush(); continue; }
    const ax = CLIP_OUT[0], ay = CLIP_OUT[1], bx = CLIP_OUT[2], by = CLIP_OUT[3];
    if (rx && Math.abs(rx[rx.length - 1] - ax) < 1e-9 && Math.abs(ry[ry.length - 1] - ay) < 1e-9) {
      rx.push(bx); ry.push(by);
    } else {
      flush();
      rx = [ax, bx]; ry = [ay, by];
    }
  }
  flush();
}

// A polyline in picture millimetres, onto the sheet.
function emitPic(p) {
  const xs = [], ys = [];
  for (let i = 0; i < p.length; i += 2) { xs.push(F.x0 + p[i]); ys.push(F.y0 + p[i + 1]); }
  emit(xs, ys);
}

////////////////////////////////////////////////////////////////////////////////////////
// Level lines
//
// Marching squares over a grid of values, the crossings named by the edge of the grid
// they lie on, so the pieces from two cells meet at exactly the same point and can be
// strung into long lines. Saddles are split by the value in the middle of the cell.

function contour(Fv, nx, ny, x0, y0, dx, dy, level) {
  const segs = [];
  const val = (i, j) => Fv[j * nx + i];
  const ptOn = id => {
    const h = id & 1, k = id >> 1, i = k % nx, j = (k / nx) | 0;
    if (h === 0) {
      const a = val(i, j), b = val(i + 1, j), t = (level - a) / (b - a);
      return [x0 + (i + t) * dx, y0 + j * dy];
    }
    const a = val(i, j), b = val(i, j + 1), t = (level - a) / (b - a);
    return [x0 + i * dx, y0 + (j + t) * dy];
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = val(i, j), b = val(i + 1, j), c = val(i + 1, j + 1), d = val(i, j + 1);
      const code = (a > level ? 1 : 0) | (b > level ? 2 : 0) | (c > level ? 4 : 0) | (d > level ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const eB = 2 * (j * nx + i), eT = 2 * ((j + 1) * nx + i);
      const eL = 2 * (j * nx + i) + 1, eR = 2 * (j * nx + i + 1) + 1;
      const add = (p, q) => segs.push(p, q);
      switch (code) {
        case 1: case 14: add(eB, eL); break;
        case 2: case 13: add(eB, eR); break;
        case 3: case 12: add(eL, eR); break;
        case 4: case 11: add(eR, eT); break;
        case 6: case 9:  add(eB, eT); break;
        case 7: case 8:  add(eL, eT); break;
        case 5: case 10: {
          const mid = (a + b + c + d) / 4 > level;
          if ((code === 5) === mid) { add(eB, eR); add(eL, eT); }
          else { add(eB, eL); add(eR, eT); }
          break;
        }
      }
    }
  }
  const at = new Map();
  for (let s = 0; s < segs.length; s += 2) {
    for (const e of [segs[s], segs[s + 1]]) {
      const l = at.get(e);
      if (l) l.push(s); else at.set(e, [s]);
    }
  }
  const used = new Uint8Array(segs.length >> 1);
  const lines = [];
  for (let s = 0; s < segs.length; s += 2) {
    if (used[s >> 1]) continue;
    used[s >> 1] = 1;
    const chain = [segs[s], segs[s + 1]];
    for (const dir of [1, 0]) {
      while (true) {
        const end = dir ? chain[chain.length - 1] : chain[0];
        const l = at.get(end);
        let next = -1;
        if (l) for (const t of l) if (!used[t >> 1]) { next = t; break; }
        if (next < 0) break;
        used[next >> 1] = 1;
        const other = segs[next] === end ? segs[next + 1] : segs[next];
        if (dir) chain.push(other); else chain.unshift(other);
      }
    }
    const p = [];
    for (const e of chain) { const [x, y] = ptOn(e); p.push(x, y); }
    lines.push(p);
  }
  return lines;
}

////////////////////////////////////////////////////////////////////////////////////////
// From light to ink
//
// The picture's light goes through brightness, contrast and gamma, and what comes out is
// darkness — the share of the paper that wants ink — or, drawing the light on black
// paper, the light itself. Anything below `whiteCut` is left bare, so the halos round the
// lamps stay clean paper.

let DEN = null;              // ink wanted, 0 … 1, on the picture's raster
let meanInk = 0;

function makeDensity() {
  const s = settings, P = PIC, n = P.L.length;
  DEN = new Float32Array(n);
  const g = Math.max(0.1, s.gamma / 100), c = 1 + s.contrast / 100, b = s.brightness / 100;
  const cut = s.whiteCut / 100;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    let v = clamp(P.L[i], 0, 1);
    v = Math.pow(v, 1 / g);
    v = clamp(0.5 + (v - 0.5) * c + b, 0, 1);
    let d = s.invert ? v : 1 - v;
    if (d < cut) d = 0;
    DEN[i] = d;
    sum += d;
  }
  meanInk = sum / n;
}

// Ink wanted at a point of the picture, in its millimetres, read between pixels.
function den(x, y) {
  const P = PIC, fx = x * P.res - 0.5, fy = y * P.res - 0.5;
  const i = clamp(Math.floor(fx), 0, P.w - 2), j = clamp(Math.floor(fy), 0, P.h - 2);
  const tx = clamp(fx - i, 0, 1), ty = clamp(fy - j, 0, 1), k = j * P.w + i;
  const a = DEN[k], b = DEN[k + 1], c = DEN[k + P.w], d = DEN[k + P.w + 1];
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}

// The lines of a family across the picture: direction (c, s), a line every `gap`, each
// handed to `fn(k, x0, y0, len)` from where it enters the picture to where it leaves.
function family(ang, gap, fn) {
  const c = Math.cos(ang), s = Math.sin(ang), nx = -s, ny = c;
  const corners = [[0, 0], [F.w, 0], [0, F.h], [F.w, F.h]];
  let lo = Infinity, hi = -Infinity;
  for (const [x, y] of corners) { const o = x * nx + y * ny; lo = Math.min(lo, o); hi = Math.max(hi, o); }
  const A = { x0: 0, y0: 0, x1: F.w, y1: F.h };
  const k0 = Math.ceil(lo / gap), k1 = Math.floor(hi / gap);
  const far = F.w + F.h;
  for (let k = k0; k <= k1; k++) {
    const o = k * gap, px = nx * o, py = ny * o;
    if (!clipSeg(A, px - c * far, py - s * far, px + c * far, py + s * far)) continue;
    const x0 = CLIP_OUT[0], y0 = CLIP_OUT[1];
    const len = Math.hypot(CLIP_OUT[2] - x0, CLIP_OUT[3] - y0);
    fn(k, x0, y0, len, c, s, nx, ny);
  }
}

// The threshold of the k-th line in an ordered dither of n levels: the bits of k mod n
// reversed, so the lines come in as 0, ½, ¼, ¾, ⅛ … and any stretch of them is evenly
// spread.
function ditherT(k, n) {
  const bits = Math.round(Math.log2(n));
  let m = ((k % n) + n) % n, r = 0;
  for (let b = 0; b < bits; b++) { r = (r << 1) | (m & 1); m >>= 1; }
  return (r + 0.5) / n;
}

// Along one line, the stretches darker than t, each pinned where it crosses t.
function darkRuns(x0, y0, len, c, s, nx, ny, t, wob, salt) {
  const step = Math.min(0.25, settings.spacing / 2);
  const minLen = Math.max(0, settings.minDash);
  let run = null, prev = 0, pt = 0;
  const at = d => {
    let x = x0 + c * d, y = y0 + s * d;
    if (wob) { const o = wob * NZ(d * 0.35, salt * 0.731, 3.3); x += nx * o; y += ny * o; }
    return [x, y];
  };
  const out = [];
  const close = d => {
    if (run && d - run.start >= minLen) out.push(run.p);
    run = null;
  };
  for (let d = 0; d <= len + 1e-9; d += step) {
    const [x, y] = at(d);
    const v = den(x0 + c * d, y0 + s * d);
    if (v > t) {
      if (!run) {
        const f = d > 0 ? clamp((t - prev) / (v - prev), 0, 1) : 0;
        const dd = d > 0 ? pt + (d - pt) * f : d;
        const [ax, ay] = at(dd);
        run = { start: dd, p: [ax, ay] };
      }
      run.p.push(x, y);
    } else if (run) {
      const f = clamp((prev - t) / (prev - v), 0, 1), dd = pt + (d - pt) * f;
      const [ax, ay] = at(dd);
      run.p.push(ax, ay);
      close(dd);
    }
    prev = v; pt = d;
  }
  if (run) close(len);
  return out;
}

function toneLineDither() {
  const s = settings, n = Math.pow(2, clamp(Math.round(Math.log2(Math.max(2, s.levels))), 1, 5));
  const gap = Math.max(0.05, s.spacing);
  let lines = 0;
  family(rad(s.angle), gap, (k, x0, y0, len, c, sn, nx, ny) => {
    const t = ditherT(k, n);
    for (const p of darkRuns(x0, y0, len, c, sn, nx, ny, t, s.wobble, k)) { emitPic(p); lines++; }
  });
  return lines;
}

function toneCrosshatch() {
  const s = settings, K = clamp(Math.round(s.hatchDirs), 1, 4);
  const gap = Math.max(0.1, s.hatchGap);
  for (let j = 0; j < K; j++) {
    const ang = rad(s.angle) + j * Math.PI / K + (j % 2 ? 0 : 0);
    const t = (j + 0.5) / (K + 0.5);
    family(ang, gap, (k, x0, y0, len, c, sn, nx, ny) => {
      for (const p of darkRuns(x0, y0, len, c, sn, nx, ny, t * 0.92, s.wobble, k + j * 1000)) emitPic(p);
    });
  }
}

// A wave along every line, its height the darkness and its pace quickening with it, so
// the fog is a calm line and the night a tight scribble. Where there is no ink wanted
// the pen lifts.
function toneSquiggle() {
  const s = settings, gap = Math.max(0.2, s.squiggleGap);
  const fmax = Math.max(0.05, s.squiggleFreq);
  const step = Math.min(0.2, 1 / (fmax * 10));
  family(rad(s.angle), gap, (k, x0, y0, len, c, sn, nx, ny) => {
    let ph = 0, run = null;
    const flush = () => { if (run && run.length >= 4) emitPic(run); run = null; };
    for (let d = 0; d <= len + 1e-9; d += step) {
      const x = x0 + c * d, y = y0 + sn * d, v = den(x, y);
      ph += 2 * Math.PI * fmax * (0.25 + 0.75 * v) * step;
      if (v <= 0.002) { flush(); continue; }
      const a = v * gap * 0.46 * Math.sin(ph);
      if (!run) run = [];
      run.push(x + nx * a, y + ny * a);
    }
    flush();
  });
}

// Dots thrown at random and kept as often as the ink wanted there, never closer than the
// gap to one already kept.
function toneStipple() {
  const s = settings, gap = Math.max(0.1, s.stippleGap), most = clamp(Math.round(s.stippleMax), 100, 400000);
  const rnd = rng(71);
  const cell = gap, gw = Math.ceil(F.w / cell) + 1, gh = Math.ceil(F.h / cell) + 1;
  const grid = new Int32Array(gw * gh).fill(-1);
  const xs = [], ys = [];
  const tries = Math.min(4e6, Math.round(F.w * F.h / (gap * gap) * 6));
  for (let t = 0; t < tries && xs.length < most; t++) {
    const x = rnd() * F.w, y = rnd() * F.h;
    if (rnd() > den(x, y)) continue;
    const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
    let ok = true;
    for (let j = Math.max(0, gy - 1); j <= Math.min(gh - 1, gy + 1) && ok; j++) {
      for (let i = Math.max(0, gx - 1); i <= Math.min(gw - 1, gx + 1); i++) {
        const q = grid[j * gw + i];
        if (q >= 0 && (xs[q] - x) ** 2 + (ys[q] - y) ** 2 < gap * gap) { ok = false; break; }
      }
    }
    if (!ok || grid[gy * gw + gx] >= 0) continue;
    grid[gy * gw + gx] = xs.length;
    xs.push(x); ys.push(y);
  }
  for (let i = 0; i < xs.length; i++) emitPic([xs[i], ys[i], xs[i] + EPS, ys[i]]);
  return xs.length;
}

// Isophotes: the lines of equal ink, a ring round every lamp at every level.
function toneContours(levels) {
  const P = PIC, k = Math.max(1, Math.ceil(P.w / 700));
  const nx = Math.floor(P.w / k), ny = Math.floor(P.h / k);
  const G = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      let acc = 0;
      for (let b = 0; b < k; b++) for (let a = 0; a < k; a++) acc += DEN[(j * k + b) * P.w + i * k + a];
      G[j * nx + i] = acc / (k * k);
    }
  }
  const d = k / P.res;
  const L = clamp(Math.round(levels), 1, 80);
  for (let l = 1; l <= L; l++) {
    for (const p of contour(G, nx, ny, d / 2, d / 2, d, d, l / (L + 1))) emitPic(p);
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// The edges of things
//
// Drawn as they are, near; further off broken into dashes, the gaps growing with the fog
// they stand in, and past a point not drawn at all.

function emitLines() {
  const s = settings;
  if (!s.lines || s.source === 'photo') return 0;
  const dash = 2.2;
  let n = 0;
  for (const ln of LINES) {
    const fo = clamp(ln.fog, 0, 1);
    if (fo > 0.82) continue;
    if (!s.lineFog || fo < 0.35 || ln.solid) { emitPic(ln.p); n++; continue; }
    // walk the line, pen down for `dash`, up for a gap that grows with the fog
    const gapL = dash * (fo - 0.35) / (0.87 - fo) * 1.6;
    let down = true, left = dash, cur = [ln.p[0], ln.p[1]];
    for (let i = 2; i < ln.p.length; i += 2) {
      let ax = ln.p[i - 2], ay = ln.p[i - 1];
      const bx = ln.p[i], by = ln.p[i + 1];
      let seg = Math.hypot(bx - ax, by - ay);
      while (seg > 1e-9) {
        const t = Math.min(seg, left), f = t / seg;
        const mx = ax + (bx - ax) * f, my = ay + (by - ay) * f;
        if (down) cur.push(mx, my);
        seg -= t; left -= t; ax = mx; ay = my;
        if (left <= 1e-9) {
          if (down) { if (cur.length >= 4) { emitPic(cur); n++; } cur = null; }
          down = !down;
          left = down ? dash : gapL;
          if (down) cur = [ax, ay];
        }
      }
    }
    if (down && cur && cur.length >= 4) { emitPic(cur); n++; }
  }
  return n;
}

////////////////////////////////////////////////////////////////////////////////////////
// Everything, in order

function buildShapes() {
  const s = settings;
  makeFrame();
  if (F.w < 2 || F.h < 2) return null;
  ensureNoise();
  ensurePicture();
  makeDensity();
  SINK = makeSink();
  AREAS = [penArea(0), penArea(1), borderArea(penIdx(s.borderPen))];

  LAY = L_TONE;
  setPen(layerPen(L_TONE));
  let dots = 0;
  switch (s.technique) {
    case 'line dither': toneLineDither(); break;
    case 'squiggle':    toneSquiggle(); break;
    case 'crosshatch':  toneCrosshatch(); break;
    case 'stipple':     dots = toneStipple(); break;
    case 'contours':    toneContours(s.contourLevels); break;
    default: break;
  }
  if (s.contoursToo && s.technique !== 'contours') toneContours(s.contourLevels);

  LAY = L_LINES;
  setPen(layerPen(L_LINES));
  const edges = emitLines();

  if (s.border) {
    LAY = L_BORDER;
    setPen(layerPen(L_BORDER));
    const x0 = F.x0, y0 = F.y0, x1 = F.x0 + F.w, y1 = F.y0 + F.h;
    emit([x0, x1, x1, x0, x0], [y0, y0, y1, y1, y0]);
  }

  counts = { dots, edges, ink: meanInk };
  const S = SINK;
  perPen = [];
  for (let i = 0; i < SLOTS; i++) perPen.push({ strokes: 0, ink: 0 });
  perLayer = LAYERS.map(() => ({ strokes: 0, ink: 0, pens: new Set() }));
  for (let i = 0; i < S.ink.length; i++) {
    perPen[S.ink[i]].strokes++;
    perLayer[S.lay[i]].strokes++;
    perLayer[S.lay[i]].pens.add(S.ink[i]);
  }
  return {
    pts: Float64Array.from(S.pts),
    off: Int32Array.from(S.off),
    ink: Int32Array.from(S.ink),
    lay: Int32Array.from(S.lay),
  };
}


////////////////////////////////////////////////////////////////////////////////////////
// Stroke order
//
// Greedy nearest-neighbour over stroke endpoints, either end allowed as the entry point,
// with a uniform bucket grid so the search stays local; one pen at a time, in the order
// the passes go down. vpype's linesort would redo it regardless, so it is here to make
// the estimate honest and the preview readable.

function greedy(sh, ids, startX, startY) {
  const { pts, off } = sh;
  const n = ids.length;
  const order = new Int32Array(n);
  const flip  = new Uint8Array(n);
  if (!n) return { order, flip, px: startX, py: startY };

  const N  = 2 * n;
  const ex = new Float64Array(N);
  const ey = new Float64Array(N);
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (let i = 0; i < n; i++) {
    const g = ids[i];
    const a = off[g] * 2, b = (off[g + 1] - 1) * 2;
    ex[i * 2] = pts[a];         ey[i * 2] = pts[a + 1];
    ex[i * 2 + 1] = pts[b];     ey[i * 2 + 1] = pts[b + 1];
  }
  for (let e = 0; e < N; e++) {
    if (ex[e] < minx) minx = ex[e];
    if (ex[e] > maxx) maxx = ex[e];
    if (ey[e] < miny) miny = ey[e];
    if (ey[e] > maxy) maxy = ey[e];
  }
  const w = Math.max(maxx - minx, 1e-6), h = Math.max(maxy - miny, 1e-6);
  const cell = Math.max(1e-3, Math.sqrt(w * h / N) * 1.5, Math.max(w, h) / 1024);
  const gw = Math.floor(w / cell) + 1, gh = Math.floor(h / cell) + 1, nb = gw * gh;
  const eb = new Int32Array(N);
  for (let e = 0; e < N; e++) {
    const cx = Math.min(gw - 1, (ex[e] - minx) / cell | 0);
    const cy = Math.min(gh - 1, (ey[e] - miny) / cell | 0);
    eb[e] = cy * gw + cx;
  }
  const start = new Int32Array(nb + 1);
  for (let e = 0; e < N; e++) start[eb[e] + 1]++;
  for (let k = 0; k < nb; k++) start[k + 1] += start[k];
  const items = new Int32Array(N);
  const cursor = start.slice(0, nb);
  for (let e = 0; e < N; e++) items[cursor[eb[e]]++] = e;
  const left = new Int32Array(nb);
  for (let k = 0; k < nb; k++) left[k] = start[k + 1] - start[k];

  const used = new Uint8Array(n);
  let px = startX, py = startY, best = -1, bestD = Infinity;
  const scan = (cx, cy) => {
    if (cx < 0 || cx >= gw || cy < 0 || cy >= gh) return;
    const k = cy * gw + cx;
    if (left[k] === 0) return;
    for (let t = start[k]; t < start[k + 1]; t++) {
      const e = items[t];
      if (used[e >> 1]) continue;
      const dx = ex[e] - px, dy = ey[e] - py, d = dx * dx + dy * dy;
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
    if (best < 0) {
      for (let e = 0; e < N; e++) {
        if (used[e >> 1]) continue;
        const dx = ex[e] - px, dy = ey[e] - py, d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = e; }
      }
    }
    const i = best >> 1;
    used[i] = 1;
    left[eb[i * 2]]--;
    left[eb[i * 2 + 1]]--;
    order[done] = ids[i];
    flip[done] = best & 1;
    const exitE = i * 2 + (flip[done] ? 0 : 1);
    px = ex[exitE];
    py = ey[exitE];
  }
  return { order, flip, px, py };
}

function orderShapes(sh) {
  const n = sh.off.length - 1;
  const order = new Int32Array(n);
  const flip  = new Uint8Array(n);
  if (!n) return { order, flip, ink: 0, travel: 0 };
  const byInk = new Map();
  for (let i = 0; i < n; i++) {
    const id = sh.ink[i], a = byInk.get(id);
    if (a) a.push(i); else byInk.set(id, [i]);
  }
  let at = 0;
  for (const id of penOrder()) {
    const list = byInk.get(id);
    if (!list) continue;
    if (settings.optimiseOrder) {
      const g = greedy(sh, list, 0, 0);
      for (let t = 0; t < g.order.length; t++) { order[at] = g.order[t]; flip[at++] = g.flip[t]; }
    } else {
      for (const i of list) { order[at] = i; flip[at++] = 0; }
    }
  }
  return { order, flip, ...measurePlan(sh, order, flip) };
}

// Every pass starts with the pen at the corner of the sheet.
function measurePlan(sh, order, flip) {
  const { pts, off } = sh;
  let ink = 0, travel = 0, px = 0, py = 0, prevId = -1;
  for (let t = 0; t < order.length; t++) {
    const i = order[t], rev = flip[t] === 1;
    const id = sh.ink[i];
    if (id !== prevId) { px = 0; py = 0; prevId = id; }
    const a = off[i], b = off[i + 1];
    const inA = rev ? b - 1 : a, inB = rev ? a : b - 1;
    const hop = Math.hypot(pts[inA * 2] - px, pts[inA * 2 + 1] - py);
    travel += hop;
    let run = 0;
    for (let k = a; k < b - 1; k++) {
      run += Math.hypot(pts[(k + 1) * 2] - pts[k * 2], pts[(k + 1) * 2 + 1] - pts[k * 2 + 1]);
    }
    ink += run;
    if (perPen && perPen[id]) { perPen[id].ink += run; perPen[id].travel = (perPen[id].travel || 0) + hop; }
    const ly = sh.lay[i];
    if (perLayer && perLayer[ly]) perLayer[ly].ink += run;
    px = pts[inB * 2];
    py = pts[inB * 2 + 1];
  }
  return { ink, travel };
}


////////////////////////////////////////////////////////////////////////////////////////
// Preview
//
// The plot as it will come out, the picture the lines were made from, or the picture
// faint under the plot.

let PIC_IMG = null, picImgKey = '';

function pictureCanvas() {
  if (!PIC) return null;
  const key = picKeyNow + '|' + [settings.gamma, settings.contrast, settings.brightness, settings.invert].join(',');
  if (PIC_IMG && picImgKey === key) return PIC_IMG;
  picImgKey = key;
  if (!PIC_IMG) PIC_IMG = document.createElement('canvas');
  PIC_IMG.width = PIC.w; PIC_IMG.height = PIC.h;
  const ctx = PIC_IMG.getContext('2d');
  const img = ctx.createImageData(PIC.w, PIC.h), d = img.data;
  for (let i = 0; i < DEN.length; i++) {
    const v = Math.round((settings.invert ? DEN[i] : 1 - DEN[i]) * 255);
    d[4 * i] = d[4 * i + 1] = d[4 * i + 2] = v;
    d[4 * i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return PIC_IMG;
}

function drawPreview() {
  const ctx = drawingContext;
  ctx.save();
  ctx.setTransform(pixelDensity(), 0, 0, pixelDensity(), 0, 0);
  drawSheet(ctx, previewScale(), true);
  ctx.restore();
}

function drawSheet(ctx, s, guides) {
  const [W, H] = paperDims();
  ctx.fillStyle = settings.paperColor;
  ctx.fillRect(0, 0, W * s, H * s);
  const mode = settings.preview;
  if (mode !== 'plot' && DEN) {
    const c = pictureCanvas();
    if (c) {
      ctx.save();
      ctx.globalAlpha = mode === 'both' ? 0.35 : 1;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(c, F.x0 * s, F.y0 * s, F.w * s, F.h * s);
      ctx.restore();
    }
  }
  if (mode !== 'picture' && shapes && plan) drawStrokes(ctx, s);
  if (guides && (settings.showGuides || drag)) {
    ctx.save();
    ctx.scale(s, s);
    drawGuides(ctx);
    ctx.restore();
  }
}

function drawStrokes(ctx, s) {
  const { pts, off } = shapes;
  const { order } = plan;
  ctx.save();
  ctx.scale(s, s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let t = 0;
  while (t < order.length) {
    const id = shapes.ink[order[t]];
    ctx.strokeStyle = penCol(id);
    ctx.lineWidth = penW(id);
    ctx.beginPath();
    let held = 0;
    while (t < order.length && shapes.ink[order[t]] === id) {
      const i = order[t++];
      const a = off[i], b = off[i + 1];
      ctx.moveTo(pts[a * 2], pts[a * 2 + 1]);
      for (let k = a + 1; k < b; k++) ctx.lineTo(pts[k * 2], pts[k * 2 + 1]);
      if (++held >= 4000) { ctx.stroke(); ctx.beginPath(); held = 0; }
    }
    ctx.stroke();
  }
  ctx.restore();
}

// The horizon, the road on the embankment and the edge of the field. Never plotted.
function drawGuides(ctx) {
  const dark = luma(settings.paperColor) < 0.25;
  const col = dark ? 'rgba(110, 200, 255, 0.85)' : 'rgba(26, 109, 209, 0.8)';
  ctx.save();
  ctx.translate(F.x0, F.y0);
  ctx.strokeStyle = col;
  ctx.lineWidth = 0.35;
  ctx.setLineDash([2, 1.5]);
  ctx.beginPath();
  ctx.moveTo(0, PY(settings.horizon)); ctx.lineTo(F.w, PY(settings.horizon));
  ctx.stroke();
  if (EMB && EMB.on && settings.source === 'scene') {
    ctx.setLineDash([1.2, 1.2]);
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) { const q = EMB.at(i / 100); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const L of LAMPS) {
    ctx.beginPath();
    ctx.arc(L.x, L.y, 1.2, 0, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

////////////////////////////////////////////////////////////////////////////////////////
// The mouse and the keys
//
// A drag moves the horizon and the embankment up and down and slides the lamps along it;
// shift-drag (or a right-drag) moves the trees; the wheel thickens or thins the fog.

let settleTimer = null;

function settle() {
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => { settleTimer = null; update(); }, 250);
}

function attachPointer() {
  const c = canvasEl();
  c.addEventListener('contextmenu', e => e.preventDefault());
  c.addEventListener('pointerdown', e => {
    const s = settings;
    drag = {
      at: [e.clientX, e.clientY], trees: e.shiftKey || e.button === 2, moved: false,
      horizon: s.horizon, embY: s.embY, embY2: s.embY2, ls: s.lampStart, le: s.lampEnd,
      tx: s.treeX, tb: s.treeBase,
    };
    c.setPointerCapture(e.pointerId);
    c.classList.add('dragging');
  });
  c.addEventListener('pointermove', e => {
    if (!drag) return;
    const s = settings;
    const dxp = e.clientX - drag.at[0], dyp = e.clientY - drag.at[1];
    if (Math.abs(dxp) + Math.abs(dyp) > 2) drag.moved = true;
    if (!drag.moved) return;
    const r = canvasEl().getBoundingClientRect(), [W, H] = paperDims();
    const dx = dxp / r.width * W / F.w * 100, dy = dyp / r.height * H / F.h * 100;
    if (drag.trees) {
      s.treeX = +clamp(drag.tx + dx, -20, 120).toFixed(1);
      s.treeBase = +clamp(drag.tb + dy, 0, 120).toFixed(1);
    } else {
      s.horizon = +clamp(drag.horizon + dy, 0, 100).toFixed(1);
      s.embY = +clamp(drag.embY + dy, -20, 120).toFixed(1);
      s.embY2 = +clamp(drag.embY2 + dy, -20, 120).toFixed(1);
      s.lampStart = +clamp(drag.ls + dx, -50, 150).toFixed(1);
      s.lampEnd = +clamp(drag.le + dx, -50, 150).toFixed(1);
    }
    for (const k of ['treeX', 'treeBase', 'horizon', 'embY', 'embY2', 'lampStart', 'lampEnd']) {
      if (setters[k]) setters[k](s[k]);
    }
    liveUpdate();
  });
  const end = e => {
    if (!drag) return;
    drag = null;
    c.classList.remove('dragging');
    try { c.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
    update();
  };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', end);
  c.addEventListener('wheel', e => {
    e.preventDefault();
    const s = settings;
    s.fog = +clamp(s.fog - e.deltaY * 0.05, 0, 100).toFixed(1);
    if (setters.fog) setters.fog(s.fog);
    liveUpdate();
    settle();
  }, { passive: false });
}

function attachKeys() {
  window.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable ||
        (t.tagName === 'INPUT' && !['checkbox', 'button', 'color', 'range'].includes(t.type)))) return;
    if (e.metaKey || e.ctrlKey || e.altKey || drag) return;
    const s = settings;
    const cycle = (key, list, dir) => {
      s[key] = list[(list.indexOf(s[key]) + dir + list.length) % list.length];
      refreshControls();
      update();
    };
    switch (e.key) {
      case 'r': case 'R': s.seed = Math.floor(Math.random() * 100000); refreshControls(); update(); break;
      case '[': s.seed = Math.max(0, Math.round(s.seed) - 1); refreshControls(); update(); break;
      case ']': s.seed = Math.round(s.seed) + 1; refreshControls(); update(); break;
      case 't': cycle('technique', TECHNIQUES, 1); break;
      case 'T': cycle('technique', TECHNIQUES, -1); break;
      case 'v': case 'V': cycle('preview', PREVIEWS, 1); break;
      case 'i': case 'I': s.invert = !s.invert; refreshControls(); update(); break;
      case 's': case 'S': {
        const k = (SCENES.findIndex(sc => sc.label === lastScene) + 1) % SCENES.length || 1;
        applyScene(SCENES[k]);
        break;
      }
      case 'g': case 'G': s.showGuides = !s.showGuides; refreshControls(); drawPreview(); syncUrl(); break;
      default: return;
    }
    e.preventDefault();
  });
}

////////////////////////////////////////////////////////////////////////////////////////
// Controls

let lastScene = '';

function syncVisibility() {
  const s = settings;
  setVisible('orientation', s.paper !== 'custom');
  setVisible('customW', s.paper === 'custom');
  setVisible('customH', s.paper === 'custom');
  const scene = s.source === 'scene';
  for (const id of ['sec-sky', 'sec-emb', 'sec-lamps', 'sec-trees', 'sec-ground', 'sec-road', 'sec-stairs']) {
    const el = document.getElementById(id);
    if (el) { el.style.display = scene ? '' : 'none'; if (el.nextSibling) el.nextSibling.style.display = scene ? '' : 'none'; }
  }
  setVisible('photoLoad', s.source === 'photo');
  setVisible('mottleScale', s.mottle > 0);
  const emb = s.embankment;
  for (const k of ['embY', 'embY2', 'embPersp', 'embFar', 'wallH', 'slopeH', 'wallLight', 'slopeLight',
                   'embDepth', 'panelW', 'rails', 'litStrip', 'stripH']) setVisible(k, emb);
  setVisible('embFar', emb && s.embPersp > 0);
  setVisible('stripH', emb && s.litStrip > 0);
  for (const k of ['beamSpread', 'beamLen', 'beamBright']) setVisible(k, s.beam !== 'none');
  for (const k of ['farDrop', 'farBright']) setVisible(k, s.farRow > 0);
  for (const k of ['treeKind', 'treeX', 'treeSpread', 'treeBase', 'treeH', 'treeDetail', 'treeDepth']) setVisible(k, s.trees > 0);
  setVisible('treeSpread', s.trees > 1);
  setVisible('weedH', s.weeds > 0);
  for (const k of ['snowScale', 'snowLight']) setVisible(k, s.snow > 0);
  for (const k of ['roadCurve', 'roadX', 'roadWidth', 'guardrails', 'railPosts', 'roadLight', 'wet']) setVisible(k, s.road);
  for (const k of ['stairsX', 'steps', 'doorH', 'doorW', 'doorLight', 'panes', 'handrail']) setVisible(k, s.stairs);
  const tq = s.technique;
  for (const k of ['spacing', 'levels', 'minDash']) setVisible(k, tq === 'line dither');
  setVisible('minDash', tq === 'line dither' || tq === 'crosshatch');
  setVisible('wobble', tq === 'line dither' || tq === 'crosshatch');
  setVisible('angle', ['line dither', 'squiggle', 'crosshatch'].includes(tq));
  for (const k of ['squiggleGap', 'squiggleFreq']) setVisible(k, tq === 'squiggle');
  for (const k of ['hatchDirs', 'hatchGap']) setVisible(k, tq === 'crosshatch');
  for (const k of ['stippleGap', 'stippleMax']) setVisible(k, tq === 'stipple');
  setVisible('contourLevels', tq === 'contours' || s.contoursToo);
  setVisible('contoursToo', tq !== 'contours');
  setVisible('lineFog', s.lines);
  setVisible('lineGrass', s.lines);
  refreshPenList();
}

function addSeedField(parent) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs.seed = field;
  createSpan('Seed').parent(field).class('label');
  const row = createDiv('').parent(field).class('row');
  const num = createInput(String(settings.seed)).parent(row);
  num.attribute('type', 'text');
  num.attribute('inputmode', 'numeric');
  const btn = createButton('Roll').parent(row).class('inline-btn');
  createDiv('The branches of the trees, the weeds, the grass, the clouds in the fog, the snow ' +
    'and the grain. <b>R</b> rolls a new one, <b>[</b> and <b>]</b> step through them.')
    .parent(field).class('note');
  setters.seed = v => num.value(String(v));
  num.input(() => {
    const v = parseNum(num.value());
    if (v === null) return;
    settings.seed = clamp(Math.round(v), 0, 1e9);
    update();
  });
  btn.mousePressed(() => {
    settings.seed = Math.floor(Math.random() * 100000);
    num.value(String(settings.seed));
    update();
  });
}

function sectionId(body, id) {
  // the heading just before the body, so a whole section can be hidden
  const head = body.elt.previousSibling;
  if (head) head.id = id;
}

function buildControls() {
  const root = select('#controls');
  const resync = () => { syncVisibility(); update(); };
  let sec;

  sec = addSection(root, 'View');
  const sceneSel = createSelect().parent(createDiv('').parent(sec).class('field'));
  for (const sc of SCENES) sceneSel.option(sc.label);
  sceneSel.changed(() => {
    const sc = SCENES[sceneSel.elt.selectedIndex];
    if (sc && sc.s) applyScene(sc);
    sceneSel.elt.selectedIndex = 0;
  });
  addNote(sec, '<b>S</b> steps through the views.');
  addSelect(sec, 'Picture from', 'source', SOURCES, resync,
    '<b>scene</b> — painted from the settings below; <b>photo</b> — any picture from disk, ' +
    'turned into lines the same way.');
  const pf = createDiv('').parent(sec).class('field');
  fieldDivs.photoLoad = pf;
  createSpan('Photo').parent(pf).class('label');
  const fileIn = createFileInput(() => {}).parent(pf);
  fileIn.elt.accept = 'image/*';
  fileIn.elt.onchange = ev => loadPhotoFile(ev.target.files && ev.target.files[0]);
  photoNote = createDiv(PHOTO ? PHOTO.name : 'Not part of the link — load it again to rebuild the sheet.')
    .parent(pf).class('note');
  addSeedField(sec);
  addSlider(sec, 'Picture resolution (px a mm)', 'res', 1, 8, 0.5,
    'How finely the picture is painted before it becomes lines. 3 is plenty for a 0.3 mm pen.');

  sec = addSection(root, 'Sky and fog');
  sectionId(sec, 'sec-sky');
  addSlider(sec, 'Horizon (% down)', 'horizon', 0, 100, 0.5, 'A drag on the sheet moves it.');
  addSlider(sec, 'Sky at the top (% light)', 'skyDark', 0, 100, 1);
  addSlider(sec, 'Fog at the horizon (% light)', 'fogLight', 0, 100, 1);
  addSlider(sec, 'Band of fog (% of the height)', 'fogBand', 1, 80, 0.5);
  addSlider(sec, 'Fog (%)', 'fog', 0, 100, 0.5,
    'How fast things fade with distance — the wheel changes it.');
  addSlider(sec, 'Haze (mm)', 'haze', 0, 20, 0.1, 'How far the light spreads into the fog.');
  addSlider(sec, 'Clouds in the fog (%)', 'mottle', 0, 60, 1);
  addSlider(sec, 'Their size', 'mottleScale', 0.3, 20, 0.1);

  sec = addSection(root, 'Embankment and wall');
  sectionId(sec, 'sec-emb');
  addCheckbox(sec, 'An embankment with a noise wall on it', 'embankment', resync);
  addSlider(sec, 'Road on top, left (% down)', 'embY', -20, 120, 0.5);
  addSlider(sec, 'Road on top, right (% down)', 'embY2', -20, 120, 0.5);
  addSlider(sec, 'Going away (%)', 'embPersp', 0, 95, 1,
    'How much smaller the far end is — posts and lamps crowd towards it in perspective.');
  addSelect(sec, 'Far end', 'embFar', ENDS, update);
  addSlider(sec, 'Wall (% of the height)', 'wallH', 0, 90, 0.5);
  addSlider(sec, 'Slope below (% of the height)', 'slopeH', 0, 60, 0.5);
  addSlider(sec, 'Wall (% light)', 'wallLight', 0, 100, 1);
  addSlider(sec, 'Slope (% light)', 'slopeLight', 0, 100, 1);
  addSlider(sec, 'Into the fog (%)', 'embDepth', 0, 150, 1);
  addSlider(sec, 'Panels (% of the width)', 'panelW', 0, 60, 0.5, '0 — no posts.');
  addSlider(sec, 'Rails', 'rails', 0, 8, 1);
  addSlider(sec, 'Lit strip at its foot (% light)', 'litStrip', 0, 100, 1);
  addSlider(sec, 'Strip (% of the height)', 'stripH', 0.2, 20, 0.1);

  sec = addSection(root, 'Lamps');
  sectionId(sec, 'sec-lamps');
  addSlider(sec, 'Lamps', 'lamps', 0, 60, 1, 'On poles along the embankment, or the horizon.');
  addSlider(sec, 'First (% along)', 'lampStart', -50, 150, 0.5, 'A sideways drag slides them.');
  addSlider(sec, 'Last (% along)', 'lampEnd', -50, 150, 0.5);
  addSlider(sec, 'Pole (% of the height)', 'poleH', 0, 90, 0.5);
  addCheckbox(sec, 'Arms reaching over the road', 'arms');
  addSlider(sec, 'Brightness (%)', 'lampBright', 0, 200, 1);
  addSlider(sec, 'Halo (% of the height)', 'halo', 0, 60, 0.1);
  addSlider(sec, 'Halo softness (%)', 'haloSoft', 0, 100, 1);
  addSelect(sec, 'Beams', 'beam', BEAMS, resync, 'Wedges of light hanging in the fog.');
  addSlider(sec, 'Beam spread (°)', 'beamSpread', 2, 120, 1);
  addSlider(sec, 'Beam length (% of the height)', 'beamLen', 1, 150, 1);
  addSlider(sec, 'Beam brightness (%)', 'beamBright', 0, 150, 1);
  addSlider(sec, 'A farther row', 'farRow', 0, 60, 1, 'Glows without poles, the other side of the road.');
  addSlider(sec, 'Below the near row (% of the height)', 'farDrop', -60, 60, 0.5);
  addSlider(sec, 'Its brightness (%)', 'farBright', 0, 200, 1);

  sec = addSection(root, 'Trees and weeds');
  sectionId(sec, 'sec-trees');
  addSlider(sec, 'Trees', 'trees', 0, 40, 1);
  addSelect(sec, 'Kind', 'treeKind', TREE_KINDS, update,
    '<b>saplings</b> — a leader with shoots up it; <b>bare</b> — a crown forking again and again.');
  addSlider(sec, 'Across (%)', 'treeX', -20, 120, 0.5, 'Shift-drag moves them.');
  addSlider(sec, 'Spread (% of the width)', 'treeSpread', 0, 150, 1);
  addSlider(sec, 'Standing at (% down)', 'treeBase', 0, 120, 0.5);
  addSlider(sec, 'Height (% of the height)', 'treeH', 2, 120, 0.5);
  addSlider(sec, 'Branching', 'treeDetail', 1, 10, 1);
  addSlider(sec, 'Into the fog (%)', 'treeDepth', 0, 150, 1);
  addSlider(sec, 'Weeds', 'weeds', 0, 60, 1);
  addSlider(sec, 'Their height (% of the height)', 'weedH', 2, 60, 0.5);
  addSlider(sec, 'Grass along the field (%)', 'grass', 0, 100, 1);

  sec = addSection(root, 'Ground');
  sectionId(sec, 'sec-ground');
  addSlider(sec, 'Near (% light)', 'groundLight', 0, 100, 1);
  addSlider(sec, 'Far (% light)', 'groundFar', 0, 100, 1);
  addSlider(sec, 'Snow (%)', 'snow', 0, 100, 1, 'Patches of it, larger towards you.');
  addSlider(sec, 'Patch size', 'snowScale', 0.3, 20, 0.1);
  addSlider(sec, 'Snow (% light)', 'snowLight', 0, 100, 1);

  sec = addSection(root, 'Road', true);
  sectionId(sec, 'sec-road');
  addCheckbox(sec, 'A road curving away', 'road', resync);
  addSlider(sec, 'Curve (%)', 'roadCurve', -200, 200, 1);
  addSlider(sec, 'Sideways (%)', 'roadX', -100, 100, 1);
  addSlider(sec, 'Width (camera heights)', 'roadWidth', 0.5, 12, 0.1);
  addSelect(sec, 'Guard rails', 'guardrails', RAILS, update);
  addSlider(sec, 'Between posts (camera heights)', 'railPosts', 0.3, 8, 0.1);
  addSlider(sec, 'Road (% light)', 'roadLight', 0, 100, 1);
  addSlider(sec, 'Wet — the lamps in it (%)', 'wet', 0, 150, 1);

  sec = addSection(root, 'Stairs and a door', true);
  sectionId(sec, 'sec-stairs');
  addCheckbox(sec, 'Stairs up to a door in the wall', 'stairs', resync);
  addSlider(sec, 'Where (% along)', 'stairsX', 0, 100, 0.5);
  addSlider(sec, 'Steps', 'steps', 2, 40, 1);
  addSlider(sec, 'Door height (% of the height)', 'doorH', 2, 80, 0.5);
  addSlider(sec, 'Door width (% of the width)', 'doorW', 1, 40, 0.5);
  addSlider(sec, 'Door (% light)', 'doorLight', 0, 100, 1);
  addSlider(sec, 'Panes', 'panes', 1, 6, 1);
  addCheckbox(sec, 'A handrail', 'handrail');

  sec = addSection(root, 'Ink');
  addSelect(sec, 'Technique', 'technique', TECHNIQUES, resync,
    '<b>line dither</b> — close lines, each drawn where it is darker than its own threshold; ' +
    '<b>squiggle</b> — a wave as high as it is dark; <b>crosshatch</b> — a direction for every ' +
    'step of dark; <b>stipple</b> — dots; <b>contours</b> — lines of equal light. <b>T</b> steps.');
  addSlider(sec, 'Closest lines (mm)', 'spacing', 0.1, 6, 0.05,
    'The line dither at its darkest. Keep it over the nib, or the dark closes up solid.');
  addSlider(sec, 'Levels', 'levels', 2, 32, 1, 'Thresholds the lines take turns at — 2, 4, 8, 16, 32.');
  addSlider(sec, 'Angle (°)', 'angle', -90, 90, 1);
  addSlider(sec, 'Wobble (mm)', 'wobble', 0, 3, 0.05, 'The lines shaken, as a hand would draw them.');
  addSlider(sec, 'Shortest dash (mm)', 'minDash', 0, 10, 0.1);
  addSlider(sec, 'Between squiggles (mm)', 'squiggleGap', 0.2, 8, 0.05);
  addSlider(sec, 'Waves a mm, darkest', 'squiggleFreq', 0.05, 5, 0.05);
  addSlider(sec, 'Directions', 'hatchDirs', 1, 4, 1);
  addSlider(sec, 'Between hatch lines (mm)', 'hatchGap', 0.1, 8, 0.05);
  addSlider(sec, 'Closest dots (mm)', 'stippleGap', 0.1, 8, 0.05);
  addSlider(sec, 'Dots at most', 'stippleMax', 100, 400000, 100);
  addCheckbox(sec, 'Contours as well', 'contoursToo', resync);
  addSlider(sec, 'Contour levels', 'contourLevels', 1, 80, 1);
  addSub(sec, 'Tone');
  addSlider(sec, 'Brightness (%)', 'brightness', -100, 100, 1);
  addSlider(sec, 'Contrast (%)', 'contrast', -100, 200, 1);
  addSlider(sec, 'Gamma (%)', 'gamma', 20, 400, 1);
  addSlider(sec, 'Left bare under (% ink)', 'whiteCut', 0, 60, 1,
    'So the light round the lamps stays clean paper.');
  addSlider(sec, 'Grain (%)', 'grain', 0, 40, 0.5);
  addCheckbox(sec, 'Draw the light — white ink on black paper', 'invert', resync);

  sec = addSection(root, 'Edges of things');
  addCheckbox(sec, 'Draw the edges — branches, poles, posts, steps, rails', 'lines', resync);
  addCheckbox(sec, 'Far things break into dashes', 'lineFog');
  addCheckbox(sec, 'Every blade of grass too', 'lineGrass');
  addNote(sec, 'The edges are the dark outlines of things. With <b>Draw the light</b> they would ' +
    'come out in white ink — leave them off on black paper.');

  sec = addSection(root, 'Pens');
  addNote(sec, 'Black and white: two pens, which can be the same one. Changing the kind sets its ' +
    'colour and a usual width.');
  addPenSelect(sec, 'Tone', 'tonePen');
  addPenSelect(sec, 'Edges', 'linesPen');
  addPenSelect(sec, 'Border', 'borderPen');
  for (let i = 0; i < SLOTS; i++) addPenSlot(sec, i);

  sec = addSection(root, 'Paper');
  addSelect(sec, 'Size', 'paper', PAPERS, () => { syncVisibility(); resizeForPaper(); });
  addSelect(sec, 'Orientation', 'orientation', ['landscape', 'portrait'], resizeForPaper);
  addSlider(sec, 'Width (mm)', 'customW', 20, 2000, 1, '', resizeForPaper);
  addSlider(sec, 'Height (mm)', 'customH', 20, 2000, 1, '', resizeForPaper);
  addSlider(sec, 'Margin (mm)', 'margin', 0, 100, 1);
  addSelect(sec, 'Picture', 'frame', FRAME_NAMES, update, 'The picture\'s proportions, inside the margin.');
  addCheckbox(sec, 'A line round the picture', 'border');
  addSelect(sec, 'Paper', 'paperTone', TONES, () => {
    if (PAPER_TONES[settings.paperTone]) {
      settings.paperColor = PAPER_TONES[settings.paperTone];
      setters.paperColor(settings.paperColor);
    }
    drawPreview(); updateStats(); syncUrl();
  }, 'The preview only — the files have no background.');
  addColor(sec, 'Paper colour', 'paperColor');

  sec = addSection(root, 'Output');
  addSelect(sec, 'Preview', 'preview', PREVIEWS, () => { drawPreview(); syncUrl(); },
    '<b>plot</b>; <b>picture</b> — the greys the lines are made from; <b>both</b>. <b>V</b> steps.');
  addCheckbox(sec, 'Order the strokes for the plotter', 'optimiseOrder');
  addCheckbox(sec, 'Follow the sliders live', 'liveUpdate', () => syncUrl());
  addCheckbox(sec, 'Show the horizon and the lamps', 'showGuides', () => { drawPreview(); syncUrl(); });
  createButton('Download SVG [everything]').parent(sec).class('primary')
    .mousePressed(() => exportSvg({ all: true }));
  createButton('Download SVG [one per pen]').parent(sec).mousePressed(() => exportSvg({ perPen: true }));
  const lb = createDiv('').parent(sec).class('layer-buttons');
  LAYERS.forEach((ly, li) => {
    layerButtons[li] = createButton('').parent(lb).mousePressed(() => exportSvg({ layer: li }));
  });
  addNote(sec, 'Everything is one file, a group per pen; a layer\'s file is the tone, the edges ' +
    'or the border alone. Every file is the whole sheet in millimetres.');
  addSlider(sec, 'Picture (dpi)', 'pngDpi', 50, 600, 10, '', () => syncUrl());
  createButton('Download PNG').parent(sec).mousePressed(exportPng);
  const row = createDiv('').parent(sec).class('btn-row');
  createButton('Copy link').parent(row).mousePressed(function () { copyLink(this); });
  createButton('Reset').parent(row).mousePressed(resetAll);

  sec = addSection(root, 'The sheet');
  statsDiv = createDiv('').parent(sec).class('stats');
  penListDiv = createDiv('').parent(sec).class('stats');
  createDiv('').parent(sec).class('note keys').html(
    '<div><kbd>drag</kbd> horizon up and down, lamps along · <kbd>shift</kbd>+<kbd>drag</kbd> trees</div>' +
    '<div><kbd>wheel</kbd> the fog · <kbd>S</kbd> view · <kbd>T</kbd> technique · <kbd>V</kbd> preview</div>' +
    '<div><kbd>I</kbd> draw the light · <kbd>G</kbd> guides</div>' +
    '<div><kbd>R</kbd> new seed · <kbd>[</kbd> <kbd>]</kbd> step it</div>');
  linkDiv = createDiv('').parent(sec).class('link');
  refreshPenSelects();
  syncVisibility();
}

////////////////////////////////////////////////////////////////////////////////////////
// What the sheet costs

function updateStats() {
  if (!statsDiv) return;
  const s = settings;
  if (!shapes && !strokes) {
    statsDiv.html('<div class="warn">The margin leaves nothing to draw on.</div>');
    refreshPenList();
    return;
  }
  if (!plan || !shapes) {
    statsDiv.html(`<div class="warn">${groupNum(strokes)} strokes — past the ` +
      `${groupNum(MAX_STROKES)} limit, so nothing was ordered or drawn.</div>`);
    refreshPenList();
    return;
  }
  const seconds = strokes * PEN_CYCLE_S + plan.ink / DRAW_SPEED + plan.travel / TRAVEL_SPEED;
  let html =
    `<div class="big"><b>${groupNum(strokes)}</b> strokes, ` +
    `<b>${(plan.ink / 1000).toFixed(1)}</b> m of line</div>` +
    `<div>${s.technique} · the picture wants ink over <b>${(100 * counts.ink).toFixed(0)} %</b> of it` +
    `${counts.edges ? ` · ${groupNum(counts.edges)} edges` : ''}` +
    `${counts.dots ? ` · ${groupNum(counts.dots)} dots` : ''}</div>` +
    `<div>Picture ${PIC ? PIC.w + ' × ' + PIC.h : '—'} px · F ${F.w.toFixed(0)} × ${F.h.toFixed(0)} mm</div>` +
    `<div>Pen up for ${(plan.travel / 1000).toFixed(1)} m between strokes</div>` +
    `<div>Roughly <b>${formatDuration(seconds)}</b> to plot · ${lastMs.toFixed(0)} ms to build</div>`;
  if (s.source === 'photo' && !PHOTO) {
    html += '<div class="warn">No photo loaded — load one under <b>View</b>.</div>';
  }
  const tw = penW(penIdx(s.tonePen));
  const gap = s.technique === 'line dither' ? s.spacing : s.technique === 'crosshatch' ? s.hatchGap :
              s.technique === 'squiggle' ? s.squiggleGap / 2 : s.technique === 'stipple' ? s.stippleGap : Infinity;
  if (gap < tw * 1.15) {
    html += `<div class="warn">The lines are ${gap} mm apart and the pen ${tw} mm wide — the dark ` +
      `will close up into solid ink.</div>`;
  }
  for (let i = 0; i < SLOTS; i++) {
    if (perPen && perPen[i].strokes && contrast(penCol(i), s.paperColor) < 1.6) {
      html += `<div class="warn">Pen ${i + 1} (${penKind(i)}) will barely show on this paper.</div>`;
    }
  }
  if (strokes > BUSY_STROKES) {
    html += `<div class="warn">${groupNum(strokes)} strokes is a long sitting at the plotter.</div>`;
  }
  statsDiv.html(html);
  refreshPenList();
}

function metaComment() {
  const s = settings;
  const pens = [];
  for (let i = 0; i < SLOTS; i++) if (perPen && perPen[i].strokes) pens.push(penLabel(i));
  return `night fog — ${s.source === 'photo' ? 'photo ' + (PHOTO ? PHOTO.name : '') : 'scene'} ` +
    `${s.technique}${s.technique === 'line dither' ? ` ${s.spacing}mm/${s.levels}` : ''} ` +
    `lamps=${s.lamps}+${s.farRow} trees=${s.trees} fog=${s.fog}% invert=${s.invert} ` +
    `seed=${s.seed} pens=[${pens.join('; ')}] strokes=${strokes}`;
}

function fileStem() {
  const s = settings;
  const paper = s.paper === 'custom' ? `${s.customW}x${s.customH}mm` : `${s.paper}-${s.orientation}`;
  return `night fog ${s.technique} seed${s.seed} ${paper}`;
}


////////////////////////////////////////////////////////////////////////////////////////
// Controls, shared
//
// A section folds away under its heading; which ones are folded is remembered by the
// browser, not by the link.

function foldedSet() {
  try { return new Set(JSON.parse(localStorage.getItem('p5js19-folded') || '[]')); }
  catch (e) { return new Set(); }
}

function saveFolded(set) {
  try { localStorage.setItem('p5js19-folded', JSON.stringify([...set])); } catch (e) { /* no storage */ }
}

function addSection(parent, title, folded) {
  const head = createDiv(title).parent(parent).class('section');
  const body = createDiv('').parent(parent).class('sec-body');
  const set = foldedSet();
  if (set.has(title) || (folded && !set.has('!' + title))) head.addClass('folded');
  head.mousePressed(() => {
    const st = foldedSet();
    if (head.hasClass('folded')) {
      head.removeClass('folded'); st.delete(title); st.add('!' + title);
    } else {
      head.addClass('folded'); st.add(title); st.delete('!' + title);
    }
    saveFolded(st);
  });
  return body;
}

function addSub(parent, title) { createDiv(title).parent(parent).class('sub'); }

function addNote(parent, html) { createDiv(html).parent(parent).class('note'); }

function setVisible(key, on) {
  if (fieldDivs[key]) fieldDivs[key].style('display', on ? '' : 'none');
}

function applyScene(sc) {
  Object.assign(settings, DEFAULTS, sc.s || {});
  lastScene = sc.label;
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

function addSlider(parent, labelText, key, min, max, step, hint, onChange) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const row = createDiv('').parent(field).class('row');
  const sl  = createSlider(min, max, settings[key], step).parent(row);
  const num = createInput(String(settings[key])).parent(row);
  num.attribute('type', 'text');
  num.attribute('inputmode', 'decimal');
  if (hint) createDiv(hint).parent(field).class('note');
  const done = onChange || update;
  setters[key] = v => { sl.value(v); num.value(String(v)); };
  sl.input(() => {
    settings[key] = Number(sl.value());
    num.value(String(settings[key]));
    if (settings.liveUpdate && !onChange) liveUpdate();
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
  const sel = createSelect().parent(field);
  for (const o of options) sel.option(o);
  sel.selected(settings[key]);
  if (hint) createDiv(hint).parent(field).class('note');
  setters[key] = v => sel.selected(v);
  sel.changed(() => { settings[key] = sel.value(); (onChange || update)(); });
  return sel;
}

// A select of the five pens, by number, each named for what it is now.
function addPenSelect(parent, labelText, key, hint) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const sel = createSelect().parent(field);
  for (let i = 0; i < SLOTS; i++) sel.option(penLabel(i), String(i + 1));
  sel.selected(String(settings[key]));
  if (hint) createDiv(hint).parent(field).class('note');
  setters[key] = v => sel.selected(String(v));
  sel.changed(() => { settings[key] = Number(sel.value()); update(); });
  penSelects.push(sel);
  return sel;
}

function refreshPenSelects() {
  for (const sel of penSelects) {
    const o = sel.elt.options;
    for (let i = 0; i < o.length && i < SLOTS; i++) o[i].text = penLabel(i);
  }
  slotSwatches.forEach((sw, i) => sw.style('background', penCol(i)));
}

function addCheckbox(parent, labelText, key, onChange) {
  const row = createDiv('').parent(parent).class('checkbox-row');
  fieldDivs[key] = row;
  const cb = createCheckbox(labelText, settings[key]).parent(row);
  setters[key] = v => cb.checked(!!v);
  cb.changed(() => { settings[key] = cb.checked(); (onChange || update)(); });
  return cb;
}

function addColor(parent, labelText, key, hint) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const cp = createColorPicker(settings[key]).parent(field);
  if (hint) createDiv(hint).parent(field).class('note');
  setters[key] = v => cp.value(v);
  cp.input(() => {
    settings[key] = cp.value();
    if (key === 'paperColor' && settings.paperTone !== 'custom') {
      settings.paperTone = 'custom';
      if (setters.paperTone) setters.paperTone('custom');
    }
    refreshPenSelects();
    refreshPenList();
    updateStats();
    drawPreview();
    syncUrl();
  });
  return cp;
}

// A pen of the drawer: its kind, its width, its colour in the preview.
function addPenSlot(parent, i) {
  const box = createDiv('').parent(parent).class('pen-slot');
  const head = createDiv('').parent(box).class('slot-head');
  const sw = createSpan('').parent(head).class('sw');
  slotSwatches[i] = sw;
  createSpan(`Pen ${i + 1}`).parent(head);
  const k = `pen${i + 1}`;
  addSelect(box, 'Kind', k + 'Kind', KINDS, () => {
    const kind = PEN_KINDS[settings[k + 'Kind']];
    if (kind) {
      settings[k + 'Col'] = kind.col;
      settings[k + 'W'] = kind.w;
      setters[k + 'Col'](kind.col);
      setters[k + 'W'](kind.w);
    }
    refreshPenSelects();
    update();
  });
  addSlider(box, 'Width (mm)', k + 'W', 0.05, 20, 0.05, '', () => { refreshPenSelects(); update(); });
  addColor(box, 'Colour', k + 'Col');
}

function refreshPenList() {
  LAYERS.forEach((ly, li) => {
    const b = layerButtons[li];
    if (!b) return;
    const p = perLayer && perLayer[li];
    const on = p && p.strokes > 0;
    b.style('display', on ? '' : 'none');
    if (on) {
      const sw = [...p.pens].sort().map(i =>
        `<span class="sw" style="background:${penCol(i)}"></span>`).join('');
      b.html(`${sw}SVG [${ly.label}] — ${groupNum(p.strokes)} strokes, ${(p.ink / 1000).toFixed(1)} m`);
    }
  });
  if (!penListDiv) return;
  if (!perPen) { penListDiv.html(''); return; }
  let html = '';
  for (const i of penOrder()) {
    const p = perPen[i];
    if (!p || !p.strokes) continue;
    const names = LAYERS.filter((ly, li) => perLayer && perLayer[li].pens.has(i)).map(ly => ly.label).join(', ');
    const sec = p.strokes * PEN_CYCLE_S + p.ink / DRAW_SPEED + (p.travel || 0) / TRAVEL_SPEED;
    html += `<div class="pen-row"><span class="sw" style="background:${penCol(i)}"></span>` +
      `<span>${penLabel(i)} — <b>${groupNum(p.strokes)}</b> strokes, ` +
      `<b>${(p.ink / 1000).toFixed(1)}</b> m, ${formatDuration(sec)}` +
      `${names ? ` · ${names}` : ''}</span></div>`;
  }
  penListDiv.html(html);
}


////////////////////////////////////////////////////////////////////////////////////////
// SVG
//
// No fills, no background rectangle — everything in the file is meant to be plotted.
// stroke-width is each pen's own nib and the caps are round. Strokes come out in the order
// the pen should visit them, and the link that rebuilds the sheet is in the header comment.

function svgGroup(keep, pen, id) {
  const { pts, off } = shapes;
  const { order, flip } = plan;
  const f = n => String(+n.toFixed(3));
  const CHUNK = 400;
  let body = '', d = '', held = 0, count = 0;
  for (let t = 0; t < order.length; t++) {
    const i = order[t];
    if (shapes.ink[i] !== pen || !keep(i)) continue;
    const rev = flip[t] === 1;
    const a = off[i], b = off[i + 1], n = b - a;
    count++;
    let k = rev ? b - 1 : a;
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
  if (!count) return null;
  return `<g id="${id}" fill="none" stroke="${penCol(pen)}" stroke-width="${f(penW(pen))}" ` +
    `stroke-linecap="round" stroke-linejoin="round">\n${body}</g>\n`;
}

function penId(i) { return `pen${i + 1}-${penKind(i).replace(/\s+/g, '-')}`; }

function svgFile(groups, tag) {
  const [W, H] = paperDims();
  let body = '';
  for (const [keep, pen, id] of groups) {
    const g = svgGroup(keep, pen, id);
    if (g) body += g;
  }
  if (!body) return null;
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- ${metaComment()} pass=${tag} -->\n` +
    `<!-- ${location.origin === 'null' ? '' : location.origin}${location.pathname}` +
    `#${encodeState()} -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n` +
    body +
    `</svg>\n`;
}

function exportSvg(what) {
  if (!shapes || !plan || !strokes) {
    alert('Nothing to export — no line is left on this sheet.');
    return;
  }
  const all = () => true;
  const files = [];
  if (what.all) {
    files.push([penOrder().map(i => [all, i, penId(i)]), 'everything']);
  } else if (what.perPen) {
    for (const i of penOrder()) {
      if (perPen[i] && perPen[i].strokes) {
        const w = penW(i);
        files.push([[[all, i, penId(i)]], `pen${i + 1} ${penKind(i)} ${+w.toFixed(2)}mm`]);
      }
    }
  } else if (what.layer !== undefined) {
    const li = what.layer;
    files.push([penOrder().map(i => [j => shapes.lay[j] === li, i, `${LAYERS[li].id}-${penId(i)}`]),
                LAYERS[li].id]);
  }
  const stamp = timestamp();
  let saved = 0;
  for (const [groups, tag] of files) {
    const svg = svgFile(groups, tag);
    if (!svg) continue;
    saveStrings([svg], `${fileStem()} ${tag} ${stamp}`, 'svg');
    saved++;
  }
  if (!saved) alert('Nothing in that part of the sheet.');
}

function exportPng() {
  const [W, H] = paperDims();
  let pxmm = Math.max(1, settings.pngDpi / 25.4);
  const most = 1.2e8;
  if (W * H * pxmm * pxmm > most) pxmm = Math.sqrt(most / (W * H));
  const c = document.createElement('canvas');
  c.width = Math.round(W * pxmm);
  c.height = Math.round(H * pxmm);
  drawSheet(c.getContext('2d'), pxmm, false);
  const name = `${fileStem()} ${Math.round(pxmm * 25.4)}dpi ${timestamp()}.png`;
  c.toBlob(blob => {
    if (!blob) { alert('The picture could not be made — try a lower dpi.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }, 'image/png');
}
