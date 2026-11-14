import {createSimpleSkillEntry,getSkillEntryNames} from './skills.mjs';
import {fighterTemplate} from './eligibility.mjs';

export const RULES_REVISION=4;

const hasSkillName=(fighter,name)=>fighter.skills.some(s=>getSkillEntryNames(s).includes(name.toLocaleLowerCase('pl')));
function renameSkill(fighter,from,to) {
  for(const skill of fighter.skills) {
    if((skill.label || skill.name)!==from)continue;
    skill.label=to;if(skill.name)skill.name=to;
  }
}

// Each step runs once per band, so later manual changes by the player are not overwritten on every load.
export function reconcileRules(band,catalog) {
  const revision=Number(band.rulesRevision) || 0;
  const firstUpdate=revision<RULES_REVISION && band.fighters.length>0;
  for(const fighter of band.fighters) {
    const name=fighterTemplate(fighter,catalog)?.name;
    if(revision<3) {
      if(name==='Wielki Szczur' && fighter.race==='Skaven')fighter.race='Zwierzę';
      if(name==='Krasnoludzki Szlachcic' && !hasSkillName(fighter,'Nienawiść do Zielonoskórych'))fighter.skills.push(createSimpleSkillEntry('Nienawiść do Zielonoskórych'));
      if(name==='Wampir')renameSkill(fighter,'Oporny na psychologię','Oporny na psychologię (Wampir)');
      if(name==='Szczuroogr')renameSkill(fighter,'Głupota','Głupota (Szczuroogr)');
      for(const item of fighter.equipment) if(item.name==='Ogrza broń dwuręczna' && Number(item.cost)===5)item.cost=20;
    }
    if(revision<4) {
      // Only Ogr Najemnik and Tresowany Niedźwiedź are immune to fear; Opętany only causes it.
      if(['Ogr Najemnik','Tresowany Niedźwiedź'].includes(name))renameSkill(fighter,'Strach','Budzi strach');
      if(name==='Opętany')renameSkill(fighter,'Budzi strach','Strach');
      const missing={'Nekromanta':'Słudzy Cienia','Zaklinacz Eshin':'Motywator','Szaman Orkóf':'ŁAAA!!! (Szaman)'}[name];
      if(missing && !hasSkillName(fighter,missing))fighter.skills.push(createSimpleSkillEntry(missing));
    }
  }
  band.rulesRevision=RULES_REVISION;
  return firstUpdate?'Zaktualizowano zasady Drachenfels. Zachowano umiejętności zapisanych wojowników, ponieważ mogły zostać zdobyte w kampanii; nowe rekrutacje korzystają z poprawionych zasad startowych.':'';
}
