"use strict";
/* Carnival saucers: 4 rows (far to near) by 3 columns. Movement and reach only. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.YoSaucers = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const ROWS = 4;
  const COLS = 3;
  // Top of the screen is far (end of the string). Bottom is near the hand.
  const ROW_FRAC = [0.90, 0.68, 0.46, 0.24];
  const ROW_HALF = 0.08;
  const MOTIONS = ["drift", "patrol", "bob"];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function oldReachFraction(string) {
    const s = string > 0 ? string : 1;
    return clamp(0.8 * s, 0.55, 0.93);
  }
  function reachFraction(string) {
    const s = string > 0 ? string : 1;
    return clamp(0.92 * s, 0.78, 0.98);
  }

  function cells() {
    const out = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) out.push({ row: row, col: col, slot: row * COLS + col });
    }
    const boss = out.findIndex((c) => c.row === 0 && c.col === 1);
    out.push(out.splice(boss, 1)[0]);
    return out;
  }

  function speedFor(level, slot) {
    const lv = Math.max(1, level | 0);
    const base = 0.62 + Math.min(0.7, (lv - 1) * 0.045);
    const vary = [0.78, 1, 1.18, 0.9][Math.abs(slot | 0) % 4];
    return base * vary;
  }

  function motionFor(row, col) { return MOTIONS[(row * 2 + col) % MOTIONS.length]; }

  function columnCenters(width, radius) {
    const pad = Math.max(16, radius) + 8;
    const left = pad;
    const right = Math.max(left + COLS, width - pad);
    const cellW = (right - left) / COLS;
    const centers = [];
    for (let col = 0; col < COLS; col++) centers.push(left + (col + 0.5) * cellW);
    return { centers: centers, left: left, right: right, cellW: cellW };
  }

  function plateRadius(width, specRadius) {
    const cell = Math.max(48, (Math.max(1, width) - 28) / COLS);
    const fit = Math.min(18, cell * 0.12);
    const specR = specRadius > 0 ? specRadius : fit;
    return Math.max(12, Math.min(specR, fit));
  }

  function rowWorldY(handBaseY, Lmax, row) {
    return handBaseY + ROW_FRAC[row] * Lmax;
  }

  function pose(cell, t, level, layout) {
    const speed = speedFor(level, cell.slot);
    const motion = cell.motion || motionFor(cell.row, cell.col);
    const uAmp = layout.cellW * 0.30;
    const phase = cell.phase != null ? cell.phase : cell.slot * 0.9;
    let du = 0;
    let dFrac = 0;
    if (motion === "patrol") {
      const cycle = Math.max(0.9, 2.6 / speed);
      const ph = ((t * speed + phase) % cycle) / cycle;
      du = (ph < 0.5 ? ph * 4 - 1 : 3 - ph * 4) * uAmp;
    } else if (motion === "bob") {
      du = Math.sin(t * speed * 0.85 + phase) * uAmp * 0.55;
      dFrac = Math.sin(t * speed * 1.15 + phase) * 0.03;
    } else {
      du = Math.sin(t * speed + phase) * uAmp;
      dFrac = Math.cos(t * speed * 0.65 + phase) * 0.028;
    }
    const frac = clamp(ROW_FRAC[cell.row] + dFrac, 0.16, 0.94);
    const u = clamp(layout.centers[cell.col] + du, layout.left, layout.right);
    return { u: u, frac: frac, worldY: layout.handBaseY + frac * layout.Lmax, moving: true, speed: speed, motion: motion };
  }

  function hitReach(Lmax, radius, yoR) {
    return {
      vertical: Math.max(12, Lmax * ROW_HALF),
      horizontal: radius + yoR * 1.36,
    };
  }

  function covers(handBaseY, Lmax, Lmin, yoR) {
    const far = handBaseY + Lmax;
    const near = handBaseY + Math.max(0, Lmin);
    const pad = hitReach(Lmax, 0, yoR).vertical;
    return ROW_FRAC.map(function (frac) {
      const y = handBaseY + frac * Lmax;
      return y <= far && y >= near && (y - pad) <= far && (y + pad) >= near;
    });
  }

  function openRows(level) {
    const lv = Math.max(1, level | 0);
    if (lv >= 6) return 4;
    if (lv >= 4) return 3;
    if (lv >= 2) return 2;
    return 1;
  }
  function openCells(level) {
    const n = openRows(level);
    return cells().filter(function (c) { return c.row < n; });
  }
  // Straight hang is the far ring only. A whip climbs toward the near ring.
  function ringForAngle(absTheta) {
    const a = Math.abs(absTheta) || 0;
    if (a >= 1.15) return 3;
    if (a >= 0.82) return 2;
    if (a >= 0.56) return 1;
    return 0;
  }
  function screenRadius(w, h, row) {
    const near = Math.max(18, Math.min(28, Math.min(Math.max(1, w), Math.max(1, h)) * 0.064));
    const scale = [0.62, 0.76, 0.88, 1][clamp(row | 0, 0, 3)];
    return near * scale;
  }
  // Even columns. The far middle saucer sits just off a straight hang so a drop down the centre misses.
  const COL_REST = [0.18, 0.50, 0.82];
  const COL_AMP = [0.012, 0.01, 0.012];
  function playBand(h) {
    const top = Math.max(132, h * 0.2);
    const bot = h - Math.max(230, h * 0.32);
    return { top: top, bot: Math.max(top + 120, bot) };
  }
  function screenSlot(row, col, w, h, t, level, phase) {
    const band = playBand(h);
    const yFrac = [0.08, 0.36, 0.62, 0.9][clamp(row | 0, 0, 3)];
    const c = clamp(col | 0, 0, 2);
    const y0 = band.top + (band.bot - band.top) * yFrac;
    const hangBias = (row | 0) === 0 && c === 1 ? 0.1 : 0;
    const x0 = w * (COL_REST[c] + hangBias);
    const speed = speedFor(level, (row | 0) * 3 + c);
    const motion = motionFor(row | 0, c);
    const amp = Math.min(18, w * COL_AMP[c]);
    const ph = phase || 0;
    let x = x0;
    let y = y0;
    if (motion === "patrol") {
      const cyc = Math.max(1.15, 2.5 / speed);
      const p = ((t * speed + ph) % cyc) / cyc;
      x += (p < 0.5 ? p * 4 - 1 : 3 - p * 4) * amp;
    } else if (motion === "bob") {
      y += Math.sin(t * speed * 1.2 + ph) * Math.min(20, (band.bot - band.top) * 0.04);
      x += Math.sin(t * speed * 0.75 + ph) * amp * 0.7;
    } else {
      x += Math.sin(t * speed + ph) * amp;
      y += Math.cos(t * speed * 0.72 + ph) * Math.min(14, (band.bot - band.top) * 0.028);
    }
    const r = screenRadius(w, h, row);
    x = clamp(x, r + 4, w - r - 4);
    y = clamp(y, band.top, band.bot);
    return { x: x, y: y, r: r, x0: x0, y0: y0, amp: amp };
  }
  function hitSlop(w, r) {
    const gap = Math.abs(0.66 - 0.04 - 0.5) * w;
    return Math.max(12, Math.min(r, gap * 0.72));
  }

  return {
    ROWS: ROWS, COLS: COLS, ROW_FRAC: ROW_FRAC, ROW_HALF: ROW_HALF,
    cells: cells, speedFor: speedFor, motionFor: motionFor, columnCenters: columnCenters,
    plateRadius: plateRadius, rowWorldY: rowWorldY, pose: pose, hitReach: hitReach, covers: covers,
    oldReachFraction: oldReachFraction, reachFraction: reachFraction,
    openRows: openRows, openCells: openCells, ringForAngle: ringForAngle,
    screenRadius: screenRadius, screenSlot: screenSlot, playBand: playBand, hitSlop: hitSlop,
    COL_REST: COL_REST,
  };
});
