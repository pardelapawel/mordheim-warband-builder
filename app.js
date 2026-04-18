/**
 * Mordheim Warband Builder logic
 */

let masterData = {
    fighters: [],
    equipment: [],
    skills: []
};

let currentWarband = {
    name: "My New Warband",
    fighters: []
};

let lastFocusedInput = null; // { cardIndex: number, type: 'equipment' | 'skills' }

// Initialize app
async function init() {
    try {
        const response = await fetch('data.json');
        masterData = await response.json();
    } catch (e) {
        console.warn("Could not load data.json", e);
    }

    initTheme();
    loadFromCache();
    renderWarband();
    renderSavedList();
}

// Theme Logic
function initTheme() {
    const savedTheme = localStorage.getItem('warband_theme') || 'light-mode';
    document.body.className = savedTheme;
    
    document.getElementById('theme-toggle-btn').onclick = () => {
        const current = document.body.className;
        const next = current === 'light-mode' ? 'dark-mode' : 'light-mode';
        document.body.className = next;
        localStorage.setItem('warband_theme', next);
    };
}

// Rendering
function renderWarband() {
    const grid = document.getElementById('card-grid');
    const placeholder = document.getElementById('add-card-placeholder');
    
    grid.querySelectorAll('.card-wrapper').forEach(el => el.remove());

    document.getElementById('warband-name').value = currentWarband.name;

    currentWarband.fighters.forEach((fighter, index) => {
        const card = createFighterCard(fighter, index);
        grid.insertBefore(card, placeholder);
    });

    updateTotalCost();
    restoreFocus();
}

function restoreFocus() {
    if(!lastFocusedInput) return;
    const cards = document.querySelectorAll('.fighter-card');
    const targetCard = cards[lastFocusedInput.cardIndex];
    if(targetCard) {
        const selector = lastFocusedInput.type === 'equipment' ? '.equipment-input' : '.skills-input';
        const input = targetCard.querySelector(selector);
        if(input) input.focus();
    }
}

