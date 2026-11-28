# Ассистент: переход к ползункам с угловым размером между вспомогательными линиями (и на грань модели).
# Основа — файл пользователя (угол «Внешний уклон» от «Линии 5» к «Линии 7»), раньше падало: reading 'findIndex'
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
    busy_done=lambda:A.wait_for_function('()=>!document.body.classList.contains("busy")',timeout=90000)
    step=lambda:A.evaluate('()=>document.body.dataset.step')
    msg=lambda:A.inner_text('#aMsg')

    print('Угол между вспомогательными линиями → ползунки')
    A=page(OUT/'Ассистент.html');wait(lambda:MS() is not None and CS() is not None)
    A.set_input_files('#aFile',str(T/'user-angle-guides.html'));busy_done()
    ok('файл открыт на шаге 1: 7 размеров, среди них угол',MS()['dims']==7 and 'Внешний уклон' in MS()['names'],MS())
    A.click('#aStep2');busy_done();A.wait_for_timeout(300)
    s=CS()
    ok('переход к ползункам состоялся',step()=='2' and 'не смог' not in msg(),msg()[:200])
    ok('конвертер отчитывается без ошибки',not s.get('error') and s['model'],s.get('error'))
    ok('в конвертере все 7 размеров',s['dims']==7,s['dims'])
    ang=[x for x in s['params'] if x['lab']=='Внешний уклон']
    ok('угол — свой ползунок, без оси',len(ang)==1 and ang[0]['ax']==-1,ang)
    lin=[x for x in s['params'] if x['lab']=='Ширина']
    ok('у линейных размеров ось на месте',len(lin)==1 and lin[0]['ax']==0,lin)
    A.click('#aAuto');busy_done();A.wait_for_timeout(300)
    ok('«Автоматизировать» на шаге 2 работает с углом',not re.search(r'findIndex|undefined|не смог',msg()),msg()[:300])
    ok('после автоматизации угол на месте',any(x['lab']=='Внешний уклон' for x in CS()['params']))
    A.click('#aStep1');A.wait_for_timeout(300)
    ok('при возврате — вопрос «сохранить?»',A.locator('#aAsk').is_visible())
    A.click('#aAskSave');busy_done()
    ok('обратно к размерам, файл ползунков в буфере',step()=='1' and MS()['dims']==7)
    ok('ошибок на страницах нет',not errors,errors[:3])
    b.close()
print(f'\nИтого: пройдено {ok_n}, ошибок {bad_n}');sys.exit(1 if bad_n else 0)
