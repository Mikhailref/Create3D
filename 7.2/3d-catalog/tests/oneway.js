// односторонняя связь (st.ow): размер, который вырос или сжался из-за другого, назад вслед за ним не идёт,
// если между их гранями на каркасе было расстояние; если грани в одной плоскости («нулевое расстояние») — идёт в обе стороны
// node oneway.js [seed]   ENGINE=<файл> — проверить другой движок
const {voxel,L,make,load,out,blk,read}=require('./lib');
const F=process.env.ENGINE||out+'Конвертер-OBJ-HTML.html';
const C=load(F);
const D=new Function(blk(read(F),'core-src')+';return {dmLock,dmPin,dmSkSolve,dmOw:typeof dmOw=="function"?dmOw:null}')();
const OLDF=process.env.OLD||require('path').join(__dirname,'conv.v23.html'),OLD=require('fs').existsSync(OLDF)&&load(OLDF);
let ok=0,bad=0;
const T=(name,cond,info)=>{if(cond){ok++;console.log('  ОК     '+name)}else{bad++;console.log('  ОШИБКА '+name+(info!==undefined?'  → '+JSON.stringify(info):''))}};
const near=(a,b,e=.05)=>Math.abs(a-b)<=e;
const r2=a=>a.map(x=>+x.toFixed(2));
const on=m=>{if(D.dmOw)D.dmOw(m.st,true);else m.st.ow=1;return m};

// ---------- модель 1: ширина = стенка 10 + паз 80 + стенка 10 ----------
function groove(opt={}){
  const pos=voxel([[0,10,90,100],[0,50],[0,6,30]],(i,j,k)=>!(k===1&&i===1));
  const m=make(C,pos,[L([0,0,0],[100,0,0],{amax:opt.wmax||400}),L([0,0,30],[10,0,30],{amin:opt.wmin||0}),L([10,10,30],[90,10,30],{amax:200}),L([90,0,30],[100,0,30],{amin:opt.wmin||0})]);
  m.v=()=>{const v=m.vals();return {W:v.q0,w1:v.q1,G:v.q2,w2:v.q3}};
  return m;
}
const S=m=>{const v=m.v();return [v.W,v.w1,v.G,v.w2].map(x=>+x.toFixed(2))};
console.log('Без галочки: прежняя логика');
{ const m=groove();m.set(2,110);const a=S(m);m.set(2,80);const b=S(m);
  T('паз 110 → ширина 130',near(a[0],130)&&near(a[1],10),a);T('паз обратно 80 → ширина обратно 100',near(b[0],100)&&near(b[1],10),b); }

console.log('С галочкой: пример пользователя (ширина 100 = 10 + 80 + 10)');
{ const m=on(groove());m.set(2,110);let s=S(m);
  T('паз 110: ширина выросла до 130, стенки 10',near(s[0],130)&&near(s[1],10)&&near(s[3],10),s);
  m.set(2,80);s=S(m);
  T('паз вернули на 80: ширина осталась 130, стенки выросли до 25',near(s[0],130)&&near(s[1],25)&&near(s[3],25)&&near(s[2],80),s);
  m.set(2,60);s=S(m);T('паз 60: ширина 130, стенки по 35',near(s[0],130)&&near(s[1],35)&&near(s[3],35),s);
  m.set(2,100);s=S(m);T('паз 100: ширина 130, стенки по 15',near(s[0],130)&&near(s[1],15)&&near(s[3],15),s);
  m.set(2,110);s=S(m);T('паз дошёл до прежнего 110: ширина 130, стенки 10',near(s[0],130)&&near(s[1],10),s);
  m.set(2,120);s=S(m);T('паз больше прежнего: ширина снова растёт вслед (140)',near(s[0],140)&&near(s[1],10),s);
  m.set(2,90);s=S(m);T('паз назад: ширина держится на новом максимуме 140, стенки 25',near(s[0],140)&&near(s[1],25),s);
  m.set(2,200);s=S(m);T('паз сразу далеко: ширина 220, стенки 10',near(s[0],220)&&near(s[1],10)&&near(s[3],10),s); }
{ const m=on(groove());let w=null,prev=100;
  for(const g of [20,150,60,90,140,140,10,100,130,45,200,80,119,121,30,0,160,50]){m.set(2,g);const s=S(m);
    // ширина выросла выше 100 → назад не идёт; пока не выросла — просто сумма
    const want=(prev>100.05&&s[2]+20<prev-.05)?prev:s[2]+20;
    if(!w&&!(near(s[0],want,.1)&&near(s[1],s[3],.1)&&near(s[0],s[1]+s[2]+s[3],.1)&&s[1]>=9.9))w={паз:g,ожидали:want,получили:s};prev=s[0]}
  T('любая серия ходов: ширина выросла — назад не идёт; стенки равны и не меньше 10',!w,w); }
