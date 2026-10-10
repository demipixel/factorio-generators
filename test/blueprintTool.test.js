// Run with: npm test
const test = require('node:test');
const assert = require('node:assert');
const zlib = require('node:zlib');

const blueprintTool = require('../tools/blueprintTool');

const encode = object => '0' + zlib.deflateSync(JSON.stringify(object), { level: 9 }).toString('base64');
const decode = string => JSON.parse(zlib.inflateSync(Buffer.from(string.slice(1), 'base64')).toString('utf8'));

// What Factorio 2.0 exports: wires for the whole blueprint, quality, module slots
const made = () => ({
  blueprint: {
    item: 'blueprint',
    version: 562949954076673,
    icons: [{ signal: { name: 'assembling-machine-2' }, index: 1 }],
    entities: [
      { entity_number: 1, name: 'medium-electric-pole', position: { x: 0.5, y: 0.5 } },
      { entity_number: 2, name: 'medium-electric-pole', position: { x: 5.5, y: 0.5 } },
      {
        entity_number: 3, name: 'bulk-inserter', position: { x: 2.5, y: 2.5 }, direction: 12, quality: 'rare',
        use_filters: true, filters: [{ index: 1, name: 'iron-plate', quality: 'normal', comparator: '=' }]
      },
      {
        entity_number: 4, name: 'assembling-machine-2', position: { x: 8.5, y: 2.5 }, recipe: 'iron-gear-wheel',
        items: [{ id: { name: 'speed-module' }, items: { in_inventory: [{ inventory: 4, stack: 0 }] } }]
      },
      { entity_number: 5, name: 'transport-belt', position: { x: 0.5, y: 5.5 }, direction: 4 }
    ],
    wires: [[1, 5, 2, 5], [1, 1, 3, 1]]
  }
});

test('a 2.0 blueprint passes through untouched', () => {
  assert.deepStrictEqual(decode(blueprintTool(encode(made()), {})), made());
});

test('2.0: entities, recipes and modules are replaced, everything else is kept', () => {
  const out = decode(blueprintTool(encode(made()), {
    entityReplace: [{ includes: 'transport-belt', to: 'express-transport-belt' }, { from: 'assembling_machine_2', to: 'assembling_machine_3' }],
    recipeReplace: [{ from: 'iron-gear-wheel', to: 'copper-cable' }],
    moduleReplace: [{ includes: 'speed-module', to: 'speed-module-3' }]
  })).blueprint;

  const expected = made().blueprint;
  expected.entities[3].name = 'assembling-machine-3';
  expected.entities[3].recipe = 'copper-cable';
  expected.entities[3].items[0].id.name = 'speed-module-3';
  expected.entities[4].name = 'express-transport-belt';
  assert.deepStrictEqual(out, expected);
});

test('2.0: modified only keeps the changed entities and the wires between them', () => {
  const out = decode(blueprintTool(encode(made()), {
    entityReplace: [{ from: 'medium-electric-pole', to: 'big-electric-pole' }],
    modifiedOnly: true
  })).blueprint;
  assert.deepStrictEqual(out.entities.map(e => e.name), ['big-electric-pole', 'big-electric-pole']);
  assert.deepStrictEqual(out.wires, [[1, 5, 2, 5]]);
});

test('2.0: blueprints inside a book are edited too', () => {
  const book = { blueprint_book: { item: 'blueprint-book', version: 562949954076673, active_index: 0, blueprints: [Object.assign({ index: 0 }, made())] } };
  const out = decode(blueprintTool(encode(book), { entityReplace: [{ from: 'transport-belt', to: 'fast-transport-belt' }] }));
  assert.strictEqual(out.blueprint_book.blueprints[0].blueprint.entities[4].name, 'fast-transport-belt');
  assert.deepStrictEqual(out.blueprint_book.blueprints[0].blueprint.wires, made().blueprint.wires);
});

test('2.0: flipping is left to the game', () => {
  assert.throws(() => blueprintTool(encode(made()), { flipX: true }), /press H or V/);
});
