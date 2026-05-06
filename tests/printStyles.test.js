const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styleCss = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

test('print mode forces folded card sections visible', () => {
    assert.match(
        styleCss,
        /@media print[\s\S]*\.fighter-card\.folded \.stats-table[\s\S]*display:\s*grid !important;/,
    );
    assert.match(
        styleCss,
        /@media print[\s\S]*\.fighter-card\.folded \.card-section,[\s\S]*\.fighter-card\.folded \.combobox-container,[\s\S]*\.fighter-card\.folded \.validation-warnings,[\s\S]*\.fighter-card\.folded \.type-selection[\s\S]*display:\s*block !important;/,
    );
});

test('print mode restores folded card header spacing', () => {
    assert.match(
        styleCss,
        /@media print[\s\S]*\.fighter-card\.folded \.card-header[\s\S]*border-bottom:\s*2px solid[\s\S]*margin-bottom:\s*1rem[\s\S]*padding-bottom:\s*0\.8rem/,
    );
});
