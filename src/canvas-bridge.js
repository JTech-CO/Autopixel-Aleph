/* MAIN-world, on-demand canvas reader. There are no permanent WebGL or rAF
   wrappers. A request briefly observes draws, then releases the hooks. */
(() => {
  'use strict';
  const pending = new Map();
  let restore = [];
  let queued = false;
  const drawn = new Set();
  const send = data => document.dispatchEvent(new CustomEvent('apx:sample-result', {
    detail: JSON.stringify(data),
  }));
  function pixels(canvas, points, snapshot) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || !canvas.width || !canvas.height) return { error: 'empty' };
    if (canvas.width * canvas.height > 16777216) return { error: 'too-large' };
    const coords = points.map(p => ({
      x: Math.floor((p.x - rect.left) * canvas.width / rect.width),
      y: Math.floor((p.y - rect.top) * canvas.height / rect.height),
    }));
    const valid = coords.filter(p => p.x >= 0 && p.y >= 0 && p.x < canvas.width && p.y < canvas.height);
    if (!snapshot && !valid.length) return { colors: points.map(() => null) };
    const x = snapshot ? 0 : Math.min(...valid.map(p => p.x));
    const y = snapshot ? 0 : Math.min(...valid.map(p => p.y));
    const w = snapshot ? canvas.width : Math.max(...valid.map(p => p.x)) - x + 1;
    const h = snapshot ? canvas.height : Math.max(...valid.map(p => p.y)) - y + 1;
    const copy = document.createElement('canvas');
    copy.width = w; copy.height = h;
    const ctx = copy.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
    if (snapshot) return { image: copy.toDataURL('image/png'), width: w, height: h };
    const data = ctx.getImageData(0, 0, w, h).data;
    return { colors: coords.map(p => {
      if (p.x < 0 || p.y < 0 || p.x >= canvas.width || p.y >= canvas.height) return null;
      const i = ((p.y - y) * w + p.x - x) * 4;
      return [...data.subarray(i, i + 4)];
    }) };
  }
  function unhook() {
    if (pending.size) return;
    for (const fn of restore) fn();
    restore = [];
  }
  function finish(id, req, error = null) {
    pending.delete(id); clearTimeout(req.timer);
    try { send({ id, ...(error ? { error } : pixels(req.canvas, req.points, req.snapshot)) }); }
    catch { send({ id, error: 'unreadable' }); }
    unhook();
  }
  function observe(gl) {
    if (!pending.size) return;
    drawn.add(gl.canvas);
    if (queued) return;
    queued = true;
    // Runs after the site's synchronous render callback, before buffer discard.
    queueMicrotask(() => {
      queued = false;
      for (const [id, req] of pending) if (drawn.has(req.canvas)) finish(id, req);
      drawn.clear();
    });
  }
  function hook() {
    if (restore.length) return;
    for (const type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!type) continue;
      for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'clear', 'blitFramebuffer']) {
        const descriptor = Object.getOwnPropertyDescriptor(type.prototype, name);
        if (typeof descriptor?.value !== 'function') continue;
        const original = descriptor.value;
        const wrapped = function (...args) {
          const value = Reflect.apply(original, this, args);
          observe(this);
          return value;
        };
        Object.defineProperty(type.prototype, name, { ...descriptor, value: wrapped });
        restore.push(() => {
          if (type.prototype[name] === wrapped) Object.defineProperty(type.prototype, name, descriptor);
        });
      }
    }
  }
  document.addEventListener('apx:sample-request', event => {
    let id;
    try {
      const data = JSON.parse(event.detail);
      id = data.id;
      const { token, points = [], snapshot = false } = data;
      if (typeof id !== 'string' || typeof token !== 'string' || !/^[\w-]+$/.test(token)
        || !Array.isArray(points) || points.length > 4096
        || !points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))) return;
      const canvas = document.querySelector('canvas[data-apx-read-id="' + token + '"]');
      if (!canvas) { send({ id, error: 'missing' }); return; }
      const req = { canvas, points, snapshot: snapshot === true, timer: null };
      if (canvas.getContext('2d')) {
        try { send({ id, ...pixels(canvas, points, req.snapshot) }); }
        catch { send({ id, error: 'unreadable' }); }
        return;
      }
      if (pending.size >= 4) { send({ id, error: 'busy' }); return; }
      req.timer = setTimeout(() => finish(id, req, 'no-render'), 500);
      pending.set(id, req); hook();
    } catch { if (id) send({ id, error: 'unreadable' }); }
  });
})();
