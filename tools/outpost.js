const Blueprint = require('factorio-blueprint');
const generateDefenses = require('./lib/defenses');
const generateTrainStation = require('./lib/trainStation');
const fixRail = require('./lib/fixRail');


const BALANCER = {
  1: '0eNqFjs0KgzAQhN9lzhGs2h/yKqUUbZeyoJuQrEWRvHsTe+mtl4VZZj6+DcM4kw8sCruBH04i7HVD5Jf0Y/np6gkWrDTBQPqpJFp8oBgrDb1E74JWA42KZMDypAX2kG4GJMrK9CXuYb3LPA0UcuEfy8C7mOdOikVG1gZrvqmQdxv7I2/wphD38qnrmmPdtufmktIHq6tMlw==',
  2: '0eNp1jsEKg0AQQ/8l57VoUaHzK6UUbYcyoOOyOxZF9t/r2ksvPSYkL9nQDzP7IGqgDfKYNIKuG6K8tBuyZ6tnEMR4hIN2Y1a8+MAxFtEPYsYByUH0yQuoSjcHVhMT/rIOsd51Hvs9SdV/ioOf4l6cNC/vsKI8NQ4rqEwZe5ygn88Obw7xyLd1fa4v5blt2pQ+qhFIlw==',
  4: '0eNqdlt1uwyAMhd/F13TChKRtXmWapv6gCiklCMjUqsq7jzTqVq1ul/gKkYSPg4+Nc4Ft0xkfrEtQX8DuWhehfr9AtAe3aYZn6ewN1GCTOYIAtzkOM3PywcS4SGHjom9DWmxNk6AXYN3enKDGXkyGRN/YlEy4W676DwHGJZusGQVdJ+dP1x23+csa/5MiwLcxL2/dsH9GLpSAcx6KfpD2B6eei3oE4Vs5ojSFKh5QXT5TOIQ2j8+04U2buIWq7ZLvhog+bKAZG8gZ/HJGLOTLUFSzTcIXHi3ZlisKt5pj+c85kUKt5yvDmzIBexvMbnxXEXCUs+mShCsKjlyLyJii4nokJ2gtuHDSNNRc1ySJK/l1j79lad2TqsSKmQa02iX7EpkkdsVMKzmhHtZMNpkFSnKTiiwAhZxGQrckxbmgaFUF40qnRWlm8LOu3NGv/b++++cQ8GVCHL3WWum1VFVZ9f032HrobA==',
  8: '0eNqlmd2O2jAQhV9l5euk8n8SXqVaVbBrrSxBEiXOahHKu9cpKW13h2CfXiEC/pg59hyPzYUdjpPrB98Gtrsw/9K1I9t9v7DRv7X74/IsnHvHduzdD2GKTwrW7k/Lg+s3yprNBfPtq/tgOzEX4Eg5PxfMtcEH764B/Hpz/tFOp4MbIvo22n30gxvHMgz7duy7IZQHdwyR3ndjHN61y09HZCkLdo4vZl6i+oST+Ti1gVNfcGN/9CHEz4i4vpkrSlMonR0Z3wjM5OcpNnA2J0++mWeVHdnWfNbZtK00m4w0xWaWgmcHpjcCE/llsLVshcxIVG0nquCKUiRPwzxJ8r5WwhStZ3gbuvj6wEJkNKrVzLop9FNg1C9kFcdt2dDZV6gL0MnXKI6OrkG0FBlaSo7WMxmwFCiOlFNK1LuW5F/94F6uH1kKrgBx5e/kU7TVqIekRG9Qv6OVtiiOXgcVoK3K0Ta/0MrVB8S/4kqK3qB0TjYt+UVW6hX3cCEogXiEprW4Ke/bO8IrvKETpDYK7jcTJlJppF+kJ9GA1s4TwrRw95giArzH0TOGtoApQuQ0hOsyiN3vY7DmQJWIB0Vy35403D6SkmuJujONUyCOLAyNbnMJ60Eb1DnpxC2KIzdNXaHelbDB6xo1WjrWBsWRShqOpk7jkE2Mr7yEejQStMCEiTIKNe8UuMZPAJ98y6boZMCGWySkYsF9I0WmCrb3uyrdbYFMDR8c/jqT3cc3oJ8mzIFFb0lS2AJkk35lJXyCSBHZKnQnIM87Fr5EUQnC/seNikrRwiJNMnk5ZSvYx5MirXE3TOI3yLUrfeuKXqyQ66sSOX3xGhdNksCVK50h2kXScWnghpSOy6CtCXl1W1m0tGkcehijaTXae9C4Bly09F8FHGwmaBq6vdA0CW6ykfZcMB/cKQ7985dewY77OCw+q59C91THB+9uGK+errU0UnGl6nn+CfOVfEw='
};




