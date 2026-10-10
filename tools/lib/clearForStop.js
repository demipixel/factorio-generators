// In a mirrored layout the train stop does not mirror with the track: it
// changes to the other side of it, where it belongs for an arriving train.
// This clears the tiles it will land on of lamps and poles, the only things
// the generators put there, and returns those tiles so nothing new is built
// on them. Call it before the layout is mirrored and before lib/power.js
// runs, which makes up for whatever is removed.
const IN_THE_WAY = ['small_lamp', 'medium_electric_pole'];

module.exports = function(bp) {
  const stop = bp.entities.find(ent => ent.name == 'train_stop');
  if (!stop) return [];

  // Two tiles of track lie between where the stop is and where it will be
  const landing = { x: stop.position.x - stop.size.x - 2, y: stop.position.y };
  const tiles = [];
  for (let dx = 0; dx < stop.size.x; dx++) {
    for (let dy = 0; dy < stop.size.y; dy++) {
      const tile = { x: landing.x + dx, y: landing.y + dy };
      const ent = bp.findEntity(tile);
      if (ent && IN_THE_WAY.indexOf(ent.name) != -1) bp.removeEntity(ent);
      tiles.push(tile);
    }
  }
  return tiles;
};
