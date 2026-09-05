/* AutoPixel-ℵ — pixel grid geometry.

   Cell (c, r) sits at origin + (c, r) * pitch in viewport coordinates.
   `origin` is the first cell clicked during calibration, so it is (0, 0) and
   indices go negative above and to the left of it. */
(() => {
  'use strict';
  const NS = (window.__APX = window.__APX || {});
  if (NS.grid) return;

  const state = {
    pitch: 0,
    origin: null,   // { x, y }
    region: null,   // inclusive bounding box
    mask: null,     // null = rectangle; Set of 'c,r' otherwise
  };

  const ready = () => state.pitch > 0 && !!state.origin;

  function setCalibration(a, b, gapCells) {
    const gap = Math.max(1, Math.round(gapCells) || 1);
    const d = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    if (d <= 0) return false;
    state.pitch = d / gap;
    state.origin = { x: a.x, y: a.y };
    return true;
  }

  function setPitch(px) {
    const v = Number(px);
    if (!Number.isFinite(v) || v <= 0) return;
    state.pitch = Math.min(4096, Math.max(0.5, v));
  }

  function cellCenter(c, r) {
    return {
      x: state.origin.x + c * state.pitch,
      y: state.origin.y + r * state.pitch,
    };
  }

  function clientToCell(x, y) {
    return {
      c: Math.round((x - state.origin.x) / state.pitch),
      r: Math.round((y - state.origin.y) / state.pitch),
    };
  }

  function setRegionFromClient(x0, y0, x1, y1) {
    if (!ready()) return false;
    const a = clientToCell(x0, y0);
    const b = clientToCell(x1, y1);
    const region = {
      c0: Math.min(a.c, b.c),
      c1: Math.max(a.c, b.c),
      r0: Math.min(a.r, b.r),
      r1: Math.max(a.r, b.r),
    };
    state.region = region;
    state.mask = null;
    return true;
  }


  const selected = (c, r) => !!state.region && c >= state.region.c0 && c <= state.region.c1
    && r >= state.region.r0 && r <= state.region.r1 && (!state.mask || state.mask.has(c + ',' + r));

  function inPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[j], b = points[i];
      const cross = (x - a.x) * (b.y - a.y) - (y - a.y) * (b.x - a.x);
      if (Math.abs(cross) < 1e-7 && x >= Math.min(a.x, b.x) && x <= Math.max(a.x, b.x)
        && y >= Math.min(a.y, b.y) && y <= Math.max(a.y, b.y)) return true;
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }

  function selectShape(points, shape = 'rect', operation = 'replace') {
    if (!ready() || points.length < 2) return false;
    const coords = points.map(p => clientToCell(p.x, p.y));
    const c0 = Math.min(...coords.map(p => p.c)), c1 = Math.max(...coords.map(p => p.c));
    const r0 = Math.min(...coords.map(p => p.r)), r1 = Math.max(...coords.map(p => p.r));
    if ((c1 - c0 + 1) * (r1 - r0 + 1) > 1000000) return false;
    const next = new Set();
    if (operation !== 'replace' && state.region) {
      const R = state.region;
      for (let r = R.r0; r <= R.r1; r++) for (let c = R.c0; c <= R.c1; c++)
        if (selected(c, r)) next.add(c + ',' + r);
    }
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const p = cellCenter(c, r);
      const inside = shape === 'ellipse'
        ? ((c - (c0 + c1) / 2) / ((c1 - c0 + 1) / 2)) ** 2
          + ((r - (r0 + r1) / 2) / ((r1 - r0 + 1) / 2)) ** 2 <= 1
        : shape !== 'lasso' || inPolygon(p.x, p.y, points);
      if (inside) operation === 'subtract' ? next.delete(c + ',' + r) : next.add(c + ',' + r);
    }
    if (!next.size) { clearRegion(); return true; }
    const bounds = { c0: Infinity, r0: Infinity, c1: -Infinity, r1: -Infinity };
    for (const key of next) {
      const [c, r] = key.split(',').map(Number);
      bounds.c0 = Math.min(bounds.c0, c); bounds.c1 = Math.max(bounds.c1, c);
      bounds.r0 = Math.min(bounds.r0, r); bounds.r1 = Math.max(bounds.r1, r);
    }
    if ((bounds.c1 - bounds.c0 + 1) * (bounds.r1 - bounds.r0 + 1) > 1000000) return false;
    state.region = bounds;
    state.mask = next;
    return true;
  }

  function size() {
    if (!state.region) return { w: 0, h: 0, n: 0 };
    const w = state.region.c1 - state.region.c0 + 1;
    const h = state.region.r1 - state.region.r0 + 1;
    return { w, h, n: state.mask ? state.mask.size : w * h };
  }

  function regionRect() {
    if (!ready() || !state.region) return null;
    const half = state.pitch / 2;
    const tl = cellCenter(state.region.c0, state.region.r0);
    const br = cellCenter(state.region.c1, state.region.r1);
    return { x: tl.x - half, y: tl.y - half, w: (br.x - tl.x) + state.pitch, h: (br.y - tl.y) + state.pitch };
  }

  function nudge(dc, dr) {
    if (!state.region) return;
    if (state.mask) state.mask = new Set([...state.mask].map(key => {
      const [c, r] = key.split(',').map(Number);
      return (c + dc) + ',' + (r + dr);
    }));
    state.region.c0 += dc; state.region.c1 += dc;
    state.region.r0 += dr; state.region.r1 += dr;
  }

  /* moves the lattice, not the region: lines the grid up without re-selecting */
  function nudgeOrigin(dx, dy) {
    if (!state.origin) return;
    state.origin.x += dx;
    state.origin.y += dy;
  }

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = list[i]; list[i] = list[j]; list[j] = tmp;
    }
    return list;
  }

  /* Off-screen cells are dropped here rather than at paint time, so the
     progress total matches what will actually be attempted. */
  function buildCells(order, limit) {
    if (!ready() || !state.region) return { cells: [], offscreen: 0 };
    const R = state.region;
    const out = [];
    let offscreen = 0;

    const push = (c, r) => {
      if (!selected(c, r)) return;
      const p = cellCenter(c, r);
      if (p.x < 0 || p.y < 0 || p.x >= innerWidth || p.y >= innerHeight) { offscreen++; return; }
      out.push({ c, r, x: p.x, y: p.y });
    };

    if (order === 'cols') {
      for (let c = R.c0; c <= R.c1; c++) for (let r = R.r0; r <= R.r1; r++) push(c, r);
    } else if (order === 'rows' || order === 'random') {
      for (let r = R.r0; r <= R.r1; r++) for (let c = R.c0; c <= R.c1; c++) push(c, r);
      if (order === 'random') shuffle(out);
    } else {
      /* snake: reverse every other row */
      for (let r = R.r0; r <= R.r1; r++) {
        const reverse = (r - R.r0) % 2 === 1;
        for (let k = 0; k <= R.c1 - R.c0; k++) push(reverse ? R.c1 - k : R.c0 + k, r);
      }
    }

    const capped = limit > 0 ? out.slice(0, limit) : out;
    return { cells: capped, offscreen };
  }

  function clearRegion() { state.region = null; state.mask = null; }
  function clearAll() { clearRegion(); state.origin = null; state.pitch = 0; }

  NS.grid = {
    state,
    ready,
    setCalibration,
    setPitch,
    cellCenter,
    clientToCell,
    setRegionFromClient,
    selectShape,
    selected,
    regionRect,
    size,
    nudge,
    nudgeOrigin,
    buildCells,
    clearRegion,
    clearAll,
    restore(cfg) {
      state.pitch = cfg.pitch || 0;
      state.origin = cfg.origin ? { ...cfg.origin } : null;
      state.region = cfg.region ? { ...cfg.region } : null;
      state.mask = cfg.mask ? new Set(cfg.mask) : null;
    },
    snapshot() {
      return {
        pitch: state.pitch,
        origin: state.origin ? { ...state.origin } : null,
        region: state.region ? { ...state.region } : null,
        mask: state.mask ? [...state.mask] : null,
      };
    },
  };
})();
