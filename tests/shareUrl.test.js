'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('index loads lz-string for compressed URL sharing', () => {
    assert.match(indexHtml, /<script src="lz-string\.min\.js"><\/script>/);
});

test('save flow updates share URL with history.replaceState', () => {
    assert.match(
        appJs,
        /function updateShareUrl\(\) \{[\s\S]*params\.set\(SHARE_WARBAND_PARAM,\s*toUrlSafeBase64\(compressed\)\);[\s\S]*history\.replaceState\(null,\s*'',[\s\S]*\);[\s\S]*\}/,
    );
});

test('load flow restores warband state from URL parameter', () => {
    assert.match(
        appJs,
        /function loadFromCache\(\) \{[\s\S]*new URLSearchParams\(window\.location\.search\)[\s\S]*params\.get\(SHARE_WARBAND_PARAM\)[\s\S]*decodeWarbandFromUrl\(sharedBand\)[\s\S]*applyLoadedWarband\(decoded\)[\s\S]*return;[\s\S]*\}/,
    );
});
