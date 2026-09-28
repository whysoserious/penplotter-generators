////////////////////////////////////////////////////////////////////////////////////////
// Ink in water — two inks poured, stirred and carried by a fluid, drawn as lines
//
// The sheet is a shallow tank of water seen through its glass. Two inks come into it —
// poured in streams from its sides, laid in at the start as layers, stripes, rings or
// drops, or dragged in by hand — and the water carries them: they sink or rise by how
// much heavier than the water they are, curl into eddies where they shear past one
// another and part round the posts and walls stood in their way. The water is thin as
// water or thick as honey, calm or turbulent, and it can be stirred with the mouse.
//
// The water is Stam's stable fluids on a staggered grid. Each step the velocity is carried
// along itself, pushed by gravity, the eddies, the streams and the stirring, slowed by its
// own thickness and made to lose no water anywhere by a pressure solve. The inks ride on a
// grid finer than the water's and are carried by MacCormack's there-and-back step, which
// keeps an edge sharp for hundreds of steps where a plain backtrace blurs it to fog in a
// few dozen.
//
// Every step is ordinary arithmetic — no sine, no exponent, nothing a browser is free to
// round its own way — so the same settings run the same fluid, step for step, anywhere,
// and a link replays the sheet exactly: the strokes of the mouse are in it too, one sample
// a step. The timeline keeps a snapshot of the tank every few steps, so going back in time
// is a snapshot and a handful of steps, not a rerun.
//
// What is drawn is the ink. For each colour, the water where that ink is thick enough is
// filled with lines — echoing the ink's edge inwards, following the current through it,
// ruled straight across it, or contoured by how thick it is. One pen per colour, one file
// per pen.
////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189], 'A1': [594, 841], 'A2': [420, 594],
  'A3': [297, 420],  'A4': [210, 297], 'A5': [148, 210],
  'B0': [1000, 1414],'B1': [707, 1000],'B2': [500, 707],
  'B3': [353, 500],  'B4': [250, 353], 'B5': [176, 250],
};

const STARTS    = ['clear water', 'two layers', 'side by side', 'stripes', 'rings', 'drops'];
const SIDES     = ['left', 'right', 'top', 'bottom'];
const CURRENTS  = ['none', 'from the left', 'from the right', 'from the top', 'from the bottom'];
const DRAWS     = ['echo', 'flow lines', 'hatching', 'contours', 'outline', 'none'];
const TOOLS     = ['stir', 'circle', 'line', 'erase'];

const STEPS_PER_S    = 30;        // one second of the fluid
const P_ITERS        = 40;        // pressure iterations a step
const SOR            = 1.8;       // over-relaxation of those iterations
const MOUTH_DEPTH    = 3;         // fluid cells — how far a stream's mouth reaches into the tank
const G_MAX          = 1.5;       // short sides a second², gravity at 100
const T_MAX          = 0.12;      // the eddies at 100
const SWIRL_MAX      = 0.3;       // vorticity confinement at 100
const NU_MAX         = 0.02;      // short sides² a second — the viscosity of honey here
const DRAG           = 0.002;     // of the velocity lost each step to the glass …
const DRAG_THICK     = 0.06;      // … and more of it the thicker the water, at 100
const STIR_HOLD      = 0.7;       // how much of the stirrer's own velocity the water takes
const STIR_FOLLOW    = 0.3;       // of the way to the mouse the stirrer closes each step
const STIR_Q         = 4000;      // a stroke is kept in 1/4000ths of the tank each way
const WOBBLE_S       = 3;         // s — one sway of a stream's aim
const PULSE_S        = 1.5;       // s — one surge of its speed
const MAX_KEY_BYTES  = 200e6;     // the snapshots of one timeline, at most
const PLAY_BUDGET_MS = 16;        // stepping a frame while playing …
const CATCH_BUDGET_MS = 45;       // … and while catching up after a change
const INK_LIVE_MS    = 35;        // lines slower than this wait for the fluid to stop
const OBST_CLEAR     = 0.25;      // mm — lines stop this far from an obstacle, past half a nib
const MAX_STROKES    = 400_000;   // past this nothing is ordered, drawn or exported
const BUSY_STROKES   = 60_000;
const INK_MARK       = -1;        // cut guides: drawn with every pen
const EPS            = 0.01;      // mm — the stub that stands in for a single dot
const PREVIEW_MAX_PX = 1500;      // preview canvas resolution (paper is in mm)
const MAX_PREVIEW_W  = 900;       // on-screen size of that canvas
const MAX_PREVIEW_H  = 700;
const PEN_CYCLE_S    = 0.3;       // rough pen-up + pen-down time, seconds
const DRAW_SPEED     = 60;        // rough drawing speed, mm/s
const TRAVEL_SPEED   = 150;       // rough pen-up travel speed, mm/s

const settings = {
  // pens — one a colour, one pass of the plotter each
  ink1: '#1d1d1f',
  ink2: '#c8401a',
  nib1: 0.3,            // mm
  nib2: 0.3,
  paperColor: '#ffffff',   // the preview only — the files have no background

  // paper
  paper: 'A4',
  orientation: 'portrait',
  margin: 15,
  cropMarks: false,
  cropMarkGap: 400,

  // time — the sheet is one moment of the fluid
  t: 360,               // steps — the moment drawn and exported
  length: 12,           // s — how far the timeline runs
  playSpeed: 2,         // steps a frame while playing

  // the water
  seed: 1,
  res: 90,              // fluid cells across the short side of the tank
  inkDetail: 2,         // ink cells to a fluid cell, each way
  thickness: 0,         // 0 thin as water … 100 thick as honey
  turbulence: 10,
  eddySize: 14,         // % of the short side
  churn: 30,            // % — how fast the eddies change
  swirl: 25,            // how hard the eddies there are kept spinning
  gravity: 15,
  gravityDir: 0,        // deg — 0 pulls down the sheet, 90 to the right
  bleed: 0,             // how fast the inks spread into the water on their own

  // the tank at the start
  start: 'clear water',
  startAt: 50,          // % — where the two layers or the two halves meet
  startCount: 8,        // stripes, rings or drops
  startSize: 60,        // % — how much of the tank the ink takes
  startWobble: 10,      // % — how uneven its edges are
  openLeft: false,
  openRight: false,
  openTop: false,
  openBottom: false,
  current: 'none',
  currentSpeed: 25,     // % of the short side a second

  // colour 1 — the ink, and the streams it is poured in by
  weight1: 40,          // % heavier than the water; below 0, lighter
  streams1: 1,
  side1: 'top',
  pos1: 35,             // % along the side
  spread1: 40,          // % of the side the streams are spread over
  mouth1: 6,            // % of the side — how wide each one is
  speed1: 35,           // % of the short side a second
  aim1: 10,             // deg off square
  wobble1: 8,           // deg
  pulse1: 0,            // %
  from1: 0,             // s
  until1: 0,            // s — 0 pours to the end

  // colour 2
  weight2: -30,
  streams2: 1,
  side2: 'bottom',
  pos2: 65,
  spread2: 40,
  mouth2: 6,
  speed2: 30,
  aim2: -6,
  wobble2: 6,
  pulse2: 0,
  from2: 0,
  until2: 0,

  // obstacles — circles and walls stood in the water
  obstacles: '',
  wallWidth: 1.5,       // % of the short side — how thick a wall is
  obstaclePen: 0,       // 0 left blank; 1 or 2 — outlined by that pen

  // stirring
  stirSize: 7,          // % of the short side
  stirStrength: 100,    // %
  stirs: '',            // every stroke of the mouse, one sample a step

  // drawing — colour 1
  draw1: 'echo',
  spacing1: 1,          // mm between two lines
  inkAt1: 20,           // % — how thick the ink has to be to count
  levels1: 6,           // contours
  hatchAngle1: 45,      // deg
  outline1: false,      // the ink's edge drawn as well

  // drawing — colour 2
  draw2: 'echo',
  spacing2: 1,
  inkAt2: 20,
  levels2: 6,
  hatchAngle2: -45,
  outline2: false,

  smoothInk: 1,         // blurs of the ink before it is traced
  minLine: 1,           // mm — a line shorter than this is left out

  // output
  optimiseOrder: true,
  showGuides: true,
  showDye: 12,          // % — the ink as a wash under the lines, the preview only
};

const DEFAULTS = { ...settings };

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

function hexRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex || '');
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

////////////////////////////////////////////////////////////////////////////////////////
// Arithmetic every browser does the same way
//
// Addition, multiplication, division, square roots and floors are rounded by IEEE 754 to
// the same last bit everywhere; Math.sin and its kind are not, and a fluid run for hundreds
// of steps turns a last bit into a different eddy. So whatever the step reads goes through
// these: a sine from its Taylor series, folded into the quarter turn where eleven terms are
// good to 1e−7, and seeded Perlin noise, which is integers and polynomials already.

const TAU = 6.283185307179586;
const HALF_PI = 1.5707963267948966;

function dsin(x) {
  x = x - TAU * Math.floor(x / TAU + 0.5);
  if (x > HALF_PI) x = 3.141592653589793 - x;
  else if (x < -HALF_PI) x = -3.141592653589793 - x;
  const x2 = x * x;
  return x * (1 - x2 / 6 * (1 - x2 / 20 * (1 - x2 / 42 * (1 - x2 / 72 * (1 - x2 / 110)))));
}

function dcos(x) { return dsin(x + HALF_PI); }

function rad(deg) { return deg * 3.141592653589793 / 180; }

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

////////////////////////////////////////////////////////////////////////////////////////
// Strokes and obstacles as text
//
// Both live in the URL like every other setting, so both are written in the handful of
// characters a URL leaves alone. An obstacle is a letter and its numbers in thousandths of
// the tank — `c` a circle, its middle and radius (of the short side), `l` a wall, its two
// ends. A stroke of the mouse is where it was at every step it was held down, in 1/4000ths
// of the tank's width and height: its mode (`s` stirs, `a` pours colour 1, `b` colour 2),
// the step it began on and where, then each step's move as two zigzagged varints, five
// bits a character. A long stir is a few hundred characters.

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function parseObstacles(str) {
  const out = [];
  for (const part of String(str || '').split('~')) {
    const k = part[0];
    const v = part.slice(1).split('.').map(Number);
    if (k === 'c' && v.length === 3 && v.every(Number.isFinite)) {
      out.push({ k: 'c', x: v[0], y: v[1], r: Math.max(1, v[2]) });
    } else if (k === 'l' && v.length === 4 && v.every(Number.isFinite)) {
      out.push({ k: 'l', x0: v[0], y0: v[1], x1: v[2], y1: v[3] });
    }
  }
  return out;
}

function encodeObstacles(list) {
  return list.map(o => o.k === 'c'
    ? `c${Math.round(o.x)}.${Math.round(o.y)}.${Math.round(o.r)}`
    : `l${Math.round(o.x0)}.${Math.round(o.y0)}.${Math.round(o.x1)}.${Math.round(o.y1)}`).join('~');
}

function parseStirs(str) {
  const out = [];
  for (const part of String(str || '').split('~')) {
    const mode = 'sab'.indexOf(part[0]);
    if (mode < 0) continue;
    const bits = part.slice(1).split('.');
    if (bits.length < 3) continue;
    const t0 = parseInt(bits[0], 36), x0 = parseInt(bits[1], 36), y0 = parseInt(bits[2], 36);
    if (![t0, x0, y0].every(Number.isFinite)) continue;
    const qx = [x0], qy = [y0];
    const d = bits[3] || '';
    const vals = [];
    let acc = 0, mul = 1, ok = true;
    for (let i = 0; i < d.length; i++) {
      const c = B64.indexOf(d[i]);
      if (c < 0) { ok = false; break; }
      acc += (c & 31) * mul;
      if (c & 32) { mul *= 32; continue; }
      vals.push(acc % 2 ? -(acc + 1) / 2 : acc / 2);
      acc = 0; mul = 1;
    }
    if (!ok) continue;
    for (let i = 0; i + 1 < vals.length; i += 2) {
      qx.push(qx[qx.length - 1] + vals[i]);
      qy.push(qy[qy.length - 1] + vals[i + 1]);
    }
    out.push({ mode, t0, qx, qy });
  }
  return out;
}

function encodeStirs(list) {
  const zz = v => {
    let z = v >= 0 ? 2 * v : -2 * v - 1, s = '';
    for (;;) {
      const c = z % 32;
      z = Math.floor(z / 32);
      if (z > 0) s += B64[c + 32]; else { s += B64[c]; break; }
    }
    return s;
  };
  return list.filter(st => st.qx.length > 1).map(st => {
    let d = '';
    for (let i = 1; i < st.qx.length; i++) {
      d += zz(st.qx[i] - st.qx[i - 1]) + zz(st.qy[i] - st.qy[i - 1]);
    }
    return 'sab'[st.mode] + st.t0.toString(36) + '.' + st.qx[0].toString(36) + '.' +
      st.qy[0].toString(36) + '.' + d;
  }).join('~');
}

// Strokes laid down by the scenes: a comb drawn through the tank, up and down, the way
// marbled paper is combed, and one slow S from top to bottom.
function combStirs(n, pass, gap, first) {
  const list = [];
  let t = first;
  for (let k = 0; k < n; k++) {
    const x = Math.round((k + 0.5) / n * STIR_Q);
    const down = k % 2 === 0;
    const qx = [], qy = [];
    for (let i = 0; i <= pass; i++) {
      const f = i / pass;
      qx.push(x);
      qy.push(Math.round((down ? 0.03 + 0.94 * f : 0.97 - 0.94 * f) * STIR_Q));
    }
    list.push({ mode: 0, t0: t, qx, qy });
    t += pass + gap;
  }
  return encodeStirs(list);
}

function sStir(steps, first) {
  const qx = [], qy = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    qx.push(Math.round((0.5 + 0.3 * dsin(f * TAU)) * STIR_Q));
    qy.push(Math.round((0.12 + 0.76 * f) * STIR_Q));
  }
  return encodeStirs([{ mode: 0, t0: first, qx, qy }]);
}

function pegObstacles(rows, cols, r) {
  const out = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols + (j % 2 ? 0 : 1); i++) {
      const x = (i + (j % 2 ? 1 : 0.5)) / (cols + 1) * 1000;
      const y = 380 + j * 90;
      out.push({ k: 'c', x, y, r });
    }
  }
  return encodeObstacles(out);
}

// Sets of obstacles to start from: the sidebar lays one in, and the mouse goes on from there.
const OBSTACLE_SETS = [
  { label: '— put in obstacles —' },
  { label: 'one post', o: 'c500.500.70' },
  { label: 'post upstream', o: 'c280.500.55' },
  { label: 'three posts', o: 'c300.300.60~c700.500.60~c300.700.60' },
  { label: 'pegs', o: pegObstacles(4, 5, 28) },
  { label: 'slalom', o: 'l0.300.620.300~l1000.500.380.500~l0.700.620.700' },
  { label: 'funnel', o: 'l60.330.420.620~l940.330.580.620' },
  { label: 'shelf', o: 'l220.560.780.440' },
  { label: 'ring of posts', o: [0, 1, 2, 3, 4, 5, 6, 7].map(k =>
      `c${Math.round(500 + 300 * dcos(k * TAU / 8))}.${Math.round(500 + 210 * dsin(k * TAU / 8))}.40`).join('~') },
  { label: 'clear them all', o: '' },
];

// A handful of sheets worth starting from. Each one is the whole state, so a scene is also
// the shortest way to see what one part of the sidebar is for. `t` is left at the end of
// the timeline unless the scene says otherwise.
const SCENES = [
  { label: '— select scene —' },
  { label: 'Two inks poured', s: {} },
  { label: 'White and gold on black', s: {
      paperColor: '#1d1d1f', ink1: '#f2f1ea', ink2: '#e0b050' } },
  { label: 'Heavy over light', s: {
      start: 'two layers', startAt: 50, startSize: 100, startWobble: 14, streams1: 0,
      streams2: 0, weight1: 40, weight2: -40, gravity: 25, thickness: 25, turbulence: 0,
      swirl: 20, draw1: 'flow lines', draw2: 'flow lines', spacing1: 1.5, spacing2: 1.5,
      inkAt1: 50, inkAt2: 50, length: 8 } },
  { label: 'Drips', s: {
      start: 'two layers', startAt: 22, startSize: 14, startWobble: 20, streams1: 0,
      streams2: 0, weight1: 30, weight2: 50, gravity: 25, thickness: 30, turbulence: 0,
      swirl: 30, length: 12 } },
  { label: 'Lock exchange', s: {
      orientation: 'landscape', start: 'side by side', startAt: 50, startSize: 100,
      streams1: 0, streams2: 0, weight1: 40, weight2: -40, gravity: 20, thickness: 15,
      turbulence: 0, swirl: 15, spacing1: 1.5, spacing2: 1.5, inkAt1: 50, inkAt2: 50,
      length: 8 } },
  { label: 'Head on', s: {
      orientation: 'landscape', side1: 'left', pos1: 50, side2: 'right', pos2: 50,
      weight1: 0, weight2: 0, gravity: 0, speed1: 40, speed2: 40, aim1: 0, aim2: 0,
      wobble1: 4, wobble2: 4, turbulence: 6, length: 12 } },
  { label: 'Vortex street', s: {
      orientation: 'landscape', current: 'from the left', currentSpeed: 30, gravity: 0,
      weight1: 0, weight2: 0, turbulence: 0, swirl: 10,
      streams1: 2, side1: 'left', pos1: 50, spread1: 36, mouth1: 3, speed1: 30, aim1: 0,
      wobble1: 0, streams2: 2, side2: 'left', pos2: 50, spread2: 12, mouth2: 3, speed2: 30,
      aim2: 0, wobble2: 0, obstacles: 'c280.500.55', draw1: 'flow lines',
      draw2: 'flow lines', length: 14 } },
  { label: 'Through the pegs', s: {
      current: 'from the top', currentSpeed: 20, gravity: 0, weight1: 0, weight2: 0,
      streams1: 3, side1: 'top', pos1: 50, spread1: 60, mouth1: 5, speed1: 20, aim1: 0,
      wobble1: 0, streams2: 2, side2: 'top', pos2: 50, spread2: 30, mouth2: 5, speed2: 20,
      aim2: 0, wobble2: 0, turbulence: 4, obstacles: pegObstacles(4, 5, 28), length: 14 } },
  { label: 'Marbling', s: {
      start: 'stripes', startCount: 10, startSize: 50, startWobble: 3, streams1: 0,
      streams2: 0, gravity: 0, turbulence: 0, swirl: 0, thickness: 75,
      stirs: combStirs(7, 36, 6, 6), stirSize: 3, length: 12 } },
  { label: 'Suminagashi', s: {
      start: 'rings', startCount: 10, startSize: 50, startWobble: 6, streams1: 0,
      streams2: 0, gravity: 0, turbulence: 3, eddySize: 30, swirl: 0, thickness: 20,
      stirs: sStir(90, 20), stirSize: 5, draw1: 'outline', draw2: 'outline', length: 10 } },
  { label: 'Honey', s: {
      thickness: 70, speed1: 35, speed2: 30, turbulence: 0, swirl: 0, gravity: 50 } },
  { label: 'Storm', s: {
      start: 'drops', startCount: 10, startSize: 60, streams1: 0, streams2: 0, gravity: 0,
      turbulence: 20, swirl: 50, eddySize: 18, length: 6 } },
  { label: 'Drawn as flow lines', s: { draw1: 'flow lines', draw2: 'flow lines' } },
  { label: 'Drawn hatched', s: { draw1: 'hatching', draw2: 'hatching' } },
  { label: 'Drawn as contours', s: {
      draw1: 'contours', draw2: 'contours', inkAt1: 8, inkAt2: 8 } },
];

const setters   = {};        // settings key -> function that moves its control
const fieldDivs = {};        // settings key -> the .field wrapper, for showing/hiding
let statsDiv, linkDiv, penListDiv, strokeNote;

let area    = null;          // { x0, y0, x1, y1, w, h } — the drawable box, in mm
let shapes  = null;          // { pts, off, ink } — polylines in mm
let strokes = 0;             // how many of them, even when there are too many to draw
let plan    = null;          // { order, flip, ink, travel }
let perPen  = null;          // per pen: { strokes, ink }
let inkMs   = 0;             // how long the lines of the last frame took

