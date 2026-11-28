// настройки, которые теперь можно задать в конвертере: ограничение другим размером и группы вместе с составными
const {box2,L,make,load,out}=require('./lib');
const C=load(out+'Конвертер-OBJ-HTML.html');
let pass=0,fail=0;const ok=(n,c,i='')=>{c?pass++:fail++;console.log((c?'  ОК     ':'  ОШИБКА ')+n+(c?'':'  → '+i))};
const v=(m,k)=>+m.vals()[k].toFixed(2),near=(a,b,e=.05)=>Math.abs(a-b)<=e,set=(m,k,x)=>C.geoSet(m.g,m.st,k,x);
const mk=()=>make(C,box2(),[L([0,0,0],[120,0,0]),L([12,12,30],[54,12,30]),L([0,0,30],[12,0,30])],[{members:[1,2],amin:10,amax:300}]);
for(const [rop,rval,name] of [['*',5,'паз ≤ стенка×5'],['/',.25,'паз ≤ стенка÷0.25']]){
  const m=mk();Object.assign(m.st.dm[1],{rf:2,rop,rval});set(m,'c0',81);
  ok(name+' внутри составного: оба растут пропорционально',near(v(m,'q1'),63)&&near(v(m,'q2'),18),`${v(m,'q1')} ${v(m,'q2')}`);}
{const m=mk();Object.assign(m.st.dm[1],{rf:2,rop:'+',rval:32});set(m,'c0',81);const a=v(m,'q1'),b=v(m,'q2');
 ok('паз ≤ стенка+32 внутри составного: останавливается на пределе, пропорция сохранена',near(a/b,3.5,.01)&&a<=b+32+.05&&near(a,44.8,.1),`${a} ${b}`);}
{const m=mk();Object.assign(m.st.dm[1],{rf:0,rop:'*',rval:.4});set(m,'c0',200);ok('ограничение от размера вне составного (≤ ширина×0.4 = 48)',v(m,'q1')<=48.05&&near(v(m,'q1')/v(m,'q2'),3.5,.01),`${v(m,'q1')} ${v(m,'q2')}`);}
console.log(`Итого: пройдено ${pass}, ошибок ${fail}`);
