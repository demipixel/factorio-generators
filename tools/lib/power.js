const Blueprint = require('factorio-blueprint');

// Gets power to everything, in two steps. Call it once everything else is
// placed: it builds on whatever tiles are still free.
//
// 1. Whatever runs on electricity but stands outside every pole's supply
//    area gets a pole, each time on the free tile that covers the most of
//    what is still dark. That happens to drills with a wide gap between
//    them, to beacons, and now and then to a turret or a lamp.
// 2. The groups of poles that are too far apart to wire together are joined
//    with poles in between, so the outpost is one network.

const POLE = 'medium_electric_pole';
// How far a pole's supply area extends beyond its own tiles
const SUPPLY_REACH = { small_electric_pole: 2, medium_electric_pole: 3, big_electric_pole: 1, substation: 8 };
const NEEDS_POWER = /mining_drill$|pumpjack$|inserter$|^beacon$|^pump$|^radar$|^roboport$|^small_lamp$|^laser_turret$/;
// Poles keep off the track: the signal can still change sides of it
const BESIDE_TRACK = ['straight_rail', 'train_stop', 'rail_signal'];

const wireReachOf = pole => (Blueprint.getEntityData()[pole.name] || {}).maxElectricReach;
const wireReachBetween = (a, b) => Math.min(wireReachOf(a), wireReachOf(b));
const distance = (a, b) => Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y);

// Whether a pole on this tile (or this pole) supplies the entity
function supplies(position, size, reach, ent) {
  return position.x - reach < ent.position.x + ent.size.x && position.x + size.x + reach > ent.position.x &&
    position.y - reach < ent.position.y + ent.size.y && position.y + size.y + reach > ent.position.y;
}

// Remembers which tiles a new pole may stand on
function freeTiles(bp, keepFree) {
  const known = {};
  keepFree.forEach(position => (known[position.x + ',' + position.y] = false));
  const check = ({ x, y }) => {
    if (bp.findEntity({ x, y })) return false;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighbour = bp.findEntity({ x: x + dx, y: y + dy });
        if (neighbour && BESIDE_TRACK.indexOf(neighbour.name) != -1) return false;
      }
    }
    return true;
  };
  const isFree = position => {
    const key = position.x + ',' + position.y;
    if (!(key in known)) known[key] = check(position);
    return known[key];
  };
  isFree.placePole = position => {
    known[position.x + ',' + position.y] = false;
    return bp.createEntity(POLE, position);
  };
  return isFree;
}

function coverEverything(bp, poles, isFree, alsoPowered) {
  const reach = SUPPLY_REACH[POLE];
  let dark = bp.entities
    .filter(ent => NEEDS_POWER.test(ent.name) || alsoPowered.indexOf(ent.name) != -1)
    .filter(ent => !poles.some(pole => supplies(pole.position, pole.size, SUPPLY_REACH[pole.name] || 2, ent)));

  while (dark.length) {
    // Every free tile in reach of something dark, with how much it would light up
    const tiles = {};
    dark.forEach(ent => {
      for (let x = ent.position.x - reach; x < ent.position.x + ent.size.x + reach; x++) {
        for (let y = ent.position.y - reach; y < ent.position.y + ent.size.y + reach; y++) {
          const key = x + ',' + y;
          if (!(key in tiles)) tiles[key] = isFree({ x, y }) ? { position: { x, y }, count: 0, apart: 0 } : null;
          if (!tiles[key]) continue;
          tiles[key].count++;
          tiles[key].apart += Math.abs(ent.position.x + ent.size.x / 2 - x - 0.5) + Math.abs(ent.position.y + ent.size.y / 2 - y - 0.5);
        }
      }
    });

    // The most at once, and of those the tile nearest to what it powers
    let best = null;
    Object.keys(tiles).forEach(key => {
      const tile = tiles[key];
      if (tile && (!best || tile.count > best.count || (tile.count == best.count && tile.apart < best.apart))) best = tile;
    });
    if (!best) return; // nowhere left to stand a pole

    const pole = isFree.placePole(best.position);
    poles.push(pole);
    dark = dark.filter(ent => !supplies(pole.position, pole.size, reach, ent));
  }
}

