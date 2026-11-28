# общий фиксатор центра, «свернуть все», зелёный квадратик показа на сайте, замок вместе с синхронизацией
import pathlib,re,json
exec(open(pathlib.Path(__file__).with_name('browser.py')).read().split('with sync_playwright() as p:')[0])
LUM=r"""()=>{const rgba=s=>{const m=s.match(/[0-9.]+/g).map(Number);return [m[0],m[1],m[2],m[3]===undefined?1:m[3]]};
 const over=(a,b)=>[0,1,2].map(i=>a[i]*a[3]+b[i]*(1-a[3])).concat(1);
 const back=el=>{const chain=[];for(let e=el;e;e=e.parentElement)chain.unshift(e);let c=[255,255,255,1];chain.forEach(e=>{c=over(rgba(getComputedStyle(e).backgroundColor),c)});return c};
 const L=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
 const cr=(a,b)=>(Math.max(L(a),L(b))+.05)/(Math.min(L(a),L(b))+.05);
 return [...document.querySelectorAll('#axes .row')].map(r=>{const cs=getComputedStyle(r),bg=back(r),pn=back(r.parentElement),bd=over(rgba(cs.borderTopColor),pn);
  return {lighter:L(bg)>L(pn),bg:+cr(bg,pn).toFixed(2),border:+cr(bd,pn).toFixed(2),w:parseFloat(cs.borderTopWidth),text:+cr(over(rgba(getComputedStyle(r.querySelector('.lt')).color),bg),bg).toFixed(1)}})}"""
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(accept_downloads=True,viewport={'width':1500,'height':900},color_scheme='light');ctx.route('**/*',route);errors=[]
    def page(path):
        g=ctx.new_page();g.on('pageerror',lambda e:errors.append(f'{path.name}: {e}'));g.on('dialog',lambda d:d.accept());g.goto(path.as_uri());g.wait_for_timeout(1200);return g
    def save(g,click,name):
        with g.expect_download(timeout=15000) as d: click()
        f=T/name;d.value.save_as(f);return f
    embed=lambda f:json.loads(re.search(r'<script id="embed" type="application/json">(.*?)</script>',f.read_text(),re.S).group(1))
    c=page(OUT/'Конвертер-OBJ-HTML.html');c.set_input_files('#f',str(T/'user-model.html'));c.wait_for_timeout(2500)
    def rw(key,g=c):return g.locator(f'#axes .row[data-key="{key}"]')
    def mv(key,val,g=c):
        rw(key,g).locator('input[type=range]').evaluate('(r,v)=>{r.value=v;r.dispatchEvent(new Event("input",{bubbles:true}))}',val);g.wait_for_timeout(250)
    V=lambda g=c:g.evaluate('()=>{const v=geoVals(g,st),o={};for(const k in v)o[k]=+v[k].toFixed(2);return o}')
    NUM=lambda keys,g=c:[float(rw(k,g).locator('.h input[type=number]').input_value()) for k in keys]
    W=['q3','q5','q7']
    MODEL=T/'user-model.html'
    c=page(OUT/'Конвертер-OBJ-HTML.html');c.set_input_files('#f',str(MODEL));c.wait_for_timeout(2500)
    def rw(key,g=c):return g.locator(f'#axes .row[data-key="{key}"]')
    def mv(key,val,g=c):
        rw(key,g).locator('input[type=range]').evaluate('(r,v)=>{r.value=v;r.dispatchEvent(new Event("input",{bubbles:true}))}',val);g.wait_for_timeout(250)
    V=lambda g=c:g.evaluate('()=>{const v=geoVals(g,st),o={};for(const k in v)o[k]=+v[k].toFixed(2);return o}')
    W=['q3','q5','q7'];walls=lambda v:[v[k] for k in W]
    c.evaluate('()=>{window.__solve=new Function(document.getElementById("core-src").textContent+";return dmSkSolve")()}')
    PL=lambda:c.evaluate('()=>[0,1,2].map(a=>{const e=__solve(st).c.find(c=>c.ax===a);return (e?e.by:st.sk.s[a]).map(x=>+x.toFixed(2))})')
    keys=c.evaluate('()=>st.dm.map((s,i)=>s.sk?i:-1).filter(i=>i>=0)')
    pin=lambda i:rw(f'q{i}').locator('.dqp input');lock=lambda i:rw(f'q{i}').locator('.dqk input')
    print('Наверху панели')
    ids=c.evaluate('()=>[...document.querySelectorAll("#thrBox input")].map(i=>i.id)')
    ok('галочки: резьба, все ползунки, масштаб и оси, все 🎯, масштаб %, размеры на модели',ids==['thr','allOn','onlyTot','allPin','scOn','dimAll'],ids)
    ok('галочки направления «Все от центра» больше нет',c.locator('#allAn').count()==0)
    ok('там же кнопка-шестерёнка «свернуть все»',c.locator('#thrBox button#allGear').count()==1 and '⚙' in c.locator('#thrBox button#allGear').text_content())
    cut=c.evaluate('()=>[...document.querySelectorAll("#thrBox span, #thrBox button")].filter(s=>s.offsetWidth<1||s.scrollWidth>s.clientWidth+1).map(s=>s.textContent)')
    ok('все подписи видны целиком',not cut,cut)
    print('Фиксатор центра у всех размеров')
    A=c.locator('#allPin');p0=PL();an=c.evaluate('()=>st.dm.map(s=>s.an)')
    ok('сначала не стоит',not A.is_checked() and not any(pin(i).is_checked() for i in keys))
    A.check();c.wait_for_timeout(500)
    ok('поставили наверху — 🎯 стоит на каждой карточке',all(pin(i).is_checked() for i in keys) and A.is_checked(),[pin(i).is_checked() for i in keys])
    ok('все фиксаторы в модели',sorted(map(int,c.evaluate('()=>Object.keys(st.cp||{})')))==keys)
    ok('деталь не дёрнулась, направления не менялись',PL()==p0 and c.evaluate('()=>st.dm.map(s=>s.an)')==an,(p0,PL()))
    pin(keys[1]).uncheck();c.wait_for_timeout(400)
    ok('сняли у одного — наверху «частично»',A.evaluate('e=>e.indeterminate') and not A.is_checked())
    A.click();c.wait_for_timeout(500);ok('из «частично» нажатие ставит всем',all(pin(i).is_checked() for i in keys) and A.is_checked())
    A.click();c.wait_for_timeout(500);ok('ещё нажатие — снято у всех',not any(pin(i).is_checked() for i in keys) and not c.evaluate('()=>Object.keys(st.cp||{}).length'))
    for i in keys:pin(i).check();c.wait_for_timeout(120)
    c.wait_for_timeout(300);ok('поставили по одному у всех — наверху стоит',A.is_checked() and not A.evaluate('e=>e.indeterminate'))
    A.uncheck();c.wait_for_timeout(500);c.click('#rs');c.wait_for_timeout(300)
    for i in [4,6]:lock(i).uncheck();c.wait_for_timeout(150)
    A.check();c.wait_for_timeout(500)
    MID=lambda:c.evaluate('()=>st.dm.map((s,i)=>{const ax=s.d.findIndex(x=>x),e=__solve(st).c.find(c=>c.ax===ax),t=e?e.by:st.sk.s[ax];return +((t[s.sk[0]]+t[s.sk[1]])/2).toFixed(1)})')
    m0=MID();mv('q3',18);v=V()
    ok('карманы без замка: стенки растут, все центры на месте',walls(v)==[18,18,18] and MID()==m0 and v['q4']<88,(v,m0,MID()))
    c.click('#rs');c.wait_for_timeout(400);ok('«Исходные размеры» фиксаторы не снимает',A.is_checked())
    A.uncheck();c.wait_for_timeout(400);c.click('#rs');c.wait_for_timeout(300)
    for i in [4,6]:lock(i).check();c.wait_for_timeout(150)
    print('Шестерёнка «свернуть все»')
    G=c.locator('#allGear');opened=lambda:c.locator('#axes .row .dset, #axes .row [data-cm]').count()
    ok('пока нечего сворачивать — кнопка неактивна',G.is_disabled() and opened()==0,opened())
    for k in ['q0','q3','q5']:rw(k).locator('button.gear').click();c.wait_for_timeout(300)
    ok('открыли настройки у трёх размеров — кнопка активна',opened()==3 and not G.is_disabled(),opened())
    c.click('#cmAdd');c.wait_for_timeout(400);n=opened();ok('открыт и составной размер',n==4,n)
    G.click();c.wait_for_timeout(500);ok('нажали — все свернулись',opened()==0 and c.locator('#axes button.gear.on').count()==0,opened())
    ok('кнопка снова неактивна, сами карточки на месте',G.is_disabled() and rw('q3').count()==1 and rw('c0').count()==1)
    rw('c0').locator('button.gear').click();c.wait_for_timeout(300);c.locator('.cmdel').click();c.wait_for_timeout(400)
    rw('q0').locator('button.gear').click();c.wait_for_timeout(300);ok('после этого шестерёнка карточки работает как раньше',opened()==1 and not G.is_disabled())
    G.click();c.wait_for_timeout(300)
    print('Квадратик «показывать на сайте»')
    CHK='''()=>[...document.querySelectorAll('#axes .row')].map(r=>{const e=r.querySelector('.chk');if(!e)return null;const m=getComputedStyle(e).accentColor.match(/[0-9.]+/g);return {key:r.dataset.key,on:e.checked,rgb:m?m.map(Number):null,w:e.offsetWidth}})'''
    green=lambda x:bool(x['rgb']) and x['rgb'][1]>x['rgb'][0]*1.5 and x['rgb'][1]>x['rgb'][2]*1.3
    for scheme in ['light','dark']:
        c.emulate_media(color_scheme=scheme);c.wait_for_timeout(300);L=c.evaluate(CHK)
        ok(f'{scheme}: квадратик есть на каждой карточке и он зелёный',len(L)>=9 and all(x and x['w']>=14 and green(x) for x in L),L[:3])
    c.emulate_media(color_scheme='light')
    chk=rw('q1').locator('.chk');chk.uncheck();c.wait_for_timeout(200)
    ok('сняли — карточка бледная',rw('q1').evaluate('r=>r.classList.contains("off")'))
    chk.check();c.wait_for_timeout(200);ok('поставили — обычная',not rw('q1').evaluate('r=>r.classList.contains("off")'))
    chk.uncheck();c.wait_for_timeout(200)
    other=c.evaluate('()=>getComputedStyle(document.querySelector(".dqk input")).accentColor')
    ok('замок и 🎯 остаются своего цвета',other!=chk.evaluate('e=>getComputedStyle(e).accentColor'),other)
    print('Замок вместе с синхронизацией')
    for i in [3,5,7]:lock(i).check();c.wait_for_timeout(150)
    for k,x,w in [('q3',20,20),('q5',14,14),('q7',60,74/3),('q3',9,9)]:
        mv(k,x);v=V();ok(f'все стенки под замком, ползунок {k}: все стенки идут вместе ({w:.2f})',all(abs(y-w)<.06 for y in walls(v)) and len(set(walls(v)))==1 and v['q4']==88,v)
    ok('замки остались',all(lock(i).is_checked() for i in [3,5,7]))
    mv('q0',250);ok('ползунок длины стенки под замком не меняет',walls(V())==[9,9,9],V())
    lock(3).uncheck();c.wait_for_timeout(150);lock(7).uncheck();c.wait_for_timeout(300)
    mv('q3',16);ok('замок только на второй стенке: первый ползунок двигает и её',walls(V())==[16,16,16],V())
    mv('q0',250);ok('и от длины все три стоят (связь не рвётся)',walls(V())==[16,16,16],V())
    tip=rw('q5').locator('.dqk').get_attribute('data-tip');ok('подсказка замка говорит про группу','групп' in tip,tip)
    lock(3).check();c.wait_for_timeout(150);lock(7).check();c.wait_for_timeout(300);c.click('#rs');c.wait_for_timeout(300)
    c.mouse.move(5,500);c.locator('#panel').screenshot(path=str(T/'conv-top.png'))
    print('Готовый файл и сайт')
    c.click('#bd');c.wait_for_timeout(2500)
    if c.locator('#trOk').is_visible():c.click('#trOk');c.wait_for_timeout(500)
    model=save(c,lambda:c.click('#bd'),'model-top.html');e=embed(model)
    ok('в модели новый движок текущей версии и снятый квадратик сохранён','OBJRT:START v'+VER in model.read_text() and 'q1' in e['ui']['off'],e['ui']['off'])
    vw=page(model);ok('в готовом файле верхних галочек нет, скрытого ползунка нет',not vw.locator('#thrBox').is_visible() and rw('q1',vw).count()==0)
    mv('q3',20,vw);v=V(vw);ok('готовый файл: стенки под замком идут вместе',walls(v)==[20,20,20],v)
    (T/'site-cfg.html').write_text((T/'site.html').read_text().replace('const SWATCH_COLORS=[];','const SWATCH_COLORS=[];\n/*SITE:ENGINE v1*/'))
    s=page(OUT/'Редактор-сайта.html');s.set_input_files('#fSite',str(T/'site-cfg.html'));s.wait_for_timeout(800)
    fid=s.evaluate('()=>[...document.querySelectorAll("input[type=file]")].map(e=>[e.id,e.multiple])')
    s.set_input_files('#'+[i for i,m in fid if i!='fSite' and m][0],str(model));s.wait_for_timeout(1500)
    site=save(s,lambda:s.click('#btnSave'),'site-top.html');h=site.read_text();ok('сайт сохраняется с движком текущей версии','OBJRT:START v'+VER in h)
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
    SV=lambda g:g.evaluate('()=>{const o={};document.querySelectorAll("#params input[type=range]").forEach(r=>o[r.dataset.key]=+(+r.value).toFixed(2));return o}')
    g=harness('hide');keys2=list(SV(g))
    ok('на сайте скрытого размера нет, стенки есть','q1' not in keys2 and all(k in keys2 for k in W),keys2)
    def swalls(w):
        s=SV(g);pl=g.evaluate('planes()');seg=[pl[i+1]-pl[i] for i in range(len(pl)-1)]
        return all(abs(s[k]-w)<.05 for k in W) and all(abs(seg[i]-w)<.11 for i in (0,2,4)) and all(abs(seg[i]-88)<.11 for i in (1,3)),(s,seg)
    for k,x,w in [('q3',20,20),('q5',14,14),('q7',60,74/3)]:
        smv(g,k,x);r,info=swalls(w);ok(f'сайт: стенки под замком идут вместе за ползунком {k} ({w:.2f})',r,info)
    smv(g,'q3',12);smv(g,'q0',250);r,info=swalls(12);ok('сайт: длина стенки под замком не меняет',r,info)
    ok('нет ошибок JavaScript',not errors,errors[:5])
    b.close()
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}')
