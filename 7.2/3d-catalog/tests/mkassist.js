// входные файлы ассистента: «сырой» экспорт FreeCAD без размеров (коробка с двумя карманами 120×70×30)
const {box2,fs}=require('./lib');
const pos=Array.from(box2()).map(v=>+v.toFixed(4));
const data={camera:{type:'Orthographic',position_x:200,position_y:-200,position_z:200},file:{},
  objects:[{name:'Body',color:'#adb5bd',opacity:1,verts:pos,facets:pos.map((_,i)=>i).filter(i=>i<pos.length/3),wires:[],faceColors:[],facesToFacets:[]}],compressed:false};
fs.writeFileSync('box-freecad.html','<!DOCTYPE html><html><head><title>Модель</title><meta name="generator" content="FreeCAD 1.1.4"></head><body><script type="module">\n'+
  'const data = '+JSON.stringify(data)+';\n</script></body></html>');
// «сложная» деталь: плита 130×130×20 с сеткой из 36 карманов — по X и Y по 13 участков
const {voxel}=require('./lib');
const G13=[...Array(14)].map((_,i)=>i*10);
const cpos=Array.from(voxel([G13,G13,[0,5,20]],(i,j,k)=>k===0||i%2===0||j%2===0)).map(v=>+v.toFixed(4));
const cdata={camera:{type:'Orthographic',position_x:200,position_y:-200,position_z:200},file:{},
  objects:[{name:'Body',color:'#adb5bd',opacity:1,verts:cpos,facets:cpos.map((_,i)=>i).filter(i=>i<cpos.length/3),wires:[],faceColors:[],facesToFacets:[]}],compressed:false};
fs.writeFileSync('complex-freecad.html','<!DOCTYPE html><html><head><title>Модель</title><meta name="generator" content="FreeCAD 1.1.4"></head><body><script type="module">\n'+
  'const data = '+JSON.stringify(cdata)+';\n</script></body></html>');
// проект редактора размеров: коробка со всеми 13 размерами (длинный список карточек — для проверки прокрутки)
const ST=[[0,12,54,66,108,120],[0,12,58,70],[0,6,30]],NRM=[[0,-1,0],[-1,0,0],[-.7071,-.7071,0]],AXN=['X','Y','Z'];
const many=[];
ST.forEach((s,k)=>{const P=v=>{const p=[0,0,0];p[k]=v;return p};
  many.push({type:'linear',points:[P(s[0]),P(s[s.length-1])],normal:NRM[k],offset:20,name:'Габарит '+AXN[k],color:'#38bdf8'});
  for(let i=0;i+1<s.length;i++)many.push({type:'linear',points:[P(s[i]),P(s[i+1])],normal:NRM[k],offset:10,name:AXN[k]+' участок '+(i+1),color:'#fb923c'})});
fs.writeFileSync('project-many.html','<html><body><script id="__CAD_ANNOTATIONS_DATA__" type="application/json">'+
  JSON.stringify({modelName:'box-many.html',unit:'мм',parts:[{positions:pos,color:'#adb5bd',opacity:1}],wires:[],isDark:true,annotations:many})+'</script></body></html>');
// проект с наклонным размером (как «Высота паза» под углом) и обычным размером по оси
fs.writeFileSync('project-slant.html','<html><body><script id="__CAD_ANNOTATIONS_DATA__" type="application/json">'+
  JSON.stringify({modelName:'box-slant.html',unit:'мм',parts:[{positions:pos,color:'#adb5bd',opacity:1}],wires:[],isDark:true,annotations:[
    {type:'linear',points:[[0,0,0],[120,0,0]],normal:[0,-1,0],offset:12,name:'Ширина',color:'#38bdf8'},
    {type:'linear',points:[[0,0,0],[12,0,30]],normal:[0,-1,0],offset:8,name:'Наклонный',color:'#fb923c'}]})+'</script></body></html>');
