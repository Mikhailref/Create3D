// плоскости каркаса: из файла редактора (с вашими галочками «Фикс.») или заново по геометрии
function dmSkeleton(U,I,k,sk){
  if(sk&&sk.axes){const A=['x','y','z'].map(n=>sk.axes[n]);
    const r={tol:(sk.tolerance||.01)*k,s:A.map(a=>a.stations.map(v=>v*k)),f:A.map(a=>a.segments.map(x=>x.fixed?1:0))};
    // привязки резьбы к носителю: в файле они по значениям плоскостей, здесь — по номерам
    const ix=(a,v)=>r.s[a].findIndex(s=>Math.abs(s-v*k)<=r.tol*3),t=[];
    (sk.ties||[]).forEach(e=>{const a=['x','y','z'].indexOf(e.axis);if(a<0)return;const p=[ix(a,e.a[0]),ix(a,e.a[1])],q=[ix(a,e.b[0]),ix(a,e.b[1])];if(p[0]>=0&&p[1]>p[0]&&q[0]>=0&&q[1]>q[0])t.push({k:a,a:p,b:q,r:e.r})});
    if(t.length)r.t=t;
    return r}
  const b=skBuild([{positions:expand(U,I)}]);
  const r={tol:b.tol,s:b.axes.map(a=>a.stations),f:b.axes.map(a=>a.segments.map(x=>x.fixed?1:0))};
  if(b.ties&&b.ties.length)r.t=b.ties.map(e=>({k:e.k,a:e.a.slice(),b:e.b.slice(),r:e.r}));
  return r;
}
// плоскость размера общая для всей детали (false: на ней несколько отдельных граней, изменение должно быть местным)
function dmWhole(U,csr,inw,tol){
  const ax=inw.ax,u=(ax+1)%3,v=(ax+2)%3,V=U.length/3,on=i=>Math.abs(U[i*3+ax]-inw.fc)<=tol,seen=new Uint8Array(V);let first=-1,bd=Infinity;
  for(let i=0;i<V;i++){if(!on(i))continue;const d=Math.hypot(U[i*3+u]-inw.fp[u],U[i*3+v]-inw.fp[v]);if(d<bd){bd=d;first=i}}
  if(first<0)return true;
  const q=[first];seen[first]=1;
  for(let h=0;h<q.length;h++)for(let e=csr.off[q[h]];e<csr.off[q[h]+1];e++){const w=csr.nb[e];if(!seen[w]&&on(w)){seen[w]=1;q.push(w)}}
  for(let i=0;i<V;i++)if(on(i)&&!seen[i])return false;
  return true;
}
// сборка параметров из размеров редактора (только в конвертере)
function dmBuild(ann,k,G,U,I,sk,comps,order){
  const dm=[],skip=[],cn={L:0,D:0,A:0},SK=dmSkeleton(U,I,k,sk);
  // размеры из составных нужны движку, даже если их собственный ползунок выключен
  const inC=new Set();(comps||[]).forEach(c=>{if((c.members||[]).length>1)c.members.forEach(i=>inC.add(i))});
  const lim=(a,v0,kk,isA,neg)=>{if(a.limit==='abs'&&isFinite(+a.amin)&&isFinite(+a.amax)&&+a.amax>+a.amin){const f=isA?1:kk;return [neg?+a.amin*f:Math.max(+a.amin*f,isA?1:.01*v0),Math.min(+a.amax*f,isA?178:1e9)]}return null};
  const pn=(x,d)=>x!=null&&x!==''&&isFinite(+x)?+x:d;
  let cmpA=null;
  const comp=()=>{if(cmpA)return cmpA;const V=U.length/3,c=new Int32Array(V);for(let i=0;i<V;i++)c[i]=i;const fd=x=>{while(c[x]!==x){c[x]=c[c[x]];x=c[x]}return x};for(let t=0;t<I.length;t+=3){c[fd(I[t])]=fd(I[t+1]);c[fd(I[t+1])]=fd(I[t+2])}cmpA=fd;return fd};
  const NM={L:{ru:'Размер',en:'Dimension',he:'מידה'},D:{ru:'Диаметр',en:'Diameter',he:'קוטר'},A:{ru:'Угол',en:'Angle',he:'זווית'}};
  const AUTO=/^[\sØ⌀R]*[-+]?[\d.,]+\s*(мм|см|м|mm|cm|m|in|"|°)?\s*$/i;
  const nrm=v=>{const l=Math.hypot(v[0],v[1],v[2]);return l>1e-9?v.map(x=>x/l):null};
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  (ann||[]).forEach((a,ix)=>{
    const ty=a.type==='linear'?'L':a.type==='diameter'?'D':a.type==='angle'?'A':null;
    if(!ty)return;
    const gp=+a.syncGroup>0?+a.syncGroup:0,pgp=+a.propGroup>0?+a.propGroup:0;
    if(a.param===false&&!gp&&!pgp&&!inC.has(ix))return;
    if(a.param===false&&!inC.has(ix)&&!(gp&&(ann||[]).some(b=>(+b.syncGroup||0)===gp&&b.param!==false))&&!(pgp&&(ann||[]).some(b=>(+b.propGroup||0)===pgp&&b.param!==false))&&!(comps||[]).some(c=>(c.members||[]).length>1&&(gp&&+c.syncGroup===gp||pgp&&+c.propGroup===pgp)))return;
    const P=(a.points||[]).map(p=>p.map(x=>x*k));
    const num=++cn[ty];
    const custom=(a.name&&String(a.name).trim())||(a.label&&a.label.trim())||(a.text&&!AUTO.test(a.text.trim())&&a.text.trim())||'';
    const lab=custom?{ru:custom,en:custom,he:custom}:{ru:NM[ty].ru+' '+num,en:NM[ty].en+' '+num,he:NM[ty].he+' '+num};
    const an=[0,1,2].includes(+a.anchor)?+a.anchor:0,name=lab.ru;
    let s=null;
    if(ty==='L'){
      if(P.length<2)return;
      let d=nrm(sub(P[1],P[0]));if(!d){skip.push(name+': точки совпадают');return}
      let L0=Math.hypot(...sub(P[1],P[0])),rg=false;
      for(let ax=0;ax<3;ax++)if(Math.abs(d[ax])>.9995){const sg=Math.sign(d[ax]);d=[0,0,0];d[ax]=sg;L0=Math.abs(P[1][ax]-P[0][ax]);rg=true}
      const pmin=pn(a.pmin,50)/100,pmax=pn(a.pmax,200)/100;
      s={t:'L',a:P[0],d,L0,an,rg,v0:L0,mn:L0*pmin,mx:L0*pmax};
      {const lm=lim(a,L0,k,false,true);if(lm){s.mn=Math.min(lm[0],L0);s.mx=Math.max(lm[1],L0)}}
      if(rg){
        const ax=d.findIndex(x=>x!==0);let mn=1e9,mx=-1e9;
        for(let i=ax;i<U.length;i+=3){const x=U[i];if(x<mn)mn=x;if(x>mx)mx=x}
        const tl=.01*(mx-mn)+.05,ext=c=>Math.abs(c-mn)<tl||Math.abs(c-mx)<tl,e0=ext(P[0][ax]),e1=ext(P[1][ax]);
        if(e0!==e1){
          const rim=e0?0:1,fp=P[1-rim],rp=P[rim],opp=Math.abs(rp[ax]-mn)<tl?mx:mn,H=Math.abs(rp[ax]-opp),mm=Math.max(.4,.05*H);
          s.inw={ax,fc:fp[ax],rc:rp[ax],fp,sg:rim===0?1:-1};
          s.mx=Math.min(s.mx,Math.max(L0,H-mm));
        }
        // привязка размера к плоскостям каркаса
        const S=SK.s[ax],find=x=>S.findIndex(y=>Math.abs(y-x)<=SK.tol*3),i1=find(P[0][ax]),i2=find(P[1][ax]);
        // a.skw — размер ассистента по участку каркаса: привязывается к каркасу, даже если плоскость из нескольких граней
        if(i1>=0&&i2>=0&&i1!==i2&&(!s.inw||a.skw||dmWhole(U,dmCSR(I,U.length/3),s.inw,SK.tol*3))){
          if(s.inw){delete s.inw;s.mx=L0*pmax;const l2=lim(a,L0,k,false,true);if(l2)s.mx=Math.max(l2[1],L0)}
          s.sk=[Math.min(i1,i2),Math.max(i1,i2),i1<i2?1:0];
        }
      }
    }else if(ty==='D'){
      if(P.length<2)return;
      const n=a.normal||[0,0,1];let ax=0;for(let i=1;i<3;i++)if(Math.abs(n[i])>Math.abs(n[ax]))ax=i;
      if(Math.abs(n[ax])<.98){skip.push(name+': ось не параллельна X, Y или Z');return}
      const [u,v]=[0,1,2].filter(i=>i!==ax);
      let cu=P[0][u],cv=P[0][v],r0=Math.hypot(P[1][u]-cu,P[1][v]-cv);
      let nr=null,nd=1e9;
      (G.cyl||[]).forEach(f=>{if(f.ax!==ax)return;const d=Math.hypot(f.cu-cu,f.cv-cv),sc=d+Math.abs(f.r-r0);if(d<.1*f.r+.3&&Math.abs(f.r-r0)<.06*r0+.1&&sc<nd){nd=sc;nr=f}});
      if(nr){cu=nr.cu;cv=nr.cv;r0=nr.r}
      const pmin=(+a.pmin>0?+a.pmin:50)/100,pmax=(+a.pmax>0?+a.pmax:200)/100;
      s={t:'D',ax,u,v,cu,cv,r0,e:P[1],v0:2*r0,mn:2*r0*pmin,mx:2*r0*pmax,nr};
      {const lm=lim(a,2*r0,k,false);if(lm){s.mn=Math.min(lm[0],2*r0);s.mx=Math.max(lm[1],2*r0)}}
    }else{
      if(P.length<3)return;
      const e1=nrm(sub(P[1],P[0])),vb=nrm(sub(P[2],P[0]));
      if(!e1||!vb){skip.push(name+': вырожденный угол');return}
      const n=nrm(crs(e1,vb));if(!n){skip.push(name+': стороны угла лежат на одной прямой');return}
      const e2=crs(n,e1),th0=Math.acos(Math.max(-1,Math.min(1,dot(e1,vb)))),v0=th0*180/Math.PI;
      s={t:'A',c:P[0],e1,e2,th0,an,v0,mn:+a.pmin>0&&+a.pmin<179?+a.pmin:Math.max(1,v0-20),mx:+a.pmax>0&&+a.pmax<179?+a.pmax:Math.min(178,v0+20)};
      if(s.mn>=s.v0)s.mn=Math.max(1,v0-20);if(s.mx<=s.v0)s.mx=Math.min(178,v0+20);
      {const lm=lim(a,v0,1,true);if(lm){s.mn=Math.min(lm[0],v0);s.mx=Math.max(lm[1],v0)}}
    }
    // как размер нарисован в редакторе: направление и отступ от модели, цвет, место подписи вдоль линии
    if(Array.isArray(a.normal))s.nv=a.normal.slice(0,3);if(isFinite(+a.offset))s.of=+a.offset*k;if(a.color)s.col=a.color;if(typeof a.lblT==='number')s.lt=a.lblT;
    s.lab=lab;s.src=ix;if(gp)s.g=gp;if(pgp)s.pg=pgp;if(a.limit==='pct')s.lm='pct';if(gp&&a.syncName)s.gn=a.syncName;if(pgp&&a.propName)s.pgn=a.propName;if((gp||pgp||inC.has(ix))&&a.param===false)s.hid=true;if(typeof a.limRef==='number'&&a.limRef>=0)s.rfSrc=a.limRef;if(a.limOp)s.rop=a.limOp;if(isFinite(+a.limVal))s.rval=+a.limVal;if(a.showScale===true)s.sc=1;dm.push(s);
  });
  // проверка: диаметр должен находиться на модели
  G.dmw=null;
  let ok=dm;
  if(dm.length){
    const P=dmPrep(U,I,G,dm);
    ok=dm.filter((s,q)=>{if(P.ws[q]&&P.ws[q].bad){skip.push(s.lab.ru+(s.t==='D'?': цилиндр с таким диаметром не найден на модели':': на модели нет грани, от которой он отмеряется'));return false}return true});
  }
  ok.forEach(s=>{
    if(s.rfSrc>=0){const j=ok.findIndex(x=>x.src===s.rfSrc);
      if(j>=0)s.rf=j;else{const ra=ann[s.rfSrc];if(ra&&isFinite(+ra.value))s.rfv=dmCap(s,+ra.value*(ra.type==='angle'?1:k))}}
    delete s.rfSrc});
  {const cyl=G.cyl||[],cf=ok.some(s=>s.t==='D')?comp():null;
   const cv0=f=>f.verts&&f.verts.length?f.verts[0]:(f.tv&&f.tv.length?f.tv[0]:(f.pts&&f.pts.size?f.pts.values().next().value:-1));
   ok.forEach(s=>{
     if(s.t!=='D'||!s.nr)return;
     const me=cv0(s.nr);if(me<0)return;
     const tol=.02*s.r0+.03;let big=null,sm=null,thx=0;
     cyl.forEach(f=>{
       if(f===s.nr||f.ax!==s.ax||Math.abs(f.cu-s.cu)>.1*f.r+.3||Math.abs(f.cv-s.cv)>.1*f.r+.3)return;
       const fv=cv0(f);if(fv<0||cf(fv)!==cf(me))return;
       if(f.tv&&f.tv.length){const dd=Math.max(0,(f.ri||f.r)-s.r0,s.r0-(f.ro||f.r));if(dd<=.08*s.r0+.5)thx=Math.max(thx,(f.ro||f.r)-s.r0);return}
       if(f.r>s.r0+tol&&(!big||f.r<big.r))big=f;
       if(f.r<s.r0-tol&&(!sm||f.r>sm.r))sm=f;
     });
     const jj=f=>ok.findIndex(x=>x!==s&&x.t==='D'&&x.nr===f);
     s.hi=[];s.lo=[];
     if(big){const w0=big.r-s.r0;s.hi.push({r:big.r,j:jj(big),m:Math.min(w0,Math.min(w0,Math.max(.2*w0,.4))+Math.max(0,thx))})}
     if(sm){const w0=s.r0-sm.r;s.lo.push({r:sm.r,j:jj(sm),m:Math.min(w0,Math.max(.2*w0,.4))})}
   });
   ok.forEach(s=>{delete s.nr})}
  G.dmw=null;
  const cm=[];
  (comps||[]).forEach((c,n)=>{
    const m=[...new Set((c.members||[]).map(ix=>ok.findIndex(s=>s.src===ix)).filter(j=>j>=0&&ok[j].t!=='A'))];
    const own=(c.name&&String(c.name).trim())||'';
    if(m.length<2){skip.push((own||'Составной размер '+(n+1))+': меньше двух подходящих размеров');return}
    const sum=m.reduce((t,j)=>t+ok[j].v0,0),pct=c.limit==='pct';
    const a=pct?sum*(+c.pmin>0?+c.pmin:50)/100:c.amin>0?c.amin*k:.5*sum,b=pct?sum*(+c.pmax>0?+c.pmax:200)/100:c.amax>0?c.amax*k:2*sum;
    const e={m,mn:Math.min(a,sum),mx:Math.max(b,sum),lab:own?{ru:own,en:own,he:own}:{ru:'Составной размер '+(n+1),en:'Combined size '+(n+1),he:'מידה משולבת '+(n+1)},src:n};
    if(pct)e.lm='pct';if(pct||c.amin>0||c.amax>0)e.u=1;
    if(+c.syncGroup>0){e.g=+c.syncGroup;if(c.syncName)e.gn=c.syncName}
    if(+c.propGroup>0){e.pg=+c.propGroup;if(c.propName)e.pgn=c.propName}
    if(typeof c.limRef==='number'&&c.limRef>=0){
      const j=ok.findIndex(s=>s.src===c.limRef),ra=(ann||[])[c.limRef],op=c.limOp||'*',val=isFinite(+c.limVal)?+c.limVal:1;
      if(j>=0&&m.indexOf(j)<0)e.rf=j;else if(j<0&&ra&&isFinite(+ra.value))e.rfv=dmCap({rop:op,rval:val},+ra.value*k);
      if(e.rf>=0||e.rfv>0){e.rop=op;e.rval=val}
    }
    if(c.param===false)e.hid=true;
    cm.push(e);
  });
  let ord=null;
  if(order&&order.length){ord=['sc'];order.forEach(t=>{const n=+t.slice(1),d=t[0]==='a',j=(d?ok:cm).findIndex(x=>x.src===n);if(j>=0)ord.push((d?'q':'c')+j)})}
  cm.forEach(e=>delete e.src);
  return {dm:ok,dv:ok.map(s=>s.v0),cm,ord,sk:ok.some(s=>s.sk)?Object.assign({s:SK.s,f:SK.f},SK.t?{t:SK.t}:{}):null,skipped:skip};
}