////////////////////////////////////////////////////////////////////////////////////////
// The URL is the document
//
// Every setting that differs from its default is written into the hash, debounced, with
// replaceState so the back button stays usable. Opening that link anywhere rebuilds the
// same sheet — the seed, the strokes of the mouse and the moment are in there too.

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
    if (PLAYING || LIVE) { syncUrl(); return; }     // the moment is still moving
    urlWritten = encodeState();
    const b = location.pathname + location.search;
    history.replaceState(null, '', urlWritten ? b + '#' + urlWritten : b);
    if (linkDiv) linkDiv.html(location.href);
  }, 250);
}

function refreshControls() {
  for (const k in setters) if (k in settings) setters[k](settings[k]);
  syncVisibility();
}

function onHashChange() {
  const h = location.hash.replace(/^#/, '');
  if (h === urlWritten) return;                    // our own write coming back
  Object.assign(settings, DEFAULTS);
  applyState(h);
  urlWritten = h;
  PLAYING = false;
  refreshControls();
  resizeForPaper();
  seek(settings.t);
}

////////////////////////////////////////////////////////////////////////////////////////
// Geometry

function paperDims() {
  const [a, b] = PAPER_SIZES[settings.paper] || PAPER_SIZES.A4;
  return settings.orientation === 'portrait' ? [a, b] : [b, a];
}

function widestNib() { return Math.max(settings.nib1, settings.nib2); }

// The pens are round, so ink reaches half a nib past the end of every line: the drawable
// box — the tank — is the sheet less the margin less half the wider nib.
function drawArea() {
  const [W, H] = paperDims();
  const m = settings.margin + widestNib() / 2;
  return { x0: m, y0: m, x1: W - m, y1: H - m, w: W - 2 * m, h: H - 2 * m };
}

function previewScale() {
  const [w, h] = paperDims();
  return Math.min(PREVIEW_MAX_PX / w, PREVIEW_MAX_PX / h);
}

function canvasEl() {
  return document.querySelector('#sheet canvas.p5Canvas');
}

function endStep() { return Math.max(1, Math.round(settings.length * STEPS_PER_S)); }

////////////////////////////////////////////////////////////////////////////////////////
// The tank
//
// The drawable box is the tank, cut into square fluid cells — `res` of them across its
// short side — and each fluid cell into `inkDetail`² ink cells. Everything the fluid step
// reads is worked out here once, in cells and steps: a speed in short sides a second is
// that many cells a step, a gravity so many cells a step², and so on. A tank of the same
// proportions on larger paper is the same grid, and so exactly the same fluid.
//
// The velocity lives on the faces of the cells (u on the upright faces, v on the level
// ones), the pressure in their middles, which is what lets the pressure solve see every
// face a cell has. A face is shut (a wall, the side of an obstacle: nothing crosses it),
// free (the pressure moves it) or held (the current, pouring in at a side at its own
// speed). A side left open is a free face onto water at no pressure: whatever reaches it
// flows out, and water is drawn back in wherever the tank needs it.

let TK = null;                       // the tank as the fluid step reads it
let NX = 0, NY = 0, NC = 0;          // fluid cells across, down and altogether
let KD = 2, DXN = 0, DYN = 0, NDC = 0;
let PW = 0;                          // a row of the pressure grid, which has a ring of ghosts
let U, V, UN, VN, UA, VA, UB, VB, BXU, BYU, BXV, BYV;
let PR, DIVG, INVD, NBL, NBR, NBU, NBD, PIDX, RED, BLACK, NRED = 0, NBLACK = 0;
let UC, VC, CW1, CW2, OM, FXS, FYS, PSI;
let C1, C2, CN1, CN2, CA1, CA2, CB1, CB2, BXD, BYD;
let SOL, DSOL, UF, VF, DSB = new Int32Array(0);
let STROKES = [];                    // the mouse's strokes, in fluid cells
let OBS = [];                        // the obstacles, as the sidebar keeps them
let OBS_MM = [];                     // and on paper
let NZ_TURB = null, NZ_START = null;

function compileTank() {
  const s = settings;
  const short = Math.min(area.w, area.h);
  const R = Math.round(clamp(s.res, 20, 300));
  const nx = Math.max(8, Math.round(R * area.w / short));
  const ny = Math.max(8, Math.round(R * area.h / short));
  const perS = R / STEPS_PER_S, perS2 = R / (STEPS_PER_S * STEPS_PER_S);
  const cur = CURRENTS.indexOf(s.current) - 1;
  const open = [!!s.openLeft, !!s.openRight, !!s.openTop, !!s.openBottom];
  if (cur >= 0) open[cur ^ 1] = true;               // the far side lets the current out
  const g = s.gravity / 100 * G_MAX * perS2, gd = rad(s.gravityDir);
  const th = s.thickness / 100;
  const tk = {
    R, nx, ny, kd: Math.round(clamp(s.inkDetail, 1, 4)),
    open,
    current: { side: cur, speed: s.currentSpeed / 100 * perS },
    gx: g * dsin(gd), gy: g * dcos(gd),
    w1: s.weight1 / 100, w2: s.weight2 / 100,
    turb: s.turbulence / 100 * T_MAX * perS2,
    eddy: Math.max(1, s.eddySize / 100 * R),
    churn: s.churn / 100 / STEPS_PER_S,
    swirl: s.swirl / 100 * SWIRL_MAX,
    nu: NU_MAX * th * th * R * R / STEPS_PER_S,
    bleed: s.bleed / 100 * 0.2,
    drag: DRAG + DRAG_THICK * th * th,
    stirR: Math.max(0.5, s.stirSize / 100 * R),
    stirK: s.stirStrength / 100,
    stirMax: 4 * R / 90,
    start: s.start,
    streams: [],
  };
  for (const k of [1, 2]) {
    const n = Math.round(clamp(s['streams' + k], 0, 8));
    const side = Math.max(0, SIDES.indexOf(s['side' + k]));
    const L = side <= 1 ? ny : nx;
    const rnd = mulberry32(Math.round(s.seed) * 7919 + k * 104729);
    const nrm = [[1, 0], [-1, 0], [0, 1], [0, -1]][side];
    for (let q = 0; q < n; q++) {
      const f = n === 1 ? 0 : q / (n - 1) - 0.5;
      tk.streams.push({
        side, colour: k,
        c: clamp(s['pos' + k] + s['spread' + k] * f, 0, 100) / 100 * L,
        w: Math.max(1, s['mouth' + k] / 100 * L),
        speed: s['speed' + k] / 100 * perS,
        aim: rad(s['aim' + k]), wobble: rad(s['wobble' + k]), pulse: s['pulse' + k] / 100,
        from: Math.round(s['from' + k] * STEPS_PER_S),
        until: Math.round(s['until' + k] * STEPS_PER_S),
        phase: rnd() * TAU,
        nx: nrm[0], ny: nrm[1],
      });
    }
  }
  return tk;
}

function allocTank() {
  const nu = (NX + 1) * NY, nv = NX * (NY + 1);
  const f32 = n => new Float32Array(n), i32 = n => new Int32Array(n);
  U = f32(nu); UN = f32(nu); UA = f32(nu); UB = f32(nu); BXU = f32(nu); BYU = f32(nu);
  V = f32(nv); VN = f32(nv); VA = f32(nv); VB = f32(nv); BXV = f32(nv); BYV = f32(nv);
  PR = f32(PW * (NY + 2));
  DIVG = f32(NC); INVD = f32(NC);
  NBL = i32(NC); NBR = i32(NC); NBU = i32(NC); NBD = i32(NC); PIDX = i32(NC);
  RED = i32(NC); BLACK = i32(NC);
  UC = f32(NC); VC = f32(NC); CW1 = f32(NC); CW2 = f32(NC);
  OM = f32(NC); FXS = f32(NC); FYS = f32(NC);
  PSI = f32((NX + 1) * (NY + 1));
  C1 = f32(NDC); C2 = f32(NDC); CN1 = f32(NDC); CN2 = f32(NDC);
  CA1 = f32(NDC); CA2 = f32(NDC); CB1 = f32(NDC); CB2 = f32(NDC);
  BXD = f32(NDC); BYD = f32(NDC);
  SOL = new Uint8Array(NC); DSOL = new Uint8Array(NDC);
  UF = new Uint8Array(nu); VF = new Uint8Array(nv);
}

// The obstacles on paper and in the fluid. A cell is solid when its middle is inside one —
// a wall never thinner than about a cell and a half, or water would slip through it
// diagonally — and an ink cell is solid when the fluid cell it lies in is, so the ink sees
// exactly the obstacle the water does.
function obstaclesToMm() {
  const short = Math.min(area.w, area.h);
  const hw = settings.wallWidth / 100 * short / 2;
  OBS_MM = OBS.map(o => o.k === 'c'
    ? { k: 0, cx: area.x0 + o.x / 1000 * area.w, cy: area.y0 + o.y / 1000 * area.h,
        r: o.r / 1000 * short }
    : { k: 1, ax: area.x0 + o.x0 / 1000 * area.w, ay: area.y0 + o.y0 / 1000 * area.h,
        bx: area.x0 + o.x1 / 1000 * area.w, by: area.y0 + o.y1 / 1000 * area.h, hw });
}

function distToSeg(px, py, ax, ay, bx, by) {
  const ex = bx - ax, ey = by - ay;
  const l2 = ex * ex + ey * ey;
  let t = l2 > 0 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = px - ax - t * ex, dy = py - ay - t * ey;
  return Math.sqrt(dx * dx + dy * dy);
}

// How far a point on paper is inside an obstacle — above 0 inside, grown by `grow`.
function obstacleAt(x, y, grow) {
  for (const o of OBS_MM) {
    if (o.k === 0) {
      const dx = x - o.cx, dy = y - o.cy, r = o.r + grow;
      if (dx * dx + dy * dy < r * r) return true;
    } else if (distToSeg(x, y, o.ax, o.ay, o.bx, o.by) < o.hw + grow) {
      return true;
    }
  }
  return false;
}

function buildObstacles() {
  SOL.fill(0);
  DSOL.fill(0);
  if (!OBS_MM.length) { DSB = new Int32Array(0); return; }
  const cw = area.w / NX, ch = area.h / NY, cell = 0.5 * (cw + ch);
  for (let j = 0; j < NY; j++) {
    const y = area.y0 + (j + 0.5) * ch;
    for (let i = 0; i < NX; i++) {
      const x = area.x0 + (i + 0.5) * cw;
      for (const o of OBS_MM) {
        const inside = o.k === 0
          ? Math.sqrt((x - o.cx) * (x - o.cx) + (y - o.cy) * (y - o.cy)) < Math.max(o.r, 0.75 * cell)
          : distToSeg(x, y, o.ax, o.ay, o.bx, o.by) < Math.max(o.hw, 0.75 * cell);
        if (inside) { SOL[i + j * NX] = 1; break; }
      }
    }
  }
  for (let b = 0; b < DYN; b++) {
    for (let a = 0; a < DXN; a++) {
      DSOL[a + b * DXN] = SOL[((a / KD) | 0) + ((b / KD) | 0) * NX];
    }
  }
  // the solid ink cells with water beside them, which the ink is carried in from
  const list = [];
  for (let b = 0; b < DYN; b++) {
    for (let a = 0; a < DXN; a++) {
      const d = a + b * DXN;
      if (!DSOL[d]) continue;
      if ((a > 0 && !DSOL[d - 1]) || (a < DXN - 1 && !DSOL[d + 1]) ||
          (b > 0 && !DSOL[d - DXN]) || (b < DYN - 1 && !DSOL[d + DXN])) list.push(d);
    }
  }
  DSB = Int32Array.from(list);
}

// Which faces are shut, free or held, and the pressure stencil of every cell: the padded
// index of each neighbour it has across a free face, or of the corner ghost, which stays 0
// and stands in for the neighbours across shut ones.
function buildFaces() {
  const W = NX + 1, cur = TK.current.side, open = TK.open;
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i <= NX; i++) {
      const L = i > 0 ? !SOL[i - 1 + j * NX] : null;
      const R = i < NX ? !SOL[i + j * NX] : null;
      let k;
      if (L === null) k = R ? (cur === 0 ? 2 : open[0] ? 1 : 0) : 0;
      else if (R === null) k = L ? (cur === 1 ? 2 : open[1] ? 1 : 0) : 0;
      else k = L && R ? 1 : 0;
      UF[i + j * W] = k;
    }
  }
  for (let j = 0; j <= NY; j++) {
    for (let i = 0; i < NX; i++) {
      const T = j > 0 ? !SOL[i + (j - 1) * NX] : null;
      const B = j < NY ? !SOL[i + j * NX] : null;
      let k;
      if (T === null) k = B ? (cur === 2 ? 2 : open[2] ? 1 : 0) : 0;
      else if (B === null) k = T ? (cur === 3 ? 2 : open[3] ? 1 : 0) : 0;
      else k = T && B ? 1 : 0;
      VF[i + j * NX] = k;
    }
  }
  NRED = NBLACK = 0;
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const c = i + j * NX, q = (i + 1) + (j + 1) * PW;
      PIDX[c] = q;
      INVD[c] = 0;
      if (SOL[c]) continue;
      let n = 0;
      NBL[c] = UF[i + j * W] === 1 ? (n++, q - 1) : 0;
      NBR[c] = UF[i + 1 + j * W] === 1 ? (n++, q + 1) : 0;
      NBU[c] = VF[c] === 1 ? (n++, q - PW) : 0;
      NBD[c] = VF[c + NX] === 1 ? (n++, q + PW) : 0;
      if (!n) continue;
      INVD[c] = 1 / n;
      if ((i + j) & 1) BLACK[NBLACK++] = c; else RED[NRED++] = c;
    }
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// The tank at the start
//
// Layers, halves and stripes are laid straight in, their edges pushed about by noise —
// colour 1 above or left of the line, colour 2 below or right of it, and the stripes taking
// turns from the top.
// Rings and drops are dropped the way ink is dropped on water for marbling: a new drop of
// radius r at c pushes everything already there straight out from c, just far enough to
// make room — the point that was at distance d ends up at √(d² + r²) — so the drops before
// it are squeezed into rings round it, and the area of every patch of ink is kept.

function dropInk(cx, cy, r, colour, wobble, k) {
  const W = DXN, H = DYN;
  CA1.set(C1); CA2.set(C2);
  const nz = NZ_START;
  for (let b = 0; b < H; b++) {
    const y = b + 0.5;
    for (let a = 0; a < W; a++) {
      const x = a + 0.5, d = a + b * W;
      const dx = x - cx, dy = y - cy;
      const dd = Math.sqrt(dx * dx + dy * dy);
      let rr = r;
      if (wobble > 0 && dd > 1e-9) rr = r * (1 + wobble * nz(1.7 * dx / dd, 1.7 * dy / dd, 3.1 * k));
      const edge = clamp(rr - dd + 0.5, 0, 1);            // 1 inside, 0 outside, a cell between
      let o1 = 0, o2 = 0;
      if (edge < 1 && dd > rr - 0.5) {
        const q = dd * dd - rr * rr;
        const f = q > 0 ? Math.sqrt(q) / dd : 0;
        const sx = cx + dx * f - 0.5, sy = cy + dy * f - 0.5;
        o1 = samp(CA1, W, H, sx, sy);
        o2 = samp(CA2, W, H, sx, sy);
      }
      const in1 = colour === 1 ? 1 : 0, in2 = colour === 2 ? 1 : 0;
      C1[d] = o1 + edge * (in1 - o1);
      C2[d] = o2 + edge * (in2 - o2);
    }
  }
}