console.log('Размер, который двигают сами, и размер вровень с гранью');
{ const m=on(groove());m.set(2,110);m.set(2,80);m.set(0,120);const s=S(m);
  T('ширину задали сами: 120, сумма участков сходится, удержания нет',near(s[0],120)&&near(s[0],s[1]+s[2]+s[3],.1)&&s[1]>=9.9&&!(m.st.rh&&Object.keys(m.st.rh).length),{s,rh:m.st.rh});
  m.set(2,70);const b=S(m);T('после этого паз не меняет заданную вручную ширину',near(b[0],120),b); }
{ const a=groove(),b=on(groove());a.set(1,5);b.set(1,5);
  T('стенка вровень с гранью ширины: с галочкой то же, что без неё (расстояние 0)',JSON.stringify(S(a))===JSON.stringify(S(b)),[S(a),S(b)]);
  const c=on(groove());c.set(2,110);c.set(2,80);c.set(1,5);const d=groove();d.set(1,5);
  T('и когда до этого было удержание: стенку двигаем — всё как без галочки',JSON.stringify(S(c))===JSON.stringify(S(d)),[S(c),S(d)]);
  c.set(1,10);T('стенку вернули — ширина вернулась на 100',near(S(c)[0],100),S(c)); }

console.log('Нулевое расстояние: паз открыт на грани детали — в обе стороны');
function notch(){
  const pos=voxel([[0,10,90],[0,50],[0,6,30]],(i,j,k)=>!(k===1&&i===1));
  const m=make(C,pos,[L([0,0,0],[90,0,0],{amax:200}),L([0,0,30],[10,0,30]),L([10,10,30],[90,10,30],{amax:200})]);
  m.v=()=>{const v=m.vals();return {W:v.q0,w:v.q1,N:v.q2}};return m;
}
{ const m=on(notch());m.set(2,110);let v=m.v();T('вырез 110: ширина 120',near(v.W,120)&&near(v.w,10),v);
  m.set(2,80);v=m.v();T('вырез назад 80: ширина тоже назад (90) — грань идёт за ним',near(v.W,90)&&near(v.w,10),v);
  m.set(2,50);v=m.v();T('вырез 50: ширина 60',near(v.W,60),v); }
{ const a=notch(),b=on(notch());const w=[];for(const x of [110,80,40,95,200,60]){a.set(2,x);b.set(2,x);if(!near(a.v().W,b.v().W,.01))w.push([x,a.v().W,b.v().W])}
  T('с галочкой и без неё результат одинаковый (расстояние нулевое)',!w.length,w); }

