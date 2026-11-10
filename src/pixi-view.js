"use strict";
/* PixiJS v8 view. Visual only. The sim, input, and save stay in the page. */
(function (global) {
  const PIXI = global.PIXI;
  if (!PIXI) return;
  const NAMES = ["plate-far.png", "plate-teal.png", "plate-candy.png", "plate-near.png"];
  let app = null;
  let ready = false;
  let draws = 0;
  let highEnd = false;
  let fpsWatch = [];
  const ropeN = 16;
  const ropePts = [];
  const ropePrev = [];
  let rope = null;
  let bg = null;
  let rails = null;
  let plates = null;
  let trapGfx = null;
  let yo = null;
  let hand = null;
  let yoGlow = null;
  let parts = null;
  let vignette = null;
  let fxLayer = null;
  const tex = {};
  const pool = [];
  const ambient = [];

  function boot(canvas) {
    app = new PIXI.Application();
    return app.init({
      canvas: canvas,
      width: Math.max(2, canvas.clientWidth || 390),
      height: Math.max(2, canvas.clientHeight || 844),
      antialias: true,
      background: 0x14122b,
      preference: "webgl",
      resolution: Math.min(global.devicePixelRatio || 1, 2),
      autoDensity: true,
      eventFeatures: { move: false, globalMove: false, click: false, wheel: false },
    }).then(function () {
      app.stage.eventMode = "none";
      app.stage.interactiveChildren = false;
      app.ticker.stop();
      const gl = app.renderer.gl;
      if (gl) {
        const wrap = function (name) {
          const orig = gl[name].bind(gl);
          gl[name] = function () { draws++; return orig.apply(gl, arguments); };
        };
        if (gl.drawElements) wrap("drawElements");
        if (gl.drawArrays) wrap("drawArrays");
      }
      return loadTextures().then(build);
    });
  }

  function loadTextures() {
    const names = NAMES.concat(["plate-gold.png", "yoyo.png", "string.png", "glow.png", "spark.png", "fish.png", "hand.png", "bg-carnival.png", "bg-lake.png", "shadow.png"]);
    return Promise.all(names.map(function (name) {
      return PIXI.Assets.load("art/png/" + name).then(function (t) { tex[name] = t; });
    }));
  }

  function build() {
    bg = new PIXI.Sprite(tex["bg-carnival.png"]);
    bg.eventMode = "none";
    app.stage.addChild(bg);
    rails = new PIXI.Graphics();
    rails.eventMode = "none";
    app.stage.addChild(rails);
    plates = new PIXI.Container();
    plates.eventMode = "none";
    app.stage.addChild(plates);
    trapGfx = new PIXI.Graphics();
    trapGfx.eventMode = "none";
    plates.addChild(trapGfx);
    for (let i = 0; i < ropeN; i++) {
      ropePts.push(new PIXI.Point(0, i * 8));
      ropePrev.push(new PIXI.Point(0, i * 8));
    }
    rope = new PIXI.MeshRope({ texture: tex["string.png"], points: ropePts, textureScale: 1 });
    rope.eventMode = "none";
    app.stage.addChild(rope);
    yoGlow = new PIXI.Sprite(tex["glow.png"]);
    yoGlow.anchor.set(0.5);
    yoGlow.blendMode = "add";
    yoGlow.eventMode = "none";
    app.stage.addChild(yoGlow);
    yo = new PIXI.Sprite(tex["yoyo.png"]);
    yo.anchor.set(0.5);
    yo.eventMode = "none";
    app.stage.addChild(yo);
    hand = new PIXI.Sprite(tex["hand.png"]);
    hand.anchor.set(0.5, 0.42);
    hand.eventMode = "none";
    app.stage.addChild(hand);
    parts = new PIXI.ParticleContainer({
      texture: tex["spark.png"],
      dynamicProperties: { position: true, rotation: false, color: true },
    });
    parts.eventMode = "none";
    app.stage.addChild(parts);
    for (let i = 0; i < 300; i++) {
      const p = new PIXI.Particle({ texture: tex["spark.png"], x: 0, y: 0, alpha: 0, scaleX: 0.25, scaleY: 0.25 });
      parts.addParticle(p);
      ambient.push({ p: p, x: Math.random(), y: Math.random(), s: 0.2 + Math.random() * 0.6, ph: Math.random() * 6 });
    }
    fxLayer = new PIXI.Container();
    fxLayer.eventMode = "none";
    app.stage.addChild(fxLayer);
    vignette = new PIXI.Graphics();
    vignette.eventMode = "none";
    app.stage.addChild(vignette);
    ready = true;
  }

  function resize(w, h) {
    if (!app) return;
    app.renderer.resize(Math.max(2, w | 0), Math.max(2, h | 0));
  }

  function considerBloom(fps) {
    fpsWatch.push(fps);
    if (fpsWatch.length < 8 || highEnd) return;
    const avg = fpsWatch.reduce(function (a, b) { return a + b; }, 0) / fpsWatch.length;
    const cores = navigator.hardwareConcurrency || 2;
    if (avg >= 55 && cores >= 8 && !global.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      highEnd = true;
      const blur = new PIXI.BlurFilter({ strength: 4, quality: 2 });
      blur.resolution = 0.5;
      fxLayer.filters = [blur];
    }
  }

  function stepRope(dt, ax, ay, bx, by, slack) {
    if (!ready) return;
    const g = slack ? 1400 : 420;
    ropePts[0].x = ax; ropePts[0].y = ay;
    ropePrev[0].x = ax; ropePrev[0].y = ay;
    ropePts[ropeN - 1].x = bx; ropePts[ropeN - 1].y = by;
    ropePrev[ropeN - 1].x = bx; ropePrev[ropeN - 1].y = by;
    const damp = 0.985;
    for (let i = 1; i < ropeN - 1; i++) {
      const x = ropePts[i].x, y = ropePts[i].y;
      ropePts[i].x += (x - ropePrev[i].x) * damp;
      ropePts[i].y += (y - ropePrev[i].y) * damp + g * dt * dt;
      ropePrev[i].x = x; ropePrev[i].y = y;
    }
    const rest = Math.hypot(bx - ax, by - ay) / (ropeN - 1);
    for (let n = 0; n < 4; n++) {
      ropePts[0].x = ax; ropePts[0].y = ay;
      ropePts[ropeN - 1].x = bx; ropePts[ropeN - 1].y = by;
      for (let i = 0; i < ropeN - 1; i++) {
        const dx = ropePts[i + 1].x - ropePts[i].x;
        const dy = ropePts[i + 1].y - ropePts[i].y;
        const d = Math.hypot(dx, dy) || 1;
        const diff = (d - rest) / d * 0.5;
        const ox = dx * diff, oy = dy * diff;
        if (i > 0) { ropePts[i].x += ox; ropePts[i].y += oy; }
        if (i + 1 < ropeN - 1) { ropePts[i + 1].x -= ox; ropePts[i + 1].y -= oy; }
      }
    }
  }

  function ensurePlate(i) {
    let slot = pool[i];
    if (slot) return slot;
    slot = {
      shadow: new PIXI.Sprite(tex["shadow.png"]),
      body: new PIXI.Sprite(tex["plate-far.png"]),
      glow: new PIXI.Sprite(tex["glow.png"]),
    };
    slot.shadow.anchor.set(0.5);
    slot.body.anchor.set(0.5);
    slot.glow.anchor.set(0.5);
    slot.glow.blendMode = "add";
    slot.shadow.eventMode = slot.body.eventMode = slot.glow.eventMode = "none";
    plates.addChild(slot.shadow, slot.body, slot.glow);
    pool[i] = slot;
    return slot;
  }

  function drawTraps(g, list, t) {
    g.clear();
    for (let i = 0; i < list.length; i++) {
      const src = list[i];
      if (!src.trap) continue;
      const x = src.x, y = src.y, r = src.r || 22;
      const kind = src.trap;
      if (kind === "skull") {
        g.circle(x, y, r * 0.92).fill({ color: 0xe8423f });
        g.circle(x, y - r * 0.06, r * 0.55).fill({ color: 0xfff4dc });
        g.circle(x - r * 0.2, y - r * 0.1, r * 0.12).fill({ color: 0x14122b });
        g.circle(x + r * 0.2, y - r * 0.1, r * 0.12).fill({ color: 0x14122b });
        g.poly([x, y + r * 0.02, x - r * 0.08, y + r * 0.16, x + r * 0.08, y + r * 0.16]).fill({ color: 0x14122b });
        g.rect(x - r * 0.28, y + r * 0.22, r * 0.56, r * 0.2).fill({ color: 0xfff4dc });
        g.rect(x - r * 0.04, y + r * 0.22, r * 0.08, r * 0.2).fill({ color: 0x14122b });
      } else if (kind === "boot") {
        g.poly([
          x - r * 0.15, y - r * 0.7, x + r * 0.2, y - r * 0.7, x + r * 0.28, y + r * 0.15,
          x + r * 0.7, y + r * 0.15, x + r * 0.7, y + r * 0.55, x - r * 0.35, y + r * 0.55,
          x - r * 0.35, y + r * 0.15, x - r * 0.15, y + r * 0.05,
        ]).fill({ color: 0x6b3a1f });
        g.rect(x - r * 0.15, y - r * 0.55, r * 0.35, r * 0.12).fill({ color: 0xc9842a });
      } else if (kind === "puffer") {
        for (let k = 0; k < 10; k++) {
          const a = k / 10 * Math.PI * 2;
          g.poly([
            x + Math.cos(a) * r * 0.35, y + Math.sin(a) * r * 0.35,
            x + Math.cos(a + 0.18) * r * 0.85, y + Math.sin(a + 0.18) * r * 0.85,
            x + Math.cos(a - 0.18) * r * 0.35, y + Math.sin(a - 0.18) * r * 0.35,
          ]).fill({ color: 0xd6e23a });
        }
        g.circle(x, y, r * 0.48).fill({ color: 0xd6e23a });
        g.circle(x - r * 0.12, y - r * 0.06, r * 0.07).fill({ color: 0x14122b });
        g.circle(x + r * 0.2, y + r * 0.08, r * 0.08).fill({ color: 0xe8423f });
      } else if (kind === "jelly") {
        g.ellipse(x, y - r * 0.05, r * 0.42, r * 0.28).fill({ color: 0xc9a6ff, alpha: 0.9 });
        g.moveTo(x, y + r * 0.1).quadraticCurveTo(x, y + r * 0.5, x - r * 0.05, y + r * 0.85).stroke({ width: Math.max(2, r * 0.08), color: 0x6c4ad4 });
        g.moveTo(x - r * 0.22, y + r * 0.1).quadraticCurveTo(x - r * 0.35, y + r * 0.45, x - r * 0.12, y + r * 0.8).stroke({ width: Math.max(2, r * 0.08), color: 0x6c4ad4 });
        g.moveTo(x + r * 0.22, y + r * 0.1).quadraticCurveTo(x + r * 0.35, y + r * 0.45, x + r * 0.12, y + r * 0.8).stroke({ width: Math.max(2, r * 0.08), color: 0x6c4ad4 });
      } else {
        g.circle(x, y + r * 0.12, r * 0.62).fill({ color: 0x1a1a1a });
        g.circle(x - r * 0.2, y - r * 0.02, r * 0.16).fill({ color: 0x3a3a3a });
        g.moveTo(x + r * 0.15, y - r * 0.4).quadraticCurveTo(x + r * 0.55, y - r * 0.75, x + r * 0.72, y - r * 0.98).stroke({ width: Math.max(2, r * 0.1), color: 0x6b3a1f });
        const flick = 0.85 + 0.2 * Math.sin(t * 16 + x);
        g.circle(x + r * 0.74, y - r * 1.02, r * 0.16 * flick).fill({ color: 0xffc94a });
        g.circle(x + r * 0.74, y - r * 1.02, r * 0.08).fill({ color: 0xe8423f });
      }
    }
  }

  function sync(snap) {
    if (!ready) return;
    draws = 0;
    const w = snap.w, h = snap.h;
    const fish = snap.fish;
    bg.texture = tex[fish ? "bg-lake.png" : "bg-carnival.png"];
    bg.width = w;
    bg.height = h;
    bg.visible = !!snap.venue;
    if (rails) {
      rails.clear();
      const shelves = snap.shelves || [];
      if (shelves.length && !snap.fish) {
        const yAwn = Math.max(108, shelves[0].y - shelves[0].r - 26);
        for (let i = 0; i < 14; i++) rails.rect((w / 14) * i, yAwn, w / 14 + 1, 16).fill({ color: i % 2 ? 0xe8423f : 0xfff4dc });
        rails.rect(0, yAwn + 16, w, 6).fill({ color: 0x6b3a1f });
        rails.rect(0, yAwn, 8, h * 0.55).fill({ color: 0x5a2418 });
        rails.rect(w - 8, yAwn, 8, h * 0.55).fill({ color: 0x5a2418 });
      }
      for (let s = 0; s < shelves.length; s++) {
        const shelf = shelves[s];
        if (snap.fish) rails.rect(12, shelf.y + shelf.r * 0.3, w - 24, 2).fill({ color: 0xb4e6dc, alpha: 0.35 });
        else {
          rails.rect(10, shelf.y + shelf.r * 0.32, w - 20, 12).fill({ color: 0x4a2414 });
          rails.rect(10, shelf.y + shelf.r * 0.32, w - 20, 3).fill({ color: 0xc9842a });
        }
      }
    }
    const list = snap.plates || [];
    for (let i = 0; i < list.length; i++) {
      const src = list[i];
      const slot = ensurePlate(i);
      const row = Math.max(0, Math.min(3, src.row | 0));
      const radius = src.r || 22;
      slot.body.texture = tex[src.fish ? "fish.png" : src.gold ? "plate-gold.png" : NAMES[row]];
      slot.body.position.set(src.x, src.y);
      slot.body.rotation = src.fish ? Math.sin((snap.t || 0) * 2 + src.x * 0.01) * 0.2 : (src.rot || 0);
      slot.body.width = src.fish ? radius * 2.6 : radius * 2;
      slot.body.height = src.fish ? radius * 1.35 : radius * 2;
      slot.body.alpha = 1;
      slot.body.tint = 0xffffff;
      const shadowA = 0.35 + row * 0.117;
      const shadowOff = 3 + row * (7 / 3);
      slot.shadow.position.set(src.x, src.y + shadowOff);
      slot.shadow.width = radius * 2.1;
      slot.shadow.height = radius * 1.1;
      slot.shadow.alpha = shadowA;
      const reach = !src.trap && snap.reachRing === row && snap.phase === "sleep";
      slot.glow.visible = reach || (!!src.gold && !src.trap);
      slot.glow.position.set(src.x, src.y);
      slot.glow.width = radius * 2.15;
      slot.glow.height = radius * 2.15;
      slot.glow.alpha = reach ? 0.45 : 0;
      slot.shadow.visible = true;
      slot.body.visible = !src.trap;
    }
    if (trapGfx) {
      plates.addChild(trapGfx);
      drawTraps(trapGfx, list, snap.t || 0);
    }
    for (let i = list.length; i < pool.length; i++) {
      pool[i].shadow.visible = pool[i].body.visible = pool[i].glow.visible = false;
    }
    rope.visible = !!snap.showString;
    rope.tint = snap.tangled ? 0xe8423f : 0xfff4dc;
    app.stage.sortableChildren = true;
    yo.visible = hand.visible = yoGlow.visible = !!snap.showYo;
    if (snap.showYo) {
      const held = snap.phase === "held";
      yo.zIndex = held ? 8 : 4;
      hand.zIndex = 6;
      rope.zIndex = 3;
      yoGlow.zIndex = 2;
      yo.position.set(snap.yo.x, snap.yo.y);
      yo.rotation = snap.spin * 0.15;
      const d = Math.max(28, snap.yoR || 36);
      yo.width = yo.height = d * 2;
      yoGlow.position.set(snap.yo.x, snap.yo.y);
      yoGlow.width = yoGlow.height = d * 5;
      yoGlow.alpha = 0.45 + Math.min(0.4, (snap.hot || 0) * 0.5);
      hand.position.set(snap.hand.x, snap.hand.y);
      hand.width = 150;
      hand.height = 168;
    }
    const t = snap.t || 0;
    for (let i = 0; i < ambient.length; i++) {
      const a = ambient[i];
      const on = i < (snap.venue ? 40 : 12);
      a.p.alpha = on ? 0.12 + 0.2 * (0.5 + 0.5 * Math.sin(t * 2 + a.ph)) : 0;
      a.p.x = (a.x * w + Math.sin(t + a.ph) * 8);
      a.p.y = h * 0.22 + (a.y * h * 0.45 + (t * 10 * a.s) % (h * 0.4));
      a.p.scaleX = a.p.scaleY = 0.18 + a.s * 0.2;
    }
    const simParts = snap.particles || [];
    vignette.clear();
    vignette.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0 });
    app.stage.position.set(snap.shakeX || 0, snap.shakeY || 0);
    app.render();
    snap._draws = draws;
    snap._simParts = simParts.length;
  }

  function stats() {
    return {
      ready: ready,
      drawCalls: draws,
      particles: ambient.length,
      highEnd: highEnd,
      engine: "pixi",
    };
  }

  global.YoPixi = {
    boot: boot,
    resize: resize,
    stepRope: stepRope,
    sync: sync,
    ready: function () { return ready; },
    stats: stats,
    noteFps: considerBloom,
  };
})(typeof window !== "undefined" ? window : globalThis);
