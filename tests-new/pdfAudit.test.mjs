import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assembleCatalog} from '../src/catalog.mjs';
import {createFighter,newBand,templateFor} from '../src/model.mjs';
import {validateBand,equipmentIssue} from '../src/rules.mjs';
import {purchaseEquipment} from '../src/equipment.mjs';
import {reconcileRules,RULES_REVISION} from '../src/migration.mjs';
import {createSimpleSkillEntry} from '../src/skills.mjs';

const read=file=>JSON.parse(fs.readFileSync(new URL(`../data/drachenfels/${file}`,import.meta.url),'utf8'));
function catalog(type='awanturnicy') {
  return assembleCatalog(type,{equipment:read('equipment.json'),skills:read('skills.json'),spells:read('spells.json'),band:read(`warbands/${type}.json`),progression:read('progression.json'),ruleMetadata:read('rules.json'),artifacts:read('artifacts.json')});
}
const recruit=(name,c)=>createFighter(c.fighters.find(t=>t.name===name),c);
const equipment=(name,c)=>c.equipment.find(e=>e.name===name);
const bandWith=(fighters,type)=>({...newBand(type),fighters});
const labels=f=>f.skills.map(s=>s.label || s.name);
const spell=(c,name)=>Object.values(c.spellsByList).flat().find(s=>s.name===name);

test('rules text follows the Drachenfels PDF (poison, healing, rats, magic missiles)',()=>{
  const c=catalog();
  assert.match(equipment('Mroczny jad',c).description,/ale nie przy modyfikacji pancerza/);
  assert.match(spell(c,'Lecząca Dłoń').description,/przyjazne modele/);
  assert.match(spell(c,'Przyzwanie gryzoni').description,/-2 do rzutów Pancerza/);
  for(const name of ["Ognie U'Zhul",'Srebrne Strzały Arhy','Zzap!','Ogień Gorka','Spaczogień','Mroczna krew'])assert.match(spell(c,name).description,/^Magiczny pocisk/,name);
});

test('only Ogr Najemnik, the bear and Wampirs are immune to fear',()=>{
  const immune=/odporny/;
  const a=catalog(),s=catalog('sludzy_ciemnosci');
  const fear=(c,name)=>labels(recruit(name,c)).map(l=>c.skills.find(x=>x.name===l)).filter(x=>/strach/i.test(x?.name || ''));
  for(const [c,name] of [[a,'Ogr Najemnik'],[a,'Tresowany Niedźwiedź'],[a,'Wampir Renegat'],[s,'Wampir'],[s,'Ogr Najemnik']])assert.ok(fear(c,name).some(x=>immune.test(x.description)),name);
  for(const name of ['Wulfen','Szczuroogr','Minotaur','Troll','Ghoul','Opętany']){const rules=fear(s,name);assert.ok(rules.length,name);assert.ok(rules.every(x=>!immune.test(x.description)),name);}
});

test('Nekromanta, Zaklinacz Eshin and Szaman Orkóf start with their special rules',()=>{
  const c=catalog('sludzy_ciemnosci');
  assert.ok(labels(recruit('Nekromanta',c)).includes('Słudzy Cienia'));
  assert.ok(labels(recruit('Zaklinacz Eshin',c)).includes('Motywator'));
  assert.ok(labels(recruit('Szaman Orkóf',c)).includes('ŁAAA!!! (Szaman)'));
});

test('Słudzy Cienia: Wilkory and Ghoule are 0-3 only with both Nekromanta and Wampir',()=>{
  const c=catalog('sludzy_ciemnosci');
  const limit=fighters=>validateBand(bandWith(fighters,'sludzy_ciemnosci'),c).some(m=>/Przekroczono limit: Ghoul/.test(m.message));
  const ghouls=n=>Array.from({length:n},()=>recruit('Ghoul',c));
  assert.ok(limit([recruit('Wampir',c),...ghouls(3)]));
  assert.ok(!limit([recruit('Wampir',c),recruit('Nekromanta',c),...ghouls(3)]));
  assert.ok(limit([recruit('Wampir',c),recruit('Nekromanta',c),...ghouls(4)]));
});

