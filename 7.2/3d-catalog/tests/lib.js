const fs=require('fs');const out=require('path').join(__dirname,'..','out')+'/';
const read=n=>fs.readFileSync(n,'utf8');
const blk=(s,i)=>{const a=s.indexOf('>',s.indexOf('id="'+i+'">'))+1;return s.slice(a,s.indexOf('</script>',a))};
const load=f=>new Function(blk(read(f),'core-src')+';return {canon,geoDetect,geoApply,geoMeta,geoSet,geoVals,geoParams,geoState,geoRange,dmBuild}')();
// деталь из блоков: плоскости X,Y,Z и функция «есть ли материал в ячейке»
function voxel(G,solid){const p=[],n=G.map(a=>a.length-1);const has=c=>c.every((v,a)=>v>=0&&v<n[a])&&solid(...c);
 for(let i=0;i<n[0];i++)for(let j=0;j<n[1];j++)for(let k=0;k<n[2];k++){const c=[i,j,k];if(!has(c))continue;for(let a=0;a<3;a++)for(const d of[-1,1]){const m=c.slice();m[a]+=d;if(has(m))continue;const u=(a+1)%3,w=(a+2)%3,q=[[0,0],[1,0],[1,1],[0,1]];if(d<0)q.reverse();for(const t of[0,1,2,0,2,3]){const v=[0,0,0];v[a]=G[a][c[a]+(d>0)];v[u]=G[u][c[u]+q[t][0]];v[w]=G[w][c[w]+q[t][1]];p.push(...v)}}}return Float32Array.from(p)}
const box2=()=>voxel([[0,12,54,66,108,120],[0,12,58,70],[0,6,30]],(i,j,k)=>!(k===1&&j===1&&(i===1||i===3)));
// пластина 60x40x5 с отверстием Ø10 в точке (20,20)
function holePlate(){const p=[],N=64,ring=(t,r)=>[20+r*Math.cos(t),20+r*Math.sin(t)],rect=t=>{const c=Math.cos(t),s=Math.sin(t),k=Math.min(c>1e-9?40/c:c<-1e-9?-20/c:1e9,s>1e-9?20/s:s<-1e-9?-20/s:1e9);return[20+k*c,20+k*s]};
 const ang=[...Array(N)].map((_,i)=>i/N*2*Math.PI).concat([[40,20],[-20,20],[-20,-20],[40,-20]].map(([x,y])=>(Math.atan2(y,x)+2*Math.PI)%(2*Math.PI))).sort((a,b)=>a-b);
 const T=(a,b,c)=>p.push(...a,...b,...c),Q=(a,b,c,d)=>{T(a,b,c);T(a,c,d)},z=(q,h)=>[q[0],q[1],h];
 ang.forEach((a,i)=>{const b=ang[(i+1)%ang.length],i0=ring(a,5),i1=ring(b,5),o0=rect(a),o1=rect(b);Q(z(i0,5),z(o0,5),z(o1,5),z(i1,5));Q(z(i0,0),z(i1,0),z(o1,0),z(o0,0));Q(z(o0,0),z(o1,0),z(o1,5),z(o0,5));Q(z(i1,0),z(i0,0),z(i0,5),z(i1,5))});return Float32Array.from(p)}
const L=(a,b,x={})=>({type:'linear',points:[a,b],limit:'abs',amin:0,amax:400,...x});
function make(C,pos,ann,comps){const c=C.canon(pos),G=C.geoDetect(c.U,c.I),g=C.geoMeta(G,null),r=C.dmBuild(ann,1,G,c.U,c.I,null,comps),st=C.geoState(G.holes.length,G.bosses.length,G.slopes.length);Object.assign(st,{dm:r.dm,dv:r.dv.slice()});if(r.sk)st.sk=r.sk;if(r.cm&&r.cm.length)st.cm=r.cm;
 return {c,G,g,st,r,apply(s=this.st){const W=new Float32Array(c.U.length);C.geoApply(c.U,G,s,W);return W},set(i,v){C.geoSet(g,this.st,'q'+i,v)},vals(){return C.geoVals(g,this.st)},range(i){return C.geoRange(g,this.st,C.geoParams({...g,st:this.st}).find(p=>p.key==='q'+i))}}}
module.exports={fs,out,read,blk,load,voxel,box2,holePlate,L,make};
