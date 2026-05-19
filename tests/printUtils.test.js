'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { summarizeNames, buildPrintSectionSummaries } = require('../printUtils.js');

test('summarizeNames returns dash for empty list', () => {
    assert.equal(summarizeNames([]), '-');
});

test('buildPrintSectionSummaries compacts vampire loadout', () => {
    const summaries = buildPrintSectionSummaries({
        type: 'Vampire',
        equipment: [
            { name: 'Sword', originCategory: 'melee_weapons' },
            { name: 'Heavy Armour', originCategory: 'armor' },
            { name: 'Shield', originCategory: 'armor' },
            { name: 'Lucky Charm', originCategory: 'items' },
            { name: 'Rope & Hook', originCategory: 'items' },
            { name: 'Lantern', originCategory: 'items' }
        ],
        skills: [{ name: 'Step Aside' }]
    });

    assert.deepEqual(summaries, {
        melee: 'Sword',
        ranged: '-',
        armor: 'Heavy Armour, Shield',
        items: 'Lucky Charm, Rope & Hook, Lantern',
        skills: 'Step Aside'
    });
});

test('buildPrintSectionSummaries keeps empty dog sections explicit', () => {
    const summaries = buildPrintSectionSummaries({
        type: 'Dog',
        equipment: [],
        skills: []
    });

    assert.deepEqual(summaries, {
        melee: '-',
        ranged: '-',
        armor: '-',
        items: '-',
        skills: '-'
    });
});

test('buildPrintSectionSummaries infers categories from catalog when equipment lacks originCategory', () => {
    const summaries = buildPrintSectionSummaries({
        type: 'Vampire',
        equipment: [
            { name: 'Sword' },
            { name: 'Heavy Armour' },
            { name: 'Shield' },
            { name: 'Lucky Charm' }
        ],
        skills: [{ name: 'Step Aside' }]
    }, [
        { name: 'Sword', originCategory: 'melee_weapons' },
        { name: 'Heavy Armour', originCategory: 'armor' },
        { name: 'Shield', originCategory: 'armor' },
        { name: 'Lucky Charm', originCategory: 'items' }
    ]);

    assert.deepEqual(summaries, {
        melee: 'Sword',
        ranged: '-',
        armor: 'Heavy Armour, Shield',
        items: 'Lucky Charm',
        skills: 'Step Aside'
    });
});

test('buildPrintSectionSummaries keeps legacy combined equipment names in the right section after catalog split', () => {
    const summaries = buildPrintSectionSummaries({
        type: 'Mercenary',
        equipment: [
            { name: 'Mace, Hammer or Club' },
            { name: 'Throwing Stars/Knives' }
        ],
        skills: []
    }, [
        { name: 'Mace', originCategory: 'melee_weapons' },
        { name: 'Hammer', originCategory: 'melee_weapons' },
        { name: 'Club', originCategory: 'melee_weapons' },
        { name: 'Throwing Stars', originCategory: 'ranged_weapons' },
        { name: 'Throwing Knives', originCategory: 'ranged_weapons' }
    ]);

    assert.deepEqual(summaries, {
        melee: 'Mace, Hammer or Club',
        ranged: 'Throwing Stars/Knives',
        armor: '-',
        items: '-',
        skills: '-'
    });
});