const DIRECTIONS = {
  up: 0,
  right: 1,
  down: 2,
  left: 3
};

function useOrDefault(value, def) {
  return isNaN(parseInt(value)) || value == undefined ? def : parseInt(value);
}

function isUpwardsFacingBelt(ent) {
  const names = ['transport_belt', 'splitter', 'underground_belt'];
  let nameOk = false;
  names.forEach(function(name) {
    if (ent.name.indexOf(name) > -1) {
      nameOk = true;
    }
  });

  return nameOk && ent.direction == Blueprint.UP && (!ent.directionType || ent.directionType == 'input');
}

//places medium poles along x axis in between given posistions to connect medium poles at (x1, y) and (x2, y)
function connectPoles_x(bp, x1, x2, y) {
  const POLE_REACH = 8;
  const d = Math.abs(x1 - x2);
  const xmin = Math.min(x1, x2);
  const xmax = Math.max(x1, x2);
  if (d <= POLE_REACH)
    return;

  //try to place a pole as far from xmax as possible
  for (let i = xmax - POLE_REACH; i <= xmax - 1; i++) {
    const pos = { x: i, y: y };
    if (bp.findEntity(pos) == null) {
      bp.createEntity('medium_electric_pole', pos);
      return connectPoles_x(bp, xmin, i, y);
    }
  }
}