function initialInk() {
  C1.fill(0); C2.fill(0);
  const s = settings, kind = TK.start;
  if (kind === 'clear water') return;
  const W = DXN, H = DYN, short = TK.R * KD;
  const nz = NZ_START;
  const wob = s.startWobble / 100 * short * 0.25;
  const scale = 1 / (0.18 * short);
  const size = clamp(s.startSize, 1, 100) / 100;
  if (kind === 'two layers' || kind === 'side by side') {
    const across = kind === 'side by side';
    const L = across ? W : H;
    const at = clamp(s.startAt, 0, 100) / 100 * L;
    const reach = size * L;                          // how far each layer runs from the line
    for (let b = 0; b < H; b++) {
      for (let a = 0; a < W; a++) {
        const d = a + b * W;
        const u = across ? a + 0.5 : b + 0.5;          // across the line
        const v = across ? b + 0.5 : a + 0.5;          // along it
        const line = at + wob * (nz(v * scale, 0.5, 0.25) + 0.5 * nz(2 * v * scale, 3.5, 1.5));
        const past = u - line;                          // > 0 below, or right of, the line
        const one = clamp(0.5 - past, 0, 1) * clamp(reach + past + 0.5, 0, 1);
        const two = clamp(past + 0.5, 0, 1) * clamp(reach - past + 0.5, 0, 1);
        C1[d] = one; C2[d] = two;
      }
    }
    return;
  }
  if (kind === 'stripes') {
    const n = Math.max(1, Math.round(s.startCount));
    const P = H / n;
    for (let b = 0; b < H; b++) {
      for (let a = 0; a < W; a++) {
        const d = a + b * W, x = a + 0.5;
        const y = b + 0.5 + wob * nz(x * scale, (b + 0.5) / P * 0.37, 2.5);
        const k = Math.floor(y / P);
        const f = y - (k + 0.5) * P;                    // from the middle of its stripe
        const inkd = clamp(0.5 * size * P - Math.abs(f) + 0.5, 0, 1);
        if (k % 2 === 0) C1[d] = inkd; else C2[d] = inkd;
      }
    }
    return;
  }
  const rnd = mulberry32(Math.round(s.seed) * 31337 + 17);
  const n = Math.max(1, Math.round(s.startCount));
  const wobble = s.startWobble / 100 * 0.6;
  if (kind === 'rings') {
    // a drop of clear water, then one of ink, and again: the ink rings come apart with water
    // between them, the way suminagashi alternates ink and a clearing drop
    const each = 0.45 * 0.45 * Math.min(W, H) * Math.min(W, H) / n;
    const ink = Math.sqrt(each * size), clear = Math.sqrt(each * (1 - size));
    for (let k = 0; k < n; k++) {
      if (clear > 0.5) dropInk(W / 2, H / 2, clear, 0, wobble, 2 * k);
      dropInk(W / 2, H / 2, ink, k % 2 ? 2 : 1, wobble, 2 * k + 1);
    }
    return;
  }
  if (kind === 'drops') {
    for (let k = 0; k < n; k++) {
      const r = size * 0.25 * short * (0.45 + 0.55 * rnd());
      const cx = W * (0.12 + 0.76 * rnd()), cy = H * (0.1 + 0.8 * rnd());
      dropInk(cx, cy, r, k % 2 ? 2 : 1, wobble, k);
    }
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Sampling

// Bilinear on a grid W × H of samples, clamped to its edge.
function samp(a, W, H, x, y) {
  let i, j, tx, ty;
  if (x <= 0) { i = 0; tx = 0; } else if (x >= W - 1) { i = W - 2; tx = 1; } else { i = x | 0; tx = x - i; }
  if (y <= 0) { j = 0; ty = 0; } else if (y >= H - 1) { j = H - 2; ty = 1; } else { j = y | 0; ty = y - j; }
  const k = i + j * W;
  const a0 = a[k] + tx * (a[k + 1] - a[k]);
  const a1 = a[k + W] + tx * (a[k + W + 1] - a[k + W]);
  return a0 + ty * (a1 - a0);
}

// The least and the most of the four samples round a point, for MacCormack's clamp.
let LO = 0, HI = 0;
function sampRange(a, W, H, x, y) {
  let i, j;
  if (x <= 0) i = 0; else if (x >= W - 1) i = W - 2; else i = x | 0;
  if (y <= 0) j = 0; else if (y >= H - 1) j = H - 2; else j = y | 0;
  const k = i + j * W;
  let lo = a[k], hi = lo, v = a[k + 1];
  if (v < lo) lo = v; else if (v > hi) hi = v;
  v = a[k + W]; if (v < lo) lo = v; else if (v > hi) hi = v;
  v = a[k + W + 1]; if (v < lo) lo = v; else if (v > hi) hi = v;
  LO = lo; HI = hi;
}

// The velocity anywhere, in fluid cells: u sits on the upright faces, v on the level ones.
function uAt(x, y) { return samp(U, NX + 1, NY, x, y - 0.5); }
function vAt(x, y) { return samp(V, NX, NY + 1, x - 0.5, y); }

// The velocity at the middles of the cells, both parts on the same weights — what carries
// the ink, which has no use for the finer truth of the faces.
let VX = 0, VY = 0;
function velC(x, y) {
  x -= 0.5; y -= 0.5;
  const W = NX, H = NY;
  let i, j, tx, ty;
  if (x <= 0) { i = 0; tx = 0; } else if (x >= W - 1) { i = W - 2; tx = 1; } else { i = x | 0; tx = x - i; }
  if (y <= 0) { j = 0; ty = 0; } else if (y >= H - 1) { j = H - 2; ty = 1; } else { j = y | 0; ty = y - j; }
  const k = i + j * W;
  const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
  VX = UC[k] * w00 + UC[k + 1] * w10 + UC[k + W] * w01 + UC[k + W + 1] * w11;
  VY = VC[k] * w00 + VC[k + 1] * w10 + VC[k + W] * w01 + VC[k + W + 1] * w11;
}

function cellVelocity() {
  const W = NX + 1;
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const c = i + j * NX;
      UC[c] = 0.5 * (U[i + j * W] + U[i + 1 + j * W]);
      VC[c] = 0.5 * (V[c] + V[c + NX]);
    }
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// The fluid step
//
// Carried along itself, pushed, slowed, held at the streams and the current, then made
// divergence-free; then the inks are carried by the new velocity, the streams and the
// stirrer pour theirs in, and what sits inside an obstacle is filled from the water round
// it, so a backtrace that grazes an obstacle brings back ink and not a clean halo.

let SIM_T = 0;                       // the step the tank is at

function stepFluid() {
  const t = SIM_T;
  advectVelocity();
  addForces(t);
  if (TK.nu > 1e-5) diffuseVelocity();
  holdStreams(t);
  project();
  cellVelocity();
  inkIntoObstacles();
  advectInk();
  if (TK.bleed > 0) bleedInk();
  pourStreams(t);
  SIM_T = t + 1;
}

// MacCormack: a backtrace, the same trace run forward from where it landed, and half the
// difference between where that came back to and where it started put back — held inside
// the four samples the backtrace read, so it can sharpen but never overshoot. The trace is
// a midpoint step. Shut and held faces keep what they have.
function advectVelocity() {
  const W = NX + 1;
  for (let j = 0; j < NY; j++) {
    const y = j + 0.5;
    for (let i = 0; i <= NX; i++) {
      const f = i + j * W;
      if (UF[f] !== 1) { UA[f] = U[f]; continue; }
      const mx = i - 0.5 * U[f], my = y - 0.5 * vAt(i, y);
      const bx = i - uAt(mx, my), by = y - vAt(mx, my);
      BXU[f] = bx; BYU[f] = by;
      UA[f] = samp(U, W, NY, bx, by - 0.5);
    }
  }
  for (let j = 0; j <= NY; j++) {
    for (let i = 0; i < NX; i++) {
      const f = i + j * NX;
      if (VF[f] !== 1) { VA[f] = V[f]; continue; }
      const x = i + 0.5;
      const mx = x - 0.5 * uAt(x, j), my = j - 0.5 * V[f];
      const bx = x - uAt(mx, my), by = j - vAt(mx, my);
      BXV[f] = bx; BYV[f] = by;
      VA[f] = samp(V, NX, NY + 1, bx - 0.5, by);
    }
  }
  for (let j = 0; j < NY; j++) {
    const y = j + 0.5;
    for (let i = 0; i <= NX; i++) {
      const f = i + j * W;
      if (UF[f] !== 1) { UN[f] = U[f]; continue; }
      const back = samp(UA, W, NY, 2 * i - BXU[f], 2 * y - BYU[f] - 0.5);
      let q = UA[f] + 0.5 * (U[f] - back);
      sampRange(U, W, NY, BXU[f], BYU[f] - 0.5);
      if (q < LO || q > HI) q = UA[f];
      UN[f] = q;
    }
  }
  for (let j = 0; j <= NY; j++) {
    for (let i = 0; i < NX; i++) {
      const f = i + j * NX;
      if (VF[f] !== 1) { VN[f] = V[f]; continue; }
      const back = samp(VA, NX, NY + 1, 2 * (i + 0.5) - BXV[f] - 0.5, 2 * j - BYV[f]);
      let q = VA[f] + 0.5 * (V[f] - back);
      sampRange(V, NX, NY + 1, BXV[f] - 0.5, BYV[f]);
      if (q < LO || q > HI) q = VA[f];
      VN[f] = q;
    }
  }
  let t = U; U = UN; UN = t;
  t = V; V = VN; VN = t;
}

// Both inks at once: one backtrace, the same weights for both. A backtrace that leaves the
// tank through an open side brings back clean water.
function advectInk() {
  const inv = 1 / KD, W = DXN, H = DYN;
  const oL = TK.open[0], oR = TK.open[1], oT = TK.open[2], oB = TK.open[3];
  for (let b = 0; b < H; b++) {
    const y = (b + 0.5) * inv;
    for (let a = 0; a < W; a++) {
      const d = a + b * W;
      if (DSOL[d]) { CA1[d] = C1[d]; CA2[d] = C2[d]; continue; }
      const x = (a + 0.5) * inv;
      velC(x, y);
      velC(x - 0.5 * VX, y - 0.5 * VY);
      const bxc = x - VX, byc = y - VY;
      if ((bxc < 0 && oL) || (bxc > NX && oR) || (byc < 0 && oT) || (byc > NY && oB)) {
        CA1[d] = 0; CA2[d] = 0; BXD[d] = -1e9; continue;
      }
      const bx = bxc * KD - 0.5, by = byc * KD - 0.5;
      BXD[d] = bx; BYD[d] = by;
      let i, j, tx, ty;
      if (bx <= 0) { i = 0; tx = 0; } else if (bx >= W - 1) { i = W - 2; tx = 1; } else { i = bx | 0; tx = bx - i; }
      if (by <= 0) { j = 0; ty = 0; } else if (by >= H - 1) { j = H - 2; ty = 1; } else { j = by | 0; ty = by - j; }
      const k = i + j * W;
      const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
      CA1[d] = C1[k] * w00 + C1[k + 1] * w10 + C1[k + W] * w01 + C1[k + W + 1] * w11;
      CA2[d] = C2[k] * w00 + C2[k + 1] * w10 + C2[k + W] * w01 + C2[k + W + 1] * w11;
    }
  }
  for (let b = 0; b < H; b++) {
    for (let a = 0; a < W; a++) {
      const d = a + b * W;
      if (DSOL[d] || BXD[d] < -1e8) continue;
      const fx = 2 * a - BXD[d], fy = 2 * b - BYD[d];
      let i, j, tx, ty;
      if (fx <= 0) { i = 0; tx = 0; } else if (fx >= W - 1) { i = W - 2; tx = 1; } else { i = fx | 0; tx = fx - i; }
      if (fy <= 0) { j = 0; ty = 0; } else if (fy >= H - 1) { j = H - 2; ty = 1; } else { j = fy | 0; ty = fy - j; }
      const k = i + j * W;
      const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
      CB1[d] = CA1[k] * w00 + CA1[k + 1] * w10 + CA1[k + W] * w01 + CA1[k + W + 1] * w11;
      CB2[d] = CA2[k] * w00 + CA2[k + 1] * w10 + CA2[k + W] * w01 + CA2[k + W + 1] * w11;
    }
  }
  for (let b = 0; b < H; b++) {
    for (let a = 0; a < W; a++) {
      const d = a + b * W;
      const bx = BXD[d];
      if (DSOL[d] || bx < -1e8) { CN1[d] = CA1[d]; CN2[d] = CA2[d]; continue; }
      const by = BYD[d];
      let i, j;
      if (bx <= 0) i = 0; else if (bx >= W - 1) i = W - 2; else i = bx | 0;
      if (by <= 0) j = 0; else if (by >= H - 1) j = H - 2; else j = by | 0;
      const k = i + j * W;
      let q = CA1[d] + 0.5 * (C1[d] - CB1[d]);
      let lo = C1[k], hi = lo, v = C1[k + 1];
      if (v < lo) lo = v; else if (v > hi) hi = v;
      v = C1[k + W]; if (v < lo) lo = v; else if (v > hi) hi = v;
      v = C1[k + W + 1]; if (v < lo) lo = v; else if (v > hi) hi = v;
      CN1[d] = q < lo || q > hi ? CA1[d] : q;
      q = CA2[d] + 0.5 * (C2[d] - CB2[d]);
      lo = C2[k]; hi = lo; v = C2[k + 1];
      if (v < lo) lo = v; else if (v > hi) hi = v;
      v = C2[k + W]; if (v < lo) lo = v; else if (v > hi) hi = v;
      v = C2[k + W + 1]; if (v < lo) lo = v; else if (v > hi) hi = v;
      CN2[d] = q < lo || q > hi ? CA2[d] : q;
    }
  }
  let t = C1; C1 = CN1; CN1 = t;
  t = C2; C2 = CN2; CN2 = t;
}

function inkIntoObstacles() {
  const W = DXN;
  for (let q = 0; q < DSB.length; q++) {
    const d = DSB[q], a = d % W;
    let s1 = 0, s2 = 0, n = 0;
    if (a > 0 && !DSOL[d - 1]) { s1 += C1[d - 1]; s2 += C2[d - 1]; n++; }
    if (a < W - 1 && !DSOL[d + 1]) { s1 += C1[d + 1]; s2 += C2[d + 1]; n++; }
    if (d >= W && !DSOL[d - W]) { s1 += C1[d - W]; s2 += C2[d - W]; n++; }
    if (d + W < NDC && !DSOL[d + W]) { s1 += C1[d + W]; s2 += C2[d + W]; n++; }
    if (n) { C1[d] = s1 / n; C2[d] = s2 / n; }
  }
}

function bleedInk() {
  const W = DXN, H = DYN, k = TK.bleed;
  for (const [C, T] of [[C1, CA1], [C2, CA2]]) {
    T.set(C);
    for (let b = 0; b < H; b++) {
      for (let a = 0; a < W; a++) {
        const d = a + b * W;
        if (DSOL[d]) continue;
        const c = T[d];
        const l = a > 0 && !DSOL[d - 1] ? T[d - 1] : c, r = a < W - 1 && !DSOL[d + 1] ? T[d + 1] : c;
        const u = b > 0 && !DSOL[d - W] ? T[d - W] : c, w = b < H - 1 && !DSOL[d + W] ? T[d + W] : c;
        C[d] = c + k * (l + r + u + w - 4 * c);
      }
    }
  }
}

// Red-black Gauss–Seidel, over-relaxed, starting from the last step's pressure — which is
// why the pressure is part of every snapshot: the answer depends on where it started.
function project() {
  const W = NX + 1;
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const c = i + j * NX;
      DIVG[c] = SOL[c] ? 0 : U[i + 1 + j * W] - U[i + j * W] + V[c + NX] - V[c];
    }
  }
  const P = PR;
  for (let it = 0; it < P_ITERS; it++) {
    for (let k = 0; k < NRED; k++) {
      const c = RED[k], q = PIDX[c];
      const pn = (P[NBL[c]] + P[NBR[c]] + P[NBU[c]] + P[NBD[c]] - DIVG[c]) * INVD[c];
      P[q] += SOR * (pn - P[q]);
    }
    for (let k = 0; k < NBLACK; k++) {
      const c = BLACK[k], q = PIDX[c];
      const pn = (P[NBL[c]] + P[NBR[c]] + P[NBU[c]] + P[NBD[c]] - DIVG[c]) * INVD[c];
      P[q] += SOR * (pn - P[q]);
    }
  }
  for (let j = 0; j < NY; j++) {
    const r = (j + 1) * PW;
    for (let i = 0; i <= NX; i++) {
      const f = i + j * W, k = UF[f];
      if (k === 1) U[f] -= P[r + i + 1] - P[r + i];
      else if (k === 0) U[f] = 0;
    }
  }
  for (let j = 0; j <= NY; j++) {
    for (let i = 0; i < NX; i++) {
      const f = i + j * NX, k = VF[f];
      if (k === 1) V[f] -= P[(j + 1) * PW + i + 1] - P[j * PW + i + 1];
      else if (k === 0) V[f] = 0;
    }
  }
}

function inkPerCell() {
  const k2 = 1 / (KD * KD);
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      let s1 = 0, s2 = 0;
      for (let b = 0; b < KD; b++) {
        const r = (j * KD + b) * DXN + i * KD;
        for (let a = 0; a < KD; a++) { s1 += C1[r + a]; s2 += C2[r + a]; }
      }
      CW1[i + j * NX] = s1 * k2;
      CW2[i + j * NX] = s2 * k2;
    }
  }
}

// Gravity on ink heavier or lighter than the water; the eddies, the curl of a slow noise,
// so they turn the water over without squeezing it anywhere; the swirl, which finds the
// eddies already there and spins them up (vorticity confinement); the stirrer; and the
// drag of the glass the water is held between — a little for water, a great deal for
// honey, which between two panes stops the moment nothing pushes it. That is what makes
// a thick fluid good for marbling: it moves where it is combed and nowhere else.
function addForces(t) {
  const W = NX + 1, tk = TK;
  if (tk.gx !== 0 || tk.gy !== 0) {
    inkPerCell();
    const w1 = tk.w1, w2 = tk.w2;
    if (tk.gy !== 0) {
      for (let j = 1; j < NY; j++) {
        for (let i = 0; i < NX; i++) {
          const f = i + j * NX;
          if (VF[f] !== 1) continue;
          V[f] += tk.gy * 0.5 * (w1 * (CW1[f - NX] + CW1[f]) + w2 * (CW2[f - NX] + CW2[f]));
        }
      }
    }
    if (tk.gx !== 0) {
      for (let j = 0; j < NY; j++) {
        for (let i = 1; i < NX; i++) {
          const f = i + j * W, a = i - 1 + j * NX;
          if (UF[f] !== 1) continue;
          U[f] += tk.gx * 0.5 * (w1 * (CW1[a] + CW1[a + 1]) + w2 * (CW2[a] + CW2[a + 1]));
        }
      }
    }
  }

  if (tk.turb > 0) {
    // the stream function on a lattice a quarter of an eddy apart, then read at the corners
    const L = tk.eddy, z = t * tk.churn, nz = NZ_TURB;
    const g = Math.max(1, Math.floor(L / 4));
    const cw = Math.floor(NX / g) + 2, ch = Math.floor(NY / g) + 2;
    const coarse = new Float32Array(cw * ch);
    for (let b = 0; b < ch; b++) {
      for (let a = 0; a < cw; a++) {
        const x = a * g / L, y = b * g / L;
        coarse[a + b * cw] = nz(x, y, z) + 0.5 * nz(2 * x + 7.1, 2 * y + 3.3, 2 * z + 1.7);
      }
    }
    const A = tk.turb * L;
    for (let j = 0; j <= NY; j++) {
      for (let i = 0; i <= NX; i++) PSI[i + j * W] = A * samp(coarse, cw, ch, i / g, j / g);
    }
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i <= NX; i++) {
        const f = i + j * W;
        if (UF[f] === 1) U[f] += PSI[i + (j + 1) * W] - PSI[f];
      }
    }
    for (let j = 0; j <= NY; j++) {
      for (let i = 0; i < NX; i++) {
        const f = i + j * NX;
        if (VF[f] === 1) V[f] -= PSI[i + 1 + j * W] - PSI[i + j * W];
      }
    }
  }

  if (tk.swirl > 0) {
    cellVelocity();
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const c = i + j * NX;
        const il = i > 0 ? c - 1 : c, ir = i < NX - 1 ? c + 1 : c;
        const ju = j > 0 ? c - NX : c, jd = j < NY - 1 ? c + NX : c;
        OM[c] = (VC[ir] - VC[il]) / (ir - il || 1) - (UC[jd] - UC[ju]) / ((jd - ju) / NX || 1);
      }
    }
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const c = i + j * NX;
        if (i === 0 || j === 0 || i === NX - 1 || j === NY - 1 || SOL[c]) { FXS[c] = 0; FYS[c] = 0; continue; }
        const nx = 0.5 * (Math.abs(OM[c + 1]) - Math.abs(OM[c - 1]));
        const ny = 0.5 * (Math.abs(OM[c + NX]) - Math.abs(OM[c - NX]));
        const w = OM[c] * tk.swirl / (Math.sqrt(nx * nx + ny * ny) + 1e-6);
        FXS[c] = ny * w;
        FYS[c] = -nx * w;
      }
    }
    for (let j = 0; j < NY; j++) {
      for (let i = 1; i < NX; i++) {
        const f = i + j * W;
        if (UF[f] === 1) U[f] += 0.5 * (FXS[i - 1 + j * NX] + FXS[i + j * NX]);
      }
    }
    for (let j = 1; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const f = i + j * NX;
        if (VF[f] === 1) V[f] += 0.5 * (FYS[f - NX] + FYS[f]);
      }
    }
  }

  stirWater(t);

  const k = 1 - tk.drag;
  for (let f = 0; f < U.length; f++) if (UF[f] === 1) U[f] *= k;
  for (let f = 0; f < V.length; f++) if (VF[f] === 1) V[f] *= k;
}

// Thickness: the velocity diffused into itself, implicitly, a dozen Jacobi sweeps — enough
// to take the small eddies out at once and to slow the large ones down, which is what
// honey looks like. A shut face stays still, so the water drags on walls and obstacles.
function diffuseVelocity() {
  const a = TK.nu, inv = 1 / (1 + 4 * a), W = NX + 1;
  UA.set(U);
  for (let it = 0; it < 12; it++) {
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i <= NX; i++) {
        const f = i + j * W;
        if (UF[f] !== 1) { UB[f] = U[f]; continue; }
        const l = i > 0 ? UA[f - 1] : UA[f], r = i < NX ? UA[f + 1] : UA[f];
        const u = j > 0 ? UA[f - W] : UA[f], d = j < NY - 1 ? UA[f + W] : UA[f];
        UB[f] = (U[f] + a * (l + r + u + d)) * inv;
      }
    }
    const t = UA; UA = UB; UB = t;
  }
  U.set(UA);
  VA.set(V);
  for (let it = 0; it < 12; it++) {
    for (let j = 0; j <= NY; j++) {
      for (let i = 0; i < NX; i++) {
        const f = i + j * NX;
        if (VF[f] !== 1) { VB[f] = V[f]; continue; }
        const l = i > 0 ? VA[f - 1] : VA[f], r = i < NX - 1 ? VA[f + 1] : VA[f];
        const u = j > 0 ? VA[f - NX] : VA[f], d = j < NY ? VA[f + NX] : VA[f];
        VB[f] = (V[f] + a * (l + r + u + d)) * inv;
      }
    }
    const t = VA; VA = VB; VB = t;
  }
  V.set(VA);
}

////////////////////////////////////////////////////////////////////////////////////////
// Streams, the current and the stirrer
//
// A stream is a mouth on one side of the tank, MOUTH_DEPTH cells deep: every face in it is
// held at the stream's velocity before the pressure solve, and every ink cell in it is
// filled with the stream's colour after the ink has moved. The water it pushes out is
// drawn in round the mouth — or through an open side — so a stream in a closed tank is a
// jet stirring the whole of it, and one beside an open side is water poured through. Its
// aim sways by the wobble and its speed surges by the pulse, each on its own phase.

function streamVelocity(st, t) {
  if (t < st.from || (st.until > 0 && t >= st.until)) return false;
  const a = st.aim + st.wobble * dsin(TAU * t / (WOBBLE_S * STEPS_PER_S) + st.phase);
  const sp = st.speed * (1 + st.pulse * dsin(TAU * t / (PULSE_S * STEPS_PER_S) + 1.7 * st.phase));
  const c = dcos(a), s = dsin(a);
  VX = sp * (st.nx * c - st.ny * s);
  VY = sp * (st.ny * c + st.nx * s);
  return true;
}

// The mouth, in fluid cells: [x0, x1, y0, y1].
function mouthBox(st) {
  const D = MOUTH_DEPTH, a = st.c - st.w / 2, b = st.c + st.w / 2;
  switch (st.side) {
    case 0: return [0, D, a, b];
    case 1: return [NX - D, NX, a, b];
    case 2: return [a, b, 0, D];
    default: return [a, b, NY - D, NY];
  }
}

