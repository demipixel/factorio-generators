// Run with: npm test
const test = require('node:test');
const assert = require('node:assert');
const Blueprint = require('factorio-blueprint');

const outpost = require('../tools/outpost');
const oilOutpost = require('../tools/oilOutpost');
const { generator, patch, randomOutpost, oilField, ORIENTATIONS } = require('./random');

const span = (entities, axis) => ({
  from: Math.min(...entities.map(e => e.position[axis])),
  to: Math.max(...entities.map(e => e.position[axis] + e.size[axis]))
});

test('random settings always produce an outpost', () => {
  const rng = generator(12345);
  for (let i = 0; i < 800; i++) {
    const { opt, width, height } = randomOutpost(rng);
    assert.doesNotThrow(
      () => outpost(patch(width, height), Object.assign({}, opt)),
      `settings ${JSON.stringify(opt)} on a ${width}x${height} patch`
    );
  }
});

test('the track ends at the walls and every wall row it crosses is a gate', () => {
  const rng = generator(777);
  for (let i = 0; i < 300; i++) {
    const { opt, width, height } = randomOutpost(rng);
    if (!opt.includeTrainStation) continue;
    const about = `settings ${JSON.stringify(opt)} on a ${width}x${height} patch`;

    // 1.1 output, which factorio-blueprint can read back
    const bp = new Blueprint(outpost(patch(width, height), Object.assign({}, opt, { gameVersion: '1.1' })));
    const named = name => bp.entities.filter(e => e.name === name);
    const rails = named('straight_rail');
    const walls = named('stone_wall').concat(named('gate'));
    assert.ok(rails.length > 0, `no rails with ${about}`);
    assert.strictEqual(named('rail_signal').length, 1, `expected one rail signal with ${about}`);
    if (!opt.walls) continue;

    const axis = rails[0].direction % 4 === 0 ? 'y' : 'x';
    const track = span(rails, axis);
    const wall = span(walls, axis);
    const overhang = Math.max(wall.from - track.from, track.to - wall.to);
    assert.ok(overhang <= 1, `track sticks ${overhang} tiles out of the walls with ${about}`);

    // two gate tiles per wall row per crossing; an exit route crosses twice
    const crossings = opt.exitRoute ? 2 : 1;
    assert.strictEqual(named('gate').length, 2 * opt.wallThickness * crossings, `gates with ${about}`);
  }
});

// Pairs of entities standing on the same tile. A gate on the track is how a wall lets trains through.
const overlaps = bp => {
  const tiles = {};
  const found = [];
  bp.entities.forEach(e => {
    // blueprints with track sit on a half-tile grid: an entity owns the tiles its corner falls in
    for (let x = Math.floor(e.position.x); x < e.position.x + e.size.x - 0.9; x++) {
      for (let y = Math.floor(e.position.y); y < e.position.y + e.size.y - 0.9; y++) {
        const other = tiles[x + ',' + y];
        const pair = other && [other.name, e.name].sort().join(' on ');
        if (pair && pair !== 'gate on straight_rail' && found.indexOf(pair) === -1) found.push(pair);
        tiles[x + ',' + y] = e;
      }
    }
  });
  return found;
};

// How many groups of poles there are that no wire can join
const networks = bp => {
  const reach = e => Blueprint.getEntityData()[e.name].maxElectricReach;
  const poles = bp.entities.filter(reach);
  const group = poles.map((_, i) => i);
  const find = i => (group[i] === i ? i : (group[i] = find(group[i])));
  poles.forEach((a, i) => poles.slice(0, i).forEach((b, j) => {
    const apart = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y);
    if (apart <= Math.min(reach(a), reach(b))) group[find(i)] = find(j);
  }));
  return new Set(poles.map((_, i) => find(i))).size;
};

