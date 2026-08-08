/* AutoPixel-ℵ — click catcher for calibration and area selection. While active
   it covers the viewport so nothing reaches the map; the panel sits above it
   and stays clickable. */
(() => {
  'use strict';
  const NS = (window.__APX = window.__APX || {});
  if (NS.pick) return;

  const el = NS.captureEl;
  const grid = NS.grid;
  const overlay = NS.overlay;

  let mode = 'none';       // none | calib | area
  let calibA = null;
  let dragFrom = null;
  let onStatus = () => {};
  let onDone = () => {};
  let gapCells = 10;

  function setStatus(key, vars) { onStatus(key, vars); }

  function stop(reason) {
    mode = 'none';
    calibA = null;
    dragFrom = null;
    el.classList.remove('active');
    overlay.setPreview(null);
    if (reason) setStatus(reason);
  }

  function begin(next) {
    if (mode !== 'none') stop();
    mode = next;
    el.classList.add('active');
  }

  function startCalibration(gap, statusFn, doneFn) {
    gapCells = Math.max(1, Math.round(gap) || 1);
    onStatus = statusFn || (() => {});
    onDone = doneFn || (() => {});
    begin('calib');
    calibA = null;
    overlay.setPreview({ kind: 'calib', a: null, b: null });
    setStatus('st_calib_1');
  }

  function startArea(statusFn, doneFn) {
    onStatus = statusFn || (() => {});
    onDone = doneFn || (() => {});
    if (!grid.ready()) { setStatus('st_need_pitch'); return; }
    begin('area');
    dragFrom = null;
    overlay.setPreview(null);
    setStatus('st_area_hint');
  }

  el.addEventListener('pointerdown', (e) => {
    if (mode === 'none' || e.button !== 0) return;
    e.preventDefault();
    const x = e.clientX;
    const y = e.clientY;

    /* teaches the draw-surface guard what this site draws the map on */
    NS.engine.rememberTarget(x, y);

    if (mode === 'calib') {
      if (!calibA) {
        calibA = { x, y };
        overlay.setPreview({ kind: 'calib', a: calibA, b: null });
        setStatus('st_calib_2', { n: gapCells });
        return;
      }
      const b = { x, y };
      if (!grid.setCalibration(calibA, b, gapCells)) {
        setStatus('st_calib_same');
        return;
      }
      const pitch = grid.state.pitch;
      stop();
      setStatus('st_calib_done', { px: pitch.toFixed(2) });
      onDone({ ok: true, mode: 'calib', pitch });
      return;
    }

    if (mode === 'area') {
      dragFrom = { x, y };
      try { el.setPointerCapture(e.pointerId); } catch {}
      overlay.setPreview({ kind: 'rubber', x0: x, y0: y, x1: x, y1: y });
    }
  });

  el.addEventListener('pointermove', (e) => {
    if (mode === 'calib' && calibA) {
      overlay.setPreview({ kind: 'calib', a: calibA, b: { x: e.clientX, y: e.clientY } });
      return;
    }
    if (mode === 'area' && dragFrom) {
      overlay.setPreview({ kind: 'rubber', x0: dragFrom.x, y0: dragFrom.y, x1: e.clientX, y1: e.clientY });
    }
  });

  el.addEventListener('pointerup', (e) => {
    if (mode !== 'area' || !dragFrom) return;
    const from = dragFrom;
    const to = { x: e.clientX, y: e.clientY };
    try { el.releasePointerCapture(e.pointerId); } catch {}

    const pitch = grid.state.pitch;
    if (Math.abs(to.x - from.x) < pitch * 0.5 && Math.abs(to.y - from.y) < pitch * 0.5) {
      dragFrom = null;
      overlay.setPreview(null);
      setStatus('st_area_small');
      return;
    }

    grid.setRegionFromClient(from.x, from.y, to.x, to.y);
    stop();
    onDone({ ok: true, mode: 'area', size: grid.size() });
  });

  NS.pick = {
    get mode() { return mode; },
    startCalibration,
    startArea,
    cancel() {
      if (mode === 'none') return;
      const cancelled = mode;
      stop('st_cancelled');
      onDone({ ok: false, mode: cancelled });
    },
  };
})();