function holdStreams(t) {
  const W = NX + 1;
  for (const st of TK.streams) {
    if (!streamVelocity(st, t)) continue;
    const vx = VX, vy = VY;
    const [x0, x1, y0, y1] = mouthBox(st);
    for (let j = Math.max(0, Math.floor(y0)); j < Math.min(NY, Math.ceil(y1)); j++) {
      const y = j + 0.5;
      if (y < y0 || y > y1) continue;
      for (let i = Math.max(0, Math.ceil(x0)); i <= Math.min(NX, Math.floor(x1)); i++) {
        const f = i + j * W;
        if (UF[f] === 1) U[f] = vx;
      }
    }
    for (let j = Math.max(0, Math.ceil(y0)); j <= Math.min(NY, Math.floor(y1)); j++) {
      for (let i = Math.max(0, Math.floor(x0)); i < Math.min(NX, Math.ceil(x1)); i++) {
        const x = i + 0.5;
        if (x < x0 || x > x1) continue;
        const f = i + j * NX;
        if (VF[f] === 1) V[f] = vy;
      }
    }
  }
  const cu = TK.current;
  if (cu.side >= 0) {
    if (cu.side <= 1) {
      const i = cu.side === 0 ? 0 : NX, v = cu.side === 0 ? cu.speed : -cu.speed;
      for (let j = 0; j < NY; j++) if (UF[i + j * W] === 2) U[i + j * W] = v;
    } else {
      const j = cu.side === 2 ? 0 : NY, v = cu.side === 2 ? cu.speed : -cu.speed;
      for (let i = 0; i < NX; i++) if (VF[i + j * NX] === 2) V[i + j * NX] = v;
    }
  }
}

function pourStreams(t) {
  for (const st of TK.streams) {
    if (t < st.from || (st.until > 0 && t >= st.until)) continue;
    const [x0, x1, y0, y1] = mouthBox(st);
    const A = st.colour === 1 ? C1 : C2, B = st.colour === 1 ? C2 : C1;
    const a0 = Math.max(0, Math.floor(x0 * KD)), a1 = Math.min(DXN, Math.ceil(x1 * KD));
    const b0 = Math.max(0, Math.floor(y0 * KD)), b1 = Math.min(DYN, Math.ceil(y1 * KD));
    for (let b = b0; b < b1; b++) {
      const y = (b + 0.5) / KD;
      if (y < y0 || y > y1) continue;
      for (let a = a0; a < a1; a++) {
        const x = (a + 0.5) / KD;
        if (x < x0 || x > x1) continue;
        const d = a + b * DXN;
        if (DSOL[d]) continue;
        A[d] = 1; B[d] = 0;
      }
    }
  }
  pourStirs(t);
}

// A stroke of the mouse holds the water round the stirrer to the stirrer's own velocity,
// the more so the nearer it is: a round brush of radius stirR, soft to its rim, dragged
// from where the stroke was at step t to where it was at step t + 1.
function strokeAt(st, t) {
  const k = t - st.t0;
  return k >= 0 && k + 1 < st.xs.length ? k : -1;
}

function stirWater(t) {
  const R = TK.stirR, R2 = R * R, W = NX + 1;
  for (const st of STROKES) {
    const k = strokeAt(st, t);
    if (k < 0) continue;
    const ax = st.xs[k], ay = st.ys[k], bx = st.xs[k + 1], by = st.ys[k + 1];
    let vx = (bx - ax) * TK.stirK, vy = (by - ay) * TK.stirK;
    const sp = Math.sqrt(vx * vx + vy * vy);
    if (sp > TK.stirMax) { vx *= TK.stirMax / sp; vy *= TK.stirMax / sp; }
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - R)), x1 = Math.min(NX, Math.ceil(Math.max(ax, bx) + R));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - R)), y1 = Math.min(NY, Math.ceil(Math.max(ay, by) + R));
    for (let j = y0; j < Math.min(NY, y1 + 1); j++) {
      for (let i = x0; i <= x1; i++) {
        const f = i + j * W;
        if (UF[f] !== 1) continue;
        const d = distToSeg(i, j + 0.5, ax, ay, bx, by);
        if (d >= R) continue;
        const q = 1 - d * d / R2, w = STIR_HOLD * q * q;
        U[f] += (vx - U[f]) * w;
      }
    }
    for (let j = y0; j <= y1; j++) {
      for (let i = x0; i < Math.min(NX, x1 + 1); i++) {
        const f = i + j * NX;
        if (VF[f] !== 1) continue;
        const d = distToSeg(i + 0.5, j, ax, ay, bx, by);
        if (d >= R) continue;
        const q = 1 - d * d / R2, w = STIR_HOLD * q * q;
        V[f] += (vy - V[f]) * w;
      }
    }
  }
}

// A stroke that pours lays its colour down under the brush as it goes.
function pourStirs(t) {
  const R = TK.stirR * KD * 0.6, R2 = R * R;
  for (const st of STROKES) {
    if (!st.mode) continue;
    const k = strokeAt(st, t);
    if (k < 0) continue;
    const A = st.mode === 1 ? C1 : C2, B = st.mode === 1 ? C2 : C1;
    const ax = st.xs[k] * KD, ay = st.ys[k] * KD, bx = st.xs[k + 1] * KD, by = st.ys[k + 1] * KD;
    const a0 = Math.max(0, Math.floor(Math.min(ax, bx) - R)), a1 = Math.min(DXN - 1, Math.ceil(Math.max(ax, bx) + R));
    const b0 = Math.max(0, Math.floor(Math.min(ay, by) - R)), b1 = Math.min(DYN - 1, Math.ceil(Math.max(ay, by) + R));
    for (let b = b0; b <= b1; b++) {
      for (let a = a0; a <= a1; a++) {
        const d = a + b * DXN;
        if (DSOL[d]) continue;
        const r = distToSeg(a + 0.5, b + 0.5, ax, ay, bx, by);
        if (r >= R) continue;
        const w = clamp((R - r) / Math.max(1, 0.35 * R), 0, 1);
        if (A[d] < w) A[d] = w;
        if (B[d] > 1 - w) B[d] = 1 - w;
      }
    }
  }
}

// The strokes as the fluid reads them: in fluid cells, from the 1/4000ths they are kept in.
function strokeCells(st) {
  st.xs = st.qx.map(q => q / STIR_Q * NX);
  st.ys = st.qy.map(q => q / STIR_Q * NY);
  return st;
}

////////////////////////////////////////////////////////////////////////////////////////
// Drawing the ink
//
// Each ink is read as a field over the tracing grid: the ink grid with a ring of points
// round it laid on the sides of the tank, so a line runs right up to them; the cells inside
// an obstacle filled in from the water round them, so no line bends round the staircase
// the obstacle is in the fluid; blurred `smoothInk` times. Where the field is at least
// `Ink counts from`, the ink is there, and that region is filled one of four ways:
//
//   echo        lines at a spacing and a half inside the region's edge, then a spacing
//               apart, echoing the edge inwards like the rings of a thumbprint. They are
//               the levels of the distance to the edge — not to the sides of the tank, so a
//               layer lying on the bottom is ruled along its surface and not round it.
//   flow lines  evenly spaced streamlines of the water, flown through the region both ways
//               from a seed until they leave it or come too close to a line already there.
//   hatching    straight lines at a spacing, at whole spacings from the corner of the
//               sheet, so where two inks meet their lines meet too.
//   contours    the levels of the field itself, between `Ink counts from` and full
//               strength — how thick the ink is, as a map's contours give height.
//
// Every line is cut back from the obstacles by half a nib and a little more, and whatever
// comes out shorter than `Shortest line` is left out.

let GW = 0, GH = 0, GXS = null, GYS = null, GDX = 1, GDY = 1, GNEAR = null, GNEAR_KEY = '';
let EL1 = null, EL2 = null, ESTAMP = null, EVIS = null, ETOUCH = null, ESTAMP_N = 0;

function prepareGrid() {
  GW = DXN + 2; GH = DYN + 2;
  GXS = new Float64Array(GW); GYS = new Float64Array(GH);
  GDX = area.w / DXN; GDY = area.h / DYN;
  for (let a = 0; a < GW; a++) GXS[a] = area.x0 + clamp((a - 0.5) * GDX, 0, area.w);
  for (let b = 0; b < GH; b++) GYS[b] = area.y0 + clamp((b - 0.5) * GDY, 0, area.h);
  const ne = 2 * GW * GH;
  if (!EL1 || EL1.length < ne) {
    EL1 = new Int32Array(ne); EL2 = new Int32Array(ne);
    ESTAMP = new Int32Array(ne); EVIS = new Int32Array(ne); ETOUCH = new Int32Array(ne);
    ESTAMP_N = 0;
  }
  // points of the grid near enough to an obstacle for a line through them to need cutting —
  // kept until the obstacles, the grid or the nibs change
  const key = [settings.obstacles, settings.wallWidth, widestNib(), GW, GH, area.x0, area.y0,
               area.w, area.h].join('|');
  if (key === GNEAR_KEY) return;
  GNEAR_KEY = key;
  GNEAR = new Uint8Array(GW * GH);
  if (OBS_MM.length) {
    const reach = widestNib() / 2 + OBST_CLEAR + 1.5 * Math.max(GDX, GDY);
    for (let b = 0; b < GH; b++) {
      for (let a = 0; a < GW; a++) if (obstacleAt(GXS[a], GYS[b], reach)) GNEAR[a + b * GW] = 1;
    }
  }
}

function inkField(C, smooth) {
  const W = DXN, H = DYN;
  const F = Float32Array.from(C);
  if (DSB.length) {
    // obstacles filled from outside in, a ring of cells at a time
    const known = new Uint8Array(NDC);
    let left = 0;
    for (let d = 0; d < NDC; d++) { if (DSOL[d]) left++; else known[d] = 1; }
    let ring = [];
    for (let round = 0; left > 0 && round < 200; round++) {
      ring.length = 0;
      for (let b = 0; b < H; b++) {
        for (let a = 0; a < W; a++) {
          const d = a + b * W;
          if (known[d]) continue;
          let s = 0, n = 0;
          if (a > 0 && known[d - 1]) { s += F[d - 1]; n++; }
          if (a < W - 1 && known[d + 1]) { s += F[d + 1]; n++; }
          if (b > 0 && known[d - W]) { s += F[d - W]; n++; }
          if (b < H - 1 && known[d + W]) { s += F[d + W]; n++; }
          if (n) { F[d] = s / n; ring.push(d); }
        }
      }
      if (!ring.length) break;
      for (const d of ring) known[d] = 1;
      left -= ring.length;
    }
  }
  const G = new Float32Array(GW * GH);
  for (let b = 0; b < GH; b++) {
    const r = clamp(b - 1, 0, H - 1) * W;
    for (let a = 0; a < GW; a++) G[a + b * GW] = F[clamp(a - 1, 0, W - 1) + r];
  }
  if (smooth > 0) {
    const T = new Float32Array(GW * GH);
    for (let n = 0; n < smooth; n++) {
      for (let b = 0; b < GH; b++) {
        for (let a = 0; a < GW; a++) {
          const k = a + b * GW;
          T[k] = 0.5 * G[k] + 0.25 * ((a > 0 ? G[k - 1] : G[k]) + (a < GW - 1 ? G[k + 1] : G[k]));
        }
      }
      for (let b = 0; b < GH; b++) {
        for (let a = 0; a < GW; a++) {
          const k = a + b * GW;
          G[k] = 0.5 * T[k] + 0.25 * ((b > 0 ? T[k - GW] : T[k]) + (b < GH - 1 ? T[k + GW] : T[k]));
        }
      }
    }
  }
  return G;
}

// The field at a point on paper.
function fieldAt(G, x, y) {
  return samp(G, GW, GH, (x - area.x0) / GDX + 0.5, (y - area.y0) / GDY + 0.5);
}

////////////////////////////////////////////////////////////////////////////////////////
// Marching squares, many levels at once
//
// Every cell is filed under each level that passes through it, then the levels are traced
// one at a time: a crossing sits on an edge of the grid, a segment joins two crossings in
// one cell, and the crossings are chained into polylines through the two segments each
// belongs to — the open ones from their ends at the sides of the grid, then the loops.
// A saddle is split the way the middle of its cell says.

const SEG_TABLE = [
  [], [3, 0], [0, 1], [3, 1], [1, 2], null, [0, 2], [3, 2],
  [2, 3], [0, 2], null, [1, 2], [1, 3], [0, 1], [3, 0], [],
];

function traceLevels(G, lo, step, n, emit) {
  if (n <= 0) return;
  const W = GW, H = GH, NH = W * H, CW = W - 1;
  const ncell = (W - 1) * (H - 1);
  const count = new Int32Array(n + 1);
  const kLo = new Int32Array(ncell), kHi = new Int32Array(ncell);
  for (let b = 0; b < H - 1; b++) {
    for (let a = 0; a < W - 1; a++) {
      const p = a + b * W, c = a + b * CW;
      const v0 = G[p], v1 = G[p + 1], v2 = G[p + W + 1], v3 = G[p + W];
      let mn = v0, mx = v0;
      if (v1 < mn) mn = v1; else if (v1 > mx) mx = v1;
      if (v2 < mn) mn = v2; else if (v2 > mx) mx = v2;
      if (v3 < mn) mn = v3; else if (v3 > mx) mx = v3;
      let k0 = Math.floor((mn - lo) / step) + 1, k1 = Math.floor((mx - lo) / step);
      if (k0 < 0) k0 = 0;
      if (k1 > n - 1) k1 = n - 1;
      kLo[c] = k0; kHi[c] = k1;
      for (let k = k0; k <= k1; k++) count[k + 1]++;
    }
  }
  for (let k = 0; k < n; k++) count[k + 1] += count[k];
  const cells = new Int32Array(count[n]);
  const fill = count.slice(0, n);
  for (let c = 0; c < ncell; c++) for (let k = kLo[c]; k <= kHi[c]; k++) cells[fill[k]++] = c;

  let nt = 0;
  const link = (e, f) => {
    if (ESTAMP[e] !== ESTAMP_N) { ESTAMP[e] = ESTAMP_N; EL1[e] = f; EL2[e] = -1; ETOUCH[nt++] = e; }
    else EL2[e] = f;
  };
  const E = [0, 0, 0, 0];
  for (let k = 0; k < n; k++) {
    const lam = lo + k * step;
    ESTAMP_N++;
    nt = 0;
    for (let q = count[k]; q < count[k + 1]; q++) {
      const c = cells[q];
      const a = c % CW, b = (c / CW) | 0, p = a + b * W;
      const v0 = G[p], v1 = G[p + 1], v2 = G[p + W + 1], v3 = G[p + W];
      const cs = (v0 >= lam ? 1 : 0) | (v1 >= lam ? 2 : 0) | (v2 >= lam ? 4 : 0) | (v3 >= lam ? 8 : 0);
      E[0] = p; E[1] = NH + p + 1; E[2] = p + W; E[3] = NH + p;
      if (cs === 5 || cs === 10) {
        const above = (v0 + v1 + v2 + v3) * 0.25 >= lam;
        if ((cs === 5) === above) { link(E[0], E[1]); link(E[1], E[0]); link(E[2], E[3]); link(E[3], E[2]); }
        else { link(E[3], E[0]); link(E[0], E[3]); link(E[1], E[2]); link(E[2], E[1]); }
        continue;
      }
      const s = SEG_TABLE[cs];
      if (!s.length) continue;
      link(E[s[0]], E[s[1]]); link(E[s[1]], E[s[0]]);
    }
    const pt = (e, out) => {
      if (e < NH) {
        const a = e % W, b = (e / W) | 0;
        const t = (lam - G[e]) / (G[e + 1] - G[e]);
        out.push(GXS[a] + t * (GXS[a + 1] - GXS[a]), GYS[b]);
      } else {
        const e2 = e - NH, a = e2 % W, b = (e2 / W) | 0;
        const t = (lam - G[e2]) / (G[e2 + W] - G[e2]);
        out.push(GXS[a], GYS[b] + t * (GYS[b + 1] - GYS[b]));
      }
    };
    const walk = start => {
      const out = [];
      let prev = -1, cur = start;
      for (;;) {
        EVIS[cur] = ESTAMP_N;
        pt(cur, out);
        const nx = EL1[cur] !== prev ? EL1[cur] : EL2[cur];
        if (nx < 0) break;
        if (EVIS[nx] === ESTAMP_N) { if (nx === start) pt(start, out); break; }
        prev = cur; cur = nx;
      }
      if (out.length >= 4) emit(out);
    };
    for (let q = 0; q < nt; q++) {
      const e = ETOUCH[q];
      if (EL2[e] === -1 && EVIS[e] !== ESTAMP_N) walk(e);
    }
    for (let q = 0; q < nt; q++) if (EVIS[ETOUCH[q]] !== ESTAMP_N) walk(ETOUCH[q]);
  }
}

// How far inside the ink every point of the grid is, from the edge where the field crosses
// theta. The points either side of the edge are placed from how steeply the field changes
// there — (f − θ) / |∇f| — and every other point inside by sweeping the eikonal equation
// |∇d| = 1 across the grid four ways, twice. Outside the ink the distance is left negative.
function distanceInside(G, theta) {
  const W = GW, H = GH, N = W * H;
  const h = 0.5 * (GDX + GDY), BIG = 1e9;
  const D = new Float32Array(N);
  const fixed = new Uint8Array(N);
  for (let b = 0; b < H; b++) {
    for (let a = 0; a < W; a++) {
      const p = a + b * W, inside = G[p] >= theta;
      D[p] = inside ? BIG : -BIG;
      const edge = (a > 0 && (G[p - 1] >= theta) !== inside) ||
        (a < W - 1 && (G[p + 1] >= theta) !== inside) ||
        (b > 0 && (G[p - W] >= theta) !== inside) ||
        (b < H - 1 && (G[p + W] >= theta) !== inside);
      if (!edge) continue;
      const al = a > 0 ? a - 1 : a, ar = a < W - 1 ? a + 1 : a;
      const bu = b > 0 ? b - 1 : b, bd = b < H - 1 ? b + 1 : b;
      const gx = (G[ar + b * W] - G[al + b * W]) / Math.max(1e-9, GXS[ar] - GXS[al]);
      const gy = (G[a + bd * W] - G[a + bu * W]) / Math.max(1e-9, GYS[bd] - GYS[bu]);
      const gl = Math.sqrt(gx * gx + gy * gy);
      const d = gl > 1e-9 ? (G[p] - theta) / gl : (inside ? 0.5 * h : -0.5 * h);
      D[p] = inside ? clamp(d, 0, 1.5 * h) : clamp(d, -1.5 * h, 0);
      fixed[p] = 1;
    }
  }
  const h2 = 2 * h * h;
  const upd = p => {
    if (fixed[p] || D[p] < 0) return;
    const a = p % W, b = (p / W) | 0;
    let x = BIG, y = BIG, v;
    if (a > 0 && (v = D[p - 1]) >= 0 && v < x) x = v;
    if (a < W - 1 && (v = D[p + 1]) >= 0 && v < x) x = v;
    if (b > 0 && (v = D[p - W]) >= 0 && v < y) y = v;
    if (b < H - 1 && (v = D[p + W]) >= 0 && v < y) y = v;
    if (x >= BIG && y >= BIG) return;
    const df = x - y;
    const d = df >= h || df <= -h ? (x < y ? x : y) + h : 0.5 * (x + y + Math.sqrt(h2 - df * df));
    if (d < D[p]) D[p] = d;
  };
  for (let round = 0; round < 2; round++) {
    for (let b = 0; b < H; b++) for (let a = 0; a < W; a++) upd(a + b * W);
    for (let b = 0; b < H; b++) for (let a = W - 1; a >= 0; a--) upd(a + b * W);
    for (let b = H - 1; b >= 0; b--) for (let a = 0; a < W; a++) upd(a + b * W);
    for (let b = H - 1; b >= 0; b--) for (let a = W - 1; a >= 0; a--) upd(a + b * W);
  }
  let mx = 0;
  for (let p = 0; p < N; p++) {
    if (D[p] >= BIG) D[p] = -h;            // ink with no edge anywhere — nothing to echo
    else if (D[p] <= -BIG) D[p] = -2 * h;
    else if (D[p] > mx) mx = D[p];
  }
  return { D, max: mx };
}

////////////////////////////////////////////////////////////////////////////////////////
// Flow lines — evenly spaced streamlines, after Jobard & Lefer
//
// A line is flown both ways from its seed, a midpoint step at a time along the direction
// of the water, until it leaves the ink (the edge found by halving, so the lines end on
// it), comes within half a spacing of another line or of its own earlier self, or reaches
// still water. Seeds are laid a spacing to either side of every line drawn, and a lattice
// of seeds twice as coarse is walked for the patches of ink no line has reached.

let FVX = 0, FVY = 0;
function flowAt(x, y) {
  const cx = (x - area.x0) / area.w * NX, cy = (y - area.y0) / area.h * NY;
  FVX = uAt(cx, cy) * area.w / NX;
  FVY = vAt(cx, cy) * area.h / NY;
}