function createFighterCard(data, index) {
    const template = document.getElementById('fighter-card-template');
    const clone = template.content.cloneNode(true);
    const wrapper = clone.querySelector('.card-wrapper');
    const cardEl = clone.querySelector('.fighter-card');

    // Populate Type Select
    const typeSelect = cardEl.querySelector('.fighter-type-select');
    masterData.fighters.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.name;
        if(data.typeId === f.id) opt.selected = true;
        typeSelect.appendChild(opt);
    });

    const typeInput = cardEl.querySelector('.fighter-type-input');
    const baseCostInput = cardEl.querySelector('.fighter-base-cost');

    typeSelect.onchange = () => {
        const selected = masterData.fighters.find(f => f.id === typeSelect.value);
        if(selected) {
            applyFighterType(index, selected);
            renderWarband();
            saveToCache();
        }
    };

    // Fill Basic Info
    const nameInput = cardEl.querySelector('.fighter-name');
    nameInput.value = data.customName || '';
    nameInput.oninput = () => {
        currentWarband.fighters[index].customName = nameInput.value;
        saveToCache();
    };

    typeInput.value = data.type || '';
    typeInput.oninput = () => {
        currentWarband.fighters[index].type = typeInput.value;
        saveToCache();
    };

    baseCostInput.value = data.baseCost || 0;
    baseCostInput.oninput = () => {
        currentWarband.fighters[index].baseCost = parseInt(baseCostInput.value) || 0;
        updateTotalCost();
        saveToCache();
        cardEl.querySelector('.fighter-total-cost').textContent = calculateFighterCost(currentWarband.fighters[index]);
    };

    // Stats
    const stats = ['m', 'ws', 'bs', 's', 't', 'w', 'i', 'a', 'ld'];
    stats.forEach(s => {
        const input = cardEl.querySelector(`.stat-${s}`);
        input.value = data.stats[s];
        input.onchange = (e) => {
            currentWarband.fighters[index].stats[s] = parseInt(e.target.value) || 0;
            saveToCache();
        };
    });

    // Lists
    const eqListEl = cardEl.querySelector('.equipment-list');
    data.equipment.forEach((item, itemIdx) => {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
            <div class="item-content">
                <span>${item.name}</span>
                <span class="cost-hint no-print">
                    (<input type="number" class="item-cost-edit" value="${item.cost}"> gc)
                </span>
            </div>
            <span class="item-delete no-print">&times;</span>
        `;
        
        const costEdit = row.querySelector('.item-cost-edit');
        costEdit.oninput = () => {
            currentWarband.fighters[index].equipment[itemIdx].cost = parseInt(costEdit.value) || 0;
            updateTotalCost();
            saveToCache();
            cardEl.querySelector('.fighter-total-cost').textContent = calculateFighterCost(currentWarband.fighters[index]);
        };

        row.querySelector('.item-delete').onclick = () => {
            currentWarband.fighters[index].equipment.splice(itemIdx, 1);
            renderWarband();
            saveToCache();
        };
        eqListEl.appendChild(row);
    });

    const skillListEl = cardEl.querySelector('.skills-list');
    data.skills.forEach((skill, skillIdx) => {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `<span>${skill.name}</span><span class="item-delete no-print">&times;</span>`;
        row.querySelector('.item-delete').onclick = () => {
            currentWarband.fighters[index].skills.splice(skillIdx, 1);
            renderWarband();
            saveToCache();
        };
        skillListEl.appendChild(row);
    });

    // Datalists
    const eqDatalist = cardEl.querySelector('#equipment-options');
    const skillDatalist = cardEl.querySelector('#skill-options');
    masterData.equipment.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.name;
        eqDatalist.appendChild(opt);
    });
    masterData.skills.forEach(skill => {
        const opt = document.createElement('option');
        opt.value = skill.name;
        skillDatalist.appendChild(opt);
    });

    // Add Logic
    const eqInput = cardEl.querySelector('.equipment-input');
    const skillInput = cardEl.querySelector('.skills-input');

    const handleAdd = (type, input) => {
        const val = input.value.trim();
        if(!val) return;

        lastFocusedInput = { cardIndex: index, type: type };

        if(type === 'equipment') {
            const found = masterData.equipment.find(i => i.name.toLowerCase() === val.toLowerCase());
            const cost = found ? found.cost : 0; 
            currentWarband.fighters[index].equipment.push({ name: val, cost: cost });
        } else {
            currentWarband.fighters[index].skills.push({ name: val });
        }
        input.value = '';
        renderWarband();
        saveToCache();
    };

    // Auto-add on exact match
    const setupAutoAdd = (input, type) => {
        input.oninput = () => {
            const list = type === 'equipment' ? masterData.equipment : masterData.skills;
            const match = list.find(i => i.name.toLowerCase() === input.value.toLowerCase());
            if(match && input.value === match.name) handleAdd(type, input);
        };
        input.onfocus = () => { lastFocusedInput = { cardIndex: index, type: type }; };
        input.onkeydown = (e) => {
            if(e.key === 'Enter') {
                e.preventDefault();
                handleAdd(type, input);
            }
        };
    };

    setupAutoAdd(eqInput, 'equipment');
    setupAutoAdd(skillInput, 'skills');

    // Remove Card
    wrapper.querySelector('.remove-btn').onclick = () => {
        currentWarband.fighters.splice(index, 1);
        renderWarband();
        saveToCache();
    };

    // Cost
    const totalCardCost = calculateFighterCost(data);
    cardEl.querySelector('.fighter-total-cost').textContent = totalCardCost;

    const warnings = checkValidation(data);
    const warningEl = cardEl.querySelector('.validation-warnings');
    warningEl.innerHTML = warnings.map(w => `<div>⚠ ${w}</div>`).join('');

    return wrapper;
}

function applyFighterType(index, base) {
    const fighter = currentWarband.fighters[index];
    fighter.typeId = base.id;
    fighter.type = base.name;
    fighter.baseCost = base.cost;
    fighter.stats = { m: base.m, ws: base.ws, bs: base.bs, s: base.s, t: base.t, w: base.w, i: base.i, a: base.a, ld: base.ld };
    fighter.requirements = base.requirements || null;
}

function calculateFighterCost(fighter) {
    let cost = parseInt(fighter.baseCost) || 0;
    fighter.equipment.forEach(item => cost += (parseInt(item.cost) || 0));
    return cost;
}

function updateTotalCost() {
    let total = 0;
    currentWarband.fighters.forEach(f => {
        total += calculateFighterCost(f);
    });
    document.getElementById('total-cost-value').textContent = total;
}

function checkValidation(fighter) {
    const warnings = [];
    const eqTags = fighter.equipment.flatMap(e => {
        const found = masterData.equipment.find(m => m.name === e.name);
        return found ? (found.tags || []) : [];
    });
    if(fighter.requirements) {
        if(fighter.requirements.noArmorIfWizard && eqTags.includes('armor')) warnings.push("Wizards cannot wear armor.");
        if(fighter.requirements.noBlackPowder && eqTags.includes('black-powder')) warnings.push("Elves cannot use black-powder.");
    }
    return warnings;
}

// State Management
function addFighter() {
    currentWarband.fighters.push({
        typeId: "", type: "New Hero", customName: "", baseCost: 0,
        stats: { m: 0, ws: 0, bs: 0, s: 0, t: 0, w: 0, i: 0, a: 0, ld: 0 },
        equipment: [], skills: [], requirements: null
    });
    renderWarband();
    saveToCache();
}

function saveToCache() {
    currentWarband.name = document.getElementById('warband-name').value;
    localStorage.setItem('mordheim_current', JSON.stringify(currentWarband));
    
    let saved = JSON.parse(localStorage.getItem('mordheim_saves') || '[]');
    const idx = saved.findIndex(s => s.name === currentWarband.name);
    if(idx > -1) saved[idx] = currentWarband;
    else saved.push(JSON.parse(JSON.stringify(currentWarband)));
    localStorage.setItem('mordheim_saves', JSON.stringify(saved));
    renderSavedList();
}

function loadFromCache() {
    const saved = localStorage.getItem('mordheim_current');
    if(saved) currentWarband = JSON.parse(saved);
}

function renderSavedList() {
    const list = document.getElementById('saved-warbands-list');
    list.innerHTML = '';
    const saved = JSON.parse(localStorage.getItem('mordheim_saves') || '[]');
    saved.forEach((s, idx) => {
        const li = document.createElement('li');
        li.className = 'saved-item';
        li.style.display = 'flex'; li.style.justifyContent = 'space-between'; li.style.padding = '5px 0'; li.style.borderBottom = '1px solid var(--border-color)';
        li.innerHTML = `<span style="cursor:pointer">${s.name}</span><span class="delete-save-btn" style="color:var(--danger); cursor:pointer">&times;</span>`;
        li.querySelector('span').onclick = () => { currentWarband = JSON.parse(JSON.stringify(s)); renderWarband(); };
        li.querySelector('.delete-save-btn').onclick = (e) => { e.stopPropagation(); saved.splice(idx, 1); localStorage.setItem('mordheim_saves', JSON.stringify(saved)); renderSavedList(); };
        list.appendChild(li);
    });
}

// Global Actions
document.getElementById('add-card-placeholder').onclick = addFighter;
document.getElementById('save-cache-btn').onclick = saveToCache;
document.getElementById('warband-name').onchange = saveToCache;
document.getElementById('export-json-btn').onclick = () => {
    const blob = new Blob([JSON.stringify(currentWarband, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${currentWarband.name.replace(/\s+/g, '_')}.json`; a.click();
};
document.getElementById('import-json-input').onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (event) => { currentWarband = JSON.parse(event.target.result); renderWarband(); saveToCache(); };
    reader.readAsText(file);
};
document.getElementById('print-pdf-btn').onclick = () => { window.print(); };
document.getElementById('clear-all-btn').onclick = () => {
    if(confirm("Clear this warband?")) { currentWarband = { name: "New Warband", fighters: [] }; renderWarband(); saveToCache(); }
};

init();
