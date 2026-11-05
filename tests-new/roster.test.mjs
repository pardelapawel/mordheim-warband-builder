import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {normalizePictureCrop,newBand,createFighter,duplicateFighter,normalizeBand,summary,fighterCost,glossaryEntries,textExport,skillChoices,slug} from '../src/model.mjs';
import {validateBand,equipmentIssue} from '../src/rules.mjs';
import {readLibrary,writeLibrary,STORAGE_KEY,encodeShare,decodeShare} from '../src/storage.mjs';
import {selectGroupedSkillOption} from '../src/skills.mjs';
import {racialMaximumProfile,racialMaxima,mutationPrice,skillCost,synchronizeMutationPrices,canBuyMutations} from '../src/progression.mjs';
import {assembleCatalog} from '../src/catalog.mjs';
const require=createRequire(import.meta.url),codec=require('../lz-string.min.js');
const read=file=>JSON.parse(fs.readFileSync(new URL('../data/drachenfels/'+file,import.meta.url),'utf8'));
function catalog(type='awanturnicy'){
  return assembleCatalog(type,{equipment:read('equipment.json'),skills:read('skills.json'),spells:read('spells.json'),band:read(`warbands/${type}.json`),progression:read('progression.json'),ruleMetadata:read('rules.json'),artifacts:read('artifacts.json')});
}
const recruit=(name,c=catalog())=>createFighter(c.fighters.find(t=>t.name===name),c);
const storage=initial=>{const values=new Map(Object.entries(initial || {}));return {getItem:k=>values.get(k) ?? null,setItem:(k,v)=>values.set(k,v),values};};
test('recruitment seeds profile, starting rules, experience, and exactly one free dagger',()=>{
  const c=catalog(),f=recruit('Kapitan Najemników',c);assert.equal(f.stats.ws,4);assert.equal(f.exp,20);assert.ok(f.skills.some(s=>s.label==='Lider (12")'));assert.deepEqual(f.equipment.map(e=>[e.name,e.cost]),[['Sztylet',0]]);assert.equal(fighterCost(f,c),60);
  assert.equal(recruit('Tresowany Niedźwiedź',c).equipment.length,0);assert.equal(recruit('Ogr Najemnik',c).equipment.length,0);
});
test('duplication uses independent nested values and a new permanent ID',()=>{
  const original=recruit('Kapitan Najemników'),copy=duplicateFighter(original);copy.stats.ws=9;copy.equipment[0].cost=10;assert.notEqual(copy.id,original.id);assert.equal(original.stats.ws,4);assert.equal(original.equipment[0].cost,0);
});
test('rating and costs update after equipment, experience, and large model changes',()=>{
  const c=catalog(),b=newBand();b.fighters=[recruit('Kapitan Najemników',c),recruit('Ogr Najemnik',c)];b.fighters[0].equipment.push({name:'Miecz',cost:8});assert.deepEqual(summary(b,c),{count:2,cost:188,exp:40,large:1,rating:65});
});
test('migration preserves custom content, glossary and variable movement without shared IDs',()=>{
  const c=catalog('sludzy_ciemnosci'),b=newBand('sludzy_ciemnosci');b.fighters=[recruit('Zębacz jaskiniowy',c)];b.glossary.descriptions.Ruch='Własny opis';delete b.schemaVersion;delete b.id;delete b.fighters[0].id;b.fighters[0].equipment.push({name:'Pamiątka',cost:7});
  const migrated=normalizeBand(b);assert.ok(migrated.id);assert.ok(migrated.fighters[0].id);assert.equal(migrated.fighters[0].stats.m,'2k6');assert.equal(migrated.glossary.descriptions.Ruch,'Własny opis');assert.equal(migrated.fighters[0].equipment[0].name,'Pamiątka');assert.deepEqual(normalizeBand(JSON.parse(JSON.stringify(migrated))),migrated);
});
test('bad imports and unsupported rulesets fail before replacing state',()=>{
  for(const raw of [null,[],{}, {...newBand(),fighters:null},{...newBand(),ruleSetId:'Mordheimer'},{...newBand(),schemaVersion:99},{...newBand(),fighters:[{stats:{},equipment:[null]}]}])assert.throws(()=>normalizeBand(raw));
});
test('the removed armour-save field is omitted from new, imported, and exported rosters',()=>{
  const c=catalog(),b=newBand(),f=recruit('Kapitan Najemników',c);
  assert.ok(!Object.hasOwn(f,'save'));
  b.fighters=[{...f,save:'5+'}];const imported=normalizeBand(b);
  assert.ok(!Object.hasOwn(imported.fighters[0],'save'));
  assert.ok(!JSON.stringify(imported).includes('"save"'));
  assert.doesNotMatch(textExport(imported,c),/\bSv\b/);
});
test('duplicate imported fighter IDs are repaired',()=>{const b=newBand(),f=recruit('Kapitan Najemników');b.fighters=[f,structuredClone(f)];const normalized=normalizeBand(b);assert.notEqual(normalized.fighters[0].id,normalized.fighters[1].id);});
test('library keeps bands with equal names separate and does not modify legacy keys',()=>{
  const b=newBand(),other=newBand(),s=storage({'mordheim_current':JSON.stringify(b),'mordheim_saves':JSON.stringify([other])});const old=s.getItem('mordheim_saves');const library=readLibrary(s);assert.equal(library.bands.length,1);writeLibrary(s,[b,other],other.id);assert.equal(readLibrary(s).bands.length,2);assert.equal(s.getItem('mordheim_saves'),old);
});
test('migration skips unsupported saves with notices and preserves original data',()=>{const b=newBand(),s=storage({'mordheim_saves':JSON.stringify([b,{...b,ruleSetId:'Mordheimer'}])});const result=readLibrary(s);assert.equal(result.bands.length,1);assert.equal(result.notices.length,1);assert.equal(s.getItem(STORAGE_KEY),null);});
test('corrupt versioned library fails without changing its data',()=>{const s=storage({[STORAGE_KEY]:'invalid'});assert.throws(()=>readLibrary(s));assert.equal(s.getItem(STORAGE_KEY),'invalid');});
test('compressed URLs round-trip Polish names, equipment, and skills',()=>{const b=newBand();b.name='Łowcy z południa';b.fighters=[recruit('Kapłan Sigmara')];assert.deepEqual(decodeShare(encodeShare(b,codec),codec),normalizeBand(b));assert.throws(()=>decodeShare('broken',codec));});
test('leader modifiers raise recruitment limits and ban incompatible fighters',()=>{
  const c=catalog(),b=newBand();b.fighters=[recruit('Kapitan Najemników',c),...Array.from({length:3},()=>recruit('Ludzki Najemnik',c))];assert.ok(!validateBand(b,c).some(m=>m.message.includes('limit: Ludzki Najemnik')));
  b.fighters=[recruit('Łowca Czarownic',c),recruit('Wędrowny Czarodziej',c)];assert.ok(validateBand(b,c).some(m=>m.message.includes('maks. 0')));assert.equal(slug('Łowca Czarownic'),'lowca_czarownic');
});
test('composition validates leader, wizard, animals, and initial budget',()=>{
  const c=catalog(),b=newBand();assert.ok(validateBand(b,c).some(m=>m.message.includes('lidera')));b.fighters=[recruit('Kapitan Najemników',c),recruit('Kapłan Sigmara',c),recruit('Kapłan Taala',c),recruit('Pies bojowy',c),recruit('Tresowany Niedźwiedź',c)];b.fighters[0].baseCost=600;const issues=validateBand(b,c);assert.ok(issues.some(m=>m.message.includes('Czarodziej')));assert.ok(issues.some(m=>m.message.includes('jednego typu')));assert.ok(issues.some(m=>m.message.includes('500 zk')&&m.severity==='warning'));
});
test('equipment rules enforce Polish restrictions and animal experience',()=>{
  const c=catalog(),mage=recruit('Wędrowny Czarodziej',c),armor=c.equipment.find(e=>e.originCategory==='armor');assert.ok(equipmentIssue(armor,mage,c));const dog=recruit('Pies bojowy',c);dog.exp=1;dog.equipment=[{name:'Miecz',cost:8}];const b=newBand();b.fighters=[dog];const issues=validateBand(b,c);assert.ok(issues.some(m=>m.message.includes('doświadczenia')));assert.ok(issues.some(m=>m.message.includes('ekwipunku')));
});
test('spell selection updates its label, cost, and glossary entry',()=>{
  const c=catalog(),f=recruit('Kapłan Sigmara',c),b=newBand();const i=f.skills.findIndex(s=>s.kind==='group');assert.ok(i>=0);const spell=c.spellsByList['Modlitwy Sigmara'][0];f.skills[i]=selectGroupedSkillOption(f.skills[i],spell.name,c);b.fighters=[f];assert.ok(glossaryEntries(b,c).some(e=>e.name===spell.name));assert.ok(skillChoices(f,c).some(s=>s.name==='Modlitwy Sigmara'));
});
test('text export preserves original roster and includes Polish fields with English stats',()=>{const c=catalog(),b=newBand();b.fighters=[recruit('Kapitan Najemników',c)];const before=JSON.stringify(b),output=textExport(b,c);assert.match(output,/WS: 4/);assert.match(output,/Ekwipunek: Sztylet/);assert.match(output,/Siła bandy: 25/);assert.equal(JSON.stringify(b),before);});
test('glossary distinguishes rules containing parentheses from grouped skill options',()=>{const c=catalog(),b=newBand();b.fighters=[recruit('Kapitan Najemników',c)];const entries=glossaryEntries(b,c);assert.ok(entries.some(e=>e.name==='Lider (12")' && e.description.includes('12')));assert.ok(!entries.some(e=>e.name==='Lider'));});
test('mutants can select mutations and are flagged until one is selected',()=>{const c=catalog('sludzy_ciemnosci'),b=newBand('sludzy_ciemnosci'),f=recruit('Mutant',c);b.fighters=[f];assert.ok(skillChoices(f,c).some(s=>s.name==='Macka' && s.cost===35));assert.ok(validateBand(b,c).some(m=>m.message.includes('co najmniej jedną mutacją')));f.skills.push({label:'Macka',cost:30});assert.ok(!validateBand(b,c).some(m=>m.message.includes('co najmniej jedną mutacją')));assert.equal(fighterCost(f,c),60);});

