import ui from './ui.js';
import utils from './utils.js';
import constants from './constants.js';

// upgradeable properties
let INVENTORY_SIZE = 1;
let PLAYER_SPEED = 1;
let VISION_SIZE = 1;
let TOOL_STRENGTH = 1;
let hasFollower = false;

let maxItems = INVENTORY_SIZE + 5;
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
  score: 100,
};

if (window.isDebug) {
  player_internal.score = 5034;
}

const viewport = {
  // x and y are offsets from (0, 0)
  // TODO: guards against negatives
  x: 0,
  y: 0,
};
const player = new Proxy(player_internal, {
  set(target, prop, value) {
    // TODO: adjust viewport x/y
    if (prop === 'x') {
      target.x = value;
      // NB: if we return value 0 would raise a trap returned falsish error
      return target;
    } else if (prop === 'y') {
      target.y = value;
      return target;
    } else if (prop === 'score') {
      target.score = value;
      return target;
      // TODO: update counter
    } else {
      console.warn('Unknown property setter:', prop);
      return Reflect.set(...arguments);
    }
  },
});

let mapObjects = [];
// we allow duplicates here as a simple probability distribution hack
const availableItemTypes = ['rock', 'basic', 'basic'];
const notYetAddedItemTypes = ['basic2', 'rare', 'poison', 'large', 'rare'];

const playerSprite = $('<img>').attr('src', 'img/player-sprite.png').get(0);
const merchantSprite = $('<img>').attr('src', 'img/merchant-sprite.png').get(0);

// TODO: there should be a single source
const itemTypes = ['rock', 'basic', 'basic2', 'rare', 'poison', 'large'];
const type2Name = {
  'rock': 'useless rock',
  'basic': 'Common Boletus',
  'basic2': 'White Trumpet',
  'rare': 'Autumn Morel',
  'poison': 'Funky Conecap',
  'large': 'Sprawling Maitake'
}
const type2Price = {
  'rock': 0,
  'basic': 20,
  'basic2': 30,
  'rare': 250,
  'poison': 0,
  'large': 300
}
// FIXME: unify tree and item sources
const type2Img = {
  'rock': $('<img>').attr('src', 'img/rock.png').get(0),
  'basic': $('<img>').attr('src', 'img/mushroom-basic.png').get(0),
  'basic2': $('<img>').attr('src', 'img/mushroom-basic2.png').get(0),
  'rare': $('<img>').attr('src', 'img/mushroom-rare.png').get(0),
  'poison': $('<img>').attr('src', 'img/mushroom-poison.png').get(0),
  'large': $('<img>').attr('src', 'img/mushroom-large.png').get(0),
  'merchant': $('<img>').attr('src', 'img/merchant.png').get(0),
  'exit': $('<img>').attr('src', 'img/forest-sign.png').get(0),
  'town-bg': $('<img>').attr('src', 'img/town-bg.png').get(0),
  'town-tree1': $('<img>').attr('src', 'img/tree1.png').get(0),
  'town-tree3': $('<img>').attr('src', 'img/tree3.png').get(0),
}
itemTypes.forEach(t => {
  console.assert(type2Name.hasOwnProperty(t), 'Missing name for type:', t);
  console.assert(type2Price.hasOwnProperty(t), 'Missing cost for type:', t);
  console.assert(type2Img.hasOwnProperty(t), 'Missing img for type:', t);
});

