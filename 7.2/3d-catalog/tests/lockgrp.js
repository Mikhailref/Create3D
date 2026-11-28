// замок вместе со связью: участники группы двигаются вместе даже под замком, чужие размеры их не меняют
// и фиксатор центра сразу у всех размеров
const {voxel,L,make,load,out,blk,read}=require('./lib');
const F=process.env.ENGINE||out+'Конвертер-OBJ-HTML.html';
const C=load(F);
const D=new Function(blk(read(F),'core-src')+';return {dmLock,dmPin,dmSkSolve}')();
let ok=0,bad=0;
const T=(name,cond,info)=>{if(cond){ok++;console.log('  ОК     '+name)}else{bad++;console.log('  ОШИБКА '+name+(info!==undefined?'  → '+JSON.stringify(info):''))}};
const near=(a,b,e=.02)=>Math.abs(a-b)<=e;
const r2=a=>a.map(x=>+x.toFixed(3));
const eq=a=>Math.max(...a)-Math.min(...a)<.02;
const MAXW=74/3; // три стенки при длине 250 и карманах по 88

const geo=require('./user_box.json');
function user(opt={}){
  const st=JSON.parse(JSON.stringify(geo.st));st.dv=st.dm.map(d=>d.v0);st.last=[];st.un=[];st.ua=[];st.cg={};delete st.cb;delete st.lk;
  if(opt.dm)opt.dm(st.dm);if(opt.cm)st.cm=opt.cm(st);
  (opt.lk||[]).forEach(q=>D.dmLock(st,q,true));
  const v=()=>C.geoVals(geo,st);
  return {st,v,set:(k,x)=>C.geoSet(geo,st,k,x),walls:()=>['q3','q5','q7'].map(k=>v()[k]),
    range:k=>C.geoRange(geo,st,C.geoParams({...geo,st}).find(p=>p.key===k)),
    locked:()=>Object.keys(st.lk||{}).map(Number).sort((a,b)=>a-b),
    planes:()=>{const r=D.dmSkSolve(st).c;return [0,1,2].map(a=>{const e=r.find(c=>c.ax===a);return e?e.by:st.sk.s[a]})},
    mid:q=>{const s=st.dm[q],a=s.d.findIndex(x=>x),e=D.dmSkSolve(st).c.find(c=>c.ax===a),t=e?e.by:st.sk.s[a];return (t[s.sk[0]]+t[s.sk[1]])/2}};
}

console.log('Все стенки в группе и под замком, карманы под замком');
for(const drag of ['q3','q5','q7']){
  const m=user({lk:[3,5,7,4,6]});let worst=null;
  for(let w=10;w<=40;w+=.9){m.set(drag,w);const a=m.walls(),v=m.v();
    if(!worst&&!(eq(a)&&near(a[0],Math.min(w,MAXW))&&near(v.q4,88)&&near(v.q6,88)))worst={просили:+w.toFixed(1),стенки:r2(a),карманы:r2([v.q4,v.q6])}}
  T(drag+': все три стенки идут за ползунком до упора, карманы под замком стоят',!worst,worst);
  T(drag+': замки остались на месте',JSON.stringify(m.locked())==='[3,4,5,6,7]',m.locked());
}
{ const m=user({lk:[3,5,7,4,6]});const r=m.range('q5');T('диапазон ползунка стенки под замком не нулевой',r[0]<2&&near(r[1],MAXW),r2(r));
  m.set('q3',18);m.set('q0',250);T('длина — чужой размер: стенки под замком не меняются',m.walls().every(x=>near(x,18)),r2(m.walls()));
  m.set('q1',60);m.set('q2',150);T('размеры других осей стенки не трогают',m.walls().every(x=>near(x,18)),r2(m.walls()));
  m.set('q7',8);T('после этого ползунок стенки снова двигает все',m.walls().every(x=>near(x,8))&&near(m.v().q0,200),{стенки:r2(m.walls()),длина:m.v().q0}); }
{ const m=user({lk:[3,5,7]});m.set('q3',15);m.set('q0',240);const a=m.walls(),v=m.v();
  T('карманы свободны: длина растёт за счёт карманов, стенки стоят',a.every(x=>near(x,15))&&near(v.q0,240)&&v.q4>90,{стенки:r2(a),карманы:r2([v.q4,v.q6]),длина:v.q0});
  m.set('q4',60);T('карман меняют: стенки под замком стоят',m.walls().every(x=>near(x,15))&&near(m.v().q4,60),{стенки:r2(m.walls()),карман:m.v().q4}); }

