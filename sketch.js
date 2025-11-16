let sourceImage;
let artCanvas; // define artCanvas
let ready = false; // track if art is ready

const baseWidth = 1920;// base canvas width
const baseHeight = 1080;// base canvas height

//  sampling parameters to control the size and ignore the imperfection of the map image
//3D parameters - Increase the spacing between small squares while maintaining the checkerboard pattern
const SAMPLE_STEP = 35;//Increase the spacing from 25 to 35.
const UNIT_SIZE = 25;//Slightly reduce the unit size
const CUBE_DEPTH = 8;//Convert 2D to 3D graphics applications

// Decrease shadow movement
// Add view control
let rotationX = 0;
let rotationY = 0;//Record the actual rotation angle of the object on the X and Y axes.
let targetRotationX = 0;
let targetRotationY = 0;//The target angle to which the object should be rotated is used to achieve a smooth transition.
const ROTATION_SMOOTHING = 0.05;//Control the smoothness of rotation animation
let isDragging = false;//Record whether the user is dragging an object
let lastMouseX, lastMouseY;

// Auto-generation parameters
let noiseOffset = 0;
let NOISE_SPEED = 0.03; // speed of noise change
const REGENERATION_INTERVAL = 200;
let lastRegenerationTime = 0;// timestamp of last regeneration

// 3D scene elements
let cubes = [];
let outlineCubes = []; // outline cubes
let wall;
let frame;

// base color like mondrian:define colors as RGB arrays
let colors = {
 gray: [214, 215, 210],
  yellow: [225, 201, 39],
  red: [173, 55, 43],
  blue: [49, 66, 148],
  bg: [235, 234, 230]
};

// 3D artwork display position and size
const ART_X = 656;
const ART_Y = 152;
const ART_WIDTH = 600;
const ART_HEIGHT = 600;

// Image processing cache:Reduce frequent pixel readout operations to make the work smoother.
let imagePixelsCache = null;
let lastImageUpdate = 0;
const IMAGE_CACHE_DURATION = 1000; // cache duration in milliseconds

//Control bar sliders
let noiseSpeedSlider;
let waveFrequencySlider;
let colorChangeSpeedSlider; 
let noiseSpeedValue = 0.03;
let waveFrequencyValue = 0.05;
let colorChangeSpeedValue = 0.02; 


function preload() {
  sourceImage = loadImage('Street.png'); 
  // load image https://p5js.org/reference/p5/preload/
}

