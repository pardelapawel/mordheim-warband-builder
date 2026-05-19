'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const ruleSets = JSON.parse(fs.readFileSync(path.join(dataDir, 'rule_sets.json'), 'utf8'));

function normalizeName(value) {
    return String(value || '').trim().toLowerCase();
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function collectNamesByRuleSet(ruleSet) {
    const folderName = ruleSet.name.toLowerCase().replace(/\s+/g, '_');
    const folderPath = path.join(dataDir, folderName);
    const skills = readJson(path.join(folderPath, 'skills.json'));
    const spells = readJson(path.join(folderPath, 'spells.json'));
    const names = new Set();

    Object.values(skills).forEach(entries => {
        (entries || []).forEach(entry => names.add(normalizeName(entry.name)));
    });

    Object.entries(spells).forEach(([spellListName, entries]) => {
        names.add(normalizeName(spellListName));
        (entries || []).forEach(entry => names.add(normalizeName(entry.name)));
    });

    return { folderName, names };
}

test('every fighter rule is mapped by the matching rule-set skill or spell catalogs', () => {
    const unmappedRules = [];

    ruleSets.forEach(ruleSet => {
        const { folderName, names } = collectNamesByRuleSet(ruleSet);

        ruleSet.warbands.forEach(warband => {
            const warbandPath = path.join(dataDir, folderName, 'warbands', warband.file);
            const warbandData = readJson(warbandPath);

            (warbandData.fighters || []).forEach(fighter => {
                (fighter.rules || []).forEach(ruleName => {
                    if (!names.has(normalizeName(ruleName))) {
                        unmappedRules.push(`${ruleSet.name} :: ${warband.name} :: ${fighter.name} :: ${ruleName}`);
                    }
                });
            });
        });
    });

    assert.deepEqual(
        unmappedRules,
        [],
        `Add these missing rule entries to their rule-set skill or spell catalogs:\n${unmappedRules.join('\n')}`
    );
});
