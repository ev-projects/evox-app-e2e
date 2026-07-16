const PopperJS = jest.requireActual('popper.js');

class Popper {
  static placements = PopperJS.placements;

  constructor() {
    return {
      destroy: () => {},
      scheduleUpdate: () => {},
    };
  }
}

module.exports = Popper;
