(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.PrintUtils = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function summarizeNames(entries) {
        const names = (entries || [])
            .map(entry => typeof entry === 'string' ? entry : entry.name)
            .map(name => String(name || '').trim())
            .filter(Boolean);

        return names.length > 0 ? names.join(', ') : '-';
    }

    function getEquipmentCategory(item, equipmentCatalog) {
        return item.originCategory ||
            (equipmentCatalog || []).find(entry => entry.name.toLowerCase() === String(item.name || '').toLowerCase())?.originCategory ||
            '';
    }

    function buildPrintSectionSummaries(fighter, equipmentCatalog) {
        const sections = {
            melee: [],
            ranged: [],
            armor: [],
            items: [],
            skills: fighter.skills || []
        };

        (fighter.equipment || []).forEach(item => {
            const category = getEquipmentCategory(item, equipmentCatalog);

            if (category === 'melee_weapons') {
                sections.melee.push(item);
            } else if (category === 'ranged_weapons') {
                sections.ranged.push(item);
            } else if (category === 'armor') {
                sections.armor.push(item);
            } else {
                sections.items.push(item);
            }
        });

        return {
            melee: summarizeNames(sections.melee),
            ranged: summarizeNames(sections.ranged),
            armor: summarizeNames(sections.armor),
            items: summarizeNames(sections.items),
            skills: summarizeNames(sections.skills)
        };
    }

    return { summarizeNames, buildPrintSectionSummaries, getEquipmentCategory };
}));
