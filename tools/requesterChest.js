const Blueprint = require('factorio-blueprint');
const REQUEST_CHEST_SLOT_COUNT = 12;
const RAILS_PER_CURVED_RAIL = 4;
const RAILED_PER_STRAIGHT_RAIL = 1;

module.exports = function(string) {
    if (Blueprint.isBook(string)) {
        throw new Error('Blueprint string must be a blueprint, not a book.');
    }
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
        railCount += entityCounts.get('curved_rail') * RAILS_PER_CURVED_RAIL;
        entityCounts.delete('curved_rail');
    }
    if (entityCounts.has('straight_rail')) {
        railCount += entityCounts.get('straight_rail') * RAILED_PER_STRAIGHT_RAIL;
        entityCounts.delete('straight_rail');
    }
    if (railCount > 0) {
        entityCounts.set('rail', railCount);
    }

    const chestCount = Math.ceil(entityCounts.size / REQUEST_CHEST_SLOT_COUNT);
    const squareSize = Math.ceil(Math.sqrt(chestCount));

    let requestItemId = 0;
    let entities = entityCounts.entries();
    let entry = entities.next();
    for (let i = 0; i < chestCount; i++) {
        const x = i % squareSize;
        const y = Math.floor(i/squareSize);
        let requestEntity = requestBP.createEntity('logistic_chest_requester', {x, y});
        for (let j = 0; j < REQUEST_CHEST_SLOT_COUNT && !entry.done; j++) {
            requestEntity.setRequestFilter(j, entry.value[0], entry.value[1]);
            entry = entities.next();
        }
    }

    requestBP.center();
    return requestBP.encode();
};
