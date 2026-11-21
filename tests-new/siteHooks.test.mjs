import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const COUNTER_SRC='//gc.zgo.at/count.js';

test('counter script points at GoatCounter',()=>{
  assert.match(html,/<script data-goatcounter="https:\/\/wiedzmin\.goatcounter\.com\/count" async src="\/\/gc\.zgo\.at\/count\.js"><\/script>/);
});

test('preview pages are not counted',()=>{
  const guard='<script>if(/^\\/pr-\\d+\\//.test(location.pathname))window.goatcounter={no_onload:true}</script>';
  assert.ok(html.includes(guard),'guard script present');
  assert.ok(html.indexOf(guard)<html.indexOf(COUNTER_SRC),'guard runs before counter');
  const pattern=/^\/pr-\d+\//;
  assert.ok(pattern.test('/pr-12/'));assert.ok(!pattern.test('/'));assert.ok(!pattern.test('/pr-notes/'));
});

test('app code does not depend on the counter',()=>{
  const srcDir=fileURLToPath(new URL('../src',import.meta.url));
  const files=fs.readdirSync(srcDir,{recursive:true}).filter(f=>fs.statSync(path.join(srcDir,f)).isFile());
  for(const f of files)assert.ok(!fs.readFileSync(path.join(srcDir,f),'utf8').includes('goatcounter'),f);
});

test('published page keeps the counter',()=>{
  const {preparePages}=require('../scripts/preparePages.cjs');
  const rootDir=fileURLToPath(new URL('..',import.meta.url)),outDir=fileURLToPath(new URL('../tmp/test-pages-hooks',import.meta.url));
  const out=fs.readFileSync(preparePages({rootDir,outDir})+'/index.html','utf8');
  assert.ok(out.includes(COUNTER_SRC));
});
