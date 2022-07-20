const Blueprint = require('factorio-blueprint');
const generateLandfill = require('./lib/landfill');
module.exports = function(string, opt) {
  opt = opt || {};

  const FLIP_X = opt.flipX || false;
  const FLIP_Y = opt.flipY || false;
  const LANDFILL_ENTITIES = opt.landfillEntities || false;
  const ENTITY_REPLACE = opt.entityReplace || [];
  const RECIPE_REPLACE = opt.recipeReplace || [];
  const MODULE_REPLACE = opt.moduleReplace || [];
  const MODIFIED_ONLY = opt.modifiedOnly || false;

  let blueprints = [new Blueprint(string, { checkWithEntityData: false })];
  let newBP = [];

  // is book?
  const isBook = Blueprint.isBook(string);
  if (isBook) {
    blueprints = Blueprint.getBook(string, { checkWithEntityData: false });
  }
  for (let blueprintIndex in blueprints) {
    let old = blueprints[blueprintIndex];
    if (!old) {
      newBP.push(null);
      continue;
    }

    const bp = new Blueprint(null, { checkWithEntityData: false });
    bp.name = old.name;
    bp.version = old.version;
    bp.icons = old.icons;
    newBP.push(bp);

    const newEntityData = {};
    old.icons.forEach(icon => {
      if (!Blueprint.getEntityData()[icon])
        newEntityData[icon] = { type: 'item' };
    });

    [ENTITY_REPLACE, RECIPE_REPLACE, MODULE_REPLACE].forEach(replaceType => {
      replaceType.forEach(replace => {
        ['to', 'from', 'includes'].forEach(type => {
          if (
            replace[type] &&
            !Blueprint.getEntityData()[
              bp.jsName(replace[type].replace('includes:', ''))
            ]
          )
            newEntityData[bp.jsName(replace[type].replace('includes:', ''))] = {
              type: 'item',
            };
        });
      });
    });

    Blueprint.setEntityData(newEntityData);

    old.entities.forEach(ent => {
      ENTITY_REPLACE.forEach(replace => {
        if (
          ent.name == bp.jsName(replace.from) ||
          ent.name.includes(bp.jsName(replace.includes))
        ) {
          ent.name = bp.jsName(replace.to);
          ent.changed = true;
        }
      });
    });

    old.tiles.forEach(tile => {
      ENTITY_REPLACE.forEach(replace => {
        if (
          tile.name == bp.jsName(replace.from) ||
          tile.name.includes(bp.jsName(replace.includes))
        ) {
          tile.name = bp.jsName(replace.to);
          tile.changed = true;
        }
      });
    });

    old.entities.forEach(ent => {
      RECIPE_REPLACE.forEach(replace => {
        if (
          ent.recipe == bp.jsName(replace.from) ||
          ent.recipe.includes(bp.jsName(replace.includes))
        ) {
          ent.recipe = bp.jsName(replace.to);
          ent.changed = true;
        }
      });
    });

    old.entities.forEach(ent => {
      if (!ent.modules) return;
      MODULE_REPLACE.forEach(replaceModule => {
        Object.keys(ent.modules).forEach(mod => {
          if (
            mod == bp.jsName(replaceModule.from) ||
            mod.includes(bp.jsName(replaceModule.includes))
          ) {
            const to = bp.jsName(replaceModule.to);
            if (ent.modules[to]) ent.modules[to] += ent.modules[mod];
            else ent.modules[to] = ent.modules[mod];
            delete ent.modules[mod];

            ent.changed = true;
          }
        });
      });
    });

    old.entities.forEach(ent => {
      if (!Blueprint.getEntityData()[ent.name]) {
        const obj = {};
        obj[ent.name] = { type: 'item' };
        Blueprint.setEntityData(obj);
      }
      if (ent.changed || !MODIFIED_ONLY)
        bp.createEntityWithData(ent.getData(), true, true, true); // Allow overlap in case modded items with unknown size
    });

    bp.entities.forEach(ent => {
      ent.place(bp.entityPositionGrid, bp.entities);
    });

    old.tiles.forEach(tile => {
      if (tile.changed || !MODIFIED_ONLY) bp.createTileWithData(tile.getData());
    });

    // DIR = 'x' | 'y'
    const flip = (DIR, MAP, CURVED_MAP) => {
      bp.entities.forEach(e => {
        e.position[DIR] = -e.position[DIR] - e.size[DIR];

        if (e.name == 'curved_rail' && CURVED_MAP[e.direction] !== undefined) {
          e.direction = CURVED_MAP[e.direction];
        } else if (e.name != 'curved_rail' && MAP[e.direction] !== undefined) {
          e.direction = MAP[e.direction];
        }

        if (e.name.includes('splitter')) {
          const SWITCH_DIR = {
            left: 'right',
            right: 'left',
          };
          e.setInputPriority(SWITCH_DIR[e.inputPriority] || undefined);
          e.setOutputPriority(SWITCH_DIR[e.outputPriority] || undefined);
        }
      });
      bp.tiles.forEach(e => {
        e.position[DIR] = -e.position[DIR] - 1;
      });

      bp.fixCenter({
        // In case of tracks
        x: DIR === 'x' ? 1 : 0,
        y: DIR === 'y' ? 1 : 0,
      });
    };

    if (FLIP_X) {
      const MAP = {
        2: 6,
        6: 2,

        1: 7,
        7: 1,

        3: 5,
        5: 3,
      };
      const CURVED_MAP = {
        5: 4,
        4: 5,

        1: 0,
        0: 1,

        7: 2,
        2: 7,

        3: 6,
        6: 3,
      };
      flip('x', MAP, CURVED_MAP);
    }

    if (FLIP_Y) {
      const MAP = {
        0: 4,
        4: 0,

        1: 3,
        3: 1,

        5: 7,
        7: 5,
      };
      const CURVED_MAP = {
        1: 4,
        4: 1,

        5: 0,
        0: 5,

        3: 2,
        2: 3,

        7: 6,
        6: 7,
      };
      flip('y', MAP, CURVED_MAP);
    }

    if (LANDFILL_ENTITIES) {
      bp.entities.forEach(e => {
        generateLandfill(e, bp);
      });
    }
  }
  if (isBook) {
    return Blueprint.toBook(newBP);
  } else {
    return newBP[0].encode();
  }
};
