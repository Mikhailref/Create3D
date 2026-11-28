// участники связей: ключ «g1» — синхронизация, «p1» — пропорция. m — номера размеров, k — делитель (для пропорции исходная величина)
function dmLinks(st){
  const out={};
  const add=(x,m,k0)=>{if(x.g)(out['g'+x.g]=out['g'+x.g]||[]).push({m,k:1});if(x.pg)(out['p'+x.pg]=out['p'+x.pg]||[]).push({m,k:k0})};
  // участники под замком тоже в связи: чужой размер их не изменит, значит и всю группу врозь не растащит
  (st.dm||[]).forEach((s,q)=>{if(s.t!=='A')add(s,[q],s.v0)});
  (st.cm||[]).forEach(c=>{if(c.m.length>1)add(c,c.m,cmSum0(st,c))});
  return out;
}
// замок и связь вместе. Для движения ползунком key:
// open — замки, которые отменяются: участники тех же групп (и групп, связанных через них); составной, у которого под замком всё, — тоже участник;
// shut — размеры чужих групп, где кто-то под замком: этот ползунок не может изменить замок, значит и остальных, иначе связь разорвётся
function dmFree(st,key){
  const lk=st.lk||{},out={open:[],shut:[]};
  if(!st.dm||!Object.keys(lk).length)return out;
  const E=st.dm.map((s,q)=>({s,m:[q],key:'q'+q})).concat((st.cm||[]).map((s,i)=>({s,m:s.m,key:'c'+i})).filter(e=>e.m.length>1));
  const start=E.find(e=>e.key===key);if(!start)return out;
  const tags=e=>['g','pg'].filter(k=>e.s[k]&&e.s.t!=='A').map(k=>k[0]+e.s[k]); // те же ключи, что в dmLinks
  // семья: всё, что связано группами с e; same — учитывать только связи, где значения сейчас совпадают
  const family=(e,same)=>{const f=[e];for(let n=0;n<f.length;n++){const t=tags(f[n]).filter(same);E.forEach(x=>{if(f.indexOf(x)<0&&tags(x).some(y=>t.indexOf(y)>=0))f.push(x)})}return f};
  const mine=family(start,()=>true),locked=e=>e.m.every(j=>lk[j]);
  mine.slice(1).forEach(e=>{if(locked(e))e.m.forEach(j=>{if(out.open.indexOf(j)<0)out.open.push(j)})});
  const G=dmLinks(st),A=dmSkSolve(st).val,held=k=>G[k]&&dmSame(st,G[k],A);
  const seen=mine.slice();
  E.forEach(e=>{
    if(seen.indexOf(e)>=0)return;
    const f=family(e,held);f.forEach(x=>seen.push(x));
    if(f.some(locked))f.forEach(x=>{const q=x.m[0];if(x.key[0]==='q'&&!lk[q]&&mine.indexOf(x)<0&&st.dm[q].sk&&A[q]!==undefined)out.shut.push(q)});
  });
  return out;
}
// приведённая величина участника: у всех участников целой связи она одинакова
function dmVal(st,e,A){return e.m.reduce((t,j)=>t+(A&&A[j]!==undefined?A[j]:st.dv[j]),0)/e.k}
const dmSame=(st,L,A)=>{const v=L.map(e=>dmVal(st,e,A)),k=Math.max(...L.map(e=>e.k));return (Math.max(...v)-Math.min(...v))*k<=.002};
// строки «участник − участник = 0» для одной оси: связываются те, у кого заданные значения сейчас совпадают
function dmEq(st,ax,n){
  const out=[],G=dmLinks(st),on=e=>e.m.every(j=>{const s=st.dm[j];return s.sk&&s.d[ax]!==0});
  for(const key in G){
    const seen=[];
    G[key].filter(on).forEach(e=>{
      const v=dmVal(st,e),r=seen.find(x=>Math.abs(x.v-v)*e.k<=.01);
      if(!r){seen.push({v,e});return}
      const row=new Array(n).fill(0),put=(m,f)=>m.forEach(j=>{for(let a=st.dm[j].sk[0];a<st.dm[j].sk[1];a++)row[a]+=f});
      put(e.m,1);put(r.e.m,-e.k/r.e.k);out.push(row);
    });
  }
  return out;
}
// всё, что нужно для проверки состояния: расчёт каркаса и фактические величины
function dmMinL(st,ax,k,l0){const t=(st.sk&&st.sk.t)||[];return t.some(e=>e.k===ax&&(k>=e.a[0]&&k<e.a[1]||k>=e.b[0]&&k<e.b[1]))?.05*l0:Math.min(l0,Math.max(.4,.05*l0))}
function dmShot(st){const s=dmSkSolve(st);return {st,c:s.c,A:s.val}}
// что сломалось по сравнению с состоянием «до»: стенки, замки, пределы «от/до», связи групп
function dmGood(now,was,need,drag){
  const st=now.st,lk=st.lk||{},act=(S,q)=>S.A[q]!==undefined?S.A[q]:S.st.dv[q];
  const thin=(S,ax,k)=>{const e=S.c.find(c=>c.ax===ax);if(!e)return false;const l0=e.bx[k+1]-e.bx[k];return e.by[k+1]-e.by[k]<dmMinL(S.st,ax,k,l0)-.005};
  if(now.c.some(e=>e.by.some((v,k)=>k&&thin(now,e.ax,k-1)&&!thin(was,e.ax,k-1))))return false;
  for(let q=0;q<st.dm.length;q++){
    const s=st.dm[q],v=act(now,q),o=act(was,q);
    if(lk[q]&&drag.indexOf(q)<0&&Math.abs(v-o)>.01)return false;
    if(s.t==='A'||!s.sk)continue;
    const out=x=>Math.max(Math.min(s.mn,s.v0)-x,x-Math.max(s.mx,s.v0));
    if(out(v)>.01&&out(v)>out(o)+.001)return false;
  }
  const G=dmLinks(st);
  return need.every(key=>!G[key]||dmSame(st,G[key],now.A));
}
// после движения: если разошлись связи, остальные участники подтягиваются за изменившимся (например, стенки другой оси)
function dmSpread(t,was,need,drag){
  need.forEach(key=>{
    const now=dmShot(t),L=dmLinks(t)[key];if(!L||dmSame(t,L,now.A))return;
    if(L.some(e=>e.m.some(j=>drag.indexOf(j)>=0)))return; // двигают участника этой связи — тогда просто ограничиваем ход
    let lead=L[0],far=-1;L.forEach(e=>{const d=Math.abs(dmVal(t,e,now.A)-dmVal(was.st,e,was.A))*e.k;if(d>far){far=d;lead=e}});
    const v=dmVal(t,lead,now.A),set=[],lk=t.lk||{};
    L.forEach(e=>{
      if(e===lead||Math.abs(dmVal(t,e,now.A)-v)*e.k<=.001)return;
      const act=j=>now.A[j]!==undefined?now.A[j]:t.dv[j],free=e.m.filter(j=>!lk[j]),part=free.reduce((a,j)=>a+act(j),0),all=e.m.reduce((a,j)=>a+act(j),0);
      if(part>0)free.forEach(j=>set.push([j,act(j)*Math.max(0,(v*e.k-(all-part))/part)]));
    });
    if(set.length)dmCommit(t,set);
  });
}
// заданные значения участников целой связи приводятся к фактическим: иначе следующее движение их «разведёт»
function dmSettle(t,was,need,drag){
  const now=dmShot(t),G=dmLinks(t),s=JSON.parse(JSON.stringify(t));
  let any=false;
  need.forEach(key=>{(G[key]||[]).forEach(e=>{if(e.m.length>1)return;const q=e.m[0],a=now.A[q];if(a===undefined)return;
    const v=Math.abs(a-s.dm[q].v0)<1e-6?s.dm[q].v0:a;if(Math.abs(v-s.dv[q])>1e-7){s.dv[q]=v;any=true}})});
  if(any&&dmGood(dmShot(s),was,need,drag))t.dv=s.dv;
}
// не даёт движению сломать деталь: если запрошенное значение не помещается, ползунок останавливается на последнем подходящем
function dmKeep(g,st,old,key,val){
  const i=+key.slice(1),drag=key[0]==='q'?[i]:old.cm&&old.cm[i]?old.cm[i].m:[],was=dmShot(old),G=dmLinks(old);
  const held=Object.keys(G).filter(k=>G[k].length>1&&dmSame(old,G[k],was.A));
  // связи самого двигаемого размера должны выполняться и после движения, даже если раньше значения различались
  const own=Object.keys(G).filter(k=>held.indexOf(k)<0&&G[k].length>1&&G[k].some(e=>key[0]==='q'?e.m.length===1&&e.m[0]===i:old.cm&&e.m===old.cm[i].m));
  const fit=(t,need)=>{
    if(dmGood(dmShot(t),was,need,drag)){dmSettle(t,was,need,drag);return t}
    const s=JSON.parse(JSON.stringify(t)),before=dmShot(t).A;dmSpread(s,was,need,drag);
    const now=dmShot(s);
    if(drag.some(j=>before[j]!==undefined&&Math.abs(now.A[j]-before[j])>.01)||!dmGood(now,was,need,drag))return null;
    dmSettle(s,was,need,drag);return s;
  };
  const search=need=>{
    const first=fit(JSON.parse(JSON.stringify(st)),need);if(first)return first;
    const p=geoParams({...g,st:old}).find(x=>x.key===key);
    let a=p?p.def:val,b=val,ok=null;
    for(let n=0;n<22;n++){const m=(a+b)/2,t=JSON.parse(JSON.stringify(old));geoSetRaw(g,t,key,m);const r=fit(t,need);if(r){a=m;ok=r}else b=m}
    return ok;
  };
  const res=search(held.concat(own))||(own.length?search(held):null)||old;
  if(res!==st)['dv','last','un','ua','cb','cg'].forEach(k=>{if(res[k]===undefined)delete st[k];else st[k]=res[k]});
}
