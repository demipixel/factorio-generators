const Blueprint = require('factorio-blueprint');

module.exports = function(string, opt) {
  
  opt = opt || {};

  const FLIP_X = opt.flipX || false;
  const FLIP_Y = opt.flipY || false;
  const ENTITY_REPLACE = opt.entityReplace || [];
  const RECIPE_REPLACE = opt.recipeReplace || [];
  const MODULE_REPLACE = opt.moduleReplace || [];
  const MODIFIED_ONLY = opt.modifiedOnly || false;

  const newEntityData = {};

  const old = new Blueprint(string, { checkWithEntityData: false });
  const bp = new Blueprint();

  [ENTITY_REPLACE, RECIPE_REPLACE, MODULE_REPLACE].forEach(replaceType => {
    replaceType.forEach(replace => {
      ['to', 'from', 'includes'].forEach(type => {
        if (replace[type] && !Blueprint.getEntityData()[bp.jsName(replace[type].replace('includes:', ''))]) newEntityData[bp.jsName(replace[type].replace('includes:', ''))] = { type: 'item' };
      });
    });
  });

  Blueprint.setEntityData(newEntityData);

  old.entities.forEach(ent => {

    ENTITY_REPLACE.forEach(replace => {
      if (ent.name == bp.jsName(replace.from) || ent.name.includes(bp.jsName(replace.includes))) {
        ent.name = bp.jsName(replace.to);
        ent.changed = true;
      }
    });
  });

  old.entities.forEach(ent => {
    RECIPE_REPLACE.forEach(replace => {
      if (ent.recipe == bp.jsName(replace.from) || ent.recipe.includes(bp.jsName(replace.includes))) {
        ent.recipe = bp.jsName(replace.to);
        ent.changed = true;
      }
    });
  });

  old.entities.forEach(ent => {
    if (!ent.modules) return;
    MODULE_REPLACE.forEach(replaceModule => {
      ent.modules.forEach(mod => {
        if (mod.item == bp.jsName(replaceModule.from) || mod.item.includes(bp.jsName(replaceModule.includes))) {
          mod.item = bp.jsName(replaceModule.to);
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
    if (ent.changed || !MODIFIED_ONLY) bp.createEntityWithData(ent.getData(), true, true, true); // Allow overlap in case modded items with unknown size
  });

  bp.entities.forEach(ent => {
    ent.place(bp.entityPositionGrid, bp.entities);
  });

  if (FLIP_X) {
    bp.entities.forEach(e => {
      /*if (e.name == 'train_stop') {
        e.position.x = -e.position.x + e.size.x;
        return;
      }*/
      e.position.x = -e.position.x - e.size.x;
      if (e.direction == 2 || e.direction == 6) {
        e.direction = e.direction == 2 ? 6 : 2;
      }
    });
    bp.fixCenter({ x: 1, y: 0 }); // In case of tracks
  }

  if (FLIP_Y) {
    bp.entities.forEach(e => {
      /*if (e.name == 'train_stop') {
        e.position.x = -e.position.x + e.size.x;
        return;
      }*/
      e.position.y = -e.position.y - e.size.y;
      if (e.direction == 0 || e.direction == 4) {
        e.direction = e.direction == 0 ? 4 : 0;
      }
    });
    bp.fixCenter({ x: 0, y: 1 }); // In case of tracks
  }

  return bp.encode();
}