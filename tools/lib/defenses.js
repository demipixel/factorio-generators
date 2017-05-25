const Blueprint = require('factorio-blueprint');

module.exports = function(bp, {lowerX, upperX, lowerY, upperY}, {TURRETS_ENABLED, TURRET_SPACING, USE_LASER_TURRETS, WALLS_ENABLED, WALL_SPACE, WALL_THICKNESS, CONCRETE, BORDER_CONCRETE}) {

  function generateTurret(isX, variable, upper, placePowerpole) {
    const sign = upper ? 1 : -1;
    const yPosition = isX ?
                        ((upper ? upperY : lowerY - 1) + WALL_SPACE*sign - 3*sign) :
                        variable;
    const xPosition = isX ?
                        (variable) :
                        (upper ? upperX : lowerX - 1) + WALL_SPACE*sign - 3*sign;

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
    for (let x = lowerX - WALL_SPACE + 3; x <= upperX + WALL_SPACE - 3; x++) {
      const placePowerpole = TURRET_SPACING <= 4 ? x % (TURRET_SPACING * 2) == 0 : true;
      if (x % TURRET_SPACING == 0) {
        generateTurret(true, x, false, placePowerpole);
        generateTurret(true, x, true, placePowerpole);
      }
    }

    for (let y = lowerY - WALL_SPACE + 1 + 3; y < upperY + WALL_SPACE - 3; y++) {
      const placePowerpole = TURRET_SPACING <= 4 ? y % (TURRET_SPACING * 2) == 0 : true;
      if (y % TURRET_SPACING == 0) {
        generateTurret(false, y, false, placePowerpole);
        generateTurret(false, y, true, placePowerpole);
      }
    }
  }

  if (WALLS_ENABLED) {
    for (let i = 0; i < WALL_THICKNESS; i++) {
      for (let x = lowerX - WALL_SPACE - i; x <= upperX + WALL_SPACE + i; x++) {
        const ent1 = bp.findEntity({ x: x, y: lowerY - WALL_SPACE - i });
        const ent2 = bp.findEntity({ x: x, y: upperY + WALL_SPACE + i });
        if (!ent1 || ent1.name == 'straight_rail') bp.createEntity(ent1 ? 'gate' : 'stone_wall', { x: x, y: lowerY - WALL_SPACE - i }, Blueprint.RIGHT, true);
        if (!ent2 || ent2.name == 'straight_rail') bp.createEntity(ent2 ? 'gate' : 'stone_wall', { x: x, y: upperY + WALL_SPACE + i }, Blueprint.RIGHT, true);
      }
      for (let y = lowerY - WALL_SPACE - i; y <= upperY + WALL_SPACE + i; y++) {
        const ent1 = bp.findEntity({ x: lowerX - WALL_SPACE - i, y: y });
        const ent2 = bp.findEntity({ x: upperX + WALL_SPACE + i, y: y });
        if (!ent1 || ent1.name == 'straight_rail') bp.createEntity(ent1 ? 'gate' : 'stone_wall', { x: lowerX - WALL_SPACE - i, y: y }, Blueprint.DOWN, true);
        if (!ent2 || ent2.name == 'straight_rail') bp.createEntity(ent2 ? 'gate' : 'stone_wall', { x: upperX + WALL_SPACE + i, y: y }, Blueprint.DOWN, true);
      }
    }
  }

  for (let y = lowerY - WALL_SPACE - WALL_THICKNESS + 1; y <= upperY + WALL_SPACE + WALL_THICKNESS - 1; y++) {
    for (let x = lowerX - WALL_SPACE - WALL_THICKNESS + 1; x <= upperX + WALL_SPACE + WALL_THICKNESS - 1; x++) {
      if (BORDER_CONCRETE && (y - lowerY + WALL_SPACE + WALL_THICKNESS <= WALL_THICKNESS + 1 || upperY + WALL_SPACE + WALL_THICKNESS - y <= WALL_THICKNESS + 1 || x - lowerX + WALL_SPACE + WALL_THICKNESS <= WALL_THICKNESS + 1 || upperX + WALL_SPACE + WALL_THICKNESS - x <= WALL_THICKNESS + 1)) {
        bp.createTile(BORDER_CONCRETE, { x: x, y: y});
      } else if (CONCRETE && !bp.findTile({ x: x, y: y })) {
        bp.createTile(CONCRETE, { x: x, y: y });
      }
    }
  }
}