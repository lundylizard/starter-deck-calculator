const typeNameToId = {
    dragon: 1, spellcaster: 2, zombie: 3, warrior: 4,
    beastwarrior: 5, beast: 6, wingedbeast: 7, fiend: 8,
    fairy: 9, insect: 10, dinosaur: 11, reptile: 12,
    fish: 13, seaserpent: 14, machine: 15, thunder: 16,
    aqua: 17, pyro: 18, rock: 19, plant: 20,
    magic: 21, field: 22, trap: 23, ritual: 24,
    equip: 25,
};

const MAX_COPIES = 3;
let aliasTable, cids, idToType, built = false;

self.onmessage = function (e) {
    const { cardsData, requirements, trials } = e.data;

    if (!built) {
        cids = cardsData.map(c => c.id);
        const maxId = Math.max(...cids);
        idToType = new Uint8Array(maxId + 1);
        cardsData.forEach(c => {
            idToType[c.id] = typeNameToId[c.type];
        });

        const pdf = new Float64Array(cardsData.length);
        pdf[0] = cardsData[0].cdf;
        for (let i = 1; i < cardsData.length; i++) {
            pdf[i] = cardsData[i].cdf - cardsData[i - 1].cdf;
        }

        aliasTable = buildAlias(pdf);
        built = true;
    }

    let hits = 0;
    for (let i = 0; i < trials; i++) {
        const deck = sampleDeck(trials /*ignored*/, cids, aliasTable);
        if (validate(deck, requirements)) hits++;
    }

    self.postMessage({ hits });
};

function buildAlias(pdf) {
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

    return { prob, alias };
}

function sampleSlot(aliasTable, cids) {
    const i = (Math.random() * aliasTable.prob.length) | 0;
    return Math.random() < aliasTable.prob[i]
        ? cids[i]
        : cids[aliasTable.alias[i]];
}

function sampleDeck(_, cids, aliasTable) {
    const deck = [];
    const counts = new Uint8Array(idToType.length);

    while (deck.length < 40) {
        const pick = sampleSlot(aliasTable, cids);
        if (++counts[pick] <= MAX_COPIES) {
            deck.push(pick);
        } else {
            counts[pick]--;
        }
    }
    return deck;
}

function validate(deck, requirements) {
    const cardCount = new Uint8Array(idToType.length);
    const typeCount = new Uint8Array(26);

    for (let cid of deck) {
        cardCount[cid]++;
        typeCount[idToType[cid]]++;
    }

    for (let r of requirements) {
        let total = 0;
        for (let id of r.alts) {
            total += (r.kind === 'card' ? cardCount[id] : typeCount[id]);
        }
        if (total < r.min || total > r.max) return false;
    }
    return true;
}
