// Noise tends to look smoother with coordinates that are very close together
// These values will be multiplied by the x and y coordinates to make the
// resulting values very close together
let xScale = 0.015;
let yScale = 0.02;

let gapSlider;
let gap;
let offsetSlider;
let offset;
let rndNoiseSeed;
let generateButton;
let rndNoiseInput;

function setup() {
  createCanvas(842, 595)

  // Set up the sliders
  createSpan("Gap: ");
  gapSlider = createSlider(2, width / 10, width / 90);
  gapSlider.changed(dotGrid);
  gapSlider.mouseMoved(checkChanged);
  createElement('br');
  createSpan("Offset: ");
  offsetSlider = createSlider(0, 1000, 0);
  offsetSlider.mouseMoved(checkChanged);
  createElement('br');
  rndNoiseSeed = int(random((1, 2147483647)));  
  createSpan("Noise seed: ");
  rndNoiseInput = createInput(rndNoiseSeed);  
  createElement('br');
  generateButton = createButton("Generate", dotGrid);
  generateButton.mousePressed(generate);
  dotGrid();
}

// When the mouse is moved over a slider
// Draw the dot grid if something has changed
function checkChanged() {
  if (gap !== gapSlider.value()) {
    dotGrid();
  }
  if (offset !== offsetSlider.value()) {
    dotGrid();
  }
}

function generate() {
  rndNoiseSeed = int(random((1, 2147483647)));
  rndNoiseInput.value(rndNoiseSeed);
  noiseSeed(rndNoiseSeed);
  dotGrid();
}

function dotGrid() {
  background(255);
  noStroke();
  fill(0);

  // Get the current gap and offset values from the sliders
  gap = gapSlider.value();
  offset = offsetSlider.value();

  // Loop through x and y coordinates, at increments set by gap
  for (let x = gap / 2; x < width; x += gap) {
    for (let y = gap / 2; y < height; y += gap) {
      // Calculate noise value using scaled and offset coordinates
      let noiseValue = noise((x + offset) * xScale, (y + offset) * yScale);

      // Since noiseValue will be 0-1, multiply it by gap to set diameter to
      // between 0 and the size of the gap between circles
      let diameter = noiseValue * gap * 1.5;
      circle(x, y, diameter);
    }
  }
}