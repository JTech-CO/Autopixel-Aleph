/* AutoPixel-ℵ — viewport overlay: grid, area outline, live progress.

   Progress lives in a 1-pixel-per-cell offscreen canvas, blitted scaled up
   with smoothing off, so a 300x300 area redraws as cheaply as a 10x10 one. */
(() => {
  'use strict';
  const NS = (window.__APX = window.__APX || {});
  if (NS.overlay) return;

  const ACCENT = '#3fb950';
  const canvas = NS.canvasEl;
  const ctx = canvas.getContext('2d');

  let dpr = 1;
  let queued = false;
  let fullRedraw = true;
  let dirty = new Map();
  const background = document.createElement('canvas');
  let showGrid = true;
  let preview = null;      // { kind: 'rubber' | 'calib', ... }
  let current = null;      // { c, r } cell being painted
  let progress = null;     // offscreen canvas, one pixel per cell
  let selection = null;
  let progressBox = null;  // { c0, r0, w, h } the offscreen maps to

  function resize() {
    dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(innerWidth * dpr));
    const h = Math.max(1, Math.round(innerHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    request();
  }

  function request(full = true) {
    fullRedraw ||= full;
    if (queued) return;
    queued = true;
    const run = () => {
      if (!queued) return;
      queued = false;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      const full = fullRedraw; fullRedraw = false;
      draw(full);
      dirty.clear();
    };
    const raf = requestAnimationFrame(run);
    const timer = setTimeout(run, 250);
  }

  function resetProgress() {
    const g = NS.grid;
    if (!g.state.region) { progress = null; selection = null; progressBox = null; request(); return; }
    const { w, h } = g.size();
    progressBox = { c0: g.state.region.c0, r0: g.state.region.r0, w, h };
    progress = document.createElement('canvas');
    progress.width = w;
    progress.height = h;
    selection = null;
    if (g.state.mask) {
      selection = document.createElement('canvas');
      selection.width = w; selection.height = h;
      const sc = selection.getContext('2d');
      sc.fillStyle = 'rgba(63,185,80,0.18)';
      for (const key of g.state.mask) {
        const [c, r] = key.split(',').map(Number);
        sc.fillRect(c - progressBox.c0, r - progressBox.r0, 1, 1);
      }
    }
    request();
  }

  function markCell(c, r) {
    if (!progress || !progressBox) return;
    const x = c - progressBox.c0;
    const y = r - progressBox.r0;
    if (x < 0 || y < 0 || x >= progressBox.w || y >= progressBox.h) return;
    const pctx = progress.getContext('2d');
    pctx.fillStyle = ACCENT;
    pctx.fillRect(x, y, 1, 1);
    dirty.set(c + ',' + r, { c, r });
    request(false);
  }

  function draw(full = true) {
    const g = NS.grid;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (full || background.width !== canvas.width || background.height !== canvas.height) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);

      const rect = g.regionRect?.();
      const pitch = g.state.pitch;

      if (rect) {
        if (selection) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(selection, rect.x, rect.y, rect.w, rect.h);
        }

        const cells = g.size().n;
        if (showGrid && pitch >= 5 && cells <= 40000) {
          ctx.strokeStyle = 'rgba(255,255,255,0.14)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = rect.x; x <= rect.x + rect.w + 0.01; x += pitch) {
            const px = Math.round(x) + 0.5;
            ctx.moveTo(px, rect.y);
            ctx.lineTo(px, rect.y + rect.h);
          }
          for (let y = rect.y; y <= rect.y + rect.h + 0.01; y += pitch) {
            const py = Math.round(y) + 0.5;
            ctx.moveTo(rect.x, py);
            ctx.lineTo(rect.x + rect.w, py);
          }
          ctx.stroke();
        }

        ctx.strokeStyle = ACCENT;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(Math.round(rect.x) + 0.5, Math.round(rect.y) + 0.5,
          Math.round(rect.w), Math.round(rect.h));
      }

      background.width = canvas.width;
      background.height = canvas.height;
      background.getContext('2d').drawImage(canvas, 0, 0);
      if (rect) {
        if (progress) {
          ctx.imageSmoothingEnabled = false;
          ctx.globalAlpha = 0.34;
          ctx.drawImage(progress, rect.x, rect.y, rect.w, rect.h);
          ctx.globalAlpha = 1;
        }

      }
    } else if (g.ready()) {
      const pitch = g.state.pitch;
      for (const cell of dirty.values()) {
        const p = g.cellCenter(cell.c, cell.r);
        const x = Math.floor(p.x - pitch / 2 - 3), y = Math.floor(p.y - pitch / 2 - 3);
        const w = Math.ceil(pitch + 6), h = w;
        ctx.clearRect(x, y, w, h);
        ctx.drawImage(background, x * dpr, y * dpr, w * dpr, h * dpr, x, y, w, h);
        const rect = g.regionRect();
        if (progress && rect) {
          ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
          ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 0.34;
          ctx.drawImage(progress, rect.x, rect.y, rect.w, rect.h); ctx.restore();
        }
      }
    }
    const pitch = g.state.pitch;
    if (current && g.ready()) {
      const p = g.cellCenter(current.c, current.r);
      const h = pitch / 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(p.x - h, p.y - h, pitch, pitch);
    }

    if (preview?.kind === 'rubber') {
      const x = Math.min(preview.x0, preview.x1);
      const y = Math.min(preview.y0, preview.y1);
      const w = Math.abs(preview.x1 - preview.x0);
      const h = Math.abs(preview.y1 - preview.y0);
      ctx.fillStyle = 'rgba(63,185,80,0.10)';
      if (preview.shape === 'ellipse') {
        ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
      } else ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      if (preview.shape === 'ellipse') ctx.stroke();
      else ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h));
      ctx.setLineDash([]);
    }

    if (preview?.kind === 'lasso' && preview.points.length) {
      ctx.beginPath();
      preview.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath();
      ctx.fillStyle = 'rgba(63,185,80,0.12)'; ctx.fill('evenodd');
      ctx.strokeStyle = ACCENT; ctx.stroke();
    }
    if (preview?.kind === 'calib') {
      if (preview.a) crosshair(preview.a.x, preview.a.y, ACCENT);
      if (preview.b) crosshair(preview.b.x, preview.b.y, 'rgba(255,255,255,0.9)');
      if (preview.a && preview.b) {
        ctx.strokeStyle = 'rgba(63,185,80,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(preview.a.x, preview.a.y);
        ctx.lineTo(preview.b.x, preview.b.y);
        ctx.stroke();
      }
    }
  }

  function crosshair(x, y, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 9, y); ctx.lineTo(x - 3, y);
    ctx.moveTo(x + 3, y); ctx.lineTo(x + 9, y);
    ctx.moveTo(x, y - 9); ctx.lineTo(x, y - 3);
    ctx.moveTo(x, y + 3); ctx.lineTo(x, y + 9);
    ctx.stroke();
    ctx.strokeRect(x - 11, y - 11, 22, 22);
  }

  addEventListener('resize', resize, { passive: true });
  resize();

  NS.overlay = {
    request,
    resize,
    resetProgress,
    markCell,
    setShowGrid(v) { showGrid = !!v; request(); },
    setPreview(p) { preview = p; request(); },
    setCurrent(cell) {
      if (current) dirty.set(current.c + ',' + current.r, current);
      if (cell) dirty.set(cell.c + ',' + cell.r, cell);
      current = cell; request(false);
    },
    clearProgress() { progress = null; selection = null; progressBox = null; request(); },
  };
})();
