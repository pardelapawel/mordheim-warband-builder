'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateWarband } = require('../validation.js');

function createMasterData() {
    return {
        activeWarbandTypeData: {},
        equipment: [
            { name: 'Dagger', cost: 2, special: '1st free for every warrior', originCategory: 'melee_weapons' }
        ],
        skills: [],
        spells: [],
        spellsByList: {}
    };
}

function createFighter(overrides = {}) {
    return {
        type: 'Warrior',
        race: 'Human',
        equipment: [],
        skills: [],
        validations: [],
        ...overrides
    };
}

test('Mordheimer validates that eligible fighters have a dagger', () => {
    const errors = validateWarband(
        {
            ruleSetId: 'Mordheimer',
            fighters: [createFighter()]
        },
        createMasterData()
    );

    assert.ok(errors.some(error => error.key === 'freeDaggerRequired' && error.fighterIndex === 0));
});

test('Mordheimer validates that the first dagger costs 0 gc', () => {
    const errors = validateWarband(
        {
            ruleSetId: 'Mordheimer',
            fighters: [createFighter({ equipment: [{ name: 'Dagger', cost: 2 }] })]
        },
        createMasterData()
    );

    assert.ok(errors.some(error => error.key === 'freeDaggerCost' && error.fighterIndex === 0));
});

test('Mordheimer skips free dagger validation for fighters that cannot carry equipment', () => {
    const errors = validateWarband(
        {
            ruleSetId: 'Mordheimer',
            fighters: [createFighter({ race: 'Animal', validations: ['noEquipment'] })]
        },
        createMasterData()
    );

    assert.equal(errors.some(error => error.key === 'freeDaggerRequired' || error.key === 'freeDaggerCost'), false);
});

test('Non-Mordheimer warbands do not get free dagger validation', () => {
    const errors = validateWarband(
        {
            ruleSetId: 'Dragon Rock',
            fighters: [createFighter()]
        },
        createMasterData()
    );

    assert.equal(errors.some(error => error.key === 'freeDaggerRequired' || error.key === 'freeDaggerCost'), false);
});
