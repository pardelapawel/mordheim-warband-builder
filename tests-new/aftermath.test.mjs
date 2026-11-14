import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newBand,createFighter,normalizeBand,textExport} from '../src/model.mjs';
import {ADVANCE_THRESHOLDS} from '../src/progression.mjs';
import {assembleCatalog} from '../src/catalog.mjs';
const read=(file,set='dlugobrody')=>JSON.parse(fs.readFileSync(new URL(`../data/${set}/${file}`,import.meta.url),'utf8'));
function catalog(type='awanturnicy'){
  return assembleCatalog(type,{equipment:read('equipment.json'),skills:read('skills.json'),spells:read('spells.json'),band:read(`warbands/${type}.json`),progression:read('progression.json'),ruleMetadata:read('rules.json'),artifacts:read('artifacts.json')});
}
const recruit=(name,c=catalog())=>createFighter(c.fighters.find(t=>t.name===name),c);

test('advance thresholds are shared and match the roster track',()=>{
  assert.deepEqual(ADVANCE_THRESHOLDS,[2,4,6,8,11,14,17,20,24,28,32,36,41,46,51,57,63,69,76,83,90]);
});
test('new bands track armour fragments in the treasury',()=>{
  assert.deepEqual(newBand().treasury,{gold:0,shards:0,armourFragments:0,notes:''});
});
test('old saves get zero armour fragments and stored values become numbers',()=>{
  const old=newBand();delete old.treasury.armourFragments;
  assert.equal(normalizeBand(old).treasury.armourFragments,0);
  const saved=newBand();saved.treasury.armourFragments='7';
  assert.equal(normalizeBand(saved).treasury.armourFragments,7);
});
test('text export lists armour fragments',()=>{
  const b=newBand();b.treasury.armourFragments=3;
  assert.match(textExport(b,catalog()),/Fragmenty pancerza: 3/);
});