function setup() {
   // Create WEBGL canvas with willReadFrequently attribute
   const renderer = createCanvas(baseWidth, baseHeight, WEBGL);
  const ctx = renderer.elt.getContext('webgl') || renderer.elt.getContext('experimental-webgl');
  if (ctx) {
    // Set the willReadFrequently attribute to smooth pixel read operations
    ctx.getContextAttributes().willReadFrequently = true;
  }
  
  // Enable depth testing for proper 3D rendering
  setAttributes('antialias', true);

  document.body.style.overflow = 'hidden';
  // Add mouse event listeners for drag control
  canvas = document.querySelector('canvas');
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
 
  // Add control sliders
  createControlSliders();
  
  // Initialize 3D scene
  initializeScene();
  ready = true;// set ready to true after setup
  scaleToWindow();//resizing window
}
// Create control sliders for noise speed and wave frequency
function createControlSliders() {
const controlContainer = createDiv('');
  controlContainer.style('position', 'absolute');
  controlContainer.style('top', '20px');
  controlContainer.style('left', '20px');
  controlContainer.style('background', 'rgba(255, 255, 255, 0.8)');
  controlContainer.style('padding', '15px');
  controlContainer.style('border-radius', '8px');
  controlContainer.style('font-family', 'Arial, sans-serif');
  controlContainer.style('font-size', '14px');
  controlContainer.style('z-index', '100');
  controlContainer.style('min-width', '250px');
  // Noise Speed Slider
const noiseSpeedLabel = createDiv('Size Change:');
  noiseSpeedLabel.parent(controlContainer);
  noiseSpeedLabel.style('margin-bottom', '5px');
  noiseSpeedLabel.style('font-weight', 'bold');
  
  noiseSpeedSlider = createSlider(0.001, 0.1, noiseSpeedValue, 0.001);
  noiseSpeedSlider.parent(controlContainer);
  noiseSpeedSlider.style('width', '100%');
  noiseSpeedSlider.style('margin-bottom', '15px');
  
  const noiseSpeedValueDisplay = createDiv('value: ' + noiseSpeedValue.toFixed(3));
  noiseSpeedValueDisplay.parent(controlContainer);
  noiseSpeedValueDisplay.style('margin-bottom', '15px');
  noiseSpeedValueDisplay.id('noiseSpeedValue');

  // Wave Frequency Slider
  const waveFrequencyLabel = createDiv('Wave Frequency:');
  waveFrequencyLabel.parent(controlContainer);
  waveFrequencyLabel.style('margin-bottom', '5px');
  waveFrequencyLabel.style('font-weight', 'bold');
  
  waveFrequencySlider = createSlider(0.01, 0.2, waveFrequencyValue, 0.01);
  waveFrequencySlider.parent(controlContainer);
  waveFrequencySlider.style('width', '100%');
  waveFrequencySlider.style('margin-bottom', '15px');
  
  const waveFrequencyValueDisplay = createDiv('value: ' + waveFrequencyValue.toFixed(3));
  waveFrequencyValueDisplay.parent(controlContainer);
  waveFrequencyValueDisplay.style('margin-bottom', '15px');
  waveFrequencyValueDisplay.id('waveFrequencyValue');
  
  // Color Change Speed Slider
  const colorChangeSpeedLabel = createDiv('ColorChange:');
  colorChangeSpeedLabel.parent(controlContainer);
  colorChangeSpeedLabel.style('margin-bottom', '5px');
  colorChangeSpeedLabel.style('font-weight', 'bold');
  
  colorChangeSpeedSlider = createSlider(0.001, 0.1, colorChangeSpeedValue, 0.001);
  colorChangeSpeedSlider.parent(controlContainer);
  colorChangeSpeedSlider.style('width', '100%');
  colorChangeSpeedSlider.style('margin-bottom', '15px');
  
  const colorChangeSpeedValueDisplay = createDiv('value: ' + colorChangeSpeedValue.toFixed(3));
  colorChangeSpeedValueDisplay.parent(controlContainer);
  colorChangeSpeedValueDisplay.style('margin-bottom', '15px');
  colorChangeSpeedValueDisplay.id('colorChangeSpeedValue');

  //Reset Button
  const resetButton = createButton('Reset to Defaults');
  resetButton.parent(controlContainer);
  resetButton.style('width', '100%');
  resetButton.style('padding', '8px');
  resetButton.style('background', '#4CAF50');
  resetButton.style('color', 'white');
  resetButton.style('border', 'none');
  resetButton.style('border-radius', '4px');
  resetButton.style('cursor', 'pointer');
  resetButton.mousePressed(resetToDefaults);
}
// Reset sliders to default values
function resetToDefaults() {
  noiseSpeedValue = 0.03;
  waveFrequencyValue = 0.05;
  colorChangeSpeedValue = 0.02;
  noiseSpeedSlider.value(noiseSpeedValue);
  waveFrequencySlider.value(waveFrequencyValue);
  colorChangeSpeedSlider.value(colorChangeSpeedValue);
  updateSliderDisplays();
}
// Update slider value displays
function updateSliderDisplays() {
  select('#noiseSpeedValue').html('value: ' + noiseSpeedValue.toFixed(3));
  select('#waveFrequencyValue').html('value: ' + waveFrequencyValue.toFixed(3));
  select('#colorChangeSpeedValue').html('value: ' + colorChangeSpeedValue.toFixed(3));
}
//Initialize scene
function initializeScene() {
  // Align 3D wall with art canvas
  wall = new p5.Geometry();
  wall.vertices.push(
    new p5.Vector(-ART_WIDTH/2, -ART_HEIGHT/2, -100),
    new p5.Vector(ART_WIDTH/2, -ART_HEIGHT/2, -100),
    new p5.Vector(ART_WIDTH/2, ART_HEIGHT/2, -100),
    new p5.Vector(-ART_WIDTH/2, ART_HEIGHT/2, -100)
  );
  wall.faces.push([0, 1, 2], [2, 3, 0]);
  // Preprocessing image pixel data
  preprocessImagePixels();
  
  // Generate cubes from image
  generate3DArt();
}

