/* AutoPixel-ℵ — wiring. */
(() => {
  'use strict';
  const NS = (window.__APX = window.__APX || {});
  if (NS.app) return;

  const { store, grid, overlay, runner, engine, pick, ui, i18n } = NS;

  let staleAfterResize = false;
  let lastTick = 0;
  let offscreenInRun = 0;

  function persistGeometry() {
    store.set(grid.snapshot());
  }

  function refresh() {
    ui.render();
    overlay.request();
  }

  /* warn about unclickable cells while idle, not mid-run */
  function offscreenCount() {
    const s = grid.size();
    if (!grid.ready() || !s.n || s.n > 50000) return 0;
    return grid.buildCells('rows', 0).offscreen;
  }

  function idleStatus() {
    if (!grid.ready()) return ui.setStatus('st_need_pitch');
    if (staleAfterResize) return ui.setStatus('st_resized', null, 'warn');
    const s = grid.size();
    if (!s.n) return ui.setStatus('st_need_area');
    const off = offscreenCount();
    if (off) {
      return ui.setStatusRaw(
        () => `${i18n.t('st_ready', { n: (s.n - off).toLocaleString() })} · ${i18n.t('st_offscreen', { n: off })}`,
        'warn',
      );
    }
    ui.setStatus('st_ready', { n: s.n.toLocaleString() });
  }

  const hooks = {
    onStart() {
      ui.setPhase('busy');
      ui.setProgress(0);
      ui.updateStartButton();
    },
    onProgress(state) {
      const handled = state.done + state.blocked;
      ui.setProgress(handled / state.total);
      /* the cell in flight when a pause lands must not overwrite its message */
      if (state.paused) return;
      const now = performance.now();
      if (now - lastTick < 90 && handled < state.total) return;
      const rate = runner.rate();
      /* rate() needs a moment of wall clock before it means anything */
      if (rate <= 0 && handled < state.total) return;
      lastTick = now;
      ui.setStatus('st_running', {
        done: state.done,
        total: state.total,
        rate: rate.toFixed(1),
        eta: ui.fmtTime(runner.etaMs()),
      }, 'go');
    },
    onPause(state) {
      ui.setPhase('armed');
      ui.updateStartButton();
      if (state.reason === 'guard') ui.setStatus('st_pause_guard', null, 'warn');
      else if (state.reason === 'hidden') ui.setStatus('st_pause_hidden', null, 'warn');
      else ui.setStatus('st_paused', { done: state.done, total: state.total }, 'warn');
    },
    onResume(state) {
      ui.setPhase('busy');
      ui.updateStartButton();
      hooks.onProgress(state);
    },
    onEnd(state) {
      ui.setPhase(grid.ready() ? 'armed' : 'idle');
      ui.updateStartButton();
      const handled = state.done + state.blocked;
      ui.setProgress(handled / Math.max(1, state.total));

      /* every cell rejected means the guard is wrong about this site, not that
         the area is bad, so say that instead of burying it in a count */
      if (state.total && state.blocked === state.total && store.cfg.canvasGuard) {
        ui.setStatus('st_guard_all', null, 'warn');
        return;
      }

      const finished = handled >= state.total;
      const done = state.done;
      const total = state.total;
      const blocked = state.blocked;
      const elapsed = runner.elapsedMs();
      const offscreen = offscreenInRun;
      const clean = finished && !blocked && !offscreen;

      ui.setStatusRaw(() => {
        let text = finished
          ? i18n.t('st_done', { done, time: ui.fmtTime(elapsed) })
          : i18n.t('st_stopped', { done, total });
        const notes = [];
        if (offscreen) notes.push(i18n.t('st_offscreen', { n: offscreen }));
        if (blocked) notes.push(i18n.t('st_covered', { n: blocked }));
        return notes.length ? `${text} · ${notes.join(' · ')}` : text;
      }, clean ? 'go' : 'warn');
    },
  };

  function startRun() {
    if (!grid.ready()) { ui.setStatus('st_need_pitch', null, 'warn'); return; }
    const cfg = store.cfg;
    const { cells, offscreen } = grid.buildCells(cfg.order, cfg.limit);
    if (!cells.length) { ui.setStatus('st_need_area', null, 'warn'); return; }

    offscreenInRun = offscreen;
    overlay.resetProgress();
    const profile = engine.profileFrom(cfg);
    runner.start(cells, profile, { guard: cfg.guard }, hooks);
  }

  NS.app = {
    toggleLang() {
      if (runner.state.running) return;
      i18n.toggle();
      store.set({ lang: i18n.lang });
    },

    calibrate() {
      if (runner.state.running) return;
      if (pick.mode !== 'none') { pick.cancel(); return; }
      pick.startCalibration(store.cfg.gapCells, (key, vars) => ui.setStatus(key, vars), (res) => {
        if (res.ok) {
          persistGeometry();
          ui.setStatus('st_calib_done', { px: grid.state.pitch.toFixed(2) }, 'go');
          staleAfterResize = false;
        } else {
          idleStatus();
        }
        refresh();
      });
      ui.setPhase('armed');
      ui.updateStartButton();
    },

    selectArea() {
      if (runner.state.running) return;
      if (pick.mode !== 'none') { pick.cancel(); return; }
      pick.startArea((key, vars) => ui.setStatus(key, vars), (res) => {
        if (res.ok) {
          persistGeometry();
          overlay.resetProgress();
        }
        idleStatus();
        refresh();
      });
      ui.updateStartButton();
    },

    clearArea() {
      if (runner.state.running) return;
      grid.clearRegion();
      overlay.clearProgress();
      persistGeometry();
      ui.setProgress(0);
      idleStatus();
      refresh();
    },

    adjustPitch(delta) {
      if (runner.state.running || !grid.ready()) return;
      grid.setPitch(grid.state.pitch + delta);
      persistGeometry();
      ui.setStatus('st_calib_done', { px: grid.state.pitch.toFixed(2) });
      refresh();
    },

    nudge(dc, dr) {
      if (runner.state.running || !grid.state.region) return;
      grid.nudge(dc, dr);
      overlay.resetProgress();
      persistGeometry();
      idleStatus();
      refresh();
    },

    nudgeOrigin(dx, dy) {
      if (runner.state.running || !grid.ready()) return;
      grid.nudgeOrigin(dx, dy);
      persistGeometry();
      refresh();
    },

    toggleRun() {
      if (runner.state.running) { runner.toggle(); return; }
      if (pick.mode !== 'none') pick.cancel();
      startRun();
    },

    stop() {
      if (runner.state.running) runner.stop();
      else if (pick.mode !== 'none') pick.cancel();
    },
  };

  store.onChange((cfg) => {
    overlay.setShowGrid(cfg.showGrid);
    ui.render();
    ui.refitHeight();   // Custom mode and folding change how tall the body needs to be
  });

  addEventListener('resize', () => {
    if (!grid.ready()) return;
    staleAfterResize = true;
    if (!runner.state.running) idleStatus();
  }, { passive: true });

  store.load((cfg) => {
    i18n.set(cfg.lang);
    grid.restore(cfg);
    overlay.setShowGrid(cfg.showGrid);
    if (grid.state.region) overlay.resetProgress();
    ui.applyText();
    ui.render();
    ui.refitHeight();
    ui.setPhase(grid.ready() ? 'armed' : 'idle');
    idleStatus();
  });
})();
