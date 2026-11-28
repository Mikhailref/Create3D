function geoSet(g,st,key,val){
  if(st.ow&&st.dm&&st.sk&&(key[0]==='q'||key[0]==='c'))return owSet(g,st,key,val);
  return geoSet1(g,st,key,val);
}
function geoMove(g,st,key,val){
  const old=JSON.parse(JSON.stringify(st));
  geoSetRaw(g,st,key,val);
  if((key[0]==='q'||key[0]==='c')&&st.dm)dmKeep(g,st,old,key,val);
  if(geoOk(g,st)||!geoOk(g,old))return;
  // новое значение нарушает связь — останавливаем ползунок на границе допустимого
  const nw=JSON.parse(JSON.stringify(st));
  const mix=t=>{st.U=old.U+(nw.U-old.U)*t;['k','hf','df','sf'].forEach(f=>{for(let i=0;i<old[f].length;i++)st[f][i]=old[f][i]+(nw[f][i]-old[f][i])*t})};
  let lo=0,hi=1;
  for(let it=0;it<30;it++){const mid=(lo+hi)/2;mix(mid);if(geoOk(g,st))lo=mid;else hi=mid}
  mix(lo);
}
// текущий допустимый диапазон ползунка с учётом остальных размеров
function geoRange(g,st,p){
  const lim=v=>{const c=JSON.parse(JSON.stringify(st));geoSet(g,c,p.key,v);const q=geoParams({...g,st:c}).find(x=>x.key===p.key);return q?q.def:v};
  const a=lim(p.min),b=lim(p.max);
  return [Math.min(a,b,p.def),Math.max(a,b,p.def)];
}
function dmCap(s,v){const k=+s.rval;if(!isFinite(k))return v;switch(s.rop){case '*':return v*k;case '/':return k?v/k:v;case '+':return v+k;case '-':return v-k;default:return v}}
const cmSum0=(st,c)=>c.m.reduce((t,j)=>t+st.dm[j].v0,0);
// верхний предел составного от «Ограничить существующим размером»
function cmCap(st,c,A){if(c.rf>=0&&c.m.indexOf(c.rf)<0)return dmCap(c,A[c.rf]!==undefined?A[c.rf]:st.dv[c.rf]);return c.rfv>0?c.rfv:Infinity}
// skip — номер составного, чей предел сейчас учитывается отдельно
function dmLim(st,i,skip){const s=st.dm[i];let lo=s.mn,hi=s.mx,A=null;
  (st.cm||[]).forEach((c,ci)=>{if(ci===skip||c.m.indexOf(i)<0||!(c.rf>=0||c.rfv>0))return;A=A||dmSkSolve(st).val;const cap=cmCap(st,c,A);if(!isFinite(cap))return;
    hi=Math.min(hi,cap-c.m.reduce((t,j)=>j===i?t:t+(A[j]!==undefined?A[j]:st.dv[j]),0))});
  (s.hi||[]).forEach(h=>{const od=h.j>=0?st.dv[h.j]:2*h.r;hi=Math.min(hi,od-2*h.m)});
  (s.lo||[]).forEach(h=>{const id=h.j>=0?st.dv[h.j]:2*h.r;lo=Math.max(lo,id+2*h.m)});
  if(s.rf>=0)hi=Math.min(hi,dmCap(s,st.dv[s.rf]));else if(s.rfv>0)hi=Math.min(hi,s.rfv);
  return [lo,Math.max(lo,hi)]}
