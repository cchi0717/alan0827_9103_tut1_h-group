let sourceImage;
let artCanvas;
let ready = false;// track if art is ready

const baseWidth = 1920;
const baseHeight = 1080;

// sampling parameters to control the size and ignore the imperfection of the map image
//3D parameters - Increase the spacing between small squares while maintaining the checkerboard pattern
const SAMPLE_STEP = 35;
const UNIT_SIZE = 25;
const CUBE_DEPTH = 8;//Convert 2D to 3D graphics applications

// Decrease shadow movement
// View control
let rotationX = 0;
let rotationY = 0;//Record the actual rotation angle of the object on the X and Y axes.
let targetRotationX = 0;
let targetRotationY = 0;//The target angle to which the object should be rotated is used to achieve a smooth transition.
const ROTATION_SMOOTHING = 0.05;//Control the smoothness of rotation animation
let isDragging = false;//Record whether the user is dragging an object
let lastMouseX, lastMouseY;

// Auto-generation parameters
let noiseOffset = 0;
let NOISE_SPEED = 0.03;
const REGENERATION_INTERVAL = 200;
let lastRegenerationTime = 0;// timestamp of last regeneration

// 3D scene elements
let cubes = [];
let outlineCubes = [];
let wall;
let frame;

// Color definitions:Define colors as RGB arrays
let colors = {
  gray: [214, 215, 210],
  yellow: [225, 201, 39],
  red: [173, 55, 43],
  blue: [49, 66, 148],
  bg: [235, 234, 230]
};

// Artwork display position and size
const ART_X = 656;
const ART_Y = 152;
const ART_WIDTH = 600;
const ART_HEIGHT = 600;

// Image processing cache:Reduce frequent pixel readout operations to make the work smoother.
let imagePixelsCache = null;
let lastImageUpdate = 0;
const IMAGE_CACHE_DURATION = 1000;

// Control sliders
let noiseSpeedSlider;
let waveFrequencySlider;
let colorChangeSpeedSlider;
let noiseSpeedValue = 0.03;
let waveFrequencyValue = 0.05;
let colorChangeSpeedValue = 0.02;

// Class definitions
class Cube3D {
  constructor(x, y, z, width, height, depth, color, noiseOffset) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.color = color;
    this.noiseOffset = noiseOffset;
  }
