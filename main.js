const typeNameToId = {
    dragon: 1, spellcaster: 2, zombie: 3, warrior: 4,
    beastwarrior: 5, beast: 6, wingedbeast: 7, fiend: 8,
    fairy: 9, insect: 10, dinosaur: 11, reptile: 12,
    fish: 13, seaserpent: 14, machine: 15, thunder: 16,
    aqua: 17, pyro: 18, rock: 19, plant: 20,
    magic: 21, field: 22, trap: 23, ritual: 24,
    equip: 25
};

let cardsData = [], nameToId = {}, nameToIdNormalized = {};
let starterPools = [];

function setCookie(name, value, days = 365) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/`;
}

function getCookie(name) {
    return document.cookie.split('; ').reduce((r, v) => {
        const [k, val] = v.split('=');
        return k === name ? decodeURIComponent(val) : r;
    }, '');
}

async function loadCardData() {
    const res = await fetch('assets/pools.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    starterPools = await res.json();

    const cardMap = new Map();
    for (const pool of starterPools) {
        for (const card of pool.cards) {
            if (!cardMap.has(card.card_id)) {
                cardMap.set(card.card_id, {
                    id: card.card_id,
                    name: card.card_name,
                    type: card.type_id || null
                });
            }
        }
    }

    cardsData = Array.from(cardMap.values());
    nameToId = Object.fromEntries(cardsData.map(c => [c.name, c.id]));
    nameToIdNormalized = Object.fromEntries(cardsData.map(c => [c.name.toLowerCase(), c.id]));

    populateCardDatalist();
}

function populateCardDatalist() {
    const dl = document.getElementById('cardList');
    dl.innerHTML = '';
    cardsData.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        dl.appendChild(opt);
    });
}

function resolveCardName(input) {
    const key = input.trim().toLowerCase();
    if (!key) return null;
    if (nameToIdNormalized[key]) return nameToIdNormalized[key];
    const matches = cardsData.filter(c => c.name.toLowerCase().startsWith(key));
    return matches.length === 1 ? matches[0].id : null;
}

function resolveRequirements(rawReqs) {
    return rawReqs.map(r => ({
        kind: r.kind,
        alts: r.altsRaw.map(v => r.kind === 'card' ? resolveCardName(v) : typeNameToId[v]).filter(Boolean),
        min: r.min,
        max: r.max
    }));
}

function createRequirementGroup(initial = { kind: 'card', altsRaw: [''], min: 1, max: 1 }) {
    const g = document.createElement('div');
    g.className = 'requirement-group';
    g.innerHTML = `
      <div class="group-header">
        <select class="req-kind">
          <option value="card">Card</option>
          <option value="type">Type</option>
        </select>
        <button class="add-alt button-like">+ Alternative</button>
        <button class="remove-group button-like">Remove</button>
      </div>
      <div class="alternatives-list"></div>
      <div class="range-inputs">
        <label>Min: <input type="number" class="req-min" min="0"/></label>
        <label>Max: <input type="number" class="req-max" min="0"/></label>
      </div>
    `;

    const kindSel = g.querySelector('.req-kind');
    const altList = g.querySelector('.alternatives-list');
    const addAlt = g.querySelector('.add-alt');
    const removeG = g.querySelector('.remove-group');
    const minIn = g.querySelector('.req-min');
    const maxIn = g.querySelector('.req-max');

    function addAltRow(pref = '') {
        const row = document.createElement('div');
        row.className = 'alt-item';

        if (kindSel.value === 'card') {
            row.innerHTML = `
          <input type="text" list="cardList" class="alt-value" placeholder="Card name" />
          <button class="remove-alt button-like">×</button>
        `;
        } else {
            const options = Object.keys(typeNameToId).map(t =>
                `<option value="${t}">${t[0].toUpperCase() + t.slice(1)}</option>`).join('');
            row.innerHTML = `
          <select class="alt-value">${options}</select>
          <button class="remove-alt button-like">×</button>
        `;
        }

        const input = row.querySelector('.alt-value');
        input.value = pref;
        input.addEventListener('input', () => {
            const id = kindSel.value === 'card' ? resolveCardName(input.value) : typeNameToId[input.value];
            input.classList.toggle('invalid', id == null);
        });
        row.querySelector('.remove-alt').addEventListener('click', () => row.remove());

        altList.appendChild(row);
    }

    kindSel.addEventListener('change', () => {
        altList.innerHTML = '';
        addAltRow();
    });

    addAlt.addEventListener('click', () => addAltRow());
    removeG.addEventListener('click', () => g.remove());

    kindSel.value = initial.kind;
    kindSel.dispatchEvent(new Event('change'));
    initial.altsRaw.forEach((alt, index) => {
        if (index === 0) {
            altList.querySelector('.alt-value').value = alt;
        } else {
            addAltRow(alt);
        }
    });

    minIn.value = initial.min;
    maxIn.value = initial.max;

    return g;
}

function getRawReqs() {
    return Array.from(document.querySelectorAll('.requirement-group')).map(g => ({
        kind: g.querySelector('.req-kind').value,
        altsRaw: Array.from(g.querySelectorAll('.alt-value')).map(el => el.value.trim()).filter(Boolean),
        min: parseInt(g.querySelector('.req-min').value, 10) || 0,
        max: parseInt(g.querySelector('.req-max').value, 10) || 0,
    }));
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("perfStats div:", document.getElementById('perfStats'));

    const addBtn = document.getElementById('addRequirement');
    const runBtn = document.getElementById('runSim');
    const trialInput = document.getElementById('trialCount');
    const lagWarning = document.getElementById('lagWarning');
    const reqList = document.querySelector('.requirements-list');
    const summary = document.getElementById('summary');
    const output = document.getElementById('output');

    function updateLagWarning() {
        lagWarning.classList.toggle('hidden', (parseInt(trialInput.value, 10) || 0) <= 10000000);
    }
    trialInput.addEventListener('input', updateLagWarning);
    updateLagWarning();

    try {
        await loadCardData();
        const savedReqs = JSON.parse(getCookie('deckReqs') || '[]');
        savedReqs.forEach(r => reqList.appendChild(createRequirementGroup(r)));
    } catch (e) {
        output.textContent = `Error: ${e.message}`;
        return;
    }

    addBtn.addEventListener('click', () => reqList.appendChild(createRequirementGroup()));

    const poolSize = navigator.hardwareConcurrency || 4;
    const workerPool = Array.from({ length: poolSize }, () => new Worker('simWorker.js'));

    function runSimulationMultiThreaded(reqs, trials, numThreads, onDone) {
        const per = Math.floor(trials / numThreads);
        const remainder = trials % numThreads;
        let completed = 0, totalHits = 0;
        let totalCardCount = new Uint32Array(3000);
    
        const start = performance.now(); // ⏱️ Start timing
    
        workerPool.forEach((worker, i) => {
            const t = per + (i === 0 ? remainder : 0);
            worker.onmessage = e => {
                totalHits += e.data.hits;
                const countArray = e.data.cardDrawCount;
                for (let j = 0; j < countArray.length; j++) {
                    totalCardCount[j] += countArray[j];
                }
    
                if (++completed === numThreads) {
                    const end = performance.now(); // ⏱️ End timing
                    const elapsed = (end - start) / 1000;
                    const trialsPerSec = (trials / elapsed).toFixed(1);
    
                    console.log(`Simulated ${trials} decks in ${elapsed.toFixed(2)}s (${trialsPerSec} decks/sec)`);
    
                    const pct = totalHits / trials * 100;
                    onDone(pct, totalCardCount, trials, trialsPerSec, elapsed);
                }
            };
    
            worker.postMessage({ starterPools, requirements: reqs, trials: t });
        });
    }

    runBtn.addEventListener('click', () => {
        const trials = parseInt(trialInput.value, 10) || 1000000;
        const rawReqs = getRawReqs();
        setCookie('deckReqs', JSON.stringify(rawReqs));
        const resolvedReqs = resolveRequirements(rawReqs);

        output.textContent = 'Running…';
        runSimulationMultiThreaded(resolvedReqs, trials, workerPool.length, (pct, cardDrawCount, totalTrials, rate, elapsed) => {
            const oneIn = pct > 0 ? Math.round(100 / pct) : '∞';
            output.textContent = `Probability: ${pct.toFixed(4)}% (1 in ${oneIn})`;
        
            const perfStats = document.getElementById('perfStats');
            perfStats.textContent = `${rate} decks/sec (took ${elapsed.toFixed(2)} sec)`;
        
            summary.classList.remove('hidden');
            summary.innerHTML = buildSummary(rawReqs, cardDrawCount, totalTrials);
        });
        
    });

    function buildSummary(reqs) {
        const itemsList = reqs.map(r => {
            const kind = r.kind;
            const alts = r.altsRaw.map(v =>
                kind === 'card' ? cardsData.find(c => c.id === resolveCardName(v))?.name || v : v
            ).join(' or ');
            const label = r.min === r.max ? `${r.min}` : `between ${r.min} and ${r.max}`;
            return `<li>${label} of <em>${alts}</em></li>`;
        }).join('');
        return `<strong>The deck should have:</strong><ul>${itemsList}</ul>`;
    }
});
