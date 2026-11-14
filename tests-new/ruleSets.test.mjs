import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newBand,normalizeBand,textExport,RULE_SETS} from '../src/model.mjs';

const dir=set=>new URL(`../data/${set}/`,import.meta.url);
const files=set=>fs.readdirSync(dir(set),{recursive:true}).filter(f=>f.endsWith('.json')).map(f=>f.replace(/\\/g,'/')).sort();

test('Długobrody and Krótkobrody each have a full catalog',()=>{
  assert.deepEqual(Object.keys(RULE_SETS),['dlugobrody','krotkobrody']);
  assert.deepEqual(files('krotkobrody'),files('dlugobrody'));
  for(const file of files('krotkobrody'))assert.doesNotThrow(()=>JSON.parse(fs.readFileSync(new URL(file,dir('krotkobrody')),'utf8')),file);
});

test('new bands record the chosen rule set; old saves become Długobrody',()=>{
  assert.equal(newBand().ruleSetId,'dlugobrody');
  assert.equal(newBand('awanturnicy','krotkobrody').ruleSetId,'krotkobrody');
  assert.equal(normalizeBand(newBand('sludzy_ciemnosci','krotkobrody')).ruleSetId,'krotkobrody');
  for(const legacy of ['Drachenfels','smocza_turnia',undefined])assert.equal(normalizeBand({...newBand(),ruleSetId:legacy}).ruleSetId,'dlugobrody');
  assert.throws(()=>normalizeBand({...newBand(),ruleSetId:'Mordheimer'}),/Długobrody, Krótkobrody/);
});

test('text export names the rule set',()=>{
  const band={...newBand('awanturnicy','krotkobrody'),name:'Test'};
  assert.match(textExport(band,{fighters:[],equipment:[],skills:[],spells:[]}).split('\n')[0],/Krótkobrody · Awanturnicy/);
});
