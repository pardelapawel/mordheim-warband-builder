import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assembleCatalog} from '../src/catalog.mjs';
import {createFighter,newBand,fighterCost,normalizeBand,skillChoices,glossaryEntries,textExport} from '../src/model.mjs';
import {validateBand,equipmentIssue} from '../src/rules.mjs';
import {purchaseEquipment,purchaseCost} from '../src/equipment.mjs';
import {setRecruitmentAdvance,recruitmentOptions,recruitmentCost} from '../src/recruitment.mjs';
import {reconcileRules} from '../src/migration.mjs';
import {spellInfo,skillDisplay} from '../src/spells.mjs';
import {selectGroupedSkillOption} from '../src/skills.mjs';

const read=file=>JSON.parse(fs.readFileSync(new URL(`../data/drachenfels/${file}`,import.meta.url),'utf8'));
function catalog(type='awanturnicy') {
  return assembleCatalog(type,{equipment:read('equipment.json'),skills:read('skills.json'),spells:read('spells.json'),band:read(`warbands/${type}.json`),progression:read('progression.json'),ruleMetadata:read('rules.json'),artifacts:read('artifacts.json')});
}
const recruit=(name,c)=>createFighter(c.fighters.find(t=>t.name===name),c);
const equipment=(name,c)=>{const result=c.equipment.find(e=>e.name===name);assert.ok(result,name);return result;};
const choice=(f,name,c)=>skillChoices(f,c).some(s=>s.name===name);
const bandWith=(fighters,type='awanturnicy')=>({...newBand(type),fighters});

test('new Awanturnicy receive only starting rules, with eligible advances offered separately',()=>{
  const c=catalog();
  for(const rule of c.ruleMetadata.specialSkills.awanturnicy) {
    for(const template of c.fighters)assert.ok(!recruit(template.name,c).skills.some(s=>s.label===rule.name),`${template.name}: ${rule.name}`);
  }
  const captain=recruit('Kapitan Najemników',c);
  assert.ok(choice(captain,'Przysięga krwi',c));assert.ok(choice(captain,'Szczególnie wytrzymały',c));assert.ok(!choice(captain,'Berserker',c));
  const dwarf=recruit('Krasnoludzki Szlachcic',c);assert.ok(dwarf.skills.some(s=>s.label==='Nienawiść do Zielonoskórych'));
});

test('Słudzy special skills respect race, class and leader requirements',()=>{
  const c=catalog('sludzy_ciemnosci');
  const rat=recruit('Zabójca Eshin',c),vampire=recruit('Wampir',c),orc=recruit('Ork',c),goblin=recruit('Goblin',c);
  for(const name of ['Walka ogonem','Ścianobiegacz','Infiltracja']){assert.ok(choice(rat,name,c));assert.ok(!choice(vampire,name,c));}
  assert.ok(choice(vampire,'Poważne groźby',c));assert.ok(!choice(orc,'Poważne groźby',c));
  assert.ok(choice(orc,'Tfardy Łep',c));assert.ok(!choice(goblin,'Tfardy Łep',c));
  const f=recruit('Sługus',c);f.skills.push({label:'Walka ogonem'});assert.ok(validateBand(bandWith([f],'sludzy_ciemnosci'),c).some(m=>m.message.includes('nie jest dostępna')));
});

test('general skill restrictions and Battle Mage permission are enforced',()=>{
  const c=catalog(),mage=recruit('Wędrowny Czarodziej',c),sister=recruit('Siostra Sigmara',c),ogre=recruit('Ogr Najemnik',c);
  assert.ok(!choice(mage,'Język bitewny',c));assert.ok(!choice(sister,'Wiedza tajemna',c));assert.ok(!choice(ogre,'Siłacz',c));
  assert.ok(equipmentIssue(equipment('Lekka zbroja',c),mage,c));mage.skills.push({label:'Mag bitewny'});assert.equal(equipmentIssue(equipment('Lekka zbroja',c),mage,c),'');
});

test('Ogres can buy normal melee weapons and correctly priced Ogre variants only',()=>{
  const c=catalog(),ogre=recruit('Ogr Najemnik',c),captain=recruit('Kapitan Najemników',c);
  assert.equal(equipment('Ogrza broń dwuręczna',c).cost,20);
  assert.equal(equipment('Dwuręczny młot (ogrzy)',c).cost,20);
  assert.equal(equipmentIssue(equipment('Młot',c),ogre,c),'');
  for(const name of ['Sztylet','Czarny lotos','Kusza','Ciężka zbroja','Dwuręczny młot'])assert.ok(equipmentIssue(equipment(name,c),ogre,c),name);
  for(const name of ['Ogrza kusza','Działko pokładowe','Ogrzy hełm'])assert.ok(equipmentIssue(equipment(name,c),captain,c),name);
  ogre.equipment.push(purchaseEquipment(equipment('Dwuręczny młot (ogrzy)',c)));assert.equal(fighterCost(ogre,c),140);
});

