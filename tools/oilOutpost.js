const Blueprint = require('factorio-blueprint');
const generateDefenses = require('./lib/defenses');
const generateTrainStation = require('./lib/trainStation');
const fixRail = require('./lib/fixRail');
const aStar = require('a-star');
const Victor = require('victor');

const PUMPJACK_EXIT_DIRECTION = {
  0: {x: 2, y: -1},
  2: {x: 3, y: 0},
  4: {x: 0, y: 3},
  6: {x: -1, y: 2}
};

const SIDES = [
  {x: 1, y: 0},
  {x: -1, y: 0},
  {x: 0, y: 1},
  {x: 0, y: -1}
];

const DIRECTION_FROM_OFFSET = {
  '0,-1': 0,
  '1,0': 2,
  '0,1': 4,
  '-1,0': 6
};

function useOrDefault(value, def) {
  return isNaN(parseInt(value)) || value == undefined ? def : parseInt(value);
}

const MAX_UNDERGROUND_REACH = 11; // Includes underground pipes

module.exports = function(string, opt={}) {
  if (!string) throw new Error('You must provide a blueprint string with pumpjacks!');

  const NAME = opt.name || 'Oil Outpost - %pumpjacks% Pumpjacks';

  // Directions
  const TRAIN_SIDE = useOrDefault(opt.trainSide, 1);
  const TRAIN_DIRECTION = useOrDefault(opt.trainDirection, 2);

  const FLIP_ALL = TRAIN_SIDE == TRAIN_DIRECTION + 1 || (TRAIN_SIDE == 0 && TRAIN_DIRECTION == 3);
  const ROTATE_ALL = (TRAIN_DIRECTION + 2) % 4;

  if (Math.abs(TRAIN_SIDE - TRAIN_DIRECTION) % 2 == 0) throw new Error('opt.trainSide and opt.trainDirection must be perpendicular.');

  // General
  const MODULE = opt.module;
  const INCLUDE_RADAR = opt.includeRadar != undefined ? opt.includeRadar : true;
  const TANKS = useOrDefault(opt.tanks, 2);

  // Defenses
  const TURRETS_ENABLED = opt.turrets != undefined ? opt.turrets : true;
  const TURRET_SPACING = useOrDefault(opt.turretSpacing, 8);
  const USE_LASER_TURRETS = opt.laserTurrets == undefined ? true : !!opt.laserTurrets;

  const WALLS_ENABLED = opt.walls != undefined ? !!opt.walls : true;
  const WALL_SPACE = useOrDefault(opt.wallSpace, 5);
  const WALL_THICKNESS = useOrDefault(opt.wallThickness, 1);

  // Trains
  const INCLUDE_TRAIN_STATION = opt.includeTrainStation != undefined ? opt.includeTrainStation : true;
  const LOCOMOTIVES = useOrDefault(opt.locomotiveCount, 1);
  const WAGONS = useOrDefault(opt.wagonCount, 2);
  const SINGLE_HEADED_TRAIN = opt.exitRoute || false;

  // Bot info
  const BOT_BASED = opt.botBased || false;
  const REQUEST_TYPE = opt.requestItem || 'iron_ore';
  const REQUEST_AMOUNT = useOrDefault(opt.requestAmount, 4800);

  // Tiles
  const CONCRETE = opt.concrete || '';
  const BORDER_CONCRETE = opt.borderConcrete || '';
  const TRACK_CONCRETE = opt.trackConcrete || '';

  const newEntityData = {};

  if (CONCRETE) newEntityData[CONCRETE] = { type: 'tile' }
  if (BORDER_CONCRETE && !newEntityData[BORDER_CONCRETE]) newEntityData[BORDER_CONCRETE] = { type: 'tile' }
  if (TRACK_CONCRETE && !newEntityData[TRACK_CONCRETE]) newEntityData[TRACK_CONCRETE] = { type: 'tile' }
  Blueprint.setEntityData(newEntityData);

  function getPumpjackOutput(pumpjack) {
    const ROTATE_OFFSET = ((4 - ROTATE_ALL) % 4);
    const ORDER = [0, -1, 2, 3];
    if (pumpjack.direction % 4 == 0) ORDER.reverse();
    let offset = {x: PUMPJACK_EXIT_DIRECTION[(pumpjack.direction + ROTATE_ALL*2) % 8].x, y: PUMPJACK_EXIT_DIRECTION[(pumpjack.direction + ROTATE_ALL*2) % 8].y};
    offset.x = ORDER[(ORDER.indexOf(offset.x) + ROTATE_OFFSET) % ORDER.length];
    offset.y = ORDER[(ORDER.indexOf(offset.y) + ROTATE_OFFSET) % ORDER.length];
    if (FLIP_ALL) offset.x = 2 - offset.x;

    return pumpjack.position.clone().add(offset);
  }

  const templateBp = new Blueprint(string);
  let bp = new Blueprint();

  bp.placeBlueprint(templateBp, {x: 0, y: 0}, (4 - ROTATE_ALL) % 4);

  if (FLIP_ALL) {
    bp.entities.forEach(e => {
      /*if (e.name == 'train_stop') {
        e.position.x = -e.position.x + e.size.x;
        return;
      }*/
      e.position.x = -e.position.x - e.size.x;
    });
    /*bp.tiles.forEach(t => {
      t.position.x = -t.position.x - 1;
    });*/
    bp.fixCenter({ x: 1, y: 0 });
  }

  bp = new Blueprint(bp.toObject());

  bp.fixCenter({x: 0.5, y: 0.5}); // Tracks in a blueprint always offsets everything by 0.5, so let's keep it clean

  const alignmentTracks = bp.entities.filter(ent => ent.name == 'straight_rail');

  if (alignmentTracks.length != 1) throw new Error('Your blueprint must contain exactly one track for correct alignment.');

  const alignment = {
    x: alignmentTracks[0].position.x + (TANKS % 2 == 0 ? 1 : 0),
    y: alignmentTracks[0].position.y + (LOCOMOTIVES % 2 == 0 ? 1 : 0) + 1 // Add 1 because target is 1 off grid in Y
  };

  alignmentTracks[0].remove();

  if (alignment.x < 0) alignment.x += Math.ceil(-alignment.x/2)*2;
  if (alignment.y < 0) alignment.y += Math.ceil(-alignment.y/2)*2;
  alignment.x %= 2;
  alignment.y %= 2;



  bp.entities.forEach(ent => {
    if (ent.name != 'pumpjack') throw new Error('The blueprint must only contain pumpjacks and one track!');
    else if (bp.findEntity(getPumpjackOutput(ent))) {
      throw new Error('A pumpjack is facing into another pumpjack!');
      // bp.createEntity('pipe', getPumpjackOutput(ent), 0, true)
    }
  });

  // return bp.encode();

  let target = new Victor(bp.topRight().x + 1, (bp.topRight().y + bp.bottomRight().y)/2);

  target.x += -(target.x % 2) + alignment.x
  target.y += -(target.y % 2) + alignment.y;

  bp.entities.filter(ent => ent.name == 'pumpjack').forEach(pumpjack => {
    let powered = false;
    bp.entities.filter(ent => ent.name == 'medium_electric_pole').forEach(pole => {
      if (powered) return;
      if ((pole.position.x - pumpjack.position.x <= 5) &&
          (pole.position.y - pumpjack.position.y <= 5) &&
          (pumpjack.position.x - pole.position.x <= 3) &&
          (pumpjack.position.y - pole.position.y <= 3)) {
        powered = true;
      }
    });
    if (powered) return;

    const output = getPumpjackOutput(pumpjack);
    const electricPoleLocations = [];
    for (let x = -1; x <= 3; x++) {
      for (let y = -1; y <= 3; y++) {
        if (x != -1 && x != 3 && y != -1 && y != 3) continue; // Only on edges
        const pos = {x: x + pumpjack.position.x, y: y + pumpjack.position.y}
        if (pos.x == output.x && pos.y == output.y) continue;
        if (x == output.x || y == output.y) electricPoleLocations.push(pos);
        else electricPoleLocations.unshift(pos);
      }
    }
    for (let i = 0; i < electricPoleLocations.length; i++) {
      const x = electricPoleLocations[i].x;
      const y = electricPoleLocations[i].y;
      if (bp.findEntity({x, y})) continue;
      let blocking = false;
      SIDES.forEach(side => {
        const ent = bp.findEntity({x: x + side.x, y: y + side.y});
        if (!ent || ent.name != 'pumpjack') return;
        const otherOutput = getPumpjackOutput(ent);
        if (otherOutput.x == x && otherOutput.y == y) blocking = true;
      });
      if (!blocking) {
        bp.createEntity('medium_electric_pole', {x, y});
        break;
      }
    }
  });

  bp.entities.filter(ent => ent.name == 'pumpjack').forEach(pumpjack => {
    if (bp.findEntity(getPumpjackOutput(pumpjack))) return;
    // if (bp.findEntity(getPumpjackOutput(pumpjack))) bp.findEntity(getPumpjackOutput(pumpjack)).remove();
    const result = aStar({
      start: getPumpjackOutput(pumpjack),
      isEnd: (node) => {
        if (node.x == target.x && node.y == target.y) return true;
        for (let i = 0; i < SIDES.length; i++) {
          const entity = bp.findEntity(node.clone().add(SIDES[i]));
          if (entity && entity.name == 'pipe') {
            return true;
          }
        }
        return false;
      },
      neighbor: (node) => {
        return SIDES.map(side => node.clone().add(side))
                    .filter(pos => !bp.findEntity(pos))
                    .filter(pos => pos.x <= target.x);
      },
      distance: (nodeA, nodeB) => {
        return Math.abs(nodeA.x - nodeB.x)*0.98 + Math.abs(nodeA.y - nodeB.y);
      },
      heuristic: (node) => {
        return 0; //Math.abs(node.x - target.x) + Math.abs(node.y - target.y);
      },
      hash: (node) => {
        return node.x + ',' + node.y
      },
      timeout: 5000
    });
    if (result.status != 'success') {
      if (result.status == 'noPath') throw new Error('Could not create path for all pipes!');
      else throw new Error('Took too long to generate pipe paths!');
    }
    result.path.forEach(pos => {
      bp.createEntity('pipe', pos, 0, true);
    });
  });

  function simplifyPipes(bp, start, minLength=3) {
    const checked = {};
    const stack = [start];

    const straights = []; // List of straight sets of pipe

    while (stack.length > 0) {
      const pos = stack.pop();
      const entity = bp.findEntity(pos);
      if (checked[pos.x+','+pos.y] || !entity || entity.name != 'pipe') continue;
      checked[pos.x+','+pos.y] = true;

      const sidePipes = SIDES.map(side => bp.findEntity(pos.clone().add(side)))
                             .filter(ent => !!ent)
                             .filter(ent => ent.name == 'pipe' || (ent.name == 'pumpjack' && (getPumpjackOutput(ent).x == pos.x && getPumpjackOutput(ent).y == pos.y)))
                             .map(ent => ent.position);

      if (pos.from) {
        let shouldUnderground = sidePipes.length == 2 && (sidePipes[0].x - pos.x == pos.x - sidePipes[1].x) && (sidePipes[0].y - pos.y == pos.y - sidePipes[1].y)

        const offsetX = pos.from.x - pos.x;
        const offsetY = pos.from.y - pos.y;
        const direction = DIRECTION_FROM_OFFSET[offsetX+','+offsetY];

        if (pos.from.underground && pos.from.underground.length != MAX_UNDERGROUND_REACH && shouldUnderground) {
          pos.from.underground.push(pos);
          pos.underground = pos.from.underground;
        } else if (shouldUnderground && (!pos.from.underground || pos.from.underground.length == MAX_UNDERGROUND_REACH)) {
          pos.underground = [pos];
          pos.underground.direction = direction;
          straights.push(pos.underground);
        }
      } else if (sidePipes.length == 1 && sidePipes[0].x == pos.x - 1) {
        pos.underground = [pos];
        pos.underground.direction = 2;
        straights.push(pos.underground);
      }

      SIDES.forEach(side => {
        const newPos = pos.clone().add(side);
        newPos.from = pos;
        stack.push(newPos);
      });
    }

    straights.filter(s => s.length >= minLength).forEach(straight => {
      straight.forEach(pos => bp.findEntity(pos).remove());
      bp.createEntity('pipe_to_ground', straight[0], straight.direction);
      bp.createEntity('pipe_to_ground', straight[straight.length - 1], (straight.direction + 4) % 8);
    });
  }

  simplifyPipes(bp, target);

  const lowerX = bp.topLeft().x;
  let upperY = bp.bottomLeft().y;

  if (INCLUDE_TRAIN_STATION) {
    const trainStopLocation = generateTrainStation(bp, {x: target.x + 3 + 3*TANKS, y: target.y - 2 }, Math.max(bp.bottomRight().y, target.y - 2 - WAGONS*7), {
      LOCOMOTIVES, TRACK_CONCRETE, SINGLE_HEADED_TRAIN, WALLS_ENABLED, WALL_SPACE, WALL_THICKNESS, INCLUDE_RADAR
    });

    const CONNECT_OFFSET = TANKS % 2 == 0 ? -2 : 0; // Target connects two lower depending on tank directions

    for (let i = 0; i < WAGONS; i++) {
      for (let j = 0; j < TANKS; j++) {
        const pos = {x: target.x + 1 + j*3, y: target.y + CONNECT_OFFSET + i*7};
        bp.createEntity('storage_tank', pos, ((TANKS - j) % 2 == 0) ^ FLIP_ALL ? 2 : 0, true);
        upperY = Math.max(upperY, pos.y + 3); // +3 for size of storage_tank
        if (i == 0 && j == TANKS - 1) {
          bp.createEntity('radar', {x: pos.x, y: pos.y - 3});
          bp.createEntity('medium_electric_pole', {x: pos.x - 1, y: pos.y - 1});
        }
      }
    }

    for (let i = 0; i < WAGONS; i++) {
      bp.createEntity('pump', {x: target.x + 1 + 3*TANKS, y: target.y + CONNECT_OFFSET + 2 + i*7}, 2);
      bp.createEntity('medium_electric_pole', {x: target.x + 1 + 3*TANKS, y: target.y + CONNECT_OFFSET + 2 + i*7 + 1});
    }

    for (let i = 1; i < WAGONS; i++) {
      bp.createEntity('pipe_to_ground', {x: target.x + 3*TANKS, y: target.y + CONNECT_OFFSET + 3 + (i-1)*7}, 0);
      bp.createEntity('pipe_to_ground', {x: target.x + 3*TANKS, y: target.y + CONNECT_OFFSET + 3 + (i-1)*7 + 2}, 4);
      for (let j = 0; j < 3; j++) {
        bp.createEntity('pipe', {x: target.x + 3*TANKS - j, y: target.y + CONNECT_OFFSET + 3 + (i-1)*7 + 3});
      }
    }
  }

  const upperX = bp.topRight().x;
  const lowerY = bp.topLeft().y;

  generateDefenses(bp, {lowerX, upperX, lowerY, upperY}, {
    TURRETS_ENABLED, TURRET_SPACING, USE_LASER_TURRETS, WALLS_ENABLED, WALL_SPACE, WALL_THICKNESS, CONCRETE, BORDER_CONCRETE
  });

  if (MODULE) {
    bp.entities.filter(ent => ent.name == 'pumpjack').forEach(ent => {
      ent.modules[MODULE] = 3;
    });
  }

  bp.fixCenter();

  fixRail(bp);

  if (FLIP_ALL) {
    bp.entities.forEach(e => {
      if (e.name == 'train_stop') {
        e.position.x = -e.position.x + e.size.x;
        return;
      }
      e.position.x = -e.position.x - e.size.x;
      if (e.name != 'pumpjack') {
        if (e.direction == 2 || e.direction == 6) {
          e.direction = e.direction == 2 ? 6 : 2;
        }
      }
    });
    bp.tiles.forEach(t => {
      t.position.x = -t.position.x - 1;
    });
    bp.fixCenter({ x: 1, y: 0 });
  }

  const finalBp = new Blueprint();

  finalBp.placeBlueprint(bp, {x: 0, y: 0}, ROTATE_ALL);
  finalBp.name = NAME.replace('%pumpjacks%', finalBp.entities.filter(e => e.name == 'pumpjack').length);

  return finalBp.encode();
}
