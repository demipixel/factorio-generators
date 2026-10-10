const Blueprint = require('factorio-blueprint');

// factorio-blueprint writes blueprints the way Factorio 1.1 did. The game
// still imports those, but converts them on the way in and turns the track
// into legacy rails. This rewrites a 1.1 blueprint object into the 2.0 format
// so the string is native: current entity names, 16-way directions, and the
// new shapes for modules, logistic requests and wires.
//
// Checked against what Factorio 2.0.77 itself produces when it imports the
// 1.1 string (see test/ingame).

// 2.0.0, as major << 48 | minor << 32 | patch << 16
const VERSION = 562949953421312;

const RENAMED = {
  'stack-inserter': 'bulk-inserter',
  'stack-filter-inserter': 'bulk-inserter',
  'filter-inserter': 'fast-inserter',
  'logistic-chest-active-provider': 'active-provider-chest',
  'logistic-chest-passive-provider': 'passive-provider-chest',
  'logistic-chest-storage': 'storage-chest',
  'logistic-chest-buffer': 'buffer-chest',
  'logistic-chest-requester': 'requester-chest',
  'effectivity-module': 'efficiency-module',
  'effectivity-module-2': 'efficiency-module-2',
  'effectivity-module-3': 'efficiency-module-3'
};

// defines.inventory index of the module slots, by entity
const MODULE_INVENTORY = { beacon: 1 };
const DEFAULT_MODULE_INVENTORY = 2; // mining drills, which is what the outposts fill

// defines.wire_connector_id.pole_copper
const POLE_COPPER = 5;

const rename = name => RENAMED[name] || name;

function convertEntity(entity) {
  const out = Object.assign({}, entity, { name: rename(entity.name) });

  // 8 directions became 16
  if (out.direction) out.direction = out.direction * 2;
  else delete out.direction;

  // { 'speed-module': 3 } became one entry per item with the slots it sits in
  if (entity.items && !Array.isArray(entity.items)) {
    const inventory = MODULE_INVENTORY[entity.name] || DEFAULT_MODULE_INVENTORY;
    let stack = 0;
    out.items = Object.keys(entity.items).map(name => ({
      id: { name: rename(name) },
      items: {
        in_inventory: Array.from({ length: entity.items[name] }, () => ({ inventory, stack: stack++ }))
      }
    }));
  }

  // logistic requests moved into sections
  if (Array.isArray(entity.request_filters)) {
    out.request_filters = {
      sections: [{
        index: 1,
        filters: entity.request_filters.map(filter => ({
          index: filter.index,
          name: rename(filter.name),
          quality: 'normal',
          comparator: '=',
          count: filter.count
        }))
      }]
    };
  }

  if (entity.recipe) out.recipe = rename(entity.recipe);

  // copper wires are listed once for the whole blueprint now
  delete out.neighbours;

  return out;
}

function convert(object) {
  const from = object.blueprint;
  const blueprint = Object.assign({}, from, { version: VERSION });

  blueprint.entities = (from.entities || []).map(convertEntity);

  const wires = [];
  const seen = {};
  (from.entities || []).forEach(entity => {
    (entity.neighbours || []).forEach(other => {
      const a = Math.min(entity.entity_number, other);
      const b = Math.max(entity.entity_number, other);
      if (seen[a + ',' + b]) return;
      seen[a + ',' + b] = true;
      wires.push([a, POLE_COPPER, b, POLE_COPPER]);
    });
  });
  if (wires.length) blueprint.wires = wires;

  if (from.icons) {
    blueprint.icons = from.icons.map(icon => Object.assign({}, icon, {
      signal: Object.assign({}, icon.signal, { name: rename(icon.signal.name) })
    }));
  }

  return Object.assign({}, object, { blueprint });
}

// Blueprint string for the given game version: '1.1', or '2.0' (the default).
function encode(bp, gameVersion) {
  if (String(gameVersion) === '1.1') return bp.encode();

  // factorio-blueprint only encodes its own objects, so hand it the converted one
  const carrier = new Blueprint();
  const converted = convert(bp.toObject());
  carrier.toObject = () => converted;
  return carrier.encode();
}

module.exports = { convert, encode };