// Preprocess image pixels and cache them
function preprocessImagePixels() {
  if (!sourceImage.pixels.length) {
    sourceImage.loadPixels();
  }
  
  // Cache pixel data
  imagePixelsCache = {
    data: new Uint32Array(sourceImage.pixels.buffer),
    width: sourceImage.width,
    height: sourceImage.height,
    timestamp: millis()
  };
}




function draw() {

//resizing and fitting
background(255);
// update slider values
  noiseSpeedValue = noiseSpeedSlider.value();
  waveFrequencyValue = waveFrequencySlider.value();
  colorChangeSpeedValue = colorChangeSpeedSlider.value();
  updateSliderDisplays();

  // Sight control
  if (!isDragging) {
    // let camara slowly follow mouse position
    targetRotationX = map(mouseY, 0, height, -0.2, 0.2);
    targetRotationY = map(mouseX, 0, width, -0.2, 0.2);
    
    rotationX = lerp(rotationX, targetRotationX, ROTATION_SMOOTHING);
    rotationY = lerp(rotationY, targetRotationY, ROTATION_SMOOTHING);
  }
  
  // Set camera
  camera(0, 0, (height/2) / tan(PI/6), 0, 0, 0, 0, 1, 0);
  rotateX(rotationX);
  rotateY(rotationY);
  
  // Draw 3D scene
  draw3DScene();
  
  // Auto-regenerate art - use cache to decrease pixel read frequency
  noiseOffset += noiseSpeedValue;
  if (millis() - lastRegenerationTime > REGENERATION_INTERVAL) {
    // Check if cache is valid
    if (!imagePixelsCache || millis() - imagePixelsCache.timestamp > IMAGE_CACHE_DURATION) {
      preprocessImagePixels();
    }
    generate3DArt();
    lastRegenerationTime = millis();
  }
}

// Mouse event handlers for drag control
function onMouseDown(e) {
  isDragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
}

function onMouseMove(e) {
  if (!isDragging) return;
  const deltaX = e.clientX - lastMouseX;
  const deltaY = e.clientY - lastMouseY;
  rotationY += deltaX * 0.01;
  rotationX += deltaY * 0.01;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
}

function onMouseUp() {
  isDragging = false;
}

