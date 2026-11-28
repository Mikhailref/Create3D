// болт вдоль оси Z: хвостовик Ø10 (z 0..10), резьба z 10..30 (радиус от 4.6 до 5.4, шаг 2, профиль «пила»), торец z=30
const fs=require('fs');
function bolt(o={}){
  const N=o.N||48,pitch=o.pitch||2,rl=o.rl||4.6,rh=o.rh||5.4,R=o.R||5,z0=10,z1=o.z1||30,S=16,pos=[];
  const T=(a,b,c)=>pos.push(...a,...b,...c),P=(r,t,z)=>[r*Math.cos(t),r*Math.sin(t),z];
  const th=j=>j/N*2*Math.PI,tw=x=>{x=((x%1)+1)%1;return x<.5?x*2:2-x*2};
  const rr=(j,z)=>rl+(rh-rl)*tw((z-z0)/pitch-j/N);
  const zs=[];for(let i=0;i<=Math.round((z1-z0)/pitch*S);i++)zs.push(z0+i*pitch/S);
  const Q=(a,b,c,d)=>{T(a,b,c);T(a,c,d)};
  for(let j=0;j<N;j++){const a=th(j),b=th(j+1);
    Q(P(R,a,0),P(R,b,0),P(R,b,z0),P(R,a,z0));                      // хвостовик
    T(P(0,0,0),P(R,b,0),P(R,a,0));                                  // низ
    for(let i=0;i<zs.length-1;i++)Q(P(rr(j,zs[i]),a,zs[i]),P(rr(j+1,zs[i]),b,zs[i]),P(rr(j+1,zs[i+1]),b,zs[i+1]),P(rr(j,zs[i+1]),a,zs[i+1])); // резьба
    // уступ между хвостовиком и началом резьбы (плоскость z=10), направление зависит от того, шире резьба или нет
    const r0=rr(j,z0),r1=rr(j+1,z0),up=(r0+r1)/2<R;
    if(up)Q(P(R,a,z0),P(R,b,z0),P(r1,b,z0),P(r0,a,z0));else Q(P(R,a,z0),P(r0,a,z0),P(r1,b,z0),P(R,b,z0));
    const zt=zs[zs.length-1];T(P(0,0,zt),P(rr(j,zt),a,zt),P(rr(j+1,zt),b,zt)); // торец
  }
  return Float32Array.from(pos);
}
// ядро каркаса из файла: конвертер (core-src) или редактор размеров (текст между функциями)
function skCore(file){
  const t=fs.readFileSync(file,'utf8');
  if(t.indexOf('id="core-src"')>=0){const a=t.indexOf('>',t.indexOf('id="core-src">'))+1;return new Function(t.slice(a,t.indexOf('</script>',a))+';return {skBuild,skAnalyze:typeof skAnalyze==="function"?skAnalyze:null}')()}
  const a=t.indexOf('function skFaces('),z=t.indexOf('function skSetSpan');
  return new Function(t.slice(a,z)+';return {skBuild,skAnalyze}')();
}
module.exports={bolt,skCore};
