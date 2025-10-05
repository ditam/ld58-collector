
const WIDTH = 800;
const HEIGHT = 500;
const PLAYER_SPEED = 4;
const PLAYER_SIZE = 50;
// movement within this margin attempts to scroll the viewport if possible
const VIEWPORT_SCROLL_MARGIN = 150;

const MAP_WIDTH = 2000;
const MAP_HEIGHT = 1200;

let ctx;

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

const mapObjects = [
  {x: 0, y: 0},
  {x: 100, y: 100},
  {x: 200, y: 200},
  {x: 300, y: 300},
  {x: 350, y: 300},
  {x: 400, y: 300},
  {x: 450, y: 300},
  {x: 500, y: 300},
  {x: 400, y: 400},
  {x: 500, y: 500},
  {x: 600, y: 600},
  {x: 700, y: 700},
  {x: 800, y: 800},
];

const keysPressed = {
  up:    false,
  right: false,
  down:  false,
  left:  false,
  e:     false,
};

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

let debugLog;
function drawFrame(timestamp) {
  applyMovement();
  debugLog.text(JSON.stringify(player) + ', ' + JSON.stringify(viewport));
  const xInViewPort = player.x - viewport.x;
  const yInViewPort = player.y - viewport.y;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

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
  ctx.fillStyle = 'yellow';
  ctx.arc(xInViewPort, yInViewPort, PLAYER_SIZE, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // cutout test - TODO: add as separate layer around player marker
  /*
  ctx.save();
  ctx.beginPath();
  ctx.filter = 'blur(15px)';
  ctx.fillStyle = 'blue';
  ctx.globalCompositeOperation = 'destination-out'
  ctx.arc(350, 350, 100, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
  */

  requestAnimationFrame(drawFrame);
}

$(document).ready(function() {
  const canvas = document.getElementById('main-canvas');
  $(canvas).attr('height', HEIGHT);
  $(canvas).attr('width', WIDTH);

  debugLog = $('#debug-log');

  ctx = canvas.getContext('2d');

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
