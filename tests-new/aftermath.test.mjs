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

// --- Task 4: experience and advances ---
test('crossed thresholds lie between old and new experience',()=>{
  assert.deepEqual(A.crossedThresholds(7,12),[8,11]);assert.deepEqual(A.crossedThresholds(20,20),[]);assert.deepEqual(A.crossedThresholds(1,2),[2]);
});
test('underdog bonus follows the rating gap',()=>{
  const c=catalog();
  assert.equal(A.underdogBonus(100,150,c),0);assert.equal(A.underdogBonus(100,151,c),1);assert.equal(A.underdogBonus(100,160,c),1);
  assert.equal(A.underdogBonus(100,251,c),4);assert.equal(A.underdogBonus(100,250,c),3);
  assert.equal(A.underdogBonus(200,100,c),0);assert.equal(A.underdogBonus(100,null,c),0);
});
test('battle rating counts only fighters who took part',()=>{
  const c=catalog(),b=newBand();b.fighters=[recruit('Kapitan Najemników',c),recruit('Ogr Najemnik',c)];
  assert.equal(A.battleRating(b,new Set([b.fighters[0].id])),25);
});
test('experience gain adds the base scenario points',()=>{
  const g=A.experienceGain({participated:true,isLeader:true,won:true,kills:2,warpstone:1,scenario:0,underdog:1,injuryExp:1});
  assert.equal(g.total,7);assert.ok(g.parts.every(p=>p.value>0));
});
test('stat advances roll within the pair and respect racial maxima',()=>{
  const c=catalog(),f=recruit('Kapitan Najemników',c);
  assert.deepEqual(A.resolveAdvance(f,{'2d6':6,pair:2},{},c).actions,[{kind:'stat',stat:'s',delta:1}]);
  f.stats.s='4';
  assert.deepEqual(A.resolveAdvance(f,{'2d6':6,pair:2},{},c).actions,[{kind:'stat',stat:'a',delta:1}]);
  f.stats.a='4';
  const open=A.resolveAdvance(f,{'2d6':6,pair:2},{},c);
  assert.equal(open.choose.key,'stat');assert.deepEqual(open.actions,[]);
  const options=open.choose.options.map(o=>o.value);assert.ok(options.includes('ws'));assert.ok(!options.includes('s'));assert.ok(!options.includes('a'));
  assert.deepEqual(A.resolveAdvance(f,{'2d6':6,pair:2},{stat:'ws'},c).actions,[{kind:'stat',stat:'ws',delta:1}]);
});
test('a 7 lets the player choose WS or BS',()=>{
  const c=catalog(),f=recruit('Kapitan Najemników',c);
  const open=A.resolveAdvance(f,{'2d6':7},{},c);
  assert.deepEqual(open.choose.options.map(o=>o.value),['ws','bs']);
  assert.deepEqual(A.resolveAdvance(f,{'2d6':7},{stat:'bs'},c).actions,[{kind:'stat',stat:'bs',delta:1}]);
  assert.equal(A.resolveAdvance(f,{},{},c).needs[0].key,'2d6');
});
test('earlier advances of the same fighter count toward the maximum',()=>{
  const c=catalog(),f=recruit('Kapitan Najemników',c);
  assert.deepEqual(A.resolveAdvance(f,{'2d6':6,pair:1},{},c,{s:1}).actions,[{kind:'stat',stat:'a',delta:1}]);
});
test('fighters without racial maxima have no cap',()=>{
  const c=catalog(),f=recruit('Tresowany Niedźwiedź',c);f.stats.s='9';
  assert.deepEqual(A.resolveAdvance(f,{'2d6':6,pair:1},{},c).actions,[{kind:'stat',stat:'s',delta:1}]);
});
test('skill advances are free picks from the eligible list',()=>{
  const c=catalog(),f=recruit('Kapitan Najemników',c);
  assert.equal(A.resolveAdvance(f,{'2d6':3},{},c).choose.key,'skill');
  const [action]=A.resolveAdvance(f,{'2d6':3},{skill:'Siłacz'},c).actions;
  assert.equal(action.kind,'addSkill');assert.equal(action.entry.cost,0);assert.equal(action.entry.label,'Siłacz');
});
test('advance skill choices never offer mutations',()=>{
  const c=catalog('sludzy_ciemnosci'),f=recruit('Mutant',c);
  assert.ok(A.advanceSkillChoices(f,c).length>0);
  assert.ok(A.advanceSkillChoices(f,c).every(s=>!s.mutation));
});
test('casters may roll a free spell instead of a skill',()=>{
  const c=catalog(),f=recruit('Kapłan Sigmara',c),list=c.spellsByList['Modlitwy Sigmara'];
  assert.equal(A.resolveAdvance(f,{'2d6':11},{},c).choose.key,'learn');
  const [action]=A.resolveAdvance(f,{'2d6':11,spell:3},{learn:'spell'},c).actions;
  assert.equal(action.kind,'addSkill');assert.equal(action.entry.selectedKey,list[2].name);assert.equal(action.entry.cost,0);
  f.skills.push(action.entry);
  assert.equal(A.resolveAdvance(f,{'2d6':11,spell:3},{learn:'spell'},c).choose.key,'duplicateSpell');
  assert.deepEqual(A.resolveAdvance(f,{'2d6':11,spell:3},{learn:'spell',duplicateSpell:'lower'},c).actions,[{kind:'spellDifficulty',spell:list[2].name,delta:-1}]);
  assert.equal(A.resolveAdvance(f,{'2d6':11,spell:3},{learn:'spell',duplicateSpell:'reroll'},c).needs[0].key,'spellReroll');
  assert.equal(A.resolveAdvance(f,{'2d6':11,spell:3,spellReroll:1},{learn:'spell',duplicateSpell:'reroll'},c).actions[0].entry.selectedKey,list[0].name);
});

