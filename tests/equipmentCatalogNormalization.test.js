'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readJson(...segments) {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8'));
}

function getAllEquipmentEntries(ruleSet) {
    const equipment = readJson('data', ruleSet, 'equipment.json');
    return Object.values(equipment).flat();
}

function getAllWarbandEquipmentNames(ruleSet) {
    const warbandsDir = path.join(__dirname, '..', 'data', ruleSet, 'warbands');
    return fs.readdirSync(warbandsDir)
        .flatMap(fileName => {
            const warband = JSON.parse(fs.readFileSync(path.join(warbandsDir, fileName), 'utf8'));
            return Object.values(warband)
                .filter(value => value && typeof value === 'object' && !Array.isArray(value))
                .flatMap(list => Object.values(list))
                .filter(Array.isArray)
                .flat();
        });
}

test('equipment catalogs split combined Mordheimer weapon names into individual entries', () => {
    const equipment = getAllEquipmentEntries('mordheimer');

    const compositeNames = equipment.map(entry => entry.name).filter(name => /, .* or |\/.*/.test(name));
    assert.deepEqual(compositeNames, []);

    const mace = equipment.find(entry => entry.name === 'Mace');
    const hammer = equipment.find(entry => entry.name === 'Hammer');
    const club = equipment.find(entry => entry.name === 'Club');
    const stars = equipment.find(entry => entry.name === 'Throwing Stars');
    const knives = equipment.find(entry => entry.name === 'Throwing Knives');

    assert.deepEqual(mace && { cost: mace.cost, description: mace.description }, {
        cost: 3,
        description: 'Strength: User ; Concussion ; Criticals: bludgeoning'
    });
    assert.deepEqual(hammer && { cost: hammer.cost, description: hammer.description }, {
        cost: 3,
        description: 'Strength: User ; Concussion ; Criticals: bludgeoning'
    });
    assert.deepEqual(club && { cost: club.cost, description: club.description }, {
        cost: 3,
        description: 'Strength: User ; Concussion ; Criticals: bludgeoning'
    });
    assert.deepEqual(stars && { cost: stars.cost, description: stars.description }, {
        cost: 15,
        description: 'Range: 6" ; Strength: User ; Thrown weapon'
    });
    assert.deepEqual(knives && { cost: knives.cost, description: knives.description }, {
        cost: 15,
        description: 'Range: 6" ; Strength: User ; Thrown weapon'
    });
});

test('warband equipment lists do not reference combined Mordheimer equipment names', () => {
    const names = getAllWarbandEquipmentNames('mordheimer');

    assert.equal(names.includes('Mace, Hammer or Club'), false);
    assert.equal(names.includes('Throwing Stars/Knives'), false);
    assert.ok(names.includes('Mace'));
    assert.ok(names.includes('Hammer'));
    assert.ok(names.includes('Club'));
    assert.ok(names.includes('Throwing Stars'));
    assert.ok(names.includes('Throwing Knives'));
});

test('equipment catalogs split combined Drachenfels weapon names into individual entries', () => {
    const equipment = getAllEquipmentEntries('drachenfels');

    const compositeNames = equipment.map(entry => entry.name).filter(name => /, .* or |\/.*/.test(name));
    assert.deepEqual(compositeNames, []);

    const twoHandedHammer = equipment.find(entry => entry.name === 'Dwuręczny młot');
    const twoHandedClub = equipment.find(entry => entry.name === 'Dwuręczna maczuga');
    const twoHandedAxe = equipment.find(entry => entry.name === 'Dwuręczny topór');
    const twoHandedPick = equipment.find(entry => entry.name === 'Dwuręczny kilof');
    const twoHandedMace = equipment.find(entry => entry.name === 'Dwuręczny nadziak');

    assert.deepEqual(twoHandedHammer && { cost: twoHandedHammer.cost, description: twoHandedHammer.description }, {
        cost: 15,
        description: 'Siła: Użytkownika +2 (w pierwszej rundzie) / +1 (kolejne) ; Dwuręczna ; Ogłuszanie ; Parowanie (6+) ; Krytyki: obuchowe'
    });
    assert.deepEqual(twoHandedClub && { cost: twoHandedClub.cost, description: twoHandedClub.description }, {
        cost: 15,
        description: 'Siła: Użytkownika +2 (w pierwszej rundzie) / +1 (kolejne) ; Dwuręczna ; Ogłuszanie ; Parowanie (6+) ; Krytyki: obuchowe'
    });
    assert.deepEqual(twoHandedAxe && { cost: twoHandedAxe.cost, description: twoHandedAxe.description }, {
        cost: 15,
        description: 'Siła: Użytkownika +2 / +1 ; Dwuręczna ; Pancerz przeciwnika: -1 ; Parowanie (6+) ; Krytyki: sieczne'
    });
    assert.deepEqual(twoHandedPick && { cost: twoHandedPick.cost, description: twoHandedPick.description }, {
        cost: 15,
        description: 'Siła: Użytkownika +2 / +1 ; Dwuręczna ; Pancerz przeciwnika: -1 ; Parowanie (6+) ; Krytyki: sieczne'
    });
    assert.deepEqual(twoHandedMace && { cost: twoHandedMace.cost, description: twoHandedMace.description }, {
        cost: 15,
        description: 'Siła: Użytkownika +2 / +1 ; Dwuręczna ; Pancerz przeciwnika: -1 ; Parowanie (6+) ; Krytyki: sieczne'
    });
});
