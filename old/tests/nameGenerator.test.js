'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const NameGenerator = require('../nameGenerator.js');

// Helper: run generate many times and collect unique results to verify set coverage
function generateMany(fighter, count = 20) {
    const names = [];
    for (let i = 0; i < count; i++) {
        names.push(NameGenerator.generate(fighter));
    }
    return names;
}

test('generate returns a non-empty string for a human fighter', () => {
    const name = NameGenerator.generate({ name: 'Mercenary Captain', race: 'Human', type: 'Leader' });
    assert.equal(typeof name, 'string');
    assert.ok(name.length > 0);
});

test('generate returns a non-empty string for a dwarf fighter (English)', () => {
    const name = NameGenerator.generate({ name: 'Dwarf Noble', race: 'Dwarf', type: 'Leader' });
    assert.ok(name.length > 0);
});

test('generate returns a non-empty string for a dwarf fighter (Polish)', () => {
    const name = NameGenerator.generate({ name: 'Krasnoludzki Szlachcic', race: 'Krasnolud', type: 'Lider' });
    assert.ok(name.length > 0);
});

test('generate uses elf name set for Elf Ranger (good elf)', () => {
    // Elf Ranger race = "Elf" — should use light elf syllables, not dark elf
    const names = generateMany({ name: 'Elf Ranger', race: 'Elf', type: 'Special' }, 30);
    // Elf prefixes include "Aer", "Thin", "Gal", etc.
    // Dark elf prefixes include "Mal", "Khael", "Mor", "Drak", "Vha", etc.
    // At least some names should start with elf prefixes (not all dark elf prefixes)
    const elfPrefixes = ["Aer", "Thin", "Gal", "Luth", "Fin", "Ela", "Ith", "Cala", "Mela", "Hala"];
    const hasElfPrefix = names.some(n => elfPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasElfPrefix, 'Elf Ranger should produce names from the elf name set');
});

test('generate uses dark elf name set for Dark Elf (evil elf, English)', () => {
    // Dark Elf has race "Elf" but name "Dark Elf" — should use dark elf name set
    const names = generateMany({ name: 'Dark Elf', race: 'Elf', type: 'Special' }, 30);
    const darkElfPrefixes = ["Mal", "Khael", "Mor", "Drak", "Vha", "Khar", "Ur", "Xen", "Zar", "Nith"];
    const hasDarkElfPrefix = names.some(n => darkElfPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasDarkElfPrefix, 'Dark Elf should produce names from the dark_elf name set');
});

test('generate uses dark elf name set for Mroczny Elf (evil elf, Polish)', () => {
    // Mroczny Elf has race "Elf" but name "Mroczny Elf" — should use dark elf name set
    const names = generateMany({ name: 'Mroczny Elf', race: 'Elf', type: 'Special' }, 30);
    const darkElfPrefixes = ["Mal", "Khael", "Mor", "Drak", "Vha", "Khar", "Ur", "Xen", "Zar", "Nith"];
    const hasDarkElfPrefix = names.some(n => darkElfPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasDarkElfPrefix, 'Mroczny Elf should produce names from the dark_elf name set');
});

test('generate uses undead_noble set for Vampire leader', () => {
    const names = generateMany({ name: 'Vampire', race: 'Undead', type: 'Leader' }, 20);
    const nobleTitles = ["Count", "Baron", "Lord", "Master"];
    const hasTitle = names.some(n => nobleTitles.some(t => n.startsWith(t)));
    assert.ok(hasTitle, 'Vampire leader should get a noble title');
});

test('generate uses undead_noble set for Renegade Vampire (not leader)', () => {
    const names = generateMany({ name: 'Renegade Vampire', race: 'Undead', type: 'Special' }, 20);
    const nobleTitles = ["Count", "Baron", "Lord", "Master"];
    const hasTitle = names.some(n => nobleTitles.some(t => n.startsWith(t)));
    assert.ok(hasTitle, 'Renegade Vampire should get a noble title because name contains "vampire"');
});

test('generate uses undead_dreg set for Ghoul (undead non-vampire)', () => {
    const names = generateMany({ name: 'Ghoul', race: 'Undead', type: 'Animal' }, 30);
    const dregPrefixes = ["Grub", "Rat", "Worm", "Filth", "Bone", "Slim", "Gully", "Mud", "Rot"];
    const hasDregPrefix = names.some(n => dregPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasDregPrefix, 'Ghoul should produce names from the undead_dreg name set');
});

test('generate uses skaven name set for Skaven race fighters', () => {
    const names = generateMany({ name: 'Black Skaven', race: 'Skaven', type: 'Hero' }, 30);
    const skavenPrefixes = ["Queek", "Snik", "Gnaw", "Skrab", "Ratch", "Clatch", "Skrik", "Frenk", "Skarl", "Gnit"];
    const hasSkavenPrefix = names.some(n => skavenPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasSkavenPrefix, 'Skaven fighter should produce names from the skaven name set');
});