// --- Task 5: exploration ---
const find=(size,value,c=catalog())=>A.findFor({size,value},c);
const ctx={leaderId:'L',heroes:[{id:'L',name:'Kapitan',exp:20},{id:'H',name:'Najemnik',exp:7},{id:'Y',name:'Młodzik',exp:0}]};
test('exploration dice count is capped',()=>{
  const c=catalog();
  assert.equal(A.explorationDiceCount({heroes:5,won:true,eyeBonus:1,adjust:0},c),6);
  assert.equal(A.explorationDiceCount({heroes:0,won:false,eyeBonus:0,adjust:-1},c),0);
  assert.equal(A.explorationDiceCount({heroes:2,won:true,eyeBonus:0,adjust:1},c),4);
});
test('equal dice form one group',()=>{
  assert.deepEqual(A.groupDice([3,3,3,3,1]),[{value:1,size:1},{value:3,size:4}]);
  assert.deepEqual(A.groupDice([]),[]);
});
test('dice sum becomes warpstone pieces',()=>{
  const c=catalog();
  for(const [sum,pieces] of [[0,0],[5,1],[6,2],[17,3],[18,4],[30,5],[35,6],[36,7]])assert.equal(A.warpstoneFromSum(sum,c),pieces,String(sum));
});
test('a dice find waits for its roll, then adds gold',()=>{
  const c=catalog();
  const open=A.resolveFind(find(1,1,c),{},{},ctx,c);assert.equal(open.needs[0].key,'g0');assert.equal(open.needs[0].sides,3);
  assert.deepEqual(A.resolveFind(find(1,1,c),{g0:2},{},ctx,c).actions,[{kind:'treasury',gold:2}]);
});
test('items go to the band store and multipliers apply',()=>{
  const c=catalog();
  assert.deepEqual(A.resolveFind(find(2,5,c),{g1:7},{},ctx,c).actions,[{kind:'storeItem',text:'Mapa ruin'},{kind:'treasury',gold:7}]);
  assert.deepEqual(A.resolveFind(find(4,5,c),{g0:4},{option:0},ctx,c).actions,[{kind:'treasury',gold:40}]);
  assert.deepEqual(A.resolveFind(find(4,1,c),{t0:4,'t0.g0':2},{},ctx,c).actions,[{kind:'storeItem',text:'2× Muszkiet'}]);
});
test('finds with a choice ask for it first',()=>{
  const c=catalog();
  assert.equal(A.resolveFind(find(2,4,c),{},{},ctx,c).choose.key,'option');
});
test('experience from finds cannot cross an advance threshold',()=>{
  const c=catalog();
  assert.deepEqual(A.expTargets(ctx.heroes,1).map(h=>h.id),['L','Y']);
  const open=A.resolveFind(find(2,4,c),{},{option:1},ctx,c);
  assert.equal(open.choose.key,'heroes');assert.deepEqual(open.choose.options.map(o=>o.value),['L','Y']);
  assert.deepEqual(A.resolveFind(find(2,4,c),{},{option:1,heroes:{Y:1}},ctx,c).actions,[{kind:'exp',fighterId:'Y',delta:1}]);
  assert.deepEqual(A.resolveFind(find(1,4,c),{},{option:1},ctx,c).actions,[{kind:'exp',fighterId:'L',delta:1}]);
});
test('Sakiewka gives an amulet on a 1',()=>{
  const c=catalog();
  assert.deepEqual(A.resolveFind(find(2,2,c),{t0:1},{},ctx,c).actions,[{kind:'storeItem',text:'Szczęśliwy amulet'}]);
  assert.deepEqual(A.resolveFind(find(2,2,c),{t0:4},{},ctx,c).actions,[{kind:'treasury',gold:4}]);
});
test('random artefacts come from the d6 list',()=>{
  const c=catalog();
  assert.deepEqual(A.resolveFind(find(6,6,c),{g0:10,a1:3},{},ctx,c).actions,[{kind:'treasury',gold:50},{kind:'storeItem',text:'Runiczna zbroja'}]);
});
test('checks give their reward only on a high enough roll',()=>{
  const c=catalog(),r=A.resolveFind(find(6,4,c),{g0:3,g1:8,g2:6,t3:3,t4:1,t5:1,t6:2,t7:1,t8:1},{},ctx,c);
  assert.deepEqual(r.needs,[]);
  assert.deepEqual(r.actions,[{kind:'storeItem',text:'3× Sztylet'},{kind:'treasury',gold:40},{kind:'treasury',armourFragments:6}]);
});
test('Nora is only a note',()=>{
  const c=catalog(),r=A.resolveFind(find(6,1,c),{},{},ctx,c);
  assert.deepEqual(r.actions.map(a=>a.kind),['bandNote']);
});

