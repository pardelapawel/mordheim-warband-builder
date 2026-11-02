'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
    createSimpleSkillEntry,
    createGroupedSkillEntry,
    selectGroupedSkillOption,
    formatSkillEntry,
    getSkillEntryCost,
    getTemplateStartingSkills,
    getTemplateAddableSkillGroupNames,
    getTemplateAllowedSkillNames,
    isSkillAllowedForTemplate,
    getSkillEntryNames
} = require('../fighterSkillUtils.js');

function createMasterData() {
    return {
        skillsByCategory: {
            Combat: [{ name: 'Strike to Injure' }],
            Speed: [{ name: 'Leap' }],
            'Sisters of Sigmar': [{ name: 'Sigmarite Fervour' }]
        },
        spellsByList: {
            'Prayers of Sigmar': [{ name: 'Healing Hand' }]
        }
    };
}

test('getTemplateStartingSkills uses rules spell_list and starting_skills only', () => {
    const skills = getTemplateStartingSkills({
        rules: ['Leader'],
        spell_list: 'Prayers of Sigmar',
        starting_skills: ['Step Aside'],
        skills: ['Combat', 'Speed', 'Sisters of Sigmar']
    });

    assert.deepEqual(skills, [
        { name: 'Leader' },
        { name: 'Prayers of Sigmar' },
        { name: 'Step Aside' }
    ]);
});

test('createSimpleSkillEntry returns the uniform simple-skill shape', () => {
    assert.deepEqual(createSimpleSkillEntry('Step Aside'), {
        kind: 'simple',
        label: 'Step Aside',
        groupKey: null,
        selectedKey: null,
        cost: 0
    });
});

test('createGroupedSkillEntry returns a parent row without a selected child', () => {
    assert.deepEqual(createGroupedSkillEntry('Mutations'), {
        kind: 'group',
        label: 'Mutations',
        groupKey: 'Mutations',
        selectedKey: null,
        cost: 0
    });
});

test('selectGroupedSkillOption stores the chosen child without changing the parent row', () => {
    assert.deepEqual(
        selectGroupedSkillOption(createGroupedSkillEntry('Mutations'), 'Great Claw'),
        {
            kind: 'group',
            label: 'Mutations',
            groupKey: 'Mutations',
            selectedKey: 'Great Claw',
            cost: 0
        }
    );
});

test('formatSkillEntry returns display text for grouped rows', () => {
    assert.equal(
        formatSkillEntry({ kind: 'group', label: 'Mutations', groupKey: 'Mutations', selectedKey: 'Great Claw' }),
        'Mutations (Great Claw)'
    );
});

test('formatSkillEntry keeps grouped skill labels free of inline cost text', () => {
    assert.equal(
        formatSkillEntry(
            { kind: 'group', label: 'Mutations', groupKey: 'Mutations', selectedKey: 'Great Claw', cost: 50 },
            {
                skillsByCategory: {
                    Mutations: [{ name: 'Great Claw', cost: 50 }]
                }
            }
        ),
        'Mutations (Great Claw)'
    );
});

test('getSkillEntryCost prefers explicit entry cost over catalog lookup', () => {
    assert.equal(
        getSkillEntryCost(
            { kind: 'group', label: 'Mutations', groupKey: 'Mutations', selectedKey: 'Great Claw', cost: 75 },
            {
                skillsByCategory: {
                    Mutations: [{ name: 'Great Claw', cost: 50 }]
                }
            }
        ),
        75
    );
});

test('getTemplateAddableSkillGroupNames keeps explicit repeatable skill groups only', () => {
    const names = getTemplateAddableSkillGroupNames(
        {
            starting_skills: ['Mutations', 'Step Aside'],
            required_starting_skill_groups: ['Blessings of Nurgle']
        },
        {
            skillsByCategory: {
                Mutations: [{ name: 'Great Claw' }],
                'Blessings of Nurgle': [{ name: 'Cloud of Flies' }],
                Combat: [{ name: 'Strike to Injure' }]
            }
        }
    );

    assert.deepEqual(names, ['Mutations', 'Blessings of Nurgle']);
});

test('getTemplateAllowedSkillNames expands advancement categories into concrete skill names', () => {
    const allowed = getTemplateAllowedSkillNames(
        { skills: ['Combat', 'Prayers of Sigmar', 'Sisters of Sigmar'] },
        createMasterData()
    );

    assert.equal(allowed.has('strike to injure'), true);
    assert.equal(allowed.has('healing hand'), true);
    assert.equal(allowed.has('sigmarite fervour'), true);
    assert.equal(allowed.has('leader'), false);
});

test('isSkillAllowedForTemplate rejects off-tree skills', () => {
    const template = { skills: ['Combat', 'Prayers of Sigmar'] };
    const masterData = createMasterData();

    assert.equal(isSkillAllowedForTemplate('Strike to Injure', template, masterData), true);
    assert.equal(isSkillAllowedForTemplate('Healing Hand', template, masterData), true);
    assert.equal(isSkillAllowedForTemplate('Leap', template, masterData), false);
});

test('getSkillEntryNames extracts base and selected suboption names', () => {
    assert.deepEqual(getSkillEntryNames('Mutations (Great Claw - 50 gc)'), ['mutations', 'great claw']);
    assert.deepEqual(getSkillEntryNames('Prayers of Sigmar (Healing Hand)'), ['prayers of sigmar', 'healing hand']);
    assert.deepEqual(getSkillEntryNames('Leader'), ['leader']);
});
