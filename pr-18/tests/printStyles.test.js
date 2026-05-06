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

test('print mode keeps cards at fixed height', () => {
    assert.match(
        styleCss,
        /@media print[\s\S]*\.fighter-card[\s\S]*height:\s*99mm !important;[\s\S]*max-height:\s*99mm !important;[\s\S]*overflow:\s*hidden !important;/,
    );
});

test('print mode shows summary rows and hides item rows', () => {
    assert.match(
        styleCss,
        /@media print[\s\S]*\.print-summary[\s\S]*display:\s*block !important;/,
    );
    assert.match(
        styleCss,
        /@media print[\s\S]*\.item-row[\s\S]*display:\s*none !important;/,
    );
});

test('print mode removes flex gutter layout from summary sections', () => {
    assert.match(
        styleCss,
        /@media print[\s\S]*\.section-layout[\s\S]*display:\s*block !important;[\s\S]*padding-left:\s*0 !important;[\s\S]*margin-left:\s*0 !important;/,
    );
});

test('print mode hides section icons and guide line', () => {
    assert.match(
        styleCss,
        /@media print[\s\S]*\.section-icon[\s\S]*display:\s*none !important;/,
    );
    assert.match(
        styleCss,
        /@media print[\s\S]*\.section-layout::before[\s\S]*display:\s*none !important;/,
    );
});

test('print mode hides old item lists completely', () => {
    assert.match(
        styleCss,
        /@media print[\s\S]*\.item-list[\s\S]*display:\s*none !important;/,
    );
});
