const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styleCss = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

function extractMediaPrintBlock(css) {
    const mediaPrintIndex = css.indexOf('@media print');
    if (mediaPrintIndex === -1) return null;
    
    const openBraceIndex = css.indexOf('{', mediaPrintIndex);
    if (openBraceIndex === -1) return null;
    
    let braceCount = 1;
    let i = openBraceIndex + 1;
    
    while (i < css.length && braceCount > 0) {
        if (css[i] === '{') {
            braceCount++;
        } else if (css[i] === '}') {
            braceCount--;
        }
        i++;
    }
    
    if (braceCount === 0) {
        return css.slice(openBraceIndex + 1, i - 1);
    }
    
    return null;
}

test('print mode restores folded card content using expanded-card layout rules', () => {
    assert.match(
        styleCss,
        /@media print[\s\S]*\.fighter-card\.folded \.stats-table[\s\S]*display:\s*flex !important;/,
    );
    assert.match(
        styleCss,
        /@media print[\s\S]*\.fighter-card\.folded \.card-section,[\s\S]*\.fighter-card\.folded \.exp-track-section[\s\S]*display:\s*block !important;/,
    );
    assert.doesNotMatch(
        styleCss,
        /@media print[\s\S]*\.fighter-card\.folded \.combobox-container[\s\S]*display:\s*flex !important;/,
    );
    assert.doesNotMatch(
        styleCss,
        /@media print[\s\S]*\.fighter-card\.folded \.type-selection[\s\S]*display:\s*block !important;/,
    );
});

test('print mode hides validation UI completely', () => {
    assert.match(
        styleCss,
        /@media print[\s\S]*\.validation-sidebar[\s\S]*display:\s*none !important;/,
    );
    assert.match(
        styleCss,
        /@media print[\s\S]*\.validation-warnings[\s\S]*display:\s*none !important;/,
    );
    assert.match(
        styleCss,
        /@media print[\s\S]*\.validation-badge[\s\S]*display:\s*none !important;/,
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

test('exp-track uses fluid 30-column grid in screen styles', () => {
    const beforePrint = styleCss.split('@media print')[0];
    assert.match(
        beforePrint,
        /\.exp-track-labels\s*\{[\s\S]*?grid-template-columns:\s*repeat\(30,\s*minmax\(0,\s*1fr\)\)/,
        'exp-track-labels should use fluid grid with minmax(0, 1fr)',
    );
    assert.match(
        beforePrint,
        /\.exp-track\s*\{[\s\S]*?grid-template-columns:\s*repeat\(30,\s*minmax\(0,\s*1fr\)\)/,
        'exp-track should use fluid grid with minmax(0, 1fr)',
    );
});

test('exp-track uses fluid 30-column grid in print styles', () => {
    const printBlock = extractMediaPrintBlock(styleCss);
    assert.ok(printBlock, 'Should have @media print block');
    assert.match(
        printBlock,
        /\.exp-track-labels[\s\S]*?grid-template-columns:\s*repeat\(30,\s*minmax\(0,\s*1fr\)\)\s*!important;/,
        'exp-track-labels should use fluid grid in print mode',
    );
    assert.match(
        printBlock,
        /\.exp-track\s*\{[\s\S]*?grid-template-columns:\s*repeat\(30,\s*minmax\(0,\s*1fr\)\)\s*!important;/,
        'exp-track should use fluid grid in print mode',
    );
});

test('exp-box uses width 100% and aspect-ratio 1/1', () => {
    const beforePrint = styleCss.split('@media print')[0];
    assert.match(
        beforePrint,
        /\.exp-box\s*\{[\s\S]*?width:\s*100%/,
        'exp-box should use width: 100%',
    );
    assert.match(
        beforePrint,
        /@supports\s*\(aspect-ratio:\s*1\s*\/\s*1\)[\s\S]*?\.exp-box\s*\{[\s\S]*?aspect-ratio:\s*1\s*\/\s*1/,
        'exp-box should use aspect-ratio: 1 / 1 inside @supports block',
    );
});

test('exp-box does not set fixed width or height in print mode', () => {
    const printBlock = extractMediaPrintBlock(styleCss);
    assert.ok(printBlock, 'Should have @media print block');
    const expBoxRuleMatch = printBlock.match(/\.exp-box\s*\{([^}]*)\}/);
    if (expBoxRuleMatch) {
        const expBoxRules = expBoxRuleMatch[1];
        assert.doesNotMatch(
            expBoxRules,
            /width:\s*\d+px/,
            'exp-box should not have fixed pixel width in print mode',
        );
        assert.doesNotMatch(
            expBoxRules,
            /height:\s*\d+px/,
            'exp-box should not have fixed pixel height in print mode',
        );
    }
});

test('cost info supports base total and exp on one line in screen styles', () => {
    const beforePrint = styleCss.split('@media print')[0];
    assert.match(
        beforePrint,
        /\.cost-info\s*\{[\s\S]*display:\s*flex[\s\S]*align-items:\s*center/
    );
    // parse CSS rules and collect blocks where .cost-info is a standalone selector (in selector list)
    const ruleRegex = /([^\{]+)\{([\s\S]*?)\}/g;
    const costInfoMatches = [];
    let m;
    while ((m = ruleRegex.exec(beforePrint)) !== null) {
        const selectorList = m[1];
        const selectors = selectorList.split(',');
        for (const sel of selectors) {
            const tokens = sel.trim().split(/\s+/);
            if (tokens.includes('.cost-info')) {
                costInfoMatches.push(m[2]);
                break;
            }
        }
    }
    assert.ok(costInfoMatches.length > 0, 'Should have at least one .cost-info rule in screen styles');
    // none of the .cost-info rule blocks may set column direction
    for (const rules of costInfoMatches) {
        assert.doesNotMatch(rules, /flex-direction:\s*column/, '.cost-info rules should not set flex-direction: column');
    }
    // require at least one rules block explicitly sets display:flex and centers items (ensures one-line cost layout still present)
    const hasFlexCentered = costInfoMatches.some(r => /display:\s*flex/.test(r) && /align-items:\s*center/.test(r));
    assert.ok(hasFlexCentered, 'At least one .cost-info rule must use display:flex and align-items:center to preserve one-line cost layout');
    const groupedSelectors = ['.cost-input-container', '.total-card-cost', '.fighter-exp-summary'];
    ruleRegex.lastIndex = 0;
    for (const gs of groupedSelectors) {
        let found = false;
        while ((m = ruleRegex.exec(beforePrint)) !== null) {
            const selectorList = m[1].split(',').map(s => s.trim());
            if (selectorList.some(s => s.split(/\s+/).includes(gs))) {
                const rules = m[2];
                if (/display:\s*inline-flex/.test(rules) && /align-items:\s*center/.test(rules)) {
                    found = true;
                    break;
                }
            }
        }
        assert.ok(found, `Selector ${gs} should have display:inline-flex and align-items:center in some rule`);
        ruleRegex.lastIndex = 0;
    }
    // require font-size:0.8rem for each selector (allows grouped or separate rules)
    for (const gs of groupedSelectors) {
        ruleRegex.lastIndex = 0;
        let foundFont = false;
        while ((m = ruleRegex.exec(beforePrint)) !== null) {
            const selectorList = m[1].split(',').map(s => s.trim());
            if (selectorList.some(s => s.split(/\s+/).includes(gs))) {
                const rules = m[2];
                if (/font-size:\s*0\.8rem/.test(rules)) {
                    foundFont = true;
                    break;
                }
            }
        }
        assert.ok(foundFont, `Selector ${gs} should set font-size:0.8rem`);
    }
});


