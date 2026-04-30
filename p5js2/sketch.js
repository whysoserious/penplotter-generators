////////////////////////////////////////////////////////////////////////////////////////

function randomInts(n, p, q) {
  console.log(`randomInts: n: ${n}, p: ${p}, q: ${q}`);
  return Array.from({ length: n }, () => Math.floor(Math.random() * (q - p + 1)) + p).sort((a, b) => a - b);
}

function scatteredInts(n, p, q, margin) {
  let ranges = [[p, q]];
  const result = [];
  for (let i = 0; i < n; i++) {
    const totalLength = ranges.reduce((sum, [a, b]) => sum + (b - a), 0);
    if (totalLength <= 0) break;
    let r = Math.random() * totalLength;
    let picked = null;
    for (const [a, b] of ranges) {
      const len = b - a;
      if (r <= len) {
        picked = Math.round(a + r);
        break;
      }
      r -= len;
    }
    if (picked === null) break;
    result.push(picked);
    const newRanges = [];
    for (const [a, b] of ranges) {
      if (b < picked - margin || a > picked + margin) {
        newRanges.push([a, b]);
      } else {
        if (a <= picked - margin) newRanges.push([a, picked - margin]);
        if (picked + margin <= b) newRanges.push([picked + margin, b]);
      }
    }
    ranges = newRanges;
  }
  return result.sort((a, b) => a - b);
}

function randomGaussianInts(n, p, q, { mean = (p + q) / 2, stddev = (q - p) / 6 } = {}) {
  const result = [];
  while (result.length < n) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const val = Math.round(mean + z * stddev);
    if (val >= p && val <= q) result.push(val);
  }
  return result.sort((a, b) => a - b);
}

function debug(fn) {
  if (DEBUG) {
    stroke(255, 0, 0);
    fn();
  }
}

function createSliderControl(label, min, max, defaultVal, onChange) {
  createElement('br');
  createSpan(label);
  const slider = createSlider(min, max, defaultVal);
  const input = createInput(slider.value());
  let current = Number(input.value());
  slider.mouseMoved(() => {
    const sliderVal = slider.value();
    if (sliderVal != current) {
      current = sliderVal;
      input.value(sliderVal);
      onChange(sliderVal);
      regenerate();
    }
  });
  return { slider, input, getValue: () => current };
}

////////////////////////////////////////////////////////////////////////////////////////////

const PAPER_SIZES = {
  'A0': [841, 1189],
  'A1': [594, 841],
  'A2': [420, 594],
  'A3': [297, 420],
  'A4': [210, 297],
  'B0': [1000, 1414],
  'B1': [707, 1000],
  'B2': [500, 707],
  'B3': [353, 500],
  'B4': [250, 353],
};
const DISPLAY_SCALE = 2; // px per mm

let X = 1000;
let Y = 500;
const DEBUG = true;

let horizontalMargin;
let verticalMargin;
let numberOfPoints;
let numberOfInnerPoints;
let numberOfLines;
let pointMargin;
let recordCheckbox;

let paperSelect;
let orientationSelect;

function updateCanvasSize() {
  const [w, h] = PAPER_SIZES[paperSelect.value()];
  const landscape = orientationSelect.value() === 'landscape';
  X = (landscape ? h : w) * DISPLAY_SCALE;
  Y = (landscape ? w : h) * DISPLAY_SCALE;
  resizeCanvas(X, Y);
}

function setup() {
  createElement('span', 'Paper size: ');
  paperSelect = createSelect();
  for (const name of Object.keys(PAPER_SIZES)) paperSelect.option(name);
  paperSelect.value('A4');
  paperSelect.changed(() => { updateCanvasSize(); regenerate(); });

  createSpan(' Orientation: ');
  orientationSelect = createSelect();
  orientationSelect.option('portrait');
  orientationSelect.option('landscape');
  orientationSelect.changed(() => { updateCanvasSize(); regenerate(); });

  createElement('br');

  const [w, h] = PAPER_SIZES['A4'];
  X = w * DISPLAY_SCALE;
  Y = h * DISPLAY_SCALE;
  createCanvas(X, Y);

  const vm = createSliderControl("Vertical margin: ", 0, Y / 2, Y / 10, val => verticalMargin = val);
  verticalMargin = vm.getValue();

  const hm = createSliderControl("Horizontal margin: ", 0, X / 2, X / 10, val => horizontalMargin = val);
  horizontalMargin = hm.getValue();

  const np = createSliderControl("Number of points: ", 0, 50, 3, val => numberOfPoints = val);
  numberOfPoints = np.getValue();

  const nip = createSliderControl("Number of inner points: ", 1, 50, 10, val => numberOfInnerPoints = val);
  numberOfInnerPoints = nip.getValue();

  const nl = createSliderControl("Number of lines: ", 0, 50, 5, val => numberOfLines = val);
  numberOfLines = nl.getValue();

  const pm = createSliderControl("Point margin: ", 0, X, X / 20, val => pointMargin = val);
  pointMargin = pm.getValue();

  createElement('br');
  const regenerateButton = createButton("Regenerate");
  regenerateButton.mousePressed(regenerate);

  const saveSVGButton = createButton("Export SVG");
  saveSVGButton.mousePressed(() => {
    setSvgResolutionDPCM(DISPLAY_SCALE * 10);
    const svgStr = endRecordSvg();
    const now = new Date();
    const ts = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');
    saveStrings([svgStr], `p5js ${ts}`, 'svg');
    beginRecordSvg(this, null);
    regenerate();
  });

  beginRecordSvg(this, null);
  regenerate();
}

