'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8'));
}

test('every Mordheimer spell list has a non-empty list description', () => {
    const spells = readJson(path.join('data', 'mordheimer', 'spells.json'));
    const descriptions = spells.__listDescriptions || {};
    const listNames = Object.keys(spells).filter(key => Array.isArray(spells[key]));

    assert.ok(listNames.length > 0);
    listNames.forEach(name => {
        assert.equal(typeof descriptions[name], 'string', `${name} is missing a list description`);
        assert.notEqual(descriptions[name].trim(), '', `${name} has an empty list description`);
    });
});

test('every Drachenfels spell list has a non-empty list description', () => {
    const spells = readJson(path.join('data', 'drachenfels', 'spells.json'));
    const descriptions = spells.__listDescriptions || {};
    const listNames = Object.keys(spells).filter(key => Array.isArray(spells[key]));

    assert.ok(listNames.length > 0);
    listNames.forEach(name => {
        assert.equal(typeof descriptions[name], 'string', `${name} is missing a list description`);
        assert.notEqual(descriptions[name].trim(), '', `${name} has an empty list description`);
    });
});
