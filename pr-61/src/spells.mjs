import {getSkillEntryNames,formatSkillEntry} from './skills.mjs';

export function spellInfo(entry,catalog) {
  const names=getSkillEntryNames(entry);
  const spell=catalog.spells.find(item=>names.includes(item.name.toLocaleLowerCase('pl')));
  return spell?{...spell,difficulty:entry.difficulty ?? spell.difficulty}:null;
}

export function difficultyText(value) {
  return value==='Auto'?'automatycznie':value==='X'?'rozwój modlitwy':String(value);
}

export function skillDisplay(entry,catalog) {
  const spell=spellInfo(entry,catalog);
  return formatSkillEntry(entry)+(spell?` · ${spell.difficulty==='X'?'':'trudność '}${difficultyText(spell.difficulty)}`:'');
}