function regenerate() {
  background(255);
  noStroke();
  fill(0);

  const portrait = orientationSelect.value() === 'portrait';
  // In landscape: lines are vertical (X axis), points vary on Y axis.
  // In portrait:  lines are horizontal (Y axis), points vary on X axis.
  const [lineMin, lineMax] = portrait
    ? [verticalMargin + 1, Y - verticalMargin - 1]
    : [horizontalMargin + 1, X - horizontalMargin - 1];
  const [lineStart, lineEnd] = portrait
    ? [verticalMargin, Y - verticalMargin]
    : [horizontalMargin, X - horizontalMargin];
  const [ptMin, ptMax] = portrait
    ? [horizontalMargin + 1, X - horizontalMargin - 1]
    : [verticalMargin + 1, Y - verticalMargin - 1];
  const [ptStart, ptEnd] = portrait
    ? [horizontalMargin, X - horizontalMargin]
    : [verticalMargin, Y - verticalMargin];

  // drawLine(a1, b1, a2, b2): a = along-lines axis, b = along-points axis
  const drawLine = portrait
    ? (a1, b1, a2, b2) => line(b1, a1, b2, a2)
    : (a1, b1, a2, b2) => line(a1, b1, a2, b2);

  const lines = randomInts(numberOfLines, lineMin, lineMax);
  lines.unshift(lineStart);
  lines.push(lineEnd);
  const points = lines.map(() => randomInts(numberOfPoints, ptMin, ptMax));

  debug(() => {
    console.log("Regenerate:")
    console.log(`Coords:
      (${horizontalMargin}, ${verticalMargin}),
      (${X - horizontalMargin}, ${verticalMargin}),
      (${horizontalMargin}, ${Y - verticalMargin}),
      (${X - horizontalMargin}, ${Y - verticalMargin})`);
    line(horizontalMargin, 0, horizontalMargin, Y);
    line(X - horizontalMargin, 0, X - horizontalMargin, Y);
    line(0, verticalMargin, X, verticalMargin);
    line(0, Y - verticalMargin, X, Y - verticalMargin);
    for (const a of lines) {
      drawLine(a, ptMin, a, ptMax);
    }
  });

  stroke(0, 0, 0);

  const now = new Date();
  const ts = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');
  const svgFile = `p5js ${ts}.svg`;
  console.log(`Recording SVG to ${svgFile}`);

  clearRecordSvg();

  for (let i = 0; i < lines.length - 1; ++i) {
    const al = lines[i];
    const ar = lines[i + 1];
    const pointsl = points[i];
    const pointsr = points[i + 1];
    for (let j = 0; j < pointsl.length; ++j) {
      drawLine(al, pointsl[j], ar, pointsr[j]);
    }
  }

  for (let i = 0; i < points.length; ++i) {
    points[i].unshift(ptStart);
    points[i].push(ptEnd);
  }

  for (let i = 0; i < lines.length - 1; ++i) {
    const al = lines[i];
    const ar = lines[i + 1];
    const pointsl = points[i];
    const pointsr = points[i + 1];
    for (let j = 0; j < pointsl.length - 1; ++j) {
      const bltop = pointsl[j];
      const blbot = pointsl[j + 1];
      const brtop = pointsr[j];
      const brbot = pointsr[j + 1];
      const rangel = blbot - bltop;
      const ranger = brbot - brtop;
      for (let k = 1; k <= numberOfInnerPoints; ++k) {
        const bl = bltop + (rangel / numberOfInnerPoints) * k;
        const br = brtop + (ranger / numberOfInnerPoints) * k;
        drawLine(al, bl, ar, br);
      }
    }
  }

}
