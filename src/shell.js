/* AutoPixel-ℵ — shadow host and layer shell.

   One pointer-transparent host holds the overlay canvas, the click catcher and
   the panel. Keeping them in one shadow root gives engine.js a single element
   to exclude when it resolves the click target under a cell. */
(() => {
  'use strict';
  const NS = (window.__APX = window.__APX || {});
  if (NS.hostEl) return;

  const host = document.createElement('div');
  host.id = 'autopixel-x-root';
  host.style.cssText = [
    'position: fixed !important',
    'inset: 0 !important',
    'z-index: 2147483647 !important',
    'pointer-events: none !important',
    'margin: 0 !important',
    'padding: 0 !important',
    'border: 0 !important',
    'background: none !important',
    'transform: none !important',
    'filter: none !important',
    'contain: layout style',
    'width: 100vw !important',
    'height: 100vh !important',
    'max-width: none !important',
    'max-height: none !important',
    'overflow: visible !important',
  ].join(';');

  const shadow = host.attachShadow({ mode: 'open' });

  const base = document.createElement('style');
  base.textContent = `
    /* inheritable properties cross the shadow boundary, so pin the ones the
       page could otherwise impose on the panel */
    :host {
      display: block;
      font: 400 12px/1.4 ui-sans-serif, system-ui, sans-serif;
      color: #e6e7e9;
      letter-spacing: normal;
      word-spacing: normal;
      text-transform: none;
      text-indent: 0;
      text-align: left;
      white-space: normal;
      text-shadow: none;
      direction: ltr;
      visibility: visible;
      cursor: default;
      -webkit-text-size-adjust: 100%;
    }
    * { box-sizing: border-box; }
    #apx-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    #apx-capture {
      position: absolute;
      inset: 0;
      display: none;
      cursor: crosshair;
      pointer-events: auto;
    }
    #apx-capture.active { display: block; }
    #apx-panel-slot {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: auto;
    }
  `;

  const canvas = document.createElement('canvas');
  canvas.id = 'apx-canvas';

  const capture = document.createElement('div');
  capture.id = 'apx-capture';

  const panelSlot = document.createElement('div');
  panelSlot.id = 'apx-panel-slot';

  shadow.append(base, canvas, capture, panelSlot);

  // z-index cannot escape a modal's top layer or its inert subtree.
  // Keep the manual popover inside the current modal, then raise it above it.
  let lastModal = null;
  let scheduled = false;
  const modalOrder = [];
  if (host.showPopover) host.setAttribute('popover', 'manual');
  function mount(raise = false) {
    const dialogs = [...document.querySelectorAll('dialog:modal')];
    for (const d of dialogs) if (!modalOrder.includes(d)) modalOrder.push(d);
    for (let i = modalOrder.length - 1; i >= 0; i--) {
      if (!dialogs.includes(modalOrder[i])) modalOrder.splice(i, 1);
    }
    const modal = modalOrder.at(-1) || null;
    const parent = modal || document.fullscreenElement || document.body || document.documentElement;
    const moved = host.parentElement !== parent;
    if (moved) parent.appendChild(host);
    if (host.showPopover) {
      try {
        if ((raise || moved || modal !== lastModal) && host.matches(':popover-open')) host.hidePopover();
        if (!host.matches(':popover-open')) host.showPopover();
      } catch { /* Older browsers retain the fixed z-index fallback. */ }
    }
    lastModal = modal;
  }
  function schedule(raise = false) {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; mount(raise); });
  }
  new MutationObserver(records => {
    if (records.some(r => r.target !== host && !host.contains(r.target))) schedule();
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
  document.addEventListener('toggle', e => {
    if (e.target === host || NS.isOurs?.(e.target)) return;
    if (e.target.matches?.('dialog:modal') && e.newState === 'open') {
      const i = modalOrder.indexOf(e.target);
      if (i >= 0) modalOrder.splice(i, 1);
      modalOrder.push(e.target);
    }
    schedule(e.newState === 'open');
  }, true);
  document.addEventListener('fullscreenchange', () => schedule(true));
  mount();

  /* Nothing inside the host should leak an event to the page.
     These MUST stay on the bubble phase. A capture-phase listener here would
     stop the event before it ever reached the control inside the shadow tree,
     which kills every button in the panel. */
  const swallow = ['pointerdown', 'pointerup', 'pointermove', 'mousedown', 'mouseup',
    'mousemove', 'click', 'dblclick', 'wheel', 'contextmenu', 'keydown', 'keyup',
    'keypress', 'input', 'change'];
  for (const type of swallow) {
    host.addEventListener(type, (e) => e.stopPropagation());
  }

  NS.hostEl = host;
  NS.shadow = shadow;
  NS.canvasEl = canvas;
  NS.captureEl = capture;
  NS.panelSlot = panelSlot;

  NS.isOurs = (el) => {
    for (let node = el; node; node = node.getRootNode?.().host)
      if (node === host || host.contains(node)) return true;
    return false;
  };
})();
