(() => {
  'use strict';

  if (window.__wplaceHover) return;
  window.__wplaceHover = true;

  const STORE_KEY = 'wplaceHover';
  const TRIGGER_KEY = 'i';
  const MOVE_TOL = 4;
  const HOVER_UNIT = 100;
  const LEGACY_HOVER_UNIT = 250;
  const HOVER_LABELS = ['0.1 s', '0.2 s', '0.3 s', '0.4 s', '0.5 s'];
  const HOVER_MAX = HOVER_LABELS.length;
  const HOLD_FRAMES = 2;
  const GAP_FRAMES = 1;
  const DEFAULTS = { on: true, hoverStep: 5, folded: false };
  const cfg = { ...DEFAULTS };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let mouseX = Math.floor(innerWidth / 2);
  let mouseY = Math.floor(innerHeight / 2);
  let anchorX = mouseX;
  let anchorY = mouseY;
  let timer = null;
  let saveTimer = null;
  let armed = true;
  let busy = false;
  let overPanel = false;

  const hoverMs = () => cfg.hoverStep * HOVER_UNIT;

  function frames(count) {
    return new Promise((resolve) => {
      let left = Math.max(1, count);
      const fallback = setTimeout(finish, 60 * left + 60);
      function finish() {
        clearTimeout(fallback);
        resolve();
      }
      function step() {
        if (--left <= 0) finish();
        else requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  function keyEvent(type) {
    const event = new KeyboardEvent(type, {
      key: TRIGGER_KEY,
      code: 'KeyI',
      location: 0,
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      keyCode: 73,
      which: 73,
      charCode: type === 'keypress' ? 105 : 0,
      repeat: false,
      isComposing: false,
    });

    if (event.keyCode !== 73) {
      for (const prop of ['keyCode', 'which']) {
        Object.defineProperty(event, prop, { get: () => 73 });
      }
    }
    return event;
  }

  async function pressKey() {
    let target = document.activeElement;
    if (!target || target === host || !target.isConnected) {
      target = document.body || document.documentElement;
    }

    const notCancelled = target.dispatchEvent(keyEvent('keydown'));
    if (notCancelled) target.dispatchEvent(keyEvent('keypress'));
    await frames(HOLD_FRAMES);
    target.dispatchEvent(keyEvent('keyup'));
  }

  function fire(type, x, y, buttons) {
    const target = document.elementFromPoint(x, y) || document.body;
    if (!target || host.contains(target)) return;

    const init = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      detail: 1,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      button: 0,
      buttons,
    };

    const event = type.startsWith('pointer')
      ? new PointerEvent(type, {
          ...init,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
          pressure: buttons ? 0.5 : 0,
        })
      : new MouseEvent(type, init);

    target.dispatchEvent(event);
  }

  async function click(x, y) {
    fire('pointerdown', x, y, 1);
    fire('mousedown', x, y, 1);
    await frames(HOLD_FRAMES);
    fire('pointerup', x, y, 0);
    fire('mouseup', x, y, 0);
    fire('click', x, y, 0);
  }

  async function runSequence(x, y, withKey = true) {
    if (busy) return;
    busy = true;
    panel.classList.add('busy');
    panel.setAttribute('aria-label', 'wplace hover: running');
    if (!withKey) resetBar();

    try {
      if (withKey) {
        await pressKey();
        await frames(GAP_FRAMES);
      }
      await click(x, y);
      await frames(GAP_FRAMES);
      await click(x, y);
    } finally {
      busy = false;
      panel.classList.remove('busy');
      resetBar();
      updatePanelLabel();
    }
  }

  function resetBar() {
    bar.style.transition = 'none';
    bar.style.transform = 'scaleX(0)';
  }

  function runBar(ms) {
    resetBar();
    void bar.offsetWidth;
    if (reduceMotion.matches) {
      bar.style.transform = 'scaleX(1)';
      return;
    }
    bar.style.transition = `transform ${ms}ms linear`;
    bar.style.transform = 'scaleX(1)';
  }

  function cancelDwell() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    resetBar();
  }

  function scheduleDwell() {
    cancelDwell();
    if (!cfg.on || busy || overPanel || !armed) return;
    if (document.hidden || !document.hasFocus()) return;

    runBar(hoverMs());
    timer = setTimeout(() => {
      timer = null;
      if (!cfg.on || busy || overPanel || !armed) return;
      armed = false;
      runSequence(anchorX, anchorY, true);
    }, hoverMs());
  }

  function onMove(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
    if (Math.abs(mouseX - anchorX) <= MOVE_TOL && Math.abs(mouseY - anchorY) <= MOVE_TOL) return;

    anchorX = mouseX;
    anchorY = mouseY;
    armed = true;
    scheduleDwell();
  }

  for (const type of ['pointermove', 'mousemove']) {
    addEventListener(type, onMove, { capture: true, passive: true });
  }

  document.documentElement.addEventListener('mouseleave', cancelDwell);
  addEventListener('blur', cancelDwell);
  addEventListener('wheel', () => {
    armed = true;
    scheduleDwell();
  }, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelDwell();
    else scheduleDwell();
  });

  const isTyping = (node) => Boolean(
    node
    && node !== host
    && (/^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName) || node.isContentEditable)
  );

  addEventListener('keydown', (event) => {
    if (!event.isTrusted || busy) return;
    if (event.key?.toLowerCase() !== TRIGGER_KEY) return;
    if (event.ctrlKey || event.altKey || event.metaKey || event.repeat || event.isComposing) return;
    if (isTyping(event.target) || isTyping(document.activeElement)) return;
    if (document.activeElement === host) return;

    cancelDwell();
    armed = false;
    runSequence(mouseX, mouseY, false);
  }, true);

  const host = document.createElement('div');
  host.id = 'wplace-hover-root';
  host.style.cssText = [
    'position: fixed !important',
    'top: 8px !important',
    'left: 10px !important',
    'z-index: 2147483647 !important',
    'width: auto !important',
    'height: auto !important',
    'margin: 0 !important',
    'padding: 0 !important',
    'border: 0 !important',
    'background: none !important',
    'transform: none !important',
    'filter: none !important',
  ].join(';');

  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      :host { display: block; }
      * { box-sizing: border-box; }
      button, input { font: inherit; }
      .panel {
        width: 190px;
        overflow: hidden;
        color: #e6e7e9;
        background: #191a1c;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 7px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        user-select: none;
      }
      .head {
        display: flex;
        align-items: center;
        gap: 7px;
        min-height: 36px;
        padding: 7px 7px 7px 10px;
      }
      .dot {
        width: 7px;
        height: 7px;
        flex: none;
        border-radius: 50%;
        background: #6e7075;
        transition: background 150ms ease-out, box-shadow 150ms ease-out;
      }
      .on .dot {
        background: #3fb950;
        box-shadow: 0 0 8px rgba(63, 185, 80, 0.7);
      }
      .busy .dot { animation: pulse 420ms ease-in-out infinite alternate; }
      .name {
        overflow: hidden;
        font-size: 12.5px;
        font-weight: 650;
        line-height: 1;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .controls {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-left: auto;
      }
      .switch {
        position: relative;
        width: 28px;
        height: 16px;
        flex: none;
        padding: 0;
        border: 0;
        border-radius: 999px;
        background: #3a3c40;
        cursor: pointer;
        transition: background 150ms ease-out;
      }
      .switch::after {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #e6e7e9;
        transition: transform 150ms ease-out;
      }
      .switch[aria-checked="true"] { background: #3fb950; }
      .switch[aria-checked="true"]::after { transform: translateX(12px); }
      .fold {
        display: grid;
        width: 20px;
        height: 20px;
        place-items: center;
        padding: 0;
        color: #9a9ca1;
        background: transparent;
        border: 0;
        border-radius: 4px;
        cursor: pointer;
      }
      .fold:hover { color: #e6e7e9; background: rgba(255, 255, 255, 0.07); }
      .fold svg { transition: transform 150ms ease-out; }
      .folded .fold svg { transform: rotate(-90deg); }
      .progress {
        position: relative;
        height: 6px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.08);
        transition: opacity 150ms ease-out;
      }
      .bar {
        position: relative;
        display: block;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, #238636, #3fb950);
        box-shadow: 0 0 10px rgba(63, 185, 80, 0.85);
        transform: scaleX(0);
        transform-origin: left center;
        will-change: transform;
      }
      .bar::after {
        content: "";
        position: absolute;
        top: 0;
        right: 0;
        width: 2px;
        height: 100%;
        background: #e6e7e9;
        box-shadow: 0 0 7px rgba(230, 231, 233, 0.9);
      }
      .body {
        display: grid;
        gap: 6px;
        padding: 8px 10px 10px;
      }
      .folded .body { display: none; }
      .line {
        display: flex;
        align-items: center;
        color: #9a9ca1;
        font-size: 11.5px;
        line-height: 1;
      }
      .value {
        margin-left: auto;
        color: #e6e7e9;
        font-size: 11.5px;
        font-variant-numeric: tabular-nums;
        font-weight: 600;
      }
      input[type="range"] {
        --fill: 100%;
        width: 100%;
        height: 14px;
        margin: 0;
        padding: 0;
        appearance: none;
        -webkit-appearance: none;
        background: transparent;
        cursor: pointer;
      }
      input[type="range"]::-webkit-slider-runnable-track {
        height: 4px;
        border-radius: 999px;
        background: linear-gradient(to right, #3fb950 0 var(--fill), #3a3c40 var(--fill) 100%);
      }
      input[type="range"]::-webkit-slider-thumb {
        width: 12px;
        height: 12px;
        margin-top: -4px;
        appearance: none;
        -webkit-appearance: none;
        border: 0;
        border-radius: 50%;
        background: #e6e7e9;
      }
      input[type="range"]::-moz-range-track {
        height: 4px;
        border-radius: 999px;
        background: #3a3c40;
      }
      input[type="range"]::-moz-range-progress {
        height: 4px;
        border-radius: 999px;
        background: #3fb950;
      }
      input[type="range"]::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border: 0;
        border-radius: 50%;
        background: #e6e7e9;
      }
      .off .progress { opacity: 0.35; }
      .off .body { opacity: 0.55; }
      .switch:focus-visible, .fold:focus-visible, input[type="range"]:focus-visible {
        outline: 2px solid #3fb950;
        outline-offset: 2px;
      }
      @keyframes pulse {
        from { opacity: 0.55; }
        to { opacity: 1; }
      }
      @media (prefers-reduced-motion: reduce) {
        .dot, .switch, .switch::after, .fold svg, .progress, .bar { transition: none !important; animation: none !important; }
      }
    </style>
    <section class="panel on" id="panel" aria-label="wplace hover: enabled">
      <div class="head">
        <span class="dot" aria-hidden="true"></span>
        <span class="name">wplace hover</span>
        <div class="controls">
          <button class="switch" id="switch" type="button" role="switch" aria-checked="true"></button>
          <button class="fold" id="fold" type="button">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="progress" aria-hidden="true"><span class="bar" id="bar"></span></div>
      <div class="body">
        <label class="line" for="dwell">
          <span>Dwell</span>
          <output class="value" id="dwellValue" for="dwell">0.5 s</output>
        </label>
        <input type="range" id="dwell" min="1" max="${HOVER_MAX}" step="1" value="${DEFAULTS.hoverStep}" aria-label="Hover dwell time">
      </div>
    </section>
  `;

  const $ = (id) => root.getElementById(id);
  const panel = $('panel');
  const bar = $('bar');
  const switchButton = $('switch');
  const foldButton = $('fold');
  const dwell = $('dwell');
  const dwellValue = $('dwellValue');

  for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'wheel', 'contextmenu', 'keydown']) {
    host.addEventListener(type, (event) => event.stopPropagation());
  }

  host.addEventListener('pointerenter', () => {
    overPanel = true;
    cancelDwell();
  });
  host.addEventListener('pointerleave', () => {
    overPanel = false;
  });

  function normalize(saved) {
    const source = saved && typeof saved === 'object' ? saved : {};
    const out = { ...DEFAULTS, ...source };

    if ('clickStep' in source) {
      const legacyStep = Number(source.hoverStep) || 2;
      out.hoverStep = Math.round((legacyStep * LEGACY_HOVER_UNIT) / HOVER_UNIT);
    }

    const hoverStep = Math.min(
      HOVER_MAX,
      Math.max(1, Math.round(Number(out.hoverStep) || DEFAULTS.hoverStep))
    );

    return {
      on: Boolean(out.on),
      hoverStep,
      folded: Boolean(out.folded),
    };
  }

  function updatePanelLabel() {
    panel.setAttribute('aria-label', `wplace hover: ${cfg.on ? 'enabled' : 'disabled'}`);
  }

  function render() {
    panel.classList.toggle('on', cfg.on);
    panel.classList.toggle('off', !cfg.on);
    panel.classList.toggle('folded', cfg.folded);
    switchButton.setAttribute('aria-checked', String(cfg.on));
    switchButton.setAttribute('aria-label', cfg.on ? 'Disable automatic hover trigger' : 'Enable automatic hover trigger');
    switchButton.title = cfg.on ? 'Turn off' : 'Turn on';
    foldButton.setAttribute('aria-label', cfg.folded ? 'Expand panel' : 'Collapse panel');
    foldButton.title = cfg.folded ? 'Expand' : 'Collapse';
    dwell.value = String(cfg.hoverStep);
    dwellValue.textContent = HOVER_LABELS[cfg.hoverStep - 1];
    dwell.style.setProperty('--fill', `${((cfg.hoverStep - 1) / (HOVER_MAX - 1)) * 100}%`);
    updatePanelLabel();
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        chrome.storage?.local?.set({ [STORE_KEY]: { ...cfg } });
      } catch {}
    }, 200);
  }

  function apply(patch, persist = true) {
    Object.assign(cfg, normalize({ ...cfg, ...patch }));
    render();
    armed = true;
    cancelDwell();
    if (cfg.on) scheduleDwell();
    if (persist) save();
  }

  switchButton.addEventListener('click', () => apply({ on: !cfg.on }));
  foldButton.addEventListener('click', () => apply({ folded: !cfg.folded }));
  dwell.addEventListener('input', () => apply({ hoverStep: Number(dwell.value) }));

  try {
    chrome.storage?.local?.get(STORE_KEY, (result) => {
      if (result?.[STORE_KEY]) apply(result[STORE_KEY], false);
    });
    chrome.storage?.onChanged?.addListener((changes, area) => {
      if (area === 'local' && changes[STORE_KEY]) {
        apply(changes[STORE_KEY].newValue, false);
      }
    });
  } catch {}

  function mount() {
    if (host.isConnected) return;
    (document.body || document.documentElement).appendChild(host);
    render();
  }

  mount();
  setInterval(mount, 1500);
})();