console.log('Длина детали с карманами и стенками (как у пользователя)');
const X5=[0,10,98,108,196,206];
function pockets(opt={}){
  const pos=voxel([X5,[0,50],[0,6,30]],(i,j,k)=>!(k===1&&(i===1||i===3)));
  const m=make(C,pos,[L([0,0,0],[206,0,0],{amax:400}),L([0,0,30],[10,0,30]),L([10,0,30],[98,0,30],{amax:300}),L([98,0,30],[108,0,30]),L([108,0,30],[196,0,30],{amax:300,amin:opt.p2min||0}),L([196,0,30],[206,0,30])]);
  m.v=()=>{const v=m.vals();return {Len:v.q0,w1:v.q1,p1:v.q2,w2:v.q3,p2:v.q4,w3:v.q5}};
  return m;
}
const P=m=>{const v=m.v();return [v.Len,v.w1,v.p1,v.w2,v.p2,v.w3].map(x=>+x.toFixed(2))};
{ const m=on(pockets());D.dmLock(m.st,4,true);m.set(2,120);let s=P(m);
  T('карман 2 под замком: карман 1 растёт, длина растёт до 238',near(s[0],238)&&near(s[4],88)&&near(s[1],10),s);
  m.set(2,88);s=P(m);
  T('карман 1 вернули: длина осталась 238, карман 2 под замком 88',near(s[0],238)&&near(s[2],88)&&near(s[4],88),s);
  T('освободившееся место поровну у стенок (по 20.67), сумма участков равна длине',near(s[1],62/3)&&near(s[3],62/3)&&near(s[5],62/3)&&near(s[1]+s[2]+s[3]+s[4]+s[5],s[0],.1),s);
  m.set(2,130);s=P(m);T('карман 130: длина 248',near(s[0],248),s);
  m.set(2,100);s=P(m);T('карман 100: длина 248 держится',near(s[0],248)&&near(s[4],88),s); }
console.log('Сжатие до предела: длина под замком, карман 1 растёт и сжимает карман 2 до его минимума 56');
{ const m=on(pockets({p2min:56}));D.dmLock(m.st,0,true);m.set(2,120);const a=P(m);
  T('длина под замком 206 не меняется, карман 2 сжался до предела 56',near(a[0],206)&&near(a[4],56)&&near(a[1],10),a);
  m.set(2,88);const b=P(m);
  T('карман 1 вернули: карман 2 остался на пределе 56, длина 206',near(b[4],56)&&near(b[0],206)&&near(b[2],88),{было:a,стало:b});
  T('освободившееся место взяли стенки (по 20.67)',near(b[1],62/3)&&near(b[3],62/3)&&near(b[5],62/3),b);
  T('сумма участков равна длине',near(b[1]+b[2]+b[3]+b[4]+b[5],206,.1),b);
  m.set(4,100);const c=P(m);T('карман 2 двигают сами — он идёт за ползунком, удержание снято',near(c[4],100),c); }
{ const m=pockets({p2min:56});D.dmLock(m.st,0,true);m.set(2,120);m.set(2,88);const b=P(m);
  T('без галочки всё возвращается назад, как раньше',near(b[4],88)&&near(b[1],10),b); }
{ const m=on(pockets());D.dmLock(m.st,0,true);m.set(2,120);const a=P(m);m.set(2,88);const b=P(m);
  T('сжатие не до предела (карман 2 не на минимуме) — возвращается, как раньше',a[4]<87&&near(b[4],88)&&near(b[1],10),{было:a,стало:b}); }
{ const m=on(pockets());m.set(2,120);const a=P(m);m.set(2,88);const b=P(m);
  T('без замков карман 2 принимает сжатие и возвращается (удержания нет)',near(a[0],206)&&near(b[4],88),{a,b}); }

console.log('Замки, пределы, группы');
{ const m=on(groove({wmax:135}));m.set(2,110);m.set(2,80);let s=S(m);T('предел ширины 135: паз 80 — ширина держится 130, стенки 25',near(s[0],130)&&near(s[1],25),s);
  m.set(2,120);s=S(m);T('паз 120: ширина упёрлась в предел 135, стенки сжались до 7.5',s[0]<=135.05&&near(s[1],7.5)&&near(s[3],7.5),s);
  m.set(2,80);s=S(m);T('паз назад 80: ширина осталась 135, стенки по 27.5',near(s[0],135)&&near(s[1],27.5),s); }
{ const m=on(groove({wmin:8}));m.set(2,110);m.set(2,80);m.set(2,150);m.set(2,100);const s=S(m);
  T('минимальная толщина стенки соблюдается',s[1]>=7.9&&s[3]>=7.9&&near(s[0],s[1]+s[2]+s[3],.1),s); }
{ const m=on(pockets());[1,3,5].forEach(q=>m.st.dm[q].g=1);D.dmLock(m.st,4,true);m.set(2,120);m.set(2,88);const s=P(m);
  T('стенки в группе синхронизации и карман 2 под замком: после возврата кармана стенки равны, длина 238',near(s[1],s[3])&&near(s[3],s[5])&&near(s[0],238),s);
  T('сумма участков равна длине',near(s[1]+s[2]+s[3]+s[4]+s[5],s[0],.1),s); }
