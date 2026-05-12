/**
 * tree-render.js — Habitly Canvas daraxt rendereri
 * Versiya: 2.0
 * Bog'liqlik: tree.js yuklangan bo'lishi shart
 */
const TreeRenderer = (() => {

  /* ── Rang palitralari ── */
  const PAL = {
    light: {
      sky:'#EAF3DE', ground:'#C0DD97', groundEdge:'#3B6D11',
      trunk:'#854F0B', trunkShadow:'#633806',
      leaf:'#3B6D11', leafMid:'#639922', leafPale:'#97C459',
      leafDead:'#BA7517', leafDead2:'#EF9F27',
      fruit:'#D85A30', fruitDark:'#993C1D', fruitShine:'#F0997B',
      seedShell:'#EF9F27', seed:'#854F0B',
      text:'#27500A', textMuted:'#639922',
    },
    dark: {
      sky:'#0a1a05', ground:'#173404', groundEdge:'#27500A',
      trunk:'#633806', trunkShadow:'#412402',
      leaf:'#27500A', leafMid:'#3B6D11', leafPale:'#639922',
      leafDead:'#854F0B', leafDead2:'#633806',
      fruit:'#993C1D', fruitDark:'#712B13', fruitShine:'#D85A30',
      seedShell:'#854F0B', seed:'#412402',
      text:'#C0DD97', textMuted:'#639922',
    },
  };

  /* ── Seed-based random (har chizishda bir xil pattern) ── */
  function makeRand(seed) {
    let s = seed >>> 0;
    return () => {
      s = Math.imul(s ^ (s >>> 15), s | 1);
      s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
      return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ── Rang aralashtiruvi ── */
  function hexToRgb(h) {
    return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  }
  function mix(a, b, t) {
    const [r1,g1,b1] = hexToRgb(a), [r2,g2,b2] = hexToRgb(b);
    const r = v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2,'0');
    return '#' + r(r1+(r2-r1)*t) + r(g1+(g2-g1)*t) + r(b1+(b2-b1)*t);
  }

  /* ── Easing ── */
  function easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

  /* ── State lerp ── */
  function lerpState(a, b, t) {
    const e = easeInOut(t);
    return {
      ...b,
      growth:     a.growth     + (b.growth     - a.growth)     * e,
      leafCount:  Math.round(a.leafCount  + (b.leafCount  - a.leafCount)  * e),
      leafHealth: a.leafHealth + (b.leafHealth - a.leafHealth) * e,
      fruitCount: Math.round(a.fruitCount + (b.fruitCount - a.fruitCount) * e),
      trunkH:     a.trunkH     + (b.trunkH     - a.trunkH)     * e,
      canopyR:    a.canopyR    + (b.canopyR    - a.canopyR)    * e,
    };
  }

  /* ── init ── */
  function init(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) { console.warn('TreeRenderer: canvas topilmadi:', canvasId); return null; }
    const ctx = canvas.getContext('2d');

    let cssW = 0, cssH = 0;
    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr  = window.devicePixelRatio || 1;
      cssW = rect.width; cssH = rect.height;
      canvas.width  = cssW * dpr;
      canvas.height = cssH * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (canvas._lastState) drawFrame(canvas._lastState);
    }
    new ResizeObserver(resize).observe(canvas);
    resize();

    /* Animatsiya state */
    let fromState  = null;
    let toState    = null;
    let animT      = 1;
    let rafId      = null;

    function drawFrame(state) {
      draw(ctx, cssW, cssH, state);
    }

    function render(state) {
      cancelAnimationFrame(rafId);

      if (!fromState) {
        fromState = { ...state };
        toState   = { ...state };
        animT = 1;
        canvas._lastState = state;
        drawFrame(state);
        return;
      }

      fromState = lerpState(fromState, toState, animT);
      toState   = { ...state };
      animT = 0;
      canvas._lastState = state;

      function tick() {
        animT = Math.min(1, animT + 0.022);
        drawFrame(lerpState(fromState, toState, animT));
        if (animT < 1) rafId = requestAnimationFrame(tick);
        else fromState = { ...toState };
      }
      rafId = requestAnimationFrame(tick);
    }

    /* Dark mode o'zgarganda qayta chiz */
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => { if (canvas._lastState) drawFrame(canvas._lastState); });

    return { render };
  }

  /* ══════════════════════════════════════════
     Asosiy chizish funksiyasi
  ══════════════════════════════════════════ */
  function draw(ctx, W, H, state) {
    const isDark = document.body.classList.contains('dark') ||
                   window.matchMedia('(prefers-color-scheme: dark)').matches;
    const P = isDark ? PAL.dark : PAL.light;

    ctx.clearRect(0, 0, W, H);

    /* --- FON --- */
    ctx.fillStyle = P.sky;
    ctx.fillRect(0, 0, W, H);

    const groundY = H * 0.80;

    /* --- YER --- */
    ctx.fillStyle = P.ground;
    ctx.beginPath();
    ctx.ellipse(W/2, groundY + 8, W * 0.44, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = P.groundEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(W/2, groundY, W * 0.42, 10, 0, 0, Math.PI);
    ctx.stroke();

    const { growth, leafCount, leafHealth, fruitCount, trunkH, canopyR, stageIdx } = state;

    /* --- URUG' (stageIdx=0 va growth kichik) --- */
    if (stageIdx === 0 && growth < 0.08) {
      drawSeed(ctx, W, groundY, P);
      drawLabel(ctx, W, H, state, P);
      return;
    }

    /* --- TANA + SHOXLAR --- */
    const trunkTopY = drawTrunk(ctx, W, H, groundY, trunkH, growth, P);

    /* --- YAPROQLAR --- */
    if (canopyR > 0.01) {
      const cx = W / 2;
      const R  = W * canopyR;
      const cy = trunkTopY - R * 0.50;
      drawCanopy(ctx, cx, cy, R, leafCount, leafHealth, P);

      /* --- MEVALAR --- */
      if (fruitCount > 0) {
        drawFruits(ctx, cx, cy, R, fruitCount, P);
      }
    }

    drawLabel(ctx, W, H, state, P);
  }

  /* ── Urug' ── */
  function drawSeed(ctx, W, groundY, P) {
    const cx = W/2, cy = groundY - 5;
    ctx.fillStyle = P.seedShell;
    ctx.beginPath(); ctx.ellipse(cx, cy, 8, 6, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = P.seed;
    ctx.beginPath(); ctx.ellipse(cx, cy, 5, 4, 0, 0, Math.PI*2); ctx.fill();
  }

  /* ── Tana — qaytadi: trunkTopY ── */
  function drawTrunk(ctx, W, H, groundY, trunkH, growth, P) {
    const cx       = W / 2;
    const trunkLen = H * trunkH * growth;
    const trunkTop = groundY - trunkLen;
    const baseW    = Math.max(4, 13 * growth);
    const topW     = Math.max(2, baseW * 0.40);

    /* asosiy tana shakli */
    ctx.fillStyle = P.trunk;
    ctx.beginPath();
    ctx.moveTo(cx - baseW, groundY);
    ctx.bezierCurveTo(
      cx - baseW * 0.9, groundY - trunkLen * 0.45,
      cx - topW  * 1.1, trunkTop  + trunkLen * 0.08,
      cx - topW, trunkTop
    );
    ctx.lineTo(cx + topW, trunkTop);
    ctx.bezierCurveTo(
      cx + topW  * 1.1, trunkTop  + trunkLen * 0.08,
      cx + baseW * 0.9, groundY - trunkLen * 0.45,
      cx + baseW, groundY
    );
    ctx.closePath();
    ctx.fill();

    /* soya chizig'i */
    ctx.strokeStyle = P.trunkShadow;
    ctx.lineWidth = Math.max(1, topW * 0.8);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + topW*0.3, groundY);
    ctx.bezierCurveTo(cx + topW*0.4, groundY - trunkLen*0.5, cx, trunkTop + trunkLen*0.1, cx - topW*0.2, trunkTop);
    ctx.stroke();

    /* shoxlar (2-bosqichdan) */
    if (trunkH > 0.30 && growth > 0.35) {
      const bLen = baseW * 3.5 * growth;
      _branch(ctx, cx, trunkTop + trunkLen*0.08, -1, bLen, baseW, P);
      _branch(ctx, cx, trunkTop + trunkLen*0.14, +1, bLen, baseW, P);
    }
    if (trunkH > 0.52 && growth > 0.55) {
      const bLen = baseW * 2.6 * growth;
      _branch(ctx, cx, trunkTop + trunkLen*0.20, -1, bLen, baseW, P);
      _branch(ctx, cx, trunkTop + trunkLen*0.26, +1, bLen, baseW, P);
    }

    return trunkTop;
  }

  function _branch(ctx, cx, y, dir, len, baseW, P) {
    const ex = cx + dir * len;
    const ey = y  - len * 0.52;
    ctx.strokeStyle = P.trunk;
    ctx.lineWidth = Math.max(1.5, baseW * 0.30);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.quadraticCurveTo(cx + dir * len * 0.45, y - len * 0.18, ex, ey);
    ctx.stroke();
  }

  /* ── Yaproq gumbazi ── */
  function drawCanopy(ctx, cx, cy, R, leafCount, leafHealth, P) {
    /* 3 qatlam gumbaz */
    const layers = [
      { rx: R,        ry: R*0.76, dy: 0,       a: 0.92 },
      { rx: R*0.80,   ry: R*0.66, dy:-R*0.10,  a: 0.85 },
      { rx: R*0.58,   ry: R*0.50, dy:-R*0.22,  a: 0.78 },
    ];
    const deadMix = 1 - leafHealth;
    layers.forEach((l, i) => {
      const baseCol = [P.leaf, P.leafMid, P.leafPale][i];
      ctx.globalAlpha = l.a;
      ctx.fillStyle = mix(baseCol, P.leafDead, deadMix * 0.6);
      ctx.beginPath();
      ctx.ellipse(cx, cy + l.dy, l.rx, l.ry, 0, 0, Math.PI*2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    /* individual barglar */
    const rand = makeRand(99);
    for (let i = 0; i < leafCount; i++) {
      const angle = rand() * Math.PI * 2;
      const dist  = rand() * R * 0.82;
      const lx    = cx + Math.cos(angle) * dist;
      const ly    = cy - R*0.05 + Math.sin(angle) * dist * 0.68;
      const sz    = 5 + rand() * 8;
      const rot   = rand() * Math.PI * 2;

      const healthy = rand() > 0.35 ? P.leaf : P.leafMid;
      const dead    = rand() > 0.5  ? P.leafDead : P.leafDead2;
      const col     = mix(healthy, dead, 1 - leafHealth);

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.ellipse(0, 0, sz, sz * 0.48, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /* ── Mevalar ── */
  function drawFruits(ctx, cx, cy, R, fruitCount, P) {
    const rand = makeRand(55);
    const r    = Math.max(4, Math.min(9, 5 + R * 0.07));

    for (let i = 0; i < fruitCount; i++) {
      const angle = rand() * Math.PI * 2;
      const dist  = R * (0.28 + rand() * 0.52);
      const fx    = cx + Math.cos(angle) * dist;
      const fy    = cy - R*0.05 + Math.sin(angle) * dist * 0.68 + r * 0.5;

      /* asosiy doira */
      ctx.fillStyle = P.fruit;
      ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI*2); ctx.fill();

      /* qoraygan yon */
      ctx.fillStyle = P.fruitDark;
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.arc(fx + r*0.25, fy + r*0.2, r*0.65, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;

      /* porlama */
      ctx.fillStyle = P.fruitShine;
      ctx.beginPath(); ctx.arc(fx - r*0.28, fy - r*0.28, r*0.28, 0, Math.PI*2); ctx.fill();

      /* poya */
      ctx.strokeStyle = P.trunk;
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(fx, fy - r);
      ctx.quadraticCurveTo(fx + 2, fy - r - 5, fx + 1, fy - r - 7);
      ctx.stroke();
    }
  }

  /* ── Matn label ── */
  function drawLabel(ctx, W, H, state, P) {
    ctx.textAlign = 'center';
    ctx.font = '600 12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = P.text;
    ctx.fillText(state.stageName || '', W/2, H - 12);

    if (state.fruitCount > 0) {
      ctx.font = '400 10px system-ui, sans-serif';
      ctx.fillStyle = P.textMuted;
      ctx.fillText(state.fruitCount + ' ta meva', W/2, H - 2);
    }
  }

  return { init };
})();
