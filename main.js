
const WIDTH = 800;
const HEIGHT = 500;
const PLAYER_SIZE = 20;
const ACTIVITY_RADIUS = 50;
// movement within this margin attempts to scroll the viewport if possible
const VIEWPORT_SCROLL_MARGIN = 150;

const forestBGColor = 'rgb(50, 100, 50)';
const townBGColor = 'rgba(93, 83, 49, 1)';

// upgradeable properties
let INVENTORY_SIZE = 1;
let PLAYER_SPEED = 1;
let VISION_SIZE = 1;
let TOOL_STRENGTH = 1;
let hasFollower = false;

const inventory = [];

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
  score: 0,
};

const viewport = {
  // x and y are offsets from (0, 0)
  // TODO: guards against negatives
  x: 0,
  y: 0,
};
let player = new Proxy(player_internal, {
  set(target, prop, value) {
    // TODO: adjust viewport x/y
    if (prop === 'x') {
      target.x = value;
    } else if (prop === 'y') {
      target.y = value;
    } else if (prop === 'score') {
      target.score = value;
      // TODO: update counter
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

let merchantScreen;
function getUpgradePrice(name, level) {
  console.assert(['inventory', 'speed', 'vision', 'tool'].includes(name));
  console.assert(Number.isInteger(level) && level >= 0);
  if (level > 4) {
    return 9999;
  }
  return {
    'inventory': [0, 1, 2, 3, 4],
    'speed':     [0, 1, 2, 3, 4],
    'vision':    [0, 1, 2, 3, 4],
    'tool':      [0, 1, 2, 3, 4]
  }[name][level];
}
function initMerchantDialog() {
  merchantScreen = $('#merchant-screen');
  merchantScreen.hide();
  merchantScreen.find('#p1').text('Welcome, Stranger!');
  merchantScreen.find('#p2').text('Are you here for the mushroom season?');

  merchantScreen.find('#hireling-upgrade').hide();

  // TODO: display upg prices
  merchantScreen.find('#inventory-upgrade .button').click(e => {
    const upgCost = getUpgradePrice('inventory', INVENTORY_SIZE+1);
    if (player.score < upgCost) {
      console.log('Cant afford inventory upgrade:', upgCost);
      // FIXME: play error sound
    } else {
      player.score -= upgCost;
      INVENTORY_SIZE++;
    }
  });
  merchantScreen.find('#speed-upgrade .button').click(e => {
    const upgCost = getUpgradePrice('speed', PLAYER_SPEED+1);
    if (player.score < upgCost) {
      console.log('Cant afford speed upgrade:', upgCost);
      // FIXME: play error sound
    } else {
      player.score -= upgCost;
      PLAYER_SPEED++;
    }
  });
  merchantScreen.find('#vision-upgrade .button').click(e => {
    const upgCost = getUpgradePrice('vision', VISION_SIZE+1);
    if (player.score < upgCost) {
      console.log('Cant afford vision upgrade:', upgCost);
      // FIXME: play error sound
    } else {
      player.score -= upgCost;
      VISION_SIZE++;
    }
  });
  merchantScreen.find('#tool-upgrade .button').click(e => {
    const upgCost = getUpgradePrice('tool', TOOL_STRENGTH+1);
    if (player.score < upgCost) {
      console.log('Cant afford tool upgrade:', upgCost);
      // FIXME: play error sound
    } else {
      player.score -= upgCost;
      TOOL_STRENGTH++;
    }
  });
  merchantScreen.find('#hireling-upgrade .button').click(e => {
    const upgCost = 5000;
    if (player.score < upgCost) {
      console.log('Cant afford hireling upgrade:', upgCost);
      // FIXME: play error sound
    } else {
      player.score -= upgCost;
      hasFollower = true;
    }
  });

  // TODO: upgrade button to show next level price
};

function showMerchantDialog() {
  merchantScreen.show();
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
        if (o.type === 'large' && TOOL_STRENGTH < 2) {
          // FIXME: show error
          // FIXME: play error sound
          // TODO: tool size should have effect beyond 2 as well - increased item values maybe?
          return;
        }
        const item = mapObjects.splice(i, 1)[0];
        console.log('found item:', item);
        inventory.push({type: item.type});
        if (inventory.length >= (INVENTORY_SIZE+5)) {
          // TODO: somehow explain to user why they go back? Simple confirm message?
          switchScenes();
        }
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
  const effectiveSpeed = PLAYER_SPEED + 3;
  const xInViewPort = player.x - viewport.x;
  const yInViewPort = player.y - viewport.y;
  if (keysPressed.up && player.y > 0) {
    player.y = Math.max(0, player.y - effectiveSpeed);
    if (yInViewPort <= VIEWPORT_SCROLL_MARGIN) {
      viewport.y = Math.max(0, viewport.y - effectiveSpeed);
    }
  }
  if (keysPressed.right && player.x < MAP_WIDTH) {
    player.x = Math.min(MAP_WIDTH, player.x + effectiveSpeed);
    if (WIDTH - xInViewPort <= VIEWPORT_SCROLL_MARGIN) {
      viewport.x = Math.min(MAP_WIDTH - WIDTH, viewport.x + effectiveSpeed);
    }
  }
  if (keysPressed.down && player.y < MAP_HEIGHT) {
    player.y = Math.min(MAP_HEIGHT, player.y + effectiveSpeed);
    if (HEIGHT - yInViewPort <= VIEWPORT_SCROLL_MARGIN) {
      viewport.y = Math.min(MAP_HEIGHT - HEIGHT, viewport.y + effectiveSpeed);
    }
  }
  if (keysPressed.left && player.x > 0) {
    player.x = Math.max(0, player.x - effectiveSpeed);
    if (xInViewPort <= VIEWPORT_SCROLL_MARGIN) {
      viewport.x = Math.max(0, viewport.x - effectiveSpeed);
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
  ctx2.arc(xInViewPort, yInViewPort, (VISION_SIZE+3)*20, 0, Math.PI*2);
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

  initMerchantDialog();

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
