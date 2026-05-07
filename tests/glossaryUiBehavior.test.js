'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

test('equipment rename updates print summaries and glossary immediately', () => {
    assert.match(
        appJs,
        /nameEdit\.oninput = \(\) => \{[\s\S]*renameEquipmentEntry\([\s\S]*updateCardPrintSummaries\(cardEl,\s*currentWarband\.fighters\[index\]\)[\s\S]*updateLegend\(\)[\s\S]*saveToCache\(\)/,
    );
});

test('skill rename updates print summaries and glossary immediately', () => {
    assert.match(
        appJs,
        /currentWarband\.fighters\[index\]\.skills\[skillIdx\]\.name = nameEdit\.value;[\s\S]*updateCardPrintSummaries\(cardEl,\s*currentWarband\.fighters\[index\]\)[\s\S]*updateLegend\(\)[\s\S]*saveToCache\(\)/,
    );
});

test('glossary description edits update print text immediately', () => {
    assert.match(
        appJs,
        /const printEl = input\.parentElement\?\.\s*querySelector\('\.legend-item-desc'\);[\s\S]*if \(printEl\) printEl\.textContent = input\.value;/,
    );
});
