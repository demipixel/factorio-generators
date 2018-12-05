const aStar = require('a-star');
const jsgraphs = require('js-graph-algorithms');
const Victor = require('victor');


const PUMPJACK_EXIT_DIRECTION = {
  0: { x: 2, y: -1 },
  1: { x: 3, y: 0 },
  2: { x: 0, y: 3 },
  3: { x: -1, y: 2 }
};

const MAX_UNDERGROUND_REACH = 11; // Includes underground pipes

const SIDES = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

const DIRECTION_FROM_OFFSET = {
  '0,-1': 0,
  '1,0': 2,
  '0,1': 4,
  '-1,0': 6
};

let ROTATE_ALL = false;
let FLIP_ALL = false;

function getPumpjackOutput(pumpjack, direction) {
  const ROTATE_OFFSET = ((4 - ROTATE_ALL) % 4);
  const ORDER = [0, -1, 2, 3];
  if (typeof direction == 'undefined') direction = pumpjack.direction/2;
  if (direction % 2 == 0) ORDER.reverse();
  let offset = {
    x: PUMPJACK_EXIT_DIRECTION[(direction + ROTATE_ALL) % 4].x,
    y: PUMPJACK_EXIT_DIRECTION[(direction + ROTATE_ALL) % 4].y
  };
  offset.x = ORDER[(ORDER.indexOf(offset.x) + ROTATE_OFFSET) % ORDER.length];
  offset.y = ORDER[(ORDER.indexOf(offset.y) + ROTATE_OFFSET) % ORDER.length];
  if (FLIP_ALL) offset.x = 2 - offset.x;

  return pumpjack.position.clone().add(offset);
}

function getStepFromDirection(direction) {
  let out = new Victor(SIDES[direction].x, SIDES[direction].y);
  if (FLIP_ALL) out.x = -out.x;
  return out;
}

function connectPumpjack(bp, pumpjack, target, xLimit){
  const hasBeacons = bp.entities.some(ent => ent.name == 'beacon');

  // Bound the search space for improved speed
  const boundsX = [bp.bottomLeft().x - 1, xLimit];
  const boundsY = [bp.topRight().y - 1, bp.bottomLeft().y + 1];

  const result = aStar({
    start: [null, 'start'],

    isEnd: ([node, meta]) => {
      if (meta == 'start') return false;
      if (node.x == target.x && node.y == target.y) return true;
      let entity = bp.findEntity(node);
      if (entity && entity.name == 'pipe') return true;
      for (let i = 0; i < SIDES.length; i++) {
        const entity = bp.findEntity(node.clone().add(SIDES[i]));
        if (entity && entity.name == 'pipe') {
          return true;
        }
      }
      return false;
    },

    neighbor: ([node, meta]) => {
      let isClear = (p) => (
        p.x >= boundsX[0] && p.x <= boundsX[1] &&
        p.y >= boundsY[0] && p.y <= boundsY[1] &&
        (!bp.findEntity(p) || (bp.findEntity(p).name == 'beacon' ||
                               bp.findEntity(p).name == 'pipe'))
      );
      let walkInDirection = (first, step) => {
        let pos = first.clone();
        let steps = [];
        for (let j = 0; j < MAX_UNDERGROUND_REACH; j++){
          if (!isClear(pos))
            break;
          steps.push(pos);
          pos = pos.clone().add(step);
        }
        return steps;
      };

      let neighbors = [];
      if (meta == 'start') {
        for (let dir of [0, 1, 2, 3]) {
          let step = getStepFromDirection(dir);
          let out = getPumpjackOutput(pumpjack, dir);
          neighbors.push(...walkInDirection(out, step).map(p => [p, out]));
        }
      } else {
        for (let step of SIDES) {
          let pos = node.clone().add(step);
          neighbors.push(...walkInDirection(pos, step).map(p => [p, null]));
        }
      }
      return neighbors;
    },

    distance: ([nodeA, metaA], [nodeB, metaB]) => {
      const beaconPenalty = 100;
      let fromStart = false;
      if (metaA == 'start'){
        fromStart = true;
        nodeA = metaB;
        if (nodeA.isEqualTo(nodeB)) {
          const entity = bp.findEntity(nodeB);
          return 1 + beaconPenalty * (entity && entity.name == 'beacon');
        }
      }
      let beaconCount = 0;
      let dir = nodeB.clone().subtract(nodeA).normalize();
      if (hasBeacons) {
        let step = nodeA;
        let prevEntity = false;
        do {
          let entity = bp.findEntity(step);
          if (entity && entity.name == 'beacon' && prevEntity != entity){
            beaconCount++;
            prevEntity = entity;
          }
          step = step.clone().add(dir);
        } while (!step.isEqualTo(nodeB));
      }
      let dist = Math.abs(nodeA.x - nodeB.x) + Math.abs(nodeA.y - nodeB.y);
      if (fromStart)
        dist += 1;
      if (dist > 3)
        dist = 3 + (dist-3)/10;
      return dist + beaconCount * beaconPenalty;
    },

    heuristic: ([node, meta]) => {
      if (meta == 'start') return 0;
      // Note: we could actually estimate by dividing by 4.
      // We deliberately underestimate to encourage the alorgithm to probe
      // around a bit more – it might discover an already existing pipe that
      // it could connect to.
      return (Math.abs(node.x - target.x) + Math.abs(node.y - target.y))/20;
    },

    hash: ([node, meta]) => {
      if (meta == 'start')
        return 'start';
      else
        return node.x + ',' + node.y;
    },

    timeout: 5000
  });

  if (result.status != 'success') {
    if (result.status == 'noPath'){
      throw new Error('Could not create path for all pipes!');
    }
    else throw new Error('Took too long to generate pipe paths!');
  }

  result.path.shift();
  let outputPos = result.path[0][1];
  for (let i = 0; i < 4; i++) {
    if (getPumpjackOutput(pumpjack, i).isEqualTo(outputPos)){
      pumpjack.setDirection(i * 2);
    }
  }

  if (bp.findEntity(outputPos)) bp.findEntity(outputPos).remove();
  bp.createEntity('pipe', outputPos, 0, true);


  let prev = outputPos;
  result.path.forEach(([pos, meta]) => {
    if (prev.distance(pos) < 2){
      if (bp.findEntity(pos)) bp.findEntity(pos).remove();
      bp.createEntity('pipe', pos, 0, true);
    } else {
      let dir = pos.clone().subtract(prev).normalize();
      let step = prev.clone().add(dir);
      while (!step.isEqualTo(pos)){
        if (bp.findEntity(step)) bp.findEntity(step).remove();
        bp.createEntity('pipe', step, 0, true);
        step = step.clone().add(dir);
      }
      if (bp.findEntity(pos)) bp.findEntity(pos).remove();
      bp.createEntity('pipe', pos, 0, true);
    }
    prev = pos;
  });
}