test('all twelve racial maxima match the Drachenfels page 34 table',()=>{
  const c=catalog(),keys=['m','ws','bs','s','t','w','i','a','ld'];
  const expected={
    'Człowiek':[4,6,6,4,4,3,6,4,9], 'Elf':[5,7,7,4,4,3,9,4,10],
    'Krasnolud':[3,7,6,4,5,3,5,4,10], 'Ogr':[6,6,5,5,5,5,6,5,9],
    'Niziołek':[4,5,7,3,3,3,9,4,10], 'Ork':[4,6,6,4,5,3,5,4,9],
    'Goblin':[4,5,6,4,4,3,6,4,7], 'Zwierzoczłek':[4,7,6,4,5,4,6,4,9],
    'Opętany':[6,8,0,6,6,4,7,5,10], 'Wampir':[6,8,6,7,6,4,9,4,10],
    'Ghoul':[5,5,2,4,5,3,5,5,7], 'Skaven':[6,6,6,4,4,3,7,4,7]
  };
  for(const [race,values] of Object.entries(expected)) assert.deepEqual(keys.map(key=>c.progression.racialMaxima[race][key]),values,race);
});
test('automatic racial profiles distinguish species and exclude unrelated animal profiles',()=>{
  const c=catalog('sludzy_ciemnosci');
  for(const [name,profile] of [['Szef Orkóf','Ork'],['Szaman Orkóf','Ork'],['Goblin','Goblin'],['Wampir','Wampir'],['Ghoul','Ghoul'],['Wulfen','Opętany']])assert.equal(racialMaximumProfile(recruit(name,c),c).name,profile,name);
  assert.equal(racialMaxima(recruit('Zwierzoczłek',c),c).m,4);
  assert.equal(racialMaxima(recruit('Opętany',c),c).bs,0);
  for(const animal of ['Minotaur','Wielki Szczur','Szczuroogr','Troll'])assert.deepEqual(racialMaxima(recruit(animal,c),c),{},animal);
  const a=catalog();assert.equal(racialMaxima(recruit('Wampir Renegat',a),a).s,7);
});
test('old saves receive automatic maxima while retaining manual exceptions',()=>{
  const c=catalog(),b=newBand();b.fighters=[recruit('Kapitan Najemników',c)];delete b.fighters[0].maxStats;
  const f=normalizeBand(b).fighters[0];assert.equal(racialMaxima(f,c).ws,6);f.maxStats={ws:'7',bs:'',s:0};assert.equal(racialMaxima(f,c).ws,'7');assert.equal(racialMaxima(f,c).bs,6);assert.equal(racialMaxima(f,c).s,0);
});
test('mutation prices use the page 31 amounts and double every additional purchase only once',()=>{
  const c=catalog('sludzy_ciemnosci'),f=recruit('Mutant',c);
  const expected={'Dusza demona':20,'Wielki Szpon':50,'Rozszczepione kopyta':40,'Macka':35,'Czarna posoka':30,'Kolce':35,'Ogon skorpiona':40,'Dodatkowe ramię':40,'Ohydny':40,'Różki':10};
  for(const [name,cost]of Object.entries(expected))assert.equal(mutationPrice(f,{name},c),cost,name);
  f.skills.push({label:'Dusza demona',cost:0},{label:'Wielki Szpon',cost:0},{label:'Różki',cost:0});
  assert.deepEqual(f.skills.slice(-3).map((s,i)=>skillCost(f,i+1,c)),[20,100,20]);
  assert.equal(fighterCost(f,c),165);
  synchronizeMutationPrices(f,c);assert.deepEqual(f.skills.slice(-3).map(s=>s.cost),[20,100,20]);
  f.skills.splice(1,1);assert.equal(fighterCost(f,c),95);synchronizeMutationPrices(f,c);assert.deepEqual(f.skills.slice(-2).map(s=>s.cost),[50,20]);
});
test('mutation pricing recognizes legacy grouped choices and eligibility excludes Wulfen',()=>{
  const c=catalog('sludzy_ciemnosci'),f=recruit('Opętany',c),b=newBand('sludzy_ciemnosci');b.fighters=[f];assert.ok(!validateBand(b,c).some(m=>m.message.includes('co najmniej jedną mutacją')));
  f.skills.push({name:'Mutacje (Macka)',cost:0},{kind:'group',label:'Mutacje',groupKey:'Mutacje',selectedKey:'Kolce',cost:1});assert.equal(fighterCost(f,c),195);
  const w=recruit('Wulfen',c);assert.equal(canBuyMutations(w,c),false);assert.ok(!skillChoices(w,c).some(s=>s.mutation));w.skills.push({label:'Macka',cost:35});b.fighters=[w];assert.ok(validateBand(b,c).some(m=>m.message.includes('nie Wulfen')));
});
test('deployment packages only active Polish runtime',()=>{
  const {preparePages}=require('../scripts/preparePages.cjs');const rootDir=fileURLToPath(new URL('..',import.meta.url));const outDir=fileURLToPath(new URL('../tmp/test-pages',import.meta.url));fs.mkdirSync(outDir+'/data/mordheimer',{recursive:true});fs.writeFileSync(outDir+'/data/mordheimer/stale.json','{}');const result=preparePages({rootDir,outDir});assert.ok(fs.existsSync(result+'/src/app.mjs'));assert.ok(fs.existsSync(result+'/data/drachenfels/equipment.json'));assert.ok(!fs.existsSync(result+'/old'));assert.ok(!fs.existsSync(result+'/data/mordheimer'));const html=fs.readFileSync(result+'/index.html','utf8');assert.match(html,/<html lang="pl">/);assert.throws(()=>preparePages({rootDir,outDir:rootDir+'/src'}));
});

