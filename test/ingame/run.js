// Checks generated outposts inside a real copy of Factorio 2.0, headless.
//
//   FACTORIO=/path/to/factorio node test/ingame/run.js [how many ore outposts]
//
// For every random ore outpost, and for an oil outpost in every orientation, it imports both the 1.1 and the 2.0 blueprint
// string, builds them on an empty surface covered in ore, and reports:
//   - whether the game accepts the string and can place every entity
//   - whether the train stop and the rail signal attach to the track
//   - whether all the poles end up in one electric network, and everything electric is in reach of one
//   - whether every beacon reaches a pumpjack
//   - whether our 2.0 output equals what the game makes of the 1.1 string
//
// Nothing is written to your own Factorio folders; the run uses its own
// config and a temporary write directory.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const outpost = require('../../tools/outpost');
const oilOutpost = require('../../tools/oilOutpost');
const { generator, patch, randomOutpost, oilField, ORIENTATIONS } = require('../random');

const MAC_STEAM = path.join(os.homedir(),
  'Library/Application Support/Steam/steamapps/common/Factorio/factorio.app/Contents/MacOS/factorio');
const game = process.env.FACTORIO || MAC_STEAM;
if (!fs.existsSync(game)) {
  console.error(`Factorio not found at ${game}. Set FACTORIO to the game's executable.`);
  process.exit(1);
}

const count = parseInt(process.argv[2], 10) || 24;
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'factorio-generators-'));
const mod = path.join(work, 'mods', 'bpcheck');
fs.mkdirSync(mod, { recursive: true });
fs.mkdirSync(path.join(work, 'write'));
['control.lua', 'info.json'].forEach(file => fs.copyFileSync(path.join(__dirname, 'mod', file), path.join(mod, file)));
fs.writeFileSync(path.join(work, 'mods', 'mod-list.json'),
  JSON.stringify({ mods: [{ name: 'base', enabled: true }, { name: 'bpcheck', enabled: true }] }));
fs.writeFileSync(path.join(work, 'config.ini'),
  `[path]\nread-data=${path.resolve(game, '../../data')}\nwrite-data=${path.join(work, 'write')}\n`);

const rng = generator(parseInt(process.env.SEED, 10) || 11);
const cases = [];
const strings = {};
for (let i = 0; i < count; i++) {
  const { opt, width, height } = randomOutpost(rng);
  // big mining drills need Space Age, which the base game cannot place
  delete opt.minerSize;
  delete opt.miningDrillName;
  const input = patch(width, height);
  cases.push({ opt, about: `ore outpost on a ${width}x${height} patch` });
  strings['old' + i] = outpost(input, Object.assign({}, opt, { gameVersion: '1.1' }));
  strings['new' + i] = outpost(input, Object.assign({}, opt, { gameVersion: '2.0' }));
}

// oil outposts: every orientation, with and without an exit route
ORIENTATIONS.forEach(([trainSide, trainDirection], n) => {
  const opt = {
    trainSide, trainDirection, turrets: true, laserTurrets: n % 2 === 0, includeLights: true,
    exitRoute: n % 3 === 0, module: n % 2 ? 'speed_module' : null, wagonCount: 1 + (n % 3), tanks: 1 + (n % 4),
    beacons: [false, 'few', 'balanced', 'max'][n % 4]
  };
  const i = cases.length;
  cases.push({ opt, about: 'oil outpost' });
  strings['old' + i] = oilOutpost(oilField(), Object.assign({}, opt, { gameVersion: '1.1' }));
  strings['new' + i] = oilOutpost(oilField(), Object.assign({}, opt, { gameVersion: '2.0' }));
});
fs.writeFileSync(path.join(mod, 'strings.lua'),
  'return {\n' + Object.keys(strings).map(key => `  [${JSON.stringify(key)}] = ${JSON.stringify(strings[key])},`).join('\n') + '\n}\n');

execFileSync(game, [
  '--config', path.join(work, 'config.ini'),
  '--mod-directory', path.join(work, 'mods'),
  '--create', path.join(work, 'write', 'check.zip')
], { stdio: 'pipe' });
const results = JSON.parse(fs.readFileSync(path.join(work, 'write', 'script-output', 'bpcheck.json'), 'utf8'));

// Lua writes empty tables as {}, so read lists through Object.values
const sound = r => r.import === 0 &&
  r.placed === r.entity_count &&
  r.placed_tiles === r.tile_count &&
  Object.keys(r.refused).length === 0 &&
  Object.keys(r.lost).length === 0 &&
  r.networks <= 1 &&
  Object.keys(r.unpowered).length === 0 &&
  r.useless_beacons === 0 &&
  Object.values(r.stop_connected).every(Boolean) &&
  Object.values(r.signal_rails).every(rails => rails > 0);
const fingerprint = e => JSON.stringify([
  e.name.replace('legacy-straight-rail', 'straight-rail'), e.position.x, e.position.y, e.direction || 0,
  e.items || null, e.request_filters || null, e.type || null, e.bar || null
]);

let failures = 0;
cases.forEach(({ opt, about }, i) => {
  const before = results['old' + i];
  const after = results['new' + i];
  const a = before.entities.map(fingerprint).sort();
  const b = after.entities.map(fingerprint).sort();
  const same = a.length === b.length && a.every((value, index) => value === b[index]);
  if (same && sound(before) && sound(after) && before.networks === after.networks) return;

  failures++;
  console.log(`\nFAILED: ${about} with ${JSON.stringify(opt)}`);
  [['1.1', before], ['2.0', after]].forEach(([label, r]) => console.log(
    `  ${label}: import ${r.import}, placed ${r.placed}/${r.entity_count}, refused ${JSON.stringify(r.refused)}, lost ${JSON.stringify(r.lost)}, ` +
    `stop on track ${JSON.stringify(r.stop_connected)}, rails at signal ${JSON.stringify(r.signal_rails)}, ` +
    `electric networks ${r.networks}, without power ${JSON.stringify(r.unpowered)}, beacons reaching nothing ${r.useless_beacons}`));
  if (!same) console.log('  the 2.0 output differs from the game\'s conversion of the 1.1 output');
});

fs.rmSync(work, { recursive: true, force: true });
console.log(`\n${cases.length - failures} of ${cases.length} outposts build cleanly in the game and match its own 1.1 conversion.`);
process.exit(failures ? 1 : 0);
