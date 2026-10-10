const Blueprint = require('factorio-blueprint');

// Joins all the poles into one network. The drills, the station, the turrets
// and the radar each bring their own poles, and depending on the settings
// those groups end up too far apart to wire together, which leaves parts of
// the outpost without power. This adds poles between the groups.
//
// Call it once everything else is placed: it builds on whatever tiles are
// still free.

const POLE = 'medium_electric_pole';
// Poles keep off the track: the stop and the signal can still change sides of it
const BESIDE_TRACK = ['straight_rail', 'train_stop', 'rail_signal'];

const reachOf = pole => (Blueprint.getEntityData()[pole.name] || {}).maxElectricReach;
const reachBetween = (a, b) => Math.min(reachOf(a), reachOf(b));
const distance = (a, b) => Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y);

function groupsOf(poles) {
  const parent = poles.map((_, i) => i);
  const find = i => (parent[i] == i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < poles.length; i++) {
    for (let j = 0; j < i; j++) {
      if (distance(poles[i], poles[j]) <= reachBetween(poles[i], poles[j])) parent[find(i)] = find(j);
    }
  }
  const groups = {};
  poles.forEach((pole, i) => (groups[find(i)] = groups[find(i)] || []).push(pole));
  return Object.keys(groups).map(key => groups[key]).sort((a, b) => b.length - a.length);
}

function isFree(bp, { x, y }) {
  if (bp.findEntity({ x, y })) return false;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const neighbour = bp.findEntity({ x: x + dx, y: y + dy });
      if (neighbour && BESIDE_TRACK.indexOf(neighbour.name) != -1) return false;
    }
  }
  return true;
}

// The free tile within reach of `from` that gets closest to `to`
function stepTowards(bp, from, to) {
  const reach = Math.min(reachOf(from), Blueprint.getEntityData()[POLE].maxElectricReach);
  const span = Math.floor(reach);
  let best = null;
  let bestDistance = distance(from, to);
  for (let dx = -span; dx <= span; dx++) {
    for (let dy = -span; dy <= span; dy++) {
      if (Math.hypot(dx, dy) > reach) continue;
      const position = { x: from.position.x + dx, y: from.position.y + dy };
      const left = Math.hypot(position.x - to.position.x, position.y - to.position.y);
      if (left >= bestDistance || !isFree(bp, position)) continue;
      best = position;
      bestDistance = left;
    }
  }
  return best;
}

module.exports = function(bp) {
  const poles = bp.entities.filter(ent => reachOf(ent));
  const unreachable = [];

  for (;;) {
    const groups = groupsOf(poles).filter(group => unreachable.indexOf(group[0]) == -1);
    if (groups.length < 2) return;

    // The nearest pole of any other group to the biggest group
    let from = null;
    let to = null;
    groups[0].forEach(a => {
      groups.slice(1).forEach(group => group.forEach(b => {
        if (!from || distance(a, b) < distance(from, to)) {
          from = a;
          to = b;
        }
      }));
    });

    while (distance(from, to) > reachBetween(from, to)) {
      const position = stepTowards(bp, from, to);
      if (!position) {
        // Walled in. Leave that group alone rather than loop forever
        unreachable.push(groupsOf(poles).filter(group => group.indexOf(to) != -1)[0][0]);
        break;
      }
      from = bp.createEntity(POLE, position);
      poles.push(from);
    }
  }
};
