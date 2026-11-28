
function faceNormals(pos,n,area){
  const fn=new Float32Array(n*3);
  for(let f=0;f<n;f++){
    const o=f*9,ax=pos[o+3]-pos[o],ay=pos[o+4]-pos[o+1],az=pos[o+5]-pos[o+2],bx=pos[o+6]-pos[o],by=pos[o+7]-pos[o+1],bz=pos[o+8]-pos[o+2];
    const x=ay*bz-az*by,y=az*bx-ax*bz,z=ax*by-ay*bx,l=Math.hypot(x,y,z)||1;
    fn[f*3]=x/l;fn[f*3+1]=y/l;fn[f*3+2]=z/l;if(area)area[f]=l/2;
  }
  return fn;
}
// поиск ключевых плоскостей по каждой оси и построение параметров
function detect(pos,n,opt){
  const split=!!(opt&&opt.split); // split: каждая стенка отдельно (без зеркальной симметрии)
  const area=new Float32Array(n),fn=faceNormals(pos,n,area),res=[];
  const NV=pos.length/3,wid=new Int32Array(NV),wm=new Map(),wp=[];
  for(let v=0;v<NV;v++){const k=Math.round(pos[v*3]*1e4)+','+Math.round(pos[v*3+1]*1e4)+','+Math.round(pos[v*3+2]*1e4);
    let id=wm.get(k);if(id===undefined){id=wp.length/3;wm.set(k,id);wp.push(pos[v*3],pos[v*3+1],pos[v*3+2])}wid[v]=id}
  let e0=0;for(let a=0;a<3;a++){let l=Infinity,h=-Infinity;for(let i=a;i<pos.length;i+=3){l=Math.min(l,pos[i]);h=Math.max(h,pos[i])}e0=Math.max(e0,h-l)}
  const tau=.035*e0,par=Int32Array.from({length:wp.length/3},(_,i)=>i),find=x=>{while(par[x]!==x){par[x]=par[par[x]];x=par[x]}return x};
  for(let f=0;f<n;f++)for(let i=0;i<3;i++){
    const a=wid[f*3+i],b=wid[f*3+(i+1)%3];
    if(Math.hypot(wp[a*3]-wp[b*3],wp[a*3+1]-wp[b*3+1],wp[a*3+2]-wp[b*3+2])<tau)par[find(a)]=find(b);
  }
  // плотные участки мелкой геометрии (например, выпуклый текст) двигаются как жёсткий блок
  const cm=new Map();
  for(let i=0;i<wp.length/3;i++){const r=find(i);let c=cm.get(r);if(!c)cm.set(r,c={n:0,mn:[1e9,1e9,1e9],mx:[-1e9,-1e9,-1e9]});c.n++;for(let k=0;k<3;k++){c.mn[k]=Math.min(c.mn[k],wp[i*3+k]);c.mx[k]=Math.max(c.mx[k],wp[i*3+k])}}
  const dense=new Set();
  for(const [r,c] of cm){if(c.n<200)continue;const ex=c.mx.map((x,k)=>x-c.mn[k]).sort((x,y)=>y-x);
    if(c.n/Math.max(ex[0]*ex[1],1e-6)*tau*tau>20)dense.add(r)}
  const cid=new Int32Array(NV);for(let v=0;v<NV;v++){const r=find(wid[v]);cid[v]=dense.has(r)?r:-1}
  for(let a=0;a<3;a++){
    let lo=Infinity,hi=-Infinity;
    for(let i=a;i<pos.length;i+=3){lo=Math.min(lo,pos[i]);hi=Math.max(hi,pos[i])}
    const bins=new Map();
    for(let f=0;f<n;f++){
      if(Math.abs(fn[f*3+a])<.999)continue;
      const c0=pos[f*9+a];if(Math.abs(c0-pos[f*9+3+a])>1e-3||Math.abs(c0-pos[f*9+6+a])>1e-3)continue;
      const k=Math.round(c0*10),b=bins.get(k)||{a:0,s:0,n:0};b.a+=area[f];b.s+=c0*area[f];b.n+=area[f]*Math.sign(fn[f*3+a]);bins.set(k,b);
    }
    const ks=[...bins.keys()].sort((x,y)=>x-y),grp=[];
    for(const k of ks){const b=bins.get(k),g=grp[grp.length-1];
      if(g&&k-g.k<=1){g.a+=b.a;g.s+=b.s;g.n+=b.n;g.k=k}else grp.push({a:b.a,s:b.s,n:b.n,k})}
    const mx=Math.max(0,...grp.map(g=>g.a));
    let P=grp.filter(g=>g.a>=mx*.1).map(g=>g.s/g.a);
    // стенки: наружная плоскость на краю детали + ближайшая внутренняя плоскость с противоположной нормалью
    const gv=grp.map(g=>({v:g.s/g.a,a:g.a,n:g.n})),ex0=hi-lo;let wLo=null,wHi=null;
    const lowOut=gv.find(g=>Math.abs(g.v-lo)<.3&&g.n<0&&g.a>=mx*.1);
    if(lowOut){const w=gv.find(g=>g.v>lowOut.v+.3&&g.n>0&&g.a>=mx*.015&&g.v-lowOut.v<=.33*ex0);if(w)wLo=w.v}
    const hiOut=gv.slice().reverse().find(g=>Math.abs(g.v-hi)<.3&&g.n>0&&g.a>=mx*.1);
    if(hiOut){const w=gv.slice().reverse().find(g=>g.v<hiOut.v-.3&&g.n<0&&g.a>=mx*.015&&hiOut.v-g.v<=.33*ex0);if(w)wHi=w.v}
    [wLo,wHi].forEach(w=>{if(w!==null&&!P.some(x=>Math.abs(x-w)<.3))P.push(w)});
    P.sort((x,y)=>x-y);
    if(!P.length||P[0]-lo>.3)P.unshift(lo);
    if(hi-P[P.length-1]>.3)P.push(hi);
    const k=P.length,c=(lo+hi)/2;
    let sym=!split&&k>=4&&k%2===0;
    for(let i=0;sym&&i<k/2;i++)if(Math.abs((P[i]-c)+(P[k-1-i]-c))>.2)sym=false;
    const A={a,sym,c,P,lo,hi};
    if(sym){
      const h=P.slice(k/2).map(p=>p-c);A.bp=[0,...h];
      A.segs=[2*h[0],...h.slice(1).map((v,i)=>v-h[i])];
      A.names=A.segs.map((_,i)=>i===0?'Внутренняя ширина':(A.segs.length===2?'Толщина стенки':'Стенка '+i));
    }else{
      A.bp=P.slice();A.segs=P.slice(1).map((v,i)=>v-P[i]);
      A.names=A.segs.map((_,i)=>'Участок '+(i+1));
    }
    A.wall=sym?A.segs.map((_,i)=>i>=1):A.segs.map((_,i)=>{const L=A.segs.length;return L>1&&((wLo!==null&&i===0&&Math.abs(P[1]-wLo)<.3)||(wHi!==null&&i===L-1&&Math.abs(P[L-1]-wHi)<.3))});
    A.inner=A.segs.map((_,i)=>!sym&&A.segs.length===3&&A.wall[0]&&A.wall[2]&&i===1);
    A.vals=A.segs.slice();A.totName=['Внешняя длина','Внешняя ширина','Внешняя высота'][a];
    A.rng=A.segs.map((s,i)=>sym?(i===0?[s*.5,s*2]:[Math.max(1,s*.5),s*2.5]):(A.wall[i]?[Math.max(.5,s*.5),s*2.5]:[s*.5,s*2.5]));
    const T0=sym?A.segs[0]+2*A.segs.slice(1).reduce((q,x)=>q+x,0):A.segs.reduce((q,x)=>q+x,0);
    A.trng=sym?[A.rng[0][0]+2*A.rng.slice(1).reduce((q,x)=>q+x[0],0),A.rng[0][1]+2*A.rng.slice(1).reduce((q,x)=>q+x[1],0)]:[T0*.7,T0*1.4];
    const N=NV;A.idx=new Uint8Array(N);A.sg=new Int8Array(N);A.f=new Float32Array(N);
    const U=new Float32Array(N);
    for(let v=0;v<N;v++){let u=pos[v*3+a];if(sym){u-=c;A.sg[v]=u<0?-1:1;u=Math.abs(u)}U[v]=u}
    // жёсткие блоки по этой оси: скругления, фаски, текст и другие мелкие детали двигаются целиком и не деформируются
    const ext=hi-lo,rig=new Set();
    for(const [rt,cc] of cm){if(dense.has(rt)||(cc.n>=3&&cc.mx[a]-cc.mn[a]<=.2*ext))rig.add(rt)}
    const cida=new Int32Array(N);for(let v=0;v<N;v++){const rt=find(wid[v]);cida[v]=rig.has(rt)?rt:-1}
    const cs=new Map();
    for(let v=0;v<N;v++)if(cida[v]>=0){const u=sym?pos[v*3+a]-c:pos[v*3+a];let q=cs.get(cida[v]);if(!q)cs.set(cida[v],q={s:0,n:0,mn:u,mx:u});q.s+=u;q.n++;if(u<q.mn)q.mn=u;if(u>q.mx)q.mx=u}
    if(sym){
      const su=Array.from(U).sort((x,y)=>x-y).filter((x,i,r)=>!i||x-r[i-1]>1e-3),cuts=[];
      for(let j=0;j<A.bp.length-1;j++){
        const lo2=A.bp[j],hi2=A.bp[j+1],L=hi2-lo2,mg=L>20?.15*L:0,pts=[lo2,...su.filter(x=>x>lo2+1e-3&&x<hi2-1e-3),hi2];
        let bg=0,cut=(lo2+hi2)/2;
        for(let i=1;i<pts.length;i++){const m=(pts[i]+pts[i-1])/2;if(m<lo2+mg||m>hi2-mg)continue;if(pts[i]-pts[i-1]>bg){bg=pts[i]-pts[i-1];cut=m}}
        cuts.push(cut);
      }
      const zone=u=>{let j=0;while(j<cuts.length&&u>cuts[j])j++;return j};
      // блок привязывается к ключевой плоскости, которой он касается (скругление едет вместе со своей стенкой)
      const bind=q=>{
        if(q.mn*q.mx<0)return -1;
        const lo2=Math.min(Math.abs(q.mn),Math.abs(q.mx)),hi2=Math.max(Math.abs(q.mn),Math.abs(q.mx));let jl=-1,jh=-1;
        for(let k=1;k<A.bp.length;k++){if(Math.abs(hi2-A.bp[k])<.3)jh=k;if(Math.abs(lo2-A.bp[k])<.3)jl=k}
        if(jh>=0&&jl<0)return jh;if(jl>=0&&jh<0)return jl;if(jh>=0&&jh===jl)return jh;return -1;
      };
      for(let v=0;v<N;v++){A.idx[v]=zone(U[v]);
        if(cida[v]>=0){const q=cs.get(cida[v]),m=q.s/q.n,j=bind(q);A.idx[v]=j>=0?j:zone(Math.abs(m));A.sg[v]=m<0?-1:1}}
    }else{
      const L=hi-lo,r0=lo+.15*L,r1=hi-.15*L,fr=x=>Math.min(1,Math.max(0,(x-r0)/(r1-r0)));
      A.T0=A.segs.reduce((q,x)=>q+x,0);
      for(let v=0;v<N;v++){A.f[v]=fr(U[v]);if(cida[v]>=0){const q=cs.get(cida[v]);A.f[v]=fr(q.s/q.n)}}
      // режим «по участкам»: каждая деталь привязана к участку между ключевыми плоскостями
      A.sj=new Uint8Array(N);A.st=new Float32Array(N);
      for(let v=0;v<N;v++){
        let ref=U[v];
        if(cida[v]>=0){
          const q=cs.get(cida[v]);ref=q.s/q.n;let jl=-1,jh=-1;
          for(let k=0;k<A.bp.length;k++){if(Math.abs(q.mx-A.bp[k])<.3)jh=k;if(Math.abs(q.mn-A.bp[k])<.3)jl=k}
          if((jh>=0&&jl<0)||(jl>=0&&jh<0)||(jh>=0&&jh===jl))ref=A.bp[jh>=0?jh:jl];
        }
        let j=0;while(j<A.bp.length-2&&ref>A.bp[j+1])j++;
        const dl=A.bp[j+1]-A.bp[j];A.sj[v]=j;A.st[v]=dl>1e-9?Math.min(1,Math.max(0,(ref-A.bp[j])/dl)):0;
      }
    }
    A.seg=false;A.free=null;
    res.push(A);
  }
  return res;
}
function newBP(A){
  const v=A.vals,o=[];
  if(A.sym){o.push(0,v[0]/2);for(let i=1;i<v.length;i++)o.push(o[o.length-1]+v[i])}
  else{o.push(A.P[0]);for(let i=0;i<v.length;i++)o.push(o[o.length-1]+v[i])}
  return o;
}
function total(A){return A.sym?A.vals[0]+2*A.vals.slice(1).reduce((s,x)=>s+x,0):A.vals.reduce((s,x)=>s+x,0)}
function setSeg(A,i,v){A.vals[i]=Math.min(A.rng[i][1],Math.max(A.rng[i][0],v))}
function setTotal(A,T){
  if(A.sym){setSeg(A,0,T-2*A.vals.slice(1).reduce((s,x)=>s+x,0))}
  else if(A.seg){
    T=Math.min(A.trng[1],Math.max(A.trng[0],T));
    const fr=A.free||A.vals.map(()=>true),all=A.vals.map((_,i)=>i);
    let idx=all.filter(i=>fr[i]&&!(A.wall&&A.wall[i]));
    if(!idx.length)idx=all.filter(i=>fr[i]);
    if(!idx.length)return;
    let Sf=0,So=0;A.vals.forEach((x,i)=>{if(idx.indexOf(i)>=0)Sf+=x;else So+=x});
    if(Sf<=0)return;
    const k=(T-So)/Sf;
    idx.forEach(i=>{A.vals[i]=Math.min(A.rng[i][1],Math.max(A.rng[i][0],A.vals[i]*k))});
  }
  else{T=Math.min(A.trng[1],Math.max(A.trng[0],T));let m=0;A.vals.forEach((x,i)=>{if(x>A.vals[m])m=i});
    A.vals[m]=Math.max(.1,T-A.vals.reduce((s,x,i)=>s+(i===m?0:x),0))}
}
function deform(pos0,out,AX){
  out.set(pos0);
  for(const A of AX){
    const a=A.a,N=A.idx.length;
    if(A.sym){const nb=newBP(A),d=nb.map((x,j)=>x-A.bp[j]);for(let v=0;v<N;v++)out[v*3+a]+=A.sg[v]*d[A.idx[v]]}
    else if(A.seg){const nb=newBP(A);for(let v=0;v<N;v++){const j=A.sj[v],t=A.st[v];out[v*3+a]+=nb[j]+t*(nb[j+1]-nb[j])-(A.bp[j]+t*(A.bp[j+1]-A.bp[j]))}}
    else{const D=total(A)-A.T0;for(let v=0;v<N;v++)out[v*3+a]+=A.f[v]*D}
  }
}
// ---------- разбор OBJ ----------
function parseOBJ(t){
  const V=[],o=[];
  for(const line of t.split(/\r?\n/)){
    const c=line.charCodeAt(0);
    if(c!==118&&c!==102&&c!==32&&c!==9)continue; // быстрый отсев: только строки v и f
    const p=line.trim().split(/\s+/);
    if(p[0]==='v')V.push(+p[1],+p[2],+p[3]);
    else if(p[0]==='f'){
      const ix=p.slice(1).map(s=>{const i=parseInt(s);return i<0?V.length/3+i:i-1});
      for(let k=1;k<ix.length-1;k++)for(const i of [ix[0],ix[k],ix[k+1]])o.push(V[i*3],V[i*3+1],V[i*3+2]);
    }
  }
  return {pos:Float32Array.from(o),n:o.length/9};
}
// ---------- сварка вершин: индексная форма (компактная) ----------
function weld(pos){
  const m=new Map(),U=[],I=[];
  for(let i=0;i<pos.length;i+=3){
    const k=Math.round(pos[i]*1e4)+','+Math.round(pos[i+1]*1e4)+','+Math.round(pos[i+2]*1e4);
    let id=m.get(k);
    if(id===undefined){id=U.length/3;m.set(k,id);U.push(pos[i],pos[i+1],pos[i+2])}
    I.push(id);
  }
  const T=[];
  for(let f=0;f<I.length;f+=3){const a=I[f],b=I[f+1],c=I[f+2];if(a!==b&&b!==c&&a!==c)T.push(a,b,c)}
  return {U:Float32Array.from(U),I:Uint32Array.from(T)};
}
function expand(U,I){
  const o=new Float32Array(I.length*3);
  for(let i=0;i<I.length;i++){o[i*3]=U[I[i]*3];o[i*3+1]=U[I[i]*3+1];o[i*3+2]=U[I[i]*3+2]}
  return o;
}
// эталонная («каноническая») геометрия: и конвертер, и сайт работают с одним и тем же массивом
function canon(pos){const w=weld(pos);return {U:w.U,I:w.I,pos:expand(w.U,w.I),n:w.I.length/3}}
function b64enc(a){const u=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)}
function b64dec(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function slug(name){
  const base=name.replace(/\.[^.]+$/,'');
  const a=base.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  let h=5381;for(let i=0;i<base.length;i++)h=((h<<5)+h+base.charCodeAt(i))>>>0;
  const pure=/^[\x20-\x7e]+$/.test(base)&&a;
  return 'obj-'+(pure?a:(a?a+'-':'')+h.toString(36));
}
// ---------- параметры модели: список, подписи, видимость ----------
const LBL={
  he:{axis:['אורך','רוחב','גובה'],tot:['אורך חיצוני','רוחב חיצוני','גובה חיצוני'],inner:'מידה פנימית',wall:'עובי דופן',part:'קטע',thick:'עובי',all:'עובי כל הקירות, %',lo:['התחלה','התחלה','תחתית'],hi:['סוף','סוף','עליון']},
  en:{axis:['Length','Width','Height'],tot:['Outer length','Outer width','Outer height'],inner:'inner size',wall:'wall thickness',part:'section',thick:'thickness',all:'All walls thickness, %',lo:['start','start','bottom'],hi:['end','end','top']},
  ru:{axis:['Длина','Ширина','Высота'],tot:['Внешняя длина','Внешняя ширина','Внешняя высота'],inner:'внутренний размер',wall:'толщина стенки',part:'участок',thick:'толщина',all:'Толщина всех стенок, %',lo:['начало','начало','низ'],hi:['конец','конец','верх']}
};
// все возможные ползунки: s — сегменты симметричной оси, p — участки несимметричной оси, t — внешний размер
function paramList(axes){
  const o=[];
  axes.forEach((ax,ai)=>{
    if(ax.sym)for(let i=0;i<ax.n;i++)o.push({key:'a'+ai+'s'+i,ai,i,kind:'s',ax});
    else if(ax.n>1)for(let i=0;i<ax.n;i++)o.push({key:'a'+ai+'s'+i,ai,i,kind:(ax.wall&&ax.wall[i])?'w':(ax.inner&&ax.inner[i]?'i':'p'),ax});
    o.push({key:'a'+ai+'t',ai,i:-1,kind:'t',ax});
  });
  if(o.filter(isWall).length>1)o.unshift({key:'wall_all',ai:-1,i:-1,kind:'m',ax:null});
  return o;
}
function defLabel(lang,p){
  const L=LBL[lang]||LBL.en,ax=L.axis[p.ai]||'';
  if(p.kind==='t')return L.tot[p.ai];
  if(p.kind==='m')return L.all;
  if(p.kind==='i')return ax+': '+L.inner;
  if(p.kind==='w')return ax+': '+L.thick+' ('+(p.i===0?L.lo[p.ai]:L.hi[p.ai])+')';
  if(p.kind==='p')return ax+': '+L.part+' '+(p.i+1);
  return ax+': '+(p.i===0?L.inner:(p.ax.n===2?L.wall:L.wall+' '+p.i));
}
// выключенные ползунки; у старых моделей (без поля ui) участки несимметричных осей выключены
function offSet(e){
  let s;
  if(e.ui&&Array.isArray(e.ui.off))s=new Set(e.ui.off);
  else{s=new Set();paramList(e.axes).forEach(p=>{if(p.kind==='p')s.add(p.key)})}
  if((e.ver||0)<4)s.add('wall_all');
  return s;
}
function labelOf(e,p,lang){
  const o=e.ui&&e.ui.lab&&e.ui.lab[p.key];
  return (o&&o[lang])||defLabel(lang,p);
}
const isWall=p=>(p.kind==='s'&&p.i>=1)||p.kind==='w';
// пропорциональное изменение всех видимых стенок: ws=[{key,orig,min,max}], dk — какую стенку двигает пользователь
function wallScaleF(ws,f){
  let fmin=0,fmax=Infinity;
  ws.forEach(w=>{if(w.orig>0){fmin=Math.max(fmin,w.min/w.orig);fmax=Math.min(fmax,w.max/w.orig)}});
  if(fmin<=fmax)f=Math.min(fmax,Math.max(fmin,f));
  const o={};ws.forEach(w=>{o[w.key]=w.orig*f});return {vals:o,f};
}
function wallScale(ws,dk,v){const d=ws.find(w=>w.key===dk);if(!d||!(d.orig>0))return null;return wallScaleF(ws,v/d.orig).vals}
// средний процент от исходной толщины (для общего ползунка стенок)
function wallPct(ws,get){let s=0,n=0;ws.forEach(w=>{if(w.orig>0){s+=get(w.key)/w.orig;n++}});return n?s/n*100:100}
// превью модели: серая «карта освещения» перекрашивается фильтром в цвет модели
const NEUTRAL=215;
function hexRGB(h){h=String(h||'#4a4d52').replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16)||0;return [(n>>16)&255,(n>>8)&255,n&255]}
function tintSvg(thumb,color,uid){
  const c=hexRGB(color).map(v=>+(v/NEUTRAL).toFixed(4)),id='tn-'+String(uid).replace(/[^a-zA-Z0-9-]/g,'-');
  return '<svg viewBox="0 0 120 120" fill="none"><defs><filter id="'+id+'" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="'+c[0]+' 0 0 0 0 0 '+c[1]+' 0 0 0 0 0 '+c[2]+' 0 0 0 0 0 1 0"/></filter></defs><image href="'+thumb+'" x="0" y="0" width="120" height="120" filter="url(#'+id+')"/></svg>';
}
function pick(o,lang){return (o&&(o[lang]||o.en||o.ru||o.he||Object.values(o)[0]))||''}
// запись модели для сайта (формат objmodel v2)
function buildEntry(o){
  const c=o.canon,big=c.U.length/3>65535;
  const idx=big?Uint32Array.from(c.I):Uint16Array.from(c.I);
  return {
    fmt:'objmodel',ver:4,split:o.split?1:0,thn:o.thn?1:0,desc:o.desc||{},id:o.id,name:o.name,tag:o.tag,color:o.color,z:!!o.z,s:!!o.s,
    src:o.src,tris:c.I.length/3,added:new Date().toISOString().slice(0,10),thumb:o.thumb||'',
    pos:b64enc(c.U),idx:b64enc(idx),ib:big?4:2,
    ui:o.ui||{off:[],lab:{},rg:{},link:{show:true,on:false}},
    axes:o.AX.map(A=>{
      const def=A.vals.slice();
      const rng=A.rng.map((r,i)=>[Math.min(r[0],def[i]),Math.max(r[1],def[i])]);
      const T=total(A);
      return {sym:!!A.sym,n:def.length,wall:A.wall||null,inner:A.inner||null,rng,trng:[Math.min(A.trng[0],T),Math.max(A.trng[1],T)],def,tdef:T,orig:A.segs.slice()};
    })
  };
}
