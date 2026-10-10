// Shared by the tests: seeded random outpost settings and a wall blueprint
// that marks an ore patch, like the one a player would paste.
const Blueprint = require('factorio-blueprint');

const BUILT_IN_BALANCERS = [1, 2, 4, 6, 8];

function generator(seed) {
  let state = seed;
  const random = () => (state = (state * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = list => list[Math.floor(random() * list.length)];
  return { random, pick };
}

function patch(width, height) {
  const bp = new Blueprint();
  bp.createEntity('stone_wall', { x: 0, y: 0 });
  bp.createEntity('stone_wall', { x: width - 1, y: height - 1 });
  return bp.encode();
}

// One random, valid set of options for tools/outpost.js plus a patch size.
function randomOutpost({ random, pick }) {
  for (;;) {
    const side = pick([0, 1, 2, 3]);
    const opt = {
      trainSide: side,
      trainDirection: pick(side % 2 ? [0, 2] : [3, 1]),
      minerSpace: pick([0, 1, 2, 3, 4, 5]),
      beltName: pick(['', 'fast', 'express']),
      undergroundBelts: random() < 0.5,
      compact: random() < 0.5,
      useStackInserters: random() < 0.5,
      useFilterInserters: false,
      includeRadar: random() < 0.7,
      includeLights: random() < 0.7,
      botBased: random() < 0.25,
      requestItem: 'iron_ore',
      roboports: random() < 0.5,
      turrets: random() < 0.8,
      laserTurrets: random() < 0.5,
      turretSpacing: pick([2, 3, 4, 5, 6, 7, 8, 9]),
      walls: random() < 0.85,
      wallThickness: pick([1, 1, 2, 3, 6]),
      wallSpace: pick([3, 4, 5, 6, 8, 12]),
      includeTrainStation: random() < 0.85,
      exitRoute: random() < 0.5,
      doubleLoading: random() < 0.3,
      locomotiveCount: pick([1, 2, 3, 4]),
      cargoWagonCount: pick([1, 2, 3, 4, 5, 6, 8]),
      module: pick([null, null, 'speed_module_3', 'effectivity_module', 'productivity_module_2']),
      concrete: pick(['', '', 'concrete']),
      borderConcrete: pick(['', 'hazard_concrete_left']),
      trackConcrete: pick(['', 'stone_path'])
    };
    if (random() < 0.3) {
      opt.minerSize = pick([4, 5]);
      opt.miningDrillName = 'big_mining_drill';
    }
    opt.roboports = opt.botBased && opt.roboports;

    // other lane counts need a balancer blueprint from the user
    const lanes = opt.cargoWagonCount * (opt.doubleLoading ? 2 : 1);
    if (!opt.botBased && !BUILT_IN_BALANCERS.includes(lanes)) continue;

    return { opt, width: pick([5, 9, 16, 30, 47]), height: pick([5, 8, 22, 40]) };
  }
}

// A small oil field as a player would blueprint it: pumpjacks and one piece of track.
function oilField() {
  const bp = new Blueprint();
  [[0, 0, 2], [10, 1, 4], [3, 9, 0], [15, 10, 6], [8, 17, 2], [20, 4, 4], [22, 16, 0]]
    .forEach(([x, y, direction]) => bp.createEntity('pumpjack', { x, y }, direction));
  bp.createEntity('straight_rail', { x: 34, y: 8 }, 0);
  return bp.encode();
}

// Every station side with both directions a train can arrive from.
const ORIENTATIONS = [[0, 3], [0, 1], [1, 0], [1, 2], [2, 3], [2, 1], [3, 0], [3, 2]];

module.exports = { generator, patch, randomOutpost, oilField, ORIENTATIONS };
