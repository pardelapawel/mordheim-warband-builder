'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateWarbandRating } = require('../warbandUtils.js');

test('calculateWarbandRating returns zero totals for empty warband', () => {
    const result = calculateWarbandRating([]);
    assert.equal(result.normalCount, 0);
    assert.equal(result.bigCount, 0);
    assert.equal(result.totalExp, 0);
    assert.equal(result.total, 0);
});

test('calculateWarbandRating counts standard fighters as 5 pts each', () => {
    const fighters = [
        { is_large: false, exp: 0 },
        { is_large: false, exp: 0 },
        { is_large: false, exp: 0 }
    ];
    const result = calculateWarbandRating(fighters);
    assert.equal(result.normalCount, 3);
    assert.equal(result.bigCount, 0);
    assert.equal(result.total, 15);
});

test('calculateWarbandRating counts large fighters as 20 pts each', () => {
    const fighters = [
        { is_large: true, exp: 0 }
    ];
    const result = calculateWarbandRating(fighters);
    assert.equal(result.normalCount, 0);
    assert.equal(result.bigCount, 1);
    assert.equal(result.total, 20);
});

test('calculateWarbandRating sums experience for all fighters', () => {
    const fighters = [
        { is_large: false, exp: 20 },
        { is_large: false, exp: 5 }
    ];
    const result = calculateWarbandRating(fighters);
    assert.equal(result.totalExp, 25);
    assert.equal(result.total, 35); // 2×5 + 25 exp
});

test('calculateWarbandRating handles mixed normal and large fighters with exp', () => {
    const fighters = [
        { is_large: false, exp: 20 },
        { is_large: false, exp: 0 },
        { is_large: false, exp: 0 },
        { is_large: false, exp: 0 },
        { is_large: false, exp: 0 },
        { is_large: true, exp: 0 }
    ];
    const result = calculateWarbandRating(fighters);
    assert.equal(result.normalCount, 5);
    assert.equal(result.bigCount, 1);
    assert.equal(result.totalExp, 20);
    assert.equal(result.total, 65); // 5×5 + 1×20 + 20 exp
});

test('calculateWarbandRating treats missing is_large as normal fighter', () => {
    const fighters = [
        { exp: 0 },
        { exp: 10 }
    ];
    const result = calculateWarbandRating(fighters);
    assert.equal(result.normalCount, 2);
    assert.equal(result.bigCount, 0);
    assert.equal(result.total, 20); // 2×5 + 10 exp
});

test('calculateWarbandRating treats missing exp as zero', () => {
    const fighters = [
        { is_large: false },
        { is_large: true }
    ];
    const result = calculateWarbandRating(fighters);
    assert.equal(result.totalExp, 0);
    assert.equal(result.total, 25); // 1×5 + 1×20
});