console.log('Выключение галочки');
{ const m=on(groove());m.set(2,110);m.set(2,80);let s=S(m);
  D.dmOw?D.dmOw(m.st,false):(m.st.ow=0);const a=S(m);T('выключили: удержание снято, ширина 100',near(a[0],100)&&near(a[1],10),{до:s,после:a});
  m.set(2,110);m.set(2,80);const b=S(m);T('дальше работает прежняя логика',near(b[0],100),b);
  T('в состоянии не осталось следов',!m.st.ow&&!m.st.rh,{ow:m.st.ow,rh:m.st.rh}); }
{ const m=on(groove());m.set(2,110);m.set(2,80);const st=JSON.parse(JSON.stringify(m.st)),W=m.apply(),W2=m.apply(st);
  T('состояние с удержанием переносится через JSON (файл модели)',W.every((x,i)=>x===W2[i])&&st.ow===1,{ow:st.ow});
  const m2=groove();m2.st=st;m2.set(2,100);const s=S(m2);T('и после загрузки удержание продолжает работать',near(s[0],130),s); }

console.log('Одна и та же серия ходов: без галочки = прежний движок');
if(OLD){
  const mk=(C0)=>{const pos=voxel([X5,[0,50],[0,6,30]],(i,j,k)=>!(k===1&&(i===1||i===3)));return make(C0,pos,[L([0,0,0],[206,0,0],{amax:400}),L([0,0,30],[10,0,30]),L([10,0,30],[98,0,30],{amax:300}),L([98,0,30],[108,0,30]),L([108,0,30],[196,0,30],{amax:300}),L([196,0,30],[206,0,30])])};
  let s=7;const rnd=()=>(s=(s*48271)%2147483647)/2147483647;let diff=0;
  for(let t=0;t<30;t++){const a=mk(C),b=mk(OLD);for(let i=0;i<25;i++){const q=Math.floor(rnd()*6),x=rnd()*200+5;a.set(q,x);b.set(q,x);const va=a.vals(),vb=b.vals();if(Object.keys(va).some(k=>Math.abs(va[k]-vb[k])>1e-6))diff++}}
  T('без галочки результат совпадает с v23 на 750 ходов',diff===0,diff);
}

