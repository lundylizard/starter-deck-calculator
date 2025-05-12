const MAX_COPIES = 3;
let starterPools = [];
let idToType = new Uint8Array(3000);
const cardDrawCount = new Uint32Array(3000);
let poolAliases = [];
let built = false;

self.onmessage = function (e) {
    const { trials, requirements, starterPools: pools } = e.data;
    starterPools = pools;

    if (!built) {
        poolAliases = pools.map(pool => ({
            sample_size: pool.sample_size,
            alias: createAliasTable(pool.cards)
        }));

        let maxId = 0;
        for (const pool of pools) {
            for (const card of pool.cards) {
                if (card.card_id > maxId) maxId = card.card_id;
            }
        }

        idToType = new Uint8Array(maxId + 1);
        for (const pool of pools) {
            for (const card of pool.cards) {
                idToType[card.card_id] = card.type_id || 0;
            }
        }

        built = true;
    }

    const cardToReqsMap = buildCardToReqsMap(requirements);
    cardDrawCount.fill(0);
    let hits = 0;

    const deck = new Uint16Array(40);
    const counts = new Uint8Array(3000);

    for (let t = 0; t < trials; t++) {
        let index = 0;
        counts.fill(0);

        for (const { alias, sample_size } of poolAliases) {
            let drawn = 0;
            while (drawn < sample_size) {
                const cardId = sampleFromAlias(alias);
                if (counts[cardId] < MAX_COPIES) {
                    counts[cardId]++;
                    cardDrawCount[cardId]++;
                    deck[index++] = cardId;
                    drawn++;
                }
            }
        }

        if (validate(deck, index, requirements, cardToReqsMap)) hits++;
    }

    self.postMessage({
        hits,
        cardDrawCount: Array.from(cardDrawCount)
    });
};

function createAliasTable(cards) {
    const total = 2048;
    const pdf = cards.map(c => c.weight / total);
    const N = pdf.length;
    const prob = new Float64Array(N);
    const alias = new Uint16Array(N);
    const small = [], large = [];
    const scaled = pdf.map(p => p * N);

    scaled.forEach((v, i) => (v < 1 ? small : large).push(i));

    while (small.length && large.length) {
        const l = small.pop(), g = large.pop();
        prob[l] = scaled[l];
        alias[l] = g;
        scaled[g] = (scaled[g] + scaled[l]) - 1;
        (scaled[g] < 1 ? small : large).push(g);
    }

    large.forEach(i => prob[i] = 1);
    small.forEach(i => prob[i] = 1);

    return { prob, alias, cards };
}

function sampleFromAlias(aliasTable) {
    const i = (Math.random() * aliasTable.prob.length) | 0;
    return Math.random() < aliasTable.prob[i]
        ? aliasTable.cards[i].card_id
        : aliasTable.cards[aliasTable.alias[i]].card_id;
}

function buildCardToReqsMap(requirements) {
    const map = new Map();

    for (let i = 0; i < requirements.length; i++) {
        const r = requirements[i];
        if (r.kind !== 'card') continue;

        for (const id of r.alts) {
            if (!map.has(id)) map.set(id, []);
            map.get(id).push(i);
        }
    }

    return map;
}

function validate(deck, size, requirements, cardToReqsMap) {
    if (!requirements || !Array.isArray(requirements) || requirements.length === 0) return true;

    const cardCount = new Uint16Array(3000);
    const typeCount = new Uint16Array(30);
    const reqSums = new Uint16Array(requirements.length);

    for (let i = 0; i < size; i++) {
        const cid = deck[i];
        cardCount[cid]++;
        const typeId = idToType[cid];
        if (typeId) typeCount[typeId]++;

        const affectedReqs = cardToReqsMap.get(cid);
        if (affectedReqs) {
            for (const reqIndex of affectedReqs) {
                reqSums[reqIndex]++;
            }
        }
    }

    for (let i = 0; i < requirements.length; i++) {
        const r = requirements[i];
        let total = r.kind === 'card'
            ? reqSums[i]
            : r.alts.reduce((sum, typeId) => sum + typeCount[typeId], 0);

        if (total < r.min || total > r.max) return false;
    }

    return true;
}