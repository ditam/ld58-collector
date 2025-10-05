
const WIDTH = 800;
const HEIGHT = 500;
const PLAYER_SPEED = 4;
const PLAYER_SIZE = 50;

const MAP_WIDTH = 2000;
const MAP_HEIGHT = 1200;

let ctx;

const player_internal = {
  x: 300,
  y: 120,
};

const viewport = {
  // x and y are offsets from (0, 0)
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


const keysPressed = {
  up:    false,
  right: false,
  down:  false,
  left:  false,
  e:     false,
};

function applyMovement() {
  if (keysPressed.up && player.y > 0) {
    player.y = Math.max(0, player.y - PLAYER_SPEED);
  }
  if (keysPressed.right && player.x < WIDTH) {
    player.x = Math.min(WIDTH, player.x + PLAYER_SPEED);
  }
  if (keysPressed.down && player.y < HEIGHT) {
    player.y = Math.min(HEIGHT, player.y + PLAYER_SPEED);
  }
  if (keysPressed.left && player.x > 0) {
    player.x = Math.max(0, player.x - PLAYER_SPEED);
  }
}

function drawFrame(timestamp) {
  applyMovement();
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // debug / alignment markers
  let markerNumber = 0;
  ctx.save();
  ctx.strokeStyle = 'black';
  ctx.fillStyle = 'red';
  ctx.fillRect(100, 100, 20, 20);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = 'black';
  for (let row=0; row<20; row++) {
    ctx.beginPath();
    ctx.moveTo(0, MAP_HEIGHT/20 * row);
    ctx.lineTo(MAP_WIDTH, MAP_HEIGHT/20 * row);
    ctx.stroke();
  }
  for (let col=0; col<20; col++) {
    ctx.beginPath();
    ctx.moveTo(MAP_WIDTH/20 * col, 0);
    ctx.lineTo(MAP_WIDTH/20 * col, MAP_HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = 'yellow';
  ctx.arc(player.x, player.y, PLAYER_SIZE, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();


  // cutout test
  ctx.save();
  ctx.beginPath();
  ctx.filter = 'blur(15px)';
  ctx.fillStyle = 'blue';
  ctx.globalCompositeOperation = 'destination-out'
  ctx.arc(350, 350, 100, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  requestAnimationFrame(drawFrame);
}

$(document).ready(function() {
  console.log('Hello LD58!');

  const canvas = document.getElementById('main-canvas');
  $(canvas).attr('height', HEIGHT);
  $(canvas).attr('width', WIDTH);

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
