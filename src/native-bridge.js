/* Read-only adapter for Wplace's already-loaded build overlay.
   The only temporary setting is the official incorrect-pixel highlight, used
   to obtain its comparison results. No paint API or network write is called.
   Observed same-origin modules are classified by source and validated by exports. */
(() => {
  'use strict';
  if (window.__apxNativeBridge) return;
  window.__apxNativeBridge = true;
  let modules, session = null, generation=0;
  const reply = (id, value) => document.dispatchEvent(new CustomEvent('apx:native-result', {
    detail: JSON.stringify({ id, ...value }),
  }));
  const issue = (reason, detail) => Object.assign(new Error(reason),{detail});
  const resources=new Map(), candidates={core:[],prefs:[],preview:[],renderer:[]};
  const imports=new Map(), queue=[], allianceSources=new WeakMap(), hookedRenderers=new WeakSet();
  const discovery={phase:'observing',observed:0,checked:0,failed:0,roles:{}};
  let workers=0;
  function moduleURL(value) {
    try {
      const u=new URL(value,location.href);
      return u.origin===location.origin &&
        /^\/_app\/immutable\/chunks\/[A-Za-z0-9_.-]+\.js$/.test(u.pathname) ? u.href : null;
    } catch { return null; }
  }
  function classify(source) {
    // Semantic anchors select a module to inspect; exports are validated separately.
    if (/get\s+map\s*\(\s*\)/.test(source) && /set\s+map\s*\(/.test(source) &&
        /(?:\.colors\b|colors\s*:)/.test(source)) return 'core';
    if (/\bsetHighlightIncorrectPixels\s*\(\s*[\w$]+\s*\)\s*\{/.test(source) && source.includes('highlightIncorrectPixels'))
      return 'prefs';
    if (source.includes('Pending paint preview listener failed.') &&
        /\.add\s*\(/.test(source) && /\.delete\s*\(/.test(source)) return 'preview';
    if (source.includes('status_marker_color') && source.includes('this.canvas') &&
        /\brender\s*\(/.test(source)) return 'renderer';
    return null;
  }
  function rememberResources(entries) {
    for(const entry of entries) {
      const url=moduleURL(entry.name);
      if(!url || resources.has(url) || resources.size>=256) continue;
      const record={url,state:'queued',attempts:0};
      resources.set(url,record);queue.push(record);
    }
    discovery.observed=resources.size;
    pump();
  }
  function refreshResources() {
    rememberResources(performance.getEntriesByType('resource'));
    rememberResources([...document.querySelectorAll('script[type="module"][src],link[rel="modulepreload"][href]')]
      .map(e=>({name:e.src || e.href})));
  }
  async function inspect(record) {
    record.state='reading';record.attempts++;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);
    try {
      const response=await fetch(record.url,{cache:'force-cache',credentials:'same-origin',
        redirect:'error',signal:controller.signal});
      if(!response.ok || !/(?:javascript|ecmascript)/i.test(response.headers.get('content-type')||''))
        throw Error('source');
      if(Number(response.headers.get('content-length'))>1500000) {record.state='ignored';return;}
      const source=await response.text();
      if(source.length>1500000) {record.state='ignored';return;}
      const role=classify(source);
      if(role) {record.role=role;candidates[role].push(record);if(role==='renderer') watchAllianceRenderer().catch(()=>{});}
      record.state='checked';discovery.checked++;
    } catch {record.state='failed';discovery.failed++;}
    finally {clearTimeout(timer);}
  }
  function pump() {
    while(workers<4 && queue.length) {
      const record=queue.shift();workers++;
      inspect(record).finally(()=>{workers--;pump();});
    }
  }
  function loadModule(record) {
    if(!imports.has(record.url)) {
      imports.set(record.url,import(record.url).catch(()=>{
        imports.delete(record.url);
        throw issue('native-module-load',record.url.split('/').pop());
      }));
    }
    return imports.get(record.url);
  }
  const values = mod => [...new Set(Object.values(mod))].filter(v=>v && (typeof v==='object'||typeof v==='function'));
  function normalize(role,mod) {
    const all=values(mod),one=matches=>matches.length===1?matches[0]:null;
    if(role==='core') {
      const M=one(all.filter(v=>Array.isArray(v.colors) && v.colors.length>1 &&
        v.colors.every(p=>Array.isArray(p.rgb)&&p.rgb.length===3&&p.rgb.every(n=>Number.isInteger(n)&&n>=0&&n<=255))));
      const tt=one(all.filter(v=>typeof v==='object' && 'map' in v &&
        (!v.map || (typeof v.map.getCanvas==='function' && typeof v.map.getLayer==='function' &&
          typeof v.map.unproject==='function'))));
      return M&&tt?{M,tt}:null;
    }
    if(role==='prefs') return one(all.filter(v=>typeof v.setHighlightIncorrectPixels==='function' &&
      typeof v.highlightIncorrectPixels==='boolean'));
    if(role==='preview') {
      const subscribe=one(all.filter(v=>typeof v==='function' &&
        /\.add\s*\(/.test(Function.prototype.toString.call(v)) &&
        /\.delete\s*\(/.test(Function.prototype.toString.call(v))));
      return subscribe?{s:subscribe}:null;
    }
    if(role==='renderer') return one(all.filter(v=>typeof v==='function' && typeof v.prototype?.render==='function'));
    return null;
  }
  async function resolveRole(role,deadline) {
    discovery.phase='finding-'+role;
    while(performance.now()<deadline) {
      refreshResources();
      if(candidates[role].length>1)
        throw issue('native-protocol','ambiguous '+role);
      const record=candidates[role][0];
      if(record) {
        const value=normalize(role,await loadModule(record));
        if(!value) throw issue('native-protocol',role+': '+record.url.split('/').pop());
        discovery.roles[role]=record.url.split('/').pop();
        return value;
      }
      await new Promise(r=>setTimeout(r,25));
    }
    throw issue(discovery.failed?'native-module-load':'native-modules',
      role+' / '+discovery.checked+'/'+discovery.observed+' modules');
  }
  async function watchAllianceRenderer() {
    for(const record of candidates.renderer) {
      const Renderer=normalize('renderer',await loadModule(record));
      if(!Renderer) continue;
      const proto=Renderer.prototype;
      if(hookedRenderers.has(proto)) continue;
      const original=proto.render;
      proto.render=function(input) {
        const ok=original.call(this,input);
        const parent=this.canvas?.closest('.alliance-template-overlay');
        if(parent && ok && input?.source?.data) allianceSources.set(parent,input.source);
        return ok;
      };
      hookedRenderers.add(proto);
      discovery.roles.renderer=record.url.split('/').pop();
    }
  }
  const observer=new PerformanceObserver(list=>rememberResources(list.getEntries()));
  observer.observe({type:'resource',buffered:true});
  refreshResources();
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
  async function connect(deadline) {
    if(!modules) modules=resolveRole('core',deadline).then(core=>({core}))
      .catch(e=>{modules=null;throw e;});
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
        const deadline=performance.now()+5500;
        for(const record of resources.values()) if(record.state==='failed') {
          record.state='queued';queue.push(record);
        }
        pump();
        const {core} = await connect(deadline);
        if(runGeneration!==generation) throw Error('native-session');
        const chosen=[...document.querySelectorAll('[data-apx-native-id]')].find(e=>e.getAttribute('data-apx-native-id')===req.canvas);
        const stage=chosen?.closest('.stage[role="application"]');
        if(stage?.querySelector('.artboard-frame')) {
          await resolveRole('renderer',deadline);
          await watchAllianceRenderer();
          if(runGeneration!==generation) throw Error('native-session');
          session={token:req.token,core,canvas:stage,kind:'alliance'};
          discovery.phase='ready';reply(req.id,{ok:true,nativeKind:'alliance',discovery});return;
        }
        const [prefs,preview]=await Promise.all([
          resolveRole('prefs',deadline),resolveRole('preview',deadline),
        ]);
        if(runGeneration!==generation) throw Error('native-session');
        if(typeof prefs?.setHighlightIncorrectPixels!=='function' ||
           typeof prefs.highlightIncorrectPixels!=='boolean' || typeof preview.s!=='function')
          throw issue('native-protocol','prefs/preview');
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
        discovery.phase='ready';reply(req.id, { ok: true, discovery }); return;
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
      reply(req?.id, { ok: false, reason: /^native-/.test(e.message) ? e.message : 'native-protocol', detail: e.detail || '', discovery });
    }
  });
  addEventListener('pagehide', () => end());
})();
