import json,re,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
T=Path(__file__).resolve().parent;OUT=T.parent/'out';VER=(T.parent/'src'/'VERSION').read_text().strip();stub=(T/'stub/three.js').read_text()
names=re.findall(r'\b([A-Z][A-Za-z0-9]+)(?=[:,}])',stub[stub.index('const T={'):])+re.findall(r"'([A-Z]\w+)'",stub)
three=stub+''.join(f'export const {n}=window.__T.{n};' for n in sorted(set(names)))
mods={'OrbitControls':'export const OrbitControls=window.__T.OrbitControls;','EdgeSplitModifier':'export class EdgeSplitModifier{modify(g){return g}}',
  # толстые линии (Line2): запоминают толщину, чтобы тесты могли её проверить
  'Line2':'export class Line2 extends window.__T.Line{constructor(g,m){super(g,m);this.geometry=g;this.material=m;this.isLine2=true}computeLineDistances(){return this}}',
  'LineMaterial':'export class LineMaterial{constructor(p){Object.assign(this,p||{});this.isLineMaterial=true;this.resolution={x:1,y:1,set(a,b){this.x=a;this.y=b}}}dispose(){}}',
  'LineGeometry':'export class LineGeometry{setPositions(a){this.positions=Array.from(a);return this}dispose(){}computeBoundingSphere(){}}'}
ok_n=0;bad_n=0
def ok(name,cond,info=''):
    global ok_n,bad_n
    ok_n+=bool(cond);bad_n+=not cond
    print(('  ОК     ' if cond else '  ОШИБКА ')+name+('' if cond else f'  → {info}'),flush=True)
