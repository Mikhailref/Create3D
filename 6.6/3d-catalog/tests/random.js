const {load,out,voxel,L,make}=require('./lib');const C=load(out+'Конвертер-OBJ-HTML.html');
let seed=+process.argv[2]||11;const rnd=()=>(seed=(seed*48271)%2147483647)/2147483647,int=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const bad={finite:0,flip:0,lie:0,miss:0,crash:0};let moves=0,parts=0,sk=0;
for(let p=0;p<150;p++){try{
 const Gd=[0,1,2].map(()=>{const a=[0];for(let i=0,n=int(3,5);i<n;i++)a.push(a[i]+int(5,40));return a});
 const holes=new Set();for(let h=int(1,3);h--;)holes.add(int(1,Gd[0].length-3)+','+int(1,Gd[1].length-3));
 const pos=voxel(Gd,(i,j,k)=>!(k===Gd[2].length-2&&holes.has(i+','+j)));
 const ann=[];for(let n=int(1,4);n--;){const a=int(0,2),S=Gd[a],i=int(0,S.length-2),j=int(i+1,S.length-1),P=[0,0,0],Q=[0,0,0];P[a]=S[i];Q[a]=S[j];ann.push(L(P,Q,{amax:600}))}
 const m=make(C,pos,ann);if(!m.r.dm.length)continue;parts++;
 for(let n=0;n<40;n++){const i=int(0,m.r.dm.length-1),s=m.st.dm[i];let[lo,hi]=m.range(i);lo=Math.max(lo,s.mn);hi=Math.min(hi,s.mx);const v=lo+rnd()*(hi-lo);m.set(i,v);const W=m.apply();moves++;
  if(![...W].every(Number.isFinite))bad.finite++;
  if(!s.sk)continue;sk++;
  const vals=m.vals();if(Math.abs(vals['q'+i]-v)>.05)bad.miss++;
  const t=(X,o)=>{const q=k=>[0,1,2].map(a=>X[m.c.I[o+k]*3+a]),a=q(0),b=q(1),c=q(2),u=b.map((x,k)=>x-a[k]),w=c.map((x,k)=>x-a[k]);return[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]]};
  if(m.st.dm.every(d=>d.sk))for(let o=0;o<m.c.I.length;o+=3){const a=t(m.c.U,o),b=t(W,o);if(a[0]*b[0]+a[1]*b[1]+a[2]*b[2]<=0){bad.flip++;break}}
 }}catch(e){bad.crash++;if(bad.crash<3)console.log(e.stack)}}
console.log(`случайных деталей ${parts}, движений ${moves} (через каркас ${sk}):`,JSON.stringify(bad));
