'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const HeaderScroll = require('../headerScroll');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

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

test('sticky summary bar click scrolls the page back to top', () => {
    const initScrollHeaderSource = extractBalancedBlock(appJs, 'function initScrollHeader()');

    const eventHandlers = {};
    const summaryBarClassList = {
        remove: () => {},
        toggle: () => {}
    };
    const headerClassList = {
        remove: () => {}
    };
    const summaryBar = {
        hidden: false,
        classList: summaryBarClassList,
        getBoundingClientRect: () => ({ top: 0 }),
        addEventListener: (eventName, handler) => {
            eventHandlers[eventName] = handler;
        }
    };
    const header = {
        classList: headerClassList
    };

    const context = {
        document: {
            querySelector: (selector) => {
                if (selector === '.app-header') return header;
                if (selector === '.sticky-summary-bar') return summaryBar;
                return null;
            }
        },
        window: {
            innerWidth: 1280,
            requestAnimationFrame: (handler) => handler(),
            addEventListener: () => {},
            scrollTo: (options) => {
                context.scrollToOptions = options;
            }
        },
        scrollToOptions: null,
        globalThis: {
            HeaderScroll
        }
    };

    vm.createContext(context);
    vm.runInContext(`${initScrollHeaderSource}\nthis.initScrollHeader = initScrollHeader;`, context);

    context.initScrollHeader();
    assert.equal(typeof eventHandlers.click, 'function');

    eventHandlers.click();

    assert.equal(context.scrollToOptions?.top, 0);
    assert.equal(context.scrollToOptions?.behavior, 'smooth');
});
