// Заглушка 3D-библиотеки: настоящая математика точек, вместо отрисовки пустышки (только для тестов)
(function(root){
class V3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this}setScalar(s){return this.set(s,s,s)}copy(v){return this.set(v.x,v.y,v.z)}clone(){return new V3(this.x,this.y,this.z)}
 add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}addVectors(a,b){return this.copy(a).add(b)}subVectors(a,b){return this.copy(a).sub(b)}
 setLength(l){return this.normalize().multiplyScalar(l)}multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this}divideScalar(s){return this.multiplyScalar(1/s)}addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this}negate(){return this.multiplyScalar(-1)}
 dot(v){return this.x*v.x+this.y*v.y+this.z*v.z}lengthSq(){return this.dot(this)}length(){return Math.sqrt(this.lengthSq())}normalize(){return this.multiplyScalar(1/(this.length()||1))}
 crossVectors(a,b){return this.set(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x)}cross(b){return this.crossVectors(this.clone(),b)}
 distanceTo(v){return this.clone().sub(v).length()}angleTo(v){return Math.acos(Math.max(-1,Math.min(1,this.dot(v)/Math.sqrt(this.lengthSq()*v.lengthSq()||1))))}lerp(v,t){return this.add(v.clone().sub(this).multiplyScalar(t))}lerpVectors(a,b,t){return this.copy(a).lerp(b,t)}
 toArray(){return[this.x,this.y,this.z]}fromArray(a,o=0){return this.set(a[o],a[o+1],a[o+2])}setComponent(i,v){this['xyz'[i]]=v;return this}getComponent(i){return this['xyz'[i]]}
 min(v){return this.set(Math.min(this.x,v.x),Math.min(this.y,v.y),Math.min(this.z,v.z))}max(v){return this.set(Math.max(this.x,v.x),Math.max(this.y,v.y),Math.max(this.z,v.z))}
 project(){const x=this.x,y=this.y,z=this.z;this.x=(x*.8-y*.45)/300;this.y=(z*.9+x*.25+y*.35)/300;this.z=0;return this}applyQuaternion(){return this}applyAxisAngle(){return this}}
const anyP=()=>{const f=function(){return p};const store={};const p=new Proxy(f,{get(t,k){if(k in store)return store[k];if(k===Symbol.toPrimitive)return()=>0;if(k==='then')return undefined;return store[k]=anyP()},set(t,k,v){store[k]=v;return true},construct(){return anyP()}});return p};
const soft=o=>new Proxy(o,{get(t,k){if(k in t||typeof k==='symbol'||k==='then')return t[k];return t[k]=anyP()}});
class Obj{constructor(){this.children=[];this.position=new V3();this.scale=new V3(1,1,1);this.rotation=new V3();this.up=new V3(0,0,1);this.userData={};this.visible=true;return soft(this)}
 add(...a){this.children.push(...a);return this}remove(...a){this.children=this.children.filter(c=>!a.includes(c));return this}clear(){this.children=[];return this}traverse(f){f(this);this.children.forEach(c=>c.traverse&&c.traverse(f))}lookAt(){}updateProjectionMatrix(){}}
class Attr{constructor(a,n){this.array=a;this.itemSize=n;this.count=a.length/n}getX(i){return this.array[i*3]}getY(i){return this.array[i*3+1]}getZ(i){return this.array[i*3+2]}}
class Geo{constructor(){this.attributes={};this.index=null;return soft(this)}setAttribute(n,a){this.attributes[n]=a;return this}setFromPoints(p){return this.setAttribute('position',new Attr(Float32Array.from(p.flatMap(v=>v.toArray())),3))}
 clone(){const g=new Geo();Object.assign(g.attributes,this.attributes);return g}toNonIndexed(){return this.clone()}dispose(){}computeVertexNormals(){}computeBoundingSphere(){}computeBoundingBox(){}translate(){return this}}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;this.isMesh=true}}
class Line extends Mesh{constructor(g,m){super(g,m);this.isLine=true}}
class Box3{constructor(){this.min=new V3(1/0,1/0,1/0);this.max=new V3(-1/0,-1/0,-1/0)}set(a,b){this.min.copy(a);this.max.copy(b);return this}isEmpty(){return this.max.x<this.min.x}expandByPoint(p){this.min.min(p);this.max.max(p);return this}
 setFromObject(o){this.min.set(1/0,1/0,1/0);this.max.set(-1/0,-1/0,-1/0);return this.expandByObject(o)}
 expandByObject(o){o.traverse(c=>{const a=c.geometry&&c.geometry.attributes.position;if(a&&a.array)for(let i=0;i<a.array.length;i+=3)this.expandByPoint(new V3().fromArray(a.array,i))});return this}
 getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}}
class Renderer{constructor(o){this.domElement=(o&&o.canvas)||document.createElement('canvas');return soft(this)}setPixelRatio(){}setSize(){}render(){}dispose(){}}
class Any{constructor(){return soft(this)}}
const T={Vector3:V3,Vector2:class{constructor(x=0,y=0){this.x=x;this.y=y}},Box3,Object3D:Obj,Group:Obj,Scene:Obj,Mesh,Line,LineSegments:Line,BufferGeometry:Geo,BufferAttribute:Attr,WebGLRenderer:Renderer,
 MathUtils:{degToRad:d=>d*Math.PI/180,radToDeg:r=>r*180/Math.PI},DoubleSide:2,
 PerspectiveCamera:Obj,OrthographicCamera:Obj,DirectionalLight:Obj,HemisphereLight:Obj,GridHelper:Obj,BoxHelper:Obj,ArrowHelper:Obj,
 OrbitControls:class{constructor(o){this.object=o;this.target=new V3();return soft(this)}update(){}}};
for(const n of['EdgesGeometry','BoxGeometry','ConeGeometry','ExtrudeGeometry','SphereGeometry','TorusGeometry'])T[n]=class extends Geo{constructor(){super();this.setAttribute('position',new Attr(new Float32Array(0),3))}};
for(const n of['Color','Path','Shape','Plane','Raycaster','LineBasicMaterial','LineDashedMaterial','MeshBasicMaterial','MeshLambertMaterial','MeshStandardMaterial'])T[n]=Any;
root.__T=T;if(!root.THREE)root.THREE=T;
})(window);
