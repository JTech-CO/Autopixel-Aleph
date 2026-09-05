/* Template alpha is independent of board readability. Native Wplace overlays
   are composited with the artwork: compare an explicitly captured, overlay-free
   board image, never the visible template composite. */
(() => {
  'use strict';
  const NS = window.__APX;
  let reference = null, board = null, snapshot = null, anchor = null;
  let generation = 0, captureGeneration = 0;
  let captureError = '';
  const readers = new Map();
  document.addEventListener('apx:sample-result', e => {
    try { const msg = JSON.parse(e.detail); readers.get(msg.id)?.(msg); } catch {}
  });
  const geometry = () => JSON.stringify({ pitch: NS.grid.state.pitch, origin: NS.grid.state.origin });
  const rectOf = canvas => {
    const r = canvas.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, width: canvas.width, height: canvas.height };
  };
  function validTransform(canvas) {
    for (let el = canvas; el; el = el.parentElement) {
      const t = getComputedStyle(el).transform;
      if (t !== 'none') {
        const m = new DOMMatrixReadOnly(t);
        if (!m.is2D || m.b !== 0 || m.c !== 0 || m.a <= 0 || m.d <= 0) return false;
      }
    }
    return true;
  }
  function canvases() {
    return [...document.querySelectorAll('canvas')].filter(c => {
      const r = c.getBoundingClientRect();
      return !NS.isOurs(c) && r.width > 0 && r.height > 0;
    });
  }
  async function imageData(blob) {
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(bitmap, 0, 0);
      return { width: canvas.width, height: canvas.height, pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data };
    } finally { bitmap.close(); }
  }
  async function load(file) {
    const version = ++generation;
    reference = null; anchor = null; invalidate();
    if (!file) return;
    const data = await imageData(file);
    if (data.width * data.height > 1000000) throw new Error('template-size');
    if (version !== generation) return;
    reference = data;
    const s = NS.grid.size(), r = NS.grid.state.region;
    // Exact fit can be aligned automatically. A full-image/subregion workflow
    // must explicitly identify the image's top-left cell once.
    if (r && s.w === data.width && s.h === data.height) anchor = { c: r.c0, r: r.r0 };
  }
  function invalidate() { snapshot = null; captureGeneration++; }
  function aligned() { return !!(reference && anchor && NS.grid.ready()); }
  function snapshotValid() {
    return !!(snapshot && board?.isConnected && snapshot.canvas === board
      && snapshot.geometry === geometry() && JSON.stringify(snapshot.rect) === JSON.stringify(rectOf(board)));
  }
  function mode() { return NS.store.cfg.comparisonMode || 'snapshot'; }
  function status() {
    if (!NS.store.cfg.skipMatching) return 'disabled';
    if (!reference) return 'no-image';
    if (!aligned()) return 'anchor';
    if (NS.store.cfg.source === 'current') return 'alpha-only';
    if (!board?.isConnected) return 'no-board';
    if (mode() === 'snapshot' && !snapshotValid()) return captureError || 'capture';
    return 'ready';
  }
  function ready() { return status() === 'ready'; }
  function begin() {
    if (!aligned()) return null;
    return {
      anchor: { ...anchor }, image: reference, canvas: board,
      snapshot: snapshotValid() ? snapshot : null, geometry: geometry(),
      useColor: NS.store.cfg.source !== 'current', mode: mode(),
      failed: false, unavailable: false, reason: '',
    };
  }
  function expected(cell, run) {
    const x = cell.c - run.anchor.c, y = cell.r - run.anchor.r;
    if (x < 0 || y < 0 || x >= run.image.width || y >= run.image.height) return null;
    const i = (y * run.image.width + x) * 4;
    return [...run.image.pixels.subarray(i, i + 4)];
  }
  function read(canvas, points = [], snapshotRequest = false) {
    if (!canvas?.isConnected || !validTransform(canvas)) return Promise.resolve({ error: 'unreadable' });
    const token = canvas.dataset.apxReadId || (canvas.dataset.apxReadId = crypto.randomUUID());
    const id = crypto.randomUUID();
    return new Promise(resolve => {
      const timer = setTimeout(() => done({ error: 'bridge' }), 900);
      function done(msg) { clearTimeout(timer); readers.delete(id); resolve(msg); }
      readers.set(id, done);
      document.dispatchEvent(new CustomEvent('apx:sample-request', {
        detail: JSON.stringify({ id, token, points, snapshot: snapshotRequest }),
      }));
    });
  }
  async function capture() {
    invalidate(); captureError = '';
    const version = captureGeneration, canvas = board;
    if (!canvas?.isConnected) { captureError = 'no-board'; return false; }
    const rect = rectOf(canvas), g = geometry();
    const request = read(canvas, [], true);
    const region = NS.grid.regionRect();
    const x = region ? region.x + region.w / 2 : rect.x + rect.w / 2;
    const y = region ? region.y + region.h / 2 : rect.y + rect.h / 2;
    const target = NS.engine.pickTarget(x, y);
    if (target === canvas) NS.engine.move(canvas, x, y);
    const msg = await request;
    if (version !== captureGeneration) return false;
    if (!msg.image) { captureError = msg.error === 'no-render' ? 'no-render' : 'unreadable'; return false; }
    const bytes = Uint8Array.from(atob(msg.image.split(',')[1]), c => c.charCodeAt(0));
    const data = await imageData(new Blob([bytes], { type: 'image/png' }));
    if (version !== captureGeneration || geometry() !== g || JSON.stringify(rectOf(canvas)) !== JSON.stringify(rect)) return false;
    snapshot = { ...data, canvas, rect, geometry: g, generation: captureGeneration };
    return true;
  }
  const same = (p, target) => p?.length === 4 && p[3] === 255 && p.slice(0, 3).every((v, i) => v === target[i]);
  async function check(cell, run) {
    if (!run) return 'unknown';
    const target = expected(cell, run);
    if (!target) return 'outside';
    if (target[3] === 0) return 'transparent';
    if (!run.useColor || target[3] !== 255 || run.failed) return 'unknown';
    if (run.mode === 'snapshot') {
      const shot = run.snapshot;
      if (!shot || shot.generation !== captureGeneration || run.geometry !== geometry() || !run.canvas?.isConnected
        || JSON.stringify(shot.rect) !== JSON.stringify(rectOf(run.canvas))) {
        run.unavailable = true; run.reason = 'capture'; return 'unknown';
      }
      const dx = Math.min(NS.grid.state.pitch / 5, shot.rect.w / shot.width);
      const dy = Math.min(NS.grid.state.pitch / 5, shot.rect.h / shot.height);
      const colors = [[0,0],[-dx,0],[dx,0],[0,-dy],[0,dy]].map(([ox,oy]) => {
        const x = Math.floor((cell.x + ox - shot.rect.x) * shot.width / shot.rect.w);
        const y = Math.floor((cell.y + oy - shot.rect.y) * shot.height / shot.rect.h);
        if (x < 0 || y < 0 || x >= shot.width || y >= shot.height) return null;
        const i = (y * shot.width + x) * 4;
        return [...shot.pixels.subarray(i, i + 4)];
      });
      return colors.every(p => same(p, target)) ? 'matching' : 'different';
    }
    // Explicit opt-in for truly separate, uncomposited board canvases only.
    const surface = NS.engine.pickTarget(cell.x, cell.y);
    if (!run.canvas?.isConnected || !surface || !NS.engine.onDrawSurface(surface, NS.engine.resolveGuardTarget())) return 'unknown';
    const rect = rectOf(run.canvas);
    const dx = Math.min(NS.grid.state.pitch / 5, rect.w / run.canvas.width), dy = Math.min(NS.grid.state.pitch / 5, rect.h / run.canvas.height);
    const points = [[0,0],[-dx,0],[dx,0],[0,-dy],[0,dy]].map(([x,y]) => ({x:cell.x+x,y:cell.y+y}));
    const request = read(run.canvas, points);
    NS.engine.move(surface, cell.x, cell.y);
    const msg = await request;
    if (!msg.colors || msg.colors.length !== 5) { run.failed = true; run.unavailable = true; return 'unknown'; }
    return msg.colors.every(p => same(p, target)) ? 'matching' : 'different';
  }
  addEventListener('resize', invalidate, { passive: true });
  addEventListener('wheel', e => { if (e.isTrusted && !NS.isOurs(e.target)) invalidate(); }, { passive: true, capture: true });
  addEventListener('pointerdown', e => { if (e.isTrusted && e.target?.tagName === 'CANVAS') invalidate(); }, true);
  NS.matching = {
    canvases, load, ready, status, begin, check, capture, expected, aligned,
    invalidate,
    setAnchor(x, y) { anchor = NS.grid.clientToCell(x, y); invalidate(); },
    setBoard(canvas) { if (board !== canvas) { board = canvas; invalidate(); } },
    get reference() { return reference; },
  };
})();
