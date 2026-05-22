/**
 * Mordheim Warband Builder logic
 */

let ruleSets = [];
let masterData = {
    fighters: [],
    equipment: [],
    skills: [],
    skillsByCategory: {},
    spells: [],
    spellsByList: {},
    spellListDescriptions: {}
};

let currentWarband = {
    name: "My New Warband",
    ruleSetId: "",
    warbandTypeId: "",
    fighters: [],
    glossary: { descriptions: {}, deletedTerms: [] }
};

let lastFocusedInput = null; // { cardIndex: number, type: 'equipment' | 'skills', equipmentSelector?: string }
const SHARE_WARBAND_PARAM = 'band';

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

        masterData.skills = [];
        masterData.skillsByCategory = sk; // Keep structured for context-aware selection
        for (const [cat, items] of Object.entries(sk)) {
            items.forEach(i => {
                i.originCategory = cat;
                masterData.skills.push(i);
            });
        }

        const spellLists = Object.fromEntries(
            Object.entries(sp).filter(([, value]) => Array.isArray(value))
        );

        masterData.spells = flatten(spellLists);
        masterData.spellsByList = spellLists; // Keep structured for context-aware selection
        masterData.spellListDescriptions = sp.__listDescriptions || {};

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
    const skillNames = new Set();
    masterData.skills.forEach(skill => {
        const normalizedName = String(skill.name || '').trim().toLowerCase();
        if (!normalizedName || skillNames.has(normalizedName)) return;
        skillNames.add(normalizedName);
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
            masterData.activeWarbandTypeData = data; // Store active warband metadata (validations, etc)
        } catch (e) {
            console.error("Error loading warband type data", e);
        }
    } else {
        masterData.fighters = [];
        masterData.activeWarbandTypeData = null;
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
    const summaryBar = document.querySelector('.sticky-summary-bar');
    if (!header || !summaryBar) return;

    const { getHeaderLayoutState, getSummaryBarPinnedState } = globalThis.HeaderScroll || {};
    if (typeof getHeaderLayoutState !== 'function' || typeof getSummaryBarPinnedState !== 'function') {
        throw new Error('HeaderScroll helpers are unavailable.');
    }

    let ticking = false;

    const syncHeaderState = () => {
        ticking = false;
        const layoutState = getHeaderLayoutState({
            viewportWidth: window.innerWidth,
            isScrolled: false,
            mobileBreakpoint: 768
        });

        header.classList.remove('scrolled');
        summaryBar.hidden = !layoutState.useStickySummaryBar;
        if (summaryBar.hidden) {
            summaryBar.classList.remove('is-pinned');
            return;
        }

        const isPinned = getSummaryBarPinnedState({
            summaryBarTop: summaryBar.getBoundingClientRect().top
        });
        summaryBar.classList.toggle('is-pinned', isPinned);
    };

    const requestSync = () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(syncHeaderState);
    };

    summaryBar.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    window.addEventListener('scroll', requestSync, { passive: true });
    window.addEventListener('resize', requestSync);
    syncHeaderState();
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

    // Sync fold-all button label
    const foldAllBtn = document.getElementById('fold-all-btn');
    if (foldAllBtn) {
        const anyExpanded = currentWarband.fighters.some(f => !f.folded);
        foldAllBtn.textContent = anyExpanded ? '⊟ Fold All' : '⊞ Expand All';
    }

    updateTotalCost();
    updateLegend();
    runValidations();
    restoreFocus();

    window.scrollTo(0, scrollPos);
}

function ensureGlossaryState() {
    if (!currentWarband.glossary || typeof currentWarband.glossary !== 'object') {
        currentWarband.glossary = { descriptions: {}, deletedTerms: [] };
    }
    if (!currentWarband.glossary.descriptions || typeof currentWarband.glossary.descriptions !== 'object') {
        currentWarband.glossary.descriptions = {};
    }
    if (!Array.isArray(currentWarband.glossary.deletedTerms)) {
        currentWarband.glossary.deletedTerms = [];
    }
    return currentWarband.glossary;
}

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function setupAutoResizingTextarea(textarea) {
    const minHeight = textarea.offsetHeight;
    let manualMinHeight = minHeight;
    let lastAutoHeight = minHeight;

    const resize = () => {
        textarea.style.height = 'auto';
        lastAutoHeight = Math.max(textarea.scrollHeight, manualMinHeight);
        textarea.style.height = `${lastAutoHeight}px`;
    };

    const rememberManualHeight = () => {
        const currentHeight = textarea.offsetHeight;
        if (Math.abs(currentHeight - lastAutoHeight) > 1) {
            manualMinHeight = Math.max(minHeight, currentHeight);
        }
    };

    textarea.addEventListener('mouseup', rememberManualHeight);
    textarea.addEventListener('touchend', rememberManualHeight);

    setTimeout(resize, 0);
    return resize;
}

