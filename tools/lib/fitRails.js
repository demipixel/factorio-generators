const Blueprint = require('factorio-blueprint');

// Makes the track end at the walls: long enough that every wall row it
// crosses becomes a gate, and no longer. Rails are 2x2, so the last piece
// can stick out of the wall by one tile.
//
// Expects the layout before it is rotated: the track runs along y, trains
// arrive from the high-y side and, with an exit route, leave on the low-y side.
module.exports = function(bp, { lowerY, upperY }, { WALL_SPACE, WALL_THICKNESS, SINGLE_HEADED_TRAIN, TRACK_CONCRETE }) {
  const rails = () => bp.entities.filter(e => e.name == 'straight_rail');
  if (!rails().length) return;

  const x = rails()[0].position.x;
  // Without walls the track still ends where the first wall row would be
  const rows = Math.max(WALL_THICKNESS, 1);
  const outerEntryRow = upperY + WALL_SPACE + rows - 1;
  const outerExitRow = lowerY - WALL_SPACE - rows + 1;

  const addRail = y => {
    bp.createEntity('straight_rail', { x, y }, Blueprint.DOWN);
    if (!TRACK_CONCRETE) return;
    for (let xOffset = -1; xOffset <= 2; xOffset++) {
      for (let yOffset = -1; yOffset <= 2; yOffset++) {
        const tileY = y + yOffset;
        if (tileY > outerEntryRow || tileY < outerExitRow) continue;
        bp.createTile(TRACK_CONCRETE, { x: x + xOffset, y: tileY });
      }
    }
  };

  // Entry side: a piece is needed if its first tile is at or before the last wall row
  rails().filter(e => e.position.y > outerEntryRow).forEach(e => bp.removeEntity(e));
  let last = Math.max(...rails().map(e => e.position.y));
  while (last + 2 <= outerEntryRow) {
    last += 2;
    addRail(last);
  }

  if (SINGLE_HEADED_TRAIN) {
    // Exit side: a piece is needed if its second tile reaches the last wall row
    rails().filter(e => e.position.y + 1 < outerExitRow).forEach(e => bp.removeEntity(e));
    let first = Math.min(...rails().map(e => e.position.y));
    while (first > outerExitRow) {
      first -= 2;
      addRail(first);
    }
  }

  // Track tiles that were laid for rails which are gone now
  if (TRACK_CONCRETE) {
    bp.tiles
      .filter(t => t.position.y > outerEntryRow || (SINGLE_HEADED_TRAIN && t.position.y < outerExitRow))
      .forEach(t => bp.removeTile(t));
  }

  // Keep the signal inside the walls, as close to the gate as there is room
  // for. The rows just behind the wall are left to the turrets and their poles.
  // The layout may be mirrored later, which moves the signal to the other
  // side of the track, so both sides have to be free.
  const signal = bp.entities.find(e => e.name == 'rail_signal');
  if (signal) {
    const direction = signal.direction;
    const innerEntryRow = upperY + WALL_SPACE;
    const inside = rails().map(e => e.position.y).filter(y => y + 1 < innerEntryRow).sort((a, b) => b - a);
    const spots = inside.filter(y => y + 5 < innerEntryRow).concat(inside);
    bp.removeEntity(signal);
    for (const y of spots) {
      if (bp.findEntity({ x: x + 2, y }) || bp.findEntity({ x: x - 1, y })) continue;
      bp.createEntity('rail_signal', { x: x + 2, y }, direction);
      break;
    }
  }
};
