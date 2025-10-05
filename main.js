
const WIDTH = 800;
const HEIGHT = 500;
const PLAYER_SPEED = 4;
const PLAYER_SIZE = 20;
const ACTIVITY_RADIUS = 50;
// movement within this margin attempts to scroll the viewport if possible
const VIEWPORT_SCROLL_MARGIN = 150;

const forestBGColor = 'rgb(50, 100, 50)';
const townBGColor = 'rgba(93, 83, 49, 1)';

// The game starts in town
let inTown = true;
// not actually const, depends on current level
let MAP_WIDTH = WIDTH;
let MAP_HEIGHT = HEIGHT;

let ctx, ctx2;

// TODO: utils module
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}
function getRandomInt(min, max) { // min and max included
  if (typeof max === 'undefined') {
    max = min;
    min = 0;
  }
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const player_internal = {
  x: 300,
  y: 120,
};

const viewport = {
  // x and y are offsets from (0, 0)
  // TODO: guards against negatives
  x: 0,
  y: 0,
}
let player = new Proxy(player_internal, {
  set(target, prop, value) {
    // TODO: adjust viewport x/y
    if (prop === 'x') {
      target.x = value;
    } else if (prop === 'y') {
      target.y = value;
    } else {
      console.warn('Unknown property setter:', prop);
      return Reflect.set(...arguments);
    }
  },
});

const mapObjects = [];
const itemTypes = ['rock', 'basic'];

function generateMapObjects() {
  for (let i=0; i<50; i++) {
    mapObjects.push({
      x: getRandomInt(MAP_WIDTH),
      y: getRandomInt(MAP_HEIGHT),
      type: getRandomItem(itemTypes)
    });
  }
}

function generateTownObjects() {
  mapObjects.push({
    type: 'exit',
    x: 300,
    y: 50
  });
  mapObjects.push({
    type: 'merchant',
    x: 500,
    y: 400
  });
}
generateTownObjects()

const inventory = [];

const trees = [];
for (let i=0; i<20; i++) {
  for (let j=0; j<12; j++) {
    trees.push({x: i*100 + getRandomInt(30), y: j*100 + getRandomInt(30)});
  }
}

function dist(a, b) {
  console.assert(a.hasOwnProperty('x') && a.hasOwnProperty('y') && b.hasOwnProperty('x') && b.hasOwnProperty('y'), 'Invalid dist targets:', a, b);
  const dX = a.x-b.x;
  const dY = a.y-b.y;
  return Math.sqrt(dX*dX + dY*dY);
}

function showMerchantDialog() {
  console.log('opening merchant dialog...');
}

function interact() {
  let found = false;
  mapObjects.some((o, i) => {
    if (dist(o, player) < ACTIVITY_RADIUS) {
      found = true;
      if (inTown) {
        // in town: interact with object
        if (o.type === 'exit') {
          switchScenes();
        } else if (o.type === 'merchant') {
          showMerchantDialog();
        }
      } else {
        // in forest: remove item from map and move to inventory
        const item = mapObjects.splice(i, 1)[0];
        console.log('found item:', item);
        inventory.push({type: item.type});
      }
      return true;
    }
  });
  if (!found) {
    console.warn('No interaction available at', player.x, player.y);
  }
}

const keysPressed = {
  up:    false,
  right: false,
  down:  false,
  left:  false,
  e:     false,
};

function switchScenes() {
  mapObjects.length = 0; // empties the map
  if (!inTown) {
    console.log('Returning to town...');
    // the town is always single screen
    MAP_WIDTH = WIDTH;
    MAP_HEIGHT = HEIGHT;
    generateTownObjects();
    player.x = 400;
    player.y = 150;
    secondaryCanvas.hide();
  } else {
    console.log('Entering forest...');
    MAP_WIDTH = 2000;
    MAP_HEIGHT = 1200;
    generateMapObjects();
    secondaryCanvas.show();
  }
  inTown = !inTown;
}

function applyMovement() {
  const xInViewPort = player.x - viewport.x;
  const yInViewPort = player.y - viewport.y;
  if (keysPressed.up && player.y > 0) {
    player.y = Math.max(0, player.y - PLAYER_SPEED);
    if (yInViewPort <= VIEWPORT_SCROLL_MARGIN) {
      viewport.y = Math.max(0, viewport.y - PLAYER_SPEED);
    }
  }
  if (keysPressed.right && player.x < MAP_WIDTH) {
    player.x = Math.min(MAP_WIDTH, player.x + PLAYER_SPEED);
    if (WIDTH - xInViewPort <= VIEWPORT_SCROLL_MARGIN) {
      viewport.x = Math.min(MAP_WIDTH - WIDTH, viewport.x + PLAYER_SPEED);
    }
  }
  if (keysPressed.down && player.y < MAP_HEIGHT) {
    player.y = Math.min(MAP_HEIGHT, player.y + PLAYER_SPEED);
    if (HEIGHT - yInViewPort <= VIEWPORT_SCROLL_MARGIN) {
      viewport.y = Math.min(MAP_HEIGHT - HEIGHT, viewport.y + PLAYER_SPEED);
    }
  }
  if (keysPressed.left && player.x > 0) {
    player.x = Math.max(0, player.x - PLAYER_SPEED);
    if (xInViewPort <= VIEWPORT_SCROLL_MARGIN) {
      viewport.x = Math.max(0, viewport.x - PLAYER_SPEED);
    }
  }
}

let debugLog, inventoryLog;
function drawFrame(timestamp) {
  applyMovement();
  debugLog.text(JSON.stringify(player) + ', ' + JSON.stringify(viewport));
  inventoryLog.text(JSON.stringify(inventory));
  const xInViewPort = player.x - viewport.x;
  const yInViewPort = player.y - viewport.y;

  // clear both canvases
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx2.clearRect(0, 0, WIDTH, HEIGHT);

  // set main bg according to level (later maybe fancy gradients?)
  ctx.fillStyle = inTown? townBGColor : forestBGColor;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // debug / alignment markers
  ctx.save();
  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'black';
  mapObjects.forEach(o => {
    ctx.fillRect(o.x - viewport.x, o.y - viewport.y, 10, 10);
  });
  ctx.restore();

  // draw player
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = 'rgba(206, 169, 20, 1)';
  ctx.arc(xInViewPort, yInViewPort, PLAYER_SIZE, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // draw forest cover on secondary canvas
  ctx2.fillStyle = 'green';
  trees.forEach(t=>{
    ctx2.beginPath();
    ctx2.arc(t.x - viewport.x, t.y - viewport.y, 45, 0, Math.PI*2);
    ctx2.fill();
  })
  // draw visibility aroud player
  ctx2.save();
  ctx2.filter = 'blur(20px)';
  ctx2.globalCompositeOperation = 'destination-out';
  ctx2.beginPath();
  ctx2.arc(xInViewPort, yInViewPort, 120, 0, Math.PI*2);
  ctx2.fill();
  ctx2.restore();

  requestAnimationFrame(drawFrame);
}

let secondaryCanvas;
$(document).ready(function() {
  const canvas = document.getElementById('main-canvas');
  const canvas2 = document.getElementById('secondary-canvas');
  secondaryCanvas = $(canvas2);
  secondaryCanvas.hide();
  $(canvas).attr('height', HEIGHT);
  $(canvas).attr('width', WIDTH);
  $(canvas2).attr('height', HEIGHT);
  $(canvas2).attr('width', WIDTH);

  debugLog = $('#debug-log');
  inventoryLog = $('#inventory-log');

  ctx = canvas.getContext('2d');
  ctx2 = canvas2.getContext('2d');

  ctx.fillStyle = '#2194caff';
  ctx.strokeStyle = 'green';
  ctx.lineWidth = 1;

  document.addEventListener('keydown', event => {
    switch(event.code) {
      case 'KeyW':
      case 'ArrowUp':
        event.preventDefault();
        keysPressed.up = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        event.preventDefault();
        keysPressed.right = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        event.preventDefault();
        keysPressed.down = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        event.preventDefault();
        keysPressed.left = true;
        break;
      case 'KeyE':
        keysPressed.e = true;
        interact();
        break;
      case 'KeyL':
        switchScenes();
        break;
    }
  });

  document.addEventListener('keyup', event => {
    switch(event.code) {
      case 'KeyW':
      case 'ArrowUp':
        keysPressed.up = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        keysPressed.right = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        keysPressed.down = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        keysPressed.left = false;
        break;
      case 'KeyE':
        keysPressed.e = false;
        break;
    }
  });

  drawFrame();
});
