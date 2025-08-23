import assert from 'node:assert/strict';
import { ORB_SPACING, buildPath, enforceOrderAndSpacing, chooseInsertionS, handleMatches } from '../core.mjs';

function straightPath(len = 1000) {
  // simple horizontal line from (0,0) to (len,0)
  const pts = Array.from({ length: 11 }, (_, i) => [i * (len / 10), 0]);
  return buildPath(pts);
}

function mkState(orbs, leadS = 200) {
  return { orbs: [...orbs.map(o => ({ ...o }))], leadS, path: straightPath() };
}

function approxEqual(a, b, eps = 1e-6) { return Math.abs(a - b) < eps; }

// Test 1: enforce spacing & order
{
  const s = mkState([
    { s: 100, color: 'R' },
    { s: 140, color: 'G' },
    { s: 160, color: 'B' },
  ], 200);
  enforceOrderAndSpacing(s);
  assert.ok(s.orbs[0].s === 200, 'lead locks to leadS');
  for (let i = 1; i < s.orbs.length; i++) {
    assert.ok(s.orbs[i].s <= s.orbs[i - 1].s - ORB_SPACING, 'spacing maintained');
  }
}

// Test 2: insertion before/after side selection
{
  const path = straightPath();
  const baseS = 300;
  const beforePoint = path.sample(baseS - ORB_SPACING);
  const afterPoint = path.sample(baseS + ORB_SPACING);
  const s1 = chooseInsertionS(path, baseS, beforePoint);
  const s2 = chooseInsertionS(path, baseS, afterPoint);
  assert.ok(approxEqual(s1, baseS - ORB_SPACING), 'chooses before when closer');
  assert.ok(approxEqual(s2, baseS + ORB_SPACING), 'chooses after when closer');
}

// Test 3: match clearing for 3-in-a-row
{
  const s = mkState([
    { s: 200, color: 'R' },
    { s: 200 - ORB_SPACING, color: 'G' },
    { s: 200 - 2*ORB_SPACING, color: 'G' },
    { s: 200 - 3*ORB_SPACING, color: 'G' },
    { s: 200 - 4*ORB_SPACING, color: 'B' },
  ], 200);
  enforceOrderAndSpacing(s);
  // Index 1..3 are GGG; clear around middle (index 2)
  const removed = handleMatches(s, 2);
  assert.equal(removed, 3, 'returns removed count');
  assert.equal(s.orbs.length, 2, 'removes matched group of 3');
}

// Test 4: chain reaction when two groups join after contraction
{
  // R R G G G R R  -> clear GGG -> RRRR (should chain clear)
  const s = mkState([
    { s: 200, color: 'R' },
    { s: 200 - ORB_SPACING, color: 'R' },
    { s: 200 - 2*ORB_SPACING, color: 'G' },
    { s: 200 - 3*ORB_SPACING, color: 'G' },
    { s: 200 - 4*ORB_SPACING, color: 'G' },
    { s: 200 - 5*ORB_SPACING, color: 'R' },
    { s: 200 - 6*ORB_SPACING, color: 'R' },
  ], 200);
  enforceOrderAndSpacing(s);
  const removed = handleMatches(s, 3); // index 3 points at a 'G'
  assert.equal(removed, 7, 'clears GGG then RR+RR -> 4 more (total 7)');
  assert.equal(s.orbs.length, 0, 'all cleared after chain reaction');
}

console.log('All core tests passed.');
