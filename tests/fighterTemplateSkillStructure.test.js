'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function loadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getWarbandFiles(ruleSetFolder) {
    const baseDir = path.join(__dirname, '..', 'data', ruleSetFolder, 'warbands');
    return fs.readdirSync(baseDir).map(file => path.join(baseDir, file));
}

function collectAllowedCategoryNames(ruleSetFolder) {
    const skillsByCategory = loadJson(path.join(__dirname, '..', 'data', ruleSetFolder, 'skills.json'));
    const spellsByList = loadJson(path.join(__dirname, '..', 'data', ruleSetFolder, 'spells.json'));
    const genericCategoriesByRuleSet = {
        mordheimer: [
            'Combat',
            'Shooting',
            'Academic',
            'Strength',
            'Speed',
            'Special',
            'Nurgle Rituals',
            'Ostlander Special'
        ],
        drachenfels: ['Bojowe', 'Strzeleckie', 'Akademickie', 'Siłowe', 'Szybkościowe']
    };

    return new Set([
        ...(genericCategoriesByRuleSet[ruleSetFolder] || []),
        ...Object.keys(skillsByCategory),
        ...Object.keys(spellsByList).filter(key => key !== '__listDescriptions')
    ]);
}

for (const ruleSetFolder of ['mordheimer', 'drachenfels']) {
    test(`${ruleSetFolder} fighter templates keep advancement categories separate from starting skills`, () => {
        const allowedCategories = collectAllowedCategoryNames(ruleSetFolder);

        getWarbandFiles(ruleSetFolder).forEach(filePath => {
            const warband = loadJson(filePath);

            (warband.fighters || []).forEach(fighter => {
                (fighter.skills || []).forEach(skillCategory => {
                    assert.equal(
                        allowedCategories.has(skillCategory),
                        true,
                        `${path.basename(filePath)} fighter "${fighter.name}" uses unknown advancement category "${skillCategory}"`,
                    );
                });

                (fighter.starting_skills || []).forEach(skillName => {
                    assert.equal(
                        (fighter.rules || []).includes(skillName),
                        false,
                        `${path.basename(filePath)} fighter "${fighter.name}" duplicates "${skillName}" in rules`,
                    );
                    assert.notEqual(
                        fighter.spell_list,
                        skillName,
                        `${path.basename(filePath)} fighter "${fighter.name}" duplicates "${skillName}" in spell_list`,
                    );
                });
            });
        });
    });
}