function groupsOf(poles) {
  const parent = poles.map((_, i) => i);
  const find = i => (parent[i] == i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < poles.length; i++) {
    for (let j = 0; j < i; j++) {
      if (distance(poles[i], poles[j]) <= wireReachBetween(poles[i], poles[j])) parent[find(i)] = find(j);
    }
  }
  const groups = {};
  poles.forEach((pole, i) => (groups[find(i)] = groups[find(i)] || []).push(pole));
  return Object.keys(groups).map(key => groups[key]).sort((a, b) => b.length - a.length);
}

// The fewest new poles that wire `group` to any pole outside it: a breadth
// first search over the free tiles, one wire length at a time, so it finds
// its way around whatever is in between. Returns the tiles, or null.
function bridge(group, others, isFree, area) {
  const poleReach = Blueprint.getEntityData()[POLE].maxElectricReach;
  const span = Math.floor(poleReach);
  const between = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const seen = {};
  // The group's own poles start the search; wire is the length strung so far
  let layer = group.map(pole => ({ position: pole.position, reach: Math.min(wireReachOf(pole), poleReach), wire: 0 }));

  while (layer.length) {
    const next = [];
    let arrival = null;
    layer.forEach(node => {
      for (let dx = -span; dx <= span; dx++) {
        for (let dy = -span; dy <= span; dy++) {
          const position = { x: node.position.x + dx, y: node.position.y + dy };
          const key = position.x + ',' + position.y;
          if (seen[key] || Math.hypot(dx, dy) > node.reach) continue;
          if (position.x < area.left || position.x > area.right || position.y < area.top || position.y > area.bottom) continue;
          seen[key] = true;
          if (!isFree(position)) continue;

          const tile = { position, reach: poleReach, wire: node.wire + Math.hypot(dx, dy), from: node.wire ? node : null };
          next.push(tile);
          // Of the tiles that make it across in this round, keep the one with the least wire
          others.forEach(pole => {
            const last = between(position, pole.position);
            if (last > Math.min(poleReach, wireReachOf(pole))) return;
            if (!arrival || tile.wire + last < arrival.wire) arrival = { tile, wire: tile.wire + last };
          });
        }
      }
    });
    if (arrival) {
      const path = [];
      for (let tile = arrival.tile; tile; tile = tile.from) path.unshift(tile.position);
      return path;
    }
    layer = next;
  }
  return null;
}

function joinNetworks(bp, poles, isFree) {
  const edge = (pick, axis, size) => pick(...bp.entities.map(ent => ent.position[axis] + (size ? ent.size[axis] : 0)));
  const area = { left: edge(Math.min, 'x') - 1, right: edge(Math.max, 'x', true), top: edge(Math.min, 'y') - 1, bottom: edge(Math.max, 'y', true) };
  const walledIn = [];

  for (;;) {
    // The smallest group goes first: it has the least to search from
    const groups = groupsOf(poles);
    const group = groups.slice(1).filter(group => walledIn.indexOf(group[0]) == -1).pop();
    if (!group) return;

    const path = bridge(group, poles.filter(pole => group.indexOf(pole) == -1), isFree, area);
    if (!path) {
      walledIn.push(group[0]); // leave it alone rather than loop forever
      continue;
    }
    path.forEach(position => poles.push(isFree.placePole(position)));
  }
}

// alsoPowered: names of entities that need power but do not look like it,
// such as a modded drill. keepFree: tiles no pole may stand on.
module.exports = function(bp, { alsoPowered = [], keepFree = [] } = {}) {
  const poles = bp.entities.filter(ent => wireReachOf(ent));
  const isFree = freeTiles(bp, keepFree);

  coverEverything(bp, poles, isFree, alsoPowered);
  joinNetworks(bp, poles, isFree);
};