// ---------- случайные проверки: деталь не ломается ----------
function random(seed,flag){
  let s=seed;const rnd=()=>(s=(s*48271)%2147483647)/2147483647,pick=a=>a[Math.floor(rnd()*a.length)];
  const res={moves:0,holds:0,broke:0,lock:0,flip:0,limit:0,sum:0,pin:0,crash:0,first:null};
  for(let t=0;t<50;t++){
    const w=6+Math.floor(rnd()*10),p1=25+Math.floor(rnd()*50),p2=25+Math.floor(rnd()*50),d=20+Math.floor(rnd()*30);
    const X=[0,w,w+p1,2*w+p1,2*w+p1+p2,3*w+p1+p2],Y=[0,w,w+d,2*w+d];
    const pos=voxel([X,Y,[0,6,30]],(i,j,k)=>!(k===1&&i%2===1&&j===1));
    const ann=[L([0,0,0],[X[5],0,0],{amax:X[5]+20+rnd()*120}),L([0,0,0],[0,Y[3],0],{amax:Y[3]+10+rnd()*80}),
      L([0,0,30],[X[1],0,30]),L([X[2],0,30],[X[3],0,30]),L([X[4],0,30],[X[5],0,30]),L([0,0,30],[0,Y[1],30]),L([0,Y[2],30],[0,Y[3],30]),
      L([X[1],Y[1],30],[X[2],Y[1],30]),L([X[3],Y[1],30],[X[4],Y[1],30]),L([X[1],Y[1],30],[X[1],Y[2],30])];
    try{
      const m=make(C,pos,ann,[]),st=m.st,n=st.dm.length;
      if(flag)D.dmOw(st,true);
      if(rnd()<.4)[2,3,4].forEach(q=>st.dm[q].g=1);
      if(rnd()<.3)[7,8].forEach(q=>st.dm[q].pg=1);
      if(rnd()<.5)D.dmLock(st,pick([7,8,9,0,1,3,4]),true);
      for(let step=0;step<30;step++){
        if(rnd()<.08){const q=Math.floor(rnd()*n);if(st.dm[q].sk)D.dmLock(st,q,!(st.lk&&st.lk[q]))}
        if(rnd()<.04){const q=Math.floor(rnd()*n);if(st.dm[q].sk)D.dmPin(st,q,!(st.cp&&st.cp[q]!==undefined))}
        const P=C.geoParams({...m.g,st}).filter(p=>p.kind==='dq'),p=pick(P);
        const v0=m.vals(),lk=Object.keys(st.lk||{}).map(Number),G=st.dm[p.i];
        const fam=new Set([p.i]);let more=true;while(more){more=false;st.dm.forEach((x,q)=>{if(!fam.has(q)&&[...fam].some(f=>(st.dm[f].g&&x.g===st.dm[f].g)||(st.dm[f].pg&&x.pg===st.dm[f].pg))){fam.add(q);more=true}})}
        const want=p.min+rnd()*(p.max-p.min);C.geoSet(m.g,st,p.key,want);res.moves++;
        if(st.rh&&Object.keys(st.rh).length)res.holds++;
        const v=m.vals(),note={t,step,ход:p.key,замки:lk,rh:st.rh&&Object.keys(st.rh)};
        const locks=lk.some(q=>!fam.has(q)&&!near(v['q'+q],v0['q'+q],.03));
        const flip=D.dmSkSolve(st).c.some(c=>c.by.some((x,i)=>i&&x-c.by[i-1]<-1e-3));
        const over=st.dm.some((x,q)=>v['q'+q]>Math.max(x.mx,x.v0)+.03||v['q'+q]<Math.min(x.mn,x.v0)-.03);
        const grp=[[2,3,4]].some(L2=>st.dm[2].g&&L2.some(q=>Math.abs(v['q'+q]-v['q2'])>.03));
        // длина по оси X равна сумме участков
        const sumX=D.dmSkSolve(st).c.filter(c=>c.ax===0).every(c=>Math.abs((c.by[c.by.length-1]-c.by[0])-v.q0)<.05||st.dm[0].sk===undefined);
        if(locks)res.lock++;if(flip)res.flip++;if(over)res.limit++;if(grp)res.broke++;if(!sumX)res.sum++;
        if((locks||flip||over||grp||!sumX)&&!res.first)res.first={...note,locks,flip,over,grp,sumX};
        if(locks||flip||over||grp||!sumX)break;
      }
    }catch(e){res.crash++;if(!res.first)res.first=String(e.stack).slice(0,400)}
  }
  return res;
}
console.log('Случайные детали с галочкой: замки, пределы, группы, суммы');
for(const seed of process.argv[2]?[+process.argv[2]]:[1,2,3,4,5,6]){
  const r=random(seed,true);if(process.env.STAT)console.log('   ходов',r.moves,'с удержанием',r.holds);
  T(`seed ${seed}: ${r.moves} ходов, деталь целая (с удержаниями ${r.holds})`,!(r.lock||r.flip||r.limit||r.broke||r.sum||r.crash)&&r.holds>0,{lock:r.lock,flip:r.flip,limit:r.limit,broke:r.broke,sum:r.sum,crash:r.crash,holds:r.holds,первый:r.first});
}
console.log(`\nИтого: пройдено ${ok}, ошибок ${bad}`);
