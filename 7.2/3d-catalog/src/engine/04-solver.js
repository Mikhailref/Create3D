// ---- размеры на каркасе: длины участков решаются совместно, чтобы форма детали сохранялась ----
// st.sk = {s:[плоскости X, Y, Z], f:[закреплённые участки]}, у размера s.sk = [i, j, точка1 в начале?]
function dmGauss(A,b){const n=b.length;for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r;const ta=A[c];A[c]=A[p];A[p]=ta;const tb=b[c];b[c]=b[p];b[p]=tb;if(!A[c][c])continue;for(let r=c+1;r<n;r++){const f=A[r][c]/A[c][c];if(!f)continue;for(let k=c;k<n;k++)A[r][k]-=f*A[c][k];b[r]-=f*b[c]}}const x=new Array(n).fill(0);for(let r=n-1;r>=0;r--){let v=b[r];for(let k=r+1;k<n;k++)v-=A[r][k]*x[k];x[r]=A[r][r]?v/A[r][r]:0}return x}
// замки: st.lk = {номер размера:1} — такой размер меняется только своим ползунком, чужие в него упираются
// st.un — размеры, которые временно удерживаются сразу после установки или снятия замка (чтобы модель не дёрнулась)
function dmMoved(st,q){return !!(st.lk&&st.lk[q])||!!(st.un&&st.un.indexOf(q)>=0)||Math.abs(st.dv[q]-st.dm[q].v0)>1e-7}
function dmSkSolve(st){
  const out={c:[],val:{}},dm=st.dm,dv=st.dv,last=st.last||[],lk=st.lk||{},ua=st.ua||[];
  if(!st.sk)return out;
  for(let ax=0;ax<3;ax++){
    const ids=[];dm.forEach((s,q)=>{if(s.sk&&s.d[ax]!==0)ids.push(q)});
    if(!ids.length)continue;
    const S=st.sk.s[ax],F=st.sk.f[ax],n=S.length-1,l0=[];for(let k=0;k<n;k++)l0.push(S[k+1]-S[k]);
    const moved=q=>dmMoved(st,q);
    // фиксаторы центра: st.cp[q] — где должен оставаться центр размера q на своей оси
    // st.cg — только что снятые фиксаторы: держат форму до следующего движения по этой оси, чтобы деталь не дёрнулась
    const cp=Object.assign({},st.cg,st.cp),R=ids.filter(q=>st.cp&&st.cp[q]!==undefined),P=R.concat(ids.filter(q=>cp[q]!==undefined&&R.indexOf(q)<0));
    const cRow=q=>{const r=new Array(n).fill(0),a=dm[q].sk[0],z=dm[q].sk[1];for(let k=0;k<z;k++)r[k]=k<a?1:.5;return r};
    let l=l0.slice();
    if(ids.some(moved)||P.length>1){ // связи действуют, как только на оси что-то двигали
      const top=last.filter(q=>ids.indexOf(q)>=0),pin=[],done={};
      const row=(i,j)=>{const r=new Array(n).fill(0);for(let k=i;k<j;k++)r[k]=1;return r};
      const eqs=dmEq(st,ax,n);
      for(let it=0;it<=n+ids.length;it++){
        const A=[],b=[];for(let k=0;k<n;k++){A.push(new Array(n).fill(0));const w=(F[k]?1e6:.01)/l0[k];A[k][k]=w;b.push(w*l0[k])}
        // жёсткие условия: замки, затем пределы, затем ползунок, который двигают сейчас (повторяющие условия пропускаются)
        const hard=[],basis=[];
        const add=(r,v)=>{const o=r.slice();basis.forEach(e=>{let d=0;for(let k=0;k<n;k++)d+=o[k]*e[k];for(let k=0;k<n;k++)o[k]-=d*e[k]});const len=Math.hypot(...o);if(len<1e-6)return;basis.push(o.map(x=>x/len));hard.push([r,v])};
        ids.forEach(q=>{if(lk[q]&&top.indexOf(q)<0)add(row(dm[q].sk[0],dm[q].sk[1]),dv[q])});
        // привязки st.sk.t: длина a = r × длина b (диаметр резьбы к диаметру носителя) — жёсткая связь, не зависит от того, какой из размеров двигают
        ((st.sk&&st.sk.t)||[]).forEach(e=>{if(e.k!==ax)return;const r=new Array(n).fill(0);for(let k=e.a[0];k<e.a[1];k++)r[k]+=1;for(let k=e.b[0];k<e.b[1];k++)r[k]-=e.r;add(r,0)});
        P.slice(1).forEach(q=>{const a=cRow(q),z=cRow(P[0]);add(a.map((v,k)=>v-z[k]),cp[q]-cp[P[0]])});
        eqs.forEach(r=>add(r,0));
        pin.forEach(p=>add(p[0],p[1]));
        top.forEach(q=>{if(moved(q))add(row(dm[q].sk[0],dm[q].sk[1]),dv[q])});
        ids.forEach(q=>{
          if(top.indexOf(q)>=0&&moved(q))return;
          const s=dm[q],i=s.sk[0],j=s.sk[1];
          // приоритет: изменённые раньше > закреплённые участки > объемлющие размеры > остальные
          const parent=top.some(t=>t!==q&&ua.indexOf(t)<0&&dm[t].sk[0]>=i&&dm[t].sk[1]<=j);
          const W=(moved(q)?1e9:parent?1e3:.1)/s.L0,v=moved(q)?dv[q]:s.L0;
          for(let a=i;a<j;a++){b[a]+=W*v;for(let c=i;c<j;c++)A[a][c]+=W}
        });
        const solve=()=>{const m=hard.length,M=A.map((r,k)=>r.concat(hard.map(h=>h[0][k]))),c=b.slice();hard.forEach(h=>{M.push(h[0].concat(new Array(m).fill(0)));c.push(h[1])});return dmGauss(M,c).slice(0,n)};
        l=solve();
        // проверка пределов: толщина участков и «от/до» остальных ползунков
        let bad=false;
        for(let k=0;k<n&&!bad;k++){const mn=dmMinL(st,ax,k,l0[k]);if(!done['s'+k]&&l[k]<mn-1e-6){done['s'+k]=bad=true;pin.unshift([row(k,k+1),mn])}}
        for(let x=0;x<ids.length&&!bad;x++){const q=ids[x],s=dm[q];if(done[q])continue;let v=0;for(let k=s.sk[0];k<s.sk[1];k++)v+=l[k];
          const c=Math.min(Math.max(v,Math.min(s.mn,s.L0)),Math.max(s.mx,s.L0));if(Math.abs(c-v)>1e-6){done[q]=bad=true;pin.push([row(s.sk[0],s.sk[1]),c])}}
        if(!bad){
          // изменённые раньше размеры держим точно: мягкое решение отстаёт от них на доли процента
          const len=(x,q)=>{let v=0;for(let k=dm[q].sk[0];k<dm[q].sk[1];k++)v+=x[k];return v};
          // так же держим габариты вокруг двигаемого размера: без этого они «уплывают» на сотые доли
          const want=q=>moved(q)?dv[q]:dm[q].L0,outer=q=>top.some(t=>t!==q&&ua.indexOf(t)<0&&dm[t].sk[0]>=dm[q].sk[0]&&dm[t].sk[1]<=dm[q].sk[1]);
          const near=ids.filter(q=>{if(lk[q]||top.indexOf(q)>=0||!(moved(q)||outer(q)))return false;const e=Math.abs(len(l,q)-want(q));return e>1e-9&&e<.005*Math.abs(want(q))+.05}).sort((a,b)=>moved(b)-moved(a));
          if(near.length){
            near.forEach(q=>add(row(dm[q].sk[0],dm[q].sk[1]),want(q)));
            const x=solve();
            if(x.every((v,k)=>v>=dmMinL(st,ax,k,l0[k])-1e-6))l=x;
          }
          break;
        }
      }
    }
    const t=[S[0]];for(let k=0;k<n;k++)t.push(t[k]+l[k]);
    // опорная точка остаётся на месте: у самого большого размера под замком, иначе у последнего изменённого
    let r=-1;ids.forEach(q=>{if(lk[q]&&(r<0||dm[q].L0>dm[r].L0))r=q});
    if(r<0)last.forEach(q=>{if(r<0&&ids.indexOf(q)>=0)r=q});if(r<0)r=ids[0];
    const s=dm[r],i1=s.sk[2]?s.sk[0]:s.sk[1],i2=s.sk[2]?s.sk[1]:s.sk[0],f=DMAN[s.an];
    const sh=(S[i1]+f*(S[i2]-S[i1]))-(t[i1]+f*(t[i2]-t[i1]));
    // зафиксированный центр главнее остальных опорных точек
    const move=R.length?cp[R[0]]-(t[dm[R[0]].sk[0]]+t[dm[R[0]].sk[1]])/2:sh;
    for(let k=0;k<t.length;k++)t[k]+=move;
    ids.forEach(q=>{out.val[q]=t[dm[q].sk[1]]-t[dm[q].sk[0]]});
    out.c.push({ax,bx:S,by:t});
  }
  return out;
}
// записать в ползунки то, что получилось на самом деле (чтобы после снятия замка ничего не «выстрелило»)
function dmSync(st,i){const A=dmSkSolve(st).val,mv=[];st.dm.forEach((x,j)=>{if(A[j]!==undefined&&(j===i||dmMoved(st,j)))mv.push(j)});mv.forEach(j=>{const v0=st.dm[j].v0;st.dv[j]=Math.abs(A[j]-v0)<1e-6?v0:A[j]});return mv}
// поставить или снять замок на размер каркаса
function dmLock(st,i,on){
  const s=st.dm&&st.dm[i];if(!s||!s.sk||!st.sk)return false;
  const hold=dmSync(st,i),lk=Object.assign({},st.lk);
  if(on)lk[i]=1;else delete lk[i];
  st.lk=lk;delete st.cb;
  const last=(st.last||[]).filter(q=>st.dm[q].sk);
  dmHold(st,hold,last);
  return true;
}
function dmHold(st,hold,last){
  const added=hold.filter(q=>last.indexOf(q)<0);
  st.last=last.concat(added);st.un=hold;
  // st.ua — добавлены только ради удержания: на распределение растяжения между участками они не влияют
  st.ua=(st.ua||[]).filter(q=>hold.indexOf(q)>=0&&added.indexOf(q)<0).concat(added);
}
// включить или выключить фиксатор центра размера. st.co — рамка детали по оси на экране: пока центр зафиксирован, деталь не центруется заново
function dmPin(st,i,on){
  const s=st.dm&&st.dm[i];if(!s||!s.sk||!st.sk)return false;
  const ax=s.d.findIndex(x=>x!==0),e=dmSkSolve(st).c.find(c=>c.ax===ax),t=e?e.by:st.sk.s[ax];
  const hold=dmSync(st,i),cp=Object.assign({},st.cp),co=Object.assign({},st.co);
  const cg=Object.assign({},st.cg);
  // все положения на этой оси берутся из одного и того же текущего состояния
  const mid=q=>(t[st.dm[q].sk[0]]+t[st.dm[q].sk[1]])/2,here=o=>Object.keys(o).forEach(q=>{if(st.dm[q].d[ax]!==0)o[q]=mid(q)});
  if(on){delete cg[i];here(cp);here(cg);cp[i]=mid(i);if(!co[ax])co[ax]=[t[0],t[t.length-1]]}
  else{if(cp[i]!==undefined){delete cp[i];cg[i]=0}here(cp);here(cg);if(!Object.keys(cp).some(q=>st.dm[q].d[ax]!==0))delete co[ax]}
  st.cp=cp;st.co=co;st.cg=cg;delete st.cb;
  dmHold(st,hold,(st.last||[]).filter(q=>st.dm[q].sk));
  return true;
}
// исходные положения для зафиксированных центров (кнопка «Исходные размеры»)
function dmPinReset(st){
  if(!st.cp||!st.sk)return;
  st.co={};
  Object.keys(st.cp).forEach(q=>{const s=st.dm[q],ax=s.d.findIndex(x=>x!==0),t=st.sk.s[ax];st.cp[q]=(t[s.sk[0]]+t[s.sk[1]])/2;st.co[ax]=[t[0],t[t.length-1]]});
}
function dmViewFix(G,st,zu,mn,mx){
  const co=st&&st.co;if(!co)return;
  for(const key in co){
    const a=+key,c=G.c0[a],lo=c+st.U*(co[key][0]-c),hi=c+st.U*(co[key][1]-c),d=zu?[0,2,1][a]:a;
    if(zu&&a===1){mn[d]=-hi;mx[d]=-lo}else{mn[d]=lo;mx[d]=hi}
  }
}