// Draw cube with wave motion and color change
  draw(waveFrequency, noiseSpeed, colorChangeSpeed, isOutline = false) {
    push();
    translate(this.x, this.y, this.z);
    
    // Wave motion
    const wave = sin(frameCount * waveFrequency + this.noiseOffset) * (isOutline ? 1 : 2);
    translate(0, 0, wave);
    
    // Color change processing
    let displayColor;
    if (isOutline) {
      const colorNoise = noise(this.x * 0.01, this.y * 0.01, frameCount * colorChangeSpeed);
      if (colorNoise < 0.4) {
        displayColor = colors.yellow;
      } else if (colorNoise < 0.55) {
        displayColor = colors.red;
      } else if (colorNoise < 0.7) {
        displayColor = colors.blue;
      } else {
        displayColor = colors.gray;
      }
    } else {
      const colorNoise = noise(this.x * 0.01, this.y * 0.01, frameCount * colorChangeSpeed);
      if (colorNoise < 0.35) {
        displayColor = colors.yellow;
      } else if (colorNoise < 0.5) {
        displayColor = colors.red;
      } else if (colorNoise < 0.65) {
        displayColor = colors.blue;
      } else {
        displayColor = colors.gray;
      }
    }
    
    // Brightness variation
    const brightnessShift = sin(frameCount * (isOutline ? 0.03 : 0.05) + this.noiseOffset) * (isOutline ? 15 : 25);
    fill(
      constrain(displayColor[0] + brightnessShift, 0, 255),
      constrain(displayColor[1] + brightnessShift, 0, 255),
      constrain(displayColor[2] + brightnessShift, 0, 255)
    );
    
    // Size wave effect
    const sizeWave = sin(frameCount * (isOutline ? (0.02 + noiseSpeed * 0.5) : (0.04 + noiseSpeed)) + this.noiseOffset) * (isOutline ? 0.5 : 1.5);
    box(
      this.width + sizeWave,
      this.height + sizeWave,
      this.depth + sizeWave * (isOutline ? 0.3 : 0.5)
    );
    
    pop();
  }
}
// Mondrian block class definition  
class MondrianBlock {
  constructor(x, y, w, h, color) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.color = color;
  }

  draw() {
    push();
    
    // Base height
    const baseHeight = 30;
    
    // Determine column height based on color
    let columnHeight = baseHeight;
    if (this.color === colors.yellow) columnHeight = baseHeight * 1.3;
    if (this.color === colors.blue) columnHeight = baseHeight * 1.1;
    if (this.color === colors.red) columnHeight = baseHeight * 1.2;
    if (this.color === colors.gray) columnHeight = baseHeight * 0.8;
    
    // Height variation using noise
    const heightNoise = noise(
      this.x * 0.01, 
      this.y * 0.01, 
      frameCount * 0.02
    );
    // Max height variation
    const maxVariation = 15;
    const heightVariation = map(heightNoise, 0, 1, -5, maxVariation);
    const finalHeight = Math.max(columnHeight + heightVariation, baseHeight * 0.5);
    
    // Draw block
    translate(this.x, this.y, finalHeight / 2);
    fill(this.color[0], this.color[1], this.color[2]);
    box(this.w, this.h, finalHeight);
    
    // Randomly add gray plates on colored blocks
    if (this.color !== colors.gray) {
      const grayPlateNoise = noise(
        this.x * 0.02, 
        this.y * 0.02, 
        frameCount * 0.01 + 1000
      );
      
      if (grayPlateNoise > 0.65) {
        const plateHeightNoise = noise(
          this.x * 0.03, 
          this.y * 0.03, 
          frameCount * 0.015 + 2000
        );
        
        const plateHeight = map(plateHeightNoise, 0, 1, 3, 10);
        translate(0, 0, finalHeight + plateHeight / 2);
        fill(colors.gray[0], colors.gray[1], colors.gray[2], 180);
        plane(this.w * 0.8, this.h * 0.8);
      }
    }
    
    pop();
  }
}
// Control panel class definition
class ControlPanel {
  constructor() {
    this.container = null;
    this.create();
  }
// Create control panel UI
  create() {
    this.container = createDiv('');
    this.container.style('position', 'absolute');
    this.container.style('top', '20px');
    this.container.style('left', '20px');
    this.container.style('background', 'rgba(255, 255, 255, 0.8)');
    this.container.style('padding', '15px');
    this.container.style('border-radius', '8px');
    this.container.style('font-family', 'Arial, sans-serif');
    this.container.style('font-size', '14px');
    this.container.style('z-index', '100');
    this.container.style('min-width', '250px');

    this.createNoiseSpeedControl();
    this.createWaveFrequencyControl();
    this.createColorChangeSpeedControl();
    this.createResetButton();
  }
// Create individual controls
  createNoiseSpeedControl() {
    const label = createDiv('Size Change:');
    label.parent(this.container);
    label.style('margin-bottom', '5px');
    label.style('font-weight', 'bold');
    
    noiseSpeedSlider = createSlider(0.001, 0.1, noiseSpeedValue, 0.001);
    noiseSpeedSlider.parent(this.container);
    noiseSpeedSlider.style('width', '100%');
    noiseSpeedSlider.style('margin-bottom', '15px');
    
    const valueDisplay = createDiv('value: ' + noiseSpeedValue.toFixed(3));
    valueDisplay.parent(this.container);
    valueDisplay.style('margin-bottom', '15px');
    valueDisplay.id('noiseSpeedValue');
  }
// Create individual controls
  createWaveFrequencyControl() {
    const label = createDiv('Wave Frequency:');
    label.parent(this.container);
    label.style('margin-bottom', '5px');
    label.style('font-weight', 'bold');
    
    waveFrequencySlider = createSlider(0.01, 0.2, waveFrequencyValue, 0.01);
    waveFrequencySlider.parent(this.container);
    waveFrequencySlider.style('width', '100%');
    waveFrequencySlider.style('margin-bottom', '15px');
    
    const valueDisplay = createDiv('value: ' + waveFrequencyValue.toFixed(3));
    valueDisplay.parent(this.container);
    valueDisplay.style('margin-bottom', '15px');
    valueDisplay.id('waveFrequencyValue');
  }
// Create individual controls
  createColorChangeSpeedControl() {
    const label = createDiv('ColorChange:');
    label.parent(this.container);
    label.style('margin-bottom', '5px');
    label.style('font-weight', 'bold');
    
    colorChangeSpeedSlider = createSlider(0.001, 0.1, colorChangeSpeedValue, 0.001);
    colorChangeSpeedSlider.parent(this.container);
    colorChangeSpeedSlider.style('width', '100%');
    colorChangeSpeedSlider.style('margin-bottom', '15px');
    
    const valueDisplay = createDiv('value: ' + colorChangeSpeedValue.toFixed(3));
    valueDisplay.parent(this.container);
    valueDisplay.style('margin-bottom', '15px');
    valueDisplay.id('colorChangeSpeedValue');
  }
// Create reset button
  createResetButton() {
    const resetButton = createButton('Reset to Defaults');
    resetButton.parent(this.container);
    resetButton.style('width', '100%');
    resetButton.style('padding', '8px');
    resetButton.style('background', '#4CAF50');
    resetButton.style('color', 'white');
    resetButton.style('border', 'none');
    resetButton.style('border-radius', '4px');
    resetButton.style('cursor', 'pointer');
    resetButton.mousePressed(this.resetToDefaults);
  }
// Reset sliders to default values
  resetToDefaults() {
    noiseSpeedValue = 0.03;
    waveFrequencyValue = 0.05;
    colorChangeSpeedValue = 0.02;
    noiseSpeedSlider.value(noiseSpeedValue);
    waveFrequencySlider.value(waveFrequencyValue);
    colorChangeSpeedSlider.value(colorChangeSpeedValue);
    this.updateSliderDisplays();
  }
// Update displayed slider values
  updateSliderDisplays() {
    select('#noiseSpeedValue').html('value: ' + noiseSpeedValue.toFixed(3));
    select('#waveFrequencyValue').html('value: ' + waveFrequencyValue.toFixed(3));
    select('#colorChangeSpeedValue').html('value: ' + colorChangeSpeedValue.toFixed(3));
  }
}
// Main artwork class definition
class Artwork3D {
  constructor() {
    this.cubes = [];
    this.outlineCubes = [];
    this.mondrianBlocks = [];
    this.initialized = false;
  }
// Initialize artwork
  initialize() {
    this.preprocessImagePixels();
    this.generate3DArt();
    this.initialized = true;
  }
// Preprocess image pixels and cache them
  preprocessImagePixels() {
    if (!sourceImage.pixels.length) {
      sourceImage.loadPixels();
    }
  // Cache pixel data  
    imagePixelsCache = {
      data: new Uint8Array(sourceImage.pixels),
      width: sourceImage.width,
      height: sourceImage.height,
      timestamp: millis()
    };
  }
// Get pixel color at (x, y)
  getPixelColor(x, y) {
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
// Check if pixel is an edge pixel
  isEdgePixel(x, y, threshold = 200) {
    if (x <= 0 || y <= 0 || x >= imagePixelsCache.width - 1 || y >= imagePixelsCache.height - 1) {
      return false;
    }
    
    const [r, g, b] = this.getPixelColor(x, y);
    
    if (r < threshold || g < threshold || b < threshold) {
      return false;
    }
    
    const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    
    for (let [dx, dy] of directions) {
      const [nr, ng, nb] = this.getPixelColor(x + dx, y + dy);
      if (nr < threshold || ng < threshold || nb < threshold) {
        return true;
      }
    }
    
    return false;
  }
// Generate 3D artwork based on image pixels
  generate3DArt() {
    this.cubes = [];
    this.outlineCubes = [];
    
    if (!imagePixelsCache) {
      this.preprocessImagePixels();
      return;
    }
    
    const scaleX = ART_WIDTH / imagePixelsCache.width;
    const scaleY = ART_HEIGHT / imagePixelsCache.height;
    
    const rows = Math.ceil(imagePixelsCache.height / SAMPLE_STEP);
    const cols = Math.ceil(imagePixelsCache.width / SAMPLE_STEP);
    
    // Sample pixels and create cubes with checkerboard pattern
    for (let y = 0, row = 0; y < imagePixelsCache.height; y += SAMPLE_STEP, row++) {
      for (let x = 0, col = 0; x < imagePixelsCache.width; x += SAMPLE_STEP, col++) {
        // Checkerboard pattern (1/2 of the points)
        if ((row % 2 === 0 && col % 2 === 0) || (row % 2 === 1 && col % 2 === 1)) {
          const [r, g, b] = this.getPixelColor(x, y);
          
          // Check if it's a road pixel (white color)
          if (r > 240 && g > 240 && b > 240) {
            const isEdge = this.isEdgePixel(x, y, 240);
            
            const cubeX = (x * scaleX) - ART_WIDTH/2;
            const cubeY = (y * scaleY) - ART_HEIGHT/2;
            const cubeZ = 0;
            
            const cubeWidth = UNIT_SIZE;
            const cubeHeight = UNIT_SIZE;
            let cubeDepth = isEdge ? CUBE_DEPTH * 1.5 : CUBE_DEPTH;
            
            const cube = new Cube3D(
              cubeX,
              cubeY,
              cubeZ,
              cubeWidth,
              cubeHeight,
              cubeDepth,
              colors.yellow,
              noise(row * 0.5, col * 0.5) * TWO_PI
            );
            
            if (isEdge) {
              this.outlineCubes.push(cube);
            } else {
              this.cubes.push(cube);
            }
          }
        }
      }
    }
    
    this.generateMondrianBlocks();
  }
// Mondrian blocks positions and sizes fitted to original design
  generateMondrianBlocks() {
    const s = 1600 / 600; // Scale factor
    
    const blocksData = [
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
    
    this.mondrianBlocks = blocksData.map(data => 
      new MondrianBlock(data.x, data.y, data.w, data.h, data.color)
    );
  }

  draw() {
    this.drawMondrianBlocks();
    this.drawOutlineCubes();
    this.drawCubes();
  }

  drawMondrianBlocks() {
    push();
    noStroke();
    for (let block of this.mondrianBlocks) {
      block.draw();
    }
    pop();
  }

  drawOutlineCubes() {
    for (let cube of this.outlineCubes) {
      cube.draw(waveFrequencyValue * 0.5, noiseSpeedValue, colorChangeSpeedValue, true);
    }
  }

  drawCubes() {
    for (let cube of this.cubes) {
      cube.draw(waveFrequencyValue, noiseSpeedValue, colorChangeSpeedValue, false);
    }
  }
}

class Frame3D {
  constructor() {
    this.width = 600;
    this.height = 600;
    this.depth = 50;
    this.frameColor = [191, 168, 154];
    this.shadowColor = [168, 137, 116];
  }

  draw() {
    // Frame front
    push();
    fill(this.frameColor);
    noStroke();
    translate(0, 0, 0);
    plane(this.width, this.height);
    pop();
    
    // Frame sides
    push();
    fill(this.shadowColor);
    
    // Top side
    push();
    translate(0, -this.height/2, -this.depth/2);
    box(this.width, 10, this.depth);
    pop();
    
    // Bottom side
    push();
    translate(0, this.height/2, -this.depth/2);
    box(this.width, 10, this.depth);
    pop();
    
    // Left side
    push();
    translate(-this.width/2, 0, -this.depth/2);
    box(10, this.height, this.depth);
    pop();
    
    // Right side
    push();
    translate(this.width/2, 0, -this.depth/2);
    box(10, this.height, this.depth);
    pop();
    
    pop();
  }
}

// Global variables
let artwork3D;
let frame3D;
let controlPanel;

function preload() {
  sourceImage = loadImage('Street.png');
}

function setup() {
  const renderer = createCanvas(baseWidth, baseHeight, WEBGL);
  const ctx = renderer.elt.getContext('webgl') || renderer.elt.getContext('experimental-webgl');
  if (ctx) {
    ctx.getContextAttributes().willReadFrequently = true;
  }
  
  setAttributes('antialias', true);
  document.body.style.overflow = 'hidden';
  
  // Initialize class instances
  artwork3D = new Artwork3D();
  frame3D = new Frame3D();
  controlPanel = new ControlPanel(); // Control panel is created here
  
  // Set up mouse events
  canvas = document.querySelector('canvas');
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  
  // Initialize scene
  initializeScene();
  ready = true;
  scaleToWindow();
}

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
  
  artwork3D.initialize();
}

function draw() {
  background(255);
  
  // Update slider values
  noiseSpeedValue = noiseSpeedSlider.value();
  waveFrequencyValue = waveFrequencySlider.value();
  colorChangeSpeedValue = colorChangeSpeedSlider.value();
  controlPanel.updateSliderDisplays();

  // View control
  if (!isDragging) {
    // Let camera slowly follow mouse position
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
  
  // Auto-regenerate artwork
  noiseOffset += noiseSpeedValue;
  if (millis() - lastRegenerationTime > REGENERATION_INTERVAL) {
    if (!imagePixelsCache || millis() - imagePixelsCache.timestamp > IMAGE_CACHE_DURATION) {
      artwork3D.preprocessImagePixels();
    }
    artwork3D.generate3DArt();
    lastRegenerationTime = millis();
  }
}

function draw3DScene() {
  // Enable lighting
  directionalLight(255, 255, 255, 0, 0, -1);
  ambientLight(100);
  
  // Calculate artwork position
  const artX = ART_X + ART_WIDTH/2 - width/2;
  const artY = ART_Y + ART_HEIGHT/2 - height/2;
  
  // Draw wall
  push();
  fill(colors.bg[0], colors.bg[1], colors.bg[2]);
  noStroke();
  translate(artX, artY, -50);
  pop();
  
  // Draw frame
  push();
  translate(artX, artY, -25);
  frame3D.draw();
  pop();
  
  // Draw 3D artwork
  push();
  translate(artX, artY, 25);
  draw3DArt();
  pop();
}

function draw3DArt() {
  // Enable lighting for artwork
  directionalLight(255, 255, 255, 0, 0, -1);
  pointLight(200, 200, 200, 0, 0, 100);
  
  // Use class method to draw
  artwork3D.draw();
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