function draw3DScene() {
  // Enable lighting
  directionalLight(255, 255, 255, 0, 0, -1);
  ambientLight(100);
  
  // calculate art position
  const artX = ART_X + ART_WIDTH/2 - width/2;
  const artY = ART_Y + ART_HEIGHT/2 - height/2;
  
  // Draw wall - align precisely with art canvas
  push();
  fill(colors.bg [0], colors.bg[1], colors.bg[2]);
  noStroke();
  translate(artX, artY, -50); // align wall with art canvas position
  pop();
  
  // Draw frame
  push();
  translate(artX, artY, -25); // align frame with art canvas position
  draw3DFrame();
  pop();
  
  // Draw 3D art at correct position
  push();
  translate(artX, artY, 25);
  draw3DArt();
  pop();
}
// Draw 3D art cubes
function draw3DFrame() {
  const frameWidth = 600;
  const frameHeight = 600;
  const frameDepth = 50;
  const frameColor = [191, 168, 154];
  const shadowColor = [168, 137, 116];
// Frame front
  push();
  fill(frameColor);
  noStroke();
  translate(0, 0, 0);
  plane(frameWidth, frameHeight);
  pop();
  
  // Frame sides
  push();
  fill(shadowColor);
  
  // Top
  push();
  translate(0, -frameHeight/2, -frameDepth/2);
  box(frameWidth, 10, frameDepth);
  pop();
  
  // Bottom
  push();
  translate(0, frameHeight/2, -frameDepth/2);
  box(frameWidth, 10, frameDepth);
  pop();
  
  // Left
  push();
  translate(-frameWidth/2, 0, -frameDepth/2);
  box(10, frameHeight, frameDepth);
  pop();
  
  // Right
  push();
  translate(frameWidth/2, 0, -frameDepth/2);
  box(10, frameHeight, frameDepth);
  pop();
  
  pop();
}

