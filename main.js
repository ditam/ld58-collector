import ui from './ui.js';
import utils from './utils.js';
import constants from './constants.js';

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
let MAP_WIDTH = constants.WIDTH;
let MAP_HEIGHT = constants.HEIGHT;

let ctx, ctx2;

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
      return value;
    } else if (prop === 'y') {
      target.y = value;
      return value;
    } else if (prop === 'score') {
      target.score = value;
      return value;
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
      x: utils.getRandomInt(MAP_WIDTH),
      y: utils.getRandomInt(MAP_HEIGHT),
      type: utils.getRandomItem(itemTypes)
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
    trees.push({x: i*100 + utils.getRandomInt(30), y: j*100 + utils.getRandomInt(30)});
  }
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
  // inventory is automatically sold when visiting the merchant:
  const toolBonus = TOOL_STRENGTH * 5;
}

function interact() {
  let found = false;
  mapObjects.some((o, i) => {
    if (utils.dist(o, player) < constants.ACTIVITY_RADIUS) {
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

function switchScenes() {
  mapObjects.length = 0; // empties the map
  if (!inTown) {
    console.log('Returning to town...');
    // the town is always single screen
    MAP_WIDTH = constants.WIDTH;
    MAP_HEIGHT = constants.HEIGHT;
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
  if (ui.keysPressed.up && player.y > 0) {
    player.y = Math.max(0, player.y - effectiveSpeed);
    if (yInViewPort <= constants.VIEWPORT_SCROLL_MARGIN) {
      viewport.y = Math.max(0, viewport.y - effectiveSpeed);
    }
  }
  if (ui.keysPressed.right && player.x < MAP_WIDTH) {
    player.x = Math.min(MAP_WIDTH, player.x + effectiveSpeed);
    if (constants.WIDTH - xInViewPort <= constants.VIEWPORT_SCROLL_MARGIN) {
      viewport.x = Math.min(MAP_WIDTH - constants.WIDTH, viewport.x + effectiveSpeed);
    }
  }
  if (ui.keysPressed.down && player.y < MAP_HEIGHT) {
    player.y = Math.min(MAP_HEIGHT, player.y + effectiveSpeed);
    if (constants.HEIGHT - yInViewPort <= constants.VIEWPORT_SCROLL_MARGIN) {
      viewport.y = Math.min(MAP_HEIGHT - constants.HEIGHT, viewport.y + effectiveSpeed);
    }
  }
  if (ui.keysPressed.left && player.x > 0) {
    player.x = Math.max(0, player.x - effectiveSpeed);
    if (xInViewPort <= constants.VIEWPORT_SCROLL_MARGIN) {
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
  ctx.clearRect(0, 0, constants.WIDTH, constants.HEIGHT);
  ctx2.clearRect(0, 0, constants.WIDTH, constants.HEIGHT);

  // set main bg according to level (later maybe fancy gradients?)
  ctx.fillStyle = inTown? constants.townBGColor : constants.forestBGColor;
  ctx.fillRect(0, 0, constants.WIDTH, constants.HEIGHT);

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
  ctx.arc(xInViewPort, yInViewPort, constants.PLAYER_SIZE, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  if (!inTown) {
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
  }

  requestAnimationFrame(drawFrame);
}

let secondaryCanvas;
$(document).ready(function() {
  const canvas = document.getElementById('main-canvas');
  const canvas2 = document.getElementById('secondary-canvas');
  secondaryCanvas = $(canvas2);
  secondaryCanvas.hide();
  $(canvas).attr('height', constants.HEIGHT);
  $(canvas).attr('width', constants.WIDTH);
  $(canvas2).attr('height', constants.HEIGHT);
  $(canvas2).attr('width', constants.WIDTH);

  debugLog = $('#debug-log');
  inventoryLog = $('#inventory-log');

  ctx = canvas.getContext('2d');
  ctx2 = canvas2.getContext('2d');

  ctx.fillStyle = '#2194caff';
  ctx.strokeStyle = 'green';
  ctx.lineWidth = 1;

  initMerchantDialog();
  ui.init({
    interact: interact,
    switchScenes: switchScenes
  });

  drawFrame();
});
