'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const ValidationSystem = require('../validation.js');

function createMasterData(activeWarbandTypeData) {
    return {
        activeWarbandTypeData,
        fighters: activeWarbandTypeData.fighters,
        equipment: [],
        skills: [],
        spells: [],
        spellsByList: {}
    };
}

test('exactlyOne validation recognizes slug fighter ids against display names', () => {
    const activeWarbandTypeData = {
        validations: [{ type: 'exactlyOne', fighter: 'sigmarite_matriarch' }],
        fighters: [
            { name: 'Sigmarite Matriarch', type: 'Leader', cost: 70, race: 'Human', exp_start: 20, stats: { ld: 8 } }
        ]
    };
    const warband = {
        fighters: [
            { typeId: 'Sigmarite Matriarch', templateName: 'Sigmarite Matriarch', type: 'Sigmarite Matriarch', skills: [], equipment: [] }
        ]
    };

    const errors = ValidationSystem.validateWarband(warband, createMasterData(activeWarbandTypeData));

    assert.equal(
        errors.find(error => error.key === 'exactlyOne'),
        undefined,
        'slug-style validation ids should match fighters created from display names'
    );
});

test('exactlyOne fix can add leader when validation uses a slug fighter id', () => {
    const activeWarbandTypeData = {
        validations: [{ type: 'exactlyOne', fighter: 'sigmarite_matriarch' }],
        fighters: [
            { name: 'Sigmarite Matriarch', type: 'Leader', cost: 70, race: 'Human', exp_start: 20, stats: { ld: 8 } }
        ]
    };
    const warband = { fighters: [] };
    const masterData = createMasterData(activeWarbandTypeData);

    const errors = ValidationSystem.validateWarband(warband, masterData);
    const exactlyOneError = errors.find(error => error.key === 'exactlyOne');

    assert.ok(exactlyOneError, 'missing leader should trigger exactlyOne validation');
    exactlyOneError.fix();

    assert.equal(warband.fighters.length, 1);
    assert.equal(warband.fighters[0].type, 'Sigmarite Matriarch');
});