function draw3DArt() {
  // Enable lighting for art
  directionalLight(255, 255, 255, 0, 0, -1);
  pointLight(200, 200, 200, 0, 0, 100);
  
  // Draw Mondrian-style large blocks first - change to 3D blocks
  draw3DMondrianBlocks();
  
  // Then draw outline cubes(yellow base)
  for (let cube of outlineCubes) {
    drawOutlineCube(cube);
  }
  
  // Draw color changing cubes
  for (let cube of cubes) {
    draw3DCube(cube);
  }
}
// Draw Mondrian-style large blocks (yellow base cubes)
function drawOutlineCube(cube) {
  push();
  translate(cube.x, cube.y, cube.z);
  
  // Add wave motion
  const wave = sin(frameCount * waveFrequencyValue * 0.5 + cube.noiseOffset) * 1;
  translate(0, 0, wave);
  
  // Cubes color with slight brightness change
  const brightnessShift = sin(frameCount * 0.03 + cube.noiseOffset) * 15;
  fill(
    constrain(colors.yellow[0] + brightnessShift, 0, 255),
    constrain(colors.yellow[1] + brightnessShift, 0, 255),
    constrain(colors.yellow[2] + brightnessShift, 0, 255)
  );
  
  // Draw cube with wave size change 
  const sizeWave = sin(frameCount * (0.02 + noiseSpeedValue * 0.5) + cube.noiseOffset) * 0.5;
  box(
    cube.width + sizeWave,
    cube.height + sizeWave,
    cube.depth + sizeWave * 0.3
  );
  
  pop();
}
function draw3DCube(cube) {
  push();
  translate(cube.x, cube.y, cube.z);
  
  // Wave motion - frequency affected by slider
  const wave = sin(frameCount * waveFrequencyValue + cube.noiseOffset) * 2;
  translate(0, 0, wave);
  
  let displayColor;
  // Color change based on noise and slider
  const colorNoise = noise(cube.x * 0.01, cube.y * 0.01, frameCount * colorChangeSpeedValue);  
  if (colorNoise < 0.35) {
    displayColor = colors.yellow;
  } else if (colorNoise < 0.5) {
    displayColor = colors.red;
  } else if (colorNoise < 0.65) {
    displayColor = colors.blue;
  } else {
    displayColor = colors.gray;
  }
  
  // Cubes color with brightness change
  const brightnessShift = sin(frameCount * 0.05 + cube.noiseOffset) * 25;
  fill(
    constrain(displayColor[0] + brightnessShift, 0, 255),
    constrain(displayColor[1] + brightnessShift, 0, 255),
    constrain(displayColor[2] + brightnessShift, 0, 255)
  );
  
  // Draw cube with wave size change
  const sizeWave = sin(frameCount * (0.04 + noiseSpeedValue) + cube.noiseOffset) * 1.5;
  box(
    cube.width + sizeWave,
    cube.height + sizeWave,
    cube.depth + sizeWave * 0.5
  );
  
  pop();
}
// Draw Mondrian-style large blocks (yellow base cubes)
function drawOutlineCube(cube) {
  push();
  translate(cube.x, cube.y, cube.z);
  
  // Add wave motion
  const wave = sin(frameCount * waveFrequencyValue * 0.5 + cube.noiseOffset) * 1;
  translate(0, 0, wave);
  
  // Larger outline cubes color with slight brightness change
  const colorNoise = noise(cube.x * 0.01, cube.y * 0.01, frameCount * colorChangeSpeedValue);
  
  let displayColor;
  if (colorNoise < 0.4) {
    displayColor = colors.yellow;
  } else if (colorNoise < 0.55) {
    displayColor = colors.red;
  } else if (colorNoise < 0.7) {
    displayColor = colors.blue;
  } else {
    displayColor = colors.gray;
  }
  
  // Cubes color with slight brightness change
  const brightnessShift = sin(frameCount * 0.03 + cube.noiseOffset) * 15;
  fill(
    constrain(displayColor[0] + brightnessShift, 0, 255),
    constrain(displayColor[1] + brightnessShift, 0, 255),
    constrain(displayColor[2] + brightnessShift, 0, 255)
  );
  
  // Draw cube with wave size change
  const sizeWave = sin(frameCount * (0.02 + noiseSpeedValue * 0.5) + cube.noiseOffset) * 0.5;
  box(
    cube.width + sizeWave,
    cube.height + sizeWave,
    cube.depth + sizeWave * 0.3
  );
  
  pop();
}
// Optimized pixel readout function
function preprocessImagePixels() {
  if (!sourceImage.pixels.length) {
    sourceImage.loadPixels();
  }
  
  // Cache pixel data
  imagePixelsCache = {
    data: new Uint8Array(sourceImage.pixels), // use Uint8Array for pixel data
    width: sourceImage.width,
    height: sourceImage.height,
    timestamp: millis()
  };
}
// Get pixel color from cached data
function getPixelColor(x, y) {
  if (!imagePixelsCache || x < 0 || y < 0 || x >= imagePixelsCache.width || y >= imagePixelsCache.height) {
    return [0, 0, 0];
  }
  const idx = (y * imagePixelsCache.width + x) * 4;
  return [
    imagePixelsCache.data[idx],    
    imagePixelsCache.data[idx + 1],
    imagePixelsCache.data[idx + 2]
  ];
}
//The 2D road image is converted into a 3D road model with "side walls," where the edge blocks act like guardrails or boundary walls.
// check if pixel is edge pixel
function isEdgePixel(x, y, threshold = 200) {
  if (x <= 0 || y <= 0 || x >= imagePixelsCache.width - 1 || y >= imagePixelsCache.height - 1) {
    return false;
  }
  
  const [r, g, b] = getPixelColor(x, y);
  
  // If the current pixel is not a road (white), return false
  if (r < threshold || g < threshold || b < threshold) {
    return false;
  }
  
  // Check adjacent pixels
  const directions = [
    [0, -1], // up
    [0, 1],  // down
    [-1, 0], // left
    [1, 0]   // right
  ];
  
  for (let [dx, dy] of directions) {
    const [nr, ng, nb] = getPixelColor(x + dx, y + dy);
    // If any adjacent pixel is not a road (white), it's an edge pixel
    if (nr < threshold || ng < threshold || nb < threshold) {
      return true;
    }
  }
  
  return false;
}
function generate3DArt() {
  cubes = [];
  outlineCubes = []; // reset outline cubes
  
  if (!imagePixelsCache) {
    preprocessImagePixels();
    return;
  }
  
  const scaleX = ART_WIDTH / imagePixelsCache.width;
  const scaleY = ART_HEIGHT / imagePixelsCache.height;
  
  // Create grid for storing cube data
  const rows = Math.ceil(imagePixelsCache.height / SAMPLE_STEP);
  const cols = Math.ceil(imagePixelsCache.width / SAMPLE_STEP);
  const grid = Array(rows).fill().map(() => Array(cols).fill(null));
  
  // Sample pixels and create cubes with checkerboard pattern - Remain original checkerboard pattern(1/2 of the points)
  for (let y = 0, row = 0; y < imagePixelsCache.height; y += SAMPLE_STEP, row++) {
    for (let x = 0, col = 0; x < imagePixelsCache.width; x += SAMPLE_STEP, col++) {
      // Remain original checkerboard pattern(1/2 of the points)
      if ((row % 2 === 0 && col % 2 === 0) || (row % 2 === 1 && col % 2 === 1)) {
        const [r, g, b] = getPixelColor(x, y);
        
        // Check if it's a road pixel (white color)
        if (r > 240 && g > 240 && b > 240) {
          // check if edge pixel
          const isEdge = isEdgePixel(x, y, 240);
          
          // Create 3D cube data
          const cubeX = (x * scaleX) - ART_WIDTH/2;
          const cubeY = (y * scaleY) - ART_HEIGHT/2;
          const cubeZ = 0;
          
          // use 2D block size for 3D cubes
          const cubeWidth = UNIT_SIZE;
          const cubeHeight = UNIT_SIZE;
          
          // check edge pixel to increase depth
          let cubeDepth = isEdge ? CUBE_DEPTH * 1.5 : CUBE_DEPTH;
          
          const cubeData = {
            x: cubeX,
            y: cubeY,
            z: cubeZ,
            width: cubeWidth,
            height: cubeHeight,
            depth: cubeDepth,
            color: colors.yellow, // base color yellow
            noiseOffset: noise(row * 0.5, col * 0.5) * TWO_PI
          };
          
          if (isEdge) {
            // edge pixels add to outline cubes
            outlineCubes.push(cubeData);
          } else {
            // inner pixels add to regular cubes
            cubes.push(cubeData);
          }
          
          grid[row][col] = colors.yellow;
        }
      }
    }
  }
// Generate Mondrian blocks data
  generateMondrianBlocksData();
}
function generateMondrianBlocksData() {
  // Mondrian blocks positions and sizes fitted to original design
  const s = 1600 / 600;

  window.mondrianBlocksData = [
    { x: Math.round(910/s) - ART_WIDTH/2, y: Math.round(305/s) - ART_HEIGHT/2, w: Math.round(275/s), h: Math.round(420/s), color: colors.blue },
    { x: Math.round(915/s) - ART_WIDTH/2, y: Math.round(390/s) - ART_HEIGHT/2, w: Math.round(260/s), h: Math.round(230/s), color: colors.red },
    { x: Math.round(960/s) - ART_WIDTH/2, y: Math.round(450/s) - ART_HEIGHT/2, w: Math.round(160/s), h: Math.round(100/s), color: colors.yellow },
    { x: Math.round(80/s) - ART_WIDTH/2, y: Math.round(1160/s) - ART_HEIGHT/2, w: Math.round(160/s), h: Math.round(140/s), color: colors.yellow },
    { x: Math.round(230/s) - ART_WIDTH/2, y: Math.round(960/s) - ART_HEIGHT/2, w: Math.round(150/s), h: Math.round(130/s), color: colors.blue },
    { x: Math.round(1450/s) - ART_WIDTH/2, y: Math.round(1450/s) - ART_HEIGHT/2, w: Math.round(165/s), h: Math.round(165/s), color: colors.yellow },
    { x: Math.round(730/s) - ART_WIDTH/2, y: Math.round(280/s) - ART_HEIGHT/2, w: Math.round(95/s), h: Math.round(95/s), color: colors.yellow },
    { x: Math.round(385/s) - ART_WIDTH/2, y: Math.round(1300/s) - ART_HEIGHT/2, w: Math.round(195/s), h: Math.round(310/s), color: colors.red },
    { x: Math.round(1005/s) - ART_WIDTH/2, y: Math.round(1060/s) - ART_HEIGHT/2, w: Math.round(175/s), h: Math.round(390/s), color: colors.blue },
    { x: Math.round(1000/s) - ART_WIDTH/2, y: Math.round(1120/s) - ART_HEIGHT/2, w: Math.round(125/s), h: Math.round(100/s), color: colors.yellow },
    { x: Math.round(150/s) - ART_WIDTH/2, y: Math.round(455/s) - ART_HEIGHT/2, w: Math.round(225/s), h: Math.round(120/s), color: colors.blue },
    { x: Math.round(280/s) - ART_WIDTH/2, y: Math.round(160/s) - ART_HEIGHT/2, w: Math.round(205/s), h: Math.round(85/s), color: colors.red },
    { x: Math.round(1380/s) - ART_WIDTH/2, y: Math.round(70/s) - ART_HEIGHT/2, w: Math.round(180/s), h: Math.round(120/s), color: colors.blue },
    { x: Math.round(1400/s) - ART_WIDTH/2, y: Math.round(625/s) - ART_HEIGHT/2, w: Math.round(210/s), h: Math.round(210/s), color: colors.red },
    { x: Math.round(1300/s) - ART_WIDTH/2, y: Math.round(865/s) - ART_HEIGHT/2, w: Math.round(130/s), h: Math.round(190/s), color: colors.yellow },
    { x: Math.round(610/s) - ART_WIDTH/2, y: Math.round(945/s) - ART_HEIGHT/2, w: Math.round(215/s), h: Math.round(215/s), color: colors.yellow },
    { x: Math.round(385/s) - ART_WIDTH/2, y: Math.round(740/s) - ART_HEIGHT/2, w: Math.round(220/s), h: Math.round(90/s), color: colors.red },
    { x: Math.round(830/s) - ART_WIDTH/2, y: Math.round(730/s) - ART_HEIGHT/2, w: Math.round(155/s), h: Math.round(155/s), color: colors.red },
  ];
}
// Calculate maximum heights for Mondrian blocks to avoid overlap
function calculateMaxHeights() {
  const maxHeights = {};
  for (let block of window.mondrianBlocksData) {
    const key = block.x + ',' + block.y;
    maxHeights[key] = 15; // default max height
  }
  return maxHeights;
}

