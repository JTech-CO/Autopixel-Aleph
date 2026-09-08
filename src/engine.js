/* AutoPixel-ℵ — synthetic input engine.

   Events are dispatched straight at the element under the target point, and
   every wait is measured in render frames rather than milliseconds: the
   shortest wait that still lets a frame-driven canvas handler see the input. */
(() => {
  'use strict';
  const NS = (window.__APX = window.__APX || {});
  if (NS.engine) return;

  const KEY_I = { key: 'i', code: 'KeyI', keyCode: 73, charCode: 105 };

  // Fixed ceilings; render/selection completion may lower the achieved rate.
  const PRESETS = {
    safe: { moveFrames: 1, holdFrames: 0, keyFrames: 1, gapFrames: 0, clicks: 2, targetRate: 10, pace: 1 },
    fast: { moveFrames: 1, holdFrames: 0, keyFrames: 1, gapFrames: 0, clicks: 2, targetRate: 20, pace: 1 },
    turbo: { moveFrames: 1, holdFrames: 0, keyFrames: 1, gapFrames: 0, clicks: 2, targetRate: 30, pace: 1 },
  };

  const isOurs = (el) => NS.isOurs?.(el) ?? false;

  const timing = { frameWaitMs: 0, frameWaits: 0 };
  function frames(n) {
    const count = Math.max(0, Math.round(n || 0));
    if (count === 0) return Promise.resolve();
    return new Promise((resolve) => {
      let left = count;
      const started = performance.now();
      /* rAF stops in a background tab; without this a run would wedge */
      const fallback = setTimeout(finish, 60 * left + 120);
      let raf = 0;
      function finish() { clearTimeout(fallback); cancelAnimationFrame(raf); timing.frameWaitMs += performance.now() - started; timing.frameWaits += count; resolve(); }
      function step() { if (--left <= 0) finish(); else raf = requestAnimationFrame(step); }
      raf = requestAnimationFrame(step);
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
    if (el?.tagName === 'CANVAS') refTarget = el;
    else if (el?.closest('.stage[role="application"]')?.querySelector('.artboard-frame')) refTarget=el.closest('.stage');
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
    if (!guard || target === document.body || target === document.documentElement) return false;
    return target === guard || guard.contains(target);
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

  async function pressKey(spec, holdFrames, preferredTarget = null) {
    let target = preferredTarget || document.activeElement;
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

  function selectedPalette() {
    return [...document.querySelectorAll('button[id^="color-"].ring-2.border-primary')]
      .filter(el=>el.getClientRects().length);
  }
  async function waitFor(check, p, timeout = 650) {
    if(p.shouldAbort?.()) return false;
    if(check()) return true;
    // Palette completion is a DOM transition. Observe it directly rather than
    // waiting for the next timer tick, while polling only for Stop/Pause.
    return new Promise(resolve=>{
      let finished=false;
      const finish=value=>{
        if(finished) return;
        finished=true;observer.disconnect();clearTimeout(deadline);clearInterval(abortPoll);resolve(value);
      };
      const evaluate=()=>{
        if(p.shouldAbort?.()) finish(false);
        else if(check()) finish(true);
      };
      const observer=new MutationObserver(evaluate);
      observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-pressed']});
      const deadline=setTimeout(()=>finish(false),timeout);
      const abortPoll=setInterval(evaluate,16);
      evaluate();
    });
  }
  let pendingSample = null;
  const verification = {phase:'idle',expected:null,selected:null,attempt:0};
  async function paintVerified(target, x, y, p) {
    const fail = reason => { p.failureReason=reason; return 'unverified'; };
    p.failureReason='';
    const stage=target.closest('.stage[role="application"]');
    const alliance=p.nativeKind==='alliance';
    const scope=stage?.closest('dialog') || document;
    // Resolve on every check: Wplace expands/rebuilds its palette after picking.
    const desired = () => alliance ? [...scope.querySelectorAll('button[aria-pressed]')].find(el=>{
      const rgb=getComputedStyle(el).backgroundColor.match(/[0-9.]+/g)?.slice(0,3).map(Number);
      return el.getClientRects().length && rgb?.every((v,i)=>v===p.expectedRGBA[i]);
    }) : document.getElementById('color-' + p.expectedColor);
    const picking=()=>alliance ? stage?.classList.contains('cursor-copy') : selectedPalette().length===0;
    const selected=()=>alliance
      ? [...scope.querySelectorAll('button[aria-pressed="true"]')].filter(el=>el.getClientRects().length&&(el.style.backgroundColor||el.style.backgroundImage||el.classList.contains('ring-2')))
      : selectedPalette();
    const correct=()=>{
      const button=desired();
      return !!button?.getClientRects().length && (alliance
        ? !picking() && button.getAttribute('aria-pressed')==='true'
        : (()=>{const active=selected();return active.length===1 && active[0]===button;})());
    };
    Object.assign(verification,{phase:'prepare',expected:p.expectedColor,selected:null,attempt:0});
    // A timed-out or interrupted sample remains in flight. No second sample or
    // paint is allowed until its original completion is observed.
    if(pendingSample) {
      verification.phase='pending';
      if(!await waitFor(pendingSample.complete,p,2000))
        return p.shouldAbort?.()?'cancelled':fail('native-pending');
      pendingSample=null;
      await frames(1); // drain the site's deferred palette focus callback
    }
    if(!alliance && ![...document.querySelectorAll('button[id^="color-"]')].some(el=>el.getClientRects().length))
      return fail('native-picker');
    if(!p.useKey) {
      verification.phase='current';
      if(!correct()) return fail('native-current-changed');
      await p.beforePaint?.();
      const final=await p.recheck?.();
      if(p.shouldAbort?.()) return 'cancelled';
      if(final?.kind==='matching') return 'matching';
      if(!final?.ok) return fail(final?.reason || 'native-loading');
      if(final.kind!=='paint' || final.color!==p.expectedColor) return 'deferred';
      if(!correct()) return fail('native-current-changed');
      if(pickTarget(x,y)!==target) return 'blocked';
      await click(target,x,y,0);
      verification.phase='done';
      return 'ok';
    }
    for(let attempt=1;attempt<=3;attempt++) {
      verification.attempt=attempt;
      verification.phase='arm';
      if(p.shouldAbort?.()) return 'cancelled';
      if(pickTarget(x,y)!==target) return 'blocked';
      await pressKey(KEY_I,0,target);
      if(!await waitFor(picking,p)) return p.shouldAbort?.()?'cancelled':fail('native-picker');
      await pressKey(KEY_I,0,target);
      if(!await waitFor(picking,p)) return p.shouldAbort?.()?'cancelled':fail('native-picker');
      if(p.shouldAbort?.()) return 'cancelled';
      if(pickTarget(x,y)!==target) return 'blocked';

      verification.phase='sample';
      // Completion and correctness are different. A completed wrong-color
      // sample can be retried; a missing response must never be retried blindly.
      pendingSample={complete:()=>alliance?!picking():selected().length===1};
      await click(target,x,y,0);
      if(!await waitFor(pendingSample.complete,p,2000))
        return p.shouldAbort?.()?'cancelled':fail('native-pending');
      pendingSample=null;
      // The next cell's move frame drains deferred palette focus. The sampled
      // color and native pixel state are still checked immediately before paint.
      await frames(p.sampleSettleFrames ?? 1);
      if(p.shouldAbort?.()) return 'cancelled';
      verification.selected=selected()[0]?.id || selected()[0]?.getAttribute('aria-label') || null;
      if(!correct()) {
        verification.phase='retry-color';
        move(target,x,y);
        await frames(1);
        continue;
      }
      await p.beforePaint?.();
      const final=await p.recheck?.();
      if(p.shouldAbort?.()) return 'cancelled';
      if(final?.kind==='matching') return 'matching';
      if(final?.kind==='transparent' || final?.kind==='outside') return 'deferred';
      if(!final?.ok) return fail(final?.reason || 'native-loading');
      if(final.kind!=='paint' || final.color!==p.expectedColor || !correct()) {
        verification.phase='retry-color';
        continue;
      }
      if(pickTarget(x,y)!==target) return 'blocked';
      verification.phase='paint';
      await click(target,x,y,0);
      verification.phase='done';
      return 'ok';
    }
    verification.phase='deferred';
    return 'deferred';
  }

  async function paintCell(x, y, p) {
    const target = pickTarget(x, y);
    if (!target) return 'blocked';
    if (p.canvasGuard && !onDrawSurface(target, p.guardTarget)) return 'blocked';

    if (p.shouldAbort?.()) return 'cancelled';
    move(target, x, y);
    await frames(p.moveFrames);

    if (p.shouldAbort?.()) return 'cancelled';
    if (p.nativeVerify) return paintVerified(target,x,y,p);
    if (p.useKey) {
      await pressKey(KEY_I, p.keyFrames ?? p.holdFrames, target);
      await frames(p.gapFrames);
    }

    if (p.shouldAbort?.()) return 'cancelled';
    if (pickTarget(x, y) !== target) return 'blocked';
    await p.beforePaint?.();
    const clicks = Math.max(1, p.clicks | 0);
    for (let i = 0; i < clicks; i++) {
      if (i > 0) await frames(p.useKey ? Math.max(2,p.gapFrames) : p.gapFrames);
      if (p.shouldAbort?.()) return 'cancelled';
      await click(target, x, y, p.holdFrames);
    }
    return 'ok';
  }

  function profileFrom(cfg) {
    const base = cfg.speed === 'custom' ? cfg.custom : PRESETS[cfg.speed] || PRESETS.fast;
    return {
      moveFrames: cfg.source === 'current' ? (base.currentMoveFrames ?? base.moveFrames) : base.moveFrames,
      holdFrames: base.holdFrames,
      keyFrames: base.keyFrames ?? base.holdFrames,
      gapFrames: base.gapFrames,
      clicks: base.clicks,
      targetRate: cfg.speed==='turbo' && cfg.comparisonMode==='native' && cfg.source!=='current' ? 25 : base.targetRate || 0,
      sampleSettleFrames: cfg.speed==='turbo' ? 0 : 1,
      nativeVerify: cfg.comparisonMode === 'native',
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
    if (p.useKey) f += (p.keyFrames ?? p.holdFrames) + p.gapFrames;
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
    verification,
    timing,
    resetTiming() { timing.frameWaitMs = 0; timing.frameWaits = 0; },
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
      return Math.max(p.targetRate ? 1000/p.targetRate : 0,
        (p.nativeVerify ? (p.moveFrames+(p.useKey?(p.sampleSettleFrames??1):0))*frameMs : framesPerCell(p)*frameMs)/pace) + (p.delay || 0);
    },
  };
})();
