/**
 * Mordheim Warband Builder logic
 */

let ruleSets = [];
let masterData = {
    fighters: [],
    equipment: [],
    skills: [],
    spells: [],
    spellsByList: {}
};

let currentWarband = {
    name: "My New Warband",
    ruleSetId: "",
    warbandTypeId: "",
    fighters: []
};

let lastFocusedInput = null; // { cardIndex: number, type: 'equipment' | 'skills' }

// Initialize app
async function init() {
    initTheme();
    initMobileUI();
    initScrollHeader();

    try {
        const rsResp = await fetch('data/rule_sets.json');
        ruleSets = await rsResp.json();
    } catch (e) {
        console.error("Could not load rule sets manifest", e);
    }

    setupRuleSelectors();
    loadFromCache();

    // Default to first rule set if none selected
    if (!currentWarband.ruleSetId && ruleSets.length > 0) {
        currentWarband.ruleSetId = ruleSets[0].name;
    }

    if (currentWarband.ruleSetId) {
        await applyRuleSet(currentWarband.ruleSetId, false);
        // Default to first warband type if none selected
        if (!currentWarband.warbandTypeId) {
            const rs = ruleSets.find(r => r.name === currentWarband.ruleSetId);
            if (rs && rs.warbands.length > 0) {
                currentWarband.warbandTypeId = rs.warbands[0].id;
            }
        }
        if (currentWarband.warbandTypeId) {
            await applyWarbandType(currentWarband.warbandTypeId, false);
        }
    }

    renderWarband();
    renderSavedList();
}

function setupRuleSelectors() {
    const rsSelect = document.getElementById('rule-set-select');
    const wtSelect = document.getElementById('warband-type-select');

    rsSelect.innerHTML = '';
    ruleSets.forEach(rs => {
        const opt = document.createElement('option');
        opt.value = rs.name;
        opt.textContent = rs.name;
        rsSelect.appendChild(opt);
    });

    rsSelect.onchange = async () => {
        const newRuleSet = ruleSets.find(r => r.name === rsSelect.value);
        let firstWbId = "";
        if (newRuleSet && newRuleSet.warbands.length > 0) {
            firstWbId = newRuleSet.warbands[0].id;
        }
        await applyRuleSet(rsSelect.value, false);
        if (firstWbId) await applyWarbandType(firstWbId);
        saveToCache();
    };

    wtSelect.onchange = async () => {
        await applyWarbandType(wtSelect.value);
        saveToCache();
    };
}

async function applyRuleSet(id, shouldRender = true) {
    if (!id) return;
    currentWarband.ruleSetId = id;
    const rs = ruleSets.find(r => r.name === id);
    if (!rs) return;

    // Helper to normalize name to folder name (e.g. "Dragon Rock" -> "dragon_rock")
    const folderName = id.toLowerCase().replace(/\s+/g, '_');

    // Helper to flatten nested object of arrays
    const flatten = (obj) => Object.values(obj).flat();

    // Load data
    try {
        const [eq, sk, sp] = await Promise.all([
            fetch(`data/${folderName}/equipment.json`).then(r => r.json()),
            fetch(`data/${folderName}/skills.json`).then(r => r.json()),
            fetch(`data/${folderName}/spells.json`).then(r => r.json())
        ]);

        masterData.equipment = [];
        for (const [cat, items] of Object.entries(eq)) {
            items.forEach(i => {
                i.originCategory = cat;
                masterData.equipment.push(i);
            });
        }

        masterData.skills = flatten(sk);
        masterData.spells = flatten(sp);
        masterData.spellsByList = sp; // Keep structured for context-aware selection

        populateGlobalDatalists();
    } catch (e) {
        console.error("Error loading rule set data", e);
    }

    // Update Warband Type Select
    const wtSelect = document.getElementById('warband-type-select');
    wtSelect.disabled = false;
    wtSelect.innerHTML = '';
    rs.warbands.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.id;
        opt.textContent = w.name;
        wtSelect.appendChild(opt);
    });

    if (shouldRender) renderWarband();
}

function populateGlobalDatalists() {
    const eqDatalist = document.getElementById('equipment-options');
    const skillDatalist = document.getElementById('skill-options');
    if (!eqDatalist || !skillDatalist) return;

    eqDatalist.innerHTML = '';
    skillDatalist.innerHTML = '';

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
}

