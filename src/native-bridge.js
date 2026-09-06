/* Read-only adapter for Wplace's already-loaded build overlay.
   The only temporary setting is the official incorrect-pixel highlight, used
   to obtain its comparison results. No paint API or network write is called.
   Only observed, verified site builds are imported; unknown builds are diagnosed. */
(() => {
  'use strict';
  if (window.__apxNativeBridge) return;
  window.__apxNativeBridge = true;
  let modules, session = null, generation=0;
  const reply = (id, value) => document.dispatchEvent(new CustomEvent('apx:native-result', {
    detail: JSON.stringify({ id, ...value }),
  }));
  const seenModules=new Map();
  // Keep module sets together: mixing exports from separate site builds is unsafe.
  const builds = [
    {id:'wplace-B6mxrfTb',core:'B6mxrfTb.js',prefs:'Db9HDRn2.js',preview:'DKrwebdO.js',renderer:'B6e74eJx.js'},
    {id:'wplace-tX2H6UC0',core:'tX2H6UC0.js',prefs:'C3OwBbQa.js',preview:'Dk0Q_kgI.js',renderer:'D8DZ-h5y.js'},
  ];
  const knownFiles=new Set(builds.flatMap(b=>[b.core,b.prefs,b.preview,b.renderer]));
  const issue = (reason, detail) => Object.assign(new Error(reason),{detail});
  function rememberResources(entries) {
    for(const e of entries) {
      try {
        const u=new URL(e.name),file=u.pathname.split('/').pop();
        if(u.origin===location.origin && knownFiles.has(file) &&
           u.pathname==='/_app/immutable/chunks/'+file) seenModules.set(file,u.href);
      } catch {}
    }
  }
  function observedURL(file) {
    rememberResources(performance.getEntriesByType('resource'));
    // Script/modulepreload elements survive an evicted Resource Timing entry.
    rememberResources([...document.querySelectorAll('script[type="module"][src],link[rel="modulepreload"][href]')]
      .map(e=>({name:e.src || e.href})));
    return seenModules.get(file);
  }
  function loadedURL(file) {
    const url=observedURL(file);
    if(!url) throw issue('native-modules',file);
    return url;
  }
  async function loadModule(file) {
    const url=loadedURL(file);
    try { return await import(url); }
    catch { throw issue('native-module-load',file); }
  }
  const allianceSources = new WeakMap();
  let rendererInstalled = false, rendererInstalling = false;
  async function watchAllianceRenderer() {
    if (rendererInstalled || rendererInstalling) return;
    const build=builds.find(b=>observedURL(b.core));
    if(!build || !observedURL(build.renderer)) return;
    rendererInstalling = true;
    try {
      const mod = await loadModule(build.renderer), proto = mod.i?.prototype;
      if (typeof proto?.render !== 'function') return;
      const original = proto.render;
      proto.render = function(input) {
        const ok = original.call(this,input);
        const parent = this.canvas?.closest('.alliance-template-overlay');
        if (parent && ok && input?.source?.data) allianceSources.set(parent,input.source);
        return ok;
      };
      rendererInstalled = true;
      // Keep observing the verified adapter module URLs even if the page's finite
      // performance buffer fills with map tile requests.
    } finally { rendererInstalling = false; }
  }
  // Observe only this high-level site renderer, not WebGL or animation APIs.
  // Retain references in a WeakMap; no full-image copies or per-frame readback.
  const observer = new PerformanceObserver(list => { rememberResources(list.getEntries()); watchAllianceRenderer().catch(()=>{}); });
  observer.observe({type:'resource',buffered:true});
  watchAllianceRenderer().catch(()=>{});
  function allianceRead(s,req) {
    const stage=s.canvas, art=stage.querySelector('.artboard-frame');
    if(!stage.isConnected || !art) throw Error('native-canvas');
    let rgba=null, covered=false;
    const overlays=[...art.querySelectorAll('.alliance-template-overlay')];
    if(!overlays.length) throw Error('native-overlay');
    for(const overlay of overlays.reverse()) {
      const canvas=overlay.querySelector('canvas'), rect=overlay.getBoundingClientRect();
      if(!canvas || canvas.hidden || getComputedStyle(canvas).display==='none' ||
          !(Number(getComputedStyle(canvas).opacity)>0)) continue;
      if(req.x<rect.left || req.y<rect.top || req.x>=rect.right || req.y>=rect.bottom) continue;
      covered=true;
      const source=allianceSources.get(overlay);
      if(!source) throw Error('native-alliance-reopen');
      // Native picker quantizes the artwork pixel coordinate before scaling
      // into the dragged template. Recover that coordinate from board scale.
      const full=art.getBoundingClientRect();
      const board=art.querySelector(':scope > canvas.block.size-full');
      const selection=art.querySelector(':scope > canvas.size-full:not(.block)');
      const width=board?.width || selection?.width, height=board?.height || selection?.height;
      if(!width || !height) throw Error('native-unsupported');
      const scaleX=full.width/width,scaleY=full.height/height;
      const cellX=Math.floor((req.x-full.left)/scaleX),cellY=Math.floor((req.y-full.top)/scaleY);
      const sourceX=Math.floor((cellX-(rect.left-full.left)/scaleX)*source.width/(rect.width/scaleX)+1e-7);
      const sourceY=Math.floor((cellY-(rect.top-full.top)/scaleY)*source.height/(rect.height/scaleY)+1e-7);
      if(sourceX<0||sourceY<0||sourceX>=source.width||sourceY>=source.height) continue;
      const offset=(sourceY*source.width+sourceX)*4;
      const pixel=Array.from(source.data.subarray(offset,offset+4));
      if(pixel.length!==4) throw Error('native-unsupported');
      if(pixel[3]===0) continue;
      rgba=pixel;break;
    }
    if(!rgba) return {ok:true,kind:covered?'transparent':'outside'};
    const color=s.core.M.colors.findIndex((p,i)=>i>0&&p.rgb?.every((v,k)=>v===rgba[k]));
    if(color<1) throw Error('native-color');
    const boards=[...art.querySelectorAll(':scope > canvas.block.size-full, :scope > .hq-tile-layer > canvas')];
    const board=boards.find(c=>{const r=c.getBoundingClientRect();return req.x>=r.left&&req.y>=r.top&&req.x<r.right&&req.y<r.bottom});
    if(!board) throw Error('native-loading');
    const r=board.getBoundingClientRect(),ctx=board.getContext('2d');
    if(!ctx) throw Error('native-unsupported');
    const x=Math.floor((req.x-r.left)*board.width/r.width), y=Math.floor((req.y-r.top)*board.height/r.height);
    const actual=ctx.getImageData(x,y,1,1).data;
    const matching=actual[3]>0&&rgba.slice(0,3).every((v,i)=>v===actual[i]);
    return {ok:true,kind:matching?'matching':'paint',color,rgba,nativeKind:'alliance'};
  }
  async function connect() {
    if (!modules) {
      const build=builds.find(b=>observedURL(b.core));
      if(!build) throw issue('native-modules','core');
      modules = loadModule(build.core).then(core => {
        if(!core.tt || !Array.isArray(core.M?.colors) ||
           !core.M.colors.every(p=>Array.isArray(p.rgb)&&p.rgb.length===3))
          throw issue('native-protocol',build.core);
        return {core,build};
      }).catch(e => { modules=null; throw e; });
    }
    return modules;
  }
  function layerOf(map) {
    const wrapper = map?.getLayer?.('template-build-overlay-layer');
    return wrapper?.implementation || wrapper;
  }
  function visible(s) {
    const layer = layerOf(s.map), canvas = s.map.getCanvas();
    if (!canvas.isConnected || canvas !== s.canvas || !layer?.data?.pixels ||
        layer.data.hidden || !(layer.data.opacity > 0) || layer.renderDisabled ||
        layer.destroyed || layer.contextLost) throw Error('native-overlay');
    return layer;
  }
  const mercator = ([lng, lat]) => [
    (lng + 180) / 360,
    (1 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / Math.PI) / 2,
  ];
  function locate(layer, lngLat) {
    const d = layer.data, cs = d.coordinates;
    if (!Array.isArray(cs) || cs.length !== 4) throw Error('native-unsupported');
    const a = mercator(cs[0]), b = mercator(cs[1]), c = mercator(cs[2]), z = mercator(cs[3]);
    let right = b[0]; if (right < a[0]) right++;
    const width = right - a[0], height = z[1] - a[1];
    if (!(width > 0 && height > 0) || Math.abs(a[1]-b[1]) > 1e-8 ||
        Math.abs(c[1]-z[1]) > 1e-8) throw Error('native-unsupported');
    const point = mercator([lngLat.lng, lngLat.lat]);
    point[0] += Math.round((a[0] + width / 2) - point[0]);
    const x = Math.floor((point[0]-a[0]) / width * d.pixels.width + 1e-7);
    const y = Math.floor((point[1]-a[1]) / height * d.pixels.height + 1e-7);
    return { x, y, point, topLeft: a };
  }
  function end(token) {
    if (!session || (token && session.token !== token)) return;
    const s = session; session = null;
    s.off?.();
    // Do not undo a preference that the user changed in the meantime.
    if (s.changedHighlight && s.prefs.highlightIncorrectPixels === true)
      s.prefs.setHighlightIncorrectPixels(false);
  }
  document.addEventListener('apx:native-request', async event => {
    let req;
    try {
      req = JSON.parse(event.detail);
      if (!req || typeof req.id !== 'string') return;
      if (req.op === 'end') { generation++; end(req.token); reply(req.id, { ok: true }); return; }
      if (req.op === 'begin') {
        end();
        const runGeneration=++generation;
        const {core,build} = await connect();
        if(runGeneration!==generation) throw Error('native-session');
        const chosen=[...document.querySelectorAll('[data-apx-native-id]')].find(e=>e.getAttribute('data-apx-native-id')===req.canvas);
        const stage=chosen?.closest('.stage[role="application"]');
        if(stage?.querySelector('.artboard-frame')) {
          await watchAllianceRenderer();
          if(runGeneration!==generation) throw Error('native-session');
          session={token:req.token,core,canvas:stage,kind:'alliance'};
          reply(req.id,{ok:true,nativeKind:'alliance'});return;
        }
        const [{n:prefs},preview]=await Promise.all([
          loadModule(build.prefs),loadModule(build.preview),
        ]);
        if(runGeneration!==generation) throw Error('native-session');
        if(typeof prefs?.setHighlightIncorrectPixels!=='function' ||
           typeof prefs.highlightIncorrectPixels!=='boolean' || typeof preview.s!=='function')
          throw issue('native-protocol',build.id);
        const map = core.tt.map, canvas = map?.getCanvas?.();
        if (!canvas || canvas.getAttribute('data-apx-native-id') !== req.canvas)
          throw Error('native-canvas');
        const s = { token: req.token, core, prefs, map, canvas, pending: new Map() };
        visible(s);
        session = s;
        s.off = preview.s(values => {
          s.pending = new Map(values.map(v => [v.tile.join(',') + ':' + v.pixel.join(','), v.colorIdx]));
        });
        s.changedHighlight = !prefs.highlightIncorrectPixels;
        if (s.changedHighlight) prefs.setHighlightIncorrectPixels(true);
        reply(req.id, { ok: true }); return;
      }
      const s = session;
      if (!s || req.token !== s.token) throw Error('native-session');
      if (req.op !== 'read' || !Number.isFinite(req.x) || !Number.isFinite(req.y)) throw Error('native-unsupported');
      if(s.kind==='alliance') { reply(req.id,allianceRead(s,req)); return; }
      const layer = visible(s), rect = s.canvas.getBoundingClientRect();
      if (!Number.isFinite(req.x) || !Number.isFinite(req.y) ||
          req.x < rect.left || req.y < rect.top || req.x >= rect.right || req.y >= rect.bottom)
        throw Error('native-canvas');
      const lngLat = s.map.unproject([req.x-rect.left, req.y-rect.top]);
      const { x, y, point, topLeft } = locate(layer, lngLat);
      const pixels = layer.data.pixels;
      if (x < 0 || y < 0 || x >= pixels.width || y >= pixels.height) {
        reply(req.id, { ok: true, kind: 'outside' }); return;
      }
      const i = (y*pixels.width+x)*4, rgba = Array.from(pixels.data.subarray(i,i+4));
      if (rgba.length !== 4) throw Error('native-unsupported');
      if (rgba[3] < 16) { reply(req.id, { ok: true, kind: 'transparent' }); return; }
      const color = s.core.M.colors.findIndex((p, index) => index > 0 &&
        p.rgb?.every((v,k) => v === rgba[k]));
      if (color < 1) throw Error('native-color');
      const progress = layer.data.statusHighlights?.progress;
      if (!progress || progress.width !== pixels.width || progress.height !== pixels.height ||
          typeof layer.getProgressStatus !== 'function') throw Error('native-loading');
      const world = progress.tileSize * 2 ** layer.logicalTileZoom;
      if (!Number.isFinite(world) || Math.abs(topLeft[0]*world-progress.originX)>0.02 ||
          Math.abs(topLeft[1]*world-progress.originY)>0.02) throw Error('native-loading');
      const px = progress.originX+x, py = progress.originY+y, tileSize = progress.tileSize;
      const tileX = Math.floor(px/tileSize), tileY = Math.floor(py/tileSize);
      const key = [tileX,tileY].join(',') + ':' +
        [px-tileX*tileSize,py-tileY*tileSize].join(',');
      const pending = s.pending.get(key);
      const status = pending !== undefined ? (pending === color ? 1 : 3)
        : layer.getProgressStatus(progress,x,y);
      if (![1,2,3].includes(status)) throw Error('native-loading');
      reply(req.id, { ok: true, kind: status === 1 ? 'matching' : 'paint',
        color, rgba, status, pixel: key });
    } catch (e) {
      reply(req?.id, { ok: false, reason: /^native-/.test(e.message) ? e.message : 'native-protocol', detail: e.detail || '' });
    }
  });
  addEventListener('pagehide', () => end());
})();
