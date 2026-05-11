'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

test('fighter template has separate equipment inputs per category', () => {
    assert.match(indexHtml, /class="card-section melee-section"[\s\S]*class="equipment-input melee-input"/);
    assert.match(indexHtml, /class="card-section ranged-section"[\s\S]*class="equipment-input ranged-input"/);
    assert.match(indexHtml, /class="card-section armor-section"[\s\S]*class="equipment-input armor-input"/);
    assert.match(indexHtml, /class="card-section items-section"[\s\S]*class="equipment-input items-input"/);
});

test('equipment autocompletes are wired per category', () => {
    assert.match(appJs, /setupAutocomplete\(meleeInput,\s*'equipment',\s*'melee_weapons'\)/);
    assert.match(appJs, /setupAutocomplete\(rangedInput,\s*'equipment',\s*'ranged_weapons'\)/);
    assert.match(appJs, /setupAutocomplete\(armorInput,\s*'equipment',\s*'armor'\)/);
    assert.match(appJs, /setupAutocomplete\(itemsInput,\s*'equipment',\s*'items'\)/);
});