function draw3DMondrianBlocks() {
  if (!window.mondrianBlocksData) return;
  
  push();
  noStroke();
  
  // Calculate maximum heights to avoid overlap
  const maxHeights = calculateMaxHeights();
  
  // Draw each Mondrian block as a 3D column
  for (let block of window.mondrianBlocksData) {
    push();
    
    // Base height for all blocks
    const baseHeight = 30;
    
    // Determine column height based on color
    let columnHeight = baseHeight;
    if (block.color === colors.yellow) columnHeight = baseHeight * 1.3;
    if (block.color === colors.blue) columnHeight = baseHeight * 1.1;
    if (block.color === colors.red) columnHeight = baseHeight * 1.2;
    if (block.color === colors.gray) columnHeight = baseHeight * 0.8; // 灰色方塊較矮
    
    // Calculate height variation using noise
    const heightNoise = noise(
      block.x * 0.01, 
      block.y * 0.01, 
      frameCount * 0.02
    );
    
    // Limit height variation to prevent overlap
    const maxVariation = maxHeights[block.x + ',' + block.y] || 15;
    const heightVariation = map(heightNoise, 0, 1, -5, maxVariation);
    
    // calculate final height
    const finalHeight = Math.max(columnHeight + heightVariation, baseHeight * 0.5);
    
    // draw block at correct position
    translate(block.x, block.y, finalHeight/2);
    
    // set block color
    fill(block.color[0], block.color[1], block.color[2]);
    
    // draw "box" not the "plane"
    box(block.w, block.h, finalHeight);
    
    pop();
  }
  
  pop();
 // Draw gray plates on top of colored blocks
  push();
  noStroke();
  
  // Randomly add gray plates on colored blocks
  for (let block of window.mondrianBlocksData) {
    // Skip gray blocks
    if (block.color === colors.gray) continue;
    
    // Use noise to decide if a gray plate should be added
    const grayPlateNoise = noise(
      block.x * 0.02, 
      block.y * 0.02, 
      frameCount * 0.01 + 1000 // offset to ensure different random patterns
    );
    
    // 35% chance to add a gray plate
    if (grayPlateNoise > 0.65) {
      push();
      
      // Determine base height for column
      const baseHeight = 30;
      
      // Determine column height based on color
      let columnHeight = baseHeight;
      if (block.color === colors.yellow) columnHeight = baseHeight * 1.3;
      if (block.color === colors.blue) columnHeight = baseHeight * 1.1;
      if (block.color === colors.red) columnHeight = baseHeight * 1.2;
      
      // Calculate height variation using noise
      const heightNoise = noise(
        block.x * 0.01, 
        block.y * 0.01, 
        frameCount * 0.02
      );
      
      // Height variation
      const heightVariation = map(heightNoise, 0, 1, -5, 15);
      
      // Final block height
      const blockHeight = Math.max(columnHeight + heightVariation, baseHeight * 0.5);
      
      // Determine gray plate height variation using noise
      const plateHeightNoise = noise(
        block.x * 0.03, 
        block.y * 0.03, 
        frameCount * 0.015 + 2000 // offset for different pattern
      );
      
      // gray plate height between 3 to 10
      const plateHeight = map(plateHeightNoise, 0, 1, 3, 10);
      
      // Position gray plate on top of the block
      translate(block.x, block.y, blockHeight + plateHeight/2);
      
      // Gray color with slight transparency
      fill(colors.gray[0], colors.gray[1], colors.gray[2], 180);
      noStroke();
      
      // Draw gray plate slightly smaller than the block
      plane(block.w * 0.8, block.h * 0.8);
      
      pop();
    }
  }
  
  pop();
}



