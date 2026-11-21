import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newBand,retypeEmptyBand} from '../src/model.mjs';

test('empty band switches type and rules in place',()=>{
  const b=newBand();b.name='Moja banda';
  const next=retypeEmptyBand(b,'sludzy_ciemnosci','krotkobrody');
  assert.equal(next.id,b.id);
  assert.equal(next.warbandTypeId,'sludzy_ciemnosci');
  assert.equal(next.ruleSetId,'krotkobrody');
  assert.equal(next.name,'Moja banda');
  assert.equal(b.warbandTypeId,'awanturnicy','original untouched');
});

test('retyping can roll a fresh name for the new type',()=>{
  const b=newBand();b.name='Stara nazwa';
  const next=retypeEmptyBand(b,'sludzy_ciemnosci','dlugobrody',{rerollName:true});
  assert.notEqual(next.name,'Stara nazwa');
  assert.ok(next.name.length>0);
});

test('unknown type for the rules falls back to the first allowed type',()=>{
  const next=retypeEmptyBand(newBand(),'nope','dlugobrody');
  assert.equal(next.warbandTypeId,'awanturnicy');
});

test('a band with fighters cannot change type',()=>{
  const b=newBand();b.fighters=[{id:'x'}];
  assert.throws(()=>retypeEmptyBand(b,'sludzy_ciemnosci','dlugobrody'));
});
