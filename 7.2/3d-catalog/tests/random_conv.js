// случайные настройки из конвертера (группы, ограничения, составные, замки) и случайные движения
const {voxel,L,make,load,out,blk,read}=require('./lib');
const C=load(out+'Конвертер-OBJ-HTML.html');
const D=new Function(blk(read(out+'Конвертер-OBJ-HTML.html'),'core-src')+';return {dmLock}')();
let seed=+process.argv[2]||1;const rnd=()=>(seed=(seed*48271)%2147483647)/2147483647,pick=a=>a[Math.floor(rnd()*a.length)];
const bad={crash:0,finite:0,flip:0};let moves=0;
for(let t=0;t<120;t++){
  const X=[0];for(let i=0;i<5;i++)X.push(X[i]+8+Math.floor(rnd()*30));
  const pos=voxel([X,[0,12,58,70],[0,6,30]],(i,j,k)=>!(k===1&&j===1&&(i===1||i===3)));
  const ann=[L([0,0,0],[X[5],0,0])];
  for(let n=0;n<4;n++){const a=Math.floor(rnd()*5),b=a+1+Math.floor(rnd()*(5-a));ann.push(L([X[a],12,30],[X[b],12,30]))}
  try{
    const m=make(C,pos,ann,[{members:[1,2],amin:1,amax:900},{members:[3,4,0],amin:1,amax:900}]),st=m.st,n=st.dm.length;
    for(let q=0;q<3;q++){const i=Math.floor(rnd()*n);if(rnd()<.5)st.dm[i].g=1;else st.dm[i].pg=1}
    for(let q=0;q<2;q++){const i=Math.floor(rnd()*n),j=(i+1+Math.floor(rnd()*(n-1)))%n;Object.assign(st.dm[i],{rf:j,rop:pick(['*','/','+','-']),rval:pick([.5,1,2,5,30])})}
    for(let s=0;s<30;s++){
      if(rnd()<.1){const i=Math.floor(rnd()*n);if(st.dm[i].sk)D.dmLock(st,i,!(st.lk&&st.lk[i]))}
      const P=C.geoParams({...m.g,st}).filter(p=>p.kind==='dq'||p.kind==='cm'),p=pick(P);
      C.geoSet(m.g,st,p.key,p.min+rnd()*(p.max-p.min));moves++;
      const vals=Object.values(C.geoVals(m.g,st)),W=m.apply();
      if(!vals.every(isFinite)||![...W].every(isFinite)){bad.finite++;break}
      const U=m.c.U;let flip=false;
      // порядок плоскостей по X не должен меняться
      const map=new Map();for(let i=0;i<U.length;i+=3)map.set(+U[i].toFixed(2),W[i]);
      const k=[...map.keys()].sort((a,b)=>a-b);for(let i=1;i<k.length;i++)if(map.get(k[i])<map.get(k[i-1])-1e-3)flip=true;
      if(flip){bad.flip++;break}
    }
  }catch(e){bad.crash++;if(bad.crash<3)console.log(e.stack)}
}
console.log('seed',process.argv[2],'движений',moves,JSON.stringify(bad));
