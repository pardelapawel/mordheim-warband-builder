import {fighterTemplate} from './eligibility.mjs';

const advances={extraWound:{cost:15,exp:4,stat:'w'},weaponSkill:{cost:10,exp:2,stat:'ws'},mercenaryAdvance:{cost:10,exp:2}};

export function recruitmentOptions(fighter,catalog) {
  const template=fighterTemplate(fighter,catalog);
  if(!template || template.type==='Zwierzak')return [];
  const result=[];
  if(template.type==='Lider' && template.stats.w===1)result.push({key:'extraWound',label:'+1 W przy werbunku — 15 zk i +4 PD'});
  if(template.stats.ws===2)result.push({key:'weaponSkill',label:'+1 WS przy werbunku — 10 zk i +2 PD'});
  if(template.name==='Ludzki Najemnik')result.push({key:'mercenaryAdvance',label:'Chcę bohatera — +1 WS lub BS, 10 zk i +2 PD'});
  return result;
}

export function recruitmentCost(fighter) {
  return Object.entries(advances).reduce((cost,[key,advance])=>cost+(fighter.recruitmentUpgrades?.[key]?advance.cost:0),0);
}

export function setRecruitmentAdvance(fighter,key,value,catalog) {
  if(fighter.recruitmentComplete || !recruitmentOptions(fighter,catalog).some(option=>option.key===key))return false;
  if(key==='mercenaryAdvance' && !['','ws','bs'].includes(value))return false;
  fighter.recruitmentUpgrades ||= {};
  const previous=fighter.recruitmentUpgrades[key] || false;
  if(previous===value)return false;
  const advance=advances[key];
  const change=(selected,sign)=>{
    if(!selected)return;
    const stat=advance.stat || selected;
    fighter.stats[stat]=Math.max(0,(Number(fighter.stats[stat]) || 0)+sign);
    fighter.exp=Math.max(0,Number(fighter.exp)+sign*advance.exp);
    fighter.exp_start=Math.max(0,Number(fighter.exp_start || 0)+sign*advance.exp);
  };
  change(previous,-1);change(value,1);fighter.recruitmentUpgrades[key]=value;
  return true;
}
