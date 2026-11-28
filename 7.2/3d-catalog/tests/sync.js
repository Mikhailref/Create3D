// синхронизация и пропорции: связь в группе не должна ломаться ни от какого движения
// node sync.js            — проверки по сценариям
const {voxel,L,make,load,out,blk,read}=require('./lib');
const F=process.env.ENGINE||out+'Конвертер-OBJ-HTML.html';
const C=load(F);
const D=new Function(blk(read(F),'core-src')+';return {dmLock,dmPin,dmSkSolve}')();
let ok=0,bad=0;
const T=(name,cond,info)=>{if(cond){ok++;console.log('  ОК     '+name)}else{bad++;console.log('  ОШИБКА '+name+(info!==undefined?'  → '+JSON.stringify(info):''))}};
const near=(a,b,e=.02)=>Math.abs(a-b)<=e;
const r2=a=>a.map(x=>+x.toFixed(3));

// ---------- модель пользователя: коробка с двумя карманами, стенки в группе, карманы под замком ----------
const geo=require('./user_box.json');
function user(opt={}){
  const st=JSON.parse(JSON.stringify(geo.st));st.dv=st.dm.map(d=>d.v0);st.last=[];st.un=[];st.ua=[];st.cg={};delete st.cb;
  if(opt.lk!==undefined)st.lk=opt.lk;
  if(opt.dm)opt.dm(st.dm);
  const v=()=>C.geoVals(geo,st);
  return {st,v,set:(k,x)=>C.geoSet(geo,st,k,x),walls:()=>['q3','q5','q7'].map(k=>v()[k]),
    thick:()=>D.dmSkSolve(st).c.filter(c=>c.ax===0).map(c=>c.by.slice(1).map((x,i)=>x-c.by[i]))[0]||st.sk.s[0].slice(1).map((x,i)=>x-st.sk.s[0][i])};
}
const eq=a=>Math.max(...a)-Math.min(...a)<.02;

console.log('Модель пользователя: ползунок стенки доводит длину до предела 250');
for(const drag of ['q3','q5','q7']){
  const m=user();let worst=null;
  for(let w=10;w<=60;w+=.7){m.set(drag,w);const a=m.walls(),v=m.v();
    if(!worst&&!(eq(a)&&near(v.q4,88)&&near(v.q6,88)&&v.q0<=250.02))worst={просили:+w.toFixed(1),стенки:r2(a),карманы:r2([v.q4,v.q6]),длина:+v.q0.toFixed(3)}}
  T(drag+': стенки всё время равны, карманы 88, длина не больше 250',!worst,worst);
  const a=m.walls(),v=m.v();T(drag+': ползунок остановился на 24.667 (длина ровно 250)',a.every(x=>near(x,74/3))&&near(v.q0,250),{стенки:r2(a),длина:v.q0});
}
{ const m=user();m.set('q3',200);const a=m.walls();T('рывок сразу за предел — тот же результат',a.every(x=>near(x,74/3)),r2(a));
  T('участки каркаса симметричны: стенка-карман-стенка-карман-стенка',m.thick().every((x,i)=>near(x,i%2?88:74/3)),r2(m.thick()));
  m.set('q3',12);T('после упора ползунок свободно идёт назад',m.walls().every(x=>near(x,12))&&near(m.v().q0,212),r2(m.walls()));
  m.set('q3',0);const b=m.walls();T('вниз до упора: стенки равны',eq(b)&&b[0]>0,r2(b));
}
{ const m={...user()},s=JSON.parse(JSON.stringify(geo.st));const g=JSON.parse(JSON.stringify(geo.st));
  C.geoSet(geo,g,'q3',60);const v=C.geoVals(geo,g),a=[v.q3,v.q5,v.q7];T('из сохранённого состояния модели: стенки равны и на пределе',eq(a)&&near(v.q0,250),{стенки:r2(a),длина:v.q0});
}
console.log('Те же стенки, двигают другие размеры');
{ const m=user();let w=null;for(const x of [220,240,250,300,230,200,180,150,0,206]){m.set('q0',x);if(!w&&!(eq(m.walls())&&near(m.v().q4,88)))w={длина:x,стенки:r2(m.walls())}}
  T('ползунок длины: стенки равны, карманы под замком не меняются',!w,w);}
{ const m=user({lk:{0:1}});let w=null;for(let x=88;x<=240;x+=7){m.set('q4',x);if(!w&&!(eq(m.walls())&&near(m.v().q0,206)))w={карман:x,стенки:r2(m.walls()),длина:m.v().q0}}
  T('длина под замком, растёт карман: стенки уменьшаются вместе',!w,w);}
{ const m=user({lk:{}});let w=null;for(const [k,x] of [['q4',120],['q6',150],['q3',20],['q0',250],['q4',200],['q3',5],['q6',10],['q0',120],['q3',40]]){m.set(k,x);if(!w&&!eq(m.walls()))w={ход:[k,x],стенки:r2(m.walls())}}
  T('без замков, разные ползунки по очереди: стенки равны',!w,w);}
