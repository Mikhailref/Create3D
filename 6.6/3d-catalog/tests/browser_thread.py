# резьба: редактор размеров (каркас без кучи плоскостей) → конвертер (диаметр резьбы привязан к носителю)
import pathlib,re,json
exec(open(pathlib.Path(__file__).with_name('browser.py')).read().split('with sync_playwright() as p:')[0])
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(accept_downloads=True,viewport={'width':1500,'height':900});ctx.route('**/*',route);errors=[]
    def page(path):
        g=ctx.new_page();g.on('pageerror',lambda e:errors.append(f'{path.name}: {e}'));g.on('dialog',lambda d:d.accept());g.goto(path.as_uri());g.wait_for_timeout(1200);return g
    def export(g,name):
        with g.expect_download(timeout=20000) as d:g.evaluate("()=>document.getElementById('btn-export-html').click()")
        f=T/name;d.value.save_as(f);return f
    def data(f):return json.loads(re.search(r'id="__CAD_ANNOTATIONS_DATA__"[^>]*>(.*?)</script>',f.read_text(),re.S).group(1))
    def fire(loc,js='el=>el.click()'):loc.evaluate(js);loc.page.wait_for_timeout(300)
    print('Редактор размеров: болт с резьбой')
    e=page(OUT/'mesurments.html');e.set_input_files('#file-input',str(T/'project-thread.html'));e.wait_for_timeout(2500)
    ok('проект с болтом загружается: три размера',e.locator('input[data-action="name"]').count()==3,e.locator('input[data-action="name"]').count())
    fire(e.locator('#btn-skeleton'))
    ok('в панели каркаса есть пометка про резьбу',e.locator('#sk-panel [data-threads]').count()==1,e.locator('#sk-panel').inner_text()[:200])
    rows=lambda:e.locator('#sk-panel [data-seg]').count()
    fire(e.locator('#sk-panel [data-ax="0"]'));nx=rows()
    ok('по X участков не больше 8 (раньше было 48)',0<nx<=8,nx)
    fire(e.locator('#sk-panel [data-ax="2"]'));nz=rows()
    ok('по Z участков не больше 4 (раньше было 162)',0<nz<=4,nz)
    ok('участок резьбы по Z подписан и закреплён',e.locator('#sk-panel td:has-text("Резьба")').count()>=1 and e.locator('#sk-panel [data-seg]:checked').count()>=1,e.locator('#sk-panel').inner_text()[:300])
    for k in '012':
        fire(e.locator(f'#sk-panel [data-ax="{k}"]'));t=e.locator('#sk-panel').inner_text()
        m=re.search(r'Не хватает размеров по оси \w: (\d+)',t)
        miss=0 if m is None else int(m.group(1))
        ok(f'ось {"XYZ"[int(k)]}: после трёх размеров недостающих '+('нет (носитель определяет ось)' if k!='2' else '1 — хвостовик 0…10'),miss==(1 if k=='2' else 0),t[:120])
    e.screenshot(path=str(T/'mes-thread.png'))
    prj=export(e,'thread-exported.html');d=data(prj)
    sk=d.get('skeleton',{})
    ok('в файле есть привязки: 4 к носителю и 6 равенств сторон',len(sk.get('ties',[]))==10,sk.get('ties'))
    ok('в файле есть одна резьбовая зона: Z от 10 до 30, диаметры 9.2 и 10.8',len(sk.get('threads',[]))==1 and sk['threads'][0]['axis']=='z' and abs(sk['threads'][0]['from']-10)<.05 and abs(sk['threads'][0]['to']-30)<.05 and abs(sk['threads'][0]['rootRadius']-4.6)<.05 and abs(sk['threads'][0]['crestRadius']-5.4)<.05,sk.get('threads'))
    ok('в файле по осям X и Y не больше 9 плоскостей',all(len(sk['axes'][a]['stations'])<=9 for a in 'xy'),[len(sk['axes'][a]['stations']) for a in 'xyz'])
    ok('привязки держат отношение: 0.92, 1.08 и 1 (равенство сторон)',sorted({round(t['r'],2) for t in sk['ties']})==[.92,1,1.08],[t['r'] for t in sk['ties']])
    e2=page(OUT/'mesurments.html');e2.set_input_files('#file-input',str(prj));e2.wait_for_timeout(2500)
    fire(e2.locator('#btn-skeleton'));ok('после повторного открытия резьба снова найдена',e2.locator('#sk-panel [data-threads]').count()==1)
    print('Конвертер: резьба зависит от носителя')
    c=page(OUT/'Конвертер-OBJ-HTML.html');c.set_input_files('#f',str(prj));c.wait_for_timeout(3000)
    keys=c.evaluate('()=>plist().map(p=>p.key)');ok('ползунков немного: масштаб и три размера',keys==['sc','q0','q1','q2'],keys)
    ok('в состоянии модели лежат привязки',c.evaluate('()=>st.sk&&st.sk.t?st.sk.t.length:0')==10,c.evaluate('()=>st.sk&&st.sk.t?st.sk.t.length:-1'))
    ST='''()=>{const a=W;let xl=1e9,xh=-1e9,yl=1e9,yh=-1e9,zl=1e9,zh=-1e9;
      for(let i=0;i<a.length;i+=3){if(a[i+2]<11)continue;xl=Math.min(xl,a[i]);xh=Math.max(xh,a[i]);yl=Math.min(yl,a[i+1]);yh=Math.max(yh,a[i+1]);zl=Math.min(zl,a[i+2]);zh=Math.max(zh,a[i+2])}
      return {wx:xh-xl,wy:yh-yl,zh}}'''
    def setv(key,val):
        c.evaluate('([k,v])=>{const r=ROWS[k].rg;r.value=v;r.dispatchEvent(new Event("input",{bubbles:true}))}',[key,val]);c.wait_for_timeout(900)
    s0=c.evaluate(ST);ok('исходно ширина по вершинам резьбы 10.8 по обеим осям',abs(s0['wx']-10.8)<.15 and abs(s0['wy']-10.8)<.15,s0)
    setv('q0',14);s1=c.evaluate(ST)
    ok('носитель по X стал 14: резьба по X выросла в 1.4 раза (10.8 → 15.12)',abs(s1['wx']-15.12)<.3,s1)
    ok('по Y ничего не изменилось',abs(s1['wy']-s0['wy'])<.15,(s0,s1))
    setv('q2',7);s2=c.evaluate(ST);ok('носитель по Y стал 7: резьба по Y уменьшилась в 0.7 раза (7.56)',abs(s2['wy']-7.56)<.3,s2)
    setv('q1',30);s3=c.evaluate(ST);ok('длина резьбы 30: деталь стала длиннее (верх выше 30, размеры по X и Y прежние)',s3['zh']>34.5 and abs(s3['wx']-s2['wx'])<.2 and abs(s3['wy']-s2['wy'])<.2,(s2,s3))
    c.screenshot(path=str(T/'conv-thread.png'))
    ok('нет ошибок JavaScript',not errors,errors[:5])
    b.close()
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}')
