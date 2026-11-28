# составные размеры и выбор участков каркаса: редактор размеров → конвертер → сайт
import pathlib,re,json
exec(open(pathlib.Path(__file__).with_name('browser.py')).read().split('with sync_playwright() as p:')[0])
X='()=>{const a=geo.attributes.position.array,s=new Set();for(let i=0;i<a.length;i+=3)s.add(+a[i].toFixed(1));const l=[...s].sort((x,y)=>x-y);return l.map(v=>+(v-l[0]).toFixed(1))}'
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(accept_downloads=True,viewport={'width':1500,'height':900});ctx.route('**/*',route);errors=[]
    def page(path):
        g=ctx.new_page();g.on('pageerror',lambda e:errors.append(f'{path.name}: {e}'));g.on('dialog',lambda d:d.accept());g.goto(path.as_uri());g.wait_for_timeout(1200);return g
    def save(g,click,name):
        with g.expect_download(timeout=15000) as d: click()
        f=T/name;d.value.save_as(f);return f
    def data(f):return json.loads(re.search(r'id="__CAD_ANNOTATIONS_DATA__"[^>]*>(.*?)</script>',f.read_text(),re.S).group(1))
    def fire(loc,js):loc.evaluate(js);loc.page.wait_for_timeout(300)
    CLICK='el=>el.click()'
    print('Редактор размеров: каркас')
    e=page(OUT/'mesurments.html');e.set_input_files('#file-input',str(T/'project.html'));e.wait_for_timeout(1200)
    cards=lambda:e.locator('input[data-action="name"]').count()
    fire(e.locator('#btn-skeleton'),CLICK)
    fire(e.locator('#sk-panel [data-ax="0"]'),CLICK)
    picks=e.locator('#sk-panel [data-pick]');total=picks.count();add=e.locator('#sk-panel [data-add]')
    ok('в таблице есть галочки «Взять», кнопка пока неактивна',total>=3 and add.is_disabled(),total)
    have=e.locator('#sk-panel td:has-text("есть")').count()
    fire(picks.nth(0),CLICK);fire(picks.nth(2),CLICK)
    ok('отмечено два участка','(2)' in add.inner_text(),add.inner_text())
    n0=cards();fire(add,CLICK);ok('добавлено ровно два отмеченных',cards()==n0+2,cards()-n0)
    ok('у добавленных участков теперь «есть»',e.locator('#sk-panel td:has-text("есть")').count()==have+2 and e.locator('#sk-panel [data-pick]').count()==total-2)
    sp=[a['spans'] for a in data(save(e,lambda:fire(e.locator('#btn-export-html'),CLICK),'pick.html'))['annotations'][n0:]]
    ok('это именно выбранные участки (1-й и 3-й свободные)',len(sp)==2 and all(s[0]['j']-s[0]['i']==1 and s[0]['axis']=='x' for s in sp),sp)
    fire(e.locator('#sk-panel [data-pick-missing]'),CLICK);m=int(re.search(r'\((\d+)\)',add.inner_text()).group(1))
    ok('«Отметить все недостающие» только отмечает',cards()==n0+2,cards())
    if m:
        fire(e.locator('#sk-panel [data-pick]:checked').first,CLICK);ok('любую галочку можно снять','(%d)'%(m-1) in add.inner_text(),add.inner_text())
    fire(e.locator('#sk-panel [data-ax="1"]'),CLICK);fire(e.locator('#sk-panel [data-pick]').nth(0),CLICK)
    n1=cards();fire(add,CLICK);ok('отметки с разных осей добавляются вместе',cards()==n1+max(m-1,0)+1,(cards()-n1,m))
    print('Редактор размеров: составной размер')
    e=page(OUT/'mesurments.html');e.set_input_files('#file-input',str(T/'project.html'));e.wait_for_timeout(1200)
    fire(e.locator('#btn-skeleton'),CLICK);fire(e.locator('#sk-panel [data-ax="0"]'),CLICK);fire(e.locator('#sk-panel [data-pick="0"]'),CLICK);fire(e.locator('#sk-panel [data-add]'),CLICK)
    e.locator('input[data-action="name"]').nth(2).evaluate('el=>{el.value="Стенка";el.dispatchEvent(new Event("input",{bubbles:true}))}')
    fire(e.locator('#btn-comp-add'),CLICK);card=e.locator('[data-comp-card]')
    ok('появилась пустая карточка составного размера',card.count()==1 and card.locator('[data-member]').count()==3 and 'хотя бы два' in card.inner_text(),card.count())
    card.locator('[data-action="name"]').evaluate('el=>{el.value="Паз и стенка";el.dispatchEvent(new Event("input",{bubbles:true}))}')
    fire(card.locator('[data-member]').nth(1),CLICK);fire(card.locator('[data-member]').nth(2),CLICK)
    t=card.inner_text();ok('видна сумма 54 = 42 + 12','54.00 мм = 42.00 + 12.00' in t,t)
    notes=e.locator('[data-comp-note]')
    ok('у входящих размеров есть пометка',notes.count()==2 and 'Паз и стенка' in notes.nth(0).inner_text(),notes.count())
    card.locator('[data-action="amin"]').evaluate('el=>{el.value=20;el.dispatchEvent(new Event("change",{bubbles:true}))}')
    card.locator('[data-action="amax"]').evaluate('el=>{el.value=110;el.dispatchEvent(new Event("change",{bubbles:true}))}')
    fire(e.locator('[data-action="collapse"]').nth(1),CLICK);ok('пометка видна и в свёрнутой карточке',e.locator('[data-comp-note]').count()==2)
    fire(card.locator('[data-member]').nth(0),CLICK);ok('перекрывающиеся размеры — предупреждение','Перекрывают' in card.inner_text(),card.inner_text())
    fire(card.locator('[data-member]').nth(0),CLICK)
    e.screenshot(path=str(T/'mes-comp.png'))
    prj=save(e,lambda:fire(e.locator('#btn-export-html'),CLICK),'comp-exported.html');d=data(prj)
    cm=d['composites'][0];ok('составной сохранён в файле',len(d['composites'])==1 and [cm[k] for k in ('name','members','amin','amax','color','param','limit')]==['Паз и стенка',[1,2],20,110,'#8b5cf6',True,'abs'] and d['order']==['c0','a0','a1','a2'],(d.get('composites'),d.get('order')))
    e2=page(OUT/'mesurments.html');e2.set_input_files('#file-input',str(prj));e2.wait_for_timeout(1500)
    c2=e2.locator('[data-comp-card]');ok('при повторном открытии восстановлен',c2.count()==1 and c2.locator('[data-member]:checked').count()==2 and e2.locator('[data-comp-note]').count()==2,c2.count())
    fire(e2.locator('[data-action="delete"]').nth(3),CLICK);ok('удалённый размер выходит из состава',c2.locator('[data-member]:checked').count()==1 and 'хотя бы два' in c2.inner_text())
    fire(c2.locator('[data-action="delete"]'),CLICK);ok('составной удаляется, размеры остаются',e2.locator('[data-comp-card]').count()==0 and e2.locator('input[data-action="name"]').count()==2 and e2.locator('[data-comp-note]').count()==0)
    print('Конвертер')
    c=page(OUT/'Конвертер-OBJ-HTML.html');c.set_input_files('#f',str(prj));c.wait_for_timeout(2000)
    K='()=>plist().map(p=>p.key)';keys=c.evaluate(K);ok('порядок из редактора: масштаб, составной (он выше), три размера',keys==['sc','c0','q0','q1','q2'],keys)
    V='()=>{const v=geoVals(g,st);return ["q0","q1","q2","c0"].map(k=>+v[k].toFixed(2))}'
    def mv(g,key,val):
        g.evaluate('([k,v])=>{const r=ROWS[k].rg;r.value=v;r.dispatchEvent(new Event("input",{bubbles:true}))}',[key,val]);g.wait_for_timeout(300)
    ok('пометка у входящих, у ширины её нет',c.locator('#axes .cmin').count()==2 and 'Паз и стенка' in c.locator('#axes .cmin').nth(0).inner_text(),c.locator('#axes .cmin').count())
    ok('у составного перечислен состав','Паз + Стенка' in c.locator('#axes .cmls').inner_text(),c.locator('#axes .cmls').inner_text())
    mv(c,'c0',81);v=c.evaluate(V);x=c.evaluate(X);ok('составной меняет паз и стенку пропорционально',v==[120,63,18,81] and x[1]==18 and x[2]-x[1]==63,(v,x))
    mv(c,'q1',50);v=c.evaluate(V);ok('отдельный ползунок паза меняет сумму',v[1]==50 and v[2]==18 and v[3]==68,v)
    c.locator('#axes .dqk input').nth(0).check();c.wait_for_timeout(300);mv(c,'c0',110);v=c.evaluate(V);ok('с замком на ширине ширина держится, пропорция 50:18',v[0]==120 and abs(v[1]/v[2]-50/18)<.02 and v[3]>68,v)
    c.click('#rs');c.wait_for_timeout(300);v=c.evaluate(V);ok('«Исходные размеры» возвращают всё',v==[120,42,12,54] and c.locator('#axes .cmin').count()==2,v)
    c.locator('#axes .row',has=c.locator('.cmls')).locator('.lt').fill('Карман');c.wait_for_timeout(300)
    ok('переименование составного обновляет пометки','Карман' in c.locator('#axes .cmin').nth(0).inner_text(),c.locator('#axes .cmin').nth(0).inner_text())
    c.screenshot(path=str(T/'converter-comp.png'))
    c.click('#bd');c.wait_for_timeout(2500);c.click('#trOk');c.wait_for_timeout(500)
    model=save(c,lambda:c.click('#bd'),'model-comp.html')
    vw=page(model);ok('в готовом файле составной и пометки есть',vw.locator('#axes .cmls').count()==1 and vw.locator('#axes .cmin').count()==2)
    mv(vw,'c0',81);ok('и ползунок работает',vw.evaluate(V)[1:]==[63,18,81],vw.evaluate(V))
    c3=page(OUT/'Конвертер-OBJ-HTML.html');c3.set_input_files('#f',str(T/'project-comp.html'));c3.wait_for_timeout(2000)
    ok('выноска перед размерами не сбивает состав','Паз + Стенка' in c3.locator('#axes .cmls').inner_text(),c3.locator('#axes .cmls').inner_text())
    print('Редактор сайта')
    s=page(OUT/'Редактор-сайта.html');s.set_input_files('#fSite',str(T/'site-cfg.html'));s.wait_for_timeout(800)
    ids=s.evaluate('()=>[...document.querySelectorAll("input[type=file]")].map(e=>[e.id,e.multiple])')
    s.set_input_files('#'+[i for i,m in ids if i!='fSite' and m][0],str(model));s.wait_for_timeout(1500)
    site=save(s,lambda:s.click('#btnSave'),'site-comp.html');h=site.read_text();ok('сайт сохраняется с движком текущей версии','OBJRT:START v'+VER in h)
    print('Страница сайта')
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
    g=harness('hide');P=g.locator('#params input[type=range]')
    def pv():return g.evaluate('()=>[...document.querySelectorAll("#params input[type=range]")].map(r=>+(+r.value).toFixed(1))')
    notes=g.locator('.obj-in');ok('на сайте у входящих есть пометка',notes.count()==2 and 'Входит в «Карман»' in notes.nth(0).inner_text(),(notes.count(),g.locator('#params').inner_text()))
    start=pv();keys=g.evaluate('()=>[...document.querySelectorAll("#params input[type=range]")].map(r=>r.dataset.key)');ok('ползунки на сайте в том же порядке',keys in (['c0','q0','q1','q2'],['sc','c0','q0','q1','q2']),keys)
    def sm(key,val):
        g.locator(f'#params input[data-key="{key}"]').evaluate('(el,v)=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}))}',val);g.wait_for_timeout(900)
    def val(key):return round(float(g.locator(f'#params input[data-key="{key}"]').input_value()),1)
    sm('c0',81);x=g.evaluate('planes()');ok('составной на сайте двигает оба размера и их ползунки',val('q1')==63 and val('q2')==18 and x[1]==18,(val('q1'),val('q2'),x))
    sm('q1',50);ok('отдельный ползунок на сайте обновляет составной',val('c0')==68,val('c0'))
    g.screenshot(path=str(T/'site-comp.png'))
    g.click('#reset-params-btn');g.wait_for_timeout(900);ok('«Сброс» возвращает всё, пометки на месте',pv()==start and g.locator('.obj-in').count()==2,(pv(),start))
    ok('нет ошибок JavaScript',not errors,errors[:5])
    b.close()
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}')
