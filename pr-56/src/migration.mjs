import {createSimpleSkillEntry,getSkillEntryNames} from './skills.mjs';

export function reconcileRules(band,catalog) {
  const firstUpdate=band.rulesRevision!==3 && band.fighters.length>0;
  for(const fighter of band.fighters) {
    const template=catalog.fighters.find(t=>[fighter.templateName,fighter.typeId,fighter.type].includes(t.name));
    if(template?.name==='Wielki Szczur' && fighter.race==='Skaven')fighter.race='Zwierzę';
    if(template?.name==='Krasnoludzki Szlachcic' && !fighter.skills.some(s=>getSkillEntryNames(s).includes('nienawiść do zielonoskórych')))fighter.skills.push(createSimpleSkillEntry('Nienawiść do Zielonoskórych'));
    for(const skill of fighter.skills) {
      const name=skill.label || skill.name;
      const replacement=template?.name==='Wampir' && name==='Oporny na psychologię'?'Oporny na psychologię (Wampir)':template?.name==='Szczuroogr' && name==='Głupota'?'Głupota (Szczuroogr)':null;
      if(replacement){skill.label=replacement;if(skill.name)skill.name=replacement;}
    }
    for(const item of fighter.equipment) {
      if(item.name==='Ogrza broń dwuręczna' && Number(item.cost)===5)item.cost=20;
    }
  }
  band.rulesRevision=3;
  return firstUpdate?'Zaktualizowano zasady Drachenfels. Zachowano umiejętności zapisanych wojowników, ponieważ mogły zostać zdobyte w kampanii; nowe rekrutacje korzystają z poprawionych zasad startowych.':'';
}
