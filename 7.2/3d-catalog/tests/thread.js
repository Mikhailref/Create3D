// резьба: в каркасе нет кучи плоскостей, диаметр резьбы жёстко привязан к носителю (то же отношение), ширина — отдельный размер
// node thread.js   OLD=<старый файл конвертера> — сравнить со старой версией
const {voxel,L,make,load,out,blk,read,holePlate,box2}=require('./lib');
const {bolt,skCore}=require('./threadlib');
const CONV=process.env.ENGINE||out+'Конвертер-OBJ-HTML.html',MES=out+'mesurments.html';
let ok=0,bad=0;
const T=(name,cond,info)=>{if(cond){ok++;console.log('  ОК     '+name)}else{bad++;console.log('  ОШИБКА '+name+(info!==undefined?'  → '+JSON.stringify(info):''))}};
const near=(a,b,e=.02)=>Math.abs(a-b)<=e;
const pos=bolt();
const OLDF=process.env.OLD||(require('fs').existsSync(require('path').join(__dirname,'conv.v23.html'))?require('path').join(__dirname,'conv.v23.html'):null);
// ---------- 1. каркас ----------
for(const [name,file] of [['конвертер',CONV],['редактор размеров',MES]]){
  console.log('Каркас ('+name+'): болт с резьбой');
  const K=skCore(file),sk=K.skBuild([{positions:pos}]);
  const n=sk.axes.map(a=>a.stations.length);
  T('плоскостей мало: по X и Y не больше 9, по Z не больше 5 (было 49, 49, 162)',n[0]<=9&&n[1]<=9&&n[2]<=5,n);
  const th=sk.threads||[];
  T('найдена одна резьбовая зона',th.length===1,th.length);
  const z=th[0]||{};
  T('зона: ось Z, длина от 10 до 30',z.k===2&&near(z.zl,10)&&near(z.zh,30),z);
  T('зона: центр на оси, диаметры по впадинам 9.2 и по вершинам 10.8',z.c&&near(z.c[0],0)&&near(z.c[1],0)&&near(z.rl,4.6,.03)&&near(z.rh,5.4,.03),z);
  const has=(k,v)=>sk.axes[k].stations.some(s=>near(s,v,.03));
  T('по Z остались плоскости 0, 10 и 30',has(2,0)&&has(2,10)&&has(2,30));
  T('по X и Y остались плоскости носителя ±5, резьбы ±4.6, ±5.4 и центр',[0,1].every(k=>[-5.4,-5,-4.6,0,4.6,5,5.4].every(v=>has(k,v))),sk.axes.map(a=>a.stations.map(v=>+v.toFixed(2))));
  const ties=sk.ties||[];
  const car=ties.filter(t=>!near(t.r,1,.005)),sym=ties.filter(t=>near(t.r,1,.005));
  T('привязки к носителю: по две на каждую поперечную ось (впадины и вершины)',car.length===4&&[0,1].every(k=>car.filter(t=>t.k===k).length===2),car);
  T('симметрия круга: на каждой поперечной оси три равенства «левая часть = правая» (вершины, зазор до носителя, впадины)',sym.length===6&&[0,1].every(k=>sym.filter(t=>t.k===k).length===3),sym);
  const st=k=>sk.axes[k].stations,len=(k,a)=>st(k)[a[1]]-st(k)[a[0]];
  T('привязка держит отношение: впадины/носитель = 0.92, вершины/носитель = 1.08',ties.every(t=>near(len(t.k,t.a)/len(t.k,t.b),t.r,1e-6))&&ties.some(t=>near(t.r,.92,.01))&&ties.some(t=>near(t.r,1.08,.01)),ties.map(t=>t.r));
  const seg=sk.axes[2].segments;
  T('участок резьбы по Z — отдельный тип «thread», он закреплён (держит длину)',seg.some((s,i)=>s.type==='thread'&&s.fixed&&near(st(2)[i],10)&&near(st(2)[i+1],30)),seg);
  console.log('Каркас ('+name+'): детали без резьбы остаются как были');
  const same=(pp,label)=>{const a=K.skBuild([{positions:pp}]);let b=null;if(OLDF){b=skCore(OLDF).skBuild([{positions:pp}]);T(label+': плоскости и участки те же, что в v23, резьбы и привязок нет',JSON.stringify(a.axes)===JSON.stringify(b.axes)&&!(a.threads||[]).length&&!(a.ties||[]).length)}else T(label+': нет резьбы и привязок',!(a.threads||[]).length&&!(a.ties||[]).length)};
  same(box2(),'коробка с пазами');same(holePlate(),'пластина с отверстием');
  // конус (фаска) и шар не должны приниматься за резьбу
  const cone=[],N=100,P=(r,t,z)=>[r*Math.cos(t),r*Math.sin(t),z];
  for(let j=0;j<N;j++){const a=j/N*2*Math.PI,b=(j+1)/N*2*Math.PI;for(let i=0;i<4;i++){const r0=5+i*.25,r1=5+(i+1)*.25;cone.push(...P(r0,a,i*.25),...P(r0,b,i*.25),...P(r1,b,(i+1)*.25),...P(r0,a,i*.25),...P(r1,b,(i+1)*.25),...P(r1,a,(i+1)*.25))}}
  T('конус-фаска не считается резьбой',!(K.skBuild([{positions:Float32Array.from(cone)}]).threads||[]).length);
}
// ---------- 2. анализ: привязки считаются известными ----------
console.log('Анализ каркаса: привязка — это известная связь, а не размер, который нужно ставить вручную');
{const K=skCore(MES),A=K.skAnalyze;
 const tie=[{a:[0,2],b:[2,4],r:2}];
 T('без привязок 4 неизвестных участка',A(4,[]).missing===4);
 T('одна привязка уменьшает число неизвестных на 1',A(4,[],tie).missing===3);
 T('привязка и размер носителя: неизвестных на 2 меньше, чем без них',A(4,[[2,4]],tie).missing===2&&A(4,[[2,4]]).missing===3);
 T('привязка, ставшая лишней при размерах, не портит анализ',A(4,[[0,2],[2,4]],tie).redundant.length===0||A(4,[[0,2],[2,4]],tie).redundant.length===1);
 const sk=K.skBuild([{positions:pos}]);
 const miss=k=>A(sk.axes[k].segments.length,[],(sk.ties||[]).filter(t=>t.k===k)).missing,miss0=k=>A(sk.axes[k].segments.length,[]).missing;
 T('у болта по X и Y привязки убирают по 5 неизвестных участков из 6',[0,1].every(k=>miss0(k)-miss(k)===5),[0,1].map(k=>[miss0(k),miss(k)]));
 // после одного размера носителя ось определена полностью: больше ничего ставить не нужно
 const carSpan=k=>{const S=sk.axes[k].stations,i=S.findIndex(s=>near(s,-5,.03)),j=S.findIndex(s=>near(s,5,.03));return [i,j]};
 T('размер носителя по X и по Y определяет ось полностью (недостающих 0, лишних нет)',[0,1].every(k=>{const r=A(sk.axes[k].segments.length,[carSpan(k)],(sk.ties||[]).filter(t=>t.k===k));return r.missing===0&&r.redundant.length===0}),[0,1].map(k=>A(sk.axes[k].segments.length,[carSpan(k)],(sk.ties||[]).filter(t=>t.k===k))));
 T('по Z без привязок: резьба и хвостовик — два размера',A(sk.axes[2].segments.length,[]).missing===2); }