function dmSet(st,i,val){
  const s=st.dm[i],eq=[],pr=[],lk=st.lk||{};
  // размер под замком не меняется вслед за другими (ни через связанную группу, ни через пропорцию)
  st.dm.forEach((x,j)=>{if(j===i||lk[j])return;if(s.g&&x.g===s.g)eq.push(j);else if(s.pg&&x.pg===s.pg)pr.push(j)});
  let lim=dmLim(st,i),lo=lim[0],hi=lim[1];
  eq.forEach(j=>{const b=dmLim(st,j);lo=Math.max(lo,b[0]);hi=Math.min(hi,b[1])});
  pr.forEach(j=>{const x=st.dm[j],b=dmLim(st,j);
    if(x.t==='A'){lo=Math.max(lo,s.v0+(b[0]-x.v0));hi=Math.min(hi,s.v0+(b[1]-x.v0))}
    else{lo=Math.max(lo,s.v0*b[0]/x.v0);hi=Math.min(hi,s.v0*b[1]/x.v0)}});
  const cs=cmFollow(st,i,[i].concat(eq,pr));
  cs.forEach(e=>{lo=Math.max(lo,e.lo);hi=Math.min(hi,e.hi)});
  const v=Math.min(Math.max(val,Math.min(lo,hi)),Math.max(lo,hi));
  const set=[[i,v]].concat(eq.map(j=>[j,v]),pr.map(j=>{const x=st.dm[j];return [j,x.t==='A'?x.v0+(v-s.v0):x.v0*v/s.v0]}));
  cs.forEach(e=>e.make(v).forEach(x=>{if(!set.some(y=>y[0]===x[0]))set.push(x)}));
  dmCommit(st,set);
}
// составные из той же группы, что и размер i: получают то же значение (синхронизация) или то же соотношение (пропорция)
function cmFollow(st,i,taken){
  const s=st.dm[i],out=[];let A=null;
  (st.cm||[]).forEach((c,ci)=>{
    if(s.t==='A'||c.m.length<2||c.m.indexOf(i)>=0)return;
    const eq=s.g&&c.g===s.g,pr=!eq&&s.pg&&c.pg===s.pg;if(!eq&&!pr)return;
    A=A||dmSkSolve(st).val;
    const r=cmRoom(st,ci,A,c.m.map(j=>A[j]!==undefined?A[j]:st.dv[j]),taken);if(!r)return;
    const k=eq?1:cmSum0(st,c)/s.v0;
    out.push({lo:r.lo/k,hi:r.hi/k,make:v=>r.set(v*k)});
  });
  return out;
}
// составной ci как единое целое: допустимая сумма [lo, hi] и значения входящих для суммы T
function cmRoom(st,ci,A,vals,taken){
  const c=st.cm[ci],lk=st.lk||{},mem=[],v=[];let fix=0;
  c.m.forEach((j,n)=>{if(lk[j]||taken.indexOf(j)>=0)fix+=vals[n];else{mem.push(j);v.push(vals[n])}});
  const sum=v.reduce((a,x)=>a+x,0);if(!(sum>0))return null;
  let lo=0,hi=1e9;mem.forEach((j,n)=>{const l=dmLim(st,j,ci);lo=Math.max(lo,l[0]/v[n]);hi=Math.min(hi,l[1]/v[n])});
  return {mem,lo:Math.max(c.mn,fix+sum*lo),hi:Math.min(c.mx,cmCap(st,c,A),fix+sum*hi),set:T=>mem.map((j,n)=>[j,v[n]*Math.max(0,(T-fix)/sum)])};
}
// записать новые значения сразу нескольких размеров: set = [[номер размера, значение], …]
function dmCommit(st,set){
  const lk=st.lk||{},now=set.map(e=>e[0]);
  // по каждой оси помним, какой размер на ней двигали последним (движение по другой оси её не трогает)
  const hit=[0,1,2].map(a=>now.some(q=>st.dm[q].sk&&st.dm[q].d[a]!==0));
  const keep=(st.last||[]).filter(q=>{const x=st.dm[q];return now.indexOf(q)<0&&x.sk&&!x.d.some((c,a)=>c!==0&&hit[a])});
  st.last=now.concat(keep);
  if(st.cg)for(const q in st.cg)if(st.dm[q].d.some((c,a)=>c!==0&&hit[a]))delete st.cg[q];
  if(st.un)st.un=st.un.filter(q=>keep.indexOf(q)>=0);
  if(st.ua)st.ua=st.ua.filter(q=>keep.indexOf(q)>=0);
  set.forEach(e=>{st.dv[e[0]]=e[1]});
  st.dm.forEach((x,j)=>{if(x.rf>=0&&now.indexOf(x.rf)>=0&&!lk[j]){const cp=dmCap(x,st.dv[x.rf]);if(st.dv[j]>cp)st.dv[j]=Math.max(x.mn,cp)}});
  // составной с пределом «не больше другого размера»: уменьшается вслед за этим размером
  (st.cm||[]).forEach(c=>{
    if(!(c.rf>=0)||c.m.indexOf(c.rf)>=0||now.indexOf(c.rf)<0)return;
    const A=dmSkSolve(st).val,act=j=>A[j]!==undefined?A[j]:st.dv[j],cap=dmCap(c,act(c.rf)),sum=cmNow(st,c,A);
    if(sum<=cap+1e-6)return;
    const free=c.m.filter(j=>!lk[j]&&now.indexOf(j)<0),part=free.reduce((t,j)=>t+act(j),0);if(!(part>0))return;
    const f=Math.max(0,(cap-(sum-part))/part),set=free.map(j=>[j,Math.max(st.dm[j].mn,act(j)*f)]);
    set.forEach(e=>{st.dv[e[0]]=e[1];if(st.dm[e[0]].sk&&st.last.indexOf(e[0])<0)st.last.push(e[0])});
  });
  delete st.cb;
  if(Object.keys(lk).length||Object.keys(st.cp||{}).length)dmSync(st);
}
// ---- составной размер (st.cm): один ползунок меняет несколько размеров в одно и то же число раз ----
// фактическая сумма входящих размеров; A — то, что насчитал каркас
function cmNow(st,c,A){return c.m.reduce((t,j)=>t+(A[j]!==undefined?A[j]:st.dv[j]),0)}
function cmSet(st,i,val){
  const c=st.cm&&st.cm[i];if(!c)return;
  const lk=st.lk||{},A=dmSkSolve(st).val,act=j=>A[j]!==undefined?A[j]:st.dv[j];
  const mem=c.m.filter(j=>!lk[j]);if(!mem.length)return;
  // пропорции берутся с фактических размеров и держатся, пока двигают этот же ползунок
  const b=st.cb&&st.cb.i===i?st.cb:{i,v:mem.map(act),o:st.cm.map(x=>x.m.map(act)),f:1};
  const sum=b.v.reduce((a,x)=>a+x,0);if(!(sum>0))return;
  const fix=c.m.reduce((t,j)=>t+(lk[j]?act(j):0),0);
  // ent: [номер размера, значение при коэффициенте f]; следом идут связанные и пропорциональные размеры
  const ent=mem.map((j,n)=>[j,f=>b.v[n]*f]);let lo=0,hi=1e9;
  const bound=(a,z)=>{lo=Math.max(lo,a);hi=Math.min(hi,z)};
  // ограничение «не больше размера из этого же составного» растёт вместе с ним — проверяется на новых значениях
  const tied=mem.filter((j,n)=>{const x=st.dm[j],r=mem.indexOf(x.rf);return r>=0&&b.v[n]<=dmCap(x,b.v[r])*b.f+.005});
  const own=j=>tied.indexOf(j)<0?dmLim(st,j,i):dmLim(Object.assign({},st,{dm:st.dm.map((x,q)=>q===j?Object.assign({},x,{rf:-1,rfv:0}):x)}),j,i);
  mem.forEach((j,n)=>{
    const s=st.dm[j],v=b.v[n],l=own(j);bound(l[0]/v,l[1]/v);
    st.dm.forEach((x,q)=>{
      if(lk[q]||mem.indexOf(q)>=0||ent.some(e=>e[0]===q))return;
      const m=dmLim(st,q);
      if(s.g&&x.g===s.g){ent.push([q,f=>v*f]);bound(m[0]/v,m[1]/v)}
      else if(s.pg&&x.pg===s.pg){
        if(x.t==='A')ent.push([q,f=>x.v0+(v*f-s.v0)]);
        else{ent.push([q,f=>x.v0*v*f/s.v0]);bound(m[0]*s.v0/(x.v0*v),m[1]*s.v0/(x.v0*v))}
      }
    });
  });
  // группы самого составного: другие размеры и составные получают то же значение или то же соотношение
  const T0=cmSum0(st,c),T=f=>fix+sum*f,back=t=>(t-fix)/sum;
  if(c.g||c.pg){
    st.dm.forEach((x,q)=>{
      const eq=c.g&&x.g===c.g,pr=!eq&&c.pg&&x.pg===c.pg;
      if(!eq&&!pr||lk[q]||c.m.indexOf(q)>=0||ent.some(e=>e[0]===q)||eq&&x.t==='A')return;
      if(x.t==='A'){ent.push([q,f=>x.v0+(T(f)-T0)]);return}
      const k=eq?1:x.v0/T0,m=dmLim(st,q);
      ent.push([q,f=>T(f)*k]);bound(back(m[0]/k),back(m[1]/k));
    });
    st.cm.forEach((c2,n)=>{
      const eq=c.g&&c2.g===c.g,pr=!eq&&c.pg&&c2.pg===c.pg;
      if(n===i||!eq&&!pr||c2.m.length<2)return;
      const r=cmRoom(st,n,A,b.o&&b.o[n]||c2.m.map(act),c.m.concat(ent.map(e=>e[0])));if(!r)return;
      const k=eq?1:cmSum0(st,c2)/T0;
      r.mem.forEach((j,x)=>ent.push([j,f=>r.set(T(f)*k)[x][1]]));
      bound(back(r.lo/k),back(r.hi/k));
    });
  }
  const cap=cmCap(st,c,A);if(isFinite(cap))bound(0,back(cap));
  const goal=(Math.min(Math.max(val,c.mn),c.mx)-fix)/sum;
  let f=Math.min(Math.max(goal,Math.min(lo,b.f)),Math.max(hi,b.f));
  const make=k=>ent.map(e=>[e[0],e[1](k)]);
  // если все сразу не помещаются (замки, стенки), берём наибольший коэффициент, при котором пропорция сохраняется
  const fits=k=>{const t=JSON.parse(JSON.stringify(st)),w=make(k);dmCommit(t,w);const R=dmSkSolve(t).val;return w.every(e=>(R[e[0]]===undefined||Math.abs(R[e[0]]-e[1])<.005)&&(tied.indexOf(e[0])<0||Math.abs(t.dv[e[0]]-e[1])<.005))};
  if(Math.abs(f-b.f)>1e-12&&!fits(f)){let ok=b.f,no=f;for(let n=0;n<18;n++){const m=(ok+no)/2;if(fits(m))ok=m;else no=m}f=ok}
  dmCommit(st,make(f));
  st.cb={i,v:b.v,o:b.o,f};
}
function geoSetRaw(g,st,key,val){
  if(key==='sc')st.U=gclamp(val/100,.3,3);
  else if(key[0]==='c')cmSet(st,+key.slice(1),val);
  else if(key[0]==='q'){const i=+key.slice(1),s=st.dm&&st.dm[i];if(s)dmSet(st,i,val)}
  else if(key[0]==='k'){const a=GAX.toLowerCase().indexOf(key[1]);st.k[a]=gclamp(val/(g.dim[a]*st.U),.25,4)}
  else if(key[0]==='p'){const a=GAX.toLowerCase().indexOf(key[1]),b=GAX.toLowerCase().indexOf(key[2]);st.k[a]=st.k[b]=gclamp(val/100,.25,4)}
  else if(key[0]==='d'){const i=+key.slice(1);st.df[i]=gclamp(val/(2*g.boss[i].r*st.U),.2,5)}
  else if(key[0]==='h'){const i=+key.slice(1);st.hf[i]=gclamp(val/(2*g.hole[i].r*st.U),.2,5)}
  else if(key.slice(0,2)==='sl'){const i=+key.slice(2),s=g.slope[i];st.sf[i]=gclamp(Math.tan(gclamp(val,.5,70)*Math.PI/180)/(Math.tan(s.a0*Math.PI/180)*(st.k[s.w]/st.k[s.u])),.2,5)}
}
function geoVals(g,st){const o={};geoParams({...g,st}).forEach(p=>{o[p.key]=p.def});return o}

function geoOff(e){
  if(e.ui&&Array.isArray(e.ui.off))return new Set(e.ui.off);
  return new Set(geoParams(e.geo).filter(p=>p.kind==='pr').map(p=>p.key));
}
// запись модели (формат objmodel v6: масштаб, оси, диаметры, отверстия, уклоны)
function buildEntryGeo(o){
  const c=o.canon,big=c.U.length/3>65535;
  const idx=big?Uint32Array.from(c.I):Uint16Array.from(c.I);
  return {fmt:'objmodel',ver:6,thn:1,desc:o.desc||{},id:o.id,name:o.name,tag:o.tag,color:o.color,z:!!o.z,s:!!o.s,
    src:o.src,tris:c.I.length/3,added:new Date().toISOString().slice(0,10),thumb:o.thumb||'',
    pos:b64enc(c.U),idx:b64enc(idx),ib:big?4:2,geo:o.geo,ui:o.ui||{off:[],lab:{},rg:{}}};
}

