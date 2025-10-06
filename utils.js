import constants from './constants.js';

export default {
  dist: function(a, b) {
    console.assert(a.hasOwnProperty('x') && a.hasOwnProperty('y') && b.hasOwnProperty('x') && b.hasOwnProperty('y'), 'Invalid dist targets:', a, b);
    const dX = a.x-b.x;
    const dY = a.y-b.y;
    return Math.sqrt(dX*dX + dY*dY);
  },

  getRandomInt: function(min, max) { // min and max included
    if (typeof max === 'undefined') {
      max = min;
      min = 0;
    }
    return Math.floor(Math.random() * (max - min + 1) + min);
  },

  getRandomItem: function (array) {
    return array[Math.floor(Math.random() * array.length)];
  },

  noop: function(){ return; },


}