test('fighter pictures and their visibility survive save, import, sharing and duplication',()=>{
  const b=newBand();b.showPictures=false;b.fighters=[recruit('Kapitan Najemników')];
  b.fighters[0].picture='data:image/jpeg;base64,/9j/';
  const imported=normalizeBand(JSON.parse(JSON.stringify(b)));
  assert.equal(imported.showPictures,false);assert.equal(imported.fighters[0].picture,b.fighters[0].picture);
  const store=storage();writeLibrary(store,[imported],imported.id);
  assert.equal(readLibrary(store).bands[0].fighters[0].picture,b.fighters[0].picture);
  assert.equal(decodeShare(encodeShare(imported,codec),codec).fighters[0].picture,b.fighters[0].picture);
  const copy=duplicateFighter(imported.fighters[0]);copy.picture='';assert.equal(imported.fighters[0].picture,b.fighters[0].picture);
  delete b.showPictures;delete b.fighters[0].picture;const legacy=normalizeBand(b);
  assert.equal(legacy.showPictures,true);assert.equal(legacy.fighters[0].picture,'');
});
test('imported pictures accept bounded embedded raster data and discard other sources',()=>{
  const b=newBand();b.fighters=[recruit('Kapitan Najemników')];
  for(const picture of ['https://example.com/fighter.jpg','javascript:alert(1)','data:image/svg+xml;base64,PHN2Zz4=',{},'data:image/jpeg;base64,'+'a'.repeat(200000)]){
    b.fighters[0].picture=picture;assert.equal(normalizeBand(b).fighters[0].picture,'');
  }
});

test('portrait framing is bounded and preserved across import, duplication and sharing',()=>{
  assert.deepEqual(normalizePictureCrop(),{x:50,y:50,zoom:1});
  assert.deepEqual(normalizePictureCrop({x:-10,y:120,zoom:9}),{x:0,y:100,zoom:3});
  assert.deepEqual(normalizePictureCrop({x:NaN,y:'40',zoom:Infinity}),{x:50,y:50,zoom:1});
  const b=newBand();b.fighters=[recruit('Kapitan Najemników')];
  b.fighters[0].pictureCrop={x:23,y:78,zoom:1.65};
  const imported=normalizeBand(b);assert.deepEqual(imported.fighters[0].pictureCrop,b.fighters[0].pictureCrop);
  assert.deepEqual(decodeShare(encodeShare(imported,codec),codec).fighters[0].pictureCrop,b.fighters[0].pictureCrop);
  const copy=duplicateFighter(imported.fighters[0]);copy.pictureCrop.x=99;assert.equal(imported.fighters[0].pictureCrop.x,23);
});
