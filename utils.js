import constants from './constants.js';

export default {
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
