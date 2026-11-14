import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newBand,createFighter,normalizeBand,textExport} from '../src/model.mjs';
import {ADVANCE_THRESHOLDS} from '../src/progression.mjs';
import {assembleCatalog} from '../src/catalog.mjs';
const read=(file,set='dlugobrody')=>JSON.parse(fs.readFileSync(new URL(`../data/${set}/${file}`,import.meta.url),'utf8'));
function catalog(type='awanturnicy'){
  return assembleCatalog(type,{equipment:read('equipment.json'),skills:read('skills.json'),spells:read('spells.json'),band:read(`warbands/${type}.json`),progression:read('progression.json'),ruleMetadata:read('rules.json'),artifacts:read('artifacts.json'),aftermath:read('aftermath.json')});
}
const recruit=(name,c=catalog())=>createFighter(c.fighters.find(t=>t.name===name),c);

test('post-battle tables are loaded into the catalog',()=>{
  const a=catalog().aftermath;
  assert.ok(a);
  const keys=a.exploration.finds.map(f=>`${f.size}x${f.value}`);
  assert.equal(keys.length,36);
  for(let size=1;size<=6;size++)for(let value=1;value<=6;value++)assert.ok(keys.includes(`${size}x${value}`),`${size}x${value}`);
  assert.equal(new Set(keys).size,36);
  assert.equal(a.warpstoneSale.rows.length,8);
  assert.equal(a.exploration.maxDice,6);
});
test('artefact d6 names exist in the artefact catalog',()=>{
  const c=catalog(),names=c.artifacts.map(x=>x.name);
  assert.equal(c.aftermath.artefacts.length,6);
  for(const name of c.aftermath.artefacts)assert.ok(names.includes(name),name);
});
test('Krótkobrody has the same post-battle tables',()=>{
  const file=set=>fs.readFileSync(new URL(`../data/${set}/aftermath.json`,import.meta.url));
  assert.ok(file('dlugobrody').equals(file('krotkobrody')));
});

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

// --- Task 3: injuries ---
import * as A from '../src/aftermath.mjs';
const kinds=r=>r.actions.map(a=>a.kind);
test('rollDie covers the full range',()=>{
  assert.equal(A.rollDie(6,()=>0.999),6);assert.equal(A.rollDie(6,()=>0),1);
});
test('pets die on 1-2 and recover on 3-6',()=>{
  const c=catalog(),pet=recruit('Pies bojowy',c);
  assert.deepEqual(A.resolveInjury(pet,{1:2},c).actions,[{kind:'remove',keepEquipment:false}]);
  assert.deepEqual(A.resolveInjury(pet,{1:3},c).actions,[]);
  const open=A.resolveInjury(pet,{},c);assert.equal(open.needs[0].key,'1');assert.equal(open.needs[0].sides,6);
});
test('hero injuries walk the nested table',()=>{
  const c=catalog(),f=recruit('Ludzki Najemnik',c);
  assert.equal(A.resolveInjury(f,{1:1},c).needs[0].key,'2');
  assert.deepEqual(A.resolveInjury(f,{1:1,2:2},c).actions,[{kind:'remove',keepEquipment:false}]);
  assert.deepEqual(A.resolveInjury(f,{1:1,2:3},c).actions,[{kind:'stat',stat:'t',delta:-1}]);
  assert.deepEqual(A.resolveInjury(f,{1:1,2:4,3:2},c).actions,[{kind:'stat',stat:'m',delta:-1}]);
  assert.match(A.resolveInjury(f,{1:1,2:4,3:5},c).actions[0].text,/nie może biegać/);
  assert.match(A.resolveInjury(f,{1:1,2:6,3:1},c).actions[0].text,/Głupota/);
  for(const roll of [4,5]){const r=A.resolveInjury(f,{1:roll},c);assert.deepEqual(r.actions,[]);assert.deepEqual(r.needs,[]);}
  assert.deepEqual(A.resolveInjury(f,{1:6,2:5},c).actions,[{kind:'exp',delta:1}]);
  assert.equal(A.resolveInjury(f,{1:6,2:1},c).needs[0].key,'3');
  assert.match(A.resolveInjury(f,{1:6,2:1,3:4},c).actions[0].text,/Nienawiść/);
});
test('losing the second eye removes the fighter but keeps equipment',()=>{
  const c=catalog(),f=recruit('Ludzki Najemnik',c);
  assert.deepEqual(A.resolveInjury(f,{1:2,2:1},c).actions,[{kind:'stat',stat:'bs',delta:-1},{kind:'note',text:'Oślepiony na jedno oko'}]);
  f.injuries='Oślepiony na jedno oko';
  assert.deepEqual(A.resolveInjury(f,{1:2,2:1},c).actions,[{kind:'remove',keepEquipment:true}]);
});
test('old wounds stack in the note',()=>{
  const c=catalog(),f=recruit('Ludzki Najemnik',c);f.injuries='Stara rana ×1: nie wychodzi na 1';
  assert.equal(A.resolveInjury(f,{1:3,2:1},c).actions[0].text,'Stara rana ×2: nie wychodzi na 1–2');
  f.injuries='';assert.equal(A.resolveInjury(f,{1:3,2:1},c).actions[0].text,'Stara rana ×1: nie wychodzi na 1');
});