// --- Task 6: warpstone sale ---
test('warpstone sells by pieces and band size',()=>{
  const c=catalog();
  for(const [sold,size,price] of [[1,3,45],[1,4,40],[5,10,90],[7,11,110],[8,1,155],[12,20,120],[0,5,0]])assert.equal(A.warpstoneSalePrice(sold,size,c),price,`${sold}/${size}`);
});

// --- Task 7: building and applying ---
function battle(){
  const c=catalog(),b=newBand();b.name='Test';
  b.fighters=[recruit('Kapitan Najemników',c),recruit('Ludzki Najemnik',c),recruit('Pies bojowy',c)];
  const [captain,merc,dog]=b.fighters;return {c,b,captain,merc,dog,state:A.newAftermathState(b)};
}
test('a new state has everyone taking part and nobody out of action',()=>{
  const {b,state}=battle();
  assert.ok(b.fighters.every(f=>state.setup.took[f.id]===true && state.setup.ooa[f.id]===false));
  assert.equal(state.setup.won,false);assert.equal(state.setup.opponentRating,null);assert.equal(state.removed.size,0);
});
test('a dead fighter skips experience unless the death is removed',()=>{
  const {c,b,merc,state}=battle();
  state.setup.ooa[merc.id]=true;state.rolls[`injury:${merc.id}/1`]=1;state.rolls[`injury:${merc.id}/2`]=1;
  let built=A.buildAftermath(b,c,state);
  const death=built.actions.find(a=>a.kind==='remove');
  assert.equal(death.fighterId,merc.id);assert.equal(death.step,'injuries');assert.equal(death.source,`injury:${merc.id}`);assert.match(death.label,/Ludzki Najemnik/);
  assert.ok(!built.experience.some(card=>card.fighterId===merc.id));
  assert.equal(built.sale.bandSize,2);
  state.removed.add(death.id);built=A.buildAftermath(b,c,state);
  assert.ok(built.experience.some(card=>card.fighterId===merc.id));
  assert.equal(built.sale.bandSize,3);
});
test('changing a roll restores removed actions of that card only',()=>{
  const {merc,state}=battle();
  state.removed.add(`injury:${merc.id}#0`);state.removed.add('exp:other#0');
  A.clearRemovedFor(state,`injury:${merc.id}/1`);
  assert.deepEqual([...state.removed],['exp:other#0']);
  state.removed.add('find:2x6#0');state.removed.add('exploration#0');
  A.clearRemovedFor(state,'dice');
  assert.deepEqual([...state.removed],['exp:other#0']);
});
test('experience gives the leader the win point and pets nothing',()=>{
  const {c,b,captain,dog,state}=battle();
  state.setup.won=true;state.inputs[`exp:${captain.id}/kills`]=1;
  const built=A.buildAftermath(b,c,state);
  const exp=built.actions.find(a=>a.kind==='exp' && a.fighterId===captain.id);
  assert.equal(exp.delta,3);
  assert.ok(!built.experience.some(card=>card.fighterId===dog.id));
});
test('crossing thresholds opens one advance card each',()=>{
  const {c,b,captain,state}=battle();
  captain.exp=19;state.inputs[`exp:${captain.id}/kills`]=2;
  assert.deepEqual(A.buildAftermath(b,c,state).experience.filter(card=>card.type==='advance').map(card=>card.threshold),[20]);
  captain.exp=7;state.inputs[`exp:${captain.id}/kills`]=4;
  assert.deepEqual(A.buildAftermath(b,c,state).experience.filter(card=>card.type==='advance' && card.fighterId===captain.id).map(card=>card.threshold),[8,11]);
});
test('warpstone carried off the table goes to the treasury',()=>{
  const {c,b,captain,state}=battle();
  state.inputs[`exp:${captain.id}/warpstone`]=2;
  const built=A.buildAftermath(b,c,state);
  assert.ok(built.actions.some(a=>a.kind==='treasury' && a.shards===2 && a.source===`exp:${captain.id}`));
  assert.equal(built.actions.find(a=>a.kind==='exp' && a.fighterId===captain.id).delta,3);
});
test('exploration counts dice and turns the sum into warpstone',()=>{
  const {c,b,state}=battle();
  state.setup.won=true;b.fighters[0].equipment.push({name:'Wszystkowidzące oko',cost:0});
  let built=A.buildAftermath(b,c,state);
  assert.equal(built.exploration.count,4);
  state.dice=[3,3,1,6];built=A.buildAftermath(b,c,state);
  assert.equal(built.exploration.sum,13);assert.equal(built.exploration.warpstone,3);
  assert.deepEqual(built.exploration.cards.map(card=>card.source),['find:1x1','find:2x3','find:1x6']);
  assert.ok(built.actions.some(a=>a.source==='exploration' && a.shards===3));
});
test('the sale prices pieces from all sources',()=>{
  const {c,b,state}=battle();
  b.treasury.shards=2;state.setup.won=true;state.dice=[6,6,1];state.inputs['sale/sold']=4;
  const built=A.buildAftermath(b,c,state);
  assert.equal(built.sale.available,2+3);
  assert.equal(built.sale.price,90);
  assert.ok(built.actions.some(a=>a.source==='sale' && a.gold===90 && a.shards===-4));
});
test('applying actions changes a copy and logs the battle',()=>{
  const {c,b,captain,merc}=battle();
  merc.equipment.push({name:'Miecz',cost:8});merc.stats.t='1';
  b.fighters[0].injuries='Stara rana ×1: nie wychodzi na 1';
  const before=structuredClone(b);
  const actions=[
    {id:'1',kind:'stat',fighterId:merc.id,stat:'t',delta:-1},
    {id:'2',kind:'stat',fighterId:captain.id,stat:'s',delta:1},
    {id:'3',kind:'exp',fighterId:captain.id,delta:2},
    {id:'4',kind:'note',fighterId:captain.id,text:'Stara rana ×2: nie wychodzi na 1–2',replaces:'Stara rana'},
    {id:'5',kind:'remove',fighterId:merc.id,keepEquipment:true},
    {id:'6',kind:'treasury',gold:10,shards:-1,armourFragments:2},
    {id:'7',kind:'storeItem',text:'Mapa ruin'},
    {id:'8',kind:'bandNote',text:'Dług wdzięczności'},
  ];
  const after=A.applyActions(b,actions,c,{date:new Date(2026,10,15),summary:'bitwa: wygrana'});
  assert.deepEqual(b,before);
  const cap=after.fighters.find(f=>f.id===captain.id);
  assert.equal(cap.stats.s,'4');assert.equal(cap.exp,22);assert.equal(cap.injuries,'Stara rana ×2: nie wychodzi na 1–2');
  assert.ok(!after.fighters.some(f=>f.id===merc.id));
  assert.match(after.storedEquipment,/Miecz/);assert.match(after.storedEquipment,/Mapa ruin/);
  assert.deepEqual([after.treasury.gold,after.treasury.shards,after.treasury.armourFragments],[10,0,2]);
  assert.ok(after.treasury.notes.endsWith('15.11.2026 — bitwa: wygrana'));
  assert.match(after.treasury.notes,/Dług wdzięczności/);
});
test('stats never drop below 1',()=>{
  const {c,b,merc}=battle();merc.stats.t='1';
  const after=A.applyActions(b,[{id:'1',kind:'stat',fighterId:merc.id,stat:'t',delta:-1}],c,{date:new Date(2026,10,15),summary:'bitwa'});
  assert.equal(after.fighters[1].stats.t,'1');
});
test('new spells are free and repeated spells get easier',()=>{
  const c=catalog(),b=newBand(),priest=recruit('Kapłan Sigmara',c);b.fighters=[priest];
  const spell=c.spellsByList['Modlitwy Sigmara'][0];
  const [add]=A.resolveAdvance(priest,{'2d6':11,spell:1},{learn:'spell'},c).actions;
  let after=A.applyActions(b,[{id:'1',fighterId:priest.id,...add}],c,{date:new Date(2026,10,15),summary:'bitwa'});
  after=A.applyActions(after,[{id:'2',kind:'spellDifficulty',fighterId:priest.id,spell:spell.name,delta:-1}],c,{date:new Date(2026,10,15),summary:'bitwa'});
  const entry=after.fighters[0].skills.find(s=>s.selectedKey===spell.name);
  assert.equal(entry.cost,0);assert.equal(entry.difficulty,spell.difficulty-1);
});
test('the battle summary names the result and the haul',()=>{
  const {c,b,state}=battle();
  state.setup.won=true;state.dice=[6,6,1];
  const built=A.buildAftermath(b,c,state);
  assert.match(A.battleSummary(built,state),/^bitwa: wygrana, \+3 Spaczenia/);
});

