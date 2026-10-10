const Blueprint = require('factorio-blueprint');

// The blueprint tool for blueprints made in Factorio 2.0.
//
// factorio-blueprint only understands the 1.1 format: sending a 2.0 blueprint
// through it drops wires and quality and breaks module lists. So 2.0
// blueprints are edited as plain JSON here, and everything this tool does not
// touch passes through exactly as it came in.

// 2.0.0, as major << 48 | minor << 32 | patch << 16
const VERSION_2 = 562949953421312;

const dashed = name => (name ? String(name).replace(/_/g, '-') : name);

function isFactorio2(raw) {
  const item = raw.blueprint || raw.blueprint_book;
  if (!item) return false;
  if (item.version >= VERSION_2) return true;
  return (item.blueprints || []).some(isFactorio2);
}

// `from` matches a whole name, `includes` any name containing it
function target(name, replacements) {
  if (!name) return null;
  const hit = replacements.find(r =>
    name === dashed(r.from) || (r.includes && name.includes(dashed(r.includes))));
  return hit && dashed(hit.to) !== name ? dashed(hit.to) : null;
}

function editBlueprint(blueprint, opt) {
  const entityReplace = opt.entityReplace || [];
  const recipeReplace = opt.recipeReplace || [];
  const moduleReplace = opt.moduleReplace || [];
  const changed = new Set();

  (blueprint.entities || []).forEach(entity => {
    const name = target(entity.name, entityReplace);
    if (name) {
      entity.name = name;
      changed.add(entity);
    }

    const recipe = target(entity.recipe, recipeReplace);
    if (recipe) {
      entity.recipe = recipe;
      changed.add(entity);
    }

    // modules and other inserted items: [{ id: { name, quality }, items: { in_inventory: [...] } }]
    if (Array.isArray(entity.items)) {
      entity.items.forEach(item => {
        const module = item.id && target(item.id.name, moduleReplace);
        if (module) {
          item.id.name = module;
          changed.add(entity);
        }
      });
    }
  });

  (blueprint.tiles || []).forEach(tile => {
    const name = target(tile.name, entityReplace);
    if (name) {
      tile.name = name;
      changed.add(tile);
    }
  });

  if (opt.modifiedOnly) {
    blueprint.entities = (blueprint.entities || []).filter(entity => changed.has(entity));
    blueprint.tiles = (blueprint.tiles || []).filter(tile => changed.has(tile));
    if (!blueprint.tiles.length) delete blueprint.tiles;

    // wires and train schedules refer to entities by number; drop the ones left dangling
    const kept = new Set(blueprint.entities.map(entity => entity.entity_number));
    if (blueprint.wires) {
      blueprint.wires = blueprint.wires.filter(wire => kept.has(wire[0]) && kept.has(wire[2]));
    }
    if (blueprint.schedules) {
      blueprint.schedules = blueprint.schedules
        .map(schedule => Object.assign({}, schedule, {
          locomotives: (schedule.locomotives || []).filter(number => kept.has(number))
        }))
        .filter(schedule => schedule.locomotives.length);
    }
  }
}

function edit(raw, opt) {
  if (raw.blueprint) editBlueprint(raw.blueprint, opt);
  if (raw.blueprint_book) (raw.blueprint_book.blueprints || []).forEach(item => edit(item, opt));
}

module.exports = function(raw, opt) {
  if (opt.flipX || opt.flipY) {
    throw new Error('Factorio 2.0 flips blueprints itself: hold the blueprint and press H or V.');
  }
  if (opt.landfillEntities) {
    throw new Error('Factorio 2.0 adds landfill itself when you build a blueprint over water with super force building.');
  }

  edit(raw, opt);

  // factorio-blueprint only encodes its own objects, so hand it this one
  const carrier = new Blueprint();
  carrier.toObject = () => raw;
  return carrier.encode();
};

module.exports.isFactorio2 = isFactorio2;