// ---------- 3. конвертер: пропорции ----------
const C=load(CONV);
const rad=(W,zlo,zhi)=>{let lo=1e9,hi=0,xl=1e9,xh=-1e9,yl=1e9,yh=-1e9,zl=1e9,zh=-1e9;for(let i=0;i<W.length;i+=3){const z=W[i+2];zl=Math.min(zl,z);zh=Math.max(zh,z);if(z<zlo||z>zhi)continue;const r=Math.hypot(W[i],W[i+1]);lo=Math.min(lo,r);hi=Math.max(hi,r);xl=Math.min(xl,W[i]);xh=Math.max(xh,W[i]);yl=Math.min(yl,W[i+1]);yh=Math.max(yh,W[i+1])}return {lo,hi,wx:xh-xl,wy:yh-yl,zl,zh}};
console.log('Конвертер, автоматические ползунки: диаметр резьбы идёт за диаметром носителя');
{const m=make(C,pos,[]);const keys=C.geoParams({...m.g,st:m.st}).map(p=>p.key);
 const d=keys.find(k=>/^d\d/.test(k));
 T('у хвостовика с резьбой один ползунок диаметра',!!d,keys);
 if(d){const r0=rad(m.apply(),11,29);C.geoSet(m.g,m.st,d,14);const r1=rad(m.apply(),11,29),f=14/10;
  T('диаметр 14: вершины резьбы 5.4 → 7.56 (в 1.4 раза)',near(r1.hi,r0.hi*f,.03),[r0,r1]);
  T('диаметр 14: впадины резьбы 4.6 → 6.44 (в 1.4 раза)',near(r1.lo,r0.lo*f,.03),[r0,r1]);
  C.geoSet(m.g,m.st,d,7);const r2=rad(m.apply(),11,29);T('диаметр 7: вершины и впадины в 0.7 раза',near(r2.hi,r0.hi*.7,.03)&&near(r2.lo,r0.lo*.7,.03),[r0,r2]); } }
console.log('Конвертер, размер «диаметр» из редактора размеров');
{const m=make(C,pos,[{type:'diameter',points:[[0,0,5],[5,0,5]],normal:[0,0,1]}]);
 T('есть размер диаметра хвостовика',m.st.dm.length===1&&m.st.dm[0].t==='D',m.st.dm.map(s=>s.t));
 const r0=rad(m.apply(),11,29);m.set(0,14);const r1=rad(m.apply(),11,29),f=1.4;
 T('диаметр 14: вершины резьбы 7.56, впадины 6.44',near(r1.hi,r0.hi*f,.03)&&near(r1.lo,r0.lo*f,.03),[r0,r1]);
 m.set(0,6);const r2=rad(m.apply(),11,29);T('диаметр 6: вершины 3.24, впадины 2.76 (в 0.6 раза)',near(r2.hi,r0.hi*.6,.03)&&near(r2.lo,r0.lo*.6,.03),[r0,r2]); }