function flowLines(G, theta, sep, minLen, emit) {
  const dTest = 0.5 * sep, h = Math.min(0.5, sep * 0.25), cs = sep;
  const gw = Math.ceil(area.w / cs) + 1, gh = Math.ceil(area.h / cs) + 1;
  const head = new Int32Array(gw * gh).fill(-1);
  let cap = 1 << 15;
  let PX = new Float64Array(cap), PY = new Float64Array(cap);
  let PL = new Int32Array(cap), PI = new Int32Array(cap), PN = new Int32Array(cap);
  let np = 0;
  const dead = [];
  const addPt = (x, y, line, idx) => {
    if (np === cap) {
      cap *= 2;
      const grow = (A, T) => { const B = new T(cap); B.set(A); return B; };
      PX = grow(PX, Float64Array); PY = grow(PY, Float64Array);
      PL = grow(PL, Int32Array); PI = grow(PI, Int32Array); PN = grow(PN, Int32Array);
    }
    const gx = clamp(((x - area.x0) / cs) | 0, 0, gw - 1), gy = clamp(((y - area.y0) / cs) | 0, 0, gh - 1);
    const g = gx + gy * gw;
    PX[np] = x; PY[np] = y; PL[np] = line; PI[np] = idx; PN[np] = head[g]; head[g] = np; np++;
  };
  const skip = Math.ceil(3 * dTest / h) + 2;
  const near = (x, y, dmin, line, idx) => {
    const gx = ((x - area.x0) / cs) | 0, gy = ((y - area.y0) / cs) | 0, d2 = dmin * dmin;
    for (let j = gy - 1; j <= gy + 1; j++) {
      if (j < 0 || j >= gh) continue;
      for (let i = gx - 1; i <= gx + 1; i++) {
        if (i < 0 || i >= gw) continue;
        for (let q = head[i + j * gw]; q >= 0; q = PN[q]) {
          const l = PL[q];
          if (dead[l] || (l === line && Math.abs(PI[q] - idx) < skip)) continue;
          const dx = PX[q] - x, dy = PY[q] - y;
          if (dx * dx + dy * dy < d2) return true;
        }
      }
    }
    return false;
  };
  const inside = (x, y) => x >= area.x0 && x <= area.x1 && y >= area.y0 && y <= area.y1 &&
    fieldAt(G, x, y) >= theta;
  const maxSteps = Math.ceil(3 * (area.w + area.h) / h);

  const fly = (sx, sy, dir, line, out) => {
    let x = sx, y = sy, idx = 0;
    for (let s = 0; s < maxSteps; s++) {
      flowAt(x, y);
      let l = Math.sqrt(FVX * FVX + FVY * FVY);
      if (l < 1e-7) break;
      const mx = x + dir * 0.5 * h * FVX / l, my = y + dir * 0.5 * h * FVY / l;
      flowAt(mx, my);
      l = Math.sqrt(FVX * FVX + FVY * FVY);
      if (l < 1e-7) break;
      const nx = x + dir * h * FVX / l, ny = y + dir * h * FVY / l;
      if (!inside(nx, ny)) {
        let ax = x, ay = y, bx = nx, by = ny;
        for (let it = 0; it < 6; it++) {
          const cx = 0.5 * (ax + bx), cy = 0.5 * (ay + by);
          if (inside(cx, cy)) { ax = cx; ay = cy; } else { bx = cx; by = cy; }
        }
        out.push(ax, ay);
        break;
      }
      idx += dir;
      if (near(nx, ny, dTest, line, idx)) break;
      out.push(nx, ny);
      addPt(nx, ny, line, idx);
      x = nx; y = ny;
    }
  };

  let queue = [], lineId = 0;
  const tryLine = (sx, sy) => {
    if (!inside(sx, sy) || near(sx, sy, sep * 0.99, -1, 0)) return false;
    const line = lineId++;
    dead[line] = false;
    addPt(sx, sy, line, 0);
    const back = [], fwd = [];
    fly(sx, sy, -1, line, back);
    fly(sx, sy, 1, line, fwd);
    const pts = [];
    for (let q = back.length - 2; q >= 0; q -= 2) pts.push(back[q], back[q + 1]);
    pts.push(sx, sy);
    for (let q = 0; q < fwd.length; q++) pts.push(fwd[q]);
    let len = 0;
    for (let q = 2; q < pts.length; q += 2) len += Math.hypot(pts[q] - pts[q - 2], pts[q + 1] - pts[q - 1]);
    if (len < minLen) { dead[line] = true; return false; }
    emit(pts);
    const n = pts.length / 2, every = Math.max(1, Math.round(sep / h / 2));
    for (let q = 0; q < n; q += every) {
      const q0 = Math.max(0, q - 1), q1 = Math.min(n - 1, q + 1);
      let tx = pts[2 * q1] - pts[2 * q0], ty = pts[2 * q1 + 1] - pts[2 * q0 + 1];
      const tl = Math.hypot(tx, ty);
      if (tl < 1e-9) continue;
      tx /= tl; ty /= tl;
      const x = pts[2 * q], y = pts[2 * q + 1];
      queue.push(x - ty * sep, y + tx * sep, x + ty * sep, y - tx * sep);
    }
    return true;
  };
  const lat = 2 * sep;
  for (let y = area.y0 + lat / 2; y < area.y1; y += lat) {
    for (let x = area.x0 + lat / 2; x < area.x1; x += lat) {
      if (!tryLine(x, y)) continue;
      while (queue.length) {
        const q = queue;
        queue = [];
        for (let i = 0; i < q.length; i += 2) tryLine(q[i], q[i + 1]);
      }
    }
  }
}

// Straight hatching across the ink, at whole spacings from the corner of the sheet.
function hatchLines(G, theta, sep, angleDeg, emit) {
  const a = angleDeg * Math.PI / 180;
  const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  let n0 = Infinity, n1 = -Infinity;
  for (const [x, y] of [[area.x0, area.y0], [area.x1, area.y0], [area.x1, area.y1], [area.x0, area.y1]]) {
    const v = x * nx + y * ny;
    if (v < n0) n0 = v;
    if (v > n1) n1 = v;
  }
  const h = Math.min(0.4, 0.5 * Math.min(GDX, GDY));
  const inside = (x, y) => fieldAt(G, x, y) >= theta;
  for (let k = Math.ceil(n0 / sep); k * sep <= n1; k++) {
    const px = nx * k * sep, py = ny * k * sep;
    let t0 = -Infinity, t1 = Infinity;
    if (Math.abs(dx) > 1e-12) {
      let a1 = (area.x0 - px) / dx, a2 = (area.x1 - px) / dx;
      if (a1 > a2) { const t = a1; a1 = a2; a2 = t; }
      t0 = Math.max(t0, a1); t1 = Math.min(t1, a2);
    } else if (px < area.x0 || px > area.x1) continue;
    if (Math.abs(dy) > 1e-12) {
      let a1 = (area.y0 - py) / dy, a2 = (area.y1 - py) / dy;
      if (a1 > a2) { const t = a1; a1 = a2; a2 = t; }
      t0 = Math.max(t0, a1); t1 = Math.min(t1, a2);
    } else if (py < area.y0 || py > area.y1) continue;
    if (!(t1 > t0)) continue;
    const steps = Math.ceil((t1 - t0) / h);
    let run = NaN, prevIn = false, prevT = t0;
    for (let s = 0; s <= steps; s++) {
      const t = s === steps ? t1 : t0 + s * h;
      const on = inside(px + dx * t, py + dy * t);
      if (s === 0) { if (on) run = t; }
      else if (on !== prevIn) {
        let lo = prevT, hi = t;
        for (let it = 0; it < 7; it++) {
          const m = 0.5 * (lo + hi);
          if (inside(px + dx * m, py + dy * m) === prevIn) lo = m; else hi = m;
        }
        const te = 0.5 * (lo + hi);
        if (on) run = te;
        else { emit([px + dx * run, py + dy * run, px + dx * te, py + dy * te]); run = NaN; }
      }
      prevIn = on; prevT = t;
    }
    if (prevIn) emit([px + dx * run, py + dy * run, px + dx * t1, py + dy * t1]);
  }
}

////////////////////////////////////////////////////////////////////////////////////////
// Sinks, obstacles and cut guides
//
// Everything drawn ends up as polylines in millimetres, each with the pen that draws it.
// On the way in each is cut back from the obstacles and shorn of whatever is too short to
// be worth a pen lift.

function makeSink() {
  const pts = [], off = [0], ink = [];
  return {
    pts, off, ink,
    run(p, id) {
      if (p.length < 4) return;
      for (let i = 0; i < p.length; i++) pts.push(p[i]);
      off.push(pts.length / 2);
      ink.push(id);
    },
    // A zero-length path is dropped by most plotter toolchains, so a dot goes down as a
    // hairline stub instead.
    dot(x, y, id) {
      pts.push(x - EPS / 2, y, x + EPS / 2, y);
      off.push(pts.length / 2);
      ink.push(id);
    },
  };
}

function gridNear(x, y) {
  const a = Math.round((x - area.x0) / GDX + 0.5), b = Math.round((y - area.y0) / GDY + 0.5);
  return GNEAR[clamp(a, 0, GW - 1) + clamp(b, 0, GH - 1) * GW] === 1;
}

// A polyline cut by the obstacles and every piece long enough handed to the sink. A long
// segment — a hatch line is one — is walked half a millimetre at a time, so it cannot step
// over an obstacle, and each crossing is found by halving.
function lineLength(p) {
  let len = 0;
  for (let i = 2; i < p.length; i += 2) len += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
  return len;
}

function lay(p, pen, sink) {
  const n = p.length / 2;
  if (n < 2) return;
  const minLen = Math.max(0, settings.minLine);
  if (!OBS_MM.length) {
    if (lineLength(p) >= minLen) sink.run(p, pen);
    return;
  }
  const grow = settings['nib' + (pen + 1)] / 2 + OBST_CLEAR;
  const blocked = (x, y) => gridNear(x, y) && obstacleAt(x, y, grow);
  let run = [];
  const flush = () => {
    if (run.length >= 4 && lineLength(run) >= minLen) sink.run(run, pen);
    run = [];
  };
  let px = p[0], py = p[1], pin = blocked(px, py);
  if (!pin) run.push(px, py);
  for (let i = 1; i < n; i++) {
    const x = p[2 * i], y = p[2 * i + 1];
    const m = Math.max(1, Math.ceil(Math.hypot(x - px, y - py) / 0.5));
    let ax = px, ay = py;
    for (let s = 1; s <= m; s++) {
      const bx = s === m ? x : px + (x - px) * s / m, by = s === m ? y : py + (y - py) * s / m;
      const bin = blocked(bx, by);
      if (bin !== pin) {
        let lo = 0, hi = 1;
        for (let it = 0; it < 10; it++) {
          const t = 0.5 * (lo + hi);
          if (blocked(ax + (bx - ax) * t, ay + (by - ay) * t) === pin) lo = t; else hi = t;
        }
        const t = pin ? hi : lo;
        run.push(ax + (bx - ax) * t, ay + (by - ay) * t);
        if (!pin) flush();                  // into an obstacle: this piece is done
        pin = bin;
      }
      ax = bx; ay = by;
    }
    if (!pin) run.push(x, y);
    px = x; py = y;
  }
  flush();
}

// An obstacle's own outline, for when it is drawn: a circle, or a wall as the stadium its
// thickness makes.
function obstacleOutline(o) {
  const out = [];
  if (o.k === 0) {
    const n = Math.max(24, Math.ceil(TAU * o.r / 0.6));
    for (let i = 0; i <= n; i++) {
      const a = i / n * TAU;
      out.push(o.cx + o.r * Math.cos(a), o.cy + o.r * Math.sin(a));
    }
    return out;
  }
  const ex = o.bx - o.ax, ey = o.by - o.ay, l = Math.hypot(ex, ey) || 1;
  const nx = -ey / l * o.hw, ny = ex / l * o.hw;
  const base = Math.atan2(ny, nx);
  const m = Math.max(8, Math.ceil(Math.PI * o.hw / 0.6));
  for (let i = 0; i <= m; i++) {
    const a = base + i / m * Math.PI;
    out.push(o.bx + o.hw * Math.cos(a), o.by + o.hw * Math.sin(a));
  }
  for (let i = 0; i <= m; i++) {
    const a = base + Math.PI + i / m * Math.PI;
    out.push(o.ax + o.hw * Math.cos(a), o.ay + o.hw * Math.sin(a));
  }
  out.push(out[0], out[1]);
  return out;
}

// Cut guides: a dot in every corner of the sheet and each side split evenly, so no two
// dots are further apart than asked — lay a ruler through two of them and cut.
function cropMarkShapes(sink) {
  const [W, H] = paperDims();
  const step = Math.max(1, settings.cropMarkGap);
  const nx = Math.max(1, Math.ceil(W / step)), ny = Math.max(1, Math.ceil(H / step));
  for (let i = 0; i <= nx; i++) { sink.dot(W * i / nx, 0, INK_MARK); sink.dot(W * i / nx, H, INK_MARK); }
  for (let j = 1; j < ny; j++) { sink.dot(0, H * j / ny, INK_MARK); sink.dot(W, H * j / ny, INK_MARK); }
}

// Both inks, each filled the way its sidebar says.
function buildShapes() {
  const s = settings;
  prepareGrid();
  const sink = makeSink();
  perPen = [{ strokes: 0, ink: 0 }, { strokes: 0, ink: 0 }];
  for (const k of [1, 2]) {
    const mode = s['draw' + k], pen = k - 1;
    if (mode === 'none') continue;
    const G = inkField(k === 1 ? C1 : C2, Math.round(clamp(s.smoothInk, 0, 6)));
    const theta = clamp(s['inkAt' + k], 1, 99) / 100;
    const sep = Math.max(0.05, s['spacing' + k]);
    const put = p => lay(p, pen, sink);
    if (mode === 'echo') {
      const { D, max } = distanceInside(G, theta);
      const n = Math.min(4000, Math.floor((max - 0.5 * sep) / sep) + 1);
      traceLevels(D, 0.5 * sep, sep, n, put);
    } else if (mode === 'flow lines') {
      flowLines(G, theta, sep, Math.max(s.minLine, 2 * sep), put);
    } else if (mode === 'hatching') {
      hatchLines(G, theta, sep, s['hatchAngle' + k], put);
    } else if (mode === 'contours') {
      const n = Math.round(clamp(s['levels' + k], 1, 60));
      traceLevels(G, theta, (1 - theta) / n, n, put);
    }
    if (mode === 'outline' || (s['outline' + k] && mode !== 'contours')) {
      traceLevels(G, theta, 1, 1, put);
    }
  }
  const op = Math.round(s.obstaclePen);
  if (op >= 1 && op <= 2) for (const o of OBS_MM) sink.run(obstacleOutline(o), op - 1);
  if (s.cropMarks) cropMarkShapes(sink);
  for (const id of sink.ink) if (id >= 0) perPen[id].strokes++;
  return {
    pts: Float64Array.from(sink.pts),
    off: Int32Array.from(sink.off),
    ink: Int32Array.from(sink.ink),
  };
}

////////////////////////////////////////////////////////////////////////////////////////
// Stroke order
//
// Greedy nearest-neighbour over stroke endpoints, either end allowed as the entry point,
// with a uniform bucket grid so the search stays local. One pen at a time, cut guides
// first: each colour is a separate pass with a pen of its own. vpype's linesort would redo
// this pass regardless, so it is here only to make the estimate honest.

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

  const eb = new Int32Array(N);
  for (let e = 0; e < N; e++) {
    const cx = Math.min(gw - 1, (ex[e] - minx) / cell | 0);
    const cy = Math.min(gh - 1, (ey[e] - miny) / cell | 0);
    eb[e] = cy * gw + cx;
  }

  const start = new Int32Array(nb + 1);
  for (let e = 0; e < N; e++) start[eb[e] + 1]++;
  for (let k = 0; k < nb; k++) start[k + 1] += start[k];
  const items  = new Int32Array(N);
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
    if (best < 0) {
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
    order[done] = ids[i];
    flip[done]  = best & 1;

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
    const id = sh.ink[i];
    const a = byInk.get(id);
    if (a) a.push(i); else byInk.set(id, [i]);
  }
  const ids = [...byInk.keys()].sort((a, b) => a - b);   // −1, the cut guides, first

  let px = 0, py = 0, at = 0;
  for (const id of ids) {
    const list = byInk.get(id);
    if (settings.optimiseOrder) {
      const g = greedy(sh, list, px, py);
      for (let t = 0; t < g.order.length; t++) { order[at] = g.order[t]; flip[at++] = g.flip[t]; }
      px = g.px; py = g.py;
    } else {
      for (const i of list) { order[at] = i; flip[at++] = 0; }
      const last = sh.off[list[list.length - 1] + 1] - 1;
      px = sh.pts[last * 2]; py = sh.pts[last * 2 + 1];
    }
  }
  return { order, flip, ...measurePlan(sh, order, flip) };
}

// How far the pen draws and how far it travels between strokes — per pen as well as
// altogether, since each colour is a separate pass with a pen of its own.
function measurePlan(sh, order, flip) {
  const { pts, off } = sh;
  let ink = 0, travel = 0, px = 0, py = 0;
  for (const p of perPen) p.travel = 0;
  for (let t = 0; t < order.length; t++) {
    const i = order[t], rev = flip[t] === 1;
    const a = off[i], b = off[i + 1];
    const inA = rev ? b - 1 : a;
    const inB = rev ? a : b - 1;
    const hop = Math.hypot(pts[inA * 2] - px, pts[inA * 2 + 1] - py);
    travel += hop;
    let run = 0;
    for (let k = a; k < b - 1; k++) {
      const ux = pts[(k + 1) * 2] - pts[k * 2], uy = pts[(k + 1) * 2 + 1] - pts[k * 2 + 1];
      run += Math.sqrt(ux * ux + uy * uy);
    }
    ink += run;
    const id = sh.ink[i];
    if (id >= 0 && perPen[id]) { perPen[id].ink += run; perPen[id].travel += hop; }
    px = pts[inB * 2];
    py = pts[inB * 2 + 1];
  }
  return { ink, travel };
}

////////////////////////////////////////////////////////////////////////////////////////
// Time
//
// The fluid is a function of its settings, its strokes and the step: the same three always
// give the same tank. So the timeline keeps a snapshot every KEY_EVERY steps — velocity,
// pressure and both inks — and any step is its nearest snapshot at or before it plus a few
// steps run forward. Changing anything the water depends on throws the snapshots away and
// runs the fluid again from the start up to the step on the sheet, a frame's worth of
// steps at a time, so the page never stops answering; changing only how the ink is drawn
// keeps them all.
//
// A new stroke of the mouse starts wherever the tank is shown, and lets go of whatever was
// going to happen after that — the later strokes, and the snapshots past it — the way
// acting after an undo lets go of the redo.

const FLUID_KEYS = [
  'seed', 'res', 'inkDetail', 'thickness', 'turbulence', 'eddySize', 'churn', 'swirl',
  'gravity', 'gravityDir', 'bleed', 'start', 'startAt', 'startCount', 'startSize',
  'startWobble', 'openLeft', 'openRight', 'openTop', 'openBottom', 'current', 'currentSpeed',
  'weight1', 'streams1', 'side1', 'pos1', 'spread1', 'mouth1', 'speed1', 'aim1', 'wobble1',
  'pulse1', 'from1', 'until1',
  'weight2', 'streams2', 'side2', 'pos2', 'spread2', 'mouth2', 'speed2', 'aim2', 'wobble2',
  'pulse2', 'from2', 'until2',
  'obstacles', 'wallWidth', 'stirSize', 'stirStrength', 'stirs',
];

let TANK_OK = false;
let SIM_SIG = '';
let KEYS = new Map();                // step → snapshot
let KEY_EVERY = 10;
let FRONTIER = 0;                    // the furthest step run since the water last changed
let TARGET = 0;                      // the step the tank is being brought to
let PLAYING = false;
let STEP_MS = 5;                     // one step, on average
let LIVE = null;                     // the stroke the mouse is drawing
let inkDirty = true, inkStale = false, overlayDirty = true, statsDue = true;
let lastStats = 0;

// The fluid grid for the drawable box: `res` cells across its short side.
function gridSize() {
  const short = Math.min(area.w, area.h);
  const R = Math.round(clamp(settings.res, 20, 300));
  return [Math.max(8, Math.round(R * area.w / short)), Math.max(8, Math.round(R * area.h / short))];
}