console.log('Пределы и ограничения у одной из стенок');
{ const m=user({dm:d=>{d[5].mx=15}});m.set('q3',40);T('у второй стенки «до 15»: все останавливаются на 15',m.walls().every(x=>near(x,15)),r2(m.walls()));}
{ const m=user({lk:{},dm:d=>{Object.assign(d[7],{rf:4,rop:'*',rval:.2})}});m.set('q3',40);T('третья стенка «не больше кармана × 0.2»: все 17.6',m.walls().every(x=>near(x,17.6)),r2(m.walls()));
  m.set('q4',50);T('карман уменьшили: все стенки уменьшились вместе с ограниченной',m.walls().every(x=>near(x,10)),r2(m.walls()));}
{ const m=user({lk:{4:1,6:1,5:1}});m.set('q3',40);const a=m.walls();
  T('стенка под замком тоже идёт за своей группой: все три равны, предел общий',a.every(x=>near(x,74/3)),r2(a));}

console.log('Пропорциональная группа');
{ const m=user({dm:d=>{[3,5,7].forEach(i=>{delete d[i].g;d[i].pg=1})}});let w=null;
  for(const [k,x] of [['q3',40],['q3',5],['q0',250],['q0',180],['q5',60],['q4',99],['q7',1]]){m.set(k,x);if(!w&&!eq(m.walls()))w={ход:[k,x],стенки:r2(m.walls())}}
  T('одинаковые стенки в пропорциональной группе остаются равными',!w,w);}

// ---------- стенки по двум осям ----------
function two(X,Y,ann,comps){
  const pos=voxel([X,Y,[0,6,30]],(i,j,k)=>!(k===1&&i%2===1&&j===1));
  return make(C,pos,ann,comps);
}
const X=[0,10,60,70,120,130],Y=[0,10,40,50];
const annTwo=()=>[L([0,0,0],[130,0,0],{amax:200}),L([0,0,0],[0,50,0],{amax:90}),
  L([0,0,30],[10,0,30]),L([60,0,30],[70,0,30]),L([120,0,30],[130,0,30]),
  L([0,0,30],[0,10,30]),L([0,40,30],[0,50,30]),
  L([10,10,30],[60,10,30]),L([70,10,30],[120,10,30]),L([10,10,30],[10,40,30])];
console.log('Стенки по двум осям в одной группе');
{ const m=two(X,Y,annTwo()),st=m.st,i=[2,3,4,5,6];i.forEach(q=>st.dm[q].g=1);D.dmLock(st,7,true);D.dmLock(st,8,true);D.dmLock(st,9,true);
  const w=()=>i.map(q=>m.vals()['q'+q]);
  m.set(2,18);T('ползунок стенки по X меняет и стенки по Y',w().every(x=>near(x,18)),r2(w()));
  m.set(2,100);T('упор по ширине (90): все пять стенок по 30',w().every(x=>near(x,30))&&near(m.vals().q1,90),{стенки:r2(w()),X:m.vals().q0,Y:m.vals().q1});
  let bad_=null;for(const [q,x] of [[0,160],[0,200],[0,130],[1,70],[1,90],[1,40],[0,150],[5,12],[3,25]]){m.set(q,x);if(!bad_&&!eq(w()))bad_={ход:[q,x],стенки:r2(w())}}
  T('ползунки длины и ширины: стенки на обеих осях остаются равны',!bad_,bad_);
  const v=m.vals();T('замки на карманах держат',near(v.q7,50)&&near(v.q8,50)&&near(v.q9,30),r2([v.q7,v.q8,v.q9]));}

