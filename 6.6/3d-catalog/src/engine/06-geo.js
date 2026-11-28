function geoApply(U,G,st,W){if(st.dm&&st.dm.length)return dmApply(U,G,st,W);return geoApply0(U,G,st,W)}
function geoApply0(U,G,st,W){
  const V=U.length/3,c0=G.c0,S=[st.U*st.k[0],st.U*st.k[1],st.U*st.k[2]];
  for(let i=0;i<V;i++)for(let k=0;k<3;k++)W[i*3+k]=c0[k]+S[k]*(U[i*3+k]-c0[k]);
  G.cyl.forEach(f=>{
    const u=f.u,v=f.v,rf=st.U*(f.kind==='hole'?st.hf[f.hi]:(f.kind==='boss'?st.df[f.di]:1));
    let cu=c0[u]+S[u]*(f.cu-c0[u]),cv=c0[v]+S[v]*(f.cv-c0[v]);
    if(f.kind==='arc'){
      if(f.bu){const pu=c0[u]+S[u]*(f.cu+f.bu*f.r-c0[u]);cu=pu-f.bu*f.r*rf}
      if(f.bv){const pv=c0[v]+S[v]*(f.cv+f.bv*f.r-c0[v]);cv=pv-f.bv*f.r*rf}
    }
    for(let q=0;q<f.verts.length;q++){
      const i=f.verts[q];
      W[i*3+u]=cu+(U[i*3+u]-f.cu)*rf;W[i*3+v]=cv+(U[i*3+v]-f.cv)*rf;
    }
    // резьба растёт и сжимается вместе с носителем в том же отношении: диаметр резьбы = диаметр носителя × постоянное число
    if(f.tv&&f.tv.length&&f.kind!=='arc'){
      for(let q=0;q<f.tv.length;q++){
        const i=f.tv[q];
        W[i*3+u]=cu+(U[i*3+u]-f.cu)*rf;W[i*3+v]=cv+(U[i*3+v]-f.cv)*rf;
      }
    }
  });
  G.slopes.forEach((s,i)=>{
    const w=s.w,u=s.u,Sw=S[w],Su=S[u],sf=st.sf[i];
    if(Math.abs(sf-1)<1e-9)return;
    const wbase=c0[w]+Sw*((s.nw>0?G.mn[w]:G.mx[w])-c0[w]),dcap=.5*G.dim[w]*Sw;
    s.faces.forEach(fc=>{
      const ms=fc.m0*Sw/Su,m1=ms*sf,ups=c0[u]+Su*(fc.up-c0[u]),wps=c0[w]+Sw*(fc.wp-c0[w]);
      const u0=c0[u]+Su*(fc.umin-c0[u]),u1=c0[u]+Su*(fc.umax-c0[u]);
      // не заходим на соседние параллельные грани того же уклона
      const um=(u0+u1)/2,hm=wps+ms*(um-ups);let gap=1e9;
      s.faces.forEach(g=>{if(g===fc)return;
        const gm=c0[w]+Sw*(g.wp-c0[w])+g.m0*Sw/Su*(um-(c0[u]+Su*(g.up-c0[u])));
        const d=s.nw>0?hm-gm:gm-hm;if(d>1e-3&&d<gap)gap=d});
      const dlim=Math.min(dcap,.45*gap);
      // смещение материала в точке (uu, ww): 0 вне грани, полное на самой грани, плавно затухает вглубь
      const disp=(uu,ww)=>{
        const x=Math.min(u1,Math.max(u0,uu)),h0=wps+ms*(x-ups);
        const H0=s.nw>0?h0-wbase:wbase-h0,D=Math.max(1e-3,Math.min(H0>1e-6?H0:dlim,dlim));
        const depth=s.nw>0?h0-ww:ww-h0;
        if(depth<-1e-3)return 0;
        let wt=Math.max(0,1-Math.max(0,depth)/D);
        const du=uu<u0?u0-uu:(uu>u1?uu-u1:0);wt*=Math.max(0,1-du/D);
        const sh=Math.max(-.95*D,Math.min(.95*D,(m1-ms)*(x-ups)));
        return wt*sh;
      };
      for(let vi=0;vi<V;vi++){
        if(G.owner[vi]>=0)continue;
        W[vi*3+w]+=disp(W[vi*3+u],W[vi*3+w]);
      }
      G.cyl.forEach(f=>{
        if(!f.verts.length)return;
        let mu=0,mw=0;for(let q=0;q<f.verts.length;q++){mu+=W[f.verts[q]*3+u];mw+=W[f.verts[q]*3+w]}
        mu/=f.verts.length;mw/=f.verts.length;
        const d=disp(mu,mw);
        if(d)for(let q=0;q<f.verts.length;q++)W[f.verts[q]*3+w]+=d;
      });
    });
  });
}
// ---- описание параметров (хранится в файле модели) ----
function geoMeta(G,st){
  const deg=a=>a*180/Math.PI;
  return {v:1,c0:G.c0.slice(),dim:G.dim.slice(),
    hid:[0,1,2].map(a=>{const r=G.round>=0?G.bosses[G.round]:null;return r&&(a===r.u||a===r.v)?1:0}),
    hole:G.holes.map(f=>({r:f.r,ax:f.ax})),boss:G.bosses.map(f=>({r:f.r,ax:f.ax})),
    slope:G.slopes.map(s=>({u:s.u,w:s.w,a0:deg(s.a0)})),
    rel:(G.rel||[]).map(x=>Object.assign({},x)),ext:(G.ext||[]).map(x=>Object.assign({},x)),part:Object.assign({},G.part||{}),body:Object.assign({},G.body||{}),
    st:geoState(G.holes.length,G.bosses.length,G.slopes.length)};
}
function geoState(nh,nb,ns){return {U:1,k:[1,1,1],hf:new Array(nh).fill(1),df:new Array(nb).fill(1),sf:new Array(ns).fill(1)}}
const GAX='XYZ';
const GL={
  ru:{ax:['Длина','Ширина','Высота'],sc:'Масштаб, %',dia:'Диаметр',hole:'Отверстие',slope:'Уклон',plane:'плоскость',dout:'Внешний диаметр',din:'Внутренний диаметр',part:'деталь'},
  en:{ax:['Length','Width','Height'],sc:'Scale, %',dia:'Diameter',hole:'Hole',slope:'Slope',plane:'plane',dout:'Outer diameter',din:'Inner diameter',part:'part'},
  he:{ax:['אורך','רוחב','גובה'],sc:'קנה מידה, %',dia:'קוטר',hole:'חור',slope:'שיפוע',plane:'מישור',dout:'קוטר חיצוני',din:'קוטר פנימי',part:'חלק'}
};
function geoParams(g){
  if(g.st&&g.st.dm&&g.st.dm.length){
    const L=g.st.dm.some(s=>s.sc)?[{key:'sc',kind:'sc',unit:'pct',min:30,max:300,def:g.st.U*100,lab:{ru:GL.ru.sc,en:GL.en.sc,he:GL.he.sc}}]:[];
    const A=dmSkSolve(g.st).val;
    g.st.dm.forEach((s,i)=>{if(!s.hid)L.push({key:'q'+i,kind:'dq',i,unit:s.t==='A'?'deg':'mm',min:s.mn,max:s.mx,def:A[i]!==undefined?A[i]:g.st.dv[i],lab:s.lab})});
    (g.st.cm||[]).forEach((c,i)=>{L.push({key:'c'+i,kind:'cm',i,unit:'mm',min:c.mn,max:c.mx,def:cmNow(g.st,c,A),lab:c.lab})});
    return gOrder(g.st.ord,L);
  }
  const L=[],lb=f=>({ru:f('ru'),en:f('en'),he:f('he')});
  L.push({key:'sc',kind:'sc',unit:'pct',min:30,max:300,def:g.st.U*100,lab:lb(l=>GL[l].sc)});
  for(let a=0;a<3;a++)if(!g.hid[a])L.push({key:'k'+GAX[a].toLowerCase(),kind:'ax',a,unit:'mm',min:g.dim[a]*.3,max:g.dim[a]*3,def:g.dim[a]*g.st.U*g.st.k[a],lab:lb(l=>GL[l].ax[a])});
  [[0,1],[0,2],[1,2]].forEach(([a,b])=>{
    if(g.hid[a]||g.hid[b])return;
    L.push({key:'p'+GAX[a].toLowerCase()+GAX[b].toLowerCase(),kind:'pr',a,b,unit:'pct',min:30,max:300,def:(g.st.k[a]+g.st.k[b])/2*100,lab:lb(l=>GL[l].ax[a]+' + '+GL[l].ax[b]+', %')});
  });
  const PN=g.part||{},np=Object.keys(PN).length?Math.max.apply(null,Object.keys(PN).map(k=>PN[k])):0;
  const tl=(l,k,fb)=>PN[k]?(k[0]==='d'?GL[l].dout:GL[l].din)+(np>1?', '+GL[l].part+' '+PN[k]:''):fb;
  g.boss.forEach((f,i)=>L.push({key:'d'+i,kind:'dm',i,unit:'mm',min:f.r*.6,max:f.r*6,def:2*f.r*g.st.U*g.st.df[i],lab:lb(l=>tl(l,'d'+i,GL[l].dia+(g.boss.length>1?' '+(i+1):'')))}));
  g.hole.forEach((f,i)=>L.push({key:'h'+i,kind:'ho',i,unit:'mm',min:Math.max(.4,f.r*.6),max:f.r*6,def:2*f.r*g.st.U*g.st.hf[i],lab:lb(l=>tl(l,'h'+i,GL[l].hole+' '+(i+1)))}));
  const cnt={};
  g.slope.forEach((s,i)=>{
    const pl=[s.u,s.w].sort().map(x=>GAX[x]).join('–');cnt[pl]=(cnt[pl]||0)+1;
  });
  const seen={};
  g.slope.forEach((s,i)=>{
    const pl=[s.u,s.w].sort().map(x=>GAX[x]).join('–');seen[pl]=(seen[pl]||0)+1;
    L.push({key:'sl'+i,kind:'sp',i,unit:'deg',min:Math.max(.5,s.a0-10),max:Math.min(60,s.a0+10),def:geoAngle(g,g.st,i),lab:lb(l=>GL[l].slope+' ('+GL[l].plane+' '+pl+')'+(cnt[pl]>1?' '+seen[pl]:''))});
  });
  // сначала общие размеры, потом по телам: диаметры, отверстия и уклоны тела 1, затем тела 2 и т.д.
  const BD=Object.assign({},PN,g.body||{}),KR={dm:1,ho:2,sp:3};
  L.forEach(p=>{if(KR[p.kind]&&BD[p.key])p.body=BD[p.key]});
  const ord=p=>KR[p.kind]?(p.body||999)*10+KR[p.kind]:0;
  return gOrder(g.st&&g.st.ord,L.sort((x,y)=>ord(x)-ord(y)));
}
// порядок ползунков, выбранный в конвертере (st.ord — список ключей)
function gOrder(ord,L){
  if(!ord||!ord.length)return L;
  const at=k=>{const n=ord.indexOf(k);return n>=0?n:k==='sc'?-1:1e6};
  return L.map((p,n)=>[p,n]).sort((a,b)=>at(a[0].key)-at(b[0].key)||a[1]-b[1]).map(x=>x[0]);
}
const gclamp=(x,a,b)=>Math.min(b,Math.max(a,x));
// текущий угол уклона с учётом масштабирования осей и множителя уклона
function geoAngle(g,st,i){const s=g.slope[i];return Math.atan(Math.tan(s.a0*Math.PI/180)*(st.k[s.w]/st.k[s.u])*st.sf[i])*180/Math.PI}
// допустимо ли состояние: стенки не тоньше минимума, резьба крышки не меньше резьбы тела, отверстие внутри габарита
function geoOk(g,st){
  const R=g.rel||[],E=g.ext||[];
  if(!R.length&&!E.length)return true;
  const fq=n=>{const i=+n.slice(1);return n[0]==='h'?st.hf[i]:st.df[i]};
  for(const x of R){
    const m=x.k==='w'?Math.min(x.w0,Math.max(.2*x.w0,.4)):.5*x.w0;
    const d=(x.cb+(fq(x.b)-1)*x.rb)-(x.cs+(fq(x.s)-1)*x.rs);
    if(d<m-1e-6)return false;
  }
  for(const x of E){
    const h=g.hole[x.i];if(!h)continue;
    const m=Math.min(x.e0,Math.max(.2*x.e0,.4));
    if(Math.min(st.k[x.u]*x.Mu,st.k[x.v]*x.Mv)-h.r*st.hf[x.i]<m-1e-6)return false;
  }
  return true;
}