console.log('Под замком только одна стенка');
for(const drag of ['q3','q5','q7']){
  const m=user({lk:[5,4,6]});m.set(drag,19);T(drag+': все три равны, и та что под замком тоже',m.walls().every(x=>near(x,19)),r2(m.walls()));
  m.set(drag,100);T(drag+': упор по длине общий',m.walls().every(x=>near(x,MAXW))&&near(m.v().q0,250),r2(m.walls()));
}
{ const m=user({lk:[5]});let w=null;m.set('q3',16);
  for(const [k,x] of [['q0',250],['q0',150],['q4',120],['q6',40],['q4',88],['q0',206]]){m.set(k,x);if(!w&&!m.walls().every(y=>near(y,16)))w={ход:[k,x],стенки:r2(m.walls())}}
  T('замок на одной стенке защищает всю группу от чужих размеров (связь не рвётся)',!w,w); }

console.log('Отменить замок может только участник той же группы');
{ const m=user({lk:[5,4,6]});m.set('q0',250);m.set('q0',150);T('карманы под замком и одна стенка под замком: длина стенки не меняет',m.walls().every(x=>near(x,10))&&near(m.v().q0,206),{стенки:r2(m.walls()),длина:m.v().q0}); }
{ const m=user({lk:[5],cm:st=>[{m:[3,4],mn:20,mx:300,lab:{ru:'стенка+карман',en:'c',he:'c'}}]});m.set('c0',130);const v=m.v();
  T('составной не из группы: стенки стоят, меняется только карман',m.walls().every(x=>near(x,10))&&near(v.q4,120),{стенки:r2(m.walls()),карман:v.q4}); }
{ const m=user({lk:[3,4,6],cm:st=>[{m:[3,6],mn:20,mx:300,lab:{ru:'под замком',en:'c',he:'c'}}]});m.set('c0',150);
  T('составной из размеров под замком их не двигает',m.walls().every(x=>near(x,10))&&near(m.v().q6,88),{стенки:r2(m.walls()),карман:m.v().q6}); }

console.log('Пропорциональная группа под замком');
{ const m=user({lk:[3,5,7,4,6],dm:d=>[3,5,7].forEach(i=>{delete d[i].g;d[i].pg=1})});m.set('q5',17);
  T('пропорция: все стенки идут вместе',m.walls().every(x=>near(x,17)),r2(m.walls()));
  m.set('q0',250);T('пропорция: от чужого размера стоят',m.walls().every(x=>near(x,17)),r2(m.walls())); }

console.log('Замки вне группы продолжают работать');
{ const m=user({lk:[3,5,7,4,6],dm:d=>{d[4].g=2}});m.set('q3',20);
  T('карман в другой группе и под замком не меняется от стенок',near(m.v().q4,88)&&near(m.v().q6,88),r2([m.v().q4,m.v().q6])); }
{ const m=user({lk:[3,5,7,4,6],dm:d=>{d[4].g=2;d[6].g=2}});m.set('q4',70);const v=m.v();
  T('группа карманов под замком тоже двигается своим ползунком',near(v.q4,70)&&near(v.q6,70),r2([v.q4,v.q6]));
  T('а стенки из другой группы стоят',m.walls().every(x=>near(x,10)),r2(m.walls())); }

console.log('Замок и фиксатор центра на участнике группы');
{ const m=user({lk:[3,5,7]});D.dmPin(m.st,5,true);const c=m.mid(5);m.set('q3',20);
  T('размер идёт за группой, центр остаётся на месте',m.walls().every(x=>near(x,20))&&near(m.mid(5),c),{стенки:r2(m.walls()),центр:[c,m.mid(5)]}); }

