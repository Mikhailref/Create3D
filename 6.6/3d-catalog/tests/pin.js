// фиксатор центра, порядок карточек, настройки составных
const {read,blk,out,voxel,box2,L,make,load}=require('./lib');
const F=out+'Конвертер-OBJ-HTML.html',C=load(F);
const E=new Function(blk(read(F),'core-src')+';return {dmLock,dmPin,dmPinReset,dmViewFix,dmSkSolve,dmBuild,geoParams}')();
let pass=0,fail=0;const ok=(n,c,i='')=>{c?pass++:fail++;console.log((c?'  ОК     ':'  ОШИБКА ')+n+(c?'':'  → '+i))};
const v=(m,k)=>+m.vals()[k].toFixed(2),near=(a,b,e=.05)=>Math.abs(a-b)<=e,set=(m,k,x)=>C.geoSet(m.g,m.st,k,x);
// положение краёв размера на оси после деформации (в координатах детали)
const ends=(m,q)=>{const s=m.st.dm[q],ax=s.d.findIndex(x=>x),W=m.apply(),S=m.st.sk.s[ax];let a,b;for(let k=ax;k<W.length;k+=3){if(Math.abs(m.c.U[k]-S[s.sk[0]])<.01)a=W[k];if(Math.abs(m.c.U[k]-S[s.sk[1]])<.01)b=W[k]}return [a,b]};
const mid=(m,q)=>{const e=ends(m,q);return (e[0]+e[1])/2};
const W0=L([0,0,0],[120,0,0]),P1=L([12,12,30],[54,12,30]),P2=L([66,12,30],[108,12,30]),S1=L([0,0,30],[12,0,30]);
console.log('Фиксатор центра');
{const m=make(C,box2(),[W0,P1,P2]);const c=mid(m,1);E.dmPin(m.st,1,true);set(m,'q0',180);ok('ширина растёт — центр паза на месте',v(m,'q0')===180&&near(mid(m,1),c),`${v(m,'q0')} центр ${mid(m,1)} было ${c}`);
 ok('без замка сам паз может меняться вслед за шириной',v(m,'q1')>42.5,v(m,'q1'));
 set(m,'q1',60);ok('свой ползунок: паз растёт в обе стороны от центра',v(m,'q1')===60&&near(mid(m,1),c),`${v(m,'q1')} ${mid(m,1)}`);}
{const m=make(C,box2(),[W0,P1,P2]);const c=mid(m,1),e=ends(m,1);E.dmPin(m.st,1,true);E.dmLock(m.st,1,true);set(m,'q0',180);set(m,'q2',70);
 const f=ends(m,1);ok('замок + фиксатор: ни значение, ни положение не меняются',v(m,'q1')===42&&near(f[0],e[0])&&near(f[1],e[1]),`${v(m,'q1')} ${f} было ${e}`);
 ok('остальные при этом работают',v(m,'q0')>121,`${v(m,'q0')}`);
 set(m,'q1',50);ok('свой ползунок под замком и фиксатором: размер меняется, центр стоит',v(m,'q1')===50&&near(mid(m,1),c),`${v(m,'q1')} ${mid(m,1)}`);}
{const m=make(C,box2(),[W0,P1,P2]);const c1=mid(m,1),c2=mid(m,2);E.dmPin(m.st,1,true);E.dmPin(m.st,2,true);set(m,'q0',200);set(m,'q1',50);
 ok('два фиксатора: оба центра на месте',near(mid(m,1),c1)&&near(mid(m,2),c2),`${mid(m,1)}/${c1} ${mid(m,2)}/${c2}`);}
{const m=make(C,box2(),[W0,P1]);set(m,'q0',150);const c=mid(m,1);const W=m.apply();E.dmPin(m.st,1,true);const W2=m.apply();ok('включение фиксатора не дёргает модель',W.every((x,i)=>near(x,W2[i],.02)));
 set(m,'q0',100);ok('держится новое положение центра',near(mid(m,1),c),`${mid(m,1)} ${c}`);E.dmPin(m.st,1,false);const W3=m.apply();set(m,'q0',100);ok('выключение не дёргает модель',m.apply().every((x,i)=>near(x,W3[i],.02)));
 ok('после выключения всех фиксаторов рамка экрана снята',!Object.keys(m.st.co||{}).length,JSON.stringify(m.st.co));}
{const m=make(C,box2(),[W0,P1]);E.dmPin(m.st,1,true);set(m,'q0',160);const mn=[0,0,0],mx=[1,1,1];E.dmViewFix(m.G,m.st,false,mn,mx);
 const o=m.st.co[0],c=m.G.c0[0];ok('на экране деталь не центрируется заново (рамка по X постоянна)',near(mn[0],c+m.st.U*(o[0]-c))&&near(mx[0],c+m.st.U*(o[1]-c))&&near(mx[0]-mn[0],120),`${mn[0]} ${mx[0]}`);}
