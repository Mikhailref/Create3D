// проект с болтом: три линейных размера (поперечник по X, длина резьбы, поперечник по Y)
const {fs}=require('./lib');const {bolt}=require('./threadlib');
const L=(a,b,name,x)=>({type:'linear',showScale:true,points:[a,b],normal:[0,0,1],name,limit:'abs',amin:2,amax:250,...x});
const project={modelName:'bolt.html',unit:'мм',parts:[{positions:Array.from(bolt()),color:'#adb5bd',opacity:1}],wires:[],isDark:true,annotations:[
 L([-5,0,5],[5,0,5],'Носитель X',{amin:6,amax:20}),L([0,0,10],[0,0,30],'Длина резьбы',{amin:10,amax:60}),L([0,-5,5],[0,5,5],'Носитель Y',{amin:6,amax:20})]};
fs.writeFileSync('project-thread.html','<html><body><script id="__CAD_ANNOTATIONS_DATA__" type="application/json">'+JSON.stringify(project)+'</script></body></html>');
