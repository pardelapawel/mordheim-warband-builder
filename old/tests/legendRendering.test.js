'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

test('escapeHtml preserves numeric spell difficulties for glossary rendering', () => {
    const start = appJs.indexOf('function escapeHtml');
    const end = appJs.indexOf('function runValidations');
    assert.ok(start > -1 && end > start, 'Could not locate escapeHtml in app.js');

    const context = { console };
    context.globalThis = context;
    vm.createContext(context);
    vm.runInContext(appJs.slice(start, end), context);

    assert.equal(context.escapeHtml(8), '8');
});
