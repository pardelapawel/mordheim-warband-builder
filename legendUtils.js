(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.LegendUtils = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function normalizeLegendTerm(term) {
        return String(term || '').trim().toLowerCase();
    }

    function getEquipmentCatalogEntry(name, equipmentCatalog) {
        const termKey = normalizeLegendTerm(name);
        return (equipmentCatalog || []).find(item => normalizeLegendTerm(item.name) === termKey);
    }

    function getEquipmentOriginCategory(item, equipmentCatalog) {
        return item?.originCategory || getEquipmentCatalogEntry(item?.name, equipmentCatalog)?.originCategory || '';
    }

    function createEquipmentEntry(name, equipmentCatalog) {
        const found = getEquipmentCatalogEntry(name, equipmentCatalog);
        return {
            name,
            cost: found ? found.cost : 0,
            originCategory: found?.originCategory || ''
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
                const skillName = String(skill.name || '').trim();
                const skillKey = normalizeLegendTerm(skillName);
                if (skillKey && !termsByKey.has(skillKey)) termsByKey.set(skillKey, skillName);

                const spellMatch = skillName.match(/\((.*?)\)/);
                if (spellMatch) {
                    const spellName = String(spellMatch[1] || '').trim();
                    const spellKey = normalizeLegendTerm(spellName);
                    if (spellKey && !termsByKey.has(spellKey)) termsByKey.set(spellKey, spellName);
                }
            });
        });

        return Array.from(termsByKey.values());
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
        const equipmentCatalog = masterData?.equipment || [];
        const skillCatalog = masterData?.skills || [];
        const spellCatalog = masterData?.spells || [];

        usedTerms.forEach(term => {
            const termKey = normalizeLegendTerm(term);
            if (!termKey || deletedTerms.has(termKey)) return;

            let found = spellCatalog.find(spell => normalizeLegendTerm(spell.name) === termKey);
            let categoryName = found ? 'Spells' : '';

            if (!found) {
                found = equipmentCatalog.find(item => normalizeLegendTerm(item.name) === termKey);
                if (found) {
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
                found = { name: term };
                categoryName = 'Items';
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
