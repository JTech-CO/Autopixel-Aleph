/* AutoPixel-ℵ — synthetic input engine.

   Events are dispatched straight at the element under the target point, and
   every wait is measured in render frames rather than milliseconds: the
   shortest wait that still lets a frame-driven canvas handler see the input. */
(() => {
  'use strict';
  const NS = (window.__APX = window.__APX || {});
  if (NS.engine) return;

  const KEY_I = { key: 'i', code: 'KeyI', keyCode: 73, charCode: 105 };

  /* `pace` is the share of the unthrottled rate a preset may run at. Frame
     counts alone do not separate the tiers: once the site is the bottleneck an
     extra frame wait vanishes into work it was doing anyway and Fast matches
     Turbo, so the runner paces off the per-cell time it measures instead. */
  const PRESETS = {
    safe: { moveFrames: 2, holdFrames: 2, gapFrames: 1, clicks: 2, pace: 0.5 },
    fast: { moveFrames: 1, holdFrames: 1, gapFrames: 0, clicks: 2, pace: 0.75 },
    turbo: { moveFrames: 1, holdFrames: 1, gapFrames: 0, clicks: 2, pace: 1 },
  };

  const isOurs = (el) => NS.isOurs?.(el) ?? false;

  function frames(n) {
    const count = Math.max(0, Math.round(n || 0));
    if (count === 0) return Promise.resolve();
    return new Promise((resolve) => {
      let left = count;
      /* rAF stops in a background tab; without this a run would wedge */
      const fallback = setTimeout(finish, 60 * left + 120);
      function finish() { clearTimeout(fallback); resolve(); }
      function step() { if (--left <= 0) finish(); else requestAnimationFrame(step); }
      requestAnimationFrame(step);
    });
  }

  function sleep(ms) {
    return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
  }

  function pickTarget(x, y) {
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return null;
    const stack = document.elementsFromPoint(x, y);
    for (const el of stack) {
      if (!isOurs(el)) return el;
    }
    return null;
  }

  /* What the user was pointing at when they calibrated. Learned rather than
     guessed: a template overlay often renders into its own canvas stacked on
     the map's, so "the biggest canvas" is not what sits under the cursor and
     comparing against it rejects every cell. */
  let refTarget = null;

  function rememberTarget(x, y) {
    const el = pickTarget(x, y);
    if (el && el !== document.body && el !== document.documentElement) refTarget = el;
    return refTarget;
  }

  function largestCanvas() {
    let best = null;
    let bestArea = 0;
    for (const c of document.querySelectorAll('canvas')) {
      const r = c.getBoundingClientRect();
      const area = r.width * r.height;
      if (area > bestArea) { bestArea = area; best = c; }
    }
    return bestArea >= 10000 ? best : null;
  }

  function resolveGuardTarget() {
    if (refTarget && refTarget.isConnected) return refTarget;
    return largestCanvas();
  }

  /* Any <canvas>, or the reference element / something nested with it. The
     site's own controls are buttons and divs, so those still get skipped. */
  function onDrawSurface(target, guard) {
    if (!target) return false;
    if (target.tagName === 'CANVAS') return true;
    if (!guard) return false;
    return target === guard || guard.contains(target) || target.contains(guard);
  }

  function keyEvent(type, spec) {
    const ev = new KeyboardEvent(type, {
      key: spec.key,
      code: spec.code,
      location: 0,
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      keyCode: spec.keyCode,
      which: spec.keyCode,
      charCode: type === 'keypress' ? spec.charCode : 0,
      repeat: false,
      isComposing: false,
    });
    /* keyCode/which are legacy and read-only in some builds; force them so
       handlers written against the old API still recognise the key. */
    if (ev.keyCode !== spec.keyCode) {
      for (const prop of ['keyCode', 'which']) {
        Object.defineProperty(ev, prop, { get: () => spec.keyCode });
      }
    }
    return ev;
  }

  function pointerEvent(type, x, y, buttons) {
    const init = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      detail: type === 'pointermove' || type === 'mousemove' ? 0 : 1,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      button: 0,
      buttons,
    };
    if (type.startsWith('pointer')) {
      return new PointerEvent(type, {
        ...init,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        width: 1,
        height: 1,
        pressure: buttons ? 0.5 : 0,
      });
    }
    return new MouseEvent(type, init);
  }

  const fire = (target, type, x, y, buttons) => {
    if (!target) return;
    target.dispatchEvent(pointerEvent(type, x, y, buttons));
  };

  function move(target, x, y) {
    fire(target, 'pointermove', x, y, 0);
    fire(target, 'mousemove', x, y, 0);
  }

  async function pressKey(spec, holdFrames) {
    let target = document.activeElement;
    if (!target || !target.isConnected || isOurs(target)) {
      target = document.body || document.documentElement;
    }
    const notCancelled = target.dispatchEvent(keyEvent('keydown', spec));
    if (notCancelled) target.dispatchEvent(keyEvent('keypress', spec));
    await frames(holdFrames);
    target.dispatchEvent(keyEvent('keyup', spec));
  }

  async function click(target, x, y, holdFrames) {
    fire(target, 'pointerdown', x, y, 1);
    fire(target, 'mousedown', x, y, 1);
    await frames(holdFrames);
    fire(target, 'pointerup', x, y, 0);
    fire(target, 'mouseup', x, y, 0);
    fire(target, 'click', x, y, 0);
  }

  async function paintCell(x, y, p) {
    const target = pickTarget(x, y);
    if (!target) return 'blocked';
    if (p.canvasGuard && p.guardTarget && !onDrawSurface(target, p.guardTarget)) return 'blocked';

    move(target, x, y);
    await frames(p.moveFrames);

    if (p.useKey) {
      await pressKey(KEY_I, p.holdFrames);
      await frames(p.gapFrames);
    }

    const clicks = Math.max(1, p.clicks | 0);
    for (let i = 0; i < clicks; i++) {
      if (i > 0) await frames(p.gapFrames);
      await click(target, x, y, p.holdFrames);
    }
    return 'ok';
  }

  function profileFrom(cfg) {
    const base = cfg.speed === 'custom' ? cfg.custom : PRESETS[cfg.speed] || PRESETS.fast;
    return {
      moveFrames: base.moveFrames,
      holdFrames: base.holdFrames,
      gapFrames: base.gapFrames,
      clicks: base.clicks,
      pace: base.pace > 0 && base.pace <= 1 ? base.pace : 1,
      useKey: cfg.source !== 'current',
      canvasGuard: !!cfg.canvasGuard,
      guardTarget: null,
      delay: cfg.delay,
      jitter: cfg.jitter,
    };
  }

  function framesPerCell(p) {
    const clicks = Math.max(1, p.clicks | 0);
    let f = p.moveFrames;
    if (p.useKey) f += p.holdFrames + p.gapFrames;
    f += clicks * p.holdFrames + (clicks - 1) * p.gapFrames;
    return f;
  }

  /* measured, not assumed 60 Hz, so the ETA holds on a 120 Hz display */
  let frameMs = 1000 / 60;
  (function measure() {
    let last = 0;
    let samples = 0;
    let total = 0;
    requestAnimationFrame(function tick(now) {
      if (last) {
        const dt = now - last;
        if (dt > 2 && dt < 100) { total += dt; samples++; }
      }
      last = now;
      if (samples < 12) requestAnimationFrame(tick);
      else frameMs = total / samples;
    });
  })();

  NS.engine = {
    PRESETS,
    frames,
    sleep,
    pickTarget,
    rememberTarget,
    resolveGuardTarget,
    onDrawSurface,
    move,
    pressKey,
    click,
    paintCell,
    profileFrom,
    framesPerCell,
    get frameMs() { return frameMs; },
    msPerCell(p) {
      const pace = p.pace > 0 && p.pace <= 1 ? p.pace : 1;
      return (framesPerCell(p) * frameMs) / pace + (p.delay || 0);
    },
  };
})();
