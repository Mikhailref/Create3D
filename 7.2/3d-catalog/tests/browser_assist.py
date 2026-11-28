# Ассистент: один файл, внутри редактор размеров (шаг 1) и конвертер (шаг 2), автоматизация, отмена, ручная правка,
# скачивание и повторная загрузка на каждом шаге
import pathlib,re,json,collections
exec(open(pathlib.Path(__file__).with_name('browser.py')).read().split('with sync_playwright() as p:')[0])
BOX=['Ширина','Длина','Высота','ширина стенки','ширина стенки','ширина стенки','ширина кармана 1','ширина кармана 2',
     'ширина стенки','ширина стенки','длина кармана','высота пола','глубина кармана']
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(accept_downloads=True,viewport={'width':1500,'height':950});ctx.route('**/*',route);ctx.set_default_timeout(8000);errors=[]
    def page(path):
        g=ctx.new_page();g.on('pageerror',lambda e:errors.append(f'{path.name}: {e}'));g.on('dialog',lambda d:d.accept())
        g.goto(path.as_uri());return g
    def save(g,click,name):
        with g.expect_download(timeout=20000) as d:click()
        f=T/name;d.value.save_as(f);return f
    def wait(cond,ms=15000,step=200):
        t=0
        while t<ms:
            try:
                if cond():return True
            except Exception:pass
            A.wait_for_timeout(step);t+=step
        return False
    mes=lambda:A.query_selector('#fMes').content_frame()
    conv=lambda:A.query_selector('#fConv').content_frame()
    MS=lambda:mes().evaluate('()=>ASSIST.status()')
    CS=lambda:conv().evaluate('()=>ASSIST.status()')
    def assistant():
        global A
        A=page(OUT/'Ассистент.html')
        ok('ассистент открывается, обе программы внутри готовы',wait(lambda:MS() is not None and CS() is not None))
        return A
    def open_file(f):
        A.set_input_files('#aFile',str(f));A.wait_for_timeout(500)
    def busy_done():A.wait_for_function('()=>!document.body.classList.contains("busy")',timeout=30000)
    step=lambda:A.evaluate('()=>document.body.dataset.step')

    print('Сборка')
    ok('собран четвёртый файл Ассистент.html',(OUT/'Ассистент.html').exists())
    h=(OUT/'Ассистент.html').read_text() if (OUT/'Ассистент.html').exists() else ''
    ok('внутри те же программы текущей версии',('OBJRT:START v'+VER) in h.replace('\\u003c','<'))

    print('Шаг 1: размеры')
    assistant()
    ok('сначала шаг 1, видно окно редактора размеров',step()=='1' and A.locator('#fMes').is_visible() and not A.locator('#fConv').is_visible())
    ok('«Автоматизировать» недоступна, пока нет модели',A.locator('#aAuto').is_disabled())
    ok('справа вверху нет «Одобрить» и «← К размерам» — переходы вкладками',A.locator('#aNext').count()==0 and A.locator('#aBack').count()==0)
    fr=A.evaluate('()=>[document.querySelector(".bar").getBoundingClientRect().bottom,document.querySelector(".frames").getBoundingClientRect().top]')
    ok('под панелью ассистента сразу окно программы — второй строки нет',abs(fr[0]-fr[1])<=1,fr)
    open_file(T/'box-freecad.html')
    ok('модель без размеров → шаг 1',wait(lambda:MS()['model']) and step()=='1' and MS()['dims']==0,MS())
    ok('ассистент подсказывает, что делать',re.search(r'размер',A.inner_text('#aMsg'),re.I),A.inner_text('#aMsg'))
    A.click('#aAuto');busy_done()
    s=MS();ok('автоматизация ставит 13 размеров',s['dims']==13,s)
    ok('названия как у вас: «ширина стенки», «ширина кармана 1», «высота пола»…',sorted(s['names'])==sorted(BOX),sorted(s['names']))
    ok('каркас определён полностью по всем осям',s['missing']==[0,0,0],s['missing'])
    ok('отчёт о том, что сделано',re.search(r'Добавлено размеров: 13',A.inner_text('#aMsg')),A.inner_text('#aMsg'))
    ok('отчёт всплывает поверх окна',A.locator('#aMsg').is_visible() and A.evaluate('()=>getComputedStyle(document.getElementById("aMsg")).position') in ('fixed','absolute'))
    A.click('#aMsgX');ok('и закрывается крестиком',not A.locator('#aMsg').is_visible())
    ok('«Отменить» доступна',not A.locator('#aUndo').is_disabled())
    A.click('#aUndo');busy_done()
    ok('отмена убирает автоматические размеры',wait(lambda:MS()['dims']==0),MS())
    A.click('#aAuto');busy_done();ok('и снова автоматизируем',MS()['dims']==13)
    print('Ручная правка')
    mes().locator('#dimensions-list > [data-card-id] [data-action="delete"]').first.evaluate('e=>e.click()');A.wait_for_timeout(300)
    ok('размер можно удалить руками',MS()['dims']==12,MS())
    nm=mes().locator('#dimensions-list > [data-card-id] [data-action="name"]').first
    nm.evaluate('e=>{e.value="Мой размер";e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}))}');A.wait_for_timeout(200)
    A.click('#aAuto');busy_done();s=MS()
    ok('повторная автоматизация достраивает недостающее',s['dims']==13,s)
    ok('и не трогает ваши названия','Мой размер' in s['names'],s['names'])
    nm=mes().locator('#dimensions-list > [data-card-id] [data-action="name"]').first
    nm.evaluate('e=>{e.value="ширина стенки";e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}))}')
    print('Скачать и загрузить шаг 1')
    prj=save(A,lambda:A.click('#aSave'),'assist-step1.html')
    d=json.loads(re.search(r'id="__CAD_ANNOTATIONS_DATA__"[^>]*>(.*?)</script>',prj.read_text(),re.S).group(1))
    ok('скачан проект редактора размеров с 13 размерами',len(d['annotations'])==13,len(d['annotations']))
    A.close();assistant()
    open_file(prj)
    ok('проект с размерами → шаг 1, размеры на месте',wait(lambda:MS()['dims']==13) and step()=='1',MS())

    print('Шаг 2: конвертер')
    A.click('#aStep2');busy_done()
    ok('вкладка «2 · Ползунки» переходит к конвертеру',step()=='2' and A.locator('#fConv').is_visible() and not A.locator('#fMes').is_visible())
    c=CS();ok('в конвертере 13 размеров из шага 1',c['dims']==13,c)
    A.click('#aAuto');busy_done();c=CS()
    P=[x for x in c['params'] if x['kind']=='dq']
    G=collections.defaultdict(list)
    for x in P:
        if x['g']:G[x['g']].append(x)
    ok('одинаковые элементы в группах синхронизации: стенки X (3), стенки Y (2), карманы (2)',sorted(len(v) for v in G.values())==[2,2,3],{k:[x['lab'] for x in v] for k,v in G.items()})
    ok('группы названы по размерам',sorted(v[0]['gn'] for v in G.values())==sorted(['ширина стенки','ширина стенки 2','ширина кармана']),[v[0]['gn'] for v in G.values()])
    ok('в каждой группе виден один ползунок',all(sum(x['vis'] for x in v)==1 for v in G.values()))
    wall=[x for x in P if re.search('стенк|пол',x['lab'])];pock=[x for x in P if 'карман' in x['lab']];over=[x for x in P if x['lab'] in('Ширина','Длина','Высота')]
    ok('стенки и пол под замком 🔒',wall and all(x['lk'] for x in wall),[(x['lab'],x['lk']) for x in wall])
    ok('карманы и габариты без замка — меняются',all(not x['lk'] for x in pock+over),[(x['lab'],x['lk']) for x in pock+over])
    ok('габариты видны на сайте',all(x['vis'] for x in over))
    ok('пределы по размеру детали, а не 0–250',all(0<x['mn']<x['v0']<x['mx']<250 for x in P),[(x['lab'],x['mn'],x['mx']) for x in P])
    t=A.inner_text('#aMsg');ok('самопроверка: ползунки прогнаны, сбоев нет',re.search(r'Проверено положений: \d+',t) and 'сбоев нет' in t,t)
    w=[x for x in over if x['lab']=='Ширина'][0]['key']
    v=conv().evaluate('k=>{geoSet(g,st,k,140);refresh();return geoVals(g,st)}',w)
    lab={x['key']:x['lab'] for x in P}
    ok('Ширина 140: стенки остаются 12, карманы растут поровну (52)',all(abs(v[k]-12)<.05 for k in v if lab.get(k)=='ширина стенки' and dict((x['key'],x['ax']) for x in P)[k]==0) and all(abs(v[k]-52)<.05 for k in v if 'ширина кармана' in lab.get(k,'')),{lab.get(k,k):round(x,2) for k,x in v.items()})
    conv().evaluate('()=>document.getElementById("rs").click()')
    hk=[x for x in over if x['lab']=='Высота'][0]['key']
    v=conv().evaluate('k=>{geoSet(g,st,k,40);refresh();return geoVals(g,st)}',hk)
    ok('Высота 40: пол остаётся 6, карман глубже (34)',all(abs(v[k]-6)<.05 for k in v if lab.get(k)=='высота пола') and all(abs(v[k]-34)<.05 for k in v if lab.get(k)=='глубина кармана'),{lab.get(k,k):round(x,2) for k,x in v.items()})
    conv().evaluate('()=>document.getElementById("rs").click()')
    A.click('#aUndo');busy_done();c=CS()
    ok('отмена шага 2 убирает группы и замки',all(not x['g'] and not x['lk'] for x in c['params'] if x['kind']=='dq'),c['params'][:3])
    A.click('#aAuto');busy_done()
    print('Скачать и загрузить шаг 2')
    A.click('#aSave');ok('перед скачиванием конвертер предлагает проверить перевод',wait(lambda:conv().locator('#trOk').is_visible()))
    wait(lambda:'Проверьте' in conv().inner_text('#trSt'))
    conv().locator('#trOk').click()
    mdl=save(A,lambda:A.click('#aSave'),'assist-step2-3d.html')
    e=json.loads(re.search(r'<script id="embed" type="application/json">(.*?)</script>',mdl.read_text(),re.S).group(1))
    ok('скачана модель для сайта с группами и замками',len([x for x in e['geo']['st']['dm'] if x.get('g')])==7 and len(e['geo']['st'].get('lk',{}))>=6,len(e['geo']['st'].get('lk',{})))
    A.close();assistant()
    open_file(mdl)
    ok('готовая модель → сразу шаг 2, настройки на месте',wait(lambda:CS()['dims']==13) and step()=='2' and sum(1 for x in CS()['params'] if x.get('g'))==7,CS()['dims'])
    A.click('#aStep1');ok('вкладка «1» возвращает к размерам',step()=='1' and A.locator('#fMes').is_visible())

    print('Ваша деталь из FreeCAD')
    A.close();assistant()
    open_file(T/'part-freecad.html');wait(lambda:MS()['model'])
    A.click('#aAuto');busy_done();s=MS()
    ok('у детали 206×37×138 тоже все размеры и названия',s['dims']==13 and s['missing']==[0,0,0] and all(s['names']),s)
    A.click('#aStep2');busy_done();A.click('#aAuto');busy_done()
    t=A.inner_text('#aMsg');ok('шаг 2: группы, замки и самопроверка без сбоев','сбоев нет' in t and sum(1 for x in CS()['params'] if x.get('g'))>=5,t)
    A.screenshot(path=str(T/'assist.png'))
    ok('ошибок на страницах нет',not errors,errors[:3])
    b.close()
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}');sys.exit(1 if bad_n else 0)
