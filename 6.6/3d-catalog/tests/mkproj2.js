// проект с составным размером и выноской перед размерами (проверка пересчёта номеров)
const {box2,fs}=require('./lib');
const project={modelName:'box.html',unit:'мм',parts:[{positions:Array.from(box2()),color:'#adb5bd',opacity:1}],wires:[],isDark:true,annotations:[
 {type:'callout',points:[[0,0,30],[5,5,40]],normal:[0,0,1],text:'метка'},
 {type:'linear',points:[[0,0,0],[120,0,0]],normal:[0,-1,0],name:'Ширина',limit:'abs',amin:60,amax:250},
 {type:'linear',points:[[12,12,30],[54,12,30]],normal:[0,0,1],name:'Паз',limit:'abs',amin:5,amax:200},
 {type:'linear',points:[[0,0,30],[12,0,30]],normal:[0,0,1],name:'Стенка',limit:'abs',amin:2,amax:60}],
 composites:[{name:'Паз и стенка',members:[2,3],amin:20,amax:110}]};
fs.writeFileSync('project-comp.html','<html><body><script id="__CAD_ANNOTATIONS_DATA__" type="application/json">'+JSON.stringify(project)+'</script></body></html>');
