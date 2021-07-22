module.exports = function(bp) {
  const firstRail = bp.entities.filter(e => e.name == 'straight_rail')[0];

  if (firstRail) {
    let { x, y } = firstRail.position;
    x -= 0.5;
    y -= 0.5;
    if (x < 0) x += Math.ceil(-x / 2) * 2;
    if (y < 0) y += Math.ceil(-y / 2) * 2;
    x %= 2;
    y %= 2;
    bp.fixCenter({ x, y }); // Move center some amount between 0 and 2 so rails snap correctly
  }
}