console.log('Порядок карточек');
{const ann=[W0,P1,S1];const c=C.canon(box2()),G=C.geoDetect(c.U,c.I);const r=E.dmBuild(ann,1,G,c.U,c.I,null,[{members:[1,2]}],['c0','a2','a0','a1']);
 ok('порядок из редактора размеров переходит в модель',JSON.stringify(r.ord)==='["sc","c0","q2","q0","q1"]',JSON.stringify(r.ord));
 const g=C.geoMeta(G,null),st=Object.assign(C.geoState(G.holes.length,G.bosses.length,G.slopes.length),{dm:r.dm,dv:r.dv.slice(),cm:r.cm,sk:r.sk,ord:r.ord});
 ok('ползунки выдаются в этом порядке',C.geoParams({...g,st}).map(p=>p.key).join()==='c0,q2,q0,q1',C.geoParams({...g,st}).map(p=>p.key).join());
 st.ord=['q1','q0'];ok('новые (не перечисленные) ползунки идут в конце',C.geoParams({...g,st}).map(p=>p.key).join()==='q1,q0,q2,c0',C.geoParams({...g,st}).map(p=>p.key).join());}
console.log('Настройки составного из редактора размеров');
const mk=(ann,comps)=>make(C,box2(),ann,comps);
{const m=mk([W0,P1,S1],[{members:[1,2],limit:'pct',pmin:50,pmax:150,param:false}]);const c=m.st.cm[0];ok('лимит в % и выключенный ползунок',near(c.mn,27)&&near(c.mx,81)&&c.lm==='pct'&&c.hid===true,JSON.stringify(c));}
{const m=mk([W0,P1,S1],[{members:[1,2],amin:10,amax:300,limRef:0,limOp:'*',limVal:.5}]);set(m,'c0',200);ok('составной ≤ ширина×0.5',v(m,'c0')<=v(m,'q0')*.5+.05&&near(v(m,'q1')/v(m,'q2'),3.5,.01),`${v(m,'c0')} ${v(m,'q0')}`);
 set(m,'q1',100);ok('входящий размер тоже не даёт превысить предел составного',v(m,'c0')<=v(m,'q0')*.5+.05,`${v(m,'c0')} ${v(m,'q0')}`);
 set(m,'q0',80);ok('уменьшили ширину — составной уменьшился следом',v(m,'c0')<=40.1,`${v(m,'c0')} ${v(m,'q0')}`);}
{const m=mk([W0,{...P2,syncGroup:1},P1,S1],[{members:[2,3],amin:10,amax:300,syncGroup:1}]);set(m,'c0',60);ok('синхронизация: размер получает значение составного',near(v(m,'c0'),60)&&near(v(m,'q1'),60),`${v(m,'c0')} ${v(m,'q1')}`);
 set(m,'q1',50);ok('синхронизация: составной получает значение размера',near(v(m,'c0'),50)&&near(v(m,'q1'),50),`${v(m,'c0')} ${v(m,'q1')}`);}
{const m=mk([W0,{...P2,propGroup:1},P1,S1],[{members:[2,3],amin:10,amax:300,propGroup:1}]);set(m,'c0',81);ok('пропорция: размер меняется в том же соотношении',near(v(m,'c0'),81)&&near(v(m,'q1'),63),`${v(m,'c0')} ${v(m,'q1')}`);
 set(m,'q1',50.4);ok('пропорция в обратную сторону',near(v(m,'c0'),64.8)&&near(v(m,'q1'),50.4),`${v(m,'c0')} ${v(m,'q1')}`);}