function generateMapObjects() {
  for (let i=0; i<50; i++) {
    mapObjects.push({
      x: utils.getRandomInt(MAP_WIDTH),
      y: utils.getRandomInt(MAP_HEIGHT),
      type: utils.getRandomItem(availableItemTypes)
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
    x: 750,
    y: 200
  });
  mapObjects.push({
    type: 'town-bg',
    x: 350,
    y: 0
  });
  mapObjects.push({
    type: 'town-tree3',
    x: 200,
    y: 200
  });
  mapObjects.push({
    type: 'town-tree3',
    x: 600,
    y: 150
  });
  mapObjects.push({
    type: 'town-tree1',
    x: 800,
    y: 40
  });
}
generateTownObjects()

const treeImages = [
  $('<img>').attr('src', 'img/tree1.png').get(0),
  $('<img>').attr('src', 'img/tree2.png').get(0),
  $('<img>').attr('src', 'img/tree3.png').get(0),
  $('<img>').attr('src', 'img/tree4.png').get(0)
];
// TODO: regen for each level
let trees = [];
for (let i=0; i<=20; i++) {
  for (let j=0; j<=24; j++) {
    trees.push({
      // TODO: move rand ranges to params
      x: i*100 -75 + utils.getRandomInt(140),
      y: j*100 -75 + utils.getRandomInt(140),
      img: utils.getRandomItem(treeImages)
    });
  }
}
trees.sort((a, b) => a.y - b.y);

let header;
function updateHeader() {
  const inventoryEl = header.find('#inventory');
  inventoryEl.empty();
  for (let i=0; i<maxItems; i++) {
    const slot = $('<div>').addClass('slot');
    if (inventory[i]) {
      slot.addClass('filled');
    }
    slot.appendTo(inventoryEl);
  }

  const score = header.find('#score');
  score.text(player.score);
}

let merchantScreen;
function getUpgradePrice(name, level) {
  console.assert(['inventory', 'speed', 'vision', 'tool'].includes(name));
  console.assert(Number.isInteger(level) && level >= 0);
  if (level > 4) {
    return 9999;
  }
  return {
    'inventory': [0, 20, 50, 300, 800],
    'speed':     [0, 200, 500, 1500, 5000],
    'vision':    [0, 50, 100, 200, 800],
    'tool':      [0, 250, 500, 750, 1500]
  }[name][level];
}
function initMerchantDialog() {
  merchantScreen = $('#merchant-screen');
  merchantScreen.hide();

  merchantScreen.find('#hireling-upgrade').hide();

  merchantScreen.find('#inventory-upgrade .button').click(e => {
    const upgCost = getUpgradePrice('inventory', INVENTORY_SIZE);
    if (player.score < upgCost) {
      console.log('Cant afford inventory upgrade:', upgCost);
      // FIXME: play error sound
    } else {
      player.score -= upgCost;
      INVENTORY_SIZE++;
      maxItems = INVENTORY_SIZE+5;
      updateHeader();
      // FIXME: add a way to close the merchant dialog, so more updates can be bought at once.
      merchantScreen.hide();
    }
  });
  merchantScreen.find('#speed-upgrade .button').click(e => {
    const upgCost = getUpgradePrice('speed', PLAYER_SPEED);
    if (player.score < upgCost) {
      console.log('Cant afford speed upgrade:', upgCost);
      // FIXME: play error sound
    } else {
      player.score -= upgCost;
      PLAYER_SPEED++;
      updateHeader();
      merchantScreen.hide();
    }
  });
  merchantScreen.find('#vision-upgrade .button').click(e => {
    const upgCost = getUpgradePrice('vision', VISION_SIZE);
    if (player.score < upgCost) {
      console.log('Cant afford vision upgrade:', upgCost);
      // FIXME: play error sound
    } else {
      player.score -= upgCost;
      VISION_SIZE++;
      updateHeader();
      merchantScreen.hide();
    }
  });
  merchantScreen.find('#tool-upgrade .button').click(e => {
    const upgCost = getUpgradePrice('tool', TOOL_STRENGTH);
    if (player.score < upgCost) {
      console.log('Cant afford tool upgrade:', upgCost);
      // FIXME: play error sound
    } else {
      player.score -= upgCost;
      TOOL_STRENGTH++;
      updateHeader();
      merchantScreen.hide();
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
      updateHeader();
      merchantScreen.hide();
    }
  });
};

const loreMsgs = [
  'If you bring me fresh mushrooms from the forest, I\'ll buy them for a fair price.',
  'Have you heard of the forest god, the Mondrokko? He is the patron of mushroom pickers.',
  'Mondrokko is not only a patron - he also punishes greedy travellers!'
];

function showMerchantDialog() {
  // update current prices:
  merchantScreen.find('#inventory-upgrade .price').text(getUpgradePrice('inventory', INVENTORY_SIZE));
  merchantScreen.find('#speed-upgrade .price').text(getUpgradePrice('speed', PLAYER_SPEED));
  merchantScreen.find('#vision-upgrade .price').text(getUpgradePrice('vision', VISION_SIZE));
  merchantScreen.find('#tool-upgrade .price').text(getUpgradePrice('tool', TOOL_STRENGTH));

  // inventory is automatically sold when visiting the merchant:
  let valueSum = 0;
  const toolBonus = TOOL_STRENGTH * 5;
  inventory.forEach(i => {
    valueSum+=type2Price[i.type] + toolBonus;
  });
  let sMsg;
  // special cases make the whole basket worth 0:
  // - mostly rocks
  // - poison included
  if (forestVisits === 0) {
    sMsg = 'Welcome, Stranger! Are you here for the mushroom season?';
  } else if (inventory.length === 0) {
    valueSum = 0;
    sMsg = 'Bring me fresh mushrooms from the forest. I\'ll pay a fair price.';
  } else if (inventory.filter(i => i.type === 'rock').length >= inventory.length / 2) {
    valueSum = 0;
    sMsg = 'This is mostly rocks! I\'m not interested.';
  } else if (inventory.some(i => i.type === 'poison')) {
    valueSum = 0;
    sMsg = 'There are poison mushrooms mixed in there. Toss the whole thing.';
  } else if (forestVisits > 5 && valueSum) {
    sMsg = 'Frankly, I wouldn\'t mind joining you myself. Together we could make much larger profits.';
    merchantScreen.find('#hireling-upgrade').show();
  }
  if (!sMsg) {
    const firstItem = inventory.filter(i => i.type !== 'rock')[0];
    const sName = type2Name[firstItem.type];
    sMsg = getRandomItem([
      `What a beautiful {sName}! I'll pay you a fair price.`,
      `Cooks love the {sName}, just fry it up with some butter.`,
      `Fresh {sName}? This time of the year? Sold.`,
      `A great batch, I'll buy it all.`,
      `Ah, the {sName}. I bring these to Perthshire to re-sell.`,
    ]);
  }
  player.score += valueSum;
  inventory.length = 0;
  updateHeader();

  merchantScreen.find('#p1').text(sMsg);
  merchantScreen.find('#p2').text(loreMsgs[forestVisits % loreMsgs.length]);

  merchantScreen.show();
}

// TODO: move this to onclick of cover screen
let audioStarted = false;
function interact() {
  if (!audioStarted) {
    songs[0].play();
    songs[0].addEventListener('ended', function() {
      songs[0].currentTime = 0;
      songs[0].play();
      // TODO: once we have multiple songs:
      //this.pause();
      //songs[1].play();
      //songs[1].addEventListener('ended', function() {
      //  songs[1].currentTime = 0;
      //  songs[1].play();
      //}, false);
    }, false);
    audioStarted = true;
  }

  let found = false;
  const rangeModifier = inTown? 2 : 1;
  mapObjects.some((o, i) => {
    if (utils.dist(o, player) < constants.ACTIVITY_RADIUS * rangeModifier) {
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
          console.log('Leaving large item.');
          return;
        }
        const item = mapObjects.splice(i, 1)[0];
        console.log('found item:', item);
        if (hasFollower) {
          // sell immediately
          player.score += type2Price[item.type];
        } else {
          // put in backpack
          inventory.push({type: item.type});
        }
        updateHeader();
        if (inventory.length >= maxItems) {
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

let forestVisits = 0;
function switchScenes() {
  mapObjects.length = 0; // empties the map
  if (!inTown) {
    console.log('Returning to town...');
    // the town is always single screen
    MAP_WIDTH = constants.WIDTH;
    MAP_HEIGHT = constants.HEIGHT;
    viewport.x = 0;
    viewport.y = 0;
    player.x = 400;
    player.y = 150;
    generateTownObjects();
    secondaryCanvas.hide();
  } else {
    forestVisits++;
    if (notYetAddedItemTypes.length) {
      availableItemTypes.push(notYetAddedItemTypes.shift());
    }
    console.log('Entering forest, available types:', availableItemTypes);
    MAP_WIDTH = 2000;
    MAP_HEIGHT = 2400;
    viewport.x = 600;
    viewport.y = 2400 - constants.HEIGHT;
    player.x = 1000;
    player.y = 2300;
    generateMapObjects();
    merchantScreen.hide();
    secondaryCanvas.show();

    if (hasFollower) {
      // clear everything in top middle
      mapObjects = mapObjects.filter(o => {
        return (o.y > constants.HEIGHT || o.x < 700 || o.x > 1300);
      });
      trees = trees.filter(o => {
        return (o.y > constants.HEIGHT || o.x < 700 || o.x > 1300);
      });
      // add mushroom circle axis x=1000 y=300
      mapObjects.push({ type: 'basic2', x: 1000, y: 200 });
      mapObjects.push({ type: 'basic2', x: 1125, y: 250 });
      mapObjects.push({ type: 'basic2', x: 1160, y: 300 });
      mapObjects.push({ type: 'basic2', x: 1125, y: 350 });
      mapObjects.push({ type: 'basic2', x: 1000, y: 400 });
      mapObjects.push({ type: 'basic2', x:  875, y: 350 });
      mapObjects.push({ type: 'basic2', x:  840, y: 300 });
      mapObjects.push({ type: 'basic2', x:  875, y: 250 });
    }
  }
  inTown = !inTown;
}

let movementLocked = false;
function applyMovement() {
  if (movementLocked) {
    return;
  }
  const effectiveSpeed = PLAYER_SPEED + 1;
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

  if (hasFollower && !inTown && viewport.y < 500 && viewport.x > 400) {
    movementLocked = true;
    // FIXME: move view incrementally
    viewport.x = 510;
    viewport.y = 20;
    player.x = 720;
    player.y = 380;
  }
}

let debugLog, inventoryLog;
let frameCount = 0;
let finaleStartTime;
function drawFrame(timestamp) {
  frameCount++;
  applyMovement();

  if (window.isDebug) {
    debugLog.text(JSON.stringify(player) + ', ' + JSON.stringify(viewport));
    inventoryLog.text(JSON.stringify(inventory));
  }
  const xInViewPort = player.x - viewport.x;
  const yInViewPort = player.y - viewport.y;

  // clear both canvases
  ctx.clearRect(0, 0, constants.WIDTH, constants.HEIGHT);
  ctx2.clearRect(0, 0, constants.WIDTH, constants.HEIGHT);

  // set main bg according to level (later maybe fancy gradients?)
  //ctx.fillStyle = inTown? constants.townBGColor : constants.forestBGColor;
  //ctx.fillRect(0, 0, constants.WIDTH, constants.HEIGHT);

  // map objects
  ctx.save();
  ctx.fillStyle = 'black';
  mapObjects.forEach(o => {
    if (type2Img.hasOwnProperty(o.type)) {
      if (o.type === 'merchant' && !hasFollower) {
        ctx.drawImage(type2Img[o.type], o.x-viewport.x + 0.5, o.y-viewport.y + 0.5, 64, 64);
      } else if (o.type === 'exit') {
        ctx.drawImage(type2Img[o.type], o.x-viewport.x + 0.5, o.y-viewport.y + 0.5, 64, 64);
      } else if (o.type === 'town-tree1' || o.type === 'town-tree3') {
        ctx.drawImage(type2Img[o.type], o.x-viewport.x + 0.5, o.y-viewport.y + 0.5, 128, 128);
      } else if (o.type === 'town-bg') {
        ctx.drawImage(type2Img[o.type], o.x-viewport.x + 0.5, o.y-viewport.y + 0.5, 600, 500);
      } else {
        if (o.type === 'merchant') {
          return;
        }
        ctx.drawImage(type2Img[o.type], o.x-viewport.x + 0.5, o.y-viewport.y + 0.5, 32, 32);
      }
    } else {
      ctx.fillRect(o.x - viewport.x, o.y - viewport.y, 10, 10);
    }
  });
  ctx.restore();

  // draw player
  ctx.save();
  ctx.beginPath();
  //ctx.fillStyle = 'rgba(22, 83, 54, 1)';
  //ctx.arc(xInViewPort, yInViewPort, constants.PLAYER_SIZE, 0, Math.PI*2);
  //ctx.fill();
  ctx.drawImage(
    playerSprite,
    utils.getSpriteOffset(frameCount, 'player'), 0, 32, 32,
    xInViewPort - constants.PLAYER_SIZE/2 + 0.5, yInViewPort - constants.PLAYER_SIZE/2 + 0.5, constants.PLAYER_SIZE, constants.PLAYER_SIZE
  );
  ctx.restore();

  // draw follower if available
  if (hasFollower) {
    if (!movementLocked) {
      ctx.save();
      ctx.drawImage(
        merchantSprite,
        utils.getSpriteOffset(frameCount, 'player'), 0, 32, 32,
        xInViewPort + 50 + 0.5, yInViewPort + 50 + 0.5, constants.PLAYER_SIZE, constants.PLAYER_SIZE
      );
      ctx.restore();
    } else {
      // we are in the finale
      if (!finaleStartTime) {
        finaleStartTime = timestamp;
        setTimeout(function() {
          const finalMsg = $('<div>').addClass('finale-msg').text(
            '<Merchant:> Oh no! Seems like I was the greedy adventurer! And you must have been the Mondrokko all along!'
          );
          finalMsg.insertAfter(secondaryCanvas);
        }, 2000);
      }

      if (finaleStartTime && timestamp - finaleStartTime > 15*1000) {
        // show transformed mushroom
        ctx.save();
        ctx.drawImage(type2Img['poison'], 1000 - viewport.x + 0.5, 300 - viewport.y + 0.5, 64, 64);
        ctx.restore();
      } else {
        // show trapped merchant
        ctx.save();
        ctx.drawImage(
          merchantSprite,
          utils.getSpriteOffset(frameCount, 'player'), 0, 32, 32,
          1000 - viewport.x + 0.5, 300 - viewport.y + 0.5, constants.PLAYER_SIZE, constants.PLAYER_SIZE
        );
        ctx.restore();
      }
    }
  }

  if (!inTown) {
    // draw forest cover on secondary canvas
    ctx2.fillStyle = 'green';
    trees.forEach(t=>{
      ctx2.drawImage(t.img, t.x-viewport.x + 0.5, t.y-viewport.y + 0.5, 128, 128);
      //ctx2.arc(t.x - viewport.x, t.y - viewport.y, 45, 0, Math.PI*2);
    })
    // draw visibility aroud player
    ctx2.save();
    ctx2.filter = 'blur(18px)';
    ctx2.globalCompositeOperation = 'destination-out';
    ctx2.beginPath();
    ctx2.arc(xInViewPort, yInViewPort, (VISION_SIZE+3)*20, 0, Math.PI*2);
    ctx2.fill();
    ctx2.restore();
  }

  requestAnimationFrame(drawFrame);
}

let songs, sounds;
let secondaryCanvas;
$(document).ready(function() {
  songs = [
    new Audio('bgMusic1.mp3')
  ];

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
  header = $('#header');

  ctx = canvas.getContext('2d');
  ctx2 = canvas2.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;

  updateHeader();
  initMerchantDialog();
  ui.init({
    interact: interact,
    switchScenes: switchScenes
  });

  drawFrame();
});
