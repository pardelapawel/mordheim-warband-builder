'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

test('validation UI reads severity when rendering badges and inline messages', () => {
    assert.match(appJs, /err\.severity\s*\|\|\s*'error'/);
    assert.match(appJs, /validation-warning-item validation-\$\{severity\}/);
    assert.match(appJs, /validation-badge material-symbols-outlined no-print validation-\$\{severity\}/);
});

test('validation UI shows grouped summary counts for errors warnings and tips', () => {
    assert.match(appJs, /errorCount/);
    assert.match(appJs, /warningCount/);
    assert.match(appJs, /tipCount/);
    assert.match(appJs, /error\$\{errorCount === 1 \? '' : 's'\}/);
    assert.match(appJs, /warning\$\{warningCount === 1 \? '' : 's'\}/);
    assert.match(appJs, /tip\$\{tipCount === 1 \? '' : 's'\}/);
});

test('validation styles define distinct colors for error warning and tip states', () => {
    assert.match(styleCss, /\.fighter-card\.has-validation-warning/);
    assert.match(styleCss, /\.validation-badge\.validation-error/);
    assert.match(styleCss, /\.validation-warning-item\.validation-error/);
    assert.match(styleCss, /\.validation-warning-item\.validation-warning/);
    assert.match(styleCss, /\.validation-warning-item\.validation-tip/);
    assert.match(styleCss, /\.validation-error-card\.validation-warning/);
    assert.match(styleCss, /\.validation-error-card\.validation-tip/);
    assert.match(styleCss, /\.validation-badge\.validation-warning/);
    assert.match(styleCss, /\.validation-badge\.validation-tip/);
});

test('validation fix buttons define distinct colors for error warning and tip states', () => {
    assert.match(appJs, /inline-fix-btn no-print validation-\$\{severity\}/);
    assert.match(appJs, /fix-btn no-print validation-\$\{severity\}/);
    assert.match(styleCss, /\.inline-fix-btn\.validation-warning/);
    assert.match(styleCss, /\.inline-fix-btn\.validation-tip/);
    assert.match(styleCss, /\.fix-btn\.validation-warning/);
    assert.match(styleCss, /\.fix-btn\.validation-tip/);
});
