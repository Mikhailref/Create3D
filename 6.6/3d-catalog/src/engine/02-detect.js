// ===================== ГЕОМЕТРИЯ v2: масштаб, оси, диаметры, отверстия, уклоны =====================
// U — уникальные вершины (Float32Array, x y z), I — индексы треугольников
function geoKasa(U,pts,u,v){
  let mu=0,mv=0;pts.forEach(i=>{mu+=U[i*3+u];mv+=U[i*3+v]});mu/=pts.length;mv/=pts.length;
  let a11=0,a12=0,a13=0,a22=0,a23=0,a33=pts.length,b1=0,b2=0,b3=0;
  pts.forEach(i=>{const x=U[i*3+u]-mu,y=U[i*3+v]-mv,z=x*x+y*y;
    a11+=4*x*x;a12+=4*x*y;a13+=2*x;a22+=4*y*y;a23+=2*y;b1+=2*x*z;b2+=2*y*z;b3+=z});
  const M=[[a11,a12,a13,b1],[a12,a22,a23,b2],[a13,a23,a33,b3]];
  for(let c=0;c<3;c++){
    let p=c;for(let r=c+1;r<3;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;
    if(Math.abs(M[p][c])<1e-12)return null;
    [M[c],M[p]]=[M[p],M[c]];
    for(let r=0;r<3;r++)if(r!==c){const f=M[r][c]/M[c][c];for(let k=c;k<4;k++)M[r][k]-=f*M[c][k]}
  }
  const cx=M[0][3]/M[0][0],cy=M[1][3]/M[1][1],k=M[2][3]/M[2][2],r2=k+cx*cx+cy*cy;
  if(!(r2>0))return null;
  return {cu:cx+mu,cv:cy+mv,r:Math.sqrt(r2)};
}
function geoCover(U,pts,u,v,cu,cv){
  const an=pts.map(i=>Math.atan2(U[i*3+v]-cv,U[i*3+u]-cu)).sort((x,y)=>x-y);
  let mg=an[0]+2*Math.PI-an[an.length-1],mi=-1;
  for(let i=0;i<an.length-1;i++){const g=an[i+1]-an[i];if(g>mg){mg=g;mi=i}}
  const A=mi<0?an[0]:an[mi+1],B=mi<0?an[an.length-1]:an[mi];
  return {cov:2*Math.PI-mg,A,B};
}
// резьбовые зоны: связные группы «винтовых» граней, вытянутые вдоль оси и кольцевые по сечению
function threadZones(P,I){
  const NV=P.length/3,nF=I.length/3,nn=new Float32Array(nF*3);
  for(let f=0;f<nF;f++){const a=I[f*3]*3,b=I[f*3+1]*3,c=I[f*3+2]*3,ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],wx=P[c]-P[a],wy=P[c+1]-P[a+1],wz=P[c+2]-P[a+2];
    const x=uy*wz-uz*wy,y=uz*wx-ux*wz,z=ux*wy-uy*wx,l=Math.hypot(x,y,z)||1;nn[f*3]=x/l;nn[f*3+1]=y/l;nn[f*3+2]=z/l}
  const zid=new Int16Array(NV),zones=[];
  for(let A=0;A<3;A++){
    const B=(A+1)%3,C=(A+2)%3,par=new Int32Array(NV).map((_,i)=>i),fd=x=>{while(par[x]!==x){par[x]=par[par[x]];x=par[x]}return x},mid=[];
    for(let f=0;f<nF;f++){const na=Math.abs(nn[f*3+A]);if(na>.12&&na<.97){mid.push(f);par[fd(I[f*3])]=fd(I[f*3+1]);par[fd(I[f*3+1])]=fd(I[f*3+2])}}
    const cp=new Map();
    for(const f of mid){const r=fd(I[f*3]);let q=cp.get(r);if(!q)cp.set(r,q={n:0,mn:[1e9,1e9,1e9],mx:[-1e9,-1e9,-1e9]});q.n++;
      for(let j=0;j<3;j++){const v=I[f*3+j]*3;for(let k=0;k<3;k++){q.mn[k]=Math.min(q.mn[k],P[v+k]);q.mx[k]=Math.max(q.mx[k],P[v+k])}}}
    const cand=[];
    for(const [r,q] of cp){
      if(q.n<150)continue;
      const eb=q.mx[B]-q.mn[B],ec=q.mx[C]-q.mn[C],ez=q.mx[A]-q.mn[A];
      if(Math.abs(eb-ec)>.08*Math.max(eb,ec))continue;
      cand.push({r,cb:(q.mn[B]+q.mx[B])/2,cc:(q.mn[C]+q.mx[C])/2,zl:q.mn[A],zh:q.mx[A],ez,rl:1e9,rh:-1e9});
    }
    if(!cand.length)continue;
    const byRoot=new Map(cand.map(c=>[c.r,c]));
    for(const f of mid){const c=byRoot.get(fd(I[f*3]));if(!c)continue;for(let j=0;j<3;j++){const v=I[f*3+j]*3,r=Math.hypot(P[v+B]-c.cb,P[v+C]-c.cc);c.rl=Math.min(c.rl,r);c.rh=Math.max(c.rh,r)}}
    for(const c of cand){
      const depth=c.rh-c.rl,rmid=(c.rl+c.rh)/2;
      if(depth<.02||depth>.3*rmid||c.ez<3*depth)continue;
      zones.push({A,B,C,cb:c.cb,cc:c.cc,rm:rmid,rl:c.rl,rh:c.rh,zl:c.zl,zh:c.zh,tr:Math.max(.005,depth*.03)});
    }
  }
  zones.forEach((z,zi)=>{
    for(let v=0;v<NV;v++){if(zid[v])continue;const a=P[v*3+z.A];if(a<z.zl-1e-3||a>z.zh+1e-3)continue;
      const r=Math.hypot(P[v*3+z.B]-z.cb,P[v*3+z.C]-z.cc);if(r<z.rl-z.tr||r>z.rh+z.tr)continue;zid[v]=zi+1}
  });
  return {zones,zid};
}
// номер тела для каждого диаметра, отверстия и уклона (тело = отдельная связная часть сетки)
function geoBodies(I,V,holes,bosses,slopes,part){
  const par=new Int32Array(V);for(let i=0;i<V;i++)par[i]=i;
  const fd=x=>{while(par[x]!==x){par[x]=par[par[x]];x=par[x]}return x};
  for(let t=0;t<I.length;t+=3){par[fd(I[t])]=fd(I[t+1]);par[fd(I[t+1])]=fd(I[t+2])}
  const items=[];
  const cylV=f=>f.verts.length?f.verts[0]:(f.tv&&f.tv.length?f.tv[0]:f.pts.values().next().value);
  bosses.forEach((f,i)=>items.push(['d'+i,cylV(f)]));
  holes.forEach((f,i)=>items.push(['h'+i,cylV(f)]));
  slopes.forEach((s,i)=>items.push(['sl'+i,s.faces.length?s.faces[0].verts[0]:undefined]));
  const num=new Map(),body={};let last=0;
  items.forEach(([k,v])=>{if(!part[k]||v===undefined)return;const c=fd(v);if(!num.has(c))num.set(c,part[k]);last=Math.max(last,part[k])});
  items.forEach(([k,v])=>{
    if(part[k]){body[k]=part[k];return}
    if(v===undefined)return;
    const c=fd(v);if(!num.has(c))num.set(c,++last);body[k]=num.get(c)});
  return body;
}
function geoDetect(U,I){
  const V=U.length/3,T=I.length/3;
  const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
  for(let i=0;i<V;i++)for(let k=0;k<3;k++){const x=U[i*3+k];if(x<mn[k])mn[k]=x;if(x>mx[k])mx[k]=x}
  const c0=mn.map((x,k)=>(x+mx[k])/2),dim=mx.map((x,k)=>x-mn[k]);
  const nrm=new Float32Array(T*3),area=new Float32Array(T);let vol=0,tot=0;
  for(let t=0;t<T;t++){
    const a=I[t*3]*3,b=I[t*3+1]*3,c=I[t*3+2]*3;
    const e1x=U[b]-U[a],e1y=U[b+1]-U[a+1],e1z=U[b+2]-U[a+2],e2x=U[c]-U[a],e2y=U[c+1]-U[a+1],e2z=U[c+2]-U[a+2];
    const nx=e1y*e2z-e1z*e2y,ny=e1z*e2x-e1x*e2z,nz=e1x*e2y-e1y*e2x,l=Math.hypot(nx,ny,nz);
    area[t]=l/2;tot+=l/2;
    if(l>1e-12){nrm[t*3]=nx/l;nrm[t*3+1]=ny/l;nrm[t*3+2]=nz/l}
    vol+=(U[a]*(U[b+1]*U[c+2]-U[b+2]*U[c+1])-U[a+1]*(U[b]*U[c+2]-U[b+2]*U[c])+U[a+2]*(U[b]*U[c+1]-U[b+1]*U[c]))/6;
  }
  if(vol<0)for(let i=0;i<nrm.length;i++)nrm[i]=-nrm[i]; // нормали наружу
  const em=new Map(),nb=new Array(T);for(let t=0;t<T;t++)nb[t]=[];
  for(let t=0;t<T;t++)for(let e=0;e<3;e++){
    const p=I[t*3+e],q=I[t*3+(e+1)%3],key=p<q?p*V+q:q*V+p,o=em.get(key);
    if(o===undefined)em.set(key,t);else{nb[t].push(o);nb[o].push(t)}
  }
  const TZ=threadZones(U,I),tmask=new Uint8Array(V);
  // маска — вершины строго внутри резьбовой зоны (граничные кольца принадлежат гладкому цилиндру)
  for(let i=0;i<V;i++)if(TZ.zid[i]){const z=TZ.zones[TZ.zid[i]-1],a=U[i*3+z.A];if(a>z.zl+1e-3&&a<z.zh-1e-3)tmask[i]=1}
  // ---- цилиндры вдоль осей X, Y, Z ----
  const found=[];
  for(let a=0;a<3;a++){
    const u=(a+1)%3,v=(a+2)%3,q=new Uint8Array(T),phi=new Float32Array(T);
    for(let t=0;t<T;t++)if(area[t]>0&&Math.abs(nrm[t*3+a])<.05&&!(tmask[I[t*3]]&&tmask[I[t*3+1]]&&tmask[I[t*3+2]])){q[t]=1;phi[t]=Math.atan2(nrm[t*3+v],nrm[t*3+u])}
    const dph=(s,t)=>{const d=Math.abs(phi[s]-phi[t]);return d>Math.PI?2*Math.PI-d:d};
    const cvx=new Uint8Array(T);
    for(let t=0;t<T;t++)if(q[t])for(const s of nb[t])if(q[s]){const d=dph(s,t);if(d>.005&&d<1.22){cvx[t]=1;break}}
    const comp=new Uint8Array(T);
    for(let t0=0;t0<T;t0++){
      if(!cvx[t0]||comp[t0])continue;
      const st=[t0],tris=[];comp[t0]=1;
      while(st.length){const x=st.pop();tris.push(x);for(const s of nb[x])if(cvx[s]&&!comp[s]&&dph(s,x)<1.22){comp[s]=1;st.push(s)}}
      const ids=new Set();tris.forEach(t=>{for(let e=0;e<3;e++)ids.add(I[t*3+e])});
      let pts=[...ids],fit=null;
      for(let it=0;it<3&&pts.length>=6;it++){
        fit=geoKasa(U,pts,u,v);if(!fit){pts=[];break}
        const lim=Math.max(.05*fit.r,.15);
        const keep=pts.filter(i=>Math.abs(Math.hypot(U[i*3+u]-fit.cu,U[i*3+v]-fit.cv)-fit.r)<=lim);
        if(keep.length===pts.length)break;pts=keep;
      }
      if(pts.length<6||!fit)continue;
      fit=geoKasa(U,pts,u,v);if(!fit)continue;
      let rms=0;pts.forEach(i=>{const d=Math.hypot(U[i*3+u]-fit.cu,U[i*3+v]-fit.cv)-fit.r;rms+=d*d});rms=Math.sqrt(rms/pts.length);
      if(fit.r<.4||fit.r>Math.max(...dim)||rms>.03*fit.r+.03)continue;
      const set=new Set(pts);let os=0;
      tris.forEach(t=>{
        let ok=true;for(let e=0;e<3;e++)if(!set.has(I[t*3+e]))ok=false;if(!ok)return;
        let mu=0,mv=0;for(let e=0;e<3;e++){mu+=U[I[t*3+e]*3+u];mv+=U[I[t*3+e]*3+v]}mu=mu/3-fit.cu;mv=mv/3-fit.cv;
        const l=Math.hypot(mu,mv)||1;os+=area[t]*(nrm[t*3+u]*mu+nrm[t*3+v]*mv)/l;
      });
      found.push({ax:a,u,v,cu:fit.cu,cv:fit.cv,r:fit.r,pts:set,os});
    }
  }
  // ---- слияние кусков одного цилиндра (разрезанных на половины / по длине) ----
  const merged=[];
  found.forEach(f=>{
    const m=merged.find(g=>g.ax===f.ax&&Math.abs(g.cu-f.cu)<.3&&Math.abs(g.cv-f.cv)<.3&&Math.abs(g.r-f.r)<.02*g.r+.05);
    if(m){f.pts.forEach(i=>m.pts.add(i));m.os+=f.os}else merged.push(f);
  });
  const cyl=[];
  merged.forEach(f=>{
    const pts=[...f.pts],cv=geoCover(U,pts,f.u,f.v,f.cu,f.cv);
    let kind='arc';if(cv.cov>=5.76)kind=f.os>0?'boss':'hole';
    let bu=0,bv=0;
    if(kind==='arc'){
      const bind=(ph)=>{const c=Math.cos(ph),s=Math.sin(ph);return Math.abs(s)<.035?[Math.sign(c),0]:(Math.abs(c)<.035?[0,Math.sign(s)]:[0,0])};
      const e1=bind(cv.A),e2=bind(cv.B);
      const comb=(x,y)=>x&&y?(x===y?x:0):(x||y);
      bu=comb(e1[0],e2[0]);bv=comb(e1[1],e2[1]);
    }
    if(kind==='arc'&&f.r>.15*Math.max(...dim))return; // большие дуги — часть формы детали, масштабируются вместе с ней
    cyl.push({ax:f.ax,u:f.u,v:f.v,cu:f.cu,cv:f.cv,r:f.r,kind,bu,bv,pts,ri:f.r,ro:f.r,rm:f.r});
  });
  // ---- резьба следует за своим диаметром: на крышке — внутренним, на теле — наружным ----
  let nThr=0;
  TZ.zones.forEach((z,zi)=>{
    const tv=[];for(let i=0;i<V;i++)if(TZ.zid[i]===zi+1)tv.push(i);
    if(!tv.length)return;
    let sg=0; // знак радиальной составляющей наружных нормалей: <0 — внутренняя резьба (в отверстии)
    for(let t=0;t<T;t++){
      const a=I[t*3],b=I[t*3+1],c=I[t*3+2];
      if(TZ.zid[a]!==zi+1&&TZ.zid[b]!==zi+1&&TZ.zid[c]!==zi+1)continue;
      const mu=(U[a*3+z.B]+U[b*3+z.B]+U[c*3+z.B])/3-z.cb,mv=(U[a*3+z.C]+U[b*3+z.C]+U[c*3+z.C])/3-z.cc,l=Math.hypot(mu,mv)||1;
      sg+=area[t]*(nrm[t*3+z.B]*mu+nrm[t*3+z.C]*mv)/l;
    }
    const kind=sg<0?'hole':'boss';
    let lo=1e9,hi=-1e9;tv.forEach(i=>{const x=U[i*3+z.A];if(x<lo)lo=x;if(x>hi)hi=x});
    const tol=Math.max(1.5*(z.rh-z.rl),.06*z.rm);
    let par=null,bd=1e9;
    cyl.forEach(f=>{
      if(f.kind!==kind||f.ax!==z.A)return;
      if(Math.hypot(f.cu-z.cb,f.cv-z.cc)>Math.max(.3,.02*f.r))return;
      const dr=Math.abs(f.r-z.rm);if(dr>tol)return;
      let flo=1e9,fhi=-1e9;f.pts.forEach(i=>{const x=U[i*3+f.ax];if(x<flo)flo=x;if(x>fhi)fhi=x});
      if(Math.max(flo,lo)-Math.min(fhi,hi)>.5)return;
      if(dr<bd){bd=dr;par=f}
    });
    if(par){par.tv=(par.tv||[]).concat(tv);par.ri=Math.min(par.ri,z.rl);par.ro=Math.max(par.ro,z.rh);par.rm=z.rm}
    else cyl.push({ax:z.A,u:z.B,v:z.C,cu:z.cb,cv:z.cc,r:z.rm,kind,bu:0,bv:0,pts:new Set(),tv,ri:z.rl,ro:z.rh,rm:z.rm});
    nThr++;
  });
  const rank=k=>({hole:0,boss:1,arc:2})[k];
  cyl.sort((x,y)=>rank(x.kind)-rank(y.kind)||(y.r-x.r)||(x.cu-y.cu)||(x.cv-y.cv));
  let nh=0,nbss=0;
  cyl.forEach(f=>{
    if(f.kind==='hole'){if(nh<12)f.hi=nh++;else f.kind='arc'}
    if(f.kind==='boss'){if(nbss<4)f.di=nbss++;else f.kind='arc'}
  });
  cyl.forEach(f=>{if(f.kind==='arc'){f.bu=f.bu||0;f.bv=f.bv||0}else{f.bu=0;f.bv=0}});
  cyl.sort((x,y)=>rank(x.kind)-rank(y.kind)||(y.r-x.r)||(x.cu-y.cu)||(x.cv-y.cv));
  const owner=new Int32Array(V).fill(-1);
  cyl.forEach((f,i)=>{if(f.tv)f.tv.forEach(vi=>{if(owner[vi]<0)owner[vi]=i})});
  cyl.forEach((f,i)=>{f.verts=[...f.pts].filter(vi=>owner[vi]<0);f.verts.forEach(vi=>{owner[vi]=i})});
  const holes=cyl.filter(f=>f.kind==='hole'),bosses=cyl.filter(f=>f.kind==='boss');
  // деталь, построенная вращением: внешний цилиндр на всю ширину
  let round=-1;
  bosses.forEach((f,i)=>{if(round<0&&2*f.r>=.9*dim[f.u]&&2*f.r>=.9*dim[f.v])round=i});
  // ---- уклоны: наклонные плоские грани ----
  const grp=new Map();
  for(let t=0;t<T;t++){
    if(area[t]<=0)continue;
    const nx=nrm[t*3],ny=nrm[t*3+1],nz=nrm[t*3+2],n=[nx,ny,nz];
    let c=-1;for(let k=0;k<3;k++)if(Math.abs(n[k])<.02)c=c<0?k:-2;
    if(c<0)continue;
    const u=(c+1)%3,v=(c+2)%3,au=Math.abs(n[u]),av=Math.abs(n[v]),mxn=Math.max(au,av),mnn=Math.min(au,av);
    if(mnn/mxn<.0524||mnn/mxn>1.7)continue;
    const a0=I[t*3]*3,d=n[0]*U[a0]+n[1]*U[a0+1]+n[2]*U[a0+2];
    const key=c+'|'+Math.round(n[u]*100)+'|'+Math.round(n[v]*100)+'|'+Math.round(d/.4);
    let g=grp.get(key);if(!g){g={c,u,v,nu:0,nv:0,d,a:0,tris:[]};grp.set(key,g)}
    g.a+=area[t];g.nu+=n[u]*area[t];g.nv+=n[v]*area[t];g.tris.push(t);
  }
  const faces=[];
  [...grp.values()].sort((x,y)=>y.a-x.a).forEach(g=>{
    if(g.a<.02*tot)return;
    const nu=g.nu/g.a,nv=g.nv/g.a,l=Math.hypot(nu,nv);
    const m=faces.find(f=>f.c===g.c&&Math.abs(f.nu-nu/l)<.012&&Math.abs(f.nv-nv/l)<.012&&Math.abs(f.d-g.d)<.6);
    if(m){m.tris=m.tris.concat(g.tris);m.a+=g.a}else faces.push({c:g.c,u:g.u,v:g.v,nu:nu/l,nv:nv/l,d:g.d,a:g.a,tris:g.tris});
  });
  const slopes=[];
  faces.forEach(f=>{
    const w=Math.abs(f.nu)>=Math.abs(f.nv)?f.u:f.v,o=w===f.u?f.v:f.u,nw=w===f.u?f.nu:f.nv,no=w===f.u?f.nv:f.nu;
    const m0=-no/nw,a0=Math.atan(Math.abs(m0));
    const ids=new Set();f.tris.forEach(t=>{for(let e=0;e<3;e++)ids.add(I[t*3+e])});
    const verts=[...ids];
    // шарнир уклона — конец грани, примыкающий к основанию (нижний при наклоне наружу в +w, верхний при -w)
    let wb=nw>0?1e9:-1e9,up=0;
    verts.forEach(i=>{const x=U[i*3+w];if(nw>0?x<wb:x>wb)wb=x});
    let cn=0;verts.forEach(i=>{if(Math.abs(U[i*3+w]-wb)<1e-4){up+=U[i*3+o];cn++}});up/=cn||1;
    let s=slopes.find(x=>x.w===w&&x.u===o&&x.c===f.c&&Math.abs(x.a0-a0)<.012);
    if(!s){if(slopes.length>=4)return;s={c:f.c,w,u:o,a0,faces:[]};slopes.push(s)}
    let umin=1e9,umax=-1e9;verts.forEach(i=>{const x=U[i*3+o];if(x<umin)umin=x;if(x>umax)umax=x});
    s.nw=nw>0?1:-1;
    if(s.faces.length<6)s.faces.push({verts:Int32Array.from(verts),m0,up,wp:wb,umin,umax});
  });
  // ---- зависимости размеров: внутренний диаметр не может выйти за внешний; резьба и посадка крышки ----
  const rel=[],ext=[];
  const nodes=[];
  holes.forEach(f=>nodes.push({f,t:'h',i:f.hi}));bosses.forEach(f=>nodes.push({f,t:'d',i:f.di}));
  nodes.forEach(n=>{let lo=1e9,hi=-1e9;const ch=i=>{const x=U[i*3+n.f.ax];if(x<lo)lo=x;if(x>hi)hi=x};n.f.pts.forEach(ch);(n.f.tv||[]).forEach(ch);n.lo=lo;n.hi=hi});
  nodes.forEach(a=>nodes.forEach(b=>{
    if(a===b||a.t===b.t||a.f.ax!==b.f.ax)return;
    const fa=a.f,fb=b.f,wall=a.t==='h';
    // k:'w' — стенка: отверстие a внутри наружного цилиндра b; k:'f' — посадка: цилиндр a внутри отверстия b (крышка на горловине)
    if(!(wall?fa.ro<fb.ri:fa.rm<fb.rm))return;
    const dist=Math.hypot(fa.cu-fb.cu,fa.cv-fb.cv);
    if(dist>Math.max(.3,.02*fb.r))return;
    const ov=Math.min(a.hi,b.hi)-Math.max(a.lo,b.lo);
    const w0=(wall?fb.ri-fa.ro:fb.rm-fa.rm)-dist;if(!(w0>.05))return;
    const near=!wall&&w0<=Math.max(1.5,.06*fb.r);
    if(!(ov>.2&&ov>.25*Math.min(a.hi-a.lo,b.hi-b.lo))&&!near)return;
    rel.push(wall?{s:a.t+a.i,b:b.t+b.i,k:'w',w0,cs:fa.ro,rs:fa.r,cb:fb.ri,rb:fb.r}:{s:a.t+a.i,b:b.t+b.i,k:'f',w0,cs:fa.rm,rs:fa.r,cb:fb.rm,rb:fb.r});
  }));
  // номера деталей: пара «внутренний + внешний» одной детали (по убыванию наружного диаметра)
  const part={};let pn=0;
  rel.filter(x=>x.k==='w').sort((x,y)=>y.rb-x.rb).forEach(x=>{if(part[x.b]||part[x.s])return;pn++;part[x.b]=part[x.s]=pn});
  // отверстие, не вложенное в наружный цилиндр, не должно выходить за габарит детали
  holes.forEach(f=>{
    if(rel.some(x=>x.k==='w'&&x.s==='h'+f.hi))return;
    const Mu=Math.min(f.cu-mn[f.u],mx[f.u]-f.cu),Mv=Math.min(f.cv-mn[f.v],mx[f.v]-f.cv),e0=Math.min(Mu,Mv)-f.r;
    if(e0>=.5)ext.push({i:f.hi,u:f.u,v:f.v,Mu,Mv,e0});
  });
  const body=geoBodies(I,V,holes,bosses,slopes,part);
  return {c0,dim,mn,mx,V,T,I,cyl,holes,bosses,round,slopes,owner,rel,ext,part,body,thr:nThr};
}
