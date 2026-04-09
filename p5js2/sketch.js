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

const X = 1000;
const Y = 500;
const DEBUG = true;

let horizontalMargin;
let verticalMargin;
let numberOfPoints;
let numberOfInnerPoints;
let numberOfLines;
let pointMargin;
let recordCheckbox;

function setup() {
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

  const lines = randomInts(numberOfLines, horizontalMargin + 1, X - horizontalMargin - 1);
  lines.unshift(horizontalMargin);
  lines.push(X - horizontalMargin);
  const points = lines.map(() => randomInts(numberOfPoints, verticalMargin + 1, Y - verticalMargin - 1));

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
    for (const x of lines) {
      line(x, verticalMargin, x, Y - verticalMargin);
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
    const xl = lines[i];
    const xr = lines[i + 1];
    const pointsl = points[i];
    const pointsr = points[i + 1];
    for (let j = 0; j < pointsl.length; ++j) {
      const yl = pointsl[j];
      const yr = pointsr[j];
      line(xl, yl, xr, yr);
    }
  }

  for (let i = 0; i < points.length; ++i) {
    points[i].unshift(verticalMargin);
    points[i].push(Y - verticalMargin);
  }

  for (let i = 0; i < lines.length - 1; ++i) {
    const xl = lines[i];
    const xr = lines[i + 1];
    const pointsl = points[i];
    const pointsr = points[i + 1];
    for (let j = 0; j < pointsl.length - 1; ++j) {
      const yltop = pointsl[j];
      const ylbot = pointsl[j + 1];
      const yrtop = pointsr[j];
      const yrbot = pointsr[j + 1];
      const rangel = ylbot - yltop;
      const ranger = yrbot - yrtop;
      for (let k = 1; k <= numberOfInnerPoints; ++k) {
        const yl = yltop + (rangel / numberOfInnerPoints) * k;
        const yr = yrtop + (ranger / numberOfInnerPoints) * k;
        line(xl, yl, xr, yr);
      }
    }
  }

}
