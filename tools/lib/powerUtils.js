const Victor = require('victor');
const jsgraphs = require('js-graph-algorithms');
const aStar = require('a-star');

const MAX_POLE_DISTANCE = 9;

function connectConsumers(bp, allConsumers){
  // Picking the best poles is a weighted set cover problem.
  // We approximate a good solution with a greedy algorithm
  let hashPos = pos => pos.x + ',' + pos.y;
  let posFromHash = function(hash){
    let [x, y] = hash.split(',');
    return new Victor(parseInt(x), parseInt(y));
  };

  let poleMap = new Map();
  let consumerMap = new Map();
  allConsumers.forEach(consumer => {
    let poleCount = 0;
    for (let x = -3; x < consumer.size.x + 3; x++) {
      for (let y = -3; y < consumer.size.y + 3; y++) {
        const pos = { x: x + consumer.position.x, y: y + consumer.position.y };
        const posHash = hashPos(pos);
        if (bp.findEntity(pos))
          continue;
        poleCount++;
        if (!poleMap.has(posHash)){
          poleMap.set(posHash, [consumer]);
        } else {
          poleMap.get(posHash).push(consumer);
        }
      }
    }
    consumerMap.set(consumer, poleCount);
  });

  let minDistance = function(posHash, consumers) {
    let poleCenter = posFromHash(posHash).add(new Victor(0.5, 0.5));
    let poleDistances = consumers.map(c => c.center().distance(poleCenter));
    return Math.min(...poleDistances) + (
      poleDistances.reduce((a, b) => a + b, 0) / poleDistances.length / 100);
  };

  let poleQueue = Array.from(poleMap.entries()).sort(
    (a, b) => ((a[1].length*10000 - minDistance(a[0], a[1])) -
               (b[1].length*10000 - minDistance(b[0], b[1]))));
  for (let [pole, consumers] of poleQueue){
    let canRemove = consumers.every(c => consumerMap.get(c) > 1);
    if (canRemove) {
      poleMap.delete(pole);
      consumers.forEach(c => consumerMap.set(c, consumerMap.get(c) - 1));
    }
  }
  for (let pole of poleMap.keys()){
      bp.createEntity('medium_electric_pole', posFromHash(pole));
  }
  console.timeLog("outpost", "consumer poles done");
}


function connectPoles(bp){
  // Make sure that the power poles form a connected graph
  // First, we construct a MST over the power poles
  const poles = bp.entities.filter(ent => ent.name == 'medium_electric_pole')
    .map(ent => ent.position);
  let poleGraph = new jsgraphs.WeightedGraph(poles.length);
  for (let i = 0; i < poles.length; i++){
    for (let j = 0; j < i; j++){
      let distance = poles[i].distance(poles[j]);
      poleGraph.addEdge(new jsgraphs.Edge(i, j, distance));
    }
  }
  let mstEdges = new jsgraphs.EagerPrimMST(poleGraph).mst;

  // Power poles that are at most MAX_POLE_DISTANCE away from each other have a
  // direct power line connection. For the remaining edges of the MST, we have
  // to add new power poles to create a connection.
  let newEdges = mstEdges.filter(e => e.weight > MAX_POLE_DISTANCE);
  for (let edge of newEdges){
    // We use A* to place new poles between the two existing ones
    const result = aStar({
      start: poles[edge.from()],
      isEnd: pos => pos.isEqualTo(poles[edge.to()]),

      neighbor: pos => {
        let neighbors = [];
        for (let i = -9; i <= 9; i++){
          for (let j = -9; j <= 9; j++){
            if (i == j) continue;
            let offset = new Victor(i, j);
            if (offset.length() <= 9){
              let nPos = pos.clone().add(offset);
              let ent = bp.findEntity(nPos);
              if (!ent || ent.name == 'medium_electric_pole'){
                neighbors.push(nPos);
              }
            }
          }
        }
        return neighbors;
      },

      distance: (posA, posB) => {
        // We mostly care for the amount of poles that need to be placed.
        // Euclidian distance doesn't really matter. But we add a very slight
        // penalty of the square distance to encourage the algorithm to generate
        // evenly spaced power poles, which are more pleasing to the eye.
        let polePrice = 1;

        let entB = bp.findEntity(posB);
        if (entB && entB.name == 'medium_electric_pole'){
          let entA = bp.findEntity(posA);
          if (entA && entA.name == 'medium_electric_pole')
            return 0;
          polePrice = 0;
        }

        let distance = posA.distanceSq(posB);
        return polePrice + distance / 1000;
      },

      heuristic: pos => { // eslint-disable-line no-loop-func
        let distance = pos.distance(poles[edge.to()]);
        if (distance == 0) return 0;
        let poleCount = Math.ceil(distance / 9);
        let avgDistance = distance / poleCount;
        return poleCount * (1 + avgDistance * avgDistance / 1000) - 1;
      },

      hash: pos => pos.toString(),

      timeout: 1000,
    });


    if (result.status != 'success') {
      if (result.status == 'noPath'){
        throw new Error('Could not create path for electricity!');
      }
      else throw new Error('Took too long to generate electricity paths!');
    }

    for (let pole of result.path){
      if (!bp.findEntity(pole))
        bp.createEntity('medium_electric_pole', {x: pole.x, y: pole.y});
    }
  }
  console.timeLog("outpost", "pole connectivity done");
}

module.exports = {
    connectConsumers: connectConsumers,
    connectPoles: connectPoles,
};
