const Blueprint = require('factorio-blueprint');
const RequestChestSlotCount = 12;
const RailsPerCurvedRail = 4;
const RailsPerStraightRail = 1;

module.exports = function(string) {
    const importedBP = new Blueprint(string);
    const requestBP = new Blueprint();

    requestBP.name = 'Requester for ' + importedBP.name;
    requestBP.icons[0] = 'logistic_chest_requester';

    let entityCounts = new Map();
    for (const entity of importedBP.entities) {
        const ent = entity.name;
        if (!entityCounts.has(ent))
            entityCounts.set(ent, 1);
        else
            entityCounts.set(ent, entityCounts.get(ent)+1);
    }

    for (const tile of importedBP.tiles) {
        const tl = tile.name;
        if (!entityCounts.has(tl))
            entityCounts.set(tl, 1);
        else
            entityCounts.set(tl, entityCounts.get(tl)+1);
    }

    // replace rails
    let railCount = 0;
    if (entityCounts.has('curved_rail')) {
        railCount += entityCounts.get('curved_rail') * RailsPerCurvedRail;
        entityCounts.delete('curved_rail');
    }
    if (entityCounts.has('straight_rail')) {
        railCount += entityCounts.get('straight_rail') * RailsPerStraightRail;
        entityCounts.delete('straight_rail');
    }
    if (railCount > 0) {
        entityCounts.set('rail', railCount);
    }

    const chestCount = Math.ceil(entityCounts.size / RequestChestSlotCount);

    let requestItemId = 0;
    let entities = entityCounts.entries();
    let entry = entities.next();
    for (let i = 0; i < chestCount; i++) {
        let requestEntity = requestBP.createEntity('logistic_chest_requester', {x: i, y: 0});
        for (let j = 0; j < RequestChestSlotCount && !entry.done; j++) {
            requestEntity.setRequestFilter(j, entry.value[0], entry.value[1]);
            entry = entities.next();
        }
    }

    return requestBP.encode();
};
