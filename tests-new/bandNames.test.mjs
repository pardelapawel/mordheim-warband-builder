import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rollBandName,rerollBandName,bandNameLists} from '../src/bandNames.mjs';
import {newBand} from '../src/model.mjs';

// A fixed sequence of "random" numbers, so a roll can be pinned to list entries.
const sequence=(...values)=>{let i=0;return ()=>values[i++ % values.length];};

test('every pattern builds a name from the band type\'s own lists',()=>{
  for(const type of ['awanturnicy','sludzy_ciemnosci']){
    const lists=bandNameLists(type);
    for(const pattern of 'ABCD')for(let i=0;i<50;i++){
      const name=rollBandName(type,Math.random,pattern);
      assert.ok(name && !/undefined/.test(name),`${type} ${pattern}: ${name}`);
    }
    assert.ok(lists.places.includes('ze Szczańca'),'shared places are included');
    assert.ok(!lists.places.includes('z Mordheim'),'unticked lines are left out');
  }
});

test('the adjective takes the noun\'s form',()=>{
  const {adjectives,nouns}=bandNameLists('awanturnicy');
  const at=(list,name)=>list.findIndex(x=>(Array.isArray(x)?x[0]:x)===name)/list.length+1e-9;
  const roll=noun=>rollBandName('awanturnicy',sequence(at(nouns,noun),at(adjectives,'Zapity'),0),'A');
  assert.match(roll('Kompania'),/^Zapita Kompania /);
  assert.match(roll('Zakon'),/^Zapity Zakon /);
  assert.match(roll('Bractwo'),/^Zapite Bractwo /);
  assert.match(roll('Kruki'),/^Zapite Kruki /);
  assert.match(roll('Najemnicy'),/^Zapici Najemnicy /);
});

test('a reroll never repeats the current name, and new bands start with a rolled name',()=>{
  for(let i=0;i<50;i++){const first=rollBandName('sludzy_ciemnosci');assert.notEqual(rerollBandName('sludzy_ciemnosci',first),first);}
  assert.notEqual(newBand('awanturnicy').name,'Nowa banda');
});
