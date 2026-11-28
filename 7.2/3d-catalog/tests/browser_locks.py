# сквозная проверка замков: конвертер → модель → редактор сайта → работа на странице сайта
import pathlib,re,json
exec(open(pathlib.Path(__file__).with_name('browser.py')).read().split('with sync_playwright() as p:')[0])
X='()=>{const a=geo.attributes.position.array,s=new Set();for(let i=0;i<a.length;i+=3)s.add(+a[i].toFixed(1));const l=[...s].sort((x,y)=>x-y);return l.map(v=>+(v-l[0]).toFixed(1))}'
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(accept_downloads=True,viewport={'width':1500,'height':900});ctx.route('**/*',route);errors=[]
    def page(path):
        g=ctx.new_page();g.on('pageerror',lambda e:errors.append(str(e)));g.goto(path.as_uri());g.wait_for_timeout(1200);return g
    def save(g,click,name):
        with g.expect_download() as d: click()
        f=T/name;d.value.save_as(f);return f
    def move(g,i,v):
        g.locator('#axes input[type=range]').nth(i).evaluate('(el,v)=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}))}',v);g.wait_for_timeout(300)
    print('Конвертер')
    c=page(OUT/'Конвертер-OBJ-HTML.html');c.set_input_files('#f',str(T/'project.html'));c.wait_for_timeout(2000)
    k=c.locator('#axes .dqk input');ok('под каждым размером есть галочка замка',k.count()==2,k.count())
    before=c.evaluate(X);k.nth(0).check();c.wait_for_timeout(300);ok('установка замка не меняет модель',c.evaluate(X)==before)
    move(c,1,200);x=c.evaluate(X)
    ok('замок на ширине: паз растёт только внутри 120',x[-1]==120 and x[2]-x[1]>80,x)
    mx=c.locator('#axes input[type=range]').nth(1).get_attribute('max');ok('диапазон паза сузился',float(mx)<120,mx)
    move(c,0,150);ok('сам заблокированный ползунок двигается',c.evaluate(X)[-1]==150,c.evaluate(X))
    c.click('#rs');c.wait_for_timeout(300);ok('«Исходные размеры» возвращают форму, замок остаётся',c.evaluate(X)==before and k.nth(0).is_checked())
    c.screenshot(path=str(T/'converter-locks.png'))
    c.click('#bd');c.wait_for_timeout(2500);c.click('#trOk');c.wait_for_timeout(500)
    model=save(c,lambda:c.click('#bd'),'model-lock.html')
    v=page(model);vk=v.locator('#axes .dqk input');ok('в готовом файле модели замок сохранён',vk.count()==2 and vk.nth(0).is_checked() and not vk.nth(1).is_checked())
    move(v,1,200);ok('в готовом файле замок действует',v.evaluate(X)[-1]==120,v.evaluate(X))
    print('Редактор сайта')
    (T/'site-cfg.html').write_text((T/'site.html').read_text().replace('const SWATCH_COLORS=[];','const SWATCH_COLORS=[];\n/*SITE:ENGINE v1*/'))
    s=page(OUT/'Редактор-сайта.html');s.set_input_files('#fSite',str(T/'site-cfg.html'));s.wait_for_timeout(800)
    ids=s.evaluate('()=>[...document.querySelectorAll("input[type=file]")].map(e=>[e.id,e.multiple])')
    mid=[i for i,m in ids if i!='fSite' and m][0]
    s.set_input_files('#'+mid,str(model));s.wait_for_timeout(1500)
    s.get_by_role('button',name='Поведение').click();s.wait_for_timeout(500)
    sel=s.locator('#keepMode');ok('в «Поведении» есть выбор для замков, по умолчанию «скрыты»',sel.count()==1 and sel.input_value()=='hide')
    sel.scroll_into_view_if_needed();s.screenshot(path=str(T/'editor-locks.png'))
    sel.select_option('edit');s.wait_for_timeout(400)
    site=save(s,lambda:s.click('#btnSave'),'site-lock.html');h=site.read_text()
    ok('выбор сохраняется в сайте','"keep":{"mode":"edit"}' in h and 'OBJRT:START v'+VER in h)
    s.set_input_files('#fSite',str(site));s.wait_for_timeout(800);s.get_by_role('button',name='Поведение').click();s.wait_for_timeout(400)
    ok('после повторной загрузки выбор на месте',s.locator('#keepMode').input_value()=='edit')
    s.locator('#keepMode').select_option('hide');s.wait_for_timeout(300)
    h2=save(s,lambda:s.click('#btnSave'),'site-lock-hide.html').read_text();ok('возврат к «скрыты» убирает настройку','"keep":' not in h2.split('id="site-config">')[1].split('</script>')[0])
    ed=(OUT/'Редактор-сайта.html').read_text()
    def blk(t,i):
        a=t.index('>',t.index('id="%s">'%i))+1;return t[a:t.index('</script>',a)]
    print('Страница сайта')
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
    def mv(g,i,v):
        g.locator('#params input[type=range]').nth(i).evaluate('(el,v)=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}))}',v);g.wait_for_timeout(900)
    for mode,name in [('hide','скрыты'),('show','видны без снятия'),('edit','можно снимать')]:
        g=harness(mode);n=g.locator('.obj-keep');start=g.evaluate('planes()')
        want={'hide':0,'show':1,'edit':1}[mode];ok(f'{name}: галочек на странице {want}',n.count()==want,n.count())
        mv(g,1,200);x=g.evaluate('planes()');ok(f'{name}: замок действует',x[-1]==120 and x[2]-x[1]>80,x)
        if mode=='show':
            n.click();g.wait_for_timeout(300);mv(g,1,200);ok('видны без снятия: нажатие ничего не меняет',g.evaluate('planes()')[-1]==120 and n.get_attribute('role') is None)
            g.screenshot(path=str(T/'site-show.png'))
        if mode=='edit':
            cbs=g.locator('.sx-lock input');ok('рядом работают прежние галочки выбора ползунка',cbs.count()==2,cbs.count())
            ok('галочка замка отмечена',n.get_attribute('aria-checked')=='true')
            held=g.evaluate('planes()');n.click();g.wait_for_timeout(1000)
            ok('посетитель снял замок (даже когда выбран другой ползунок), модель не дёрнулась',n.get_attribute('aria-checked')=='false' and g.evaluate('planes()')==held,g.evaluate('planes()'))
            cbs.nth(1).check();g.wait_for_timeout(300);mv(g,1,150);x=g.evaluate('planes()');ok('без замка деталь растёт вместе с пазом',x[-1]>121,x)
            g.screenshot(path=str(T/'site-edit.png'))
            g.click('#undo-params-btn');g.wait_for_timeout(400);ok('«Шаг назад» отменяет движение',g.evaluate('planes()')==held,g.evaluate('planes()'))
            g.click('#undo-params-btn');g.wait_for_timeout(400);ok('ещё «Шаг назад» возвращает замок',n.get_attribute('aria-checked')=='true',n.get_attribute('aria-checked'))
            n.click();g.wait_for_timeout(900);mv(g,1,150)
        g.click('#reset-params-btn');g.wait_for_timeout(900)
        ok(f'{name}: «Сброс» возвращает исходную форму и замок',g.evaluate('planes()')==start and (mode!='edit' or n.get_attribute('aria-checked')=='true'),g.evaluate('planes()'))
    ok('нет ошибок JavaScript',not errors,errors[:5])
    b.close()
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}')
