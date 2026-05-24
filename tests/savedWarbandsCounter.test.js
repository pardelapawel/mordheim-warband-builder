'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractBalancedBlock(source, startPattern) {
    const start = source.indexOf(startPattern);
    assert.notEqual(start, -1, `Could not find start pattern: ${startPattern}`);

    const blockStart = source.indexOf('{', start);
    assert.notEqual(blockStart, -1, `Could not find opening brace for: ${startPattern}`);

    let depth = 0;
    for (let index = blockStart; index < source.length; index += 1) {
        const char = source[index];
        if (char === '{') depth += 1;
        if (char === '}') depth -= 1;
        if (depth === 0) {
            return source.slice(start, index + 1);
        }
    }

    throw new Error(`Could not find balanced block for: ${startPattern}`);
}

function createClassList(initialClasses = []) {
    const classes = new Set(initialClasses);
    return {
        add: (className) => { classes.add(className); },
        toggle: (className) => {
            if (classes.has(className)) classes.delete(className);
            else classes.add(className);
        },
        contains: (className) => classes.has(className)
    };
}

function createStorage(initialState) {
    const store = new Map(Object.entries(initialState));
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => { store.set(key, value); }
    };
}

function createListItem() {
    const clickableLabel = { onclick: null };
    const deleteButton = { onclick: null };

    return {
        className: '',
        style: {},
        innerHTML: '',
        querySelector: (selector) => {
            if (selector === 'span') return clickableLabel;
            if (selector === '.delete-save-btn') return deleteButton;
            return null;
        }
    };
}

test('save manager toggle never falls back to the generic Saves label', () => {
    assert.match(indexHtml, />0 Cached ▾<\/button>/);
    assert.doesNotMatch(indexHtml, />Saves [^<]*<\/button>/);
});

test('renderSavedList updates the toggle with the saved warbands count', () => {
    const updateSaveManagerToggleSource = extractBalancedBlock(appJs, 'function updateSaveManagerToggle(savedCount)');
    const renderSavedListSource = extractBalancedBlock(appJs, 'function renderSavedList()');

    const toggleBtn = { textContent: 'stale' };
    const saveManager = { classList: createClassList() };
    const savedList = {
        innerHTML: 'old',
        appended: [],
        appendChild(node) {
            this.appended.push(node);
        }
    };

    const context = {
        JSON,
        document: {
            getElementById: (id) => {
                if (id === 'save-manager-toggle') return toggleBtn;
                if (id === 'save-manager') return saveManager;
                if (id === 'saved-warbands-list') return savedList;
                throw new Error(`Unexpected element id: ${id}`);
            },
            createElement: () => createListItem()
        },
        localStorage: createStorage({
            mordheim_saves: JSON.stringify([{ name: 'Alpha' }, { name: 'Beta' }])
        })
    };

    vm.createContext(context);
    vm.runInContext(`${updateSaveManagerToggleSource}\n${renderSavedListSource}\nthis.renderSavedList = renderSavedList;`, context);

    context.renderSavedList();

    assert.equal(toggleBtn.textContent, '2 Cached ▾');
    assert.equal(savedList.appended.length, 2);
    assert.ok(!toggleBtn.textContent.includes('Saves'));
});

test('mobile save manager toggle keeps the cached count while expanding and collapsing', () => {
    const updateSaveManagerToggleSource = extractBalancedBlock(appJs, 'function updateSaveManagerToggle(savedCount)');
    const initMobileUISource = extractBalancedBlock(appJs, 'function initMobileUI()');

    const toggleBtn = { textContent: '', onclick: null };
    const saveManager = { classList: createClassList() };
    const context = {
        JSON,
        document: {
            getElementById: (id) => {
                if (id === 'save-manager-toggle') return toggleBtn;
                if (id === 'save-manager') return saveManager;
                throw new Error(`Unexpected element id: ${id}`);
            }
        },
        window: { innerWidth: 480 },
        localStorage: createStorage({
            mordheim_saves: JSON.stringify([{ name: 'Alpha' }, { name: 'Beta' }, { name: 'Gamma' }])
        })
    };

    vm.createContext(context);
    vm.runInContext(`${updateSaveManagerToggleSource}\n${initMobileUISource}\nthis.initMobileUI = initMobileUI;`, context);

    context.initMobileUI();
    assert.equal(toggleBtn.textContent, '3 Cached ▴');

    toggleBtn.onclick();
    assert.equal(toggleBtn.textContent, '3 Cached ▾');
});
