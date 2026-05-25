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

    function createSimpleSkillEntry(label) {
        return {
            kind: 'simple',
            label: String(label || '').trim(),
            groupKey: null,
            selectedKey: null,
            cost: 0
        };
    }

    function createGroupedSkillEntry(groupKey) {
        const normalizedGroupKey = String(groupKey || '').trim();
        return {
            kind: 'group',
            label: normalizedGroupKey,
            groupKey: normalizedGroupKey,
            selectedKey: null,
            cost: 0
        };
    }

    function selectGroupedSkillOption(entry, selectedKey, masterData) {
        const selectedName = String(selectedKey || '').trim() || null;
        const nextEntry = {
            ...entry,
            selectedKey: selectedName
        };
        const option = selectedName
            ? getGroupedSkillOptions(nextEntry, masterData).find(item => normalizeSkillName(item.name) === normalizeSkillName(selectedName))
            : null;
        return {
            ...nextEntry,
            cost: parseInt(option?.cost) || 0
        };
    }

    function formatSkillEntry(entry, masterData) {
        if (!entry) return '';
        if (typeof entry === 'string') return String(entry).trim();

        const label = String(entry.label || entry.name || '').trim();
        const selectedKey = String(entry.selectedKey || '').trim();
        if (entry.kind === 'group' && selectedKey) {
            const option = getGroupedSkillOptions(entry, masterData)
                .find(item => normalizeSkillName(item.name) === normalizeSkillName(selectedKey));
            const selectedLabel = option?.name || selectedKey;
            return label ? `${label} (${selectedLabel})` : selectedLabel;
        }
        return label;
    }

    function getSkillEntryNames(entry) {
        const rawName = typeof entry === 'object' && entry !== null
            ? formatSkillEntry(entry)
            : String(entry || '').trim();
        if (!rawName) return [];

        const match = rawName.match(/^(.*?)\((.*?)\)\s*$/);
        if (!match) return [normalizeSkillName(rawName)].filter(Boolean);

        const baseName = normalizeSkillName(match[1]);
        const optionName = normalizeSkillName(
            String(match[2] || '').replace(/\s*-\s*\d+\s*gc/i, '').trim()
        );

        return Array.from(new Set([baseName, optionName].filter(Boolean)));
    }

    function dedupeSkillEntries(entries) {
        const seen = new Set();

        return (entries || []).filter(entry => {
            const normalized = normalizeSkillName(
                typeof entry === 'object' && entry !== null && 'label' in entry
                    ? formatSkillEntry(entry)
                    : entry?.name
            );
            if (!normalized || seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });
    }

    function getGroupedSkillOptions(entry, masterData) {
        const groupKey = String(entry?.groupKey || entry?.name || '').trim();
        if (!groupKey) return [];
        if (Array.isArray(masterData?.skillsByCategory?.[groupKey])) return masterData.skillsByCategory[groupKey];
        if (Array.isArray(masterData?.spellsByList?.[groupKey])) return masterData.spellsByList[groupKey];
        return [];
    }

    function getSkillEntryCost(entry, masterData) {
        if (!entry) return 0;
        if (typeof entry === 'object' && entry !== null && Object.prototype.hasOwnProperty.call(entry, 'cost')) {
            return parseInt(entry.cost) || 0;
        }

        if (entry.kind === 'group') {
            const selectedKey = String(entry.selectedKey || '').trim();
            if (!selectedKey) return 0;
            const option = getGroupedSkillOptions(entry, masterData).find(item => normalizeSkillName(item.name) === normalizeSkillName(selectedKey));
            return parseInt(option?.cost) || 0;
        }

        const rawName = typeof entry === 'object' && entry !== null ? (entry.name || entry.label) : entry;
        const match = String(rawName || '').match(/\((\+|-)?(\d+)\s*gc\)/i) || String(rawName || '').match(/-\s*(\d+)\s*gc\)/i);
        if (match) return parseInt(match[match.length - 1]) || 0;

        const directSkill = (masterData?.skills || []).find(skill => normalizeSkillName(skill.name) === normalizeSkillName(rawName));
        return parseInt(directSkill?.cost) || 0;
    }

    function createAddableSkillEntry(name, fighterTemplate, masterData) {
        const trimmedName = String(name || '').trim();
        if (!trimmedName) return createSimpleSkillEntry('');

        const isAddableGroup = getTemplateAddableSkillGroupNames(fighterTemplate, masterData)
            .some(groupName => normalizeSkillName(groupName) === normalizeSkillName(trimmedName));

        if (isAddableGroup || Array.isArray(masterData?.spellsByList?.[trimmedName])) {
            return createGroupedSkillEntry(trimmedName);
        }

        return createSimpleSkillEntry(trimmedName);
    }

    function getTemplateStartingSkillEntries(template, masterData) {
        const entries = [];

        (template?.rules || []).forEach(name => entries.push(createSimpleSkillEntry(name)));
        if (template?.spell_list) entries.push(createGroupedSkillEntry(template.spell_list));
        (template?.starting_skills || []).forEach(name => {
            entries.push(createAddableSkillEntry(name, template, masterData));
        });

        return dedupeSkillEntries(entries);
    }

    function getTemplateStartingSkills(template) {
        const entries = [];

        (template?.rules || []).forEach(name => entries.push({ name }));
        if (template?.spell_list) entries.push({ name: template.spell_list });
        (template?.starting_skills || []).forEach(name => entries.push({ name }));

        return dedupeSkillEntries(entries);
    }

    function getTemplateAddableSkillGroupNames(template, masterData) {
        const categoryMap = new Map(
            Object.keys(masterData?.skillsByCategory || {}).map(name => [normalizeSkillName(name), name])
        );
        const names = new Set();

        [
            ...(template?.starting_skills || []),
            ...(template?.required_starting_skill_groups || [])
        ].forEach(name => {
            const canonicalName = categoryMap.get(normalizeSkillName(name));
            if (canonicalName) names.add(canonicalName);
        });

        return Array.from(names);
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
        const allowedNames = getTemplateAllowedSkillNames(template, masterData);
        return getSkillEntryNames(skillName).some(name => allowedNames.has(name));
    }

    return {
        normalizeSkillName,
        createSimpleSkillEntry,
        createGroupedSkillEntry,
        selectGroupedSkillOption,
        formatSkillEntry,
        getSkillEntryNames,
        getGroupedSkillOptions,
        getSkillEntryCost,
        createAddableSkillEntry,
        getTemplateStartingSkillEntries,
        getTemplateStartingSkills,
        getTemplateAddableSkillGroupNames,
        getTemplateAllowedSkillNames,
        isSkillAllowedForTemplate
    };
}));
