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

test('every pole can be wired into one network', () => {
  const rng = generator(4242);
  for (let i = 0; i < 200; i++) {
    const { opt, width, height } = randomOutpost(rng);
    const bp = new Blueprint(outpost(patch(width, height), Object.assign({}, opt, { gameVersion: '1.1' })));
    assert.strictEqual(networks(bp), 1, `settings ${JSON.stringify(opt)} on a ${width}x${height} patch`);
  }
  ORIENTATIONS.forEach(([trainSide, trainDirection]) => {
    const bp = new Blueprint(oilOutpost(oilField(), { trainSide, trainDirection, gameVersion: '1.1' }));
    assert.strictEqual(networks(bp), 1, `oil outpost, side ${trainSide}, direction ${trainDirection}`);
  });
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