console.log('Составной размер в группе с замком');
{ // сумма карманов синхронизирована с высотой, высота под замком
  const m=user({cm:st=>[{m:[4,6],mn:40,mx:300,g:1,lab:{ru:'карманы',en:'p',he:'p'}}],dm:d=>{[3,5,7].forEach(i=>delete d[i].g);d[2].g=1},lk:[2]});
  m.set('c0',190);const sum=()=>m.v().q4+m.v().q6;
  T('ползунок составного двигает размер под замком из своей группы',near(sum(),190,.1)&&near(m.v().q2,190,.1),{сумма:sum(),высота:m.v().q2});
  m.set('q4',50);T('чужой размер не может изменить замок, значит и составной стоит',near(m.v().q2,190,.1)&&near(sum(),190,.1),{сумма:sum(),высота:m.v().q2});
  m.set('q2',160);T('ползунок размера под замком двигает составной',near(sum(),160,.1)&&near(m.v().q2,160,.1),{сумма:sum(),высота:m.v().q2}); }

console.log('Стенки по двум осям: все под замком');
{ const X=[0,10,60,70,120,130],Y=[0,10,40,50];
  const pos=voxel([X,Y,[0,6,30]],(i,j,k)=>!(k===1&&i%2===1&&j===1));
  const m=make(C,pos,[L([0,0,0],[130,0,0],{amax:200}),L([0,0,0],[0,50,0],{amax:90}),
    L([0,0,30],[10,0,30]),L([60,0,30],[70,0,30]),L([120,0,30],[130,0,30]),L([0,0,30],[0,10,30]),L([0,40,30],[0,50,30]),
    L([10,10,30],[60,10,30]),L([70,10,30],[120,10,30]),L([10,10,30],[10,40,30])]),st=m.st,i=[2,3,4,5,6];
  i.forEach(q=>st.dm[q].g=1);i.concat(7,8,9).forEach(q=>D.dmLock(st,q,true));const w=()=>i.map(q=>m.vals()['q'+q]);
  m.set(2,18);T('стенки обеих осей идут за ползунком',w().every(x=>near(x,18)),r2(w()));
  m.set(5,100);T('ползунок стенки другой оси, упор по ширине: все по 30',w().every(x=>near(x,30))&&near(m.vals().q1,90),{стенки:r2(w()),Y:m.vals().q1});
  const v=m.vals();T('карманы и паз под замком не изменились',near(v.q7,50)&&near(v.q8,50)&&near(v.q9,30),r2([v.q7,v.q8,v.q9])); }

console.log('Фиксатор центра сразу у всех размеров');
const pinAll=(m,on)=>m.st.dm.forEach((s,i)=>{if(s.sk&&!!(m.st.cp&&m.st.cp[i]!==undefined)!==on)D.dmPin(m.st,i,on)});
const flat=p=>[].concat(...p),same=(a,b,e=.02)=>flat(a).every((x,i)=>near(x,flat(b)[i],e));
// форма без учёта общего сдвига (после снятия фиксаторов деталь на экране снова центруется)
const shape=p=>p.map(a=>a.map(x=>x-a[0]));
for(const start of [[],[['q3',19]],[['q0',240]],[['q3',22],['q1',80],['q2',60]]]){
  const m=user({lk:[]});start.forEach(([k,x])=>m.set(k,x));const p0=m.planes(),w0=m.walls();pinAll(m,true);
  T(`после ${JSON.stringify(start)}: поставили у всех — деталь не дёрнулась`,same(m.planes(),p0)&&m.walls().every((x,i)=>near(x,w0[i])),{было:p0.map(r2),стало:m.planes().map(r2)});
  const c=m.st.dm.map((s,q)=>m.mid(q));let w=null;
  for(const [k,x] of [['q3',16],['q5',8],['q0',230],['q7',30],['q4',70],['q1',60],['q2',90],['q6',100],['q3',12]]){m.set(k,x);
    const moved=m.st.dm.map((s,q)=>m.mid(q)-c[q]);if(!w&&!(moved.every(d=>Math.abs(d)<.02)&&eq(m.walls())))w={ход:[k,x],сдвиг:r2(moved),стенки:r2(m.walls())}}
  T('  центры всех размеров на месте, стенки равны на любых ползунках',!w,w);
  const p1=m.planes();pinAll(m,false);T('  сняли у всех — форма не изменилась, фиксаторов нет',same(shape(m.planes()),shape(p1))&&!Object.keys(m.st.cp||{}).length&&!Object.keys(m.st.co||{}).length,{cp:m.st.cp,co:m.st.co});
}
{ const m=user({lk:[]});pinAll(m,true);m.set('q3',16);const v=m.v();
  T('карманы свободны: стенки растут, карманы уменьшаются на столько же',m.walls().every(x=>near(x,16))&&near(v.q4,82)&&near(v.q6,82)&&near(v.q0,212),{стенки:r2(m.walls()),карманы:r2([v.q4,v.q6]),длина:v.q0}); }
{ const m=user({lk:[4,6]});pinAll(m,true);const p=m.planes();m.set('q3',16);m.set('q0',240);
  T('карманы под замком и все центры закреплены: деталь не ломается (стенкам некуда расти)',same(m.planes(),p),{стенки:r2(m.walls())}); }
{ const m=user({lk:[3,5,7]});pinAll(m,true);m.set('q3',16);const v=m.v();
  T('стенки под замком в группе + все центры: стенки растут вместе',m.walls().every(x=>near(x,16))&&near(v.q4,82),{стенки:r2(m.walls()),карман:v.q4}); }