function addPipes(bp, target){
  let pumpjacks = bp.entities.filter(ent => ent.name == 'pumpjack');

  // Generate minimum spanning tree
  let vertices = pumpjacks.map(pj => pj.position);
  vertices.splice(0, 0, target);
  let graph = new jsgraphs.WeightedGraph(vertices.length);
  for (let i = 0; i < vertices.length; i++){
    for (let j = 0; j < vertices.length; j++){
      if (i >= j) continue;
      const weight = (Math.abs(vertices[i].x - vertices[j].x) +
                      Math.abs(vertices[i].y - vertices[j].y));
      graph.addEdge(new jsgraphs.Edge(i, j, weight));
    }
  }
  let mst = new jsgraphs.Graph(vertices.length);
  let mstEdges = new jsgraphs.EagerPrimMST(graph).mst;
  mstEdges.forEach(e => mst.addEdge(e.from(), e.to()));
  console.timeLog("outpost", "pipes mst done");

  // Turn spanning tree into pipes, in BFS order starting at the target
  let visited = [true];
  let queue = mst.adj(0).map(x => [target, x]);
  while (queue.length) {
    let [fromPos, toI] = queue.shift();
    visited[toI] = true;
    let pumpjack = pumpjacks[toI - 1];

    connectPumpjack(bp, pumpjack, fromPos, target.x);
    mst.adj(toI).filter(x => !visited[x])
      .forEach(x => queue.push([getPumpjackOutput(pumpjack), x]));
  }
  console.timeLog("outpost", "pipes connection done");
}


function simplifyPipes(bp, start, minLength = 3) {
  const checked = {};
  const stack = [start];

  const straights = []; // List of straight sets of pipe

  while (stack.length > 0) {
    const pos = stack.pop();
    const entity = bp.findEntity(pos);
    if (checked[pos.x + ',' + pos.y] || !entity || entity.name != 'pipe') continue;
    checked[pos.x + ',' + pos.y] = true;

    let sidePipes = [];
    SIDES.forEach(side => {
      let sidePos = pos.clone().add(side);
      let ent = bp.findEntity(sidePos);
      if (!!ent && (ent.name == 'pipe' ||
          (ent.name == 'pumpjack' && (getPumpjackOutput(ent).x == pos.x && getPumpjackOutput(ent).y == pos.y)))){
        sidePipes.push(sidePos);
      }
    });

    if (pos.from) {
      let shouldUnderground = sidePipes.length == 2 && (sidePipes[0].x - pos.x == pos.x - sidePipes[1].x) && (sidePipes[0].y - pos.y == pos.y -
        sidePipes[1].y);

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
  console.timeLog("outpost", "pipes undegrounding done");
}

function generatePipes(bp, target, rotateAll, flipAll){
  ROTATE_ALL = rotateAll;
  FLIP_ALL = flipAll;
  console.log("R", rotateAll, "F", flipAll);
  addPipes(bp, target);
  simplifyPipes(bp, target);
}


module.exports = generatePipes;
