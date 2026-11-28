# синхронизация на модели пользователя в браузере; общие галочки и вид карточек в конвертере
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
    print('Синхронизация: модель пользователя в конвертере')
    bad=None
    for x in [12,18,22,24,25,26,30,40,60,250,30,24,15]:
        mv('q3',x);v=V();n=NUM(W)
        if not(v['q3']==v['q5']==v['q7'] and n[0]==n[1]==n[2] and v['q4']==88 and v['q6']==88 and v['q0']<=250):bad=(x,v,n);break
    ok('ползунок стенки: три стенки равны на всём ходу, карманы 88, длина ≤ 250',not bad,bad)
    mv('q3',250);v=V();ok('упор: стенки по 24.67, длина 250',v['q3']==v['q5']==v['q7'] and 24.6<=v['q3']<=24.67 and 249.8<=v['q0']<=250,v)
    mv('q5',3);v=V();ok('ползунок второй стенки двигает все',v['q3']==v['q5']==v['q7']==3,v)
    mv('q7',250);v=V();ok('ползунок третьей стенки останавливается там же',v['q3']==v['q5']==v['q7'] and 24.6<=v['q3']<=24.67,v)
    c.click('#rs');c.wait_for_timeout(300)
    print('Общие галочки наверху')
    TOP=c.locator('#thrBox')
    ids=c.evaluate('()=>[...document.querySelectorAll("#thrBox input")].map(i=>i.id)')
    ok('наверху: резьба, все ползунки, масштаб и оси, все 🎯, масштаб %, размеры на модели',ids==['thr','allOn','onlyTot','allPin','scOn','dimAll'],ids)
    cut=c.evaluate('()=>[...document.querySelectorAll("#thrBox span")].filter(s=>s.offsetWidth<1||s.scrollWidth>s.clientWidth+1).map(s=>s.textContent)')
    ok('все подписи видны целиком',not cut,cut)
    ok('внизу галочки масштаба больше нет',c.locator('#axes input#scOn').count()==0 and c.locator('#scOn').count()==1)
    SC=c.locator('#scOn');ok('масштаб включён: ползунок есть',SC.is_checked() and rw('sc').count()==1)
    SC.uncheck();c.wait_for_timeout(300);ok('сняли — ползунка масштаба нет',rw('sc').count()==0)
    SC.check();c.wait_for_timeout(300);ok('поставили — ползунок вернулся',rw('sc').count()==1)
    c.locator('[data-ll="en"]').click();c.wait_for_timeout(300);c.locator('[data-ll="ru"]').click();c.wait_for_timeout(300);ok('смена языка не сбрасывает галочки',SC.is_checked())
    print('Вид карточек')
    for scheme in ['light','dark']:
        c.emulate_media(color_scheme=scheme);c.wait_for_timeout(400);L=c.evaluate(LUM)
        ok(f'{scheme}: карточка светлее панели',all(x['lighter'] and x['bg']>=1.12 for x in L),L[:2])
        ok(f'{scheme}: граница заметна',all(x['border']>=2 and x['w']>=2 for x in L),L[:2])
        ok(f'{scheme}: названия читаются',all(x['text']>=4.5 for x in L),L[:2])
        cut=c.evaluate('()=>[...document.querySelectorAll("#axes .row .lt")].filter(e=>e.offsetWidth<1||e.scrollWidth>e.clientWidth+1).map(e=>e.value||e.textContent)')
        ok(f'{scheme}: названия размеров видны целиком',not cut,cut)
        c.mouse.move(5,500);c.locator('#panel').screenshot(path=str(T/f'conv-panel-{scheme}.png'))
    c.emulate_media(color_scheme='light')
    c.click('#rs');c.wait_for_timeout(300);SC.uncheck();c.wait_for_timeout(300);SC.check();c.wait_for_timeout(300)
    c.click('#bd');c.wait_for_timeout(2500)
    if c.locator('#trOk').is_visible():c.click('#trOk');c.wait_for_timeout(500)
    model=save(c,lambda:c.click('#bd'),'model-sync.html');st=embed(model)['geo']['st']
    ok('в модели новый движок', 'OBJRT:START v'+VER in model.read_text())
    vw=page(model);ok('в готовом файле общих галочек нет',vw.locator('#thrBox').is_visible()==False)
    mv('q3',250,vw);v=V(vw);ok('готовый файл: стенки равны на пределе',v['q3']==v['q5']==v['q7'] and 24.6<=v['q3']<=24.67,v)
    print('Редактор сайта и страница сайта')
    (T/'site-cfg.html').write_text((T/'site.html').read_text().replace('const SWATCH_COLORS=[];','const SWATCH_COLORS=[];\n/*SITE:ENGINE v1*/'))
    s=page(OUT/'Редактор-сайта.html');s.set_input_files('#fSite',str(T/'site-cfg.html'));s.wait_for_timeout(800)
    ids=s.evaluate('()=>[...document.querySelectorAll("input[type=file]")].map(e=>[e.id,e.multiple])')
    s.set_input_files('#'+[i for i,m in ids if i!='fSite' and m][0],str(model));s.wait_for_timeout(1500)
    site=save(s,lambda:s.click('#btnSave'),'site-sync.html');h=site.read_text();ok('сайт сохраняется с движком текущей версии','OBJRT:START v'+VER in h)
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
    g=harness('hide');keys=list(SV(g))
    ok('на сайте все три ползунка стенок',all(k in keys for k in W),keys)
    def walls(w):
        s=SV(g);pl=g.evaluate('planes()');seg=[pl[i+1]-pl[i] for i in range(len(pl)-1)]
        return s['q3']==s['q5']==s['q7'] and abs(s['q3']-w)<.05 and all(abs(seg[i]-w)<.11 for i in (0,2,4)) and all(abs(seg[i]-88)<.11 for i in (1,3)),(s,seg)
    for k,x,w,name in [('q3',250,74/3,'первый ползунок за предел'),('q3',6,6,'назад'),('q5',250,74/3,'второй ползунок за предел'),('q7',15,15,'третий ползунок')]:
        g.locator(f'#params .param-item:has([data-key="{k}"]) .sx-lock input').check();g.wait_for_timeout(300)
        for y in [20,x]:smv(g,k,y)
        r,info=walls(w);ok(f'сайт: {name} — стенки равны ({w:.2f}), карманы 88',r,info)
    g.screenshot(path=str(T/'site-sync.png'))
    ok('нет ошибок JavaScript',not errors,errors[:5])
    b.close()
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}')
