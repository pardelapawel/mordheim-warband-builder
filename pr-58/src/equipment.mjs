import {fighterTemplate} from './eligibility.mjs';

export function expandEquipment(raw) {
  const entries=Object.entries(raw).flatMap(([category,items])=>items.map(item=>({...item,originCategory:category})));
  for(const item of entries) {
    if(item.originCategory==='equipment_ogre') {
      item.ogreOnly=true;
      item.originCategory=item.tags?.includes('armor')?'armor':item.tags?.includes('melee') || item.name==='Ogrza broń dwuręczna'?'melee_weapons':'ranged_weapons';
    }
    if(item.originCategory==='melee_weapons') {
      item.twoHanded=/Dwuręczn/i.test(item.name) || item.name==='Halabarda';
      item.mainWeapon=['Morgenstern','Włócznia','Pastuch Zębaczy'].includes(item.name);
    }
  }
  const variants=[];
  const melee=entries.filter(e=>e.originCategory==='melee_weapons' && !e.ogreOnly && !e.restricted);
  for(const item of melee) {
    for(const [material,multiplier,effect] of [['gromril',4,'Dodatkowe -1 do pancerza przeciwnika; kumuluje się z modyfikatorem broni.'],['ithilmar',3,'Dodatkowe +1 Inicjatywy; kumuluje się z zasadą broni.']]) {
      // A free recruitment dagger is never made of gromril or ithilmar.
      const {freeRecruitmentDagger,...rest}=item;
      variants.push({...rest,name:`${item.name} z ${material==='gromril'?'gromrilu':'ithilmaru'}`,baseName:item.name,material,cost:item.cost*multiplier,description:`${item.description} ${effect}`});
    }
  }
  // Ogres pay 5 gc more for every two-handed weapon, including Halabarda and gromril/ithilmar versions.
  for(const item of [...melee,...variants].filter(e=>e.twoHanded)) {
    variants.push({...item,name:`${item.name} (ogrzy)`,baseName:item.baseName || item.name,ogreOnly:true,cost:item.cost+5,description:`${item.description} Tylko Ogry. Dopłata 5 gc jest wliczona. Można używać oburącz jak Siłacz (+2 S przez całą walkę) albo jednorącz jak Wielkolud; nie łączy się tych sposobów. Premia z Siłacza dotyczy również morgensternów.`});
  }
  // Ogres do not use shields or bucklers (they use Pancerpiącha instead).
  const ogreArmourNames={'Zbroja z ithilmaru':'Ogrza zbroja z ithilmaru','Zbroja z gromrilu':'Ogrza zbroja z gromrilu','Hełm':'Ogrzy hełm'};
  for(const item of entries.filter(e=>e.originCategory==='armor' && ogreArmourNames[e.name]))variants.push({...item,name:ogreArmourNames[item.name],baseName:item.name,ogreOnly:true,cost:item.cost*2,...(item.campaign_cost?{campaign_cost:item.campaign_cost*2}:{}),description:`${item.description} Tylko Ogry; podwójna cena jest wliczona.`});
  return [...entries,...variants];
}

export function purchaseCost(item,phase='recruitment') {
  return phase==='campaign' && item.campaign_cost!==undefined?item.campaign_cost:item.cost;
}

export function purchaseEquipment(item,phase='recruitment') {
  return {...item,cost:purchaseCost(item,phase),purchasedIn:phase};
}

export function equipmentChoices(fighter,catalog) {
  const ogre=fighterTemplate(fighter,catalog)?.race==='Ogr';
  return catalog.equipment.filter(item=>ogre?(!item.twoHanded || item.ogreOnly):true);
}

export function weaponLoadoutIssues(fighter,catalog) {
  const issues=[];
  let freeDaggerUsed=false,melee=0,ranged=0,main=0;
  for(const entry of fighter.equipment) {
    const item={...entry,...catalog.equipment.find(e=>e.name===entry.name)};
    if(item.originCategory==='melee_weapons') {
      if(item.name==='Sztylet' && Number(entry.cost)===0 && !freeDaggerUsed)freeDaggerUsed=true;
      else melee+=item.weaponCount || 1;
      if(item.mainWeapon)main++;
    }
    if(item.originCategory==='ranged_weapons')ranged++;
  }
  if(melee>2)issues.push({message:'Można nosić najwyżej dwie bronie ręczne oraz jeden darmowy sztylet.',severity:'error'});
  if(ranged>1)issues.push({message:'Można nosić najwyżej jedną broń strzelecką (para pistoletów liczy się jako jedna).',severity:'error'});
  if(main>1)issues.push({message:'Dwóch broni z cechą Główna nie można używać jednocześnie. Ustal, której używa model.',severity:'warning'});
  return issues;
}
