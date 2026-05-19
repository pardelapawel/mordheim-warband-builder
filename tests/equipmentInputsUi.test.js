'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

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

test('skills autocomplete excludes skill category keys as addable entries', () => {
    assert.doesNotMatch(
        appJs,
        /\[\.\.\.masterData\.skills,\s*\.\.\.Object\.keys\(masterData\.skillsByCategory(?:\s*\|\|\s*\{\})?\)\.map\(k => \(\{ name: k \}\)\)/
    );
    assert.doesNotMatch(
        appJs,
        /\[\.\.\.masterData\.skills,\s*\.\.\.Object\.keys\(masterData\.skillsByCategory(?:\s*\|\|\s*\{\})?\)\.map\(k => \(\{ name: k \}\)\),\s*\.\.\.spellLists,\s*\.\.\.masterData\.spells\]/
    );
});

test('fighter templates only auto-add spell list entries from available skill lists', () => {
    assert.doesNotMatch(appJs, /const isMutationList =/);
    assert.match(appJs, /if \(isSpellList\) \{/);
});

test('equipment autocomplete sorts allowed entries before disallowed ones for the fighter', () => {
    assert.match(appJs, /const allowedEquipmentNames = new Set\(\)/);
    assert.match(appJs, /const listKey = fighterTemplate\.equipment_list_override\s*\?\s*`equipment_list_\$\{fighterTemplate\.equipment_list_override\}`\s*:\s*'equipment_list'/);
    assert.match(appJs, /Object\.values\(rawList\)\.forEach\(items => \{/);
    assert.match(appJs, /matches = \[\.\.\.matches\]\.sort\(\(a, b\) => \{/);
    assert.match(appJs, /const allowedA = allowedEquipmentNames\.has\(normalizeAutocompleteName\(a\.name\)\) \? 0 : 1/);
    assert.match(appJs, /const allowedB = allowedEquipmentNames\.has\(normalizeAutocompleteName\(b\.name\)\) \? 0 : 1/);
    assert.match(appJs, /if \(allowedA !== allowedB\) return allowedA - allowedB/);
});

test('equipment autocomplete visually distinguishes allowed and disallowed entries', () => {
    assert.match(appJs, /item\.classList\.add\('autocomplete-option-allowed'\)/);
    assert.match(appJs, /item\.classList\.add\('autocomplete-option-disallowed'\)/);
    assert.match(styleCss, /\.autocomplete-list li\.autocomplete-option-allowed\s*\{[\s\S]*font-weight:\s*700/);
    assert.match(styleCss, /\.autocomplete-list li\.autocomplete-option-disallowed\s*\{[\s\S]*color:\s*var\(--text-secondary\)/);
});

test('fighter template moves exp input from stats row into header cost info', () => {
    assert.doesNotMatch(
        indexHtml,
        /class="stats-table"[\s\S]*class="stat-exp"/
    );
    const costInfoRegion = indexHtml.match(
        /class="cost-info no-print"([\s\S]*?)<div class="stats-table">/
    );
    assert.ok(costInfoRegion, 'Expected cost-info region before stats-table');
    assert.match(costInfoRegion[1], /class="fighter-exp-summary"/);
    assert.match(costInfoRegion[1], /class="fighter-exp-input"/);
});

test('fighter card binds header exp input and keeps exp track sync', () => {
    assert.match(appJs, /const expInput = cardEl\.querySelector\('\.fighter-exp-input'\)/);
    assert.match(appJs, /if \(expInput\) expInput\.value = newExp/);
    assert.match(appJs, /expInput\.value = data\.exp \|\| 0/);
    assert.match(
        appJs,
        /expInput\.onchange\s*=\s*\(e\)\s*=>\s*\{[\s\S]*?currentWarband\.fighters\[index\]\.exp\s*=\s*newExp;[\s\S]*?updateExpTrack\(newExp\);[\s\S]*?updateWarbandRating\(\);[\s\S]*?saveToCache\(\);[\s\S]*?\n\s*\};/
    );
});
