# Сайт: интерфейс размеров «Классический» / «Размеры на модели» (выбор в редакторе сайта → «Поведение»)
# и точность размеров для посетителя (целые / 1 / 2 знака) рядом с выбором мм / см. Основа — настоящий сайт (host-real.html)
import pathlib,re,json
exec(open(pathlib.Path(__file__).with_name('browser.py')).read().split('with sync_playwright() as p:')[0])
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(accept_downloads=True,viewport={'width':1400,'height':900});ctx.route('**/*',route);ctx.set_default_timeout(6000);errors=[]
    def page(path):
        g=ctx.new_page();g.on('pageerror',lambda e:errors.append(f'{path.name}: {e}'));g.on('dialog',lambda d:d.accept())
        g.goto(path.as_uri());g.wait_for_timeout(1200);return g
    def save(g,click,name):
        with g.expect_download(timeout=15000) as d:click()
        f=T/name;d.value.save_as(f);return f
    def editor_site(mode):
        s=page(OUT/'Редактор-сайта.html');s.set_input_files('#fSite',str(T/'host-real.html'));s.wait_for_timeout(1000)
        s.get_by_role('button',name='Поведение').click();s.wait_for_timeout(300)
        if mode:s.locator(f'input[name="dimui"][value="{mode}"]').check(force=True);s.wait_for_timeout(200)
        return s
    def open_model(g):
        g.locator('#catalog-grid .model-card').first.click();g.wait_for_timeout(800)
    vis_items=lambda g:g.evaluate('()=>[...document.querySelectorAll("#params-container .param-item")].filter(x=>x.offsetParent!==null).map(x=>x.querySelector("input[type=range]")&&x.querySelector("input[type=range]").dataset.key)')
    num=lambda g,k:g.evaluate('k=>document.getElementById("num-"+k).value',k)

    print('Редактор сайта: выбор интерфейса')
    s=editor_site(None)
    t=s.inner_text('body')
    ok('во «Поведении» блок «Интерфейс размеров на сайте»','Интерфейс размеров на сайте' in t)
    ok('два варианта: «Классический» и «Размеры на модели»',s.locator('input[name="dimui"]').count()==2 and 'Классический' in t and 'Размеры на модели' in t)
    ok('у каждого — маленькое превью',s.locator('.dimui-prev svg').count()==2)
    ok('по умолчанию — классический',s.locator('input[name="dimui"][value="classic"]').is_checked())
    s.locator('input[name="dimui"][value="model"]').check(force=True);s.wait_for_timeout(200)
    ok('выбор записан в настройки сайта',s.evaluate('()=>readCfg(site).x.dimui')=='model')
    fm=save(s,lambda:s.click('#btnSave'),'site-ui-model.html')
    s2=page(OUT/'Редактор-сайта.html');s2.set_input_files('#fSite',str(fm));s2.wait_for_timeout(800)
    s2.get_by_role('button',name='Поведение').click();s2.wait_for_timeout(300)
    ok('при повторном открытии выбор на месте',s2.locator('input[name="dimui"][value="model"]').is_checked())

    print('Сайт: размеры на модели')
    w=page(fm);open_model(w)
    D=lambda:w.evaluate('()=>window.__objrt.dims()')
    d=D();keys=[x['key'] for x in d]
    ok('у открытой модели размерные линии со значениями',len(d)>=5 and w.locator('#objrt-dims .objrt-dl').count()==len(d),len(d))
    ok('ползунков этих размеров в панели не видно',not set(keys)&set(vis_items(w)),(keys,vis_items(w)))
    ok('значение на модели — как у размера',all(re.sub(r'[^\d.]','',x['text'])==num(w,x['key']) for x in d),[(x['text'],num(w,x['key'])) for x in d[:3]])
    k0=keys[0];w.locator(f'#objrt-dims .objrt-dl[data-key="{k0}"]').click();w.wait_for_timeout(250)
    pop=w.locator('.objrt-pop')
    nm=w.locator(f'#objrt-dims .objrt-dl[data-key="{k0}"]').get_attribute('title') or '?'
    ok('клик по размеру — окошко с названием, ползунком и полем ввода',pop.is_visible() and nm!='?' and nm in pop.inner_text() and pop.locator('input[type=range]').count()==1 and pop.locator('input[type=number]').count()==1)
    ok('в окошке текущее значение',pop.locator('input[type=number]').input_value()==num(w,k0),(pop.locator('input[type=number]').input_value(),num(w,k0)))
    rg=pop.locator('input[type=range]');mn,mx=float(rg.get_attribute('min')),float(rg.get_attribute('max'))
    tv=round(mn+(mx-mn)*.7,1)
    rg.evaluate('(r,v)=>{r.value=v;r.dispatchEvent(new Event("input",{bubbles:true}))}',str(tv));w.wait_for_timeout(300)
    ok('ползунок в окошке меняет размер модели',abs(float(num(w,k0))-tv)<.11,(num(w,k0),tv))
    ok('значение на модели обновилось',abs(float(re.sub(r'[^\d.]','',[x for x in D() if x['key']==k0][0]['text']))-tv)<.11)
    ok('история сайта видит изменение («Шаг назад»)',w.evaluate('()=>window.__objrt.canUndo()'))
    mv=str(int(round(tv))+5)  # значение внутри допустимого (у модели есть ограничения снизу)
    pop.locator('input[type=number]').fill(mv);pop.locator('input[type=number]').dispatch_event('change');w.wait_for_timeout(300)
    ok('ввод числа вручную',num(w,k0)==mv and pop.locator('input[type=range]').input_value()==mv,(mv,num(w,k0),pop.locator('input[type=range]').input_value()))
    w.locator('#unit-btn-cm').click();w.wait_for_timeout(300)
    d=[x for x in D() if x['key']==k0][0]
    ok('мм → см: значение на модели в сантиметрах',float(re.sub(r'[^\d.]','',d['text']))==float(mv)/10,d['text'])
    w.locator('#unit-btn-mm').click();w.wait_for_timeout(200)
    pop=w.locator('.objrt-pop')
    if not pop.is_visible():w.locator(f'#objrt-dims .objrt-dl[data-key="{k0}"]').click();w.wait_for_timeout(200)
    w.locator('.objrt-pop .objrt-pop-x').click();w.wait_for_timeout(200)
    ok('окошко закрывается ✕',not w.locator('.objrt-pop').is_visible())

    print('Точность: целые / 1 / 2 знака')
    pr=w.locator('.objrt-prec [data-prec]')
    ok('рядом с мм / см — выбор точности из 3 вариантов',pr.count()==3 and w.locator('.objrt-prec [data-prec="2"].active').count()==1)
    w.locator('.objrt-prec [data-prec="0"]').click();w.wait_for_timeout(300)
    vals=[x['text'] for x in D()]
    ok('«целые» — значения без запятой',all('.' not in re.sub(r'[^\d.]','',v) for v in vals),vals)
    ok('и ползунок шагает по 1',w.evaluate('k=>document.querySelector(\'#params-container input[type=range][data-key="\'+k+\'"]\').step',k0)=='1')
    w.locator('.objrt-prec [data-prec="1"]').click();w.wait_for_timeout(300)
    vals=[re.sub(r'[^\d.]','',x['text']) for x in D()]
    ok('«1 знак» — один знак после точки',all(re.fullmatch(r'\d+\.\d',v) for v in vals),vals)
    w.reload();w.wait_for_timeout(1200);open_model(w)
    ok('выбор точности запоминается',w.locator('.objrt-prec [data-prec="1"].active').count()==1)

    print('Классический интерфейс')
    s3=editor_site('classic');fc=save(s3,lambda:s3.click('#btnSave'),'site-ui-classic.html')
    c=page(fc);c.evaluate('()=>localStorage.removeItem("objrt-prec")');c.reload();c.wait_for_timeout(1200);open_model(c)
    ok('классический: размеров на модели нет, ползунки в панели',c.locator('#objrt-dims .objrt-dl').count()==0 and len(vis_items(c))>=5)
    ok('выбор точности есть и в классическом',c.locator('.objrt-prec [data-prec]').count()==3)
    k=vis_items(c)[0];before=num(c,k)
    c.locator('.objrt-prec [data-prec="0"]').click();c.wait_for_timeout(300)
    ok('«целые» в классическом: число в поле целое',re.fullmatch(r'-?\d+',num(c,k)),(before,num(c,k)))
    ok('ошибок на страницах нет',not errors,errors[:3])
    b.close()
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}');sys.exit(1 if bad_n else 0)
