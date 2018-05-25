const Blueprint = require('factorio-blueprint');

module.exports = function(bp, { x, y }, highY, { lowerY, LOCOMOTIVES, TRACK_CONCRETE, SINGLE_HEADED_TRAIN, WALL_SPACE, WALL_THICKNESS, INCLUDE_RADAR, INCLUDE_LIGHTS }) {

  const yPosition = y - LOCOMOTIVES * 7;
  const xPosition = x;

  const trainStopLocation = { x: xPosition + 2, y: yPosition };
  bp.createEntity('train_stop', trainStopLocation, Blueprint.UP);
  if(INCLUDE_LIGHTS && !SINGLE_HEADED_TRAIN) {
    bp.createEntity('small_lamp', { x: xPosition, y: yPosition - 1 });
    bp.createEntity('small_lamp', { x: xPosition + 1, y: yPosition - 1 });
    bp.createEntity('medium_electric_pole', { x: xPosition + 1, y: yPosition - 2 });
  }
  const railTarget = highY - trainStopLocation.y + WALL_SPACE + WALL_THICKNESS + 3;
  let i = 0;
  for (; i <= railTarget; i += 2) {
    bp.createEntity('straight_rail', { x: xPosition, y: yPosition + i }, Blueprint.DOWN);
    // Concrete
    if (TRACK_CONCRETE) {
      const UPPER_Y = highY + WALL_SPACE + WALL_THICKNESS + 2;
      for (let xOffset = -1; xOffset <= 2; xOffset++) {
        for (let yOffset = -1; yOffset <= 2; yOffset++) {
          if (yPosition + i + yOffset > UPPER_Y) continue;
          bp.createTile(TRACK_CONCRETE, { x: xPosition + xOffset, y: yPosition + i + yOffset });
        }
      }
    }
  }
  bp.createEntity('straight_rail', { x: xPosition, y: yPosition + i }, Blueprint.DOWN);
  bp.createEntity('rail_signal', { x: xPosition + 2, y: yPosition + i }, Blueprint.DOWN);
  if (TRACK_CONCRETE) {
    const UPPER_Y = highY + WALL_SPACE + WALL_THICKNESS + 2;
    for (let xOffset = -1; xOffset <= 2; xOffset++) {
      for (let yOffset = -1; yOffset <= 2; yOffset++) {
        if (yPosition + i + yOffset > UPPER_Y) continue;
        bp.createTile(TRACK_CONCRETE, { x: xPosition + xOffset, y: yPosition + i + yOffset });
      }
    }
  }
  //poke the gate out
  for (i = i + 2; i <= railTarget + 1 + WALL_SPACE + WALL_THICKNESS; i += 2)
    bp.createEntity('straight_rail', { x: xPosition, y: yPosition + i }, Blueprint.DOWN);
  if (SINGLE_HEADED_TRAIN) {
    const LOWER_Y = typeof lowerY != 'undefined' ? lowerY : Math.min(INCLUDE_RADAR ? -3 : 0, trainStopLocation.y) - 1;
    for (let i = 2; i < (yPosition - LOWER_Y) + WALL_SPACE + 1 + WALL_THICKNESS; i += 2) {
      bp.createEntity('straight_rail', { x: xPosition, y: yPosition - i }, Blueprint.DOWN);
      // Concrete
      if (TRACK_CONCRETE) {
        for (let xOffset = -1; xOffset <= 2; xOffset++) {
          for (let yOffset = -1; yOffset <= 2; yOffset++) {
            if (yPosition - i + yOffset < LOWER_Y - WALL_SPACE) continue;
            bp.createTile(TRACK_CONCRETE, { x: xPosition + xOffset, y: yPosition - i + yOffset });
          }
        }
      }
    }
  }

  return trainStopLocation;
}