test('generate uses orc name set for Greenskin race (English)', () => {
    const names = generateMany({ name: 'Orc', race: 'Greenskin', type: 'Hero' }, 30);
    const orcPrefixes = ["Grub", "Gorg", "Morg", "Url", "Thrag", "Uzg", "Brak", "Grog"];
    const hasOrcPrefix = names.some(n => orcPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasOrcPrefix, 'Greenskin fighter should produce names from the orc name set');
});

test('generate uses orc name set for Zielonoskóry race (Polish)', () => {
    const names = generateMany({ name: 'Ork', race: 'Zielonoskóry', type: 'Hero' }, 30);
    const orcPrefixes = ["Grub", "Gorg", "Morg", "Url", "Thrag", "Uzg", "Brak", "Grog"];
    const hasOrcPrefix = names.some(n => orcPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasOrcPrefix, 'Zielonoskóry (Greenskin) fighter should produce names from the orc name set');
});

test('generate uses halfling name set for Halfling race fighters', () => {
    const names = generateMany({ name: 'Halfling Scout', race: 'Halfling', type: 'Hero' }, 20);
    const halflingPrefixes = ["Pip", "Merry", "Ned", "Tom", "Will", "Bram", "Fin", "Odo", "Sam", "Bert"];
    const hasHalflingPrefix = names.some(n => halflingPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasHalflingPrefix, 'Halfling fighter should produce names from the halfling name set');
});

test('generate uses halfling name set for Niziołek race fighters (Polish)', () => {
    const names = generateMany({ name: 'Niziołek Zwiadowca', race: 'Niziołek', type: 'Hero' }, 20);
    const halflingPrefixes = ["Pip", "Merry", "Ned", "Tom", "Will", "Bram", "Fin", "Odo", "Sam", "Bert"];
    const hasHalflingPrefix = names.some(n => halflingPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasHalflingPrefix, 'Niziołek (Halfling) fighter should produce names from the halfling name set');
});

test('generate uses beastmen name set for Beastmen race fighters', () => {
    const names = generateMany({ name: 'Beastman', race: 'Beastmen', type: 'Hero' }, 30);
    const beastmenPrefixes = ["Khar", "Grak", "Brak", "Morg", "Rakh", "Drak", "Ghor", "Kraal", "Bhor", "Roth"];
    const hasBeastmenPrefix = names.some(n => beastmenPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasBeastmenPrefix, 'Beastman fighter should produce names from the beastmen name set');
});

test('generate uses beastmen name set for Zwierzoczłek race fighters (Polish)', () => {
    const names = generateMany({ name: 'Zwierzoczłek', race: 'Zwierzoczłek', type: 'Hero' }, 30);
    const beastmenPrefixes = ["Khar", "Grak", "Brak", "Morg", "Rakh", "Drak", "Ghor", "Kraal", "Bhor", "Roth"];
    const hasBeastmenPrefix = names.some(n => beastmenPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasBeastmenPrefix, 'Zwierzoczłek (Beastman) fighter should produce names from the beastmen name set');
});

test('generate uses possessed name set for Possessed race fighters', () => {
    const names = generateMany({ name: 'Possessed', race: 'Possessed', type: 'Special' }, 30);
    const possessedPrefixes = ["Mal", "Kha", "Xan", "Var", "Dre", "Kor", "Skir", "Neth", "Vor", "Thrak"];
    const hasPossessedPrefix = names.some(n => possessedPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasPossessedPrefix, 'Possessed fighter should produce names from the possessed name set');
});

test('generate uses possessed name set for Opętany race fighters (Polish)', () => {
    const names = generateMany({ name: 'Opętany', race: 'Opętany', type: 'Special' }, 30);
    const possessedPrefixes = ["Mal", "Kha", "Xan", "Var", "Dre", "Kor", "Skir", "Neth", "Vor", "Thrak"];
    const hasPossessedPrefix = names.some(n => possessedPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasPossessedPrefix, 'Opętany (Possessed) fighter should produce names from the possessed name set');
});

test('generate uses wolf name set for Dire Wolf', () => {
    const names = generateMany({ name: 'Dire Wolf', race: 'Animal', type: 'Animal' }, 30);
    const wolfPrefixes = ["Grey", "Shadow", "Iron", "Night", "Black", "Ice", "Death", "Storm", "Bone", "Frost"];
    const hasWolfPrefix = names.some(n => wolfPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasWolfPrefix, 'Dire Wolf should produce names from the wolf name set');
});

test('generate uses wolf name set for Wilkor (Polish Dire Wolf)', () => {
    const names = generateMany({ name: 'Wilkor', race: 'Zwierzę', type: 'Animal' }, 30);
    const wolfPrefixes = ["Grey", "Shadow", "Iron", "Night", "Black", "Ice", "Death", "Storm", "Bone", "Frost"];
    const hasWolfPrefix = names.some(n => wolfPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasWolfPrefix, 'Wilkor should produce names from the wolf name set');
});

test('generate uses bear name set for Trained Bear', () => {
    const names = generateMany({ name: 'Trained Bear', race: 'Animal', type: 'Animal' }, 30);
    const bearPrefixes = ["Stone", "Iron", "Brown", "Cave", "Frost", "Blood", "Dark", "Grey", "Winter", "Scar"];
    const hasBearPrefix = names.some(n => bearPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasBearPrefix, 'Trained Bear should produce names from the bear name set');
});

