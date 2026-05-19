'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8'));
}

function findEntryByName(groups, name) {
    const normalizedName = String(name).trim().toLowerCase();

    return Object.values(groups)
        .flat()
        .find(entry => String(entry.name || '').trim().toLowerCase() === normalizedName);
}

test('added warband rule catalog entries have non-empty descriptions', () => {
    const mordheimerSkills = readJson(path.join('data', 'mordheimer', 'skills.json'));
    const drachenfelsSkills = readJson(path.join('data', 'drachenfels', 'skills.json'));
    const expectedEntries = [
        { groups: mordheimerSkills, name: 'Set Traps' },
        { groups: mordheimerSkills, name: 'Promotion: If promoted to hero, may not choose Strength skills' },
        { groups: mordheimerSkills, name: 'Wizard' },
        { groups: mordheimerSkills, name: 'Drunken' },
        { groups: mordheimerSkills, name: 'Woodland Dwelling' },
        { groups: mordheimerSkills, name: 'Trample' },
        { groups: mordheimerSkills, name: 'Lowest of the Low' },
        { groups: mordheimerSkills, name: 'Bloodgreed' },
        { groups: mordheimerSkills, name: 'Unnatural Strength' },
        { groups: mordheimerSkills, name: "Nurgle's Blessings" },
        { groups: mordheimerSkills, name: 'Daemonic Aura' },
        { groups: mordheimerSkills, name: 'Daemonic Instability' },
        { groups: mordheimerSkills, name: 'Expert Weaponsmith' },
        { groups: mordheimerSkills, name: 'Runts' },
        { groups: mordheimerSkills, name: 'Minderz' },
        { groups: mordheimerSkills, name: 'Fearsome' },
        { groups: mordheimerSkills, name: 'No Respect' },
        { groups: drachenfelsSkills, name: 'Król Szczurów' }
    ];

    expectedEntries.forEach(({ groups, name }) => {
        const entry = findEntryByName(groups, name);
        assert.ok(entry, `${name} should exist in the catalog`);
        assert.notEqual(String(entry.description || '').trim(), '', `${name} should have a non-empty description`);
    });
});
