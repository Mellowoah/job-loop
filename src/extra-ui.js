"use strict";
/* Menu screens and the chest reveal. Scoring stays in the game. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.YoExtra = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function install(api) {
    const { $, store, S, toast, note, sfx, buzz, openSheet, drawYoyo3q, isPlaying, isReduced, setProgressHook } = api;
    const Y = globalThis.YoProgress;
    if (!Y) return;
    let previewId = "";
    let previewTouched = false;
    let revealTimer = 0;
    let rewardLock = false;

    function specOf(save) { return Y.weeklyById(save.weekly && save.weekly.id); }

    function renderCollection() {
      const grid = $("colGrid");
      if (!grid) return;
      const owned = new Set(store.d.ownedCosmetics || []);
      const equipped = store.d.cosmetic || "";
      if (!previewTouched) previewId = equipped || (store.d.ownedCosmetics && store.d.ownedCosmetics[0]) || (Y.COSMETICS[0] && Y.COSMETICS[0].id);
      grid.innerHTML = Y.COSMETICS.map((c) => {
        const have = owned.has(c.id);
        const on = equipped === c.id;
        return `<button type="button" class="colcard" data-id="${c.id}" aria-pressed="${on ? "true" : "false"}"${have ? "" : " disabled"}>` +
          `<span class="rarity ${c.rarity}">${c.rarity}</span>` +
          `<span class="cname">${have ? c.name : "???"}</span>` +
          `<span class="csub">${on ? "In play" : have ? "Tap to wear" : "In a chest"}</span></button>`;
      }).join("");
      const count = $("colOwned");
      if (count) count.textContent = owned.size + " / " + Y.COSMETICS.length;
      drawPreview();
    }

    function drawPreview() {
      const cv = $("colPreview");
      const blurb = $("colBlurb");
      if (!cv || !previewId) return;
      const c = Y.cosmetic(previewId);
      if (!c) return;
      const have = (store.d.ownedCosmetics || []).includes(c.id);
      if (blurb) blurb.textContent = have ? c.blurb : "Still in the booth. Level chests hand these out. Looks never change the throw.";
      const px = cv.width, g = cv.getContext("2d");
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, px, cv.height);
      if (!have) {
        g.fillStyle = "rgba(255,255,255,.35)";
        g.font = "700 14px Outfit, sans-serif";
        g.textAlign = "center";
        g.fillText("Locked", px / 2, cv.height / 2);
        return;
      }
      const model = Y.visualModel({ id: "pocket", size: 1, look: {}, finish: "gloss", cap: "stripes", rimStyle: "single", trail: "" }, c.id);
      try { if (drawYoyo3q) drawYoyo3q(g, px * 0.42, cv.height * 0.52, px * 0.28, model, (S.time || 0) * 0.8, S.time || 0); } catch (e) {}
    }

    function renderAchievements() {
      const list = $("achList");
      if (!list) return;
      list.innerHTML = Y.ACHIEVEMENTS.map((a) => {
        const on = !!store.d.achievements[a.id];
        return `<li class="${on ? "got" : ""}"><b>${on ? a.name : a.name}</b><span>${a.desc}${on ? "" : ""}</span></li>`;
      }).join("");
      const n = Object.keys(store.d.achievements || {}).length;
      const t = $("achCount");
      if (t) t.textContent = n + " / " + Y.ACHIEVEMENTS.length;
    }

    function renderStats() {
      const list = $("statsList");
      if (!list) return;
      const d = store.d, s = d.stats || {};
      const rows = [
        ["Level", d.level],
        ["XP", Math.round(d.xp) + " / " + Y.xpNeed(d.level)],
        ["Best", Math.round(d.best)],
        ["Coins", Math.round(d.coins)],
        ["Streak", (d.streak && d.streak.count) || 0],
        ["Best streak", (d.streak && d.streak.best) || 0],
        ["Throws", s.throws || 0],
        ["Plates", s.plates || d.plates || 0],
        ["Perfect / Great / Good", (s.perfects || 0) + " / " + (s.greats || 0) + " / " + (s.goods || 0)],
        ["Best plate chain", s.bestChain || 0],
        ["Bosses", s.bosses || 0],
        ["Chests", s.chests || 0],
        ["Weeks cleared", s.weeklies || 0],
        ["Looks", (d.ownedCosmetics || []).length + " / 11"],
        ["Runs", s.runs || 0],
        ["Lines", s.lines || 0],
        ["Ring hits", (s.hitsByRing || [0, 0, 0, 0]).join(" · ")],
        ["Lake best", d.fishBest || 0],
        ["Play time", fmtTime(s.playSeconds || 0)],
      ];
      list.innerHTML = rows.map(([k, v]) => `<div class="statrow"><span>${k}</span><b class="tabular">${v}</b></div>`).join("");
    }

    function fmtTime(sec) {
      const s = Math.floor(sec);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      if (h > 0) return h + "h " + (m % 60) + "m";
      return m + "m " + (s % 60) + "s";
    }

    function renderWeek() {
      const body = $("weekBody");
      if (!body) return;
      const spec = specOf(store.d);
      const w = store.d.weekly || {};
      if (!spec) { body.textContent = "This week's challenge will show up when the date is available."; return; }
      const done = !!w.rewarded || !!w.claimed;
      body.innerHTML = `<p class="weeklead">${spec.desc}</p>` +
        `<p class="weekmeta tabular">${Math.min(w.progress || 0, w.goal || spec.goal)} / ${w.goal || spec.goal}${done ? " · cleared" : ""}</p>` +
        `<p class="weeknote">Chosen on this device from the date. The same goal lasts the week, then a new one starts. Missing a week does not take coins, XP, or yo-yos. Clearing it pays ${Y.WEEKLY_COINS} coins. There is no online board.</p>`;
    }

    function drawRewardArt(item) {
      const cv = $("rewardCanvas");
      if (!cv || !item) return;
      const g = cv.getContext("2d");
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cv.width, cv.height);
      if (item.kind !== "cosmetic") {
        g.fillStyle = "#ffe7a8";
        g.font = "700 42px \"Lilita One\", Outfit, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("+" + (item.coins || Y.DUPLICATE_COINS), cv.width / 2, cv.height / 2);
        return;
      }
      const model = Y.visualModel({ id: "pocket", size: 1, look: {}, finish: "gloss", cap: "stripes", rimStyle: "single" }, item.cosmeticId);
      try { if (drawYoyo3q && model) drawYoyo3q(g, cv.width * 0.42, cv.height * 0.56, Math.min(cv.width, cv.height) * 0.3, model, (S.time || 0) * 0.9, S.time || 0); } catch (e) {}
    }

    function currentReveal() { return (store.d.revealQueue && store.d.revealQueue[0]) || null; }

    function openReveal() {
      const item = currentReveal();
      const rootEl = $("reward");
      const card = $("rewardCard");
      if (!item || !rootEl || !card) return;
      const reduced = isReduced();
      const c = item.kind === "cosmetic" ? Y.cosmetic(item.cosmeticId) : null;
      $("rewardKicker").textContent = "Level " + item.level;
      $("rewardRarity").textContent = c ? c.rarity : "Duplicate";
      $("rewardRarity").className = "reward-rarity rarity " + (c ? c.rarity : "common");
      $("rewardName").textContent = c ? c.name : "+" + (item.coins || Y.DUPLICATE_COINS) + " coins";
      $("rewardBlurb").textContent = c ? c.blurb + " Wear it from the collection. The throw stays the yo-yo you picked." : "You already own every look. The booth paid coins instead. Your score was not changed.";
      rootEl.hidden = false;
      const chest = $("chestBtn");
      if (chest) chest.hidden = true;
      const btn = $("rewardOk");
      const more = store.d.revealQueue.length > 1;
      if (reduced) {
        card.dataset.stage = "4";
        if (btn) btn.textContent = more ? "Next" : "Nice";
        try { sfx.unlock(); sfx.fanfare(); } catch (e) {}
        return;
      }
      card.dataset.stage = "0";
      if (btn) { btn.textContent = "Skip"; btn.hidden = true; }
      let i = 0;
      clearTimeout(revealTimer);
      const stages = ["0", "1", "2", "3", "4"];
      const step = () => {
        if (rootEl.hidden) return;
        card.dataset.stage = stages[i];
        if (i === 2) { try { sfx.coin(); } catch (e) {} }
        if (i === 4) {
          if (btn) { btn.hidden = false; btn.textContent = more ? "Next" : "Wear it"; }
          try { sfx.fanfare(); buzz([12, 30, 18]); } catch (e) {}
          return;
        }
        i += 1;
        revealTimer = setTimeout(step, 120);
      };
      setTimeout(() => { if (btn && !rootEl.hidden) btn.hidden = false; }, 400);
      step();
    }

    function dismissReveal() {
      clearTimeout(revealTimer);
      if (store.d.revealQueue && store.d.revealQueue.length) store.d.revealQueue.shift();
      store.save();
      if (store.d.revealQueue && store.d.revealQueue.length) openReveal();
      else {
        const rootEl = $("reward");
        if (rootEl) rootEl.hidden = true;
        api.renderProgress(false);
      }
    }

    function onRewardClick() {
      if (rewardLock) return;
      const card = $("rewardCard");
      const reduced = isReduced();
      if (!reduced && card && card.dataset.stage !== "4") {
        clearTimeout(revealTimer);
        card.dataset.stage = "4";
        const more = store.d.revealQueue.length > 1;
        $("rewardOk").textContent = more ? "Next" : "Nice";
        try { sfx.fanfare(); } catch (e) {}
        return;
      }
      rewardLock = true;
      dismissReveal();
      setTimeout(() => { rewardLock = false; }, 220);
    }

    function bootCopy() {
      const info = store.streakInfo;
      if (!info) return;
      if (info.changed && info.count > 1 && !info.missed) note("Day " + info.count + " streak.");
      else if (info.missed) note("Welcome back.");
    }

    function progressHook(info) {
      api.renderProgress(false);
      renderCollection();
      if (info && info.boot && !isPlaying() && currentReveal()) setTimeout(openReveal, 450);
    }

    setProgressHook(progressHook);

    const colBtn = $("colBtn");
    const achBtn = $("achBtn");
    const statsBtn = $("statsBtn");
    const weeklyBtn = $("weeklyBtn");
    if (colBtn) colBtn.onclick = () => { renderCollection(); openSheet("colSheet"); };
    if (achBtn) achBtn.onclick = () => { renderAchievements(); openSheet("achSheet"); };
    if (statsBtn) statsBtn.onclick = () => { renderStats(); openSheet("statsSheet"); };
    if (weeklyBtn) weeklyBtn.onclick = () => { renderWeek(); openSheet("weekSheet"); };
    const grid = $("colGrid");
    if (grid) grid.addEventListener("click", (e) => {
      const btn = e.target.closest(".colcard");
      if (!btn || btn.disabled) return;
      previewTouched = true;
      previewId = btn.dataset.id;
      const have = (store.d.ownedCosmetics || []).includes(previewId);
      if (have) {
        Y.equipCosmetic(store.d, store.d.cosmetic === previewId ? "" : previewId);
        store.save();
        api.renderProgress(false);
        try { sfx.unlock(); sfx.tug(); buzz(8); } catch (err) {}
      }
      renderCollection();
    });
    const clearBtn = $("colClear");
    if (clearBtn) clearBtn.onclick = () => {
      Y.equipCosmetic(store.d, "");
      store.save();
      api.renderProgress(false);
      renderCollection();
    };
    const rewardOk = $("rewardOk");
    if (rewardOk) rewardOk.onclick = onRewardClick;
    const chestBtn = $("chestBtn");
    if (chestBtn) chestBtn.onclick = (e) => { e.currentTarget.blur(); openReveal(); };

    globalThis.__yoRewardOpen = () => {
      const el = $("reward");
      return !!(el && !el.hidden);
    };
    globalThis.__yoRewardFrame = () => { if (globalThis.__yoRewardOpen()) drawRewardArt(currentReveal()); };
    globalThis.__yoCollectionFrame = () => {
      const sheet = $("colSheet");
      if (sheet && sheet.classList.contains("on")) drawPreview();
    };
    globalThis.__yoOpenReveal = openReveal;

    renderCollection();
    renderAchievements();
    renderStats();
    renderWeek();
    bootCopy();
    api.renderProgress(false);
    if (!isPlaying() && currentReveal()) setTimeout(openReveal, 450);
  }

  return { install };
});
