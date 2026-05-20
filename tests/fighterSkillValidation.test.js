'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateWarband } = require('../validation.js');

function createMasterData() {
    return {
        activeWarbandTypeData: {
            fighters: [
                {
                    id: 'sigmarite_matriarch',
                    name: 'Sigmarite Matriarch',
                    rules: ['Leader'],
                    spell_list: 'Prayers of Sigmar',
                    skills: ['Combat', 'Sisters of Sigmar', 'Prayers of Sigmar']
                }
            ]
        },
        skills: [
            { name: 'Leader' },
            { name: 'Strike to Injure' },
            { name: 'Leap' },
            { name: 'Sigmarite Fervour' }
        ],
        skillsByCategory: {
            Combat: [{ name: 'Strike to Injure' }],
            'Sisters of Sigmar': [{ name: 'Sigmarite Fervour' }]
        },
        spells: [{ name: 'Healing Hand' }],
        spellsByList: {
            'Prayers of Sigmar': [{ name: 'Healing Hand' }]
        },
        equipment: []
    };
}

function createFighter(skills) {
    return {
        typeId: 'sigmarite_matriarch',
        templateName: 'Sigmarite Matriarch',
        type: 'Sigmarite Matriarch',
        customName: 'Matriarch',
        race: 'Human',
        equipment: [],
        validations: [],
        skills: skills.map(name => ({ name }))
    };
}

test('validateWarband warns when a fighter owns a skill outside their advancement tree', () => {
    const errors = validateWarband(
        { ruleSetId: 'Mordheimer', fighters: [createFighter(['Leader', 'Prayers of Sigmar', 'Leap'])] },
        createMasterData()
    );

    const warning = errors.find(error => error.key === 'skillAccess');
    assert.ok(warning);
    assert.equal(warning.severity, 'warning');
    assert.match(warning.message, /Leap/i);
    assert.match(warning.message, /advancement list/i);
});

test('validateWarband does not warn for exempt starting entries', () => {
    const errors = validateWarband(
        { ruleSetId: 'Mordheimer', fighters: [createFighter(['Leader', 'Prayers of Sigmar', 'Strike to Injure'])] },
        createMasterData()
    );

    assert.equal(errors.some(error => error.key === 'skillAccess'), false);
});