// --- Task 8: stale answers after an earlier roll changes ---
test('changing an earlier roll drops the answers that depended on it',()=>{
  const state={rolls:{'injury:a/1':1,'injury:a/2':4,'injury:a/3':2,'injury:b/2':5,'advance:a:8/2d6':6,'advance:a:8/pair':2,'find:2x2/t0':1,'find:2x2/t0.g0':3,'find:6x2/g0':4},choices:{'advance:a:8/stat':'ws','find:2x4/option':1,'find:2x4/heroes':{x:1}}};
  A.dropStale(state,'injury:a/1');
  assert.deepEqual(Object.keys(state.rolls).filter(k=>k.startsWith('injury:')),['injury:a/1','injury:b/2']);
  A.dropStale(state,'advance:a:8/2d6');
  assert.deepEqual(Object.keys(state.rolls).filter(k=>k.startsWith('advance:')),['advance:a:8/2d6']);
  assert.equal(state.choices['advance:a:8/stat'],undefined);
  A.dropStale(state,'find:2x2/t0');
  assert.equal(state.rolls['find:2x2/t0.g0'],undefined);assert.equal(state.rolls['find:6x2/g0'],4);
  A.dropStale(state,'find:2x4/option');
  assert.deepEqual(state.choices['find:2x4/heroes'],undefined);assert.equal(state.choices['find:2x4/option'],1);
});

