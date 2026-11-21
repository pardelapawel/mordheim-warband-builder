import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newBand,normalizeBand,retypeEmptyBand} from '../src/model.mjs';

test('empty band switches type and rules in place',()=>{
  const b=newBand();b.name='Moja banda';b.nameRolled=false;
  const next=retypeEmptyBand(b,'sludzy_ciemnosci','krotkobrody');
  assert.equal(next.id,b.id);
  assert.equal(next.warbandTypeId,'sludzy_ciemnosci');
  assert.equal(next.ruleSetId,'krotkobrody');
  assert.equal(next.name,'Moja banda','typed name is kept');
  assert.equal(b.warbandTypeId,'awanturnicy','original untouched');
});

test('a rolled name is rolled again when the type changes',()=>{
  const b=newBand();b.name='Stara nazwa';
  assert.equal(b.nameRolled,true);
  const next=retypeEmptyBand(b,'sludzy_ciemnosci','dlugobrody');
  assert.notEqual(next.name,'Stara nazwa');
  assert.equal(next.nameRolled,true);
});

test('changing only the rules keeps the rolled name',()=>{
  const b=newBand();b.name='Stara nazwa';
  assert.equal(retypeEmptyBand(b,'awanturnicy','krotkobrody').name,'Stara nazwa');
});

test('rolled-name flag survives a save and is off for older saves',()=>{
  const b=newBand();
  assert.equal(normalizeBand(JSON.parse(JSON.stringify(b))).nameRolled,true);
  const old=JSON.parse(JSON.stringify(b));delete old.nameRolled;
  assert.equal(normalizeBand(old).nameRolled,false);
});

test('unknown type for the rules falls back to the first allowed type',()=>{
  const next=retypeEmptyBand(newBand(),'nope','dlugobrody');
  assert.equal(next.warbandTypeId,'awanturnicy');
});

test('a band with fighters cannot change type',()=>{
  const b=newBand();b.fighters=[{id:'x'}];
  assert.throws(()=>retypeEmptyBand(b,'sludzy_ciemnosci','dlugobrody'));
});

test('a silently created band still has its type open; it survives saving and retyping',()=>{
  const b=newBand();
  assert.equal(b.typeOpen,true);
  assert.equal(normalizeBand(JSON.parse(JSON.stringify(b))).typeOpen,true);
  assert.equal(retypeEmptyBand(b,'sludzy_ciemnosci','dlugobrody').typeOpen,true);
});

test('a band whose type was picked in the new-band dialog stays closed',()=>{
  const b=newBand('sludzy_ciemnosci');b.typeOpen=false;
  assert.equal(normalizeBand(JSON.parse(JSON.stringify(b))).typeOpen,false);
});

test('older saves count as open only while they have no fighters',()=>{
  const empty=JSON.parse(JSON.stringify(newBand()));delete empty.typeOpen;
  assert.equal(normalizeBand(empty).typeOpen,true);
});