console.log('Конвертер, линейные размеры (каркас): ширина резьбы отдельно, диаметр привязан к носителю');
{const mk=()=>make(C,pos,[L([-5,0,5],[5,0,5]),L([0,0,10],[0,0,30]),L([0,-5,5],[0,5,5])]);
 const m=mk();T('есть три размера: поперечник по X, длина резьбы, поперечник по Y',m.st.dm.length===3&&m.st.dm.every(s=>s.sk),m.st.dm.map(s=>s.sk));
 T('в каркасе модели лежат привязки: 4 к носителю и 6 равенств сторон',(m.st.sk.t||[]).length===10,m.st.sk&&m.st.sk.t);
 const r0=rad(m.apply(),11,29);
 m.set(0,14);const r1=rad(m.apply(),11,29);
 T('носитель по X стал 14: ширина по вершинам резьбы выросла в 1.4 раза (10.8 → 15.12)',near(r1.wx,r0.wx*1.4,.05),[r0.wx,r1.wx]);
 T('поперёк другой оси (Y) резьба не изменилась',near(r1.wy,r0.wy,.03),[r0.wy,r1.wy]);
 m.set(0,10);const r2=rad(m.apply(),11,29);T('вернули 10: резьба вернулась (10.8)',near(r2.wx,r0.wx,.03),r2.wx);
 m.set(1,26);const r3=rad(m.apply(),11,29);T('ширина резьбы 26: деталь вытянулась до 36, диаметр резьбы прежний',near(r3.zh-r3.zl,36,.03)&&near(r3.wx,r0.wx,.03),[r3.zh-r3.zl,r3.wx]);
 m.set(1,12);const r4=rad(m.apply(),11,29);T('ширина резьбы 12: деталь 22 длиной',near(r4.zh-r4.zl,22,.03),r4.zh-r4.zl);
 // носитель можно и уменьшать: тонкие зазоры между впадинами, вершинами и носителем (0.4) уменьшаются вместе с ним, а не держат размер
 {const mm=make(C,pos,[L([-5,0,5],[5,0,5],{amin:6,amax:20}),L([0,0,10],[0,0,30],{amin:10,amax:60}),L([0,-5,5],[0,5,5],{amin:6,amax:20})]);
  mm.set(0,7);const a=rad(mm.apply(),11,29),va=mm.vals();
  T('носитель по X стал 7: резьба по X стала 7.56 (в 0.7 раза), а не осталась 10.8',near(va.q0,7,.01)&&near(a.wx,7.56,.08)&&near(a.wy,10.8,.05),[va,a.wx,a.wy]);
  mm.set(2,6);const b=rad(mm.apply(),11,29),vb=mm.vals();
  T('носитель по Y стал 6: резьба по Y стала 6.48, по X осталась 7.56',near(vb.q2,6,.01)&&near(b.wy,6.48,.08)&&near(b.wx,7.56,.08),[vb,b.wx,b.wy]);
  const prm=C.geoParams({...mm.g,st:mm.st}),rg=k=>C.geoRange(mm.g,mm.st,prm.find(p=>p.key===k));
  const q0=rg('q0');T('предел ползунка носителя: от 6 до 20 (как задано в размере)',near(q0[0],6,.05)&&near(q0[1],20,.05),q0);
  mm.set(0,6);const c=rad(mm.apply(),11,29);T('носитель 6 (минимум): резьба 6.48',near(c.wx,6.48,.08),c.wx);
  mm.set(0,10);mm.set(2,10);const d=rad(mm.apply(),11,29);T('вернули 10 и 10: резьба снова 10.8 × 10.8',near(d.wx,10.8,.05)&&near(d.wy,10.8,.05),[d.wx,d.wy]); }
 // сам размер резьбы (вершины) двигают — носитель идёт за ним в том же отношении
 const m2=make(C,pos,[L([-5,0,5],[5,0,5]),L([-5.4,0,20],[5.4,0,20])]);
 const v=m2.vals();T('второй размер — это диаметр по вершинам резьбы (10.8)',near(v.q1,10.8,.05),v);
 m2.set(1,16.2);const v2=m2.vals();T('вершины резьбы 16.2 (×1.5): носитель тоже ×1.5 = 15, жёсткая связь',near(v2.q1,16.2,.05)&&near(v2.q0,15,.05),v2);
 m2.set(0,20);const v3=m2.vals();T('носитель 20 (×2): вершины 21.6 (отношение 1.08)',near(v3.q0,20,.05)&&near(v3.q1,21.6,.05),v3);
 const g2=C.geoRange(m2.g,m2.st,C.geoParams({...m2.g,st:m2.st}).find(p=>p.key==='q0'));T('предел ползунка носителя считается вместе с резьбой',g2[0]<g2[1],g2); }
console.log(`\nИтого: пройдено ${ok}, ошибок ${bad}`);