// The stirrer's size and strength matter only to the strokes it has made.
function fluidSignature() {
  const idle = !settings.stirs;
  return FLUID_KEYS.map(k => idle && (k === 'stirSize' || k === 'stirStrength') ? '-' : settings[k])
    .join('|') + '|' + gridSize().join('x');
}

// The obstacles, read afresh every time since the paper may have changed under them, and
// the fluid built again if anything it depends on has moved.
function ensureTank() {
  area = drawArea();
  if (area.w <= 1 || area.h <= 1) { TANK_OK = false; return; }
  OBS = parseObstacles(settings.obstacles);
  obstaclesToMm();
  const sig = fluidSignature();
  if (TANK_OK && sig === SIM_SIG) return;
  resetFluid();
  SIM_SIG = sig;
}

function resetFluid() {
  TK = compileTank();
  const same = U && TK.nx === NX && TK.ny === NY && TK.kd === KD;
  NX = TK.nx; NY = TK.ny; NC = NX * NY; KD = TK.kd;
  DXN = NX * KD; DYN = NY * KD; NDC = DXN * DYN; PW = NX + 2;
  if (!same) allocTank();
  buildObstacles();
  buildFaces();
  const seed = Math.round(settings.seed);
  NZ_TURB = makePerlin3(seed * 5 + 1);
  NZ_START = makePerlin3(seed * 5 + 2);
  STROKES = parseStirs(settings.stirs).map(strokeCells);
  U.fill(0); V.fill(0); PR.fill(0);
  initialInk();
  SIM_T = 0;
  KEYS = new Map([[0, snapshot()]]);
  const bytes = 4 * (U.length + V.length + PR.length + 2 * NDC);
  KEY_EVERY = Math.max(10, Math.ceil(endStep() / Math.max(1, Math.floor(MAX_KEY_BYTES / bytes) - 1)));
  FRONTIER = 0;
  TARGET = clamp(Math.round(settings.t), 0, endStep());
  TANK_OK = true;
  inkDirty = true;
}

function snapshot() {
  const s = new Float32Array(U.length + V.length + PR.length + 2 * NDC);
  let o = 0;
  s.set(U, o); o += U.length;
  s.set(V, o); o += V.length;
  s.set(PR, o); o += PR.length;
  s.set(C1, o); o += NDC;
  s.set(C2, o);
  return s;
}

function restore(k) {
  const s = KEYS.get(k);
  let o = 0;
  U.set(s.subarray(o, o += U.length));
  V.set(s.subarray(o, o += V.length));
  PR.set(s.subarray(o, o += PR.length));
  C1.set(s.subarray(o, o += NDC));
  C2.set(s.subarray(o, o += NDC));
  SIM_T = k;
}

function keyBefore(t) {
  let k = Math.floor(t / KEY_EVERY) * KEY_EVERY;
  while (k > 0 && !KEYS.has(k)) k -= KEY_EVERY;
  return k;
}

function stepAndKeep() {
  stepFluid();
  if (SIM_T % KEY_EVERY === 0 && !KEYS.has(SIM_T)) KEYS.set(SIM_T, snapshot());
  if (SIM_T > FRONTIER) FRONTIER = SIM_T;
}

// Steps towards the target until the frame's budget is spent.
function advance(budgetMs) {
  const t0 = performance.now();
  let n = 0;
  while (SIM_T < TARGET) {
    stepAndKeep();
    n++;
    if (performance.now() - t0 > budgetMs) break;
  }
  if (n) STEP_MS = 0.7 * STEP_MS + 0.3 * (performance.now() - t0) / n;
}

function seek(t) {
  if (!TANK_OK) return;
  t = Math.round(clamp(t, 0, endStep()));
  TARGET = t;
  settings.t = t;
  const k = keyBefore(t);
  if (t < SIM_T || k > SIM_T) { restore(k); inkDirty = true; }
  overlayDirty = true;
  syncUrl();
}

function togglePlay() {
  if (!TANK_OK) return;
  if (PLAYING) {
    PLAYING = false;
    TARGET = SIM_T;
    settings.t = SIM_T;
    inkDirty = true;
    syncUrl();
  } else {
    if (SIM_T >= endStep()) seek(0);
    PLAYING = true;
  }
  updateTransport();
}

function stepBy(d) {
  PLAYING = false;
  seek(settings.t + d);
  updateTransport();
}

// Everything after step T is let go.
function cutFuture(T) {
  STROKES = STROKES.filter(st => st.t0 < T);
  for (const st of STROKES) {
    const keep = T - st.t0 + 1;
    if (st.qx.length > keep) {
      st.qx.length = st.qy.length = st.xs.length = st.ys.length = keep;
    }
  }
  forgetAfter(T);
}

function forgetAfter(T) {
  for (const k of [...KEYS.keys()]) if (k > T) KEYS.delete(k);
  if (FRONTIER > T) FRONTIER = T;
  if (SIM_T > T) { restore(keyBefore(T)); inkDirty = true; }
}

// The strokes have changed from inside: write them back into the settings, and take the
// fluid as already matching them, since it has been kept in step all along.
function strokesChanged() {
  settings.stirs = encodeStirs(STROKES);
  SIM_SIG = fluidSignature();
  if (strokeNote) strokeNote.html(strokeSummary());
  syncUrl();
}

function strokeSummary() {
  const n = STROKES.length;
  if (!n) return 'No strokes yet.';
  const steps = STROKES.reduce((s, st) => s + st.qx.length - 1, 0);
  return `${n} stroke${n > 1 ? 's' : ''}, ${(steps / STEPS_PER_S).toFixed(1)} s of stirring, ` +
    `${settings.stirs.length} characters of the link.`;
}

function undoStroke() {
  if (!STROKES.length || LIVE) return;
  const st = STROKES.pop();
  forgetAfter(st.t0);
  strokesChanged();
}

function clearStrokes() {
  if (!STROKES.length || LIVE) return;
  const first = Math.min(...STROKES.map(st => st.t0));
  STROKES = [];
  forgetAfter(first);
  strokesChanged();
}

// A stroke begins at the step on show, whatever the tank was doing.
function startStroke(mode, cx, cy) {
  if (!TANK_OK) return;
  TARGET = SIM_T;
  settings.t = SIM_T;
  cutFuture(SIM_T);
  const qx = Math.round(clamp(cx / NX, -0.1, 1.1) * STIR_Q), qy = Math.round(clamp(cy / NY, -0.1, 1.1) * STIR_Q);
  const st = { mode, t0: SIM_T, qx: [qx], qy: [qy], xs: [qx / STIR_Q * NX], ys: [qy / STIR_Q * NY] };
  STROKES.push(st);
  LIVE = { st, sx: cx, sy: cy, mx: cx, my: cy };
}

// One sample a step, kept exactly as a replay will read it back.
function recordSample(cx, cy) {
  const st = LIVE.st;
  const qx = Math.round(clamp(cx / NX, -0.1, 1.1) * STIR_Q), qy = Math.round(clamp(cy / NY, -0.1, 1.1) * STIR_Q);
  st.qx.push(qx); st.qy.push(qy);
  st.xs.push(qx / STIR_Q * NX); st.ys.push(qy / STIR_Q * NY);
}

function endStroke() {
  if (!LIVE) return;
  const st = LIVE.st;
  LIVE = null;
  if (st.qx.length < 2) STROKES.splice(STROKES.indexOf(st), 1);
  strokesChanged();
  inkDirty = true;
}

// A frame of the fluid: while a stroke is being drawn, a few steps with the stirrer following
// the mouse; while playing, a few steps; otherwise whatever is left of a catch-up. The
// stirrer is a spoon in a liquid, not the pointer: each step it closes a share of the way
// to the mouse, so a hand that moves in jerks — and mouse events do not come once a step —
// still stirs in one smooth sweep.
function runFluid() {
  if (!TANK_OK) return false;
  const t0 = SIM_T, speed = Math.max(1, Math.round(settings.playSpeed));
  if (LIVE) {
    for (let k = 0; k < speed; k++) {
      LIVE.sx += (LIVE.mx - LIVE.sx) * STIR_FOLLOW;
      LIVE.sy += (LIVE.my - LIVE.sy) * STIR_FOLLOW;
      recordSample(LIVE.sx, LIVE.sy);
      stepAndKeep();
    }
    TARGET = SIM_T;
    settings.t = SIM_T;
    if (SIM_T >= endStep()) {
      settings.length = Math.ceil(SIM_T / STEPS_PER_S) + 5;
      if (setters.length) setters.length(settings.length);
    }
  } else {
    if (PLAYING) {
      const end = endStep();
      if (SIM_T >= end) {
        PLAYING = false;
        settings.t = SIM_T;
        TARGET = SIM_T;
        inkDirty = true;
        syncUrl();
      } else {
        TARGET = Math.min(end, SIM_T + speed);
        settings.t = TARGET;
      }
    }
    if (SIM_T < TARGET) advance(PLAYING ? PLAY_BUDGET_MS : CATCH_BUDGET_MS);
  }
  return SIM_T !== t0;
}

// Right away, however long it takes — for an export, which has to be of the step asked for.
function catchUpNow() {
  if (!TANK_OK) return;
  while (SIM_T < TARGET) stepAndKeep();
  if (inkDirty || inkStale) { rebuildInk(); inkDirty = false; inkStale = false; drawPreview(); }
}

function busy() { return !!LIVE || PLAYING || (TANK_OK && SIM_T !== TARGET); }

function rebuildInk() {
  const t0 = performance.now();
  shapes = plan = null;
  strokes = 0;
  if (TANK_OK) {
    shapes = buildShapes();
    strokes = shapes.off.length - 1;
    if (strokes > MAX_STROKES) shapes = null;
    else plan = orderShapes(shapes);
  }
  inkMs = performance.now() - t0;
}

////////////////////////////////////////////////////////////////////////////////////////