function choose3DColor(grid, row, col) {
  const avoid = [];
  
  // Check neighbors to avoid same colors
  if (row > 0 && grid[row - 1][col]) {
    avoid.push(grid[row - 1][col]);
  }
  if (col > 0 && grid[row][col - 1]) {
    avoid.push(grid[row][col - 1]);
  }
  
  // Color weights
  const weights = [
    { color: colors.gray, weight: 40 },
    { color: colors.yellow, weight: 20 },
    { color: colors.red, weight: 10 },
    { color: colors.blue, weight: 40 }
  ];
  
  // Filter out avoided colors
  const available = weights.filter(w => !avoid.some(avoidColor => 
    avoidColor[0] === w.color[0] && 
    avoidColor[1] === w.color[1] && 
    avoidColor[2] === w.color[2]
  ));
  
  if (available.length === 0) return colors.yellow;
  
  const total = available.reduce((sum, w) => sum + w.weight, 0);
  let noiseVal = noise(col * 0.1, row * 0.1, noiseOffset) * total;
  
  for (let i = 0; i < available.length; i++) {
    if (noiseVal < available[i].weight) {
      return available[i].color;
    }
    noiseVal -= available[i].weight;
  }
  
  return available[0].color;
}

function scaleToWindow() {
  let scaleX = windowWidth / baseWidth;
  let scaleY = windowHeight / baseHeight;
  let scale = Math.max(scaleX, scaleY);
  
  let canvasElement = document.querySelector('canvas');
  canvasElement.style.position = "absolute";
  canvasElement.style.left = "50%";
  canvasElement.style.top = "50%";
  canvasElement.style.transformOrigin = "center center";
  canvasElement.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function windowResized() {
  scaleToWindow();
}