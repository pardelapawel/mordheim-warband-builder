'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { serializeWarband, deserializeWarband, generateExportFilename } = require('../warbandUtils.js');

test('serializeWarband returns a string', () => {
    const warband = { name: 'Test Warband', ruleSetId: '', warbandTypeId: '', fighters: [] };
    const result = serializeWarband(warband);
    assert.equal(typeof result, 'string');
});

test('serializeWarband produces valid JSON', () => {
    const warband = { name: 'Test Warband', ruleSetId: '', warbandTypeId: '', fighters: [] };
    const result = serializeWarband(warband);
    assert.doesNotThrow(() => JSON.parse(result));
});

test('deserializeWarband parses a JSON string into a warband object', () => {
    const json = '{"name":"Test Warband","ruleSetId":"","warbandTypeId":"","fighters":[]}';
    const result = deserializeWarband(json);
    assert.equal(result.name, 'Test Warband');
    assert.deepEqual(result.fighters, []);
});

test('export then import produces an identical warband', () => {
    const warband = {
        name: 'My Warband',
        ruleSetId: 'Dragon Rock',
        warbandTypeId: 'undead',
        fighters: [
            { typeId: 'vampire', type: 'Vampire', customName: 'Draugr', baseCost: 85, equipment: [], skills: [] }
        ]
    };
    const json = serializeWarband(warband);
    const imported = deserializeWarband(json);
    assert.deepEqual(imported, warband);
});

test('generateExportFilename replaces spaces with underscores and adds .json', () => {
    assert.equal(generateExportFilename('My Warband'), 'My_Warband.json');
    assert.equal(generateExportFilename('Test'), 'Test.json');
    assert.equal(generateExportFilename('Dragon Rock Raiders'), 'Dragon_Rock_Raiders.json');
});
