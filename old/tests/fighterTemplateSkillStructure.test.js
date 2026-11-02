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

test('mordheimer casters declare their starting spell list explicitly', () => {
    const spellsByList = loadJson(path.join(__dirname, '..', 'data', 'mordheimer', 'spells.json'));
    const spellListNames = new Set(Object.keys(spellsByList).filter(key => key !== '__listDescriptions'));
    const missingSpellLists = [];

    getWarbandFiles('mordheimer').forEach(filePath => {
        const warband = loadJson(filePath);

        (warband.fighters || []).forEach(fighter => {
            const matchingSpellLists = (fighter.skills || []).filter(skillCategory => spellListNames.has(skillCategory));
            if (matchingSpellLists.length === 0) return;

            assert.equal(
                matchingSpellLists.length,
                1,
                `${path.basename(filePath)} fighter "${fighter.name}" should not declare multiple spell-list categories`,
            );

            if (fighter.spell_list !== matchingSpellLists[0]) {
                missingSpellLists.push({
                    file: path.basename(filePath),
                    fighter: fighter.name,
                    expected: matchingSpellLists[0],
                    actual: fighter.spell_list || null
                });
            }
        });
    });

    assert.deepEqual(missingSpellLists, []);
});

test('mordheimer fighters with required starting category picks declare them explicitly', () => {
    const expectations = [
        { file: 'cult_of_the_possessed.json', fighter: 'The Possessed', skillGroup: 'Mutations' },
        { file: 'cult_of_the_possessed.json', fighter: 'Mutant', skillGroup: 'Mutations' },
        { file: 'carnival_of_chaos.json', fighter: 'Tainted One', skillGroup: 'Blessings of Nurgle' }
    ];

    expectations.forEach(({ file, fighter, skillGroup }) => {
        const warband = loadJson(path.join(__dirname, '..', 'data', 'mordheimer', 'warbands', file));
        const template = (warband.fighters || []).find(entry => entry.name === fighter);
        assert.ok(template, `${file} missing fighter "${fighter}"`);
        assert.deepEqual(template.required_starting_skill_groups || [], [skillGroup]);
        assert.ok((template.starting_skills || []).includes(skillGroup));
    });
});
