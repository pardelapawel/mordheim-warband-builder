(function (globalScope, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    globalScope.HeaderScroll = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function getNextScrolledState({
        scrollY,
        isScrolled,
        collapseThreshold = 120,
        expandThreshold = 48,
        collapseOnScroll = true
    }) {
        if (!collapseOnScroll) {
            return false;
        }

        return isScrolled
            ? scrollY > expandThreshold
            : scrollY > collapseThreshold;
    }

    function getHeaderLayoutState({
        viewportWidth,
        isScrolled,
        mobileBreakpoint = 768
    }) {
        const isMobileViewport = viewportWidth <= mobileBreakpoint;

        return {
            isMobileViewport,
            useStickySummaryBar: true,
            collapseOnScroll: false,
            stickCompactToTopCard: false
        };
    }

    function getSummaryBarPinnedState({
        summaryBarTop,
        tolerance = 1
    }) {
        return summaryBarTop <= tolerance;
    }

    return { getNextScrolledState, getHeaderLayoutState, getSummaryBarPinnedState };
});
