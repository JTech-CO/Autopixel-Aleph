const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'), manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const results=[];
let browser;
const oldFiles=['tX2H6UC0.js','C3OwBbQa.js','Dk0Q_kgI.js','D8DZ-h5y.js'];
const newFiles=['B6mxrfTb.js','Db9HDRn2.js','DKrwebdO.js','B6e74eJx.js'];
const defaultFiles=process.env.NATIVE_SITE_BUILD==='renamed'?['future-core.js','future-prefs.js','future-preview.js','future-renderer.js']:process.env.NATIVE_SITE_BUILD==='current'?newFiles:oldFiles;
async function boot(options={}){
 const files=options.files||defaultFiles;
 const aliases=options.aliases??(process.env.NATIVE_EXPORT_ALIASES==='1');
 const page=await browser.newPage({viewport:{width:1440,height:950}});
 await page.route('https://native.test/**',async route=>{
  const requested=new URL(route.request().url()).pathname.split('/').pop();
  const name=oldFiles[files.indexOf(requested)] || requested;
  let code={
   'D8DZ-h5y.js':'export const shader="status_marker_color"; export class i {constructor(canvas){this.canvas=canvas} render(input){return true}}',
   'tX2H6UC0.js':'export const tt={get map(){return window.fixture.map},set map(v){window.fixture.map=v}}; export const M={colors:[{rgb:[0,0,0]},{rgb:[255,0,0]},{rgb:[0,0,255]}]};',
   'C3OwBbQa.js':'export const n={get highlightIncorrectPixels(){return window.fixture.prefs.highlightIncorrectPixels},setHighlightIncorrectPixels(v){window.fixture.prefs.setHighlightIncorrectPixels(v)}};',
   'Dk0Q_kgI.js':'const listeners=new Set;export const s=fn=>{listeners.add(fn);window.fixture.preview=fn;try{fn(window.fixture.pending)}catch(e){console.error("Pending paint preview listener failed.",e)}return()=>{listeners.delete(fn);window.fixture.preview=null}};'
  }[name];
  if(options.invalidCore && name===oldFiles[0]) code='export const tt={get map(){return window.fixture.map},set map(v){}};export const M={colors:null};';
  if(options.unrecognized && name===oldFiles[0]) code='export const unused=true;';
  if(aliases && code) code=code.replace('export const tt=','export const mapState=').replace('export const M=','export const paletteState=').replace('export const n=','export const preferences=').replace('export const s=','export const subscribe=').replace('export class i ','export class TemplateRenderer ');
  if(requested==='unrelated-module.js') code='window.unrelatedExecuted=true;export const value=42;';
  if(route.request().resourceType()==='fetch' && name===oldFiles[0]){
   if(options.sourceFailOnce && !(await page.evaluate(()=>window.fixture.allowSource))) return route.fulfill({status:503,body:'Temporary failure'});
   if(options.sourceDelay) await new Promise(r=>setTimeout(r,options.sourceDelay));
  }
  route.fulfill({contentType:code?'text/javascript':'text/html',body:code||'<style>body{margin:0}#board{position:absolute;left:400px;top:180px;width:600px;height:400px}#palette{position:absolute;left:400px;top:650px}#palette button{width:30px;height:30px}</style><canvas id="board" width="600" height="400"></canvas><div id="palette"><button id="color-1" class="ring-2 border-primary">red</button><button id="color-2">blue</button></div>'});
 });
 await page.goto('https://native.test/');
 await page.evaluate(files=>{
  window.fixtureFiles=files;
  window.chrome={storage:{local:{get:(key,cb)=>cb({}),set:value=>{window.fixtureSaved=Object.values(value)[0]}}}};
  const size=1024, zoom=11, world=size*2**zoom, x0=1000,y0=1000,w=100,h=10;
  const lat=y=>Math.atan(Math.sinh(Math.PI*(1-2*y/world)))*180/Math.PI;
  const coord=(x,y)=>[x/world*360-180,lat(y)];
  const colors=[[0,0,0],[255,0,0],[0,0,255]], data=new Uint8ClampedArray(w*h*4);
  for(let i=0;i<w*h;i++)data.set([...colors[i%2+1],255],i*4);
  const pixels={width:w,height:h,data}, progress={width:w,height:h,originX:x0,originY:y0,tileSize:size};
  const statuses=new Array(w*h).fill(3),board=document.querySelector('#board');
  const prefs={highlightIncorrectPixels:false,setHighlightIncorrectPixels(v){this.highlightIncorrectPixels=v;layer.data.statusHighlights=v?{progress}:null}};
  const layer={logicalTileZoom:zoom,data:{pixels,coordinates:[coord(x0,y0),coord(x0+w,y0),coord(x0+w,y0+h),coord(x0,y0+h)],opacity:.5,hidden:false,statusHighlights:null},getProgressStatus:(p,x,y)=>statuses[y*w+x]};
  const map={getCanvas:()=>board,getLayer:()=>layer,unproject:([x,y])=>{const p=coord(x0+x/600*w,y0+y/400*h);return {lng:p[0],lat:p[1]}}};
  const f=window.fixture={map,layer,prefs,pending:[],statuses,pixels,keys:0,samples:0,paints:[],wrong:0,selected:1,picker:false,delay:0,drop:false,errors:[],hover:0};
  f.select=color=>{
   document.querySelectorAll('#palette button').forEach(b=>b.className='');
   document.querySelector('#color-'+color).className='ring-2 border-primary';f.selected=color;f.picker=false;
   if(f.deferredFocus) requestAnimationFrame(()=>document.querySelector('#color-'+color)?.focus());
  };
  board.addEventListener('mousemove',e=>{const i=Math.floor((e.clientY-180)/40)*100+Math.floor((e.clientX-400)/6);if(f.frameHover)requestAnimationFrame(()=>f.hover=i);else f.hover=i});
  document.addEventListener('keypress',e=>{if(e.code!=='KeyI')return;f.keys++;f.picker=true;document.querySelectorAll('#palette button').forEach(b=>b.className='')});
  board.addEventListener('click',e=>{
   const i=Math.floor((e.clientY-180)/40)*100+Math.floor((e.clientX-400)/6);
   if(f.picker){
    f.samples++; const color=f.pixels.data[(f.frameHover?f.hover:i)*4]===255?1:2;
    if(f.drop)return;
    const delay=f.variable?([0,2,8,18,35,55,120][i%7]):f.delay;
    setTimeout(()=>f.select(f.wrongSample?(color===1?2:1):color),delay);
   }else{
    f.paints.push({i,color:f.selected,time:performance.now()});
    if(f.selected!==(f.pixels.data[i*4]===255?1:2))f.wrong++;
    statuses[i]=1;
   }
  });
  for(const file of files.slice(0,3)){
   const script=document.createElement('script');script.type='module';script.src='/_app/immutable/chunks/'+file;document.head.append(script);
  }
 },files);
 await page.waitForFunction(()=>performance.getEntriesByType('resource').filter(e=>e.name.endsWith('.js')).length===3);
 // Ensure simulated site modules are evaluated before the extension reads them.
 await page.evaluate(async()=>{await Promise.all(fixtureFiles.slice(0,3).map(n=>import('/_app/immutable/chunks/'+n)))});
 if(options.unrelated) await page.evaluate(()=>fetch('/_app/immutable/chunks/unrelated-module.js'));
 if(options.clearTiming) await page.evaluate(()=>performance.clearResourceTimings());
 for(const s of manifest.content_scripts.flatMap(c=>c.js)) {
  const baseline=process.env.LIVE_BASELINE && ['native-bridge.js','native.js','engine.js','runner.js'].includes(path.basename(s));
  await page.addScriptTag({path:baseline?path.resolve(root,'../snapshots/autopixel-aleph-2.2.0-wplace-update-1',s):s==='src/native-bridge.js'&&options.bridge?options.bridge:path.join(root,s)});
 }
 await page.evaluate(()=>{__APX.engine.rememberTarget(403,200);__APX.grid.setCalibration({x:403,y:200},{x:463,y:200},10)});
 return page;
}
async function run(page,count=30,speed='turbo',skipMatching=true,source='overlay',variableFill=false){
 return page.evaluate(async({count,speed,skipMatching,source,variableFill})=>{
  const n=__APX,f=fixture;
  n.store.set({comparisonMode:'native',source,speed,variableFill});
  const cells=Array.from({length:count},(_,i)=>({c:i%100,r:Math.floor(i/100),x:403+i%100*6,y:200+Math.floor(i/100)*40}));
  await n.runner.start(cells,n.engine.profileFrom(n.store.cfg),{guard:false,skipMatching},{});
  return {...n.runner.diagnostics(),error:n.runner.state.error,keys:f.keys,samples:f.samples,wrong:f.wrong,
    paints:f.paints,highlight:f.prefs.highlightIncorrectPixels};
 },{count,speed,skipMatching,source,variableFill});
}
async function test(name,fn){if(process.env.NATIVE_TEST_FILTER&&!new RegExp(process.env.NATIVE_TEST_FILTER).test(name))return;const value=await fn();results.push({name,...value});console.log('PASS',name,JSON.stringify(value||{}))}
(async()=>{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 if(process.env.NATIVE_BASELINE_BRIDGE) await test('fixed-name bridge rejects renamed site modules before paint',async()=>{
  const p=await boot({files:['future-core.js','future-prefs.js','future-preview.js','future-renderer.js'],bridge:process.env.NATIVE_BASELINE_BRIDGE});
  const r=await run(p,4);assert.equal(r.error,'native-modules');assert.equal(r.samples,0);assert.equal(r.painted,0);await p.close();
 });
 async function solid(p,count=1000) {
  await p.evaluate(count=>{for(let i=0;i<count;i++)fixture.pixels.data.set([255,0,0,255],i*4)},count);
 }
 await test('variable fill is opt-in, persists, and is only offered for native Overlay',async()=>{
  const p=await boot();
  assert.equal(await p.evaluate(()=>__APX.store.cfg.variableFill),false);
  await p.locator('#autopixel-x-root #variableFill').check();
  assert.equal(await p.evaluate(()=>__APX.store.cfg.variableFill),true);
  assert.match(await p.locator('#autopixel-x-root #speed [data-v="turbo"]').innerText(),/25~30/);
  await p.locator('#autopixel-x-root #lang').click();
  assert.match(await p.locator('#autopixel-x-root #variableFillRow').innerText(),/가변 채우기/);
  await p.evaluate(()=>__APX.store.set({source:'current'}));
  assert.equal(await p.locator('#autopixel-x-root #variableFillRow').isVisible(),false);
  assert.equal(await p.evaluate(()=>__APX.engine.profileFrom(__APX.store.cfg).variableFill),false);
  await p.evaluate(()=>__APX.store.set({source:'overlay',comparisonMode:'live'}));
  assert.equal(await p.evaluate(()=>__APX.engine.profileFrom(__APX.store.cfg).variableFill),false);
  await p.evaluate(()=>__APX.store.set({comparisonMode:'native'}));
  assert.equal(await p.locator('#autopixel-x-root #variableFill').isChecked(),true);
  await p.waitForFunction(()=>window.fixtureSaved?.variableFill===true);
  await p.screenshot({path:path.join(root,'tests/variable-fill.png')});await p.close();
 });
 await test('variable fill disabled still samples every solid cell',async()=>{
  const p=await boot();await solid(p);
  const r=await run(p,8);assert.equal(r.error,null);assert.equal(r.samples,8);assert.equal(r.verification.reused,0);await p.close();
 });
 await test('variable fill samples only at color boundaries and keeps both colors',async()=>{
  const p=await boot();await solid(p);
  await p.evaluate(()=>{for(let i=3;i<5;i++)fixture.pixels.data.set([0,0,255,255],i*4)});
  const r=await run(p,5,'turbo',true,'overlay',true);
  assert.equal(r.error,null);assert.equal(r.painted,5);assert.equal(r.samples,2);assert.equal(r.keys,4);
  assert.equal(r.verification.reused,3);assert.equal(r.wrong,0);
  assert.deepEqual(r.paints.map(v=>v.color),[1,1,1,2,2]);await p.close();
 });
 for(const speed of ['safe','fast','turbo']) await test('variable fill solid area respects '+speed+' ceiling',async()=>{
  const p=await boot();await solid(p);await p.evaluate(()=>{fixture.frameHover=true;fixture.deferredFocus=true;fixture.delay=18});
  const r=await run(p,60,speed,true,'overlay',true),cap={safe:10,fast:20,turbo:30}[speed];
  assert.equal(r.error,null);assert.equal(r.painted,60);assert.equal(r.samples,1);assert.equal(r.keys,2);
  assert.equal(r.verification.reused,59);assert.equal(r.wrong,0);
  const rate=59000/(r.paints.at(-1).time-r.paints[0].time);
  assert.ok(rate<=cap*1.035,JSON.stringify({rate,cap}));
  assert.ok(r.paints.slice(1).every((v,i)=>v.time-r.paints[i].time>=1000/cap-0.5));
  if(speed==='turbo')assert.ok(rate>=26,JSON.stringify({rate,cap}));
  await p.close();return {painted:60,samples:1,reused:59,wrong:0,rate,cap};
 });
 await test('variable fill alternating colors keeps normal two-key sampling and turbo ceiling',async()=>{
  const p=await boot();const r=await run(p,40,'turbo',true,'overlay',true);
  assert.equal(r.error,null);assert.equal(r.painted,40);assert.equal(r.samples,40);assert.equal(r.keys,80);
  assert.equal(r.verification.reused,0);assert.equal(r.wrong,0);
  const rate=39000/(r.paints.at(-1).time-r.paints[0].time);assert.ok(rate<=25.5);
  await p.close();return {rate};
 });
 await test('variable fill skips completed, transparent and outside cells',async()=>{
  const p=await boot();await solid(p);await p.evaluate(()=>{
   fixture.statuses[0]=1;fixture.pixels.data[7]=0;
   const unproject=fixture.map.unproject;
   fixture.map.unproject=([x,y])=>unproject([x>29?x+6000:x,y]);
  });
  const r=await run(p,6,'turbo',true,'overlay',true);
  assert.equal(r.error,null);assert.equal(r.painted,3);assert.equal(r.matched,1);
  assert.equal(r.transparent,1);assert.equal(r.outside,1);assert.equal(r.samples,1);assert.equal(r.wrong,0);await p.close();
 });
 await test('variable fill setting does not change Current color filtering',async()=>{
  const p=await boot();const r=await run(p,5,'turbo',true,'current',true);
  assert.equal(r.error,null);assert.equal(r.painted,3);assert.equal(r.filtered,2);assert.equal(r.samples,0);assert.equal(r.wrong,0);await p.close();
 });
 // Change state after the reuse decision, while the per-click pacer is waiting.
 async function duringReuse(p,action) {
  await p.evaluate(action=>{
   const original=__APX.engine.paintCell;
   __APX.engine.paintCell=async(x,y,profile)=>{
    if(!profile.testWrapped) {
     profile.testWrapped=true;const before=profile.beforePaint;
     profile.beforePaint=async reuse=>{
      await before(reuse);
      if(reuse&&!fixture.interrupted){fixture.interrupted=true;action=String(action);(0,eval)('('+action+')')();}
     };
    }
    return original(x,y,profile);
   };
  },action.toString());
 }
 await test('variable fill changed palette during pacing is re-sampled before paint',async()=>{
  const p=await boot();await solid(p);await duringReuse(p,()=>fixture.select(2));
  const r=await run(p,5,'turbo',true,'overlay',true);
  assert.equal(r.error,null);assert.equal(r.painted,5);assert.equal(r.samples,2);assert.equal(r.wrong,0);await p.close();
 });
 await test('variable fill rechecks completed pixels immediately before a reused click',async()=>{
  const p=await boot();await solid(p);await duringReuse(p,()=>fixture.statuses[1]=1);
  const r=await run(p,4,'turbo',true,'overlay',true);
  assert.equal(r.error,null);assert.equal(r.painted,3);assert.equal(r.matched,1);assert.equal(r.samples,1);assert.equal(r.wrong,0);await p.close();
 });
 await test('variable fill template replacement cancels reuse and revisits the area',async()=>{
  const p=await boot();await solid(p);await duringReuse(p,()=>{
   const f=fixture;f.pixels={...f.pixels,data:f.pixels.data.slice()};
   for(let i=0;i<4;i++)f.pixels.data.set([0,0,255,255],i*4);
   f.layer.data.pixels=f.pixels;f.layer.data.statusHighlights={progress:{...f.layer.data.statusHighlights.progress}};
   f.statuses.fill(3);
  });
  const r=await run(p,4,'turbo',true,'overlay',true);
  assert.equal(r.error,null);assert.equal(r.painted,5);assert.equal(r.samples,2);assert.equal(r.wrong,0);
  assert.equal(r.overlayRestarts,1);assert.deepEqual(r.paints.map(v=>v.color),[1,2,2,2,2]);await p.close();
 });
 await test('variable fill pause and resume requires fresh sampling',async()=>{
  const p=await boot();await solid(p);await p.evaluate(()=>document.querySelector('#board').addEventListener('click',()=>{
   if(fixture.pausedOnce||!fixture.paints.length)return;
   fixture.pausedOnce=true;__APX.runner.pause();setTimeout(()=>__APX.runner.resume(),35);
  }));
  const r=await run(p,4,'turbo',true,'overlay',true);
  assert.equal(r.error,null);assert.equal(r.painted,4);assert.equal(r.samples,2);assert.equal(r.wrong,0);await p.close();
 });
 await test('variable fill Stop during reuse sends no next paint',async()=>{
  const p=await boot();await solid(p);await duringReuse(p,()=>__APX.runner.stop());
  const r=await run(p,5,'turbo',true,'overlay',true);
  assert.equal(r.error,null);assert.equal(r.painted,1);assert.equal(r.samples,1);assert.equal(r.wrong,0);await p.close();
 });
 await test('variable fill late response after Stop cannot be reused by the next run',async()=>{
  const p=await boot();await solid(p);await p.evaluate(()=>{fixture.delay=400;setTimeout(()=>__APX.runner.stop(),100)});
  const first=await run(p,5,'turbo',true,'overlay',true);assert.equal(first.painted,0);
  await p.evaluate(()=>fixture.delay=0);
  const r=await run(p,5,'turbo',true,'overlay',true);
  assert.equal(r.error,null);assert.equal(r.painted,5);assert.equal(r.samples,2);assert.equal(r.keys,4);
  assert.equal(r.verification.reused,4);assert.equal(r.wrong,0);await p.close();
 });
 await test('variable fill quick pause and resume during delayed sampling discards the old proof',async()=>{
  const p=await boot();await solid(p);await p.evaluate(()=>{
   fixture.delay=100;
   document.querySelector('#board').addEventListener('click',()=>{
    if(fixture.quickPause||!fixture.picker)return;fixture.quickPause=true;
    setTimeout(()=>{__APX.runner.pause();__APX.runner.resume()},20);
   });
  });
  const r=await run(p,4,'turbo',true,'overlay',true);
  assert.equal(r.error,null);assert.equal(r.painted,4);assert.equal(r.samples,2);
  assert.equal(r.verification.reused,3);assert.equal(r.wrong,0);await p.close();
 });
 await test('variable fill comparison failure during reuse stops before painting',async()=>{
  const p=await boot();await solid(p);await duringReuse(p,()=>{
   __APX.native.read=async()=>({ok:false,reason:'native-loading'});
  });
  const r=await run(p,5,'turbo',true,'overlay',true);
  assert.equal(r.error,'native-loading');assert.equal(r.painted,1);assert.equal(r.wrong,0);await p.close();
 });
 await test('variable fill 1000 mixed cells with delayed responses preserve every color',async()=>{
  const p=await boot();await p.evaluate(()=>{
   for(let i=0;i<1000;i++)fixture.pixels.data.set(Math.floor(i/10)%2?[0,0,255,255]:[255,0,0,255],i*4);
   fixture.variable=true;fixture.frameHover=true;fixture.deferredFocus=true;
  });
  const r=await run(p,1000,'turbo',true,'overlay',true);
  assert.equal(r.error,null);assert.equal(r.painted,1000);assert.equal(r.wrong,0);
  assert.equal(r.samples,100);assert.equal(r.keys,200);assert.equal(r.verification.reused,900);
  await p.close();return {painted:r.painted,samples:r.samples,reused:r.verification.reused,wrong:r.wrong,rate:1000/(r.elapsedMs/1000)};
 });
 await test('variable fill wrong sample still retries before any color reuse',async()=>{
  const p=await boot();await solid(p);await p.evaluate(()=>{
   fixture.wrongSample=true;const select=fixture.select;
   fixture.select=color=>{select(color);fixture.wrongSample=false};
  });
  const r=await run(p,4,'turbo',true,'overlay',true);
  assert.equal(r.error,null);assert.equal(r.painted,4);assert.equal(r.samples,2);assert.equal(r.verification.reused,3);assert.equal(r.wrong,0);await p.close();
 });
 for(const source of ['overlay','current']) for(const replacement of ['buffer','layer','in-place']) await test('live overlay '+source+' revisits skipped cells after '+replacement+' replacement',async()=>{
  const p=await boot();await p.evaluate(({replacement,source})=>{
   const f=fixture;
   for(let i=0;i<6;i++)f.pixels.data.set([255,0,0,255],i*4);
   f.statuses[0]=1;f.pixels.data[7]=0;
   __APX.grid.setRegionFromClient(403,200,433,200);
   f.gridBefore=JSON.stringify(__APX.grid.snapshot());
   document.querySelector('#board').addEventListener('click',()=>{
    if(f.updated || !f.paints.length)return;
    f.updated=true;
    if(replacement!=='in-place') {
     f.pixels={...f.pixels,data:f.pixels.data.slice()};
     if(replacement==='layer') {f.layer={...f.layer,data:{...f.layer.data}};f.map.getLayer=()=>f.layer;}
     f.layer.data.pixels=f.pixels;
     f.layer.data.statusHighlights={progress:{...f.layer.data.statusHighlights.progress}};
    }
    f.pixels.data.set([255,0,0,255],4);f.statuses[0]=3;
   });
  },{replacement,source});
  const r=await run(p,6,'turbo',true,source);
  assert.equal(r.error,null,JSON.stringify(r));assert.equal(r.wrong,0);assert.equal(r.painted,6);
  assert.ok(r.paints.some(v=>v.i===0));assert.ok(r.paints.some(v=>v.i===1));
  assert.ok(r.overlayRestarts>=1);assert.ok(r.overlayRestarts<=2);
  assert.equal(await p.evaluate(()=>JSON.stringify(__APX.grid.snapshot())===fixture.gridBefore),true);
  await p.close();return {painted:r.painted,wrong:r.wrong,restarts:r.overlayRestarts};
 });
 await test('live overlay late picker result from replaced template never paints the old color',async()=>{
  const p=await boot();await p.evaluate(()=>{
   const f=fixture;f.delay=80;
   document.querySelector('#board').addEventListener('click',()=>{
    if(f.updated||!f.samples)return;f.updated=true;
    f.pixels={...f.pixels,data:f.pixels.data.slice()};
    for(let i=0;i<4;i++)f.pixels.data.set([0,0,255,255],i*4);
    f.layer.data.pixels=f.pixels;
    f.layer.data.statusHighlights={progress:{...f.layer.data.statusHighlights.progress}};
   });
  });
  const r=await run(p,4);assert.equal(r.error,null,JSON.stringify(r));assert.equal(r.wrong,0);
  assert.equal(r.painted,4);assert.ok(r.paints.every(v=>v.color===2));assert.ok(r.overlayRestarts>=1);await p.close();
 });
 await test('live overlay change during the last paint is inspected before completion',async()=>{
  const p=await boot();await p.evaluate(()=>{
   fixture.statuses[0]=1;
   document.querySelector('#board').addEventListener('click',()=>{
    if(fixture.updated||!fixture.paints.length)return;
    fixture.updated=true;fixture.statuses[0]=3;
   });
  });
  const r=await run(p,2);assert.equal(r.error,null);assert.equal(r.painted,2);assert.equal(r.wrong,0);
  assert.ok(r.paints.some(v=>v.i===0));assert.equal(r.overlayRestarts,1);await p.close();
 });
 await test('live overlay waits for fresh progress with identical dimensions and origin',async()=>{
  const p=await boot();await p.evaluate(()=>{
   const f=fixture;f.delay=50;
   document.querySelector('#board').addEventListener('click',()=>{
    if(f.updated || !f.samples)return;f.updated=true;
    f.pixels={...f.pixels,data:f.pixels.data.slice()};
    f.pixels.data.set([0,0,255,255],0);f.layer.data.pixels=f.pixels;
    // Old progress falsely labels the new blue target as completed.
    f.statuses[0]=1;
    setTimeout(()=>{
     f.statuses[0]=3;
     f.layer.data.statusHighlights={progress:{...f.layer.data.statusHighlights.progress}};
    },250);
   });
  });
  const r=await run(p,2);assert.equal(r.error,null,JSON.stringify(r));
  assert.equal(r.painted,2);assert.equal(r.wrong,0);assert.equal(r.paints[0].color,2);await p.close();
 });
 await test('live overlay temporary layer replacement keeps the run alive',async()=>{
  const p=await boot();await p.evaluate(()=>{
   const f=fixture;
   document.querySelector('#board').addEventListener('click',()=>{
    if(f.updated || !f.paints.length)return;f.updated=true;
    f.map.getLayer=()=>null;
    setTimeout(()=>{f.map.getLayer=()=>f.layer;f.statuses[0]=3},150);
   });
  });
  const r=await run(p,3);assert.equal(r.error,null,JSON.stringify(r));assert.equal(r.painted,3);assert.equal(r.wrong,0);await p.close();
 });
 await test('live overlay final audit covers more than one batch of visited cells',async()=>{
  const p=await boot();await p.evaluate(()=>{
   const f=fixture;f.statuses.fill(1);f.statuses[299]=3;
   document.querySelector('#board').addEventListener('click',()=>{
    if(f.updated||!f.paints.length)return;f.updated=true;f.statuses[256]=3;
   });
  });
  const r=await run(p,300);assert.equal(r.error,null);assert.equal(r.painted,2);assert.equal(r.wrong,0);
  assert.deepEqual(r.paints.map(v=>v.i),[299,256]);assert.equal(r.overlayRestarts,1);await p.close();
 });
 await test('live overlay ordinary progress updates do not restart or repeat paint',async()=>{
  const p=await boot();await p.evaluate(()=>document.querySelector('#board').addEventListener('click',()=>{
   fixture.layer.data={...fixture.layer.data,statusHighlights:{progress:{...fixture.layer.data.statusHighlights.progress}}};
  }));
  const r=await run(p,12);assert.equal(r.error,null);assert.equal(r.painted,12);assert.equal(r.wrong,0);
  assert.equal(r.overlayRestarts,0);assert.equal(new Set(r.paints.map(v=>v.i)).size,12);await p.close();
 });
 await test('live overlay next Start reads a new template without reloading or recalibrating',async()=>{
  const p=await boot();const first=await run(p,4);assert.equal(first.painted,4);
  await p.evaluate(()=>{fixture.pixels={...fixture.pixels,data:fixture.pixels.data.slice()};fixture.layer.data.pixels=fixture.pixels;fixture.statuses.fill(3)});
  const second=await run(p,4);assert.equal(second.error,null);assert.equal(second.painted,4);assert.equal(second.wrong,0);await p.close();
 });
 await test('live overlay Stop during audit remains responsive',async()=>{
  const p=await boot();await p.evaluate(()=>{
   const inspect=__APX.native.inspect;
   __APX.native.inspect=async(...args)=>{__APX.runner.stop();return inspect(...args)};
  });
  const r=await run(p,100);assert.equal(r.error,null);assert.ok(r.painted<100);assert.equal(r.wrong,0);assert.equal(r.highlight,false);await p.close();
 });
 await test('current site module names initialize and paint correctly',async()=>{
  const p=await boot({files:newFiles});const r=await run(p,4);
  assert.equal(r.error,null,JSON.stringify(r));assert.equal(r.painted,4);assert.equal(r.wrong,0);await p.close();
 });
 await test('evicted resource timing entries recover from official module script elements',async()=>{
  const p=await boot({files:newFiles,clearTiming:true});const r=await run(p,4);
  assert.equal(r.error,null);assert.equal(r.painted,4);assert.equal(r.wrong,0);await p.close();
 });
 await test('renamed module files and export aliases are discovered without a registry',async()=>{
  const files=['renamed-core-07.js','renamed-prefs-07.js','renamed-preview-07.js','renamed-renderer-07.js'];
  const p=await boot({files,aliases:true});const r=await run(p,4);
  assert.equal(r.error,null,JSON.stringify(r));assert.equal(r.painted,4);assert.equal(r.wrong,0);
  assert.equal(r.native.discovery.roles.core,files[0]);await p.close();
 });
 await test('unrecognized source stops before any clicks and reports the missing role',async()=>{
  const p=await boot({unrecognized:true});const r=await run(p,4);
  assert.equal(r.error,'native-modules');assert.match(r.native.detail,/core/);
  assert.equal(r.samples,0);assert.equal(r.painted,0);await p.close();
 });
 await test('unrelated observed modules are inspected but never imported',async()=>{
  const p=await boot({unrelated:true});const r=await run(p,4);
  assert.equal(r.error,null);assert.equal(r.painted,4);
  assert.equal(await p.evaluate(()=>window.unrelatedExecuted),undefined);await p.close();
 });
 await test('known filename with incompatible exports is rejected before painting',async()=>{
  const p=await boot({files:newFiles,invalidCore:true});const r=await run(p,4);
  assert.equal(r.error,'native-protocol');assert.equal(r.samples,0);assert.equal(r.painted,0);await p.close();
 });
 await test('slow initial source discovery is awaited before sampling',async()=>{
  const p=await boot({sourceDelay:1800});const r=await run(p,4);
  assert.equal(r.error,null,JSON.stringify(r));assert.equal(r.painted,4);assert.equal(r.wrong,0);await p.close();
 });
 await test('temporary source read failure can recover on the next Start',async()=>{
  const p=await boot({sourceFailOnce:true});const first=await run(p,4);
  assert.equal(first.error,'native-module-load');assert.equal(first.samples,0);assert.equal(first.painted,0);
  await p.evaluate(()=>fixture.allowSource=true);
  const second=await run(p,4);assert.equal(second.error,null);assert.equal(second.painted,4);assert.equal(second.wrong,0);await p.close();
 });
 await test('Stop during initial discovery sends no sample or paint clicks',async()=>{
  const p=await boot({sourceDelay:600});await p.evaluate(()=>setTimeout(()=>__APX.runner.stop(),100));
  const r=await run(p,4);assert.equal(r.painted,0);assert.equal(r.samples,0);assert.equal(r.highlight,false);await p.close();
 });
 for(const speed of ['safe','fast','turbo']) await test('current color skips matching, transparent and other-color cells at '+speed,async()=>{
  const p=await boot();await p.evaluate(()=>{fixture.statuses[0]=1;fixture.pixels.data[11]=0});
  const r=await run(p,5,speed,true,'current');
  assert.equal(r.error,null,JSON.stringify(r));assert.equal(r.painted,1);assert.equal(r.matched,1);assert.equal(r.transparent,1);assert.equal(r.filtered,2);
  assert.equal(r.keys,0);assert.equal(r.samples,0);assert.equal(r.paints.length,1);assert.equal(r.wrong,0);
  const again=await run(p,5,speed,true,'current');assert.equal(again.painted,0);assert.equal(again.matched,2);
  await p.close();
 });
 for(const speed of ['safe','fast','turbo']) await test('current color single clicks obey '+speed+' ceiling',async()=>{
  const p=await boot();await p.evaluate(()=>{for(let i=0;i<40;i++)fixture.pixels.data.set([255,0,0,255],i*4)});
  const r=await run(p,40,speed,true,'current'),cap={safe:10,fast:20,turbo:30}[speed];
  assert.equal(r.error,null);assert.equal(r.painted,40);assert.equal(r.paints.length,40);assert.equal(r.keys,0);assert.equal(r.samples,0);assert.equal(r.wrong,0);
  const rate=39000/(r.paints.at(-1).time-r.paints[0].time);assert.ok(rate<=cap*1.035,JSON.stringify({rate,cap}));
  await p.close();return {rate,cap};
 });
 await test('current color stops if selection changes before the next paint',async()=>{
  const p=await boot();await p.evaluate(()=>document.querySelector('#board').addEventListener('click',()=>{setTimeout(()=>fixture.select(2),20)},{once:true}));
  const r=await run(p,5,'safe',true,'current');assert.equal(r.error,'native-current-changed');assert.equal(r.painted,1);assert.equal(r.wrong,0);assert.equal(r.keys,0);await p.close();
 });
 await test('current color rechecks the board after movement before painting',async()=>{
  const p=await boot();await p.evaluate(()=>document.querySelector('#board').addEventListener('mousemove',()=>fixture.statuses[0]=1,{once:true}));
  const r=await run(p,1,'turbo',true,'current');assert.equal(r.painted,0);assert.equal(r.matched,1);assert.equal(r.samples,0);await p.close();
 });
 await test('current color requires a selected paint color',async()=>{
  const p=await boot();await p.evaluate(()=>document.querySelectorAll('#palette button').forEach(b=>b.className=''));
  const r=await run(p,3,'turbo',true,'current');assert.equal(r.error,'native-current-color');assert.equal(r.painted,0);assert.equal(r.samples,0);await p.close();
 });
 await test('current color filtered-only area is not a canvas guard error',async()=>{
  const p=await boot();await p.evaluate(()=>{for(let i=0;i<4;i++)fixture.pixels.data.set([0,0,255,255],i*4)});
  const r=await run(p,4,'turbo',true,'current');assert.equal(r.error,null);assert.equal(r.filtered,4);assert.equal(r.painted,0);
  await p.evaluate(()=>{__APX.grid.setRegionFromClient(403,200,421,200);__APX.app.toggleRun()});
  await p.waitForFunction(()=>!__APX.runner.state.running);
  const status=await p.locator('#autopixel-x-root #status').innerText();
  assert.ok(status.includes('4'));assert.ok(status.includes('other colors')||status.includes('다른 색'));await p.close();
 });
 await test('empty space outside the template completes without a guard error',async()=>{
  const p=await boot();await p.evaluate(()=>{
   const original=fixture.map.unproject;fixture.map.unproject=([x,y])=>original([x+6000,y]);
   __APX.store.set({source:'current',comparisonMode:'native',speed:'turbo'});
   __APX.grid.setRegionFromClient(403,200,421,200);__APX.app.toggleRun();
  });
  await p.waitForFunction(()=>!__APX.runner.state.running);
  const r=await p.evaluate(()=>__APX.runner.diagnostics());assert.equal(r.outside,4);assert.equal(r.painted,0);
  const status=await p.locator('#autopixel-x-root #status').innerText();
  assert.ok(status.includes('outside the template')||status.includes('도안 밖'));await p.close();
 });
 await test('turbo label follows the selected color source',async()=>{
  const p=await boot();await p.evaluate(()=>__APX.store.set({source:'overlay',comparisonMode:'native'}));
  assert.match(await p.locator('#autopixel-x-root #speed [data-v="turbo"]').innerText(),/25/);
  await p.evaluate(()=>__APX.store.set({source:'current'}));
  assert.match(await p.locator('#autopixel-x-root #speed [data-v="turbo"]').innerText(),/30/);await p.close();
 });
 await test('turbo handles frame-delayed hover and palette focus at the 25px target',async()=>{
  const p=await boot();await p.evaluate(()=>{fixture.frameHover=true;fixture.deferredFocus=true;fixture.delay=18});
  const r=await run(p,120);assert.equal(r.painted,120,JSON.stringify({painted:r.painted,matched:r.matched,deferred:r.deferred,blocked:r.blocked,error:r.error,wrong:r.wrong,samples:r.samples,verification:r.verification,indices:r.paints.map(v=>v.i)}));assert.equal(r.wrong,0);assert.equal(r.samples,120);assert.equal(r.keys,240);
  const rate=119000/(r.paints.at(-1).time-r.paints[0].time);
  assert.ok(rate<=25.5&&rate>=23,JSON.stringify({rate,frameMs:r.frameMs,paintMs:r.paintMs/120,compareMs:r.compareMs/120}));
  assert.ok(r.paints.slice(1).every((v,i)=>v.time-r.paints[i].time>=33), 'No catch-up bursts above 30px/s');
  await p.close();return {painted:r.painted,wrong:r.wrong,rate};
 });
 await test('1000 cells: delayed sampler never paints previous color; two i presses per sample',async()=>{
  const p=await boot();await p.evaluate(()=>fixture.variable=true);
  const r=await run(p,1000);assert.equal(r.error,null);assert.equal(r.painted,1000);assert.equal(r.wrong,0);assert.equal(r.keys,2000);assert.equal(r.samples,1000);assert.equal(r.highlight,false);
  await p.screenshot({path:path.join(root,'tests/official-auto.png')});await p.close();
  return {painted:r.painted,wrong:r.wrong,rate:1000/(r.elapsedMs/1000)};
 });
 await test('transparent/outside/correct skip without PNG; repeated run skips all correct cells',async()=>{
  const p=await boot();await p.evaluate(()=>{fixture.statuses[0]=1;fixture.pixels.data[7]=0;fixture.pixels.data.set([255,0,0,255],8)});
  const r=await run(p,4);assert.equal(r.matched,1);assert.equal(r.transparent,1);assert.equal(r.painted,2);assert.equal(r.keys,4);assert.equal(r.wrong,0);
  const again=await run(p,4);assert.equal(again.painted,0);assert.equal(again.matched,3);assert.equal(again.transparent,1);
  // Outside a smaller official template is independent of grid bounds.
  await p.evaluate(()=>fixture.layer.data.coordinates[1]=fixture.layer.data.coordinates[0]);
  const invalid=await run(p,1);assert.equal(invalid.painted,0);assert.equal(invalid.error,'native-unsupported');
  await p.close();
 });
 for(const speed of ['safe','fast','turbo'])await test(speed+' ceiling and same-color acknowledgement',async()=>{
  const p=await boot();await p.evaluate(()=>{for(let i=0;i<1000;i++)fixture.pixels.data.set([255,0,0,255],i*4)});
  const r=await run(p,40,speed);assert.equal(r.error,null);assert.equal(r.painted,40);assert.equal(r.wrong,0);
  const cap={safe:10,fast:20,turbo:25}[speed],intervals=r.paints.slice(1).map((a,i)=>a.time-r.paints[i].time);
  // Count over the first-to-last interval, excluding warmup/final cell bias.
  const rate=39000/(r.paints.at(-1).time-r.paints[0].time);
  assert.ok(rate<=cap*1.035,JSON.stringify({speed,rate,cap}));assert.equal(r.samples,40);
  await p.close();return {rate,cap,minInterval:Math.min(...intervals)};
 });
 await test('drop stops without an unverified paint or later cells',async()=>{
  const p=await boot();await p.evaluate(()=>fixture.drop=true);
  const r=await run(p,10);assert.equal(r.painted,0);assert.equal(r.samples,1);assert.equal(r.error,'native-pending');assert.equal(r.highlight,false);await p.close();
 });
 await test('wrongSample retries are bounded; bad cells remain unpainted while later cells continue',async()=>{
  const p=await boot();await p.evaluate(()=>fixture.wrongSample=true);
  const r=await run(p,4);assert.equal(r.painted,0);assert.equal(r.samples,12);assert.equal(r.error,null);assert.equal(r.deferred,4);assert.equal(r.wrong,0);assert.equal(r.highlight,false);await p.close();
 });
 await test('Stop during asynchronous sampling never sends the paint click',async()=>{
  const p=await boot();await p.evaluate(()=>{fixture.delay=300;setTimeout(()=>__APX.runner.stop(),100)});
  const r=await run(p,10);assert.equal(r.painted,0);await p.waitForTimeout(350);assert.equal(await p.evaluate(()=>fixture.paints.length),0);assert.equal(r.highlight,false);await p.close();
 });
 await test('stale progress and mismatched canvas fail closed; user highlight choice retained',async()=>{
  const p=await boot();await p.evaluate(()=>{fixture.prefs.highlightIncorrectPixels=true;fixture.layer.data.statusHighlights={progress:{width:99,height:10}}});
  const r=await run(p,1);assert.equal(r.painted,0);assert.equal(r.error,'native-loading');assert.equal(r.highlight,true);
  await p.close();
 });
 for(const liveUpdate of [false,true]) for(const sourceMode of ['overlay','current','variable']) await test((sourceMode==='variable'?'variable fill ':'')+(liveUpdate?'live overlay replacement in ':'')+'Alliance modal '+sourceMode+': dragged official template, original transparency, actual board and picker completion',async()=>{
  const p=await boot();
  await p.evaluate(async({liveUpdate,variableFill})=>{
    const old=document.querySelector('#board');old.remove();document.querySelector('#palette').remove();
    const dialog=document.createElement('dialog');
    dialog.innerHTML='<div class="stage cursor-crosshair" role="application" style="position:relative;width:600px;height:400px"><div class="artboard-frame" style="width:600px;height:400px"><canvas class="block size-full" width="100" height="10" style="width:600px;height:400px"></canvas><div class="alliance-template-overlay" style="position:absolute;left:0;top:0;width:600px;height:400px"><canvas style="width:600px;height:400px;opacity:.5;pointer-events:none"></canvas></div><canvas class="size-full" width="100" height="10" style="pointer-events:none"></canvas></div></div><button id="red" aria-pressed="true" style="background:rgb(255,0,0);width:30px;height:30px">red</button><button id="blue" aria-pressed="false" style="background:rgb(0,0,255);width:30px;height:30px">blue</button>';
    document.body.append(dialog);dialog.showModal();
    const stage=dialog.querySelector('.stage'),art=dialog.querySelector('.artboard-frame');
    const board=art.querySelector('canvas'),overlay=art.querySelector('.alliance-template-overlay'),canvas=overlay.querySelector('canvas');
    const mod=await import('/_app/immutable/chunks/'+fixtureFiles[3]);
    await new Promise(r=>setTimeout(r,100));
    const Renderer=mod.TemplateRenderer || mod.i;
    const renderer=new Renderer(canvas);
    let source={width:100,height:10,data:fixture.pixels.data};
    if(variableFill) {source.data.set([255,0,0,255],8);source.data.set([255,0,0,255],12);}
    source.data[7]=0; // Second template cell is transparent.
    renderer.render({source});
    const ctx=board.getContext('2d');ctx.fillStyle='red';ctx.fillRect(0,0,1,1); // First is already correct.
    fixture.keys=0;fixture.samples=0;fixture.paints=[];fixture.wrong=0;
    document.addEventListener('keydown',e=>{
      if(e.code==='KeyI'){fixture.keys++;stage.classList.add('cursor-copy')}
    });
    stage.addEventListener('pointerdown',e=>{
      const rect=board.getBoundingClientRect(),x=Math.floor((e.clientX-rect.left)/6);
      const expected=source.data[x*4]===255?1:2;
      if(stage.classList.contains('cursor-copy')) {
        fixture.samples++;
        setTimeout(()=>{stage.classList.remove('cursor-copy');fixture.selected=expected;dialog.querySelector('#red').setAttribute('aria-pressed',String(expected===1));dialog.querySelector('#blue').setAttribute('aria-pressed',String(expected===2))},18);
      } else {
        fixture.paints.push({i:x,color:fixture.selected});if(fixture.selected!==expected)fixture.wrong++;
        ctx.fillStyle=fixture.selected===1?'red':'blue';ctx.fillRect(x,0,1,1);
        if(liveUpdate && !fixture.updated) {
          fixture.updated=true;source={...source,data:source.data.slice()};
          source.data.set([255,0,0,255],4);
          ctx.clearRect(0,0,1,1);
          renderer.render({source});
        }
      }
    });
    fixture.allianceRect=board.getBoundingClientRect().toJSON();
    // Transparent pointer-events canvases are normal in the HQ editor.
    __APX.engine.rememberTarget(fixture.allianceRect.left+3,fixture.allianceRect.top+20);
    fixture.render=()=>renderer.render({source});
  },{liveUpdate,variableFill:sourceMode==='variable'});
  const r=await p.evaluate(async source=>{
    const n=__APX,r=fixture.allianceRect;
    const cells=Array.from({length:4},(_,i)=>({c:i,r:0,x:r.left+3+i*6,y:r.top+20}));
    n.store.set({comparisonMode:'native',source:source==='variable'?'overlay':source,variableFill:source==='variable',speed:'turbo'});
    await n.runner.start(cells,n.engine.profileFrom(n.store.cfg),{guard:false,skipMatching:true},{});
    return {...n.runner.diagnostics(),error:n.runner.state.error,samples:fixture.samples,wrong:fixture.wrong,paints:fixture.paints.length};
  },sourceMode);
  assert.equal(r.error,null,JSON.stringify(r));assert.equal(r.wrong,0);
  if(sourceMode==='variable') {
    assert.equal(r.painted,liveUpdate?4:2);assert.equal(r.samples,liveUpdate?2:1);
    assert.equal(r.verification.reused,liveUpdate?2:1);assert.equal(r.overlayRestarts,liveUpdate?1:0);
  } else if(liveUpdate) {
    assert.equal(r.painted,sourceMode==='current'?3:4);assert.equal(r.overlayRestarts,1);
    assert.equal(r.transparent,0);assert.equal(r.samples,sourceMode==='current'?0:4);
  } else {
    assert.equal(r.matched,1);assert.equal(r.transparent,1);assert.equal(r.painted,sourceMode==='current'?1:2);
    assert.equal(r.samples,sourceMode==='current'?0:2);assert.equal(r.paints,sourceMode==='current'?1:2);
  }
  await p.screenshot({path:path.join(root,'tests/alliance-auto.png')});await p.close();
 });
 await test('late response after Stop is drained before a restarted run samples again',async()=>{
  const p=await boot();await p.evaluate(()=>{fixture.delay=400;setTimeout(()=>__APX.runner.stop(),100)});
  const first=await run(p,10);assert.equal(first.painted,0);
  await p.evaluate(()=>fixture.delay=0);
  const second=await run(p,4);assert.equal(second.painted,4);assert.equal(second.error,null);
  assert.equal(second.samples,5);assert.equal(second.wrong,0);await p.close();
 });
 await test('native bridge responds across a real isolated extension world',async()=>{
  const p=await boot(),cdp=await p.context().newCDPSession(p);
  const tree=await cdp.send('Page.getFrameTree');
  const {executionContextId}=await cdp.send('Page.createIsolatedWorld',{frameId:tree.frameTree.frame.id,worldName:'native-test'});
  await cdp.send('Runtime.evaluate',{contextId:executionContextId,expression:'window.__APX={engine:{sleep:ms=>new Promise(r=>setTimeout(r,ms))}}'});
  await cdp.send('Runtime.evaluate',{contextId:executionContextId,expression:fs.readFileSync(path.join(root,'src/native.js'),'utf8')});
  const result=await cdp.send('Runtime.evaluate',{contextId:executionContextId,awaitPromise:true,returnByValue:true,expression:'(async()=>{const ready=await __APX.native.begin(document.querySelector("#board"));const value=await __APX.native.read({x:403,y:200});await __APX.native.end();return {ready:ready.ok,kind:value.kind,color:value.color}})()'});
  assert.deepEqual(result.result.value,{ready:true,kind:'paint',color:1});await p.close();
 });
 await test('current engine handles palette created only after sampling',async()=>{
  const p=await boot();
  await p.evaluate(()=>{
    document.querySelector('#color-2').remove();
    const original=fixture.select;
    fixture.select=color=>{
      if(!document.querySelector('#color-'+color)){
        const b=document.createElement('button');b.id='color-'+color;
        document.querySelector('#palette').append(b);
      }
      original(color);
    };
  });
  const r=await run(p,4);
  assert.equal(r.painted,4);assert.equal(r.wrong,0);
  assert.equal(r.error,null);await p.close();
 });
 await test('palette DOM replacement after every sample stays valid',async()=>{
  const p=await boot();await p.evaluate(()=>{
    const original=fixture.select;
    fixture.select=color=>{
      document.querySelector('#palette').innerHTML='<button id="color-1">red</button><button id="color-2">blue</button>';
      original(color);
    };
  });
  const r=await run(p,20);assert.equal(r.painted,20);assert.equal(r.wrong,0);assert.equal(r.error,null);await p.close();
 });
 await test('one stale color response recovers automatically at the same cell',async()=>{
  const p=await boot();await p.evaluate(()=>{
    fixture.wrongSample=true;const original=fixture.select;
    fixture.select=color=>{original(color);fixture.wrongSample=false};
  });
  const r=await run(p,8);assert.equal(r.painted,8);assert.equal(r.samples,9);assert.equal(r.wrong,0);assert.equal(r.error,null);await p.close();
 });
 await test('slow sample beyond old 650ms limit completes without restart',async()=>{
  const p=await boot();await p.evaluate(()=>fixture.delay=850);
  const r=await run(p,2);assert.equal(r.painted,2);assert.equal(r.wrong,0);assert.equal(r.error,null);await p.close();
 });
 await test('closed paint palette is diagnosed before any canvas click',async()=>{
  const p=await boot();await p.evaluate(()=>document.querySelector('#palette').remove());
  const r=await run(p,1);assert.equal(r.painted,0);assert.equal(r.samples,0);assert.equal(r.error,'native-picker');await p.close();
 });
 await test('persistent bad cell does not stop following correct cells; UI reports it as unpainted',async()=>{
  const p=await boot();await p.evaluate(()=>{
    fixture.wrongSample=true;const original=fixture.select;let count=0;
    fixture.select=color=>{original(color);if(++count===3)fixture.wrongSample=false};
  });
  const r=await run(p,5);assert.equal(r.painted,4);assert.equal(r.deferred,1);assert.equal(r.wrong,0);assert.equal(r.error,null);assert.equal(r.samples,7);
  await p.evaluate(()=>{__APX.ui.render();__APX.ui.renderDiagnostics();__APX.ui.setStatus('st_deferred',{n:1},'warn')});
  assert.ok((await p.locator('#autopixel-x-root #status').innerText()).includes('1'));
  await p.screenshot({path:path.join(root,'tests/recovery-v220.png')});await p.close();
 });
 fs.writeFileSync(path.join(root,process.env.NATIVE_TEST_FILTER?'tests/native-targeted-results.json':'tests/native-results.json'),JSON.stringify(results,null,2));
 await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
