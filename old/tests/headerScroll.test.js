const test = require('node:test');
const assert = require('node:assert/strict');

const { getNextScrolledState, getHeaderLayoutState, getSummaryBarPinnedState } = require('../headerScroll');

test('keeps header unfolded when scroll folding is disabled', () => {
    const nextScrolled = getNextScrolledState({
        viewportWidth: 1280,
        scrollY: 999,
        isScrolled: true,
        collapseThreshold: 120,
        expandThreshold: 48,
        mobileBreakpoint: 768,
        collapseOnScroll: false
    });

    assert.equal(nextScrolled, false);
});

test('uses sticky summary bar on mobile without top-card fold mode', () => {
    const layoutState = getHeaderLayoutState({
        viewportWidth: 480,
        isScrolled: true,
        mobileBreakpoint: 768
    });

    assert.deepEqual(layoutState, {
        isMobileViewport: true,
        useStickySummaryBar: true,
        collapseOnScroll: false,
        stickCompactToTopCard: false
    });
});

test('uses same sticky summary bar architecture on desktop', () => {
    const layoutState = getHeaderLayoutState({
        viewportWidth: 1280,
        isScrolled: false,
        mobileBreakpoint: 768
    });

    assert.deepEqual(layoutState, {
        isMobileViewport: false,
        useStickySummaryBar: true,
        collapseOnScroll: false,
        stickCompactToTopCard: false
    });
});

test('summary title stays hidden before sticky bar reaches top', () => {
    const isPinned = getSummaryBarPinnedState({
        summaryBarTop: 24
    });

    assert.equal(isPinned, false);
});

test('summary title appears once sticky bar reaches top', () => {
    const isPinned = getSummaryBarPinnedState({
        summaryBarTop: 0
    });

    assert.equal(isPinned, true);
});