test('dwarf axes, squig prods, blessings and prayer books require eligible owners',()=>{
  const a=catalog(),s=catalog('sludzy_ciemnosci'),captain=recruit('Kapitan Najemników',a),dwarf=recruit('Krasnoludzki Wojownik',a),priest=recruit('Kapłan Sigmara',a);
  assert.ok(equipmentIssue(equipment('Krasnoludzki topór',a),captain,a));assert.equal(equipmentIssue(equipment('Krasnoludzki topór',a),dwarf,a),'');
  assert.ok(equipmentIssue(equipment('Pastuch Zębaczy',s),recruit('Sługus',s),s));assert.equal(equipmentIssue(equipment('Pastuch Zębaczy',s),recruit('Goblin',s),s),'');
  assert.ok(equipmentIssue(equipment('Poświęcenie młota',a),priest,a));priest.equipment.push(equipment('Młot',a));assert.equal(equipmentIssue(equipment('Poświęcenie młota',a),priest,a),'');
  assert.ok(equipmentIssue(equipment('Święta księga',a),captain,a));assert.equal(equipmentIssue(equipment('Święta księga',a),priest,a),'');
});

test('dwarf leader permits five heroes plus an animal group but not six heroes',()=>{
  const c=catalog(),b=bandWith([recruit('Krasnoludzki Szlachcic',c),...Array.from({length:4},()=>recruit('Krasnoludzki Wojownik',c)),recruit('Pies bojowy',c)]);
  assert.ok(!validateBand(b,c).some(m=>m.severity==='error'));
  b.fighters.push(recruit('Ludzki Młodzik',c));assert.ok(validateBand(b,c).some(m=>m.message.includes('pięciu Herosów')));
});

test('weapon limits count a free dagger exception, pairs, and ranged weapons',()=>{
  const c=catalog(),f=recruit('Kapitan Najemników',c),b=bandWith([f]);
  f.equipment.push(equipment('Miecz',c),equipment('Młot',c));assert.ok(!validateBand(b,c).some(m=>m.message.includes('dwie bronie')));
  f.equipment.push(equipment('Topór',c));assert.ok(validateBand(b,c).some(m=>m.message.includes('dwie bronie')));
  f.equipment=[equipment('Łuk',c),equipment('Kusza',c)];assert.ok(validateBand(b,c).some(m=>m.message.includes('jedną broń strzelecką')));
  const s=catalog('sludzy_ciemnosci'),r=recruit('Zabójca Eshin',s);r.equipment.push(equipment('Pazury bojowe',s),equipment('Miecz',s));assert.ok(validateBand(bandWith([r],'sludzy_ciemnosci'),s).some(m=>m.message.includes('dwie bronie')));
});

test('material variants use source multipliers and armour purchases keep their historical price',()=>{
  const c=catalog();assert.equal(equipment('Miecz z gromrilu',c).cost,32);assert.equal(equipment('Miecz z ithilmaru',c).cost,24);
  assert.match(equipment('Topór z gromrilu',c).description,/kumuluje/);
  const armour=equipment('Ciężka zbroja',c),initial=purchaseEquipment(armour,'recruitment'),campaign=purchaseEquipment(armour,'campaign');
  assert.equal(initial.cost,25);assert.equal(campaign.cost,50);assert.equal(initial.cost,25);assert.equal(purchaseCost(equipment('Ogrza ciężka zbroja',c),'campaign'),100);
});

test('recruitment advances update cost, XP, and profile once and can be reversed',()=>{
  const c=catalog(),captain=recruit('Kapitan Najemników',c);
  assert.ok(setRecruitmentAdvance(captain,'extraWound',true,c));assert.equal(captain.stats.w,2);assert.equal(captain.exp,24);assert.equal(fighterCost(captain,c),75);
  assert.equal(setRecruitmentAdvance(captain,'extraWound',true,c),false);assert.equal(captain.stats.w,2);
  assert.ok(setRecruitmentAdvance(captain,'extraWound',false,c));assert.equal(captain.stats.w,1);assert.equal(captain.exp,20);assert.equal(recruitmentCost(captain),0);
  const youth=recruit('Ludzki Młodzik',c);setRecruitmentAdvance(youth,'weaponSkill',true,c);assert.equal(youth.stats.ws,3);assert.equal(youth.exp,2);assert.equal(fighterCost(youth,c),25);
  youth.recruitmentComplete=true;assert.equal(setRecruitmentAdvance(youth,'weaponSkill',false,c),false);
  assert.ok(!recruitmentOptions(recruit('Wampir Renegat',c),c).some(o=>o.key==='extraWound'));
});