function updateCardPrintSummaries(cardEl, fighter) {
    const { buildPrintSectionSummaries } = globalThis.PrintUtils || {};
    if (typeof buildPrintSectionSummaries !== 'function') {
        throw new Error('PrintUtils.buildPrintSectionSummaries is unavailable.');
    }

    const printSummaries = buildPrintSectionSummaries(fighter, masterData.equipment, masterData);
    cardEl.querySelector('.melee-print-summary').textContent = printSummaries.melee;
    cardEl.querySelector('.ranged-print-summary').textContent = printSummaries.ranged;
    cardEl.querySelector('.armor-print-summary').textContent = printSummaries.armor;
    cardEl.querySelector('.items-print-summary').textContent = printSummaries.items;
    cardEl.querySelector('.skills-print-summary').textContent = printSummaries.skills;
}

function updateLegend() {
    const sidebar = document.getElementById('legend-sidebar');
    if (!sidebar) return;
    const { buildLegendGroups, normalizeLegendTerm } = globalThis.LegendUtils || {};
    if (typeof buildLegendGroups !== 'function' || typeof normalizeLegendTerm !== 'function') {
        throw new Error('Legend glossary helpers are missing. Please refresh the page, and if the issue persists, contact support.');
    }

    const glossaryState = ensureGlossaryState();
    const categories = buildLegendGroups({
        fighters: currentWarband.fighters,
        masterData,
        glossaryState
    });

    // Render HTML
    let html = '<h2 class="legend-title">Warband Glossary</h2>';
    let hasContent = categories.some(category => category.items.length > 0);

    for (const category of categories) {
        const catName = category.name;
        const catData = category;
        if (catData.items.length > 0) {
            html += `
                <div class="legend-group">
                    <h3 class="legend-group-title">
                        <span class="material-symbols-outlined">${escapeHtml(catData.icon)}</span>
                        ${escapeHtml(catName)}
                    </h3>
                    <div class="legend-items-list">
                        ${catData.items.map(item => `
                            <div class="legend-item">
                                <div class="legend-item-header">
                                    <span class="legend-item-name">${escapeHtml(item.name)}${item.difficulty ? ' (' + escapeHtml(item.difficulty) + ')' : ''}</span>
                                    <button class="legend-item-delete no-print" type="button" data-term-key="${escapeHtml(item.key)}" title="Delete glossary entry" aria-label="Delete ${escapeHtml(item.name)} from glossary">&times;</button>
                                </div>
                                <textarea class="legend-item-desc-edit no-print" rows="2" data-term-key="${escapeHtml(item.key)}" placeholder="Description...">${escapeHtml(item.description)}</textarea>
                                <span class="legend-item-desc print-only">${escapeHtml(item.description)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    if (!hasContent) {
        html += '<p class="legend-empty">No glossary entries yet.</p>';
    }

    sidebar.innerHTML = html;
    sidebar.classList.add('active');

    sidebar.querySelectorAll('.legend-item-desc-edit').forEach(input => {
        const resizeDescription = setupAutoResizingTextarea(input);
        input.oninput = () => {
            const termKey = normalizeLegendTerm(input.dataset.termKey);
            glossaryState.descriptions[termKey] = input.value;
            const printEl = input.parentElement?.querySelector('.legend-item-desc');
            if (printEl) printEl.textContent = input.value;
            resizeDescription();
            saveToCache();
        };
    });

    sidebar.querySelectorAll('.legend-item-delete').forEach(btn => {
        btn.onclick = () => {
            const termKey = normalizeLegendTerm(btn.dataset.termKey);
            if (!glossaryState.deletedTerms.includes(termKey)) {
                glossaryState.deletedTerms.push(termKey);
            }
            delete glossaryState.descriptions[termKey];
            renderWarband();
            saveToCache();
        };
    });
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
        const selector = lastFocusedInput.type === 'equipment'
            ? (lastFocusedInput.equipmentSelector || '.equipment-input')
            : '.skills-input';
        const input = targetCard.querySelector(selector);
        if (input) input.focus();
    }
}

function createFighterCard(data, index) {
    const template = document.getElementById('fighter-card-template');
    const clone = template.content.cloneNode(true);
    const wrapper = clone.querySelector('.card-wrapper');
    const cardEl = clone.querySelector('.fighter-card');
    const { getEquipmentCategory } = globalThis.PrintUtils || {};
    const { createEquipmentEntry, renameEquipmentEntry } = globalThis.LegendUtils || {};

    if (typeof getEquipmentCategory !== 'function') {
        throw new Error('PrintUtils.getEquipmentCategory is unavailable.');
    }

    if (typeof createEquipmentEntry !== 'function' || typeof renameEquipmentEntry !== 'function') {
        throw new Error('LegendUtils equipment helpers are unavailable.');
    }

    // Fold / expand logic
    const foldBtn = wrapper.querySelector('.fold-btn');
    const applyFoldState = (folded) => {
        if (folded) {
            cardEl.classList.add('folded');
            foldBtn.textContent = '▼';
            foldBtn.classList.add('folded-state');
            foldBtn.title = 'Expand Card';
        } else {
            cardEl.classList.remove('folded');
            foldBtn.textContent = '▲';
            foldBtn.classList.remove('folded-state');
            foldBtn.title = 'Fold Card';
        }
    };
    applyFoldState(!!data.folded);
    foldBtn.onclick = () => {
        const isFolded = cardEl.classList.contains('folded');
        currentWarband.fighters[index].folded = !isFolded;
        applyFoldState(!isFolded);
        saveToCache();
    };

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

    // Experience
    const expInput = cardEl.querySelector('.fighter-exp-input');
    const expTrack = cardEl.querySelector('.exp-track');
    const EXP_MILESTONES = new Set([2, 4, 6, 8, 11, 14, 17, 20, 24, 28, 32, 36, 41, 46, 51, 57, 63, 69, 76, 83, 90]);
    const EXP_MAX = 90;

    const updateExpTrack = (exp) => {
        const filled = Math.min(Math.max(parseInt(exp) || 0, 0), EXP_MAX);
        expTrack.querySelectorAll('.exp-box').forEach(box => {
            const n = parseInt(box.dataset.exp);
            box.classList.toggle('filled', n <= filled);
        });
    };

    if (expTrack) {
        // Label row: number markers at every 5th position (5, 10, 15, 20, 25, 30)
        const labelRow = document.createElement('div');
        labelRow.className = 'exp-track-labels';
        [5, 10, 15, 20, 25, 30].forEach(n => {
            const lbl = document.createElement('span');
            lbl.className = 'exp-track-label';
            lbl.textContent = n;
            lbl.style.gridColumn = n;
            labelRow.appendChild(lbl);
        });
        expTrack.parentElement.insertBefore(labelRow, expTrack);

        for (let n = 1; n <= EXP_MAX; n++) {
            const box = document.createElement('span');
            box.className = 'exp-box';
            if (EXP_MILESTONES.has(n)) box.classList.add('milestone');
            box.dataset.exp = n;
            box.title = `Exp ${n}`;
            box.addEventListener('click', () => {
                const currentExp = currentWarband.fighters[index].exp || 0;
                const newExp = currentExp === n ? n - 1 : n;
                currentWarband.fighters[index].exp = newExp;
                if (expInput) expInput.value = newExp;
                updateExpTrack(newExp);
                updateWarbandRating();
                saveToCache();
            });
            expTrack.appendChild(box);
        }
        updateExpTrack(data.exp || 0);
    }

    if (expInput) {
        expInput.value = data.exp || 0;
        expInput.onchange = (e) => {
            const newExp = parseInt(e.target.value) || 0;
            currentWarband.fighters[index].exp = newExp;
            updateExpTrack(newExp);
            updateWarbandRating();
            saveToCache();
        };
    }

    // Helper to get which list element an equipment item belongs to
    const getEqListEl = (item) => {
        const cat = getEquipmentCategory(item, masterData.equipment);
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
            currentWarband.fighters[index].equipment[itemIdx] = renameEquipmentEntry(
                currentWarband.fighters[index].equipment[itemIdx],
                nameEdit.value,
                masterData.equipment
            );
            updateCardPrintSummaries(cardEl, currentWarband.fighters[index]);
            updateLegend();
            runValidations();
            saveToCache();
            resize();
        };
        setTimeout(resize, 0);

        const costEdit = row.querySelector('.item-cost-edit');
        costEdit.oninput = () => {
            currentWarband.fighters[index].equipment[itemIdx].cost = parseInt(costEdit.value) || 0;
            updateTotalCost();
            runValidations();
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
        const displayValue = FighterSkillUtils.formatSkillEntry(skill, masterData);
        let options = [];
        let isGrouped = false;
        if (skill.kind === 'group') {
            isGrouped = true;
            const optionsFromHelper = FighterSkillUtils.getGroupedSkillOptions(skill, masterData);
            options = Array.isArray(optionsFromHelper) ? optionsFromHelper : [];
        } else {
            const fallbackOptions = FighterSkillUtils.getGroupedSkillOptions(skill, masterData);
            options = Array.isArray(fallbackOptions) ? fallbackOptions : [];
            isGrouped = options.length > 0;
        }
        const hasSuboptions = options.length > 0;

        row.innerHTML = `
            <div class="item-content">
                <textarea class="item-name-edit skill-name" rows="1">${escapeHtml(displayValue)}</textarea>
                <span class="cost-hint no-print">
                    (<input type="number" class="item-cost-edit skill-cost-edit" value="${FighterSkillUtils.getSkillEntryCost(skill, masterData)}"> gc)
                </span>
                ${hasSuboptions ? '<span class="add-spell-btn no-print" title="Pick Option">➕</span>' : ''}
            </div>
            <span class="item-delete no-print">&times;</span>
        `;

        const nameEdit = row.querySelector('.skill-name');
        if (isGrouped) nameEdit.readOnly = true;
        const resize = () => { nameEdit.style.height = 'auto'; nameEdit.style.height = nameEdit.scrollHeight + 'px'; };
        nameEdit.oninput = () => {
            if (currentWarband.fighters[index].skills[skillIdx]?.kind === 'group') return;
            const currentSkill = currentWarband.fighters[index].skills[skillIdx];
            if (currentSkill && typeof currentSkill === 'object') {
                currentWarband.fighters[index].skills[skillIdx] = {
                    ...currentSkill,
                    label: nameEdit.value
                };
            } else {
                currentWarband.fighters[index].skills[skillIdx] = { name: nameEdit.value };
            }
            updateCardPrintSummaries(cardEl, currentWarband.fighters[index]);
            updateLegend();
            saveToCache();
            resize();
        };
        setTimeout(resize, 0);

        const costEdit = row.querySelector('.skill-cost-edit');
        costEdit.oninput = () => {
            const currentSkill = currentWarband.fighters[index].skills[skillIdx];
            if (currentSkill && typeof currentSkill === 'object') {
                currentWarband.fighters[index].skills[skillIdx].cost = parseInt(costEdit.value) || 0;
            } else {
                currentWarband.fighters[index].skills[skillIdx] = {
                    name: displayValue,
                    cost: parseInt(costEdit.value) || 0
                };
            }
            updateTotalCost();
            runValidations();
            saveToCache();
            cardEl.querySelector('.fighter-total-cost').textContent = calculateFighterCost(currentWarband.fighters[index]);
        };

        if (hasSuboptions) {
            const addBtn = row.querySelector('.add-spell-btn');
            addBtn.onclick = () => {
                if (row.querySelector('.inline-spell-picker')) return;

                const select = document.createElement('select');
                select.className = 'inline-spell-picker no-print';
                select.innerHTML = '<option value="">-- Pick Option --</option>';
                options.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.name;
                    if (Object.prototype.hasOwnProperty.call(s, 'difficulty')) {
                        opt.textContent = `${s.name} (${s.difficulty})`;
                    } else {
                        opt.textContent = s.cost ? `${s.name} (${s.cost} gc)` : s.name;
                    }
                    select.appendChild(opt);
                });

                select.onchange = () => {
                    if (select.value) {
                        currentWarband.fighters[index].skills[skillIdx] =
                            FighterSkillUtils.selectGroupedSkillOption(
                                currentWarband.fighters[index].skills[skillIdx],
                                select.value,
                                masterData
                            );
                        renderWarband();
                        saveToCache();
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

    updateCardPrintSummaries(cardEl, data);

    // Add Logic and dynamic datalists
    const meleeInput = cardEl.querySelector('.melee-input');
    const rangedInput = cardEl.querySelector('.ranged-input');
    const armorInput = cardEl.querySelector('.armor-input');
    const itemsInput = cardEl.querySelector('.items-input');
    const skillInput = cardEl.querySelector('.skills-input');

    const handleAdd = (type, input, equipmentCategory = '') => {
        const val = input.value.trim();
        if (!val) return;

        lastFocusedInput = {
            cardIndex: index,
            type: type,
            equipmentSelector: equipmentCategory ? `.${input.classList[1]}` : undefined
        };

        if (type === 'equipment') {
            currentWarband.fighters[index].equipment.push(createEquipmentEntry(val, masterData.equipment, equipmentCategory));
        } else {
            currentWarband.fighters[index].skills.push(
                FighterSkillUtils.createAddableSkillEntry(val, fighterTemplate, masterData)
            );
        }
        input.value = '';
        renderWarband();
        saveToCache();
    };

    const normalizeAutocompleteName = (name) => String(name || '').trim().toLowerCase();
    const fighterTemplate = masterData.fighters.find(f => {
        const fighterId = data.typeId || data.templateName || data.type;
        return (f.id || f.name) === fighterId ||
            normalizeAutocompleteName(f.name) === normalizeAutocompleteName(data.templateName || data.type);
    }) || null;
    const allowedEquipmentNames = new Set();
    const allowedSkillNames = fighterTemplate
        ? FighterSkillUtils.getTemplateAllowedSkillNames(fighterTemplate, masterData)
        : new Set();
    const addableSkillGroupNames = fighterTemplate
        ? FighterSkillUtils.getTemplateAddableSkillGroupNames(fighterTemplate, masterData)
        : [];
    const addableSkillGroupNameSet = new Set(addableSkillGroupNames.map(normalizeAutocompleteName));
    const allowedSkillEntryNames = new Set([...allowedSkillNames, ...addableSkillGroupNameSet]);

    if (fighterTemplate) {
        const listKey = fighterTemplate.equipment_list_override ? `equipment_list_${fighterTemplate.equipment_list_override}` : 'equipment_list';
        const rawList = masterData.activeWarbandTypeData?.[listKey];
        if (rawList && typeof rawList === 'object') {
            Object.values(rawList).forEach(items => {
                (items || []).forEach(itemName => {
                    const normalizedName = normalizeAutocompleteName(itemName);
                    if (normalizedName) allowedEquipmentNames.add(normalizedName);
                });
            });
        }
    }

    // Custom autocomplete to replace broken native mobile datalists
    const setupAutocomplete = (input, type, equipmentCategory = '') => {
        if (!input) return;
        let container = input.parentElement;
        let listEl = document.createElement('ul');
        listEl.className = 'autocomplete-list';
        container.appendChild(listEl);

        const updateList = () => {
            let val = input.value.toLowerCase();
            let spellLists = Object.keys(masterData.spellsByList).map(name => ({ label: name }));
            let directSkillEntries = masterData.skills.filter(item => !addableSkillGroupNameSet.has(normalizeAutocompleteName(item.originCategory)));
            let listData = type === 'equipment'
                ? masterData.equipment.filter(item => !equipmentCategory || item.originCategory === equipmentCategory)
                : [...directSkillEntries.map(item => ({ label: item.name })), ...spellLists, ...addableSkillGroupNames.map(name => ({ label: name }))];
            let seenNames = new Set();
            listData = listData.filter(item => {
                const normalizedName = String(item.label || item.name || '').trim().toLowerCase();
                if (!normalizedName || seenNames.has(normalizedName)) return false;
                seenNames.add(normalizedName);
                return true;
            });

            // If empty, show all. If typed, filter.
            let matches = listData;
            if (val) {
                matches = listData.filter(i => String(i.label || i.name || '').toLowerCase().includes(val));
            }

            if ((type === 'equipment' && allowedEquipmentNames.size > 0) || (type === 'skills' && allowedSkillEntryNames.size > 0)) {
                const allowedNames = type === 'equipment' ? allowedEquipmentNames : allowedSkillEntryNames;
                matches = [...matches].sort((a, b) => {
                    const allowedA = allowedNames.has(normalizeAutocompleteName(a.label || a.name)) ? 0 : 1;
                    const allowedB = allowedNames.has(normalizeAutocompleteName(b.label || b.name)) ? 0 : 1;
                    if (allowedA !== allowedB) return allowedA - allowedB;
                    return String(a.label || a.name).localeCompare(String(b.label || b.name));
                });
            }

            listEl.innerHTML = '';
            if (matches.length === 0) {
                listEl.style.display = 'none';
                return;
            }

            matches.forEach(match => {
                let item = document.createElement('li');
                const displayName = match.label || match.name;
                item.textContent = displayName;
                if ((type === 'equipment' && allowedEquipmentNames.size > 0) || (type === 'skills' && allowedSkillEntryNames.size > 0)) {
                    const allowedNames = type === 'equipment' ? allowedEquipmentNames : allowedSkillEntryNames;
                    if (allowedNames.has(normalizeAutocompleteName(displayName))) {
                        item.classList.add('autocomplete-option-allowed');
                    } else {
                        item.classList.add('autocomplete-option-disallowed');
                    }
                }
                // mousedown prevents input blur before click 
                item.addEventListener('mousedown', (e) => e.preventDefault());
                item.onclick = () => {
                    input.value = displayName;
                    listEl.style.display = 'none';
                    handleAdd(type, input, equipmentCategory);
                };
                listEl.appendChild(item);
            });
            listEl.style.display = 'block';
        };

        input.addEventListener('input', updateList);
        input.addEventListener('focus', () => {
            lastFocusedInput = {
                cardIndex: index,
                type: type,
                equipmentSelector: equipmentCategory ? `.${input.classList[1]}` : undefined
            };
            updateList();
        });
        input.addEventListener('blur', () => {
            listEl.style.display = 'none';
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                listEl.style.display = 'none';
                handleAdd(type, input, equipmentCategory);
            }
        });
    };

    setupAutocomplete(meleeInput, 'equipment', 'melee_weapons');
    setupAutocomplete(rangedInput, 'equipment', 'ranged_weapons');
    setupAutocomplete(armorInput, 'equipment', 'armor');
    setupAutocomplete(itemsInput, 'equipment', 'items');
    setupAutocomplete(skillInput, 'skills');

    // Remove Card
    wrapper.querySelector('.remove-btn').onclick = () => {
        currentWarband.fighters.splice(index, 1);
        renderWarband();
        saveToCache();
    };

    // Copy Card
    wrapper.querySelector('.copy-btn').onclick = () => {
        copyFighter(index);
    };

    // Cost
    const totalCardCost = calculateFighterCost(data);
    cardEl.querySelector('.fighter-total-cost').textContent = totalCardCost;

    const warningEl = cardEl.querySelector('.validation-warnings');
    if (warningEl) warningEl.innerHTML = '';

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
    const startingSkills = FighterSkillUtils.getTemplateStartingSkillEntries(base, masterData);
    fighter.skills = startingSkills.map(skill => ({ ...skill }));

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
    fighter.exp = base.exp_start || 0;

    // Map stats from either base.stats or direct base properties
    const s = base.stats || base;
    fighter.stats = {
        m: s.m || 0, ws: s.ws || 0, bs: s.bs || 0,
        s: s.s || 0, t: s.t || 0, w: s.w || 0,
        i: s.i || 0, a: s.a || 0, ld: s.ld || 0
    };
    fighter.requirements = base.requirements || null;
    fighter.validations = base.validations || null;
}

function calculateFighterCost(fighter) {
    let cost = parseInt(fighter.baseCost) || 0;
    fighter.equipment.forEach(item => cost += (parseInt(item.cost) || 0));
    (fighter.skills || []).forEach(s => {
        cost += FighterSkillUtils.getSkillEntryCost(s, masterData);
    });
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

    updateWarbandRating();
}

function updateWarbandRating() {
    const isDrachenfels = currentWarband.ruleSetId === 'Drachenfels';
    const ratingEl = document.getElementById('compact-rating');
    if (!ratingEl) return;

    ratingEl.hidden = !isDrachenfels;
    if (!isDrachenfels) return;

    const { calculateWarbandRating } = globalThis.WarbandUtils || {};
    if (typeof calculateWarbandRating !== 'function') return;

    const { normalCount, bigCount, totalExp, total } = calculateWarbandRating(currentWarband.fighters);

    const breakdownEl = document.getElementById('compact-rating-breakdown');
    if (breakdownEl) {
        const parts = [];
        if (normalCount > 0) parts.push(`${normalCount} fighters`);
        if (bigCount > 0) parts.push(`${bigCount} big`);
        if (totalExp > 0) parts.push(`${totalExp} exp`);
        breakdownEl.textContent = parts.join(' + ');
    }

    const totalEl = document.getElementById('compact-rating-total');
    if (totalEl) totalEl.textContent = total;
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function runValidations() {
    const sidebar = document.getElementById('validation-sidebar');
    if (!sidebar) return;

    // Clear previous card marks
    document.querySelectorAll('.fighter-card').forEach(card => {
        card.classList.remove('has-validation-error');
        card.classList.remove('has-validation-warning');
        const badge = card.querySelector('.validation-badge');
        if (badge) badge.remove();
        const warnings = card.querySelector('.validation-warnings');
        if (warnings) warnings.innerHTML = '';
    });

    const errors = ValidationSystem.validateWarband(currentWarband, masterData);
    const severityOrder = { error: 0, warning: 1, tip: 2 };
    const orderedErrors = [...errors].sort((a, b) => {
        const severityDiff = severityOrder[(a.severity || 'error')] - severityOrder[(b.severity || 'error')];
        if (severityDiff !== 0) return severityDiff;

        const fighterIndexA = a.fighterIndex !== undefined ? a.fighterIndex : Number.MAX_SAFE_INTEGER;
        const fighterIndexB = b.fighterIndex !== undefined ? b.fighterIndex : Number.MAX_SAFE_INTEGER;
        return fighterIndexA - fighterIndexB;
    });
    const errorCount = errors.filter(err => (err.severity || 'error') === 'error').length;
    const warningCount = errors.filter(err => (err.severity || 'error') === 'warning').length;
    const tipCount = errors.filter(err => (err.severity || 'error') === 'tip').length;

    // Mark cards that triggered validation
    orderedErrors.forEach(err => {
        if (err.level === 'fighter' && err.fighterIndex !== undefined) {
            const cards = document.querySelectorAll('.fighter-card');
            const card = cards[err.fighterIndex];
            if (card) {
                const severity = err.severity || 'error';
                if (severity === 'error') {
                    card.classList.add('has-validation-error');
                } else if (severity === 'warning') {
                    card.classList.add('has-validation-warning');
                }
                
                // Add a pulse badge in the header if it doesn't exist
                let header = card.querySelector('.card-header');
                let badge = card.querySelector('.validation-badge');
                if (header && !badge) {
                    badge = document.createElement('span');
                    badge.className = `validation-badge material-symbols-outlined no-print validation-${severity}`;
                    badge.textContent = severity === 'tip' ? 'lightbulb' : 'warning';
                    badge.title = `This warrior has validation ${severity}s.`;
                    header.appendChild(badge);
                }
                
                // Show specific warnings list inside the card as well
                const warningEl = card.querySelector('.validation-warnings');
                if (warningEl) {
                    const div = document.createElement('div');
                    const icon = severity === 'tip' ? '💡' : '⚠';
                    div.className = `validation-warning-item validation-${severity}`;
                    div.innerHTML = `<span>${icon} ${escapeHtml(err.message)}</span>`;
                    
                    if (err.hasFix) {
                        const fixBtn = document.createElement('button');
                        fixBtn.className = `inline-fix-btn no-print validation-${severity}`;
                        fixBtn.textContent = err.fixLabel || 'Fix';
                        fixBtn.onclick = (e) => {
                            e.stopPropagation();
                            err.fix();
                        };
                        div.appendChild(fixBtn);
                    }
                    warningEl.appendChild(div);
                }
            }
        }
    });

    // Render HTML in the validation sidebar
    let html = '<h2 class="validation-title">Warband Validation</h2>';
    
    if (errors.length === 0) {
        html += `
            <div class="validation-success">
                <span class="material-symbols-outlined success-icon">check_circle</span>
                <p class="success-title">Fully Valid!</p>
                <p class="success-desc">All warband validation rules are perfectly met.</p>
            </div>
        `;
        sidebar.classList.remove('active');
    } else {
        html += `
            <div class="validation-summary-badge">
                <span class="material-symbols-outlined">warning</span>
                <span>${errorCount} error${errorCount === 1 ? '' : 's'}</span>
                <span>${warningCount} warning${warningCount === 1 ? '' : 's'}</span>
                <span>${tipCount} tip${tipCount === 1 ? '' : 's'}</span>
            </div>
            <div class="validation-errors-list">
        `;
        
        orderedErrors.forEach((err, idx) => {
            const severity = err.severity || 'error';
            const icon = severity === 'tip' ? 'lightbulb' : 'warning';
            html += `
                <div class="validation-error-card validation-${severity}" data-error-idx="${idx}">
                    <div class="validation-error-header">
                        <span class="material-symbols-outlined error-icon">${icon}</span>
                        <span class="error-message">${escapeHtml(err.message)}</span>
                    </div>
                    <div class="validation-error-actions">
                        ${err.hasFix ? `<button class="fix-btn no-print validation-${severity}" data-error-idx="${idx}">${escapeHtml(err.fixLabel || 'Fix')}</button>` : ''}
                        ${err.level === 'fighter' ? `<button class="view-btn no-print" data-fighter-idx="${err.fighterIndex}">View Warrior</button>` : ''}
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        sidebar.classList.add('active');
    }

    sidebar.innerHTML = html;
    
    // Bind click events for sidebar
    sidebar.querySelectorAll('.fix-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.errorIdx);
            if (orderedErrors[idx] && orderedErrors[idx].hasFix) {
                orderedErrors[idx].fix();
            }
        };
    });
    
    sidebar.querySelectorAll('.view-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const fighterIdx = parseInt(btn.dataset.fighterIdx);
            const cards = document.querySelectorAll('.card-wrapper');
            const target = cards[fighterIdx];
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Briefly flash the card
                const card = target.querySelector('.fighter-card');
                if (card) {
                    card.classList.add('flash-highlight');
                    setTimeout(() => card.classList.remove('flash-highlight'), 1500);
                }
            }
        };
    });
}

// State Management
function addFighter() {
    const newFighter = {
        typeId: "", type: "New Hero", customName: "", baseCost: 0,
        race: "Człowiek", // Default race
        exp: 0, is_large: false,
        stats: { m: 0, ws: 0, bs: 0, s: 0, t: 0, w: 0, i: 0, a: 0, ld: 0 },
        equipment: [], skills: [], requirements: null
    };

    newFighter.customName = NameGenerator.generate(newFighter);

    currentWarband.fighters.push(newFighter);
    renderWarband();
    saveToCache();
}

function copyFighter(index) {
    const original = currentWarband.fighters[index];
    const copy = structuredClone(original);
    currentWarband.fighters.splice(index + 1, 0, copy);
    renderWarband();
    saveToCache();
}

function toUrlSafeBase64(base64) {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromUrlSafeBase64(urlSafeBase64) {
    const base64 = urlSafeBase64.replace(/-/g, '+').replace(/_/g, '/');
    const padding = (4 - (base64.length % 4)) % 4;
    return base64 + '='.repeat(padding);
}

function decodeWarbandFromUrl(rawValue) {
    const { decompressFromBase64 } = globalThis.LZString || {};
    if (typeof decompressFromBase64 !== 'function' || !rawValue) return null;

    try {
        const json = decompressFromBase64(fromUrlSafeBase64(rawValue));
        if (!json) return null;
        return WarbandUtils.deserializeWarband(json);
    } catch (e) {
        console.warn("Could not decode shared warband from URL", e);
        return null;
    }
}

function updateShareUrl() {
    const { compressToBase64 } = globalThis.LZString || {};
    if (typeof compressToBase64 !== 'function') return;

    try {
        const json = WarbandUtils.serializeWarband(currentWarband);
        const compressed = compressToBase64(json);
        if (!compressed) return;

        const params = new URLSearchParams(window.location.search);
        params.set(SHARE_WARBAND_PARAM, toUrlSafeBase64(compressed));
        const query = params.toString();
        history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    } catch (e) {
        console.warn("Could not update share URL", e);
    }
}

function applyLoadedWarband(parsed) {
    if (!parsed || typeof parsed !== 'object') return;

    const migrated = { ...parsed };

    // Migration: map old IDs to names
    if (migrated.ruleSetId === 'dragon_rock') migrated.ruleSetId = 'Dragon Rock';
    if (migrated.ruleSetId === 'smocza_turnia') migrated.ruleSetId = 'Drachenfels';

    // Deep merge to ensure structure
    currentWarband = { ...currentWarband, ...migrated };
    ensureGlossaryState();
}

function saveToCache() {
    currentWarband.name = document.getElementById('warband-name').value;
    localStorage.setItem('mordheim_current', JSON.stringify(currentWarband));

    let saved = JSON.parse(localStorage.getItem('mordheim_saves') || '[]');
    const idx = saved.findIndex(s => s.name === currentWarband.name);
    if (idx > -1) saved[idx] = currentWarband;
    else saved.push(JSON.parse(JSON.stringify(currentWarband)));
    localStorage.setItem('mordheim_saves', JSON.stringify(saved));
    updateShareUrl();
    renderSavedList();
}

function loadFromCache() {
    const params = new URLSearchParams(window.location.search);
    const sharedBand = params.get(SHARE_WARBAND_PARAM);
    if (sharedBand) {
        const decoded = decodeWarbandFromUrl(sharedBand);
        if (decoded) {
            applyLoadedWarband(decoded);
            return;
        }
    }

    const saved = localStorage.getItem('mordheim_current');
    if (saved) {
        applyLoadedWarband(JSON.parse(saved));
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
        li.querySelector('span').onclick = () => { currentWarband = JSON.parse(JSON.stringify(s)); renderWarband(); updateShareUrl(); };
        li.querySelector('.delete-save-btn').onclick = (e) => { e.stopPropagation(); saved.splice(idx, 1); localStorage.setItem('mordheim_saves', JSON.stringify(saved)); renderSavedList(); };
        list.appendChild(li);
    });
}

// Global Actions
document.getElementById('add-card-placeholder').onclick = addFighter;
document.getElementById('save-cache-btn').onclick = saveToCache;

// Fold All / Expand All
document.getElementById('fold-all-btn').onclick = () => {
    const anyExpanded = currentWarband.fighters.some(f => !f.folded);
    currentWarband.fighters.forEach(f => { f.folded = anyExpanded; });
    renderWarband();
    saveToCache();
};
document.getElementById('delete-all-saves-btn').onclick = () => {
    localStorage.removeItem('mordheim_saves');
    renderSavedList();
};
document.getElementById('warband-name').onchange = saveToCache;
document.getElementById('warband-name').oninput = () => {
    const compactName = document.getElementById('compact-warband-name');
    if (compactName) compactName.textContent = document.getElementById('warband-name').value;
};
document.getElementById('export-json-btn').onclick = () => {
    const blob = new Blob([WarbandUtils.serializeWarband(currentWarband)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = WarbandUtils.generateExportFilename(currentWarband.name); a.click();
};
document.getElementById('import-json-input').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => { currentWarband = WarbandUtils.deserializeWarband(event.target.result); ensureGlossaryState(); renderWarband(); saveToCache(); };
    reader.readAsText(file);
};
document.getElementById('print-pdf-btn').onclick = () => { window.print(); };
document.getElementById('clear-all-btn').onclick = () => {
    currentWarband.name = "New Warband";
    currentWarband.fighters = [];
    currentWarband.glossary = { descriptions: {}, deletedTerms: [] };
    renderWarband();
    saveToCache();
};

init();
