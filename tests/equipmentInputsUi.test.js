'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

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

function extractArrowFunctionBody(source, assignmentPattern) {
    const match = source.match(assignmentPattern);
    assert.ok(match, 'Expected assignment pattern to exist');
    let pos = match.index + match[0].length;
    let depth = 1;
    while (depth > 0 && pos < source.length) {
        const char = source[pos];
        if (char === '{') depth++;
        if (char === '}') depth--;
        pos++;
    }
    assert.equal(depth, 0, 'Expected balanced braces in extracted function body');
    return source.slice(match.index + match[0].length, pos - 1);
}

function extractBalancedBlock(source, startPattern) {
    const match = source.match(startPattern);
    assert.ok(match, 'Expected block start pattern to exist');
    const openBraceIndex = source.indexOf('{', match.index + match[0].length - 1);
    assert.ok(openBraceIndex !== -1, 'Expected block to contain opening brace');
    let pos = openBraceIndex + 1;
    let depth = 1;
    while (depth > 0 && pos < source.length) {
        const char = source[pos];
        if (char === '{') depth++;
        if (char === '}') depth--;
        pos++;
    }
    assert.equal(depth, 0, 'Expected balanced braces in extracted block');
    return source.slice(openBraceIndex + 1, pos - 1);
}

function extractSourceSlice(source, startPattern, endPattern) {
    const startMatch = source.match(startPattern);
    assert.ok(startMatch, 'Expected slice start pattern to exist');
    const startIndex = startMatch.index;
    const rest = source.slice(startIndex + startMatch[0].length);
    const endMatch = rest.match(endPattern);
    assert.ok(endMatch, 'Expected slice end pattern to exist');
    return source.slice(startIndex, startIndex + startMatch[0].length + endMatch.index);
}

function findSectionBlock(html, sectionClass) {
    const sectionRegex = new RegExp(`<div[^>]*class="[^"]*\\bcard-section\\b[^"]*\\b${sectionClass}\\b[^"]*"[^>]*>`, 'i');
    const match = sectionRegex.exec(html);
    assert.ok(match, `Expected ${sectionClass} section to exist`);
    return findMatchingClosingDiv(html, match.index);
}

test('fighter template has separate equipment inputs per category', () => {
    const meleeSection = findSectionBlock(indexHtml, 'melee-section');
    const rangedSection = findSectionBlock(indexHtml, 'ranged-section');
    const armorSection = findSectionBlock(indexHtml, 'armor-section');
    const itemsSection = findSectionBlock(indexHtml, 'items-section');

    assert.match(meleeSection, /class="[^"]*\bequipment-input\b[^"]*\bmelee-input\b[^"]*"/);
    assert.match(rangedSection, /class="[^"]*\bequipment-input\b[^"]*\branged-input\b[^"]*"/);
    assert.match(armorSection, /class="[^"]*\bequipment-input\b[^"]*\barmor-input\b[^"]*"/);
    assert.match(itemsSection, /class="[^"]*\bequipment-input\b[^"]*\bitems-input\b[^"]*"/);
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
    while ((m = statsTableRegex.exec(indexHtml)) !== null) {
        const full = findMatchingClosingDiv(indexHtml, m.index);
        if (full) statsTables.push(full);
    }
    for (const tbl of statsTables) {
        assert.doesNotMatch(tbl, /\bstat-col\b[\s\S]*\bstat-exp-col\b|\bstat-exp\b|\bfighter-exp-input\b/, 'stats-table should not contain exp cells or inputs');
    }

    // ensure fighter-exp-input exists inside the .cost-info region specifically (robust to nested divs)
    const costInfoStart = indexHtml.search(/<div[^>]*class="[^"]*\bcost-info\b[^"]*"[^>]*>/i);
    assert.ok(costInfoStart !== -1, '.cost-info region should exist');
    const costInfoBlock = findMatchingClosingDiv(indexHtml, costInfoStart);
    assert.ok(costInfoBlock, 'Expected full .cost-info block');
    assert.match(costInfoBlock, /<input[^>]*class="[^"]*\bfighter-exp-input\b[^"]*"[^>]*>/i);
});

test('fighter card binds header exp input and keeps exp track sync', () => {
    const experienceSection = extractSourceSlice(appJs, /\/\/ Experience/, /\/\/ Helper to get which list element/);
    assert.match(experienceSection, /querySelector\((['"])\.fighter-exp-input\1\)/);
    assert.doesNotMatch(experienceSection, /querySelector\((['"])\.stat-exp\1\)/);

    const expTrackBlock = extractBalancedBlock(appJs, /if\s*\(\s*expTrack\s*\)\s*\{/);
    const expTrackClickBody = extractArrowFunctionBody(
        expTrackBlock,
        /box\.addEventListener\(\s*(['"])click\1,\s*\(\)\s*=>\s*\{/,
    );
    assert.match(expTrackClickBody, /currentWarband\.fighters\[index\]\.exp\s*=\s*newExp/);
    assert.match(expTrackClickBody, /if\s*\(\s*expInput\s*\)\s*expInput\.value\s*=\s*newExp/);
    assert.match(expTrackClickBody, /updateExpTrack\s*\(\s*newExp\s*\)/);
    assert.match(expTrackClickBody, /updateWarbandRating\s*\(/);
    assert.match(expTrackClickBody, /saveToCache\s*\(/);

    const expInputBlock = extractBalancedBlock(appJs, /if\s*\(\s*expInput\s*\)\s*\{/);
    assert.match(expInputBlock, /\.value\s*=\s*data\.exp\s*(?:\|\||\?\?)\s*0/);
    assert.match(expInputBlock, /currentWarband\.fighters\[index\]\.exp\s*=\s*newExp/);
    assert.match(expInputBlock, /updateExpTrack\s*\(\s*newExp\s*\)/);
    assert.match(expInputBlock, /updateWarbandRating\s*\(/);
    assert.match(expInputBlock, /saveToCache\s*\(/);
});
