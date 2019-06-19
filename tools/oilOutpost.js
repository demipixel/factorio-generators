const Blueprint = require('factorio-blueprint');
const Victor = require('victor');

const generateDefenses = require('./lib/defenses');
const generateTrainStation = require('./lib/trainStation');
const fixRail = require('./lib/fixRail');
const addBeacons = require('./lib/addBeacons');
const addPipes = require('./lib/addPipes');
const powerUtils = require('./lib/powerUtils');

function useOrDefault(value, def) {
  return isNaN(parseInt(value)) || value == undefined ? def : parseInt(value);
}

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
  const MODULE = opt.module;
  const INCLUDE_RADAR = opt.includeRadar != undefined ? opt.includeRadar : true;
  const INCLUDE_LIGHTS = opt.includeLights != undefined ? opt.includeLights : true;
  const TANKS = useOrDefault(opt.tanks, 2);
  const USE_BEACONS = !!opt.beacons;

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

  // Tiles
  const CONCRETE = opt.concrete || '';
  const BORDER_CONCRETE = opt.borderConcrete || '';
  const TRACK_CONCRETE = opt.trackConcrete || '';

  const newEntityData = {};

  if (CONCRETE) newEntityData[CONCRETE] = { type: 'tile' };
  if (BORDER_CONCRETE && !newEntityData[BORDER_CONCRETE]) newEntityData[BORDER_CONCRETE] = { type: 'tile' };
  if (TRACK_CONCRETE && !newEntityData[TRACK_CONCRETE]) newEntityData[TRACK_CONCRETE] = { type: 'tile' };
  Blueprint.setEntityData(newEntityData);

  const templateBp = new Blueprint(string);
  let bp = new Blueprint();
  console.time("outpost");

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
    if (ent.name != 'pumpjack') throw new Error('The blueprint must only contain pumpjacks and one track!');
  });

  console.timeLog("outpost", "prepare");

  if (USE_BEACONS){
    addBeacons(bp);
    console.timeLog("outpost", "beacons");
  }

  let target = new Victor(bp.topRight().x + 1, (bp.topRight().y + bp.bottomRight().y) / 2);
  target.x += -(target.x % 2) + alignment.x;
  target.y += -(target.y % 2) + alignment.y;

  addPipes(bp, target, ROTATE_ALL, FLIP_ALL);
  console.timeLog("outpost", "pipes done");

  const lowerX = bp.topLeft().x;
  let upperY = bp.bottomLeft().y;
  let lowerY = Math.min(bp.topLeft().y, INCLUDE_RADAR ? -3 : 0);

  if (INCLUDE_TRAIN_STATION) {
    generateTrainStation(bp,
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
        if (i == 0 && j == TANKS - 1) {
          bp.createEntity('radar', { x: pos.x, y: pos.y - 3 });
          bp.createEntity('medium_electric_pole', { x: pos.x - 1, y: pos.y - 1 });
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
    console.timeLog("outpost", "station done");
  }

  const upperX = bp.topRight().x + ADDITIONAL_SPACE;

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
  console.timeLog("outpost", "defenses done");

  powerUtils.connectConsumers(bp, bp.entities.filter(
    ent => ent.name == 'pumpjack' || ent.name == 'beacon'));
  powerUtils.connectPoles(bp);

  if (MODULE) {
    bp.entities.filter(ent => ent.name == 'pumpjack').forEach(ent => {
      ent.modules[MODULE] = 2;
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

  finalBp.placeBlueprint(bp, { x: 0, y: 0 }, ROTATE_ALL);
  finalBp.name = NAME.replace('%pumpjacks%', finalBp.entities.filter(e => e.name == 'pumpjack').length);

  console.timeLog("outpost", "wrapup");
  return finalBp.encode();
};