// --- Final review fixes ---
test('resolvers report the dice they used so the dialog can keep them editable',()=>{
  const c=catalog(),f=recruit('Ludzki Najemnik',c);
  assert.deepEqual(A.resolveInjury(f,{1:2,2:3},c).rolled.map(r=>[r.key,r.value]),[['1',2],['2',3]]);
  assert.deepEqual(A.resolveAdvance(recruit('Kapitan Najemników',c),{'2d6':6,pair:2},{},c).rolled.map(r=>[r.key,r.value]),[['2d6',6],['pair',2]]);
  assert.deepEqual(A.resolveFind(A.findFor({size:2,value:5},c),{g1:7},{},{leaderId:null,heroes:[]},c).rolled.map(r=>[r.key,r.value]),[['g1',7]]);
});
test('out-of-range rolls count as still needed',()=>{
  const c=catalog(),f=recruit('Ludzki Najemnik',c);
  const injury=A.resolveInjury(f,{1:7},c);assert.equal(injury.needs[0].key,'1');assert.deepEqual(injury.actions,[]);
  assert.equal(A.resolveAdvance(recruit('Kapitan Najemników',c),{'2d6':1},{},c).needs[0].key,'2d6');
  const gold=A.resolveFind(A.findFor({size:2,value:5},c),{g1:1},{},{leaderId:null,heroes:[]},c);
  assert.equal(gold.needs[0].key,'g1');assert.deepEqual(gold.actions,[{kind:'storeItem',text:'Mapa ruin'}]);
  assert.deepEqual(A.resolveFind(A.findFor({size:2,value:5},c),{g1:11},{},{leaderId:null,heroes:[]},c).actions[1],{kind:'treasury',gold:11});
});
test('an exploration die outside 1-6 does not break the sequence',()=>{
  const {c,b,state}=battle();
  state.dice=[7,3];
  const built=A.buildAftermath(b,c,state);
  assert.deepEqual(built.exploration.groups,[]);assert.equal(built.exploration.sum,0);
  state.dice=[2.5,3];assert.deepEqual(A.buildAftermath(b,c,state).exploration.groups,[]);
});

