"use strict";
/* Pure progression for Yo. Cosmetic rewards only: no stat changes, one coin purse.
   The throw, string, and plate-point formulas stay in the game. This module owns
   save migration, level chests, bosses queued beside those levels, streaks, and
   the local weekly challenge. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.YoProgress = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DUPLICATE_COINS = 50;
  const WEEKLY_COINS = 150;
  const RARITY_RANK = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
  const LOOK_PRICE = { common: 150, uncommon: 400, rare: 900, epic: 1600, legendary: 2500 };
  const BACKDROPS = [
    { id: "boardwalk", name: "Night boardwalk", price: 0 },
    { id: "midway", name: "Midway lamps", price: 1500 },
    { id: "pier", name: "Pier lights", price: 1500 },
    { id: "lake", name: "Lake night", price: 1500 },
  ];
  const PLAYABLE = ["pocket", "maple", "brass", "hound", "orbit", "night", "flower", "diamond"];
  const THEMES = ["gold", "neon", "sunset"];
  const WEIGHT = { common: 50, uncommon: 28, rare: 14, epic: 6, legendary: 2 };
  const MOVE_PAY = { still: 1, sway: 1.1, drift: 1.2, lane: 1.3, orbit: 1.45 };

  const COSMETICS = [
    { id: "pocket-red", name: "Pocket Red", rarity: "common", blurb: "Red caps and a gold hub. The booth classic, as a look only.",
      look: { hi: "#ff7a5a", mid: "#e23d2b", deep: "#7c1c12", rim: "#3a0e08", accent: "#ffd27a", hub: "#e7b15a" }, finish: "gloss", cap: "stripes", rimStyle: "single", trail: "" },
    { id: "fair-cream", name: "Fair Cream", rarity: "common", blurb: "Cream and carmine, like a plate on the floor.",
      look: { hi: "#fff8ec", mid: "#f4ead6", deep: "#c9b48a", rim: "#e7b15a", accent: "#d23a2a", hub: "#e7b15a" }, finish: "gloss", cap: "rings", rimStyle: "single", trail: "" },
    { id: "park-leaf", name: "Park Leaf", rarity: "common", blurb: "Park green with a soft petal drift.",
      look: { hi: "#e7f6c8", mid: "#6ea356", deep: "#234022", rim: "#1d3320", accent: "#d8f5a2", hub: "#ffe7a8" }, finish: "wood", cap: "petals", rimStyle: "scallop", trail: "petal" },
    { id: "brass-glow", name: "Brass Glow", rarity: "uncommon", blurb: "Machined brass shine. The yo-yo you picked still decides the weight.",
      look: { hi: "#fff0c0", mid: "#e2b158", deep: "#8a5a1c", rim: "#5a3a10", accent: "#fff8e0", hub: "#f3efe6" }, finish: "metal", cap: "engraved", rimStyle: "step", trail: "" },
    { id: "hound-tread", name: "Hound Tread", rarity: "uncommon", blurb: "A rubber tread and a paw stamp. It does not roll any faster.",
      look: { hi: "#d8c3a4", mid: "#8d6a45", deep: "#3e2a1c", rim: "#1a1410", accent: "#c45a3a", hub: "#c45a3a" }, finish: "matte", cap: "paw", rimStyle: "tyre", trail: "" },
    { id: "pearl-orbit", name: "Pearl Orbit", rarity: "rare", blurb: "Pearl shell, orbit ring, a little glint. String length stays put.",
      look: { hi: "#ffffff", mid: "#dcd6e8", deep: "#7d7890", rim: "#2c2a32", accent: "#e23d2b", hub: "#e7b15a" }, finish: "pearl", cap: "orbit", rimStyle: "thin", trail: "glint" },
    { id: "night-neon", name: "Night Neon", rarity: "rare", blurb: "Gloss black and a red neon rim.",
      look: { hi: "#4a4440", mid: "#1c1815", deep: "#050404", rim: "#ff2d3c", accent: "#ff2d3c", hub: "#e7b15a" }, finish: "gloss", cap: "star", rimStyle: "neon", trail: "" },
    { id: "petal-bloom", name: "Petal Bloom", rarity: "rare", blurb: "Pastel petals leave the caps while it spins.",
      look: { hi: "#fff2f8", mid: "#f6b8d6", deep: "#c97aa8", rim: "#fde7f0", accent: "#c9b6ff", hub: "#ffe17a" }, finish: "pastel", cap: "petals", rimStyle: "scallop", trail: "petal" },
    { id: "ember-spin", name: "Ember Spin", rarity: "epic", blurb: "Sunset embers follow the spin. Score is unchanged.",
      look: { hi: "#ffe0b8", mid: "#ff9a5a", deep: "#a33a22", rim: "#3a1406", accent: "#ffd27a", hub: "#ffe7a8" }, finish: "gloss", cap: "stripes", rimStyle: "single", trail: "ember" },
    { id: "gild-plate", name: "Gild Plate", rarity: "epic", blurb: "Gold-plate glaze. Hits still pay the carnival table.",
      look: { hi: "#fff6c8", mid: "#f5c542", deep: "#a86f12", rim: "#fff0a0", accent: "#fffbe0", hub: "#ffe27a" }, finish: "metal", cap: "engraved", rimStyle: "step", trail: "glint" },
    { id: "prism-cut", name: "Prism Cut", rarity: "legendary", blurb: "Faceted crystal look. This is not the code-locked Diamond yo-yo.",
      look: { hi: "#ffffff", mid: "#bff3ff", deep: "#2a6fb0", rim: "#dfe8f2", accent: "#ffffff", hub: "#f4f7fb" }, finish: "gem", cap: "facets", rimStyle: "silver", trail: "glint" },
  ];
  const COSMETIC_IDS = new Set(COSMETICS.map((c) => c.id));

  const BOSSES = [
    { name: "Ringmaster", hp: 3 },
    { name: "Strongman", hp: 3 },
    { name: "Fire Dancer", hp: 4 },
    { name: "High Wire", hp: 4 },
    { name: "Cannonball", hp: 5 },
  ];

  const WEEKLIES = [
    { id: "sleepers", name: "Sleepers", desc: "Land 8 Sleepers.", stat: "sleeper", goal: 8 },
    { id: "binds", name: "Clean binds", desc: "Land 4 clean binds.", stat: "bind", goal: 4 },
    { id: "dogs", name: "Walk the dog", desc: "Walk the Dog 3 times.", stat: "dog", goal: 3 },
    { id: "plates", name: "Plates", desc: "Smash 12 carnival plates.", stat: "plates", goal: 12 },
    { id: "perfects", name: "Perfect hits", desc: "Land 5 Perfect hits.", stat: "perfects", goal: 5 },
    { id: "whips", name: "Whips", desc: "Land 6 Whips.", stat: "whip", goal: 6 },
    { id: "arounds", name: "Around the world", desc: "Around the World 3 times.", stat: "around", goal: 3 },
  ];
  const EXTRA_WEEKS = [];

  const ACHIEVEMENTS = [
    { id: "first-throw", name: "First snap", desc: "Throw the yo-yo.", test: (s) => s.stats.throws >= 1 },
    { id: "sleeper", name: "Let it sleep", desc: "Land a Sleeper.", test: (s) => (s.tricks.sleeper || 0) >= 1 },
    { id: "breakaway", name: "Side throw", desc: "Land a Breakaway.", test: (s) => (s.tricks.breakaway || 0) >= 1 },
    { id: "dog", name: "Walk the dog", desc: "Walk the Dog.", test: (s) => (s.tricks.dog || 0) >= 1 },
    { id: "baby", name: "Rock the baby", desc: "Rock the Baby.", test: (s) => (s.tricks.baby || 0) >= 1 },
    { id: "whip", name: "Crack the whip", desc: "Land a Whip.", test: (s) => (s.tricks.whip || 0) >= 1 },
    { id: "around", name: "Full circle", desc: "Around the World.", test: (s) => (s.tricks.around || 0) >= 1 },
    { id: "bind", name: "Clean hands", desc: "Land a clean bind.", test: (s) => (s.tricks.bind || 0) >= 1 },
    { id: "perfect", name: "Dead center", desc: "Land a Perfect hit.", test: (s) => s.stats.perfects >= 1 },
    { id: "chain", name: "Plate chain", desc: "Chain 3 plate hits.", test: (s) => s.stats.bestChain >= 3 },
    { id: "level-5", name: "Five deep", desc: "Reach level 5.", test: (s) => s.level >= 5 },
    { id: "level-10", name: "Ten deep", desc: "Reach level 10.", test: (s) => s.level >= 10 },
    { id: "chest", name: "Case opener", desc: "Open a level chest.", test: (s) => s.stats.chests >= 1 },
    { id: "boss", name: "Top of the bill", desc: "Beat a carnival boss.", test: (s) => s.stats.bosses >= 1 },
    { id: "streak-3", name: "Three-day run", desc: "Reach a 3-day streak.", test: (s) => (s.streak.best || 0) >= 3 },
    { id: "streak-7", name: "Week of yo", desc: "Reach a 7-day streak.", test: (s) => (s.streak.best || 0) >= 7 },
    { id: "collector", name: "Full case", desc: "Own all 11 collectible looks.", test: (s) => s.ownedCosmetics.length >= 11 },
    { id: "weekly", name: "Weekly bill", desc: "Finish a weekly challenge.", test: (s) => s.stats.weeklies >= 1 },
    { id: "four-figures", name: "Four figures", desc: "Reach a best of 1,000.", test: (s) => s.best >= 1000 },
  ];

  function isObj(v) { return !!v && typeof v === "object" && !Array.isArray(v); }
  function asNum(v) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
    return null;
  }
  function clampNum(v, lo, hi, d) {
    const n = asNum(v);
    if (n == null) return d;
    return Math.min(hi, Math.max(lo, n));
  }
  function pickNum(primary, fallback, lo, hi, d) {
    const a = asNum(primary);
    if (a != null) return Math.min(hi, Math.max(lo, a));
    const b = asNum(fallback);
    if (b != null) return Math.min(hi, Math.max(lo, b));
    return d;
  }
  function hashStr(s) {
    let h = 2166136261;
    const str = String(s);
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function motionFor(lv) {
    return lv <= 1 ? "still" : lv <= 3 ? "sway" : lv <= 6 ? "drift" : lv <= 9 ? "lane" : "orbit";
  }
  function xpNeed(lvl) {
    const lv = Math.max(1, lvl | 0);
    return Math.round(250 * Math.pow(lv, 1.3));
  }
  function defaultStats() {
    return {
      throws: 0, plates: 0, perfects: 0, greats: 0, goods: 0, bosses: 0, chests: 0, weeklies: 0,
      playSeconds: 0, bestChain: 0, bestStreak: 0, runs: 0, sessions: 0, runSeconds: 0, lines: 0,
      hitsByRing: [0, 0, 0, 0],
    };
  }
  function defaultUpgrades() { return { bearing: 0, strings: 0, gold: 0 }; }
  function defaultSave() {
    return {
      schemaVersion: 4,
      selected: "pocket", best: 0, tricks: {}, sound: true, haptics: true, tilt: true, carnival: true, theme: "gold",
      xp: 0, level: 1, coins: 0, codes: {}, plates: 0, seenInfo: false, shake: true, seed: "",
      claimedChests: {}, revealQueue: [], bossesCleared: {}, pendingBosses: [], achievements: {},
      stats: defaultStats(), streak: { count: 0, lastDay: "", best: 0 },
      weekly: { key: "", id: "", progress: 0, goal: 0, claimed: false, rewarded: false },
      cosmetic: "", ownedCosmetics: [], milestonesInitialized: false,
      upgrades: defaultUpgrades(), ownedBackdrops: ["boardwalk"], backdrop: "boardwalk",
      fishBest: 0, fishCaught: 0, shopUnlocked: false, bossGate: 0,
    };
  }
  function freshSave() {
    const s = defaultSave();
    s.milestonesInitialized = true;
    s.seed = "fresh";
    return s;
  }

  function sanitizeTricks(raw) {
    const out = {};
    if (!isObj(raw)) return out;
    for (const [k, v] of Object.entries(raw)) {
      if (!/^[a-z0-9_-]{1,24}$/.test(k)) continue;
      const n = asNum(v);
      if (n == null || n < 0) continue;
      out[k] = Math.min(1e9, Math.floor(n));
    }
    return out;
  }
  function sanitizeStats(raw, fallback) {
    const base = defaultStats();
    const sources = [isObj(fallback) ? fallback : null, isObj(raw) ? raw : null];
    for (const src of sources) {
      if (!src) continue;
      for (const k of Object.keys(base)) {
        const n = asNum(src[k]);
        if (n != null && n >= 0) base[k] = Math.min(1e12, n);
      }
    }
    base.throws = Math.floor(base.throws);
    base.plates = Math.floor(base.plates);
    base.perfects = Math.floor(base.perfects);
    base.greats = Math.floor(base.greats);
    base.goods = Math.floor(base.goods);
    base.bosses = Math.floor(base.bosses);
    base.chests = Math.floor(base.chests);
    base.weeklies = Math.floor(base.weeklies);
    base.bestChain = Math.floor(base.bestChain);
    base.bestStreak = Math.floor(base.bestStreak);
    base.runs = Math.floor(base.runs || 0);
    base.sessions = Math.floor(base.sessions || 0);
    base.lines = Math.floor(base.lines || 0);
    base.runSeconds = Math.max(0, asNum(base.runSeconds) || 0);
    const rings = [0, 0, 0, 0];
    for (const src of sources) {
      if (!src || !Array.isArray(src.hitsByRing)) continue;
      for (let i = 0; i < 4; i++) {
        const n = asNum(src.hitsByRing[i]);
        if (n != null && n >= 0) rings[i] = Math.min(1e12, Math.floor(n));
      }
    }
    base.hitsByRing = rings;
    return base;
  }
  function sanitizeCodes(raw, fallback) {
    const out = {};
    const a = isObj(raw) ? raw : {};
    const b = isObj(fallback) ? fallback : {};
    if (a.diamond === true || b.diamond === true) out.diamond = true;
    return out;
  }
  function boolish(primary, fallback, d) {
    if (typeof primary === "boolean") return primary;
    if (typeof fallback === "boolean") return fallback;
    return d;
  }
  function localDay(date) {
    const dt = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(dt.getTime())) return "1970-01-01";
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }
  function prevDay(dayStr) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayStr || "");
    if (!m) return "";
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    dt.setDate(dt.getDate() - 1);
    return localDay(dt);
  }
  function isoWeekKey(now) {
    const dt = now instanceof Date ? now : new Date(now);
    if (Number.isNaN(dt.getTime())) return "1970-W01";
    const date = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return date.getUTCFullYear() + "-W" + String(week).padStart(2, "0");
  }
  function allWeeks() { return WEEKLIES.concat(EXTRA_WEEKS); }
  function weeklyById(id) { return allWeeks().find((w) => w.id === id) || null; }
  function weeklyFor(key) {
    const list = allWeeks();
    return list[hashStr("week:" + key) % list.length];
  }
  function registerWeekly(spec) {
    if (!spec || typeof spec.id !== "string" || !spec.stat || !(spec.goal > 0)) return false;
    if (allWeeks().some((w) => w.id === spec.id)) return false;
    EXTRA_WEEKS.push({ id: spec.id, name: String(spec.name || spec.id), desc: String(spec.desc || ""), stat: String(spec.stat), goal: Math.floor(spec.goal) });
    return true;
  }
  function unregisterWeekly(id) {
    const i = EXTRA_WEEKS.findIndex((w) => w.id === id);
    if (i < 0) return false;
    EXTRA_WEEKS.splice(i, 1);
    return true;
  }
  function weekCount() { return allWeeks().length; }

  function cosmetic(id) { return COSMETICS.find((c) => c.id === id) || null; }
  function visualModel(cfg, cosmeticId) {
    if (!cfg) return cfg;
    const c = cosmetic(cosmeticId);
    if (!c) return cfg;
    return Object.assign({}, cfg, { look: c.look, finish: c.finish, cap: c.cap, rimStyle: c.rimStyle, trail: c.trail || "" });
  }
  function gradeReach(distance, width) {
    const w = Math.max(1, asNum(width) == null ? 1 : width);
    const dist = Math.max(0, asNum(distance) == null ? w : distance);
    const ratio = dist / w;
    if (ratio <= 0.25) return "perfect";
    if (ratio <= 0.55) return "great";
    return "good";
  }
  function gradeHit(distance, radius) {
    const r = Math.max(1, asNum(radius) == null ? 1 : radius);
    const dist = Math.max(0, asNum(distance) == null ? r : distance);
    const ratio = dist / r;
    if (ratio <= 0.33) return "perfect";
    if (ratio <= 0.7) return "great";
    return "good";
  }
  function gradeWord(grade) {
    if (grade === "perfect") return "Perfect";
    if (grade === "great") return "Great";
    return "Good";
  }
  function comboMultiplier(combo) {
    const c = Math.max(0, combo | 0);
    return 1 + Math.max(0, c - 1) * 0.5;
  }
  function comboCallout(combo) {
    const m = comboMultiplier(combo);
    if (m === 2 || m === 3 || m === 4) return "×" + m;
    return "";
  }
  function trickPoints(base, combo) {
    return Math.round(base * comboMultiplier(combo));
  }
  function bossFor(level) {
    const lv = level | 0;
    if (lv < 5 || lv % 5 !== 0) return null;
    const tier = lv / 5;
    const b = BOSSES[(tier - 1) % BOSSES.length];
    const cycle = Math.floor((tier - 1) / BOSSES.length);
    return { name: b.name, level: lv, hp: 3 + Math.floor(lv / 5), cycle: cycle };
  }

  function rollChest(save, level) {
    const owned = new Set(save.ownedCosmetics || []);
    const pool = COSMETICS.filter((c) => !owned.has(c.id));
    if (!pool.length) {
      const all = COSMETICS;
      const idx = hashStr(String(save.seed) + ":dup:" + level) % all.length;
      const c = all[idx];
      const coins = 50 * (RARITY_RANK[c.rarity] || 1);
      return { kind: "coins", coins: coins, cosmeticId: c.id, rarity: c.rarity };
    }
    const bag = pool.map((c) => ({ c, w: WEIGHT[c.rarity] || 1 }));
    let total = 0;
    for (const b of bag) total += b.w;
    let x = hashStr(String(save.seed) + ":" + level) % total;
    for (const b of bag) {
      if (x < b.w) return { kind: "cosmetic", cosmeticId: b.c.id, rarity: b.c.rarity, coins: 0 };
      x -= b.w;
    }
    const last = bag[bag.length - 1].c;
    return { kind: "cosmetic", cosmeticId: last.id, rarity: last.rarity, coins: 0 };
  }

  function onMilestone(save, level, opts) {
    const queueBoss = !opts || opts.queueBoss !== false;
    const result = { chest: null, boss: false, alreadyChest: false, alreadyBoss: false };
    const lv = level | 0;
    if (lv % 5 !== 0 || lv <= 0) return result;
    const key = String(lv);
    if (save.claimedChests[key]) result.alreadyChest = true;
    else {
      const reward = rollChest(save, lv);
      save.claimedChests[key] = { kind: reward.kind, cosmeticId: reward.cosmeticId || "", coins: reward.coins || 0, rarity: reward.rarity || "" };
      if (reward.kind === "cosmetic") {
        if (reward.cosmeticId && !save.ownedCosmetics.includes(reward.cosmeticId)) save.ownedCosmetics.push(reward.cosmeticId);
      } else save.coins += reward.coins || 0;
      save.stats.chests += 1;
      save.revealQueue.push({ level: lv, kind: reward.kind, cosmeticId: reward.cosmeticId || "", coins: reward.coins || 0, rarity: reward.rarity || "", seen: false });
      result.chest = save.claimedChests[key];
    }
    if (!queueBoss) return result;
    if (save.bossesCleared[key]) result.alreadyBoss = true;
    else if (!save.pendingBosses.some((n) => String(n) === key)) {
      save.pendingBosses.push(lv);
      save.pendingBosses.sort((a, b) => a - b);
      result.boss = true;
    }
    return result;
  }

  // Same boss after the plates are rebuilt (a level change mid-fight). Does not heal.
  function continueBoss(specHp, carry) {
    const full = Math.max(1, specHp | 0);
    if (!carry || !(carry.hp > 0)) return { hp: full, maxHp: full, resumed: false };
    const maxHp = Math.max(1, Math.min(40, ((carry.maxHp > 0 ? carry.maxHp : full) | 0)));
    const hp = Math.max(1, Math.min(maxHp, carry.hp | 0));
    return { hp, maxHp, resumed: true };
  }

  function addXp(save, pts, opts) {
    const gate = !!(opts && opts.gate);
    if (typeof pts === "number" && Number.isFinite(pts) && pts > 0) {
      const add = Math.round(pts);
      if (add > 0) save.xp = Math.max(0, Math.round(save.xp || 0)) + add;
    } else if (!(save.xp > 0)) return [];
    const reached = [];
    let guard = 0;
    while (save.xp >= xpNeed(save.level) && guard++ < 80) {
      const need = xpNeed(save.level);
      if (!(need > 0)) break;
      const next = save.level + 1;
      if (gate && next % 5 === 0 && !save.bossesCleared[String(next)]) {
        save.bossGate = next;
        break;
      }
      save.xp -= need;
      save.level = next;
      reached.push(save.level);
      onMilestone(save, save.level, { queueBoss: !gate });
    }
    if (save.xp < 0) save.xp = 0;
    return reached;
  }

  function grantBossWin(save, level) {
    const n = level | 0;
    if (n <= 0 || n % 5 !== 0) return false;
    const key = String(n);
    const gated = (save.bossGate | 0) === n;
    if (!save.bossesCleared[key]) {
      save.bossesCleared[key] = true;
      save.stats.bosses = (save.stats.bosses || 0) + 1;
    }
    save.pendingBosses = (save.pendingBosses || []).filter((l) => String(l) !== key);
    const tier = n / 5;
    save.coins = (save.coins || 0) + 25 * tier;
    save.shopUnlocked = true;
    if (!gated) return true;
    const need = xpNeed(save.level);
    save.xp = Math.max(0, (save.xp || 0) - need);
    save.level = n;
    save.bossGate = 0;
    onMilestone(save, n, { queueBoss: false });
    addXp(save, 0, { gate: true });
    return true;
  }

  function stringCount(save) {
    const t = Math.min(5, Math.max(0, ((save && save.upgrades && save.upgrades.strings) || 0) | 0));
    return 3 + (t >= 2 ? 1 : 0) + (t >= 4 ? 1 : 0) + (t >= 5 ? 1 : 0);
  }
  function upgradeCost(tier) {
    const n = Math.max(1, tier | 0);
    return 150 * Math.pow(2, n - 1);
  }
  function buyUpgrade(save, track) {
    if (!save || !save.shopUnlocked) return { ok: false, reason: "locked" };
    if (track !== "bearing" && track !== "strings" && track !== "gold") return { ok: false, reason: "track" };
    if (!save.upgrades) save.upgrades = defaultUpgrades();
    const cur = save.upgrades[track] | 0;
    if (cur >= 5) return { ok: false, reason: "max" };
    const next = cur + 1;
    if ((save.level | 0) < 5 * next) return { ok: false, reason: "level" };
    const cost = upgradeCost(next);
    if ((save.coins || 0) < cost) return { ok: false, reason: "coins" };
    save.coins -= cost;
    save.upgrades[track] = next;
    return { ok: true, tier: next, cost: cost };
  }
  function buyLook(save, id) {
    if (!save || !save.shopUnlocked) return { ok: false, reason: "locked" };
    const c = COSMETICS.find((x) => x.id === id);
    if (!c) return { ok: false, reason: "missing" };
    if ((save.ownedCosmetics || []).includes(id)) return { ok: false, reason: "owned" };
    const cost = LOOK_PRICE[c.rarity] || 150;
    if ((save.coins || 0) < cost) return { ok: false, reason: "coins" };
    save.coins -= cost;
    save.ownedCosmetics.push(id);
    return { ok: true, cost: cost };
  }
  function buyBackdrop(save, id) {
    if (!save || !save.shopUnlocked) return { ok: false, reason: "locked" };
    const b = BACKDROPS.find((x) => x.id === id);
    if (!b) return { ok: false, reason: "missing" };
    if (!save.ownedBackdrops) save.ownedBackdrops = ["boardwalk"];
    if (save.ownedBackdrops.includes(id)) {
      save.backdrop = id;
      return { ok: true, cost: 0, equipped: true };
    }
    if ((save.coins || 0) < b.price) return { ok: false, reason: "coins" };
    save.coins -= b.price;
    save.ownedBackdrops.push(id);
    save.backdrop = id;
    return { ok: true, cost: b.price };
  }

  function defeatBoss(save, level) {
    const n = level | 0;
    if (n <= 0 || n % 5 !== 0) return false;
    const key = String(n);
    if (save.bossesCleared[key]) return false;
    save.bossesCleared[key] = true;
    save.pendingBosses = (save.pendingBosses || []).filter((l) => String(l) !== key);
    save.stats.bosses = (save.stats.bosses || 0) + 1;
    return true;
  }

  function touchStreak(save, now) {
    const today = localDay(now);
    const streak = save.streak || (save.streak = { count: 0, lastDay: "", best: 0 });
    if (streak.lastDay === today) return { changed: false, missed: false, count: streak.count, skew: false };
    if (streak.lastDay && streak.lastDay > today) return { changed: false, missed: false, count: streak.count, skew: true };
    const yesterday = prevDay(today);
    let missed = false;
    if (!streak.lastDay) streak.count = 1;
    else if (streak.lastDay === yesterday) streak.count = (streak.count || 0) + 1;
    else { missed = true; streak.count = 1; }
    streak.lastDay = today;
    streak.best = Math.max(streak.best || 0, streak.count);
    save.stats.bestStreak = Math.max(save.stats.bestStreak || 0, streak.best);
    return { changed: true, missed, count: streak.count, skew: false };
  }

  function ensureWeekly(save, now) {
    const key = isoWeekKey(now);
    const spec = weeklyFor(key);
    if (save.weekly && save.weekly.key === key && weeklyById(save.weekly.id)) return { rolled: false, key, spec: weeklyById(save.weekly.id) };
    const prev = save.weekly && save.weekly.key ? { key: save.weekly.key, id: save.weekly.id, progress: save.weekly.progress || 0, claimed: !!save.weekly.claimed } : null;
    save.weekly = { key, id: spec.id, progress: 0, goal: spec.goal, claimed: false, rewarded: false };
    return { rolled: true, key, prev, spec };
  }

  function bumpWeekly(save, stat, n) {
    if (!save.weekly || save.weekly.claimed || save.weekly.rewarded) return false;
    const spec = weeklyById(save.weekly.id);
    if (!spec || spec.stat !== stat) return false;
    const add = typeof n === "number" ? Math.round(n) : 1;
    if (!Number.isFinite(add) || add <= 0) return false;
    const goal = save.weekly.goal > 0 ? save.weekly.goal : spec.goal;
    save.weekly.progress = Math.min(goal, (save.weekly.progress || 0) + add);
    if (save.weekly.progress >= goal) {
      save.weekly.claimed = true;
      save.weekly.rewarded = true;
      save.coins += WEEKLY_COINS;
      save.stats.weeklies = (save.stats.weeklies || 0) + 1;
      return true;
    }
    return false;
  }

  function syncAchievements(save, now) {
    const fresh = [];
    const ts = (now instanceof Date ? now : new Date(now || Date.now())).toISOString();
    save.achievements = isObj(save.achievements) ? save.achievements : {};
    for (const a of ACHIEVEMENTS) {
      if (save.achievements[a.id]) continue;
      try {
        if (a.test(save)) { save.achievements[a.id] = ts; fresh.push(a.id); }
      } catch (e) { /* a bad save field should not throw */ }
    }
    return fresh;
  }
  function achievement(id) { return ACHIEVEMENTS.find((a) => a.id === id) || null; }

  function equipCosmetic(save, id) {
    if (!id) { save.cosmetic = ""; return true; }
    if (!COSMETIC_IDS.has(id) || !save.ownedCosmetics.includes(id)) return false;
    save.cosmetic = id;
    return true;
  }

  function parseBucket(raw, warnings, label) {
    if (raw == null || raw === "") return { ok: false, value: null };
    if (typeof raw !== "string") {
      if (isObj(raw)) return { ok: true, value: raw };
      warnings.push("corrupt-" + label);
      return { ok: false, value: null };
    }
    try {
      const v = JSON.parse(raw);
      if (!isObj(v)) { warnings.push("corrupt-" + label); return { ok: false, value: null }; }
      return { ok: true, value: v };
    } catch (e) {
      warnings.push("corrupt-" + label);
      return { ok: false, value: null };
    }
  }

  function sanitizeReveal(item) {
    if (!isObj(item)) return null;
    const level = asNum(item.level);
    if (level == null || level < 5 || level % 5 !== 0) return null;
    const kind = item.kind === "coins" ? "coins" : "cosmetic";
    const cosmeticId = kind === "cosmetic" && COSMETIC_IDS.has(item.cosmeticId) ? item.cosmeticId : "";
    if (kind === "cosmetic" && !cosmeticId) return null;
    const coins = kind === "coins" ? Math.max(0, Math.round(asNum(item.coins) || 0)) : 0;
    return { level: Math.floor(level), kind, cosmeticId, coins, rarity: typeof item.rarity === "string" ? item.rarity : "", seen: item.seen === true };
  }

  function sanitize(merged, fallback, opts) {
    const playable = (opts && opts.playable) || PLAYABLE;
    const themes = (opts && opts.themes) || THEMES;
    const fb = isObj(fallback) ? fallback : defaultSave();
    const save = defaultSave();
    const sel = typeof merged.selected === "string" && playable.includes(merged.selected) ? merged.selected
      : (typeof fb.selected === "string" && playable.includes(fb.selected) ? fb.selected : "pocket");
    save.selected = sel;
    save.best = Math.round(pickNum(merged.best, fb.best, 0, 1e12, 0));
    save.xp = Math.round(pickNum(merged.xp, fb.xp, 0, 1e12, 0));
    save.level = Math.max(1, Math.floor(pickNum(merged.level, fb.level, 1, 100000, 1)));
    save.coins = Math.round(pickNum(merged.coins, fb.coins, 0, 1e12, 0));
    save.plates = Math.floor(pickNum(merged.plates, fb.plates, 0, 1e12, 0));
    save.tricks = sanitizeTricks(isObj(merged.tricks) ? merged.tricks : fb.tricks);
    save.codes = sanitizeCodes(isObj(merged.codes) ? merged.codes : null, isObj(fb.codes) ? fb.codes : null);
    save.sound = boolish(merged.sound, fb.sound, true);
    save.haptics = boolish(merged.haptics, fb.haptics, true);
    save.tilt = boolish(merged.tilt, fb.tilt, true);
    save.carnival = boolish(merged.carnival, fb.carnival, true);
    save.shake = boolish(merged.shake, fb.shake, true);
    save.seenInfo = boolish(merged.seenInfo, fb.seenInfo, false);
    const theme = typeof merged.theme === "string" && themes.includes(merged.theme) ? merged.theme
      : (typeof fb.theme === "string" && themes.includes(fb.theme) ? fb.theme : "gold");
    save.theme = theme;
    save.seed = typeof merged.seed === "string" && merged.seed.length <= 64 ? merged.seed : (typeof fb.seed === "string" ? fb.seed : "");
    save.stats = sanitizeStats(merged.stats, fb.stats);
    const ownedSrc = Array.isArray(merged.ownedCosmetics) ? merged.ownedCosmetics : (Array.isArray(fb.ownedCosmetics) ? fb.ownedCosmetics : []);
    save.ownedCosmetics = [];
    for (const id of ownedSrc) if (COSMETIC_IDS.has(id) && !save.ownedCosmetics.includes(id)) save.ownedCosmetics.push(id);
    save.cosmetic = COSMETIC_IDS.has(merged.cosmetic) && save.ownedCosmetics.includes(merged.cosmetic) ? merged.cosmetic : "";
    save.claimedChests = {};
    const claimed = isObj(merged.claimedChests) ? merged.claimedChests : (isObj(fb.claimedChests) ? fb.claimedChests : {});
    for (const [k, v] of Object.entries(claimed)) {
      const n = Number(k);
      if (!Number.isFinite(n) || n < 5 || n % 5 !== 0 || !isObj(v)) continue;
      save.claimedChests[String(n)] = {
        kind: v.kind === "coins" ? "coins" : "cosmetic",
        cosmeticId: COSMETIC_IDS.has(v.cosmeticId) ? v.cosmeticId : "",
        coins: Math.max(0, Math.round(asNum(v.coins) || 0)),
        rarity: typeof v.rarity === "string" ? v.rarity : "",
      };
    }
    const queueSrc = Array.isArray(merged.revealQueue) ? merged.revealQueue : (Array.isArray(fb.revealQueue) ? fb.revealQueue : []);
    save.revealQueue = queueSrc.map(sanitizeReveal).filter(Boolean).slice(0, 40);
    save.bossesCleared = {};
    const cleared = isObj(merged.bossesCleared) ? merged.bossesCleared : (isObj(fb.bossesCleared) ? fb.bossesCleared : {});
    for (const [k, v] of Object.entries(cleared)) {
      const n = Number(k);
      if (v === true && n >= 5 && n % 5 === 0) save.bossesCleared[String(n)] = true;
    }
    const pendingSrc = Array.isArray(merged.pendingBosses) ? merged.pendingBosses : (Array.isArray(fb.pendingBosses) ? fb.pendingBosses : []);
    const pending = [];
    for (const n of pendingSrc) {
      const lv = n | 0;
      if (lv >= 5 && lv % 5 === 0 && !save.bossesCleared[String(lv)] && !pending.includes(lv)) pending.push(lv);
    }
    pending.sort((a, b) => a - b);
    save.pendingBosses = pending;
    save.achievements = {};
    const ach = isObj(merged.achievements) ? merged.achievements : (isObj(fb.achievements) ? fb.achievements : {});
    for (const a of ACHIEVEMENTS) {
      if (typeof ach[a.id] === "string" && ach[a.id].length <= 40) save.achievements[a.id] = ach[a.id];
    }
    const st = isObj(merged.streak) ? merged.streak : (isObj(fb.streak) ? fb.streak : {});
    const lastDay = typeof st.lastDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(st.lastDay) ? st.lastDay : "";
    save.streak = {
      count: Math.max(0, Math.floor(asNum(st.count) || 0)),
      lastDay,
      best: Math.max(0, Math.floor(asNum(st.best) || 0)),
    };
    save.stats.bestStreak = Math.max(save.stats.bestStreak, save.streak.best);
    const w = isObj(merged.weekly) ? merged.weekly : (isObj(fb.weekly) ? fb.weekly : {});
    if (w && typeof w.key === "string" && weeklyById(w.id)) {
      save.weekly = {
        key: w.key,
        id: w.id,
        progress: Math.max(0, Math.floor(asNum(w.progress) || 0)),
        goal: Math.max(1, Math.floor(asNum(w.goal) || weeklyById(w.id).goal)),
        claimed: w.claimed === true,
        rewarded: w.rewarded === true || w.claimed === true && w.rewarded !== false && w.claimed === true && (asNum(w.progress) || 0) >= (asNum(w.goal) || weeklyById(w.id).goal) && w.rewarded === true,
      };
      if (save.weekly.claimed && !save.weekly.rewarded) {
        /* Completed flag without the coin flag: the coins were not recorded. Leave rewarded false
           so a later bump does not pay twice if progress was already saved as claimed.
           If claimed is set, bumpWeekly will not pay again. Mark rewarded so a reload cannot pay late. */
        save.weekly.rewarded = true;
      }
    }
    save.milestonesInitialized = merged.milestonesInitialized === true || fb.milestonesInitialized === true;
    if (save.cosmetic && !save.ownedCosmetics.includes(save.cosmetic)) save.cosmetic = "";
    save.schemaVersion = 4;
    const up = isObj(merged.upgrades) ? merged.upgrades : (isObj(fb.upgrades) ? fb.upgrades : {});
    const tier = (v) => { const n = asNum(v); return n == null || n < 0 ? 0 : Math.min(5, Math.floor(n)); };
    save.upgrades = { bearing: tier(up.bearing), strings: tier(up.strings), gold: tier(up.gold) };
    const knownBacks = new Set(BACKDROPS.map((b) => b.id));
    const backSrc = Array.isArray(merged.ownedBackdrops) ? merged.ownedBackdrops : (Array.isArray(fb.ownedBackdrops) ? fb.ownedBackdrops : ["boardwalk"]);
    save.ownedBackdrops = [];
    for (const id of backSrc) if (knownBacks.has(id) && !save.ownedBackdrops.includes(id)) save.ownedBackdrops.push(id);
    if (!save.ownedBackdrops.includes("boardwalk")) save.ownedBackdrops.unshift("boardwalk");
    const bd = typeof merged.backdrop === "string" ? merged.backdrop : (typeof fb.backdrop === "string" ? fb.backdrop : "boardwalk");
    save.backdrop = save.ownedBackdrops.includes(bd) ? bd : "boardwalk";
    save.fishBest = Math.round(pickNum(merged.fishBest, fb.fishBest, 0, 1e12, 0));
    save.fishCaught = Math.floor(pickNum(merged.fishCaught, fb.fishCaught, 0, 1e12, 0));
    save.shopUnlocked = merged.shopUnlocked === true || fb.shopUnlocked === true;
    const gate = asNum(merged.bossGate);
    save.bossGate = gate != null && gate > save.level && gate % 5 === 0 ? Math.floor(gate) : 0;
    return save;
  }

  function loadFromBuckets(input, opts) {
    const warnings = [];
    const src = input || {};
    const storageOk = src.storageOk !== false;
    if (!storageOk) warnings.push("storage-unavailable");
    const now = opts && opts.now != null ? new Date(opts.now) : new Date();
    const parsedV2 = storageOk ? parseBucket(src.v2Raw, warnings, "v2") : { ok: false, value: null };
    const parsedV3 = storageOk ? parseBucket(src.v3Raw, warnings, "v3") : { ok: false, value: null };
    const v2 = parsedV2.ok ? parsedV2.value : {};
    const v3 = parsedV3.ok ? parsedV3.value : {};
    const fallback = Object.assign(defaultSave(), parsedV2.ok ? v2 : {});
    const merged = Object.assign(defaultSave(), parsedV2.ok ? v2 : {}, parsedV3.ok ? v3 : {});
    const save = sanitize(merged, fallback, opts || {});
    let dirty = false;
    const incomingSchema = parsedV3.ok ? (asNum(v3.schemaVersion) || 0) : 0;
    if (incomingSchema < 4) {
      for (let lv = 5; lv <= save.level; lv += 5) save.bossesCleared[String(lv)] = true;
      const cap = Math.max(0, xpNeed(save.level) - 1);
      if (save.xp > cap) save.xp = cap;
      save.bossGate = 0;
      save.schemaVersion = 4;
      dirty = true;
    }
    const hadSeed = (parsedV2.ok && typeof v2.seed === "string" && v2.seed) || (parsedV3.ok && typeof v3.seed === "string" && v3.seed);
    if (!hadSeed && opts && opts.seed) save.seed = opts.seed;
    if (!save.seed) {
      const rng = (opts && opts.rng) || Math.random;
      save.seed = Math.floor(rng() * 1e9).toString(36);
      dirty = true;
    }
    if (!save.milestonesInitialized) {
      for (let lv = 5; lv <= save.level; lv += 5) onMilestone(save, lv, { queueBoss: false });
      save.milestonesInitialized = true;
      dirty = true;
    }
    const week = ensureWeekly(save, now);
    if (week.rolled && save.level >= 1) dirty = true;
    const streak = touchStreak(save, now);
    if (streak.changed) dirty = true;
    const achievements = syncAchievements(save, now);
    if (achievements.length) dirty = true;
    return { save, warnings, persistent: storageOk, dirty, streak, week, achievements };
  }

  function resetProgress(save) {
    const next = defaultSave();
    next.sound = save.sound !== false;
    next.haptics = save.haptics !== false;
    next.tilt = !!save.tilt;
    next.carnival = save.carnival !== false;
    next.shake = save.shake !== false;
    next.theme = THEMES.includes(save.theme) ? save.theme : "gold";
    next.seenInfo = !!save.seenInfo;
    next.codes = sanitizeCodes(save.codes, null);
    next.seed = save.seed || next.seed || "fresh";
    next.milestonesInitialized = true;
    next.selected = "pocket";
    next.weekly = { key: "", id: "", progress: 0, goal: 0, claimed: false, rewarded: false };
    return next;
  }

  function summary(save) {
    const spec = weeklyById(save.weekly && save.weekly.id);
    return {
      level: save.level, xp: save.xp, need: xpNeed(save.level), coins: save.coins, best: save.best,
      owned: save.ownedCosmetics.slice(), cosmetic: save.cosmetic,
      streak: save.streak.count, streakBest: save.streak.best,
      weekly: Object.assign({}, save.weekly, { name: spec ? spec.name : "", desc: spec ? spec.desc : "" }),
      pendingBosses: save.pendingBosses.slice(),
      chests: Object.keys(save.claimedChests),
      achievements: Object.keys(save.achievements),
      reveal: save.revealQueue.length,
    };
  }

  return {
    COSMETICS, ACHIEVEMENTS, DUPLICATE_COINS, WEEKLY_COINS, PLAYABLE,
    xpNeed, motionFor, freshSave, defaultSave, loadFromBuckets, resetProgress, sanitize,
    addXp, onMilestone, rollChest, defeatBoss, grantBossWin, bossFor, continueBoss,
    stringCount, upgradeCost, buyUpgrade, buyLook, buyBackdrop,
    BACKDROPS, LOOK_PRICE, RARITY_RANK,
    touchStreak, localDay, prevDay, isoWeekKey, ensureWeekly, bumpWeekly, weeklyFor, weeklyById,
    registerWeekly, unregisterWeekly, weekCount,
    syncAchievements, achievement, equipCosmetic, cosmetic, visualModel,
    gradeHit, gradeReach, gradeWord, comboMultiplier, comboCallout, trickPoints, summary, hashStr,
  };
});
