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
                },
                {
                    id: 'the_possessed',
                    name: 'The Possessed',
                    starting_skills: ['Mutations'],
                    required_starting_skill_groups: ['Mutations'],
                    skills: ['Combat', 'Strength', 'Speed', 'Mutations']
                }
            ]
        },
        skills: [
            { name: 'Leader' },
            { name: 'Strike to Injure' },
            { name: 'Leap' },
            { name: 'Sigmarite Fervour' },
            { name: 'Great Claw', cost: 50 }
        ],
        skillsByCategory: {
            Combat: [{ name: 'Strike to Injure' }],
            Strength: [{ name: 'Mighty Blow' }],
            'Sisters of Sigmar': [{ name: 'Sigmarite Fervour' }],
            Mutations: [{ name: 'Great Claw', cost: 50 }]
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
        skills: skills.map(skill => typeof skill === 'string' ? { name: skill } : skill)
    };
}

function createPossessed(skills) {
    return {
        typeId: 'the_possessed',
        templateName: 'The Possessed',
        type: 'The Possessed',
        customName: 'Possessed',
        race: 'Possessed',
        equipment: [],
        validations: ['noEquipment'],
        skills: skills.map(skill => typeof skill === 'string' ? { name: skill } : skill)
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

test('validateWarband treats selected spell-list suboptions as allowed skills', () => {
    const errors = validateWarband(
        { ruleSetId: 'Mordheimer', fighters: [createFighter(['Leader', 'Prayers of Sigmar (Healing Hand)'])] },
        createMasterData()
    );

    assert.equal(errors.some(error => error.key === 'skillAccess'), false);
});

test('validateWarband adds a tip when a required starting mutation group has no selected mutation', () => {
    const errors = validateWarband(
        { ruleSetId: 'Mordheimer', fighters: [createPossessed(['Mutations'])] },
        createMasterData()
    );

    const tip = errors.find(error => error.key === 'requiredStartingSkillGroup');
    assert.ok(tip);
    assert.equal(tip.severity, 'tip');
    assert.match(tip.message, /may start with one or more mutations/i);
});

test('validateWarband accepts decorated required starting mutation picks', () => {
    const errors = validateWarband(
        { ruleSetId: 'Mordheimer', fighters: [createPossessed(['Mutations (Great Claw - 50 gc)'])] },
        createMasterData()
    );

    assert.equal(errors.some(error => error.key === 'requiredStartingSkillGroup'), false);
    assert.equal(errors.some(error => error.key === 'skillAccess'), false);
});

test('validateWarband accepts a grouped spell row with a selected child', () => {
    const fighter = createFighter([
        { kind: 'group', label: 'Prayers of Sigmar', groupKey: 'Prayers of Sigmar', selectedKey: 'Healing Hand' }
    ]);
    const errors = validateWarband({ ruleSetId: 'Mordheimer', fighters: [fighter] }, createMasterData());

    assert.equal(errors.some(error => error.key === 'skillAccess'), false);
});

test('validateWarband warns when a grouped row selects an off-tree child', () => {
    const fighter = createFighter([
        { kind: 'group', label: 'Prayers of Sigmar', groupKey: 'Prayers of Sigmar', selectedKey: 'Leap' }
    ]);
    const errors = validateWarband({ ruleSetId: 'Mordheimer', fighters: [fighter] }, createMasterData());

    assert.ok(errors.some(error => error.key === 'skillAccess'));
});

test('validateWarband requires a chosen child for required grouped starters', () => {
    const fighter = createPossessed([
        { kind: 'group', label: 'Mutations', groupKey: 'Mutations', selectedKey: null }
    ]);
    const errors = validateWarband({ ruleSetId: 'Mordheimer', fighters: [fighter] }, createMasterData());

    assert.ok(errors.some(error => error.key === 'requiredStartingSkillGroup'));
});
