const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const passed = [];
const browserErrors = [];
let browser;
const fixture = '<meta charset="utf-8"><style>body{margin:0;background:#abc}canvas{position:absolute;left:400px;top:180px;width:600px;height:400px}dialog{width:1000px;height:650px;background:white}dialog::backdrop{background:#0008}button#covered{position:absolute;left:430px;top:180px}</style><canvas id="board" width="600" height="400"></canvas><dialog id="alliance"><h2>Alliance · Pixel editor</h2><canvas id="editor" width="600" height="400"></canvas></dialog>';
async function boot(snapshot = false) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1.5 });
  page.on('pageerror', e => browserErrors.push(e.message));
  await page.route('https://apx.test/**', route => route.fulfill({ contentType: 'text/html', body: fixture }));
  await page.goto('https://apx.test/');
  await page.evaluate(() => {
    window.saved = { nativeVersion: 1, comparisonMode: 'live' };
    window.originalDraw = WebGLRenderingContext.prototype.drawElements;
    window.originalRAF = window.requestAnimationFrame;
    window.chrome = { storage: { local: {
      get: (key, cb) => cb({ [key]: window.saved }),
      set: obj => { window.saved = Object.values(obj)[0]; },
    } } };
  });
  const dir = snapshot ? path.resolve(root, '../snapshots/autopixel-aleph-2.2.0-wplace-update-1') : root;
  const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  for (const script of m.content_scripts.flatMap(c => c.js)) await page.addScriptTag({ path: path.join(dir, script) });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  return page;
}
async function test(name, fn) { await fn(); passed.push(name); console.log('PASS ' + name); }
(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const page = await boot();
  await test('boot + shadow controls + language', async () => {
    assert.equal(await page.locator('#autopixel-x-root').count(), 1);
    await page.locator('#autopixel-x-root #lang').click();
    assert.equal(await page.locator('#autopixel-x-root #shape button').first().textContent(), '사각형');
  });
  await test('native modal: visible panel remains interactive', async () => {
    await page.evaluate(() => document.querySelector('#alliance').showModal());
    await page.locator('#autopixel-x-root #lang').click();
    const result = await page.evaluate(() => ({
      parent: __APX.hostEl.parentElement.id,
      popover: __APX.hostEl.matches(':popover-open'),
      lang: __APX.i18n.lang,
    }));
    assert.deepEqual(result, { parent: 'alliance', popover: true, lang: 'en' });
    const visible = await page.locator('#autopixel-x-root #start').evaluate(el => {
      const r=el.getBoundingClientRect(),root=el.getRootNode();
      return root.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el;
    });
    assert.equal(visible,true,'Start button must stay visible outside the scrolling body');
    await page.screenshot({ path: path.join(root, 'tests/alliance.png') });
    await page.evaluate(() => document.querySelector('#alliance').close());
    await page.waitForFunction(() => __APX.hostEl.parentElement === document.body);
  });
  await test('Alliance canvas receives color key and clicks while modal is open', async () => {
    await page.evaluate(() => document.querySelector('#alliance').showModal());
    await page.waitForFunction(()=>__APX.hostEl.parentElement.id==='alliance');
    const result=await page.evaluate(async()=>{
      const n=__APX,c=document.querySelector('#editor'),r=c.getBoundingClientRect();
      let clicks=0,keys=0;c.addEventListener('click',()=>clicks++,{once:true});c.addEventListener('keydown',e=>{if(e.key==='i')keys++},{once:true});
      const p={...n.engine.profileFrom(n.store.cfg),moveFrames:0,holdFrames:0,gapFrames:0,clicks:1,useKey:true};
      p.guardTarget=c;
      const status=await n.engine.paintCell(r.x+30,r.y+30,p);
      document.querySelector('#alliance').close();
      return {status,clicks,keys};
    });
    assert.deepEqual(result,{status:'ok',clicks:1,keys:1});
    await page.waitForFunction(()=>__APX.hostEl.parentElement===document.body);
  });
  await test('nested modal and removal recover host', async () => {
    await page.evaluate(() => {
      const a = document.querySelector('#alliance'); a.showModal();
      const b = document.createElement('dialog'); b.id = 'nested'; b.textContent = 'Nested'; document.body.append(b); b.showModal();
    });
    await page.waitForFunction(() => __APX.hostEl.parentElement.id === 'nested');
    await page.locator('#autopixel-x-root #lang').click();
    await page.evaluate(() => document.querySelector('#nested').remove());
    await page.waitForFunction(() => __APX.hostEl.parentElement.id === 'alliance');
    await page.evaluate(() => document.querySelector('#alliance').close());
    await page.waitForFunction(() => __APX.hostEl.parentElement === document.body);
  });
  await test('ellipse, concave lasso, union, subtraction, persistence and ordering', async () => {
    const result = await page.evaluate(() => {
      const g = __APX.grid;
      g.setCalibration({x:410,y:190},{x:510,y:190},10);
      g.selectShape([{x:410,y:190},{x:450,y:230}], 'ellipse');
      const ellipse = g.size().n;
      g.selectShape([{x:410,y:190},{x:450,y:190},{x:450,y:200},{x:420,y:200},{x:420,y:230},{x:410,y:230}], 'lasso');
      const holeAbsent = !g.selected(3,3), cornerPresent = g.selected(0,4);
      g.selectShape([{x:440,y:220},{x:450,y:230}], 'rect', 'add');
      const afterAdd = g.selected(3,3);
      g.selectShape([{x:410,y:190},{x:410,y:190}], 'rect', 'subtract');
      const afterSubtract = !g.selected(0,0);
      const n = g.size().n;
      __APX.store.set(g.snapshot(), false); g.clearAll(); g.restore(__APX.store.cfg);
      const restored = g.size().n === n;
      g.nudge(1,-1); const nudged = g.selected(4,2);
      const orders = ['snake','rows','cols','random'].every(o => {
        const list = g.buildCells(o,0).cells;
        return list.length === n && new Set(list.map(c=>c.c+','+c.r)).size === n && list.every(c=>g.selected(c.c,c.r));
      });
      return {ellipse,holeAbsent,cornerPresent,afterAdd,afterSubtract,restored,nudged,orders};
    });
    assert.equal(result.ellipse,21);
    for (const [key,value] of Object.entries(result)) if(key!=='ellipse') assert.equal(value,true,key);
  });
  await test('freehand UI closes near starting point; pointer cancel preserves selection', async () => {
    await page.evaluate(() => { __APX.store.set({shape:'lasso',selectionOp:'replace'}); __APX.app.selectArea(); });
    await page.mouse.move(405,185); await page.mouse.down();
    for (const p of [[455,185],[455,235],[405,235],[406,186]]) await page.mouse.move(...p);
    await page.mouse.up();
    assert.equal(await page.evaluate(() => __APX.grid.size().n),25);
    await page.evaluate(() => {
      __APX.app.selectArea();
      __APX.captureEl.dispatchEvent(new PointerEvent('pointerdown',{button:0,clientX:600,clientY:400}));
      __APX.captureEl.dispatchEvent(new PointerEvent('pointercancel'));
      __APX.pick.cancel();
    });
    assert.equal(await page.evaluate(() => __APX.grid.size().n),25);
  });
  await test('guard never clicks real button or body without a canvas', async () => {
    const result = await page.evaluate(async () => {
      const b=document.createElement('button');b.id='covered';b.textContent='control';document.body.append(b);
      let clicks=0;b.addEventListener('click',()=>clicks++);
      const profile=__APX.engine.profileFrom(__APX.store.cfg);profile.guardTarget=document.querySelector('#board');
      __APX.engine.rememberTarget(440,190);
      const rememberedButton=__APX.engine.resolveGuardTarget()===b;
      const blocked=await __APX.engine.paintCell(440,190,profile);
      const bodyAllowed=__APX.engine.onDrawSurface(document.body,profile.guardTarget);
      b.remove();return {blocked,clicks,bodyAllowed,rememberedButton};
    });
    assert.deepEqual(result,{blocked:'blocked',clicks:0,bodyAllowed:false,rememberedButton:false});
  });
  await test('exact color + transparent skip; wrong color paints; second run skips newly painted cell', async () => {
    const result=await page.evaluate(async()=>{
      const n=__APX,g=n.grid,board=document.querySelector('#board'),ctx=board.getContext('2d');
      ctx.fillStyle='#ff0000';ctx.fillRect(0,0,600,400);
      g.setRegionFromClient(410,190,430,190);n.overlay.resetProgress();
      const template=document.createElement('canvas');template.width=3;template.height=1;
      const tc=template.getContext('2d');tc.fillStyle='#ff0000';tc.fillRect(0,0,1,1);tc.fillStyle='#0000ff';tc.fillRect(1,0,1,1);
      await n.matching.load(await new Promise(r=>template.toBlob(r)));n.matching.setBoard(board);
      let clicks=0; const click=e=>{clicks++;ctx.fillStyle='#0000ff';ctx.fillRect(e.clientX-400-4,e.clientY-180-4,8,8)};
      board.addEventListener('click',click);
      const profile={...n.engine.profileFrom(n.store.cfg),moveFrames:0,holdFrames:0,gapFrames:0,clicks:1,delay:0,useKey:true};
      await n.runner.start(g.buildCells('rows',0).cells,profile,{guard:false,skipMatching:true},{});
      const first={done:n.runner.state.done,matching:n.runner.state.matching,transparent:n.runner.state.transparent,error:n.runner.state.error,clicks};
      await n.runner.start(g.buildCells('rows',0).cells,profile,{guard:false,skipMatching:true},{});
      board.removeEventListener('click',click);
      return {first,second:{done:n.runner.state.done,matching:n.runner.state.matching,transparent:n.runner.state.transparent,clicks}};
    });
    assert.deepEqual(result.first,{done:1,matching:1,transparent:1,error:null,clicks:1});
    assert.deepEqual(result.second,{done:0,matching:2,transparent:1,clicks:1});
  });
  await test('stop during move frame prevents subsequent click',async()=>{
    const result=await page.evaluate(async()=>{
      const n=__APX;let clicks=0;const board=document.querySelector('#board'),handler=()=>clicks++;
      board.addEventListener('click',handler);
      const p={...n.engine.profileFrom(n.store.cfg),moveFrames:3,useKey:false};
      const run=n.runner.start([{c:0,r:0,x:410,y:190}],p,{guard:false},{});
      n.runner.stop();await run;board.removeEventListener('click',handler);return {clicks,done:n.runner.state.done,running:n.runner.state.running};
    });assert.deepEqual(result,{clicks:0,done:0,running:false});
  });
  await test('incremental overlay matches full redraw and clears current cell',async()=>{
    const result=await page.evaluate(async()=>{
      const n=__APX;const tick=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      n.grid.setRegionFromClient(410,190,450,230);n.overlay.resetProgress();await tick();
      for(let c=0;c<4;c++){n.overlay.setCurrent({c,r:0});n.overlay.markCell(c,0);await tick();}
      n.overlay.setCurrent(null);await tick();
      const ctx=n.canvasEl.getContext('2d'),a=ctx.getImageData(600,270,110,110).data;
      n.overlay.request();await tick();const b=ctx.getImageData(600,270,110,110).data;
      return a.every((v,i)=>v===b[i]);
    });assert.equal(result,true);
  });
  await test('WebGL render-time sample works without preserveDrawingBuffer',async()=>{
    const result=await page.evaluate(async()=>{
      const n=__APX,board=document.querySelector('#board'),glCanvas=document.createElement('canvas');
      glCanvas.id='gl-board';glCanvas.width=600;glCanvas.height=400;board.replaceWith(glCanvas);
      const gl=glCanvas.getContext('webgl',{preserveDrawingBuffer:false});
      if(!gl)return {available:false};
      const draw=()=>{gl.clearColor(1,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT)};
      glCanvas.addEventListener('pointermove',()=>requestAnimationFrame(draw));
      n.grid.setRegionFromClient(410,190,410,190);
      const template=document.createElement('canvas');template.width=1;template.height=1;const tc=template.getContext('2d');tc.fillStyle='red';tc.fillRect(0,0,1,1);
      await n.matching.load(await new Promise(r=>template.toBlob(r)));n.matching.setBoard(glCanvas);
      const run=n.matching.begin();
      return {available:true,result:await n.matching.check({c:0,r:0,x:410,y:190},run)};
    });assert.deepEqual(result,{available:true,result:'matching'});
  });
  await test('unrendered WebGL black buffer is unknown, not a false match',async()=>{
    const result=await page.evaluate(async()=>{
      const n=__APX,old=document.querySelector('#gl-board'),c=old.cloneNode();old.replaceWith(c);
      c.getContext('webgl',{preserveDrawingBuffer:false,alpha:false});
      const t=document.createElement('canvas');t.width=t.height=1;t.getContext('2d').fillRect(0,0,1,1);
      await n.matching.load(await new Promise(r=>t.toBlob(r)));n.matching.setBoard(c);
      return await n.matching.check({c:0,r:0,x:410,y:190},n.matching.begin());
    });assert.equal(result,'unknown');
  });
  await test('comparison also works across MAIN and isolated extension worlds', async () => {
    const isolated = await browser.newPage({ viewport:{width:1440,height:950} });
    await isolated.route('https://isolated.test/**',r=>r.fulfill({contentType:'text/html',body:fixture}));
    await isolated.goto('https://isolated.test/');
    await isolated.addScriptTag({path:path.join(root,'src/canvas-bridge.js')});
    const session=await isolated.context().newCDPSession(isolated);
    const {frameTree}=await session.send('Page.getFrameTree');
    const {executionContextId}=await session.send('Page.createIsolatedWorld',{frameId:frameTree.frame.id,worldName:'AutoPixel-test'});
    async function evaluate(expression) {
      const result=await session.send('Runtime.evaluate',{expression,contextId:executionContextId,awaitPromise:true,returnByValue:true});
      if(result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    }
    await evaluate('window.chrome={storage:{local:{get:(k,cb)=>cb({[k]:{comparisonMode:"live"}}),set:()=>{}}}}');
    for(const file of manifest.content_scripts[1].js) await evaluate(fs.readFileSync(path.join(root,file),'utf8'));
    const result=await evaluate("(async()=>{const n=__APX,c=document.querySelector('#board'),ctx=c.getContext('2d');ctx.fillStyle='red';ctx.fillRect(0,0,600,400);n.grid.setCalibration({x:410,y:190},{x:510,y:190},10);n.grid.setRegionFromClient(410,190,410,190);const t=document.createElement('canvas');t.width=t.height=1;t.getContext('2d').fillStyle='red';t.getContext('2d').fillRect(0,0,1,1);await n.matching.load(await new Promise(r=>t.toBlob(r)));n.matching.setBoard(c);return await n.matching.check({c:0,r:0,x:410,y:190},n.matching.begin());})()");
    assert.equal(result,'matching');
    await isolated.close();
  });
  await test('bridge leaves no permanent GL or animation wrappers', async () => {
    assert.equal(await page.evaluate(()=>window.originalDraw===WebGLRenderingContext.prototype.drawElements && window.originalRAF===window.requestAnimationFrame),true);
  });
  await test('transparent PNG works without a board in both color modes', async () => {
    const result=await page.evaluate(async()=>{
      const n=__APX;n.grid.setRegionFromClient(410,190,410,190);n.matching.setBoard(null);
      const t=document.createElement('canvas');t.width=t.height=1;
      await n.matching.load(await new Promise(r=>t.toBlob(r)));
      const states=[];
      for(const source of ['overlay','current']){
        n.store.set({source,comparisonMode:'snapshot'});
        states.push(await n.matching.check({c:0,r:0,x:410,y:190},n.matching.begin()));
      }
      return states;
    });assert.deepEqual(result,['transparent','transparent']);
  });
  await test('full PNG can align to a smaller subregion without silent disabling', async () => {
    const result=await page.evaluate(async()=>{
      const n=__APX;n.store.set({source:'overlay'});n.grid.setRegionFromClient(430,190,430,190);
      const t=document.createElement('canvas');t.width=3;t.height=1;t.getContext('2d').fillRect(0,0,2,1);
      await n.matching.load(await new Promise(r=>t.toBlob(r)));
      const initially=n.matching.status();n.matching.setAnchor(410,190);
      return {initially,aligned:n.matching.aligned(),result:await n.matching.check({c:2,r:0,x:430,y:190},n.matching.begin())};
    });assert.deepEqual(result,{initially:'anchor',aligned:true,result:'transparent'});
  });
  await test('native composited overlay compares the underlying captured board, with zero per-cell reads', async () => {
    const result=await page.evaluate(async()=>{
      const n=__APX,old=document.querySelector('#gl-board'),c=document.createElement('canvas');c.id='board';c.width=600;c.height=400;old.replaceWith(c);
      const ctx=c.getContext('2d');ctx.fillStyle='red';ctx.fillRect(0,0,600,400);
      ctx.fillStyle='blue';ctx.fillRect(15,0,10,25);
      n.grid.setRegionFromClient(410,190,430,190);n.store.set({comparisonMode:'snapshot',source:'overlay'});
      const t=document.createElement('canvas');t.width=3;t.height=1;const tc=t.getContext('2d');tc.fillStyle='blue';tc.fillRect(0,0,2,1);
      await n.matching.load(await new Promise(r=>t.toBlob(r)));n.matching.setBoard(c);
      const before=n.matching.status(),captured=await n.matching.capture();
      // Restore the native template over the same canvas; all opaque pixels now
      // look blue, although the first board cell was red when captured.
      ctx.fillStyle='blue';ctx.fillRect(0,0,30,25);
      let reads=0;const count=()=>reads++;document.addEventListener('apx:sample-request',count);
      const run=n.matching.begin(),values=[];
      for(let i=0;i<3;i++)values.push(await n.matching.check({c:i,r:0,x:410+i*10,y:190},run));
      n.matching.invalidate();
      const invalid=await n.matching.check({c:1,r:0,x:420,y:190},run);
      document.removeEventListener('apx:sample-request',count);
      return {before,captured,values,reads,invalid};
    });assert.deepEqual(result,{before:'capture',captured:true,values:['different','matching','transparent'],reads:0,invalid:'unknown'});
  });
  await test('native WebGL snapshot is read once and its temporary hooks are removed', async () => {
    const result=await page.evaluate(async()=>{
      const n=__APX,old=document.querySelector('#board'),c=document.createElement('canvas');c.id='board';c.width=600;c.height=400;old.replaceWith(c);
      const gl=c.getContext('webgl',{preserveDrawingBuffer:false});
      c.addEventListener('pointermove',()=>requestAnimationFrame(()=>{gl.clearColor(0,0,1,1);gl.clear(gl.COLOR_BUFFER_BIT)}));
      n.grid.setRegionFromClient(410,190,410,190);
      const t=document.createElement('canvas');t.width=t.height=1;t.getContext('2d').fillStyle='blue';t.getContext('2d').fillRect(0,0,1,1);
      await n.matching.load(await new Promise(r=>t.toBlob(r)));n.matching.setBoard(c);
      const captured=await n.matching.capture();
      const value=await n.matching.check({c:0,r:0,x:410,y:190},n.matching.begin());
      return {captured,value,unhooked:window.originalDraw===WebGLRenderingContext.prototype.drawElements};
    });assert.deepEqual(result,{captured:true,value:'matching',unhooked:true});
  });
  await test('folded panel keeps Start visible with comparison status and timings',async()=>{
    await page.evaluate(()=>{__APX.store.set({folded:true});__APX.ui.render()});
    const visible=await page.locator('#autopixel-x-root #start').evaluate(el=>{
      const r=el.getBoundingClientRect(),host=el.getRootNode(),panel=el.closest('.panel').getBoundingClientRect();
      return r.bottom<=panel.bottom && host.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el;
    });
    assert.equal(visible,true);
    await page.screenshot({path:path.join(root,'tests/native-comparison.png')});
    await page.evaluate(()=>__APX.store.set({folded:false}));
  });
  const throttled = {};
  for (const source of ['overlay','current']) {
    const p=await browser.newPage({viewport:{width:1440,height:950}});
    await p.route('https://slow.test/**',r=>r.fulfill({contentType:'text/html',body:fixture}));
    await p.goto('https://slow.test/');
    await p.evaluate(()=>{
      window.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),1000/30);
      window.cancelAnimationFrame=clearTimeout;
      window.chrome={storage:{local:{get:(k,cb)=>cb({}),set:()=>{}}}};
    });
    const dir=root;
    const m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
    for(const script of m.content_scripts.flatMap(c=>c.js))await p.addScriptTag({path:path.join(dir,script)});
    const result=await p.evaluate(async source=>{
      const n=__APX,board=document.querySelector('#board');
      let hoverX=0,pickedX=0,wrong=0,clicks=0;
      board.addEventListener('pointermove',e=>{hoverX=e.clientX});
      board.addEventListener('keydown',e=>{if(e.key==='i'){const expected=hoverX;requestAnimationFrame(()=>{pickedX=expected})}});
      board.addEventListener('click',e=>{clicks++;if(source==='overlay'&&pickedX!==e.clientX)wrong++});
      const cells=Array.from({length:12},(_,c)=>({c,r:0,x:410+c*10,y:190}));
      n.store.set({speed:'turbo',source,comparisonMode:'live'});
      const start=performance.now();
      await n.runner.start(cells,n.engine.profileFrom(n.store.cfg),{guard:false,skipMatching:false},{});
      const ms=performance.now()-start;
      return {source,done:n.runner.state.done,wrong,clicks,ms,rate:12000/ms};
    },source);
    assert.equal(result.done,12);assert.equal(result.wrong,0);assert.equal(result.clicks,24);
    throttled['v220_'+source]=result;await p.close();
  }
  assert.ok(throttled.v220_overlay.rate <= 30.5);
  assert.ok(throttled.v220_current.rate <= 30.5);
  await test('30 fps regression: preset ceilings hold in the compatibility path',async()=>{});
  fs.writeFileSync(path.join(root,'tests/throttled-benchmark.json'),JSON.stringify(throttled,null,2));
  console.log('30FPS '+JSON.stringify(throttled));
  const benchmark = {};
  for (const snapshot of [true, false]) {
    const p = await boot(snapshot);
    await p.bringToFront();
    await p.evaluate(() => {
      const n=__APX;n.grid.setCalibration({x:410,y:190},{x:510,y:190},10);
      n.grid.setRegionFromClient(410,190,500,260);n.overlay.resetProgress();
      n.store.set({speed:'fast',source:'overlay',skipMatching:false,guard:false});
      window.clickCount=0;document.querySelector('#board').addEventListener('click',()=>window.clickCount++);
      const ctx=n.canvasEl.getContext('2d'),clear=ctx.clearRect.bind(ctx);
      window.clearedArea=0;ctx.clearRect=(x,y,w,h)=>{window.clearedArea+=w*h;return clear(x,y,w,h)};
      n.app.toggleRun();
    });
    await p.waitForFunction(()=>!__APX.runner.state.running,{},{timeout:30000});
    benchmark[snapshot?'snapshot':'updated']=await p.evaluate(()=>({ms:__APX.runner.elapsedMs(),done:__APX.runner.state.done,clicks:window.clickCount,clearedArea:window.clearedArea,error:__APX.runner.state.error||null}));
    await p.close();
  }
  assert.equal(benchmark.snapshot.done,80); assert.equal(benchmark.updated.done,80);
  assert.equal(benchmark.snapshot.clicks,160); assert.equal(benchmark.updated.clicks,160);
  // Both retained builds use incremental drawing; check for a regression.
  assert.ok(benchmark.updated.clearedArea <= benchmark.snapshot.clearedArea * 1.1);
  benchmark.snapshot.build='2.2.0 (Wplace update 1)';
  benchmark.updated.build=manifest.version_name;
  console.log('BENCHMARK '+JSON.stringify(benchmark));
  fs.writeFileSync(path.join(root,'tests/benchmark.json'),JSON.stringify(benchmark,null,2));
  assert.deepEqual(browserErrors,[]);
  fs.writeFileSync(path.join(root,'tests/results.json'),JSON.stringify({passed,browserErrors},null,2));
  await browser.close();
  console.log(passed.length+' browser regression checks passed.');
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
