// ---- применение параметров ----
// ================= РАЗМЕРЫ ИЗ РЕДАКТОРА (режим «dm») =================
// st.dm — список размеров (линейный L, диаметр D, угол A), st.dv — их текущие значения.
// Линейный: деталь растягивается между двумя точками, всё за второй точкой сдвигается целиком.
// Диаметр: радиус цилиндра меняется, влияние затухает по поверхности до соседних элементов.
// Угол: шарнирный изгиб вокруг вершины угла.
const DMC=new WeakMap(),DMAN=[0,1,.5];
function dmCSR(I,V){
  let c=DMC.get(I);if(c)return c;
  const off=new Int32Array(V+1);
  for(let t=0;t<I.length;t++)off[I[t]+1]+=2;
  for(let i=0;i<V;i++)off[i+1]+=off[i];
  const nb=new Int32Array(off[V]),p=off.slice(0,V);
  for(let t=0;t<I.length;t+=3){
    const a=I[t],b=I[t+1],d=I[t+2];
    nb[p[a]++]=b;nb[p[a]++]=d;nb[p[b]++]=a;nb[p[b]++]=d;nb[p[d]++]=a;nb[p[d]++]=b;
  }
  c={off,nb};DMC.set(I,c);return c;
}
// кратчайшие расстояния по рёбрам сетки от набора вершин src
function dmDijk(U,csr,src,V){
  const d=new Float64Array(V).fill(Infinity);
  if(!src.length)return d;
  const hd=[],hv=[];
  const push=(a,b)=>{let i=hd.length;hd.push(a);hv.push(b);while(i>0){const p=(i-1)>>1;if(hd[p]<=a)break;hd[i]=hd[p];hv[i]=hv[p];i=p}hd[i]=a;hv[i]=b};
  const pop=()=>{
    const a=hd[0],b=hv[0],la=hd.pop(),lb=hv.pop(),n=hd.length;
    if(n){let i=0;for(;;){let c=2*i+1;if(c>=n)break;if(c+1<n&&hd[c+1]<hd[c])c++;if(hd[c]>=la)break;hd[i]=hd[c];hv[i]=hv[c];i=c}hd[i]=la;hv[i]=lb}
    return [a,b];
  };
  for(const s of src){d[s]=0;push(0,s)}
  while(hd.length){
    const [a,v]=pop();
    if(a>d[v])continue;
    for(let e=csr.off[v];e<csr.off[v+1];e++){
      const w=csr.nb[e],dx=U[w*3]-U[v*3],dy=U[w*3+1]-U[v*3+1],dz=U[w*3+2]-U[v*3+2],nd=a+Math.sqrt(dx*dx+dy*dy+dz*dz);
      if(nd<d[w]){d[w]=nd;push(nd,w)}
    }
  }
  return d;
}
// подготовка: «жёсткие» точки для цилиндров и веса влияния для диаметров (считается один раз на модель)
function dmInw(U,csr,s,V){
  const w=s.inw,ax=w.ax,u=(ax+1)%3,v=(ax+2)%3,fc=w.fc,rc=w.rc,tol=.01*Math.abs(fc-rc)+.02,k=new Float32Array(V);
  let best=-1,bd=Infinity;
  for(let i=0;i<V;i++){if(Math.abs(U[i*3+ax]-fc)>tol)continue;const dx=U[i*3+u]-w.fp[u],dy=U[i*3+v]-w.fp[v],d2=dx*dx+dy*dy;if(d2<bd){bd=d2;best=i}}
  if(best<0)return {bad:1};
  const A=new Uint8Array(V),qu=[best];A[best]=1;let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;
  for(let h=0;h<qu.length;h++){const a=qu[h];u0=Math.min(u0,U[a*3+u]);u1=Math.max(u1,U[a*3+u]);v0=Math.min(v0,U[a*3+v]);v1=Math.max(v1,U[a*3+v]);
    for(let e=csr.off[a];e<csr.off[a+1];e++){const b=csr.nb[e];if(!A[b]&&Math.abs(U[b*3+ax]-fc)<=tol){A[b]=1;qu.push(b)}}}
  const m=tol*2;
  for(let i=0;i<V;i++){const x=U[i*3+u],y=U[i*3+v],c=U[i*3+ax];
    if(x<u0-m||x>u1+m||y<v0-m||y>v1+m)continue;
    const t=(c-rc)/(fc-rc);if(t<-1e-6||t>1+1e-6)continue;k[i]=Math.min(1,Math.max(0,t))}
  return {k};
}
function dmPrep(U,I,G,dm){
  const V=U.length/3,csr=dmCSR(I,V),ev=Float32Array.from(U),ws=[],cyl=G.cyl||[],ow=G.owner;
  const cmp=new Int32Array(V);for(let i=0;i<V;i++)cmp[i]=i;const cfd=x=>{while(cmp[x]!==x){cmp[x]=cmp[cmp[x]];x=cmp[x]}return x};for(let t=0;t<I.length;t+=3){cmp[cfd(I[t])]=cfd(I[t+1]);cmp[cfd(I[t+1])]=cfd(I[t+2])}
  if(ow)for(let i=0;i<V;i++){const o=ow[i];if(o>=0){const f=cyl[o];ev[i*3+f.u]=f.cu;ev[i*3+f.v]=f.cv}}
  dm.forEach((s,q)=>{
    ws[q]=null;
    if(s.t==='L'&&s.inw){ws[q]=dmInw(U,csr,s,V);return}
    if(s.t!=='D')return;
    const u=s.u,v=s.v,tol=.02*s.r0+.03,rho=i=>Math.hypot(U[i*3+u]-s.cu,U[i*3+v]-s.cv);
    let best=-1,bd=Infinity;
    for(let i=0;i<V;i++){
      if(Math.abs(rho(i)-s.r0)>tol)continue;
      const dx=U[i*3]-s.e[0],dy=U[i*3+1]-s.e[1],dz=U[i*3+2]-s.e[2],d2=dx*dx+dy*dy+dz*dz;
      if(d2<bd){bd=d2;best=i}
    }
    if(best<0){ws[q]={bad:1};return}
    // стенка цилиндра: связная область вершин на радиусе r0
    const A=new Uint8Array(V),qu=[best];A[best]=1;
    for(let h=0;h<qu.length;h++){
      const a=qu[h];
      for(let e=csr.off[a];e<csr.off[a+1];e++){const b=csr.nb[e];if(!A[b]&&Math.abs(rho(b)-s.r0)<=tol){A[b]=1;qu.push(b)}}
    }
    // соседние цилиндры (кроме этого же) удерживают свою геометрию на месте
    const same=new Uint8Array(cyl.length),sl=.3+.02*s.r0;let tm=null;
    cyl.forEach((f,o)=>{
      if(f.ax!==s.ax||Math.abs(f.cu-s.cu)>=sl||Math.abs(f.cv-s.cv)>=sl)return;
      const isT=f.tv&&f.tv.length>0,dd=isT?Math.max(0,(f.ri||f.r)-s.r0,s.r0-(f.ro||f.r)):0;
      const tb=isT&&cfd(f.tv[0])===cfd(best)&&dd<=.08*s.r0+.5;
      if(Math.abs(f.r-s.r0)<tol+.02*s.r0||tb){same[o]=1;if(isT)f.tv.forEach(vi=>{(tm=tm||new Uint8Array(V))[vi]=1;if(!A[vi]){A[vi]=1;qu.push(vi)}})}
    });
    const Bs=[];
    if(ow)for(let i=0;i<V;i++){const o=ow[i];if(o>=0&&!A[i]&&!same[o])Bs.push(i)}
    const dA=dmDijk(U,csr,qu,V),dB=dmDijk(U,csr,Bs,V),k=new Float32Array(V),F=.8*s.r0+3;
    for(let i=0;i<V;i++){
      if(A[i]){k[i]=1;ev[i*3+u]=s.cu;ev[i*3+v]=s.cv;continue}
      const a=dA[i];if(a===Infinity)continue;
      const b=dB[i];
      if(b!==Infinity)k[i]=Math.min(b/(a+b),Math.max(0,1-a/F));
      else k[i]=rho(i)<s.r0?rho(i)/s.r0:Math.max(0,1-a/F);
    }
    ws[q]={k,t:tm};
  });
  return {ev,ws};
}
// ---- общая логика для линейных размеров на одной оси (вложенные/перекрывающиеся: деталь + паз) ----
// Все такие размеры собираются в кластер, ось режется на сегменты по всем границам размеров,
// длины сегментов подбираются так, чтобы каждый размер получил своё значение, а остальное
// сжималось/растягивалось пропорционально (от собственного центра сегмента). Вложенный размер
// не может быть больше своей доли в родителе, поэтому паз не выходит за деталь.
function dmAxMaps(dm,dv){
  const E=1e-6,it=[],MG={},C=[];
  dm.forEach((s,q)=>{
    if(s.t!=='L'||!s.rg||s.inw||s.sk)return;
    const ax=s.d.findIndex(x=>x!==0);if(ax<0)return;
    const sg=s.d[ax]>0?1:-1,p1=s.a[ax]+sg*s.L0;
    it.push({q,ax,lo:Math.min(s.a[ax],p1),hi:Math.max(s.a[ax],p1),L0:s.L0,v:Math.max(0,dv[q]),an:sg>0?DMAN[s.an]:1-DMAN[s.an]});
  });
  for(let ax=0;ax<3;ax++){
    const A=it.filter(x=>x.ax===ax).sort((x,y)=>x.lo-y.lo||y.hi-x.hi);
    let cur=null;const cl=[];
    A.forEach(x=>{if(cur&&x.lo<cur.hi-E){cur.m.push(x);cur.hi=Math.max(cur.hi,x.hi)}else{cur={m:[x],lo:x.lo,hi:x.hi};cl.push(cur)}});
    cl.forEach(c=>{
      if(c.m.length<2)return;
      const bp=[];c.m.forEach(x=>{bp.push(x.lo,x.hi)});bp.sort((x,y)=>x-y);
      const B=[bp[0]];for(let i=1;i<bp.length;i++)if(bp[i]-B[B.length-1]>E)B.push(bp[i]);
      const n=B.length-1,l0=[];for(let j=0;j<n;j++)l0.push(B[j+1]-B[j]);
      c.m.forEach(x=>{x.ja=B.findIndex(b=>Math.abs(b-x.lo)<=E);x.jb=B.findIndex(b=>Math.abs(b-x.hi)<=E)});
      // эффективные значения: от больших к малым, вложенный не больше своей доли в родителе
      const so=c.m.slice().sort((x,y)=>y.L0-x.L0),done=[];
      so.forEach(x=>{
        let par=null;
        done.forEach(p=>{if(p.lo<=x.lo+E&&p.hi>=x.hi-E&&(!par||p.L0<par.L0))par=p});
        let e=x.v;
        if(par){const r=Math.min(1,par.e/par.L0),cap=par.e-(par.L0-x.L0)*r;e=Math.min(e,Math.max(0,cap))}
        x.e=e;done.push(x);
      });
      const l=l0.slice();
      for(let sw=0;sw<80;sw++){
        let mx=0;
        so.forEach(x=>{
          let sm=0,w=0;for(let j=x.ja;j<x.jb;j++){sm+=l[j];w+=l0[j]}
          if(w<=0)return;
          const d=x.e-sm;mx=Math.max(mx,Math.abs(d));
          for(let j=x.ja;j<x.jb;j++)l[j]=Math.max(0,l[j]+d*l0[j]/w);
        });
        if(mx<1e-7)break;
      }
      const root=so[0],L0t=B[n]-B[0];let Lt=0;l.forEach(x=>{Lt+=x});
      const st0=B[0]-root.an*(Lt-L0t),by=[st0];for(let j=0;j<n;j++)by.push(by[j]+l[j]);
      c.m.forEach(x=>{MG[x.q]=1});
      C.push({ax,bx:B,by});
    });
  }
  return {m:MG,c:C};
}
function dmAxMap(c,x){
  const b=c.bx,y=c.by,n=b.length-1;
  if(x<=b[0])return x+(y[0]-b[0]);
  if(x>=b[n])return x+(y[n]-b[n]);
  let j=0;while(j<n-1&&x>b[j+1])j++;
  return y[j]+(x-b[j])*(y[j+1]-y[j])/(b[j+1]-b[j]);
}