test('ogre equipment: Pancerpiącha, no shields or daggers, two-handed surcharge on every two-handed weapon',()=>{
  const c=catalog(),ogre=recruit('Ogr Najemnik',c);
  const fist=equipment('Pancerpiącha',c);assert.equal(fist.cost,10);assert.equal(fist.originCategory,'melee_weapons');assert.equal(equipmentIssue(fist,ogre,c),'');
  assert.ok(!equipment('Ogrza tarcza',c));assert.ok(!equipment('Ogrzy puklerz',c));
  for(const name of ['Tarcza','Puklerz','Sztylet','Sztylet z gromrilu','Halabarda','Dwuręczny miecz z gromrilu'])assert.ok(equipmentIssue(equipment(name,c),ogre,c),name);
  assert.match(equipmentIssue({name:'Ogrza tarcza',cost:14,originCategory:'armor',ogreOnly:true},ogre,c),/tarcz/);
  assert.equal(equipment('Halabarda (ogrzy)',c).cost,15);
  assert.equal(equipment('Dwuręczny miecz z gromrilu (ogrzy)',c).cost,65);
  ogre.equipment=[purchaseEquipment(fist),purchaseEquipment(fist)];assert.deepEqual(validateBand(bandWith([recruit('Kapitan Najemników',c),ogre],'awanturnicy'),c).filter(m=>m.fighterId===ogre.id && m.severity==='error'),[]);
  assert.ok(!equipment('Sztylet z gromrilu',c).freeRecruitmentDagger);
  assert.doesNotMatch(equipment('Działko pokładowe',c).description,/Siekańce/);
});

test('the editable display name never overrides the stored template',()=>{
  const c=catalog(),boy=recruit('Ludzki Młodzik',c);boy.type='Kapitan Najemników';
  assert.equal(templateFor(boy,c).name,'Ludzki Młodzik');
  assert.ok(!validateBand(bandWith([recruit('Kapitan Najemników',c),boy],'awanturnicy'),c).some(m=>/lidera|Kapitan/.test(m.message)));
});

test('migration steps run once and do not undo later manual changes',()=>{
  const c=catalog(),noble=recruit('Krasnoludzki Szlachcic',c),ogre=recruit('Ogr Najemnik',c);
  ogre.skills=ogre.skills.map(s=>(s.label==='Budzi strach'?createSimpleSkillEntry('Strach'):s));
  const b=bandWith([noble,ogre],'awanturnicy');b.rulesRevision=3;
  assert.ok(reconcileRules(b,c));assert.equal(b.rulesRevision,RULES_REVISION);assert.ok(labels(ogre).includes('Budzi strach'));
  noble.skills=noble.skills.filter(s=>s.label!=='Nienawiść do Zielonoskórych');ogre.equipment=[{name:'Ogrza broń dwuręczna',cost:5}];
  assert.equal(reconcileRules(b,c),'');
  assert.ok(!labels(noble).includes('Nienawiść do Zielonoskórych'));assert.equal(ogre.equipment[0].cost,5);
  const s=catalog('sludzy_ciemnosci'),necro=recruit('Nekromanta',s),possessed=recruit('Opętany',s);
  necro.skills=necro.skills.filter(x=>x.label!=='Słudzy Cienia');possessed.skills=possessed.skills.map(x=>(x.label==='Strach'?createSimpleSkillEntry('Budzi strach'):x));
  const old=bandWith([necro,possessed],'sludzy_ciemnosci');old.rulesRevision=3;reconcileRules(old,s);
  assert.ok(labels(necro).includes('Słudzy Cienia'));assert.ok(labels(possessed).includes('Strach'));assert.ok(!labels(possessed).includes('Budzi strach'));
});