async function applyWarbandType(id, shouldRender = true) {
    currentWarband.warbandTypeId = id;
    const rs = ruleSets.find(r => r.name === currentWarband.ruleSetId);
    if (!rs) return;

    const wb = rs.warbands.find(w => w.id === id);
    if (wb) {
        try {
            const folderName = rs.name.toLowerCase().replace(/\s+/g, '_');
            const resp = await fetch(`data/${folderName}/warbands/${wb.file}`);
            const data = await resp.json();
            masterData.fighters = data.fighters;
        } catch (e) {
            console.error("Error loading warband type data", e);
        }
    } else {
        masterData.fighters = [];
    }

    if (shouldRender) renderWarband();
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

function initMobileUI() {
    const mgr = document.getElementById('save-manager');
    const toggleBtn = document.getElementById('save-manager-toggle');

    if (window.innerWidth <= 768) {
        mgr.classList.add('collapsed');
    }

    toggleBtn.onclick = () => {
        mgr.classList.toggle('collapsed');
        toggleBtn.textContent = mgr.classList.contains('collapsed') ? 'Cached ▴' : 'Cached ▾';
    };
}

function initScrollHeader() {
    const header = document.querySelector('.app-header');
    const SCROLL_THRESHOLD = 60;

    window.addEventListener('scroll', () => {
        if (window.scrollY > SCROLL_THRESHOLD) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }, { passive: true });
}

// Rendering
function renderWarband() {
    const grid = document.getElementById('card-grid');
    const placeholder = document.getElementById('add-card-placeholder');

    const scrollPos = window.scrollY;

    grid.querySelectorAll('.card-wrapper').forEach(el => el.remove());

    document.getElementById('warband-name').value = currentWarband.name;
    document.getElementById('rule-set-select').value = currentWarband.ruleSetId || "";
    document.getElementById('warband-type-select').value = currentWarband.warbandTypeId || "";
    document.getElementById('warband-type-select').disabled = !currentWarband.ruleSetId;

    currentWarband.fighters.forEach((fighter, index) => {
        const card = createFighterCard(fighter, index);
        grid.insertBefore(card, placeholder);
    });

    updateTotalCost();
    updateLegend();
    restoreFocus();

    window.scrollTo(0, scrollPos);
}

function updateLegend() {
    const sidebar = document.getElementById('legend-sidebar');
    if (!sidebar) return;

    const usedTerms = new Set();
    const equipment = [];
    const skills = [];
    const spells = [];

    // Collect terms
    currentWarband.fighters.forEach(f => {
        f.equipment.forEach(e => usedTerms.add(e.name.trim()));
        f.skills.forEach(s => {
            // Extract spell name if format is "Skill Name (Spell Name)"
            const spellMatch = s.name.match(/\((.*)\)/);
            if (spellMatch) {
                usedTerms.add(spellMatch[1].trim());
            }
            usedTerms.add(s.name.trim());
        });
    });

    const categories = {
        'Melee Weapons': { icon: 'swords', items: [], order: 1 },
        'Ranged Weapons': { icon: 'target', items: [], order: 2 },
        'Armor': { icon: 'shield', items: [], order: 3 },
        'Items': { icon: 'inventory_2', items: [], order: 4 },
        'Skills': { icon: 'star_shine', items: [], order: 5 },
        'Spells': { icon: 'auto_fix_high', items: [], order: 6 }
    };

    const addedNames = new Set();

    usedTerms.forEach(term => {
        if (!term) return;
        let found = null;
        let category = null;

        const termLower = term.toLowerCase();

        // 1. Search Spells
        found = masterData.spells.find(s => s.name.toLowerCase() === termLower);
        if (found) {
            category = 'Spells';
        } else {
            // 2. Search Equipment
            const eq = masterData.equipment.find(e => e.name.toLowerCase() === termLower);
            if (eq) {
                found = eq;
                if (eq.originCategory === 'melee_weapons') category = 'Melee Weapons';
                else if (eq.originCategory === 'ranged_weapons') category = 'Ranged Weapons';
                else if (eq.originCategory === 'armor') category = 'Armor';
                else category = 'Items';
            } else {
                // 3. Search Skills
                found = masterData.skills.find(s => s.name.toLowerCase() === termLower);
                if (found) category = 'Skills';
            }
        }

        if (found && category && !addedNames.has(found.name)) {
            categories[category].items.push(found);
            addedNames.add(found.name);
        }
    });

    // Render HTML
    let html = '<h2 class="legend-title">Warband Glossary</h2>';
    let hasContent = false;

    // Sort categories by order
    const sortedCats = Object.entries(categories).sort((a, b) => a[1].order - b[1].order);

    for (const [catName, catData] of sortedCats) {
        if (catData.items.length > 0) {
            hasContent = true;
            html += `
                <div class="legend-group">
                    <h3 class="legend-group-title">
                        <span class="material-symbols-outlined">${catData.icon}</span>
                        ${catName}
                    </h3>
                    <div class="legend-items-list">
                        ${catData.items.sort((a, b) => a.name.localeCompare(b.name)).map(item => `
                            <div class="legend-item">
                                <span class="legend-item-name">${item.name}${item.difficulty ? ' (' + item.difficulty + ')' : ''}</span>
                                <span class="legend-item-desc">${item.description || item.special || ''}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    sidebar.innerHTML = html;
    if (hasContent) sidebar.classList.add('active');
    else sidebar.classList.remove('active');
}

function restoreFocus() {
    if (!lastFocusedInput) return;

    // Disable auto-focus on mobile to prevent keyboard/datalist loops
    if (window.innerWidth <= 768) {
        lastFocusedInput = null;
        return;
    }

    const cards = document.querySelectorAll('.fighter-card');
    const targetCard = cards[lastFocusedInput.cardIndex];
    if (targetCard) {
        const selector = lastFocusedInput.type === 'equipment' ? '.equipment-input' : '.skills-input';
        const input = targetCard.querySelector(selector);
        if (input) input.focus();
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
        const fid = f.id || f.name;
        opt.value = fid;
        opt.textContent = f.name;
        if (data.typeId === fid) opt.selected = true;
        typeSelect.appendChild(opt);
    });

    const typeInput = cardEl.querySelector('.fighter-type-input');
    const raceInput = cardEl.querySelector('.fighter-race-input');
    const baseCostInput = cardEl.querySelector('.fighter-base-cost');

    typeSelect.onchange = () => {
        typeSelect.blur();
        const selected = masterData.fighters.find(f => (f.id || f.name) === typeSelect.value);
        if (selected) {
            applyFighterType(index, selected);
            renderWarband();
            saveToCache();
        }
    };

    // Flags (Large, Wizard, Exp)
    const flagsEl = cardEl.querySelector('.fighter-flags');
    if (data.is_large) {
        const span = document.createElement('span');
        span.className = 'flag-badge danger';
        span.textContent = 'Large Target';
        //flagsEl.appendChild(span);
    }
    // if (data.spell_list) {
    //     const span = document.createElement('span');
    //     span.className = 'flag-badge highlight';
    //     span.textContent = 'Wizard';
    //     flagsEl.appendChild(span);
    // }
    // if (data.exp_start > 0) {
    //     const span = document.createElement('span');
    //     span.className = 'flag-badge secondary';
    //     span.textContent = `Start Exp: ${data.exp_start}`;
    //     flagsEl.appendChild(span);
    // }

    // Fill Basic Info
    const nameInput = cardEl.querySelector('.fighter-name');
    nameInput.value = data.customName || '';
    const resizeName = () => { nameInput.style.height = 'auto'; nameInput.style.height = nameInput.scrollHeight + 'px'; };
    nameInput.oninput = () => {
        currentWarband.fighters[index].customName = nameInput.value;
        saveToCache();
        resizeName();
    };
    setTimeout(resizeName, 0);

    const rerollBtn = cardEl.querySelector('.reroll-name-btn');
    rerollBtn.onclick = () => {
        const fighter = currentWarband.fighters[index];
        const newName = NameGenerator.generate(fighter);
        fighter.customName = newName;
        nameInput.value = newName;
        saveToCache();
        resizeName();
    };

    typeInput.textContent = data.type || '';
    typeInput.oninput = () => {
        currentWarband.fighters[index].type = typeInput.textContent.trim();
        saveToCache();
    };
    typeInput.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); typeInput.blur(); } };

    if (raceInput) {
        raceInput.textContent = data.race || '';
        raceInput.oninput = () => {
            currentWarband.fighters[index].race = raceInput.textContent.trim();
            saveToCache();
        };
        raceInput.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); raceInput.blur(); } };
    }

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

    // Helper to get which list element an equipment item belongs to
    const getEqListEl = (item) => {
        const cat = item.originCategory ||
            (masterData.equipment.find(e => e.name.toLowerCase() === item.name.toLowerCase()) || {}).originCategory || '';
        if (cat === 'melee_weapons') return cardEl.querySelector('.melee-list');
        if (cat === 'ranged_weapons') return cardEl.querySelector('.ranged-list');
        if (cat === 'armor') return cardEl.querySelector('.armor-list');
        return cardEl.querySelector('.items-list');
    };

    // Lists
    data.equipment.forEach((item, itemIdx) => {
        const listEl = getEqListEl(item);
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
            <div class="item-content">
                <textarea class="item-name-edit item-name" rows="1">${item.name}</textarea>
                <span class="cost-hint no-print">
                    (<input type="number" class="item-cost-edit" value="${item.cost}"> gc)
                </span>
            </div>
            <span class="item-delete no-print">&times;</span>
        `;

        const nameEdit = row.querySelector('.item-name');
        const resize = () => { nameEdit.style.height = 'auto'; nameEdit.style.height = nameEdit.scrollHeight + 'px'; };
        nameEdit.oninput = () => {
            currentWarband.fighters[index].equipment[itemIdx].name = nameEdit.value;
            saveToCache();
            resize();
        };
        setTimeout(resize, 0);

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
        if (listEl) listEl.appendChild(row);
    });

    // Mark empty equipment sections
    ['melee-section', 'ranged-section', 'armor-section', 'items-section'].forEach(cls => {
        const sec = cardEl.querySelector('.' + cls);
        if (sec) {
            const list = sec.querySelector('.item-list');
            sec.classList.toggle('section-empty', !list || list.children.length === 0);
        }
    });


    const skillListEl = cardEl.querySelector('.skills-list');
    data.skills.forEach((skill, skillIdx) => {
        const row = document.createElement('div');
        row.className = 'item-row';

        const isSpellList = skill.name.toLowerCase().includes('spell list') ||
            skill.name.toLowerCase().includes('magia') ||
            skill.name.toLowerCase().includes('modlitwy');

        row.innerHTML = `
            <div class="item-content">
                <textarea class="item-name-edit skill-name" rows="1">${skill.name}</textarea>
                ${isSpellList ? '<span class="add-spell-btn no-print" title="Pick Spell">➕</span>' : ''}
            </div>
            <span class="item-delete no-print">&times;</span>
        `;

        const nameEdit = row.querySelector('.skill-name');
        const resize = () => { nameEdit.style.height = 'auto'; nameEdit.style.height = nameEdit.scrollHeight + 'px'; };
        nameEdit.oninput = () => {
            currentWarband.fighters[index].skills[skillIdx].name = nameEdit.value;
            saveToCache();
            resize();
        };
        setTimeout(resize, 0);

        if (isSpellList) {
            const addBtn = row.querySelector('.add-spell-btn');
            addBtn.onclick = () => {
                let spells = [];
                // First check if the skill name itself implies a specific spell list
                const matchingList = Object.keys(masterData.spellsByList).find(listKey => 
                    skill.name.toLowerCase().includes(listKey.toLowerCase())
                );

                if (matchingList) {
                    spells = masterData.spellsByList[matchingList];
                } else if (data.spell_list && masterData.spellsByList[data.spell_list]) {
                    spells = masterData.spellsByList[data.spell_list];
                } else {
                    spells = masterData.spells; // fallback to all spells
                }

                if (spells.length === 0) {
                    alert("No spells available in database.");
                    return;
                }

                const select = document.createElement('select');
                select.className = 'inline-spell-picker no-print';
                select.innerHTML = '<option value="">-- Pick Spell --</option>';
                spells.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.name;
                    opt.textContent = `${s.name} (${s.difficulty})`;
                    select.appendChild(opt);
                });

                select.onchange = () => {
                    if (select.value) {
                        const current = nameEdit.value;
                        const suffix = ` (${select.value})`;
                        nameEdit.value = current.includes('(') ? current.replace(/\(.*\)/, suffix) : current + suffix;
                        currentWarband.fighters[index].skills[skillIdx].name = nameEdit.value;
                        saveToCache();
                        updateLegend();
                    }
                    select.remove();
                };
                addBtn.after(select);
            };
        }

        row.querySelector('.item-delete').onclick = () => {
            currentWarband.fighters[index].skills.splice(skillIdx, 1);
            renderWarband();
            saveToCache();
        };
        skillListEl.appendChild(row);
    });

    // Mark empty skills section
    const skillsSection = cardEl.querySelector('.skills-section');
    if (skillsSection) {
        const list = skillsSection.querySelector('.item-list');
        skillsSection.classList.toggle('section-empty', !list || list.children.length === 0);
    }

    // Add Logic and dynamic datalists
    const eqInput = cardEl.querySelector('.equipment-input');
    const skillInput = cardEl.querySelector('.skills-input');

    const handleAdd = (type, input) => {
        const val = input.value.trim();
        if (!val) return;

        lastFocusedInput = { cardIndex: index, type: type };

        if (type === 'equipment') {
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

    // Custom autocomplete to replace broken native mobile datalists
    const setupAutocomplete = (input, type) => {
        let container = input.parentElement;
        let listEl = document.createElement('ul');
        listEl.className = 'autocomplete-list';
        container.appendChild(listEl);

        const updateList = () => {
            let val = input.value.toLowerCase();
            let spellLists = Object.keys(masterData.spellsByList).map(k => ({ name: k }));
            let listData = type === 'equipment' ? masterData.equipment : [...masterData.skills, ...spellLists, ...masterData.spells];

            // If empty, show all. If typed, filter.
            let matches = listData;
            if (val) {
                matches = listData.filter(i => i.name.toLowerCase().includes(val));
            }

            listEl.innerHTML = '';
            if (matches.length === 0) {
                listEl.style.display = 'none';
                return;
            }

            matches.forEach(match => {
                let item = document.createElement('li');
                item.textContent = match.name;
                // mousedown prevents input blur before click 
                item.addEventListener('mousedown', (e) => e.preventDefault());
                item.onclick = () => {
                    input.value = match.name;
                    listEl.style.display = 'none';
                    handleAdd(type, input);
                };
                listEl.appendChild(item);
            });
            listEl.style.display = 'block';
        };

        input.addEventListener('input', updateList);
        input.addEventListener('focus', () => {
            lastFocusedInput = { cardIndex: index, type: type };
            updateList();
        });
        input.addEventListener('blur', () => {
            listEl.style.display = 'none';
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                listEl.style.display = 'none';
                handleAdd(type, input);
            }
        });
    };

    setupAutocomplete(eqInput, 'equipment');
    setupAutocomplete(skillInput, 'skills');

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
    fighter.templateName = base.name; // Keep the original template name
    fighter.typeId = base.id || base.name;
    fighter.type = base.name;
    fighter.race = base.race || "Człowiek";
    fighter.baseCost = base.cost;

    // Auto-generate name based on new race/type
    fighter.customName = NameGenerator.generate(base);

    // Add starting rules/skills
    const startingSkills = (base.rules || []).map(r => ({ name: r }));
    if (base.spell_list) {
        startingSkills.push({ name: `${base.spell_list}` });
    }
    fighter.skills = startingSkills;

    // Reset and add starting equipment (Free Dagger for non-animals/ogres)
    fighter.equipment = [];
    // const noDaggerRaces = ["Zwierzę", "Ogr", "Animal", "Ogre", "Zwierzę jaskiniowe"];
    // if (!noDaggerRaces.includes(fighter.race)) {
    //     fighter.equipment.push({ name: "Sztylet", cost: 0 });
    // }

    // Copy rules/flags
    fighter.is_large = base.is_large || false;
    fighter.spell_list = base.spell_list || null;
    fighter.exp_start = base.exp_start || 0;

    // Map stats from either base.stats or direct base properties
    const s = base.stats || base;
    fighter.stats = {
        m: s.m || 0, ws: s.ws || 0, bs: s.bs || 0,
        s: s.s || 0, t: s.t || 0, w: s.w || 0,
        i: s.i || 0, a: s.a || 0, ld: s.ld || 0
    };
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

    // Update compact sticky bar
    const compactCost = document.getElementById('compact-cost-value');
    if (compactCost) compactCost.textContent = total;
    const compactFighters = document.getElementById('compact-fighters-count');
    if (compactFighters) compactFighters.textContent = currentWarband.fighters.length;
    const compactName = document.getElementById('compact-warband-name');
    if (compactName) compactName.textContent = document.getElementById('warband-name').value || currentWarband.name;
}

function checkValidation(fighter) {
    const warnings = [];
    const eqTags = fighter.equipment.flatMap(e => {
        const found = masterData.equipment.find(m => m.name === e.name);
        return found ? (found.tags || []) : [];
    });
    if (fighter.requirements) {
        if (fighter.requirements.noArmorIfWizard && eqTags.includes('armor')) warnings.push("Wizards cannot wear armor.");
        if (fighter.requirements.noBlackPowder && eqTags.includes('black-powder')) warnings.push("Elves cannot use black-powder.");
    }
    return warnings;
}

// State Management
function addFighter() {
    const newFighter = {
        typeId: "", type: "New Hero", customName: "", baseCost: 0,
        race: "Człowiek", // Default race
        stats: { m: 0, ws: 0, bs: 0, s: 0, t: 0, w: 0, i: 0, a: 0, ld: 0 },
        equipment: [], skills: [], requirements: null
    };

    newFighter.customName = NameGenerator.generate(newFighter);

    currentWarband.fighters.push(newFighter);
    renderWarband();
    saveToCache();
}

function saveToCache() {
    currentWarband.name = document.getElementById('warband-name').value;
    localStorage.setItem('mordheim_current', JSON.stringify(currentWarband));

    let saved = JSON.parse(localStorage.getItem('mordheim_saves') || '[]');
    const idx = saved.findIndex(s => s.name === currentWarband.name);
    if (idx > -1) saved[idx] = currentWarband;
    else saved.push(JSON.parse(JSON.stringify(currentWarband)));
    localStorage.setItem('mordheim_saves', JSON.stringify(saved));
    renderSavedList();
}

function loadFromCache() {
    const saved = localStorage.getItem('mordheim_current');
    if (saved) {
        const parsed = JSON.parse(saved);

        // Migration: map old IDs to names
        if (parsed.ruleSetId === 'dragon_rock') parsed.ruleSetId = 'Dragon Rock';
        if (parsed.ruleSetId === 'smocza_turnia') parsed.ruleSetId = 'Drachenfels';

        // Deep merge to ensure structure
        currentWarband = { ...currentWarband, ...parsed };
    }
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
document.getElementById('delete-all-saves-btn').onclick = () => {
    if (confirm("Are you sure you want to delete ALL saved warbands? This cannot be undone.")) {
        localStorage.removeItem('mordheim_saves');
        renderSavedList();
    }
};
document.getElementById('warband-name').onchange = saveToCache;
document.getElementById('warband-name').oninput = () => {
    const compactName = document.getElementById('compact-warband-name');
    if (compactName) compactName.textContent = document.getElementById('warband-name').value;
};
document.getElementById('export-json-btn').onclick = () => {
    const blob = new Blob([JSON.stringify(currentWarband, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${currentWarband.name.replace(/\s+/g, '_')}.json`; a.click();
};
document.getElementById('import-json-input').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => { currentWarband = JSON.parse(event.target.result); renderWarband(); saveToCache(); };
    reader.readAsText(file);
};
document.getElementById('print-pdf-btn').onclick = () => { window.print(); };
document.getElementById('clear-all-btn').onclick = () => {
    if (confirm("Clear this warband?")) {
        currentWarband.name = "New Warband";
        currentWarband.fighters = [];
        renderWarband();
        saveToCache();
    }
};

init();
