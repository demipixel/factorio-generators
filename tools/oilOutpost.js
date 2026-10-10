const Blueprint = require('factorio-blueprint');
const Victor = require('victor');

const generateDefenses = require('./lib/defenses');
const generateTrainStation = require('./lib/trainStation');
const fixRail = require('./lib/fixRail');
const { encode } = require('./lib/factorio2');
const fitRailsToWalls = require('./lib/fitRails');
const powerEverything = require('./lib/power');
const clearForStop = require('./lib/clearForStop');
const addBeacons = require('./lib/addBeacons');
const layPipes = require('./lib/pipes');

const PUMPJACK_EXIT_DIRECTION = {
  0: { x: 2, y: -1 },
  2: { x: 3, y: 0 },
  4: { x: 0, y: 3 },
  6: { x: -1, y: 2 }
};

const SIDES = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 }
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

module.exports = function(string, opt = {}) {
  if (!string) throw new Error('You must provide a blueprint string with pumpjacks!');

  const NAME = opt.name || 'Oil Outpost - %pumpjacks% Pumpjacks';

  // Directions
  const TRAIN_SIDE = useOrDefault(opt.trainSide, 1);
  const TRAIN_DIRECTION = useOrDefault(opt.trainDirection, 2);

  const FLIP_ALL = TRAIN_SIDE == TRAIN_DIRECTION + 1 || (TRAIN_SIDE == 0 && TRAIN_DIRECTION == 3);
  const ROTATE_ALL = (TRAIN_DIRECTION + 2) % 4;

  if (Math.abs(TRAIN_SIDE - TRAIN_DIRECTION) % 2 == 0) throw new Error('opt.trainSide and opt.trainDirection must be perpendicular.');

  // General
  const PUMPJACK_NAME = opt.pumpjackName != undefined ? opt.pumpjackName : 'pumpjack';
  const MODULE = opt.module;
  const INCLUDE_RADAR = opt.includeRadar != undefined ? opt.includeRadar : true;
  const INCLUDE_LIGHTS = opt.includeLights != undefined ? opt.includeLights : false;
  const TANKS = useOrDefault(opt.tanks, 2);
  // The shortest straight run of pipe that goes underground, and what a turn costs when the pipes are routed
  const UNDERGROUND = { none: { from: Infinity, turnCost: 0.05 }, long: { from: 6, turnCost: 0.2 }, all: { from: 3, turnCost: 0.35 } };
  const UNDERGROUND_PIPES = opt.undergroundPipes == undefined ? 'all' : opt.undergroundPipes;
  if (!UNDERGROUND[UNDERGROUND_PIPES]) {
    throw new Error('opt.undergroundPipes must be one of: ' + Object.keys(UNDERGROUND).join(', '));
  }
  // false, or how many: 'few', 'balanced' (what true gives) or 'max'
  const BEACONS = opt.beacons === true || opt.beacons === 'true' ? 'balanced' : (opt.beacons && opt.beacons !== 'false' ? opt.beacons : false);
  if (BEACONS && addBeacons.DENSITIES.indexOf(BEACONS) == -1) {
    throw new Error('opt.beacons must be true, false, or one of: ' + addBeacons.DENSITIES.join(', '));
  }

  // Defenses
  const TURRETS_ENABLED = opt.turrets != undefined ? opt.turrets : true;
  const TURRET_SPACING = useOrDefault(opt.turretSpacing, 8);
  const USE_LASER_TURRETS = opt.laserTurrets == undefined ? true : !!opt.laserTurrets;

  const WALLS_ENABLED = opt.walls != undefined ? !!opt.walls : true;
  const WALL_SPACE = useOrDefault(opt.wallSpace, 5);
  const WALL_THICKNESS = WALLS_ENABLED ? useOrDefault(opt.wallThickness, 1) : 0;

  // Trains
  const INCLUDE_TRAIN_STATION = opt.includeTrainStation != undefined ? opt.includeTrainStation : true;
  const LOCOMOTIVES = useOrDefault(opt.locomotiveCount, 1);
  const WAGONS = useOrDefault(opt.wagonCount, 2);
  const SINGLE_HEADED_TRAIN = opt.exitRoute || false;
  const ADDITIONAL_SPACE = useOrDefault(opt.addtionalStationSpace, 0);

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
  if (PUMPJACK_NAME && !newEntityData[PUMPJACK_NAME]) newEntityData[PUMPJACK_NAME] = { type: 'item', width: 3, height: 3 }
  Blueprint.setEntityData(newEntityData);

  function getPumpjackOutput(pumpjack) {
    const ROTATE_OFFSET = ((4 - ROTATE_ALL) % 4);
    const ORDER = [0, -1, 2, 3];
    if (pumpjack.direction % 4 == 0) ORDER.reverse();
    let offset = {
      x: PUMPJACK_EXIT_DIRECTION[(pumpjack.direction + ROTATE_ALL * 2) % 8].x,
      y: PUMPJACK_EXIT_DIRECTION[(pumpjack.direction +
        ROTATE_ALL * 2) % 8].y
    };
    offset.x = ORDER[(ORDER.indexOf(offset.x) + ROTATE_OFFSET) % ORDER.length];
    offset.y = ORDER[(ORDER.indexOf(offset.y) + ROTATE_OFFSET) % ORDER.length];
    if (FLIP_ALL) offset.x = 2 - offset.x;

    return pumpjack.position.clone().add(offset);
  }

  const templateBp = new Blueprint(string);
  let bp = new Blueprint();

  const center = templateBp.center();
  templateBp.fixCenter({ x: center.x - (center.x % 2), y: center.y - (center.y % 2)})

  bp.placeBlueprint(templateBp, { x: 0, y: 0 }, (4 - ROTATE_ALL) % 4);

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

  bp.fixCenter({ x: 0.5, y: 0.5 }); // Tracks in a blueprint always offsets everything by 0.5, so let's keep it clean

  const alignmentTracks = bp.entities.filter(ent => ent.name == 'straight_rail');

  if (alignmentTracks.length != 1) throw new Error('Your blueprint must contain exactly one track for correct alignment.');

  const alignment = {
    x: alignmentTracks[0].position.x + (TANKS % 2 == 0 ? 1 : 0),
    y: alignmentTracks[0].position.y + (LOCOMOTIVES % 2 == 0 ? 1 : 0) + 1 // Add 1 because target is 1 off grid in Y
  };

  alignmentTracks[0].remove();

  if (alignment.x < 0) alignment.x += Math.ceil(-alignment.x / 2) * 2;
  if (alignment.y < 0) alignment.y += Math.ceil(-alignment.y / 2) * 2;
  alignment.x %= 2;
  alignment.y %= 2;



  bp.entities.forEach(ent => {
    if (ent.name != PUMPJACK_NAME) {
      let errStr = PUMPJACK_NAME == 'pumpjack' ? '' : ' (Name: '+PUMPJACK_NAME+')'
      throw new Error('The blueprint must only contain pumpjacks'+errStr+' and one track!');
    }
    else if (bp.findEntity(getPumpjackOutput(ent))) {
      throw new Error('A pumpjack is facing into another pumpjack!');
    }
  });

  let target = new Victor(bp.topRight().x + 1, (bp.topRight().y + bp.bottomRight().y) / 2);

  target.x += -(target.x % 2) + alignment.x
  target.y += -(target.y % 2) + alignment.y;

  const pumpjacks = bp.entities.filter(ent => ent.name == PUMPJACK_NAME);
  const PIPE_MARGIN = 4; // how far around the pumpjacks a pipe may go
  layPipes(bp, {
    outputs: pumpjacks.map(getPumpjackOutput),
    trunk: target,
    area: {
      left: bp.topLeft().x - PIPE_MARGIN,
      right: target.x,
      top: Math.min(bp.topLeft().y, target.y) - PIPE_MARGIN,
      bottom: Math.max(bp.bottomLeft().y, target.y) + PIPE_MARGIN
    },
    turnCost: UNDERGROUND[UNDERGROUND_PIPES].turnCost
  });

  function simplifyPipes(bp, start, minLength = 3) {
    const checked = {};
    const stack = [start];

    const straights = []; // List of straight sets of pipe

    while (stack.length > 0) {
      const pos = stack.pop();
      const entity = bp.findEntity(pos);
      if (checked[pos.x + ',' + pos.y] || !entity || entity.name != 'pipe') continue;
      checked[pos.x + ',' + pos.y] = true;

      const sidePipes = SIDES.map(side => bp.findEntity(pos.clone().add(side)))
        .filter(ent => !!ent)
        .filter(ent => ent.name == 'pipe' || (ent.name == PUMPJACK_NAME && (getPumpjackOutput(ent).x == pos.x && getPumpjackOutput(ent).y == pos.y)))
        .map(ent => ent.position);

      if (pos.from) {
        let shouldUnderground = sidePipes.length == 2 && (sidePipes[0].x - pos.x == pos.x - sidePipes[1].x) && (sidePipes[0].y - pos.y == pos.y -
          sidePipes[1].y)

        const offsetX = pos.from.x - pos.x;
        const offsetY = pos.from.y - pos.y;
        const direction = DIRECTION_FROM_OFFSET[offsetX + ',' + offsetY];

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

  if (UNDERGROUND[UNDERGROUND_PIPES].from != Infinity) simplifyPipes(bp, target, UNDERGROUND[UNDERGROUND_PIPES].from);

  if (BEACONS) addBeacons(bp, { pumpjackName: PUMPJACK_NAME, density: BEACONS, maxX: target.x });

  // Pumpjacks and beacons get their poles now, while the tiles around them
  // are free and before the walls are measured out. Where a beacon leaves no
  // room for a pole, the beacon goes.
  for (;;) {
    const dark = powerEverything.cover(bp, { alsoPowered: [PUMPJACK_NAME], allowed: position => position.x < target.x });
    if (!dark.length) break;
    const beacons = bp.entities.filter(ent => ent.name == 'beacon');
    if (!beacons.length) break;
    const apart = beacon => Math.abs(beacon.position.x - dark[0].position.x) + Math.abs(beacon.position.y - dark[0].position.y);
    bp.removeEntity(beacons.reduce((nearest, beacon) => (apart(beacon) < apart(nearest) ? beacon : nearest)));
  }

  const lowerX = bp.topLeft().x;
  let upperY = bp.bottomLeft().y;
  let lowerY = Math.min(bp.topLeft().y, INCLUDE_RADAR ? -3 : 0);

  let trainStopLocation = null;

  if (INCLUDE_TRAIN_STATION) {
    trainStopLocation = generateTrainStation(bp,
       { x: target.x + 3 + 3 * TANKS, y: target.y - 2 },
        Math.max(bp.bottomRight().y, target.y + 2 + WAGONS * 7 + ((SINGLE_HEADED_TRAIN ? 0 : 1) * LOCOMOTIVES) * 7), 
        {
      LOCOMOTIVES,
      TRACK_CONCRETE,
      SINGLE_HEADED_TRAIN,
      WALL_SPACE,
      WALL_THICKNESS,
      INCLUDE_RADAR,
      INCLUDE_LIGHTS
    });
    lowerY = Math.min(bp.topLeft().y, INCLUDE_RADAR ? -3 : 0);
    //move the uppery if neccessary
    upperY = Math.max(bp.bottomLeft().y - 1 - WALL_SPACE - WALL_THICKNESS);
    const CONNECT_OFFSET = TANKS % 2 == 0 ? -2 : 0; // Target connects two lower depending on tank directions

    for (let i = 0; i < WAGONS; i++) {
      for (let j = 0; j < TANKS; j++) {
        const pos = { x: target.x + 1 + j * 3, y: target.y + CONNECT_OFFSET + i * 7 };
        bp.createEntity('storage_tank', pos, ((TANKS - j) % 2 == 0) ^ FLIP_ALL ? 2 : 0, true);
        upperY = Math.max(upperY, pos.y + 3); // +3 for size of storage_tank
        if (INCLUDE_RADAR && i == 0 && j == TANKS - 1) {
          bp.createEntity('radar', { x: pos.x, y: pos.y - 3 });
          for (let i = 0; i < 5; i++) {
            try {
              bp.createEntity('medium_electric_pole', { x: pos.x - 1, y: pos.y - 1 - i });
              break;
            } catch (e) {}
          }
        }
      }
    }

    for (let i = 0; i < WAGONS; i++) {
      bp.createEntity('pump', { x: target.x + 1 + 3 * TANKS, y: target.y + CONNECT_OFFSET + 2 + i * 7 }, 2);
      bp.createEntity('medium_electric_pole', { x: target.x + 1 + 3 * TANKS, y: target.y + CONNECT_OFFSET + 2 + i * 7 + 1 });
    }

    for (let i = 1; i < WAGONS; i++) {
      bp.createEntity('pipe_to_ground', { x: target.x + 3 * TANKS, y: target.y + CONNECT_OFFSET + 3 + (i - 1) * 7 }, 0);
      bp.createEntity('pipe_to_ground', { x: target.x + 3 * TANKS, y: target.y + CONNECT_OFFSET + 3 + (i - 1) * 7 + 2 }, 4);
      for (let j = 0; j < 3; j++) {
        bp.createEntity('pipe', { x: target.x + 3 * TANKS - j, y: target.y + CONNECT_OFFSET + 3 + (i - 1) * 7 + 3 });
      }
    }
  } else {
    trainStopLocation = { x: target.x + 3 + 3 * TANKS, y: target.y - 2 };
  }

  const upperX = bp.topRight().x + ADDITIONAL_SPACE;

  if (INCLUDE_TRAIN_STATION) {
    fitRailsToWalls(bp, { lowerY, upperY }, { WALL_SPACE, WALL_THICKNESS, SINGLE_HEADED_TRAIN, TRACK_CONCRETE });
  }

  generateDefenses(bp, { lowerX, upperX, lowerY, upperY }, {
    TURRETS_ENABLED,
    TURRET_SPACING,
    USE_LASER_TURRETS,
    WALL_SPACE,
    WALL_THICKNESS,
    CONCRETE,
    BORDER_CONCRETE,
    INCLUDE_LIGHTS
  });

  powerEverything(bp, { alsoPowered: [PUMPJACK_NAME], keepFree: FLIP_ALL ? clearForStop(bp) : [] });

  if (MODULE) {
    bp.entities.filter(ent => ent.name == PUMPJACK_NAME).forEach(ent => {
      ent.modules[MODULE] = 2;
    });
  }

  bp.fixCenter();

  fixRail(bp);

  if (FLIP_ALL) {
    bp.entities.forEach(e => {
      // The stop and the signal belong on the right-hand side of an arriving train,
      // so they change sides of the track instead of being mirrored with it
      if (e.name == 'train_stop' || e.name == 'rail_signal') {
        e.position.x = -e.position.x + 2;
        return;
      }
      e.position.x = -e.position.x - e.size.x;
      if (e.name != PUMPJACK_NAME) {
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

  finalBp.placeBlueprint(bp, { x: 0, y: 0 }, ROTATE_ALL);
  finalBp.name = NAME.replace('%pumpjacks%', finalBp.entities.filter(e => e.name == PUMPJACK_NAME).length);

  return encode(finalBp, opt.gameVersion);
}
