/* AutoPixel-ℵ — control panel (shadow DOM).

   The panel owns its markup and listeners and calls into NS.app for anything
   that changes state, so main.js stays the one place things are wired up.
   Fixed 3:4 box, flat blocks, no borders or shadows, three colours only. */
(() => {
  'use strict';
  const NS = (window.__APX = window.__APX || {});
  if (NS.ui) return;

  const T = (k, v) => NS.i18n.t(k, v);
  const app = () => NS.app || {};

  const style = document.createElement('style');
  style.textContent = `
    .panel {
      --w: 360px;
      --bg0: #000000;
      --bg1: #0d0d0d;
      --bg2: #1c1c1c;
      --bg3: #2e2e2e;
      --fg0: #ffffff;
      --fg1: #b0b0b0;
      --fg2: #6e6e6e;
      --gr: #3fb950;

      width: var(--w);
      height: calc(var(--w) * 4 / 3);
      max-height: 100vh;
      display: flex;
      flex-direction: column;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
                   "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
      font-size: 13px;
      line-height: 1.35;
      color: var(--fg0);
      background: var(--bg1);
      user-select: none;
      -webkit-user-select: none;
    }
    /* collapsed: a third of the height. Setup groups go, run controls stay. */
    .panel.folded { height: calc(var(--w) * 4 / 9); }
    .panel input { user-select: text; -webkit-user-select: text; }
    .panel * { border-radius: 0; box-shadow: none; transition: none; }

    .head {
      display: flex;
      flex: none;
      align-items: center;
      gap: 9px;
      height: 30px;
      padding: 0 3px 0 12px;
      background: var(--bg0);
      cursor: grab;
    }
    .head:active { cursor: grabbing; }
    .dot { width: 7px; height: 7px; flex: none; background: var(--fg2); }
    .armed .dot { background: var(--gr); }
    .busy .dot { background: var(--fg0); }
    .title { font-size: 14px; font-weight: 600; letter-spacing: 0.4px; white-space: nowrap; }
    .head-actions { display: flex; align-items: center; margin-left: auto; }

    button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }

    .ghost { height: 26px; padding: 0 9px; color: var(--fg1); }
    .ghost:hover { color: var(--fg0); background: var(--bg2); }
    .ghost.icon { width: 26px; padding: 0; display: grid; place-items: center; }
    .folded .caret svg { transform: rotate(-90deg); }

    .track { flex: none; height: 3px; background: var(--bg2); overflow: hidden; }
    .bar {
      display: block; width: 100%; height: 100%;
      background: var(--gr);
      transform: scaleX(0); transform-origin: left center;
      will-change: transform;
    }

    .body {
      flex: 1 1 auto; min-height: 0;
      padding: 9px 12px;
      display: flex; flex-direction: column; gap: 7px;
      overflow-y: auto; overscroll-behavior: contain;
      scrollbar-width: thin; scrollbar-color: var(--bg3) transparent;
    }
    .body::-webkit-scrollbar { width: 6px; }
    .body::-webkit-scrollbar-thumb { background: var(--bg3); }
    .folded .group { display: none; }
    .folded .body { justify-content: center; overflow: hidden; }

    .group { display: flex; flex-direction: column; gap: 4px; }
    .label {
      margin: 0;
      font-size: 10px; font-weight: 700; letter-spacing: 1px;
      text-transform: uppercase; color: var(--fg2);
    }

    .row { display: flex; align-items: center; gap: 5px; }
    .row > .grow { flex: 1 1 auto; min-width: 0; }

    .btn {
      height: 28px; padding: 0 10px;
      color: var(--fg0); background: var(--bg2);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .btn:hover { background: var(--bg3); }
    .btn:disabled { color: var(--fg2); background: var(--bg2); cursor: default; }
    .btn.primary { color: var(--bg0); background: var(--gr); font-weight: 700; }
    .btn.primary:disabled { color: var(--fg2); background: var(--bg2); font-weight: 400; }

    .readout {
      display: flex; align-items: center; gap: 5px;
      height: 26px; padding: 0 3px 0 9px;
      background: var(--bg2);
      font-size: 12.5px;
    }
    .readout .v { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--gr); }
    .readout .v.unset { color: var(--fg2); font-weight: 400; }
    .readout .sp { flex: 1 1 auto; }
    .stepper { display: flex; }
    .stepper .ghost { width: 24px; height: 24px; padding: 0; display: grid; place-items: center; }

    .seg { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 1px; }
    .seg button {
      height: 26px; padding: 0 3px;
      font-size: 12px; color: var(--fg1); background: var(--bg2);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .seg button:hover { color: var(--fg0); background: var(--bg3); }
    .seg button[aria-pressed="true"] { color: var(--bg0); background: var(--gr); font-weight: 700; }

    .pair { display: flex; align-items: center; gap: 4px; min-width: 0; }
    .pair span {
      flex: 1 1 auto; min-width: 0;
      font-size: 12px; color: var(--fg1);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    input[type="number"] {
      width: 50px; height: 24px; flex: none; padding: 0 5px;
      font: inherit; font-size: 12px; font-variant-numeric: tabular-nums;
      color: var(--fg0); background: var(--bg2);
      border: 0; text-align: right;
      -moz-appearance: textfield;
    }
    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

    .trio { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
    .quad { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 8px; }
    .quad[hidden] { display: none; }
    .quad input[type="number"] { width: 42px; }

    .checks { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px; }
    .check { display: flex; align-items: center; gap: 6px; min-width: 0; cursor: pointer; }
    .check span {
      font-size: 12px; color: var(--fg1);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .check input { width: 13px; height: 13px; flex: none; margin: 0; accent-color: var(--gr); cursor: pointer; }

    .pad { display: flex; gap: 1px; }
    .pad button {
      width: 22px; height: 22px; padding: 0;
      display: grid; place-items: center;
      font-size: 12px; color: var(--fg1); background: var(--bg2);
    }
    .pad button:hover { color: var(--fg0); background: var(--bg3); }

    .actions { display: grid; grid-template-columns: 1fr 88px; gap: 5px; }
    .actions .btn { width: 100%; height: 32px; text-align: center; justify-content: center; }

    .est {
      margin: 0; color: var(--fg2); font-size: 11.5px;
      font-variant-numeric: tabular-nums; text-align: center;
    }
    .status {
      flex: none;
      margin: 0; padding: 6px 12px 7px;
      min-height: 27px;
      background: var(--bg0);
      color: var(--fg2); font-size: 12px; line-height: 1.3;
      font-variant-numeric: tabular-nums;
    }
    .status.warn { color: var(--fg0); }
    .status.go { color: var(--gr); }

    :focus-visible { outline: 1px solid var(--gr); outline-offset: -1px; }
  `;

  const seg = (id, items) => `
    <div class="seg" id="${id}" role="group">
      ${items.map((v) => `<button type="button" data-v="${v}" aria-pressed="false"></button>`).join('')}
    </div>`;

  const numField = (id) => `
    <label class="pair"><span data-fld="${id}"></span><input type="number" id="${id}"></label>`;

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <section class="panel idle" id="panel">
      <header class="head" id="head">
        <span class="dot" aria-hidden="true"></span>
        <span class="title">AutoPixel-ℵ</span>
        <span class="head-actions">
          <button class="ghost" id="lang" type="button"></button>
          <button class="ghost icon caret" id="fold" type="button">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M1.5 3.5 5 7l3.5-3.5" stroke="currentColor" stroke-width="1.4"
                    stroke-linecap="square"/>
            </svg>
          </button>
        </span>
      </header>

      <div class="track" aria-hidden="true"><span class="bar" id="bar"></span></div>

      <div class="body">
        <section class="group">
          <h2 class="label" data-lbl="sec_cell"></h2>
          <div class="row">
            <button class="btn grow" id="calib" type="button"></button>
            <label class="pair" style="flex:none"><span data-fld="gapCells"></span>
              <input type="number" id="gapCells"></label>
          </div>
          <div class="readout">
            <span data-lbl="lbl_pitch" style="color:var(--fg1)"></span>
            <span class="v unset" id="pitchValue"></span>
            <span class="sp"></span>
            <span class="stepper">
              <button class="ghost" id="pitchDown" type="button">&minus;</button>
              <button class="ghost" id="pitchUp" type="button">+</button>
            </span>
            <span class="pad" id="padGrid">
              <button type="button" data-d="-1,0">&larr;</button>
              <button type="button" data-d="0,-1">&uarr;</button>
              <button type="button" data-d="0,1">&darr;</button>
              <button type="button" data-d="1,0">&rarr;</button>
            </span>
          </div>
        </section>

        <section class="group">
          <h2 class="label" data-lbl="sec_area"></h2>
          <div class="row">
            <button class="btn grow" id="area" type="button"></button>
            <button class="btn" id="clear" type="button"></button>
          </div>
          <div class="readout">
            <span class="v unset" id="areaValue"></span>
            <span class="sp"></span>
            <label class="check"><input type="checkbox" id="showGrid"><span data-lbl="lbl_grid"></span></label>
            <span class="pad" id="pad">
              <button type="button" data-d="-1,0">&larr;</button>
              <button type="button" data-d="0,-1">&uarr;</button>
              <button type="button" data-d="0,1">&darr;</button>
              <button type="button" data-d="1,0">&rarr;</button>
            </span>
          </div>
        </section>

        <section class="group">
          <h2 class="label" data-lbl="sec_run"></h2>
          ${seg('speed', ['safe', 'fast', 'turbo', 'custom'])}
          ${seg('source', ['overlay', 'current'])}
          ${seg('order', ['snake', 'rows', 'cols', 'random'])}
          <div class="quad" id="frames" hidden>
            ${numField('moveFrames')}
            ${numField('holdFrames')}
            ${numField('gapFrames')}
            ${numField('clicks')}
          </div>
          <div class="trio">
            ${numField('delay')}
            ${numField('jitter')}
            ${numField('limit')}
          </div>
          <div class="checks">
            <label class="check"><input type="checkbox" id="guard"><span data-lbl="lbl_guard"></span></label>
            <label class="check"><input type="checkbox" id="canvasGuard"><span data-lbl="lbl_cguard"></span></label>
          </div>
        </section>

        <div class="actions">
          <button class="btn primary" id="start" type="button"></button>
          <button class="btn" id="stop" type="button"></button>
        </div>
        <p class="est" id="est"></p>
      </div>

      <p class="status" id="status"></p>
    </section>
  `;

  const panel = wrap.firstElementChild;
  NS.panelSlot.append(style, panel);

  const $ = (id) => panel.querySelector('#' + id);
  const els = {
    panel,
    head: $('head'), lang: $('lang'), fold: $('fold'), bar: $('bar'),
    calib: $('calib'), gapCells: $('gapCells'), pitchValue: $('pitchValue'),
    pitchDown: $('pitchDown'), pitchUp: $('pitchUp'),
    area: $('area'), clear: $('clear'), areaValue: $('areaValue'),
    showGrid: $('showGrid'), pad: $('pad'), padGrid: $('padGrid'),
    speed: $('speed'), source: $('source'), order: $('order'),
    frames: $('frames'),
    moveFrames: $('moveFrames'), holdFrames: $('holdFrames'),
    gapFrames: $('gapFrames'), clicks: $('clicks'),
    delay: $('delay'), jitter: $('jitter'), limit: $('limit'),
    guard: $('guard'), canvasGuard: $('canvasGuard'),
    start: $('start'), stop: $('stop'), est: $('est'), status: $('status'),
  };

  const NUM_LIMITS = {
    gapCells: [1, 999], moveFrames: [0, 10], holdFrames: [0, 10], gapFrames: [0, 10],
    clicks: [1, 4], delay: [0, 10000], jitter: [0, 100], limit: [0, 1000000],
  };
  for (const [id, [min, max]] of Object.entries(NUM_LIMITS)) {
    if (!els[id]) continue;
    els[id].min = String(min);
    els[id].max = String(max);
    els[id].step = '1';
  }

  const SEG_LABELS = {
    speed: { safe: 'sp_safe', fast: 'sp_fast', turbo: 'sp_turbo', custom: 'sp_custom' },
    source: { overlay: 'src_overlay', current: 'src_current' },
    order: { snake: 'ord_snake', rows: 'ord_rows', cols: 'ord_cols', random: 'ord_random' },
  };
  const FIELD_LABELS = {
    gapCells: 'lbl_gap', moveFrames: 'lbl_move_f', holdFrames: 'lbl_hold_f',
    gapFrames: 'lbl_gap_f', clicks: 'lbl_clicks', delay: 'lbl_delay',
    jitter: 'lbl_jitter', limit: 'lbl_limit',
  };

  function applyText() {
    for (const node of panel.querySelectorAll('[data-lbl]')) {
      node.textContent = T(node.dataset.lbl);
    }
    for (const [id, key] of Object.entries(FIELD_LABELS)) {
      const holder = panel.querySelector(`[data-fld="${id}"]`);
      if (holder) holder.textContent = T(key);
    }
    for (const [group, map] of Object.entries(SEG_LABELS)) {
      for (const btn of els[group].querySelectorAll('button')) {
        btn.textContent = T(map[btn.dataset.v]);
        btn.title = btn.textContent;
      }
    }
    els.lang.textContent = T('lang_btn');
    els.calib.textContent = T(NS.grid.ready() ? 'btn_recalib' : 'btn_calib');
    els.area.textContent = T('btn_area');
    els.clear.textContent = T('btn_clear');
    els.stop.textContent = T('btn_stop');

    els.gapCells.parentElement.title = T('tip_gap');
    els.delay.parentElement.title = T('tip_delay');
    els.jitter.parentElement.title = T('tip_jitter');
    els.limit.parentElement.title = T('tip_limit');
    els.source.title = T('tip_source');
    els.guard.parentElement.title = T('tip_guard');
    els.canvasGuard.parentElement.title = T('tip_cguard');
    els.pad.title = T('tip_nudge');
    els.padGrid.title = T('tip_nudge_grid');
    els.fold.title = T(NS.store.cfg.folded ? 'fold_closed' : 'fold_open');
    updateStartButton();
  }

  function setSeg(group, value) {
    for (const btn of els[group].querySelectorAll('button')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.v === value));
    }
  }

  function updateStartButton() {
    const r = NS.runner.state;
    els.start.textContent = !r.running ? T('btn_start') : (r.paused ? T('btn_resume') : T('btn_pause'));
    /* Stop doubles as Cancel while calibrating or selecting an area */
    els.stop.disabled = !r.running && NS.pick.mode === 'none';
  }

  function render() {
    const cfg = NS.store.cfg;
    const g = NS.grid;

    els.panel.classList.toggle('folded', cfg.folded);
    els.gapCells.value = String(cfg.gapCells);
    setSeg('speed', cfg.speed);
    setSeg('source', cfg.source);
    setSeg('order', cfg.order);
    els.frames.hidden = cfg.speed !== 'custom';
    els.moveFrames.value = String(cfg.custom.moveFrames);
    els.holdFrames.value = String(cfg.custom.holdFrames);
    els.gapFrames.value = String(cfg.custom.gapFrames);
    els.clicks.value = String(cfg.custom.clicks);
    els.delay.value = String(cfg.delay);
    els.jitter.value = String(cfg.jitter);
    els.limit.value = String(cfg.limit);
    els.guard.checked = cfg.guard;
    els.canvasGuard.checked = cfg.canvasGuard;
    els.showGrid.checked = cfg.showGrid;

    if (g.ready()) {
      els.pitchValue.textContent = `${g.state.pitch.toFixed(2)} px`;
      els.pitchValue.classList.remove('unset');
    } else {
      els.pitchValue.textContent = T('val_unset');
      els.pitchValue.classList.add('unset');
    }
    els.calib.textContent = T(g.ready() ? 'btn_recalib' : 'btn_calib');

    const s = g.size();
    if (g.state.region && s.n > 0) {
      els.areaValue.textContent = T('val_area', { w: s.w, h: s.h, n: s.n.toLocaleString() });
      els.areaValue.classList.remove('unset');
    } else {
      els.areaValue.textContent = T('val_area_none');
      els.areaValue.classList.add('unset');
    }

    els.area.disabled = !g.ready();
    els.start.disabled = !(g.ready() && s.n > 0);
    updateStartButton();
    renderEstimate();
    setPos(cfg.pos);
  }

  function renderEstimate() {
    const cfg = NS.store.cfg;
    const s = NS.grid.size();
    if (!NS.grid.ready() || !s.n) { els.est.textContent = ''; return; }
    const profile = NS.engine.profileFrom(cfg);
    const per = NS.engine.msPerCell(profile);
    const count = cfg.limit > 0 ? Math.min(cfg.limit, s.n) : s.n;
    const rate = per > 0 ? 1000 / per : 0;
    els.est.textContent = T('est_speed', { rate: rate.toFixed(1), eta: fmtTime(count * per) });
  }

  function fmtTime(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
    if (m) return `${m}m ${String(s).padStart(2, '0')}s`;
    return `${s}s`;
  }

  let statusKey = 'st_need_pitch';
  let statusVars = null;
  let statusTone = '';
  let statusFn = null;     // composite lines keep their builder, to rebuild on
                           // a language switch

  function applyTone() {
    els.status.classList.toggle('warn', statusTone === 'warn');
    els.status.classList.toggle('go', statusTone === 'go');
  }

  function setStatus(key, vars, tone = '') {
    statusKey = key; statusVars = vars || null; statusTone = tone; statusFn = null;
    paintStatus();
  }

  function paintStatus() {
    if (statusFn) { els.status.textContent = statusFn(); applyTone(); return; }
    if (!statusKey) return;
    els.status.textContent = T(statusKey, statusVars);
    applyTone();
  }

  function setProgress(frac) {
    els.bar.style.transform = `scaleX(${Math.max(0, Math.min(1, frac || 0))})`;
  }

  function setPhase(phase) {
    els.panel.classList.remove('idle', 'armed', 'busy');
    els.panel.classList.add(phase);
  }

  function setPos(pos) {
    const w = panel.offsetWidth || 360;
    const h = panel.offsetHeight || 480;
    const x = Math.max(0, Math.min(Math.max(0, innerWidth - w), pos.x));
    const y = Math.max(0, Math.min(Math.max(0, innerHeight - h), pos.y));
    NS.panelSlot.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  (function draggable() {
    let from = null;
    els.head.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button')) return;
      const pos = NS.store.cfg.pos;
      from = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
      try { els.head.setPointerCapture(e.pointerId); } catch {}
    });
    els.head.addEventListener('pointermove', (e) => {
      if (!from) return;
      const next = { x: from.x + (e.clientX - from.px), y: from.y + (e.clientY - from.py) };
      setPos(next);
      from.last = next;
    });
    els.head.addEventListener('pointerup', (e) => {
      if (!from) return;
      try { els.head.releasePointerCapture(e.pointerId); } catch {}
      if (from.last) NS.store.set({ pos: from.last });
      from = null;
    });
  })();

  els.lang.addEventListener('click', () => app().toggleLang?.());
  els.fold.addEventListener('click', () => NS.store.set({ folded: !NS.store.cfg.folded }));
  els.calib.addEventListener('click', () => app().calibrate?.());
  els.area.addEventListener('click', () => app().selectArea?.());
  els.clear.addEventListener('click', () => app().clearArea?.());
  els.start.addEventListener('click', () => app().toggleRun?.());
  els.stop.addEventListener('click', () => app().stop?.());
  els.pitchDown.addEventListener('click', () => app().adjustPitch?.(-0.05));
  els.pitchUp.addEventListener('click', () => app().adjustPitch?.(0.05));

  els.pad.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-d]');
    if (!btn) return;
    const [dc, dr] = btn.dataset.d.split(',').map(Number);
    app().nudge?.(dc, dr);
  });

  els.padGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-d]');
    if (!btn) return;
    const [dx, dy] = btn.dataset.d.split(',').map(Number);
    app().nudgeOrigin?.(dx, dy);
  });

  for (const group of ['speed', 'source', 'order']) {
    els[group].addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-v]');
      if (!btn) return;
      NS.store.set({ [group]: btn.dataset.v });
    });
  }

  const bindNumber = (id, apply) => {
    const input = els[id];
    const commit = () => {
      const [min, max] = NUM_LIMITS[id];
      let v = Number(input.value);
      if (!Number.isFinite(v)) v = min;
      v = Math.min(max, Math.max(min, Math.round(v)));
      input.value = String(v);
      apply(v);
    };
    input.addEventListener('change', commit);
    input.addEventListener('blur', commit);
  };

  bindNumber('gapCells', (v) => NS.store.set({ gapCells: v }));
  bindNumber('delay', (v) => NS.store.set({ delay: v }));
  bindNumber('jitter', (v) => NS.store.set({ jitter: v }));
  bindNumber('limit', (v) => NS.store.set({ limit: v }));
  for (const k of ['moveFrames', 'holdFrames', 'gapFrames', 'clicks']) {
    bindNumber(k, (v) => NS.store.set({ custom: { ...NS.store.cfg.custom, [k]: v } }));
  }

  els.guard.addEventListener('change', () => NS.store.set({ guard: els.guard.checked }));
  els.canvasGuard.addEventListener('change', () => NS.store.set({ canvasGuard: els.canvasGuard.checked }));
  els.showGrid.addEventListener('change', () => NS.store.set({ showGrid: els.showGrid.checked }));

  NS.i18n.onChange(() => { applyText(); paintStatus(); render(); });
  addEventListener('resize', () => setPos(NS.store.cfg.pos), { passive: true });

  NS.ui = {
    els,
    panel,
    render,
    applyText,
    setStatus,
    /* pass a function for anything assembled from several translated pieces,
       so it survives a language switch */
    setStatusRaw(value, tone = '') {
      statusKey = null; statusVars = null; statusTone = tone;
      statusFn = typeof value === 'function' ? value : null;
      els.status.textContent = statusFn ? statusFn() : value;
      applyTone();
    },
    setProgress,
    setPhase,
    updateStartButton,
    renderEstimate,
    fmtTime,
  };
})();