module.exports = function(string, opt = {}) {

  const NAME = opt.name || 'Ore Outpost - %drills% Drills';

  // Directions
  const TRAIN_DIRECTION = useOrDefault(opt.trainDirection, 2);
  const TRAIN_SIDE = useOrDefault(opt.trainSide, 1);

  // General
  const SPACE_BETWEEN_MINERS = useOrDefault(opt.minerSpace, 1);
  const MINING_DRILL_NAME = opt.miningDrillName || 'electric_mining_drill';
  const MODULE = opt.module;
  const USE_STACKER_INSERTER = opt.useStackInserters != undefined ? !!opt.useStackInserters : true;
  const USE_FILTER_INSERTER = opt.useFilterInserters != undefined ? !!opt.useFilterInserters : true;
  const INCLUDE_RADAR = opt.includeRadar != undefined ? opt.includeRadar : true;

  // Defenses
  const TURRETS_ENABLED = opt.turrets != undefined ? opt.turrets : true;
  const TURRET_SPACING = useOrDefault(opt.turretSpacing, 8);
  const USE_LASER_TURRETS = opt.laserTurrets == undefined ? true : !!opt.laserTurrets;

  const WALLS_ENABLED = opt.walls != undefined ? !!opt.walls : true;
  const WALL_SPACE = useOrDefault(opt.wallSpace, 5);
  const WALL_THICKNESS = WALLS_ENABLED ? useOrDefault(opt.wallThickness, 1) : 0;

  // Trains
  const LOAD_FROM_BOTH_SIDES = opt.doubleLoading;
  const INCLUDE_TRAIN_STATION = opt.includeTrainStation != undefined ? opt.includeTrainStation : true;
  const LOCOMOTIVES = useOrDefault(opt.locomotiveCount, 2);
  const FINAL_LANES = useOrDefault(opt.cargoWagonCount, 4) * (LOAD_FROM_BOTH_SIDES ? 2 : 1);
  const LOADING_BAYS = useOrDefault(opt.cargoWagonCount, 4);
  const SINGLE_HEADED_TRAIN = opt.exitRoute || false;

  // Bot info
  const BOT_BASED = opt.botBased || false;
  const REQUEST_TYPE = opt.requestItem || 'iron_ore';
  const REQUEST_AMOUNT = useOrDefault(opt.requestAmount, 4800);
  const ROBOPORTS = opt.roboports || false;

  // Tiles
  const CONCRETE = opt.concrete || '';
  const BORDER_CONCRETE = opt.borderConcrete || '';
  const TRACK_CONCRETE = opt.trackConcrete || '';

  // Belt shenanigans
  const UNDERGROUND_BELT = !!opt.undergroundBelts || false;
  const COMPACT = (UNDERGROUND_BELT && !!opt.compact) || false;

  let BELT_NAME = (opt.beltName || '').replace('transport_belt', '');
  if (BELT_NAME.length > 0 && BELT_NAME[BELT_NAME.length - 1] != '_') BELT_NAME += '_';

  const newEntityData = {};
  newEntityData[REQUEST_TYPE] = { type: 'item' };
  newEntityData[BELT_NAME + 'transport_belt'] = { type: 'item', width: 1, height: 1 };
  newEntityData[BELT_NAME + 'splitter'] = { type: 'item', width: 2, height: 1 };
  newEntityData[BELT_NAME + 'underground_belt'] = { type: 'item', width: 1, height: 1, directionType: true };

  newEntityData[MINING_DRILL_NAME] = { type: 'item', width: 3, height: 3 };

  if (CONCRETE) newEntityData[CONCRETE] = { type: 'tile' }
  if (BORDER_CONCRETE && !newEntityData[BORDER_CONCRETE]) newEntityData[BORDER_CONCRETE] = { type: 'tile' }
  if (TRACK_CONCRETE && !newEntityData[TRACK_CONCRETE]) newEntityData[TRACK_CONCRETE] = { type: 'tile' }
  Blueprint.setEntityData(newEntityData);

  const PROVIDED_BALANCER = opt.balancer;

  if (!PROVIDED_BALANCER && !BALANCER[FINAL_LANES] && !BOT_BASED) {
    throw new Error('I don\'t have a ' + FINAL_LANES + 'x' + FINAL_LANES +
      ' balancer available, so you must provide the blueprint string for one. Use express belt and have it face upwards.');
  }



  if (Math.abs(TRAIN_DIRECTION - TRAIN_SIDE) % 2 == 0 && !BOT_BASED) {
    throw new Error('trainSide direction must be perpendicular to trainDirection.');
  }

  let templateBlueprint = null;

  try {
    templateBlueprint = new Blueprint(string);
  } catch (e) {
    throw new Error('Error loading blueprint: ' + e.message);
  }

  if (templateBlueprint.entities.length != 2 || templateBlueprint.entities.filter(e => e.name == 'stone_wall').length != 2) {
    throw new Error('Blueprint must contain only 2 entities: Walls at the position of the corners of the mine.');
  }

  const topLeft = {
    x: Math.min(templateBlueprint.entities[0].position.x, templateBlueprint.entities[1].position.x),
    y: Math.min(templateBlueprint.entities[0].position.y, templateBlueprint.entities[1].position.y),
  };

  const bottomRight = {
    x: Math.max(templateBlueprint.entities[0].position.x, templateBlueprint.entities[1].position.x),
    y: Math.max(templateBlueprint.entities[0].position.y, templateBlueprint.entities[1].position.y),
  };

  if (bottomRight.x - topLeft.x < 3 || bottomRight.y - topLeft.y < 3) {
    throw new Error('Template size must be at least 5x5!');
  }

  const size = {
    x: (TRAIN_DIRECTION % 2 == 0 ? bottomRight.x - topLeft.x : bottomRight.y - topLeft.y),
    y: (TRAIN_DIRECTION % 2 == 1 ? bottomRight.x - topLeft.x : bottomRight.y - topLeft.y)
  };

  const bp = new Blueprint();

  const MINER_SIZE = 3;
  const Y_SIZE = (MINER_SIZE + SPACE_BETWEEN_MINERS) * 2;
  const X_SIZE = MINER_SIZE * 2 + (COMPACT ? 1 : 2);

  let balancerBlueprint = null;

  if (!BOT_BASED) {
    balancerBlueprint = new Blueprint(PROVIDED_BALANCER || BALANCER[FINAL_LANES]);

    balancerBlueprint.entities.forEach(ent => {
      if (ent.name.includes('transport_belt')) ent.name = BELT_NAME + 'transport_belt';
      else if (ent.name.includes('underground_belt')) ent.name = BELT_NAME + 'underground_belt';
      else if (ent.name.includes('splitter')) ent.name = BELT_NAME + 'splitter';
    });

    const balancerBL = balancerBlueprint.bottomLeft();
    const balancerTR = balancerBlueprint.topRight();
    const balancerHeight = Math.abs(balancerTR.y - balancerBL.y);
    const balancerWidth = Math.abs(balancerTR.x - balancerBL.x);

    let balancerOffsetX = 0;
    let balancerOffsetY = 0;

    //there seems to be a problem with blueprint orientation, so get min and max manually;
    const xmin = Math.min(balancerBL.x, balancerTR.x);
    const ymax = Math.max(balancerBL.y, balancerTR.y) - 1;


    //since some balancers may have non-rectangular form, we find leftmost upwards-facing occupied tile in the bottom row,
    //and assume that it is the leftmost balancer input.
    for (let i = 0; i < balancerWidth; i++) {
      const pos = { x: xmin + i, y: ymax };
      let ent = balancerBlueprint.findEntity(pos);
      if (ent != null && isUpwardsFacingBelt(ent)) {
        balancerOffsetX = -i;
        break;
      }
    }

    balancerBlueprint.fixCenter(balancerBlueprint.bottomLeft().subtract({ x: balancerOffsetX, y: balancerOffsetY }));
  }

  const X_LENGTH = Math.ceil(size.x / X_SIZE);
  const Y_LENGTH = Math.ceil(size.y / Y_SIZE);

  let locationForBalancer = null;

  if (INCLUDE_RADAR) {
    bp.createEntity('radar', { x: 0, y: -3 });
    bp.createEntity('medium_electric_pole', { x: -1, y: -2 });
  }

  const SPLITTER_ON_LAST = Math.floor((X_LENGTH - 2) * FINAL_LANES / X_LENGTH) == Math.floor((X_LENGTH - 1) * FINAL_LANES / X_LENGTH)

  // Place miners, belts, and merger splitters
  for (let x = 0; x < X_LENGTH; x++) {
    const OFFSET_X = x * X_SIZE;
    for (let y = 0; y < Y_LENGTH; y++) {
      let OFFSET_Y = y * Y_SIZE;

      const miningDrillEntities = [];

      miningDrillEntities.push(bp.createEntity(MINING_DRILL_NAME, { x: OFFSET_X, y: OFFSET_Y }, Blueprint.RIGHT));
      miningDrillEntities.push(bp.createEntity(MINING_DRILL_NAME, { x: OFFSET_X, y: OFFSET_Y + MINER_SIZE + SPACE_BETWEEN_MINERS }, Blueprint.RIGHT));
      miningDrillEntities.push(bp.createEntity(MINING_DRILL_NAME, { x: OFFSET_X + MINER_SIZE + 1, y: OFFSET_Y }, Blueprint.LEFT));
      miningDrillEntities.push(bp.createEntity(MINING_DRILL_NAME, { x: OFFSET_X + MINER_SIZE + 1, y: OFFSET_Y + MINER_SIZE + SPACE_BETWEEN_MINERS },
        Blueprint.LEFT, true));

      const NEED_ADDITIONAL_POLES = x == 0 && SPACE_BETWEEN_MINERS >= 2;
      if (!COMPACT) {
        const pos = { x: OFFSET_X - 1, y: OFFSET_Y + MINER_SIZE };
        bp.createEntity('medium_electric_pole', pos);
        if (NEED_ADDITIONAL_POLES) bp.createEntity('medium_electric_pole', { x: pos.x, y: pos.y + 5 });
      } else {
        const pos = { x: OFFSET_X + 3, y: OFFSET_Y + MINER_SIZE - 1 };
        bp.createEntity('medium_electric_pole', pos);
        if (NEED_ADDITIONAL_POLES) bp.createEntity('medium_electric_pole', { x: pos.x, y: pos.y + 5 });
      }

      if (MODULE) {
        miningDrillEntities.forEach(ent => {
          ent.modules[MODULE] = 3;
        });
      }

      if (x == X_LENGTH - 1) {
        bp.createEntity('medium_electric_pole', { x: OFFSET_X + MINER_SIZE * 2 + 1, y: OFFSET_Y + MINER_SIZE });
      }

      if (!BOT_BASED) {
        const IS_LAST = y == Y_LENGTH - 1;
        if (!UNDERGROUND_BELT) {
          for (let i = 0; i < Y_SIZE - (IS_LAST ? SPACE_BETWEEN_MINERS + 1 : 0); i++) {
            bp.createEntity(BELT_NAME + 'transport_belt', { x: OFFSET_X + MINER_SIZE, y: OFFSET_Y + i + 1 }, Blueprint.DOWN);
          }
        } else {
          for (let i = 0; i < 2; i++) {
            const secondaryOffset = i * (SPACE_BETWEEN_MINERS + MINER_SIZE);
            const lastOffset = IS_LAST && i == 1 ? -1 - SPACE_BETWEEN_MINERS : 0;
            bp.createEntity(BELT_NAME + 'underground_belt', { x: OFFSET_X + MINER_SIZE, y: OFFSET_Y + 1 + secondaryOffset }, Blueprint.DOWN)
              .setDirectionType('input');
            bp.createEntity(BELT_NAME + 'underground_belt', { x: OFFSET_X + MINER_SIZE, y: OFFSET_Y + SPACE_BETWEEN_MINERS + MINER_SIZE +
                  secondaryOffset + lastOffset }, Blueprint.DOWN)
              .setDirectionType('output');
          }
        }
      } else {
        for (let i = 0; i < 2; i++) {
          bp.createEntity('logistic_chest_passive_provider', { x: OFFSET_X + MINER_SIZE, y: OFFSET_Y + 1 + i * (SPACE_BETWEEN_MINERS + MINER_SIZE) })
            .setBar(1);
        }
      }
    }
    let distanceOut = X_LENGTH - x - 1;

    const connectWithSplitter = Math.floor(x * FINAL_LANES / X_LENGTH) == Math.floor((x + 1) * FINAL_LANES / X_LENGTH);
    const finalLane = FINAL_LANES >= X_LENGTH ? X_LENGTH - x - 1 : FINAL_LANES - Math.floor(x * FINAL_LANES / X_LENGTH) - 1;

    for (let i = 0; i < distanceOut; i++) { // Go out, before going across
      const xPosition = OFFSET_X + MINER_SIZE;
      const yPosition = Y_LENGTH * Y_SIZE + i - SPACE_BETWEEN_MINERS;
      if (!BOT_BASED) bp.createEntity(BELT_NAME + 'transport_belt', { x: xPosition, y: yPosition }, Blueprint.DOWN);
    }
    const cutInEarly = distanceOut == 0 ? 0 : X_SIZE - finalLane;
    const acrossDistance = (connectWithSplitter ? X_SIZE : distanceOut * X_SIZE - cutInEarly) + 2; // Go across (either to hit splitter or go to balancer)

    distanceOut--; // Not going out as far to prevent belt collision and keep compact

    const OFFSET_Y = Y_LENGTH * Y_SIZE + distanceOut - (SPACE_BETWEEN_MINERS - 1);

    for (let i = 0; i < acrossDistance; i++) {
      const xPosition = OFFSET_X + MINER_SIZE + i; // Just getting the sign from direction data's x/y
      const yPosition = OFFSET_Y;
      if (!bp.findEntity({ x: xPosition, y: yPosition })) {
        if (!BOT_BASED) bp.createEntity(BELT_NAME + 'transport_belt', { x: xPosition, y: yPosition }, Blueprint.RIGHT);

        if (distanceOut == 0) locationForBalancer = { x: xPosition, y: yPosition };
      }
    }
    if (connectWithSplitter) { // Generate spliiter
      const xPosition = OFFSET_X + MINER_SIZE + X_SIZE + 1;
      const yPosition = OFFSET_Y - 1;
      bp.removeEntityAtPosition({ x: xPosition, y: yPosition }); // Remove belts at splitter
      bp.removeEntityAtPosition({ x: xPosition, y: yPosition + 1 });
      if (!BOT_BASED) bp.createEntity(BELT_NAME + 'splitter', { x: xPosition, y: yPosition }, Blueprint.RIGHT);
    } else { // Generate "lowering" to meet other belts
      const offsetBecauseSplitterOnLast = SPLITTER_ON_LAST ? 0 : 1;
      for (let i = 0; i < distanceOut - finalLane + offsetBecauseSplitterOnLast; i++) {
        const xPosition = OFFSET_X + MINER_SIZE + acrossDistance;
        const yPosition = OFFSET_Y - i;
        if (!BOT_BASED) bp.createEntity(BELT_NAME + 'transport_belt', { x: xPosition, y: yPosition }, Blueprint.UP);
      }

      for (let i = 0; i < cutInEarly + ((X_SIZE - 1) / 2); i++) {
        const xPosition = OFFSET_X + MINER_SIZE + acrossDistance + i;
        const yPosition = OFFSET_Y - distanceOut + finalLane - offsetBecauseSplitterOnLast;
        if (!BOT_BASED) bp.createEntity(BELT_NAME + 'transport_belt', { x: xPosition, y: yPosition }, Blueprint.RIGHT, true);

        if (distanceOut == -1) locationForBalancer = { x: xPosition, y: yPosition };
      }
    }
  }

  // Place balancer
  if (!BOT_BASED) bp.placeBlueprint(balancerBlueprint, locationForBalancer, Blueprint.RIGHT / 2, true);

  let trainStopLocation = null;

  // Generate lanes to cargo wagons, track, and train stop
  if (INCLUDE_TRAIN_STATION) {
    let RAIL_X = null;

    for (let l = 0; l < LOADING_BAYS; l++) {
      let OFFSET_Y = locationForBalancer.y + l;
      let OFFSET_X = locationForBalancer.x + (!BOT_BASED ? balancerBlueprint.bottomLeft().y - balancerBlueprint.topLeft().y + 1 : 2);
      const START_TO_CARGO = OFFSET_Y;

      if (l == 0 && LOAD_FROM_BOTH_SIDES && !BOT_BASED) {

        for (let i = 0; i < LOADING_BAYS; i++) {
          for (let j = 0; j < LOADING_BAYS + 1; j++) {
            bp.createEntity(BELT_NAME + 'transport_belt', { x: OFFSET_X + j, y: OFFSET_Y + i + LOADING_BAYS }, Blueprint.RIGHT);
          }
          bp.createEntity(BELT_NAME + 'underground_belt', { x: OFFSET_X + LOADING_BAYS + 1, y: OFFSET_Y + i + LOADING_BAYS }, Blueprint.RIGHT).setDirectionType(
            'input');
          bp.createEntity(BELT_NAME + 'underground_belt', { x: OFFSET_X + LOADING_BAYS + 6, y: OFFSET_Y + i + LOADING_BAYS }, Blueprint.RIGHT).setDirectionType(
            'output');
          bp.createEntity(BELT_NAME + 'transport_belt', { x: OFFSET_X + LOADING_BAYS + 7, y: OFFSET_Y + i + LOADING_BAYS }, Blueprint.RIGHT);
        }
      }
      for (let i = 0; i < l; i++) {
        const xPosition = OFFSET_X + i;
        const yPosition = OFFSET_Y;
        if (!BOT_BASED) bp.createEntity(BELT_NAME + 'transport_belt', { x: xPosition, y: yPosition }, Blueprint.RIGHT);
        if (!BOT_BASED && LOAD_FROM_BOTH_SIDES) bp.createEntity(BELT_NAME + 'transport_belt', { x: xPosition + 8 + LOADING_BAYS, y: yPosition +
            LOADING_BAYS }, Blueprint.RIGHT);
      }
      OFFSET_X += l;

      const distanceToCargoWagon = (LOADING_BAYS - l - 1) * 6;
      for (let i = 0; i < distanceToCargoWagon; i++) {
        const xPosition = OFFSET_X;
        const yPosition = OFFSET_Y - i;
        if (!BOT_BASED) bp.createEntity(BELT_NAME + 'transport_belt', { x: xPosition, y: yPosition }, Blueprint.UP);

      }
      if (!BOT_BASED && LOAD_FROM_BOTH_SIDES) {
        const distanceToCargoWagon = (l) * 8 + 1;
        for (let i = 0; i < distanceToCargoWagon; i++) {
          const xPosition = OFFSET_X;
          const yPosition = OFFSET_Y - i + LOADING_BAYS;
          bp.createEntity(BELT_NAME + 'transport_belt', { x: xPosition + 8 + LOADING_BAYS, y: yPosition }, Blueprint.UP);
        }
      }
      OFFSET_Y -= distanceToCargoWagon;
      for (let i = 0; i < LOADING_BAYS - l - 1; i++) {
        const xPosition = OFFSET_X + i;
        const yPosition = OFFSET_Y;
        if (!BOT_BASED) bp.createEntity(BELT_NAME + 'transport_belt', { x: xPosition, y: yPosition }, Blueprint.RIGHT);
      }

      if (!BOT_BASED && LOAD_FROM_BOTH_SIDES) {
        for (let i = 0; i < LOADING_BAYS - l - 1; i++) {
          const xPosition = OFFSET_X - l + i;
          const yPosition = OFFSET_Y;
          bp.createEntity(BELT_NAME + 'transport_belt', { x: xPosition + LOADING_BAYS + 9, y: yPosition }, Blueprint.LEFT);
        }



      }
      OFFSET_X += LOADING_BAYS - l - 1;
      const inserterType = USE_STACKER_INSERTER ? (USE_FILTER_INSERTER ? 'stack_filter_inserter' : 'stack_inserter') : (USE_FILTER_INSERTER ?
        'filter_inserter' : 'fast_inserter');
      for (let i = 0; i < 6; i++) {
        const xPosition = OFFSET_X;
        const yPosition = OFFSET_Y - i;
        if (!BOT_BASED) bp.createEntity(BELT_NAME + 'transport_belt', { x: xPosition, y: yPosition }, Blueprint.UP);
        if (!BOT_BASED && LOAD_FROM_BOTH_SIDES) bp.createEntity(BELT_NAME + 'transport_belt', { x: xPosition + 9, y: yPosition }, Blueprint.UP);

        if (i == 0 && l == LOADING_BAYS - 1) {
          bp.createEntity('medium_electric_pole', { x: xPosition + 3, y: yPosition + 1 });
          if (LOAD_FROM_BOTH_SIDES) bp.createEntity('medium_electric_pole', { x: xPosition + 6, y: yPosition + 1 });
        } else if (i == 5) {
          bp.createEntity('medium_electric_pole', { x: xPosition + 3, y: yPosition - 1 });
          if (LOAD_FROM_BOTH_SIDES) bp.createEntity('medium_electric_pole', { x: xPosition + 6, y: yPosition - 1 });
        }
        if (!BOT_BASED) bp.createEntity('fast_inserter', { x: xPosition + 1, y: yPosition }, Blueprint.LEFT); // Grab FROM left
        if (!BOT_BASED && LOAD_FROM_BOTH_SIDES) bp.createEntity('fast_inserter', { x: xPosition + 8, y: yPosition }, Blueprint.RIGHT);

        if (!BOT_BASED) bp.createEntity('steel_chest', { x: xPosition + 2, y: yPosition });
        else bp.createEntity('logistic_chest_requester', { x: xPosition + 2, y: yPosition })
          .setRequestFilter(1, REQUEST_TYPE, REQUEST_AMOUNT);
        if (LOAD_FROM_BOTH_SIDES) {
          if (!BOT_BASED) bp.createEntity('steel_chest', { x: xPosition + 7, y: yPosition });
          else bp.createEntity('logistic_chest_requester', { x: xPosition + 7, y: yPosition })
            .setRequestFilter(1, REQUEST_TYPE, REQUEST_AMOUNT);
        }
        bp.createEntity(inserterType, { x: xPosition + 3, y: yPosition }, Blueprint.LEFT);
        if (LOAD_FROM_BOTH_SIDES) bp.createEntity(inserterType, { x: xPosition + 6, y: yPosition }, Blueprint.RIGHT);
      }
      OFFSET_Y -= 6;
      OFFSET_X += 4;

      if (l == 0) {
        RAIL_X = OFFSET_X;
        trainStopLocation = generateTrainStation(bp, { x: OFFSET_X, y: OFFSET_Y }, START_TO_CARGO + LOADING_BAYS * (LOAD_FROM_BOTH_SIDES ? 2 : 1), {
          LOCOMOTIVES,
          TRACK_CONCRETE,
          SINGLE_HEADED_TRAIN,
          WALL_SPACE,
          WALL_THICKNESS,
          INCLUDE_RADAR
        });

        if (ROBOPORTS) {
          for (let i = 0; i < FINAL_LANES * 2; i++) {
            const xPosition = OFFSET_X + (LOAD_FROM_BOTH_SIDES ? 4 : 2);
            const yPosition = OFFSET_Y - Math.ceil(FINAL_LANES / 2);
            bp.createEntity('roboport', { x: xPosition, y: yPosition + i * 4 });
            if (LOAD_FROM_BOTH_SIDES) bp.createEntity('roboport', { x: xPosition + 4, y: yPosition + i * 4 });
          }
        }
      }
    }

    //place a pole aligned with miners grid to connect miners grid with train station
    const miners_pole_x = (X_LENGTH - 1) * X_SIZE + MINER_SIZE * 2 + 1;
    const miners_pole_y = (Y_LENGTH - 1) * Y_SIZE + MINER_SIZE;
    const station_pole_x = RAIL_X - 1;
    connectPoles_x(bp, miners_pole_x, station_pole_x + 1, miners_pole_y);

  } else {
    trainStopLocation = { x: locationForBalancer.x + (!BOT_BASED ? balancerBlueprint.bottomLeft().y - balancerBlueprint.topLeft().y + 1 : 2) +
        FINAL_LANES, y: locationForBalancer.y - 5 };
  }

  // Place walls and laser turrets

  const lowerX = -2;
  const upperX = trainStopLocation.x + 2 + (ROBOPORTS ? 4 : 0) + (LOAD_FROM_BOTH_SIDES ? LOADING_BAYS : 0);

  const lowerY = Math.min(INCLUDE_RADAR ? -3 : 0, trainStopLocation.y - (SINGLE_HEADED_TRAIN ? Math.max(0, trainStopLocation.y) : 0)) - 1;
  const upperY = Y_LENGTH * Y_SIZE + Math.max(LOADING_BAYS, X_LENGTH) + (LOAD_FROM_BOTH_SIDES ? LOADING_BAYS : 0);

  generateDefenses(bp, { lowerX, upperX, lowerY, upperY }, {
    TURRETS_ENABLED,
    TURRET_SPACING,
    USE_LASER_TURRETS,
    WALL_SPACE,
    WALL_THICKNESS,
    CONCRETE,
    BORDER_CONCRETE
  }); // Pass in same opt, same names for defenses

  bp.fixCenter();
  fixRail(bp);

  if (TRAIN_SIDE == TRAIN_DIRECTION + 1 || (TRAIN_SIDE == 0 && TRAIN_DIRECTION == 3)) {
    bp.entities.forEach(e => {
      if (e.name == 'train_stop') {
        e.position.x = -e.position.x + e.size.x;
        return;
      }
      e.position.x = -e.position.x - e.size.x;
      if (e.direction == 2 || e.direction == 6) {
        e.direction = e.direction == 2 ? 6 : 2;
      }
    });
    bp.tiles.forEach(t => {
      t.position.x = -t.position.x - 1;
    });
    bp.fixCenter({ x: 1, y: 0 });
  }

  const finalBp = new Blueprint();

  finalBp.placeBlueprint(bp, { x: 0, y: 0 }, (TRAIN_DIRECTION + 2) % 4, true);
  finalBp.name = NAME.replace('%drills%', finalBp.entities.filter(e => e.name == MINING_DRILL_NAME).length);

  return finalBp.encode();
}
