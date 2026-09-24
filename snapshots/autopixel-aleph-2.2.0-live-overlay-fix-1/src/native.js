/* Isolated-world request client. Every reply belongs to one run and cell. */
(() => {
  const NS = window.__APX;
  let serial = 0, active = null;
  const diagnostic={reason:null,detail:null,discovery:null};
  function request(op, data = {}, timeout = 1500) {
    const id = 'native-' + (++serial) + '-' + Math.random().toString(36).slice(2);
    return new Promise(resolve => {
      const finish = value => { clearTimeout(timer); document.removeEventListener('apx:native-result', receive); resolve(value); };
      const receive = e => { try { const v=JSON.parse(e.detail); if(v.id===id) { if(v.discovery) diagnostic.discovery=v.discovery; if(!v.ok){diagnostic.reason=v.reason;diagnostic.detail=v.detail || null;} finish(v); } } catch {} };
      const timer = setTimeout(() => finish({ok:false,reason:'native-timeout'}), timeout);
      document.addEventListener('apx:native-result', receive);
      document.dispatchEvent(new CustomEvent('apx:native-request',{detail:JSON.stringify({id,op,...data})}));
    });
  }
  async function begin(canvas, currentOnly=false) {
    diagnostic.reason=null;diagnostic.detail=null;diagnostic.discovery=null;
    const token = crypto.randomUUID();
    if (!canvas) return {ok:false,reason:'native-canvas'};
    canvas.setAttribute('data-apx-native-id',token);
    active = {token,canvas};
    return request('begin',{token,canvas:token,currentOnly},7000);
  }
  async function poll(op,data,shouldAbort) {
    const s=active;if(!s) return {ok:false,reason:'native-session'};
    const until=performance.now()+(s.hasRead?5000:2000);
    let value;
    do {
      if(active!==s || shouldAbort?.()) return {ok:false,reason:'cancelled'};
      value=await request(op,{token:s.token,...data},600);
      if(value.ok) {s.hasRead=true;return value;}
      // Template replacement can briefly remove its layer or its progress.
      if(value.reason!=='native-loading' && !(s.hasRead && value.reason==='native-overlay')) break;
      await NS.engine.sleep(25);
    } while(performance.now()<until);
    return value;
  }
  const read=(cell,shouldAbort)=>poll('read',{x:cell.x,y:cell.y},shouldAbort);
  const inspect=(cells,shouldAbort)=>poll('inspect',{cells:cells.map(({x,y})=>({x,y}))},shouldAbort);
  async function end() {
    const s=active; active=null;
    if (!s) return;
    await request('end',{token:s.token},500);
    if(s.canvas.getAttribute('data-apx-native-id')===s.token) s.canvas.removeAttribute('data-apx-native-id');
  }
  NS.native = {begin,read,inspect,end,diagnostic};
})();
