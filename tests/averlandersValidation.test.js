'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateWarband } = require('../validation.js');

function createAverlandersMasterData() {
    return {
        activeWarbandTypeData: {
            warband_name: 'Averlanders',
            equipment_list: {
                hand_to_hand: ['Dagger', 'Sword'],
                missile: ['Bow'],
                armour: ['Helmet']
            },
            equipment_list_scout: {
                hand_to_hand: ['Dagger', 'Sword'],
                missile: ['Bow', 'Long bow']
            },
            equipment_list_marksman: {
                hand_to_hand: ['Dagger', 'Sword'],
                missile: ['Bow', 'Blunderbuss']
            },
            fighters: [
                { name: 'Sergeant', max_quantity: 1 },
                { name: 'Bergjaeger', max_quantity: 2, equipment_list_override: 'scout' },
                { name: 'Mountainguard', max_quantity: null },
                { name: 'Marksman', max_quantity: null, equipment_list_override: 'marksman' }
            ]
        },
        equipment: [
            { name: 'Dagger', originCategory: 'melee_weapons' },
            { name: 'Sword', originCategory: 'melee_weapons' },
            { name: 'Bow', originCategory: 'ranged_weapons' },
            { name: 'Long bow', originCategory: 'ranged_weapons' },
            { name: 'Helmet', originCategory: 'armor' },
            { name: 'Blunderbuss', originCategory: 'ranged_weapons' }
        ],
        skills: [],
        spells: [],
        spellsByList: {}
    };
}

function createFighter(type, overrides = {}) {
    return {
        typeId: type.toLowerCase(),
        templateName: type,
        type,
        customName: type,
        race: 'Human',
        equipment: [],
        skills: [],
        validations: [],
        ...overrides
    };
}

test('validateWarband flags Sergeant copies beyond the template max quantity', () => {
    const errors = validateWarband(
        {
            ruleSetId: 'Mordheimer',
            fighters: [
                createFighter('Sergeant'),
                createFighter('Sergeant')
            ]
        },
        createAverlandersMasterData()
    );

    assert.equal(errors.some(error => error.key === 'maxQuantity' && error.fighterIndex === 0), false);
    assert.ok(errors.some(error => error.key === 'maxQuantity' && error.fighterIndex === 1));
});

test('validateWarband flags Bergjaeger copies beyond the template max quantity', () => {
    const errors = validateWarband(
        {
            ruleSetId: 'Mordheimer',
            fighters: [
                createFighter('Bergjaeger'),
                createFighter('Bergjaeger'),
                createFighter('Bergjaeger')
            ]
        },
        createAverlandersMasterData()
    );

    assert.equal(errors.some(error => error.key === 'maxQuantity' && error.fighterIndex === 1), false);
    assert.ok(errors.some(error => error.key === 'maxQuantity' && error.fighterIndex === 2));
});

test('validateWarband reports equipment outside the Mountainguard equipment list', () => {
    const errors = validateWarband(
        {
            ruleSetId: 'Mordheimer',
            fighters: [
                createFighter('Mountainguard', {
                    equipment: [{ name: 'Blunderbuss', cost: 30 }]
                })
            ]
        },
        createAverlandersMasterData()
    );

    const error = errors.find(entry => entry.key === 'equipmentList' && entry.fighterIndex === 0);
    assert.ok(error);
    assert.match(error.message, /Blunderbuss/i);
    assert.match(error.message, /Mountainguard equipment list/i);
});

test('validateWarband allows weapons from a fighter equipment list override', () => {
    const errors = validateWarband(
        {
            ruleSetId: 'Mordheimer',
            fighters: [
                createFighter('Marksman', {
                    equipment: [{ name: 'Blunderbuss', cost: 30 }]
                })
            ]
        },
        createAverlandersMasterData()
    );

    assert.equal(errors.some(error => error.key === 'equipmentList'), false);
});
