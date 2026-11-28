const {load,out,voxel,box2,holePlate,L,make}=require('./lib');
const C=load(out+'Конвертер-OBJ-HTML.html'),OLD=load('old-converter.html');
let pass=0,fail=0;const ok=(name,cond,info='')=>{cond?pass++:fail++;console.log((cond?'  ОК     ':'  ОШИБКА ')+name+(cond?'':'  → '+info))};
const planes=(W,a)=>[...new Set([...W].filter((_,k)=>k%3===a).map(x=>+x.toFixed(2)))].sort((x,y)=>x-y).map(v=>v);
const rel=(W,a)=>{const p=planes(W,a);return p.map(v=>+(v-p[0]).toFixed(1)).join(' ')};
const W0=L([0,0,0],[120,0,0]),P1=L([12,12,30],[54,12,30]),P2=L([66,12,30],[108,12,30]),S1=L([0,0,30],[12,0,30]),H=L([0,0,0],[0,0,30]),DY=L([0,0,0],[0,70,0]);
console.log('Сценарии: коробка с двумя пазами');
const sc=(name,ann,moves,exp,ax=0)=>{const m=make(C,box2(),ann);moves.forEach(([i,v])=>m.set(i,v));const got=rel(m.apply(),ax);ok(name,got===exp,'получено '+got+', ожидалось '+exp)};
sc('только ширина 150: стенки 12',[W0],[[0,150]],'0 12 69 81 138 150');
sc('только ширина 90 (сжатие)',[W0],[[0,90]],'0 12 39 51 78 90');
sc('паз 1 = 60, ширина сохраняется',[W0,P1],[[1,60]],'0 12 72 84 108 120');
sc('только паз 1 = 60, деталь растёт',[P1],[[0,60]],'0 12 72 84 126 138');
sc('стенка 20, ширина сохраняется',[W0,S1],[[1,20]],'0 20 58 70 108 120');
sc('два паза по 50',[P1,P2],[[0,50],[1,50]],'0 12 62 74 124 136');
sc('глубина по Y 100',[DY],[[0,100]],'0 12 88 100',1);
console.log('Надёжность: 3000 случайных движений ползунков');
const sets=[[W0],[W0,P1],[P1,P2],[W0,P1,P2],[W0,S1],[W0,P1,S1,DY],[W0,P1,P2,S1,L([54,12,30],[66,12,30]),L([108,0,30],[120,0,30])]];
let seed=7;const rnd=()=>(seed=(seed*48271)%2147483647)/2147483647;
let bad={finite:0,flip:0,miss:0,lie:0},worst=0,worstInfo='',moves=0;
const tri=(W,I,t)=>{const p=k=>[0,1,2].map(a=>W[I[t+k]*3+a]),a=p(0),b=p(1),c=p(2),u=b.map((v,i)=>v-a[i]),w=c.map((v,i)=>v-a[i]);return[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]]};
for(const ann of sets){const m=make(C,box2(),ann);for(let n=0;n<3000/sets.length;n++){const i=Math.floor(rnd()*ann.length),[lo,hi]=m.range(i),v=lo+rnd()*(hi-lo);m.set(i,v);moves++;const W=m.apply();
 if(![...W].every(Number.isFinite))bad.finite++;
 for(let t=0;t<m.c.I.length;t+=3){const a=tri(m.c.U,m.c.I,t),b=tri(W,m.c.I,t);if(a[0]*b[0]+a[1]*b[1]+a[2]*b[2]<=0){bad.flip++;break}}
 const vals=m.vals();const e=Math.abs(vals['q'+i]-v);if(e>worst){worst=e;worstInfo=`набор ${sets.indexOf(ann)+1}, ползунок ${i}: просили ${v.toFixed(2)}, получили ${vals['q'+i].toFixed(2)}`}if(e>0.05)bad.miss++;
 // значение ползунка соответствует реальной геометрии
 m.st.dm.forEach((s,q)=>{if(!s.sk)return;const ax=s.d.findIndex(x=>x);const S=m.st.sk.s[ax];let A,B;for(let k=ax;k<W.length;k+=3){if(Math.abs(m.c.U[k]-S[s.sk[0]])<.01)A=W[k];if(Math.abs(m.c.U[k]-S[s.sk[1]])<.01)B=W[k]}if(Math.abs((B-A)-vals['q'+q])>.05)bad.lie++});}}
ok('нет «битых» координат',!bad.finite,bad.finite);ok('грани не выворачиваются',!bad.flip,bad.flip+' раз из '+moves);
ok('двигаемый ползунок получает заданное значение (±0.05 мм)',!bad.miss,bad.miss+' раз из '+moves+'; худший: '+worstInfo);
ok('число на ползунке совпадает с геометрией',!bad.lie,bad.lie);
{const m=make(C,box2(),sets[6]);m.set(0,150);m.set(1,30);m.st.dv=m.st.dm.map(s=>s.v0);m.st.last=undefined;const W=m.apply();ok('«Исходные размеры» возвращают исходную форму',W.every((v,k)=>Math.abs(v-m.c.U[k])<1e-3))}
console.log('Отверстие');
for(const w of[40,100,200]){const m=make(C,holePlate(),[L([0,0,0],[60,0,0])]);m.set(0,w);const W=m.apply();let x=[1e9,-1e9],y=[1e9,-1e9],X=[1e9,-1e9];for(let i=0;i<W.length;i+=3){X=[Math.min(X[0],W[i]),Math.max(X[1],W[i])];if(Math.abs(Math.hypot(m.c.U[i]-20,m.c.U[i+1]-20)-5)<.01){x=[Math.min(x[0],W[i]),Math.max(x[1],W[i])];y=[Math.min(y[0],W[i+1]),Math.max(y[1],W[i+1])]}}
 ok(`ширина ${w}: отверстие круглое Ø10`,Math.abs(x[1]-x[0]-10)<.02&&Math.abs(y[1]-y[0]-10)<.02&&Math.abs(X[1]-X[0]-w)<.05,`ширина ${(X[1]-X[0]).toFixed(2)}, Ø ${(x[1]-x[0]).toFixed(2)}×${(y[1]-y[0]).toFixed(2)}`)}
console.log('Старое поведение не сломано (диаметр, угол, наклонный размер)');
for(const[name,pos,ann,v]of[['диаметр',holePlate(),[{type:'diameter',points:[[20,20,5],[25,20,5]],normal:[0,0,1]}],14],['наклонный размер',box2(),[L([0,0,0],[120,70,0])],160],['угол',box2(),[{type:'angle',points:[[0,0,0],[120,0,0],[0,70,0]]}],100]]){
 const a=make(C,pos,ann),b=make(OLD,pos,ann);a.set(0,v);b.set(0,v);const A=a.apply(),B=b.apply();ok(name+': результат как в старой версии',a.r.dm.length===1&&A.every((x,i)=>Math.abs(x-B[i])<1e-4))}
console.log(`\nИтого: пройдено ${pass}, ошибок ${fail}`);