console.log('Случайные детали: фиксаторы и замки на ходу');
for(const first of[3,41,777,4567,90210]){
 let seed=first;const rnd=()=>(seed=(seed*48271)%2147483647)/2147483647,int=(a,b)=>a+Math.floor(rnd()*(b-a+1));
 const bad={finite:0,flip:0,lie:0,locked:0,moved:0,jump:0,crash:0};let moves=0,toggles=0;
 for(let p=0;p<150;p++){try{
  const Gd=[0,1,2].map(()=>{const a=[0];for(let i=0,n=int(3,5);i<n;i++)a.push(a[i]+int(5,40));return a});
  const holes=new Set();for(let h=int(1,3);h--;)holes.add(int(1,Gd[0].length-3)+','+int(1,Gd[1].length-3));
  const pos=voxel(Gd,(i,j,k)=>!(k===Gd[2].length-2&&holes.has(i+','+j)));
  const ann=[];for(let n=int(2,5);n--;){const a=int(0,2),S=Gd[a],i=int(0,S.length-2),j=int(i+1,S.length-1),P=[0,0,0],Q=[0,0,0];P[a]=S[i];Q[a]=S[j];ann.push(L(P,Q,{amax:600}))}
  const m=make(C,pos,ann,ann.length>2&&rnd()<.5?[{members:[0,1],amin:1,amax:900}]:[]);if(!m.r.dm.length||!m.r.dm.every(d=>d.sk))continue;const lk={},cp={};
  const size=W=>m.st.dm.map((s,q)=>{const ax=s.d.findIndex(x=>x),S=m.st.sk.s[ax];let A,B;for(let k=ax;k<W.length;k+=3){if(Math.abs(m.c.U[k]-S[s.sk[0]])<.01)A=W[k];if(Math.abs(m.c.U[k]-S[s.sk[1]])<.01)B=W[k]}return [B-A,(A+B)/2]});
  const shape=W=>Array.from(W,(x,k)=>x-W[k%3]);
  for(let n=0;n<40;n++){
   if(rnd()<.25){const i=int(0,m.r.dm.length-1),pin=rnd()<.5,on=!(pin?m.st.cp&&m.st.cp[i]!==undefined:m.st.lk&&m.st.lk[i]),A=m.apply(),vals=m.vals();(pin?E.dmPin:E.dmLock)(m.st,i,on);toggles++;
    // по оси с фиксатором деталь не должна сдвинуться вовсе; по остальным — не меняется форма (на экране она центруется)
    const B=m.apply(),co=m.st.co||{};if(A.some((x,k)=>{const a=k%3;return Math.abs(co[a]?x-B[k]:(x-A[a])-(B[k]-B[a]))>.02}))bad.jump++;const t=pin?cp:lk;if(on)t[i]=pin?size(B)[i][1]:vals['q'+i];else delete t[i];}
   else{let key,own=[];if(m.st.cm&&rnd()<.2){key='c0';own=m.st.cm[0].m}else{const i=int(0,m.r.dm.length-1);key='q'+i;own=[i]}
    const pp=C.geoParams({...m.g,st:m.st}).find(p=>p.key===key),[lo,hi]=C.geoRange(m.g,m.st,pp);set(m,key,lo+rnd()*Math.max(0,hi-lo));moves++;
    const vals=m.vals();own.forEach(i=>{if(i in lk)lk[i]=vals['q'+i]})}
   const W=m.apply();if(![...W].every(Number.isFinite))bad.finite++;
   const vals=m.vals(),real=size(W);m.st.dm.forEach((s,q)=>{if(Math.abs(real[q][0]-vals['q'+q])>.05)bad.lie++});
   for(const q in lk)if(Math.abs(vals['q'+q]-lk[q])>.05){bad.locked++;lk[q]=vals['q'+q]}
   for(const q in cp)if(Math.abs(real[q][1]-cp[q])>.05){bad.moved++;cp[q]=real[q][1]}
   const t=(X,o)=>{const g=k=>[0,1,2].map(a=>X[m.c.I[o+k]*3+a]),a=g(0),b=g(1),c=g(2),u=b.map((x,k)=>x-a[k]),w=c.map((x,k)=>x-a[k]);return[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]]};
   for(let o=0;o<m.c.I.length;o+=3){const a=t(m.c.U,o),b=t(W,o);if(a[0]*b[0]+a[1]*b[1]+a[2]*b[2]<=0){bad.flip++;break}}
  }}catch(e){bad.crash++;if(bad.crash<3)console.log(e.stack)}}
 ok(`набор ${first}: ${moves} движений, ${toggles} переключений`,Object.values(bad).every(x=>!x),JSON.stringify(bad));
}
console.log(`\nИтого: пройдено ${pass}, ошибок ${fail}`);