test('generate uses bear name set for Tresowany Niedźwiedź (Polish Trained Bear)', () => {
    const names = generateMany({ name: 'Tresowany Niedźwiedź', race: 'Zwierzę', type: 'Animal' }, 30);
    const bearPrefixes = ["Stone", "Iron", "Brown", "Cave", "Frost", "Blood", "Dark", "Grey", "Winter", "Scar"];
    const hasBearPrefix = names.some(n => bearPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasBearPrefix, 'Tresowany Niedźwiedź should produce names from the bear name set');
});

test('generate uses hound name set for Warhound', () => {
    const names = generateMany({ name: 'Warhound', race: 'Animal', type: 'Animal' }, 30);
    const houndPrefixes = ["Black", "Red", "Shadow", "Grey", "Scar", "Grim", "Sharp", "Keen", "Dire", "Hell"];
    const hasHoundPrefix = names.some(n => houndPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasHoundPrefix, 'Warhound should produce names from the hound name set');
});

test('generate uses hound name set for Pies bojowy (Polish Warhound)', () => {
    const names = generateMany({ name: 'Pies bojowy', race: 'Zwierzę', type: 'Animal' }, 30);
    const houndPrefixes = ["Black", "Red", "Shadow", "Grey", "Scar", "Grim", "Sharp", "Keen", "Dire", "Hell"];
    const hasHoundPrefix = names.some(n => houndPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasHoundPrefix, 'Pies bojowy should produce names from the hound name set');
});

test('generate uses rat name set for Giant Rat', () => {
    const names = generateMany({ name: 'Giant Rat', race: 'Skaven', type: 'Animal' }, 30);
    const ratPrefixes = ["Snivel", "Gnaw", "Twitch", "Scurry", "Plague", "Rot", "Scab", "Nibble", "Pox", "Mange"];
    const hasRatPrefix = names.some(n => ratPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasRatPrefix, 'Giant Rat should produce names from the rat name set');
});

test('generate uses rat name set for Wielki Szczur (Polish Giant Rat)', () => {
    const names = generateMany({ name: 'Wielki Szczur', race: 'Skaven', type: 'Animal' }, 30);
    const ratPrefixes = ["Snivel", "Gnaw", "Twitch", "Scurry", "Plague", "Rot", "Scab", "Nibble", "Pox", "Mange"];
    const hasRatPrefix = names.some(n => ratPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasRatPrefix, 'Wielki Szczur should produce names from the rat name set');
});

test('generate uses squig name set for Cave Squig', () => {
    const names = generateMany({ name: 'Cave Squig', race: 'Greenskin', type: 'Animal' }, 30);
    const squigPrefixes = ["Boing", "Gnash", "Nibble", "Chomp", "Bounce", "Snap", "Gobble", "Crunch", "Munch", "Leap"];
    const hasSquigPrefix = names.some(n => squigPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasSquigPrefix, 'Cave Squig should produce names from the squig name set');
});

test('generate uses squig name set for Zębacz jaskiniowy (Polish Cave Squig)', () => {
    const names = generateMany({ name: 'Zębacz jaskiniowy', race: 'Zielonoskóry', type: 'Animal' }, 30);
    const squigPrefixes = ["Boing", "Gnash", "Nibble", "Chomp", "Bounce", "Snap", "Gobble", "Crunch", "Munch", "Leap"];
    const hasSquigPrefix = names.some(n => squigPrefixes.some(p => n.startsWith(p)));
    assert.ok(hasSquigPrefix, 'Zębacz jaskiniowy should produce names from the squig name set');
});

test('generate returns Sister title for Sister of Sigmar', () => {
    const names = generateMany({ name: 'Sister of Sigmar', race: 'Human', type: 'Hero' }, 20);
    const sisterTitles = ["Sister", "Mother", "Abbess", "Novice", "Matriarch"];
    const allHaveTitle = names.every(n => sisterTitles.some(t => n.startsWith(t)));
    assert.ok(allHaveTitle, 'Sister of Sigmar should always get a Sister-type title');
});

test('good elf and dark elf produce different name pools', () => {
    const elfNames = generateMany({ name: 'Elf Ranger', race: 'Elf', type: 'Special' }, 50);
    const darkElfNames = generateMany({ name: 'Dark Elf', race: 'Elf', type: 'Special' }, 50);

    const elfPrefixes = ["Aer", "Thin", "Gal", "Luth", "Fin", "Ela", "Ith", "Cala", "Mela", "Hala"];
    const darkElfPrefixes = ["Mal", "Khael", "Mor", "Drak", "Vha", "Khar", "Ur", "Xen", "Zar", "Nith"];

    const elfHasLightPrefix = elfNames.some(n => elfPrefixes.some(p => n.startsWith(p)));
    const darkElfHasDarkPrefix = darkElfNames.some(n => darkElfPrefixes.some(p => n.startsWith(p)));

    assert.ok(elfHasLightPrefix, 'Elf Ranger should draw from light elf name pool');
    assert.ok(darkElfHasDarkPrefix, 'Dark Elf should draw from dark elf name pool');
});
