// Lays the pipes that join every pumpjack to the trunk.
//
// The network grows one pumpjack at a time: whichever pumpjack is cheapest
// to reach from the pipes laid so far is joined next, along the cheapest
// path. That keeps the total length close to the least possible (it is the
// usual shortest-path approximation of a Steiner tree), and it does not
// depend on the order the pumpjacks happen to be in.
//
// A path costs its length plus a little for every turn. Straight runs are
// what can go underground, so the more that matters, the more a turn costs.

const STEPS = [
  { x: 1, y: 0, cost: 0.99 }, // sideways is a touch cheaper, so pipes head for the trunk first
  { x: -1, y: 0, cost: 0.99 },
  { x: 0, y: 1, cost: 1 },
  { x: 0, y: -1, cost: 1 }
];

// A small binary heap of [cost, state]
function Queue() {
  const items = [];
  return {
    get length() { return items.length; },
    push(item) {
      let i = items.push(item) - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (items[parent][0] <= items[i][0]) break;
        [items[parent], items[i]] = [items[i], items[parent]];
        i = parent;
      }
    },
    pop() {
      const top = items[0];
      const last = items.pop();
      if (items.length) {
        items[0] = last;
        for (let i = 0; ;) {
          const left = i * 2 + 1;
          const right = left + 1;
          let least = i;
          if (left < items.length && items[left][0] < items[least][0]) least = left;
          if (right < items.length && items[right][0] < items[least][0]) least = right;
          if (least == i) break;
          [items[least], items[i]] = [items[i], items[least]];
          i = least;
        }
      }
      return top;
    }
  };
}

// outputs: the tile in front of each pumpjack where its pipe has to start.
// trunk: the tile every pipe has to lead to. area: left, right, top and
// bottom of where pipes may go.
module.exports = function(bp, { outputs, trunk, area, turnCost }) {
  // The area as a grid of tiles, and a search state as a tile plus the way
  // the pipe was heading when it got there (NONE on a tile of the network)
  const width = area.right - area.left + 1;
  const height = area.bottom - area.top + 1;
  const NONE = STEPS.length;
  const tileOf = ({ x, y }) => (y - area.top) * width + (x - area.left);
  const positionOf = tile => ({ x: area.left + tile % width, y: area.top + Math.floor(tile / width) });

  const blocked = new Uint8Array(width * height);
  for (let tile = 0; tile < width * height; tile++) blocked[tile] = bp.findEntity(positionOf(tile)) ? 1 : 0;
  const isPipe = new Uint8Array(width * height);
  const network = [];
  const lay = tile => {
    if (isPipe[tile]) return;
    isPipe[tile] = 1;
    network.push(tile);
    bp.createEntity('pipe', positionOf(tile));
  };

  const wanted = new Uint8Array(width * height);
  const best = new Float64Array(width * height * (NONE + 1));
  const cameFrom = new Int32Array(width * height * (NONE + 1));
  const trunkTile = tileOf(trunk);
  let waiting = outputs.map(tileOf);

  while (waiting.length) {
    wanted.fill(0);
    waiting.forEach(tile => (wanted[tile] = 1));
    best.fill(Infinity);

    // Cheapest way from the network (or, before there is one, the trunk) to any waiting pumpjack
    const queue = Queue();
    (network.length ? network : [trunkTile]).forEach(tile => {
      const state = tile * (NONE + 1) + NONE;
      best[state] = 0;
      cameFrom[state] = -1;
      queue.push([0, state]);
    });

    let arrived = -1;
    while (queue.length) {
      const [cost, state] = queue.pop();
      if (cost > best[state]) continue;
      const tile = Math.floor(state / (NONE + 1));
      const heading = state % (NONE + 1);
      if (wanted[tile]) {
        arrived = state;
        break;
      }
      const x = tile % width;
      const y = Math.floor(tile / width);
      for (let turn = 0; turn < STEPS.length; turn++) {
        const nx = x + STEPS[turn].x;
        const ny = y + STEPS[turn].y;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const nextTile = ny * width + nx;
        if (isPipe[nextTile] || blocked[nextTile]) continue;
        const next = nextTile * (NONE + 1) + turn;
        const nextCost = cost + STEPS[turn].cost + (heading != NONE && heading != turn ? turnCost : 0);
        if (nextCost >= best[next]) continue;
        best[next] = nextCost;
        cameFrom[next] = state;
        queue.push([nextCost, next]);
      }
    }
    if (arrived == -1) throw new Error('Could not create path for all pipes!');

    for (let state = arrived; state != -1; state = cameFrom[state]) lay(Math.floor(state / (NONE + 1)));
    waiting = waiting.filter(tile => !isPipe[tile]);
  }

  lay(trunkTile);
};
