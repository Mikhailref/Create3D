const {read,blk,load,out,voxel,box2,L,make}=require('./lib');
const C=load(out+'Конвертер-OBJ-HTML.html');
const E=new Function(blk(read(out+'Конвертер-OBJ-HTML.html'),'core-src')+';return {dmLock}')();
let pass=0,fail=0;const ok=(name,cond,info='')=>{cond?pass++:fail++;console.log((cond?'  ОК     ':'  ОШИБКА ')+name+(cond?'':'  → '+info))};
const W0=()=>L([0,0,0],[120,0,0]),P1=(x)=>L([12,12,30],[54,12,30],x),S1=(x)=>L([0,0,30],[12,0,30],x),DY=()=>L([0,0,0],[0,70,0]);
const comp=(members,x={})=>({name:'Паз+стенка',members,amin:10,amax:300,...x});
const set=(m,key,v)=>C.geoSet(m.g,m.st,key,v);
const v=(m,k)=>+m.vals()[typeof k==='number'?'q'+k:k].toFixed(2);
const params=m=>C.geoParams({...m.g,st:m.st});
const planes=(W,a=0)=>{const p=[...new Set([...W].filter((_,k)=>k%3===a).map(x=>+x.toFixed(2)))].sort((x,y)=>x-y);return p.map(x=>+(x-p[0]).toFixed(1))};
const near=(a,b,e=.05)=>Math.abs(a-b)<=e;
console.log('Составной размер: паз 42 + стенка 12');
const mk=(c=[comp([1,2])],px,sx,extra=[])=>make(C,box2(),[W0(),P1(px),S1(sx),...extra],c);
{const m=mk(),p=params(m).find(p=>p.key==='c0');ok('появился ползунок суммы 54 с названием',p&&near(p.def,54)&&p.lab.ru==='Паз+стенка'&&p.min===10&&p.max===300,JSON.stringify(p));
 set(m,'c0',81);ok('×1.5: паз 63, стенка 18, сумма 81',near(v(m,1),63)&&near(v(m,2),18)&&near(v(m,'c0'),81),`${v(m,1)} ${v(m,2)} ${v(m,'c0')}`);
 const x=planes(m.apply());ok('модель совпадает с числами',near(x[1]-x[0],18,.1)&&near(x[2]-x[1],63,.1),x.join(' '));
 set(m,'c0',27);ok('×0.5: паз 21, стенка 6',near(v(m,1),21)&&near(v(m,2),6),`${v(m,1)} ${v(m,2)}`);
 for(let t=27;t<=120;t+=3.3)set(m,'c0',t);set(m,'c0',54);ok('после многих движений назад к 54 — исходные 42 и 12',near(v(m,1),42)&&near(v(m,2),12),`${v(m,1)} ${v(m,2)}`)}
{const m=mk();m.set(1,60);ok('отдельный ползунок паза работает и меняет сумму',near(v(m,1),60)&&near(v(m,2),12)&&near(v(m,'c0'),72),`${v(m,1)} ${v(m,2)} ${v(m,'c0')}`);
 set(m,'c0',90);ok('составной берёт пропорцию от фактических размеров 60 и 12',near(v(m,1),75)&&near(v(m,2),15),`${v(m,1)} ${v(m,2)}`)}
{const m=mk([comp([1,2],{amin:40,amax:70})]);set(m,'c0',500);const a=v(m,'c0');set(m,'c0',1);ok('границы «от/до» составного соблюдаются',near(a,70)&&near(v(m,'c0'),40),`${a} ${v(m,'c0')}`)}
{const m=mk(undefined,undefined,{amax:15});set(m,'c0',200);ok('предел входящего размера (стенка ≤15) останавливает всю пару',near(v(m,2),15)&&near(v(m,1),52.5),`${v(m,1)} ${v(m,2)}`)}
{const m=mk();E.dmLock(m.st,0,true);set(m,'c0',300);ok('замок на габарите: ширина 120, пропорция 3.5 сохранена',near(v(m,0),120)&&near(v(m,1)/v(m,2),3.5,.02)&&v(m,'c0')>60&&v(m,'c0')<120,`${v(m,0)} ${v(m,1)} ${v(m,2)}`);
 const x=planes(m.apply());ok('при упоре модель цела и ширина 120',near(x[x.length-1],120,.1)&&x.length===6,x.join(' '));
 const r=C.geoRange(m.g,m.st,params(m).find(p=>p.key==='c0'));ok('диапазон составного ползунка сузился до достижимого',r[1]<130&&r[1]>=v(m,'c0')-.1,r.join(' '));
 set(m,'c0',54);ok('и назад к исходным 42 и 12',near(v(m,1),42)&&near(v(m,2),12),`${v(m,1)} ${v(m,2)}`)}
{const m=mk();E.dmLock(m.st,1,true);set(m,'c0',70);ok('паз под замком: составной меняет только стенку',near(v(m,1),42)&&near(v(m,2),28)&&near(v(m,'c0'),70),`${v(m,1)} ${v(m,2)}`);
 E.dmLock(m.st,2,true);set(m,'c0',100);ok('оба под замком: составной не двигается',near(v(m,1),42)&&near(v(m,2),28),`${v(m,1)} ${v(m,2)}`)}
{const m=mk();set(m,'c0',70);const a=m.apply();E.dmLock(m.st,0,true);const b=m.apply();E.dmLock(m.st,0,false);const c=m.apply();
 ok('установка и снятие замка после составного не дёргают модель',planes(a).join()===planes(b).join()&&planes(a).join()===planes(c).join(),planes(a)+' / '+planes(c))}
{const m=mk([comp([1,2])],{param:false},{param:false});const k=params(m).map(p=>p.key);ok('ползунки входящих выключены — есть только составной',k.join()==='q0,c0',k.join());
 set(m,'c0',81);const x=planes(m.apply());ok('и он меняет оба скрытых размера',near(x[1],18,.1)&&near(x[2]-x[1],63,.1),x.join(' '))}
{const m=mk([comp([1])]);ok('один размер в составе — ползунка нет, есть пометка',!m.st.cm&&m.r.skipped.some(s=>/меньше двух/.test(s)),m.r.skipped.join())}
{const m=mk([comp([1,3])],undefined,undefined,[DY()]);set(m,'c0',(42+70)*1.2);ok('составной по двум осям (X и Y)',near(v(m,1),50.4)&&near(v(m,3),84),`${v(m,1)} ${v(m,3)}`)}
{const m=mk([comp([1,2]),comp([1,0],{name:''})]);ok('два составных, у второго название по умолчанию',m.st.cm.length===2&&m.st.cm[1].lab.ru==='Составной размер 2'&&m.st.cm[1].lab.en==='Combined size 2');
 set(m,'c0',70);const s=v(m,'c1');ok('второй составной показывает свою сумму',near(s,v(m,0)+v(m,1)),s);set(m,'c1',s*1.1);ok('и меняет свои размеры пропорционально',near(v(m,'c1'),s*1.1,.1),v(m,'c1'))}
{const m=make(C,box2(),[W0(),P1(),S1(),L([66,12,30],[108,12,30],{syncGroup:1}),],[comp([1,2])]);m.st.dm[1].g=1;set(m,'c0',45);ok('связанный (синхронный) размер следует за входящим',near(v(m,1),v(m,3))&&near(v(m,1),35),`${v(m,1)} ${v(m,3)}`)}
{const m=mk();set(m,'c0',81);const st=JSON.parse(JSON.stringify(m.st)),a=m.apply(),b=m.apply(st);ok('составной сохраняется в файле модели',a.every((x,i)=>x===b[i])&&st.cm[0].m.join()==='1,2')}
console.log('Случайные детали с составными размерами');
for(const first of[7,123,4567]){
 let seed=first;const rnd=()=>(seed=(seed*48271)%2147483647)/2147483647,int=(a,b)=>a+Math.floor(rnd()*(b-a+1));
 const bad={finite:0,flip:0,lie:0,locked:0,ratio:0,jump:0,crash:0};let moves=0,cms=0,parts=0;
 for(let p=0;p<600;p++){try{
  const Gd=[0,1,2].map(()=>{const a=[0];for(let i=0,n=int(3,5);i<n;i++)a.push(a[i]+int(5,40));return a});
  const holes=new Set();for(let h=int(1,3);h--;)holes.add(int(1,Gd[0].length-3)+','+int(1,Gd[1].length-3));
  const pos=voxel(Gd,(i,j,k)=>!(k===Gd[2].length-2&&holes.has(i+','+j)));
  const ann=[];for(let n=int(3,5);n--;){const a=int(0,2),S=Gd[a],i=int(0,S.length-2),j=int(i+1,S.length-1),P=[0,0,0],Q=[0,0,0];P[a]=S[i];Q[a]=S[j];ann.push(L(P,Q,{amax:600,param:rnd()<.85}))}
  const ids=ann.map((_,i)=>i).sort(()=>rnd()-.5).slice(0,int(2,3));
  const m=make(C,pos,ann,[comp(ids,{amin:1,amax:2000})]);if(!m.r.dm.length||!m.r.dm.every(d=>d.sk)||!m.st.cm)continue;parts++;const exp={};
  const size=W=>m.st.dm.map(s=>{const ax=s.d.findIndex(x=>x),S=m.st.sk.s[ax];let A,B;for(let k=ax;k<W.length;k+=3){if(Math.abs(m.c.U[k]-S[s.sk[0]])<.01)A=W[k];if(Math.abs(m.c.U[k]-S[s.sk[1]])<.01)B=W[k]}return B-A});
  const shape=W=>Array.from(W,(x,k)=>x-W[k%3]);
  let basis=null;
  for(let n=0;n<30;n++){const r=rnd();
   if(r<.15){const i=int(0,m.r.dm.length-1),on=!(m.st.lk&&m.st.lk[i]),A=shape(m.apply()),vals=m.vals(),val=C.geoVals(m.g,m.st);if(!E.dmLock(m.st,i,on))continue;basis=null;
    const B=shape(m.apply());if(A.some((x,k)=>Math.abs(x-B[k])>.02))bad.jump++;const now=m.st.dm.map((s,q)=>size(m.apply())[q]);if(on)exp[i]=now[i];else delete exp[i];}
   else if(r<.55){const free=m.st.cm[0].m.filter(j=>!(j in exp)),before=size(m.apply());if(!basis)basis=free.map(j=>before[j]);const total=m.st.cm[0].m.reduce((t,j)=>t+before[j],0);
    set(m,'c0',total*(.4+rnd()*1.6));cms++;const after=size(m.apply());
    if(free.length>1){const f=free.map((j,x)=>after[j]/basis[x]);if(Math.max(...f)-Math.min(...f)>.02)bad.ratio++}}
   else{const vis=m.st.dm.map((s,i)=>s.hid?-1:i).filter(i=>i>=0);if(!vis.length)continue;const i=vis[int(0,vis.length-1)],s=m.st.dm[i];let[lo,hi]=m.range(i);lo=Math.max(lo,s.mn);hi=Math.min(hi,s.mx);m.set(i,lo+rnd()*Math.max(0,hi-lo));moves++;basis=null;if(i in exp)exp[i]=size(m.apply())[i];}
   const W=m.apply();if(![...W].every(Number.isFinite))bad.finite++;
   const vals=m.vals(),real=size(W);m.st.dm.forEach((s,q)=>{if(!s.hid&&Math.abs(real[q]-vals['q'+q])>.05)bad.lie++});
   if(Math.abs(vals.c0-m.st.cm[0].m.reduce((t,j)=>t+real[j],0))>.1)bad.lie++;
   for(const q in exp)if(Math.abs(real[q]-exp[q])>.05){bad.locked++;exp[q]=real[q]}
   const t=(X,o)=>{const g=k=>[0,1,2].map(a=>X[m.c.I[o+k]*3+a]),a=g(0),b=g(1),c=g(2),u=b.map((x,k)=>x-a[k]),w=c.map((x,k)=>x-a[k]);return[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]]};
   for(let o=0;o<m.c.I.length;o+=3){const a=t(m.c.U,o),b=t(W,o);if(a[0]*b[0]+a[1]*b[1]+a[2]*b[2]<=0){bad.flip++;break}}
  }}catch(e){bad.crash++;if(bad.crash<3)console.log(e.stack)}}
 const {ratio,...hard}=bad;
 ok(`набор ${first}: деталей ${parts}, движений ${moves}, составных ${cms} — без поломок, замки держатся`,Object.values(hard).every(x=>!x),JSON.stringify(bad));
 ok(`набор ${first}: пропорция внутри составного сохраняется`,!ratio,ratio+' из '+cms);
}
console.log(`\nИтого: пройдено ${pass}, ошибок ${fail}`);
