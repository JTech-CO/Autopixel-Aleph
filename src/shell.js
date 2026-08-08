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

  /* The site is a SPA; if it ever replaces <body> we put the host back. */
  function mount() {
    if (host.isConnected) return;
    (document.body || document.documentElement).appendChild(host);
  }
  mount();
  setInterval(mount, 1500);

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

  NS.isOurs = (el) => !!(el && (el === host || host.contains(el)));
})();