console.log('Стенки разной величины, которые объединили в группу');
{ const X2=[0,10,70,84,134,142],m=two(X2,Y,[L([0,0,0],[142,0,0],{amax:200}),L([0,0,30],[10,0,30]),L([70,0,30],[84,0,30]),L([134,0,30],[142,0,30]),L([10,10,30],[70,10,30]),L([84,10,30],[134,10,30])]),st=m.st,i=[1,2,3];
  i.forEach(q=>st.dm[q].g=1);D.dmLock(st,4,true);D.dmLock(st,5,true);const w=()=>i.map(q=>m.vals()['q'+q]);
  m.set(1,12);T('первое же движение выравнивает все стенки',w().every(x=>near(x,12)),r2(w()));
  m.set(2,90);T('упор по длине 200: все по 30',w().every(x=>near(x,30))&&near(m.vals().q0,200),{стенки:r2(w()),длина:m.vals().q0});
  m.set(0,170);T('длина 170: все по 20',w().every(x=>near(x,20)),r2(w()));}

// ---------- случайные сочетания ----------
function random(seed){
  let s=seed;const rnd=()=>(s=(s*48271)%2147483647)/2147483647,pick=a=>a[Math.floor(rnd()*a.length)];
  const res={moves:0,stuck:0,grp:0,grpStuck:0,broke:0,lock:0,flip:0,limit:0,crash:0,first:null};
  for(let t=0;t<60;t++){
    const w=6+Math.floor(rnd()*10),p1=25+Math.floor(rnd()*50),p2=25+Math.floor(rnd()*50),d=20+Math.floor(rnd()*30),W=rnd()<.6?w:w+3;
    const X=[0,w,w+p1,2*w+p1,2*w+p1+p2,3*w+p1+p2],Y=[0,w,w+d,2*w+d];
    const ann=[L([0,0,0],[X[5],0,0],{amax:X[5]+20+rnd()*80}),L([0,0,0],[0,Y[3],0],{amax:Y[3]+10+rnd()*60}),
      L([0,0,30],[X[1],0,30]),L([X[2],0,30],[X[3],0,30]),L([X[4],0,30],[X[5],0,30]),L([0,0,30],[0,Y[1],30]),L([0,Y[2],30],[0,Y[3],30]),
      L([X[1],Y[1],30],[X[2],Y[1],30]),L([X[3],Y[1],30],[X[4],Y[1],30]),L([X[1],Y[1],30],[X[1],Y[2],30])];
    try{
      const comps=rnd()<.35?[{members:pick([[7,8],[7,2],[8,3,9]]),amin:1,amax:900}]:[];
      const m=two(X,Y,ann,comps),st=m.st,n=st.dm.length;
      const members=pick([[2,3],[2,3,4],[2,3,4,5,6],[7,8],[2,5]]),key=rnd()<.7?'g':'pg';
      members.forEach(q=>st.dm[q][key]=1);
      if(rnd()<.3){const k2=pick(['g','pg']);[7,8].forEach(q=>{if(!st.dm[q].g&&!st.dm[q].pg)st.dm[q][k2]=2})}
      if(rnd()<.35){const q=pick(members),j=pick([0,1,7,8,9].filter(j=>members.indexOf(j)<0));Object.assign(st.dm[q],{rf:j,rop:'*',rval:pick([.2,.5,1])})}
      if(rnd()<.25)st.dm[pick(members)].mx=w*(1.2+rnd());
      const groups=()=>{const o={};st.dm.forEach((x,q)=>{['g','pg'].forEach(k=>{if(x[k])(o[k+x[k]]=o[k+x[k]]||[]).push(q)})});return o};
      const rel=(k,list,v)=>{const a=list.map(q=>v['q'+q]/(k[0]==='p'?st.dm[q].v0:1)),big=k[0]==='p'?Math.max(...list.map(q=>st.dm[q].v0)):1;return (Math.max(...a)-Math.min(...a))*big<.005};
      for(let step=0;step<30;step++){
        if(rnd()<.12){const q=Math.floor(rnd()*n);if(st.dm[q].sk)D.dmLock(st,q,!(st.lk&&st.lk[q]))}
        if(rnd()<.08){const q=Math.floor(rnd()*n);if(st.dm[q].sk)D.dmPin(st,q,!(st.cp&&st.cp[q]!==undefined))}
        const P=C.geoParams({...m.g,st}).filter(p=>p.kind==='dq'||p.kind==='cm'),p=pick(P);
        const g0=groups(),v0=m.vals(),held=Object.keys(g0).filter(k=>rel(k,g0[k],v0));
        const lk=Object.keys(st.lk||{}).map(Number),dragged=p.kind==='dq'?[p.i]:st.cm[p.i].m;
        // участники тех же групп вправе отменять замки друг друга
        const fam=new Set(p.kind==='dq'?[p.i]:[]);if(p.kind==='cm'){const c=st.cm[p.i];['g','pg'].forEach(k=>{if(c[k]&&g0[k+c[k]])g0[k+c[k]].forEach(q=>fam.add(q))})}
        let more=true;while(more){more=false;for(const k in g0)if(g0[k].some(q=>fam.has(q)))g0[k].forEach(q=>{if(!fam.has(q)){fam.add(q);more=true}})}
        const was=v0[p.key],want=p.min+rnd()*(p.max-p.min);C.geoSet(m.g,st,p.key,want);res.moves++;
        {const got=m.vals()[p.key],still=Math.abs(want-was)>1&&Math.abs(got-was)<.01,inG=p.kind==='dq'&&(st.dm[p.i].g||st.dm[p.i].pg);if(inG)res.grp++;if(still){res.stuck++;if(inG)res.grpStuck++}}
        const v=m.vals(),note={t,step,ход:p.key,группы:Object.fromEntries(held.map(k=>[k,r2(g0[k].map(q=>v['q'+q]))]))};
        const broke=held.some(k=>!rel(k,g0[k],v));
        const moved=lk.some(q=>dragged.indexOf(q)<0&&!fam.has(q)&&!near(v['q'+q],v0['q'+q],.03));
        const flip=D.dmSkSolve(st).c.some(c=>c.by.some((x,i)=>i&&x-c.by[i-1]<-1e-3));
        const over=st.dm.some((x,q)=>v['q'+q]>Math.max(x.mx,x.v0)+.03||v['q'+q]<Math.min(x.mn,x.v0)-.03);
        if(broke)res.broke++;if(moved)res.lock++;if(flip)res.flip++;if(over)res.limit++;
        if((broke||moved||flip||over)&&!res.first)res.first={...note,broke,moved,flip,over};
        if(broke||moved||flip||over)break;
      }
    }catch(e){res.crash++;if(!res.first)res.first=String(e.stack).slice(0,400)}
  }
  return res;
}
console.log('Случайные детали, замки, фиксаторы, пределы, составные');
for(const seed of process.argv[2]?[+process.argv[2]]:[1,2,3,4,5,6,7,8]){
  const r=random(seed);if(process.env.STAT)console.log('   всего',r.moves,'стоит',r.stuck,'в группе',r.grp,'стоит',r.grpStuck);T(`seed ${seed}: ${r.moves} движений, связь цела, замки и пределы соблюдены`,!(r.broke||r.lock||r.flip||r.limit||r.crash),{broke:r.broke,lock:r.lock,flip:r.flip,limit:r.limit,crash:r.crash,первый:r.first});
}
console.log(`\nИтого: пройдено ${ok}, ошибок ${bad}`);
