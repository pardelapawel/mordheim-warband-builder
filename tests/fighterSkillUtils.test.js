'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
    getTemplateStartingSkills,
    getTemplateAllowedSkillNames,
    isSkillAllowedForTemplate
} = require('../fighterSkillUtils.js');

function createMasterData() {
    return {
        skillsByCategory: {
            Combat: [{ name: 'Strike to Injure' }],
            Speed: [{ name: 'Leap' }],
            'Sisters of Sigmar': [{ name: 'Sigmarite Fervour' }]
        },
        spellsByList: {
            'Prayers of Sigmar': [{ name: 'Healing Hand' }]
        }
    };
}

test('getTemplateStartingSkills uses rules spell_list and starting_skills only', () => {
    const skills = getTemplateStartingSkills({
        rules: ['Leader'],
        spell_list: 'Prayers of Sigmar',
        starting_skills: ['Step Aside'],
        skills: ['Combat', 'Speed', 'Sisters of Sigmar']
    });

    assert.deepEqual(skills, [
        { name: 'Leader' },
        { name: 'Prayers of Sigmar' },
        { name: 'Step Aside' }
    ]);
});

test('getTemplateAllowedSkillNames expands advancement categories into concrete skill names', () => {
    const allowed = getTemplateAllowedSkillNames(
        { skills: ['Combat', 'Prayers of Sigmar', 'Sisters of Sigmar'] },
        createMasterData()
    );

    assert.equal(allowed.has('strike to injure'), true);
    assert.equal(allowed.has('healing hand'), true);
    assert.equal(allowed.has('sigmarite fervour'), true);
    assert.equal(allowed.has('leader'), false);
});

test('isSkillAllowedForTemplate rejects off-tree skills', () => {
    const template = { skills: ['Combat', 'Prayers of Sigmar'] };
    const masterData = createMasterData();

    assert.equal(isSkillAllowedForTemplate('Strike to Injure', template, masterData), true);
    assert.equal(isSkillAllowedForTemplate('Healing Hand', template, masterData), true);
    assert.equal(isSkillAllowedForTemplate('Leap', template, masterData), false);
});