// Whatever runs on electricity and stands outside the 7x7 supply area of every pole
const ELECTRIC = /mining_drill$|pumpjack$|inserter$|^beacon$|^pump$|^radar$|^roboport$|^small_lamp$|^laser_turret$/;
const unpowered = bp => {
  const poles = bp.entities.filter(e => e.name === 'medium_electric_pole');
  return bp.entities.filter(e => ELECTRIC.test(e.name)).filter(e => !poles.some(pole =>
    pole.position.x - 3 < e.position.x + e.size.x && pole.position.x + 4 > e.position.x &&
    pole.position.y - 3 < e.position.y + e.size.y && pole.position.y + 4 > e.position.y)).map(e => e.name);
};

test('nothing overlaps, everything has power, and all the poles can be wired into one network', () => {
  const rng = generator(4242);
  for (let i = 0; i < 200; i++) {
    const { opt, width, height } = randomOutpost(rng);
    const about = `settings ${JSON.stringify(opt)} on a ${width}x${height} patch`;
    const bp = new Blueprint(outpost(patch(width, height), Object.assign({}, opt, { gameVersion: '1.1' })));
    assert.deepStrictEqual(overlaps(bp), [], `on the same tile with ${about}`);
    assert.deepStrictEqual(unpowered(bp), [], `without power with ${about}`);
    assert.strictEqual(networks(bp), 1, `networks with ${about}`);
  }
  ORIENTATIONS.forEach(([trainSide, trainDirection], n) => {
    const beacons = [false, 'few', 'balanced', 'max'][n % 4];
    const undergroundPipes = ['all', 'long', 'none'][n % 3];
    const about = `oil outpost, side ${trainSide}, direction ${trainDirection}, beacons ${beacons}, underground pipes ${undergroundPipes}`;
    const bp = new Blueprint(oilOutpost(oilField(), { trainSide, trainDirection, beacons, undergroundPipes, gameVersion: '1.1' }));
    assert.deepStrictEqual(overlaps(bp), [], `on the same tile: ${about}`);
    assert.deepStrictEqual(unpowered(bp), [], `without power: ${about}`);
    assert.strictEqual(networks(bp), 1, `networks: ${about}`);
  });
});

test('beacons spread over the pumpjacks, and the setting decides how many', () => {
  const build = beacons => new Blueprint(oilOutpost(oilField(), { beacons, gameVersion: '1.1' }));
  const named = (bp, name) => bp.entities.filter(e => e.name === name);
  // a beacon works on whatever its 9x9 area touches
  const reaches = (beacon, pumpjack) =>
    beacon.position.x - 3 < pumpjack.position.x + 3 && beacon.position.x + 6 > pumpjack.position.x &&
    beacon.position.y - 3 < pumpjack.position.y + 3 && beacon.position.y + 6 > pumpjack.position.y;

  assert.strictEqual(named(build(false), 'beacon').length, 0);
  const counts = ['few', 'balanced', 'max'].map(setting => {
    const bp = build(setting);
    const beacons = named(bp, 'beacon');
    const pumpjacks = named(bp, 'pumpjack');
    beacons.forEach(beacon => {
      assert.ok(pumpjacks.some(pumpjack => reaches(beacon, pumpjack)), `${setting}: a beacon reaches no pumpjack`);
      assert.deepStrictEqual(beacon.modules, { speed_module_3: 2 });
    });
    pumpjacks.forEach(pumpjack =>
      assert.ok(beacons.some(beacon => reaches(beacon, pumpjack)), `${setting}: a pumpjack has no beacon`));
    return beacons.length;
  });
  assert.ok(counts[0] > 0 && counts[0] <= counts[1] && counts[1] < counts[2], `few, balanced, max gave ${counts}`);
  assert.strictEqual(named(build(true), 'beacon').length, counts[1], 'true means balanced');
  assert.throws(() => build('plenty'), /opt\.beacons/);
});

