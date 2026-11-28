const {read,blk,load,out,voxel,box2,L,make}=require('./lib');
const C=load(out+'Конвертер-OBJ-HTML.html');
const E=new Function(blk(read(out+'Конвертер-OBJ-HTML.html'),'core-src')+';return {dmLock,dmSet}')();
let pass=0,fail=0;const ok=(name,cond,info='')=>{cond?pass++:fail++;console.log((cond?'  ОК     ':'  ОШИБКА ')+name+(cond?'':'  → '+info))};
const rel=(W,a)=>{const p=[...new Set([...W].filter((_,k)=>k%3===a).map(x=>+x.toFixed(2)))].sort((x,y)=>x-y);return p.map(v=>+(v-p[0]).toFixed(1)).join(' ')};
const W0=L([0,0,0],[120,0,0]),P1=L([12,12,30],[54,12,30]),P2=L([66,12,30],[108,12,30]),S1=L([0,0,30],[12,0,30]),DY=L([0,0,0],[0,70,0]);
const v=(m,i)=>+m.vals()['q'+i].toFixed(2);
const lock=(m,i,on=true)=>E.dmLock(m.st,i,on);
console.log('Замки: коробка с двумя пазами');
{const m=make(C,box2(),[W0,P1]);m.set(1,150);const free=v(m,0);ok('без замка большой паз раздвигает габарит',free>121,'ширина '+free)}
{const m=make(C,box2(),[W0,P1]);lock(m,0);m.set(1,150);const s=v(m,1);ok('замок на габарите: паз упирается, ширина 120',v(m,0)===120&&s>80&&s<120,`ширина ${v(m,0)}, паз ${s}`);
 const r=m.range(1);ok('диапазон ползунка паза сузился',Math.abs(r[1]-s)<.05,r.join(' '));
 m.set(0,160);ok('свой ползунок меняет размер под замком',v(m,0)===160,v(m,0));m.set(1,20);ok('после этого держится новое значение 160',v(m,0)===160&&v(m,1)===20,`${v(m,0)} ${v(m,1)}`);
 const before=rel(m.apply(),0);lock(m,0,false);ok('снятие замка не дёргает модель',rel(m.apply(),0)===before&&v(m,0)===160&&v(m,1)===20,before+' / '+rel(m.apply(),0));
 lock(m,0);ok('установка замка не дёргает модель',rel(m.apply(),0)===before);}
{const m=make(C,box2(),[W0,P1]);lock(m,0);m.set(1,150);const sh=rel(m.apply(),0),p=v(m,1);lock(m,0,false);ok('после упора в замок и снятия замка паз не «выстреливает»',v(m,1)===p&&v(m,0)===120&&rel(m.apply(),0)===sh,`${v(m,0)} ${v(m,1)}`);
 m.set(1,150);ok('без замка тот же ползунок снова растит деталь',v(m,0)>121&&v(m,1)===150,`${v(m,0)} ${v(m,1)}`)}
{const m=make(C,box2(),[W0,S1]);lock(m,1);m.set(0,200);ok('замок на стенке 12: при ширине 200 стенка 12',v(m,0)===200&&v(m,1)===12,`${v(m,0)} ${v(m,1)}`)}
{const m=make(C,box2(),[W0,P1,P2]);lock(m,2);lock(m,0);m.set(1,60);m.set(1,200);ok('два замка: ширина и паз 2 не меняются',v(m,0)===120&&v(m,2)===42,`${v(m,0)} ${v(m,1)} ${v(m,2)}`)}
{const m=make(C,box2(),[P1,DY]);lock(m,0);m.set(1,100);ok('движение по другой оси не трогает замок',v(m,0)===42&&v(m,1)===100)}
{const m=make(C,box2(),[W0,P1,DY]);m.set(0,90);m.set(1,60);const a=rel(m.apply(),0);m.set(2,100);ok('без замков: ползунок по Y не меняет ось X',rel(m.apply(),0)===a,a+' / '+rel(m.apply(),0))}
{const m=make(C,box2(),[W0,P1,P2]);m.st.dm[1].g=m.st.dm[2].g='A';lock(m,2);m.set(1,50);ok('связанная группа: участник группы отменяет замок, размер под замком следует',v(m,1)===50&&v(m,2)===50&&m.st.lk[2]===1,`${v(m,1)} ${v(m,2)}`)}
{const m=make(C,box2(),[W0,P1]);lock(m,0);m.set(1,60);const st=JSON.parse(JSON.stringify(m.st)),W=m.apply(),W2=m.apply(st);ok('замок сохраняется в файле модели',W.every((x,i)=>x===W2[i])&&st.lk[0]===1)}
{const m=make(C,box2(),[W0,P1]);m.set(0,150);ok('замок только у размеров каркаса',E.dmLock(m.st,0,true)===true&&E.dmLock(m.st,7,true)===false)}
console.log('Случайные детали: замки ставятся и снимаются на ходу');
for(const first of[3,41,777,4567,90210]){
 let seed=first;const rnd=()=>(seed=(seed*48271)%2147483647)/2147483647,int=(a,b)=>a+Math.floor(rnd()*(b-a+1));
 const bad={finite:0,flip:0,lie:0,locked:0,jump:0,range:0,crash:0};let moves=0,toggles=0;
 for(let p=0;p<150;p++){try{
  const Gd=[0,1,2].map(()=>{const a=[0];for(let i=0,n=int(3,5);i<n;i++)a.push(a[i]+int(5,40));return a});
  const holes=new Set();for(let h=int(1,3);h--;)holes.add(int(1,Gd[0].length-3)+','+int(1,Gd[1].length-3));
  const pos=voxel(Gd,(i,j,k)=>!(k===Gd[2].length-2&&holes.has(i+','+j)));
  const ann=[];for(let n=int(2,5);n--;){const a=int(0,2),S=Gd[a],i=int(0,S.length-2),j=int(i+1,S.length-1),P=[0,0,0],Q=[0,0,0];P[a]=S[i];Q[a]=S[j];ann.push(L(P,Q,{amax:600}))}
  const m=make(C,pos,ann);if(!m.r.dm.length||!m.r.dm.every(d=>d.sk))continue;const exp={};
  const size=W=>{const o=[];m.st.dm.forEach(s=>{const ax=s.d.findIndex(x=>x),S=m.st.sk.s[ax];let A,B;for(let k=ax;k<W.length;k+=3){if(Math.abs(m.c.U[k]-S[s.sk[0]])<.01)A=W[k];if(Math.abs(m.c.U[k]-S[s.sk[1]])<.01)B=W[k]}o.push(B-A)});return o};
  // форма целиком: расстояния от первой вершины
  const shape=W=>Array.from(W,(x,k)=>x-W[k%3]);
  for(let n=0;n<40;n++){
   if(rnd()<.25){const i=int(0,m.r.dm.length-1),on=!(m.st.lk&&m.st.lk[i]),A=shape(m.apply()),vals=m.vals();lock(m,i,on);toggles++;
    const B=shape(m.apply());if(A.some((x,k)=>Math.abs(x-B[k])>.02))bad.jump++;if(on)exp[i]=vals['q'+i];else delete exp[i];}
   else{const i=int(0,m.r.dm.length-1),s=m.st.dm[i];let[lo,hi]=m.range(i);lo=Math.max(lo,s.mn);hi=Math.min(hi,s.mx);const w=lo+rnd()*Math.max(0,hi-lo);m.set(i,w);moves++;
    const got=m.vals()['q'+i];if(Math.abs(got-w)>.05&&Object.keys(exp).length)bad.range++;if(i in exp)exp[i]=got;}
   const W=m.apply();if(![...W].every(Number.isFinite))bad.finite++;
   const vals=m.vals(),real=size(W);m.st.dm.forEach((s,q)=>{if(Math.abs(real[q]-vals['q'+q])>.05)bad.lie++});
   for(const q in exp)if(Math.abs(vals['q'+q]-exp[q])>.05){bad.locked++;exp[q]=vals['q'+q]}
   const t=(X,o)=>{const g=k=>[0,1,2].map(a=>X[m.c.I[o+k]*3+a]),a=g(0),b=g(1),c=g(2),u=b.map((x,k)=>x-a[k]),w=c.map((x,k)=>x-a[k]);return[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]]};
   for(let o=0;o<m.c.I.length;o+=3){const a=t(m.c.U,o),b=t(W,o);if(a[0]*b[0]+a[1]*b[1]+a[2]*b[2]<=0){bad.flip++;break}}
  }}catch(e){bad.crash++;if(bad.crash<3)console.log(e.stack)}}
 const {range,...hard}=bad;
 ok(`набор ${first}: ${moves} движений, ${toggles} замков — замки держатся, без скачков и поломок`,Object.values(hard).every(x=>!x),JSON.stringify(bad));
 ok(`набор ${first}: ползунок получает значение из своего диапазона`,!range,range+' раз');
}
console.log(`\nИтого: пройдено ${pass}, ошибок ${fail}`);
