# Ассистент, шаг 1: если у поставленных размеров нет понятных названий — «Автоматизировать» спрашивает:
# дать названия (без добавления размеров) или добавить размеры. Предложенные названия видны и правятся в окне.
import pathlib,re,json
exec(open(pathlib.Path(__file__).with_name('browser.py')).read().split('with sync_playwright() as p:')[0])
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(accept_downloads=True,viewport={'width':1500,'height':950});ctx.route('**/*',route);ctx.set_default_timeout(8000);errors=[]
    def page(path):
        g=ctx.new_page();g.on('pageerror',lambda e:errors.append(f'{path.name}: {e}'));g.on('dialog',lambda d:d.accept())
        g.goto(path.as_uri());return g
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
    busy_done=lambda:A.wait_for_function('()=>!document.body.classList.contains("busy")',timeout=60000)
    asking=lambda:A.locator('#aAsk').is_visible()
    def assistant(f):
        global A
        A=page(OUT/'Ассистент.html');wait(lambda:MS() is not None and CS() is not None)
        A.set_input_files('#aFile',str(f));busy_done();return A
    info=lambda:mes().evaluate('()=>ASSIST.dimsInfo().map(x=>x.id)')
    # переименовать размер так, как это делает пользователь в карточке
    def rename(i,nm):
        mes().evaluate('([id,nm])=>{const el=document.querySelector(`[data-action="name"][data-id="${id}"]`);el.value=nm;el.dispatchEvent(new Event("input",{bubbles:true}))}',[info()[i],nm])
    props=lambda:A.evaluate('()=>[...document.querySelectorAll("#aAsk input.ask-name")].map(x=>({id:x.dataset.id,v:x.value}))')

    print('Размеры без понятных названий')
    assistant(T/'box-freecad.html');A.click('#aAuto');busy_done()
    names0=MS()['names'];n0=len(names0)
    ok('исходно: ассистент поставил и назвал размеры',n0==13 and all(names0),names0)
    mes().locator('#dimensions-list > [data-card-id] [data-action="delete"]').first.evaluate('e=>e.click()');A.wait_for_timeout(300)
    rename(0,'');rename(1,'Размер 5');rename(2,'7')
    A.click('#aAuto');A.wait_for_timeout(300)
    ok('«Автоматизировать» спрашивает, что сделать',asking() and re.search(r'3 размер',A.inner_text('#aAsk')),A.inner_text('#aAsk')[:200] if asking() else '')
    ok('есть «Дать названия» и «Добавить размеры»',A.locator('#aAskNames').is_visible() and A.locator('#aAskAdd').is_visible())
    pr=props()
    ok('в окне — предложенные названия для 3 размеров',len(pr)==3 and all(x['v'].strip() for x in pr),pr)
    ok('без названия, «Размер 5» и «7» — считаются непонятными',sorted(x['id'] for x in pr)==sorted(info()[:3]))
    ok('предложение — по участку детали (как у ассистента)',[x['v'] for x in pr]==names0[1:4],([x['v'] for x in pr],names0[1:4]))
    A.click('#aAskCancel');A.wait_for_timeout(200)
    ok('«Отмена» — ничего не меняется',not asking() and MS()['names'][:3]==['','Размер 5','7'] and MS()['dims']==n0-1)

    A.click('#aAuto');A.wait_for_timeout(300)
    A.locator('#aAsk input.ask-name').first.fill('Моя ширина')
    A.click('#aAskNames');busy_done()
    s=MS()
    ok('«Дать названия» — размеры не добавляются',s['dims']==n0-1,s['dims'])
    ok('названия даны, моя правка в окне учтена',s['names'][:3]==['Моя ширина']+names0[2:4],s['names'][:3])
    ok('остальные названия не тронуты',s['names'][3:]==names0[4:],s['names'][3:])
    ok('в сообщении — сколько названо',re.search(r'[Нн]азван[оия].{0,20}3',A.inner_text('#aMsg')),A.inner_text('#aMsg')[:200])
    A.click('#aUndo');busy_done()
    ok('«Шаг назад» возвращает прежние названия',MS()['names'][:3]==['','Размер 5','7'],MS()['names'][:3])

    A.click('#aAuto');A.wait_for_timeout(300)
    A.click('#aAskAdd');busy_done();s=MS()
    ok('«Добавить размеры» — недостающий размер поставлен',s['dims']==n0,s['dims'])
    ok('и непонятные названия заменены',all(x and x not in ('Размер 5','7') for x in s['names']),s['names'])
    A.click('#aAuto');busy_done()
    ok('когда всё названо и поставлено — вопроса нет',not asking())
    A.close()

    print('Угол, наклонный размер, размер от вспомогательной линии')
    assistant(T/'user-angle-guides.html');nm=MS()['names']
    idx={x:nm.index(x) for x in ['Ширина паза','Глубина паза','Внешний уклон']}
    for x,i in idx.items():rename(i,'')
    A.click('#aAuto');A.wait_for_timeout(300)
    pr={x['id']:x['v'] for x in props()};ids=info()
    ok('предложены 3 названия',len(pr)==3,pr)
    ok('угол — «угол»',re.search('угол',pr.get(ids[idx['Внешний уклон']],''),re.I),pr)
    ok('наклонный размер — «наклонный»',re.search('наклон',pr.get(ids[idx['Глубина паза']],''),re.I),pr)
    ok('размер вдоль X от линии — «ширина»',re.search('ширин',pr.get(ids[idx['Ширина паза']],''),re.I),pr)
    allv=list(pr.values())+[x for x in nm if x not in idx]
    ok('названия не повторяют уже занятые',len(set(v.lower() for v in allv))==len(allv),allv)
    ok('кнопки «Добавить размеры» нет, если добавлять нечего',not A.locator('#aAskAdd').is_visible() or mes().evaluate('()=>ASSIST.plan().count')>0)
    A.click('#aAskNames');busy_done()
    ok('названия даны',all(MS()['names']),MS()['names'])
    ok('ошибок на страницах нет',not errors,errors[:3])
    b.close()
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}');sys.exit(1 if bad_n else 0)
