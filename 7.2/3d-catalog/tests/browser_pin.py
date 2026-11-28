# фиксатор центра и перестановка карточек: конвертер → модель → сайт
import pathlib,re,json
exec(open(pathlib.Path(__file__).with_name('browser.py')).read().split('with sync_playwright() as p:')[0])
X='()=>{const a=geo.attributes.position.array,s=new Set();for(let i=0;i<a.length;i+=3)s.add(+a[i].toFixed(1));return [...s].sort((x,y)=>x-y)}'
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(accept_downloads=True,viewport={'width':1500,'height':900});ctx.route('**/*',route);errors=[]
    def page(path):
        g=ctx.new_page();g.on('pageerror',lambda e:errors.append(f'{path.name}: {e}'));g.on('dialog',lambda d:d.accept());g.goto(path.as_uri());g.wait_for_timeout(1200);return g
    def save(g,click,name):
        with g.expect_download(timeout=15000) as d: click()
        f=T/name;d.value.save_as(f);return f
    c=page(OUT/'Конвертер-OBJ-HTML.html');c.set_input_files('#f',str(T/'project-set.html'));c.wait_for_timeout(2000)
    V=lambda g=c:g.evaluate('()=>{const v=geoVals(g,st),o={};for(const k in v)o[k]=+v[k].toFixed(2);return o}')
    K=lambda g=c:g.evaluate('()=>plist().map(p=>p.key)')
    D=lambda g=c:g.evaluate('()=>[...document.querySelectorAll("#axes .row")].map(r=>r.dataset.key)')
    def rw(key,g=c):return g.locator(f'#axes .row[data-key="{key}"]')
    def mv(key,val,g=c):
        rw(key,g).locator('input[type=range]').evaluate('(r,v)=>{r.value=v;r.dispatchEvent(new Event("input",{bubbles:true}))}',val);g.wait_for_timeout(250)
    print('Фиксатор центра в конвертере')
    ok('у каждого размера есть 🔒 и 🎯',c.locator('#axes .dqk').count()==4 and c.locator('#axes .dqp').count()==4,(c.locator('#axes .dqk').count(),c.locator('#axes .dqp').count()))
    x0=c.evaluate(X);rw('q1').locator('.dqp input').check();c.wait_for_timeout(300);ok('включение фиксатора не меняет модель',c.evaluate(X)==x0 and rw('q1').locator('.dqp.on').count()==1,c.evaluate(X))
    sa=rw('q1').locator('select.an');ok('с фиксатором направление роста — «от центра»',sa.is_disabled() and sa.input_value()=='2')
    rw('q1').locator('.dqp input').uncheck();c.wait_for_timeout(300);ok('без фиксатора выбор направления возвращается',sa.is_enabled() and sa.input_value()=='0')
    rw('q1').locator('.dqp input').check();c.wait_for_timeout(300)
    # края паза 1 на экране: вторая и третья плоскости
    mv('q0',180);x=c.evaluate(X);ok('ширина 180: центр паза остаётся на экране на месте',V()['q0']==180 and abs((x[1]+x[2])/2-(x0[1]+x0[2])/2)<.15,(x0,x))
    rw('q1').locator('.dqk input').check();c.wait_for_timeout(300);held=c.evaluate(X);val=V()['q1'];mv('q0',150);x=c.evaluate(X)
    ok('замок + фиксатор: края паза не двигаются',abs(x[1]-held[1])<.15 and abs(x[2]-held[2])<.15 and V()['q1']==val,(held,x,V()))
    mv('q1',val+10);x2=c.evaluate(X);ok('свой ползунок: паз растёт в обе стороны',abs((x2[1]+x2[2])/2-(x[1]+x[2])/2)<.15 and abs(x2[2]-x2[1]-(val+10))<.15,(x,x2))
    c.click('#rs');c.wait_for_timeout(400);ok('«Исходные размеры»: форма исходная, 🎯 и 🔒 остаются',c.evaluate(X)==x0 and rw('q1').locator('.dqp input').is_checked() and rw('q1').locator('.dqk input').is_checked(),c.evaluate(X))
    rw('q1').locator('.dqk input').uncheck();c.wait_for_timeout(300)
    print('Перестановка карточек')
    c.click('#cmAdd');c.wait_for_timeout(400)
    for m in ['1','2']:rw('c0').locator(f'input[data-m="{m}"]').check();c.wait_for_timeout(250)
    start=D();ok('сначала порядок обычный',start==['sc','q0','q1','q2','q3','c0'],start)
    ok('у крайних карточек стрелки выключены',rw('sc').locator('.mvb[data-dir="-1"]').is_disabled() and rw('c0').locator('.mvb[data-dir="1"]').is_disabled())
    rw('c0').locator('.mvb[data-dir="-1"]').click();rw('c0').locator('.mvb[data-dir="-1"]').click();c.wait_for_timeout(300)
    ok('стрелки переносят карточку вверх',D()==['sc','q0','q1','c0','q2','q3'] and K()==D(),(D(),K()))
    # перетаскивание за ручку
    c.evaluate('()=>$("panel").scrollTop=0');c.wait_for_timeout(200)
    h=rw('q1').locator('.mvh').bounding_box();t=rw('sc').bounding_box()
    c.mouse.move(h['x']+h['width']/2,h['y']+h['height']/2);c.mouse.down();c.mouse.move(h['x'],t['y']+5,steps=12);c.mouse.up();c.wait_for_timeout(300)
    order=['q1','sc','q0','c0','q2','q3'];ok('перетаскивание за ⠿ ставит карточку в начало',D()==order and K()==order,(D(),K()))
    mv('c0',70);ok('после перестановки ползунки работают',abs(V()['c0']-70)<.1,V())
    c.click('#rs');c.wait_for_timeout(400);ok('«Исходные размеры» порядок не сбрасывает',D()==order,D())
    c.click('#bz');c.click('#bz');c.locator('[data-ll="en"]').click();c.wait_for_timeout(300);ok('смена языка порядок не сбрасывает',D()==order,D());c.locator('[data-ll="ru"]').click();c.wait_for_timeout(300)
    # настройки составного
    t=rw('c0').inner_text();ok('у составного все настройки',all(s in t for s in ['Лимит:','Ограничить существующим размером','Синхр.','Пропорц.']),t)
    rw('c0').locator('.ron').check();c.wait_for_timeout(300);rw('c0').locator('.rsel').select_option('0');c.wait_for_timeout(300);n=rw('c0').locator('.rval');n.fill('0.4');n.press('Enter');c.wait_for_timeout(300)
    ok('составной ≤ ширина×0.4 = 48',V()['c0']<=48.05,V());mv('c0',100);ok('ползунок не выходит за предел',V()['c0']<=48.05,V())
    rw('c0').locator('.ron').uncheck();c.wait_for_timeout(300);rw('c0').locator('.lu').select_option('pct');c.wait_for_timeout(300);ok('пределы составного в %',rw('c0').locator('.mn').input_value()=='50' and rw('c0').locator('.mx').input_value()=='200',(rw('c0').locator('.mn').input_value(),rw('c0').locator('.mx').input_value()))
    c.click('#rs');c.wait_for_timeout(300)
    c.mouse.move(5,500);c.screenshot(path=str(T/'conv-pin.png'))
    c.click('#bd');c.wait_for_timeout(2500);c.click('#trOk');c.wait_for_timeout(500);model=save(c,lambda:c.click('#bd'),'model-pin.html')
    e=json.loads(re.search(r'<script id="embed" type="application/json">(.*?)</script>',model.read_text(),re.S).group(1))
    ok('в модели сохранены порядок и фиксатор',e['geo']['st']['ord']==order and '1' in e['geo']['st']['cp'],(e['geo']['st'].get('ord'),e['geo']['st'].get('cp')))
    vw=page(model);ok('готовый файл: тот же порядок, фиксатор включён, ручек перестановки нет',D(vw)==order and rw('q1',vw).locator('.dqp input').is_checked() and vw.locator('.mvh').count()==0,D(vw))
    r=page(OUT/'Конвертер-OBJ-HTML.html');r.set_input_files('#f',str(model));r.wait_for_timeout(2000);ok('повторное открытие в конвертере: порядок на месте',D(r)==order,D(r))
    print('Редактор сайта и страница сайта')
    (T/'site-cfg.html').write_text((T/'site.html').read_text().replace('const SWATCH_COLORS=[];','const SWATCH_COLORS=[];\n/*SITE:ENGINE v1*/'))
    s=page(OUT/'Редактор-сайта.html');s.set_input_files('#fSite',str(T/'site-cfg.html'));s.wait_for_timeout(800)
    ids=s.evaluate('()=>[...document.querySelectorAll("input[type=file]")].map(e=>[e.id,e.multiple])')
    s.set_input_files('#'+[i for i,m in ids if i!='fSite' and m][0],str(model));s.wait_for_timeout(1500)
    site=save(s,lambda:s.click('#btnSave'),'site-pin.html');h=site.read_text();ok('сайт сохраняется с движком текущей версии','OBJRT:START v'+VER in h)
    ed=(OUT/'Редактор-сайта.html').read_text()
    def blk(t,i):
        a=t.index('>',t.index('id="%s">'%i))+1;return t[a:t.index('</script>',a)]
    adapter=h[h.index('/*OBJRT:START'):h.index('/*OBJRT:END*/')+13]
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
    def smv(g,key,v):
        g.locator(f'#params input[type=range][data-key="{key}"]').evaluate('(el,v)=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}))}',v);g.wait_for_timeout(900)
    CEN=lambda g:g.evaluate('()=>{const a=modelGroup.children[0].geometry.attributes.position.array,s=new Set();for(let i=0;i<a.length;i+=3)s.add(+a[i].toFixed(1));return [...s].sort((x,y)=>x-y)}')
    SK=lambda g:g.evaluate('()=>[...document.querySelectorAll("#params input[type=range]")].map(e=>e.dataset.key)')
    for mode in ['hide','show','edit']:
        g=harness(mode);ok(f'{mode}: порядок ползунков на сайте тот же',SK(g)==order,SK(g))
        pins=g.locator('.obj-keep[data-k="pin"]');ok(f'{mode}: пометок фиксатора {0 if mode=="hide" else 1}',pins.count()==(0 if mode=='hide' else 1),pins.count())
        x0=g.evaluate('planes()')
        g.locator('#params .param-item:has([data-key="q0"]) .sx-lock input').check();g.wait_for_timeout(300)
        a0=CEN(g);smv(g,'q0',170);a1=CEN(g);ok(f'{mode}: ползунок ширины работает',abs(g.evaluate('planes()')[-1]-170)<.2,g.evaluate('planes()'))
        ok(f'{mode}: центр закреплённого паза на сайте не сдвинулся',abs((a1[1]+a1[2])/2-(a0[1]+a0[2])/2)<.15,(a0,a1))
        if mode=='edit':
            held=g.evaluate('planes()');pins.click();g.wait_for_timeout(900);ok('посетитель снял фиксатор, модель не дёрнулась',pins.get_attribute('aria-checked')=='false' and g.evaluate('planes()')==held,g.evaluate('planes()'))
            pins.click();g.wait_for_timeout(900);ok('и включил снова',pins.get_attribute('aria-checked')=='true');g.screenshot(path=str(T/'site-pin.png'))
        g.click('#reset-params-btn');g.wait_for_timeout(900);ok(f'{mode}: «Сброс» возвращает исходную форму',g.evaluate('planes()')==x0 and SK(g)==order,g.evaluate('planes()'))
    ok('нет ошибок JavaScript',not errors,errors[:5])
    b.close()
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}')
