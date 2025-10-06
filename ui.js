let initRan = false;
const keysPressed = {
  up:    false,
  right: false,
  down:  false,
  left:  false,
  e:     false,
};

export default {
  init: function(fnRef) {
    console.assert(!initRan);
    initRan = true;
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
          fnRef.interact();
          break;
        case 'KeyL':
          fnRef.switchScenes();
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
  },

  keysPressed: keysPressed,
}
