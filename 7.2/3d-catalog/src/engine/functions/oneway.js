// ---- односторонняя связь (st.ow) ----
// Если размер вырос из-за другого, то при обратном движении первого он назад не сжимается (и наоборот: сжатый до предела не растёт),
// когда между гранями этих размеров на каркасе было расстояние. Если грань общая («вровень»), связь двусторонняя, как раньше.
// st.rh — какие размеры сейчас удерживаются: {номер размера: {h: удерживаемая величина}}
// расстояние между ближайшими гранями двух размеров по исходному каркасу: 0 — грань общая, -1 — размеры на разных осях
function owGap(st,p,q){
  const a=st.dm[p],b=st.dm[q];let m=Infinity,any=false;
  for(let ax=0;ax<3;ax++){
    if(a.d[ax]===0||b.d[ax]===0)continue;
    any=true;const S=st.sk.s[ax],tol=1e-4*Math.abs(S[S.length-1]-S[0])+1e-6;
    [a.sk[0],a.sk[1]].forEach(i=>[b.sk[0],b.sk[1]].forEach(j=>{const d=Math.abs(S[i]-S[j]);m=Math.min(m,d<=tol?0:d)}));
  }
  return any?m:-1;
}
// двигаемые размеры вместе со всеми, кто связан с ними группами синхронизации и пропорции
function owFam(st,drag){
  const f=drag.slice(),G=dmLinks(st);
  for(let more=true;more;){more=false;for(const k in G)if(G[k].some(e=>e.m.some(j=>f.indexOf(j)>=0)))G[k].forEach(e=>e.m.forEach(j=>{if(f.indexOf(j)<0){f.push(j);more=true}}))}
  return f.filter(q=>st.dm[q]&&st.dm[q].sk);
}
function owSet(g,st,key,val){
  const old=JSON.parse(JSON.stringify(st)),lk=old.lk||{},rh=old.rh||{};
  const drag=key[0]==='q'?[+key.slice(1)]:((old.cm&&old.cm[+key.slice(1)])||{m:[]}).m;
  const fam=owFam(old,drag),was=dmShot(old);
  // 1. свободный ход: удержания сняты, работает прежняя логика
  delete st.rh;
  Object.keys(rh).forEach(q=>{if(lk[q])return;st.dv[q]=st.dm[q].v0;['last','un','ua'].forEach(k=>{if(st[k])st[k]=st[k].filter(x=>x!==+q)})});
  const pre=JSON.stringify(st);
  geoSet1(g,st,key,val);
  const restore=()=>{Object.keys(st).forEach(k=>delete st[k]);Object.assign(st,JSON.parse(JSON.stringify(old)))};
  // ход не выполнен (не поместился) — всё остаётся как было, вместе с удержаниями
  if(JSON.stringify(st)===pre){restore();return}
  const free=JSON.parse(JSON.stringify(st)),a1=dmSkSolve(free).val,a0=was.A,F=free.sk.f;
  // 2. кого удерживать: тех, кто вырос (или сжат до предела) из-за этого хода и сам по себе не двигался
  const H=[];
  free.dm.forEach((s,D)=>{
    if(!s.sk||s.t==='A'||fam.indexOf(D)>=0||lk[D]||a0[D]===undefined||a1[D]===undefined)return;
    if(Math.abs(free.dv[D]-s.v0)>1e-7)return;
    const ax=s.d.findIndex(x=>x!==0);
    let wide=false;for(let k=s.sk[0];k<s.sk[1];k++)if(F[ax]&&!F[ax][k])wide=true;
    if(!wide)return; // стенки сами по себе не тянутся: они только занимают освободившееся место
    const gaps=fam.map(p=>owGap(free,p,D)).filter(x=>x>=0);
    if(!gaps.length||gaps.some(x=>x===0))return; // грань общая — движется в обе стороны
    const o=a0[D],f=a1[D];
    if(o>s.v0+.01&&f<o-.01)H.push([D,o]);
    else if(o<s.v0-.01&&f>o+.01&&o<=Math.min(s.mn,s.v0)+.01)H.push([D,o]);
  });
  if(!H.length)return;
  // 3. те же ходы, но удерживаемые размеры стоят на своих величинах
  const open=dmFree(old,key).open,L=Object.assign({},lk);open.forEach(q=>delete L[q]);
  const G0=dmLinks(old),gap=(S,l)=>{const v=l.map(e=>dmVal(S.st,e,S.A));return (Math.max(...v)-Math.min(...v))*Math.max(...l.map(e=>e.k))};
  const mid=(S,q)=>{const s=free.dm[q],ax=s.d.findIndex(x=>x!==0),e=S.c.find(c=>c.ax===ax),p=e?e.by:free.sk.s[ax];return (p[s.sk[0]]+p[s.sk[1]])/2};
  const fr=dmShot(free);
  const build=Hs=>{
    const t=JSON.parse(JSON.stringify(free)),last=(t.last||[]).slice(),ua=(t.ua||[]).slice(),un=(t.un||[]).slice(),push=(a,x)=>{if(a.indexOf(x)<0)a.push(x)};
    fam.forEach(p=>push(un,p));
    Hs.forEach(h=>{t.dv[h[0]]=h[1];push(last,h[0]);push(ua,h[0]);push(un,h[0])});
    t.last=last;t.ua=ua;t.un=un;t.rh={};Hs.forEach(h=>{t.rh[h[0]]={h:h[1]}});delete t.cb;
    return t;
  };
  const good=(t,Hs)=>{
    const now=dmShot(t),A=now.A;
    if(Hs.some(h=>!(Math.abs(A[h[0]]-h[1])<=.005)))return false;
    if(drag.some(q=>A[q]!==undefined&&a1[q]!==undefined&&Math.abs(A[q]-a1[q])>.01))return false;
    if(!dmGood({st:Object.assign({},t,{lk:L}),c:now.c,A},was,[],drag))return false;
    if(!Object.keys(G0).every(k=>gap(now,G0[k])<=Math.max(gap(was,G0[k]),.003)+.002))return false;
    if(!Object.keys(t.cp||{}).every(q=>Math.abs(mid(now,+q)-mid(was,+q))<=.01))return false;
    // удержание не должно сжимать стенки сильнее, чем это сделал свободный ход
    return now.c.every((e,i)=>{const f=fr.c[i],Fx=t.sk.f[e.ax];return e.by.every((v,k)=>!k||!Fx||!Fx[k-1]||e.by[k]-e.by[k-1]>=Math.min(f.by[k]-f.by[k-1],e.bx[k]-e.bx[k-1])-.01)});
  };
  let Hs=[];
  H.forEach(h=>{const t=build(Hs.concat([h]));if(good(t,Hs.concat([h])))Hs.push(h)});
  if(!Hs.length)return;
  const fin=build(Hs);Object.keys(st).forEach(k=>delete st[k]);Object.assign(st,fin);
}
// включить или выключить одностороннюю связь для модели
function dmOw(st,on){
  if(on){st.ow=1;return true}
  const rh=st.rh||{};delete st.ow;delete st.rh;delete st.cb;
  Object.keys(rh).forEach(q=>{if(st.lk&&st.lk[q])return;if(st.dm&&st.dm[q])st.dv[q]=st.dm[q].v0;['last','un','ua'].forEach(k=>{if(st[k])st[k]=st[k].filter(x=>x!==+q)})});
  return true;
}