test('every card lists its used dice, even cards without dice',()=>{
  const {c,b,state}=battle();state.dice=[1,2];state.inputs['sale/sold']=1;b.treasury.shards=1;
  const built=A.buildAftermath(b,c,state);
  for(const card of [...built.experience,...built.exploration.cards])assert.ok(Array.isArray(card.result.rolled),card.source);
});

// --- User reports ---
test('choosing skill or spell keeps the advance roll and drops only what came after',()=>{
  const state={rolls:{'advance:a:14/2d6':4,'advance:a:14/spell':2},choices:{'advance:a:14/learn':'spell','advance:a:14/skill':'Silny'}};
  A.dropStale(state,'advance:a:14/learn');
  assert.equal(state.rolls['advance:a:14/2d6'],4);
  assert.equal(state.rolls['advance:a:14/spell'],undefined);
  assert.equal(state.choices['advance:a:14/skill'],undefined);
  assert.equal(state.choices['advance:a:14/learn'],'spell');
});
test('a priest who picks a spell on a skill advance is asked for the spell die',()=>{
  const c=catalog(),f=recruit('Kapłan Taala',c),state={rolls:{'advance:a:14/2d6':4},choices:{}};
  state.choices['advance:a:14/learn']='spell';A.dropStale(state,'advance:a:14/learn');
  const out=A.resolveAdvance(f,{'2d6':state.rolls['advance:a:14/2d6']},{learn:'spell'},c);
  assert.deepEqual(out.needs.map(n=>n.key),['spell']);
});
test('the warpstone price list follows the band size column',()=>{
  const c=catalog();
  assert.deepEqual(A.warpstonePriceList(5,3,c),[40,55,70]);
  assert.deepEqual(A.warpstonePriceList(12,0,c),[]);
  assert.equal(A.warpstonePriceList(2,20,c).length,8);
});
