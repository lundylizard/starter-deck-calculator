self.onmessage = function (e) {
    const { cardsData, requirements, trials } = e.data;
    const typeNameToId = {
        dragon: 1, spellcaster: 2, zombie: 3, warrior: 4,
        beastwarrior: 5, beast: 6, wingedbeast: 7, fiend: 8,
        fairy: 9, insect: 10, dinosaur: 11, reptile: 12,
        fish: 13, seaserpent: 14, machine: 15, thunder: 16,
        aqua: 17, pyro: 18, rock: 19, plant: 20,
        magic: 21, field: 22, trap: 23, ritual: 24,
        equip: 25,
    };

    const idToType = {};
    for (const [name, id] of Object.entries(typeNameToId)) {
        idToType[id] = name;
    }

    const cids = cardsData.map(c => c.id);
    const cdf = cardsData.map(c => c.cdf);

    function sampleDeck(size) {
        return Array.from({ length: size }, () => {
            const r = Math.random();
            let lo = 0, hi = cdf.length - 1;
            while (lo < hi) {
                const m = (lo + hi) >>> 1;
                if (cdf[m] < r) lo = m + 1;
                else hi = m;
            }
            return cids[lo];
        });
    }

    function validate(deck) {
        const cardCount = {}, typeCount = {};
        deck.forEach(cid => {
            const card = cardsData.find(c => c.id === cid);
            cardCount[cid] = (cardCount[cid] || 0) + 1;
            const tid = typeNameToId[card.type];
            typeCount[tid] = (typeCount[tid] || 0) + 1;
        });

        for (const r of requirements) {
            const total = r.alts.reduce((sum, id) => sum + (r.kind === 'card' ? (cardCount[id] || 0) : (typeCount[id] || 0)), 0);
            if (total < r.min || (r.max > r.min && total > r.max)) return false;
        }
        return true;
    }

    let hits = 0;
    for (let i = 0; i < trials; i++) {
        const deck = sampleDeck(40);
        if (validate(deck)) hits++;
    }

    self.postMessage({ hits, trials });
};
