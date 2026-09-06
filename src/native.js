/* Isolated-world request client. Every reply belongs to one run and cell. */
(() => {
  const NS = window.__APX;
  let serial = 0, active = null;
  const diagnostic={reason:null,detail:null};
  function request(op, data = {}, timeout = 1500) {
    const id = 'native-' + (++serial) + '-' + Math.random().toString(36).slice(2);
    return new Promise(resolve => {
      const finish = value => { clearTimeout(timer); document.removeEventListener('apx:native-result', receive); resolve(value); };
      const receive = e => { try { const v=JSON.parse(e.detail); if(v.id===id) { if(!v.ok){diagnostic.reason=v.reason;diagnostic.detail=v.detail || null;} finish(v); } } catch {} };
      const timer = setTimeout(() => finish({ok:false,reason:'native-timeout'}), timeout);
      document.addEventListener('apx:native-result', receive);
      document.dispatchEvent(new CustomEvent('apx:native-request',{detail:JSON.stringify({id,op,...data})}));
    });
  }
  async function begin(canvas) {
    diagnostic.reason=null;diagnostic.detail=null;
    const token = crypto.randomUUID();
    if (!canvas) return {ok:false,reason:'native-canvas'};
    canvas.setAttribute('data-apx-native-id',token);
    active = {token,canvas};
    return request('begin',{token,canvas:token});
  }
  async function read(cell, shouldAbort) {
    const s = active; if (!s) return {ok:false,reason:'native-session'};
    const until = performance.now()+2000;
    let value;
    do {
      if (shouldAbort?.()) return {ok:false,reason:'cancelled'};
      value = await request('read',{token:s.token,x:cell.x,y:cell.y},600);
      if (value.ok || value.reason!=='native-loading') break;
      await NS.engine.sleep(25);
    } while (performance.now()<until);
    return value;
  }
  async function end() {
    const s=active; active=null;
    if (!s) return;
    await request('end',{token:s.token},500);
    if(s.canvas.getAttribute('data-apx-native-id')===s.token) s.canvas.removeAttribute('data-apx-native-id');
  }
  NS.native = {begin,read,end,diagnostic};
})();
