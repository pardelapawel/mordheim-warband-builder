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
    spellListDescriptions: {
        'Prayers of Taal': 'Nature prayers used by the Priest of Taal.'
    },
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

test('buildLegendGroups extracts grouped parent and selected child from structured skills', () => {
    const groups = buildLegendGroups({
        fighters: [{
            equipment: [],
            skills: [{ kind: 'group', label: 'Mutations', groupKey: 'Mutations', selectedKey: 'Great Claw' }]
        }],
        masterData: {
            ...masterData,
            skills: [
                ...masterData.skills,
                { name: 'Great Claw', description: 'Mutation' }
            ]
        },
        glossaryState: { descriptions: {}, deletedTerms: [] }
    });
    const skills = groups.find(group => group.name === 'Skills').items;

    assert.ok(skills.some(item => item.name === 'Mutations'));
    assert.ok(skills.some(item => item.name === 'Great Claw'));
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
        { key: 'prayers of taal', name: 'Prayers of Taal', difficulty: '', description: 'Nature prayers used by the Priest of Taal.' }
    ]);
    assert.equal(items.length, 0);
});

test('buildLegendGroups keeps unknown fighter rules in Skills group', () => {
    const groups = buildLegendGroups({
        fighters: [{ equipment: [], skills: [{ name: 'Set Traps' }] }],
        masterData,
        glossaryState: { descriptions: {}, deletedTerms: [] }
    });
    const skills = groups.find(group => group.name === 'Skills').items;
    const items = groups.find(group => group.name === 'Items').items;

    assert.deepEqual(skills, [
        { key: 'set traps', name: 'Set Traps', difficulty: '', description: '' }
    ]);
    assert.equal(items.length, 0);
});

test('buildLegendGroups maps legacy combined equipment names to the split catalog category', () => {
    const groups = buildLegendGroups({
        fighters: [{ equipment: [{ name: 'Mace, Hammer or Club' }], skills: [] }],
        masterData: {
            ...masterData,
            equipment: [
                ...masterData.equipment,
                { name: 'Mace', originCategory: 'melee_weapons', description: 'Concussion', cost: 3 },
                { name: 'Hammer', originCategory: 'melee_weapons', description: 'Concussion', cost: 3 },
                { name: 'Club', originCategory: 'melee_weapons', description: 'Concussion', cost: 3 }
            ]
        },
        glossaryState: { descriptions: {}, deletedTerms: [] }
    });
    const melee = groups.find(group => group.name === 'Melee Weapons').items;
    const items = groups.find(group => group.name === 'Items').items;

    assert.deepEqual(melee, [
        { key: 'mace, hammer or club', name: 'Mace, Hammer or Club', difficulty: '', description: 'Concussion' }
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

test('createEquipmentEntry applies fallback category for custom equipment', () => {
    assert.deepEqual(createEquipmentEntry('Custom Spear', masterData.equipment, 'melee_weapons'), {
        name: 'Custom Spear',
        cost: 0,
        originCategory: 'melee_weapons'
    });
});

test('renameEquipmentEntry keeps inferred category when renaming known equipment', () => {
    assert.deepEqual(
        renameEquipmentEntry({ name: 'Sword', cost: 10 }, 'Jagged Sword', masterData.equipment),
        { name: 'Jagged Sword', cost: 10, originCategory: 'melee_weapons' }
    );
});
