/* AutoPixel-ℵ — the paint loop, plus the guards that stop it. */
(() => {
  'use strict';
  const NS = (window.__APX = window.__APX || {});
  if (NS.runner) return;

  const state = {
    running: false,
    paused: false,
    stopRequested: false,
    reason: '',        // '' | 'user' | 'guard' | 'hidden'
    done: 0,
    blocked: 0,
    total: 0,
    startedAt: 0,
    pausedAt: 0,
    pausedMs: 0,
    endedAt: 0,
  };

  let hooks = {};
  let guardsOn = false;
  let cellMsAvg = 0;      // smoothed cost of one cell, drives preset pacing
  let paceDeadline = 0;   // running ideal schedule, so timer slop cannot accumulate

  const elapsedMs = () => {
    if (!state.startedAt) return 0;
    const end = state.endedAt || performance.now();
    const paused = state.pausedMs + (state.paused && state.pausedAt ? end - state.pausedAt : 0);
    return Math.max(0, end - state.startedAt - paused);
  };

  const rate = () => {
    const s = elapsedMs() / 1000;
    return s > 0.25 ? state.done / s : 0;
  };

  const etaMs = () => {
    const r = rate();
    const left = state.total - state.done - state.blocked;
    return r > 0 ? (left / r) * 1000 : 0;
  };

  function onGuardEvent(e) {
    if (!e.isTrusted) return;
    if (NS.isOurs?.(e.target)) return;
    pause('guard');
  }

  function onVisibility() {
    if (document.hidden) {
      pause('hidden');
    } else if (state.paused && state.reason === 'hidden') {
      resume();
    }
  }

  function installGuards(useInputGuard) {
    if (guardsOn) return;
    guardsOn = true;
    document.addEventListener('visibilitychange', onVisibility);
    if (!useInputGuard) return;
    for (const type of ['wheel', 'pointerdown', 'keydown']) {
      addEventListener(type, onGuardEvent, { capture: true, passive: true });
    }
  }

  function removeGuards() {
    if (!guardsOn) return;
    guardsOn = false;
    document.removeEventListener('visibilitychange', onVisibility);
    for (const type of ['wheel', 'pointerdown', 'keydown']) {
      removeEventListener(type, onGuardEvent, { capture: true });
    }
  }

  function pause(reason = 'user') {
    if (!state.running || state.paused) return;
    state.paused = true;
    state.reason = reason;
    state.pausedAt = performance.now();
    hooks.onPause?.(state);
  }

  function resume() {
    if (!state.running || !state.paused) return;
    state.pausedMs += performance.now() - state.pausedAt;
    state.pausedAt = 0;
    state.paused = false;
    state.reason = '';
    /* the pause is not debt the pacer should try to make up */
    paceDeadline = 0;
    hooks.onResume?.(state);
  }

  function toggle() {
    if (!state.running) return;
    state.paused ? resume() : pause('user');
  }

  function stop() {
    if (!state.running) return;
    state.stopRequested = true;
    state.paused = false;
  }

  function jitteredDelay(delay, jitter) {
    if (delay <= 0) return 0;
    if (jitter <= 0) return delay;
    const spread = delay * (jitter / 100);
    return Math.max(0, delay + (Math.random() * 2 - 1) * spread);
  }

  /* Presets below Turbo hold the run at `pace` of the rate it would reach
     unthrottled, measured per cell so the ratio holds whatever the bottleneck
     is. The wait runs off a rolling deadline rather than a plain sleep, because
     setTimeout always overshoots and paying that fresh on every cell drags the
     achieved ratio below target; a deadline lets the next wait absorb the slop. */
  function waitAfterCell(profile, cellStart) {
    const jitterMs = jitteredDelay(profile.delay, profile.jitter);
    const pace = profile.pace;
    if (!(pace > 0) || pace >= 1 || cellMsAvg <= 0) return jitterMs;

    const period = cellMsAvg / pace + jitterMs;
    paceDeadline = (paceDeadline || cellStart) + period;
    return Math.max(0, Math.min(5000, paceDeadline - performance.now()));
  }

  async function start(cells, profile, opts, userHooks) {
    if (state.running || !cells.length) return;
    hooks = userHooks || {};

    Object.assign(state, {
      running: true,
      paused: false,
      stopRequested: false,
      reason: '',
      done: 0,
      blocked: 0,
      total: cells.length,
      startedAt: performance.now(),
      pausedAt: 0,
      pausedMs: 0,
      endedAt: 0,
    });

    cellMsAvg = 0;
    paceDeadline = 0;
    profile.guardTarget = profile.canvasGuard ? NS.engine.resolveGuardTarget() : null;
    installGuards(opts.guard);
    hooks.onStart?.(state);

    try {
      for (let i = 0; i < cells.length; i++) {
        if (state.stopRequested) break;

        while (state.paused && !state.stopRequested) {
          await NS.engine.sleep(80);
        }
        if (state.stopRequested) break;

        const cell = cells[i];
        NS.overlay.setCurrent(cell);

        const cellStart = performance.now();
        const result = await NS.engine.paintCell(cell.x, cell.y, profile);

        if (result === 'ok') {
          /* a skipped cell returns instantly and would skew the pacing average */
          const cellMs = performance.now() - cellStart;
          cellMsAvg = cellMsAvg > 0 ? cellMsAvg * 0.75 + cellMs * 0.25 : cellMs;
          state.done++;
          NS.overlay.markCell(cell.c, cell.r);
        } else {
          state.blocked++;
        }
        hooks.onProgress?.(state, cell);

        if (i < cells.length - 1) {
          const wait = waitAfterCell(profile, cellStart);
          if (wait > 0) await NS.engine.sleep(wait);
        }
      }
    } finally {
      state.endedAt = performance.now();
      state.running = false;
      state.paused = false;
      removeGuards();
      NS.overlay.setCurrent(null);
      hooks.onEnd?.(state);
    }
  }

  NS.runner = { state, start, pause, resume, toggle, stop, rate, etaMs, elapsedMs };
})();
