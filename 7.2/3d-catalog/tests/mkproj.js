const {box2,fs}=require('./lib');
const pos=Array.from(box2());
const project={modelName:'box.html',unit:'мм',parts:[{positions:pos,color:'#adb5bd',opacity:1}],wires:[],isDark:true,annotations:[
 {type:'linear',points:[[0,0,0],[120,0,0]],normal:[0,-1,0],name:'Ширина',limit:'abs',amin:60,amax:250},
 {type:'linear',points:[[12,12,30],[54,12,30]],normal:[0,0,1],name:'Паз',limit:'abs',amin:5,amax:200}]};
fs.writeFileSync('project.html','<html><body><script id="__CAD_ANNOTATIONS_DATA__" type="application/json">'+JSON.stringify(project)+'</script></body></html>');
fs.writeFileSync('site.html',`<!DOCTYPE html><html><head><title>t</title></head><body><script type="module">
const I18N={ru:{}};
const MODEL_DEFS=[
];
const SWATCH_COLORS=[];
function buildModelGeometry(modelId, p) {
  clearGroup(modelGroup);
  clearGroup(edgesGroup);
}
function animate() {
  requestAnimationFrame(animate);
  controls.update();
}
</script></body></html>`);
// шаблон сайта с меткой движка — нужен тестам редактора сайта
fs.writeFileSync('site-cfg.html',fs.readFileSync('site.html','utf8').replace('const SWATCH_COLORS=[];','const SWATCH_COLORS=[];\n/*SITE:ENGINE v1*/'));
