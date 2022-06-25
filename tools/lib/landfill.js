// `curved_rail`s require special landfill shapes. the below offsets were generated in `/editor` mode using Factorio 1.1.59
const curvedRailLandfillRequirementsByDirection = [
  [[-3, -3], [-3, -2], [-2, -4], [-2, -3], [-2, -2], [-2, -1], [-1, -3], [-1, -2], [-1, -1], [-1, 0], [0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 2], [1, 3]],
  [[-2, 0], [-2, 1], [-2, 2], [-2, 3], [-1, -2], [-1, -1], [-1, 0], [-1, 1], [-1, 2], [-1, 3], [0, -3], [0, -2], [0, -1], [0, 0], [1, -4], [1, -3], [1, -2], [1, -1], [2, -3], [2, -2]],
  [[-4, 0], [-4, 1], [-3, 0], [-3, 1], [-2, 0], [-2, 1], [-1, -1], [-1, 0], [-1, 1], [0, -2], [0, -1], [0, 0], [1, -3], [1, -2], [1, -1], [1, 0], [2, -3], [2, -2], [2, -1], [3, -2]],
  [[-4, -2], [-4, -1], [-3, -2], [-3, -1], [-2, -2], [-2, -1], [-1, -2], [-1, -1], [-1, 0], [0, -1], [0, 0], [0, 1], [1, -1], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [3, 1]],
  [[-2, -4], [-2, -3], [-2, -2], [-2, -1], [-1, -4], [-1, -3], [-1, -2], [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [1, 3], [2, 1], [2, 2]],
  [[-3, 1], [-3, 2], [-2, 0], [-2, 1], [-2, 2], [-2, 3], [-1, -1], [-1, 0], [-1, 1], [-1, 2], [0, -4], [0, -3], [0, -2], [0, -1], [0, 0], [0, 1], [1, -4], [1, -3], [1, -2], [1, -1]],
  [[-4, 1], [-3, 0], [-3, 1], [-3, 2], [-2, -1], [-2, 0], [-2, 1], [-2, 2], [-1, -1], [-1, 0], [-1, 1], [0, -2], [0, -1], [0, 0], [1, -2], [1, -1], [2, -2], [2, -1], [3, -2], [3, -1]],
  [[-4, -2], [-3, -3], [-3, -2], [-3, -1], [-2, -3], [-2, -2], [-2, -1], [-2, 0], [-1, -2], [-1, -1], [-1, 0], [0, -1], [0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1]],
];

// diagonal `straight_rail`s require less landfill than their `size`-based bounding box. the below offsets were generated in `/editor` mode using Factorio 1.1.59
const straightRailLandfillRequirementsByDirection = [
  undefined, // not diagonal, so default to standard rectangle
  [[0, 0], [1, -1], [1, 0], [1, 1], [2, 0]],
  undefined, // not diagonal, so default to standard rectangle
  [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]],
  undefined, // not diagonal, so default to standard rectangle
  [[-1, 1], [0, 0], [0, 1], [0, 2], [1, 1]],
  undefined, // not diagonal, so default to standard rectangle
  [[-1, 0], [0, -1], [0, 0], [0, 1], [1, 0]],
];

function getSpecialLandfillOffsets(entity) {
  if (entity.name === 'curved_rail') {
    return curvedRailLandfillRequirementsByDirection[entity.direction ?? 0];
  }
  else if (entity.name === 'straight_rail') {
    return straightRailLandfillRequirementsByDirection[entity.direction ?? 0];
  }
  return undefined;
}

function generateLandfill(e, bp) {
  // offshore pumps are built on water, so don't create landfill for them
  if (e.name === 'offshore_pump') {
    return;
  }

  // look up if there is a special offset list for this entity
  let specialOffsets = getSpecialLandfillOffsets(e)
  if (specialOffsets !== undefined) {
    for (const offset of specialOffsets) {
      bp.createTile('landfill', {
        x: e.position.x + offset[0],
        y: e.position.y + offset[1],
      });
    }
  }

  // otherwise, add a rectangle of landfill defined by the entity's 'size' property
  else {
    for (let ox = 0; ox < e.size.x; ox++) {
      for (let oy = 0; oy < e.size.y; oy++) {
        bp.createTile('landfill', {
          x: e.position.x + ox,
          y: e.position.y + oy,
        });
      }
    }
  }
}

module.exports = generateLandfill;
