/* AutoPixel-ℵ — settings persisted in chrome.storage.local */
(() => {
  'use strict';
  const NS = (window.__APX = window.__APX || {});
  if (NS.store) return;

  const KEY = 'autoPixelX';

  const DEFAULTS = {
    lang: 'en',
    folded: false,
    pos: { x: 12, y: 12 },
    panelH: 0,             // px; 0 = full height. Only ever shrunk by the user

    gapCells: 10,
    pitch: 0,
    origin: null,          // { x, y } client coords of one known cell centre
    region: null,          // { c0, r0, c1, r1 } inclusive cell indices

    speed: 'fast',         // safe | fast | turbo | custom
    custom: { moveFrames: 1, holdFrames: 1, gapFrames: 1, clicks: 2 },
    source: 'overlay',     // overlay | current
    order: 'snake',        // snake | rows | cols | random
    delay: 0,              // ms between cells
    jitter: 0,             // % of delay
    limit: 0,              // max cells per run, 0 = all

    guard: true,           // pause when the user touches the map
    canvasGuard: true,     // only click cells that land on a drawing surface
    showGrid: true,
  };

  const num = (v, def, lo, hi) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    return Math.min(hi, Math.max(lo, n));
  };

  function normalize(raw) {
    const s = raw && typeof raw === 'object' ? raw : {};
    const c = s.custom && typeof s.custom === 'object' ? s.custom : {};
    const p = s.pos && typeof s.pos === 'object' ? s.pos : {};
    const o = s.origin && typeof s.origin === 'object' ? s.origin : null;
    const r = s.region && typeof s.region === 'object' ? s.region : null;

    return {
      lang: s.lang === 'ko' ? 'ko' : 'en',
      folded: Boolean(s.folded),
      pos: { x: num(p.x, DEFAULTS.pos.x, -4000, 8000), y: num(p.y, DEFAULTS.pos.y, -4000, 8000) },
      panelH: Math.round(num(s.panelH, 0, 0, 4000)),

      gapCells: Math.round(num(s.gapCells, DEFAULTS.gapCells, 1, 999)),
      pitch: num(s.pitch, 0, 0, 4096),
      origin: o && Number.isFinite(Number(o.x)) && Number.isFinite(Number(o.y))
        ? { x: Number(o.x), y: Number(o.y) } : null,
      region: r && ['c0', 'r0', 'c1', 'r1'].every((k) => Number.isFinite(Number(r[k])))
        ? { c0: Math.round(r.c0), r0: Math.round(r.r0), c1: Math.round(r.c1), r1: Math.round(r.r1) } : null,

      speed: ['safe', 'fast', 'turbo', 'custom'].includes(s.speed) ? s.speed : DEFAULTS.speed,
      custom: {
        moveFrames: Math.round(num(c.moveFrames, 1, 0, 10)),
        holdFrames: Math.round(num(c.holdFrames, 1, 0, 10)),
        gapFrames: Math.round(num(c.gapFrames, 1, 0, 10)),
        clicks: Math.round(num(c.clicks, 2, 1, 4)),
      },
      source: s.source === 'current' ? 'current' : 'overlay',
      order: ['snake', 'rows', 'cols', 'random'].includes(s.order) ? s.order : DEFAULTS.order,
      delay: Math.round(num(s.delay, 0, 0, 10000)),
      jitter: Math.round(num(s.jitter, 0, 0, 100)),
      limit: Math.round(num(s.limit, 0, 0, 1000000)),

      guard: s.guard === undefined ? true : Boolean(s.guard),
      canvasGuard: s.canvasGuard === undefined ? true : Boolean(s.canvasGuard),
      showGrid: s.showGrid === undefined ? true : Boolean(s.showGrid),
    };
  }

  const cfg = normalize(DEFAULTS);
  const listeners = new Set();
  let saveTimer = null;

  function flush() {
    try { chrome.storage?.local?.set({ [KEY]: JSON.parse(JSON.stringify(cfg)) }); } catch {}
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 250);
  }

  function set(patch, persist = true) {
    Object.assign(cfg, normalize({ ...cfg, ...patch }));
    listeners.forEach((fn) => { try { fn(cfg); } catch {} });
    if (persist) save();
  }

  function load(done) {
    let called = false;
    const finish = (raw) => {
      if (called) return;
      called = true;
      if (raw) Object.assign(cfg, normalize({ ...cfg, ...raw }));
      done?.(cfg);
    };
    try {
      chrome.storage?.local?.get(KEY, (res) => finish(res && res[KEY]));
    } catch {
      finish(null);
    }
    /* storage is normally instant, but never let a missing callback block boot */
    setTimeout(() => finish(null), 2000);
  }

  NS.store = {
    KEY,
    DEFAULTS,
    get cfg() { return cfg; },
    set,
    load,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})();
