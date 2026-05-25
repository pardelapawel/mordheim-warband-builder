(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(require('./fighterSkillUtils.js'));
    } else {
        root.LegendUtils = factory(root.FighterSkillUtils);
    }
}(typeof self !== 'undefined' ? self : this, function (FighterSkillUtils) {
    'use strict';

    function normalizeLegendTerm(term) {
        return String(term || '').trim().toLowerCase();
    }

    const LEGACY_EQUIPMENT_ALIASES = {
        'mace, hammer or club': ['mace', 'hammer', 'club'],
        'throwing stars/knives': ['throwing stars', 'throwing knives'],
        'dwuręczny młot/maczuga': ['dwuręczny młot', 'dwuręczna maczuga'],
        'dwuręczny topór/kilof/nadziak': ['dwuręczny topór', 'dwuręczny kilof', 'dwuręczny nadziak']
    };

    function getEquipmentCatalogEntries(name, equipmentCatalog) {
        const termKey = normalizeLegendTerm(name);
        const candidateKeys = [termKey, ...(LEGACY_EQUIPMENT_ALIASES[termKey] || [])];
        return (equipmentCatalog || []).filter(item => candidateKeys.includes(normalizeLegendTerm(item.name)));
    }

    function getEquipmentCatalogEntry(name, equipmentCatalog) {
        return getEquipmentCatalogEntries(name, equipmentCatalog)[0];
    }

    function getEquipmentOriginCategory(item, equipmentCatalog) {
        return item?.originCategory || getEquipmentCatalogEntry(item?.name, equipmentCatalog)?.originCategory || '';
    }

    function createEquipmentEntry(name, equipmentCatalog, fallbackOriginCategory = '') {
        const found = getEquipmentCatalogEntry(name, equipmentCatalog);
        return {
            name,
            cost: found ? found.cost : 0,
            originCategory: found?.originCategory || fallbackOriginCategory
        };
    }

    function renameEquipmentEntry(item, nextName, equipmentCatalog) {
        return {
            ...item,
            name: nextName,
            originCategory: getEquipmentOriginCategory(item, equipmentCatalog)
        };
    }

    function extractUsedTerms(fighters) {
        const termsByKey = new Map();

        (fighters || []).forEach(fighter => {
            (fighter.equipment || []).forEach(item => {
                const name = String(item.name || '').trim();
                const key = normalizeLegendTerm(name);
                if (key && !termsByKey.has(key)) termsByKey.set(key, name);
            });

            (fighter.skills || []).forEach(skill => {
                const skillName = String(FighterSkillUtils.formatSkillEntry(skill && typeof skill === 'object' && skill.name && !skill.label
                    ? skill.name
                    : skill) || '').trim();
                
                const spellMatch = skillName.match(/^(.*?)\((.*?)\)/);
                if (spellMatch) {
                    // Base skill/spell-list name
                    const baseName = String(spellMatch[1] || '').trim();
                    const baseKey = normalizeLegendTerm(baseName);
                    if (baseKey && !termsByKey.has(baseKey)) termsByKey.set(baseKey, baseName);

                    // Suboption name
                    let spellName = String(spellMatch[2] || '').trim();
                    // Strip " - XX gc" cost suffix if present
                    spellName = spellName.replace(/\s*-\s*\d+\s*gc/i, '').trim();
                    const spellKey = normalizeLegendTerm(spellName);
                    if (spellKey && !termsByKey.has(spellKey)) termsByKey.set(spellKey, spellName);
                } else {
                    const skillKey = normalizeLegendTerm(skillName);
                    if (skillKey && !termsByKey.has(skillKey)) termsByKey.set(skillKey, skillName);
                }
            });
        });

        return Array.from(termsByKey.values());
    }

    function extractSkillTermKeys(fighters) {
        const keys = new Set();

        (fighters || []).forEach(fighter => {
            (fighter.skills || []).forEach(skill => {
                const skillName = String(FighterSkillUtils.formatSkillEntry(skill && typeof skill === 'object' && skill.name && !skill.label
                    ? skill.name
                    : skill) || '').trim();
                const spellMatch = skillName.match(/^(.*?)\((.*?)\)/);
                const baseName = spellMatch ? String(spellMatch[1] || '').trim() : skillName;
                const baseKey = normalizeLegendTerm(baseName);
                if (baseKey) keys.add(baseKey);
            });
        });

        return keys;
    }

    function buildLegendGroups({ fighters, masterData, glossaryState }) {
        const categories = [
            { name: 'Melee Weapons', icon: 'swords', order: 1, items: [] },
            { name: 'Ranged Weapons', icon: 'target', order: 2, items: [] },
            { name: 'Armor', icon: 'shield', order: 3, items: [] },
            { name: 'Items', icon: 'inventory_2', order: 4, items: [] },
            { name: 'Skills', icon: 'star_shine', order: 5, items: [] },
            { name: 'Spells', icon: 'auto_fix_high', order: 6, items: [] }
        ];

        const byName = new Map(categories.map(category => [category.name, category]));
        const descriptions = glossaryState?.descriptions || {};
        const deletedTerms = new Set((glossaryState?.deletedTerms || []).map(normalizeLegendTerm));
        const addedNames = new Set();
        const usedTerms = extractUsedTerms(fighters);
        const skillTermKeys = extractSkillTermKeys(fighters);
        const equipmentCatalog = masterData?.equipment || [];
        const skillCatalog = masterData?.skills || [];
        const spellCatalog = masterData?.spells || [];
        const spellListNames = Object.keys(masterData?.spellsByList || {});
        const spellListDescriptions = masterData?.spellListDescriptions || {};

        usedTerms.forEach(term => {
            const termKey = normalizeLegendTerm(term);
            if (!termKey || deletedTerms.has(termKey)) return;

            let found = spellCatalog.find(spell => normalizeLegendTerm(spell.name) === termKey);
            let categoryName = found ? 'Spells' : '';

            if (!found) {
                const equipmentMatch = getEquipmentCatalogEntry(term, equipmentCatalog);
                if (equipmentMatch) {
                    found = normalizeLegendTerm(equipmentMatch.name) === termKey
                        ? equipmentMatch
                        : { ...equipmentMatch, name: term };
                    if (getEquipmentOriginCategory(found, equipmentCatalog) === 'melee_weapons') categoryName = 'Melee Weapons';
                    else if (getEquipmentOriginCategory(found, equipmentCatalog) === 'ranged_weapons') categoryName = 'Ranged Weapons';
                    else if (getEquipmentOriginCategory(found, equipmentCatalog) === 'armor') categoryName = 'Armor';
                    else categoryName = 'Items';
                }
            }

            if (!found) {
                found = skillCatalog.find(skill => normalizeLegendTerm(skill.name) === termKey);
                if (found) categoryName = 'Skills';
            }

            if (!found) {
                const matchedSpellList = spellListNames.find(name => normalizeLegendTerm(name) === termKey);
                if (matchedSpellList) {
                    found = {
                        name: matchedSpellList,
                        description: spellListDescriptions[matchedSpellList] || ''
                    };
                    categoryName = 'Skills';
                }
            }

            if (!found) {
                found = { name: term };
                categoryName = skillTermKeys.has(termKey) ? 'Skills' : 'Items';
            }

            const normalizedName = normalizeLegendTerm(found.name);
            if (!normalizedName || addedNames.has(normalizedName) || deletedTerms.has(normalizedName)) return;

            const defaultDescription = found.description || found.special || '';
            const description = Object.prototype.hasOwnProperty.call(descriptions, normalizedName)
                ? descriptions[normalizedName]
                : defaultDescription;

            byName.get(categoryName).items.push({
                key: normalizedName,
                name: found.name,
                difficulty: found.difficulty || '',
                description: description || ''
            });
            addedNames.add(normalizedName);
        });

        categories.forEach(category => {
            category.items.sort((a, b) => a.name.localeCompare(b.name));
        });

        return categories;
    }

    return {
        normalizeLegendTerm,
        extractUsedTerms,
        buildLegendGroups,
        createEquipmentEntry,
        renameEquipmentEntry
    };
}));
