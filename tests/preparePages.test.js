'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { DEPLOY_FILES, DEPLOY_DIRS, preparePages } = require('../scripts/preparePages.js');

const rootDir = path.join(__dirname, '..');
const outDir = path.join(__dirname, 'artifacts', 'prepare-pages-output');
const deployWorkflowPath = path.join(rootDir, '.github', 'workflows', 'deploy.yml');
const prPreviewWorkflowPath = path.join(rootDir, '.github', 'workflows', 'pr-preview.yml');

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

test('pr preview workflow publishes to a PR-specific gh-pages path', async () => {
    const workflow = await fs.promises.readFile(prPreviewWorkflowPath, 'utf8');

    assert.match(workflow, /PREVIEW_PATH: pr-\$\{\{ github\.event\.pull_request\.number \}\}/);
    assert.match(workflow, /PREVIEW_URL: .*\/pr-\$\{\{ github\.event\.pull_request\.number \}\}\//);
    assert.match(workflow, /mkdir -p "gh-pages\/\$\{PREVIEW_PATH\}"/);
    assert.match(workflow, /cp -R dist-pages\/\. "gh-pages\/\$\{PREVIEW_PATH\}\/"/);
});

test('pr preview workflow checks out an immutable PR SHA and serializes gh-pages writes', async () => {
    const workflow = await fs.promises.readFile(prPreviewWorkflowPath, 'utf8');

    assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
    assert.match(workflow, /concurrency:\r?\n\s+group: gh-pages/);
    assert.match(workflow, /cancel-in-progress: false/);
});

test('deploy workflow publishes dist-pages into gh-pages root', async () => {
    const workflow = await fs.promises.readFile(deployWorkflowPath, 'utf8');

    assert.match(workflow, /ref:\s*gh-pages/);
    assert.match(workflow, /path:\s*gh-pages/);
    assert.match(workflow, /Copy-Item dist-pages\\\* gh-pages\\/);
    assert.doesNotMatch(workflow, /actions\/deploy-pages@v4/);
});

test('deploy workflow preserves existing PR preview directories', async () => {
    const workflow = await fs.promises.readFile(deployWorkflowPath, 'utf8');

    assert.match(workflow, /Get-ChildItem gh-pages -Force/);
    assert.match(workflow, /-notlike 'pr-\*'/);
});

test('preview workflow remains branch-based and updates one PR directory', async () => {
    const workflow = await fs.promises.readFile(prPreviewWorkflowPath, 'utf8');

    assert.match(workflow, /ref:\s*gh-pages/);
    assert.match(workflow, /mkdir -p "gh-pages\/\$\{PREVIEW_PATH\}"/);
    assert.match(workflow, /git -C gh-pages add -A "\$\{PREVIEW_PATH\}"/);
    assert.match(workflow, /const marker = '<!-- pr-preview-link -->';/);
});

test('preparePages includes legendUtils runtime asset', () => {
    removeOutputDir();

    preparePages({ rootDir, outDir });

    assert.equal(fs.existsSync(path.join(outDir, 'legendUtils.js')), true);
});

test('preparePages includes every local script referenced by index.html', async () => {
    const indexHtml = await fs.promises.readFile(path.join(rootDir, 'index.html'), 'utf8');
    const scriptSources = Array.from(indexHtml.matchAll(/<script\s+src="([^"]+)"><\/script>/g), match => match[1])
        .filter(src => !src.startsWith('http'));

    for (const src of scriptSources) {
        assert.equal(
            DEPLOY_FILES.includes(src),
            true,
            `${src} should be listed in DEPLOY_FILES so GitHub Pages gets the runtime asset`
        );
    }
});
