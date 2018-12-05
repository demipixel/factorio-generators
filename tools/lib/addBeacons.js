const ACTIVATIONS = {
  sigmoid: x => 1 / (1 + Math.pow(Math.E, Math.max(-60, Math.min(60, x * 5.0)))),
  relu: x => Math.max(x, 0.0)
};

const NODES =
  `
0 DefaultNodeGene(key=0, bias=-0.19930210829, response=1.0, activation=relu, aggregation=sum)
4051 DefaultNodeGene(key=4051, bias=0.471368061127, response=1.0, activation=sigmoid, aggregation=sum)
4063 DefaultNodeGene(key=4063, bias=1.16531658624, response=1.0, activation=sigmoid, aggregation=sum)`
  .trim().split('\n').map(str => {
    const m = str.match(/DefaultNodeGene\(key=(\d+), bias=(-?[0-9.]+), response=1\.0, activation=([^,]+)/);
    return {
      key: parseInt(m[1]),
      bias: parseInt(m[2]),
      activation: m[3]
    };
  });


const CONNS =
  `
DefaultConnectionGene(key=(-224, 0), weight=1.5413694549, enabled=True)
DefaultConnectionGene(key=(-221, 0), weight=-1.73652697394, enabled=False)
DefaultConnectionGene(key=(-220, 0), weight=0.343078629085, enabled=True)
DefaultConnectionGene(key=(-219, 0), weight=-0.301904084502, enabled=True)
DefaultConnectionGene(key=(-217, 0), weight=-1.11489675462, enabled=True)
DefaultConnectionGene(key=(-214, 0), weight=-0.529785274661, enabled=True)
DefaultConnectionGene(key=(-212, 0), weight=1.70490013839, enabled=True)
DefaultConnectionGene(key=(-211, 0), weight=-0.400655932131, enabled=True)
DefaultConnectionGene(key=(-210, 0), weight=0.232071962473, enabled=True)
DefaultConnectionGene(key=(-209, 0), weight=0.949608241967, enabled=False)
DefaultConnectionGene(key=(-207, 0), weight=-0.854164713216, enabled=False)
DefaultConnectionGene(key=(-206, 0), weight=0.791919494285, enabled=False)
DefaultConnectionGene(key=(-204, 0), weight=0.832551571664, enabled=False)
DefaultConnectionGene(key=(-202, 0), weight=0.705105144097, enabled=True)
DefaultConnectionGene(key=(-201, 0), weight=3.118827935, enabled=True)
DefaultConnectionGene(key=(-200, 0), weight=1.23197212973, enabled=False)
DefaultConnectionGene(key=(-199, 0), weight=-0.855519826154, enabled=False)
DefaultConnectionGene(key=(-198, 0), weight=-1.00537675395, enabled=True)
DefaultConnectionGene(key=(-197, 0), weight=-1.29989554941, enabled=False)
DefaultConnectionGene(key=(-195, 0), weight=-1.17663556138, enabled=False)
DefaultConnectionGene(key=(-194, 0), weight=-1.6868171029, enabled=True)
DefaultConnectionGene(key=(-193, 0), weight=-4.20255413837, enabled=False)
DefaultConnectionGene(key=(-190, 0), weight=0.0301954636296, enabled=False)
DefaultConnectionGene(key=(-189, 0), weight=-0.0207601798032, enabled=True)
DefaultConnectionGene(key=(-185, 0), weight=2.85602068945, enabled=False)
DefaultConnectionGene(key=(-184, 0), weight=-1.46537971189, enabled=False)
DefaultConnectionGene(key=(-183, 0), weight=0.391997146851, enabled=True)
DefaultConnectionGene(key=(-182, 0), weight=0.809332294847, enabled=False)
DefaultConnectionGene(key=(-178, 0), weight=3.45868198473, enabled=False)
DefaultConnectionGene(key=(-177, 0), weight=0.556744091697, enabled=False)
DefaultConnectionGene(key=(-175, 0), weight=0.734870904163, enabled=True)
DefaultConnectionGene(key=(-172, 0), weight=0.291742755804, enabled=True)
DefaultConnectionGene(key=(-171, 0), weight=-0.687255399568, enabled=True)
DefaultConnectionGene(key=(-170, 0), weight=-0.0266361683025, enabled=True)
DefaultConnectionGene(key=(-169, 0), weight=-0.454846146535, enabled=False)
DefaultConnectionGene(key=(-167, 0), weight=-2.10298686623, enabled=False)
DefaultConnectionGene(key=(-166, 0), weight=0.295781796251, enabled=False)
DefaultConnectionGene(key=(-165, 0), weight=0.85070743782, enabled=False)
DefaultConnectionGene(key=(-164, 0), weight=1.61505756306, enabled=True)
DefaultConnectionGene(key=(-163, 0), weight=1.34242161192, enabled=False)
DefaultConnectionGene(key=(-162, 0), weight=0.147944519834, enabled=True)
DefaultConnectionGene(key=(-161, 0), weight=-0.479709972784, enabled=True)
DefaultConnectionGene(key=(-160, 0), weight=0.791876028519, enabled=True)
DefaultConnectionGene(key=(-159, 0), weight=-0.0616190374359, enabled=False)
DefaultConnectionGene(key=(-156, 0), weight=0.300566333075, enabled=False)
DefaultConnectionGene(key=(-154, 0), weight=-0.0331157746529, enabled=True)
DefaultConnectionGene(key=(-153, 0), weight=-0.334749631961, enabled=True)
DefaultConnectionGene(key=(-152, 0), weight=-2.01053940319, enabled=False)
DefaultConnectionGene(key=(-150, 0), weight=0.481962293653, enabled=True)
DefaultConnectionGene(key=(-149, 0), weight=-3.53337647402, enabled=True)
DefaultConnectionGene(key=(-148, 0), weight=-1.32794069721, enabled=True)
DefaultConnectionGene(key=(-147, 0), weight=-0.393654029279, enabled=True)
DefaultConnectionGene(key=(-146, 0), weight=-0.769349241496, enabled=True)
DefaultConnectionGene(key=(-145, 0), weight=1.64002525305, enabled=False)
DefaultConnectionGene(key=(-144, 0), weight=-1.16286174944, enabled=False)
DefaultConnectionGene(key=(-143, 0), weight=-2.54444887185, enabled=True)
DefaultConnectionGene(key=(-142, 0), weight=-0.032564806715, enabled=False)
DefaultConnectionGene(key=(-141, 0), weight=-0.451481358431, enabled=False)
DefaultConnectionGene(key=(-140, 0), weight=0.65006685108, enabled=True)
DefaultConnectionGene(key=(-139, 0), weight=-0.536330356947, enabled=False)
DefaultConnectionGene(key=(-138, 0), weight=0.864766392772, enabled=True)
DefaultConnectionGene(key=(-137, 0), weight=1.3341409107, enabled=False)
DefaultConnectionGene(key=(-136, 0), weight=3.29667542995, enabled=True)
DefaultConnectionGene(key=(-134, 0), weight=-0.761100171666, enabled=True)
DefaultConnectionGene(key=(-133, 0), weight=-2.65926316254, enabled=True)
DefaultConnectionGene(key=(-132, 0), weight=-2.19535798843, enabled=False)
DefaultConnectionGene(key=(-131, 0), weight=-0.066321456559, enabled=False)
DefaultConnectionGene(key=(-130, 0), weight=-1.69160520442, enabled=False)
DefaultConnectionGene(key=(-129, 0), weight=1.10583689194, enabled=True)
DefaultConnectionGene(key=(-128, 0), weight=2.17015834864, enabled=False)
DefaultConnectionGene(key=(-128, 4051), weight=-1.88270841462, enabled=True)
DefaultConnectionGene(key=(-127, 0), weight=2.4282903591, enabled=True)
DefaultConnectionGene(key=(-126, 0), weight=-0.565074680378, enabled=True)
DefaultConnectionGene(key=(-125, 0), weight=-1.41625790678, enabled=True)
DefaultConnectionGene(key=(-123, 0), weight=0.525458430609, enabled=True)
DefaultConnectionGene(key=(-122, 0), weight=-0.233628531563, enabled=True)
DefaultConnectionGene(key=(-121, 0), weight=1.49283260805, enabled=False)
DefaultConnectionGene(key=(-119, 0), weight=1.16838564227, enabled=False)
DefaultConnectionGene(key=(-118, 0), weight=2.87120981671, enabled=False)
DefaultConnectionGene(key=(-117, 0), weight=0.00347417146359, enabled=False)
DefaultConnectionGene(key=(-115, 0), weight=-3.43415774508, enabled=False)
DefaultConnectionGene(key=(-113, 0), weight=-2.29199930737, enabled=False)
DefaultConnectionGene(key=(-109, 0), weight=-1.41842555381, enabled=True)
DefaultConnectionGene(key=(-108, 0), weight=1.19463968323, enabled=False)
DefaultConnectionGene(key=(-107, 0), weight=-0.528686570881, enabled=False)
DefaultConnectionGene(key=(-106, 0), weight=1.31882730949, enabled=False)
DefaultConnectionGene(key=(-105, 0), weight=-1.40808776276, enabled=False)
DefaultConnectionGene(key=(-101, 0), weight=3.5020179311, enabled=False)
DefaultConnectionGene(key=(-101, 4063), weight=1.73994627505, enabled=True)
DefaultConnectionGene(key=(-99, 0), weight=-1.2801160722, enabled=False)
DefaultConnectionGene(key=(-96, 0), weight=-0.527117811987, enabled=False)
DefaultConnectionGene(key=(-95, 0), weight=-1.91390037981, enabled=True)
DefaultConnectionGene(key=(-94, 0), weight=-0.584922491649, enabled=True)
DefaultConnectionGene(key=(-92, 0), weight=0.549085964898, enabled=False)
DefaultConnectionGene(key=(-91, 0), weight=-0.933913178988, enabled=False)
DefaultConnectionGene(key=(-90, 0), weight=-0.245489022132, enabled=False)
DefaultConnectionGene(key=(-89, 0), weight=0.844356811709, enabled=True)
DefaultConnectionGene(key=(-88, 0), weight=-1.19116348909, enabled=False)
DefaultConnectionGene(key=(-85, 0), weight=1.41959166008, enabled=True)
DefaultConnectionGene(key=(-84, 0), weight=-2.51267527432, enabled=False)
DefaultConnectionGene(key=(-84, 4051), weight=0.301589674219, enabled=True)
DefaultConnectionGene(key=(-83, 0), weight=-0.408036773825, enabled=False)
DefaultConnectionGene(key=(-82, 0), weight=1.31927425599, enabled=False)
DefaultConnectionGene(key=(-81, 0), weight=-25.218265036, enabled=True)
DefaultConnectionGene(key=(-80, 0), weight=3.65327513827, enabled=False)
DefaultConnectionGene(key=(-77, 0), weight=-1.92843333795, enabled=True)
DefaultConnectionGene(key=(-76, 0), weight=-1.8473235276, enabled=False)
DefaultConnectionGene(key=(-75, 0), weight=-3.89923551079, enabled=True)
DefaultConnectionGene(key=(-74, 0), weight=-0.0839213988943, enabled=True)
DefaultConnectionGene(key=(-73, 0), weight=0.689442370279, enabled=True)
DefaultConnectionGene(key=(-71, 0), weight=0.792529973153, enabled=False)
DefaultConnectionGene(key=(-68, 0), weight=-2.6916246089, enabled=False)
DefaultConnectionGene(key=(-65, 0), weight=0.0773014426042, enabled=True)
DefaultConnectionGene(key=(-63, 0), weight=0.688421437652, enabled=True)
DefaultConnectionGene(key=(-61, 0), weight=0.164599194104, enabled=True)
DefaultConnectionGene(key=(-60, 0), weight=-17.8732810798, enabled=True)
DefaultConnectionGene(key=(-59, 0), weight=-0.132745187945, enabled=True)
DefaultConnectionGene(key=(-56, 0), weight=1.46172809755, enabled=False)
DefaultConnectionGene(key=(-54, 0), weight=-0.335819557718, enabled=False)
DefaultConnectionGene(key=(-53, 0), weight=1.37925582364, enabled=False)
DefaultConnectionGene(key=(-52, 0), weight=0.338384424307, enabled=True)
DefaultConnectionGene(key=(-50, 0), weight=-6.65358791073, enabled=False)
DefaultConnectionGene(key=(-48, 0), weight=-1.24753586969, enabled=True)
DefaultConnectionGene(key=(-47, 0), weight=0.618499706801, enabled=False)
DefaultConnectionGene(key=(-46, 0), weight=0.472309108051, enabled=False)
DefaultConnectionGene(key=(-45, 0), weight=-0.920936569666, enabled=False)
DefaultConnectionGene(key=(-43, 0), weight=4.19412027292, enabled=False)
DefaultConnectionGene(key=(-42, 0), weight=1.90735419689, enabled=True)
DefaultConnectionGene(key=(-41, 0), weight=2.4931499564, enabled=True)
DefaultConnectionGene(key=(-40, 0), weight=0.817777417629, enabled=False)
DefaultConnectionGene(key=(-39, 0), weight=-1.19539235949, enabled=False)
DefaultConnectionGene(key=(-38, 0), weight=0.805559257215, enabled=True)
DefaultConnectionGene(key=(-37, 0), weight=0.699511328861, enabled=False)
DefaultConnectionGene(key=(-35, 0), weight=-0.326546673697, enabled=False)
DefaultConnectionGene(key=(-32, 0), weight=0.0040379187648, enabled=True)
DefaultConnectionGene(key=(-30, 0), weight=-0.546063451057, enabled=True)
DefaultConnectionGene(key=(-29, 0), weight=-0.406826615086, enabled=True)
DefaultConnectionGene(key=(-27, 0), weight=-1.32088808941, enabled=True)
DefaultConnectionGene(key=(-26, 0), weight=-0.252547850745, enabled=False)
DefaultConnectionGene(key=(-25, 0), weight=2.331221711, enabled=True)
DefaultConnectionGene(key=(-24, 0), weight=-1.81795383608, enabled=True)
DefaultConnectionGene(key=(-22, 0), weight=-2.5564789552, enabled=False)
DefaultConnectionGene(key=(-20, 0), weight=1.96220394372, enabled=True)
DefaultConnectionGene(key=(-15, 0), weight=-1.32133664618, enabled=False)
DefaultConnectionGene(key=(-14, 0), weight=0.982033299449, enabled=False)
DefaultConnectionGene(key=(-13, 0), weight=2.87883936481, enabled=False)
DefaultConnectionGene(key=(-12, 0), weight=0.255847301078, enabled=False)
DefaultConnectionGene(key=(-4, 0), weight=-0.659146242734, enabled=True)
DefaultConnectionGene(key=(-2, 0), weight=-0.113186600412, enabled=True)
DefaultConnectionGene(key=(-1, 0), weight=-0.616556219323, enabled=True)
DefaultConnectionGene(key=(4051, 0), weight=2.42256427044, enabled=True)
DefaultConnectionGene(key=(4063, 0), weight=2.28399291126, enabled=True)
`
  .trim().split('\n').map(str => {
    const m = str.match(/DefaultConnectionGene\(key=\(([\-0-9]+), ([\-0-9]+)\), weight=([\-.0-9]+), enabled=(True|False)/);

    return m[4] == 'True' ? {
      from: parseInt(m[1]),
      to: parseInt(m[2]),
      weight: parseInt(m[3])
    } : null;
  }).filter(connection => !!connection);

function runNN(input) {
  function getForNode(key) {
    if (key < 0) return input[-key - 1];
    const node = NODES.filter(n => n.key == key)[0];
    const total = CONNS.filter(conn => conn.to == key)
      .reduce((total, conn) => total + getForNode(conn.from) * conn.weight, 0);

    return ACTIVATIONS[node.activation](node.bias + total);
  }

  return getForNode(0);
}

function shouldPlaceBeacon(bp, posX, posY) {
  const input = [];
  const RADIUS = 5;
  let reach = false;
  for (let x = posX - RADIUS; x <= posX + RADIUS; x++) {
    for (let y = posY - RADIUS; y <= posY + RADIUS; y++) {
      const ent = bp.findEntity({ x, y });
      if (!reach && ent && ent.name == 'pumpjack' && x >= posX - 4 && x <= posX + 4 && y >= posY - 4 && y <= posY + 4) {
        reach = true;
      }
      if (x < posX - 1 || x > posX + 1 || y < posY - 1 || y > posY + 1) {
        input.push(ent && ent.name == 'pumpjack' ? 1 : (ent && ent.name == 'pipe' ? 0.5 : 0));
        input.push(ent && ent.name == 'beacon' ? 1 : 0);
      }
    }
  }
  return reach && runNN(input) >= 0.5;
}

function placeBeacons(bp) {
  const start = bp.topLeft().subtract({ x: 5, y: 5 });
  const end = bp.bottomRight().add({ x: 5, y: 5 });
  for (let x = start.x; x <= end.x; x++) {
    for (let y = start.y; y <= end.y; y++) {
      if (shouldPlaceBeacon(bp, x, y)) {
        let canPlace = true;
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            if (bp.findEntity({ x: x + i, y: y + j })) canPlace = false;
          }
        }
        if (canPlace) {
          const beacon = bp.createEntity('beacon', { x: x - 1, y: y - 1 });
          beacon.modules['speed_module_3'] = 2;
        }
      }
    }
  }
}

module.exports = placeBeacons;
