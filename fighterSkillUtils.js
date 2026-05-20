(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.FighterSkillUtils = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function normalizeSkillName(name) {
        return String(name || '').trim().toLowerCase();
    }

    function dedupeSkillEntries(entries) {
        const seen = new Set();

        return (entries || []).filter(entry => {
            const normalized = normalizeSkillName(entry?.name);
            if (!normalized || seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });
    }

    function getTemplateStartingSkills(template) {
        const entries = [];

        (template?.rules || []).forEach(name => entries.push({ name }));
        if (template?.spell_list) entries.push({ name: template.spell_list });
        (template?.starting_skills || []).forEach(name => entries.push({ name }));

        return dedupeSkillEntries(entries);
    }

    function getTemplateAllowedSkillNames(template, masterData) {
        const allowed = new Set();

        (template?.skills || []).forEach(categoryName => {
            const categoryItems = masterData?.skillsByCategory?.[categoryName];
            if (Array.isArray(categoryItems)) {
                categoryItems.forEach(item => allowed.add(normalizeSkillName(item.name)));
            }

            const spellItems = masterData?.spellsByList?.[categoryName];
            if (Array.isArray(spellItems)) {
                spellItems.forEach(item => allowed.add(normalizeSkillName(item.name)));
            }
        });

        return allowed;
    }

    function isSkillAllowedForTemplate(skillName, template, masterData) {
        return getTemplateAllowedSkillNames(template, masterData).has(normalizeSkillName(skillName));
    }

    return {
        normalizeSkillName,
        getTemplateStartingSkills,
        getTemplateAllowedSkillNames,
        isSkillAllowedForTemplate
    };
}));