// ---------- случайные сочетания ----------
function random(seed){
  let s=seed;const rnd=()=>(s=(s*48271)%2147483647)/2147483647,pick=a=>a[Math.floor(rnd()*a.length)];
  const res={moves:0,grp:0,moved:0,broke:0,lock:0,pin:0,flip:0,limit:0,crash:0,first:null};
  const X0=[0,1,2];
  for(let t=0;t<60;t++){
    const w=6+Math.floor(rnd()*10),p1=25+Math.floor(rnd()*50),p2=25+Math.floor(rnd()*50),d=20+Math.floor(rnd()*30),W=rnd()<.6?w:w+3;
    const X=[0,w,w+p1,2*w+p1,2*w+p1+p2,3*w+p1+p2],Y=[0,w,w+d,2*w+d];
    const pos=voxel([X,Y,[0,6,30]],(i,j,k)=>!(k===1&&i%2===1&&j===1));
    const ann=[L([0,0,0],[X[5],0,0],{amax:X[5]+20+rnd()*80}),L([0,0,0],[0,Y[3],0],{amax:Y[3]+10+rnd()*60}),
      L([0,0,30],[X[1],0,30]),L([X[2],0,30],[X[3],0,30]),L([X[4],0,30],[X[5],0,30]),L([0,0,30],[0,Y[1],30]),L([0,Y[2],30],[0,Y[3],30]),
      L([X[1],Y[1],30],[X[2],Y[1],30]),L([X[3],Y[1],30],[X[4],Y[1],30]),L([X[1],Y[1],30],[X[1],Y[2],30])];
    try{
      const comps=rnd()<.3?[{members:pick([[7,8],[7,2],[8,3,9]]),amin:1,amax:900}]:[];
      const m=make(C,pos,ann,comps),st=m.st,n=st.dm.length;
      const members=pick([[2,3],[2,3,4],[2,3,4,5,6],[7,8],[2,5]]),key=rnd()<.7?'g':'pg';
      members.forEach(q=>st.dm[q][key]=1);
      if(rnd()<.3){const k2=pick(['g','pg']);[7,8].forEach(q=>{if(!st.dm[q].g&&!st.dm[q].pg)st.dm[q][k2]=2})}
      // замки сразу на часть участников
      members.forEach(q=>{if(rnd()<.6)D.dmLock(st,q,true)});
      const groups=()=>{const o={};st.dm.forEach((x,q)=>['g','pg'].forEach(k=>{if(x[k])(o[k+x[k]]=o[k+x[k]]||[]).push(q)}));return o};
      const rel=(k,list,v)=>{const a=list.map(q=>v['q'+q]/(k[0]==='p'?st.dm[q].v0:1)),big=k[0]==='p'?Math.max(...list.map(q=>st.dm[q].v0)):1;return (Math.max(...a)-Math.min(...a))*big<.005};
      for(let step=0;step<30;step++){
        if(rnd()<.1){const q=Math.floor(rnd()*n);if(st.dm[q].sk)D.dmLock(st,q,!(st.lk&&st.lk[q]))}
        if(rnd()<.05){const q=Math.floor(rnd()*n);if(st.dm[q].sk)D.dmPin(st,q,!(st.cp&&st.cp[q]!==undefined))}
        const P=C.geoParams({...m.g,st}).filter(p=>p.kind==='dq'||p.kind==='cm'),p=rnd()<.5?pick(P.filter(p=>p.kind==='dq'&&members.indexOf(p.i)>=0)):pick(P);
        const g0=groups(),v0=m.vals(),held=Object.keys(g0).filter(k=>rel(k,g0[k],v0));
        // семья: все размеры, связанные группами с тем, который двигают
        const dragged=p.kind==='dq'?[p.i]:st.cm[p.i].m,fam=new Set(p.kind==='dq'?[p.i]:[]);
        let more=true;while(more){more=false;for(const k in g0)if(g0[k].some(q=>fam.has(q)))g0[k].forEach(q=>{if(!fam.has(q)){fam.add(q);more=true}})}
        const lk=Object.keys(st.lk||{}).map(Number),lk0=JSON.stringify(st.lk||{}),pins=Object.keys(st.cp||{}).map(Number);
        const mids=()=>{const c=D.dmSkSolve(st).c;return pins.map(q=>{const x=st.dm[q],a=x.d.findIndex(v=>v),e=c.find(c=>c.ax===a),tt=e?e.by:st.sk.s[a];return (tt[x.sk[0]]+tt[x.sk[1]])/2})};
        const c0=mids(),was=v0[p.key],want=p.min+rnd()*(p.max-p.min);C.geoSet(m.g,st,p.key,want);res.moves++;
        const v=m.vals(),c1=mids();
        if(p.kind==='dq'&&fam.size>1){res.grp++;if(Math.abs(v[p.key]-was)>.01)res.moved++}
        const note={t,step,ход:p.key,замки:lk,группы:Object.fromEntries(held.map(k=>[k,r2(g0[k].map(q=>v['q'+q]))]))};
        const broke=held.some(k=>!rel(k,g0[k],v));
        const locks=lk.some(q=>dragged.indexOf(q)<0&&!fam.has(q)&&!near(v['q'+q],v0['q'+q],.03))||JSON.stringify(st.lk||{})!==lk0;
        const pin=c1.some((x,i)=>!near(x,c0[i],.03));
        const flip=D.dmSkSolve(st).c.some(c=>c.by.some((x,i)=>i&&x-c.by[i-1]<-1e-3));
        const over=st.dm.some((x,q)=>v['q'+q]>Math.max(x.mx,x.v0)+.03||v['q'+q]<Math.min(x.mn,x.v0)-.03);
        if(broke)res.broke++;if(locks)res.lock++;if(pin)res.pin++;if(flip)res.flip++;if(over)res.limit++;
        if(broke||locks||pin||flip||over){if(!res.first)res.first={...note,broke,locks,pin,flip,over};break}
      }
    }catch(e){res.crash++;if(!res.first)res.first=String(e.stack).slice(0,400)}
  }
  return res;
}
console.log('Случайные детали: замки внутри групп, фиксаторы, составные');
for(const seed of process.argv[2]?[+process.argv[2]]:[1,2,3,4,5,6,7,8]){
  const r=random(seed);if(process.env.STAT)console.log('   всего',r.moves,'ползунок группы',r.grp,'из них двигался',r.moved);
  T(`seed ${seed}: ${r.moves} движений, связь цела (вместе с замками), чужие замки и центры держат`,!(r.broke||r.lock||r.pin||r.flip||r.limit||r.crash),{broke:r.broke,lock:r.lock,pin:r.pin,flip:r.flip,limit:r.limit,crash:r.crash,первый:r.first});
}
console.log(`\nИтого: пройдено ${ok}, ошибок ${bad}`);
