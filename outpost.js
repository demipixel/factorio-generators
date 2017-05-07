const Blueprint = require('factorio-blueprint');



const BALANCER = {
  1: '0eNqFjs0KgzAQhN9lzhGs2h/yKqUUbZeyoJuQrEWRvHsTe+mtl4VZZj6+DcM4kw8sCruBH04i7HVD5Jf0Y/np6gkWrDTBQPqpJFp8oBgrDb1E74JWA42KZMDypAX2kG4GJMrK9CXuYb3LPA0UcuEfy8C7mOdOikVG1gZrvqmQdxv7I2/wphD38qnrmmPdtufmktIHq6tMlw==',
  2: '0eNp1jsEKg0AQQ/8l57VoUaHzK6UUbYcyoOOyOxZF9t/r2ksvPSYkL9nQDzP7IGqgDfKYNIKuG6K8tBuyZ6tnEMR4hIN2Y1a8+MAxFtEPYsYByUH0yQuoSjcHVhMT/rIOsd51Hvs9SdV/ioOf4l6cNC/vsKI8NQ4rqEwZe5ygn88Obw7xyLd1fa4v5blt2pQ+qhFIlw==',
  4: '0eNqdlt1uwyAMhd/F13TChKRtXmWapv6gCiklCMjUqsq7jzTqVq1ul/gKkYSPg4+Nc4Ft0xkfrEtQX8DuWhehfr9AtAe3aYZn6ewN1GCTOYIAtzkOM3PywcS4SGHjom9DWmxNk6AXYN3enKDGXkyGRN/YlEy4W676DwHGJZusGQVdJ+dP1x23+csa/5MiwLcxL2/dsH9GLpSAcx6KfpD2B6eei3oE4Vs5ojSFKh5QXT5TOIQ2j8+04U2buIWq7ZLvhog+bKAZG8gZ/HJGLOTLUFSzTcIXHi3ZlisKt5pj+c85kUKt5yvDmzIBexvMbnxXEXCUs+mShCsKjlyLyJii4nokJ2gtuHDSNNRc1ySJK/l1j79lad2TqsSKmQa02iX7EpkkdsVMKzmhHtZMNpkFSnKTiiwAhZxGQrckxbmgaFUF40qnRWlm8LOu3NGv/b++++cQ8GVCHL3WWum1VFVZ9f032HrobA==',
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

module.exports = function(string, opt) {

  opt = opt || {};

  // Directions
  const MINE_ORE_DIRECTION = useOrDefault(opt.minedOreDirection, 2);
  const ORE_EXIT_DIRECTION = useOrDefault(opt.trainDirection, 1);

  // General
  const SPACE_BETWEEN_MINERS = useOrDefault(opt.minerSpace, 1);
  const MINING_DRILL_NAME = opt.miningDrillName || 'electric_mining_drill';
  const USE_STACKER_INSERTER = opt.useStackInserters != undefined ? !!opt.useStackInserters : true;
  const INCLUDE_RADAR = opt.includeRadar != undefined ? opt.includeRadar : true;

  // Defenses
  const TURRETS_ENABLED = opt.turrets != undefined ? opt.turrets : true;
  const TURRET_SPACING = useOrDefault(opt.turretSpacing, 8);
  const USE_LASER_TURRETS = opt.laserTurrets == undefined ? true : !!opt.laserTurrets;

  const WALLS_ENABLED = opt.walls != undefined ? !!opt.walls : true;
  const WALL_SPACE = useOrDefault(opt.wallSpace, 5);
  const WALL_THICKNESS = useOrDefault(opt.wallThickness, 1);

  // Trains
  const LOCOMOTIVES = useOrDefault(opt.locomotiveCount, 2);
  const FINAL_LANES = useOrDefault(opt.cargoWagonCount, 4);
  const SINGLE_HEADED_TRAIN = opt.exitRoute || false;

  // Bot info
  const BOT_BASED = opt.botBased || false;
  const REQUEST_TYPE = opt.requestItem || 'iron_ore';
  const REQUEST_AMOUNT = useOrDefault(opt.requestAmount, 4800);

  // Tiles
  const CONCRETE = opt.concrete || '';
  const BORDER_CONRETE = opt.borderConcrete || '';
  const TRACK_CONCRETE = opt.trackConcrete || '';

  // Belt shenanigans
  const UNDERGROUND_BELT = !!opt.undergroundBelts || false;
  let BELT_NAME = (opt.beltName || '').replace('transport_belt', '');
  if (BELT_NAME.length > 0 && BELT_NAME[BELT_NAME.length - 1] != '_') BELT_NAME += '_';

  const newEntityData = {};
  newEntityData[REQUEST_TYPE] = { type: 'item' };
  newEntityData[BELT_NAME+'transport_belt'] = { type: 'item', width: 1, height: 1 };
  newEntityData[BELT_NAME+'splitter'] = { type: 'item', width: 1, height: 1 };
  newEntityData[BELT_NAME+'underground_belt'] = { type: 'item', width: 1, height: 1, directionType: true };
  if (CONCRETE) newEntityData[CONCRETE] = { type: 'tile' }
  if (BORDER_CONRETE && !newEntityData[BORDER_CONRETE]) newEntityData[BORDER_CONRETE] = { type: 'tile' }
  if (TRACK_CONCRETE && !newEntityData[TRACK_CONCRETE]) newEntityData[TRACK_CONCRETE] = { type: 'tile' }
  Blueprint.setEntityData(newEntityData);

  const PROVIDED_BALANCER = opt.balancer;

  if (!PROVIDED_BALANCER && !BALANCER[FINAL_LANES] && !BOT_BASED) {
    throw new Error('I don\'t have a '+FINAL_LANES+'x'+FINAL_LANES+' balancer available, so you must provide the blueprint string for one. Use express belt and have it face upwards.');
  }



  if (Math.abs(MINE_ORE_DIRECTION - ORE_EXIT_DIRECTION) % 2 == 0 && !BOT_BASED) {
    throw new Error('Ore Exit direction must be perpendicular to Mine Ore direction.');
  }

  let templateBlueprint = null;

  try {
    templateBlueprint = new Blueprint(string);
  } catch (e) {
    throw new Error('Error loading blueprint: '+e.message);
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
    y: Math.max(templateBlueprint.entities[0].position.y, templateBlueprint.entities[1].position.y) ,
  };

  if (bottomRight.x - topLeft.x < 3 || bottomRight.y - topLeft.y < 3) {
    throw new Error('Template size must be at least 5x5!');
  }

  const size = {
    x: MINE_ORE_DIRECTION % 2 == 0 ? bottomRight.x - topLeft.x : bottomRight.y - topLeft.y,
    y: MINE_ORE_DIRECTION % 2 == 1 ? bottomRight.x - topLeft.x : bottomRight.y - topLeft.y
  };

  const bp = new Blueprint();

  const MINER_SIZE = 3;
  const Y_SIZE = (MINER_SIZE + SPACE_BETWEEN_MINERS)*2;
  const X_SIZE = (MINER_SIZE + 1)*2;

  let balancerBlueprint = null;

  if (!BOT_BASED) {
    balancerBlueprint = new Blueprint(PROVIDED_BALANCER || BALANCER[FINAL_LANES]);

    balancerBlueprint.entities.forEach(ent => {
      if (ent.name.includes('transport_belt')) ent.name = BELT_NAME+'transport_belt';
      else if (ent.name.includes('underground_belt')) ent.name = BELT_NAME+'underground_belt';
      else if (ent.name.includes('splitter')) ent.name = BELT_NAME+'splitter';
    });

    const balancerOffsetX = 0;
    const balancerOffsetY = 0;

    balancerBlueprint.fixCenter(balancerBlueprint.bottomLeft().subtract({ x: balancerOffsetX, y: balancerOffsetY }));
  }

  const X_LENGTH = Math.ceil(size.x/X_SIZE);
  const Y_LENGTH = Math.ceil(size.y/Y_SIZE);

  let locationForBalancer = null;

  if (INCLUDE_RADAR) bp.createEntity('radar', { x: 0, y: -3 });

  // Place miners, belts, and merger splitters
  for (let x = 0; x < X_LENGTH; x++) {
    const OFFSET_X = x*X_SIZE;
    for (let y = 0; y < Y_LENGTH; y++) {
      const OFFSET_Y = y*Y_SIZE;

      bp.createEntity(MINING_DRILL_NAME, { x: OFFSET_X,                  y: OFFSET_Y }, Blueprint.RIGHT);
      bp.createEntity(MINING_DRILL_NAME, { x: OFFSET_X,                  y: OFFSET_Y + MINER_SIZE + SPACE_BETWEEN_MINERS }, Blueprint.RIGHT);
      bp.createEntity(MINING_DRILL_NAME, { x: OFFSET_X + MINER_SIZE + 1, y: OFFSET_Y }, Blueprint.LEFT);
      bp.createEntity(MINING_DRILL_NAME, { x: OFFSET_X + MINER_SIZE + 1, y: OFFSET_Y + MINER_SIZE + SPACE_BETWEEN_MINERS }, Blueprint.LEFT);
      bp.createEntity('medium_electric_pole', { x: OFFSET_X - 1, y: OFFSET_Y + MINER_SIZE });

      if (x == X_LENGTH - 1) {
        bp.createEntity('medium_electric_pole', { x: OFFSET_X + MINER_SIZE*2 + 1, y: OFFSET_Y + MINER_SIZE });
      }

      if (!BOT_BASED) {
        if (!UNDERGROUND_BELT) {
          for (let i = 0; i < Y_SIZE; i++) {
            bp.createEntity(BELT_NAME+'transport_belt', { x: OFFSET_X + MINER_SIZE, y: OFFSET_Y + i }, Blueprint.DOWN);
          }
        } else {
          for (let i = 0; i < 2; i++) {
            const secondaryOffset = i*(SPACE_BETWEEN_MINERS + MINER_SIZE);
            const lastOffset = y == Y_LENGTH - 1 && i == 1 ? -1 : 0;
            bp.createEntity(BELT_NAME+'underground_belt', { x: OFFSET_X + MINER_SIZE, y: OFFSET_Y + 1 + secondaryOffset }, Blueprint.DOWN)
              .setDirectionType('input');
            bp.createEntity(BELT_NAME+'underground_belt', { x: OFFSET_X + MINER_SIZE, y: OFFSET_Y + SPACE_BETWEEN_MINERS + MINER_SIZE + secondaryOffset + lastOffset }, Blueprint.DOWN)
              .setDirectionType('output');
          }
        }
      } else {
        for (let i = 0; i < 2; i++) {
          bp.createEntity('logistic_chest_passive_provider', { x: OFFSET_X + MINER_SIZE, y: OFFSET_Y + 1 + i*(SPACE_BETWEEN_MINERS + MINER_SIZE) })
            .setBar(1);
        }
      }
    }
    const distanceOut = X_LENGTH - x - 1;
    
    const connectWithSplitter = Math.floor(x*FINAL_LANES/X_LENGTH) == Math.floor((x+1)*FINAL_LANES/X_LENGTH);
    const finalLane = FINAL_LANES >= X_LENGTH ? X_LENGTH - x - 1 : FINAL_LANES - Math.floor(x*FINAL_LANES/X_LENGTH) - 1;

    for (let i = 0; i < distanceOut; i++) { // Go out, before going across
      const xPosition = OFFSET_X + MINER_SIZE;
      const yPosition = Y_LENGTH*Y_SIZE + i;
      if (!BOT_BASED) bp.createEntity(BELT_NAME+'transport_belt', { x: xPosition, y: yPosition }, Blueprint.DOWN);
    }
    const cutInEarly = distanceOut == 0 ? 0 : X_SIZE - finalLane;
    const acrossDistance = (connectWithSplitter ? X_SIZE : distanceOut*X_SIZE - cutInEarly) + 2; // Go across (either to hit splitter or go to balancer)

    for (let i = 0; i < acrossDistance; i++) {
      const xPosition = OFFSET_X + MINER_SIZE + i; // Just getting the sign from direction data's x/y
      const yPosition = Y_LENGTH*Y_SIZE + distanceOut;
      if (!bp.findEntity({ x: xPosition, y: yPosition })) {
        if (!BOT_BASED) bp.createEntity(BELT_NAME+'transport_belt', { x: xPosition, y: yPosition }, Blueprint.RIGHT);

        if (distanceOut == 0) locationForBalancer = { x: xPosition, y: yPosition };
      }
    }
    if (connectWithSplitter) { // Generate spliiter
      const xPosition = OFFSET_X + MINER_SIZE + X_SIZE + 1
      const yPosition = Y_LENGTH*Y_SIZE + distanceOut - 1
      bp.removeEntityAtPosition({ x: xPosition, y: yPosition }); // Remove belts at splitter
      bp.removeEntityAtPosition({ x: xPosition, y: yPosition + 1 });
      if (!BOT_BASED) bp.createEntity(BELT_NAME+'splitter', { x: xPosition, y: yPosition }, Blueprint.RIGHT);
    } else { // Generate "lowering" to meet other belts
      for (let i = 0; i < distanceOut - finalLane; i++) {
        const xPosition = OFFSET_X + MINER_SIZE + acrossDistance;
        const yPosition = Y_LENGTH*Y_SIZE + distanceOut - i;
        if (!BOT_BASED) bp.createEntity(BELT_NAME+'transport_belt', { x: xPosition, y: yPosition }, Blueprint.UP);
      }
      
      for (let i = 0; i < cutInEarly + Math.max(1, FINAL_LANES - X_SIZE) + (FINAL_LANES <= 2 ? 1 : 0); i++) {
        const xPosition = OFFSET_X + MINER_SIZE + acrossDistance + i;
        const yPosition = Y_LENGTH*Y_SIZE + finalLane;
        if (!BOT_BASED) bp.createEntity(BELT_NAME+'transport_belt', { x: xPosition, y: yPosition }, Blueprint.RIGHT);

        if (distanceOut == 0) locationForBalancer = { x: xPosition, y: yPosition };
      }
    }
  }

  // Place balancer
  if (!BOT_BASED) bp.placeBlueprint(balancerBlueprint, locationForBalancer, Blueprint.RIGHT/2);

  let needShift = {
    x: 0,
    y: 0
  };

  let trainStopLocation = null;

  // Generate lanes to cargo wagons, track, and train stop
  for (let l = 0; l < FINAL_LANES; l++) {
    let OFFSET_Y = locationForBalancer.y + l;
    let OFFSET_X = locationForBalancer.x + (!BOT_BASED ? balancerBlueprint.bottomLeft().y - balancerBlueprint.topLeft().y + 1 : 2);
    const START_TO_CARGO = OFFSET_Y;

    for (let i = 0; i < l; i++) {
      const xPosition = OFFSET_X + i;
      const yPosition = OFFSET_Y;
      if (!BOT_BASED) bp.createEntity(BELT_NAME+'transport_belt', { x: xPosition, y: yPosition }, Blueprint.RIGHT);
    }
    OFFSET_X += l;

    const distanceToCargoWagon = (FINAL_LANES - l - 1)*6;
    for (let i = 0; i < distanceToCargoWagon; i++) {
      const xPosition = OFFSET_X;
      const yPosition = OFFSET_Y - i;
      if (!BOT_BASED) bp.createEntity(BELT_NAME+'transport_belt', { x: xPosition, y: yPosition }, Blueprint.UP);
    }
    OFFSET_Y -= distanceToCargoWagon;
    for (let i = 0; i < FINAL_LANES-l - 1; i++) {
      const xPosition = OFFSET_X + i;
      const yPosition = OFFSET_Y;
      if (!BOT_BASED) bp.createEntity(BELT_NAME+'transport_belt', { x: xPosition, y: yPosition }, Blueprint.RIGHT);
    }
    OFFSET_X += FINAL_LANES-l - 1;
    for (let i = 0; i < 6; i++) {
      const xPosition = OFFSET_X;
      const yPosition = OFFSET_Y - i;
      if (!BOT_BASED) bp.createEntity(BELT_NAME+'transport_belt', { x: xPosition, y: yPosition }, Blueprint.UP);

      if (i == 0 && l == FINAL_LANES-1) {
        bp.createEntity('medium_electric_pole', { x: xPosition + 3, y: yPosition + 1 });
      } else if (i == 5) {
        bp.createEntity('medium_electric_pole', { x: xPosition + 3, y: yPosition - 1 });
      }
      if (!BOT_BASED) bp.createEntity('fast_inserter', { x: xPosition + 1, y: yPosition }, Blueprint.LEFT); // Grab FROM left
      if (!BOT_BASED) bp.createEntity('steel_chest', { x: xPosition + 2, y: yPosition });
      else bp.createEntity('logistic_chest_requester', { x: xPosition + 2, y: yPosition })
             .setRequestFilter(1, REQUEST_TYPE, REQUEST_AMOUNT);
      bp.createEntity(USE_STACKER_INSERTER ? 'stack_inserter' : 'fast_inserter', { x: xPosition + 3, y: yPosition }, Blueprint.LEFT);
    }
    OFFSET_Y -= 6;
    OFFSET_X += 4;

    if (l == 0) {
      const yPosition = OFFSET_Y - LOCOMOTIVES*7;
      const xPosition = OFFSET_X;

      needShift.x = (xPosition + 0.5) % 2; // +1 because the rail grid is based of 0,0 being the center
      needShift.y = (yPosition + 0.5) % 2;
      
      trainStopLocation = { x: xPosition + 2, y: yPosition };
      bp.createEntity('train_stop', trainStopLocation, Blueprint.UP);
      for (let i = 0; i <= (START_TO_CARGO - yPosition) + FINAL_LANES + WALL_SPACE + 2 + WALL_THICKNESS; i += 2) {
        bp.createEntity('straight_rail', { x: xPosition, y: yPosition + i }, Blueprint.DOWN);
        if (TRACK_CONCRETE) {
          const UPPER_Y = Y_LENGTH*Y_SIZE + Math.max(FINAL_LANES, X_LENGTH);
          for (let xOffset = -1; xOffset <= 2; xOffset++) {
            for (let yOffset = -1; yOffset <= 2; yOffset++) {
              if (yPosition + i + yOffset > UPPER_Y + WALL_SPACE) continue;
              bp.createTile(TRACK_CONCRETE, { x: xPosition + xOffset, y: yPosition + i + yOffset });
            }
          }
        }
      }
      if (SINGLE_HEADED_TRAIN) {
        const LOWER_Y = Math.min(INCLUDE_RADAR ? -3 : 0, trainStopLocation.y - (SINGLE_HEADED_TRAIN ? Math.max(0, trainStopLocation.y) : 0)) - 1;
        for (let i = 2; i < (yPosition - LOWER_Y) + WALL_SPACE + 4; i += 2) {
          bp.createEntity('straight_rail', { x: xPosition, y: yPosition - i }, Blueprint.DOWN);
          if (TRACK_CONCRETE) {
            for (let xOffset = -1; xOffset <= 1; xOffset++) {
              for (let yOffset = -1; yOffset <= 1; yOffset++) {
                if (yPosition - i + yOffset < LOWER_Y - WALL_SPACE) continue;
                bp.createTile(TRACK_CONCRETE, { x: xPosition + xOffset, y: yPosition - i + yOffset });
              }
            }
          }
        }
      }
    }
  }

  // Place walls and laser turrets

  const LOWER_X = -2;
  const UPPER_X = trainStopLocation.x + 2;

  const LOWER_Y = Math.min(INCLUDE_RADAR ? -3 : 0, trainStopLocation.y - (SINGLE_HEADED_TRAIN ? Math.max(0, trainStopLocation.y) : 0)) - 1;
  const UPPER_Y = Y_LENGTH*Y_SIZE + Math.max(FINAL_LANES, X_LENGTH);

  function generateTurret(isX, variable, upper, placePowerpole) {
    const sign = upper ? 1 : -1;
    const yPosition = isX ?
                        ((upper ? UPPER_Y : LOWER_Y - 1) + WALL_SPACE*sign - 3*sign) :
                        variable;
    const xPosition = isX ?
                        (variable) :
                        (upper ? UPPER_X : LOWER_X - 1) + WALL_SPACE*sign - 3*sign;

    let dir = isX ? (upper ? Blueprint.DOWN : Blueprint.UP) : (upper ? Blueprint.RIGHT : Blueprint.LEFT);

    try {
      bp.createEntity(USE_LASER_TURRETS ? 'laser_turret' : 'gun_turret', { x: xPosition, y: yPosition }, dir);
    } catch (e) {}
    // Try to generate power poles anyway so that they can connect
    if (USE_LASER_TURRETS && placePowerpole) {
      const movePowerpoleBehind = (TURRET_SPACING == 2 ? (upper ? -1 : 2) : 0);
      try {
        const OFFSET_Y = isX ? movePowerpoleBehind : -1;
        const OFFSET_X = isX ? -1 : movePowerpoleBehind;
        bp.createEntity('medium_electric_pole', { x: xPosition + OFFSET_X, y: yPosition + OFFSET_Y });
      } catch (e) {
        const OFFSET_Y = isX ? movePowerpoleBehind : 2;
        const OFFSET_X = isX ? 2 : movePowerpoleBehind;
        bp.createEntity('medium_electric_pole', { x: xPosition + OFFSET_X, y: yPosition + OFFSET_Y });
      }
    }
  }

  if (TURRETS_ENABLED) {
    for (let x = LOWER_X - WALL_SPACE + 3; x <= UPPER_X + WALL_SPACE - 3; x++) {
      const placePowerpole = TURRET_SPACING <= 4 ? x % (TURRET_SPACING * 2) == 0 : true;
      if (x % TURRET_SPACING == 0) {
        generateTurret(true, x, false, placePowerpole);
        generateTurret(true, x, true, placePowerpole);
      }
    }

    for (let y = LOWER_Y - WALL_SPACE + 1 + 3; y < UPPER_Y + WALL_SPACE - 3; y++) {
      const placePowerpole = TURRET_SPACING <= 4 ? y % (TURRET_SPACING * 2) == 0 : true;
      if (y % TURRET_SPACING == 0) {
        generateTurret(false, y, false, placePowerpole);
        generateTurret(false, y, true, placePowerpole);
      }
    }
  }

  if (WALLS_ENABLED) {
    for (let i = 0; i < WALL_THICKNESS; i++) {
      for (let x = LOWER_X - WALL_SPACE - i; x <= UPPER_X + WALL_SPACE + i; x++) {
        const ent1 = bp.findEntity({ x: x, y: LOWER_Y - WALL_SPACE - i });
        const ent2 = bp.findEntity({ x: x, y: UPPER_Y + WALL_SPACE + i });
        if (!ent1 || ent1.name == 'straight_rail') bp.createEntity(ent1 ? 'gate' : 'stone_wall', { x: x, y: LOWER_Y - WALL_SPACE - i }, Blueprint.RIGHT, true);
        if (!ent2 || ent2.name == 'straight_rail') bp.createEntity(ent2 ? 'gate' : 'stone_wall', { x: x, y: UPPER_Y + WALL_SPACE + i }, Blueprint.RIGHT, true);
      }
      for (let y = LOWER_Y - WALL_SPACE - i; y <= UPPER_Y + WALL_SPACE + i; y++) {
        const ent1 = bp.findEntity({ x: LOWER_X - WALL_SPACE - i, y: y });
        const ent2 = bp.findEntity({ x: UPPER_X + WALL_SPACE + i, y: y });
        if (!ent1 || ent1.name == 'straight_rail') bp.createEntity(ent1 ? 'gate' : 'stone_wall', { x: LOWER_X - WALL_SPACE - i, y: y }, Blueprint.DOWN, true);
        if (!ent2 || ent2.name == 'straight_rail') bp.createEntity(ent2 ? 'gate' : 'stone_wall', { x: UPPER_X + WALL_SPACE + i, y: y }, Blueprint.DOWN, true);
      }
    }
  }

  for (let y = LOWER_Y - WALL_SPACE - WALL_THICKNESS + 1; y <= UPPER_Y + WALL_SPACE + WALL_THICKNESS - 1; y++) {
    for (let x = LOWER_X - WALL_SPACE - WALL_THICKNESS + 1; x <= UPPER_X + WALL_SPACE + WALL_THICKNESS - 1; x++) {
      if (BORDER_CONRETE && (y - LOWER_Y + WALL_SPACE + WALL_THICKNESS <= WALL_THICKNESS + 1 || UPPER_Y + WALL_SPACE + WALL_THICKNESS - y <= WALL_THICKNESS + 1 || x - LOWER_X + WALL_SPACE + WALL_THICKNESS <= WALL_THICKNESS + 1 || UPPER_X + WALL_SPACE + WALL_THICKNESS - x <= WALL_THICKNESS + 1)) {
        bp.createTile(BORDER_CONRETE, { x: x, y: y});
      } else if (CONCRETE && !bp.findTile({ x: x, y: y })) {
        bp.createTile(CONCRETE, { x: x, y: y });
      }
    }
  }

  bp.fixCenter();
  bp.fixCenter(needShift); // Move center some amount between 0 and 2 so rails snap correctly

  if (ORE_EXIT_DIRECTION > MINE_ORE_DIRECTION || (ORE_EXIT_DIRECTION == 0 && MINE_ORE_DIRECTION == 3)) {
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
    bp.fixCenter({ x: 1, y: 0 });
  }

  const final = new Blueprint();

  final.placeBlueprint(bp, { x: 0, y: 0 }, (MINE_ORE_DIRECTION+2)%4, true);

  return final.encode();
}