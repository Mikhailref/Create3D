# резьбовая модель целиком: конвертер → файл модели → редактор сайта → страница посетителя
import pathlib,re,json
exec(open(pathlib.Path(__file__).with_name('browser.py')).read().split('with sync_playwright() as p:')[0])
if not (T/'thread-exported.html').exists():  # проект болта делает browser_thread.py
    import subprocess,sys;subprocess.run([sys.executable,str(T/'browser_thread.py')],cwd=T,capture_output=True)
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(accept_downloads=True,viewport={'width':1500,'height':900});ctx.route('**/*',route);errors=[]
    def page(path):
        g=ctx.new_page();g.on('pageerror',lambda e:errors.append(f'{path.name}: {e}'));g.on('dialog',lambda d:d.accept());g.goto(path.as_uri());g.wait_for_timeout(1200);return g
    def save(g,click,name):
        with g.expect_download(timeout=20000) as d: click()
        f=T/name;d.value.save_as(f);return f
    embed=lambda f:json.loads(re.search(r'<script id="embed" type="application/json">(.*?)</script>',f.read_text(),re.S).group(1))
    def export(c,name):
        c.click('#bd');c.wait_for_timeout(2500)
        if c.locator('#trOk').count() and c.locator('#trOk').is_visible():c.click('#trOk');c.wait_for_timeout(500)
        return save(c,lambda:c.click('#bd'),name)
    print('Конвертер: болт с резьбой → файл модели')
    c=page(OUT/'Конвертер-OBJ-HTML.html');c.set_input_files('#f',str(T/'thread-exported.html'));c.wait_for_timeout(3000)
    mm=export(c,'model-thread.html');e=embed(mm);sk=e['geo']['st'].get('sk') or {}
    ok('в файл модели записаны привязки резьбы (10 штук) и каркас из 7 плоскостей',len(sk.get('t',[]))==10 and len(sk['s'][0])<=9,{k:(len(v) if isinstance(v,list) else v) for k,v in sk.items()})
    print('Редактор сайта')
    (T/'site-cfg.html').write_text((T/'site.html').read_text().replace('const SWATCH_COLORS=[];','const SWATCH_COLORS=[];\n/*SITE:ENGINE v1*/'))
    ed=(OUT/'Редактор-сайта.html').read_text()
    def registry(f):
        h=f.read_text();return json.loads(re.search(r'id="obj-models-data">(.*?)</script>',h,re.S).group(1).replace('\\u003c','<'))['models']
    s0=page(OUT/'Редактор-сайта.html');s0.set_input_files('#fSite',str(T/'site-cfg.html'));s0.wait_for_timeout(800)
    mid=[i for i,m in s0.evaluate('()=>[...document.querySelectorAll("input[type=file]")].map(e=>[e.id,e.multiple])') if i!='fSite' and m][0]
    def one(f):
        s2=page(OUT/'Редактор-сайта.html');s2.set_input_files('#fSite',str(T/'site-cfg.html'));s2.wait_for_timeout(600);s2.set_input_files('#'+mid,str(f));s2.wait_for_timeout(2500);return s2
    s=one(mm);ok('модель добавлена',s.locator('.mcard').count()==1,s.locator('.mcard').count())
    R=registry(save(s,lambda:s.click('#btnSave'),'site-thread.html'));st=R[0]['geo']['st']
    ok('в модели сайта сохранены привязки и каркас',len((st.get('sk') or {}).get('t',[]))==10,list(st.keys()))
    SITEF='site-thread.html'
    print('Страница посетителя')
    h=(T/SITEF).read_text();adapter=h[h.index('/*OBJRT:START'):h.index('/*OBJRT:END*/')+13]
    def blk(t,i):
        a=t.index('>',t.index('id="%s">'%i))+1;return t[a:t.index('</script>',a)]
        h=(T/SITEF).read_text();adapter=h[h.index('/*OBJRT:START'):h.index('/*OBJRT:END*/')+13]
    data=re.search(r'<script type="application/json" id="obj-models-data">.*?</script>',h,re.S).group(0)
    stub=(T/'stub'/'three.js').read_text()
    def harness(mode):
        cfg=json.dumps({'x':{'keep':{'mode':mode}}} if mode!='hide' else {})
        f=T/f'harness-{mode}.html'
        f.write_text('<!DOCTYPE html><html><head><meta charset="utf-8"><style>.param-item{border:1px solid #ccc;border-radius:10px;padding:10px;margin:8px;width:320px;font-family:sans-serif}.param-item input[type=range]{width:100%}</style></head><body><div id="params"></div><button id="reset-params-btn" class="btn-secondary">Сброс</button>'
          +data+'<script type="application/json" id="site-config">'+cfg+'</script><script>'+stub+'</script><script>\n'
          +'''const paramsContainer=document.getElementById('params'),MODEL_DEFS=[],I18N={ru:{}};let currentLang='ru',activeModelId=null,showEdges=false,currentMaterial={},edgeMat={};
const modelGroup=new THREE.Group(),edgesGroup=new THREE.Group();
function mmToDisplay(v){return +(+v).toFixed(2)}function formatManualInputNumber(v){return String(+(+v).toFixed(2))}function updateHudDimensions(){}
'''+adapter+'''
let P={},DEF;
function buildModelGeometry(id,p){modelGroup.clear();edgesGroup.clear();OBJRT.build(id,p)}
function renderParams(){paramsContainer.innerHTML='';DEF.schema.forEach(it=>{const w=document.createElement('div');w.className='param-item';
 w.innerHTML='<label>'+I18N.ru.models[DEF.id].params[it.key]+'</label><input type="number" id="num-'+it.key+'"><input type="range" data-key="'+it.key+'" min="'+it.min+'" max="'+it.max+'" step="0.01">';
 const r=w.querySelector('[type=range]');r.value=P[it.key];w.querySelector('[type=number]').value=P[it.key];r.addEventListener('input',()=>{P[it.key]=+r.value;buildModelGeometry(DEF.id,P)});paramsContainer.appendChild(w)});
 OBJRT.decorate(DEF.id)}
function open0(){DEF=MODEL_DEFS[0];activeModelId=DEF.id;P={};DEF.schema.forEach(s=>P[s.key]=s.def);renderParams();buildModelGeometry(DEF.id,P)}
document.getElementById('reset-params-btn').addEventListener('click',()=>{DEF.schema.forEach(s=>P[s.key]=s.def);renderParams();buildModelGeometry(DEF.id,P)});
open0();
function planes(){const a=modelGroup.children[0].geometry.attributes.position.array,s=new Set();for(let i=0;i<a.length;i+=3)s.add(+a[i].toFixed(1));const l=[...s].sort((x,y)=>x-y);return l.map(v=>+(v-l[0]).toFixed(1))}
</script><script>'''+blk(ed,'sitex-js')+'</script><style>'+blk(ed,'sitex-css')+'</style></body></html>')
        return page(f)
    def hmv(g,key,v):
        g.locator(f'#params input[data-key="{key}"]').evaluate('(el,v)=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}))}',v);g.wait_for_timeout(900)
    h=(T/SITEF).read_text();adapter=h[h.index('/*OBJRT:START'):h.index('/*OBJRT:END*/')+13]
    ok('в движке сайта текущая версия и привязки каркаса','OBJRT:START v'+VER in h and 'e.k!==ax' in h)
    data=re.search(r'<script type="application/json" id="obj-models-data">.*?</script>',h,re.S).group(0)
    stub=(T/'stub'/'three.js').read_text()
    def hmv(g,key,v):
        g.locator(f'#params input[data-key="{key}"]').evaluate('(el,v)=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}))}',v);g.wait_for_timeout(1200)
    WID="""()=>{const a=modelGroup.children[0].geometry.attributes.position.array;let xl=1e9,xh=-1e9,yl=1e9,yh=-1e9;for(let i=0;i<a.length;i+=3){xl=Math.min(xl,a[i]);xh=Math.max(xh,a[i]);yl=Math.min(yl,a[i+2]);yh=Math.max(yh,a[i+2])}return {wx:xh-xl,wy:yh-yl}}"""
    g=harness('hide')
    keys=g.evaluate('()=>[...document.querySelectorAll("#params input[data-key]")].map(e=>e.dataset.key)')
    ok('на странице масштаб и три размера (а не десятки ползунков)',keys==['sc','q0','q1','q2'],keys)
    w0=g.evaluate(WID);ok('исходная ширина по вершинам резьбы 10.8',abs(w0['wx']-10.8)<.2 and abs(w0['wy']-10.8)<.2,w0)
    hmv(g,'q0',14);w1=g.evaluate(WID);ok('на странице: носитель по X 14 → резьба 15.12, по Y прежняя',abs(w1['wx']-15.12)<.3 and abs(w1['wy']-w0['wy'])<.2,w1)
    hmv(g,'q2',7);w2=g.evaluate(WID);ok('на странице: носитель по Y 7 → резьба 7.56',abs(w2['wy']-7.56)<.3 and abs(w2['wx']-w1['wx'])<.2,w2)
    hmv(g,'q0',6);w3=g.evaluate(WID);ok('на странице: носитель по X 6 → резьба 6.48',abs(w3['wx']-6.48)<.3,w3)
    g.click('#reset-params-btn');g.wait_for_timeout(1200);w4=g.evaluate(WID);ok('«Сброс» возвращает исходные 10.8 × 10.8',abs(w4['wx']-10.8)<.2 and abs(w4['wy']-10.8)<.2,w4)
    ok('нет ошибок JavaScript',not errors,errors[:5])
    b.close()
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}')
