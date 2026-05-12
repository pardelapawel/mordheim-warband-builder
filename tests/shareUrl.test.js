'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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

test('URL-safe Base64 helpers and decode flow round-trip shared warband payloads', () => {
    const start = appJs.indexOf('function toUrlSafeBase64');
    const end = appJs.indexOf('function applyLoadedWarband');
    assert.ok(start > -1 && end > start, 'Could not locate share helper functions in app.js');
    const shareHelpers = appJs.slice(start, end);

    const sampleWarband = {
        name: 'Shared Band',
        ruleSetId: 'Dragon Rock',
        warbandTypeId: 'adventurers',
        fighters: [{ type: 'New Hero', baseCost: 0, equipment: [], skills: [] }],
        glossary: { descriptions: {}, deletedTerms: [] }
    };

    const context = {
        URLSearchParams,
        Buffer,
        currentWarband: sampleWarband,
        window: { location: { search: '', pathname: '/index.html', hash: '' } },
        history: {
            replaceState: (_state, _title, url) => { context.lastUrl = url; }
        },
        WarbandUtils: {
            serializeWarband: (warband) => JSON.stringify(warband),
            deserializeWarband: (json) => JSON.parse(json)
        },
        console
    };
    context.globalThis = context;
    context.LZString = {
        compressToBase64: (value) => Buffer.from(value, 'utf8').toString('base64'),
        decompressFromBase64: (value) => Buffer.from(value, 'base64').toString('utf8')
    };

    vm.createContext(context);
    vm.runInContext(`const SHARE_WARBAND_PARAM = 'band';\n${shareHelpers}`, context);

    context.updateShareUrl();
    assert.ok(context.lastUrl, 'Expected updateShareUrl to call history.replaceState');

    const encoded = new URLSearchParams(context.lastUrl.split('?')[1]).get('band');
    assert.ok(encoded, 'Expected shared URL to include a band payload');

    const decoded = context.decodeWarbandFromUrl(encoded);
    assert.deepEqual(decoded, sampleWarband);
});
