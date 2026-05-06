'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEPLOY_FILES = [
    'index.html',
    'style.css',
    'app.js',
    'headerScroll.js',
    'warbandUtils.js',
    'nameGenerator.js',
    'printUtils.js',
    'data.json'
];

const DEPLOY_DIRS = ['data'];

function copyEntries(rootDir, outDir, entries) {
    for (const entry of entries) {
        fs.cpSync(path.join(rootDir, entry), path.join(outDir, entry), { recursive: true });
    }
}

function preparePages({
    rootDir = process.cwd(),
    outDir = path.join(process.cwd(), 'dist-pages')
} = {}) {
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });

    copyEntries(rootDir, outDir, DEPLOY_FILES);
    copyEntries(rootDir, outDir, DEPLOY_DIRS);
    fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
}

module.exports = {
    DEPLOY_FILES,
    DEPLOY_DIRS,
    preparePages
};

if (require.main === module) {
    try {
        preparePages();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
