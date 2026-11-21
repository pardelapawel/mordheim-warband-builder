import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const COUNTER_SRC='//gc.zgo.at/count.js';

test('counter script points at GoatCounter',()=>{
  assert.match(html,/<script data-goatcounter="https:\/\/wiedzmin\.goatcounter\.com\/count" async src="\/\/gc\.zgo\.at\/count\.js"><\/script>/);
});

function counterSettings(pathname,search=''){
  const m=html.match(/<script>([^<]*window\.goatcounter[^<]*)<\/script>/);
  assert.ok(m,'counter settings script present');
  const window={};vm.runInNewContext(m[1],{window,location:{pathname,search}});
  return window.goatcounter;
}

test('counter settings run before the counter script',()=>{
  assert.ok(html.indexOf('window.goatcounter')<html.indexOf(COUNTER_SRC));
});

test('preview pages are not counted',()=>{
  assert.equal(counterSettings('/pr-12/').no_onload,true);
  assert.equal(counterSettings('/').no_onload,false);
  assert.equal(counterSettings('/pr-notes/').no_onload,false);
});

test('share links do not send band data to the counter',()=>{
  assert.equal(counterSettings('/','?band=N4IgLgpg').path,'/');
  assert.equal(counterSettings('/pr-3/','?band=x').path,'/pr-3/');
});

test('app code does not depend on the counter',()=>{
  const srcDir=fileURLToPath(new URL('../src',import.meta.url));
  const files=fs.readdirSync(srcDir,{recursive:true}).filter(f=>fs.statSync(path.join(srcDir,f)).isFile());
  for(const f of files)assert.ok(!fs.readFileSync(path.join(srcDir,f),'utf8').includes('goatcounter'),f);
});

test('feedback link opens the form',()=>{
  const nav=html.match(/<nav class="resource-links no-print"[\s\S]*?<\/nav>/);
  assert.ok(nav,'resource-links nav present');
  assert.ok(nav[0].includes('<a href="https://tally.so/r/ArBL1D" target="_blank" rel="noopener noreferrer">Zgłoś błąd lub pomysł</a>'));
});

test('published page keeps the counter',()=>{
  const {preparePages}=require('../scripts/preparePages.cjs');
  const rootDir=fileURLToPath(new URL('..',import.meta.url)),outDir=fileURLToPath(new URL('../tmp/test-pages-hooks',import.meta.url));
  const out=fs.readFileSync(preparePages({rootDir,outDir})+'/index.html','utf8');
  assert.ok(out.includes(COUNTER_SRC));
});