test('Mercenary advance can switch between WS and BS without duplicate charges',()=>{
  const c=catalog(),f=recruit('Ludzki Najemnik',c);setRecruitmentAdvance(f,'mercenaryAdvance','ws',c);assert.equal(f.stats.ws,4);assert.equal(f.exp,8);
  setRecruitmentAdvance(f,'mercenaryAdvance','bs',c);assert.equal(f.stats.ws,3);assert.equal(f.stats.bs,4);assert.equal(f.exp,8);assert.equal(fighterCost(f,c),35);
  const migrated=normalizeBand(bandWith([f]));assert.equal(fighterCost(migrated.fighters[0],c),35);
});

test('migration preserves earned skills and paid costs while repairing unambiguous mistakes',()=>{
  const c=catalog(),f=recruit('Krasnoludzki Szlachcic',c);f.skills=f.skills.filter(s=>s.label!=='Nienawiść do Zielonoskórych');f.skills.push({label:'Prawdziwie hardy'});
  const ogre=recruit('Ogr Najemnik',c);ogre.equipment=[{name:'Ogrza broń dwuręczna',cost:5},{name:'Młot',cost:0}];const b=bandWith([f,ogre]);b.rulesRevision=0;
  assert.ok(reconcileRules(b,c));assert.ok(f.skills.some(s=>s.label==='Prawdziwie hardy'));assert.ok(f.skills.some(s=>s.label==='Nienawiść do Zielonoskórych'));assert.equal(ogre.equipment[0].cost,20);assert.equal(ogre.equipment[1].cost,0);assert.equal(reconcileRules(b,c),'');
});

test('source descriptions preserve omitted bear, Rat Ogre and Vampire conditions',()=>{
  const c=catalog('sludzy_ciemnosci');assert.match(c.skills.find(s=>s.name==='Głupota (Szczuroogr)').description,/6 cali/);assert.match(c.skills.find(s=>s.name==='Oporny na psychologię (Wampir)').description,/Test Rozbicia/);
  assert.match(c.skills.find(s=>s.name==='Niedźwiedzi uścisk').description,/równy/);assert.equal(recruit('Wielki Szczur',c).race,'Zwierzę');
});

test('full spell conditions and casting difficulty are available in rows and glossary',()=>{
  const c=catalog();assert.match(c.spells.find(s=>s.name==='Oko boga').description,/raz na potyczkę/);assert.match(c.spells.find(s=>s.name==='Złoty trunek').description,/nie mniej niż 1/);
  const f=recruit('Kapłan Sigmara',c),i=f.skills.findIndex(s=>s.kind==='group');f.skills[i]=selectGroupedSkillOption(f.skills[i],'Młot Sigmara',c);assert.equal(spellInfo(f.skills[i],c).difficulty,7);f.skills[i].difficulty=6;
  assert.match(skillDisplay(f.skills[i],c),/trudność 6/);assert.equal(glossaryEntries(bandWith([f]),c).find(e=>e.name==='Młot Sigmara').difficulty,6);
  assert.match(textExport(bandWith([f]),c),/trudność 6/);
});

test('consumable side effects, racial ineffectiveness and found artefacts are retained',()=>{
  const c=catalog(),vampire=recruit('Wampir Renegat',c);vampire.equipment.push(equipment('Korzeń mandragory',c));assert.ok(validateBand(bandWith([vampire]),c).some(m=>m.message.includes('nie działa')));
  assert.match(equipment('Karmazynowy cień',c).description,/uzależnienie/);assert.match(equipment('Kislevska wódka',c).description,/testuje T/);
  assert.equal(c.artifacts.length,6);assert.ok(c.artifacts.every(a=>a.foundOnly && a.cost===0));assert.match(c.artifacts.find(a=>a.name==='Runiczna zbroja').description,/maksimum rasowe/);
  assert.equal(equipment('Dmuchawka',c).cost,20);
});

test('campaign budgets and skill duplication are checked without rejecting different spells',()=>{
  const c=catalog(),f=recruit('Kapitan Najemników',c);f.baseCost=600;const b=bandWith([f]);b.phase='campaign';assert.ok(!validateBand(b,c).some(m=>m.message.includes('500 zk')));
  f.skills.push({label:'Uderzyć by zranić'},{label:'Uderzyć by zranić'});assert.ok(validateBand(b,c).some(m=>m.message.includes('nie wybiera się ponownie')));
});
