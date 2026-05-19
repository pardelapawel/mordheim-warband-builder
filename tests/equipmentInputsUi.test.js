'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

test('fighter template has separate equipment inputs per category', () => {
    assert.match(indexHtml, /class="[^"]*\bcard-section\b[^"]*\bmelee-section\b[^"]*"[\s\S]*class="[^"]*\bequipment-input\b[^"]*\bmelee-input\b[^"]*"/);
    assert.match(indexHtml, /class="[^"]*\bcard-section\b[^"]*\branged-section\b[^"]*"[\s\S]*class="[^"]*\bequipment-input\b[^"]*\branged-input\b[^"]*"/);
    assert.match(indexHtml, /class="[^"]*\bcard-section\b[^"]*\barmor-section\b[^"]*"[\s\S]*class="[^"]*\bequipment-input\b[^"]*\barmor-input\b[^"]*"/);
    assert.match(indexHtml, /class="[^"]*\bcard-section\b[^"]*\bitems-section\b[^"]*"[\s\S]*class="[^"]*\bequipment-input\b[^"]*\bitems-input\b[^"]*"/);
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
    // robustly find each <div> whose class attribute contains "stats-table" and extract the full element
    const statsTableRegex = /<div[^>]*class="[^"]*\bstats-table\b[^"]*"[^>]*>/ig;
    let m;
    const statsTables = [];
    function findMatchingClosingDiv(html, startIndex) {
        const openTagEnd = html.indexOf('>', startIndex);
        if (openTagEnd === -1) return null;
        let pos = openTagEnd + 1;
        let depth = 1;
        while (depth > 0) {
            const nextOpen = html.indexOf('<div', pos);
            const nextClose = html.indexOf('</div>', pos);
            if (nextClose === -1) return null;
            if (nextOpen !== -1 && nextOpen < nextClose) {
                depth++;
                pos = nextOpen + 4;
            } else {
                depth--;
                pos = nextClose + 6;
            }
        }
        return html.slice(startIndex, pos);
    }
    while ((m = statsTableRegex.exec(indexHtml)) !== null) {
        const full = findMatchingClosingDiv(indexHtml, m.index);
        if (full) statsTables.push(full);
    }
    for (const tbl of statsTables) {
        assert.doesNotMatch(tbl, /\bstat-col\b[\s\S]*\bstat-exp-col\b|\bstat-exp\b|\bfighter-exp-input\b/, 'stats-table should not contain exp cells or inputs');
    }

    // ensure fighter-exp-input exists inside the .cost-info region specifically (robust to nested divs)
    const costInfoStart = indexHtml.search(/<div[^>]*class="[^"]*\bcost-info\b[^"]*"[^>]*>/i);
    const cardHeaderStart = indexHtml.search(/<div[^>]*class="[^\"]*\bcard-header\b[^\"]*"[^>]*>/i);
    assert.ok(cardHeaderStart !== -1, '.card-header region should exist');
    const headerBlock = findMatchingClosingDiv(indexHtml, cardHeaderStart);
    assert.ok(headerBlock, 'card header block should be extractable');
    const costInfoStart = headerBlock.search(/<div[^>]*class="[^\"]*\bcost-info\b[^\"]*"[^>]*>/i);
    assert.ok(costInfoStart !== -1, '.cost-info region should exist inside card header');
    const costInfoBlock = findMatchingClosingDiv(headerBlock, costInfoStart);
    assert.ok(costInfoBlock && /<input\b[^>]*\bclass=["'][^"']*\bfighter-exp-input\b[^"']*["'][^>]*>/i.test(costInfoBlock), 'fighter-exp-input <input> should be inside .cost-info of card header');
});
});

test('fighter card binds header exp input and keeps exp track sync', () => {
    assert.match(appJs, /const expInput = cardEl\.querySelector\('\.fighter-exp-input'\)/);
    assert.match(appJs, /if \(expInput\) expInput\.value = newExp/);
    assert.match(appJs, /expInput\.value = data\.exp \|\| 0/);
    // ensure change handler updates model and track inside the onchange handler specifically
    const onchangeMatch = appJs.match(/expInput\.onchange\s*=\s*(?:function\s*\([^)]*\)\s*|\([^)]*\)\s*=>\s*)?\{([\s\S]*?)\}/);
    assert.ok(onchangeMatch, 'expInput.onchange handler should be a block with a body');
    const onchangeBody = onchangeMatch[1];
    assert.match(onchangeBody, /currentWarband\.fighters\[index\]\.exp\s*=\s*newExp/);
    assert.match(onchangeBody, /updateExpTrack\s*\(\s*newExp\s*\)/);
    // also ensure handler updates overall rating and persists changes
    assert.match(onchangeBody, /updateWarbandRating\s*\(/);
    assert.match(onchangeBody, /saveToCache\s*\(/);
});

