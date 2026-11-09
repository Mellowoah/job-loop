"use strict";
/* Spec scoring. Score and XP are separate. Chain and level never enter XP. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.YoScore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const RING = [1, 1.25, 1.5, 2];
  const GRADE = { good: 1, great: 1.2, perfect: 1.5 };
  const GRADE_XP = { good: 1, great: 1.2, perfect: 1.5 };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function levelOf(level) { return Math.max(1, level | 0); }

  function basePoints(level) {
    return Math.round(100 * Math.pow(1.06, levelOf(level) - 1));
  }
  function chainCap(level) {
    return 2 + 0.5 * Math.floor(levelOf(level) / 10);
  }
  function chainMult(chain, level) {
    const c = Math.max(1, chain | 0);
    return Math.min(1 + 0.25 * (c - 1), chainCap(level));
  }
  function trickMult(distinct) {
    const n = Math.max(0, distinct | 0);
    return Math.min(2.5, 1 + 0.25 * n);
  }
  function ringPay(row) {
    const i = clamp(row | 0, 0, 3);
    return RING[i];
  }
  function gradePay(grade) { return GRADE[grade] || 1; }
  function gradeXp(grade) { return GRADE_XP[grade] || 1; }

  function hitScore(opts) {
    const o = opts || {};
    const gold = o.gold ? 2 : 1;
    const raw = basePoints(o.level) * ringPay(o.row) * gradePay(o.grade) * gold * chainMult(o.chain || 1, o.level) * trickMult(o.tricks || 0);
    return Math.max(1, Math.round(raw));
  }
  function hitXP(opts) {
    const o = opts || {};
    return Math.max(1, Math.round(10 * ringPay(o.row) * gradeXp(o.grade)));
  }
  function lineBonus(level) { return basePoints(level) * 5; }
  function trickScore(base, level, combo) {
    const c = Math.max(1, combo | 0);
    return Math.round(base * Math.pow(1.06, levelOf(level) - 1) * (1 + 0.5 * (c - 1)));
  }
  function trickXP(base) { return Math.max(1, Math.round((base || 0) / 10)); }
  function coinsForHit(level, gold) {
    return 1 + Math.floor(levelOf(level) / 10) + (gold ? 3 : 0);
  }
  function bossHp(level) { return 3 + Math.floor(levelOf(level) / 5); }
  function xpNeed(level) { return Math.round(250 * Math.pow(levelOf(level), 1.3)); }

  // Pre-chain plate value. smashPlate applies chainMult.
  function saucerBase(opts) {
    const o = opts || {};
    const gold = o.gold ? 2 : 1;
    const raw = basePoints(o.level) * ringPay(o.row) * gradePay(o.grade) * gold * trickMult(o.tricks || 0);
    return Math.max(1, Math.round(raw));
  }

  return {
    RING: RING, GRADE: GRADE, GRADE_XP: GRADE_XP,
    basePoints: basePoints, chainCap: chainCap, chainMult: chainMult, trickMult: trickMult,
    ringPay: ringPay, hitScore: hitScore, hitXP: hitXP, lineBonus: lineBonus,
    trickScore: trickScore, trickXP: trickXP, coinsForHit: coinsForHit, bossHp: bossHp,
    xpNeed: xpNeed, saucerBase: saucerBase,
  };
});