test('how much pipe goes underground follows the setting', () => {
  // one wagon: with more, the station itself ducks a pipe under each pump
  const count = (undergroundPipes, name) =>
    new Blueprint(oilOutpost(oilField(), { undergroundPipes, wagonCount: 1, gameVersion: '1.1' }))
      .entities.filter(e => e.name === name).length;
  assert.strictEqual(count('none', 'pipe_to_ground'), 0);
  assert.ok(count('long', 'pipe_to_ground') > 0, 'long runs go underground');
  assert.ok(count('long', 'pipe_to_ground') <= count('all', 'pipe_to_ground'));
  assert.ok(count('all', 'pipe') < count('long', 'pipe') && count('long', 'pipe') < count('none', 'pipe'),
    'the more goes underground, the less pipe is left on the surface');
  assert.strictEqual(count(undefined, 'pipe_to_ground'), count('all', 'pipe_to_ground'), 'all is the default');
  assert.throws(() => count('some'), /opt\.undergroundPipes/);
});

test('an outpost without a station keeps no room for one', () => {
  const size = options => {
    const bp = new Blueprint(outpost(patch(30, 22), Object.assign({ gameVersion: '1.1' }, options)));
    return bp.bottomRight().subtract(bp.topLeft());
  };
  const without = size({ includeTrainStation: false });
  const short = size({ includeTrainStation: false, locomotiveCount: 1 });
  const long = size({ includeTrainStation: false, locomotiveCount: 4 });
  assert.deepStrictEqual([short.x, short.y], [long.x, long.y], 'train length changes an outpost that has no station');
  const withStation = size({});
  assert.ok(without.x * without.y < withStation.x * withStation.y);
});

test('2.0 output uses current names, 16-way directions and new rails', () => {
  // factorio-blueprint cannot read 2.0 strings back, so inflate by hand
  const read = string =>
    JSON.parse(require('node:zlib').inflateSync(Buffer.from(string.slice(1), 'base64')).toString('utf8')).blueprint;
  const string = outpost(patch(30, 22), {
    botBased: true, requestItem: 'iron_ore', module: 'effectivity_module_2', useFilterInserters: false
  });
  const bp = read(string);
  const names = new Set(bp.entities.map(e => e.name));

  assert.ok(bp.version >= 562949953421312, 'version stamp is 2.0 or later');
  ['bulk-inserter', 'requester-chest', 'passive-provider-chest', 'straight-rail'].forEach(name =>
    assert.ok(names.has(name), `expected ${name}`));
  [...names].forEach(name => assert.ok(!/stack-inserter|filter-inserter|logistic-chest/.test(name), `1.1 name ${name}`));

  bp.entities.forEach(e => assert.ok(!e.direction || (e.direction % 4 === 0 && e.direction < 16), `direction ${e.direction}`));
  const drill = bp.entities.find(e => e.name === 'electric-mining-drill');
  assert.deepStrictEqual(drill.items[0].id, { name: 'efficiency-module-2' });
  assert.strictEqual(drill.items[0].items.in_inventory.length, 3);
  const chest = bp.entities.find(e => e.name === 'requester-chest');
  assert.strictEqual(chest.request_filters.sections[0].filters[0].name, 'iron-ore');
});

test('1.1 output is still available', () => {
  const bp = new Blueprint(outpost(patch(30, 22), { gameVersion: '1.1', useFilterInserters: false }));
  assert.ok(bp.entities.some(e => e.name === 'stack_inserter'));
});

test('oil outposts get turrets, and gates where the track crosses the walls', () => {
  ORIENTATIONS.forEach(([trainSide, trainDirection]) => {
    const bp = new Blueprint(oilOutpost(oilField(), { trainSide, trainDirection, gameVersion: '1.1', exitRoute: true }));
    const count = name => bp.entities.filter(e => e.name === name).length;
    assert.ok(count('laser_turret') > 10, `turrets for side ${trainSide}, direction ${trainDirection}`);
    assert.strictEqual(count('gate'), 4, `gates for side ${trainSide}, direction ${trainDirection}`);
    assert.strictEqual(count('rail_signal'), 1);
  });
});
