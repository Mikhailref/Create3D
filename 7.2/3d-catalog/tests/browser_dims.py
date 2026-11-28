# Размеры на модели: подпись тянется вдоль размерной линии (mesurments и конвертер), клик по подписи — к карточке;
# конвертер: клик по карточке показывает размер, скрыть — галочкой в открытой карточке, общая галочка вверху,
# двойной клик по свободному месту карточки открывает и закрывает её
import pathlib,re,json
exec(open(pathlib.Path(__file__).with_name('browser.py')).read().split('with sync_playwright() as p:')[0])
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(accept_downloads=True,viewport={'width':1500,'height':900});ctx.route('**/*',route);ctx.set_default_timeout(6000);errors=[]
    def page(path):
        g=ctx.new_page();g.on('pageerror',lambda e:errors.append(f'{path.name}: {e}'));g.on('dialog',lambda d:d.accept())
        g.goto(path.as_uri());g.wait_for_timeout(1200);return g
    def save(g,click,name):
        with g.expect_download(timeout=15000) as d:click()
        f=T/name;d.value.save_as(f);return f
    def drag(g,x,y,dx,dy):
        g.mouse.move(x,y);g.mouse.down();g.mouse.move(x+dx,y+dy,steps=10);g.mouse.up();g.wait_for_timeout(250)
    near=lambda a,b,tol:abs(a-b)<=tol

    print('Редактор размеров')
    e=page(OUT/'mesurments.html');e.set_input_files('#file-input',str(T/'project.html'));e.wait_for_timeout(1500)
    # без стилей Tailwind разметка длинная: перед действием мышью прокручиваем к подписи
    def L(i=None,g=None):
        g=g or e
        if i is not None:g.evaluate('i=>document.querySelectorAll(".dim-badge")[i].scrollIntoView({block:"center",inline:"center"})',i);g.wait_for_timeout(150)
        return g.evaluate('()=>ASSIST.labels()')
    l=L(0)[0]
    ok('подпись по умолчанию посередине размерной линии',l['t']==.5 and near(l['x'],(l['ax']+l['bx'])/2,3) and near(l['y'],(l['ay']+l['by'])/2,3),l)
    drag(e,l['x'],l['y'],(l['bx']-l['ax'])*.3,(l['by']-l['ay'])*.3);l2=L(0)[0]
    ok('тянем вдоль размера — подпись едет по размерной линии',near(l2['t'],.8,.05) and near(l2['offset'],l['offset'],.5),(l2['t'],l2['offset'],l['offset']))
    ok('подпись осталась там, где её отпустили',near(l2['x'],l2['ax']+.8*(l2['bx']-l2['ax']),5) and near(l2['y'],l2['ay']+.8*(l2['by']-l2['ay']),5),l2)
    l2=L(0)[0];vx,vy=l2['bx']-l2['ax'],l2['by']-l2['ay'];n=(vx*vx+vy*vy)**.5
    drag(e,l2['x'],l2['y'],-vy/n*30,vx/n*30);l3=L(0)[0]
    ok('поперёк — размер отодвигается от модели, место вдоль линии то же',not near(l3['offset'],l2['offset'],.5) and near(l3['t'],l2['t'],.05),(l3['offset'],l3['t']))
    drag(e,l3['x'],l3['y'],(l3['bx']-l3['ax'])*.5,(l3['by']-l3['ay'])*.5);l4=L(0)[0]
    ok('подпись можно вынести за конец размера',near(l4['t'],1.3,.06),l4['t'])
    k=L(1)[1];e.mouse.click(k['x'],k['y']);e.wait_for_timeout(400)
    sel=e.evaluate('()=>{const c=document.querySelector("#dimensions-list .card-selected");if(!c)return null;const r=c.getBoundingClientRect(),p=document.getElementById("dimensions-list").getBoundingClientRect();return {id:c.dataset.cardId,vis:r.bottom>p.top&&r.top<p.bottom}}')
    ok('клик по размеру на модели — выбрана и видна его карточка',sel and sel['id']==k['id'] and sel['vis'],(sel,k['id']))
    with e.expect_download() as d:e.locator('#btn-export-html').evaluate('el=>el.click()')
    prj=T/'dims-project.html';d.value.save_as(prj)
    ann=json.loads(re.search(r'id="__CAD_ANNOTATIONS_DATA__"[^>]*>(.*?)</script>',prj.read_text(),re.S).group(1))['annotations']
    ok('место подписи сохраняется в файле',near(ann[0].get('lblT',0),1.3,.06) and 'lblT' not in ann[1],[a.get('lblT') for a in ann])
    e2=page(OUT/'mesurments.html');e2.set_input_files('#file-input',str(prj));e2.wait_for_timeout(1500)
    ok('и восстанавливается при открытии',near(e2.evaluate('()=>ASSIST.labels()')[0]['t'],1.3,.06))

    print('Двойной клик по карточке в редакторе размеров')
    card=lambda g=e2:g.locator('#dimensions-list > [data-card-id]').first
    opened=lambda g=e2:card(g).locator('[data-action="limit"]').count()>0
    dbl=lambda loc:(loc.dispatch_event('pointerdown'),loc.dispatch_event('pointerdown'))  # два быстрых нажатия, как у мыши
    was=opened();dbl(card());e2.wait_for_timeout(300)
    ok('двойной клик по свободному месту карточки сворачивает или разворачивает её',opened()!=was,was)
    dbl(card());e2.wait_for_timeout(300)
    ok('и обратно',opened()==was)
    dbl(card().locator('[data-action="name"]'));e2.wait_for_timeout(300)
    ok('двойной клик по полю названия карточку не трогает',opened()==was)

    print('Клик по размеру на модели: прокрутка к карточке и подсветка (редактор размеров)')
    e4=page(OUT/'mesurments.html');e4.set_input_files('#file-input',str(T/'project-many.html'));e4.wait_for_timeout(1800)
    lst='#dimensions-list'
    def card_in_view(g,cid):
        return g.evaluate('([l,id])=>{const c=document.querySelector(l+\' > [data-card-id="\'+id+\'"]\');if(!c)return false;const r=c.getBoundingClientRect(),p=document.querySelector(l).getBoundingClientRect();return r.top>=p.top-2&&r.bottom<=p.bottom+2}',[lst,cid])
    mcls=lambda g,cid:g.evaluate('([l,id])=>{const c=document.querySelector(l+\' > [data-card-id="\'+id+\'"]\');return c?c.className:""}',[lst,cid])
    scrollable=e4.evaluate('l=>{const p=document.querySelector(l);return p.scrollHeight>p.clientHeight+50}',lst)
    if not scrollable:e4.evaluate('l=>{const p=document.querySelector(l);p.style.maxHeight="300px";p.style.overflowY="auto"}',lst)
    e4.evaluate('l=>{const p=document.querySelector(l);p.scrollTop=p.scrollHeight}',lst)
    k=L(0,e4)[0]
    ok('карточка первого размера ушла из вида',not card_in_view(e4,k['id']))
    e4.mouse.click(k['x'],k['y']);e4.wait_for_timeout(1300)
    ok('одинарный клик по значению: список прокручен, карточка в фокусе',card_in_view(e4,k['id']))
    ok('и у неё подсвечена рамка',' flash-b' in ' '+mcls(e4,k['id']),mcls(e4,k['id']))
    e4.evaluate('l=>{const p=document.querySelector(l);p.scrollTop=p.scrollHeight}',lst)
    k=L(0,e4)[0];e4.mouse.dblclick(k['x'],k['y']);e4.wait_for_timeout(1300)
    c0=e4.locator(lst+' > [data-card-id="'+k['id']+'"]')
    ok('двойной клик: карточка в фокусе, раскрыта и подсвечена целиком',card_in_view(e4,k['id']) and c0.locator('[data-action="limit"]').count()>0 and 'flash-all' in mcls(e4,k['id']),mcls(e4,k['id']))

    print('Конвертер')
    c=page(OUT/'Конвертер-OBJ-HTML.html');c.set_input_files('#f',str(prj));c.wait_for_timeout(2000)
    D=lambda:c.evaluate('()=>ASSIST.dims()')
    keys=c.evaluate('()=>plist().filter(p=>p.kind==="dq").map(p=>p.key)')
    isopen=lambda k:c.evaluate('k=>UI.open.has(k)',k)
    row=lambda k:c.locator(f'#axes .row[data-key="{k}"]')
    ok('вверху галочка «Размеры на модели», включена',c.locator('#dimAll').count()==1 and 'Размеры на модели' in c.locator('#dimAll').locator('xpath=..').inner_text() and c.locator('#dimAll').is_checked())
    ok('сначала размеров на модели нет',D()==[],D())
    bg=lambda k:row(k).evaluate('d=>getComputedStyle(d).backgroundColor')
    b0=bg(keys[0])
    row(keys[0]).evaluate('d=>d.click()');c.wait_for_timeout(300);d0=D()
    ok('одинарный клик по карточке открывает её',isopen(keys[0]) and row(keys[0]).locator('.dset').count()==1)
    ok('открытая карточка чуть меняет фон',bg(keys[0])!=b0,(b0,bg(keys[0])))
    ok('и её размер появляется на модели',[x['key'] for x in d0]==[keys[0]] and d0[0]['lines']>0,d0)
    v=c.evaluate('k=>geoVals(g,st)[k]',keys[0])
    ok('на подписи значение размера',d0 and re.sub(r'[^\d.]','',d0[0]['text'])=='%g'%round(v,2),(d0 and d0[0]['text'],v))
    ok('место подписи пришло из редактора размеров',d0 and near(d0[0]['t'],1.3,.06),d0 and d0[0]['t'])
    row(keys[0]).evaluate('d=>d.click()');c.wait_for_timeout(300)
    ok('ещё один клик закрывает карточку, размер остаётся',not isopen(keys[0]) and len(D())==1 and bg(keys[0])==b0)
    row(keys[0]).locator('.h input[type=number]').first.click();c.wait_for_timeout(200)
    ok('клик по полю внутри карточки её не открывает',not isopen(keys[0]))
    c.mouse.move(5,5);c.wait_for_timeout(200);bc0=row(keys[1]).evaluate('d=>getComputedStyle(d).borderTopColor')
    row(keys[1]).hover();c.wait_for_timeout(250);bc1=row(keys[1]).evaluate('d=>getComputedStyle(d).borderTopColor')
    ok('при наведении рамка карточки подсвечивается',bc0!=bc1,(bc0,bc1))
    row(keys[0]).locator('input[type=range]').evaluate('r=>{r.value=+r.min+(r.max-r.min)*.7;r.dispatchEvent(new Event("input",{bubbles:true}))}');c.wait_for_timeout(300)
    v2=c.evaluate('k=>geoVals(g,st)[k]',keys[0]);d1=D()
    ok('ползунок двигается — значение и стрелки следуют',abs(v2-v)>1 and re.sub(r'[^\d.]','',d1[0]['text'])=='%g'%round(v2,2) and not near(d1[0]['bx'],d0[0]['bx'],.5),(d1[0]['text'],v2))
    c.evaluate('()=>document.getElementById("rs").click()');c.wait_for_timeout(300)
    print('Галочки')
    row(keys[0]).evaluate('d=>d.click()');c.wait_for_timeout(300)
    cb=row(keys[0]).locator('.dmv input')
    ok('в открытой карточке галочка «📏 Размер на модели» отмечена',cb.count()==1 and cb.is_checked() and '📏' in row(keys[0]).locator('.dmv').inner_text())
    cb.uncheck();c.wait_for_timeout(300)
    ok('снять её — размер скрыт с модели, карточка открыта',D()==[] and isopen(keys[0]),D())
    row(keys[0]).evaluate('d=>d.click()');c.wait_for_timeout(200)
    c.locator('#dimAll').uncheck();c.wait_for_timeout(300)
    row(keys[1]).evaluate('d=>d.click()');c.wait_for_timeout(300)
    ok('верхняя галочка снята — размеры на детали не появляются вообще',D()==[] and isopen(keys[1]),D())
    ok('галочка в карточке при этом недоступна',row(keys[1]).locator('.dmv input').is_disabled())
    row(keys[1]).evaluate('d=>d.click()');c.wait_for_timeout(200)
    c.locator('#dimAll').check();c.wait_for_timeout(300)
    ok('верхняя галочка поставлена — видны все размеры',sorted(x['key'] for x in D())==sorted(keys),D())

    print('Клик по размеру на модели: прокрутка к карточке и подсветка (конвертер)')
    c2=page(OUT/'Конвертер-OBJ-HTML.html');c2.set_input_files('#f',str(T/'project-many.html'));c2.wait_for_timeout(2500)
    c2.locator('#dimAll').uncheck();c2.locator('#dimAll').check();c2.wait_for_timeout(300)
    D2=lambda:c2.evaluate('()=>ASSIST.dims()')
    inview=lambda k:c2.evaluate('k=>{const d=document.querySelector(\'#axes .row[data-key="\'+k+\'"]\'),r=d.getBoundingClientRect(),p=document.getElementById("panel").getBoundingClientRect();return r.top>=p.top-2&&r.bottom<=p.bottom+2}',k)
    rcls=lambda k:c2.evaluate('k=>document.querySelector(\'#axes .row[data-key="\'+k+\'"]\').className',k)
    c2.evaluate('()=>{const p=document.getElementById("panel");p.scrollTop=p.scrollHeight}');c2.wait_for_timeout(200)
    k0=c2.evaluate('()=>plist().filter(p=>p.kind==="dq")[0].key');d=[x for x in D2() if x['key']==k0][0]
    ok('список длинный: карточка первого размера не видна',not inview(k0))
    c2.mouse.click(d['x'],d['y']);c2.wait_for_timeout(1300)
    ok('одинарный клик по значению: список прокручен, карточка в фокусе',inview(k0))
    ok('подсвечена рамка, карточка не открыта','flash-b' in rcls(k0) and not c2.evaluate('k=>UI.open.has(k)',k0),rcls(k0))
    c2.evaluate('()=>{const p=document.getElementById("panel");p.scrollTop=p.scrollHeight}');c2.wait_for_timeout(200)
    d=[x for x in D2() if x['key']==k0][0];c2.mouse.dblclick(d['x'],d['y']);c2.wait_for_timeout(1300)
    ok('двойной клик: карточка в фокусе, открыта и подсвечена целиком',inview(k0) and c2.evaluate('k=>UI.open.has(k)',k0) and 'flash-all' in rcls(k0),rcls(k0))
    print('Сохранённая модель без следов размеров на экране')
    c2.evaluate('()=>document.querySelector(\'#axes .row\').classList.add("flash-b")')
    m=c2.evaluate('()=>ASSIST.model().html')
    bad=[k for k in ['id="dimOv"','class="dlab"'] if k in m]+re.findall(r'class="[^"]*\bflash-(?:b|all)\b',m)
    ok('в файл модели не попадают подписи размеров и подсветка карточек',not bad,bad)
    mf=T/'dims-model-3d.html';mf.write_text(m)
    v=page(mf);v.wait_for_timeout(800)
    ok('открытая модель: на экране нет застывших подписей',v.locator('.dlab').count()==0)

    print('Наклонный размер: замок и 🎯 недоступны, с пояснением')
    c3=page(OUT/'Конвертер-OBJ-HTML.html');c3.set_input_files('#f',str(T/'project-slant.html'));c3.wait_for_timeout(2000)
    rk=lambda lab:c3.evaluate('l=>{const p=plist().find(p=>p.kind==="dq"&&labText(p,"ru")===l);return p&&p.key}',lab)
    r0=c3.locator(f'#axes .row[data-key="{rk("Ширина")}"]');r1=c3.locator(f'#axes .row[data-key="{rk("Наклонный")}"]')
    ok('у размера по оси замок и 🎯 работают',r0.locator('.dqk input').is_enabled() and r0.locator('.dqp input').is_enabled())
    ok('у наклонного — те же квадратики, но серые (недоступные)',r1.locator('.dqk input').count()==1 and r1.locator('.dqk input').is_disabled() and r1.locator('.dqp input').is_disabled())
    tip=r1.locator('.dqk').get_attribute('data-tip') or ''
    ok('подсказка объясняет почему',re.search('наклон',tip,re.I) and re.search('X, Y, Z',tip),tip)

    print('Подпись на модели')
    d=[x for x in D() if x['key']==keys[1]][0]
    drag(c,d['x'],d['y'],(d['bx']-d['ax'])*-.2,(d['by']-d['ay'])*-.2);d2=[x for x in D() if x['key']==keys[1]][0]
    ok('подпись тянется вдоль размерной линии',near(d2['t'],.3,.05),d2['t'])
    m=c.evaluate('()=>ASSIST.model().html')
    e3=json.loads(re.search(r'<script id="embed" type="application/json">(.*?)</script>',m,re.S).group(1))
    ok('место подписи сохраняется в готовой модели',near(e3['geo']['st']['dm'][1].get('lt',0),.3,.05),e3['geo']['st']['dm'][1].get('lt'))
    ok('ошибок на страницах нет',not errors,errors[:3])
    b.close()
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}');sys.exit(1 if bad_n else 0)
