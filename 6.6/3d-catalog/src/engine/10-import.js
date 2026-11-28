// ---------- FreeCAD HTML: чтение экспорта (сжатый и обычный формат) ----------
function parseFreeCAD(txt){
  const a=txt.indexOf('const data = ');if(a<0)throw new Error('нет блока data');
  const st=a+13,en=txt.indexOf('\n',st),d=JSON.parse(txt.slice(st,en).trim().replace(/;$/,'')),V=[],F=[];let off=0;
  for(const o of d.objects){
    let v,f;
    if(d.compressed){
      const bs=d.base,bf=d.baseFloat,bc=bs.length,fc=bf.length;
      const bd=s=>{const r=[],L=parseInt(s[0]);for(let i=1;i<s.length;i+=L){const t=s.substring(i,i+L).trim();let x=0;for(let j=0;j<t.length;j++)x+=bs.indexOf(t[j])*Math.pow(bc,j);r.push(x)}return r};
      const parts=[];
      for(let i=0;i<o.floats.length;i+=4){const h=o.floats.substring(i,i+4).trim();let q=0;for(let j=0;j<h.length;j++)q+=bs.indexOf(h[j])*Math.pow(bc,j);let u='';for(let j=0;j<7;j++){u=bf[q%fc]+u;q=Math.floor(q/fc)}parts.push(u)}
      let ns=parts.join(''),tc=0;for(let j=1;j<7;j++)if(ns[ns.length-j]===bf[0])tc++;ns=ns.substring(0,ns.length-tc);
      const fl=JSON.parse('['+ns+']');v=bd(o.verts).map(x=>fl[x]);f=bd(o.facets);
    }else{v=o.verts.map(parseFloat);f=o.facets}
    for(const x of v)V.push(x);for(const x of f)F.push(x+off);off+=v.length/3;
  }
  return {U:Float32Array.from(V),I:Uint32Array.from(F),n:F.length/3};
}
// ---------- упрощение резьбы: резьбовая зона заменяется гладким цилиндром (символ резьбы) ----------
// Резьба = связная группа «винтовых» граней (нормаль не параллельна и не перпендикулярна оси),
// вытянутая вдоль оси и кольцевая по сечению. Остальная геометрия не меняется.
function simplifyThreads(U0,I0){
  const m=new Map(),rm=new Int32Array(U0.length/3),P=[];
  for(let i=0;i<rm.length;i++){const k=Math.round(U0[i*3]*1e4)+','+Math.round(U0[i*3+1]*1e4)+','+Math.round(U0[i*3+2]*1e4);let id=m.get(k);if(id===undefined){id=P.length/3;m.set(k,id);P.push(U0[i*3],U0[i*3+1],U0[i*3+2])}rm[i]=id}
  const NV=P.length/3,I=[];
  for(let f=0;f<I0.length;f+=3){const a=rm[I0[f]],b=rm[I0[f+1]],c=rm[I0[f+2]];if(a!==b&&b!==c&&a!==c)I.push(a,b,c)}
  const nF=I.length/3,nn=new Float32Array(nF*3);
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
      if(Math.abs(eb-ec)>.08*Math.max(eb,ec))continue; // должно быть полное кольцо
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
  // вершины, попадающие в резьбовую зону
  let nz=0;
  zones.forEach((z,zi)=>{let hit=0;
    for(let v=0;v<NV;v++){if(zid[v])continue;const a=P[v*3+z.A];if(a<z.zl-1e-3||a>z.zh+1e-3)continue;
      const r=Math.hypot(P[v*3+z.B]-z.cb,P[v*3+z.C]-z.cc);if(r<z.rl-z.tr||r>z.rh+z.tr)continue;zid[v]=zi+1;hit++}
    z.hit=hit;if(hit)nz++});
  // кластеризация: каждая зона -> два кольца вершин (низ и верх) на среднем радиусе
  const map=new Int32Array(NV).map((_,i)=>i),nm=new Map(),Q=Array.from(P);
  for(let v=0;v<NV;v++){const zi=zid[v];if(!zi)continue;
    const z=zones[zi-1],N=2*Math.ceil(Math.max(24,Math.PI*Math.sqrt(z.rm/.03))/2),dT=2*Math.PI/N;
    const th=Math.atan2(P[v*3+z.C]-z.cc,P[v*3+z.B]-z.cb),k=((Math.round(th/dT)%N)+N)%N,top=(P[v*3+z.A]-z.zl)>(z.zh-P[v*3+z.A])?1:0,key=zi+'_'+k+'_'+top;
    let id=nm.get(key);
    if(id===undefined){id=Q.length/3;nm.set(key,id);const p=[0,0,0];p[z.A]=top?z.zh:z.zl;p[z.B]=z.cb+z.rm*Math.cos(k*dT);p[z.C]=z.cc+z.rm*Math.sin(k*dT);Q.push(p[0],p[1],p[2])}
    map[v]=id}
  const out=[],seen=new Set();
  for(let f=0;f<nF;f++){const a=map[I[f*3]],b=map[I[f*3+1]],c=map[I[f*3+2]];if(a===b||b===c||a===c)continue;
    const key=a<b?(a<c?a+','+(b<c?b+','+c:c+','+b):c+','+a+','+b):(b<c?b+','+(a<c?a+','+c:c+','+a):c+','+b+','+a);
    if(seen.has(key))continue;seen.add(key);out.push(a,b,c)}
  return {U:Float32Array.from(Q),I:Uint32Array.from(out),zones:nz};
}
