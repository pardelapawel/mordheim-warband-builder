'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { DEPLOY_FILES, DEPLOY_DIRS, preparePages } = require('../scripts/preparePages.js');

const rootDir = path.join(__dirname, '..');
const outDir = path.join(__dirname, 'artifacts', 'prepare-pages-output');

function removeOutputDir() {
    fs.rmSync(outDir, { recursive: true, force: true });
}

after(() => {
    removeOutputDir();
});

test('prepare:pages script is defined in package.json', async () => {
    const packageJson = JSON.parse(await fs.promises.readFile(path.join(__dirname, '..', 'package.json'), 'utf8'));
    assert.equal(packageJson.scripts['prepare:pages'], 'node ./scripts/preparePages.js');
});

test('preparePages copies deploy assets and excludes repo-only folders', () => {
    removeOutputDir();

    preparePages({ rootDir, outDir });

    for (const fileName of DEPLOY_FILES) {
        assert.equal(fs.existsSync(path.join(outDir, fileName)), true, `${fileName} should be copied`);
    }

    for (const dirName of DEPLOY_DIRS) {
        assert.equal(fs.existsSync(path.join(outDir, dirName)), true, `${dirName} should be copied`);
    }

    assert.equal(fs.existsSync(path.join(outDir, '.nojekyll')), true);
    assert.equal(fs.existsSync(path.join(outDir, 'tests')), false);
    assert.equal(fs.existsSync(path.join(outDir, '.github')), false);
});
