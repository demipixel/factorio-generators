// Places beacons around the pumpjacks.
//
// Every free 3x3 spot that reaches a pumpjack is a candidate. The best one
// gets a beacon, then the best of what is left, until no spot is worth one.
// "Best" follows the game: in Factorio 2.0, n beacons on a machine count as
// sqrt(n), so the first beacon on a pumpjack is worth as much as the next
// three together. That spreads the beacons over the field instead of piling
// them up, and it is why a spot between several pumpjacks goes first.
//
// Call it once the pipes and the pumpjacks' own poles are placed: beacons
// only take what is left over. They get their power in lib/power.js.

const BEACON = 'beacon';
const BEACON_SIZE = 3;
const BEACON_REACH = 3; // tiles beyond its own 3x3
const BEACON_MODULES = { speed_module_3: 2 };

// What a spot has to add before it gets a beacon, counted in first beacons
// on a single pumpjack
const MIN_GAIN = { few: 0.5, balanced: 0.3, max: 0 };

const worth = beacons => Math.sqrt(beacons);

// Whether two squares are within `gap` tiles of each other
function near(a, aSize, b, bSize, gap) {
  return a.x - gap < b.x + bSize && a.x + aSize + gap > b.x &&
    a.y - gap < b.y + bSize && a.y + aSize + gap > b.y;
}

function isFree(bp, { x, y }, size) {
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (bp.findEntity({ x: x + i, y: y + j })) return false;
    }
  }
  return true;
}

function placeBeacons(bp, pumpjacks, minGain, maxX) {
  const spots = [];
  const from = axis => Math.min(...pumpjacks.map(p => p.position[axis])) - BEACON_SIZE - BEACON_REACH + 1;
  const to = axis => Math.max(...pumpjacks.map(p => p.position[axis])) + BEACON_SIZE + BEACON_REACH - 1;
  for (let x = from('x'); x <= to('x') && x + BEACON_SIZE <= maxX; x++) {
    for (let y = from('y'); y <= to('y'); y++) {
      const position = { x, y };
      const reaches = pumpjacks
        .map((pumpjack, index) => (near(position, BEACON_SIZE, pumpjack.position, pumpjack.size.x, BEACON_REACH) ? index : -1))
        .filter(index => index != -1);
      if (!reaches.length || !isFree(bp, position, BEACON_SIZE)) continue;
      // Of two equally good spots, the one that hugs its pumpjacks wins
      const spread = reaches.reduce((sum, index) =>
        sum + Math.abs(pumpjacks[index].position.x - x) + Math.abs(pumpjacks[index].position.y - y), 0) / reaches.length;
      spots.push({ position, reaches, spread });
    }
  }

  const beaconsOn = pumpjacks.map(() => 0);
  let open = spots;
  for (;;) {
    let best = null;
    let bestGain = minGain;
    open.forEach(spot => {
      const gain = spot.reaches.reduce((sum, index) => sum + worth(beaconsOn[index] + 1) - worth(beaconsOn[index]), 0);
      if (gain > bestGain + 1e-9 || (best && Math.abs(gain - bestGain) <= 1e-9 && spot.spread < best.spread)) {
        best = spot;
        bestGain = gain;
      }
    });
    if (!best) return;

    const beacon = bp.createEntity(BEACON, best.position);
    Object.keys(BEACON_MODULES).forEach(name => (beacon.modules[name] = BEACON_MODULES[name]));
    best.reaches.forEach(index => beaconsOn[index]++);
    open = open.filter(spot => !near(spot.position, BEACON_SIZE, best.position, BEACON_SIZE, 0));
  }
}

// density is 'few', 'balanced' or 'max'. No beacon is built at or beyond
// maxX, where the station goes.
module.exports = function(bp, { pumpjackName, density, maxX }) {
  const pumpjacks = bp.entities.filter(ent => ent.name == pumpjackName);
  if (!pumpjacks.length) return;

  placeBeacons(bp, pumpjacks, MIN_GAIN[density], maxX);
};

module.exports.DENSITIES = Object.keys(MIN_GAIN);
