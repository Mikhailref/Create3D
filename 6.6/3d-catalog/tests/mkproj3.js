// проект для настроек в конвертере: два паза и стенка, у второго паза ползунок выключен
const {box2,fs}=require('./lib');
const L=(a,b,name,x)=>({type:'linear',showScale:true,points:[a,b],normal:[0,0,1],name,limit:'abs',amin:2,amax:250,...x});
const project={modelName:'box.html',unit:'мм',parts:[{positions:Array.from(box2()),color:'#adb5bd',opacity:1}],wires:[],isDark:true,annotations:[
 L([0,0,0],[120,0,0],'Ширина',{amin:60}),L([12,12,30],[54,12,30],'Паз',{amax:200}),L([0,0,30],[12,0,30],'Стенка',{amax:60}),L([66,12,30],[108,12,30],'Паз 2',{amax:200})]};
fs.writeFileSync('project-set.html','<html><body><script id="__CAD_ANNOTATIONS_DATA__" type="application/json">'+JSON.stringify(project)+'</script></body></html>');
