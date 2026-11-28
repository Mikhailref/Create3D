# функции модели (односторонняя связь) и блок «Тестовые функции»: конвертер → файл модели → редактор сайта
import pathlib,re,json
exec(open(pathlib.Path(__file__).with_name('browser.py')).read().split('with sync_playwright() as p:')[0])
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(accept_downloads=True,viewport={'width':1500,'height':900});ctx.route('**/*',route);errors=[]
    def page(path):
        g=ctx.new_page();g.on('pageerror',lambda e:errors.append(f'{path.name}: {e}'));g.on('dialog',lambda d:d.accept());g.goto(path.as_uri());g.wait_for_timeout(1200);return g
    def save(g,click,name):
        with g.expect_download(timeout=15000) as d: click()
        f=T/name;d.value.save_as(f);return f
    embed=lambda f:json.loads(re.search(r'<script id="embed" type="application/json">(.*?)</script>',f.read_text(),re.S).group(1))
    def export(c,name):
        c.click('#bd');c.wait_for_timeout(2500)
        if c.locator('#trOk').count() and c.locator('#trOk').is_visible():c.click('#trOk');c.wait_for_timeout(500)
        return save(c,lambda:c.click('#bd'),name)
    def mv(g,key,val):
        g.locator(f'#axes .row[data-key="{key}"] input[type=range]').evaluate('(r,v)=>{r.value=v;r.dispatchEvent(new Event("input",{bubbles:true}))}',val);g.wait_for_timeout(250)
    V=lambda g:g.evaluate('()=>{const v=geoVals(g,st),o={};for(const k in v)o[k]=+v[k].toFixed(1);return o}')
    ST=lambda g,k:g.evaluate(f'()=>JSON.stringify(st.{k})')
    ck=lambda g,f='ow':g.locator(f'.fnrow[data-fn="{f}"] input.fnck')

    print('Конвертер: блок функций')
    c=page(OUT/'Конвертер-OBJ-HTML.html')
    ok('до загрузки модели блок функций скрыт',not c.locator('#fnBox').is_visible())
    c.set_input_files('#f',str(T/'project.html'));c.wait_for_timeout(2000)
    ok('после загрузки блок функций виден',c.locator('#fnBox').is_visible())
    ok('есть блок «Тестовые функции» с функцией «Односторонняя связь»','Тестовые функции' in c.locator('#fnTest').text_content() and c.locator('#fnTest .fnrow[data-fn="ow"]').count()==1 and 'Односторонняя связь' in c.locator('#fnTest .fnrow[data-fn="ow"]').text_content())
    ok('в основном блоке её нет',c.locator('#fnMain .fnrow').count()==0)
    ok('у функции есть квадратик с галочкой, выключен',ck(c).count()==1 and not ck(c).is_checked() and c.evaluate('()=>st.ow')is None)
    cut=c.evaluate('()=>[...document.querySelectorAll("#fnBox *")].filter(s=>s.children.length===0&&s.offsetWidth>0&&s.scrollWidth>s.clientWidth+1).map(s=>s.textContent)')
    ok('подписи блока видны целиком',not cut,cut)
    print('Выключена: прежняя логика')
    mv(c,'q1',150);w=V(c)['q0'];mv(c,'q1',42);ok('карман 150 → ширина растёт (188.1), карман 42 → ширина возвращается (120)',abs(w-188.1)<.2 and abs(V(c)['q0']-120)<.2,(w,V(c)))
    print('Включена')
    ck(c).check();c.wait_for_timeout(300)
    ok('галочка включила функцию в модели',c.evaluate('()=>st.ow')==1)
    ok('пока в тестовом блоке: пометка, что в редактор не пойдёт','редактор' in c.locator('.fnrow[data-fn="ow"] .fnst').text_content().lower() and 'не' in c.locator('.fnrow[data-fn="ow"] .fnst').text_content().lower(),c.locator('.fnrow[data-fn="ow"] .fnst').text_content())
    mv(c,'q1',150);mv(c,'q1',42);x=V(c)
    ok('ширина выросла и назад не сжалась (188.1)',abs(x['q0']-188.1)<.2 and abs(x['q1']-42)<.2,x)
    mv(c,'q1',30);x=V(c);ok('карман 30: ширина держится 188.1',abs(x['q0']-188.1)<.2,x)
    mv(c,'q1',200);x=V(c);ok('карман 200 больше прежнего: ширина растёт дальше (238.1)',abs(x['q0']-238.1)<.3,x)
    c.click('#rs');c.wait_for_timeout(300)
    ok('«Исходные размеры»: форма вернулась, функция и её место остались',abs(V(c)['q0']-120)<.2 and c.evaluate('()=>st.ow')==1 and ck(c).is_checked() and c.evaluate('()=>st.rh')is None,(V(c),c.evaluate('()=>[st.ow,st.rh]')))
    mv(c,'q1',150);mv(c,'q1',42);ok('после сброса удержание работает снова',abs(V(c)['q0']-188.1)<.2,V(c))
    ck(c).uncheck();c.wait_for_timeout(300)
    ok('выключили: функция снята, удержание снято, ширина 120',c.evaluate('()=>st.ow')is None and c.evaluate('()=>st.rh')is None and abs(V(c)['q0']-120)<.2,(V(c),c.evaluate('()=>[st.ow,st.rh]')))
    mv(c,'q1',150);mv(c,'q1',42);ok('дальше работает прежняя логика',abs(V(c)['q0']-120)<.2,V(c))
    ck(c).check();c.wait_for_timeout(300);mv(c,'q1',150);mv(c,'q1',42)

    print('Файл модели: функция включена, но в тестовом блоке')
    mt=export(c,'model-fn-test.html');e=embed(mt);s=e['geo']['st']
    ok('в файл для редактора функция не записана',s.get('ow') is None and 'rh' not in s,{k:s.get(k) for k in ('ow','rh','tx')})
    ok('но запомнено, что в конвертере она была включена (tx)',s.get('tx',{}).get('ow')==1 and not s.get('fm'),s.get('tx'))
    ok('в tx сохранено, что именно удерживалось (чтобы продолжить с того же места)',bool(s['tx'].get('rh')),s.get('tx'))
    t=page(mt);t.wait_for_timeout(500)
    ok('в готовом файле (просмотр) блока функций нет',not t.locator('#fnBox').is_visible())
    c2=page(OUT/'Конвертер-OBJ-HTML.html');c2.set_input_files('#f',str(mt));c2.wait_for_timeout(2000)
    ok('снова открыли в конвертере: функция включена и стоит в тестовом блоке',c2.evaluate('()=>st.ow')==1 and ck(c2).is_checked() and c2.locator('#fnTest .fnrow[data-fn="ow"]').count()==1 and c2.evaluate('()=>st.tx')is None,(c2.evaluate('()=>[st.ow,st.tx]')))
    ok('форма сохранилась (ширина 188.1)',abs(V(c2)['q0']-188.1)<.2,V(c2))
    mv(c2,'q1',200);mv(c2,'q1',42);ok('и удержание продолжает работать (238.1)',abs(V(c2)['q0']-238.1)<.3,V(c2))

    print('Перенос функции в основные')
    mvb=c.locator('.fnrow[data-fn="ow"] button.fnmv')
    ok('у функции есть кнопка переноса',mvb.count()==1,mvb.count())
    mvb.click();c.wait_for_timeout(300)
    ok('функция перешла в основной блок',c.locator('#fnMain .fnrow[data-fn="ow"]').count()==1 and c.locator('#fnTest .fnrow').count()==0 and c.evaluate('()=>st.fm&&st.fm.ow')==1)
    ok('галочка не слетела, пометка «передаётся в редактор»',ck(c).is_checked() and 'передаётся' in c.locator('.fnrow[data-fn="ow"] .fnst').text_content(),c.locator('.fnrow[data-fn="ow"] .fnst').text_content())
    c.click('#rs');c.wait_for_timeout(300)
    mm=export(c,'model-fn-main.html');e=embed(mm);s=e['geo']['st']
    ok('в файл для редактора функция записана',s.get('ow')==1 and (s.get('fm') or {}).get('ow')==1 and 'tx' not in s,{k:s.get(k) for k in ('ow','fm','tx')})
    c3=page(OUT/'Конвертер-OBJ-HTML.html');c3.set_input_files('#f',str(mm));c3.wait_for_timeout(2000)
    ok('снова открыли: функция включена и стоит в основном блоке',ck(c3).is_checked() and c3.locator('#fnMain .fnrow[data-fn="ow"]').count()==1 and c3.evaluate('()=>st.ow')==1)
    c.click('#rs');c.wait_for_timeout(300);ok('«Исходные размеры» не уводят функцию из основного блока',c.locator('#fnMain .fnrow[data-fn="ow"]').count()==1 and ck(c).is_checked())
    c.locator('.fnrow[data-fn="ow"] button.fnmv').click();c.wait_for_timeout(300)
    ok('обратно в тестовые',c.locator('#fnTest .fnrow[data-fn="ow"]').count()==1 and not c.evaluate('()=>st.fm&&st.fm.ow'))
    c.locator('.fnrow[data-fn="ow"] button.fnmv').click();c.wait_for_timeout(300)
    c.screenshot(path=str(T/'conv-func.png'))
    ck(c).uncheck();c.wait_for_timeout(300)
    mo=export(c,'model-fn-off.html');s=embed(mo)['geo']['st']
    ok('выключенная функция в файл не попадает',s.get('ow') is None and 'tx' not in s,{k:s.get(k) for k in ('ow','tx')})

    print('Редактор сайта')
    (T/'site-cfg.html').write_text((T/'site.html').read_text().replace('const SWATCH_COLORS=[];','const SWATCH_COLORS=[];\n/*SITE:ENGINE v1*/'))
    ed=(OUT/'Редактор-сайта.html').read_text()
    def registry(f):
        h=f.read_text();return json.loads(re.search(r'id="obj-models-data">(.*?)</script>',h,re.S).group(1).replace('\\u003c','<'))['models']
    s0=page(OUT/'Редактор-сайта.html');s0.set_input_files('#fSite',str(T/'site-cfg.html'));s0.wait_for_timeout(800)
    mid=[i for i,m in s0.evaluate('()=>[...document.querySelectorAll("input[type=file]")].map(e=>[e.id,e.multiple])') if i!='fSite' and m][0]
    def one(f):
        s2=page(OUT/'Редактор-сайта.html');s2.set_input_files('#fSite',str(T/'site-cfg.html'));s2.wait_for_timeout(600);s2.set_input_files('#'+mid,str(f));s2.wait_for_timeout(1800);return s2
    s=one(mm);ok('модель добавлена',s.locator('.mcard').count()==1,s.locator('.mcard').count())
    log=s.evaluate('()=>document.body.innerText')
    ok('в журнале добавления сказано про включённую функцию',re.search(r'функци\w* «Односторонняя связь» включена',log) is not None,log[-300:])
    s.locator('.mcard button',has_text='Настроить').first.click();s.wait_for_timeout(500)
    fn=s.locator('.meditor .mfn[data-fn="ow"]');ok('в настройках модели есть строка функции «Односторонняя связь»',fn.count()==1 and 'Односторонняя связь' in fn.text_content(),fn.count())
    cb=fn.locator('input.mfn-ck');ok('для этой модели функция включена',cb.is_checked())
    ok('в списке моделей видно, что используется функция',s.locator('.mcard .fnb').count()==1 and 'Односторонняя связь' in s.locator('.mcard .fnb').text_content(),s.locator('.mcard').first.text_content()[:200])
    cb.uncheck();s.wait_for_timeout(400)
    R=registry(save(s,lambda:s.click('#btnSave'),'site-fn2.html'));st=R[0]['geo']['st']
    ok('выключили в редакторе: в модели сайта функции нет',st.get('ow') is None and 'rh' not in st,st.get('ow'))
    s.locator('.meditor .mfn[data-fn="ow"] input.mfn-ck').check();s.wait_for_timeout(400)
    R=registry(save(s,lambda:s.click('#btnSave'),'site-fn3.html'));ok('включили обратно: функция в модели сайта есть',R[0]['geo']['st'].get('ow')==1)
    s.screenshot(path=str(T/'editor-func.png'))
    s=one(mt);log=s.evaluate('()=>document.body.innerText')
    ok('в журнале сказано, что тестовая функция на сайт не передана',re.search(r'тестов\w* функци\w* «Односторонняя связь»[^\n]*не передан',log) is not None,log[-300:])
    s.locator('.mcard button',has_text='Настроить').first.click();s.wait_for_timeout(500)
    fn=s.locator('.meditor .mfn[data-fn="ow"]');cb=fn.locator('input.mfn-ck')
    ok('тестовая модель: функция для сайта выключена',cb.count()==1 and not cb.is_checked())
    ok('редактор поясняет, что в конвертере она была включена только как тестовая','тест' in fn.locator('.mfn-note').text_content().lower(),fn.text_content())
    R=registry(save(s,lambda:s.click('#btnSave'),'site-fn4.html'));ok('на сайт эта модель идёт без функции',R[0]['geo']['st'].get('ow') is None)
    cb.check();s.wait_for_timeout(400)
    R=registry(save(s,lambda:s.click('#btnSave'),'site-fn5.html'));st=R[0]['geo']['st']
    ok('включили в редакторе: функция есть, пометка теста убрана',st.get('ow')==1 and 'tx' not in st,{k:st.get(k) for k in ('ow','tx')})
    ok('и удержание из конвертера восстановлено',bool(st.get('rh')),st.get('rh'))
    s=one(mo);R=registry(save(s,lambda:s.click('#btnSave'),'site-fn0.html'));ok('модель без функции остаётся без функции',R[0]['geo']['st'].get('ow') is None and 'tx' not in R[0]['geo']['st'])
    print('Сайт')
    h=(T/'site-fn5.html').read_text();SITEF='site-fn5.html'
    ok('в движке сайта есть односторонняя связь и текущая версия','function owSet' in h and 'OBJRT:START v'+VER in h)
    print('Страница сайта: функция работает у посетителя')
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
    for SITEF,want,name in [('site-fn3.html',True,'функция включена'),('site-fn0.html',False,'функции нет')]:
        h=(T/SITEF).read_text();adapter=h[h.index('/*OBJRT:START'):h.index('/*OBJRT:END*/')+13]
        data=re.search(r'<script type="application/json" id="obj-models-data">.*?</script>',h,re.S).group(0)
        g=harness('hide');W0=g.evaluate('planes()')[-1]
        hmv(g,'q1',150);w1=g.evaluate('planes()')[-1];hmv(g,'q1',42);w2=g.evaluate('planes()')[-1]
        ok(f'на странице сайта ({name}): карман 150 — ширина растёт',w1>W0+60,(W0,w1))
        ok(f'на странице сайта ({name}): карман обратно 42 — ширина '+('держится' if want else 'возвращается'),(abs(w2-w1)<.2) if want else abs(w2-W0)<.2,(W0,w1,w2))
        g.click('#reset-params-btn');g.wait_for_timeout(900)
        ok(f'на странице сайта ({name}): «Сброс» возвращает исходную ширину',abs(g.evaluate('planes()')[-1]-W0)<.2,g.evaluate('planes()'))
        if want:
            hmv(g,'q1',150);hmv(g,'q1',42);ok('после «Сброса» функция работает снова',abs(g.evaluate('planes()')[-1]-w1)<.2,g.evaluate('planes()'))
    ok('нет ошибок JavaScript',not errors,errors[:5])
    b.close()
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}')