function setup() {
  applyState(location.hash.replace(/^#/, ''));
  urlWritten = encodeState();
  window.addEventListener('hashchange', onHashChange);
  window.addEventListener('resize', applyCanvasDisplay);
  area = drawArea();

  const [w, h] = paperDims();
  const s = previewScale();
  pixelDensity(1);
  createCanvas(Math.round(w * s), Math.round(h * s)).parent('sheet');
  OVERLAY = document.createElement('canvas');
  OVERLAY.className = 'overlay';
  document.getElementById('sheet').appendChild(OVERLAY);
  sizeOverlay();
  applyCanvasDisplay();
  buildControls();
  buildTransport();
  attachPointer();
  attachKeys();

  ensureTank();
  const fresh = !location.hash.replace(/^#/, '');
  if (fresh) { seek(0); PLAYING = true; }
  else seek(settings.t);
  syncVisibility();
}

function draw() {
  if (runFluid()) { inkDirty = true; overlayDirty = true; }
  render();
}

// While the fluid moves, lines that take too long wait for it to stop and the wash stands
// in for them — but they are timed again now and then, since the first build of all is
// slow while the browser is still compiling this file.
let lastInkTry = 0;

function render() {
  const now = performance.now();
  if (inkDirty) {
    if (!busy() || inkMs < INK_LIVE_MS) {
      rebuildInk();
      inkDirty = false;
      inkStale = false;
    } else {
      inkStale = true;
      if (now - lastInkTry > 1500) {
        lastInkTry = now;
        rebuildInk();
        if (inkMs < INK_LIVE_MS) { inkDirty = false; inkStale = false; }
      }
    }
    drawPreview();
    statsDue = true;
    updateTransport();
  }
  if (overlayDirty) { drawOverlay(); overlayDirty = false; }
  if (statsDue && (!busy() || now - lastStats > 300)) {
    updateStats();
    statsDue = false;
    lastStats = now;
  }
}

// Something in the sidebar moved.
function update() {
  ensureTank();
  inkDirty = true;
  overlayDirty = true;
  statsDue = true;
  syncVisibility();
  updateTransport();
  syncUrl();
}

function applyCanvasDisplay() {
  const [pw, ph] = paperDims();
  const box = document.getElementById('canvas-container');
  const aw = box ? box.clientWidth - 48 : MAX_PREVIEW_W, ah = box ? box.clientHeight - 48 : MAX_PREVIEW_H;
  const scale = Math.max(0.5, Math.min(aw / pw, ah / ph));
  for (const c of [canvasEl(), OVERLAY]) {
    if (!c) continue;
    c.style.width  = pw * scale + 'px';
    c.style.height = ph * scale + 'px';
  }
}

function sizeOverlay() {
  const c = canvasEl();
  if (!OVERLAY || !c) return;
  OVERLAY.width = c.width;
  OVERLAY.height = c.height;
}

function resizeForPaper() {
  const [w, h] = paperDims();
  const s = previewScale();
  resizeCanvas(Math.round(w * s), Math.round(h * s));
  sizeOverlay();
  applyCanvasDisplay();
  update();
}

////////////////////////////////////////////////////////////////////////////////////////
// Preview
//
// The strokes are drawn straight on the canvas from the same polylines the SVG exports,
// in the colours and at the nibs the plotter will use, on a sheet the colour of the paper.
// Under them, faintly, the ink itself as a wash — and while the fluid runs faster than
// the lines can follow, the wash alone, stronger. The guides sit on a canvas of their own
// over the sheet, so the stirrer following the mouse never redraws the lines.

let OVERLAY = null;
let WASH = null, WASH_IMG = null;

function inkColor(id) {
  if (id === INK_MARK) return '#888888';
  return id === 1 ? settings.ink2 : settings.ink1;
}

function darkPaper() {
  const [r, g, b] = hexRgb(settings.paperColor).map(v => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.45;
}

function drawPreview() {
  background(settings.paperColor);
  if (!TANK_OK) return;
  const s = previewScale(), ctx = drawingContext;
  const wash = inkStale || !shapes ? Math.max(settings.showDye, 70) : settings.showDye;
  if (wash > 0) drawWash(ctx, s, wash / 100);
  if (shapes && plan && !inkStale) drawStrokes(ctx, s);
}

function drawWash(ctx, s, alpha) {
  if (!WASH || WASH.width !== DXN || WASH.height !== DYN) {
    WASH = document.createElement('canvas');
    WASH.width = DXN; WASH.height = DYN;
    WASH_IMG = WASH.getContext('2d').createImageData(DXN, DYN);
  }
  const p = hexRgb(settings.paperColor), a = hexRgb(settings.ink1), b = hexRgb(settings.ink2);
  const px = WASH_IMG.data;
  for (let d = 0; d < NDC; d++) {
    const c1 = clamp(C1[d], 0, 1) * alpha, c2 = clamp(C2[d], 0, 1) * alpha, o = 4 * d;
    if (DSOL[d]) {
      px[o] = px[o + 1] = px[o + 2] = 128; px[o + 3] = Math.round(90 * Math.min(1, alpha * 2));
      continue;
    }
    px[o]     = p[0] + (a[0] - p[0]) * c1 + (b[0] - p[0]) * c2;
    px[o + 1] = p[1] + (a[1] - p[1]) * c1 + (b[1] - p[1]) * c2;
    px[o + 2] = p[2] + (a[2] - p[2]) * c1 + (b[2] - p[2]) * c2;
    px[o + 3] = 255;
  }
  WASH.getContext('2d').putImageData(WASH_IMG, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(WASH, area.x0 * s, area.y0 * s, area.w * s, area.h * s);
  ctx.restore();
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
    ctx.strokeStyle = inkColor(id);
    ctx.lineWidth = id === 1 ? settings.nib2 : id === 0 ? settings.nib1 : widestNib();
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

// The tank's sides — dashed where they are open — the streams' mouths with the way each
// is pouring at this step, the current, the obstacles when they are not drawn, the strokes
// of the mouse near this step, and the stirrer or the obstacle being placed.
function drawOverlay() {
  if (!OVERLAY) return;
  const ctx = OVERLAY.getContext('2d');
  ctx.clearRect(0, 0, OVERLAY.width, OVERLAY.height);
  if (!TANK_OK) return;
  const s = previewScale(), dark = darkPaper();
  const guide = dark ? 'rgba(130, 175, 255, 0.7)' : 'rgba(26, 109, 209, 0.6)';
  ctx.save();
  ctx.scale(s, s);
  const lw = 1.2 / s;

  if (settings.showGuides) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = guide;
    const sides = [[area.x0, area.y0, area.x0, area.y1], [area.x1, area.y0, area.x1, area.y1],
                   [area.x0, area.y0, area.x1, area.y0], [area.x0, area.y1, area.x1, area.y1]];
    for (let k = 0; k < 4; k++) {
      ctx.setLineDash(TK.open[k] ? [4 / s, 4 / s] : []);
      ctx.beginPath();
      ctx.moveTo(sides[k][0], sides[k][1]);
      ctx.lineTo(sides[k][2], sides[k][3]);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // the streams
    const cw = area.w / NX, ch = area.h / NY;
    for (const st of TK.streams) {
      const on = streamVelocity(st, SIM_T);
      const [x0, x1, y0, y1] = mouthBox(st);
      const mx = area.x0 + (x0 + x1) / 2 * cw, my = area.y0 + (y0 + y1) / 2 * ch;
      ctx.strokeStyle = ctx.fillStyle = on ? inkColor(st.colour - 1) : guide;
      ctx.globalAlpha = on ? 0.9 : 0.5;
      ctx.lineWidth = 2 * lw;
      ctx.beginPath();
      if (st.side <= 1) {
        const x = st.side === 0 ? area.x0 : area.x1;
        ctx.moveTo(x, area.y0 + y0 * ch); ctx.lineTo(x, area.y0 + y1 * ch);
      } else {
        const y = st.side === 2 ? area.y0 : area.y1;
        ctx.moveTo(area.x0 + x0 * cw, y); ctx.lineTo(area.x0 + x1 * cw, y);
      }
      ctx.stroke();
      if (on) {
        const sp = Math.hypot(VX, VY) || 1, L = 10;
        arrow(ctx, mx, my, mx + VX / sp * L, my + VY / sp * L, lw * 1.5, 2.5);
      }
      ctx.globalAlpha = 1;
    }
    // the current
    const cu = TK.current;
    if (cu.side >= 0) {
      ctx.strokeStyle = ctx.fillStyle = guide;
      const n = 5;
      for (let i = 1; i <= n; i++) {
        const f = i / (n + 1);
        const [x, y, dx, dy] = [
          [area.x0 + 2, area.y0 + f * area.h, 1, 0], [area.x1 - 2, area.y0 + f * area.h, -1, 0],
          [area.x0 + f * area.w, area.y0 + 2, 0, 1], [area.x0 + f * area.w, area.y1 - 2, 0, -1],
        ][cu.side];
        arrow(ctx, x, y, x + dx * 8, y + dy * 8, lw, 2);
      }
    }
    // gravity, in the corner
    if (settings.gravity > 0 && (TK.w1 !== 0 || TK.w2 !== 0)) {
      const gl = Math.hypot(TK.gx, TK.gy) || 1;
      const cx = area.x1 - 8, cy = area.y0 + 8;
      ctx.strokeStyle = ctx.fillStyle = guide;
      arrow(ctx, cx - TK.gx / gl * 4, cy - TK.gy / gl * 4, cx + TK.gx / gl * 4, cy + TK.gy / gl * 4, lw, 1.8);
    }
    // the strokes, faintly, and the stretch of each that is stirring now
    ctx.lineWidth = lw;
    for (const st of STROKES) {
      if (st.xs.length < 2) continue;
      const col = st.mode ? inkColor(st.mode - 1) : guide;
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      for (let i = 0; i < st.xs.length; i++) {
        const x = area.x0 + st.xs[i] * cw, y = area.y0 + st.ys[i] * ch;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
      const k = SIM_T - st.t0;
      if (k >= 0 && k < st.xs.length) {
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(area.x0 + st.xs[k] * cw, area.y0 + st.ys[k] * ch, TK.stirR * cw, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  // obstacles not drawn by a pen are drawn here, dashed, whatever the guides
  const drawn = settings.obstaclePen >= 1;
  if (!drawn || settings.showGuides) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = dark ? 'rgba(255, 255, 255, 0.55)' : 'rgba(0, 0, 0, 0.45)';
    ctx.setLineDash(drawn ? [] : [3 / s, 3 / s]);
    for (const o of OBS_MM) {
      const p = obstacleOutline(o);
      ctx.beginPath();
      for (let i = 0; i < p.length; i += 2) {
        if (i) ctx.lineTo(p[i], p[i + 1]); else ctx.moveTo(p[i], p[i + 1]);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // what the mouse is doing
  if (PLACING) {
    ctx.strokeStyle = guide;
    ctx.lineWidth = 1.5 * lw;
    ctx.beginPath();
    if (PLACING.k === 'c') {
      ctx.arc(PLACING.ax, PLACING.ay, Math.hypot(PLACING.bx - PLACING.ax, PLACING.by - PLACING.ay), 0, TAU);
    } else {
      const hw = settings.wallWidth / 100 * Math.min(area.w, area.h) / 2;
      const p = obstacleOutline({ k: 1, ax: PLACING.ax, ay: PLACING.ay, bx: PLACING.bx, by: PLACING.by, hw });
      for (let i = 0; i < p.length; i += 2) { if (i) ctx.lineTo(p[i], p[i + 1]); else ctx.moveTo(p[i], p[i + 1]); }
    }
    ctx.stroke();
  } else if (LIVE) {
    // the stirrer itself, trailing the mouse
    ctx.strokeStyle = LIVE.st.mode ? inkColor(LIVE.st.mode - 1) : guide;
    ctx.lineWidth = 2 * lw;
    ctx.beginPath();
    ctx.arc(area.x0 + LIVE.sx * area.w / NX, area.y0 + LIVE.sy * area.h / NY, TK.stirR * area.w / NX, 0, TAU);
    ctx.stroke();
  } else if (HOVER && TOOL === 'stir') {
    ctx.strokeStyle = guide;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(HOVER[0], HOVER[1], TK.stirR * area.w / NX, 0, TAU);
    ctx.stroke();
  } else if (HOVER && TOOL === 'erase') {
    const o = obstacleUnder(HOVER[0], HOVER[1]);
    if (o >= 0) {
      ctx.strokeStyle = '#d33';
      ctx.lineWidth = 2 * lw;
      const p = obstacleOutline(OBS_MM[o]);
      ctx.beginPath();
      for (let i = 0; i < p.length; i += 2) { if (i) ctx.lineTo(p[i], p[i + 1]); else ctx.moveTo(p[i], p[i + 1]); }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function arrow(ctx, x0, y0, x1, y1, lw, head) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(a - 0.45), y1 - head * Math.sin(a - 0.45));
  ctx.lineTo(x1 - head * Math.cos(a + 0.45), y1 - head * Math.sin(a + 0.45));
  ctx.closePath();
  ctx.fill();
}

////////////////////////////////////////////////////////////////////////////////////////
// Mouse and keys
//
// With the stirrer, dragging across the sheet stirs the water — shift-drag pours colour 1
// as it goes, alt-drag or a right-drag colour 2 — and a click without a drag stops or
// starts the fluid. The fluid runs while it is being stirred, playing or not: a stroke is
// a stretch of time. The wheel sizes the stirrer. With the obstacle tools, a drag lays a
// circle from its middle out, or a wall from end to end, and a click with the eraser
// takes away the obstacle under it.

let TOOL = 'stir';
let PRESS = null;                    // the button is down: where, and doing what
let PLACING = null;                  // an obstacle being laid, in mm
let HOVER = null;                    // the pointer over the sheet, in mm
let toolButtons = {};

function paperPoint(e) {
  const c = canvasEl();
  const r = c.getBoundingClientRect();
  const [W, H] = paperDims();
  return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
}

function mmToCells(p) {
  return [(p[0] - area.x0) / area.w * NX, (p[1] - area.y0) / area.h * NY];
}

function obstacleUnder(x, y) {
  for (let i = OBS_MM.length - 1; i >= 0; i--) {
    const o = OBS_MM[i];
    const d = o.k === 0 ? Math.hypot(x - o.cx, y - o.cy) - o.r : distToSeg(x, y, o.ax, o.ay, o.bx, o.by) - o.hw;
    if (d < 2.5) return i;
  }
  return -1;
}

function setTool(t) {
  TOOL = TOOLS.includes(t) ? t : 'stir';
  for (const k in toolButtons) toolButtons[k].classList.toggle('on', k === TOOL);
  overlayDirty = true;
}

function attachPointer() {
  const c = canvasEl();
  if (!c) return;
  c.addEventListener('contextmenu', e => e.preventDefault());

  c.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.button !== 2) return;
    if (!TANK_OK) return;
    const p = paperPoint(e);
    PRESS = { x: e.clientX, y: e.clientY, p, moved: false,
              mode: e.shiftKey ? 1 : (e.altKey || e.button === 2) ? 2 : 0 };
    if (TOOL === 'circle' || TOOL === 'line') {
      PLACING = { k: TOOL === 'circle' ? 'c' : 'l', ax: p[0], ay: p[1], bx: p[0], by: p[1] };
    } else if (TOOL === 'erase') {
      const o = obstacleUnder(p[0], p[1]);
      if (o >= 0) {
        OBS.splice(o, 1);
        settings.obstacles = encodeObstacles(OBS);
        update();
      }
    }
    c.setPointerCapture(e.pointerId);
    overlayDirty = true;
    e.preventDefault();
  });

  c.addEventListener('pointermove', e => {
    const p = paperPoint(e);
    HOVER = p;
    overlayDirty = true;
    if (!PRESS) return;
    if (!PRESS.moved && Math.hypot(e.clientX - PRESS.x, e.clientY - PRESS.y) < 3) return;
    if (!PRESS.moved) {
      PRESS.moved = true;
      if (TOOL === 'stir') {
        const [cx, cy] = mmToCells(PRESS.p);
        startStroke(PRESS.mode, cx, cy);
        c.classList.add('stirring');
      }
    }
    if (PLACING) { PLACING.bx = p[0]; PLACING.by = p[1]; }
    if (LIVE) [LIVE.mx, LIVE.my] = mmToCells(p);
    e.preventDefault();
  });

  const end = e => {
    if (!PRESS) return;
    const press = PRESS;
    PRESS = null;
    c.classList.remove('stirring');
    if (LIVE) endStroke();
    else if (PLACING) {
      const P = PLACING;
      PLACING = null;
      const short = Math.min(area.w, area.h);
      const rx = x => (x - area.x0) / area.w * 1000, ry = y => (y - area.y0) / area.h * 1000;
      const len = Math.hypot(P.bx - P.ax, P.by - P.ay);
      if (len >= 1) {
        OBS.push(P.k === 'c'
          ? { k: 'c', x: rx(P.ax), y: ry(P.ay), r: len / short * 1000 }
          : { k: 'l', x0: rx(P.ax), y0: ry(P.ay), x1: rx(P.bx), y1: ry(P.by) });
        settings.obstacles = encodeObstacles(OBS);
        update();
      }
    } else if (TOOL === 'stir' && !press.moved && e && e.type === 'pointerup') {
      togglePlay();
    }
    overlayDirty = true;
    if (e) e.preventDefault();
  };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', end);
  c.addEventListener('pointerleave', () => { if (!PRESS) { HOVER = null; overlayDirty = true; } });

  c.addEventListener('wheel', e => {
    e.preventDefault();
    if (TOOL !== 'stir' || LIVE) return;
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    settings.stirSize = +clamp(settings.stirSize * Math.exp(-delta * 0.0015), 1, 40).toFixed(1);
    if (setters.stirSize) setters.stirSize(settings.stirSize);
    if (TK) TK.stirR = Math.max(0.5, settings.stirSize / 100 * TK.R);
    overlayDirty = true;
    settleStirSize();
  }, { passive: false });
}

// The stirrer's size is part of the fluid — every stroke is replayed with it — so a turn
// of the wheel runs the fluid again once the wheel has stopped.
let stirTimer = null;
function settleStirSize() {
  if (stirTimer) clearTimeout(stirTimer);
  stirTimer = setTimeout(() => { stirTimer = null; update(); }, 350);
}

function attachKeys() {
  window.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable ||
        (t.tagName === 'INPUT' && !['checkbox', 'button', 'color'].includes(t.type)))) return;
    if (e.metaKey || e.ctrlKey || PRESS) return;
    const s = settings, big = e.shiftKey ? 10 : 1;
    const reseed = v => {
      s.seed = v;
      if (setters.seed) setters.seed(s.seed);
      update();
    };
    switch (e.key) {
      case ' ': togglePlay(); break;
      case 'ArrowLeft': stepBy(-big); break;
      case 'ArrowRight': stepBy(big); break;
      case 'Home': PLAYING = false; seek(0); updateTransport(); break;
      case 'End': PLAYING = false; seek(endStep()); updateTransport(); break;
      case 'r': case 'R': reseed(Math.floor(Math.random() * 100000)); break;
      case '[': reseed(Math.max(0, Math.round(s.seed) - 1)); break;
      case ']': reseed(Math.round(s.seed) + 1); break;
      case 'g': case 'G':
        s.showGuides = !s.showGuides;
        if (setters.showGuides) setters.showGuides(s.showGuides);
        overlayDirty = true;
        syncUrl();
        break;
      case 'w': case 'W':
        s.showDye = s.showDye > 0 ? 0 : DEFAULTS.showDye || 12;
        if (setters.showDye) setters.showDye(s.showDye);
        drawPreview();
        syncUrl();
        break;
      case 's': case 'S': case 'Escape': setTool('stir'); break;
      case 'o': case 'O': setTool('circle'); break;
      case 'l': case 'L': setTool('line'); break;
      case 'x': case 'X': setTool('erase'); break;
      case 'z': case 'Z': case 'Backspace': undoStroke(); break;
      default: return;
    }
    e.preventDefault();
  });
}

////////////////////////////////////////////////////////////////////////////////////////
// The bar under the sheet
//
// Back to the start, a step back, play, a step on, to the end; the timeline, with the
// stretch already run shaded in, dragged to go anywhere in it; the clock; and the tools.

let TR = null;

function buildTransport() {
  const bar = document.getElementById('transport');
  const btn = (label, title, fn, cls) => {
    const b = document.createElement('button');
    b.innerHTML = label;
    b.title = title;
    if (cls) b.className = cls;
    b.addEventListener('click', e => { fn(); b.blur(); e.preventDefault(); });
    bar.appendChild(b);
    return b;
  };
  btn('&#x21E4;', 'Back to the start (Home)', () => { PLAYING = false; seek(0); updateTransport(); });
  btn('&#x25C2;', 'A step back (←, with shift ten)', () => stepBy(-1));
  const play = btn('&#x25B6;&#xFE0E;', 'Play or stop (space, or a click on the sheet)', togglePlay, 'play');
  btn('&#x25B8;', 'A step on (→, with shift ten)', () => stepBy(1));
  btn('&#x21E5;', 'To the end (End)', () => { PLAYING = false; seek(endStep()); updateTransport(); });

  const scrub = document.createElement('div');
  scrub.className = 'scrub';
  scrub.innerHTML = '<div class="track"></div><div class="done"></div><div class="played"></div><div class="knob"></div>';
  bar.appendChild(scrub);
  const clock = document.createElement('div');
  clock.className = 'clock';
  bar.appendChild(clock);

  const tools = document.createElement('div');
  tools.className = 'tools';
  bar.appendChild(tools);
  const tb = (key, label, title) => {
    const b = document.createElement('button');
    b.innerHTML = label;
    b.title = title;
    b.addEventListener('click', e => { setTool(key); b.blur(); e.preventDefault(); });
    tools.appendChild(b);
    toolButtons[key] = b;
  };
  tb('stir', 'stir', 'Drag to stir, shift-drag to pour colour 1, alt- or right-drag colour 2 (S)');
  tb('circle', '&#x25CB; post', 'Drag out a round obstacle from its middle (O)');
  tb('line', '&#x2571; wall', 'Drag a wall from end to end (L)');
  tb('erase', 'erase', 'Click an obstacle to take it away (X)');
  setTool(TOOL);

  const seekAt = e => {
    const r = scrub.getBoundingClientRect();
    PLAYING = false;
    seek(clamp((e.clientX - r.left) / r.width, 0, 1) * endStep());
    updateTransport();
  };
  scrub.addEventListener('pointerdown', e => {
    if (LIVE) return;
    scrub.setPointerCapture(e.pointerId);
    scrub.dragging = true;
    seekAt(e);
  });
  scrub.addEventListener('pointermove', e => { if (scrub.dragging) seekAt(e); });
  const up = () => { scrub.dragging = false; };
  scrub.addEventListener('pointerup', up);
  scrub.addEventListener('pointercancel', up);

  TR = { play, scrub, clock,
         done: scrub.querySelector('.done'), played: scrub.querySelector('.played'),
         knob: scrub.querySelector('.knob') };
  updateTransport();
}

function updateTransport() {
  if (!TR) return;
  const end = endStep();
  const f = v => clamp(v / end, 0, 1) * 100 + '%';
  TR.done.style.width = f(FRONTIER);
  TR.played.style.width = f(SIM_T);
  TR.knob.style.left = f(TARGET);
  TR.play.innerHTML = PLAYING ? '&#x275A;&#x275A;' : '&#x25B6;&#xFE0E;';
  const catching = TANK_OK && !PLAYING && !LIVE && SIM_T !== TARGET;
  TR.clock.innerHTML = catching
    ? `running the fluid up to <b>${(TARGET / STEPS_PER_S).toFixed(1)} s</b> · ${Math.round(100 * SIM_T / Math.max(1, TARGET))} %`
    : `<b>${(SIM_T / STEPS_PER_S).toFixed(1)} s</b> of ${settings.length} s · step ${SIM_T}`;
}

////////////////////////////////////////////////////////////////////////////////////////
// The sidebar
//
// A slider that changes the water runs the fluid again when it is let go, not while it is
// dragged — every one of them means rerunning the fluid from the start. One that changes
// only how the ink is drawn follows the drag live.

let downloadButtons = [];

function addSection(parent, title) {
  createDiv(title).parent(parent).class('section');
}

function setVisible(key, on) {
  if (fieldDivs[key]) fieldDivs[key].style('display', on ? '' : 'none');
}

function isFluid(key) { return FLUID_KEYS.includes(key); }

function syncVisibility() {
  const s = settings;
  setVisible('cropMarkGap', s.cropMarks);

  const st = s.start;
  setVisible('startAt', st === 'two layers' || st === 'side by side');
  setVisible('startCount', st === 'stripes' || st === 'rings' || st === 'drops');
  setVisible('startSize', st !== 'clear water');
  setVisible('startWobble', st !== 'clear water');
  setVisible('currentSpeed', s.current !== 'none');
  setVisible('gravityDir', s.gravity > 0);
  setVisible('eddySize', s.turbulence > 0);
  setVisible('churn', s.turbulence > 0);

  for (const k of [1, 2]) {
    const on = s['streams' + k] > 0;
    for (const f of ['side', 'pos', 'mouth', 'speed', 'aim', 'wobble', 'pulse', 'from', 'until']) {
      setVisible(f + k, on);
    }
    setVisible('spread' + k, s['streams' + k] > 1);
    const d = s['draw' + k];
    setVisible('spacing' + k, d === 'echo' || d === 'flow lines' || d === 'hatching');
    setVisible('levels' + k, d === 'contours');
    setVisible('hatchAngle' + k, d === 'hatching');
    setVisible('inkAt' + k, d !== 'none');
    setVisible('outline' + k, d === 'echo' || d === 'flow lines' || d === 'hatching');
  }
  refreshPenList();
}

function applyScene(sc) {
  Object.assign(settings, DEFAULTS, sc.s || {});
  if (!sc.s || !('t' in sc.s)) settings.t = endStep();
  refreshControls();
  resizeForPaper();
  seek(0);
  PLAYING = true;
  updateTransport();
}

function resetAll() {
  applyScene({ s: {} });
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

// What a change is: the water (run it again once let go), the ink (draw it again, live) or
// the preview alone.
function changed(key, live) {
  if (key === 'length') { clampToLength(); return; }
  if (isFluid(key)) { if (!live) update(); return; }
  if (key === 'showDye' || key.startsWith('ink') && !key.startsWith('inkAt') || key === 'paperColor') {
    refreshPenList();
    drawPreview();
    overlayDirty = true;
    if (!live) syncUrl();
    return;
  }
  if (key === 'showGuides') { overlayDirty = true; syncUrl(); return; }
  if (['nib1', 'nib2', 'margin'].includes(key)) { if (!live) update(); return; }
  inkDirty = true;
  statsDue = true;
  syncVisibility();
  if (!live) syncUrl();
}

function clampToLength() {
  const end = endStep();
  if (settings.t > end) seek(end);
  if (FRONTIER > end) FRONTIER = end;
  updateTransport();
  syncUrl();
}

function addSlider(parent, labelText, key, min, max, step, hint) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const row = createDiv('').parent(field).class('row');
  const sl  = createSlider(min, max, settings[key], step).parent(row);
  const num = createInput(String(settings[key])).parent(row);
  num.attribute('type', 'text');           // type=number rejects "." in a comma locale
  num.attribute('inputmode', 'decimal');
  if (hint) createDiv(hint).parent(field).class('note');

  setters[key] = v => { sl.value(v); num.value(String(v)); };
  sl.input(() => {
    settings[key] = Number(sl.value());
    num.value(String(settings[key]));
    if (!isFluid(key)) changed(key, true);
    else syncVisibility();
  });
  sl.changed(() => changed(key, false));
  num.input(() => {
    const v = parseNum(num.value());
    if (v === null) return;
    settings[key] = clamp(v, min, max);
    sl.value(settings[key]);
    changed(key, false);
  });
  return sl;
}

function addSelect(parent, labelText, key, options, hint, after) {
  const field = createDiv('').parent(parent).class('field');
  fieldDivs[key] = field;
  createSpan(labelText).parent(field).class('label');
  const sel = createSelect().parent(field);
  for (const o of options) sel.option(o);
  sel.selected(settings[key]);
  if (hint) createDiv(hint).parent(field).class('note');
  setters[key] = v => sel.selected(v);
  sel.changed(() => {
    settings[key] = sel.value();
    if (after) after(); else changed(key, false);
    syncVisibility();
  });
  return sel;
}

function addCheckbox(parent, labelText, key) {
  const row = createDiv('').parent(parent).class('checkbox-row');
  fieldDivs[key] = row;
  const cb = createCheckbox(labelText, settings[key]).parent(row);
  setters[key] = v => cb.checked(!!v);
  cb.changed(() => {
    settings[key] = cb.checked();
    syncVisibility();
    changed(key, false);
  });
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
    changed(key, true);
  });
  cp.changed(() => syncUrl());
  return cp;
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
  createDiv('The eddies, the sway of the streams, where the drops fall and how uneven ' +
    'the edges are. <b>R</b> rolls a new one, <b>[</b> and <b>]</b> step through them.')
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

function addColourStreams(root, k) {
  addSection(root, `Colour ${k}`);
  addSlider(root, 'Weight (%)', 'weight' + k, -100, 100, 1,
    k === 1 ? 'How much heavier than the water the ink is: it sinks, and below 0 it rises. ' +
      'Nothing happens either way without <b>Gravity</b>.' : '');
  addSlider(root, 'Streams', 'streams' + k, 0, 8, 1,
    k === 1 ? 'How many streams pour this ink in. Several are spread along one side.' : '');
  addSelect(root, 'From the side', 'side' + k, SIDES);
  addSlider(root, 'Where along it (%)', 'pos' + k, 0, 100, 1);
  addSlider(root, 'Spread over (%)', 'spread' + k, 0, 100, 1);
  addSlider(root, 'Mouth (% of the side)', 'mouth' + k, 1, 60, 0.5);
  addSlider(root, 'Speed (% of the tank a second)', 'speed' + k, 0, 150, 1);
  addSlider(root, 'Aim (°)', 'aim' + k, -80, 80, 1,
    k === 1 ? 'Tilted off square to its side; above 0 it turns clockwise on the sheet.' : '');
  addSlider(root, 'Sway (°)', 'wobble' + k, 0, 80, 1,
    k === 1 ? 'The aim swinging to and fro, once every three seconds — a hose in a hand.' : '');
  addSlider(root, 'Surge (%)', 'pulse' + k, 0, 100, 1,
    k === 1 ? 'The speed rising and falling, twice as often.' : '');
  addSlider(root, 'Pours from (s)', 'from' + k, 0, 120, 0.5);
  addSlider(root, 'Stops at (s)', 'until' + k, 0, 120, 0.5,
    k === 1 ? '0 pours to the end. A stream stopped early leaves its ink to settle and curl.' : '');
}

function addDrawing(root, k) {
  addSection(root, `Drawing colour ${k}`);
  addSelect(root, 'Drawn as', 'draw' + k, DRAWS,
    k === 1 ? '<b>echo</b> — lines inside the ink\'s edge, a spacing apart, like the rings of ' +
      'a thumbprint.<br><b>flow lines</b> — evenly spaced lines along the current through ' +
      'the ink.<br><b>hatching</b> — straight lines across it.<br><b>contours</b> — how ' +
      'thick the ink is, as a map gives height.<br><b>outline</b> — its edge alone.' : '');
  addSlider(root, 'Spacing (mm)', 'spacing' + k, 0.2, 8, 0.05);
  addSlider(root, 'Ink counts from (%)', 'inkAt' + k, 1, 95, 1,
    k === 1 ? 'How thick the ink has to be to be drawn. The water thins it as it mixes, so ' +
      'lower keeps more of a spread-out cloud, higher keeps only its heart.' : '');
  addSlider(root, 'Levels', 'levels' + k, 1, 40, 1);
  addSlider(root, 'Hatch angle (°)', 'hatchAngle' + k, -90, 90, 1);
  addCheckbox(root, 'Draw the edge as well', 'outline' + k);
}

function buildControls() {
  const root = select('#controls');

  addSection(root, 'Scene');
  const sceneSel = createSelect().parent(createDiv('').parent(root).class('field'));
  for (const sc of SCENES) sceneSel.option(sc.label);
  sceneSel.changed(() => {
    const sc = SCENES[sceneSel.elt.selectedIndex];
    if (sc && sc.s) applyScene(sc);
    sceneSel.elt.selectedIndex = 0;
  });

  // --- Time ---
  addSection(root, 'Time');
  addSlider(root, 'Length (s)', 'length', 1, 120, 1,
    'How far the timeline under the sheet runs. The moment it stands at is the one drawn and ' +
    'exported; drag it anywhere, or play the fluid through.');
  addSlider(root, 'Playback (steps a frame)', 'playSpeed', 1, 8, 1,
    'A second of the fluid is 30 steps. Stirring runs at the same pace.');

  // --- Pens ---
  addSection(root, 'Pens');
  addColor(root, 'Colour 1', 'ink1');
  addSlider(root, 'Nib 1 (mm)', 'nib1', 0.05, 2, 0.05);
  addColor(root, 'Colour 2', 'ink2');
  addSlider(root, 'Nib 2 (mm)', 'nib2', 0.05, 2, 0.05,
    'One pen per colour, one pass of the plotter each. The nib sets the line in the preview ' +
    'and in the file, and half the wider one is taken off the margin.');
  addColor(root, 'Paper colour', 'paperColor',
    'The preview only — the files have no background.');

  // --- Paper ---
  addSection(root, 'Paper');
  addSelect(root, 'Size', 'paper', Object.keys(PAPER_SIZES), null, resizeForPaper);
  addSelect(root, 'Orientation', 'orientation', ['portrait', 'landscape'], null, resizeForPaper);
  addSlider(root, 'Margin (mm)', 'margin', 0, 60, 1,
    'The tank is the sheet inside the margin. The fluid is counted in cells, so a tank of ' +
    'the same proportions — a larger A size with the margin grown with it — runs exactly the ' +
    'same fluid, only larger.');
  addCheckbox(root, 'Cut guide dots around the sheet', 'cropMarks');
  addSlider(root, 'Most between two dots (mm)', 'cropMarkGap', 20, 600, 5);

  // --- The water ---
  addSection(root, 'The water');
  addSeedField(root);
  addSlider(root, 'Thickness', 'thickness', 0, 100, 1,
    'From thin as water at 0 to thick as honey at 100: the thicker, the fewer and larger the ' +
    'eddies and the slower everything settles.');
  addSlider(root, 'Turbulence', 'turbulence', 0, 100, 1,
    'Eddies stirred into the water all the time, the way a draught or a warm radiator would.');
  addSlider(root, 'Eddy size (%)', 'eddySize', 2, 60, 1);
  addSlider(root, 'Churn (%)', 'churn', 0, 200, 1,
    'How fast the eddies change their minds.');
  addSlider(root, 'Swirl', 'swirl', 0, 100, 1,
    'Keeps the eddies already there spinning, where the fluid would smear them out: more ' +
    'curls, tighter.');
  addSlider(root, 'Gravity', 'gravity', 0, 100, 1,
    'Pulls on each ink by its weight — see <b>Colour 1</b> and <b>2</b>.');
  addSlider(root, 'Gravity pulls toward (°)', 'gravityDir', -180, 180, 1,
    '0 down the sheet, 90 to the right, 180 up.');
  addSlider(root, 'Bleed', 'bleed', 0, 100, 1,
    'The inks spreading into the water on their own, softening every edge.');
  addSlider(root, 'Resolution (cells)', 'res', 30, 240, 1,
    'Fluid cells across the short side of the tank. More is finer eddies and a slower fluid.');
  addSlider(root, 'Ink detail', 'inkDetail', 1, 4, 1,
    'Ink cells to a fluid cell, each way. The ink is carried on a finer grid than the water, ' +
    'which is what keeps its edges sharp.');

  // --- The tank ---
  addSection(root, 'The tank at the start');
  addSelect(root, 'Start with', 'start', STARTS,
    '<b>two layers</b> — colour 1 over colour 2; <b>side by side</b> — colour 1 on the left; ' +
    '<b>stripes</b> — across the tank, taking turns; <b>rings</b> — dropped one into the ' +
    'other in the middle, as for marbling; <b>drops</b> — scattered, each pushing the ' +
    'ones before it aside.');
  addSlider(root, 'Where they meet (%)', 'startAt', 0, 100, 1);
  addSlider(root, 'How many', 'startCount', 1, 40, 1);
  addSlider(root, 'How much ink (%)', 'startSize', 1, 100, 1,
    'How far the layers run from where they meet, how much of each stripe is ink, how big the ' +
    'rings and drops are.');
  addSlider(root, 'Uneven (%)', 'startWobble', 0, 100, 1);
  addCheckbox(root, 'Open on the left', 'openLeft');
  addCheckbox(root, 'Open on the right', 'openRight');
  addCheckbox(root, 'Open at the top', 'openTop');
  addCheckbox(root, 'Open at the bottom', 'openBottom');
  createDiv('An open side lets water out and in — a stream then pours through the tank ' +
    'instead of churning it. Dashed on the sheet.').parent(root).class('note');
  addSelect(root, 'Current', 'current', CURRENTS,
    'Clean water flowing in across a whole side and out of the far one, which opens itself.');
  addSlider(root, 'Current speed (%)', 'currentSpeed', 0, 100, 1);

  addColourStreams(root, 1);
  addColourStreams(root, 2);

  // --- Obstacles ---
  addSection(root, 'Obstacles');
  const obsSel = createSelect().parent(createDiv('').parent(root).class('field'));
  for (const o of OBSTACLE_SETS) obsSel.option(o.label);
  obsSel.changed(() => {
    const o = OBSTACLE_SETS[obsSel.elt.selectedIndex];
    obsSel.elt.selectedIndex = 0;
    if (!o || o.o === undefined) return;
    settings.obstacles = o.o;
    update();
  });
  createDiv('Or lay them by hand: <b>O</b> and a drag lays a post from its middle out, ' +
    '<b>L</b> and a drag a wall from end to end, <b>X</b> and a click takes one away; ' +
    '<b>S</b> goes back to stirring. The tools are also under the sheet.')
    .parent(root).class('note');
  addSlider(root, 'Wall thickness (%)', 'wallWidth', 0.3, 10, 0.1);
  addSlider(root, 'Outlined by pen', 'obstaclePen', 0, 2, 1,
    'At <b>0</b> an obstacle is left blank — the ink stops short of it and draws it by its ' +
    'absence. Otherwise its outline goes to that pen.');

  // --- Stirring ---
  addSection(root, 'Stirring');
  createDiv('Drag across the sheet to stir; <b>shift</b>-drag pours colour 1 as it stirs, ' +
    '<b>alt</b>- or right-drag colour 2. The fluid runs while you stir. A click stops or ' +
    'starts it. Every stroke goes into the link, one sample a step, so the sheet is ' +
    'reproduced exactly.').parent(root).class('note');
  addSlider(root, 'Stirrer size (%)', 'stirSize', 1, 40, 0.5,
    'Of the short side. The wheel over the sheet sizes it too.');
  addSlider(root, 'Stirrer strength (%)', 'stirStrength', 0, 300, 1);
  strokeNote = createDiv(strokeSummary()).parent(root).class('note');
  const stirRow = createDiv('').parent(root).class('btn-row');
  createButton('Undo last stroke').parent(stirRow).mousePressed(undoStroke);
  createButton('Clear strokes').parent(stirRow).mousePressed(clearStrokes);

  addDrawing(root, 1);
  addDrawing(root, 2);

  addSection(root, 'Lines');
  addSlider(root, 'Smoothing', 'smoothInk', 0, 6, 1,
    'Blurs of the ink before it is traced — rounder lines, and the smallest wisps gone.');
  addSlider(root, 'Shortest line (mm)', 'minLine', 0, 10, 0.1,
    'A line shorter than this is left out: a pen lift for a speck.');

  // --- Output ---
  addSection(root, 'Output');
  addCheckbox(root, 'Order the strokes for the plotter', 'optimiseOrder');
  addCheckbox(root, 'Show the guides', 'showGuides');
  addSlider(root, 'Ink under the lines (%)', 'showDye', 0, 100, 1,
    'The ink itself as a wash, in the preview only. <b>W</b> shows and hides it.');

  downloadButtons = [];
  for (const k of [1, 2]) {
    const b = createButton('').parent(root).class('primary');
    b.mousePressed(() => exportSvg(k));
    downloadButtons.push(b);
  }
  const both = createButton('Download SVG [both colours]').parent(root);
  both.mousePressed(() => exportSvg(0));
  createDiv('One file a colour, each a pass of the plotter with its own pen; the cut ' +
    'guides go into both, so the passes line up. The file with both is for looking at.')
    .parent(root).class('note');
  const row = createDiv('').parent(root).class('btn-row');
  createButton('Copy link').parent(row).mousePressed(function () { copyLink(this); });
  createButton('Reset').parent(row).mousePressed(resetAll);

  addSection(root, 'The sheet');
  statsDiv = createDiv('').parent(root).class('stats');
  penListDiv = createDiv('').parent(root).class('stats');
  const keys = createDiv('').parent(root).class('note keys');
  keys.html(
    '<div><kbd>drag</kbd> stir · <kbd>shift</kbd> pour 1 · <kbd>alt</kbd> pour 2 · ' +
    '<kbd>click</kbd> stop / go</div>' +
    '<div><kbd>space</kbd> play · <kbd>←</kbd> <kbd>→</kbd> a step, with <kbd>shift</kbd> ' +
    'ten · <kbd>Home</kbd> <kbd>End</kbd></div>' +
    '<div><kbd>O</kbd> post · <kbd>L</kbd> wall · <kbd>X</kbd> erase · <kbd>S</kbd> stir · ' +
    '<kbd>Z</kbd> undo a stroke</div>' +
    '<div><kbd>R</kbd> new seed · <kbd>[</kbd> <kbd>]</kbd> step it · <kbd>G</kbd> guides · ' +
    '<kbd>W</kbd> ink wash</div>');
  linkDiv = createDiv('').parent(root).class('link');

  syncVisibility();
}

// One row per plot pass, since each is a separate sitting at the plotter with a different
// pen in the holder — and the download buttons wear the colour they write.
function refreshPenList() {
  downloadButtons.forEach((b, i) => {
    b.html(`<span class="sw" style="background:${inkColor(i)}"></span>Download SVG [Color ${i + 1}]`);
  });
  if (!penListDiv) return;
  if (!perPen || !shapes) { penListDiv.html(''); return; }
  let html = '';
  for (let i = 0; i < 2; i++) {
    const p = perPen[i];
    html += `<div class="pen-row"><span class="sw" style="background:${inkColor(i)}"></span>` +
      `<span>colour ${i + 1} — ` + (p.strokes
        ? `<b>${groupNum(p.strokes)}</b> strokes, <b>${(p.ink / 1000).toFixed(1)}</b> m, ` +
          `${formatDuration(p.strokes * PEN_CYCLE_S + p.ink / DRAW_SPEED + (p.travel || 0) / TRAVEL_SPEED)}`
        : 'nothing on this sheet') + `</span></div>`;
  }
  penListDiv.html(html);
}

////////////////////////////////////////////////////////////////////////////////////////
// What the sheet costs

function updateStats() {
  if (!statsDiv) return;
  const s = settings;
  if (!area || area.w <= 1 || area.h <= 1) {
    statsDiv.html(`<div class="warn">The margin leaves nothing to draw on. Lower it, or use ` +
      `larger paper.</div>`);
    refreshPenList();
    return;
  }
  let html = '';
  if (shapes && plan) {
    const seconds = strokes * PEN_CYCLE_S + plan.ink / DRAW_SPEED + plan.travel / TRAVEL_SPEED;
    html +=
      `<div class="big"><b>${groupNum(strokes)}</b> strokes, ` +
      `<b>${(plan.ink / 1000).toFixed(1)}</b> m of line</div>` +
      `<div>Pen up for ${(plan.travel / 1000).toFixed(1)} m between strokes</div>` +
      `<div>Roughly <b>${formatDuration(seconds)}</b> to plot, both pens</div>`;
    if (!strokes) {
      html += `<div class="warn">No ink is thick enough to draw at this moment. Let the ` +
        `streams run longer, or lower <b>Ink counts from</b>.</div>`;
    }
  } else if (strokes > MAX_STROKES) {
    html += `<div class="warn">${groupNum(strokes)} strokes — past the ` +
      `${groupNum(MAX_STROKES)} limit, so nothing was ordered or drawn. Widen the spacing.</div>`;
  } else {
    html += `<div class="dim">The lines follow when the fluid stops.</div>`;
  }
  html +=
    `<div>At <b>${(SIM_T / STEPS_PER_S).toFixed(2)} s</b>, step ${SIM_T} of ${endStep()}</div>` +
    `<div>Water ${NX} × ${NY} cells, ink ${DXN} × ${DYN}; a step takes ` +
    `${STEP_MS.toFixed(1)} ms, the lines ${inkMs.toFixed(0)} ms</div>`;

  const tight = [];
  for (const k of [1, 2]) {
    const d = s['draw' + k];
    if ((d === 'echo' || d === 'flow lines' || d === 'hatching') && s['spacing' + k] < 2 * s['nib' + k]) {
      tight.push(k);
    }
  }
  if (tight.length) {
    html += `<div class="warn">The lines of colour ${tight.join(' and ')} are closer than ` +
      `twice the nib and will run together into solid ink.</div>`;
  }
  if (strokes > BUSY_STROKES) {
    html += `<div class="warn">${groupNum(strokes)} strokes is a long sitting at the plotter. ` +
      `A wider spacing, a higher <b>Shortest line</b> or more <b>Smoothing</b> bring it down.</div>`;
  }
  const rerun = STEP_MS * endStep() / 1000;
  if (rerun > 8) {
    html += `<div class="dim">Running the whole timeline takes about ${rerun.toFixed(0)} s, ` +
      `and every change to the water runs it again. A lower resolution is quicker.</div>`;
  }
  statsDiv.html(html);
  refreshPenList();
}

////////////////////////////////////////////////////////////////////////////////////////
// SVG
//
// One group per pen, no fills, no background rectangle — everything in the file is meant
// to be plotted. stroke-width is the nib and the caps are round, so the file previews as
// the finished plot looks. Strokes come out in the order the pen should visit them, each
// already flipped to the end it should be entered from, and the link that rebuilds the
// sheet — strokes of the mouse and all — is written into the header.

function metaComment() {
  const s = settings;
  const streams = k => s['streams' + k] > 0
    ? `${s['streams' + k]}x${s['side' + k]}@${s['pos' + k]}%/${s['spread' + k]}% ` +
      `mouth=${s['mouth' + k]}% speed=${s['speed' + k]} aim=${s['aim' + k]}±${s['wobble' + k]}° ` +
      `surge=${s['pulse' + k]}% ${s['from' + k]}s..${s['until' + k] ? s['until' + k] + 's' : 'end'}`
    : 'no streams';
  const drawn = k => `${s['draw' + k]}` +
    (s['draw' + k] === 'contours' ? `/${s['levels' + k]}` : `/${s['spacing' + k]}mm`) +
    (s['draw' + k] === 'hatching' ? `@${s['hatchAngle' + k]}°` : '') +
    ` from=${s['inkAt' + k]}%${s['outline' + k] ? ' +edge' : ''}`;
  return `ink in water — t=${(SIM_T / STEPS_PER_S).toFixed(2)}s (step ${SIM_T}) seed=${s.seed} ` +
    `res=${NX}x${NY}/${KD} thickness=${s.thickness} turbulence=${s.turbulence}/${s.eddySize}%` +
    `/${s.churn}% swirl=${s.swirl} gravity=${s.gravity}@${s.gravityDir}° bleed=${s.bleed} ` +
    `start=${s.start}` + (s.start === 'clear water' ? '' : `/${s.startAt}/${s.startCount}/${s.startSize}%/${s.startWobble}%`) +
    ` open=${['L', 'R', 'T', 'B'].filter((c, i) => TK.open[i]).join('') || 'none'} ` +
    `current=${s.current}${s.current === 'none' ? '' : '/' + s.currentSpeed} ` +
    `colour1: weight=${s.weight1}% ${streams(1)} drawn=${drawn(1)} nib=${s.nib1}mm ` +
    `colour2: weight=${s.weight2}% ${streams(2)} drawn=${drawn(2)} nib=${s.nib2}mm ` +
    `obstacles=${OBS.length} strokes=${STROKES.length} smooth=${s.smoothInk} min=${s.minLine}mm ` +
    `${s.cropMarks ? 'cropmarks<=' + s.cropMarkGap + 'mm ' : ''}lines=${strokes}`;
}

// The strokes of one pen, in plot order, as one <g>.
function svgGroup(keep, colour, nib) {
  const { pts, off } = shapes;
  const { order, flip } = plan;
  const f = n => String(+n.toFixed(3));
  const CHUNK = 400;                       // subpaths per <path>, keeps the DOM small

  let body = '', d = '', held = 0, count = 0;
  for (let t = 0; t < order.length; t++) {
    const i = order[t];
    if (!keep(i)) continue;
    const rev = flip[t] === 1;
    const a = off[i], b = off[i + 1];
    const n = b - a;
    count++;
    let k  = rev ? b - 1 : a;
    let px = pts[k * 2], py = pts[k * 2 + 1];
    d += `M${f(px)},${f(py)}`;
    for (let m = 1; m < n; m++) {
      k += rev ? -1 : 1;
      const x = pts[k * 2], y = pts[k * 2 + 1];
      d += `l${f(x - px)},${f(y - py)}`;
      px = x; py = y;
    }
    if (++held >= CHUNK) { body += `  <path d="${d}"/>\n`; d = ''; held = 0; }
  }
  if (d) body += `  <path d="${d}"/>\n`;
  if (!count) return null;
  return {
    count,
    body: `<g fill="none" stroke="${colour}" stroke-width="${f(nib)}" ` +
      `stroke-linecap="round" stroke-linejoin="round">\n${body}</g>\n`,
  };
}

// One colour — its cut guides with it — or both.
function svgFile(which) {
  const [W, H] = paperDims();
  const pens = which ? [which - 1] : [0, 1];
  const groups = [];
  if (settings.cropMarks) {
    groups.push([i => shapes.ink[i] === INK_MARK, inkColor(pens[0]), settings['nib' + (pens[0] + 1)]]);
  }
  for (const p of pens) groups.push([i => shapes.ink[i] === p, inkColor(p), settings['nib' + (p + 1)]]);

  let body = '', count = 0, inked = 0;
  for (const [keep, col, nib] of groups) {
    const g = svgGroup(keep, col, nib);
    if (!g) continue;
    body += g.body;
    count += g.count;
  }
  for (const p of pens) inked += perPen[p].strokes;
  if (!inked) return null;

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- ${metaComment()}${which ? ' pass=colour' + which : ''} -->\n` +
    `<!-- ${location.origin === 'null' ? '' : location.origin}${location.pathname}` +
    `#${encodeState()} -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n` +
    body +
    `</svg>\n`;
}

function exportSvg(which) {
  catchUpNow();
  if (!shapes || !plan) {
    alert('Nothing to export — the lines could not be drawn at this moment.');
    return;
  }
  const svg = svgFile(which);
  if (!svg) {
    alert(which ? `Nothing in colour ${which} on this sheet.` : 'Nothing on this sheet.');
    return;
  }
  const s = settings;
  const tag = which ? `colour${which} nib${s['nib' + which]}` : 'both colours';
  saveStrings([svg], `ink in water seed${s.seed} t${SIM_T} ${s.paper}-${s.orientation} ${tag} ` +
    timestamp(), 'svg');
}
