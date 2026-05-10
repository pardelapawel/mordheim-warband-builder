'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildLegendGroups, createEquipmentEntry, renameEquipmentEntry } = require('../legendUtils.js');

const masterData = {
    equipment: [
        { name: 'Sword', originCategory: 'melee_weapons', description: 'Sharp blade', cost: 10 },
        { name: 'Helmet', originCategory: 'armor', description: 'Head protection', cost: 5 }
    ],
    skills: [
        { name: 'Step Aside', description: 'Improve dodge' }
    ],
    spells: [
        { name: 'Fireball', difficulty: '8+', description: 'Deals fire damage' }
    ],
    spellsByList: {
        'Prayers of Taal': [
            { name: "Taal's Blessing", difficulty: 'X', description: 'Taal prayer' }
        ]
    }
};

test('buildLegendGroups includes custom equipment in Items', () => {
    const groups = buildLegendGroups({
        fighters: [{ equipment: [{ name: 'Rope Hook' }], skills: [] }],
        masterData,
        glossaryState: { descriptions: {}, deletedTerms: [] }
    });
    const items = groups.find(group => group.name === 'Items').items;

    assert.deepEqual(items, [
        { key: 'rope hook', name: 'Rope Hook', difficulty: '', description: '' }
    ]);
});

test('buildLegendGroups applies glossary description overrides and deletions', () => {
    const groups = buildLegendGroups({
        fighters: [{ equipment: [{ name: 'Sword' }, { name: 'Helmet' }], skills: [] }],
        masterData,
        glossaryState: {
            descriptions: { sword: 'Updated sword text' },
            deletedTerms: ['helmet']
        }
    });

    const melee = groups.find(group => group.name === 'Melee Weapons').items;
    const armor = groups.find(group => group.name === 'Armor').items;

    assert.equal(melee[0].description, 'Updated sword text');
    assert.equal(armor.length, 0);
});

test('buildLegendGroups captures spells extracted from skill suffixes', () => {
    const groups = buildLegendGroups({
        fighters: [{ equipment: [], skills: [{ name: 'Sorcery (Fireball)' }] }],
        masterData,
        glossaryState: { descriptions: {}, deletedTerms: [] }
    });
    const spells = groups.find(group => group.name === 'Spells').items;

    assert.deepEqual(spells, [
        { key: 'fireball', name: 'Fireball', difficulty: '8+', description: 'Deals fire damage' }
    ]);
});

test('buildLegendGroups keeps spell list entries in Skills group', () => {
    const groups = buildLegendGroups({
        fighters: [{ equipment: [], skills: [{ name: 'Prayers of Taal' }] }],
        masterData,
        glossaryState: { descriptions: {}, deletedTerms: [] }
    });
    const skills = groups.find(group => group.name === 'Skills').items;
    const items = groups.find(group => group.name === 'Items').items;

    assert.deepEqual(skills, [
        { key: 'prayers of taal', name: 'Prayers of Taal', difficulty: '', description: '' }
    ]);
    assert.equal(items.length, 0);
});

test('createEquipmentEntry preserves catalog category for known equipment', () => {
    assert.deepEqual(createEquipmentEntry('Sword', masterData.equipment), {
        name: 'Sword',
        cost: 10,
        originCategory: 'melee_weapons'
    });
});

test('renameEquipmentEntry keeps inferred category when renaming known equipment', () => {
    assert.deepEqual(
        renameEquipmentEntry({ name: 'Sword', cost: 10 }, 'Jagged Sword', masterData.equipment),
        { name: 'Jagged Sword', cost: 10, originCategory: 'melee_weapons' }
    );
});