def route(r):
    u=r.request.url
    js=lambda b:r.fulfill(status=200,content_type='application/javascript',headers={'Access-Control-Allow-Origin':'*'},body=b)
    if u.startswith('file:') or u.startswith('blob:') or u.startswith('data:'):return r.continue_()
    if 'tailwindcss' in u:return js('window.tailwind={};')
    if 'three.module' in u:return js(three)
    if '/examples/js/controls' in u:return js('')
    if 'three.min.js' in u:return js(stub)
    if '/jsm/' in u:
        n=u.split('/')[-1][:-3];return js(mods.get(n,f'export class {n}{{}}'))
    r.abort()
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(accept_downloads=True,viewport={'width':1500,'height':900});ctx.route('**/*',route)
    errors=[]
    def page(path):
        g=ctx.new_page();g.on('pageerror',lambda e:errors.append(f'{path.name}: {e}'));g.on('dialog',lambda d:d.accept())
        g.goto(path.as_uri());g.wait_for_timeout(1200);return g
    def save(g,click,name):
        with g.expect_download(timeout=15000) as d:click()
        f=T/name;d.value.save_as(f);return f
    print('Редактор размеров')
    e=page(OUT/'mesurments.html')
    e.set_input_files('#file-input',str(T/'project.html'));e.wait_for_timeout(1200)
    cards=e.locator('input[data-action="name"]').count()
    ok('проект загружается',cards>=2,f'карточек {cards}')
    e.click('#btn-clear-all');e.set_input_files('#file-input',[]) 
    e.uncheck('#auto-dims-on-load',force=True);e.set_input_files('#file-input',str(T/'project.html'));e.wait_for_timeout(1200)
    cards=e.locator('input[data-action="name"]').count()
    ok('без авторазмеров остаются только два моих размера',cards==2,f'карточек {cards}')
    e.click('#btn-skeleton');e.wait_for_timeout(500);t=e.inner_text('#sk-panel')
    ok('панель «Каркас» открывается: стенки и пазы','стенка' in t and 'паз' in t,t[:200])
    ok('показано «не хватает 3» по оси X',re.search(r'по оси X:\s*3',t),t[:200])
    boxes=e.locator('#sk-panel input[data-seg]')
    ok('5 участков, фиксация на стенках',[boxes.nth(i).is_checked() for i in range(boxes.count())]==[True,False,True,False,True])
    e.screenshot(path=str(T/'editor.png'))
    boxes.nth(1).check(force=True);boxes.nth(1).uncheck(force=True)
    proj=save(e,lambda:e.click('#btn-export-html'),'exported.html')
    d=json.loads(re.search(r'id="__CAD_ANNOTATIONS_DATA__"[^>]*>([\s\S]*?)</script>',proj.read_text()).group(1))
    ok('экспорт содержит каркас и привязку размеров',d.get('skeleton') and all(a['spans'] for a in d['annotations']),str(d.get('annotations'))[:200])
    red=e.locator('#sk-panel td:has-text("✗")').count();before=e.locator('input[data-action="name"]').count()
    e.click('#sk-panel [data-pick-missing]');e.wait_for_timeout(500);e.click('#sk-panel [data-add]');e.wait_for_timeout(700);t=e.inner_text('#sk-panel')
    added=e.locator('input[data-action="name"]').count()-before
    ok('добавлено столько размеров, сколько красных участков (4)',red==4 and added==4,f'красных {red}, добавлено {added}')
    ok('красных участков не осталось',e.locator('#sk-panel td:has-text("✗")').count()==0)
    ok('отметить все недостающие и добавить — ось определена полностью','определена полностью' in t,t[:200])
    print('Конвертер')
    c=page(OUT/'Конвертер-OBJ-HTML.html')
    c.set_input_files('#f',str(proj));c.wait_for_timeout(2000)
    r=c.locator('#axes input[type=range]')
    ok('появились масштаб и 2 размера',r.count()==3,f'{r.count()}; '+c.inner_text('#info'))
    X='()=>{const a=geo.attributes.position.array,s=new Set();for(let i=0;i<a.length;i+=3)s.add(+a[i].toFixed(1));const l=[...s].sort((x,y)=>x-y);return l.map(v=>+(v-l[0]).toFixed(1))}'
    def move(g,i,v):
        g.locator('#axes input[type=range]').nth(i+1).evaluate('(el,v)=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}))}',v);g.wait_for_timeout(300)
    move(c,1,60);x=c.evaluate(X);ok('паз = 60, ширина 120',x==[0,12,72,84,108,120],x)
    move(c,0,150);x=c.evaluate(X);ok('ширина = 150, паз 60',x==[0,12,72,84,138,150],x)
    c.click('#rs');c.wait_for_timeout(300);x=c.evaluate(X);ok('«Исходные размеры»',x==[0,12,54,66,108,120],x)
    c.screenshot(path=str(T/'converter.png'))
    c.click('#bd');c.wait_for_timeout(2500)
    ok('открывается окно проверки перевода названий',c.locator('#trOk').count()==1)
    c.click('#trOk');c.wait_for_timeout(500)
    model=save(c,lambda:c.click('#bd'),'model-3d.html')
    ok('готовый HTML скачивается',model.stat().st_size>10000)
    v=page(model);move(v,1,60);x=v.evaluate(X);ok('готовый файл модели открывается и ползунок работает',x==[0,12,72,84,108,120],x)
    print('Редактор сайта')
    s=page(OUT/'Редактор-сайта.html')
    s.set_input_files('#fSite',str(T/'site.html'));s.wait_for_timeout(800)
    st=s.inner_text('#siteStatus');ok('сайт загружается','Сайт загружен' in st,st)
    ids=s.evaluate('()=>[...document.querySelectorAll("input[type=file]")].map(e=>[e.id,e.multiple])')
    mid=[i for i,m in ids if i!='fSite' and m][0]
    s.set_input_files('#'+mid,str(model));s.wait_for_timeout(1500)
    site=save(s,lambda:s.click('#btnSave'),'site-out.html');h=site.read_text()
    ok('сайт сохраняется с движком текущей версии и моделью','OBJRT:START v'+VER in h and 'obj-models-data' in h and '"sk":{' in h)
    ok('нет ошибок JavaScript ни в одном окне',not errors,errors[:5])
    b.close()
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}')
